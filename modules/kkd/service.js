// KKD iş kuralları: envanter/zimmet/ihlal yaşam döngüsü ve özet istatistikler.

// ==================== ENVANTER ====================

function _envanterZenginlestir(kayit) {
  return Object.assign({}, kayit, {
    dusukStokMu: kayit.durum !== 'İptal' && kayit.stok <= kayit.minimumStok,
    enEksikMi: !kayit.enStandartlari || kayit.enStandartlari.length === 0
  });
}

function envanterleriGetir(aramaMetni, filtreler) {
  const f = filtreler || {};
  let liste = envanterTumunuGetir().map(_envanterZenginlestir);

  if (f.tur) liste = liste.filter(k => k.tur === f.tur);
  if (f.durum) liste = liste.filter(k => k.durum === f.durum);

  if (aramaMetni) {
    const kucuk = aramaMetni.trim().toLowerCase();
    liste = liste.filter(k =>
      k.ad.toLowerCase().includes(kucuk) ||
      (k.envanterNo || '').toLowerCase().includes(kucuk) ||
      (k.marka || '').toLowerCase().includes(kucuk) ||
      (k.bolum || '').toLowerCase().includes(kucuk)
    );
  }

  return liste.sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
}

function envanterEkle(veriler) {
  const dogrulama = envanterDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const envanterNo = envanterSonrakiNoUret(envanterTumunuGetir());
  const yeniKayit = envanterOlustur(Object.assign({}, veriler, { envanterNo }));
  envanterEkleRepo(yeniKayit);
  return { basarili: true, kayit: yeniKayit };
}

function envanterGuncelle(id, veriler) {
  const dogrulama = envanterDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const guncellenen = envanterGuncelleRepo(id, {
    ad: veriler.ad.trim(),
    tur: veriler.tur,
    marka: (veriler.marka || '').trim(),
    model: (veriler.model || '').trim(),
    beden: (veriler.beden || '').trim(),
    enStandartlari: Array.isArray(veriler.enStandartlari) ? veriler.enStandartlari : String(veriler.enStandartlari || '').split(/[;,]+/).map(s => s.trim()).filter(Boolean),
    stok: Number(veriler.stok) || 0,
    minimumStok: Number(veriler.minimumStok) || 0,
    degisimPeriyoduGun: Number(veriler.degisimPeriyoduGun) || KKD_VARSAYILAN_PERIYOT[veriler.tur] || 365,
    bolum: (veriler.bolum || '').trim(),
    lokasyon: (veriler.lokasyon || '').trim(),
    tedarikci: (veriler.tedarikci || '').trim(),
    satinAlmaTarihi: veriler.satinAlmaTarihi || '',
    sonKullanmaTarihi: veriler.sonKullanmaTarihi || '',
    durum: veriler.durum || 'Aktif',
    notlar: (veriler.notlar || '').trim()
  });
  if (!guncellenen) return { basarili: false, hata: 'Kayıt bulunamadı.' };
  return { basarili: true, kayit: guncellenen };
}

function envanterSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  envanterSilRepo(id);
  return { basarili: true };
}

// ==================== ZİMMET ====================

function _zimmetZenginlestir(kayit) {
  const durumGoruntu = zimmetDurumuHesapla(kayit, bugunIso());
  return Object.assign({}, kayit, { durumGoruntu });
}

function zimmetleriGetir(aramaMetni, filtreler) {
  const f = filtreler || {};
  let liste = zimmetTumunuGetir().map(_zimmetZenginlestir);

  if (f.durum) liste = liste.filter(k => k.durumGoruntu === f.durum);
  if (f.kkdTuru) liste = liste.filter(k => k.kkdTuru === f.kkdTuru);
  if (f.bolum) liste = liste.filter(k => k.bolum === f.bolum);

  if (aramaMetni) {
    const kucuk = aramaMetni.trim().toLowerCase();
    liste = liste.filter(k =>
      k.personelAdi.toLowerCase().includes(kucuk) ||
      (k.zimmetNo || '').toLowerCase().includes(kucuk) ||
      k.kkdAdi.toLowerCase().includes(kucuk) ||
      (k.bolum || '').toLowerCase().includes(kucuk)
    );
  }

  return liste.sort((a, b) => (b.verilisTarihi || '').localeCompare(a.verilisTarihi || ''));
}

