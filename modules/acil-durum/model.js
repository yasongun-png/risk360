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
      'Su baskını (sıhhi tesisat arızası)',
      'Asansörde mahsur kalma',
      'Bina tahliyesini gerektiren dış tehdit (bomba ihbarı, şüpheli paket)'
    ],
    onleyiciTedbirler: '- Duman dedektörü, yangın alarm butonu ve yangın söndürme tüplerinin periyodik bakım/kontrolü aksatılmadan yaptırılır.\n- Elektrik pano ve tesisatının periyodik topraklama/kaçak akım kontrolleri yapılır.\n- Mutfak/çay ocağında gaz kaçağı algılama sensörü bulunur, kombi dairesi yılda bir kez bakımdan geçirilir.\n- Kaçış yolları ve acil çıkış kapıları hiçbir zaman malzeme ile kapatılmaz; aylık kontrol formuyla denetlenir.\n- Deprem çantası bulundurulur, masa altı güvenli alan bilgilendirmesi tüm katlarda asılı tutulur.',
    tahliyePlani: 'Alarmın duyulması/anonsun yapılmasıyla birlikte tüm personel çalışmayı bırakır, mümkünse elektrikli cihazları kapatır ve en yakın acil çıkışa yönlendirilir. Asansör KESİNLİKLE kullanılmaz. Kat sorumluları kendi katlarındaki personeli sayarak toplanma alanına yönlendirir ve kimsenin kalmadığını kontrol eder. Toplanma alanında kat sorumluları personel sayımını tamamlayıp Acil Durum Koordinatörüne bildirir. Eksik personel varsa arama/kurtarma ekibi ve itfaiyeye derhal bilgi verilir.',
    uyariSistemleri: 'Sesli/ışıklı yangın alarm sistemi, kat anons sistemi, kat sorumluları tarafından sözlü uyarı, toplu bilgilendirme (SMS/mesajlaşma grubu).',
    disKurumIletisim: 'İtfaiye: 110\nAcil Sağlık (Ambulans): 112\nPolis İmdat: 155\nAFAD: 122\nDoğalgaz Acil: 187\n[En yakın hastane adı ve telefonu]\n[Bina yönetimi / güvenlik telefonu]'
  },
  {
    id: 'uretim',
    ad: 'Üretim / Fabrika (Genel)',
    aciklama: 'Makine/ekipman kullanılan imalat, montaj veya işleme tesisi.',
    olasiAcilDurumlar: [
      'Yangın (makine/motor kaynaklı, kısa devre, kaynak-kesme işleri)',
      'Patlama (basınçlı kap, tozlu/gaz ortam)',
      'Ağır iş kazası (makineye sıkışma, ezilme)',
      'Kimyasal madde dökülmesi/sızıntısı',
      'Elektrik çarpması',
      'Vinç/kaldırma ekipmanı arızası veya yük düşmesi',
      'Deprem'
    ],
    onleyiciTedbirler: '- Makine koruyucuları ve acil durdurma butonları çalışır durumda tutulur, periyodik kontrolden geçirilir.\n- Kaynak/kesme, parlayıcı-patlayıcı madde bulunan bölgelerden uzakta ve yangın gözcüsü eşliğinde yapılır.\n- Elektrik pano ve tesisatının periyodik bakım/termal kamera kontrolleri yapılır.\n- Kaldırma ekipmanları (vinç, forklift) yıllık periyodik kontrole tabi tutulur, günlük kontrol formuyla operatör tarafından denetlenir.\n- Tozlu/parlayıcı ortamlarda lokal egzoz ve topraklama önlemleri uygulanır.\n- Üretim hatlarına yakın yerlerde yangın dolabı/tüpü ve göz duşu bulundurulur.',
    tahliyePlani: 'Alarm/siren çalınca üretim hattı güvenli şekilde durdurulur (mümkünse acil durdurma butonuyla), enerji/gaz beslemesi vardiya amiri tarafından kesilir. Personel makine başındaki güvenli tahliye güzergâhından toplanma alanına yönlendirilir; forklift ve araçlar kullanılmaz. Vardiya amirleri/ekip başları kendi bölümlerindeki personeli sayarak Acil Durum Koordinatörüne bildirir. Yaralı varsa İlk Yardım ekibi derhal müdahale eder, gerekiyorsa ambulans çağrılır.',
    uyariSistemleri: 'Fabrika geneli sesli siren, üretim hattı üzerindeki ikaz lambaları, anons sistemi, vardiya amirleri tarafından telsiz/sözlü uyarı.',
    disKurumIletisim: 'İtfaiye: 110\nAcil Sağlık (Ambulans): 112\nPolis İmdat: 155\nAFAD: 122\nOSGB / İşyeri Hekimi: [telefon]\n[En yakın hastane adı ve telefonu]\n[En yakın itfaiye istasyonu adı ve telefonu]'
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
      'Hava muhalefeti (fırtına, şiddetli yağış, don)'
    ],
    onleyiciTedbirler: '- Şantiyeye giriş için iş güvenliği eğitimi ve KKD (baret, emniyet kemeri vb.) zorunluluğu uygulanır, turnike/kontrol noktasında denetlenir.\n- İskele ve kalıp sistemleri kurulum sonrası yetkili kişi tarafından kontrol edilip onay etiketi asılmadan kullanıma açılmaz.\n- Kazı/istinat çalışmalarında şev/iksa uygunluğu proje ile denetlenir, kazı kenarına güvenlik şeridi ve bariyer konur.\n- Vinç/kule vinç günlük ve periyodik kontrole tabi tutulur, rüzgar hızı sınırının üzerinde çalışma durdurulur.\n- Kaynak/kesme işleri için yangın gözcüsü ve iş izni sistemi uygulanır, yanıcı malzeme çalışma alanından uzaklaştırılır.\n- Şiddetli hava koşullarında (fırtına, don, yoğun yağış) yüksekte/vinçli çalışma durdurulur.',
    tahliyePlani: 'Alarm/düdük sinyaliyle birlikte tüm çalışma (kaynak, kazı, vinç, yüksekte çalışma) derhal durdurulur, ekipmanlar güvenli konuma alınır. Personel en yakın güvenli güzergâhtan şantiye girişindeki toplanma alanına yönlendirilir. Taşeron/ekip başları kendi personelini sayarak İSG uzmanına/şantiye şefine bildirir. Yaralı/mahsur kalan personel varsa derhal İlk Yardım ve kurtarma ekibi yönlendirilir, gerekiyorsa itfaiye/ambulans çağrılır.',
    uyariSistemleri: 'Şantiye geneli düdük/siren sinyali, şantiye şefliği anons sistemi, ekip başları tarafından telsiz uyarısı.',
    disKurumIletisim: 'İtfaiye: 110\nAcil Sağlık (Ambulans): 112\nPolis İmdat: 155\nAFAD: 122\nOSGB / İşyeri Hekimi: [telefon]\n[En yakın hastane adı ve telefonu]\n[Elektrik dağıtım şirketi acil hattı]'
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
      'Deprem'
    ],
    onleyiciTedbirler: '- Raf sistemleri azami yük kapasitesine göre etiketlenir, periyodik olarak hasar/eğilme yönünden kontrol edilir.\n- Forklift/istif makinesi operatörleri sertifikalı olur, araçlar günlük kontrol formuyla denetlenir.\n- Yaya-araç güzergâhları yer işaretleriyle ayrılır, kör noktalara ayna/uyarı sistemi konur.\n- Şarj istasyonu havalandırmalı, yanıcı malzemeden uzak ve yangın söndürme tüpü/battaniyesi erişilebilir alanda kurulur.\n- Depo koridorları ve acil çıkışlar her zaman açık tutulur, malzeme ile kapatılmaz.\n- Yangın algılama/söndürme sistemi (sprinkler, yangın dolabı) periyodik bakımdan geçirilir.',
    tahliyePlani: 'Alarm çalınca forklift/istif makineleri güvenli şekilde durdurulur ve park edilir, personel yaya güzergâhından en yakın acil çıkışa yönlendirilir. Raf aralarında kalan personel olup olmadığı vardiya sorumlusu tarafından kontrol edilir. Toplanma alanında sayım yapılıp Acil Durum Koordinatörüne bildirilir. Devrilen raf/malzeme altında kalan olması ihtimaline karşı kurtarma ekibi derhal yönlendirilir.',
    uyariSistemleri: 'Depo geneli sesli alarm/siren, forklift/araç trafiğine yönelik ışıklı ikaz, anons sistemi, vardiya sorumlusu telsiz uyarısı.',
    disKurumIletisim: 'İtfaiye: 110\nAcil Sağlık (Ambulans): 112\nPolis İmdat: 155\nAFAD: 122\n[En yakın hastane adı ve telefonu]\n[En yakın itfaiye istasyonu adı ve telefonu]'
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
      'Kişisel maruziyet (solunum, cilt veya göz teması)'
    ],
    onleyiciTedbirler: '- Tüm kimyasallar için güncel Güvenlik Bilgi Formu (GBF/SDS) bulundurulur, depolama uyumluluk tablosuna göre (birbiriyle tepkimeye giren maddeler ayrı) depolanır.\n- Sabit/taşınabilir gaz dedektörü ve otomatik alarm sistemi kritik noktalarda bulunur.\n- Kapalı alan/tank çalışmalarında giriş öncesi gaz ölçümü, sürekli havalandırma ve gözcü personel zorunludur.\n- Dökülme/sızıntı müdahale kiti (absorban, nötralize edici) erişilebilir noktalarda hazır bulundurulur.\n- Göz duşu ve acil duş üniteleri kimyasal kullanılan her noktaya yakın konumlandırılır, periyodik olarak test edilir.\n- Uygun KKD (kimyasala dayanıklı eldiven, gözlük, gerektiğinde solunum koruyucu) zorunlu kullanılır.',
    tahliyePlani: 'Alarm çalınca kimyasal işlem/transfer derhal durdurulur, mümkünse kaynak izole edilir (vana kapatma vb.) — bu işlem sadece eğitimli personel tarafından ve kişisel risk oluşturmayacak şekilde yapılır. Rüzgar yönü dikkate alınarak rüzgar üstü/yukarı yönde güvenli toplanma alanına gidilir. Maruz kalan personel derhal göz duşu/acil duş ile arındırılır ve sağlık birimine yönlendirilir. Ekip başları personel sayımını yapıp Acil Durum Koordinatörüne ve gerekiyorsa itfaiye/AFAD\'a bilgi verir. Sızıntının çevreye/kanalizasyona karışmaması için bariyer alınır.',
    uyariSistemleri: 'Sabit gaz dedektörü otomatik alarmı, tesis geneli siren, anons sistemi, ekip başları telsiz uyarısı.',
    disKurumIletisim: 'İtfaiye: 110\nAcil Sağlık (Ambulans): 112\nZehir Danışma Merkezi: 114\nAFAD: 122\nPolis İmdat: 155\n[En yakın hastane adı ve telefonu — kimyasal maruziyet tedavisi yapabilen]\n[Kimyasal tedarikçisi/üreticisi acil hattı]'
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
      'Yatağa bağımlı/hareket kısıtlı hastanın tahliyesi'
    ],
    onleyiciTedbirler: '- Tıbbi gaz tesisatı ve tüp depoları periyodik olarak kontrol edilir, açık ateş/kaynak işleri bu alanlardan uzak tutulur.\n- Jeneratör ve kesintisiz güç kaynağı (UPS) düzenli test edilir, kritik cihazlar (yoğun bakım, ameliyathane) yedekli beslemeye bağlanır.\n- Enfeksiyon kontrol komitesi izolasyon protokollerini günceller, KKD stoku (maske, eldiven, önlük) sürekli hazır bulundurulur.\n- Yatağa bağımlı hasta tahliyesi için tekerlekli sedye/evacuation chair gibi ekipman her katta bulunur, personel bu ekipmanların kullanımı konusunda eğitilir.\n- Güvenlik personeli, artan gerginlik/şiddet olaylarına erken müdahale için eğitilir; panik butonu/çağrı sistemi kritik noktalara yerleştirilir.',
    tahliyePlani: 'Alarm/anons ile birlikte önce yürüyebilen hastalar ve ziyaretçiler en yakın çıkışa yönlendirilir. Yatağa bağımlı/hareket kısıtlı hastalar önceden belirlenmiş sorumlu personel tarafından tahliye ekipmanıyla (evacuation chair, sedye) taşınır — kritik hastalarda hekim eşliğinde ve tıbbi ekipman (taşınabilir oksijen vb.) ile birlikte. Yatay tahliye (aynı kattaki yangın kompartımanına geçiş) mümkünse dikey tahliyeye tercih edilir. Servis sorumluları hasta/personel sayımını yapıp Acil Durum Koordinatörüne bildirir. Kritik bakım hastaları için önceden belirlenmiş komşu sağlık kuruluşuna sevk protokolü uygulanır.',
    uyariSistemleri: 'Yangın alarm sistemi (kod anonsu ile, hasta panik yaratmayacak şekilde), servis içi çağrı sistemi, güvenlik/santral üzerinden anons.',
    disKurumIletisim: 'İtfaiye: 110\nAcil Sağlık (Ambulans): 112\nAFAD: 122\nPolis İmdat: 155\n[İl Sağlık Müdürlüğü acil hattı]\n[En yakın/komşu hastane sevk protokolü telefonu]\n[Tıbbi gaz tedarikçisi acil hattı]'
  }
];
