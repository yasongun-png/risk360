// Kimyasal Bilgi Formu PDF — diğer modüllerle (KKD, İş İzni) aynı kalite
// kalıbı: sağ üstte Form Ayarları (Doküman No/Sürüm Tarihi/Sürüm No/Sayfa
// Sayısı) kutusu, box-shadow çerçeveler (html2canvas'ın tam genişlikteki
// kutuların sağ/alt kenarını 1px kırpma sorununu önlemek için), GG.AA.YYYY
// tarihler. Eski üretim uygulamasında bu modülün kendi PDF şablonu yoktu
// (sadece CSV/JSON) — bu çıktı sıfırdan tasarlandı.

function _kimKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// Kimyasal Adı/Ticari Adı/Tedarikçi gibi tek satırlık kimlik alanları --
// hatalı bir veri girişi (ör. eski bir SDS içe aktarma hatası) yüzünden
// paragraflarca metin içerirse formu sayfalarca taşırmasın diye kesilir.
function _kimKisalt(v, uzunluk) {
  const m = String(v ?? '');
  return m.length > uzunluk ? m.slice(0, uzunluk) + '…' : m;
}

function _kimLogoHtml(logoUrl) {
  return logoUrl ? `<img src="${logoUrl}">` : 'LOGO YOK';
}

