// İSG Kurulu veri modeli: Toplantılar ve Kararlar.

const TOPLANTI_DURUMLARI = ['Planlandı', 'Tamamlandı', 'Ertelendi', 'İptal'];
const KARAR_DURUMLARI = ['Açık', 'Devam Ediyor', 'Onay Bekliyor', 'Kapalı', 'İptal'];
const GUNDEM_TURLERI = ['Genel', 'İş Kazası', 'Risk', 'Uygunsuzluk', 'Eğitim', 'Yasal Şart', 'Yüklenici', 'Acil Durum', 'Diğer'];

// İSG Kurulları Hakkında Yönetmelik Madde 6 (a-f bentleri) — kısa biçimde.
// "Kurul Başkanı" ve "Kurul Sekreteri" yönetmelikteki üyelik kategorileri
// değil, bu belirli toplantı için işlevsel rollerdir; işaretlenen kişi
// toplantının Başkan/Kurul Sekreteri bilgisini otomatik besler (bkz.
// service.js toplantiBaskanSekreterGetir).
const KURUL_GOREVLERI = [
  'Kurul Başkanı',
  'Kurul Sekreteri',
  'İşveren Vekili',
  'İş Güvenliği Uzmanı',
  'İşyeri Hekimi',
  'İnsan Kaynakları, Personel ve Sosyal İşler',
  'Sivil Savunma Uzmanı',
  'Formen / Ustabaşı',
  'Çalışan Temsilcisi',
  'Üye'
];

function katilimcilariAyir(metin) {
  return String(metin || '')
    .split(/[;,\n]+/)
    .map(k => k.trim())
    .filter(Boolean);
}

function gundemMaddesiOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    tur: veriler.tur || 'Genel',
    baslik: (veriler.baslik || '').trim(),
    not: (veriler.not || '').trim()
  };
}

function toplantiOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    toplantiNo: veriler.toplantiNo || '',
    baslik: (veriler.baslik || '').trim() || 'İSG Kurul Toplantısı',
    tarih: veriler.tarih || '',
    saat: veriler.saat || '14:00',
    // Toplantının değerlendirdiği dönem (ör. toplantı Ağustos'ta yapılsa da
    // Temmuz ayı faaliyetlerini görüşüyor olabilir); "YYYY-MM" formatında.
    // Boşsa raporlarda/otomatik Olaylar eşleştirmesinde toplantı tarihinin
    // ayı kullanılır.
    donem: veriler.donem || '',
    yer: (veriler.yer || '').trim(),
    // Eski üretim uygulamasındaki ayrı tesis/bölüm alanları (bkz. m_tesis/m_bolum,
    // isg-kurul-standalone-patched.html) — "Yer" toplantının fiziken yapıldığı yeri,
    // bunlar ise raporlanan tesis/bölümü ifade eder (çoğunlukla aynıdır ama farklı olabilir).
    tesis: (veriler.tesis || '').trim(),
    bolum: (veriler.bolum || '').trim(),
    baskan: (veriler.baskan || '').trim(),
    yazman: (veriler.yazman || '').trim(),
    katilimcilar: Array.isArray(veriler.katilimcilar) ? veriler.katilimcilar : katilimcilariAyir(veriler.katilimcilar),
    // İmza Listesi'nden ayrı, toplantı formunda elle girilen katılımcı sayısı
    // (eski uygulamadaki m_katilimciSayisi) — imza listesindeki fiili satır
    // sayısından farklı olabilir (ör. rapor teslim tarihinde henüz imza
    // listesi işlenmemişse).
    katilimciSayisi: veriler.katilimciSayisi != null && veriler.katilimciSayisi !== '' ? String(veriler.katilimciSayisi) : '',
    gundem: Array.isArray(veriler.gundem) ? veriler.gundem : [],
    durum: veriler.durum || 'Planlandı',
    // Eski üretim uygulamasındaki m_genel/m_faaliyetMetni/m_metrikler — risk360
    // eskiden bunları tek bir "notlar" alanında birleştiriyordu (bkz. toplanti-ui.js
    // eski JSON içe aktarım), artık ayrı alanlar olarak tutulur; "notlar" serbest
    // ek not alanı olarak kalmaya devam eder.
    genelDegerlendirme: (veriler.genelDegerlendirme || '').trim(),
    // Genel Değerlendirme'nin altında ayrı ayrı raporlanan üç alt başlık
    // (kullanıcı isteği: "ilgili dönemde planlanan faaliyetlerin gerçekleşme
    // durumları, tespit edilen hususlar, çalışanların bildirimleri gibi
    // şeyler ekleyelim") — genelDegerlendirme genel özet cümlesi olarak kalır,
    // bunlar raporda ayrı paragraflar olarak altına eklenir (bkz. cikti.js).
    planlananFaaliyetlerGerceklesme: (veriler.planlananFaaliyetlerGerceklesme || '').trim(),
    tespitEdilenHususlar: (veriler.tespitEdilenHususlar || '').trim(),
    calisanBildirimleri: (veriler.calisanBildirimleri || '').trim(),
    faaliyetMetni: (veriler.faaliyetMetni || '').trim(),
    metrikler: (veriler.metrikler || '').trim(),
    // Gündem maddesi "Çalışan temsilcilerinin görüş ve önerileri" (2026-08-04
    // kullanıcı talebiyle eklendi) — kurul raporlarında ayrı bir bölüm olarak
    // basılır, boşsa KURUL_RAPOR_VARSAYILANLARI.gorusler kullanılır.
    calisanTemsilcisiGorusleri: (veriler.calisanTemsilcisiGorusleri || '').trim(),
    notlar: (veriler.notlar || '').trim(),
    // Her olay için "Bu Toplantının Kararları"nda otomatik açılan taslak karar
    // satırlarının hangi olay id'leri için zaten oluşturulduğunu tutar (bkz.
    // service.js toplantiOlaylariIcinKararTaslaklariniOlustur) — kullanıcı bir
    // taslağı gereksiz bulup silerse, bir sonraki sayfa açılışında AYNI olay
    // için tekrar oluşturulmasın diye (mevcut karar aranarak değil, bu listeye
    // bakılarak) kalıcı olarak işaretlenir.
    olayKarariOlusturulanIdler: Array.isArray(veriler.olayKarariOlusturulanIdler) ? veriler.olayKarariOlusturulanIdler : [],
    // Otomatik (Olay/Kaza modülünden çekilen) olay satırlarından "Sil"
    // denilenlerin kaza id'leri — bkz. service.js _kurulOtomatikOlaylariGetir.
    otomatikOlayGizliKazaIdleri: Array.isArray(veriler.otomatikOlayGizliKazaIdleri) ? veriler.otomatikOlayGizliKazaIdleri : [],
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}

function kararOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    kararNo: veriler.kararNo || '',
    toplantiId: veriler.toplantiId || '',
    kararMetni: (veriler.kararMetni || '').trim(),
    kaynakGundem: (veriler.kaynakGundem || '').trim(),
    // Bu karar bir olaydan otomatik açılan taslaksa (bkz. service.js
    // toplantiOlaylariIcinKararTaslaklariniOlustur), kaynak olayın id'si —
    // manuel eklenen kararlarda hep boştur.
    kaynakOlayId: (veriler.kaynakOlayId || '').trim(),
    sorumlu: (veriler.sorumlu || '').trim(),
    termin: veriler.termin || '',
    oncelik: veriler.oncelik || 'Normal',
    durum: veriler.durum || 'Açık',
    devreden: !!veriler.devreden,
    // Eski üretim uygulamasındaki oy/oySonucu alanları (resmi toplantı
    // tutanağında kararın nasıl alındığının kaydı) — çoğu karar oybirliğiyle
    // alındığı için formda varsayılan metin önerilir (bkz. KURUL_RAPOR_VARSAYILANLARI),
    // ama burada zorunlu tutulmaz.
    oy: (veriler.oy || '').trim(),
    oySonucu: (veriler.oySonucu || '').trim(),
    // Eski üretim uygulamasındaki sayısal oylama dökümü — raporda "Kabul / Ret /
    // Çekimser" sırasıyla "K/R/Ç" biçiminde ve aynı dipnotla gösterilir (bkz.
    // isg-kurul-standalone-direct.html satır ~3230, ~5009). oySonucu'nun (cümle
    // biçimindeki özet) yerine değil, yanına eklenir — ikisi farklı amaçlara hizmet eder.
    oyKabul: veriler.oyKabul === '' || veriler.oyKabul == null ? null : Number(veriler.oyKabul),
    oyRet: veriler.oyRet === '' || veriler.oyRet == null ? null : Number(veriler.oyRet),
    oyCekimser: veriler.oyCekimser === '' || veriler.oyCekimser == null ? null : Number(veriler.oyCekimser),
    // Açık bir kararın otomatik devreden hesaplamasından (bkz. service.js
    // toplantiKararGruplariniGetir) elle hariç tutulmasını sağlar — eski
    // uygulamadaki "devrederMi: Hayır" işaretlemesinin karşılığı. Varsayılan
    // true: işaretlenmediği sürece açık kararlar normal şekilde devreder.
    devrederMi: veriler.devrederMi !== undefined ? !!veriler.devrederMi : true,
    kapanisTarihi: veriler.kapanisTarihi || '',
    kanit: (veriler.kanit || '').trim(),
    // İlerleme/aksiyon notu — durumdan bağımsız, her toplantıda güncellenip
    // birikimli olarak tutulan serbest metin (ör. "Nisan: ... Mayıs: ...").
    aksiyonNotu: (veriler.aksiyonNotu || '').trim(),
    // Kapanan bir karar, kapandıktan sonraki ilk toplantıda "devreden / tamamlandı"
    // olarak bir kez gösterilir; gösterildikten sonra bu bayrak true olur ve
    // sonraki hiçbir toplantının devreden listesinde tekrar görünmez.
    devredenTamamlandiGosterildi: !!veriler.devredenTamamlandiGosterildi,
    fotoOncesi: veriler.fotoOncesi || '',
    fotoSonrasi: veriler.fotoSonrasi || '',
    fotografEk: (Array.isArray(veriler.fotografEk) ? veriler.fotografEk : []).slice(0, 3),
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}

// Toplantıda görüşülen olay/kaza/ramak kala kaydı (rapor/PPTX için hafif özet;
// tam olay kaydı için ayrı Olay/Kaza modülü kullanılır — bu sadece o toplantıda
// görüşülenlerin toplantıya özel bir özetidir).
function kurulOlayiOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    toplantiId: veriler.toplantiId || '',
    tur: (veriler.tur || '').trim(),
    tarih: veriler.tarih || '',
    yer: (veriler.yer || '').trim(),
    birim: (veriler.birim || '').trim(),
    olusSekli: (veriler.olusSekli || '').trim(),
    kokNeden: (veriler.kokNeden || '').trim(),
    isGunuKaybi: (veriler.isGunuKaybi || '').trim(),
    // Olaya bağlı karar takibi — kararlar tablosundakiyle aynı 4 alan, ama
    // ayrı bir Karar kaydı OLUŞTURMADAN doğrudan olayın kendisinde tutulur
    // (kullanıcı isteği: önceki "olaydan otomatik karar taslağı aç" özelliği
    // geri alındı, bunun yerine). Termin girilmiş VE durum "Kapalı"/"İptal"
    // değilse, bu olay sonraki toplantılarda "Devreden Kararlar" listesine de
    // dahil edilir (bkz. service.js toplantiKararGruplariniGetir).
    kararMetni: (veriler.kararMetni || '').trim(),
    sorumlu: (veriler.sorumlu || '').trim(),
    termin: veriler.termin || '',
    oncelik: veriler.oncelik || 'Normal',
    durum: veriler.durum || 'Açık',
    // Kararlardakiyle aynı oylama alanları (bkz. kararOlustur) — raporda aynı
    // "Oy Sonucu" satırı ve K/R/Ç dökümü olay kartlarında da gösterilebilsin.
    oy: (veriler.oy || '').trim(),
    oySonucu: (veriler.oySonucu || '').trim(),
    oyKabul: veriler.oyKabul === '' || veriler.oyKabul == null ? null : Number(veriler.oyKabul),
    oyRet: veriler.oyRet === '' || veriler.oyRet == null ? null : Number(veriler.oyRet),
    oyCekimser: veriler.oyCekimser === '' || veriler.oyCekimser == null ? null : Number(veriler.oyCekimser),
    // Bu kayıt, otomatik (Olay/Kaza modülünden çekilen) bir satırın "Düzenle"
    // ile gerçek/düzenlenebilir bir kurul_olaylari kaydına yükseltilmiş hâliyse,
    // kaynak Olay/Kaza kaydının id'si — böylece o kaza bir daha otomatik
    // listede tekrar görünmez (bkz. service.js _kurulOtomatikOlaylariGetir).
    kaynakKazaId: (veriler.kaynakKazaId || '').trim(),
    // En fazla 3 olay yeri fotoğrafı — Olay/Kaza modülünden otomatik çekilen
    // olaylarla AYNI alan adı ve şekli (bkz. service.js _kurulOtomatikOlaylariGetir)
    // kasıtlı olarak kullanıldı ki cikti.js'teki foto çözme/render kodu
    // (_pdfOlaylarFotoCoz, _wordOlayKarti, PPTX olaySlaydi) kaynaktan bağımsız
    // tek bir yol olarak çalışabilsin.
    fotograflar: Array.isArray(veriler.fotograflar) ? veriler.fotograflar.slice(0, 3) : [],
    // Aynı toplantı içindeki elle eklenen olaylar arasında yukarı/aşağı
    // taşıma sırası (kullanıcı isteği: "isg kurulu olay içinde yukarı aşağı
    // taşıma olsun" — toplantılar arası değil). Yeni kayıtlar en sona eklenir.
    sira: veriler.sira != null && veriler.sira !== '' ? Number(veriler.sira) : 0,
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}

