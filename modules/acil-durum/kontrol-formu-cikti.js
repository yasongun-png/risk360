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
    // Kullanıcı isteği: "mavi başlıklar var onları siyaha çevirelim" --
    // docx.js'in Heading1/Heading2 stilleri varsayılan olarak mavi; renk
    // burada elle siyaha zorlanmazsa metin rengini miras alıyor.
    children: [new docx.TextRun({ text: metin, bold: true, color: '000000' })]
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

const _KF_IMZA_KENARLIK = { style: docx.BorderStyle.SINGLE, size: 4, color: 'CBD5E1' };

// İş İzni modülünün belge çıktısındaki (bkz. modules/is-izni/cikti.js
// _izImzaHucre — başlık/ad/boşluk/tarih düzeni) ile aynı görsel kalıptaki
// imza kutusu — burada dijital imza yerine, sahada elle imzalanacak
// basılı forma uygun şekilde boş Ad/Tarih satırları + imza için boşluk içerir.
function _kfImzaHucresi(baslik) {
  return new docx.TableCell({
    borders: { top: _KF_IMZA_KENARLIK, bottom: _KF_IMZA_KENARLIK, left: _KF_IMZA_KENARLIK, right: _KF_IMZA_KENARLIK },
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
    children: [
      new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { after: 80 }, children: [new docx.TextRun({ text: baslik.toLocaleUpperCase('tr'), bold: true, size: 18 })] }),
      new docx.Paragraph({ spacing: { after: 60 }, children: [new docx.TextRun({ text: 'Ad Soyad: ________________________', size: 18 })] }),
      new docx.Paragraph({ spacing: { after: 220 }, children: [new docx.TextRun({ text: 'Tarih: ________________', size: 18 })] }),
      new docx.Paragraph({ spacing: { after: 0 }, children: [new docx.TextRun({ text: 'İmza:', size: 18 })] }),
      new docx.Paragraph({ spacing: { after: 0 }, children: [new docx.TextRun({ text: '' })] })
    ]
  });
}

function _kfImzaTablosu(basliklar) {
  return new docx.Table({
    width: { size: 100, type: docx.WidthType.PERCENTAGE },
    rows: [new docx.TableRow({ height: { value: 1360, rule: docx.HeightRule.ATLEAST }, children: basliklar.map(_kfImzaHucresi) })]
  });
}

// Kayıttaki fotoUrl'i (Storage https URL ya da fotoBuyukKaydet'in
// "fotoref:<id>" referansı olabilir -- bkz. modules/acil-durum/ui.js
// ekipmanFotoDosya, modules/kimyasal/ui.js sdsGorseli ile aynı fotoYukle
// deseni) docx.js ImageRun'ın kabul ettiği ham byte dizisine + gerçek
// en/boy oranını koruyan ölçülere çevirir. Fotoğraf yoksa/çözülemezse
// null döner, çağıran taraf o durumda görsel eklemeden devam eder.
async function _kfFotoVerisiGetir(url) {
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
    const MAKS_GENISLIK = 320;
    const oran = olcu.genislik > MAKS_GENISLIK ? MAKS_GENISLIK / olcu.genislik : 1;
    return {
      veri: new Uint8Array(arrayBuffer),
      genislik: Math.round(olcu.genislik * oran),
      yukseklik: Math.round(olcu.yukseklik * oran)
    };
  } catch (e) {
    console.error('Ekipman fotoğrafı Word belgesine eklenemedi:', e);
    return null;
  }
}

// Tek bir ekipman kaydının başlığı + kontrol tablosu + bulgular (+ varsa
// fotoğrafı). İmza kutusu her ekipmanın altında DEĞİL, kullanıcı isteğiyle
// yalnızca belgenin en altında tek sefer basılıyor (bkz.
// ekipmanKontrolFormuWordOlustur sonu).
// Kullanıcı isteği: "her bir ekipman word raporunda ayrı sayfada
// gösterilsin" -- sayfaSonuOncesi true ise (belgenin en başındaki ekipman
// hariç) bu blok yeni bir sayfada başlar.
async function _kfEkipmanBlogu(ekipman, sorular, sayfaSonuOncesi) {
  const foto = await _kfFotoVerisiGetir(ekipman.fotoUrl);
  return [
    new docx.Paragraph({
      pageBreakBefore: !!sayfaSonuOncesi,
      spacing: { before: 200, after: 80 },
      shading: { fill: 'F3F4F6' },
      children: [new docx.TextRun({ text: `${ekipman.ekipmanNo || '-'} — ${ekipman.lokasyon || ''}`, bold: true, size: 22 })]
    }),
    _kfParagraf(
      `Lokasyon: ${_kfTireVeyaDeger(ekipman.lokasyon)}   |   Sorumlu: ${_kfTireVeyaDeger(ekipman.sorumlu)}`,
      { spacing: { after: 60 } }
    ),
    _kfParagraf(
      `Son Kontrol: ${_kfTireVeyaDeger(ekipman.sonKontrol)}   |   Sonraki Kontrol: ${_kfTireVeyaDeger(ekipman.sonrakiKontrol)}   |   Durum: ${_kfTireVeyaDeger(ekipman.durum)}`,
      { spacing: { after: 120 } }
    ),
    _kfKontrolTablosu(sorular, ekipman.kontrolCevaplari || {}),
    _kfParagraf(`Bulgular: ${_kfTireVeyaDeger(ekipman.bulgular)}`, { spacing: { before: 120, after: foto ? 80 : 200 } }),
    ...(foto ? [new docx.Paragraph({
      spacing: { after: 200 },
      children: [new docx.ImageRun({ data: foto.veri, transformation: { width: foto.genislik, height: foto.yukseklik } })]
    })] : [])
  ];
}

