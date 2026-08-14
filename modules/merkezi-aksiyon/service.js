// Merkezi Aksiyon Takibi: platformdaki diğer modüllerin kendi sorumlu/termin/
// durum içeren kayıtlarını TEK bir listede tekilleştirir. Kendi verisi yoktur —
// salt okunur bir toplama/görüntüleme katmanıdır; düzenleme her zaman kaynak
// modülün kendi sayfasında yapılır ("İncele" bağlantısı oraya götürür).
//
// Bilerek diğer modüllerin repository.js/service.js dosyalarını YÜKLEMEZ:
// aynı isimli özel yardımcı fonksiyonlar (ör. kurul/repository.js ve
// olay-kaza/repository.js'in ikisi de _olayAnahtari/_olayKaydet tanımlıyor —
// bu oturumda bir kez gerçek bir veri kaybı hatasına yol açmıştı) birlikte
// yüklenince sessizce birbirinin üzerine yazabiliyor. Bunun yerine her
// kaynağın tenant anahtarı burada doğrudan, tek satırda okunur.

const MERKEZI_AKSIYON_KAYNAKLARI = [
  'Uygunsuzluk', 'İSG Kurulu', 'Risk Değerlendirmesi',
  'Olay / Kaza', 'Acil Durum', 'KKD Zimmet', 'Bakım Talep'
];

function _maBugun() { return new Date().toISOString().slice(0, 10); }

function _maGecikmisMi(termin, durum, kapaliDurumlar) {
  if ((kapaliDurumlar || []).includes(durum)) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(termin || '')) return false;
  return termin < _maBugun();
}

function _maYaklasiyorMu(termin, gunSayisi) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(termin || '')) return false;
  const bugun = _maBugun();
  if (termin < bugun) return false;
  const sinir = new Date(bugun + 'T00:00:00');
  sinir.setDate(sinir.getDate() + (gunSayisi || 30));
  // toISOString() UTC'ye çevirir; UTC+3'te yerel gece yarısı bir gün geri kayar.
  const sinirStr = sinir.getFullYear() + '-' + String(sinir.getMonth() + 1).padStart(2, '0') + '-' + String(sinir.getDate()).padStart(2, '0');
  return termin <= sinirStr;
}

function _maSatirOlustur(veriler) {
  const gecikmisMi = _maGecikmisMi(veriler.termin, veriler.durum, veriler.kapaliDurumlar);
  return {
    kaynakModul: veriler.kaynakModul,
    kaynakNo: veriler.kaynakNo || '-',
    baslik: veriler.baslik || '-',
    sorumlu: veriler.sorumlu || 'Atanmamış',
    termin: veriler.termin || '',
    durum: veriler.durum || '-',
    gecikmisMi,
    yaklasiyorMu: !gecikmisMi && _maYaklasiyorMu(veriler.termin, 7),
    baglanti: veriler.baglanti || '#'
  };
}

// ---- Kaynak modül toplayıcıları ----

function _maUygunsuzluktanTopla() {
  const kapali = ['Kapalı', 'İptal'];
  return oku(tenantAnahtar('uygunsuzluk_kayitlari'), [])
    .filter(k => !kapali.includes(k.durum))
    .map(k => _maSatirOlustur({
      kaynakModul: 'Uygunsuzluk',
      kaynakNo: k.aksiyonNo,
      baslik: k.baslik,
      sorumlu: k.sorumlu,
      termin: k.termin,
      durum: k.durum,
      kapaliDurumlar: kapali,
      baglanti: '../uygunsuzluk/index.html'
    }));
}

function _maKuruldanTopla() {
  const kapali = ['Kapalı', 'İptal'];
  return oku(tenantAnahtar('kurul_kararlari'), [])
    .filter(k => !kapali.includes(k.durum))
    .map(k => _maSatirOlustur({
      kaynakModul: 'İSG Kurulu',
      kaynakNo: k.kararNo,
      baslik: (k.kararMetni || '').split(' - ').slice(1).join(' - ').split(':')[0].trim() || k.kararMetni,
      sorumlu: k.sorumlu,
      termin: k.termin,
      durum: k.durum,
      kapaliDurumlar: kapali,
      baglanti: '../kurul/toplanti.html?id=' + k.toplantiId
    }));
}

function _maRisktenTopla() {
  const kapali = ['Kapalı', 'İptal'];
  return oku(tenantAnahtar('risk_kayitlari'), [])
    .filter(r => !kapali.includes(r.durum) && r.termin)
    .map(r => _maSatirOlustur({
      kaynakModul: 'Risk Değerlendirmesi',
      kaynakNo: r.riskNo,
      baslik: r.tehlike || r.risk,
      sorumlu: r.sorumlu,
      termin: r.termin,
      durum: r.durum,
      kapaliDurumlar: kapali,
      baglanti: '../risk/index.html'
    }));
}

