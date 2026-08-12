// Acil Durum Yönetimi depolama katmanı. Firma bazlı izole (tenantAnahtar).

function _ekipAnahtari() { return tenantAnahtar('acil_durum_ekipleri'); }
function _ekipmanAnahtari() { return tenantAnahtar('acil_durum_ekipmanlari'); }
function _tatbikatAnahtari() { return tenantAnahtar('acil_durum_tatbikatlari'); }
function _senaryoAnahtari() { return tenantAnahtar('acil_durum_senaryolari'); }
function _planAnahtari() { return tenantAnahtar('acil_durum_plani'); }

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

function ekipUyeleriTumunuGetir() { return _genelListeGetir(_ekipAnahtari); }
function ekipUyesiEkleRepo(k) { return _genelEkle(_ekipAnahtari, k); }
function ekipUyesiGuncelleRepo(id, v) { return _genelGuncelle(_ekipAnahtari, id, v); }
function ekipUyesiSilRepo(id) { _genelSil(_ekipAnahtari, id); }
function ekipUyesiIdIleGetirRepo(id) { return ekipUyeleriTumunuGetir().find(x => x.id === id) || null; }

function ekipmanlariTumunuGetir() { return _genelListeGetir(_ekipmanAnahtari); }
function ekipmanEkleRepo(k) { return _genelEkle(_ekipmanAnahtari, k); }
function ekipmanGuncelleRepo(id, v) { return _genelGuncelle(_ekipmanAnahtari, id, v); }
function ekipmanSilRepo(id) { _genelSil(_ekipmanAnahtari, id); }
function ekipmanIdIleGetirRepo(id) { return ekipmanlariTumunuGetir().find(x => x.id === id) || null; }

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
