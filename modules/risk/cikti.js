// Risk Değerlendirmesi çıktıları: PDF Raporu (kapak + Fine-Kinney yöntem
// tabloları + özet + risk listesi), PPTX sunum ve saha kontrol Checklist'i
// (Excel + PDF) — eski isg platformundaki risk-defteri aracının PPTX/Checklist
// özellikleriyle aynı mantık, sade/siyah-beyaz görünüm (uygunsuzluk modülüyle
// tutarlı) + risk düzeyi rozetleri anlamlı olduğu için renkli bırakıldı.

function _riskCiktiKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// Kullanıcı isteği: "kısaltmalarını yazalım" / "T.G. gibi" -- dar Düzey
// kolonunda (risk listesi tablosu) tam etiket yerine kısaltma basılır;
// geniş yöntem/ölçek referans tablolarında (kucuk=false) tam etiket kalır.
// Harf çakışmasını önlemek için (ör. "Önemli"/"Önemsiz" ikisi de "Ö" ile
// başlıyor) bazılarında ikinci harf, kelimenin baş harfi yerine ayırt edici
// bir harften seçildi.
const _RISK_DUZEY_KISALTMA = {
  'Önemsiz Risk': 'Ö.S.',
  'Olası Risk': 'O.L.',
  'Önemli Risk': 'Ö.M.',
  'Esaslı Risk': 'E.S.',
  'Tolerans Gösterilemez': 'T.G.',
  'Düşük Risk': 'D.Ş.',
  'Orta Risk': 'O.T.',
  'Yüksek Risk': 'Y.K.',
  'Kritik Risk': 'K.R.'
};

function _riskDuzeyRenk(etiket) {
  const harita = {
    'Önemsiz Risk': { bg: '#dcfce7', fg: '#15803d' },
    'Olası Risk': { bg: '#fef3c7', fg: '#b45309' },
    'Önemli Risk': { bg: '#ffedd5', fg: '#c2410c' },
    'Esaslı Risk': { bg: '#fee2e2', fg: '#b91c1c' },
    'Tolerans Gösterilemez': { bg: '#450a0a', fg: '#fecaca' },
    'Düşük Risk': { bg: '#dcfce7', fg: '#15803d' },
    'Orta Risk': { bg: '#fef3c7', fg: '#b45309' },
    'Yüksek Risk': { bg: '#ffedd5', fg: '#c2410c' },
    'Kritik Risk': { bg: '#450a0a', fg: '#fecaca' }
  };
  return harita[etiket] || { bg: '#e5e7eb', fg: '#111827' };
}

// Kullanıcı raporu: "tolerans gösterilemez hücre dışına çıkıyor" -- Düzey
// kolonu dar (rsk-tablo colgroup'ta ~%8) olduğundan, "Tolerans Gösterilemez"
// gibi uzun etiketler white-space:nowrap ile tek satıra zorlanınca hücre
// sınırının dışına taşıyordu. Artık satır kırılmasına izin veriliyor
// (gerekirse rozet iki satıra bölünüyor, hücreyi taşmıyor). kucuk=true iken
// (risk listesi tablosu) kullanıcı isteğiyle ("kısaltmalarını yazalım" /
// "T.G. gibi") tam etiket yerine kısaltma basılır -- bkz.
// _RISK_DUZEY_KISALTMA ve _riskDuzeyKisaltmaAciklamaHtml (açıklama metni).
function _riskDuzeyRozetHtml(etiket, kucuk) {
  const renk = _riskDuzeyRenk(etiket);
  const gosterilecekMetin = kucuk ? (_RISK_DUZEY_KISALTMA[etiket] || etiket) : etiket;
  return `<span style="display:inline-block; padding:${kucuk ? '1px 6px' : '2px 8px'}; border-radius:8px; font-size:${kucuk ? '7pt' : '8pt'}; font-weight:700; white-space:normal; line-height:1.25; word-break:break-word; background:${renk.bg}; color:${renk.fg};">${_riskCiktiKacir(gosterilecekMetin)}</span>`;
}

function _riskDuzeyKisaltmaAciklamaHtml() {
  const parcalar = Object.keys(_RISK_DUZEY_KISALTMA).map(etiket => `${_RISK_DUZEY_KISALTMA[etiket]} = ${_riskCiktiKacir(etiket)}`);
  return `<div class="rsk-kisaltma-aciklama">Düzey kısaltmaları: ${parcalar.join(' &nbsp;•&nbsp; ')}</div>`;
}