async function kimyasalFormunuPdfOlustur(id) {
  const k = kimyasalIdIleGetirRepo(id);
  if (!k) return;

  const firma = aktifFirmaGetir();
  const [logoUrl, sdsGorseliUrl] = await Promise.all([
    fotoBuyukCoz(firma ? firmaLogoGetir(firma.id) : ''),
    fotoBuyukCoz(k.sdsGorseli)
  ]);

  const govde = `
    <div class="kim-ustbilgi">
      <div class="kim-logo">${_kimLogoHtml(logoUrl)}</div>
      <div class="kim-baslik">KİMYASAL BİLGİ FORMU
        <small>Kimyasal No: ${_kimKacir(k.kimyasalNo)}</small>
      </div>
      <div class="kim-fa">${formAyarlariKutusuHtml('kimyasal')}</div>
    </div>

    <div class="kim-bolum">
      <h2>1. Genel Bilgiler</h2>
      <table>
        <tr><td class="kim-etiket">Kimyasal Adı</td><td>${_kimKacir(_kimKisalt(k.ad, 150))}</td><td class="kim-etiket">Ticari Adı</td><td>${_kimKacir(_kimKisalt(k.ticariAdi, 150)) || '-'}</td></tr>
        <tr><td class="kim-etiket">CAS No</td><td>${_kimKacir(k.casNo) || '-'}</td><td class="kim-etiket">EC No</td><td>${_kimKacir(k.ecNo) || '-'}</td></tr>
        <tr><td class="kim-etiket">Tedarikçi</td><td>${_kimKacir(_kimKisalt(k.tedarikci, 150)) || '-'}</td><td class="kim-etiket">Fiziksel Hali</td><td>${_kimKacir(k.fizikselHali)}</td></tr>
        <tr><td class="kim-etiket">Bölüm</td><td>${_kimKacir(k.bolum)}</td><td class="kim-etiket">Lokasyon / Raf</td><td>${_kimKacir(k.lokasyon) || '-'}</td></tr>
        <tr><td class="kim-etiket">Depolama Grubu</td><td>${_kimKacir(k.depolamaGrubu)}</td><td class="kim-etiket">Miktar</td><td>${k.miktar != null ? _kimKacir(k.miktar) + ' ' + _kimKacir(k.birim) : '-'}</td></tr>
      </table>
    </div>

    <div class="kim-bolum">
      <h2>2. Tehlike Sınıflandırması</h2>
      <table>
        <tr><td class="kim-etiket">GHS Piktogramları</td><td colspan="3">${_kimKacir((k.ghsPiktogramlari || []).join(', ')) || '-'}</td></tr>
        <tr><td class="kim-etiket">H Kodları</td><td>${_kimKacir((k.hKodlari || []).join(', ')) || '-'}</td><td class="kim-etiket">P Kodları</td><td>${_kimKacir((k.pKodlari || []).join(', ')) || '-'}</td></tr>
        <tr><td class="kim-etiket">Risk Seviyesi</td><td>${_kimKacir(k.riskSeviyesi)}${k.kritikMi ? ' (Kritik Kimyasal)' : ''}</td><td class="kim-etiket">NFPA 704</td><td>${k.nfpaSaglik}-${k.nfpaYanicilik}-${k.nfpaKararsizlik} ${(k.nfpaOzelKod || []).join('/')}</td></tr>
      </table>
    </div>

    <div class="kim-bolum">
      <h2>3. GBF / SDS</h2>
      <table>
        <tr><td class="kim-etiket">Revizyon Tarihi</td><td>${_kimKacir(gunAyYil(k.sdsRevizyonTarihi)) || '-'}</td><td class="kim-etiket">Dosya Adı</td><td>${_kimKacir(k.sdsDosyaAdi) || '-'}</td></tr>
        <tr><td class="kim-etiket">Risk Değerlendirme Bağlantısı</td><td colspan="3">${_kimKacir(k.riskDegerlendirmeBaglantisi) || '-'}</td></tr>
      </table>
    </div>

    <div class="kim-bolum">
      <h2>4. Depolama / Acil Durum</h2>
      <table>
        <tr><td class="kim-etiket">Depolama / Acil Durum Notu</td><td colspan="3">${_kimKacir(k.depolamaNotu) || '-'}</td></tr>
        <tr><td class="kim-etiket">Durum</td><td colspan="3">${_kimKacir(k.durum)}</td></tr>
      </table>
    </div>

    ${sdsGorseliUrl ? `<div class="kim-bolum"><h2>5. GBF / SDS Görseli</h2><div style="padding:3mm; text-align:center;"><img src="${sdsGorseliUrl}" style="max-width:100%; max-height:100mm; object-fit:contain;"></div></div>` : ''}

    <div class="kim-altbilgi">🌱 Çevre sorumluluğunuzu düşünerek lütfen gerekmedikçe çıktı almayınız.</div>
  `;

  const html = `
    <div id="kimPdfKok">
      <style>
        #kimPdfKok{ font-family: Arial, Helvetica, sans-serif; color:#111827; background:#fff; font-size:9.5pt; }
        #kimPdfKok *{ box-sizing:border-box; }

        #kimPdfKok .fa-kutu{ border-collapse:collapse; font-size:6.8pt; width:100%; table-layout:fixed; }
        #kimPdfKok .fa-kutu td{ padding:1.5px 4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        #kimPdfKok .fa-kutu td:first-child{ font-weight:700; background:#f1f5f9; width:48%; }

        #kimPdfKok .kim-ustbilgi{ display:flex; align-items:stretch; box-shadow: inset 0 0 0 2px #0b2c52; margin-bottom:4mm; }
        #kimPdfKok .kim-ustbilgi > div{ padding:3mm; display:flex; align-items:center; justify-content:center; box-shadow: inset -2px 0 0 0 #0b2c52; }
        #kimPdfKok .kim-ustbilgi > div:last-child{ box-shadow:none; }
        #kimPdfKok .kim-logo{ flex:0 0 28mm; width:28mm; text-align:center; color:#94a3b8; font-size:8pt; font-weight:700; }
        #kimPdfKok .kim-logo img{ max-width:24mm; max-height:16mm; }
        #kimPdfKok .kim-baslik{ flex:1 1 auto; min-width:0; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; font-size:12.5pt; font-weight:700; color:#0b2c52; line-height:1.3; }
        #kimPdfKok .kim-baslik small{ display:block; font-size:8pt; font-weight:400; color:#374151; margin-top:1.5mm; }
        #kimPdfKok .kim-fa{ flex:0 0 42mm; width:42mm; padding:2mm !important; align-items:stretch !important; }

        #kimPdfKok .kim-bolum{ margin-bottom:4mm; box-shadow: inset 0 0 0 1px #94a3b8; page-break-inside:avoid; break-inside:avoid; }
        #kimPdfKok .kim-bolum h2{ margin:0; background:#0b2c52; color:#fff; font-size:9.5pt; padding:2mm 3mm; text-transform:uppercase; }
        #kimPdfKok .kim-bolum table{ width:100%; border-collapse:collapse; }
        #kimPdfKok .kim-bolum td{ border:1px solid #cbd5e1; padding:2.3mm 3mm; vertical-align:top; font-size:9pt; }
        #kimPdfKok .kim-etiket{ font-weight:700; width:18%; background:#f8fafc; }

        #kimPdfKok .kim-altbilgi{ text-align:center; font-size:7.5pt; color:#64748b; margin-top:5mm; }
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
      filename: `Kimyasal_${k.kimyasalNo}.pdf`,
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
