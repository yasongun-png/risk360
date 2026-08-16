// İş İzin Formu PDF — eski uygulamada bu modülün hiçbir Word/PDF çıktısı
// yoktu (sadece CSV/JSON dışa aktarım); bu çıktı sıfırdan, diğer modüllerle
// aynı kalite kalıbıyla (form ayarları başlığı, box-shadow çerçeveler,
// GG.AA.YYYY tarihler) tasarlandı.

function _izKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function _izLogoHtml() {
  const firma = aktifFirmaGetir();
  const logo = firma ? firmaLogoGetir(firma.id) : '';
  return logo ? `<img src="${logo}">` : 'LOGO YOK';
}

// Diğer modüllerdeki (uygunsuzluk vb.) küçük renkli rozetlerle aynı palet —
// sade siyah-beyaz forma sadece durum/risk için amaçlı bir renk vurgusu.
const _IZ_RISK_RENK = { 'Düşük': ['#dcfce7', '#15803d'], 'Orta': ['#fef3c7', '#b45309'], 'Yüksek': ['#fee2e2', '#b91c1c'], 'Kritik': ['#fee2e2', '#7f1d1d'] };
const _IZ_DURUM_RENK = {
  'Taslak': ['#f1f5f9', '#475569'], 'Onay Bekliyor': ['#fef3c7', '#b45309'], 'Onaylandı': ['#dcfce7', '#15803d'],
  'Aktif': ['#dbeafe', '#1d4ed8'], 'Durduruldu': ['#fef3c7', '#b45309'], 'Kapalı': ['#f1f5f9', '#475569'],
  'Süresi Geçti': ['#fee2e2', '#b91c1c'], 'Reddedildi': ['#fee2e2', '#b91c1c'], 'İptal': ['#f1f5f9', '#475569']
};
function _izRozetHtml(deger, renkTablosu) {
  const [bg, fg] = renkTablosu[deger] || ['#f1f5f9', '#475569'];
  return `<span style="display:inline-block; padding:2px 9px; border-radius:8px; font-size:8.5pt; font-weight:700; background:${bg}; color:${fg};">${_izKacir(deger)}</span>`;
}

function _izTarihSaatUzunGoruntu(iso) {
  if (!iso) return '-';
  const [tarih, saat] = iso.split('T');
  return gunAyYil(tarih) + (saat ? ' ' + saat : '');
}

// Eski kayıtlardan kalma ham Firebase Storage URL'leri (artık imza/fotoğraf
// yakalama Storage kullanmıyor, bkz. aşağıdaki not) için son çare — bunları
// doğrudan <img src> olarak basmak html2canvas'ta CORS başlığı olmadığı için
// sessizce boş/şeffaf çıkabiliyordu; bu yüzden önce tamamen indirip data:
// URL'e çevrilir. fotoBuyukCoz zaten data: URL döndürdüyse burada hiçbir
// şey yapmadan olduğu gibi geri döner.
async function _izGorseliDataUrlaCevir(url) {
  if (!url || url.startsWith('data:')) return url || '';
  try {
    const yanit = await fetch(url);
    const blob = await yanit.blob();
    return await new Promise((coz, red) => {
      const okuyucu = new FileReader();
      okuyucu.onload = () => coz(okuyucu.result);
      okuyucu.onerror = red;
      okuyucu.readAsDataURL(blob);
    });
  } catch (e) {
    console.error('Görsel indirilemedi (CORS/ağ hatası olabilir):', e);
    return '';
  }
}

