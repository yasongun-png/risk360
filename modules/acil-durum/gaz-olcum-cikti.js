// Gaz Ölçüm Cihazı Kalibrasyon Geçmişi PDF — diğer modüllerle aynı kalite
// kalıbı: sağ üstte Form Ayarları kutusu, box-shadow çerçeveler, GG.AA.YYYY
// tarihler (bkz. modules/periyodik-kontrol/cikti.js — birebir aynı desen).

function _gocKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function _gocLogoHtml() {
  const firma = aktifFirmaGetir();
  const logo = firma ? firmaLogoGetir(firma.id) : '';
  return logo ? `<img src="${logo}">` : 'LOGO YOK';
}

async function gocCihazGecmisiniYazdir(cihazId) {
  const cihaz = gocCihazIdIleGetirRepo(cihazId);
  if (!cihaz) return;

  const kayitlar = gocCihazinKalibrasyonlariGetirRepo(cihazId).sort((a, b) => (b.kalibrasyonTarihi || '').localeCompare(a.kalibrasyonTarihi || ''));

  const kayitSatirlari = kayitlar.map(k => `
    <tr>
      <td>${_gocKacir(gunAyYil(k.kalibrasyonTarihi))}</td>
      <td>${_gocKacir(k.tur)}</td>
      <td>${_gocKacir(k.raporNo) || '-'}</td>
      <td>${_gocKacir(k.firma)}</td>
      <td>${_gocKacir(k.uzman) || '-'}</td>
      <td>${_gocKacir(k.sonuc)}</td>
      <td>${_gocKacir(k.aciklama) || '-'}</td>
    </tr>
  `).join('') || '<tr><td colspan="7" style="text-align:center; color:#64748b;">Kalibrasyon kaydı bulunmamaktadır.</td></tr>';

  const govde = `
    <div class="goc-ustbilgi">
      <div class="goc-logo">${_gocLogoHtml()}</div>
      <div class="goc-baslik">GAZ ÖLÇÜM CİHAZI KALİBRASYON GEÇMİŞİ
        <small>Cihaz No: ${_gocKacir(cihaz.cihazNo)} — ${_gocKacir(cihaz.ad)}</small>
      </div>
    </div>

    <div class="goc-bolum">
      <h2>1. Cihaz Bilgileri</h2>
      <table>
        <tr><td class="goc-etiket">Cihaz Adı</td><td>${_gocKacir(cihaz.ad)}</td><td class="goc-etiket">Tür</td><td>${_gocKacir(cihaz.tur)}</td></tr>
        <tr><td class="goc-etiket">Marka / Model</td><td>${_gocKacir([cihaz.marka, cihaz.model].filter(Boolean).join(' / ')) || '-'}</td><td class="goc-etiket">Seri No</td><td>${_gocKacir(cihaz.seriNo) || '-'}</td></tr>
        <tr><td class="goc-etiket">Ölçülen Gazlar</td><td colspan="3">${_gocKacir(cihaz.olculenGazlar) || '-'}</td></tr>
        <tr><td class="goc-etiket">Bölüm</td><td>${_gocKacir(cihaz.bolum)}</td><td class="goc-etiket">Lokasyon</td><td>${_gocKacir(cihaz.lokasyon) || '-'}</td></tr>
        <tr><td class="goc-etiket">Kalibrasyon Periyodu</td><td>${cihaz.periyotAy} ay</td><td class="goc-etiket">Sorumlu Personel</td><td>${_gocKacir(cihaz.sorumluPersonel) || '-'}</td></tr>
        <tr><td class="goc-etiket">Son Kalibrasyon Tarihi</td><td>${_gocKacir(gunAyYil(cihaz.sonKalibrasyonTarihi)) || '-'}</td><td class="goc-etiket">Sonraki Kalibrasyon Tarihi</td><td>${_gocKacir(gunAyYil(cihaz.sonrakiKalibrasyonTarihi)) || '-'}</td></tr>
      </table>
    </div>

    <div class="goc-bolum">
      <h2>2. Kalibrasyon Geçmişi</h2>
      <table class="goc-tablo">
        <thead><tr><th>Tarih</th><th>Tür</th><th>Rapor No</th><th>Firma</th><th>Uzman</th><th>Sonuç</th><th>Açıklama</th></tr></thead>
        <tbody>${kayitSatirlari}</tbody>
      </table>
    </div>

    <div class="goc-altbilgi">🌱 Çevre sorumluluğunuzu düşünerek lütfen gerekmedikçe çıktı almayınız.</div>
  `;

  const html = `
    <div id="gocPdfKok">
      <style>
        #gocPdfKok{ font-family: Arial, Helvetica, sans-serif; color:#111827; background:#fff; font-size:9.5pt; }
        #gocPdfKok *{ box-sizing:border-box; }

        #gocPdfKok .goc-ustbilgi{ display:flex; align-items:stretch; box-shadow: inset 0 0 0 2px #0b2c52; margin-bottom:4mm; }
        #gocPdfKok .goc-ustbilgi > div{ padding:3mm; display:flex; align-items:center; justify-content:center; box-shadow: inset -2px 0 0 0 #0b2c52; }
        #gocPdfKok .goc-ustbilgi > div:last-child{ box-shadow:none; }
        #gocPdfKok .goc-logo{ flex:0 0 28mm; width:28mm; text-align:center; color:#94a3b8; font-size:8pt; font-weight:700; }
        #gocPdfKok .goc-logo img{ max-width:24mm; max-height:16mm; }
        #gocPdfKok .goc-baslik{ flex:1 1 auto; min-width:0; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; font-size:12.5pt; font-weight:700; color:#0b2c52; line-height:1.3; }
        #gocPdfKok .goc-baslik small{ display:block; font-size:8pt; font-weight:400; color:#374151; margin-top:1.5mm; }

        #gocPdfKok .goc-bolum{ margin-bottom:4mm; box-shadow: inset 0 0 0 1px #94a3b8; }
        #gocPdfKok .goc-bolum h2{ margin:0; background:#0b2c52; color:#fff; font-size:9.5pt; padding:2mm 3mm; text-transform:uppercase; }
        #gocPdfKok .goc-bolum > table{ width:100%; border-collapse:collapse; }
        #gocPdfKok .goc-bolum > table tr{ page-break-inside:avoid; break-inside:avoid; }
        #gocPdfKok .goc-bolum > table td{ border:1px solid #cbd5e1; padding:2.3mm 3mm; vertical-align:top; font-size:9pt; }
        #gocPdfKok .goc-etiket{ font-weight:700; width:20%; background:#f8fafc; }

        #gocPdfKok table.goc-tablo{ width:100%; border-collapse:collapse; }
        #gocPdfKok table.goc-tablo th{ background:#0b2c52; color:#fff; font-size:8pt; padding:3px 5px; border:1px solid #0b2c52; text-transform:uppercase; }
        #gocPdfKok table.goc-tablo td{ font-size:8.5pt; padding:3px 5px; border:1px solid #cbd5e1; }
        #gocPdfKok table.goc-tablo tr{ page-break-inside:avoid; break-inside:avoid; }

        #gocPdfKok .goc-altbilgi{ text-align:center; font-size:7.5pt; color:#64748b; margin-top:5mm; }
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
      filename: `Gaz_Olcum_Cihazi_${cihaz.cihazNo}.pdf`,
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
    pdf.setFontSize(8);
    pdf.setTextColor(100);
    pdf.text(`Sayfa ${i} / ${toplamSayfa}`, genislik / 2, yukseklik - 5, { align: 'center' });
  }
  await worker.save();

  mount.innerHTML = '';
  mount.style.display = 'none';
}
