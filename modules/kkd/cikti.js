// KKD çıktıları (Word): Zimmet Tutanağı (kişi bazlı, tüm aktif KKD'leri listeler),
// KKD İhlal Tutanağı ve Numune Değerlendirme Formu.

// ==================== ZİMMET TUTANAĞI (WORD) ====================
// Kullanıcı isteği: Desktop\KKD_Zimmet_Tutanagi.docx şablonu "zimmet
// tutanağı olarak kullanalım" — şablonun düzeni (renkler, punto, sütun
// genişlikleri, taahhüt metni) birebir docx.js ile kurulur, personelin
// üzerindeki aktif KKD'ler tabloya doldurulur. Elle doldurmak için en az 14
// satır kalır (şablondaki gibi).
async function kkdZimmetTutanagiWordOlustur(zimmetId) {
  const zimmet = zimmetIdIleGetirRepo(zimmetId);
  if (!zimmet) return;
  if (!window.docx) { alert('docx.js yüklenemedi.'); return; }
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, VerticalAlign, ShadingType, HeightRule, PageNumber } = docx;

  const kalemler = personelinAktifZimmetleriGetir(zimmet.personelId, zimmet.personelAdi);
  const gosterilecekler = kalemler.length ? kalemler : [zimmet];
  const personel = zimmet.personelId && typeof personelIdIleGetirRepo === 'function' ? personelIdIleGetirRepo(zimmet.personelId) : null;
  const firma = aktifFirmaGetir();
  const fa = formAyarlariGetir('kkd');
  const LACIVERT = '1F3A5F';

  const run = (text, o = {}) => new TextRun({ text: String(text ?? ''), bold: !!o.kalin, color: o.renk, size: o.boyut || 18 });
  const hucre = (genislik, cocuklar, o = {}) => new TableCell({
    width: { size: genislik, type: WidthType.DXA },
    verticalAlign: o.ust ? VerticalAlign.TOP : VerticalAlign.CENTER,
    shading: o.dolgu ? { fill: o.dolgu, type: ShadingType.CLEAR, color: 'auto' } : undefined,
    children: [new Paragraph({ alignment: o.orta ? AlignmentType.CENTER : AlignmentType.LEFT, children: cocuklar })]
  });
  const satir = (yukseklik, hucreler, baslikMi) => new TableRow({ tableHeader: !!baslikMi, cantSplit: true, height: { value: yukseklik, rule: HeightRule.ATLEAST }, children: hucreler });
  const tablo = (genislikler, satirlar, orta) => new Table({ columnWidths: genislikler, width: { size: genislikler.reduce((a, b) => a + b, 0), type: WidthType.DXA }, alignment: orta ? AlignmentType.CENTER : undefined, rows: satirlar });
  const bolumBaslik = (metin) => new Paragraph({ spacing: { before: 160, after: 60 }, children: [run(metin, { kalin: true, renk: LACIVERT, boyut: 22 })] });

  // Üst bilgi: başlık + Doküman No / Tarih / Sayfa
  const ustBilgi = tablo([7030, 2835], [satir(1020, [
    hucre(7030, [run('KİŞİSEL KORUYUCU DONANIM (KKD)', { kalin: true, boyut: 28 }), new TextRun({ break: 1 }), run('ZİMMET TUTANAĞI', { kalin: true, boyut: 28 })], { dolgu: 'DCE6F1', orta: true }),
    hucre(2835, [
      run(`Doküman No: ${fa.dokumanNo || ''}`), new TextRun({ break: 1 }),
      run(`Tarih: ${gunAyYil(bugunIso())}`), new TextRun({ break: 1 }),
      new TextRun({ children: ['Sayfa: ', PageNumber.CURRENT, '/', PageNumber.TOTAL_PAGES], size: 18 })
    ])
  ])], true);

  // 1. Personel Bilgileri
  const etiket = (w, m) => hucre(w, [run(m, { kalin: true })], { dolgu: 'F2F2F2' });
  const deger = (w, m) => hucre(w, [run(m)]);
  const personelTablosu = tablo([1928, 3005, 2041, 2891], [
    satir(425, [etiket(1928, 'Adı Soyadı'), deger(3005, zimmet.personelAdi), etiket(2041, 'Sicil / T.C. Kimlik No'), deger(2891, (personel && personel.sicilNo) || zimmet.personelId || '')]),
    satir(425, [etiket(1928, 'Görevi / Unvanı'), deger(3005, zimmet.gorev || (personel && personel.gorev) || ''), etiket(2041, 'Bölümü / Birimi'), deger(2891, zimmet.bolum || (personel && personel.bolum) || '')]),
    satir(425, [etiket(1928, 'Firma'), deger(3005, firma ? firma.ad : ''), etiket(2041, 'İşe Giriş Tarihi'), deger(2891, personel && personel.iseGirisTarihi ? gunAyYil(personel.iseGirisTarihi) : '')])
  ]);

  // 2. Teslim edilen KKD'ler
  const g = [567, 2041, 1474, 1304, 737, 624, 1304, 1814];
  const basliklar = ['Sıra', 'KKD Adı', 'Marka / Model', 'Standart / CE', 'Beden', 'Adet', 'Teslim Tarihi', 'Personel İmzası'];
  const kkdSatirlari = [satir(454, basliklar.map((b, i) => hucre(g[i], [run(b, { kalin: true, renk: 'FFFFFF' })], { dolgu: LACIVERT, orta: true })), true)];
  gosterilecekler.forEach((z, i) => kkdSatirlari.push(satir(351, [
    hucre(g[0], [run(i + 1)], { orta: true }),
    hucre(g[1], [run(z.kkdAdi)]),
    hucre(g[2], [run([z.marka, z.model].filter(Boolean).join(' / '))]),
    hucre(g[3], [run((z.enStandartlari || []).join(', '))]),
    hucre(g[4], [run(z.beden)], { orta: true }),
    hucre(g[5], [run(z.adet)], { orta: true }),
    hucre(g[6], [run(gunAyYil(z.verilisTarihi))], { orta: true }),
    hucre(g[7], [run('')])
  ])));
  for (let i = gosterilecekler.length; i < 14; i++) {
    kkdSatirlari.push(satir(351, g.map((w, j) => hucre(w, [run(j === 0 ? i + 1 : '')], { orta: j === 0 }))));
  }

  // 3. Taahhüt
  const madde = (m) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 20 }, children: [run(m, { boyut: 19 })] });
  const taahhut = [
    bolumBaslik('3. Personel Taahhüdü'),
    new Paragraph({ spacing: { after: 60 }, children: [run('Yukarıda listelenen kişisel koruyucu donanımları eksiksiz ve kullanılabilir durumda teslim aldım. 6331 sayılı İş Sağlığı ve Güvenliği Kanunu ve Kişisel Koruyucu Donanımların İşyerlerinde Kullanılması Hakkında Yönetmelik kapsamında;', { boyut: 19 })] }),
    madde("KKD'lerin doğru kullanımı, bakımı ve saklanması konusunda bilgilendirildim."),
    madde("KKD'leri çalışma süresince, gerekli olan her yerde ve talimatlara uygun şekilde kullanacağım."),
    madde("KKD'leri temiz ve bakımlı tutacak, amacı dışında kullanmayacak, başkasına vermeyeceğim."),
    madde("Hasar gören, kaybolan veya kullanım ömrü dolan KKD'yi derhal amirime / İSG birimine bildirip yenisini talep edeceğim."),
    madde("İşten ayrılmam veya görev değişikliğinde iadesi istenen KKD'leri teslim edeceğim."),
    madde('KKD kullanmamamın iş kazası ve meslek hastalığı riskini artırdığını ve bu durumda mevzuat ile işyeri disiplin hükümlerinin uygulanacağını biliyorum.')
  ];

  // 4. Onay
  const onayTarihi = gunAyYil(zimmet.verilisTarihi) || '';
  const o = (m) => hucre(4933, [run(m)], { ust: true });
  const onayTablosu = tablo([4933, 4933], [
    satir(397, [hucre(4933, [run('TESLİM EDEN', { kalin: true, boyut: 20 })], { dolgu: 'DCE6F1', orta: true }), hucre(4933, [run('TESLİM ALAN (PERSONEL)', { kalin: true, boyut: 20 })], { dolgu: 'DCE6F1', orta: true })]),
    satir(425, [o(`Adı Soyadı / Unvanı: ${zimmet.teslimEden || ''}`), o(`Adı Soyadı / Unvanı: ${[zimmet.personelAdi, zimmet.gorev].filter(Boolean).join(' / ')}`)]),
    satir(425, [o(`Tarih: ${onayTarihi}`), o(`Tarih: ${onayTarihi}`)]),
    satir(907, [o('İmza:'), o('İmza:')])
  ]);

  const belge = new Document({
    styles: { default: { document: { run: { font: 'Calibri', size: 18 } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 850, right: 1020, bottom: 850, left: 1020 } } },
      children: [
        ustBilgi,
        bolumBaslik('1. Personel Bilgileri'), personelTablosu,
        bolumBaslik('2. Teslim Edilen Kişisel Koruyucu Donanımlar'), tablo(g, kkdSatirlari),
        ...taahhut,
        bolumBaslik('4. Onay'), onayTablosu
      ]
    }]
  });
  saveAs(await Packer.toBlob(belge), `KKD_Zimmet_Tutanagi_${(zimmet.personelAdi || zimmet.zimmetNo || 'personel').replace(/\s+/g, '_')}.docx`);
}

