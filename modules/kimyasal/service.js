// Kimyasal Yönetimi iş kuralları: liste zenginleştirme, yaşam döngüsü, özet.

function _kimyasalZenginlestir(kayit) {
  return Object.assign({}, kayit, {
    kritikMi: kimyasalKritikMi(kayit),
    sdsSuresiGecmisMi: kimyasalSdsSuresiGecmisMi(kayit.sdsRevizyonTarihi, bugunIso()),
    nfpaGenelSeviye: kimyasalNfpaGenelSeviye(kayit.nfpaSaglik, kayit.nfpaYanicilik, kayit.nfpaKararsizlik)
  });
}

function kimyasallariGetir(aramaMetni, filtreler) {
  const f = filtreler || {};
  let liste = kimyasalTumunuGetir().filter(k => k.durum !== 'İptal').map(_kimyasalZenginlestir);

  if (f.depolamaGrubu) liste = liste.filter(k => k.depolamaGrubu === f.depolamaGrubu);
  if (f.riskSeviyesi) liste = liste.filter(k => k.riskSeviyesi === f.riskSeviyesi);
  if (f.kritik === 'Kritik') liste = liste.filter(k => k.kritikMi);
  if (f.kritik === 'Kritik Değil') liste = liste.filter(k => !k.kritikMi);
  if (f.durum) liste = liste.filter(k => k.durum === f.durum);

  if (aramaMetni) {
    const kucuk = aramaMetni.trim().toLowerCase();
    liste = liste.filter(k =>
      k.ad.toLowerCase().includes(kucuk) ||
      (k.casNo || '').toLowerCase().includes(kucuk) ||
      (k.bolum || '').toLowerCase().includes(kucuk) ||
      (k.kimyasalNo || '').toLowerCase().includes(kucuk)
    );
  }

  return liste.sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
}

function kimyasalEkle(veriler) {
  const dogrulama = kimyasalDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const kimyasalNo = kimyasalSonrakiNoUret(veriler.bolum, kimyasalTumunuGetir());
  const yeniKayit = kimyasalKaydiOlustur(Object.assign({}, veriler, { kimyasalNo }));
  kimyasalEkleRepo(yeniKayit);
  return { basarili: true, kayit: yeniKayit };
}

function kimyasalGuncelle(id, veriler) {
  const dogrulama = kimyasalDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const ghsPiktogramlari = Array.isArray(veriler.ghsPiktogramlari) ? veriler.ghsPiktogramlari : String(veriler.ghsPiktogramlari || '').split(/[;,]+/).map(s => s.trim()).filter(Boolean);
  const hKodlari = Array.isArray(veriler.hKodlari) ? veriler.hKodlari : String(veriler.hKodlari || '').split(/[;,]+/).map(s => s.trim()).filter(Boolean);
  const pKodlari = Array.isArray(veriler.pKodlari) ? veriler.pKodlari : String(veriler.pKodlari || '').split(/[;,]+/).map(s => s.trim()).filter(Boolean);

  const guncellenen = kimyasalGuncelleRepo(id, {
    ad: veriler.ad.trim(),
    ticariAdi: (veriler.ticariAdi || '').trim(),
    casNo: (veriler.casNo || '').trim(),
    ecNo: (veriler.ecNo || '').trim(),
    tedarikci: (veriler.tedarikci || '').trim(),
    bolum: veriler.bolum.trim(),
    lokasyon: (veriler.lokasyon || '').trim(),
    depolamaGrubu: veriler.depolamaGrubu || 'Genel',
    fizikselHali: veriler.fizikselHali || 'Sıvı',
    miktar: veriler.miktar === '' || veriler.miktar == null ? null : Number(veriler.miktar),
    birim: (veriler.birim || '').trim(),
    ghsPiktogramlari,
    hKodlari,
    pKodlari,
    riskSeviyesi: veriler.riskSeviyesi || kimyasalRiskSeviyesiTahminEt(ghsPiktogramlari, hKodlari),
    nfpaSaglik: Number(veriler.nfpaSaglik) || 0,
    nfpaYanicilik: Number(veriler.nfpaYanicilik) || 0,
    nfpaKararsizlik: Number(veriler.nfpaKararsizlik) || 0,
    nfpaOzelKod: Array.isArray(veriler.nfpaOzelKod) ? veriler.nfpaOzelKod : String(veriler.nfpaOzelKod || '').split(/[;,]+/).map(s => s.trim()).filter(Boolean),
    sdsRevizyonTarihi: veriler.sdsRevizyonTarihi || '',
    sdsDosyaAdi: (veriler.sdsDosyaAdi || '').trim(),
    sdsGorseli: veriler.sdsGorseli || '',
    riskDegerlendirmeBaglantisi: (veriler.riskDegerlendirmeBaglantisi || '').trim(),
    depolamaNotu: (veriler.depolamaNotu || '').trim(),
    notlar: (veriler.notlar || '').trim(),
    durum: veriler.durum || 'Aktif'
  });
  if (!guncellenen) return { basarili: false, hata: 'Kayıt bulunamadı.' };
  return { basarili: true, kayit: guncellenen };
}

function kimyasalSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  kimyasalSilRepo(id);
  return { basarili: true };
}

function kimyasalOzetiHesapla() {
  const liste = kimyasallariGetir('', {});
  const grupla = (secici) => {
    const sonuc = {};
    liste.forEach(k => { const anahtar = secici(k) || 'Belirtilmemiş'; sonuc[anahtar] = (sonuc[anahtar] || 0) + 1; });
    return Object.entries(sonuc).sort((a, b) => b[1] - a[1]);
  };

  return {
    toplam: liste.length,
    kritik: liste.filter(k => k.kritikMi).length,
    yuksekVeUstuRisk: liste.filter(k => k.riskSeviyesi === 'Yüksek' || k.riskSeviyesi === 'Kritik').length,
    sdsEksik: liste.filter(k => !k.sdsRevizyonTarihi).length,
    sdsEski: liste.filter(k => k.sdsRevizyonTarihi && k.sdsSuresiGecmisMi).length,
    nfpaKritik: liste.filter(k => k.nfpaGenelSeviye === 'Kritik').length,
    depolamaUyumsuzluklari: kimyasalDepolamaUyumsuzluklariBul(liste),
    bolumeGore: grupla(k => k.bolum),
    depolamaGrubunaGore: grupla(k => k.depolamaGrubu),
    riskSeviyesineGore: grupla(k => k.riskSeviyesi)
  };
}
