// Yüklenici depolama katmanı. Firma bazlı izole (tenantAnahtar).

function _yukleniciFirmaAnahtari() { return tenantAnahtar('yuklenici_firmalari'); }
function _yukleniciKisiAnahtari() { return tenantAnahtar('yuklenici_kisileri'); }
function _yukleniciAracAnahtari() { return tenantAnahtar('yuklenici_araclari'); }
function _yukleniciZiyaretciAnahtari() { return tenantAnahtar('yuklenici_ziyaretciler'); }

function yukleniciFirmalariTumunuGetir() {
  return oku(_yukleniciFirmaAnahtari(), []);
}

function _yukleniciFirmalariKaydet(liste) {
  yaz(_yukleniciFirmaAnahtari(), liste);
}

function yukleniciFirmaEkleRepo(firma) {
  const liste = yukleniciFirmalariTumunuGetir();
  liste.push(firma);
  _yukleniciFirmalariKaydet(liste);
  return firma;
}

function yukleniciFirmaGuncelleRepo(id, veriler) {
  const liste = yukleniciFirmalariTumunuGetir();
  const index = liste.findIndex(f => f.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], veriler);
  _yukleniciFirmalariKaydet(liste);
  return liste[index];
}

function yukleniciFirmaSilRepo(id) {
  _yukleniciFirmalariKaydet(yukleniciFirmalariTumunuGetir().filter(f => f.id !== id));
  _yukleniciKisileriKaydet(yukleniciKisileriTumunuGetir().filter(k => k.firmaId !== id));
}

function yukleniciFirmaIdIleGetirRepo(id) {
  return yukleniciFirmalariTumunuGetir().find(f => f.id === id) || null;
}

function yukleniciKisileriTumunuGetir() {
  return oku(_yukleniciKisiAnahtari(), []);
}

function _yukleniciKisileriKaydet(liste) {
  yaz(_yukleniciKisiAnahtari(), liste);
}

function yukleniciKisiEkleRepo(kisi) {
  const liste = yukleniciKisileriTumunuGetir();
  liste.push(kisi);
  _yukleniciKisileriKaydet(liste);
  return kisi;
}

function yukleniciKisiGuncelleRepo(id, veriler) {
  const liste = yukleniciKisileriTumunuGetir();
  const index = liste.findIndex(k => k.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], veriler);
  _yukleniciKisileriKaydet(liste);
  return liste[index];
}

function yukleniciKisiSilRepo(id) {
  _yukleniciKisileriKaydet(yukleniciKisileriTumunuGetir().filter(k => k.id !== id));
}

function yukleniciKisiIdIleGetirRepo(id) {
  return yukleniciKisileriTumunuGetir().find(k => k.id === id) || null;
}

function yukleniciAraclariTumunuGetir() {
  return oku(_yukleniciAracAnahtari(), []);
}

function _yukleniciAraclariKaydet(liste) {
  yaz(_yukleniciAracAnahtari(), liste);
}

function yukleniciAracEkleRepo(arac) {
  const liste = yukleniciAraclariTumunuGetir();
  liste.push(arac);
  _yukleniciAraclariKaydet(liste);
  return arac;
}

function yukleniciAracGuncelleRepo(id, veriler) {
  const liste = yukleniciAraclariTumunuGetir();
  const index = liste.findIndex(a => a.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], veriler);
  _yukleniciAraclariKaydet(liste);
  return liste[index];
}

function yukleniciAracSilRepo(id) {
  _yukleniciAraclariKaydet(yukleniciAraclariTumunuGetir().filter(a => a.id !== id));
}

function yukleniciAracIdIleGetirRepo(id) {
  return yukleniciAraclariTumunuGetir().find(a => a.id === id) || null;
}

function yukleniciZiyaretcileriTumunuGetir() {
  return oku(_yukleniciZiyaretciAnahtari(), []);
}

function _yukleniciZiyaretcileriKaydet(liste) {
  yaz(_yukleniciZiyaretciAnahtari(), liste);
}

function yukleniciZiyaretciEkleRepo(ziyaretci) {
  const liste = yukleniciZiyaretcileriTumunuGetir();
  liste.push(ziyaretci);
  _yukleniciZiyaretcileriKaydet(liste);
  return ziyaretci;
}

function yukleniciZiyaretciSilRepo(id) {
  _yukleniciZiyaretcileriKaydet(yukleniciZiyaretcileriTumunuGetir().filter(z => z.id !== id));
}
