// Ortak veri katmani.
//
// Kucuk/oturum verileri (kullanicilar, firmalar) localStorage'da kalir ve --
// Firebase yapilandirilmissa -- Firestore'daki "kucuk_veri" koleksiyonuyla
// senkronize edilir (kucuk oldugu icin localStorage'da ayna tutmak sorun
// yaratmaz, ve boylece sayfa acilir acilmaz senkron/anlik okunabilirler).
//
// Firma bazli modul verileri (personel, egitim, sinav, saha denetim vb. --
// core/tenant.js'teki tenantAnahtar() ile uretilen TUM anahtarlar) buyuk
// olabilecegi icin localStorage'a HIC yazilmaz; sadece bellek-ici onbellekte
// tutulur ve Firestore'daki "buyuk_veri" koleksiyonuyla senkronize edilir.
// Boylece localStorage kotasi (~5MB) asla modul verisiyle dolmaz.
//
// oku()/yaz() disariya hep senkron gorunur; modullerin (repository/service/ui)
// hicbirinin bu dosyanin disinda degismesi gerekmez.
//
// Firebase yapilandirilmamissa (SDK script'leri eklenmemis veya config yoksa)
// her sey eskisi gibi duz localStorage uzerinden calisir.

const FIREBASE_CONFIG_ANAHTARI = 'isg_firebase_config';

// Varsayilan proje: Ayarlar sayfasindan farkli bir musteri/firma icin
// degistirilebilir (localStorage'daki ozel config bunu ezer).
const VARSAYILAN_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAPE212ptNf9y4GgtFt11Bh1zOdiSEO13s",
  authDomain: "r360y-8f4d9.firebaseapp.com",
  projectId: "r360y-8f4d9",
  storageBucket: "r360y-8f4d9.firebasestorage.app",
  messagingSenderId: "334347666635",
  appId: "1:334347666635:web:38ef3bbb9a64c7bbe9c74e",
  measurementId: "G-ZPEY0CN7FZ"
};

const _YEREL_SADECE_ANAHTARLAR = new Set(['isg_oturum']);
const _KUCUK_SENKRON_ANAHTARLAR = new Set(['isg_kullanicilar', 'isg_firmalar', 'isg_risk_sablonlari', 'isg_bildirimler', 'isg_oturum_gecmisi']);

let _bulutDb = null;
let _bulutApp = null;
let _bulutAktif = false;
let _bulutKucukHazir = false;
const _bulutKucukCallbackleri = [];

const _bulutOnbellek = {};
let _bulutFirmaSlugu = null;
let _bulutFirmaDinleyiciDurdur = null;
let _bulutFirmaHazir = false;
const _bulutFirmaCallbackleri = [];

function oku(anahtar, varsayilan) {
  if (_bulutAktif && !_YEREL_SADECE_ANAHTARLAR.has(anahtar) && !_KUCUK_SENKRON_ANAHTARLAR.has(anahtar)) {
    if (!Object.prototype.hasOwnProperty.call(_bulutOnbellek, anahtar)) return varsayilan;
    const deger = _bulutOnbellek[anahtar];
    // _bulutOnbellek[anahtar]'ı DOĞRUDAN döndürmek yerine (dizi ise) sığ bir
    // kopyasını veririz: repository katmanındaki standart desen "const liste =
    // xTumunuGetir(); liste.push(yeni); xKaydet(liste)" şeklindedir — canlı
    // referans döndürülseydi liste.push() önbelleği DAHA yaz() çağrılmadan
    // mutasyona uğratır, bu da "önceki/sonraki" karşılaştırması yapan kodların
    // (bkz. _yaziEkBildirimKontrolEt) iki tarafı da aynı (zaten değişmiş)
    // diziyle karşılaştırmasına, dolayısıyla eklemeleri asla fark edememesine
    // yol açar. Kopyalama bunu kalıcı olarak önler.
    return Array.isArray(deger) ? deger.slice() : deger;
  }
  const ham = localStorage.getItem(anahtar);
  if (ham === null) return varsayilan;
  try {
    return JSON.parse(ham);
  } catch (e) {
    return varsayilan;
  }
}

// localStorage.setItem kota hatası (özellikle file:// altında kota çok düşük
// olabilir) fırlatırsa bulut/Firestore yazımını engellememesi için yutulur;
// sadece uyarı basılır. Veri zaten Firestore'a (veya _bulutOnbellek'e) gittiği
// için işlev kaybı olmaz, sadece bu cihazdaki senkron localStorage aynası
// güncellenmemiş olur (bir sonraki bulut senkronunda kendiliğinden düzelir).
function _yerelYazDene(anahtar, deger) {
  try {
    localStorage.setItem(anahtar, deger);
  } catch (e) {
    console.warn('localStorage yazılamadı (kota dolu olabilir):', anahtar, e);
  }
}

// rol==='duzenleyici' kullanıcılar silemez ama TÜM modüllere ekleme/düzenleme
// yapabilir (bkz. core/auth.js) — admin'in bunu görebilmesi için, bu
// kullanıcılardan biri bir anahtara yeni bir kayıt eklediğinde (dizi boyu
// arttığında) 'isg_bildirimler'e bir satır düşülür. Modüllerin Ekle
// fonksiyonlarının HER BİRİNE dokunmadan tek bir yerden (yaz()) yakalamak
// için: değişiklikten ÖNCEKİ diziyle karşılaştırılır, sadece UZAYAN diziler
// "yeni kayıt" sayılır (güncelleme/silme bildirilmez). Kullanıcı isteği:
// "yeni birşey eklediğinde admine bilgi gitsin".
// Yeni eklenen kaydın "kim ne yaptı" bildiriminde okunabilir bir etiketle
// görünmesi için, kayıt nesnesindeki yaygın isim/başlık alanlarından ilk
// doluyu kullanır (modüller arası ortak bir şema olmadığından tahmine
// dayalı ama pratikte hemen hepsini kapsar).
function _bildirimIcinKayitEtiketi(kayit) {
  if (!kayit || typeof kayit !== 'object') return '';
  const adaylar = ['adSoyad', 'ad', 'baslik', 'konu', 'aciklama', 'unvan', 'ekipmanAdi', 'malzemeAdi', 'sicilNo', 'tesisAdi'];
  for (const alan of adaylar) {
    if (kayit[alan]) return String(kayit[alan]);
  }
  return '';
}

