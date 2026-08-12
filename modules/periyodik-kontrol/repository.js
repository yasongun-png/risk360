// Periyodik Kontrol depolama katmanı. Firma bazlı izole (tenantAnahtar).

function _periyodikEkipmanAnahtari() { return tenantAnahtar('periyodik_ekipmanlar'); }
function _periyodikKontrolAnahtari() { return tenantAnahtar('periyodik_kontroller'); }

function periyodikEkipmanTumunuGetir() { return oku(_periyodikEkipmanAnahtari(), []); }
function _periyodikEkipmanKaydet(liste) { yaz(_periyodikEkipmanAnahtari(), liste); }

function periyodikEkipmanEkleRepo(kayit) {
  const liste = periyodikEkipmanTumunuGetir();
  liste.push(kayit);
  _periyodikEkipmanKaydet(liste);
  return kayit;
}

function periyodikEkipmanGuncelleRepo(id, veriler) {
  const liste = periyodikEkipmanTumunuGetir();
  const index = liste.findIndex(k => k.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], veriler);
  _periyodikEkipmanKaydet(liste);
  return liste[index];
}

function periyodikEkipmanSilRepo(id) {
  _periyodikEkipmanKaydet(periyodikEkipmanTumunuGetir().filter(k => k.id !== id));
  _periyodikKontrolKaydet(periyodikKontrolTumunuGetir().filter(k => k.ekipmanId !== id));
}

function periyodikEkipmanIdIleGetirRepo(id) {
  return periyodikEkipmanTumunuGetir().find(k => k.id === id) || null;
}

function periyodikKontrolTumunuGetir() { return oku(_periyodikKontrolAnahtari(), []); }
function _periyodikKontrolKaydet(liste) { yaz(_periyodikKontrolAnahtari(), liste); }

function periyodikKontrolEkleRepo(kayit) {
  const liste = periyodikKontrolTumunuGetir();
  liste.push(kayit);
  _periyodikKontrolKaydet(liste);
  return kayit;
}

function periyodikKontrolGuncelleRepo(id, veriler) {
  const liste = periyodikKontrolTumunuGetir();
  const index = liste.findIndex(k => k.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], veriler);
  _periyodikKontrolKaydet(liste);
  return liste[index];
}

function periyodikKontrolSilRepo(id) {
  _periyodikKontrolKaydet(periyodikKontrolTumunuGetir().filter(k => k.id !== id));
}

function periyodikKontrolIdIleGetirRepo(id) {
  return periyodikKontrolTumunuGetir().find(k => k.id === id) || null;
}

function periyodikEkipmaninKontrolleriGetirRepo(ekipmanId) {
  return periyodikKontrolTumunuGetir().filter(k => k.ekipmanId === ekipmanId);
}
