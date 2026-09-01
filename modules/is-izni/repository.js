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

// ---- Gaz Ölçüm Cihazları (bkz. model.js gazCihaziOlustur) ----
function _gazCihaziAnahtari() { return tenantAnahtar('is_izni_gaz_cihazlari'); }

function gazCihazlariTumunuGetir() { return oku(_gazCihaziAnahtari(), []); }
function _gazCihazlariKaydet(liste) { yaz(_gazCihaziAnahtari(), liste); }

function gazCihaziEkleRepo(kayit) {
  const liste = gazCihazlariTumunuGetir();
  liste.push(kayit);
  _gazCihazlariKaydet(liste);
  return kayit;
}

function gazCihaziGuncelleRepo(id, veriler) {
  const liste = gazCihazlariTumunuGetir();
  const index = liste.findIndex(k => k.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], veriler);
  _gazCihazlariKaydet(liste);
  return liste[index];
}

function gazCihaziSilRepo(id) {
  _gazCihazlariKaydet(gazCihazlariTumunuGetir().filter(k => k.id !== id));
}

function gazCihaziIdIleGetirRepo(id) {
  return gazCihazlariTumunuGetir().find(k => k.id === id) || null;
}
