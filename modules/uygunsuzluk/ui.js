// Uygunsuzluk / DÖF ekranının DOM işlemleri.

let _usGorunum = 'kayitlar';
let _duzenlenenKayitId = null;
// Saha Dijital Haritası'ndan "Nokta Ekle → Uygunsuzluk" ile buraya
// yönlendirildiğinde (bkz. modules/harita/ui.js) taşınan konum — form
// kaydedilirken yeni kayda eklenir. Düzenlemede kullanılmaz.
let _bekleyenHaritaKonum = null;
let _usFotoOncesi = '';
let _usFotoSonrasi = '';
let _secilenKonuId = '';

// Konu/Defter dropdown'ını doldurur; seçim hâlâ mevcutsa korunur.
function _konuSecimDoldur() {
  const secim = document.getElementById('konuSecim');
  const oncekiSecim = secim.value || _secilenKonuId;
  const konular = uygunsuzlukKonulariniGetir();

  secim.innerHTML = '<option value="">Tüm Konular</option>' +
    konular.map(k => `<option value="${k.id}">${_usKacir(k.ad)} (${k.kayitSayisi})</option>`).join('');

  const gecerliMi = konular.some(k => k.id === oncekiSecim);
  secim.value = gecerliMi ? oncekiSecim : '';
  _secilenKonuId = secim.value;
}

function _usKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// "İlgili Yasal Şartlar" çoklu seçim kutusunu YASAL_SART_LISTESI ile bir kez
// doldurur (bkz. model.js) — eski platformdaki select#yasalSartlar ile aynı.
function _yasalSartlariDoldur() {
  const secim = document.getElementById('yasalSartlar');
  secim.innerHTML = YASAL_SART_LISTESI.map(metin => `<option value="${_usKacir(metin)}">${_usKacir(metin)}</option>`).join('');
}

function _seciliYasalSartlariGetir() {
  return Array.from(document.getElementById('yasalSartlar').selectedOptions).map(o => o.value);
}

function _yasalSartlariSec(secili) {
  const liste = Array.isArray(secili) ? secili : [];
  Array.from(document.getElementById('yasalSartlar').options).forEach(opt => {
    opt.selected = liste.includes(opt.value);
  });
}

// deger, doğrudan gösterilebilir bir url OLABİLİR ya da "fotoref:<id>" gibi
// ayrı bir Firestore belgesine işaret eden bir referans olabilir — img'e
// data-foto-ref olarak yazılır, fotoReferanslariCoz() ikisini de doğru çözer.
function _usFotoOnizlemeCiz(kutuId, deger, temizleFn) {
  const kutu = document.getElementById(kutuId);
  kutu.innerHTML = deger
    ? `<div style="display:flex; align-items:center; gap:10px;">
         <img data-foto-ref="${deger}" style="width:72px; height:72px; object-fit:cover; border-radius:8px; border:1px solid var(--kenarlik);">
         <div>
           <div style="font-size:12px; color:#16a34a; font-weight:600;">✓ Fotoğraf eklendi</div>
           <button type="button" class="tablo-buton sil" style="margin-top:4px;">Fotoğrafı Kaldır</button>
         </div>
       </div>`
    : '<div style="font-size:12px; color:var(--metin-soluk);">Henüz fotoğraf eklenmedi.</div>';
  if (deger) {
    kutu.querySelector('button').addEventListener('click', temizleFn);
    fotoReferanslariCoz(kutu);
  }
}

function _usFotoAlaniniHazirla(inputId, onizlemeKutuId, mevcutDegerGetir, mevcutDegerAta) {
  document.getElementById(inputId).addEventListener('change', async e => {
    const dosya = e.target.files[0];
    e.target.value = '';
    if (!dosya) return;
    try {
      const sonuc = await fotoYukle(dosya, 'uygunsuzluk/' + (_duzenlenenKayitId || 'gecici'));
      mevcutDegerAta(sonuc.url);
      _usFotoOnizlemeCiz(onizlemeKutuId, mevcutDegerGetir(), () => { mevcutDegerAta(''); _usFotoOnizlemeCiz(onizlemeKutuId, '', null); });
    } catch (hata) {
      alert(hata.message || 'Fotoğraf yüklenemedi.');
    }
  });
}

function usRozetSinifAdi(durum) {
  return slugOlustur(durum || '');
}

