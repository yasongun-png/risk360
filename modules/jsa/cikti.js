// İş Güvenliği Analizi (JSA) — PDF/Word rapor çıktıları.
// PDF: modules/olay-kaza/cikti.js ile aynı html2pdf.js kalıbı (üstbilgi:
// logo/başlık/form ayarları kutusu — bkz. .jr-form-ustbilgi). Word:
// modules/acil-durum/kontrol-formu-cikti.js ile aynı docx.js kalıbı
// (fotoğraf/imza görselleri ImageRun ile gömülür).

function _jrKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function _jrRiskRengiHex(duzey) {
  const etiket = duzey && duzey.etiket;
  if (etiket === 'Tolerans Gösterilemez' || etiket === 'Esaslı Risk') return '#b91c1c';
  if (etiket === 'Önemli Risk') return '#b45309';
  if (etiket === 'Olası Risk') return '#1d4ed8';
  return '#15803d';
}

const _JR_PDF_STIL = `
  #jsaRaporuPdf{ font-family:"Segoe UI", Arial, sans-serif; color:#111827; background:#fff; width:210mm; margin:0 auto; padding:10mm 12mm 12mm; }
  #jsaRaporuPdf *{ box-sizing:border-box; }
  #jsaRaporuPdf .jr-form-ustbilgi{ display:flex; align-items:stretch; border:2px solid #111827; margin-bottom:4mm; background:#fff; }
  #jsaRaporuPdf .jr-form-ustbilgi > div{ padding:3mm; display:flex; align-items:center; justify-content:center; border-right:2px solid #111827; background:#fff; }
  #jsaRaporuPdf .jr-form-ustbilgi > div:last-child{ border-right:none; }
  #jsaRaporuPdf .jr-form-logo{ flex:0 0 28mm; width:28mm; text-align:center; color:#111827; font-size:8pt; font-weight:700; }
  #jsaRaporuPdf .jr-form-logo img{ max-width:24mm; max-height:16mm; }
  #jsaRaporuPdf .jr-form-baslik{ flex:1 1 auto; min-width:0; text-align:center; font-size:13pt; font-weight:900; color:#111827; line-height:1.3; }
  #jsaRaporuPdf .jr-form-fa{ flex:0 0 42mm; width:42mm; padding:2mm !important; align-items:stretch !important; }
  #jsaRaporuPdf .fa-kutu{ border-collapse:collapse; font-size:6.8pt; width:100%; table-layout:fixed; }
  #jsaRaporuPdf .fa-kutu td{ padding:1.5px 4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  #jsaRaporuPdf .fa-kutu td:first-child{ font-weight:700; background:#fff; width:48%; }
  #jsaRaporuPdf .jr-bolum-baslik{ margin:4mm 0 1.5mm; color:#111827; font-size:12.5px; font-weight:900; page-break-after:avoid; }
  #jsaRaporuPdf table.jr-tablo{ width:100%; border-collapse:collapse; border:1px solid #111827; table-layout:fixed; font-size:9.5px; line-height:1.35; margin-bottom:3mm; page-break-inside:avoid; }
  #jsaRaporuPdf table.jr-tablo th, #jsaRaporuPdf table.jr-tablo td{ border:1px solid #111827; padding:1.6mm 2.2mm; vertical-align:top; color:#111827; overflow-wrap:break-word; }
  #jsaRaporuPdf table.jr-tablo .lbl{ width:20%; background:#f1f5f9; font-weight:700; }
  #jsaRaporuPdf table.jr-tablo thead th{ background:#e5e7eb; font-weight:800; }
  #jsaRaporuPdf .jr-adim-kutu{ border:1px solid #111827; margin-bottom:3mm; page-break-inside:avoid; }
  #jsaRaporuPdf .jr-adim-baslik{ background:#111827; color:#fff; padding:2mm 3mm; font-size:10.5px; font-weight:800; }
  #jsaRaporuPdf .jr-risk-rozet{ display:inline-block; padding:0.5mm 1.5mm; border-radius:3px; font-size:8.5px; font-weight:700; color:#fff; }
  #jsaRaporuPdf .jr-hazirlik-liste{ margin:0 0 3mm; padding-left:5mm; font-size:9.5px; line-height:1.5; }
  #jsaRaporuPdf .jr-imza-satir{ display:flex; gap:8mm; margin-top:6mm; page-break-inside:avoid; }
  #jsaRaporuPdf .jr-imza-kutu{ flex:1; min-height:22mm; text-align:center; border-top:1px solid #111827; padding-top:2mm; }
  #jsaRaporuPdf .jr-imza-kutu img{ max-height:14mm; display:block; margin:0 auto 1mm; }
  #jsaRaporuPdf .jr-imza-kutu b{ display:block; font-size:9.5px; }
  #jsaRaporuPdf .jr-imza-kutu span{ font-size:8.5px; color:#4b5563; }
  #jsaRaporuPdf .jr-foto{ max-width:60mm; max-height:45mm; display:block; margin:2mm 0; }
`;

