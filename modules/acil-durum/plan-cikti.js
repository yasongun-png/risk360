// Acil Durum Planı — Word / PDF / PPTX belge üretimi. modules/kurul/cikti.js
// ile aynı kütüphane kalıbı (docx.js / html2pdf.js / pptxgenjs), tek fark:
// burada tek bir belge türü (kapsamlı acil durum planı) üretiliyor, bu yüzden
// kurul'daki gibi çok sayıda ayrı çıktı fonksiyonu yerine üç format için
// TEK veri objesi (acilDurumBelgeVerisiTopla) üç ayrı render fonksiyonuna
// (Word/PDF/PPTX) besleniyor.

function _pcKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function _pcTireVeyaDeger(v) {
  const s = (v ?? '').toString().trim();
  return s || '-';
}

function _pcListeMetni(arr) {
  return (arr || []).length ? arr.join(', ') : '-';
}

// ==================== PDF (html2pdf) ====================

async function acilDurumPlaniPdfOlustur(firma) {
  const veri = acilDurumBelgeVerisiTopla(firma);
  const k = _pcKacir;

  const bolum = (baslik, icerikHtml) => `
    <div class="ad-bolum">
      <h2>${k(baslik)}</h2>
      ${icerikHtml}
    </div>
  `;

  const tablo = (basliklar, satirlar) => satirlar.length ? `
    <table>
      <thead><tr>${basliklar.map(b => `<th>${k(b)}</th>`).join('')}</tr></thead>
      <tbody>${satirlar.map(s => `<tr>${s.map(h => `<td>${k(h)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>
  ` : '<p class="ad-bos">Kayıt bulunmamaktadır.</p>';

  const eksikler = acilDurumEksikVerileriTespitEt(veri);

  const govde = `
    <div class="ad-kapak">
      <div class="ad-kapak-baslik">ACİL DURUM PLANI</div>
      <div class="ad-kapak-firma">${k(firma.ad)}</div>
      <div class="ad-kapak-meta">
        Hazırlanma Tarihi: ${k(gunAyYil(veri.plan.hazirlanmaTarihi)) || '-'} &nbsp;|&nbsp;
        Geçerlilik Tarihi: ${k(gunAyYil(veri.plan.gecerlilikTarihi)) || '-'}<br>
        Hazırlayan: ${k(veri.plan.hazirlayan) || '-'} (${k(veri.plan.hazirlayanUnvan) || '-'}) &nbsp;|&nbsp;
        Onaylayan: ${k(veri.plan.onaylayan) || '-'} (${k(veri.plan.onaylayanUnvan) || '-'})
      </div>
      ${eksikler.length ? `<div class="ad-uyari"><b>⚠ Eksik Veriler:</b><ul>${eksikler.map(e => `<li>${k(e)}</li>`).join('')}</ul></div>` : ''}
    </div>

    ${bolum('1. Tesis Bilgileri', `
      <table>
        <tr><td class="ad-etiket">Tesis Türleri</td><td colspan="3">${k(_pcListeMetni(veri.tesisBilgi.tesisTurleri))}</td></tr>
        <tr><td class="ad-etiket">Adres</td><td colspan="3">${k(_pcTireVeyaDeger(veri.tesisBilgi.adres))}</td></tr>
        <tr><td class="ad-etiket">Faaliyet Konusu</td><td>${k(_pcTireVeyaDeger(veri.tesisBilgi.faaliyetKonusu))}</td><td class="ad-etiket">Vardiya Sayısı</td><td>${k(_pcTireVeyaDeger(veri.tesisBilgi.vardiyaSayisi))}</td></tr>
        <tr><td class="ad-etiket">Bina Sayısı</td><td>${k(_pcTireVeyaDeger(veri.tesisBilgi.binaSayisi))}</td><td class="ad-etiket">Kat Sayısı</td><td>${k(_pcTireVeyaDeger(veri.tesisBilgi.katSayisi))}</td></tr>
        <tr><td class="ad-etiket">Alt İşveren Sayısı</td><td>${k(_pcTireVeyaDeger(veri.tesisBilgi.altIsverenSayisi))}</td><td class="ad-etiket">Gece Çalışması</td><td>${veri.tesisBilgi.geceCalismaVarMi ? 'Var' : 'Yok'}</td></tr>
      </table>
    `)}

    ${bolum('2. Tehlike ve Senaryo Kartları', tablo(
      ['Senaryo No', 'Başlık', 'Kategori', 'Öncelik', 'Tahliye Kararı', 'Durum'],
      veri.senaryolar.map(s => [s.senaryoNo, s.baslik, s.kategori, s.oncelik, s.tahliyeKarari, s.durum])
    ))}

    ${bolum('3. Ekip Tanımları', tablo(
      ['Ekip Türü', 'Müdahale Sınırı', 'Görev Tanımı'],
      veri.ekipTanimlari.map(e => [e.ekipTuru, e.mudahaleSiniri, e.gorevTanimi])
    ))}

    ${bolum('4. Acil Durum Yönetim Yapısı', tablo(
      ['Pozisyon', 'Personel', 'Yedek Personel', 'Vardiya', 'Telefon'],
      veri.komutaPozisyonlari.map(p => [p.pozisyonAdi, p.personelAdi, p.yedekPersonelAdi, p.vardiya, p.telefon])
    ))}

    ${bolum('5. Tahliye Planları', tablo(
      ['Plan No', 'Bina/Alan', 'Kat/Bölüm', 'Toplanma Alanı', 'Kaçış Yolu'],
      veri.tahliyeAlanlari.map(t => [t.tahliyeNo, t.binaAdi, t.katBolum, t.toplanmaAlani, t.kacisYolu])
    ))}

    ${bolum('6. Kimyasal Ekleri', tablo(
      ['Kimyasal', 'İlk Yardım', 'Yangınla Mücadele', 'İzolasyon Mesafesi'],
      veri.kimyasalEkleri.map(ke => [ke.kimyasalAdiOnbellek, ke.ilkYardim, ke.yanginlaMucadele, ke.izolasyonMesafesi])
    ))}

    ${bolum('7. Kroki Kontrolü', tablo(
      ['Bina/Alan', 'Unsur Türü', 'Mevcut mu', 'Eksiklik Notu'],
      veri.krokiKontrolleri.map(kk => [kk.binaAlan, kk.unsurTuru, kk.mevcutMu ? 'Evet' : 'Hayır', kk.eksiklikNotu])
    ))}

    ${bolum('8. Dış Kurumlar', tablo(
      ['Tür', 'Kurum Adı', 'Telefon', 'Yetkili Kişi'],
      veri.disKurumlar.map(dk => [dk.tur, dk.ad, dk.telefon, dk.yetkiliKisi])
    ))}

    ${bolum('9. Öz Denetim', tablo(
      ['Soru', 'Cevap', 'Not'],
      ACIL_DURUM_OZ_DENETIM_SORULARI.map(s => {
        const c = veri.ozDenetim.cevaplar[s.id] || {};
        return [s.soru, c.cevap || 'Değerlendirilmedi', c.not];
      })
    ))}

    ${bolum('10. Eylem Planı', tablo(
      ['Eylem No', 'Kaynak', 'Eksiklik', 'Sorumlu', 'Termin', 'Öncelik', 'Durum'],
      veri.eylemPlani.map(e => [e.eylemNo, e.kaynak, e.eksiklik, e.sorumlu, gunAyYil(e.termin), e.oncelik, e.durum])
    ))}

    ${bolum('11. Mevzuat Uygunluk', tablo(
      ['Gereklilik', 'Mevzuat/Standart', 'Uygunluk', 'Eksiklik'],
      veri.mevzuatUygunluk.map(m => [m.gereklilik, m.mevzuatStandart, m.uygunluk, m.eksiklik])
    ))}

    ${bolum('12. Doküman Kontrol / Revizyon Geçmişi', tablo(
      ['Revizyon No', 'Tarih', 'Değişiklik Özeti', 'Hazırlayan', 'Onaylayan'],
      veri.revizyonGecmisi.map(r => [r.revizyonNo, gunAyYil(r.tarih), r.degisiklikOzeti, r.hazirlayan, r.onaylayan])
    ))}
  `;

  const html = `
    <div id="adPdfKok">
      <style>
        #adPdfKok{ font-family: Arial, Helvetica, sans-serif; color:#111827; background:#fff; font-size:9.5pt; }
        #adPdfKok *{ box-sizing:border-box; }

        #adPdfKok .ad-kapak{ text-align:center; padding:22mm 6mm 14mm; page-break-after:always; }
        #adPdfKok .ad-kapak-baslik{ font-size:24pt; font-weight:700; color:#0b2c52; letter-spacing:1px; }
        #adPdfKok .ad-kapak-firma{ font-size:15pt; font-weight:700; margin-top:6mm; }
        #adPdfKok .ad-kapak-meta{ font-size:10pt; color:#374151; margin-top:8mm; line-height:1.7; }
        #adPdfKok .ad-uyari{ text-align:left; margin:12mm auto 0; max-width:140mm; border:1px solid #f59e0b; background:#fffbeb; padding:4mm 6mm; font-size:9pt; }
        #adPdfKok .ad-uyari ul{ margin:2mm 0 0; padding-left:5mm; }

        #adPdfKok .ad-bolum{ margin-bottom:6mm; page-break-inside:avoid; break-inside:avoid; }
        #adPdfKok .ad-bolum h2{ margin:0 0 3mm; background:#0b2c52; color:#fff; font-size:10.5pt; padding:2.2mm 3mm; text-transform:uppercase; }
        #adPdfKok .ad-bolum table{ width:100%; border-collapse:collapse; }
        #adPdfKok .ad-bolum th, #adPdfKok .ad-bolum td{ border:1px solid #cbd5e1; padding:1.8mm 2.6mm; vertical-align:top; font-size:8.3pt; text-align:left; }
        #adPdfKok .ad-bolum th{ background:#f1f5f9; font-weight:700; }
        #adPdfKok .ad-etiket{ font-weight:700; width:18%; background:#f8fafc; }
        #adPdfKok .ad-bos{ font-size:9pt; color:#64748b; font-style:italic; margin:0; }
      </style>
      ${govde}
    </div>
  `;

  const mount = document.getElementById('yazdirmaAlani');
  mount.innerHTML = html;
  mount.style.display = 'block';

  await html2pdf()
    .set({
      margin: [8, 8, 8, 8],
      filename: `Acil_Durum_Plani_${(firma.ad || 'firma').replace(/[^\p{L}\p{N}]+/gu, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollX: 0, scrollY: 0 },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4', compress: true },
      pagebreak: { mode: ['css', 'legacy'] }
    })
    .from(mount)
    .save();

  mount.innerHTML = '';
  mount.style.display = 'none';
}

// ==================== WORD (docx.js) ====================

const _wcGolge = { fill: 'E5E7EB', color: 'auto', type: docx.ShadingType.CLEAR };

function _wcBaslik(metin, seviye) {
  return new docx.Paragraph({ heading: seviye || docx.HeadingLevel.HEADING_2, spacing: { before: 260, after: 120 }, children: [new docx.TextRun({ text: metin, bold: true })] });
}

function _wcParagraf(metin) {
  return new docx.Paragraph({ spacing: { after: 160 }, children: [new docx.TextRun({ text: _pcTireVeyaDeger(metin) })] });
}

function _wcHucre(metin, baslikMi) {
  return new docx.TableCell({
    shading: baslikMi ? _wcGolge : undefined,
    children: [new docx.Paragraph({ children: [new docx.TextRun({ text: String(metin ?? '') || '-', bold: !!baslikMi, size: 17 })] })]
  });
}

function _wcTablo(basliklar, satirlar) {
  if (!satirlar.length) return new docx.Paragraph({ spacing: { after: 200 }, children: [new docx.TextRun({ text: 'Kayıt bulunmamaktadır.', italics: true })] });
  return new docx.Table({
    width: { size: 100, type: docx.WidthType.PERCENTAGE },
    rows: [
      new docx.TableRow({ children: basliklar.map(b => _wcHucre(b, true)) }),
      ...satirlar.map(satir => new docx.TableRow({ children: satir.map(h => _wcHucre(h)) }))
    ]
  });
}

async function acilDurumPlaniWordOlustur(firma) {
  const veri = acilDurumBelgeVerisiTopla(firma);
  const eksikler = acilDurumEksikVerileriTespitEt(veri);

  const dokuman = new docx.Document({
    sections: [{
      properties: {},
      children: [
        new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { after: 200 }, children: [new docx.TextRun({ text: 'ACİL DURUM PLANI', bold: true, size: 44 })] }),
        new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { after: 300 }, children: [new docx.TextRun({ text: firma.ad || '', bold: true, size: 28 })] }),
        new docx.Paragraph({
          alignment: docx.AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [new docx.TextRun({
            text: `Hazırlanma Tarihi: ${gunAyYil(veri.plan.hazirlanmaTarihi) || '-'}   |   Geçerlilik Tarihi: ${gunAyYil(veri.plan.gecerlilikTarihi) || '-'}\n` +
              `Hazırlayan: ${veri.plan.hazirlayan || '-'} (${veri.plan.hazirlayanUnvan || '-'})   |   Onaylayan: ${veri.plan.onaylayan || '-'} (${veri.plan.onaylayanUnvan || '-'})`,
            size: 20
          })]
        }),

        ...(eksikler.length ? [
          _wcBaslik('⚠ Eksik Veriler', docx.HeadingLevel.HEADING_3),
          ...eksikler.map(e => new docx.Paragraph({ bullet: { level: 0 }, children: [new docx.TextRun({ text: e })] }))
        ] : []),

        _wcBaslik('1. Tesis Bilgileri'),
        _wcTablo(['Alan', 'Değer'], [
          ['Tesis Türleri', _pcListeMetni(veri.tesisBilgi.tesisTurleri)],
          ['Adres', veri.tesisBilgi.adres],
          ['Faaliyet Konusu', veri.tesisBilgi.faaliyetKonusu],
          ['Vardiya Sayısı', veri.tesisBilgi.vardiyaSayisi],
          ['Bina Sayısı', veri.tesisBilgi.binaSayisi],
          ['Kat Sayısı', veri.tesisBilgi.katSayisi],
          ['Alt İşveren Sayısı', veri.tesisBilgi.altIsverenSayisi],
          ['Gece Çalışması', veri.tesisBilgi.geceCalismaVarMi ? 'Var' : 'Yok']
        ]),

        _wcBaslik('2. Tehlike ve Senaryo Kartları'),
        _wcTablo(['Senaryo No', 'Başlık', 'Kategori', 'Öncelik', 'Tahliye Kararı', 'Durum'],
          veri.senaryolar.map(s => [s.senaryoNo, s.baslik, s.kategori, s.oncelik, s.tahliyeKarari, s.durum])),

        _wcBaslik('3. Ekip Tanımları'),
        _wcTablo(['Ekip Türü', 'Müdahale Sınırı', 'Görev Tanımı'],
          veri.ekipTanimlari.map(e => [e.ekipTuru, e.mudahaleSiniri, e.gorevTanimi])),

        _wcBaslik('4. Acil Durum Yönetim Yapısı'),
        _wcTablo(['Pozisyon', 'Personel', 'Yedek Personel', 'Vardiya', 'Telefon'],
          veri.komutaPozisyonlari.map(p => [p.pozisyonAdi, p.personelAdi, p.yedekPersonelAdi, p.vardiya, p.telefon])),

        _wcBaslik('5. Tahliye Planları'),
        _wcTablo(['Plan No', 'Bina/Alan', 'Kat/Bölüm', 'Toplanma Alanı', 'Kaçış Yolu'],
          veri.tahliyeAlanlari.map(t => [t.tahliyeNo, t.binaAdi, t.katBolum, t.toplanmaAlani, t.kacisYolu])),

        _wcBaslik('6. Kimyasal Ekleri'),
        _wcTablo(['Kimyasal', 'İlk Yardım', 'Yangınla Mücadele', 'İzolasyon Mesafesi'],
          veri.kimyasalEkleri.map(ke => [ke.kimyasalAdiOnbellek, ke.ilkYardim, ke.yanginlaMucadele, ke.izolasyonMesafesi])),

        _wcBaslik('7. Kroki Kontrolü'),
        _wcTablo(['Bina/Alan', 'Unsur Türü', 'Mevcut mu', 'Eksiklik Notu'],
          veri.krokiKontrolleri.map(kk => [kk.binaAlan, kk.unsurTuru, kk.mevcutMu ? 'Evet' : 'Hayır', kk.eksiklikNotu])),

        _wcBaslik('8. Dış Kurumlar'),
        _wcTablo(['Tür', 'Kurum Adı', 'Telefon', 'Yetkili Kişi'],
          veri.disKurumlar.map(dk => [dk.tur, dk.ad, dk.telefon, dk.yetkiliKisi])),

        _wcBaslik('9. Öz Denetim'),
        _wcTablo(['Soru', 'Cevap', 'Not'],
          ACIL_DURUM_OZ_DENETIM_SORULARI.map(s => {
            const c = veri.ozDenetim.cevaplar[s.id] || {};
            return [s.soru, c.cevap || 'Değerlendirilmedi', c.not];
          })),

        _wcBaslik('10. Eylem Planı'),
        _wcTablo(['Eylem No', 'Kaynak', 'Eksiklik', 'Sorumlu', 'Termin', 'Öncelik', 'Durum'],
          veri.eylemPlani.map(e => [e.eylemNo, e.kaynak, e.eksiklik, e.sorumlu, gunAyYil(e.termin), e.oncelik, e.durum])),

        _wcBaslik('11. Mevzuat Uygunluk'),
        _wcTablo(['Gereklilik', 'Mevzuat/Standart', 'Uygunluk', 'Eksiklik'],
          veri.mevzuatUygunluk.map(m => [m.gereklilik, m.mevzuatStandart, m.uygunluk, m.eksiklik])),

        _wcBaslik('12. Doküman Kontrol / Revizyon Geçmişi'),
        _wcTablo(['Revizyon No', 'Tarih', 'Değişiklik Özeti', 'Hazırlayan', 'Onaylayan'],
          veri.revizyonGecmisi.map(r => [r.revizyonNo, gunAyYil(r.tarih), r.degisiklikOzeti, r.hazirlayan, r.onaylayan]))
      ]
    }]
  });

  const blob = await docx.Packer.toBlob(dokuman);
  saveAs(blob, `Acil_Durum_Plani_${(firma.ad || 'firma').replace(/[^\p{L}\p{N}]+/gu, '_')}.docx`);
}

// ==================== PPTX (pptxgenjs) ====================

async function acilDurumPlaniPptxOlustur(firma) {
  const veri = acilDurumBelgeVerisiTopla(firma);

  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';

  const BG = 'F8FAFC', TITLE = '0F172A', MUTED = '475569';
  const M = 0.8;

  let s = pptx.addSlide();
  s.background = { color: BG };
  s.addText('ACİL DURUM PLANI', { x: M, y: 2.6, w: 11.7, fontSize: 40, bold: true, color: TITLE, align: 'center' });
  s.addText(firma.ad || '', { x: M, y: 3.7, w: 11.7, fontSize: 22, color: MUTED, align: 'center' });
  s.addText(
    `Hazırlanma: ${gunAyYil(veri.plan.hazirlanmaTarihi) || '-'}   |   Geçerlilik: ${gunAyYil(veri.plan.gecerlilikTarihi) || '-'}`,
    { x: M, y: 4.5, w: 11.7, fontSize: 16, color: MUTED, align: 'center' }
  );

  const tabloSlaydi = (baslik, basliklar, satirlar, colW) => {
    const sl = pptx.addSlide();
    sl.background = { color: BG };
    sl.addText(baslik, { x: M, y: 0.5, w: 11.7, fontSize: 26, bold: true, color: TITLE });
    if (satirlar.length) {
      sl.addTable([
        basliklar.map(h => ({ text: h, options: { bold: true } })),
        ...satirlar.slice(0, 14).map(satir => satir.map(h => ({ text: String(h ?? '') || '-' })))
      ], { x: M, y: 1.3, w: 11.7, colW, fontSize: 11, autoPage: false });
      if (satirlar.length > 14) sl.addText(`+ ${satirlar.length - 14} kayıt daha (tam liste için Word/PDF çıktısına bakınız)`, { x: M, y: 6.7, w: 11.7, fontSize: 10, italic: true, color: MUTED });
    } else {
      sl.addText('Kayıt bulunmamaktadır.', { x: M, y: 1.6, fontSize: 16, color: MUTED });
    }
  };

  tabloSlaydi('TESİS ÖZETİ', ['Alan', 'Değer'], [
    ['Tesis Türleri', _pcListeMetni(veri.tesisBilgi.tesisTurleri)],
    ['Adres', _pcTireVeyaDeger(veri.tesisBilgi.adres)],
    ['Bina / Kat Sayısı', `${_pcTireVeyaDeger(veri.tesisBilgi.binaSayisi)} / ${_pcTireVeyaDeger(veri.tesisBilgi.katSayisi)}`],
    ['Vardiya Sayısı', _pcTireVeyaDeger(veri.tesisBilgi.vardiyaSayisi)]
  ], [4, 7.7]);

  tabloSlaydi('TEHLİKE & SENARYO KARTLARI', ['Senaryo No', 'Başlık', 'Kategori', 'Öncelik'],
    veri.senaryolar.map(sc => [sc.senaryoNo, sc.baslik, sc.kategori, sc.oncelik]), [2, 5, 2.7, 2]);

  tabloSlaydi('EKİP TANIMLARI & KOMUTA YAPISI', ['Pozisyon', 'Personel', 'Vardiya'],
    veri.komutaPozisyonlari.map(p => [p.pozisyonAdi, p.personelAdi, p.vardiya]), [4, 5, 2.7]);

  tabloSlaydi('TAHLİYE PLANLARI ÖZETİ', ['Plan No', 'Bina/Alan', 'Toplanma Alanı'],
    veri.tahliyeAlanlari.map(t => [t.tahliyeNo, t.binaAdi, t.toplanmaAlani]), [2, 5, 4.7]);

  tabloSlaydi('EYLEM PLANI ÖZETİ', ['Eylem No', 'Eksiklik', 'Sorumlu', 'Öncelik', 'Durum'],
    veri.eylemPlani.map(e => [e.eylemNo, e.eksiklik, e.sorumlu, e.oncelik, e.durum]), [1.5, 5, 2.5, 1.5, 1.2]);

  tabloSlaydi('MEVZUAT UYGUNLUK ÖZETİ', ['Gereklilik', 'Uygunluk'],
    veri.mevzuatUygunluk.map(m => [m.gereklilik, m.uygunluk]), [9, 2.7]);

  await pptx.writeFile({ fileName: `Acil_Durum_Plani_${(firma.ad || 'firma').replace(/[^\p{L}\p{N}]+/gu, '_')}.pptx` });
}
