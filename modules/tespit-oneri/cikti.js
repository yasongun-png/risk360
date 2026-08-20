// Tespit ve Öneri Defteri — kayıt bazlı, tek sayfalık "Tespit ve Öneri Formu"
// PDF'i. Kullanıcı isteği: "uygunsuzluk formu benzeri bir form hazırla" /
// "o yüzden formatlar aynı olsun" -- modules/uygunsuzluk/cikti.js
// uygunsuzlukKayitPdfOlustur ile birebir aynı görsel kalıp (üst bantta solda
// logo/ortada başlık/sağda Form Ayarları kutusu — Form No/Sürüm Tarihi/
// Sürüm No/Sayfa Sayısı, bölüm tabloları, kaşe/imza onay kutuları, her
// sayfa kendi gerçek "mevcut/toplam" sayfa numarasını basar). Tespit ve
// Öneri kaydı uygunsuzluktan daha az alan içerdiğinden (öncesi/sonrası foto
// çifti yok, tek "defter sayfası" fotoğrafı var, konum krokisi yok) TEK
// sayfaya sığar; TO_TOPLAM_SAYFA yine de aynı mekanizmayla hesaplanır.

function _toPdfKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function _toAlanSatiri(etiket1, deger1, etiket2, deger2) {
  if (etiket2 === undefined) {
    return `<tr><td class="uc-form-etiket">${_toPdfKacir(etiket1)}</td><td class="uc-form-deger" colspan="3">${deger1}</td></tr>`;
  }
  return `<tr>
    <td class="uc-form-etiket">${_toPdfKacir(etiket1)}</td><td class="uc-form-deger">${deger1}</td>
    <td class="uc-form-etiket">${_toPdfKacir(etiket2)}</td><td class="uc-form-deger">${deger2}</td>
  </tr>`;
}

// imzaKaydi: {ad, tarih} (modules/tespit-oneri/model.js
// tespitOneriImzaVeriUret), imzaGorselUrl: fotoBuyukCoz ile çözülmüş data
// URL (varsa). Dijital imza atılmışsa çizilmiş imza görseli + tarih
// basılır; atılmamışsa kağıda elle imzalamak için boş bir alan bırakılır
// (bkz. modules/uygunsuzluk/cikti.js _ucOnayKutusu ile aynı ilke).
function _toOnayKutusu(baslik, adSoyad, imzaKaydi, imzaGorselUrl) {
  const gosterilecekAd = (imzaKaydi && imzaKaydi.ad) || adSoyad;
  const imzaIcerik = imzaGorselUrl
    ? `<img src="${imzaGorselUrl}" style="max-width:100%; max-height:12mm; margin-top:1mm;">`
    : '';
  const tarihSatiri = (imzaKaydi && imzaKaydi.tarih)
    ? `<div style="font-size:7pt; color:#64748b; margin-top:0.5mm;">${_toPdfKacir(gunAyYil((imzaKaydi.tarih || '').slice(0, 10)))}</div>`
    : '';
  return `
    <div class="uc-onay-kutu">
      <div class="uc-onay-etiket">${_toPdfKacir(baslik)}</div>
      <div class="uc-onay-ad">${_toPdfKacir(gosterilecekAd) || '&nbsp;'}</div>
      <div class="uc-onay-imza-alani">${imzaIcerik}</div>
      <div class="uc-onay-imza-baslik">İmza${tarihSatiri}</div>
    </div>
  `;
}

function _toFormFotoKutusu(url, etiket) {
  return `
    <div class="uc-form-foto-kutu">
      <div class="uc-form-foto-govde">${url ? `<img src="${url}">` : ''}</div>
      <div class="uc-form-foto-etiket">${_toPdfKacir(etiket)}</div>
    </div>
  `;
}

