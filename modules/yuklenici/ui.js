// Yüklenici Yönetimi ekranının DOM işlemleri.

let _ykGorunum = 'firmalar';
let _duzenlenenFirmaId = null;
let _duzenlenenKisiId = null;
let _duzenlenenAracId = null;
let _firmaEvrakTaslak = [];
let _kisiBelgeTaslak = {};

function ykRozetSinifAdi(durum) {
  return slugOlustur(durum || '');
}

function _ykKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// YYYY-MM-DD -> GG.AA.YYYY (eski uygulamadaki fmtTR ile aynı gösterim).
function formatTarihGoster(isoTarih) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoTarih || '')) return '-';
  const [y, a, g] = isoTarih.split('-');
  return `${g}.${a}.${y}`;
}

// Kullanıcı isteği: "yüklenici kayıtlarını tarihe göre de sıralayabilmek
// istiyorum, benim kaydettiğim tarih ... sisteme kaydettiğim tarihe göre
// seçili gelsin" — Firmalar/Personel/Araç/Kayıtlar listelerinde ortak
// sıralama; varsayılan (ilk seçenek) kayıt tarihi, en yeni üstte.
// Kayıt tarihi = olusturmaTarihi (saatli ISO; aynı gün eklenenler de
// eklenme sırasına göre dizilir). Tarihi olmayan eski kayıtlar sonda kalır.
const YK_SIRALAMA_SECENEKLERI = [
  ['yeni', 'Kayıt Tarihi (Yeniden Eskiye)'],
  ['eski', 'Kayıt Tarihi (Eskiden Yeniye)'],
  ['ad', 'Ada Göre (A-Z)']
];

function _ykSirala(liste, sira, tarihAl, adAl) {
  const kopya = liste.slice();
  if (sira === 'ad') return kopya.sort((a, b) => String(adAl(a) || '').localeCompare(String(adAl(b) || ''), 'tr'));
  const yon = sira === 'eski' ? 1 : -1;
  return kopya.sort((a, b) => {
    const ta = tarihAl(a) || '';
    const tb = tarihAl(b) || '';
    if (!ta || !tb) return ta ? -1 : (tb ? 1 : 0);
    return yon * ta.localeCompare(tb);
  });
}

function _ykSiralamaDegeri(selectId) {
  const el = document.getElementById(selectId);
  return el ? el.value : 'yeni';
}

function _ykKayitTarihiGoster(olusturmaTarihi) {
  return formatTarihGoster((olusturmaTarihi || '').slice(0, 10));
}

function yukleniciSayfasiniBaslat() {
  document.querySelectorAll('[data-sekme]').forEach(btn => btn.addEventListener('click', () => gorunumDegistir(btn.getAttribute('data-sekme'))));

  document.querySelectorAll('select.yk-siralama').forEach(el => {
    el.innerHTML = YK_SIRALAMA_SECENEKLERI.map(([deger, ad]) => `<option value="${deger}">${ad}</option>`).join('');
    el.value = 'yeni';
  });
  document.getElementById('firmaSiralama').addEventListener('change', () => firmalariCiz(document.getElementById('firmaAramaKutusu').value));
  document.getElementById('kisiSiralama').addEventListener('change', () => kisileriCiz(document.getElementById('kisiAramaKutusu').value));
  document.getElementById('aracSiralama').addEventListener('change', () => araclariCiz(document.getElementById('aracAramaKutusu').value));
  document.getElementById('kayitSiralama').addEventListener('change', () => kayitlariCiz(document.getElementById('kayitAramaKutusu').value));

  // Kullanıcı isteği: "personel ekle üst sağ boşlukta büyük buton olarak
  // dursun" — hangi sekmede olunursa olunsun tek tıkla personel eklenebilsin.
  // "Yüklenici Personeli" sekmesi kaldırıldığı için Personel Kayıtları'na geçer.
  document.getElementById('hizliPersonelEkleBtn').addEventListener('click', () => {
    gorunumDegistir('kayitlar');
    kisiModalAc();
  });
  // Kullanıcı isteği: "personel ekle butonu yanına birden fazla butonu koy,
  // direk 5 kişilik açılsın istediğim kadar doldurabileyim".
  document.getElementById('hizliTopluPersonelBtn').addEventListener('click', () => {
    gorunumDegistir('kayitlar');
    topluKisiAc();
  });
  document.getElementById('yeniTopluKisiBtn').addEventListener('click', () => topluKisiAc());

  document.getElementById('yeniFirmaBtn').addEventListener('click', () => firmaModalAc());
  document.getElementById('firmaModalKapatBtn').addEventListener('click', firmaModalKapat);
  document.getElementById('firmaModalIptalBtn').addEventListener('click', firmaModalKapat);
  document.getElementById('firmaForm').addEventListener('submit', firmaFormGonderildi);
  document.getElementById('firmaAdi').addEventListener('input', _firmaBenzerUyarisiniCiz);
  document.getElementById('firmaAramaKutusu').addEventListener('input', e => firmalariCiz(e.target.value));

  document.getElementById('yeniKisiBtn').addEventListener('click', () => kisiModalAc());
  document.getElementById('kisiModalKapatBtn').addEventListener('click', kisiModalKapat);
  document.getElementById('kisiModalIptalBtn').addEventListener('click', kisiModalKapat);
  _topluKisiBaslat();
  // Dokümanlar sekmesi (ortak bileşen, bkz. core/dokumanlar.js).
  dokumanKutuphanesiniKur(document.getElementById('bolum-formlar'));
  yukleniciDegerlendirmeBaslat();
  document.getElementById('kisiFirmaId').addEventListener('change', () => {
    _kisiFirmaSeciliGorunum();
    if (_kisiFirmaTehlikesiniUygula()) _kisiBelgeListesiniCiz();
  });
  document.getElementById('kisiForm').addEventListener('submit', kisiFormGonderildi);
  document.getElementById('kisiMailEksikBtn').addEventListener('click', () => mailEksikAc([{
    adSoyad: document.getElementById('adSoyad').value,
    firmaId: document.getElementById('kisiFirmaId').value,
    tehlikeSinifi: document.getElementById('kisiTehlikeSinifi').value,
    personelTuru: document.getElementById('kisiPersonelTuru').value,
    ilkGiris: document.getElementById('kisiIlkGiris').checked,
    belgeler: _kisiBelgeTaslak
  }]));
  document.getElementById('topluKisiMailEksikBtn').addEventListener('click', () => {
    const dolu = _topluKisiTaslaklari.map((_, i) => _topluKisiVerisiniOku(i)).filter(_topluKisiSutunuDoluMu);
    if (!dolu.length) { document.getElementById('topluKisiGenelHata').textContent = 'Eksiklik listesi için en az bir personelin ad soyadını girin.'; return; }
    document.getElementById('topluKisiGenelHata').textContent = '';
    mailEksikAc(dolu);
  });
  document.getElementById('mailEksikKapatBtn').addEventListener('click', () => document.getElementById('mailEksikKatman').classList.remove('acik'));
  document.getElementById('mailEksikKopyalaBtn').addEventListener('click', _mailEksikKopyala);
  document.getElementById('kisiAramaKutusu').addEventListener('input', e => kisileriCiz(e.target.value));
  document.getElementById('kisiDurumFiltre').addEventListener('change', () => kisileriCiz(document.getElementById('kisiAramaKutusu').value));
  document.getElementById('kisiTehlikeSinifi').addEventListener('change', _kisiBelgeListesiniCiz);
  document.getElementById('kisiPersonelTuru').addEventListener('change', _kisiBelgeListesiniCiz);
  document.getElementById('kisiIlkGiris').addEventListener('change', _kisiCanliDurumuGuncelle);

  document.getElementById('firmaSablonIndirBtn').addEventListener('click', () => {
    excelSablonIndir(YUKLENICI_FIRMA_IMPORT_KOLONLARI, 'yuklenici_firma_sablonu.xlsx');
  });
  document.getElementById('firmaDisaAktarBtn').addEventListener('click', () => {
    excelDisaAktar(yukleniciFirmalariniGetir('').map(f => Object.assign({}, f, { tehlikeSinifiGoruntu: YUKLENICI_TEHLIKE_SINIFI_ETIKETLERI[f.tehlikeSinifi] || '' })), YUKLENICI_FIRMA_EXPORT_KOLONLARI, 'yuklenici_firmalari.xlsx');
  });
  document.getElementById('firmaIceAktarBtn').addEventListener('click', () => document.getElementById('firmaIceAktarDosya').click());
  document.getElementById('mukerrerFirmaBtn').addEventListener('click', mukerrerFirmalarAc);
  document.getElementById('mukerrerFirmaKapatBtn').addEventListener('click', () => document.getElementById('mukerrerFirmaKatman').classList.remove('acik'));
  document.getElementById('firmaIceAktarDosya').addEventListener('change', e => {
    const dosya = e.target.files[0];
    excelIceAktar(dosya, YUKLENICI_FIRMA_IMPORT_KOLONLARI, (satirlar, hataMesaji) => {
      e.target.value = '';
      if (hataMesaji) { alert(hataMesaji); return; }
      const sonuc = excelToplulIceAktarSonucOzetle(satirlar, yukleniciFirmaEkle);
      alert(excelIceAktarOzetMesaji(sonuc));
      firmalariCiz(document.getElementById('firmaAramaKutusu').value);
    });
  });

  document.getElementById('kisiSablonIndirBtn').addEventListener('click', () => {
    excelSablonIndir(YUKLENICI_KISI_IMPORT_KOLONLARI, 'yuklenici_personel_sablonu.xlsx');
  });
  document.getElementById('kisiDisaAktarBtn').addEventListener('click', () => {
    excelDisaAktar(yukleniciKisileriniGetir('', {}), YUKLENICI_KISI_EXPORT_KOLONLARI, 'yuklenici_personeli.xlsx');
  });
  document.getElementById('kisiIceAktarBtn').addEventListener('click', () => document.getElementById('kisiIceAktarDosya').click());
  document.getElementById('kisiIceAktarDosya').addEventListener('change', e => {
    const dosya = e.target.files[0];
    excelIceAktar(dosya, YUKLENICI_KISI_IMPORT_KOLONLARI, (satirlar, hataMesaji) => {
      e.target.value = '';
      if (hataMesaji) { alert(hataMesaji); return; }
      const sonuc = excelToplulIceAktarSonucOzetle(satirlar, _yukleniciKisiIceAktarSatiriEkle);
      alert(excelIceAktarOzetMesaji(sonuc));
      kisileriCiz(document.getElementById('kisiAramaKutusu').value);
    });
  });

  document.getElementById('kisiDetayliIceAktarBtn').addEventListener('click', () => document.getElementById('kisiDetayliIceAktarDosya').click());
  document.getElementById('kisiBelgeliSablonBtn').addEventListener('click', yukleniciBelgeliSablonIndir);
  document.getElementById('kisiDetayliIceAktarDosya').addEventListener('change', e => {
    yukleniciKayitlariniIceAktar(e.target.files[0], () => {
      e.target.value = '';
      kisileriCiz(document.getElementById('kisiAramaKutusu').value);
    });
  });

  // Kullanıcı isteği: araçları da içe / dışa aktarabilmek.
  document.getElementById('aracSablonIndirBtn').addEventListener('click', () => {
    excelSablonIndir(YUKLENICI_ARAC_IMPORT_KOLONLARI, 'yuklenici_arac_sablonu.xlsx');
  });
  document.getElementById('aracDisaAktarBtn').addEventListener('click', () => {
    const satirlar = yukleniciAraclariniGetir('').map(a => Object.assign({}, a, {
      ptmBitis: a.ptmExp, zmsBitis: a.zmsExp, tuvBitis: a.tuvExp,
      genelDurum: a.uygunMu ? 'Uygun' : 'Uygun Değil',
      pasifGoruntu: a.pasif ? 'Evet' : 'Hayır'
    }));
    excelDisaAktar(satirlar, YUKLENICI_ARAC_EXPORT_KOLONLARI, 'yuklenici_araclari.xlsx');
  });
  document.getElementById('aracIceAktarBtn').addEventListener('click', () => document.getElementById('aracIceAktarDosya').click());
  document.getElementById('aracIceAktarDosya').addEventListener('change', e => {
    const dosya = e.target.files[0];
    excelIceAktar(dosya, YUKLENICI_ARAC_IMPORT_KOLONLARI, (satirlar, hataMesaji) => {
      e.target.value = '';
      if (hataMesaji) { alert(hataMesaji); return; }
      const sonuc = yukleniciAraclarTopluEkle(satirlar);
      let mesaj = `${sonuc.eklenen} araç/ekipman eklendi, ${sonuc.guncellenen} mevcut kayıt güncellendi.`;
      if (sonuc.hatalar.length) {
        mesaj += `\n${sonuc.hatalar.length} satır eklenemedi:\n` + sonuc.hatalar.slice(0, 10).join('\n');
        if (sonuc.hatalar.length > 10) mesaj += `\n... ve ${sonuc.hatalar.length - 10} tane daha.`;
      }
      alert(mesaj);
      araclariCiz(document.getElementById('aracAramaKutusu').value);
    });
  });

  document.getElementById('yeniAracBtn').addEventListener('click', () => aracModalAc());
  document.getElementById('aracModalKapatBtn').addEventListener('click', aracModalKapat);
  document.getElementById('aracModalIptalBtn').addEventListener('click', aracModalKapat);
  document.getElementById('aracForm').addEventListener('submit', aracFormGonderildi);
  document.getElementById('aracAramaKutusu').addEventListener('input', e => araclariCiz(e.target.value));
  ['aracPtmVar', 'aracPtmTarih', 'aracPtmGecerlilik', 'aracRuhsat', 'aracZmsTarih', 'aracZmsGecerlilik', 'aracTuvTarih', 'aracTuvGecerlilik'].forEach(id => {
    document.getElementById(id).addEventListener('input', _aracCanliDurumuGuncelle);
  });

  document.getElementById('ziyaretciForm').addEventListener('submit', ziyaretciFormGonderildi);

  document.getElementById('dashAramaKutusu').addEventListener('input', dashboardCiz);
  document.getElementById('dashKapsamFiltre').addEventListener('change', dashboardCiz);
  document.getElementById('dashYenileBtn').addEventListener('click', dashboardCiz);

  document.getElementById('kayitAramaKutusu').addEventListener('input', e => kayitlariCiz(e.target.value));
  document.getElementById('kayitTumunuSecCheckbox').addEventListener('change', e => {
    document.querySelectorAll('#kayitTabloGovde [data-kayit-sec]').forEach(cb => { cb.checked = e.target.checked; });
  });
  document.getElementById('kayitSecilenSilBtn').addEventListener('click', kayitSecilenleriSil);
  document.getElementById('kayitMailEksikBtn').addEventListener('click', kayitSecilenleriMailEksik);
  document.getElementById('kayitTumExcelBtn').addEventListener('click', yukleniciTumKayitlariExcelAktar);
  document.getElementById('kayitUygunExcelBtn').addEventListener('click', yukleniciUygunKayitlariExcelAktar);
  document.getElementById('kayitUygunsuzExcelBtn').addEventListener('click', yukleniciUygunOlmayanKayitlariExcelAktar);
  document.getElementById('kayitDetayliExcelBtn').addEventListener('click', yukleniciDetayliExcelAktar);
  document.getElementById('kayitIceAktarBtn').addEventListener('click', () => document.getElementById('kayitIceAktarDosya').click());
  document.getElementById('kayitIceAktarDosya').addEventListener('change', e => {
    yukleniciKayitlariniIceAktar(e.target.files[0], () => { e.target.value = ''; });
  });
  document.getElementById('kayitPdfBtn').addEventListener('click', yukleniciPdfIndir);
  document.getElementById('aracPdfBtn').addEventListener('click', yukleniciAracPdfIndir);
  document.getElementById('dashOnayliListeBtn').addEventListener('click', yukleniciBirlesikPdfIndir);

  document.getElementById('detayliAramaKutusu').addEventListener('input', detayliAramaCiz);
  document.getElementById('detayliBelgeFiltre').addEventListener('change', detayliAramaCiz);
  document.getElementById('detayliBelgeFiltre').innerHTML += YUKLENICI_BELGE_TANIMLARI.filter(b => !b.bilgiAmacli).map(b => `<option>${_ykKacir(b.ad)}</option>`)
    .concat(Object.values(YUKLENICI_ARAMA_ARAC_BELGE_ADLARI).map(ad => `<option>${_ykKacir(ad)}</option>`))
    .join('');

  gorunumDegistir('dashboard');
}

