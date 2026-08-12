// Sınav modülü depolama katmanı. Firma bazlı izole (tenantAnahtar).
// Üç ayrı liste: soru bankası, sınavlar, sınav sonuçları.

function _soruAnahtari() {
  return tenantAnahtar('sinav_sorulari');
}

function soruTumunuGetirRepo() {
  return oku(_soruAnahtari(), []);
}

function _soruKaydet(liste) {
  yaz(_soruAnahtari(), liste);
}

function soruEkleRepo(soru) {
  const liste = soruTumunuGetirRepo();
  liste.push(soru);
  _soruKaydet(liste);
  return soru;
}

function soruGuncelleRepo(id, veriler) {
  const liste = soruTumunuGetirRepo();
  const index = liste.findIndex(s => s.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], veriler);
  _soruKaydet(liste);
  return liste[index];
}

function soruSilRepo(id) {
  _soruKaydet(soruTumunuGetirRepo().filter(s => s.id !== id));
}

function soruIdIleGetirRepo(id) {
  return soruTumunuGetirRepo().find(s => s.id === id) || null;
}

function _sinavAnahtari() {
  return tenantAnahtar('sinav_sinavlar');
}

function sinavTumunuGetirRepo() {
  return oku(_sinavAnahtari(), []);
}

function _sinavKaydet(liste) {
  yaz(_sinavAnahtari(), liste);
}

function sinavEkleRepo(sinav) {
  const liste = sinavTumunuGetirRepo();
  liste.push(sinav);
  _sinavKaydet(liste);
  return sinav;
}

function sinavSilRepo(id) {
  _sinavKaydet(sinavTumunuGetirRepo().filter(s => s.id !== id));
  _sonucKaydet(sonucTumunuGetirRepo().filter(r => r.sinavId !== id));
}

function sinavIdIleGetirRepo(id) {
  return sinavTumunuGetirRepo().find(s => s.id === id) || null;
}

function _sonucAnahtari() {
  return tenantAnahtar('sinav_sonuclari');
}

function sonucTumunuGetirRepo() {
  return oku(_sonucAnahtari(), []);
}

function _sonucKaydet(liste) {
  yaz(_sonucAnahtari(), liste);
}

function sonucEkleRepo(sonuc) {
  const liste = sonucTumunuGetirRepo();
  liste.push(sonuc);
  _sonucKaydet(liste);
  return sonuc;
}

function sonucSilRepo(id) {
  _sonucKaydet(sonucTumunuGetirRepo().filter(r => r.id !== id));
}
