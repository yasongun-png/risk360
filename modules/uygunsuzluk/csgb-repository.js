// ÇSGB Denetimi depolama katmanı. Firma bazlı izole (tenantAnahtar); normal
// uygunsuzluk kayıtlarından ayrı anahtarlar.

function _csgbDenetimAnahtari() { return tenantAnahtar('uygunsuzluk_csgb_denetimleri'); }
function _csgbMaddeAnahtari() { return tenantAnahtar('uygunsuzluk_csgb_maddeleri'); }
function _csgbToplantiAnahtari() { return tenantAnahtar('uygunsuzluk_csgb_toplantilari'); }

function csgbDenetimleriTumunuGetir() { return oku(_csgbDenetimAnahtari(), []); }
function csgbMaddeleriTumunuGetir() { return oku(_csgbMaddeAnahtari(), []); }
function csgbToplantilariTumunuGetir() { return oku(_csgbToplantiAnahtari(), []); }

function _csgbListeyeKaydet(anahtar, liste, kayit) {
  const index = liste.findIndex(x => x.id === kayit.id);
  if (index === -1) liste.push(kayit); else liste[index] = kayit;
  yaz(anahtar, liste);
  return kayit;
}

function csgbDenetimKaydetRepo(denetim) { return _csgbListeyeKaydet(_csgbDenetimAnahtari(), csgbDenetimleriTumunuGetir(), denetim); }
function csgbMaddeKaydetRepo(madde) { return _csgbListeyeKaydet(_csgbMaddeAnahtari(), csgbMaddeleriTumunuGetir(), madde); }
function csgbToplantiKaydetRepo(toplanti) { return _csgbListeyeKaydet(_csgbToplantiAnahtari(), csgbToplantilariTumunuGetir(), toplanti); }

function csgbMaddeGetirRepo(id) { return csgbMaddeleriTumunuGetir().find(m => m.id === id) || null; }

// Madde listesinin tamamını TEK bulut yazımıyla yazar (Excel içe aktarımı,
// toplantıda çoklu durum güncellemesi) -- art arda çok sayıda yaz() çağrısı
// ağ sırası yüzünden birbirini ezebiliyordu (bkz. uygunsuzlukTopluEkleRepo).
function csgbMaddeleriYazRepo(liste) {
  return yazVeSonucuGetir(_csgbMaddeAnahtari(), liste);
}

function csgbMaddeSilRepo(id) {
  yaz(_csgbMaddeAnahtari(), csgbMaddeleriTumunuGetir().filter(m => m.id !== id));
}

function csgbToplantiSilRepo(id) {
  yaz(_csgbToplantiAnahtari(), csgbToplantilariTumunuGetir().filter(t => t.id !== id));
}

// Denetimi, maddelerini ve toplantılarını birlikte siler.
function csgbDenetimSilRepo(id) {
  yaz(_csgbDenetimAnahtari(), csgbDenetimleriTumunuGetir().filter(d => d.id !== id));
  const maddeler = csgbMaddeleriTumunuGetir();
  if (maddeler.some(m => m.denetimId === id)) yaz(_csgbMaddeAnahtari(), maddeler.filter(m => m.denetimId !== id));
  const toplantilar = csgbToplantilariTumunuGetir();
  if (toplantilar.some(t => t.denetimId === id)) yaz(_csgbToplantiAnahtari(), toplantilar.filter(t => t.denetimId !== id));
}
