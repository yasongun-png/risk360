// Eğitim kaydı depolama katmanı. Firma bazlı izole (tenantAnahtar).

function _egitimAnahtari() {
  return tenantAnahtar('egitim_kayitlari');
}

function egitimKayitlariTumunuGetir() {
  return oku(_egitimAnahtari(), []);
}

function _egitimKaydet(liste) {
  yaz(_egitimAnahtari(), liste);
}

function egitimKaydiEkleRepo(kayit) {
  const liste = egitimKayitlariTumunuGetir();
  liste.push(kayit);
  _egitimKaydet(liste);
  return kayit;
}

// Çok sayıda kaydı TEK bir bulut yazımıyla ekler (toplu içe aktarım için).
function egitimKayitlariTopluEkleRepo(kayitlar) {
  if (!kayitlar.length) return Promise.resolve({ basarili: true });
  const liste = egitimKayitlariTumunuGetir();
  liste.push(...kayitlar);
  return yazVeSonucuGetir(_egitimAnahtari(), liste);
}

function egitimKaydiGuncelleRepo(id, veriler) {
  const liste = egitimKayitlariTumunuGetir();
  const index = liste.findIndex(k => k.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], veriler);
  _egitimKaydet(liste);
  return liste[index];
}

function egitimKaydiSilRepo(id) {
  const liste = egitimKayitlariTumunuGetir();
  _egitimKaydet(liste.filter(k => k.id !== id));
}

function egitimKaydiIdIleGetirRepo(id) {
  return egitimKayitlariTumunuGetir().find(k => k.id === id) || null;
}
