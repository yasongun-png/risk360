// Acil Durum Yönetimi veri modeli.
// Mevzuat dayanağı: İşyerlerinde Acil Durumlar Hakkında Yönetmelik (RG 18.06.2013/28681)
// Madde 11 (ekip sayıları), Madde 12 (plan asgari unsurları), Madde 13/2 (plan yenileme süresi);
// İlkyardım Yönetmeliği (RG 29.07.2015/29429) Madde 19 (ilkyardımcı sayısı).
// Bu hesaplamalar yönetmeliğin asgari hükümlerini yansıtır; nihai uygulama için güncel
// mevzuat ve resmi rehberler esas alınmalıdır.

const EKIP_TURLERI = ['Koordinasyon', 'Söndürme', 'Kurtarma', 'Koruma', 'İlk Yardım', 'Destek'];
const EKIP_ROLLERI = ['Acil Durum Sorumlusu', 'Acil Durum Koordinatörü', 'Ekip Başı', 'Ekip Üyesi', 'Gözetmen'];
const VARDIYALAR = ['A', 'B', 'C', 'D', 'G', '08-16', '16-24', '00-08', 'Genel'];

const EKIPMAN_TURLERI = ['Yangın Tüpü', 'Hidrant', 'Yangın Dolabı', 'Göz Duşu', 'Acil Duş', 'Kaçış Yolu', 'Toplanma Alanı', 'Alarm / Siren', 'Acil Aydınlatma', 'Döküntü Kiti', 'Diğer'];
const TATBIKAT_TURLERI = ['Yangın Tatbikatı', 'Tahliye Tatbikatı', 'Kimyasal Sızıntı', 'Amonyak Senaryosu', 'Asit Sızıntısı', 'Deprem', 'Kapalı Alan Kurtarma', 'Liman / İskele Acil Durumu', 'Diğer'];
const SENARYO_TURLERI = ['Yangın', 'Patlama', 'Kimyasal Yayılım', 'Amonyak Kaçağı', 'Asit Dökülmesi', 'Deprem', 'Kapalı Alan', 'Çevresel Olay', 'Diğer'];

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