function _jrAlanSatiri(etiket1, deger1, etiket2, deger2) {
  return `<tr>
    <td class="lbl">${_jrKacir(etiket1)}</td><td>${_jrKacir(deger1) || '-'}</td>
    <td class="lbl">${_jrKacir(etiket2)}</td><td>${_jrKacir(deger2) || '-'}</td>
  </tr>`;
}

function _jrRiskRozetPdf(tehlike) {
  const puan = jsaTehlikeRiskPuaniHesapla(tehlike);
  if (puan == null) return '-';
  const duzey = riskDuzeyiGetir(puan, 'Fine-Kinney');
  return `<span class="jr-risk-rozet" style="background:${_jrRiskRengiHex(duzey)};">${_jrKacir(duzey.etiket)} (${puan})</span>`;
}

async function jsaRaporuPdfOlustur(kayit, firma) {
  const bugun = gunAyYil(bugunIso());
  const genelFotoDataUrl = kayit.genelFotoUrl ? await fotoBuyukCoz(kayit.genelFotoUrl) : null;

  const adimlarHtml = kayit.adimlar.map((adim, i) => `
    <div class="jr-adim-kutu">
      <div class="jr-adim-baslik">${String(i + 1).padStart(2, '0')} — ${_jrKacir(adim.eylem) || '(iş adımı boş)'}</div>
      ${adim.tehlikeler.length ? `
      <table class="jr-tablo" style="border:none; margin-bottom:0;">
        <thead><tr><th style="width:26%;">Tehlike</th><th style="width:10%;">Olasılık</th><th style="width:10%;">Frekans</th><th style="width:10%;">Şiddet</th><th style="width:14%;">Risk</th><th style="width:30%;">Kontroller / Önlemler</th></tr></thead>
        <tbody>
          ${adim.tehlikeler.map(t => `<tr>
            <td>${_jrKacir(t.tehlike) || '-'}</td>
            <td>${_jrKacir(t.olasilik) || '-'}</td>
            <td>${_jrKacir(t.frekans) || '-'}</td>
            <td>${_jrKacir(t.siddet) || '-'}</td>
            <td>${_jrRiskRozetPdf(t)}</td>
            <td>${_jrKacir(t.kontroller) || '-'}</td>
          </tr>`).join('')}
        </tbody>
      </table>` : `<p style="font-size:9.5px; color:#6b7280; padding:2mm 3mm;">Bu adım için tehlike tanımlanmadı.</p>`}
    </div>
  `).join('');

  const aksiyonlarHtml = kayit.aksiyonlar.length ? `
    <div class="jr-bolum-baslik">Takip Aksiyonları</div>
    <table class="jr-tablo">
      <thead><tr><th style="width:50%;">Aksiyon</th><th style="width:25%;">Sorumlu</th><th style="width:25%;">Termin</th></tr></thead>
      <tbody>${kayit.aksiyonlar.map(a => `<tr><td>${_jrKacir(a.baslik) || '-'}</td><td>${_jrKacir(a.sorumlu) || '-'}</td><td>${_jrKacir(gunAyYil(a.termin)) || '-'}</td></tr>`).join('')}</tbody>
    </table>
  ` : '';

  const html = `
  <div id="jsaRaporuPdf">
    <style>${_JR_PDF_STIL}</style>
    <div class="jr-form-ustbilgi">
      <div class="jr-form-logo">${firma && firmaLogoGetir(firma.id) ? `<img src="${firmaLogoGetir(firma.id)}">` : 'LOGO YOK'}</div>
      <div class="jr-form-baslik">İŞ GÜVENLİĞİ ANALİZİ (JSA)</div>
      <div class="jr-form-fa">${formAyarlariKutusuHtml('jsa')}</div>
    </div>

    <table class="jr-tablo">
      ${_jrAlanSatiri('Kayıt No', kayit.kayitNo, 'Rapor Tarihi', bugun)}
      ${_jrAlanSatiri('İşletme', kayit.isletme, 'Tarih / Revizyon', [kayit.tarih ? gunAyYil(kayit.tarih) : '', kayit.revizyon].filter(Boolean).join(' / '))}
      ${_jrAlanSatiri('Değerlendirilen İş', kayit.degerlendirilenIs, 'Alan / Ekipman', kayit.alanEkipman)}
      ${_jrAlanSatiri('İşi Yapan Ekip', kayit.isiYapanEkip, 'Değerlendirme Ekibi', kayit.degerlendirmeEkibi)}
      <tr><td class="lbl">Kapsam</td><td colspan="3">${_jrKacir(kayit.kapsam) || '-'}</td></tr>
    </table>

    ${kayit.hazirlikKanitlari.length ? `
    <div class="jr-bolum-baslik">Hazırlık Kanıtı</div>
    <ul class="jr-hazirlik-liste">${kayit.hazirlikKanitlari.map(h => `<li>${_jrKacir(h)}</li>`).join('')}</ul>` : ''}

    ${genelFotoDataUrl ? `<div class="jr-bolum-baslik">İşin Genel Fotoğrafı</div><img class="jr-foto" src="${genelFotoDataUrl}">` : ''}

    <div class="jr-bolum-baslik">Görev, Tehlikeler, Riskler ve Kontroller</div>
    ${adimlarHtml || '<p style="font-size:9.5px; color:#6b7280;">İş adımı tanımlanmadı.</p>'}

    ${aksiyonlarHtml}

    <div class="jr-imza-satir">
      <div class="jr-imza-kutu">
        ${kayit.imzalar.hazirlayan && kayit.imzalar.hazirlayan.imzaUrl ? `<img src="${kayit.imzalar.hazirlayan.imzaUrl}">` : ''}
        <b>${_jrKacir((kayit.imzalar.hazirlayan && kayit.imzalar.hazirlayan.ad) || kayit.hazirlayanAdi) || '-'}</b>
        <span>Hazırlayan</span>
      </div>
      <div class="jr-imza-kutu">
        ${kayit.imzalar.onaylayan && kayit.imzalar.onaylayan.imzaUrl ? `<img src="${kayit.imzalar.onaylayan.imzaUrl}">` : ''}
        <b>${_jrKacir((kayit.imzalar.onaylayan && kayit.imzalar.onaylayan.ad) || kayit.onaylayanAdi) || '-'}</b>
        <span>Onaylayan</span>
      </div>
    </div>
  </div>
  `;

  const mount = document.getElementById('yazdirmaAlani');
  mount.innerHTML = html;
  mount.style.display = 'block';

  await html2pdf()
    .set({
      margin: [8, 0, 8, 0],
      filename: `JSA_${(kayit.kayitNo || 'Taslak').replace(/[\\/]/g, '-')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollX: 0, scrollY: 0 },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4', compress: true },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', 'p', 'table.jr-tablo', '.jr-adim-kutu', '.jr-imza-satir'] }
    })
    .from(mount)
    .save();

  mount.innerHTML = '';
  mount.style.display = 'none';
}

// ---- Word (docx.js) ----

function _jrWordBaslik(metin, seviye) {
  return new docx.Paragraph({
    heading: seviye || docx.HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 100 },
    children: [new docx.TextRun({ text: metin, bold: true, color: '000000' })]
  });
}

function _jrWordHucre(metin, baslikMi, genislikYuzde) {
  return new docx.TableCell({
    width: genislikYuzde ? { size: genislikYuzde, type: docx.WidthType.PERCENTAGE } : undefined,
    shading: baslikMi ? { fill: 'E5E7EB' } : undefined,
    children: [new docx.Paragraph({ children: [new docx.TextRun({ text: String(metin ?? '') || '-', bold: !!baslikMi, size: 18 })] })]
  });
}

async function _jrGorseWordVerisiGetir(url) {
  if (!url) return null;
  try {
    const cozulmus = await fotoBuyukCoz(url);
    if (!cozulmus) return null;
    const yanit = await fetch(cozulmus);
    const blob = await yanit.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const olcu = await new Promise((coz, red) => {
      const img = new Image();
      img.onload = () => coz({ genislik: img.naturalWidth, yukseklik: img.naturalHeight });
      img.onerror = red;
      img.src = URL.createObjectURL(blob);
    });
    const MAKS_GENISLIK = 260;
    const oran = olcu.genislik > MAKS_GENISLIK ? MAKS_GENISLIK / olcu.genislik : 1;
    return { veri: new Uint8Array(arrayBuffer), genislik: Math.round(olcu.genislik * oran), yukseklik: Math.round(olcu.yukseklik * oran) };
  } catch (e) {
    console.error('JSA görseli Word belgesine eklenemedi:', e);
    return null;
  }
}

// imzaUrl zaten data: URL (bkz. ui.js jsaImzaVeriUret) — fotoBuyukCoz'a
// gerek yok, doğrudan çözülür.
async function _jrImzaWordVerisiGetir(dataUrl) {
  if (!dataUrl) return null;
  try {
    const yanit = await fetch(dataUrl);
    const blob = await yanit.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const olcu = await new Promise((coz, red) => {
      const img = new Image();
      img.onload = () => coz({ genislik: img.naturalWidth, yukseklik: img.naturalHeight });
      img.onerror = red;
      img.src = URL.createObjectURL(blob);
    });
    const MAKS_GENISLIK = 200;
    const oran = olcu.genislik > MAKS_GENISLIK ? MAKS_GENISLIK / olcu.genislik : 1;
    return { veri: new Uint8Array(arrayBuffer), genislik: Math.round(olcu.genislik * oran), yukseklik: Math.round(olcu.yukseklik * oran) };
  } catch (e) {
    console.error('İmza görseli Word belgesine eklenemedi:', e);
    return null;
  }
}

async function jsaRaporuWordOlustur(kayit, firma) {
  const bugun = gunAyYil(bugunIso());

  const genelBilgiTablosu = new docx.Table({
    width: { size: 100, type: docx.WidthType.PERCENTAGE },
    rows: [
      new docx.TableRow({ children: [_jrWordHucre('Kayıt No', true, 20), _jrWordHucre(kayit.kayitNo, false, 30), _jrWordHucre('Rapor Tarihi', true, 20), _jrWordHucre(bugun, false, 30)] }),
      new docx.TableRow({ children: [_jrWordHucre('İşletme', true, 20), _jrWordHucre(kayit.isletme, false, 30), _jrWordHucre('Tarih / Revizyon', true, 20), _jrWordHucre([kayit.tarih ? gunAyYil(kayit.tarih) : '', kayit.revizyon].filter(Boolean).join(' / '), false, 30)] }),
      new docx.TableRow({ children: [_jrWordHucre('Değerlendirilen İş', true, 20), _jrWordHucre(kayit.degerlendirilenIs, false, 30), _jrWordHucre('Alan / Ekipman', true, 20), _jrWordHucre(kayit.alanEkipman, false, 30)] }),
      new docx.TableRow({ children: [_jrWordHucre('İşi Yapan Ekip', true, 20), _jrWordHucre(kayit.isiYapanEkip, false, 30), _jrWordHucre('Değerlendirme Ekibi', true, 20), _jrWordHucre(kayit.degerlendirmeEkibi, false, 30)] })
    ]
  });

  const cocuklar = [
    new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { after: 100 }, children: [new docx.TextRun({ text: 'İŞ GÜVENLİĞİ ANALİZİ (JSA)', bold: true, size: 32 })] }),
    new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { after: 200 }, children: [new docx.TextRun({ text: `${firma && firma.ad || ''}   |   Düzenleme Tarihi: ${bugun}`, size: 20 })] }),
    genelBilgiTablosu
  ];

  if (kayit.kapsam) {
    cocuklar.push(_jrWordBaslik('Kapsam'));
    cocuklar.push(new docx.Paragraph({ spacing: { after: 160 }, children: [new docx.TextRun({ text: kayit.kapsam })] }));
  }

  if (kayit.hazirlikKanitlari.length) {
    cocuklar.push(_jrWordBaslik('Hazırlık Kanıtı'));
    kayit.hazirlikKanitlari.forEach(h => cocuklar.push(new docx.Paragraph({ bullet: { level: 0 }, children: [new docx.TextRun({ text: h })] })));
  }

  const genelFoto = await _jrGorseWordVerisiGetir(kayit.genelFotoUrl);
  if (genelFoto) {
    cocuklar.push(_jrWordBaslik('İşin Genel Fotoğrafı'));
    cocuklar.push(new docx.Paragraph({ spacing: { after: 200 }, children: [new docx.ImageRun({ data: genelFoto.veri, transformation: { width: genelFoto.genislik, height: genelFoto.yukseklik } })] }));
  }

  cocuklar.push(_jrWordBaslik('Görev, Tehlikeler, Riskler ve Kontroller', docx.HeadingLevel.HEADING_1));
  kayit.adimlar.forEach((adim, i) => {
    cocuklar.push(new docx.Paragraph({
      spacing: { before: 160, after: 80 },
      shading: { fill: 'F3F4F6' },
      children: [new docx.TextRun({ text: `${String(i + 1).padStart(2, '0')} — ${adim.eylem || '(iş adımı boş)'}`, bold: true, size: 22 })]
    }));
    if (!adim.tehlikeler.length) {
      cocuklar.push(new docx.Paragraph({ spacing: { after: 120 }, children: [new docx.TextRun({ text: 'Bu adım için tehlike tanımlanmadı.', italics: true, size: 18 })] }));
      return;
    }
    cocuklar.push(new docx.Table({
      width: { size: 100, type: docx.WidthType.PERCENTAGE },
      rows: [
        new docx.TableRow({ children: [_jrWordHucre('Tehlike', true), _jrWordHucre('Olasılık', true), _jrWordHucre('Frekans', true), _jrWordHucre('Şiddet', true), _jrWordHucre('Risk', true), _jrWordHucre('Kontroller / Önlemler', true)] }),
        ...adim.tehlikeler.map(t => {
          const puan = jsaTehlikeRiskPuaniHesapla(t);
          const duzeyMetni = puan == null ? '-' : `${riskDuzeyiGetir(puan, 'Fine-Kinney').etiket} (${puan})`;
          return new docx.TableRow({ children: [_jrWordHucre(t.tehlike), _jrWordHucre(t.olasilik), _jrWordHucre(t.frekans), _jrWordHucre(t.siddet), _jrWordHucre(duzeyMetni), _jrWordHucre(t.kontroller)] });
        })
      ]
    }));
  });

  if (kayit.aksiyonlar.length) {
    cocuklar.push(_jrWordBaslik('Takip Aksiyonları', docx.HeadingLevel.HEADING_1));
    cocuklar.push(new docx.Table({
      width: { size: 100, type: docx.WidthType.PERCENTAGE },
      rows: [
        new docx.TableRow({ children: [_jrWordHucre('Aksiyon', true), _jrWordHucre('Sorumlu', true), _jrWordHucre('Termin', true)] }),
        ...kayit.aksiyonlar.map(a => new docx.TableRow({ children: [_jrWordHucre(a.baslik), _jrWordHucre(a.sorumlu), _jrWordHucre(gunAyYil(a.termin))] }))
      ]
    }));
  }

  const hazirlayanFoto = await _jrImzaWordVerisiGetir(kayit.imzalar.hazirlayan && kayit.imzalar.hazirlayan.imzaUrl);
  const onaylayanFoto = await _jrImzaWordVerisiGetir(kayit.imzalar.onaylayan && kayit.imzalar.onaylayan.imzaUrl);

  cocuklar.push(_jrWordBaslik('Onay', docx.HeadingLevel.HEADING_1));
  const imzaHucre = (etiket, ad, foto) => new docx.TableCell({
    borders: { top: { style: docx.BorderStyle.SINGLE, size: 4, color: 'CBD5E1' }, bottom: { style: docx.BorderStyle.SINGLE, size: 4, color: 'CBD5E1' }, left: { style: docx.BorderStyle.SINGLE, size: 4, color: 'CBD5E1' }, right: { style: docx.BorderStyle.SINGLE, size: 4, color: 'CBD5E1' } },
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
    children: [
      new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { after: 80 }, children: [new docx.TextRun({ text: etiket.toLocaleUpperCase('tr'), bold: true, size: 18 })] }),
      ...(foto ? [new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { after: 60 }, children: [new docx.ImageRun({ data: foto.veri, transformation: { width: foto.genislik, height: foto.yukseklik } })] })] : []),
      new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { after: 0 }, children: [new docx.TextRun({ text: ad || '________________________', size: 18 })] })
    ]
  });
  cocuklar.push(new docx.Table({
    width: { size: 100, type: docx.WidthType.PERCENTAGE },
    rows: [new docx.TableRow({ height: { value: 1360, rule: docx.HeightRule.ATLEAST }, children: [
      imzaHucre('Hazırlayan', (kayit.imzalar.hazirlayan && kayit.imzalar.hazirlayan.ad) || kayit.hazirlayanAdi, hazirlayanFoto),
      imzaHucre('Onaylayan', (kayit.imzalar.onaylayan && kayit.imzalar.onaylayan.ad) || kayit.onaylayanAdi, onaylayanFoto)
    ] })]
  }));

  const dokuman = new docx.Document({ sections: [{ properties: {}, children: cocuklar }] });
  const blob = await docx.Packer.toBlob(dokuman);
  saveAs(blob, `JSA_${(kayit.kayitNo || 'Taslak').replace(/[\\/]/g, '-')}.docx`);
}
