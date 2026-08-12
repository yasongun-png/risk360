// İSG Kurulu depolama katmanı. Firma bazlı izole (tenantAnahtar).

function _toplantiAnahtari() { return tenantAnahtar('kurul_toplantilari'); }
function _kararAnahtari() { return tenantAnahtar('kurul_kararlari'); }
function _olayAnahtari() { return tenantAnahtar('kurul_olaylari'); }
function _imzaAnahtari() { return tenantAnahtar('kurul_imzalari'); }
function _ayIciFaaliyetAnahtari() { return tenantAnahtar('kurul_ayici_faaliyetler'); }
function _denetimAnahtari() { return tenantAnahtar('kurul_denetim'); }

function toplantiTumunuGetir() {
  return oku(_toplantiAnahtari(), []);
}

function _toplantiKaydet(liste) {
  yaz(_toplantiAnahtari(), liste);
}

function toplantiEkleRepo(toplanti) {
  const liste = toplantiTumunuGetir();
  liste.push(toplanti);
  _toplantiKaydet(liste);
  return toplanti;
}

// Çok sayıda kaydı TEK bir bulut yazımıyla ekler (bkz. uygunsuzluk modülündeki
// aynı desenin gerekçesi: art arda çok sayıda ayrı yaz() çağrısı ağ tamamlanma
// sırası yüzünden birbirinin üzerine yazıp veri kaybına yol açabiliyor).
function toplantiTopluEkleRepo(kayitlar) {
  if (!kayitlar.length) return Promise.resolve({ basarili: true });
  const liste = toplantiTumunuGetir();
  liste.push(...kayitlar);
  return yazVeSonucuGetir(_toplantiAnahtari(), liste);
}

function toplantiGuncelleRepo(id, veriler) {
  const liste = toplantiTumunuGetir();
  const index = liste.findIndex(t => t.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], veriler);
  _toplantiKaydet(liste);
  return liste[index];
}

function toplantiSilRepo(id) {
  _toplantiKaydet(toplantiTumunuGetir().filter(t => t.id !== id));
  _kararKaydet(kararTumunuGetir().filter(k => k.toplantiId !== id));
  _olayKaydet(olayTumunuGetir().filter(o => o.toplantiId !== id));
  _imzaKaydet(imzaTumunuGetir().filter(i => i.toplantiId !== id));
  _ayIciFaaliyetKaydet(ayIciFaaliyetTumunuGetir().filter(f => f.toplantiId !== id));
}

function toplantiIdIleGetirRepo(id) {
  return toplantiTumunuGetir().find(t => t.id === id) || null;
}

function kararTumunuGetir() {
  return oku(_kararAnahtari(), []);
}

function _kararKaydet(liste) {
  yaz(_kararAnahtari(), liste);
}

function kararEkleRepo(karar) {
  const liste = kararTumunuGetir();
  liste.push(karar);
  _kararKaydet(liste);
  return karar;
}

function kararTopluEkleRepo(kayitlar) {
  if (!kayitlar.length) return Promise.resolve({ basarili: true });
  const liste = kararTumunuGetir();
  liste.push(...kayitlar);
  return yazVeSonucuGetir(_kararAnahtari(), liste);
}

function kararGuncelleRepo(id, veriler) {
  const liste = kararTumunuGetir();
  const index = liste.findIndex(k => k.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], veriler);
  _kararKaydet(liste);
  return liste[index];
}

function kararSilRepo(id) {
  _kararKaydet(kararTumunuGetir().filter(k => k.id !== id));
}

function kararIdIleGetirRepo(id) {
  return kararTumunuGetir().find(k => k.id === id) || null;
}

function olayTumunuGetir() {
  return oku(_olayAnahtari(), []);
}

function _olayKaydet(liste) {
  yaz(_olayAnahtari(), liste);
}

function olayEkleRepo(olay) {
  const liste = olayTumunuGetir();
  liste.push(olay);
  _olayKaydet(liste);
  return olay;
}

function olayTopluEkleRepo(kayitlar) {
  if (!kayitlar.length) return Promise.resolve({ basarili: true });
  const liste = olayTumunuGetir();
  liste.push(...kayitlar);
  return yazVeSonucuGetir(_olayAnahtari(), liste);
}

function olayGuncelleRepo(id, veriler) {
  const liste = olayTumunuGetir();
  const index = liste.findIndex(o => o.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], veriler);
  _olayKaydet(liste);
  return liste[index];
}

function olaySilRepo(id) {
  _olayKaydet(olayTumunuGetir().filter(o => o.id !== id));
}

function ayIciFaaliyetTumunuGetir() {
  return oku(_ayIciFaaliyetAnahtari(), []);
}

function _ayIciFaaliyetKaydet(liste) {
  yaz(_ayIciFaaliyetAnahtari(), liste);
}

function ayIciFaaliyetEkleRepo(faaliyet) {
  const liste = ayIciFaaliyetTumunuGetir();
  liste.push(faaliyet);
  _ayIciFaaliyetKaydet(liste);
  return faaliyet;
}

function ayIciFaaliyetSilRepo(id) {
  _ayIciFaaliyetKaydet(ayIciFaaliyetTumunuGetir().filter(f => f.id !== id));
}

function denetimTumunuGetir() {
  return oku(_denetimAnahtari(), []);
}

function _denetimKaydet(liste) {
  yaz(_denetimAnahtari(), liste);
}

// Eski uygulamadaki 800 kayıtlık üst sınırla aynı — en eski kayıtlar sessizce
// düşer (bir yasal saklama gereksinimi yok, bu sadece işlevsel bir iz).
const DENETIM_MAKS_KAYIT = 800;

function denetimEkleRepo(kayit) {
  const liste = denetimTumunuGetir();
  liste.push(kayit);
  if (liste.length > DENETIM_MAKS_KAYIT) liste.splice(0, liste.length - DENETIM_MAKS_KAYIT);
  _denetimKaydet(liste);
  return kayit;
}

function denetimTemizleRepo() {
  _denetimKaydet([]);
}

function imzaTumunuGetir() {
  return oku(_imzaAnahtari(), []);
}

function _imzaKaydet(liste) {
  yaz(_imzaAnahtari(), liste);
}

function imzaEkleRepo(imza) {
  const liste = imzaTumunuGetir();
  liste.push(imza);
  _imzaKaydet(liste);
  return imza;
}

function imzaTopluEkleRepo(kayitlar) {
  if (!kayitlar.length) return Promise.resolve({ basarili: true });
  const liste = imzaTumunuGetir();
  liste.push(...kayitlar);
  return yazVeSonucuGetir(_imzaAnahtari(), liste);
}

function imzaGuncelleRepo(id, veriler) {
  const liste = imzaTumunuGetir();
  const index = liste.findIndex(i => i.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], veriler);
  _imzaKaydet(liste);
  return liste[index];
}

function imzaSilRepo(id) {
  _imzaKaydet(imzaTumunuGetir().filter(i => i.id !== id));
}
