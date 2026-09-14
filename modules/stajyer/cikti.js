// Stajyer Temel Eğitim Belgesi çıktısı. Eğitim modülündeki Temel İSG Eğitimi
// sertifikasıyla (bkz. modules/egitim/cikti.js) aynı teknik ve görsel desen:
// html2canvas + jsPDF ile iki sayfalı gerçek PDF (ön yüz: katılımcı bilgisi +
// imzalar, arka yüz: konu/süre tablosu), Sertifika Ayarları penceresinden
// tehlike sınıfı seçimi. İG Uzmanı/İşyeri Hekimi/İşveren Vekili satırları
// kullanıcı isteğiyle isim doldurmadan, sadece boş imza satırı olarak basılır
// (bkz. _sjImzaSatirlariHtml/_sjWordImzaTablosu). Konu listesi/süre tablosu
// zaten stajyer/model.js'te
// (SERTIFIKA_KONULARI/SERTIFIKA_PLANLARI) tanımlı — burada tekrar edilmez.
// Stajyerler için "ilk/tekrar" ayrımı yoktur (her zaman ilk temel eğitim).

function _sjSertKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function _sjBelgeNoUret(stajyer, firma) {
  const tarih = (stajyer.isgEgitimTarihi || bugunIso()).replace(/-/g, '');
  const onEk = ((firma && firma.slug) || 'isg').toUpperCase();
  return `${onEk}-STJ-${tarih}-${stajyer.stajNo || '0000'}`;
}

// Kullanıcı isteği: "stajda İş Güvenliği Uzmanı ve İşyeri Hekimi isimleri
// yazmasın" — Hizmet Sözleşmeleri'nden otomatik çekilen ad soyad artık
// gösterilmiyor, İşveren Vekili'nde olduğu gibi sadece boş imza satırı basılır.
function _sjImzaSatirlariHtml() {
  return `
    <div class="egt-imzalar">
      <div><span>&nbsp;</span><b>İş Güvenliği Uzmanı</b><em>İmza</em></div>
      <div><span>&nbsp;</span><b>İşyeri Hekimi</b><em>İmza</em></div>
      <div><span>&nbsp;</span><b>İşveren Vekili</b><em>İmza</em></div>
    </div>
  `;
}

function _sjOrtakStilHtml(kokSelector) {
  return `
    <style>
      ${kokSelector}{ font-family: Arial, Helvetica, sans-serif; color:#111827; background:#fff; width:100%; }
      ${kokSelector} *{ box-sizing:border-box; }
      ${kokSelector} .egt-sayfa{ box-sizing:border-box; border:3px solid #0b2c52; padding:12mm; position:relative; overflow:hidden; background:#fff; }
      ${kokSelector} .egt-yatay{ width:297mm; height:210mm; }
      ${kokSelector} .egt-dikey{ width:210mm; height:297mm; }
      ${kokSelector} .egt-ustbilgi{ display:flex; align-items:center; gap:8mm; border-bottom:2px solid #0b2c52; padding-bottom:5mm; margin-bottom:6mm; }
      ${kokSelector} .egt-logo{ max-width:26mm; max-height:18mm; }
      ${kokSelector} .egt-baslik-blok{ flex:1; }
      ${kokSelector} .egt-baslik{ font-size:17pt; font-weight:800; color:#0b2c52; margin:0; }
      ${kokSelector} .egt-belgeno{ font-size:9pt; color:#374151; margin-top:2mm; }
      ${kokSelector} .egt-metin{ font-size:10.5pt; line-height:1.7; margin:0 0 6mm; }
      ${kokSelector} table.egt-bilgi{ width:100%; border-collapse:collapse; margin-bottom:8mm; }
      ${kokSelector} table.egt-bilgi th{ text-align:left; background:#f1f5f9; font-size:9pt; font-weight:700; padding:2.5mm 3mm; border:1px solid #cbd5e1; width:22%; }
      ${kokSelector} table.egt-bilgi td{ font-size:10pt; padding:2.5mm 3mm; border:1px solid #cbd5e1; }
      ${kokSelector} .egt-tarih{ text-align:right; font-size:9pt; color:#374151; margin-bottom:8mm; }
      ${kokSelector} .egt-imzalar{ display:flex; justify-content:space-between; gap:6mm; margin-top:10mm; }
      ${kokSelector} .egt-imzalar > div{ flex:1; text-align:center; border-top:1px solid #94a3b8; padding-top:2mm; }
      ${kokSelector} .egt-imzalar span{ display:block; font-weight:700; font-size:9.5pt; min-height:5mm; }
      ${kokSelector} .egt-imzalar b{ display:block; font-size:8.5pt; color:#374151; margin-top:1mm; }
      ${kokSelector} .egt-imzalar em{ display:block; font-size:7.5pt; color:#94a3b8; font-style:normal; margin-top:1mm; }
      ${kokSelector} .egt-altbilgi{ position:absolute; bottom:6mm; left:12mm; right:12mm; text-align:center; font-size:7.5pt; color:#94a3b8; }
      ${kokSelector} table.egt-konu{ width:100%; border-collapse:collapse; }
      ${kokSelector} table.egt-konu th{ background:#f1f5f9; color:#0b2c52; font-size:8.5pt; padding:2mm 3mm; text-transform:uppercase; text-align:left; border-bottom:1.5px solid #0b2c52; }
      ${kokSelector} table.egt-konu td{ font-size:8.5pt; padding:1.6mm 3mm; border-bottom:1px solid #e2e8f0; }
      ${kokSelector} .egt-konu-baslik td{ font-weight:700; background:#f1f5f9; color:#0b2c52; }
      ${kokSelector} .egt-konu-toplam td{ font-weight:700; border-top:1.5px solid #0b2c52; }
      ${kokSelector} .egt-genel-toplam td{ font-weight:800; font-size:10pt; background:#f1f5f9; color:#0b2c52; border-top:1.5px solid #0b2c52; }
      ${kokSelector} .center{ text-align:center; }
    </style>
  `;
}

