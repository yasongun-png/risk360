// Gaz Ölçüm Cihazları — Acil Durum modülünün kendi sekmesi (Yangın Tüpü
// sekmesiyle aynı kalıp: cihaz envanteri + kalibrasyon kayıtları listesi).
// Kullanıcı isteği geçmişi: önce "gaz ölçüm cihazlarının bilgileri ve
// kalibrasyon bilgilerinin gireleceği bir sekme" için İş İzni modülüne
// eklendi, sonra "iş izinleri yerine periyodik kontrol modülü daha mantıklı"
// denilerek Periyodik Kontrol'e taşındı, en son "vazgeçtim acil durumların
// içine sekme olarak koyalım yangın tüpleri gibi" denilerek buraya, Yangın
// Tüpü'nün yanına kendi sekmesi olarak taşındı. Veri modeli + depolama +
// servis katmanı burada, DOM işlemleri gaz-olcum-ui.js'te.

const GOC_TURLERI = ['Mobil', 'Sabit'];
const GOC_VARSAYILAN_AY = 12;
const GOC_DURUMLARI = ['Aktif', 'Pasif', 'Bakımda', 'Hurda'];
const GOC_KALIBRASYON_TURLERI = ['Kalibrasyon', 'Fonksiyon Testi (Bump Test)', 'İlk Kalibrasyon'];
const GOC_SONUCLAR = ['Uygun', 'Şartlı Uygun', 'Uygun Değil'];

function _gocCihazAnahtari() { return tenantAnahtar('gaz_olcum_cihazlari'); }
function _gocKalibrasyonAnahtari() { return tenantAnahtar('gaz_olcum_kalibrasyonlari'); }

function gocCihazTumunuGetirRepo() { return oku(_gocCihazAnahtari(), []); }
function _gocCihazKaydet(liste) { yaz(_gocCihazAnahtari(), liste); }

function gocCihazEkleRepo(kayit) {
  const liste = gocCihazTumunuGetirRepo();
  liste.push(kayit);
  _gocCihazKaydet(liste);
  return kayit;
}

function gocCihazGuncelleRepo(id, veriler) {
  const liste = gocCihazTumunuGetirRepo();
  const index = liste.findIndex(k => k.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], veriler);
  _gocCihazKaydet(liste);
  return liste[index];
}

function gocCihazSilRepo(id) {
  _gocCihazKaydet(gocCihazTumunuGetirRepo().filter(k => k.id !== id));
  _gocKalibrasyonKaydet(gocKalibrasyonTumunuGetirRepo().filter(k => k.cihazId !== id));
}

function gocCihazIdIleGetirRepo(id) {
  return gocCihazTumunuGetirRepo().find(k => k.id === id) || null;
}

function gocKalibrasyonTumunuGetirRepo() { return oku(_gocKalibrasyonAnahtari(), []); }
function _gocKalibrasyonKaydet(liste) { yaz(_gocKalibrasyonAnahtari(), liste); }

function gocKalibrasyonEkleRepo(kayit) {
  const liste = gocKalibrasyonTumunuGetirRepo();
  liste.push(kayit);
  _gocKalibrasyonKaydet(liste);
  return kayit;
}

function gocKalibrasyonGuncelleRepo(id, veriler) {
  const liste = gocKalibrasyonTumunuGetirRepo();
  const index = liste.findIndex(k => k.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], veriler);
  _gocKalibrasyonKaydet(liste);
  return liste[index];
}

function gocKalibrasyonSilRepo(id) {
  _gocKalibrasyonKaydet(gocKalibrasyonTumunuGetirRepo().filter(k => k.id !== id));
}

function gocKalibrasyonIdIleGetirRepo(id) {
  return gocKalibrasyonTumunuGetirRepo().find(k => k.id === id) || null;
}

function gocCihazinKalibrasyonlariGetirRepo(cihazId) {
  return gocKalibrasyonTumunuGetirRepo().filter(k => k.cihazId === cihazId);
}

// ==================== MODEL ====================

function gocBugunIso() {
  return new Date().toISOString().slice(0, 10);
}

