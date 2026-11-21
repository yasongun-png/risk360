// Lokasyon Bazlı Saha Denetimi (ÇSGB müfettiş denetimi tarzı) — veri modeli.
// Kullanıcı isteği (2026-11-17): "saha denetimi modülü altında çsgb müfettiş
// denetimi gibi bir denetim koyalım benzer sorular olsun bölüm bölüm lokasyon
// lokasyon gideriz örneğin can-an zemin kat 1. kat vb; acil durum ekipman
// kontrollerinin raporlamalarını da dikkate al; barkodlama burada da olsun o
// kata barkodu okuturuz girişte; çok profesyonel bir raporlama (Word); risk
// değerlendirmesine ve uygunsuzluk modülüne aktarma fonksiyonları olsun".
//
// Mevcut "Saha Denetim" (tek konu, tek kontrol listesi) kayıtlarına
// dokunulmaz; bu sayfa kendi anahtarlarında tutulur:
//   saha_lokasyonlari          -> denetim noktaları (bölüm + lokasyon/kat + barkod kodu)
//   saha_lokasyon_denetimleri  -> denetimler; her denetimde lokasyon ziyaretleri
//
// Sorular, Çalışma ve Sosyal Güvenlik Bakanlığı iş müfettişlerinin saha
// teftişlerinde baktığı başlıklara göre kategorilere ayrılmıştır; her madde
// ilgili mevzuata atıf taşır (rapordaki "Mevzuat" sütunu). İfadeler, "Uygun /
// Uygun Değil / Uygulanamaz" ile değerlendirilen kriter cümleleridir.

// Kullanıcı isteği (2026-11-20): saha kontrolünde cevaplar kontrol listesindeki
// gibi Evet / Hayır / Uygulanamaz / Gözlemlenemedi. İç değerler (Uygun, Uygun
// Değil …) korunur — bulgu, uygunsuzluk aktarımı ve raporlar bunlara bağlı;
// sahada görünen etiket LD_SONUC_ETIKET'tir.
const LD_SONUCLAR = ['Uygun', 'Uygun Değil', 'Uygulanamaz', 'Gözlemlenemedi'];
const LD_SONUC_ETIKET = { 'Uygun': 'Evet', 'Uygun Değil': 'Hayır', 'Uygulanamaz': 'Uygulanamaz', 'Gözlemlenemedi': 'Gözlemlenemedi' };
function ldSonucEtiketi(s) { return LD_SONUC_ETIKET[s] || s || ''; }

const _LD_M = {
  ibey: 'İşyeri Bina ve Eklentilerinde Alınacak Sağlık ve Güvenlik Önlemlerine İlişkin Yönetmelik',
  ieksg: 'İş Ekipmanlarının Kullanımında Sağlık ve Güvenlik Şartları Yönetmeliği',
  elektrik: 'Elektrik İç Tesisleri Yönetmeliği / Elektrik Tesislerinde Topraklamalar Yönetmeliği',
  kimyasal: 'Kimyasal Maddelerle Çalışmalarda Sağlık ve Güvenlik Önlemleri Hakkında Yönetmelik',
  kkd: 'Kişisel Koruyucu Donanımların İşyerlerinde Kullanılması Hakkında Yönetmelik',
  isaret: 'Sağlık ve Güvenlik İşaretleri Yönetmeliği',
  acil: 'İşyerlerinde Acil Durumlar Hakkında Yönetmelik',
  yangin: 'Binaların Yangından Korunması Hakkında Yönetmelik',
  ilkyardim: 'İlkyardım Yönetmeliği',
  gurultu: 'Çalışanların Gürültü ile İlgili Risklerden Korunmalarına Dair Yönetmelik',
  toz: 'Tozla Mücadele Yönetmeliği',
  elle: 'Elle Taşıma İşleri Yönetmeliği',
  patlayici: 'Çalışanların Patlayıcı Ortamların Tehlikelerinden Korunması Hakkında Yönetmelik',
  kanun: '6331 sayılı İş Sağlığı ve Güvenliği Kanunu',
  egitim: 'Çalışanların İş Sağlığı ve Güvenliği Eğitimlerinin Usul ve Esasları Hakkında Yönetmelik',
  risk: 'İş Sağlığı ve Güvenliği Risk Değerlendirmesi Yönetmeliği',
  makine: 'Makine Emniyeti Yönetmeliği (2006/42/AT)',
  yapi: 'Yapı İşlerinde İş Sağlığı ve Güvenliği Yönetmeliği'
};

