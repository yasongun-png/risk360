// Kimyasal envanteri depolama katmanı. Firma bazlı izole (tenantAnahtar).

function _kimyasalAnahtari() {
  return tenantAnahtar('kimyasal_envanteri');
}

function kimyasalTumunuGetir() {
  return oku(_kimyasalAnahtari(), []);
}

function _kimyasalKaydet(liste) {
  yaz(_kimyasalAnahtari(), liste);
}

function kimyasalEkleRepo(kayit) {
  const liste = kimyasalTumunuGetir();
  liste.push(kayit);
  _kimyasalKaydet(liste);
  return kayit;
}

function kimyasalGuncelleRepo(id, veriler) {
  const liste = kimyasalTumunuGetir();
  const index = liste.findIndex(k => k.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], veriler);
  _kimyasalKaydet(liste);
  return liste[index];
}

function kimyasalSilRepo(id) {
  _kimyasalKaydet(kimyasalTumunuGetir().filter(k => k.id !== id));
}

function kimyasalIdIleGetirRepo(id) {
  return kimyasalTumunuGetir().find(k => k.id === id) || null;
}
