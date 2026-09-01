// Periyodik Kontrol iş kuralları: kontrol kaydı eklenince ilgili ekipmanın
// son/sonraki kontrol tarihi otomatik güncellenir (muayene-olcum'daki
// inspections.js davranışıyla aynı mantık).

function _periyodikSonKontroluBul(ekipmanId) {
  const kontroller = periyodikEkipmaninKontrolleriGetirRepo(ekipmanId);
  if (!kontroller.length) return null;
  return kontroller.slice().sort((a, b) => (b.kontrolTarihi || '').localeCompare(a.kontrolTarihi || ''))[0];
}

// Bir ekipmanın en son kontrolüne göre son/sonraki kontrol tarihini yeniden hesaplar.
function _periyodikEkipmaniSonKontroleGoreGuncelle(ekipmanId) {
  const ekipman = periyodikEkipmanIdIleGetirRepo(ekipmanId);
  if (!ekipman) return;
  const sonKontrol = _periyodikSonKontroluBul(ekipmanId);
  if (!sonKontrol) return;
  periyodikEkipmanGuncelleRepo(ekipmanId, {
    sonKontrolTarihi: sonKontrol.kontrolTarihi,
    sonrakiKontrolTarihi: periyodikTarihAyEkle(sonKontrol.kontrolTarihi, ekipman.periyotAy)
  });
}

function _periyodikEkipmanZenginlestir(ekipman) {
  const sonKontrol = _periyodikSonKontroluBul(ekipman.id);
  return Object.assign({}, ekipman, {
    durumGoruntu: periyodikEkipmanDurumuHesapla(ekipman, sonKontrol, bugunIso()),
    sonKontrolSonucu: sonKontrol ? sonKontrol.sonuc : ''
  });
}

function periyodikEkipmanlariGetir(aramaMetni, filtreler) {
  const f = filtreler || {};
  let liste = periyodikEkipmanTumunuGetir().map(_periyodikEkipmanZenginlestir);

  if (f.kategori) liste = liste.filter(k => k.kategori === f.kategori);
  if (f.durum) liste = liste.filter(k => k.durumGoruntu === f.durum);
  if (f.bolum) liste = liste.filter(k => k.bolum === f.bolum);

  if (aramaMetni) {
    const kucuk = aramaMetni.trim().toLowerCase();
    liste = liste.filter(k =>
      k.ad.toLowerCase().includes(kucuk) ||
      (k.ekipmanNo || '').toLowerCase().includes(kucuk) ||
      (k.bolum || '').toLowerCase().includes(kucuk) ||
      (k.demirbasNo || '').toLowerCase().includes(kucuk)
    );
  }

  return liste.sort((a, b) => (a.sonrakiKontrolTarihi || '9999').localeCompare(b.sonrakiKontrolTarihi || '9999'));
}

function periyodikEkipmanEkle(veriler) {
  const dogrulama = periyodikEkipmanDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const ekipmanNo = periyodikSonrakiNoUret(veriler.bolum, periyodikEkipmanTumunuGetir());
  const yeniKayit = periyodikEkipmanOlustur(Object.assign({}, veriler, { ekipmanNo }));
  periyodikEkipmanEkleRepo(yeniKayit);
  return { basarili: true, kayit: yeniKayit };
}

function periyodikEkipmanGuncelle(id, veriler) {
  const dogrulama = periyodikEkipmanDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const periyotAy = Number(veriler.periyotAy) || PERIYODIK_VARSAYILAN_AY;
  const guncellenen = periyodikEkipmanGuncelleRepo(id, {
    demirbasNo: (veriler.demirbasNo || '').trim(),
    ad: veriler.ad.trim(),
    kategori: veriler.kategori || 'Diğer',
    marka: (veriler.marka || '').trim(),
    model: (veriler.model || '').trim(),
    seriNo: (veriler.seriNo || '').trim(),
    imalYili: veriler.imalYili || '',
    bolum: veriler.bolum.trim(),
    lokasyon: (veriler.lokasyon || '').trim(),
    sorumluPersonel: (veriler.sorumluPersonel || '').trim(),
    riskSeviyesi: veriler.riskSeviyesi || 'Orta',
    periyotAy,
    sonKontrolTarihi: veriler.sonKontrolTarihi || '',
    sonrakiKontrolTarihi: veriler.sonrakiKontrolTarihi || (veriler.sonKontrolTarihi ? periyodikTarihAyEkle(veriler.sonKontrolTarihi, periyotAy) : ''),
    durum: veriler.durum || 'Aktif',
    notlar: (veriler.notlar || '').trim()
  });
  if (!guncellenen) return { basarili: false, hata: 'Kayıt bulunamadı.' };
  return { basarili: true, kayit: guncellenen };
}

function periyodikEkipmanSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  periyodikEkipmanSilRepo(id);
  return { basarili: true };
}

function periyodikKontrolleriGetir(aramaMetni, filtreler) {
  const f = filtreler || {};
  const ekipmanHaritasi = {};
  periyodikEkipmanTumunuGetir().forEach(e => { ekipmanHaritasi[e.id] = e; });

  let liste = periyodikKontrolTumunuGetir().map(k => {
    const ekipman = ekipmanHaritasi[k.ekipmanId];
    return Object.assign({}, k, {
      ekipmanAdi: ekipman ? ekipman.ad : 'Silinmiş Ekipman',
      ekipmanNo: ekipman ? ekipman.ekipmanNo : '-'
    });
  });

  if (f.ekipmanId) liste = liste.filter(k => k.ekipmanId === f.ekipmanId);
  if (f.sonuc) liste = liste.filter(k => k.sonuc === f.sonuc);

  if (aramaMetni) {
    const kucuk = aramaMetni.trim().toLowerCase();
    liste = liste.filter(k =>
      k.ekipmanAdi.toLowerCase().includes(kucuk) ||
      (k.raporNo || '').toLowerCase().includes(kucuk) ||
      (k.firma || '').toLowerCase().includes(kucuk)
    );
  }

  return liste.sort((a, b) => (b.kontrolTarihi || '').localeCompare(a.kontrolTarihi || ''));
}

function periyodikKontrolEkle(veriler) {
  const dogrulama = periyodikKontrolDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const yeniKayit = periyodikKontrolKaydiOlustur(veriler);
  periyodikKontrolEkleRepo(yeniKayit);
  _periyodikEkipmaniSonKontroleGoreGuncelle(veriler.ekipmanId);
  return { basarili: true, kayit: yeniKayit };
}

function periyodikKontrolGuncelle(id, veriler) {
  const dogrulama = periyodikKontrolDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const guncellenen = periyodikKontrolGuncelleRepo(id, {
    ekipmanId: veriler.ekipmanId,
    kontrolTarihi: veriler.kontrolTarihi,
    kontrolTuru: veriler.kontrolTuru || 'Periyodik Kontrol',
    raporNo: (veriler.raporNo || '').trim(),
    firma: veriler.firma.trim(),
    uzman: (veriler.uzman || '').trim(),
    sonuc: veriler.sonuc || 'Uygun',
    aciklama: (veriler.aciklama || '').trim(),
    belgeGorseli: veriler.belgeGorseli || ''
  });
  if (!guncellenen) return { basarili: false, hata: 'Kayıt bulunamadı.' };
  _periyodikEkipmaniSonKontroleGoreGuncelle(veriler.ekipmanId);
  return { basarili: true, kayit: guncellenen };
}

function periyodikKontrolSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  const kayit = periyodikKontrolIdIleGetirRepo(id);
  periyodikKontrolSilRepo(id);
  if (kayit) _periyodikEkipmaniSonKontroleGoreGuncelle(kayit.ekipmanId);
  return { basarili: true };
}

function periyodikOzetiHesapla() {
  const liste = periyodikEkipmanlariGetir('', {});
  const grupla = (secici) => {
    const sonuc = {};
    liste.forEach(k => { const anahtar = secici(k) || 'Belirtilmemiş'; sonuc[anahtar] = (sonuc[anahtar] || 0) + 1; });
    return Object.entries(sonuc).sort((a, b) => b[1] - a[1]);
  };

  return {
    toplam: liste.length,
    suresiGecen: liste.filter(k => k.durumGoruntu === 'Süresi Geçti').length,
    yaklasiyor: liste.filter(k => k.durumGoruntu === 'Yaklaşıyor').length,
    uygunDegil: liste.filter(k => k.durumGoruntu === 'Uygun Değil').length,
    suresiGecenListesi: liste.filter(k => k.durumGoruntu === 'Süresi Geçti').slice(0, 20),
    uygunDegilListesi: liste.filter(k => k.durumGoruntu === 'Uygun Değil').slice(0, 20),
    kategoriyeGore: grupla(k => k.kategori),
    bolumeGore: grupla(k => k.bolum)
  };
}
