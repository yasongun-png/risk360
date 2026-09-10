// Ortak e-posta gönderim yardımcısı (EmailJS — bkz. ayarlar.html).
//
// Bu uygulamanın backend'i yok (statik site + Firestore), bu yüzden klasik
// SMTP gönderimi mümkün değil; EmailJS tarayıcıdan doğrudan mail atmayı
// sağlayan bir servis. Yapılandırma (Service ID/Template ID/Public Key)
// diğer firma-bazlı küçük ayarlar gibi (bkz. core/data.js
// _KUCUK_SENKRON_ANAHTARLAR) oku()/yaz() ile Firestore'a senkronize edilir
// — böylece bir kez Ayarlar'dan girilince tüm cihazlarda geçerli olur
// (Firebase config'in aksine, o cihaz-bazlıdır çünkü SDK bağlantısını
// belirler).
//
// SDK, xlsxHazirOlduğunda (core/excel.js) ile aynı "ihtiyaç anında CDN'den
// yükle" deseniyle yüklenir; hiçbir modülün varsayılan sayfa yüklemesini
// yavaşlatmaz.

const EPOSTA_CONFIG_ANAHTARI = 'isg_eposta_config';
const EPOSTA_SDK_CDN_URL = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';

function epostaConfigGetir() {
  return oku(EPOSTA_CONFIG_ANAHTARI, { serviceId: '', templateId: '', publicKey: '', aktif: false });
}

function epostaConfigKaydet(config) {
  yaz(EPOSTA_CONFIG_ANAHTARI, config);
}

function epostaAktifMi() {
  const c = epostaConfigGetir();
  return !!(c.aktif && c.serviceId && c.templateId && c.publicKey);
}

function _epostaSdkYuklu() {
  return typeof emailjs !== 'undefined';
}

function epostaSdkHazirOlduğunda(callback) {
  if (_epostaSdkYuklu()) { callback(); return; }
  const mevcutScript = document.querySelector(`script[src="${EPOSTA_SDK_CDN_URL}"]`);
  if (mevcutScript) { mevcutScript.addEventListener('load', callback); return; }

  const script = document.createElement('script');
  script.src = EPOSTA_SDK_CDN_URL;
  script.onload = callback;
  script.onerror = () => alert('E-posta gönderim kütüphanesi yüklenemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.');
  document.head.appendChild(script);
}

// templateParams, EmailJS şablonundaki değişken adlarıyla eşleşmeli (ör.
// {{to_email}}, {{konu}}, {{mesaj}} gibi -- şablon EmailJS panelinden
// tanımlanır, kod içinden değil).
function epostaGonder(templateParams) {
  if (!epostaAktifMi()) {
    return Promise.reject(new Error('E-posta bildirimleri yapılandırılmamış. Ayarlar sayfasından EmailJS bilgilerini girin.'));
  }
  const config = epostaConfigGetir();
  return new Promise((resolve, reject) => {
    epostaSdkHazirOlduğunda(() => {
      emailjs.send(config.serviceId, config.templateId, templateParams, { publicKey: config.publicKey })
        .then(resolve)
        .catch(reject);
    });
  });
}