// Bir ekipman listesini bölüm adına göre gruplar (bölüm boşsa "Bölüm
// Belirtilmemiş" altında toplanır), grup adına göre alfabetik sıralı döner.
function _kfBolumleraGrupla(kayitlar) {
  const gruplar = {};
  kayitlar.forEach(e => {
    const bolum = (e.bolum || '').trim() || 'Bölüm Belirtilmemiş';
    (gruplar[bolum] = gruplar[bolum] || []).push(e);
  });
  return Object.keys(gruplar).sort((a, b) => a.localeCompare(b, 'tr')).map(bolum => ({ bolum, kayitlar: gruplar[bolum] }));
}

// turFiltre boşsa (veya 'Tüm Türler') kayıt bulunan HER tür için ayrı,
// sayfa sonuyla bölünmüş bir kontrol formu bölümü üretilir; doluysa
// yalnızca o tür için tek bölümlük form üretilir. bolumFiltre doluysa
// yalnızca o departmanın ekipmanları listelenir; boşsa her tür bölümünün
// içinde kayıtlar YİNE bölüm (departman) adına göre alt başlıklara
// ayrılır (kullanıcı isteği: "kontrol formunu bölüm bazında yapabileyim" /
// "bölüm filtresi de olsun ve buna göre rapor hazırlanabilsin").
async function ekipmanKontrolFormuWordOlustur(firma, turFiltre, bolumFiltre) {
  let tumEkipman = ekipmanlariTumunuGetir();
  if (bolumFiltre) tumEkipman = tumEkipman.filter(e => (e.bolum || '').trim() === bolumFiltre);
  const turler = turFiltre ? [turFiltre] : EKIPMAN_TURLERI.filter(t => tumEkipman.some(e => e.tur === t));

  if (turler.length === 0 || !tumEkipman.some(e => turler.includes(e.tur))) {
    alert('Kontrol formu üretebilmek için önce ilgili tür/bölümde en az bir ekipman kaydı ekleyin.');
    return;
  }

  const bugun = gunAyYil(bugunIso());
  const cocuklar = [
    new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { after: 100 }, children: [new docx.TextRun({ text: 'ACİL DURUM EKİPMANLARI KONTROL FORMU', bold: true, size: 32 })] }),
    new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { after: 300 }, children: [new docx.TextRun({ text: `${firma.ad || ''}${bolumFiltre ? ' — ' + bolumFiltre + ' Bölümü' : ''}   |   Düzenleme Tarihi: ${bugun}`, size: 20 })] })
  ];

  let uretilenBolumSayisi = 0;
  for (const tur of turler) {
    const kayitlar = tumEkipman.filter(e => e.tur === tur).sort((a, b) => (a.ekipmanNo || '').localeCompare(b.ekipmanNo || '', 'tr'));
    if (kayitlar.length === 0) continue;
    const sorular = EKIPMAN_KONTROL_SORULARI[tur] || [];
    cocuklar.push(_kfBaslik(`Kontrol Formu — ${tur}`, docx.HeadingLevel.HEADING_1, uretilenBolumSayisi > 0));
    uretilenBolumSayisi++;
    cocuklar.push(_kfParagraf(`Bu form, ${tur} türündeki ${kayitlar.length} ekipmanın periyodik kontrolü için düzenlenmiştir.`, { spacing: { after: 160 } }));

    // Kullanıcı isteği: "her bir ekipman word raporunda ayrı sayfada
    // gösterilsin" -- tür başlığından hemen sonraki İLK ekipman aynı
    // sayfada kalır (başlık zaten kendi sayfasını açtı), ondan SONRAKİ her
    // ekipman (bölüm alt başlıkları arasında dahil) kendi sayfasında başlar.
    let ilkEkipmanBuTurde = true;
    for (const grup of _kfBolumleraGrupla(kayitlar)) {
      cocuklar.push(_kfBaslik(`Bölüm: ${grup.bolum}`, docx.HeadingLevel.HEADING_2));
      for (const ekipman of grup.kayitlar) {
        cocuklar.push(...(await _kfEkipmanBlogu(ekipman, sorular, !ilkEkipmanBuTurde)));
        ilkEkipmanBuTurde = false;
      }
    }
  }

  // İmza kutusu her ekipmanın altında değil, kullanıcı isteğiyle yalnızca
  // belgenin en sonunda TEK sefer basılıyor.
  cocuklar.push(_kfBaslik('Kontrol Onayı', docx.HeadingLevel.HEADING_1, true));
  cocuklar.push(_kfImzaTablosu(['Kontrolü Yapan', 'Bölüm Sorumlusu']));

  const dokuman = new docx.Document({ sections: [{ properties: {}, children: cocuklar }] });
  const blob = await docx.Packer.toBlob(dokuman);
  const turAdi = turFiltre ? turFiltre : 'Tum_Turler';
  const bolumAdi = bolumFiltre ? '_' + bolumFiltre.replace(/[^\p{L}\p{N}]+/gu, '_') : '';
  saveAs(blob, `Ekipman_Kontrol_Formu_${turAdi}${bolumAdi}_${(firma.ad || 'firma').replace(/[^\p{L}\p{N}]+/gu, '_')}.docx`);
}
