// İSG Kurulu çıktıları: Toplantı Daveti (Word), Kurul Raporu (Word/PDF),
// Konu Başlıkları (Word), PPTX. Eski üretim uygulamasındaki (isg-kurul-standalone-*.html)
// docx.js / pptxgenjs / html2pdf.js kütüphaneleriyle aynı çıktı türleri üretilir;
// içerik risk360'ın kendi (daha sade) toplantı/karar/olay/imza veri
// modeline uyarlanmıştır (BAĞFAŞ'a özel logo/marka içeriği taşınmadı — çok
// kiracılı yapı gereği, bkz. [[risk360-architecture]]).

function _ciktiKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function _ciktiDonemMetni(toplanti) {
  const kaynak = toplanti.donem ? toplanti.donem + '-01' : toplanti.tarih;
  if (!kaynak) return '—';
  const d = new Date(kaynak + 'T00:00:00');
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }).toUpperCase();
}

function _ciktiTarihSaat(toplanti) {
  if (!toplanti.tarih) return '—';
  const tarih = new Date(toplanti.tarih + 'T00:00:00').toLocaleDateString('tr-TR');
  return toplanti.saat ? `${tarih} ${toplanti.saat}` : tarih;
}

function _ciktiKararVerisi(toplantiId) {
  // Raporlar salt okunur olmalı: devredenTamamlandiGosterildi bayrağını
  // işaretlemeyen saf sürüm kullanılır (bkz. service.js).
  return toplantiKararGruplariniGetir(toplantiId);
}

// Boş bırakılmış rapor alanları için KURUL_RAPOR_VARSAYILANLARI'ndan hazır
// metin kullanır (bkz. model.js) — böylece hiçbir alan doldurulmasa bile
// rapor boş/amatör görünmez (eski üretim uygulamasındaki ISG_RAPOR_CONFIG
// davranışıyla aynı).
function _varsayilanliMetin(deger, anahtar) {
  const temiz = (deger || '').trim();
  return temiz || KURUL_RAPOR_VARSAYILANLARI[anahtar] || '';
}

// ==================== 1) TOPLANTI DAVETİ (WORD) ====================

async function toplantiDavetiWordOlustur() {
  const toplanti = toplantiIdIleGetirRepo(_toplantiId);
  if (!toplanti) return;

  const katilimcilar = toplantiImzalariniGetir(_toplantiId);
  const gundem = toplanti.gundem || [];

  const doc = new docx.Document({
    sections: [{
      // Kullanıcı isteği: davet tek sayfaya sığmalı (imza satırları
      // genişletildikçe taştı) — kenar boşlukları daraltıldı (0.5in) ve
      // boş paragraf ayraçları küçük "spacing.after" değerleriyle
      // değiştirildi ki yer kazanılsın, imza satırı yüksekliği yine de
      // genişletilmiş kalsın.
      properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
      children: [
        new docx.Paragraph({
          alignment: docx.AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new docx.TextRun({ text: 'TOPLANTI DAVETİ', bold: true, size: 32 })]
        }),
        new docx.Paragraph({
          spacing: { after: 200 },
          children: [new docx.TextRun({
            text: `İş Sağlığı ve Güvenliği Kurulumuzun ${_ciktiDonemMetni(toplanti)} toplantısı, ${_ciktiTarihSaat(toplanti)} tarihinde ${toplanti.yer || ''} yapılacaktır. Bilgilerinize sunar, toplantıya tüm kurul üyelerinin katılımını rica ederiz.`
          })]
        }),
        new docx.Paragraph({ spacing: { after: 100 }, children: [new docx.TextRun({ text: 'GÜNDEM', bold: true })] }),
        // Not (2026-08-04): burada eskiden 2 sabit (hardcoded) gündem maddesi
        // ("Bir önceki toplantıda alınan kararların gözden geçirilmesi" ve
        // "...ramak kala, iş kazalarının... görüşülmesi") toplantı.gundem'in
        // ÖNÜNE ekleniyordu — ama VARSAYILAN_GUNDEM_MADDELERI (bkz. ui.js)
        // zaten neredeyse birebir aynı iki maddeyle başlıyor, bu da davette
        // her zaman madde tekrarına yol açıyordu (kullanıcı tespiti). Artık
        // toplantının gerçek gündem listesi tek kaynak, 1'den başlar.
        // "Olaylar" maddesinin altına, toplantı tarihine kadar olan olayların
        // kısa dökümü eklenir (kullanıcı isteği: "toplantı tarihine kadar
        // olan olayları da gündeme ekleyelim") — bkz. service.js
        // toplantiOlaylarGundemMetni.
        ...gundem.flatMap((g, i) => {
          const satirlar = [new docx.Paragraph({ text: `${i + 1}) ${g.baslik}`, spacing: { after: 60 } })];
          if (/^olaylar/i.test(g.baslik.trim())) {
            const olaylarMetni = toplantiOlaylarGundemMetni(toplanti.id);
            if (olaylarMetni) {
              satirlar.push(new docx.Paragraph({
                indent: { left: 300 },
                spacing: { after: 60 },
                children: [new docx.TextRun({ text: olaylarMetni, italics: true, size: 18 })]
              }));
            }
          }
          return satirlar;
        }),
        new docx.Paragraph({ text: '', spacing: { after: 140 } }),
        new docx.Table({
          width: { size: 100, type: docx.WidthType.PERCENTAGE },
          rows: [
            // Kullanıcı isteği (3. düzeltme): GÖREVİ biraz genişletildi, İMZA
            // daraltıldı. 19 katılımcılık listede 600 twip taban satır
            // yüksekliği (önceki tur) sayfa sınırına tam denk gelip taşmaya
            // devam ediyordu — güvenli pay bırakmak için 400 twip'e indirildi
            // (yine de eski varsayılan 350'den biraz daha ferah, ve GÖREVİ
            // genişlediği için 2 satıra taşma da daha az olacak).
            new docx.TableRow({
              children: [
                ['ADI VE SOYADI', 30], ['GÖREVİ', 38], ['İMZA', 32]
              ].map(([baslik, genislik]) =>
                new docx.TableCell({ width: { size: genislik, type: docx.WidthType.PERCENTAGE }, children: [new docx.Paragraph({ text: baslik, spacing: { before: 120, after: 120 } })] })
              )
            }),
            ...katilimcilar.map((k, i) => new docx.TableRow({
              height: { value: 400, rule: docx.HeightRule.ATLEAST },
              children: [
                new docx.TableCell({ children: [new docx.Paragraph({ text: `${i + 1}) ${k.adSoyad}`, spacing: { before: 60, after: 60 } })] }),
                new docx.TableCell({ children: [new docx.Paragraph({ text: k.unvan || '', spacing: { before: 60, after: 60 } })] }),
                new docx.TableCell({ children: [new docx.Paragraph({ text: '', spacing: { before: 60, after: 60 } })] })
              ]
            }))
          ]
        })
      ]
    }]
  });

  const blob = await docx.Packer.toBlob(doc);
  saveAs(blob, `Toplanti_Daveti_${toplanti.toplantiNo}.docx`);
}

// Bu toplantının kararlarında VEYA devreden kararlarda oy dökümü (Kabul/Ret/
// Çekimser) boş olan varsa rapor oluşturmadan önce kullanıcıyı uyarır —
// kullanıcı isteği: "oy kısmı doldurulmadı ise rapor yazdırırken beni uyarsın".
// Onaylarsa true döner (rapor devam eder), iptal ederse false (çağıran fonksiyon
// hiçbir dosya üretmeden çıkar). Word/PDF/PPTX üçünde de ortak kullanılır.
function _oyEksikKontrolVeUyar(yeni, devreden) {
  const eksikYeni = yeni.filter(k => !kararOyDokumMetni(k));
  const eksikDevreden = devreden.filter(k => !kararOyDokumMetni(k));
  if (!eksikYeni.length && !eksikDevreden.length) return true;
  const satirlar = [];
  if (eksikYeni.length) satirlar.push(`Bu toplantının kararları: ${eksikYeni.map(k => k.kararNo).join(', ')}`);
  if (eksikDevreden.length) satirlar.push(`Devreden kararlar: ${eksikDevreden.map(k => k.kararNo).join(', ')}`);
  return confirm(`Aşağıdaki kararlarda oy dökümü (Kabul/Ret/Çekimser) girilmemiş:\n\n${satirlar.join('\n')}\n\nYine de rapor oluşturulsun mu?`);
}

// ==================== 2) KURUL RAPORU (WORD) ====================

