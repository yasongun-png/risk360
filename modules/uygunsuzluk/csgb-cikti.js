// ÇSGB Denetimi çıktıları: Excel, Takip Raporu (Word / tıklanabilir PDF),
// Toplantı Tutanağı (Word), Toplantı Sunumu (PPTX).

function _csgbKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// ==================== EXCEL ====================
// İçe aktarım şablonu ve dışa aktarım aynı başlıkları kullanır: dışa aktarılan
// dosya düzenlenip geri içe aktarılabilir (aynı Madde No güncellenir).
// "Toplantı Notları" ve "Kanıtlar" sütunları sadece bilgi içindir, içe
// aktarımda yok sayılır.
const CSGB_EXCEL_KOLONLARI = [
  { anahtar: 'denetimMaddeNo', baslik: 'Madde No', esanlamlar: ['Uygunsuzluk No', 'No', 'Rapor Madde No'] },
  { anahtar: 'maddeKonusu', baslik: 'Uygunsuzluk Konusu', esanlamlar: ['Konu', 'Kısa Konu'] },
  { anahtar: 'baslik', baslik: 'Uygunsuzluk Tanımı', esanlamlar: ['Uygunsuzluk', 'Tespit', 'Uygunsuzluk Metni'] },
  { anahtar: 'duzelticiFaaliyet', baslik: 'Gerekli Tedbir', esanlamlar: ['Faaliyet Önerisi', 'Alınması Gerekli Tedbir', 'Ek Açıklama'] },
  { anahtar: 'yasalDayanak', baslik: 'Mevzuat', esanlamlar: ['Yasal Dayanak', 'Mevzuat Dayanağı'] },
  { anahtar: 'bolum', baslik: 'Bölüm', esanlamlar: ['Tesis / Birim'] },
  { anahtar: 'sorumlu', baslik: 'Sorumlu' },
  { anahtar: 'termin', baslik: 'Termin' },
  { anahtar: 'durum', baslik: 'Tamamlanma Durumu', esanlamlar: ['Durum'] },
  { anahtar: 'tamamlanmaYuzdesi', baslik: 'Tamamlanma Yüzdesi', esanlamlar: ['Tamamlanma %', 'Yüzde', 'İlerleme'] },
  { anahtar: 'kapanisTarihi', baslik: 'Tamamlanma Tarihi', esanlamlar: ['Kapanış Tarihi'] },
  { anahtar: 'kanitAciklamasi', baslik: 'Kapanış Açıklaması' }
];

function csgbExcelDisaAktar(denetimId) {
  const d = csgbDenetimGetir(denetimId);
  const satirlar = csgbMaddeleriniGetir(denetimId).map(k => Object.assign({}, k, {
    toplantiNotlari: k.toplantiNotlari.map(n => gunAyYil(n.tarih) + ': ' + n.not).join('\n'),
    kanitlar: (k.kanitlar || []).map(x => x.ad).join(', '),
    termin: gunAyYil(k.termin),
    durum: csgbDurumEtiketi(k.durum),
    tamamlanmaYuzdesi: '%' + k.yuzde,
    kapanisTarihi: gunAyYil(k.kapanisTarihi)
  }));
  const kolonlar = CSGB_EXCEL_KOLONLARI.slice(0, 5).concat(
    [{ anahtar: 'toplantiNotlari', baslik: 'Toplantı Notları' }, { anahtar: 'kanitlar', baslik: 'Kanıtlar' }],
    CSGB_EXCEL_KOLONLARI.slice(5)
  );
  excelDisaAktar(satirlar, kolonlar, 'CSGB_Takip_' + (d ? (d.raporTarihi || d.denetimTarihi || '') : '') + '.xlsx');
}

// ==================== FOTOĞRAF YARDIMCILARI ====================
// (uygunsuzluk/cikti.js'teki _ucWordFotoVerisi / fotoSigdirNesnesi ile aynı
// mantık; bu sayfa o dosyayı yüklemediği için kendi kopyası.)

// Fotoğrafı kutuyu dolduracak şekilde ortadan kırpıp JPEG baytlarına çevirir (Word için).
async function _csgbWordFotoVerisi(url, genPx, yukPx) {
  if (!url) return null;
  try {
    const blob = await (await fetch(url)).blob();
    const img = await new Promise((coz, red) => { const i = new Image(); i.onload = () => coz(i); i.onerror = red; i.src = URL.createObjectURL(blob); });
    const hedefOran = genPx / yukPx;
    let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
    if (sw / sh > hedefOran) { sw = sh * hedefOran; sx = (img.naturalWidth - sw) / 2; }
    else { sh = sw / hedefOran; sy = (img.naturalHeight - sh) / 2; }
    const canvas = document.createElement('canvas');
    canvas.width = genPx * 2; canvas.height = yukPx * 2;
    canvas.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    const jpeg = await new Promise(coz => canvas.toBlob(coz, 'image/jpeg', 0.8));
    return new Uint8Array(await jpeg.arrayBuffer());
  } catch (e) {
    console.error('ÇSGB fotoğrafı Word raporuna eklenemedi:', e);
    return null;
  }
}

const _csgbFotoOlcu = new Map();
async function _csgbFotoOlculeriniHazirla(urller, ...digerleri) {
  const liste = [].concat(urller || [], digerleri).filter(u => u && !_csgbFotoOlcu.has(u));
  await Promise.all(liste.map(u => new Promise(coz => {
    const im = new Image();
    im.onload = () => { _csgbFotoOlcu.set(u, { w: im.naturalWidth, h: im.naturalHeight }); coz(); };
    im.onerror = () => { _csgbFotoOlcu.set(u, null); coz(); };
    im.src = u;
  })));
}

// x,y,w,h kutusuna oranı bozmadan, ortalanmış PPTX addImage seçenekleri.
function _csgbFotoSigdir(url, x, y, w, h) {
  const kaynak = /^https?:\/\//i.test(url) ? { path: url } : { data: url };
  const o = _csgbFotoOlcu.get(url);
  if (!o || !o.w || !o.h) return Object.assign(kaynak, { x, y, w, h, sizing: { type: 'contain', w, h } });
  const oran = Math.min(w / o.w, h / o.h);
  const iw = o.w * oran, ih = o.h * oran;
  return Object.assign(kaynak, { x: x + (w - iw) / 2, y: y + (h - ih) / 2, w: iw, h: ih });
}

// ==================== WORD ÇIKTILARI ====================

// Bir fotoğraf işlenemezse (ağ/izin) rapor süresiz beklemesin: süre dolunca null.
function _csgbZamanSinirli(soz, ms) {
  return Promise.race([soz.catch(() => null), new Promise(coz => setTimeout(() => coz(null), ms))]);
}