// Toplantı katılımcı / imza listesi satırı.
function imzaSatiriOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    toplantiId: veriler.toplantiId || '',
    siraNo: veriler.siraNo || '',
    adSoyad: (veriler.adSoyad || '').trim(),
    unvan: (veriler.unvan || '').trim(),
    birim: (veriler.birim || '').trim(),
    // Kişinin genel unvanından ayrı olarak İSG Kurulu içindeki rolü
    // (ör. Kurul Başkanı, İş Güvenliği Uzmanı, Çalışan Temsilcisi).
    kuruldakiGorev: (veriler.kuruldakiGorev || '').trim(),
    katildiMi: veriler.katildiMi !== undefined ? !!veriler.katildiMi : true,
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}

// Ay içinde gerçekleştirilen serbest biçimli İSG çalışması satırı (eski
// uygulamadaki "monthly" sekmesi — saha kontrolü, KKD uyarısı, yüklenici
// faaliyeti gibi tekil kalemlerin adet bazlı dökümü; hem Ay İçi Çalışmalar
// eğitim/uygunsuzluk entegrasyonlarından ayrıdır).
function ayIciFaaliyetOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    toplantiId: veriler.toplantiId || '',
    faaliyet: (veriler.faaliyet || '').trim(),
    adet: veriler.adet != null && veriler.adet !== '' ? String(veriler.adet) : '',
    aciklama: (veriler.aciklama || '').trim(),
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}

// Kurul modülündeki tüm varlık türlerinde (toplantı/karar/aksiyon/olay/imza)
// oluşturma-güncelleme-silme işlemlerinin denetim izi (eski uygulamadaki
// "audit" sekmesinin karşılığı). "once"/"sonra" yalnızca değişen alanları
// taşır (bkz. service.js _denetimFarkiCikar), tüm kaydı değil.
function denetimKaydiOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    varlikTuru: veriler.varlikTuru || '',
    varlikId: veriler.varlikId || '',
    eylem: veriler.eylem || '',
    once: veriler.once || null,
    sonra: veriler.sonra || null,
    kullanici: veriler.kullanici || '',
    tarihISO: veriler.tarihISO || new Date().toISOString()
  };
}