function _yaziEkBildirimKontrolEt(anahtar, yeniDeger) {
  if (anahtar === 'isg_bildirimler' || !Array.isArray(yeniDeger)) return;
  try {
    const kullanici = oturumdakiKullanici();
    // admin veya düzenleyici yeni kayıt eklediğinde TÜM kullanıcılara görünür
    // bir bildirim düşer (kullanıcı isteği: "kullanıcı şifresi olan herkeste
    // zil bildirim kısmı olsun ... admin/düzenleyici yeni kayıt eklediğinde
    // HERKESE görünsün"). İK'nın kendi (Personel/Eğitim) eklemeleri şimdilik
    // bildirime dahil değil.
    if (!kullanici || !(kullaniciAdminMi(kullanici) || kullanici.rol === 'duzenleyici')) return;
    const eskiDeger = oku(anahtar, []);
    if (!Array.isArray(eskiDeger) || yeniDeger.length <= eskiDeger.length) return;
    const eskiIdler = new Set(eskiDeger.map(k => k && k.id));
    const yeniKayitlar = yeniDeger.filter(k => k && k.id && !eskiIdler.has(k.id));
    const kayitEtiketleri = yeniKayitlar.map(_bildirimIcinKayitEtiketi).filter(Boolean);
    const bildirimler = oku('isg_bildirimler', []);
    bildirimler.push({
      id: rastgeleId(),
      kullaniciAdi: kullanici.kullaniciAdi,
      adSoyad: kullanici.adSoyad,
      anahtar,
      kayitEtiketleri,
      tarih: new Date().toISOString(),
      // Kişi bazlı okundu takibi (bkz. dashboard.html _bildirimZiliniKur):
      // tek bir paylaşılan "okunduMu" bayrağı yerine, hangi kullanıcı(lar)ın
      // bu bildirimi gördüğü tutulur — aksi halde hedefli bildirimlerde
      // (bkz. modules/bakim-talep) bir kullanıcının "tümünü okundu işaretle"
      // demesi BAŞKA bir kullanıcının hedefli bildirimini de "okunmuş"
      // gösterirdi.
      okuyanKullaniciIdleri: []
    });
    yaz('isg_bildirimler', bildirimler.slice(-300));
  } catch (e) {
    console.warn('Ekleme bildirimi oluşturulamadı:', e);
  }
}

// tenantAnahtar()'ın ürettiği depolama anahtarı SONEKİ (ör. 'egitim_kayitlari',
// 'is_izinleri', 'bakim_talepleri'), dashboard.html'deki MODULLER dizisinin
// 'anahtar' alanıyla (ör. 'egitim', 'is-izni', 'bakim-talep') HEMEN HEMEN HİÇ
// birebir eşleşmez — her modül repository.js'inde kendi anahtarını seçer.
// Rol bazlı yazma izni SADECE dashboard'daki modül anahtarına göre tanımlı
// olduğundan (bkz. core/auth.js IK_IZINLI_MODULLER, BAKIM_TALEP_YAZILABILEN_ROLLER),
// izne tabi HER modül için soneki buradan açıkça eşlemek gerekir — aksi
// halde (ör. yalnızca ham soneki karşılaştırmak) İK'nın Eğitim'e bile
// yazması yanlışlıkla engellenir (bir kez gerçekten yaşandı, testle
// yakalandı). Henüz izne tabi olmayan modüller bu tabloya eklenmez; ham
// sonek hiçbir izinli modül adıyla çakışmadığı sürece güvenle geri döner.
const _MODUL_ANAHTARI_DEPOLAMA_SONEKLERI = {
  personel: ['personel'],
  egitim: ['egitim_kayitlari'],
  'bakim-talep': ['bakim_talepleri'],
  // Ekipman envanteri kasıtlı olarak 'bakim-talep'ten AYRI bir modül
  // anahtarı — kullanıcı isteği: "ekipman envanterine giriş yapabilecekler
  // sınırlı olsun, bakımdan ayrı bir kullanıcı ve admin sadece girebilsin"
  // (bkz. core/auth.js kullaniciEklemeYapabilirMi 'envanter' rolü).
  'bakim-ekipman': ['bakim_ekipman_envanteri'],
  'is-izni': ['is_izinleri']
};

function _depolamaSonekindenModulAdiCikar(sonek) {
  for (const modulAdi in _MODUL_ANAHTARI_DEPOLAMA_SONEKLERI) {
    if (_MODUL_ANAHTARI_DEPOLAMA_SONEKLERI[modulAdi].includes(sonek)) return modulAdi;
  }
  return sonek;
}