// RISK_DUZEYLERI (model.js) minExclusive'e göre azalan sırada tanımlı; ardışık
// elemanlar arasındaki farktan "N < RP ≤ M" aralık metnini türetir.
function _riskDuzeyAraligiSatirlariHtml() {
  return RISK_DUZEYLERI.map((d, i) => {
    const ustSinir = i === 0 ? null : RISK_DUZEYLERI[i - 1].minExclusive;
    const aralik = d.minExclusive === -Infinity
      ? `RP ≤ ${ustSinir}`
      : (ustSinir === null ? `RP &gt; ${d.minExclusive}` : `${d.minExclusive} &lt; RP ≤ ${ustSinir}`);
    return `<tr><td>${aralik}</td><td>${_riskDuzeyRozetHtml(d.etiket)}</td><td>${_riskCiktiKacir(d.aksiyon)}</td></tr>`;
  }).join('');
}

function _riskOlcekTablosuHtml(baslik, secenekler) {
  return `
    <table class="rsk-yontem-tablo">
      <thead><tr><th colspan="2">${_riskCiktiKacir(baslik)}</th></tr></thead>
      <tbody>
        ${secenekler.map(s => `<tr><td style="width:16mm; text-align:center; font-weight:700;">${s.deger}</td><td>${_riskCiktiKacir(s.etiket.replace(/^[-\d.]+\s*-\s*/, ''))}</td></tr>`).join('')}
      </tbody>
    </table>
  `;
}

// RISK_DUZEYLERI ile aynı mantık, MATRIS_DUZEYLERI (model.js) için — o da
// minExclusive'e göre azalan sırada tanımlı.
function _hiraDuzeyAraligiSatirlariHtml() {
  return MATRIS_DUZEYLERI.map((d, i) => {
    const ustSinir = i === 0 ? null : MATRIS_DUZEYLERI[i - 1].minExclusive;
    const aralik = d.minExclusive === -Infinity
      ? `RP ≤ ${ustSinir}`
      : (ustSinir === null ? `RP &gt; ${d.minExclusive}` : `${d.minExclusive} &lt; RP ≤ ${ustSinir}`);
    return `<tr><td>${aralik}</td><td>${_riskDuzeyRozetHtml(d.etiket)}</td><td>${_riskCiktiKacir(d.aksiyon)}</td></tr>`;
  }).join('');
}

// Rapor kapsamındaki kayıtlarda fiilen kullanılan yöntem(ler)e göre ilgili
// metodoloji açıklamasını (ya da ikisini birden, karışık rapor ise) gösterir.
function _riskYontemBolumuHtml(riskler) {
  const fineKinneyVarMi = !riskler || riskler.length === 0 || riskler.some(r => r.yontem !== '5x5');
  const matrisVarMi = (riskler || []).some(r => r.yontem === '5x5');

  const fineKinneyHtml = fineKinneyVarMi ? `
    <div class="rsk-bolum">
      <h2>Değerlendirme Yöntemi (Fine-Kinney)</h2>
      <p style="font-size:9pt; color:#374151; margin:0 0 4mm;">
        Risk Puanı (RP) = Olasılık (O) × Frekans (F) × Şiddet (Ş) formülüyle hesaplanır.
        Önlem sonrası (RP2) aynı yöntemle, önlemler uygulandıktan sonraki O/F/Ş değerleriyle yeniden hesaplanır.
      </p>
      <div style="display:flex; gap:4mm;">
        ${_riskOlcekTablosuHtml('Olasılık (O)', OLASILIK_SECENEKLERI)}
        ${_riskOlcekTablosuHtml('Frekans (F)', FREKANS_SECENEKLERI)}
        ${_riskOlcekTablosuHtml('Şiddet (Ş)', SIDDET_SECENEKLERI)}
      </div>
      <table class="rsk-yontem-tablo" style="width:100%; margin-top:4mm;">
        <thead><tr><th>Risk Puanı (RP) Aralığı</th><th>Risk Düzeyi</th><th>Gerekli Aksiyon</th></tr></thead>
        <tbody>${_riskDuzeyAraligiSatirlariHtml()}</tbody>
      </table>
    </div>
  ` : '';

  const hiraHtml = matrisVarMi ? `
    <div class="rsk-bolum">
      <h2>Değerlendirme Yöntemi (5x5 Matris)</h2>
      <p style="font-size:9pt; color:#374151; margin:0 0 4mm;">
        Risk Puanı (RP) = Olasılık (O) × Şiddet (Ş) formülüyle hesaplanır (5x5 skala, frekans boyutu yoktur).
        Önlem sonrası (RP2) aynı yöntemle, önlemler uygulandıktan sonraki O/Ş değerleriyle yeniden hesaplanır.
      </p>
      <div style="display:flex; gap:4mm;">
        ${_riskOlcekTablosuHtml('Olasılık (O)', MATRIS_OLASILIK_SECENEKLERI)}
        ${_riskOlcekTablosuHtml('Şiddet (Ş)', MATRIS_SIDDET_SECENEKLERI)}
      </div>
      <table class="rsk-yontem-tablo" style="width:100%; margin-top:4mm;">
        <thead><tr><th>Risk Puanı (RP) Aralığı</th><th>Risk Düzeyi</th><th>Gerekli Aksiyon</th></tr></thead>
        <tbody>${_hiraDuzeyAraligiSatirlariHtml()}</tbody>
      </table>
    </div>
  ` : '';

  return fineKinneyHtml + hiraHtml;
}

