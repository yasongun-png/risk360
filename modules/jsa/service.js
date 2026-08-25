// İş Güvenliği Analizi (JSA) iş kuralları.

function _jsaZenginlestir(kayit) {
  return Object.assign({}, kayit, { enYuksekRisk: jsaEnYuksekRiskiHesapla(kayit) });
}

function jsaKayitlariniGetir(aramaMetni, filtreler) {
  const f = filtreler || {};
  let liste = jsaKayitlariTumunuGetir().map(_jsaZenginlestir);

  if (f.durum) liste = liste.filter(k => k.durum === f.durum);

  if (aramaMetni) {
    const kucuk = aramaMetni.trim().toLowerCase();
    liste = liste.filter(k =>
      k.degerlendirilenIs.toLowerCase().includes(kucuk) ||
      (k.alanEkipman || '').toLowerCase().includes(kucuk) ||
      (k.isletme || '').toLowerCase().includes(kucuk) ||
      (k.kayitNo || '').toLowerCase().includes(kucuk)
    );
  }

  return liste.sort((a, b) => (b.olusturmaTarihi || '').localeCompare(a.olusturmaTarihi || ''));
}

function jsaKaydiIdIleGetir(id) {
  const kayit = jsaKaydiIdIleGetirRepo(id);
  return kayit ? _jsaZenginlestir(kayit) : null;
}

function jsaKaydiEkle(veriler) {
  const dogrulama = jsaDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const kayitNo = jsaSonrakiKayitNoUret(jsaKayitlariTumunuGetir());
  const kayit = jsaKaydiOlustur(Object.assign({}, veriler, { kayitNo }));
  jsaKaydiEkleRepo(kayit);
  return { basarili: true, kayit };
}

function jsaKaydiGuncelle(id, veriler) {
  const dogrulama = jsaDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const mevcut = jsaKaydiIdIleGetirRepo(id);
  const birlesik = jsaKaydiOlustur(Object.assign({}, mevcut, veriler, { id, kayitNo: mevcut ? mevcut.kayitNo : '' }));
  const guncellenen = jsaKaydiGuncelleRepo(id, birlesik);
  return { basarili: true, kayit: guncellenen };
}

function jsaKaydiSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  jsaKaydiSilRepo(id);
  return { basarili: true };
}

// Kaşe/imza — Tespit Öneri/Uygunsuzluk modülleriyle aynı desen (bkz.
// modules/tespit-oneri/service.js tespitOneriImzaVer).
function jsaImzaVer(id, rol, ad, imzaUrl) {
  if (!['hazirlayan', 'onaylayan'].includes(rol)) return { basarili: false, hata: 'Geçersiz imza rolü.' };
  const kayit = jsaKaydiIdIleGetirRepo(id);
  if (!kayit) return { basarili: false, hata: 'Kayıt bulunamadı.' };
  const imzalar = Object.assign({}, kayit.imzalar, { [rol]: jsaImzaVeriUret(ad, imzaUrl) });
  const durum = rol === 'onaylayan' ? 'Onaylandı' : kayit.durum;
  const guncellenen = jsaKaydiGuncelleRepo(id, { imzalar, durum });
  return { basarili: true, kayit: guncellenen };
}

// Rapor/takip adımındaki aksiyon satırları gerçek Uygunsuzluk modülüne
// otomatik işlenir — Olay/Kaza modülündeki _aksiyonlariUygunsuzluguYaz ile
// AYNI entegrasyon deseni (bkz. modules/olay-kaza/service.js), kaynakTuru
// sadece "JSA (İş Güvenliği Analizi)" olarak değişir.
function _jsaAksiyonlariUygunsuzluguYaz(aksiyonlar, jsaKaydi) {
  if (typeof uygunsuzlukEkle !== 'function' || !Array.isArray(aksiyonlar) || !aksiyonlar.length) return [];
  const enYuksek = jsaEnYuksekRiskiHesapla(jsaKaydi);
  const riskSeviyesi = !enYuksek ? 'Orta' : enYuksek.puan < 20 ? 'Düşük' : enYuksek.puan < 70 ? 'Orta' : enYuksek.puan < 200 ? 'Yüksek' : 'Çok Yüksek';

  const uyarilar = [];
  aksiyonlar.forEach(a => {
    if (!a.baslik && !a.duzelticiFaaliyet) return;
    const sonuc = uygunsuzlukEkle({
      baslik: a.baslik || a.duzelticiFaaliyet,
      aciklama: [a.duzelticiFaaliyet, jsaKaydi.kayitNo ? ('Kaynak: JSA ' + jsaKaydi.kayitNo) : ''].filter(Boolean).join(' — '),
      bolum: jsaKaydi.alanEkipman,
      lokasyon: jsaKaydi.alanEkipman,
      kaynakTuru: 'JSA (İş Güvenliği Analizi)',
      riskSeviyesi,
      duzelticiFaaliyet: a.duzelticiFaaliyet,
      sorumlu: a.sorumlu,
      termin: a.termin
    });
    if (!sonuc || !sonuc.basarili) {
      uyarilar.push('"' + (a.baslik || a.duzelticiFaaliyet) + '" aksiyonu Uygunsuzluk kaydına işlenemedi.');
    }
  });
  return uyarilar;
}

// jsaKaydiGuncelle'nin aksine, sadece rapor/takip adımındaki YENİ eklenmiş
// aksiyonları Uygunsuzluğa aktarır (ui.js, kaydettikten sonra bunu ayrıca
// çağırır) — döner: kullanıcıya gösterilecek uyarı metinleri.
function jsaAksiyonlariAktar(id, aksiyonlar) {
  const kayit = jsaKaydiIdIleGetirRepo(id);
  if (!kayit) return [];
  return _jsaAksiyonlariUygunsuzluguYaz(aksiyonlar, kayit);
}

function jsaOzetiHesapla() {
  const liste = jsaKayitlariTumunuGetir().map(_jsaZenginlestir);
  return {
    toplam: liste.length,
    taslak: liste.filter(k => k.durum === 'Taslak').length,
    onayBekliyor: liste.filter(k => k.durum === 'Onay Bekliyor').length,
    onaylandi: liste.filter(k => k.durum === 'Onaylandı').length,
    yuksekRiskliler: liste
      .filter(k => k.enYuksekRisk && k.enYuksekRisk.puan >= 70)
      .sort((a, b) => b.enYuksekRisk.puan - a.enYuksekRisk.puan)
      .slice(0, 10)
  };
}