function _sjKonuSatirlariHtml(baslik, konular, sureler) {
  const govde = konular.map((k, i) => `<tr><td>${_sjSertKacir(k)}</td><td class="center">${_sjSertKacir(sureler[i] || 0)} dk</td></tr>`).join('');
  const toplam = sureler.reduce((a, b) => a + (Number(b) || 0), 0);
  return `
    <tr class="egt-konu-baslik"><td colspan="2">${_sjSertKacir(baslik)}</td></tr>
    ${govde}
    <tr class="egt-konu-toplam"><td>${_sjSertKacir(baslik)} toplamı</td><td class="center">${_sjSertKacir(dakikayiSaateCevir(toplam))}</td></tr>
  `;
}

async function _sjSayfaCanvasaCevir(el) {
  return await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
}

// Sertifika Ayarları penceresi için varsayılan/canlı süre hesabı.
function stajyerSertifikaSuresiHesapla(tehlikeSinifi) {
  const plan = sertifikaPlaniGetir(tehlikeSinifi);
  return sertifikaToplamDakikaHesapla(plan);
}

// ==================== WORD SERTİFİKASI ====================
// Kullanıcı isteği: "eğitim ve stajdaki sertifikaların aynısını Word
// formatında da indirmek istiyorum" — bkz. modules/egitim/cikti.js
// _egitimTemelSertifikasiWordOlustur ile aynı desen (modüller arası script
// paylaşımı olmadığından burada yerel olarak yeniden tanımlandı).
async function _sjGorselBaytlari(url) {
  if (!url) return null;
  try {
    if (url.startsWith('data:')) {
      const b64 = url.slice(url.indexOf(',') + 1);
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes;
    }
    const res = await fetch(url);
    return new Uint8Array(await res.arrayBuffer());
  } catch (e) {
    return null;
  }
}

const _SJ_WORD_METIN_BOYUT = 19;

