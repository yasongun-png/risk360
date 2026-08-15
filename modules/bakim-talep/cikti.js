// Bakım Talep Word (.docx) çıktısı: kullanıcı isteği — "basit bir word
// formu, siyah beyaz indirilsin". Renk/logo yok, sade etiket-değer
// tablosu — diğer modüllerin resmi yazı formatındaki (malzeme-talep gibi)
// hitap/imza düzeninden farklı olarak, doğrudan talebin kendisinin
// basılabilir bir formu.

function _bkTarihSaat(iso) {
  return iso ? new Date(iso).toLocaleString('tr-TR') : '—';
}

async function bakimTalepWordOlustur(id) {
  const t = bakimTalepIdIleGetir(id);
  if (!t) return;
  if (!window.docx) { alert('docx.js yüklenemedi.'); return; }

  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, VerticalAlign, BorderStyle } = docx;
  const font = 'Arial', bodySize = 20, baslikSize = 28;
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
  const gecmisSatirlari = (t.gecmis || []).slice().reverse()
    .map(g => `${_bkTarihSaat(g.tarih)} — ${g.kullanici || ''}: ${g.not || ''}`);
  const gecmisParagraflari = gecmisSatirlari.length
    ? gecmisSatirlari.map(satirMetni => new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: satirMetni, font, size: bodySize - 2 })] }))
    : [new Paragraph({ children: [new TextRun({ text: '—', font, size: bodySize - 2 })] })];

  const belge = new Document({
    styles: { default: { document: { run: { font, size: bodySize } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 850, right: 850, bottom: 850, left: 850 } } },
      children: [
        new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 100 }, children: [new TextRun({
          text: `Doküman No: ${_bkFormAyarlari.dokumanNo || '-'}   Sürüm: ${_bkFormAyarlari.surumNo || '-'} / ${_bkFormAyarlari.surumTarihi || '-'}   Sayfa: ${_bkFormAyarlari.sayfaSayisi || '-'}`,
          font, size: bodySize - 4
        })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: 'BAKIM TALEP FORMU', bold: true, font, size: baslikSize })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [new TextRun({ text: (firma ? firma.ad : '') + ' — ' + (t.talepNo || ''), font, size: bodySize })] }),

        baslik('1. Talep'),
        tablo([
          satir('Birim', t.talep.birim),
          satir('Talebi Açan Kişi', t.talep.acanKisi),
          satir('Tarih', _bkTarihSaat(t.talep.tarih)),
          satir('Konum / Ekipman / Hat', t.talep.konum),
          satir('Ekipman Kodu', t.talep.ekipmanKodu),
          satir('İş Tanımı / Arıza Açıklaması', t.talep.isTanimi),
          satir('Öncelik', t.talep.oncelik)
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
        ]),

        baslik('Geçmiş'),
        ...gecmisParagraflari
      ]
    }]
  });

  const blob = await Packer.toBlob(belge);
  saveAs(blob, (t.talepNo || 'bakim-talep') + '.docx');
}