// toISOString() UTC'ye çevirir; UTC+3'te yerel gece yarısı bir gün geri
// kayar (bkz. periyodik-kontrol/model.js _periyodikYerelTarihStr).
function _gocYerelTarihStr(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function gocTarihAyEkle(tarihIso, ay) {
  if (!tarihIso) return '';
  const d = new Date(tarihIso + 'T00:00:00');
  if (isNaN(d)) return '';
  d.setMonth(d.getMonth() + Number(ay || 0));
  return _gocYerelTarihStr(d);
}

function gocSonrakiNoUret(mevcutListe) {
  let maks = 0;
  (mevcutListe || []).forEach(k => {
    const m = String(k.cihazNo || '').match(/(\d+)$/);
    if (m && Number(m[1]) > maks) maks = Number(m[1]);
  });
  return 'GOC' + String(maks + 1).padStart(4, '0');
}

// Durumu hesaplar: en son kalibrasyon sonucu "Uygun Değil" ise (tarihten
// bağımsız) öncelikli uyarı; aksi halde sonraki kalibrasyon tarihine göre
// gecikmiş/yaklaşan/uygun (bkz. periyodik-kontrol/model.js aynı desen).
function gocDurumHesapla(cihaz, sonKalibrasyon, bugunStr) {
  if (cihaz.durum === 'Pasif' || cihaz.durum === 'Hurda' || cihaz.durum === 'Bakımda') return cihaz.durum;
  if (sonKalibrasyon && sonKalibrasyon.sonuc === 'Uygun Değil') return 'Uygun Değil';

  const bugun = bugunStr || gocBugunIso();
  if (!cihaz.sonrakiKalibrasyonTarihi) return 'Aktif';
  if (cihaz.sonrakiKalibrasyonTarihi < bugun) return 'Süresi Geçti';
  const otuzGunSonra = new Date(bugun + 'T00:00:00');
  otuzGunSonra.setDate(otuzGunSonra.getDate() + 30);
  if (cihaz.sonrakiKalibrasyonTarihi <= _gocYerelTarihStr(otuzGunSonra)) return 'Yaklaşıyor';
  return 'Aktif';
}

function gocCihazOlustur(veriler) {
  const periyotAy = Number(veriler.periyotAy) || GOC_VARSAYILAN_AY;
  const sonKalibrasyonTarihi = veriler.sonKalibrasyonTarihi || '';
  return {
    id: veriler.id || rastgeleId(),
    cihazNo: veriler.cihazNo || '',
    tur: GOC_TURLERI.includes(veriler.tur) ? veriler.tur : 'Mobil',
    ad: (veriler.ad || '').trim(),
    marka: (veriler.marka || '').trim(),
    model: (veriler.model || '').trim(),
    seriNo: (veriler.seriNo || '').trim(),
    imalYili: veriler.imalYili || '',
    // ör. "O2, LEL, CO, H2S" veya "O2, NH3, SO2" — cihazlar arası ölçüm gazı
    // kombinasyonu çok değişken olduğundan sabit liste yerine serbest metin.
    olculenGazlar: (veriler.olculenGazlar || '').trim(),
    bolum: (veriler.bolum || '').trim(),
    lokasyon: (veriler.lokasyon || '').trim(),
    sorumluPersonel: (veriler.sorumluPersonel || '').trim(),
    periyotAy,
    sonKalibrasyonTarihi,
    sonrakiKalibrasyonTarihi: veriler.sonrakiKalibrasyonTarihi || (sonKalibrasyonTarihi ? gocTarihAyEkle(sonKalibrasyonTarihi, periyotAy) : ''),
    durum: GOC_DURUMLARI.includes(veriler.durum) ? veriler.durum : 'Aktif',
    notlar: (veriler.notlar || '').trim(),
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}

function gocKalibrasyonKaydiOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    cihazId: veriler.cihazId || '',
    kalibrasyonTarihi: veriler.kalibrasyonTarihi || gocBugunIso(),
    tur: GOC_KALIBRASYON_TURLERI.includes(veriler.tur) ? veriler.tur : 'Kalibrasyon',
    raporNo: (veriler.raporNo || '').trim(),
    firma: (veriler.firma || '').trim(),
    uzman: (veriler.uzman || '').trim(),
    sonuc: GOC_SONUCLAR.includes(veriler.sonuc) ? veriler.sonuc : 'Uygun',
    aciklama: (veriler.aciklama || '').trim(),
    belgeGorseli: veriler.belgeGorseli || '',
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}

function gocCihazDogrula(veriler) {
  const hatalar = {};
  if (!(veriler.ad || '').trim()) hatalar.ad = 'Cihaz adı zorunludur.';
  if (!(veriler.bolum || '').trim()) hatalar.bolum = 'Bölüm zorunludur.';
  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}

function gocKalibrasyonDogrula(veriler) {
  const hatalar = {};
  if (!veriler.cihazId) hatalar.cihazId = 'Cihaz seçimi zorunludur.';
  if (!veriler.firma || !veriler.firma.trim()) hatalar.firma = 'Kalibrasyonu yapan firma zorunludur.';
  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}

// ==================== SERVİS ====================

function _gocSonKalibrasyonuBul(cihazId) {
  const kayitlar = gocCihazinKalibrasyonlariGetirRepo(cihazId);
  if (!kayitlar.length) return null;
  return kayitlar.slice().sort((a, b) => (b.kalibrasyonTarihi || '').localeCompare(a.kalibrasyonTarihi || ''))[0];
}

function _gocCihaziSonKalibrasyonaGoreGuncelle(cihazId) {
  const cihaz = gocCihazIdIleGetirRepo(cihazId);
  if (!cihaz) return;
  const sonKalibrasyon = _gocSonKalibrasyonuBul(cihazId);
  if (!sonKalibrasyon) return;
  gocCihazGuncelleRepo(cihazId, {
    sonKalibrasyonTarihi: sonKalibrasyon.kalibrasyonTarihi,
    sonrakiKalibrasyonTarihi: gocTarihAyEkle(sonKalibrasyon.kalibrasyonTarihi, cihaz.periyotAy)
  });
}

function _gocCihaziZenginlestir(cihaz) {
  const sonKalibrasyon = _gocSonKalibrasyonuBul(cihaz.id);
  return Object.assign({}, cihaz, {
    durumGoruntu: gocDurumHesapla(cihaz, sonKalibrasyon, gocBugunIso()),
    sonKalibrasyonSonucu: sonKalibrasyon ? sonKalibrasyon.sonuc : ''
  });
}

function gocCihazlariGetir(aramaMetni) {
  let liste = gocCihazTumunuGetirRepo().map(_gocCihaziZenginlestir);

  if (aramaMetni) {
    const kucuk = aramaMetni.trim().toLowerCase();
    liste = liste.filter(c =>
      c.ad.toLowerCase().includes(kucuk) ||
      (c.cihazNo || '').toLowerCase().includes(kucuk) ||
      (c.bolum || '').toLowerCase().includes(kucuk) ||
      (c.seriNo || '').toLowerCase().includes(kucuk)
    );
  }

  return liste.sort((a, b) => (a.sonrakiKalibrasyonTarihi || '9999').localeCompare(b.sonrakiKalibrasyonTarihi || '9999'));
}

function gocCihazEkle(veriler) {
  const dogrulama = gocCihazDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const cihazNo = gocSonrakiNoUret(gocCihazTumunuGetirRepo());
  const yeniKayit = gocCihazOlustur(Object.assign({}, veriler, { cihazNo }));
  gocCihazEkleRepo(yeniKayit);
  return { basarili: true, kayit: yeniKayit };
}

function gocCihazGuncelle(id, veriler) {
  const dogrulama = gocCihazDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const periyotAy = Number(veriler.periyotAy) || GOC_VARSAYILAN_AY;
  const guncellenen = gocCihazGuncelleRepo(id, {
    tur: GOC_TURLERI.includes(veriler.tur) ? veriler.tur : 'Mobil',
    ad: veriler.ad.trim(),
    marka: (veriler.marka || '').trim(),
    model: (veriler.model || '').trim(),
    seriNo: (veriler.seriNo || '').trim(),
    imalYili: veriler.imalYili || '',
    olculenGazlar: (veriler.olculenGazlar || '').trim(),
    bolum: veriler.bolum.trim(),
    lokasyon: (veriler.lokasyon || '').trim(),
    sorumluPersonel: (veriler.sorumluPersonel || '').trim(),
    periyotAy,
    sonKalibrasyonTarihi: veriler.sonKalibrasyonTarihi || '',
    sonrakiKalibrasyonTarihi: veriler.sonrakiKalibrasyonTarihi || (veriler.sonKalibrasyonTarihi ? gocTarihAyEkle(veriler.sonKalibrasyonTarihi, periyotAy) : ''),
    durum: GOC_DURUMLARI.includes(veriler.durum) ? veriler.durum : 'Aktif',
    notlar: (veriler.notlar || '').trim()
  });
  if (!guncellenen) return { basarili: false, hata: 'Kayıt bulunamadı.' };
  return { basarili: true, kayit: guncellenen };
}

function gocCihazSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  gocCihazSilRepo(id);
  return { basarili: true };
}