function zimmetEkle(veriler) {
  const dogrulama = zimmetDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const zimmetNo = zimmetSonrakiNoUret(zimmetTumunuGetir());
  const yeniKayit = zimmetOlustur(Object.assign({}, veriler, { zimmetNo }));
  zimmetEkleRepo(yeniKayit);

  // Envanterden düşülür (stok takibi tutarlı kalsın diye).
  if (yeniKayit.envanterId) {
    const envanter = envanterIdIleGetirRepo(yeniKayit.envanterId);
    if (envanter) envanterGuncelleRepo(envanter.id, { stok: Math.max(0, (envanter.stok || 0) - (yeniKayit.adet || 1)) });
  }

  return { basarili: true, kayit: yeniKayit };
}

function zimmetGuncelle(id, veriler) {
  const dogrulama = zimmetDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const periyot = Number(veriler.degisimPeriyoduGun) || KKD_VARSAYILAN_PERIYOT[veriler.kkdTuru] || 365;
  const verilisTarihi = veriler.verilisTarihi || bugunIso();
  const guncellenen = zimmetGuncelleRepo(id, {
    personelId: veriler.personelId || '',
    personelAdi: veriler.personelAdi.trim(),
    bolum: (veriler.bolum || '').trim(),
    gorev: (veriler.gorev || '').trim(),
    kkdAdi: veriler.kkdAdi.trim(),
    kkdTuru: veriler.kkdTuru || 'Diğer',
    marka: (veriler.marka || '').trim(),
    model: (veriler.model || '').trim(),
    beden: (veriler.beden || '').trim(),
    enStandartlari: Array.isArray(veriler.enStandartlari) ? veriler.enStandartlari : String(veriler.enStandartlari || '').split(/[;,]+/).map(s => s.trim()).filter(Boolean),
    verilisTarihi,
    degisimPeriyoduGun: periyot,
    degisimTarihi: veriler.degisimTarihi || zimmetDegisimTarihiHesapla(verilisTarihi, periyot),
    adet: Number(veriler.adet) || 1,
    kondisyon: veriler.kondisyon || 'Yeni',
    teslimEden: (veriler.teslimEden || '').trim(),
    teslimAlanImza: (veriler.teslimAlanImza || '').trim(),
    notlar: (veriler.notlar || '').trim()
  });
  if (!guncellenen) return { basarili: false, hata: 'Kayıt bulunamadı.' };
  return { basarili: true, kayit: guncellenen };
}

function zimmetSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  zimmetSilRepo(id);
  return { basarili: true };
}

function zimmetDurumGuncelle(id, yeniDurum, ekAlanlar) {
  const guncellenen = zimmetGuncelleRepo(id, Object.assign({ durum: yeniDurum }, ekAlanlar || {}));
  if (!guncellenen) return { basarili: false, hata: 'Kayıt bulunamadı.' };
  return { basarili: true, kayit: guncellenen };
}

function zimmetIadeEt(id) {
  return zimmetDurumGuncelle(id, 'İade Edildi', { iadeTarihi: bugunIso() });
}

// Bir personelin (sicil öncelikli, yoksa ad soyad) hâlâ üzerinde olan
// (İade/Kayıp/İptal dışındaki) tüm zimmetleri — Zimmet Formu için.
function personelinAktifZimmetleriGetir(personelId, personelAdi) {
  return zimmetleriGetir('', {}).filter(z => {
    const eslesir = personelId ? z.personelId === personelId : z.personelAdi === personelAdi;
    return eslesir && !['İade Edildi', 'Kayıp', 'İptal'].includes(z.durumGoruntu);
  }).sort((a, b) => (a.verilisTarihi || '').localeCompare(b.verilisTarihi || ''));
}

// ==================== İHLAL ====================

function ihlalleriGetir(aramaMetni, filtreler) {
  const f = filtreler || {};
  let liste = ihlalTumunuGetir();

  if (f.ihlalTuru) liste = liste.filter(k => k.ihlalTuru === f.ihlalTuru);
  if (f.tekrar) liste = liste.filter(k => k.tekrar === f.tekrar);
  if (f.bolum) liste = liste.filter(k => k.bolum === f.bolum);
  if (f.baslangicTarihi) liste = liste.filter(k => k.tarih >= f.baslangicTarihi);
  if (f.bitisTarihi) liste = liste.filter(k => k.tarih <= f.bitisTarihi);

  if (aramaMetni) {
    const kucuk = aramaMetni.trim().toLowerCase();
    liste = liste.filter(k =>
      k.adSoyad.toLowerCase().includes(kucuk) ||
      (k.sicil || '').toLowerCase().includes(kucuk) ||
      (k.ihlalNo || '').toLowerCase().includes(kucuk) ||
      (k.bolum || '').toLowerCase().includes(kucuk) ||
      (k.kkd || '').toLowerCase().includes(kucuk)
    );
  }

  return liste.sort((a, b) => `${b.tarih || ''} ${b.saat || ''}`.localeCompare(`${a.tarih || ''} ${a.saat || ''}`));
}

