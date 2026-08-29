// Stajyer Yönetimi veri modeli.
// 6331 sayılı Kanun ve Çalışanların İSG Eğitimlerinin Usul ve Esasları Hakkında Yönetmelik
// kapsamında stajyerler de "çalışan" sayılır; staja başlamadan önce temel İSG eğitimi almaları
// zorunludur. Sertifika konu/süre tabloları aynı Yönetmeliğin Ek-1/Ek-2'sine dayanır ve firmanın
// Tehlike Sınıfı'na göre değişir (bkz. core/tenant.js -> firma.tehlikeSinifi).

const STAJ_TURLERI = ['Zorunlu Staj', 'Gönüllü Staj', 'Yaz Stajı', 'Meslek Lisesi Stajı (Koordinatörlük)', 'Diğer'];
const STAJYER_DURUMLARI = ['Planlandı', 'Aktif', 'Tamamlandı', 'İptal Edildi'];

function bugunIso() {
  return new Date().toISOString().slice(0, 10);
}

function gunFarkiHesapla(a, b) {
  if (!a || !b) return null;
  return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
}

// Durum, staj başlangıç/bitiş tarihine göre otomatik hesaplanır. Kullanıcı elle "İptal Edildi"
// seçtiyse bu değer korunur; diğer tüm durumlarda tarihe göre yeniden hesaplanır.
function stajyerDurumuTuret(baslangic, bitis, mevcutDurum, referansTarih) {
  if (mevcutDurum === 'İptal Edildi') return 'İptal Edildi';
  const ref = referansTarih || bugunIso();
  if (!baslangic || !bitis) return 'Planlandı';
  if (ref < baslangic) return 'Planlandı';
  if (ref > bitis) return 'Tamamlandı';
  return 'Aktif';
}

// İki günlü verilen Temel İSG Eğitiminde geçerlilik/karşılaştırma, eğitimin
// TAMAMLANDIĞI (yani ikinci gün) tarihten başlar — Eğitim modülüyle aynı kural
// (bkz. modules/egitim/service.js -> egitimEfektifTarihi).
function isgEgitimEfektifTarihi(stajyer) {
  return (stajyer.isgEgitimTarihi2 && stajyer.isgEgitimTarihi2 > stajyer.isgEgitimTarihi) ? stajyer.isgEgitimTarihi2 : stajyer.isgEgitimTarihi;
}

// Temel İSG eğitiminin staj başlangıcından ÖNCE (veya en geç aynı gün) verilip verilmediğini
// değerlendirir. Bilgilendirme amaçlıdır, kaydı engellemez.
function isgEgitimDurumuHesapla(isgEgitimTarihiEfektif, baslangicTarihi) {
  if (!isgEgitimTarihiEfektif) return 'Eğitim Kaydı Yok';
  if (!baslangicTarihi) return 'Staj Öncesi Tamamlanmış';
  return isgEgitimTarihiEfektif <= baslangicTarihi ? 'Staj Öncesi Tamamlanmış' : 'Staj Sonrası Verilmiş';
}

function sonrakiNoUret(onEk, mevcutListe, alanAdi) {
  let maks = 0;
  mevcutListe.forEach(item => {
    const m = String(item[alanAdi] || '').match(/(\d+)$/);
    if (m) maks = Math.max(maks, parseInt(m[1], 10));
  });
  return onEk + String(maks + 1).padStart(4, '0');
}

function stajyerOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    stajNo: veriler.stajNo || '',

    adSoyad: (veriler.adSoyad || '').trim(),
    bolum: (veriler.bolum || '').trim(),
    okul: (veriler.okul || '').trim(),
    okulBolumu: (veriler.okulBolumu || '').trim(),
    sinif: (veriler.sinif || '').trim(),
    telefon: (veriler.telefon || '').trim(),

    stajTuru: veriler.stajTuru || 'Zorunlu Staj',
    sorumluPersonelId: veriler.sorumluPersonelId || '',
    sorumluAdi: (veriler.sorumluAdi || '').trim(),

    baslangicTarihi: veriler.baslangicTarihi || '',
    bitisTarihi: veriler.bitisTarihi || '',
    isgEgitimTarihi: veriler.isgEgitimTarihi || '',
    isgEgitimTarihi2: veriler.isgEgitimTarihi2 || '',

    durum: veriler.durum || 'Planlandı',
    notlar: (veriler.notlar || '').trim(),
    // Kullanıcı isteği: "üretilen ör. temel isg eğitim sertifikası imzalı
    // pdf halini yükleyebileyim" (bkz. core/belge-yukle.js).
    imzaliBelgeUrl: veriler.imzaliBelgeUrl || '',
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}

// ---- Temel Eğitim Belgesi sertifika verisi (Ek-1/Ek-2) ----
// Yalnızca "temel" (ilk) eğitim planını içerir; stajyerler için tekrar/yenileme eğitimi
// bu modülün kapsamı dışındadır.

