// Acil durum senaryo şablonu depolama katmanı. modules/risk/sablon-repository.js
// ile aynı desen: tenantAnahtar KULLANILMAZ, sabit anahtarla firma-bağımsız
// saklanır ki bir kullanıcı bir firmada oluşturduğu şablonu başka bir
// firmasına geçtiğinde de görebilsin (bkz. model.js acilDurumSenaryoSablonuOlustur).

const ACIL_DURUM_SENARYO_SABLON_ANAHTARI = 'isg_acil_durum_senaryo_kutuphanesi';

function acilDurumSenaryoSablonlariTumunuGetir() {
  return oku(ACIL_DURUM_SENARYO_SABLON_ANAHTARI, []);
}

function acilDurumSenaryoSablonuEkleRepo(sablon) {
  const liste = acilDurumSenaryoSablonlariTumunuGetir();
  liste.push(sablon);
  yaz(ACIL_DURUM_SENARYO_SABLON_ANAHTARI, liste);
  return sablon;
}

function acilDurumSenaryoSablonuSilRepo(id) {
  yaz(ACIL_DURUM_SENARYO_SABLON_ANAHTARI, acilDurumSenaryoSablonlariTumunuGetir().filter(s => s.id !== id));
}