// dataURL/uzak URL -> ImageRun'a verilebilecek ham bayt dizisi. file://
// altında fotoğraflar hep base64 data URL olarak geldiği için asıl yol odur
// (bkz. core/data.js fotoYukle IS_FILE_PROTOCOL); uzak Storage URL'i için
// fetch ile yedekleme eklendi ama CORS'a bağımlı, çalışmazsa foto sessizce atlanır.
async function _wordGorselBaytlari(url) {
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

// PDF çıktısındaki karar/uygunsuzluk fotoğraf listesini ({url, etiket}) ImageRun
// paragrafına çevirir — kart tablosunun ALTINA (içine değil) eklenir.
async function _wordFotoParagraflari(fotoListesi) {
  const baytli = await Promise.all(fotoListesi.map(async f => ({ etiket: f.etiket, bytes: await _wordGorselBaytlari(f.url) })));
  const gecerli = baytli.filter(f => f.bytes);
  if (!gecerli.length) return [];
  return [
    new docx.Paragraph({
      children: gecerli.map(f => new docx.ImageRun({ data: f.bytes, transformation: { width: 85, height: 85 } })),
      spacing: { before: 80, after: 20 }
    }),
    new docx.Paragraph({
      children: gecerli.map((f, i) => new docx.TextRun({ text: (i ? '   ' : '') + f.etiket, size: 16, italics: true, color: '64748B' })),
      spacing: { after: 160 }
    })
  ];
}

const _wordKenar = { style: docx.BorderStyle.SINGLE, size: 4, color: '94A3B8' };
const _wordKenarSet = { top: _wordKenar, bottom: _wordKenar, left: _wordKenar, right: _wordKenar };
const _wordGolge = { fill: 'E5E7EB', color: 'auto', type: docx.ShadingType.CLEAR };
const _wordHucre = (children, opts = {}) => new docx.TableCell({
  children: Array.isArray(children) ? children : [children],
  borders: _wordKenarSet,
  margins: { top: 60, bottom: 60, left: 100, right: 100 },
  ...opts
});
const _wordEtiketDeger = (etiket, deger) => [
  new docx.Paragraph({ children: [new docx.TextRun({ text: etiket, bold: true, size: 15, color: '111827' })] }),
  new docx.Paragraph({ children: [new docx.TextRun({ text: String(deger ?? '') || '-', size: 17 })] })
];

// Olayın Karar Metni/Sorumlu/Termin/Öncelik/Durum/Oy alanları (bkz. model.js
// kurulOlayiOlustur) doluysa, karar kartlarındaki notSatirlari ile aynı
// mantıkla ek satırlar üretir (2 sütunlu olay tablosuna uysun diye columnSpan:2).
function _wordOlayKararTakibiSatirlari(o) {
  const satirlar = [];
  if (!(o.kararMetni || o.sorumlu || o.termin)) return satirlar;
  if (o.kararMetni) satirlar.push(new docx.TableRow({ children: [_wordHucre(_wordEtiketDeger('Karar Metni', o.kararMetni), { columnSpan: 2 })] }));
  satirlar.push(new docx.TableRow({ children: [
    _wordHucre(_wordEtiketDeger('Sorumlu', o.sorumlu)),
    _wordHucre(_wordEtiketDeger('Termin', gunAyYil(o.termin)))
  ]}));
  satirlar.push(new docx.TableRow({ children: [
    _wordHucre(_wordEtiketDeger('Öncelik', o.oncelik)),
    _wordHucre(_wordEtiketDeger('Durum', o.durum))
  ]}));
  const oyDokumu = kararOyDokumMetni(o);
  if (o.oySonucu || oyDokumu) {
    satirlar.push(new docx.TableRow({ children: [_wordHucre(_wordEtiketDeger('Oy Sonucu', [[o.oy, o.oySonucu].filter(Boolean).join(' — '), oyDokumu && `(${oyDokumu})`].filter(Boolean).join('  ')), { columnSpan: 2 })] }));
  }
  return satirlar;
}

// Olaylar için PDF'teki "info-card" görünümünün Word karşılığı: başlık satırı
// (Tür | Tarih) + 2 sütunlu etiket/değer ızgarası (bkz. cikti.js _pdfInfoCardGrid).
// Olay/Kaza modülünden otomatik çekilen kayıtlarda varsa "Olay Yeri
// Fotoğrafları" tablonun altına eklenir (kararlar/uygunsuzluklarla aynı desen).
async function _wordOlayKarti(o) {
  const tablo = new docx.Table({
    width: { size: 100, type: docx.WidthType.PERCENTAGE },
    rows: [
      new docx.TableRow({ children: [
        _wordHucre(new docx.Paragraph({ children: [new docx.TextRun({ text: o.tur || '-', bold: true })] }), { width: { size: 50, type: docx.WidthType.PERCENTAGE }, shading: _wordGolge }),
        _wordHucre(new docx.Paragraph({ children: [new docx.TextRun({ text: gunAyYil(o.tarih) || '-', bold: true })] }), { width: { size: 50, type: docx.WidthType.PERCENTAGE }, shading: _wordGolge })
      ]}),
      new docx.TableRow({ children: [
        _wordHucre(_wordEtiketDeger('Yer', o.yer)),
        _wordHucre(_wordEtiketDeger('Birim', o.birim))
      ]}),
      new docx.TableRow({ children: [ _wordHucre(_wordEtiketDeger('Oluş Şekli', o.olusSekli), { columnSpan: 2 }) ] }),
      new docx.TableRow({ children: [
        _wordHucre(_wordEtiketDeger('Kök Neden', o.kokNeden)),
        _wordHucre(_wordEtiketDeger('İş Günü Kaybı', o.isGunuKaybi))
      ]}),
      ..._wordOlayKararTakibiSatirlari(o)
    ]
  });

  const fotoParagraflari = await _wordFotoParagraflari((o.fotograflar || []).map((f, i) => ({ url: f.url, etiket: 'Olay Yeri ' + (i + 1) })));
  return [tablo, ...fotoParagraflari, new docx.Paragraph({ text: '', spacing: { after: fotoParagraflari.length ? 0 : 200 } })];
}

// Kararlar için PDF'teki "decision-card" görünümünün Word karşılığı (bkz.
// cikti.js _pdfKararKarti) — başlık, karar metni, 4 sütunlu meta ızgarası,
// varsa aksiyon/oy/kapanış notları; fotoğraflar tablonun altına ayrı eklenir.
async function _wordKararKarti(k) {
  const notSatirlari = [];
  if (k.aksiyonNotu) notSatirlari.push(new docx.TableRow({ children: [_wordHucre(_wordEtiketDeger('Aksiyon', k.aksiyonNotu), { columnSpan: 4 })] }));
  const oyDokumu = kararOyDokumMetni(k);
  if (k.oySonucu || oyDokumu) notSatirlari.push(new docx.TableRow({ children: [_wordHucre(_wordEtiketDeger('Oy Sonucu', [[k.oy, k.oySonucu].filter(Boolean).join(' — '), oyDokumu && `(${oyDokumu})`].filter(Boolean).join('  ')), { columnSpan: 4 })] }));
  if (k.kanit || k.kapanisTarihi) notSatirlari.push(new docx.TableRow({ children: [_wordHucre(_wordEtiketDeger('Kapanış / Kanıt', [gunAyYil(k.kapanisTarihi), k.kanit].filter(Boolean).join(' / ')), { columnSpan: 4 })] }));

  const tablo = new docx.Table({
    width: { size: 100, type: docx.WidthType.PERCENTAGE },
    rows: [
      new docx.TableRow({ children: [
        _wordHucre(new docx.Paragraph({ children: [new docx.TextRun({ text: k.kararNo || '-', bold: true })] }), { width: { size: 25, type: docx.WidthType.PERCENTAGE }, shading: _wordGolge, columnSpan: 1 }),
        _wordHucre(new docx.Paragraph({ children: [new docx.TextRun({ text: k.kaynakGundem || '', bold: true })] }), { width: { size: 75, type: docx.WidthType.PERCENTAGE }, shading: _wordGolge, columnSpan: 3 })
      ]}),
      new docx.TableRow({ children: [ _wordHucre(new docx.Paragraph(k.kararMetni || ''), { columnSpan: 4 }) ] }),
      new docx.TableRow({ children: [
        _wordHucre(_wordEtiketDeger('Sorumlu', k.sorumlu)),
        _wordHucre(_wordEtiketDeger('Termin', gunAyYil(k.termin))),
        _wordHucre(_wordEtiketDeger('Öncelik', k.oncelik)),
        _wordHucre(_wordEtiketDeger('Durum', k.durumGoruntu || k.durum))
      ]}),
      ...notSatirlari
    ]
  });

  const fotoParagraflari = await _wordFotoParagraflari(_pdfKararFotograflari(k));
  return [tablo, ...fotoParagraflari, new docx.Paragraph({ text: '', spacing: { after: fotoParagraflari.length ? 0 : 200 } })];
}

// Uygunsuzluklar için PDF'teki "decision-card" görünümünün Word karşılığı
// (bkz. cikti.js _pdfUygunsuzlukKarti) — Kararlarla aynı kart mantığı, farklı alanlar.
async function _wordUygunsuzlukKarti(k) {
  const onlemSatiri = k.alinanOnlem ? [new docx.TableRow({ children: [_wordHucre(_wordEtiketDeger('Alınan Önlem', k.alinanOnlem), { columnSpan: 4 })] })] : [];

  const tablo = new docx.Table({
    width: { size: 100, type: docx.WidthType.PERCENTAGE },
    rows: [
      new docx.TableRow({ children: [
        _wordHucre(new docx.Paragraph({ children: [new docx.TextRun({ text: k.bolum || '-', bold: true })] }), { width: { size: 25, type: docx.WidthType.PERCENTAGE }, shading: _wordGolge, columnSpan: 1 }),
        _wordHucre(new docx.Paragraph({ children: [new docx.TextRun({ text: k.konuBasligi || '', bold: true })] }), { width: { size: 75, type: docx.WidthType.PERCENTAGE }, shading: _wordGolge, columnSpan: 3 })
      ]}),
      new docx.TableRow({ children: [ _wordHucre(new docx.Paragraph(k.uygunsuzluk || ''), { columnSpan: 4 }) ] }),
      new docx.TableRow({ children: [
        _wordHucre(_wordEtiketDeger('Tespit', gunAyYil(k.tespitTarihi))),
        _wordHucre(_wordEtiketDeger('Kapanış', gunAyYil(k.kapanisTarihi))),
        _wordHucre(_wordEtiketDeger('Sorumlu', k.sorumlu)),
        _wordHucre(_wordEtiketDeger('Durum', k.durum))
      ]}),
      ...onlemSatiri
    ]
  });

  const fotograflar = [];
  if (k.fotoOncesi) fotograflar.push({ url: k.fotoOncesi, etiket: 'Öncesi' });
  if (k.fotoSonrasi) fotograflar.push({ url: k.fotoSonrasi, etiket: 'Sonrası' });
  const fotoParagraflari = await _wordFotoParagraflari(fotograflar);
  return [tablo, ...fotoParagraflari, new docx.Paragraph({ text: '', spacing: { after: fotoParagraflari.length ? 0 : 200 } })];
}

async function kurulRaporuWordOlustur() {
  const toplanti = toplantiIdIleGetirRepo(_toplantiId);
  if (!toplanti) return;

  const gundem = toplanti.gundem || [];
  const olaylarHam = toplantiOlaylariniGetir(_toplantiId);
  const { devreden: devredenHam, yeni: yeniHam } = _ciktiKararVerisi(_toplantiId);
  if (!_oyEksikKontrolVeUyar(yeniHam, devredenHam)) return;
  const tespitEdilenUygunsuzluklarHam = toplantiTespitEdilenUygunsuzluklariGetir(toplanti);
  const kapananUygunsuzluklarHam = toplantiKapananUygunsuzluklariGetir(toplanti);
  const aylikEgitimler = toplantiAylikEgitimleriGetir(toplanti);
  const ayIciFaaliyetler = toplantiAyIciFaaliyetleriniGetir(_toplantiId);
  const imzalar = toplantiImzalariniGetir(_toplantiId);
  const katilanlar = imzalar.filter(i => i.katildiMi);
  const bsRapor = toplantiBaskanSekreterGetir(_toplantiId);
  const firma = aktifFirmaGetir();

  // PDF çıktısıyla aynı: kararlar/uygunsuzluklar/olaylar önce foto referansları
  // çözülür (bkz. kurulRaporuPdfOlustur), sonra kart tablolarına dönüştürülür.
  const logoUrl = firma ? await fotoBuyukCoz(firmaLogoGetir(firma.id)) : '';
  const [logoBytes, devreden, yeni, tespitEdilenUygunsuzluklar, kapananUygunsuzluklar, olaylar] = await Promise.all([
    _wordGorselBaytlari(logoUrl),
    _pdfKararlariFotoCoz(devredenHam),
    _pdfKararlariFotoCoz(yeniHam),
    _pdfUygunsuzluklariFotoCoz(tespitEdilenUygunsuzluklarHam),
    _pdfUygunsuzluklariFotoCoz(kapananUygunsuzluklarHam),
    _pdfOlaylarFotoCoz(olaylarHam)
  ]);

  const [yeniKartlari, devredenKartlari, tespitKartlari, kapananKartlari, olayKartlari] = await Promise.all([
    Promise.all(yeni.map(_wordKararKarti)),
    Promise.all(devreden.map(_wordKararKarti)),
    Promise.all(tespitEdilenUygunsuzluklar.map(_wordUygunsuzlukKarti)),
    Promise.all(kapananUygunsuzluklar.map(_wordUygunsuzlukKarti)),
    Promise.all(olaylar.map(_wordOlayKarti))
  ]);

  const P = (t, opts = {}) => new docx.Paragraph({ children: [new docx.TextRun({ text: String(t), ...opts })] });
  const H = (t) => new docx.Paragraph({ text: t, heading: docx.HeadingLevel.HEADING_2 });
  const BR = () => new docx.Paragraph({ children: [new docx.PageBreak()] });
  // Genel Değerlendirme'nin alt başlıkları için ("Etiket: değer", etiket kalın) —
  // kullanıcı isteği: "planlanan faaliyetlerin gerçekleşme durumları, tespit
  // edilen hususlar, çalışanların bildirimleri gibi şeyler ekleyelim".
  const PL = (etiket, deger) => new docx.Paragraph({
    children: [new docx.TextRun({ text: etiket + ': ', bold: true }), new docx.TextRun({ text: String(deger) })],
    spacing: { after: 120 }
  });
  // "İSG Kurulları İle İlgili Yasal Düzenleme" bölümü için (bkz. model.js
  // YONETMELIK_MADDELERI) — kullanıcı isteği: "yasal düzenleme referansı
  // raporlarda olmalı".
  const maddeParagraflari = (m) => [
    new docx.Paragraph({ children: [new docx.TextRun({ text: `${m.madde} – ${m.baslik}`, bold: true })], spacing: { before: 200, after: 80 } }),
    ...m.fikralar.flatMap(f => [
      P(f.giris, { spacing: { after: 60 } }),
      ...f.bentler.map(b => new docx.Paragraph({ text: b, indent: { left: 360 }, spacing: { after: 60 } }))
    ])
  ];

  const table = (headers, rows) => new docx.Table({
    width: { size: 100, type: docx.WidthType.PERCENTAGE },
    rows: [
      new docx.TableRow({
        tableHeader: true,
        children: headers.map(h => new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: h, bold: true, size: 20 })] })] }))
      }),
      ...rows.map(r => new docx.TableRow({
        children: r.map(c => new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: String(c ?? ''), size: 18 })] })] }))
      }))
    ]
  });

  // "Toplantı Bilgileri" PDF'te ayrı bir kutu (meeting-info) — Word'de aynı
  // 6 satırı bir tablo olarak kapak sonrası, "1) Genel Değerlendirme"'den önce basar.
  const bilgiTablosu = new docx.Table({
    width: { size: 100, type: docx.WidthType.PERCENTAGE },
    rows: [
      ['Toplantı No', toplanti.toplantiNo],
      ['Tarih / Saat', _ciktiTarihSaat(toplanti)],
      ['Yer', toplanti.yer || '-'],
      ['Kurul Başkanı', bsRapor.baskan || '-'],
      ['Kurul Sekreteri', bsRapor.yazman || '-'],
      ['Katılımcı Sayısı', katilanlar.length || '-']
    ].map(([etiket, deger]) => new docx.TableRow({ children: [
      _wordHucre(new docx.Paragraph({ children: [new docx.TextRun({ text: etiket, bold: true })] }), { width: { size: 30, type: docx.WidthType.PERCENTAGE }, shading: _wordGolge }),
      _wordHucre(new docx.Paragraph(String(deger)), { width: { size: 70, type: docx.WidthType.PERCENTAGE } })
    ]}))
  });

  // Kullanıcı isteği: kapak sayfasındaki logo/yazılar sayfaya düşeyde
  // ortalansın. docx.js'te paragraf listesi kendiliğinden dikeyde
  // ortalanmaz — tam sayfa yüksekliğinde, kenarlıksız TEK hücreli bir
  // tabloya sarılıp o hücrenin verticalAlign:CENTER özelliği kullanılır
  // (Word'de dikey ortalamanın standart yolu budur).
  const _kapakKenarYok = { style: docx.BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const kapakTablosu = new docx.Table({
    width: { size: 100, type: docx.WidthType.PERCENTAGE },
    borders: { top: _kapakKenarYok, bottom: _kapakKenarYok, left: _kapakKenarYok, right: _kapakKenarYok, insideHorizontal: _kapakKenarYok, insideVertical: _kapakKenarYok },
    rows: [
      new docx.TableRow({
        height: { value: 15200, rule: docx.HeightRule.EXACT },
        children: [
          new docx.TableCell({
            verticalAlign: docx.VerticalAlign.CENTER,
            borders: { top: _kapakKenarYok, bottom: _kapakKenarYok, left: _kapakKenarYok, right: _kapakKenarYok },
            children: [
              ...(logoBytes ? [new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.ImageRun({ data: logoBytes, transformation: { width: 110, height: 110 } })], spacing: { after: 200 } })] : []),
              new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: _denetimAktifFirmaAdi(), bold: true, size: 32 })], spacing: { after: 200 } }),
              new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: 'İŞ SAĞLIĞI VE GÜVENLİĞİ KURULU', bold: true })], spacing: { after: 800 } }),
              new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: 'İSG KURULU TOPLANTI RAPORU', bold: true, size: 30 })], spacing: { after: 400 } }),
              new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: _ciktiDonemMetni(toplanti), bold: true })], spacing: { after: 1200 } }),
              new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: '6331 Sayılı İş Sağlığı ve Güvenliği Kanunu', italics: true })] }),
              new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: 'MADDE 22 – Elli ve daha fazla çalışanın bulunduğu işyerlerinde işveren, iş sağlığı ve güvenliği kurulu oluşturur.', size: 18 })] }),
              new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: 'İSG Kurulları Hakkında Yönetmelik (Madde 4)', size: 18 })] })
            ]
          })
        ]
      })
    ]
  });

  const kapakCocuklari = [
    kapakTablosu,
    BR(),

    H('Toplantı Bilgileri'),
    bilgiTablosu,
    P(' ', { spacing: { after: 400 } }),

    H('1) Genel Değerlendirme'),
    P(_varsayilanliMetin(toplanti.genelDegerlendirme, 'genelDegerlendirme'), { spacing: { after: 160 } }),
    PL('İlgili Dönemde Planlanan Faaliyetlerin Gerçekleşme Durumu', _varsayilanliMetin(toplanti.planlananFaaliyetlerGerceklesme, 'planlananFaaliyetlerGerceklesme')),
    PL('Tespit Edilen Hususlar', _varsayilanliMetin(toplanti.tespitEdilenHususlar, 'tespitEdilenHususlar')),
    PL('Çalışanların Bildirimleri', _varsayilanliMetin(toplanti.calisanBildirimleri, 'calisanBildirimleri')),
    P(' ', { spacing: { after: 400 } }),

    H('2) Gündem'),
    ...(gundem.length ? gundem.flatMap((g, i) => {
      const satirlar = [P(`${i + 1}. ${g.baslik}${g.not ? ' — ' + g.not : ''}`)];
      if (/^olaylar/i.test(g.baslik.trim())) {
        const olaylarMetni = toplantiOlaylarGundemMetni(toplanti.id);
        if (olaylarMetni) satirlar.push(new docx.Paragraph({ indent: { left: 300 }, children: [new docx.TextRun({ text: olaylarMetni, italics: true, size: 18 })] }));
      }
      return satirlar;
    }) : [P('Gündem maddesi bulunmamaktadır.')]),
    P(' ', { spacing: { after: 600 } }),

    BR(),
    H('3) Olaylar'),
    ...(olayKartlari.length ? olayKartlari.flat() : [P(_varsayilanliMetin('', 'olaylar'))]),

    H('4) Bu Toplantıda Alınan Kararlar'),
    ...(yeniKartlari.length ? yeniKartlari.flat() : [P('Karar alınmamıştır.')]),
    ...(yeni.some(k => kararOyDokumMetni(k)) ? [P(KARAR_OY_DOKUM_DIPNOTU, { italics: true })] : []),

    H('5) Önceki Toplantılardan Devreden Kararlar'),
    ...(devredenKartlari.length ? devredenKartlari.flat() : [P(_varsayilanliMetin('', 'devredenKararlar'))]),
    ...(devreden.some(k => kararOyDokumMetni(k)) ? [P(KARAR_OY_DOKUM_DIPNOTU, { italics: true })] : []),
    BR(),

    H('6) Ay İçinde Yapılan Eğitimler'),
    aylikEgitimler.length ? table(['Eğitim Adı', 'Tarih', 'Katılımcı Sayısı', 'Birim'], aylikEgitimler.map(k => [k.egitimAdi, gunAyYil(k.egitimTarihi), k.katilimciSayisi, k.birim])) : P('Bu dönemde verilen eğitim bulunmamaktadır.'),
    P(' ', { spacing: { after: 400 } }),

    H('7) Ay İçi İSG Çalışmaları'),
    P(_varsayilanliMetin(toplanti.faaliyetMetni, 'ayIciCalismalar')),
    ayIciFaaliyetler.length ? table(['Faaliyet', 'Adet', 'Açıklama'], ayIciFaaliyetler.map(f => [f.faaliyet, f.adet, f.aciklama])) : P(' '),
    toplanti.metrikler ? P('Metrikler: ' + toplanti.metrikler) : P(' '),

    H('8) Çalışan Temsilcilerinin Görüş ve Önerileri'),
    P(_varsayilanliMetin(toplanti.calisanTemsilcisiGorusleri, 'gorusler')),
    P(' ', { spacing: { after: 400 } }),
    BR(),

    H('9) Ay İçinde Tespit Edilen Uygunsuzluklar'),
    ...(tespitKartlari.length ? tespitKartlari.flat() : [P('Bu dönemde tespit edilen uygunsuzluk bulunmamaktadır.')]),

    H('10) Ay İçinde Kapatılan Uygunsuzluklar'),
    ...(kapananKartlari.length ? kapananKartlari.flat() : [P('Bu dönemde kapatılan uygunsuzluk bulunmamaktadır.')]),
    BR(),

    H('11) İSG Kurulları İle İlgili Yasal Düzenleme'),
    ...YONETMELIK_MADDELERI.flatMap(maddeParagraflari),
    BR(),

    H('12) İmza Listesi'),
    katilanlar.length ? table(['Sıra', 'Ad Soyad', 'Ünvan', 'İmza'], katilanlar.map(k => [k.siraNo, k.adSoyad, k.unvan, ''])) : P('Toplantıya katılan bulunmamaktadır.')
  ];

  const doc = new docx.Document({
    sections: [{
      properties: { page: { size: { orientation: docx.PageOrientation.PORTRAIT }, margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
      // Kullanıcı isteği: her sayfa "Sayfa X / Y" olarak numaralandırılsın —
      // PDF çıktısında bu zaten jsPDF son-işleme döngüsüyle var (bkz.
      // kurulRaporuPdfOlustur), Word'de docx.PageNumber alanlarıyla eklendi;
      // Word içinde otomatik güncellenir (sabit metin değil, gerçek alan).
      footers: {
        default: new docx.Footer({
          children: [new docx.Paragraph({
            alignment: docx.AlignmentType.CENTER,
            children: [new docx.TextRun({ children: ['Sayfa ', docx.PageNumber.CURRENT, ' / ', docx.PageNumber.TOTAL_PAGES], size: 16, color: '64748B' })]
          })]
        })
      },
      children: kapakCocuklari
    }]
  });

  const blob = await docx.Packer.toBlob(doc);
  saveAs(blob, `Kurul_Raporu_${toplanti.toplantiNo}.docx`);
}

function _denetimAktifFirmaAdi() {
  const firma = aktifFirmaGetir();
  return firma ? firma.ad : '';
}

// ==================== 3) KONU BAŞLIKLARI (WORD) ====================

// kararMetni "{no}/{no} - {Kısa Başlık}: {Tam Metin}" biçimindeyse kısa başlığı
// ve gövdeyi ayırır (eski üretim uygulamasından taşınan kararlarda bu biçim
// kullanılır); biçime uymayan kararlarda tüm metin başlık olur.
function _kararBasligiVeMetni(kararMetni) {
  const metin = String(kararMetni || '');
  const ikiNoktaIndex = metin.indexOf(':');
  if (ikiNoktaIndex === -1) return { baslik: metin, govde: '' };
  let baslik = metin.slice(0, ikiNoktaIndex).trim();
  const govde = metin.slice(ikiNoktaIndex + 1).trim();
  const onekEslesme = baslik.match(/^[\d.]+\/?\d*\s*-\s*(.+)$/);
  if (onekEslesme) baslik = onekEslesme[1].trim();
  return { baslik: baslik || metin, govde };
}

async function konuBasliklariWordOlustur() {
  const toplanti = toplantiIdIleGetirRepo(_toplantiId);
  if (!toplanti) return;

  const gundem = toplanti.gundem || [];
  const olaylar = toplantiOlaylariniGetir(_toplantiId);
  const { devreden, yeni } = _ciktiKararVerisi(_toplantiId);

  const children = [
    new docx.Paragraph({
      alignment: docx.AlignmentType.CENTER,
      children: [new docx.TextRun({ text: `${_ciktiDonemMetni(toplanti)} İSG KURUL TOPLANTI KONU BAŞLIKLARI`, bold: true, size: 32 })],
      spacing: { after: 500 }
    })
  ];

  const bolumBasligi = (baslik) => children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: baslik, bold: true, size: 24 })], spacing: { before: 300, after: 200 } }));

  // A) Gündem — düz madde listesi.
  if (gundem.length) {
    bolumBasligi('A) GÜNDEM');
    gundem.forEach((g, i) => {
      children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: `${i + 1}. ${g.baslik}${g.not ? ' — ' + g.not : ''}`, size: 20 })] }));
    });
  }

  // B) Olaylar — her olay için başlık satırı + varsa "Kazalı: Ad Soyad | Tür | Açıklama".
  if (olaylar.length) {
    bolumBasligi('B) OLAYLAR');
    olaylar.forEach((o, i) => {
      children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: `${i + 1}. ${o.tarih || '—'} – ${o.yer || '—'}`, bold: true, size: 22 })] }));
      const detay = o.adSoyad
        ? `Kazalı: ${o.adSoyad} | ${o.tur || '-'} | ${o.olusSekli || '-'}`
        : (o.olusSekli || o.tur || '-');
      children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: detay, size: 20 })] }));
    });
  }

  // C/D) Kararlar — kısa başlık (bold) + tam metin + varsa Aksiyon + Sorumlu/Durum/Termin.
  const kararBolumuEkle = (baslik, kararlar) => {
    if (!kararlar.length) return;
    bolumBasligi(baslik);
    kararlar.forEach((k, i) => {
      const { baslik: kBaslik, govde } = _kararBasligiVeMetni(k.kararMetni);
      children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: `${i + 1}. ${kBaslik}`, bold: true, size: 22 })] }));
      if (govde) children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: govde, size: 20 })] }));
      if (k.aksiyonNotu) children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: `Aksiyon: ${k.aksiyonNotu}`, size: 20 })] }));
      children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: `Sorumlu: ${k.sorumlu || '-'}`, size: 20 })] }));
      children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: `Durum: ${k.durumGoruntu || k.durum || '-'}`, size: 20 })] }));
      children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: `Termin: ${gunAyYil(k.termin) || '-'}`, size: 20 })], spacing: { after: 150 } }));
    });
  };

  kararBolumuEkle('C) BU TOPLANTIDA GÖRÜŞÜLECEK KONULAR', yeni);
  kararBolumuEkle('D) ÖNCEKİ TOPLANTIDAN DEVREDEN KARARLAR', devreden);

  if ((toplanti.calisanTemsilcisiGorusleri || '').trim()) {
    bolumBasligi('E) ÇALIŞAN TEMSİLCİLERİNİN GÖRÜŞ VE ÖNERİLERİ');
    children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: toplanti.calisanTemsilcisiGorusleri.trim(), size: 20 })], spacing: { after: 150 } }));
  }

  const tespitEdilenUygunsuzluklar = toplantiTespitEdilenUygunsuzluklariGetir(toplanti);
  const kapananUygunsuzluklar = toplantiKapananUygunsuzluklariGetir(toplanti);
  if (tespitEdilenUygunsuzluklar.length || kapananUygunsuzluklar.length) {
    bolumBasligi('F) AY İÇİNDE TESPİT EDİLEN VE KAPATILAN UYGUNSUZLUKLAR');
    tespitEdilenUygunsuzluklar.forEach((k, i) => {
      children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: `${i + 1}. [Tespit ${gunAyYil(k.tespitTarihi) || '-'}] ${k.konuBasligi}`, bold: true, size: 22 })] }));
      children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: `${k.uygunsuzluk || '-'} | Bölüm: ${k.bolum || '-'} | Durum: ${k.durum || '-'}`, size: 20 })], spacing: { after: 100 } }));
    });
    kapananUygunsuzluklar.forEach((k, i) => {
      children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: `${i + 1}. [Kapanış ${gunAyYil(k.kapanisTarihi) || '-'}] ${k.konuBasligi}`, bold: true, size: 22 })] }));
      children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: `Alınan Önlem: ${k.alinanOnlem || '-'}`, size: 20 })], spacing: { after: 150 } }));
    });
  }

  const doc = new docx.Document({ sections: [{ children }] });
  const blob = await docx.Packer.toBlob(doc);
  saveAs(blob, `Konu_Basliklari_${toplanti.toplantiNo}.docx`);
}

