// Bakım Onarım Talep ve İş İzni Formu — Word (.docx) çıktısı: kullanıcı
// isteği — "basit bir word formu, siyah beyaz indirilsin", üst kısmı kalite
// dokümanlarındaki gibi tek satır üç parça (solda logo, ortada başlık,
// sağda doküman no/sürüm) olsun. Diğer modüllerin resmi yazı formatındaki
// (malzeme-talep gibi) hitap/imza düzeninden farklı olarak, doğrudan
// talebin kendisinin basılabilir bir formu.

function _bkTarihSaat(iso) {
  return iso ? new Date(iso).toLocaleString('tr-TR') : '—';
}

// Firma logosunu (varsa) docx ImageRun için ham baytlara çözer — 'fotoref:'
// referansı olabilir (bkz. core/data.js fotoBuyukCoz) ya da doğrudan bir
// Storage/veri URL'si. Logo yoksa veya çözülemezse null döner (başlık
// tablosundaki sol hücre o zaman sadece firma adını gösterir).
async function _bkLogoBaytlariGetir(firma) {
  if (!firma) return null;
  const ham = firmaLogoGetir(firma.id);
  if (!ham) return null;
  try {
    const url = await fotoBuyukCoz(ham);
    if (!url) return null;
    if (url.startsWith('data:')) {
      const base64 = url.split(',')[1];
      const ikili = atob(base64);
      const baytlar = new Uint8Array(ikili.length);
      for (let i = 0; i < ikili.length; i++) baytlar[i] = ikili.charCodeAt(i);
      return baytlar;
    }
    const yanit = await fetch(url);
    return new Uint8Array(await yanit.arrayBuffer());
  } catch (e) {
    console.warn('Firma logosu Word belgesine eklenemedi:', e);
    return null;
  }
}

