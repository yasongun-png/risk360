// İş İzinleri (Çalışma İzin Belgeleri) veri modeli. Eski üretim uygulamasındaki
// work_permit modülünden 10 izin türü ve her tür için kontrol maddesi
// kütüphanesi birebir taşındı. Eski uygulamada olmayıp burada eklenenler:
// gaz ölçümünde toksik gaz + ölçümü yapan alanı, LOTO/enerji izolasyonu için
// gerçek form alanları (eski uygulamada bu alanlar veri modelinde vardı ama
// hiçbir form girişi yoktu — doğrulama kuralı hiçbir zaman sağlanamıyordu),
// ve bir İş İzin Formu PDF çıktısı (eski uygulamada hiç yoktu, sadece CSV/JSON
// dışa aktarım vardı).

function bugunIso() {
  return new Date().toISOString().slice(0, 10);
}

const IS_IZNI_TURLERI = [
  'Sıcak Çalışma', 'Kapalı Alan', 'Yüksekte Çalışma', 'Elektrik Çalışması',
  'Kazı Çalışması', 'Kaldırma Operasyonu', 'Kimyasal Çalışma',
  'Basınçlı Hat Çalışması', 'Bakım / Mekanik', 'Genel İş İzni'
];

// Gerekli KKD seçimi için ikonlu seçenek kütüphanesi — kullanıcı isteği
// üzerine (checkbox listesi düzensiz duruyordu, tür sayısı arttırıldı).
// Barkod formunda ("Formu Tamamla" adımı) ve gerekirse modül içi formda
// checkbox+ikon grid olarak kullanılır.
const IS_IZNI_KKD_SECENEKLERI = [
  { ad: 'Baret', ikon: '⛑️' },
  { ad: 'Koruyucu Gözlük', ikon: '🥽' },
  { ad: 'Yüz Siperi', ikon: '😷' },
  { ad: 'İş Eldiveni', ikon: '🧤' },
  { ad: 'Kimyasal Dayanımlı Eldiven', ikon: '🧪' },
  { ad: 'Elektrik Yalıtkan Eldiven', ikon: '⚡' },
  { ad: 'Kulak Koruyucu', ikon: '🎧' },
  { ad: 'Toz Maskesi', ikon: '😮‍💨' },
  { ad: 'Gaz Maskesi / Solunum Cihazı', ikon: '🫁' },
  { ad: 'Kimyasal Koruyucu Tulum', ikon: '🥼' },
  { ad: 'Yangına Dayanıklı Kıyafet', ikon: '🧯' },
  { ad: 'Kaynak Maskesi / Siperi', ikon: '🔥' },
  { ad: 'Çelik Burunlu İş Ayakkabısı', ikon: '🥾' },
  { ad: 'Kaymaz Taban Bot', ikon: '🧦' },
  { ad: 'Paraşüt Tipi Emniyet Kemeri', ikon: '🪢' },
  { ad: 'Reflektif Yelek', ikon: '🦺' },
  { ad: 'Diz Koruyucu', ikon: '🩹' },
  { ad: 'Kol Koruyucu / Kolluk', ikon: '💪' }
];

