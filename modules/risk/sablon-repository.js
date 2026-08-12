// Risk şablonu depolama katmanı. Diğer risk verilerinin aksine tenantAnahtar
// KULLANILMAZ: sabit 'isg_risk_sablonlari' anahtarı ile firma-bağımsız
// saklanır ki bir kullanıcı bir firmada oluşturduğu şablonu başka bir
// firmasına geçtiğinde de görebilsin (bkz. model.js riskSablonuOlustur).

const RISK_SABLON_ANAHTARI = 'isg_risk_sablonlari';

function riskSablonlariTumunuGetir() {
  return oku(RISK_SABLON_ANAHTARI, []);
}

function riskSablonEkleRepo(sablon) {
  const liste = riskSablonlariTumunuGetir();
  liste.push(sablon);
  yaz(RISK_SABLON_ANAHTARI, liste);
  return sablon;
}

function riskSablonSilRepo(id) {
  yaz(RISK_SABLON_ANAHTARI, riskSablonlariTumunuGetir().filter(s => s.id !== id));
}