function uygunsuzlukSayfasiniBaslat() {
  document.getElementById('sekmeKayitlar').addEventListener('click', () => gorunumDegistir('kayitlar'));
  document.getElementById('sekmeOzet').addEventListener('click', () => gorunumDegistir('ozet'));

  document.getElementById('yeniKayitBtn').addEventListener('click', () => kayitModalAc());
  document.getElementById('modalKapatBtn').addEventListener('click', kayitModalKapat);
  document.getElementById('modalIptalBtn').addEventListener('click', kayitModalKapat);
  document.getElementById('kayitForm').addEventListener('submit', formGonderildi);
  document.getElementById('aramaKutusu').addEventListener('input', e => kayitlariCiz(e.target.value));
  document.getElementById('durumFiltre').addEventListener('change', () => kayitlariCiz(document.getElementById('aramaKutusu').value));
  document.getElementById('riskFiltre').addEventListener('change', () => kayitlariCiz(document.getElementById('aramaKutusu').value));

  document.getElementById('konuSecim').addEventListener('change', e => {
    _secilenKonuId = e.target.value;
    if (_usGorunum === 'kayitlar') kayitlariCiz(document.getElementById('aramaKutusu').value);
    else ozetiCiz();
  });
  document.getElementById('konuYeniBtn').addEventListener('click', () => {
    const ad = prompt('Yeni konu/defter adı:', '');
    if (ad === null) return;
    const sonuc = uygunsuzlukKonuEkle(ad);
    if (!sonuc.basarili) { alert(sonuc.hata); return; }
    _konuSecimDoldur();
    document.getElementById('konuSecim').value = sonuc.konu.id;
    _secilenKonuId = sonuc.konu.id;
    kayitlariCiz(document.getElementById('aramaKutusu').value);
  });
  document.getElementById('konuYenidenAdlandirBtn').addEventListener('click', () => {
    if (!_secilenKonuId) { alert('Önce yeniden adlandırılacak konuyu seçin.'); return; }
    const mevcut = uygunsuzlukKonulariniGetir().find(k => k.id === _secilenKonuId);
    const yeniAd = prompt('Yeni konu adı:', mevcut ? mevcut.ad : '');
    if (yeniAd === null) return;
    const sonuc = uygunsuzlukKonuYenidenAdlandir(_secilenKonuId, yeniAd);
    if (!sonuc.basarili) { alert(sonuc.hata); return; }
    _konuSecimDoldur();
    document.getElementById('konuSecim').value = _secilenKonuId;
    kayitlariCiz(document.getElementById('aramaKutusu').value);
  });

  document.getElementById('sablonIndirBtn').addEventListener('click', () => {
    excelSablonIndir(UYGUNSUZLUK_IMPORT_KOLONLARI, 'uygunsuzluk_sablonu.xlsx');
  });
  document.getElementById('disaAktarBtn').addEventListener('click', () => {
    const filtreler = { durum: document.getElementById('durumFiltre').value, riskSeviyesi: document.getElementById('riskFiltre').value, konuId: _secilenKonuId };
    excelDisaAktar(_uygunsuzlukExcelSatirlariniHazirla(uygunsuzluklariGetir(document.getElementById('aramaKutusu').value, filtreler)), UYGUNSUZLUK_EXPORT_KOLONLARI, 'uygunsuzluk_kayitlari.xlsx');
  });
  document.getElementById('listeYazdirBtn').addEventListener('click', () => {
    const filtreler = { durum: document.getElementById('durumFiltre').value, riskSeviyesi: document.getElementById('riskFiltre').value, konuId: _secilenKonuId };
    const kayitlar = uygunsuzluklariGetir(document.getElementById('aramaKutusu').value, filtreler);
    raporListesiYazdir('Uygunsuzluk Listesi', '', UYGUNSUZLUK_EXPORT_KOLONLARI, _uygunsuzlukExcelSatirlariniHazirla(kayitlar));
  });
  document.getElementById('pdfRaporBtn').addEventListener('click', async () => {
    try { await uygunsuzlukRaporuPdfOlustur(); } catch (hata) { console.error(hata); alert('PDF üretilemedi: ' + (hata.message || hata)); }
  });
  document.getElementById('raporMetniBtn').addEventListener('click', raporMetniModalAc);
  document.getElementById('raporMetniKapatBtn').addEventListener('click', raporMetniModalKapat);
  document.getElementById('raporMetniIptalBtn').addEventListener('click', raporMetniModalKapat);
  document.getElementById('raporMetniKaydetBtn').addEventListener('click', raporMetniKaydet);
  document.getElementById('formAyarlariBtn').addEventListener('click', () => formAyarlariModalAc('uygunsuzluk', 'Uygunsuzluk'));
  _usFotoAlaniniHazirla('fotoOncesiDosya', 'fotoOncesiOnizleme', () => _usFotoOncesi, v => { _usFotoOncesi = v; });
  _usFotoAlaniniHazirla('fotoSonrasiDosya', 'fotoSonrasiOnizleme', () => _usFotoSonrasi, v => { _usFotoSonrasi = v; });

  document.getElementById('iceAktarBtn').addEventListener('click', () => document.getElementById('iceAktarDosya').click());
  document.getElementById('iceAktarDosya').addEventListener('change', e => {
    const dosya = e.target.files[0];
    excelIceAktar(dosya, UYGUNSUZLUK_IMPORT_KOLONLARI, (satirlar, hataMesaji) => {
      e.target.value = '';
      if (hataMesaji) { alert(hataMesaji); return; }
      const konuSecili = uygunsuzlukKonulariniGetir().find(k => k.id === _secilenKonuId);
      satirlar.forEach(satir => {
        satir.termin = excelTarihiNormallestir(satir.termin);
        satir.bildirimTarihi = excelTarihiNormallestir(satir.bildirimTarihi);
        satir.kapanisTarihi = excelTarihiNormallestir(satir.kapanisTarihi);
        if (konuSecili) { satir.konuId = konuSecili.id; satir.konuAdi = konuSecili.ad; }
      });
      const sonuc = excelToplulIceAktarSonucOzetle(satirlar, uygunsuzlukEkle);
      alert(excelIceAktarOzetMesaji(sonuc));
      _konuSecimDoldur();
      kayitlariCiz(document.getElementById('aramaKutusu').value);
    });
  });

  document.getElementById('eskiJsonIceAktarBtn').addEventListener('click', () => document.getElementById('eskiJsonIceAktarDosya').click());
  document.getElementById('eskiJsonIceAktarDosya').addEventListener('change', e => {
    const dosya = e.target.files[0];
    e.target.value = '';
    if (!dosya) return;
    _eskiJsonIceAktar(dosya);
  });

  _konuSecimDoldur();
  _yasalSartlariDoldur();
  gorunumDegistir('kayitlar');
}

