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
    durum: veriler.durum || (veriler.gerceklesmeTarihi ? 'Tamamlandı' : 'Planlandı'),
    alarmVerilmeSuresi: (veriler.alarmVerilmeSuresi || '').trim(),
    ilkMudahaleSuresi: (veriler.ilkMudahaleSuresi || '').trim(),
    tahliyeSuresi: (veriler.tahliyeSuresi || '').trim(),
    toplanmaSuresi: (veriler.toplanmaSuresi || '').trim(),
    sayimSuresi: (veriler.sayimSuresi || '').trim(),
    eksikPersonelTespitSuresi: (veriler.eksikPersonelTespitSuresi || '').trim(),
    itfaiyeErisimSuresi: (veriler.itfaiyeErisimSuresi || '').trim(),
    haberlesmeSuresi: (veriler.haberlesmeSuresi || '').trim(),
    ekipUlasmaSuresi: (veriler.ekipUlasmaSuresi || '').trim()
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

// Seçilen şablon kartlarını gerçek senaryo kayıtlarına dönüştürür (kopyalar) —
// modules/risk/service.js riskSablonlardanEkle ile aynı "toplu ekle, başarısız
// olanları raporla" deseni. senaryoDogrula 'tetikleyici' alanını zorunlu
// kıldığından, şablonun olayinTanimi'i (yoksa başlığı) tetikleyici olarak kullanılır.
function acilDurumSenaryolariSablonlardanEkle(sablonIdleri) {
  const tumSablonlar = acilDurumSenaryoSablonlariGetir();
  const secilenler = (sablonIdleri || []).map(id => tumSablonlar.find(s => s.id === id)).filter(Boolean);
  const eklenenler = [];
  const hatalar = [];
  secilenler.forEach(sablon => {
    const sonuc = senaryoEkle({
      baslik: sablon.baslik,
      tur: sablon.tur,
      kategori: sablon.kategori,
      tetikleyici: sablon.olayinTanimi || sablon.baslik,
      olayinTanimi: sablon.olayinTanimi,
      muhtemelNedenler: sablon.muhtemelNedenler,
      ilkBelirtiTespit: sablon.ilkBelirtiTespit,
      tehlikeKaynaklari: sablon.tehlikeKaynaklari,
      etkilenecekAlanlar: sablon.etkilenecekAlanlar,
      etkiInsan: sablon.etkiInsan,
      etkiCevre: sablon.etkiCevre,
      etkiTesis: sablon.etkiTesis,
      ilk1Dk: sablon.ilk1Dk,
      ilk5Dk: sablon.ilk5Dk,
      ilk15Dk: sablon.ilk15Dk,
      alarmIhbarYontemi: sablon.alarmIhbarYontemi,
      tahliyeKarari: sablon.tahliyeKarari,
      toplanmaAlani: sablon.toplanmaAlani,
      guvenliDurdurmaNoktalari: sablon.guvenliDurdurmaNoktalari.slice(),
      kkd: sablon.kkd.slice(),
      mudahaleSiniri: sablon.mudahaleSiniri,
      disKurumBildirimi: sablon.disKurumBildirimi,
      sablonKaynagiId: sablon.id
    });
    if (sonuc.basarili) eklenenler.push(sonuc.senaryo);
    else hatalar.push(sablon.baslik);
  });
  return { basarili: true, eklenen: eklenenler.length, hatalar };
}

// ---- Ekip Tanımları ----

function ekipTanimlariGetir() {
  return ekipTanimlariTumunuGetir();
}

function ekipTanimiEkle(veriler) {
  const dogrulama = ekipTanimiDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };
  const yeni = ekipTanimiOlustur(veriler);
  ekipTanimiEkleRepo(yeni);
  return { basarili: true, ekipTanimi: yeni };
}

function ekipTanimiGuncelle(id, veriler) {
  const dogrulama = ekipTanimiDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };
  const mevcut = ekipTanimiIdIleGetirRepo(id) || {};
  const guncellenen = ekipTanimiGuncelleRepo(id, ekipTanimiOlustur(Object.assign({}, mevcut, veriler, { id: mevcut.id, olusturmaTarihi: mevcut.olusturmaTarihi })));
  return { basarili: true, ekipTanimi: guncellenen };
}

function ekipTanimiSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  ekipTanimiSilRepo(id);
  return { basarili: true };
}

// ---- Acil Durum Yönetim Yapısı ----

function komutaPozisyonlariGetir() {
  return komutaPozisyonlariTumunuGetir();
}

function komutaPozisyonuEkle(veriler) {
  const dogrulama = komutaPozisyonuDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };
  const yeni = komutaPozisyonuOlustur(veriler);
  komutaPozisyonuEkleRepo(yeni);
  return { basarili: true, pozisyon: yeni };
}

function komutaPozisyonuGuncelle(id, veriler) {
  const dogrulama = komutaPozisyonuDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };
  const mevcut = komutaPozisyonuIdIleGetirRepo(id) || {};
  const guncellenen = komutaPozisyonuGuncelleRepo(id, komutaPozisyonuOlustur(Object.assign({}, mevcut, veriler, { id: mevcut.id, olusturmaTarihi: mevcut.olusturmaTarihi })));
  return { basarili: true, pozisyon: guncellenen };
}

function komutaPozisyonuSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  // Alt pozisyonların üst referansı kopmasın diye önce onları köke (null) bağla.
  komutaPozisyonlariTumunuGetir().filter(p => p.ustPozisyonId === id).forEach(p => komutaPozisyonuGuncelleRepo(p.id, { ustPozisyonId: null }));
  komutaPozisyonuSilRepo(id);
  return { basarili: true };
}

// Madde 11'deki standart komuta ağacını (KOMUTA_POZISYON_SABLONU) tek
// tıkla oluşturur — hiç pozisyon yoksa çalışır, mevcut pozisyonlara dokunmaz.
function komutaYapisiStandartOlustur() {
  const mevcut = komutaPozisyonlariTumunuGetir();
  if (mevcut.length) return { basarili: false, hata: 'Acil durum yönetim yapısında zaten pozisyon var. Önce mevcutları silin veya manuel ekleyin.' };
  const adIdEslesmesi = {};
  KOMUTA_POZISYON_SABLONU.forEach(p => {
    const yeni = komutaPozisyonuOlustur({
      pozisyonAdi: p.pozisyonAdi,
      ustPozisyonId: p.ustPozisyonAdi ? adIdEslesmesi[p.ustPozisyonAdi] : null
    });
    komutaPozisyonuEkleRepo(yeni);
    adIdEslesmesi[p.pozisyonAdi] = yeni.id;
  });
  return { basarili: true, pozisyonlar: komutaPozisyonlariTumunuGetir() };
}

// ---- Tahliye Planları ----

function tahliyeAlanlariGetir() {
  return tahliyeAlanlariTumunuGetir();
}

function tahliyeAlaniEkle(veriler) {
  const dogrulama = tahliyeAlaniDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };
  const tahliyeNo = sonrakiNoUret('TP', tahliyeAlanlariTumunuGetir(), 'tahliyeNo');
  const yeni = tahliyeAlaniOlustur(Object.assign({}, veriler, { tahliyeNo }));
  tahliyeAlaniEkleRepo(yeni);
  return { basarili: true, tahliyeAlani: yeni };
}

function tahliyeAlaniGuncelle(id, veriler) {
  const dogrulama = tahliyeAlaniDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };
  const mevcut = tahliyeAlaniIdIleGetirRepo(id) || {};
  const birlesik = Object.assign({}, mevcut, veriler, { id: mevcut.id, tahliyeNo: mevcut.tahliyeNo, olusturmaTarihi: mevcut.olusturmaTarihi });
  const guncellenen = tahliyeAlaniGuncelleRepo(id, tahliyeAlaniOlustur(birlesik));
  return { basarili: true, tahliyeAlani: guncellenen };
}

