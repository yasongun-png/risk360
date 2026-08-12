// Malzeme Talep iş kuralları: numaralandırma, ayarlar, malzeme/talep yaşam
// döngüsü. Eski uygulamadaki saveRequest()'in yıl bazlı sıra numarası
// mantığıyla birebir aynı: numara arşivlense bile tekrar kullanılmaz.

function _malzemeTalepAyarAnahtari() { return tenantAnahtar('malzeme_talep_ayarlari'); }

// Eski uygulamadaki DEF varsayılanları — kiracıya özel olduğundan burada
// sabit değer olarak DOLDURULMAZ, ilk kullanımda boş gelir ve Ayarlar
// bölümünden bir kez girilip sonra hatırlanır (bkz. core/form-ayarlari.js'teki
// aynı desen).
function malzemeTalepAyarlariGetir() {
  return oku(_malzemeTalepAyarAnahtari(), {
    mudurluk: '', hitap: '', imzaYetkilisi: '', unvan: '', paraf: ''
  });
}

function malzemeTalepAyarlariKaydet(ayarlar) {
  yaz(_malzemeTalepAyarAnahtari(), {
    mudurluk: (ayarlar.mudurluk || '').trim(),
    hitap: (ayarlar.hitap || '').trim(),
    imzaYetkilisi: (ayarlar.imzaYetkilisi || '').trim(),
    unvan: (ayarlar.unvan || '').trim(),
    paraf: (ayarlar.paraf || '').trim()
  });
}

// ==================== MALZEME KATALOĞU ====================

function malzemeleriGetir(aramaMetni, filtreler) {
  const f = filtreler || {};
  let liste = malzemeTumunuGetir();

  if (f.kategori) liste = liste.filter(m => m.kategori === f.kategori);
  if (f.aktifMi === 'Aktif') liste = liste.filter(m => m.aktifMi);
  if (f.aktifMi === 'Pasif') liste = liste.filter(m => !m.aktifMi);

  if (aramaMetni) {
    const kucuk = aramaMetni.trim().toLowerCase();
    liste = liste.filter(m =>
      m.ad.toLowerCase().includes(kucuk) ||
      (m.kod || '').toLowerCase().includes(kucuk) ||
      (m.kategori || '').toLowerCase().includes(kucuk)
    );
  }

  return liste.sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
}

function malzemeEkle(veriler) {
  const dogrulama = malzemeDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  if (veriler.kod && malzemeTumunuGetir().some(m => m.kod.toLowerCase() === veriler.kod.trim().toLowerCase())) {
    return { basarili: false, hatalar: { kod: 'Bu malzeme kodu zaten kullanılıyor.' } };
  }

  const yeniKayit = malzemeKaydiOlustur(veriler);
  malzemeEkleRepo(yeniKayit);
  return { basarili: true, kayit: yeniKayit };
}

// Hazır KKD kataloğunu (MALZEME_KKD_KATALOG_TOHUMU) mevcut kataloğa ekler —
// eski uygulamadaki gibi ada göre tekilleştirilir, zaten var olan malzemeler
// tekrar eklenmez.
function kkdKatalogunuYukle() {
  const mevcutAdlar = new Set(malzemeTumunuGetir().map(m => m.ad.toLocaleLowerCase('tr-TR')));
  let eklenen = 0;
  MALZEME_KKD_KATALOG_TOHUMU.forEach(tohum => {
    if (mevcutAdlar.has(tohum.ad.toLocaleLowerCase('tr-TR'))) return;
    malzemeEkleRepo(malzemeKaydiOlustur({
      ad: tohum.ad,
      kategori: 'KKD',
      altKategori: tohum.altKategori,
      birim: 'Adet',
      standartlar: tohum.standartlar
    }));
    eklenen++;
  });
  return { basarili: true, eklenen, atlanan: MALZEME_KKD_KATALOG_TOHUMU.length - eklenen };
}

function malzemeGuncelle(id, veriler) {
  const dogrulama = malzemeDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  if (veriler.kod && malzemeTumunuGetir().some(m => m.id !== id && m.kod.toLowerCase() === veriler.kod.trim().toLowerCase())) {
    return { basarili: false, hatalar: { kod: 'Bu malzeme kodu zaten kullanılıyor.' } };
  }

  const guncellenen = malzemeGuncelleRepo(id, {
    kod: (veriler.kod || '').trim(),
    ad: veriler.ad.trim(),
    resmiAdi: (veriler.resmiAdi || '').trim(),
    kategori: (veriler.kategori || '').trim(),
    altKategori: (veriler.altKategori || '').trim(),
    birim: veriler.birim || 'Adet',
    varsayilanMiktar: veriler.varsayilanMiktar === '' || veriler.varsayilanMiktar == null ? null : Number(veriler.varsayilanMiktar),
    standartlar: Array.isArray(veriler.standartlar) ? veriler.standartlar : String(veriler.standartlar || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean),
    teknikOzellikler: Array.isArray(veriler.teknikOzellikler) ? veriler.teknikOzellikler : String(veriler.teknikOzellikler || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean),
    markaAlternatifleri: Array.isArray(veriler.markaAlternatifleri) ? veriler.markaAlternatifleri : String(veriler.markaAlternatifleri || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean),
    altKalemler: Array.isArray(veriler.altKalemler) ? veriler.altKalemler : String(veriler.altKalemler || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean),
    kullanimAmaci: (veriler.kullanimAmaci || '').trim(),
    riskAciklamasi: (veriler.riskAciklamasi || '').trim(),
    aktifMi: veriler.aktifMi !== undefined ? !!veriler.aktifMi : true
  });
  if (!guncellenen) return { basarili: false, hata: 'Kayıt bulunamadı.' };
  return { basarili: true, kayit: guncellenen };
}

