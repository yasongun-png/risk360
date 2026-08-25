// Personel — Eğitim Katılım Formu (İmza Listesi) PDF çıktısı.
// Kullanıcı isteği: "herhangi bir eğitim için imza listesi oluştur butonu
// eğitim türü ve katılımcıları seçip sicil no ad soyad imza olsun, başlığı
// solda logo ortada eğitim katılım formu yazsın sağda form ayarları
// kısmı olsun, bu formu dışa aktarabileyim, katılımcılara uygulama dışında
// da imzalatabileyim" — sonra "ancak bunun personel modülünde olması daha
// doğru olacak" ile Eğitim modülünden buraya taşındı (eğitim türü kataloğu
// hâlâ ../egitim/model.js'ten okunuyor, bkz. index.html script sırası).
// Kayıt oluşturmaz, sadece boş imza haneli, çok sayfaya bölünebilen bir PDF
// üretir (bkz. ui.js imzaListesiOlusturTiklandi çağrısı).

function _prsSertKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// bugunIso, core/data.js'te DEĞİL her modülün kendi model.js'inde ayrı ayrı
// tanımlanan bir yardımcı (bkz. modules/*/model.js) — personel/model.js'te
// yok ve bu sayfada egitim/model.js de sadece veri katmanı olarak yüklü
// (bkz. index.html), o da bunu tanımlamıyor. Global bir tanıma güvenmek
// yerine burada yerel bir kopya tutuluyor.
function _prsBugunIso() {
  return new Date().toISOString().slice(0, 10);
}

const _PRS_IMZA_SATIR_SAYFA_BASI = 22;

// Kullanıcı isteği: "eğitimci ve işveren vekili imza kısmı yok", sonra
// "eğitim veren her zaman neden Koray Şahbaz" — Eğitim modülündeki Temel
// İSG sertifikasıyla aynı sorguyla (en güncel, feshedilmemiş İSG Uzmanı
// hizmet sözleşmesi) SADECE bir varsayılan ÖNERİ üretir; ui.js
// imzaListesiModalAc bunu forma önceden doldurur ama kullanıcı serbestçe
// değiştirebilir/silebilir — eğitimBilgi.egitimci/isverenVekili (bkz.
// _prsImzaSayfasiHtml) gerçekte formda ne yazıyorsa onu basar.
function _prsGorevliAdiGetir(gorevTuru) {
  const liste = (typeof hizmetSozlesmeleriTumunuGetir === 'function' ? hizmetSozlesmeleriTumunuGetir() : [])
    .filter(k => k.gorevTuru === gorevTuru && k.durum !== 'Feshedildi')
    .sort((a, b) => (b.sozlesmeBaslangicTarihi || '').localeCompare(a.sozlesmeBaslangicTarihi || ''));
  return liste[0] ? liste[0].adSoyad : '';
}

// Katılımcı tablosuyla aynı sayfaya sığmayabileceğinden (sayfa zaten dolu
// olabilir, .eil-sayfa overflow:hidden kırpardı) kendi ayrı sayfasında basılır.
function _prsImzaSayfasiHtml(egitimTuruAdi, firma, egitimBilgi, sayfaNo, toplamSayfa) {
  const logo = firma && firmaLogoGetir(firma.id);
  return `
    <section class="eil-sayfa">
      <div class="eil-ustbilgi">
        <div class="eil-logo">${logo ? `<img src="${logo}">` : 'LOGO YOK'}</div>
        <div class="eil-baslik">EĞİTİM KATILIM FORMU</div>
        <div class="eil-fa">${formAyarlariKutusuHtml('egitim')}</div>
      </div>
      <div class="eil-bilgi">
        <span><b>Eğitim/Sertifika Türü:</b> ${_prsSertKacir(egitimTuruAdi)}</span>
        <span><b>Tarih:</b> ${_prsSertKacir(_prsEgitimTarihiGoruntu(egitimBilgi))}</span>
      </div>
      <div class="eil-imzalar">
        <div><span>${_prsSertKacir(egitimBilgi.egitimci) || '&nbsp;'}</span><b>Eğitimi Veren (Eğitimci)</b><em>İmza</em></div>
        <div><span>${_prsSertKacir(egitimBilgi.isverenVekili) || '&nbsp;'}</span><b>İşveren Vekili</b><em>İmza</em></div>
      </div>
      ${toplamSayfa > 1 ? `<div class="eil-altbilgi">Sayfa ${sayfaNo} / ${toplamSayfa}</div>` : ''}
    </section>
  `;
}