const YUKLENICI_FIRMA_IMPORT_KOLONLARI = [
  { anahtar: 'firmaAdi', baslik: 'Firma Adı' },
  { anahtar: 'vergiNo', baslik: 'Vergi No' },
  { anahtar: 'faaliyetAlani', baslik: 'Faaliyet Alanı' },
  { anahtar: 'yetkiliAdi', baslik: 'Yetkili Adı' },
  { anahtar: 'telefon', baslik: 'Telefon' },
  { anahtar: 'eposta', baslik: 'E-posta' },
  { anahtar: 'riskSeviyesi', baslik: 'Risk Seviyesi' },
  { anahtar: 'tehlikeSinifi', baslik: 'Tehlike Sınıfı', esanlamlar: ['İşyeri Tehlike Sınıfı'] }
];

const YUKLENICI_FIRMA_EXPORT_KOLONLARI = [
  { anahtar: 'firmaNo', baslik: 'Firma No' },
  { anahtar: 'firmaAdi', baslik: 'Firma Adı' },
  { anahtar: 'yetkiliAdi', baslik: 'Yetkili' },
  { anahtar: 'riskSeviyesi', baslik: 'Risk' },
  { anahtar: 'tehlikeSinifiGoruntu', baslik: 'Tehlike Sınıfı' },
  { anahtar: 'durum', baslik: 'Durum' }
];

const YUKLENICI_KISI_IMPORT_KOLONLARI = [
  { anahtar: 'adSoyad', baslik: 'Ad Soyad' },
  { anahtar: 'kimlikNo', baslik: 'Kimlik No' },
  { anahtar: 'firmaAdi', baslik: 'Firma Adı' },
  { anahtar: 'bolum', baslik: 'Bölüm' },
  { anahtar: 'gorev', baslik: 'Görev' },
  { anahtar: 'telefon', baslik: 'Telefon' }
];

const YUKLENICI_KISI_EXPORT_KOLONLARI = [
  { anahtar: 'personelNo', baslik: 'Personel No' },
  { anahtar: 'adSoyad', baslik: 'Ad Soyad' },
  { anahtar: 'firmaAdi', baslik: 'Firma' },
  { anahtar: 'bolum', baslik: 'Bölüm' },
  { anahtar: 'gorev', baslik: 'Görev' },
  { anahtar: 'durumGoruntu', baslik: 'Durum' },
  { anahtar: 'sonrakiKontrolTarihi', baslik: 'Sonraki Kontrol' }
];

// Araç içe aktarma şablonu: içe aktarılan dosya dışa aktarılanla aynı
// başlıkları da kabul eder (esanlamlar), böylece dışa aktarılan liste
// düzenlenip geri yüklenebilir.
const YUKLENICI_ARAC_IMPORT_KOLONLARI = [
  { anahtar: 'firmaAdi', baslik: 'Firma Adı', esanlamlar: ['Firma'] },
  { anahtar: 'tur', baslik: 'Tür (Araç/Ekipman)', esanlamlar: ['Tür'] },
  { anahtar: 'kimlik', baslik: 'Plaka / Seri No', esanlamlar: ['Plaka', 'Seri No', 'Kimlik'] },
  { anahtar: 'ptmVar', baslik: 'PTM (Var/Yok)', esanlamlar: ['PTM'] },
  { anahtar: 'ptmTarih', baslik: 'PTM Tarihi' },
  { anahtar: 'ptmGecerlilik', baslik: 'PTM Geçerlilik' },
  { anahtar: 'ruhsat', baslik: 'Ruhsat (Var/Yok)', esanlamlar: ['Ruhsat'] },
  { anahtar: 'zmsTarih', baslik: 'ZMS Tarihi' },
  { anahtar: 'zmsGecerlilik', baslik: 'ZMS Geçerlilik' },
  { anahtar: 'tuvTarih', baslik: 'TÜVTÜRK Tarihi' },
  { anahtar: 'tuvGecerlilik', baslik: 'TÜVTÜRK Geçerlilik' },
  { anahtar: 'notlar', baslik: 'Notlar' }
];

const YUKLENICI_ARAC_EXPORT_KOLONLARI = [
  { anahtar: 'aracNo', baslik: 'Araç No' },
  { anahtar: 'firmaAdi', baslik: 'Firma Adı' },
  { anahtar: 'tur', baslik: 'Tür (Araç/Ekipman)' },
  { anahtar: 'kimlik', baslik: 'Plaka / Seri No' },
  { anahtar: 'ptmVar', baslik: 'PTM (Var/Yok)' },
  { anahtar: 'ptmTarih', baslik: 'PTM Tarihi' },
  { anahtar: 'ptmBitis', baslik: 'PTM Bitiş' },
  { anahtar: 'ruhsat', baslik: 'Ruhsat (Var/Yok)' },
  { anahtar: 'zmsTarih', baslik: 'ZMS Tarihi' },
  { anahtar: 'zmsBitis', baslik: 'ZMS Bitiş' },
  { anahtar: 'tuvTarih', baslik: 'TÜVTÜRK Tarihi' },
  { anahtar: 'tuvBitis', baslik: 'TÜVTÜRK Bitiş' },
  { anahtar: 'genelDurum', baslik: 'Genel Durum' },
  { anahtar: 'pasifGoruntu', baslik: 'Pasif' },
  { anahtar: 'notlar', baslik: 'Notlar' }
];

function _yukleniciKisiIceAktarSatiriEkle(satir) {
  const firma = yukleniciFirmalariniGetir('').find(f => _basligiNormallestir(f.firmaAdi) === _basligiNormallestir(satir.firmaAdi));
  if (!firma) return { basarili: false, hatalar: { genel: `Firma "${satir.firmaAdi}" bulunamadı. Önce firmayı ekleyin.` } };
  return yukleniciKisiEkle(Object.assign({}, satir, { firmaId: firma.id }));
}

function gorunumDegistir(gorunum) {
  _ykGorunum = gorunum;
  document.querySelectorAll('[data-sekme]').forEach(btn => btn.classList.toggle('sekme-seciliDegil', btn.getAttribute('data-sekme') !== gorunum));
  ['dashboard', 'firmalar', 'kisiler', 'araclar', 'ziyaretciler', 'kayitlar', 'ozet', 'detayli-arama', 'formlar', 'degerlendirme'].forEach(g => { document.getElementById('bolum-' + g).style.display = g === gorunum ? '' : 'none'; });

  if (gorunum === 'dashboard') dashboardCiz();
  else if (gorunum === 'firmalar') firmalariCiz('');
  else if (gorunum === 'kisiler') kisileriCiz('');
  else if (gorunum === 'araclar') araclariCiz('');
  else if (gorunum === 'ziyaretciler') ziyaretcileriCiz();
  else if (gorunum === 'kayitlar') kayitlariCiz('');
  else if (gorunum === 'detayli-arama') detayliAramaCiz();
  else if (gorunum === 'formlar') dokumanListesiniCiz();
  else if (gorunum === 'degerlendirme') degerlendirmeleriCiz();
  else ozetiCiz();
}

