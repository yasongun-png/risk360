// Ekipman türüne göre ayrı ayrı, madde bazlı Word kontrol formu üretimi.
// modules/kurul/cikti.js ve plan-cikti.js ile aynı docx.js kalıbı — burada
// tek fark: her ekipman türü kendi başlığı ve sayfa sonuyla ayrı bir bölüm
// olarak basılıyor (kullanıcı isteği: "türlerine göre ayrı ayrı kontrol
// formu"), tür filtresi seçiliyse yalnız o tür üretilir.

function _kfTireVeyaDeger(v) {
  const s = (v ?? '').toString().trim();
  return s || '-';
}

function _kfBaslik(metin, seviye, sayfaSonuOncesi) {
  return new docx.Paragraph({
    heading: seviye || docx.HeadingLevel.HEADING_2,
    pageBreakBefore: !!sayfaSonuOncesi,
    spacing: { before: 260, after: 120 },
    children: [new docx.TextRun({ text: metin, bold: true })]
  });
}

function _kfParagraf(metin, secenekler) {
  return new docx.Paragraph(Object.assign({ spacing: { after: 120 }, children: [new docx.TextRun({ text: metin })] }, secenekler || {}));
}

function _kfHucre(metin, baslikMi) {
  return new docx.TableCell({
    shading: baslikMi ? { fill: 'E5E7EB' } : undefined,
    children: [new docx.Paragraph({ children: [new docx.TextRun({ text: String(metin ?? '') || '-', bold: !!baslikMi, size: 18 })] })]
  });
}

function _kfKontrolTablosu(sorular, cevaplar) {
  return new docx.Table({
    width: { size: 100, type: docx.WidthType.PERCENTAGE },
    rows: [
      new docx.TableRow({ children: [_kfHucre('Kontrol Kriteri', true), _kfHucre('Sonuç', true)] }),
      ...sorular.map(s => new docx.TableRow({ children: [_kfHucre(s.soru), _kfHucre(cevaplar[s.id] || '—')] }))
    ]
  });
}

// Tek bir ekipman kaydının başlığı + kontrol tablosu + bulgular + imza satırı.
function _kfEkipmanBlogu(ekipman, sorular) {
  return [
    new docx.Paragraph({
      spacing: { before: 200, after: 80 },
      shading: { fill: 'F3F4F6' },
      children: [new docx.TextRun({ text: `${ekipman.ekipmanNo || '-'} — ${ekipman.ad || ''}`, bold: true, size: 22 })]
    }),
    _kfParagraf(
      `Lokasyon: ${_kfTireVeyaDeger(ekipman.lokasyon)}   |   Bölüm: ${_kfTireVeyaDeger(ekipman.bolum)}   |   Sorumlu: ${_kfTireVeyaDeger(ekipman.sorumlu)}`,
      { spacing: { after: 60 } }
    ),
    _kfParagraf(
      `Son Kontrol: ${_kfTireVeyaDeger(ekipman.sonKontrol)}   |   Sonraki Kontrol: ${_kfTireVeyaDeger(ekipman.sonrakiKontrol)}   |   Durum: ${_kfTireVeyaDeger(ekipman.durum)}`,
      { spacing: { after: 120 } }
    ),
    _kfKontrolTablosu(sorular, ekipman.kontrolCevaplari || {}),
    _kfParagraf(`Bulgular: ${_kfTireVeyaDeger(ekipman.bulgular)}`, { spacing: { before: 120, after: 200 } }),
    _kfParagraf('Kontrol Eden: ______________________        Tarih: __________        İmza: ______________', { spacing: { after: 100 } })
  ];
}

// turFiltre boşsa (veya 'Tüm Türler') kayıt bulunan HER tür için ayrı,
// sayfa sonuyla bölünmüş bir kontrol formu bölümü üretilir; doluysa
// yalnızca o tür için tek bölümlük form üretilir.
async function ekipmanKontrolFormuWordOlustur(firma, turFiltre) {
  const tumEkipman = ekipmanlariTumunuGetir();
  const turler = turFiltre ? [turFiltre] : EKIPMAN_TURLERI.filter(t => tumEkipman.some(e => e.tur === t));

  if (turler.length === 0 || !tumEkipman.some(e => turler.includes(e.tur))) {
    alert('Kontrol formu üretebilmek için önce ilgili türde en az bir ekipman kaydı ekleyin.');
    return;
  }

  const bugun = gunAyYil(bugunIso());
  const cocuklar = [
    new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { after: 100 }, children: [new docx.TextRun({ text: 'ACİL DURUM EKİPMANLARI KONTROL FORMU', bold: true, size: 32 })] }),
    new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { after: 300 }, children: [new docx.TextRun({ text: `${firma.ad || ''}   |   Düzenleme Tarihi: ${bugun}`, size: 20 })] })
  ];

  turler.forEach((tur, i) => {
    const kayitlar = tumEkipman.filter(e => e.tur === tur).sort((a, b) => (a.ekipmanNo || '').localeCompare(b.ekipmanNo || '', 'tr'));
    if (kayitlar.length === 0) return;
    const sorular = EKIPMAN_KONTROL_SORULARI[tur] || [];
    cocuklar.push(_kfBaslik(`Kontrol Formu — ${tur}`, docx.HeadingLevel.HEADING_1, i > 0));
    cocuklar.push(_kfParagraf(`Bu form, ${tur} türündeki ${kayitlar.length} ekipmanın periyodik kontrolü için düzenlenmiştir.`, { spacing: { after: 160 } }));
    kayitlar.forEach(ekipman => cocuklar.push(..._kfEkipmanBlogu(ekipman, sorular)));
  });

  const dokuman = new docx.Document({ sections: [{ properties: {}, children: cocuklar }] });
  const blob = await docx.Packer.toBlob(dokuman);
  const turAdi = turFiltre ? turFiltre : 'Tum_Turler';
  saveAs(blob, `Ekipman_Kontrol_Formu_${turAdi}_${(firma.ad || 'firma').replace(/[^\p{L}\p{N}]+/gu, '_')}.docx`);
}
