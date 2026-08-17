// Acil Durum Yönetimi veri modeli.
// Mevzuat dayanağı: İşyerlerinde Acil Durumlar Hakkında Yönetmelik (RG 18.06.2013/28681)
// Madde 11 (ekip sayıları), Madde 12 (plan asgari unsurları), Madde 13/2 (plan yenileme süresi);
// İlkyardım Yönetmeliği (RG 29.07.2015/29429) Madde 19 (ilkyardımcı sayısı).
// Bu hesaplamalar yönetmeliğin asgari hükümlerini yansıtır; nihai uygulama için güncel
// mevzuat ve resmi rehberler esas alınmalıdır.

const EKIP_TURLERI = ['Koordinasyon', 'Söndürme', 'Kurtarma', 'Koruma', 'İlk Yardım', 'Destek'];
const EKIP_ROLLERI = ['Acil Durum Sorumlusu', 'Acil Durum Koordinatörü', 'Ekip Başı', 'Ekip Üyesi', 'Gözetmen'];
const VARDIYALAR = ['A', 'B', 'C', 'D', 'G', '08-16', '16-24', '00-08', 'Genel'];

// "Yangın Tüpü" burada değil — kendi ayrı sekmesi/kayıt türü var (bkz. YANGIN_TUPU_TIPLERI, yanginTupuOlustur).
const EKIPMAN_TURLERI = ['Hidrant', 'Yangın Dolabı', 'Göz Duşu', 'Acil Duş', 'Kaçış Yolu', 'Toplanma Alanı', 'Alarm / Siren', 'Acil Aydınlatma', 'Döküntü Kiti', 'Diğer'];
const TATBIKAT_TURLERI = ['Yangın Tatbikatı', 'Tahliye Tatbikatı', 'Kimyasal Sızıntı', 'Amonyak Senaryosu', 'Asit Sızıntısı', 'Deprem', 'Kapalı Alan Kurtarma', 'Liman / İskele Acil Durumu', 'Diğer'];
const SENARYO_TURLERI = ['Yangın', 'Patlama', 'Kimyasal Yayılım', 'Amonyak Kaçağı', 'Asit Dökülmesi', 'Deprem', 'Kapalı Alan', 'Çevresel Olay', 'Diğer'];

const YANGIN_TUPU_TIPLERI = ['Kuru Kimyevi Toz (KKT)', 'CO2', 'Köpük', 'Su', 'Diğer'];
// TS 11748: yıllık bakım periyodu; basınçlı kap hidrostatik testi tipik olarak 4 yılda bir.
const YANGIN_TUPU_YILLIK_BAKIM_GUN = 365;
const YANGIN_TUPU_HIDROSTATIK_TEST_GUN = 1460;

// Md.11: Söndürme/Kurtarma/Koruma ekiplerinin her biri için tehlike sınıfına göre bu sayıya
// kadar her çalışan grubunda en az 1 destek elemanı.
const MUDAHALE_EKIP_ORANI = { 'Çok Tehlikeli': 30, 'Tehlikeli': 40, 'Az Tehlikeli': 50 };
// Md.19 (İlkyardım Yönetmeliği): İlkyardımcı sayısı oranı.
const ILKYARDIM_ORANI = { 'Çok Tehlikeli': 10, 'Tehlikeli': 15, 'Az Tehlikeli': 20 };
// Md.13/2: Acil durum planı yenileme süresi (yıl).
const PLAN_YENILEME_YILI = { 'Çok Tehlikeli': 2, 'Tehlikeli': 4, 'Az Tehlikeli': 6 };

function bugunIso() {
  return new Date().toISOString().slice(0, 10);
}

function gunEkle(tarihStr, gun) {
  const t = new Date((tarihStr || bugunIso()) + 'T00:00:00');
  t.setDate(t.getDate() + Number(gun || 0));
  // toISOString() UTC'ye çevirir; UTC+3'te yerel gece yarısı bir gün geri kayar.
  return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
}

function gunFarkiHesapla(tarihStr, referansStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tarihStr || '')) return null;
  const hedef = new Date(tarihStr + 'T00:00:00');
  const referans = new Date((referansStr || bugunIso()) + 'T00:00:00');
  return Math.ceil((hedef - referans) / 86400000);
}

// Tarihe göre durum türetir: süresi geçmişse Gecikmiş, 30 gün içindeyse Yaklaşıyor,
// aksi halde verilen temel durum korunur. Tamamlandı/İptal gibi "kapanmış" durumlar hiç değişmez.
function durumTuret(tarihStr, temelDurum, kapanmisDurumlar) {
  const kapanmis = kapanmisDurumlar || ['Tamamlandı', 'İptal'];
  if (kapanmis.includes(temelDurum)) return temelDurum;
  const fark = gunFarkiHesapla(tarihStr);
  if (fark === null) return temelDurum;
  if (fark < 0) return 'Gecikmiş';
  if (fark <= 30) return 'Yaklaşıyor';
  return temelDurum;
}

function sonrakiNoUret(onEk, mevcutListe, alanAdi) {
  let maks = 0;
  mevcutListe.forEach(item => {
    const m = String(item[alanAdi] || '').match(/(\d+)$/);
    if (m) maks = Math.max(maks, parseInt(m[1], 10));
  });
  // "YSC 1", "YSC 2" biçimi (kullanıcı isteği) — önek + boşluk + düz sayı,
  // sıfırla doldurma yok. Eski "ADE0005" gibi kayıtlar da aynı düzenli
  // ifadeyle (sondaki rakamlar) doğru okunduğu için numaralandırma bozulmaz.
  return onEk + ' ' + (maks + 1);
}

// Yangın tüpleri sahadaki fiziksel etiketlerle aynı biçimde numaralanır
// (kullanıcı isteği): "YSC01", "YSC02" — boşluksuz, 2 haneli sıfırla dolgu.
function yanginTupuSonrakiNoUret(mevcutListe) {
  let maks = 0;
  mevcutListe.forEach(item => {
    const m = String(item.tupNo || '').match(/(\d+)$/);
    if (m) maks = Math.max(maks, parseInt(m[1], 10));
  });
  return 'YSC' + String(maks + 1).padStart(2, '0');
}

// ---- Uygunluk Değerlendirmesi hesaplamaları (Md.11, Md.19) ----