// Kullanıcı isteği: eski uygulamadaki "Detaylı Arama" sekmesini geri getir —
// mantık zaten service.js'teki yukleniciDetayliArama'da hazırdı, sadece UI
// eksikti (bkz. index.html bolum-detayli-arama).
function detayliAramaCiz() {
  const aramaMetni = document.getElementById('detayliAramaKutusu').value;
  const belgeFiltre = document.getElementById('detayliBelgeFiltre').value;
  const govde = document.getElementById('detayliAramaGovde');
  const bosDurum = document.getElementById('detayliAramaBosDurum');
  const sonuclar = yukleniciDetayliArama(aramaMetni, belgeFiltre);

  govde.innerHTML = '';

  if (sonuclar.length === 0) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = 'Arama kriterlerinize uyan belge bulunamadı.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  govde.innerHTML = sonuclar.map(r => `
    <tr>
      <td>${_ykKacir(r.tur)}</td>
      <td>${_ykKacir(r.firma)}</td>
      <td>${_ykKacir(r.kimlik)}</td>
      <td>${_ykKacir(r.belge)}</td>
      <td>${_ykKacir(r.belgeTarihiDeger) || '-'}</td>
      <td>${r.gecerlilik ? formatTarihGoster(r.gecerlilik) : '-'}</td>
      <td><span class="genel-rozet rozet-${ykRozetSinifAdi(r.durum)}">${_ykKacir(r.durum)}</span></td>
    </tr>
  `).join('');
}

// ==================== DASHBOARD / AKSİYON MERKEZİ ====================

// ---- Son Güncellemeler (kullanıcı isteği: yeni personel girişi vb. son
// hareketler; tarih-saate göre en yeni en üstte; 7 tanesi görünsün, diğerlerine
// kaydırarak geriye doğru bakılabilsin). Kaynak: kayıtlardaki
// olusturmaTarihi/olusturan ve guncellemeTarihi/guncelleyen (bkz. repository.js).
const YK_SON_GUNCELLEME_GORUNEN = 7;

function _ykHareketleriniGetir() {
  const liste = [];
  const ekle = (zaman, ikon, tur, metin, kim) => { if (zaman && !isNaN(Date.parse(zaman))) liste.push({ zaman, ikon, tur, metin, kim: kim || '' }); };
  const parca = (...x) => x.filter(Boolean).join(' — ');
  yukleniciKisileriTumunuGetir().forEach(k => {
    const metin = parca(k.adSoyad, k.firmaAdi) + (k.gorev ? ` (${k.gorev})` : '');
    ekle(k.olusturmaTarihi, '👷', 'Yeni personel girişi', metin, k.olusturan);
    ekle(k.guncellemeTarihi, '✏️', 'Personel güncellendi', metin, k.guncelleyen);
  });
  yukleniciFirmalariTumunuGetir().forEach(f => {
    ekle(f.olusturmaTarihi, '🏢', 'Yeni yüklenici firma', f.firmaAdi, f.olusturan);
    ekle(f.guncellemeTarihi, '✏️', 'Firma güncellendi', f.firmaAdi, f.guncelleyen);
  });
  yukleniciAraclariTumunuGetir().forEach(a => {
    const metin = parca(a.kimlik ? `${a.tur || 'Araç'}: ${a.kimlik}` : (a.tur || 'Araç'), a.firmaAdi);
    ekle(a.olusturmaTarihi, '🚚', 'Yeni araç / ekipman', metin, a.olusturan);
    ekle(a.guncellemeTarihi, '✏️', 'Araç / ekipman güncellendi', metin, a.guncelleyen);
  });
  yukleniciZiyaretcileriTumunuGetir().forEach(z => {
    ekle(z.olusturmaTarihi, '🪪', 'Ziyaretçi kaydı', parca(z.adSoyad, z.firma) + (z.ziyaretEdilen ? ` → ${z.ziyaretEdilen}` : ''), z.olusturan);
  });
  liste.sort((a, b) => Date.parse(b.zaman) - Date.parse(a.zaman));

  // Excel ile toplu eklemeler (aynı dakika + aynı tür + aynı kişi, 4'ten
  // fazla) listeyi doldurmasın diye tek satırda toplanır.
  const sonuc = [];
  for (let i = 0; i < liste.length;) {
    const h = liste[i];
    const dakika = h.zaman.slice(0, 16);
    let j = i;
    while (j < liste.length && liste[j].tur === h.tur && liste[j].kim === h.kim && liste[j].zaman.slice(0, 16) === dakika) j++;
    if (j - i > 4) sonuc.push(Object.assign({}, h, { tur: h.tur + ` (toplu: ${j - i} kayıt)`, metin: liste.slice(i, i + 3).map(x => x.metin.split(' — ')[0]).join(', ') + ' …' }));
    else sonuc.push(...liste.slice(i, j));
    i = j;
  }
  return sonuc.slice(0, 300);
}

function _ykSonGuncellemeleriCiz() {
  const kutu = document.getElementById('ykSonGuncellemeler');
  if (!kutu) return;
  const hareketler = _ykHareketleriniGetir();
  if (!hareketler.length) { kutu.style.display = 'none'; return; }
  const zamanMetni = z => new Date(z).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const listeEl = document.getElementById('ykSonGuncellemeListesi');
  kutu.style.display = '';
  document.getElementById('ykSonGuncellemeSayisi').textContent = hareketler.length > YK_SON_GUNCELLEME_GORUNEN
    ? `${hareketler.length} hareket · eskiler için kaydırın` : `${hareketler.length} hareket`;
  listeEl.innerHTML = hareketler.map(h => `
    <div style="display:flex; gap:10px; align-items:flex-start; padding:7px 4px; border-top:1px solid var(--kenarlik,#e5e7eb);">
      <span style="font-size:16px; line-height:1.2;">${h.ikon}</span>
      <span style="flex:1; min-width:0; font-size:13px;">
        <b>${_ykKacir(h.tur)}:</b> ${_ykKacir(h.metin)}${h.kim ? `<span style="color:var(--metin-soluk,#6b7280);"> · ${_ykKacir(h.kim)}</span>` : ''}
      </span>
      <span style="font-size:12px; color:var(--metin-soluk,#6b7280); white-space:nowrap;">${zamanMetni(h.zaman)}</span>
    </div>`).join('');
  // Kutu yüksekliği ilk 7 satıra göre ayarlanır; fazlası kutu içinde kaydırılır.
  const satirlar = Array.from(listeEl.children);
  listeEl.style.maxHeight = '';
  if (satirlar.length > YK_SON_GUNCELLEME_GORUNEN) {
    const ilk = satirlar[0].getBoundingClientRect().top;
    const sinir = satirlar[YK_SON_GUNCELLEME_GORUNEN].getBoundingClientRect().top;
    listeEl.style.maxHeight = (sinir > ilk ? Math.ceil(sinir - ilk) : 7 * 38) + 'px';
  }
  listeEl.scrollTop = 0;
}

function dashboardCiz() {
  _ykSonGuncellemeleriCiz();
  const veri = yukleniciDashboardVerisiHesapla();
  document.getElementById('dashToplamPersonel').textContent = veri.toplamPersonel;
  document.getElementById('dashToplamArac').textContent = veri.toplamArac;
  document.getElementById('dashUygun').textContent = veri.uygunSayisi;
  document.getElementById('dashUygunsuz').textContent = veri.uygunsuzSayisi;

  const aramaMetni = document.getElementById('dashAramaKutusu').value.trim().toLowerCase();
  const kapsam = document.getElementById('dashKapsamFiltre').value;

  // Kullanıcı isteği: eski uygulamadaki "Tam Uygun" kapsam seçeneği geri
  // getirildi — aksiyonSatirlari'nda sadece sorunlu kayıtlar olduğu için bu
  // seçimde ayrı listeye (tamUygunSatirlari) geçilir.
  let satirlar = kapsam === 'ok' ? veri.tamUygunSatirlari : veri.aksiyonSatirlari;
  if (aramaMetni) {
    satirlar = satirlar.filter(r => r.firma.toLowerCase().includes(aramaMetni) || r.kimlik.toLowerCase().includes(aramaMetni));
  }
  if (kapsam === 'critical') satirlar = satirlar.filter(r => r.durum === 'Giriş Engeli');
  else if (kapsam === 'warn') satirlar = satirlar.filter(r => r.durum === 'Yakında Dolacak');

  const aksiyonGovde = document.getElementById('dashAksiyonGovde');
  aksiyonGovde.innerHTML = satirlar.length
    ? satirlar.map(r => `
      <tr>
        <td>${_ykKacir(r.tur)}</td>
        <td>${_ykKacir(r.firma)}</td>
        <td>${_ykKacir(r.kimlik)}</td>
        <td><span class="genel-rozet ${r.durum === 'Giriş Engeli' ? 'rozet-uygun-degil' : (r.durum ? 'rozet-yaklasiyor' : 'rozet-uygun')}">${_ykKacir(r.durum || 'Tam Uygun')}</span></td>
        <td>${_ykKacir(r.sebep) || '-'}</td>
        <td>${r.sonTarih ? formatTarihGoster(r.sonTarih) : (r.durum ? 'İSG ile görüşün' : '-')}</td>
        <td>${r.kalanGun === null || r.kalanGun === undefined ? '-' : r.kalanGun}</td>
        <td>
          <span class="genel-rozet ${r.pasif ? 'rozet-pasif' : 'rozet-uygun'}" style="font-size:10px;">${r.pasif ? 'Pasif' : 'Aktif'}</span>
          <button class="tablo-buton" data-pasif-degistir="${r.id}" data-yeni-pasif="${r.pasif ? 'false' : 'true'}">${r.pasif ? 'Aktif Yap' : 'Pasif Yap'}</button>
        </td>
      </tr>
    `).join('')
    : '<tr><td colspan="8" style="text-align:center;">Sonuç yok</td></tr>';

  aksiyonGovde.querySelectorAll('[data-pasif-degistir]').forEach(btn => {
    btn.addEventListener('click', () => {
      yukleniciKisiPasifDurumunuDegistir(btn.getAttribute('data-pasif-degistir'), btn.getAttribute('data-yeni-pasif') === 'true');
      dashboardCiz();
    });
  });

  document.getElementById('dashFirmaGovde').innerHTML = veri.firmaBazliSorun.length
    ? veri.firmaBazliSorun.map(x => `<tr><td>${_ykKacir(x.firma) || '-'}</td><td>${x.kritik}</td><td>${x.uyari}</td><td>${x.toplam}</td></tr>`).join('')
    : '<tr><td colspan="4" style="text-align:center;">Veri yok</td></tr>';

  document.getElementById('dashBelgeGovde').innerHTML = veri.belgeBazliSorun.length
    ? veri.belgeBazliSorun.map(x => `<tr><td>${x.belge}</td><td>${x.adet}</td></tr>`).join('')
    : '<tr><td colspan="2" style="text-align:center;">Veri yok</td></tr>';
}

// ==================== FİRMA: SÖZLEŞMELER (VAR/YOK) ====================
// Kullanıcı isteği: "bu kadar teferruata gerek yok, işyeri hekimi ve iş
// güvenliği uzmanı sözleşmesi var/yok seçilsin yeterli". Veri modeli
// değişmedi: "Var" = firma.evraklar'da o türde (tarihsiz) bir evrak olması.
// Firmadaki diğer türdeki eski evraklar formda görünmez ama korunur.
const _FIRMA_SOZLESME_ALANLARI = [
  { tur: 'İş Güvenliği Uzmanı Sözleşmesi', alanId: 'firmaIsgUzmaniSozlesme' },
  { tur: 'İşyeri Hekimi Sözleşmesi', alanId: 'firmaHekimSozlesme' }
];

function _firmaSozlesmeleriniDoldur(evraklar) {
  _FIRMA_SOZLESME_ALANLARI.forEach(({ tur, alanId }) => {
    document.getElementById(alanId).value = (evraklar || []).some(e => e.tur === tur) ? 'Var' : 'Yok';
  });
}

function _firmaEvraklariniSozlesmelerleBirlestir(evraklar) {
  const sonuc = (evraklar || []).filter(e => e.tur && !YUKLENICI_FIRMA_GEREKLI_EVRAKLAR.includes(e.tur));
  _FIRMA_SOZLESME_ALANLARI.forEach(({ tur, alanId }) => {
    if (document.getElementById(alanId).value !== 'Var') return;
    const mevcut = (evraklar || []).find(e => e.tur === tur);
    sonuc.push(mevcut ? Object.assign({}, mevcut, { gecerlilikTarihi: '' }) : evrakOlustur({ tur }));
  });
  return sonuc;
}

// ==================== KİŞİ: SABİT BELGE CHECKLIST BUILDER ====================
// Eski uygulamadaki 16 sabit belgeyi render eder (bkz. model.js
// YUKLENICI_BELGE_TANIMLARI). _kisiBelgeTaslak nesnesi { belgeId: {...} }
// şeklinde tutulur ve kisiFormGonderildi'de doğrudan kisi.belgeler olarak kaydedilir.

function _kisiBelgeSatiriHtml(belgeTanimi, kayit, tehlikeSinifi) {
  const k = kayit || {};
  let alanlar = '';

  if (belgeTanimi.tur === 'var-yok') {
    // Not: k.deger yerine yukleniciBelgeVarMi(k) kullanılır — MYK gibi
    // tarihli (base/exp) bir alanken Var/Yok'a çevrilmiş türlerde, eski
    // kayıtlarda "deger" yok ama "base" varsa bu "Var" olarak gösterilsin
    // diye (bkz. model.js yukleniciBelgeVarMi).
    const varMi = yukleniciBelgeVarMi(k);
    alanlar = `
      <select data-belge-alan="deger" data-belge-id="${belgeTanimi.id}" style="width:auto;">
        <option value="Yok" ${!varMi ? 'selected' : ''}>Yok</option>
        <option value="Var" ${varMi ? 'selected' : ''}>Var</option>
      </select>
    `;
  } else if (belgeTanimi.tur === 'tarih-aralik') {
    alanlar = `
      <input type="date" data-belge-alan="base" data-belge-id="${belgeTanimi.id}" value="${k.base || ''}" title="Başlangıç" style="width:auto;">
      <span style="font-size:12px; color:var(--metin-soluk);">–</span>
      <input type="date" data-belge-alan="exp" data-belge-id="${belgeTanimi.id}" value="${k.exp || ''}" title="Bitiş" style="width:auto;">
    `;
  } else if (belgeTanimi.tur === 'tarih-tehlike') {
    const hesapExp = yukleniciBelgeBitisTarihiHesapla(belgeTanimi, k, tehlikeSinifi);
    alanlar = `
      <input type="date" data-belge-alan="base" data-belge-id="${belgeTanimi.id}" value="${k.base || ''}" title="Veriliş" style="width:auto;">
      <span data-belge-gecerlilik="${belgeTanimi.id}" style="font-size:12px; color:var(--metin-soluk); white-space:nowrap;">Geçerlilik: ${hesapExp || '-'}</span>
    `;
  } else if (belgeTanimi.tur === 'egitim') {
    alanlar = `
      <input type="date" data-belge-alan="base" data-belge-id="${belgeTanimi.id}" value="${k.base || ''}" title="Veriliş" style="width:auto;">
      <select data-belge-alan="ay" data-belge-id="${belgeTanimi.id}" style="width:auto;">
        ${YUKLENICI_FIRMA_EGITIMI_AY_SECENEKLERI.map(a => `<option value="${a}" ${Number(k.ay || YUKLENICI_FIRMA_EGITIMI_VARSAYILAN_AY) === a ? 'selected' : ''}>${a} ay</option>`).join('')}
      </select>
      <input type="text" data-belge-alan="egitmen" data-belge-id="${belgeTanimi.id}" value="${(k.egitmen || '').replace(/"/g, '&quot;')}" placeholder="Eğitmen" style="width:120px;">
    `;
  }

  return `
    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; padding:6px 0; border-bottom:1px solid var(--kenarlik);">
      <span style="font-size:13px; ${belgeTanimi.girisEngelleyici ? 'font-weight:600;' : ''}">${belgeTanimi.ad}${belgeTanimi.girisEngelleyici ? ' *' : ''}</span>
      <div style="display:flex; gap:8px; align-items:center; margin-left:auto; flex-wrap:wrap;">${alanlar}</div>
    </div>
  `;
}

// Belgeler, eski uygulamada tek düz liste iken burada okunabilirlik için
// YUKLENICI_BELGE_BOLUMLERI'ne göre alt başlıklarla gruplanır (hesaplamayı
// etkilemez, sadece görünüm).
function _kisiBelgeListesiniCiz() {
  _ykBelgeListesiCiz(
    document.getElementById('kisiBelgeListesi'),
    _kisiBelgeTaslak,
    () => document.getElementById('kisiTehlikeSinifi').value,
    document.getElementById('kisiPersonelTuru').value,
    _kisiCanliDurumuGuncelle
  );
}

// Tek kişilik form ve "Birden Fazla Personel" sütunları için ortak belge
// listesi. taslak: o kişinin belgeler nesnesi (girilen değerler buna yazılır);
// tehlikeAl: o anki tehlike sınıfını döndürür; degisinceFn: her değişiklikten
// sonra (canlı uygunluk durumu için) çağrılır.
function _ykBelgeListesiCiz(kutu, taslak, tehlikeAl, personelTuru, degisinceFn) {
  const tehlikeSinifi = tehlikeAl();
  const tanimlar = yukleniciFormBelgeTanimlari(personelTuru);

  const bolumSirasi = Object.keys(YUKLENICI_BELGE_BOLUMLERI);
  kutu.innerHTML = bolumSirasi
    .map(bolumId => {
      const buBolum = tanimlar.filter(b => b.bolum === bolumId);
      if (!buBolum.length) return '';
      return `
        <div style="font-size:12px; font-weight:600; color:var(--metin-soluk); text-transform:uppercase; letter-spacing:.03em; margin:14px 0 4px;">${YUKLENICI_BELGE_BOLUMLERI[bolumId]}</div>
        ${buBolum.map(b => _kisiBelgeSatiriHtml(b, taslak[b.id], tehlikeSinifi)).join('')}
      `;
    })
    .join('');

  // Kullanıcı bildirdi: "gün ay yazdıktan sonra yıla 2 yazdığımda 0002 oluyor,
  // 2026 yazamıyorum" — native <input type="date">, gün+ay+yıl'ın İLK
  // rakamıyla bile (ör. 22.09.0002) "tamamlanmış" sayılıp 'change' olayını
  // hemen fırlatabiliyor; bu olayı dinleyip TÜM belge listesini (bu input'un
  // kendisi dahil) yeniden çizmek, kullanıcı yılın geri kalanını daha
  // yazmadan input'u DOM'dan silip yeniden oluşturuyor, odağı/yazmayı
  // kesiyordu. Artık ne 'input' ne 'change' listeyi yeniden çizmiyor —
  // sadece yandaki "Geçerlilik: ..." metni (data-belge-gecerlilik) güncelleniyor,
  // input elemanının kendisine hiç dokunulmuyor.
  kutu.querySelectorAll('[data-belge-alan]').forEach(el => {
    el.addEventListener('input', () => {
      const id = el.getAttribute('data-belge-id');
      const alan = el.getAttribute('data-belge-alan');
      if (!taslak[id]) taslak[id] = {};
      taslak[id][alan] = el.value;
      // Sağlık/Temel İSG/Firma Eğitimi'nde formda DÜZENLENEBİLEN tek tarih
      // "base" (Veriliş) — "exp" (bitiş) formda hiç gösterilmez, sadece
      // base'den (ve Firma Eğitimi'nde ay'dan) hesaplanır. Eski Excel içe
      // aktarımlarında (bkz. cikti.js) bazı kayıtlarda ayrıca ham bir "exp"
      // alanı da saklanıyor; hesaplama fonksiyonu varsa onu öncelikli
      // kullandığından, kullanıcı ekranda Veriliş tarihini değiştirse bile
      // geçerlilik eski/aktarılmış tarihte donuk kalıyordu ("hesap hatası").
      // Kullanıcı bu alana dokunduğu an eski exp artık geçersiz sayılır ki
      // yeniden base (+ay) üzerinden hesaplansın.
      const belgeTanimi = yukleniciBelgeTanimiGetir(id);
      const tur = belgeTanimi.tur;
      if ((alan === 'base' || alan === 'ay') && (tur === 'tarih-tehlike' || tur === 'egitim')) delete taslak[id].exp;

      if (alan === 'base' && tur === 'tarih-tehlike') {
        const span = kutu.querySelector(`[data-belge-gecerlilik="${id}"]`);
        if (span) {
          const hesapExp = yukleniciBelgeBitisTarihiHesapla(belgeTanimi, taslak[id], tehlikeAl());
          span.textContent = `Geçerlilik: ${hesapExp || '-'}`;
        }
      }
      degisinceFn();
    });
  });

  degisinceFn();
}

// Kaydetmeden önce, o an formda girilmiş veriyle canlı olarak "bu kişi şu an
// girişe uygun mu, değilse neden" bilgisini gösterir — eski uygulamada
// sadece kayıt sonrası Dashboard'da görülebilen bu bilgiyi form doldurulurken
// anlık geri bildirim olarak sunar (kullanıcı dostu iyileştirme).
function _kisiCanliDurumuGuncelle() {
  const kutu = document.getElementById('kisiCanliDurum');
  if (!kutu) return;
  kutu.innerHTML = _ykCanliDurumHtml(document.getElementById('kisiTehlikeSinifi').value, document.getElementById('kisiIlkGiris').checked, _kisiBelgeTaslak);
}

function _ykCanliDurumHtml(tehlikeSinifi, ilkGiris, belgeler) {
  if (ilkGiris) {
    return `<div class="genel-rozet rozet-yaklasiyor" style="font-size:13px; padding:8px 12px;">🎓 İlk Giriş işaretli — diğer belgelerden bağımsız olarak "Eğitim Verilecek" olarak işlenecek.</div>`;
  }
  const kritik = yukleniciKisiKritikSebepHesapla({ tehlikeSinifi, ilkGiris, belgeler }, bugunIso());
  if (!kritik) {
    return `<div class="genel-rozet rozet-uygun" style="font-size:13px; padding:8px 12px;">✓ Girişe Uygun — girilen belgelerde eksik/süresi geçmiş bir sorun yok.</div>`;
  }
  if (kritik.girisEngeli) {
    return `<div class="genel-rozet rozet-uygun-degil" style="font-size:13px; padding:8px 12px;">⛔ Girişe Kapalı — ${kritik.sebep}${kritik.sonTarih ? ` (${formatTarihGoster(kritik.sonTarih)})` : ''}</div>`;
  }
  return `<div class="genel-rozet rozet-yaklasiyor" style="font-size:13px; padding:8px 12px;">⚠ Yakında Dolacak — ${kritik.sebep}${kritik.sonTarih ? ` (${formatTarihGoster(kritik.sonTarih)}, ${kritik.kalanGun} gün kaldı)` : ''}</div>`;
}

// Firma için: serbest evrak modeli (eksikEvraklar/suresiGecenEvraklar).
function _uygunlukOzetiHtml(z) {
  if (z.uygunMu) return '<span class="genel-rozet rozet-uygun">Uygun</span>';
  const parcalar = [];
  if (z.eksikEvraklar.length) parcalar.push(`Eksik: ${z.eksikEvraklar.join(', ')}`);
  if (z.suresiGecenEvraklar.length) parcalar.push(`Süresi Geçen: ${z.suresiGecenEvraklar.join(', ')}`);
  return `<span class="genel-rozet rozet-uygun-degil">Uygun Değil</span> <span style="font-size:11px; color:var(--metin-soluk);">${parcalar.join(' | ')}</span>`;
}

// Kişi için: sabit belge checklist'i / kritikSebep (bkz. _kisiZenginlestir).
function _kisiUygunlukOzetiHtml(k) {
  if (k.uygunMu) return '<span class="genel-rozet rozet-uygun">Uygun</span>';
  const rozetSinifi = k.kritikSebep && k.kritikSebep.girisEngeli ? 'rozet-uygun-degil' : 'rozet-yaklasiyor';
  return `<span class="genel-rozet ${rozetSinifi}">${k.durumGoruntu}</span> <span style="font-size:11px; color:var(--metin-soluk);">${k.kritikSebep ? k.kritikSebep.sebep : ''}</span>`;
}

// ==================== FİRMALAR ====================

// Firma tablosunda son İSG uyum değerlendirmesinin puanı (bkz. degerlendirme.js).
function _ykSonDegerlendirmeHtml(firmaId) {
  const d = yukleniciFirmaSonDegerlendirme(firmaId);
  if (!d) return '<span style="font-size:12px; color:var(--metin-soluk);">—</span>';
  // Tıklanınca Yüklenici Değerlendirme sekmesi bu firmaya süzülmüş açılır.
  return `<a href="#" data-son-deg="${firmaId}" title="Bu firmanın değerlendirmelerini aç" style="text-decoration:none;">${_ykDegSinifRozeti(d)}</a>
    <div style="font-size:11px; color:var(--metin-soluk);">${_ykKacir(d.sonuc)} · ${formatTarihGoster(d.bitis)}</div>`;
}

function _ykFirmaDegerlendirmeleriniAc(firmaId) {
  gorunumDegistir('degerlendirme');
  const filtre = document.getElementById('degFirmaFiltre');
  filtre.dispatchEvent(new Event('focus')); // seçenekleri tazele
  filtre.value = firmaId;
  degerlendirmeleriCiz();
}

function firmalariCiz(aramaMetni) {
  const govde = document.getElementById('firmaTabloGovde');
  const bosDurum = document.getElementById('firmaBosDurum');
  const firmalar = _ykSirala(yukleniciFirmalariniGetir(aramaMetni), _ykSiralamaDegeri('firmaSiralama'), f => f.olusturmaTarihi, f => f.firmaAdi);

  govde.innerHTML = '';
  if (firmalar.length === 0) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = aramaMetni ? 'Aramanızla eşleşen firma bulunamadı.' : 'Henüz yüklenici firma eklenmedi.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  firmalar.forEach(f => {
    const satir = document.createElement('tr');
    satir.innerHTML = `
      <td>${f.firmaNo}</td>
      <td>${_ykKacir(f.firmaAdi)}</td>
      <td>${_ykKacir(f.yetkiliAdi) || '-'}</td>
      <td><span class="genel-rozet rozet-${ykRozetSinifAdi(f.riskSeviyesi)}">${_ykKacir(f.riskSeviyesi)}</span></td>
      <td><span class="genel-rozet rozet-${ykRozetSinifAdi(f.durum)}">${_ykKacir(f.durum)}</span></td>
      <td>${_uygunlukOzetiHtml(f)}</td>
      <td>${_ykSonDegerlendirmeHtml(f.id)}</td>
      <td>${_ykKayitTarihiGoster(f.olusturmaTarihi)}</td>
      <td>
        <button class="tablo-buton" data-duzenle="${f.id}">Düzenle</button>
        <button class="tablo-buton sil" data-sil="${f.id}">Sil</button>
      </td>
    `;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-son-deg]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); _ykFirmaDegerlendirmeleriniAc(a.getAttribute('data-son-deg')); }));
  govde.querySelectorAll('[data-duzenle]').forEach(btn => btn.addEventListener('click', () => firmaModalAc(yukleniciFirmaIdIleGetirRepo(btn.getAttribute('data-duzenle')))));
  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', async () => {
    if (await onayModali('Bu firmayı ve bağlı personelini silmek istediğinize emin misiniz?', 'Sil')) { yukleniciFirmaSil(btn.getAttribute('data-sil')); firmalariCiz(document.getElementById('firmaAramaKutusu').value); }
  }));
}

// ==================== MAİL İÇİN EKSİKLİKLER ====================

function mailEksikAc(kisiler) {
  document.getElementById('mailEksikMetin').value = yukleniciEksiklikMailMetni(kisiler);
  document.getElementById('mailEksikDurum').textContent = '';
  document.getElementById('mailEksikKatman').classList.add('acik');
}

async function _mailEksikKopyala() {
  const alan = document.getElementById('mailEksikMetin');
  const durum = document.getElementById('mailEksikDurum');
  try {
    await navigator.clipboard.writeText(alan.value);
  } catch (err) {
    // file:// ya da izin yoksa eski yöntem
    alan.select();
    document.execCommand('copy');
  }
  durum.textContent = '✔ Kopyalandı — mailinize yapıştırabilirsiniz (Ctrl+V).';
}

// ==================== MÜKERRER FİRMALAR ====================

function mukerrerFirmalarAc() {
  mukerrerFirmalariCiz();
  document.getElementById('mukerrerFirmaKatman').classList.add('acik');
}

function _mukerrerGrupHtml(grup, g, tur) {
  const ad = `mkAna-${tur}-${g}`;
  const satirlar = grup.map((f, i) => `
    <tr>
      <td style="text-align:center;"><input type="radio" name="${ad}" value="${f.id}" ${i === 0 ? 'checked' : ''} style="width:auto;"></td>
      <td style="text-align:center;"><input type="checkbox" data-mk-dahil value="${f.id}" ${tur === 'kesin' ? 'checked' : ''} style="width:auto;"></td>
      <td>${_ykKacir(f.firmaNo)}</td>
      <td>${_ykKacir(f.firmaAdi)}</td>
      <td style="text-align:center;">${f.personelSayisi}</td>
      <td style="text-align:center;">${f.aracSayisi}</td>
      <td>${_ykKayitTarihiGoster(f.olusturmaTarihi)}</td>
    </tr>`).join('');
  return `
    <div data-mk-grup="${tur}-${g}" style="border:1px solid var(--kenarlik); border-radius:10px; padding:10px; margin-bottom:12px;">
      <div class="tablo-scroll">
        <table class="veri-tablosu">
          <thead><tr><th>Ana</th><th>Birleştir</th><th>Firma No</th><th>Firma Adı</th><th>Personel</th><th>Araç</th><th>Kayıt Tarihi</th></tr></thead>
          <tbody>${satirlar}</tbody>
        </table>
      </div>
      <div style="text-align:right; margin-top:8px;"><button type="button" class="birincil" data-mk-birlestir="${tur}-${g}" style="width:auto;">Seçilenleri Birleştir</button></div>
    </div>`;
}

function mukerrerFirmalariCiz() {
  const kutu = document.getElementById('mukerrerFirmaIcerik');
  const { kesin, olasi } = yukleniciMukerrerFirmaGruplariniBul();
  if (!kesin.length && !olasi.length) {
    kutu.innerHTML = '<div style="padding:16px; text-align:center; color:var(--metin-soluk);">Mükerrer görünen firma bulunamadı.</div>';
    return;
  }
  kutu.innerHTML =
    `<div class="form-bolum-baslik">Aynı Firma Görünenler (${kesin.length} grup)</div>` +
    (kesin.length ? kesin.map((grup, g) => _mukerrerGrupHtml(grup, g, 'kesin')).join('') : '<p style="font-size:13px; color:var(--metin-soluk);">Yok.</p>') +
    (olasi.length ? `<div class="form-bolum-baslik">Olası Mükerrerler — sadece ilk harfleri aynı (${olasi.length} grup)</div>
      <p style="font-size:12.5px; color:var(--metin-soluk); margin-top:-4px;">Bunlar farklı firmalar olabilir; sadece aynı olduğundan emin olduklarınızı işaretleyin.</p>` +
      olasi.map((grup, g) => _mukerrerGrupHtml(grup, g, 'olasi')).join('') : '');

  kutu.querySelectorAll('[data-mk-birlestir]').forEach(btn => btn.addEventListener('click', () => _mukerrerGrubuBirlestir(btn.getAttribute('data-mk-birlestir'))));
}

async function _mukerrerGrubuBirlestir(grupAnahtari) {
  const grupEl = document.querySelector(`#mukerrerFirmaIcerik [data-mk-grup="${grupAnahtari}"]`);
  const anaEl = grupEl.querySelector('input[type="radio"]:checked');
  if (!anaEl) return;
  const anaId = anaEl.value;
  const kopyaIdleri = Array.from(grupEl.querySelectorAll('[data-mk-dahil]:checked')).map(el => el.value).filter(id => id !== anaId);
  if (!kopyaIdleri.length) { alert('Ana firmaya birleştirilecek en az bir firmayı "Birleştir" sütunundan işaretleyin.'); return; }

  const ozet = yukleniciFirmaBirlestirmeOzeti(anaId, kopyaIdleri);
  if (!ozet) return;
  const mesaj = `Ana firma: ${ozet.ana.firmaAdi} (${ozet.ana.firmaNo})\n\n` +
    `Silinecek kopyalar:\n${ozet.kopyaFirmalar.map(f => `• ${f.firmaAdi} (${f.firmaNo})`).join('\n')}\n\n` +
    `Ana firmaya taşınacak: ${ozet.personel} personel, ${ozet.arac} araç/ekipman` +
    (ozet.ziyaretci ? `, ${ozet.ziyaretci} ziyaretçi kaydı` : '') +
    (ozet.evrak ? `, ${ozet.evrak} firma evrakı` : '') + '.' +
    (ozet.ayniIsimliPersonel ? `\n\n⚠ Taşınan personelden ${ozet.ayniIsimliPersonel} kişi ana firmada aynı isimle zaten kayıtlı; birleştirmeden sonra Personel sekmesinden kontrol edin.` : '') +
    '\n\nBu işlem geri alınamaz. Birleştirilsin mi?';
  const onay = onayModali(mesaj, 'Birleştir');
  const mesajEl = document.getElementById('omMesaj');
  if (mesajEl) mesajEl.style.whiteSpace = 'pre-line';
  if (!(await onay)) return;

  const sonuc = yukleniciFirmalariBirlestir(anaId, kopyaIdleri);
  if (!sonuc.basarili) { if (sonuc.hata) alert(sonuc.hata); return; }
  mukerrerFirmalariCiz();
  firmalariCiz(document.getElementById('firmaAramaKutusu').value);
}

