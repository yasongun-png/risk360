// Tek anahtar, nesne biçiminde: { gorevler: [], notlar: [] }. Bilerek dizi
// DEĞİL — core/data.js dizi anahtarlarına yeni kayıt eklenince firmadaki tüm
// kullanıcılara zil bildirimi düşürüyor; kişisel iş/notlar için istenmez.
function _planAnahtari() { return tenantAnahtar('planlayici'); }

function planVerisiGetir() {
  const v = oku(_planAnahtari(), null) || {};
  return { gorevler: Array.isArray(v.gorevler) ? v.gorevler : [], notlar: Array.isArray(v.notlar) ? v.notlar : [] };
}

function planVerisiKaydet(veri) {
  yaz(_planAnahtari(), { gorevler: veri.gorevler, notlar: veri.notlar });
}
