// İSG Kurulu — karar bazında Word formu.
// Kullanıcı isteği: "isg kurulunda kararları uygunsuzluk formu gibi karar
// bazında indirebilmek istiyorum" + "istersem de hepsini birlikte word olarak
// indirebileyim". Uygunsuzluk Bildirim Formu (modules/uygunsuzluk/cikti.js
// uygunsuzlukKayitWordOlustur) ile aynı düzen: logolu üst bilgi, numaralı
// bölüm tabloları, öncesi/sonrası fotoğraflar ve onay alanı. Toplu indirmede
// her karar ayrı bir bölümdür (yeni sayfadan başlar, sayfa numarası kendi
// içinde 1/n). Gereken: docx, saveAs (FileSaver), core/form-ayarlari.js.

async function _kfGorselAc(url) {
  const blob = await (await fetch(url)).blob();
  return new Promise((coz, red) => {
    const i = new Image();
    i.onload = () => coz(i);
    i.onerror = red;
    i.src = URL.createObjectURL(blob);
  });
}

// Görseli kırpmadan kutuya sığdırır; şeffaf zemin beyaz boyanır. Çözülemezse null.
async function _kfGorselSigdir(url, maksGen, maksYuk) {
  if (!url) return null;
  try {
    const img = await _kfGorselAc(url);
    const oran = Math.min(maksGen / img.naturalWidth, maksYuk / img.naturalHeight, 1);
    const gen = Math.max(1, Math.round(img.naturalWidth * oran));
    const yuk = Math.max(1, Math.round(img.naturalHeight * oran));
    const canvas = document.createElement('canvas');
    canvas.width = gen * 2;
    canvas.height = yuk * 2;
    const c = canvas.getContext('2d');
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, canvas.width, canvas.height);
    c.drawImage(img, 0, 0, canvas.width, canvas.height);
    const jpeg = await new Promise(coz => canvas.toBlob(coz, 'image/jpeg', 0.85));
    return { veri: new Uint8Array(await jpeg.arrayBuffer()), gen, yuk };
  } catch (e) {
    console.error('Görsel karar formuna eklenemedi:', e);
    return null;
  }
}

const _kfMm = v => Math.round(v * 56.7);          // mm → twip
const _kfPx = v => Math.round(v * 96 / 25.4);     // mm → docx görsel pikseli

