// KKD depolama katmanı. Firma bazlı izole (tenantAnahtar) — dört ayrı
// koleksiyon: envanter (stok), zimmet (personele verilen KKD), ihlal (KKD
// kullanım ihlali tespitleri) ve numune (satın alma öncesi deneme/onay).

function _kkdEnvanterAnahtari() { return tenantAnahtar('kkd_envanter'); }
function _kkdZimmetAnahtari() { return tenantAnahtar('kkd_zimmetler'); }
function _kkdIhlalAnahtari() { return tenantAnahtar('kkd_ihlaller'); }
function _kkdNumuneAnahtari() { return tenantAnahtar('kkd_numuneler'); }

function envanterTumunuGetir() { return oku(_kkdEnvanterAnahtari(), []); }
function _envanterKaydet(liste) { yaz(_kkdEnvanterAnahtari(), liste); }

function envanterEkleRepo(kayit) {
  const liste = envanterTumunuGetir();
  liste.push(kayit);
  _envanterKaydet(liste);
  return kayit;
}

function envanterGuncelleRepo(id, veriler) {
  const liste = envanterTumunuGetir();
  const index = liste.findIndex(k => k.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], veriler);
  _envanterKaydet(liste);
  return liste[index];
}

function envanterSilRepo(id) {
  _envanterKaydet(envanterTumunuGetir().filter(k => k.id !== id));
}

function envanterIdIleGetirRepo(id) {
  return envanterTumunuGetir().find(k => k.id === id) || null;
}

function zimmetTumunuGetir() { return oku(_kkdZimmetAnahtari(), []); }
function _zimmetKaydet(liste) { yaz(_kkdZimmetAnahtari(), liste); }

function zimmetEkleRepo(kayit) {
  const liste = zimmetTumunuGetir();
  liste.push(kayit);
  _zimmetKaydet(liste);
  return kayit;
}

function zimmetGuncelleRepo(id, veriler) {
  const liste = zimmetTumunuGetir();
  const index = liste.findIndex(k => k.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], veriler);
  _zimmetKaydet(liste);
  return liste[index];
}

function zimmetSilRepo(id) {
  _zimmetKaydet(zimmetTumunuGetir().filter(k => k.id !== id));
}

function zimmetIdIleGetirRepo(id) {
  return zimmetTumunuGetir().find(k => k.id === id) || null;
}

function ihlalTumunuGetir() { return oku(_kkdIhlalAnahtari(), []); }
function _ihlalKaydet(liste) { yaz(_kkdIhlalAnahtari(), liste); }

function ihlalEkleRepo(kayit) {
  const liste = ihlalTumunuGetir();
  liste.push(kayit);
  _ihlalKaydet(liste);
  return kayit;
}

function ihlalGuncelleRepo(id, veriler) {
  const liste = ihlalTumunuGetir();
  const index = liste.findIndex(k => k.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], veriler);
  _ihlalKaydet(liste);
  return liste[index];
}

function ihlalSilRepo(id) {
  _ihlalKaydet(ihlalTumunuGetir().filter(k => k.id !== id));
}

function ihlalIdIleGetirRepo(id) {
  return ihlalTumunuGetir().find(k => k.id === id) || null;
}

function numuneTumunuGetir() { return oku(_kkdNumuneAnahtari(), []); }
function _numuneKaydet(liste) { yaz(_kkdNumuneAnahtari(), liste); }

function numuneEkleRepo(kayit) {
  const liste = numuneTumunuGetir();
  liste.push(kayit);
  _numuneKaydet(liste);
  return kayit;
}

function numuneGuncelleRepo(id, veriler) {
  const liste = numuneTumunuGetir();
  const index = liste.findIndex(k => k.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], veriler);
  _numuneKaydet(liste);
  return liste[index];
}

function numuneSilRepo(id) {
  _numuneKaydet(numuneTumunuGetir().filter(k => k.id !== id));
}

function numuneIdIleGetirRepo(id) {
  return numuneTumunuGetir().find(k => k.id === id) || null;
}
