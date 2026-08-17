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

// Kurumsal/kimya-ağır sanayi tesislerinde kullanılan izin türü bazlı kontrol
// listeleriyle aynı kapsamda, her tür için ayrı ve detaylı madde seti
// (kullanıcı isteği: "seçilen iş izni türüne göre detaylı soru listeleri
// olsun hepsinde ayrı ayrı, kurumsal firmalardaki örneklere bak").
const IS_IZNI_KONTROL_KUTUPHANESI = {
  'Sıcak Çalışma': [
    'Sıcak çalışma alanı (yarıçap en az 10-15 m) yanıcı/parlayıcı maddelerden temizlendi',
    'Zemin ve çevredeki yanıcı malzemeler ıslatıldı veya yanmaz örtüyle kapatıldı',
    'Uygun tip ve sayıda yangın söndürücü hazır bulunduruldu',
    'Kıvılcım/sıçrama sınırlaması (paravan, perde) uygulandı',
    'Gaz ölçümü (oksijen, LEL, toksik gaz) yapıldı ve kayıt altına alındı',
    'Yangın gözcüsü görevlendirildi, iş boyunca sahada kaldı',
    'Kaynak/kesme ekipmanı (tüp, hortum, reglaj) kontrol edildi, sızıntı yok',
    'Komşu ünite/bölüm sorumluları sıcak çalışmadan haberdar edildi',
    'Acil durum iletişimi ve kaçış yolu belirlendi',
    'İş bitiminde en az 30 dakika yangın gözetimi yapılacak'
  ],
  'Kapalı Alan': [
    'Kapalı alan giriş izni ayrıca onaylandı ve giriş noktasına asıldı',
    'Oksijen ölçümü %19,5 - %23,5 aralığında',
    'Patlayıcı/yanıcı gaz (LEL) ve toksik gaz (H2S, CO, NH3 vb.) ölçümü uygun',
    'Ölçüm cihazının kalibrasyonu geçerli',
    'Gözcü (dışarıda) görevlendirildi, sürekli iletişim sağlanıyor',
    'Tripod / kurtarma ekipmanı ve kurtarma prosedürü hazır',
    'Havalandırma sağlandı ve iş boyunca sürekli çalışıyor',
    'Enerji izolasyonu (LOTO) ve körleme kontrol edildi',
    'Giriş/çıkış kayıt sistemi (kim, ne zaman) uygulanıyor',
    'Kapalı alan içi iletişim yöntemi (telsiz/işaret) belirlendi'
  ],
  'Yüksekte Çalışma': [
    'Düşmeye karşı koruma sistemi (korkuluk/ağ/kemer) belirlendi',
    'Paraşüt tipi emniyet kemeri ve bağlantı noktası (çapa) uygun ve kontrollü',
    'İskele/merdiven/platform kontrol etiketi güncel ve uygun',
    'Çalışma alanı düşen cisimlere karşı bariyerle çevrildi, alt bölge ikazlandı',
    'Hava şartları (rüzgar, yağış, buzlanma) çalışmaya uygun',
    'Asılı kalma durumu için kurtarma planı ve ekipmanı hazır',
    'Çalışanlar yüksekte çalışma eğitimi almış',
    'Alet/malzeme düşmesini önleyecek bağlama/torba kullanılıyor'
  ],
  'Elektrik Çalışması': [
    'LOTO (kilitleme/etiketleme) uygulandı, anahtar sorumlu kişide',
    'Gerilim yokluğu voltaj test cihazıyla doğrulandı',
    'Yetkili/sertifikalı elektrik personeli görevlendirildi',
    'Uygun elektriksel KKD (yalıtkan eldiven, siperlik) kullanılıyor',
    'Topraklama/kısa devre önlemleri değerlendirildi ve uygulandı',
    'Çalışılan hat/pano tek hat şeması ile doğrulandı',
    'Komşu enerjili hat/ekipmanlara karşı bariyer/izolasyon sağlandı',
    'Acil kesme (acil stop) noktası belirlendi'
  ],
  'Kazı Çalışması': [
    'Yer altı hatları (elektrik, doğalgaz, su, iletişim) haritadan kontrol edildi, işaretlendi',
    'Kazı alanı bariyer ve ikaz levhalarıyla çevrildi',
    'Şev açısı/destekleme (iksa) gerekliliği zemin cinsine göre değerlendirildi',
    'Makine ve yaya trafiği güzergahları ayrıldı',
    'Acil kaçış ve giriş/çıkış merdiveni (1,5 m üzeri derinlikte) sağlandı',
    'Kazı kenarına yük/malzeme istiflenmedi (güvenlik mesafesi korundu)',
    'Yer altı suyu/gaz riski değerlendirildi',
    'Kazı derinliği 1,5 metreyi aşıyorsa iş güvenliği uzmanı onayı alındı'
  ],
  'Kaldırma Operasyonu': [
    'Kaldırma planı (yük ağırlığı, kapasiteler, rota) hazırlandı',
    'Vinç/forklift periyodik kontrol/muayene belgesi geçerli',
    'Sapan, mapa, kanca, zincir ve bağlantı ekipmanları hasarsız, kontrol edildi',
    'Kaldırma alanı bariyerle çevrildi, altından geçiş yasaklandı',
    'İşaretçi/sapancı (yetkili) görevlendirildi',
    'Zemin taşıma kapasitesi ve düzlüğü değerlendirildi',
    'Hava koşulları (rüzgar hızı) kaldırma için uygun',
    'Enerji hatlarına (yüksek gerilim) güvenli mesafe sağlandı'
  ],
  'Kimyasal Çalışma': [
    'GBF/SDS (Güvenlik Bilgi Formu) kontrol edildi ve sahada erişilebilir',
    'Kimyasala uygun KKD (eldiven, gözlük, tulum, solunum) belirlendi',
    'Göz duşu / acil duş çalışır durumda ve erişilebilir mesafede',
    'Döküntü/sızıntı müdahale kiti hazır',
    'Uyumsuz kimyasallar ve reaksiyon riski değerlendirildi, ayrı depolandı',
    'Havalandırma yeterli, maruziyet sınır değerleri değerlendirildi',
    'Atık/artık kimyasalların bertaraf yöntemi belirlendi',
    'Acil durum ve ilkyardım iletişim bilgileri sahada asılı'
  ],
  'Basınçlı Hat Çalışması': [
    'Hat basıncı tamamen boşaltıldı ve doğrulandı (manometre sıfır)',
    'Enerji izolasyonu (vana kapatma/kilitleme) uygulandı',
    'Körleme/etiketleme planı hazırlandı ve uygulandı, kayıt tutuldu',
    'Hat içeriği (kimyasal, sıcaklık) ve riskleri değerlendirildi',
    'Boşaltma/tahliye noktası güvenli ve uygun kaba yönlendirildi',
    'Hat açılmadan önce çift kontrol (ikinci doğrulama) yapıldı',
    'Bağlantı elemanları (flanş, conta) sökümü için uygun ekipman hazır'
  ],
  'Bakım / Mekanik': [
    'Makine/ekipman durduruldu ve LOTO ile emniyete alındı',
    'Depolanmış enerji (yay, hidrolik, pnömatik, ağırlık) tahliye edildi',
    'Hareketli parçalar (kayış, dişli, mil) bloke edildi/sabitlendi',
    'Bakım alanı bariyerle çevrildi, uyarı levhası asıldı',
    'Uygun el aleti, kaldırma ekipmanı ve KKD kullanılıyor',
    'Sökülen parçalar/civatalar güvenli şekilde etiketlenip saklanıyor',
    'İş sonrası fonksiyon testi ve koruyucuların yerine takılması planlandı'
  ],
  'Genel İş İzni': [
    'Saha kontrolü ve ön risk değerlendirmesi yapıldı',
    'İşe özel tehlikeler (üçüncü taraf, çevre) belirlendi',
    'Gerekli KKD belirlendi ve çalışanlara temin edildi',
    'Çalışma alanı çevrildi, gerekiyorsa uyarı levhaları yerleştirildi',
    'Komşu faaliyetlerle çakışma/etkileşim değerlendirildi',
    'Acil durum ve ilkyardım noktaları çalışanlara bildirildi'
  ]
};