// Tek bir kararın bölümünü (üst bilgi + gövde) hazırlar.
async function _kararFormuBolumu(karar, logoGorsel, fa) {
  const k = typeof _kararZenginlestir === 'function' ? _kararZenginlestir(karar) : Object.assign({ durumGoruntu: kararDurumGoster(karar.durum) }, karar);
  const t = toplantiTumunuGetir().find(x => x.id === k.toplantiId) || {};
  const mm = _kfMm, px = _kfPx;
  const GENISLIK = mm(194);
  const koyu = { style: docx.BorderStyle.SINGLE, size: 8, color: '111827' };
  const kalin = { style: docx.BorderStyle.SINGLE, size: 12, color: '111827' };
  const acik = { style: docx.BorderStyle.SINGLE, size: 4, color: 'CBD5E1' };
  const cerceve = kenar => ({ top: kenar, bottom: kenar, left: kenar, right: kenar });

  const gorsel = async (ref, gen, yuk) => _kfGorselSigdir(ref ? await fotoBuyukCoz(ref) : '', px(gen), px(yuk));
  const ekler = (k.fotografEk || []).filter(f => f && f.url);
  const [fotoOncesi, fotoSonrasi, ekGorseller] = await Promise.all([
    gorsel(k.fotoOncesi, 91, 54),
    gorsel(k.fotoSonrasi, 91, 54),
    Promise.all(ekler.map(f => gorsel(f.url, 60, 45)))
  ]);

  const metin = (text, o = {}) => new docx.TextRun(Object.assign({ text: String(text ?? ''), font: 'Arial', color: '111827', size: 18 }, o));
  const satirli = (deger, o = {}) => String(deger ?? '').split('\n').map((s, i) => metin(s, Object.assign(i ? { break: 1 } : {}, o)));
  const resim = g => new docx.ImageRun({ data: g.veri, transformation: { width: g.gen, height: g.yuk } });
  const paragraf = (children, o = {}) => new docx.Paragraph(Object.assign({ children }, o));
  const ortali = (children, o = {}) => paragraf(children, Object.assign({ alignment: docx.AlignmentType.CENTER }, o));
  const hucre = (children, genislik, o = {}) => new docx.TableCell(Object.assign({
    width: { size: genislik, type: docx.WidthType.DXA },
    borders: cerceve(koyu),
    margins: { top: mm(2), bottom: mm(2), left: mm(3), right: mm(3) },
    children
  }, o));
  const tablo = (sutunlar, rows) => new docx.Table({
    width: { size: GENISLIK, type: docx.WidthType.DXA },
    columnWidths: sutunlar,
    layout: docx.TableLayoutType.FIXED,
    rows
  });
  const bosluk = () => paragraf([metin('', { size: 8 })], { spacing: { before: 0, after: mm(1) } });
  const bolumBasligi = (baslik, sutunSayisi) => new docx.TableRow({ cantSplit: true, children: [hucre(
    [paragraf([metin(baslik.toLocaleUpperCase('tr'), { bold: true, size: 19 })], { keepNext: true })],
    GENISLIK, { columnSpan: sutunSayisi }
  )] });

  const ETIKET = mm(31), DEGER = mm(66);
  const SUTUNLAR = [ETIKET, DEGER, ETIKET, DEGER];
  const etiketHucre = etiket => hucre([paragraf([metin(etiket, { bold: true })])], ETIKET);
  const degerRun = d => (Array.isArray(d) ? d : satirli(d || '-'));
  const tekAlan = (etiket, d) => new docx.TableRow({ cantSplit: true, children: [etiketHucre(etiket), hucre([paragraf(degerRun(d))], GENISLIK - ETIKET, { columnSpan: 3 })] });
  const ikiAlan = (e1, d1, e2, d2) => new docx.TableRow({ cantSplit: true, children: [etiketHucre(e1), hucre([paragraf(degerRun(d1))], DEGER), etiketHucre(e2), hucre([paragraf(degerRun(d2))], DEGER)] });
  const rozet = (yazi, zemin, renk) => [metin(` ${yazi} `, { bold: true, size: 17, color: renk, shading: { fill: zemin, color: 'auto', type: docx.ShadingType.CLEAR } })];
  const durumRenk = {
    'Tamamlandı': ['DCFCE7', '15803D'], 'Gecikmiş': ['FEE2E2', 'B91C1C'], 'Devam Ediyor': ['CCFBF1', '0F766E'],
    'Açık': ['FEF3C7', 'B45309'], 'İptal': ['E5E7EB', '374151']
  }[k.durumGoruntu];
  const pasif = kararPasifMi(k);

  // ---- Üst bilgi (her sayfada) ----
  const FA_GEN = mm(42), LOGO_GEN = mm(28);
  const faSatir = (etiket, degerRunlari) => paragraf([metin(etiket, { bold: true, size: 14 }), new docx.TextRun({ children: [new docx.Tab(), ...degerRunlari], font: 'Arial', color: '111827', size: 14 })], { tabStops: [{ type: docx.TabStopType.LEFT, position: mm(17) }] });
  const ustBilgi = new docx.Header({ children: [
    new docx.Table({
      width: { size: GENISLIK, type: docx.WidthType.DXA },
      columnWidths: [LOGO_GEN, GENISLIK - LOGO_GEN - FA_GEN, FA_GEN],
      layout: docx.TableLayoutType.FIXED,
      rows: [new docx.TableRow({ children: [
        hucre([ortali(logoGorsel ? [resim(logoGorsel)] : [metin('LOGO YOK', { bold: true, size: 16, color: '94A3B8' })])], LOGO_GEN, { borders: cerceve(kalin), verticalAlign: docx.VerticalAlign.CENTER, margins: { top: mm(2), bottom: mm(2), left: mm(1), right: mm(1) } }),
        hucre([ortali([metin('İSG KURULU KARAR FORMU', { bold: true, size: 26 })])], GENISLIK - LOGO_GEN - FA_GEN, { borders: cerceve(kalin), verticalAlign: docx.VerticalAlign.CENTER }),
        hucre([
          faSatir('Doküman No', [`: ${fa.dokumanNo || '-'}`]),
          faSatir('Sürüm Tarihi', [`: ${fa.surumTarihi || '-'}`]),
          faSatir('Sürüm No', [`: ${fa.surumNo || '-'}`]),
          faSatir('Sayfa', [': ', docx.PageNumber.CURRENT, '/', docx.PageNumber.TOTAL_PAGES_IN_SECTION])
        ], FA_GEN, { borders: cerceve(kalin), verticalAlign: docx.VerticalAlign.CENTER, margins: { top: mm(1), bottom: mm(1), left: mm(1.5), right: mm(1) } })
      ] })]
    }),
    bosluk()
  ] });
  const altBilgi = new docx.Footer({ children: [
    ortali([metin('🌱 Çevre sorumluluğunuzu düşünerek lütfen gerekmedikçe çıktı almayınız.', { size: 15, color: '64748B' })]),
    ortali([new docx.TextRun({ children: ['Sayfa ', docx.PageNumber.CURRENT, ' / ', docx.PageNumber.TOTAL_PAGES_IN_SECTION], size: 16, color: '646464', font: 'Arial' })])
  ] });

  // ---- Bölümler ----
  let no = 1;
  const toplantiBilgi = tablo(SUTUNLAR, [
    bolumBasligi(`${no++}. Toplantı Bilgileri`, 4),
    ikiAlan('Karar No', k.kararNo, 'Toplantı No', t.toplantiNo),
    ikiAlan('Toplantı', t.baslik, 'Toplantı Tarihi', [gunAyYil(t.tarih), t.saat].filter(Boolean).join(' ')),
    ...(t.yer ? [tekAlan('Toplantı Yeri', t.yer)] : [])
  ]);

  const oyParcalari = [];
  if (k.oySonucu) oyParcalari.push(k.oySonucu);
  if (k.oyKabul != null || k.oyRet != null || k.oyCekimser != null) oyParcalari.push(`Kabul: ${k.oyKabul ?? 0}  /  Ret: ${k.oyRet ?? 0}  /  Çekimser: ${k.oyCekimser ?? 0}`);
  const kararDetay = tablo(SUTUNLAR, [
    bolumBasligi(`${no++}. Karar Detayları`, 4),
    tekAlan('Gündem / Konu', k.kaynakGundem),
    tekAlan('Karar Metni', k.kararMetni),
    ...(oyParcalari.length || k.oy ? [tekAlan('Oylama', [k.oy, ...oyParcalari].filter(Boolean).join('\n'))] : []),
    ...((k.yasalSartlar && k.yasalSartlar.length) ? [tekAlan('İlgili Yasal Şartlar', k.yasalSartlar.join(', '))] : []),
    ...(k.yasalDayanak ? [tekAlan('Yasal Dayanak / Not', k.yasalDayanak)] : [])
  ]);

  const takip = tablo(SUTUNLAR, [
    bolumBasligi(`${no++}. Aksiyon ve Takip`, 4),
    ikiAlan('Sorumlu', k.sorumlu, 'Termin', gunAyYil(k.termin)),
    ikiAlan('Öncelik', k.oncelik, 'Durum', durumRenk ? rozet(k.durumGoruntu.toLocaleUpperCase('tr'), durumRenk[0], durumRenk[1]) : k.durumGoruntu),
    ...(kararKapaliMi(k.durum) || k.kapanisTarihi || k.kanit ? [ikiAlan('Kapanış Tarihi', gunAyYil(k.kapanisTarihi), 'Kanıt / Açıklama', k.kanit)] : []),
    ...(pasif ? [tekAlan('Pasif', [k.pasifTarihi ? gunAyYil(k.pasifTarihi) : '', k.pasifNedeni].filter(Boolean).join(' — ') || 'Gündemden düşürüldü')] : [])
  ]);

  const notlar = typeof kararToplantiNotlariniGetir === 'function' ? kararToplantiNotlariniGetir(karar, null) : [];
  const NOT_ETIKET = mm(36);
  const konusulanlar = notlar.length ? tablo([NOT_ETIKET, GENISLIK - NOT_ETIKET], [
    bolumBasligi(`${no++}. Toplantılarda Konuşulanlar`, 2),
    ...notlar.map(n => new docx.TableRow({ cantSplit: true, children: [
      hucre([paragraf([metin(n.eski ? 'Önceki not' : [gunAyYil(n.tarih), n.toplantiNo].filter(Boolean).join(' · '), { bold: true, size: 16 })])], NOT_ETIKET, { borders: cerceve(acik) }),
      hucre([paragraf(satirli(n.not))], GENISLIK - NOT_ETIKET, { borders: cerceve(acik) })
    ] }))
  ]) : null;

  const YARIM = Math.round(GENISLIK / 2);
  const IKI_SUTUN = [YARIM, GENISLIK - YARIM];
  const fotoHucre = (g, genislik, varMi) => hucre([ortali(g ? [resim(g)] : [metin(varMi ? 'Görsel yüklenemedi' : '', { size: 15, color: '94A3B8' })])], genislik, { verticalAlign: docx.VerticalAlign.CENTER, margins: { top: mm(1), bottom: mm(1), left: mm(1), right: mm(1) } });
  const fotoVar = k.fotoOncesi || k.fotoSonrasi;
  const gorselKanitlar = fotoVar ? tablo(IKI_SUTUN, [
    bolumBasligi(`${no++}. Görsel Kanıtlar (Öncesi / Sonrası)`, 2),
    new docx.TableRow({ cantSplit: true, height: { value: mm(58), rule: docx.HeightRule.EXACT }, children: [fotoHucre(fotoOncesi, IKI_SUTUN[0], !!k.fotoOncesi), fotoHucre(fotoSonrasi, IKI_SUTUN[1], !!k.fotoSonrasi)] }),
    new docx.TableRow({ cantSplit: true, children: ['Öncesi', 'Sonrası (Yapılan Çalışma)'].map((e, i) => hucre([ortali([metin(e.toLocaleUpperCase('tr'), { bold: true, size: 16 })])], IKI_SUTUN[i])) })
  ]) : null;

  const UC = Math.round(GENISLIK / 3);
  const UC_SUTUN = [UC, UC, GENISLIK - 2 * UC];
  const ekFotograflar = ekler.length ? tablo(UC_SUTUN, [
    bolumBasligi(`${no++}. Ek Fotoğraflar`, 3),
    new docx.TableRow({ cantSplit: true, height: { value: mm(49), rule: docx.HeightRule.EXACT }, children: UC_SUTUN.map((g, i) => fotoHucre(ekGorseller[i], g, !!ekler[i])) })
  ]) : null;

  const onayHucre = (baslik, adSoyad, genislik) => hucre([
    ortali([metin(baslik.toLocaleUpperCase('tr'), { bold: true, size: 16 })]),
    ortali([metin(adSoyad || '')], { spacing: { before: mm(1) } }),
    ortali([metin('')], { spacing: { before: mm(10) }, border: { bottom: { style: docx.BorderStyle.SINGLE, size: 6, color: '111827', space: 1 } } }),
    ortali([metin('İmza', { size: 15, color: '64748B' })], { spacing: { before: mm(1) } })
  ], genislik);
  const onay = tablo(IKI_SUTUN, [
    bolumBasligi(`${no}. Onay`, 2),
    new docx.TableRow({ cantSplit: true, children: [
      onayHucre('Karar Sorumlusu', k.sorumlu, IKI_SUTUN[0]),
      onayHucre('Kurul Başkanı', '', IKI_SUTUN[1])
    ] })
  ]);

  const govde = [toplantiBilgi, bosluk(), kararDetay, bosluk(), takip, bosluk()];
  if (konusulanlar) govde.push(konusulanlar, bosluk());
  if (gorselKanitlar) govde.push(gorselKanitlar, bosluk());
  if (ekFotograflar) govde.push(ekFotograflar, bosluk());
  govde.push(onay, bosluk());

  return {
    properties: { page: {
      size: { orientation: docx.PageOrientation.PORTRAIT },
      margin: { top: mm(8), right: mm(8), bottom: mm(14), left: mm(8), header: mm(8), footer: mm(4) },
      pageNumbers: { start: 1 }
    } },
    headers: { default: ustBilgi },
    footers: { default: altBilgi },
    children: govde
  };
}