function firmaModalAc(firma) {
  _duzenlenenFirmaId = firma ? firma.id : null;
  _firmaEvrakTaslak = firma ? firma.evraklar.map(e => Object.assign({}, e)) : [];

  document.getElementById('firmaModalBaslik').textContent = firma ? (firma.firmaNo + ' Firmasını Düzenle') : 'Yeni Yüklenici Firma';
  document.getElementById('firmaAdi').value = firma ? firma.firmaAdi : '';
  document.getElementById('vergiNo').value = firma ? firma.vergiNo : '';
  document.getElementById('faaliyetAlani').value = firma ? firma.faaliyetAlani : '';
  document.getElementById('yetkiliAdi').value = firma ? firma.yetkiliAdi : '';
  document.getElementById('firmaTelefon').value = firma ? firma.telefon : '';
  document.getElementById('eposta').value = firma ? firma.eposta : '';
  document.getElementById('firmaRiskSeviyesi').innerHTML = YUKLENICI_RISK_SEVIYELERI.map(r => `<option ${firma && firma.riskSeviyesi === r ? 'selected' : ''}>${r}</option>`).join('');
  const firmaTehlike = firma ? (firma.tehlikeSinifi || '') : '';
  document.getElementById('firmaTehlikeSinifi').innerHTML = '<option value="">— Seçilmedi —</option>' +
    YUKLENICI_TEHLIKE_SINIFLARI.map(t => `<option value="${t}" ${firmaTehlike === t ? 'selected' : ''}>${YUKLENICI_TEHLIKE_SINIFI_ETIKETLERI[t]}</option>`).join('');
  document.getElementById('firmaDurum').innerHTML = FIRMA_DURUMLARI.map(d => `<option ${firma && firma.durum === d ? 'selected' : ''}>${d}</option>`).join('');
  _firmaSozlesmeleriniDoldur(_firmaEvrakTaslak);
  document.getElementById('firmaNotlar').value = firma ? firma.notlar : '';

  temizleFormHatalari('firmaForm');
  _firmaBenzerUyarisiniCiz();
  document.getElementById('firmaModalKatman').classList.add('acik');
}