// 'isg_<slug>_<modulAdi>' biçimindeki bir anahtardan modül adını çıkarır
// (bkz. core/tenant.js tenantAnahtarFirma). Hiçbir firma slug'ı eşleşmezse
// (ör. isg_kullanicilar, isg_firmalar, isg_bildirimler, isg_oturum_gecmisi
// gibi FİRMA-BAĞIMSIZ genel anahtarlar) null döner — bunlar bir "modül"
// değildir, kendi ayrı erişim kontrolüne (girisGerekliAdmin, kendi
// yaz/oku akışları) sahiptir ve _yaziEklemeEngelleMi tarafından hiç
// engellenmemelidir (bkz. aşağıdaki kullanım — giriş geçmişi/kendi şifre
// değiştirme gibi işlemler kısıtlı roller için de HER ZAMAN çalışmalı).
function _anahtardanModulAdiCikar(anahtar) {
  const govde = String(anahtar || '').replace(/^isg_/, '');
  const firmalar = oku('isg_firmalar', []);
  for (const f of firmalar) {
    const onEk = f.slug + '_';
    if (govde === f.slug) return '';
    if (govde.startsWith(onEk)) return _depolamaSonekindenModulAdiCikar(govde.slice(onEk.length));
  }
  return null;
}

// Kısıtlı roller (İK, Bakım, Birim) SADECE kendilerine izinli modülde
// yazabilir (ekleme/düzenleme) — diğer modüllerde TAMAMEN salt-okunurdur
// (bkz. core/auth.js kullaniciEklemeYapabilirMi, tek bir doğruluk kaynağı).
// Bu, tek bir yerden (yaz()) TÜM modülleri kapsayacak şekilde uygulanır.
// Kullanıcı isteği: "diğer modülleri sadece görsün ekleme yapamasın" —
// ayrıca Yıllık Plan/Değerlendirme gibi modüllerdeki "işaretleme" (checkbox)
// alanları YENİ kayıt eklemez, MEVCUT bir kaydı günceller (dizi boyu
// değişmez); sadece uzayan diziyi engellemek bunu yakalayamıyordu — bu
// yüzden dizi boyu fark etmeksizin İZİNSİZ modüle HER yazım engellenir
// (ekleme de, düzenleme de). Admin/düzenleyici kullaniciEklemeYapabilirMi
// içinde zaten hep true döndüğü için burada etkilenmezler.
function _yaziEklemeEngelleMi(anahtar, yeniDeger) {
  if (!Array.isArray(yeniDeger)) return false;
  const kullanici = oturumdakiKullanici();
  if (!kullanici) return false;
  const modulAdi = _anahtardanModulAdiCikar(anahtar);
  if (modulAdi === null) return false; // firma-bağımsız genel anahtar — engellenmez
  return !kullaniciEklemeYapabilirMi(kullanici, modulAdi);
}

// Aynı Firestore belgesine (anahtar) art arda birden çok yazım yapıldığında
// (ör. Excel toplu içe aktarma sırasında satır satır çağrılan xEkle(), veya
// kullanıcının art arda hızlıca birkaç kayıt eklemesi) her çağrı kendi
// .set() isteğini bir ÖNCEKİNİ HİÇ BEKLEMEDEN ağa gönderiyordu. Firestore,
// aynı belgeye yapılan çakışan .set() isteklerinin sunucuya HANGİ SIRAYLA
// ULAŞACAĞINI garanti etmez -- ağ gecikmesi isteklerin varış sırasını
// bozarsa, ÖNCEKİ (daha küçük/eski) bir yazım SONRAKİ (daha güncel) yazımın
// üzerine yazıp kalıcı olarak "kazanabilir". Sonuç: ekranda her şey doğru
// görünür (yerel _bulutOnbellek zaten senkron güncellenmiş) ama sayfa
// yenilendiğinde (F5) Firestore'un gerçekte sakladığı eski/eksik veri geri
// yüklenir. Kullanıcı raporları: "242 amddelik ... F5 yaptığımda siliniyor",
// "teknik müteahitliktede eklediğim maddelerde azalma oluyor F5 yapınca".
// Çözüm: aynı anahtara yapılan tüm yazımlar (yaz/yazVeSonucuGetir/
// kucukVeriYazVeSonucuGetir/buyukVeriFirmayaYaz -- hepsi bu ortak kuyruğu
// kullanır) bir kuyrukta SIRAYLA gönderilir; bir öncekinin ağ isteği
// bitmeden bir sonraki başlamaz, böylece en son çağrılan yazım her zaman en
// son ağa gider ve sunucuda kazanır.
const _bulutYaziKuyruklari = {};
// Bir anahtar için kaç yazımın hâlâ ağda "beklemede" (sunucudan onay
// gelmemiş) olduğunu sayar. onSnapshot dinleyicileri (aşağıda) bir anahtar
// için BİZİM HÂLÂ BEKLEYEN bir yazımımız varken sunucudan gelen (henüz
// bizim yazımımızı yansıtmayan/eski) bir snapshot'ı _bulutOnbellek'e
// UYGULAMAMALI -- aksi halde kullanıcı bir kaydı sildiğinde/eklediğinde,
// F5 YAPMADAN, ekranda hâlâ o işlemin ağ isteği sürerken araya giren bir
// snapshot olayı sildiği/eklediği kaydı GERİ GETİREBİLİR (kullanıcı raporu:
// "silerkende şuan siliyorum ... F5 yapmadan da geliyor" -- tespit-öneri
// modülü). Yazım tamamlanınca (başarılı ya da başarısız) sayaç düşer; o
// andan sonra gelen snapshot'lar yine normal şekilde uygulanır.
const _bulutYaziBeklemedeSayaci = {};
function _anahtarIcinYaziBeklemedeMi(anahtar) {
  return !!_bulutYaziBeklemedeSayaci[anahtar];
}
function _bulutYaziSiraya(anahtar, yazFn) {
  _bulutYaziBeklemedeSayaci[anahtar] = (_bulutYaziBeklemedeSayaci[anahtar] || 0) + 1;
  const oncekiSira = (_bulutYaziKuyruklari[anahtar] || Promise.resolve()).catch(() => {});
  const buSira = oncekiSira.then(yazFn).finally(() => {
    _bulutYaziBeklemedeSayaci[anahtar]--;
    if (_bulutYaziBeklemedeSayaci[anahtar] <= 0) delete _bulutYaziBeklemedeSayaci[anahtar];
  });
  _bulutYaziKuyruklari[anahtar] = buSira;
  return buSira;
}

