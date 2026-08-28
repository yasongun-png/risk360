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

// Kullanıcı isteği: "Kontrol Onayı word den bulunu çıkar" — Word'e basılan
// imza tablosu (Kontrol Onayı bölümü) ve onu üreten yardımcılar
// (_kfImzaGorseliVerisiGetir/_kfImzaHucresi/_kfImzaTablosu) kaldırıldı;
// imzalar artık yalnızca uygulama içinde bölüm bazlı kalıcı olarak
// tutuluyor (bkz. ui.js _ekipmanImzaPaneliCiz).

// Kayıttaki fotoUrl'i (Storage https URL ya da fotoBuyukKaydet'in
// "fotoref:<id>" referansı olabilir -- bkz. modules/acil-durum/ui.js
// ekipmanFotoDosya, modules/kimyasal/ui.js sdsGorseli ile aynı fotoYukle
// deseni) docx.js ImageRun'ın kabul ettiği ham byte dizisine + gerçek
// en/boy oranını koruyan ölçülere çevirir. Fotoğraf yoksa/çözülemezse
// null döner, çağıran taraf o durumda görsel eklemeden devam eder.
async function _kfFotoVerisiGetir(url, maksGenislik) {
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
    const MAKS_GENISLIK = maksGenislik || 320;
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
  // Kullanıcı isteği: "acil durum ekipman kontrollerine her bir kontrol
  // için 3 adet fotoğraf ekleyebilmek istiyorum" -> "diğer fotolarda yan
  // yana rapora eklensin, word'e" -> "fotoğraf ekleyince worddeki fotolar
  // çok küçüldü" — sabit 170px HER zaman (tek fotoğrafta bile) küçük
  // kalıyordu; artık genişlik gerçekte kaç fotoğraf DOLU olduğuna göre
  // belirlenir (1 fotoğrafta eskisi kadar büyük, 2/3 fotoğrafta sayfaya
  // sığacak şekilde orantılı küçülür).
  const fotoUrlleri = [ekipman.fotoUrl, ekipman.fotoUrl2, ekipman.fotoUrl3].filter(Boolean);
  const FOTO_GENISLIK_SAYIYA_GORE = { 1: 320, 2: 260, 3: 190 };
  const fotoGenislik = FOTO_GENISLIK_SAYIYA_GORE[fotoUrlleri.length] || 190;
  const fotolar = (await Promise.all(
    fotoUrlleri.map(u => _kfFotoVerisiGetir(u, fotoGenislik))
  )).filter(Boolean);
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
    // Kullanıcı isteği: "acil durum malzeme dolaplarında kontrol yaparken
    // bir envanter listesi yapalım ... kontrollerde de bu kontrol yapılır"
    // — dolabın envanterinde malzeme varsa, aynı tablo biçimiyle (Kriter/
    // Sonuç) her malzemenin en son kontroldeki Uygun/Uygun Değil işareti de
    // basılır.
    ...((Array.isArray(ekipman.malzemeListesi) && ekipman.malzemeListesi.length) ? [
      _kfParagraf('Dolap İçi Malzeme Kontrolü:', { spacing: { before: 120, after: 80 } }),
      _kfKontrolTablosu(ekipman.malzemeListesi.map(m => ({ id: m.id, soru: `${m.ad} (${m.adet || 1} adet)` })), ekipman.malzemeKontrolleri || {})
    ] : []),
    _kfParagraf(`Bulgular: ${_kfTireVeyaDeger(ekipman.bulgular)}`, { spacing: { before: 120, after: 80 } }),
    // Kullanıcı isteği: "yapılan işlemin hemen üstünde bakım yapanın adı
    // soyadı girilsin" — bkz. index.html'deki alan sırasıyla aynı.
    _kfParagraf(`Bakım Yapan: ${_kfTireVeyaDeger(ekipman.bakimYapan)}`, { spacing: { before: 0, after: 80 } }),
    // Kullanıcı isteği: "bakımcı yaptığı işi de barkod ile açılan forma
    // yazıp kayıt edebilsin" — Bulgular'ın hemen altında ayrı satır.
    _kfParagraf(`Yapılan İşlem: ${_kfTireVeyaDeger(ekipman.yapilanIslem)}`, { spacing: { before: 0, after: fotolar.length ? 80 : 200 } }),
    ...(fotolar.length ? [new docx.Paragraph({
      spacing: { after: 200 },
      children: fotolar.flatMap((f, i) => [
        new docx.ImageRun({ data: f.veri, transformation: { width: f.genislik, height: f.yukseklik } }),
        ...(i < fotolar.length - 1 ? [new docx.TextRun({ text: '   ' })] : [])
      ])
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
async function ekipmanKontrolFormuWordOlustur(firma, turFiltre, bolumFiltre, gorus) {
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

  // Kullanıcı isteği: "PDF/Word raporlarına serbest bir bölüm ekleyelim,
  // İş Güvenliği Uzmanının görüşlerini yazdığı bir yer olsun" — doldurulup
  // doldurulmadığına bakılmaksızın (boşsa hiç eklenmez) belgenin sonunda,
  // kendi sayfasında basılır.
  if ((gorus || '').trim()) {
    cocuklar.push(_kfBaslik('Genel Değerlendirme', docx.HeadingLevel.HEADING_1, true));
    (gorus || '').trim().split(/\n+/).filter(Boolean).forEach(paragraf => {
      cocuklar.push(_kfParagraf(paragraf, { spacing: { after: 120 } }));
    });
  }

  // Kullanıcı isteği: "Kontrol Onayı word den bulunu çıkar" — imza kutusu
  // artık Word'e basılmıyor (imzalar zaten uygulama içinde bölüm bazlı
  // olarak kalıcı tutuluyor, bkz. ui.js _ekipmanImzaPaneliCiz).

  const dokuman = new docx.Document({ sections: [{ properties: {}, children: cocuklar }] });
  const blob = await docx.Packer.toBlob(dokuman);
  const turAdi = turFiltre ? turFiltre : 'Tum_Turler';
  const bolumAdi = bolumFiltre ? '_' + bolumFiltre.replace(/[^\p{L}\p{N}]+/gu, '_') : '';
  saveAs(blob, `Ekipman_Kontrol_Formu_${turAdi}${bolumAdi}_${(firma.ad || 'firma').replace(/[^\p{L}\p{N}]+/gu, '_')}.docx`);
}

// Kullanıcı isteği: "acil durum ekipman kontrolünde word raporu kalsın bir
// de liste şeklinde rapor olsun" -- ekipmanKontrolFormuWordOlustur (her
// ekipman tam detaylı, ayrı sayfada) korunuyor; bunun YANINDA, aynı tür/
// bölüm filtreleriyle çalışan, her ekipmanı TEK SATIRDA gösteren kompakt
// bir tablo (liste) raporu üretir -- ekranın "Dışa Aktar" Excel'iyle aynı
// kolonlar (bkz. ui.js EKIPMAN_EXPORT_KOLONLARI), Word olarak.
async function ekipmanKontrolFormuListeWordOlustur(firma, turFiltre, bolumFiltre) {
  let liste = ekipmanlariGetir('');
  if (turFiltre) liste = liste.filter(e => e.tur === turFiltre);
  if (bolumFiltre) liste = liste.filter(e => (e.bolum || '').trim() === bolumFiltre);
  liste.sort((a, b) => (a.tur || '').localeCompare(b.tur || '', 'tr') || (a.ekipmanNo || '').localeCompare(b.ekipmanNo || '', 'tr'));

  if (!liste.length) {
    alert('Liste raporu üretebilmek için önce ilgili tür/bölümde en az bir ekipman kaydı ekleyin.');
    return;
  }

  const bugun = gunAyYil(bugunIso());
  // Kullanıcı isteği: "durumunrapora koyma" -- Durum kolonu kaldırıldı.
  const basliklar = ['Ekipman No', 'Bölüm', 'Lokasyon', 'Son Kontrol', 'Sonraki Kontrol', 'Bulgular'];
  const SUTUN_SAYISI = basliklar.length;

  // Kullanıcı isteği: "rapor başlığı olmamaış" -- düz bir liste tüm
  // türleri karışık gösterip başlıksız görünüyordu; artık tür başına ayrı
  // bir başlık (grup) satırıyla bölünüyor (Tür artık ayrı kolon değil, bu
  // grup başlığında geçiyor).
  const satirlar = [];
  let mevcutTur = null;
  liste.forEach(e => {
    if (e.tur !== mevcutTur) {
      mevcutTur = e.tur;
      satirlar.push(new docx.TableRow({
        children: [new docx.TableCell({
          columnSpan: SUTUN_SAYISI,
          shading: { fill: 'D1D5DB' },
          children: [new docx.Paragraph({ children: [new docx.TextRun({ text: mevcutTur || 'Diğer', bold: true, size: 20 })] })]
        })]
      }));
      satirlar.push(new docx.TableRow({ tableHeader: true, children: basliklar.map(b => _kfHucre(b, true)) }));
    }
    satirlar.push(new docx.TableRow({
      children: [
        _kfHucre(e.ekipmanNo), _kfHucre(e.bolum), _kfHucre(e.lokasyon),
        _kfHucre(e.sonKontrol), _kfHucre(e.sonrakiKontrol), _kfHucre(e.bulgular)
      ]
    }));
    // Kullanıcı isteği: "dolap malzeme listesi word de görünmeli" —
    // detaylı Kontrol Formu (Word) raporunda zaten gösteriliyordu (bkz.
    // _kfEkipmanBlogu); bu kompakt liste raporunda da Ekipman Dolabı
    // satırının hemen altına, malzeme adı/adedi/durumunu tek satırda
    // özetleyen ek bir satır eklendi.
    if (Array.isArray(e.malzemeListesi) && e.malzemeListesi.length) {
      const cevaplar = e.malzemeKontrolleri || {};
      const ozet = e.malzemeListesi
        .map(m => `${m.ad} (${m.adet || 1} adet): ${cevaplar[m.id] || '—'}`)
        .join('   |   ');
      satirlar.push(new docx.TableRow({
        children: [new docx.TableCell({
          columnSpan: SUTUN_SAYISI,
          children: [new docx.Paragraph({ children: [new docx.TextRun({ text: 'Malzeme Listesi: ' + ozet, italics: true, size: 16 })] })]
        })]
      }));
    }
  });
  const tablo = new docx.Table({ width: { size: 100, type: docx.WidthType.PERCENTAGE }, rows: satirlar });

  const cocuklar = [
    new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { after: 100 }, children: [new docx.TextRun({ text: 'ACİL DURUM EKİPMAN KONTROL LİSTESİ', bold: true, size: 32, color: '000000' })] }),
    new docx.Paragraph({
      alignment: docx.AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new docx.TextRun({
        text: `${firma.ad || ''}${bolumFiltre ? ' — ' + bolumFiltre + ' Bölümü' : ''}${turFiltre ? ' — ' + turFiltre : ''}   |   Düzenleme Tarihi: ${bugun}   |   Toplam: ${liste.length} ekipman`,
        size: 20
      })]
    }),
    tablo
  ];

  const dokuman = new docx.Document({
    sections: [{
      properties: { page: { size: { orientation: docx.PageOrientation.LANDSCAPE }, margin: { top: 720, right: 560, bottom: 720, left: 560 } } },
      children: cocuklar
    }]
  });
  const blob = await docx.Packer.toBlob(dokuman);
  const turAdi = turFiltre ? turFiltre : 'Tum_Turler';
  const bolumAdi = bolumFiltre ? '_' + bolumFiltre.replace(/[^\p{L}\p{N}]+/gu, '_') : '';
  saveAs(blob, `Acil_Durum_Ekipman_Kontrol_Listesi_${turAdi}${bolumAdi}_${(firma.ad || 'firma').replace(/[^\p{L}\p{N}]+/gu, '_')}.docx`);
}

// Kullanıcı isteği: "acil durum malzeme dolapları envanter listesini
// çıktı alıp asmak da istiyorum word olarak bu listeyi de indirebileyim
// ekipman bazında" — kontrol sonuçlarından bağımsız, dolabın İÇİNDE NE
// OLMASI GEREKTİĞİNİ gösteren, kapıya/dolaba asılabilecek sade bir
// envanter listesi. Her "Ekipman Dolabı" kendi sayfasında; malzeme +
// adet + fiziksel kontrol için boş bir "✓" sütunu (asıldıktan sonra elle
// işaretlenebilsin diye).
async function ekipmanMalzemeEnvanteriWordOlustur(firma, bolumFiltre) {
  let dolaplar = ekipmanlariTumunuGetir().filter(e => e.tur === 'Ekipman Dolabı' && Array.isArray(e.malzemeListesi) && e.malzemeListesi.length);
  if (bolumFiltre) dolaplar = dolaplar.filter(e => (e.bolum || '').trim() === bolumFiltre);
  dolaplar.sort((a, b) => (a.ekipmanNo || '').localeCompare(b.ekipmanNo || '', 'tr', { numeric: true }));

  if (!dolaplar.length) {
    alert('Malzeme envanteri üretebilmek için önce en az bir Ekipman Dolabı kaydına malzeme listesi ekleyin.');
    return;
  }

  const bugun = gunAyYil(bugunIso());
  const cocuklar = [
    new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { after: 100 }, children: [new docx.TextRun({ text: 'ACİL DURUM EKİPMAN DOLABI MALZEME ENVANTERİ', bold: true, size: 32, color: '000000' })] }),
    new docx.Paragraph({
      alignment: docx.AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [new docx.TextRun({
        text: `${firma.ad || ''}${bolumFiltre ? ' — ' + bolumFiltre + ' Bölümü' : ''}   |   Düzenleme Tarihi: ${bugun}`,
        size: 20
      })]
    })
  ];

  dolaplar.forEach((dolap, index) => {
    cocuklar.push(_kfBaslik(`${dolap.ekipmanNo || '-'} — ${dolap.lokasyon || ''}`, docx.HeadingLevel.HEADING_1, index > 0));
    cocuklar.push(_kfParagraf(`Bölüm: ${_kfTireVeyaDeger(dolap.bolum)}`, { spacing: { after: 160 } }));
    const satirlar = [
      new docx.TableRow({ children: [_kfHucre('Malzeme', true), _kfHucre('Adet', true), _kfHucre('Kontrol', true)] }),
      ...dolap.malzemeListesi.map(m => new docx.TableRow({
        children: [_kfHucre(m.ad), _kfHucre(m.adet || 1), _kfHucre('☐')]
      }))
    ];
    cocuklar.push(new docx.Table({ width: { size: 100, type: docx.WidthType.PERCENTAGE }, rows: satirlar }));
  });

  const dokuman = new docx.Document({ sections: [{ properties: {}, children: cocuklar }] });
  const blob = await docx.Packer.toBlob(dokuman);
  const bolumAdi = bolumFiltre ? '_' + bolumFiltre.replace(/[^\p{L}\p{N}]+/gu, '_') : '';
  saveAs(blob, `Ekipman_Dolabi_Malzeme_Envanteri${bolumAdi}_${(firma.ad || 'firma').replace(/[^\p{L}\p{N}]+/gu, '_')}.docx`);
}