// ---- Eski isg platformundan (uygunsuzluk-platform-standalone.html) JSON
// içe aktarım — "JSON Dışa Aktar" ile alınan, fotoğrafları da (base64 data
// URL olarak) içeren dosya. "Konu" alanı varsa aynı adla risk360'ta konu
// bulunur/oluşturulur ve kayıt ona atanır.
function _eskiUsDurumEsle(durum) {
  const d = String(durum || '').trim();
  if (UYGUNSUZLUK_DURUMLARI.includes(d)) return d;
  const kucuk = d.toLocaleLowerCase('tr-TR');
  if (kucuk.includes('kapa')) return 'Kapalı';
  if (kucuk.includes('iptal')) return 'İptal';
  if (kucuk.includes('devam')) return 'Devam Ediyor';
  return 'Açık';
}

// Base64 data URL'i (File nesnesi değil) küçültüp yeniden sıkıştırır — bulut
// belgesinin Firestore'un ~1MB sınırını aşmaması için. Eski sistemden gelen
// fotoğraflar genelde ham/orijinal çözünürlüktedir; core/data.js'teki
// fotoSikistir() aynı mantığı bir File girdisiyle yapar, burada dataURL girdisi
// gerektiği için ayrı bir küçük sürüm kullanılır.
function _usBase64Kuculte(dataUrl, maxKenar, kalite) {
  return new Promise(resolve => {
    if (!dataUrl) { resolve(''); return; }
    const img = new Image();
    img.onerror = () => resolve(dataUrl);
    img.onload = () => {
      const olcek = Math.min(1, (maxKenar || 700) / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * olcek));
      canvas.height = Math.max(1, Math.round(img.height * olcek));
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', kalite || 0.5));
    };
    img.src = dataUrl;
  });
}

// Küçültülmüş fotoğrafı kendi ayrı Firestore belgesine yazıp "fotoref:<id>"
// referansı döner — kayıt dizisinin kendisi ham fotoğraf verisini hiç taşımaz,
// böylece 175 kayıt + fotoğrafları tek modül belgesinin ~1MB sınırını aşmaz.
async function _eskiUsFotoHazirla(base64) {
  if (!base64) return '';
  const kucuk = await _usBase64Kuculte(base64, 700, 0.5);
  return fotoBuyukKaydet(kucuk, (aktifFirmaGetir() || {}).slug || '');
}

async function _eskiUsKaydiEsle(r) {
  const sorumlu = Array.isArray(r.sorumlu) ? r.sorumlu.join(', ') : (r.sorumlu || '');
  const konu = uygunsuzlukKonuBulYaDaOlustur(r.topicName || r.konuAdi || '');
  const [fotoOncesi, fotoSonrasi] = await Promise.all([
    _eskiUsFotoHazirla(r.fotoOncesiBase64),
    _eskiUsFotoHazirla(r.fotoSonrasiBase64)
  ]);
  return {
    konuId: konu ? konu.id : '',
    konuAdi: konu ? konu.ad : '',
    baslik: r.tanim || r.baslik || r.description || '',
    aciklama: '',
    bolum: r.birim || r.tesisBirim || r.bolum || '',
    lokasyon: '',
    kaynakTuru: 'Manuel Bildirim',
    riskSeviyesi: RISK_SEVIYELERI.includes(r.risk) ? r.risk : (RISK_SEVIYELERI.includes(r.riskSeviyesi) ? r.riskSeviyesi : 'Orta'),
    sorumlu,
    bildirimTarihi: excelTarihiNormallestir(r.tarih || r.bildirimTarihi || ''),
    termin: excelTarihiNormallestir(r.termin || r.deadline || ''),
    kapanisTarihi: excelTarihiNormallestir(r.kapanisTarihi || r.closedAt || r.closeDate || ''),
    kanitAciklamasi: r.kapanisAciklama || r.closeNote || '',
    yasalSartlar: Array.isArray(r.yasalSartlar) ? r.yasalSartlar.filter(v => YASAL_SART_LISTESI.includes(v)) : [],
    yasalDayanak: r.yasalSartAciklama || r.yasalDayanak || '',
    fotoOncesi,
    fotoSonrasi,
    durum: _eskiUsDurumEsle(r.durum || r.status),
    onayGerekliMi: false
  };
}

// Kayıtları küçük gruplar hâlinde SIRAYLA buluta yazar; bir grup sığmazsa
// (Firestore ~1MB belge sınırı) hemen durur — daha fazla denemez, çünkü bir
// yazım başarısız olsa bile yerel bellek önbelleği (_bulutOnbellek) o grubu
// iyimser şekilde zaten eklemiş sayıyor; üstüne denemeye devam etmek yanlış/
// tekrarlı veriye yol açabilir. Kaç kaydın gerçekten kaydedildiği net söylenir.
async function _eskiJsonToplugaBolerekYukle(kayitlar, parcaBoyutu) {
  let basarili = 0;
  for (let i = 0; i < kayitlar.length; i += parcaBoyutu) {
    const parca = kayitlar.slice(i, i + parcaBoyutu);
    const sonuc = await uygunsuzlukTopluEkle(parca);
    if (!sonuc.bulutBasarili) return { basarili, doluDurdu: true };
    basarili += parca.length;
  }
  return { basarili, doluDurdu: false };
}