// ==================== İHLAL TUTANAĞI ====================
// Kullanıcı isteği: "KKD ihlal tutanağı da word olsun, pdf kaldır" — PDF'teki
// aynı içerik, modules/kkd/cikti.js'teki Numune Formu Word üretimiyle aynı
// docx.js kalıbı (_kkdNumBaslik/_kkdNumHucre) kullanılarak üretilir.
function _kkdIhlalHucre(metin, baslikMi) {
  return new docx.TableCell({
    shading: baslikMi ? { fill: 'E5E7EB' } : undefined,
    width: baslikMi ? { size: 30, type: docx.WidthType.PERCENTAGE } : { size: 70, type: docx.WidthType.PERCENTAGE },
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new docx.Paragraph({ children: [new docx.TextRun({ text: String(metin ?? '') || '-', bold: !!baslikMi, size: 18 })] })]
  });
}

async function kkdIhlalTutanagiWordOlustur(ihlalId) {
  const k = ihlalIdIleGetirRepo(ihlalId);
  if (!k) return;

  const firma = aktifFirmaGetir();
  const firmaAdi = firma ? firma.ad.toLocaleUpperCase('tr-TR') : '';
  const tekrarMetni = k.tekrar === 'Evet' && k.sonIhlalTarihi
    ? `Çalışanın daha önce de işe ve bulunduğu lokasyona uygun KKD kullanmadığı tespit edilmiş olup son ihlal tarihi ${gunAyYil(k.sonIhlalTarihi)} olarak kayıt altındadır.`
    : 'Çalışanın bu kayıt kapsamında tekrar ihlal durumu bulunmamaktadır.';

  const fa = formAyarlariGetir('kkd');
  const dokumanSatiri = [
    fa.dokumanNo ? `Doküman No: ${fa.dokumanNo}` : '',
    fa.surumTarihi ? `Sürüm Tarihi: ${fa.surumTarihi}` : ''
  ].filter(Boolean).join('   |   ');

  const cocuklar = [
    new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { after: 40 }, children: [new docx.TextRun({ text: 'KKD İHLAL TUTANAĞI', bold: true, size: 30, color: '000000' })] }),
    new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { after: dokumanSatiri ? 60 : 200 }, children: [new docx.TextRun({ text: '6331 Sayılı İş Sağlığı ve Güvenliği Kanunu ve Kişisel Koruyucu Donanımların İşyerlerinde Kullanılması Hakkında Yönetmelik kapsamında düzenlenmiştir.', size: 16, color: '6B7280' })] })
  ];
  if (dokumanSatiri) {
    cocuklar.push(new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { after: 200 }, children: [new docx.TextRun({ text: dokumanSatiri, size: 16, color: '6B7280' })] }));
  }

  cocuklar.push(new docx.Paragraph({ alignment: docx.AlignmentType.RIGHT, spacing: { after: 100 }, children: [new docx.TextRun({ text: `Tarih: ${gunAyYil(k.tarih)}`, size: 18 })] }));
  cocuklar.push(new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { after: 20 }, children: [new docx.TextRun({ text: firmaAdi, bold: true, size: 22, color: '0B2C52' })] }));
  cocuklar.push(new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { after: 240 }, children: [new docx.TextRun({ text: 'İŞ SAĞLIĞI VE GÜVENLİĞİ BİRİMİ', size: 18, color: '374151' })] }));

  cocuklar.push(new docx.Paragraph({ spacing: { after: 160 }, children: [new docx.TextRun({ text: `${k.calismaBolumu} bölümünde çalışan, ${k.sicil} sicil numaralı ${k.adSoyad} adlı çalışanın, ${gunAyYil(k.tarih)} tarihinde saat ${k.saat} civarında ${k.bolum} lokasyonunda yapılan saha kontrolünde, kullanması gereken kişisel koruyucu donanımı uygun şekilde kullanmadığı tespit edilmiştir.`, size: 19 })] }));
  cocuklar.push(new docx.Paragraph({ spacing: { after: 160 }, children: [
    new docx.TextRun({ text: `Kullanmadığı / uygunsuz kullandığı KKD: ${k.kkd}`, size: 19 }), new docx.TextRun({ break: 1 }),
    new docx.TextRun({ text: `İhlal türü: ${k.ihlalTuru}`, size: 19 }), new docx.TextRun({ break: 1 }),
    new docx.TextRun({ text: `Uygulanan işlem: ${k.islem}`, size: 19 })
  ] }));
  cocuklar.push(new docx.Paragraph({ spacing: { after: 160 }, children: [new docx.TextRun({ text: tekrarMetni, size: 19 })] }));
  cocuklar.push(new docx.Paragraph({ spacing: { after: 260 }, children: [
    new docx.TextRun({ text: 'Açıklama:', bold: true, size: 19 }), new docx.TextRun({ break: 1 }),
    new docx.TextRun({ text: k.aciklama || '-', size: 19 })
  ] }));

  cocuklar.push(new docx.Paragraph({
    spacing: { after: 260 },
    border: { top: { style: docx.BorderStyle.SINGLE, size: 4, color: '9CA3AF' }, bottom: { style: docx.BorderStyle.SINGLE, size: 4, color: '9CA3AF' } },
    children: [new docx.TextRun({ text: "Bu durum; 6331 sayılı İş Sağlığı ve Güvenliği Kanunu'nun 19. maddesi ve Kişisel Koruyucu Donanımların İşyerlerinde Kullanılması Hakkında Yönetmelik hükümlerine aykırılık teşkil etmektedir.", size: 17, italics: true, color: '374151' })]
  }));

  cocuklar.push(_kkdNumBaslik('Bilgiler'));
  cocuklar.push(new docx.Table({
    width: { size: 100, type: docx.WidthType.PERCENTAGE },
    rows: [
      new docx.TableRow({ children: [_kkdIhlalHucre('Ad Soyad', true), _kkdIhlalHucre(k.adSoyad)] }),
      new docx.TableRow({ children: [_kkdIhlalHucre('Sicil No', true), _kkdIhlalHucre(k.sicil)] }),
      new docx.TableRow({ children: [_kkdIhlalHucre('Firma', true), _kkdIhlalHucre(k.firma)] }),
      new docx.TableRow({ children: [_kkdIhlalHucre('Çalıştığı Bölüm / Görev', true), _kkdIhlalHucre(k.calismaBolumu)] }),
      new docx.TableRow({ children: [_kkdIhlalHucre('Tespiti Yapan', true), _kkdIhlalHucre(k.tespitEden)] })
    ]
  }));

  cocuklar.push(new docx.Paragraph({ text: '', spacing: { after: 260 } }));
  const kenarlik = { style: docx.BorderStyle.SINGLE, size: 4, color: 'CBD5E1' };
  const imzaHucre = (baslik, ad, ekAlan) => new docx.TableCell({
    borders: { top: kenarlik, bottom: kenarlik, left: kenarlik, right: kenarlik },
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
    children: [
      new docx.Paragraph({ spacing: { after: 80 }, children: [new docx.TextRun({ text: baslik, bold: true, size: 18 })] }),
      new docx.Paragraph({ spacing: { after: 40 }, children: [new docx.TextRun({ text: `Ad Soyad: ${ad || '-'}`, size: 18 })] }),
      new docx.Paragraph({ spacing: { after: 220 }, children: [new docx.TextRun({ text: ekAlan, size: 18 })] }),
      new docx.Paragraph({ children: [new docx.TextRun({ text: 'İmza:', size: 18 })] })
    ]
  });
  cocuklar.push(new docx.Table({
    width: { size: 100, type: docx.WidthType.PERCENTAGE },
    rows: [new docx.TableRow({ children: [
      imzaHucre('Tespit Eden', k.tespitEden, 'Görev: İş Güvenliği Uzmanı'),
      imzaHucre('Çalışan', k.adSoyad, `Sicil No: ${k.sicil || '-'}`)
    ] })]
  }));

  const dokuman = new docx.Document({ sections: [{ properties: {}, children: cocuklar }] });
  const blob = await docx.Packer.toBlob(dokuman);
  saveAs(blob, `KKD_Tutanak_${(k.ihlalNo || ihlalId).replace(/[\\/]/g, '-')}.docx`);
}

