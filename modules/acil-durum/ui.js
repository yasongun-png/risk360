// Acil Durum Yönetimi ana sayfa DOM işlemleri (Ekipler / Uygunluk / Ekipman /
// Yangın Tüpü / Tatbikat). Tehlike & Senaryo Kartları, Tesis Bilgi Formu ve
// Acil Durum Yönetim Yapısı plan-detay.html/plan-detay-ui.js'e taşındı.

let _adGorunum = 'ekipler';
let _adFirma = null;
let _duzenlenenEkipId = null;
let _duzenlenenEkipmanId = null;
let _duzenlenenYanginTupuId = null;
// Saha Dijital Haritası'ndan "Nokta Ekle" ile buraya yönlendirildiğinde
// (bkz. modules/harita/ui.js) taşınan konum — form kaydedilirken yeni kayda
// eklenir. Düzenlemede kullanılmaz.
let _bekleyenHaritaKonum = null;
let _duzenlenenTatbikatId = null;
// Kullanıcı isteği: "acil durum ekipman kontrollerine her bir kontrol için
// 3 adet fotoğraf ekleyebilmek istiyorum" — tek fotoğraf (_ekipmanFotoUrl)
// yerine 3 slot; alan adları (fotoUrl/fotoUrl2/fotoUrl3) geriye dönük
// uyumluluk için korunuyor (bkz. model.js).
let _ekipmanFotoUrlleri = ['', '', ''];
// Kullanıcı isteği: "acil durum malzeme dolaplarında kontrol yaparken bir
// envanter listesi yapalım ... dolap içerisindeki malzemeler girsin ilk
// etapta sonrasında liste oluşsun kontrollerde de bu kontrol yapılır" —
// yalnızca "Ekipman Dolabı" türünde kullanılan çalışma kopyaları (bkz.
// _ekipmanMalzemeBolumuCiz). _ekipmanMalzemeListesi: {id,ad}[] (kalıcı
// envanter). _ekipmanMalzemeKontrolleri: {[malzemeId]: 'Uygun'|'Uygun Değil'|''}
// (son kontroldeki tik/çarpı işaretleri).
let _ekipmanMalzemeListesi = [];
let _ekipmanMalzemeKontrolleri = {};
// Kullanıcı isteği: "bölüm ekledikçe sekme olarak eklenecek" — Ekipman
// listesindeki Bölüm <select> filtresi yerine firma.ekipmanBolumleri'nden
// türeyen bir sekme çubuğu (bkz. _ekipmanBolumSekmeleriCiz). '' = "Tümü".
let _ekipmanAktifBolum = '';

function _adKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function rozetSinifAdi(durum) {
  return slugOlustur(durum || '');
}

function acilDurumSayfasiniBaslat(firma) {
  _adFirma = firma;

  document.querySelectorAll('[data-sekme]').forEach(btn => {
    btn.addEventListener('click', () => gorunumDegistir(btn.getAttribute('data-sekme')));
  });

  // Katlanabilir form bölümleri (bkz. plan-detay-ui.js planDetaySayfasiniBaslat
  // ile aynı genel desen — bu sayfada şimdilik yalnızca tatbikat KPI bölümü kullanıyor).
  document.querySelectorAll('.form-bolum-baslik.katlanir').forEach(baslik => {
    baslik.addEventListener('click', () => {
      baslik.classList.toggle('kapali');
      const icerik = baslik.nextElementSibling;
      if (icerik && icerik.classList.contains('form-bolum-icerik')) icerik.classList.toggle('kapali');
    });
  });

  // Ekipler
  document.getElementById('yeniEkipBtn').addEventListener('click', () => ekipModalAc());
  document.getElementById('ekipModalKapatBtn').addEventListener('click', ekipModalKapat);
  document.getElementById('ekipModalIptalBtn').addEventListener('click', ekipModalKapat);
  document.getElementById('ekipForm').addEventListener('submit', ekipFormGonderildi);
  document.getElementById('ekipAramaKutusu').addEventListener('input', e => ekipleriCiz(e.target.value));
  document.getElementById('ekipPersonelId').addEventListener('change', ekipPersonelSecildi);

  // Ekipman
  document.getElementById('yeniEkipmanBtn').addEventListener('click', () => ekipmanModalAc());
  document.getElementById('ekipmanModalKapatBtn').addEventListener('click', ekipmanModalKapat);
  document.getElementById('ekipmanModalIptalBtn').addEventListener('click', ekipmanModalKapat);
  document.getElementById('ekipmanForm').addEventListener('submit', ekipmanFormGonderildi);
  // Kullanıcı bildirdi: Kontrol Formu (Word) çıktısında fotoğraf hâlâ
  // görünmüyordu. Kök neden is-izni/ui.js'teki imza sorunuyla birebir aynı
  // (bkz. _izImzaYukle yorumu): fotoYukle önce Firebase Storage'ı dener ve
  // başarılı olursa gerçek https:// Storage adresini döner; bu adres
  // Word/PDF üretiminde (fetch/canvas) CORS engeline takılıp sessizce boş
  // dönebiliyor. Bunun yerine doğrudan fotoSikistir + fotoBuyukKaydet
  // kullanılır -- Storage'a hiç uğranmaz, Firestore'a "fotoref:<id>" olarak
  // yazılır, CORS devreye girmez.
  // Kullanıcı isteği: "direk çekip atabileyim" (kamera) VE "resim olarak da
  // ekleyebilmek istiyorum" (galeriden/dosyadan mevcut bir görsel) -- bazı
  // mobil tarayıcılarda capture="environment" olan bir input SADECE kamerayı
  // açıp galeri seçimini gizleyebiliyor, bu yüzden tek input yerine iki ayrı
  // düğme/gizli input kullanılır; ikisi de aynı yükleme mantığına bağlanır.
  [1, 2, 3].forEach(i => {
    document.getElementById('ekipmanFoto' + i + 'CekBtn').addEventListener('click', () => document.getElementById('ekipmanFoto' + i + 'CekDosya').click());
    document.getElementById('ekipmanFoto' + i + 'SecBtn').addEventListener('click', () => document.getElementById('ekipmanFoto' + i + 'SecDosya').click());
    document.getElementById('ekipmanFoto' + i + 'CekDosya').addEventListener('change', e => _ekipmanFotoSecildi(e, i));
    document.getElementById('ekipmanFoto' + i + 'SecDosya').addEventListener('change', e => _ekipmanFotoSecildi(e, i));
  });
  document.getElementById('ekipmanMalzemeEkleBtn').addEventListener('click', _ekipmanMalzemeEkleTiklandi);
  document.getElementById('ekipmanMalzemeAdi').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); _ekipmanMalzemeEkleTiklandi(); }
  });
  document.getElementById('ekipmanAramaKutusu').addEventListener('input', e => ekipmanlariCiz(e.target.value));
  const ekipmanTurFiltreEl = document.getElementById('ekipmanTurFiltre');
  ekipmanTurFiltreEl.innerHTML += EKIPMAN_TURLERI.map(t => `<option value="${t}">${t}</option>`).join('');
  ekipmanTurFiltreEl.addEventListener('change', () => ekipmanlariCiz(document.getElementById('ekipmanAramaKutusu').value));
  document.getElementById('ekipmanBolumYonetBtn').addEventListener('click', ekipmanBolumYonetModalAc);
  document.getElementById('ekipmanBolumYonetKapatBtn').addEventListener('click', ekipmanBolumYonetModalKapat);
  document.getElementById('ekipmanBolumEkleBtn').addEventListener('click', () => {
    const sonuc = firmaEkipmanBolumuEkle(_adFirma.id, document.getElementById('yeniEkipmanBolumAdi').value);
    if (!sonuc.basarili) { alert(sonuc.hata); return; }
    _adFirma = sonuc.firma;
    document.getElementById('yeniEkipmanBolumAdi').value = '';
    _ekipmanBolumYonetListesiCiz();
  });

  // Yangın Tüpü
  document.getElementById('yeniYanginTupuBtn').addEventListener('click', () => yanginTupuModalAc());
  document.getElementById('yanginTupuModalKapatBtn').addEventListener('click', yanginTupuModalKapat);
  document.getElementById('yanginTupuModalIptalBtn').addEventListener('click', yanginTupuModalKapat);
  document.getElementById('yanginTupuForm').addEventListener('submit', yanginTupuFormGonderildi);
  document.getElementById('yanginTupuAramaKutusu').addEventListener('input', e => yanginTupleriniCiz(e.target.value));
  document.getElementById('yanginTupuSeriNumarasi').addEventListener('input', _yanginTupuSeriNumarasiUyariGuncelle);
  document.getElementById('yanginTupuTumunuSecCheckbox').addEventListener('change', e => {
    document.querySelectorAll('#yanginTupuTabloGovde [data-yangin-tupu-sec]').forEach(cb => { cb.checked = e.target.checked; });
  });
  document.getElementById('yanginTupuSeciliSilBtn').addEventListener('click', yanginTupuSeciliSil);

  // Tatbikat
  document.getElementById('yeniTatbikatBtn').addEventListener('click', () => tatbikatModalAc());
  document.getElementById('tatbikatModalKapatBtn').addEventListener('click', tatbikatModalKapat);
  document.getElementById('tatbikatModalIptalBtn').addEventListener('click', tatbikatModalKapat);
  document.getElementById('tatbikatForm').addEventListener('submit', tatbikatFormGonderildi);
  document.getElementById('tatbikatAramaKutusu').addEventListener('input', e => tatbikatlariCiz(e.target.value));

  _acilDurumExcelRaporBaglantilariniKur();

  // Kullanıcı isteği: "acil durum yönetimini açtığımda ekipman sekmesi
  // seçili gelsin" -- varsayılan açılış sekmesi Ekipler yerine Ekipman.
  gorunumDegistir('ekipman');
}

// ---- Excel / Rapor ----

// Kullanıcı isteği: "çalıştığı bölüm, ad soyad, acil durumdaki görevi,
// fabrikadaki görevi — acil durum ekipleri şablonu bu olacak" — içe/dışa
// aktarma şablonu bu 4 alanla sınırlı (ekipTuru = acil durumdaki görevi,
// gorev = fabrikadaki görevi/unvanı).
const EKIP_IMPORT_KOLONLARI = [
  { anahtar: 'sicilNo', baslik: 'Sicil No' },
  { anahtar: 'bolum', baslik: 'Çalıştığı Bölüm' },
  { anahtar: 'personelAdi', baslik: 'Ad Soyad' },
  { anahtar: 'ekipTuru', baslik: 'Acil Durumdaki Görevi' },
  { anahtar: 'gorev', baslik: 'Fabrikadaki Görevi' }
];

const EKIP_EXPORT_KOLONLARI = [
  { anahtar: 'atamaNo', baslik: 'Atama No' },
  { anahtar: 'sicilNo', baslik: 'Sicil No' },
  { anahtar: 'bolum', baslik: 'Çalıştığı Bölüm' },
  { anahtar: 'personelAdi', baslik: 'Ad Soyad' },
  { anahtar: 'ekipTuru', baslik: 'Acil Durumdaki Görevi' },
  { anahtar: 'gorev', baslik: 'Fabrikadaki Görevi' },
  { anahtar: 'durumGoruntu', baslik: 'Durum' }
];

const EKIPMAN_IMPORT_KOLONLARI = [
  { anahtar: 'tur', baslik: 'Tür' },
  { anahtar: 'bolum', baslik: 'Bölüm' },
  { anahtar: 'lokasyon', baslik: 'Lokasyon' },
  { anahtar: 'periyotGun', baslik: 'Kontrol Periyodu (Gün)' },
  { anahtar: 'sonKontrol', baslik: 'Son Kontrol Tarihi' },
  { anahtar: 'sorumlu', baslik: 'Sorumlu' },
  { anahtar: 'bulgular', baslik: 'Bulgular' }
];

const EKIPMAN_EXPORT_KOLONLARI = [
  { anahtar: 'ekipmanNo', baslik: 'Ekipman No' },
  { anahtar: 'tur', baslik: 'Tür' },
  { anahtar: 'bolum', baslik: 'Bölüm' },
  { anahtar: 'lokasyon', baslik: 'Lokasyon' },
  { anahtar: 'sonKontrol', baslik: 'Son Kontrol' },
  { anahtar: 'sonrakiKontrol', baslik: 'Sonraki Kontrol' },
  { anahtar: 'durumGoruntu', baslik: 'Durum' },
  { anahtar: 'bulgular', baslik: 'Bulgular' }
];

const YANGIN_TUPU_IMPORT_KOLONLARI = [
  { anahtar: 'tupNo', baslik: 'Tüp No' },
  { anahtar: 'tip', baslik: 'Tip' },
  { anahtar: 'kapasite', baslik: 'Kapasite' },
  { anahtar: 'bolum', baslik: 'Bölüm' },
  { anahtar: 'lokasyon', baslik: 'Lokasyon' },
  { anahtar: 'seriNumarasi', baslik: 'Seri Numarası' },
  { anahtar: 'uretici', baslik: 'Üretici' },
  { anahtar: 'uretimTarihi', baslik: 'Üretim Tarihi' },
  { anahtar: 'doluTarihi', baslik: 'Dolum Tarihi' },
  { anahtar: 'yillikBakimTarihi', baslik: 'Yıllık Bakım Tarihi' },
  { anahtar: 'sonrakiYillikBakim', baslik: 'Sonraki Yıllık Bakım' },
  { anahtar: 'hidrostatikTestTarihi', baslik: 'Hidrostatik Test Tarihi' },
  { anahtar: 'sonrakiHidrostatikTest', baslik: 'Sonraki Hidrostatik Test' },
  { anahtar: 'sorumlu', baslik: 'Sorumlu' },
  { anahtar: 'durum', baslik: 'Durum' },
  { anahtar: 'notlar', baslik: 'Notlar' }
];