async function _eskiJsonIceAktar(dosya) {
  const okuyucu = new FileReader();
  okuyucu.onload = async e => {
    let veri;
    try { veri = JSON.parse(e.target.result); }
    catch (hata) { alert('Dosya okunamadı. Geçerli bir JSON dosyası seçtiğinizden emin olun.'); return; }

    const kayitlar = Array.isArray(veri) ? veri : veri.records;
    if (!Array.isArray(kayitlar) || !kayitlar.length) { alert('Dosyada içe aktarılabilir kayıt bulunamadı.'); return; }
    if (!confirm(`${kayitlar.length} kayıt küçük gruplar hâlinde, fotoğraflarıyla birlikte sırayla içe aktarılacak. Bu biraz sürebilir. Devam edilsin mi?`)) return;

    const eslenmisKayitlar = [];
    for (const r of kayitlar) {
      eslenmisKayitlar.push(await _eskiUsKaydiEsle(r));
    }

    const PARCA_BOYUTU = 12;
    const sonuc = await _eskiJsonToplugaBolerekYukle(eslenmisKayitlar, PARCA_BOYUTU);

    if (sonuc.doluDurdu) {
      const kalan = eslenmisKayitlar.length - sonuc.basarili;
      alert(
        `${sonuc.basarili} / ${eslenmisKayitlar.length} kayıt buluta başarıyla kaydedildi.\n` +
        `Bulut belgesi (Firestore'un belge başına ~1MB sınırı) dolduğu için kalan ${kalan} kayıt kaydedilemedi — bu kadar çok fotoğraf tek belgeye sığmıyor.\n\n` +
        'Devam etmek için: sayfayı yenileyin (F5) — sadece başarıyla kaydedilen ' + sonuc.basarili + ' kayıt kalıcı olarak görünecek. ' +
        'Kalan kayıtları eklemek için JSON dosyasından ilk ' + sonuc.basarili + ' kaydı çıkarıp geri kalanını (tercihen fotoğrafsız ya da daha küçük gruplar hâlinde) ayrı bir dosya olarak tekrar içe aktarmanız gerekir.'
      );
    } else {
      alert(`${sonuc.basarili} kayıt buluta başarıyla kaydedildi.`);
    }

    _konuSecimDoldur();
    kayitlariCiz(document.getElementById('aramaKutusu').value);
  };
  okuyucu.onerror = () => alert('Dosya okunamadı.');
  okuyucu.readAsText(dosya);
}

// esanlamlar, eski isg platformundaki Uygunsuzluk Takip Sistemi'nin ("Excel'e
// Aktar" -> uygunsuzluk-platform-standalone.html) başlıklarını da kapsar:
// Konu, No, Tesis / Birim, Bildirim Tarihi, Uygunsuzluk Tanımı, Risk Seviyesi,
// Termin, Sorumlu, Durum, Kapanış Açıklaması. "Konu" (defter/başlık grubu)
// risk360'ta karşılığı olmadığı için sessizce yok sayılır — fotoğraflar bu
// Excel çıktısına zaten dahil değil, onlar için "Eski Sistemden İçe Aktar
// (JSON, Fotoğraflı)" kullanılmalı (bkz. yukarıda _eskiJsonIceAktar).
const UYGUNSUZLUK_IMPORT_KOLONLARI = [
  { anahtar: 'baslik', baslik: 'Uygunsuzluk Tanımı', esanlamlar: ['Başlık'] },
  { anahtar: 'aciklama', baslik: 'Ek Açıklama' },
  { anahtar: 'bolum', baslik: 'Bölüm', esanlamlar: ['Tesis / Birim'] },
  { anahtar: 'lokasyon', baslik: 'Lokasyon / Ekipman' },
  { anahtar: 'kaynakTuru', baslik: 'Kaynak' },
  { anahtar: 'riskSeviyesi', baslik: 'Risk Seviyesi' },
  { anahtar: 'sorumlu', baslik: 'Sorumlu' },
  { anahtar: 'termin', baslik: 'Termin' },
  { anahtar: 'bildirimTarihi', baslik: 'Bildirim Tarihi' },
  { anahtar: 'durum', baslik: 'Durum' },
  { anahtar: 'kapanisTarihi', baslik: 'Kapanış Tarihi' },
  { anahtar: 'kanitAciklamasi', baslik: 'Kapanış Açıklaması' }
];

// Ekrandaki Kayıtlar tablosuyla aynı sütun sırası (bkz. index.html thead);
// Öncesi/Sonrası fotoğrafları ve İşlemler düğmeleri Excel'e taşınmaz.
const UYGUNSUZLUK_EXPORT_KOLONLARI = [
  { anahtar: 'aksiyonNo', baslik: 'No' },
  { anahtar: 'bolum', baslik: 'Tesis / Birim' },
  { anahtar: 'bildirimTarihiGoruntu', baslik: 'Bildirim Tarihi' },
  { anahtar: 'uygunsuzlukTanimi', baslik: 'Uygunsuzluk Tanımı' },
  { anahtar: 'riskSeviyesi', baslik: 'Risk Seviyesi' },
  { anahtar: 'terminGoruntu', baslik: 'Termin' },
  { anahtar: 'sorumlu', baslik: 'Sorumlu' },
  { anahtar: 'durumGoruntu', baslik: 'Durum' },
  { anahtar: 'kapanisTarihiGoruntu', baslik: 'Kapanış Tarihi' },
  { anahtar: 'kanitAciklamasi', baslik: 'Kapanış Açıklaması' }
];

// excelDisaAktar satırları doğrudan kayıt nesnesinden okuduğu için, ekran
// biçimiyle (GG.AA.YYYY, birleşik tanım metni) uyumlu sanal alanlar üretir.
function _uygunsuzlukExcelSatirlariniHazirla(kayitlar) {
  return kayitlar.map(k => ({
    ...k,
    bildirimTarihiGoruntu: gunAyYil(k.bildirimTarihi),
    terminGoruntu: gunAyYil(k.termin),
    kapanisTarihiGoruntu: gunAyYil(k.kapanisTarihi),
    uygunsuzlukTanimi: k.baslik + (k.aciklama ? ' — ' + k.aciklama : '')
  }));
}