// LOTO / enerji izolasyonu değerlendirmesi zorunlu olan izin türleri.
const IS_IZNI_LOTO_GEREKTIREN_TURLER = ['Elektrik Çalışması', 'Bakım / Mekanik', 'Basınçlı Hat Çalışması'];

const IS_IZNI_DURUMLARI = ['Taslak', 'Onay Bekliyor', 'Onaylandı', 'Aktif', 'Durduruldu', 'Kapalı', 'Süresi Geçti', 'Reddedildi', 'İptal'];
const IS_IZNI_ONAY_DURUMLARI = ['Gerekmiyor', 'Bekliyor', 'Onaylandı', 'Reddedildi'];
const IS_IZNI_RISK_SEVIYELERI = ['Düşük', 'Orta', 'Yüksek', 'Kritik'];
const IS_IZNI_TERMINAL_DURUMLAR = ['Kapalı', 'Reddedildi', 'İptal'];

// Bir izin "Onay Bekliyor" aşamasında bu kadar gündür bekliyorsa gecikmiş
// sayılır — kullanıcı isteği: "X günden uzun süre aynı aşamada bekleyen
// talepler/izinler için genel bir uyarı olsun". İş izninde ayrı bir
// "aşamaya giriş tarihi" tutulmadığından oluşturma tarihinden hesaplanır
// (yaklaşık ama pratikte yeterli: formu tamamlama genelde talebi açtıktan
// kısa süre sonra yapılır).
const IS_IZNI_GECIKME_ESIK_GUN = 2;