const YANGIN_TUPU_EXPORT_KOLONLARI = [
  { anahtar: 'tupNo', baslik: 'Tüp No' },
  { anahtar: 'tip', baslik: 'Tip' },
  { anahtar: 'kapasite', baslik: 'Kapasite' },
  { anahtar: 'lokasyon', baslik: 'Lokasyon' },
  { anahtar: 'seriNumarasi', baslik: 'Seri Numarası' },
  { anahtar: 'uretici', baslik: 'Üretici' },
  { anahtar: 'doluTarihi', baslik: 'Dolum Tarihi' },
  { anahtar: 'sonrakiYillikBakim', baslik: 'Sonraki Yıllık Bakım' },
  { anahtar: 'sonrakiHidrostatikTest', baslik: 'Sonraki Hidrostatik Test' },
  { anahtar: 'durumGoruntu', baslik: 'Durum' }
];

const TATBIKAT_EXPORT_KOLONLARI = [
  { anahtar: 'tatbikatNo', baslik: 'Tatbikat No' },
  { anahtar: 'baslik', baslik: 'Başlık' },
  { anahtar: 'tur', baslik: 'Tür' },
  { anahtar: 'planlananTarih', baslik: 'Planlanan' },
  { anahtar: 'gerceklesmeTarihi', baslik: 'Gerçekleşme' },
  { anahtar: 'katilimciSayisi', baslik: 'Katılımcı' },
  { anahtar: 'durumGoruntu', baslik: 'Durum' }
];

// Kullanıcı isteği: "yeniden yüklediğimde eski hali kalıyor, güncellenmesi
// lazım" — normal içe aktarma her satırı hep YENİ kayıt olarak ekliyordu;
// aynı listeyi düzeltip tekrar yüklediğinde bu, aynı tüpler için ikinci bir
// kopya oluşturuyordu. Bunun yerine: satırda Tüp No (veya yoksa Seri
// Numarası) envanterde zaten varsa o kayıt GÜNCELLENİR, yoksa yeni eklenir.
function _yanginTupuIceAktarSatiriUpsert(satir) {
  const tumu = yanginTupleriTumunuGetir();
  const tupNo = (satir.tupNo || '').trim().toLowerCase();
  const seri = (satir.seriNumarasi || '').trim().toLowerCase();
  const mevcut = (tupNo && tumu.find(t => (t.tupNo || '').trim().toLowerCase() === tupNo))
    || (seri && tumu.find(t => (t.seriNumarasi || '').trim().toLowerCase() === seri))
    || null;
  return mevcut ? yanginTupuGuncelle(mevcut.id, satir) : yanginTupuEkle(satir);
}

function _acilDurumExcelRaporBaglantilariniKur() {
  document.getElementById('ekipSablonIndirBtn').addEventListener('click', () => {
    excelSablonIndir(EKIP_IMPORT_KOLONLARI, 'acil_durum_ekip_sablonu.xlsx');
  });
  document.getElementById('ekipDisaAktarBtn').addEventListener('click', () => {
    excelDisaAktar(ekipUyeleriniGetir(''), EKIP_EXPORT_KOLONLARI, 'acil_durum_ekipleri.xlsx');
  });
  document.getElementById('ekipYazdirBtn').addEventListener('click', () => {
    raporListesiYazdir('Acil Durum Ekipleri', _adFirma ? _adFirma.ad : '', EKIP_EXPORT_KOLONLARI, ekipUyeleriniGetir(document.getElementById('ekipAramaKutusu').value));
  });
  // Kullanıcı isteği: "bu şekilde atama yapabileyim kişi bazında" — mevcut
  // arama/filtrede görünen HERKES için ayrı sayfalarda görevlendirme yazısı.
  document.getElementById('ekipGorevlendirmeTopluBtn').addEventListener('click', () => {
    ekipGorevlendirmeYazisiWordOlustur(_adFirma, ekipUyeleriniGetir(document.getElementById('ekipAramaKutusu').value));
  });
  document.getElementById('ekipIceAktarBtn').addEventListener('click', () => document.getElementById('ekipIceAktarDosya').click());
  document.getElementById('ekipIceAktarDosya').addEventListener('change', e => {
    const dosya = e.target.files[0];
    excelIceAktar(dosya, EKIP_IMPORT_KOLONLARI, (satirlar, hataMesaji) => {
      e.target.value = '';
      if (hataMesaji) { alert(hataMesaji); return; }
      satirlar.forEach(satir => { satir.egitimTarihi = excelTarihiNormallestir(satir.egitimTarihi); });
      const sonuc = excelToplulIceAktarSonucOzetle(satirlar, ekipUyesiEkle);
      alert(excelIceAktarOzetMesaji(sonuc));
      ekipleriCiz(document.getElementById('ekipAramaKutusu').value);
    });
  });

  document.getElementById('ekipmanSablonIndirBtn').addEventListener('click', () => {
    excelSablonIndir(EKIPMAN_IMPORT_KOLONLARI, 'acil_durum_ekipman_sablonu.xlsx');
  });
  document.getElementById('ekipmanDisaAktarBtn').addEventListener('click', () => {
    excelDisaAktar(ekipmanlariGetir(''), EKIPMAN_EXPORT_KOLONLARI, 'acil_durum_ekipmanlari.xlsx');
  });
  document.getElementById('ekipmanYazdirBtn').addEventListener('click', () => {
    raporListesiYazdir('Acil Durum Ekipmanları', _adFirma ? _adFirma.ad : '', EKIPMAN_EXPORT_KOLONLARI, ekipmanlariGetir(document.getElementById('ekipmanAramaKutusu').value));
  });
  // Kullanıcı isteği: "yangın ekipmanı türlerine göre ayrı ayrı kontrol
  // formu hazırlayıp word çıktısı alabileyim" — tür filtresi seçiliyse
  // yalnız o türün, seçili değilse kaydı olan HER türün ayrı bölüm/sayfa
  // olarak basıldığı tek bir Word belgesi üretilir.
  // Kullanıcı isteği: "imzaları da word dışında attırmalısın" — imza artık
  // bu düğmeye tıklanınca AÇILAN bir modalda değil, aktif bölüm sekmesinin
  // kendi panelinde önceden alınıp kaydedilmiş olarak kullanılır (bkz.
  // _ekipmanImzaPaneliCiz / firmaEkipmanBolumImzasiKaydet).
  document.getElementById('ekipmanKontrolFormuWordBtn').addEventListener('click', _ekipmanKontrolFormuWordBtnTiklandi);
  document.querySelectorAll('[data-ekipman-imza-temizle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const pad = btn.getAttribute('data-ekipman-imza-temizle') === '1' ? _ekipmanImzaPad1 : _ekipmanImzaPad2;
      if (pad) pad.temizle();
    });
  });
  document.getElementById('ekipmanImzaKaydetBtn').addEventListener('click', _ekipmanImzaKaydetTiklandi);
  // Kullanıcı isteği: "acil durum ekipman kontrolünde word raporu kalsın
  // bir de liste şeklinde rapor olsun" — yukarıdaki (her ekipman ayrı
  // sayfada) detaylı Word raporunun yanında, aynı filtrelerle çalışan,
  // her ekipmanı tek satırda gösteren kompakt bir tablo raporu.
  document.getElementById('ekipmanListeRaporuWordBtn').addEventListener('click', () => {
    ekipmanKontrolFormuListeWordOlustur(_adFirma, document.getElementById('ekipmanTurFiltre').value, _ekipmanAktifBolum);
  });
  // Kullanıcı isteği: "her bir ekipman için barkod üretsin ve çıktı
  // alayım" / "barkod pdf olarak olsun" — o an ekranda görünen (arama +
  // tür + bölüm filtreli) listedeki her ekipman için ekipmanNo'yu
  // kodlayan bir barkod etiketi içeren indirilebilir bir PDF üretir.
  document.getElementById('ekipmanBarkodYazdirBtn').addEventListener('click', ekipmanBarkodlariPdfOlustur);
  // Kullanıcı isteği: "barkodu okuttuğumda o ekipmanın kontrol formunu
  // doldurabileyim tarih otomatik o gün olsun" -- ramak-kala/is-izni/
  // ekipman-bakim ile aynı barkod-formu deseni (bkz. ekipman-kontrol-bildir.html,
  // firma-yonetim.html BARKOD_TIPLERI). Liste ekranı kaybolmasın diye yeni sekmede açılır.
  document.getElementById('ekipmanKontrolBarkoduAcBtn').addEventListener('click', () => {
    if (!_adFirma) return;
    window.open('../../ekipman-kontrol-bildir.html?firma=' + encodeURIComponent(_adFirma.slug), '_blank');
  });
  document.getElementById('ekipmanBarkodTaramaKapatBtn').addEventListener('click', ekipmanBarkodTaramaDurdur);
  // Kullanıcı isteği: "ekipman sayfasında barkod tara kamera veya barkot
  // kontrol formu okutulduğunda o ekipman için bugün yeni kontrol
  // başlatılmış olsun" -- "Yeni Kontrol Başlat" (bölüm bazlı toplu akış)
  // kaldırıldı, barkod tarama artık tek başına ekipman toolbar'ında.
  document.getElementById('ekipmanBarkodTaraBtn').addEventListener('click', ekipmanBarkodTaramaBaslat);
  document.getElementById('ekipmanIceAktarBtn').addEventListener('click', () => document.getElementById('ekipmanIceAktarDosya').click());
  document.getElementById('ekipmanIceAktarDosya').addEventListener('change', e => {
    const dosya = e.target.files[0];
    excelIceAktar(dosya, EKIPMAN_IMPORT_KOLONLARI, (satirlar, hataMesaji) => {
      e.target.value = '';
      if (hataMesaji) { alert(hataMesaji); return; }
      satirlar.forEach(satir => { satir.sonKontrol = excelTarihiNormallestir(satir.sonKontrol); });
      const sonuc = excelToplulIceAktarSonucOzetle(satirlar, ekipmanEkle);
      alert(excelIceAktarOzetMesaji(sonuc));
      _ekipmanBolumSekmeleriCiz();
      ekipmanlariCiz(document.getElementById('ekipmanAramaKutusu').value);
    });
  });

  document.getElementById('yanginTupuSablonIndirBtn').addEventListener('click', () => {
    excelSablonIndir(YANGIN_TUPU_IMPORT_KOLONLARI, 'acil_durum_yangin_tupu_sablonu.xlsx');
  });
  document.getElementById('yanginTupuDisaAktarBtn').addEventListener('click', () => {
    excelDisaAktar(yanginTupleriniGetir(''), YANGIN_TUPU_EXPORT_KOLONLARI, 'acil_durum_yangin_tupleri.xlsx');
  });
  document.getElementById('yanginTupuYazdirBtn').addEventListener('click', () => {
    const liste = yanginTupleriniGetir(document.getElementById('yanginTupuAramaKutusu').value);
    const altBilgi = (_adFirma ? _adFirma.ad : '') + '<br>' + _yanginTupuTurOzetiHtml(liste);
    raporListesiYazdir('Yangın Tüpleri', altBilgi, YANGIN_TUPU_EXPORT_KOLONLARI, liste);
  });
  document.getElementById('yanginTupuIceAktarBtn').addEventListener('click', () => document.getElementById('yanginTupuIceAktarDosya').click());
  document.getElementById('yanginTupuIceAktarDosya').addEventListener('change', e => {
    const dosya = e.target.files[0];
    excelIceAktar(dosya, YANGIN_TUPU_IMPORT_KOLONLARI, (satirlar, hataMesaji) => {
      e.target.value = '';
      if (hataMesaji) { alert(hataMesaji); return; }
      satirlar.forEach(satir => {
        satir.doluTarihi = excelTarihiNormallestir(satir.doluTarihi);
        satir.yillikBakimTarihi = excelTarihiNormallestir(satir.yillikBakimTarihi);
        satir.sonrakiYillikBakim = excelTarihiNormallestir(satir.sonrakiYillikBakim);
        satir.hidrostatikTestTarihi = excelTarihiNormallestir(satir.hidrostatikTestTarihi);
        satir.sonrakiHidrostatikTest = excelTarihiNormallestir(satir.sonrakiHidrostatikTest);
        if (!['Aktif', 'Pasif', 'İptal'].includes(satir.durum)) satir.durum = 'Aktif';
      });
      const sonuc = excelToplulIceAktarSonucOzetle(satirlar, _yanginTupuIceAktarSatiriUpsert);
      alert(excelIceAktarOzetMesaji(sonuc));
      yanginTupleriniCiz(document.getElementById('yanginTupuAramaKutusu').value);
    });
  });

  document.getElementById('tatbikatDisaAktarBtn').addEventListener('click', () => {
    excelDisaAktar(tatbikatlariGetir(''), TATBIKAT_EXPORT_KOLONLARI, 'acil_durum_tatbikatlari.xlsx');
  });
  document.getElementById('tatbikatYazdirBtn').addEventListener('click', () => {
    raporListesiYazdir('Acil Durum Tatbikatları', _adFirma ? _adFirma.ad : '', TATBIKAT_EXPORT_KOLONLARI, tatbikatlariGetir(document.getElementById('tatbikatAramaKutusu').value));
  });
}

function gorunumDegistir(gorunum) {
  _adGorunum = gorunum;
  document.querySelectorAll('[data-sekme]').forEach(btn => {
    btn.classList.toggle('sekme-seciliDegil', btn.getAttribute('data-sekme') !== gorunum);
  });
  ['ekipler', 'uygunluk', 'ekipman', 'yanginTupu', 'tatbikat'].forEach(g => {
    document.getElementById('bolum-' + g).style.display = g === gorunum ? '' : 'none';
  });

  if (gorunum === 'ekipler') ekipleriCiz('');
  else if (gorunum === 'uygunluk') uygunlugCiz();
  else if (gorunum === 'ekipman') {
    // Kullanıcı isteği: "tüm ekipmanlarda kontrol periyodunu 30 gün yap
    // mevcut ekipmanlarda da bu süre değişsin yeniden hesaplansın" --
    // mevcut kayıtlar sekmeye her girişte kontrol edilir (bkz. service.js
    // ekipmanlarPeriyotMigrasyonuUygula, zaten güncel kayıtlar için no-op).
    ekipmanlarPeriyotMigrasyonuUygula();
    _ekipmanBolumSekmeleriCiz();
    ekipmanlariCiz('');
  }
  else if (gorunum === 'yanginTupu') yanginTupleriniCiz('');
  else if (gorunum === 'tatbikat') tatbikatlariCiz('');
}

