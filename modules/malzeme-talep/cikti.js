// İSG Malzeme Talep çıktıları: on-ekran önizleme (yazdırma) + gerçek Word
// (.docx) belgesi. Eski üretim uygulamasındaki word() fonksiyonuyla BİREBİR
// aynı ölçüler/yapı kullanılır (font, punto, sayfa kenar boşlukları, tablo
// genişlikleri, kenarlık rengi/kalınlığı) — kullanıcının "form birebir aynı
// olsun" talebi üzerine hiçbir değer yuvarlanmadan/tahmin edilmeden aynen
// taşındı. Tek fark: eski uygulamada tek bir müşteriye özel varsayılan
// (müdürlük/hitap/imza yetkilisi) sabitken, burada bunlar Ayarlar'dan
// kiracı bazlı girilir.

function _mtKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// Eski uygulamadaki preview() ile birebir aynı HTML/CSS iskeleti.
function malzemeTalepOnizlemeHtmlUret(t) {
  const malzemelerHtml = (t.malzemeler || []).length ? `
    <table class="mt-4">
      <thead><tr><th>No</th><th>Malzeme</th><th>Standart</th><th>Teknik özellik</th><th>Miktar</th><th>Birim</th><th>Detay</th></tr></thead>
      <tbody>
        ${t.malzemeler.map((m, i) => `<tr>
          <td>${i + 1}</td>
          <td>${_mtKacir(m.resmiAdi || m.ad)}</td>
          <td>${_mtKacir((m.standartlar || []).join(', ')) || 'Belirtilmedi'}</td>
          <td>${_mtKacir((m.teknikOzellikler || []).join('; ')) || 'Belirtilmedi'}</td>
          <td>${m.miktar}</td>
          <td>${_mtKacir(m.birim)}</td>
          <td>${_mtKacir([m.renk, m.beden, m.numara, m.marka, m.aciklama].filter(Boolean).join(' / ')) || '-'}</td>
        </tr>`).join('')}
      </tbody>
    </table>` : '';

  return `
  <div class="mt-a4" id="mtDoc">
    <style>
      .mt-a4{ width:210mm; min-height:297mm; margin:auto; background:#fff; color:#111; padding:18mm 16mm; font-family:"Times New Roman", serif; }
      .mt-a4 table{ width:100%; table-layout:fixed; border-collapse:collapse; }
      .mt-a4 th, .mt-a4 td{ border:1px solid #555; padding:4px; font-size:9pt; word-break:break-word; }
      .mt-dochead{ display:grid; grid-template-columns:1fr 1fr; font-weight:700; }
      .mt-dochead .sag{ text-align:right; }
      .mt-hitap{ text-align:center; margin:3rem 0; font-size:14pt; font-weight:700; }
      .mt-ozu{ text-align:right; margin-bottom:1.5rem; }
      .mt-govde{ text-align:justify; line-height:1.55; }
      .mt-imza{ width:45%; margin-left:auto; text-align:center; margin-top:28px; }
    </style>
    <div class="mt-dochead">
      <div>${_mtKacir(t.mudurluk)}</div>
      <div class="sag">Tarih: ${_mtKacir(trTarih(t.talepTarihi))}<br>${_mtKacir(t.ustBelgeNo || t.belgeNo || 'TASLAK')}</div>
    </div>
    <div class="mt-hitap">${_mtKacir(t.hitap)}</div>
    <div class="mt-ozu"><b>Özü:</b> ${_mtKacir(t.konu)}</div>
    <p class="mt-govde">${_mtKacir(t.duzenlenmisMetin || t.uretilenMetin)}</p>
    <div class="mt-imza">Saygılarımla,<br><br><b>${_mtKacir(t.imzaYetkilisi)}</b><br>${_mtKacir(t.unvan)}</div>
    <div style="margin-top:1rem;">${_mtKacir(t.paraf || '')}</div>
    ${malzemelerHtml}
  </div>
  `;
}

function malzemeTalepOnizlemeYazdir(talepId) {
  const t = malzemeTalepIdIleGetirRepo(talepId);
  if (!t) return;
  const ayarlar = malzemeTalepAyarlariGetir();
  const goruntulenecek = Object.assign({ paraf: ayarlar.paraf }, t);
  const mount = document.getElementById('yazdirmaAlani');
  mount.innerHTML = malzemeTalepOnizlemeHtmlUret(goruntulenecek);
  mount.style.display = 'block';
  setTimeout(() => {
    window.print();
    setTimeout(() => { mount.innerHTML = ''; mount.style.display = 'none'; }, 400);
  }, 80);
}