// varsayilan: yeni lokasyon tanımlanırken işaretli gelen kategoriler.
const LD_KATEGORILER = [
  { id: 'genel', ad: 'Genel Düzen, Tertip ve Temizlik', varsayilan: true, sorular: [
    { id: 'gecis', soru: 'Geçiş yolları ve koridorlar engelsiz, işaretli ve yeterli genişlikte', mevzuat: _LD_M.ibey },
    { id: 'zemin', soru: 'Zemin düzgün ve kaymaz; çukur, delik ve açıklıklar kapatılmış veya korunmuş', mevzuat: _LD_M.ibey },
    { id: 'istif', soru: 'Malzemeler devrilmeyecek/kaymayacak şekilde istiflenmiş, istif yüksekliği güvenli', mevzuat: _LD_M.ibey },
    { id: 'atik', soru: 'Atıklar uygun kaplarda toplanıyor, çalışma alanı temiz ve düzenli', mevzuat: _LD_M.ibey },
    { id: 'merdiven', soru: 'Sabit merdivenlerde korkuluk ve tutamak mevcut, basamaklar sağlam ve kaymaz', mevzuat: _LD_M.ibey },
    { id: 'korkuluk', soru: 'Platform, galeri ve yükseltilmiş alanların açık kenarlarında korkuluk (ara ve topuk levhalı) mevcut', mevzuat: _LD_M.ibey },
    { id: 'kapiCam', soru: 'Kapı, pencere ve cam yüzeyler sağlam; şeffaf yüzeyler işaretli', mevzuat: _LD_M.ibey }
  ] },
  { id: 'elektrik', ad: 'Elektrik Güvenliği', varsayilan: true, sorular: [
    { id: 'panoKapak', soru: 'Elektrik panolarının kapakları kapalı/kilitli, üzerinde tehlike uyarı levhası var', mevzuat: _LD_M.elektrik },
    { id: 'panoOnu', soru: 'Pano önü açık (en az 1 m), önünde yalıtkan paspas mevcut', mevzuat: _LD_M.elektrik },
    { id: 'kablo', soru: 'Kablolar hasarsız, ek yerleri uygun; açıkta veya gelişigüzel çekilmiş kablo yok', mevzuat: _LD_M.elektrik },
    { id: 'seyyar', soru: 'Seyyar kablo, uzatma ve prizler sağlam, endüstriyel tip ve ortama uygun koruma sınıfında', mevzuat: _LD_M.ieksg },
    { id: 'kacakAkim', soru: 'Kaçak akım koruma rölesi mevcut ve periyodik testi yapılmış', mevzuat: _LD_M.elektrik },
    { id: 'topraklama', soru: 'Topraklama, paratoner ve elektrik iç tesisat periyodik kontrolleri geçerli', mevzuat: _LD_M.elektrik },
    { id: 'ipSinifi', soru: 'Islak, tozlu veya patlayıcı ortamlarda uygun IP/Ex sınıfında ekipman kullanılıyor', mevzuat: _LD_M.patlayici }
  ] },
  { id: 'makine', ad: 'Makine ve İş Ekipmanları', varsayilan: true, sorular: [
    { id: 'hareketli', soru: 'Hareketli aksamlar (kayış-kasnak, dişli, mil, zincir) koruyucu ile kapatılmış', mevzuat: _LD_M.ieksg },
    { id: 'koruyucuSaglam', soru: 'Koruyucular yerinde, sağlam ve devre dışı bırakılmamış; kilitlemeli kapaklarda emniyet sivici çalışıyor', mevzuat: _LD_M.ieksg },
    { id: 'acilStop', soru: 'Acil durdurma butonları erişilebilir, işaretli ve çalışıyor', mevzuat: _LD_M.ieksg },
    { id: 'ce', soru: 'Makinelerde CE işareti/uygunluk beyanı ve Türkçe kullanım kılavuzu mevcut', mevzuat: _LD_M.makine },
    { id: 'kumanda', soru: 'Kumanda elemanları açıkça tanınabilir, işaretli ve istem dışı çalışmaya karşı korumalı', mevzuat: _LD_M.ieksg },
    { id: 'sabitleme', soru: 'Makineler sabitlenmiş; devrilme, titreşim veya parça fırlama riski yok', mevzuat: _LD_M.ieksg },
    { id: 'loto', soru: 'Bakım-onarımda enerji kesme, kilitleme ve etiketleme (LOTO) uygulanıyor', mevzuat: _LD_M.ieksg },
    { id: 'periyodik', soru: 'İş ekipmanlarının periyodik kontrolleri yapılmış ve raporları geçerli', mevzuat: _LD_M.ieksg + ' Ek-3' },
    { id: 'talimat', soru: 'Makine/ekipman güvenli kullanım talimatları kullanım yerinde asılı', mevzuat: _LD_M.ieksg }
  ] },
  { id: 'kaldirma', ad: 'Kaldırma, İstifleme ve İç Trafik', varsayilan: false, sorular: [
    { id: 'vincPeriyodik', soru: 'Vinç, caraskal ve kaldırma ekipmanlarının periyodik kontrol raporları geçerli', mevzuat: _LD_M.ieksg + ' Ek-3' },
    { id: 'swl', soru: 'Kaldırma ekipmanı üzerinde güvenli çalışma yükü (SWL) yazılı', mevzuat: _LD_M.ieksg },
    { id: 'sapan', soru: 'Sapan, zincir, kanca ve mapalar hasarsız; kancalarda emniyet mandalı mevcut', mevzuat: _LD_M.ieksg },
    { id: 'forklift', soru: 'Forklift/istif makinelerinin periyodik kontrolü geçerli, operatörleri yetkili/belgeli', mevzuat: _LD_M.ieksg },
    { id: 'forkliftIkaz', soru: 'Forkliftlerde sesli-ışıklı ikaz, emniyet kemeri ve ayna mevcut ve çalışıyor', mevzuat: _LD_M.ieksg },
    { id: 'yayaYolu', soru: 'Yaya ve araç yolları ayrılmış ve işaretlenmiş; hız sınırı levhaları mevcut', mevzuat: _LD_M.ibey },
    { id: 'raf', soru: 'Raflar sabitlenmiş, kapasite etiketi var; hasarlı ayak/kiriş yok', mevzuat: _LD_M.ibey }
  ] },
  { id: 'konveyor', ad: 'Konveyör Hatları', varsayilan: false, sorular: [
    { id: 'emniyetTeli', soru: 'Emniyet teli (çekme halatı) hat boyunca kesintisiz, gergin ve erişilebilir', mevzuat: _LD_M.ieksg },
    { id: 'acilStopButon', soru: 'Acil durdurma butonları (mantar tip, kırmızı/sarı) yerinde ve hasarsız', mevzuat: _LD_M.ieksg },
    { id: 'muhafaza', soru: 'Tahrik ve gergi tamburu, kasnak, zincir/dişli muhafazaları takılı ve sağlam', mevzuat: _LD_M.ieksg },
    { id: 'levha', soru: 'Uyarı ve ikaz levhaları (sıkışma tehlikesi, acil stop yeri vb.) görünür', mevzuat: _LD_M.isaret },
    { id: 'pano', soru: 'Kumanda/elektrik panosu kapalı, kabloları hasarsız', mevzuat: _LD_M.elektrik }
  ] },
  { id: 'yuksekte', ad: 'Yüksekte Çalışma', varsayilan: false, sorular: [
    { id: 'izin', soru: 'Yüksekte çalışmalarda çalışma izni sistemi uygulanıyor', mevzuat: _LD_M.ieksg + ' Ek-2' },
    { id: 'seyyarMerdiven', soru: 'Seyyar merdivenler sağlam, kaymaz pabuçlu ve amacına uygun kullanılıyor', mevzuat: _LD_M.ieksg + ' Ek-2' },
    { id: 'kemer', soru: 'Paraşüt tipi emniyet kemeri ve ankraj noktaları uygun ve kontrol edilmiş', mevzuat: _LD_M.kkd },
    { id: 'iskele', soru: 'İskele/platformlar korkuluklu ve sağlam; kontrol kartı (etiket) asılı', mevzuat: _LD_M.ieksg + ' Ek-2' },
    { id: 'kirilgan', soru: 'Çatı ve kırılgan yüzeylerde (şeffaf levha vb.) düşmeye karşı önlem alınmış', mevzuat: _LD_M.ibey },
    { id: 'dusenCisim', soru: 'Düşen cisimlere karşı alt bölge kapatılmış/işaretlenmiş', mevzuat: _LD_M.ibey },
    // Kullanıcı isteği (2026-11-19): "yüksekte çalışma iskele güvenliği paraşüt kemer — soruları ekle"
    { id: 'egitim', soru: 'Yüksekte çalışanlar yüksekte çalışma eğitimi almış; sağlık raporunda yüksekte çalışabilir ibaresi var', mevzuat: _LD_M.egitim },
    { id: 'iskeleKurulum', soru: 'İskele ehil/yetkili kişilerce kurulmuş; kurulum sonrası ve periyodik kontrolü yapılmış, kullanıma uygunluk (yeşil) kartı asılı', mevzuat: _LD_M.ieksg + ' Ek-2' },
    { id: 'iskeleZemin', soru: 'İskele ayakları sağlam ve düz zemine taban plakası ile oturtulmuş; tekerlekli iskelelerde tekerlek frenleri kilitli', mevzuat: _LD_M.ieksg + ' Ek-2' },
    { id: 'iskeleBaglanti', soru: 'İskele yapıya ankrajlanmış; çapraz, kelepçe ve bağlantı elemanları eksiksiz ve sağlam', mevzuat: _LD_M.ieksg + ' Ek-2' },
    { id: 'iskelePlatform', soru: 'Çalışma platformu boşluksuz tam döşenmiş; üst korkuluk, ara korkuluk ve topuk levhası mevcut', mevzuat: _LD_M.yapi },
    { id: 'iskeleErisim', soru: 'İskeleye güvenli erişim (iç merdiven/kapaklı geçiş) sağlanmış; iskele dışından tırmanılmıyor', mevzuat: _LD_M.ieksg + ' Ek-2' },
    { id: 'iskeleYuk', soru: 'İskele üzerinde aşırı malzeme yığılmamış, taşıma kapasitesi aşılmıyor; hasarlı/eksik iskele kırmızı kartla kullanıma kapatılmış', mevzuat: _LD_M.ieksg + ' Ek-2' },
    { id: 'kemerUygun', soru: 'Paraşüt tipi emniyet kemerleri CE işaretli (EN 361), hasarsız; kullanım öncesi ve periyodik kontrolleri kayıt altında', mevzuat: _LD_M.kkd },
    { id: 'kemerKullanim', soru: 'Kemer doğru giyilmiş (göğüs ve bacak kayışları ayarlı); lanyard her an sağlam bir ankraja bağlı', mevzuat: _LD_M.kkd },
    { id: 'kemerSokEmici', soru: 'Şok emicili lanyard veya geri sarmalı düşüş durdurucu kullanılıyor; düşüş mesafesi için alt boşluk yeterli', mevzuat: _LD_M.kkd },
    { id: 'ankrajHat', soru: 'Ankraj noktaları ve yaşam hattı yeterli dayanımda (en az 12 kN), uygun kurulmuş ve kontrol edilmiş', mevzuat: _LD_M.yapi },
    { id: 'kurtarma', soru: 'Düşüş sonrası askıda kalan çalışan için kurtarma planı ve kurtarma ekipmanı hazır', mevzuat: _LD_M.acil }
  ] },
  { id: 'kimyasal', ad: 'Kimyasal Maddeler', varsayilan: false, sorular: [
    { id: 'etiket', soru: 'Kimyasal kaplar etiketli; başka kaba aktarılan kimyasallarda da etiket mevcut', mevzuat: _LD_M.kimyasal },
    { id: 'gbf', soru: 'Türkçe ve güncel Güvenlik Bilgi Formları kullanım yerinde erişilebilir', mevzuat: _LD_M.kimyasal },
    { id: 'uyumsuz', soru: 'Birbiriyle reaksiyona girebilecek kimyasallar ayrı depolanıyor', mevzuat: _LD_M.kimyasal },
    { id: 'sekonder', soru: 'Dökülme/sızıntıya karşı sekonder kap (tava) ve döküntü kiti mevcut', mevzuat: _LD_M.kimyasal },
    { id: 'gozDusu', soru: 'Kimyasal kullanılan alanda göz duşu/acil duş erişilebilir ve çalışıyor', mevzuat: _LD_M.kimyasal },
    { id: 'havalandirma', soru: 'Lokal/genel havalandırma yeterli; maruziyet ölçümleri yapılmış', mevzuat: _LD_M.kimyasal },
    { id: 'yanici', soru: 'Yanıcı kimyasallar uygun dolapta ve ateş kaynaklarından uzakta depolanıyor', mevzuat: _LD_M.yangin }
  ] },
  { id: 'basincli', ad: 'Basınçlı Kaplar ve Gaz Tüpleri', varsayilan: false, sorular: [
    { id: 'periyodik', soru: 'Kompresör, hava tankı, kazan vb. basınçlı kapların periyodik kontrolleri geçerli', mevzuat: _LD_M.ieksg + ' Ek-3' },
    { id: 'ventil', soru: 'Emniyet ventili ve manometre mevcut ve çalışıyor; manometrede azami çalışma basıncı işaretli', mevzuat: _LD_M.ieksg },
    { id: 'tupSabit', soru: 'Gaz tüpleri dik ve devrilmeye karşı sabitlenmiş, koruma başlıkları takılı', mevzuat: _LD_M.ieksg },
    { id: 'tupAyri', soru: 'Dolu/boş tüpler ayrı ve işaretli; oksijen ve yanıcı gaz tüpleri ayrı depolanıyor', mevzuat: _LD_M.yangin },
    { id: 'hortum', soru: 'Basınçlı hortum ve bağlantılar hasarsız ve kelepçeli', mevzuat: _LD_M.ieksg }
  ] },
  { id: 'sicakIs', ad: 'Kaynak ve Sıcak İşler', varsayilan: false, sorular: [
    { id: 'izin', soru: 'Sıcak çalışma izni uygulanıyor', mevzuat: _LD_M.yangin },
    { id: 'makine', soru: 'Kaynak makinesi, kablo ve pense hasarsız; topraklama uygun', mevzuat: _LD_M.ieksg },
    { id: 'yanici', soru: 'Kaynak alanında yanıcı malzeme yok; yangın söndürücü ve yangın battaniyesi hazır', mevzuat: _LD_M.yangin },
    { id: 'duman', soru: 'Kaynak dumanı için lokal havalandırma (emiş) mevcut', mevzuat: _LD_M.kimyasal },
    { id: 'kkd', soru: 'Kaynakçı uygun KKD kullanıyor; çevre paravanla korunmuş', mevzuat: _LD_M.kkd }
  ] },
  { id: 'kapaliAlan', ad: 'Kapalı Alanlar (Tank, Silo, Kuyu)', varsayilan: false, sorular: [
    { id: 'tanim', soru: 'Kapalı alanlar belirlenmiş, girişlerinde uyarı levhası var', mevzuat: _LD_M.isaret },
    { id: 'izinOlcum', soru: 'Kapalı alana girişte çalışma izni ve gaz ölçümü yapılıyor', mevzuat: _LD_M.ieksg },
    { id: 'gozcu', soru: 'Girişte gözcü bulunuyor, kurtarma ekipmanı hazır', mevzuat: _LD_M.acil },
    { id: 'agizlar', soru: 'Tank, silo, kuyu ve rögar ağızları kapalı veya korkuluklu', mevzuat: _LD_M.ibey }
  ] },
  { id: 'kkd', ad: 'Kişisel Koruyucu Donanım', varsayilan: true, sorular: [
    { id: 'kullanim', soru: 'Çalışanlar işin gerektirdiği KKD\'leri (baret, gözlük, eldiven, ayakkabı vb.) kullanıyor', mevzuat: _LD_M.kkd },
    { id: 'ce', soru: 'KKD\'ler CE işaretli, sağlam ve temiz', mevzuat: _LD_M.kkd },
    { id: 'zimmet', soru: 'KKD zimmet kayıtları mevcut, çalışanlar kullanım konusunda bilgilendirilmiş', mevzuat: _LD_M.kkd },
    { id: 'kulak', soru: 'Gürültülü alanlarda kulak koruyucu kullanılıyor', mevzuat: _LD_M.gurultu },
    { id: 'levha', soru: 'Alan girişinde KKD kullanım zorunluluğu levhaları mevcut', mevzuat: _LD_M.isaret }
  ] },
  { id: 'isaret', ad: 'Güvenlik ve Sağlık İşaretleri', varsayilan: true, sorular: [
    { id: 'uyari', soru: 'Tehlikeli noktalarda uyarı, yasak ve zorunluluk levhaları mevcut ve görünür', mevzuat: _LD_M.isaret },
    { id: 'kacis', soru: 'Acil çıkış ve kaçış yönlendirme levhaları mevcut (fotolüminesan/aydınlatmalı)', mevzuat: _LD_M.isaret },
    { id: 'yanginYeri', soru: 'Yangınla mücadele ekipmanlarının yeri işaretli', mevzuat: _LD_M.isaret },
    { id: 'engel', soru: 'Engeller ve tehlikeli noktalar sarı-siyah şeritle işaretlenmiş', mevzuat: _LD_M.isaret },
    { id: 'boru', soru: 'Boru hatları içerdikleri maddeye göre renk/etiketle işaretlenmiş', mevzuat: _LD_M.isaret }
  ] },
  { id: 'acil', ad: 'Acil Durum, Yangın ve İlk Yardım', varsayilan: true, sorular: [
    { id: 'sondurucu', soru: 'Yangın söndürücüler yerinde, erişilebilir, dolu ve kontrol etiketi güncel', mevzuat: _LD_M.yangin },
    { id: 'dolap', soru: 'Yangın dolapları/hidrantlar erişilebilir, önleri açık', mevzuat: _LD_M.yangin },
    { id: 'cikisKapi', soru: 'Acil çıkış kapıları kilitsiz, kaçış yönünde açılıyor ve önleri açık', mevzuat: _LD_M.yangin },
    { id: 'kacisYolu', soru: 'Kaçış yolları engelsiz; acil aydınlatma çalışıyor', mevzuat: _LD_M.yangin },
    { id: 'alarm', soru: 'Yangın algılama sistemi ve alarm butonları erişilebilir ve çalışır durumda', mevzuat: _LD_M.yangin },
    { id: 'plan', soru: 'Acil durum planı ve tahliye krokisi görünür yerde asılı', mevzuat: _LD_M.acil },
    { id: 'ekip', soru: 'Acil durum ekipleri belirlenmiş, isimleri ilan edilmiş', mevzuat: _LD_M.acil },
    { id: 'ilkyardim', soru: 'İlk yardım dolabı mevcut, malzemeler eksiksiz ve tarihi geçerli', mevzuat: _LD_M.ilkyardim }
  ] },
  { id: 'ortam', ad: 'Ortam Koşulları ve Ergonomi', varsayilan: true, sorular: [
    { id: 'aydinlatma', soru: 'Genel ve lokal aydınlatma yapılan işe göre yeterli', mevzuat: _LD_M.ibey },
    { id: 'havalandirma', soru: 'Havalandırma yeterli; toz/duman birikimi yok', mevzuat: _LD_M.toz },
    { id: 'olcum', soru: 'Gürültü, toz ve diğer ortam ölçümleri yapılmış, sonuçlara göre önlem alınmış', mevzuat: _LD_M.gurultu },
    { id: 'sicaklik', soru: 'Ortam sıcaklığı ve termal konfor yapılan işe uygun', mevzuat: _LD_M.ibey },
    { id: 'elleTasima', soru: 'Elle taşınan yükler uygun ağırlıkta; gerektiğinde yardımcı ekipman kullanılıyor', mevzuat: _LD_M.elle }
  ] },
  { id: 'sosyal', ad: 'Sosyal Alanlar ve Hijyen', varsayilan: false, sorular: [
    { id: 'soyunma', soru: 'Soyunma odası, dolaplar, tuvalet ve lavabolar yeterli ve temiz', mevzuat: _LD_M.ibey },
    { id: 'su', soru: 'İçme suyu sağlanıyor; yemek alanı çalışma alanından ayrı', mevzuat: _LD_M.ibey },
    { id: 'dinlenme', soru: 'Dinlenme alanları uygun; sigara içme alanı belirlenmiş', mevzuat: _LD_M.ibey }
  ] },
  { id: 'belge', ad: 'Belge, Talimat ve Kayıtlar', varsayilan: false, sorular: [
    { id: 'risk', soru: 'Bölümün risk değerlendirmesi güncel ve riskler çalışanlara duyurulmuş', mevzuat: _LD_M.risk },
    { id: 'egitim', soru: 'Bölüm çalışanlarının İSG eğitimleri ve sağlık muayeneleri güncel', mevzuat: _LD_M.egitim },
    { id: 'periyodikRapor', soru: 'Bölümdeki ekipmanların periyodik kontrol raporları mevcut, uygunsuzluklar giderilmiş', mevzuat: _LD_M.ieksg + ' Ek-3' },
    { id: 'talimatlar', soru: 'Bölüme özgü İSG talimatları kullanım yerinde asılı', mevzuat: _LD_M.kanun }
  ] }
];

