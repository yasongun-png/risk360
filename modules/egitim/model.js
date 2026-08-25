// Eğitim/sertifika kataloğu ve veri modeli.
// Katalog ve geçerlilik mantığı, eski üretim sistemindeki İSG_CONFIG.TRAININGS
// listesiyle birebir aynı tutulur (isim ve yenileme kuralları değiştirilmez).
//
// hesaplama türleri:
//   'tehlikeSinifi' -> bitiş = tarih + firmanın tehlike sınıfına göre yıl (Temel İSG Eğitimi)
//   'sabit'         -> bitiş = tarih + sabit yıl sayısı
//   'tek'           -> tek seferlik, süresiz (bitiş yok)
//   'dogrudan'      -> "tarih" alanının kendisi zaten son geçerlilik tarihidir (MYK, İlkyardım)

const TEMEL_ISG_YENILEME_YILI = {
  'Az Tehlikeli': 3,
  'Tehlikeli': 2,
  'Çok Tehlikeli': 1
};

const EGITIM_TURLERI = [
  { id: 'temel_isg', ad: 'Temel İSG Eğitimi', hesaplama: 'tehlikeSinifi', saatliMi: true, ikiGunluMu: true },
  { id: 'is_basi', ad: 'İş Başı Eğitimi', hesaplama: 'tek', saatliMi: true },
  { id: 'ise_donus', ad: 'İşe Dönüş Eğitimi', hesaplama: 'sabit', yil: 1, saatliMi: true },
  { id: 'acil_durum', ad: 'Acil Durum Ekip Eğitimi', hesaplama: 'sabit', yil: 1, saatliMi: true },
  { id: 'yukseklik', ad: 'Yüksekte Çalışma Eğitimi', hesaplama: 'sabit', yil: 1, saatliMi: true },
  { id: 'kapali_alan', ad: 'Kapalı Alanda Çalışma Eğitimi', hesaplama: 'sabit', yil: 1, saatliMi: true },
  { id: 'is_izni', ad: 'İş İzni Eğitimi', hesaplama: 'sabit', yil: 1, saatliMi: true },
  { id: 'risk_ekip', ad: 'Risk Değerlendirmesi Ekip Eğitimi', hesaplama: 'tek', saatliMi: true },
  { id: 'myk', ad: 'MYK Belgesi', hesaplama: 'dogrudan', saatliMi: false, belgeAdiVarMi: true },
  { id: 'ilkyardim', ad: 'İlkyardım Sertifikası', hesaplama: 'dogrudan', saatliMi: false },
  { id: 'forklift', ad: 'Forklift Operatörlük Belgesi', hesaplama: 'dogrudan', saatliMi: false },
  { id: 'is_makinasi', ad: 'İş Makinası Operatörlük Belgesi', hesaplama: 'dogrudan', saatliMi: false }
];

// İlkyardım Uygunluk Değerlendirmesi: eski isg platformundaki İSG Eğitim ve
// MYK Raporu'yla birebir aynı oran tablosu (bkz. app-data.js
// buildIlkyardimComplianceByGroup) — tehlike sınıfına göre kaç çalışana bir
// ilkyardımcı gerektiğini belirler.
const ILKYARDIM_GEREKLI_ORAN = {
  'Tehlikeli': 15,
  'Az Tehlikeli': 20
};
const ILKYARDIM_VARSAYILAN_ORAN = 10; // Çok Tehlikeli / belirtilmemiş

// Standart kataloğa (EGITIM_TURLERI) ek olarak firmaya özel eğitim türleri
// (firma.ozelEgitimTurleri, firma-yönetimde/eğitim ekranında düzenlenir —
// kullanıcı isteği: "yeni eğitim türü de ekleyebilmem lazım") çalışma
// zamanında buraya eklenir; böylece dropdown, durum tablosu ve içe aktarım
// eşleştirmesi tek bir kaynaktan (egitimTurleriTumu) okur.
let _ozelEgitimTurleri = [];

function egitimTurleriniAyarla(firma) {
  const ozel = firma && Array.isArray(firma.ozelEgitimTurleri) ? firma.ozelEgitimTurleri : [];
  _ozelEgitimTurleri = ozel.map(t => ({
    id: t.id,
    ad: t.ad,
    hesaplama: 'sabit',
    yil: Number(t.yil) || 1,
    saatliMi: true,
    ozel: true
  }));
}

function egitimTurleriTumu() {
  return EGITIM_TURLERI.concat(_ozelEgitimTurleri);
}

function egitimTuruGetir(id) {
  return egitimTurleriTumu().find(t => t.id === id) || null;
}

function egitimKaydiOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    personelId: veriler.personelId || '',
    egitimTuruId: veriler.egitimTuruId || '',
    tarih: veriler.tarih || '',
    tarih2: veriler.tarih2 || '',
    saat: veriler.saat || '',
    aciklama: veriler.aciklama || '',
    // Kullanıcı isteği: "myk belgesi girişinde pdf ekleme de olsun, belgeyi
    // ekleyip daha sonra indirebileyim veya tıkladığımda açılsın" — "fotoref:
    // <id>" dolaylı referansı (bkz. core/data.js fotoBuyukKaydet); yalnızca
    // belgeAdiVarMi=true olan türlerde (şu an sadece MYK) form üzerinde
    // gösterilir ama alanın kendisi her kayıt türünde saklanabilir.
    belgeDosyasi: veriler.belgeDosyasi || '',
    suresizMi: !!veriler.suresizMi,
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString(),
    // Kayıt listesi bununla sıralanır (kullanıcı isteği: "eğitimler
    // düzenlenme tarihine göre sıralansın") -- yeni kayıtta oluşturma
    // tarihiyle aynı başlar, her düzenlemede service.js tarafından güncellenir.
    guncellemeTarihi: veriler.guncellemeTarihi || veriler.olusturmaTarihi || new Date().toISOString()
  };
}