// ==================== NUMUNE DEĞERLENDİRME FORMU (WORD) ====================
// Kullanıcı isteği: "kkd değerlendirme formu çok güzel ama word de ver,
// form no larını nereye gireceğim, başlığın altındaki açıklamaları kaldır"
// + "lacivert başlık arka planını kaldır daha sade form olsun, uygunsuzluk
// formu gibi mesela" — modules/acil-durum/kontrol-formu-cikti.js ile aynı
// docx.js kalıbı (imza görseli: _kfImzaGorseliVerisiGetir ile birebir aynı
// yöntem, bu modül diğerlerinin cikti.js'ini yüklemediğinden kendi
// önekiyle tekrarlanır); başlık lacivert dolgu YERİNE modules/uygunsuzluk
// çıktısındaki gibi sade, dolgusuz siyah/beyaz düzen kullanılır. Doküman
// No/Sürüm Tarihi/Sürüm No artık üst bilgide sade bir metin satırı olarak
// basılır (kullanıcının "numuneFormAyarlariBtn" ile girdiği değerler,
// bkz. ui.js _kkdNumuneBaslat).

function _kkdNumImzaGorseliVerisiGetir(dataUrl, maksGenislik) {
  if (!dataUrl) return Promise.resolve(null);
  return fetch(dataUrl)
    .then(yanit => yanit.blob())
    .then(blob => Promise.all([
      blob.arrayBuffer(),
      new Promise((coz, red) => {
        const img = new Image();
        img.onload = () => coz({ genislik: img.naturalWidth, yukseklik: img.naturalHeight });
        img.onerror = red;
        img.src = URL.createObjectURL(blob);
      })
    ]))
    .then(([arrayBuffer, olcu]) => {
      const MAKS_GENISLIK = maksGenislik || 220;
      const oran = olcu.genislik > MAKS_GENISLIK ? MAKS_GENISLIK / olcu.genislik : 1;
      return { veri: new Uint8Array(arrayBuffer), genislik: Math.round(olcu.genislik * oran), yukseklik: Math.round(olcu.yukseklik * oran) };
    })
    .catch(e => { console.error('Görsel Word belgesine eklenemedi:', e); return null; });
}

