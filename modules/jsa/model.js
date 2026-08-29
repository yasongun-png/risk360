// İş Güvenliği Analizi (JSA / JHA) veri modeli.
// Ekran görüntüsü olarak paylaşılan bağımsız bir JSA aracının (Dr. İsmail
// Kaya, "İş Güvenliği Analizi (JSA)") 3 adımlı akışı temel alınmıştır:
// 1) Görev ve iş adımları, 2) Tehlikeler/riskler/kontroller, 3) Rapor/onay/
// takip. Risk puanlaması, uygulamanın geri kalanıyla (Risk Değerlendirmesi,
// Olay/Kaza) TUTARLI olması için o modüllerdeki Fine-Kinney altyapısı
// (OLASILIK_SECENEKLERI, FREKANS_SECENEKLERI, SIDDET_SECENEKLERI,
// riskPuaniHesapla, riskDuzeyiGetir — bkz. modules/risk/model.js) AYNEN
// kullanılır, ayrı bir ölçek icat edilmez (kullanıcı isteği: "kendi
// topladığın bilgileri de ekle" — burada "kendi bilgim" risk360'ın zaten
// sahip olduğu, İSG mevzuatına uygun yerleşik risk metodolojisidir).
// Ekran görüntüsündeki "Örnek JSA yükle" / ayrı JSON dosyası olarak "JSA
// çalışması indir/yükle" özellikleri BİLEREK taşınmadı: risk360 zaten her
// kaydı Firestore'a otomatik kaydeder, ayrı bir dosya tabanlı taslak
// mekanizmasına gerek yoktur.

const JSA_HAZIRLIK_KANITLARI = [
  'İş sahada gözlendi',
  'İşi yapanlar katıldı',
  'Kaza/ramak kala geçmişi incelendi',
  'Talimat, SDS ve üretici bilgisi incelendi'
];

const JSA_DURUMLARI = ['Taslak', 'Onay Bekliyor', 'Onaylandı', 'Revizyon Gerekli'];

// Kullanıcı isteği: örnek olarak paylaşılan kağıt JSA formundaki gibi ("Select
// applicable hazards", "Please select work equipment necessary" vb.) ikonlu,
// tik atılabilir hızlı tehlike/ekipman/KKD taraması — adım bazlı serbest metin
// tehlike analizinin (bkz. jsaTehlikeOlustur) YERİNE değil, ONA EK, sahada tek
// bakışta okunabilen görsel bir özet. is-izni modülündeki IS_IZNI_KKD_SECENEKLERI
// ile aynı "ikon + tik" deseni (bkz. modules/is-izni/model.js, ui.js .iz-kkd-chip).
const JSA_TEHLIKE_IKONLARI = [
  { id: 'ezilmeSikisma', ad: 'Ezilme / Sıkışma', ikon: '🖐️' },
  { id: 'kesilme', ad: 'Kesilme / Kesici Alet', ikon: '🔪' },
  { id: 'dusenCisim', ad: 'Düşen Cisim / Malzeme', ikon: '📦' },
  { id: 'elektrikCarpmasi', ad: 'Elektrik Çarpması', ikon: '⚡' },
  { id: 'yukseklikDusme', ad: 'Yüksekten Düşme', ikon: '🪜' },
  { id: 'kaymaTakilma', ad: 'Kayma / Takılma / Düşme', ikon: '🚶' },
  { id: 'yanginPatlama', ad: 'Yangın / Patlama', ikon: '🔥' },
  { id: 'kimyasalMaruziyet', ad: 'Kimyasal Maruziyet', ikon: '☠️' },
  { id: 'trafikKazasi', ad: 'Trafik / Araç Kazası', ikon: '🚗' },
  { id: 'titresim', ad: 'Titreşim', ikon: '📳' },
  { id: 'gurultu', ad: 'Gürültü', ikon: '🔊' },
  { id: 'kasIskelet', ad: 'Kas-İskelet Zorlanması', ikon: '🏋️' }
];

const JSA_ONLEM_IKONLARI = [
  { id: 'atikKutusu', ad: 'Atık Kutusu Kullan', ikon: '🗑️' },
  { id: 'sahaTemiz', ad: 'Sahayı Temiz ve Düzenli Tut', ikon: '🧹' },
  { id: 'sondurucu', ad: 'Yangın Söndürücü Bulundur', ikon: '🧯' },
  { id: 'uyariLevhasi', ad: 'Uyarı Levhası / İşareti Koy', ikon: '⚠️' },
  { id: 'iletisim', ad: 'Telsiz / İletişim Bulundur', ikon: '📻' },
  { id: 'bariyer', ad: 'Bariyer / Şerit ile Çevir', ikon: '🚧' },
  { id: 'havalandirma', ad: 'Havalandırma Sağla', ikon: '🌀' },
  { id: 'elSinyaliYasak', ad: 'Onaysız El Sinyaliyle Yönlendirme Yasak', ikon: '🚫' }
];