const LD_SERBEST_KATEGORI = { id: 'serbest', ad: 'Diğer Tespitler' };

function ldKategoriGetir(id) {
  return LD_KATEGORILER.find(k => k.id === id) || (id === LD_SERBEST_KATEGORI.id ? LD_SERBEST_KATEGORI : null);
}

function ldVarsayilanKategoriler() {
  return LD_KATEGORILER.filter(k => k.varsayilan).map(k => k.id);
}

// Lokasyon (denetim noktası) — barkod kodu "LOK-0001" biçiminde.
function ldLokasyonOlustur(v) {
  return {
    id: v.id || rastgeleId(),
    kod: v.kod || '',
    bolum: (v.bolum || '').trim(),
    lokasyon: (v.lokasyon || '').trim(),
    aciklama: (v.aciklama || '').trim(),
    sira: Number(v.sira) || 0,
    kategoriler: Array.isArray(v.kategoriler) && v.kategoriler.length ? v.kategoriler.filter(k => ldKategoriGetir(k)) : ldVarsayilanKategoriler(),
    // Kullanıcı isteği (2026-11-19): "önce lokasyonları belirlerim, o lokasyona
    // göre soruları seçerim, bundan sonra sadece seçtiğim sorular olur; sonradan
    // ekleme çıkarma duruma göre yapılır". sorular: seçilen madde anahtarları
    // ("kategori.soruId"); null = seçilen kategorilerin tüm maddeleri (eski kayıtlar).
    sorular: Array.isArray(v.sorular) ? v.sorular.filter(a => ldSoruGetir(a)) : null,
    // "O lokasyondaki ekipmanlar (yangın dolabı, göz ve boy duşu...)": Acil Durum
    // ekipman kayıt id'leri; null = bölüm/lokasyon adı eşleşmesi (eski kayıtlar).
    ekipmanIdleri: Array.isArray(v.ekipmanIdleri) ? v.ekipmanIdleri.slice() : null,
    olusturmaTarihi: v.olusturmaTarihi || new Date().toISOString()
  };
}