function _csgbWordAraclari() {
  const mm = v => Math.round(v * 56.7);
  const px = v => Math.round(v * 96 / 25.4);
  const kenar = { style: docx.BorderStyle.SINGLE, size: 4, color: '94A3B8' };
  const kenarlar = { top: kenar, bottom: kenar, left: kenar, right: kenar };
  const metin = (text, o = {}) => new docx.TextRun(Object.assign({ text: String(text ?? ''), font: 'Arial', color: '111827' }, o));
  // Çok satırlı metni (\n) ayrı paragraflara böler.
  const paragraflar = (deger, o = {}) => String(deger ?? '').split('\n').map(s => new docx.Paragraph({ spacing: { after: 40 }, children: [metin(s, Object.assign({ size: 16 }, o))] }));
  const hucre = (cocuklar, genislik, opts = {}) => new docx.TableCell(Object.assign({
    width: { size: genislik, type: docx.WidthType.DXA },
    margins: { top: 50, bottom: 50, left: 70, right: 70 },
    borders: kenarlar,
    children: Array.isArray(cocuklar) ? cocuklar : [cocuklar]
  }, opts));
  const baslikHucre = (t, genislik) => hucre(new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [metin(t.toLocaleUpperCase('tr'), { bold: true, size: 15 })] }), genislik, {
    shading: { fill: 'E5E7EB', color: 'auto', type: docx.ShadingType.CLEAR }, verticalAlign: docx.VerticalAlign.CENTER
  });
  const altBilgi = new docx.Footer({ children: [new docx.Paragraph({
    alignment: docx.AlignmentType.CENTER,
    children: [new docx.TextRun({ children: ['Sayfa ', docx.PageNumber.CURRENT, ' / ', docx.PageNumber.TOTAL_PAGES], size: 16, color: '646464', font: 'Arial' })]
  })] });
  // Etiket | değer çiftlerinden oluşan bilgi tablosu (2 çift / satır).
  const bilgiTablosu = (ciftler, sayfaGen) => {
    const g = [0.17, 0.33, 0.17, 0.33].map(o => Math.round(sayfaGen * o));
    const satirlar = [];
    for (let i = 0; i < ciftler.length; i += 2) {
      const [a, b] = [ciftler[i], ciftler[i + 1] || ['', '']];
      satirlar.push(new docx.TableRow({ children: [
        hucre(new docx.Paragraph({ children: [metin(a[0], { bold: true, size: 17 })] }), g[0], { shading: { fill: 'F3F4F6', color: 'auto', type: docx.ShadingType.CLEAR } }),
        hucre(new docx.Paragraph({ children: [metin(a[1], { size: 17 })] }), g[1]),
        hucre(new docx.Paragraph({ children: [metin(b[0], { bold: true, size: 17 })] }), g[2], { shading: { fill: 'F3F4F6', color: 'auto', type: docx.ShadingType.CLEAR } }),
        hucre(new docx.Paragraph({ children: [metin(b[1], { size: 17 })] }), g[3])
      ] }));
    }
    return new docx.Table({ width: { size: sayfaGen, type: docx.WidthType.DXA }, columnWidths: g, layout: docx.TableLayoutType.FIXED, rows: satirlar });
  };
  return { mm, px, metin, paragraflar, hucre, baslikHucre, altBilgi, bilgiTablosu };
}

function _csgbDenetimBilgileri(d) {
  return [
    ['Rapor No', d.raporNo || '-'], ['Rapor Tarihi', gunAyYil(d.raporTarihi) || '-'],
    ['Denetim Türü', d.denetimTuru || '-'], ['Denetim Tarihi', gunAyYil(d.denetimTarihi) || '-'],
    ['Tebliğ Tarihi', gunAyYil(d.tebligTarihi) || '-'], ['Verilen Süre', d.verilenSureGun ? d.verilenSureGun + ' gün' : '-'],
    ['Son Giderme Tarihi', gunAyYil(d.sonGidermeTarihi) || '-'], ['Müfettiş(ler)', d.mufettisler || '-']
  ];
}