function gerekliMudahaleEkibiSayisi(tehlikeSinifi, calisanSayisi) {
  const sayi = Math.max(0, Number(calisanSayisi || 0));
  if (sayi <= 0) return 0;
  // Md.11/5: 10'dan az çalışanı olan işyerlerinde ekiplerin tamamı için en az 1 kişi yeterlidir.
  if (sayi < 10) return 1;
  const oran = MUDAHALE_EKIP_ORANI[tehlikeSinifi] || MUDAHALE_EKIP_ORANI['Az Tehlikeli'];
  return Math.max(1, Math.ceil(sayi / oran));
}

function gerekliIlkyardimciSayisi(tehlikeSinifi, calisanSayisi) {
  const sayi = Math.max(0, Number(calisanSayisi || 0));
  if (sayi <= 0) return 0;
  const oran = ILKYARDIM_ORANI[tehlikeSinifi] || ILKYARDIM_ORANI['Az Tehlikeli'];
  return Math.max(1, Math.ceil(sayi / oran));
}

function ekipGereksinimiHesapla(tehlikeSinifi, calisanSayisi) {
  const mudahale = gerekliMudahaleEkibiSayisi(tehlikeSinifi, calisanSayisi);
  return {
    tehlikeSinifi,
    calisanSayisi: Math.max(0, Number(calisanSayisi || 0)),
    gereksinimler: {
      'Söndürme': mudahale,
      'Kurtarma': mudahale,
      'Koruma': mudahale,
      'İlk Yardım': gerekliIlkyardimciSayisi(tehlikeSinifi, calisanSayisi)
    },
    planYenilemeYili: PLAN_YENILEME_YILI[tehlikeSinifi] || PLAN_YENILEME_YILI['Az Tehlikeli']
  };
}

function ekipUygunlugunuDegerlendir(gereksinim, atananSayilar) {
  const turler = ['Söndürme', 'Kurtarma', 'Koruma', 'İlk Yardım'];
  const satirlar = turler.map(tur => {
    const gerekli = gereksinim.gereksinimler[tur] || 0;
    const atanan = atananSayilar[tur] || 0;
    const eksik = Math.max(0, gerekli - atanan);
    return { tur, gerekli, atanan, eksik, uygun: gerekli === 0 ? true : atanan >= gerekli };
  });
  return { satirlar, uygun: satirlar.every(s => s.uygun), toplamEksik: satirlar.reduce((t, s) => t + s.eksik, 0) };
}

// Toplam sayı yeterli olsa bile tüm ekip üyeleri tek vardiyada toplanmışsa diğer vardiyalarda
// müdahale kapasitesi sıfır olabilir; bu yüzden fiilen kullanılan her vardiya ayrıca kontrol edilir.
function vardiyaUygunlugunuDegerlendir(gereksinim, ekipUyeleri) {
  const turler = ['Söndürme', 'Kurtarma', 'Koruma', 'İlk Yardım'];
  const aktifUyeler = ekipUyeleri.filter(u => u.durum !== 'İptal');
  const kullanilanVardiyalar = Array.from(new Set(aktifUyeler.map(u => u.vardiya || 'Genel'))).filter(v => v !== 'Genel');

  if (kullanilanVardiyalar.length === 0) {
    return { gecerliMi: false, kullanilanVardiyalar: [], satirlar: [], uygun: true };
  }

  const satirlar = turler.map(tur => {
    const gerekli = gereksinim.gereksinimler[tur] || 0;
    const vardiyaDurumu = kullanilanVardiyalar.map(vardiya => {
      const atanan = aktifUyeler.filter(u => u.ekipTuru === tur && (u.vardiya || 'Genel') === vardiya).length;
      return { vardiya, atanan, uygun: gerekli === 0 ? true : atanan >= 1 };
    });
    return { tur, gerekli, vardiyaDurumu, uygun: gerekli === 0 ? true : vardiyaDurumu.every(v => v.uygun) };
  });

  return { gecerliMi: true, kullanilanVardiyalar, satirlar, uygun: satirlar.every(s => s.uygun) };
}

// ---- Kayıt fabrikaları ----

function ekipUyesiOlustur(veriler) {
  const egitimTarihi = veriler.egitimTarihi || '';
  const gecerlilikTarihi = veriler.gecerlilikTarihi || (egitimTarihi ? gunEkle(egitimTarihi, 365) : '');
  return {
    id: veriler.id || rastgeleId(),
    atamaNo: veriler.atamaNo || '',
    personelId: veriler.personelId || '',
    personelAdi: (veriler.personelAdi || '').trim(),
    bolum: (veriler.bolum || '').trim(),
    ekipTuru: veriler.ekipTuru || 'Destek',
    rol: veriler.rol || 'Ekip Üyesi',
    vardiya: veriler.vardiya || 'Genel',
    telefon: (veriler.telefon || '').trim(),
    egitimTarihi,
    gecerlilikTarihi,
    durum: veriler.durum || 'Aktif',
    notlar: (veriler.notlar || '').trim(),
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}

function ekipmanOlustur(veriler) {
  const periyotGun = Number(veriler.periyotGun || 30);
  const sonKontrol = veriler.sonKontrol || '';
  const sonrakiKontrol = veriler.sonrakiKontrol || (sonKontrol ? gunEkle(sonKontrol, periyotGun) : '');
  return {
    id: veriler.id || rastgeleId(),
    ekipmanNo: veriler.ekipmanNo || '',
    tur: veriler.tur || 'Diğer',
    ad: (veriler.ad || '').trim() || veriler.tur || 'Diğer',
    bolum: (veriler.bolum || '').trim(),
    lokasyon: (veriler.lokasyon || '').trim(),
    periyotGun,
    sonKontrol,
    sonrakiKontrol,
    sorumlu: (veriler.sorumlu || '').trim(),
    durum: veriler.durum || 'Aktif',
    bulgular: (veriler.bulgular || '').trim(),
    notlar: (veriler.notlar || '').trim(),
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString(),

    // Saha Dijital Haritası köprüsü — bkz. modules/harita.
    haritaTesisId: veriler.haritaTesisId || '',
    haritaX: veriler.haritaX !== undefined ? veriler.haritaX : '',
    haritaY: veriler.haritaY !== undefined ? veriler.haritaY : ''
  };
}

function yanginTupuOlustur(veriler) {
  const yillikBakimTarihi = veriler.yillikBakimTarihi || '';
  const hidrostatikTestTarihi = veriler.hidrostatikTestTarihi || '';
  const sonrakiYillikBakim = veriler.sonrakiYillikBakim || (yillikBakimTarihi ? gunEkle(yillikBakimTarihi, YANGIN_TUPU_YILLIK_BAKIM_GUN) : '');
  const sonrakiHidrostatikTest = veriler.sonrakiHidrostatikTest || (hidrostatikTestTarihi ? gunEkle(hidrostatikTestTarihi, YANGIN_TUPU_HIDROSTATIK_TEST_GUN) : '');
  return {
    id: veriler.id || rastgeleId(),
    tupNo: veriler.tupNo || '',
    tip: veriler.tip || 'Kuru Kimyevi Toz (KKT)',
    kapasite: (veriler.kapasite || '').trim(),
    bolum: (veriler.bolum || '').trim(),
    lokasyon: (veriler.lokasyon || '').trim(),
    doluTarihi: veriler.doluTarihi || '',
    yillikBakimTarihi,
    sonrakiYillikBakim,
    hidrostatikTestTarihi,
    sonrakiHidrostatikTest,
    sorumlu: (veriler.sorumlu || '').trim(),
    durum: veriler.durum || 'Aktif',
    bulgular: (veriler.bulgular || '').trim(),
    notlar: (veriler.notlar || '').trim(),
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString(),

    // Saha Dijital Haritası köprüsü — bkz. modules/harita.
    haritaTesisId: veriler.haritaTesisId || '',
    haritaX: veriler.haritaX !== undefined ? veriler.haritaX : '',
    haritaY: veriler.haritaY !== undefined ? veriler.haritaY : ''
  };
}

function tatbikatOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    tatbikatNo: veriler.tatbikatNo || '',
    baslik: (veriler.baslik || '').trim(),
    tur: veriler.tur || 'Diğer',
    planlananTarih: veriler.planlananTarih || '',
    gerceklesmeTarihi: veriler.gerceklesmeTarihi || '',
    lokasyon: (veriler.lokasyon || '').trim(),
    katilimciSayisi: Number(veriler.katilimciSayisi || 0),
    bulgular: (veriler.bulgular || '').trim(),
    aksiyonlar: (veriler.aksiyonlar || '').trim(),
    durum: veriler.durum || (veriler.gerceklesmeTarihi ? 'Tamamlandı' : 'Planlandı'),
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}

function senaryoOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    senaryoNo: veriler.senaryoNo || '',
    baslik: (veriler.baslik || '').trim(),
    tur: veriler.tur || 'Diğer',
    bolum: (veriler.bolum || '').trim(),
    lokasyon: (veriler.lokasyon || '').trim(),
    tetikleyici: (veriler.tetikleyici || '').trim(),
    mudahaleAdimlari: Array.isArray(veriler.mudahaleAdimlari) ? veriler.mudahaleAdimlari : katilimcilariAyir(veriler.mudahaleAdimlari),
    sorumluEkip: veriler.sorumluEkip || 'Koordinasyon',
    gozdenGecirmeTarihi: veriler.gozdenGecirmeTarihi || '',
    durum: veriler.durum || 'Aktif',
    notlar: (veriler.notlar || '').trim(),
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}

function katilimcilariAyir(metin) {
  return String(metin || '').split(/[;,\n]+/).map(k => k.trim()).filter(Boolean);
}

function bosPlanOlustur() {
  return {
    hazirlanmaTarihi: bugunIso(),
    gecerlilikTarihi: '',
    hazirlayan: '', hazirlayanUnvan: '',
    onaylayan: '', onaylayanUnvan: '',
    olasiAcilDurumlar: [],
    onleyiciTedbirler: '',
    tahliyePlani: '',
    toplanmaYerleri: [],
    disKurumIletisim: '',
    uyariSistemleri: '',
    ozelRiskBolgeleri: [],
    notlar: ''
  };
}

// ---- Hazır Acil Durum Planı Şablonları ----

// İşyeri türüne göre başlangıç içeriği: seçilen şablon yalnızca "Olası Acil
// Durumlar", "Önleyici Tedbirler", "Tahliye Planı", "Uyarı Sistemleri" ve
// "Dış Kurum İletişim Bilgileri" alanlarını doldurur (bkz. service.js
// acilDurumPlanSablonUygula). Tarih, hazırlayan/onaylayan, toplanma yerleri
// (zaten ekipman verisinden türetiliyor), özel risk bölgeleri ve notlar
// işyerine özgü olduğundan şablondan etkilenmez. Metinler başlangıç
// önerisidir; işyerine göre düzenlenmelidir.
// Tüm şablonların tahliye planına eklenen, ekip yapısına (EKIP_TURLERI) bağlı
// ortak "ekip görevleri" ve tatbikat notu — sektöre özgü değildir, bu yüzden
// tek yerden tanımlanıp her şablonun sonuna eklenir.
const _EKIP_GOREVLERI_METNI = '\n\nEKİPLERİN GÖREVLERİ:\n- Koordinasyon Ekibi: Acil durumu yönetir, dış kurumlarla (itfaiye, ambulans, AFAD) irtibatı sağlar, tahliye kararını verir ve tüm ekiplerden gelen bilgiyi birleştirerek yönlendirme yapar.\n- Söndürme Ekibi: İlk müdahale söndürme ekipmanlarını (yangın tüpü/dolabı) kullanarak yangını büyümeden kontrol altına almaya çalışır; büyüyen yangında itfaiye gelene kadar alanı gözlemler ve bilgi aktarır.\n- Kurtarma Ekibi: Mahsur kalan/yaralı personelin güvenli şekilde tahliyesinden sorumludur; eğitimsiz personelin tehlikeli alana girmesini engeller.\n- Koruma Ekibi: Tesis/ekipman güvenliğini, kritik sistemlerin (enerji, gaz, su) kapatılmasını ve tahliye edilen alanın kontrolsüz girişe kapatılmasını sağlar.\n- İlk Yardım Ekibi: Yaralılara ilk müdahaleyi yapar, ambulans gelene kadar durumu stabilize etmeye çalışır, toplanma alanında sağlık noktası kurar.\n- Destek Ekibi: Personel sayımı, iletişim, kayıt tutma ve diğer ekiplerin ihtiyaç duyduğu lojistik desteği sağlar.\n\nTATBİKAT VE GÖZDEN GEÇİRME: Bu plan yılda en az bir kez tatbikatla test edilir; tatbikat sonrası bulgular tutanağa geçirilir ve gerekiyorsa plan revize edilir. Yaşanan her gerçek olay da planın etkinliğinin gözden geçirilmesi için ayrıca değerlendirilir.';

