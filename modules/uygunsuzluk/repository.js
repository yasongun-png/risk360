// Uygunsuzluk/DÖF depolama katmanı. Firma bazlı izole (tenantAnahtar).

function _uygunsuzlukAnahtari() {
  return tenantAnahtar('uygunsuzluk_kayitlari');
}

function uygunsuzlukTumunuGetir() {
  return oku(_uygunsuzlukAnahtari(), []);
}

function _uygunsuzlukKaydet(liste) {
  yaz(_uygunsuzlukAnahtari(), liste);
}

function uygunsuzlukEkleRepo(kayit) {
  const liste = uygunsuzlukTumunuGetir();
  liste.push(kayit);
  _uygunsuzlukKaydet(liste);
  return kayit;
}

// Çok sayıda kaydı TEK bir bulut yazımıyla ekler (ör. JSON toplu içe
// aktarım). uygunsuzlukEkleRepo()'nun aksine her kayıt için ayrı yaz()
// çağrısı yapmaz — art arda çok sayıda eşzamanlı bulut yazımı, ağ tamamlanma
// sırası yüzünden birbirinin üzerine yazıp veri kaybına yol açabiliyordu.
// Sonucu (gerçekten buluta yazıldı mı) bekleyen bir Promise döner.
function uygunsuzlukTopluEkleRepo(kayitlar) {
  if (!kayitlar.length) return Promise.resolve({ basarili: true });
  const liste = uygunsuzlukTumunuGetir();
  liste.push(...kayitlar);
  return yazVeSonucuGetir(_uygunsuzlukAnahtari(), liste);
}

// Çok sayıda kaydı TEK bulut yazımıyla günceller (ÇSGB Excel içe aktarımında
// aynı madde no'lu mevcut kayıtlar). degisiklikler: { <id>: {alan: deger} }.
function uygunsuzlukTopluGuncelleRepo(degisiklikler) {
  const idler = Object.keys(degisiklikler || {});
  if (!idler.length) return Promise.resolve({ basarili: true });
  const liste = uygunsuzlukTumunuGetir().map(k => degisiklikler[k.id] ? Object.assign({}, k, degisiklikler[k.id]) : k);
  return yazVeSonucuGetir(_uygunsuzlukAnahtari(), liste);
}

function uygunsuzlukGuncelleRepo(id, veriler) {
  const liste = uygunsuzlukTumunuGetir();
  const index = liste.findIndex(k => k.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], veriler);
  _uygunsuzlukKaydet(liste);
  return liste[index];
}

// uygunsuzlukGuncelleRepo'nun aksine Firestore yazımının GERÇEKTEN bitmesini
// bekleyen Promise döner (bkz. core/data.js yazVeSonucuGetir). Harita
// köprüsündeki "konumGuncelle" burayı kullanır — çünkü hemen ardından
// window.location.href ile sayfa değişiyor; fire-and-forget yaz() sayfa
// değişirken yarıda kesilip konum kaydını sessizce kaybedebiliyordu
// (kullanıcı bildirdi: harita ekleniyor ama kalıcı olmuyordu).
function uygunsuzlukGuncelleRepoVeBekle(id, veriler) {
  const liste = uygunsuzlukTumunuGetir();
  const index = liste.findIndex(k => k.id === id);
  if (index === -1) return Promise.resolve(null);
  liste[index] = Object.assign({}, liste[index], veriler);
  return yazVeSonucuGetir(_uygunsuzlukAnahtari(), liste).then(() => liste[index]);
}

function uygunsuzlukSilRepo(id) {
  _uygunsuzlukKaydet(uygunsuzlukTumunuGetir().filter(k => k.id !== id));
}

function uygunsuzlukIdIleGetirRepo(id) {
  return uygunsuzlukTumunuGetir().find(k => k.id === id) || null;
}

// ---- Uygunsuzluk Konusu / Defteri ----

function _uygunsuzlukKonuAnahtari() {
  return tenantAnahtar('uygunsuzluk_konulari');
}

function uygunsuzlukKonulariTumunuGetir() {
  return oku(_uygunsuzlukKonuAnahtari(), []);
}

function _uygunsuzlukKonulariKaydet(liste) {
  yaz(_uygunsuzlukKonuAnahtari(), liste);
}

function uygunsuzlukKonuEkleRepo(konu) {
  const liste = uygunsuzlukKonulariTumunuGetir();
  liste.push(konu);
  _uygunsuzlukKonulariKaydet(liste);
  return konu;
}

function uygunsuzlukKonuGuncelleRepo(id, veriler) {
  const liste = uygunsuzlukKonulariTumunuGetir();
  const index = liste.findIndex(k => k.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], veriler);
  _uygunsuzlukKonulariKaydet(liste);
  return liste[index];
}

// ---- ÇSGB Denetimleri ----

function _csgbDenetimAnahtari() {
  return tenantAnahtar('uygunsuzluk_csgb_denetimleri');
}

function csgbDenetimleriTumunuGetir() {
  return oku(_csgbDenetimAnahtari(), []);
}

function csgbDenetimKaydetRepo(denetim) {
  const liste = csgbDenetimleriTumunuGetir();
  const index = liste.findIndex(d => d.id === denetim.id);
  if (index === -1) liste.push(denetim);
  else liste[index] = denetim;
  yaz(_csgbDenetimAnahtari(), liste);
  return denetim;
}

function csgbDenetimSilRepo(id) {
  yaz(_csgbDenetimAnahtari(), csgbDenetimleriTumunuGetir().filter(d => d.id !== id));
  const toplantilar = csgbToplantilariTumunuGetir();
  if (toplantilar.some(t => t.denetimId === id)) yaz(_csgbToplantiAnahtari(), toplantilar.filter(t => t.denetimId !== id));
}

function _csgbToplantiAnahtari() {
  return tenantAnahtar('uygunsuzluk_csgb_toplantilari');
}

function csgbToplantilariTumunuGetir() {
  return oku(_csgbToplantiAnahtari(), []);
}

function csgbToplantiKaydetRepo(toplanti) {
  const liste = csgbToplantilariTumunuGetir();
  const index = liste.findIndex(t => t.id === toplanti.id);
  if (index === -1) liste.push(toplanti);
  else liste[index] = toplanti;
  yaz(_csgbToplantiAnahtari(), liste);
  return toplanti;
}

function csgbToplantiSilRepo(id) {
  yaz(_csgbToplantiAnahtari(), csgbToplantilariTumunuGetir().filter(t => t.id !== id));
}

// Konuyu ve konuya bağlı TÜM uygunsuzluk kayıtlarını siler (kullanıcı isteği). İki liste de tek seferde
// yazılır; silinen kayıt sayısını döner.
function uygunsuzlukKonuyuVeKayitlariniSilRepo(konuId) {
  const kayitlar = uygunsuzlukTumunuGetir();
  const kalan = kayitlar.filter(k => k.konuId !== konuId);
  const silinen = kayitlar.length - kalan.length;
  _uygunsuzlukKaydet(kalan);
  _uygunsuzlukKonulariKaydet(uygunsuzlukKonulariTumunuGetir().filter(k => k.id !== konuId));
  // Konusu silinen ÇSGB denetim kartı da kalmasın (maddeleri zaten silindi).
  csgbDenetimleriTumunuGetir().filter(d => d.konuId === konuId).forEach(d => csgbDenetimSilRepo(d.id));
  return silinen;
}