function _riskFotoHucre(url) {
  return url ? `<img class="rsk-foto-thumb" src="${url}">` : '<div class="rsk-foto-bos"></div>';
}

function _riskSatirHtml(r) {
  return `
    <tr>
      <td>${_riskCiktiKacir(r.riskNo)}</td>
      <td>${_riskCiktiKacir(r.bolum)}</td>
      <td>${_riskCiktiKacir(r.yer)}</td>
      <td>${_riskCiktiKacir(r.tehlike)}</td>
      <td>${_riskCiktiKacir(r.risk)}</td>
      <td style="text-align:center; font-weight:700;">${r.RP1}</td>
      <td>${_riskDuzeyRozetHtml(r.duzey1, true)}</td>
      <td>${_riskFotoHucre(r.fotoOncesi)}</td>
      <td>${r.RP2 !== null ? r.RP2 : '-'}</td>
      <td>${r.azalma || '-'}</td>
      <td>${_riskFotoHucre(r.fotoSonrasi)}</td>
      <td>${_riskCiktiKacir(r.sorumlu) || '-'}</td>
      <td>${_riskCiktiKacir(gunAyYil(r.termin)) || '-'}</td>
      <td>${_riskCiktiKacir(r.durumGoruntu)}</td>
    </tr>
  `;
}

const _RSK_PDF_STIL = `
  #rskPdfKok{ font-family: Arial, Helvetica, sans-serif; color:#111827; background:#fff; width:100%; }
  #rskPdfKok *{ box-sizing:border-box; }

  #rskPdfKok .fa-kutu{ border-collapse:collapse; font-size:7pt; width:42mm; table-layout:fixed; }
  #rskPdfKok .fa-kutu td{ padding:1.5px 4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  #rskPdfKok .fa-kutu td:first-child{ font-weight:700; background:#f1f5f9; width:48%; }

  #rskPdfKok .rsk-kapak{ position:relative; height:185mm; max-height:185mm; display:flex; align-items:center; justify-content:center; overflow:hidden; page-break-after:always; }
  #rskPdfKok .rsk-kapak-fa{ position:absolute; top:10mm; right:10mm; }
  #rskPdfKok .rsk-kapak-kutu{ width:78%; border:3px solid #111827; padding:14mm; text-align:center; }
  #rskPdfKok .rsk-kapak-kutu .rsk-firma{ font-size:12pt; font-weight:700; margin-bottom:6mm; color:#374151; }
  #rskPdfKok .rsk-kapak-kutu h1{ margin:0 0 8mm; font-size:19pt; color:#111827; }
  #rskPdfKok .rsk-kapak-kutu .rsk-tarih{ font-size:9pt; color:#374151; margin-top:8mm; }

  #rskPdfKok .rsk-liste-ustbilgi{ display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:5mm; border-bottom:2px solid #111827; padding-bottom:3mm; }
  #rskPdfKok .rsk-liste-ustbilgi h1{ margin:0; font-size:14pt; color:#111827; }
  #rskPdfKok .rsk-liste-istatistik{ display:flex; gap:6mm; }
  #rskPdfKok .rsk-liste-istatistik div{ font-size:9pt; text-align:center; }
  #rskPdfKok .rsk-liste-istatistik b{ display:block; font-size:14pt; color:#111827; }

  #rskPdfKok .rsk-bolum{ margin-bottom:6mm; page-break-inside:avoid; }
  #rskPdfKok .rsk-bolum h2{ margin:0 0 3mm; font-size:13pt; color:#111827; border-bottom:2px solid #111827; padding-bottom:2mm; }

  #rskPdfKok .rsk-yontem-tablo{ border-collapse:collapse; flex:1; font-size:7.5pt; }
  #rskPdfKok .rsk-yontem-tablo th{ background:#e5e7eb; color:#111827; padding:3px 5px; border:1px solid #94a3b8; }
  #rskPdfKok .rsk-yontem-tablo td{ padding:2.5px 5px; border:1px solid #cbd5e1; }
  #rskPdfKok .rsk-kisaltma-aciklama{ font-size:7pt; color:#4b5563; margin:2mm 0 3mm; line-height:1.5; }

  #rskPdfKok table.rsk-tablo{ width:100%; border-collapse:collapse; table-layout:fixed; }
  #rskPdfKok table.rsk-tablo th{ background:#e5e7eb; color:#111827; font-size:7.3pt; padding:3px 4px; border:1px solid #94a3b8; text-transform:uppercase; }
  #rskPdfKok table.rsk-tablo td{ font-size:7.6pt; padding:3px 4px; border:1px solid #cbd5e1; vertical-align:middle; overflow-wrap:anywhere; }
  #rskPdfKok table.rsk-tablo tr{ page-break-inside:avoid; }

  #rskPdfKok .rsk-foto-thumb{ width:100%; height:22mm; object-fit:cover; border:1px solid #cbd5e1; display:block; background:#fff; }
  #rskPdfKok .rsk-foto-bos{ width:100%; height:22mm; border:1px solid #cbd5e1; background:#f3f4f6; }

  #rskPdfKok .rsk-imza{ margin-top:6mm; border-top:1px solid #94a3b8; padding-top:4mm; display:flex; justify-content:space-between; flex-wrap:wrap; gap:4mm; font-size:9.5pt; page-break-inside:avoid; }
`;

