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
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
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
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  ekipmanSilRepo(id);
  return { basarili: true };
}

// ---- Yangın Tüpleri ----

function _yanginTupuZenginlestir(t) {
  const tarihler = [t.sonrakiYillikBakim, t.sonrakiHidrostatikTest].filter(Boolean);
  // En yakın (veya en gecikmiş) tarihe göre durum türetilir — iki ayrı süre
  // takip edildiği için (yıllık bakım + hidrostatik test), hangisi önce
  // gelirse görünür durumu o belirler.
  const enYakinTarih = tarihler.length
    ? tarihler.reduce((a, b) => (gunFarkiHesapla(a) <= gunFarkiHesapla(b) ? a : b))
    : '';
  return Object.assign({}, t, { durumGoruntu: durumTuret(enYakinTarih, t.durum, ['İptal', 'Pasif']) });
}

function yanginTupleriniGetir(aramaMetni) {
  let liste = yanginTupleriTumunuGetir().map(_yanginTupuZenginlestir);
  if (!aramaMetni) return liste;
  const kucuk = aramaMetni.trim().toLowerCase();
  return liste.filter(t =>
    t.tip.toLowerCase().includes(kucuk) ||
    t.lokasyon.toLowerCase().includes(kucuk) ||
    t.bolum.toLowerCase().includes(kucuk)
  );
}

function yanginTupuEkle(veriler) {
  const dogrulama = yanginTupuDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  // Sahadaki fiziksel tüp etiketleriyle aynı biçim: "YSC01", "YSC02"...
  const tupNo = yanginTupuSonrakiNoUret(yanginTupleriTumunuGetir());
  const yeni = yanginTupuOlustur(Object.assign({}, veriler, { tupNo }));
  yanginTupuEkleRepo(yeni);
  return { basarili: true, tup: yeni };
}

function yanginTupuGuncelle(id, veriler) {
  const dogrulama = yanginTupuDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const sonrakiYillikBakim = veriler.sonrakiYillikBakim || (veriler.yillikBakimTarihi ? gunEkle(veriler.yillikBakimTarihi, YANGIN_TUPU_YILLIK_BAKIM_GUN) : '');
  const sonrakiHidrostatikTest = veriler.sonrakiHidrostatikTest || (veriler.hidrostatikTestTarihi ? gunEkle(veriler.hidrostatikTestTarihi, YANGIN_TUPU_HIDROSTATIK_TEST_GUN) : '');
  const guncellenen = yanginTupuGuncelleRepo(id, {
    tip: veriler.tip,
    kapasite: (veriler.kapasite || '').trim(),
    bolum: (veriler.bolum || '').trim(),
    lokasyon: veriler.lokasyon.trim(),
    doluTarihi: veriler.doluTarihi || '',
    yillikBakimTarihi: veriler.yillikBakimTarihi || '',
    sonrakiYillikBakim,
    hidrostatikTestTarihi: veriler.hidrostatikTestTarihi || '',
    sonrakiHidrostatikTest,
    sorumlu: (veriler.sorumlu || '').trim(),
    durum: veriler.durum || 'Aktif',
    bulgular: (veriler.bulgular || '').trim(),
    notlar: (veriler.notlar || '').trim()
  });
  return { basarili: true, tup: guncellenen };
}

function yanginTupuSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  yanginTupuSilRepo(id);
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
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
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

  // Formun göndermediği (henüz Faz 2 UI'ı yazılmamış) genişletilmiş alanları
  // (senaryo kartı, risk matrisi, en kötü makul senaryo) KORUMAK için önce
  // mevcut kayıtla birleştirip sonra senaryoOlustur() ile aynı normalize/
  // varsayılan mantığından geçiriyoruz — aksi halde eski formla kaydetmek
  // hazır kütüphaneden eklenmiş zengin alanları sessizce sıfırlardı.
  const mevcut = senaryoIdIleGetirRepo(id) || {};
  const birlesik = Object.assign({}, mevcut, veriler, {
    id: mevcut.id,
    senaryoNo: mevcut.senaryoNo,
    olusturmaTarihi: mevcut.olusturmaTarihi,
    sablonKaynagiId: mevcut.sablonKaynagiId
  });
  const guncellenen = senaryoGuncelleRepo(id, senaryoOlustur(birlesik));
  return { basarili: true, senaryo: guncellenen };
}

function senaryoSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
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

function acilDurumPlanSablonlariniGetir() {
  return ACIL_DURUM_PLAN_SABLONLARI;
}

// Şablonun sadece serbest metin alanlarını (olasiAcilDurumlar/onleyiciTedbirler/
// tahliyePlani/uyariSistemleri/disKurumIletisim) mevcut planın üzerine yazar;
// tarih, hazırlayan/onaylayan, toplanma yerleri, özel risk bölgeleri ve notlar
// korunur (bkz. model.js ACIL_DURUM_PLAN_SABLONLARI).
function acilDurumPlanSablonUygula(sablonId) {
  const sablon = ACIL_DURUM_PLAN_SABLONLARI.find(s => s.id === sablonId);
  if (!sablon) return { basarili: false, hata: 'Şablon bulunamadı.' };
  const plan = planGuncelleTumden({
    olasiAcilDurumlar: sablon.olasiAcilDurumlar.slice(),
    onleyiciTedbirler: sablon.onleyiciTedbirler,
    tahliyePlani: sablon.tahliyePlani,
    uyariSistemleri: sablon.uyariSistemleri,
    disKurumIletisim: sablon.disKurumIletisim
  });
  return { basarili: true, plan };
}

// ---- Tesis Bilgi Formu ----

function tesisBilgiGetirVeyaOlustur() {
  const mevcut = tesisBilgiGetirRepo();
  if (mevcut) return mevcut;
  const yeni = bosTesisBilgiOlustur();
  tesisBilgiKaydetRepo(yeni);
  return yeni;
}

function tesisBilgiGuncelle(alan, deger) {
  const tesisBilgi = tesisBilgiGetirRepo() || bosTesisBilgiOlustur();
  tesisBilgi[alan] = deger;
  tesisBilgiKaydetRepo(tesisBilgi);
  return tesisBilgi;
}

function tesisBilgiGuncelleTumden(veriler) {
  const tesisBilgi = Object.assign(bosTesisBilgiOlustur(), tesisBilgiGetirRepo() || {}, veriler);
  tesisBilgiKaydetRepo(tesisBilgi);
  return tesisBilgi;
}

// ---- Hazır Acil Durum Senaryo Kütüphanesi ----

// modules/risk/service.js riskSablonlariGetir ile aynı desen: hazır kütüphane
// + oturumdaki kullanıcının kendi kaydettiği şablonlar (sahipId eşleşen)
// birleştirilip filtrelenir.
function acilDurumSenaryoSablonlariGetir(tesisTuruFiltresi, kategoriFiltresi) {
  const kullanici = oturumdakiKullanici();
  const kendi = kullanici
    ? acilDurumSenaryoSablonlariTumunuGetir().filter(s => s.kaynak === 'kullanici' && s.sahipId === kullanici.id)
    : [];
  let tumu = HAZIR_ACIL_DURUM_SENARYOLARI.concat(kendi);
  if (tesisTuruFiltresi) tumu = tumu.filter(s => s.tesisTuru === tesisTuruFiltresi);
  if (kategoriFiltresi) tumu = tumu.filter(s => s.kategori === kategoriFiltresi);
  return tumu;
}
