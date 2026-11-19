// Lokasyon Bazlı Saha Denetimi — çıktılar:
//  * ldBarkodEtiketleriPdf: lokasyon girişine asılacak etiketler (QR + CODE128), A4'e 4 adet.
//  * ldDenetimRaporuWordOlustur: profesyonel Word denetim raporu (docx@8.5.0).

// ===================== BARKOD ETİKETLERİ =====================

function _ldcMetinSar(ctx, metin, maksGen, maksSatir) {
  const kelimeler = String(metin || '').split(/\s+/).filter(Boolean);
  const satirlar = [];
  let s = '';
  kelimeler.forEach(k => {
    const aday = s ? s + ' ' + k : k;
    if (ctx.measureText(aday).width <= maksGen || !s) s = aday;
    else { satirlar.push(s); s = k; }
  });
  if (s) satirlar.push(s);
  if (satirlar.length > maksSatir) {
    const kes = satirlar.slice(0, maksSatir);
    let son = kes[maksSatir - 1];
    while (son.length > 1 && ctx.measureText(son + '…').width > maksGen) son = son.slice(0, -1);
    kes[maksSatir - 1] = son + '…';
    return kes;
  }
  return satirlar;
}

function _ldcQrCiz(ctx, metin, x, y, boyut) {
  if (typeof qrcode !== 'function') return false;
  const qr = qrcode(0, 'M');
  qr.addData(metin);
  qr.make();
  const n = qr.getModuleCount();
  const kenar = 2;
  const hucre = boyut / (n + kenar * 2);
  ctx.fillStyle = '#fff';
  ctx.fillRect(x, y, boyut, boyut);
  ctx.fillStyle = '#000';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) ctx.fillRect(Math.floor(x + (c + kenar) * hucre), Math.floor(y + (r + kenar) * hucre), Math.ceil(hucre), Math.ceil(hucre));
    }
  }
  return true;
}

