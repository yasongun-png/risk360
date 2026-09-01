// Periyodik Kontrol Geçmişi PDF — diğer modüllerle (KKD, İş İzni, Kimyasal)
// aynı kalite kalıbı: sağ üstte Form Ayarları (Doküman No/Sürüm Tarihi/Sürüm
// No/Sayfa Sayısı) kutusu, box-shadow çerçeveler, GG.AA.YYYY tarihler.

function _pkKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function _pkLogoHtml() {
  const firma = aktifFirmaGetir();
  const logo = firma ? firmaLogoGetir(firma.id) : '';
  return logo ? `<img src="${logo}">` : 'LOGO YOK';
}

async function periyodikEkipmanGecmisiniYazdir(ekipmanId) {
  const ekipman = periyodikEkipmanIdIleGetirRepo(ekipmanId);
  if (!ekipman) return;

  const kontroller = periyodikKontrolleriGetir('', { ekipmanId }).sort((a, b) => (b.kontrolTarihi || '').localeCompare(a.kontrolTarihi || ''));

  const kontrolSatirlari = kontroller.map(k => `
    <tr>
      <td>${_pkKacir(gunAyYil(k.kontrolTarihi))}</td>
      <td>${_pkKacir(k.kontrolTuru)}</td>
      <td>${_pkKacir(k.raporNo) || '-'}</td>
      <td>${_pkKacir(k.firma)}</td>
      <td>${_pkKacir(k.uzman) || '-'}</td>
      <td>${_pkKacir(k.sonuc)}</td>
      <td>${_pkKacir(k.aciklama) || '-'}</td>
    </tr>
  `).join('') || '<tr><td colspan="7" style="text-align:center; color:#64748b;">Kontrol kaydı bulunmamaktadır.</td></tr>';

  const govde = `
    <div class="pk-ustbilgi">
      <div class="pk-logo">${_pkLogoHtml()}</div>
      <div class="pk-baslik">PERİYODİK KONTROL GEÇMİŞİ
        <small>Ekipman No: ${_pkKacir(ekipman.ekipmanNo)} — ${_pkKacir(ekipman.ad)}</small>
      </div>
      <div class="pk-fa">${formAyarlariKutusuHtml('periyodik-kontrol', null, false, null, true)}</div>
    </div>

    <div class="pk-bolum">
      <h2>1. Ekipman Bilgileri</h2>
      <table>
        <tr><td class="pk-etiket">Ekipman Adı</td><td>${_pkKacir(ekipman.ad)}</td><td class="pk-etiket">Demirbaş No</td><td>${_pkKacir(ekipman.demirbasNo) || '-'}</td></tr>
        <tr><td class="pk-etiket">Kategori</td><td>${_pkKacir(ekipman.kategori)}</td><td class="pk-etiket">Marka / Model</td><td>${_pkKacir([ekipman.marka, ekipman.model].filter(Boolean).join(' / ')) || '-'}</td></tr>
        <tr><td class="pk-etiket">Bölüm</td><td>${_pkKacir(ekipman.bolum)}</td><td class="pk-etiket">Lokasyon</td><td>${_pkKacir(ekipman.lokasyon) || '-'}</td></tr>
        <tr><td class="pk-etiket">Periyodik Kontrol Süresi</td><td>${ekipman.periyotAy} ay</td><td class="pk-etiket">Risk Seviyesi</td><td>${_pkKacir(ekipman.riskSeviyesi)}</td></tr>
        <tr><td class="pk-etiket">Son Kontrol Tarihi</td><td>${_pkKacir(gunAyYil(ekipman.sonKontrolTarihi)) || '-'}</td><td class="pk-etiket">Sonraki Kontrol Tarihi</td><td>${_pkKacir(gunAyYil(ekipman.sonrakiKontrolTarihi)) || '-'}</td></tr>
      </table>
    </div>

    <div class="pk-bolum">
      <h2>2. Kontrol Geçmişi</h2>
      <table class="pk-tablo">
        <thead><tr><th>Tarih</th><th>Tür</th><th>Rapor No</th><th>Firma</th><th>Uzman</th><th>Sonuç</th><th>Açıklama</th></tr></thead>
        <tbody>${kontrolSatirlari}</tbody>
      </table>
    </div>

    <div class="pk-altbilgi">🌱 Çevre sorumluluğunuzu düşünerek lütfen gerekmedikçe çıktı almayınız.</div>
  `;

  const html = `
    <div id="pkPdfKok">
      <style>
        #pkPdfKok{ font-family: Arial, Helvetica, sans-serif; color:#111827; background:#fff; font-size:9.5pt; }
        #pkPdfKok *{ box-sizing:border-box; }

        #pkPdfKok .fa-kutu{ border-collapse:collapse; font-size:6.8pt; width:100%; table-layout:fixed; }
        #pkPdfKok .fa-kutu td{ padding:1.5px 4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        #pkPdfKok .fa-kutu td:first-child{ font-weight:700; background:#f1f5f9; width:48%; }

        #pkPdfKok .pk-ustbilgi{ display:flex; align-items:stretch; box-shadow: inset 0 0 0 2px #0b2c52; margin-bottom:4mm; }
        #pkPdfKok .pk-ustbilgi > div{ padding:3mm; display:flex; align-items:center; justify-content:center; box-shadow: inset -2px 0 0 0 #0b2c52; }
        #pkPdfKok .pk-ustbilgi > div:last-child{ box-shadow:none; }
        #pkPdfKok .pk-logo{ flex:0 0 28mm; width:28mm; text-align:center; color:#94a3b8; font-size:8pt; font-weight:700; }
        #pkPdfKok .pk-logo img{ max-width:24mm; max-height:16mm; }
        #pkPdfKok .pk-baslik{ flex:1 1 auto; min-width:0; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; font-size:12.5pt; font-weight:700; color:#0b2c52; line-height:1.3; }
        #pkPdfKok .pk-baslik small{ display:block; font-size:8pt; font-weight:400; color:#374151; margin-top:1.5mm; }
        #pkPdfKok .pk-fa{ flex:0 0 42mm; width:42mm; padding:2mm !important; align-items:stretch !important; }

        #pkPdfKok .pk-bolum{ margin-bottom:4mm; box-shadow: inset 0 0 0 1px #94a3b8; }
        #pkPdfKok .pk-bolum h2{ margin:0; background:#0b2c52; color:#fff; font-size:9.5pt; padding:2mm 3mm; text-transform:uppercase; }
        #pkPdfKok .pk-bolum > table{ width:100%; border-collapse:collapse; }
        #pkPdfKok .pk-bolum > table tr{ page-break-inside:avoid; break-inside:avoid; }
        #pkPdfKok .pk-bolum > table td{ border:1px solid #cbd5e1; padding:2.3mm 3mm; vertical-align:top; font-size:9pt; }
        #pkPdfKok .pk-etiket{ font-weight:700; width:20%; background:#f8fafc; }

        #pkPdfKok table.pk-tablo{ width:100%; border-collapse:collapse; }
        #pkPdfKok table.pk-tablo th{ background:#0b2c52; color:#fff; font-size:8pt; padding:3px 5px; border:1px solid #0b2c52; text-transform:uppercase; }
        #pkPdfKok table.pk-tablo td{ font-size:8.5pt; padding:3px 5px; border:1px solid #cbd5e1; }
        #pkPdfKok table.pk-tablo tr{ page-break-inside:avoid; break-inside:avoid; }

        #pkPdfKok .pk-altbilgi{ text-align:center; font-size:7.5pt; color:#64748b; margin-top:5mm; }
      </style>
      ${govde}
    </div>
  `;

  const mount = document.getElementById('yazdirmaAlani');
  mount.innerHTML = html;
  mount.style.display = 'block';

  const worker = html2pdf()
    .set({
      margin: [8, 8, 8, 8],
      filename: `Periyodik_Kontrol_${ekipman.ekipmanNo}.pdf`,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollX: 0, scrollY: 0 },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4', compress: true },
      pagebreak: { mode: ['css', 'legacy'] }
    })
    .from(mount)
    .toPdf();

  // Kullanıcı isteği: "eğer 1 sayfaysa 1/1, iki sayfaysa 1/2-2/2 ... böyle
  // devam etmeli" — Form Ayarları kutusundaki sabit "Sayfa Sayısı" içerik
  // uzunluğuna göre değişen gerçek sayfa sayısını yansıtmadığından, PDF
  // üretildikten SONRA (bkz. modules/olay-kaza/cikti.js aynı desen) her
  // sayfanın altına gerçek "Sayfa X / N" damgası basılır.
  const pdf = await worker.get('pdf');
  const toplamSayfa = pdf.internal.getNumberOfPages();
  const genislik = pdf.internal.pageSize.getWidth();
  const yukseklik = pdf.internal.pageSize.getHeight();
  for (let i = 1; i <= toplamSayfa; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(100);
    pdf.text(`Sayfa ${i} / ${toplamSayfa}`, genislik / 2, yukseklik - 5, { align: 'center' });
  }
  await worker.save();

  mount.innerHTML = '';
  mount.style.display = 'none';
}