async function uygunsuzlukFormunuYazdir(id) {
  const k = uygunsuzlukIdIleGetirRepo(id);
  if (!k) return;
  const [fotoOncesi, fotoSonrasi] = await Promise.all([fotoBuyukCoz(k.fotoOncesi), fotoBuyukCoz(k.fotoSonrasi)]);
  raporKartiYazdir('UYGUNSUZLUK FORMU — ' + k.aksiyonNo, '', [
    { etiket: 'Başlık', deger: k.baslik },
    { etiket: 'Açıklama (Tespit)', deger: k.aciklama },
    { etiket: 'Bölüm', deger: k.bolum },
    { etiket: 'Lokasyon / Ekipman', deger: k.lokasyon },
    { etiket: 'Kaynak', deger: k.kaynakTuru },
    { etiket: 'Risk Seviyesi', deger: k.riskSeviyesi },
    { etiket: 'Kök Neden', deger: k.kokNeden },
    { etiket: 'Düzeltici Faaliyet', deger: k.duzelticiFaaliyet },
    { etiket: 'Önleyici Faaliyet', deger: k.onleyiciFaaliyet },
    { etiket: 'Sorumlu / Atayan', deger: [k.sorumlu, k.atayan].filter(Boolean).join(' / ') },
    { etiket: 'Bildirim Tarihi / Termin', deger: [k.bildirimTarihi, k.termin].filter(Boolean).join(' / ') },
    { etiket: 'Maliyet / Satın Alma', deger: [k.maliyet, k.satinAlmaDurumu].filter(Boolean).join(' / ') },
    { etiket: 'İlgili Yasal Şartlar', deger: (k.yasalSartlar && k.yasalSartlar.length) ? k.yasalSartlar.join(', ') : '-' },
    { etiket: 'Yasal Dayanak / Not', deger: k.yasalDayanak },
    { etiket: 'Durum / Onay', deger: [k.durum, k.onayDurumu].filter(Boolean).join(' / ') },
    { etiket: 'Kapanış Tarihi / Kanıt', deger: [k.kapanisTarihi, k.kanitAciklamasi].filter(Boolean).join(' / ') }
  ], [
    { etiket: 'Öncesi', url: fotoOncesi },
    { etiket: 'Sonrası', url: fotoSonrasi }
  ]);
}

// Toplu PDF raporunun kapak sayfasındaki serbest Konu/metin — modül içinde
// (formAyarlariGetir'den ayrı) tenant-scoped bir ayar olarak saklanır.
function _raporMetniAnahtari() { return tenantAnahtar('uygunsuzluk_rapor_metni'); }

function raporMetniGetir() {
  return oku(_raporMetniAnahtari(), { konu: 'Uygunsuzluk Raporu', girisMetni: '' });
}

function raporMetniModalAc() {
  const mevcut = raporMetniGetir();
  document.getElementById('raporKonuGirdi').value = mevcut.konu;
  document.getElementById('raporGirisMetniGirdi').value = mevcut.girisMetni;
  document.getElementById('raporMetniKatmani').classList.add('acik');
}

function raporMetniModalKapat() {
  document.getElementById('raporMetniKatmani').classList.remove('acik');
}

function raporMetniKaydet() {
  yaz(_raporMetniAnahtari(), {
    konu: document.getElementById('raporKonuGirdi').value.trim() || 'Uygunsuzluk Raporu',
    girisMetni: document.getElementById('raporGirisMetniGirdi').value.trim()
  });
  raporMetniModalKapat();
}

function gorunumDegistir(gorunum) {
  _usGorunum = gorunum;
  document.getElementById('sekmeKayitlar').classList.toggle('sekme-seciliDegil', gorunum !== 'kayitlar');
  document.getElementById('sekmeOzet').classList.toggle('sekme-seciliDegil', gorunum !== 'ozet');
  document.getElementById('bolum-kayitlar').style.display = gorunum === 'kayitlar' ? '' : 'none';
  document.getElementById('bolum-ozet').style.display = gorunum === 'ozet' ? '' : 'none';

  if (gorunum === 'kayitlar') kayitlariCiz(document.getElementById('aramaKutusu').value);
  else ozetiCiz();
}

function _islemButonlariUret(k) {
  const butonlar = [
    `<button class="tablo-buton" data-duzenle="${k.id}">Düzenle</button>`,
    `<button class="tablo-buton" data-form="${k.id}">Yazdır</button>`,
    `<button class="tablo-buton" data-pdf="${k.id}">PDF</button>`
  ];

  if (k.durum === 'Onay Bekliyor') {
    butonlar.push(`<button class="tablo-buton" data-onayla="${k.id}">Onayla</button>`);
    butonlar.push(`<button class="tablo-buton sil" data-reddet="${k.id}">Reddet</button>`);
  } else if (k.durum !== 'Kapalı' && k.durum !== 'İptal') {
    butonlar.push(`<button class="tablo-buton" data-kapat="${k.id}">Kapat</button>`);
  }

  butonlar.push(`<button class="tablo-buton sil" data-sil="${k.id}">Sil</button>`);
  return butonlar.join(' ');
}

