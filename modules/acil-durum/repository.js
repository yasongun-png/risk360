// Acil Durum Yönetimi depolama katmanı. Firma bazlı izole (tenantAnahtar).

function _ekipAnahtari() { return tenantAnahtar('acil_durum_ekipleri'); }
function _ekipmanAnahtari() { return tenantAnahtar('acil_durum_ekipmanlari'); }
function _yanginTupuAnahtari() { return tenantAnahtar('acil_durum_yangin_tupleri'); }
function _tatbikatAnahtari() { return tenantAnahtar('acil_durum_tatbikatlari'); }
function _senaryoAnahtari() { return tenantAnahtar('acil_durum_senaryolari'); }
function _planAnahtari() { return tenantAnahtar('acil_durum_plani'); }
function _tesisBilgiAnahtari() { return tenantAnahtar('acil_durum_tesis_bilgi'); }
function _ekipTanimiAnahtari() { return tenantAnahtar('acil_durum_ekip_tanimlari'); }
function _komutaPozisyonuAnahtari() { return tenantAnahtar('acil_durum_komuta_pozisyonlari'); }

function _genelListeGetir(anahtarFn) { return oku(anahtarFn(), []); }
function _genelListeKaydet(anahtarFn, liste) { yaz(anahtarFn(), liste); }
function _genelEkle(anahtarFn, kayit) { const l = _genelListeGetir(anahtarFn); l.push(kayit); _genelListeKaydet(anahtarFn, l); return kayit; }
function _genelGuncelle(anahtarFn, id, veriler) {
  const l = _genelListeGetir(anahtarFn);
  const i = l.findIndex(x => x.id === id);
  if (i === -1) return null;
  l[i] = Object.assign({}, l[i], veriler);
  _genelListeKaydet(anahtarFn, l);
  return l[i];
}
function _genelSil(anahtarFn, id) { _genelListeKaydet(anahtarFn, _genelListeGetir(anahtarFn).filter(x => x.id !== id)); }
// _genelGuncelle'nin aksine Firestore yazımının GERÇEKTEN bitmesini bekler
// (bkz. modules/uygunsuzluk/repository.js uygunsuzlukGuncelleRepoVeBekle —
// harita köprüsündeki konumGuncelle'de sayfa değişmeden önce yazımın
// bitmesini garantilemek için kullanılır).
function _genelGuncelleVeBekle(anahtarFn, id, veriler) {
  const l = _genelListeGetir(anahtarFn);
  const i = l.findIndex(x => x.id === id);
  if (i === -1) return Promise.resolve(null);
  l[i] = Object.assign({}, l[i], veriler);
  return yazVeSonucuGetir(anahtarFn(), l).then(() => l[i]);
}

function ekipUyeleriTumunuGetir() { return _genelListeGetir(_ekipAnahtari); }
function ekipUyesiEkleRepo(k) { return _genelEkle(_ekipAnahtari, k); }
function ekipUyesiGuncelleRepo(id, v) { return _genelGuncelle(_ekipAnahtari, id, v); }
function ekipUyesiSilRepo(id) { _genelSil(_ekipAnahtari, id); }
function ekipUyesiIdIleGetirRepo(id) { return ekipUyeleriTumunuGetir().find(x => x.id === id) || null; }

function ekipmanlariTumunuGetir() { return _genelListeGetir(_ekipmanAnahtari); }
function ekipmanEkleRepo(k) { return _genelEkle(_ekipmanAnahtari, k); }
function ekipmanGuncelleRepo(id, v) { return _genelGuncelle(_ekipmanAnahtari, id, v); }
function ekipmanGuncelleRepoVeBekle(id, v) { return _genelGuncelleVeBekle(_ekipmanAnahtari, id, v); }
function ekipmanSilRepo(id) { _genelSil(_ekipmanAnahtari, id); }
function ekipmanIdIleGetirRepo(id) { return ekipmanlariTumunuGetir().find(x => x.id === id) || null; }

function yanginTupleriTumunuGetir() { return _genelListeGetir(_yanginTupuAnahtari); }
function yanginTupuEkleRepo(k) { return _genelEkle(_yanginTupuAnahtari, k); }
function yanginTupuGuncelleRepo(id, v) { return _genelGuncelle(_yanginTupuAnahtari, id, v); }
function yanginTupuGuncelleRepoVeBekle(id, v) { return _genelGuncelleVeBekle(_yanginTupuAnahtari, id, v); }
function yanginTupuSilRepo(id) { _genelSil(_yanginTupuAnahtari, id); }
function yanginTupuIdIleGetirRepo(id) { return yanginTupleriTumunuGetir().find(x => x.id === id) || null; }

function tatbikatlariTumunuGetir() { return _genelListeGetir(_tatbikatAnahtari); }
function tatbikatEkleRepo(k) { return _genelEkle(_tatbikatAnahtari, k); }
function tatbikatGuncelleRepo(id, v) { return _genelGuncelle(_tatbikatAnahtari, id, v); }
function tatbikatSilRepo(id) { _genelSil(_tatbikatAnahtari, id); }
function tatbikatIdIleGetirRepo(id) { return tatbikatlariTumunuGetir().find(x => x.id === id) || null; }

function senaryolariTumunuGetir() { return _genelListeGetir(_senaryoAnahtari); }
function senaryoEkleRepo(k) { return _genelEkle(_senaryoAnahtari, k); }
function senaryoGuncelleRepo(id, v) { return _genelGuncelle(_senaryoAnahtari, id, v); }
function senaryoSilRepo(id) { _genelSil(_senaryoAnahtari, id); }
function senaryoIdIleGetirRepo(id) { return senaryolariTumunuGetir().find(x => x.id === id) || null; }

function planGetirRepo() { return oku(_planAnahtari(), null); }
function planKaydetRepo(plan) { yaz(_planAnahtari(), plan); return plan; }

function tesisBilgiGetirRepo() { return oku(_tesisBilgiAnahtari(), null); }
function tesisBilgiKaydetRepo(tesisBilgi) { yaz(_tesisBilgiAnahtari(), tesisBilgi); return tesisBilgi; }

function ekipTanimlariTumunuGetir() { return _genelListeGetir(_ekipTanimiAnahtari); }
function ekipTanimiEkleRepo(k) { return _genelEkle(_ekipTanimiAnahtari, k); }
function ekipTanimiGuncelleRepo(id, v) { return _genelGuncelle(_ekipTanimiAnahtari, id, v); }
function ekipTanimiSilRepo(id) { _genelSil(_ekipTanimiAnahtari, id); }
function ekipTanimiIdIleGetirRepo(id) { return ekipTanimlariTumunuGetir().find(x => x.id === id) || null; }

function komutaPozisyonlariTumunuGetir() { return _genelListeGetir(_komutaPozisyonuAnahtari); }
function komutaPozisyonuEkleRepo(k) { return _genelEkle(_komutaPozisyonuAnahtari, k); }
function komutaPozisyonuGuncelleRepo(id, v) { return _genelGuncelle(_komutaPozisyonuAnahtari, id, v); }
function komutaPozisyonuSilRepo(id) { _genelSil(_komutaPozisyonuAnahtari, id); }
function komutaPozisyonuIdIleGetirRepo(id) { return komutaPozisyonlariTumunuGetir().find(x => x.id === id) || null; }