// ==================== 4) KURUL RAPORU (PDF) ====================

// html2canvas tabanlı PDF üretimi bir tablonun <thead>'ini her sayfada
// otomatik tekrar edemez (bkz. uygunsuzluk/cikti.js'teki aynı gerekçe) — bu
// yüzden uzun tablolar (ör. imza listesi) sabit boyutlu gruplara bölünüp HER
// GRUP KENDİ <thead>'İYLE ayrı bir <table> olarak, aralarında zorla sayfa
// kırılımıyla basılır.
const PDF_TABLO_SAYFA_BASINA_SATIR = 20;

function _pdfTablo(basliklar, satirlar, ekSinif, genislikler) {
  if (!satirlar.length) return '<p class="empty">Kayıt bulunmamaktadır.</p>';
  const colgroup = genislikler ? `<colgroup>${genislikler.map(w => `<col style="width:${w}%">`).join('')}</colgroup>` : '';
  const thead = `<thead><tr>${basliklar.map(h => `<th>${_ciktiKacir(h)}</th>`).join('')}</tr></thead>`;

  const parcalar = [];
  for (let i = 0; i < satirlar.length; i += PDF_TABLO_SAYFA_BASINA_SATIR) parcalar.push(satirlar.slice(i, i + PDF_TABLO_SAYFA_BASINA_SATIR));

  return parcalar.map((parca, i) => `
    <table class="pdf-table${ekSinif ? ' ' + ekSinif : ''}" style="${i === parcalar.length - 1 ? '' : 'page-break-after:always;'}">
      ${colgroup}
      ${thead}
      <tbody>${parca.map(r => `<tr>${r.map(c => `<td>${_ciktiKacir(c ?? '-')}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>
  `).join('');
}

// Gündem/olay maddesi için "info-card": eski üretim uygulamasındaki başlıklı kutu görünümü.
function _pdfInfoCardTek(no, baslik, icerik) {
  return `
    <div class="info-card">
      <div class="info-head"><div>${_ciktiKacir(no)}</div><div>${_ciktiKacir(baslik)}</div></div>
      <div class="info-content">${_ciktiKacir(icerik || '-')}</div>
    </div>`;
}

function _pdfInfoCardGrid(no, baslik, alanlar) {
  return `
    <div class="info-card">
      <div class="info-head"><div>${_ciktiKacir(no)}</div><div>${_ciktiKacir(baslik)}</div></div>
      <div class="info-grid">${alanlar.map(([e, d]) => `<div><b>${_ciktiKacir(e)}</b><span>${_ciktiKacir(d || '-')}</span></div>`).join('')}</div>
    </div>`;
}

// Karar kartı: eski üretim uygulamasındaki "decision-card" görünümü; varsa
// kararın ilk fotoğrafı (öncesi/sonrası/ek sırasıyla) küçük resim olarak eklenir.
function _pdfKararFotograflari(k) {
  const parcalar = [];
  if (k.fotoOncesi) parcalar.push({ url: k.fotoOncesi, etiket: 'Öncesi' });
  if (k.fotoSonrasi) parcalar.push({ url: k.fotoSonrasi, etiket: 'Sonrası' });
  (k.fotografEk || []).forEach((f, i) => { if (f && f.url) parcalar.push({ url: f.url, etiket: 'Ek ' + (i + 1) }); });
  return parcalar;
}

async function _pdfKararlariFotoCoz(kararlar) {
  return Promise.all(kararlar.map(async k => {
    const [fotoOncesi, fotoSonrasi, fotografEk] = await Promise.all([
      fotoBuyukCoz(k.fotoOncesi),
      fotoBuyukCoz(k.fotoSonrasi),
      Promise.all((k.fotografEk || []).map(async f => Object.assign({}, f, { url: await fotoBuyukCoz(f.url) })))
    ]);
    return Object.assign({}, k, { fotoOncesi, fotoSonrasi, fotografEk });
  }));
}

// Uygunsuzluk kartı: eski üretim uygulamasındaki "nc-card"/"nc-photos"
// görünümü (satır ~5979) — konu/tarih/sorumlu bilgisi solda, öncesi/sonrası
// fotoğrafları sağda. Karar kartından farklı olarak öncelik/durum yerine
// tespit/kapanış tarihi ve alınan önlem gösterilir.
async function _pdfUygunsuzluklariFotoCoz(liste) {
  return Promise.all(liste.map(async k => Object.assign({}, k, {
    fotoOncesi: await fotoBuyukCoz(k.fotoOncesi),
    fotoSonrasi: await fotoBuyukCoz(k.fotoSonrasi)
  })));
}

// Olaylar bölümündeki "otomatik" (Olay/Kaza modülünden çekilen) satırların
// "Olay Yeri Fotoğrafları" alanını çözer — manuel eklenen kurul olayları bu
// alana hiç sahip olmadığından ([] gelir) etkilenmez.
async function _pdfOlaylarFotoCoz(olaylar) {
  return Promise.all(olaylar.map(async o => Object.assign({}, o, {
    fotograflar: await Promise.all((o.fotograflar || []).map(async f => Object.assign({}, f, { url: await fotoBuyukCoz(f.url) })))
  })));
}

// Olaylar kartına, varsa Olay/Kaza modülünden gelen fotoğrafları ekler (karar/
// uygunsuzluk kartlarındaki "decision-photo" ile aynı görünüm).
// Olayın Karar Metni/Sorumlu/Termin/Öncelik/Durum/Oy alanları doluysa, karar
// kartlarındaki "decision-action" satırlarıyla aynı görünümde eklenir (bkz.
// _wordOlayKararTakibiSatirlari — Word karşılığı).
function _pdfOlayKararTakibiBlogu(o) {
  if (!(o.kararMetni || o.sorumlu || o.termin)) return '';
  const parcalar = [];
  if (o.kararMetni) parcalar.push(`<div class="decision-text">${_ciktiKacir(o.kararMetni)}</div>`);
  parcalar.push(`
    <div class="decision-meta">
      <div><b>Sorumlu</b><span>${_ciktiKacir(o.sorumlu)}</span></div>
      <div><b>Termin</b><span>${_ciktiKacir(gunAyYil(o.termin))}</span></div>
      <div><b>Öncelik</b><span>${_ciktiKacir(o.oncelik)}</span></div>
      <div><b>Durum</b><span>${_ciktiKacir(o.durum)}</span></div>
    </div>`);
  const oyDokumu = kararOyDokumMetni(o);
  if (o.oySonucu || oyDokumu) {
    parcalar.push(`<div class="decision-action"><b>Oy Sonucu</b><span>${_ciktiKacir([[o.oy, o.oySonucu].filter(Boolean).join(' — '), oyDokumu && `(${oyDokumu})`].filter(Boolean).join('  '))}</span></div>`);
  }
  return parcalar.join('');
}

function _pdfOlayFotoBlogu(o) {
  const gecerli = (o.fotograflar || []).filter(f => f && f.url);
  if (!gecerli.length) return '';
  return `<div class="decision-photo">${gecerli.map((f, i) => `<span style="display:inline-block; margin:0 4mm 2mm 0; text-align:center;"><img src="${f.url}"><br><small>Olay Yeri ${i + 1}</small></span>`).join('')}</div>`;
}

function _pdfUygunsuzlukKarti(k) {
  const fotograflar = [];
  if (k.fotoOncesi) fotograflar.push({ url: k.fotoOncesi, etiket: 'Öncesi' });
  if (k.fotoSonrasi) fotograflar.push({ url: k.fotoSonrasi, etiket: 'Sonrası' });
  return `
    <div class="decision-card">
      <div class="decision-head"><div class="decision-no">${_ciktiKacir(k.bolum || '-')}</div><div class="decision-title">${_ciktiKacir(k.konuBasligi || '')}</div></div>
      <div class="decision-text">${_ciktiKacir(k.uygunsuzluk)}</div>
      <div class="decision-meta">
        <div><b>Tespit</b><span>${_ciktiKacir(gunAyYil(k.tespitTarihi))}</span></div>
        <div><b>Kapanış</b><span>${_ciktiKacir(gunAyYil(k.kapanisTarihi))}</span></div>
        <div><b>Sorumlu</b><span>${_ciktiKacir(k.sorumlu)}</span></div>
        <div><b>Durum</b><span>${_ciktiKacir(k.durum)}</span></div>
      </div>
      ${k.alinanOnlem ? `<div class="decision-action"><b>Alınan Önlem</b><span>${_ciktiKacir(k.alinanOnlem)}</span></div>` : ''}
      ${fotograflar.length ? `<div class="decision-photo">${fotograflar.map(f => `<span style="display:inline-block; margin:0 4mm 2mm 0; text-align:center;"><img src="${f.url}"><br><small>${_ciktiKacir(f.etiket)}</small></span>`).join('')}</div>` : ''}
    </div>`;
}

function _pdfKararKarti(k) {
  const fotograflar = _pdfKararFotograflari(k);
  return `
    <div class="decision-card">
      <div class="decision-head"><div class="decision-no">${_ciktiKacir(k.kararNo)}</div><div class="decision-title">${_ciktiKacir(k.kaynakGundem || '')}</div></div>
      <div class="decision-text">${_ciktiKacir(k.kararMetni)}</div>
      <div class="decision-meta">
        <div><b>Sorumlu</b><span>${_ciktiKacir(k.sorumlu)}</span></div>
        <div><b>Termin</b><span>${_ciktiKacir(gunAyYil(k.termin))}</span></div>
        <div><b>Öncelik</b><span>${_ciktiKacir(k.oncelik)}</span></div>
        <div><b>Durum</b><span>${_ciktiKacir(k.durumGoruntu || k.durum)}</span></div>
      </div>
      ${k.aksiyonNotu ? `<div class="decision-action"><b>Aksiyon</b><span>${_ciktiKacir(k.aksiyonNotu)}</span></div>` : ''}
      ${(k.oySonucu || kararOyDokumMetni(k)) ? `<div class="decision-action"><b>Oy Sonucu</b><span>${_ciktiKacir([[k.oy, k.oySonucu].filter(Boolean).join(' — '), kararOyDokumMetni(k) && `(${kararOyDokumMetni(k)})`].filter(Boolean).join('  '))}</span></div>` : ''}
      ${(k.kanit || k.kapanisTarihi) ? `<div class="decision-action"><b>Kapanış / Kanıt</b><span>${_ciktiKacir([gunAyYil(k.kapanisTarihi), k.kanit].filter(Boolean).join(' / '))}</span></div>` : ''}
      ${fotograflar.length ? `<div class="decision-photo">${fotograflar.map(f => `<span style="display:inline-block; margin:0 4mm 2mm 0; text-align:center;"><img src="${f.url}"><br><small>${_ciktiKacir(f.etiket)}</small></span>`).join('')}</div>` : ''}
    </div>`;
}

async function kurulRaporuPdfOlustur() {
  const toplanti = toplantiIdIleGetirRepo(_toplantiId);
  if (!toplanti) return;

  const gundem = toplanti.gundem || [];
  const olaylarHam = toplantiOlaylariniGetir(_toplantiId);
  const { devreden: devredenHam, yeni: yeniHam } = _ciktiKararVerisi(_toplantiId);
  if (!_oyEksikKontrolVeUyar(yeniHam, devredenHam)) return;
  const tespitEdilenUygunsuzluklarHam = toplantiTespitEdilenUygunsuzluklariGetir(toplanti);
  const kapananUygunsuzluklarHam = toplantiKapananUygunsuzluklariGetir(toplanti);
  const aylikEgitimler = toplantiAylikEgitimleriGetir(toplanti);
  const ayIciFaaliyetler = toplantiAyIciFaaliyetleriniGetir(_toplantiId);
  const imzalar = toplantiImzalariniGetir(_toplantiId);
  const katilanlar = imzalar.filter(i => i.katildiMi);
  const bsPdf = toplantiBaskanSekreterGetir(_toplantiId);
  const firma = aktifFirmaGetir();
  const [logoUrl, devreden, yeni, tespitEdilenUygunsuzluklar, kapananUygunsuzluklar, olaylar] = await Promise.all([
    fotoBuyukCoz(firma ? firmaLogoGetir(firma.id) : ''),
    _pdfKararlariFotoCoz(devredenHam),
    _pdfKararlariFotoCoz(yeniHam),
    _pdfUygunsuzluklariFotoCoz(tespitEdilenUygunsuzluklarHam),
    _pdfUygunsuzluklariFotoCoz(kapananUygunsuzluklarHam),
    _pdfOlaylarFotoCoz(olaylarHam)
  ]);

  const html = `
  <div id="kurulPdfReport">
    <style>
      #kurulPdfReport{ font-family: Arial, Helvetica, sans-serif; color:#111827; background:#fff; font-size:9.5pt; line-height:1.32; box-sizing:border-box; width:100%; max-width:194mm; overflow:hidden; }
      #kurulPdfReport *{ box-sizing:border-box; }

      #kurulPdfReport .cover{ min-height:250mm; position:relative; padding:28mm 22mm; text-align:center; page-break-after:always; background:#fff; overflow:hidden; }
      #kurulPdfReport .cover-logo{ display:block; margin:0 auto 8mm; max-width:34mm; max-height:34mm; object-fit:contain; }
      #kurulPdfReport .cover-brand{ text-align:center; }
      #kurulPdfReport .cover-brand .company{ font-size:18pt; font-weight:800; color:#111827; line-height:1.25; letter-spacing:.2px; }
      #kurulPdfReport .cover-brand .dept{ margin-top:3mm; font-size:11pt; color:#64748b; letter-spacing:.5px; text-transform:uppercase; }
      #kurulPdfReport .cover-main{ margin-top:42mm; }
      #kurulPdfReport .cover-main h1{ font-size:26pt; font-weight:800; color:#111827; line-height:1.25; margin:0; }
      #kurulPdfReport .period{ margin-top:14mm; font-size:15pt; font-weight:700; color:#111827; letter-spacing:.4px; }
      #kurulPdfReport .cover-law{ position:absolute; left:24mm; right:24mm; bottom:24mm; border-top:1px solid #d1d5db; padding-top:5mm; text-align:center; font-size:8.8pt; color:#4b5563; line-height:1.45; }
      #kurulPdfReport .cover-law div{ margin:1mm 0; }

      #kurulPdfReport .body{ width:100%; padding:9mm 7mm; overflow:hidden; }
      #kurulPdfReport .section{ margin:0 0 9mm; }
      #kurulPdfReport .section.keep{ page-break-inside:avoid; }
      #kurulPdfReport .page-break{ page-break-before:always; break-before:page; }
      #kurulPdfReport .signature-section{ page-break-before:always; break-before:page; }
      #kurulPdfReport h2{ font-size:14pt; color:#111827; border-bottom:2px solid #111827; padding-bottom:4px; margin:0 0 5mm; }
      #kurulPdfReport .gundem-satir{ margin:0 0 2mm; padding:0; font-size:9.5pt; color:#111827; line-height:1.4; }

      #kurulPdfReport table.pdf-table{ width:100%; max-width:100%; border-collapse:collapse; table-layout:fixed; margin-bottom:4mm; }
      #kurulPdfReport th{ background:#e5e7eb; color:#111827; font-weight:700; border:1px solid #94a3b8; padding:4px 5px; font-size:8.2pt; line-height:1.2; overflow-wrap:anywhere; white-space:normal; }
      #kurulPdfReport td{ border:1px solid #cbd5e1; padding:4px 5px; vertical-align:top; overflow-wrap:anywhere; white-space:normal; font-size:9pt; }
      #kurulPdfReport tr{ page-break-inside:avoid; }
      #kurulPdfReport thead{ display:table-header-group; }

      #kurulPdfReport .meeting-info{ width:100%; border:1px solid #dbe3ef; padding:6mm 7mm; margin-bottom:8mm; page-break-inside:avoid; }
      #kurulPdfReport .meeting-row{ display:flex; gap:6mm; padding:1.5mm 0; font-size:9.5pt; }
      #kurulPdfReport .meeting-row b{ width:38mm; flex:0 0 38mm; color:#111827; }

      #kurulPdfReport .note, #kurulPdfReport .empty{ color:#475569; font-style:italic; }
      #kurulPdfReport p{ page-break-inside:avoid; break-inside:avoid; orphans:3; widows:3; }
      #kurulPdfReport h2{ page-break-after:avoid; break-after:avoid; page-break-inside:avoid; break-inside:avoid; }
      #kurulPdfReport li{ page-break-inside:avoid; break-inside:avoid; }

      #kurulPdfReport .info-card{ page-break-inside:avoid; border:1px solid #cbd5e1; margin:0 0 3.5mm; width:100%; }
      #kurulPdfReport .info-head{ display:grid; grid-template-columns:20mm 1fr; background:#e5e7eb; color:#111827; font-weight:700; }
      #kurulPdfReport .info-head div{ padding:5px 6px; overflow-wrap:anywhere; }
      #kurulPdfReport .info-head div:first-child{ border-right:1px solid #94a3b8; }
      #kurulPdfReport .info-content{ padding:7px 8px; line-height:1.42; min-height:9mm; overflow-wrap:anywhere; white-space:normal; }
      #kurulPdfReport .info-grid{ display:grid; grid-template-columns:1fr 1fr; }
      #kurulPdfReport .info-grid div{ border-top:1px solid #cbd5e1; min-height:9mm; padding:5px 6px; overflow-wrap:anywhere; }
      #kurulPdfReport .info-grid div:nth-child(odd){ border-right:1px solid #cbd5e1; }
      #kurulPdfReport .info-card b{ display:block; font-size:8pt; margin-bottom:2px; }
      #kurulPdfReport .info-grid b{ color:#111827; }

      #kurulPdfReport .decision-card{ page-break-inside:avoid; border:1px solid #cbd5e1; margin:0 0 4mm; width:100%; }
      #kurulPdfReport .decision-head{ display:grid; grid-template-columns:24mm 1fr; background:#e5e7eb; color:#111827; font-weight:700; }
      #kurulPdfReport .decision-no, #kurulPdfReport .decision-title{ padding:5px 6px; overflow-wrap:anywhere; }
      #kurulPdfReport .decision-no{ border-right:1px solid #94a3b8; }
      #kurulPdfReport .decision-text{ padding:6px; border-bottom:1px solid #cbd5e1; min-height:10mm; overflow-wrap:anywhere; }
      #kurulPdfReport .decision-meta{ display:grid; grid-template-columns:25% 25% 25% 25%; }
      #kurulPdfReport .decision-meta div{ border-right:1px solid #cbd5e1; border-top:1px solid #cbd5e1; padding:5px 6px; min-height:10mm; overflow-wrap:anywhere; }
      #kurulPdfReport .decision-meta div:last-child{ border-right:0; }
      #kurulPdfReport .decision-meta b, #kurulPdfReport .decision-action b{ display:block; color:#111827; font-size:8pt; margin-bottom:2px; }
      #kurulPdfReport .decision-action{ border-top:1px solid #cbd5e1; padding:5px 6px; overflow-wrap:anywhere; }
      #kurulPdfReport .decision-photo{ border-top:1px solid #cbd5e1; padding:5px 6px; display:flex; flex-wrap:wrap; gap:3mm; }
      #kurulPdfReport .decision-photo img{ max-width:28mm; max-height:28mm; object-fit:cover; border:1px solid #cbd5e1; }
      #kurulPdfReport .decision-photo small{ font-size:7pt; color:#64748b; }

      #kurulPdfReport .sign-table td{ height:12mm; vertical-align:middle; font-size:8.3pt; }
      #kurulPdfReport .sign-table th{ vertical-align:middle; }
    </style>

    <div class="cover">
      <div class="cover-brand">
        ${logoUrl ? `<img class="cover-logo" src="${logoUrl}">` : ''}
        <div class="company">${_ciktiKacir(_denetimAktifFirmaAdi())}</div>
        <div class="dept">İş Sağlığı ve Güvenliği Kurulu</div>
      </div>
      <div class="cover-main">
        <h1>İSG KURULU<br>TOPLANTI RAPORU</h1>
        <div class="period">${_ciktiKacir(_ciktiDonemMetni(toplanti))}</div>
      </div>
      <div class="cover-law">
        <div><b>6331 Sayılı İş Sağlığı ve Güvenliği Kanunu</b></div>
        <div><b>İş Sağlığı ve Güvenliği Kurulu</b></div>
        <div><b>MADDE 22</b> – Elli ve daha fazla çalışanın bulunduğu işyerlerinde işveren, iş sağlığı ve güvenliği kurulu oluşturur.</div>
        <div><b>İSG Kurulları Hakkında Yönetmelik (Madde 4)</b></div>
      </div>
    </div>

    <div class="body">
      <div class="section keep">
        <h2>Toplantı Bilgileri</h2>
        <div class="meeting-info">
          <div class="meeting-row"><b>Toplantı No</b><span>${_ciktiKacir(toplanti.toplantiNo)}</span></div>
          <div class="meeting-row"><b>Tarih / Saat</b><span>${_ciktiKacir(_ciktiTarihSaat(toplanti))}</span></div>
          <div class="meeting-row"><b>Yer</b><span>${_ciktiKacir(toplanti.yer)}</span></div>
          <div class="meeting-row"><b>Kurul Başkanı</b><span>${_ciktiKacir(bsPdf.baskan)}</span></div>
          <div class="meeting-row"><b>Kurul Sekreteri</b><span>${_ciktiKacir(bsPdf.yazman)}</span></div>
          <div class="meeting-row"><b>Katılımcı Sayısı</b><span>${katilanlar.length || '-'}</span></div>
        </div>
      </div>

      <div class="section keep">
        <h2>1) Genel Değerlendirme</h2>
        <p>${_ciktiKacir(_varsayilanliMetin(toplanti.genelDegerlendirme, 'genelDegerlendirme'))}</p>
        <p><b>İlgili Dönemde Planlanan Faaliyetlerin Gerçekleşme Durumu:</b> ${_ciktiKacir(_varsayilanliMetin(toplanti.planlananFaaliyetlerGerceklesme, 'planlananFaaliyetlerGerceklesme'))}</p>
        <p><b>Tespit Edilen Hususlar:</b> ${_ciktiKacir(_varsayilanliMetin(toplanti.tespitEdilenHususlar, 'tespitEdilenHususlar'))}</p>
        <p><b>Çalışanların Bildirimleri:</b> ${_ciktiKacir(_varsayilanliMetin(toplanti.calisanBildirimleri, 'calisanBildirimleri'))}</p>
      </div>

      <div class="section">
        <h2>2) Gündem</h2>
        ${gundem.length ? gundem.map((g, i) => {
          const olaylarMetni = /^olaylar/i.test(g.baslik.trim()) ? toplantiOlaylarGundemMetni(toplanti.id) : '';
          return `<p class="gundem-satir">${i + 1}. ${_ciktiKacir(g.baslik)}${g.not ? ' — ' + _ciktiKacir(g.not) : ''}</p>` +
            (olaylarMetni ? `<p class="gundem-satir" style="margin-left:6mm; font-style:italic; color:#475569;">${_ciktiKacir(olaylarMetni)}</p>` : '');
        }).join('') : '<p class="empty">Gündem maddesi bulunmamaktadır.</p>'}
      </div>

      <div class="section">
        <div class="page-break"></div>
        <h2>3) Olaylar</h2>
        ${olaylar.length ? olaylar.map(o => _pdfInfoCardGrid(o.tur, gunAyYil(o.tarih), [['Yer', o.yer], ['Birim', o.birim], ['Oluş Şekli', o.olusSekli], ['Kök Neden', o.kokNeden], ['İş Günü Kaybı', o.isGunuKaybi]]) + _pdfOlayKararTakibiBlogu(o) + _pdfOlayFotoBlogu(o)).join('') : `<p class="empty">${_ciktiKacir(_varsayilanliMetin('', 'olaylar'))}</p>`}
      </div>

      <div class="section">
        <h2>4) Bu Toplantıda Alınan Kararlar</h2>
        ${yeni.length ? yeni.map(_pdfKararKarti).join('') : '<p class="empty">Karar bulunmamaktadır.</p>'}
        ${yeni.some(k => kararOyDokumMetni(k)) ? `<p class="note">${_ciktiKacir(KARAR_OY_DOKUM_DIPNOTU)}</p>` : ''}
      </div>

      <div class="section">
        <h2>5) Önceki Toplantılardan Devreden Kararlar</h2>
        ${devreden.length ? devreden.map(_pdfKararKarti).join('') : `<p class="empty">${_ciktiKacir(_varsayilanliMetin('', 'devredenKararlar'))}</p>`}
        ${devreden.some(k => kararOyDokumMetni(k)) ? `<p class="note">${_ciktiKacir(KARAR_OY_DOKUM_DIPNOTU)}</p>` : ''}
      </div>

      <div class="section">
        <h2>6) Ay İçinde Yapılan Eğitimler</h2>
        ${_pdfTablo(['Eğitim Adı', 'Tarih', 'Katılımcı Sayısı', 'Birim'], aylikEgitimler.map(k => [k.egitimAdi, gunAyYil(k.egitimTarihi), k.katilimciSayisi, k.birim]))}
      </div>

      <div class="section">
        <h2>7) Ay İçi İSG Çalışmaları</h2>
        <p>${_ciktiKacir(_varsayilanliMetin(toplanti.faaliyetMetni, 'ayIciCalismalar'))}</p>
        ${ayIciFaaliyetler.length ? _pdfTablo(['Faaliyet', 'Adet', 'Açıklama'], ayIciFaaliyetler.map(f => [f.faaliyet, f.adet, f.aciklama])) : ''}
        ${toplanti.metrikler ? `<p><b>Metrikler:</b> ${_ciktiKacir(toplanti.metrikler)}</p>` : ''}
      </div>

      <div class="section keep">
        <h2>8) Çalışan Temsilcilerinin Görüş ve Önerileri</h2>
        <p>${_ciktiKacir(_varsayilanliMetin(toplanti.calisanTemsilcisiGorusleri, 'gorusler'))}</p>
      </div>

      <div class="section">
        <h2>9) Ay İçinde Tespit Edilen Uygunsuzluklar</h2>
        ${tespitEdilenUygunsuzluklar.length ? tespitEdilenUygunsuzluklar.map(_pdfUygunsuzlukKarti).join('') : '<p class="empty">Bu dönemde tespit edilen uygunsuzluk bulunmamaktadır.</p>'}
      </div>

      <div class="section">
        <h2>10) Ay İçinde Kapatılan Uygunsuzluklar</h2>
        ${kapananUygunsuzluklar.length ? kapananUygunsuzluklar.map(_pdfUygunsuzlukKarti).join('') : '<p class="empty">Bu dönemde kapatılan uygunsuzluk bulunmamaktadır.</p>'}
      </div>

      <div class="section">
        <h2>11) İSG Kurulları İle İlgili Yasal Düzenleme</h2>
        ${_yonetmelikMaddeleriGoruntuUret()}
      </div>

      <div class="section signature-section">
        <h2>12) İmza Listesi</h2>
        ${_pdfTablo(['Sıra', 'Ad Soyad', 'Ünvan', 'İmza'], katilanlar.map(k => [k.siraNo, k.adSoyad, k.unvan, '']), 'sign-table', [6, 22, 47, 25])}
      </div>
    </div>
  </div>`;

  const mount = document.getElementById('yazdirmaAlani');
  mount.innerHTML = html;
  mount.style.display = 'block';

  const worker = html2pdf()
    .set({
      margin: [7, 7, 10, 7],
      filename: `Kurul_Raporu_${toplanti.toplantiNo}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollX: 0, scrollY: 0 },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4', compress: true },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.decision-card', '.info-card', '.meeting-info', 'p', 'h2', 'li'] }
    })
    .from(mount)
    .toPdf();

  const pdf = await worker.get('pdf');
  const totalPages = pdf.internal.getNumberOfPages();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(100);
    pdf.text(`Sayfa ${i} / ${totalPages}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
  }
  await worker.save();

  mount.innerHTML = '';
  mount.style.display = 'none';
}

// ==================== 5) PPTX OLUŞTUR ====================

async function pptxOlustur() {
  const toplanti = toplantiIdIleGetirRepo(_toplantiId);
  if (!toplanti) return;

  const gundem = toplanti.gundem || [];
  const olaylarHam = toplantiOlaylariniGetir(_toplantiId);
  const { devreden: devredenHam, yeni: yeniHam } = _ciktiKararVerisi(_toplantiId);
  if (!_oyEksikKontrolVeUyar(yeniHam, devredenHam)) return;
  const tespitEdilenUygunsuzluklarHam = toplantiTespitEdilenUygunsuzluklariGetir(toplanti);
  const kapananUygunsuzluklarHam = toplantiKapananUygunsuzluklariGetir(toplanti);
  const aylikEgitimler = toplantiAylikEgitimleriGetir(toplanti);
  const ayIciFaaliyetler = toplantiAyIciFaaliyetleriniGetir(_toplantiId);
  const firma = aktifFirmaGetir();
  // Kullanıcı isteği: "ay içinde tespit edilen uygunsuzluklar kapatılan
  // uygunsuzluklar pptx de fotoları da olsun" — PDF/Word'de zaten kullanılan
  // öncesi/sonrası foto çözücü (bkz. _pdfUygunsuzluklariFotoCoz) burada da
  // kullanılıp tam ekran foto slaytları eklenir.
  const [devreden, yeni, olaylar, tespitEdilenUygunsuzluklar, kapananUygunsuzluklar, logoUrl] = await Promise.all([
    _pdfKararlariFotoCoz(devredenHam),
    _pdfKararlariFotoCoz(yeniHam),
    _pdfOlaylarFotoCoz(olaylarHam),
    _pdfUygunsuzluklariFotoCoz(tespitEdilenUygunsuzluklarHam),
    _pdfUygunsuzluklariFotoCoz(kapananUygunsuzluklarHam),
    fotoBuyukCoz(firma ? firmaLogoGetir(firma.id) : '')
  ]);

  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';

  const BG = 'F8FAFC', TITLE = '0F172A', MUTED = '475569';
  const M = 0.8;

  let s = pptx.addSlide();
  s.background = { color: BG };
  if (logoUrl) {
    // LAYOUT_WIDE 13.33in genişlik — yatayda ortalanmış, başlığın (y:3.0)
    // üzerinde kalacak şekilde y:1.2'den başlıyor.
    const gorsel = { x: 5.87, y: 1.2, w: 1.6, h: 1.6, sizing: { type: 'contain', w: 1.6, h: 1.6 } };
    s.addImage(/^https?:\/\//i.test(logoUrl) ? Object.assign({ path: logoUrl }, gorsel) : Object.assign({ data: logoUrl }, gorsel));
  }
  s.addText('İŞ SAĞLIĞI VE GÜVENLİĞİ KURUL TOPLANTISI', { x: M, y: 3.0, w: 11, fontSize: 36, bold: true, color: TITLE, align: 'center' });
  s.addText(_denetimAktifFirmaAdi(), { x: M, y: 4.0, w: 11, fontSize: 20, color: MUTED, align: 'center' });
  s.addText(_ciktiDonemMetni(toplanti), { x: M, y: 4.7, w: 11, fontSize: 22, bold: true, color: TITLE, align: 'center' });

  const tabloSlaydi = (baslik, basliklar, satirlar, colW) => {
    const sl = pptx.addSlide();
    sl.background = { color: BG };
    sl.addText(baslik, { x: M, y: 0.5, w: 11, fontSize: 26, bold: true, color: TITLE });
    if (satirlar.length) {
      sl.addTable([
        basliklar.map(h => ({ text: h, options: { bold: true } })),
        ...satirlar
      ], { x: M, y: 1.3, w: 11.5, colW, fontSize: 11 });
    } else {
      sl.addText('Kayıt bulunmamaktadır.', { x: M, y: 1.6, fontSize: 16, color: MUTED });
    }
  };

  const metinSlaydi = (baslik, metin) => {
    const sl = pptx.addSlide();
    sl.background = { color: BG };
    sl.addText(baslik, { x: M, y: 0.5, w: 11, fontSize: 26, bold: true, color: TITLE });
    sl.addText(metin || 'Kayıt bulunmamaktadır.', { x: M, y: 1.5, w: 11.5, h: 4, fontSize: 15, color: TITLE, valign: 'top' });
  };

  // Kullanıcı isteği: "ilgili dönemde planlanan faaliyetlerin gerçekleşme
  // durumları, tespit edilen hususlar, çalışanların bildirimleri gibi şeyler
  // ekleyelim" — Word/PDF'deki "1) Genel Değerlendirme" bölümüyle aynı 4
  // parça, PPTX'te de tek bir metin slaydında.
  metinSlaydi('GENEL DEĞERLENDİRME', [
    _varsayilanliMetin(toplanti.genelDegerlendirme, 'genelDegerlendirme'),
    'İlgili Dönemde Planlanan Faaliyetlerin Gerçekleşme Durumu: ' + _varsayilanliMetin(toplanti.planlananFaaliyetlerGerceklesme, 'planlananFaaliyetlerGerceklesme'),
    'Tespit Edilen Hususlar: ' + _varsayilanliMetin(toplanti.tespitEdilenHususlar, 'tespitEdilenHususlar'),
    'Çalışanların Bildirimleri: ' + _varsayilanliMetin(toplanti.calisanBildirimleri, 'calisanBildirimleri')
  ].join('\n\n'));

  tabloSlaydi('GÜNDEM', ['No', 'Konu', 'Not'], gundem.map((g, i) => {
    const olaylarMetni = /^olaylar/i.test(g.baslik.trim()) ? toplantiOlaylarGundemMetni(toplanti.id) : '';
    return [String(i + 1), g.baslik, [g.not, olaylarMetni].filter(Boolean).join(' — ')];
  }), [1, 5, 5.5]);

  // Tam ekran fotoğraf slaydı — hem kararlar hem olaylar için ortak (kullanıcı
  // isteği: "fotoğraflar slaytta olsun sonraki slaytta büyük tam ekran olsun").
  const fotoTamEkranSlaydiEkle = (baslik, url) => {
    if (!url) return;
    const sl = pptx.addSlide();
    sl.background = { color: '000000' };
    sl.addText(baslik, { x: 0.4, y: 0.2, w: 12.5, fontSize: 16, bold: true, color: 'FFFFFF' });
    const gorsel = { x: 1.0, y: 0.9, w: 11.33, h: 6.3, sizing: { type: 'contain', w: 11.33, h: 6.3 } };
    sl.addImage(/^https?:\/\//i.test(url) ? Object.assign({ path: url }, gorsel) : Object.assign({ data: url }, gorsel));
  };

  // Her olay kendi slaydında (karar deseniyle aynı) — varsa ilk fotoğrafı
  // sağda küçük, tüm fotoğrafları da hemen ardından birer tam ekran slaytta.
  const olaySlaydi = (o, sira, toplam) => {
    const sl = pptx.addSlide();
    sl.background = { color: BG };
    const foto = o.fotograflar && o.fotograflar[0] && o.fotograflar[0].url;
    const metinGenislik = foto ? 7.2 : 11.5;
    sl.addText(`OLAY (${sira}/${toplam}) — ${o.tur || '-'}${o.otomatik ? ' (Olay/Kaza modülünden)' : ''}`, { x: M, y: 0.4, w: 11, fontSize: 22, bold: true, color: TITLE });
    sl.addText(o.olusSekli || '-', { x: M, y: 1.2, w: metinGenislik, h: 2.6, fontSize: 15, color: TITLE, valign: 'top' });
    const metaSatirlari = [
      ['Tarih', gunAyYil(o.tarih) || '-'],
      ['Yer', o.yer || '-'],
      ['Birim', o.birim || '-'],
      ['Kök Neden', o.kokNeden || '-'],
      ['İş Günü Kaybı', o.isGunuKaybi || '-']
    ];
    if (o.kararMetni || o.sorumlu || o.termin) {
      metaSatirlari.push(
        ['Karar Metni', o.kararMetni || '-'],
        ['Sorumlu', o.sorumlu || '-'],
        ['Termin', gunAyYil(o.termin) || '-'],
        ['Öncelik', o.oncelik || '-'],
        ['Durum', o.durum || '-'],
        ['Oy Sonucu', [o.oySonucu, kararOyDokumMetni(o) && `(${kararOyDokumMetni(o)})`].filter(Boolean).join('  ') || '-']
      );
    }
    sl.addTable(metaSatirlari.map(([e, d]) => [{ text: e, options: { bold: true, color: MUTED } }, { text: d }]), { x: M, y: 4.0, w: metinGenislik, colW: [2.5, metinGenislik - 2.5], fontSize: 12 });
    if (foto) {
      sl.addImage(/^https?:\/\//i.test(foto) ? { path: foto, x: 8.4, y: 1.2, w: 3.4, h: 3.4 } : { data: foto, x: 8.4, y: 1.2, w: 3.4, h: 3.4 });
    }
  };

  if (olaylar.length) {
    olaylar.forEach((o, i) => {
      olaySlaydi(o, i + 1, olaylar.length);
      (o.fotograflar || []).forEach((f, fi) => fotoTamEkranSlaydiEkle(`${o.tur || 'Olay'} — Olay Yeri ${fi + 1}`, f.url));
    });
  } else {
    tabloSlaydi('OLAYLAR', ['Bilgi'], [], []);
  }

  // Her karar kendi slaydında: metin + meta bilgiler sol tarafta, varsa ilk
  // fotoğraf (öncesi/sonrası/ek sırasıyla) sağ tarafta küçük resim olarak
  // (eski üretim uygulamasındaki "karar başına ayrı slayt" kuralıyla aynı).
  const kararIlkFotografi = (k) => k.fotoOncesi || k.fotoSonrasi || (k.fotografEk && k.fotografEk[0] && k.fotografEk[0].url) || '';

  // pptxgenjs metni otomatik sayfalamaz/küçültmez — karar metni ayrılan kutuya
  // (genişlik x 2.6in, fontSize 15) sığmazsa Sorumlu/Termin/vb. meta
  // tablosunun üzerine biner. Bu yüzden kabaca satır sayısı tahmin edilir;
  // sığmıyorsa (kullanıcı isteği) karar metni kendi slaydına, meta bilgiler
  // ayrı bir "(devam)" slaydına taşınır.
  const _kararMetniTasarMi = (metin, genislikInc) => {
    const text = String(metin || '');
    if (!text) return false;
    const karakterGenisligi = 0.115; // fontSize 15 için yaklaşık inç/karakter
    const satirYuksekligi = 0.26; // yaklaşık inç
    const satirBasinaKarakter = Math.max(15, Math.floor(genislikInc / karakterGenisligi));
    const sigacakSatir = Math.floor(2.6 / satirYuksekligi);
    const satirSayisi = text.split('\n').reduce((toplam, satir) => toplam + Math.max(1, Math.ceil(satir.length / satirBasinaKarakter)), 0);
    return satirSayisi > sigacakSatir;
  };

  const kararSlaydi = (baslikOnEki, k, sira, toplam) => {
    const foto = kararIlkFotografi(k);
    const metinGenislik = foto ? 7.2 : 11.5;
    const tasarMi = _kararMetniTasarMi(k.kararMetni, metinGenislik);

    const sl = pptx.addSlide();
    sl.background = { color: BG };
    sl.addText(`${baslikOnEki} (${sira}/${toplam}) — ${k.kararNo}`, { x: M, y: 0.4, w: 11, fontSize: 22, bold: true, color: TITLE });

    const metaSatirlari = [
      ['Sorumlu', k.sorumlu || '-'],
      ['Termin', gunAyYil(k.termin) || '-'],
      ['Öncelik', k.oncelik || '-'],
      ['Durum', k.durumGoruntu || k.durum || '-'],
      ['Kaynak Gündem', k.kaynakGundem || '-'],
      ['Aksiyon', k.aksiyonNotu || '-'],
      ['Oy Sonucu', [k.oySonucu, kararOyDokumMetni(k) && `(${kararOyDokumMetni(k)})`].filter(Boolean).join('  ') || '-'],
      ['Kapanış / Kanıt', [k.kapanisTarihi, k.kanit].filter(Boolean).join(' / ') || '-']
    ];

    if (tasarMi) {
      sl.addText(k.kararMetni || '-', { x: M, y: 1.2, w: 11.5, h: 5.6, fontSize: 15, color: TITLE, valign: 'top' });

      const sl2 = pptx.addSlide();
      sl2.background = { color: BG };
      sl2.addText(`${baslikOnEki} (${sira}/${toplam}) — ${k.kararNo} (devam)`, { x: M, y: 0.4, w: 11, fontSize: 22, bold: true, color: TITLE });
      sl2.addTable(metaSatirlari.map(([e, d]) => [{ text: e, options: { bold: true, color: MUTED } }, { text: d }]), { x: M, y: 1.3, w: metinGenislik, colW: [2.5, metinGenislik - 2.5], fontSize: 13 });
      if (foto) {
        sl2.addImage(/^https?:\/\//i.test(foto) ? { path: foto, x: 8.4, y: 1.3, w: 3.4, h: 3.4 } : { data: foto, x: 8.4, y: 1.3, w: 3.4, h: 3.4 });
      }
    } else {
      sl.addText(k.kararMetni || '-', { x: M, y: 1.2, w: metinGenislik, h: 2.6, fontSize: 15, color: TITLE, valign: 'top' });
      sl.addTable(metaSatirlari.map(([e, d]) => [{ text: e, options: { bold: true, color: MUTED } }, { text: d }]), { x: M, y: 4.0, w: metinGenislik, colW: [2.5, metinGenislik - 2.5], fontSize: 12 });
      if (foto) {
        sl.addImage(/^https?:\/\//i.test(foto) ? { path: foto, x: 8.4, y: 1.2, w: 3.4, h: 3.4 } : { data: foto, x: 8.4, y: 1.2, w: 3.4, h: 3.4 });
      }
    }
  };

  // Kararın TÜM fotoğrafları (öncesi/sonrası/en fazla 3 ek — bkz.
  // _pdfKararFotograflari) için, karar slaydından hemen sonra birer tam ekran
  // slayt eklenir — kullanıcı isteği: "fotoğraflar slaytta olsun sonraki
  // slaytta büyük tam ekran olsun".
  const kararFotoTamEkranSlaytlariniEkle = (k) => {
    _pdfKararFotograflari(k).forEach(f => fotoTamEkranSlaydiEkle(`${k.kararNo} — ${f.etiket}`, f.url));
  };

  const kararSlaytlariniEkle = (baslikOnEki, liste) => {
    if (!liste.length) {
      tabloSlaydi(baslikOnEki, ['Bilgi'], [], []);
      return;
    }
    liste.forEach((k, i) => {
      kararSlaydi(baslikOnEki, k, i + 1, liste.length);
      kararFotoTamEkranSlaytlariniEkle(k);
    });
  };

  kararSlaytlariniEkle('YENİ KARAR', yeni);
  kararSlaytlariniEkle('DEVREDEN KARAR', devreden);
  tabloSlaydi('AY İÇİNDE YAPILAN EĞİTİMLER', ['Eğitim Adı', 'Tarih', 'Katılımcı', 'Birim'], aylikEgitimler.map(k => [k.egitimAdi, gunAyYil(k.egitimTarihi), String(k.katilimciSayisi), k.birim]), [4, 2.5, 2, 3]);
  tabloSlaydi('AY İÇİ İSG ÇALIŞMALARI', ['Faaliyet', 'Adet', 'Açıklama'], ayIciFaaliyetler.map(f => [f.faaliyet, f.adet || '', f.aciklama || '']), [3, 1.5, 7]);
  metinSlaydi('ÇALIŞAN TEMSİLCİLERİNİN GÖRÜŞ VE ÖNERİLERİ', toplanti.calisanTemsilcisiGorusleri || KURUL_RAPOR_VARSAYILANLARI.gorusler);
  // Öncesi/sonrası fotoğrafı olan her uygunsuzluk için, tablo slaydından
  // hemen sonra birer tam ekran foto slaydı eklenir (kararlar/olaylardaki
  // aynı desen — bkz. fotoTamEkranSlaydiEkle).
  const uygunsuzlukFotoSlaytlariniEkle = (liste) => {
    liste.forEach(k => {
      if (k.fotoOncesi) fotoTamEkranSlaydiEkle(`${k.konuBasligi} — Öncesi`, k.fotoOncesi);
      if (k.fotoSonrasi) fotoTamEkranSlaydiEkle(`${k.konuBasligi} — Sonrası`, k.fotoSonrasi);
    });
  };

  tabloSlaydi('AY İÇİNDE TESPİT EDİLEN UYGUNSUZLUKLAR', ['Konu', 'Bölüm', 'Tespit', 'Durum'], tespitEdilenUygunsuzluklar.map(k => [k.konuBasligi, k.bolum, gunAyYil(k.tespitTarihi), k.durum]), [2.5, 2, 2, 5]);
  uygunsuzlukFotoSlaytlariniEkle(tespitEdilenUygunsuzluklar);
  tabloSlaydi('AY İÇİNDE KAPATILAN UYGUNSUZLUKLAR', ['Konu', 'Bölüm', 'Kapanış', 'Alınan Önlem'], kapananUygunsuzluklar.map(k => [k.konuBasligi, k.bolum, gunAyYil(k.kapanisTarihi), k.alinanOnlem]), [2.5, 2, 2, 5]);
  uygunsuzlukFotoSlaytlariniEkle(kapananUygunsuzluklar);

  // "İSG Kurulları İle İlgili Yasal Düzenleme" — kullanıcı isteği: "yasal
  // düzenleme referansı raporlarda olmalı"; her madde (bkz. model.js
  // YONETMELIK_MADDELERI) kendi slaydında, küçük yazı tipiyle tam metin.
  YONETMELIK_MADDELERI.forEach(m => {
    const sl = pptx.addSlide();
    sl.background = { color: BG };
    sl.addText(`${m.madde} – ${m.baslik}`, { x: M, y: 0.4, w: 11.7, fontSize: 20, bold: true, color: TITLE });
    const metin = m.fikralar.map(f => [f.giris, ...f.bentler].join('\n')).join('\n\n');
    sl.addText(metin, { x: M, y: 1.2, w: 11.7, h: 5.9, fontSize: 10.5, color: TITLE, valign: 'top' });
  });

  await pptx.writeFile({ fileName: `Kurul_Toplantisi_${toplanti.toplantiNo}.pptx` });
}

// ==================== ATAMA YAZISI (WORD) ====================
// İmza Listesi'ndeki bir kişi için tek sayfalık görevlendirme yazısı —
// kullanıcı isteği: "isimlerin yanlarında buton olsun tıkladığımda atama
// yazısı çıkarsın, o kişi için atayan da kurul başkanı olsun". Atayan, aynı
// toplantının İmza Listesi'nde "Kurul Başkanı" olarak işaretli kişiden
// otomatik gelir (bkz. service.js toplantiBaskanSekreterGetir).
async function atamaYazisiWordOlustur(imzaId) {
  const imza = toplantiImzalariniGetir(_toplantiId).find(i => i.id === imzaId);
  if (!imza) return;

  const bsAtama = toplantiBaskanSekreterGetir(_toplantiId);
  const bugunAtama = gunAyYil(_bugun());

  const doc = new docx.Document({
    sections: [{
      properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      children: [
        new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: _denetimAktifFirmaAdi(), bold: true, size: 26 })], spacing: { after: 200 } }),
        new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: 'İŞ SAĞLIĞI VE GÜVENLİĞİ KURULU GÖREVLENDİRME YAZISI', bold: true, size: 24 })], spacing: { after: 600 } }),
        new docx.Paragraph({ alignment: docx.AlignmentType.RIGHT, children: [new docx.TextRun({ text: bugunAtama })], spacing: { after: 400 } }),
        new docx.Paragraph({
          spacing: { after: 400, line: 360 },
          children: [new docx.TextRun({
            text: `İşyerimiz İş Sağlığı ve Güvenliği Kurulu bünyesinde, ${imza.adSoyad} (${imza.unvan || imza.birim || '-'})'nin ` +
              `"${imza.kuruldakiGorev || 'Kurul Üyesi'}" görevini yürütmek üzere ${bugunAtama} tarihi itibarıyla görevlendirilmesi uygun görülmüştür.`
          })]
        }),
        new docx.Paragraph({
          spacing: { after: 800, line: 360 },
          children: [new docx.TextRun({
            text: '6331 sayılı İş Sağlığı ve Güvenliği Kanunu ve İş Sağlığı ve Güvenliği Kurulları Hakkında Yönetmelik hükümleri gereğince bilgilerinize ve gereğini arz/rica ederiz.'
          })]
        }),
        new docx.Table({
          width: { size: 100, type: docx.WidthType.PERCENTAGE },
          borders: { top: { style: docx.BorderStyle.NONE, size: 0, color: 'FFFFFF' }, bottom: { style: docx.BorderStyle.NONE, size: 0, color: 'FFFFFF' }, left: { style: docx.BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: docx.BorderStyle.NONE, size: 0, color: 'FFFFFF' }, insideHorizontal: { style: docx.BorderStyle.NONE, size: 0, color: 'FFFFFF' }, insideVertical: { style: docx.BorderStyle.NONE, size: 0, color: 'FFFFFF' } },
          rows: [new docx.TableRow({ children: [
            new docx.TableCell({ borders: { top: { style: docx.BorderStyle.SINGLE, size: 4, color: '111827' } }, margins: { top: 100 }, children: [
              new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: 'Tebliğ Eden', size: 18, color: '64748B' })] }),
              new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { before: 100 }, children: [new docx.TextRun({ text: bsAtama.baskan || '-', bold: true })] }),
              new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: 'Kurul Başkanı', size: 18 })] })
            ] }),
            new docx.TableCell({ borders: { top: { style: docx.BorderStyle.SINGLE, size: 4, color: '111827' } }, margins: { top: 100 }, children: [
              new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: 'Tebellüğ Eden', size: 18, color: '64748B' })] }),
              new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { before: 100 }, children: [new docx.TextRun({ text: imza.adSoyad || '-', bold: true })] }),
              new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: imza.kuruldakiGorev || imza.unvan || '-', size: 18 })] })
            ] })
          ] })]
        })
      ]
    }]
  });

  const blob = await docx.Packer.toBlob(doc);
  saveAs(blob, `Atama_Yazisi_${(imza.adSoyad || 'kisi').replace(/[^\p{L}\p{N}]+/gu, '_')}.docx`);
}

