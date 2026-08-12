// Acil Durum Yönetimi iş kuralları.

// ---- Ekipler ----

function _ekipZenginlestir(uye) {
  return Object.assign({}, uye, {
    durumGoruntu: uye.gecerlilikTarihi ? durumTuret(uye.gecerlilikTarihi, uye.durum, ['İptal']) : uye.durum
  });
}

function ekipUyeleriniGetir(aramaMetni) {
  let liste = ekipUyeleriTumunuGetir().map(_ekipZenginlestir);
  if (!aramaMetni) return liste;
  const kucuk = aramaMetni.trim().toLowerCase();
  return liste.filter(u =>
    u.personelAdi.toLowerCase().includes(kucuk) ||
    u.bolum.toLowerCase().includes(kucuk) ||
    u.ekipTuru.toLowerCase().includes(kucuk)
  );
}

function ekipUyesiEkle(veriler) {
  const dogrulama = ekipUyesiDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const atamaNo = sonrakiNoUret('ACE', ekipUyeleriTumunuGetir(), 'atamaNo');
  const yeni = ekipUyesiOlustur(Object.assign({}, veriler, { atamaNo }));
  ekipUyesiEkleRepo(yeni);
  return { basarili: true, uye: yeni };
}

function ekipUyesiGuncelle(id, veriler) {
  const dogrulama = ekipUyesiDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const egitimTarihi = veriler.egitimTarihi || '';
  const gecerlilikTarihi = veriler.gecerlilikTarihi || (egitimTarihi ? gunEkle(egitimTarihi, 365) : '');
  const guncellenen = ekipUyesiGuncelleRepo(id, {
    personelId: veriler.personelId || '',
    personelAdi: veriler.personelAdi.trim(),
    bolum: (veriler.bolum || '').trim(),
    ekipTuru: veriler.ekipTuru,
    rol: veriler.rol || 'Ekip Üyesi',
    vardiya: veriler.vardiya || 'Genel',
    telefon: (veriler.telefon || '').trim(),
    egitimTarihi,
    gecerlilikTarihi,
    durum: veriler.durum || 'Aktif',
    notlar: (veriler.notlar || '').trim()
  });
  return { basarili: true, uye: guncellenen };
}

function ekipUyesiSil(id) {
  ekipUyesiSilRepo(id);
  return { basarili: true };
}

// ---- Uygunluk Değerlendirmesi ----

function uygunlukDegerlendirmesiHesapla(firma) {
  const tehlikeSinifi = (firma && firma.tehlikeSinifi) || 'Az Tehlikeli';
  const calisanSayisi = personelleriGetir('', false).length;
  const gereksinim = ekipGereksinimiHesapla(tehlikeSinifi, calisanSayisi);

  const aktifUyeler = ekipUyeleriTumunuGetir().filter(u => u.durum !== 'İptal');
  const atananSayilar = {};
  ['Söndürme', 'Kurtarma', 'Koruma', 'İlk Yardım'].forEach(tur => {
    atananSayilar[tur] = aktifUyeler.filter(u => u.ekipTuru === tur).length;
  });

  const genelDegerlendirme = ekipUygunlugunuDegerlendir(gereksinim, atananSayilar);
  const uyeListesi = aktifUyeler.map(u => ({ ekipTuru: u.ekipTuru, vardiya: u.vardiya, durum: u.durum }));
  const vardiyaDegerlendirme = vardiyaUygunlugunuDegerlendir(gereksinim, uyeListesi);

  const egitimiGecmisUyeler = ekipUyeleriniGetir('').filter(u => u.durumGoruntu === 'Gecikmiş');

  return { gereksinim, genelDegerlendirme, vardiyaDegerlendirme, egitimiGecmisUyeler };
}

// ---- Ekipman ----

function _ekipmanZenginlestir(ek) {
  return Object.assign({}, ek, { durumGoruntu: durumTuret(ek.sonrakiKontrol, ek.durum, ['İptal', 'Pasif']) });
}

function ekipmanlariGetir(aramaMetni) {
  let liste = ekipmanlariTumunuGetir().map(_ekipmanZenginlestir);
  if (!aramaMetni) return liste;
  const kucuk = aramaMetni.trim().toLowerCase();
  return liste.filter(e => e.ad.toLowerCase().includes(kucuk) || e.lokasyon.toLowerCase().includes(kucuk) || e.bolum.toLowerCase().includes(kucuk));
}

// Ekipman türüne göre farklı kayıt öneki — Yangın Tüpü'nün resmi kısaltması
// "YSC" (Yangın Söndürme Cihazı) ile gösterilsin diye (kullanıcı isteği),
// diğer tüm türler eskisi gibi genel "ADE" (Acil Durum Ekipmanı) önekini kullanır.
function _ekipmanOnekAl(tur) {
  if (tur === 'Yangın Tüpü') return 'YSC';
  return 'ADE';
}

function ekipmanEkle(veriler) {
  const dogrulama = ekipmanDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const ekipmanNo = sonrakiNoUret(_ekipmanOnekAl(veriler.tur), ekipmanlariTumunuGetir(), 'ekipmanNo');
  const yeni = ekipmanOlustur(Object.assign({}, veriler, { ekipmanNo }));
  ekipmanEkleRepo(yeni);
  return { basarili: true, ekipman: yeni };
}

