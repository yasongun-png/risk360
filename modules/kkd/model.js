// KKD (Kişisel Koruyucu Donanım) veri modeli: Envanter (stok), Zimmet
// (personele verilen KKD takibi) ve İhlal (KKD kullanmama/yanlış kullanım
// tespiti) — üç ayrı ama ilişkili kayıt türü. Eski üretim uygulamasındaki
// ppe_management ve kkd_violation modüllerinden mümkün olduğunca aynı iş
// kuralları taşınmıştır: KKD türleri, varsayılan değişim periyotları, KKD
// kataloğu/EN standartları otomatik doldurma, zimmet durumunun tarihe göre
// otomatik hesaplanması, ihlal tekrarının sicile göre otomatik tespiti.

function bugunIso() {
  return new Date().toISOString().slice(0, 10);
}

const KKD_TURLERI = [
  'Baret', 'Koruyucu Gözlük', 'Yüz Siperi', 'Eldiven', 'Kulak Koruyucu',
  'Solunum Koruyucu', 'Kimyasal Tulum', 'İş Ayakkabısı',
  'Paraşüt Tipi Emniyet Kemeri', 'Reflektif Yelek', 'Diğer'
];

const KKD_VARSAYILAN_PERIYOT = {
  'Baret': 1095, 'Koruyucu Gözlük': 365, 'Yüz Siperi': 365, 'Eldiven': 90,
  'Kulak Koruyucu': 365, 'Solunum Koruyucu': 180, 'Kimyasal Tulum': 180,
  'İş Ayakkabısı': 365, 'Paraşüt Tipi Emniyet Kemeri': 365, 'Reflektif Yelek': 365, 'Diğer': 365
};

const KKD_ONERILEN_EN = {
  'Baret': ['EN 397'], 'Koruyucu Gözlük': ['EN 166'], 'Yüz Siperi': ['EN 166'],
  'Eldiven': ['EN 388', 'EN 374'], 'Kulak Koruyucu': ['EN 352'],
  'Solunum Koruyucu': ['EN 149', 'EN 14387', 'EN 136', 'EN 140'],
  'Kimyasal Tulum': ['EN 14605', 'EN 13982', 'EN 13034'],
  'İş Ayakkabısı': ['EN ISO 20345'],
  'Paraşüt Tipi Emniyet Kemeri': ['EN 361', 'EN 355', 'EN 362'],
  'Reflektif Yelek': ['EN ISO 20471'], 'Diğer': []
};