function yaz(anahtar, deger) {
  if (_yaziEklemeEngelleMi(anahtar, deger)) {
    alert('Bu modülde yeni kayıt ekleme yetkiniz yok. Sadece Personel ve Eğitim modüllerine kayıt ekleyebilirsiniz.');
    return;
  }
  _yaziEkBildirimKontrolEt(anahtar, deger);
  if (_bulutAktif && !_YEREL_SADECE_ANAHTARLAR.has(anahtar)) {
    if (_KUCUK_SENKRON_ANAHTARLAR.has(anahtar)) {
      _yerelYazDene(anahtar, JSON.stringify(deger));
      _bulutYaziSiraya(anahtar, () => _bulutDb.collection('kucuk_veri').doc(anahtar).set({ deger }))
        .catch(e => console.error('Firestore yazma hatasi:', e));
      return;
    }
    _bulutOnbellek[anahtar] = deger;
    _bulutYaziSiraya(anahtar, () => _bulutDb.collection('buyuk_veri').doc(anahtar).set({ deger, firma: _bulutFirmaSlugu || '' }))
      .catch(e => console.error('Firestore yazma hatasi:', e));
    return;
  }
  _yerelYazDene(anahtar, JSON.stringify(deger));
}

// yaz()'ın "bulutta gerçekten yazıldı mı" sonucunu bekleyen hâli. Normal yaz()
// bulut yazımını "fire-and-forget" yapar (sadece console.error) — büyük toplu
// içe aktarımlarda (ör. fotoğraflı Uygunsuzluk JSON içe aktarımı) Firestore'un
// belge başına ~1MB sınırını aşan bir yazım sessizce başarısız olabiliyor ve
// kullanıcı sayfayı yenileyene kadar bunu fark etmiyor. Bunu kullanan çağıran
// taraf gerçek sonucu görüp kullanıcıyı uyarabilir.
function yazVeSonucuGetir(anahtar, deger) {
  if (_bulutAktif && !_YEREL_SADECE_ANAHTARLAR.has(anahtar) && !_KUCUK_SENKRON_ANAHTARLAR.has(anahtar)) {
    _bulutOnbellek[anahtar] = deger;
    return _bulutYaziSiraya(anahtar, () => _bulutDb.collection('buyuk_veri').doc(anahtar).set({ deger, firma: _bulutFirmaSlugu || '' }))
      .then(() => ({ basarili: true }))
      .catch(e => { console.error('Firestore yazma hatasi:', e); return { basarili: false, hata: e }; });
  }
  yaz(anahtar, deger);
  return Promise.resolve({ basarili: true });
}

// Barkod ile giriş yapılmadan gönderilen formlarda (ör. ramak-kala-bildir.html,
// is-izni-bildir.html) kullanıcı isteği: "yapılan cihazın IP'si ve benzersiz
// tanımı mutlaka yazılsın forma" — hesap/isim olmadığından bu, gönderimi
// hangi CİHAZDAN yapıldığını sonradan ayırt edebilmenin tek yolu.
// cihazBenzersizIdGetir(): bu tarayıcıya özel, localStorage'da kalıcı rastgele
// bir kimlik (gerçek bir donanım/işletim sistemi kimliği DEĞİLDİR — tarayıcı
// verisi temizlenirse veya başka bir tarayıcı/cihaz kullanılırsa değişir).
function cihazBenzersizIdGetir() {
  const anahtar = 'isg_cihaz_id';
  let id = localStorage.getItem(anahtar);
  if (!id) {
    id = rastgeleId() + '-' + rastgeleId();
    try { localStorage.setItem(anahtar, id); } catch (e) { /* kota dolu olsa bile tek seferlik id döner */ }
  }
  return id;
}

// Genel (public) IP adresini üçüncü taraf bir servisten (api.ipify.org)
// tek seferlik çeker — sunucu tarafı olmayan bu mimaride istemcinin kendi
// IP'sini başka türlü öğrenmesinin yolu yoktur. Ağ hatasında/başarısızlıkta
// boş döner (form gönderimini ASLA engellemez).
async function genelIpAdresiGetir() {
  try {
    const yanit = await fetch('https://api.ipify.org?format=json');
    const veri = await yanit.json();
    return veri.ip || '';
  } catch (e) {
    return '';
  }
}

// yazVeSonucuGetir()'in "küçük senkron" anahtarlar (ör. isg_bildirimler)
// için eşleniği — yazVeSonucuGetir bu tür anahtarlarda normal fire-and-forget
// yaz()'a düşüp anında "başarılı" döner, gerçekten Firestore'a ulaşıp
// ulaşmadığını BEKLEMEZ. Anonim/giriş yapılmamış sayfalarda (ör.
// ramak-kala-bildir.html) kullanıcı "gönderildi" ekranını görür görmez
// sekmeyi kapatabileceğinden, bu ikinci (bildirim) yazımının sayfa
// kapanmadan GERÇEKTEN tamamlandığından emin olunması gerekir.
function kucukVeriYazVeSonucuGetir(anahtar, deger) {
  if (_bulutAktif && _KUCUK_SENKRON_ANAHTARLAR.has(anahtar)) {
    _yerelYazDene(anahtar, JSON.stringify(deger));
    return _bulutYaziSiraya(anahtar, () => _bulutDb.collection('kucuk_veri').doc(anahtar).set({ deger }))
      .then(() => ({ basarili: true }))
      .catch(e => { console.error('Firestore yazma hatasi:', e); return { basarili: false, hata: e }; });
  }
  yaz(anahtar, deger);
  return Promise.resolve({ basarili: true });
}