const _TO_KAYIT_STIL = `
      #toKayitPdf{ font-family: Arial, Helvetica, sans-serif; color:#111827; background:#fff; width:210mm; min-height:297mm; padding:8mm; font-size:9pt; }
      #toKayitPdf *{ box-sizing:border-box; }

      #toKayitPdf .fa-kutu{ border-collapse:collapse; font-size:6.8pt; width:100%; table-layout:fixed; }
      #toKayitPdf .fa-kutu td{ padding:1.5px 4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      #toKayitPdf .fa-kutu td:first-child{ font-weight:700; background:#fff; width:48%; }

      #toKayitPdf .uc-form-ustbilgi{ display:flex; align-items:stretch; border:2px solid #111827; margin-bottom:4mm; background:#fff; }
      #toKayitPdf .uc-form-ustbilgi > div{ padding:3mm; display:flex; align-items:center; justify-content:center; border-right:2px solid #111827; background:#fff; }
      #toKayitPdf .uc-form-ustbilgi > div:last-child{ border-right:none; }
      #toKayitPdf .uc-form-logo{ flex:0 0 28mm; width:28mm; text-align:center; color:#94a3b8; font-size:8pt; font-weight:700; }
      #toKayitPdf .uc-form-logo img{ max-width:24mm; max-height:16mm; }
      #toKayitPdf .uc-form-baslik{ flex:1 1 auto; min-width:0; text-align:center; font-size:13pt; font-weight:700; color:#111827; line-height:1.3; }
      #toKayitPdf .uc-form-fa{ flex:0 0 42mm; width:42mm; padding:2mm !important; align-items:stretch !important; }

      #toKayitPdf .uc-form-bolum{ margin-bottom:3mm; background:#fff; }
      #toKayitPdf .uc-form-bolum h2{ margin:0; background:#fff; color:#111827; font-size:9.5pt; padding:2mm 3mm; text-transform:uppercase; border:1px solid #111827; border-bottom:none; }
      #toKayitPdf .uc-form-bolum table{ width:100%; border-collapse:collapse; border:1px solid #111827; }
      #toKayitPdf .uc-form-bolum td{ border:1px solid #111827; padding:2.5mm 3mm; vertical-align:top; font-size:9pt; }
      #toKayitPdf .uc-form-etiket{ font-weight:700; width:16%; background:#fff; white-space:pre-line; }
      #toKayitPdf .uc-form-deger{ width:34%; white-space:pre-line; }

      #toKayitPdf .uc-rozet{ display:inline-block; padding:2px 10px; border-radius:8px; font-size:8.5pt; font-weight:700; }
      #toKayitPdf .uc-rozet-oncelik{ display:inline-block; padding:2px 10px; border-radius:8px; font-size:8.5pt; font-weight:700; }
      #toKayitPdf .uc-rozet-oncelik.dusuk{ background:#dcfce7; color:#15803d; }
      #toKayitPdf .uc-rozet-oncelik.orta{ background:#fef3c7; color:#b45309; }
      #toKayitPdf .uc-rozet-oncelik.yuksek{ background:#ffedd5; color:#c2410c; }
      #toKayitPdf .uc-rozet-oncelik.acil{ background:#fee2e2; color:#b91c1c; }

      #toKayitPdf .uc-form-fotograflar{ display:flex; gap:4mm; }
      #toKayitPdf .uc-form-foto-kutu{ flex:1; border:1px solid #111827; background:#fff; }
      #toKayitPdf .uc-form-foto-govde{ height:56mm; display:flex; align-items:center; justify-content:center; background:#fff; overflow:hidden; }
      #toKayitPdf .uc-form-foto-govde img{ max-width:100%; max-height:100%; object-fit:contain; }
      #toKayitPdf .uc-form-foto-etiket{ text-align:center; font-weight:700; font-size:8pt; padding:2mm; border-top:1px solid #111827; text-transform:uppercase; }

      #toKayitPdf .uc-form-altbilgi{ text-align:center; font-size:7.5pt; color:#64748b; margin-top:5mm; }

      #toKayitPdf .uc-onay-satir{ display:flex; gap:6mm; }
      #toKayitPdf .uc-onay-kutu{ flex:1; border:1px solid #111827; padding:3mm; text-align:center; background:#fff; }
      #toKayitPdf .uc-onay-etiket{ font-size:8pt; font-weight:700; color:#111827; text-transform:uppercase; }
      #toKayitPdf .uc-onay-ad{ font-size:9pt; margin-top:1.5mm; min-height:4mm; }
      #toKayitPdf .uc-onay-imza-alani{ height:12mm; border-bottom:1px solid #111827; margin-top:4mm; }
      #toKayitPdf .uc-onay-imza-baslik{ font-size:7.5pt; color:#64748b; margin-top:1mm; }
`;