function _riskTabloBasligiHtml() {
  return `
    <tr>
      <th>No</th><th>Bölüm</th><th>Yer / Ekipman</th><th>Tehlike</th><th>Risk</th>
      <th>RP1</th><th>Düzey</th><th>Öncesi</th><th>RP2</th><th>Azalma</th><th>Sonrası</th>
      <th>Sorumlu</th><th>Termin</th><th>Durum</th>
    </tr>
  `;
}

// html2pdf/html2canvas bir HTML tablosunun <thead>'ini sayfa geçişlerinde
// otomatik TEKRARLAMAZ (native PDF tablo kütüphanelerinin aksine — bu satır
// kırılımı css/legacy modunun bir sınırlaması). Bunu aşmak için risk listesi
// sabit sayıda satırlık parçalara bölünüp her parça kendi <thead>'i olan AYRI
// bir <table> olarak render edilir: ilk parça mevcut akışta kalır, sonraki
// parçalar page-break-before:always ile yeni sayfada başlar — böylece sütun
// başlıkları her sayfada yeniden görünür.
function _riskTabloParcalariHtml(riskler, satirBasina) {
  const parcalar = [];
  for (let i = 0; i < riskler.length; i += satirBasina) parcalar.push(riskler.slice(i, i + satirBasina));

  return parcalar.map((parca, index) => `
    <div class="rsk-bolum"${index > 0 ? ' style="page-break-before:always;"' : ''}>
      <table class="rsk-tablo">
        <colgroup>
          <!-- Kullanıcı isteği: "düzey kolnunu buna göre daralt" -- Düzey
               artık kısaltma (T.G. vb.) bastığından 8%'den 4%'e daraltıldı;
               açılan yer Tehlike/Risk metin kolonlarına verildi. -->
          <col style="width:6%"><col style="width:8%"><col style="width:9%"><col style="width:14%">
          <col style="width:16%"><col style="width:4%"><col style="width:4%"><col style="width:6%">
          <col style="width:4%"><col style="width:4%"><col style="width:6%"><col style="width:7%">
          <col style="width:6%"><col style="width:6%">
        </colgroup>
        <thead>${_riskTabloBasligiHtml()}</thead>
        <tbody>${parca.map(_riskSatirHtml).join('')}</tbody>
      </table>
    </div>
  `).join('');
}

