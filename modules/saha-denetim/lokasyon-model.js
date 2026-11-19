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

const LD_SONUCLAR = ['Uygun', 'Uygun Değil', 'Uygulanamaz'];

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
  makine: 'Makine Emniyeti Yönetmeliği (2006/42/AT)'
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
    { id: 'dusenCisim', soru: 'Düşen cisimlere karşı alt bölge kapatılmış/işaretlenmiş', mevzuat: _LD_M.ibey }
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
    olusturmaTarihi: v.olusturmaTarihi || new Date().toISOString()
  };
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
  const listedekiler = maddeler.filter(m => !(m.cevap && m.cevap.serbest));
  const toplam = listedekiler.length;
  // Serbest (listede olmayan) tespitler bulgu sayısına ve uygunluk oranına
  // girer, ama "değerlendirilen / toplam madde" oranına girmez.
  return {
    toplam, uygun, uygunDegil, uygulanamaz,
    cevaplanan: listedekiler.filter(m => m.cevap && m.cevap.sonuc).length,
    puan: (uygun + uygunDegil) ? Math.round(uygun * 100 / (uygun + uygunDegil)) : null
  };
}

function ldDenetimIstatistik(denetim) {
  const t = { lokasyon: 0, toplam: 0, uygun: 0, uygunDegil: 0, uygulanamaz: 0, cevaplanan: 0 };
  (denetim.ziyaretler || []).forEach(z => {
    const s = ldZiyaretIstatistik(z);
    t.lokasyon++;
    ['toplam', 'uygun', 'uygunDegil', 'uygulanamaz', 'cevaplanan'].forEach(k => { t[k] += s[k]; });
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
