// Acil Durum Yönetimi veri modeli.
// Mevzuat dayanağı: İşyerlerinde Acil Durumlar Hakkında Yönetmelik (RG 18.06.2013/28681)
// Madde 11 (ekip sayıları), Madde 12 (plan asgari unsurları), Madde 13/2 (plan yenileme süresi);
// İlkyardım Yönetmeliği (RG 29.07.2015/29429) Madde 19 (ilkyardımcı sayısı).
// Bu hesaplamalar yönetmeliğin asgari hükümlerini yansıtır; nihai uygulama için güncel
// mevzuat ve resmi rehberler esas alınmalıdır.

const EKIP_TURLERI = ['Koordinasyon', 'Söndürme', 'Kurtarma', 'Koruma', 'İlk Yardım', 'Destek'];
const EKIP_ROLLERI = ['Acil Durum Sorumlusu', 'Acil Durum Koordinatörü', 'Ekip Başı', 'Ekip Üyesi', 'Gözetmen'];
const VARDIYALAR = ['A', 'B', 'C', 'D', 'G', '08-16', '16-24', '00-08', 'Genel'];

// "Acil Durum Ekibi Görevlendirme Yazısı" belge çıktısındaki (bkz.
// gorevlendirme-cikti.js) GÖREV TANIMI madde listesi — kullanıcının
// kurumundan paylaştığı gerçek görevlendirme yazılarından (6331 sayılı
// Kanun/Yönetmelik Md.11 atıflı) birebir alınmıştır. EKIP_TURLERI'ndeki 6
// türe ek olarak, ekipTuru alanına serbestçe girilebilen 3 özel değer daha
// tanımlı: "Ekipbaşı" (hangi ekibe bağlı olduğu kaynak organizasyon
// şemasında belirtilmemiş ekip liderleri), "Acil Durum Koordinatörü" ve
// "Acil Durum Sorumlusu" (kişi bazlı liderlik pozisyonları, belirli bir
// ekip türüne bağlı değil).
const ACIL_DURUM_GOREV_TANIMLARI = {
  'Söndürme': [
    'İşyerinde meydana gelebilecek yangınlara, uygun söndürücü ve ekipmanlarla derhal müdahale eder.',
    'Yangının yayılımını önler; can güvenliğini esas alarak söndürme faaliyetlerini yürütür.',
    'Yangın sonrası bölgenin güvenli hale getirilmesini sağlar.',
    'Söndürme ekipmanlarının periyodik kontrollerinin yapılmasını takip eder.'
  ],
  'Kurtarma': [
    'Acil durumlarda mahsur kalan veya yaralanan kişilerin güvenli şekilde kurtarılmasını sağlar.',
    'Kapalı alan, yüksek alan ve tehlikeli bölgelerde kurtarma işlemlerini gerçekleştirir.',
    'Gerektiğinde ilk yardım ekibiyle koordineli çalışır.',
    'Kurtarma faaliyetlerinde uygun KKD kullanımını sağlar.'
  ],
  'İlk Yardım': [
    'Yaralanan veya etkilenen kişilere olay yerinde temel ilk yardım müdahalelerini yapar.',
    'Sağlık kuruluşuna sevk edilene kadar gerekli desteği sağlar.',
    'Kullanılan ilk yardım malzemelerinin yenilenmesini takip eder.',
    'İlk yardım kayıtlarını düzenler ve İSG birimine bildirir.'
  ],
  'Koruma': [
    'Acil durum sırasında tesis girişlerini ve kritik noktaları kontrol altında tutar, yetkisiz girişi engeller.',
    'Tahliye edilen alanların ve toplanma bölgesinin güvenliğini sağlar.',
    'Tesis içindeki değerli/tehlikeli malzeme ve ekipmanların korunmasını gözetir.',
    'Dış kurum (itfaiye, ambulans, güvenlik) ekiplerinin sahaya yönlendirilmesine yardımcı olur.'
  ],
  'Destek': [
    'İhtiyaç duyulan araç, gereç, malzeme ve lojistik desteği sağlar.',
    'Ekipler arası haberleşme ve bilgi akışının sürdürülmesine yardımcı olur.',
    'Acil durum sonrası temizlik, toparlanma ve normale dönüş çalışmalarına katılır.',
    'Diğer ekiplerin ihtiyaç duyduğu her türlü destek faaliyetinde görev alır.'
  ],
  'Koordinasyon': [
    'Ekipler arası bilgi akışının ve koordinasyonun sağlanmasına destek olur.',
    'Acil Durum Koordinatörü ve Sorumlularına saha bilgisi aktarır.',
    'Talimatların ilgili ekiplere iletilmesini sağlar.',
    'Olay kayıtlarının tutulmasına yardımcı olur.'
  ],
  'Ekipbaşı': [
    'Kendi ekibinin sevk, idare ve güvenliğinden sorumludur.',
    'Ekibin acil durum anındaki görev dağılımını ve saha uygulamalarını yönetir.',
    'Müdahale sonrası geri bildirimleri sorumluya rapor eder.',
    'Ekipman ve araçların kullanıma hazır bulundurulmasını sağlar.'
  ],
  'Acil Durum Koordinatörü': [
    'İşyerindeki acil durum organizasyonunun genel yönetiminden ve koordinasyonundan sorumludur.',
    'Acil durumlarda tüm ekiplerin sevk ve idaresini sağlar; müdahale faaliyetlerinin bütünlüğünü gözetir.',
    'Kamu kurum ve kuruluşlarıyla iletişimi sağlar ve gerekli bilgilendirmeleri yapar.',
    'Olay sonrası değerlendirme, raporlama ve iyileştirme faaliyetlerinin yürütülmesini sağlar.'
  ],
  'Acil Durum Sorumlusu': [
    'Kendi sorumluluğundaki tesis veya birimde acil durum faaliyetlerinin yürütülmesinden sorumludur.',
    'Ekip başlarına ve personele gerekli talimatları verir; koordinatör ile sürekli iletişim halindedir.',
    'Tahliye, toplanma ve güvenli bölge düzeninin korunmasını sağlar.',
    'Olay sonrası geri bildirimleri ve tespitleri koordinatöre rapor eder.'
  ]
};
const ACIL_DURUM_GOREV_TANIMI_VARSAYILAN = [
  'Acil durumun giderilmesi için görevlendirildiği ekibin talimatları doğrultusunda hareket eder.',
  'Kendisine verilen görevleri acil durum planına uygun şekilde yerine getirir.'
];

function acilDurumGorevTanimiGetir(ekipTuru) {
  return ACIL_DURUM_GOREV_TANIMLARI[ekipTuru] || ACIL_DURUM_GOREV_TANIMI_VARSAYILAN;
}

// "Yangın Tüpü" burada değil — kendi ayrı sekmesi/kayıt türü var (bkz. YANGIN_TUPU_TIPLERI, yanginTupuOlustur).
const EKIPMAN_TURLERI = ['Hidrant', 'Yangın Dolabı', 'Göz Duşu', 'Göz ve Boy Duşu', 'Monitör', 'Sprinkler Hattı', 'Kaçış Yolu', 'Toplanma Alanı', 'Alarm / Siren', 'Acil Aydınlatma', 'Döküntü Kiti'];

// Ekipman türüne göre kayıt önekleri (madde: "acil durum ekipmanlarının
// türüne göre numaralandırma olsun" kullanıcı isteği) — her tür kendi
// bağımsız sayacına sahip (bkz. service.js ekipmanEkle, aynı önekteki
// kayıtlara göre filtrelenip numara üretilir).
const EKIPMAN_TUR_ONEKLERI = {
  'Hidrant': 'HDR',
  'Yangın Dolabı': 'YD',
  'Göz Duşu': 'GD',
  'Göz ve Boy Duşu': 'GVB',
  'Monitör': 'MNT',
  'Sprinkler Hattı': 'SPK',
  'Kaçış Yolu': 'KY',
  'Toplanma Alanı': 'TA',
  'Alarm / Siren': 'ALS',
  'Acil Aydınlatma': 'AAY',
  'Döküntü Kiti': 'DKT',
  'Yangın Tüpü': 'YSC'
};

// Ekipman türüne göre madde bazlı kontrol kriterleri — kullanıcı isteği:
// "kontrol soruları ekleyeceksin ekipmana uygun ama bulgular kısmı da
// kalacak" (serbest metin "Bulgular" alanı KALDIRILMIYOR, üzerine eklenen
// yapılandırılmış bir kontrol listesi).
const EKIPMAN_KONTROL_CEVAP_SECENEKLERI = ['Uygun', 'Uygun Değil', 'İlgili Değil'];
// Kullanıcı isteği: "soru olmasın" -- kontrol kriterleri "mı/mi/mu/mü?"
// sorusu yerine düz kriter ifadesi (etiket) olarak yazılır; Uygun/Uygun
// Değil/İlgili Değil seçimiyle zaten değerlendirildiğinden ayrıca soru
// işareti gerekmiyor.
const EKIPMAN_KONTROL_SORULARI = {
  'Hidrant': [
    { id: 'erisim', soru: 'Hidranta erişim kolay' },
    { id: 'govde', soru: 'Gövde hasarsız/paslanmamış' },
    { id: 'vana', soru: 'Vana çalışıyor' },
    { id: 'sizinti', soru: 'Sızıntı yok' },
    { id: 'korRekor', soru: 'Kör rekorlar takılı' },
    { id: 'rekorKirik', soru: 'Rekorlarda kırık/hasar yok' },
    { id: 'vanaKollari', soru: 'Vana kolları sağlam' }
  ],
  'Yangın Dolabı': [
    { id: 'erisim', soru: 'Dolap kapısı kolayca açılıyor' },
    { id: 'hortum', soru: 'Hortum sağlam, katlanmış/düzenli' },
    { id: 'dolapKapagi', soru: 'Dolap kapağı var' },
    { id: 'dolapSaglam', soru: 'Dolap sağlam' },
    { id: 'dolapBoyasi', soru: 'Dolap boyası iyi' },
    { id: 'lansMevcut', soru: 'Lans mevcut' },
    { id: 'lansSaglam', soru: 'Lans sağlam ve çalışır durumda' }
  ],
  'Göz Duşu': [
    { id: 'erisim', soru: 'Göz duşuna erişim engelsiz' },
    { id: 'akisBasinc', soru: 'Su akışı ve basıncı yeterli' },
    { id: 'aktivasyon', soru: 'Aktivasyon mekanizması (kelebek vana vb.) çalışıyor' },
    { id: 'nozul', soru: 'Nozullar temiz, koruma kapakları yerinde' },
    { id: 'sariKapak', soru: 'Sarı kapakları var' }
  ],
  'Göz ve Boy Duşu': [
    { id: 'erisim', soru: 'Göz ve boy duşuna erişim engelsiz' },
    { id: 'akisBasinc', soru: 'Su basıncı/akışı yeterli' },
    { id: 'aktivasyon', soru: 'Pedal ve el vanaları çalışıyor' },
    { id: 'nozul', soru: 'Nozullar/başlıklar temiz ve hasarsız' },
    { id: 'gozPuskurtmeBasligi', soru: 'Göz duşunda püskürtme başlığı var' }
  ],
  'Monitör': [
    { id: 'erisim', soru: 'Monitöre erişim engelsiz' },
    { id: 'donme', soru: 'Döner/yönlendirme mekanizması çalışıyor' },
    { id: 'besleme', soru: 'Su/köpük beslemesi yeterli' },
    { id: 'nozul', soru: 'Nozul/püskürtme başlığı hasarsız' }
  ],
  'Sprinkler Hattı': [
    { id: 'vanaAcik', soru: 'Ana kontrol vanası açık ve mühürlü/kilitli' },
    { id: 'basincGostergesi', soru: 'Basınç göstergesi normal aralıkta' },
    { id: 'borularSizinti', soru: 'Borularda sızıntı/korozyon yok' },
    { id: 'baslikEngelsiz', soru: 'Sprinkler başlıklarının altı/çevresi engelsiz (min. 45-50 cm boşluk)' },
    { id: 'baslikHasarsiz', soru: 'Sprinkler başlıkları hasarsız, boyanmamış/örtülmemiş' },
    { id: 'alarmVanasi', soru: 'Alarm vanası/akış şalteri çalışıyor' },
    { id: 'askiDestek', soru: 'Boru askı ve destekleri sağlam' }
  ],
  'Kaçış Yolu': [
    { id: 'engelsiz', soru: 'Kaçış yolu engelsiz' },
    { id: 'tabela', soru: 'Yönlendirme/tabela levhaları görünür ve sağlam' },
    { id: 'aydinlatma', soru: 'Acil aydınlatma çalışıyor' },
    { id: 'zemin', soru: 'Zemin kayma riski taşımıyor' },
    { id: 'kapilar', soru: 'Kapılar kilitli/engelli değil' }
  ],
  'Toplanma Alanı': [
    { id: 'isaretleme', soru: 'Toplanma alanı işaretlemesi görünür' },
    { id: 'erisim', soru: 'Alan engelsiz ve erişilebilir' },
    { id: 'kapasite', soru: 'Alan kapasiteye yeterli' },
    { id: 'guvenliMesafe', soru: 'Tehlikeli alanlardan güvenli mesafede' }
  ],
  'Alarm / Siren': [
    { id: 'erisim', soru: 'Alarm butonu/siren erişilebilir ve görünür' },
    { id: 'testCalisir', soru: 'Test edildiğinde çalışıyor' },
    { id: 'sesIsik', soru: 'Ses/ışık seviyesi yeterli' },
    { id: 'govde', soru: 'Gövde hasarsız' }
  ],
  'Acil Aydınlatma': [
    { id: 'calisir', soru: 'Armatür çalışıyor' },
    { id: 'batarya', soru: 'Batarya/şarj durumu yeterli' },
    { id: 'aydinlatmaSeviyesi', soru: 'Aydınlatma seviyesi kaçış yolunu yeterince aydınlatıyor' },
    { id: 'govdeLens', soru: 'Gövde/lens hasarsız' }
  ],
  'Döküntü Kiti': [
    { id: 'erisim', soru: 'Kit erişilebilir konumda' },
    { id: 'icerikEksiksiz', soru: 'İçerik eksiksiz (emici, eldiven, gözlük, torba vb.)' },
    { id: 'sonKullanma', soru: 'Son kullanma tarihi geçmiş malzeme yok' },
    { id: 'talimat', soru: 'Kullanım talimatı mevcut' }
  ]
};
const TATBIKAT_TURLERI = ['Yangın Tatbikatı', 'Tahliye Tatbikatı', 'Kimyasal Sızıntı', 'Amonyak Senaryosu', 'Asit Sızıntısı', 'Deprem', 'Kapalı Alan Kurtarma', 'Liman / İskele Acil Durumu', 'Diğer'];
const SENARYO_TURLERI = ['Yangın', 'Patlama', 'Kimyasal Yayılım', 'Amonyak Kaçağı', 'Asit Dökülmesi', 'Deprem', 'Kapalı Alan', 'Çevresel Olay', 'Diğer'];

// Senaryo kartının ait olduğu geniş kategori (madde 4: Tehlike ve Acil Durum
// Envanteri) — SENARYO_TURLERI (yukarıda) somut tehlike türüdür, kategori
// bunun üstünde çapraz sınıflandırma/filtre boyutudur.
const SENARYO_KATEGORILERI = ['Yangın', 'Patlama', 'Kimyasal', 'Proses', 'Fiziksel', 'İnsan Kaynaklı', 'Güvenlik', 'Sağlık'];

// Tesis sınıflandırması (madde 2) — hazır senaryo kütüphanesini sektöre göre
// filtrelemek için kullanılır. "Genel" tüm tesis türlerinde geçerli, sektöre
// özgü olmayan kartlar (deprem, yüksekten düşme vb.) içindir.
const TESIS_TURLERI = [
  'Genel', 'Gübre Fabrikası', 'Kimyasal/Proses Fabrikası', 'Asit Fabrikası', 'Amonyak Tesisi',
  'Rafineri/Petrokimya Tesisi', 'Depo/Lojistik Merkezi', 'Gıda Fabrikası', 'İnşaat Sahası',
  'Ofis', 'AVM', 'Hastane', 'Otel', 'Okul/Eğitim Tesisi', 'Laboratuvar', 'Atölye', 'Liman',
  'Akaryakıt/Depolama Tesisi', 'Konut/Toplu Kullanım Binası', 'Diğer'
];

// Senaryo kartındaki risk matrisi (madde 7) alanları için ortak nitel ölçek —
// facility'ye özgü olduğundan hazır şablonlarda doldurulmaz, kullanıcı kendi
// envanterine eklerken belirler.
const SENARYO_ONEM_SEVIYELERI = ['Düşük', 'Orta', 'Yüksek', 'Kritik'];
const SENARYO_TAHLIYE_KARARLARI = ['Kısmi Tahliye', 'Tam Tahliye', 'Yerinde Sığınma'];

const YANGIN_TUPU_TIPLERI = ['Kuru Kimyevi Toz (KKT)', 'CO2', 'Köpük', 'Su', 'Diğer'];
// TS 11748: yıllık bakım periyodu; basınçlı kap hidrostatik testi tipik olarak 4 yılda bir.
const YANGIN_TUPU_YILLIK_BAKIM_GUN = 365;
const YANGIN_TUPU_HIDROSTATIK_TEST_GUN = 1460;

// Saha kontrol listesi (madde bazlı Uygun/Uygun Değil/İlgili Değil) —
// serbest metin "Bulgular" alanının yerine kullanıcı isteğiyle eklendi.
const YANGIN_TUPU_KONTROL_CEVAP_SECENEKLERI = ['Uygun', 'Uygun Değil', 'İlgili Değil'];
const YANGIN_TUPU_KONTROL_SORULARI = [
  { id: 'ulasim', soru: 'Yangın tüpüne kolayca ulaşılabiliyor mu?' },
  { id: 'onEngel', soru: 'Önünde engel yok mu?' },
  { id: 'sabitleme', soru: 'Yangın tüpü uygun şekilde sabitlenmiş mi?' },
  { id: 'fizikselDurum', soru: 'Yangın tüpünün fiziksel durumu iyi mi?' },
  { id: 'paslanmaHasar', soru: 'Tüp üzerinde paslanma veya ciddi hasar yok mu?' },
  { id: 'hortumNozul', soru: 'Hortum ve nozul sağlam mı?' },
  { id: 'emniyetPimi', soru: 'Emniyet pimi mevcut mu?' },
  { id: 'muhurPlomba', soru: 'Mühür/plomba sağlam mı?' },
  { id: 'manometre', soru: 'Manometre mevcut ve okunabilir durumda mı?' },
  { id: 'basincGostergesi', soru: 'Basınç göstergesi uygun seviyede mi?' },
  { id: 'kullanimTalimati', soru: 'Kullanım talimatı okunabilir durumda mı?' },
  { id: 'etiketlerMevcut', soru: 'Yangın tüpü üzerindeki etiketler mevcut mu?' },
  { id: 'bakimEtiketi', soru: 'Bakım etiketi mevcut mu?' },
  { id: 'bakimTarihiUygun', soru: 'Bakım tarihi uygun mu?' },
  { id: 'yerIsaretleme', soru: 'Yangın tüpünün bulunduğu yer uygun şekilde işaretlenmiş mi?' },
  { id: 'ortamUygunlugu', soru: 'Tüpün bulunduğu ortam açısından uygun durumda mı?' }
];

// Md.11: Söndürme/Kurtarma/Koruma ekiplerinin her biri için tehlike sınıfına göre bu sayıya
// kadar her çalışan grubunda en az 1 destek elemanı.
const MUDAHALE_EKIP_ORANI = { 'Çok Tehlikeli': 30, 'Tehlikeli': 40, 'Az Tehlikeli': 50 };
// Md.19 (İlkyardım Yönetmeliği): İlkyardımcı sayısı oranı.
const ILKYARDIM_ORANI = { 'Çok Tehlikeli': 10, 'Tehlikeli': 15, 'Az Tehlikeli': 20 };
// Md.13/2: Acil durum planı yenileme süresi (yıl).
const PLAN_YENILEME_YILI = { 'Çok Tehlikeli': 2, 'Tehlikeli': 4, 'Az Tehlikeli': 6 };

function bugunIso() {
  return new Date().toISOString().slice(0, 10);
}

function gunEkle(tarihStr, gun) {
  const t = new Date((tarihStr || bugunIso()) + 'T00:00:00');
  t.setDate(t.getDate() + Number(gun || 0));
  // toISOString() UTC'ye çevirir; UTC+3'te yerel gece yarısı bir gün geri kayar.
  return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
}

function gunFarkiHesapla(tarihStr, referansStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tarihStr || '')) return null;
  const hedef = new Date(tarihStr + 'T00:00:00');
  const referans = new Date((referansStr || bugunIso()) + 'T00:00:00');
  return Math.ceil((hedef - referans) / 86400000);
}

// Tarihe göre durum türetir: süresi geçmişse Gecikmiş, 30 gün içindeyse Yaklaşıyor,
// aksi halde verilen temel durum korunur. Tamamlandı/İptal gibi "kapanmış" durumlar hiç değişmez.
function durumTuret(tarihStr, temelDurum, kapanmisDurumlar) {
  const kapanmis = kapanmisDurumlar || ['Tamamlandı', 'İptal'];
  if (kapanmis.includes(temelDurum)) return temelDurum;
  const fark = gunFarkiHesapla(tarihStr);
  if (fark === null) return temelDurum;
  if (fark < 0) return 'Gecikmiş';
  if (fark <= 30) return 'Yaklaşıyor';
  return temelDurum;
}

function sonrakiNoUret(onEk, mevcutListe, alanAdi) {
  let maks = 0;
  mevcutListe.forEach(item => {
    const m = String(item[alanAdi] || '').match(/(\d+)$/);
    if (m) maks = Math.max(maks, parseInt(m[1], 10));
  });
  // "YD01", "GVB01" biçimi (kullanıcı isteği: "ade yerine her ekipman için
  // ayrı isimli ekipman no olsun") — önek + boşluksuz + 2 haneli sıfır
  // dolgulu sayı, yanginTupuSonrakiNoUret ile aynı kalıp. Eski "ADE 5" gibi
  // kayıtlar da aynı düzenli ifadeyle (sondaki rakamlar) doğru okunduğu
  // için numaralandırma bozulmaz.
  return onEk + String(maks + 1).padStart(2, '0');
}

// Yangın tüpleri sahadaki fiziksel etiketlerle aynı biçimde numaralanır
// (kullanıcı isteği): "YSC01", "YSC02" — boşluksuz, 2 haneli sıfırla dolgu.
function yanginTupuSonrakiNoUret(mevcutListe) {
  let maks = 0;
  mevcutListe.forEach(item => {
    const m = String(item.tupNo || '').match(/(\d+)$/);
    if (m) maks = Math.max(maks, parseInt(m[1], 10));
  });
  return 'YSC' + String(maks + 1).padStart(2, '0');
}