// "Kişisel Koruyucu Donanımlarda EN Standartları" referans posterindeki 8 ana
// kategoriye (Baş, Göz/Yüz, Solunum, Kulak, El, Ayak, Düşmeyi Önleyici
// Sistemler, Vücut) karşılık gelen, somut ürün adı bazında EN standardı içeren
// katalog. KKD adı seçildiğinde/girildiğinde tür ve EN alanlarının otomatik ve
// kesin doldurulmasını sağlamak için kullanılır.
const KKD_KATALOG = [
  // Baş Koruyucuları
  { ad: 'Endüstriyel Baret', tur: 'Baret', en: ['EN 397'] },
  { ad: 'Elektrik İzoleli Baret', tur: 'Baret', en: ['EN 397', 'EN 50365'] },
  { ad: 'Hafif Kafa Koruyucu (Bump Cap)', tur: 'Baret', en: ['EN 812'] },
  { ad: 'Yüksek Performanslı Endüstriyel Kask', tur: 'Baret', en: ['EN 14052'] },

  // Göz ve Yüz Koruyucuları
  { ad: 'Koruyucu Gözlük (Çapak / Toz)', tur: 'Koruyucu Gözlük', en: ['EN 166'] },
  { ad: 'Kaynak Gözlüğü', tur: 'Koruyucu Gözlük', en: ['EN 166', 'EN 169'] },
  { ad: 'Lazer Koruyucu Gözlük', tur: 'Koruyucu Gözlük', en: ['EN 207', 'EN 208'] },
  { ad: 'Gözlük Tipi Kapalı Koruyucu (Goggle)', tur: 'Koruyucu Gözlük', en: ['EN 166'] },
  { ad: 'Yüz Siperi (Face Shield)', tur: 'Yüz Siperi', en: ['EN 166', 'EN 1731'] },
  { ad: 'Kaynak Maskesi (Yüz Tipi / Başlık)', tur: 'Yüz Siperi', en: ['EN 175', 'EN 169'] },

  // Solunum Koruyucuları
  { ad: 'Toz Maskesi FFP1', tur: 'Solunum Koruyucu', en: ['EN 149'] },
  { ad: 'Toz Maskesi FFP2', tur: 'Solunum Koruyucu', en: ['EN 149'] },
  { ad: 'Toz Maskesi FFP3', tur: 'Solunum Koruyucu', en: ['EN 149'] },
  { ad: 'Yarım Yüz Maske (Değiştirilebilir Filtreli)', tur: 'Solunum Koruyucu', en: ['EN 140'] },
  { ad: 'Tam Yüz Maske', tur: 'Solunum Koruyucu', en: ['EN 136'] },
  { ad: 'Gaz / Buhar Filtresi (ABEK)', tur: 'Solunum Koruyucu', en: ['EN 14387'] },
  { ad: 'Parçacık Filtresi (P1/P2/P3)', tur: 'Solunum Koruyucu', en: ['EN 143'] },
  { ad: 'Motorlu Hava Temizleyici Solunum Cihazı (PAPR)', tur: 'Solunum Koruyucu', en: ['EN 12941', 'EN 12942'] },
  { ad: 'Hava Beslemeli Maske / Hat Sistemi', tur: 'Solunum Koruyucu', en: ['EN 14594', 'EN 138'] },
  { ad: 'Kaçış Tipi Solunum Cihazı', tur: 'Solunum Koruyucu', en: ['EN 403', 'EN 1146'] },
  { ad: 'Basınçlı Hava Tüplü Solunum Cihazı (SCBA)', tur: 'Solunum Koruyucu', en: ['EN 137'] },

  // Kulak Koruyucuları
  { ad: 'Kulaklık (Ear Muff)', tur: 'Kulak Koruyucu', en: ['EN 352-1'] },
  { ad: 'Kulak Tıkacı', tur: 'Kulak Koruyucu', en: ['EN 352-2'] },
  { ad: 'Kafa Bantlı Kulak Tıkacı', tur: 'Kulak Koruyucu', en: ['EN 352-3'] },
  { ad: 'Baret Montajlı Kulaklık', tur: 'Kulak Koruyucu', en: ['EN 352-3'] },

  // El Koruyucuları
  { ad: 'Genel Amaçlı İş Eldiveni (Mekanik Risk)', tur: 'Eldiven', en: ['EN 388'] },
  { ad: 'Kimyasal Koruyucu Eldiven', tur: 'Eldiven', en: ['EN 374'] },
  { ad: 'Isıya / Ateşe Karşı Koruyucu Eldiven', tur: 'Eldiven', en: ['EN 407'] },
  { ad: 'Soğuğa Karşı Koruyucu Eldiven', tur: 'Eldiven', en: ['EN 511'] },
  { ad: 'Elektrik Yalıtımlı Eldiven', tur: 'Eldiven', en: ['EN 60903'] },
  { ad: 'Kesilmeye Dayanıklı Eldiven', tur: 'Eldiven', en: ['EN 388', 'EN ISO 13997'] },
  { ad: 'Titreşim Önleyici Eldiven', tur: 'Eldiven', en: ['EN ISO 10819'] },
  { ad: 'Tek Kullanımlık Muayene Eldiveni', tur: 'Eldiven', en: ['EN 374', 'EN 455'] },

  // Ayak Koruyucuları
  { ad: 'Güvenlik Ayakkabısı (Burun Koruma Takozlu)', tur: 'İş Ayakkabısı', en: ['EN ISO 20345'] },
  { ad: 'Koruyucu Ayakkabı (Burunsuz)', tur: 'İş Ayakkabısı', en: ['EN ISO 20346'] },
  { ad: 'Mesleki Ayakkabı', tur: 'İş Ayakkabısı', en: ['EN ISO 20347'] },
  { ad: 'Elektrik Yalıtımlı Ayakkabı', tur: 'İş Ayakkabısı', en: ['EN 50321'] },
  { ad: 'Kimyasala Dayanıklı Çizme (PVC / Lastik)', tur: 'İş Ayakkabısı', en: ['EN ISO 20345', 'EN 13832'] },
  { ad: 'Kaynakçı Ayakkabısı / Tozluğu', tur: 'İş Ayakkabısı', en: ['EN ISO 20345'] },
  { ad: 'İtfaiyeci Botu', tur: 'İş Ayakkabısı', en: ['EN 15090'] },

  // Düşmeyi Önleyici Sistemler
  { ad: 'Tam Vücut Emniyet Kemeri (Harness)', tur: 'Paraşüt Tipi Emniyet Kemeri', en: ['EN 361'] },
  { ad: 'Bel Kemeri (Tutma Amaçlı)', tur: 'Paraşüt Tipi Emniyet Kemeri', en: ['EN 358'] },
  { ad: 'Enerji Sönümleyici Bağlantı Halatı (Lanyard)', tur: 'Paraşüt Tipi Emniyet Kemeri', en: ['EN 355'] },
  { ad: 'Karabina / Bağlantı Elemanı', tur: 'Paraşüt Tipi Emniyet Kemeri', en: ['EN 362'] },
  { ad: 'Geri Sarmalı Düşme Durdurucu (Yoyo)', tur: 'Paraşüt Tipi Emniyet Kemeri', en: ['EN 360'] },
  { ad: 'Sabit Ray / Halat Tipi Düşme Önleyici', tur: 'Paraşüt Tipi Emniyet Kemeri', en: ['EN 353-1', 'EN 353-2'] },
  { ad: 'Ankraj Noktası', tur: 'Paraşüt Tipi Emniyet Kemeri', en: ['EN 795'] },
  { ad: 'Kurtarma / Tahliye Ekipmanı', tur: 'Paraşüt Tipi Emniyet Kemeri', en: ['EN 1496', 'EN 1497'] },

  // Vücut Koruyucuları
  { ad: 'Kimyasal Koruyucu Tulum (Tip 3/4 - Sıvı Geçirmez)', tur: 'Kimyasal Tulum', en: ['EN 14605'] },
  { ad: 'Kimyasal Sıçramaya Dayanıklı Tulum (Tip 6)', tur: 'Kimyasal Tulum', en: ['EN 13034'] },
  { ad: 'Parçacığa Dayanıklı Tulum (Tip 5)', tur: 'Kimyasal Tulum', en: ['EN 13982-1'] },
  { ad: 'Yüksek Görünürlük Yelek / Giysi', tur: 'Reflektif Yelek', en: ['EN ISO 20471'] },
  { ad: 'Alev Almaz Koruyucu Giysi', tur: 'Diğer', en: ['EN ISO 11612'] },
  { ad: 'Kaynakçı Önlüğü / Giysisi', tur: 'Diğer', en: ['EN ISO 11611'] },
  { ad: 'Elektrik Arkına Dayanıklı Giysi', tur: 'Diğer', en: ['EN 61482-1-2', 'EN 61482-2'] },
  { ad: 'Kesilmeye Dayanıklı Koruyucu Giysi', tur: 'Diğer', en: ['EN 381', 'EN ISO 13998'] },
  { ad: 'Soğuk Ortam Koruyucu Giysi', tur: 'Diğer', en: ['EN 342'] },
  { ad: 'Su Geçirmez / Yağmurluk Koruyucu Giysi', tur: 'Diğer', en: ['EN 343'] }
];