// yaz()'ın "büyük veri" yolunun, o an aktif olan firma bağlamından (ambient
// _bulutFirmaSlugu) BAĞIMSIZ hâli: birden çok firmayı aynı anda yönetip
// hiçbirinin "aktif" olmadığı sayfalarda (ör. firma-yonetim.html) kullanılır,
// firma etiketi çağıran tarafından açıkça verilir. localStorage'a hiç yazmaz.
function buyukVeriFirmayaYaz(anahtar, deger, firmaSlug) {
  if (_bulutAktif) {
    _bulutOnbellek[anahtar] = deger;
    _bulutYaziSiraya(anahtar, () => _bulutDb.collection('buyuk_veri').doc(anahtar).set({ deger, firma: firmaSlug || '' }))
      .catch(e => console.error('Firestore yazma hatasi:', e));
    return;
  }
  _yerelYazDene(anahtar, JSON.stringify(deger));
}

// buyukVeriFirmayaYaz'ın okuma karşılığı: o an AKTİF olmayan (dolayısıyla
// bulutFirmaHazirOlduğunda() tarafından hiç dinlenmeyen) bir firmaya ait
// büyük veri anahtarını TEK SEFERLİK Firestore'dan çeker. _bulutOnbellek
// SADECE aktif firmanın belgelerini dinleyen canlı sorgu ile dolar (bkz.
// core/data.js -> bulutFirmaHazirOlduğunda); başka bir firmanın anahtarını
// oku() ile okumaya çalışmak bulut aktifken SESSİZCE varsayılanı (ör. boş
// dizi) döndürür — o firmanın verisi hiç çekilmediği için, ONA AİT VERİ VARMIŞ
// GİBİ GÖRÜNMEZ. Bu ayrım kritik: çağıran taraf bu "boş" sonucu gerçek zannedip
// üzerine yazarsa (ör. bir kaydı başka firmaya da işlerken) o firmanın TÜM
// mevcut verisini silmiş olur. Bu yüzden başka bir firmanın büyük verisini
// okumadan/üzerine yazmadan önce HER ZAMAN bu fonksiyon kullanılmalı, oku()
// değil (bkz. modules/olay-kaza/service.js -> olayKaydiEkle).
// Hata durumunda BİLEREK yutmaz/varsayılana düşmez (throw eder) — çağıran
// taraf "okuma başarısız" ile "belge gerçekten yok/boş" durumlarını
// ayırt edebilsin diye. Salt-okunur (ör. seçim listesi doldurma) kullanım
// başarısızlıkta o firmayı sessizce atlayabilir; ÜZERİNE YAZMA öncesi
// kullanımlarda ise (ör. olayKaydiEkle'deki ayna kopyalama) başarısızlık
// mirror işlemini tamamen ATLAMALI, asla [] varsayımıyla devam etmemelidir.
async function buyukVeriFirmadanOku(anahtar, varsayilan) {
  if (!anahtar) return varsayilan;
  if (!_bulutAktif) return oku(anahtar, varsayilan);
  if (Object.prototype.hasOwnProperty.call(_bulutOnbellek, anahtar)) return _bulutOnbellek[anahtar];
  const belge = await _bulutDb.collection('buyuk_veri').doc(anahtar).get();
  return belge.exists ? belge.data().deger : varsayilan;
}

function rastgeleId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

function slugOlustur(metin) {
  const harfEslesme = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', İ: 'i' };
  return metin
    .toLowerCase()
    .split('')
    .map(k => harfEslesme[k] || k)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '');
}

// "YYYY-MM-DD" (input[type=date] / ISO) tarihini uygulamanın standart ekran/
// rapor biçimi olan "GG.AA.YYYY"e çevirir. Uyumsuz veya boş girdide olduğu
// gibi geri döner (serbest metin alanları bozulmasın diye).
function gunAyYil(isoTarih) {
  const eslesme = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(isoTarih || ''));
  if (!eslesme) return isoTarih || '';
  return `${eslesme[3]}.${eslesme[2]}.${eslesme[1]}`;
}

const FIRMA_ROZET_RENKLERI = ['#1d4ed8', '#0891b2', '#7c3aed', '#c2410c', '#059669', '#be185d', '#4338ca'];

// Firma bazlı tehlike sınıfı: İSG mevzuatına göre her firma tek bir sınıfa
// girer (personel bazında değil, firma bazında). Risk Değerlendirmesi gibi
// ileriki modüller de bu listeyi kullanacak.
const TEHLIKE_SINIFLARI = ['Az Tehlikeli', 'Tehlikeli', 'Çok Tehlikeli'];

// Firma bazlı sektör: Risk Değerlendirmesi ve ileride eklenecek sektöre özgü
// şablon/öneri mantığı için kullanılır. Firma seviyesinde tek bir sektör seçilir.
const SEKTORLER = ['İnşaat', 'Kimya', 'Tekstil', 'Metal / Makine', 'Gıda', 'Enerji', 'Lojistik / Nakliye', 'Sağlık', 'Eğitim', 'Bilişim', 'Perakende / Ticaret', 'Tarım', 'Gübre', 'Madencilik', 'Diğer'];