// ---- Uygunluk Değerlendirmesi hesaplamaları (Md.11, Md.19) ----

function gerekliMudahaleEkibiSayisi(tehlikeSinifi, calisanSayisi) {
  const sayi = Math.max(0, Number(calisanSayisi || 0));
  if (sayi <= 0) return 0;
  // Md.11/5: 10'dan az çalışanı olan işyerlerinde ekiplerin tamamı için en az 1 kişi yeterlidir.
  if (sayi < 10) return 1;
  const oran = MUDAHALE_EKIP_ORANI[tehlikeSinifi] || MUDAHALE_EKIP_ORANI['Az Tehlikeli'];
  return Math.max(1, Math.ceil(sayi / oran));
}

function gerekliIlkyardimciSayisi(tehlikeSinifi, calisanSayisi) {
  const sayi = Math.max(0, Number(calisanSayisi || 0));
  if (sayi <= 0) return 0;
  const oran = ILKYARDIM_ORANI[tehlikeSinifi] || ILKYARDIM_ORANI['Az Tehlikeli'];
  return Math.max(1, Math.ceil(sayi / oran));
}

function ekipGereksinimiHesapla(tehlikeSinifi, calisanSayisi) {
  const mudahale = gerekliMudahaleEkibiSayisi(tehlikeSinifi, calisanSayisi);
  return {
    tehlikeSinifi,
    calisanSayisi: Math.max(0, Number(calisanSayisi || 0)),
    gereksinimler: {
      'Söndürme': mudahale,
      'Kurtarma': mudahale,
      'Koruma': mudahale,
      'İlk Yardım': gerekliIlkyardimciSayisi(tehlikeSinifi, calisanSayisi)
    },
    planYenilemeYili: PLAN_YENILEME_YILI[tehlikeSinifi] || PLAN_YENILEME_YILI['Az Tehlikeli']
  };
}

// Kullanıcı isteği: "ekipleri yüklediğim halde uygunluk değerlendirmesinde
// görünmüyor" — Excel'den içe aktarılan kayıtlarda ekipTuru "Söndürme
// Ekibi", "söndürme", baştaki/sondaki boşluklu vb. küçük farklarla
// gelebiliyor; aşağıdaki uygunluk hesapları eskiden TAM eşleşme (===)
// arıyordu, bu farklar sayımı sıfırda bırakıyordu. Artık büyük/küçük
// harf, baştaki/sondaki boşluk ve sondaki "Ekibi" ekinden bağımsız
// karşılaştırılıyor.
function _ekipTuruNormallestir(tur) {
  return String(tur || '').trim().toLocaleUpperCase('tr').replace(/\s+EKİBİ$/, '').replace(/\s+/g, ' ').trim();
}

function ekipUygunlugunuDegerlendir(gereksinim, atananSayilar) {
  const turler = ['Söndürme', 'Kurtarma', 'Koruma', 'İlk Yardım'];
  const satirlar = turler.map(tur => {
    const gerekli = gereksinim.gereksinimler[tur] || 0;
    const atanan = atananSayilar[tur] || 0;
    const eksik = Math.max(0, gerekli - atanan);
    return { tur, gerekli, atanan, eksik, uygun: gerekli === 0 ? true : atanan >= gerekli };
  });
  return { satirlar, uygun: satirlar.every(s => s.uygun), toplamEksik: satirlar.reduce((t, s) => t + s.eksik, 0) };
}

// Toplam sayı yeterli olsa bile tüm ekip üyeleri tek vardiyada toplanmışsa diğer vardiyalarda
// müdahale kapasitesi sıfır olabilir; bu yüzden fiilen kullanılan her vardiya ayrıca kontrol edilir.
function vardiyaUygunlugunuDegerlendir(gereksinim, ekipUyeleri) {
  const turler = ['Söndürme', 'Kurtarma', 'Koruma', 'İlk Yardım'];
  const aktifUyeler = ekipUyeleri.filter(u => u.durum !== 'İptal');
  const kullanilanVardiyalar = Array.from(new Set(aktifUyeler.map(u => u.vardiya || 'Genel'))).filter(v => v !== 'Genel');

  if (kullanilanVardiyalar.length === 0) {
    return { gecerliMi: false, kullanilanVardiyalar: [], satirlar: [], uygun: true };
  }

  const satirlar = turler.map(tur => {
    const gerekli = gereksinim.gereksinimler[tur] || 0;
    const vardiyaDurumu = kullanilanVardiyalar.map(vardiya => {
      const atanan = aktifUyeler.filter(u => _ekipTuruNormallestir(u.ekipTuru) === _ekipTuruNormallestir(tur) && (u.vardiya || 'Genel') === vardiya).length;
      return { vardiya, atanan, uygun: gerekli === 0 ? true : atanan >= 1 };
    });
    return { tur, gerekli, vardiyaDurumu, uygun: gerekli === 0 ? true : vardiyaDurumu.every(v => v.uygun) };
  });

  return { gecerliMi: true, kullanilanVardiyalar, satirlar, uygun: satirlar.every(s => s.uygun) };
}

// ---- Kayıt fabrikaları ----

function ekipUyesiOlustur(veriler) {
  const egitimTarihi = veriler.egitimTarihi || '';
  const gecerlilikTarihi = veriler.gecerlilikTarihi || (egitimTarihi ? gunEkle(egitimTarihi, 365) : '');
  return {
    id: veriler.id || rastgeleId(),
    atamaNo: veriler.atamaNo || '',
    personelId: veriler.personelId || '',
    personelAdi: (veriler.personelAdi || '').trim(),
    sicilNo: (veriler.sicilNo || '').trim(),
    bolum: (veriler.bolum || '').trim(),
    // Kullanıcı isteği: "fabrikadaki görevi" — kişinin işyerindeki asıl
    // unvanı/görevi (bkz. personel modülü personel.gorev), acil durumdaki
    // görevinden (ekipTuru) ayrı, bilgi amaçlı bir alan.
    gorev: (veriler.gorev || '').trim(),
    ekipTuru: veriler.ekipTuru || 'Destek',
    rol: veriler.rol || 'Ekip Üyesi',
    vardiya: veriler.vardiya || 'Genel',
    telefon: (veriler.telefon || '').trim(),
    egitimTarihi,
    gecerlilikTarihi,
    durum: veriler.durum || 'Aktif',
    notlar: (veriler.notlar || '').trim(),
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}

function ekipmanOlustur(veriler) {
  // Kullanıcı isteği: "kontroller 3 aylık olsun" -- varsayılan periyot 90 gün.
  const periyotGun = Number(veriler.periyotGun || 90);
  const sonKontrol = veriler.sonKontrol || '';
  const sonrakiKontrol = veriler.sonrakiKontrol || (sonKontrol ? gunEkle(sonKontrol, periyotGun) : '');
  const tur = veriler.tur || 'Diğer';
  const sorular = EKIPMAN_KONTROL_SORULARI[tur] || [];
  return {
    id: veriler.id || rastgeleId(),
    ekipmanNo: veriler.ekipmanNo || '',
    tur,
    ad: (veriler.ad || '').trim() || veriler.tur || 'Diğer',
    bolum: (veriler.bolum || '').trim(),
    lokasyon: (veriler.lokasyon || '').trim(),
    periyotGun,
    sonKontrol,
    sonrakiKontrol,
    sorumlu: (veriler.sorumlu || '').trim(),
    durum: veriler.durum || 'Aktif',
    // "Bulgular" serbest metni korunuyor — üzerine türe özgü madde bazlı
    // kontrol listesi eklendi (bkz. EKIPMAN_KONTROL_SORULARI), ikisi bir arada.
    bulgular: (veriler.bulgular || '').trim(),
    // Son kontrolü fiilen kimin yaptığı (kullanıcı isteği: "kontrolü kim
    // yaptı bunların girilmesi lazım").
    kontrolEden: (veriler.kontrolEden || '').trim(),
    kontrolCevaplari: sorular.reduce((acc, s) => {
      const cevap = (veriler.kontrolCevaplari || {})[s.id];
      acc[s.id] = EKIPMAN_KONTROL_CEVAP_SECENEKLERI.includes(cevap) ? cevap : '';
      return acc;
    }, {}),
    notlar: (veriler.notlar || '').trim(),
    // Kontrol sırasında çekilen kanıt/bulgu fotoğrafı (opsiyonel).
    fotoUrl: veriler.fotoUrl || '',
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString(),

    // Saha Dijital Haritası köprüsü — bkz. modules/harita.
    haritaTesisId: veriler.haritaTesisId || '',
    haritaX: veriler.haritaX !== undefined ? veriler.haritaX : '',
    haritaY: veriler.haritaY !== undefined ? veriler.haritaY : ''
  };
}

function yanginTupuOlustur(veriler) {
  const yillikBakimTarihi = veriler.yillikBakimTarihi || '';
  const hidrostatikTestTarihi = veriler.hidrostatikTestTarihi || '';
  const sonrakiYillikBakim = veriler.sonrakiYillikBakim || (yillikBakimTarihi ? gunEkle(yillikBakimTarihi, YANGIN_TUPU_YILLIK_BAKIM_GUN) : '');
  const sonrakiHidrostatikTest = veriler.sonrakiHidrostatikTest || (hidrostatikTestTarihi ? gunEkle(hidrostatikTestTarihi, YANGIN_TUPU_HIDROSTATIK_TEST_GUN) : '');
  return {
    id: veriler.id || rastgeleId(),
    tupNo: veriler.tupNo || '',
    tip: veriler.tip || 'Kuru Kimyevi Toz (KKT)',
    kapasite: (veriler.kapasite || '').trim(),
    bolum: (veriler.bolum || '').trim(),
    lokasyon: (veriler.lokasyon || '').trim(),
    // Üretici etiketindeki seri numarası — tüpNo'dan (bizim iç takip
    // numaramız) farklı, aynı tüpün tekrar kaydedilmesini engellemek için
    // kullanılır (bkz. yanginTupuSeriNumarasiIleBul).
    seriNumarasi: (veriler.seriNumarasi || '').trim(),
    uretici: (veriler.uretici || '').trim(),
    uretimTarihi: (veriler.uretimTarihi || '').trim(),
    doluTarihi: veriler.doluTarihi || '',
    yillikBakimTarihi,
    sonrakiYillikBakim,
    hidrostatikTestTarihi,
    sonrakiHidrostatikTest,
    sorumlu: (veriler.sorumlu || '').trim(),
    durum: veriler.durum || 'Aktif',
    // "Bulgular" serbest metni yerine madde bazlı kontrol listesi kullanılıyor
    // (bkz. YANGIN_TUPU_KONTROL_SORULARI) — alan eski kayıtlarla geriye dönük
    // uyumluluk için korunuyor, formda artık gösterilmiyor.
    bulgular: (veriler.bulgular || '').trim(),
    kontrolCevaplari: YANGIN_TUPU_KONTROL_SORULARI.reduce((acc, s) => {
      const cevap = (veriler.kontrolCevaplari || {})[s.id];
      acc[s.id] = YANGIN_TUPU_KONTROL_CEVAP_SECENEKLERI.includes(cevap) ? cevap : '';
      return acc;
    }, {}),
    notlar: (veriler.notlar || '').trim(),
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString(),

    // Saha Dijital Haritası köprüsü — bkz. modules/harita.
    haritaTesisId: veriler.haritaTesisId || '',
    haritaX: veriler.haritaX !== undefined ? veriler.haritaX : '',
    haritaY: veriler.haritaY !== undefined ? veriler.haritaY : ''
  };
}

function tatbikatOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    tatbikatNo: veriler.tatbikatNo || '',
    baslik: (veriler.baslik || '').trim(),
    tur: veriler.tur || 'Diğer',
    planlananTarih: veriler.planlananTarih || '',
    gerceklesmeTarihi: veriler.gerceklesmeTarihi || '',
    lokasyon: (veriler.lokasyon || '').trim(),
    katilimciSayisi: Number(veriler.katilimciSayisi || 0),
    bulgular: (veriler.bulgular || '').trim(),
    aksiyonlar: (veriler.aksiyonlar || '').trim(),
    durum: veriler.durum || (veriler.gerceklesmeTarihi ? 'Tamamlandı' : 'Planlandı'),

    // Performans göstergeleri (madde 17) — tatbikat gerçekleştikten sonra
    // dakika cinsinden ölçülen süreler; boşsa henüz ölçülmemiş demektir.
    alarmVerilmeSuresi: (veriler.alarmVerilmeSuresi || '').trim(),
    ilkMudahaleSuresi: (veriler.ilkMudahaleSuresi || '').trim(),
    tahliyeSuresi: (veriler.tahliyeSuresi || '').trim(),
    toplanmaSuresi: (veriler.toplanmaSuresi || '').trim(),
    sayimSuresi: (veriler.sayimSuresi || '').trim(),
    eksikPersonelTespitSuresi: (veriler.eksikPersonelTespitSuresi || '').trim(),
    itfaiyeErisimSuresi: (veriler.itfaiyeErisimSuresi || '').trim(),
    haberlesmeSuresi: (veriler.haberlesmeSuresi || '').trim(),
    ekipUlasmaSuresi: (veriler.ekipUlasmaSuresi || '').trim(),

    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}

function senaryoOlustur(veriler) {
  const ekd = veriler.enKotuSenaryoDetay || {};
  return {
    id: veriler.id || rastgeleId(),
    senaryoNo: veriler.senaryoNo || '',
    baslik: (veriler.baslik || '').trim(),
    tur: veriler.tur || 'Diğer',
    kategori: SENARYO_KATEGORILERI.includes(veriler.kategori) ? veriler.kategori : '',
    bolum: (veriler.bolum || '').trim(),
    lokasyon: (veriler.lokasyon || '').trim(),
    tetikleyici: (veriler.tetikleyici || '').trim(),
    mudahaleAdimlari: Array.isArray(veriler.mudahaleAdimlari) ? veriler.mudahaleAdimlari : katilimcilariAyir(veriler.mudahaleAdimlari),
    sorumluEkip: veriler.sorumluEkip || 'Koordinasyon',
    gozdenGecirmeTarihi: veriler.gozdenGecirmeTarihi || '',
    durum: veriler.durum || 'Aktif',
    notlar: (veriler.notlar || '').trim(),

    // Senaryo kartı (Profesyonel Acil Durum Planı promptu madde 6) — hepsi
    // opsiyonel serbest metin; hazır kütüphaneden kopyalanan kartlarda dolu
    // gelir, manuel eklenen kayıtlarda boş başlar.
    olayinTanimi: (veriler.olayinTanimi || '').trim(),
    muhtemelNedenler: (veriler.muhtemelNedenler || '').trim(),
    ilkBelirtiTespit: (veriler.ilkBelirtiTespit || '').trim(),
    tehlikeKaynaklari: (veriler.tehlikeKaynaklari || '').trim(),
    etkilenecekAlanlar: (veriler.etkilenecekAlanlar || '').trim(),
    etkiInsan: (veriler.etkiInsan || '').trim(),
    etkiCevre: (veriler.etkiCevre || '').trim(),
    etkiTesis: (veriler.etkiTesis || '').trim(),
    ilk1Dk: (veriler.ilk1Dk || '').trim(),
    ilk5Dk: (veriler.ilk5Dk || '').trim(),
    ilk15Dk: (veriler.ilk15Dk || '').trim(),
    alarmIhbarYontemi: (veriler.alarmIhbarYontemi || '').trim(),
    tahliyeKarari: SENARYO_TAHLIYE_KARARLARI.includes(veriler.tahliyeKarari) ? veriler.tahliyeKarari : '',
    toplanmaAlani: (veriler.toplanmaAlani || '').trim(),
    guvenliDurdurmaNoktalari: Array.isArray(veriler.guvenliDurdurmaNoktalari) ? veriler.guvenliDurdurmaNoktalari : katilimcilariAyir(veriler.guvenliDurdurmaNoktalari),
    kkd: Array.isArray(veriler.kkd) ? veriler.kkd : katilimcilariAyir(veriler.kkd),
    mudahaleSiniri: (veriler.mudahaleSiniri || '').trim(),
    disKurumBildirimi: (veriler.disKurumBildirimi || '').trim(),

    // Risk bazlı acil durum matrisi (madde 7) — nitel seviye (SENARYO_ONEM_SEVIYELERI).
    olasilik: veriler.olasilik || '',
    siddet: veriler.siddet || '',
    yayilim: veriler.yayilim || '',
    insanEtkisi: veriler.insanEtkisi || '',
    cevreselEtki: veriler.cevreselEtki || '',
    kritiklik: veriler.kritiklik || '',
    oncelik: veriler.oncelik || '',

    // En kötü makul senaryo (madde 13).
    enKotuSenaryoMu: !!veriler.enKotuSenaryoMu,
    enKotuSenaryoDetay: {
      etkiAlani: (ekd.etkiAlani || '').trim(),
      tahliyeAlaniBuyuklugu: (ekd.tahliyeAlaniBuyuklugu || '').trim(),
      siginmaAlani: (ekd.siginmaAlani || '').trim(),
      ruzgarYonu: (ekd.ruzgarYonu || '').trim(),
      komsuTesisEtkisi: (ekd.komsuTesisEtkisi || '').trim(),
      cevreEtkisi: (ekd.cevreEtkisi || '').trim(),
      disEkipIhtiyaci: (ekd.disEkipIhtiyaci || '').trim(),
      kritikEkipmanDurdurma: (ekd.kritikEkipmanDurdurma || '').trim(),
      haberlesmePlani: (ekd.haberlesmePlani || '').trim(),
      personelSayimPlani: (ekd.personelSayimPlani || '').trim()
    },

    sablonKaynagiId: veriler.sablonKaynagiId || null,
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}

function katilimcilariAyir(metin) {
  return String(metin || '').split(/[;,\n]+/).map(k => k.trim()).filter(Boolean);
}

function bosPlanOlustur() {
  return {
    hazirlanmaTarihi: bugunIso(),
    gecerlilikTarihi: '',
    hazirlayan: '', hazirlayanUnvan: '',
    onaylayan: '', onaylayanUnvan: '',
    olasiAcilDurumlar: [],
    onleyiciTedbirler: '',
    tahliyePlani: '',
    toplanmaYerleri: [],
    disKurumIletisim: '',
    uyariSistemleri: '',
    ozelRiskBolgeleri: [],
    notlar: '',
    revizyonGecmisi: []
  };
}

// ---- Doküman Kontrol / Revizyon Geçmişi (madde 2) ----

function revizyonKaydiOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    revizyonNo: veriler.revizyonNo || '',
    tarih: veriler.tarih || bugunIso(),
    degisiklikOzeti: (veriler.degisiklikOzeti || '').trim(),
    hazirlayan: (veriler.hazirlayan || '').trim(),
    onaylayan: (veriler.onaylayan || '').trim()
  };
}

// ---- Tesis Bilgi Formu ----

// Madde 3 (Tesis Hakkında Bilgiler) — tek obje, plan gibi firma başına bir
// kayıt (bkz. service.js tesisBilgiGetirVeyaOlustur/tesisBilgiGuncelle...,
// repository.js tesisBilgiGetirRepo/tesisBilgiKaydetRepo).
function _bosTeknikUnsur() {
  return { varMi: false, detay: '' };
}

const TESIS_TEKNIK_UNSUR_ANAHTARLARI = [
  'elektrikAnaDagitim', 'trafo', 'jenerator', 'dogalgaz', 'lpg', 'yakitTanki', 'kimyasalTank',
  'basincliKap', 'buharSistemi', 'kompresor', 'kazan', 'yanginPompasi', 'sprinkler',
  'yanginDolabiSistemi', 'yanginSondurmeCihazi', 'yanginAlgilamaSistemi', 'gazAlgilamaSistemi',
  'acilDurumAlarmSistemi', 'acilAydinlatma', 'yonlendirmeLevhalari', 'kacisMerdiveni', 'toplanmaAlaniIsaretleme'
];

function bosTesisBilgiOlustur() {
  const teknikUnsurlar = {};
  TESIS_TEKNIK_UNSUR_ANAHTARLARI.forEach(anahtar => { teknikUnsurlar[anahtar] = _bosTeknikUnsur(); });
  return {
    tesisTurleri: [],
    adres: '',
    faaliyetKonusu: '',
    vardiyaSayisi: '',
    vardiyaBasiCalisanSayisi: '',
    altIsverenSayisi: '',
    ziyaretciSayisiGunlukMaks: '',
    binaSayisi: '',
    katSayisi: '',
    acikSahaAlanlari: '',
    kapaliAlanlar: '',
    geceCalismaVarMi: false,
    teknikUnsurlar,
    personelKategorileri: { kadrolu: '', taseron: '', ziyaretci: '', sofor: '', stajyer: '', gecici: '', engelli: '', geceVardiyasi: '' },
    vardiyaTablosu: [],
    ozelIhtiyaclarNotu: '',
    iletisimZinciri: []
  };
}

// ---- Hazır Acil Durum Planı Şablonları ----

// İşyeri türüne göre başlangıç içeriği: seçilen şablon yalnızca "Olası Acil
// Durumlar", "Önleyici Tedbirler", "Tahliye Planı", "Uyarı Sistemleri" ve
// "Dış Kurum İletişim Bilgileri" alanlarını doldurur (bkz. service.js
// acilDurumPlanSablonUygula). Tarih, hazırlayan/onaylayan, toplanma yerleri
// (zaten ekipman verisinden türetiliyor), özel risk bölgeleri ve notlar
// işyerine özgü olduğundan şablondan etkilenmez. Metinler başlangıç
// önerisidir; işyerine göre düzenlenmelidir.
// Tüm şablonların tahliye planına eklenen, ekip yapısına (EKIP_TURLERI) bağlı
// ortak "ekip görevleri" ve tatbikat notu — sektöre özgü değildir, bu yüzden
// tek yerden tanımlanıp her şablonun sonuna eklenir.
const _EKIP_GOREVLERI_METNI = '\n\nEKİPLERİN GÖREVLERİ:\n- Koordinasyon Ekibi: Acil durumu yönetir, dış kurumlarla (itfaiye, ambulans, AFAD) irtibatı sağlar, tahliye kararını verir ve tüm ekiplerden gelen bilgiyi birleştirerek yönlendirme yapar.\n- Söndürme Ekibi: İlk müdahale söndürme ekipmanlarını (yangın tüpü/dolabı) kullanarak yangını büyümeden kontrol altına almaya çalışır; büyüyen yangında itfaiye gelene kadar alanı gözlemler ve bilgi aktarır.\n- Kurtarma Ekibi: Mahsur kalan/yaralı personelin güvenli şekilde tahliyesinden sorumludur; eğitimsiz personelin tehlikeli alana girmesini engeller.\n- Koruma Ekibi: Tesis/ekipman güvenliğini, kritik sistemlerin (enerji, gaz, su) kapatılmasını ve tahliye edilen alanın kontrolsüz girişe kapatılmasını sağlar.\n- İlk Yardım Ekibi: Yaralılara ilk müdahaleyi yapar, ambulans gelene kadar durumu stabilize etmeye çalışır, toplanma alanında sağlık noktası kurar.\n- Destek Ekibi: Personel sayımı, iletişim, kayıt tutma ve diğer ekiplerin ihtiyaç duyduğu lojistik desteği sağlar.\n\nTATBİKAT VE GÖZDEN GEÇİRME: Bu plan yılda en az bir kez tatbikatla test edilir; tatbikat sonrası bulgular tutanağa geçirilir ve gerekiyorsa plan revize edilir. Yaşanan her gerçek olay da planın etkinliğinin gözden geçirilmesi için ayrıca değerlendirilir.';