// ==================== EKİPLER ====================

function ekipleriCiz(aramaMetni) {
  const govde = document.getElementById('ekipTabloGovde');
  const bosDurum = document.getElementById('ekipBosDurum');
  const uyeler = ekipUyeleriniGetir(aramaMetni);

  govde.innerHTML = '';
  if (uyeler.length === 0) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = aramaMetni ? 'Aramanızla eşleşen ekip üyesi bulunamadı.' : 'Henüz ekip üyesi eklenmedi.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  uyeler.forEach(u => {
    const satir = document.createElement('tr');
    satir.innerHTML = `
      <td>
        <button class="tablo-buton" data-duzenle="${u.id}">Düzenle</button>
        <button class="tablo-buton" data-yazi="${u.id}">Görevlendirme Yazısı</button>
        <button class="tablo-buton sil" data-sil="${u.id}">Sil</button>
      </td>
      <td>${_adKacir(u.atamaNo)}</td>
      <td>${_adKacir(u.personelAdi)}</td>
      <td>${_adKacir(u.bolum) || '-'}</td>
      <td>${_adKacir(u.ekipTuru)}</td>
      <td>${_adKacir(u.rol)}</td>
      <td>${_adKacir(u.vardiya)}</td>
      <td>${u.gecerlilikTarihi || '-'}</td>
      <td><span class="genel-rozet rozet-${rozetSinifAdi(u.durumGoruntu)}">${_adKacir(u.durumGoruntu)}</span></td>
    `;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-duzenle]').forEach(btn => btn.addEventListener('click', () => ekipModalAc(ekipUyesiIdIleGetirRepo(btn.getAttribute('data-duzenle')))));
  govde.querySelectorAll('[data-yazi]').forEach(btn => btn.addEventListener('click', () => {
    const uye = ekipUyesiIdIleGetirRepo(btn.getAttribute('data-yazi'));
    if (uye) ekipGorevlendirmeYazisiWordOlustur(_adFirma, [uye]);
  }));
  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', async () => {
    if (await onayModali('Bu ekip üyesini silmek istediğinize emin misiniz?', 'Sil')) { ekipUyesiSil(btn.getAttribute('data-sil')); ekipleriCiz(document.getElementById('ekipAramaKutusu').value); }
  }));
}

function ekipPersonelSecildi() {
  const secim = document.getElementById('ekipPersonelId');
  const personel = personelIdIleGetirRepo(secim.value);
  document.getElementById('ekipSicilNo').value = personel ? personel.sicilNo : '';
  document.getElementById('ekipBolum').value = personel ? personel.bolum : '';
  document.getElementById('ekipGorev').value = personel ? personel.gorev : '';
}

function ekipModalAc(uye) {
  _duzenlenenEkipId = uye ? uye.id : null;
  document.getElementById('ekipModalBaslik').textContent = uye ? 'Ekip Üyesini Düzenle' : 'Yeni Ekip Üyesi';

  const personeller = personelleriGetir('', false);
  document.getElementById('ekipPersonelId').innerHTML = '<option value="">— Personel seçiniz —</option>' +
    personeller.map(p => `<option value="${p.id}" ${uye && uye.personelId === p.id ? 'selected' : ''}>${_adKacir(p.adSoyad)} (${_adKacir(p.sicilNo)})</option>`).join('');

  document.getElementById('ekipSicilNo').value = uye ? uye.sicilNo : '';
  document.getElementById('ekipBolum').value = uye ? uye.bolum : '';
  document.getElementById('ekipGorev').value = uye ? uye.gorev : '';
  document.getElementById('ekipTuru').innerHTML = EKIP_TURLERI.map(t => `<option ${uye && uye.ekipTuru === t ? 'selected' : ''}>${t}</option>`).join('');
  document.getElementById('ekipRol').innerHTML = EKIP_ROLLERI.map(r => `<option ${uye && uye.rol === r ? 'selected' : ''}>${r}</option>`).join('');
  document.getElementById('ekipVardiya').innerHTML = VARDIYALAR.map(v => `<option ${uye && uye.vardiya === v ? 'selected' : ''}>${v}</option>`).join('');
  document.getElementById('ekipTelefon').value = uye ? uye.telefon : '';
  document.getElementById('ekipEgitimTarihi').value = uye ? uye.egitimTarihi : '';
  document.getElementById('ekipGecerlilikTarihi').value = uye ? uye.gecerlilikTarihi : '';
  document.getElementById('ekipDurum').innerHTML = ['Aktif', 'Pasif', 'İptal'].map(d => `<option ${uye && uye.durum === d ? 'selected' : ''}>${d}</option>`).join('');
  document.getElementById('ekipNotlar').value = uye ? uye.notlar : '';

  temizleFormHatalari('ekipForm');
  document.getElementById('ekipModalKatman').classList.add('acik');
}

function ekipModalKapat() {
  document.getElementById('ekipModalKatman').classList.remove('acik');
  _duzenlenenEkipId = null;
}

function ekipFormGonderildi(e) {
  e.preventDefault();
  temizleFormHatalari('ekipForm');

  const secilenPersonel = personelIdIleGetirRepo(document.getElementById('ekipPersonelId').value);
  const veriler = {
    personelId: document.getElementById('ekipPersonelId').value,
    personelAdi: secilenPersonel ? secilenPersonel.adSoyad : '',
    sicilNo: document.getElementById('ekipSicilNo').value,
    bolum: document.getElementById('ekipBolum').value,
    gorev: document.getElementById('ekipGorev').value,
    ekipTuru: document.getElementById('ekipTuru').value,
    rol: document.getElementById('ekipRol').value,
    vardiya: document.getElementById('ekipVardiya').value,
    telefon: document.getElementById('ekipTelefon').value,
    egitimTarihi: document.getElementById('ekipEgitimTarihi').value,
    gecerlilikTarihi: document.getElementById('ekipGecerlilikTarihi').value,
    durum: document.getElementById('ekipDurum').value,
    notlar: document.getElementById('ekipNotlar').value
  };

  const sonuc = _duzenlenenEkipId ? ekipUyesiGuncelle(_duzenlenenEkipId, veriler) : ekipUyesiEkle(veriler);
  if (!sonuc.basarili) { formHatalariniGoster(sonuc.hatalar, 'ekip'); return; }

  ekipModalKapat();
  ekipleriCiz(document.getElementById('ekipAramaKutusu').value);
}

// ==================== UYGUNLUK DEĞERLENDİRMESİ ====================