function kkdKatalogBul(ad) {
  const hedef = (ad || '').trim().toLocaleUpperCase('tr-TR');
  if (!hedef) return null;
  return KKD_KATALOG.find(k => k.ad.toLocaleUpperCase('tr-TR') === hedef) || null;
}

const ENVANTER_DURUMLARI = ['Aktif', 'Pasif', 'Stok Yok', 'İptal'];
const ZIMMET_DURUMLARI = ['Aktif', 'Değişim Yaklaşıyor', 'Değişim Süresi Geçti', 'İade Edildi', 'Kayıp', 'Hasarlı', 'İptal'];
const ZIMMET_TERMINAL_DURUMLAR = ['İade Edildi', 'Kayıp', 'Hasarlı', 'İptal'];
const KKD_KONDISYONLARI = ['Yeni', 'Kullanılabilir', 'Hasarlı', 'Hurda / Kullanılamaz'];

const IHLAL_TURLERI = ['Kullanmama', 'Yanlış Kullanım', 'Eksik Kullanım', 'Hasarlı KKD Kullanımı', 'Uygun Olmayan KKD', 'KKD Bulundurmama'];
const IHLAL_ISLEMLERI = ['Sözlü Uyarı', 'Yazılı Uyarı', 'Tutanak', 'Eğitim Tekrarı', 'Sahadan Uzaklaştırma', 'Amire Bildirim'];

