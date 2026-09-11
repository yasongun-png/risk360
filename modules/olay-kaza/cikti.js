// Olay / Kaza — Olay Araştırma Raporu Word çıktısı (PDF çıktısı kullanıcı
// isteğiyle kaldırıldı). Kullanıcının
// paylaştığı gerçek bir "İş Kazası Araştırma Raporu" örneğinin yapısını izler
// (modül artık iş kazasının yanında ramak kala/yangın/acil durum gibi genel
// olayları da kapsadığı için başlık "Olay Araştırma Raporu" olarak
// genelleştirildi — kullanıcı isteği): üst bilgi (Rapor No/
// Tarihi, Hazırlayan/Onaylayan, Kaza Sınıfı, Soruşturma Süresi), Genel
// Bilgiler, Olay Özeti, Olay Kronolojisi, Tanık İfadeleri, 5N1K Analizi,
// İlgili Mevzuat, Düzeltici/Önleyici Faaliyetler, Sonuç ve Değerlendirme,
// 3 imzalı kapanış. Sade/siyah-beyaz görünüm (uygunsuzluk modülüyle tutarlı)
// — kullanıcı isteği: "rapor siyah beyaz". Doldurulmamış opsiyonel bölümler
// başlıklarıyla birlikte hiç görünmez (kullanıcı isteği: "örn şahit
// eklemediysem o başlık hiç görünmesin") — bölüm numaraları buna göre
// dinamik üretilir, boş bölüm yüzünden numarada boşluk kalmaz.

function _okKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// Kullanıcı isteği: "tıbbi tedavi yazsa bile iş kazası olduğunda mutlaka
// belirtmesi lazım" — yaralanmalı olay tiplerinde (OLAY_KISI_ZORUNLU_TIPLERI)
// "Kaza Sınıfı" satırı sadece olay tipini (ör. "Tıbbi Tedavi") göstermek
// yerine önüne "İş Kazası —" ekler; kazaSinifi elle doldurulmuşsa ve zaten
// "iş kazası" geçiyorsa tekrar eklenmez.
function _okKazaSinifiMetni(k) {
  const temel = k.kazaSinifi || k.olayTipi;
  const isKazasiMi = OLAY_KISI_ZORUNLU_TIPLERI.includes(k.olayTipi);
  if (!isKazasiMi || /iş kazası/i.test(temel)) return temel;
  return 'İş Kazası — ' + temel;
}

function _okRpRozet(rp) {
  if (rp == null) return '-';
  if (rp < 20) return `Düşük (${rp})`;
  if (rp < 70) return `Orta (${rp})`;
  if (rp < 200) return `Yüksek (${rp})`;
  if (rp < 400) return `Çok Yüksek (${rp})`;
  return `Tolere Edilemez (${rp})`;
}

// İşe giriş tarihinden kaza tarihine (veya bugüne) kadarki kıdemi "X yıl Y ay"
// olarak üretir — gerçek rapor örneğindeki "Görevi/Kıdemi: ... – 3 yıl 4 ay"
// biçimine uyar.
function _okKidemMetni(iseGirisTarihi, referansTarih) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iseGirisTarihi || '')) return '';
  const giris = new Date(iseGirisTarihi);
  const ref = /^\d{4}-\d{2}-\d{2}$/.test(referansTarih || '') ? new Date(referansTarih) : new Date();
  if (ref < giris) return '';
  let ay = (ref.getFullYear() - giris.getFullYear()) * 12 + (ref.getMonth() - giris.getMonth());
  if (ref.getDate() < giris.getDate()) ay--;
  if (ay < 0) return '';
  const yil = Math.floor(ay / 12);
  const kalanAy = ay % 12;
  const parcalar = [];
  if (yil > 0) parcalar.push(`${yil} yıl`);
  parcalar.push(`${kalanAy} ay`);
  return parcalar.join(' ');
}

// ==================== OLAY ARAŞTIRMA RAPORU (WORD) ====================
// Kullanıcı isteği: "rapor pdf'i tamamen kaldır" — bu modülde artık yalnızca
// Word çıktısı üretiliyor (bkz. ui.js: "Rapor PDF" butonu ve kazaRaporuPdfOlustur
// çağrısı da kaldırıldı).
// PDF çıktısıyla aynı içerik/bölüm sırası — kullanıcı isteği: "pdf raporunun
// aynısını word raporunu yap". Kurul modülündeki kart-tablosu deseniyle aynı
// yaklaşım (kenarlıklı/gölgeli tablo hücreleri), modüller arası script
// paylaşımı olmadığı için burada yerel olarak yeniden tanımlandı.

