// Uygunsuzluk/DÖF depolama katmanı. Firma bazlı izole (tenantAnahtar).

function _uygunsuzlukAnahtari() {
  return tenantAnahtar('uygunsuzluk_kayitlari');
}

function uygunsuzlukTumunuGetir() {
  return oku(_uygunsuzlukAnahtari(), []);
}

function _uygunsuzlukKaydet(liste) {
  yaz(_uygunsuzlukAnahtari(), liste);
}

function uygunsuzlukEkleRepo(kayit) {
  const liste = uygunsuzlukTumunuGetir();
  liste.push(kayit);
  _uygunsuzlukKaydet(liste);
  return kayit;
}

// Çok sayıda kaydı TEK bir bulut yazımıyla ekler (ör. JSON toplu içe
// aktarım). uygunsuzlukEkleRepo()'nun aksine her kayıt için ayrı yaz()
// çağrısı yapmaz — art arda çok sayıda eşzamanlı bulut yazımı, ağ tamamlanma
// sırası yüzünden birbirinin üzerine yazıp veri kaybına yol açabiliyordu.
// Sonucu (gerçekten buluta yazıldı mı) bekleyen bir Promise döner.
function uygunsuzlukTopluEkleRepo(kayitlar) {
  if (!kayitlar.length) return Promise.resolve({ basarili: true });
  const liste = uygunsuzlukTumunuGetir();
  liste.push(...kayitlar);
  return yazVeSonucuGetir(_uygunsuzlukAnahtari(), liste);
}

function uygunsuzlukGuncelleRepo(id, veriler) {
  const liste = uygunsuzlukTumunuGetir();
  const index = liste.findIndex(k => k.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], veriler);
  _uygunsuzlukKaydet(liste);
  return liste[index];
}

function uygunsuzlukSilRepo(id) {
  _uygunsuzlukKaydet(uygunsuzlukTumunuGetir().filter(k => k.id !== id));
}

function uygunsuzlukIdIleGetirRepo(id) {
  return uygunsuzlukTumunuGetir().find(k => k.id === id) || null;
}

// ---- Uygunsuzluk Konusu / Defteri ----

function _uygunsuzlukKonuAnahtari() {
  return tenantAnahtar('uygunsuzluk_konulari');
}

function uygunsuzlukKonulariTumunuGetir() {
  return oku(_uygunsuzlukKonuAnahtari(), []);
}

function _uygunsuzlukKonulariKaydet(liste) {
  yaz(_uygunsuzlukKonuAnahtari(), liste);
}

function uygunsuzlukKonuEkleRepo(konu) {
  const liste = uygunsuzlukKonulariTumunuGetir();
  liste.push(konu);
  _uygunsuzlukKonulariKaydet(liste);
  return konu;
}

function uygunsuzlukKonuGuncelleRepo(id, veriler) {
  const liste = uygunsuzlukKonulariTumunuGetir();
  const index = liste.findIndex(k => k.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], veriler);
  _uygunsuzlukKonulariKaydet(liste);
  return liste[index];
}
