// Olay / Kaza — Olay Araştırma Raporu PDF/Word çıktıları. Kullanıcının
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

const _OK_PDF_STIL = `
  #okKazaRaporu{ font-family:"Segoe UI", Arial, sans-serif; color:#111827; background:#fff; width:210mm; margin:0 auto; padding:10mm 12mm 12mm; }
  #okKazaRaporu *{ box-sizing:border-box; }

  #okKazaRaporu .fa-kutu{ border-collapse:collapse; font-size:6.8pt; width:100%; table-layout:fixed; }
  #okKazaRaporu .fa-kutu td{ padding:1.5px 4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  #okKazaRaporu .fa-kutu td:first-child{ font-weight:700; background:#fff; width:48%; }

  #okKazaRaporu .ok-form-ustbilgi{ display:flex; align-items:stretch; border:2px solid #111827; margin-bottom:4mm; background:#fff; }
  #okKazaRaporu .ok-form-ustbilgi > div{ padding:3mm; display:flex; align-items:center; justify-content:center; border-right:2px solid #111827; background:#fff; }
  #okKazaRaporu .ok-form-ustbilgi > div:last-child{ border-right:none; }
  #okKazaRaporu .ok-form-logo{ flex:0 0 28mm; width:28mm; text-align:center; color:#111827; font-size:8pt; font-weight:700; }
  #okKazaRaporu .ok-form-logo img{ max-width:24mm; max-height:16mm; }
  #okKazaRaporu .ok-form-baslik{ flex:1 1 auto; min-width:0; text-align:center; font-size:13pt; font-weight:900; color:#111827; line-height:1.3; }
  #okKazaRaporu .ok-form-fa{ flex:0 0 42mm; width:42mm; padding:2mm !important; align-items:stretch !important; }

  #okKazaRaporu .ok-bolum{ page-break-inside:avoid; }
  #okKazaRaporu .ok-bolum-baslik{ margin:4mm 0 1.5mm; color:#111827; font-size:12.5px; font-weight:900; }
  #okKazaRaporu .ok-alt-baslik{ margin:2.5mm 0 1mm; color:#111827; font-size:10.8px; font-weight:800; }

  #okKazaRaporu table.ok-tablo{ width:100%; border-collapse:collapse; border:1px solid #111827; table-layout:fixed; font-size:10px; line-height:1.3; margin-bottom:2mm; page-break-inside:avoid; }
  #okKazaRaporu table.ok-tablo th, #okKazaRaporu table.ok-tablo td{ border:1px solid #111827; padding:1.8mm 2.4mm; vertical-align:top; color:#111827; overflow-wrap:break-word; }
  #okKazaRaporu table.ok-tablo .lbl{ width:20%; background:#f1f5f9; font-weight:700; }
  #okKazaRaporu table.ok-tablo .val{ width:30%; }
  #okKazaRaporu table.ok-tablo thead th{ background:#e5e7eb; font-weight:800; }

  #okKazaRaporu .ok-metin-kutu{ border:1px solid #111827; padding:2.4mm 2.8mm; font-size:10.3px; line-height:1.5; white-space:pre-wrap; color:#111827; page-break-inside:avoid; margin-bottom:2mm; }

  #okKazaRaporu .ok-tanik-kutu{ border:1px solid #111827; padding:2.4mm 3mm; margin-bottom:2.5mm; page-break-inside:avoid; }
  #okKazaRaporu .ok-tanik-kutu b{ display:block; font-size:10.3px; margin-bottom:1mm; }
  #okKazaRaporu .ok-tanik-kutu span{ font-size:10px; font-style:italic; color:#111827; }

  #okKazaRaporu .ok-mevzuat-liste{ margin:0 0 2mm; padding-left:5mm; font-size:10.3px; line-height:1.55; }
  #okKazaRaporu .ok-mevzuat-liste li{ page-break-inside:avoid; break-inside:avoid; margin-bottom:0.8mm; }

  #okKazaRaporu p{ page-break-inside:avoid; break-inside:avoid; orphans:3; widows:3; }
  #okKazaRaporu .ok-alt-baslik{ page-break-after:avoid; break-after:avoid; }

  #okKazaRaporu .ok-imza-satir{ margin-top:8mm; display:grid; grid-template-columns:repeat(3,1fr); gap:8mm; font-size:10px; page-break-inside:avoid; }
  #okKazaRaporu .ok-imza-kutu{ min-height:18mm; padding-top:7mm; border-top:1px solid #111827; text-align:center; }
  #okKazaRaporu .ok-imza-kutu b{ display:block; margin-bottom:1mm; color:#111827; }
  #okKazaRaporu .ok-imza-kutu span{ color:#4b5563; }
`;