// ==================== 6) STANDALONE İMZA LİSTESİ (WORD/PDF) ====================
// Eski üretim uygulamasındaki ayrı btnSigWord/btnSigPDF butonlarının karşılığı
// — tam Kurul Raporu'nun içine gömülü değil, yalnızca imza listesinin tek
// başına yazdırılabilir/dolaştırılabilir bir belge olarak çıkarılması.

async function imzaListesiWordOlustur() {
  const toplanti = toplantiIdIleGetirRepo(_toplantiId);
  if (!toplanti) return;

  const imzalar = toplantiImzalariniGetir(_toplantiId);

  const doc = new docx.Document({
    sections: [{
      children: [
        new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: _denetimAktifFirmaAdi(), bold: true })] }),
        new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: 'İSG KURULU İMZA LİSTESİ', bold: true, size: 28 })], spacing: { after: 200 } }),
        new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: `${toplanti.toplantiNo} — ${_ciktiDonemMetni(toplanti)} — ${_ciktiTarihSaat(toplanti)}` })], spacing: { after: 400 } }),
        new docx.Table({
          width: { size: 100, type: docx.WidthType.PERCENTAGE },
          rows: [
            // Kullanıcı isteği: sütun genişlikleri artırıldı (eşit dörtte-bir
            // varsayılanı yerine SIRA dar, diğer üç sütun daha geniş).
            new docx.TableRow({
              children: [
                ['SIRA', 8], ['ADI VE SOYADI', 30], ['ÜNVAN / KURULDAKİ GÖREVİ', 30], ['İMZA', 32]
              ].map(([baslik, genislik]) =>
                new docx.TableCell({ width: { size: genislik, type: docx.WidthType.PERCENTAGE }, children: [new docx.Paragraph({ text: baslik, spacing: { before: 120, after: 120 } })] })
              )
            }),
            ...imzalar.map(i => new docx.TableRow({
              height: { value: 350, rule: docx.HeightRule.ATLEAST },
              children: [
                new docx.TableCell({ children: [new docx.Paragraph({ text: i.siraNo, spacing: { before: 60, after: 60 } })] }),
                new docx.TableCell({ children: [new docx.Paragraph({ text: i.adSoyad, spacing: { before: 60, after: 60 } })] }),
                new docx.TableCell({ children: [new docx.Paragraph({ text: [i.unvan, i.kuruldakiGorev].filter(Boolean).join(' / '), spacing: { before: 60, after: 60 } })] }),
                new docx.TableCell({ children: [new docx.Paragraph({ text: '', spacing: { before: 60, after: 60 } })] })
              ]
            }))
          ]
        })
      ]
    }]
  });

  const blob = await docx.Packer.toBlob(doc);
  saveAs(blob, `Imza_Listesi_${toplanti.toplantiNo}.docx`);
}