// Takip raporu: yatay A4. Ana tablo kısa tutulur (No, Konu, Tespit, Toplantı
// Notları, Kanıt, Termin, Sorumlu, Durum); uzun metinler (gerekli tedbir,
// mevzuat) ve kanıt fotoğrafları istenirse "Ek" bölümünde madde madde verilir.
async function csgbTakipRaporuWordOlustur(denetimId, tamMetinEki) {
  const d = csgbDenetimGetir(denetimId);
  const maddeler = csgbMaddeleriniGetir(denetimId);
  if (!maddeler.length) { alert('Bu denetimde henüz madde yok.'); return; }
  const w = _csgbWordAraclari();
  const bugun = gunAyYil(bugunIso());
  const SAYFA_GEN = w.mm(297 - 20);
  const SUTUN = [5, 12, 27, 24, 9, 7, 9, 7].map(y => Math.round(SAYFA_GEN * y / 100));

  const satir = k => new docx.TableRow({ cantSplit: true, children: [
    w.hucre(new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [w.metin(k.denetimMaddeNo || '-', { bold: true, size: 16 })] }), SUTUN[0]),
    w.hucre(w.paragraflar(k.maddeKonusu || '-', { bold: true }), SUTUN[1]),
    w.hucre(w.paragraflar(k.baslik), SUTUN[2]),
    w.hucre(k.toplantiNotlari.length
      ? k.toplantiNotlari.map(n => new docx.Paragraph({ spacing: { after: 50 }, children: [w.metin(gunAyYil(n.tarih) + ': ', { bold: true, size: 15 }), w.metin(n.not, { size: 15 })] }))
      : [new docx.Paragraph({ children: [w.metin('-', { size: 15 })] })], SUTUN[3]),
    w.hucre((k.kanitlar || []).length
      ? k.kanitlar.map(x => new docx.Paragraph({ children: [w.metin('• ' + x.ad, { size: 14 })] }))
      : [new docx.Paragraph({ children: [w.metin('-', { size: 15 })] })], SUTUN[4]),
    w.hucre(new docx.Paragraph({ children: [w.metin(gunAyYil(k.termin) || '-', { size: 15 })] }), SUTUN[5]),
    w.hucre(w.paragraflar(k.sorumlu || '-', { size: 15 }), SUTUN[6]),
    w.hucre([
      new docx.Paragraph({ children: [w.metin(csgbDurumEtiketi(k.durumGoruntu), { bold: true, size: 15, color: k.durum === 'Kapalı' ? '15803D' : (k.durumGoruntu === 'Gecikmiş' ? 'B91C1C' : '111827') })] }),
      new docx.Paragraph({ children: [w.metin('%' + k.yuzde, { size: 15, color: '374151' })] }),
      ...(k.durum === 'Kapalı' && k.kapanisTarihi ? [new docx.Paragraph({ children: [w.metin(gunAyYil(k.kapanisTarihi), { size: 14, color: '64748B' })] })] : [])
    ], SUTUN[7])
  ] });

  const BASLIKLAR = ['No', 'Uygunsuzluk Konusu', 'Uygunsuzluk', 'Toplantı Notları', 'Kanıtlar', 'Termin', 'Sorumlu', 'Durum'];
  const anaTablo = new docx.Table({
    width: { size: SAYFA_GEN, type: docx.WidthType.DXA },
    columnWidths: SUTUN,
    layout: docx.TableLayoutType.FIXED,
    rows: [new docx.TableRow({ tableHeader: true, children: BASLIKLAR.map((b, i) => w.baslikHucre(b, SUTUN[i])) }), ...maddeler.map(satir)]
  });

  const toplantilar = csgbToplantilariniGetir(denetimId);
  const ozetMetni = `Toplam ${maddeler.length} madde · Tamamlanan ${d.kapaliSayisi} · Açık ${d.acikSayisi} · Gecikmiş ${d.gecikmisSayisi} · İlerleme %${d.ilerlemeYuzde} · Takip toplantısı ${toplantilar.length}` +
    (toplantilar.length ? ` (${toplantilar.map((t, i) => (i + 1) + '. ' + gunAyYil(t.tarih)).join(', ')})` : '');

  // Firma adı Word/PDF çıktılarına yazılmaz (kullanıcı isteği).
  const ilkBolum = [
    new docx.Paragraph({ spacing: { after: w.mm(3) }, border: { bottom: { style: docx.BorderStyle.SINGLE, size: 12, color: '111827', space: 4 } },
      children: [w.metin('ÇSGB DENETİMİ UYGUNSUZLUK GİDERME TAKİP RAPORU', { bold: true, size: 28 })] }),
    w.bilgiTablosu(_csgbDenetimBilgileri(d), SAYFA_GEN),
    new docx.Paragraph({ spacing: { before: w.mm(3), after: w.mm(3) }, children: [w.metin(ozetMetni, { bold: true, size: 18 })] }),
    anaTablo,
    new docx.Paragraph({ alignment: docx.AlignmentType.RIGHT, spacing: { before: w.mm(4) }, children: [w.metin('Rapor Tarihi: ' + bugun, { size: 16, color: '374151' })] })
  ];

  const sayfa = { size: { orientation: docx.PageOrientation.LANDSCAPE }, margin: { top: w.mm(10), right: w.mm(10), bottom: w.mm(12), left: w.mm(10), footer: w.mm(4) } };
  const bolumler = [{ properties: { page: sayfa }, footers: { default: w.altBilgi }, children: ilkBolum }];

  if (tamMetinEki) {
    const FOTO_GEN = w.px(60), FOTO_YUK = w.px(45);
    const ek = [new docx.Paragraph({ spacing: { after: w.mm(3) }, border: { bottom: { style: docx.BorderStyle.SINGLE, size: 12, color: '111827', space: 4 } },
      children: [w.metin('EK: MADDELERİN TAM METNİ VE KANITLAR', { bold: true, size: 26 })] })];
    for (const k of maddeler) {
      ek.push(new docx.Paragraph({ keepNext: true, spacing: { before: w.mm(4), after: 60 }, children: [
        w.metin(`Madde ${k.denetimMaddeNo || '-'}`, { bold: true, size: 20 }),
        w.metin(k.maddeKonusu ? ' — ' + k.maddeKonusu : '', { bold: true, size: 20 }),
        w.metin('   [' + csgbDurumEtiketi(k.durumGoruntu) + ']', { size: 16, color: '374151' })
      ] }));
      ek.push(...w.paragraflar(k.baslik, { bold: true, size: 18 }));
      if (k.aciklama) ek.push(...w.paragraflar(k.aciklama, { size: 17 }));
      if (k.duzelticiFaaliyet) ek.push(new docx.Paragraph({ spacing: { before: 60 }, children: [w.metin('Gerekli tedbir: ', { bold: true, size: 17 }), w.metin(k.duzelticiFaaliyet, { size: 17 })] }));
      if (k.yasalDayanak) ek.push(new docx.Paragraph({ spacing: { before: 60 }, children: [w.metin('Mevzuat: ', { bold: true, size: 17 }), w.metin(k.yasalDayanak, { size: 17, color: '374151' })] }));
      if (k.kanitAciklamasi) ek.push(new docx.Paragraph({ spacing: { before: 60 }, children: [w.metin('Kapanış açıklaması: ', { bold: true, size: 17 }), w.metin(k.kanitAciklamasi, { size: 17 })] }));
      const kanitlar = k.kanitlar || [];
      if (kanitlar.length) {
        ek.push(new docx.Paragraph({ spacing: { before: 60 }, children: [w.metin('Kanıtlar: ', { bold: true, size: 17 }), w.metin(kanitlar.map(x => x.ad + (x.tur === 'pdf' ? ' (PDF)' : '')).join(', '), { size: 17 })] }));
        // Fotoğraf kanıtları 4'lü sıralar halinde küçük görsel olarak.
        const fotolar = [];
        for (const x of kanitlar.filter(x => x.tur === 'foto')) {
          const url = await fotoBuyukCoz(x.ref);
          const veri = url ? await _csgbZamanSinirli(_csgbWordFotoVerisi(url, FOTO_GEN, FOTO_YUK), 10000) : null;
          if (veri) fotolar.push(new docx.ImageRun({ data: veri, transformation: { width: FOTO_GEN, height: FOTO_YUK } }));
        }
        for (let i = 0; i < fotolar.length; i += 4) {
          const grup = [];
          fotolar.slice(i, i + 4).forEach((f, j) => { if (j) grup.push(w.metin('   ')); grup.push(f); });
          ek.push(new docx.Paragraph({ spacing: { before: 80 }, children: grup }));
        }
      }
    }
    bolumler.push({ properties: { page: sayfa }, footers: { default: w.altBilgi }, children: ek });
  }

  const doc = new docx.Document({ styles: { default: { document: { run: { font: 'Arial', size: 16 } } } }, sections: bolumler });
  const blob = await docx.Packer.toBlob(doc);
  saveAs(blob, `CSGB_Takip_Raporu_${bugun.replace(/\./g, '-')}.docx`);
}

