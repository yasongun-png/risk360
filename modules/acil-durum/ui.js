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
  document.getElementById('ekipmanAramaKutusu').addEventListener('input', e => ekipmanlariCiz(e.target.value));
  const ekipmanTurFiltreEl = document.getElementById('ekipmanTurFiltre');
  ekipmanTurFiltreEl.innerHTML += EKIPMAN_TURLERI.map(t => `<option value="${t}">${t}</option>`).join('');
  ekipmanTurFiltreEl.addEventListener('change', () => ekipmanlariCiz(document.getElementById('ekipmanAramaKutusu').value));
  document.getElementById('ekipmanBolumFiltre').addEventListener('change', () => ekipmanlariCiz(document.getElementById('ekipmanAramaKutusu').value));

  // Yangın Tüpü
  document.getElementById('yeniYanginTupuBtn').addEventListener('click', () => yanginTupuModalAc());
  document.getElementById('yanginTupuModalKapatBtn').addEventListener('click', yanginTupuModalKapat);
  document.getElementById('yanginTupuModalIptalBtn').addEventListener('click', yanginTupuModalKapat);
  document.getElementById('yanginTupuForm').addEventListener('submit', yanginTupuFormGonderildi);
  document.getElementById('yanginTupuAramaKutusu').addEventListener('input', e => yanginTupleriniCiz(e.target.value));
  document.getElementById('yanginTupuSeriNumarasi').addEventListener('input', _yanginTupuSeriNumarasiUyariGuncelle);
  document.getElementById('yanginTupuEtiketTaraBtn').addEventListener('click', yanginTupuEtiketModalAc);
  document.getElementById('yanginTupuEtiketModalKapatBtn').addEventListener('click', yanginTupuEtiketModalKapat);
  document.getElementById('yanginTupuEtiketFotoCekBtn').addEventListener('click', () => document.getElementById('yanginTupuEtiketFotoCekDosya').click());
  document.getElementById('yanginTupuEtiketFotoCekDosya').addEventListener('change', yanginTupuEtiketFotoSecildi);
  document.getElementById('yanginTupuEtiketFotoSecBtn').addEventListener('click', () => document.getElementById('yanginTupuEtiketFotoDosya').click());
  document.getElementById('yanginTupuEtiketFotoDosya').addEventListener('change', yanginTupuEtiketFotoSecildi);
  document.getElementById('yanginTupuEtiketFormaAktarBtn').addEventListener('click', yanginTupuEtiketAktar);
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

  gorunumDegistir('ekipler');
}

// ---- Excel / Rapor ----

const EKIP_IMPORT_KOLONLARI = [
  { anahtar: 'personelAdi', baslik: 'Personel Adı' },
  { anahtar: 'bolum', baslik: 'Bölüm' },
  { anahtar: 'ekipTuru', baslik: 'Ekip Türü' },
  { anahtar: 'rol', baslik: 'Rol' },
  { anahtar: 'vardiya', baslik: 'Vardiya' },
  { anahtar: 'telefon', baslik: 'Telefon' },
  { anahtar: 'egitimTarihi', baslik: 'Eğitim Tarihi' }
];

const EKIP_EXPORT_KOLONLARI = [
  { anahtar: 'atamaNo', baslik: 'Atama No' },
  { anahtar: 'personelAdi', baslik: 'Personel' },
  { anahtar: 'bolum', baslik: 'Bölüm' },
  { anahtar: 'ekipTuru', baslik: 'Ekip Türü' },
  { anahtar: 'rol', baslik: 'Rol' },
  { anahtar: 'vardiya', baslik: 'Vardiya' },
  { anahtar: 'gecerlilikTarihi', baslik: 'Eğitim Geçerlilik' },
  { anahtar: 'durumGoruntu', baslik: 'Durum' }
];

