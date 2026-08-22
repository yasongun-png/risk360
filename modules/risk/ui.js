// Risk Değerlendirmesi ekranının DOM işlemleri.

let _duzenlenenRiskId = null;
// Saha Dijital Haritası'ndan "Nokta Ekle → Risk" ile buraya yönlendirildiğinde
// (bkz. modules/harita/ui.js) taşınan konum — form kaydedilirken yeni kayda
// eklenir. Düzenlemede kullanılmaz (mevcut konum zaten korunur).
let _bekleyenHaritaKonum = null;
let _riskGorunum = 'kayitlar';
let _riskFotoOncesi = '';
let _riskFotoSonrasi = '';

// Sıra ve eşanlamlar, eski isg platformunun Risk Defteri modülüyle
// (modules/risk_registry/model.js -> EXPORT_COLUMNS) aynı — o uygulamadan
// alınan bir Excel dosyası hiç değiştirilmeden buraya içe aktarılabilir.
// RP1/Düzey/RP2/Düzey2/Azalma hesaplanan alanlardır, içe aktarılmaz (fazladan
// bir sütun olarak gelse bile sessizce yok sayılır).
const RISK_IMPORT_KOLONLARI = [
  { anahtar: 'bolum', baslik: 'Bölüm' },
  { anahtar: 'yer', baslik: 'Yer / Ekipman', esanlamlar: ['Ekipman'] },
  { anahtar: 'faaliyet', baslik: 'Faaliyet' },
  { anahtar: 'tehlike', baslik: 'Tehlike' },
  { anahtar: 'risk', baslik: 'Risk' },
  { anahtar: 'onlem', baslik: 'Mevcut Önlemler' },
  { anahtar: 'O', baslik: 'Olasılık (O)', esanlamlar: ['O'] },
  { anahtar: 'F', baslik: 'Frekans (F)', esanlamlar: ['F'] },
  { anahtar: 'S', baslik: 'Şiddet (Ş)', esanlamlar: ['Ş', 'S'] },
  { anahtar: 'fotoOncesi', baslik: 'Öncesi Fotoğrafı', esanlamlar: ['Foto Önce', 'Önce', 'Öncesi'] },
  { anahtar: 'planlanan', baslik: 'Planlanan / Yapılan Faaliyet' },
  { anahtar: 'On', baslik: 'Olasılık (O₂)', esanlamlar: ['O(2)', 'O2'] },
  { anahtar: 'Fn', baslik: 'Frekans (F₂)', esanlamlar: ['F(2)', 'F2'] },
  { anahtar: 'Sn', baslik: 'Şiddet (Ş₂)', esanlamlar: ['Ş(2)', 'S(2)', 'Ş2', 'S2'] },
  { anahtar: 'fotoSonrasi', baslik: 'Sonrası Fotoğrafı', esanlamlar: ['Foto Sonra', 'Sonra', 'Sonrası'] },
  { anahtar: 'sorumlu', baslik: 'Sorumlu' },
  { anahtar: 'termin', baslik: 'Termin' },
  { anahtar: 'durum', baslik: 'Durum' },
  { anahtar: 'tespit', baslik: 'Tespit Eden' }
];

const RISK_EXPORT_KOLONLARI = [
  { anahtar: 'riskNo', baslik: 'Risk No' },
  { anahtar: 'bolum', baslik: 'Bölüm' },
  { anahtar: 'yer', baslik: 'Yer / Ekipman' },
  { anahtar: 'tehlike', baslik: 'Tehlike' },
  { anahtar: 'RP1', baslik: 'RP1' },
  { anahtar: 'duzey1', baslik: 'Düzey' },
  { anahtar: 'RP2', baslik: 'RP2' },
  { anahtar: 'azalma', baslik: 'Azalma' },
  { anahtar: 'sorumlu', baslik: 'Sorumlu' },
  { anahtar: 'termin', baslik: 'Termin' },
  { anahtar: 'durumGoruntu', baslik: 'Durum' }
];

function _riskFotoOnizlemeCiz(kutuId, url, temizleFn) {
  const kutu = document.getElementById(kutuId);
  kutu.innerHTML = url
    ? `<div style="display:flex; align-items:center; gap:10px;">
         <img data-foto-ref="${url}" style="width:72px; height:72px; object-fit:cover; border-radius:8px; border:1px solid var(--kenarlik);">
         <div>
           <div style="font-size:12px; color:#16a34a; font-weight:600;">✓ Fotoğraf eklendi</div>
           <button type="button" class="tablo-buton sil" style="margin-top:4px;">Fotoğrafı Kaldır</button>
         </div>
       </div>`
    : '<div style="font-size:12px; color:var(--metin-soluk);">Henüz fotoğraf eklenmedi.</div>';
  if (url) {
    kutu.querySelector('button').addEventListener('click', temizleFn);
    fotoReferanslariCoz(kutu);
  }
}