// ==================== GERÇEK WORD (.docx) ÇIKTISI ====================
// Eski uygulamadaki word() fonksiyonuyla birebir aynı: aynı font, punto,
// sayfa ölçüleri, tablo genişlik yüzdeleri ve kenarlık değerleri.

async function malzemeTalepWordOlustur(talepId) {
  const t = malzemeTalepIdIleGetirRepo(talepId);
  if (!t) return;
  if (!window.docx) { alert('docx.js yüklenemedi.'); return; }

  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, VerticalAlign, BorderStyle } = docx;
  const font = 'Times New Roman', bodySize = 22, smallSize = 18;
  const noBorder = { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } };

  const hucre = (deger, kalin, genislik) => new TableCell({
    width: genislik ? { size: genislik, type: WidthType.PERCENTAGE } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 70, bottom: 70, left: 70, right: 70 },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: '555555' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: '555555' },
      left: { style: BorderStyle.SINGLE, size: 4, color: '555555' },
      right: { style: BorderStyle.SINGLE, size: 4, color: '555555' }
    },
    children: [new Paragraph({ spacing: { before: 0, after: 0 }, children: [new TextRun({ text: String(deger ?? ''), bold: !!kalin, font, size: smallSize })] })]
  });

  const genislikler = [5, 18, 14, 28, 8, 8, 19];
  const satirlar = [
    new TableRow({ tableHeader: true, cantSplit: true, children: ['No', 'Malzeme', 'Standart', 'Teknik özellik', 'Miktar', 'Birim', 'Detay'].map((x, i) => hucre(x, true, genislikler[i])) }),
    ...t.malzemeler.map((m, i) => new TableRow({
      cantSplit: true,
      children: [
        i + 1, m.resmiAdi || m.ad, (m.standartlar || []).join(', ') || 'Belirtilmedi',
        (m.teknikOzellikler || []).join('; ') || 'Belirtilmedi', m.miktar, m.birim,
        [m.renk, m.beden, m.numara, m.marka, m.aciklama].filter(Boolean).join(' / ') || '-'
      ].map((x, j) => hucre(x, false, genislikler[j]))
    }))
  ];

  const ustBilgiTablosu = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: Object.assign({}, noBorder, { insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } }),
    rows: [new TableRow({
      children: [
        new TableCell({ width: { size: 55, type: WidthType.PERCENTAGE }, borders: noBorder, children: [new Paragraph({ children: [new TextRun({ text: t.mudurluk, bold: true, font, size: bodySize })] })] }),
        new TableCell({ width: { size: 45, type: WidthType.PERCENTAGE }, borders: noBorder, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `Tarih: ${trTarih(t.talepTarihi)}\n${t.ustBelgeNo || t.belgeNo || 'TASLAK'}`, bold: true, font, size: bodySize })] })] })
      ]
    })]
  });

  const ayarlar = malzemeTalepAyarlariGetir();

  const belge = new Document({
    styles: { default: { document: { run: { font, size: bodySize }, paragraph: { spacing: { line: 340 } } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1021, right: 907, bottom: 1021, left: 907 } } },
      children: [
        ustBilgiTablosu,
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 850, after: 600 }, children: [new TextRun({ text: t.hitap, bold: true, font, size: bodySize })] }),
        new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 450 }, children: [new TextRun({ text: 'Özü: ', bold: true, font, size: bodySize }), new TextRun({ text: t.konu || '', font, size: bodySize })] }),
        new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { line: 360, after: 550 }, children: [new TextRun({ text: t.duzenlenmisMetin || t.uretilenMetin || '', font, size: bodySize })] }),
        new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 250, after: 450 }, children: [new TextRun({ text: `Saygılarımla,\n\n${t.imzaYetkilisi}\n${t.unvan}`, font, size: bodySize })] }),
        new Paragraph({ spacing: { after: 350 }, children: [new TextRun({ text: ayarlar.paraf || '', font, size: bodySize })] }),
        ...(t.malzemeler.length ? [new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: satirlar })] : [])
      ]
    }]
  });

  const blob = await Packer.toBlob(belge);
  saveAs(blob, malzemeTalepDosyaAdiUret(t, 'docx'));
}