function _okAlanSatiri(etiket1, deger1, etiket2, deger2) {
  return `<tr>
    <td class="lbl">${_okKacir(etiket1)}</td><td class="val">${_okKacir(deger1) || '-'}</td>
    <td class="lbl">${_okKacir(etiket2)}</td><td class="val">${_okKacir(deger2) || '-'}</td>
  </tr>`;
}

function _okAlanSatiriTek(etiket, deger) {
  return `<tr><td class="lbl">${_okKacir(etiket)}</td><td class="val" colspan="3">${_okKacir(deger) || '-'}</td></tr>`;
}

// Bölüm içeriği boşsa (hiçbir veri girilmemişse) başlığıyla birlikte HİÇ
// render edilmez; doluysa numarası, önündeki dolu bölümlerin sayısına göre
// otomatik verilir (boş bölüm yüzünden numarada atlama olmaz).
function _okBolumleriBirlestir(bolumler) {
  let sira = 0;
  return bolumler
    .filter(b => b.doluMu)
    .map(b => { sira++; return `<div class="ok-bolum"><div class="ok-bolum-baslik">${sira}. ${_okKacir(b.baslik)}</div>${b.html}</div>`; })
    .join('');
}

async function kazaRaporuPdfOlustur(id) {
  const k = olayKaydiIdIleGetirRepo(id);
  if (!k) return;

  const firma = aktifFirmaGetir();
  const bugun = gunAyYil(bugunIso());
  const fkRP = fineKinneyPuaniHesapla(k);
  const kidem = _okKidemMetni(k.iseGirisTarihi, k.kazaTarihi);
  const gorevKidem = [k.gorev, kidem].filter(Boolean).join(' – ');
  const magdur = [k.adSoyad, k.magdurYasi != null ? k.magdurYasi + ' yaş' : ''].filter(Boolean).join(', ');

  const kronoloji = Array.isArray(k.kronoloji) ? k.kronoloji.filter(s => s.gelisme) : [];
  const kronolojiHtml = `
    <table class="ok-tablo">
      <thead><tr><th style="width:16%;">Saat</th><th>Gelişme</th></tr></thead>
      <tbody>${kronoloji.map(s => `<tr><td>${_okKacir(s.saat) || '-'}</td><td>${_okKacir(s.gelisme)}</td></tr>`).join('')}</tbody>
    </table>`;

  const tanikIfadeleri = Array.isArray(k.tanikIfadeleri) ? k.tanikIfadeleri.filter(t => t.adSoyad || t.ifade) : [];
  const tanikHtml = tanikIfadeleri.map((t, i) => `
    <div class="ok-tanik-kutu">
      <b>Tanık ${i + 1} – ${_okKacir(t.adSoyad)}${t.unvan ? ', ' + _okKacir(t.unvan) : ''}</b>
      <span>"${_okKacir(t.ifade)}"</span>
    </div>
  `).join('');

  const analiz5n1kDoluMu = [k.analizNe, k.analizNerede, k.analizNeZaman, k.analizKim, k.analizNasil, k.analizNeden].some(Boolean);
  const analiz5n1kHtml = `
    <table class="ok-tablo">
      ${_okAlanSatiriTek('Ne', k.analizNe)}
      ${_okAlanSatiriTek('Nerede', k.analizNerede)}
      ${_okAlanSatiriTek('Ne Zaman', k.analizNeZaman)}
      ${_okAlanSatiriTek('Kim', k.analizKim)}
      ${_okAlanSatiriTek('Nasıl', k.analizNasil)}
      ${_okAlanSatiriTek('Neden', k.analizNeden)}
    </table>`;

  const mevzuatSatirlari = (k.ilgiliMevzuat || '').split('\n').map(s => s.trim()).filter(Boolean);
  const mevzuatHtml = `<ul class="ok-mevzuat-liste">${mevzuatSatirlari.map(m => `<li>${_okKacir(m)}</li>`).join('')}</ul>`;

  const aksiyonlar = Array.isArray(k.aksiyonlar) ? k.aksiyonlar.filter(a => a.baslik || a.duzelticiFaaliyet) : [];
  const aksiyonHtml = `
    <table class="ok-tablo">
      <thead><tr><th style="width:22%;">Uygunsuzluk Tanımı</th><th style="width:30%;">Düzeltici Faaliyet</th><th style="width:16%;">Sorumlu</th><th style="width:14%;">Termin</th><th style="width:18%;">Durum</th></tr></thead>
      <tbody>${aksiyonlar.map(a => `
        <tr>
          <td>${_okKacir(a.baslik)}</td>
          <td>${_okKacir(a.duzelticiFaaliyet)}</td>
          <td>${_okKacir(a.sorumlu)}</td>
          <td>${_okKacir(gunAyYil(a.termin)) || '-'}</td>
          <td>${_okKacir(a.durum)}</td>
        </tr>
      `).join('')}</tbody>
    </table>`;

  const bolumler = [
    { baslik: 'Genel Bilgiler', doluMu: true, html: `
      <table class="ok-tablo">
        ${_okAlanSatiriTek('İşyeri', firma ? firma.ad : '')}
        ${_okAlanSatiri('Kaza Yeri', k.kazaYeri, 'Kaza Tarihi / Saati', [gunAyYil(k.kazaTarihi), k.kazaSaati].filter(Boolean).join(' – '))}
        ${_okAlanSatiri('Mağdur', magdur, 'Görevi / Kıdemi', gorevKidem)}
        ${_okAlanSatiri('Tehlikeli Madde', k.tehlikeliMadde, 'Tanık Sayısı', k.tanikSayisi ?? '')}
        ${(OLAY_KISI_ZORUNLU_TIPLERI.includes(k.olayTipi) || k.yaralanmaTuru || k.yaralananUzuv) ? _okAlanSatiri('Yaralanma Türü', k.yaralanmaTuru, 'Yaralanan Bölge', k.yaralananUzuv) : ''}
        ${_okAlanSatiri('Kayıp Gün', k.kayipGun ?? '', 'DART Gün', k.dartGun ?? '')}
        ${(k.fkO && k.fkF && k.fkS) ? `<tr><td class="lbl">Fine-Kinney (O/F/Ş/RP)</td><td class="val" colspan="3">O: ${_okKacir(k.fkO)} &nbsp; F: ${_okKacir(k.fkF)} &nbsp; Ş: ${_okKacir(k.fkS)} &nbsp; RP: ${_okKacir(_okRpRozet(fkRP))}</td></tr>` : ''}
      </table>` },
    { baslik: 'Olay Özeti', doluMu: true, html: `
      <div class="ok-metin-kutu">${_okKacir(k.aciklama)}</div>
      ${k.potansiyelSonuc ? `<div class="ok-alt-baslik">Potansiyel Sonuç</div><div class="ok-metin-kutu">${_okKacir(k.potansiyelSonuc)}</div>` : ''}` },
    { baslik: 'Olay Kronolojisi', doluMu: kronoloji.length > 0, html: kronolojiHtml },
    { baslik: 'Tanık İfadeleri', doluMu: tanikIfadeleri.length > 0, html: tanikHtml },
    { baslik: '5N1K Analizi', doluMu: analiz5n1kDoluMu, html: analiz5n1kHtml },
    { baslik: 'İlgili Mevzuat', doluMu: mevzuatSatirlari.length > 0, html: mevzuatHtml },
    { baslik: 'Düzeltici ve Önleyici Faaliyetler (Uygunsuzluk)', doluMu: aksiyonlar.length > 0, html: aksiyonHtml },
    { baslik: 'Sonuç ve Değerlendirme', doluMu: !!k.sonucDegerlendirme, html: `<div class="ok-metin-kutu">${_okKacir(k.sonucDegerlendirme)}</div>` }
  ];

  const html = `
  <div id="okKazaRaporu">
    <style>${_OK_PDF_STIL}</style>

    <div class="ok-form-ustbilgi">
      <div class="ok-form-logo">${firma && firmaLogoGetir(firma.id) ? `<img src="${firmaLogoGetir(firma.id)}">` : 'LOGO YOK'}</div>
      <div class="ok-form-baslik">OLAY ARAŞTIRMA RAPORU</div>
      <div class="ok-form-fa">${formAyarlariKutusuHtml('olay-kaza')}</div>
    </div>

    <table class="ok-tablo">
      ${_okAlanSatiri('Rapor No', k.kayitNo, 'Rapor Tarihi', bugun)}
      ${_okAlanSatiriTek('Hazırlayan', [k.hazirlayanAdi, k.hazirlayanUnvan].filter(Boolean).join(' – '))}
      ${_okAlanSatiri('Kaza Sınıfı', _okKazaSinifiMetni(k), 'Soruşturma Süresi', [gunAyYil(k.sorusturmaBaslangic), gunAyYil(k.sorusturmaBitis)].filter(Boolean).join(' – '))}
    </table>

    ${_okBolumleriBirlestir(bolumler)}

    <div class="ok-imza-satir">
      <div class="ok-imza-kutu"><b>${_okKacir(k.hazirlayanAdi) || '-'}</b><span>${_okKacir(k.hazirlayanUnvan) || 'Hazırlayan'}</span></div>
      <div class="ok-imza-kutu"><b>${_okKacir(k.ekipUyesiAdi) || '-'}</b><span>${_okKacir(k.ekipUyesiUnvan) || 'Soruşturma Ekibi Üyesi'}</span></div>
      <div class="ok-imza-kutu"><b>${_okKacir(k.onaylayanAdi) || '-'}</b><span>${_okKacir(k.onaylayanUnvan) || 'Onaylayan'}</span></div>
    </div>
  </div>
  `;

  const mount = document.getElementById('yazdirmaAlani');
  mount.innerHTML = html;
  mount.style.display = 'block';

  // Üst kenar boşluğu, 2. ve sonraki sayfalarda çizilecek üst bant için
  // ayrılıyor (bkz. aşağıdaki jsPDF son-işleme döngüsü) — 1. sayfada bu boşluk
  // zaten gerçek ok-form-ustbilgi HTML bandını içeriyor, sadece biraz aşağı kayar.
  const ustBoslukMm = 14;
  const worker = html2pdf()
    .set({
      margin: [ustBoslukMm, 0, 8, 0],
      filename: `Kaza_Raporu_${(k.kayitNo || id).replace(/[\\/]/g, '-')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollX: 0, scrollY: 0 },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4', compress: true },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', 'li', 'p', 'table.ok-tablo', '.ok-metin-kutu', '.ok-tanik-kutu', '.ok-bolum', '.ok-imza-satir'] }
    })
    .from(mount)
    .toPdf();

  // Her sayfaya "Sayfa X / N" damgası — kullanıcı isteği: "ilk sayfada sayfa
  // sayısı 1/2 ikinci sayfada 2/2 ... 3 sayfaysa 1/3 2/3 3/3". Toplam sayfa
  // sayısı içerik uzunluğuna göre değiştiğinden bu, PDF üretildikten SONRA
  // jsPDF nesnesi üzerinden (bkz. risk modülündeki aynı desen) yapılır.
  // 2. sayfadan itibaren ayrıca üst bant çizilir (kullanıcı isteği: "2. ve 3.
  // sayfa olursa orada da üst bant olacak") — 1. sayfa zaten gerçek HTML
  // başlık bandını (ok-form-ustbilgi) içerdiğinden tekrar çizilmez; bant,
  // margin.top'ta yukarıda ayrılan boş alana (0–14mm) çizilir, içeriğin
  // üzerine binmez.
  const pdf = await worker.get('pdf');
  const toplamSayfa = pdf.internal.getNumberOfPages();
  const genislik = pdf.internal.pageSize.getWidth();
  const yukseklik = pdf.internal.pageSize.getHeight();
  for (let i = 1; i <= toplamSayfa; i++) {
    pdf.setPage(i);
    if (i > 1) {
      pdf.setDrawColor(17, 24, 39);
      pdf.setLineWidth(0.3);
      pdf.rect(0, 0, genislik, ustBoslukMm);
      pdf.setFontSize(10);
      pdf.setTextColor(17, 24, 39);
      pdf.setFont(undefined, 'bold');
      pdf.text('OLAY ARAŞTIRMA RAPORU', genislik / 2, ustBoslukMm / 2 - 1, { align: 'center' });
      pdf.setFontSize(8);
      pdf.setFont(undefined, 'normal');
      pdf.text(k.kayitNo || '', 4, ustBoslukMm / 2 + 3.5);
      pdf.text(`${i}/${toplamSayfa}`, genislik - 4, ustBoslukMm / 2 + 3.5, { align: 'right' });
    }
    pdf.setFontSize(8);
    pdf.setTextColor(100);
    pdf.text(`Sayfa ${i} / ${toplamSayfa}`, genislik / 2, yukseklik - 5, { align: 'center' });
  }
  await worker.save();

  mount.innerHTML = '';
  mount.style.display = 'none';
}

// ==================== OLAY ARAŞTIRMA RAPORU (WORD) ====================
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
    { baslik: 'Düzeltici ve Önleyici Faaliyetler (Uygunsuzluk)', doluMu: aksiyonlar.length > 0, docx: aksiyonDocx },
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
        new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: k.onaylayanUnvan || 'Onaylayan', size: 18 })] })
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