async function riskRaporuPdfOlustur(hazirlayanAdi) {
  const filtreler = { bolum: document.getElementById('bolumFiltre').value };
  const risklerHam = riskleriGetir(document.getElementById('aramaKutusu').value, filtreler);
  if (!risklerHam.length) {
    alert('Seçili filtreler için PDF oluşturulacak risk kaydı yok.');
    return;
  }
  // fotoOncesi/fotoSonrasi ayrı Firestore belgelerine referans (fotoref:...)
  // olabilir; PDF'e gömmeden önce gerçek görsel verisine çözülür.
  const riskler = await Promise.all(risklerHam.map(async r => Object.assign({}, r, {
    fotoOncesi: await fotoBuyukCoz(r.fotoOncesi),
    fotoSonrasi: await fotoBuyukCoz(r.fotoSonrasi)
  })));
  // Farklı yöntemlerin (Fine-Kinney/5x5 Matris) ham RP değerleri kıyaslanamaz olduğundan
  // önce ortak ciddiyet sırasına, eşitlikte kendi ölçeği içindeki göreli puana göre sıralanır.
  riskler.sort((a, b) => {
    const siraFarki = riskSeviyesiSirasi(b.duzey1) - riskSeviyesiSirasi(a.duzey1);
    if (siraFarki !== 0) return siraFarki;
    const goreliPuan = r => r.RP1 / (r.yontem === '5x5' ? 25 : 1000);
    return goreliPuan(b) - goreliPuan(a);
  });

  const firma = aktifFirmaGetir();
  const bugun = gunAyYil(_bugun());
  const ozet = riskOzetiHesapla();

  const html = `
  <div id="rskPdfKok">
    <style>${_RSK_PDF_STIL}</style>

    <div class="rsk-kapak">
      <div class="rsk-kapak-fa">${formAyarlariKutusuHtml('risk', null, false, null, true)}</div>
      <div class="rsk-kapak-kutu">
        <div class="rsk-firma">${_riskCiktiKacir(firma ? firma.ad : '')}</div>
        <h1>RİSK DEĞERLENDİRME RAPORU${filtreler.bolum ? '<br><span style="font-size:12pt;">' + _riskCiktiKacir(filtreler.bolum) + '</span>' : ''}</h1>
        <div class="rsk-tarih">Rapor Tarihi: ${bugun}</div>
      </div>
    </div>

    ${_riskYontemBolumuHtml(riskler)}

    <div class="rsk-liste-ustbilgi">
      <h1>RİSK LİSTESİ</h1>
      <div class="rsk-liste-istatistik">
        <div><b>${ozet.toplam}</b>Toplam</div>
        <div><b>${ozet.acik}</b>Açık</div>
        <div><b>${ozet.gecikmis}</b>Gecikmiş</div>
        <div><b>${ozet.onemliVeUstu}</b>Önemli+</div>
      </div>
    </div>
    ${_riskDuzeyKisaltmaAciklamaHtml()}

    ${_riskTabloParcalariHtml(riskler, 15)}

    <div class="rsk-imza">
      <div><b>Hazırlayan:</b> ${_riskCiktiKacir(hazirlayanAdi) || '_____________________'}</div>
      <div><b>İmza:</b> _____________________</div>
      <div><b>Tarih:</b> ${bugun}</div>
    </div>
  </div>
  `;

  const mount = document.getElementById('yazdirmaAlani');
  mount.innerHTML = html;
  mount.style.display = 'block';

  const worker = html2pdf()
    .set({
      margin: [7, 7, 10, 7],
      filename: `Risk_Degerlendirme_Raporu_${bugun.replace(/\./g, '-')}.pdf`,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollX: 0, scrollY: 0 },
      jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4', compress: true },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['tr'] }
    })
    .from(mount)
    .toPdf();

  const pdf = await worker.get('pdf');
  const toplamSayfa = pdf.internal.getNumberOfPages();
  const genislik = pdf.internal.pageSize.getWidth();
  const yukseklik = pdf.internal.pageSize.getHeight();
  for (let i = 1; i <= toplamSayfa; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(100);
    pdf.text(`Sayfa ${i} / ${toplamSayfa}`, genislik / 2, yukseklik - 5, { align: 'center' });
  }
  await worker.save();

  mount.innerHTML = '';
  mount.style.display = 'none';
}

// ==================== PPTX ====================
// Eski isg platformundaki risk-defteri aracının PPTX çıktısıyla aynı kalıp:
// kapak + genel özet + risk başına bir slayt (öncesi/sonrası fotoğraflı).