function _kkdSiraNoUret(onEk, mevcutListe, alanAdi) {
  let maks = 0;
  mevcutListe.forEach(item => {
    const deger = String(item[alanAdi] || '');
    if (!deger.startsWith(onEk)) return;
    const kuyruk = parseInt(deger.slice(onEk.length), 10);
    if (Number.isFinite(kuyruk) && kuyruk > maks) maks = kuyruk;
  });
  return onEk + String(maks + 1).padStart(4, '0');
}

function envanterSonrakiNoUret(mevcutListe) {
  return _kkdSiraNoUret('KKD', mevcutListe, 'envanterNo');
}

function zimmetSonrakiNoUret(mevcutListe) {
  return _kkdSiraNoUret('ZIM', mevcutListe, 'zimmetNo');
}

// Eski uygulamadaki ihlal numaralandırması: "KKD-YIL-SIRA" (ör. KKD-2026-001);
// sıra her yıl 001'den başlar (global değil).
function ihlalSonrakiNoUret(mevcutListe, yil) {
  const y = yil || new Date().getFullYear();
  let maks = 0;
  const desen = new RegExp(`^KKD-${y}-(\\d+)$`);
  mevcutListe.forEach(item => {
    const eslesme = desen.exec(String(item.ihlalNo || ''));
    if (eslesme) {
      const n = parseInt(eslesme[1], 10);
      if (n > maks) maks = n;
    }
  });
  return `KKD-${y}-${String(maks + 1).padStart(3, '0')}`;
}

function _enListesiNormallestir(deger) {
  if (Array.isArray(deger)) return deger.map(s => String(s).trim()).filter(Boolean);
  return String(deger || '').split(/[;,]+/).map(s => s.trim()).filter(Boolean);
}