// Eski uygulamadaki CONTROL_LIBRARY ile birebir aynı (verbatim).
const IS_IZNI_KONTROL_KUTUPHANESI = {
  'Sıcak Çalışma': [
    'Sıcak çalışma alanı yanıcı/parlayıcı maddelerden temizlendi',
    'Yangın söndürücü hazır bulunduruldu',
    'Kıvılcım sıçrama alanı kontrol edildi',
    'Gaz ölçümü yapıldı ve kayıt altına alındı',
    'Yangın gözcüsü görevlendirildi',
    'İş bitiminde en az 30 dakika yangın kontrolü yapılacak'
  ],
  'Kapalı Alan': [
    'Kapalı alan giriş izni onaylandı',
    'Oksijen ölçümü 19,5 - 23,5 aralığında',
    'Patlayıcı/yanıcı gaz ve toksik gaz ölçümü uygun',
    'Gözcü görevlendirildi',
    'Tripod / kurtarma ekipmanı hazır',
    'Havalandırma sağlandı',
    'Enerji izolasyonu ve körleme kontrol edildi'
  ],
  'Yüksekte Çalışma': [
    'Düşmeye karşı koruma sistemi belirlendi',
    'Paraşüt tipi emniyet kemeri ve bağlantı noktası uygun',
    'İskele/merdiven kontrol etiketi uygun',
    'Çalışma alanı düşen cisimlere karşı çevrildi',
    'Hava şartları uygun'
  ],
  'Elektrik Çalışması': [
    'LOTO uygulandı',
    'Gerilim yokluğu doğrulandı',
    'Yetkili elektrik personeli görevlendirildi',
    'Uygun elektriksel KKD kullanılıyor',
    'Topraklama/kısa devre önlemleri değerlendirildi'
  ],
  'Kazı Çalışması': [
    'Yer altı hatları kontrol edildi',
    'Kazı alanı bariyer ve ikazlarla çevrildi',
    'Şev/destekleme gerekliliği değerlendirildi',
    'Makine ve yaya trafiği ayrıldı',
    'Acil kaçış ve giriş/çıkış yolu belirlendi'
  ],
  'Kaldırma Operasyonu': [
    'Kaldırma planı hazırlandı',
    'Vinç/periyodik kontrol durumu uygun',
    'Sapan, mapa, kanca ve bağlantı ekipmanı kontrol edildi',
    'Kaldırma alanı çevrildi',
    'İşaretçi/sapancı görevlendirildi',
    'Zemin taşıma kapasitesi değerlendirildi'
  ],
  'Kimyasal Çalışma': [
    'GBF/SDS kontrol edildi',
    'Kimyasal uygun KKD belirlendi',
    'Göz duşu/acil duş erişilebilir',
    'Döküntü kiti hazır',
    'Uyumsuz kimyasallar ve reaksiyon riski değerlendirildi',
    'Havalandırma ve maruziyet önlemleri uygun'
  ],
  'Basınçlı Hat Çalışması': [
    'Hat basıncı boşaltıldı',
    'Enerji izolasyonu uygulandı',
    'Körleme/etiketleme planı kontrol edildi',
    'Hat içeriği ve kimyasal riskler değerlendirildi',
    'Boşaltma/tahliye noktası güvenli'
  ],
  'Bakım / Mekanik': [
    'Makine/ekipman durduruldu ve emniyete alındı',
    'LOTO gerekliliği değerlendirildi',
    'Hareketli parçalar güvenli hale getirildi',
    'Bakım alanı çevrildi',
    'Uygun el aleti ve KKD kullanılıyor'
  ],
  'Genel İş İzni': [
    'Saha kontrolü yapıldı',
    'İşe özel riskler değerlendirildi',
    'Gerekli KKD belirlendi',
    'Alan çevrildi ve uyarılar yerleştirildi'
  ]
};

// LOTO / enerji izolasyonu değerlendirmesi zorunlu olan izin türleri.
const IS_IZNI_LOTO_GEREKTIREN_TURLER = ['Elektrik Çalışması', 'Bakım / Mekanik', 'Basınçlı Hat Çalışması'];

const IS_IZNI_DURUMLARI = ['Taslak', 'Onay Bekliyor', 'Onaylandı', 'Aktif', 'Durduruldu', 'Kapalı', 'Süresi Geçti', 'Reddedildi', 'İptal'];
const IS_IZNI_ONAY_DURUMLARI = ['Gerekmiyor', 'Bekliyor', 'Onaylandı', 'Reddedildi'];
const IS_IZNI_RISK_SEVIYELERI = ['Düşük', 'Orta', 'Yüksek', 'Kritik'];
const IS_IZNI_TERMINAL_DURUMLAR = ['Kapalı', 'Reddedildi', 'İptal'];

function izinSonrakiNoUret(mevcutListe) {
  let maks = 0;
  (mevcutListe || []).forEach(k => {
    const eslesme = String(k.izinNo || '').match(/(\d+)$/);
    if (eslesme) { const n = parseInt(eslesme[1], 10); if (n > maks) maks = n; }
  });
  return 'IZN' + String(maks + 1).padStart(4, '0');
}

function izinKontrolListesiUret(tur) {
  const maddeler = IS_IZNI_KONTROL_KUTUPHANESI[tur] || IS_IZNI_KONTROL_KUTUPHANESI['Genel İş İzni'];
  return maddeler.map(metin => ({ metin, isaretli: false, not: '' }));
}

function izinSuresiSaatHesapla(baslangic, bitis) {
  if (!baslangic || !bitis) return null;
  const b1 = new Date(baslangic), b2 = new Date(bitis);
  if (isNaN(b1) || isNaN(b2)) return null;
  return Math.round((b2 - b1) / 3600000 * 10) / 10;
}

function _listeyeAyir(deger) {
  if (Array.isArray(deger)) return deger.map(s => String(s).trim()).filter(Boolean);
  return String(deger || '').split(/[;,\n|]+/).map(s => s.trim()).filter(Boolean);
}