// Harita köprüsünden gelen sadece-konum güncellemeleri için — diğer alanlara
// dokunmadan yazımın gerçekten bitmesini bekler (bkz. repository.js
// tahliyeAlaniGuncelleRepoVeBekle, modules/harita/ui.js HARITA_DIS_KAYNAKLAR.acilDurumTahliye).
function tahliyeAlaniKonumGuncelle(id, tesisId, x, y) {
  return tahliyeAlaniGuncelleRepoVeBekle(id, { haritaTesisId: tesisId, haritaX: x, haritaY: y });
}

function tahliyeAlaniSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  tahliyeAlaniSilRepo(id);
  return { basarili: true };
}

// ---- Kimyasal Ekleri ----

// kimyasalAdiOnbellek'i her okumada güncel kimyasal envanterinden tazeler —
// kimyasal kaydı adı değişmiş/silinmişse liste anlamsız kalmasın diye
// (bkz. model.js kimyasalEkiOlustur yorumu).
function _kimyasalEkiZenginlestir(ek) {
  const kimyasal = kimyasalTumunuGetir().find(k => k.id === ek.kimyasalId);
  return Object.assign({}, ek, { kimyasalAdiOnbellek: kimyasal ? kimyasal.ad : (ek.kimyasalAdiOnbellek || '(silinmiş kimyasal)'), kimyasalBulunamadi: !kimyasal });
}

function kimyasalEkleriGetir() {
  return kimyasalEkleriTumunuGetir().map(_kimyasalEkiZenginlestir);
}

function kimyasalEnvanteriSecenekleriGetir() {
  return kimyasalTumunuGetir();
}

function kimyasalEkiEkle(veriler) {
  const dogrulama = kimyasalEkiDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };
  const kimyasal = kimyasalTumunuGetir().find(k => k.id === veriler.kimyasalId);
  const yeni = kimyasalEkiOlustur(Object.assign({}, veriler, { kimyasalAdiOnbellek: kimyasal ? kimyasal.ad : '' }));
  kimyasalEkiEkleRepo(yeni);
  return { basarili: true, kimyasalEki: yeni };
}

function kimyasalEkiGuncelle(id, veriler) {
  const dogrulama = kimyasalEkiDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };
  const mevcut = kimyasalEkiIdIleGetirRepo(id) || {};
  const kimyasal = kimyasalTumunuGetir().find(k => k.id === veriler.kimyasalId);
  const birlesik = Object.assign({}, mevcut, veriler, { id: mevcut.id, olusturmaTarihi: mevcut.olusturmaTarihi, kimyasalAdiOnbellek: kimyasal ? kimyasal.ad : mevcut.kimyasalAdiOnbellek });
  const guncellenen = kimyasalEkiGuncelleRepo(id, kimyasalEkiOlustur(birlesik));
  return { basarili: true, kimyasalEki: guncellenen };
}

function kimyasalEkiSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  kimyasalEkiSilRepo(id);
  return { basarili: true };
}

// ---- Kroki Kontrolü ----

function krokiKontrolleriGetir() {
  return krokiKontrolleriTumunuGetir();
}

function krokiKontrolMaddesiEkle(veriler) {
  const dogrulama = krokiKontrolMaddesiDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };
  const yeni = krokiKontrolMaddesiOlustur(veriler);
  krokiKontrolMaddesiEkleRepo(yeni);
  return { basarili: true, madde: yeni };
}

function krokiKontrolMaddesiGuncelle(id, veriler) {
  const dogrulama = krokiKontrolMaddesiDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };
  const mevcut = krokiKontrolMaddesiIdIleGetirRepo(id) || {};
  const guncellenen = krokiKontrolMaddesiGuncelleRepo(id, krokiKontrolMaddesiOlustur(Object.assign({}, mevcut, veriler, { id: mevcut.id, olusturmaTarihi: mevcut.olusturmaTarihi })));
  return { basarili: true, madde: guncellenen };
}

function krokiKontrolMaddesiSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  krokiKontrolMaddesiSilRepo(id);
  return { basarili: true };
}

// ---- Dış Kurumlar ----

function disKurumlariGetir() {
  return disKurumlariTumunuGetir();
}