// "kategori.soruId" → { kategori, soru } ya da null.
function ldSoruGetir(anahtar) {
  const [kid, sid] = String(anahtar || '').split('.');
  const kat = ldKategoriGetir(kid);
  const soru = kat && kat.sorular && kat.sorular.find(s => s.id === sid);
  return soru ? { kategori: kat, soru } : null;
}

// Lokasyonun (ya da ziyaretin) sorulacak madde anahtarları.
function ldSecilenSorular(kayit) {
  if (Array.isArray(kayit.sorular)) return kayit.sorular.slice();
  const liste = [];
  (kayit.kategoriler || []).forEach(kid => {
    const kat = ldKategoriGetir(kid);
    (kat && kat.sorular || []).forEach(s => liste.push(kid + '.' + s.id));
  });
  return liste;
}

function ldSonrakiLokasyonKodu(liste) {
  let maks = 0;
  (liste || []).forEach(l => {
    const m = String(l.kod || '').match(/(\d+)$/);
    if (m) maks = Math.max(maks, parseInt(m[1], 10));
  });
  return 'LOK-' + String(maks + 1).padStart(4, '0');
}

// Denetim no: SD-2026-001 (yıl bazlı sayaç).
function ldSonrakiDenetimNo(liste, tarih) {
  const yil = String(tarih || new Date().toISOString()).slice(0, 4);
  let maks = 0;
  (liste || []).forEach(d => {
    const m = String(d.denetimNo || '').match(/^SD-(\d{4})-(\d+)$/);
    if (m && m[1] === yil) maks = Math.max(maks, parseInt(m[2], 10));
  });
  return `SD-${yil}-${String(maks + 1).padStart(3, '0')}`;
}