function _prsImzaListesiStilHtml(kokSelector) {
  return `
    <style>
      ${kokSelector}{ font-family: Arial, Helvetica, sans-serif; color:#111827; background:#fff; }
      ${kokSelector} *{ box-sizing:border-box; }
      ${kokSelector} .eil-sayfa{ width:210mm; height:297mm; padding:12mm; position:relative; overflow:hidden; background:#fff; }
      ${kokSelector} .eil-ustbilgi{ display:flex; align-items:stretch; border:2px solid #111827; margin-bottom:5mm; }
      ${kokSelector} .eil-ustbilgi > div{ padding:3mm; display:flex; align-items:center; justify-content:center; border-right:2px solid #111827; background:#fff; }
      ${kokSelector} .eil-ustbilgi > div:last-child{ border-right:none; }
      ${kokSelector} .eil-logo{ flex:0 0 30mm; width:30mm; text-align:center; font-size:8pt; font-weight:700; color:#111827; }
      ${kokSelector} .eil-logo img{ max-width:26mm; max-height:18mm; }
      ${kokSelector} .eil-baslik{ flex:1 1 auto; min-width:0; text-align:center; font-size:14pt; font-weight:900; color:#111827; line-height:1.3; }
      ${kokSelector} .eil-fa{ flex:0 0 42mm; width:42mm; padding:2mm !important; align-items:stretch !important; }
      ${kokSelector} .fa-kutu{ border-collapse:collapse; font-size:6.8pt; width:100%; table-layout:fixed; }
      ${kokSelector} .fa-kutu td{ padding:1.5px 4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      ${kokSelector} .fa-kutu td:first-child{ font-weight:700; background:#fff; width:48%; }
      ${kokSelector} .eil-bilgi{ display:flex; justify-content:space-between; font-size:10pt; color:#111827; margin-bottom:5mm; }
      ${kokSelector} table.eil-tablo{ width:100%; border-collapse:collapse; }
      ${kokSelector} table.eil-tablo th{ background:#f1f5f9; color:#0b2c52; font-size:9pt; font-weight:700; padding:2.5mm 3mm; border:1px solid #94a3b8; text-align:left; }
      ${kokSelector} table.eil-tablo td{ font-size:9.5pt; color:#111827; padding:2.5mm 3mm; border:1px solid #94a3b8; height:11mm; }
      ${kokSelector} .eil-altbilgi{ position:absolute; bottom:6mm; left:12mm; right:12mm; text-align:center; font-size:8pt; color:#6b7280; }
      ${kokSelector} .eil-imzalar{ display:flex; justify-content:space-between; gap:10mm; margin-top:14mm; }
      ${kokSelector} .eil-imzalar > div{ flex:1; text-align:center; border-top:1px solid #94a3b8; padding-top:3mm; }
      ${kokSelector} .eil-imzalar span{ display:block; font-weight:700; font-size:11pt; min-height:7mm; }
      ${kokSelector} .eil-imzalar b{ display:block; font-size:9.5pt; color:#374151; margin-top:1.5mm; }
      ${kokSelector} .eil-imzalar em{ display:block; font-size:8.5pt; color:#94a3b8; font-style:normal; margin-top:1.5mm; }
    </style>
  `;
}

function _prsEgitimTarihiGoruntu(egitimBilgi) {
  const tarihMetni = egitimBilgi.tarih2 ? `${gunAyYil(egitimBilgi.tarih)} - ${gunAyYil(egitimBilgi.tarih2)}` : gunAyYil(egitimBilgi.tarih);
  return tarihMetni;
}