// Eski üretim uygulamasındaki ISG_RAPOR_CONFIG (isg-kurul-standalone-patched.html,
// satır ~695): raporlarda boş bırakılan bölümler için hazır yasal/idari metin —
// böylece bir toplantı raporu hiçbir alan doldurulmasa bile boş/amatör görünmez.
// Yalnızca ilgili alan tamamen boşsa kullanılır (bkz. cikti.js _varsayilanliMetin).
const KURUL_RAPOR_VARSAYILANLARI = {
  genelDegerlendirme: 'İş sağlığı ve güvenliği uygulamaları kapsamında ilgili dönemde planlanan faaliyetler gerçekleştirilmiş, tespit edilen hususlar kurul gündemine alınarak değerlendirilmiştir.',
  planlananFaaliyetlerGerceklesme: 'İlgili dönemde planlanan İSG faaliyetleri öngörüldüğü şekilde gerçekleştirilmiştir.',
  tespitEdilenHususlar: 'İlgili dönemde ayrıca tespit edilen bir husus bulunmamaktadır.',
  calisanBildirimleri: 'İlgili dönemde çalışanlardan iş sağlığı ve güvenliğine ilişkin herhangi bir bildirim alınmamıştır.',
  ayIciCalismalar: 'İlgili dönemde saha denetimleri, eğitim faaliyetleri ve risk değerlendirme çalışmaları kapsamında planlanan İSG faaliyetleri sürdürülmüştür.',
  olaylar: 'İlgili dönemde kurula bildirilen iş kazası veya ramak kala olayı bulunmamaktadır.',
  devredenKararlar: 'Önceki toplantılardan devreden açık karar bulunmamaktadır.',
  gorusler: 'Kurul üyelerince ek görüş bildirilmemiştir.',
  sorumlu: 'İşveren Vekili koordinasyonunda ilgili birim',
  termin: 'Bir sonraki kurul toplantısına kadar',
  oySonucu: 'Oy birliği ile kabul edilmiştir.'
};

