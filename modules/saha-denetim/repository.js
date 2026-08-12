// Saha Denetim depolama katmanı. Firma bazlı izole (tenantAnahtar).

function _denetimAnahtari() {
  return tenantAnahtar('saha_denetimleri');
}

function denetimTumunuGetirRepo() {
  return oku(_denetimAnahtari(), []);
}

function _denetimKaydet(liste) {
  yaz(_denetimAnahtari(), liste);
}

function denetimEkleRepo(kayit) {
  const liste = denetimTumunuGetirRepo();
  liste.push(kayit);
  _denetimKaydet(liste);
  return kayit;
}

function denetimGuncelleRepo(id, veriler) {
  const liste = denetimTumunuGetirRepo();
  const index = liste.findIndex(d => d.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], veriler);
  _denetimKaydet(liste);
  return liste[index];
}

function denetimSilRepo(id) {
  _denetimKaydet(denetimTumunuGetirRepo().filter(d => d.id !== id));
}

function denetimIdIleGetirRepo(id) {
  return denetimTumunuGetirRepo().find(d => d.id === id) || null;
}
