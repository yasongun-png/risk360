// Saha Dijital Haritası iş mantığı katmanı — repository + model.js'i sarar.
// Fotoğraf/tesis görseli depolama core/data.js'teki fotoYukle/fotoReferanslariCoz
// mekanizmasını kullanır (bkz. olay-kaza modülü) — ham base64'ü doğrudan
// tenant'ın tek "büyük-senkron" belgesine gömmek Firestore'un ~1MB belge
// sınırını hızla aşardı, bu yüzden her görsel kendi küçük fotoğraf belgesine
// ("fotoref:<id>") yazılır.

// ---- Tesisler ----

// Okunurken de normalize edilir — simgeBoyutu gibi sonradan eklenen
// alanlardan önce oluşturulmuş tesisler de güvenli varsayılanla döner.
function haritaTesisleriGetir() {
  return haritaTesisleriTumunuGetirRepo().map(haritaTesisiNormallestir);
}

function haritaTesisEkle(ad) {
  const tesis = haritaTesisiNormallestir({ ad });
  return haritaTesisEkleRepo(tesis);
}

function haritaTesisGorseliGuncelle(tesisId, gorselUrl) {
  return haritaTesisGuncelleRepo(tesisId, { gorselUrl, guncellemeTarihi: haritaSimdiIso() });
}

function haritaTesisSil(tesisId) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  haritaKayitlariTesisIcinTemizleRepo(tesisId);
  haritaEtiketleriTesisIcinTemizleRepo(tesisId);
  haritaOklariTesisIcinTemizleRepo(tesisId);
  haritaTesisSilRepo(tesisId);
}

// ---- Etiketler (bina/alan adı) ----

// Okunurken de normalize edilir: renk/yön/boyut alanlarından önce
// oluşturulmuş eski etiketler de güvenli varsayılanlarla döner.
function haritaEtiketleriGetir(tesisId) {
  return haritaEtiketleriTesisIleGetirRepo(tesisId).map(haritaEtiketiNormallestir);
}

function haritaEtiketEkle(veriler) {
  return haritaEtiketEkleRepo(haritaEtiketiNormallestir(veriler));
}

function haritaEtiketGuncelle(id, veriler) {
  return haritaEtiketGuncelleRepo(id, Object.assign({}, veriler, { guncellemeTarihi: haritaSimdiIso() }));
}

function haritaEtiketSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  haritaEtiketSilRepo(id);
}

// ---- Oklar (acil kaçış yönü) ----

// Okunurken de normalize edilir: bükülme özelliğinden önce (x1,y1,x2,y2)
// şeklinde kaydedilmiş eski oklar da bu sayede "noktalar" dizisine
// dönüştürülmüş olarak döner — ayrı bir veri taşıma betiği gerekmez.
function haritaOklariGetir(tesisId) {
  return haritaOklariTesisIleGetirRepo(tesisId).map(haritaOkuNormallestir);
}

function haritaOkEkle(veriler) {
  return haritaOkEkleRepo(haritaOkuNormallestir(veriler));
}

function haritaOkGuncelle(id, veriler) {
  return haritaOkGuncelleRepo(id, Object.assign({}, veriler, { guncellemeTarihi: haritaSimdiIso() }));
}

function haritaOkSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  haritaOkSilRepo(id);
}

function _haritaKatBolumHatirla(tesisId, kat, bolum) {
  const tesis = haritaTesisIdIleGetirRepo(tesisId);
  if (!tesis) return;
  let degisti = false;
  const katlar = tesis.katlar.slice();
  const bolumler = tesis.bolumler.slice();
  if (kat && !katlar.includes(kat)) { katlar.push(kat); degisti = true; }
  if (bolum && !bolumler.includes(bolum)) { bolumler.push(bolum); degisti = true; }
  if (degisti) haritaTesisGuncelleRepo(tesisId, { katlar, bolumler, guncellemeTarihi: haritaSimdiIso() });
}

// ---- Kayıtlar ----