// Durumu tarihe ve onay durumuna göre hesaplar (terminal durumlar hariç).
function izinDurumuHesapla(izin, bugunTarihSaat) {
  if (IS_IZNI_TERMINAL_DURUMLAR.includes(izin.durum)) return izin.durum;
  if (izin.onayDurumu === 'Bekliyor') return 'Onay Bekliyor';
  const referans = bugunTarihSaat || new Date().toISOString();
  if (izin.bitis && izin.bitis < referans && izin.durum !== 'Aktif') return izin.durum;
  if (izin.bitis && izin.bitis < referans) return 'Süresi Geçti';
  return izin.durum;
}

// 3 taraf dijital imza: talepEden (formu tamamlayan birim), bakim (bakım
// personeli), isg (İSG). Her biri null (henüz atılmadı) veya
// { ad, imzaUrl, tarih } olur — bkz. is-izni-bildir.html "Formu Tamamla" /
// "İmza At" adımları.
function izinImzaVeriUret(ad, imzaUrl) {
  return { ad: (ad || '').trim(), imzaUrl: imzaUrl || '', tarih: new Date().toISOString() };
}

function onayciOlustur(veriler) {
  return {
    id: rastgeleId(),
    ad: (veriler.ad || '').trim(),
    rol: (veriler.rol || '').trim(),
    durum: veriler.durum || 'Bekliyor',
    onayTarihi: veriler.onayTarihi || '',
    not: (veriler.not || '').trim()
  };
}

function izinOlustur(veriler) {
  const tur = veriler.izinTuru || 'Genel İş İzni';
  return {
    id: veriler.id || rastgeleId(),
    izinNo: veriler.izinNo || '',
    izinTuru: tur,
    isTanimi: (veriler.isTanimi || '').trim(),
    aciklama: (veriler.aciklama || '').trim(),
    bolum: (veriler.bolum || '').trim(),
    lokasyon: (veriler.lokasyon || '').trim(),
    yuklenici: (veriler.yuklenici || '').trim(),
    talepEden: (veriler.talepEden || '').trim(),
    sahaSorumlusu: (veriler.sahaSorumlusu || '').trim(),
    calisanlar: _listeyeAyir(veriler.calisanlar),
    gerekliKkd: _listeyeAyir(veriler.gerekliKkd),
    riskSeviyesi: veriler.riskSeviyesi || 'Orta',
    baslangic: veriler.baslangic || '',
    bitis: veriler.bitis || '',

    kontrolMaddeleri: Array.isArray(veriler.kontrolMaddeleri) ? veriler.kontrolMaddeleri : izinKontrolListesiUret(tur),

    gazOlcumu: {
      oksijen: (veriler.gazOlcumu && veriler.gazOlcumu.oksijen) || '',
      lel: (veriler.gazOlcumu && veriler.gazOlcumu.lel) || '',
      toksik: (veriler.gazOlcumu && veriler.gazOlcumu.toksik) || '',
      olcumZamani: (veriler.gazOlcumu && veriler.gazOlcumu.olcumZamani) || '',
      olcenKisi: (veriler.gazOlcumu && veriler.gazOlcumu.olcenKisi) || ''
    },

    izolasyon: {
      lotoGerekli: veriler.izolasyon ? !!veriler.izolasyon.lotoGerekli : IS_IZNI_LOTO_GEREKTIREN_TURLER.includes(tur),
      lotoUygulandi: veriler.izolasyon ? !!veriler.izolasyon.lotoUygulandi : false,
      enerjiIzolasyonu: (veriler.izolasyon && veriler.izolasyon.enerjiIzolasyonu || '').trim(),
      korlemeListesi: (veriler.izolasyon && veriler.izolasyon.korlemeListesi || '').trim()
    },

    // onayDurumu ve durum kasıtlı olarak veriler'den ALINMAZ: aksi halde
    // oluşturma formundan doğrudan "Onaylandı"/"Aktif" seçilerek onay adımı
    // atlanabilirdi. Bu ikisi yalnızca izinOnayVer/izinReddet/izinAktifEt/
    // izinDurdur/izinKapat üzerinden değişir.
    onaycilar: Array.isArray(veriler.onaycilar) ? veriler.onaycilar : [],
    onayDurumu: veriler.riskSeviyesi === 'Kritik' ? 'Bekliyor' : 'Gerekmiyor',

    imzalar: veriler.imzalar && typeof veriler.imzalar === 'object'
      ? veriler.imzalar
      : { talepEden: null, bakim: null, isg: null },

    durum: 'Taslak',
    kapanisNotu: (veriler.kapanisNotu || '').trim(),
    kapanisTarihi: veriler.kapanisTarihi || '',
    notlar: (veriler.notlar || '').trim(),

    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}
