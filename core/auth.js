// Kimlik doğrulama ve oturum yönetimi (mock). data.js'ten sonra yüklenmelidir.

function girisYap(kullaniciAdi, sifre) {
  const kullanicilar = oku('isg_kullanicilar', []);
  const bulunan = kullanicilar.find(
    k => k.kullaniciAdi.toLowerCase() === (kullaniciAdi || '').trim().toLowerCase()
  );

  if (!bulunan || bulunan.sifre !== sifre) {
    return { basarili: false, hata: 'Kullanıcı adı veya şifre hatalı.' };
  }

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
  const firmalar = oku('isg_firmalar', []);
  const firma = firmalar.find(f => f.id === firmaId);
  const slug = firma ? firma.slug : firmaId;
  return `isg_${slug}_${modulAdi}`;
}
