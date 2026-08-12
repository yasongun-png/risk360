// Hizmet Sözleşmeleri depolama katmanı. Firma bazlı izole (tenantAnahtar).

function _hizmetSozlesmesiAnahtari() {
  return tenantAnahtar('hizmet_sozlesmeleri');
}

function hizmetSozlesmeleriTumunuGetir() {
  return oku(_hizmetSozlesmesiAnahtari(), []);
}

function _hizmetSozlesmeleriKaydet(liste) {
  yaz(_hizmetSozlesmesiAnahtari(), liste);
}

function hizmetSozlesmesiEkleRepo(kayit) {
  const liste = hizmetSozlesmeleriTumunuGetir();
  liste.push(kayit);
  _hizmetSozlesmeleriKaydet(liste);
  return kayit;
}

function hizmetSozlesmesiGuncelleRepo(id, veriler) {
  const liste = hizmetSozlesmeleriTumunuGetir();
  const index = liste.findIndex(k => k.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], veriler);
  _hizmetSozlesmeleriKaydet(liste);
  return liste[index];
}

function hizmetSozlesmesiSilRepo(id) {
  _hizmetSozlesmeleriKaydet(hizmetSozlesmeleriTumunuGetir().filter(k => k.id !== id));
}

function hizmetSozlesmesiIdIleGetirRepo(id) {
  return hizmetSozlesmeleriTumunuGetir().find(k => k.id === id) || null;
}