function uygunlugCiz() {
  const sonuc = uygunlukDegerlendirmesiHesapla(_adFirma);
  const kutu = document.getElementById('uygunlukKutusu');
  const g = sonuc.gereksinim;

  const satirHtml = sonuc.genelDegerlendirme.satirlar.map(s => `
    <tr>
      <td>${s.tur}</td><td>${s.gerekli}</td><td>${s.atanan}</td><td>${s.eksik}</td>
      <td><span class="genel-rozet rozet-${s.uygun ? 'uygun' : 'uygun-degil'}">${s.uygun ? 'Uygun' : 'Uygun Değil'}</span></td>
    </tr>
  `).join('');

  let vardiyaHtml = '';
  if (sonuc.vardiyaDegerlendirme.gecerliMi) {
    vardiyaHtml = `
      <div class="form-bolum-baslik">Vardiya Bazlı Kontrol</div>
      <p style="font-size:12px; color:var(--metin-soluk);">Kullanılan vardiyalar: ${sonuc.vardiyaDegerlendirme.kullanilanVardiyalar.join(', ')}. Her vardiyada her ekip türünden en az 1 kişi bulunmalıdır.</p>
      <div class="tablo-scroll">
        <table class="veri-tablosu">
          <thead><tr><th>Ekip Türü</th>${sonuc.vardiyaDegerlendirme.kullanilanVardiyalar.map(v => `<th>${v}</th>`).join('')}<th>Durum</th></tr></thead>
          <tbody>
            ${sonuc.vardiyaDegerlendirme.satirlar.map(s => `
              <tr>
                <td>${s.tur}</td>
                ${s.vardiyaDurumu.map(v => `<td><span class="genel-rozet rozet-${v.uygun ? 'uygun' : 'uygun-degil'}">${v.atanan}</span></td>`).join('')}
                <td><span class="genel-rozet rozet-${s.uygun ? 'uygun' : 'uygun-degil'}">${s.uygun ? 'Uygun' : 'Uygun Değil'}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  const gecmisUyelerHtml = sonuc.egitimiGecmisUyeler.length
    ? `<ul style="font-size:13px; padding-left:20px;">${sonuc.egitimiGecmisUyeler.map(u => `<li>${_adKacir(u.personelAdi)} — ${_adKacir(u.ekipTuru)} (geçerlilik: ${gunAyYil(u.gecerlilikTarihi)})</li>`).join('')}</ul>`
    : '<div class="bos-durum gorunur">Eğitimi geçmiş ekip üyesi yok.</div>';

  kutu.innerHTML = `
    <div class="istatistik-grid">
      <div class="istatistik-kutu"><span>Tehlike Sınıfı</span><b style="font-size:16px;">${_adKacir(g.tehlikeSinifi)}</b></div>
      <div class="istatistik-kutu"><span>Çalışan Sayısı</span><b>${g.calisanSayisi}</b></div>
      <div class="istatistik-kutu"><span>Genel Durum</span><b>${sonuc.genelDegerlendirme.uygun ? 'Uygun' : sonuc.genelDegerlendirme.toplamEksik + ' Kişi Eksik'}</b></div>
      <div class="istatistik-kutu"><span>Plan Yenileme Süresi</span><b>${g.planYenilemeYili} Yıl</b></div>
    </div>

    <div class="form-bolum-baslik">Mevzuata Göre Gerekli Ekip Sayıları (Md.11, Md.19)</div>
    <div class="tablo-scroll">
      <table class="veri-tablosu">
        <thead><tr><th>Ekip Türü</th><th>Gerekli</th><th>Atanan</th><th>Eksik</th><th>Durum</th></tr></thead>
        <tbody>${satirHtml}</tbody>
      </table>
    </div>

    ${vardiyaHtml}

    <div class="form-bolum-baslik">Eğitim Geçerliliği Geçmiş Ekip Üyeleri</div>
    ${gecmisUyelerHtml}
  `;
}

// ==================== EKİPMAN ====================

// Kullanıcı isteği: "bölüm ekledikçe sekme olarak eklenecek" — Bölüm
// filtresi artık firma.ekipmanBolumleri (yönetilen liste, bkz.
// _ekipmanBolumYonetListesiCiz) üzerinden bir sekme çubuğu olarak çizilir;
// eski sürümde bu, ekipman kayıtlarındaki serbest metin bölüm değerlerinden
// türetiliyordu. "Tümü" sekmesi (_ekipmanAktifBolum === '') her zaman ilk
// sırada durur ve tüm bölümleri birlikte gösterir.
function _ekipmanBolumSekmeleriCiz() {
  const kutu = document.getElementById('ekipmanBolumSekmeleri');
  if (!kutu) return;
  const bolumler = (_adFirma && Array.isArray(_adFirma.ekipmanBolumleri) ? _adFirma.ekipmanBolumleri : []).slice().sort((a, b) => a.localeCompare(b, 'tr'));
  // Aktif sekme bölümler listesinden silinmişse "Tümü"ne dön.
  if (_ekipmanAktifBolum && !bolumler.includes(_ekipmanAktifBolum)) _ekipmanAktifBolum = '';
  const sekmeler = [{ deger: '', etiket: 'Tümü' }].concat(bolumler.map(b => ({ deger: b, etiket: b })));
  kutu.innerHTML = sekmeler.map(s => `
    <button type="button" class="${s.deger === _ekipmanAktifBolum ? '' : 'sekme-seciliDegil'}" data-ekipman-bolum-sekme="${_adKacir(s.deger)}">${_adKacir(s.etiket)}</button>
  `).join('');
  kutu.querySelectorAll('[data-ekipman-bolum-sekme]').forEach(btn => btn.addEventListener('click', () => {
    _ekipmanAktifBolum = btn.getAttribute('data-ekipman-bolum-sekme');
    _ekipmanBolumSekmeleriCiz();
    ekipmanlariCiz(document.getElementById('ekipmanAramaKutusu').value);
  }));
  _ekipmanImzaPaneliCiz();
}

// ==================== EKİPMAN BÖLÜMLERİNİ YÖNET ====================
// Kullanıcı isteği: "acil durum ekipman kontrolünde bölüme yardımcı
// işletmeler ekle" -> "sen buraya bölüm ekleme ve silme ekle" -> "sadece
// bu listeye eklediklerimi liste olarak göster" — modules/egitim/ui.js
// "Eğitim Türlerini Yönet" ile aynı ekle/sil deseni (bkz. core/tenant.js
// firmaEkipmanBolumuEkle/Sil).

// Ekipman formundaki (ve yönetim modalındaki) #ekipmanBolum <select>'ini
// SADECE firma.ekipmanBolumleri listesinden doldurur — seciliDeger o an
// düzenlenen kaydın bölümüyse (liste dışında kalmış eski/serbest veri de
// olsa) kaybolmasın diye seçeneklere eklenir.
function _ekipmanBolumSeceneklerDoldur(secimEl, seciliDeger) {
  if (!secimEl) return;
  const bolumler = (_adFirma && Array.isArray(_adFirma.ekipmanBolumleri) ? _adFirma.ekipmanBolumleri : []).slice().sort((a, b) => a.localeCompare(b, 'tr'));
  const temizSecili = (seciliDeger || '').trim();
  if (temizSecili && !bolumler.includes(temizSecili)) bolumler.push(temizSecili);
  secimEl.innerHTML = '<option value="">— Bölüm seçiniz —</option>' +
    bolumler.map(b => `<option ${temizSecili === b ? 'selected' : ''}>${_adKacir(b)}</option>`).join('');
}

function _ekipmanBolumYonetListesiCiz() {
  const kutu = document.getElementById('ekipmanBolumListesi');
  if (!kutu) return;
  const bolumler = (_adFirma && Array.isArray(_adFirma.ekipmanBolumleri) ? _adFirma.ekipmanBolumleri : []).slice().sort((a, b) => a.localeCompare(b, 'tr'));
  if (!bolumler.length) {
    kutu.innerHTML = '<div style="font-size:12px; color:var(--metin-soluk);">Henüz bölüm tanımlanmadı.</div>';
    return;
  }
  kutu.innerHTML = bolumler.map(b => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:5px 0; border-bottom:1px solid var(--kenarlik);">
      <span>${_adKacir(b)}</span>
      <button type="button" class="tablo-buton sil" data-ekipman-bolum-sil="${_adKacir(b)}">Sil</button>
    </div>
  `).join('');
  kutu.querySelectorAll('[data-ekipman-bolum-sil]').forEach(btn => btn.addEventListener('click', async () => {
    const ad = btn.getAttribute('data-ekipman-bolum-sil');
    if (!(await onayModali(`"${ad}" bölümünü listeden kaldırmak istediğinize emin misiniz? (Bu bölümle daha önce girilmiş ekipman kayıtları etkilenmez.)`, 'Kaldır'))) return;
    const sonuc = firmaEkipmanBolumuSil(_adFirma.id, ad);
    if (sonuc.basarili) {
      _adFirma = sonuc.firma;
      _ekipmanBolumYonetListesiCiz();
    }
  }));
}

function ekipmanBolumYonetModalAc() {
  _ekipmanBolumYonetListesiCiz();
  document.getElementById('yeniEkipmanBolumAdi').value = '';
  document.getElementById('ekipmanBolumYonetModal').classList.add('acik');
}

function ekipmanBolumYonetModalKapat() {
  document.getElementById('ekipmanBolumYonetModal').classList.remove('acik');
  // Modal kapatılırken form açık olabilir (ekipmanModalKatman altında
  // gösteriliyor) — yeni eklenen/silinen bölümler formdaki seçim listesine
  // hemen yansısın.
  const secim = document.getElementById('ekipmanBolum');
  if (secim) _ekipmanBolumSeceneklerDoldur(secim, secim.value);
  // Sekme çubuğu da yeni eklenen/silinen bölümleri hemen yansıtsın.
  _ekipmanBolumSekmeleriCiz();
  ekipmanlariCiz(document.getElementById('ekipmanAramaKutusu').value);
}

// Arama kutusu + tür/bölüm filtrelerinin hepsini birlikte uygular — tabloyu
// çizen ekipmanlariCiz ile barkod yazdırma gibi "ekranda görüneni bas"
// işlemlerinin AYNI filtrelenmiş listeyi kullanması için ortak yardımcı.
function _ekipmanFiltrelenmisListeGetir(aramaMetni) {
  const turFiltre = document.getElementById('ekipmanTurFiltre');
  let liste = ekipmanlariGetir(aramaMetni);
  // Kullanıcı isteği: "ayrı listeler olarak da görebileyim yani yangın
  // tüpleri listesi vb" — türe göre filtrelenmiş, tek ekipman türünün
  // listesi olarak görüntülenebilir.
  if (turFiltre && turFiltre.value) liste = liste.filter(e => e.tur === turFiltre.value);
  // Kullanıcı isteği: "bölüm ekledikçe sekme olarak eklenecek" / "her
  // bölüm için barkod oluşturma ayrı olacak" — aktif bölüm sekmesine göre
  // filtrelenir (bkz. _ekipmanBolumSekmeleriCiz); "Tümü" sekmesinde
  // (_ekipmanAktifBolum === '') hiç filtrelenmez.
  if (_ekipmanAktifBolum) liste = liste.filter(e => (e.bolum || '').trim() === _ekipmanAktifBolum);
  // Kullanıcı isteği: "ekipmanları da ekipman türü ve numaralarına göre
  // sırala sekme içinde" — önce türe (alfabetik), sonra ekipman numarasına
  // (ED-2 / ED-12 gibi sayısal kısmı doğru sıralasın diye numeric:true) göre.
  liste = liste.slice().sort((a, b) =>
    (a.tur || '').localeCompare(b.tur || '', 'tr') ||
    (a.ekipmanNo || '').localeCompare(b.ekipmanNo || '', 'tr', { numeric: true })
  );
  return liste;
}

function ekipmanlariCiz(aramaMetni) {
  const govde = document.getElementById('ekipmanTabloGovde');
  const bosDurum = document.getElementById('ekipmanBosDurum');
  let liste = _ekipmanFiltrelenmisListeGetir(aramaMetni);

  govde.innerHTML = '';
  if (liste.length === 0) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = aramaMetni ? 'Aramanızla eşleşen ekipman bulunamadı.' : 'Henüz ekipman eklenmedi.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  liste.forEach(e => {
    const satir = document.createElement('tr');
    satir.innerHTML = `
      <td>${_adKacir(e.ekipmanNo)}${e.fotoUrl ? ` <a data-foto-ref-href="${e.fotoUrl}" target="_blank" rel="noopener" title="Fotoğrafı büyüt"><img data-foto-ref="${e.fotoUrl}" style="width:22px; height:22px; object-fit:cover; border-radius:4px; vertical-align:middle; border:1px solid var(--kenarlik);"></a>` : ''}</td><td>${_adKacir(e.tur)}</td><td>${_adKacir(e.bolum) || '-'}</td><td>${_adKacir(e.lokasyon)}</td>
      <td>${e.sonKontrol || '-'}</td><td>${e.sonrakiKontrol || '-'}</td>
      <td><span class="genel-rozet rozet-${rozetSinifAdi(e.durumGoruntu)}">${_adKacir(e.durumGoruntu)}</span></td>
      <td>${_adKacir(e.bulgular) || '-'}</td>
      <td>
        <button class="tablo-buton" data-duzenle="${e.id}">Düzenle</button>
        <button class="tablo-buton sil" data-sil="${e.id}">Sil</button>
      </td>
    `;
    govde.appendChild(satir);
  });

  fotoReferanslariCoz(govde);
  govde.querySelectorAll('[data-duzenle]').forEach(btn => btn.addEventListener('click', () => ekipmanModalAc(ekipmanIdIleGetirRepo(btn.getAttribute('data-duzenle')))));
  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', async () => {
    if (await onayModali('Bu ekipmanı silmek istediğinize emin misiniz?', 'Sil')) { ekipmanSil(btn.getAttribute('data-sil')); _ekipmanBolumSekmeleriCiz(); ekipmanlariCiz(document.getElementById('ekipmanAramaKutusu').value); }
  }));
}

// Kullanıcı isteği: "her bir ekipman için barkod üretsin ve çıktı
// alayım" — o an ekranda görünen (arama + tür + bölüm filtreli) listedeki
// her ekipman için Ekipman No'yu kodlayan bir CODE128 barkod etiketi
// basılır (JsBarcode, bkz. index.html script include). core/rapor.js
// _raporYazdirmaAlaniniGoster kullanılmaz çünkü barkodlar SVG içine
// window.print() çağrılmadan ÖNCE senkron olarak çizdirilmeli.
// Kullanıcı isteği: "barkod pdf olarak olsun" — önceki window.print()
// tabanlı sürüm yerine, JsBarcode'un her etiketi bir <canvas>'a çizip
// jsPDF'in bunu doğrudan görsel olarak sayfaya yerleştirdiği, indirilebilir
// gerçek bir .pdf dosyası üretir (html2canvas'a gerek yok, sayfa tam
// kontrollü mm ızgarasıyla diziliyor — bkz. modules/uygunsuzluk/cikti.js
// dosya başı açıklamasındaki "TAM KONTROLLÜ yöntem" ile aynı ilke).
// Etiket metinleri artık jsPDF'in pdf.text() ile DEĞİL, her etiketin tamamı
// tek bir <canvas>'a (tarayıcının kendi font motoruyla, Türkçe karakterler
// dahil doğru biçimde) çizilip pdf.addImage() ile tek görsel olarak
// gömülüyor. jsPDF'in standart fontlarında "ı/ş/ğ" gibi karakterler yok
// (kullanıcı raporu: "Yang1n Dolab1"), ayrıca alt yazı burada elle
// satırlara bölünüp taşmadan önce kırpılıyor.
function _ekBarkodMetniSatirlaraBol(ctx, metin, maksGenislik, maksSatir) {
  if (!metin) return [];
  const kelimeler = metin.split(/\s+/).filter(Boolean);
  const satirlar = [];
  let mevcutSatir = '';
  kelimeler.forEach(kelime => {
    const aday = mevcutSatir ? mevcutSatir + ' ' + kelime : kelime;
    if (ctx.measureText(aday).width <= maksGenislik || !mevcutSatir) {
      mevcutSatir = aday;
    } else {
      satirlar.push(mevcutSatir);
      mevcutSatir = kelime;
    }
  });
  if (mevcutSatir) satirlar.push(mevcutSatir);

  if (satirlar.length > maksSatir) {
    const kesilenler = satirlar.slice(0, maksSatir);
    let sonSatir = kesilenler[maksSatir - 1];
    while (sonSatir.length > 1 && ctx.measureText(sonSatir + '…').width > maksGenislik) {
      sonSatir = sonSatir.slice(0, -1);
    }
    kesilenler[maksSatir - 1] = sonSatir + '…';
    return kesilenler;
  }
  return satirlar;
}

function _ekBarkodEtiketiCanvasOlustur(e, genislikMm, yukseklikMm) {
  const OLCEK = 12;
  const tuval = document.createElement('canvas');
  tuval.width = genislikMm * OLCEK;
  tuval.height = yukseklikMm * OLCEK;
  const ctx = tuval.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, tuval.width, tuval.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const kenarBosluk = 4 * OLCEK;
  const genislikPx = tuval.width;
  const merkezX = genislikPx / 2;

  let baslikBoyut = Math.round(8 * OLCEK / 2.83);
  ctx.font = `bold ${baslikBoyut}px Arial, sans-serif`;
  let baslik = e.tur || '';
  while (baslik && ctx.measureText(baslik).width > genislikPx - kenarBosluk && baslikBoyut > Math.round(5 * OLCEK / 2.83)) {
    baslikBoyut -= 1;
    ctx.font = `bold ${baslikBoyut}px Arial, sans-serif`;
  }
  while (baslik.length > 1 && ctx.measureText(baslik).width > genislikPx - kenarBosluk) {
    baslik = baslik.slice(0, -1);
  }
  if (baslik !== (e.tur || '') && baslik.length > 1) baslik = baslik.slice(0, -1) + '…';
  ctx.fillStyle = '#141414';
  ctx.fillText(baslik, merkezX, 5 * OLCEK);

  const barkodTuval = document.createElement('canvas');
  JsBarcode(barkodTuval, e.ekipmanNo || e.id, { format: 'CODE128', displayValue: true, fontSize: 16, height: 40, margin: 4 });
  const barkodGenislikPx = genislikPx - kenarBosluk;
  const barkodYukseklikPx = barkodTuval.height * (barkodGenislikPx / barkodTuval.width);
  const barkodY = 7 * OLCEK;
  ctx.drawImage(barkodTuval, kenarBosluk / 2, barkodY, barkodGenislikPx, Math.min(barkodYukseklikPx, tuval.height - barkodY - 8 * OLCEK));

  const altYazi = [e.bolum, e.lokasyon].filter(Boolean).join(' — ');
  const altBoyut = Math.round(7 * OLCEK / 2.83);
  ctx.font = `${altBoyut}px Arial, sans-serif`;
  ctx.fillStyle = '#464646';
  const satirlar = _ekBarkodMetniSatirlaraBol(ctx, altYazi, genislikPx - kenarBosluk, 2);
  const satirYuksekligi = altBoyut * 1.25;
  const altBaslangicY = tuval.height - (satirlar.length * satirYuksekligi) - (2 * OLCEK / 2.83);
  satirlar.forEach((satir, i) => {
    ctx.fillText(satir, merkezX, altBaslangicY + i * satirYuksekligi + satirYuksekligi / 2);
  });

  return tuval;
}

function ekipmanBarkodlariPdfOlustur() {
  const liste = _ekipmanFiltrelenmisListeGetir(document.getElementById('ekipmanAramaKutusu').value);
  if (!liste.length) { alert('Barkod basılacak ekipman bulunamadı.'); return; }

  const SAYFA_GENISLIK = 210, SAYFA_YUKSEKLIK = 297, KENAR = 10;
  const ETIKET_GENISLIK = 60, ETIKET_YUKSEKLIK = 30, BOSLUK = 4;
  const SUTUN = Math.floor((SAYFA_GENISLIK - 2 * KENAR + BOSLUK) / (ETIKET_GENISLIK + BOSLUK));
  const SATIR = Math.floor((SAYFA_YUKSEKLIK - 2 * KENAR + BOSLUK) / (ETIKET_YUKSEKLIK + BOSLUK));
  const SAYFA_BASI = SUTUN * SATIR;

  const pdf = new jspdf.jsPDF('p', 'mm', 'a4');
  liste.forEach((e, i) => {
    const sayfaIcindekiSira = i % SAYFA_BASI;
    if (i > 0 && sayfaIcindekiSira === 0) pdf.addPage('a4', 'p');
    const sutun = sayfaIcindekiSira % SUTUN;
    const satir = Math.floor(sayfaIcindekiSira / SUTUN);
    const x = KENAR + sutun * (ETIKET_GENISLIK + BOSLUK);
    const y = KENAR + satir * (ETIKET_YUKSEKLIK + BOSLUK);

    pdf.setDrawColor(51);
    pdf.rect(x, y, ETIKET_GENISLIK, ETIKET_YUKSEKLIK);

    const etiketTuval = _ekBarkodEtiketiCanvasOlustur(e, ETIKET_GENISLIK, ETIKET_YUKSEKLIK);
    pdf.addImage(etiketTuval.toDataURL('image/png'), 'PNG', x, y, ETIKET_GENISLIK, ETIKET_YUKSEKLIK);
  });

  // Kullanıcı isteği: "her bölüm için barkod oluşturma ayrı olacak" —
  // listede zaten aktif sekmenin (bölümün) ekipmanları var; dosya adı da
  // hangi bölüme ait olduğunu göstersin.
  const dosyaBolumEki = _ekipmanAktifBolum ? '_' + _ekipmanAktifBolum.replace(/[^\p{L}\p{N}]+/gu, '_') : '';
  pdf.save(`Ekipman_Barkodlari_${(_adFirma && _adFirma.ad || 'firma').replace(/[^\p{L}\p{N}]+/gu, '_')}${dosyaBolumEki}.pdf`);
}

// ==================== KAMERA İLE BARKOD TARAMA ====================
// Kullanıcı isteği: "uygulamsnın içinde kamera sçan ve barkodu okuyan
// bişey olsun okutunca ilgili ekipmanın kontrol kısmı açılsın", sonra:
// "ekipman sayfasında barkod tara kamera veya barkot kontrol formu
// okutulduğunda o ekipman için bugün yeni kontrol başlatılmış olsun" --
// giriş yapmış kullanıcı, uygulama içinden kamerayla ekipman barkodunu
// (ekipmanBarkodlariPdfOlustur ile basılan CODE128) okutur; eşleşen ekipman
// bulununca kamera durdurulur ve o ekipmanın düzenleme/kontrol modalı,
// Son Kontrol tarihi BUGÜNE ayarlanmış ve kontrol listesi TEMİZ (yeni bir
// kontrol başlatılıyormuş gibi) olarak açılır -- dış/no-login akış olan
// "📷 Barkodla Kontrol Formu" (ekipman-kontrol-bildir.html) ile aynı
// "bugün yeni kontrol" mantığı.
let _ekBarkodTarayici = null;

function ekipmanBarkodTaramaBaslat() {
  if (typeof Html5Qrcode === 'undefined') { alert('Barkod tarama bileşeni yüklenemedi.'); return; }
  const durum = document.getElementById('ekipmanBarkodTaramaDurum');
  durum.textContent = '';
  durum.classList.remove('gorunur');
  document.getElementById('ekipmanBarkodTaramaKatman').classList.add('acik');

  _ekBarkodTarayici = new Html5Qrcode('ekipmanBarkodTaramaOkuyucu', { formatsToSupport: [Html5QrcodeSupportedFormats.CODE_128], verbose: false });
  _ekBarkodTarayici.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: { width: 260, height: 120 } },
    _ekBarkodOkundu,
    () => {}
  ).catch(hata => {
    durum.textContent = 'Kamera açılamadı: ' + (hata.message || hata);
    durum.classList.add('gorunur');
  });
}

function _ekBarkodOkundu(kod) {
  const ekipman = ekipmanlariTumunuGetir().find(e => (e.ekipmanNo || '').trim() === kod.trim() || e.id === kod.trim());
  if (!ekipman) {
    const durum = document.getElementById('ekipmanBarkodTaramaDurum');
    if (durum) {
      durum.textContent = `"${kod}" koduyla eşleşen ekipman bulunamadı, taramaya devam ediliyor…`;
      durum.classList.add('gorunur');
    }
    return;
  }
  ekipmanBarkodTaramaDurdur();
  _ekipmanBarkodIleKontrolBaslat(ekipman);
}

// Kimlik/planlama alanları (ekipmanNo/tür/bölüm/lokasyon/sorumlu/periyot/
// durum) korunur; Son Kontrol bugüne, kontrol cevapları ve bulgular boşa
// ayarlanır -- kaydedince ekipmanFormGonderildi zaten aynı id'yi
// güncelleyeceği için yeni bir kayıt oluşmaz, mevcut ekipmanın kontrolü
// güncellenmiş olur.
function _ekipmanBarkodIleKontrolBaslat(ekipman) {
  ekipmanModalAc(Object.assign({}, ekipman, {
    sonKontrol: bugunIso(),
    kontrolCevaplari: {},
    // malzemeListesi (dolabın kalıcı envanteri) KORUNUR — yalnızca önceki
    // kontrolün tik/çarpı işaretleri (malzemeKontrolleri) temizlenir.
    malzemeKontrolleri: {},
    bulgular: ''
  }));
}

function ekipmanBarkodTaramaDurdur() {
  document.getElementById('ekipmanBarkodTaramaKatman').classList.remove('acik');
  if (_ekBarkodTarayici) {
    const tarayici = _ekBarkodTarayici;
    _ekBarkodTarayici = null;
    tarayici.stop().then(() => tarayici.clear()).catch(() => {});
  }
}

function ekipmanModalAc(ekipman) {
  _duzenlenenEkipmanId = ekipman ? ekipman.id : null;
  document.getElementById('ekipmanModalBaslik').textContent = ekipman ? 'Ekipmanı Düzenle' : 'Yeni Ekipman';
  document.getElementById('ekipmanTur').innerHTML = EKIPMAN_TURLERI.map(t => `<option ${ekipman && ekipman.tur === t ? 'selected' : ''}>${t}</option>`).join('');
  document.getElementById('ekipmanNo').value = ekipman ? ekipman.ekipmanNo : '';
  // Kullanıcı isteği: "bölümler ise listeden seçilsin" -> "acil durum
  // ekipman kontrolünde bölüme yardımcı işletmeler ekle" -> "sen buraya
  // bölüm ekleme ve silme ekle" -> "sadece bu listeye eklediklerimi liste
  // olarak göster" — Bölüm artık firmaya özel, kullanıcının "Bölümleri
  // Yönet" modalından kendi ekleyip sildiği bir listeden seçiliyor (bkz.
  // firma.ekipmanBolumleri, core/tenant.js firmaEkipmanBolumuEkle/Sil).
  _ekipmanBolumSeceneklerDoldur(document.getElementById('ekipmanBolum'), ekipman ? ekipman.bolum : '');
  document.getElementById('ekipmanLokasyon').value = ekipman ? ekipman.lokasyon : '';
  document.getElementById('ekipmanPeriyot').value = ekipman ? ekipman.periyotGun : 90;
  document.getElementById('ekipmanSonKontrol').value = ekipman ? ekipman.sonKontrol : '';
  document.getElementById('ekipmanSonrakiKontrol').value = ekipman ? ekipman.sonrakiKontrol : '';
  document.getElementById('ekipmanSorumlu').value = ekipman ? ekipman.sorumlu : '';
  // Kullanıcı isteği: "bir yerde örneğin kimyasal var, orada göz duşu
  // olması gerekiyor ama şu anda yok, bu eksikliği de yazabilmem lazım" —
  // fiziksel olarak hiç kurulu OLMAYAN gerekli bir ekipman için "Eksik"
  // durumu: normal 90 günlük kontrol döngüsüne girmez (bkz. service.js
  // _ekipmanZenginlestir), sadece bir eksiklik kaydı olarak listede/
  // raporlarda görünür.
  document.getElementById('ekipmanDurum').innerHTML = ['Aktif', 'Pasif', 'Eksik', 'İptal'].map(d => `<option ${ekipman && ekipman.durum === d ? 'selected' : ''}>${d}</option>`).join('');
  document.getElementById('ekipmanBulgular').value = ekipman ? ekipman.bulgular : '';
  document.getElementById('ekipmanNotlar').value = ekipman ? ekipman.notlar : '';
  _ekipmanFotoUrlleri = ekipman ? [ekipman.fotoUrl || '', ekipman.fotoUrl2 || '', ekipman.fotoUrl3 || ''] : ['', '', ''];
  [1, 2, 3].forEach(i => {
    document.getElementById('ekipmanFoto' + i + 'CekDosya').value = '';
    document.getElementById('ekipmanFoto' + i + 'SecDosya').value = '';
    _ekipmanFotoOnizlemeCiz(i);
  });
  _ekipmanKontrolListesiCiz(ekipman);
  _ekipmanMalzemeListesi = ekipman && Array.isArray(ekipman.malzemeListesi) ? ekipman.malzemeListesi.slice() : [];
  _ekipmanMalzemeKontrolleri = ekipman && ekipman.malzemeKontrolleri ? Object.assign({}, ekipman.malzemeKontrolleri) : {};
  _ekipmanMalzemeBolumuCiz();
  document.getElementById('ekipmanTur').onchange = () => { _ekipmanKontrolListesiCiz(ekipman); _ekipmanMalzemeBolumuCiz(); };
  _ekipmanKonumAlaniCiz(ekipman);
  temizleFormHatalari('ekipmanForm');
  document.getElementById('ekipmanModalKatman').classList.add('acik');
}

// Saha Dijital Haritası köprüsü — bkz. modules/uygunsuzluk/ui.js'teki
// _konumAlaniCiz ile aynı desen.
function _ekipmanKonumAlaniCiz(ekipman) {
  const kutu = document.getElementById('ekipmanKonumAlani');
  if (!kutu) return;
  if (_bekleyenHaritaKonum && !ekipman) {
    kutu.innerHTML = '<div style="font-size:12px; color:var(--metin-soluk);">📍 Haritadan seçilen konum bu kayda kaydedilince eklenecek.</div>';
    return;
  }
  if (!ekipman) {
    kutu.innerHTML = '<div style="font-size:12px; color:var(--metin-soluk);">Konum eklemek için önce kaydı oluşturup tekrar açın.</div>';
    return;
  }
  const donusUrl = encodeURIComponent(location.pathname + '?ac=' + ekipman.id);
  if (ekipman.haritaTesisId) {
    kutu.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px; font-size:13px;">
        <span>📍 Haritada işaretli</span>
        <button type="button" class="tablo-buton" id="ekipmanKonumGorBtn">Haritada Gör</button>
      </div>`;
    document.getElementById('ekipmanKonumGorBtn').addEventListener('click', () => {
      window.location.href = `../harita/index.html?odaklanKaynak=acilDurumEkipman&odaklanId=${ekipman.id}`;
    });
  } else {
    kutu.innerHTML = `<button type="button" class="tablo-buton" id="ekipmanKonumEkleBtn">📍 Haritada Konum Ekle</button>`;
    document.getElementById('ekipmanKonumEkleBtn').addEventListener('click', () => {
      window.location.href = `../harita/index.html?konumKaynak=acilDurumEkipman&konumId=${ekipman.id}&donus=${donusUrl}`;
    });
  }
}

// "Fotoğraf Çek" (kamera) ve "Galeriden/Dosyadan Seç" düğmelerinin ortak
// yükleme mantığı -- Storage/CORS sorunundan kaçınmak için doğrudan
// fotoSikistir + fotoBuyukKaydet kullanılır (bkz. yukarıdaki wiring
// yorumu ve is-izni/ui.js _izImzaYukle ile aynı gerekçe). index (1/2/3)
// hangi fotoğraf slotunun doldurulduğunu belirtir (bkz. dosya başı
// _ekipmanFotoUrlleri yorumu).
async function _ekipmanFotoSecildi(e, index) {
  const dosya = e.target.files[0];
  e.target.value = '';
  if (!dosya) return;
  try {
    const dataUrl = await fotoSikistir(dosya, 900, 0.6);
    _ekipmanFotoUrlleri[index - 1] = await fotoBuyukKaydet(dataUrl, _adFirma ? _adFirma.slug : '');
    _ekipmanFotoOnizlemeCiz(index);
  } catch (hata) {
    alert(hata.message || 'Fotoğraf yüklenemedi.');
  }
}

// Kontrol/bulgu fotoğrafı önizlemesi -- modules/kimyasal/ui.js
// _sdsGorseliOnizlemeCiz ile aynı desen (fotoYukle + fotoReferanslariCoz).
function _ekipmanFotoOnizlemeCiz(index) {
  const kutu = document.getElementById('ekipmanFoto' + index + 'Onizleme');
  if (!kutu) return;
  const url = _ekipmanFotoUrlleri[index - 1];
  kutu.innerHTML = url
    ? `<div style="display:flex; align-items:center; gap:8px;">
         <img data-foto-ref="${url}" style="width:56px; height:56px; object-fit:cover; border-radius:8px; border:1px solid var(--kenarlik);">
         <button type="button" class="tablo-buton sil" style="font-size:11px;">Kaldır</button>
       </div>`
    : '<div style="font-size:12px; color:var(--metin-soluk);">Henüz fotoğraf eklenmedi.</div>';
  if (url) {
    kutu.querySelector('button').addEventListener('click', () => { _ekipmanFotoUrlleri[index - 1] = ''; _ekipmanFotoOnizlemeCiz(index); });
    fotoReferanslariCoz(kutu);
  }
}

function ekipmanModalKapat() {
  document.getElementById('ekipmanModalKatman').classList.remove('acik');
  _duzenlenenEkipmanId = null;
}

// "Bulgular" serbest metninin yanına, seçilen ekipman türüne uygun madde
// bazlı kontrol listesi — bkz. model.js EKIPMAN_KONTROL_SORULARI. Tür
// değiştikçe yeniden çizilir (bkz. ekipmanModalAc'taki change dinleyicisi).
function _ekipmanKontrolListesiCiz(ekipman) {
  const kutu = document.getElementById('ekipmanKontrolListesi');
  if (!kutu) return;
  const tur = document.getElementById('ekipmanTur').value;
  const sorular = EKIPMAN_KONTROL_SORULARI[tur] || [];
  const cevaplar = ekipman ? ekipman.kontrolCevaplari || {} : {};
  kutu.innerHTML = sorular.map(s => `
    <div style="display:flex; align-items:center; gap:10px; padding:5px 0; border-bottom:1px solid var(--kenarlik);">
      <span style="flex:1; font-size:13px;">${_adKacir(s.soru)}</span>
      <select data-kontrol-soru="${s.id}" style="width:auto; min-width:150px;">
        <option value="">— Seçilmedi —</option>
        ${EKIPMAN_KONTROL_CEVAP_SECENEKLERI.map(o => `<option value="${o}" ${cevaplar[s.id] === o ? 'selected' : ''}>${o}</option>`).join('')}
      </select>
    </div>
  `).join('');
}

function _ekipmanKontrolListesiTopla() {
  const cevaplar = {};
  document.querySelectorAll('#ekipmanKontrolListesi [data-kontrol-soru]').forEach(sel => {
    cevaplar[sel.getAttribute('data-kontrol-soru')] = sel.value;
  });
  return cevaplar;
}

// ==================== EKİPMAN DOLABI — MALZEME LİSTESİ ====================
// Kullanıcı isteği: "acil durum malzeme dolaplarında kontrol yaparken bir
// envanter listesi yapalım. envanter listesine bir çekiş tarzında tıklamalı
// olsun. uygun uygun değil gibi yani tik ve çarpı olabilir. dolap
// içerisindeki malzemeler girsin ilk etapta. sonrasında liste oluşsun.
// kontrollerde de. bu kontrol yapılır" — bölüm görünürlüğü seçilen türe
// göre (yalnızca "Ekipman Dolabı"), tür değiştikçe yeniden çizilir (bkz.
// ekipmanModalAc'taki onchange).
function _ekipmanMalzemeBolumuCiz() {
  const bolum = document.getElementById('ekipmanMalzemeBolumu');
  if (!bolum) return;
  const gorunurMu = document.getElementById('ekipmanTur').value === 'Ekipman Dolabı';
  bolum.style.display = gorunurMu ? '' : 'none';
  if (!gorunurMu) return;
  _ekipmanMalzemeYonetimListesiCiz();
  _ekipmanMalzemeKontrolListesiCiz();
}

// Dolabın kalıcı envanterini yönetir (ekleme/silme) — kontrol sonucundan
// bağımsız, bir kez tanımlanır ve her kontrolde aynı liste kullanılır.
function _ekipmanMalzemeYonetimListesiCiz() {
  const kutu = document.getElementById('ekipmanMalzemeYonetimListesi');
  if (!kutu) return;
  if (!_ekipmanMalzemeListesi.length) {
    kutu.innerHTML = '<div style="font-size:12px; color:var(--metin-soluk);">Henüz malzeme eklenmedi.</div>';
    return;
  }
  kutu.innerHTML = _ekipmanMalzemeListesi.map(m => `
    <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; padding:4px 0; border-bottom:1px solid var(--kenarlik); font-size:13px;">
      <span style="flex:1;">${_adKacir(m.ad)}</span>
      <input type="number" min="1" value="${m.adet}" data-ekipman-malzeme-adet="${_adKacir(m.id)}" style="width:64px;" title="Adet">
      <button type="button" class="tablo-buton sil" style="font-size:11px;" data-ekipman-malzeme-sil="${_adKacir(m.id)}">Sil</button>
    </div>
  `).join('');
  kutu.querySelectorAll('[data-ekipman-malzeme-adet]').forEach(girdi => girdi.addEventListener('change', () => {
    const id = girdi.getAttribute('data-ekipman-malzeme-adet');
    const kayit = _ekipmanMalzemeListesi.find(m => m.id === id);
    if (kayit) kayit.adet = Math.max(1, Number(girdi.value) || 1);
    _ekipmanMalzemeKontrolListesiCiz();
  }));
  kutu.querySelectorAll('[data-ekipman-malzeme-sil]').forEach(btn => btn.addEventListener('click', () => {
    const id = btn.getAttribute('data-ekipman-malzeme-sil');
    _ekipmanMalzemeListesi = _ekipmanMalzemeListesi.filter(m => m.id !== id);
    delete _ekipmanMalzemeKontrolleri[id];
    _ekipmanMalzemeYonetimListesiCiz();
    _ekipmanMalzemeKontrolListesiCiz();
  }));
}

// Kullanıcı isteği: "dolap içi malzemelerin adetlerini de girebileyim".
function _ekipmanMalzemeEkleTiklandi() {
  const girdi = document.getElementById('ekipmanMalzemeAdi');
  const adetGirdi = document.getElementById('ekipmanMalzemeAdet');
  const ad = girdi.value.trim();
  if (!ad) return;
  const adet = Math.max(1, Number(adetGirdi.value) || 1);
  _ekipmanMalzemeListesi.push({ id: rastgeleId(), ad, adet });
  girdi.value = '';
  adetGirdi.value = '1';
  _ekipmanMalzemeYonetimListesiCiz();
  _ekipmanMalzemeKontrolListesiCiz();
}

// "Çekiş tarzında tıklamalı" tik/çarpı: her dokunuşta Seçilmedi -> Uygun(✓)
// -> Uygun Değil(✗) -> Seçilmedi olarak döner (EKIPMAN_KONTROL_CEVAP_SECENEKLERI
// ile aynı iki durumu kullanır, "İlgili Değil" burada anlamsız olduğu için
// dahil edilmez).
function _ekipmanMalzemeDurumButonuHtml(durum) {
  if (durum === 'Uygun') return { etiket: '✓ Uygun', stil: 'background:#dcfce7; color:#15803d; border-color:#86efac;' };
  if (durum === 'Uygun Değil') return { etiket: '✗ Uygun Değil', stil: 'background:#fee2e2; color:#b91c1c; border-color:#fca5a5;' };
  return { etiket: '— Seçilmedi —', stil: 'background:#f3f4f6; color:var(--metin-soluk); border-color:var(--kenarlik);' };
}

function _ekipmanMalzemeKontrolListesiCiz() {
  const kutu = document.getElementById('ekipmanMalzemeKontrolListesi');
  if (!kutu) return;
  if (!_ekipmanMalzemeListesi.length) {
    kutu.innerHTML = '<div style="font-size:12px; color:var(--metin-soluk);">Kontrol edilecek malzeme yok — önce yukarıdan malzeme ekleyin.</div>';
    return;
  }
  kutu.innerHTML = _ekipmanMalzemeListesi.map(m => {
    const durum = _ekipmanMalzemeKontrolleri[m.id] || '';
    const { etiket, stil } = _ekipmanMalzemeDurumButonuHtml(durum);
    return `
      <div style="display:flex; align-items:center; gap:10px; padding:5px 0; border-bottom:1px solid var(--kenarlik);">
        <span style="flex:1; font-size:13px;">${_adKacir(m.ad)} <span style="color:var(--metin-soluk);">(${m.adet} adet)</span></span>
        <button type="button" data-ekipman-malzeme-durum="${_adKacir(m.id)}" style="width:auto; min-width:130px; border:1.5px solid; border-radius:8px; padding:6px 10px; font-size:12.5px; font-weight:600; cursor:pointer; ${stil}">${etiket}</button>
      </div>
    `;
  }).join('');
  kutu.querySelectorAll('[data-ekipman-malzeme-durum]').forEach(btn => btn.addEventListener('click', () => {
    const id = btn.getAttribute('data-ekipman-malzeme-durum');
    const mevcut = _ekipmanMalzemeKontrolleri[id] || '';
    const sonraki = mevcut === '' ? 'Uygun' : mevcut === 'Uygun' ? 'Uygun Değil' : '';
    if (sonraki) _ekipmanMalzemeKontrolleri[id] = sonraki; else delete _ekipmanMalzemeKontrolleri[id];
    _ekipmanMalzemeKontrolListesiCiz();
  }));
}

function ekipmanFormGonderildi(e) {
  e.preventDefault();
  temizleFormHatalari('ekipmanForm');

  const veriler = {
    ekipmanNo: document.getElementById('ekipmanNo').value,
    tur: document.getElementById('ekipmanTur').value,
    bolum: document.getElementById('ekipmanBolum').value,
    lokasyon: document.getElementById('ekipmanLokasyon').value,
    periyotGun: document.getElementById('ekipmanPeriyot').value,
    sonKontrol: document.getElementById('ekipmanSonKontrol').value,
    sonrakiKontrol: document.getElementById('ekipmanSonrakiKontrol').value,
    sorumlu: document.getElementById('ekipmanSorumlu').value,
    durum: document.getElementById('ekipmanDurum').value,
    bulgular: document.getElementById('ekipmanBulgular').value,
    kontrolCevaplari: _ekipmanKontrolListesiTopla(),
    malzemeListesi: _ekipmanMalzemeListesi,
    malzemeKontrolleri: _ekipmanMalzemeKontrolleri,
    notlar: document.getElementById('ekipmanNotlar').value,
    fotoUrl: _ekipmanFotoUrlleri[0],
    fotoUrl2: _ekipmanFotoUrlleri[1],
    fotoUrl3: _ekipmanFotoUrlleri[2]
  };

  if (!_duzenlenenEkipmanId && _bekleyenHaritaKonum) {
    veriler.haritaTesisId = _bekleyenHaritaKonum.tesisId;
    veriler.haritaX = _bekleyenHaritaKonum.x;
    veriler.haritaY = _bekleyenHaritaKonum.y;
  }

  const sonuc = _duzenlenenEkipmanId ? ekipmanGuncelle(_duzenlenenEkipmanId, veriler) : ekipmanEkle(veriler);
  if (!sonuc.basarili) { formHatalariniGoster(sonuc.hatalar, 'ekipman'); return; }

  _bekleyenHaritaKonum = null;
  ekipmanModalKapat();
  ekipmanlariCiz(document.getElementById('ekipmanAramaKutusu').value);
}

// ==================== YANGIN TÜPÜ ====================

// Kullanıcı isteği: "kaç adet hangi türde yangın tüpü var onları da üstte
// yazsın hatta uygulama ekranında da görebileyim" — tip+kapasite birleşimine
// göre gruplanmış adet özeti; hem ekranda (bkz. #yanginTupuTurOzeti) hem de
// yazdırma çıktısının başında (bkz. yanginTupuYazdirBtn) kullanılıyor.
function _yanginTupuTurOzetiHtml(liste) {
  if (!liste.length) return '';
  const gruplar = {};
  liste.forEach(t => {
    const anahtar = [t.kapasite, t.tip].filter(Boolean).join(' ') || t.tip || 'Belirtilmemiş';
    gruplar[anahtar] = (gruplar[anahtar] || 0) + 1;
  });
  const satirlar = Object.keys(gruplar).sort((a, b) => a.localeCompare(b, 'tr'))
    .map(k => `<span style="display:inline-block; margin:0 14px 6px 0;"><b>${_adKacir(k)}</b>: ${gruplar[k]} adet</span>`).join('');
  return `<div style="font-size:13px;"><b>Toplam ${liste.length} yangın tüpü</b> — ${satirlar}</div>`;
}

function yanginTupleriniCiz(aramaMetni) {
  const govde = document.getElementById('yanginTupuTabloGovde');
  const bosDurum = document.getElementById('yanginTupuBosDurum');
  const liste = yanginTupleriniGetir(aramaMetni);
  const ozetKutusu = document.getElementById('yanginTupuTurOzeti');
  if (ozetKutusu) ozetKutusu.innerHTML = _yanginTupuTurOzetiHtml(liste);

  govde.innerHTML = '';
  if (liste.length === 0) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = aramaMetni ? 'Aramanızla eşleşen yangın tüpü bulunamadı.' : 'Henüz yangın tüpü eklenmedi.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  liste.forEach(t => {
    const uygunDegilVarMi = Object.values(t.kontrolCevaplari || {}).some(c => c === 'Uygun Değil');
    const satir = document.createElement('tr');
    satir.innerHTML = `
      <td><input type="checkbox" data-yangin-tupu-sec data-id="${t.id}"></td>
      <td>
        <button class="tablo-buton" data-duzenle="${t.id}">Düzenle</button>
        <button class="tablo-buton sil" data-sil="${t.id}">Sil</button>
      </td>
      <td>${t.tupNo}</td><td>${t.seriNumarasi || '-'}</td><td>${t.tip}</td><td>${t.kapasite || '-'}</td><td>${t.lokasyon}</td>
      <td>${t.doluTarihi || '-'}</td><td>${t.sonrakiYillikBakim || '-'}</td><td>${t.sonrakiHidrostatikTest || '-'}</td>
      <td>
        <span class="genel-rozet rozet-${rozetSinifAdi(t.durumGoruntu)}">${t.durumGoruntu}</span>
        ${uygunDegilVarMi ? '<span class="yanip-sonen-uyari" title="En az bir kontrol maddesi \'Uygun Değil\' işaretli">⚠️ Kontrol Eksik</span>' : ''}
      </td>
    `;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-duzenle]').forEach(btn => btn.addEventListener('click', () => yanginTupuModalAc(yanginTupuIdIleGetirRepo(btn.getAttribute('data-duzenle')))));
  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', async () => {
    if (await onayModali('Bu yangın tüpünü silmek istediğinize emin misiniz?', 'Sil')) { yanginTupuSil(btn.getAttribute('data-sil')); yanginTupleriniCiz(document.getElementById('yanginTupuAramaKutusu').value); }
  }));
  document.getElementById('yanginTupuTumunuSecCheckbox').checked = false;
}