function envanterOlustur(veriler) {
  const tur = veriler.tur || 'Diğer';
  return {
    id: veriler.id || rastgeleId(),
    envanterNo: veriler.envanterNo || '',
    ad: (veriler.ad || '').trim(),
    tur,
    marka: (veriler.marka || '').trim(),
    model: (veriler.model || '').trim(),
    beden: (veriler.beden || '').trim(),
    enStandartlari: _enListesiNormallestir(veriler.enStandartlari),
    stok: Number(veriler.stok) || 0,
    minimumStok: Number(veriler.minimumStok) || 0,
    degisimPeriyoduGun: Number(veriler.degisimPeriyoduGun) || KKD_VARSAYILAN_PERIYOT[tur] || 365,
    bolum: (veriler.bolum || '').trim(),
    lokasyon: (veriler.lokasyon || '').trim(),
    tedarikci: (veriler.tedarikci || '').trim(),
    satinAlmaTarihi: veriler.satinAlmaTarihi || '',
    sonKullanmaTarihi: veriler.sonKullanmaTarihi || '',
    durum: veriler.durum || 'Aktif',
    notlar: (veriler.notlar || '').trim(),
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}

// toISOString() UTC'ye çevirir; UTC+3'te yerel gece yarısı bir gün geri kayar
// (bkz. yuklenici/model.js -> _yukleniciYerelTarihStr) — bu yüzden yerel Y/A/G
// bileşenlerinden string üretiyoruz.
function _kkdYerelTarihStr(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function zimmetDegisimTarihiHesapla(verilisTarihi, periyotGun) {
  if (!verilisTarihi || !periyotGun) return '';
  const d = new Date(verilisTarihi + 'T00:00:00');
  if (isNaN(d)) return '';
  d.setDate(d.getDate() + Number(periyotGun));
  return _kkdYerelTarihStr(d);
}

// Zimmet durumu, kayıtlı (manuel seçilmiş) durumdan bağımsız olarak tarihe
// göre otomatik hesaplanır — terminal durumlar (İade/Kayıp/Hasarlı/İptal)
// hariç, çünkü onlar kalıcıdır ve tarih ilerledikçe geri değişmemelidir.
function zimmetDurumuHesapla(zimmet, bugunStr) {
  if (ZIMMET_TERMINAL_DURUMLAR.includes(zimmet.durum)) return zimmet.durum;
  if (!zimmet.degisimTarihi) return 'Aktif';
  const bugun = bugunStr || new Date().toISOString().slice(0, 10);
  if (zimmet.degisimTarihi < bugun) return 'Değişim Süresi Geçti';
  const otuzGunSonra = new Date(bugun + 'T00:00:00');
  otuzGunSonra.setDate(otuzGunSonra.getDate() + 30);
  if (zimmet.degisimTarihi <= _kkdYerelTarihStr(otuzGunSonra)) return 'Değişim Yaklaşıyor';
  return 'Aktif';
}

function zimmetOlustur(veriler) {
  const kkdTuru = veriler.kkdTuru || 'Diğer';
  const periyot = Number(veriler.degisimPeriyoduGun) || KKD_VARSAYILAN_PERIYOT[kkdTuru] || 365;
  const verilisTarihi = veriler.verilisTarihi || new Date().toISOString().slice(0, 10);
  return {
    id: veriler.id || rastgeleId(),
    zimmetNo: veriler.zimmetNo || '',
    personelId: veriler.personelId || '',
    personelAdi: (veriler.personelAdi || '').trim(),
    bolum: (veriler.bolum || '').trim(),
    gorev: (veriler.gorev || '').trim(),
    envanterId: veriler.envanterId || '',
    kkdAdi: (veriler.kkdAdi || '').trim(),
    kkdTuru,
    marka: (veriler.marka || '').trim(),
    model: (veriler.model || '').trim(),
    beden: (veriler.beden || '').trim(),
    enStandartlari: _enListesiNormallestir(veriler.enStandartlari),
    verilisTarihi,
    degisimPeriyoduGun: periyot,
    degisimTarihi: veriler.degisimTarihi || zimmetDegisimTarihiHesapla(verilisTarihi, periyot),
    iadeTarihi: veriler.iadeTarihi || '',
    adet: Number(veriler.adet) || 1,
    kondisyon: veriler.kondisyon || 'Yeni',
    durum: veriler.durum || 'Aktif',
    teslimEden: (veriler.teslimEden || '').trim(),
    teslimAlanImza: (veriler.teslimAlanImza || '').trim(),
    notlar: (veriler.notlar || '').trim(),
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}

// Aynı sicil (yoksa ad soyad) için önceki ihlal kayıtlarına bakarak "tekrar"
// bilgisini ve son ihlal tarihini otomatik hesaplar (eski uygulamadaki
// computeRepeatInfo ile aynı mantık). haricTutulanId: bir kaydı güncellerken
// kendisini kendi geçmişiyle karşılaştırmaması için.
function ihlalTekrarBilgisiHesapla(sicil, adSoyad, digerKayitlar, haricTutulanId) {
  const eslesenler = (digerKayitlar || [])
    .filter(k => k.id !== haricTutulanId)
    .filter(k => (sicil ? k.sicil === sicil : k.adSoyad === adSoyad))
    .sort((a, b) => `${b.tarih || ''} ${b.saat || ''}`.localeCompare(`${a.tarih || ''} ${a.saat || ''}`));
  if (!eslesenler.length) return { tekrar: 'Hayır', sonIhlalTarihi: '' };
  return { tekrar: 'Evet', sonIhlalTarihi: eslesenler[0].tarih || '' };
}

function ihlalOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    ihlalNo: veriler.ihlalNo || '',
    tarih: veriler.tarih || new Date().toISOString().slice(0, 10),
    saat: veriler.saat || '',
    adSoyad: (veriler.adSoyad || '').trim(),
    sicil: (veriler.sicil || '').trim(),
    firma: (veriler.firma || '').trim(),
    bolum: (veriler.bolum || '').trim(),
    calismaBolumu: (veriler.calismaBolumu || '').trim(),
    kkd: (veriler.kkd || '').trim(),
    ihlalTuru: veriler.ihlalTuru || '',
    tespitEden: (veriler.tespitEden || '').trim(),
    islem: veriler.islem || '',
    aciklama: (veriler.aciklama || '').trim(),
    tekrar: veriler.tekrar || 'Hayır',
    sonIhlalTarihi: veriler.sonIhlalTarihi || '',
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}