function ilkYuklemeyiHazirla() {
  if (!localStorage.getItem('isg_kullanicilar')) {
    localStorage.setItem('isg_kullanicilar', JSON.stringify([
      // sifre SHA-256 özeti olarak saklanır (bkz. core/auth.js) — düz metin
      // "Ya105017" değil, onun özeti.
      { id: 'u-admin', kullaniciAdi: 'yasongun', sifre: '26745bd3ca43f69fc7a7da631158f09058e567925b88cb9286205e2cf6a07b3a', adSoyad: 'Admin' }
    ]));
  }
  if (!localStorage.getItem('isg_firmalar')) {
    localStorage.setItem('isg_firmalar', JSON.stringify([]));
  }
  if (!localStorage.getItem('isg_risk_sablonlari')) {
    localStorage.setItem('isg_risk_sablonlari', JSON.stringify([]));
  }
}

ilkYuklemeyiHazirla();

// ---- Firebase / Firestore bağlantısı ----

function firebaseConfigGetir() {
  const ham = localStorage.getItem(FIREBASE_CONFIG_ANAHTARI);
  if (!ham) return VARSAYILAN_FIREBASE_CONFIG;
  try {
    const kayitli = JSON.parse(ham);
    return kayitli && kayitli.apiKey ? kayitli : VARSAYILAN_FIREBASE_CONFIG;
  } catch (e) {
    return VARSAYILAN_FIREBASE_CONFIG;
  }
}

function firebaseConfigOzelMi() {
  return localStorage.getItem(FIREBASE_CONFIG_ANAHTARI) !== null;
}

// Kaydeder ve sifirlar; degisikligin etkili olmasi icin sayfa yenilenmelidir
// (Firebase SDK calisan bir baglantiyi guvenli sekilde "canli" degistirmeyi
// desteklemez -- cagiran taraf kaydettikten sonra location.reload() yapmali).
function firebaseConfigKaydet(config) {
  localStorage.setItem(FIREBASE_CONFIG_ANAHTARI, JSON.stringify(config));
}

function firebaseConfigSifirla() {
  localStorage.removeItem(FIREBASE_CONFIG_ANAHTARI);
}

function bulutDurumu() {
  return {
    aktif: _bulutAktif,
    projeId: firebaseConfigGetir().projectId || '',
    ozelYapilandirma: firebaseConfigOzelMi()
  };
}

function _bulutBaslat() {
  if (typeof firebase === 'undefined') return; // SDK script'leri eklenmemis
  const config = firebaseConfigGetir();
  if (!config || !config.apiKey || !config.projectId) return;

  let app;
  try {
    app = firebase.apps.length ? firebase.app() : firebase.initializeApp(config);
    _bulutDb = app.firestore();
    _bulutApp = app;
    _bulutAktif = true;
  } catch (e) {
    console.error('Firebase başlatılamadı:', e);
    return;
  }

  _bulutDb.collection('kucuk_veri').onSnapshot(snapshot => {
    const gelenAnahtarlar = new Set();
    snapshot.forEach(doc => gelenAnahtarlar.add(doc.id));

    snapshot.docChanges().forEach(change => {
      if (change.type === 'removed') return;
      // Bu anahtar için hâlâ beklemede bir yazımımız varsa, bu snapshot'ı
      // ATLA (bkz. _bulutYaziBeklemedeSayaci yorumu) -- aksi halde kendi
      // yazımımız sunucuya ulaşmadan araya giren bir snapshot eski veriyi
      // geri getirebilir.
      if (_anahtarIcinYaziBeklemedeMi(change.doc.id)) return;
      // _yerelYazDene KULLANILMALI (ham localStorage.setItem değil) — kota
      // dolduğunda (bkz. yukarıdaki yorum, satır ~62) uncaught hata fırlatıp bu
      // forEach'i ve dolayısıyla sonraki tüm docChanges güncellemelerini
      // durdurmasın. Firestore verisi zaten doğru; sadece bu cihazın yerel
      // aynası eskimiş kalabilir (kota boşalınca kendiliğinden düzelir).
      _yerelYazDene(change.doc.id, JSON.stringify(change.doc.data().deger));
    });

    // İlk senkronizasyonda buluttan hiç gelmeyen (yani bu cihazda ilk kurulumda
    // yerelde üretilen) küçük anahtarları buluta gönder ki diğer cihazlar da
    // aynı kullanıcı/firma listesini görebilsin.
    //
    // KRİTİK: onSnapshot, sunucuya hiç sorulmadan ÖNCE yerel/boş bir önbellek
    // durumuyla bir kez, sonra sunucudan doğrulanan gerçek veriyle bir kez
    // daha tetiklenebilir (snapshot.metadata.fromCache). Bunu görmezden gelip
    // "bulutta bu anahtar yok" sanıp yerel (o an boş olabilecek) veriyi
    // buluta YAZMAK, gerçek bulut verisinin üzerine yazıp KALICI VERİ KAYBINA
    // yol açar — gerçekten yaşandı (firma/kullanıcı listesi böyle silindi).
    // Bu yüzden "eksik anahtarı tamamla" adımı SADECE sunucudan doğrulanmış
    // (fromCache === false) bir snapshot'ta çalışır.
    if (!_bulutKucukHazir && !snapshot.metadata.fromCache) {
      _KUCUK_SENKRON_ANAHTARLAR.forEach(anahtar => {
        if (!gelenAnahtarlar.has(anahtar)) {
          const yerelDeger = oku(anahtar, null);
          if (yerelDeger !== null) {
            _bulutDb.collection('kucuk_veri').doc(anahtar).set({ deger: yerelDeger })
              .catch(e => console.error('Firestore ilk senkron hatası:', e));
          }
        }
      });
      _bulutKucukHazir = true;
      _bulutKucukCallbackleri.splice(0).forEach(fn => fn());
    }
  }, err => console.error('Firestore dinleme hatası (kucuk_veri):', err));
}

