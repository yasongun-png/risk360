// Bakım Talep kalıcı katmanı. Aktif firmaya göre otomatik izole edilir
// (bkz. core/auth.js -> tenantAnahtar).

function _bakimTalepAnahtari() {
  return tenantAnahtar('bakim_talepleri');
}

function bakimTalepleriTumunuGetirRepo() {
  return oku(_bakimTalepAnahtari(), []);
}

function _bakimTalepleriKaydetRepo(liste) {
  yaz(_bakimTalepAnahtari(), liste);
}

function bakimTalepEkleRepo(kayit) {
  const liste = bakimTalepleriTumunuGetirRepo();
  liste.push(kayit);
  _bakimTalepleriKaydetRepo(liste);
  return kayit;
}

function bakimTalepGuncelleRepo(id, veriler) {
  const liste = bakimTalepleriTumunuGetirRepo();
  const index = liste.findIndex(t => t.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], veriler);
  _bakimTalepleriKaydetRepo(liste);
  return liste[index];
}

function bakimTalepIdIleGetirRepo(id) {
  return bakimTalepleriTumunuGetirRepo().find(t => t.id === id) || null;
}

function bakimTalepSilRepo(id) {
  const liste = bakimTalepleriTumunuGetirRepo();
  _bakimTalepleriKaydetRepo(liste.filter(t => t.id !== id));
}

// ---- Ekipman Envanteri (talep formlarından kendiliğinden büyür) ----

function _ekipmanEnvanterAnahtari() {
  return tenantAnahtar('bakim_ekipman_envanteri');
}

function ekipmanEnvanteriTumunuGetirRepo() {
  return oku(_ekipmanEnvanterAnahtari(), []);
}

function _ekipmanEnvanteriKaydetRepo(liste) {
  yaz(_ekipmanEnvanterAnahtari(), liste);
}

function ekipmanEnvanterKaydiEkleRepo(kayit) {
  const liste = ekipmanEnvanteriTumunuGetirRepo();
  liste.push(kayit);
  _ekipmanEnvanteriKaydetRepo(liste);
  return kayit;
}

function ekipmanEnvanterKaydiGuncelleRepo(id, veriler) {
  const liste = ekipmanEnvanteriTumunuGetirRepo();
  const index = liste.findIndex(e => e.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], veriler);
  _ekipmanEnvanteriKaydetRepo(liste);
  return liste[index];
}