function gocKalibrasyonlariGetir(aramaMetni) {
  const cihazHaritasi = {};
  gocCihazTumunuGetirRepo().forEach(c => { cihazHaritasi[c.id] = c; });

  let liste = gocKalibrasyonTumunuGetirRepo().map(k => {
    const cihaz = cihazHaritasi[k.cihazId];
    return Object.assign({}, k, {
      cihazAdi: cihaz ? cihaz.ad : 'Silinmiş Cihaz',
      cihazNo: cihaz ? cihaz.cihazNo : '-'
    });
  });

  if (aramaMetni) {
    const kucuk = aramaMetni.trim().toLowerCase();
    liste = liste.filter(k =>
      k.cihazAdi.toLowerCase().includes(kucuk) ||
      (k.raporNo || '').toLowerCase().includes(kucuk) ||
      (k.firma || '').toLowerCase().includes(kucuk)
    );
  }

  return liste.sort((a, b) => (b.kalibrasyonTarihi || '').localeCompare(a.kalibrasyonTarihi || ''));
}

function gocKalibrasyonEkle(veriler) {
  const dogrulama = gocKalibrasyonDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const yeniKayit = gocKalibrasyonKaydiOlustur(veriler);
  gocKalibrasyonEkleRepo(yeniKayit);
  _gocCihaziSonKalibrasyonaGoreGuncelle(veriler.cihazId);
  return { basarili: true, kayit: yeniKayit };
}