const JSA_EKIPMAN_IKONLARI = [
  { id: 'isMakinesi', ad: 'İş Makinesi (Ekskavatör vb.)', ikon: '🚜' },
  { id: 'kaynakMakinesi', ad: 'Kaynak Makinesi', ikon: '🔥' },
  { id: 'taslamaKesme', ad: 'Taşlama / Kesme', ikon: '⚙️' },
  { id: 'matkapDelme', ad: 'Matkap / Delme', ikon: '🛠️' },
  { id: 'elAletleri', ad: 'El Aletleri', ikon: '🔨' },
  { id: 'seyyarAydinlatma', ad: 'Seyyar Aydınlatma', ikon: '💡' },
  { id: 'merdiven', ad: 'Merdiven', ikon: '🪜' },
  { id: 'vincKaldirma', ad: 'Vinç / Kaldırma Ekipmanı', ikon: '🏗️' }
];

const JSA_YUKSEKLIK_EKIPMAN_IKONLARI = [
  { id: 'sabitIskele', ad: 'Sabit İskele', ikon: '🧱' },
  { id: 'seyyarIskele', ad: 'Seyyar İskele', ikon: '🪟' },
  { id: 'platformVinc', ad: 'Platform Vinç / Sepetli Araç', ikon: '🧗' },
  { id: 'makasliPlatform', ad: 'Makaslı Platform', ikon: '📐' },
  { id: 'emniyetKemeri', ad: 'Paraşüt Tipi Emniyet Kemeri', ikon: '🪢' },
  { id: 'ankrajKarabina', ad: 'Ankraj Noktası / Karabina', ikon: '🔗' }
];

// is-izni/model.js IS_IZNI_KKD_SECENEKLERI ile AYNI liste (kod paylaşımı
// yok, bilinçli kopya — bkz. session genelindeki "her modül kendi küçük
// yardımcı verisini taşır" ilkesi) — aynı KKD, uygulama genelinde hep aynı
// ikonla gösterilsin diye.
const JSA_KKD_IKONLARI = [
  { id: 'baret', ad: 'Baret', ikon: '⛑️' },
  { id: 'koruyucuGozluk', ad: 'Koruyucu Gözlük', ikon: '🥽' },
  { id: 'yuzSiperi', ad: 'Yüz Siperi', ikon: '😷' },
  { id: 'isEldiveni', ad: 'İş Eldiveni', ikon: '🧤' },
  { id: 'kimyasalEldiven', ad: 'Kimyasal Dayanımlı Eldiven', ikon: '🧪' },
  { id: 'elektrikEldiveni', ad: 'Elektrik Yalıtkan Eldiven', ikon: '⚡' },
  { id: 'kulakKoruyucu', ad: 'Kulak Koruyucu', ikon: '🎧' },
  { id: 'tozMaskesi', ad: 'Toz Maskesi', ikon: '😮‍💨' },
  { id: 'gazMaskesi', ad: 'Gaz Maskesi / Solunum Cihazı', ikon: '🫁' },
  { id: 'kimyasalTulum', ad: 'Kimyasal Koruyucu Tulum', ikon: '🥼' },
  { id: 'kaynakMaskesi', ad: 'Kaynak Maskesi / Siperi', ikon: '🔥' },
  { id: 'celikBurunlu', ad: 'Çelik Burunlu İş Ayakkabısı', ikon: '🥾' },
  { id: 'emniyetKemeriKkd', ad: 'Paraşüt Tipi Emniyet Kemeri', ikon: '🪢' },
  { id: 'reflektifYelek', ad: 'Reflektif Yelek', ikon: '🦺' }
];

function _jsaIkonSecimiTemizle(liste, katalog) {
  const gecerliIdler = new Set(katalog.map(k => k.id));
  return Array.isArray(liste) ? liste.filter(id => gecerliIdler.has(id)) : [];
}

function bugunIso() {
  return new Date().toISOString().slice(0, 10);
}

// KZ01/2026 (olay-kaza) ile aynı desen: yıl + o yıl içindeki sıra no.
function jsaSonrakiKayitNoUret(mevcutListe) {
  const yil = new Date().getFullYear();
  const sonEk = '/' + yil;
  let maks = 0;
  (mevcutListe || []).forEach(item => {
    const kayitNo = String(item.kayitNo || '');
    if (!kayitNo.endsWith(sonEk)) return;
    const sayi = parseInt(kayitNo.slice(3, kayitNo.length - sonEk.length), 10);
    if (Number.isFinite(sayi) && sayi > maks) maks = sayi;
  });
  return 'JSA' + String(maks + 1).padStart(2, '0') + sonEk;
}

function jsaTehlikeOlustur(veriler) {
  return {
    id: (veriler && veriler.id) || rastgeleId(),
    tehlike: ((veriler && veriler.tehlike) || '').trim(),
    olasilik: (veriler && veriler.olasilik) || '',
    frekans: (veriler && veriler.frekans) || '',
    siddet: (veriler && veriler.siddet) || '',
    kontroller: ((veriler && veriler.kontroller) || '').trim()
  };
}