const ACIL_DURUM_PLAN_SABLONLARI = [
  {
    id: 'ofis',
    ad: 'Ofis / İdari Bina',
    aciklama: 'Üretim/saha alanı olmayan büro, çağrı merkezi, idari bina vb.',
    olasiAcilDurumlar: [
      'Yangın (elektrik kontağı, mutfak/çay ocağı)',
      'Deprem',
      'Gaz sızıntısı (mutfak/kombi dairesi)',
      'Elektrik kesintisi',
      'Su baskını (sıhhi tesisat arızası, çatı sızıntısı)',
      'Asansörde mahsur kalma',
      'Bina tahliyesini gerektiren dış tehdit (bomba ihbarı, şüpheli paket)',
      'Yangın merdiveni/kaçış yolunun tıkanması',
      'Bina dışındaki bir olayın (yangın, patlama) binayı etkilemesi',
      'Ani sağlık sorunu (kalp krizi, bayılma, düşme)'
    ],
    onleyiciTedbirler: 'YANGIN ÖNLEME:\n- Duman dedektörü, yangın alarm butonu ve yangın söndürme tüplerinin periyodik bakım/kontrolü aksatılmadan yaptırılır, kontrol etiketleri güncel tutulur.\n- Elektrik pano ve tesisatının periyodik topraklama/kaçak akım kontrolleri yaptırılır; çoklu priz/uzatma kablosu kullanımı sınırlandırılır.\n- Mutfak/çay ocağında gaz kaçağı algılama sensörü bulunur, kombi dairesi yılda bir kez yetkili serviste bakımdan geçirilir.\n- Sigara içme yalnızca belirlenmiş açık alanlarda, sönmüş izmarit için metal kül tablasıyla yapılır.\n\nKAÇIŞ YOLLARI VE ERİŞİM:\n- Kaçış yolları, merdivenler ve acil çıkış kapıları hiçbir zaman malzeme/kutu ile kapatılmaz; aylık kontrol formuyla denetlenir.\n- Acil çıkış kapıları içeriden kilitlenmez, panik barlı açılım sağlanır; yönlendirme ve acil aydınlatma armatürleri çalışır durumda tutulur.\n\nDEPREM VE YAPISAL GÜVENLİK:\n- Dolap, raf ve ağır ekipmanlar devrilmeyi önleyecek şekilde duvara sabitlenir.\n- Deprem çantası (su, ilk yardım malzemesi, düdük, fener) bulundurulur; masa altı güvenli alan bilgilendirmesi tüm katlarda asılı tutulur.\n\nDİĞER:\n- Asansör bakım sözleşmesiyle periyodik kontrolden geçirilir, arıza/mahsur kalma durumunda acil çağrı butonu düzenli test edilir.\n- Şüpheli paket/kişi bildirimi için resepsiyon/güvenlik personeli görevlendirilir, süreç tüm personele duyurulur.\n\nTEHLİKEYE ÖZEL ÖNLEMLER:\n\nYangın: Yangın söndürme tüpleri her katta görünür ve erişilebilir yerde bulundurulur; personel A/B/C sınıfı yangınlarda hangi söndürücünün kullanılacağı konusunda bilgilendirilir.\n\nDeprem: "Çök-Kapan-Tutun" tatbikatları düzenli yapılır, cam kenarlarından ve raflardan uzak durulması gerektiği personele hatırlatılır.\n\nGaz Sızıntısı: Gaz kokusu alındığında elektrik anahtarına/prize dokunulmaz, ortam havalandırılır ve derhal bina dışına çıkılıp doğalgaz acil hattı aranır.\n\nAsansörde Mahsur Kalma: Personel asansör kabinindeki acil çağrı butonunu kullanır, sakin kalır; müdahale ekibi asansör bakım firmasını arar.\n\nDış Tehdit (Bomba İhbarı/Şüpheli Paket): Şüpheli cisme dokunulmaz, alan boşaltılıp derhal güvenlik/polise bilgi verilir.',
    tahliyePlani: '1) ALARM VE İLK MÜDAHALE: Alarmın duyulması veya anonsun yapılmasıyla birlikte tüm personel çalışmayı bırakır, mümkünse elektrikli cihazları güvenli şekilde kapatır. Olayı fark eden ilk kişi, güvenliyse yangın alarm butonuna basar ve Söndürme Ekibine haber verir.\n\n2) TAHLİYE: Personel panik yapmadan, koşmadan, en yakın acil çıkışa yönlendirilir. Asansör KESİNLİKLE kullanılmaz; merdivenler tek sıra ve sağdan yürünerek kullanılır. Hareket kısıtlı çalışanlar için önceden görevlendirilmiş refakatçi personel devreye girer.\n\n3) TOPLANMA VE SAYIM: Kat sorumluları kendi katlarındaki personeli sayarak toplanma alanına yönlendirir, kimsenin kalmadığını (tuvalet, toplantı odası dahil) kontrol eder. Toplanma alanında personel sayımı tamamlanıp Acil Durum Koordinatörüne bildirilir.\n\n4) ARAMA VE ÖZEL DURUMLAR: Eksik personel varsa son bilinen konumuyla birlikte durum derhal itfaiyeye/arama-kurtarma ekibine bildirilir; eğitimsiz personel hiçbir koşulda bina içine geri girmez.\n\n5) DEĞERLENDİRME VE YENİDEN GİRİŞ: Yetkili makamlar (itfaiye/bina yönetimi) binanın güvenli olduğunu onaylamadan personel binaya geri alınmaz. Acil Durum Koordinatörü olay sonrası kısa bir değerlendirme yapar ve gerekiyorsa planı günceller.' + _EKIP_GOREVLERI_METNI,
    uyariSistemleri: 'Sesli/ışıklı yangın alarm sistemi, kat anons sistemi, kat sorumluları tarafından sözlü uyarı, toplu bilgilendirme (SMS/mesajlaşma grubu), resepsiyon/güvenlikten dahili telefon duyurusu.',
    disKurumIletisim: 'Acil Çağrı Merkezi (İtfaiye / Ambulans / Polis / Jandarma): 112\nAFAD: 122\nDoğalgaz Acil: 187\n[En yakın hastane adı ve telefonu]\n[Bina yönetimi / güvenlik telefonu]'
  },
  {
    id: 'uretim',
    ad: 'Üretim / Fabrika (Genel)',
    aciklama: 'Makine/ekipman kullanılan imalat, montaj veya işleme tesisi.',
    olasiAcilDurumlar: [
      'Yangın (makine/motor kaynaklı, kısa devre, kaynak-kesme işleri)',
      'Patlama (basınçlı kap, tozlu/gaz ortam)',
      'Ağır iş kazası (makineye sıkışma, ezilme, kesilme)',
      'Kimyasal madde dökülmesi/sızıntısı',
      'Elektrik çarpması',
      'Vinç/kaldırma ekipmanı arızası veya yük düşmesi',
      'Deprem',
      'Basınçlı hava/buhar hattı patlaması',
      'Yanıcı toz birikimi kaynaklı patlama',
      'Kapalı üretim alanında zehirli/boğucu gaz birikimi'
    ],
    onleyiciTedbirler: 'MAKİNE VE EKİPMAN GÜVENLİĞİ:\n- Makine koruyucuları ve acil durdurma butonları çalışır durumda tutulur, periyodik kontrolden geçirilir.\n- Bakım/onarım öncesi enerji kesme ve kilitleme-etiketleme (LOTO) prosedürü uygulanır.\n\nYANGIN VE PATLAMA ÖNLEME:\n- Kaynak/kesme işleri, parlayıcı-patlayıcı madde bulunan bölgelerden uzakta, yangın gözcüsü ve iş izni sistemiyle yapılır.\n- Tozlu/parlayıcı ortamlarda lokal egzoz, topraklama ve statik elektrik önlemleri uygulanır.\n- Üretim hatlarına yakın yerlerde yangın dolabı/tüpü ve göz duşu bulundurulur, erişim yolları açık tutulur.\n\nELEKTRİK GÜVENLİĞİ:\n- Elektrik pano ve tesisatının periyodik bakım/termal kamera kontrolleri yapılır, ısınma bulguları anında raporlanır.\n\nKALDIRMA EKİPMANLARI:\n- Vinç, forklift gibi kaldırma ekipmanları yıllık periyodik kontrole tabi tutulur, günlük kontrol formuyla operatör tarafından denetlenir.\n- Yük altında/yakınında durulmaz, azami yük kapasitesi asla aşılmaz.\n\nİŞ ORGANİZASYONU:\n- Yeni/geçici personel işe başlamadan önce bölüm bazlı acil durum bilgilendirmesi alır.\n\nTEHLİKEYE ÖZEL ÖNLEMLER:\n\nYangın: Kaynak/kesme işlemi anında durdurulur, en yakın yangın dolabı/tüpü kullanılır; büyüyen yangında bölge tahliye edilip kapılar kapatılarak yayılım geciktirilir.\n\nPatlama: Duyulan anda personel makine/hatlardan uzaklaşıp yere yakın, kolon/duvar diplerine sığınır; ikinci bir patlama ihtimaline karşı bölgeye geri dönülmez.\n\nAğır İş Kazası (Sıkışma/Ezilme): Makine derhal acil durdurma butonuyla durdurulur, yaralı hareket ettirilmeden İlk Yardım ekibi ve ambulans çağrılır.\n\nKimyasal Dökülme: Etkilenen alan işaretlenip izole edilir, GBF\'de belirtilen müdahale talimatı uygulanır, gerekmedikçe temizlik girişiminde bulunulmaz.\n\nElektrik Çarpması: Kazazedeye dokunmadan önce enerji kesilir; enerji kesilemiyorsa yalıtkan bir cisimle müdahale edilir.',
    tahliyePlani: '1) ALARM VE İLK MÜDAHALE: Alarm/siren çalınca üretim hattı güvenli şekilde durdurulur (mümkünse acil durdurma butonuyla), enerji/gaz beslemesi vardiya amiri tarafından kesilir.\n\n2) TAHLİYE: Personel makine başındaki güvenli tahliye güzergâhından toplanma alanına yönlendirilir; forklift ve araçlar bu sırada kullanılmaz, yaya öncelikli hareket edilir.\n\n3) TOPLANMA VE SAYIM: Vardiya amirleri/ekip başları kendi bölümlerindeki personeli sayarak Acil Durum Koordinatörüne bildirir; kapalı alan/depo gibi kör noktalar ayrıca kontrol edilir.\n\n4) İLK YARDIM VE ARAMA: Yaralı varsa İlk Yardım ekibi derhal müdahale eder, gerekiyorsa ambulans çağrılır. Eksik personel için eğitimsiz kişiler tesise geri girmez, arama yalnızca kurtarma ekibi/itfaiye tarafından yapılır.\n\n5) YENİDEN BAŞLATMA: Vardiya amiri ve Acil Durum Koordinatörü onayı olmadan hiçbir hat/ekipman yeniden çalıştırılmaz; olay sonrası kök neden değerlendirmesi yapılır.' + _EKIP_GOREVLERI_METNI,
    uyariSistemleri: 'Fabrika geneli sesli siren, üretim hattı üzerindeki ikaz lambaları, anons sistemi, vardiya amirleri tarafından telsiz/sözlü uyarı.',
    disKurumIletisim: 'Acil Çağrı Merkezi (İtfaiye / Ambulans / Polis / Jandarma): 112\nAFAD: 122\nOSGB / İşyeri Hekimi: [telefon]\n[En yakın hastane adı ve telefonu]\n[En yakın itfaiye istasyonu adı ve telefonu]'
  },
  {
    id: 'insaat',
    ad: 'İnşaat Şantiyesi',
    aciklama: 'Yapı, altyapı veya taahhüt işlerinin yürütüldüğü şantiye sahası.',
    olasiAcilDurumlar: [
      'Yüksekten düşme (iskele, çatı, kat boşluğu)',
      'Kazı/istinat yapısı göçmesi',
      'Vinç/kule vinç devrilmesi veya yük düşmesi',
      'Elektrik çarpması (şantiye hattı, yer altı/üstü kablo)',
      'Yangın (kaynak-kesme işleri, yakıt/tüp depolama)',
      'Malzeme düşmesi',
      'Hava muhalefeti (fırtına, şiddetli yağış, don)',
      'Kalıp/iskele çökmesi',
      'Yer altı hizmet hattına (gaz/su/elektrik) kazı sırasında isabet',
      'Şantiye içi trafik kazası (araç-yaya çarpışması)'
    ],
    onleyiciTedbirler: 'KKD VE EĞİTİM:\n- Şantiyeye giriş için iş güvenliği eğitimi ve KKD (baret, emniyet kemeri, yansıtıcı yelek vb.) zorunluluğu uygulanır, turnike/kontrol noktasında denetlenir.\n- Yüksekte çalışma sertifikası olmayan personel yüksekte çalıştırılmaz.\n\nİSKELE VE YÜKSEKTE ÇALIŞMA:\n- İskele ve kalıp sistemleri kurulum sonrası yetkili kişi tarafından kontrol edilip onay etiketi asılmadan kullanıma açılmaz.\n- Platformlarda korkuluk, ara korkuluk ve eteklik bulunur; gerekli noktalarda yaşam hattı tesis edilir.\n\nKAZI VE İSTİNAT:\n- Kazı/istinat çalışmalarında şev/iksa uygunluğu proje ile denetlenir, kazı kenarına güvenlik şeridi ve bariyer konur.\n- Kazı öncesi yer altı hizmet hatları (gaz/su/elektrik) ilgili kurumlardan sorgulanır.\n\nKALDIRMA EKİPMANLARI:\n- Vinç/kule vinç günlük ve periyodik kontrole tabi tutulur, rüzgar hızı sınırının üzerinde çalışma durdurulur.\n\nATEŞLİ ÇALIŞMALAR:\n- Kaynak/kesme işleri için yangın gözcüsü ve iş izni sistemi uygulanır, yanıcı malzeme çalışma alanından uzaklaştırılır.\n\nHAVA KOŞULLARI:\n- Şiddetli hava koşullarında (fırtına, don, yoğun yağış) yüksekte/vinçli çalışma durdurulur; hava durumu takip prosedürü uygulanır.\n\nTEHLİKEYE ÖZEL ÖNLEMLER:\n\nYüksekten Düşme: Düşen kişiye dokunulmadan önce bilinç/nabız kontrol edilir, boyun/omurga sabitlenmeden hareket ettirilmez; İlk Yardım ekibi ve ambulans derhal çağrılır.\n\nKazı/İstinat Göçmesi: Göçük bölgesine giriş yasaklanır, ek göçük riski değerlendirilmeden kurtarma girişiminde bulunulmaz; itfaiye/AFAD arama-kurtarma ekibi çağrılır.\n\nVinç/Kule Vinç Devrilmesi: Yük altındaki alan derhal boşaltılır, vinç operatörüne ve çevredeki personele anons yapılır.\n\nElektrik Çarpması (Şantiye Hattı): Enerji ilgili dağıtım şirketi tarafından kesilmeden hat çevresine yaklaşılmaz.\n\nYangın (Kaynak/Yakıt): Yangın gözcüsü söndürme tüpüyle ilk müdahaleyi yapar, yakıt/tüp deposu bölgesindeki yangında derhal geniş çaplı tahliye yapılır.',
    tahliyePlani: '1) ALARM VE İLK MÜDAHALE: Alarm/düdük sinyaliyle birlikte tüm çalışma (kaynak, kazı, vinç, yüksekte çalışma) derhal durdurulur, ekipmanlar güvenli konuma alınır ve enerji kaynakları mümkünse kesilir.\n\n2) TAHLİYE: Personel en yakın güvenli güzergâhtan, kazı/yüksek alanlardan uzak durarak şantiye girişindeki toplanma alanına yönlendirilir.\n\n3) TOPLANMA VE SAYIM: Taşeron/ekip başları kendi personelini sayarak İSG uzmanına/şantiye şefine bildirir; iskele/kazı gibi kör noktalar ayrıca kontrol edilir.\n\n4) ARAMA-KURTARMA: Yaralı/mahsur kalan personel varsa derhal İlk Yardım ve kurtarma ekibi yönlendirilir, gerekiyorsa itfaiye/ambulans çağrılır; eğitimsiz personel tehlikeli alana girmez.\n\n5) YENİDEN BAŞLATMA: Şantiye şefi/İSG uzmanı onayı olmadan durdurulan çalışmalar yeniden başlatılmaz.' + _EKIP_GOREVLERI_METNI,
    uyariSistemleri: 'Şantiye geneli düdük/siren sinyali, şantiye şefliği anons sistemi, ekip başları tarafından telsiz uyarısı.',
    disKurumIletisim: 'Acil Çağrı Merkezi (İtfaiye / Ambulans / Polis / Jandarma): 112\nAFAD: 122\nOSGB / İşyeri Hekimi: [telefon]\n[En yakın hastane adı ve telefonu]\n[Elektrik dağıtım şirketi acil hattı]'
  },
  {
    id: 'depo',
    ad: 'Depo / Lojistik',
    aciklama: 'Palet/raf sistemli depolama, elleçleme ve sevkiyat tesisi.',
    olasiAcilDurumlar: [
      'Raf/istif çökmesi',
      'Forklift/istif makinesi kazası',
      'Yangın (ambalaj malzemesi, palet, şarj ünitesi)',
      'Yüksekten malzeme düşmesi',
      'Elektrikli forklift şarj istasyonu kaynaklı patlama/yangın',
      'Deprem',
      'Sevkiyat rampasında araç-personel çarpışması',
      'Soğuk hava deposunda amonyak/gaz kaçağı (varsa)'
    ],
    onleyiciTedbirler: 'RAF VE İSTİF GÜVENLİĞİ:\n- Raf sistemleri azami yük kapasitesine göre etiketlenir, periyodik olarak hasar/eğilme yönünden kontrol edilir.\n- İstifleme yüksekliği ve dengesi için standart çalışma talimatı uygulanır.\n\nARAÇ TRAFİĞİ:\n- Forklift/istif makinesi operatörleri sertifikalı olur, araçlar günlük kontrol formuyla denetlenir.\n- Yaya-araç güzergâhları yer işaretleriyle ayrılır, kör noktalara ayna/uyarı sistemi konur, sevkiyat rampasında bariyer/durdurma takozu kullanılır.\n\nŞARJ İSTASYONU VE YANGIN:\n- Şarj istasyonu havalandırmalı, yanıcı malzemeden uzak ve yangın söndürme tüpü/battaniyesi erişilebilir alanda kurulur.\n- Yangın algılama/söndürme sistemi (sprinkler, yangın dolabı) periyodik bakımdan geçirilir.\n\nKAÇIŞ YOLLARI:\n- Depo koridorları ve acil çıkışlar her zaman açık tutulur, malzeme ile kapatılmaz; aylık kontrol formuyla denetlenir.\n\nTEHLİKEYE ÖZEL ÖNLEMLER:\n\nRaf/İstif Çökmesi: Etkilenen koridor derhal kapatılır, altında kalma ihtimaline karşı kurtarma ekibi ve gerekiyorsa itfaiye çağrılır; eğitimsiz personel enkaza yaklaşmaz.\n\nForklift Kazası: Araç derhal durdurulur, motor kapatılır; yaralı varsa İlk Yardım ekibi çağrılır, kaza yeri inceleme tamamlanana kadar değiştirilmez.\n\nYangın (Ambalaj/Palet): Söndürme ekibi ilk müdahaleyi yapar, yanıcı malzeme yoğunluğu nedeniyle büyüyen yangında bölge derhal tahliye edilir.\n\nYüksekten Malzeme Düşmesi: Raf altı geçişlerde bulunulmaz, düşme sonrası alan işaretlenip trafik yönlendirilir.\n\nŞarj İstasyonu Yangını/Patlaması: Şarj işlemi anında kesilir, mümkünse yangın battaniyesi/tüpü ile müdahale edilir, alan derhal boşaltılır.',
    tahliyePlani: '1) ALARM VE İLK MÜDAHALE: Alarm çalınca forklift/istif makineleri güvenli şekilde durdurulur ve park edilir, motor kapatılır.\n\n2) TAHLİYE: Personel yaya güzergâhından, raf aralarından kaçınarak en yakın acil çıkışa yönlendirilir.\n\n3) TOPLANMA VE SAYIM: Raf aralarında kalan personel olup olmadığı vardiya sorumlusu tarafından kontrol edilir; toplanma alanında sayım yapılıp Acil Durum Koordinatörüne bildirilir.\n\n4) ARAMA-KURTARMA: Devrilen raf/malzeme altında kalan olması ihtimaline karşı kurtarma ekibi derhal yönlendirilir; eğitimsiz personel etkilenen bölgeye girmez.\n\n5) YENİDEN BAŞLATMA: Vardiya sorumlusu onayı olmadan araç trafiği ve elleçleme işlemleri yeniden başlatılmaz.' + _EKIP_GOREVLERI_METNI,
    uyariSistemleri: 'Depo geneli sesli alarm/siren, forklift/araç trafiğine yönelik ışıklı ikaz, anons sistemi, vardiya sorumlusu telsiz uyarısı.',
    disKurumIletisim: 'Acil Çağrı Merkezi (İtfaiye / Ambulans / Polis / Jandarma): 112\nAFAD: 122\n[En yakın hastane adı ve telefonu]\n[En yakın itfaiye istasyonu adı ve telefonu]'
  },
  {
    id: 'kimyasal',
    ad: 'Kimyasal Madde Üretim / Depolama',
    aciklama: 'Tehlikeli kimyasalların üretildiği, işlendiği veya depolandığı tesis.',
    olasiAcilDurumlar: [
      'Kimyasal sızıntı/dökülme',
      'Zehirli/boğucu gaz yayılımı',
      'Yangın (yanıcı/parlayıcı kimyasal)',
      'Patlama',
      'Kontrolsüz reaksiyon kaynaklı ani ısınma/basınç artışı',
      'Kişisel maruziyet (solunum, cilt veya göz teması)',
      'Kapalı alan/tank içi çalışmada oksijen eksikliği',
      'Kimyasalın çevreye/kanalizasyona/toprağa karışması',
      'Depolama alanında birbiriyle tepkimeye giren maddelerin teması'
    ],
    onleyiciTedbirler: 'DEPOLAMA VE ETİKETLEME:\n- Tüm kimyasallar için güncel Güvenlik Bilgi Formu (GBF/SDS) bulundurulur, depolama uyumluluk tablosuna göre (birbiriyle tepkimeye giren maddeler ayrı) depolanır ve etiketlenir.\n\nGAZ ALGILAMA:\n- Sabit/taşınabilir gaz dedektörü ve otomatik alarm sistemi kritik noktalarda bulunur, periyodik kalibrasyonu yapılır.\n- Kapalı alan/tank çalışmalarında giriş öncesi gaz ölçümü, sürekli havalandırma ve gözcü personel zorunludur.\n\nKİŞİSEL KORUYUCU DONANIM:\n- Uygun KKD (kimyasala dayanıklı eldiven, gözlük, gerektiğinde solunum koruyucu) zorunlu kullanılır, periyodik olarak yenilenir.\n- Göz duşu ve acil duş üniteleri kimyasal kullanılan her noktaya yakın konumlandırılır, periyodik olarak test edilir.\n\nDÖKÜLME MÜDAHALESİ:\n- Dökülme/sızıntı müdahale kiti (absorban, nötralize edici, bariyer malzemesi) erişilebilir noktalarda hazır bulundurulur, kullanımı personele öğretilir.\n\nEĞİTİM:\n- Kimyasalla çalışan tüm personel GBF okuma, KKD kullanımı ve acil müdahale konusunda düzenli eğitim alır.\n\nTEHLİKEYE ÖZEL ÖNLEMLER:\n\nKimyasal Sızıntı/Dökülme: Etkilenen alan derhal işaretlenir, GBF\'deki müdahale talimatı uygulanır; uygun KKD\'siz müdahale edilmez.\n\nZehirli/Boğucu Gaz Yayılımı: Rüzgar üstü yöne derhal uzaklaşılır, kapalı alanlara girilmez; gaz ölçümü yapılmadan alana dönülmez.\n\nYangın (Yanıcı Kimyasal): Su ile müdahale edilemeyen kimyasallar için uygun söndürücü türü (köpük/kuru kimyevi toz) kullanılır, GBF\'de belirtilmişse su kullanımından kaçınılır.\n\nPatlama: Personel derhal uzaklaşır, ikinci patlama/zincirleme reaksiyon ihtimaline karşı bölgeye eğitimsiz kişi girmez.\n\nKişisel Maruziyet: Etkilenen bölge (göz/cilt/solunum) derhal bol suyla en az 15 dakika yıkanır, kontamine kıyafet çıkarılır, hastaneye GBF ile birlikte sevk edilir.',
    tahliyePlani: '1) ALARM VE İZOLASYON: Alarm çalınca kimyasal işlem/transfer derhal durdurulur, mümkünse kaynak izole edilir (vana kapatma vb.) — bu işlem yalnızca eğitimli personel tarafından ve kişisel risk oluşturmayacak şekilde yapılır.\n\n2) TAHLİYE: Rüzgar yönü dikkate alınarak rüzgar üstü/yukarı yönde, sızıntı bölgesinden uzaklaşılarak güvenli toplanma alanına gidilir.\n\n3) ARINDIRMA VE İLK YARDIM: Maruz kalan personel derhal göz duşu/acil duş ile arındırılır ve sağlık birimine/hastaneye yönlendirilir; kontamine kıyafetler çıkarılır.\n\n4) TOPLANMA VE BİLDİRİM: Ekip başları personel sayımını yapıp Acil Durum Koordinatörüne bildirir; durum gerektiğinde itfaiye/AFAD\'a ve Zehir Danışma Merkezi\'ne bildirilir.\n\n5) ÇEVRE KORUMA: Sızıntının çevreye/kanalizasyona karışmaması için bariyer alınır; ilgili çevre mevzuatı gereği yetkili makamlara bildirim yapılır.\n\n6) YENİDEN BAŞLATMA: Alan gaz ölçümüyle güvenli bulunmadan ve Acil Durum Koordinatörü onayı olmadan işleme geri dönülmez.' + _EKIP_GOREVLERI_METNI,
    uyariSistemleri: 'Sabit gaz dedektörü otomatik alarmı, tesis geneli siren, anons sistemi, ekip başları telsiz uyarısı.',
    disKurumIletisim: 'Acil Çağrı Merkezi (İtfaiye / Ambulans / Polis / Jandarma): 112\nZehir Danışma Merkezi: 114\nAFAD: 122\n[En yakın hastane adı ve telefonu — kimyasal maruziyet tedavisi yapabilen]\n[Kimyasal tedarikçisi/üreticisi acil hattı]'
  },
  {
    id: 'saglik',
    ad: 'Sağlık Kuruluşu',
    aciklama: 'Hastane, poliklinik veya tıp merkezi gibi sağlık hizmeti verilen tesis.',
    olasiAcilDurumlar: [
      'Yangın',
      'Deprem',
      'Tıbbi gaz (oksijen) tesisatı/tüpü kaynaklı yangın veya patlama',
      'Kesintisiz güç kaynağı arızası (kritik cihazların durması)',
      'Enfeksiyon/salgın kaynaklı yayılım riski',
      'Hasta/hasta yakını kaynaklı şiddet olayı',
      'Yatağa bağımlı/hareket kısıtlı hastanın tahliyesi',
      'Su/ilaç/tıbbi malzeme kesintisi',
      'Yenidoğan/yoğun bakım gibi kritik ünitede acil durum'
    ],
    onleyiciTedbirler: 'TIBBİ GAZ VE ELEKTRİK GÜVENLİĞİ:\n- Tıbbi gaz tesisatı ve tüp depoları periyodik olarak kontrol edilir, açık ateş/kaynak işleri bu alanlardan uzak tutulur.\n- Jeneratör ve kesintisiz güç kaynağı (UPS) düzenli test edilir, kritik cihazlar (yoğun bakım, ameliyathane) yedekli beslemeye bağlanır.\n\nENFEKSİYON KONTROLÜ:\n- Enfeksiyon kontrol komitesi izolasyon protokollerini günceller, KKD stoku (maske, eldiven, önlük) sürekli hazır bulundurulur.\n- Salgın/artan vaka durumunda triyaj ve ek izolasyon alanı planı önceden belirlenir.\n\nHASTA TAHLİYE EKİPMANI:\n- Yatağa bağımlı hasta tahliyesi için tekerlekli sedye/evacuation chair gibi ekipman her katta bulunur, personel bu ekipmanların kullanımı konusunda düzenli eğitim alır.\n- Kritik bakım hastalarının taşınabilir monitör/oksijen ile tahliyesi için sorumlu personel önceden belirlenir.\n\nGÜVENLİK VE ŞİDDET ÖNLEME:\n- Güvenlik personeli, artan gerginlik/şiddet olaylarına erken müdahale için eğitilir; panik butonu/çağrı sistemi acil servis ve kritik noktalara yerleştirilir.\n\nTEHLİKEYE ÖZEL ÖNLEMLER:\n\nYangın: Alandaki hastalar önce yatay tahliye ile komşu kompartımana alınır, oksijen kaynakları mümkünse kapatılır/uzaklaştırılır.\n\nTıbbi Gaz Tesisatı/Tüpü Kaynaklı Patlama-Yangın: Ana gaz vanası eğitimli personel tarafından kapatılır, bölge derhal boşaltılır, açık ateşten uzak tutulur.\n\nKesintisiz Güç Kaynağı Arızası: Kritik cihazlardaki (ventilatör, monitör) hastalar öncelikli izlenir, yedek/taşınabilir güç kaynağına derhal geçilir.\n\nEnfeksiyon/Salgın Yayılımı: Şüpheli/pozitif vaka derhal izole edilir, temas eden personel ve hastalar kayıt altına alınır, enfeksiyon kontrol komitesine bildirilir.\n\nHasta/Yakını Kaynaklı Şiddet Olayı: Güvenlik personeli derhal çağrılır, personel kendini güvenli mesafede tutar, gerekiyorsa polis çağrılır.',
    tahliyePlani: '1) ALARM VE DEĞERLENDİRME: Alarm/kod anonsu ile birlikte servis sorumlusu durumu değerlendirir; panik yaratmamak için anonslar önceden belirlenmiş kod ifadeleriyle yapılır.\n\n2) YÜRÜYEBİLEN HASTA VE ZİYARETÇİ TAHLİYESİ: Önce yürüyebilen hastalar ve ziyaretçiler en yakın güvenli çıkışa yönlendirilir.\n\n3) HAREKET KISITLI HASTA TAHLİYESİ: Yatağa bağımlı/hareket kısıtlı hastalar önceden belirlenmiş sorumlu personel tarafından tahliye ekipmanıyla (evacuation chair, sedye) taşınır — kritik hastalarda hekim eşliğinde ve taşınabilir tıbbi ekipmanla (oksijen vb.) birlikte. Yatay tahliye (aynı kattaki yangın kompartımanına geçiş) mümkünse dikey tahliyeye tercih edilir.\n\n4) SAYIM VE BİLDİRİM: Servis sorumluları hasta/personel sayımını yapıp Acil Durum Koordinatörüne bildirir.\n\n5) SEVK: Kritik bakım hastaları için önceden belirlenmiş komşu sağlık kuruluşuna sevk protokolü uygulanır, hasta dosyaları/kimlik bilgileri birlikte taşınır.\n\n6) YENİDEN GİRİŞ: Yetkili onayı olmadan tahliye edilen üniteye hasta kabulüne devam edilmez.' + _EKIP_GOREVLERI_METNI,
    uyariSistemleri: 'Yangın alarm sistemi (kod anonsu ile, hasta panik yaratmayacak şekilde), servis içi çağrı sistemi, güvenlik/santral üzerinden anons.',
    disKurumIletisim: 'Acil Çağrı Merkezi (İtfaiye / Ambulans / Polis / Jandarma): 112\nAFAD: 122\n[İl Sağlık Müdürlüğü acil hattı]\n[En yakın/komşu hastane sevk protokolü telefonu]\n[Tıbbi gaz tedarikçisi acil hattı]'
  }
];
