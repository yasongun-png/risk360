// Malzeme Talep depolama katmanı. Firma bazlı izole (tenantAnahtar).

function _malzemeKatalogAnahtari() { return tenantAnahtar('malzeme_katalogu'); }
function _malzemeTalepAnahtari() { return tenantAnahtar('malzeme_talepleri'); }

function malzemeTumunuGetir() { return oku(_malzemeKatalogAnahtari(), []); }
function _malzemeKaydet(liste) { yaz(_malzemeKatalogAnahtari(), liste); }

function malzemeEkleRepo(kayit) {
  const liste = malzemeTumunuGetir();
  liste.push(kayit);
  _malzemeKaydet(liste);
  return kayit;
}

function malzemeGuncelleRepo(id, veriler) {
  const liste = malzemeTumunuGetir();
  const index = liste.findIndex(k => k.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], veriler);
  _malzemeKaydet(liste);
  return liste[index];
}

function malzemeSilRepo(id) {
  _malzemeKaydet(malzemeTumunuGetir().filter(k => k.id !== id));
}

function malzemeIdIleGetirRepo(id) {
  return malzemeTumunuGetir().find(k => k.id === id) || null;
}

function malzemeTalepTumunuGetir() { return oku(_malzemeTalepAnahtari(), []); }
function _malzemeTalepKaydet(liste) { yaz(_malzemeTalepAnahtari(), liste); }

function malzemeTalepEkleRepo(kayit) {
  const liste = malzemeTalepTumunuGetir();
  liste.push(kayit);
  _malzemeTalepKaydet(liste);
  return kayit;
}

function malzemeTalepGuncelleRepo(id, veriler) {
  const liste = malzemeTalepTumunuGetir();
  const index = liste.findIndex(k => k.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], veriler);
  _malzemeTalepKaydet(liste);
  return liste[index];
}

function malzemeTalepSilRepo(id) {
  _malzemeTalepKaydet(malzemeTalepTumunuGetir().filter(k => k.id !== id));
}

function malzemeTalepIdIleGetirRepo(id) {
  return malzemeTalepTumunuGetir().find(k => k.id === id) || null;
}