function _riskFotoAlaniniHazirla(inputId, onizlemeKutuId, mevcutDegerGetir, mevcutDegerAta) {
  document.getElementById(inputId).addEventListener('change', async e => {
    const dosya = e.target.files[0];
    e.target.value = '';
    if (!dosya) return;
    try {
      const sonuc = await fotoYukle(dosya, 'risk/' + (_duzenlenenRiskId || 'gecici'));
      mevcutDegerAta(sonuc.url);
      _riskFotoOnizlemeCiz(onizlemeKutuId, mevcutDegerGetir(), () => { mevcutDegerAta(''); _riskFotoOnizlemeCiz(onizlemeKutuId, '', null); });
    } catch (hata) {
      alert(hata.message || 'Fotoğraf yüklenemedi.');
    }
  });
}

function _riskFotoHucresiUret(url, etiket) {
  return url
    ? `<img data-foto-ref="${url}" title="${etiket}" style="width:32px; height:32px; object-fit:cover; border-radius:6px;">`
    : '-';
}

function riskSayfasiniBaslat() {
  document.getElementById('yeniRiskBtn').addEventListener('click', () => modalAc());
  document.getElementById('modalKapatBtn').addEventListener('click', modalKapat);
  document.getElementById('modalIptalBtn').addEventListener('click', modalKapat);
  document.getElementById('riskForm').addEventListener('submit', formGonderildi);
  document.getElementById('aramaKutusu').addEventListener('input', e => kayitlariCiz(e.target.value));
  document.getElementById('bolumFiltre').addEventListener('change', () => kayitlariCiz(document.getElementById('aramaKutusu').value));
  document.getElementById('bolumYeniBtn').addEventListener('click', async () => {
    const ad = await metinIstemModali('Yeni bölüm adı:', '', '');
    if (ad === null) return;
    const sonuc = bolumEkle(ad);
    if (!sonuc.basarili) { alert(sonuc.hata); return; }
    _bolumFiltreDoldur();
    document.getElementById('bolumFiltre').value = sonuc.bolum.ad;
    kayitlariCiz(document.getElementById('aramaKutusu').value);
  });
  document.getElementById('bolumSilBtn').addEventListener('click', () => {
    const secim = document.getElementById('bolumFiltre');
    if (!secim.value) { alert('Önce silinecek bölümü seçin.'); return; }
    if (riskleriGetir('', { bolum: secim.value }).length) {
      alert('Bu bölümde risk kaydı var. Kalıcı bölüm listesinden ancak hiç risk kaydı olmayan bölümler kaldırılabilir; bölüm ismi tüm risklerinden silinmedikçe listede görünmeye devam eder.');
      return;
    }
    const sonuc = bolumSil(secim.value);
    if (!sonuc.basarili) { alert(sonuc.hata); return; }
    _bolumFiltreDoldur();
    kayitlariCiz(document.getElementById('aramaKutusu').value);
  });
  document.getElementById('sekmeKayitlar').addEventListener('click', () => gorunumDegistir('kayitlar'));
  document.getElementById('sekmeOzet').addEventListener('click', () => gorunumDegistir('ozet'));

  document.getElementById('yontem').addEventListener('change', yontemAlanlariniGuncelle);
  ['O', 'F', 'S'].forEach(id => document.getElementById(id).addEventListener('change', oncekiHesabiCiz));
  ['On', 'Fn', 'Sn'].forEach(id => document.getElementById(id).addEventListener('change', sonrakiHesabiCiz));
  _riskFotoAlaniniHazirla('fotoOncesiDosya', 'fotoOncesiOnizleme', () => _riskFotoOncesi, v => { _riskFotoOncesi = v; });
  _riskFotoAlaniniHazirla('fotoSonrasiDosya', 'fotoSonrasiOnizleme', () => _riskFotoSonrasi, v => { _riskFotoSonrasi = v; });

  document.getElementById('sablonIndirBtn').addEventListener('click', () => {
    excelSablonIndir(RISK_IMPORT_KOLONLARI, 'risk_sablonu.xlsx');
  });
  document.getElementById('disaAktarBtn').addEventListener('click', () => {
    const bolum = document.getElementById('bolumFiltre').value;
    const dosyaAdi = bolum ? `risk_kayitlari_${bolum}.xlsx` : 'risk_kayitlari.xlsx';
    excelDisaAktar(riskleriGetir(document.getElementById('aramaKutusu').value, { bolum }), RISK_EXPORT_KOLONLARI, dosyaAdi);
  });
  document.getElementById('iceAktarBtn').addEventListener('click', () => {
    document.getElementById('iceAktarDosya').click();
  });
  document.getElementById('iceAktarDosya').addEventListener('change', e => {
    const dosya = e.target.files[0];
    // Kullanıcı isteği: "eski uygulamadaki risklerin hepsini bıraya da
    // aktarmak istiyorum" -- büyük toplu içe aktarımlarda satır satır
    // yazım yerine TEK bir toplu (ve doğrulanan) yazım kullanılır, bkz.
    // riskExcelTopluEkle.
    excelIceAktar(dosya, RISK_IMPORT_KOLONLARI, async (satirlar, hataMesaji) => {
      e.target.value = '';
      if (hataMesaji) { alert(hataMesaji); return; }
      satirlar.forEach(satir => { satir.termin = excelTarihiNormallestir(satir.termin); });
      const sonuc = await riskExcelTopluEkle(satirlar);
      alert(excelIceAktarOzetMesaji(sonuc));
      _bolumFiltreDoldur();
      kayitlariCiz(document.getElementById('aramaKutusu').value);
    });
  });

  document.getElementById('jsonDisaAktarBtn').addEventListener('click', async () => {
    const dugme = document.getElementById('jsonDisaAktarBtn');
    const eskiMetin = dugme.textContent;
    dugme.disabled = true;
    dugme.textContent = 'Hazırlanıyor...';
    try {
      const bolum = document.getElementById('bolumFiltre').value;
      const veri = await riskKayitlariniJsonaAktar(document.getElementById('aramaKutusu').value, { bolum });
      const dosyaAdi = bolum ? `risk_kayitlari_${bolum}.json` : 'risk_kayitlari.json';
      _jsonDosyaOlarakIndir(veri, dosyaAdi);
    } catch (hata) {
      console.error(hata);
      alert('JSON dışa aktarılamadı: ' + (hata.message || hata));
    } finally {
      dugme.disabled = false;
      dugme.textContent = eskiMetin;
    }
  });
  document.getElementById('jsonIceAktarBtn').addEventListener('click', () => document.getElementById('jsonIceAktarDosya').click());
  document.getElementById('jsonIceAktarDosya').addEventListener('change', async e => {
    const dosya = e.target.files[0];
    e.target.value = '';
    if (!dosya) return;
    let veri;
    try {
      veri = JSON.parse(await dosya.text());
    } catch (hata) {
      alert('JSON dosyası okunamadı: ' + (hata.message || hata));
      return;
    }
    const kayitlar = Array.isArray(veri) ? veri : veri.kayitlar;
    if (!Array.isArray(kayitlar)) {
      alert('Tanınmayan dosya biçimi: "kayitlar" listesi bulunamadı.');
      return;
    }
    if (!(await onayModali(`${kayitlar.length} risk kaydı içe aktarılacak. Devam edilsin mi?`, 'İçe Aktar'))) return;

    const dugme = document.getElementById('jsonIceAktarBtn');
    const eskiMetin = dugme.textContent;
    dugme.disabled = true;
    dugme.textContent = 'İçe aktarılıyor...';
    try {
      const sonuc = await riskKayitlariniJsondanIceAktar(kayitlar);
      let mesaj = `${sonuc.basarili} risk kaydı içe aktarıldı.`;
      if (sonuc.yinelenenSayisi > 0) mesaj += `\n${sonuc.yinelenenSayisi} kayıt zaten mevcut olduğu için atlandı.`;
      if (sonuc.basarisizSayisi > 0) mesaj += `\n${sonuc.basarisizSayisi} kayıt eklenemedi:\n` + sonuc.hatalar.slice(0, 10).join('\n');
      if (!sonuc.bulutBasarili) mesaj += '\nUYARI: Buluta yazılamadı.';
      alert(mesaj);
      _bolumFiltreDoldur();
      kayitlariCiz(document.getElementById('aramaKutusu').value);
    } catch (hata) {
      console.error(hata);
      alert('İçe aktarım sırasında beklenmeyen bir hata oluştu: ' + (hata.message || hata));
    } finally {
      dugme.disabled = false;
      dugme.textContent = eskiMetin;
    }
  });

  document.getElementById('pdfRaporBtn').addEventListener('click', hazirlayanModalAc);
  document.getElementById('hazirlayanModalKapatBtn').addEventListener('click', hazirlayanModalKapat);
  document.getElementById('hazirlayanPersonelSec').addEventListener('change', () => {
    if (document.getElementById('hazirlayanPersonelSec').value) document.getElementById('hazirlayanManuel').value = '';
  });
  document.getElementById('hazirlayanManuel').addEventListener('input', () => {
    if (document.getElementById('hazirlayanManuel').value.trim()) document.getElementById('hazirlayanPersonelSec').value = '';
  });
  document.getElementById('hazirlayanOnaylaBtn').addEventListener('click', async () => {
    const secilenPersonel = document.getElementById('hazirlayanPersonelSec').value;
    const manuel = document.getElementById('hazirlayanManuel').value.trim();
    const hazirlayanAdi = manuel || secilenPersonel;
    const dugme = document.getElementById('hazirlayanOnaylaBtn');
    const eskiMetin = dugme.textContent;
    dugme.disabled = true;
    dugme.textContent = 'Hazırlanıyor...';
    try {
      await riskRaporuPdfOlustur(hazirlayanAdi);
      hazirlayanModalKapat();
    } catch (hata) {
      console.error(hata);
      alert('PDF üretilemedi: ' + (hata.message || hata));
    } finally {
      dugme.disabled = false;
      dugme.textContent = eskiMetin;
    }
  });
  document.getElementById('pptxBtn').addEventListener('click', async () => {
    try { await riskPptxOlustur(); } catch (hata) { console.error(hata); alert('PPTX üretilemedi: ' + (hata.message || hata)); }
  });
  document.getElementById('checklistExcelBtn').addEventListener('click', () => {
    try { riskChecklistExcelOlustur(); } catch (hata) { console.error(hata); alert('Checklist üretilemedi: ' + (hata.message || hata)); }
  });
  document.getElementById('checklistPdfBtn').addEventListener('click', async () => {
    try { await riskChecklistPdfOlustur(); } catch (hata) { console.error(hata); alert('Checklist üretilemedi: ' + (hata.message || hata)); }
  });
  document.getElementById('formAyarlariBtn').addEventListener('click', () => formAyarlariModalAc('risk', 'Risk Değerlendirmesi'));

  document.getElementById('hazirSablonlarBtn').addEventListener('click', sablonModalAc);
  document.getElementById('sablonModalKapatBtn').addEventListener('click', sablonModalKapat);
  document.getElementById('sablonSektorFiltre').addEventListener('change', sablonlariCiz);
  document.getElementById('sablonKonuFiltre').addEventListener('change', sablonlariCiz);
  document.getElementById('sablonYonetmelikFiltre').addEventListener('change', sablonlariCiz);
  document.getElementById('sablonBolumYeniBtn').addEventListener('click', async () => {
    const ad = await metinIstemModali('Yeni bölüm adı:', '', '');
    if (ad === null) return;
    const sonuc = bolumEkle(ad);
    if (!sonuc.basarili) { alert(sonuc.hata); return; }
    _sablonBolumSecDoldur();
    document.getElementById('sablonBolumSec').value = sonuc.bolum.ad;
  });
  document.getElementById('sablonlariEkleBtn').addEventListener('click', () => {
    const secilenIdler = Array.from(document.querySelectorAll('#sablonListesi input[type=checkbox][data-sablon-id]:checked'))
      .map(el => el.getAttribute('data-sablon-id'));
    if (!secilenIdler.length) { alert('En az bir şablon seçiniz.'); return; }
    const sonuc = riskSablonlardanEkle(secilenIdler, document.getElementById('sablonBolumSec').value, document.getElementById('sablonYerSec').value);
    if (!sonuc.basarili) { alert(sonuc.hata); return; }
    let mesaj = `${sonuc.eklenen} risk kaydı eklendi.`;
    if (sonuc.basarisiz) mesaj += `\n${sonuc.basarisiz} kayıt eklenemedi.`;
    alert(mesaj);
    sablonModalKapat();
    _bolumFiltreDoldur();
    kayitlariCiz(document.getElementById('aramaKutusu').value);
  });

  _bolumFiltreDoldur();
  gorunumDegistir('kayitlar');
}

