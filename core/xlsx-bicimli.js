// Biçimli Excel (xlsx) rapor üretici — ortak yardımcı.
// SheetJS'in ücretsiz sürümü hücre biçimi (renk, kalın, kenarlık, kaydırma)
// yazamadığı için rapor görünümlü Excel'ler xlsx XML'i elle üretilip JSZip ile
// paketlenir. Kullananlar: ÇSGB Takip Raporu (modules/uygunsuzluk/csgb-cikti.js),
// İSG Kurulu Aksiyon Planı (modules/kurul/cikti.js).
//
// Kullanım:
//   const X = XLSX_STIL, h = (v, s) => ({ v, s });
//   const xml = xlsxSayfaXml([{ hucreler: [h('Başlık', X.baslik)], yukseklik: 26 }, ...],
//     { genislikler: [8, 30, ...], birlesik: ['A1:F1'], dondur: 5, filtre: 'A5:F40', yatay: true });
//   await xlsxKitapIndir('dosya.xlsx', [{ ad: 'Sayfa', xml, filtre: { aralik: 'A5:F40' }, baslikSatiri: 5 }]);

function xlsxJsZipHazirla() {
  if (window.JSZip) return Promise.resolve(window.JSZip);
  return new Promise((coz, red) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    s.onload = () => window.JSZip ? coz(window.JSZip) : red(new Error('JSZip yüklenemedi.'));
    s.onerror = () => red(new Error('Excel kütüphanesi yüklenemedi (internet bağlantısını kontrol edin).'));
    document.head.appendChild(s);
  });
}

function xlsxXmlKacir(v) {
  return String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
}

// Stil numaraları (xlsxStilleriXml cellXfs sırası).
const XLSX_STIL = { normal: 0, baslik: 1, bilgiEtiket: 2, bilgiDeger: 3, ozet: 4, tabloBaslik: 5, hucre: 6, hucreKalin: 7, hucreOrta: 8, tamam: 9, gecikmis: 10, acik: 11, devam: 12, altBaslik: 13 };

function xlsxStilleriXml() {
  const kenar = '<border><left style="thin"><color rgb="FF94A3B8"/></left><right style="thin"><color rgb="FF94A3B8"/></right><top style="thin"><color rgb="FF94A3B8"/></top><bottom style="thin"><color rgb="FF94A3B8"/></bottom><diagonal/></border>';
  const xf = (font, fill, border, hiza) => `<xf numFmtId="0" fontId="${font}" fillId="${fill}" borderId="${border}" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment ${hiza}/></xf>`;
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<fonts count="8">' +
      '<font><sz val="10"/><name val="Arial"/></font>' +
      '<font><b/><sz val="15"/><color rgb="FF0F172A"/><name val="Arial"/></font>' +
      '<font><b/><sz val="10"/><name val="Arial"/></font>' +
      '<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Arial"/></font>' +
      '<font><b/><sz val="10"/><color rgb="FF15803D"/><name val="Arial"/></font>' +
      '<font><b/><sz val="10"/><color rgb="FFB91C1C"/><name val="Arial"/></font>' +
      '<font><b/><sz val="10"/><color rgb="FFB45309"/><name val="Arial"/></font>' +
      '<font><b/><sz val="10"/><color rgb="FF0F766E"/><name val="Arial"/></font>' +
    '</fonts>' +
    '<fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/></patternFill></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FF134E4A"/></patternFill></fill>' +
      '<fill><patternFill patternType="solid"><fgColor rgb="FFCCFBF1"/></patternFill></fill>' +
    '</fills>' +
    `<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>${kenar}</borders>` +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="14">' +
      xf(0, 0, 0, 'vertical="top"') +                                   // normal
      xf(1, 0, 0, 'vertical="center"') +                                // baslik
      xf(2, 2, 1, 'vertical="center" wrapText="1"') +                   // bilgiEtiket
      xf(0, 0, 1, 'vertical="center" wrapText="1"') +                   // bilgiDeger
      xf(2, 4, 1, 'vertical="center" wrapText="1"') +                   // ozet
      xf(3, 3, 1, 'horizontal="center" vertical="center" wrapText="1"') + // tabloBaslik
      xf(0, 0, 1, 'vertical="top" wrapText="1"') +                      // hucre
      xf(2, 0, 1, 'vertical="top" wrapText="1"') +                      // hucreKalin
      xf(2, 0, 1, 'horizontal="center" vertical="top" wrapText="1"') +  // hucreOrta
      xf(4, 0, 1, 'vertical="top" wrapText="1"') +                      // tamam
      xf(5, 0, 1, 'vertical="top" wrapText="1"') +                      // gecikmis
      xf(6, 0, 1, 'vertical="top" wrapText="1"') +                      // acik
      xf(7, 0, 1, 'vertical="top" wrapText="1"') +                      // devam
      xf(2, 0, 0, 'vertical="center"') +                                // altBaslik
    '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
}