async function imzaListesiPdfOlustur() {
  const toplanti = toplantiIdIleGetirRepo(_toplantiId);
  if (!toplanti) return;

  const imzalar = toplantiImzalariniGetir(_toplantiId);

  const html = `
  <div id="kurulImzaPdf">
    <style>
      #kurulImzaPdf{ font-family: Arial, Helvetica, sans-serif; color:#111827; font-size:10pt; width:100%; }
      #kurulImzaPdf h1{ text-align:center; font-size:16pt; margin:0 0 4mm; }
      #kurulImzaPdf .alt{ text-align:center; font-size:10pt; color:#475569; margin:0 0 8mm; }
      #kurulImzaPdf table{ width:100%; border-collapse:collapse; }
      #kurulImzaPdf th{ background:#e5e7eb; border:1px solid #94a3b8; padding:5px 6px; font-size:9pt; }
      #kurulImzaPdf td{ border:1px solid #cbd5e1; padding:6px; height:11mm; font-size:9.5pt; }
    </style>
    <h1>${_ciktiKacir(_denetimAktifFirmaAdi())} — İSG KURULU İMZA LİSTESİ</h1>
    <div class="alt">${_ciktiKacir(toplanti.toplantiNo)} — ${_ciktiKacir(_ciktiDonemMetni(toplanti))} — ${_ciktiKacir(_ciktiTarihSaat(toplanti))}</div>
    ${_pdfTablo(['Sıra', 'Ad Soyad', 'Ünvan / Kuruldaki Görevi', 'İmza'], imzalar.map(i => [i.siraNo, i.adSoyad, [i.unvan, i.kuruldakiGorev].filter(Boolean).join(' / '), '']), '', [8, 27, 40, 25])}
  </div>`;

  const mount = document.getElementById('yazdirmaAlani');
  mount.innerHTML = html;
  mount.style.display = 'block';

  await html2pdf()
    .set({
      margin: [10, 10, 10, 10],
      filename: `Imza_Listesi_${toplanti.toplantiNo}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4', compress: true },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['tr'] }
    })
    .from(mount)
    .save();

  mount.innerHTML = '';
  mount.style.display = 'none';
}

// ==================== Buton bağlantıları ====================

function ciktiButonlariniBagla() {
  document.getElementById('btnInviteWord').addEventListener('click', async () => {
    await toplantiDavetiWordOlustur();
  });
  document.getElementById('btnReportWord').addEventListener('click', async () => {
    await kurulRaporuWordOlustur();
  });
  document.getElementById('btnKonuBasliklariWord').addEventListener('click', async () => {
    await konuBasliklariWordOlustur();
  });
  document.getElementById('btnReportPDF').addEventListener('click', async () => {
    try {
      await kurulRaporuPdfOlustur();
    } catch (e) {
      console.error(e);
      alert('PDF üretilemedi: ' + (e.message || e));
    }
  });
  document.getElementById('btnPPTX').addEventListener('click', async () => {
    try {
      await pptxOlustur();
    } catch (e) {
      console.error(e);
      alert('PPTX üretilemedi: ' + (e.message || e));
    }
  });
  document.getElementById('btnImzaListesiWord').addEventListener('click', async () => {
    await imzaListesiWordOlustur();
  });
  document.getElementById('btnImzaListesiPDF').addEventListener('click', async () => {
    try {
      await imzaListesiPdfOlustur();
    } catch (e) {
      console.error(e);
      alert('PDF üretilemedi: ' + (e.message || e));
    }
  });
  document.getElementById('btnFormAyarlari').addEventListener('click', () => formAyarlariModalAc('kurul', 'İSG Kurulu'));
}