// Firma adı yazılırken benzer kayıtlı firmaları alanın altında gösterir.
function _firmaBenzerUyarisiniCiz() {
  const kutu = document.getElementById('firmaAdiBenzer');
  const benzerler = yukleniciBenzerFirmalariBul(document.getElementById('firmaAdi').value, _duzenlenenFirmaId);
  if (!benzerler.length) { kutu.innerHTML = ''; return; }
  const gosterilen = benzerler.slice(0, 8);
  const ayniVar = benzerler.some(f => f.ayniAd);
  kutu.innerHTML = `
    <div style="background:#fef3c7; border:1px solid #f59e0b; color:#92400e; border-radius:8px; padding:8px 10px; font-size:12.5px; margin:-4px 0 12px;">
      <b>⚠ ${ayniVar ? 'Bu isimde bir firma zaten kayıtlı!' : 'Benzer isimli firma kayıtlı:'}</b>
      <div style="margin-top:4px; line-height:1.6;">${gosterilen.map(f => `${f.ayniAd ? '<b>' : ''}${_ykKacir(f.firmaAdi)} <span style="opacity:.7;">(${_ykKacir(f.firmaNo)})</span>${f.ayniAd ? '</b>' : ''}`).join('<br>')}${benzerler.length > gosterilen.length ? `<br>… ve ${benzerler.length - gosterilen.length} firma daha` : ''}</div>
      <div style="margin-top:4px; opacity:.85;">Aynı firmayı tekrar eklemeyin; personel girerken listeden bu firmayı seçin.</div>
    </div>`;
}

function firmaModalKapat() {
  document.getElementById('firmaModalKatman').classList.remove('acik');
  _duzenlenenFirmaId = null;
}

async function firmaFormGonderildi(e) {
  e.preventDefault();
  temizleFormHatalari('firmaForm');

  // Yeni firma eklerken benzer isimli firma varsa onay iste.
  if (!_duzenlenenFirmaId) {
    const benzerler = yukleniciBenzerFirmalariBul(document.getElementById('firmaAdi').value, null);
    if (benzerler.length) {
      const liste = benzerler.slice(0, 5).map(f => `• ${f.firmaAdi} (${f.firmaNo})`).join('\n');
      const mesaj = (benzerler.some(f => f.ayniAd) ? 'Bu isimde bir firma zaten kayıtlı:' : 'Benzer isimli firma kayıtlı:') +
        '\n' + liste + (benzerler.length > 5 ? `\n… ve ${benzerler.length - 5} firma daha` : '') + '\n\nYine de yeni firma olarak eklensin mi?';
      const onay = onayModali(mesaj, 'Yine de Ekle');
      const mesajEl = document.getElementById('omMesaj');
      if (mesajEl) mesajEl.style.whiteSpace = 'pre-line'; // liste satır satır görünsün
      if (!(await onay)) return;
    }
  }

  const veriler = {
    firmaAdi: document.getElementById('firmaAdi').value,
    vergiNo: document.getElementById('vergiNo').value,
    faaliyetAlani: document.getElementById('faaliyetAlani').value,
    yetkiliAdi: document.getElementById('yetkiliAdi').value,
    telefon: document.getElementById('firmaTelefon').value,
    eposta: document.getElementById('eposta').value,
    riskSeviyesi: document.getElementById('firmaRiskSeviyesi').value,
    tehlikeSinifi: document.getElementById('firmaTehlikeSinifi').value,
    durum: document.getElementById('firmaDurum').value,
    gerekliEvraklar: YUKLENICI_FIRMA_GEREKLI_EVRAKLAR.slice(),
    evraklar: _firmaEvraklariniSozlesmelerleBirlestir(_firmaEvrakTaslak),
    notlar: document.getElementById('firmaNotlar').value
  };

  const sonuc = _duzenlenenFirmaId ? yukleniciFirmaGuncelle(_duzenlenenFirmaId, veriler) : yukleniciFirmaEkle(veriler);
  if (!sonuc.basarili) { formHatalariniGoster(sonuc.hatalar); return; }

  firmaModalKapat();
  firmalariCiz(document.getElementById('firmaAramaKutusu').value);
  if (sonuc.guncellenenPersonelSayisi) {
    alert(`${sonuc.guncellenenPersonelSayisi} personelin tehlike sınıfı "${YUKLENICI_TEHLIKE_SINIFI_ETIKETLERI[sonuc.firma.tehlikeSinifi]}" olarak güncellendi.`);
  }
}

// ==================== KİŞİLER ====================

function kisileriCiz(aramaMetni) {
  // "Yüklenici Personeli" sekmesi kaldırıldı; personel ekleme/düzenleme/içe
  // aktarma sonrası görünen liste Personel Kayıtları olduğu için o da yenilenir.
  if (_ykGorunum === 'kayitlar') kayitlariCiz(document.getElementById('kayitAramaKutusu').value);
  const govde = document.getElementById('kisiTabloGovde');
  const bosDurum = document.getElementById('kisiBosDurum');
  const filtreler = { durum: document.getElementById('kisiDurumFiltre').value };
  const kisiler = _ykSirala(yukleniciKisileriniGetir(aramaMetni, filtreler), _ykSiralamaDegeri('kisiSiralama'), k => k.olusturmaTarihi, k => k.adSoyad);

  govde.innerHTML = '';
  if (kisiler.length === 0) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = 'Eşleşen kişi bulunamadı.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  kisiler.forEach(k => {
    const satir = document.createElement('tr');
    satir.classList.add(yukleniciKisiSatirSinifiHesapla(k, bugunIso()));
    if (k.pasif) satir.style.opacity = '0.55';
    const sonTarihMetni = k.girisSonTarih.sonTarih ? formatTarihGoster(k.girisSonTarih.sonTarih) : '-';
    satir.innerHTML = `
      <td>${k.personelNo}</td>
      <td>${_ykKacir(k.adSoyad)}${k.pasif ? ' <span class="genel-rozet rozet-pasif" style="font-size:10px;">Pasif</span>' : ''}</td>
      <td>${_ykKacir(k.firmaAdi)}</td>
      <td><span class="genel-rozet rozet-${ykRozetSinifAdi(k.durumGoruntu)}">${_ykKacir(k.durumGoruntu)}</span>${k.kritikSebep ? `<div style="font-size:11px; color:var(--metin-soluk); margin-top:2px;">${_ykKacir(k.kritikSebep.sebep)}${k.eksikBelgeSayisi > 1 ? ` (+${k.eksikBelgeSayisi - 1} diğer)` : ''}</div>` : ''}</td>
      <td>${sonTarihMetni}</td>
      <td>${_ykKayitTarihiGoster(k.olusturmaTarihi)}</td>
      <td>
        <button class="tablo-buton" data-duzenle="${k.id}">Düzenle</button>
        <button class="tablo-buton sil" data-sil="${k.id}">Sil</button>
      </td>
    `;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-duzenle]').forEach(btn => btn.addEventListener('click', () => kisiModalAc(yukleniciKisiIdIleGetirRepo(btn.getAttribute('data-duzenle')))));
  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', async () => {
    if (await onayModali('Bu kişiyi silmek istediğinize emin misiniz?', 'Sil')) { yukleniciKisiSil(btn.getAttribute('data-sil')); kisileriCiz(document.getElementById('kisiAramaKutusu').value); }
  }));
}

// Firma sayısı fazla olduğunda (300+) doğru firmayı bulmayı hızlandırmak için
// kişi/araç modallarındaki firma listesi bir arama kutusuyla daraltılabilir.
function _yukleniciFirmaListesiCiz(selectEl, firmalar, seciliId) {
  selectEl.innerHTML = '<option value="">— Firma seçiniz —</option>' +
    firmalar.map(f => `<option value="${f.id}" ${seciliId === f.id ? 'selected' : ''}>${_ykKacir(f.firmaAdi)}</option>`).join('');
}