const SERTIFIKA_KONULARI = {
  genel: [
    'a) Çalışma mevzuatı ile ilgili bilgiler',
    'b) Çalışanların yasal hak ve sorumlulukları',
    'c) İşyeri temizliği ve düzeni',
    'ç) İş kazası ve meslek hastalığından doğan hukuki sonuçlar'
  ],
  saglik: [
    'a) Meslek hastalıklarının sebepleri',
    'b) Hastalıktan korunma prensipleri ve korunma tekniklerinin uygulanması',
    'c) Biyolojik ve psikososyal risk etmenleri',
    'ç) İlkyardım',
    'd) Bağımlılık yapıcı maddelerin zararları ve teknoloji bağımlılığı'
  ],
  teknik: [
    'a) Kimyasal, fiziksel ve ergonomik risk etmenleri',
    'b) Elle kaldırma ve taşıma',
    'c) Parlama, patlama',
    'ç) Yangın ve yangından korunma',
    'd) İş ekipmanlarının güvenli kullanımı',
    'e) Ekranlı araçlarla çalışma',
    'f) Elektrik, tehlikeleri, riskleri ve önlemleri',
    'g) İş kazalarının sebepleri ve korunma prensipleri ile tekniklerinin uygulanması',
    'ğ) Sağlık ve güvenlik işaretleri',
    'h) Kişisel koruyucu donanım kullanımı',
    'ı) İş sağlığı ve güvenliği genel kuralları ve güvenlik kültürü',
    'i) Acil durum planı, tahliye ve kurtarma'
  ]
};

const SERTIFIKA_PLANLARI = {
  'Çok Tehlikeli': {
    genel: [30, 30, 30, 30],
    saglik: [30, 20, 20, 30, 20],
    teknik: [60, 30, 30, 45, 45, 30, 30, 45, 30, 45, 45, 45],
    diger: [['Risk değerlendirmesi', 60], ['İş izin sistemi', 30], ['Acil durum planı', 40], ['Kimyasallar', 50], ['Patlamadan korunma', 20], ['Yüksekte çalışma', 20], ['Kapalı alanda çalışma uygulamaları', 20]]
  },
  'Tehlikeli': {
    genel: [30, 30, 30, 30],
    saglik: [30, 20, 20, 30, 20],
    teknik: [40, 20, 20, 40, 40, 10, 20, 30, 20, 20, 20, 20],
    diger: [['Risk değerlendirmesi', 60], ['İş izin sistemi', 20], ['Acil durum planı', 30], ['Kimyasallar', 30], ['Patlamadan korunma', 10], ['Yüksekte çalışma', 10], ['Kapalı alanda çalışma uygulamaları', 20]]
  },
  'Az Tehlikeli': {
    genel: [20, 20, 25, 25],
    saglik: [15, 15, 15, 15, 30],
    teknik: [15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15],
    diger: [['Risk değerlendirmesi', 30], ['İş izin sistemi', 20], ['Acil durum planı', 15], ['Kimyasallar', 20], ['Patlamadan korunma', 10], ['Yüksekte çalışma', 10], ['Kapalı alanda çalışma uygulamaları', 15]]
  }
};

// Temel eğitim belgesinin geçerlilik süresi (yıl); tehlike sınıfına göre değişir.
const SERTIFIKA_GECERLILIK_YILI = { 'Çok Tehlikeli': 1, 'Tehlikeli': 2, 'Az Tehlikeli': 3 };

function sertifikaPlaniGetir(tehlikeSinifi) {
  return SERTIFIKA_PLANLARI[tehlikeSinifi] || SERTIFIKA_PLANLARI['Az Tehlikeli'];
}

function sertifikaToplamDakikaHesapla(plan) {
  const topla = arr => arr.reduce((t, d) => t + Number(d || 0), 0);
  return topla(plan.genel) + topla(plan.saglik) + topla(plan.teknik) + plan.diger.reduce((t, r) => t + Number(r[1] || 0), 0);
}

function dakikayiSaateCevir(dakika) {
  const saat = dakika / 60;
  return Number.isInteger(saat) ? saat + ' Saat' : saat.toFixed(2).replace('.', ',') + ' Saat';
}

function sertifikaGecerlilikTarihiHesapla(egitimTarihi, tehlikeSinifi) {
  if (!egitimTarihi) return '';
  const yil = SERTIFIKA_GECERLILIK_YILI[tehlikeSinifi] || 3;
  const t = new Date(egitimTarihi + 'T00:00:00');
  t.setFullYear(t.getFullYear() + yil);
  // toISOString() UTC'ye çevirir; UTC+3'te yerel gece yarısı bir gün geri kayar.
  return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
}