function _kkdNumBaslik(metin) {
  return new docx.Paragraph({ heading: docx.HeadingLevel.HEADING_2, spacing: { before: 260, after: 120 }, children: [new docx.TextRun({ text: metin, bold: true, color: '000000' })] });
}

function _kkdNumHucre(metin, baslikMi) {
  return new docx.TableCell({
    shading: baslikMi ? { fill: 'E5E7EB' } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new docx.Paragraph({ children: [new docx.TextRun({ text: String(metin ?? '') || '-', bold: !!baslikMi, size: 18 })] })]
  });
}

function _kkdNumBilgiTablosu(satirlar) {
  return new docx.Table({
    width: { size: 100, type: docx.WidthType.PERCENTAGE },
    rows: satirlar.map(s => new docx.TableRow({ children: [_kkdNumHucre(s[0], true), _kkdNumHucre(s[1]), _kkdNumHucre(s[2], true), _kkdNumHucre(s[3])] }))
  });
}

const _KKD_NUM_IMZA_KENARLIK = { style: docx.BorderStyle.SINGLE, size: 4, color: 'CBD5E1' };

async function _kkdNumImzaHucresi(baslik, imza, adFallback) {
  const gorsel = imza && imza.imzaUrl ? await _kkdNumImzaGorseliVerisiGetir(imza.imzaUrl) : null;
  const ad = (imza && imza.ad) || adFallback || '-';
  const tarih = imza && imza.tarih ? gunAyYil(imza.tarih.slice(0, 10)) : '';
  const govde = gorsel
    ? [
        new docx.Paragraph({ spacing: { after: 40 }, children: [new docx.TextRun({ text: `Ad Soyad: ${ad}`, size: 18 })] }),
        new docx.Paragraph({ spacing: { after: 100 }, children: [new docx.TextRun({ text: `Tarih: ${tarih || '-'}`, size: 18 })] }),
        new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.ImageRun({ data: gorsel.veri, transformation: { width: gorsel.genislik, height: gorsel.yukseklik } })] })
      ]
    : [
        new docx.Paragraph({ spacing: { after: 60 }, children: [new docx.TextRun({ text: `Ad Soyad: ${ad !== '-' ? ad : '________________________'}`, size: 18 })] }),
        new docx.Paragraph({ spacing: { after: 220 }, children: [new docx.TextRun({ text: 'Tarih: ________________', size: 18 })] }),
        new docx.Paragraph({ children: [new docx.TextRun({ text: 'İmza:', size: 18 })] })
      ];
  return new docx.TableCell({
    borders: { top: _KKD_NUM_IMZA_KENARLIK, bottom: _KKD_NUM_IMZA_KENARLIK, left: _KKD_NUM_IMZA_KENARLIK, right: _KKD_NUM_IMZA_KENARLIK },
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
    children: [
      new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { after: 80 }, children: [new docx.TextRun({ text: baslik.toLocaleUpperCase('tr'), bold: true, size: 18 })] }),
      ...govde
    ]
  });
}