function ihlalEkle(veriler) {
  const dogrulama = ihlalDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const mevcutListe = ihlalTumunuGetir();
  const tekrarBilgisi = ihlalTekrarBilgisiHesapla(veriler.sicil, veriler.adSoyad, mevcutListe);
  const ihlalNo = ihlalSonrakiNoUret(mevcutListe, new Date(veriler.tarih || bugunIso()).getFullYear());
  const yeniKayit = ihlalOlustur(Object.assign({}, veriler, { ihlalNo }, tekrarBilgisi));
  ihlalEkleRepo(yeniKayit);
  return { basarili: true, kayit: yeniKayit };
}

function ihlalGuncelle(id, veriler) {
  const dogrulama = ihlalDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const mevcutListe = ihlalTumunuGetir();
  const tekrarBilgisi = ihlalTekrarBilgisiHesapla(veriler.sicil, veriler.adSoyad, mevcutListe, id);
  const guncellenen = ihlalGuncelleRepo(id, {
    tarih: veriler.tarih,
    saat: veriler.saat || '',
    adSoyad: veriler.adSoyad.trim(),
    sicil: (veriler.sicil || '').trim(),
    firma: (veriler.firma || '').trim(),
    bolum: (veriler.bolum || '').trim(),
    calismaBolumu: (veriler.calismaBolumu || '').trim(),
    kkd: (veriler.kkd || '').trim(),
    ihlalTuru: veriler.ihlalTuru,
    tespitEden: veriler.tespitEden.trim(),
    islem: veriler.islem,
    aciklama: (veriler.aciklama || '').trim(),
    tekrar: tekrarBilgisi.tekrar,
    sonIhlalTarihi: tekrarBilgisi.sonIhlalTarihi
  });
  if (!guncellenen) return { basarili: false, hata: 'Kayıt bulunamadı.' };
  return { basarili: true, kayit: guncellenen };
}

function ihlalSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  ihlalSilRepo(id);
  return { basarili: true };
}

// ==================== ÖZET ====================

function kkdOzetiHesapla() {
  const envanter = envanterleriGetir('', {});
  const zimmet = zimmetleriGetir('', {});
  const ihlal = ihlalleriGetir('', {});

  const grupla = (liste, secici) => {
    const sonuc = {};
    liste.forEach(k => {
      const anahtar = secici(k) || 'Belirtilmemiş';
      sonuc[anahtar] = (sonuc[anahtar] || 0) + 1;
    });
    return Object.entries(sonuc).sort((a, b) => b[1] - a[1]);
  };

  return {
    envanterKalemi: envanter.length,
    dusukStokListesi: envanter.filter(e => e.dusukStokMu).slice(0, 20),
    enEksikListesi: envanter.filter(e => e.enEksikMi).slice(0, 20),

    aktifZimmet: zimmet.filter(z => z.durumGoruntu === 'Aktif' || z.durumGoruntu === 'Değişim Yaklaşıyor' || z.durumGoruntu === 'Değişim Süresi Geçti').length,
    degisimGecenler: zimmet.filter(z => z.durumGoruntu === 'Değişim Süresi Geçti').slice(0, 20),
    degisimYaklasanlar: zimmet.filter(z => z.durumGoruntu === 'Değişim Yaklaşıyor').slice(0, 20),

    ihlalToplam: ihlal.length,
    ihlalBuAy: ihlal.filter(i => (i.tarih || '').slice(0, 7) === bugunIso().slice(0, 7)).length,
    tekrarEdenSayisi: ihlal.filter(i => i.tekrar === 'Evet').length,
    bolumeGoreIhlal: grupla(ihlal, i => i.bolum).slice(0, 10),
    turuGoreIhlal: grupla(ihlal, i => i.ihlalTuru).slice(0, 10),
    tekrarEdenler: grupla(ihlal.filter(i => i.sicil || i.adSoyad), i => `${i.adSoyad}${i.sicil ? ' (' + i.sicil + ')' : ''}`).slice(0, 15)
  };
}