// ---- PDF Raporu: hazırlayan seçimi ----

function hazirlayanModalAc() {
  const secim = document.getElementById('hazirlayanPersonelSec');
  const personeller = personelleriGetir('', false);
  secim.innerHTML = '<option value="">— Seçiniz —</option>' +
    personeller.map(p => `<option value="${p.adSoyad}">${p.adSoyad}</option>`).join('');
  document.getElementById('hazirlayanManuel').value = '';
  document.getElementById('hazirlayanModalKatman').classList.add('acik');
}

function hazirlayanModalKapat() {
  document.getElementById('hazirlayanModalKatman').classList.remove('acik');
}

// ---- Hazır şablonlar modalı ----

function _sablonBolumSecDoldur() {
  const secim = document.getElementById('sablonBolumSec');
  const seciliDeger = secim.value;
  const bolumler = bolumleriGetir();
  secim.innerHTML = bolumler.map(b => `<option value="${b.ad}" ${b.ad === seciliDeger ? 'selected' : ''}>${b.ad}</option>`).join('');
  if (!secim.value && bolumler.length) secim.value = bolumler[0].ad;
}

function sablonModalAc() {
  const aktifFirma = aktifFirmaGetir();

  _sablonBolumSecDoldur();
  const bolumFiltreDegeri = document.getElementById('bolumFiltre').value;
  if (bolumFiltreDegeri) document.getElementById('sablonBolumSec').value = bolumFiltreDegeri;
  document.getElementById('sablonYerSec').value = 'Genel';

  document.getElementById('sablonSektorFiltre').innerHTML = '<option value="">Tüm Sektörler</option>' +
    SEKTORLER.map(s => `<option value="${s}">${s}</option>`).join('');
  document.getElementById('sablonSektorFiltre').value = aktifFirma ? aktifFirma.sektor : '';

  document.getElementById('sablonKonuFiltre').innerHTML = '<option value="">Tüm Konular</option>' +
    RISK_SABLON_KONULARI.map(k => `<option value="${k}">${k}</option>`).join('');

  document.getElementById('sablonYonetmelikFiltre').innerHTML = '<option value="">Tüm Yönetmelikler</option>' +
    RISK_SABLON_YONETMELIKLERI.map(y => `<option value="${y}">${y}</option>`).join('');

  sablonlariCiz();
  document.getElementById('sablonModalKatman').classList.add('acik');
}