// Kullanıcı isteği: "numune değerlendirme formlarına ikişer adet fotoğraf
// ta eklenebilsin" — foto1/foto2 alanları "fotoref:<id>" dolaylı referansı
// (bkz. model.js), önce fotoBuyukCoz ile gerçek data URL'e çözülür, sonra
// _kkdNumImzaGorseliVerisiGetir ile aynı yöntemle docx ImageRun'a çevrilir.
async function _kkdNumFotoVerisiGetir(referans) {
  if (!referans) return null;
  const url = await fotoBuyukCoz(referans);
  if (!url) return null;
  return _kkdNumImzaGorseliVerisiGetir(url, 260);
}

async function kkdNumuneFormuWordOlustur(numuneId) {
  const k = numuneIdIleGetir(numuneId);
  if (!k) return;

  const firma = aktifFirmaGetir();
  const fa = formAyarlariGetir('kkd');
  const bugun = gunAyYil(bugunIso());
  const dokumanSatiri = [
    fa.dokumanNo ? `Doküman No: ${fa.dokumanNo}` : '',
    fa.surumNo ? `Sürüm No: ${fa.surumNo}` : '',
    fa.surumTarihi ? `Sürüm Tarihi: ${fa.surumTarihi}` : ''
  ].filter(Boolean).join('   |   ');

  const cocuklar = [
    new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { after: 60 }, children: [new docx.TextRun({ text: 'KKD NUMUNE DEĞERLENDİRME FORMU', bold: true, size: 30, color: '000000' })] }),
    new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { after: dokumanSatiri ? 60 : 260 }, children: [new docx.TextRun({ text: `${firma ? firma.ad : ''}   |   Düzenleme Tarihi: ${bugun}`, size: 18, color: '374151' })] })
  ];
  if (dokumanSatiri) {
    cocuklar.push(new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { after: 260 }, children: [new docx.TextRun({ text: dokumanSatiri, size: 16, color: '6B7280' })] }));
  }

  cocuklar.push(_kkdNumBaslik('Numune Bilgileri'));
  cocuklar.push(_kkdNumBilgiTablosu([
    ['Numune No', k.numuneNo, 'KKD Türü', k.kkdTuru || '-'],
    ['KKD Adı', k.kkdAdi, 'Marka / Model', [k.marka, k.model].filter(Boolean).join(' / ') || '-'],
    ['Numuneyi Gönderen Firma', k.gonderenFirma || '-', 'İlgili Kişi', k.ilgiliKisi || '-'],
    ['İlgili Kişi Telefon', k.ilgiliKisiTel || '-', 'Deneyen Personel', k.personelAdSoyad || '-'],
    ['Bölüm', k.bolum || '-', 'Sonuç', k.sonuc || '-'],
    ['Deney Başlangıç', gunAyYil(k.deneyBaslangic) || '-', 'Deney Bitiş', gunAyYil(k.deneyBitis) || '-']
  ]));

  const [foto1, foto2] = await Promise.all([_kkdNumFotoVerisiGetir(k.foto1), _kkdNumFotoVerisiGetir(k.foto2)]);
  if (foto1 || foto2) {
    cocuklar.push(_kkdNumBaslik('Fotoğraflar'));
    cocuklar.push(new docx.Paragraph({
      spacing: { after: 200 },
      children: [foto1, foto2].filter(Boolean).flatMap((f, i) => [
        new docx.ImageRun({ data: f.veri, transformation: { width: f.genislik, height: f.yukseklik } }),
        ...(i === 0 && foto1 && foto2 ? [new docx.TextRun({ text: '   ' })] : [])
      ])
    }));
  }

  cocuklar.push(_kkdNumBaslik('Çalışan Görüşü'));
  cocuklar.push(new docx.Paragraph({ spacing: { after: 200 }, children: [new docx.TextRun({ text: k.calisanGorusu || '-' })] }));

  cocuklar.push(_kkdNumBaslik('İG Uzmanı Değerlendirmesi'));
  cocuklar.push(new docx.Paragraph({ spacing: { after: 240 }, children: [new docx.TextRun({ text: k.isgDegerlendirmesi || '-' })] }));

  cocuklar.push(_kkdNumBaslik('Onay'));
  cocuklar.push(new docx.Table({
    width: { size: 100, type: docx.WidthType.PERCENTAGE },
    rows: [new docx.TableRow({
      height: { value: 1360, rule: docx.HeightRule.ATLEAST },
      children: [
        await _kkdNumImzaHucresi('Deneyen Çalışan', k.imzalar && k.imzalar.calisan, k.personelAdSoyad),
        await _kkdNumImzaHucresi('İG Uzmanı', k.imzalar && k.imzalar.isgUzmani)
      ]
    })]
  }));

  const dokuman = new docx.Document({ sections: [{ properties: {}, children: cocuklar }] });
  const blob = await docx.Packer.toBlob(dokuman);
  saveAs(blob, `KKD_Numune_Degerlendirme_${(k.numuneNo || numuneId).replace(/[\\/]/g, '-')}.docx`);
}