function disKurumEkle(veriler) {
  const dogrulama = disKurumDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };
  const yeni = disKurumOlustur(veriler);
  disKurumEkleRepo(yeni);
  return { basarili: true, disKurum: yeni };
}

function disKurumGuncelle(id, veriler) {
  const dogrulama = disKurumDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };
  const mevcut = disKurumIdIleGetirRepo(id) || {};
  const guncellenen = disKurumGuncelleRepo(id, disKurumOlustur(Object.assign({}, mevcut, veriler, { id: mevcut.id, olusturmaTarihi: mevcut.olusturmaTarihi })));
  return { basarili: true, disKurum: guncellenen };
}

function disKurumSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  disKurumSilRepo(id);
  return { basarili: true };
}

// ---- Öz Denetim ----

function ozDenetimGetirVeyaOlustur() {
  const mevcut = ozDenetimGetirRepo();
  if (mevcut) return ozDenetimOlustur(mevcut);
  const yeni = ozDenetimOlustur({});
  ozDenetimKaydetRepo(yeni);
  return yeni;
}

// Tek bir soruyu günceller (cevap + not), diğerlerine dokunmaz.
function ozDenetimCevabiGuncelle(soruId, cevap, not) {
  const mevcut = ozDenetimGetirVeyaOlustur();
  mevcut.cevaplar[soruId] = { cevap: cevap || '', not: (not || '').trim() };
  mevcut.guncellemeTarihi = new Date().toISOString();
  ozDenetimKaydetRepo(mevcut);
  return { basarili: true, ozDenetim: mevcut };
}

// ---- Eylem Planı ----

function eylemPlaniGetir() {
  return eylemPlaniTumunuGetir();
}

function eylemPlaniMaddesiEkle(veriler) {
  const dogrulama = eylemPlaniMaddesiDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };
  const eylemNo = sonrakiNoUret('EYL', eylemPlaniTumunuGetir(), 'eylemNo');
  const yeni = eylemPlaniMaddesiOlustur(Object.assign({}, veriler, { eylemNo }));
  eylemPlaniMaddesiEkleRepo(yeni);
  return { basarili: true, eylem: yeni };
}

function eylemPlaniMaddesiGuncelle(id, veriler) {
  const dogrulama = eylemPlaniMaddesiDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };
  const mevcut = eylemPlaniMaddesiIdIleGetirRepo(id) || {};
  const guncellenen = eylemPlaniMaddesiGuncelleRepo(id, eylemPlaniMaddesiOlustur(Object.assign({}, mevcut, veriler, { id: mevcut.id, eylemNo: mevcut.eylemNo, olusturmaTarihi: mevcut.olusturmaTarihi })));
  return { basarili: true, eylem: guncellenen };
}

function eylemPlaniMaddesiSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  eylemPlaniMaddesiSilRepo(id);
  return { basarili: true };
}

// Öz denetimde "Hayır"/"Kısmen" cevaplanan sorular için otomatik eylem
// maddesi oluşturur. Aynı soru için zaten açık bir eylem varsa (referans
// eşleşmesiyle) tekrar oluşturmaz — tekrar tıklansa bile kayıt çoğalmaz.
function ozDenetimindenEylemleriOlustur() {
  const ozDenetim = ozDenetimGetirVeyaOlustur();
  const mevcutEylemler = eylemPlaniTumunuGetir();
  let olusturulan = 0;
  ACIL_DURUM_OZ_DENETIM_SORULARI.forEach(soru => {
    const cevap = ozDenetim.cevaplar[soru.id];
    if (!cevap || (cevap.cevap !== 'Hayır' && cevap.cevap !== 'Kısmen')) return;
    const zatenVar = mevcutEylemler.some(e => e.kaynak === 'Öz Denetim' && e.referans === soru.id);
    if (zatenVar) return;
    const eylemNo = sonrakiNoUret('EYL', eylemPlaniTumunuGetir(), 'eylemNo');
    const yeni = eylemPlaniMaddesiOlustur({
      eylemNo,
      kaynak: 'Öz Denetim',
      referans: soru.id,
      eksiklik: soru.soru + (cevap.not ? ' — ' + cevap.not : ''),
      oncelik: cevap.cevap === 'Hayır' ? 'Yüksek' : 'Orta'
    });
    eylemPlaniMaddesiEkleRepo(yeni);
    olusturulan++;
  });
  return { basarili: true, olusturulan };
}