function xlsxKolonHarfi(n) { let s = ''; n++; while (n) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }

// satirlar: [{ hucreler: [{ v, s }], yukseklik? }]; birlesik: ['A1:L1', ...]
function xlsxSayfaXml(satirlar, { genislikler, birlesik = [], dondur = 0, filtre = '', yatay = false }) {
  const rows = satirlar.map((r, i) => {
    const no = i + 1;
    const hucreler = (r.hucreler || []).map((h, j) => {
      if (h == null) return '';
      const ref = xlsxKolonHarfi(j) + no;
      const deger = h.v ?? '';
      if (typeof deger === 'number') return `<c r="${ref}" s="${h.s || 0}"><v>${deger}</v></c>`;
      return `<c r="${ref}" s="${h.s || 0}" t="inlineStr"><is><t xml:space="preserve">${xlsxXmlKacir(deger)}</t></is></c>`;
    }).join('');
    return `<row r="${no}"${r.yukseklik ? ` ht="${r.yukseklik}" customHeight="1"` : ''}>${hucreler}</row>`;
  }).join('');
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>` +
    `<sheetViews><sheetView workbookViewId="0">${dondur ? `<pane ySplit="${dondur}" topLeftCell="A${dondur + 1}" activePane="bottomLeft" state="frozen"/>` : ''}</sheetView></sheetViews>` +
    `<cols>${genislikler.map((w, j) => `<col min="${j + 1}" max="${j + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` +
    `<sheetData>${rows}</sheetData>` +
    (filtre ? `<autoFilter ref="${filtre}"/>` : '') +
    (birlesik.length ? `<mergeCells count="${birlesik.length}">${birlesik.map(b => `<mergeCell ref="${b}"/>`).join('')}</mergeCells>` : '') +
    `<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>` +
    `<pageSetup paperSize="9" orientation="${yatay ? 'landscape' : 'portrait'}" fitToWidth="1" fitToHeight="0"/>` +
    '</worksheet>';
}

// sayfalar: [{ ad, xml, filtre?: 'A5:L40', baslikSatiri?: 5 }] -- filtre ve
// baslikSatiri verilirse Excel'e filtre aralığı ve her sayfada tekrar eden
// başlık satırı tanıtılır. Dosyayı indirir (saveAs).
async function xlsxKitapIndir(dosyaAdi, sayfalar) {
  const JSZip = await xlsxJsZipHazirla();
  const zip = new JSZip();
  const ct = 'application/vnd.openxmlformats-officedocument.spreadsheetml';
  zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
    `<Override PartName="/xl/workbook.xml" ContentType="${ct}.sheet.main+xml"/>` +
    sayfalar.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="${ct}.worksheet+xml"/>`).join('') +
    `<Override PartName="/xl/styles.xml" ContentType="${ct}.styles+xml"/></Types>`);
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
  const tanimlar = sayfalar.map((s, i) => {
    const ad = `'${String(s.ad).replace(/'/g, "''")}'`;
    const parca = [];
    if (s.filtre) parca.push(`<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">${ad}!${s.filtre.replace(/([A-Z]+)(\d+)/g, '$$$1$$$2')}</definedName>`);
    if (s.baslikSatiri) parca.push(`<definedName name="_xlnm.Print_Titles" localSheetId="${i}">${ad}!$${s.baslikSatiri}:$${s.baslikSatiri}</definedName>`);
    return parca.join('');
  }).join('');
  zip.file('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
    sayfalar.map((s, i) => `<sheet name="${xlsxXmlKacir(s.ad)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') + '</sheets>' +
    (tanimlar ? `<definedNames>${tanimlar}</definedNames>` : '') + '</workbook>');
  zip.file('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    sayfalar.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') +
    `<Relationship Id="rId${sayfalar.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  sayfalar.forEach((s, i) => zip.file(`xl/worksheets/sheet${i + 1}.xml`, s.xml));
  zip.file('xl/styles.xml', xlsxStilleriXml());
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', mimeType: `${ct}.sheet` });
  saveAs(blob, dosyaAdi);
}