// Küçük/senkron veriler (kullanıcılar, firmalar) hazır olunca çalışır.
// Bulut aktif değilse hemen çalışır (localStorage zaten senkron).
function bulutHazirOlduğunda(callback) {
  if (!_bulutAktif) { callback(); return; }
  if (_bulutKucukHazir) { callback(); return; }
  _bulutKucukCallbackleri.push(callback);
}

// Belirli bir firmanın tüm modül verisini (buyuk_veri) dinlemeye başlar;
// ilk veri gelince (veya bulut kapalıysa hemen) callback'i çalıştırır.
// Modül sayfaları, veri okuyup yazmaya başlamadan önce bunu kullanmalı.
function bulutFirmaHazirOlduğunda(firmaSlug, callback) {
  if (!_bulutAktif) { callback(); return; }

  if (_bulutFirmaSlugu === firmaSlug) {
    if (_bulutFirmaHazir) callback(); else _bulutFirmaCallbackleri.push(callback);
    return;
  }

  if (_bulutFirmaDinleyiciDurdur) _bulutFirmaDinleyiciDurdur();
  _bulutFirmaSlugu = firmaSlug;
  _bulutFirmaHazir = false;
  _bulutFirmaCallbackleri.length = 0;
  _bulutFirmaCallbackleri.push(callback);
  Object.keys(_bulutOnbellek).forEach(k => delete _bulutOnbellek[k]);

  _bulutFirmaDinleyiciDurdur = _bulutDb.collection('buyuk_veri')
    .where('firma', '==', firmaSlug)
    .onSnapshot(snapshot => {
      snapshot.docChanges().forEach(change => {
        // Bu anahtar için hâlâ beklemede bir yazımımız varsa, bu snapshot'ı
        // ATLA -- kendi yazımımız (ör. bir kaydı silme) sunucuya ulaşmadan
        // araya giren bir snapshot, F5 YAPMADAN dahi sildiğimiz/eklediğimiz
        // kaydı ekranda geri getirebilir (bkz. _bulutYaziBeklemedeSayaci
        // yorumu, kullanıcı raporu: tespit-öneri modülünde silme).
        if (_anahtarIcinYaziBeklemedeMi(change.doc.id)) return;
        if (change.type === 'removed') {
          delete _bulutOnbellek[change.doc.id];
        } else {
          _bulutOnbellek[change.doc.id] = change.doc.data().deger;
        }
      });
      if (!_bulutFirmaHazir) {
        _bulutFirmaHazir = true;
        _bulutFirmaCallbackleri.splice(0).forEach(fn => fn());
      }
    }, err => console.error('Firestore dinleme hatası (buyuk_veri):', err));
}

_bulutBaslat();

// ---- Fotoğraf yükleme (Kurul kararları, Uygunsuzluk öncesi/sonrası vb.) ----
//
// Storage yapılandırılmışsa (firebase-storage-compat.js eklenmiş ve projede
// storageBucket varsa) fotoğraf oraya yüklenir ve sadece küçük bir indirme
// URL'si kayda yazılır. Storage yoksa/başarısızsa sıkıştırılmış base64'e
// düşülür -- ama bu modda fotoğraf, kaydın ait olduğu "buyuk_veri" Firestore
// dokümanının (tüm modül kayıtları TEK dokümanda tutulur, bkz. dosya başı)
// içine gömülür, bu yüzden çözünürlük/kalite kasıtlı düşük tutulur.

function bulutStorageAl() {
  if (!_bulutApp || typeof firebase === 'undefined' || !firebase.storage) return null;
  try { return firebase.storage(_bulutApp); } catch (e) { return null; }
}

function fotoSikistir(dosya, maxKenar, kalite) {
  return new Promise((resolve, reject) => {
    const okuyucu = new FileReader();
    okuyucu.onerror = () => reject(new Error('Dosya okunamadı.'));
    okuyucu.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Görsel yüklenemedi.'));
      img.onload = () => {
        const olcek = Math.min(1, (maxKenar || 900) / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * olcek);
        canvas.height = Math.round(img.height * olcek);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', kalite || 0.55));
      };
      img.src = okuyucu.result;
    };
    okuyucu.readAsDataURL(dosya);
  });
}

// ---- Fotoğraf referans belgeleri ----
//
// file:// altında Storage hiç denenmediği için (CORS) fotoğraflar normalde
// sıkıştırılmış base64 olarak doğrudan kaydın içine gömülüyordu. Sorun: bir
// modülün TÜM kayıtları tek bir Firestore belgesinde tutuluyor (bkz. dosya
// başı "büyük-senkron" katmanı) ve Firestore'un belge başına ~1MB sert sınırı
// var -- çok sayıda fotoğraflı kayıt (özellikle toplu içe aktarımda) bu sınırı
// kolayca aşıp yazımın sessizce başarısız olmasına yol açıyordu. Çözüm: her
// fotoğraf kendi küçük Firestore belgesine yazılır, kayıt sadece "fotoref:<id>"
// biçiminde bir referans tutar -- böylece modül belgesinin boyutu kayıt
// sayısıyla değil fotoğraf sayısıyla değil, sadece metin veri boyutuyla artar.
const FOTO_REF_ONEKI = 'fotoref:';

async function fotoBuyukKaydet(dataUrl, firmaSlug) {
  if (!dataUrl) return '';
  const id = rastgeleId();
  if (_bulutAktif) {
    await _bulutDb.collection('fotograflar').doc(id).set({ deger: dataUrl, firma: firmaSlug || _bulutFirmaSlugu || '' });
  } else {
    _yerelYazDene('isg_foto_' + id, dataUrl);
  }
  return FOTO_REF_ONEKI + id;
}