// kararIdleri: tek id ya da dizi. dosyaEki: toplu indirmede dosya adına eklenecek metin.
// Olaydan gelen sanal satırlar (id 'olay-...') gerçek karar olmadığından atlanır.
async function kurulKararFormuWordOlustur(kararIdleri, dosyaEki) {
  const idler = (Array.isArray(kararIdleri) ? kararIdleri : [kararIdleri]).filter(Boolean);
  const kararlar = idler.map(id => kararIdIleGetirRepo(id)).filter(Boolean);
  if (!kararlar.length) { alert('İndirilecek karar bulunamadı.'); return null; }
  const firma = aktifFirmaGetir();
  const logo = firma ? firmaLogoGetir(firma.id) : '';
  const logoGorsel = await _kfGorselSigdir(logo ? await fotoBuyukCoz(logo) : '', _kfPx(24), _kfPx(16));
  const fa = typeof formAyarlariGetir === 'function' ? formAyarlariGetir('kurul') : {};
  const bolumler = [];
  for (const k of kararlar) bolumler.push(await _kararFormuBolumu(k, logoGorsel, fa));
  const doc = new docx.Document({
    styles: { default: { document: { run: { font: 'Arial', size: 18 } } } },
    sections: bolumler
  });
  const blob = await docx.Packer.toBlob(doc);
  const temiz = s => String(s || '').replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '_');
  const dosyaAdi = kararlar.length === 1
    ? `Kurul_Karar_Formu_${temiz(kararlar[0].kararNo || kararlar[0].id)}.docx`
    : `Kurul_Karar_Formlari_${temiz(dosyaEki || 'Toplu')}_${kararlar.length}_karar.docx`;
  saveAs(blob, dosyaAdi);
  return { blob, dosyaAdi };
}