function _ldcEtiketTuvali(lok, firma, url, genMm, yukMm) {
  const O = 10; // px / mm
  const t = document.createElement('canvas');
  t.width = genMm * O;
  t.height = yukMm * O;
  const ctx = t.getContext('2d');
  const G = t.width;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, G, t.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Üst bant
  ctx.fillStyle = '#1F3A5F';
  ctx.fillRect(0, 0, G, 20 * O);
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${6.2 * O}px Arial, sans-serif`;
  ctx.fillText('SAHA KONTROL NOKTASI', G / 2, 8.5 * O);
  ctx.font = `${3.6 * O}px Arial, sans-serif`;
  ctx.fillText(_ldcMetinSar(ctx, firma ? firma.ad : '', G - 10 * O, 1)[0] || '', G / 2, 15 * O);

  // Bölüm + lokasyon
  ctx.fillStyle = '#111';
  ctx.font = `bold ${7 * O}px Arial, sans-serif`;
  let y = 29 * O;
  _ldcMetinSar(ctx, lok.bolum, G - 10 * O, 2).forEach(s => { ctx.fillText(s, G / 2, y); y += 8 * O; });
  ctx.fillStyle = '#1d4ed8';
  ctx.font = `bold ${8.5 * O}px Arial, sans-serif`;
  _ldcMetinSar(ctx, lok.lokasyon, G - 10 * O, 2).forEach(s => { ctx.fillText(s, G / 2, y + 1 * O); y += 9.5 * O; });

  // QR
  const qrBoyut = 58 * O;
  const qrY = Math.max(y + 2 * O, 50 * O);
  _ldcQrCiz(ctx, url, (G - qrBoyut) / 2, qrY, qrBoyut);
  ctx.fillStyle = '#374151';
  ctx.font = `${3.6 * O}px Arial, sans-serif`;
  ctx.fillText('Kontrole girişte bu kodu okutunuz', G / 2, qrY + qrBoyut + 4 * O);

  // CODE128 (uygulama içi tarayıcı / el terminali için)
  if (typeof JsBarcode === 'function') {
    const b = document.createElement('canvas');
    JsBarcode(b, lok.kod, { format: 'CODE128', displayValue: true, fontSize: 18, height: 50, margin: 4 });
    const bGen = 62 * O;
    const bYuk = Math.min(b.height * (bGen / b.width), 20 * O);
    ctx.drawImage(b, (G - bGen) / 2, qrY + qrBoyut + 8 * O, bGen, bYuk);
  }
  ctx.strokeStyle = '#1F3A5F';
  ctx.lineWidth = 0.6 * O;
  ctx.strokeRect(0.3 * O, 0.3 * O, G - 0.6 * O, t.height - 0.6 * O);
  return t;
}

function ldBarkodEtiketleriPdf(lokasyonlar, firma, urlUret) {
  if (typeof jspdf === 'undefined') { alert('PDF bileşeni yüklenemedi.'); return; }
  if (typeof qrcode !== 'function') alert('QR bileşeni yüklenemedi; etiketlerde yalnız çizgi barkod olacak.');
  const GEN = 95, YUK = 138, KENAR_X = 7, KENAR_Y = 8, ARA = 6;
  const pdf = new jspdf.jsPDF('p', 'mm', 'a4');
  lokasyonlar.forEach((l, i) => {
    const sira = i % 4;
    if (i > 0 && sira === 0) pdf.addPage('a4', 'p');
    const x = KENAR_X + (sira % 2) * (GEN + ARA);
    const y = KENAR_Y + Math.floor(sira / 2) * (YUK + ARA);
    const tuval = _ldcEtiketTuvali(l, firma, urlUret(l), GEN, YUK);
    // JPEG: PNG'de 2 etiket ~10 MB tutuyordu; 0.92 kalitede QR/barkod net kalır.
    pdf.addImage(tuval.toDataURL('image/jpeg', 0.92), 'JPEG', x, y, GEN, YUK);
  });
  const ad = lokasyonlar.length === 1 ? `${lokasyonlar[0].kod}_${lokasyonlar[0].bolum}_${lokasyonlar[0].lokasyon}` : 'Lokasyon_Barkodlari';
  pdf.save(`${ad.replace(/[^\p{L}\p{N}]+/gu, '_')}.pdf`);
}

// ===================== BOŞ KONTROL FORMU (EXCEL) =====================
// Kullanıcı isteği (2026-11-18): "saha kontrol raporundaki soruları form
// olarak da hazırla, excel indirebileyim". Lokasyon seçiliyse her lokasyon
// kendi sayfasında, yalnız o lokasyonun kategorileriyle; seçili değilse tek
// sayfada tüm kategoriler. Sonuç ve Risk Seviyesi sütunlarında açılır liste var.
function _ldcSayfaAdi(ad, kullanilan) {
  let temel = String(ad || 'Sayfa').replace(/[\[\]:*?\/\\]/g, '-').slice(0, 28).trim() || 'Sayfa';
  let aday = temel;
  let n = 2;
  while (kullanilan.has(aday)) aday = `${temel.slice(0, 25)} (${n++})`;
  kullanilan.add(aday);
  return aday;
}

function _ldcFormSayfasi(firma, lok, kategoriIdleri) {
  const X = XLSX_STIL;
  const h = (v, s) => ({ v, s });
  const satirlar = [];
  const birlesik = [];
  const satirEkle = (hucreler, yukseklik) => { satirlar.push({ hucreler, yukseklik }); return satirlar.length; };

  // H sütunu (gizli) "Kod": doldurulan form geri yüklenirken satırı doğru
  // maddeye eşlemek için (bkz. ldKontrolFormuSatirlariniIsle). Değiştirilmemeli.
  const kod = v => h(v, X.normal);
  let r = satirEkle([h('SAHA KONTROL FORMU', X.baslik)], 26);
  birlesik.push(`A${r}:G${r}`);
  r = satirEkle([h(firma ? firma.ad : '', X.altBaslik), null, null, null, null, null, null, kod('LD-FORM-1')], 18);
  birlesik.push(`A${r}:G${r}`);
  r = satirEkle([h('Bölüm', X.bilgiEtiket), h(lok ? lok.bolum : '', X.bilgiDeger), null, h('Lokasyon / Kat', X.bilgiEtiket), h(lok ? `${lok.lokasyon}${lok.kod ? '  (' + lok.kod + ')' : ''}` : '', X.bilgiDeger), null, null, kod(lok ? lok.kod : 'lokasyon')], 20);
  birlesik.push(`B${r}:C${r}`, `E${r}:G${r}`);
  r = satirEkle([h('Tarih', X.bilgiEtiket), h('', X.bilgiDeger), null, h('Kontrol Eden', X.bilgiEtiket), h('', X.bilgiDeger), null, null], 20);
  birlesik.push(`B${r}:C${r}`, `E${r}:G${r}`);
  r = satirEkle([h('Sonuç sütununda Uygun / Uygun Değil / Uygulanamaz seçin; "Uygun Değil" maddelerde görülen durumu Tespit sütununa yazın. Doldurduktan sonra uygulamada kontrolü açıp "Doldurulmuş Formu Yükle" ile aktarabilirsiniz.', X.normal)], 30);
  birlesik.push(`A${r}:G${r}`);
  const baslikSatiri = satirEkle(['No', 'Kontrol Maddesi', 'Mevzuat', 'Sonuç', 'Tespit', 'Önerilen Önlem', 'Risk Seviyesi'].map(b => h(b, X.tabloBaslik)).concat([kod('Kod')]), 24);
  const ilkVeri = baslikSatiri + 1;

  let no = 0;
  // Lokasyonda madde seçildiyse yalnız seçilenler (bkz. ldSecilenSorular).
  const secili = lok ? new Set(ldSecilenSorular(lok)) : null;
  kategoriIdleri.map(ldKategoriGetir).filter(k => k && k.sorular).forEach(kat => {
    const maddeler = kat.sorular.filter(s => !secili || secili.has(`${kat.id}.${s.id}`));
    if (!maddeler.length) return;
    r = satirEkle([h(kat.ad, X.ozet), h('', X.ozet), h('', X.ozet), h('', X.ozet), h('', X.ozet), h('', X.ozet), h('', X.ozet)], 18);
    birlesik.push(`A${r}:G${r}`);
    maddeler.forEach(s => {
      no++;
      satirEkle([h(no, X.hucreOrta), h(s.soru, X.hucre), h(s.mevzuat, X.hucre), h('', X.hucreOrta), h('', X.hucre), h('', X.hucre), h('', X.hucre), kod(`${kat.id}.${s.id}`)], 32);
    });
  });
  // Listede olmayan tespitler için boş satırlar.
  r = satirEkle([h('Diğer Tespitler (listede olmayan)', X.ozet), h('', X.ozet), h('', X.ozet), h('', X.ozet), h('', X.ozet), h('', X.ozet), h('', X.ozet)], 18);
  birlesik.push(`A${r}:G${r}`);
  for (let i = 0; i < 5; i++) {
    no++;
    satirEkle([h(no, X.hucreOrta), h('', X.hucre), h('', X.hucre), h('Uygun Değil', X.hucreOrta), h('', X.hucre), h('', X.hucre), h('', X.hucre), kod('serbest')], 32);
  }
  const sonVeri = satirlar.length;

  satirEkle([]);
  r = satirEkle([h('Lokasyon Notu', X.bilgiEtiket), h('', X.bilgiDeger), null, null, null, null, null, kod('not')], 40);
  birlesik.push(`B${r}:G${r}`);
  r = satirEkle([h('Kontrol Eden', X.bilgiEtiket), h('Ad Soyad:', X.bilgiDeger), null, h('İmza', X.bilgiEtiket), h('', X.bilgiDeger), null, null], 34);
  birlesik.push(`B${r}:C${r}`, `E${r}:G${r}`);

  let xml = xlsxSayfaXml(satirlar, { genislikler: [6, 52, 30, 15, 34, 30, 17, 14], birlesik, dondur: baslikSatiri, yatay: true });
  xml = xml.replace('<col min="8" max="8" width="14" customWidth="1"/>', '<col min="8" max="8" width="14" hidden="1" customWidth="1"/>');
  const riskler = (typeof RISK_SEVIYELERI !== 'undefined' ? RISK_SEVIYELERI : ['Önemsiz Risk', 'Olası Risk', 'Önemli Risk', 'Esaslı Risk', 'Tolerans Gösterilemez']).join(',');
  const dogrulama = `<dataValidations count="2">` +
    `<dataValidation type="list" allowBlank="1" showErrorMessage="1" sqref="D${ilkVeri}:D${sonVeri}"><formula1>"${xlsxXmlKacir(LD_SONUCLAR.join(','))}"</formula1></dataValidation>` +
    `<dataValidation type="list" allowBlank="1" showErrorMessage="1" sqref="G${ilkVeri}:G${sonVeri}"><formula1>"${xlsxXmlKacir(riskler)}"</formula1></dataValidation>` +
    `</dataValidations>`;
  xml = xml.replace('<pageMargins', dogrulama + '<pageMargins');
  return { xml, baslikSatiri };
}

async function ldKontrolFormuExcelIndir(lokasyonlar, firma) {
  if (typeof xlsxSayfaXml !== 'function') { alert('Excel bileşeni yüklenemedi.'); return; }
  const kullanilan = new Set();
  const sayfalar = [];
  if (lokasyonlar && lokasyonlar.length) {
    lokasyonlar.forEach(l => {
      const s = _ldcFormSayfasi(firma, l, l.kategoriler);
      sayfalar.push({ ad: _ldcSayfaAdi(`${l.bolum} - ${l.lokasyon}`, kullanilan), xml: s.xml, baslikSatiri: s.baslikSatiri });
    });
  } else {
    const s = _ldcFormSayfasi(firma, null, LD_KATEGORILER.map(k => k.id));
    sayfalar.push({ ad: _ldcSayfaAdi('Tüm Kontrol Maddeleri', kullanilan), xml: s.xml, baslikSatiri: s.baslikSatiri });
  }
  const ad = lokasyonlar && lokasyonlar.length === 1
    ? `Saha_Kontrol_Formu_${lokasyonlar[0].bolum}_${lokasyonlar[0].lokasyon}`
    : (lokasyonlar && lokasyonlar.length ? 'Saha_Kontrol_Formlari' : 'Saha_Kontrol_Formu_Tum_Maddeler');
  await xlsxKitapIndir(`${ad.replace(/[^\p{L}\p{N}]+/gu, '_')}.xlsx`, sayfalar);
}

// ===================== WORD RAPORU =====================

const _LDC_LACIVERT = '1F3A5F';
const _LDC_GRI = 'F2F4F7';
const _LDC_SAYFA_GEN = 11906 - 2 * 1021; // A4 - 1,8 cm kenar boşlukları (DXA)
const _LDC_RISK_RENK = {
  'Tolerans Gösterilemez': 'F4CCCC', 'Esaslı Risk': 'FCE4D6', 'Önemli Risk': 'FFF2CC', 'Olası Risk': 'E2EFDA', 'Önemsiz Risk': 'EDEDED'
};

function _ldcPuanRenk(p) { return p == null ? 'FFFFFF' : p >= 90 ? 'E2EFDA' : p >= 70 ? 'FFF2CC' : 'F4CCCC'; }
function _ldcTarih(iso) { return iso ? gunAyYil(String(iso).slice(0, 10)) : '-'; }

function _ldcRun(metin, s) {
  return new docx.TextRun(Object.assign({ text: String(metin ?? ''), size: 19, font: 'Calibri' }, s || {}));
}
function _ldcP(metin, s, ps) {
  const runlar = Array.isArray(metin) ? metin : [_ldcRun(metin, s)];
  return new docx.Paragraph(Object.assign({ spacing: { after: 100, line: 276 }, children: runlar }, ps || {}));
}
function _ldcBaslik(metin, seviye, sayfaBasi) {
  const boy = seviye === 1 ? 26 : 22;
  return new docx.Paragraph({
    pageBreakBefore: !!sayfaBasi,
    keepNext: true,
    spacing: { before: seviye === 1 ? 300 : 200, after: 120 },
    border: seviye === 1 ? { bottom: { style: docx.BorderStyle.SINGLE, size: 8, color: _LDC_LACIVERT, space: 2 } } : undefined,
    children: [_ldcRun(metin, { bold: true, size: boy, color: _LDC_LACIVERT })]
  });
}
function _ldcHucre(icerik, o) {
  o = o || {};
  const paragraflar = Array.isArray(icerik) && icerik.length && icerik[0] instanceof docx.Paragraph
    ? icerik
    : String(icerik ?? '').split('\n').map(satir => new docx.Paragraph({
        alignment: o.hiza || docx.AlignmentType.LEFT,
        spacing: { before: 30, after: 30 },
        children: [_ldcRun(satir === '' ? ' ' : satir, { bold: !!o.kalin, color: o.renk, size: o.boy || 18 })]
      }));
  return new docx.TableCell({
    children: paragraflar,
    shading: o.dolgu ? { fill: o.dolgu, type: docx.ShadingType.CLEAR, color: 'auto' } : undefined,
    width: o.gen ? { size: o.gen, type: docx.WidthType.DXA } : undefined,
    columnSpan: o.span,
    verticalAlign: docx.VerticalAlign.CENTER,
    margins: { top: 40, bottom: 40, left: 80, right: 80 }
  });
}
// kolonlar: yüzde dizisi; satirlar: [[hücre içeriği | {m, o}]]; baslik: string dizisi
function _ldcTablo(yuzdeler, baslik, satirlar) {
  const genler = yuzdeler.map(y => Math.round(_LDC_SAYFA_GEN * y / 100));
  const kenar = { style: docx.BorderStyle.SINGLE, size: 4, color: 'BFC5CE' };
  const rows = [];
  if (baslik) {
    rows.push(new docx.TableRow({
      tableHeader: true,
      children: baslik.map((b, i) => _ldcHucre(b, { kalin: true, renk: 'FFFFFF', dolgu: _LDC_LACIVERT, gen: genler[i], boy: 17 }))
    }));
  }
  satirlar.forEach((satir, si) => {
    let kolon = 0;
    rows.push(new docx.TableRow({
      cantSplit: true,
      children: satir.map(h => {
        const nesne = h && typeof h === 'object' && !Array.isArray(h) && 'm' in h ? h : { m: h, o: {} };
        const o = Object.assign({}, nesne.o);
        const span = o.span || 1;
        o.gen = genler.slice(kolon, kolon + span).reduce((a, b) => a + b, 0);
        if (!o.dolgu && si % 2 === 1) o.dolgu = 'FAFBFC';
        kolon += span;
        return _ldcHucre(nesne.m, o);
      })
    }));
  });
  return new docx.Table({
    width: { size: _LDC_SAYFA_GEN, type: docx.WidthType.DXA },
    columnWidths: genler,
    borders: { top: kenar, bottom: kenar, left: kenar, right: kenar, insideHorizontal: kenar, insideVertical: kenar },
    rows
  });
}
function _ldcBosluk(after) { return new docx.Paragraph({ spacing: { after: after || 120 }, children: [] }); }

async function _ldcGorsel(ref, maksGen, maksYuk) {
  if (!ref) return null;
  try {
    const url = typeof fotoBuyukCoz === 'function' ? await fotoBuyukCoz(ref) : ref;
    if (!url) return null;
    const blob = await (await fetch(url)).blob();
    const img = await new Promise((coz, red) => { const i = new Image(); i.onload = () => coz(i); i.onerror = red; i.src = URL.createObjectURL(blob); });
    const oran = Math.min(maksGen / img.naturalWidth, maksYuk / img.naturalHeight, 1);
    const gen = Math.max(1, Math.round(img.naturalWidth * oran));
    const yuk = Math.max(1, Math.round(img.naturalHeight * oran));
    const c = document.createElement('canvas');
    c.width = gen * 2; c.height = yuk * 2;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const ikili = atob(c.toDataURL('image/jpeg', 0.85).split(',')[1]);
    const veri = new Uint8Array(ikili.length);
    for (let i = 0; i < ikili.length; i++) veri[i] = ikili.charCodeAt(i);
    return { veri, gen, yuk };
  } catch (e) {
    console.warn('Görsel rapora eklenemedi:', e);
    return null;
  }
}

function _ldcSonucHucresi(sonuc) {
  const renk = { 'Uygun': ['E2EFDA', '2E7D32'], 'Uygun Değil': ['F4CCCC', 'B00020'], 'Uygulanamaz': ['EDEDED', '555555'] }[sonuc] || ['FFFFFF', '888888'];
  return { m: sonuc || 'Değerlendirilmedi', o: { dolgu: renk[0], renk: renk[1], kalin: !!sonuc, hiza: docx.AlignmentType.CENTER } };
}

async function ldDenetimRaporuWordOlustur(d, firma) {
  const ist = ldDenetimIstatistik(d);
  const bulgular = ldDenetimBulgulari(d);
  const tarihMetni = _ldcTarih(d.tarih) + (d.bitisTarihi && d.bitisTarihi !== d.tarih ? ' – ' + _ldcTarih(d.bitisTarihi) : '');
  const bolumler = Array.from(new Set(d.ziyaretler.map(z => z.bolum)));
  const logo = await _ldcGorsel(firma && typeof firmaLogoGetir === 'function' ? firmaLogoGetir(firma.id) : '', 150, 50);
  const c = [];

  // ---- Kapak / başlık ----
  c.push(new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { before: 200, after: 60 }, children: [_ldcRun('SAHA KONTROL RAPORU', { bold: true, size: 36, color: _LDC_LACIVERT })] }));
  c.push(new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { after: 280 }, children: [_ldcRun('Lokasyon Bazlı İş Sağlığı ve Güvenliği Kontrolü', { size: 22, color: '555555' })] }));
  if (d.baslik) c.push(new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { after: 200 }, children: [_ldcRun(d.baslik, { bold: true, size: 24 })] }));

  const bilgi = [
    ['İşyeri', firma ? firma.ad : '-'],
    ['Kontrol No', d.denetimNo],
    ['Kontrol Tarihi', tarihMetni],
    ['Kontrol Eden(ler)', d.denetciler || '-'],
    ['Eşlik Edenler', d.eslikEdenler || '-'],
    ['Kapsam', d.kapsam || bolumler.join(', ')],
    ['Kontrol Edilen Bölüm / Lokasyon', `${bolumler.length} bölüm / ${d.ziyaretler.length} lokasyon`],
    ['Rapor Tarihi', _ldcTarih(new Date().toISOString())]
  ];
  c.push(_ldcTablo([30, 70], null, bilgi.map(([a, b]) => [{ m: a, o: { kalin: true, dolgu: _LDC_GRI } }, { m: b, o: { dolgu: 'FFFFFF' } }])));

  // ---- 1. Yönetici özeti ----
  c.push(_ldcBaslik('1. Yönetici Özeti', 1));
  const degerlendirilmedi = Math.max(0, ist.toplam - ist.cevaplanan);
  c.push(_ldcP(`${tarihMetni} tarihinde ${firma ? firma.ad + ' işyerinde ' : ''}${bolumler.length} bölümde ${d.ziyaretler.length} lokasyon kontrol edilmiştir. Lokasyonlarda toplam ${ist.toplam} kontrol maddesi uygulanmış; ${ist.uygun} madde uygun, ${ist.uygunDegil} madde uygun değil, ${ist.uygulanamaz} madde uygulanamaz olarak değerlendirilmiştir${degerlendirilmedi > 0 ? ` (${degerlendirilmedi} madde değerlendirilmemiştir)` : ''}. Uygulanabilir maddeler üzerinden genel uygunluk oranı ${ist.puan == null ? '-' : '%' + ist.puan} olarak hesaplanmıştır.`, null, { alignment: docx.AlignmentType.JUSTIFIED }));
  const listeDisi = bulgular.filter(b => b.madde.cevap.serbest).length;
  if (bulgular.length) c.push(_ldcP(`Kontrolde ${bulgular.length} uygunsuzluk (bulgu) tespit edilmiştir${listeDisi ? `; bunların ${listeDisi} adedi kontrol listesi dışında yapılan gözlemlerdir` : ''}. Bulguların ayrıntıları, ilgili mevzuat ve önerilen önlemler 4. bölümde verilmiştir.`, null, { alignment: docx.AlignmentType.JUSTIFIED }));

  const ozet = [
    [{ m: 'Uygun', o: { dolgu: 'E2EFDA' } }, { m: String(ist.uygun), o: { hiza: docx.AlignmentType.CENTER } }],
    [{ m: 'Uygun Değil (Bulgu)', o: { dolgu: 'F4CCCC' } }, { m: String(ist.uygunDegil), o: { hiza: docx.AlignmentType.CENTER } }],
    [{ m: 'Uygulanamaz', o: { dolgu: 'EDEDED' } }, { m: String(ist.uygulanamaz), o: { hiza: docx.AlignmentType.CENTER } }],
    [{ m: 'Değerlendirilmedi', o: {} }, { m: String(Math.max(0, degerlendirilmedi)), o: { hiza: docx.AlignmentType.CENTER } }],
    [{ m: 'Genel Uygunluk Oranı', o: { kalin: true, dolgu: _LDC_GRI } }, { m: ist.puan == null ? '-' : '%' + ist.puan, o: { kalin: true, hiza: docx.AlignmentType.CENTER, dolgu: _ldcPuanRenk(ist.puan) } }]
  ];
  const riskSay = {};
  bulgular.forEach(b => { const r = b.madde.cevap.risk || 'Belirtilmedi'; riskSay[r] = (riskSay[r] || 0) + 1; });
  const riskSira = (typeof RISK_SEVIYELERI !== 'undefined' ? RISK_SEVIYELERI.slice().reverse() : []).concat(['Belirtilmedi']);
  const riskSatir = riskSira.filter(r => riskSay[r]).map(r => [{ m: r, o: { dolgu: _LDC_RISK_RENK[r] || 'FFFFFF' } }, { m: String(riskSay[r]), o: { hiza: docx.AlignmentType.CENTER } }]);
  c.push(_ldcP('Değerlendirme sonuçları', { bold: true }, { spacing: { before: 160, after: 80 } }));
  c.push(_ldcTablo([60, 40], ['Sonuç', 'Madde Sayısı'], ozet));
  if (riskSatir.length) {
    c.push(_ldcP('Bulguların risk seviyesine göre dağılımı', { bold: true }, { spacing: { before: 200, after: 80 } }));
    c.push(_ldcTablo([60, 40], ['Risk Seviyesi', 'Bulgu Sayısı'], riskSatir));
  }

  c.push(_ldcBaslik('Kontrol Yöntemi', 2));
  // Kullanıcı isteği: raporda barkod okutulduğundan söz edilmesin.
  c.push(_ldcP('Her lokasyonda, lokasyonun faaliyetine göre seçilen kategorilerde, ilgili iş sağlığı ve güvenliği mevzuatına dayanan kontrol maddeleri yerinde gözlem ve inceleme yoluyla değerlendirilmiştir. Maddeler "Uygun", "Uygun Değil" ve "Uygulanamaz" olarak işaretlenmiş; uygunluk oranı Uygun ÷ (Uygun + Uygun Değil) formülüyle hesaplanmıştır. Acil durum ekipmanlarının durumu, Acil Durum modülündeki periyodik kontrol kayıtlarından alınmıştır.', { size: 18 }, { alignment: docx.AlignmentType.JUSTIFIED }));

  // ---- 2. Lokasyon bazında ----
  c.push(_ldcBaslik('2. Lokasyon Bazında Sonuçlar', 1));
  const lokSatir = d.ziyaretler.map((z, i) => {
    const s = ldZiyaretIstatistik(z);
    const ek = (z.ekipmanOzeti || []);
    const sorunlu = ek.filter(e => e.sonucMetni !== 'Uygun').length;
    return [String(i + 1), z.bolum, z.lokasyon, _ldcTarih(z.girisZamani), `${s.cevaplanan}/${s.toplam}`, String(s.uygun), String(s.uygunDegil),
      { m: s.puan == null ? '-' : '%' + s.puan, o: { dolgu: _ldcPuanRenk(s.puan), kalin: true, hiza: docx.AlignmentType.CENTER } },
      ek.length ? `${ek.length} / ${sorunlu} uyarı` : '-'];
  });
  c.push(_ldcTablo([5, 17, 17, 11, 11, 8, 9, 10, 12], ['#', 'Bölüm', 'Lokasyon', 'Tarih', 'Değerl.', 'Uygun', 'Uygun Değil', 'Uygunluk', 'Acil D. Ekipman'], lokSatir));

  // ---- 3. Kategori bazında ----
  c.push(_ldcBaslik('3. Kategori Bazında Sonuçlar', 1));
  const katIst = {};
  d.ziyaretler.forEach(z => ldZiyaretMaddeleri(z).forEach(m => {
    const k = m.kategori.ad;
    katIst[k] = katIst[k] || { t: 0, u: 0, ud: 0 };
    if (!(m.cevap && m.cevap.serbest)) katIst[k].t++;
    if (m.cevap && m.cevap.sonuc === 'Uygun') katIst[k].u++;
    if (m.cevap && m.cevap.sonuc === 'Uygun Değil') katIst[k].ud++;
  }));
  const katSatir = Object.keys(katIst).map(k => {
    const s = katIst[k];
    const p = (s.u + s.ud) ? Math.round(s.u * 100 / (s.u + s.ud)) : null;
    return [k, String(s.t), String(s.u), String(s.ud), { m: p == null ? '-' : '%' + p, o: { dolgu: _ldcPuanRenk(p), kalin: true, hiza: docx.AlignmentType.CENTER } }];
  });
  c.push(_ldcTablo([44, 14, 14, 14, 14], ['Kategori', 'Madde', 'Uygun', 'Uygun Değil', 'Uygunluk'], katSatir));

  // ---- 4. Bulgular ----
  c.push(_ldcBaslik('4. Tespit Edilen Uygunsuzluklar', 1, true));
  if (!bulgular.length) {
    c.push(_ldcP('Kontrol edilen lokasyonlarda uygunsuzluk tespit edilmemiştir.'));
  } else {
    c.push(_ldcBaslik('4.1 Bulgu Listesi', 2));
    c.push(_ldcTablo([8, 22, 40, 15, 15], ['No', 'Lokasyon', 'Tespit', 'Risk Seviyesi', 'Takip No'], bulgular.map(b => {
      const cv = b.madde.cevap;
      const uyg = ldBagliUygunsuzluk(cv.uygId);
      const riskNo = riskeAktarilanRiskNo('saha-lokasyon', ldRiskKaynakId(d.id, b.ziyaret.id, b.madde.anahtar));
      return [{ m: b.no, o: { kalin: true } }, `${b.ziyaret.bolum}\n${b.ziyaret.lokasyon}`, ldBulguTespiti(cv),
        { m: cv.risk || '-', o: { dolgu: _LDC_RISK_RENK[cv.risk] || undefined } },
        [uyg ? 'DÖF: ' + (uyg.aksiyonNo || '') : (cv.uygNo ? 'DÖF: ' + cv.uygNo : ''), riskNo ? 'Risk: ' + riskNo : ''].filter(Boolean).join('\n') || '-'];
    })));

    c.push(_ldcBaslik('4.2 Bulgu Ayrıntıları', 2));
    for (const b of bulgular) {
      const cv = b.madde.cevap;
      const uyg = ldBagliUygunsuzluk(cv.uygId);
      const riskNo = riskeAktarilanRiskNo('saha-lokasyon', ldRiskKaynakId(d.id, b.ziyaret.id, b.madde.anahtar));
      const fotoSayisi = (cv.fotolar || []).length;
      const fotoGen = fotoSayisi <= 1 ? 300 : fotoSayisi === 2 ? 220 : 150;
      const fotolar = (await Promise.all((cv.fotolar || []).map(f => _ldcGorsel(f, fotoGen, 200)))).filter(Boolean);
      const takip = uyg
        ? `DÖF ${uyg.aksiyonNo || ''} — Durum: ${uyg.durum || '-'}${uyg.sorumlu ? ' — Sorumlu: ' + uyg.sorumlu : ''}${uyg.termin ? ' — Termin: ' + _ldcTarih(uyg.termin) : ''}`
        : (cv.uygNo ? 'DÖF ' + cv.uygNo : 'Uygunsuzluk kaydı açılmadı');
      const satirlar = [
        [{ m: 'Kategori', o: { kalin: true, dolgu: _LDC_GRI } }, b.madde.kategori.ad],
        [{ m: 'Tespit', o: { kalin: true, dolgu: _LDC_GRI } }, { m: ldBulguTespiti(cv), o: { kalin: true } }],
        ldBulguKriteri(cv) ? [{ m: 'Kontrol Maddesi (Olması Gereken)', o: { kalin: true, dolgu: _LDC_GRI } }, { m: ldBulguKriteri(cv), o: { renk: '555555' } }] : null,
        [{ m: 'Mevzuat', o: { kalin: true, dolgu: _LDC_GRI } }, cv.m || '-'],
        [{ m: 'Önerilen Önlem', o: { kalin: true, dolgu: _LDC_GRI } }, cv.oneri || '-'],
        [{ m: 'Takip', o: { kalin: true, dolgu: _LDC_GRI } }, takip + (riskNo ? `\nRisk Değerlendirmesi: ${riskNo}` : '')]
      ].filter(Boolean);
      if (fotolar.length) {
        satirlar.push([{ m: [new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { before: 60, after: 60 }, children: fotolar.flatMap((f, i) => [new docx.ImageRun({ data: f.veri, transformation: { width: f.gen, height: f.yuk } }), ...(i < fotolar.length - 1 ? [_ldcRun('  ')] : [])]) })], o: { span: 2, dolgu: 'FFFFFF' } }]);
      }
      const baslikSatiri = [[{ m: `${b.no}   ${b.ziyaret.bolum} — ${b.ziyaret.lokasyon}`, o: { kalin: true, renk: 'FFFFFF', dolgu: _LDC_LACIVERT } }, { m: `Risk: ${cv.risk || 'Belirtilmedi'}`, o: { kalin: true, dolgu: _LDC_RISK_RENK[cv.risk] || 'D9D9D9', hiza: docx.AlignmentType.CENTER } }]];
      c.push(_ldcTablo([22, 78], null, baslikSatiri.concat(satirlar.map(s => s.map(h => (h && h.o) ? h : { m: h, o: { dolgu: 'FFFFFF' } })))));
      c.push(_ldcBosluk(200));
    }
  }

  // ---- 5. Acil durum ekipmanları ----
  c.push(_ldcBaslik('5. Acil Durum Ekipmanlarının Durumu', 1, true));
  const ekipmanli = d.ziyaretler.filter(z => (z.ekipmanOzeti || []).length);
  if (!ekipmanli.length) {
    c.push(_ldcP('Kontrol edilen lokasyonlarla eşleşen acil durum ekipmanı kaydı bulunmamaktadır (Acil Durum modülü).'));
  } else {
    const tum = ekipmanli.flatMap(z => z.ekipmanOzeti);
    const say = m => tum.filter(e => e.sonucMetni === m).length;
    c.push(_ldcP(`Kontrol edilen lokasyonlarda Acil Durum modülünde kayıtlı ${tum.length} acil durum ekipmanı bulunmaktadır. Periyodik kontrol kayıtlarına göre ${say('Uygun')} ekipman uygun; ${say('Uygunsuzluk var')} ekipmanda son kontrolde uygunsuzluk, ${say('Kontrol süresi geçmiş')} ekipmanda kontrol süresi aşımı, ${say('Kontrol kaydı yok')} ekipmanda kontrol kaydı eksikliği bulunmaktadır.`, null, { alignment: docx.AlignmentType.JUSTIFIED }));
    ekipmanli.forEach(z => {
      c.push(_ldcP(`${z.bolum} — ${z.lokasyon}  (kayıt tarihi: ${_ldcTarih(z.ekipmanOzetiTarihi)})`, { bold: true }, { spacing: { before: 160, after: 60 }, keepNext: true }));
      c.push(_ldcTablo([13, 18, 19, 12, 12, 26], ['Ekipman No', 'Tür', 'Yeri', 'Son Kontrol', 'Sonraki', 'Durum'], z.ekipmanOzeti.map(e => [
        e.ekipmanNo || '-', e.tur, e.lokasyon || '-', _ldcTarih(e.sonKontrol), _ldcTarih(e.sonrakiKontrol),
        { m: e.sonucMetni + (e.uygunDegil.length ? '\n' + e.uygunDegil.join('\n') : ''), o: { dolgu: e.sonucMetni === 'Uygun' ? 'E2EFDA' : (e.kontrolYok || e.gecikmis) ? 'F4CCCC' : 'FFF2CC', boy: 16 } }
      ])));
    });
  }

  // ---- 6. Genel değerlendirme ----
  c.push(_ldcBaslik('6. Genel Değerlendirme ve Sonuç', 1));
  const gd = (d.genelDegerlendirme || '').trim();
  if (gd) {
    gd.split(/\n+/).filter(Boolean).forEach(p => c.push(_ldcP(p, null, { alignment: docx.AlignmentType.JUSTIFIED })));
  } else {
    const yuksek = bulgular.filter(b => ['Tolerans Gösterilemez', 'Esaslı Risk'].includes(b.madde.cevap.risk)).length;
    c.push(_ldcP(bulgular.length
      ? `Kontrolde tespit edilen ${bulgular.length} uygunsuzluğun, risk seviyeleri dikkate alınarak öncelik sırasıyla giderilmesi gerekmektedir.${yuksek ? ` Bunlardan ${yuksek} adedi yüksek risk seviyesinde olup bu bulgulara ilişkin önlemlerin gecikmeksizin alınması, gerekli hallerde ilgili faaliyetin önlem alınıncaya kadar durdurulması gerekmektedir.` : ''} Alınan önlemlerin etkinliği bir sonraki saha kontrolünde değerlendirilmelidir.`
      : 'Kontrol edilen lokasyonlarda uygunsuzluk tespit edilmemiştir. Mevcut uygulamaların sürdürülmesi ve periyodik kontrollere devam edilmesi gerekmektedir.', null, { alignment: docx.AlignmentType.JUSTIFIED }));
  }

  // İmza
  c.push(_ldcBosluk(240));
  const imza = (baslik, ad) => [{ m: [
    new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [_ldcRun(baslik, { bold: true })] }),
    new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { before: 80 }, children: [_ldcRun(ad || 'Ad Soyad', { color: ad ? '000000' : '999999' })] }),
    new docx.Paragraph({ spacing: { before: 600 }, alignment: docx.AlignmentType.CENTER, children: [_ldcRun('İmza', { color: '999999', size: 16 })] })
  ], o: { dolgu: 'FFFFFF' } }];
  const denetciler = (d.denetciler || '').split(',').map(s => s.trim()).filter(Boolean);
  const imzaSatir = [imza('Kontrolü Yapan', denetciler[0] || ''), imza(denetciler[1] ? 'Kontrolü Yapan' : 'Bölüm Sorumlusu', denetciler[1] || ''), imza('İşveren / İşveren Vekili', '')].map(x => x[0]);
  c.push(_ldcTablo([33.3, 33.3, 33.4], null, [imzaSatir]));

  // ---- EK-1 kontrol listeleri ----
  d.ziyaretler.forEach((z, i) => {
    c.push(_ldcBaslik(`EK-1.${i + 1}  Kontrol Listesi: ${z.bolum} — ${z.lokasyon}`, 1, true));
    const s = ldZiyaretIstatistik(z);
    c.push(_ldcP(`Lokasyon kodu: ${z.kod || '-'}   |   Tarih: ${_ldcTarih(z.girisZamani)}   |   Uygunluk: ${s.puan == null ? '-' : '%' + s.puan}`, { size: 17, color: '555555' }));
    const satirlar = [];
    let sonKat = null;
    let no = 0;
    ldZiyaretMaddeleri(z).forEach(m => {
      if (m.kategori.id !== sonKat) {
        sonKat = m.kategori.id;
        satirlar.push([{ m: m.kategori.ad, o: { span: 4, kalin: true, dolgu: 'DCE3EC' } }]);
      }
      no++;
      const cv = m.cevap || {};
      const aciklama = [cv.not, cv.oneri ? 'Öneri: ' + cv.oneri : ''].filter(Boolean).join('\n');
      satirlar.push([String(no), { m: m.soru + (m.mevzuat ? '\n' + m.mevzuat : ''), o: { boy: 17 } }, _ldcSonucHucresi(cv.sonuc), { m: aciklama || '', o: { boy: 16 } }]);
    });
    c.push(_ldcTablo([6, 54, 14, 26], ['#', 'Kontrol Maddesi / Mevzuat', 'Sonuç', 'Tespit / Öneri'], satirlar));
    if (z.lokasyonNotu) c.push(_ldcP('Lokasyon notu: ' + z.lokasyonNotu, { italics: true }, { spacing: { before: 120 } }));
  });

  // ---- Üst / alt bilgi ----
  const ustBilgi = new docx.Header({ children: [new docx.Table({
    width: { size: _LDC_SAYFA_GEN, type: docx.WidthType.DXA },
    columnWidths: [Math.round(_LDC_SAYFA_GEN * 0.4), Math.round(_LDC_SAYFA_GEN * 0.6)],
    borders: (() => {
      const yok = { style: docx.BorderStyle.NONE, size: 0, color: 'FFFFFF' };
      return { top: yok, left: yok, right: yok, insideVertical: yok, insideHorizontal: yok, bottom: { style: docx.BorderStyle.SINGLE, size: 6, color: _LDC_LACIVERT } };
    })(),
    rows: [new docx.TableRow({ children: [
      new docx.TableCell({ width: { size: Math.round(_LDC_SAYFA_GEN * 0.4), type: docx.WidthType.DXA }, verticalAlign: docx.VerticalAlign.CENTER, children: [new docx.Paragraph({ children: logo
        ? [new docx.ImageRun({ data: logo.veri, transformation: { width: logo.gen, height: logo.yuk } })]
        : [_ldcRun(firma ? firma.ad : '', { bold: true, size: 18, color: _LDC_LACIVERT })] })] }),
      new docx.TableCell({ width: { size: Math.round(_LDC_SAYFA_GEN * 0.6), type: docx.WidthType.DXA }, verticalAlign: docx.VerticalAlign.CENTER, children: [
        new docx.Paragraph({ alignment: docx.AlignmentType.RIGHT, children: [_ldcRun('SAHA KONTROL RAPORU', { bold: true, size: 18, color: _LDC_LACIVERT })] }),
        new docx.Paragraph({ alignment: docx.AlignmentType.RIGHT, spacing: { after: 60 }, children: [_ldcRun(`${d.denetimNo}  |  ${tarihMetni}`, { size: 16, color: '555555' })] })
      ] })
    ] })]
  })] });
  const altBilgi = new docx.Footer({ children: [new docx.Paragraph({
    alignment: docx.AlignmentType.CENTER,
    children: [new docx.TextRun({ size: 16, color: '777777', font: 'Calibri', children: ['Sayfa ', docx.PageNumber.CURRENT, ' / ', docx.PageNumber.TOTAL_PAGES] })]
  })] });

  const belge = new docx.Document({
    creator: 'İSG Platform',
    title: `Saha Kontrol Raporu ${d.denetimNo}`,
    styles: { default: { document: { run: { font: 'Calibri', size: 19 } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1300, bottom: 1000, left: 1021, right: 1021, header: 500, footer: 450 } } },
      headers: { default: ustBilgi },
      footers: { default: altBilgi },
      children: c
    }]
  });
  const blob = await docx.Packer.toBlob(belge);
  saveAs(blob, `Saha_Kontrol_Raporu_${d.denetimNo}_${(firma ? firma.ad : 'firma').replace(/[^\p{L}\p{N}]+/gu, '_')}.docx`);
}