const _okWordKenar = { style: docx.BorderStyle.SINGLE, size: 4, color: '111827' };
const _okWordKenarSet = { top: _okWordKenar, bottom: _okWordKenar, left: _okWordKenar, right: _okWordKenar };
const _okWordGolge = { fill: 'E5E7EB', color: 'auto', type: docx.ShadingType.CLEAR };
const _okWordHucre = (children, opts = {}) => new docx.TableCell({
  children: Array.isArray(children) ? children : [children],
  borders: _okWordKenarSet,
  margins: { top: 60, bottom: 60, left: 100, right: 100 },
  ...opts
});

function _okWordEtiketHucresi(etiket, genislik) {
  return _okWordHucre(new docx.Paragraph({ children: [new docx.TextRun({ text: etiket, bold: true, size: 15 })] }), { width: { size: genislik, type: docx.WidthType.PERCENTAGE }, shading: _okWordGolge });
}
function _okWordDegerHucresi(deger, genislik, opts = {}) {
  return _okWordHucre(new docx.Paragraph(String(deger ?? '') || '-'), Object.assign({ width: { size: genislik, type: docx.WidthType.PERCENTAGE } }, opts));
}
function _okWordIkiliSatir(etiket1, deger1, etiket2, deger2) {
  return new docx.TableRow({ children: [
    _okWordEtiketHucresi(etiket1, 18), _okWordDegerHucresi(deger1, 32),
    _okWordEtiketHucresi(etiket2, 18), _okWordDegerHucresi(deger2, 32)
  ]});
}
function _okWordTekliSatir(etiket, deger) {
  return new docx.TableRow({ children: [
    _okWordEtiketHucresi(etiket, 18),
    _okWordDegerHucresi(deger, 82, { columnSpan: 3 })
  ]});
}
function _okWordMetinKutusu(metin) {
  return new docx.Table({
    width: { size: 100, type: docx.WidthType.PERCENTAGE },
    rows: [new docx.TableRow({ children: [_okWordHucre(new docx.Paragraph(String(metin || '') || '-'))] })]
  });
}
function _okWordBaslik(t) {
  return new docx.Paragraph({ text: t, bold: true, spacing: { before: 100, after: 60 } });
}

// PDF'teki _okBolumleriBirlestir ile aynı mantık — boş bölüm başlığıyla
// birlikte hiç görünmez, numaralar dolu bölümlere göre otomatik verilir.
function _okWordBolumleriBirlestir(bolumler) {
  let sira = 0;
  const cocuklar = [];
  bolumler.filter(b => b.doluMu).forEach(b => {
    sira++;
    cocuklar.push(new docx.Paragraph({ text: `${sira}. ${b.baslik}`, heading: docx.HeadingLevel.HEADING_2, spacing: { before: 300, after: 150 } }));
    cocuklar.push(...b.docx);
    cocuklar.push(new docx.Paragraph({ text: '', spacing: { after: 100 } }));
  });
  return cocuklar;
}