// ---- Mevzuat Uygunluk ----

// İlk açılışta standart referans seti otomatik yüklenir (bkz. model.js
// ACIL_DURUM_MEVZUAT_REFERANSLARI) — modules/risk/sablon-repository.js'teki
// hazır kütüphane deseninden farklı olarak burada firma bazlı (tenantAnahtar)
// bir kopyaya yazılır, çünkü her firma kendi "mevcut durum/uygunluk"
// değerlendirmesini bu kayıt üzerinde tutar.
function mevzuatUygunlukGetirVeyaOlustur() {
  let liste = mevzuatUygunlukTumunuGetir();
  if (!liste.length) {
    liste = ACIL_DURUM_MEVZUAT_REFERANSLARI.map(r => mevzuatUygunlukMaddesiOlustur(Object.assign({}, r, { standartMi: true })));
    mevzuatUygunlukListesiKaydetRepo(liste);
  }
  return liste;
}

function mevzuatUygunlukMaddesiEkle(veriler) {
  const dogrulama = mevzuatUygunlukMaddesiDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };
  const yeni = mevzuatUygunlukMaddesiOlustur(veriler);
  mevzuatUygunlukMaddesiEkleRepo(yeni);
  return { basarili: true, madde: yeni };
}

function mevzuatUygunlukMaddesiGuncelle(id, veriler) {
  const dogrulama = mevzuatUygunlukMaddesiDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };
  const mevcut = mevzuatUygunlukMaddesiIdIleGetirRepo(id) || {};
  const guncellenen = mevzuatUygunlukMaddesiGuncelleRepo(id, mevzuatUygunlukMaddesiOlustur(Object.assign({}, mevcut, veriler, { id: mevcut.id, standartMi: mevcut.standartMi, olusturmaTarihi: mevcut.olusturmaTarihi })));
  return { basarili: true, madde: guncellenen };
}

function mevzuatUygunlukMaddesiSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  mevzuatUygunlukMaddesiSilRepo(id);
  return { basarili: true };
}

// Öz denetimindenEylemleriOlustur ile aynı desen — mevzuat uygunluk
// listesinde "Uygun Değil"/"Kısmen Uygun" işaretlenen maddeler için eylem
// planına otomatik madde ekler, aynı maddeden zaten açık eylem varsa tekrar eklemez.
function mevzuatUygunlugundanEylemleriOlustur() {
  const liste = mevzuatUygunlukGetirVeyaOlustur();
  const mevcutEylemler = eylemPlaniTumunuGetir();
  let olusturulan = 0;
  liste.forEach(madde => {
    if (madde.uygunluk !== 'Uygun Değil' && madde.uygunluk !== 'Kısmen Uygun') return;
    const zatenVar = mevcutEylemler.some(e => e.kaynak === 'Mevzuat Uygunluk' && e.referans === madde.id);
    if (zatenVar) return;
    const eylemNo = sonrakiNoUret('EYL', eylemPlaniTumunuGetir(), 'eylemNo');
    const yeni = eylemPlaniMaddesiOlustur({
      eylemNo,
      kaynak: 'Mevzuat Uygunluk',
      referans: madde.id,
      eksiklik: madde.gereklilik + (madde.eksiklik ? ' — ' + madde.eksiklik : ''),
      risk: madde.mevzuatStandart,
      oncelik: madde.uygunluk === 'Uygun Değil' ? 'Yüksek' : 'Orta'
    });
    eylemPlaniMaddesiEkleRepo(yeni);
    olusturulan++;
  });
  return { basarili: true, olusturulan };
}

// ---- Doküman Kontrol / Revizyon Geçmişi ----

