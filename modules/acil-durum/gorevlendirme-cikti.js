// Acil Durum Ekibi Görevlendirme Yazısı — Word belge üretimi. Kullanıcının
// kurumundan paylaştığı gerçek görevlendirme yazılarıyla (başlık/tarih-konu-
// revizyon/6331 sayılı Kanun atfı/bilgi tablosu/GÖREV TANIMI/YÜKÜMLÜLÜKLER/
// imza satırı) birebir aynı düzende, docx.js ile (bkz. kontrol-formu-cikti.js
// aynı kütüphane kalıbı) üretilir. Kullanıcı isteği: "bu şekilde atama
// yapabileyim kişi bazında" — hem tek kişi hem seçili/tüm liste için.

function _gcKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function _gcTireVeyaDeger(v) {
  const s = (v ?? '').toString().trim();
  return s || '-';
}

function _gcHucre(metin, baslikMi) {
  return new docx.TableCell({
    shading: baslikMi ? { fill: 'E5E7EB' } : undefined,
    width: baslikMi ? { size: 30, type: docx.WidthType.PERCENTAGE } : { size: 70, type: docx.WidthType.PERCENTAGE },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new docx.Paragraph({ children: [new docx.TextRun({ text: String(metin ?? '') || '-', bold: !!baslikMi, size: 20 })] })]
  });
}

function _gcBilgiTablosu(uye) {
  const satir = (etiket, deger) => new docx.TableRow({ children: [_gcHucre(etiket, true), _gcHucre(deger)] });
  return new docx.Table({
    width: { size: 100, type: docx.WidthType.PERCENTAGE },
    rows: [
      satir('Adı Soyadı', uye.personelAdi),
      satir('Bölümü', uye.bolum),
      satir('Görevi', uye.gorev),
      satir('Görevlendirildiği Ekip', uye.ekipTuru)
    ]
  });
}

const _GC_YUKUMLULUKLER = [
  'Acil durumun giderilmesi için verilen emir ve/veya ekip talimatlarına uymak.',
  'Acil durumlarda kendi ve çalışma arkadaşlarının güvenliğini tehlikeye atmayacak şekilde davranmak.'
];

const _GC_IMZA_KENARLIK = { style: docx.BorderStyle.SINGLE, size: 4, color: 'CBD5E1' };

function _gcImzaHucresi(baslik, isim) {
  return new docx.TableCell({
    borders: { top: _GC_IMZA_KENARLIK, bottom: _GC_IMZA_KENARLIK, left: _GC_IMZA_KENARLIK, right: _GC_IMZA_KENARLIK },
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
    children: [
      new docx.Paragraph({ spacing: { after: 60 }, children: [new docx.TextRun({ text: baslik, bold: true, size: 20 })] }),
      new docx.Paragraph({ spacing: { after: 200 }, children: [new docx.TextRun({ text: isim || '', size: 20 })] }),
      new docx.Paragraph({ children: [new docx.TextRun({ text: '', size: 20 })] })
    ]
  });
}

// Bir kişinin tam görevlendirme yazısı — sayfanın tamamını kaplar, çoklu
// üretimde her kişi ayrı sayfada (pageBreakBefore) basılır.
function _gcKisiSayfasi(uye, firma, sayfaSonuOncesi) {
  const bugun = gunAyYil(bugunIso());
  const iseverenVekili = (firma.sicilBilgileri && firma.sicilBilgileri.iseverenVekili) || '';
  return [
    new docx.Paragraph({
      pageBreakBefore: !!sayfaSonuOncesi,
      spacing: { after: 40 },
      children: [new docx.TextRun({ text: (firma.ad || '').toLocaleUpperCase('tr'), bold: true, size: 26 })]
    }),
    new docx.Paragraph({ spacing: { after: 40 }, children: [new docx.TextRun({ text: 'İş Sağlığı ve Güvenliği Birimi', size: 20 })] }),
    new docx.Paragraph({ spacing: { after: 180 }, children: [new docx.TextRun({ text: 'ACİL DURUM EKİBİ GÖREVLENDİRME YAZISI', bold: true, size: 24 })] }),

    new docx.Paragraph({
      spacing: { after: 160 },
      children: [new docx.TextRun({ text: `Tarih: ${bugun}    |    Konu: Acil Durum Görevlendirme    |    Revizyon: 00`, size: 18, color: '475569' })]
    }),

    new docx.Paragraph({
      spacing: { after: 200 },
      children: [new docx.TextRun({
        text: '6331 sayılı İş Sağlığı ve Güvenliği Kanunu ve İşyerlerinde Acil Durumlar Hakkında Yönetmelik Madde 11 ' +
          'uyarınca, aşağıda bilgileri yer alan çalışan acil durum ekibinde görevlendirilmiştir.',
        size: 20
      })]
    }),

    _gcBilgiTablosu(uye),

    new docx.Paragraph({ spacing: { before: 220, after: 100 }, children: [new docx.TextRun({ text: 'GÖREV TANIMI', bold: true, size: 21 })] }),
    ...acilDurumGorevTanimiGetir(uye.ekipTuru).map(madde => new docx.Paragraph({ bullet: { level: 0 }, spacing: { after: 60 }, children: [new docx.TextRun({ text: madde, size: 20 })] })),

    new docx.Paragraph({ spacing: { before: 200, after: 100 }, children: [new docx.TextRun({ text: 'ÇALIŞANIN YÜKÜMLÜLÜKLERİ', bold: true, size: 21 })] }),
    ..._GC_YUKUMLULUKLER.map((madde, i) => new docx.Paragraph({ spacing: { after: 60 }, children: [new docx.TextRun({ text: `${i + 1}. ${madde}`, size: 20 })] })),

    new docx.Paragraph({ spacing: { before: 300, after: 100 }, children: [new docx.TextRun({ text: '' })] }),
    new docx.Table({
      width: { size: 100, type: docx.WidthType.PERCENTAGE },
      rows: [new docx.TableRow({
        height: { value: 1200, rule: docx.HeightRule.ATLEAST },
        children: [_gcImzaHucresi('İŞVEREN VEKİLİ', iseverenVekili), _gcImzaHucresi('ÇALIŞAN', uye.personelAdi)]
      })]
    })
  ];
}

// uyeler: tek kişilik veya çok kişilik dizi — her biri ayrı sayfada basılır.
async function ekipGorevlendirmeYazisiWordOlustur(firma, uyeler) {
  if (!uyeler || !uyeler.length) {
    alert('Görevlendirme yazısı üretebilmek için önce en az bir ekip üyesi ekleyin.');
    return;
  }

  const cocuklar = [];
  uyeler.forEach((uye, i) => cocuklar.push(..._gcKisiSayfasi(uye, firma, i > 0)));

  const dokuman = new docx.Document({ sections: [{ properties: {}, children: cocuklar }] });
  const blob = await docx.Packer.toBlob(dokuman);
  const dosyaAdi = uyeler.length === 1
    ? `Gorevlendirme_Yazisi_${(uyeler[0].personelAdi || 'kisi').replace(/[^\p{L}\p{N}]+/gu, '_')}.docx`
    : `Gorevlendirme_Yazilari_${(firma.ad || 'firma').replace(/[^\p{L}\p{N}]+/gu, '_')}.docx`;
  saveAs(blob, dosyaAdi);
}