function sablonModalKapat() {
  document.getElementById('sablonModalKatman').classList.remove('acik');
}

function sablonlariCiz() {
  const kutu = document.getElementById('sablonListesi');
  const sektor = document.getElementById('sablonSektorFiltre').value;
  const konu = document.getElementById('sablonKonuFiltre').value;
  const yonetmelik = document.getElementById('sablonYonetmelikFiltre').value;
  const sablonlar = riskSablonlariGetir(sektor, konu, yonetmelik);

  if (!sablonlar.length) {
    kutu.innerHTML = '<div class="bos-durum gorunur" style="padding:16px;">Seçilen filtrelere uygun şablon bulunamadı. Sektör/Konu/Yönetmelik filtrelerini "Tümü" yaparak deneyin.</div>';
    return;
  }

  kutu.innerHTML = sablonlar.map(s => `
    <label style="display:flex; align-items:flex-start; gap:10px; padding:10px 12px; border-bottom:1px solid var(--kenarlik); font-weight:400; cursor:pointer;">
      <input type="checkbox" data-sablon-id="${s.id}" style="width:auto; margin-top:3px;">
      <span style="flex:1;">
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:2px;">
          <strong style="font-size:13px;">${s.tehlike}</strong>
          ${s.konu ? `<span style="font-size:11px; color:#7c3aed; background:#ede9fe; border-radius:6px; padding:1px 6px;">${s.konu}</span>` : ''}
          <span style="font-size:11px; color:var(--metin-soluk); background:var(--kenarlik); border-radius:6px; padding:1px 6px;">${s.sektor}</span>
          ${s.kaynak === 'kullanici' ? '<span style="font-size:11px; color:#2563eb; background:#dbeafe; border-radius:6px; padding:1px 6px;">Kendi Şablonum</span>' : ''}
        </div>
        <div style="font-size:12px; color:var(--metin-soluk);">${s.risk}</div>
        <div style="font-size:12px; color:var(--metin-soluk);"><em>Önlem önerisi:</em> ${s.onlem}</div>
        ${s.yonetmelik ? `<div style="font-size:11px; color:var(--metin-soluk); margin-top:2px;"><em>Dayanak:</em> ${s.yonetmelik}</div>` : ''}
      </span>
      ${s.kaynak === 'kullanici' ? `<button type="button" class="tablo-buton sil" data-sablon-sil="${s.id}" title="Şablonu sil">Sil</button>` : ''}
    </label>
  `).join('');

  kutu.querySelectorAll('[data-sablon-sil]').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.preventDefault();
      const id = btn.getAttribute('data-sablon-sil');
      if (!(await onayModali('Bu şablonu silmek istediğinize emin misiniz?', 'Sil'))) return;
      const sonuc = riskSablonSil(id);
      if (!sonuc.basarili) { alert(sonuc.hata); return; }
      sablonlariCiz();
    });
  });
}

