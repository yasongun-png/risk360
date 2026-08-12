// Stajyer depolama katmanı. Firma bazlı izole (tenantAnahtar).

function _stajyerAnahtari() {
  return tenantAnahtar('stajyer_kayitlari');
}

function stajyerTumunuGetir() {
  return oku(_stajyerAnahtari(), []);
}

function _stajyerKaydet(liste) {
  yaz(_stajyerAnahtari(), liste);
}

function stajyerEkleRepo(kayit) {
  const liste = stajyerTumunuGetir();
  liste.push(kayit);
  _stajyerKaydet(liste);
  return kayit;
}

function stajyerGuncelleRepo(id, veriler) {
  const liste = stajyerTumunuGetir();
  const index = liste.findIndex(k => k.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], veriler);
  _stajyerKaydet(liste);
  return liste[index];
}

function stajyerSilRepo(id) {
  _stajyerKaydet(stajyerTumunuGetir().filter(k => k.id !== id));
}

function stajyerIdIleGetirRepo(id) {
  return stajyerTumunuGetir().find(k => k.id === id) || null;
}