const ACIL_DURUM_PLAN_SABLONLARI = [
  {
    id: 'ofis',
    ad: 'Ofis / İdari Bina',
    aciklama: 'Üretim/saha alanı olmayan büro, çağrı merkezi, idari bina vb.',
    olasiAcilDurumlar: [
      'Yangın (elektrik kontağı, mutfak/çay ocağı)',
      'Deprem',
      'Gaz sızıntısı (mutfak/kombi dairesi)',
      'Elektrik kesintisi',
      'Su baskını (sıhhi tesisat arızası, çatı sızıntısı)',
      'Asansörde mahsur kalma',
      'Bina tahliyesini gerektiren dış tehdit (bomba ihbarı, şüpheli paket)',
      'Yangın merdiveni/kaçış yolunun tıkanması',
      'Bina dışındaki bir olayın (yangın, patlama) binayı etkilemesi',
      'Ani sağlık sorunu (kalp krizi, bayılma, düşme)'
    ],
    onleyiciTedbirler: 'YANGIN ÖNLEME:\n- Duman dedektörü, yangın alarm butonu ve yangın söndürme tüplerinin periyodik bakım/kontrolü aksatılmadan yaptırılır, kontrol etiketleri güncel tutulur.\n- Elektrik pano ve tesisatının periyodik topraklama/kaçak akım kontrolleri yaptırılır; çoklu priz/uzatma kablosu kullanımı sınırlandırılır.\n- Mutfak/çay ocağında gaz kaçağı algılama sensörü bulunur, kombi dairesi yılda bir kez yetkili serviste bakımdan geçirilir.\n- Sigara içme yalnızca belirlenmiş açık alanlarda, sönmüş izmarit için metal kül tablasıyla yapılır.\n\nKAÇIŞ YOLLARI VE ERİŞİM:\n- Kaçış yolları, merdivenler ve acil çıkış kapıları hiçbir zaman malzeme/kutu ile kapatılmaz; aylık kontrol formuyla denetlenir.\n- Acil çıkış kapıları içeriden kilitlenmez, panik barlı açılım sağlanır; yönlendirme ve acil aydınlatma armatürleri çalışır durumda tutulur.\n\nDEPREM VE YAPISAL GÜVENLİK:\n- Dolap, raf ve ağır ekipmanlar devrilmeyi önleyecek şekilde duvara sabitlenir.\n- Deprem çantası (su, ilk yardım malzemesi, düdük, fener) bulundurulur; masa altı güvenli alan bilgilendirmesi tüm katlarda asılı tutulur.\n\nDİĞER:\n- Asansör bakım sözleşmesiyle periyodik kontrolden geçirilir, arıza/mahsur kalma durumunda acil çağrı butonu düzenli test edilir.\n- Şüpheli paket/kişi bildirimi için resepsiyon/güvenlik personeli görevlendirilir, süreç tüm personele duyurulur.\n\nTEHLİKEYE ÖZEL ÖNLEMLER:\n\nYangın: Yangın söndürme tüpleri her katta görünür ve erişilebilir yerde bulundurulur; personel A/B/C sınıfı yangınlarda hangi söndürücünün kullanılacağı konusunda bilgilendirilir.\n\nDeprem: "Çök-Kapan-Tutun" tatbikatları düzenli yapılır, cam kenarlarından ve raflardan uzak durulması gerektiği personele hatırlatılır.\n\nGaz Sızıntısı: Gaz kokusu alındığında elektrik anahtarına/prize dokunulmaz, ortam havalandırılır ve derhal bina dışına çıkılıp doğalgaz acil hattı aranır.\n\nAsansörde Mahsur Kalma: Personel asansör kabinindeki acil çağrı butonunu kullanır, sakin kalır; müdahale ekibi asansör bakım firmasını arar.\n\nDış Tehdit (Bomba İhbarı/Şüpheli Paket): Şüpheli cisme dokunulmaz, alan boşaltılıp derhal güvenlik/polise bilgi verilir.',
    tahliyePlani: '1) ALARM VE İLK MÜDAHALE: Alarmın duyulması veya anonsun yapılmasıyla birlikte tüm personel çalışmayı bırakır, mümkünse elektrikli cihazları güvenli şekilde kapatır. Olayı fark eden ilk kişi, güvenliyse yangın alarm butonuna basar ve Söndürme Ekibine haber verir.\n\n2) TAHLİYE: Personel panik yapmadan, koşmadan, en yakın acil çıkışa yönlendirilir. Asansör KESİNLİKLE kullanılmaz; merdivenler tek sıra ve sağdan yürünerek kullanılır. Hareket kısıtlı çalışanlar için önceden görevlendirilmiş refakatçi personel devreye girer.\n\n3) TOPLANMA VE SAYIM: Kat sorumluları kendi katlarındaki personeli sayarak toplanma alanına yönlendirir, kimsenin kalmadığını (tuvalet, toplantı odası dahil) kontrol eder. Toplanma alanında personel sayımı tamamlanıp Acil Durum Koordinatörüne bildirilir.\n\n4) ARAMA VE ÖZEL DURUMLAR: Eksik personel varsa son bilinen konumuyla birlikte durum derhal itfaiyeye/arama-kurtarma ekibine bildirilir; eğitimsiz personel hiçbir koşulda bina içine geri girmez.\n\n5) DEĞERLENDİRME VE YENİDEN GİRİŞ: Yetkili makamlar (itfaiye/bina yönetimi) binanın güvenli olduğunu onaylamadan personel binaya geri alınmaz. Acil Durum Koordinatörü olay sonrası kısa bir değerlendirme yapar ve gerekiyorsa planı günceller.' + _EKIP_GOREVLERI_METNI,
    uyariSistemleri: 'Sesli/ışıklı yangın alarm sistemi, kat anons sistemi, kat sorumluları tarafından sözlü uyarı, toplu bilgilendirme (SMS/mesajlaşma grubu), resepsiyon/güvenlikten dahili telefon duyurusu.',
    disKurumIletisim: 'Acil Çağrı Merkezi (İtfaiye / Ambulans / Polis / Jandarma): 112\nAFAD: 122\nDoğalgaz Acil: 187\n[En yakın hastane adı ve telefonu]\n[Bina yönetimi / güvenlik telefonu]'
  },
  {
    id: 'uretim',
    ad: 'Üretim / Fabrika (Genel)',
    aciklama: 'Makine/ekipman kullanılan imalat, montaj veya işleme tesisi.',
    olasiAcilDurumlar: [
      'Yangın (makine/motor kaynaklı, kısa devre, kaynak-kesme işleri)',
      'Patlama (basınçlı kap, tozlu/gaz ortam)',
      'Ağır iş kazası (makineye sıkışma, ezilme, kesilme)',
      'Kimyasal madde dökülmesi/sızıntısı',
      'Elektrik çarpması',
      'Vinç/kaldırma ekipmanı arızası veya yük düşmesi',
      'Deprem',
      'Basınçlı hava/buhar hattı patlaması',
      'Yanıcı toz birikimi kaynaklı patlama',
      'Kapalı üretim alanında zehirli/boğucu gaz birikimi'
    ],
    onleyiciTedbirler: 'MAKİNE VE EKİPMAN GÜVENLİĞİ:\n- Makine koruyucuları ve acil durdurma butonları çalışır durumda tutulur, periyodik kontrolden geçirilir.\n- Bakım/onarım öncesi enerji kesme ve kilitleme-etiketleme (LOTO) prosedürü uygulanır.\n\nYANGIN VE PATLAMA ÖNLEME:\n- Kaynak/kesme işleri, parlayıcı-patlayıcı madde bulunan bölgelerden uzakta, yangın gözcüsü ve iş izni sistemiyle yapılır.\n- Tozlu/parlayıcı ortamlarda lokal egzoz, topraklama ve statik elektrik önlemleri uygulanır.\n- Üretim hatlarına yakın yerlerde yangın dolabı/tüpü ve göz duşu bulundurulur, erişim yolları açık tutulur.\n\nELEKTRİK GÜVENLİĞİ:\n- Elektrik pano ve tesisatının periyodik bakım/termal kamera kontrolleri yapılır, ısınma bulguları anında raporlanır.\n\nKALDIRMA EKİPMANLARI:\n- Vinç, forklift gibi kaldırma ekipmanları yıllık periyodik kontrole tabi tutulur, günlük kontrol formuyla operatör tarafından denetlenir.\n- Yük altında/yakınında durulmaz, azami yük kapasitesi asla aşılmaz.\n\nİŞ ORGANİZASYONU:\n- Yeni/geçici personel işe başlamadan önce bölüm bazlı acil durum bilgilendirmesi alır.\n\nTEHLİKEYE ÖZEL ÖNLEMLER:\n\nYangın: Kaynak/kesme işlemi anında durdurulur, en yakın yangın dolabı/tüpü kullanılır; büyüyen yangında bölge tahliye edilip kapılar kapatılarak yayılım geciktirilir.\n\nPatlama: Duyulan anda personel makine/hatlardan uzaklaşıp yere yakın, kolon/duvar diplerine sığınır; ikinci bir patlama ihtimaline karşı bölgeye geri dönülmez.\n\nAğır İş Kazası (Sıkışma/Ezilme): Makine derhal acil durdurma butonuyla durdurulur, yaralı hareket ettirilmeden İlk Yardım ekibi ve ambulans çağrılır.\n\nKimyasal Dökülme: Etkilenen alan işaretlenip izole edilir, GBF\'de belirtilen müdahale talimatı uygulanır, gerekmedikçe temizlik girişiminde bulunulmaz.\n\nElektrik Çarpması: Kazazedeye dokunmadan önce enerji kesilir; enerji kesilemiyorsa yalıtkan bir cisimle müdahale edilir.',
    tahliyePlani: '1) ALARM VE İLK MÜDAHALE: Alarm/siren çalınca üretim hattı güvenli şekilde durdurulur (mümkünse acil durdurma butonuyla), enerji/gaz beslemesi vardiya amiri tarafından kesilir.\n\n2) TAHLİYE: Personel makine başındaki güvenli tahliye güzergâhından toplanma alanına yönlendirilir; forklift ve araçlar bu sırada kullanılmaz, yaya öncelikli hareket edilir.\n\n3) TOPLANMA VE SAYIM: Vardiya amirleri/ekip başları kendi bölümlerindeki personeli sayarak Acil Durum Koordinatörüne bildirir; kapalı alan/depo gibi kör noktalar ayrıca kontrol edilir.\n\n4) İLK YARDIM VE ARAMA: Yaralı varsa İlk Yardım ekibi derhal müdahale eder, gerekiyorsa ambulans çağrılır. Eksik personel için eğitimsiz kişiler tesise geri girmez, arama yalnızca kurtarma ekibi/itfaiye tarafından yapılır.\n\n5) YENİDEN BAŞLATMA: Vardiya amiri ve Acil Durum Koordinatörü onayı olmadan hiçbir hat/ekipman yeniden çalıştırılmaz; olay sonrası kök neden değerlendirmesi yapılır.' + _EKIP_GOREVLERI_METNI,
    uyariSistemleri: 'Fabrika geneli sesli siren, üretim hattı üzerindeki ikaz lambaları, anons sistemi, vardiya amirleri tarafından telsiz/sözlü uyarı.',
    disKurumIletisim: 'Acil Çağrı Merkezi (İtfaiye / Ambulans / Polis / Jandarma): 112\nAFAD: 122\nOSGB / İşyeri Hekimi: [telefon]\n[En yakın hastane adı ve telefonu]\n[En yakın itfaiye istasyonu adı ve telefonu]'
  },
  {
    id: 'insaat',
    ad: 'İnşaat Şantiyesi',
    aciklama: 'Yapı, altyapı veya taahhüt işlerinin yürütüldüğü şantiye sahası.',
    olasiAcilDurumlar: [
      'Yüksekten düşme (iskele, çatı, kat boşluğu)',
      'Kazı/istinat yapısı göçmesi',
      'Vinç/kule vinç devrilmesi veya yük düşmesi',
      'Elektrik çarpması (şantiye hattı, yer altı/üstü kablo)',
      'Yangın (kaynak-kesme işleri, yakıt/tüp depolama)',
      'Malzeme düşmesi',
      'Hava muhalefeti (fırtına, şiddetli yağış, don)',
      'Kalıp/iskele çökmesi',
      'Yer altı hizmet hattına (gaz/su/elektrik) kazı sırasında isabet',
      'Şantiye içi trafik kazası (araç-yaya çarpışması)'
    ],
    onleyiciTedbirler: 'KKD VE EĞİTİM:\n- Şantiyeye giriş için iş güvenliği eğitimi ve KKD (baret, emniyet kemeri, yansıtıcı yelek vb.) zorunluluğu uygulanır, turnike/kontrol noktasında denetlenir.\n- Yüksekte çalışma sertifikası olmayan personel yüksekte çalıştırılmaz.\n\nİSKELE VE YÜKSEKTE ÇALIŞMA:\n- İskele ve kalıp sistemleri kurulum sonrası yetkili kişi tarafından kontrol edilip onay etiketi asılmadan kullanıma açılmaz.\n- Platformlarda korkuluk, ara korkuluk ve eteklik bulunur; gerekli noktalarda yaşam hattı tesis edilir.\n\nKAZI VE İSTİNAT:\n- Kazı/istinat çalışmalarında şev/iksa uygunluğu proje ile denetlenir, kazı kenarına güvenlik şeridi ve bariyer konur.\n- Kazı öncesi yer altı hizmet hatları (gaz/su/elektrik) ilgili kurumlardan sorgulanır.\n\nKALDIRMA EKİPMANLARI:\n- Vinç/kule vinç günlük ve periyodik kontrole tabi tutulur, rüzgar hızı sınırının üzerinde çalışma durdurulur.\n\nATEŞLİ ÇALIŞMALAR:\n- Kaynak/kesme işleri için yangın gözcüsü ve iş izni sistemi uygulanır, yanıcı malzeme çalışma alanından uzaklaştırılır.\n\nHAVA KOŞULLARI:\n- Şiddetli hava koşullarında (fırtına, don, yoğun yağış) yüksekte/vinçli çalışma durdurulur; hava durumu takip prosedürü uygulanır.\n\nTEHLİKEYE ÖZEL ÖNLEMLER:\n\nYüksekten Düşme: Düşen kişiye dokunulmadan önce bilinç/nabız kontrol edilir, boyun/omurga sabitlenmeden hareket ettirilmez; İlk Yardım ekibi ve ambulans derhal çağrılır.\n\nKazı/İstinat Göçmesi: Göçük bölgesine giriş yasaklanır, ek göçük riski değerlendirilmeden kurtarma girişiminde bulunulmaz; itfaiye/AFAD arama-kurtarma ekibi çağrılır.\n\nVinç/Kule Vinç Devrilmesi: Yük altındaki alan derhal boşaltılır, vinç operatörüne ve çevredeki personele anons yapılır.\n\nElektrik Çarpması (Şantiye Hattı): Enerji ilgili dağıtım şirketi tarafından kesilmeden hat çevresine yaklaşılmaz.\n\nYangın (Kaynak/Yakıt): Yangın gözcüsü söndürme tüpüyle ilk müdahaleyi yapar, yakıt/tüp deposu bölgesindeki yangında derhal geniş çaplı tahliye yapılır.',
    tahliyePlani: '1) ALARM VE İLK MÜDAHALE: Alarm/düdük sinyaliyle birlikte tüm çalışma (kaynak, kazı, vinç, yüksekte çalışma) derhal durdurulur, ekipmanlar güvenli konuma alınır ve enerji kaynakları mümkünse kesilir.\n\n2) TAHLİYE: Personel en yakın güvenli güzergâhtan, kazı/yüksek alanlardan uzak durarak şantiye girişindeki toplanma alanına yönlendirilir.\n\n3) TOPLANMA VE SAYIM: Taşeron/ekip başları kendi personelini sayarak İSG uzmanına/şantiye şefine bildirir; iskele/kazı gibi kör noktalar ayrıca kontrol edilir.\n\n4) ARAMA-KURTARMA: Yaralı/mahsur kalan personel varsa derhal İlk Yardım ve kurtarma ekibi yönlendirilir, gerekiyorsa itfaiye/ambulans çağrılır; eğitimsiz personel tehlikeli alana girmez.\n\n5) YENİDEN BAŞLATMA: Şantiye şefi/İSG uzmanı onayı olmadan durdurulan çalışmalar yeniden başlatılmaz.' + _EKIP_GOREVLERI_METNI,
    uyariSistemleri: 'Şantiye geneli düdük/siren sinyali, şantiye şefliği anons sistemi, ekip başları tarafından telsiz uyarısı.',
    disKurumIletisim: 'Acil Çağrı Merkezi (İtfaiye / Ambulans / Polis / Jandarma): 112\nAFAD: 122\nOSGB / İşyeri Hekimi: [telefon]\n[En yakın hastane adı ve telefonu]\n[Elektrik dağıtım şirketi acil hattı]'
  },
  {
    id: 'depo',
    ad: 'Depo / Lojistik',
    aciklama: 'Palet/raf sistemli depolama, elleçleme ve sevkiyat tesisi.',
    olasiAcilDurumlar: [
      'Raf/istif çökmesi',
      'Forklift/istif makinesi kazası',
      'Yangın (ambalaj malzemesi, palet, şarj ünitesi)',
      'Yüksekten malzeme düşmesi',
      'Elektrikli forklift şarj istasyonu kaynaklı patlama/yangın',
      'Deprem',
      'Sevkiyat rampasında araç-personel çarpışması',
      'Soğuk hava deposunda amonyak/gaz kaçağı (varsa)'
    ],
    onleyiciTedbirler: 'RAF VE İSTİF GÜVENLİĞİ:\n- Raf sistemleri azami yük kapasitesine göre etiketlenir, periyodik olarak hasar/eğilme yönünden kontrol edilir.\n- İstifleme yüksekliği ve dengesi için standart çalışma talimatı uygulanır.\n\nARAÇ TRAFİĞİ:\n- Forklift/istif makinesi operatörleri sertifikalı olur, araçlar günlük kontrol formuyla denetlenir.\n- Yaya-araç güzergâhları yer işaretleriyle ayrılır, kör noktalara ayna/uyarı sistemi konur, sevkiyat rampasında bariyer/durdurma takozu kullanılır.\n\nŞARJ İSTASYONU VE YANGIN:\n- Şarj istasyonu havalandırmalı, yanıcı malzemeden uzak ve yangın söndürme tüpü/battaniyesi erişilebilir alanda kurulur.\n- Yangın algılama/söndürme sistemi (sprinkler, yangın dolabı) periyodik bakımdan geçirilir.\n\nKAÇIŞ YOLLARI:\n- Depo koridorları ve acil çıkışlar her zaman açık tutulur, malzeme ile kapatılmaz; aylık kontrol formuyla denetlenir.\n\nTEHLİKEYE ÖZEL ÖNLEMLER:\n\nRaf/İstif Çökmesi: Etkilenen koridor derhal kapatılır, altında kalma ihtimaline karşı kurtarma ekibi ve gerekiyorsa itfaiye çağrılır; eğitimsiz personel enkaza yaklaşmaz.\n\nForklift Kazası: Araç derhal durdurulur, motor kapatılır; yaralı varsa İlk Yardım ekibi çağrılır, kaza yeri inceleme tamamlanana kadar değiştirilmez.\n\nYangın (Ambalaj/Palet): Söndürme ekibi ilk müdahaleyi yapar, yanıcı malzeme yoğunluğu nedeniyle büyüyen yangında bölge derhal tahliye edilir.\n\nYüksekten Malzeme Düşmesi: Raf altı geçişlerde bulunulmaz, düşme sonrası alan işaretlenip trafik yönlendirilir.\n\nŞarj İstasyonu Yangını/Patlaması: Şarj işlemi anında kesilir, mümkünse yangın battaniyesi/tüpü ile müdahale edilir, alan derhal boşaltılır.',
    tahliyePlani: '1) ALARM VE İLK MÜDAHALE: Alarm çalınca forklift/istif makineleri güvenli şekilde durdurulur ve park edilir, motor kapatılır.\n\n2) TAHLİYE: Personel yaya güzergâhından, raf aralarından kaçınarak en yakın acil çıkışa yönlendirilir.\n\n3) TOPLANMA VE SAYIM: Raf aralarında kalan personel olup olmadığı vardiya sorumlusu tarafından kontrol edilir; toplanma alanında sayım yapılıp Acil Durum Koordinatörüne bildirilir.\n\n4) ARAMA-KURTARMA: Devrilen raf/malzeme altında kalan olması ihtimaline karşı kurtarma ekibi derhal yönlendirilir; eğitimsiz personel etkilenen bölgeye girmez.\n\n5) YENİDEN BAŞLATMA: Vardiya sorumlusu onayı olmadan araç trafiği ve elleçleme işlemleri yeniden başlatılmaz.' + _EKIP_GOREVLERI_METNI,
    uyariSistemleri: 'Depo geneli sesli alarm/siren, forklift/araç trafiğine yönelik ışıklı ikaz, anons sistemi, vardiya sorumlusu telsiz uyarısı.',
    disKurumIletisim: 'Acil Çağrı Merkezi (İtfaiye / Ambulans / Polis / Jandarma): 112\nAFAD: 122\n[En yakın hastane adı ve telefonu]\n[En yakın itfaiye istasyonu adı ve telefonu]'
  },
  {
    id: 'kimyasal',
    ad: 'Kimyasal Madde Üretim / Depolama',
    aciklama: 'Tehlikeli kimyasalların üretildiği, işlendiği veya depolandığı tesis.',
    olasiAcilDurumlar: [
      'Kimyasal sızıntı/dökülme',
      'Zehirli/boğucu gaz yayılımı',
      'Yangın (yanıcı/parlayıcı kimyasal)',
      'Patlama',
      'Kontrolsüz reaksiyon kaynaklı ani ısınma/basınç artışı',
      'Kişisel maruziyet (solunum, cilt veya göz teması)',
      'Kapalı alan/tank içi çalışmada oksijen eksikliği',
      'Kimyasalın çevreye/kanalizasyona/toprağa karışması',
      'Depolama alanında birbiriyle tepkimeye giren maddelerin teması'
    ],
    onleyiciTedbirler: 'DEPOLAMA VE ETİKETLEME:\n- Tüm kimyasallar için güncel Güvenlik Bilgi Formu (GBF/SDS) bulundurulur, depolama uyumluluk tablosuna göre (birbiriyle tepkimeye giren maddeler ayrı) depolanır ve etiketlenir.\n\nGAZ ALGILAMA:\n- Sabit/taşınabilir gaz dedektörü ve otomatik alarm sistemi kritik noktalarda bulunur, periyodik kalibrasyonu yapılır.\n- Kapalı alan/tank çalışmalarında giriş öncesi gaz ölçümü, sürekli havalandırma ve gözcü personel zorunludur.\n\nKİŞİSEL KORUYUCU DONANIM:\n- Uygun KKD (kimyasala dayanıklı eldiven, gözlük, gerektiğinde solunum koruyucu) zorunlu kullanılır, periyodik olarak yenilenir.\n- Göz duşu ve acil duş üniteleri kimyasal kullanılan her noktaya yakın konumlandırılır, periyodik olarak test edilir.\n\nDÖKÜLME MÜDAHALESİ:\n- Dökülme/sızıntı müdahale kiti (absorban, nötralize edici, bariyer malzemesi) erişilebilir noktalarda hazır bulundurulur, kullanımı personele öğretilir.\n\nEĞİTİM:\n- Kimyasalla çalışan tüm personel GBF okuma, KKD kullanımı ve acil müdahale konusunda düzenli eğitim alır.\n\nTEHLİKEYE ÖZEL ÖNLEMLER:\n\nKimyasal Sızıntı/Dökülme: Etkilenen alan derhal işaretlenir, GBF\'deki müdahale talimatı uygulanır; uygun KKD\'siz müdahale edilmez.\n\nZehirli/Boğucu Gaz Yayılımı: Rüzgar üstü yöne derhal uzaklaşılır, kapalı alanlara girilmez; gaz ölçümü yapılmadan alana dönülmez.\n\nYangın (Yanıcı Kimyasal): Su ile müdahale edilemeyen kimyasallar için uygun söndürücü türü (köpük/kuru kimyevi toz) kullanılır, GBF\'de belirtilmişse su kullanımından kaçınılır.\n\nPatlama: Personel derhal uzaklaşır, ikinci patlama/zincirleme reaksiyon ihtimaline karşı bölgeye eğitimsiz kişi girmez.\n\nKişisel Maruziyet: Etkilenen bölge (göz/cilt/solunum) derhal bol suyla en az 15 dakika yıkanır, kontamine kıyafet çıkarılır, hastaneye GBF ile birlikte sevk edilir.',
    tahliyePlani: '1) ALARM VE İZOLASYON: Alarm çalınca kimyasal işlem/transfer derhal durdurulur, mümkünse kaynak izole edilir (vana kapatma vb.) — bu işlem yalnızca eğitimli personel tarafından ve kişisel risk oluşturmayacak şekilde yapılır.\n\n2) TAHLİYE: Rüzgar yönü dikkate alınarak rüzgar üstü/yukarı yönde, sızıntı bölgesinden uzaklaşılarak güvenli toplanma alanına gidilir.\n\n3) ARINDIRMA VE İLK YARDIM: Maruz kalan personel derhal göz duşu/acil duş ile arındırılır ve sağlık birimine/hastaneye yönlendirilir; kontamine kıyafetler çıkarılır.\n\n4) TOPLANMA VE BİLDİRİM: Ekip başları personel sayımını yapıp Acil Durum Koordinatörüne bildirir; durum gerektiğinde itfaiye/AFAD\'a ve Zehir Danışma Merkezi\'ne bildirilir.\n\n5) ÇEVRE KORUMA: Sızıntının çevreye/kanalizasyona karışmaması için bariyer alınır; ilgili çevre mevzuatı gereği yetkili makamlara bildirim yapılır.\n\n6) YENİDEN BAŞLATMA: Alan gaz ölçümüyle güvenli bulunmadan ve Acil Durum Koordinatörü onayı olmadan işleme geri dönülmez.' + _EKIP_GOREVLERI_METNI,
    uyariSistemleri: 'Sabit gaz dedektörü otomatik alarmı, tesis geneli siren, anons sistemi, ekip başları telsiz uyarısı.',
    disKurumIletisim: 'Acil Çağrı Merkezi (İtfaiye / Ambulans / Polis / Jandarma): 112\nZehir Danışma Merkezi: 114\nAFAD: 122\n[En yakın hastane adı ve telefonu — kimyasal maruziyet tedavisi yapabilen]\n[Kimyasal tedarikçisi/üreticisi acil hattı]'
  },
  {
    id: 'saglik',
    ad: 'Sağlık Kuruluşu',
    aciklama: 'Hastane, poliklinik veya tıp merkezi gibi sağlık hizmeti verilen tesis.',
    olasiAcilDurumlar: [
      'Yangın',
      'Deprem',
      'Tıbbi gaz (oksijen) tesisatı/tüpü kaynaklı yangın veya patlama',
      'Kesintisiz güç kaynağı arızası (kritik cihazların durması)',
      'Enfeksiyon/salgın kaynaklı yayılım riski',
      'Hasta/hasta yakını kaynaklı şiddet olayı',
      'Yatağa bağımlı/hareket kısıtlı hastanın tahliyesi',
      'Su/ilaç/tıbbi malzeme kesintisi',
      'Yenidoğan/yoğun bakım gibi kritik ünitede acil durum'
    ],
    onleyiciTedbirler: 'TIBBİ GAZ VE ELEKTRİK GÜVENLİĞİ:\n- Tıbbi gaz tesisatı ve tüp depoları periyodik olarak kontrol edilir, açık ateş/kaynak işleri bu alanlardan uzak tutulur.\n- Jeneratör ve kesintisiz güç kaynağı (UPS) düzenli test edilir, kritik cihazlar (yoğun bakım, ameliyathane) yedekli beslemeye bağlanır.\n\nENFEKSİYON KONTROLÜ:\n- Enfeksiyon kontrol komitesi izolasyon protokollerini günceller, KKD stoku (maske, eldiven, önlük) sürekli hazır bulundurulur.\n- Salgın/artan vaka durumunda triyaj ve ek izolasyon alanı planı önceden belirlenir.\n\nHASTA TAHLİYE EKİPMANI:\n- Yatağa bağımlı hasta tahliyesi için tekerlekli sedye/evacuation chair gibi ekipman her katta bulunur, personel bu ekipmanların kullanımı konusunda düzenli eğitim alır.\n- Kritik bakım hastalarının taşınabilir monitör/oksijen ile tahliyesi için sorumlu personel önceden belirlenir.\n\nGÜVENLİK VE ŞİDDET ÖNLEME:\n- Güvenlik personeli, artan gerginlik/şiddet olaylarına erken müdahale için eğitilir; panik butonu/çağrı sistemi acil servis ve kritik noktalara yerleştirilir.\n\nTEHLİKEYE ÖZEL ÖNLEMLER:\n\nYangın: Alandaki hastalar önce yatay tahliye ile komşu kompartımana alınır, oksijen kaynakları mümkünse kapatılır/uzaklaştırılır.\n\nTıbbi Gaz Tesisatı/Tüpü Kaynaklı Patlama-Yangın: Ana gaz vanası eğitimli personel tarafından kapatılır, bölge derhal boşaltılır, açık ateşten uzak tutulur.\n\nKesintisiz Güç Kaynağı Arızası: Kritik cihazlardaki (ventilatör, monitör) hastalar öncelikli izlenir, yedek/taşınabilir güç kaynağına derhal geçilir.\n\nEnfeksiyon/Salgın Yayılımı: Şüpheli/pozitif vaka derhal izole edilir, temas eden personel ve hastalar kayıt altına alınır, enfeksiyon kontrol komitesine bildirilir.\n\nHasta/Yakını Kaynaklı Şiddet Olayı: Güvenlik personeli derhal çağrılır, personel kendini güvenli mesafede tutar, gerekiyorsa polis çağrılır.',
    tahliyePlani: '1) ALARM VE DEĞERLENDİRME: Alarm/kod anonsu ile birlikte servis sorumlusu durumu değerlendirir; panik yaratmamak için anonslar önceden belirlenmiş kod ifadeleriyle yapılır.\n\n2) YÜRÜYEBİLEN HASTA VE ZİYARETÇİ TAHLİYESİ: Önce yürüyebilen hastalar ve ziyaretçiler en yakın güvenli çıkışa yönlendirilir.\n\n3) HAREKET KISITLI HASTA TAHLİYESİ: Yatağa bağımlı/hareket kısıtlı hastalar önceden belirlenmiş sorumlu personel tarafından tahliye ekipmanıyla (evacuation chair, sedye) taşınır — kritik hastalarda hekim eşliğinde ve taşınabilir tıbbi ekipmanla (oksijen vb.) birlikte. Yatay tahliye (aynı kattaki yangın kompartımanına geçiş) mümkünse dikey tahliyeye tercih edilir.\n\n4) SAYIM VE BİLDİRİM: Servis sorumluları hasta/personel sayımını yapıp Acil Durum Koordinatörüne bildirir.\n\n5) SEVK: Kritik bakım hastaları için önceden belirlenmiş komşu sağlık kuruluşuna sevk protokolü uygulanır, hasta dosyaları/kimlik bilgileri birlikte taşınır.\n\n6) YENİDEN GİRİŞ: Yetkili onayı olmadan tahliye edilen üniteye hasta kabulüne devam edilmez.' + _EKIP_GOREVLERI_METNI,
    uyariSistemleri: 'Yangın alarm sistemi (kod anonsu ile, hasta panik yaratmayacak şekilde), servis içi çağrı sistemi, güvenlik/santral üzerinden anons.',
    disKurumIletisim: 'Acil Çağrı Merkezi (İtfaiye / Ambulans / Polis / Jandarma): 112\nAFAD: 122\n[İl Sağlık Müdürlüğü acil hattı]\n[En yakın/komşu hastane sevk protokolü telefonu]\n[Tıbbi gaz tedarikçisi acil hattı]'
  }
];

