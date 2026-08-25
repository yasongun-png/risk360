// KKD çıktıları: Zimmet ve Teslim Formu (kişi bazlı, tüm aktif KKD'leri listeler)
// ve KKD İhlal Tutanağı (eski üretim uygulamasındaki metinlerle mümkün olduğunca
// aynı, tenant'a göre firma adı dinamik). Diğer modüllerdeki PDF'lerle aynı
// kalıp: sağ üstte ortak Form Ayarları kutusu (bkz. core/form-ayarlari.js),
// tam genişlikteki kutu çerçeveleri html2canvas'ın sağ/alt kenar kırpma
// sorununu önlemek için box-shadow ile çizilir (bkz. modules/uygunsuzluk/cikti.js).

function _kkdKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

const _KKD_PDF_ORTAK_STIL = `
  *{ box-sizing:border-box; }
  font-family: Arial, Helvetica, sans-serif; color:#111827; background:#fff; font-size:9.5pt;

  .fa-kutu{ border-collapse:collapse; font-size:6.8pt; width:100%; table-layout:fixed; }
  .fa-kutu td{ padding:1.5px 4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .fa-kutu td:first-child{ font-weight:700; background:#f1f5f9; width:48%; }

  .kkd-ustbilgi{ display:flex; align-items:stretch; box-shadow: inset 0 0 0 2px #0b2c52; margin-bottom:4mm; }
  .kkd-ustbilgi > div{ padding:3mm; display:flex; align-items:center; justify-content:center; box-shadow: inset -2px 0 0 0 #0b2c52; }
  .kkd-ustbilgi > div:last-child{ box-shadow:none; }
  .kkd-logo{ flex:0 0 28mm; width:28mm; text-align:center; color:#94a3b8; font-size:8pt; font-weight:700; }
  .kkd-logo img{ max-width:24mm; max-height:16mm; }
  .kkd-baslik{ flex:1 1 auto; min-width:0; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; font-size:12.5pt; font-weight:700; color:#0b2c52; line-height:1.3; }
  .kkd-baslik small{ display:block; font-size:8pt; font-weight:400; color:#374151; margin-top:1.5mm; }
  .kkd-fa{ flex:0 0 42mm; width:42mm; padding:2mm !important; align-items:stretch !important; }

  .kkd-bolum{ margin-bottom:4mm; box-shadow: inset 0 0 0 1px #94a3b8; page-break-inside:avoid; break-inside:avoid; }
  .kkd-bolum h2{ margin:0; background:#0b2c52; color:#fff; font-size:9.5pt; padding:2mm 3mm; text-transform:uppercase; }
  .kkd-bolum table{ width:100%; border-collapse:collapse; }
  .kkd-bolum tr{ page-break-inside:avoid; break-inside:avoid; }
  .kkd-bolum td{ border:1px solid #cbd5e1; padding:2.3mm 3mm; vertical-align:top; font-size:9pt; }
  .kkd-etiket{ font-weight:700; width:20%; background:#f8fafc; }

  table.kkd-tablo{ width:100%; border-collapse:collapse; margin-bottom:4mm; }
  table.kkd-tablo th{ background:#0b2c52; color:#fff; font-size:7.8pt; padding:3px 4px; border:1px solid #0b2c52; text-transform:uppercase; }
  table.kkd-tablo td{ font-size:8.3pt; padding:3px 4px; border:1px solid #cbd5e1; }
  table.kkd-tablo tr{ page-break-inside:avoid; break-inside:avoid; }

  .kkd-beyan{ box-shadow: inset 0 0 0 1px #94a3b8; padding:3mm; margin-bottom:4mm; font-size:8.5pt; line-height:1.5; background:#f8fafc; page-break-inside:avoid; break-inside:avoid; }
  .kkd-beyan strong{ display:block; margin-bottom:1.5mm; color:#0b2c52; }

  .kkd-kanun{ box-shadow: inset 0 0 0 1px #94a3b8; padding:3mm; margin-bottom:4mm; font-size:8.8pt; line-height:1.6; page-break-inside:avoid; break-inside:avoid; }

  table.kkd-imza{ width:100%; border-collapse:collapse; margin-top:6mm; page-break-inside:avoid; break-inside:avoid; }
  table.kkd-imza tr{ page-break-inside:avoid; break-inside:avoid; }
  table.kkd-imza td{ box-shadow: inset 0 0 0 1px #cbd5e1; padding:4mm; width:50%; height:26mm; vertical-align:top; font-size:9pt; }
  table.kkd-imza .imza-baslik{ font-weight:700; color:#0b2c52; margin-bottom:2mm; text-transform:uppercase; }
  table.kkd-imza .imza-satir{ margin:1.5mm 0; }

  .kkd-altbilgi{ text-align:center; font-size:7.5pt; color:#64748b; margin-top:5mm; }
`;