// Kullanıcı isteği: "pdf de sayfaya daha fazla yayılıyor word de üstte
// toplanıyor" — bkz. modules/egitim/cikti.js _egitimWordHucre aynı düzeltme.
function _sjWordHucre(children, opts = {}) {
  return new docx.TableCell({ children: Array.isArray(children) ? children : [children], margins: { top: 140, bottom: 140, left: 120, right: 120 }, ...opts });
}
function _sjWordEtiketHucre(etiket) {
  return _sjWordHucre(new docx.Paragraph({ children: [new docx.TextRun({ text: etiket, bold: true, size: _SJ_WORD_METIN_BOYUT })] }), { width: { size: 22, type: docx.WidthType.PERCENTAGE }, shading: { fill: 'F1F5F9', color: 'auto', type: docx.ShadingType.CLEAR } });
}
function _sjWordDegerHucre(deger, opts = {}) {
  return _sjWordHucre(new docx.Paragraph({ children: [new docx.TextRun({ text: String(deger ?? '') || '-', size: _SJ_WORD_METIN_BOYUT })] }), { width: { size: 28, type: docx.WidthType.PERCENTAGE }, ...opts });
}
function _sjWordBilgiSatiri(e1, d1, e2, d2, d2Opts) {
  return new docx.TableRow({ children: [_sjWordEtiketHucre(e1), _sjWordDegerHucre(d1), _sjWordEtiketHucre(e2), _sjWordDegerHucre(d2, d2Opts)] });
}
// PDF'teki .egt-ustbilgi ile aynı görünüm: logo solda, başlık+belge no sağında
// yan yana (ortalanmış değil), altında ayırıcı çizgi.
function _sjWordUstbilgi(logoBytes, baslik, belgeNo) {
  const kenar = { style: docx.BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const altCizgi = { style: docx.BorderStyle.SINGLE, size: 8, color: '0B2C52' };
  const logoHucre = new docx.TableCell({
    borders: { top: kenar, left: kenar, right: kenar, bottom: altCizgi },
    width: { size: 20, type: docx.WidthType.PERCENTAGE },
    margins: { bottom: 340, top: 100 },
    children: [logoBytes ? new docx.Paragraph({ children: [new docx.ImageRun({ data: logoBytes, transformation: { width: 90, height: 60 } })] }) : new docx.Paragraph({ text: '' })]
  });
  const baslikHucre = new docx.TableCell({
    borders: { top: kenar, left: kenar, right: kenar, bottom: altCizgi },
    width: { size: 80, type: docx.WidthType.PERCENTAGE },
    verticalAlign: docx.VerticalAlign.CENTER,
    margins: { bottom: 340, top: 100 },
    children: [
      new docx.Paragraph({ children: [new docx.TextRun({ text: baslik, bold: true, size: 28, color: '0B2C52' })] }),
      new docx.Paragraph({ children: [new docx.TextRun({ text: `Belge No: ${belgeNo}`, size: 15, color: '374151' })], spacing: { before: 40 } })
    ]
  });
  return new docx.Table({
    width: { size: 100, type: docx.WidthType.PERCENTAGE },
    borders: { top: kenar, bottom: kenar, left: kenar, right: kenar, insideHorizontal: kenar, insideVertical: kenar },
    rows: [new docx.TableRow({ children: [logoHucre, baslikHucre] })]
  });
}

// Kullanıcı isteği: "stajda İş Güvenliği Uzmanı ve İşyeri Hekimi isimleri
// yazmasın" — bkz. yukarısı _sjImzaSatirlariHtml (PDF), burada da aynı
// şekilde ad soyad artık gösterilmiyor.
function _sjWordImzaTablosu() {
  const kenar = { style: docx.BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const ustCizgi = { style: docx.BorderStyle.SINGLE, size: 4, color: '94A3B8' };
  const hucre = (ad, unvan) => new docx.TableCell({
    borders: { top: ustCizgi, bottom: kenar, left: kenar, right: kenar },
    margins: { top: 200, bottom: 150 },
    children: [
      new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: ad || ' ', bold: true, size: _SJ_WORD_METIN_BOYUT })] }),
      new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: unvan, size: 15, color: '374151' })] }),
      new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: 'İmza', size: 13, color: '94A3B8' })], spacing: { before: 40 } })
    ]
  });
  return new docx.Table({
    width: { size: 100, type: docx.WidthType.PERCENTAGE },
    borders: { top: kenar, bottom: kenar, left: kenar, right: kenar, insideHorizontal: kenar, insideVertical: kenar },
    rows: [new docx.TableRow({ children: [hucre('', 'İş Güvenliği Uzmanı'), hucre('', 'İşyeri Hekimi'), hucre('', 'İşveren Vekili')] })]
  });
}