// ==================== TAKİP RAPORU (PDF, tıklanabilir) ====================
// Yatay A4. Ana tabloda madde metni kısaltılır; satıra tıklanınca PDF içinde
// o maddenin tam metninin (tedbir, mevzuat, toplantı notları, kanıtlar) olduğu
// ek sayfaya gidilir, oradaki "↑ Tabloya dön" ile geri dönülür. Sayfalar
// html2canvas ile görüntüye çevrilir (Türkçe karakterler sorunsuz), bağlantılar
// jsPDF link() ile görüntünün üstüne eklenir.
async function csgbTakipRaporuPdfOlustur(denetimId) {
  if (!window.jspdf || typeof html2canvas === 'undefined') { alert('PDF kütüphanesi yüklenemedi (internet bağlantısını kontrol edin).'); return; }
  const d = csgbDenetimGetir(denetimId);
  const maddeler = csgbMaddeleriniGetir(denetimId);
  if (!maddeler.length) { alert('Bu denetimde henüz madde yok.'); return; }
  const bugun = gunAyYil(bugunIso());
  const toplantilar = csgbToplantilariniGetir(denetimId);
  const K = _csgbKacir;
  const kisalt = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; };
  const W = 1123, H = 794, PAD = 32, ALT = 40;
  const DURUM_RENK = { 'Tamamlandı': '#15803d', 'Gecikmiş': '#b91c1c', 'Açık': '#b45309', 'Devam Ediyor': '#1d4ed8', 'Onay Bekliyor': '#7c3aed', 'İptal': '#64748b' };

  // Fotoğraf kanıtlarını önceden data URL'e çevir (html2canvas CORS sorunu yaşamasın).
  const fotoVeri = {};
  await Promise.all(maddeler.flatMap(k => (k.kanitlar || []).filter(x => x.tur === 'foto').map(async x => {
    const url = await _csgbZamanSinirli(fotoBuyukCoz(x.ref), 10000);
    if (!url) return;
    if (url.startsWith('data:')) { fotoVeri[x.ref] = url; return; }
    fotoVeri[x.ref] = await _csgbZamanSinirli(fetch(url).then(r => r.blob()).then(b => new Promise(coz => { const o = new FileReader(); o.onload = () => coz(o.result); o.readAsDataURL(b); })), 10000);
  })));

  const kap = document.createElement('div');
  kap.style.cssText = `position:fixed; left:-30000px; top:0; width:${W}px; font-family:Arial, Helvetica, sans-serif; color:#111827;`;
  kap.innerHTML = `<style>
    .cp-sayfa { width:${W}px; height:${H}px; padding:${PAD}px ${PAD}px ${ALT}px; box-sizing:border-box; position:relative; background:#fff; overflow:hidden; }
    .cp-ic { height:${H - PAD - ALT}px; overflow:hidden; }
    .cp-alt { position:absolute; left:${PAD}px; right:${PAD}px; bottom:12px; font-size:10px; color:#64748b; display:flex; justify-content:space-between; }
    .cp-tablo { width:100%; border-collapse:collapse; table-layout:fixed; font-size:10.5px; }
    .cp-tablo th { background:#e5e7eb; border:1px solid #94a3b8; padding:5px 4px; font-size:9.5px; text-transform:uppercase; }
    .cp-tablo td { border:1px solid #cbd5e1; padding:4px 5px; vertical-align:top; line-height:1.35; }
    .cp-tablo tr.cp-satir td:nth-child(-n+3) { color:#1d4ed8; }
    .cp-bilgi { width:100%; border-collapse:collapse; font-size:11px; margin-bottom:8px; }
    .cp-bilgi td { border:1px solid #cbd5e1; padding:4px 6px; }
    .cp-bilgi td:nth-child(odd) { background:#f3f4f6; font-weight:bold; width:15%; }
    .cp-ek { font-size:11.5px; line-height:1.45; margin-bottom:8px; }
    .cp-ek-bas { border-top:2px solid #111827; padding-top:6px; margin-top:6px; display:flex; justify-content:space-between; align-items:baseline; gap:10px; }
    .cp-foto { height:150px; max-width:220px; object-fit:contain; border:1px solid #cbd5e1; margin:0 8px 6px 0; }
  </style>`;
  document.body.appendChild(kap);

  const sayfalar = [];
  const yeniSayfa = () => {
    const s = document.createElement('div');
    s.className = 'cp-sayfa';
    s.innerHTML = '<div class="cp-ic"></div><div class="cp-alt"></div>';
    kap.appendChild(s);
    sayfalar.push(s);
    return s.querySelector('.cp-ic');
  };
  const tasti = ic => ic.scrollHeight > ic.clientHeight + 1;

  try {
    // ---- Ana tablo sayfaları ----
    const SUTUN = [5, 12, 30, 25, 8, 7, 8, 5];
    const tabloBasi = () => `<table class="cp-tablo"><colgroup>${SUTUN.map(y => `<col style="width:${y}%">`).join('')}</colgroup>
      <thead><tr>${['No', 'Uygunsuzluk Konusu', 'Uygunsuzluk', 'Toplantı Notları', 'Kanıt', 'Termin', 'Sorumlu', 'Durum'].map(b => `<th>${b}</th>`).join('')}</tr></thead><tbody></tbody></table>`;
    let ic = yeniSayfa();
    ic.innerHTML = `
      <div style="font-size:19px; font-weight:bold; border-bottom:2px solid #111827; padding-bottom:4px; margin-bottom:8px;">ÇSGB DENETİMİ UYGUNSUZLUK GİDERME TAKİP RAPORU</div>
      <table class="cp-bilgi">${_csgbDenetimBilgileri(d).reduce((a, c, i, arr) => i % 2 ? a : a + `<tr><td>${K(c[0])}</td><td>${K(c[1])}</td><td>${K((arr[i + 1] || ['', ''])[0])}</td><td>${K((arr[i + 1] || ['', ''])[1])}</td></tr>`, '')}</table>
      <div style="font-size:12px; font-weight:bold; margin-bottom:4px;">Toplam ${maddeler.length} madde · Tamamlanan ${d.kapaliSayisi} · Açık ${d.acikSayisi} · Gecikmiş ${d.gecikmisSayisi} · İlerleme %${d.ilerlemeYuzde} · Takip toplantısı ${toplantilar.length}</div>
      <div style="font-size:10.5px; color:#1d4ed8; margin-bottom:6px;">Maddenin satırına tıklayarak tam metnine (gerekli tedbir, mevzuat, tüm toplantı notları ve kanıtlar) gidebilirsiniz.</div>
      ${tabloBasi()}`;
    let govde = ic.querySelector('.cp-tablo tbody');
    const satirKonum = {}; // maddeId -> sayfa index (ana tablo)
    maddeler.forEach(k => {
      const durum = csgbDurumEtiketi(k.durumGoruntu);
      const tr = document.createElement('tr');
      tr.className = 'cp-satir';
      tr.setAttribute('data-madde', k.id);
      tr.innerHTML = `
        <td style="font-weight:bold; text-align:center;">${K(k.denetimMaddeNo || '-')}</td>
        <td style="font-weight:bold;">${K(k.maddeKonusu || '-')}</td>
        <td>${K(kisalt(k.baslik, 330))}</td>
        <td>${k.toplantiNotlari.length ? k.toplantiNotlari.map(n => `<div><b>${gunAyYil(n.tarih)}:</b> ${K(kisalt(n.not, 260))}</div>`).join('') : '-'}</td>
        <td>${(k.kanitlar || []).length ? (k.kanitlar.length + ' kanıt') : '-'}</td>
        <td>${gunAyYil(k.termin) || '-'}</td>
        <td>${K(k.sorumlu || '-')}</td>
        <td style="font-weight:bold; color:${DURUM_RENK[durum] || '#111827'};">${K(durum)}<div style="font-weight:normal; color:#374151;">%${k.yuzde}</div><div style="height:5px; background:#e5e7eb; border-radius:3px; margin-top:2px;"><div style="height:5px; width:${k.yuzde}%; background:#16a34a; border-radius:3px;"></div></div>${k.durum === 'Kapalı' && k.kapanisTarihi ? `<div style="font-weight:normal; color:#64748b;">${gunAyYil(k.kapanisTarihi)}</div>` : ''}</td>`;
      govde.appendChild(tr);
      if (tasti(ic) && govde.children.length > 1) {
        govde.removeChild(tr);
        ic = yeniSayfa();
        ic.innerHTML = tabloBasi();
        govde = ic.querySelector('.cp-tablo tbody');
        govde.appendChild(tr);
      }
      satirKonum[k.id] = sayfalar.length - 1;
    });

    // ---- Ek: tam metinler ----
    const ekKonum = {}; // maddeId -> sayfa index (ek)
    ic = yeniSayfa();
    ic.innerHTML = '<div style="font-size:17px; font-weight:bold; border-bottom:2px solid #111827; padding-bottom:4px; margin-bottom:6px;">EK: MADDELERİN TAM METNİ, TOPLANTI NOTLARI VE KANITLAR</div>';
    const ekle = (html, bas) => {
      const el = document.createElement('div');
      el.className = 'cp-ek';
      el.innerHTML = html;
      ic.appendChild(el);
      if (tasti(ic) && ic.children.length > 1) {
        ic.removeChild(el);
        ic = yeniSayfa();
        ic.appendChild(el);
      }
      return el;
    };
    for (const k of maddeler) {
      const durum = csgbDurumEtiketi(k.durumGoruntu);
      // Başlık ile tespit metni tek blok: başlık sayfa sonunda yalnız kalmasın.
      const bas = ekle(`
        <div class="cp-ek-bas" data-ek="${k.id}">
          <div style="font-size:14px; font-weight:bold;">Madde ${K(k.denetimMaddeNo || '-')}${k.maddeKonusu ? ' — ' + K(k.maddeKonusu) : ''}
            <span style="font-size:11px; color:${DURUM_RENK[durum] || '#111827'};">[${K(durum)}]</span></div>
          <div data-geri="${k.id}" style="font-size:10.5px; color:#1d4ed8; white-space:nowrap;">↑ Tabloya dön</div>
        </div>
        <div style="font-weight:bold; margin-top:4px; white-space:pre-wrap;">${K(k.baslik)}</div>
        <div style="color:#374151; margin-top:2px;">Sorumlu: ${K(k.sorumlu || '-')} · Termin: ${gunAyYil(k.termin) || '-'}${k.kapanisTarihi && k.durum === 'Kapalı' ? ' · Tamamlanma: ' + gunAyYil(k.kapanisTarihi) : ''}</div>`);
      ekKonum[k.id] = sayfalar.indexOf(bas.closest('.cp-sayfa'));
      if (k.aciklama) ekle(`<div style="white-space:pre-wrap;">${K(k.aciklama)}</div>`);
      if (k.duzelticiFaaliyet) ekle(`<b>Gerekli tedbir:</b> <span style="white-space:pre-wrap;">${K(k.duzelticiFaaliyet)}</span>`);
      if (k.yasalDayanak) ekle(`<b>Mevzuat:</b> <span style="color:#374151;">${K(k.yasalDayanak)}</span>`);
      if (k.toplantiNotlari.length) ekle(`<b>Toplantı notları:</b>${k.toplantiNotlari.map(n => `<div style="margin-left:10px;"><b>${gunAyYil(n.tarih)}:</b> <span style="white-space:pre-wrap;">${K(n.not)}</span></div>`).join('')}`);
      if (k.kanitAciklamasi) ekle(`<b>Kapanış açıklaması:</b> ${K(k.kanitAciklamasi)}`);
      const kanitlar = k.kanitlar || [];
      if (kanitlar.length) {
        ekle(`<b>Kanıtlar:</b> ${kanitlar.map(x => K(x.ad) + (x.tur === 'pdf' ? ' (PDF)' : '')).join(', ')}`);
        const fotolar = kanitlar.filter(x => x.tur === 'foto' && fotoVeri[x.ref]);
        for (let i = 0; i < fotolar.length; i += 4) {
          const el = ekle(fotolar.slice(i, i + 4).map(x => `<img class="cp-foto" src="${fotoVeri[x.ref]}">`).join(''));
          await Promise.all(Array.from(el.querySelectorAll('img')).map(im => _csgbZamanSinirli(im.decode(), 5000)));
          if (tasti(ic) && ic.children.length > 1) { ic.removeChild(el); ic = yeniSayfa(); ic.appendChild(el); }
        }
      }
    }

    // ---- Alt bilgi ----
    sayfalar.forEach((s, i) => {
      s.querySelector('.cp-alt').innerHTML = `<span>ÇSGB Denetimi Takip Raporu · ${bugun}</span><span>Sayfa ${i + 1} / ${sayfalar.length}</span>`;
    });

    // ---- PDF ----
    const pdf = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const MM = 297 / W;
    for (let i = 0; i < sayfalar.length; i++) {
      const s = sayfalar[i];
      const tuval = await html2canvas(s, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
      if (i) pdf.addPage();
      pdf.addImage(tuval.toDataURL('image/jpeg', 0.85), 'JPEG', 0, 0, 297, 210);
      const sk = s.getBoundingClientRect();
      const bag = (el, hedef) => {
        const r = el.getBoundingClientRect();
        pdf.link((r.left - sk.left) * MM, (r.top - sk.top) * MM, r.width * MM, r.height * MM, { pageNumber: hedef + 1 });
      };
      s.querySelectorAll('tr.cp-satir').forEach(tr => { const id = tr.getAttribute('data-madde'); if (ekKonum[id] !== undefined) bag(tr, ekKonum[id]); });
      s.querySelectorAll('[data-geri]').forEach(el => { const id = el.getAttribute('data-geri'); if (satirKonum[id] !== undefined) bag(el, satirKonum[id]); });
    }
    pdf.save(`CSGB_Takip_Raporu_${bugun.replace(/\./g, '-')}.pdf`);
  } finally {
    kap.remove();
  }
}