async function riskPptxOlustur() {
  const filtreler = { bolum: document.getElementById('bolumFiltre').value };
  const risklerHam = riskleriGetir(document.getElementById('aramaKutusu').value, filtreler);
  if (!risklerHam.length) {
    alert('Seçili filtreler için sunum oluşturulacak risk kaydı yok.');
    return;
  }
  const riskler = await Promise.all(risklerHam.map(async r => Object.assign({}, r, {
    fotoOncesi: await fotoBuyukCoz(r.fotoOncesi),
    fotoSonrasi: await fotoBuyukCoz(r.fotoSonrasi)
  })));
  // Farklı yöntemlerin (Fine-Kinney/5x5 Matris) ham RP değerleri kıyaslanamaz olduğundan
  // önce ortak ciddiyet sırasına, eşitlikte kendi ölçeği içindeki göreli puana göre sıralanır.
  riskler.sort((a, b) => {
    const siraFarki = riskSeviyesiSirasi(b.duzey1) - riskSeviyesiSirasi(a.duzey1);
    if (siraFarki !== 0) return siraFarki;
    const goreliPuan = r => r.RP1 / (r.yontem === '5x5' ? 25 : 1000);
    return goreliPuan(b) - goreliPuan(a);
  });

  const firma = aktifFirmaGetir();
  const baslik = 'RİSK DEĞERLENDİRME' + (filtreler.bolum ? ' – ' + filtreler.bolum : '');

  const pptx = new PptxGenJS();
  pptx.author = (firma && firma.ad) || 'İSG Yönetim Platformu';
  pptx.company = (firma && firma.ad) || '';
  pptx.title = baslik;

  // Kapak
  {
    const s = pptx.addSlide();
    s.background = { fill: '0B2C52' };
    s.addText((firma && firma.ad) || '', { x: 1, y: 1.5, fontSize: 32, bold: true, color: 'FFFFFF' });
    s.addText(baslik, { x: 1, y: 2.4, fontSize: 20, color: 'FFFFFF' });
    s.addText(`Toplam Risk: ${riskler.length}`, { x: 1, y: 3.3, fontSize: 14, color: 'FFFFFF' });
    s.addText(`Tarih: ${gunAyYil(_bugun())}`, { x: 1, y: 3.8, fontSize: 12, color: 'FFFFFF' });
  }

  // Özet
  {
    const s = pptx.addSlide();
    const sayac = (etiket) => riskler.filter(r => r.duzey1 === etiket).length;
    s.addText('GENEL ÖZET', { x: 0.8, y: 0.5, fontSize: 22, bold: true });
    const satirlar = [
      `Toplam Risk: ${riskler.length}`,
      `Tolerans Gösterilemez: ${sayac('Tolerans Gösterilemez')}`,
      `Esaslı Risk: ${sayac('Esaslı Risk')}`,
      `Önemli Risk: ${sayac('Önemli Risk')}`,
      `Olası Risk: ${sayac('Olası Risk')}`,
      `Önemsiz Risk: ${sayac('Önemsiz Risk')}`
    ];
    s.addText(satirlar.join('\n'), { x: 0.8, y: 1.5, w: 6.8, fontSize: 15, lineSpacing: 28, valign: 'top' });
  }

  // Risk slaytları
  riskler.forEach(r => {
    const s = pptx.addSlide();
    s.addText(`RİSK – ${r.riskNo}`, { x: 0.5, y: 0.3, fontSize: 18, bold: true });
    s.addText(
      `Bölüm: ${r.bolum || '-'}\nYer: ${r.yer || '-'}\nFaaliyet: ${r.faaliyet || '-'}\nTehlike: ${r.tehlike || '-'}\n\nRisk: ${r.risk || '-'}`,
      { x: 0.5, y: 1.2, w: 5.8, fontSize: 13 }
    );
    s.addText(`RP1: ${r.RP1}\n${r.duzey1}`, { x: 6.3, y: 1.0, fontSize: 14, bold: true });
    s.addText(`Sorumlu: ${r.sorumlu || '-'}\nTermin: ${gunAyYil(r.termin) || '-'}`, { x: 6.3, y: 2.2, fontSize: 12 });

    const renkler = { 'Açık': 'dc2626', 'Devam Ediyor': 'f59e0b', 'Kapalı': '16a34a', 'Gecikmiş': 'dc2626', 'İptal': '9ca3af' };
    s.addText((r.durumGoruntu || '-').toUpperCase(), {
      x: 7.3, y: 4.6, w: 2.2, h: 0.6,
      align: 'center', valign: 'middle',
      fontSize: 18, bold: true, color: 'FFFFFF', fill: renkler[r.durumGoruntu] || '9ca3af', rectRadius: 0.15
    });

    if (r.fotoOncesi) s.addImage(/^https?:\/\//i.test(r.fotoOncesi) ? { path: r.fotoOncesi, x: 0.5, y: 3.2, w: 3.2, h: 1.8 } : { data: r.fotoOncesi, x: 0.5, y: 3.2, w: 3.2, h: 1.8 });
    if (r.fotoSonrasi) s.addImage(/^https?:\/\//i.test(r.fotoSonrasi) ? { path: r.fotoSonrasi, x: 4.0, y: 3.2, w: 3.2, h: 1.8 } : { data: r.fotoSonrasi, x: 4.0, y: 3.2, w: 3.2, h: 1.8 });
  });

  await pptx.writeFile({ fileName: `Risk_Degerlendirme_${gunAyYil(_bugun()).replace(/\./g, '-')}.pptx` });
}

// ==================== CHECKLIST (saha kontrolü) ====================
// Mevcut risklerin sahadaki durumunun kontrolü için kullanılan, RP1'e göre
// azalan sırada, boş "Kontrol" sütunlu form — eski isg platformundaki
// risk-defteri Checklist özelliğiyle aynı mantık.

function _riskChecklistListesiHazirla() {
  const filtreler = { bolum: document.getElementById('bolumFiltre').value };
  const riskler = riskleriGetir(document.getElementById('aramaKutusu').value, filtreler);
  return riskler.slice().sort((a, b) => b.RP1 - a.RP1);
}

function riskChecklistExcelOlustur() {
  const sirali = _riskChecklistListesiHazirla();
  if (!sirali.length) {
    alert('Seçili filtreler için checklist oluşturulacak risk kaydı yok.');
    return;
  }
  const firma = aktifFirmaGetir();
  const bolum = document.getElementById('bolumFiltre').value || 'Tüm Bölümler';

  xlsxHazirOlduğunda(() => {
    const ustBilgiSatirlari = [
      ['BÖLÜM', bolum],
      ['KONTROL TARİHİ', ''],
      ['KONTROL EDEN', ''],
      ['AMAÇ', 'Mevcut risklerin sahadaki durumunun kontrolü'],
      ['NOT', 'Uygun Değil veya Kısmen işaretlenen her madde açıklanacaktır.'],
      []
    ];
    const basliklar = ['Sıra', 'Risk No', 'Yer / Ekipman', 'Faaliyet', 'Tehlike', 'Risk', 'RP1',
      'Mevcut Önlemler', 'Kontrol Sonucu (Uygun / Uygun Değil)', 'Önlem Uygulanıyor mu (E / H / Kısmen)',
      'Uygunsuzluk Var mı (E / H)', 'Açıklama'];
    const satirlar = sirali.map((r, i) => [i + 1, r.riskNo, r.yer, r.faaliyet, r.tehlike, r.risk, r.RP1, r.onlem, '', '', '', '']);

    const ws = XLSX.utils.aoa_to_sheet([...ustBilgiSatirlari, basliklar, ...satirlar]);
    ws['!cols'] = [{ wch: 6 }, { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 8 }, { wch: 35 }, { wch: 26 }, { wch: 32 }, { wch: 24 }, { wch: 40 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'RISK_CHECKLIST');
    XLSX.writeFile(wb, `Risk_Checklist_${((firma && firma.ad) || 'Firma').replace(/\s+/g, '_')}_${bolum.replace(/\s+/g, '_')}.xlsx`);
  });
}

async function riskChecklistPdfOlustur() {
  const sirali = _riskChecklistListesiHazirla();
  if (!sirali.length) {
    alert('Seçili filtreler için checklist oluşturulacak risk kaydı yok.');
    return;
  }
  const firma = aktifFirmaGetir();
  const bolum = document.getElementById('bolumFiltre').value || 'Tüm Bölümler';
  const bugun = gunAyYil(_bugun());

  const html = `
  <div id="rskChecklistKok">
    <style>
      #rskChecklistKok{ font-family: Arial, Helvetica, sans-serif; color:#111827; background:#fff; width:100%; font-size:9pt; }
      #rskChecklistKok *{ box-sizing:border-box; }
      #rskChecklistKok .fa-kutu{ border-collapse:collapse; font-size:7pt; width:42mm; table-layout:fixed; }
      #rskChecklistKok .fa-kutu td{ padding:1.5px 4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      #rskChecklistKok .fa-kutu td:first-child{ font-weight:700; background:#f1f5f9; width:48%; }
      #rskChecklistKok .cl-ustsatir{ display:flex; justify-content:space-between; align-items:flex-start; gap:4mm; margin-bottom:3mm; }
      #rskChecklistKok .cl-baslik{ text-align:center; font-weight:800; font-size:15pt; margin-bottom:2mm; }
      #rskChecklistKok .cl-firma{ text-align:center; font-weight:600; font-size:11pt; color:#334155; margin-bottom:5mm; }
      #rskChecklistKok .cl-bilgi{ display:flex; justify-content:space-between; flex-wrap:wrap; gap:3mm; border:1px solid #94a3b8; padding:3mm 4mm; font-size:9.5pt; margin-bottom:4mm; }
      #rskChecklistKok .cl-talimat{ border:1px solid #94a3b8; padding:3mm 4mm; font-size:9pt; margin-bottom:4mm; }
      #rskChecklistKok table.cl-tablo{ width:100%; border-collapse:collapse; table-layout:fixed; }
      #rskChecklistKok table.cl-tablo th{ background:#e5e7eb; color:#111827; border:1px solid #333; padding:4px; font-size:8.5pt; }
      #rskChecklistKok table.cl-tablo td{ border:1px solid #94a3b8; padding:4px; font-size:8.5pt; overflow-wrap:anywhere; }
      #rskChecklistKok table.cl-tablo tr{ page-break-inside:avoid; }
      #rskChecklistKok .cl-imza{ margin-top:6mm; border-top:1px solid #94a3b8; padding-top:4mm; display:flex; justify-content:space-between; flex-wrap:wrap; gap:4mm; font-size:9.5pt; }
    </style>

    <div class="cl-ustsatir">
      <div style="flex:1;">
        <div class="cl-baslik">İSG RİSK KONTROL CHECKLIST</div>
        <div class="cl-firma">${_riskCiktiKacir(firma ? firma.ad : '')}</div>
      </div>
      ${formAyarlariKutusuHtml('risk')}
    </div>

    <div class="cl-bilgi">
      <div><b>Bölüm:</b> ${_riskCiktiKacir(bolum)}</div>
      <div><b>Kontrol Tarihi:</b> ______________</div>
      <div><b>Rapor Tarihi:</b> ${bugun}</div>
    </div>

    <div class="cl-talimat">
      <b>Talimat:</b> Bu form, mevcut risklerin sahadaki durumunun kontrolü amacıyla kullanılır.
      "Uygun Değil" veya "Kısmen" işaretlenen her madde için açıklama yazılması zorunludur.
    </div>

    <table class="cl-tablo">
      <colgroup>
        <col style="width:4%"><col style="width:9%"><col style="width:13%"><col style="width:13%">
        <col style="width:12%"><col style="width:15%"><col style="width:6%"><col style="width:16%"><col style="width:12%">
      </colgroup>
      <thead>
        <tr>
          <th>#</th><th>Risk No</th><th>Yer / Ekipman</th><th>Faaliyet</th><th>Tehlike</th>
          <th>Risk</th><th>RP1</th><th>Mevcut Önlem</th><th>Kontrol / Not</th>
        </tr>
      </thead>
      <tbody>
        ${sirali.map((r, i) => `
          <tr>
            <td style="text-align:center;">${i + 1}</td>
            <td>${_riskCiktiKacir(r.riskNo)}</td>
            <td>${_riskCiktiKacir(r.yer)}</td>
            <td>${_riskCiktiKacir(r.faaliyet)}</td>
            <td>${_riskCiktiKacir(r.tehlike)}</td>
            <td>${_riskCiktiKacir(r.risk)}</td>
            <td style="text-align:center; font-weight:700;">${r.RP1}</td>
            <td>${_riskCiktiKacir(r.onlem) || '-'}</td>
            <td style="height:14mm;"></td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="cl-imza">
      <div><b>Kontrol Eden:</b> _____________________</div>
      <div><b>İmza:</b> _____________________</div>
      <div><b>Tarih:</b> ____ / ____ / ______</div>
    </div>
  </div>
  `;

  const mount = document.getElementById('yazdirmaAlani');
  mount.innerHTML = html;
  mount.style.display = 'block';

  await html2pdf()
    .set({
      margin: [8, 8, 8, 8],
      filename: `Risk_Checklist_${((firma && firma.ad) || 'Firma').replace(/\s+/g, '_')}_${bolum.replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollX: 0, scrollY: 0 },
      jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4', compress: true },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['tr'] }
    })
    .from(mount)
    .save();

  mount.innerHTML = '';
  mount.style.display = 'none';
}