async function _sjSertifikasiWordOlustur(stajyer, firma, tehlikeSinifi, veri, plan) {
  const belgeNo = _sjBelgeNoUret(stajyer, firma);
  const logoBytes = await _sjGorselBaytlari(firmaLogoGetir(firma.id));
  const egitimTarihiGoruntu = stajyer.isgEgitimTarihi2 ? `${gunAyYil(stajyer.isgEgitimTarihi)} - ${gunAyYil(stajyer.isgEgitimTarihi2)}` : gunAyYil(stajyer.isgEgitimTarihi);
  const sonGunTarihi = isgEgitimEfektifTarihi(stajyer);

  const onCocuklari = [
    _sjWordUstbilgi(logoBytes, 'TEMEL İŞ SAĞLIĞI VE GÜVENLİĞİ EĞİTİMİ', belgeNo),
    new docx.Paragraph({ text: '', spacing: { after: 150 } }),
    new docx.Paragraph({
      children: [new docx.TextRun({ text: `İşbu belge, `, size: _SJ_WORD_METIN_BOYUT }), new docx.TextRun({ text: stajyer.adSoyad, bold: true, size: _SJ_WORD_METIN_BOYUT }), new docx.TextRun({ text: ` adına; Çalışanların İş Sağlığı ve Güvenliği Eğitimlerinin Usul ve Esasları Hakkında Yönetmelik kapsamında `, size: _SJ_WORD_METIN_BOYUT }), new docx.TextRun({ text: 'Temel İş Sağlığı ve Güvenliği Eğitimi', bold: true, size: _SJ_WORD_METIN_BOYUT }), new docx.TextRun({ text: `'ni tamamlaması üzerine düzenlenmiştir.`, size: _SJ_WORD_METIN_BOYUT })],
      spacing: { after: 400 }
    }),
    new docx.Table({
      width: { size: 100, type: docx.WidthType.PERCENTAGE },
      rows: [
        new docx.TableRow({ children: [_sjWordEtiketHucre('Adı Soyadı'), _sjWordDegerHucre(stajyer.adSoyad, { columnSpan: 3, width: { size: 78, type: docx.WidthType.PERCENTAGE } })] }),
        _sjWordBilgiSatiri('Okul', stajyer.okul, 'Okul Bölümü', stajyer.okulBolumu),
        _sjWordBilgiSatiri('Staj Yapılan Bölüm', stajyer.bolum, 'Sınıf / Dönem', stajyer.sinif),
        _sjWordBilgiSatiri('İşyeri Ünvanı', firma.ad, 'Tehlike Sınıfı', tehlikeSinifi),
        _sjWordBilgiSatiri('Eğitim Tarihi', egitimTarihiGoruntu, 'Geçerlilik Tarihi', gunAyYil(veri.gecerlilikTarihi)),
        _sjWordBilgiSatiri('Eğitim Süresi', `${veri.toplamSure} (${veri.toplamDakika} dk)`, 'Eğitim Şekli', '☑ Yüz yüze   ☐ Uzaktan')
      ]
    }),
    new docx.Paragraph({ alignment: docx.AlignmentType.RIGHT, children: [new docx.TextRun({ text: gunAyYil(sonGunTarihi), size: 17, color: '374151' })], spacing: { before: 400, after: 900 } }),
    _sjWordImzaTablosu()
  ];

  const konuSatirlari = (baslik, konular, sureler) => {
    const toplam = sureler.reduce((a, b) => a + (Number(b) || 0), 0);
    return [
      new docx.TableRow({ children: [_sjWordHucre(new docx.Paragraph({ children: [new docx.TextRun({ text: baslik, bold: true, size: _SJ_WORD_METIN_BOYUT, color: '0B2C52' })] }), { columnSpan: 2, shading: { fill: 'F1F5F9', color: 'auto', type: docx.ShadingType.CLEAR } })] }),
      ...konular.map((k, i) => new docx.TableRow({ children: [
        _sjWordHucre(new docx.Paragraph({ children: [new docx.TextRun({ text: k, size: _SJ_WORD_METIN_BOYUT })] })),
        _sjWordHucre(new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: `${sureler[i] || 0} dk`, size: _SJ_WORD_METIN_BOYUT })] }))
      ]})),
      new docx.TableRow({ children: [
        _sjWordHucre(new docx.Paragraph({ children: [new docx.TextRun({ text: `${baslik} toplamı`, bold: true, size: _SJ_WORD_METIN_BOYUT })] })),
        _sjWordHucre(new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: dakikayiSaateCevir(toplam), bold: true, size: _SJ_WORD_METIN_BOYUT })] }))
      ]})
    ];
  };
  const digerToplam = plan.diger.reduce((a, r) => a + (Number(r[1]) || 0), 0);

  const arkaCocuklari = [
    new docx.Paragraph({ text: 'EĞİTİM KONULARI VE SÜRELERİ', heading: docx.HeadingLevel.HEADING_2 }),
    new docx.Paragraph({ children: [new docx.TextRun({ text: `Katılımcı: ${stajyer.adSoyad}   •   Tehlike Sınıfı: ${tehlikeSinifi}   •   Toplam: ${veri.toplamSure}`, size: 16, color: '374151' })], spacing: { after: 200 } }),
    new docx.Table({
      width: { size: 100, type: docx.WidthType.PERCENTAGE },
      rows: [
        new docx.TableRow({ tableHeader: true, children: ['EĞİTİM KONULARI', 'SÜRE'].map(h => _sjWordHucre(new docx.Paragraph({ children: [new docx.TextRun({ text: h, bold: true, size: _SJ_WORD_METIN_BOYUT, color: 'FFFFFF' })] }), { shading: { fill: '0B2C52', color: 'auto', type: docx.ShadingType.CLEAR } })) }),
        ...konuSatirlari('1. Genel Konular', SERTIFIKA_KONULARI.genel, plan.genel),
        ...konuSatirlari('2. Sağlık Konuları', SERTIFIKA_KONULARI.saglik, plan.saglik),
        ...konuSatirlari('3. Teknik Konular', SERTIFIKA_KONULARI.teknik, plan.teknik),
        new docx.TableRow({ children: [_sjWordHucre(new docx.Paragraph({ children: [new docx.TextRun({ text: '4. İşe ve işyerine özgü riskler / risk değerlendirmesine dayalı konular', bold: true, size: _SJ_WORD_METIN_BOYUT, color: '0B2C52' })] }), { columnSpan: 2, shading: { fill: 'F1F5F9', color: 'auto', type: docx.ShadingType.CLEAR } })] }),
        ...plan.diger.map(([k, s]) => new docx.TableRow({ children: [
          _sjWordHucre(new docx.Paragraph({ children: [new docx.TextRun({ text: k, size: _SJ_WORD_METIN_BOYUT })] })),
          _sjWordHucre(new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: `${s} dk`, size: _SJ_WORD_METIN_BOYUT })] }))
        ]})),
        new docx.TableRow({ children: [
          _sjWordHucre(new docx.Paragraph({ children: [new docx.TextRun({ text: '4. Diğer konular toplamı', bold: true, size: _SJ_WORD_METIN_BOYUT })] })),
          _sjWordHucre(new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: dakikayiSaateCevir(digerToplam), bold: true, size: _SJ_WORD_METIN_BOYUT })] }))
        ]}),
        new docx.TableRow({ children: [
          _sjWordHucre(new docx.Paragraph({ children: [new docx.TextRun({ text: 'GENEL TOPLAM', bold: true, size: 22, color: '0B2C52' })] }), { shading: { fill: 'F1F5F9', color: 'auto', type: docx.ShadingType.CLEAR } }),
          _sjWordHucre(new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: veri.toplamSure, bold: true, size: 22, color: '0B2C52' })] }), { shading: { fill: 'F1F5F9', color: 'auto', type: docx.ShadingType.CLEAR } })
        ]})
      ]
    })
  ];

  const kenar = { top: 720, right: 720, bottom: 720, left: 720 };
  // Kullanıcı isteği: "yaptığın sertifikalar PDF raporu ile aynı olmalı,
  // ilk sayfa yatay ikincisi dikey olacak" — PDF'teki .egt-sayfa çerçevesiyle
  // (border:3px solid #0b2c52) aynı görünüm için sayfa kenarlığı da eklendi.
  const cerceve = { style: docx.BorderStyle.SINGLE, size: 24, color: '0B2C52', space: 24 };
  const cerceveKenari = { borders: { pageBorderTop: cerceve, pageBorderRight: cerceve, pageBorderBottom: cerceve, pageBorderLeft: cerceve, pageBorderDisplay: 'allPages', pageBorderOffsetFrom: 'page', pageBorderZOrder: 'front' } };
  const doc = new docx.Document({
    sections: [
      { properties: { page: { size: { orientation: docx.PageOrientation.LANDSCAPE }, margin: kenar, ...cerceveKenari } }, children: onCocuklari },
      { properties: { page: { size: { orientation: docx.PageOrientation.PORTRAIT }, margin: kenar, ...cerceveKenari } }, children: arkaCocuklari }
    ]
  });
  const blob = await docx.Packer.toBlob(doc);
  saveAs(blob, `${stajyer.adSoyad}_Temel_ISG_Sertifikasi`.replace(/[^\p{L}\p{N}]+/gu, '_') + '.docx');
}