function _yukleniciFirmaAramaBagla(aramaId, selectId, firmalar) {
  const aramaEl = document.getElementById(aramaId);
  const selectEl = document.getElementById(selectId);
  aramaEl.value = '';
  aramaEl.oninput = () => {
    const seciliId = selectEl.value;
    const terim = _basligiNormallestir(aramaEl.value);
    const filtreli = terim ? firmalar.filter(f => _basligiNormallestir(f.firmaAdi).includes(terim)) : firmalar;
    _yukleniciFirmaListesiCiz(selectEl, filtreli, seciliId);
  };
}

// Seçili yüklenici firmanın işyeri tehlike sınıfı girildiyse personelin
// tehlike sınıfı ondan gelir ve alan kilitlenir; girilmediyse elle seçilir.
// Dönüş: değer değiştiyse true (belge geçerlilikleri yeniden çizilmeli).
function _ykFirmaTehlikesiniUygula(firmaId, sec, notEl) {
  const firmaTehlike = _yukleniciFirmaTehlikeSinifi(firmaId);
  const onceki = sec.value;
  if (firmaTehlike) {
    sec.value = firmaTehlike;
    sec.disabled = true;
    if (notEl) notEl.textContent = 'Firmanın işyeri tehlike sınıfından geliyor.';
  } else {
    // Değer önceki firmadan geldiyse (alan kilitliydi) taşınmasın, varsayılana dön.
    if (sec.disabled) sec.value = 'az';
    sec.disabled = false;
    if (notEl) notEl.textContent = '';
  }
  return sec.value !== onceki;
}

// Kullanıcı isteği: "firma seçme alanı seçtikten sonra sadece seçtiğim
// firma kalması lazım" — firma seçiliyse arama kutusu + uzun liste gizlenir,
// yerine seçili firmanın adı ve "Değiştir" butonu gösterilir; Değiştir
// listeyi yeniden açar (seçim korunur, yeni bir firmaya tıklanana kadar).
function _ykFirmaSeciliGorunum(aramaEl, selectEl, seciliEl) {
  const firma = selectEl.value ? yukleniciFirmaIdIleGetirRepo(selectEl.value) : null;
  const kompakt = !!firma;
  aramaEl.style.display = kompakt ? 'none' : '';
  selectEl.style.display = kompakt ? 'none' : '';
  seciliEl.innerHTML = kompakt ? `
    <div style="display:flex; align-items:center; gap:8px; padding:9px 12px; border:1px solid var(--kenarlik); border-radius:8px; background:#f8fafc; margin-bottom:14px;">
      <b style="flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${_ykKacir(firma.firmaAdi)}">${_ykKacir(firma.firmaAdi)}</b>
      <button type="button" class="tablo-buton" data-firma-degistir>Değiştir</button>
    </div>${_ykFirmaSozlesmeUyarisiHtml(firma)}` : '';
  if (kompakt) {
    seciliEl.querySelector('[data-firma-degistir]').addEventListener('click', () => {
      aramaEl.style.display = '';
      selectEl.style.display = '';
      seciliEl.innerHTML = '';
      aramaEl.focus();
    });
  }
}

// Kullanıcı isteği: "personel girişinde yüklenici firmada işyeri hekimi / iş
// güvenliği uzmanı seçilmediyse sözleşme eksik desin, firmadan seçin desin".
// Uyarıdır, personel kaydını engellemez.
function _ykFirmaSozlesmeUyarisiHtml(firma) {
  const z = _firmaZenginlestir(firma);
  const sorunlar = z.eksikEvraklar.map(t => `${t} eksik`).concat(z.suresiGecenEvraklar.map(t => `${t} süresi geçmiş`));
  if (!sorunlar.length) return '';
  return `
    <div style="background:#fef3c7; border:1px solid #f59e0b; color:#92400e; border-radius:8px; padding:8px 10px; font-size:12.5px; margin:-6px 0 14px;">
      <b>⚠ ${sorunlar.map(_ykKacir).join(', ')}.</b>
      <div style="margin-top:2px;">Yüklenici Firmalar sekmesinde bu firmayı açıp (Düzenle) Sözleşmeler bölümünde "Var" seçin.</div>
    </div>`;
}

function _kisiFirmaSeciliGorunum() {
  _ykFirmaSeciliGorunum(document.getElementById('kisiFirmaAra'), document.getElementById('kisiFirmaId'), document.getElementById('kisiFirmaSecili'));
}

function _kisiFirmaTehlikesiniUygula() {
  return _ykFirmaTehlikesiniUygula(document.getElementById('kisiFirmaId').value,
    document.getElementById('kisiTehlikeSinifi'), document.getElementById('kisiTehlikeKaynak'));
}

function kisiModalAc(kisi) {
  _duzenlenenKisiId = kisi ? kisi.id : null;
  // Derin kopya: taslak üzerindeki değişiklikler kaydedilmeden modal kapatılırsa
  // orijinal kayıt (repository'deki referans) bozulmasın.
  _kisiBelgeTaslak = kisi && kisi.belgeler ? JSON.parse(JSON.stringify(kisi.belgeler)) : yukleniciBosBelgeler();

  document.getElementById('kisiModalBaslik').textContent = kisi ? (kisi.personelNo + ' Kişisini Düzenle') : 'Yeni Yüklenici Personeli';

  const firmalar = yukleniciFirmalariTumunuGetir();
  _yukleniciFirmaListesiCiz(document.getElementById('kisiFirmaId'), firmalar, kisi ? kisi.firmaId : '');
  _yukleniciFirmaAramaBagla('kisiFirmaAra', 'kisiFirmaId', firmalar);

  document.getElementById('adSoyad').value = kisi ? kisi.adSoyad : '';
  document.getElementById('kisiTelefon').value = kisi ? kisi.telefon : '';
  document.getElementById('kisiDurum').innerHTML = KISI_DURUMLARI.map(d => `<option ${kisi && kisi.durum === d ? 'selected' : ''}>${d}</option>`).join('');
  document.getElementById('kisiTehlikeSinifi').innerHTML = YUKLENICI_TEHLIKE_SINIFLARI.map(t => `<option value="${t}" ${(kisi ? kisi.tehlikeSinifi : 'az') === t ? 'selected' : ''}>${YUKLENICI_TEHLIKE_SINIFI_ETIKETLERI[t]}</option>`).join('');
  document.getElementById('kisiPersonelTuru').innerHTML = YUKLENICI_PERSONEL_TURLERI.map(t => `<option value="${t}" ${(kisi ? kisi.personelTuru : 'teknik') === t ? 'selected' : ''}>${YUKLENICI_PERSONEL_TURU_ETIKETLERI[t]}</option>`).join('');
  document.getElementById('kisiPasif').checked = !!(kisi && kisi.pasif);
  document.getElementById('kisiIlkGiris').checked = !!(kisi && kisi.ilkGiris);
  document.getElementById('kisiNotlar').value = kisi ? kisi.notlar : '';

  _kisiFirmaSeciliGorunum();
  _kisiFirmaTehlikesiniUygula();
  _kisiBelgeListesiniCiz();
  temizleFormHatalari('kisiForm');
  document.getElementById('kisiModalKatman').classList.add('acik');
}

function kisiModalKapat() {
  document.getElementById('kisiModalKatman').classList.remove('acik');
  _duzenlenenKisiId = null;
}

function kisiFormGonderildi(e) {
  e.preventDefault();
  temizleFormHatalari('kisiForm');

  // kimlikNo/bolum/gorev/sonrakiKontrolTarihi artık modalda gösterilmiyor (kullanıcı isteği) —
  // ama düzenlenen kişinin bu alanlarda zaten kayıtlı bir değeri varsa
  // (ör. toplu içe aktarımdan gelmiş), formu kaydederken sessizce silinmesin
  // diye mevcut kayıttan aynen korunuyor.
  const _duzenlenenKisi = _duzenlenenKisiId ? yukleniciKisiIdIleGetirRepo(_duzenlenenKisiId) : null;

  const veriler = {
    firmaId: document.getElementById('kisiFirmaId').value,
    adSoyad: document.getElementById('adSoyad').value,
    kimlikNo: _duzenlenenKisi ? _duzenlenenKisi.kimlikNo : '',
    bolum: _duzenlenenKisi ? _duzenlenenKisi.bolum : '',
    gorev: _duzenlenenKisi ? _duzenlenenKisi.gorev : '',
    telefon: document.getElementById('kisiTelefon').value,
    durum: document.getElementById('kisiDurum').value,
    tehlikeSinifi: document.getElementById('kisiTehlikeSinifi').value,
    personelTuru: document.getElementById('kisiPersonelTuru').value,
    pasif: document.getElementById('kisiPasif').checked,
    ilkGiris: document.getElementById('kisiIlkGiris').checked,
    belgeler: _kisiBelgeTaslak,
    sonrakiKontrolTarihi: _duzenlenenKisi ? _duzenlenenKisi.sonrakiKontrolTarihi : undefined,
    notlar: document.getElementById('kisiNotlar').value
  };

  const sonuc = _duzenlenenKisiId ? yukleniciKisiGuncelle(_duzenlenenKisiId, veriler) : yukleniciKisiEkle(veriler);
  if (!sonuc.basarili) { formHatalariniGoster(sonuc.hatalar); return; }

  kisiModalKapat();
  kisileriCiz(document.getElementById('kisiAramaKutusu').value);
}

// ==================== BİRDEN FAZLA PERSONEL ====================
// Kullanıcı isteği: "personel ekle butonu yanına birden fazla butonu koy,
// direk 5 kişilik açılsın istediğim kadar doldurabileyim" — 5 personel
// formu yan yana; belgeleri kontrol ederken sütunlar arasında gezilerek
// doldurulur, tek "Kaydet" ile dolu olanlar kaydedilir (boş sütunlar
// atlanır). Kayıtlar sonradan listeden tek tek düzenlenir (kisiModalAc).

const TOPLU_KISI_FORM_SAYISI = 5;
let _topluKisiTaslaklari = [];

function _topluKisiBaslat() {
  document.getElementById('topluKisiKapatBtn').addEventListener('click', topluKisiKapat);
  document.getElementById('topluKisiIptalBtn').addEventListener('click', topluKisiKapat);
  document.getElementById('topluKisiKaydetBtn').addEventListener('click', topluKisiKaydet);
}

function _topluKisiSutunHtml(i) {
  const hata = alan => `<div class="alan-hatasi" data-tk-hata="${alan}" style="color:var(--hata); font-size:12px; margin-top:-12px; margin-bottom:10px;"></div>`;
  return `
    <div data-tk="${i}" style="border:1px solid var(--kenarlik); border-radius:10px; padding:10px; min-width:0;">
      <div style="font-weight:700; margin-bottom:8px;">${i + 1}. Personel</div>
      <div ${i > 0 ? 'style="display:none;"' : ''}>
        <label>Firma${i === 0 ? ' <span style="font-weight:normal; font-size:12px; color:var(--metin-soluk);">(tüm personel bu firmaya kaydedilir)</span>' : ''}</label>
        <input type="text" data-tk-alan="firmaAra" placeholder="Firma adına göre daralt..." style="margin-bottom:6px;">
        <select data-tk-alan="firmaId" size="5" style="height:auto;"></select>
        <div data-tk-alan="firmaSecili"></div>
      </div>
      ${i > 0 ? '<label>Firma</label><div data-tk-alan="firmaEtiket" style="margin:0 0 12px; font-size:13px; font-weight:600;">1. personeldeki firma</div>' : ''}
      ${hata('firmaId')}
      <label>Ad Soyad</label>
      <input type="text" data-tk-alan="adSoyad">
      ${hata('adSoyad')}
      <div class="form-satir-ikili">
        <div><label>Telefon</label><input type="text" data-tk-alan="telefon"></div>
        <div><label>Durum</label><select data-tk-alan="durum">${KISI_DURUMLARI.map(d => `<option>${d}</option>`).join('')}</select></div>
      </div>
      <div class="form-satir-ikili">
        <div>
          <label>Tehlike Sınıfı</label>
          <select data-tk-alan="tehlikeSinifi">${YUKLENICI_TEHLIKE_SINIFLARI.map(t => `<option value="${t}">${YUKLENICI_TEHLIKE_SINIFI_ETIKETLERI[t]}</option>`).join('')}</select>
          <div data-tk-alan="tehlikeKaynak" style="font-size:11px; color:var(--metin-soluk); margin-top:-10px; margin-bottom:8px;"></div>
        </div>
        <div><label>Personel Türü</label><select data-tk-alan="personelTuru">${YUKLENICI_PERSONEL_TURLERI.map(t => `<option value="${t}" ${t === 'teknik' ? 'selected' : ''}>${YUKLENICI_PERSONEL_TURU_ETIKETLERI[t]}</option>`).join('')}</select></div>
      </div>
      <div class="form-satir-ikili">
        <label style="display:flex; align-items:center; gap:8px; font-weight:normal;"><input type="checkbox" data-tk-alan="pasif" style="width:auto;"> Pasif</label>
        <label style="display:flex; align-items:center; gap:8px; font-weight:normal;"><input type="checkbox" data-tk-alan="ilkGiris" style="width:auto;"> İlk Giriş</label>
      </div>
      <div data-tk-alan="canliDurum" style="margin:10px 0;"></div>
      <div class="form-bolum-baslik">Belgeler</div>
      <div data-tk-alan="belgeler"></div>
      <label>Notlar</label>
      <textarea data-tk-alan="notlar"></textarea>
    </div>`;
}