function haritaKayitlariGetir(tesisId) {
  return haritaKayitlariTesisIleGetirRepo(tesisId);
}

function haritaKayitEkle(veriler) {
  const mevcutKayitlar = haritaKayitlariTesisIleGetirRepo(veriler.tesisId);
  const kayit = haritaKaydiNormallestir(veriler, { mevcutKayitlar });
  haritaKayitEkleRepo(kayit);
  _haritaKatBolumHatirla(kayit.tesisId, kayit.kat, kayit.bolum);
  return kayit;
}

function haritaKayitGuncelle(id, veriler) {
  const mevcut = haritaKayitIdIleGetirRepo(id);
  if (!mevcut) return null;
  const mevcutKayitlar = haritaKayitlariTesisIleGetirRepo(mevcut.tesisId);
  const kayit = haritaKaydiNormallestir(Object.assign({}, mevcut, veriler, { id, guncellemeTarihi: haritaSimdiIso() }), { mevcutKayitlar });
  haritaKayitGuncelleRepo(id, kayit);
  _haritaKatBolumHatirla(kayit.tesisId, kayit.kat, kayit.bolum);
  return kayit;
}

function haritaKayitSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  return haritaKayitGuncelleRepo(id, { silinmeTarihi: haritaSimdiIso() });
}

function haritaRiskiUygunsuzlugaCevir(riskId) {
  const risk = haritaKayitIdIleGetirRepo(riskId);
  if (!risk) return null;
  const taslak = haritaRiskUygunsuzlukTaslagi(risk);
  const mevcutKayitlar = haritaKayitlariTesisIleGetirRepo(risk.tesisId);
  const uygunsuzluk = haritaKaydiNormallestir(taslak, { mevcutKayitlar });
  uygunsuzluk.kaynakKayitId = risk.id;
  haritaKayitEkleRepo(uygunsuzluk);
  haritaKayitGuncelleRepo(riskId, { durum: 'Dönüştürüldü', bagliKayitId: uygunsuzluk.id, guncellemeTarihi: haritaSimdiIso() });
  return uygunsuzluk;
}

function haritaArizaIcinBakimGorevi(arizaId) {
  const ariza = haritaKayitIdIleGetirRepo(arizaId);
  if (!ariza) return null;
  const gorev = haritaArizayiBakimGoreviyleEslestir();
  haritaKayitGuncelleRepo(arizaId, {
    bagliKayitId: gorev.id,
    ek: Object.assign({}, ariza.ek, { bakimGoreviKodu: gorev.kod, bakimDurumu: 'Açık' }),
    durum: 'Bakımda',
    guncellemeTarihi: haritaSimdiIso()
  });
  return gorev;
}

function haritaBakimTamamlandi(arizaId) {
  const ariza = haritaKayitIdIleGetirRepo(arizaId);
  if (!ariza) return null;
  return haritaKayitGuncelleRepo(arizaId, {
    ek: Object.assign({}, ariza.ek, { bakimDurumu: 'Tamamlandı' }),
    durum: 'Kapalı',
    guncellemeTarihi: haritaSimdiIso()
  });
}

function haritaKontrolEkle(kayitId, sonuc, not, sonrakiKontrol) {
  const kayit = haritaKayitIdIleGetirRepo(kayitId);
  if (!kayit) return null;
  const bugun = new Date().toISOString().slice(0, 10);
  const kontrolGecmisi = kayit.kontrolGecmisi.concat([{ tarih: bugun, sonuc: sonuc || 'Uygun', not: not || '' }]);
  const ek = Object.assign({}, kayit.ek, { sonKontrol: bugun }, sonrakiKontrol ? { sonrakiKontrol } : {});
  const durum = /uygun de/i.test(sonuc || '') ? 'Arızalı' : kayit.durum;
  return haritaKayitGuncelleRepo(kayitId, { kontrolGecmisi, ek, durum, guncellemeTarihi: haritaSimdiIso() });
}
