// Olay/Kaza depolama katmanı. Firma bazlı izole (tenantAnahtar).

function _olayAnahtari() { return tenantAnahtar('olay_kaza_kayitlari'); }
function _ayarAnahtari() { return tenantAnahtar('olay_kaza_ayarlari'); }

function olayKayitlariTumunuGetir() {
  return oku(_olayAnahtari(), []);
}

function _olayKaydet(liste) {
  yaz(_olayAnahtari(), liste);
}

function olayKaydiEkleRepo(kayit) {
  const liste = olayKayitlariTumunuGetir();
  liste.push(kayit);
  _olayKaydet(liste);
  return kayit;
}

// Çok sayıda kaydı TEK bir bulut yazımıyla ekler (JSON içe aktarım için — bkz.
// uygunsuzluk/kurul modüllerindeki aynı desenin gerekçesi: art arda çok sayıda
// ayrı yaz() çağrısı ağ tamamlanma sırası yüzünden birbirinin üzerine yazıp
// veri kaybına yol açabiliyor).
function olayKayitlariTopluEkleRepo(kayitlar) {
  if (!kayitlar.length) return Promise.resolve({ basarili: true });
  const liste = olayKayitlariTumunuGetir();
  liste.push(...kayitlar);
  return yazVeSonucuGetir(_olayAnahtari(), liste);
}

function olayKaydiGuncelleRepo(id, veriler) {
  const liste = olayKayitlariTumunuGetir();
  const index = liste.findIndex(k => k.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], veriler);
  _olayKaydet(liste);
  return liste[index];
}

function olayKaydiSilRepo(id) {
  _olayKaydet(olayKayitlariTumunuGetir().filter(k => k.id !== id));
}

function olayKaydiIdIleGetirRepo(id) {
  return olayKayitlariTumunuGetir().find(k => k.id === id) || null;
}

function olayAyarlariGetirRepo() {
  return oku(_ayarAnahtari(), { yillikCalismaSaati: 200000 });
}

function olayAyarlariKaydetRepo(ayarlar) {
  yaz(_ayarAnahtari(), ayarlar);
  return ayarlar;
}