function jsaAdimOlustur(veriler) {
  return {
    id: (veriler && veriler.id) || rastgeleId(),
    eylem: ((veriler && veriler.eylem) || '').trim(),
    tehlikeler: Array.isArray(veriler && veriler.tehlikeler) ? veriler.tehlikeler.map(jsaTehlikeOlustur) : []
  };
}

// Bir tehlikenin Fine-Kinney risk puanı — modules/risk/model.js
// riskPuaniHesapla ile birebir aynı fonksiyon (yontem sabit 'Fine-Kinney').
function jsaTehlikeRiskPuaniHesapla(tehlike) {
  if (!tehlike.olasilik || !tehlike.frekans || !tehlike.siddet) return null;
  return riskPuaniHesapla(tehlike.olasilik, tehlike.frekans, tehlike.siddet, 'Fine-Kinney');
}

// Bir JSA kaydındaki TÜM tehlikeler arasından en yüksek risk puanını (ve
// düzeyini) bulur — kayıt listesinde/dashboard özetinde "en riskli" rozeti
// için kullanılır.
function jsaEnYuksekRiskiHesapla(kayit) {
  let enYuksek = null;
  (kayit.adimlar || []).forEach(adim => {
    (adim.tehlikeler || []).forEach(t => {
      const puan = jsaTehlikeRiskPuaniHesapla(t);
      if (puan != null && (enYuksek == null || puan > enYuksek)) enYuksek = puan;
    });
  });
  if (enYuksek == null) return null;
  return { puan: enYuksek, duzey: riskDuzeyiGetir(enYuksek, 'Fine-Kinney') };
}

function jsaKaydiOlustur(veriler) {
  const v = veriler || {};
  return {
    id: v.id || rastgeleId(),
    kayitNo: v.kayitNo || '',
    isletme: (v.isletme || '').trim(),
    degerlendirilenIs: (v.degerlendirilenIs || '').trim(),
    alanEkipman: (v.alanEkipman || '').trim(),
    isiYapanEkip: (v.isiYapanEkip || '').trim(),
    degerlendirmeEkibi: (v.degerlendirmeEkibi || '').trim(),
    tarih: v.tarih || bugunIso(),
    revizyon: (v.revizyon || '').trim(),
    kapsam: (v.kapsam || '').trim(),
    hazirlikKanitlari: Array.isArray(v.hazirlikKanitlari) ? v.hazirlikKanitlari.filter(h => JSA_HAZIRLIK_KANITLARI.includes(h)) : [],
    // Hızlı tehlike/önlem/ekipman/KKD taraması (ikon tik listesi) — bkz.
    // yukarıdaki JSA_*_IKONLARI kataloglarındaki "id" değerleri.
    tehlikeSecimleri: _jsaIkonSecimiTemizle(v.tehlikeSecimleri, JSA_TEHLIKE_IKONLARI),
    onlemSecimleri: _jsaIkonSecimiTemizle(v.onlemSecimleri, JSA_ONLEM_IKONLARI),
    ekipmanSecimleri: _jsaIkonSecimiTemizle(v.ekipmanSecimleri, JSA_EKIPMAN_IKONLARI),
    yukseklikEkipmanSecimleri: _jsaIkonSecimiTemizle(v.yukseklikEkipmanSecimleri, JSA_YUKSEKLIK_EKIPMAN_IKONLARI),
    kkdSecimleri: _jsaIkonSecimiTemizle(v.kkdSecimleri, JSA_KKD_IKONLARI),
    genelFotoUrl: v.genelFotoUrl || '',
    adimlar: Array.isArray(v.adimlar) ? v.adimlar.map(jsaAdimOlustur) : [],
    hazirlayanAdi: (v.hazirlayanAdi || '').trim(),
    hazirlayanUnvan: (v.hazirlayanUnvan || '').trim(),
    onaylayanAdi: (v.onaylayanAdi || '').trim(),
    onaylayanUnvan: (v.onaylayanUnvan || '').trim(),
    // Tespit ve Öneri/Uygunsuzluk modülleriyle aynı dijital kaşe/imza deseni
    // (bkz. modules/tespit-oneri/model.js tespitOneriImzaVeriUret) —
    // { hazirlayan: {ad, imzaUrl, tarih}, onaylayan: {...} }.
    imzalar: v.imzalar || {},
    durum: JSA_DURUMLARI.includes(v.durum) ? v.durum : 'Taslak',
    // Rapor/takip adımındaki aksiyonlar (kaynak: JSA) — olay-kaza ile aynı
    // otomatik Uygunsuzluk aktarımı deseni (bkz. service.js).
    aksiyonlar: Array.isArray(v.aksiyonlar) ? v.aksiyonlar : [],
    olusturmaTarihi: v.olusturmaTarihi || new Date().toISOString()
  };
}

function jsaImzaVeriUret(ad, imzaUrl) {
  return { ad: (ad || '').trim(), imzaUrl: imzaUrl || '', tarih: new Date().toISOString() };
}
