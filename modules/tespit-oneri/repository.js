// Tespit ve Öneri Defteri depolama katmanı. Firma bazlı izole (tenantAnahtar).

function _tespitOneriAnahtari() {
  return tenantAnahtar('tespit_oneri_kayitlari');
}

function tespitOneriTumunuGetir() {
  return oku(_tespitOneriAnahtari(), []);
}

function _tespitOneriKaydet(liste) {
  yaz(_tespitOneriAnahtari(), liste);
}

function tespitOneriEkleRepo(kayit) {
  const liste = tespitOneriTumunuGetir();
  liste.push(kayit);
  _tespitOneriKaydet(liste);
  return kayit;
}

// Excel toplu içe aktarma gibi ÇOK SAYIDA kaydı TEK SEFERDE ekler.
// tespitOneriEkleRepo'yu satır satır (yüzlerce kez) çağırmak, her satırda
// TÜM listeyi yeniden Firestore'a yazan AYRI bir ağ isteği anlamına gelir;
// bu istekler sırayla gönderilse bile (bkz. core/data.js _bulutYaziSiraya)
// onlarca saniye sürebilir -- kullanıcı hepsi bitmeden sayfayı yenilerse
// (F5) henüz gönderilmemiş yazımlar hiç Firestore'a ulaşmaz. Kullanıcı
// raporu: "102 teknik müteahitlik tespit önerisi ekliyorum içe aktarla
// sayfayı yenilediğimde 18'e düşüyor". Tek bir okuma + tek bir yazımla bu
// riski tamamen ortadan kaldırır.
function tespitOneriTopluEkleRepo(yeniKayitlar) {
  const liste = tespitOneriTumunuGetir();
  yeniKayitlar.forEach(k => liste.push(k));
  _tespitOneriKaydet(liste);
  return yeniKayitlar;
}

function tespitOneriGuncelleRepo(id, veriler) {
  const liste = tespitOneriTumunuGetir();
  const index = liste.findIndex(k => k.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], veriler);
  _tespitOneriKaydet(liste);
  return liste[index];
}

function tespitOneriSilRepo(id) {
  _tespitOneriKaydet(tespitOneriTumunuGetir().filter(k => k.id !== id));
}

function tespitOneriIdIleGetirRepo(id) {
  return tespitOneriTumunuGetir().find(k => k.id === id) || null;
}
