// Personel verisinin kalıcı katmanı. Aktif firmaya göre otomatik izole edilir
// (bkz. core/auth.js -> tenantAnahtar). İleride Firebase'e geçildiğinde
// sadece bu dosyanın değişmesi yeterli olacak.

function _personelAnahtari() {
  return tenantAnahtar('personel');
}

function personelTumunuGetir() {
  return oku(_personelAnahtari(), []);
}

function _personelKaydet(liste) {
  yaz(_personelAnahtari(), liste);
}

function personelEkleRepo(personel) {
  const liste = personelTumunuGetir();
  liste.push(personel);
  _personelKaydet(liste);
  return personel;
}

// Çok sayıda kaydı TEK bir bulut yazımıyla ekler (toplu içe aktarım için —
// bkz. uygunsuzluk modülündeki aynı desenin gerekçesi: art arda çok sayıda
// ayrı yaz() çağrısı ağ tamamlanma sırası yüzünden birbirinin üzerine yazıp
// veri kaybına yol açabiliyor).
function personelTopluEkleRepo(personeller) {
  if (!personeller.length) return Promise.resolve({ basarili: true });
  const liste = personelTumunuGetir();
  liste.push(...personeller);
  return yazVeSonucuGetir(_personelAnahtari(), liste);
}

function personelGuncelleRepo(id, veriler) {
  const liste = personelTumunuGetir();
  const index = liste.findIndex(p => p.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], veriler);
  _personelKaydet(liste);
  return liste[index];
}

function personelSilRepo(id) {
  const liste = personelTumunuGetir();
  _personelKaydet(liste.filter(p => p.id !== id));
}

function personelIdIleGetirRepo(id) {
  return personelTumunuGetir().find(p => p.id === id) || null;
}