function _usFotoHucresiUret(deger, etiket) {
  return deger
    ? `<a data-foto-ref-href="${deger}" target="_blank" rel="noopener" title="${etiket} — büyütmek için tıklayın"><img data-foto-ref="${deger}" style="width:56px; height:56px; object-fit:cover; border-radius:6px; border:1px solid var(--kenarlik);"></a>`
    : '-';
}

// Uzun metinleri satırda 4 satırla sınırlar (kartlar dev boy uzamasın diye);
// tam metin title (tooltip) olarak ve Düzenle formunda görülebilir.
function _usTanimHucresiUret(k) {
  const tamMetin = k.baslik + (k.aciklama ? ' — ' + k.aciklama : '');
  return `<div class="us-tanim-hucre" title="${_usKacir(tamMetin)}">${_usKacir(tamMetin)}</div>`;
}

function kayitlariCiz(aramaMetni) {
  const govde = document.getElementById('tabloGovde');
  const bosDurum = document.getElementById('bosDurum');
  const filtreler = {
    durum: document.getElementById('durumFiltre').value,
    riskSeviyesi: document.getElementById('riskFiltre').value,
    konuId: _secilenKonuId
  };
  const kayitlar = uygunsuzluklariGetir(aramaMetni, filtreler);

  govde.innerHTML = '';
  if (kayitlar.length === 0) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = 'Eşleşen kayıt bulunamadı.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  kayitlar.forEach(k => {
    const satir = document.createElement('tr');
    satir.innerHTML = `
      <td>${_usKacir(k.aksiyonNo)}</td>
      <td>${_usKacir(k.bolum)}</td>
      <td>${gunAyYil(k.bildirimTarihi) || '-'}</td>
      <td>${_usTanimHucresiUret(k)}</td>
      <td><span class="genel-rozet rozet-${usRozetSinifAdi(k.riskSeviyesi)}">${_usKacir(k.riskSeviyesi)}</span></td>
      <td>${gunAyYil(k.termin) || '-'}</td>
      <td>${_usKacir(k.sorumlu)}</td>
      <td>${_usFotoHucresiUret(k.fotoOncesi, 'Öncesi')}</td>
      <td>${_usFotoHucresiUret(k.fotoSonrasi, 'Sonrası')}</td>
      <td><span class="genel-rozet rozet-${usRozetSinifAdi(k.durumGoruntu)}">${_usKacir(k.durumGoruntu)}</span></td>
      <td>${gunAyYil(k.kapanisTarihi) || '-'}</td>
      <td><div class="us-kapanis-hucre" title="${_usKacir(k.kanitAciklamasi || '')}">${_usKacir(k.kanitAciklamasi) || '-'}</div></td>
      <td>${_islemButonlariUret(k)}</td>
    `;
    govde.appendChild(satir);
  });

  fotoReferanslariCoz(govde);

  govde.querySelectorAll('[data-duzenle]').forEach(btn => btn.addEventListener('click', () => kayitModalAc(uygunsuzlukIdIleGetirRepo(btn.getAttribute('data-duzenle')))));
  govde.querySelectorAll('[data-form]').forEach(btn => btn.addEventListener('click', () => uygunsuzlukFormunuYazdir(btn.getAttribute('data-form'))));
  govde.querySelectorAll('[data-pdf]').forEach(btn => btn.addEventListener('click', async () => {
    try { await uygunsuzlukKayitPdfOlustur(btn.getAttribute('data-pdf')); } catch (hata) { console.error(hata); alert('PDF üretilemedi: ' + (hata.message || hata)); }
  }));
  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', () => {
    if (confirm('Bu kaydı silmek istediğinize emin misiniz?')) { uygunsuzlukSil(btn.getAttribute('data-sil')); kayitlariCiz(document.getElementById('aramaKutusu').value); }
  }));
  govde.querySelectorAll('[data-kapat]').forEach(btn => btn.addEventListener('click', () => {
    const kanit = prompt('Kapanış için kanıt / açıklama girin (opsiyonel):', '');
    if (kanit !== null) { uygunsuzlukKapat(btn.getAttribute('data-kapat'), kanit); kayitlariCiz(document.getElementById('aramaKutusu').value); }
  }));
  govde.querySelectorAll('[data-onayla]').forEach(btn => btn.addEventListener('click', () => {
    const onaylayan = prompt('Onaylayan adı:', '');
    if (onaylayan !== null) { uygunsuzlukOnayla(btn.getAttribute('data-onayla'), onaylayan); kayitlariCiz(document.getElementById('aramaKutusu').value); }
  }));
  govde.querySelectorAll('[data-reddet]').forEach(btn => btn.addEventListener('click', () => {
    const sebep = prompt('Red sebebi:', '');
    if (sebep !== null) { uygunsuzlukReddet(btn.getAttribute('data-reddet'), '', sebep); kayitlariCiz(document.getElementById('aramaKutusu').value); }
  }));
}