function ldDenetimOlustur(v) {
  return {
    id: v.id || rastgeleId(),
    denetimNo: v.denetimNo || '',
    baslik: (v.baslik || '').trim(),
    tarih: v.tarih || '',
    bitisTarihi: v.bitisTarihi || '',
    denetciler: (v.denetciler || '').trim(),
    eslikEdenler: (v.eslikEdenler || '').trim(),
    kapsam: (v.kapsam || '').trim(),
    genelDegerlendirme: (v.genelDegerlendirme || '').trim(),
    tamamlandiMi: !!v.tamamlandiMi,
    ziyaretler: Array.isArray(v.ziyaretler) ? v.ziyaretler : [],
    imzaliBelgeUrl: v.imzaliBelgeUrl || '',
    // Dijital kaşe/imza (bkz. ldImzaRolleri): { kontrol1|kontrol2|isveren: { ad, imzaUrl, tarih } }
    imzalar: (v.imzalar && typeof v.imzalar === 'object') ? v.imzalar : {},
    olusturmaTarihi: v.olusturmaTarihi || new Date().toISOString()
  };
}

// Kullanıcı isteği (2026-11-21): "Lokasyon Bazlı Saha Kontrolü'nde
// uygunsuzluklarda olduğu gibi imza atma fonksiyonu ekle". Roller Word
// raporunun imza satırıyla aynı üç kutudur: 1. kontrol eden, 2. kontrol eden
// (yoksa Bölüm Sorumlusu), İşveren / İşveren Vekili. Ad varsayılanı
// "Kontrol Eden(ler)" alanındaki sıraya göre gelir.
function ldImzaRolleri(d) {
  const denetciler = String((d && d.denetciler) || '').split(',').map(s => s.trim()).filter(Boolean);
  return [
    { rol: 'kontrol1', etiket: 'Kontrolü Yapan', ad: denetciler[0] || '' },
    { rol: 'kontrol2', etiket: denetciler[1] ? 'Kontrolü Yapan' : 'Bölüm Sorumlusu', ad: denetciler[1] || '' },
    { rol: 'isveren', etiket: 'İşveren / İşveren Vekili', ad: '' }
  ];
}

function ldImzaliMi(d) {
  const im = (d && d.imzalar) || {};
  return Object.keys(im).some(k => im[k] && im[k].imzaUrl);
}

// Bir denetimde bir lokasyona yapılan ziyaret. Cevaplar yalnızca
// değerlendirilen maddeler için saklanır (belge boyutu küçük kalsın diye);
// cevaplanan maddenin soru/mevzuat metni cevaba kopyalanır, böylece soru
// kütüphanesi sonradan değişse de eski raporlar aynı kalır.
//   cevaplar[anahtar] = { k: kategoriId, s: soru, m: mevzuat, sonuc, not, oneri, risk, fotolar: [], uygId, serbest }
// anahtar: "<kategoriId>.<soruId>" ya da serbest bulgularda "serbest.<id>".
function ldZiyaretOlustur(v) {
  return {
    id: v.id || rastgeleId(),
    lokasyonId: v.lokasyonId || '',
    bolum: (v.bolum || '').trim(),
    lokasyon: (v.lokasyon || '').trim(),
    kod: v.kod || '',
    kategoriler: Array.isArray(v.kategoriler) ? v.kategoriler.slice() : ldVarsayilanKategoriler(),
    // Lokasyonda seçilen maddeler (ziyaret sırasında da eklenip çıkarılabilir); null = kategorilerin tümü.
    sorular: Array.isArray(v.sorular) ? v.sorular.slice() : null,
    // Bu lokasyonun acil durum ekipmanları ve kontrol sırasında verilen cevaplar:
    // ekipmanCevaplari[ekipmanId] = { cevap:{}, malzeme:{}, bulgular, kaydedildi }
    ekipmanIdleri: Array.isArray(v.ekipmanIdleri) ? v.ekipmanIdleri.slice() : null,
    ekipmanCevaplari: v.ekipmanCevaplari || {},
    girisZamani: v.girisZamani || new Date().toISOString(),
    girisYontemi: v.girisYontemi || 'manuel',
    cevaplar: v.cevaplar || {},
    lokasyonNotu: (v.lokasyonNotu || '').trim(),
    ekipmanOzeti: Array.isArray(v.ekipmanOzeti) ? v.ekipmanOzeti : [],
    ekipmanOzetiTarihi: v.ekipmanOzetiTarihi || ''
  };
}

// Bir ziyaretin değerlendirilecek madde listesi (kategori sırasıyla) +
// serbest bulgular. Dönüş: [{ anahtar, kategori, soru, mevzuat, cevap }]
function ldZiyaretMaddeleri(ziyaret) {
  const sonuc = [];
  const secili = Array.isArray(ziyaret.sorular) ? new Set(ziyaret.sorular) : null;
  (ziyaret.kategoriler || []).forEach(kid => {
    const kat = ldKategoriGetir(kid);
    if (!kat || !kat.sorular) return;
    kat.sorular.forEach(s => {
      const anahtar = kid + '.' + s.id;
      // Yalnızca seçilen maddeler (cevaplanmış eski maddeler aşağıda yine eklenir).
      if (secili && !secili.has(anahtar)) return;
      const c = (ziyaret.cevaplar || {})[anahtar];
      sonuc.push({ anahtar, kategori: kat, soru: c && c.s ? c.s : s.soru, mevzuat: c && c.m ? c.m : s.mevzuat, cevap: c || null });
    });
  });
  // Kütüphanede artık olmayan ama cevaplanmış eski maddeler de kaybolmasın.
  Object.keys(ziyaret.cevaplar || {}).forEach(anahtar => {
    if (sonuc.some(m => m.anahtar === anahtar)) return;
    const c = ziyaret.cevaplar[anahtar];
    const kat = ldKategoriGetir(c.k) || LD_SERBEST_KATEGORI;
    if (!c.serbest && !c.sonuc) return;
    // Eski 'Kalanlar Uygun' hatasının seçilmeyen sorulara yazdığı boş 'Uygun'
    // cevaplar gösterilmez (not/foto/öneri girilmiş olanlar korunur).
    if (secili && !c.serbest && c.sonuc === 'Uygun' && ldSoruGetir(anahtar) && !c.not && !c.oneri && !(c.fotolar || []).length) return;
    sonuc.push({ anahtar, kategori: kat, soru: c.s || '', mevzuat: c.m || '', cevap: c });
  });
  return sonuc;
}

function ldZiyaretIstatistik(ziyaret) {
  const maddeler = ldZiyaretMaddeleri(ziyaret);
  const say = s => maddeler.filter(m => m.cevap && m.cevap.sonuc === s).length;
  const uygun = say('Uygun');
  const uygunDegil = say('Uygun Değil');
  const uygulanamaz = say('Uygulanamaz');
  const gozlemlenemedi = say('Gözlemlenemedi');
  const listedekiler = maddeler.filter(m => !(m.cevap && m.cevap.serbest));
  const toplam = listedekiler.length;
  // Serbest (listede olmayan) tespitler bulgu sayısına ve uygunluk oranına
  // girer, ama "değerlendirilen / toplam madde" oranına girmez.
  return {
    toplam, uygun, uygunDegil, uygulanamaz, gozlemlenemedi,
    cevaplanan: listedekiler.filter(m => m.cevap && m.cevap.sonuc).length,
    puan: (uygun + uygunDegil) ? Math.round(uygun * 100 / (uygun + uygunDegil)) : null
  };
}

