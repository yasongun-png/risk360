// Saha Denetim veri modeli: konu bazlı kontrol listesi kütüphanesi + denetim kaydı.
// Bir denetim başlatıldığında seçilen türün kontrol listesi denetime "kopyalanır"
// (snapshot); kütüphanede sonradan yapılan bir değişiklik geçmiş denetimleri etkilemez.

const DENETIM_KONTROL_KUTUPHANESI = {
  'Acil Durum Malzeme Dolabı': [
    'Dolap erişimi açık ve önünde engel yok',
    'Malzeme listesi dolap içinde/üzerinde mevcut',
    'Eksik, kullanılmış veya tarihi geçmiş malzeme yok',
    'Dolap temiz, kuru ve fiziksel hasarsız',
    'Kontrol etiketi/formu güncel'
  ],
  'Acil Durum Aydınlatma': [
    'Armatür fiziksel olarak sağlam',
    'Enerji kesintisinde devreye giriyor',
    'Aydınlatma seviyesi kaçış yolu için yeterli',
    'Yönlendirme işareti okunur ve görünür',
    'Önünde görüşü engelleyen malzeme yok'
  ],
  'Ecza Dolabı': [
    'Erişilebilir, kilit/kapak çalışır durumda',
    'İçerik listesi mevcut ve güncel',
    'Son kullanma tarihi geçmiş malzeme yok',
    'Eksik sarf malzeme yok',
    'Dolap hijyenik, kuru ve düzenli'
  ],
  'KKD Kullanımı': [
    'Alanda işe uygun KKD kullanılıyor',
    "KKD'ler sağlam, temiz ve kullanılabilir durumda",
    'Baret, gözlük, eldiven, ayakkabı, kulak koruyucu uygun',
    "Yüksekte çalışma KKD'lerinde hasar/tarih problemi yok",
    'Ortak KKD dolabı/stok alanı düzenli ve eksiksiz'
  ],
  'Göz Duşu': [
    'Erişilebilir ve önünde engel yok',
    'Aktivasyon kolu/pedalı çalışır durumda',
    'Su akışı yeterli, berrak ve kesintisiz',
    'Yönlendirme levhası görünür',
    'Kontrol etiketi/kaydı güncel'
  ],
  'Yangın Güvenliği': [
    'Yangın dolabı/söndürücü erişilebilir',
    'Hortum, lans ve vana fiziksel olarak sağlam',
    'Söndürücü manometresi yeşil bölgede',
    'Son periyodik kontrol tarihi geçerli',
    'Ekipman önünde engel yok'
  ],
  'Döküntü Kiti': [
    'Bulunduğu risk alanına uygun',
    'Absorban malzeme, atık torbası, eldiven, gözlük eksiksiz',
    'Kullanılmış malzeme yenilenmiş',
    'Erişilebilir ve etiketi okunur',
    'Kontrol tarihi güncel'
  ],
  'Tertip Düzen': [
    'Geçiş yolları, acil çıkışlar ve panoların önü açık',
    'Zemin temiz, kuru ve kaymaz durumda',
    'Malzemeler devrilmeyecek şekilde istiflenmiş',
    'Kablo/hortum takılma riski oluşturmuyor',
    'Uyarı levhaları görünür'
  ],
  'Kimyasal Alan': [
    'Etiketler (GHS/H-P kodları) okunur ve güncel',
    'Güvenlik Bilgi Formu (GBF) erişilebilir',
    'Birlikte depolanamayan kimyasallar ayrı tutuluyor',
    'Sekonder konteynman mevcut ve sağlam',
    'Göz duşu ve KKD erişimi kimyasal riskine uygun'
  ],
  'Genel Saha Denetimi': [
    'Takılma/düşme riski oluşturacak malzeme yok',
    'Yaya yolları ve acil kaçış yolları açık',
    'Uyarı levhaları görünür ve uygun',
    'Makine koruyucuları yerinde',
    'Elektrik kabloları ve panoları güvenli durumda',
    'Çalışanlar işe uygun KKD kullanıyor'
  ]
};

const DENETIM_TURLERI = Object.keys(DENETIM_KONTROL_KUTUPHANESI);

function denetimKontrolListesiUret(tur) {
  const maddeler = DENETIM_KONTROL_KUTUPHANESI[tur] || DENETIM_KONTROL_KUTUPHANESI['Genel Saha Denetimi'];
  return maddeler.map(madde => ({ madde, sonuc: '', not: '', aktarildiId: '' }));
}

function sonrakiDenetimNoUret(mevcutListe) {
  let maks = 0;
  (mevcutListe || []).forEach(d => {
    const eslesme = String(d.denetimNo || '').match(/(\d+)$/);
    if (eslesme) {
      const sayi = parseInt(eslesme[1], 10);
      if (sayi > maks) maks = sayi;
    }
  });
  return 'DEN' + String(maks + 1).padStart(4, '0');
}

function denetimOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    denetimNo: veriler.denetimNo || '',
    denetimTuru: veriler.denetimTuru || DENETIM_TURLERI[0],
    tarih: veriler.tarih || '',
    denetci: (veriler.denetci || '').trim(),
    bolum: (veriler.bolum || '').trim(),
    lokasyon: (veriler.lokasyon || '').trim(),
    kontrolListesi: veriler.kontrolListesi || denetimKontrolListesiUret(veriler.denetimTuru),
    notlar: (veriler.notlar || '').trim(),
    tamamlandiMi: !!veriler.tamamlandiMi,
    // Kullanıcı isteği: "üretilen ör. saha denetim raporu imzalı pdf halini
    // yükleyebileyim" (bkz. core/belge-yukle.js).
    imzaliBelgeUrl: veriler.imzaliBelgeUrl || '',
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}
