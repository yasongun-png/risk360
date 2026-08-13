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

  yaz('isg_oturum', { kullaniciId: bulunan.id });
  return { basarili: true, kullanici: bulunan };
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
const IK_IZINLI_MODULLER = ['personel', 'egitim'];

function kullaniciAdminMi(kullanici) {
  return !!kullanici && (!kullanici.rol || kullanici.rol === 'admin');
}

// Modül sayfalarının (modules/<ad>/index.html) girisGerekli() yerine
// çağırması gereken hâl: oturum kontrolünün yanına, İK rolündeki
// kullanıcıların sadece kendilerine izinli modüllere girebilmesini de ekler.
function girisGerekliModul(modulAnahtari) {
  const kullanici = girisGerekli();
  if (!kullanici) return null;
  if (!kullaniciAdminMi(kullanici) && !IK_IZINLI_MODULLER.includes(modulAnahtari)) {
    alert('Bu modüle erişim yetkiniz yok.');
    window.location.href = _authKokYolu + 'dashboard.html';
    return null;
  }
  return kullanici;
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

// ---- İK kullanıcı yönetimi (admin tarafından) ----
//
// Her İK kullanıcısı bir admin tarafından (olusturanId) oluşturulur ve
// SADECE o admin tarafından görülür/düzenlenir — firmaların sahipId'yle
// izole edilmesiyle aynı mantık.

function kullaniciAdiMusaitMi(kullaniciAdi, haricId) {
  const temiz = (kullaniciAdi || '').trim().toLowerCase();
  if (!temiz) return false;
  const kullanicilar = oku('isg_kullanicilar', []);
  return !kullanicilar.some(k => k.kullaniciAdi.toLowerCase() === temiz && k.id !== haricId);
}

function ikKullanicilariGetir() {
  const admin = oturumdakiKullanici();
  if (!admin) return [];
  return oku('isg_kullanicilar', []).filter(k => k.rol === 'ik' && k.olusturanId === admin.id);
}

async function ikKullaniciEkle(kullaniciAdi, sifre, adSoyad, firmaIdleri) {
  const admin = oturumdakiKullanici();
  if (!admin) return { basarili: false, hata: 'Oturum bulunamadı.' };

  const temizKullaniciAdi = (kullaniciAdi || '').trim();
  const temizAdSoyad = (adSoyad || '').trim();
  if (!temizKullaniciAdi) return { basarili: false, hata: 'Kullanıcı adı boş olamaz.' };
  if (!temizAdSoyad) return { basarili: false, hata: 'Ad soyad boş olamaz.' };
  if (!sifre || sifre.length < 4) return { basarili: false, hata: 'Şifre en az 4 karakter olmalı.' };
  if (!kullaniciAdiMusaitMi(temizKullaniciAdi)) return { basarili: false, hata: 'Bu kullanıcı adı zaten kullanılıyor.' };

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
    rol: 'ik',
    olusturanId: admin.id,
    erisimFirmaIdleri: gecerliFirmaIdleri
  };
  kullanicilar.push(yeniKullanici);
  yaz('isg_kullanicilar', kullanicilar);
  return { basarili: true, kullanici: yeniKullanici };
}

function ikKullaniciGuncelle(id, adSoyad, firmaIdleri) {
  const admin = oturumdakiKullanici();
  if (!admin) return { basarili: false, hata: 'Oturum bulunamadı.' };

  const temizAdSoyad = (adSoyad || '').trim();
  if (!temizAdSoyad) return { basarili: false, hata: 'Ad soyad boş olamaz.' };

  const kullanicilar = oku('isg_kullanicilar', []);
  const kayit = kullanicilar.find(k => k.id === id && k.rol === 'ik' && k.olusturanId === admin.id);
  if (!kayit) return { basarili: false, hata: 'Kullanıcı bulunamadı.' };

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
  const kayit = kullanicilar.find(k => k.id === id && k.rol === 'ik' && k.olusturanId === admin.id);
  if (!kayit) return { basarili: false, hata: 'Kullanıcı bulunamadı.' };

  kayit.sifre = await _sifreOzetiCikar(yeniSifre);
  yaz('isg_kullanicilar', kullanicilar);
  return { basarili: true };
}

function ikKullaniciSil(id) {
  const admin = oturumdakiKullanici();
  if (!admin) return { basarili: false, hata: 'Oturum bulunamadı.' };

  const kullanicilar = oku('isg_kullanicilar', []);
  const kayit = kullanicilar.find(k => k.id === id && k.rol === 'ik' && k.olusturanId === admin.id);
  if (!kayit) return { basarili: false, hata: 'Kullanıcı bulunamadı.' };

  yaz('isg_kullanicilar', kullanicilar.filter(k => k.id !== id));
  return { basarili: true };
}

function cikisYap() {
  localStorage.removeItem('isg_oturum');
  localStorage.removeItem('isg_aktif_firma');
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