function ldDenetimIstatistik(denetim) {
  const t = { lokasyon: 0, toplam: 0, uygun: 0, uygunDegil: 0, uygulanamaz: 0, gozlemlenemedi: 0, cevaplanan: 0 };
  (denetim.ziyaretler || []).forEach(z => {
    const s = ldZiyaretIstatistik(z);
    t.lokasyon++;
    ['toplam', 'uygun', 'uygunDegil', 'uygulanamaz', 'gozlemlenemedi', 'cevaplanan'].forEach(k => { t[k] += s[k]; });
  });
  t.puan = (t.uygun + t.uygunDegil) ? Math.round(t.uygun * 100 / (t.uygun + t.uygunDegil)) : null;
  return t;
}

// Raporda ve listede kullanılan bulgu numaraları: B-01, B-02 ... (ziyaret
// sırası, sonra madde sırası).
function ldDenetimBulgulari(denetim) {
  const bulgular = [];
  (denetim.ziyaretler || []).forEach(z => {
    ldZiyaretMaddeleri(z).forEach(m => {
      if (m.cevap && m.cevap.sonuc === 'Uygun Değil') {
        bulgular.push({ no: 'B-' + String(bulgular.length + 1).padStart(2, '0'), ziyaret: z, madde: m });
      }
    });
  });
  return bulgular;
}

// Kullanıcı geri bildirimi (2026-11-17): "tespitler tespit değil aslında
// olması gereken" — kontrol maddesi metni olması gereken durumu anlatır;
// asıl tespit denetçinin yazdığı açıklamadır. Raporda/aktarımda "Tespit"
// bu açıklamadan alınır, madde metni "Kontrol Maddesi (olması gereken)"
// olarak ayrı gösterilir. Açıklama yazılmadıysa maddeden türetilir.
// Listede olmayan (serbest) tespitlerde metnin kendisi zaten tespittir.
function ldBulguTespiti(c) {
  if (!c) return '';
  if (c.serbest) return c.s || '';
  return (c.not || '').trim() || `Kontrol maddesi karşılanmıyor: ${c.s}`;
}

function ldBulguKriteri(c) {
  return c && !c.serbest ? (c.s || '') : '';
}

function ldPuanSinifi(puan) {
  if (puan == null) return 'rozet-pasif';
  return puan >= 90 ? 'rozet-uygun' : puan >= 70 ? 'rozet-orta' : 'rozet-yuksek';
}

// Türkçe büyük/küçük harf ve boşluk farklarını yok sayan karşılaştırma
// (acil durum ekipmanlarının bölüm/lokasyon metniyle eşleştirme için).
function ldNormalize(s) {
  return String(s || '').toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ').replace(/[.\-_/]+/g, ' ').trim();
}


// ---------------------------------------------------------------------------
// Kullanıcı isteği (2026-11-19): "lokasyonlara göre soru listesini oluştur,
// benim eklediğim lokasyonlara göre olması gereken soruları tahmin et,
// düzenle; az soru olsun sorun değil; 'şunu da ekleyelim mi bu alana' diye
// bana sorabilirsin". Lokasyonun bölüm/lokasyon/açıklama metni ve oradaki
// acil durum ekipmanlarının türleri anahtar kelimelerle eşleştirilir:
//   sorular  → doğrudan önerilen (az ve öz) maddeler
//   sorulsun → "Bunu da ekleyelim mi?" diye kullanıcıya sorulacak maddeler
// Her madde için bir gerekçe (neden) tutulur.
const LD_ONERI_CEKIRDEK = ['genel.gecis', 'elektrik.panoKapak', 'acil.sondurucu', 'acil.kacisYolu', 'isaret.kacis'];
const LD_ONERI_CEKIRDEK_SOR = ['genel.atik', 'elektrik.kablo'];
const LD_ONERI_KURALLARI = [
  { ad: 'Depo / ambar', kelime: /depo|ambar|stok|antrepo|sevkiyat|yukleme|bosaltma|raf|mal kabul|lojistik|hangar|saha/,
    sorular: ['genel.istif', 'kaldirma.forklift', 'kaldirma.yayaYolu', 'kaldirma.raf'],
    sorulsun: ['kaldirma.forkliftIkaz', 'ortam.elleTasima', 'kkd.kullanim', 'acil.dolap'] },
  { ad: 'Üretim / atölye', kelime: /uretim|imalat|atolye|fabrika|\bhat|hatti|makine|paketleme|dolum|granul|kirma|eleme|torba|mamul|proses|reaktor/,
    sorular: ['makine.hareketli', 'makine.acilStop', 'makine.koruyucuSaglam', 'kkd.kullanim'],
    sorulsun: ['makine.loto', 'makine.periyodik', 'makine.talimat', 'ortam.olcum', 'kkd.kulak', 'isaret.uyari'] },
  { ad: 'Konveyör / bant', kelime: /konveyor|bant|elevator|helezon/,
    sorular: ['konveyor.emniyetTeli', 'konveyor.acilStopButon', 'konveyor.muhafaza'],
    sorulsun: ['konveyor.levha', 'konveyor.pano', 'makine.loto'] },
  { ad: 'Kimyasal alan', kelime: /kimya|laboratuvar|\blab\b|asit|boya|solvent|tank ciftligi|amonyak|kostik|gubre|hammadde|katki|yag/,
    sorular: ['kimyasal.etiket', 'kimyasal.gbf', 'kimyasal.sekonder'],
    sorulsun: ['kimyasal.gozDusu', 'kimyasal.havalandirma', 'kimyasal.uyumsuz', 'kimyasal.yanici'] },
  { ad: 'Basınçlı kap / gaz', kelime: /kompresor|kazan|buhar|basinc|tup|\bgaz\b|azot|oksijen|lpg|dogalgaz|hava tanki|sogutma/,
    sorular: ['basincli.periyodik', 'basincli.ventil'],
    sorulsun: ['basincli.tupSabit', 'basincli.tupAyri', 'basincli.hortum', 'isaret.boru'] },
  { ad: 'Bakım / kaynak', kelime: /bakim|kaynak|tamir|mekanik|torna|tesviye|onarim|teknik servis/,
    sorular: ['makine.loto', 'sicakIs.izin', 'sicakIs.yanici'],
    sorulsun: ['sicakIs.makine', 'sicakIs.duman', 'sicakIs.kkd', 'elektrik.seyyar', 'basincli.tupSabit'] },
  { ad: 'Kapalı alan', kelime: /silo|kuyu|rogar|bunker|havuz|tank|hazne|kanal/,
    sorular: ['kapaliAlan.tanim', 'kapaliAlan.agizlar'],
    sorulsun: ['kapaliAlan.izinOlcum', 'kapaliAlan.gozcu'] },
  { ad: 'Yüksekte çalışma', kelime: /cati|platform|iskele|asma kat|galeri|yuksek|kule|teras|bant ustu|cephe|kemer|silo ustu|tank ustu/,
    sorular: ['genel.korkuluk', 'yuksekte.kirilgan'],
    sorulsun: ['yuksekte.izin', 'yuksekte.kemerUygun', 'yuksekte.kemerKullanim', 'yuksekte.ankrajHat', 'yuksekte.egitim', 'yuksekte.iskeleKurulum', 'yuksekte.iskelePlatform', 'yuksekte.seyyarMerdiven', 'yuksekte.dusenCisim', 'yuksekte.kurtarma'] },
  { ad: 'Kaldırma / liman', kelime: /vinc|liman|rihtim|iskele basi|gemi|kaldirma|caraskal|portal/,
    sorular: ['kaldirma.vincPeriyodik', 'kaldirma.sapan'],
    sorulsun: ['kaldirma.swl', 'kaldirma.yayaYolu', 'yuksekte.dusenCisim'] },
  { ad: 'Elektrik odası', kelime: /pano|trafo|elektrik|jenerator|enerji|\bmcc\b|kompanzasyon|ups|santral/,
    sorular: ['elektrik.panoOnu', 'elektrik.topraklama'],
    sorulsun: ['elektrik.kacakAkim', 'isaret.uyari', 'acil.alarm'] },
  { ad: 'Ofis / idari', kelime: /ofis|idari|buro|yonetim|toplanti|muhasebe|insan kaynaklari|bilgi islem|arsiv|resepsiyon|kontrol odasi|laboratuvar ofis/,
    sorular: ['elektrik.seyyar', 'ortam.aydinlatma'],
    sorulsun: ['ortam.sicaklik', 'acil.plan', 'genel.kapiCam', 'acil.ilkyardim'], ofis: true },
  { ad: 'Sosyal alan', kelime: /yemekhane|mutfak|kantin|soyunma|wc|tuvalet|\bdus\b|sosyal|revir|mescit|dinlenme|kafeterya/,
    sorular: ['sosyal.soyunma', 'sosyal.su'],
    sorulsun: ['sosyal.dinlenme', 'acil.ilkyardim', 'genel.zemin'], ofis: true },
  { ad: 'Katlı yapı', kelime: /\bkat\b|zemin|bodrum|merdiven/,
    sorular: ['genel.merdiven'],
    sorulsun: ['acil.cikisKapi', 'acil.plan'] }
];
// Acil durum ekipman türü → ilgili madde.
const LD_ONERI_EKIPMAN = {
  'Göz Duşu': 'kimyasal.gozDusu', 'Göz ve Boy Duşu': 'kimyasal.gozDusu', 'Döküntü Kiti': 'kimyasal.sekonder',
  'Yangın Dolabı': 'acil.dolap', 'Hidrant': 'acil.dolap', 'Alarm / Siren': 'acil.alarm',
  'Acil Çıkış Kapısı': 'acil.cikisKapi', 'Acil Aydınlatma': 'acil.kacisYolu', 'Konveyör Hattı': 'konveyor.emniyetTeli'
};