function malzemeSil(id) {
  malzemeSilRepo(id);
  return { basarili: true };
}

// Bir malzeme başka bir AKTİF (Tamamlandı/İptal Edildi dışı) talepte zaten
// var mı — eski uygulamadaki uyarı ("Devam eden X numaralı talep var").
function malzemeAktifTalepteMi(malzemeId) {
  const kapaliDurumlar = ['Tamamlandı', 'İptal Edildi'];
  return malzemeTalepTumunuGetir().find(t =>
    !kapaliDurumlar.includes(t.durum) && (t.malzemeler || []).some(m => m.malzemeId === malzemeId)
  ) || null;
}

// ==================== TALEP ====================

function malzemeTalepleriGetir(aramaMetni, filtreler) {
  const f = filtreler || {};
  let liste = malzemeTalepTumunuGetir();

  if (f.durum) liste = liste.filter(t => t.durum === f.durum);
  if (f.gecikenlerMi) {
    const bugun = bugunIso();
    liste = liste.filter(t => !['Teslim Edildi', 'Tamamlandı', 'İptal Edildi'].includes(t.durum) && t.talepTarihi < bugun);
  }

  if (aramaMetni) {
    const kucuk = aramaMetni.trim().toLowerCase();
    liste = liste.filter(t =>
      t.konu.toLowerCase().includes(kucuk) ||
      (t.belgeNo || '').toLowerCase().includes(kucuk) ||
      (t.talepEdenBirim || '').toLowerCase().includes(kucuk)
    );
  }

  return liste.sort((a, b) => (b.belgeNo || '').localeCompare(a.belgeNo || ''));
}

// Eski uygulamadaki saveRequest() numaralandırma mantığıyla birebir aynı:
// yıl + o yıl içindeki en yüksek sıra no + 1; belge arşivlense/silinse bile
// numara tekrar kullanılmaz (max hesaplaması tüm kayıtlar üzerinden yapılır).
function _malzemeTalepSiraNoUret(yil) {
  const mevcut = malzemeTalepTumunuGetir().filter(t => t.yil === yil && Number.isFinite(t.siraNo)).map(t => t.siraNo);
  return (mevcut.length ? Math.max(...mevcut) : 0) + 1;
}

function malzemeTalepEkle(veriler, secilenMalzemeler) {
  const dogrulama = malzemeTalepDogrula(veriler, secilenMalzemeler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const yil = new Date(veriler.talepTarihi).getFullYear();
  const siraNo = _malzemeTalepSiraNoUret(yil);
  const belgeNo = `İSG.${String(siraNo).padStart(3, '0')}`;
  const ustBelgeNo = `İSG.:${String(siraNo).padStart(2, '0')}`;

  const yeniKayit = malzemeTalepKaydiOlustur(Object.assign({}, veriler, {
    yil, siraNo, belgeNo, ustBelgeNo,
    malzemeler: JSON.parse(JSON.stringify(secilenMalzemeler))
  }));
  malzemeTalepEkleRepo(yeniKayit);
  return { basarili: true, kayit: yeniKayit };
}

function malzemeTalepGuncelle(id, veriler, secilenMalzemeler) {
  const dogrulama = malzemeTalepDogrula(veriler, secilenMalzemeler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const guncellenen = malzemeTalepGuncelleRepo(id, {
    talepTarihi: veriler.talepTarihi,
    konu: veriler.konu.trim(),
    aciklama: (veriler.aciklama || '').trim(),
    uretilenMetin: (veriler.uretilenMetin || '').trim(),
    duzenlenmisMetin: (veriler.duzenlenmisMetin || veriler.uretilenMetin || '').trim(),
    talepEdenBirim: (veriler.talepEdenBirim || '').trim(),
    kullanimBolumu: (veriler.kullanimBolumu || '').trim(),
    aciliyet: veriler.aciliyet || 'Normal',
    mudurluk: (veriler.mudurluk || '').trim(),
    hitap: (veriler.hitap || '').trim(),
    imzaYetkilisi: (veriler.imzaYetkilisi || '').trim(),
    unvan: (veriler.unvan || '').trim(),
    durum: veriler.durum || 'Taslak',
    malzemeler: JSON.parse(JSON.stringify(secilenMalzemeler))
  });
  if (!guncellenen) return { basarili: false, hata: 'Kayıt bulunamadı.' };
  return { basarili: true, kayit: guncellenen };
}

function malzemeTalepDurumGuncelle(id, yeniDurum) {
  const guncellenen = malzemeTalepGuncelleRepo(id, { durum: yeniDurum });
  if (!guncellenen) return { basarili: false, hata: 'Kayıt bulunamadı.' };
  return { basarili: true, kayit: guncellenen };
}

function malzemeTalepSil(id) {
  malzemeTalepSilRepo(id);
  return { basarili: true };
}

function malzemeTalepOzetiHesapla() {
  const liste = malzemeTalepTumunuGetir();
  const bugun = bugunIso();
  const kapali = ['Teslim Edildi', 'Tamamlandı', 'İptal Edildi'];
  const grupla = (secici) => {
    const sonuc = {};
    liste.forEach(t => { const k = secici(t) || 'Belirtilmemiş'; sonuc[k] = (sonuc[k] || 0) + 1; });
    return Object.entries(sonuc).sort((a, b) => b[1] - a[1]);
  };

  return {
    toplam: liste.length,
    buYil: liste.filter(t => t.yil === new Date().getFullYear()).length,
    aktif: liste.filter(t => !kapali.includes(t.durum)).length,
    geciken: liste.filter(t => !kapali.includes(t.durum) && t.talepTarihi < bugun).length,
    durumaGore: grupla(t => t.durum)
  };
}