function topluKisiAc() {
  const kutu = document.getElementById('topluKisiSutunlar');
  _topluKisiTaslaklari = Array.from({ length: TOPLU_KISI_FORM_SAYISI }, () => yukleniciBosBelgeler());
  kutu.innerHTML = _topluKisiTaslaklari.map((_, i) => _topluKisiSutunHtml(i)).join('');
  document.getElementById('topluKisiGenelHata').textContent = '';

  const firmalar = yukleniciFirmalariTumunuGetir();
  kutu.querySelectorAll('[data-tk]').forEach(sutun => {
    const i = Number(sutun.getAttribute('data-tk'));
    const q = ad => sutun.querySelector(`[data-tk-alan="${ad}"]`);
    const firmaSec = q('firmaId');
    _yukleniciFirmaListesiCiz(firmaSec, firmalar, '');
    q('firmaAra').addEventListener('input', () => {
      const seciliId = firmaSec.value;
      const terim = _basligiNormallestir(q('firmaAra').value);
      _yukleniciFirmaListesiCiz(firmaSec, terim ? firmalar.filter(f => _basligiNormallestir(f.firmaAdi).includes(terim)) : firmalar, seciliId);
    });
    const belgeleriCiz = () => _topluKisiBelgeleriCiz(i);
    // Kullanıcı isteği: "tek firma seçimi olsun, diğerleri de aynı firmaya
    // kaydedilsin; 2-5'te firma seçimini gizle" — firma sadece 1. sütunda
    // seçilir, diğer sütunların (gizli) seçimine aynen yazılır.
    if (i === 0) firmaSec.addEventListener('change', () => {
      _topluKisiFirmaUygula(0, firmaSec.value);
      const secili = firmalar.find(f => f.id === firmaSec.value);
      kutu.querySelectorAll('[data-tk]').forEach(diger => {
        if (diger === sutun) return;
        const j = Number(diger.getAttribute('data-tk'));
        _yukleniciFirmaListesiCiz(diger.querySelector('[data-tk-alan="firmaId"]'), firmalar, firmaSec.value);
        diger.querySelector('[data-tk-alan="firmaEtiket"]').textContent = secili ? secili.firmaAdi : '1. personeldeki firma';
        _topluKisiFirmaUygula(j, firmaSec.value);
      });
    });
    q('tehlikeSinifi').addEventListener('change', belgeleriCiz);
    q('personelTuru').addEventListener('change', belgeleriCiz);
    q('ilkGiris').addEventListener('change', () => _topluKisiCanliDurumGuncelle(i));
    belgeleriCiz();
  });

  document.getElementById('topluKisiKatman').classList.add('acik');
}

// Bir sütunun firması değişince: tehlike sınıfını firmadan al, gerekirse
// belge geçerliliklerini yeniden çiz, firma hatasını temizle.
function _topluKisiFirmaUygula(i, firmaId) {
  const sutun = _topluKisiSutunu(i);
  const q = ad => sutun.querySelector(`[data-tk-alan="${ad}"]`);
  _ykFirmaSeciliGorunum(q('firmaAra'), q('firmaId'), q('firmaSecili'));
  if (_ykFirmaTehlikesiniUygula(firmaId, q('tehlikeSinifi'), q('tehlikeKaynak'))) _topluKisiBelgeleriCiz(i);
  const hata = sutun.querySelector('[data-tk-hata="firmaId"]');
  if (hata && firmaId) hata.textContent = '';
}

function topluKisiKapat() {
  document.getElementById('topluKisiKatman').classList.remove('acik');
  document.getElementById('topluKisiSutunlar').innerHTML = '';
  _topluKisiTaslaklari = [];
}

function _topluKisiSutunu(i) { return document.querySelector(`#topluKisiSutunlar [data-tk="${i}"]`); }

function _topluKisiBelgeleriCiz(i) {
  const sutun = _topluKisiSutunu(i);
  const q = ad => sutun.querySelector(`[data-tk-alan="${ad}"]`);
  _ykBelgeListesiCiz(q('belgeler'), _topluKisiTaslaklari[i], () => q('tehlikeSinifi').value, q('personelTuru').value, () => _topluKisiCanliDurumGuncelle(i));
}

function _topluKisiCanliDurumGuncelle(i) {
  const sutun = _topluKisiSutunu(i);
  if (!sutun) return;
  const q = ad => sutun.querySelector(`[data-tk-alan="${ad}"]`);
  q('canliDurum').innerHTML = _ykCanliDurumHtml(q('tehlikeSinifi').value, q('ilkGiris').checked, _topluKisiTaslaklari[i]);
}

function _topluKisiVerisiniOku(i) {
  const sutun = _topluKisiSutunu(i);
  const q = ad => sutun.querySelector(`[data-tk-alan="${ad}"]`);
  return {
    firmaId: q('firmaId').value,
    adSoyad: q('adSoyad').value,
    kimlikNo: '', bolum: '', gorev: '',
    telefon: q('telefon').value,
    durum: q('durum').value,
    tehlikeSinifi: q('tehlikeSinifi').value,
    personelTuru: q('personelTuru').value,
    pasif: q('pasif').checked,
    ilkGiris: q('ilkGiris').checked,
    belgeler: _topluKisiTaslaklari[i],
    notlar: q('notlar').value
  };
}

// Kullanıcı isteği: "5'li formda personel adı girmezsem onu dikkate
// almasın" — ad soyadı boş sütun, başka alanları dolu olsa bile atlanır.
function _topluKisiSutunuDoluMu(v) {
  return !!(v.adSoyad || '').trim();
}

function topluKisiKaydet() {
  const genelHata = document.getElementById('topluKisiGenelHata');
  genelHata.textContent = '';
  document.querySelectorAll('#topluKisiSutunlar [data-tk-hata]').forEach(el => { el.textContent = ''; });

  const dolu = _topluKisiTaslaklari.map((_, i) => ({ i, veriler: _topluKisiVerisiniOku(i) })).filter(x => _topluKisiSutunuDoluMu(x.veriler));
  if (!dolu.length) { genelHata.textContent = 'En az bir personelin ad soyadını girin (ad soyadı boş formlar dikkate alınmaz).'; return; }

  // Önce hepsi doğrulanır; eksik olan varsa hiçbiri kaydedilmez (yarım kayıt olmasın).
  const hataliSutunlar = [];
  dolu.forEach(({ i, veriler }) => {
    const d = yukleniciKisiDogrula(veriler);
    if (d.gecerli) return;
    hataliSutunlar.push(i + 1);
    const sutun = _topluKisiSutunu(i);
    Object.keys(d.hatalar).forEach(alan => {
      const el = sutun.querySelector(`[data-tk-hata="${alan}"]`);
      if (el) el.textContent = (alan === 'firmaId' && i > 0) ? 'Firmayı 1. personelde seçin.' : d.hatalar[alan];
    });
  });
  if (hataliSutunlar.length) {
    genelHata.textContent = `${hataliSutunlar.join(', ')}. personelde eksik bilgi var. Düzeltip tekrar kaydedin (henüz hiçbiri kaydedilmedi).`;
    return;
  }

  const kaydedilenler = dolu.map(({ veriler }) => yukleniciKisiEkle(veriler)).filter(s => s.basarili);
  topluKisiKapat();
  kisileriCiz(document.getElementById('kisiAramaKutusu').value);
  alert(`${kaydedilenler.length} personel kaydedildi: ${kaydedilenler.map(s => s.kisi.adSoyad).join(', ')}`);
}

// ==================== ARAÇ / EKİPMAN ====================

function _aracBelgeRozetHtml(varMi) {
  return varMi
    ? '<span class="genel-rozet rozet-uygun">Uygun</span>'
    : '<span class="genel-rozet rozet-uygun-degil">Uygun Değil</span>';
}

function araclariCiz(aramaMetni) {
  const govde = document.getElementById('aracTabloGovde');
  const bosDurum = document.getElementById('aracBosDurum');
  const araclar = _ykSirala(yukleniciAraclariniGetir(aramaMetni), _ykSiralamaDegeri('aracSiralama'), a => a.olusturmaTarihi, a => a.firmaAdi);

  govde.innerHTML = '';
  if (araclar.length === 0) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = aramaMetni ? 'Aramanızla eşleşen araç/ekipman bulunamadı.' : 'Henüz araç/ekipman eklenmedi.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  araclar.forEach(a => {
    const satir = document.createElement('tr');
    satir.classList.add(yukleniciAracSatirSinifiHesapla(a));
    if (a.pasif) satir.style.opacity = '0.55';
    satir.innerHTML = `
      <td>${a.aracNo}</td>
      <td>${_ykKacir(a.firmaAdi)}${a.pasif ? ' <span class="genel-rozet rozet-pasif" style="font-size:10px;">Pasif</span>' : ''}</td>
      <td>${_ykKacir(a.tur)}</td>
      <td>${_ykKacir(a.kimlik)}</td>
      <td>${_aracBelgeRozetHtml(a.ptmOk)}</td>
      <td>${_aracBelgeRozetHtml(a.ruhsatOk)}</td>
      <td>${_aracBelgeRozetHtml(a.zmsOk)}</td>
      <td>${_aracBelgeRozetHtml(a.tuvOk)}</td>
      <td>${a.uygunMu ? '<span class="genel-rozet rozet-uygun">Uygun</span>' : '<span class="genel-rozet rozet-uygun-degil">Uygun Değil</span>'}</td>
      <td>${_ykKayitTarihiGoster(a.olusturmaTarihi)}</td>
      <td>
        <button class="tablo-buton" data-arac-pasif="${a.id}" data-yeni-pasif="${a.pasif ? 'false' : 'true'}">${a.pasif ? 'Aktif Yap' : 'Pasif Yap'}</button>
        <button class="tablo-buton" data-duzenle="${a.id}">Düzenle</button>
        <button class="tablo-buton sil" data-sil="${a.id}">Sil</button>
      </td>
    `;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-arac-pasif]').forEach(btn => btn.addEventListener('click', () => {
    yukleniciAracPasifDurumunuDegistir(btn.getAttribute('data-arac-pasif'), btn.getAttribute('data-yeni-pasif') === 'true');
    araclariCiz(document.getElementById('aracAramaKutusu').value);
  }));
  govde.querySelectorAll('[data-duzenle]').forEach(btn => btn.addEventListener('click', () => aracModalAc(yukleniciAracIdIleGetirRepo(btn.getAttribute('data-duzenle')))));
  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', async () => {
    if (await onayModali('Bu araç/ekipman kaydını silmek istediğinize emin misiniz?', 'Sil')) { yukleniciAracSil(btn.getAttribute('data-sil')); araclariCiz(document.getElementById('aracAramaKutusu').value); }
  }));
}

function aracModalAc(arac) {
  _duzenlenenAracId = arac ? arac.id : null;

  document.getElementById('aracModalBaslik').textContent = arac ? (arac.aracNo + ' Kaydını Düzenle') : 'Yeni Araç / Ekipman';

  const firmalar = yukleniciFirmalariTumunuGetir();
  _yukleniciFirmaListesiCiz(document.getElementById('aracFirmaId'), firmalar, arac ? arac.firmaId : '');
  _yukleniciFirmaAramaBagla('aracFirmaAra', 'aracFirmaId', firmalar);

  document.getElementById('aracTur').innerHTML = YUKLENICI_ARAC_TURLERI.map(t => `<option ${arac && arac.tur === t ? 'selected' : ''}>${t}</option>`).join('');
  document.getElementById('aracKimlik').value = arac ? arac.kimlik : '';
  document.getElementById('aracPtmVar').value = arac ? arac.ptmVar : 'Var';
  document.getElementById('aracPtmTarih').value = arac ? arac.ptmTarih : '';
  document.getElementById('aracPtmGecerlilik').value = arac ? arac.ptmGecerlilik : '';
  document.getElementById('aracRuhsat').value = arac ? arac.ruhsat : 'Var';
  document.getElementById('aracZmsTarih').value = arac ? arac.zmsTarih : '';
  document.getElementById('aracZmsGecerlilik').value = arac ? arac.zmsGecerlilik : '';
  document.getElementById('aracTuvTarih').value = arac ? arac.tuvTarih : '';
  document.getElementById('aracTuvGecerlilik').value = arac ? arac.tuvGecerlilik : '';
  document.getElementById('aracPasif').checked = !!(arac && arac.pasif);
  document.getElementById('aracNotlar').value = arac ? arac.notlar : '';

  _aracCanliDurumuGuncelle();
  temizleFormHatalari('aracForm');
  document.getElementById('aracModalKatman').classList.add('acik');
}

function aracModalKapat() {
  document.getElementById('aracModalKatman').classList.remove('acik');
  _duzenlenenAracId = null;
}

function _aracFormDenVeriOku() {
  return {
    firmaId: document.getElementById('aracFirmaId').value,
    tur: document.getElementById('aracTur').value,
    kimlik: document.getElementById('aracKimlik').value,
    ptmVar: document.getElementById('aracPtmVar').value,
    ptmTarih: document.getElementById('aracPtmTarih').value,
    ptmGecerlilik: document.getElementById('aracPtmGecerlilik').value,
    ruhsat: document.getElementById('aracRuhsat').value,
    zmsTarih: document.getElementById('aracZmsTarih').value,
    zmsGecerlilik: document.getElementById('aracZmsGecerlilik').value,
    tuvTarih: document.getElementById('aracTuvTarih').value,
    tuvGecerlilik: document.getElementById('aracTuvGecerlilik').value,
    pasif: document.getElementById('aracPasif').checked,
    notlar: document.getElementById('aracNotlar').value
  };
}