const EKIPMAN_IMPORT_KOLONLARI = [
  { anahtar: 'tur', baslik: 'Tür' },
  { anahtar: 'ad', baslik: 'Ad' },
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
  { anahtar: 'ad', baslik: 'Ad' },
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
  document.getElementById('ekipmanKontrolFormuWordBtn').addEventListener('click', () => {
    ekipmanKontrolFormuWordOlustur(_adFirma, document.getElementById('ekipmanTurFiltre').value, document.getElementById('ekipmanBolumFiltre').value);
  });
  document.getElementById('ekipmanIceAktarBtn').addEventListener('click', () => document.getElementById('ekipmanIceAktarDosya').click());
  document.getElementById('ekipmanIceAktarDosya').addEventListener('change', e => {
    const dosya = e.target.files[0];
    excelIceAktar(dosya, EKIPMAN_IMPORT_KOLONLARI, (satirlar, hataMesaji) => {
      e.target.value = '';
      if (hataMesaji) { alert(hataMesaji); return; }
      satirlar.forEach(satir => { satir.sonKontrol = excelTarihiNormallestir(satir.sonKontrol); });
      const sonuc = excelToplulIceAktarSonucOzetle(satirlar, ekipmanEkle);
      alert(excelIceAktarOzetMesaji(sonuc));
      _ekipmanBolumFiltreDoldur();
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
    raporListesiYazdir('Yangın Tüpleri', _adFirma ? _adFirma.ad : '', YANGIN_TUPU_EXPORT_KOLONLARI, yanginTupleriniGetir(document.getElementById('yanginTupuAramaKutusu').value));
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
  else if (gorunum === 'ekipman') { _ekipmanBolumFiltreDoldur(); ekipmanlariCiz(''); }
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
      <td>${_adKacir(u.atamaNo)}</td>
      <td>${_adKacir(u.personelAdi)}</td>
      <td>${_adKacir(u.bolum) || '-'}</td>
      <td>${_adKacir(u.ekipTuru)}</td>
      <td>${_adKacir(u.rol)}</td>
      <td>${_adKacir(u.vardiya)}</td>
      <td>${u.gecerlilikTarihi || '-'}</td>
      <td><span class="genel-rozet rozet-${rozetSinifAdi(u.durumGoruntu)}">${_adKacir(u.durumGoruntu)}</span></td>
      <td>
        <button class="tablo-buton" data-duzenle="${u.id}">Düzenle</button>
        <button class="tablo-buton sil" data-sil="${u.id}">Sil</button>
      </td>
    `;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-duzenle]').forEach(btn => btn.addEventListener('click', () => ekipModalAc(ekipUyesiIdIleGetirRepo(btn.getAttribute('data-duzenle')))));
  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', async () => {
    if (await onayModali('Bu ekip üyesini silmek istediğinize emin misiniz?', 'Sil')) { ekipUyesiSil(btn.getAttribute('data-sil')); ekipleriCiz(document.getElementById('ekipAramaKutusu').value); }
  }));
}

function ekipPersonelSecildi() {
  const secim = document.getElementById('ekipPersonelId');
  const personel = personelIdIleGetirRepo(secim.value);
  document.getElementById('ekipBolum').value = personel ? personel.bolum : '';
}

function ekipModalAc(uye) {
  _duzenlenenEkipId = uye ? uye.id : null;
  document.getElementById('ekipModalBaslik').textContent = uye ? 'Ekip Üyesini Düzenle' : 'Yeni Ekip Üyesi';

  const personeller = personelleriGetir('', false);
  document.getElementById('ekipPersonelId').innerHTML = '<option value="">— Personel seçiniz —</option>' +
    personeller.map(p => `<option value="${p.id}" ${uye && uye.personelId === p.id ? 'selected' : ''}>${_adKacir(p.adSoyad)} (${_adKacir(p.sicilNo)})</option>`).join('');

  document.getElementById('ekipBolum').value = uye ? uye.bolum : '';
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
    bolum: document.getElementById('ekipBolum').value,
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
    ? `<ul style="font-size:13px; padding-left:20px;">${sonuc.egitimiGecmisUyeler.map(u => `<li>${_adKacir(u.personelAdi)} — ${_adKacir(u.ekipTuru)} (geçerlilik: ${u.gecerlilikTarihi})</li>`).join('')}</ul>`
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

// #ekipmanBolumFiltre seçeneklerini mevcut ekipman kayıtlarındaki bölümlerden
// dinamik doldurur (bkz. modules/uygunsuzluk/ui.js _usBolumFiltreDoldur ile
// aynı desen) — önceki seçim, hâlâ listede varsa korunur.
function _ekipmanBolumFiltreDoldur() {
  const secim = document.getElementById('ekipmanBolumFiltre');
  if (!secim) return;
  const oncekiSecim = secim.value;
  const bolumler = Array.from(new Set(ekipmanlariTumunuGetir().map(e => (e.bolum || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'tr'));
  secim.innerHTML = '<option value="">Tüm Bölümler</option>' + bolumler.map(b => `<option value="${_adKacir(b)}">${_adKacir(b)}</option>`).join('');
  if (bolumler.includes(oncekiSecim)) secim.value = oncekiSecim;
}

function ekipmanlariCiz(aramaMetni) {
  const govde = document.getElementById('ekipmanTabloGovde');
  const bosDurum = document.getElementById('ekipmanBosDurum');
  const turFiltre = document.getElementById('ekipmanTurFiltre');
  const bolumFiltre = document.getElementById('ekipmanBolumFiltre');
  let liste = ekipmanlariGetir(aramaMetni);
  // Kullanıcı isteği: "ayrı listeler olarak da görebileyim yani yangın
  // tüpleri listesi vb" — türe göre filtrelenmiş, tek ekipman türünün
  // listesi olarak görüntülenebilir.
  if (turFiltre && turFiltre.value) liste = liste.filter(e => e.tur === turFiltre.value);
  // Kullanıcı isteği: "bölüm filtresi de olsun ve buna göre rapor
  // hazırlanabilsin" — bölüme göre de filtrelenebiliyor.
  if (bolumFiltre && bolumFiltre.value) liste = liste.filter(e => (e.bolum || '').trim() === bolumFiltre.value);

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
      <td>${_adKacir(e.ekipmanNo)}</td><td>${_adKacir(e.tur)}</td><td>${_adKacir(e.ad)}</td><td>${_adKacir(e.bolum) || '-'}</td><td>${_adKacir(e.lokasyon)}</td>
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

  govde.querySelectorAll('[data-duzenle]').forEach(btn => btn.addEventListener('click', () => ekipmanModalAc(ekipmanIdIleGetirRepo(btn.getAttribute('data-duzenle')))));
  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', async () => {
    if (await onayModali('Bu ekipmanı silmek istediğinize emin misiniz?', 'Sil')) { ekipmanSil(btn.getAttribute('data-sil')); _ekipmanBolumFiltreDoldur(); ekipmanlariCiz(document.getElementById('ekipmanAramaKutusu').value); }
  }));
}

function ekipmanModalAc(ekipman) {
  _duzenlenenEkipmanId = ekipman ? ekipman.id : null;
  document.getElementById('ekipmanModalBaslik').textContent = ekipman ? 'Ekipmanı Düzenle' : 'Yeni Ekipman';
  document.getElementById('ekipmanTur').innerHTML = EKIPMAN_TURLERI.map(t => `<option ${ekipman && ekipman.tur === t ? 'selected' : ''}>${t}</option>`).join('');
  document.getElementById('ekipmanNo').value = ekipman ? ekipman.ekipmanNo : '';
  document.getElementById('ekipmanAd').value = ekipman ? ekipman.ad : '';
  // Kullanıcı isteği: "bölümler ise listeden seçilsin" — personel
  // modülündeki kayıtlı bölüm adlarından oluşan listeden seçiliyor (serbest
  // metin girişi değil). Kaydın mevcut bölümü bu listede yoksa (eski/serbest
  // girilmiş veri) kaybolmasın diye seçeneklere ekleniyor.
  const mevcutBolumler = Array.from(new Set(personelleriGetir('', false).map(p => (p.bolum || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'tr'));
  const ekipmanBolumu = ekipman ? (ekipman.bolum || '').trim() : '';
  if (ekipmanBolumu && !mevcutBolumler.includes(ekipmanBolumu)) mevcutBolumler.push(ekipmanBolumu);
  document.getElementById('ekipmanBolum').innerHTML = '<option value="">— Bölüm seçiniz —</option>' +
    mevcutBolumler.map(b => `<option ${ekipmanBolumu === b ? 'selected' : ''}>${_adKacir(b)}</option>`).join('');
  document.getElementById('ekipmanLokasyon').value = ekipman ? ekipman.lokasyon : '';
  document.getElementById('ekipmanPeriyot').value = ekipman ? ekipman.periyotGun : 30;
  document.getElementById('ekipmanSonKontrol').value = ekipman ? ekipman.sonKontrol : '';
  document.getElementById('ekipmanSonrakiKontrol').value = ekipman ? ekipman.sonrakiKontrol : '';
  document.getElementById('ekipmanSorumlu').value = ekipman ? ekipman.sorumlu : '';
  document.getElementById('ekipmanDurum').innerHTML = ['Aktif', 'Pasif', 'İptal'].map(d => `<option ${ekipman && ekipman.durum === d ? 'selected' : ''}>${d}</option>`).join('');
  document.getElementById('ekipmanBulgular').value = ekipman ? ekipman.bulgular : '';
  document.getElementById('ekipmanNotlar').value = ekipman ? ekipman.notlar : '';
  _ekipmanKontrolListesiCiz(ekipman);
  document.getElementById('ekipmanTur').onchange = () => _ekipmanKontrolListesiCiz(ekipman);
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

function ekipmanFormGonderildi(e) {
  e.preventDefault();
  temizleFormHatalari('ekipmanForm');

  const veriler = {
    ekipmanNo: document.getElementById('ekipmanNo').value,
    tur: document.getElementById('ekipmanTur').value,
    ad: document.getElementById('ekipmanAd').value,
    bolum: document.getElementById('ekipmanBolum').value,
    lokasyon: document.getElementById('ekipmanLokasyon').value,
    periyotGun: document.getElementById('ekipmanPeriyot').value,
    sonKontrol: document.getElementById('ekipmanSonKontrol').value,
    sonrakiKontrol: document.getElementById('ekipmanSonrakiKontrol').value,
    sorumlu: document.getElementById('ekipmanSorumlu').value,
    durum: document.getElementById('ekipmanDurum').value,
    bulgular: document.getElementById('ekipmanBulgular').value,
    kontrolCevaplari: _ekipmanKontrolListesiTopla(),
    notlar: document.getElementById('ekipmanNotlar').value
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

function yanginTupleriniCiz(aramaMetni) {
  const govde = document.getElementById('yanginTupuTabloGovde');
  const bosDurum = document.getElementById('yanginTupuBosDurum');
  const liste = yanginTupleriniGetir(aramaMetni);

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
      <td>${t.tupNo}</td><td>${t.seriNumarasi || '-'}</td><td>${t.tip}</td><td>${t.kapasite || '-'}</td><td>${t.lokasyon}</td>
      <td>${t.doluTarihi || '-'}</td><td>${t.sonrakiYillikBakim || '-'}</td><td>${t.sonrakiHidrostatikTest || '-'}</td>
      <td>
        <span class="genel-rozet rozet-${rozetSinifAdi(t.durumGoruntu)}">${t.durumGoruntu}</span>
        ${uygunDegilVarMi ? '<span class="yanip-sonen-uyari" title="En az bir kontrol maddesi \'Uygun Değil\' işaretli">⚠️ Kontrol Eksik</span>' : ''}
      </td>
      <td>
        <button class="tablo-buton" data-duzenle="${t.id}">Düzenle</button>
        <button class="tablo-buton sil" data-sil="${t.id}">Sil</button>
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

// onSablon: etiket taramasından "Forma Aktar" ile açıldıysa ön dolu alan
// objesi (bkz. yanginTupuEtiketAktar) — sadece yeni kayıtta (tup boşken) kullanılır.
function yanginTupuModalAc(tup, onSablon) {
  _duzenlenenYanginTupuId = tup ? tup.id : null;
  const sablon = (!tup && onSablon) ? onSablon : null;
  document.getElementById('yanginTupuModalBaslik').textContent = tup ? 'Yangın Tüpünü Düzenle' : 'Yeni Yangın Tüpü';
  document.getElementById('yanginTupuNo').value = tup ? tup.tupNo : '';
  document.getElementById('yanginTupuTip').innerHTML = YANGIN_TUPU_TIPLERI.map(t => `<option ${(tup || sablon) && (tup || sablon).tip === t ? 'selected' : ''}>${t}</option>`).join('');
  document.getElementById('yanginTupuKapasite').value = tup ? tup.kapasite : (sablon ? sablon.kapasite || '' : '');
  document.getElementById('yanginTupuBolum').value = tup ? tup.bolum : '';
  document.getElementById('yanginTupuLokasyon').value = tup ? tup.lokasyon : (sablon ? sablon.lokasyon || '' : '');
  document.getElementById('yanginTupuSeriNumarasi').value = tup ? tup.seriNumarasi : (sablon ? sablon.seriNumarasi || '' : '');
  document.getElementById('yanginTupuUretici').value = tup ? tup.uretici : (sablon ? sablon.uretici || '' : '');
  document.getElementById('yanginTupuUretimTarihi').value = tup ? tup.uretimTarihi : (sablon ? sablon.uretimTarihi || '' : '');
  document.getElementById('yanginTupuDoluTarihi').value = tup ? tup.doluTarihi : (sablon ? sablon.doluTarihi || '' : '');
  document.getElementById('yanginTupuYillikBakimTarihi').value = tup ? tup.yillikBakimTarihi : '';
  document.getElementById('yanginTupuSonrakiYillikBakim').value = tup ? tup.sonrakiYillikBakim : (sablon ? sablon.sonrakiYillikBakim || '' : '');
  document.getElementById('yanginTupuHidrostatikTestTarihi').value = tup ? tup.hidrostatikTestTarihi : '';
  document.getElementById('yanginTupuSonrakiHidrostatikTest').value = tup ? tup.sonrakiHidrostatikTest : (sablon ? sablon.sonrakiHidrostatikTest || '' : '');
  document.getElementById('yanginTupuSorumlu').value = tup ? tup.sorumlu : '';
  document.getElementById('yanginTupuDurum').innerHTML = ['Aktif', 'Pasif', 'İptal'].map(d => `<option ${tup && tup.durum === d ? 'selected' : ''}>${d}</option>`).join('');
  document.getElementById('yanginTupuNotlar').value = tup ? tup.notlar : (sablon && sablon.firmaNotu ? 'Etiketten okunan firma bilgisi: ' + sablon.firmaNotu : '');
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

// ---- Etiketten Ekle (OCR) ----
// bkz. modules/acil-durum/etiket-ocr.js — Tesseract.js ile istemci tarafı
// metin tanıma, AI/LLM YOK. Sonuç asla otomatik kaydedilmez.

let _yanginTupuEtiketSonAlanlar = null;

function yanginTupuEtiketModalAc() {
  document.getElementById('yanginTupuEtiketOnizleme').innerHTML = '';
  document.getElementById('yanginTupuEtiketDurum').textContent = '';
  document.getElementById('yanginTupuEtiketSonuc').innerHTML = '';
  document.getElementById('yanginTupuEtiketFormaAktarBtn').style.display = 'none';
  _yanginTupuEtiketSonAlanlar = null;
  document.getElementById('yanginTupuEtiketModalKatman').classList.add('acik');
}

function yanginTupuEtiketModalKapat() {
  document.getElementById('yanginTupuEtiketModalKatman').classList.remove('acik');
}

async function yanginTupuEtiketFotoSecildi(e) {
  const dosya = e.target.files[0];
  e.target.value = '';
  if (!dosya) return;

  document.getElementById('yanginTupuEtiketOnizleme').innerHTML =
    `<img src="${URL.createObjectURL(dosya)}" style="max-width:100%; max-height:220px; border-radius:8px; border:1px solid var(--kenarlik);">`;
  document.getElementById('yanginTupuEtiketSonuc').innerHTML = '';
  document.getElementById('yanginTupuEtiketFormaAktarBtn').style.display = 'none';
  _yanginTupuEtiketSonAlanlar = null;

  const durumEl = document.getElementById('yanginTupuEtiketDurum');
  durumEl.textContent = 'Etiket okunuyor… (0%)';

  try {
    const { alanlar, hamMetin } = await yanginTupuEtiketiOku(dosya, yuzde => {
      durumEl.textContent = `Etiket okunuyor… (${yuzde}%)`;
    });
    durumEl.textContent = 'Okuma tamamlandı — aşağıdaki alanları kontrol edip forma aktarın.';
    _yanginTupuEtiketSonAlanlar = alanlar;
    _yanginTupuEtiketSonucunuCiz(alanlar, hamMetin);
  } catch (hata) {
    console.error(hata);
    durumEl.textContent = 'Etiket okunamadı: ' + (hata && hata.message ? hata.message : hata) + '. Bilgileri formda elle girebilirsiniz.';
  }
}

function _yanginTupuEtiketSonucunuCiz(alanlar, hamMetin) {
  const kutu = document.getElementById('yanginTupuEtiketSonuc');
  const satir = (etiket, deger) => `<tr><td style="font-weight:600; padding:3px 8px 3px 0; white-space:nowrap;">${etiket}</td><td style="padding:3px 0;">${deger || '<span style="color:var(--metin-soluk);">okunamadı</span>'}</td></tr>`;

  // OCR motoru gerçekten hiç metin bulamadıysa (fotoğrafta metin dışı alan
  // ağır bastığında, ışık/netlik yetersiz olduğunda vb.) alan tablosunu
  // "okunamadı" satırlarıyla doldurmak yerine tek bir açık uyarı gösterip
  // fotoğrafı tekrar denemeyi öneriyoruz.
  if (!hamMetin || !hamMetin.trim()) {
    kutu.innerHTML = `
      <div style="background:#fef2f2; border:1px solid #ef4444; border-radius:8px; padding:10px 14px; font-size:13px;">
        ⚠ Fotoğrafta hiç metin tanınamadı. Etikete daha yakından, dik açıdan, parlama/gölge olmadan ve
        net (bulanık olmayan) bir fotoğraf çekmeyi deneyin — sadece etiket kutusunun kadraja büyük
        şekilde girmesi okuma başarısını artırır. Bilgileri formda elle de girebilirsiniz.
      </div>
    `;
    document.getElementById('yanginTupuEtiketFormaAktarBtn').style.display = 'none';
    return;
  }

  const eslesen = alanlar.seriNumarasi ? yanginTupuSeriNumarasiIleBul(alanlar.seriNumarasi) : null;
  const uyariHtml = eslesen
    ? `<div style="background:#fffbeb; border:1px solid #f59e0b; border-radius:8px; padding:8px 12px; margin:10px 0; font-size:13px;">
        ⚠ Bu seri numaralı (${_adKacir(alanlar.seriNumarasi)}) tüp zaten listede: <b>${_adKacir(eslesen.tupNo)}</b> — ${_adKacir(eslesen.lokasyon) || 'lokasyon belirtilmemiş'}.
        Yine de yeni kayıt olarak aktarabilir ya da bu pencereyi kapatıp mevcut kaydı düzenleyebilirsiniz.
      </div>`
    : '';

  kutu.innerHTML = `
    ${uyariHtml}
    <table style="font-size:13px; width:100%;">
      ${satir('Seri Numarası', alanlar.seriNumarasi)}
      ${satir('Üretici', alanlar.uretici)}
      ${satir('Tip', alanlar.tip)}
      ${satir('Kapasite', alanlar.kapasite)}
      ${satir('Bulunduğu Yer', alanlar.lokasyon)}
      ${satir('Üretim Tarihi', alanlar.uretimTarihi)}
      ${satir('Dolum Tarihi', alanlar.doluTarihi)}
      ${satir('Tekrar Dolum Tarihi', alanlar.sonrakiYillikBakim)}
      ${satir('Test Tarihi', alanlar.sonrakiHidrostatikTest)}
    </table>
    <details style="margin-top:8px; font-size:12px; color:var(--metin-soluk);">
      <summary style="cursor:pointer;">Ham OCR metnini gör</summary>
      <pre style="white-space:pre-wrap; font-size:11px; background:#f8fafc; padding:8px; border-radius:6px; margin-top:6px;">${_adKacir(hamMetin)}</pre>
    </details>
  `;
  document.getElementById('yanginTupuEtiketFormaAktarBtn').style.display = '';
}

function yanginTupuEtiketAktar() {
  const alanlar = _yanginTupuEtiketSonAlanlar || {};
  yanginTupuEtiketModalKapat();
  yanginTupuModalAc(null, alanlar);
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
