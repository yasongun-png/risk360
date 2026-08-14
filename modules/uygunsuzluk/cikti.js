// Uygunsuzluk / DÖF — kapak sayfalı, fotoğraflı PDF raporları.
// Eski üretim uygulamasındaki (uygunsuzluk-platform-standalone.html) kapak +
// liste + öncesi/sonrası fotoğraf sütunlu PDF çıktısıyla mümkün olduğunca
// aynı mantık: kayıtlar Açık/Kapalı olarak İKİ AYRI bölüme ayrılır (tek
// karışık liste değil, aralarında ayırıcı sayfa vardır), durum rengi de aynı
// kalıpta tutulur (Açık = yeşil, Kapalı = kırmızı). Kapak sayfasındaki başlık
// ve giriş metni serbestçe düzenlenebilir (bkz. ui.js raporMetniGetir/Kaydet —
// eski uygulamadaki "Konu" / editTopicPdfIntroPrompt mantığı). Ayrıca her
// kayıt için ayrı, tek sayfalık "İSG Uygunsuzluk Bildirim Formu" PDF'i üretilir
// (gerçek üretim örneğiyle birebir: kapak bilgisi + 4 bölüm + öncesi/sonrası
// fotoğraf). Tüm PDF'lerin sağ üst köşesinde ortak Form Ayarları (Doküman No/
// Sürüm Tarihi/Sürüm No/Sayfa Sayısı) kutusu bulunur (bkz. core/form-ayarlari.js).

function _ucKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function _ucDurumRozet(kayitAcikMi) {
  return kayitAcikMi
    ? '<span class="uc-rozet uc-rozet-acik">AÇIK</span>'
    : '<span class="uc-rozet uc-rozet-kapali">KAPALI</span>';
}

function _ucFotoHucre(url) {
  return url ? `<img class="uc-foto-thumb" src="${url}">` : '<div class="uc-foto-bos"></div>';
}

function _ucSatirHtml(k) {
  const acikMi = k.durum !== 'Kapalı';
  return `
    <tr>
      <td>${_ucKacir(k.aksiyonNo)}</td>
      <td>${_ucKacir(k.bolum)}</td>
      <td>${_ucKacir(gunAyYil(k.bildirimTarihi))}</td>
      <td>${_ucKacir(k.baslik)}${k.aciklama ? ' — ' + _ucKacir(k.aciklama) : ''}</td>
      <td>${_ucKacir(k.riskSeviyesi)}</td>
      <td>${_ucKacir(gunAyYil(k.termin)) || '-'}</td>
      <td>${_ucKacir(k.sorumlu)}</td>
      <td>${_ucDurumRozet(acikMi)}</td>
      <td>${_ucKacir(k.kanitAciklamasi) || '-'}</td>
      <td>${_ucFotoHucre(k.fotoOncesi)}</td>
      <td>${_ucFotoHucre(k.fotoSonrasi)}</td>
    </tr>
  `;
}

// html2pdf'in otomatik sayfalama modları (css/legacy) -- büyük bir tabloyu
// yüksekliğe göre dilimleyip zorla sayfa kırılımlarıyla birleştirmeye
// çalışırken -- tekrar tekrar başlıksız/gereksiz boş sayfalara yol açtı
// (bkz. eski yorumlar/denemeler). Bunun yerine burada TAM KONTROLLÜ bir
// yöntem kullanılır: kayıtlar sabit boyutlu gruplara bölünür, her GRUP
// (kapak, ayırıcı, her tablo sayfası) TEK BİR PDF SAYFASI olacak şekilde
// html'e yazılır, html2canvas ile AYRI AYRI yakalanır ve jsPDF'e kendi
// sayfası olarak eklenir -- otomatik dilimleme/kırılım tahminine hiç
// güvenilmez (aynı yöntem tekil "Bildirim Formu" ve sertifikalarda da
// kullanılıyor).
// Rapor YATAY (landscape) A4 -- kullanılabilir sayfa yüksekliği ~196mm
// (210mm - üst/alt 7mm boşluk). Her satır fotoğraf kutuları yüzünden en az
// ~34mm yüksekliğinde (fotoğraf yoksa bile boş kutu aynı yüksekliği kaplar).
const UC_SAYFA_BASINA_SATIR = 4;