function gocKalibrasyonGuncelle(id, veriler) {
  const dogrulama = gocKalibrasyonDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const guncellenen = gocKalibrasyonGuncelleRepo(id, {
    cihazId: veriler.cihazId,
    kalibrasyonTarihi: veriler.kalibrasyonTarihi,
    tur: GOC_KALIBRASYON_TURLERI.includes(veriler.tur) ? veriler.tur : 'Kalibrasyon',
    raporNo: (veriler.raporNo || '').trim(),
    firma: veriler.firma.trim(),
    uzman: (veriler.uzman || '').trim(),
    sonuc: GOC_SONUCLAR.includes(veriler.sonuc) ? veriler.sonuc : 'Uygun',
    aciklama: (veriler.aciklama || '').trim(),
    belgeGorseli: veriler.belgeGorseli || ''
  });
  if (!guncellenen) return { basarili: false, hata: 'Kayıt bulunamadı.' };
  _gocCihaziSonKalibrasyonaGoreGuncelle(veriler.cihazId);
  return { basarili: true, kayit: guncellenen };
}

function gocKalibrasyonSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  const kayit = gocKalibrasyonIdIleGetirRepo(id);
  gocKalibrasyonSilRepo(id);
  if (kayit) _gocCihaziSonKalibrasyonaGoreGuncelle(kayit.cihazId);
  return { basarili: true };
}
