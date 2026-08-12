// Saha Dijital Haritası depolama katmanı. Firma bazlı izole (tenantAnahtar).
// İki ayrı liste tutulur: tesisler (siteler) ve kayıtlar (harita üzerindeki
// noktalar) — her ikisi de kendi tenant-scoped anahtarında TEK belge olarak
// saklanır (diğer tüm risk360 modülleriyle aynı "büyük-senkron" deseni).

function _haritaTesisAnahtari() {
  return tenantAnahtar('harita_tesisler');
}

function _haritaKayitAnahtari() {
  return tenantAnahtar('harita_kayitlar');
}

// ---- Tesisler ----

function haritaTesisleriTumunuGetirRepo() {
  return oku(_haritaTesisAnahtari(), []);
}

function _haritaTesisleriKaydet(liste) {
  yaz(_haritaTesisAnahtari(), liste);
}

function haritaTesisEkleRepo(tesis) {
  const liste = haritaTesisleriTumunuGetirRepo();
  liste.push(tesis);
  _haritaTesisleriKaydet(liste);
  return tesis;
}

function haritaTesisGuncelleRepo(id, veriler) {
  const liste = haritaTesisleriTumunuGetirRepo();
  const index = liste.findIndex(t => t.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], veriler);
  _haritaTesisleriKaydet(liste);
  return liste[index];
}

function haritaTesisIdIleGetirRepo(id) {
  return haritaTesisleriTumunuGetirRepo().find(t => t.id === id) || null;
}

function haritaTesisSilRepo(id) {
  _haritaTesisleriKaydet(haritaTesisleriTumunuGetirRepo().filter(t => t.id !== id));
}

// ---- Kayıtlar (nokta kayıtları) ----

function haritaKayitlariTumunuGetirRepo() {
  return oku(_haritaKayitAnahtari(), []);
}

function _haritaKayitlariKaydet(liste) {
  yaz(_haritaKayitAnahtari(), liste);
}

function haritaKayitlariTesisIleGetirRepo(tesisId) {
  return haritaKayitlariTumunuGetirRepo().filter(k => k.tesisId === tesisId && !k.silinmeTarihi);
}

function haritaKayitEkleRepo(kayit) {
  const liste = haritaKayitlariTumunuGetirRepo();
  liste.push(kayit);
  _haritaKayitlariKaydet(liste);
  return kayit;
}

function haritaKayitGuncelleRepo(id, veriler) {
  const liste = haritaKayitlariTumunuGetirRepo();
  const index = liste.findIndex(k => k.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], veriler);
  _haritaKayitlariKaydet(liste);
  return liste[index];
}

function haritaKayitIdIleGetirRepo(id) {
  return haritaKayitlariTumunuGetirRepo().find(k => k.id === id) || null;
}

// Bir tesis silinirken, o tesise ait yerel (harita_kayitlar) noktaları da
// TEK yazımla temizlenir — dış kaynaklı (uygunsuzluk/risk/acil-durum ekipman)
// kayıtlara dokunulmaz, onlar kendi modüllerinde silinene kadar kalır.
function haritaKayitlariTesisIcinTemizleRepo(tesisId) {
  _haritaKayitlariKaydet(haritaKayitlariTumunuGetirRepo().filter(k => k.tesisId !== tesisId));
}

// ---- Etiketler (bina/alan adı gibi sabit metin etiketleri) ----

function _haritaEtiketAnahtari() {
  return tenantAnahtar('harita_etiketler');
}

function haritaEtiketleriTumunuGetirRepo() {
  return oku(_haritaEtiketAnahtari(), []);
}

function _haritaEtiketleriKaydet(liste) {
  yaz(_haritaEtiketAnahtari(), liste);
}

function haritaEtiketleriTesisIleGetirRepo(tesisId) {
  return haritaEtiketleriTumunuGetirRepo().filter(e => e.tesisId === tesisId);
}

function haritaEtiketEkleRepo(etiket) {
  const liste = haritaEtiketleriTumunuGetirRepo();
  liste.push(etiket);
  _haritaEtiketleriKaydet(liste);
  return etiket;
}

function haritaEtiketGuncelleRepo(id, veriler) {
  const liste = haritaEtiketleriTumunuGetirRepo();
  const index = liste.findIndex(e => e.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], veriler);
  _haritaEtiketleriKaydet(liste);
  return liste[index];
}

function haritaEtiketSilRepo(id) {
  _haritaEtiketleriKaydet(haritaEtiketleriTumunuGetirRepo().filter(e => e.id !== id));
}

function haritaEtiketleriTesisIcinTemizleRepo(tesisId) {
  _haritaEtiketleriKaydet(haritaEtiketleriTumunuGetirRepo().filter(e => e.tesisId !== tesisId));
}

// ---- Oklar (acil kaçış yönü okları) ----

function _haritaOkAnahtari() {
  return tenantAnahtar('harita_oklar');
}

function haritaOklariTumunuGetirRepo() {
  return oku(_haritaOkAnahtari(), []);
}

function _haritaOklariKaydet(liste) {
  yaz(_haritaOkAnahtari(), liste);
}

function haritaOklariTesisIleGetirRepo(tesisId) {
  return haritaOklariTumunuGetirRepo().filter(o => o.tesisId === tesisId);
}

function haritaOkEkleRepo(ok) {
  const liste = haritaOklariTumunuGetirRepo();
  liste.push(ok);
  _haritaOklariKaydet(liste);
  return ok;
}

function haritaOkGuncelleRepo(id, veriler) {
  const liste = haritaOklariTumunuGetirRepo();
  const index = liste.findIndex(o => o.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], veriler);
  _haritaOklariKaydet(liste);
  return liste[index];
}

function haritaOkSilRepo(id) {
  _haritaOklariKaydet(haritaOklariTumunuGetirRepo().filter(o => o.id !== id));
}

function haritaOklariTesisIcinTemizleRepo(tesisId) {
  _haritaOklariKaydet(haritaOklariTumunuGetirRepo().filter(o => o.tesisId !== tesisId));
}