function ozetiCiz() {
  const ozet = uygunsuzlukOzetiHesapla({ konuId: _secilenKonuId });
  const kutu = document.getElementById('ozetKutusu');
  const kart = (etiket, deger) => `<div class="istatistik-kutu"><span>${etiket}</span><b>${deger}</b></div>`;
  const dagilimHtml = (baslik, satirlar) => `
    <div class="kart" style="margin-bottom:14px;">
      <div class="card-title" style="margin-bottom:8px;"><h3 style="margin:0; font-size:14px;">${baslik}</h3></div>
      ${satirlar.length
        ? satirlar.map(([k, v]) => `<div style="display:flex; justify-content:space-between; font-size:13px; padding:6px 0; border-bottom:1px solid var(--kenarlik);"><span>${k}</span><strong>${v}</strong></div>`).join('')
        : '<div class="bos-durum gorunur">Veri yok.</div>'}
    </div>
  `;

  kutu.innerHTML = `
    <div class="istatistik-grid">
      ${kart('Toplam Kayıt', ozet.toplam)}
      ${kart('Açık', ozet.acik)}
      ${kart('Kapalı', ozet.kapali)}
      ${kart('Gecikmiş', ozet.gecikmis)}
      ${kart('Onay Bekleyen', ozet.onayBekleyen)}
      ${kart('Yüksek/Çok Yüksek Risk', ozet.yuksekVeUstuRisk)}
    </div>

    <div class="modul-grid" style="grid-template-columns: repeat(auto-fill, minmax(260px,1fr));">
      <div>${dagilimHtml('Bölüme Göre', ozet.bolumeGore)}</div>
      <div>${dagilimHtml('Duruma Göre', ozet.durumaGore)}</div>
      <div>${dagilimHtml('Risk Seviyesine Göre', ozet.riskSeviyesineGore)}</div>
      <div>${dagilimHtml('Sorumluya Göre', ozet.sorumluyaGore)}</div>
    </div>

    <div class="card-title" style="margin:20px 0 8px;"><h3 style="margin:0; font-size:14px;">Önümüzdeki 7 Gün İçinde Termini Dolacaklar</h3></div>
    <div class="tablo-scroll">
      <table class="veri-tablosu">
        <thead><tr><th>Aksiyon No</th><th>Başlık</th><th>Sorumlu</th><th>Termin</th></tr></thead>
        <tbody>
          ${ozet.yakindaTerminDolacaklar.map(k => `<tr><td>${k.aksiyonNo}</td><td>${k.baslik}</td><td>${k.sorumlu}</td><td>${k.termin}</td></tr>`).join('') || '<tr><td colspan="4">Yaklaşan termin yok.</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="card-title" style="margin:20px 0 8px;"><h3 style="margin:0; font-size:14px;">En Öncelikli Açık Kayıtlar</h3></div>
    <div class="tablo-scroll">
      <table class="veri-tablosu">
        <thead><tr><th>Aksiyon No</th><th>Başlık</th><th>Risk Seviyesi</th><th>Termin</th><th>Durum</th></tr></thead>
        <tbody>
          ${ozet.enOncelikliAcikKayitlar.map(k => `<tr><td>${k.aksiyonNo}</td><td>${k.baslik}</td><td>${k.riskSeviyesi}</td><td>${k.termin || '-'}</td><td>${k.durumGoruntu}</td></tr>`).join('') || '<tr><td colspan="5">Açık kayıt yok.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

let _modalKonuId = '';
let _modalKonuAdi = '';

function kayitModalAc(kayit) {
  _duzenlenenKayitId = kayit ? kayit.id : null;
  document.getElementById('modalBaslik').textContent = kayit ? (kayit.aksiyonNo + ' Kaydını Düzenle') : 'Yeni Uygunsuzluk Kaydı';

  // Düzenlemede kaydın kendi konusu korunur; yeni kayıtta o an seçili konuya atanır.
  if (kayit) {
    _modalKonuId = kayit.konuId || '';
    _modalKonuAdi = kayit.konuAdi || '';
  } else {
    const secili = uygunsuzlukKonulariniGetir().find(k => k.id === _secilenKonuId);
    _modalKonuId = secili ? secili.id : '';
    _modalKonuAdi = secili ? secili.ad : '';
  }

  document.getElementById('baslik').value = kayit ? kayit.baslik : '';
  document.getElementById('aciklama').value = kayit ? kayit.aciklama : '';
  document.getElementById('bolum').value = kayit ? kayit.bolum : '';
  document.getElementById('lokasyon').value = kayit ? kayit.lokasyon : '';
  document.getElementById('kaynakTuru').innerHTML = KAYNAK_TURLERI.map(t => `<option ${kayit && kayit.kaynakTuru === t ? 'selected' : ''}>${t}</option>`).join('');
  document.getElementById('riskSeviyesi').innerHTML = RISK_SEVIYELERI.map(r => `<option ${kayit && kayit.riskSeviyesi === r ? 'selected' : ''}>${r}</option>`).join('');

  document.getElementById('kokNeden').value = kayit ? kayit.kokNeden : '';
  document.getElementById('duzelticiFaaliyet').value = kayit ? kayit.duzelticiFaaliyet : '';
  document.getElementById('onleyiciFaaliyet').value = kayit ? kayit.onleyiciFaaliyet : '';

  document.getElementById('sorumlu').value = kayit ? kayit.sorumlu : '';
  bolumButonlariCiz('sorumluBolumButonlari', 'sorumlu', 'tekli');
  document.getElementById('atayan').value = kayit ? kayit.atayan : '';
  document.getElementById('bildirimTarihi').value = kayit ? kayit.bildirimTarihi : bugunIso();
  document.getElementById('termin').value = kayit ? kayit.termin : '';
  document.getElementById('onayGerekliMi').checked = kayit ? kayit.onayGerekliMi !== false : true;

  document.getElementById('maliyet').value = kayit ? kayit.maliyet : '';
  document.getElementById('satinAlmaDurumu').value = kayit ? kayit.satinAlmaDurumu : '';
  _yasalSartlariSec(kayit ? kayit.yasalSartlar : []);
  document.getElementById('yasalDayanak').value = kayit ? kayit.yasalDayanak : '';

  document.getElementById('durum').innerHTML = UYGUNSUZLUK_DURUMLARI.map(d => `<option ${kayit && kayit.durum === d ? 'selected' : ''}>${d}</option>`).join('');
  document.getElementById('kapanisTarihi').value = kayit ? (kayit.kapanisTarihi || '') : '';
  document.getElementById('kanitAciklamasi').value = kayit ? (kayit.kanitAciklamasi || '') : '';

  _usFotoOncesi = kayit ? (kayit.fotoOncesi || '') : '';
  _usFotoSonrasi = kayit ? (kayit.fotoSonrasi || '') : '';
  _usFotoOnizlemeCiz('fotoOncesiOnizleme', _usFotoOncesi, () => { _usFotoOncesi = ''; _usFotoOnizlemeCiz('fotoOncesiOnizleme', '', null); });
  _usFotoOnizlemeCiz('fotoSonrasiOnizleme', _usFotoSonrasi, () => { _usFotoSonrasi = ''; _usFotoOnizlemeCiz('fotoSonrasiOnizleme', '', null); });

  _konumAlaniCiz(kayit);

  temizleFormHatalari();
  document.getElementById('modalKatman').classList.add('acik');
}

// Saha Dijital Haritası köprüsü — bkz. modules/harita/ui.js'teki
// "konumKaynak" karşılığı. Kayıt henüz kaydedilmemişse (id yok) konum
// atanamaz, önce "Kaydet" ile gerçek bir kayıt oluşturulmalı.
function _konumAlaniCiz(kayit) {
  const kutu = document.getElementById('konumAlani');
  if (_bekleyenHaritaKonum && !kayit) {
    kutu.innerHTML = '<div style="font-size:12px; color:var(--metin-soluk);">📍 Haritadan seçilen konum bu kayda kaydedilince eklenecek.</div>';
    return;
  }
  if (!kayit) {
    kutu.innerHTML = '<div style="font-size:12px; color:var(--metin-soluk);">Konum eklemek için önce kaydı oluşturup tekrar açın.</div>';
    return;
  }
  const donusUrl = encodeURIComponent(location.pathname + '?ac=' + kayit.id);
  if (kayit.haritaTesisId) {
    kutu.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px; font-size:13px;">
        <span>📍 Haritada işaretli</span>
        <button type="button" class="tablo-buton" id="konumGorBtn">Haritada Gör</button>
      </div>`;
    document.getElementById('konumGorBtn').addEventListener('click', () => {
      window.location.href = `../harita/index.html?odaklanKaynak=uygunsuzluk&odaklanId=${kayit.id}`;
    });
  } else {
    kutu.innerHTML = `<button type="button" class="tablo-buton" id="konumEkleBtn">📍 Haritada Konum Ekle</button>`;
    document.getElementById('konumEkleBtn').addEventListener('click', () => {
      window.location.href = `../harita/index.html?konumKaynak=uygunsuzluk&konumId=${kayit.id}&donus=${donusUrl}`;
    });
  }
}