// İmza/fotoğraf artık Storage'a değil, diğer modüllerdeki (uygunsuzluk vb.)
// gibi fotoBuyukKaydet ile Firestore'daki ayrı "fotoğraflar" belgesine
// "fotoref:<id>" olarak yazılıyor (bkz. is-izni-bildir.html _iiImzaYukle) —
// fotoBuyukCoz bunu doğrudan kullanılabilir bir data: URL'e çözer, Storage
// ve dolayısıyla CORS hiç devreye girmez. Eski (Storage'a yüklenmiş) kayıtlar
// için fotoBuyukCoz değeri olduğu gibi döner, o durumda son çare olarak
// _izGorseliDataUrlaCevir ile indirilmeye çalışılır.
async function _izGorselCoz(referansVeyaUrl) {
  if (!referansVeyaUrl) return '';
  const cozulen = await fotoBuyukCoz(referansVeyaUrl);
  return _izGorseliDataUrlaCevir(cozulen);
}

// jsPDF'in addImage'i (2+. sayfa üst bandındaki logo için, bkz. aşağıda)
// veri türünü otomatik algılamıyor — data: URL'in MIME türünden çıkarılır.
function _izVeriUrlBicimi(dataUrl) {
  const eslesme = /^data:image\/(\w+);/i.exec(dataUrl || '');
  const tur = eslesme ? eslesme[1].toUpperCase() : 'PNG';
  return tur === 'JPG' ? 'JPEG' : tur;
}

// Barkod formundan ("Formu Tamamla" / "İmza At") atılan dijital imzalar
// (izin.imzalar.talepEden/bakim/isg) daha önce bu PDF'te hiç gösterilmiyordu
// — imza kutuları hep boştu, sadece kağıda elle imza atmak içindi. Artık
// varsa imza görseli + adı + tarihi burada basılıyor; yoksa eski boş
// "İmza:" kutusu (elle imzalama için) korunuyor. `imzaDataUrl`, PDF
// üretilmeden önce _izGorseliDataUrlaCevir ile önceden çözülmüş olmalı.
function _izImzaHucre(baslik, varsayilanAd, imzaVerisi, imzaDataUrl) {
  if (imzaVerisi && imzaDataUrl) {
    return `
      <td>
        <div class="imza-baslik">${_izKacir(baslik)}</div>
        <div>${_izKacir(imzaVerisi.ad)}</div>
        <img src="${imzaDataUrl}" style="max-width:100%; max-height:14mm; margin-top:2mm;">
        <div style="font-size:7.5pt; color:#64748b; margin-top:1mm;">${_izTarihSaatUzunGoruntu(imzaVerisi.tarih)}</div>
      </td>`;
  }
  // PC'den (çizilmiş imza olmadan) onaylanmış olabilir — bkz. service.js
  // izinOnayVer, artık onay verirken de imzalar[rol]'e ad/tarih yazıyor.
  if (imzaVerisi && imzaVerisi.ad) {
    return `
      <td>
        <div class="imza-baslik">${_izKacir(baslik)}</div>
        <div>${_izKacir(imzaVerisi.ad)}</div>
        <div style="margin-top:6mm; font-size:8.5pt; color:#15803d; font-weight:700;">✓ Onaylandı</div>
        <div style="font-size:7.5pt; color:#64748b; margin-top:1mm;">${_izTarihSaatUzunGoruntu(imzaVerisi.tarih)}</div>
      </td>`;
  }
  return `
    <td>
      <div class="imza-baslik">${_izKacir(baslik)}</div>
      <div>${_izKacir(varsayilanAd) || '-'}</div>
      <div style="margin-top:8mm;">İmza:</div>
    </td>`;
}