async function stajyerSertifikasiOlustur(id, secim, format) {
  const stajyer = stajyerIdIleGetirRepo(id);
  if (!stajyer || !stajyer.isgEgitimTarihi) {
    alert('Sertifika oluşturulamadı: Temel İSG Eğitim Tarihi girilmemiş.');
    return;
  }

  const firma = aktifFirmaGetir();
  if (!firma) { alert('Sertifika oluşturulamadı: firma bilgisi eksik.'); return; }

  const tehlikeSinifi = (secim && TEHLIKE_SINIFLARI.includes(secim.tehlikeSinifi)) ? secim.tehlikeSinifi : ((TEHLIKE_SINIFLARI.includes(firma.tehlikeSinifi) ? firma.tehlikeSinifi : 'Az Tehlikeli'));
  if (format === 'word') {
    const veriOnizleme = sertifikaVerisiOlustur(stajyer, { tehlikeSinifi });
    await _sjSertifikasiWordOlustur(stajyer, firma, tehlikeSinifi, veriOnizleme, veriOnizleme.plan);
    return;
  }
  const veri = sertifikaVerisiOlustur(stajyer, { tehlikeSinifi });
  const plan = veri.plan;
  const belgeNo = _sjBelgeNoUret(stajyer, firma);
  const logo = firmaLogoGetir(firma.id);
  const egitimTarihiGoruntu = stajyer.isgEgitimTarihi2 ? `${gunAyYil(stajyer.isgEgitimTarihi)} - ${gunAyYil(stajyer.isgEgitimTarihi2)}` : gunAyYil(stajyer.isgEgitimTarihi);
  const sonGunTarihi = isgEgitimEfektifTarihi(stajyer);

  const on = `
    <section class="egt-sayfa egt-yatay">
      <div class="egt-ustbilgi">
        ${logo ? `<img class="egt-logo" src="${logo}">` : ''}
        <div class="egt-baslik-blok">
          <div class="egt-baslik">TEMEL İŞ SAĞLIĞI VE GÜVENLİĞİ EĞİTİMİ</div>
          <div class="egt-belgeno">Belge No: ${_sjSertKacir(belgeNo)}</div>
        </div>
      </div>

      <p class="egt-metin">
        İşbu belge, <b>${_sjSertKacir(stajyer.adSoyad)}</b> adına; Çalışanların İş Sağlığı ve Güvenliği Eğitimlerinin Usul ve Esasları Hakkında Yönetmelik
        kapsamında <b>Temel İş Sağlığı ve Güvenliği Eğitimi</b>'ni tamamlaması üzerine düzenlenmiştir.
      </p>

      <table class="egt-bilgi">
        <tr><th>Adı Soyadı</th><td colspan="3">${_sjSertKacir(stajyer.adSoyad)}</td></tr>
        <tr><th>Okul / Bölüm</th><td>${_sjSertKacir(stajyer.okul)}</td><th>Okul Bölümü</th><td>${_sjSertKacir(stajyer.okulBolumu) || '-'}</td></tr>
        <tr><th>Staj Yapılan Bölüm</th><td>${_sjSertKacir(stajyer.bolum)}</td><th>Sınıf / Dönem</th><td>${_sjSertKacir(stajyer.sinif) || '-'}</td></tr>
        <tr><th>İşyeri Ünvanı</th><td>${_sjSertKacir(firma.ad)}</td><th>Tehlike Sınıfı</th><td>${_sjSertKacir(tehlikeSinifi)}</td></tr>
        <tr><th>Eğitim Tarihi</th><td>${_sjSertKacir(egitimTarihiGoruntu)}</td><th>Geçerlilik Tarihi</th><td>${_sjSertKacir(gunAyYil(veri.gecerlilikTarihi))}</td></tr>
        <tr><th>Eğitim Süresi</th><td>${_sjSertKacir(veri.toplamSure)} (${veri.toplamDakika} dk)</td><th>Eğitim Şekli</th><td>☑ Yüz yüze &nbsp;&nbsp; ☐ Uzaktan</td></tr>
      </table>

      <div class="egt-tarih">${_sjSertKacir(gunAyYil(sonGunTarihi))}</div>

      ${_sjImzaSatirlariHtml()}

      <div class="egt-altbilgi">Eğitim içeriği ve konu bazlı süreler belgenin ikinci sayfasındadır.</div>
    </section>
  `;

  const arka = `
    <section class="egt-sayfa egt-dikey" id="sjArkaSayfa">
      <div class="egt-ustbilgi">
        <div class="egt-baslik-blok">
          <div class="egt-baslik" style="font-size:13pt;">EĞİTİM KONULARI VE SÜRELERİ</div>
          <div class="egt-belgeno">Katılımcı: ${_sjSertKacir(stajyer.adSoyad)} &nbsp;|&nbsp; Tehlike Sınıfı: ${_sjSertKacir(tehlikeSinifi)} &nbsp;|&nbsp; Toplam: ${_sjSertKacir(veri.toplamSure)}</div>
        </div>
      </div>

      <table class="egt-konu">
        <thead><tr><th>EĞİTİM KONULARI</th><th class="center">SÜRE</th></tr></thead>
        <tbody>
          ${_sjKonuSatirlariHtml('1. Genel Konular', SERTIFIKA_KONULARI.genel, plan.genel)}
          ${_sjKonuSatirlariHtml('2. Sağlık Konuları', SERTIFIKA_KONULARI.saglik, plan.saglik)}
          ${_sjKonuSatirlariHtml('3. Teknik Konular', SERTIFIKA_KONULARI.teknik, plan.teknik)}
          <tr class="egt-konu-baslik"><td colspan="2">4. İşe ve işyerine özgü riskler / risk değerlendirmesine dayalı konular</td></tr>
          ${plan.diger.map(([k, s]) => `<tr><td>${_sjSertKacir(k)}</td><td class="center">${_sjSertKacir(s)} dk</td></tr>`).join('')}
          <tr class="egt-konu-toplam"><td>4. Diğer konular toplamı</td><td class="center">${_sjSertKacir(dakikayiSaateCevir(plan.diger.reduce((a, r) => a + (Number(r[1]) || 0), 0)))}</td></tr>
          <tr class="egt-genel-toplam"><td>GENEL TOPLAM</td><td class="center">${_sjSertKacir(veri.toplamSure)}</td></tr>
        </tbody>
      </table>
    </section>
  `;

  const html = `<div id="sjSertifikaPdf">${_sjOrtakStilHtml('#sjSertifikaPdf')}${on}${arka}</div>`;

  const mount = document.getElementById('yazdirmaAlani');
  mount.innerHTML = html;
  mount.style.display = 'block';

  const dosyaAdi = `${stajyer.adSoyad}_Temel_ISG_Sertifikasi`.replace(/[^\p{L}\p{N}]+/gu, '_');

  const onCanvas = await _sjSayfaCanvasaCevir(mount.querySelector('.egt-yatay'));
  const arkaCanvas = await _sjSayfaCanvasaCevir(mount.querySelector('.egt-dikey'));

  const pdf = new jspdf.jsPDF('l', 'mm', 'a4');
  pdf.addImage(onCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 297, 210);
  pdf.addPage('a4', 'p');
  pdf.addImage(arkaCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, 297);
  pdf.save(`${dosyaAdi}.pdf`);

  mount.innerHTML = '';
  mount.style.display = 'none';
}