// Kaydetmeden önce canlı "Genel Durum" önizlemesi (bkz. _kisiCanliDurumuGuncelle
// ile aynı gerekçe — kullanıcı dostu anlık geri bildirim).
function _aracCanliDurumuGuncelle() {
  const kutu = document.getElementById('aracCanliDurum');
  if (!kutu) return;
  const uygunluk = aracUygunlukHesapla(_aracFormDenVeriOku(), bugunIso());
  kutu.innerHTML = uygunluk.uygunMu
    ? '<div class="genel-rozet rozet-uygun" style="font-size:13px; padding:8px 12px;">✓ Genel Durum: Uygun</div>'
    : '<div class="genel-rozet rozet-uygun-degil" style="font-size:13px; padding:8px 12px;">⛔ Genel Durum: Uygun Değil — PTM/Ruhsat/ZMS/TÜVTÜRK belgelerinden en az biri eksik veya süresi geçmiş.</div>';
}

function aracFormGonderildi(e) {
  e.preventDefault();
  temizleFormHatalari('aracForm');

  const veriler = _aracFormDenVeriOku();
  const sonuc = _duzenlenenAracId ? yukleniciAracGuncelle(_duzenlenenAracId, veriler) : yukleniciAracEkle(veriler);
  if (!sonuc.basarili) {
    formHatalariniGoster(sonuc.hatalar);
    // #firmaIdHata kişi formunda da kullanıldığı için araç formu kendi ayrı
    // #firmaIdHata2 elemanına yazıyor (bkz. index.html).
    if (sonuc.hatalar.firmaId) document.getElementById('firmaIdHata2').textContent = sonuc.hatalar.firmaId;
    return;
  }

  aracModalKapat();
  araclariCiz(document.getElementById('aracAramaKutusu').value);
}

// ==================== ZİYARETÇİLER ====================

function ziyaretcileriCiz() {
  const govde = document.getElementById('ziyaretciTabloGovde');
  const bosDurum = document.getElementById('ziyaretciBosDurum');
  const ziyaretciler = yukleniciZiyaretcileriniGetir();

  govde.innerHTML = '';
  if (ziyaretciler.length === 0) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = 'Henüz ziyaretçi kaydı eklenmedi.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  ziyaretciler.forEach(z => {
    const satir = document.createElement('tr');
    satir.innerHTML = `
      <td>${formatTarihGoster(z.tarih)}</td>
      <td>${_ykKacir(z.adSoyad)}</td>
      <td>${_ykKacir(z.firma) || '-'}</td>
      <td>${_ykKacir(z.ziyaretEdilen) || '-'}</td>
      <td><button class="tablo-buton sil" data-sil="${z.id}">Sil</button></td>
    `;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', async () => {
    if (await onayModali('Bu ziyaretçi kaydını silmek istediğinize emin misiniz?', 'Sil')) { yukleniciZiyaretciSil(btn.getAttribute('data-sil')); ziyaretcileriCiz(); }
  }));
}

function ziyaretciFormGonderildi(e) {
  e.preventDefault();
  temizleFormHatalari('ziyaretciForm');

  const veriler = {
    adSoyad: document.getElementById('ziyaretciAdSoyad').value,
    firma: document.getElementById('ziyaretciFirma').value,
    ziyaretEdilen: document.getElementById('ziyaretciZiyaretEdilen').value,
    tarih: document.getElementById('ziyaretciTarih').value
  };

  const sonuc = yukleniciZiyaretciEkle(veriler);
  if (!sonuc.basarili) {
    if (sonuc.hatalar.adSoyad) document.getElementById('adSoyadHata2').textContent = sonuc.hatalar.adSoyad;
    if (sonuc.hatalar.tarih) document.getElementById('tarihHata').textContent = sonuc.hatalar.tarih;
    return;
  }

  document.getElementById('ziyaretciForm').reset();
  ziyaretcileriCiz();
}

// ==================== KAYITLAR ====================

function kayitlariCiz(aramaMetni) {
  const govde = document.getElementById('kayitTabloGovde');
  const bosDurum = document.getElementById('kayitBosDurum');
  const kayitlar = _ykSirala(yukleniciKayitlariniGetir(aramaMetni), _ykSiralamaDegeri('kayitSiralama'), r => r.kaynak && r.kaynak.olusturmaTarihi, r => r.kimlik);
  document.getElementById('kayitTumunuSecCheckbox').checked = false;

  govde.innerHTML = '';
  if (kayitlar.length === 0) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = aramaMetni ? 'Aramanızla eşleşen kayıt bulunamadı.' : 'Henüz kayıt yok.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  kayitlar.forEach(r => {
    const satir = document.createElement('tr');
    satir.classList.add(r.sinif);
    if (r.pasif) satir.style.opacity = '0.55';
    satir.innerHTML = `
      <td><input type="checkbox" data-kayit-sec data-kind="${r.kind}" data-id="${r.id}"></td>
      <td>${_ykKacir(r.tur)}</td>
      <td>${_ykKacir(r.firma)}</td>
      <td>${_ykKacir(r.kimlik)}</td>
      <td>${r.uygunSayisi}/${r.toplamSayisi}</td>
      <td>${r.kayitTarihi ? formatTarihGoster(r.kayitTarihi) : '-'}</td>
      <td>${_ykKacir(r.egitmen)}</td>
      <td>
        <span class="genel-rozet ${r.pasif ? 'rozet-pasif' : 'rozet-uygun'}" style="font-size:10px;">${r.pasif ? 'Pasif' : 'Aktif'}</span>
        <button class="tablo-buton" data-pasif-degistir2="${r.id}" data-kind="${r.kind}" data-yeni-pasif="${r.pasif ? 'false' : 'true'}">${r.pasif ? 'Aktif Yap' : 'Pasif Yap'}</button>
        <button class="tablo-buton" data-duzenle-kayit="${r.id}" data-kind="${r.kind}">Düzenle</button>
        ${r.kind === 'personel' ? `<button class="tablo-buton" data-mail-eksik="${r.id}" title="Bu kişinin eksiklerini mail metni olarak ver">Mail</button>` : ''}
        <button class="tablo-buton sil" data-sil-kayit="${r.id}" data-kind="${r.kind}">Sil</button>
      </td>
    `;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-pasif-degistir2]').forEach(btn => {
    btn.addEventListener('click', () => {
      const degistir = btn.getAttribute('data-kind') === 'personel' ? yukleniciKisiPasifDurumunuDegistir : yukleniciAracPasifDurumunuDegistir;
      degistir(btn.getAttribute('data-pasif-degistir2'), btn.getAttribute('data-yeni-pasif') === 'true');
      kayitlariCiz(document.getElementById('kayitAramaKutusu').value);
    });
  });
  govde.querySelectorAll('[data-duzenle-kayit]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-duzenle-kayit');
      if (btn.getAttribute('data-kind') === 'personel') kisiModalAc(yukleniciKisiIdIleGetirRepo(id));
      else aracModalAc(yukleniciAracIdIleGetirRepo(id));
    });
  });
  govde.querySelectorAll('[data-mail-eksik]').forEach(btn => btn.addEventListener('click', () => {
    const kisi = yukleniciKisiIdIleGetirRepo(btn.getAttribute('data-mail-eksik'));
    if (kisi) mailEksikAc([kisi]);
  }));
  govde.querySelectorAll('[data-sil-kayit]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!(await onayModali('Bu kaydı silmek istediğinize emin misiniz?', 'Sil'))) return;
      const id = btn.getAttribute('data-sil-kayit');
      if (btn.getAttribute('data-kind') === 'personel') yukleniciKisiSil(id); else yukleniciAracSil(id);
      kayitlariCiz(document.getElementById('kayitAramaKutusu').value);
    });
  });
}

// Kullanıcı isteği: "Mail için Eksiklikler" Kayıtlar sekmesinde de olsun —
// seçili personel (araçlar hariç) firma firma gruplanmış tek metinde.
function kayitSecilenleriMailEksik() {
  const kisiler = Array.from(document.querySelectorAll('#kayitTabloGovde [data-kayit-sec][data-kind="personel"]:checked'))
    .map(cb => yukleniciKisiIdIleGetirRepo(cb.getAttribute('data-id')))
    .filter(Boolean);
  if (!kisiler.length) { alert('Lütfen listeden en az bir personel seçin (kutucuğu işaretleyin).'); return; }
  mailEksikAc(kisiler);
}

async function kayitSecilenleriSil() {
  const secililer = Array.from(document.querySelectorAll('#kayitTabloGovde [data-kayit-sec]:checked'))
    .map(cb => ({ kind: cb.getAttribute('data-kind'), id: cb.getAttribute('data-id') }));
  if (!secililer.length) { alert('Lütfen silmek için en az bir kayıt seçin.'); return; }
  if (!(await onayModali(`${secililer.length} kayıt silinsin mi?`, 'Sil'))) return;

  const sonuc = yukleniciKayitlariToplusil(secililer);
  alert(`${sonuc.silinen} kayıt silindi.`);
  kayitlariCiz(document.getElementById('kayitAramaKutusu').value);
}

// ==================== ÖZET ====================

function ozetiCiz() {
  const ozet = yukleniciOzetiHesapla();
  const kutu = document.getElementById('ozetKutusu');
  const kart = (etiket, deger) => `<div class="istatistik-kutu"><span>${etiket}</span><b>${deger}</b></div>`;
  const dagilimHtml = (baslik, satirlar) => `
    <div class="kart" style="margin-bottom:14px;">
      <div class="card-title" style="margin-bottom:8px;"><h3 style="margin:0; font-size:14px;">${baslik}</h3></div>
      ${satirlar.length
        ? satirlar.map(([k, v]) => `<div style="display:flex; justify-content:space-between; font-size:13px; padding:6px 0; border-bottom:1px solid var(--kenarlik);"><span>${_ykKacir(k)}</span><strong>${v}</strong></div>`).join('')
        : '<div class="bos-durum gorunur">Veri yok.</div>'}
    </div>
  `;

  kutu.innerHTML = `
    <div class="istatistik-grid">
      ${kart('Toplam Firma', ozet.toplamFirma)}
      ${kart('Aktif Firma', ozet.aktifFirma)}
      ${kart('Toplam Personel', ozet.toplamKisi)}
      ${kart('Girişe Uygun', ozet.girisUygunKisi)}
      ${kart('Girişe Kapalı', ozet.girisKapaliKisi)}
      ${kart('Uygunluk Oranı', ozet.uygunlukOrani + '%')}
      ${kart('Toplam Araç/Ekipman', ozet.toplamArac)}
      ${kart('Uygun Araç/Ekipman', ozet.uygunArac)}
    </div>

    <div class="modul-grid" style="grid-template-columns: repeat(auto-fill, minmax(260px,1fr));">
      <div>${dagilimHtml('Risk Seviyesine Göre Firma', ozet.riskeGoreFirma)}</div>
      <div>${dagilimHtml('Firmaya Göre Personel', ozet.firmayaGoreKisi)}</div>
    </div>

    <div class="card-title" style="margin:20px 0 8px;"><h3 style="margin:0; font-size:14px;">Uygun Olmayan Firmalar</h3></div>
    <div class="tablo-scroll">
      <table class="veri-tablosu">
        <thead><tr><th>Firma No</th><th>Firma Adı</th><th>Uygunluk Durumu</th></tr></thead>
        <tbody>
          ${ozet.uygunOlmayanFirmalar.map(f => `<tr><td>${f.firmaNo}</td><td>${_ykKacir(f.firmaAdi)}</td><td>${_uygunlukOzetiHtml(f)}</td></tr>`).join('') || '<tr><td colspan="3">Tüm firmalar uygun.</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="card-title" style="margin:20px 0 8px;"><h3 style="margin:0; font-size:14px;">Uygun Olmayan Personel</h3></div>
    <div class="tablo-scroll">
      <table class="veri-tablosu">
        <thead><tr><th>Personel No</th><th>Ad Soyad</th><th>Firma</th><th>Uygunluk Durumu</th></tr></thead>
        <tbody>
          ${ozet.uygunOlmayanKisiler.map(k => `<tr><td>${k.personelNo}</td><td>${_ykKacir(k.adSoyad)}</td><td>${_ykKacir(k.firmaAdi)}</td><td>${_kisiUygunlukOzetiHtml(k)}</td></tr>`).join('') || '<tr><td colspan="4">Tüm personel uygun.</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="card-title" style="margin:20px 0 8px;"><h3 style="margin:0; font-size:14px;">Uygun Olmayan Araç / Ekipman</h3></div>
    <div class="tablo-scroll">
      <table class="veri-tablosu">
        <thead><tr><th>Araç No</th><th>Plaka / Seri No</th><th>Firma</th><th>Uygunluk Durumu</th></tr></thead>
        <tbody>
          ${ozet.uygunOlmayanAraclar.map(a => `<tr><td>${a.aracNo}</td><td>${_ykKacir(a.kimlik)}</td><td>${_ykKacir(a.firmaAdi)}</td><td><span class="genel-rozet rozet-uygun-degil">Uygun Değil</span></td></tr>`).join('') || '<tr><td colspan="4">Tüm araç/ekipman uygun.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

// ==================== Ortak yardımcılar ====================

function temizleFormHatalari(formId) {
  document.querySelectorAll('#' + formId + ' .alan-hatasi').forEach(el => el.textContent = '');
}

function formHatalariniGoster(hatalar) {
  Object.keys(hatalar).forEach(alan => {
    const hataEl = document.getElementById(alan + 'Hata');
    if (hataEl) hataEl.textContent = hatalar[alan];
  });
}