async function kazaRaporuWordOlustur(id) {
  const k = olayKaydiIdIleGetirRepo(id);
  if (!k) return;

  const firma = aktifFirmaGetir();
  const bugun = gunAyYil(bugunIso());
  const fkRP = fineKinneyPuaniHesapla(k);
  const kidem = _okKidemMetni(k.iseGirisTarihi, k.kazaTarihi);
  const gorevKidem = [k.gorev, kidem].filter(Boolean).join(' – ');
  const magdur = [k.adSoyad, k.magdurYasi != null ? k.magdurYasi + ' yaş' : ''].filter(Boolean).join(', ');

  const kronoloji = Array.isArray(k.kronoloji) ? k.kronoloji.filter(s => s.gelisme) : [];
  const kronolojiDocx = [new docx.Table({
    width: { size: 100, type: docx.WidthType.PERCENTAGE },
    rows: [
      new docx.TableRow({ children: [_okWordEtiketHucresi('Saat', 16), _okWordEtiketHucresi('Gelişme', 84)] }),
      ...kronoloji.map(s => new docx.TableRow({ children: [_okWordDegerHucresi(s.saat, 16), _okWordDegerHucresi(s.gelisme, 84)] }))
    ]
  })];

  const tanikIfadeleri = Array.isArray(k.tanikIfadeleri) ? k.tanikIfadeleri.filter(t => t.adSoyad || t.ifade) : [];
  const tanikDocx = tanikIfadeleri.flatMap((t, i) => [
    new docx.Paragraph({ children: [new docx.TextRun({ text: `Tanık ${i + 1} – ${t.adSoyad}${t.unvan ? ', ' + t.unvan : ''}`, bold: true, size: 20 })], spacing: { before: 80 } }),
    new docx.Paragraph({ children: [new docx.TextRun({ text: `"${t.ifade || ''}"`, italics: true, size: 18 })], spacing: { after: 80 } })
  ]);

  const analiz5n1kDoluMu = [k.analizNe, k.analizNerede, k.analizNeZaman, k.analizKim, k.analizNasil, k.analizNeden].some(Boolean);
  const analiz5n1kDocx = [new docx.Table({
    width: { size: 100, type: docx.WidthType.PERCENTAGE },
    rows: [
      _okWordTekliSatir('Ne', k.analizNe), _okWordTekliSatir('Nerede', k.analizNerede),
      _okWordTekliSatir('Ne Zaman', k.analizNeZaman), _okWordTekliSatir('Kim', k.analizKim),
      _okWordTekliSatir('Nasıl', k.analizNasil), _okWordTekliSatir('Neden', k.analizNeden)
    ]
  })];

  const mevzuatSatirlari = (k.ilgiliMevzuat || '').split('\n').map(s => s.trim()).filter(Boolean);
  const mevzuatDocx = mevzuatSatirlari.map(m => new docx.Paragraph({ text: m, bullet: { level: 0 } }));

  const aksiyonlar = Array.isArray(k.aksiyonlar) ? k.aksiyonlar.filter(a => a.baslik || a.duzelticiFaaliyet) : [];
  const aksiyonDocx = [new docx.Table({
    width: { size: 100, type: docx.WidthType.PERCENTAGE },
    rows: [
      new docx.TableRow({ children: ['Uygunsuzluk Tanımı', 'Düzeltici Faaliyet', 'Sorumlu', 'Termin', 'Durum'].map(b => _okWordEtiketHucresi(b, 20)) }),
      ...aksiyonlar.map(a => new docx.TableRow({ children: [
        _okWordDegerHucresi(a.baslik, 20), _okWordDegerHucresi(a.duzelticiFaaliyet, 20),
        _okWordDegerHucresi(a.sorumlu, 20), _okWordDegerHucresi(gunAyYil(a.termin), 20), _okWordDegerHucresi(a.durum, 20)
      ]}))
    ]
  })];

  const bolumler = [
    { baslik: 'Genel Bilgiler', doluMu: true, docx: [new docx.Table({
      width: { size: 100, type: docx.WidthType.PERCENTAGE },
      rows: [
        _okWordTekliSatir('İşyeri', firma ? firma.ad : ''),
        _okWordIkiliSatir('Kaza Yeri', k.kazaYeri, 'Kaza Tarihi / Saati', [gunAyYil(k.kazaTarihi), k.kazaSaati].filter(Boolean).join(' – ')),
        _okWordIkiliSatir('Mağdur', magdur, 'Görevi / Kıdemi', gorevKidem),
        _okWordIkiliSatir('Tehlikeli Madde', k.tehlikeliMadde, 'Tanık Sayısı', k.tanikSayisi ?? ''),
        ...((OLAY_KISI_ZORUNLU_TIPLERI.includes(k.olayTipi) || k.yaralanmaTuru || k.yaralananUzuv) ? [_okWordIkiliSatir('Yaralanma Türü', k.yaralanmaTuru, 'Yaralanan Bölge', k.yaralananUzuv)] : []),
        _okWordIkiliSatir('Kayıp Gün', k.kayipGun ?? '', 'DART Gün', k.dartGun ?? ''),
        ...((k.fkO && k.fkF && k.fkS) ? [_okWordTekliSatir('Fine-Kinney (O/F/Ş/RP)', `O: ${k.fkO}  F: ${k.fkF}  Ş: ${k.fkS}  RP: ${_okRpRozet(fkRP)}`)] : [])
      ]
    })] },
    { baslik: 'Olay Özeti', doluMu: true, docx: [
      _okWordMetinKutusu(k.aciklama),
      ...(k.potansiyelSonuc ? [_okWordBaslik('Potansiyel Sonuç'), _okWordMetinKutusu(k.potansiyelSonuc)] : [])
    ] },
    { baslik: 'Olay Kronolojisi', doluMu: kronoloji.length > 0, docx: kronolojiDocx },
    { baslik: 'Tanık İfadeleri', doluMu: tanikIfadeleri.length > 0, docx: tanikDocx },
    { baslik: '5N1K Analizi', doluMu: analiz5n1kDoluMu, docx: analiz5n1kDocx },
    { baslik: 'İlgili Mevzuat', doluMu: mevzuatSatirlari.length > 0, docx: mevzuatDocx },
    { baslik: 'Yapılacak Faaliyetler', doluMu: aksiyonlar.length > 0, docx: aksiyonDocx },
    { baslik: 'Sonuç ve Değerlendirme', doluMu: !!k.sonucDegerlendirme, docx: [_okWordMetinKutusu(k.sonucDegerlendirme)] }
  ];

  const ustBilgiTablosu = new docx.Table({
    width: { size: 100, type: docx.WidthType.PERCENTAGE },
    rows: [
      _okWordIkiliSatir('Rapor No', k.kayitNo, 'Rapor Tarihi', bugun),
      _okWordTekliSatir('Hazırlayan', [k.hazirlayanAdi, k.hazirlayanUnvan].filter(Boolean).join(' – ')),
      _okWordIkiliSatir('Kaza Sınıfı', _okKazaSinifiMetni(k), 'Soruşturma Süresi', [gunAyYil(k.sorusturmaBaslangic), gunAyYil(k.sorusturmaBitis)].filter(Boolean).join(' – '))
    ]
  });

  const imzaTablosu = new docx.Table({
    width: { size: 100, type: docx.WidthType.PERCENTAGE },
    borders: { top: { style: docx.BorderStyle.NONE, size: 0, color: 'FFFFFF' }, bottom: { style: docx.BorderStyle.NONE, size: 0, color: 'FFFFFF' }, left: { style: docx.BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: docx.BorderStyle.NONE, size: 0, color: 'FFFFFF' }, insideHorizontal: { style: docx.BorderStyle.NONE, size: 0, color: 'FFFFFF' }, insideVertical: { style: docx.BorderStyle.NONE, size: 0, color: 'FFFFFF' } },
    rows: [new docx.TableRow({ children: [
      new docx.TableCell({ borders: { top: _okWordKenar }, margins: { top: 100 }, children: [
        new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: k.hazirlayanAdi || '-', bold: true })] }),
        new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: k.hazirlayanUnvan || 'Hazırlayan', size: 18 })] })
      ] }),
      new docx.TableCell({ borders: { top: _okWordKenar }, margins: { top: 100 }, children: [
        new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: k.ekipUyesiAdi || '-', bold: true })] }),
        new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: k.ekipUyesiUnvan || 'Soruşturma Ekibi Üyesi', size: 18 })] })
      ] }),
      new docx.TableCell({ borders: { top: _okWordKenar }, margins: { top: 100 }, children: [
        new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: k.onaylayanAdi || '-', bold: true })] }),
        new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: k.onaylayanUnvan || 'Bölüm Yöneticisi', size: 18 })] })
      ] })
    ] })]
  });

  const cocuklar = [
    new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: 'OLAY ARAŞTIRMA RAPORU', bold: true, size: 32 })], spacing: { after: 300 } }),
    ustBilgiTablosu,
    new docx.Paragraph({ text: '', spacing: { after: 200 } }),
    ..._okWordBolumleriBirlestir(bolumler),
    new docx.Paragraph({ text: '', spacing: { before: 400 } }),
    imzaTablosu
  ];

  const doc = new docx.Document({
    sections: [{
      properties: { page: { size: { orientation: docx.PageOrientation.PORTRAIT }, margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
      footers: {
        default: new docx.Footer({
          children: [new docx.Paragraph({
            alignment: docx.AlignmentType.CENTER,
            children: [new docx.TextRun({ children: ['Sayfa ', docx.PageNumber.CURRENT, ' / ', docx.PageNumber.TOTAL_PAGES], size: 16, color: '64748B' })]
          })]
        })
      },
      children: cocuklar
    }]
  });

  const blob = await docx.Packer.toBlob(doc);
  saveAs(blob, `Olay_Raporu_${(k.kayitNo || id).replace(/[\\/]/g, '-')}.docx`);
}