function _maOlayKazadanTopla() {
  const kapaliAksiyon = ['Tamamlandı', 'İptal'];
  const satirlar = [];
  oku(tenantAnahtar('olay_kaza_kayitlari'), []).forEach(olay => {
    (Array.isArray(olay.aksiyonlar) ? olay.aksiyonlar : [])
      .filter(a => !kapaliAksiyon.includes(a.durum) && a.termin)
      .forEach(a => satirlar.push(_maSatirOlustur({
        kaynakModul: 'Olay / Kaza',
        kaynakNo: olay.kayitNo,
        baslik: a.faaliyet || olay.olayOzeti || olay.olayTipi,
        sorumlu: a.sorumlu,
        termin: a.termin,
        durum: a.durum,
        kapaliDurumlar: kapaliAksiyon,
        baglanti: '../olay-kaza/index.html'
      })));
  });
  return satirlar;
}

function _maAcilDurumdanTopla() {
  return oku(tenantAnahtar('acil_durum_ekipmanlari'), [])
    .filter(e => e.durum === 'Aktif' && e.sonrakiKontrol)
    .map(e => _maSatirOlustur({
      kaynakModul: 'Acil Durum',
      kaynakNo: e.ekipmanNo,
      baslik: (e.ad || e.tur) + ' — periyodik kontrol',
      sorumlu: e.sorumlu,
      termin: e.sonrakiKontrol,
      durum: 'Kontrol Bekliyor',
      kapaliDurumlar: [],
      baglanti: '../acil-durum/index.html'
    }));
}

function _maKkdZimmettenTopla() {
  const terminal = ['İade Edildi', 'Kayıp', 'Hasarlı', 'İptal'];
  return oku(tenantAnahtar('kkd_zimmetler'), [])
    .filter(z => !terminal.includes(z.durum) && z.degisimTarihi)
    .map(z => _maSatirOlustur({
      kaynakModul: 'KKD Zimmet',
      kaynakNo: z.zimmetNo,
      baslik: z.personelAdi + ' — ' + z.kkdAdi + ' değişimi',
      sorumlu: z.personelAdi,
      termin: z.degisimTarihi,
      durum: 'Değişim Bekliyor',
      kapaliDurumlar: [],
      baglanti: '../kkd/index.html'
    }));
}

function _maBakimTaleptenTopla() {
  const kapali = ['Kapatıldı', 'Reddedildi'];
  return oku(tenantAnahtar('bakim_talepleri'), [])
    .filter(t => !kapali.includes(t.durum))
    .map(t => _maSatirOlustur({
      kaynakModul: 'Bakım Talep',
      kaynakNo: t.talepNo,
      baslik: t.talep.isTanimi,
      sorumlu: t.bakim.degerlendirenKisi || t.talep.acanKisi,
      termin: (t.bakim.planlanmaTarihi || '').slice(0, 10),
      durum: t.durum,
      kapaliDurumlar: kapali,
      baglanti: '../bakim-talep/index.html'
    }));
}

// ---- Genel API ----

function merkeziAksiyonlariGetir(aramaMetni, filtreler) {
  const f = filtreler || {};
  let liste = [].concat(
    _maUygunsuzluktanTopla(),
    _maKuruldanTopla(),
    _maRisktenTopla(),
    _maOlayKazadanTopla(),
    _maAcilDurumdanTopla(),
    _maKkdZimmettenTopla(),
    _maBakimTaleptenTopla()
  );

  if (f.kaynakModul) liste = liste.filter(s => s.kaynakModul === f.kaynakModul);
  if (f.durum === 'Gecikmiş') liste = liste.filter(s => s.gecikmisMi);
  else if (f.durum === 'Yaklaşıyor') liste = liste.filter(s => s.yaklasiyorMu);
  if (f.sorumlu) liste = liste.filter(s => s.sorumlu === f.sorumlu);

  if (aramaMetni) {
    const kucuk = aramaMetni.trim().toLowerCase();
    liste = liste.filter(s =>
      s.baslik.toLowerCase().includes(kucuk) ||
      s.sorumlu.toLowerCase().includes(kucuk) ||
      s.kaynakNo.toLowerCase().includes(kucuk)
    );
  }

  return liste.sort((a, b) => {
    if (a.gecikmisMi !== b.gecikmisMi) return a.gecikmisMi ? -1 : 1;
    return (a.termin || '9999').localeCompare(b.termin || '9999');
  });
}

function merkeziAksiyonOzetiHesapla() {
  const liste = merkeziAksiyonlariGetir('', {});
  const grupla = (secici) => {
    const sonuc = {};
    liste.forEach(s => { const k = secici(s) || 'Belirtilmemiş'; sonuc[k] = (sonuc[k] || 0) + 1; });
    return Object.entries(sonuc).sort((a, b) => b[1] - a[1]);
  };

  return {
    toplamAcik: liste.length,
    gecikmis: liste.filter(s => s.gecikmisMi).length,
    yaklasiyor: liste.filter(s => s.yaklasiyorMu).length,
    kaynagaGore: grupla(s => s.kaynakModul),
    sorumluyaGore: grupla(s => s.sorumlu).slice(0, 10),
    enGecikmisler: liste.filter(s => s.gecikmisMi).slice(0, 10)
  };
}