// Kullanıcı isteği: "toplu silme olması lazım" — özellikle Excel'den
// yanlış içe aktarılan büyük bir listeyi baştan temiz yüklemek için.
async function yanginTupuSeciliSil() {
  const secililer = Array.from(document.querySelectorAll('#yanginTupuTabloGovde [data-yangin-tupu-sec]:checked')).map(cb => cb.getAttribute('data-id'));
  if (!secililer.length) { alert('Lütfen silmek için en az bir yangın tüpü seçin.'); return; }
  if (!(await onayModali(`${secililer.length} yangın tüpü kaydı silinsin mi?`, 'Sil'))) return;

  const sonuc = yanginTupuToplusil(secililer);
  if (!sonuc.basarili) { alert(sonuc.hata); return; }
  alert(`${sonuc.silinen} kayıt silindi.`);
  yanginTupleriniCiz(document.getElementById('yanginTupuAramaKutusu').value);
}

function yanginTupuModalAc(tup) {
  _duzenlenenYanginTupuId = tup ? tup.id : null;
  document.getElementById('yanginTupuModalBaslik').textContent = tup ? 'Yangın Tüpünü Düzenle' : 'Yeni Yangın Tüpü';
  document.getElementById('yanginTupuNo').value = tup ? tup.tupNo : '';
  document.getElementById('yanginTupuTip').innerHTML = YANGIN_TUPU_TIPLERI.map(t => `<option ${tup && tup.tip === t ? 'selected' : ''}>${t}</option>`).join('');
  document.getElementById('yanginTupuKapasite').value = tup ? tup.kapasite : '';
  document.getElementById('yanginTupuBolum').value = tup ? tup.bolum : '';
  document.getElementById('yanginTupuLokasyon').value = tup ? tup.lokasyon : '';
  document.getElementById('yanginTupuSeriNumarasi').value = tup ? tup.seriNumarasi : '';
  document.getElementById('yanginTupuUretici').value = tup ? tup.uretici : '';
  document.getElementById('yanginTupuUretimTarihi').value = tup ? tup.uretimTarihi : '';
  document.getElementById('yanginTupuDoluTarihi').value = tup ? tup.doluTarihi : '';
  document.getElementById('yanginTupuYillikBakimTarihi').value = tup ? tup.yillikBakimTarihi : '';
  document.getElementById('yanginTupuSonrakiYillikBakim').value = tup ? tup.sonrakiYillikBakim : '';
  document.getElementById('yanginTupuHidrostatikTestTarihi').value = tup ? tup.hidrostatikTestTarihi : '';
  document.getElementById('yanginTupuSonrakiHidrostatikTest').value = tup ? tup.sonrakiHidrostatikTest : '';
  document.getElementById('yanginTupuSorumlu').value = tup ? tup.sorumlu : '';
  document.getElementById('yanginTupuDurum').innerHTML = ['Aktif', 'Pasif', 'İptal'].map(d => `<option ${tup && tup.durum === d ? 'selected' : ''}>${d}</option>`).join('');
  document.getElementById('yanginTupuNotlar').value = tup ? tup.notlar : '';
  _yanginTupuKontrolListesiCiz(tup);
  _yanginTupuKonumAlaniCiz(tup);
  _yanginTupuSeriNumarasiUyariGuncelle();
  temizleFormHatalari('yanginTupuForm');
  document.getElementById('yanginTupuModalKatman').classList.add('acik');
}

