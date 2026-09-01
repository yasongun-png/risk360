// İş İzni depolama katmanı. Firma bazlı izole (tenantAnahtar).

function _izinAnahtari() { return tenantAnahtar('is_izinleri'); }

function izinTumunuGetir() { return oku(_izinAnahtari(), []); }
function _izinKaydet(liste) { yaz(_izinAnahtari(), liste); }

function izinEkleRepo(kayit) {
  const liste = izinTumunuGetir();
  liste.push(kayit);
  _izinKaydet(liste);
  return kayit;
}

function izinGuncelleRepo(id, veriler) {
  const liste = izinTumunuGetir();
  const index = liste.findIndex(k => k.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], veriler);
  _izinKaydet(liste);
  return liste[index];
}

function izinSilRepo(id) {
  _izinKaydet(izinTumunuGetir().filter(k => k.id !== id));
}

function izinIdIleGetirRepo(id) {
  return izinTumunuGetir().find(k => k.id === id) || null;
}