function ekipmanGuncelle(id, veriler) {
  const dogrulama = ekipmanDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const periyotGun = Number(veriler.periyotGun || 30);
  const sonrakiKontrol = veriler.sonrakiKontrol || (veriler.sonKontrol ? gunEkle(veriler.sonKontrol, periyotGun) : '');
  const guncellenen = ekipmanGuncelleRepo(id, {
    tur: veriler.tur,
    ad: (veriler.ad || '').trim() || veriler.tur,
    bolum: (veriler.bolum || '').trim(),
    lokasyon: veriler.lokasyon.trim(),
    periyotGun,
    sonKontrol: veriler.sonKontrol || '',
    sonrakiKontrol,
    sorumlu: (veriler.sorumlu || '').trim(),
    durum: veriler.durum || 'Aktif',
    bulgular: (veriler.bulgular || '').trim(),
    notlar: (veriler.notlar || '').trim()
  });
  return { basarili: true, ekipman: guncellenen };
}

function ekipmanSil(id) {
  ekipmanSilRepo(id);
  return { basarili: true };
}

// ---- Tatbikatlar ----

function _tatbikatZenginlestir(t) {
  const durumGoruntu = t.gerceklesmeTarihi ? t.durum : durumTuret(t.planlananTarih, t.durum, ['Tamamlandı', 'İptal']);
  return Object.assign({}, t, { durumGoruntu });
}

function tatbikatlariGetir(aramaMetni) {
  let liste = tatbikatlariTumunuGetir().map(_tatbikatZenginlestir);
  if (!aramaMetni) return liste;
  const kucuk = aramaMetni.trim().toLowerCase();
  return liste.filter(t => t.baslik.toLowerCase().includes(kucuk) || t.lokasyon.toLowerCase().includes(kucuk));
}

function tatbikatEkle(veriler) {
  const dogrulama = tatbikatDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const tatbikatNo = sonrakiNoUret('TAT', tatbikatlariTumunuGetir(), 'tatbikatNo');
  const yeni = tatbikatOlustur(Object.assign({}, veriler, { tatbikatNo }));
  tatbikatEkleRepo(yeni);
  return { basarili: true, tatbikat: yeni };
}

function tatbikatGuncelle(id, veriler) {
  const dogrulama = tatbikatDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const guncellenen = tatbikatGuncelleRepo(id, {
    baslik: veriler.baslik.trim(),
    tur: veriler.tur,
    planlananTarih: veriler.planlananTarih,
    gerceklesmeTarihi: veriler.gerceklesmeTarihi || '',
    lokasyon: (veriler.lokasyon || '').trim(),
    katilimciSayisi: Number(veriler.katilimciSayisi || 0),
    bulgular: (veriler.bulgular || '').trim(),
    aksiyonlar: (veriler.aksiyonlar || '').trim(),
    durum: veriler.durum || (veriler.gerceklesmeTarihi ? 'Tamamlandı' : 'Planlandı')
  });
  return { basarili: true, tatbikat: guncellenen };
}

function tatbikatSil(id) {
  tatbikatSilRepo(id);
  return { basarili: true };
}

// ---- Senaryolar ----

function _senaryoZenginlestir(s) {
  return Object.assign({}, s, { durumGoruntu: durumTuret(s.gozdenGecirmeTarihi, s.durum, ['İptal']) });
}

function senaryolariGetir(aramaMetni) {
  let liste = senaryolariTumunuGetir().map(_senaryoZenginlestir);
  if (!aramaMetni) return liste;
  const kucuk = aramaMetni.trim().toLowerCase();
  return liste.filter(s => s.baslik.toLowerCase().includes(kucuk) || s.bolum.toLowerCase().includes(kucuk));
}

function senaryoEkle(veriler) {
  const dogrulama = senaryoDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const senaryoNo = sonrakiNoUret('SEN', senaryolariTumunuGetir(), 'senaryoNo');
  const yeni = senaryoOlustur(Object.assign({}, veriler, { senaryoNo }));
  senaryoEkleRepo(yeni);
  return { basarili: true, senaryo: yeni };
}

function senaryoGuncelle(id, veriler) {
  const dogrulama = senaryoDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const guncellenen = senaryoGuncelleRepo(id, {
    baslik: veriler.baslik.trim(),
    tur: veriler.tur,
    bolum: (veriler.bolum || '').trim(),
    lokasyon: (veriler.lokasyon || '').trim(),
    tetikleyici: veriler.tetikleyici.trim(),
    mudahaleAdimlari: katilimcilariAyir(veriler.mudahaleAdimlari),
    sorumluEkip: veriler.sorumluEkip,
    gozdenGecirmeTarihi: veriler.gozdenGecirmeTarihi || '',
    durum: veriler.durum || 'Aktif',
    notlar: (veriler.notlar || '').trim()
  });
  return { basarili: true, senaryo: guncellenen };
}

function senaryoSil(id) {
  senaryoSilRepo(id);
  return { basarili: true };
}

// ---- Acil Durum Planı ----

function planGetirVeyaOlustur(firma) {
  let plan = planGetirRepo();
  if (!plan) plan = bosPlanOlustur();

  const ekMerkezleri = ekipmanlariTumunuGetir().filter(e => e.tur === 'Toplanma Alanı').map(e => e.lokasyon).filter(Boolean);
  if (!plan.toplanmaYerleri.length && ekMerkezleri.length) plan.toplanmaYerleri = Array.from(new Set(ekMerkezleri));

  if (!plan.gecerlilikTarihi && firma) {
    const yenilemeYili = PLAN_YENILEME_YILI[firma.tehlikeSinifi] || 6;
    plan.gecerlilikTarihi = gunEkle(plan.hazirlanmaTarihi, yenilemeYili * 365);
  }

  planKaydetRepo(plan);
  return plan;
}

function planGuncelle(alan, deger) {
  const plan = planGetirRepo() || bosPlanOlustur();
  plan[alan] = deger;
  planKaydetRepo(plan);
  return plan;
}

function planGuncelleTumden(veriler) {
  const plan = Object.assign(bosPlanOlustur(), planGetirRepo() || {}, veriler);
  planKaydetRepo(plan);
  return plan;
}