// "Bulgular" serbest metninin yerine geçen madde bazlı kontrol listesi —
// bkz. model.js YANGIN_TUPU_KONTROL_SORULARI. Her madde Uygun/Uygun Değil/
// İlgili Değil olarak işaretlenir; cevaplar yanginTupuFormGonderildi'de
// data-kontrol-soru niteliğiyle toplanır.
function _yanginTupuKontrolListesiCiz(tup) {
  const kutu = document.getElementById('yanginTupuKontrolListesi');
  const cevaplar = tup ? tup.kontrolCevaplari || {} : {};
  kutu.innerHTML = YANGIN_TUPU_KONTROL_SORULARI.map(s => `
    <div style="display:flex; align-items:center; gap:10px; padding:5px 0; border-bottom:1px solid var(--kenarlik);">
      <span style="flex:1; font-size:13px;">${_adKacir(s.soru)}</span>
      <select data-kontrol-soru="${s.id}" style="width:auto; min-width:150px;">
        <option value="">— Seçilmedi —</option>
        ${YANGIN_TUPU_KONTROL_CEVAP_SECENEKLERI.map(o => `<option value="${o}" ${cevaplar[s.id] === o ? 'selected' : ''}>${o}</option>`).join('')}
      </select>
    </div>
  `).join('');
}