// ---- Hazır Acil Durum Senaryo Kütüphanesi ----

// modules/risk/model.js HAZIR_RISK_SABLONLARI ile birebir aynı desen: firma-
// bağımsız (bkz. sablon-repository.js, tenantAnahtar KULLANMAZ), kullanıcı
// bu kartları filtreleyip seçtiklerini kendi senaryo envanterine EKLER
// (kopyalar) — bkz. service.js acilDurumSenaryoSablonlariGetir, ui.js
// sablonModalAc/sablonlariCiz (Faz 2'de eklenecek). Risk matrisi (olasılık/
// şiddet/...) ve en kötü makul senaryo detayı işyerine özgü olduğundan
// şablonlarda BOŞ bırakılır; kullanıcı envantere ekledikten sonra doldurur.
function acilDurumSenaryoSablonuOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    kaynak: veriler.kaynak === 'kullanici' ? 'kullanici' : 'hazir',
    sahipId: veriler.sahipId || null,
    tesisTuru: TESIS_TURLERI.includes(veriler.tesisTuru) ? veriler.tesisTuru : 'Diğer',
    kategori: SENARYO_KATEGORILERI.includes(veriler.kategori) ? veriler.kategori : 'Diğer',
    tur: veriler.tur || 'Diğer',
    baslik: (veriler.baslik || '').trim(),
    olayinTanimi: (veriler.olayinTanimi || '').trim(),
    muhtemelNedenler: (veriler.muhtemelNedenler || '').trim(),
    ilkBelirtiTespit: (veriler.ilkBelirtiTespit || '').trim(),
    tehlikeKaynaklari: (veriler.tehlikeKaynaklari || '').trim(),
    etkilenecekAlanlar: (veriler.etkilenecekAlanlar || '').trim(),
    etkiInsan: (veriler.etkiInsan || '').trim(),
    etkiCevre: (veriler.etkiCevre || '').trim(),
    etkiTesis: (veriler.etkiTesis || '').trim(),
    ilk1Dk: (veriler.ilk1Dk || '').trim(),
    ilk5Dk: (veriler.ilk5Dk || '').trim(),
    ilk15Dk: (veriler.ilk15Dk || '').trim(),
    alarmIhbarYontemi: (veriler.alarmIhbarYontemi || '').trim(),
    tahliyeKarari: SENARYO_TAHLIYE_KARARLARI.includes(veriler.tahliyeKarari) ? veriler.tahliyeKarari : '',
    toplanmaAlani: (veriler.toplanmaAlani || '').trim(),
    guvenliDurdurmaNoktalari: Array.isArray(veriler.guvenliDurdurmaNoktalari) ? veriler.guvenliDurdurmaNoktalari : katilimcilariAyir(veriler.guvenliDurdurmaNoktalari),
    kkd: Array.isArray(veriler.kkd) ? veriler.kkd : katilimcilariAyir(veriler.kkd),
    mudahaleSiniri: (veriler.mudahaleSiniri || '').trim(),
    disKurumBildirimi: (veriler.disKurumBildirimi || '').trim(),
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}