function _prsImzaListesiSayfaHtml(egitimTuruAdi, katilimcilar, firma, egitimBilgi, baslangicNo, sayfaNo, toplamSayfa) {
  const logo = firma && firmaLogoGetir(firma.id);
  const satirlar = katilimcilar.map((p, i) => `
    <tr>
      <td style="text-align:center; width:7%;">${baslangicNo + i}</td>
      <td style="width:16%;">${_prsSertKacir(p.sicilNo)}</td>
      <td style="width:29%;">${_prsSertKacir(p.adSoyad)}</td>
      <td style="width:22%;">${_prsSertKacir(p.isveren) || '-'}</td>
      <td></td>
    </tr>
  `).join('');

  return `
    <section class="eil-sayfa">
      <div class="eil-ustbilgi">
        <div class="eil-logo">${logo ? `<img src="${logo}">` : 'LOGO YOK'}</div>
        <div class="eil-baslik">EĞİTİM KATILIM FORMU</div>
        <div class="eil-fa">${formAyarlariKutusuHtml('egitim')}</div>
      </div>
      <div class="eil-bilgi">
        <span><b>Eğitim/Sertifika Türü:</b> ${_prsSertKacir(egitimTuruAdi)}</span>
        <span><b>Tarih:</b> ${_prsSertKacir(_prsEgitimTarihiGoruntu(egitimBilgi))}</span>
        ${egitimBilgi.saat ? `<span><b>Süre:</b> ${_prsSertKacir(egitimBilgi.saat)} Saat</span>` : ''}
      </div>
      <table class="eil-tablo">
        <thead><tr><th>Sıra No</th><th>Sicil No</th><th>Ad Soyad</th><th>İşyeri Sicili</th><th>İmza</th></tr></thead>
        <tbody>${satirlar}</tbody>
      </table>
      ${toplamSayfa > 1 ? `<div class="eil-altbilgi">Sayfa ${sayfaNo} / ${toplamSayfa}</div>` : ''}
    </section>
  `;
}

// Sayfayı, kendi mm cinsinden CSS boyutuyla birebir oranlı yakalar (aspect
// ratio bozulmasın diye) — böylece jsPDF'e tam sayfa (kenar boşluksuz)
// addImage ile basılır.
async function _prsSayfaCanvasaCevir(el) {
  return await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
}

// egitimBilgi: { tarih, tarih2 (opsiyonel, iki günlü eğitimler için), saat
// (opsiyonel) } -- bkz. ui.js imzaListesiOlusturTiklandi, seçilen eğitim
// türünün ikiGunluMu/saatliMi alanlarına göre doldurulur.
async function imzaListesiPdfOlustur(egitimTuruAdi, katilimcilar, egitimBilgi) {
  if (!Array.isArray(katilimcilar) || !katilimcilar.length) return;
  const firma = aktifFirmaGetir();
  const bilgi = egitimBilgi || { tarih: _prsBugunIso() };

  const sayfalar = [];
  for (let i = 0; i < katilimcilar.length; i += _PRS_IMZA_SATIR_SAYFA_BASI) sayfalar.push(katilimcilar.slice(i, i + _PRS_IMZA_SATIR_SAYFA_BASI));
  const toplamSayfa = sayfalar.length + 1;

  const html = `<div id="prsImzaListesiPdf">${_prsImzaListesiStilHtml('#prsImzaListesiPdf')}${
    sayfalar.map((s, i) => _prsImzaListesiSayfaHtml(egitimTuruAdi, s, firma, bilgi, i * _PRS_IMZA_SATIR_SAYFA_BASI + 1, i + 1, toplamSayfa)).join('')
  }${_prsImzaSayfasiHtml(egitimTuruAdi, firma, bilgi, toplamSayfa, toplamSayfa)}</div>`;

  const mount = document.getElementById('yazdirmaAlani');
  mount.innerHTML = html;
  mount.style.display = 'block';

  const pdf = new jspdf.jsPDF('p', 'mm', 'a4');
  const sayfaElemanlari = mount.querySelectorAll('.eil-sayfa');
  for (let i = 0; i < sayfaElemanlari.length; i++) {
    const canvas = await _prsSayfaCanvasaCevir(sayfaElemanlari[i]);
    if (i > 0) pdf.addPage('a4', 'p');
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, 297);
  }
  pdf.save(`${egitimTuruAdi}_Imza_Listesi`.replace(/[^\p{L}\p{N}]+/gu, '_') + '.pdf');

  mount.innerHTML = '';
  mount.style.display = 'none';
}
