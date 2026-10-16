// Tabela Yönetimi depolama katmanı. Firma bazlı izole (tenantAnahtar).

function _tabelaMevcutAnahtari() { return tenantAnahtar('tabela_mevcut'); }
function _tabelaIhtiyacAnahtari() { return tenantAnahtar('tabela_ihtiyac'); }
function _tabelaKatalogAnahtari() { return tenantAnahtar('tabela_katalog'); }

function _tabelaListeEkle(anahtar, kayit) {
  const liste = oku(anahtar, []);
  liste.push(kayit);
  yaz(anahtar, liste);
  return kayit;
}

function _tabelaListeGuncelle(anahtar, id, veriler) {
  const liste = oku(anahtar, []);
  const index = liste.findIndex(k => k.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], veriler);
  yaz(anahtar, liste);
  return liste[index];
}

function _tabelaListeSil(anahtar, id) {
  yaz(anahtar, oku(anahtar, []).filter(k => k.id !== id));
}

function tabelaMevcutTumunuGetir() { return oku(_tabelaMevcutAnahtari(), []); }
function tabelaMevcutEkleRepo(kayit) { return _tabelaListeEkle(_tabelaMevcutAnahtari(), kayit); }
function tabelaMevcutGuncelleRepo(id, veriler) { return _tabelaListeGuncelle(_tabelaMevcutAnahtari(), id, veriler); }
function tabelaMevcutSilRepo(id) { _tabelaListeSil(_tabelaMevcutAnahtari(), id); }
function tabelaMevcutIdIleGetirRepo(id) { return tabelaMevcutTumunuGetir().find(k => k.id === id) || null; }
function tabelaMevcutTopluKaydetRepo(liste) { yaz(_tabelaMevcutAnahtari(), liste); }

function tabelaIhtiyacTumunuGetir() { return oku(_tabelaIhtiyacAnahtari(), []); }
function tabelaIhtiyacEkleRepo(kayit) { return _tabelaListeEkle(_tabelaIhtiyacAnahtari(), kayit); }
function tabelaIhtiyacGuncelleRepo(id, veriler) { return _tabelaListeGuncelle(_tabelaIhtiyacAnahtari(), id, veriler); }
function tabelaIhtiyacSilRepo(id) { _tabelaListeSil(_tabelaIhtiyacAnahtari(), id); }
function tabelaIhtiyacIdIleGetirRepo(id) { return tabelaIhtiyacTumunuGetir().find(k => k.id === id) || null; }
function tabelaIhtiyacTopluKaydetRepo(liste) { yaz(_tabelaIhtiyacAnahtari(), liste); }

function tabelaKatalogTumunuGetir() { return oku(_tabelaKatalogAnahtari(), []); }
function tabelaKatalogEkleRepo(kayit) { return _tabelaListeEkle(_tabelaKatalogAnahtari(), kayit); }
function tabelaKatalogGuncelleRepo(id, veriler) { return _tabelaListeGuncelle(_tabelaKatalogAnahtari(), id, veriler); }
function tabelaKatalogSilRepo(id) { _tabelaListeSil(_tabelaKatalogAnahtari(), id); }
function tabelaKatalogIdIleGetirRepo(id) { return tabelaKatalogTumunuGetir().find(k => k.id === id) || null; }
function tabelaKatalogTopluKaydetRepo(liste) { yaz(_tabelaKatalogAnahtari(), liste); }