// Faz 1 kapsamı: genel kategoriler (her tesis türünde geçerli) + kullanıcının
// promptunda ayrıntılı listelenen 8 sektör (Gübre, Asit, Gıda, İnşaat, Ofis,
// AVM, Hastane, Lojistik/Depo) + kalan 9 sektör için başlangıç kartı (1'er).
// Kütüphane, risk modülündeki gibi zamanla genişletilebilir bir "iskelet"tir.
const HAZIR_ACIL_DURUM_SENARYOLARI = [
  // ---- GENEL (tüm tesis türlerinde geçerli) ----
  { tesisTuru: 'Genel', kategori: 'Fiziksel', tur: 'Deprem', baslik: 'Deprem',
    olayinTanimi: 'Tesisi etkileyen orta/şiddetli yer sarsıntısı.', muhtemelNedenler: 'Doğal sismik aktivite.',
    ilkBelirtiTespit: 'Yer sarsıntısının hissedilmesi.', tehlikeKaynaklari: 'Devrilen dolap/raf, düşen tavan/cephe parçaları, cam kırılması, yapısal hasar, gaz/elektrik hattı kopması.',
    etkilenecekAlanlar: 'Tüm bina/saha, özellikle üst katlar ve depolama alanları.', etkiInsan: 'Düşen cisimlerden yaralanma, panik kaynaklı kaza, göçük altında kalma.',
    etkiCevre: 'Kimyasal/yakıt tankı hasarı durumunda sızıntı.', etkiTesis: 'Yapısal hasar, üretim durması, ekipman devrilmesi.',
    ilk1Dk: '"Çök-Kapan-Tutun" pozisyonu alınır, sağlam masa/kolon altına sığınılır, dışarı koşulmaz.', ilk5Dk: 'Sarsıntı bitince güvenliyse elektrik/gaz/su ana vanaları kapatılır, bina hızlıca hasar yönünden gözden geçirilir.', ilk15Dk: 'Tahliye kararı verilirse merdivenlerle (asansörsüz) toplanma alanına çıkılır, sayım yapılır.',
    alarmIhbarYontemi: 'Sismik his + Koordinasyon Ekibi anonsu.', tahliyeKarari: 'Tam Tahliye', toplanmaAlani: 'Bina dışı, cephe/cam düşme riski olmayan açık alan.',
    guvenliDurdurmaNoktalari: 'Ana elektrik panosu; doğalgaz ana vanası; kritik proses acil stop.', kkd: 'Baret (moloz riski olan alanlarda).',
    mudahaleSiniri: 'Yapısal değerlendirme yalnızca yetkili mühendis/itfaiye onayından sonra; enkaz altında kalan olması durumunda eğitimsiz personel kurtarma girişiminde bulunmaz.', disKurumBildirimi: 'AFAD, itfaiye, gerekiyorsa belediye (yapısal değerlendirme).' },

  { tesisTuru: 'Genel', kategori: 'Fiziksel', tur: 'Çevresel Olay', baslik: 'Sel / Su Baskını',
    olayinTanimi: 'Şiddetli yağış, altyapı yetersizliği veya yakın dere/kanal taşması sonucu tesisin su altında kalması.', muhtemelNedenler: 'Aşırı yağış, drenaj tıkanıklığı, yakın su kaynağı taşkını.',
    ilkBelirtiTespit: 'Zemin katta/bodrum katta su birikmesi, meteorolojik uyarı.', tehlikeKaynaklari: 'Elektrik panoları ve prizlerin suyla teması, kayma, elektrik çarpması, kimyasal/malzeme kaybı.',
    etkilenecekAlanlar: 'Zemin kat, bodrum, dış depolama alanları.', etkiInsan: 'Elektrik çarpması, kaymaya bağlı yaralanma.', etkiCevre: 'Kimyasal/atık suyla karışıp yayılabilir.', etkiTesis: 'Ekipman/elektronik hasarı, stok kaybı, uzun süreli duruş.',
    ilk1Dk: 'Zemin kattaki elektrikli cihazlar güvenliyse fişten çekilir, su seviyesi yüksek elektrik panolarından uzak durulur.', ilk5Dk: 'Ana elektrik zemin kat hattı kesilir, personel üst kata/güvenli alana yönlendirilir.', ilk15Dk: 'Kritik ekipman/kimyasal yüksek rafa taşınır (güvenliyse), su tahliye pompası devreye alınır.',
    alarmIhbarYontemi: 'Görsel tespit + Koordinasyon Ekibi anonsu, meteorolojik erken uyarı varsa önceden bilgilendirme.', tahliyeKarari: 'Kısmi Tahliye', toplanmaAlani: 'Yüksek, su basmayan iç/dış alan.',
    guvenliDurdurmaNoktalari: 'Zemin kat elektrik panosu; su ile temas riskli makine güç kaynakları.', kkd: 'Yalıtkan çizme, eldiven.',
    mudahaleSiniri: 'Elektrik kesilmeden su birikintisine girilmez; yapısal/elektriksel güvenlik onaylanmadan bölgeye dönülmez.', disKurumBildirimi: 'İtfaiye (su tahliye desteği), belediye, AFAD (büyük ölçekli taşkında).' },

  { tesisTuru: 'Genel', kategori: 'İnsan Kaynaklı', tur: 'Diğer', baslik: 'Yüksekten Düşme',
    olayinTanimi: 'Merdiven, platform, çatı veya yükseltilmiş çalışma alanından düşme sonucu yaralanma.', muhtemelNedenler: 'Korkuluk eksikliği, düşme önleyici ekipman kullanılmaması, kayma/tökezleme, güvensiz platform.',
    ilkBelirtiTespit: 'Görgü tanığı bildirimi, düşme sesi/çığlık.', tehlikeKaynaklari: 'Korumasız kenar, sağlam olmayan platform, düşme önleyici ekipman eksikliği.', etkilenecekAlanlar: 'Düşme noktası ve çevresi.',
    etkiInsan: 'Kırık, omurga/kafa travması, ölüm riski.', etkiCevre: '-', etkiTesis: 'İş durması, olay yeri inceleme süresi.',
    ilk1Dk: 'Kazazedeye dokunulmadan bilinç/nabız/solunum kontrol edilir; boyun/omurga sabitlenmeden hareket ettirilmez.', ilk5Dk: 'İlk Yardım ekibi ve ambulans çağrılır, kazazede battaniyeyle sıcak tutulur, olay yeri korunur.', ilk15Dk: 'Ambulans geliş bilgisi ekip başına iletilir, tanık ifadeleri/olay yeri fotoğrafı kayıt altına alınır.',
    alarmIhbarYontemi: 'Sözlü/telsiz bildirim, İlk Yardım ekibi çağrısı.', tahliyeKarari: 'Yerinde Sığınma', toplanmaAlani: 'Olay bölgesi çevrelenir, genel tahliye gerekmez.',
    guvenliDurdurmaNoktalari: '-', kkd: 'Eldiven (kan/vücut sıvısı teması için).',
    mudahaleSiniri: 'Sadece İlk Yardım eğitimi almış personel müdahale eder; omurga travması şüphesinde kazazede kesinlikle hareket ettirilmez.', disKurumBildirimi: '112 Acil Çağrı Merkezi.' },

  { tesisTuru: 'Genel', kategori: 'İnsan Kaynaklı', tur: 'Diğer', baslik: 'Elektrik Çarpması',
    olayinTanimi: 'Enerjili bir hat/ekipmanla temas sonucu elektrik çarpması.', muhtemelNedenler: 'Hasarlı kablo/ekipman, topraklama eksikliği, enerjili hatta izinsiz yaklaşma, ıslak ortamda çalışma.',
    ilkBelirtiTespit: 'Kazazedenin bağırması/düşmesi, koku/kıvılcım, tanık bildirimi.', tehlikeKaynaklari: 'Hasarlı elektrik tesisatı/ekipmanı, topraklanmamış gövde.', etkilenecekAlanlar: 'Olay noktası ve elektrik hattının beslediği alan.',
    etkiInsan: 'Yanık, kalp durması, ölüm riski.', etkiCevre: '-', etkiTesis: 'Elektrik kesintisi, ekipman hasarı.',
    ilk1Dk: 'Kazazedeye ÇIPLAK ELLE DOKUNULMAZ; mümkünse enerji kaynağı kapatılır, kapatılamıyorsa yalıtkan bir cisimle (tahta, kuru bez) kazazede hattan uzaklaştırılır.', ilk5Dk: 'Enerji kesildikten sonra bilinç/nabız/solunum kontrol edilir, gerekiyorsa CPR başlatılır, İlk Yardım ekibi ve ambulans çağrılır.', ilk15Dk: 'Yanık bölgeleri soğuk suyla soğutulur (yara üzerine hiçbir şey sürülmez), ambulansa teslime kadar izlenir.',
    alarmIhbarYontemi: 'Sözlü/telsiz bildirim.', tahliyeKarari: 'Yerinde Sığınma', toplanmaAlani: 'Olay bölgesi çevrelenir.',
    guvenliDurdurmaNoktalari: 'İlgili elektrik panosu/şalteri.', kkd: 'Yalıtkan eldiven (müdahale eden personel için, gerekiyorsa).',
    mudahaleSiniri: 'Enerji kesildiği doğrulanmadan kazazedeye veya hatta yaklaşılmaz; sadece yetkili elektrik personeli enerji kesme işlemini yapar.', disKurumBildirimi: '112 Acil Çağrı Merkezi, gerekiyorsa elektrik dağıtım şirketi.' },

  { tesisTuru: 'Genel', kategori: 'Güvenlik', tur: 'Diğer', baslik: 'Şüpheli Paket / Sabotaj Tehdidi',
    olayinTanimi: 'Sahipsiz/şüpheli bir cismin fark edilmesi veya tesise yönelik bir tehdit ihbarının alınması.', muhtemelNedenler: 'Kasıtlı tehdit/sabotaj girişimi, unutulmuş kişisel eşya (yanlış alarm).',
    ilkBelirtiTespit: 'Personel/ziyaretçinin cismi fark etmesi, telefon/e-posta ile tehdit ihbarı.', tehlikeKaynaklari: 'Şüpheli cismin kendisi, kalabalık tahliyesi sırasında panik.', etkilenecekAlanlar: 'Cismin bulunduğu alan ve çevresindeki güvenlik çemberi.',
    etkiInsan: 'Patlama/yaralanma riski (doğrulanırsa), panik.', etkiCevre: '-', etkiTesis: 'Faaliyet durması, güvenlik operasyonu süresi.',
    ilk1Dk: 'Cisme KESİNLİKLE DOKUNULMAZ, taşınmaz, cep telefonu/telsiz cismin yakınında kullanılmaz; alan gözle işaretlenip uzaklaşılır.', ilk5Dk: 'Güvenlik/Koordinasyon Ekibine ve polise bilgi verilir, cismin bulunduğu alan ve çevresi (min. güvenli mesafe) boşaltılır.', ilk15Dk: 'Personel/ziyaretçi güvenli toplanma alanına yönlendirilir, polis/bomba imha ekibi gelene kadar alan kontrolsüz girişe kapatılır.',
    alarmIhbarYontemi: 'Güvenlik personeli anonsu, telsiz.', tahliyeKarari: 'Kısmi Tahliye', toplanmaAlani: 'Cisimden güvenli mesafede, bina dışı alan.',
    guvenliDurdurmaNoktalari: '-', kkd: '-',
    mudahaleSiniri: 'Şüpheli cisimle hiçbir şekilde ilgilenilmez; karar ve müdahale tamamen polis/bomba imha ekibine aittir.', disKurumBildirimi: '155 Polis İmdat (112 üzerinden), gerekiyorsa il emniyet bomba imha birimi.' },

  { tesisTuru: 'Genel', kategori: 'Sağlık', tur: 'Diğer', baslik: 'Toplu Sağlık Olayı / Salgın',
    olayinTanimi: 'Aynı anda/kısa sürede birden fazla çalışanın hastalanması (gıda zehirlenmesi, bulaşıcı hastalık, gaz maruziyeti şüphesi vb.).', muhtemelNedenler: 'Ortak gıda/su kaynağı kontaminasyonu, bulaşıcı hastalık yayılımı, ortam havası kaynaklı toplu maruziyet.',
    ilkBelirtiTespit: 'Kısa sürede benzer semptomlu birden fazla başvuru (bulantı, ateş, solunum sıkıntısı).', tehlikeKaynaklari: 'Kontamine gıda/su, hasta personelin diğerlerine bulaştırması, ortam havası kirliliği.', etkilenecekAlanlar: 'Yemekhane/mutfak, ortak kullanım alanları, ilgili çalışma alanı.',
    etkiInsan: 'Çoklu yaralanma/hastalanma, ağır vakalarda ölüm riski.', etkiCevre: '-', etkiTesis: 'Personel yetersizliği nedeniyle faaliyet aksaması.',
    ilk1Dk: 'Etkilenen kişiler diğerlerinden ayrılır (izolasyon), İlk Yardım ekibine haber verilir.', ilk5Dk: 'Vaka sayısı ve semptomlar kayıt altına alınır, şüpheli kaynak (gıda/su/ortam) kullanımdan men edilir.', ilk15Dk: 'Ağır vakalar için ambulans çağrılır, işyeri hekimi/OSGB bilgilendirilir, gerekiyorsa İl Sağlık Müdürlüğüne bildirim yapılır.',
    alarmIhbarYontemi: 'İlk Yardım ekibi/işyeri hekimi bildirimi.', tahliyeKarari: 'Yerinde Sığınma', toplanmaAlani: 'Etkilenmeyen personel normal çalışma alanında kalır; hasta personel izolasyon alanına alınır.',
    guvenliDurdurmaNoktalari: 'Şüpheli gıda/su kaynağı kullanımdan kaldırılır.', kkd: 'Maske, eldiven (bulaşıcı hastalık şüphesinde).',
    mudahaleSiniri: 'Teşhis/tedavi yalnızca sağlık personeli/hastane tarafından yapılır; İlk Yardım ekibi sadece stabilizasyon ve yönlendirme yapar.', disKurumBildirimi: '112 Acil Sağlık, ağır/bulaşıcı vakalarda İl Sağlık Müdürlüğü.' },

  { tesisTuru: 'Genel', kategori: 'Patlama', tur: 'Patlama', baslik: 'Basınçlı Kap Patlaması',
    olayinTanimi: 'Kompresör, kazan, hava tankı gibi basınçlı bir kabın aşırı basınç veya malzeme yorulması sonucu patlaması.', muhtemelNedenler: 'Periyodik kontrol/bakım eksikliği, emniyet valfi arızası, aşırı basınçlandırma, malzeme yorgunluğu/korozyon.',
    ilkBelirtiTespit: 'Anormal ses/titreşim, basınç göstergesinde anormal yükselme, patlama sesi.', tehlikeKaynaklari: 'Kabın kendisi, fırlayan parçalar, basınçlı gaz/buhar salınımı.', etkilenecekAlanlar: 'Kabın bulunduğu makine dairesi/proses alanı ve yakın çevresi.',
    etkiInsan: 'Fırlayan parça/basınç dalgası kaynaklı ağır yaralanma, işitme kaybı.', etkiCevre: 'İçerikte kimyasal/yağ varsa sızıntı.', etkiTesis: 'Ekipman ve bina hasarı, üretim durması.',
    ilk1Dk: 'Bölge derhal terk edilir, personel kabın olası fırlama yönünden uzaklaştırılır.', ilk5Dk: 'Besleme hattı (varsa) kapatılır, alan güvenlik şeridiyle çevrelenir, yaralı varsa İlk Yardım ekibi çağrılır.', ilk15Dk: 'Hasar tespiti güvenli mesafeden yapılır, itfaiye/teknik ekip beklenir, alan kontrolsüz girişe kapatılır.',
    alarmIhbarYontemi: 'Patlama sesi + tesis geneli siren.', tahliyeKarari: 'Kısmi Tahliye', toplanmaAlani: 'Makine dairesinden uzak, güvenli açık alan.',
    guvenliDurdurmaNoktalari: 'Kabın besleme/enerji hattı.', kkd: 'Baret, koruyucu gözlük.',
    mudahaleSiniri: 'İkinci bir patlama/parça fırlaması ihtimaline karşı eğitimsiz personel bölgeye yaklaşmaz; teknik değerlendirme yalnızca yetkili mühendis/itfaiye tarafından yapılır.', disKurumBildirimi: 'İtfaiye, gerekiyorsa AFAD.' },

  { tesisTuru: 'Genel', kategori: 'Proses', tur: 'Diğer', baslik: 'Proses Kontrol Kaybı',
    olayinTanimi: 'Otomasyon/kontrol sisteminin çökmesi veya kritik bir değişkenin (basınç/sıcaklık/seviye) kontrolden çıkması.', muhtemelNedenler: 'Elektrik kesintisi, enstrüman havası/kontrol sinyali kaybı, sensör/valf arızası, yazılım hatası.',
    ilkBelirtiTespit: 'Kontrol odası alarmları, anormal proses parametreleri, operatör gözlemi.', tehlikeKaynaklari: 'Kontrolsüz reaksiyon, tank taşması/boşalması, basınç/sıcaklık aşımı.', etkilenecekAlanlar: 'İlgili proses ünitesi ve bağlı sistemler.',
    etkiInsan: 'Kimyasal maruziyet/yangın/patlama riski (ikincil olay olarak).', etkiCevre: 'Kontrolsüz salım riski.', etkiTesis: 'Ekipman hasarı, üretim kaybı.',
    ilk1Dk: 'Operatör acil stop prosedürünü uygular, kritik besleme (varsa) manuel kapatılır.', ilk5Dk: 'Vardiya amiri/proses mühendisi bilgilendirilir, etkilenen üniteye giriş kısıtlanır.', ilk15Dk: 'Ünite güvenli/kararlı duruma (safe state) alınana kadar izlenir, gerekiyorsa Koordinasyon Ekibine bilgi verilir.',
    alarmIhbarYontemi: 'Kontrol odası alarmı + telsiz.', tahliyeKarari: 'Yerinde Sığınma', toplanmaAlani: 'Etkilenen üniteden uzak proses alanı.',
    guvenliDurdurmaNoktalari: 'İlgili ünitenin acil stop butonu; ana besleme vanası.', kkd: 'Standart proses KKD\'si.',
    mudahaleSiniri: 'Sadece proses operatörü/vardiya amiri manuel müdahale yapar; sistem güvenli duruma alınmadan üniteye normal erişim açılmaz.', disKurumBildirimi: 'Gerekirse itfaiye/AFAD (ikincil yangın/salım riski oluşursa).' },

  // ---- GÜBRE FABRİKASI ----
  { tesisTuru: 'Gübre Fabrikası', kategori: 'Kimyasal', tur: 'Amonyak Kaçağı', baslik: 'Amonyak Kaçağı',
    olayinTanimi: 'Amonyak depolama tankı, boru hattı veya proses ekipmanından amonyak gazı/sıvısı kaçağı.', muhtemelNedenler: 'Flanş/conta kaçağı, boru hattı korozyonu, aşırı doldurma, valf arızası, tanker transfer hatası.',
    ilkBelirtiTespit: 'Keskin/tahriş edici koku, sabit gaz dedektörü alarmı, görsel buhar bulutu.', tehlikeKaynaklari: 'Amonyak gazı bulutu (toksik, tahriş edici, belirli konsantrasyonda yanıcı).', etkilenecekAlanlar: 'Kaçak noktası ve rüzgar altı yönündeki geniş alan; komşu tesisler de etkilenebilir.',
    etkiInsan: 'Solunum yolu/göz/cilt tahrişi, yüksek konsantrasyonda boğulma ve ölüm.', etkiCevre: 'Toprağa/suya karışma, bitki örtüsüne zarar.', etkiTesis: 'Uzun süreli üretim durması, ekipman korozyonu.',
    ilk1Dk: 'Kaçağı fark eden kişi alarmı tetikler, rüzgar üstü yöne doğru derhal uzaklaşır; kapalı alanlara girilmez.', ilk5Dk: 'Kimyasal Müdahale/Söndürme Ekibi uygun KKD ile (varsa) izole vanayı kapatmayı dener; kapatılamıyorsa alan genişletilerek tahliye edilir.', ilk15Dk: 'Rüzgar yönüne göre etki alanı ve tahliye/sığınma sınırı belirlenir, komşu tesisler ve AFAD bilgilendirilir, gaz ölçüm ekibi bölgeyi izler.',
    alarmIhbarYontemi: 'Sabit gaz dedektörü otomatik alarmı + tesis geneli siren.', tahliyeKarari: 'Tam Tahliye', toplanmaAlani: 'Rüzgar üstü yönde, kaçak noktasından yeterli mesafede belirlenmiş alan.',
    guvenliDurdurmaNoktalari: 'Amonyak tankı ana izolasyon vanası; transfer pompası acil stop.', kkd: 'Gaz geçirmez kimyasal koruyucu elbise, tam yüz maskeli bağımsız solunum cihazı (SCBA).',
    mudahaleSiniri: 'Kaynağa yaklaşma ve vana kapatma İŞLEMİ SADECE sertifikalı Kimyasal Müdahale Ekibi tarafından, uygun SCBA ile yapılır; diğer personel derhal tahliye olur.', disKurumBildirimi: 'İtfaiye (kimyasal müdahale birimi), AFAD, çevre il müdürlüğü, komşu tesisler.',
    enKotuSenaryoMu: true },

  { tesisTuru: 'Gübre Fabrikası', kategori: 'Kimyasal', tur: 'Asit Dökülmesi', baslik: 'Nitrik/Sülfürik/Fosforik Asit Kaçağı',
    olayinTanimi: 'Asit depolama tankı veya proses hattından asit sızıntısı/dökülmesi.', muhtemelNedenler: 'Tank korozyonu, boru/flanş kaçağı, pompa arızası, transfer hatası, aşırı doldurma.',
    ilkBelirtiTespit: 'Görsel sızıntı, keskin koku, sabit pH/gaz dedektörü alarmı (NOx/SO₂ için).', tehlikeKaynaklari: 'Aşındırıcı asit sıvısı, NOx/SO₂ buharı yayılımı.', etkilenecekAlanlar: 'Sızıntı noktası, drenaj hattı, rüzgar altı yönü (buhar yayılımında).',
    etkiInsan: 'Ciddi kimyasal yanık, solunum yolu tahrişi/hasarı.', etkiCevre: 'Toprak/su kirliliği, drenaja karışma.', etkiTesis: 'Ekipman/zemin korozyonu, üretim durması.',
    ilk1Dk: 'Alan derhal terk edilir, temas edenler bol suyla en az 15 dk yıkanır (göz dahil).', ilk5Dk: 'Kimyasal Müdahale Ekibi uygun KKD ile sızıntıyı nötralize edici/absorban malzemeyle çevreler, kanalizasyona karışmasını önleyecek bariyer kurar.', ilk15Dk: 'Kaynak izole edilmeye çalışılır (mümkünse), buhar yayılımı varsa rüzgar yönüne göre geniş güvenlik çemberi oluşturulur.',
    alarmIhbarYontemi: 'Görsel tespit + sabit gaz dedektörü (NOx/SO₂ varsa) + siren.', tahliyeKarari: 'Kısmi Tahliye', toplanmaAlani: 'Sızıntı/buhar bölgesinden uzak, rüzgar üstü alan.',
    guvenliDurdurmaNoktalari: 'İlgili asit tankı/hattı izolasyon vanası, transfer pompası acil stop.', kkd: 'Asite dayanıklı tam vücut koruyucu, yüz siperi, kimyasal eldiven, gerekiyorsa solunum koruyucu.',
    mudahaleSiniri: 'Nötralize etme/temizlik işlemi sadece eğitimli Kimyasal Müdahale Ekibi tarafından yapılır; büyük ölçekli döküntüde itfaiye desteği beklenir.', disKurumBildirimi: 'İtfaiye, çevre il müdürlüğü, büyük ölçekte AFAD.' },

  { tesisTuru: 'Gübre Fabrikası', kategori: 'Yangın', tur: 'Patlama', baslik: 'Amonyum Nitrat Yangını / Patlaması',
    olayinTanimi: 'Amonyum nitrat içeren gübre stoklama alanında başlayan ve kontrolsüz büyüyen yangın (yüksek sıcaklıkta patlama riski taşır).', muhtemelNedenler: 'Kızışma (self-heating), yakın kaynaklı yangının sıçraması, uygun olmayan depolama/karışım, elektrik arızası.',
    ilkBelirtiTespit: 'Duman/anormal koku, sıcaklık sensörü alarmı (varsa), görsel alev.', tehlikeKaynaklari: 'Amonyum nitratın ısıyla ayrışıp toksik gaz (NOx) çıkarması ve belirli koşullarda patlama riski.', etkilenecekAlanlar: 'Depolama alanı ve geniş çevre güvenlik mesafesi.',
    etkiInsan: 'Yanık, toksik gaz maruziyeti, patlama halinde ağır/çoklu yaralanma-ölüm.', etkiCevre: 'Geniş alan kontaminasyonu, hava kirliliği.', etkiTesis: 'Depo ve çevresindeki yapıların tamamen hasar görmesi riski.',
    ilk1Dk: 'Alan derhal ve GENİŞ ÇAPTA tahliye edilir (amonyum nitrat patlaması geniş etki alanına sahiptir); su ile SÖNDÜRME dışında müdahale girişiminde bulunulmaz.', ilk5Dk: 'İtfaiyeye "amonyum nitrat yangını" olduğu açıkça belirtilerek bildirim yapılır, güvenlik çemberi standart yangından çok daha geniş tutulur.', ilk15Dk: 'Rüzgar yönüne göre etki alanı genişletilir, komşu tesisler ve yakın yerleşim AFAD/belediye aracılığıyla uyarılır.',
    alarmIhbarYontemi: 'Görsel tespit + tesis geneli siren + doğrudan itfaiye çağrısı.', tahliyeKarari: 'Tam Tahliye', toplanmaAlani: 'Depo alanından ÇOK GENİŞ güvenlik mesafesinde, itfaiyenin belirlediği alan.',
    guvenliDurdurmaNoktalari: 'Depo alanına yakın elektrik/proses hatları (mümkünse ve güvenliyse).', kkd: 'Standart yangın KKD\'si yetersizdir — müdahale itfaiyenin sorumluluğundadır.',
    mudahaleSiniri: 'İç itfaiye/söndürme ekibi KENDİ GÜVENLİĞİ TEHLİKEYE GİRMEDEN sadece başlangıç aşamasında (küçük, kontrol edilebilir alevde) müdahale eder; büyüyen yangında TÜM personel derhal ve geniş çapta tahliye olur, söndürme profesyonel itfaiyeye bırakılır.', disKurumBildirimi: 'İtfaiye (acil, "amonyum nitrat" ibaresiyle), AFAD, belediye, komşu tesisler/yerleşim.',
    enKotuSenaryoMu: true },

  // ---- ASİT FABRİKASI ----
  { tesisTuru: 'Asit Fabrikası', kategori: 'Kimyasal', tur: 'Asit Dökülmesi', baslik: 'Sülfürik Asit Tankı Boru Hattı Kopması',
    olayinTanimi: 'Yüksek konsantrasyonlu sülfürik asit transfer hattının kopması sonucu büyük hacimli sızıntı.', muhtemelNedenler: 'Boru korozyonu/yorulması, mekanik hasar, aşırı basınç, bağlantı elemanı arızası.',
    ilkBelirtiTespit: 'Görsel büyük sızıntı, alarm/basınç düşüşü, keskin koku.', tehlikeKaynaklari: 'Yüksek konsantrasyonlu asit sıvısı, ısı açığa çıkması (asit-su reaksiyonu ihtimali).', etkilenecekAlanlar: 'Hat güzergahı, drenaj sistemi, tank sahası.',
    etkiInsan: 'Ağır kimyasal yanık, solunum tahrişi.', etkiCevre: 'Toprak/su kirliliği, drenaja karışma riski.', etkiTesis: 'Ekipman/altyapı korozyon hasarı, uzun süreli duruş.',
    ilk1Dk: 'Bölge derhal terk edilir, temas edenler ASLA SU DIŞINDA bir şeyle temizlenmez, bol suyla en az 15 dk yıkanır.', ilk5Dk: 'Transfer pompası/hat besleme acil stopla durdurulur, izolasyon vanası kapatılır (eğitimli personelce).', ilk15Dk: 'Döküntü nötralize edici ile çevrelenir, drenaja karışmaması için bariyer kurulur, itfaiye/çevre birimine bildirim yapılır.',
    alarmIhbarYontemi: 'Basınç düşüşü alarmı + görsel tespit + siren.', tahliyeKarari: 'Kısmi Tahliye', toplanmaAlani: 'Hat güzergahından ve tank sahasından uzak alan.',
    guvenliDurdurmaNoktalari: 'Transfer pompası acil stop; hat giriş/çıkış izolasyon vanaları.', kkd: 'Asite dayanıklı tam vücut koruyucu, yüz siperi, çizme, kimyasal eldiven.',
    mudahaleSiniri: 'Büyük hacimli döküntüde temizlik/nötralizasyon işlemi itfaiye kimyasal müdahale desteğiyle yapılır; tek başına çalışılmaz.', disKurumBildirimi: 'İtfaiye, çevre il müdürlüğü, AFAD (büyük ölçekli).' },

  { tesisTuru: 'Asit Fabrikası', kategori: 'Proses', tur: 'Diğer', baslik: 'Asit-Su Reaksiyonu Kaynaklı Ani Isı Açığa Çıkması',
    olayinTanimi: 'Konsantre asidin yanlışlıkla suyla (veya tersi sırayla) karışması sonucu şiddetli ekzotermik reaksiyon ve sıçrama.', muhtemelNedenler: 'Prosedür hatası (yanlış ekleme sırası), hat karışması, temizlik sırasında yanlış madde kullanımı.',
    ilkBelirtiTespit: 'Ani kaynama/köpürme sesi, buhar/duman çıkışı, sıcaklık artışı.', tehlikeKaynaklari: 'Sıçrayan sıcak asit, yoğun asit buharı.', etkilenecekAlanlar: 'Karışımın yapıldığı proses noktası ve yakın çevre.',
    etkiInsan: 'Ciddi kimyasal yanık, sıçrama sonucu göz/cilt hasarı.', etkiCevre: 'Buhar yayılımı.', etkiTesis: 'Ekipman hasarı, proses durması.',
    ilk1Dk: 'Reaksiyon bölgesinden derhal uzaklaşılır, sıçrama teması olan bölge bol suyla yıkanmaya başlanır.', ilk5Dk: 'Proses besleme durdurulur (eğitimli personelce), alan havalandırılır/izole edilir.', ilk15Dk: 'Reaksiyonun sona ermesi (sıcaklığın düşmesi) beklenir, ancak sonra temizlik/değerlendirme yapılır.',
    alarmIhbarYontemi: 'Sözlü/telsiz bildirim.', tahliyeKarari: 'Yerinde Sığınma', toplanmaAlani: 'Proses noktasından uzak, aynı bina içinde güvenli alan.',
    guvenliDurdurmaNoktalari: 'İlgili besleme hattı vanası.', kkd: 'Asite dayanıklı koruyucu, yüz siperi.',
    mudahaleSiniri: 'Reaksiyon devam ederken bölgeye girilmez; sadece proses mühendisi/vardiya amiri onayıyla tekrar erişilir.', disKurumBildirimi: 'Gerekiyorsa itfaiye (yoğun buhar/yangın riski oluşursa).' },

  // ---- GIDA FABRİKASI ----
  { tesisTuru: 'Gıda Fabrikası', kategori: 'Kimyasal', tur: 'Amonyak Kaçağı', baslik: 'Soğutma Sistemi Amonyak Kaçağı',
    olayinTanimi: 'Endüstriyel soğutma/donma sisteminde kullanılan amonyak gazının boru/kompresör arızası sonucu kaçağı.', muhtemelNedenler: 'Conta/valf arızası, boru korozyonu, aşırı basınç, bakım hatası.',
    ilkBelirtiTespit: 'Keskin koku, gaz dedektörü alarmı (varsa), soğuk depo alanında anormal buhar.', tehlikeKaynaklari: 'Amonyak gazı (toksik, tahriş edici).', etkilenecekAlanlar: 'Soğuk depo, kompresör dairesi ve yakın üretim alanı.',
    etkiInsan: 'Solunum/göz tahrişi, yüksek konsantrasyonda boğulma riski.', etkiCevre: 'Sınırlı (kapalı sistem, büyük dış yayılım nadir).', etkiTesis: 'Soğuk zincir kaybı, ürün israfı, üretim durması.',
    ilk1Dk: 'Alandaki personel derhal tahliye olur, kapalı alana girilmez, koku alan herkes uzaklaşır.', ilk5Dk: 'Kompresör dairesi enerjisi/beslemesi eğitimli personelce kapatılmaya çalışılır, havalandırma açılır (mümkünse).', ilk15Dk: 'Gaz ölçümü yapılmadan alana girilmez, itfaiye/kimyasal müdahale ekibi beklenir.',
    alarmIhbarYontemi: 'Gaz dedektörü alarmı + siren.', tahliyeKarari: 'Kısmi Tahliye', toplanmaAlani: 'Soğuk depo/kompresör dairesinden uzak, açık alan.',
    guvenliDurdurmaNoktalari: 'Kompresör ana elektrik/gaz besleme hattı.', kkd: 'Tam yüz maskeli solunum koruyucu, gaz geçirmez eldiven.',
    mudahaleSiniri: 'Kapalı alana girecek personel gaz ölçüm cihazı ve uygun solunum koruması olmadan içeri girmez.', disKurumBildirimi: 'İtfaiye (kimyasal müdahale), gerekiyorsa AFAD.' },

  { tesisTuru: 'Gıda Fabrikası', kategori: 'Yangın', tur: 'Yangın', baslik: 'Kızgın Yağ Yangını',
    olayinTanimi: 'Kızartma/pişirme hattında kızgın yağın tutuşması sonucu yangın.', muhtemelNedenler: 'Aşırı ısınma, yağın alev/kaynak kaynağıyla teması, ekipman arızası.',
    ilkBelirtiTespit: 'Duman, alev, yanık yağ kokusu.', tehlikeKaynaklari: 'Alevlenen yağ, sıçrayan yağın yayılması.', etkilenecekAlanlar: 'Mutfak/pişirme hattı ve baca sistemi.',
    etkiInsan: 'Ciddi yanık (özellikle su ile müdahale edilirse sıçrama nedeniyle).', etkiCevre: '-', etkiTesis: 'Ekipman/baca hasarı, üretim durması.',
    ilk1Dk: 'KESİNLİKLE SU DÖKÜLMEZ (patlarcasına sıçrar); ısı kaynağı kapatılır, güvenliyse yağ yangını sınıfı (F/K sınıfı) söndürücü veya nemli bez/kapak kullanılır.', ilk5Dk: 'Söndürülemiyorsa alan tahliye edilir, baca/havalandırma sistemi kapatılır (yayılımı önlemek için).', ilk15Dk: 'İtfaiye bilgilendirilir, alan soğuyana kadar kimse yaklaşmaz.',
    alarmIhbarYontemi: 'Görsel tespit + mutfak duman dedektörü + siren.', tahliyeKarari: 'Kısmi Tahliye', toplanmaAlani: 'Mutfak/üretim hattından uzak alan.',
    guvenliDurdurmaNoktalari: 'Kızartma hattı gaz/elektrik besleme vanası-şalteri.', kkd: 'Yangına dayanıklı eldiven.',
    mudahaleSiniri: 'Sadece F/K sınıfı söndürücü eğitimi almış personel müdahale eder; büyüyen yangında derhal tahliye edilip itfaiye beklenir.', disKurumBildirimi: 'İtfaiye.' },

  // ---- İNŞAAT SAHASI ----
  { tesisTuru: 'İnşaat Sahası', kategori: 'İnsan Kaynaklı', tur: 'Diğer', baslik: 'Yüksekten Düşme (İskele/Çatı)',
    olayinTanimi: 'İskele, çatı veya kat boşluğu gibi yükseltilmiş bir alandan çalışanın düşmesi.', muhtemelNedenler: 'Korkuluk/güvenlik ağı eksikliği, emniyet kemeri kullanılmaması, iskele arızası, dikkatsizlik.',
    ilkBelirtiTespit: 'Düşme sesi, tanık bildirimi.', tehlikeKaynaklari: 'Korumasız kenar/boşluk, arızalı iskele.', etkilenecekAlanlar: 'Düşme noktası ve altındaki çalışma alanı.',
    etkiInsan: 'Ağır travma, omurga/kafa yaralanması, ölüm riski.', etkiCevre: '-', etkiTesis: 'İş durması, denetim süreci.',
    ilk1Dk: 'Kazazedeye dokunulmadan bilinç/nabız kontrol edilir; boyun/omurga sabitlenmeden kesinlikle hareket ettirilmez.', ilk5Dk: 'İlk Yardım ekibi ve ambulans çağrılır, olay yeri güvenlik şeridiyle çevrelenir, düşmeye sebep olan tehlike (varsa) izole edilir.', ilk15Dk: 'Ambulans gelene kadar kazazede izlenir, şantiye şefi/İSG uzmanına bilgi verilir, tanık ifadeleri kayıt altına alınır.',
    alarmIhbarYontemi: 'Sözlü/telsiz bildirim.', tahliyeKarari: 'Yerinde Sığınma', toplanmaAlani: 'Olay bölgesi çevrelenir, genel tahliye gerekmez.',
    guvenliDurdurmaNoktalari: '-', kkd: 'Eldiven (kan/vücut sıvısı teması için).',
    mudahaleSiniri: 'Sadece İlk Yardım eğitimli personel müdahale eder; yüksekte mahsur kalan/asılı kalan kazazede için yalnızca yüksekte kurtarma eğitimli personel/itfaiye müdahale eder.', disKurumBildirimi: '112 Acil Çağrı Merkezi.' },

  { tesisTuru: 'İnşaat Sahası', kategori: 'Fiziksel', tur: 'Diğer', baslik: 'Kazı / İstinat Yapısı Göçmesi',
    olayinTanimi: 'Kazı şevinin veya istinat/iksa sisteminin göçmesi sonucu toprak kayması.', muhtemelNedenler: 'Yetersiz şev açısı/iksa, aşırı yağış sonrası zemin doygunluğu, yakın ağır yük/titreşim, kazı derinliği aşımı.',
    ilkBelirtiTespit: 'Zeminde çatlak/çökme, iksa elemanlarında deformasyon, gözlemcinin uyarısı.', tehlikeKaynaklari: 'Göçen toprak/malzeme kütlesi.', etkilenecekAlanlar: 'Kazı alanı ve çevresi.',
    etkiInsan: 'Toprak altında kalma, boğulma, ağır travma.', etkiCevre: '-', etkiTesis: 'Yapısal hasar, iş durması.',
    ilk1Dk: 'Kazı alanındaki tüm personel derhal ve hızlıca tahliye olur, göçük bölgesine kimse girmez.', ilk5Dk: 'Alan güvenlik şeridiyle geniş çevrelenir, kayıp/mahsur kalan personel sayımı yapılır.', ilk15Dk: 'İtfaiye/AFAD arama-kurtarma ekibi çağrılır, ek göçük riski değerlendirilmeden hiçbir kurtarma girişiminde bulunulmaz.',
    alarmIhbarYontemi: 'Görsel tespit + düdük/siren.', tahliyeKarari: 'Kısmi Tahliye', toplanmaAlani: 'Kazı alanından güvenli mesafede, şantiye girişi.',
    guvenliDurdurmaNoktalari: 'Kazı alanına yakın ağır ekipman (vinç, ekskavatör) çalışması durdurulur.', kkd: 'Baret.',
    mudahaleSiniri: 'Göçük altında kalan olması durumunda EĞİTİMSİZ PERSONEL KESİNLİKLE MÜDAHALE ETMEZ; ek göçük riski taşıdığından kurtarma yalnızca itfaiye/AFAD arama-kurtarma ekibi tarafından yapılır.', disKurumBildirimi: 'İtfaiye, AFAD.',
    enKotuSenaryoMu: true },

  { tesisTuru: 'İnşaat Sahası', kategori: 'İnsan Kaynaklı', tur: 'Diğer', baslik: 'Vinç / Kule Vinç Devrilmesi veya Yük Düşmesi',
    olayinTanimi: 'Kule vincin devrilmesi veya taşınan yükün düşmesi.', muhtemelNedenler: 'Rüzgar hızı sınırının aşılması, azami yük kapasitesinin aşılması, hatalı bağlama (rigging), zemin/temel yetersizliği, bakım eksikliği.',
    ilkBelirtiTespit: 'Anormal ses/titreşim, operatörün alarm vermesi, görsel devrilme/düşme.', tehlikeKaynaklari: 'Devrilen vinç gövdesi, düşen yük.', etkilenecekAlanlar: 'Vinç çalışma yarıçapı ve devrilme yönü.',
    etkiInsan: 'Ezilme, çoklu ağır yaralanma/ölüm riski.', etkiCevre: '-', etkiTesis: 'Ekipman ve çevredeki yapı hasarı, uzun süreli iş durması.',
    ilk1Dk: 'Vinç çalışma alanındaki tüm personel derhal uzaklaşır, operatöre ve çevredeki ekiplere anons/düdükle uyarı yapılır.', ilk5Dk: 'Alan geniş çapta çevrelenir, yaralı varsa İlk Yardım ekibi ve ambulans çağrılır.', ilk15Dk: 'Şantiye şefi/İSG uzmanı olay yerine gelir, vincin/yükün stabilitesi değerlendirilmeden alana girilmez.',
    alarmIhbarYontemi: 'Görsel tespit + düdük/siren + telsiz.', tahliyeKarari: 'Kısmi Tahliye', toplanmaAlani: 'Vinç devrilme/düşme yönünden uzak, güvenli alan.',
    guvenliDurdurmaNoktalari: 'Vinç ana enerji beslemesi.', kkd: 'Baret.',
    mudahaleSiniri: 'Enkaz/yük altında kalan olması durumunda yalnızca itfaiye/AFAD kurtarma ekibi müdahale eder; vincin tekrar stabilize edilmesi yalnızca uzman teknik ekip tarafından yapılır.', disKurumBildirimi: 'İtfaiye, AFAD, gerekiyorsa 112.' },

  // ---- OFİS ----
  { tesisTuru: 'Ofis', kategori: 'Yangın', tur: 'Yangın', baslik: 'Ofis Yangını (Elektrik/Mutfak Kaynaklı)',
    olayinTanimi: 'Elektrik kontağı veya mutfak/çay ocağı kaynaklı, ofis alanında başlayan yangın.', muhtemelNedenler: 'Aşırı yüklenmiş priz/uzatma kablosu, arızalı elektrikli cihaz, mutfak ocağının başıboş bırakılması.',
    ilkBelirtiTespit: 'Duman kokusu/görüntüsü, duman dedektörü alarmı.', tehlikeKaynaklari: 'Alevlenen kablo/cihaz/malzeme, yayılan duman.', etkilenecekAlanlar: 'Başladığı ofis katı/bölümü, duman yayılımıyla diğer katlar.',
    etkiInsan: 'Duman inhalasyonu, yanık.', etkiCevre: '-', etkiTesis: 'Ofis ekipmanı/döküman kaybı, faaliyet durması.',
    ilk1Dk: 'Yangını fark eden kişi alarm butonuna basar, güvenliyse ve eğitimliyse en yakın yangın tüpüyle başlangıç müdahalesi yapar.', ilk5Dk: 'Söndürülemiyorsa kapılar kapatılarak (yangını sınırlamak için) alan terk edilir, kat sorumluları tahliyeyi yönetir.', ilk15Dk: 'Toplanma alanında sayım yapılır, itfaiyeye bina planı/yangının konumu hakkında bilgi verilir.',
    alarmIhbarYontemi: 'Yangın alarm butonu/sistemi + kat anonsu.', tahliyeKarari: 'Tam Tahliye', toplanmaAlani: 'Bina dışı, önceden belirlenmiş toplanma alanı.',
    guvenliDurdurmaNoktalari: 'Kat/bölüm elektrik panosu.', kkd: '-',
    mudahaleSiniri: 'Sadece küçük/başlangıç aşamasındaki yangına eğitimli personel müdahale eder; duman yoğunlaşırsa veya yangın büyürse derhal tahliye edilir, söndürme itfaiyeye bırakılır.', disKurumBildirimi: 'İtfaiye (110/112).' },

  { tesisTuru: 'Ofis', kategori: 'Güvenlik', tur: 'Diğer', baslik: 'Bina Tahliyesini Gerektiren Dış Tehdit',
    olayinTanimi: 'Bina/ofise yönelik bir tehdit ihbarı (bomba ihbarı, şüpheli kişi) alınması.', muhtemelNedenler: 'Kasıtlı tehdit, taciz amaçlı sahte ihbar.',
    ilkBelirtiTespit: 'Telefon/e-posta ile tehdit ihbarı, resepsiyon/güvenlik personelinin şüpheli durumu fark etmesi.', tehlikeKaynaklari: 'Doğrulanmamış tehdidin kendisi, tahliye sırasında panik.', etkilenecekAlanlar: 'Tüm bina.',
    etkiInsan: 'Panik kaynaklı yaralanma (asıl tehdit doğrulanırsa çok daha ciddi).', etkiCevre: '-', etkiTesis: 'Faaliyet durması, güvenlik operasyonu süresi.',
    ilk1Dk: 'İhbarı alan kişi sakin kalıp mümkün olduğunca detay not eder (ses, arka plan, ifade), derhal güvenlik/yöneticiye bildirir.', ilk5Dk: 'Güvenlik/Koordinasyon Ekibi polise bilgi verir, tahliye kararını (polisle koordineli) alır.', ilk15Dk: 'Bina tahliye edilir, personel güvenli mesafede toplanma alanında bekler, polis binayı kontrol edene kadar geri girilmez.',
    alarmIhbarYontemi: 'Güvenlik anonsu, gerekiyorsa yangın alarmıyla aynı sistem kullanılır.', tahliyeKarari: 'Tam Tahliye', toplanmaAlani: 'Binadan güvenli/geniş mesafede alan (polis yönlendirmesine göre değişebilir).',
    guvenliDurdurmaNoktalari: '-', kkd: '-',
    mudahaleSiniri: 'Hiçbir personel şüpheli kişi/cisimle ilgilenmez veya araştırma yapmaz; tüm karar ve müdahale polise aittir.', disKurumBildirimi: '155 Polis İmdat (112).' },

  // ---- AVM ----
  { tesisTuru: 'AVM', kategori: 'Yangın', tur: 'Yangın', baslik: 'Mağaza Kaynaklı Yangın ve Duman Yayılımı',
    olayinTanimi: 'AVM içindeki bir mağaza/birimde başlayan ve duman yoluyla ortak alanlara yayılan yangın.', muhtemelNedenler: 'Elektrik arızası, mağaza içi ekipman/malzeme tutuşması.',
    ilkBelirtiTespit: 'Duman dedektörü/sprinkler alarmı, görsel duman.', tehlikeKaynaklari: 'Alev, yoğun duman (asıl can kaybı riski çoğunlukla dumandan kaynaklanır).', etkilenecekAlanlar: 'Başladığı mağaza, ortak yürüyüş alanları, üst katlar (duman yayılımıyla).',
    etkiInsan: 'Duman inhalasyonu, kalabalıkta panik/ezilme, yanık.', etkiCevre: '-', etkiTesis: 'Mağaza/ortak alan hasarı, itibar kaybı.',
    ilk1Dk: 'Alarmla birlikte duman tahliye sistemi/sprinkler devreye girer; mağaza personeli güvenliyse başlangıç müdahalesi yapar, aksi halde derhal terk eder.', ilk5Dk: 'Anons sistemiyle ziyaretçiler PANİK YARATMAYACAK sakin bir dille en yakın çıkışa yönlendirilir; asansörler kullanım dışı bırakılır.', ilk15Dk: 'Güvenlik ekipleri kat kat kontrol yaparak kimse kalmadığından emin olur, itfaiyeye yangının konumu/büyüklüğü bildirilir.',
    alarmIhbarYontemi: 'Otomatik yangın algılama sistemi + genel anons.', tahliyeKarari: 'Tam Tahliye', toplanmaAlani: 'AVM dışı, geniş açık alan(lar) — otopark girişlerinden uzak.',
    guvenliDurdurmaNoktalari: 'Mağazanın elektrik/gaz (varsa) beslemesi.', kkd: '-',
    mudahaleSiniri: 'Yalnızca eğitimli AVM güvenlik/yangın ekibi başlangıç müdahalesi yapar; büyüyen yangında herkes tahliye olur, söndürme itfaiyeye bırakılır.', disKurumBildirimi: 'İtfaiye, polis (kalabalık yönetimi için gerekirse).' },

  { tesisTuru: 'AVM', kategori: 'İnsan Kaynaklı', tur: 'Diğer', baslik: 'Otopark / Araç Yangını',
    olayinTanimi: 'Kapalı veya açık otopark alanında bir aracın yanması.', muhtemelNedenler: 'Araç elektrik/yakıt sistemi arızası, çarpışma.',
    ilkBelirtiTespit: 'Duman/alev görüntüsü, otopark duman dedektörü alarmı.', tehlikeKaynaklari: 'Yanan araç, yoğun duman (kapalı otoparkta hızla birikir), komşu araçlara sıçrama.', etkilenecekAlanlar: 'Yangının olduğu otopark katı/bölümü.',
    etkiInsan: 'Duman inhalasyonu, panik.', etkiCevre: '-', etkiTesis: 'Otopark yapısı/komşu araç hasarı.',
    ilk1Dk: 'Bölgedeki kişiler derhal otoparkı terk eder, güvenlik/söndürme ekibine haber verilir.', ilk5Dk: 'Otopark duman tahliye/havalandırma sistemi devreye alınır, erişilebilirse yangın söndürme sistemi (sprinkler) çalışır durumda olduğu teyit edilir.', ilk15Dk: 'İlgili otopark katı/bölümü tahliye edilir, itfaiye yönlendirilir.',
    alarmIhbarYontemi: 'Otopark duman dedektörü + anons.', tahliyeKarari: 'Kısmi Tahliye', toplanmaAlani: 'Otopark dışı, AVM ana toplanma alanı.',
    guvenliDurdurmaNoktalari: '-', kkd: '-',
    mudahaleSiniri: 'Personel araç yangınına doğrudan müdahale etmez (yakıt tankı patlama riski); alan tahliye edilip itfaiye beklenir.', disKurumBildirimi: 'İtfaiye.' },

  // ---- HASTANE ----
  { tesisTuru: 'Hastane', kategori: 'Yangın', tur: 'Patlama', baslik: 'Tıbbi Gaz (Oksijen) Tesisatı/Tüpü Kaynaklı Yangın veya Patlama',
    olayinTanimi: 'Oksijen tesisatı, tüp deposu veya hasta başı oksijen hattında kaçak/yangın.', muhtemelNedenler: 'Tesisat arızası, tüpün yanlış depolanması, açık ateş/kaynak işleminin yakınında yapılması.',
    ilkBelirtiTespit: 'Oksijen alarmı, yangın/duman, tüp deposunda anormal ses.', tehlikeKaynaklari: 'Yüksek oksijen konsantrasyonunun yangını hızlandırması, tüp patlama riski.', etkilenecekAlanlar: 'Tüp deposu, ilgili servis/oda, tesisat güzergahı.',
    etkiInsan: 'Yanık, patlama halinde ağır yaralanma; oksijene bağımlı hastalar için hayati risk.', etkiCevre: '-', etkiTesis: 'Tesisat/bina hasarı, kritik gaz beslemesi kaybı.',
    ilk1Dk: 'Açık ateş/elektrikli cihaz kaynaktan uzaklaştırılır, mümkünse ilgili bölümün oksijen ana vanası eğitimli personelce kapatılır.', ilk5Dk: 'Etkilenen alan tahliye edilir, oksijene bağımlı hastalar taşınabilir tüple desteklenir, İlk Yardım/Söndürme ekibi yönlendirilir.', ilk15Dk: 'İtfaiye bilgilendirilir, alternatif oksijen kaynağı (taşınabilir tüp/yedek hat) devreye alınır.',
    alarmIhbarYontemi: 'Tesisat alarmı + kod anonsu.', tahliyeKarari: 'Kısmi Tahliye', toplanmaAlani: 'Etkilenen bölümden uzak, komşu bölüm/kompartıman.',
    guvenliDurdurmaNoktalari: 'İlgili bölümün/katın oksijen ana izolasyon vanası.', kkd: 'Standart yangın KKD\'si.',
    mudahaleSiniri: 'Ana gaz vanasını yalnızca eğitimli teknik personel kapatır; oksijen ortamında AÇIK ATEŞLE müdahale edilmez.', disKurumBildirimi: 'İtfaiye, tıbbi gaz tedarikçisi acil hattı.',
    enKotuSenaryoMu: true },

  { tesisTuru: 'Hastane', kategori: 'Proses', tur: 'Diğer', baslik: 'Jeneratör / Kesintisiz Güç Kaynağı Arızası',
    olayinTanimi: 'Şehir elektriği kesintisinde yedek jeneratör veya UPS sisteminin devreye girmemesi/arızalanması.', muhtemelNedenler: 'Jeneratör bakım eksikliği, yakıt yetersizliği, UPS batarya arızası, otomatik transfer switch hatası.',
    ilkBelirtiTespit: 'Kritik cihazların (ventilatör, monitör) alarm vermesi/durması, aydınlatma kesintisi.', tehlikeKaynaklari: 'Kritik yaşam destek cihazlarının güç kaybı.', etkilenecekAlanlar: 'Yoğun bakım, ameliyathane, acil servis, yenidoğan.',
    etkiInsan: 'Yaşam destek cihazına bağımlı hastalar için hayati risk.', etkiCevre: '-', etkiTesis: 'Kritik operasyonların durması.',
    ilk1Dk: 'Teknik ekip derhal jeneratör/UPS arızasına müdahale eder, kritik hastalardaki cihazlar (varsa) taşınabilir bataryaya/manuel desteğe alınır.', ilk5Dk: 'Ameliyathanede işlem varsa manuel havalandırma/aydınlatma devreye alınır, hasta güvenliği önceliklendirilir.', ilk15Dk: 'Arıza giderilemiyorsa kritik hastaların komşu güçlü üniteye/hastaneye nakli değerlendirilir.',
    alarmIhbarYontemi: 'Cihaz alarmları + teknik servis çağrısı.', tahliyeKarari: 'Yerinde Sığınma', toplanmaAlani: 'Tahliye gerekmez, hasta başında müdahale edilir.',
    guvenliDurdurmaNoktalari: '-', kkd: '-',
    mudahaleSiniri: 'Elektrik/jeneratör müdahalesi yalnızca teknik personel tarafından yapılır; sağlık personeli hasta güvenliğine odaklanır.', disKurumBildirimi: 'Gerekiyorsa elektrik dağıtım şirketi, jeneratör bakım firması.' },

  // ---- DEPO / LOJİSTİK ----
  { tesisTuru: 'Depo/Lojistik Merkezi', kategori: 'İnsan Kaynaklı', tur: 'Diğer', baslik: 'Raf / İstif Çökmesi',
    olayinTanimi: 'Yüksek raf sisteminin veya istiflenmiş malzemenin devrilip çökmesi.', muhtemelNedenler: 'Azami yük kapasitesi aşımı, forklift çarpması, hatalı istifleme, raf yapısal hasarı.',
    ilkBelirtiTespit: 'Anormal ses (gıcırtı/çatırtı), görsel eğilme, çökme sesi.', tehlikeKaynaklari: 'Devrilen raf/malzeme kütlesi.', etkilenecekAlanlar: 'Çöken raf koridoru ve komşu koridorlar.',
    etkiInsan: 'Ezilme, ağır yaralanma, altında kalma.', etkiCevre: '-', etkiTesis: 'Stok kaybı, raf sistemi hasarı, uzun süreli koridor kapanması.',
    ilk1Dk: 'Koridordaki personel derhal uzaklaşır, forklift/istif makineleri durdurulur.', ilk5Dk: 'Bölge çevrelenir, kayıp/mahsur kalan personel sayımı yapılır, İlk Yardım ekibi hazır bulundurulur.', ilk15Dk: 'Ek çökme riski değerlendirilmeden enkaza girilmez, gerekiyorsa itfaiye/kurtarma ekibi çağrılır.',
    alarmIhbarYontemi: 'Görsel/işitsel tespit + telsiz bildirim.', tahliyeKarari: 'Kısmi Tahliye', toplanmaAlani: 'Çöken koridordan uzak depo alanı.',
    guvenliDurdurmaNoktalari: '-', kkd: 'Baret.',
    mudahaleSiniri: 'Altında kalan olması durumunda eğitimsiz personel enkaza girmez; kurtarma yalnızca itfaiye/eğitimli Kurtarma Ekibi tarafından, ek çökme riski değerlendirilerek yapılır.', disKurumBildirimi: 'İtfaiye, gerekiyorsa 112.' },

  { tesisTuru: 'Depo/Lojistik Merkezi', kategori: 'Kimyasal', tur: 'Kimyasal Yayılım', baslik: 'Tehlikeli Madde (ADR) Sızıntısı',
    olayinTanimi: 'Depolanan veya sevkiyat bekleyen ADR kapsamındaki tehlikeli bir yükün ambalajından sızıntı.', muhtemelNedenler: 'Ambalaj hasarı, yükleme/boşaltma sırasında düşürme, taşıma hasarı.',
    ilkBelirtiTespit: 'Görsel sızıntı, koku, ambalaj üzerindeki tehlike etiketi/ADR işareti.', tehlikeKaynaklari: 'Sızan maddenin niteliğine göre değişir (yanıcı, toksik, aşındırıcı, oksitleyici vb.) — sevkiyat evrakı/etiketi kontrol edilir.', etkilenecekAlanlar: 'Sızıntı noktası ve etrafı.',
    etkiInsan: 'Maddenin türüne göre tahriş, zehirlenme, yanık.', etkiCevre: 'Toprak/su kirliliği riski.', etkiTesis: 'Depolama alanının kısmen kullanım dışı kalması.',
    ilk1Dk: 'Alan derhal çevrelenir, kimse sızıntıya dokunmaz/üzerinde yürümez, sevkiyat evrakından/etiketten madde tanımlanmaya çalışılır.', ilk5Dk: 'GBF (varsa) veya ADR tehlike numarasına göre uygun müdahale kiti kullanılır, havalandırma sağlanır.', ilk15Dk: 'Madde tanımlanamıyorsa veya yüksek riskli ise itfaiye kimyasal müdahale ekibi beklenir, alan güvenlik şeridiyle işaretlenir.',
    alarmIhbarYontemi: 'Görsel tespit + telsiz bildirim.', tahliyeKarari: 'Kısmi Tahliye', toplanmaAlani: 'Sızıntı noktasından rüzgar üstü/uzak alan.',
    guvenliDurdurmaNoktalari: '-', kkd: 'Madde tanımlanana kadar genel kimyasal KKD (eldiven, gözlük); tanımlandıktan sonra GBF\'ye uygun KKD.',
    mudahaleSiniri: 'Madde/tehlike sınıfı tanımlanmadan doğrudan temizlik müdahalesi yapılmaz; belirsiz/yüksek riskli maddelerde itfaiye beklenir.', disKurumBildirimi: 'İtfaiye, gerekiyorsa çevre il müdürlüğü.' },

  // ---- KALAN SEKTÖRLER (1'er başlangıç kartı) ----
  { tesisTuru: 'Amonyak Tesisi', kategori: 'Kimyasal', tur: 'Amonyak Kaçağı', baslik: 'Büyük Amonyak Kaçağı (Tank/Ana Hat)',
    olayinTanimi: 'Ana depolama tankı veya ana transfer hattında büyük hacimli amonyak kaçağı.', muhtemelNedenler: 'Tank/hat bütünlüğü kaybı, aşırı basınç, mekanik hasar, transfer hatası.',
    ilkBelirtiTespit: 'Sabit gaz dedektörü alarmı, büyük buhar bulutu, keskin koku.', tehlikeKaynaklari: 'Toksik ve belirli konsantrasyonda yanıcı amonyak gazı bulutu.', etkilenecekAlanlar: 'Geniş tesis alanı, rüzgar altı yönünde komşu tesisler/yerleşim.',
    etkiInsan: 'Boğulma, ağır solunum hasarı, ölüm riski.', etkiCevre: 'Geniş alan hava/su/toprak kontaminasyonu.', etkiTesis: 'Uzun süreli tam duruş.',
    ilk1Dk: 'Tüm personel derhal rüzgar üstü yöne, planlanan sığınma/tahliye noktasına yönlendirilir.', ilk5Dk: 'Kimyasal Müdahale Ekibi (tam SCBA ile) mümkünse uzaktan kumandalı/uzak vana ile kaynağı izole etmeye çalışır.', ilk15Dk: 'Etki alanı modellemesi (rüzgar yönü/hızına göre) yapılır, AFAD ve komşu tesisler/yerleşim derhal uyarılır.',
    alarmIhbarYontemi: 'Sabit gaz dedektörü otomatik alarmı + tesis geneli siren + dış uyarı sistemi (varsa).', tahliyeKarari: 'Tam Tahliye', toplanmaAlani: 'Rüzgar üstü, tesisten yeterli mesafede önceden belirlenmiş alan.',
    guvenliDurdurmaNoktalari: 'Ana tank izolasyon vanası, transfer pompaları.', kkd: 'Gaz geçirmez kimyasal koruyucu elbise, SCBA.',
    mudahaleSiniri: 'Kaynağa müdahale SADECE sertifikalı Kimyasal Müdahale Ekibi/itfaiye tarafından yapılır.', disKurumBildirimi: 'İtfaiye, AFAD, çevre il müdürlüğü, komşu tesisler/yerleşim.', enKotuSenaryoMu: true },

  { tesisTuru: 'Rafineri/Petrokimya Tesisi', kategori: 'Patlama', tur: 'Patlama', baslik: 'Hidrokarbon Buhar Bulutu Patlaması',
    olayinTanimi: 'Sızan yanıcı hidrokarbon gazı/buharının bir tutuşturucu kaynakla teması sonucu patlaması.', muhtemelNedenler: 'Proses hattı/flanş kaçağı, statik elektrik, sıcak yüzey, kaynak/kesme kıvılcımı.',
    ilkBelirtiTespit: 'Gaz dedektörü alarmı, karakteristik koku, patlama sesi/basınç dalgası.', tehlikeKaynaklari: 'Patlama basınç dalgası, sonrasında oluşan yangın (jet fire/tank yangını).', etkilenecekAlanlar: 'Proses ünitesi ve geniş güvenlik çemberi.',
    etkiInsan: 'Basınç dalgası travması, yanık, ölüm riski.', etkiCevre: 'Yangın/duman kaynaklı hava kirliliği.', etkiTesis: 'Ağır yapısal/ekipman hasarı, uzun süreli tam duruş.',
    ilk1Dk: 'Tüm personel derhal en yakın sığınma noktasına veya rüzgar üstü tahliye güzergahına yönlendirilir.', ilk5Dk: 'Etkilenen ünite acil stopla devre dışı bırakılır (mümkünse uzaktan), yangın söndürme sistemi (sabit monitörler) devreye alınır.', ilk15Dk: 'İtfaiye ve AFAD yönlendirilir, komşu üniteler/tesisler soğutulur (ısı yayılımına karşı), etki alanı genişletilerek değerlendirilir.',
    alarmIhbarYontemi: 'Sabit gaz dedektörü + basınç sensörü alarmı + tesis geneli siren.', tahliyeKarari: 'Tam Tahliye', toplanmaAlani: 'Tesisten yeterli güvenlik mesafesinde, önceden belirlenmiş sığınma/toplanma noktası.',
    guvenliDurdurmaNoktalari: 'Etkilenen ünitenin acil stop sistemi, ana besleme vanaları.', kkd: 'Alevlenmeyen (FR) tulum, SCBA (yangın/duman bölgesinde).',
    mudahaleSiniri: 'Sahaya müdahale yalnızca tesis itfaiyesi/profesyonel itfaiye ekipleri tarafından yapılır; diğer personel derhal tahliye olur.', disKurumBildirimi: 'İtfaiye, AFAD, komşu tesisler.', enKotuSenaryoMu: true },

  { tesisTuru: 'Otel', kategori: 'Yangın', tur: 'Yangın', baslik: 'Otel Yangını (Gece Saatinde Misafir Tahliyesi)',
    olayinTanimi: 'Otel odası/ortak alanda başlayan, çoğunlukla uyuyan misafirlerin bulunduğu gece saatlerinde tahliye gerektiren yangın.', muhtemelNedenler: 'Sigara, elektrikli cihaz arızası, mutfak kaynaklı yangının yayılması.',
    ilkBelirtiTespit: 'Duman dedektörü/sprinkler alarmı.', tehlikeKaynaklari: 'Alev, koridor/merdivenlerde duman yayılımı (gece uyuyan misafirler için gecikmeli fark edilme riski).', etkilenecekAlanlar: 'Başladığı kat ve duman yoluyla diğer katlar.',
    etkiInsan: 'Duman inhalasyonu (özellikle uykuda fark edilmede gecikme nedeniyle), panik.', etkiCevre: '-', etkiTesis: 'Oda/kat hasarı, itibar kaybı.',
    ilk1Dk: 'Resepsiyon/gece nöbetçisi alarmı doğrular, kat kat kapı kapı misafirleri uyandırıp tahliyeye yönlendirir (anons + fiziksel uyarı).', ilk5Dk: 'Asansörler kullanım dışı bırakılır, misafirler merdivenlerle en yakın çıkışa yönlendirilir, oda numarası bazlı kontrol listesi tutulur.', ilk15Dk: 'Toplanma alanında misafir/personel sayımı yapılır (rezervasyon listesiyle karşılaştırılır), itfaiyeye eksik oda bilgisi verilir.',
    alarmIhbarYontemi: 'Otomatik yangın algılama sistemi + kat kat sözlü uyarı (gece için kritik).', tahliyeKarari: 'Tam Tahliye', toplanmaAlani: 'Otel dışı, önceden belirlenmiş toplanma alanı.',
    guvenliDurdurmaNoktalari: 'İlgili katın elektrik/gaz beslemesi.', kkd: '-',
    mudahaleSiniri: 'Personel yalnızca başlangıç aşamasındaki yangına müdahale eder; misafir güvenliği/tahliyesi söndürmeden önceliklidir.', disKurumBildirimi: 'İtfaiye.' },

  { tesisTuru: 'Okul/Eğitim Tesisi', kategori: 'Fiziksel', tur: 'Deprem', baslik: 'Deprem Sırasında Öğrenci Tahliyesi',
    olayinTanimi: 'Ders saatinde meydana gelen depremde çok sayıda öğrencinin güvenli şekilde tahliyesi ihtiyacı.', muhtemelNedenler: 'Doğal sismik aktivite.',
    ilkBelirtiTespit: 'Yer sarsıntısının hissedilmesi.', tehlikeKaynaklari: 'Devrilen sınıf eşyası, panik kaynaklı izdiham, yapısal hasar.', etkilenecekAlanlar: 'Tüm okul binası.',
    etkiInsan: 'Düşen cisimlerden yaralanma, panik/izdiham kaynaklı yaralanma.', etkiCevre: '-', etkiTesis: 'Yapısal hasar.',
    ilk1Dk: 'Öğretmen sınıfta "Çök-Kapan-Tutun" tatbikatını yönetir; öğrenciler sıra/masa altına sığınır, dışarı koşulmaz.', ilk5Dk: 'Sarsıntı bitince öğretmen sınıfı sayarak koridor/merdivenden (asansörsüz) sıra halinde tahliye eder.', ilk15Dk: 'Her sınıf kendi toplanma noktasında öğretmeniyle birlikte toplanır, sınıf listesiyle sayım yapılıp okul yönetimine bildirilir; veli teslim prosedürü başlatılır.',
    alarmIhbarYontemi: 'Sismik his + zil/anons sistemi.', tahliyeKarari: 'Tam Tahliye', toplanmaAlani: 'Okul bahsesi/sahası, bina cephesinden uzak açık alan.',
    guvenliDurdurmaNoktalari: 'Okul ana elektrik/gaz vanası.', kkd: '-',
    mudahaleSiniri: 'Öğretmenler sınıflarından sorumludur, öğrencileri tek başına bırakmaz; yapısal değerlendirme yetkili/itfaiye onayı gerektirir.', disKurumBildirimi: 'AFAD, itfaiye, İlçe Milli Eğitim Müdürlüğü.' },

  { tesisTuru: 'Laboratuvar', kategori: 'Kimyasal', tur: 'Kimyasal Yayılım', baslik: 'Kimyasal Reaksiyon / Döküntü',
    olayinTanimi: 'Laboratuvar ortamında kontrolsüz bir kimyasal reaksiyon veya madde dökülmesi.', muhtemelNedenler: 'Uyumsuz kimyasalların karışması, prosedür hatası, cam malzeme kırılması.',
    ilkBelirtiTespit: 'Duman/buhar çıkışı, koku, görsel döküntü, yangın.', tehlikeKaynaklari: 'Toksik/aşındırıcı/yanıcı buhar veya sıvı, olası yangın.', etkilenecekAlanlar: 'Laboratuvar odası ve havalandırma sistemine bağlı alanlar.',
    etkiInsan: 'Solunum/cilt/göz maruziyeti, yanık.', etkiCevre: 'Atık su/hava yoluyla sınırlı yayılım riski.', etkiTesis: 'Ekipman/numune kaybı.',
    ilk1Dk: 'Etkilenen kişi derhal göz duşu/acil duş ile arındırılır (gerekiyorsa); laboratuvar tahliye edilir, kapı kapatılır.', ilk5Dk: 'Havalandırma/duman tahliye sistemi devreye alınır (varsa), GBF\'den madde bilgisi kontrol edilir.', ilk15Dk: 'Uygun KKD ile döküntü müdahale kiti kullanılır veya itfaiye kimyasal müdahale ekibi beklenir (madde yüksek riskliyse).',
    alarmIhbarYontemi: 'Sözlü bildirim + laboratuvar sorumlusuna haber verme.', tahliyeKarari: 'Kısmi Tahliye', toplanmaAlani: 'Laboratuvar dışı, bina içinde güvenli alan.',
    guvenliDurdurmaNoktalari: 'Gaz/elektrik ana vanası-şalteri.', kkd: 'Laboratuvar önlüğü, kimyasal gözlük, uygun eldiven.',
    mudahaleSiniri: 'Madde tanımlanamıyorsa veya yüksek riskliyse müdahale itfaiyeye bırakılır; laboratuvar sorumlusu onayı olmadan tekrar girilmez.', disKurumBildirimi: 'Gerekiyorsa itfaiye, Zehir Danışma Merkezi.' },

  { tesisTuru: 'Atölye', kategori: 'İnsan Kaynaklı', tur: 'Diğer', baslik: 'Makine Kazası (Sıkışma/Kesilme)',
    olayinTanimi: 'Atölyedeki bir tezgah/makineye çalışanın sıkışması veya kesici bir aletle yaralanması.', muhtemelNedenler: 'Makine koruyucusunun çıkarılmış olması, dikkatsizlik, eğitim eksikliği, acil durdurma butonuna erişememe.',
    ilkBelirtiTespit: 'Çığlık/yardım çağrısı, makine anormal ses/durma.', tehlikeKaynaklari: 'Dönen/kesen makine parçaları.', etkilenecekAlanlar: 'Makinenin bulunduğu alan.',
    etkiInsan: 'Kesik, ezilme, uzuv kaybı riski.', etkiCevre: '-', etkiTesis: 'İş durması, makine hasarı.',
    ilk1Dk: 'Makine ACİL DURDURMA BUTONUYLA derhal durdurulur; kazazede makineden zorla çekilmez.', ilk5Dk: 'İlk Yardım ekibi ve ambulans çağrılır, kanama varsa baskı uygulanır, kazazede sakinleştirilir.', ilk15Dk: 'Makine enerjisi tamamen kesilir (LOTO), ambulans gelene kadar kazazede izlenir, olay yeri korunur.',
    alarmIhbarYontemi: 'Sözlü/telsiz bildirim.', tahliyeKarari: 'Yerinde Sığınma', toplanmaAlani: 'Olay bölgesi çevrelenir.',
    guvenliDurdurmaNoktalari: 'İlgili makinenin acil durdurma butonu/enerji şalteri.', kkd: 'Eldiven (kan/vücut sıvısı teması için).',
    mudahaleSiniri: 'Sadece İlk Yardım eğitimli personel müdahale eder; makineden ayırma/kurtarma işlemi teknik bilgi gerektiriyorsa itfaiye/teknik ekip beklenir.', disKurumBildirimi: '112 Acil Çağrı Merkezi.' },

  { tesisTuru: 'Liman', kategori: 'Kimyasal', tur: 'Diğer', baslik: 'Gemi Kaynaklı Kimyasal/Yakıt Sızıntısı',
    olayinTanimi: 'Yanaşmış bir geminin yakıt ikmali veya yük elleçlemesi sırasında kimyasal/yakıt sızıntısı.', muhtemelNedenler: 'Hortum/bağlantı arızası, taşma, gemi-rıhtım ekipman hatası.',
    ilkBelirtiTespit: 'Görsel sızıntı (deniz yüzeyinde yayılma), koku.', tehlikeKaynaklari: 'Yanıcı/kirletici madde, deniz yüzeyinde yayılım.', etkilenecekAlanlar: 'Rıhtım, gemi çevresi, deniz yüzeyi.',
    etkiInsan: 'Solunum tahrişi, kayma (rıhtımda), yangın riski.', etkiCevre: 'Deniz kirliliği (yüksek risk).', etkiTesis: 'Liman operasyonunun durması, temizlik maliyeti.',
    ilk1Dk: 'Transfer/elleçleme işlemi derhal durdurulur, alan çevrelenir, açık ateş/sigara kaynaklardan uzaklaştırılır.', ilk5Dk: 'Deniz yüzeyi bariyer (bum) ile çevrelenmeye çalışılır (liman kirlilik müdahale ekibi/kiti varsa), liman yönetimine ve gemi kaptanına bilgi verilir.', ilk15Dk: 'Çevre/kıyı emniyet otoritelerine bildirim yapılır, yayılımın büyüklüğüne göre ek müdahale ekipleri çağrılır.',
    alarmIhbarYontemi: 'Görsel tespit + telsiz bildirim.', tahliyeKarari: 'Kısmi Tahliye', toplanmaAlani: 'Rıhtımdan uzak liman alanı.',
    guvenliDurdurmaNoktalari: 'Transfer hattı/pompa acil stop.', kkd: 'Kimyasal eldiven, yüz siperi, gerekiyorsa can yeleği.',
    mudahaleSiniri: 'Deniz kirliliği müdahalesi liman kirlilik müdahale ekibi/Sahil Güvenlik koordinasyonunda yapılır; tek başına müdahale edilmez.', disKurumBildirimi: 'Sahil Güvenlik, liman başkanlığı, çevre il müdürlüğü, itfaiye.' },

  { tesisTuru: 'Akaryakıt/Depolama Tesisi', kategori: 'Yangın', tur: 'Yangın', baslik: 'Yakıt Tankı Yangını',
    olayinTanimi: 'Depolama tankında veya dolum/boşaltım sırasında yakıtın tutuşması.', muhtemelNedenler: 'Statik elektrik, sıcak yüzey/kıvılcım, taşma, tank bütünlüğü kaybı.',
    ilkBelirtiTespit: 'Görsel alev/duman, sabit yangın algılama sistemi alarmı.', tehlikeKaynaklari: 'Yanan yakıt, ısı yayılımı ile komşu tanklara sıçrama, buhar bulutu patlaması riski (dolum sırasında).', etkilenecekAlanlar: 'Tank sahası ve güvenlik mesafesi.',
    etkiInsan: 'Yanık, patlama halinde ağır yaralanma-ölüm.', etkiCevre: 'Yangın sonrası kirlilik, söndürme suyu drenajı.', etkiTesis: 'Tank/saha ağır hasarı, uzun süreli faaliyet durması.',
    ilk1Dk: 'Dolum/transfer işlemi derhal durdurulur, alandaki tüm personel güvenlik mesafesine tahliye olur.', ilk5Dk: 'Sabit köpük söndürme sistemi (varsa) devreye alınır, komşu tanklar soğutulmaya başlanır (tesis itfaiyesi varsa).', ilk15Dk: 'İtfaiye yönlendirilir, geniş güvenlik çemberi oluşturulur, AFAD ve çevre birimleri bilgilendirilir.',
    alarmIhbarYontemi: 'Sabit yangın algılama sistemi + tesis geneli siren.', tahliyeKarari: 'Tam Tahliye', toplanmaAlani: 'Tank sahasından çok geniş güvenlik mesafesinde alan.',
    guvenliDurdurmaNoktalari: 'Dolum/transfer pompaları acil stop; tank giriş-çıkış vanaları.', kkd: 'Standart yangın KKD\'si yetersizdir — müdahale itfaiyenin sorumluluğundadır.',
    mudahaleSiniri: 'Tesis içi söndürme ekibi yalnızca başlangıç/küçük yangında ve kendi güvenliği tehlikeye girmeden müdahale eder; büyüyen tank yangınına yalnızca profesyonel itfaiye (özel köpük ekipmanıyla) müdahale eder.', disKurumBildirimi: 'İtfaiye (acil), AFAD, çevre il müdürlüğü.', enKotuSenaryoMu: true },

  { tesisTuru: 'Konut/Toplu Kullanım Binası', kategori: 'Yangın', tur: 'Patlama', baslik: 'Doğalgaz Patlaması/Yangını',
    olayinTanimi: 'Dairede veya ortak tesisatta doğalgaz birikimi sonucu patlama veya yangın.', muhtemelNedenler: 'Tesisat kaçağı, kombi arızası, gaz vanasının açık unutulması, tesisat bakımsızlığı.',
    ilkBelirtiTespit: 'Gaz kokusu, patlama sesi, yangın.', tehlikeKaynaklari: 'Patlama basıncı, yangın, yapısal hasar (kolon/döşeme).', etkilenecekAlanlar: 'Patlamanın olduğu daire ve bina statiğini etkileyebilecek komşu bölümler.',
    etkiInsan: 'Ağır yaralanma, enkaz altında kalma riski.', etkiCevre: '-', etkiTesis: 'Ciddi yapısal hasar, oturulamaz hale gelme riski.',
    ilk1Dk: 'Gaz kokusu alınırsa elektrik anahtarına/prize KESİNLİKLE dokunulmaz, ortam havalandırılır, bina derhal terk edilir.', ilk5Dk: 'Bina yöneticisi/güvenlik doğalgaz acil hattını ve itfaiyeyi arar, bina girişindeki ana gaz vanası (biliniyorsa ve güvenliyse) kapatılır.', ilk15Dk: 'Sakinler toplanma alanında sayılır, itfaiye/gaz şirketi ekipleri gelene kadar kimse binaya geri girmez.',
    alarmIhbarYontemi: 'Koku fark edilmesi + bina yöneticisi/güvenlik anonsu.', tahliyeKarari: 'Tam Tahliye', toplanmaAlani: 'Binadan güvenli mesafede açık alan.',
    guvenliDurdurmaNoktalari: 'Bina ana doğalgaz vanası.', kkd: '-',
    mudahaleSiniri: 'Gaz kokusu alan hiç kimse elektrikli anahtar/zil kullanmaz veya açık ateş yakmaz; müdahale doğalgaz şirketi ve itfaiyeye bırakılır.', disKurumBildirimi: 'Doğalgaz Acil (187), itfaiye.' }
].map(s => acilDurumSenaryoSablonuOlustur(Object.assign({ kaynak: 'hazir', sahipId: null }, s)));