// lokasyon: {bolum, lokasyon, aciklama}; ekipmanTurleri: o lokasyondaki ekipman türleri.
function ldSoruOnerisi(lokasyon, ekipmanTurleri) {
  if (ldSoruBankasiAktifMi()) return _ldBankaOnerisi(lokasyon);
  const metin = ' ' + ldNormalize([lokasyon.bolum, lokasyon.lokasyon, lokasyon.aciklama].filter(Boolean).join(' '))
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/â/g, 'a') + ' ';
  const eslesen = LD_ONERI_KURALLARI.filter(k => k.kelime.test(metin));
  const sorular = new Map(); // anahtar → neden
  const sorulsun = new Map();
  const ekle = (harita, a, neden) => { if (ldSoruGetir(a) && !harita.has(a)) harita.set(a, neden); };
  const sadeceOfis = eslesen.length && eslesen.every(k => k.ofis || k.ad === 'Katlı yapı');
  LD_ONERI_CEKIRDEK.forEach(a => ekle(sorular, a, 'Her lokasyonda temel madde'));
  eslesen.forEach(k => {
    k.sorular.forEach(a => ekle(sorular, a, k.ad + ' olduğu için'));
    k.sorulsun.forEach(a => ekle(sorulsun, a, k.ad + ' olduğu için'));
  });
  (ekipmanTurleri || []).forEach(t => { if (LD_ONERI_EKIPMAN[t]) ekle(sorular, LD_ONERI_EKIPMAN[t], `Lokasyonda ${t} olduğu için`); });
  // Hiçbir kurala uymadıysa: genel saha varsayımıyla üretim maddelerini sor.
  if (!eslesen.length) {
    ['makine.hareketli', 'kkd.kullanim', 'genel.istif', 'isaret.uyari', 'acil.plan'].forEach(a => ekle(sorulsun, a, 'Lokasyon adından türü anlaşılamadı'));
  } else if (!sadeceOfis) {
    ['kkd.levha', 'isaret.uyari', 'ortam.aydinlatma'].forEach(a => ekle(sorulsun, a, 'Çalışma alanı olduğu için'));
  }
  LD_ONERI_CEKIRDEK_SOR.concat(['acil.ilkyardim', 'belge.talimatlar']).forEach(a => ekle(sorulsun, a, 'Genel öneri'));
  sorular.forEach((_, a) => sorulsun.delete(a));
  return {
    turler: eslesen.map(k => k.ad),
    sorular: Array.from(sorular, ([anahtar, neden]) => ({ anahtar, neden })),
    sorulsun: Array.from(sorulsun, ([anahtar, neden]) => ({ anahtar, neden }))
  };
}

// ---------------------------------------------------------------------------
// Kullanıcı isteği (2026-11-20): "lokasyon kontrolünde soruları bunlar ile
// değiştir" — firmanın kendi soru bankası (BAGFAŞ İSG Saha Kontrol Listesi:
// Tesis/Bölüm, Alt başlık, Kontrol sorusu, Tür sütunlu Excel). Yüklenen banka
// LD_KATEGORILER'in YERİNE geçer (dizi yerinde değiştirilir, böylece bütün
// sayfa kodu aynen çalışır). Her Tesis/Bölüm bir kategori, Alt başlık o
// kategorideki soru grubu (soru.grup). Kimlikler metinden üretilir (No sütunu
// yeniden sıralansa da sorular eşleşmeye devam eder).
const LD_STANDART_KATEGORILER = LD_KATEGORILER.slice();