function izinBeklemeGunSayisi(k) {
  if (!k.olusturmaTarihi) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(k.olusturmaTarihi).getTime()) / 86400000));
}

function izinSonrakiNoUret(mevcutListe) {
  let maks = 0;
  (mevcutListe || []).forEach(k => {
    const eslesme = String(k.izinNo || '').match(/(\d+)$/);
    if (eslesme) { const n = parseInt(eslesme[1], 10); if (n > maks) maks = n; }
  });
  return 'IZN' + String(maks + 1).padStart(4, '0');
}

// Kullanıcı isteği: "kontrol maddelerinde hangisinin onaylandığı, hangisinin
// ilgili olmadığı, hangisinin kontrol edilmediği anlaşılmıyor" — eski
// isaretli (evet/hayır) alanı yerine üç durumlu bir alan: bir madde ya
// gerçekten yapılıp onaylandı, ya bu iş için ilgili/geçerli değil, ya da
// henüz hiç kontrol edilmedi. "yapilmadi" ile "ilgiliDegil"i eskiden ikisi
// de sadece boş kutucuk olarak görünüyor, ayırt edilemiyordu.
const IS_IZNI_KONTROL_DURUMLARI = ['yapilmadi', 'yapildi', 'ilgiliDegil'];
const IS_IZNI_KONTROL_DURUM_ETIKETLERI = { yapilmadi: 'Kontrol Edilmedi', yapildi: 'Yapıldı / Uygun', ilgiliDegil: 'İlgili Değil' };

// Eski kayıtlarda (bu değişiklikten önce oluşturulmuş) durum alanı yok,
// sadece isaretli boolean var — geriye dönük uyumluluk için buradan çözülür.
function izinKontrolDurumuCoz(m) {
  return m.durum || (m.isaretli ? 'yapildi' : 'yapilmadi');
}

// Kullanıcı isteği: "kontrol maddeleri yapıldı/uygun seçili gelsin" — yeni
// bir form açıldığında liste varsayılan olarak "Yapıldı / Uygun" ile gelir,
// ilgili olmayan veya gerçekten kontrol edilmemiş maddeler elle değiştirilir.
function izinKontrolListesiUret(tur) {
  const maddeler = IS_IZNI_KONTROL_KUTUPHANESI[tur] || IS_IZNI_KONTROL_KUTUPHANESI['Genel İş İzni'];
  return maddeler.map(metin => ({ metin, durum: 'yapildi', not: '' }));
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
    // Kullanıcı isteği: "eğer iş izni daha önce açılmış bir bakım talebinin
    // devamı ise... o bakım talebinin numarası iş izninde referans olarak
    // yer alsın" — bkz. is-izni-bildir.html "İlgili Bakım İşi" seçimi.
    bakimTalepId: (veriler.bakimTalepId || '').trim(),
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