async function tespitOneriKaydiPdfOlustur(id) {
  const k = tespitOneriIdIleGetirRepo(id);
  if (!k) return;

  const firma = aktifFirmaGetir();
  const logo = firma ? firmaLogoGetir(firma.id) : '';
  const imzalar = k.imzalar || {};
  const [defterSayfasiUrl, tespitEdenImzaUrl, tebligEdilenImzaUrl] = await Promise.all([
    fotoBuyukCoz(k.defterSayfasiFotografi),
    fotoBuyukCoz(imzalar.tespitEden && imzalar.tespitEden.imzaUrl),
    fotoBuyukCoz(imzalar.tebligEdilen && imzalar.tebligEdilen.imzaUrl)
  ]);

  // Bu form her zaman TEK sayfa üretir (öncesi/sonrası foto çifti veya
  // konum krokisi yok) -- yine de formAyarlariKutusuHtml'in 4. parametresi
  // aynı mekanizmayla ("mevcut/toplam") geçilir, bkz. modules/uygunsuzluk
  // /cikti.js aynı notu ("1. sayfa 1/1, 2. sayfada da 1/1" hatasının çözümü).
  const TO_TOPLAM_SAYFA = 1;

  const html = `
  <div id="toKayitPdf">
    <style>${_TO_KAYIT_STIL}</style>

    <div class="uc-form-ustbilgi">
      <div class="uc-form-logo">${logo ? `<img src="${logo}">` : 'LOGO YOK'}</div>
      <div class="uc-form-baslik">TESPİT VE ÖNERİ FORMU</div>
      <div class="uc-form-fa">${formAyarlariKutusuHtml('tespit-oneri', null, false, `1/${TO_TOPLAM_SAYFA}`)}</div>
    </div>

    <div class="uc-form-bolum">
      <h2>1. Genel Bilgiler</h2>
      <table>
        ${_toAlanSatiri('Kayıt No', _toPdfKacir(k.kayitNo), 'Tespit Tarihi', _toPdfKacir(gunAyYil(k.tespitTarihi)) || '-')}
        ${_toAlanSatiri('Bölüm / Yer', _toPdfKacir(k.bolum) || '-', 'İşyeri Sicili', _toPdfKacir(k.isyeriSicili) || '-')}
        ${_toAlanSatiri('Tespiti Yapan', _toPdfKacir(k.tespitEden) || '-', 'Öncelik', `<span class="uc-rozet-oncelik ${slugOlustur(k.oncelik || '')}">${_toPdfKacir(k.oncelik)}</span>`)}
      </table>
    </div>

    <div class="uc-form-bolum">
      <h2>2. Tespit ve Öneri</h2>
      <table>
        ${_toAlanSatiri('Tespit (Bulgu)', _toPdfKacir(k.tespit) || '-')}
        ${_toAlanSatiri('Öneri', _toPdfKacir(k.oneri) || '-')}
      </table>
    </div>

    <div class="uc-form-bolum">
      <h2>3. Tebliğ ve Kapanış</h2>
      <table>
        ${_toAlanSatiri('Tebliğ Edilen', _toPdfKacir(k.tebligEdilen) || '-', 'Tebliğ Tarihi', _toPdfKacir(gunAyYil(k.tebligTarihi)) || '-')}
        ${_toAlanSatiri('Durum', _toPdfKacir(k.durum), 'Kapanış Tarihi', _toPdfKacir(gunAyYil(k.kapanisTarihi)) || '-')}
        ${_toAlanSatiri('Yapılan İşlem', _toPdfKacir(k.yapilanIslem) || '-')}
        ${_toAlanSatiri('Not', _toPdfKacir(k.notlar) || '-')}
      </table>
    </div>

    <div class="uc-form-bolum">
      <h2>4. Defter Sayfası Fotoğrafı</h2>
      <div style="padding:3mm;">
        <div class="uc-form-fotograflar">
          ${_toFormFotoKutusu(defterSayfasiUrl, 'Defter Sayfası')}
        </div>
      </div>
    </div>

    <div class="uc-form-bolum">
      <h2>5. Onay</h2>
      <div style="padding:3mm;">
        <div class="uc-onay-satir">
          ${_toOnayKutusu('Tespit Eden', k.tespitEden, imzalar.tespitEden, tespitEdenImzaUrl)}
          ${_toOnayKutusu('Tebliğ Edilen', k.tebligEdilen, imzalar.tebligEdilen, tebligEdilenImzaUrl)}
        </div>
      </div>
    </div>

    <div class="uc-form-altbilgi">🌱 Çevre sorumluluğunuzu düşünerek lütfen gerekmedikçe çıktı almayınız.</div>
  </div>
  `;

  const mount = document.getElementById('yazdirmaAlani');
  mount.style.display = 'block';
  mount.innerHTML = html;

  await Promise.all(Array.from(document.getElementById('toKayitPdf').querySelectorAll('img')).map(img => {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
    return new Promise(resolve => {
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
    });
  }));

  const canvas = await html2canvas(document.getElementById('toKayitPdf'), { scale: 1.5, backgroundColor: '#ffffff', useCORS: true });
  const pdf = new jspdf.jsPDF('p', 'mm', 'a4');
  const genislikMm = 210;
  const yukseklikMm = canvas.height * (genislikMm / canvas.width);
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.85), 'JPEG', 0, 0, genislikMm, yukseklikMm);
  pdf.setFontSize(8);
  pdf.setTextColor(100);
  pdf.text(`Sayfa 1 / ${TO_TOPLAM_SAYFA}`, genislikMm / 2, 297 - 5, { align: 'center' });
  pdf.save(`Tespit_Oneri_${(k.kayitNo || id).replace(/[\\/]/g, '-')}.pdf`);

  mount.innerHTML = '';
  mount.style.display = 'none';
}