function _yanginTupuKontrolListesiTopla() {
  const cevaplar = {};
  document.querySelectorAll('#yanginTupuKontrolListesi [data-kontrol-soru]').forEach(sel => {
    cevaplar[sel.getAttribute('data-kontrol-soru')] = sel.value;
  });
  return cevaplar;
}

// Formdaki seri numarası alanı, o sırada düzenlenmekte olan kayıt HARİÇ,
// envanterde zaten var olan bir tüple eşleşiyorsa kullanıcıyı uyarır —
// hem manuel girişte hem de etiket taramasından form doldurulduğunda çalışır.
function _yanginTupuSeriNumarasiUyariGuncelle() {
  const uyariEl = document.getElementById('yanginTupuSeriNumarasiUyari');
  const deger = document.getElementById('yanginTupuSeriNumarasi').value;
  const eslesen = yanginTupuSeriNumarasiIleBul(deger);
  if (eslesen && eslesen.id !== _duzenlenenYanginTupuId) {
    uyariEl.textContent = `⚠ Bu seri numaralı tüp zaten listede: ${eslesen.tupNo} — ${eslesen.lokasyon || 'lokasyon belirtilmemiş'}. Yine de kaydederseniz ikinci bir kayıt oluşur.`;
  } else {
    uyariEl.textContent = '';
  }
}