// İSG Kurulları Hakkında Yönetmelik'in kurulun görev/yetki, çalışma usulü ve
// işveren/kurul yükümlülüklerine ilişkin maddeleri (kullanıcı isteği:
// "gündemin altına ... çalışma usullerini ekleyelim" / "bu kısmı ekleyelim
// yönetmelikten") — toplantı sayfasında Gündem'in altında referans amaçlı
// (daralt/genişlet kutusu) gösterilir, bkz. toplanti-ui.js
// _yonetmelikMaddeleriGoruntuUret. Metin birebir yönetmelikten alınmıştır,
// ÖZETLENMEMİŞTİR.
const YONETMELIK_MADDELERI = [
  {
    madde: 'MADDE 8',
    baslik: 'Görev ve yetkiler',
    fikralar: [
      {
        giris: '(1) Kurulun görev ve yetkileri şunlardır;',
        bentler: [
          'a) İşyerinin niteliğine uygun bir iş sağlığı ve güvenliği iç yönerge taslağı hazırlamak, işverenin veya işveren vekilinin onayına sunmak ve yönergenin uygulanmasını izlemek, izleme sonuçlarını rapor haline getirip alınması gereken tedbirleri belirlemek ve kurul gündemine almak,',
          'b) İş sağlığı ve güvenliği konularında o işyerinde çalışanlara yol göstermek,',
          'c) İşyerinde iş sağlığı ve güvenliğine ilişkin tehlikeleri ve önlemleri değerlendirmek, tedbirleri belirlemek, işveren veya işveren vekiline bildirimde bulunmak,',
          'ç) İşyerinde meydana gelen her iş kazası ve işyerinde meydana gelen ancak iş kazası olarak değerlendirilmeyen işyeri ya da iş ekipmanının zarara uğratma potansiyeli olan olayları veya meslek hastalığında yahut iş sağlığı ve güvenliği ile ilgili bir tehlike halinde gerekli araştırma ve incelemeyi yapmak, alınması gereken tedbirleri bir raporla tespit ederek işveren veya işveren vekiline vermek,',
          'd) İşyerinde iş sağlığı ve güvenliği eğitim ve öğretimini planlamak, bu konu ve kurallarla ilgili programları hazırlamak, işveren veya işveren vekilinin onayına sunmak ve bu programların uygulanmasını izlemek ve eksiklik görülmesi halinde geri bildirimde bulunmak,',
          'e) İşyerinde yapılacak bakım ve onarım çalışmalarında gerekli güvenlik tedbirlerini planlamak ve bu tedbirlerin uygulamalarını kontrol etmek,',
          'f) İşyerinde yangın, doğal afet, sabotaj ve benzeri tehlikeler için alınan tedbirlerin yeterliliğini ve ekiplerin çalışmalarını izlemek,',
          'g) İşyerinin iş sağlığı ve güvenliği durumuyla ilgili yıllık bir rapor hazırlamak, o yılki çalışmaları değerlendirmek, elde edilen tecrübeye göre ertesi yılın çalışma programında yer alacak hususları değerlendirerek belirlemek ve işverene teklifte bulunmak,',
          'ğ) 6331 sayılı İş Sağlığı ve Güvenliği Kanununun 13 üncü maddesinde belirtilen çalışmaktan kaçınma hakkı talepleri ile ilgili acilen toplanarak karar vermek,',
          'h) İşyerinde teknoloji, iş organizasyonu, çalışma şartları, sosyal ilişkiler ve çalışma ortamı ile ilgili faktörlerin etkilerini kapsayan tutarlı ve genel bir önleme politikası geliştirmeye yönelik çalışmalar yapmak.'
        ]
      },
      { giris: '(2) Kurul üyeleri bu Yönetmelikle kendilerine verilen görevleri yapmalarından dolayı hakları kısıtlanamaz, kötü davranış ve muameleye maruz kalamazlar.', bentler: [] }
    ]
  },
  {
    madde: 'MADDE 9',
    baslik: 'Çalışma usulleri',
    fikralar: [
      {
        giris: '(1) Kurul inceleme, izleme ve uyarmayı öngören bir düzen içinde ve aşağıdaki esasları göz önünde bulundurarak çalışır.',
        bentler: [
          'a) Kurullar ayda en az bir kere toplanır. Ancak kurul, işyerinin tehlike sınıfını dikkate alarak, tehlikeli işyerlerinde bu sürenin iki ay, az tehlikeli işyerlerinde ise üç ay olarak belirlenmesine karar verebilir.',
          'b) Toplantının gündemi, yeri, günü ve saati toplantıdan en az kırk sekiz saat önce kurul üyelerine bildirilir. Gündem, sorunların ve varsa iş sağlığı ve güvenliğine ilişkin projelerin önem sırasına göre belirlenir. Kurul üyeleri gündemde değişiklik isteyebilirler. Bu istek kurulca uygun görüldüğünde gündem buna göre değiştirilir.',
          'c) Ölümlü, uzuv kayıplı veya ağır iş kazası halleri veya özel bir tedbiri gerektiren önemli hallerde kurul üyelerinden herhangi biri kurulu olağanüstü toplantıya çağırabilir. Bu konudaki tekliflerin kurul başkanına veya sekreterine yapılması gerekir. Toplantı zamanı, konunun ivedilik ve önemine göre tespit olunur.',
          'ç) Kurul toplantılarının günlük çalışma saatleri içinde yapılması asıldır. Kurulun toplantılarında geçecek süreler günlük çalışma süresinden sayılır.',
          'd) Kurul, üye tam sayısının salt çoğunluğu ile işveren veya işveren vekili başkanlığında toplanır ve katılanların salt çoğunluğu ile karar alır. Çekimser oy kullanılamaz. Oyların eşitliği halinde başkanın oyu kararı belirler. Çoğunluğun sağlanamadığı veya başka bir nedenle toplantının yapılmadığı hallerde durumu belirten bir tutanak düzenlenir.',
          'e) Her toplantıda, görüşülen konularla ilgili alınan kararları içeren bir tutanak düzenlenir. Tutanak, toplantıya katılan başkan ve üyeler tarafından imzalanır. İmza altına alınan kararlar herhangi bir işleme gerek kalmaksızın işverene bildirilmiş sayılır. İmzalı tutanak ve kararlar sırasıyla özel dosyasında saklanır.',
          'f) Toplantıda alınan kararlar gereği yapılmak üzere ilgililere duyurulur. Ayrıca çalışanlara duyurulması faydalı görülen konular işyerinde ilân edilir.',
          'g) Her toplantıda, önceki toplantıya ilişkin kararlar ve bunlarla ilgili uygulamalar hakkında başkan veya kurulun sekreteri tarafından kurula gerekli bilgi verilir ve gündeme geçilir.'
        ]
      },
      { giris: '(2) Kurulca işyerinde ilân edilen kararlar işverenleri ve çalışanları bağlar.', bentler: [] },
      { giris: '(3) Kurul, 6331 sayılı İş Sağlığı ve Güvenliği Kanununun 13 üncü maddesinde belirtilen çalışmaktan kaçınma hakkı taleplerinde birinci fıkranın (a) bendine göre belirlenen süre dikkate alınmaksızın acilen toplanır. Toplantıda alınan karar çalışan ve çalışan temsilcisine yazılı olarak tebliğ edilir.', bentler: [] }
    ]
  },
  {
    madde: 'MADDE 10',
    baslik: 'İşverenin veya işveren vekilinin kurula ilişkin genel yükümlülüğü',
    fikralar: [
      { giris: '(1) İşveren veya işveren vekili, kurul için gerekli toplantı yeri, araç ve gereçleri sağlar.', bentler: [] },
      { giris: '(2) İşveren veya işveren vekili, kurulca hazırlanan toplantı tutanaklarını, kaza ve diğer vakaların inceleme raporlarını ve kurulca işyerinde yapılan denetim sonuçlarına ait kurul raporlarını, iş müfettişlerinin incelemesini sağlamak amacıyla, işyerinde bulundurur.', bentler: [] }
    ]
  },
  {
    madde: 'MADDE 11',
    baslik: 'Kurulun yükümlülüğü',
    fikralar: [
      { giris: '(1) Kurullar, yapacakları tekliflerde, bulunacakları tavsiyelerde ve verecekleri kararlarda işyerinin durumunu ve işverenin olanaklarını göz önünde bulundururlar.', bentler: [] },
      { giris: '(2) Kurul üyeleri, görevleri nedeniyle işyerlerinin yapım ve üretim teknikleri, ticari sırları ve ekonomik durumları hakkında gördükleri ve öğrendiklerini gizli tutmak zorundadırlar.', bentler: [] },
      { giris: '(3) Kurullar, iş sağlığı ve güvenliği yönünden teftiş yapmaya yetkili Bakanlık iş müfettişlerine işyerlerinde yapacakları teftiş ve incelemelerde kolaylık sağlamak ve yardımcı olmakla yükümlüdür.', bentler: [] }
    ]
  }
];