function _ucKayitlariParcala(kayitlar, boyut) {
  const parcalar = [];
  for (let i = 0; i < kayitlar.length; i += boyut) parcalar.push(kayitlar.slice(i, i + boyut));
  return parcalar.length ? parcalar : [[]];
}

function _ucTabloColgroupHtml() {
  return `
    <colgroup>
      <col style="width:7%"><col style="width:8%"><col style="width:6%"><col style="width:19%">
      <col style="width:6%"><col style="width:6%"><col style="width:9%"><col style="width:6%">
      <col style="width:7%"><col style="width:13%"><col style="width:13%">
    </colgroup>
  `;
}

function _ucTabloBasligiHtml() {
  return `
    <thead>
      <tr>
        <th>No</th><th>Tesis / Birim</th><th>Bildirim Tarihi</th><th>Uygunsuzluk Tanımı</th><th>Risk</th><th>Termin</th>
        <th>Sorumlu</th><th>Durum</th><th>Kapanış Açıklaması</th><th>Öncesi</th><th>Sonrası</th>
      </tr>
    </thead>
  `;
}

function _ucTabloTekSayfaHtml(parca) {
  return `
    <table class="uc-tablo">
      ${_ucTabloColgroupHtml()}
      ${_ucTabloBasligiHtml()}
      <tbody>
        ${parca.map(_ucSatirHtml).join('') || '<tr><td colspan="11" style="text-align:center; color:#64748b;">Kayıt bulunmamaktadır.</td></tr>'}
      </tbody>
    </table>
  `;
}

const _UC_RAPOR_STIL = `
  #ucPdfSayfa{ font-family: Arial, Helvetica, sans-serif; color:#111827; background:#fff; width:297mm; height:210mm; padding:7mm; overflow:hidden; }
  #ucPdfSayfa *{ box-sizing:border-box; }

  #ucPdfSayfa .uc-kapak{ height:100%; display:flex; align-items:center; justify-content:center; }
  #ucPdfSayfa .uc-kapak-kutu{ width:78%; border:3px solid #111827; padding:14mm; text-align:center; }
  #ucPdfSayfa .uc-kapak-kutu .uc-firma{ font-size:12pt; font-weight:700; margin-bottom:6mm; color:#374151; }
  #ucPdfSayfa .uc-kapak-kutu h1{ margin:0 0 8mm; font-size:19pt; color:#111827; }
  #ucPdfSayfa .uc-kapak-kutu p{ text-align:left; font-size:10pt; line-height:1.6; margin:0 0 4mm; }
  #ucPdfSayfa .uc-kapak-kutu .uc-tarih{ font-size:9pt; color:#374151; margin-top:8mm; text-align:right; }

  #ucPdfSayfa .uc-liste-ustbilgi{ display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:5mm; border-bottom:2px solid #111827; padding-bottom:3mm; padding-right:10mm; }
  #ucPdfSayfa .uc-liste-ustbilgi h1{ margin:0; font-size:14pt; color:#111827; }
  #ucPdfSayfa .uc-liste-istatistik{ display:flex; gap:6mm; }
  #ucPdfSayfa .uc-liste-istatistik div{ font-size:9pt; text-align:center; }
  #ucPdfSayfa .uc-liste-istatistik b{ display:block; font-size:14pt; color:#111827; }

  #ucPdfSayfa .uc-ayirici{ height:100%; display:flex; align-items:center; justify-content:center; }
  #ucPdfSayfa .uc-ayirici-kutu{ width:70%; border:3px solid #111827; padding:14mm; text-align:center; }
  #ucPdfSayfa .uc-ayirici-kutu h1{ margin:0 0 4mm; font-size:16pt; color:#111827; }
  #ucPdfSayfa .uc-ayirici-kutu p{ font-size:10pt; color:#374151; margin:0 0 8mm; }
  #ucPdfSayfa .uc-ayirici-kutu .uc-tarih{ font-size:9pt; color:#374151; }

  #ucPdfSayfa .uc-bolum{ margin-bottom:6mm; }
  #ucPdfSayfa .uc-bolum h2{ margin:0 0 3mm; font-size:13pt; color:#111827; border-bottom:2px solid #111827; padding-bottom:2mm; }

  #ucPdfSayfa table.uc-tablo{ width:100%; border-collapse:collapse; table-layout:fixed; }
  #ucPdfSayfa table.uc-tablo th{ background:#e5e7eb; color:#111827; font-size:7.5pt; padding:3px 4px; border:1px solid #94a3b8; text-transform:uppercase; }
  #ucPdfSayfa table.uc-tablo td{ font-size:7.8pt; padding:3px 4px; border:1px solid #cbd5e1; vertical-align:middle; overflow-wrap:anywhere; }

  #ucPdfSayfa .uc-foto-thumb{ width:100%; height:34mm; object-fit:cover; border:1px solid #cbd5e1; display:block; background:#fff; }
  #ucPdfSayfa .uc-foto-bos{ width:100%; height:34mm; border:1px solid #cbd5e1; background:#f3f4f6; }

  #ucPdfSayfa .uc-rozet{ display:inline-block; padding:2px 6px; border-radius:8px; font-size:7.5pt; font-weight:700; white-space:nowrap; min-width:36px; text-align:center; }
  #ucPdfSayfa .uc-rozet-acik{ background:#16a34a; color:#fff; }
  #ucPdfSayfa .uc-rozet-kapali{ background:#dc2626; color:#fff; }
`;

