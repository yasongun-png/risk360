// İş Güvenliği Analizi (JSA) depolama katmanı. Firma bazlı izole (tenantAnahtar).

function _jsaAnahtari() {
  return tenantAnahtar('jsa_kayitlari');
}

function jsaKayitlariTumunuGetir() {
  return oku(_jsaAnahtari(), []);
}

function _jsaKaydet(liste) {
  yaz(_jsaAnahtari(), liste);
}

function jsaKaydiEkleRepo(kayit) {
  const liste = jsaKayitlariTumunuGetir();
  liste.push(kayit);
  _jsaKaydet(liste);
  return kayit;
}

function jsaKaydiGuncelleRepo(id, veriler) {
  const liste = jsaKayitlariTumunuGetir();
  const index = liste.findIndex(k => k.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], veriler, { id });
  _jsaKaydet(liste);
  return liste[index];
}

function jsaKaydiSilRepo(id) {
  const liste = jsaKayitlariTumunuGetir();
  _jsaKaydet(liste.filter(k => k.id !== id));
}

function jsaKaydiIdIleGetirRepo(id) {
  return jsaKayitlariTumunuGetir().find(k => k.id === id) || null;
}