// ---- Ekip Tanımları ve Acil Durum Yönetim Yapısı ----

// Madde 10: her EKIP_TURLERI için bir "tanım" kaydı (ekipman/müdahale sınırı/
// haberleşme/görev/eğitim) — kişi ataması değil, ekip TÜRÜNÜN tanımıdır.
// Kişi ataması zaten ekipUyesiOlustur (ekip türü + kişi) ile yapılıyor.
function ekipTanimiOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    ekipTuru: EKIP_TURLERI.includes(veriler.ekipTuru) ? veriler.ekipTuru : EKIP_TURLERI[0],
    ekipmanListesi: Array.isArray(veriler.ekipmanListesi) ? veriler.ekipmanListesi : katilimcilariAyir(veriler.ekipmanListesi),
    mudahaleSiniri: (veriler.mudahaleSiniri || '').trim(),
    haberlesmeYontemi: (veriler.haberlesmeYontemi || '').trim(),
    gorevTanimi: (veriler.gorevTanimi || '').trim(),
    egitimGereksinimi: (veriler.egitimGereksinimi || '').trim(),
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}

// Madde 11: Acil Durum Yöneticisi -> Olay Komutanı -> (Yangın/Kurtarma/İlk
// Yardım/Tahliye/Teknik Müdahale/Güvenlik/Haberleşme). ustPozisyonAdi, bu
// sabit dizide "Standart Yapıyı Oluştur" ile tek seferde tüm ağacı kurmak
// için kullanılır (bkz. service.js komutaYapisiStandartOlustur); gerçek
// kayıtlarda ağaç ustPozisyonId (id referansı) ile tutulur.
const KOMUTA_POZISYON_SABLONU = [
  { pozisyonAdi: 'Acil Durum Yöneticisi', ustPozisyonAdi: null },
  { pozisyonAdi: 'Olay Komutanı', ustPozisyonAdi: 'Acil Durum Yöneticisi' },
  { pozisyonAdi: 'Yangın / Söndürme Sorumlusu', ustPozisyonAdi: 'Olay Komutanı' },
  { pozisyonAdi: 'Kurtarma Sorumlusu', ustPozisyonAdi: 'Olay Komutanı' },
  { pozisyonAdi: 'İlk Yardım Sorumlusu', ustPozisyonAdi: 'Olay Komutanı' },
  { pozisyonAdi: 'Tahliye Sorumlusu', ustPozisyonAdi: 'Olay Komutanı' },
  { pozisyonAdi: 'Teknik Müdahale Sorumlusu', ustPozisyonAdi: 'Olay Komutanı' },
  { pozisyonAdi: 'Güvenlik Sorumlusu', ustPozisyonAdi: 'Olay Komutanı' },
  { pozisyonAdi: 'Haberleşme Sorumlusu', ustPozisyonAdi: 'Olay Komutanı' }
];

function komutaPozisyonuOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    pozisyonAdi: (veriler.pozisyonAdi || '').trim(),
    ustPozisyonId: veriler.ustPozisyonId || null,
    personelId: veriler.personelId || '',
    personelAdi: (veriler.personelAdi || '').trim(),
    yedekPersonelId: veriler.yedekPersonelId || '',
    yedekPersonelAdi: (veriler.yedekPersonelAdi || '').trim(),
    vardiya: veriler.vardiya || 'Genel',
    telefon: (veriler.telefon || '').trim(),
    gorevYetki: (veriler.gorevYetki || '').trim(),
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}

// ---- Tahliye Planları (madde 9) ----

// Bina/kat bazlı tahliye planı kaydı — Saha Dijital Haritası'na
// haritaTesisId/haritaX/haritaY ile bağlanabilir (bkz. modules/harita/ui.js
// HARITA_DIS_KAYNAKLAR.acilDurumTahliye, aynı desen ekipman/yangın tüpünde
// olduğu gibi).
function tahliyeAlaniOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    tahliyeNo: veriler.tahliyeNo || '',
    binaAdi: (veriler.binaAdi || '').trim(),
    katBolum: (veriler.katBolum || '').trim(),
    konum: (veriler.konum || '').trim(),
    kacisYolu: (veriler.kacisYolu || '').trim(),
    alternatifKacisYolu: (veriler.alternatifKacisYolu || '').trim(),
    merdiven: (veriler.merdiven || '').trim(),
    cikis: (veriler.cikis || '').trim(),
    toplanmaAlani: (veriler.toplanmaAlani || '').trim(),
    sondurucuKonumu: (veriler.sondurucuKonumu || '').trim(),
    ilkYardimNoktasi: (veriler.ilkYardimNoktasi || '').trim(),
    acilDusKonumu: (veriler.acilDusKonumu || '').trim(),
    gazElektrikKesmeNoktasi: (veriler.gazElektrikKesmeNoktasi || '').trim(),
    alarmButonuKonumu: (veriler.alarmButonuKonumu || '').trim(),
    telefonKonumu: (veriler.telefonKonumu || '').trim(),
    tehlikeliAlanNotu: (veriler.tehlikeliAlanNotu || '').trim(),
    siginmaAlani: (veriler.siginmaAlani || '').trim(),
    krokiGorseli: veriler.krokiGorseli || '',
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString(),

    // Saha Dijital Haritası köprüsü — bkz. modules/acil-durum/ui.js
    // _ekipmanKonumAlaniCiz ile aynı desen.
    haritaTesisId: veriler.haritaTesisId || '',
    haritaX: veriler.haritaX !== undefined ? veriler.haritaX : '',
    haritaY: veriler.haritaY !== undefined ? veriler.haritaY : ''
  };
}

