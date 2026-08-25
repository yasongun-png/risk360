// Hizmet Sözleşmeleri depolama katmanı. Firma bazlı izole (tenantAnahtar).

function _hizmetSozlesmesiAnahtari() {
  return tenantAnahtar('hizmet_sozlesmeleri');
}

// Kullanıcı isteği: "hiçbir modülde hiçbir yerde İSG Uzmanı olmasın ...
// İG uzmanı diyebiliriz" — görev türü etiketi "İSG Uzmanı"ndan "İG
// Uzmanı"na değiştirildi (bkz. model.js HIZMET_GOREV_TURLERI). Bu isim
// değişikliğinden önce kaydedilmiş eski kayıtlar hâlâ "İSG Uzmanı"
// değerini taşıyabildiğinden, TEK okuma noktasında (burada) otomatik
// normalize edilir — hem ekranda hem raporlarda eski kayıt de yeni adla
// görünür, Firestore'daki ham veriye dokunulmaz.
function hizmetSozlesmeleriTumunuGetir() {
  return oku(_hizmetSozlesmesiAnahtari(), []).map(k => k.gorevTuru === 'İSG Uzmanı' ? Object.assign({}, k, { gorevTuru: 'İG Uzmanı' }) : k);
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
