// Yıllık plan/rapor depolama katmanı. Her mağaza yıla göre anahtarlanan bir
// nesnedir: { "2026": [...satırlar] } gibi. Firma bazlı izole (tenantAnahtar).

function _egitimPlaniAnahtari() { return tenantAnahtar('yillik_egitim_plani'); }
function _calismaPlaniAnahtari() { return tenantAnahtar('yillik_calisma_plani'); }
function _raporAnahtari() { return tenantAnahtar('yillik_degerlendirme_raporu'); }

function egitimPlaniYilGetir(yil) {
  return oku(_egitimPlaniAnahtari(), {})[yil] || [];
}

function egitimPlaniYilKaydet(yil, satirlar) {
  const tumu = oku(_egitimPlaniAnahtari(), {});
  tumu[yil] = satirlar;
  yaz(_egitimPlaniAnahtari(), tumu);
}

function calismaPlaniYilGetir(yil) {
  return oku(_calismaPlaniAnahtari(), {})[yil] || [];
}

function calismaPlaniYilKaydet(yil, satirlar) {
  const tumu = oku(_calismaPlaniAnahtari(), {});
  tumu[yil] = satirlar;
  yaz(_calismaPlaniAnahtari(), tumu);
}

function raporYilGetir(yil) {
  return oku(_raporAnahtari(), {})[yil] || null;
}

function raporYilKaydet(yil, rapor) {
  const tumu = oku(_raporAnahtari(), {});
  tumu[yil] = rapor;
  yaz(_raporAnahtari(), tumu);
}