function gorunumDegistir(gorunum) {
  _riskGorunum = gorunum;
  document.getElementById('sekmeKayitlar').classList.toggle('sekme-seciliDegil', gorunum !== 'kayitlar');
  document.getElementById('sekmeOzet').classList.toggle('sekme-seciliDegil', gorunum !== 'ozet');
  document.getElementById('kayitlarBolumu').style.display = gorunum === 'kayitlar' ? '' : 'none';
  document.getElementById('ozetBolumu').style.display = gorunum === 'ozet' ? '' : 'none';

  if (gorunum === 'kayitlar') kayitlariCiz(document.getElementById('aramaKutusu').value);
  else ozetiCiz();
}

function duzeySinifAdi(etiket) {
  return slugOlustur(etiket || '');
}

function _jsonDosyaOlarakIndir(veri, dosyaAdi) {
  const blob = new Blob([JSON.stringify(veri, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = dosyaAdi;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Kalıcı bölüm listesiyle risk kayıtlarında geçen bölüm adlarını birleştirip
// filtre seçeneklerini günceller; o an seçili bölüm hâlâ mevcutsa seçimi korur.
function _bolumFiltreDoldur() {
  const secim = document.getElementById('bolumFiltre');
  const seciliDeger = secim.value;
  const bolumler = bolumleriGetir();

  secim.innerHTML = '<option value="">Tüm Bölümler</option>' +
    bolumler.map(b => `<option value="${b.ad}" ${b.ad === seciliDeger ? 'selected' : ''}>${b.ad}</option>`).join('');
}

function _riskKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function kayitlariCiz(aramaMetni) {
  const govde = document.getElementById('tabloGovde');
  const bosDurum = document.getElementById('bosDurum');
  const bolum = document.getElementById('bolumFiltre').value;
  const riskler = riskleriGetir(aramaMetni, { bolum });

  govde.innerHTML = '';

  if (riskler.length === 0) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = aramaMetni || bolum
      ? 'Filtrenizle eşleşen risk kaydı bulunamadı.'
      : 'Henüz risk kaydı eklenmedi. "+ Yeni Risk" ile başlayın.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  riskler.forEach(r => {
    const satir = document.createElement('tr');
    satir.innerHTML = `
      <td>${_riskKacir(r.riskNo)}</td>
      <td>${_riskKacir(r.yontem)}</td>
      <td>${_riskKacir(r.bolum)}</td>
      <td>${_riskKacir(r.yer)}</td>
      <td>${_riskKacir(r.tehlike)}</td>
      <td>${_riskKacir(r.risk)}</td>
      <td>${_riskKacir(r.onlem) || '-'}</td>
      <td>${r.RP1}</td>
      <td><span class="duzey-rozet duzey-${duzeySinifAdi(r.duzey1)}">${_riskKacir(r.duzey1)}</span></td>
      <td>${_riskFotoHucresiUret(r.fotoOncesi, 'Öncesi')}</td>
      <td>${_riskKacir(r.planlanan) || '-'}</td>
      <td>${r.RP2 !== null ? r.RP2 : '-'}</td>
      <td>${_riskKacir(r.azalma) || '-'}</td>
      <td>${_riskFotoHucresiUret(r.fotoSonrasi, 'Sonrası')}</td>
      <td>${_riskKacir(r.sorumlu) || '-'}</td>
      <td>${_riskKacir(r.termin) || '-'}</td>
      <td>${_riskKacir(r.durumGoruntu)}</td>
      <td>
        <button class="tablo-buton" data-duzenle="${r.id}">Düzenle</button>
        <button class="tablo-buton" data-sablon-yap="${r.id}" title="Bu kaydı hazır şablon olarak kaydet">⭐ Şablon Yap</button>
        <button class="tablo-buton sil" data-sil="${r.id}">Sil</button>
      </td>
    `;
    govde.appendChild(satir);
  });
  fotoReferanslariCoz(govde);

  govde.querySelectorAll('[data-duzenle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const r = riskIdIleGetirRepo(btn.getAttribute('data-duzenle'));
      if (r) modalAc(r);
    });
  });

  govde.querySelectorAll('[data-sablon-yap]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-sablon-yap');
      if (!(await onayModali('Bu risk kaydı (tehlike/risk/önlem metinleri) hazır şablon olarak kaydedilsin mi? Bu şablonu daha sonra bu veya başka bir firmada yeniden kullanabilirsiniz.', 'Kaydet'))) return;
      const sonuc = riskSablonKaydetKayittan(id);
      if (!sonuc.basarili) { alert(sonuc.hata); return; }
      alert('Şablon kaydedildi. "Hazır Şablonlar" listesinde "Kendi Şablonum" olarak görünecek.');
    });
  });

  govde.querySelectorAll('[data-sil]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-sil');
      if (await onayModali('Bu risk kaydını silmek istediğinize emin misiniz?', 'Sil')) {
        riskSil(id);
        _bolumFiltreDoldur();
        kayitlariCiz(document.getElementById('aramaKutusu').value);
      }
    });
  });
}