// ==================== TOPLANTI SUNUMU (PPTX) ====================
// Kurul/Uygunsuzluk PPTX'iyle aynı görsel dil (bkz. cikti.js
// uygunsuzlukKurulPptxOlustur). Gündem = açık maddeler + bu toplantıda notu
// olan maddeler; tamamlananlar sonda tek bir özet tabloda "Tamamlandı" olarak.
// toplantiId null ise (henüz toplantı kaydı yok) bir sonraki toplantının
// gündemi olarak üretilir.
async function csgbToplantiPptxOlustur(denetimId, toplantiId) {
  if (typeof PptxGenJS === 'undefined') { alert('PPTX kütüphanesi yüklenemedi (internet bağlantısını kontrol edin).'); return; }
  const d = csgbDenetimGetir(denetimId);
  if (!d) return;
  const t = toplantiId ? csgbToplantilariTumunuGetir().find(x => x.id === toplantiId) : null;
  const toplantiNo = t ? csgbToplantiNo(t) : 0;
  const maddeler = csgbMaddeleriniGetir(denetimId);
  if (!maddeler.length) { alert('Bu denetimde henüz madde yok.'); return; }
  const gundem = maddeler.filter(k => (k.durum !== 'Kapalı' && k.durum !== 'İptal') || (t && (t.maddeNotlari[k.id] || '').trim()));
  const tamamlananlar = maddeler.filter(k => k.durum === 'Kapalı');

  const firma = aktifFirmaGetir();
  const firmaAdi = firma ? firma.ad : '';
  const logoUrl = await fotoBuyukCoz(firma && typeof firmaLogoGetir === 'function' ? firmaLogoGetir(firma.id) : '');
  // Her gündem maddesinin ilk fotoğraf kanıtı (yoksa sonrası/öncesi fotoğrafı) slaytta gösterilir.
  const fotolar = {};
  await Promise.all(gundem.map(async k => {
    const ilkFoto = (k.kanitlar || []).find(x => x.tur === 'foto');
    fotolar[k.id] = await fotoBuyukCoz(ilkFoto ? ilkFoto.ref : (k.fotoSonrasi || k.fotoOncesi || ''));
  }));
  await _csgbFotoOlculeriniHazirla(Object.values(fotolar), logoUrl);

  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  const R = { bg: 'F1F5F9', baslik: '0F172A', soluk: '64748B', cizgi: 'E2E8F0', birincil: '1D4ED8', birincilKoyu: '15316B' };
  const DURUM_RENK = {
    'Açık': { fg: 'B45309', bg: 'FEF3C7' }, 'Devam Ediyor': { fg: '1D4ED8', bg: 'DBEAFE' },
    'Onay Bekliyor': { fg: '7C3AED', bg: 'EDE9FE' }, 'Tamamlandı': { fg: '15803D', bg: 'DCFCE7' },
    'Gecikmiş': { fg: 'B91C1C', bg: 'FEE2E2' }, 'İptal': { fg: '64748B', bg: 'E2E8F0' }
  };
  const M = 0.55, SW = 13.33, SH = 7.5;
  const toplantiTarihi = gunAyYil(t ? t.tarih : bugunIso());
  const kisalt = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 3).trimEnd() + '...' : s; };

  const MASTER = 'CSGB_MASTER';
  pptx.defineSlideMaster({
    title: MASTER,
    background: { color: R.bg },
    objects: [
      { rect: { x: 0, y: SH - 0.4, w: '100%', h: 0.4, fill: { color: R.baslik } } },
      { text: { text: firmaAdi, options: { x: 0.4, y: SH - 0.4, w: 7.5, h: 0.4, fontSize: 10, color: 'CBD5E1', valign: 'middle', fontFace: 'Calibri' } } },
      { text: { text: (toplantiNo ? toplantiNo + '. ' : '') + 'ÇSGB Denetimi Takip Toplantısı  ·  ' + toplantiTarihi, options: { x: 6.6, y: SH - 0.4, w: 6.2, h: 0.4, fontSize: 10, color: 'CBD5E1', align: 'right', valign: 'middle', fontFace: 'Calibri' } } }
    ],
    slideNumber: { x: SW - 0.7, y: SH - 0.4, w: 0.4, h: 0.4, fontSize: 10, color: 'CBD5E1', align: 'right', valign: 'middle' }
  });

  // Kapak
  const kapak = pptx.addSlide();
  kapak.background = { color: R.birincilKoyu };
  kapak.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: SW, h: 0.16, fill: { color: R.birincil } });
  kapak.addShape(pptx.ShapeType.rect, { x: 0, y: SH - 0.16, w: SW, h: 0.16, fill: { color: R.birincil } });
  if (logoUrl) kapak.addImage(_csgbFotoSigdir(logoUrl, SW / 2 - 0.75, 0.7, 1.5, 1.5));
  kapak.addText('ÇSGB DENETİMİ UYGUNSUZLUK GİDERME TAKİP TOPLANTISI', { x: 0.8, y: 2.45, w: SW - 1.6, h: 1.3, fontSize: 32, bold: true, color: 'FFFFFF', align: 'center', fontFace: 'Calibri', fit: 'shrink' });
  kapak.addText(firmaAdi, { x: 1, y: 3.85, w: SW - 2, fontSize: 19, color: 'BFDBFE', align: 'center', fontFace: 'Calibri' });
  kapak.addText(`${csgbDenetimBasligi(d)}${d.raporNo ? '  ·  Rapor No: ' + d.raporNo : ''}`, { x: 1, y: 4.5, w: SW - 2, fontSize: 15, color: '93C5FD', align: 'center' });
  kapak.addText(`${toplantiNo ? toplantiNo + '. Takip Toplantısı  ·  ' : 'Sıradaki Takip Toplantısı  ·  '}Toplantı Tarihi: ${toplantiTarihi}`, { x: 1, y: 5.05, w: SW - 2, fontSize: 15, color: '93C5FD', align: 'center' });

  // Genel durum
  const oz = pptx.addSlide({ masterName: MASTER });
  oz.addShape(pptx.ShapeType.rect, { x: 0.22, y: 0.5, w: 0.07, h: 0.62, fill: { color: R.birincil } });
  oz.addText('GENEL DURUM', { x: M, y: 0.42, w: 11.8, h: 0.28, fontSize: 11, bold: true, color: R.birincil, charSpacing: 1 });
  oz.addText(csgbDenetimBasligi(d), { x: M, y: 0.68, w: 12.2, h: 0.6, fontSize: 22, bold: true, color: R.baslik, fit: 'shrink' });
  const kutular = [['Toplam Madde', maddeler.length, R.baslik], ['Tamamlanan', d.kapaliSayisi, '15803D'], ['Açık', d.acikSayisi, 'B45309'], ['Gecikmiş', d.gecikmisSayisi, 'B91C1C'], ['İlerleme', '%' + d.ilerlemeYuzde, R.birincil]];
  const kG = (SW - 2 * M - 0.3 * 4) / 5;
  kutular.forEach(([etiket, deger, renk], i) => {
    const x = M + i * (kG + 0.3);
    oz.addShape(pptx.ShapeType.roundRect, { x, y: 1.6, w: kG, h: 1.5, rectRadius: 0.08, fill: { color: 'FFFFFF' }, line: { color: R.cizgi, width: 1 } });
    oz.addText(String(deger), { x, y: 1.7, w: kG, h: 0.85, fontSize: 36, bold: true, color: renk, align: 'center' });
    oz.addText(etiket, { x, y: 2.55, w: kG, h: 0.4, fontSize: 13, color: R.soluk, align: 'center' });
  });
  oz.addShape(pptx.ShapeType.roundRect, { x: M, y: 3.5, w: SW - 2 * M, h: 0.32, rectRadius: 0.16, fill: { color: R.cizgi }, line: { type: 'none' } });
  if (d.ilerlemeYuzde > 0) oz.addShape(pptx.ShapeType.roundRect, { x: M, y: 3.5, w: (SW - 2 * M) * d.ilerlemeYuzde / 100, h: 0.32, rectRadius: 0.16, fill: { color: '16A34A' }, line: { type: 'none' } });
  const bilgi = [
    ['Rapor No / Tarihi', `${d.raporNo || '-'} / ${gunAyYil(d.raporTarihi) || '-'}`],
    ['Tebliğ / Verilen Süre', `${gunAyYil(d.tebligTarihi) || '-'} / ${d.verilenSureGun ? d.verilenSureGun + ' gün' : '-'}`],
    ['Son Giderme Tarihi', (gunAyYil(d.sonGidermeTarihi) || '-') + (d.kalanGun === null || d.kalanGun === undefined ? '' : (d.kalanGun < 0 ? `  (${-d.kalanGun} gün geçti)` : `  (${d.kalanGun} gün kaldı)`))],
    ['Bu Toplantının Gündemi', `${gundem.length} madde`]
  ];
  oz.addTable(bilgi.map(([e, v]) => [
    { text: e, options: { bold: true, color: R.soluk, fill: { color: R.bg } } },
    { text: v, options: { color: R.baslik, fill: { color: 'FFFFFF' } } }
  ]), { x: M, y: 4.15, w: SW - 2 * M, colW: [3.2, SW - 2 * M - 3.2], fontSize: 13, border: { type: 'solid', color: R.cizgi, pt: 0.75 }, autoPage: false });

  // Gündem maddeleri
  gundem.forEach((k, i) => {
    const foto = fotolar[k.id];
    const metinGen = foto ? 8.3 : SW - 2 * M;
    const durumAdi = csgbDurumEtiketi(k.durumGoruntu);
    const renk = DURUM_RENK[durumAdi] || { fg: R.soluk, bg: R.cizgi };
    const durum = durumAdi + '  %' + k.yuzde;
    const sl = pptx.addSlide({ masterName: MASTER });
    sl.addShape(pptx.ShapeType.rect, { x: 0.22, y: 0.5, w: 0.07, h: 0.62, fill: { color: R.birincil } });
    sl.addText(`MADDE ${k.denetimMaddeNo || '-'}  ·  ${i + 1} / ${gundem.length}`, { x: M, y: 0.42, w: 9, h: 0.28, fontSize: 11, bold: true, color: R.birincil, charSpacing: 1 });
    const w = Math.max(1.1, 0.1 * durum.length + 0.4);
    sl.addShape(pptx.ShapeType.roundRect, { x: SW - M - w, y: 0.4, w, h: 0.34, rectRadius: 0.17, fill: { color: renk.bg }, line: { type: 'none' } });
    sl.addText(durum, { x: SW - M - w, y: 0.4, w, h: 0.34, fontSize: 11, bold: true, color: renk.fg, align: 'center', valign: 'middle' });
    const baslik = k.maddeKonusu || kisalt(k.baslik, 110);
    sl.addText(baslik, { x: M, y: 0.72, w: 12.2, h: 0.6, fontSize: baslik.length <= 60 ? 22 : 17, bold: true, color: R.baslik, fontFace: 'Calibri', valign: 'top', fit: 'shrink' });

    // Tespit (uzun metin kutuya sığacak şekilde küçülür, çok uzunsa kısaltılır).
    sl.addShape(pptx.ShapeType.roundRect, { x: M, y: 1.4, w: metinGen, h: 1.9, rectRadius: 0.06, fill: { color: 'FFFFFF' }, line: { color: R.cizgi, width: 1 } });
    sl.addText(kisalt(k.baslik, 700), { x: M + 0.2, y: 1.5, w: metinGen - 0.4, h: 1.7, fontSize: 13, color: R.baslik, valign: 'top', fit: 'shrink' });

    sl.addTable([
      [{ text: 'Sorumlu', options: { bold: true, color: R.soluk, fill: { color: R.bg } } }, { text: k.sorumlu || '-', options: { color: R.baslik, fill: { color: 'FFFFFF' } } },
       { text: 'Termin', options: { bold: true, color: R.soluk, fill: { color: R.bg } } }, { text: gunAyYil(k.termin) || '-', options: { color: R.baslik, fill: { color: 'FFFFFF' } } }]
    ], { x: M, y: 3.42, w: metinGen, colW: [1.2, metinGen / 2 - 1.2, 1.2, metinGen / 2 - 1.2], fontSize: 12, border: { type: 'solid', color: R.cizgi, pt: 0.75 }, autoPage: false });

    // Toplantı notları (en yeniler altta; sığmazsa son notlar gösterilir).
    const notlar = k.toplantiNotlari.slice(-6);
    sl.addText('Toplantı Notları', { x: M, y: 4.0, w: metinGen, h: 0.32, fontSize: 12, bold: true, color: R.birincil });
    sl.addShape(pptx.ShapeType.roundRect, { x: M, y: 4.32, w: metinGen, h: 2.55, rectRadius: 0.06, fill: { color: 'FFFFFF' }, line: { color: R.cizgi, width: 1 } });
    sl.addText(notlar.length
      ? notlar.map(n => [{ text: gunAyYil(n.tarih) + ': ', options: { bold: true } }, { text: kisalt(n.not, 400), options: { breakLine: true } }]).flat()
      : [{ text: 'Henüz not girilmedi.', options: { color: R.soluk } }],
      { x: M + 0.2, y: 4.4, w: metinGen - 0.4, h: 2.4, fontSize: 12, color: R.baslik, valign: 'top', fit: 'shrink', paraSpaceAfter: 4 });

    if (foto) {
      const x = M + metinGen + 0.3, b = SW - M - x;
      sl.addShape(pptx.ShapeType.roundRect, { x: x - 0.06, y: 1.34, w: b + 0.12, h: 5.6, rectRadius: 0.08, fill: { color: 'FFFFFF' }, line: { color: R.cizgi, width: 1 } });
      sl.addImage(_csgbFotoSigdir(foto, x, 1.4, b, 5.48));
    }
  });

  // Tamamlanan maddeler (her slaytta 12 satır)
  for (let i = 0; i < tamamlananlar.length; i += 12) {
    const sl = pptx.addSlide({ masterName: MASTER });
    sl.addShape(pptx.ShapeType.rect, { x: 0.22, y: 0.5, w: 0.07, h: 0.62, fill: { color: '16A34A' } });
    sl.addText('TAMAMLANAN MADDELER', { x: M, y: 0.42, w: 11.8, h: 0.28, fontSize: 11, bold: true, color: '15803D', charSpacing: 1 });
    sl.addText(`${tamamlananlar.length} madde tamamlandı`, { x: M, y: 0.68, w: 12.2, h: 0.55, fontSize: 22, bold: true, color: R.baslik });
    const bas = ['No', 'Uygunsuzluk Konusu', 'Sorumlu', 'Tamamlanma'].map(s => ({ text: s, options: { bold: true, color: 'FFFFFF', fill: { color: R.baslik } } }));
    sl.addTable([bas, ...tamamlananlar.slice(i, i + 12).map(k => [
      { text: k.denetimMaddeNo || '-', options: { bold: true } },
      { text: k.maddeKonusu || kisalt(k.baslik, 90) },
      { text: k.sorumlu || '-' },
      { text: gunAyYil(k.kapanisTarihi) || 'Tamamlandı', options: { color: '15803D', bold: true } }
    ])], { x: M, y: 1.4, w: SW - 2 * M, colW: [0.9, 7.6, 2.4, SW - 2 * M - 10.9], fontSize: 12, color: R.baslik, fill: { color: 'FFFFFF' }, border: { type: 'solid', color: R.cizgi, pt: 0.75 }, autoPage: false });
  }

  await pptx.writeFile({ fileName: `CSGB_${toplantiNo || 'Siradaki'}_Takip_Toplantisi_${toplantiTarihi.replace(/\./g, '-')}.pptx` });
}

