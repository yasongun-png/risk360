// Tespit ve Öneri Defteri — kayıt bazlı "Tespit ve Öneri Formu" PDF'i.
// Kullanıcı isteği: "uygunsuzluk formu benzeri bir form hazırla" / "o
// yüzden formatlar aynı olsun" -- modules/uygunsuzluk/cikti.js
// uygunsuzlukKayitPdfOlustur ile birebir aynı görsel kalıp (üst bantta solda
// logo/ortada başlık/sağda Form Ayarları kutusu — Form No/Sürüm Tarihi/
// Sürüm No, bölüm tabloları, kaşe/imza onay kutuları, her sayfa kendi
// gerçek "mevcut/toplam" sayfa numarasını basar).
// Kullanıcı raporu: "tespit öneri formu çok uzun yazında bir sayfayı geçti
// ve form almadı ikinci sayfa oluşturulmadı" -- form TEK sayfaya sığar
// varsayımıyla yazılmıştı (tek büyük html2canvas görüntüsü tek A4 sayfasına
// basılıyordu); Tespit/Öneri/Bulgular gibi serbest metin alanları uzun
// olduğunda içerik sayfa sınırını aşıp kesiliyordu. Artık modules/egitim/
// cikti.js _egtGrubuPdfeEkle ile AYNI "kendi doğal yüksekliğini PİKSEL
// BAZINDA A4 sayfa yüksekliğine göre dilimleyip PDF'e sayfa sayfa ekleme"
// yöntemi kullanılıyor (bkz. aşağıda _toKayitPdfeSayfalaEkle) — sayfa
// sayısı önceden VARSAYILMAZ, gerçek içerik yüksekliğinden hesaplanır.

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
    ? `<img src="${imzaGorselUrl}" style="max-width:100%; max-height:12mm;">`
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

      #toKayitPdf .uc-form-altbilgi{ text-align:center; font-size:7.5pt; color:#64748b; margin-top:5mm; }

      #toKayitPdf .uc-onay-satir{ display:flex; gap:6mm; }
      #toKayitPdf .uc-onay-kutu{ flex:1; border:1px solid #111827; padding:3mm; text-align:center; background:#fff; }
      #toKayitPdf .uc-onay-etiket{ font-size:8pt; font-weight:700; color:#111827; text-transform:uppercase; }
      #toKayitPdf .uc-onay-ad{ font-size:9pt; margin-top:1.5mm; min-height:4mm; }
      #toKayitPdf .uc-onay-imza-alani{ height:12mm; border-bottom:1px solid #111827; margin-top:4mm; display:flex; align-items:flex-end; justify-content:center; }
      #toKayitPdf .uc-onay-imza-alani img{ display:block; margin:0 auto; }
      #toKayitPdf .uc-onay-imza-baslik{ font-size:7.5pt; color:#64748b; margin-top:1mm; }