function kayitModalKapat() {
  document.getElementById('modalKatman').classList.remove('acik');
  _duzenlenenKayitId = null;
}

function temizleFormHatalari() {
  document.querySelectorAll('#kayitForm .alan-hatasi').forEach(el => el.textContent = '');
}

function formGonderildi(e) {
  e.preventDefault();
  temizleFormHatalari();

  const veriler = {
    konuId: _modalKonuId,
    konuAdi: _modalKonuAdi,
    baslik: document.getElementById('baslik').value,
    aciklama: document.getElementById('aciklama').value,
    bolum: document.getElementById('bolum').value,
    lokasyon: document.getElementById('lokasyon').value,
    kaynakTuru: document.getElementById('kaynakTuru').value,
    riskSeviyesi: document.getElementById('riskSeviyesi').value,
    kokNeden: document.getElementById('kokNeden').value,
    duzelticiFaaliyet: document.getElementById('duzelticiFaaliyet').value,
    onleyiciFaaliyet: document.getElementById('onleyiciFaaliyet').value,
    sorumlu: document.getElementById('sorumlu').value,
    atayan: document.getElementById('atayan').value,
    bildirimTarihi: document.getElementById('bildirimTarihi').value,
    termin: document.getElementById('termin').value,
    onayGerekliMi: document.getElementById('onayGerekliMi').checked,
    maliyet: document.getElementById('maliyet').value,
    satinAlmaDurumu: document.getElementById('satinAlmaDurumu').value,
    yasalSartlar: _seciliYasalSartlariGetir(),
    yasalDayanak: document.getElementById('yasalDayanak').value,
    fotoOncesi: _usFotoOncesi,
    fotoSonrasi: _usFotoSonrasi,
    durum: document.getElementById('durum').value,
    kapanisTarihi: document.getElementById('kapanisTarihi').value,
    kanitAciklamasi: document.getElementById('kanitAciklamasi').value
  };

  if (!_duzenlenenKayitId && _bekleyenHaritaKonum) {
    veriler.haritaTesisId = _bekleyenHaritaKonum.tesisId;
    veriler.haritaX = _bekleyenHaritaKonum.x;
    veriler.haritaY = _bekleyenHaritaKonum.y;
  }

  const sonuc = _duzenlenenKayitId ? uygunsuzlukGuncelle(_duzenlenenKayitId, veriler) : uygunsuzlukEkle(veriler);
  if (!sonuc.basarili) {
    Object.keys(sonuc.hatalar).forEach(alan => {
      const hataEl = document.getElementById(alan + 'Hata');
      if (hataEl) hataEl.textContent = sonuc.hatalar[alan];
    });
    return;
  }

  _bekleyenHaritaKonum = null;
  kayitModalKapat();
  kayitlariCiz(document.getElementById('aramaKutusu').value);
}