function revizyonleriGetir() {
  const plan = planGetirRepo() || bosPlanOlustur();
  return (plan.revizyonGecmisi || []).slice().sort((a, b) => (b.tarih || '').localeCompare(a.tarih || ''));
}

function revizyonEkle(veriler) {
  const dogrulama = revizyonKaydiDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };
  const plan = planGetirRepo() || bosPlanOlustur();
  const gecmis = plan.revizyonGecmisi || [];
  const revizyonNo = 'R' + String(gecmis.length + 1).padStart(2, '0');
  const yeni = revizyonKaydiOlustur(Object.assign({}, veriler, { revizyonNo }));
  plan.revizyonGecmisi = gecmis.concat([yeni]);
  planKaydetRepo(plan);
  return { basarili: true, revizyon: yeni };
}

function revizyonSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  const plan = planGetirRepo() || bosPlanOlustur();
  plan.revizyonGecmisi = (plan.revizyonGecmisi || []).filter(r => r.id !== id);
  planKaydetRepo(plan);
  return { basarili: true };
}

// ---- Belge Üretimi ----

// Word/PDF/PPTX çıktısının tamamının okuduğu tek "belge veri objesi" — salt
// okunur, modules/acil-durum/plan-cikti.js tarafından kullanılır. Firma
// başına tek plan objesi (bosPlanOlustur) ile çoklu-kayıt varlıkların
// (senaryolar, ekip tanımları vb.) tümü tek noktada toplanır ki çıktı
// dosyaları birbirinden bağımsız yeniden veri çekmesin.
function acilDurumBelgeVerisiTopla(firma) {
  return {
    firma,
    plan: planGetirVeyaOlustur(firma),
    tesisBilgi: tesisBilgiGetirVeyaOlustur(),
    senaryolar: senaryolariGetir(''),
    ekipTanimlari: ekipTanimlariGetir(),
    komutaPozisyonlari: komutaPozisyonlariGetir(),
    tahliyeAlanlari: tahliyeAlanlariGetir(),
    kimyasalEkleri: kimyasalEkleriGetir(),
    krokiKontrolleri: krokiKontrolleriGetir(),
    disKurumlar: disKurumlariGetir(),
    ozDenetim: ozDenetimGetirVeyaOlustur(),
    eylemPlani: eylemPlaniGetir(),
    mevzuatUygunluk: mevzuatUygunlukGetirVeyaOlustur(),
    revizyonGecmisi: revizyonleriGetir()
  };
}

// Öz denetim sorularından boş bırakılmış zorunlu alanları tarar — çıktının
// başında "Gerekli Bilgiler / Eksik Veriler" bölümü için kullanılır, denetime
// hazır olup olmadığını belge üretmeden önce görmek için.
function acilDurumEksikVerileriTespitEt(veri) {
  const eksikler = [];
  if (!veri.tesisBilgi.adres) eksikler.push('Tesis Bilgi Formu — Adres');
  if (!veri.tesisBilgi.tesisTurleri.length) eksikler.push('Tesis Bilgi Formu — Tesis Sınıflandırması');
  if (!veri.senaryolar.length) eksikler.push('Tehlike & Senaryo Kartları — hiç senaryo eklenmemiş');
  if (!veri.ekipTanimlari.length) eksikler.push('Ekip Tanımları — hiç ekip tanımı eklenmemiş');
  if (!veri.komutaPozisyonlari.length) eksikler.push('Acil Durum Yönetim Yapısı — hiç pozisyon eklenmemiş');
  if (!veri.tahliyeAlanlari.length) eksikler.push('Tahliye Planları — hiç tahliye planı eklenmemiş');
  if (!veri.disKurumlar.length) eksikler.push('Dış Kurumlar — hiç kayıt eklenmemiş');
  const ozDenetimBos = Object.values(veri.ozDenetim.cevaplar).every(c => !c.cevap);
  if (ozDenetimBos) eksikler.push('Öz Denetim — hiçbir soru cevaplanmamış');
  if (!veri.plan.hazirlayan || !veri.plan.onaylayan) eksikler.push('Doküman Kontrol — hazırlayan/onaylayan bilgisi eksik');
  return eksikler;
}