// Toplantı tutanağı: dikey A4. Bilgiler, katılımcılar (imza sütunlu),
// genel notlar ve o toplantıda görüşülen maddeler.
async function csgbToplantiTutanagiWordOlustur(toplantiId) {
  const t = csgbToplantilariTumunuGetir().find(x => x.id === toplantiId);
  if (!t) return;
  const d = csgbDenetimGetir(t.denetimId);
  const w = _csgbWordAraclari();
  const SAYFA_GEN = w.mm(210 - 30);
  const maddeler = csgbMaddeleriniGetir(t.denetimId);
  const gorusulenler = maddeler.filter(k => (t.maddeNotlari[k.id] || '').trim());
  const SUTUN = [7, 18, 41, 12, 12, 10].map(y => Math.round(SAYFA_GEN * y / 100));

  const katilimcilar = csgbKatilimcilariNormallestir(t.katilimcilar);
  const KG = [7, 35, 33, 25].map(y => Math.round(SAYFA_GEN * y / 100));
  const bosSatirlar = [{ adSoyad: '', gorev: '' }, { adSoyad: '', gorev: '' }, { adSoyad: '', gorev: '' }];
  const katilimTablosu = new docx.Table({
    width: { size: SAYFA_GEN, type: docx.WidthType.DXA }, columnWidths: KG, layout: docx.TableLayoutType.FIXED,
    rows: [
      new docx.TableRow({ tableHeader: true, children: ['Sıra', 'Ad Soyad', 'Görevi', 'İmza'].map((b, i) => w.baslikHucre(b, KG[i])) }),
      ...(katilimcilar.length ? katilimcilar : bosSatirlar).map((k, i) => new docx.TableRow({ height: { value: w.mm(12), rule: docx.HeightRule.ATLEAST }, cantSplit: true, children: [
        w.hucre(new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [w.metin(i + 1, { size: 17 })] }), KG[0], { verticalAlign: docx.VerticalAlign.CENTER }),
        w.hucre(new docx.Paragraph({ children: [w.metin(k.adSoyad, { size: 17 })] }), KG[1], { verticalAlign: docx.VerticalAlign.CENTER }),
        w.hucre(new docx.Paragraph({ children: [w.metin(k.gorev, { size: 17 })] }), KG[2], { verticalAlign: docx.VerticalAlign.CENTER }),
        w.hucre(new docx.Paragraph(''), KG[3])
      ] }))
    ]
  });

  const maddeTablosu = new docx.Table({
    width: { size: SAYFA_GEN, type: docx.WidthType.DXA }, columnWidths: SUTUN, layout: docx.TableLayoutType.FIXED,
    rows: [
      new docx.TableRow({ tableHeader: true, children: ['No', 'Konu', 'Görüşülen / Yapılan', 'Sorumlu', 'Termin', 'Durum'].map((b, i) => w.baslikHucre(b, SUTUN[i])) }),
      ...(gorusulenler.length ? gorusulenler.map(k => new docx.TableRow({ cantSplit: true, children: [
        w.hucre(new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [w.metin(k.denetimMaddeNo || '-', { bold: true, size: 16 })] }), SUTUN[0]),
        w.hucre(w.paragraflar(k.maddeKonusu || (k.baslik || '').slice(0, 80), { size: 15 }), SUTUN[1]),
        w.hucre(w.paragraflar(t.maddeNotlari[k.id]), SUTUN[2]),
        w.hucre(w.paragraflar(k.sorumlu || '-', { size: 15 }), SUTUN[3]),
        w.hucre(new docx.Paragraph({ children: [w.metin(gunAyYil(k.termin) || '-', { size: 15 })] }), SUTUN[4]),
        w.hucre(new docx.Paragraph({ children: [w.metin(csgbDurumEtiketi(k.durumGoruntu), { bold: true, size: 15 })] }), SUTUN[5])
      ] })) : [new docx.TableRow({ children: [w.hucre(new docx.Paragraph({ children: [w.metin('Bu toplantıda madde notu girilmedi.', { size: 16 })] }), SAYFA_GEN, { columnSpan: 6 })] })])
    ]
  });

  const altBaslik = s => new docx.Paragraph({ keepNext: true, spacing: { before: w.mm(5), after: w.mm(2) }, children: [w.metin(s, { bold: true, size: 20 })] });
  const children = [
    new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { after: w.mm(4) }, children: [w.metin('ÇSGB DENETİMİ UYGUNSUZLUK GİDERME TAKİP TOPLANTI TUTANAĞI', { bold: true, size: 24 })] }),
    new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { after: w.mm(4) }, children: [w.metin(`Toplantı No: ${csgbToplantiNo(t)}`, { bold: true, size: 20 })] }),
    w.bilgiTablosu([
      ['Toplantı No', String(csgbToplantiNo(t))], ['Toplantı Tarihi', gunAyYil(t.tarih)],
      ['Yer', t.yer || '-'], ['Sonraki Toplantı', gunAyYil(t.sonrakiToplantiTarihi) || '-'],
      ['Denetim', d ? csgbDenetimBasligi(d) : '-'], ['Rapor No / Tarihi', d ? `${d.raporNo || '-'} / ${gunAyYil(d.raporTarihi) || '-'}` : '-'],
      ['Son Giderme Tarihi', d ? (gunAyYil(d.sonGidermeTarihi) || '-') : '-'], ['Durum', d ? `${maddeler.length} madde · ${d.kapaliSayisi} tamamlandı · ${d.acikSayisi} açık · ${d.gecikmisSayisi} gecikmiş` : '-']
    ], SAYFA_GEN),
    ...(t.genelNotlar ? [altBaslik('Genel Notlar'), ...w.paragraflar(t.genelNotlar, { size: 18 })] : []),
    altBaslik(`Görüşülen Maddeler (${gorusulenler.length})`),
    maddeTablosu,
    altBaslik('Katılımcılar'),
    katilimTablosu
  ];

  const sayfa = { margin: { top: w.mm(15), right: w.mm(15), bottom: w.mm(15), left: w.mm(15), footer: w.mm(6) } };
  const doc = new docx.Document({ styles: { default: { document: { run: { font: 'Arial', size: 16 } } } }, sections: [{ properties: { page: sayfa }, footers: { default: w.altBilgi }, children }] });
  const blob = await docx.Packer.toBlob(doc);
  saveAs(blob, `CSGB_${csgbToplantiNo(t)}_Takip_Toplantisi_${gunAyYil(t.tarih).replace(/\./g, '-')}.docx`);
}
