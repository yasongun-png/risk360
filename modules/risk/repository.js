// Risk kaydı depolama katmanı. Firma bazlı izole (tenantAnahtar).

function _riskAnahtari() {
  return tenantAnahtar('risk_kayitlari');
}

function riskTumunuGetir() {
  return oku(_riskAnahtari(), []);
}

function _riskKaydet(liste) {
  yaz(_riskAnahtari(), liste);
}

function riskEkleRepo(risk) {
  const liste = riskTumunuGetir();
  liste.push(risk);
  _riskKaydet(liste);
  return risk;
}

// Çok sayıda kaydı TEK bir bulut yazımıyla ekler (JSON içe aktarım için —
// bkz. uygunsuzluk/kurul modüllerindeki aynı desenin gerekçesi).
function riskKayitlariTopluEkleRepo(kayitlar) {
  if (!kayitlar.length) return Promise.resolve({ basarili: true });
  const liste = riskTumunuGetir();
  liste.push(...kayitlar);
  return yazVeSonucuGetir(_riskAnahtari(), liste);
}

function riskGuncelleRepo(id, veriler) {
  const liste = riskTumunuGetir();
  const index = liste.findIndex(r => r.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], veriler);
  _riskKaydet(liste);
  return liste[index];
}

// riskGuncelleRepo'nun aksine Firestore yazımının GERÇEKTEN bitmesini bekler
// (bkz. modules/uygunsuzluk/repository.js uygunsuzlukGuncelleRepoVeBekle —
// harita köprüsündeki konumGuncelle'de sayfa değişmeden önce yazımın
// bitmesini garantilemek için kullanılır).
function riskGuncelleRepoVeBekle(id, veriler) {
  const liste = riskTumunuGetir();
  const index = liste.findIndex(r => r.id === id);
  if (index === -1) return Promise.resolve(null);
  liste[index] = Object.assign({}, liste[index], veriler);
  return yazVeSonucuGetir(_riskAnahtari(), liste).then(() => liste[index]);
}

// Kullanıcı isteği: "bölümler arasında risk taşınabilsin" -- birden çok
// riski TEK bir bulut yazımıyla başka bir bölüme taşır (riskGuncelleRepo'yu
// seçili her risk için ayrı ayrı çağırmak, satır satır yazım yapan diğer
// toplu işlemlerdeki aynı veri kaybı riskini taşırdı, bkz.
// riskKayitlariTopluEkleRepo yorumu).
function riskBolumTopluGuncelleRepo(idler, yeniBolum) {
  const idSeti = new Set(idler);
  const liste = riskTumunuGetir();
  let sayac = 0;
  const yeniListe = liste.map(r => {
    if (!idSeti.has(r.id)) return r;
    sayac++;
    return Object.assign({}, r, { bolum: yeniBolum });
  });
  if (!sayac) return Promise.resolve({ basarili: true, sayac: 0 });
  return yazVeSonucuGetir(_riskAnahtari(), yeniListe).then(sonuc => Object.assign({}, sonuc, { sayac }));
}

function riskSilRepo(id) {
  _riskKaydet(riskTumunuGetir().filter(r => r.id !== id));
}

function riskIdIleGetirRepo(id) {
  return riskTumunuGetir().find(r => r.id === id) || null;
}

// ---- Bölüm listesi (henüz hiç risk kaydı olmayan bölümlerin de seçilebilir/
// silinebilir olması için ayrı, kalıcı bir liste — bkz. uygunsuzluk modülündeki
// Konu/Defter ile aynı desen). ----

function _bolumListesiAnahtari() {
  return tenantAnahtar('risk_bolumleri');
}

function bolumleriTumunuGetir() {
  return oku(_bolumListesiAnahtari(), []);
}

function _bolumListesiKaydet(liste) {
  yaz(_bolumListesiAnahtari(), liste);
}

function bolumEkleRepo(bolum) {
  const liste = bolumleriTumunuGetir();
  liste.push(bolum);
  _bolumListesiKaydet(liste);
  return bolum;
}

function bolumSilRepo(id) {
  _bolumListesiKaydet(bolumleriTumunuGetir().filter(b => b.id !== id));
}