async function izinFormunuPdfOlustur(izinId) {
  const k = izinIdIleGetirRepo(izinId);
  if (!k) return;

  const gazVarMi = k.izinTuru === 'Kapalı Alan' || Object.values(k.gazOlcumu).some(Boolean);
  const izolasyonVarMi = IS_IZNI_LOTO_GEREKTIREN_TURLER.includes(k.izinTuru) || k.izolasyon.enerjiIzolasyonu || k.izolasyon.korlemeListesi;

  const firma = aktifFirmaGetir();
  const formAyarlari = formAyarlariGetir('is-izni');

  const [talepEdenImzaUrl, bakimImzaUrl, isgImzaUrl, fotoDataUrlleri, logoDataUrl] = await Promise.all([
    _izGorselCoz(k.imzalar && k.imzalar.talepEden && k.imzalar.talepEden.imzaUrl),
    _izGorselCoz(k.imzalar && k.imzalar.bakim && k.imzalar.bakim.imzaUrl),
    _izGorselCoz(k.imzalar && k.imzalar.isg && k.imzalar.isg.imzaUrl),
    Promise.all((k.fotograflar || []).map(f => _izGorselCoz(f.url))),
    _izGorselCoz(firma ? firmaLogoGetir(firma.id) : '')
  ]);

  const kontrolSatirlari = k.kontrolMaddeleri.map(m => `
    <tr>
      <td style="text-align:center; width:8%;">${m.isaretli ? '✓' : '☐'}</td>
      <td>${_izKacir(m.metin)}</td>
      <td>${_izKacir(m.not) || '-'}</td>
    </tr>
  `).join('');

  const onaySatirlari = k.onaycilar.length ? k.onaycilar.map(a => `
    <tr>
      <td>${_izKacir(a.ad)}</td>
      <td>${_izKacir(a.rol) || '-'}</td>
      <td>${_izKacir(a.durum)}</td>
      <td>${a.onayTarihi ? gunAyYil(a.onayTarihi.slice(0, 10)) : '-'}</td>
      <td>${_izKacir(a.not) || '-'}</td>
    </tr>
  `).join('') : '<tr><td colspan="5" style="text-align:center; color:#64748b;">Onaycı kaydı yok.</td></tr>';

  const govde = `
    <div class="iz-ustbilgi">
      <div class="iz-logo">${_izLogoHtml()}</div>
      <div class="iz-baslik">İŞ İZNİ / ÇALIŞMA İZİN BELGESİ
        <small>İzin No: ${_izKacir(k.izinNo)} — ${_izKacir(k.izinTuru)} &nbsp; ${_izRozetHtml(k.riskSeviyesi, _IZ_RISK_RENK)} ${_izRozetHtml(k.durum, _IZ_DURUM_RENK)}</small>
      </div>
      <div class="iz-fa">${formAyarlariKutusuHtml('is-izni')}</div>
    </div>

    <div class="iz-bolum">
      <h2>1. İş Bilgileri</h2>
      <table>
        <tr><td class="iz-etiket">İş Tanımı</td><td colspan="3">${_izKacir(k.isTanimi)}</td></tr>
        <tr><td class="iz-etiket">Bölüm</td><td>${_izKacir(k.bolum)}</td><td class="iz-etiket">Lokasyon / Ekipman</td><td>${_izKacir(k.lokasyon)}</td></tr>
        <tr><td class="iz-etiket">Yüklenici / Firma</td><td>${_izKacir(k.yuklenici) || '-'}</td><td class="iz-etiket">Risk Seviyesi</td><td>${_izRozetHtml(k.riskSeviyesi, _IZ_RISK_RENK)}</td></tr>
        <tr><td class="iz-etiket">Talep Eden</td><td>${_izKacir(k.talepEden)}</td><td class="iz-etiket">Saha Sorumlusu</td><td>${_izKacir(k.sahaSorumlusu)}</td></tr>
        <tr><td class="iz-etiket">Başlangıç</td><td>${_izTarihSaatUzunGoruntu(k.baslangic)}</td><td class="iz-etiket">Bitiş</td><td>${_izTarihSaatUzunGoruntu(k.bitis)}</td></tr>
        <tr><td class="iz-etiket">Çalışanlar</td><td colspan="3">${_izKacir((k.calisanlar || []).join(', ')) || '-'}</td></tr>
        <tr><td class="iz-etiket">Gerekli KKD</td><td colspan="3">${_izKacir((k.gerekliKkd || []).join(', ')) || '-'}</td></tr>
      </table>
    </div>

    ${fotoDataUrlleri.length ? `
    <div class="iz-bolum">
      <h2>Fotoğraflar</h2>
      <div class="iz-foto-grid">
        ${fotoDataUrlleri.map(u => `<div class="iz-foto-kutu">${u ? `<img src="${u}">` : ''}</div>`).join('')}
      </div>
    </div>` : ''}

    <div class="iz-bolum">
      <h2>2. Kontrol Maddeleri</h2>
      <table class="iz-tablo">
        <thead><tr><th></th><th>Madde</th><th>Not</th></tr></thead>
        <tbody>${kontrolSatirlari}</tbody>
      </table>
    </div>

    ${gazVarMi ? `
    <div class="iz-bolum">
      <h2>3. Gaz Ölçümü</h2>
      <table>
        <tr><td class="iz-etiket">Oksijen (%)</td><td>${_izKacir(k.gazOlcumu.oksijen) || '-'}</td><td class="iz-etiket">LEL (%)</td><td>${_izKacir(k.gazOlcumu.lel) || '-'}</td></tr>
        <tr><td class="iz-etiket">Toksik Gaz</td><td>${_izKacir(k.gazOlcumu.toksik) || '-'}</td><td class="iz-etiket">Ölçüm Zamanı</td><td>${_izTarihSaatUzunGoruntu(k.gazOlcumu.olcumZamani)}</td></tr>
        <tr><td class="iz-etiket">Ölçümü Yapan</td><td colspan="3">${_izKacir(k.gazOlcumu.olcenKisi) || '-'}</td></tr>
      </table>
    </div>` : ''}

    ${izolasyonVarMi ? `
    <div class="iz-bolum">
      <h2>4. İzolasyon / LOTO</h2>
      <table>
        <tr><td class="iz-etiket">LOTO Gerekli</td><td>${k.izolasyon.lotoGerekli ? 'Evet' : 'Hayır'}</td><td class="iz-etiket">LOTO Uygulandı</td><td>${k.izolasyon.lotoUygulandi ? 'Evet' : 'Hayır'}</td></tr>
        <tr><td class="iz-etiket">Enerji İzolasyonu</td><td colspan="3">${_izKacir(k.izolasyon.enerjiIzolasyonu) || '-'}</td></tr>
        <tr><td class="iz-etiket">Körleme Listesi</td><td colspan="3">${_izKacir(k.izolasyon.korlemeListesi) || '-'}</td></tr>
      </table>
    </div>` : ''}

    <div class="iz-bolum">
      <h2>5. Onaylar ve Durum</h2>
      <table class="iz-tablo">
        <thead><tr><th>Ad Soyad</th><th>Rol</th><th>Durum</th><th>Tarih</th><th>Not</th></tr></thead>
        <tbody>${onaySatirlari}</tbody>
      </table>
      <table style="margin-top:2mm;">
        <tr><td class="iz-etiket">Genel Onay Durumu</td><td>${_izKacir(k.onayDurumu)}</td><td class="iz-etiket">Durum</td><td>${_izRozetHtml(k.durum, _IZ_DURUM_RENK)}</td></tr>
        ${k.kapanisTarihi ? `<tr><td class="iz-etiket">Kapanış Tarihi</td><td>${_izTarihSaatUzunGoruntu(k.kapanisTarihi)}</td><td class="iz-etiket">Kapanış Notu</td><td>${_izKacir(k.kapanisNotu) || '-'}</td></tr>` : ''}
      </table>
    </div>

    <div class="iz-beyan">
      Bu iş izni belgesinde belirtilen tüm iş sağlığı ve güvenliği önlemlerinin alındığını, ilgili çalışanların
      işin riskleri konusunda bilgilendirildiğini ve gerekli kişisel koruyucu donanımların temin edildiğini
      aşağıdaki imza sahipleri beyan eder.
    </div>

    <table class="iz-imza">
      <tr>
        ${_izImzaHucre('Talep Eden', k.talepEden, k.imzalar && k.imzalar.talepEden, talepEdenImzaUrl)}
        ${_izImzaHucre('Bakım Personeli', null, k.imzalar && k.imzalar.bakim, bakimImzaUrl)}
        ${_izImzaHucre('İSG', null, k.imzalar && k.imzalar.isg, isgImzaUrl)}
      </tr>
    </table>

    <div class="iz-altbilgi">🌱 Çevre sorumluluğunuzu düşünerek lütfen gerekmedikçe çıktı almayınız.</div>
  `;

  const html = `
    <div id="izPdfKok">
      <style>
        #izPdfKok{ font-family: Arial, Helvetica, sans-serif; color:#111827; background:#fff; font-size:9.5pt; }
        #izPdfKok *{ box-sizing:border-box; }

        #izPdfKok .fa-kutu{ border-collapse:collapse; font-size:6.8pt; width:100%; table-layout:fixed; }
        #izPdfKok .fa-kutu td{ padding:1.5px 4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        #izPdfKok .fa-kutu td:first-child{ font-weight:700; background:#f1f5f9; width:48%; }

        #izPdfKok .iz-ustbilgi{ display:flex; align-items:stretch; border:2px solid #111827; margin-bottom:4mm; }
        #izPdfKok .iz-ustbilgi > div{ padding:3mm; display:flex; align-items:center; justify-content:center; border-right:2px solid #111827; }
        #izPdfKok .iz-ustbilgi > div:last-child{ border-right:none; }
        #izPdfKok .iz-logo{ flex:0 0 28mm; width:28mm; text-align:center; color:#94a3b8; font-size:8pt; font-weight:700; }
        #izPdfKok .iz-logo img{ max-width:24mm; max-height:16mm; }
        #izPdfKok .iz-baslik{ flex:1 1 auto; min-width:0; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; font-size:12.5pt; font-weight:700; color:#111827; line-height:1.3; }
        #izPdfKok .iz-baslik small{ display:block; font-size:8pt; font-weight:400; color:#374151; margin-top:1.5mm; }
        #izPdfKok .iz-fa{ flex:0 0 42mm; width:42mm; padding:2mm !important; align-items:stretch !important; }

        #izPdfKok .iz-bolum{ margin-bottom:4mm; border:1px solid #111827; page-break-inside:avoid; break-inside:avoid; }
        #izPdfKok .iz-bolum h2{ margin:0; background:#fff; color:#111827; font-size:9.5pt; padding:2mm 3mm; text-transform:uppercase; border-bottom:1px solid #111827; }
        #izPdfKok .iz-bolum > table{ width:100%; border-collapse:collapse; }
        #izPdfKok .iz-bolum > table tr{ page-break-inside:avoid; break-inside:avoid; }
        #izPdfKok .iz-bolum > table td{ border:1px solid #cbd5e1; padding:2.3mm 3mm; vertical-align:top; font-size:9pt; }
        #izPdfKok .iz-etiket{ font-weight:700; width:18%; background:#f8fafc; }

        #izPdfKok table.iz-tablo{ width:100%; border-collapse:collapse; }
        #izPdfKok table.iz-tablo th{ background:#e5e7eb; color:#111827; font-size:8pt; padding:3px 5px; border:1px solid #94a3b8; text-transform:uppercase; }
        #izPdfKok table.iz-tablo td{ font-size:8.8pt; padding:3px 5px; border:1px solid #cbd5e1; }
        #izPdfKok table.iz-tablo tr{ page-break-inside:avoid; break-inside:avoid; }

        #izPdfKok .iz-foto-grid{ display:flex; gap:3mm; flex-wrap:wrap; padding:3mm; }
        #izPdfKok .iz-foto-kutu{ width:45mm; height:34mm; border:1px solid #cbd5e1; overflow:hidden; display:flex; align-items:center; justify-content:center; background:#f3f4f6; }
        #izPdfKok .iz-foto-kutu img{ max-width:100%; max-height:100%; object-fit:contain; }

        #izPdfKok .iz-beyan{ font-size:8.3pt; color:#374151; line-height:1.5; border-top:1px solid #cbd5e1; padding-top:3mm; margin-top:5mm; }

        #izPdfKok table.iz-imza{ width:100%; border-collapse:collapse; margin-top:3mm; page-break-inside:avoid; break-inside:avoid; }
        #izPdfKok table.iz-imza tr{ page-break-inside:avoid; break-inside:avoid; }
        #izPdfKok table.iz-imza td{ border:1px solid #cbd5e1; padding:4mm; width:33.33%; height:24mm; vertical-align:top; font-size:9pt; text-align:center; }
        #izPdfKok .imza-baslik{ font-weight:700; color:#111827; margin-bottom:2mm; text-transform:uppercase; }

        #izPdfKok .iz-altbilgi{ text-align:center; font-size:7.5pt; color:#64748b; margin-top:5mm; }
      </style>
      ${govde}
    </div>
  `;

  const mount = document.getElementById('yazdirmaAlani');
  mount.innerHTML = html;
  mount.style.display = 'block';

  // Üst kenar boşluğu, 2. ve sonraki sayfalarda çizilecek tekrar eden üst
  // bant (logo + başlık + kalite no tablosu) için ayrılıyor — kullanıcı
  // isteği: "ikinci sayfada da 1. sayfa üstündeki başlık logo kalite no
  // tablosu olsun". 1. sayfada bu boşluk zaten gerçek .iz-ustbilgi HTML
  // bandını içeriyor, sadece biraz aşağı kayar (aynı desen modules/olay-kaza
  // /cikti.js'te de kullanılıyor). Toplam sayfa sayısı içerik uzunluğuna göre
  // değiştiğinden "Sayfa X / Y" damgası da PDF üretildikten SONRA jsPDF
  // nesnesi üzerinden basılıyor.
  const ustBoslukMm = 24;
  const worker = html2pdf()
    .set({
      margin: [ustBoslukMm, 8, 12, 8],
      filename: `Is_Izni_${k.izinNo}.pdf`,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollX: 0, scrollY: 0 },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4', compress: true },
      pagebreak: { mode: ['css', 'legacy'] }
    })
    .from(mount)
    .toPdf();

  const pdf = await worker.get('pdf');
  const toplamSayfa = pdf.internal.getNumberOfPages();
  const genislik = pdf.internal.pageSize.getWidth();
  const yukseklik = pdf.internal.pageSize.getHeight();
  for (let i = 1; i <= toplamSayfa; i++) {
    pdf.setPage(i);
    if (i > 1) {
      pdf.setDrawColor(17, 24, 39);
      pdf.setLineWidth(0.4);
      pdf.rect(4, 3, genislik - 8, ustBoslukMm - 6);
      if (logoDataUrl) {
        try { pdf.addImage(logoDataUrl, _izVeriUrlBicimi(logoDataUrl), 6, 5, 18, ustBoslukMm - 10); } catch (e) { console.warn('Logo PDF başlığına eklenemedi:', e); }
      }
      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(10.5);
      pdf.setTextColor(17, 24, 39);
      pdf.text('İŞ İZNİ / ÇALIŞMA İZİN BELGESİ', genislik / 2, 10, { align: 'center' });
      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(55, 65, 81);
      pdf.text(`İzin No: ${k.izinNo} — ${k.izinTuru}`, genislik / 2, 15, { align: 'center' });
      pdf.setFontSize(6.3);
      pdf.setTextColor(17, 24, 39);
      const saX = genislik - 46;
      pdf.text('Doküman No: ' + (formAyarlari.dokumanNo || '-'), saX, 8);
      pdf.text('Sürüm No: ' + (formAyarlari.surumNo || '-'), saX, 12);
      pdf.text('Sürüm Tarihi: ' + (formAyarlari.surumTarihi || '-'), saX, 16);
    }
    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Sayfa ${i} / ${toplamSayfa}`, genislik / 2, yukseklik - 5, { align: 'center' });
  }
  await worker.save();

  mount.innerHTML = '';
  mount.style.display = 'none';
}
