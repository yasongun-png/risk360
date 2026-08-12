// Tespit ve Öneri Defteri depolama katmanı. Firma bazlı izole (tenantAnahtar).

function _tespitOneriAnahtari() {
  return tenantAnahtar('tespit_oneri_kayitlari');
}

function tespitOneriTumunuGetir() {
  return oku(_tespitOneriAnahtari(), []);
}

function _tespitOneriKaydet(liste) {
  yaz(_tespitOneriAnahtari(), liste);
}

function tespitOneriEkleRepo(kayit) {
  const liste = tespitOneriTumunuGetir();
  liste.push(kayit);
  _tespitOneriKaydet(liste);
  return kayit;
}

function tespitOneriGuncelleRepo(id, veriler) {
  const liste = tespitOneriTumunuGetir();
  const index = liste.findIndex(k => k.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], veriler);
  _tespitOneriKaydet(liste);
  return liste[index];
}

function tespitOneriSilRepo(id) {
  _tespitOneriKaydet(tespitOneriTumunuGetir().filter(k => k.id !== id));
}

function tespitOneriIdIleGetirRepo(id) {
  return tespitOneriTumunuGetir().find(k => k.id === id) || null;
}