`;

// Kök elemanı yakalayıp, kendi doğal (sayfadan uzun olabilen) yüksekliğini
// gerçek A4 sayfa yüksekliğine göre PİKSEL BAZINDA dilimleyip PDF'e sayfa
// sayfa ekler -- modules/egitim/cikti.js _egtGrubuPdfeEkle ile birebir aynı
// yöntem (bkz. dosya başı yorum). Kaç parça/sayfa gerektiğini geri döner ki
// çağıran taraf her sayfaya doğru "mevcut/toplam" numarasını basabilsin.
async function _toKayitPdfeSayfalaEkle(pdf, kokEleman, icerikGenislikMm, kenarBosluguMm, sayfaYukseklikMm) {
  const canvas = await html2canvas(kokEleman, { scale: 1.5, backgroundColor: '#ffffff', useCORS: true });
  const pxPerMm = canvas.width / icerikGenislikMm;
  const kullanilabilirYukseklikMm = sayfaYukseklikMm - kenarBosluguMm * 2;
  const sayfaYukseklikPx = Math.floor(kullanilabilirYukseklikMm * pxPerMm);
  const toplamParca = Math.max(1, Math.ceil(canvas.height / sayfaYukseklikPx));

  for (let i = 0; i < toplamParca; i++) {
    const parcaYukseklikPx = Math.min(sayfaYukseklikPx, canvas.height - i * sayfaYukseklikPx);
    const parcaCanvas = document.createElement('canvas');
    parcaCanvas.width = canvas.width;
    parcaCanvas.height = parcaYukseklikPx;
    const ctx = parcaCanvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, parcaCanvas.width, parcaCanvas.height);
    ctx.drawImage(canvas, 0, i * sayfaYukseklikPx, canvas.width, parcaYukseklikPx, 0, 0, canvas.width, parcaYukseklikPx);

    if (i > 0) pdf.addPage('a4', 'p');
    const parcaYukseklikMm = parcaYukseklikPx / pxPerMm;
    pdf.addImage(parcaCanvas.toDataURL('image/jpeg', 0.9), 'JPEG', kenarBosluguMm, kenarBosluguMm, icerikGenislikMm, parcaYukseklikMm);
  }
  return toplamParca;
}

async function tespitOneriKaydiPdfOlustur(id) {
  const k = tespitOneriIdIleGetirRepo(id);
  if (!k) return;

  const firma = aktifFirmaGetir();
  const logo = firma ? firmaLogoGetir(firma.id) : '';
  const imzalar = k.imzalar || {};
  const [tespitEdenImzaUrl, tebligEdilenImzaUrl] = await Promise.all([
    fotoBuyukCoz(imzalar.tespitEden && imzalar.tespitEden.imzaUrl),
    fotoBuyukCoz(imzalar.tebligEdilen && imzalar.tebligEdilen.imzaUrl)
  ]);

  // Kullanıcı isteği: "defter sayfası fotosu olmasın" -- form artık kayıttaki
  // defterSayfasiFotografi'ni göstermiyor (kayıt/form/tablo/Excel'de foto
  // yükleme özelliği aynen duruyor, sadece bu PDF'te basılmıyor).
  //
  // Kullanıcı raporu: "form çok uzun oldu, bir sayfayı geçti, ikinci sayfa
  // oluşturulmadı" -- sayfa sayısı artık ÖNCEDEN varsayılmıyor; gerçek
  // içerik yüksekliğinden hesaplanıp her sayfanın altbilgisine dinamik
  // olarak basılıyor (bkz. _toKayitPdfeSayfalaEkle). Bu yüzden üstbilgideki
  // statik "Sayfa Sayısı" alanı GİZLENİR (bkz. modules/jsa/cikti.js aynı
  // desen) -- ikisi çelişirse (statik 1/1 vs gerçek 1/2) kullanıcı raporu
  // "2/2 hatalı bir sayfa var 1/1 olmalı" ile aynı soruna geri dönülür.
  const html = `
  <div id="toKayitPdf">
    <style>${_TO_KAYIT_STIL}</style>

    <div class="uc-form-ustbilgi">
      <div class="uc-form-logo">${logo ? `<img src="${logo}">` : 'LOGO YOK'}</div>
      <div class="uc-form-baslik">TESPİT VE ÖNERİ FORMU</div>
      <div class="uc-form-fa">${formAyarlariKutusuHtml('tespit-oneri', null, false, null, true)}</div>
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
      <h2>4. Onay</h2>
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

  const pdf = new jspdf.jsPDF('p', 'mm', 'a4');
  const genislikMm = 210;
  // Kullanıcı raporu: "form çok uzun oldu, bir sayfayı geçti, ikinci sayfa
  // oluşturulmadı" -- eskiden tek büyük görüntü tek sayfaya sığdırılmaya
  // çalışılıyordu (uzun metinlerde taşıp kesiliyordu); artık gerçek içerik
  // yüksekliğine göre gereken kadar sayfaya dilimlenip ekleniyor.
  const toplamSayfa = await _toKayitPdfeSayfalaEkle(pdf, document.getElementById('toKayitPdf'), genislikMm, 0, 297);
  for (let i = 0; i < toplamSayfa; i++) {
    pdf.setPage(i + 1);
    pdf.setFontSize(8);
    pdf.setTextColor(100);
    pdf.text(`Sayfa ${i + 1} / ${toplamSayfa}`, genislikMm / 2, 297 - 5, { align: 'center' });
  }
  pdf.save(`Tespit_Oneri_${(k.kayitNo || id).replace(/[\\/]/g, '-')}.pdf`);

  mount.innerHTML = '';
  mount.style.display = 'none';
}