function ozetiCiz() {
  const ozet = riskOzetiHesapla();
  const kutu = document.getElementById('ozetKutusu');

  const kartHtml = (etiket, deger) => `<div class="istatistik-kutu"><span>${etiket}</span><b>${deger}</b></div>`;
  const dagilimHtml = (baslik, obje) => `
    <div class="kart" style="margin-bottom:14px;">
      <div class="card-title" style="margin-bottom:8px;"><h3 style="margin:0; font-size:14px;">${baslik}</h3></div>
      ${Object.entries(obje).length
        ? Object.entries(obje).map(([k, v]) => `
            <div style="display:flex; justify-content:space-between; font-size:13px; padding:6px 0; border-bottom:1px solid var(--kenarlik);">
              <span>${k}</span><strong>${v}</strong>
            </div>
          `).join('')
        : '<div class="bos-durum gorunur">Veri yok.</div>'
      }
    </div>
  `;

  kutu.innerHTML = `
    <div class="ozet-grid">
      ${kartHtml('Toplam Risk', ozet.toplam)}
      ${kartHtml('Açık', ozet.acik)}
      ${kartHtml('Kapalı', ozet.kapali)}
      ${kartHtml('Gecikmiş', ozet.gecikmis)}
      ${kartHtml('Önemli / Yüksek ve Üzeri', ozet.onemliVeUstu)}
      ${kartHtml('Tolerans Gösterilemez / Kritik', ozet.toleransGosterilemez)}
    </div>

    <div class="modul-grid" style="grid-template-columns: repeat(auto-fill, minmax(260px,1fr));">
      <div>${dagilimHtml('Bölüme Göre', ozet.bolumeGore)}</div>
      <div>${dagilimHtml('Risk Düzeyine Göre', ozet.duzeyeGore)}</div>
      <div>${dagilimHtml('Sorumluya Göre', ozet.sorumluyaGore)}</div>
    </div>

    <div class="card-title" style="margin:20px 0 8px;"><h3 style="margin:0; font-size:14px;">En Yüksek 10 Risk</h3></div>
    <div class="tablo-scroll">
      <table class="veri-tablosu">
        <thead><tr><th>Risk No</th><th>Yöntem</th><th>Bölüm</th><th>Tehlike</th><th>Risk</th><th>RP1</th><th>Düzey</th></tr></thead>
        <tbody>
          ${ozet.enYuksekRiskler.map(r => `
            <tr>
              <td>${r.riskNo}</td><td>${r.yontem}</td><td>${r.bolum}</td><td>${r.tehlike}</td><td>${r.risk}</td>
              <td>${r.RP1}</td><td><span class="duzey-rozet duzey-${duzeySinifAdi(r.duzey1)}">${r.duzey1}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function _secimDoldur(elId, secenekler) {
  const el = document.getElementById(elId);
  const mevcutDeger = el.value;
  el.innerHTML = '<option value="">— Seçiniz —</option>' + secenekler.map(s => `<option value="${s.deger}">${s.etiket}</option>`).join('');
  if (secenekler.some(s => String(s.deger) === mevcutDeger)) el.value = mevcutDeger;
}

function _aktifYontem() {
  return document.getElementById('yontem').value === '5x5' ? '5x5' : 'Fine-Kinney';
}

// Yöntem (Fine-Kinney/5x5 Matris) değiştiğinde O/F/Ş seçeneklerini o yöntemin
// ölçeğiyle yeniden doldurur; 5x5 Matris'te frekans boyutu olmadığından F/Fn
// alanları tamamen gizlenir.
function yontemAlanlariniGuncelle() {
  const hira = _aktifYontem() === '5x5';
  _secimDoldur('O', hira ? MATRIS_OLASILIK_SECENEKLERI : OLASILIK_SECENEKLERI);
  _secimDoldur('S', hira ? MATRIS_SIDDET_SECENEKLERI : SIDDET_SECENEKLERI);
  _secimDoldur('On', hira ? MATRIS_OLASILIK_SECENEKLERI : OLASILIK_SECENEKLERI);
  _secimDoldur('Sn', hira ? MATRIS_SIDDET_SECENEKLERI : SIDDET_SECENEKLERI);
  if (!hira) { _secimDoldur('F', FREKANS_SECENEKLERI); _secimDoldur('Fn', FREKANS_SECENEKLERI); }
  document.getElementById('fAlaniKutusu').style.display = hira ? 'none' : '';
  document.getElementById('fnAlaniKutusu').style.display = hira ? 'none' : '';
  oncekiHesabiCiz();
  sonrakiHesabiCiz();
}

function oncekiHesabiCiz() {
  const yontem = _aktifYontem();
  const hira = yontem === '5x5';
  const o = document.getElementById('O').value;
  const f = hira ? '1' : document.getElementById('F').value;
  const s = document.getElementById('S').value;
  const kutu = document.getElementById('oncekiHesapKutusu');

  if (!o || !s || (!hira && !f)) { kutu.innerHTML = hira ? 'Risk puanını görmek için Olasılık ve Şiddet seçiniz.' : 'Risk puanını görmek için Olasılık, Frekans ve Şiddet seçiniz.'; return; }

  const puan = riskPuaniHesapla(o, f, s, yontem);
  const duzey = riskDuzeyiGetir(puan, yontem);
  kutu.innerHTML = `Risk Puanı (RP1): <strong>${puan}</strong> &nbsp; <span class="duzey-rozet duzey-${duzeySinifAdi(duzey.etiket)}">${duzey.etiket}</span> &nbsp; <span style="color:var(--metin-soluk);">${duzey.aksiyon}</span>`;
}

function sonrakiHesabiCiz() {
  const yontem = _aktifYontem();
  const hira = yontem === '5x5';
  const o = document.getElementById('On').value;
  const f = hira ? '1' : document.getElementById('Fn').value;
  const s = document.getElementById('Sn').value;
  const kutu = document.getElementById('sonrakiHesapKutusu');

  if (!o || !s || (!hira && !f)) { kutu.innerHTML = hira ? 'Önlem sonrası puanı görmek için Olasılık(2) ve Şiddet(2) seçiniz.' : 'Önlem sonrası puanı görmek için Olasılık, Frekans ve Şiddet(2) seçiniz.'; return; }

  const oncekiF = hira ? '1' : document.getElementById('F').value;
  const rp1 = riskPuaniHesapla(document.getElementById('O').value, oncekiF, document.getElementById('S').value, yontem);
  const puan = riskPuaniHesapla(o, f, s, yontem);
  const duzey = riskDuzeyiGetir(puan, yontem);
  const azalma = rp1 ? azalmaYuzdesiHesapla(rp1, puan) : '';
  kutu.innerHTML = `Risk Puanı (RP2): <strong>${puan}</strong> &nbsp; <span class="duzey-rozet duzey-${duzeySinifAdi(duzey.etiket)}">${duzey.etiket}</span> ${azalma ? '&nbsp; Azalma: <strong>' + azalma + '</strong>' : ''}`;
}

function modalAc(risk) {
  _duzenlenenRiskId = risk ? risk.id : null;
  document.getElementById('modalBaslik').textContent = risk ? 'Risk Kaydını Düzenle' : 'Yeni Risk Kaydı';

  document.getElementById('yontem').innerHTML = RISK_YONTEMLERI.map(y => `<option ${risk && risk.yontem === y ? 'selected' : ''}>${y}</option>`).join('');
  if (!risk) document.getElementById('yontem').value = 'Fine-Kinney';
  yontemAlanlariniGuncelle();
  document.getElementById('durum').innerHTML = RISK_DURUMLARI.map(d => `<option ${risk && risk.durum === d ? 'selected' : ''}>${d}</option>`).join('');

  document.getElementById('bolum').value = risk ? risk.bolum : document.getElementById('bolumFiltre').value;
  document.getElementById('yer').value = risk ? risk.yer : '';
  document.getElementById('faaliyet').value = risk ? risk.faaliyet : '';
  document.getElementById('tehlike').value = risk ? risk.tehlike : '';
  document.getElementById('risk').value = risk ? risk.risk : '';
  document.getElementById('onlem').value = risk ? risk.onlem : '';
  document.getElementById('O').value = risk ? risk.O : '';
  document.getElementById('F').value = risk ? risk.F : '';
  document.getElementById('S').value = risk ? risk.S : '';

  _riskFotoOncesi = risk ? (risk.fotoOncesi || '') : '';
  _riskFotoOnizlemeCiz('fotoOncesiOnizleme', _riskFotoOncesi, () => { _riskFotoOncesi = ''; _riskFotoOnizlemeCiz('fotoOncesiOnizleme', '', null); });

  document.getElementById('planlanan').value = risk ? risk.planlanan : '';
  document.getElementById('On').value = risk ? risk.On : '';
  document.getElementById('Fn').value = risk ? risk.Fn : '';
  document.getElementById('Sn').value = risk ? risk.Sn : '';

  _riskFotoSonrasi = risk ? (risk.fotoSonrasi || '') : '';
  _riskFotoOnizlemeCiz('fotoSonrasiOnizleme', _riskFotoSonrasi, () => { _riskFotoSonrasi = ''; _riskFotoOnizlemeCiz('fotoSonrasiOnizleme', '', null); });

  document.getElementById('sorumlu').value = risk ? risk.sorumlu : '';
  document.getElementById('termin').value = risk ? risk.termin : '';
  document.getElementById('tespit').value = risk ? risk.tespit : '';
  if (!risk) document.getElementById('durum').value = 'Açık';

  oncekiHesabiCiz();
  sonrakiHesabiCiz();
  _riskKonumAlaniCiz(risk);
  temizleFormHatalari();
  document.getElementById('modalKatman').classList.add('acik');
}

// Saha Dijital Haritası köprüsü — bkz. modules/uygunsuzluk/ui.js'teki
// _konumAlaniCiz ile aynı desen.
function _riskKonumAlaniCiz(risk) {
  const kutu = document.getElementById('konumAlani');
  if (!kutu) return;
  if (_bekleyenHaritaKonum && !risk) {
    kutu.innerHTML = '<div style="font-size:12px; color:var(--metin-soluk);">📍 Haritadan seçilen konum bu kayda kaydedilince eklenecek.</div>';
    return;
  }
  if (!risk) {
    kutu.innerHTML = '<div style="font-size:12px; color:var(--metin-soluk);">Konum eklemek için önce kaydı oluşturup tekrar açın.</div>';
    return;
  }
  const donusUrl = encodeURIComponent(location.pathname + '?ac=' + risk.id);
  if (risk.haritaTesisId) {
    kutu.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px; font-size:13px;">
        <span>📍 Haritada işaretli</span>
        <button type="button" class="tablo-buton" id="konumGorBtn">Haritada Gör</button>
      </div>`;
    document.getElementById('konumGorBtn').addEventListener('click', () => {
      window.location.href = `../harita/index.html?odaklanKaynak=risk&odaklanId=${risk.id}`;
    });
  } else {
    kutu.innerHTML = `<button type="button" class="tablo-buton" id="konumEkleBtn">📍 Haritada Konum Ekle</button>`;
    document.getElementById('konumEkleBtn').addEventListener('click', () => {
      window.location.href = `../harita/index.html?konumKaynak=risk&konumId=${risk.id}&donus=${donusUrl}`;
    });
  }
}

function modalKapat() {
  document.getElementById('modalKatman').classList.remove('acik');
  _duzenlenenRiskId = null;
}

function temizleFormHatalari() {
  document.querySelectorAll('#riskForm .alan-hatasi').forEach(el => el.textContent = '');
}

function formGonderildi(e) {
  e.preventDefault();
  temizleFormHatalari();

  const veriler = {
    yontem: document.getElementById('yontem').value,
    bolum: document.getElementById('bolum').value,
    yer: document.getElementById('yer').value,
    faaliyet: document.getElementById('faaliyet').value,
    tehlike: document.getElementById('tehlike').value,
    risk: document.getElementById('risk').value,
    onlem: document.getElementById('onlem').value,
    O: document.getElementById('O').value,
    F: document.getElementById('F').value,
    S: document.getElementById('S').value,
    fotoOncesi: _riskFotoOncesi,
    planlanan: document.getElementById('planlanan').value,
    On: document.getElementById('On').value,
    Fn: document.getElementById('Fn').value,
    Sn: document.getElementById('Sn').value,
    fotoSonrasi: _riskFotoSonrasi,
    sorumlu: document.getElementById('sorumlu').value,
    termin: document.getElementById('termin').value,
    durum: document.getElementById('durum').value,
    tespit: document.getElementById('tespit').value
  };

  if (!_duzenlenenRiskId && _bekleyenHaritaKonum) {
    veriler.haritaTesisId = _bekleyenHaritaKonum.tesisId;
    veriler.haritaX = _bekleyenHaritaKonum.x;
    veriler.haritaY = _bekleyenHaritaKonum.y;
  }

  const sonuc = _duzenlenenRiskId
    ? riskGuncelle(_duzenlenenRiskId, veriler)
    : riskEkle(veriler);

  if (!sonuc.basarili) {
    Object.keys(sonuc.hatalar).forEach(alan => {
      const hataEl = document.getElementById(alan + 'Hata');
      if (hataEl) hataEl.textContent = sonuc.hatalar[alan];
    });
    return;
  }

  _bekleyenHaritaKonum = null;
  modalKapat();
  _bolumFiltreDoldur();
  kayitlariCiz(document.getElementById('aramaKutusu').value);
}