function _ldKisaOzet(metin) {
  let h = 5381;
  const s = String(metin || '');
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

function ldSoruBankasiAktifMi() {
  return !!(LD_KATEGORILER[0] && LD_KATEGORILER[0].banka);
}

function ldSoruBankasiniUygula(banka) {
  const yeni = banka && Array.isArray(banka.kategoriler) && banka.kategoriler.length
    ? banka.kategoriler.map(k => Object.assign({}, k, { banka: true }))
    : LD_STANDART_KATEGORILER;
  LD_KATEGORILER.length = 0;
  yeni.forEach(k => LD_KATEGORILER.push(k));
}

// SheetJS satırları (header:1) → banka. Başlık satırı "Kontrol sorusu"
// sütununu içeren ilk satırdır; sütunlar başlık adıyla bulunur.
function ldSoruBankasiSatirlardanOlustur(satirlar) {
  const norm = v => ldNormalize(v).replace(/ı/g, 'i');
  const bi = (satirlar || []).findIndex(r => (r || []).some(h => norm(h) === 'kontrol sorusu'));
  if (bi < 0) return { hata: '"Kontrol sorusu" sütunu bulunamadı. Tesis / Bölüm, Alt başlık ve Kontrol sorusu sütunlu listeyi yükleyin.' };
  const baslik = satirlar[bi].map(norm);
  const sut = ad => baslik.findIndex(h => h === ad || h.startsWith(ad));
  const cTesis = sut('tesis'), cAlt = sut('alt baslik') >= 0 ? sut('alt baslik') : sut('alt başlik'), cSoru = sut('kontrol sorusu'), cTur = sut('tur') >= 0 ? sut('tur') : sut('tür');
  if (cTesis < 0) return { hata: '"Tesis / Bölüm" sütunu bulunamadı.' };
  const kategoriler = [];
  const harita = new Map();
  let soruSayisi = 0;
  for (let i = bi + 1; i < satirlar.length; i++) {
    const r = satirlar[i] || [];
    const tesis = String(r[cTesis] || '').trim();
    const soru = String(r[cSoru] || '').trim();
    if (!tesis || !soru) continue;
    let kat = harita.get(tesis);
    if (!kat) {
      kat = { id: 'b' + _ldKisaOzet(tesis), ad: tesis, varsayilan: /^genel\b/i.test(tesis), sorular: [] };
      harita.set(tesis, kat);
      kategoriler.push(kat);
    }
    let id = 'q' + _ldKisaOzet(soru);
    let n = 2;
    while (kat.sorular.some(s => s.id === id)) id = 'q' + _ldKisaOzet(soru) + '_' + (n++);
    kat.sorular.push({ id, soru, mevzuat: '', grup: cAlt >= 0 ? String(r[cAlt] || '').trim() : '', tur: cTur >= 0 ? String(r[cTur] || '').trim() : '' });
    soruSayisi++;
  }
  if (!soruSayisi) return { hata: 'Listede soru bulunamadı.' };
  // Aynı alt başlığın soruları listede dağınık olabilir: ilk görüldüğü sıraya göre bir araya getir.
  kategoriler.forEach(k => {
    const sira = new Map();
    k.sorular.forEach(s => { if (!sira.has(s.grup)) sira.set(s.grup, sira.size); });
    k.sorular = k.sorular.map((s, i) => [s, i]).sort((x, y) => (sira.get(x[0].grup) - sira.get(y[0].grup)) || (x[1] - y[1])).map(x => x[0]);
  });
  return { banka: { kategoriler, soruSayisi, tarih: new Date().toISOString() } };
}

// Lokasyon/bölüm adını bankadaki Tesis/Bölüm kategorisiyle eşleştirir
// (ör. "Can-An Ambarı" ↔ "CANAN ambarı", "Sülfürik Asit Tesisi" ↔ "Sülfürik asit").
const _LD_GENEL_KELIMELER = new Set(['ve', 'ile', 'tesisi', 'tesis', 'tesisleri', 'ambari', 'ambar', 'alani', 'bolumu', 'bolum', 'mudurlugu', 'sahasi', 'genel', 'tum', 'sahalar', 'uretim', 'uretimi', 'birimi', 'servisi', 'kat', 'zemin']);
function _ldKelimeler(metin) {
  const s = ldNormalize(metin).replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/₂|₃/g, '');
  const bitisik = s.replace(/[^a-z0-9]+/g, '');
  return { bitisik, kelimeler: s.split(/[^a-z0-9]+/).filter(k => k.length >= 3 && !_LD_GENEL_KELIMELER.has(k)) };
}
function ldBankaKategorisiBul(lokasyon) {
  if (!ldSoruBankasiAktifMi()) return null;
  const hedefler = [lokasyon.bolum, lokasyon.lokasyon, lokasyon.aciklama].filter(Boolean).map(_ldKelimeler);
  let enIyi = null, enIyiPuan = 0;
  LD_KATEGORILER.forEach(k => {
    if (k.varsayilan) return;
    const kk = _ldKelimeler(String(k.ad).replace(/\(.*?\)/g, ' '));
    let puan = 0;
    hedefler.forEach((h, hi) => {
      const agirlik = hi === 0 ? 3 : 1;
      if (kk.bitisik && h.bitisik && (h.bitisik.includes(kk.bitisik) || kk.bitisik.includes(h.bitisik))) puan += 5 * agirlik;
      kk.kelimeler.forEach(w => { if (h.kelimeler.some(x => x === w || (w.length >= 5 && (x.startsWith(w.slice(0, 5)))))) puan += agirlik; });
    });
    if (puan > enIyiPuan) { enIyiPuan = puan; enIyi = k; }
  });
  return enIyi;
}
function ldBankaGenelKategorisi() {
  return LD_KATEGORILER.find(k => k.banka && k.varsayilan) || null;
}

// Firma soru bankası yüklüyse öneri: lokasyonun eşleştiği Tesis/Bölüm'ün saha
// soruları önerilir; doküman soruları ve Genel'in alt başlıkları grup grup
// "Bunu da ekleyelim mi?" diye sorulur. Eşleşme yoksa Genel'in temel alt
// başlıkları önerilir ve her Tesis/Bölüm "bu alan ... mı?" diye sorulur.
function _ldBankaOnerisi(lokasyon) {
  const kat = ldBankaKategorisiBul(lokasyon);
  const genel = ldBankaGenelKategorisi();
  const sorular = [];
  const sorulsun = [];
  const grupla = (k, liste) => {
    const g = new Map();
    liste.forEach(s => { const ad = s.grup || 'Diğer'; if (!g.has(ad)) g.set(ad, []); g.get(ad).push(k.id + '.' + s.id); });
    return g;
  };
  const sahaMi = s => !/dok[uü]man/i.test(s.tur || '');
  if (kat) {
    const saha = kat.sorular.filter(sahaMi);
    (saha.length ? saha : kat.sorular).forEach(s => sorular.push({ anahtar: kat.id + '.' + s.id, neden: kat.ad + (s.grup ? ' — ' + s.grup : '') }));
    const dok = saha.length ? kat.sorular.filter(s => !sahaMi(s)) : [];
    if (dok.length) sorulsun.push({ anahtar: 'grup:' + kat.id + ':dok', anahtarlar: dok.map(s => kat.id + '.' + s.id), etiket: `${kat.ad} — doküman/kayıt soruları (${dok.length})`, neden: 'Sahada değil, kayıt üzerinden kontrol edilir' });
  } else if (genel) {
    grupla(genel, genel.sorular.filter(sahaMi)).forEach((anahtarlar, ad) => {
      if (/d[uü]zen|yang[ıi]n|acil/i.test(ad)) anahtarlar.forEach(a => sorular.push({ anahtar: a, neden: 'Genel — ' + ad }));
    });
    LD_KATEGORILER.filter(k => !k.varsayilan).forEach(k => sorulsun.push({ anahtar: 'grup:' + k.id, anahtarlar: k.sorular.map(s => k.id + '.' + s.id), etiket: `Bu alan "${k.ad}" mı? Sorularını ekle (${k.sorular.length})`, neden: 'Lokasyon adı bankadaki bölümlerle eşleşmedi' }));
  }
  if (genel) {
    const secili = new Set(sorular.map(o => o.anahtar));
    grupla(genel, genel.sorular).forEach((anahtarlar, ad) => {
      const kalan = anahtarlar.filter(a => !secili.has(a));
      if (kalan.length) sorulsun.push({ anahtar: 'grup:' + genel.id + ':' + _ldKisaOzet(ad), anahtarlar: kalan, etiket: `${genel.ad} — ${ad} (${kalan.length} soru)`, neden: 'Genel sorular' });
    });
  }
  return { turler: kat ? [kat.ad] : [], sorular, sorulsun };
}