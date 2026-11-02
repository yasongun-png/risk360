// Tek anahtar, nesne biçiminde: { gorevler: [], notlar: [] }. Bilerek dizi
// DEĞİL — core/data.js dizi anahtarlarına yeni kayıt eklenince firmadaki tüm
// kullanıcılara zil bildirimi düşürüyor; kişisel iş/notlar için istenmez.
function _planAnahtari() { return tenantAnahtar('planlayici'); }

// islenenKaynaklar: { kullaniciId: ['kaynakAnahtar', ...] } — otomatik eklenen
// işlerin (core/plana-ekle.js, ör. yüklenici geçici onay) kullanıcı silse de
// tekrar eklenmemesi için hatırlanır; burada yalnızca korunur.
function planVerisiGetir() {
  const v = oku(_planAnahtari(), null) || {};
  return {
    gorevler: Array.isArray(v.gorevler) ? v.gorevler : [], notlar: Array.isArray(v.notlar) ? v.notlar : [],
    islenenKaynaklar: v.islenenKaynaklar && typeof v.islenenKaynaklar === 'object' ? v.islenenKaynaklar : {}
  };
}

function planVerisiKaydet(veri) {
  yaz(_planAnahtari(), { gorevler: veri.gorevler, notlar: veri.notlar, islenenKaynaklar: veri.islenenKaynaklar || {} });
}