// Sayısal oylama dökümünü eski üretim uygulamasındaki "K/R/Ç" biçimine çevirir
// (bkz. kararOlustur yorumu); üçü de boşsa raporun karışmaması için '' döner.
function kararOyDokumMetni(karar) {
  const k = karar.oyKabul, r = karar.oyRet, c = karar.oyCekimser;
  if (k == null && r == null && c == null) return '';
  return `${k ?? 0}/${r ?? 0}/${c ?? 0}`;
}
const KARAR_OY_DOKUM_DIPNOTU = 'Not: Oy bilgisi sırasıyla Kabul / Ret / Çekimser oy sayılarını ifade etmektedir.';

function sonrakiNoUret(onEk, mevcutListe, alanAdi) {
  let maks = 0;
  mevcutListe.forEach(item => {
    const deger = String(item[alanAdi] || '');
    if (!deger.startsWith(onEk)) return;
    const kuyruk = parseInt(deger.slice(onEk.length), 10);
    if (Number.isFinite(kuyruk) && kuyruk > maks) maks = kuyruk;
  });
  return onEk + String(maks + 1).padStart(4, '0');
}

// Toplantı No formatı toplantının ait olduğu aya göre üretilir: "KRL" + AA +
// YYYY (ör. Mayıs 2026 -> KRL052026) — kullanıcı isteği. Önce dönem (varsa,
// "YYYY-MM"), yoksa toplantı tarihi esas alınır. Aynı ay içinde birden fazla
// toplantı olursa (ör. ek/olağanüstü toplantı) çakışmayı önlemek için sonuna
// "-2", "-3" ... eklenir; düzenlemede kendi kaydı çakışma sayılmasın diye
// haricTutulanId ile hariç tutulur.
function toplantiNoUret(donem, tarih, mevcutListe, haricTutulanId) {
  const kaynak = (donem || '').trim() || (tarih || '').trim();
  const ayGunEki = kaynak && kaynak.length === 7 ? '-01' : '';
  const d = kaynak ? new Date(kaynak + ayGunEki + 'T00:00:00') : new Date();
  const gecerliTarih = isNaN(d) ? new Date() : d;
  const ay = String(gecerliTarih.getMonth() + 1).padStart(2, '0');
  const yil = String(gecerliTarih.getFullYear());
  const taban = `KRL${ay}${yil}`;
  const kullanilanlar = new Set(mevcutListe.filter(t => t.id !== haricTutulanId).map(t => t.toplantiNo));
  if (!kullanilanlar.has(taban)) return taban;
  let sira = 2;
  while (kullanilanlar.has(`${taban}-${sira}`)) sira++;
  return `${taban}-${sira}`;
}

