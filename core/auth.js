// Kimlik doğrulama ve oturum yönetimi (mock). data.js'ten sonra yüklenmelidir.
//
// GÜVENLİK NOTU: isg_kullanicilar "küçük senkron" anahtarlardandır ve
// Firestore'a senkronize edilir (bkz. core/data.js) — bu yüzden şifreler
// artık düz metin DEĞİL, SHA-256 özeti olarak saklanır/karşılaştırılır.
// Bu yine de tuzsuz (salt'sız) bir özet olduğundan tam bir çözüm değildir;
// gerçek çözüm gerçek bir sunucu tarafı kimlik doğrulamasına (ör. Firebase
// Authentication + tuzlu/bcrypt özet) geçmektir — bu, client-only bu
// mimaride tek başına yapılamaz.
async function _sifreOzetiCikar(sifre) {
  const veri = new TextEncoder().encode(sifre);
  const ozetBuffer = await crypto.subtle.digest('SHA-256', veri);
  return Array.from(new Uint8Array(ozetBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function _sifreOzetiGibiMi(deger) {
  return typeof deger === 'string' && /^[0-9a-f]{64}$/.test(deger);
}

async function girisYap(kullaniciAdi, sifre) {
  const kullanicilar = oku('isg_kullanicilar', []);
  const bulunan = kullanicilar.find(
    k => k.kullaniciAdi.toLowerCase() === (kullaniciAdi || '').trim().toLowerCase()
  );
  if (!bulunan) return { basarili: false, hata: 'Kullanıcı adı veya şifre hatalı.' };

  const girilenOzet = await _sifreOzetiCikar(sifre);
  let dogru;
  if (_sifreOzetiGibiMi(bulunan.sifre)) {
    dogru = bulunan.sifre === girilenOzet;
  } else {
    // Eski/seed kayıt henüz düz metin: doğruysa bu girişte SHA-256 özetine
    // göçürülür, böylece bundan sonra bir daha düz metin saklanmaz.
    dogru = bulunan.sifre === sifre;
    if (dogru) {
      const tumKullanicilar = oku('isg_kullanicilar', []);
      const kayit = tumKullanicilar.find(k => k.id === bulunan.id);
      if (kayit) {
        kayit.sifre = girilenOzet;
        yaz('isg_kullanicilar', tumKullanicilar);
      }
    }
  }

  if (!dogru) return { basarili: false, hata: 'Kullanıcı adı veya şifre hatalı.' };

  // Admin için giriş/çıkış geçmişi tutulur (bkz. giris-kayitlari.html,
  // kullanıcı isteği: "kimlerin kaç defa girip çıktığını, ne kadar süre açık
  // kaldığını görmek istiyorum"). Kayıt id'si isg_oturum'a da yazılır ki
  // cikisYap() hangi kaydı kapatacağını bilsin.
  const oturumKayitId = rastgeleId();
  const gecmis = oku('isg_oturum_gecmisi', []);
  gecmis.push({
    id: oturumKayitId,
    kullaniciId: bulunan.id,
    kullaniciAdi: bulunan.kullaniciAdi,
    adSoyad: bulunan.adSoyad,
    girisZamani: new Date().toISOString(),
    cikisZamani: null
  });
  yaz('isg_oturum_gecmisi', gecmis.slice(-1000));

  yaz('isg_oturum', { kullaniciId: bulunan.id, oturumKayitId });
  return { basarili: true, kullanici: bulunan };
}

// Oturumdaki kullanıcının KENDİ şifresini değiştirmesi (mevcut şifreyi bilmesi
// şart) — admin'in başka bir kullanıcının şifresini SIFIRLAMASINDAN
// (ikKullaniciSifreDegistir, eski şifreyi bilmeye gerek yok) farklıdır.
// Kullanıcı isteği: "isterse kullanıcılar kendi şifre değişikliğini
// yapabilsin". Şifreler tek yönlü özet olarak saklandığından (bkz. yukarıdaki
// güvenlik notu) admin bile mevcut şifreyi GÖREMEZ, sadece sıfırlayabilir.
async function kendiSifresiniDegistir(mevcutSifre, yeniSifre) {
  const kullanici = oturumdakiKullanici();
  if (!kullanici) return { basarili: false, hata: 'Oturum bulunamadı.' };
  if (!yeniSifre || yeniSifre.length < 4) return { basarili: false, hata: 'Yeni şifre en az 4 karakter olmalı.' };

  const girilenOzet = await _sifreOzetiCikar(mevcutSifre || '');
  const dogru = _sifreOzetiGibiMi(kullanici.sifre) ? kullanici.sifre === girilenOzet : kullanici.sifre === mevcutSifre;
  if (!dogru) return { basarili: false, hata: 'Mevcut şifre hatalı.' };

  const kullanicilar = oku('isg_kullanicilar', []);
  const kayit = kullanicilar.find(k => k.id === kullanici.id);
  if (!kayit) return { basarili: false, hata: 'Kullanıcı bulunamadı.' };

  kayit.sifre = await _sifreOzetiCikar(yeniSifre);
  yaz('isg_kullanicilar', kullanicilar);
  return { basarili: true };
}

function oturumdakiKullanici() {
  const oturum = oku('isg_oturum', null);
  if (!oturum) return null;
  const kullanicilar = oku('isg_kullanicilar', []);
  return kullanicilar.find(k => k.id === oturum.kullaniciId) || null;
}

// auth.js'in <script src="..."> yolundan, sayfanın kök dizine göre kaç
// seviye derinlikte olduğunu tespit eder (ör. "../../core/auth.js" -> "../../").
// Böylece girisGerekli() kaç seviye içiçe bir sayfadan çağrılırsa çağrılsın
// her zaman gerçek kök index.html'e yönlendirir.
const _authKokYolu = (function () {
  const etiket = document.currentScript || document.querySelector('script[src$="core/auth.js"]');
  const src = etiket ? etiket.getAttribute('src') : 'core/auth.js';
  return src.replace(/core\/auth\.js(?:\?.*)?$/, '');
})();

function girisGerekli() {
  const kullanici = oturumdakiKullanici();
  if (!kullanici) {
    window.location.href = _authKokYolu + 'index.html';
    return null;
  }
  return kullanici;
}

// ---- Roller ----
//
// rol alanı olmayan (ör. seed 'admin' kaydı) ya da rol==='admin' olan
// kullanıcılar TAM yetkilidir: kendi sahipId'siyle eşleşen tüm firmaları
// yönetir, firma ekleyip/silebilir, İK kullanıcısı oluşturabilir.
// rol==='ik' olanlar KISITLI kullanıcılardır: firma sahibi değildir, sadece
// kendilerine erisimFirmaIdleri ile açıkça atanmış firmaları görebilir ve
// sadece IK_IZINLI_MODULLER listesindeki modüllere girebilir (bkz.
// girisGerekliModul, core/tenant.js getFirmalar/getFirmaById).
// rol==='duzenleyici' olanlar İK ile AYNI erişim mekanizmasını (erisimFirmaIdleri)
// kullanır ama TÜM modüllere girebilir — sadece SİLME işlemleri engellenir
// (bkz. kullaniciSilebilirMi, her modülün service.js'indeki xSil fonksiyonları)
// ve her yeni kayıt eklemesinde admin'e bildirim düşer (bkz. core/data.js yaz()
// içindeki _yaziEkBildirimKontrolEt). Kullanıcı isteği: "yeni birşey
// eklediğinde admine bilgi gitsin", "veri silme kapalı olsun".
//
// İK rolü de ARTIK tüm modüllere girip verileri GÖREBİLİR, ama sadece
// IK_IZINLI_MODULLER'de (Personel/Eğitim) yeni kayıt EKLEYEBİLİR (diğer
// modüllerde ekleme core/data.js -> _yaziEklemeEngelle tarafından reddedilir)
// ve HİÇBİR modülde silemez (kullaniciSilebilirMi). Kullanıcı isteği: "ik
// kullanıcıları da sadece eğitim ve personel modüllerine giriş yapabilsin
// ekleme yapsın ama silemesin, diğer modülleri sadece görsün ekleme
// yapamasın".
//
// rol==='bakim' (Bakım Bölümü) ve rol==='birim' (Talep Eden Birim) — Bakım
// Talep ve Onay Modülü için: ikisi de SADECE bakim-talep modülüne
// yazabilir, diğerleri salt-okunur. 'birim' kullanıcıları ayrıca
// modules/bakim-talep/service.js içinde KENDİ birimAdi'lerine göre KAYIT
// bazında da filtrelenir (sadece kendi biriminin taleplerini görür/açar) —
// bu, modül seviyesinde değil kayıt seviyesinde bir kısıtlama olduğundan
// burada değil, bakim-talep modülünün kendi service.js'inde uygulanır.
const IK_IZINLI_MODULLER = ['personel', 'egitim'];
const BAKIM_TALEP_YAZILABILEN_ROLLER = ['bakim', 'birim'];

function kullaniciAdminMi(kullanici) {
  return !!kullanici && (!kullanici.rol || kullanici.rol === 'admin');
}

// Admin, düzenleyici VE İK artık TÜM modüllere girip görüntüleyebilir —
// modül bazlı gerçek kısıtlama artık "girebilir mi" değil, "ekleyebilir mi"
// (bkz. kullaniciEklemeYapabilirMi) ve "silebilir mi" (kullaniciSilebilirMi)
// sorularında uygulanıyor.
function kullaniciModuleErisebilirMi(kullanici) {
  return !!kullanici;
}

// Admin ve düzenleyici her modülde ekleyebilir; İK SADECE IK_IZINLI_MODULLER'de
// (Personel/Eğitim) ekleyebilir; bakim/birim rolleri SADECE bakim-talep
// modülünde ekleyebilir; diğer modüllerde sadece görüntülerler.
function kullaniciEklemeYapabilirMi(kullanici, modulAnahtari) {
  if (!kullanici) return false;
  if (kullaniciAdminMi(kullanici) || kullanici.rol === 'duzenleyici') return true;
  if (kullanici.rol === 'ik') return IK_IZINLI_MODULLER.includes(modulAnahtari);
  if (BAKIM_TALEP_YAZILABILEN_ROLLER.includes(kullanici.rol)) return modulAnahtari === 'bakim-talep';
  return false;
}

// Sadece tam yetkili admin silebilir; diğer tüm kısıtlı roller (düzenleyici,
// İK, bakım, birim) HİÇBİR kaydı silemez (kullanıcı isteği: mcakir/ksahbaz
// için "veri silme kapalı olsun", İK için "ekleme yapsın ama silemesin" —
// aynı prensip Bakım Talep modülündeki roller için de geçerli).
function kullaniciSilebilirMi(kullanici) {
  return kullaniciAdminMi(kullanici);
}

// Modüllerin xSil() fonksiyonlarının başında çağrılır: yetkisizse kullanıcıya
// net bir mesaj gösterir ve false döner (çağıran taraf işlemi iptal eder).
function _silmeYetkisiKontrolEt() {
  if (kullaniciSilebilirMi(oturumdakiKullanici())) return true;
  alert('Bu işlem için silme yetkiniz yok. Gerekiyorsa yöneticinize başvurun.');
  return false;
}

// Modül sayfalarının (modules/<ad>/index.html) girisGerekli() yerine
// çağırması gereken hâl. Artık TÜM roller tüm modüllere girip görüntüleyebilir
// (bkz. kullaniciModuleErisebilirMi) — asıl kısıtlama modül içindeki ekleme/
// silme işlemlerinde uygulanır (kullaniciEklemeYapabilirMi, kullaniciSilebilirMi).
function girisGerekliModul(modulAnahtari) {
  return girisGerekli();
}

// Sadece tam yetkili (admin) kullanıcıların girebileceği sayfalar için
// (firma-yonetim.html, ayarlar.html, kullanicilar.html).
function girisGerekliAdmin() {
  const kullanici = girisGerekli();
  if (!kullanici) return null;
  if (!kullaniciAdminMi(kullanici)) {
    alert('Bu sayfaya erişim yetkiniz yok.');
    window.location.href = _authKokYolu + 'dashboard.html';
    return null;
  }
  return kullanici;
}

// Mevcut bir admin, TAM yetkili (rol alanı olmayan) yeni bir admin hesabı
// oluşturabilir (kullanıcı isteği: "isterse admin başka admin ekleyebilsin
// tam yetkili"). Yeni admin'in kendi sahipId'siyle eşleşen bir firması
// olmayacağından, oluşturan admin'in O AN yönettiği tüm firmalara ortak
// yönetici olarak eklenir — aksi halde giriş yapar yapmaz "hiç firma yok"
// görürdü (bkz. core/tenant.js _firmaAdminErisimVarMi, ksahbaz için daha
// önce elle yapılan aynı işlemin kalıcı/tekrarlanabilir hâli).
async function adminEkle(kullaniciAdi, sifre, adSoyad) {
  const olusturanAdmin = oturumdakiKullanici();
  if (!olusturanAdmin || !kullaniciAdminMi(olusturanAdmin)) return { basarili: false, hata: 'Bu işlem için yetkiniz yok.' };

  const temizKullaniciAdi = (kullaniciAdi || '').trim();
  const temizAdSoyad = (adSoyad || '').trim();
  if (!temizKullaniciAdi) return { basarili: false, hata: 'Kullanıcı adı boş olamaz.' };
  if (!temizAdSoyad) return { basarili: false, hata: 'Ad soyad boş olamaz.' };
  if (!sifre || sifre.length < 4) return { basarili: false, hata: 'Şifre en az 4 karakter olmalı.' };
  if (!kullaniciAdiMusaitMi(temizKullaniciAdi)) return { basarili: false, hata: 'Bu kullanıcı adı zaten kullanılıyor.' };

  const yeniAdmin = {
    id: rastgeleId(),
    kullaniciAdi: temizKullaniciAdi,
    sifre: await _sifreOzetiCikar(sifre),
    adSoyad: temizAdSoyad
  };
  const kullanicilar = oku('isg_kullanicilar', []);
  kullanicilar.push(yeniAdmin);
  yaz('isg_kullanicilar', kullanicilar);

  const firmalar = oku('isg_firmalar', []);
  const yonetilenFirmaIdleri = new Set(getFirmalar().map(f => f.id));
  let firmaDegisti = false;
  firmalar.forEach(f => {
    if (!yonetilenFirmaIdleri.has(f.id)) return;
    const mevcut = Array.isArray(f.ortakAdminIdleri) ? f.ortakAdminIdleri : [];
    if (!mevcut.includes(yeniAdmin.id)) {
      f.ortakAdminIdleri = mevcut.concat([yeniAdmin.id]);
      firmaDegisti = true;
    }
  });
  if (firmaDegisti) yaz('isg_firmalar', firmalar);

  return { basarili: true, kullanici: yeniAdmin };
}

// ---- Kısıtlı kullanıcı yönetimi (admin tarafından) ----
//
// Her kısıtlı kullanıcı (İK, düzenleyici, bakım, birim) bir admin tarafından
// (olusturanId) oluşturulur ve SADECE o admin tarafından görülür/düzenlenir —
// firmaların sahipId'yle izole edilmesiyle aynı mantık. Hepsi aynı
// erisimFirmaIdleri mekanizmasını kullanır; farkları modül/silme yetkisidir
// (bkz. kullaniciEklemeYapabilirMi, kullaniciSilebilirMi). 'birim' rolü ayrıca
// bir birimAdi taşır (Bakım Talep modülünde SADECE o birimin taleplerini
// görür — bkz. modules/bakim-talep/service.js).
const KISITLI_ROLLER = ['ik', 'duzenleyici', 'bakim', 'birim'];

function kullaniciAdiMusaitMi(kullaniciAdi, haricId) {
  const temiz = (kullaniciAdi || '').trim().toLowerCase();
  if (!temiz) return false;
  const kullanicilar = oku('isg_kullanicilar', []);
  return !kullanicilar.some(k => k.kullaniciAdi.toLowerCase() === temiz && k.id !== haricId);
}

function ikKullanicilariGetir() {
  const admin = oturumdakiKullanici();
  if (!admin) return [];
  return oku('isg_kullanicilar', []).filter(k => KISITLI_ROLLER.includes(k.rol) && k.olusturanId === admin.id);
}

async function ikKullaniciEkle(kullaniciAdi, sifre, adSoyad, firmaIdleri, rol, birimAdi, isgOnayiVerebilir, bakimTuru) {
  const admin = oturumdakiKullanici();
  if (!admin) return { basarili: false, hata: 'Oturum bulunamadı.' };

  const temizKullaniciAdi = (kullaniciAdi || '').trim();
  const temizAdSoyad = (adSoyad || '').trim();
  const temizRol = KISITLI_ROLLER.includes(rol) ? rol : 'ik';
  if (!temizKullaniciAdi) return { basarili: false, hata: 'Kullanıcı adı boş olamaz.' };
  if (!temizAdSoyad) return { basarili: false, hata: 'Ad soyad boş olamaz.' };
  if (!sifre || sifre.length < 4) return { basarili: false, hata: 'Şifre en az 4 karakter olmalı.' };
  if (!kullaniciAdiMusaitMi(temizKullaniciAdi)) return { basarili: false, hata: 'Bu kullanıcı adı zaten kullanılıyor.' };
  if (temizRol === 'birim' && !(birimAdi || '').trim()) return { basarili: false, hata: 'Birim rolü için bir birim seçilmeli.' };

  // Sadece BU admin'in sahip olduğu firmalar atanabilir (kullaniciAdminMi(admin)
  // burada zaten kesin — girisGerekliAdmin bu sayfaya girişi zaten sınırlar).
  const sahipOlunanFirmalar = new Set(getFirmalar().map(f => f.id));
  const gecerliFirmaIdleri = (Array.isArray(firmaIdleri) ? firmaIdleri : []).filter(id => sahipOlunanFirmalar.has(id));

  const kullanicilar = oku('isg_kullanicilar', []);
  const yeniKullanici = {
    id: rastgeleId(),
    kullaniciAdi: temizKullaniciAdi,
    sifre: await _sifreOzetiCikar(sifre),
    adSoyad: temizAdSoyad,
    rol: temizRol,
    olusturanId: admin.id,
    erisimFirmaIdleri: gecerliFirmaIdleri
  };
  if (temizRol === 'birim') yeniKullanici.birimAdi = (birimAdi || '').trim();
  // Kullanıcı isteği: "İSG onayı verebilecekleri de admin belirleyebilsin" —
  // varsayılan olarak sadece admin İSG onaylayıcısıdır (bkz.
  // modules/bakim-talep/service.js _btIsgOnaylayiciMi); bu bayrak SADECE
  // Düzenleyici rolüne, Bakım Onarım modülüne özel olarak bu yetkiyi ekler.
  if (temizRol === 'duzenleyici') yeniKullanici.isgOnayiVerebilir = !!isgOnayiVerebilir;
  // Kullanıcı isteği: "elektrik ile mekanik ayrı olmalı" — 'bakim' rolü
  // isteğe bağlı olarak tek bir bakım türüne sınırlanabilir (boşsa hepsini
  // görür, geriye dönük uyumlu).
  if (temizRol === 'bakim') yeniKullanici.bakimTuru = (bakimTuru || '').trim();
  kullanicilar.push(yeniKullanici);
  yaz('isg_kullanicilar', kullanicilar);
  return { basarili: true, kullanici: yeniKullanici };
}

function ikKullaniciGuncelle(id, adSoyad, firmaIdleri, birimAdi, isgOnayiVerebilir, bakimTuru) {
  const admin = oturumdakiKullanici();
  if (!admin) return { basarili: false, hata: 'Oturum bulunamadı.' };

  const temizAdSoyad = (adSoyad || '').trim();
  if (!temizAdSoyad) return { basarili: false, hata: 'Ad soyad boş olamaz.' };

  const kullanicilar = oku('isg_kullanicilar', []);
  const kayit = kullanicilar.find(k => k.id === id && KISITLI_ROLLER.includes(k.rol) && k.olusturanId === admin.id);
  if (!kayit) return { basarili: false, hata: 'Kullanıcı bulunamadı.' };
  if (kayit.rol === 'birim') {
    if (!(birimAdi || '').trim()) return { basarili: false, hata: 'Birim rolü için bir birim seçilmeli.' };
    kayit.birimAdi = birimAdi.trim();
  }
  if (kayit.rol === 'duzenleyici') kayit.isgOnayiVerebilir = !!isgOnayiVerebilir;
  if (kayit.rol === 'bakim') kayit.bakimTuru = (bakimTuru || '').trim();

  const sahipOlunanFirmalar = new Set(getFirmalar().map(f => f.id));
  kayit.adSoyad = temizAdSoyad;
  kayit.erisimFirmaIdleri = (Array.isArray(firmaIdleri) ? firmaIdleri : []).filter(fid => sahipOlunanFirmalar.has(fid));
  yaz('isg_kullanicilar', kullanicilar);
  return { basarili: true, kullanici: kayit };
}

async function ikKullaniciSifreDegistir(id, yeniSifre) {
  const admin = oturumdakiKullanici();
  if (!admin) return { basarili: false, hata: 'Oturum bulunamadı.' };
  if (!yeniSifre || yeniSifre.length < 4) return { basarili: false, hata: 'Şifre en az 4 karakter olmalı.' };

  const kullanicilar = oku('isg_kullanicilar', []);
  const kayit = kullanicilar.find(k => k.id === id && KISITLI_ROLLER.includes(k.rol) && k.olusturanId === admin.id);
  if (!kayit) return { basarili: false, hata: 'Kullanıcı bulunamadı.' };

  kayit.sifre = await _sifreOzetiCikar(yeniSifre);
  yaz('isg_kullanicilar', kullanicilar);
  return { basarili: true };
}

function ikKullaniciSil(id) {
  const admin = oturumdakiKullanici();
  if (!admin) return { basarili: false, hata: 'Oturum bulunamadı.' };

  const kullanicilar = oku('isg_kullanicilar', []);
  const kayit = kullanicilar.find(k => k.id === id && KISITLI_ROLLER.includes(k.rol) && k.olusturanId === admin.id);
  if (!kayit) return { basarili: false, hata: 'Kullanıcı bulunamadı.' };

  yaz('isg_kullanicilar', kullanicilar.filter(k => k.id !== id));
  return { basarili: true };
}

function cikisYap() {
  // Açık oturum kaydını kapat (bkz. girisYap) — tarayıcı kapatılıp "Çıkış
  // Yap" hiç tıklanmazsa bu satır hiç çalışmaz, o kayıt çıkış zamansız
  // ("Kapatılmadı") kalır; bu, sunucu tarafı oturum takibi olmayan
  // client-only bir uygulamanın doğal sınırıdır.
  const oturum = oku('isg_oturum', null);
  if (oturum && oturum.oturumKayitId) {
    const gecmis = oku('isg_oturum_gecmisi', []);
    const kayit = gecmis.find(g => g.id === oturum.oturumKayitId);
    if (kayit && !kayit.cikisZamani) {
      kayit.cikisZamani = new Date().toISOString();
      yaz('isg_oturum_gecmisi', gecmis);
    }
  }
  localStorage.removeItem('isg_oturum');
  localStorage.removeItem('isg_aktif_firma');
}

// Sadece admin görebilir (bkz. giris-kayitlari.html). En yeni giriş en
// üstte olacak şekilde döner.
function girisGecmisiGetir() {
  return oku('isg_oturum_gecmisi', []).slice().reverse();
}

// Aktif firmaya göre izole edilmiş bir localStorage anahtarı üretir.
// Örnek: tenantAnahtar('personel') -> 'isg_akme-sanayi_personel'
// Böylece her modül, hangi firmanın seçili olduğunu bilmeden veri
// okuyup yazdığında otomatik olarak firmalar arasında izole kalır.
function tenantAnahtar(modulAdi) {
  const firmaId = localStorage.getItem('isg_aktif_firma');
  if (!firmaId) return null;
  return tenantAnahtarFirma(firmaId, modulAdi);
}

// tenantAnahtar'ın aktif firma yerine BELİRTİLEN bir firma için anahtar
// üreten hâli — aynı kullanıcının yönettiği başka bir firmanın verisini
// okumak/yazmak için (örn. Olay/Kaza modülünde farklı bir firmadan personel
// çekme ve kaydı o firmaya da işleme). Firma-bağımsız değildir; sadece
// aktif-firma varsayımını parametreye çevirir, izolasyon mantığı aynıdır.
function tenantAnahtarFirma(firmaId, modulAdi) {
  if (!firmaId) return null;
  // getFirmaById (core/tenant.js) sahiplik kontrolü yapar: firma oturumdaki
  // kullanıcıya ait değilse null döner ve burada anahtar üretilmez. Böylece
  // localStorage.isg_aktif_firma'yı devtools'tan başka bir firmaId'ye
  // değiştirmek, o firmanın verisine erişim sağlamaz.
  const firma = getFirmaById(firmaId);
  if (!firma) return null;
  return `isg_${firma.slug}_${modulAdi}`;
}