// Saha Dijital Haritası köprüsü — bkz. _ekipmanKonumAlaniCiz ile aynı desen.
function _yanginTupuKonumAlaniCiz(tup) {
  const kutu = document.getElementById('yanginTupuKonumAlani');
  if (!kutu) return;
  if (_bekleyenHaritaKonum && !tup) {
    kutu.innerHTML = '<div style="font-size:12px; color:var(--metin-soluk);">📍 Haritadan seçilen konum bu kayda kaydedilince eklenecek.</div>';
    return;
  }
  if (!tup) {
    kutu.innerHTML = '<div style="font-size:12px; color:var(--metin-soluk);">Konum eklemek için önce kaydı oluşturup tekrar açın.</div>';
    return;
  }
  const donusUrl = encodeURIComponent(location.pathname + '?ac=' + tup.id + '&hedef=yanginTupu');
  if (tup.haritaTesisId) {
    kutu.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px; font-size:13px;">
        <span>📍 Haritada işaretli</span>
        <button type="button" class="tablo-buton" id="yanginTupuKonumGorBtn">Haritada Gör</button>
      </div>`;
    document.getElementById('yanginTupuKonumGorBtn').addEventListener('click', () => {
      window.location.href = `../harita/index.html?odaklanKaynak=acilDurumYanginTupu&odaklanId=${tup.id}`;
    });
  } else {
    kutu.innerHTML = `<button type="button" class="tablo-buton" id="yanginTupuKonumEkleBtn">📍 Haritada Konum Ekle</button>`;
    document.getElementById('yanginTupuKonumEkleBtn').addEventListener('click', () => {
      window.location.href = `../harita/index.html?konumKaynak=acilDurumYanginTupu&konumId=${tup.id}&donus=${donusUrl}`;
    });
  }
}

function yanginTupuModalKapat() {
  document.getElementById('yanginTupuModalKatman').classList.remove('acik');
  _duzenlenenYanginTupuId = null;
}

function yanginTupuFormGonderildi(e) {
  e.preventDefault();
  temizleFormHatalari('yanginTupuForm');

  const veriler = {
    tupNo: document.getElementById('yanginTupuNo').value,
    tip: document.getElementById('yanginTupuTip').value,
    kapasite: document.getElementById('yanginTupuKapasite').value,
    bolum: document.getElementById('yanginTupuBolum').value,
    lokasyon: document.getElementById('yanginTupuLokasyon').value,
    seriNumarasi: document.getElementById('yanginTupuSeriNumarasi').value,
    uretici: document.getElementById('yanginTupuUretici').value,
    uretimTarihi: document.getElementById('yanginTupuUretimTarihi').value,
    doluTarihi: document.getElementById('yanginTupuDoluTarihi').value,
    yillikBakimTarihi: document.getElementById('yanginTupuYillikBakimTarihi').value,
    sonrakiYillikBakim: document.getElementById('yanginTupuSonrakiYillikBakim').value,
    hidrostatikTestTarihi: document.getElementById('yanginTupuHidrostatikTestTarihi').value,
    sonrakiHidrostatikTest: document.getElementById('yanginTupuSonrakiHidrostatikTest').value,
    sorumlu: document.getElementById('yanginTupuSorumlu').value,
    durum: document.getElementById('yanginTupuDurum').value,
    kontrolCevaplari: _yanginTupuKontrolListesiTopla(),
    notlar: document.getElementById('yanginTupuNotlar').value
  };

  if (!_duzenlenenYanginTupuId && _bekleyenHaritaKonum) {
    veriler.haritaTesisId = _bekleyenHaritaKonum.tesisId;
    veriler.haritaX = _bekleyenHaritaKonum.x;
    veriler.haritaY = _bekleyenHaritaKonum.y;
  }

  const sonuc = _duzenlenenYanginTupuId ? yanginTupuGuncelle(_duzenlenenYanginTupuId, veriler) : yanginTupuEkle(veriler);
  if (!sonuc.basarili) { formHatalariniGoster(sonuc.hatalar, 'yanginTupu'); return; }

  _bekleyenHaritaKonum = null;
  yanginTupuModalKapat();
  yanginTupleriniCiz(document.getElementById('yanginTupuAramaKutusu').value);
}

// ==================== TATBİKAT ====================

function tatbikatlariCiz(aramaMetni) {
  const govde = document.getElementById('tatbikatTabloGovde');
  const bosDurum = document.getElementById('tatbikatBosDurum');
  const liste = tatbikatlariGetir(aramaMetni);

  govde.innerHTML = '';
  if (liste.length === 0) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = aramaMetni ? 'Aramanızla eşleşen tatbikat bulunamadı.' : 'Henüz tatbikat eklenmedi.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  liste.forEach(t => {
    const satir = document.createElement('tr');
    satir.innerHTML = `
      <td>${_adKacir(t.tatbikatNo)}</td><td>${_adKacir(t.baslik)}</td><td>${_adKacir(t.tur)}</td>
      <td>${t.planlananTarih || '-'}</td><td>${t.gerceklesmeTarihi || '-'}</td><td>${t.katilimciSayisi || '-'}</td>
      <td><span class="genel-rozet rozet-${rozetSinifAdi(t.durumGoruntu)}">${_adKacir(t.durumGoruntu)}</span></td>
      <td>
        <button class="tablo-buton" data-duzenle="${t.id}">Düzenle</button>
        <button class="tablo-buton sil" data-sil="${t.id}">Sil</button>
      </td>
    `;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-duzenle]').forEach(btn => btn.addEventListener('click', () => tatbikatModalAc(tatbikatIdIleGetirRepo(btn.getAttribute('data-duzenle')))));
  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', async () => {
    if (await onayModali('Bu tatbikatı silmek istediğinize emin misiniz?', 'Sil')) { tatbikatSil(btn.getAttribute('data-sil')); tatbikatlariCiz(document.getElementById('tatbikatAramaKutusu').value); }
  }));
}

function tatbikatModalAc(tatbikat) {
  _duzenlenenTatbikatId = tatbikat ? tatbikat.id : null;
  document.getElementById('tatbikatModalBaslik').textContent = tatbikat ? 'Tatbikatı Düzenle' : 'Yeni Tatbikat';
  document.getElementById('tatbikatBaslik').value = tatbikat ? tatbikat.baslik : '';
  document.getElementById('tatbikatTur').innerHTML = TATBIKAT_TURLERI.map(t => `<option ${tatbikat && tatbikat.tur === t ? 'selected' : ''}>${t}</option>`).join('');
  document.getElementById('tatbikatPlanlananTarih').value = tatbikat ? tatbikat.planlananTarih : '';
  document.getElementById('tatbikatGerceklesmeTarihi').value = tatbikat ? tatbikat.gerceklesmeTarihi : '';
  document.getElementById('tatbikatLokasyon').value = tatbikat ? tatbikat.lokasyon : '';
  document.getElementById('tatbikatKatilimciSayisi').value = tatbikat ? tatbikat.katilimciSayisi : '';
  document.getElementById('tatbikatDurum').innerHTML = ['Planlandı', 'Tamamlandı', 'Ertelendi', 'İptal'].map(d => `<option ${tatbikat && tatbikat.durum === d ? 'selected' : ''}>${d}</option>`).join('');
  document.getElementById('tatbikatBulgular').value = tatbikat ? tatbikat.bulgular : '';
  document.getElementById('tatbikatAksiyonlar').value = tatbikat ? tatbikat.aksiyonlar : '';
  document.getElementById('tatbikatAlarmVerilmeSuresi').value = tatbikat ? tatbikat.alarmVerilmeSuresi : '';
  document.getElementById('tatbikatIlkMudahaleSuresi').value = tatbikat ? tatbikat.ilkMudahaleSuresi : '';
  document.getElementById('tatbikatTahliyeSuresi').value = tatbikat ? tatbikat.tahliyeSuresi : '';
  document.getElementById('tatbikatToplanmaSuresi').value = tatbikat ? tatbikat.toplanmaSuresi : '';
  document.getElementById('tatbikatSayimSuresi').value = tatbikat ? tatbikat.sayimSuresi : '';
  document.getElementById('tatbikatEksikPersonelTespitSuresi').value = tatbikat ? tatbikat.eksikPersonelTespitSuresi : '';
  document.getElementById('tatbikatItfaiyeErisimSuresi').value = tatbikat ? tatbikat.itfaiyeErisimSuresi : '';
  document.getElementById('tatbikatHaberlesmeSuresi').value = tatbikat ? tatbikat.haberlesmeSuresi : '';
  document.getElementById('tatbikatEkipUlasmaSuresi').value = tatbikat ? tatbikat.ekipUlasmaSuresi : '';
  temizleFormHatalari('tatbikatForm');
  document.getElementById('tatbikatModalKatman').classList.add('acik');
}

function tatbikatModalKapat() {
  document.getElementById('tatbikatModalKatman').classList.remove('acik');
  _duzenlenenTatbikatId = null;
}

function tatbikatFormGonderildi(e) {
  e.preventDefault();
  temizleFormHatalari('tatbikatForm');

  const veriler = {
    baslik: document.getElementById('tatbikatBaslik').value,
    tur: document.getElementById('tatbikatTur').value,
    planlananTarih: document.getElementById('tatbikatPlanlananTarih').value,
    gerceklesmeTarihi: document.getElementById('tatbikatGerceklesmeTarihi').value,
    lokasyon: document.getElementById('tatbikatLokasyon').value,
    katilimciSayisi: document.getElementById('tatbikatKatilimciSayisi').value,
    durum: document.getElementById('tatbikatDurum').value,
    bulgular: document.getElementById('tatbikatBulgular').value,
    aksiyonlar: document.getElementById('tatbikatAksiyonlar').value,
    alarmVerilmeSuresi: document.getElementById('tatbikatAlarmVerilmeSuresi').value,
    ilkMudahaleSuresi: document.getElementById('tatbikatIlkMudahaleSuresi').value,
    tahliyeSuresi: document.getElementById('tatbikatTahliyeSuresi').value,
    toplanmaSuresi: document.getElementById('tatbikatToplanmaSuresi').value,
    sayimSuresi: document.getElementById('tatbikatSayimSuresi').value,
    eksikPersonelTespitSuresi: document.getElementById('tatbikatEksikPersonelTespitSuresi').value,
    itfaiyeErisimSuresi: document.getElementById('tatbikatItfaiyeErisimSuresi').value,
    haberlesmeSuresi: document.getElementById('tatbikatHaberlesmeSuresi').value,
    ekipUlasmaSuresi: document.getElementById('tatbikatEkipUlasmaSuresi').value
  };

  const sonuc = _duzenlenenTatbikatId ? tatbikatGuncelle(_duzenlenenTatbikatId, veriler) : tatbikatEkle(veriler);
  if (!sonuc.basarili) { formHatalariniGoster(sonuc.hatalar, 'tatbikat'); return; }

  tatbikatModalKapat();
  tatbikatlariCiz(document.getElementById('tatbikatAramaKutusu').value);
}

// ==================== EKİPMAN KONTROL FORMU İMZA PAD'LERİ ====================
// Kullanıcı isteği: "acil durum ekipman kontrol formları word imza aynı
// tespit öneri kaşe imza gibi imzalansın" — modules/tespit-oneri/ui.js
// _toImzaPaduBagla/_toImzaKirp ile birebir aynı canvas imza pad'i deseni;
// bu modül diğer modüllerin ui.js'ini yüklemediğinden kendi önekiyle (_kf)
// tekrarlanır (aynı ilke modules/uygunsuzluk/cikti.js dosya başında da
// açıklanır). Bu iki genel yardımcı (_kfImzaPaduBagla/_kfImzaKirp), bölüm
// sekmesindeki kalıcı imza panelinde kullanılır (bkz. aşağıda
// _ekipmanImzaPaneliCiz) — artık Word oluşturma anında açılan bir modal
// yok, imza doğrudan firma.ekipmanBolumImzalari altında saklanır.
function _kfImzaPaduBagla(canvasId) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  let dolu = false, ciziliyor = false, sonX = 0, sonY = 0;

  function boyutlandir() {
    const oran = window.devicePixelRatio || 1;
    const genislik = canvas.clientWidth || 300, yukseklik = canvas.clientHeight || 120;
    canvas.width = genislik * oran;
    canvas.height = yukseklik * oran;
    ctx.scale(oran, oran);
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e3a8a';
  }
  boyutlandir();

  function konum(e) {
    const r = canvas.getBoundingClientRect();
    const x = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0].clientX);
    const y = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0].clientY);
    return { x: x - r.left, y: y - r.top };
  }
  function basla(e) { ciziliyor = true; dolu = true; const p = konum(e); sonX = p.x; sonY = p.y; }
  function ciz(e) {
    if (!ciziliyor) return;
    e.preventDefault();
    const p = konum(e);
    ctx.beginPath(); ctx.moveTo(sonX, sonY); ctx.lineTo(p.x, p.y); ctx.stroke();
    sonX = p.x; sonY = p.y;
  }
  function bitir() { ciziliyor = false; }

  canvas.addEventListener('pointerdown', basla);
  canvas.addEventListener('pointermove', ciz);
  window.addEventListener('pointerup', bitir);

  return {
    temizle() { ctx.clearRect(0, 0, canvas.width, canvas.height); dolu = false; },
    doluMu: () => dolu,
    canvasElemani: canvas
  };
}

// Ham canvas geniş/boş bir tuval olduğundan, imza sadece sol tarafa küçük
// çizilmişse Word'de "sola yaslanmış" görünür -- bkz. modules/tespit-oneri/
// ui.js _toImzaKirp ile aynı çözüm: kaydetmeden önce gerçekte boyanmış
// (alpha>0) piksellerin sınırlayıcı kutusuna kırpılır.
function _kfImzaKirp(canvas) {
  const ctx = canvas.getContext('2d');
  const genislik = canvas.width, yukseklik = canvas.height;
  const veri = ctx.getImageData(0, 0, genislik, yukseklik).data;
  let minX = genislik, minY = yukseklik, maxX = 0, maxY = 0, doluVarMi = false;
  for (let y = 0; y < yukseklik; y++) {
    for (let x = 0; x < genislik; x++) {
      if (veri[(y * genislik + x) * 4 + 3] > 10) {
        doluVarMi = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (!doluVarMi) return canvas;
  const bosluk = Math.round(genislik * 0.02);
  minX = Math.max(0, minX - bosluk);
  minY = Math.max(0, minY - bosluk);
  maxX = Math.min(genislik, maxX + bosluk);
  maxY = Math.min(yukseklik, maxY + bosluk);

  const kirpilmis = document.createElement('canvas');
  kirpilmis.width = maxX - minX;
  kirpilmis.height = maxY - minY;
  kirpilmis.getContext('2d').drawImage(canvas, minX, minY, kirpilmis.width, kirpilmis.height, 0, 0, kirpilmis.width, kirpilmis.height);
  return kirpilmis;
}

// Kullanıcı isteği: "imzaları da word dışında attırmalısın" / "genel
// değerlendirmeyi o bölüme özel" — imza + Genel Değerlendirme artık Word
// oluşturma anında AÇILAN bir modalda değil, seçili bölüm sekmesinin
// panelinde alınıp firma.ekipmanBolumImzalari[bölüm] altında KALICI olarak
// saklanır (bkz. core/tenant.js firmaEkipmanBolumImzasiKaydet). Word
// oluşturma ve liste raporu düğmeleri bu kayıtlı imzayı doğrudan kullanır.
let _ekipmanImzaPad1 = null, _ekipmanImzaPad2 = null;

// Sekme değiştikçe (bkz. _ekipmanBolumSekmeleriCiz) çağrılır — "Tümü"
// sekmesinde (tek bir bölüm seçili olmadığından) panel tamamen gizlenir.
function _ekipmanImzaPaneliCiz() {
  const blok = document.getElementById('ekipmanImzaBolumBlok');
  if (!blok) return;
  if (!_ekipmanAktifBolum) { blok.style.display = 'none'; return; }
  blok.style.display = '';

  document.getElementById('ekipmanImzaBolumAdi').textContent = _ekipmanAktifBolum;
  const kayit = (_adFirma && _adFirma.ekipmanBolumImzalari && _adFirma.ekipmanBolumImzalari[_ekipmanAktifBolum]) || null;
  document.getElementById('ekipmanImzaAd1').value = kayit ? kayit.kontrolEdenAd || '' : '';
  document.getElementById('ekipmanImzaAd2').value = kayit ? kayit.bolumSorumlusuAd || '' : '';
  document.getElementById('ekipmanGenelDegerlendirme').value = kayit ? kayit.genelDegerlendirme || '' : '';
  document.getElementById('ekipmanImzaDurum').textContent = (kayit && (kayit.kontrolEdenImza || kayit.bolumSorumlusuImza || kayit.genelDegerlendirme))
    ? `Bu bölüm için son kayıt: ${gunAyYil(kayit.tarih)}. Yeniden imzalamak istemiyorsanız imza alanlarını boş bırakabilirsiniz.`
    : 'Bu bölüm için henüz kayıtlı imza/değerlendirme yok.';

  // Canvas'lar sadece panel görünür olduktan sonra doğru boyutlanabildiği
  // için requestAnimationFrame ile ertelenir (bkz. eski kfImzaModalAc ile
  // aynı gerekçe). Sekme her değiştiğinde önceki çizim temizlenir — kayıtlı
  // imza korunur, sadece BOŞ bırakılan pad kaydedince eski değeri korur
  // (bkz. _ekipmanImzaKaydetTiklandi / _kfImzaKaydiOku ile aynı ilke).
  requestAnimationFrame(() => {
    if (!_ekipmanImzaPad1) _ekipmanImzaPad1 = _kfImzaPaduBagla('ekipmanImzaCanvas1'); else _ekipmanImzaPad1.temizle();
    if (!_ekipmanImzaPad2) _ekipmanImzaPad2 = _kfImzaPaduBagla('ekipmanImzaCanvas2'); else _ekipmanImzaPad2.temizle();
  });
}

// Ad girilmiş VE imza pad'i doluysa yeni dataURL, pad boşsa (kullanıcı
// yeniden imzalamadıysa) mevcut kayıtlı imzayı korur.
function _ekipmanImzaKaydiOku(adInputId, pad, mevcutDataUrl) {
  const ad = document.getElementById(adInputId).value.trim();
  if (pad && pad.doluMu()) return { ad, dataUrl: _kfImzaKirp(pad.canvasElemani).toDataURL('image/png') };
  return { ad, dataUrl: mevcutDataUrl || '' };
}

function _ekipmanImzaKaydetTiklandi() {
  if (!_ekipmanAktifBolum) return;
  const mevcut = (_adFirma.ekipmanBolumImzalari && _adFirma.ekipmanBolumImzalari[_ekipmanAktifBolum]) || {};
  const kontrolEden = _ekipmanImzaKaydiOku('ekipmanImzaAd1', _ekipmanImzaPad1, mevcut.kontrolEdenImza);
  const bolumSorumlusu = _ekipmanImzaKaydiOku('ekipmanImzaAd2', _ekipmanImzaPad2, mevcut.bolumSorumlusuImza);
  const sonuc = firmaEkipmanBolumImzasiKaydet(_adFirma.id, _ekipmanAktifBolum, {
    kontrolEdenAd: kontrolEden.ad,
    kontrolEdenImza: kontrolEden.dataUrl,
    bolumSorumlusuAd: bolumSorumlusu.ad,
    bolumSorumlusuImza: bolumSorumlusu.dataUrl,
    genelDegerlendirme: document.getElementById('ekipmanGenelDegerlendirme').value.trim()
  });
  if (!sonuc.basarili) { alert(sonuc.hata); return; }
  _adFirma = sonuc.firma;
  _ekipmanImzaPaneliCiz();
  alert('İmza ve Genel Değerlendirme kaydedildi.');
}

// Kayıtlı bölüm bazlı Genel Değerlendirme metnini döner — kullanıcı isteği:
// "Kontrol Onayı word den bulunu çıkar" sonrası imzalar artık Word'e
// basılmıyor (yalnızca uygulama içinde kalıcı tutuluyor, bkz.
// _ekipmanImzaPaneliCiz), bu yüzden burada yalnızca gorus taşınır.
function _ekipmanGenelDegerlendirmeGetir(bolum) {
  const kayit = (_adFirma.ekipmanBolumImzalari && _adFirma.ekipmanBolumImzalari[bolum]) || null;
  return kayit ? (kayit.genelDegerlendirme || '') : '';
}

async function _ekipmanKontrolFormuWordBtnTiklandi() {
  const tur = document.getElementById('ekipmanTurFiltre').value;
  const gorus = _ekipmanGenelDegerlendirmeGetir(_ekipmanAktifBolum);
  const dugme = document.getElementById('ekipmanKontrolFormuWordBtn');
  dugme.disabled = true;
  try {
    await ekipmanKontrolFormuWordOlustur(_adFirma, tur, _ekipmanAktifBolum, gorus);
  } catch (hata) {
    console.error(hata);
    alert('Kontrol formu oluşturulamadı: ' + (hata.message || hata));
  } finally {
    dugme.disabled = false;
  }
}

// ==================== Ortak yardımcılar ====================

function temizleFormHatalari(formId) {
  document.querySelectorAll('#' + formId + ' .alan-hatasi').forEach(el => el.textContent = '');
}

// Her formun alan-hatası div id'si <onEk><Alan>Hata şeklindedir (örn. "tatbikatBaslikHata")
// çünkü tüm formlar aynı sayfada birlikte durduğundan salt "baslikHata" gibi genel bir id
// birden fazla formda çakışırdı.
function formHatalariniGoster(hatalar, onEk) {
  Object.keys(hatalar).forEach(alan => {
    const buyukAlan = alan.charAt(0).toUpperCase() + alan.slice(1);
    const hataEl = document.getElementById(onEk + buyukAlan + 'Hata');
    if (hataEl) hataEl.textContent = hatalar[alan];
  });
}