async function uygunsuzlukRaporuPdfOlustur() {
  const filtreler = _usAktifFiltreleriGetir();
  const kayitlarHam = uygunsuzluklariGetir(document.getElementById('aramaKutusu').value, filtreler);
  if (!kayitlarHam.length) {
    alert('Seçili filtreler için PDF oluşturulacak kayıt yok.');
    return;
  }
  // fotoOncesi/fotoSonrasi ayrı Firestore belgelerine referans (fotoref:...)
  // olabilir; PDF'e gömmeden önce gerçek görsel verisine çözülür.
  const kayitlar = await Promise.all(kayitlarHam.map(async k => Object.assign({}, k, {
    fotoOncesi: await fotoBuyukCoz(k.fotoOncesi),
    fotoSonrasi: await fotoBuyukCoz(k.fotoSonrasi)
  })));
  const acikKayitlar = kayitlar.filter(k => k.durum !== 'Kapalı');
  const kapaliKayitlar = kayitlar.filter(k => k.durum === 'Kapalı');
  const ozet = uygunsuzlukOzetiHesapla({ konuId: _secilenKonuId });
  const firma = aktifFirmaGetir();
  const bugun = gunAyYil(bugunIso());
  const rapor = raporMetniGetir();

  const girisParagraflari = (rapor.girisMetni || '')
    .split(/\n+/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p>${_ucKacir(p)}</p>`)
    .join('') || '<p style="color:#64748b;">Rapor kapak metni henüz girilmedi. "Rapor Kapak Metni" düğmesinden ekleyebilirsiniz.</p>';

  const acikParcalar = _ucKayitlariParcala(acikKayitlar, UC_SAYFA_BASINA_SATIR);
  const kapaliParcalar = _ucKayitlariParcala(kapaliKayitlar, UC_SAYFA_BASINA_SATIR);

  // Her biri TAM BİR PDF SAYFASI olacak html parçalarının listesi.
  const sayfalar = [];

  sayfalar.push(`
    <div class="uc-kapak">
      <div class="uc-kapak-kutu">
        <div class="uc-firma">${_ucKacir(firma ? firma.ad : '')}</div>
        <h1>${_ucKacir(rapor.konu)}</h1>
        ${girisParagraflari}
        <div class="uc-tarih">Rapor Tarihi: ${bugun}</div>
      </div>
    </div>
  `);

  acikParcalar.forEach((parca, i) => {
    sayfalar.push(`
      ${i === 0 ? `
        <div class="uc-liste-ustbilgi">
          <h1>İŞ SAĞLIĞI VE GÜVENLİĞİ<br>UYGUNSUZLUK LİSTESİ</h1>
          <div class="uc-liste-istatistik">
            <div><b>${ozet.toplam}</b>Toplam</div>
            <div><b>${ozet.acik}</b>Açık</div>
            <div><b>${ozet.kapali}</b>Kapalı</div>
          </div>
        </div>
      ` : ''}
      <div class="uc-bolum">
        ${i === 0 ? `<h2>AÇIK KAYITLAR (${acikKayitlar.length})</h2>` : ''}
        ${_ucTabloTekSayfaHtml(parca)}
      </div>
    `);
  });

  sayfalar.push(`
    <div class="uc-ayirici">
      <div class="uc-ayirici-kutu">
        <h1>KAPALI UYGUNSUZLUKLAR</h1>
        <p>Bu bölümde kapalı uygunsuzluklar yer alır.</p>
        <div class="uc-tarih">Rapor Tarihi: ${bugun}</div>
      </div>
    </div>
  `);

  kapaliParcalar.forEach((parca, i) => {
    sayfalar.push(`
      <div class="uc-bolum">
        ${i === 0 ? `<h2>KAPALI KAYITLAR (${kapaliKayitlar.length})</h2>` : ''}
        ${_ucTabloTekSayfaHtml(parca)}
      </div>
    `);
  });

  const mount = document.getElementById('yazdirmaAlani');
  mount.style.display = 'block';

  const pdf = new jspdf.jsPDF('l', 'mm', 'a4');
  for (let i = 0; i < sayfalar.length; i++) {
    mount.innerHTML = `<div id="ucPdfSayfa"><style>${_UC_RAPOR_STIL}</style>${sayfalar[i]}</div>`;
    const canvas = await html2canvas(document.getElementById('ucPdfSayfa'), { scale: 2, backgroundColor: '#ffffff', useCORS: true });
    if (i > 0) pdf.addPage('a4', 'l');
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 297, 210);
    pdf.setFontSize(8);
    pdf.setTextColor(100);
    pdf.text(`Sayfa ${i + 1} / ${sayfalar.length}`, 297 / 2, 210 - 5, { align: 'center' });
  }
  pdf.save(`Uygunsuzluk_Raporu_${bugun.replace(/\./g, '-')}.pdf`);

  mount.innerHTML = '';
  mount.style.display = 'none';
}

// ==================== TEKİL KAYIT PDF'İ (İSG UYGUNSUZLUK BİLDİRİM FORMU) ====================
// Gerçek üretim çıktısıyla (ISG_Rapor_*.pdf) birebir: logo + başlık + form
// ayarları üst bilgisi, 4 numaralı bölüm, öncesi/sonrası fotoğraf kutuları.

function _ucAlanSatiri(etiket1, deger1, etiket2, deger2) {
  if (etiket2 === undefined) {
    return `<tr><td class="uc-form-etiket">${_ucKacir(etiket1)}</td><td class="uc-form-deger" colspan="3">${deger1}</td></tr>`;
  }
  return `<tr>
    <td class="uc-form-etiket">${_ucKacir(etiket1)}</td><td class="uc-form-deger">${deger1}</td>
    <td class="uc-form-etiket">${_ucKacir(etiket2)}</td><td class="uc-form-deger">${deger2}</td>
  </tr>`;
}

function _ucFormFotoKutusu(url, etiket) {
  return `
    <div class="uc-form-foto-kutu">
      <div class="uc-form-foto-govde">${url ? `<img src="${url}">` : ''}</div>
      <div class="uc-form-foto-etiket">${_ucKacir(etiket)}</div>
    </div>
  `;
}

// Firebase Storage URL'leri (kroki görseli file:// değil gerçek http(s)
// sunucudan geliyorsa buraya düşer) CORS başlığı olmadan html2canvas'ın
// canvas'a "okuma" adımında sessizce boş/şeffaf çıkabiliyor — ekranda normal
// <img> olarak görünse bile. Bunu kesin önlemek için görsel önce tamamen
// indirilip data: URL'e çevrilir; zaten data: ise (base64/fotoref çözümü)
// dokunmadan geri döner.
async function _ucGorseliDataUrlaCevir(url) {
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
    console.error('Kroki görseli indirilemedi (CORS/ağ hatası olabilir):', e);
    return '';
  }
}

// Saha Dijital Haritası köprüsü — bkz. modules/harita. Kayıtta işaretli bir
// konum varsa, o tesisin kroki görselinin üstünde noktayı gösteren küçük bir
// görüntü döner; yoksa null (çağıran taraf yer tutucu metin gösterir).
async function _ucKrokiGorseliniHazirla(k) {
  if (!k.haritaTesisId || k.haritaX === '' || k.haritaY === '') {
    console.warn('[Kroki] Kayıtta haritaTesisId/haritaX/haritaY yok:', k.aksiyonNo);
    return null;
  }
  const tesis = haritaTesisIdIleGetirRepo(k.haritaTesisId);
  if (!tesis) { console.warn('[Kroki] Tesis bulunamadı, id:', k.haritaTesisId); return null; }
  if (!tesis.gorselUrl) { console.warn('[Kroki] Tesiste gorselUrl yok:', tesis.ad); return null; }
  const krokiUrl = await fotoBuyukCoz(tesis.gorselUrl);
  if (!krokiUrl) { console.warn('[Kroki] fotoBuyukCoz boş döndü, gorselUrl:', tesis.gorselUrl); return null; }
  const dataUrl = await _ucGorseliDataUrlaCevir(krokiUrl);
  if (!dataUrl) { console.warn('[Kroki] Görsel data URL\'e çevrilemedi:', krokiUrl.slice(0, 60)); return null; }
  return { url: dataUrl, x: Number(k.haritaX) || 0, y: Number(k.haritaY) || 0, tesisAdi: tesis.ad };
}

const _UC_KAYIT_STIL = `
      #ucKayitPdf{ font-family: Arial, Helvetica, sans-serif; color:#111827; background:#fff; width:210mm; min-height:297mm; padding:8mm; font-size:9pt; }
      #ucKayitPdf *{ box-sizing:border-box; }

      #ucKayitPdf .fa-kutu{ border-collapse:collapse; font-size:6.8pt; width:100%; table-layout:fixed; }
      #ucKayitPdf .fa-kutu td{ padding:1.5px 4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      #ucKayitPdf .fa-kutu td:first-child{ font-weight:700; background:#fff; width:48%; }

      #ucKayitPdf .uc-form-ustbilgi{ display:flex; align-items:stretch; border:2px solid #111827; margin-bottom:4mm; background:#fff; }
      #ucKayitPdf .uc-form-ustbilgi > div{ padding:3mm; display:flex; align-items:center; justify-content:center; border-right:2px solid #111827; background:#fff; }
      #ucKayitPdf .uc-form-ustbilgi > div:last-child{ border-right:none; }
      #ucKayitPdf .uc-form-logo{ flex:0 0 28mm; width:28mm; text-align:center; color:#94a3b8; font-size:8pt; font-weight:700; }
      #ucKayitPdf .uc-form-logo img{ max-width:24mm; max-height:16mm; }
      #ucKayitPdf .uc-form-baslik{ flex:1 1 auto; min-width:0; text-align:center; font-size:13pt; font-weight:700; color:#111827; line-height:1.3; }
      #ucKayitPdf .uc-form-fa{ flex:0 0 42mm; width:42mm; padding:2mm !important; align-items:stretch !important; }

      #ucKayitPdf .uc-form-bolum{ margin-bottom:3mm; background:#fff; }
      #ucKayitPdf .uc-form-bolum h2{ margin:0; background:#fff; color:#111827; font-size:9.5pt; padding:2mm 3mm; text-transform:uppercase; border:1px solid #111827; border-bottom:none; }
      #ucKayitPdf .uc-form-bolum table{ width:100%; border-collapse:collapse; border:1px solid #111827; }
      #ucKayitPdf .uc-form-bolum td{ border:1px solid #111827; padding:2.5mm 3mm; vertical-align:top; font-size:9pt; }
      #ucKayitPdf .uc-form-etiket{ font-weight:700; width:16%; background:#fff; white-space:pre-line; }
      #ucKayitPdf .uc-form-deger{ width:34%; white-space:pre-line; }

      #ucKayitPdf .uc-rozet{ display:inline-block; padding:2px 10px; border-radius:8px; font-size:8.5pt; font-weight:700; }
      #ucKayitPdf .uc-rozet-acik{ background:#16a34a; color:#fff; }
      #ucKayitPdf .uc-rozet-kapali{ background:#dc2626; color:#fff; }
      #ucKayitPdf .uc-rozet-risk{ display:inline-block; padding:2px 10px; border-radius:8px; font-size:8.5pt; font-weight:700; }
      #ucKayitPdf .uc-rozet-risk.dusuk{ background:#dcfce7; color:#15803d; }
      #ucKayitPdf .uc-rozet-risk.orta{ background:#fef3c7; color:#b45309; }
      #ucKayitPdf .uc-rozet-risk.yuksek, #ucKayitPdf .uc-rozet-risk.cok-yuksek{ background:#fee2e2; color:#b91c1c; }

      #ucKayitPdf .uc-form-fotograflar{ display:flex; gap:4mm; }
      #ucKayitPdf .uc-form-foto-kutu{ flex:1; border:1px solid #111827; background:#fff; }
      #ucKayitPdf .uc-form-foto-govde{ height:56mm; display:flex; align-items:center; justify-content:center; background:#fff; overflow:hidden; }
      #ucKayitPdf .uc-form-foto-govde img{ max-width:100%; max-height:100%; object-fit:contain; }
      #ucKayitPdf .uc-form-foto-etiket{ text-align:center; font-weight:700; font-size:8pt; padding:2mm; border-top:1px solid #111827; text-transform:uppercase; }

      #ucKayitPdf .uc-kroki-kutu{ position:relative; width:100%; background:#f3f4f6; border:1px solid #111827; overflow:hidden; }
      #ucKayitPdf .uc-kroki-kutu img{ display:block; width:100%; height:auto; max-height:85mm; object-fit:contain; margin:0 auto; }
      #ucKayitPdf .uc-kroki-nokta{ position:absolute; transform:translate(-50%, -100%); display:flex; flex-direction:column; align-items:center; filter:drop-shadow(0 1px 2px rgba(0,0,0,.5)); }
      #ucKayitPdf .uc-kroki-ikon{ font-size:26px; line-height:1; }
      #ucKayitPdf .uc-kroki-kod{ font-size:7.5pt; font-weight:700; background:#111827dd; color:#fff; padding:1px 5px; border-radius:3px; margin-top:1px; white-space:nowrap; }
      #ucKayitPdf .uc-kroki-tesis{ font-size:7.5pt; color:#64748b; margin-top:1.5mm; }
      #ucKayitPdf .uc-kroki-yok{ color:#64748b; font-size:9pt; text-align:center; padding:6mm; border:1px dashed #cbd5e1; }

      #ucKayitPdf .uc-form-altbilgi{ text-align:center; font-size:7.5pt; color:#64748b; margin-top:5mm; }
      #ucKayitPdf .uc-kroki-kutu-buyuk img{ max-height:70mm; }

      #ucKayitPdf table.uc-ek-foto-tablo{ width:100%; border-collapse:collapse; table-layout:fixed; }
      #ucKayitPdf table.uc-ek-foto-tablo th{ background:#e5e7eb; color:#111827; font-size:8pt; padding:3px 4px; border:1px solid #94a3b8; text-transform:uppercase; }
      #ucKayitPdf table.uc-ek-foto-tablo th:first-child, #ucKayitPdf table.uc-ek-foto-tablo td.uc-ek-foto-no{ width:8%; }
      #ucKayitPdf table.uc-ek-foto-tablo th:not(:first-child){ width:46%; }
      #ucKayitPdf table.uc-ek-foto-tablo td{ border:1px solid #cbd5e1; padding:3px; vertical-align:middle; text-align:center; overflow:hidden; }
      #ucKayitPdf table.uc-ek-foto-tablo td.uc-ek-foto-no{ font-weight:700; }
      #ucKayitPdf .uc-ek-foto-govde{ height:40mm; display:flex; align-items:center; justify-content:center; background:#f3f4f6; overflow:hidden; }
      #ucKayitPdf .uc-ek-foto-govde img{ max-width:100%; max-height:100%; object-fit:contain; }
`;

async function uygunsuzlukKayitPdfOlustur(id) {
  const k = uygunsuzlukIdIleGetirRepo(id);
  if (!k) return;

  const firma = aktifFirmaGetir();
  const logo = firma ? firmaLogoGetir(firma.id) : '';
  const acikMi = k.durum !== 'Kapalı';
  const tanim = [k.baslik, k.aciklama].filter(Boolean).join(' — ');
  const [fotoOncesiUrl, fotoSonrasiUrl, kroki, ekFotoUrlleri] = await Promise.all([
    fotoBuyukCoz(k.fotoOncesi),
    fotoBuyukCoz(k.fotoSonrasi),
    _ucKrokiGorseliniHazirla(k),
    Promise.all([2, 3, 4].map(async n => ({
      no: n,
      oncesi: await fotoBuyukCoz(k['fotoOncesi' + n]),
      sonrasi: await fotoBuyukCoz(k['fotoSonrasi' + n])
    })))
  ]);
  // Boş kalan çiftler tabloya hiç girmez.
  const ekFotoSatirlari = ekFotoUrlleri.filter(f => f.oncesi || f.sonrasi);

  const html = `
  <div id="ucKayitPdf">
    <style>${_UC_KAYIT_STIL}</style>

    <div class="uc-form-ustbilgi">
      <div class="uc-form-logo">${logo ? `<img src="${logo}">` : 'LOGO YOK'}</div>
      <div class="uc-form-baslik">UYGUNSUZLUK FORMU</div>
      <div class="uc-form-fa">${formAyarlariKutusuHtml('uygunsuzluk')}</div>
    </div>

    <div class="uc-form-bolum">
      <h2>1. Genel Bilgiler</h2>
      <table>
        ${_ucAlanSatiri('Bildirim No', _ucKacir(k.aksiyonNo), 'Bildirim Tarihi', _ucKacir(gunAyYil(k.bildirimTarihi)) || '-')}
        ${_ucAlanSatiri('Birim / Tesis', _ucKacir(k.bolum) || '-')}
        ${_ucAlanSatiri('Bildiren Kişi', _ucKacir(k.atayan) || '-', 'Risk Seviyesi', `<span class="uc-rozet-risk ${slugOlustur(k.riskSeviyesi || '')}">${_ucKacir(k.riskSeviyesi)}</span>`)}
      </table>
    </div>

    <div class="uc-form-bolum">
      <h2>2. Uygunsuzluk Detayları</h2>
      <table>
        ${_ucAlanSatiri('Tanım', _ucKacir(tanim) || '-')}
        ${_ucAlanSatiri('Kök Neden', _ucKacir(k.kokNeden) || '-')}
        ${_ucAlanSatiri('Faaliyet Önerisi', _ucKacir(k.duzelticiFaaliyet) || '-')}
        ${_ucAlanSatiri('İlgili Yasal Şartlar', _ucKacir((k.yasalSartlar && k.yasalSartlar.length) ? k.yasalSartlar.join(', ') : '-'))}
        ${_ucAlanSatiri('Yasal Dayanak / Not', _ucKacir(k.yasalDayanak) || '-')}
      </table>
    </div>

    <div class="uc-form-bolum">
      <h2>3. Aksiyon ve Kapanış</h2>
      <table>
        ${_ucAlanSatiri('Sorumlu', _ucKacir(k.sorumlu) || '-', 'Hedef Termin', _ucKacir(gunAyYil(k.termin)) || '-')}
        ${_ucAlanSatiri('Durum', _ucDurumRozet(acikMi), 'Kapanış Tarihi', _ucKacir(gunAyYil(k.kapanisTarihi)) || '-')}
        ${_ucAlanSatiri('Kapanış Notu', _ucKacir(k.kanitAciklamasi) || '-')}
      </table>
    </div>

    <div class="uc-form-bolum">
      <h2>4. Görsel Kanıtlar (Öncesi / Sonrası)</h2>
      <div style="padding:3mm;">
        <div class="uc-form-fotograflar">
          ${_ucFormFotoKutusu(fotoOncesiUrl, 'Uygunsuzluk Anı (Öncesi)')}
          ${_ucFormFotoKutusu(fotoSonrasiUrl, 'Düzeltici Faaliyet (Sonrası)')}
        </div>
      </div>
    </div>

    <div class="uc-form-altbilgi">🌱 Çevre sorumluluğunuzu düşünerek lütfen gerekmedikçe çıktı almayınız.</div>
  </div>
  `;

  // Konum krokisi sayfa 1'e eklenince (fotoğraflarla birlikte) tek A4 sayfasına
  // sığmıyordu (kullanıcı bildirdi) — bu yüzden ayrı, kendi başlık şeridini
  // tekrar eden İKİNCİ bir sayfa olarak eklenir (kapak/liste sayfalarında
  // kullanılan "her sayfa ayrı yakalanır" yöntemiyle aynı mantık).
  const sayfa2Html = `
  <div id="ucKayitPdf">
    <style>${_UC_KAYIT_STIL}</style>

    <div class="uc-form-ustbilgi">
      <div class="uc-form-logo">${logo ? `<img src="${logo}">` : 'LOGO YOK'}</div>
      <div class="uc-form-baslik">UYGUNSUZLUK FORMU</div>
      <div class="uc-form-fa">${formAyarlariKutusuHtml('uygunsuzluk')}</div>
    </div>

    ${ekFotoSatirlari.length ? `
      <div class="uc-form-bolum">
        <h2>5. Ek Fotoğraflar</h2>
        <table class="uc-ek-foto-tablo">
          <thead><tr><th>#</th><th>Öncesi</th><th>Sonrası</th></tr></thead>
          <tbody>
            ${ekFotoSatirlari.map(f => `
              <tr>
                <td class="uc-ek-foto-no">${f.no}</td>
                <td><div class="uc-ek-foto-govde">${f.oncesi ? `<img src="${f.oncesi}">` : ''}</div></td>
                <td><div class="uc-ek-foto-govde">${f.sonrasi ? `<img src="${f.sonrasi}">` : ''}</div></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : ''}

    <div class="uc-form-bolum">
      <h2>${ekFotoSatirlari.length ? '6' : '5'}. Konum Krokisi</h2>
      <div style="padding:3mm;">
        ${kroki ? `
          <div class="uc-kroki-kutu uc-kroki-kutu-buyuk">
            <img src="${kroki.url}">
            <div class="uc-kroki-nokta" style="left:${kroki.x}%; top:${kroki.y}%;">
              <span class="uc-kroki-ikon">🔺</span>
              <span class="uc-kroki-kod">${_ucKacir(k.aksiyonNo)}</span>
            </div>
          </div>
          <div class="uc-kroki-tesis">${_ucKacir(kroki.tesisAdi)}</div>
        ` : `<div class="uc-kroki-yok">Bu kayıt için Saha Dijital Haritası'nda bir konum işaretlenmemiş.</div>`}
      </div>
    </div>

    <div class="uc-form-altbilgi">🌱 Çevre sorumluluğunuzu düşünerek lütfen gerekmedikçe çıktı almayınız.</div>
  </div>
  `;

  const mount = document.getElementById('yazdirmaAlani');
  mount.style.display = 'block';

  // html2pdf'in kenar boşluklu/oto-ölçeklemeli hattı, sağdaki 1-2px'lik
  // box-shadow çerçeve çizgisini büyütme/kesme sırasında kayıp edebiliyordu
  // (bkz. egitim/stajyer sertifikalarında aynı sorun için kullanılan çözüm) —
  // bunun yerine her sayfa tam kenardan kenara (full-bleed) ayrı ayrı
  // yakalanıp kendi PDF sayfasına eklenir; formun kendi 8mm padding'i görsel
  // kenar boşluğu görevi görür.
  const pdf = new jspdf.jsPDF('p', 'mm', 'a4');
  const sayfalar = [html, sayfa2Html];
  for (let i = 0; i < sayfalar.length; i++) {
    mount.innerHTML = sayfalar[i];
    // Kroki data: URL'i olsa bile tarayıcı boyutlarını (naturalWidth/Height)
    // henüz hesaplamamış olabilir — "height:auto" o ana kadar 0'a çözülüp
    // kutuyu görünmez yapıyordu (kullanıcı bildirdi, canlı testte doğrulandı).
    // html2canvas çağrılmadan önce sayfadaki TÜM <img>'lerin gerçekten
    // yüklenmesi/decode olması beklenir.
    await Promise.all(Array.from(document.getElementById('ucKayitPdf').querySelectorAll('img')).map(img => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise(resolve => {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      });
    }));
    const canvas = await html2canvas(document.getElementById('ucKayitPdf'), { scale: 2, backgroundColor: '#ffffff', useCORS: true });
    if (i > 0) pdf.addPage('a4', 'p');
    const genislikMm = 210;
    const yukseklikMm = canvas.height * (genislikMm / canvas.width);
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, genislikMm, yukseklikMm);
    pdf.setFontSize(8);
    pdf.setTextColor(100);
    pdf.text(`Sayfa ${i + 1} / ${sayfalar.length}`, 210 / 2, 297 - 5, { align: 'center' });
  }
  pdf.save(`Uygunsuzluk_Bildirim_${(k.aksiyonNo || id).replace(/[\\/]/g, '-')}.pdf`);

  mount.innerHTML = '';
  mount.style.display = 'none';
}