// referans "fotoref:" ile başlamıyorsa zaten doğrudan kullanılabilir bir
// değerdir (eski kayıtlardan gelen ham base64/Storage URL'i) -- olduğu gibi
// döner, böylece geriye dönük uyumluluk bozulmaz.
async function fotoBuyukCoz(referans) {
  if (!referans || !referans.startsWith(FOTO_REF_ONEKI)) return referans || '';
  const id = referans.slice(FOTO_REF_ONEKI.length);
  if (_bulutAktif) {
    try {
      const belge = await _bulutDb.collection('fotograflar').doc(id).get();
      return belge.exists ? (belge.data().deger || '') : '';
    } catch (e) {
      console.error('Fotoğraf okunamadı:', e);
      return '';
    }
  }
  return localStorage.getItem('isg_foto_' + id) || '';
}

// Bir kök eleman içindeki tüm data-foto-ref işaretli <img>'lerin src'sini ve
// data-foto-ref-href işaretli <a>'ların href'ini çözüp doldurur. Modüller,
// tabloyu/formu DOM'a ekledikten SONRA bunu çağırmalı (örn.
// `<img data-foto-ref="${deger}">` yazıp ardından `fotoReferanslariCoz(govde)`).
async function fotoReferanslariCoz(kokEleman) {
  const kok = kokEleman || document;
  const imgler = Array.from(kok.querySelectorAll('img[data-foto-ref]')).map(async img => {
    const referans = img.getAttribute('data-foto-ref');
    img.removeAttribute('data-foto-ref');
    const url = await fotoBuyukCoz(referans);
    if (url) img.src = url;
  });
  const linkler = Array.from(kok.querySelectorAll('a[data-foto-ref-href]')).map(async a => {
    const referans = a.getAttribute('data-foto-ref-href');
    a.removeAttribute('data-foto-ref-href');
    const url = await fotoBuyukCoz(referans);
    if (url) a.href = url;
  });
  await Promise.all(imgler.concat(linkler));
}

// dosya: <input type="file"> ile seçilen dosya. yol: Storage içindeki klasör
// (örn. 'uygunsuzluk/AKS0001'). maxKenar/kalite: inline base64 yedeğinde
// kullanılacak sıkıştırma ayarları (ör. logo gibi küçük görünecek görseller
// için varsayılan 900px/0.55 yerine daha küçük bir değer verilebilir).
// Dönüş: { url, onizlemeUrl, mod: 'storage'|'foto-belgesi'|'gomulu' } -- url
// kayda yazılacak değerdir (Storage URL'i, "fotoref:<id>" ya da gömülü
// modda doğrudan base64), onizlemeUrl ise yükleme anında ekranda ANINDA
// göstermek için kullanılan gerçek görsel verisidir (fotoref'i hemen tekrar
// Firestore'dan okumaya gerek kalmasın diye).
// referansKullan=false: görsel kendi tek başına küçük bir belgede saklanacaksa
// (ör. firma logosu -- paylaşılan büyük dizi belgesinin parçası değil, boyut
// sınırı riski yok) fotoref dolaylamasını atlayıp base64'ü doğrudan döner.
async function fotoYukle(dosya, yol, maxKenar, kalite, referansKullan) {
  if (!dosya) return null;
  if (!/^image\/(jpeg|jpg|png|webp)$/i.test(dosya.type || '')) {
    throw new Error('Sadece JPEG, PNG veya WEBP görsel yüklenebilir.');
  }

  // file:// altında açılan sayfalarda tarayıcı "Origin: null" gönderir ve
  // Firebase Storage'ın CORS ayarı bunu her zaman reddeder -- denemek sadece
  // 8 saniyelik zaman aşımını beklemek ve konsolu hatalarla doldurmak anlamına
  // gelir. Bu durumda Storage'ı hiç denemeden doğrudan sıkıştırılmış base64'e düş.
  const IS_FILE_PROTOCOL = location.protocol === 'file:' || location.origin === 'null';
  const storage = IS_FILE_PROTOCOL ? null : bulutStorageAl();
  if (storage) {
    try {
      const temizAd = String(dosya.name || 'fotograf').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-80);
      const tamYol = (yol || 'fotograflar') + '/' + Date.now() + '_' + temizAd;
      // Storage isteği ağ/izin sorunuyla asılı kalabilir; belirli bir sürede
      // sonuçlanmazsa base64 yedeğine düşmek için zaman aşımıyla yarıştırılır.
      const zamanAsimi = new Promise((_, reddet) => setTimeout(() => reddet(new Error('Storage zaman aşımı')), 8000));
      const yukleme = (async () => {
        const anlik = await storage.ref().child(tamYol).put(dosya, { contentType: dosya.type || 'image/jpeg' });
        return anlik.ref.getDownloadURL();
      })();
      const url = await Promise.race([yukleme, zamanAsimi]);
      return { url, onizlemeUrl: url, yol: tamYol, mod: 'storage' };
    } catch (hata) {
      console.warn('Firebase Storage yüklenemedi, sıkıştırılmış görsele düşülüyor:', hata);
    }
  }

  const dataUrl = await fotoSikistir(dosya, maxKenar || 900, kalite || 0.55);
  if (referansKullan === false) {
    return { url: dataUrl, onizlemeUrl: dataUrl, yol: '', mod: 'gomulu' };
  }
  const referans = await fotoBuyukKaydet(dataUrl, _bulutFirmaSlugu);
  return { url: referans || dataUrl, onizlemeUrl: dataUrl, yol: '', mod: 'foto-belgesi' };
}