function _kkdLogoHtml() {
  const firma = aktifFirmaGetir();
  const logo = firma ? firmaLogoGetir(firma.id) : '';
  return logo ? `<img src="${logo}">` : 'LOGO YOK';
}

async function _kkdPdfUret(dosyaAdi, govdeHtml) {
  const html = `<div id="kkdPdfKok"><style>#kkdPdfKok{${_KKD_PDF_ORTAK_STIL}}</style>${govdeHtml}</div>`;
  const mount = document.getElementById('yazdirmaAlani');
  mount.innerHTML = html;
  mount.style.display = 'block';

  const worker = html2pdf()
    .set({
      margin: [8, 8, 8, 8],
      filename: dosyaAdi,
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

// ==================== ZİMMET VE TESLİM FORMU ====================

function _kkdZimmetSatiriHtml(z) {
  return `
    <tr>
      <td>${_kkdKacir(z.kkdAdi)}</td>
      <td>${_kkdKacir(z.kkdTuru)}</td>
      <td>${_kkdKacir([z.marka, z.model].filter(Boolean).join(' / ')) || '-'}</td>
      <td>${_kkdKacir(z.beden) || '-'}</td>
      <td>${_kkdKacir((z.enStandartlari || []).join(', ')) || '-'}</td>
      <td>${_kkdKacir(gunAyYil(z.verilisTarihi))}</td>
      <td>${_kkdKacir(gunAyYil(z.degisimTarihi)) || '-'}</td>
      <td>${z.adet}</td>
    </tr>
  `;
}

async function kkdZimmetFormuPdfOlustur(zimmetId) {
  const zimmet = zimmetIdIleGetirRepo(zimmetId);
  if (!zimmet) return;

  const kalemler = personelinAktifZimmetleriGetir(zimmet.personelId, zimmet.personelAdi);
  const gosterilecekler = kalemler.length ? kalemler : [zimmet];
  const formNo = 'KKDZ-' + (zimmet.personelId || zimmet.zimmetNo || '').toString().replace(/[^A-Za-z0-9]/g, '').slice(-6);
  const bugun = gunAyYil(bugunIso());

  const govde = `
    <div class="kkd-ustbilgi">
      <div class="kkd-logo">${_kkdLogoHtml()}</div>
      <div class="kkd-baslik">KKD ZİMMET VE TESLİM FORMU
        <small>Kişisel Koruyucu Donanımların İşyerlerinde Kullanılması Hakkında Yönetmelik (RG 02.07.2013/28695) uyarınca düzenlenmiştir.</small>
      </div>
      <div class="kkd-fa">${formAyarlariKutusuHtml('kkd')}</div>
    </div>

    <div class="kkd-bolum">
      <h2>Personel Bilgileri</h2>
      <table>
        <tr><td class="kkd-etiket">Ad Soyad</td><td>${_kkdKacir(zimmet.personelAdi)}</td><td class="kkd-etiket">Sicil / ID</td><td>${_kkdKacir(zimmet.personelId) || '-'}</td></tr>
        <tr><td class="kkd-etiket">Bölüm</td><td>${_kkdKacir(zimmet.bolum) || '-'}</td><td class="kkd-etiket">Görev</td><td>${_kkdKacir(zimmet.gorev) || '-'}</td></tr>
        <tr><td class="kkd-etiket">Form No</td><td>${_kkdKacir(formNo)}</td><td class="kkd-etiket">Düzenleme Tarihi</td><td>${bugun}</td></tr>
      </table>
    </div>

    <table class="kkd-tablo">
      <thead><tr><th>KKD Adı</th><th>Türü</th><th>Marka / Model</th><th>Beden</th><th>EN Standartları</th><th>Veriliş Tarihi</th><th>Değişim Tarihi</th><th>Adet</th></tr></thead>
      <tbody>${gosterilecekler.map(_kkdZimmetSatiriHtml).join('')}</tbody>
    </table>

    <div class="kkd-beyan">
      <strong>Personel Beyanı</strong>
      Yukarıda listelenen kişisel koruyucu donanımları eksiksiz ve kullanılabilir durumda teslim aldığımı; bunları yalnızca ilgili işi yaparken ve üretici kullanım talimatlarına uygun şekilde kullanacağımı; KKD'de oluşacak hasar, arıza, kayıp veya değişim süresi yaklaşan durumları derhal amirime ve İSG birimine bildireceğimi; iş ilişkimin sona ermesi veya KKD'nin işlevini yitirmesi halinde teslim aldığım KKD'leri iade edeceğimi kabul ve beyan ederim.
    </div>
    <p style="font-size:8pt; color:#374151; margin:0 0 4mm;">Bu form, işveren tarafından çalışana ücretsiz temin edilen KKD'lerin zimmet kaydı olarak düzenlenmiştir; KKD'lerin bakım, onarım ve periyodik değişimi işverenin sorumluluğundadır.${zimmet.notlar ? ' Not: ' + _kkdKacir(zimmet.notlar) : ''}</p>

    <table class="kkd-imza">
      <tr>
        <td>
          <div class="imza-baslik">Teslim Eden</div>
          <div class="imza-satir">Ad Soyad: ${_kkdKacir(zimmet.teslimEden) || '-'}</div>
          <div class="imza-satir">İmza:</div>
        </td>
        <td>
          <div class="imza-baslik">Teslim Alan</div>
          <div class="imza-satir">Ad Soyad: ${_kkdKacir(zimmet.personelAdi)}</div>
          <div class="imza-satir">İmza: ${_kkdKacir(zimmet.teslimAlanImza) || ''}</div>
        </td>
      </tr>
    </table>

    <div class="kkd-altbilgi">🌱 Çevre sorumluluğunuzu düşünerek lütfen gerekmedikçe çıktı almayınız.</div>
  `;

  await _kkdPdfUret(`KKD_Zimmet_Formu_${(zimmet.personelAdi || zimmet.zimmetNo).replace(/\s+/g, '_')}.pdf`, govde);
}

// ==================== İHLAL TUTANAĞI ====================

async function kkdIhlalTutanagiPdfOlustur(ihlalId) {
  const k = ihlalIdIleGetirRepo(ihlalId);
  if (!k) return;

  const firma = aktifFirmaGetir();
  const firmaAdi = firma ? firma.ad.toLocaleUpperCase('tr-TR') : '';
  const tekrarMetni = k.tekrar === 'Evet' && k.sonIhlalTarihi
    ? `Çalışanın daha önce de işe ve bulunduğu lokasyona uygun KKD kullanmadığı tespit edilmiş olup son ihlal tarihi ${_kkdKacir(gunAyYil(k.sonIhlalTarihi))} olarak kayıt altındadır.`
    : 'Çalışanın bu kayıt kapsamında tekrar ihlal durumu bulunmamaktadır.';

  const govde = `
    <div class="kkd-ustbilgi">
      <div class="kkd-logo">${_kkdLogoHtml()}</div>
      <div class="kkd-baslik">KKD İHLAL TUTANAĞI
        <small>6331 Sayılı İş Sağlığı ve Güvenliği Kanunu ve Kişisel Koruyucu Donanımların İşyerlerinde Kullanılması Hakkında Yönetmelik kapsamında düzenlenmiştir.</small>
      </div>
      <div class="kkd-fa">${formAyarlariKutusuHtml('kkd')}</div>
    </div>

    <p style="text-align:right; font-size:9pt; margin:0 0 2mm;">Tarih: ${_kkdKacir(gunAyYil(k.tarih))}</p>
    <p style="text-align:center; font-weight:700; font-size:11pt; margin:0 0 1mm; color:#0b2c52;">${firmaAdi}</p>
    <p style="text-align:center; font-size:9pt; margin:0 0 4mm; color:#374151;">İŞ SAĞLIĞI VE GÜVENLİĞİ BİRİMİ</p>

    <div class="kkd-bolum">
      <h2>Tutanak</h2>
      <table>
        <tr><td style="font-size:9pt;">
          <p style="margin:0 0 3mm;">${_kkdKacir(k.calismaBolumu)} bölümünde çalışan, <b>${_kkdKacir(k.sicil)}</b> sicil numaralı <b>${_kkdKacir(k.adSoyad)}</b> adlı çalışanın, ${_kkdKacir(gunAyYil(k.tarih))} tarihinde saat ${_kkdKacir(k.saat)} civarında <b>${_kkdKacir(k.bolum)}</b> lokasyonunda yapılan saha kontrolünde, kullanması gereken kişisel koruyucu donanımı uygun şekilde kullanmadığı tespit edilmiştir.</p>
          <p style="margin:0 0 3mm;">Kullanmadığı / uygunsuz kullandığı KKD: <b>${_kkdKacir(k.kkd)}</b><br>İhlal türü: <b>${_kkdKacir(k.ihlalTuru)}</b><br>Uygulanan işlem: <b>${_kkdKacir(k.islem)}</b></p>
          <p style="margin:0 0 3mm;">${tekrarMetni}</p>
          <p style="margin:0;"><b>Açıklama:</b><br>${_kkdKacir(k.aciklama) || '-'}</p>
        </td></tr>
      </table>
    </div>

    <div class="kkd-kanun">
      Bu durum;<br>
      • 6331 sayılı İş Sağlığı ve Güvenliği Kanunu'nun 19. maddesi,<br>
      • Kişisel Koruyucu Donanımların İşyerlerinde Kullanılması Hakkında Yönetmelik hükümlerine aykırılık teşkil etmektedir.
    </div>

    <div class="kkd-bolum">
      <h2>Bilgiler</h2>
      <table>
        <tr><td class="kkd-etiket">Ad Soyad</td><td>${_kkdKacir(k.adSoyad)}</td></tr>
        <tr><td class="kkd-etiket">Sicil No</td><td>${_kkdKacir(k.sicil) || '-'}</td></tr>
        <tr><td class="kkd-etiket">Firma</td><td>${_kkdKacir(k.firma) || '-'}</td></tr>
        <tr><td class="kkd-etiket">Çalıştığı Bölüm / Görev</td><td>${_kkdKacir(k.calismaBolumu) || '-'}</td></tr>
        <tr><td class="kkd-etiket">Tespiti Yapan</td><td>${_kkdKacir(k.tespitEden)}</td></tr>
      </table>
    </div>

    <table class="kkd-imza">
      <tr>
        <td>
          <div class="imza-baslik">Tespit Eden</div>
          <div class="imza-satir">Ad Soyad: ${_kkdKacir(k.tespitEden)}</div>
          <div class="imza-satir">Görev: İş Güvenliği Uzmanı</div>
          <div class="imza-satir">İmza:</div>
        </td>
        <td>
          <div class="imza-baslik">Çalışan</div>
          <div class="imza-satir">Ad Soyad: ${_kkdKacir(k.adSoyad)}</div>
          <div class="imza-satir">Sicil No: ${_kkdKacir(k.sicil) || '-'}</div>
          <div class="imza-satir">İmza:</div>
        </td>
      </tr>
    </table>
  `;

  await _kkdPdfUret(`KKD_Tutanak_${(k.ihlalNo || ihlalId).replace(/[\\/]/g, '-')}.pdf`, govde);
}

// ==================== NUMUNE DEĞERLENDİRME FORMU ====================
// Kullanıcı isteği: "kkd modülüne numune deneme kısmı ekleyelim, nihayetinde
// çalışan ve İSG imzalı Numune Değerlendirme Formu".

function _kkdNumuneImzaHucresi(baslik, imza, adFallback) {
  const gorsel = imza && imza.imzaUrl ? `<img src="${imza.imzaUrl}" style="max-width:100%; max-height:16mm; margin:1mm 0;">` : '<div style="height:16mm;"></div>';
  const ad = imza ? imza.ad : (adFallback || '-');
  const tarih = imza && imza.tarih ? gunAyYil(imza.tarih.slice(0, 10)) : '-';
  return `
    <td>
      <div class="imza-baslik">${_kkdKacir(baslik)}</div>
      <div class="imza-satir">Ad Soyad: ${_kkdKacir(ad)}</div>
      <div class="imza-satir">Tarih: ${_kkdKacir(tarih)}</div>
      ${gorsel}
    </td>
  `;
}

async function kkdNumuneFormuPdfOlustur(numuneId) {
  const k = numuneIdIleGetir(numuneId);
  if (!k) return;

  const govde = `
    <div class="kkd-ustbilgi">
      <div class="kkd-logo">${_kkdLogoHtml()}</div>
      <div class="kkd-baslik">KKD NUMUNE DEĞERLENDİRME FORMU
        <small>Kişisel Koruyucu Donanımların İşyerlerinde Kullanılması Hakkında Yönetmelik kapsamında, satın alma/toplu zimmet öncesi saha denemesi değerlendirmesidir.</small>
      </div>
      <div class="kkd-fa">${formAyarlariKutusuHtml('kkd')}</div>
    </div>

    <div class="kkd-bolum">
      <h2>Numune Bilgileri</h2>
      <table>
        <tr><td class="kkd-etiket">Numune No</td><td>${_kkdKacir(k.numuneNo)}</td><td class="kkd-etiket">KKD Türü</td><td>${_kkdKacir(k.kkdTuru) || '-'}</td></tr>
        <tr><td class="kkd-etiket">KKD Adı</td><td>${_kkdKacir(k.kkdAdi)}</td><td class="kkd-etiket">Marka / Model</td><td>${_kkdKacir([k.marka, k.model].filter(Boolean).join(' / ')) || '-'}</td></tr>
        <tr><td class="kkd-etiket">Deneyen Personel</td><td>${_kkdKacir(k.personelAdSoyad) || '-'}</td><td class="kkd-etiket">Bölüm</td><td>${_kkdKacir(k.bolum) || '-'}</td></tr>
        <tr><td class="kkd-etiket">Deney Başlangıç</td><td>${_kkdKacir(gunAyYil(k.deneyBaslangic)) || '-'}</td><td class="kkd-etiket">Deney Bitiş</td><td>${_kkdKacir(gunAyYil(k.deneyBitis)) || '-'}</td></tr>
        <tr><td class="kkd-etiket">Sonuç</td><td colspan="3">${_kkdKacir(k.sonuc) || '-'}</td></tr>
      </table>
    </div>

    <div class="kkd-bolum">
      <h2>Çalışan Görüşü</h2>
      <table><tr><td style="font-size:9pt; white-space:pre-wrap;">${_kkdKacir(k.calisanGorusu) || '-'}</td></tr></table>
    </div>

    <div class="kkd-bolum">
      <h2>İSG Uzmanı Değerlendirmesi</h2>
      <table><tr><td style="font-size:9pt; white-space:pre-wrap;">${_kkdKacir(k.isgDegerlendirmesi) || '-'}</td></tr></table>
    </div>

    <table class="kkd-imza">
      <tr>
        ${_kkdNumuneImzaHucresi('Deneyen Çalışan', k.imzalar && k.imzalar.calisan, k.personelAdSoyad)}
        ${_kkdNumuneImzaHucresi('İSG Uzmanı', k.imzalar && k.imzalar.isgUzmani)}
      </tr>
    </table>

    <div class="kkd-altbilgi">🌱 Çevre sorumluluğunuzu düşünerek lütfen gerekmedikçe çıktı almayınız.</div>
  `;

  await _kkdPdfUret(`KKD_Numune_Degerlendirme_${(k.numuneNo || numuneId).replace(/[\\/]/g, '-')}.pdf`, govde);
}