async function bakimTalepWordOlustur(id) {
  const t = bakimTalepIdIleGetir(id);
  if (!t) return;
  if (!window.docx) { alert('docx.js yüklenemedi.'); return; }

  const { Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType, AlignmentType, VerticalAlign, BorderStyle, Footer, PageNumber } = docx;
  const font = 'Arial', bodySize = 20, baslikSize = 24;
  const kenarlik = {
    top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    right: { style: BorderStyle.SINGLE, size: 4, color: '000000' }
  };

  const etiketHucre = (metin) => new TableCell({
    width: { size: 30, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.CENTER,
    shading: { fill: 'F2F2F2' },
    margins: { top: 60, bottom: 60, left: 90, right: 90 },
    borders: kenarlik,
    children: [new Paragraph({ children: [new TextRun({ text: metin, bold: true, font, size: bodySize })] })]
  });
  const degerHucre = (metin) => new TableCell({
    width: { size: 70, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 60, bottom: 60, left: 90, right: 90 },
    borders: kenarlik,
    children: [new Paragraph({ children: [new TextRun({ text: String(metin ?? '') || '—', font, size: bodySize })] })]
  });
  const satir = (etiket, deger) => new TableRow({ children: [etiketHucre(etiket), degerHucre(deger)] });

  const baslik = (metin) => new Paragraph({
    spacing: { before: 300, after: 150 },
    children: [new TextRun({ text: metin, bold: true, font, size: bodySize + 2 })]
  });

  const tablo = (satirlar) => new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: satirlar });

  const firma = aktifFirmaGetir();
  const _bkFormAyarlari = formAyarlariGetir('bakim-talep');
  const logoBaytlari = await _bkLogoBaytlariGetir(firma);

  // Kalite doküman başlığı: kullanıcı isteği — "formun üst kısmı kalite
  // dokümanlarındaki gibi tek satır üç parça: solda logo, ortada başlık,
  // sağ tarafta kalite notları (doküman no/sürüm/tarih)". Sayfa sayısı
  // buraya SABİT yazılmaz (kullanıcı isteği: "sayfa sayısı değişken olabilir,
  // olana göre düzenlemeli") — bunun yerine belgenin en altında Word'ün
  // kendi otomatik "Sayfa X / Y" alanı kullanılır (bkz. footers altında).
  const baslikTablosu = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.SINGLE, size: 4, color: '000000' }
    },
    rows: [new TableRow({
      children: [
        new TableCell({
          width: { size: 20, type: WidthType.PERCENTAGE }, verticalAlign: VerticalAlign.CENTER,
          margins: { top: 60, bottom: 60, left: 90, right: 90 },
          children: [logoBaytlari
            ? new Paragraph({ alignment: AlignmentType.CENTER, children: [new ImageRun({ data: logoBaytlari, transformation: { width: 70, height: 70 } })] })
            : new Paragraph({ children: [new TextRun({ text: firma ? firma.ad : '', bold: true, font, size: bodySize - 2 })] })]
        }),
        new TableCell({
          width: { size: 55, type: WidthType.PERCENTAGE }, verticalAlign: VerticalAlign.CENTER,
          margins: { top: 60, bottom: 60, left: 90, right: 90 },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'BAKIM ONARIM TALEP VE İŞ İZNİ FORMU', bold: true, font, size: baslikSize })] })]
        }),
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE }, verticalAlign: VerticalAlign.CENTER,
          margins: { top: 60, bottom: 60, left: 90, right: 90 },
          children: [
            new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Doküman No: ' + (_bkFormAyarlari.dokumanNo || '-'), font, size: bodySize - 6 })] }),
            new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Sürüm No: ' + (_bkFormAyarlari.surumNo || '-'), font, size: bodySize - 6 })] }),
            new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Sürüm Tarihi: ' + (_bkFormAyarlari.surumTarihi || '-'), font, size: bodySize - 6 })] })
          ]
        })
      ]
    })]
  });

  const belge = new Document({
    styles: { default: { document: { run: { font, size: bodySize } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 850, right: 850, bottom: 850, left: 850 } } },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ children: ['Sayfa ', PageNumber.CURRENT, ' / ', PageNumber.TOTAL_PAGES], font, size: bodySize - 6 })]
          })]
        })
      },
      children: [
        baslikTablosu,
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 300 }, children: [new TextRun({ text: (firma ? firma.ad : '') + ' — ' + (t.talepNo || ''), font, size: bodySize })] }),

        baslik('1. Talep'),
        tablo([
          satir('Birim', t.talep.birim),
          satir('Talebi Açan Kişi', t.talep.acanKisi),
          satir('Tarih', _bkTarihSaat(t.talep.tarih)),
          satir('Konum / Ekipman / Hat', t.talep.konum),
          satir('Ekipman Kodu', t.talep.ekipmanKodu),
          satir('İş Tanımı / Arıza Açıklaması', t.talep.isTanimi),
          satir('Öncelik', t.talep.oncelik),
          satir('Fotoğraf', (t.talep.fotograflar || []).length ? (t.talep.fotograflar.length + ' adet (uygulamadan görüntülenebilir)') : 'Yok')
        ]),

        baslik('2. Bakım Değerlendirme'),
        tablo([
          satir('Bakım Görüşü / Teknik Değerlendirme', t.bakim.gorus),
          satir('Yapılabilecek Tarih/Saat', _bkTarihSaat(t.bakim.planlanmaTarihi)),
          satir('Gerekli Şartlar', (t.bakim.gerekliSartlar || []).join(', ')),
          satir('Tespit Edilen Riskler', (t.bakim.riskler || []).join(', ')),
          satir('Alınması Gereken Önlemler', t.bakim.onlemler),
          satir('Tahmini Süre / İş Gücü', t.bakim.tahminiSure),
          satir('Değerlendiren', t.bakim.degerlendirenKisi)
        ]),

        baslik('3. İSG Değerlendirme'),
        tablo([
          satir('Onay Durumu', t.isg.onayDurumu),
          satir('İlave Önlem', t.isg.ilaveOnlemGerekli ? t.isg.ilaveOnlemAciklama : 'Gerekmedi'),
          satir('Onaylayan', t.isg.onaylayanKisi),
          satir('Tarih', _bkTarihSaat(t.isg.tarih))
        ]),

        baslik('4. Kapanış'),
        tablo([
          satir('Bakım Tamamlama Tarihi', _bkTarihSaat(t.kapanis.bakimTamamlamaTarihi)),
          satir('Bakım Notu', t.kapanis.bakimNotu),
          satir('Talep Eden Onayı', t.kapanis.talepEdenOnay ? 'Evet' : 'Hayır'),
          satir('Onaylayan', t.kapanis.onaylayanKisi),
          satir('Kapanış Tarihi', _bkTarihSaat(t.kapanis.kapanisTarihi)),
          ...(t.durum === 'Reddedildi' ? [satir('Red Gerekçesi', t.redGerekcesi)] : [])
        ])
      ]
    }]
  });

  const blob = await Packer.toBlob(belge);
  saveAs(blob, (t.talepNo || 'bakim-talep') + '.docx');
}