// Eski üretim uygulamasındaki karar numaralandırma sistemi: "AY.YIL/SIRA"
// (ör. 07.2026/03) — AY/YIL kararın ait olduğu TOPLANTININ tarihinden gelir,
// SIRA ise o toplantı içindeki kararların 1'den başlayan sırasıdır (global
// değil, her toplantı kendi 01'inden başlar). Karar bir kez numaralandıktan
// sonra devreden hâle gelse veya taşınsa bile bu numara sabit kalır.
function ayYilSiraNoUret(toplantiTarihi, sira) {
  const tarih = toplantiTarihi ? new Date(toplantiTarihi + 'T00:00:00') : new Date();
  const ay = String((isNaN(tarih) ? new Date() : tarih).getMonth() + 1).padStart(2, '0');
  const yil = String((isNaN(tarih) ? new Date() : tarih).getFullYear());
  const sira2 = String(sira).padStart(2, '0');
  return `${ay}.${yil}/${sira2}`;
}

function kararGecikmisMi(karar, bugunStr) {
  if (karar.durum === 'Kapalı' || karar.durum === 'İptal') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(karar.termin || '')) return false;
  return karar.termin < (bugunStr || new Date().toISOString().slice(0, 10));
}

function tutanakMetniUret(toplanti, kararlar, baskanSekreter) {
  const bs = baskanSekreter || { baskan: toplanti.baskan, yazman: toplanti.yazman };
  const satirlar = [];
  satirlar.push(`${toplanti.toplantiNo} - ${toplanti.baslik}`);
  satirlar.push(`Tarih/Saat: ${gunAyYil(toplanti.tarih)} ${toplanti.saat}`);
  satirlar.push(`Yer: ${toplanti.yer || '-'}`);
  satirlar.push(`Başkan: ${bs.baskan || '-'} | Kurul Sekreteri: ${bs.yazman || '-'}`);
  satirlar.push(`Katılımcılar: ${toplanti.katilimcilar.join(', ') || '-'}`);
  satirlar.push('');
  satirlar.push('Gündem:');
  toplanti.gundem.forEach((g, i) => satirlar.push(`${i + 1}. ${g.baslik}${g.not ? ' - ' + g.not : ''}`));
  satirlar.push('');
  satirlar.push('Kararlar:');
  kararlar.forEach((k, i) => satirlar.push(`${i + 1}. ${k.kararMetni} | Sorumlu: ${k.sorumlu || '-'} | Termin: ${gunAyYil(k.termin) || '-'} | Öncelik: ${k.oncelik}`));
  if (toplanti.notlar) {
    satirlar.push('');
    satirlar.push('Notlar: ' + toplanti.notlar);
  }
  return satirlar.join('\n');
}
