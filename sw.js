// Bilerek minimal tutulan service worker: PWA/APK kurulabilirliği için
// gereken kayıtlı bir fetch dinleyicisi sağlar, ama HİÇBİR ŞEYİ önbelleğe
// almaz. Uygulama sürekli güncellenen kodlara ve canlı Firestore verisine
// dayandığından, agresif önbellekleme kullanıcılara eski/bayat bir sürüm
// göstermeye yol açardı — bu yüzden her istek doğrudan ağa (network) geçer.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  event.respondWith(fetch(event.request));
});