// ---- Kimyasal Ekleri (madde 12) ----

// modules/kimyasal envanterini KOPYALAMAZ — sadece kimyasalId ile referans
// verir (kimyasalAdiOnbellek, kimyasal kaydı silinse bile listede anlamsız
// kalmasın diye). Acil müdahaleye özel serbest metin alanları burada tutulur.
function kimyasalEkiOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    kimyasalId: veriler.kimyasalId || '',
    kimyasalAdiOnbellek: (veriler.kimyasalAdiOnbellek || '').trim(),
    ilkYardim: (veriler.ilkYardim || '').trim(),
    yanginlaMucadele: (veriler.yanginlaMucadele || '').trim(),
    dokulmeSizintiMudahalesi: (veriler.dokulmeSizintiMudahalesi || '').trim(),
    izolasyonMesafesi: (veriler.izolasyonMesafesi || '').trim(),
    solunumKorumasi: (veriler.solunumKorumasi || '').trim(),
    tahliyeSiginmaKriteri: (veriler.tahliyeSiginmaKriteri || '').trim(),
    atikYonetimi: (veriler.atikYonetimi || '').trim(),
    ruzgarYonuYayilimSenaryosu: (veriler.ruzgarYonuYayilimSenaryosu || '').trim(),
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}

// ---- Kroki Kontrolü (madde 21) ----

const KROKI_UNSUR_TURLERI = [
  'Kaçış Yolu', 'Acil Çıkış', 'Yangın Merdiveni', 'Yangın Söndürücü', 'Yangın Dolabı', 'Hidrant',
  'Yangın Alarm Butonu', 'İlk Yardım Noktası', 'Acil Duş', 'Göz Duşu', 'Gaz Dedektörü',
  'Elektrik Panosu', 'Ana Elektrik Kesici', 'Gaz/Kimyasal Vana', 'Toplanma Alanı', 'Acil Araç Girişi'
];

function krokiKontrolMaddesiOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    binaAlan: (veriler.binaAlan || '').trim(),
    unsurTuru: KROKI_UNSUR_TURLERI.includes(veriler.unsurTuru) ? veriler.unsurTuru : KROKI_UNSUR_TURLERI[0],
    mevcutMu: !!veriler.mevcutMu,
    eksiklikNotu: (veriler.eksiklikNotu || '').trim(),
    sorumlu: (veriler.sorumlu || '').trim(),
    termin: veriler.termin || '',
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}

// ---- Dış Kurumlar (madde 15) ----

const DIS_KURUM_TURLERI = [
  'İtfaiye', 'Sağlık (112/Ambulans)', 'Polis/Jandarma', 'AFAD',
  'Çevre ve Şehircilik İl Müdürlüğü', 'Gaz/Elektrik/Su Dağıtım Şirketi', 'Komşu Tesis', 'Diğer'
];

function disKurumOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    tur: DIS_KURUM_TURLERI.includes(veriler.tur) ? veriler.tur : DIS_KURUM_TURLERI[0],
    ad: (veriler.ad || '').trim(),
    telefon: (veriler.telefon || '').trim(),
    yetkiliKisi: (veriler.yetkiliKisi || '').trim(),
    koordinasyonNotu: (veriler.koordinasyonNotu || '').trim(),
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}

// ---- Öz Denetim (madde 23) ----

const OZ_DENETIM_CEVAP_SECENEKLERI = ['Evet', 'Hayır', 'Kısmen', 'Uygulanamaz'];

const ACIL_DURUM_OZ_DENETIM_SORULARI = [
  { id: 'plan_guncel', soru: 'Acil durum planı güncel mi ve son 1 yıl içinde gözden geçirildi mi?' },
  { id: 'ekip_atandi', soru: 'Arama-kurtarma, yangınla mücadele, ilk yardım ve tahliye ekipleri yazılı olarak atandı mı?' },
  { id: 'ekip_egitimli', soru: 'Ekip üyeleri görevleriyle ilgili eğitim aldı mı?' },
  { id: 'tatbikat_yapildi', soru: 'Son 12 ay içinde en az bir tatbikat gerçekleştirildi mi?' },
  { id: 'tatbikat_bulgulari_kapatildi', soru: 'Önceki tatbikat bulguları için düzeltici faaliyet tamamlandı mı?' },
  { id: 'kacis_yollari_acik', soru: 'Kaçış yolları ve acil çıkışlar her zaman açık ve işaretli mi?' },
  { id: 'toplanma_alanlari_belirli', soru: 'Toplanma alanları belirlenmiş, işaretlenmiş ve krokide gösterilmiş mi?' },
  { id: 'kroki_asili', soru: 'Kaçış planı krokileri tüm bölümlerde görünür şekilde asılı mı?' },
  { id: 'alarm_sistemi_calisir', soru: 'Yangın algılama/alarm sistemi periyodik olarak test ediliyor mu?' },
  { id: 'sondurme_ekipmani_kontrollu', soru: 'Yangın söndürme cihazları/dolapları periyodik kontrolden geçiriliyor mu?' },
  { id: 'acil_aydinlatma_calisir', soru: 'Acil aydınlatma ve yönlendirme sistemleri çalışır durumda mı?' },
  { id: 'ilkyardim_malzemesi_yeterli', soru: 'İlk yardım malzemeleri (dolap/çanta) yeterli ve son kullanma tarihi geçmemiş mi?' },
  { id: 'kkd_temin_edildi', soru: 'Acil durum müdahalesi için gerekli KKD ekiplere temin edildi mi?' },
  { id: 'dis_kurum_iletisimi_guncel', soru: 'Dış kurum (itfaiye, 112, AFAD vb.) iletişim bilgileri güncel mi?' },
  { id: 'kimyasal_sds_guncel', soru: 'Kimyasal madde SDS/Güvenlik Bilgi Formları güncel ve erişilebilir mi?' },
  { id: 'ozel_ihtiyac_plani_var', soru: 'Engelli/hareket kısıtlı/tek başına çalışan personel için özel tahliye düzenlemesi var mı?' },
  { id: 'gece_vardiyasi_duzenlemesi', soru: 'Gece vardiyası/az personelli saatler için ayrı acil durum düzenlemesi yapıldı mı?' },
  { id: 'elektrik_periyodik_kontrol', soru: 'Elektrik tesisatı ve topraklama periyodik kontrolleri güncel mi?' },
  { id: 'plan_calisanlara_duyuruldu', soru: 'Acil durum planı tüm çalışanlara ve alt işverenlere duyuruldu/eğitimi verildi mi?' },
  { id: 'eylem_plani_takip_ediliyor', soru: 'Önceki öz denetim/mevzuat uygunluk eksiklikleri için eylem planı takip ediliyor mu?' }
];

function ozDenetimOlustur(veriler) {
  const cevaplar = {};
  ACIL_DURUM_OZ_DENETIM_SORULARI.forEach(s => {
    const mevcut = (veriler.cevaplar || {})[s.id] || {};
    cevaplar[s.id] = {
      cevap: OZ_DENETIM_CEVAP_SECENEKLERI.includes(mevcut.cevap) ? mevcut.cevap : '',
      not: (mevcut.not || '').trim()
    };
  });
  return {
    cevaplar,
    guncellemeTarihi: veriler.guncellemeTarihi || new Date().toISOString()
  };
}

// ---- Eylem Planı (madde 24) ----

const EYLEM_KAYNAK_TURLERI = ['Öz Denetim', 'Tatbikat', 'Mevzuat Uygunluk', 'Kroki Kontrolü', 'Manuel'];
const EYLEM_ONCELIK_SEVIYELERI = ['Düşük', 'Orta', 'Yüksek', 'Kritik'];
const EYLEM_DURUMLARI = ['Açık', 'Devam Ediyor', 'Tamamlandı', 'İptal'];

function eylemPlaniMaddesiOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    eylemNo: veriler.eylemNo || '',
    kaynak: EYLEM_KAYNAK_TURLERI.includes(veriler.kaynak) ? veriler.kaynak : 'Manuel',
    referans: (veriler.referans || '').trim(),
    eksiklik: (veriler.eksiklik || '').trim(),
    risk: (veriler.risk || '').trim(),
    duzelticiFaaliyet: (veriler.duzelticiFaaliyet || '').trim(),
    sorumlu: (veriler.sorumlu || '').trim(),
    termin: veriler.termin || '',
    oncelik: EYLEM_ONCELIK_SEVIYELERI.includes(veriler.oncelik) ? veriler.oncelik : 'Orta',
    durum: EYLEM_DURUMLARI.includes(veriler.durum) ? veriler.durum : 'Açık',
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}

// ---- Mevzuat Uygunluk (madde 22) ----

const MEVZUAT_UYGUNLUK_DURUMLARI = ['Değerlendirilmedi', 'Uygun', 'Kısmen Uygun', 'Uygun Değil'];

// İlk açılışta otomatik yüklenen standart set (bkz. service.js
// mevzuatUygunlukGetirVeyaOlustur) — 6331 sayılı Kanun ve ilgili temel
// yönetmeliklerden acil durum yönetimiyle doğrudan ilgili maddeler.
const ACIL_DURUM_MEVZUAT_REFERANSLARI = [
  { id: 'md_6331_11', gereklilik: 'İşveren, ciddi ve yakın tehlike durumunda çalışanların işi bırakıp derhal güvenli bir yere gidebilmesini sağlar.', mevzuatStandart: '6331 s. Kanun m.11' },
  { id: 'md_6331_12', gereklilik: 'Acil durum planları hazırlanır, tahliye tatbikatları yapılır, arama-kurtarma/yangınla mücadele/ilk yardım ekipleri görevlendirilir.', mevzuatStandart: '6331 s. Kanun m.12' },
  { id: 'ady_ekip', gereklilik: 'Arama-kurtarma, yangınla mücadele ve ilk yardım ekipleri işyeri tehlike sınıfı ve çalışan sayısına uygun şekilde oluşturulur.', mevzuatStandart: 'İşyerlerinde Acil Durumlar Hakkında Yönetmelik m.11' },
  { id: 'ady_plan', gereklilik: 'Acil durum planı; tehlikelerin tanımlanması, olası etkilerin belirlenmesi, önleyici/sınırlandırıcı tedbirlerin belirlenmesiyle hazırlanır ve gerektiğinde yeniden gözden geçirilir.', mevzuatStandart: 'İşyerlerinde Acil Durumlar Hakkında Yönetmelik m.11-12' },
  { id: 'ady_tatbikat', gereklilik: 'Hazırlanan acil durum planı doğrultusunda yılda en az bir defa tatbikat yapılır, plan gözden geçirilerek gerekli düzeltmeler yapılır.', mevzuatStandart: 'İşyerlerinde Acil Durumlar Hakkında Yönetmelik m.11' },
  { id: 'ady_egitim', gereklilik: 'Ekip üyelerine görevlerine ilişkin özel eğitim verilir.', mevzuatStandart: 'İşyerlerinde Acil Durumlar Hakkında Yönetmelik m.11, Ek-2' },
  { id: 'byky_kacis', gereklilik: 'Kaçış yolları ve çıkışlar her zaman kullanıma hazır tutulur, engellenmez.', mevzuatStandart: 'Binaların Yangından Korunması Hakkında Yönetmelik' },
  { id: 'byky_sondurme', gereklilik: 'Bina/tesiste yangın algılama, alarm, sprinkler, hidrant vb. söndürme sistemleri mevzuata uygun tesis edilir ve periyodik bakımı yapılır.', mevzuatStandart: 'Binaların Yangından Korunması Hakkında Yönetmelik' },
  { id: 'risk_yon', gereklilik: 'Acil durumlar risk değerlendirmesinde ayrı bir tehlike/risk unsuru olarak değerlendirilir.', mevzuatStandart: 'İş Sağlığı ve Güvenliği Risk Değerlendirmesi Yönetmeliği' },
  { id: 'ilkyardim_yon', gereklilik: 'Yeterli sayıda ilkyardımcı bulundurulur; ilkyardım malzeme ve ekipmanı işyerinde hazır tutulur.', mevzuatStandart: 'İlkyardım Yönetmeliği' },
  { id: 'bina_eklenti', gereklilik: 'İşyeri bina ve eklentilerinde acil çıkış kapıları, yönlendirme işaretleri ve acil aydınlatma mevzuata uygun şekilde bulundurulur.', mevzuatStandart: 'İşyeri Bina ve Eklentilerinde Alınacak S.G. Önlemlerine İlişkin Yön. Ek-1' },
  { id: 'kimyasal_yon', gereklilik: 'Tehlikeli kimyasallar için acil durum/kaza önleme tedbirleri belirlenir; SDS bilgileri erişilebilir tutulur.', mevzuatStandart: 'Kimyasal Maddelerle Çalışmalarda S.G. Önlemleri Hakkında Yönetmelik' },
  { id: 'kkd_yon', gereklilik: 'Acil durum müdahalesinde görev alan ekiplere uygun kişisel koruyucu donanım temin edilir.', mevzuatStandart: 'Kişisel Koruyucu Donanımların İşyerlerinde Kullanılması Hakkında Yönetmelik' },
  { id: 'is_ekipmani_yon', gereklilik: 'Acil durdurma ve tehlike anında enerji kesme düzenekleri iş ekipmanlarında bulundurulur.', mevzuatStandart: 'İş Ekipmanlarının Kullanımında S.G. Şartları Yönetmeliği' },
  { id: 'osha_1910_38', gereklilik: 'Acil durum eylem planı; tahliye prosedürleri, kritik operasyon sorumluları, alarm sistemleri ve eğitim gereksinimlerini kapsar (uluslararası referans).', mevzuatStandart: 'OSHA 29 CFR 1910.38' }
];

function mevzuatUygunlukMaddesiOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    gereklilik: (veriler.gereklilik || '').trim(),
    mevzuatStandart: (veriler.mevzuatStandart || '').trim(),
    mevcutDurum: (veriler.mevcutDurum || '').trim(),
    uygunluk: MEVZUAT_UYGUNLUK_DURUMLARI.includes(veriler.uygunluk) ? veriler.uygunluk : 'Değerlendirilmedi',
    eksiklik: (veriler.eksiklik || '').trim(),
    aksiyonReferansi: (veriler.aksiyonReferansi || '').trim(),
    standartMi: !!veriler.standartMi,
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}
