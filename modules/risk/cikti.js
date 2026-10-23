// Risk Değerlendirmesi çıktıları: PDF Raporu (kapak + Fine-Kinney yöntem
// tabloları + özet + risk listesi), PPTX sunum ve saha kontrol Checklist'i
// (Excel + PDF) — eski isg platformundaki risk-defteri aracının PPTX/Checklist
// özellikleriyle aynı mantık, sade/siyah-beyaz görünüm (uygunsuzluk modülüyle
// tutarlı) + risk düzeyi rozetleri anlamlı olduğu için renkli bırakıldı.

// Raporlar listede seçilen sıralamayı izler (Risk No artan/azalan vb.);
// varsayılan "en son eklenen" seçiliyse raporların eski düzeni korunur:
// risk düzeyine göre yüksekten düşüğe.
function _riskRaporSirala(riskler) {
  const secim = typeof riskSiralamaDegeri === 'function' ? riskSiralamaDegeri() : 'duzey';
  const sirali = riskSiralamaUygula(riskler, secim === 'yeni' ? 'duzey' : secim);
  riskler.splice(0, riskler.length, ...sirali);
}

function _riskCiktiKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// Kullanıcı isteği: "kısaltmalarını yazalım" / "T.G. gibi" -- dar Düzey
// kolonunda (risk listesi tablosu) tam etiket yerine kısaltma basılır;
// geniş yöntem/ölçek referans tablolarında (kucuk=false) tam etiket kalır.
// Harf çakışmasını önlemek için (ör. "Önemli"/"Önemsiz" ikisi de "Ö" ile
// başlıyor) bazılarında ikinci harf, kelimenin baş harfi yerine ayırt edici
// bir harften seçildi.
const _RISK_DUZEY_KISALTMA = {
  'Önemsiz Risk': 'Ö.S.',
  'Olası Risk': 'O.L.',
  'Önemli Risk': 'Ö.M.',
  'Esaslı Risk': 'E.S.',
  'Tolerans Gösterilemez': 'T.G.',
  'Düşük Risk': 'D.Ş.',
  'Orta Risk': 'O.T.',
  'Yüksek Risk': 'Y.K.',
  'Kritik Risk': 'K.R.'
};

function _riskDuzeyRenk(etiket) {
  const harita = {
    'Önemsiz Risk': { bg: '#dcfce7', fg: '#15803d' },
    'Olası Risk': { bg: '#fef3c7', fg: '#b45309' },
    'Önemli Risk': { bg: '#ffedd5', fg: '#c2410c' },
    'Esaslı Risk': { bg: '#fee2e2', fg: '#b91c1c' },
    'Tolerans Gösterilemez': { bg: '#450a0a', fg: '#fecaca' },
    'Düşük Risk': { bg: '#dcfce7', fg: '#15803d' },
    'Orta Risk': { bg: '#fef3c7', fg: '#b45309' },
    'Yüksek Risk': { bg: '#ffedd5', fg: '#c2410c' },
    'Kritik Risk': { bg: '#450a0a', fg: '#fecaca' }
  };
  return harita[etiket] || { bg: '#e5e7eb', fg: '#111827' };
}

// Kullanıcı raporu: "tolerans gösterilemez hücre dışına çıkıyor" -- Düzey
// kolonu dar (rsk-tablo colgroup'ta ~%8) olduğundan, "Tolerans Gösterilemez"
// gibi uzun etiketler white-space:nowrap ile tek satıra zorlanınca hücre
// sınırının dışına taşıyordu. Artık satır kırılmasına izin veriliyor
// (gerekirse rozet iki satıra bölünüyor, hücreyi taşmıyor). kucuk=true iken
// (risk listesi tablosu) kullanıcı isteğiyle ("kısaltmalarını yazalım" /
// "T.G. gibi") tam etiket yerine kısaltma basılır -- bkz.
// _RISK_DUZEY_KISALTMA ve _riskDuzeyKisaltmaAciklamaHtml (açıklama metni).
function _riskDuzeyRozetHtml(etiket, kucuk) {
  const renk = _riskDuzeyRenk(etiket);
  const gosterilecekMetin = kucuk ? (_RISK_DUZEY_KISALTMA[etiket] || etiket) : etiket;
  return `<span style="display:inline-block; padding:${kucuk ? '1px 6px' : '2px 8px'}; border-radius:8px; font-size:${kucuk ? '7pt' : '8pt'}; font-weight:700; white-space:normal; line-height:1.25; word-break:break-word; background:${renk.bg}; color:${renk.fg};">${_riskCiktiKacir(gosterilecekMetin)}</span>`;
}

function _riskDuzeyKisaltmaAciklamaHtml() {
  const parcalar = Object.keys(_RISK_DUZEY_KISALTMA).map(etiket => `${_RISK_DUZEY_KISALTMA[etiket]} = ${_riskCiktiKacir(etiket)}`);
  return `<div class="rsk-kisaltma-aciklama">Düzey kısaltmaları: ${parcalar.join(' &nbsp;•&nbsp; ')}</div>`;
}

// RISK_DUZEYLERI (model.js) minExclusive'e göre azalan sırada tanımlı; ardışık
// elemanlar arasındaki farktan "N < RP ≤ M" aralık metnini türetir.
function _riskDuzeyAraligiSatirlariHtml() {
  return RISK_DUZEYLERI.map((d, i) => {
    const ustSinir = i === 0 ? null : RISK_DUZEYLERI[i - 1].minExclusive;
    const aralik = d.minExclusive === -Infinity
      ? `RP ≤ ${ustSinir}`
      : (ustSinir === null ? `RP &gt; ${d.minExclusive}` : `${d.minExclusive} &lt; RP ≤ ${ustSinir}`);
    return `<tr><td>${aralik}</td><td>${_riskDuzeyRozetHtml(d.etiket)}</td><td>${_riskCiktiKacir(d.aksiyon)}</td></tr>`;
  }).join('');
}

function _riskOlcekTablosuHtml(baslik, secenekler) {
  return `
    <table class="rsk-yontem-tablo">
      <thead><tr><th colspan="2">${_riskCiktiKacir(baslik)}</th></tr></thead>
      <tbody>
        ${secenekler.map(s => `<tr><td style="width:16mm; text-align:center; font-weight:700;">${s.deger}</td><td>${_riskCiktiKacir(s.etiket.replace(/^[-\d.]+\s*-\s*/, ''))}</td></tr>`).join('')}
      </tbody>
    </table>
  `;
}

// RISK_DUZEYLERI ile aynı mantık, MATRIS_DUZEYLERI (model.js) için — o da
// minExclusive'e göre azalan sırada tanımlı.
function _hiraDuzeyAraligiSatirlariHtml() {
  return MATRIS_DUZEYLERI.map((d, i) => {
    const ustSinir = i === 0 ? null : MATRIS_DUZEYLERI[i - 1].minExclusive;
    const aralik = d.minExclusive === -Infinity
      ? `RP ≤ ${ustSinir}`
      : (ustSinir === null ? `RP &gt; ${d.minExclusive}` : `${d.minExclusive} &lt; RP ≤ ${ustSinir}`);
    return `<tr><td>${aralik}</td><td>${_riskDuzeyRozetHtml(d.etiket)}</td><td>${_riskCiktiKacir(d.aksiyon)}</td></tr>`;
  }).join('');
}

// Rapor kapsamındaki kayıtlarda fiilen kullanılan yöntem(ler)e göre ilgili
// metodoloji açıklamasını (ya da ikisini birden, karışık rapor ise) gösterir.
function _riskYontemBolumuHtml(riskler) {
  const fineKinneyVarMi = !riskler || riskler.length === 0 || riskler.some(r => r.yontem !== '5x5');
  const matrisVarMi = (riskler || []).some(r => r.yontem === '5x5');

  const fineKinneyHtml = fineKinneyVarMi ? `
    <div class="rsk-bolum">
      <h2>Değerlendirme Yöntemi (Fine-Kinney)</h2>
      <p style="font-size:9pt; color:#374151; margin:0 0 4mm;">
        Risk Puanı (RP) = Olasılık (O) × Frekans (F) × Şiddet (Ş) formülüyle hesaplanır.
        Önlem sonrası (RP2) aynı yöntemle, önlemler uygulandıktan sonraki O/F/Ş değerleriyle yeniden hesaplanır.
      </p>
      <div style="display:flex; gap:4mm;">
        ${_riskOlcekTablosuHtml('Olasılık (O)', OLASILIK_SECENEKLERI)}
        ${_riskOlcekTablosuHtml('Frekans (F)', FREKANS_SECENEKLERI)}
        ${_riskOlcekTablosuHtml('Şiddet (Ş)', SIDDET_SECENEKLERI)}
      </div>
      <table class="rsk-yontem-tablo" style="width:100%; margin-top:4mm;">
        <thead><tr><th>Risk Puanı (RP) Aralığı</th><th>Risk Düzeyi</th><th>Gerekli Aksiyon</th></tr></thead>
        <tbody>${_riskDuzeyAraligiSatirlariHtml()}</tbody>
      </table>
    </div>
  ` : '';

  const hiraHtml = matrisVarMi ? `
    <div class="rsk-bolum">
      <h2>Değerlendirme Yöntemi (5x5 Matris)</h2>
      <p style="font-size:9pt; color:#374151; margin:0 0 4mm;">
        Risk Puanı (RP) = Olasılık (O) × Şiddet (Ş) formülüyle hesaplanır (5x5 skala, frekans boyutu yoktur).
        Önlem sonrası (RP2) aynı yöntemle, önlemler uygulandıktan sonraki O/Ş değerleriyle yeniden hesaplanır.
      </p>
      <div style="display:flex; gap:4mm;">
        ${_riskOlcekTablosuHtml('Olasılık (O)', MATRIS_OLASILIK_SECENEKLERI)}
        ${_riskOlcekTablosuHtml('Şiddet (Ş)', MATRIS_SIDDET_SECENEKLERI)}
      </div>
      <table class="rsk-yontem-tablo" style="width:100%; margin-top:4mm;">
        <thead><tr><th>Risk Puanı (RP) Aralığı</th><th>Risk Düzeyi</th><th>Gerekli Aksiyon</th></tr></thead>
        <tbody>${_hiraDuzeyAraligiSatirlariHtml()}</tbody>
      </table>
    </div>
  ` : '';

  return fineKinneyHtml + hiraHtml;
}

// Raporların imza bölümü: risk değerlendirme ekibi ([{gorev, adSoyad,
// belgeNo}]). Eski çağrılar için tek bir hazırlayan adı (metin) da kabul
// edilir; hiçbir şey verilmezse yönetmelikteki görevlerle boş satırlar basılır.
function _riskEkipListesi(ekip) {
  if (Array.isArray(ekip) && ekip.length) return ekip;
  if (typeof ekip === 'string' && ekip.trim()) return [{ gorev: 'Hazırlayan', adSoyad: ekip.trim(), belgeNo: '' }];
  const gorevler = typeof RISK_EKIBI_GOREVLERI !== 'undefined' ? RISK_EKIBI_GOREVLERI : ['İşveren / İşveren Vekili', 'İş Güvenliği Uzmanı', 'İşyeri Hekimi', 'Çalışan Temsilcisi', 'Destek Elemanı', 'Bilgi Sahibi Çalışan'];
  return gorevler.map(gorev => ({ gorev, adSoyad: '', belgeNo: '' }));
}

function _riskFotoHucre(url) {
  return url ? `<img class="rsk-foto-thumb" src="${url}">` : '<div class="rsk-foto-bos"></div>';
}

// Kullanıcı raporu (2026-10-22): "word'de risk puanları olasılık şiddet vb
// yok" -- rapor tablosu artık O/F/Ş, önlemler ve önlem sonrası O₂/F₂/Ş₂ ile
// RP2 düzeyini de gösteriyor. PDF ve Word aynı sütun listesini kullanır.
// Bölüm sütunu tek konu filtrelenmemişse ya da riskler konudan farklı bir
// bölüme (altBolum) yazılmışsa, fotoğraf sütunları
// yalnızca raporda en az bir fotoğraf varsa eklenir (gereksiz yer kaplamasın).
function _riskRaporOnlemMetni(r) {
  return [r.onlem, r.planlanan ? 'Planlanan: ' + r.planlanan : ''].filter(Boolean).join('\n');
}

function _riskRaporKolonlari(riskler, bolumFiltreli) {
  const fotoVar = riskler.some(r => r.fotoOncesi || r.fotoSonrasi);
  const deger = v => (v === null || v === undefined || v === '') ? '-' : String(v);
  const f = (r, alan) => r.yontem === '5x5' ? '-' : deger(r[alan]);
  const kolonlar = [
    { baslik: 'No', g: 4.5, metin: r => r.riskNo },
    (!bolumFiltreli || riskler.some(r => r.altBolum && r.altBolum !== r.bolum)) && { baslik: 'Bölüm', g: 6.5, metin: riskBolumGoruntu },
    { baslik: 'Faaliyet / Yer', g: 8, metin: r => [r.faaliyet, r.yer].filter(Boolean).join(' / ') },
    { baslik: 'Tehlike', g: 11, metin: r => r.tehlike },
    { baslik: 'Risk', g: 9, metin: r => r.risk },
    { baslik: 'O', g: 2.6, ortala: true, metin: r => deger(r.O) },
    { baslik: 'F', g: 2.6, ortala: true, metin: r => f(r, 'F') },
    { baslik: 'Ş', g: 2.6, ortala: true, metin: r => deger(r.S) },
    { baslik: 'RP1', g: 3.4, ortala: true, kalin: true, metin: r => deger(r.RP1) },
    { baslik: 'Düzey', g: 3.6, duzey: r => r.duzey1 },
    fotoVar && { baslik: 'Öncesi', g: 5, foto: r => r.fotoOncesi },
    { baslik: 'Önlemler', g: 17, metin: _riskRaporOnlemMetni },
    { baslik: 'O₂', g: 2.6, ortala: true, metin: r => deger(r.On) },
    { baslik: 'F₂', g: 2.6, ortala: true, metin: r => f(r, 'Fn') },
    { baslik: 'Ş₂', g: 2.6, ortala: true, metin: r => deger(r.Sn) },
    { baslik: 'RP2', g: 3.4, ortala: true, kalin: true, metin: r => deger(r.RP2) },
    { baslik: 'Düzey₂', g: 3.6, duzey: r => r.duzey2 },
    { baslik: 'Azalma', g: 3.6, ortala: true, metin: r => deger(r.azalma) },
    fotoVar && { baslik: 'Sonrası', g: 5, foto: r => r.fotoSonrasi },
    { baslik: 'Sorumlu', g: 5, metin: r => deger(r.sorumlu) },
    { baslik: 'Termin', g: 4.5, metin: r => deger(gunAyYil(r.termin)) },
    { baslik: 'Durum', g: 4.5, metin: r => deger(r.durumGoruntu) }
  ].filter(Boolean);
  const toplam = kolonlar.reduce((t, k) => t + k.g, 0);
  kolonlar.forEach(k => { k.yuzde = Math.round(k.g / toplam * 1000) / 10; });
  return kolonlar;
}

function _riskSatirHtml(r, kolonlar) {
  return '<tr>' + kolonlar.map(k => {
    if (k.duzey) return `<td>${k.duzey(r) ? _riskDuzeyRozetHtml(k.duzey(r), true) : '-'}</td>`;
    if (k.foto) return `<td>${_riskFotoHucre(k.foto(r))}</td>`;
    const stil = [k.ortala ? 'text-align:center;' : '', k.kalin ? 'font-weight:700;' : ''].join('');
    return `<td${stil ? ` style="${stil}"` : ''}>${_riskCiktiKacir(k.metin(r)).replace(/\n/g, '<br>')}</td>`;
  }).join('') + '</tr>';
}

function _riskTabloHtml(parca, kolonlar) {
  return `
    <table class="rsk-tablo">
      <colgroup>${kolonlar.map(k => `<col style="width:${k.yuzde}%">`).join('')}</colgroup>
      <thead><tr>${kolonlar.map(k => `<th>${_riskCiktiKacir(k.baslik)}</th>`).join('')}</tr></thead>
      <tbody>${parca.map(r => _riskSatirHtml(r, kolonlar)).join('')}</tbody>
    </table>
  `;
}

// Her grup kendi içinde stillenebilsin diye kapsam bir sınıf (html2pdf her
// grubu ayrı kopyalayıp çizdiğinden üst #id kapsamı kopyada kaybolur).
const _RSK_PDF_STIL = `
  .rskPdfKok{ font-family: Arial, Helvetica, sans-serif; color:#111827; background:#fff; width:100%; }
  .rskPdfKok *{ box-sizing:border-box; }

  .rskPdfKok .fa-kutu{ border-collapse:collapse; font-size:7pt; width:42mm; table-layout:fixed; }
  .rskPdfKok .fa-kutu td{ padding:1.5px 4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .rskPdfKok .fa-kutu td:first-child{ font-weight:700; background:#f1f5f9; width:48%; }

  .rskPdfKok .rsk-kapak{ position:relative; height:185mm; max-height:185mm; display:flex; align-items:center; justify-content:center; overflow:hidden; }
  .rskPdfKok .rsk-kapak-fa{ position:absolute; top:10mm; right:10mm; }
  .rskPdfKok .rsk-kapak-kutu{ width:78%; border:3px solid #111827; padding:14mm; text-align:center; }
  .rskPdfKok .rsk-kapak-kutu .rsk-firma{ font-size:12pt; font-weight:700; margin-bottom:6mm; color:#374151; }
  .rskPdfKok .rsk-kapak-kutu h1{ margin:0 0 8mm; font-size:19pt; color:#111827; }
  .rskPdfKok .rsk-kapak-kutu .rsk-tarih{ font-size:9pt; color:#374151; margin-top:8mm; }

  .rskPdfKok .rsk-liste-ustbilgi{ display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:5mm; border-bottom:2px solid #111827; padding-bottom:3mm; }
  .rskPdfKok .rsk-liste-ustbilgi h1{ margin:0; font-size:14pt; color:#111827; }
  .rskPdfKok .rsk-liste-istatistik{ display:flex; gap:6mm; }
  .rskPdfKok .rsk-liste-istatistik div{ font-size:9pt; text-align:center; }
  .rskPdfKok .rsk-liste-istatistik b{ display:block; font-size:14pt; color:#111827; }

  .rskPdfKok .rsk-bolum{ margin-bottom:6mm; page-break-inside:avoid; }
  .rskPdfKok .rsk-bolum h2{ margin:0 0 3mm; font-size:13pt; color:#111827; border-bottom:2px solid #111827; padding-bottom:2mm; }

  .rskPdfKok .rsk-yontem-tablo{ border-collapse:collapse; flex:1; font-size:7.5pt; }
  .rskPdfKok .rsk-yontem-tablo th{ background:#e5e7eb; color:#111827; padding:3px 5px; border:1px solid #94a3b8; }
  .rskPdfKok .rsk-yontem-tablo td{ padding:2.5px 5px; border:1px solid #cbd5e1; }
  .rskPdfKok .rsk-kisaltma-aciklama{ font-size:7pt; color:#4b5563; margin:2mm 0 3mm; line-height:1.5; }

  .rskPdfKok table.rsk-tablo{ width:100%; border-collapse:collapse; table-layout:fixed; }
  .rskPdfKok table.rsk-tablo th{ background:#e5e7eb; color:#111827; font-size:6.6pt; padding:3px 2px; border:1px solid #94a3b8; text-transform:uppercase; }
  .rskPdfKok table.rsk-tablo td{ font-size:6.8pt; padding:2px 3px; border:1px solid #cbd5e1; vertical-align:middle; overflow-wrap:anywhere; line-height:1.3; }
  .rskPdfKok table.rsk-tablo tr{ page-break-inside:avoid; }

  .rskPdfKok .rsk-foto-thumb{ width:100%; height:18mm; object-fit:cover; border:1px solid #cbd5e1; display:block; background:#fff; }
  .rskPdfKok .rsk-foto-bos{ width:100%; height:18mm; border:1px solid #cbd5e1; background:#f3f4f6; }

  .rskPdfKok .rsk-imza{ margin-top:6mm; border-top:1px solid #94a3b8; padding-top:4mm; display:flex; justify-content:space-between; flex-wrap:wrap; gap:4mm; font-size:9.5pt; page-break-inside:avoid; }
`;

// Kullanıcı raporu (2026-10-22): "pdf boş geliyor" -- 520 riskli Bagfaş
// analizi tek bir HTML olarak html2pdf'e verildiğinde html2canvas tek bir dev
// tuval çizmeye çalışıyor, tarayıcının tuval boyutu sınırını aşınca tuval boş
// dönüyor ve PDF boş sayfalardan oluşuyordu. Rapor artık gruplara bölünüyor
// (kapak, yöntem + ilk tablo parçası, sonraki her tablo parçası) ve her grup
// ayrı çizilip aynı PDF'e yeni sayfa olarak ekleniyor; böylece rapor boyutu
// ne olursa olsun tek bir tuval birkaç sayfayı geçmiyor. Her parçanın kendi
// başlık satırı olduğundan sütun başlıkları her sayfada yeniden görünür.
const _RSK_PDF_SATIR_PARCA = 8;

async function riskRaporuPdfOlustur(hazirlayanAdi) {
  const filtreler = riskListeFiltreleri();
  const risklerHam = riskleriGetir(document.getElementById('aramaKutusu').value, filtreler);
  if (!risklerHam.length) {
    alert('Seçili filtreler için PDF oluşturulacak risk kaydı yok.');
    return;
  }
  // fotoOncesi/fotoSonrasi ayrı Firestore belgelerine referans (fotoref:...)
  // olabilir; PDF'e gömmeden önce gerçek görsel verisine çözülür.
  const riskler = await Promise.all(risklerHam.map(async r => Object.assign({}, r, {
    fotoOncesi: await fotoBuyukCoz(r.fotoOncesi),
    fotoSonrasi: await fotoBuyukCoz(r.fotoSonrasi)
  })));
  // Farklı yöntemlerin (Fine-Kinney/5x5 Matris) ham RP değerleri kıyaslanamaz olduğundan
  // önce ortak ciddiyet sırasına, eşitlikte kendi ölçeği içindeki göreli puana göre sıralanır.
  _riskRaporSirala(riskler);

  const firma = aktifFirmaGetir();
  const bugun = gunAyYil(_bugun());
  const ozet = riskOzetiHesapla();
  const kolonlar = _riskRaporKolonlari(riskler, !!filtreler.bolum);

  const parcalar = [];
  for (let i = 0; i < riskler.length; i += _RSK_PDF_SATIR_PARCA) parcalar.push(riskler.slice(i, i + _RSK_PDF_SATIR_PARCA));

  const ekip = _riskEkipListesi(hazirlayanAdi);
  const imzaHtml = `
    <div class="rsk-imza" style="display:block;">
      <div style="font-size:11pt; font-weight:700; margin-bottom:2mm;">RİSK DEĞERLENDİRME EKİBİ</div>
      <table class="rsk-tablo" style="width:100%;">
        <colgroup><col style="width:24%"><col style="width:30%"><col style="width:18%"><col style="width:28%"></colgroup>
        <thead><tr><th>Görevi</th><th>Adı Soyadı</th><th>Belge No / Unvan</th><th>İmza</th></tr></thead>
        <tbody>${ekip.map(u => `<tr style="height:11mm;"><td>${_riskCiktiKacir(u.gorev)}</td><td>${_riskCiktiKacir(u.adSoyad)}</td><td>${_riskCiktiKacir(u.belgeNo)}</td><td></td></tr>`).join('')}</tbody>
      </table>
      <div style="margin-top:2mm; font-size:9pt;"><b>Tarih:</b> ${bugun}</div>
    </div>`;

  const gruplar = [
    `<div class="rsk-kapak">
       <div class="rsk-kapak-fa">${formAyarlariKutusuHtml('risk', null, false, null, true)}</div>
       <div class="rsk-kapak-kutu">
         <div class="rsk-firma">${_riskCiktiKacir(firma ? firma.ad : '')}</div>
         <h1>RİSK DEĞERLENDİRME RAPORU${filtreler.bolum ? '<br><span style="font-size:12pt;">' + _riskCiktiKacir(filtreler.bolum) + '</span>' : ''}</h1>
         <div class="rsk-tarih">Rapor Tarihi: ${bugun}</div>
       </div>
     </div>`,
    _riskYontemBolumuHtml(riskler)
  ];
  parcalar.forEach((parca, i) => {
    const ustbilgi = i === 0 ? `
      <div class="rsk-liste-ustbilgi">
        <h1>RİSK LİSTESİ</h1>
        <div class="rsk-liste-istatistik">
          <div><b>${ozet.toplam}</b>Toplam</div>
          <div><b>${ozet.acik}</b>Açık</div>
          <div><b>${ozet.gecikmis}</b>Gecikmiş</div>
          <div><b>${ozet.onemliVeUstu}</b>Önemli+</div>
        </div>
      </div>
      ${_riskDuzeyKisaltmaAciklamaHtml()}` : '';
    gruplar.push(ustbilgi + _riskTabloHtml(parca, kolonlar) + (i === parcalar.length - 1 ? imzaHtml : ''));
  });

  const mount = document.getElementById('yazdirmaAlani');
  mount.innerHTML = gruplar.map(g => `<div class="rskPdfKok"><style>${_RSK_PDF_STIL}</style>${g}</div>`).join('');
  mount.style.display = 'block';
  const grupElemanlari = Array.from(mount.children);

  const dugme = document.getElementById('pdfRaporBtn');
  const eskiMetin = dugme ? dugme.textContent : '';
  const ilerleme = n => { if (dugme) dugme.textContent = `PDF hazırlanıyor... ${n}/${grupElemanlari.length}`; };
  if (dugme) dugme.disabled = true;

  try {
    let worker = html2pdf()
      .set({
        margin: [7, 7, 10, 7],
        filename: `Risk_Degerlendirme_Raporu_${bugun.replace(/\./g, '-')}.pdf`,
        image: { type: 'jpeg', quality: 0.92 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollX: 0, scrollY: 0 },
        jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4', compress: true },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['tr'] }
      })
      .from(grupElemanlari[0])
      .toPdf()
      .then(() => ilerleme(1));
    grupElemanlari.slice(1).forEach((el, i) => {
      worker = worker
        .get('pdf').then(pdf => { pdf.addPage(); })
        .from(el).toContainer().toCanvas().toPdf()
        .then(() => ilerleme(i + 2));
    });

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
  } catch (hata) {
    console.error(hata);
    alert('PDF oluşturulamadı: ' + (hata && hata.message ? hata.message : hata));
  } finally {
    mount.innerHTML = '';
    mount.style.display = 'none';
    if (dugme) { dugme.disabled = false; dugme.textContent = eskiMetin; }
  }
}

// ==================== WORD RAPORU ====================
// Kullanıcı isteği: "risk değerlendirmesi PDF raporu var, bunu ayrıca Word
// olarak da istiyorum" — PDF ile aynı içerik/bölüm sırası (kapak, yöntem
// tabloları, özet, risk listesi, imza), Kurul modülündeki _word* yardımcı
// desenine benzer şekilde yerel olarak tanımlandı (modüller arası script
// paylaşımı yok). Görsel sadeleştirme: öncesi/sonrası fotoğrafları PDF'teki
// gibi küçük resim olarak DEĞİL, "Var/-" olarak gösterilir (çok satırlı geniş
// tabloya onlarca görsel gömmek performans/karmaşıklık açısından orantısız);
// tam görsel karşılaştırma için PDF/PPTX çıktıları kullanılmaya devam eder.
const _RSK_WORD_METIN_BOYUT = 16;
const _RSK_WORD_BASLIK_BOYUT = 20;

function _riskWordDuzeyRengi(etiket) {
  const harita = {
    'Önemsiz Risk': 'DCFCE7', 'Olası Risk': 'FEF3C7', 'Önemli Risk': 'FFEDD5', 'Esaslı Risk': 'FEE2E2', 'Tolerans Gösterilemez': '450A0A',
    'Düşük Risk': 'DCFCE7', 'Orta Risk': 'FEF3C7', 'Yüksek Risk': 'FFEDD5', 'Kritik Risk': '450A0A'
  };
  return harita[etiket] || 'E5E7EB';
}

function _riskWordHucre(children, opts = {}) {
  return new docx.TableCell({
    children: Array.isArray(children) ? children : [children],
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    ...opts
  });
}
function _riskWordMetinHucre(metin, opts = {}) {
  return _riskWordHucre(new docx.Paragraph({ children: [new docx.TextRun({ text: String(metin ?? '') || '-', size: _RSK_WORD_METIN_BOYUT })] }), opts);
}
function _riskWordBaslikHucre(metin, opts = {}) {
  return _riskWordHucre(new docx.Paragraph({ children: [new docx.TextRun({ text: metin, bold: true, size: _RSK_WORD_METIN_BOYUT, color: 'FFFFFF' })] }), { shading: { fill: '1D4ED8', color: 'auto', type: docx.ShadingType.CLEAR }, ...opts });
}

function _riskWordOlcekTablosu(baslik, secenekler) {
  return new docx.Table({
    width: { size: 100, type: docx.WidthType.PERCENTAGE },
    rows: [
      new docx.TableRow({ children: [_riskWordBaslikHucre(baslik, { columnSpan: 2 })] }),
      ...secenekler.map(s => new docx.TableRow({ children: [
        _riskWordMetinHucre(s.deger, { width: { size: 20, type: docx.WidthType.PERCENTAGE } }),
        _riskWordMetinHucre(s.etiket.replace(/^[-\d.]+\s*-\s*/, ''), { width: { size: 80, type: docx.WidthType.PERCENTAGE } })
      ]}))
    ]
  });
}

function _riskWordDuzeyAraligiTablosu(duzeyler) {
  return new docx.Table({
    width: { size: 100, type: docx.WidthType.PERCENTAGE },
    rows: [
      new docx.TableRow({ children: ['Risk Puanı (RP) Aralığı', 'Risk Düzeyi', 'Gerekli Aksiyon'].map(h => _riskWordBaslikHucre(h)) }),
      ...duzeyler.map((d, i) => {
        const ustSinir = i === 0 ? null : duzeyler[i - 1].minExclusive;
        const aralik = d.minExclusive === -Infinity ? `RP ≤ ${ustSinir}` : (ustSinir === null ? `RP > ${d.minExclusive}` : `${d.minExclusive} < RP ≤ ${ustSinir}`);
        return new docx.TableRow({ children: [
          _riskWordMetinHucre(aralik),
          _riskWordHucre(new docx.Paragraph({ children: [new docx.TextRun({ text: d.etiket, bold: true, size: _RSK_WORD_METIN_BOYUT })] }), { shading: { fill: _riskWordDuzeyRengi(d.etiket), color: 'auto', type: docx.ShadingType.CLEAR } }),
          _riskWordMetinHucre(d.aksiyon)
        ]});
      })
    ]
  });
}

function _riskWordYontemBolumu(riskler) {
  const fineKinneyVarMi = !riskler || riskler.length === 0 || riskler.some(r => r.yontem !== '5x5');
  const matrisVarMi = (riskler || []).some(r => r.yontem === '5x5');
  const cocuklar = [];

  if (fineKinneyVarMi) {
    cocuklar.push(new docx.Paragraph({ text: 'Değerlendirme Yöntemi (Fine-Kinney)', heading: docx.HeadingLevel.HEADING_2 }));
    cocuklar.push(new docx.Paragraph({ children: [new docx.TextRun({ text: 'Risk Puanı (RP) = Olasılık (O) × Frekans (F) × Şiddet (Ş) formülüyle hesaplanır. Önlem sonrası (RP2) aynı yöntemle, önlemler uygulandıktan sonraki O/F/Ş değerleriyle yeniden hesaplanır.', size: _RSK_WORD_METIN_BOYUT })], spacing: { after: 150 } }));
    cocuklar.push(new docx.Table({
      width: { size: 100, type: docx.WidthType.PERCENTAGE },
      rows: [new docx.TableRow({ children: [
        _riskWordHucre(_riskWordOlcekTablosu('Olasılık (O)', OLASILIK_SECENEKLERI), { width: { size: 34, type: docx.WidthType.PERCENTAGE } }),
        _riskWordHucre(_riskWordOlcekTablosu('Frekans (F)', FREKANS_SECENEKLERI), { width: { size: 33, type: docx.WidthType.PERCENTAGE } }),
        _riskWordHucre(_riskWordOlcekTablosu('Şiddet (Ş)', SIDDET_SECENEKLERI), { width: { size: 33, type: docx.WidthType.PERCENTAGE } })
      ]})],
      borders: { top: { style: docx.BorderStyle.NONE, size: 0 }, bottom: { style: docx.BorderStyle.NONE, size: 0 }, left: { style: docx.BorderStyle.NONE, size: 0 }, right: { style: docx.BorderStyle.NONE, size: 0 }, insideHorizontal: { style: docx.BorderStyle.NONE, size: 0 }, insideVertical: { style: docx.BorderStyle.NONE, size: 0 } }
    }));
    cocuklar.push(new docx.Paragraph({ text: '', spacing: { after: 100 } }));
    cocuklar.push(_riskWordDuzeyAraligiTablosu(RISK_DUZEYLERI));
    cocuklar.push(new docx.Paragraph({ text: '', spacing: { after: 300 } }));
  }

  if (matrisVarMi) {
    cocuklar.push(new docx.Paragraph({ text: 'Değerlendirme Yöntemi (5x5 Matris)', heading: docx.HeadingLevel.HEADING_2 }));
    cocuklar.push(new docx.Paragraph({ children: [new docx.TextRun({ text: 'Risk Puanı (RP) = Olasılık (O) × Şiddet (Ş) formülüyle hesaplanır (5x5 skala, frekans boyutu yoktur). Önlem sonrası (RP2) aynı yöntemle, önlemler uygulandıktan sonraki O/Ş değerleriyle yeniden hesaplanır.', size: _RSK_WORD_METIN_BOYUT })], spacing: { after: 150 } }));
    cocuklar.push(new docx.Table({
      width: { size: 100, type: docx.WidthType.PERCENTAGE },
      rows: [new docx.TableRow({ children: [
        _riskWordHucre(_riskWordOlcekTablosu('Olasılık (O)', MATRIS_OLASILIK_SECENEKLERI), { width: { size: 50, type: docx.WidthType.PERCENTAGE } }),
        _riskWordHucre(_riskWordOlcekTablosu('Şiddet (Ş)', MATRIS_SIDDET_SECENEKLERI), { width: { size: 50, type: docx.WidthType.PERCENTAGE } })
      ]})],
      borders: { top: { style: docx.BorderStyle.NONE, size: 0 }, bottom: { style: docx.BorderStyle.NONE, size: 0 }, left: { style: docx.BorderStyle.NONE, size: 0 }, right: { style: docx.BorderStyle.NONE, size: 0 }, insideHorizontal: { style: docx.BorderStyle.NONE, size: 0 }, insideVertical: { style: docx.BorderStyle.NONE, size: 0 } }
    }));
    cocuklar.push(new docx.Paragraph({ text: '', spacing: { after: 100 } }));
    cocuklar.push(_riskWordDuzeyAraligiTablosu(MATRIS_DUZEYLERI));
    cocuklar.push(new docx.Paragraph({ text: '', spacing: { after: 300 } }));
  }

  return cocuklar;
}

// Sütunlar PDF ile ortak (_riskRaporKolonlari): O/F/Ş, RP1, düzey, önlemler,
// O₂/F₂/Ş₂, RP2, düzey₂, azalma... Word'de fotoğraf hücreleri "Var/-" yazar.
const _RSK_WORD_TABLO_BOYUT = 13;

function _riskWordKucukParagraflar(metin, opts = {}) {
  const satirlar = String(metin ?? '').split('\n');
  return satirlar.map(s => new docx.Paragraph({
    alignment: opts.ortala ? docx.AlignmentType.CENTER : undefined,
    children: [new docx.TextRun({ text: s || (satirlar.length === 1 ? '-' : ''), size: _RSK_WORD_TABLO_BOYUT, bold: !!opts.kalin })]
  }));
}

function _riskWordListesiTablosu(riskler, bolumFiltreli) {
  const kolonlar = _riskRaporKolonlari(riskler, bolumFiltreli);
  const genislik = k => ({ size: k.yuzde, type: docx.WidthType.PERCENTAGE });
  const hucre = (k, r) => {
    if (k.duzey) {
      const etiket = k.duzey(r);
      const koyu = etiket === 'Tolerans Gösterilemez' || etiket === 'Kritik Risk';
      return _riskWordHucre(new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: etiket ? (_RISK_DUZEY_KISALTMA[etiket] || etiket) : '-', bold: true, size: _RSK_WORD_TABLO_BOYUT, color: koyu ? 'FFFFFF' : '111827' })] }),
        etiket ? { width: genislik(k), shading: { fill: _riskWordDuzeyRengi(etiket), color: 'auto', type: docx.ShadingType.CLEAR } } : { width: genislik(k) });
    }
    if (k.foto) return _riskWordHucre(_riskWordKucukParagraflar(k.foto(r) ? 'Var' : '-', { ortala: true }), { width: genislik(k) });
    return _riskWordHucre(_riskWordKucukParagraflar(k.metin(r), { ortala: k.ortala, kalin: k.kalin }), { width: genislik(k) });
  };
  return new docx.Table({
    width: { size: 100, type: docx.WidthType.PERCENTAGE },
    rows: [
      new docx.TableRow({ tableHeader: true, children: kolonlar.map(k => _riskWordHucre(new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: k.baslik, bold: true, size: _RSK_WORD_TABLO_BOYUT, color: 'FFFFFF' })] }), { width: genislik(k), shading: { fill: '1D4ED8', color: 'auto', type: docx.ShadingType.CLEAR } })) }),
      ...riskler.map(r => new docx.TableRow({ cantSplit: true, children: kolonlar.map(k => hucre(k, r)) }))
    ]
  });
}

async function riskRaporuWordOlustur(hazirlayanAdi) {
  const filtreler = riskListeFiltreleri();
  const risklerHam = riskleriGetir(document.getElementById('aramaKutusu').value, filtreler);
  if (!risklerHam.length) {
    alert('Seçili filtreler için Word raporu oluşturulacak risk kaydı yok.');
    return;
  }
  const riskler = risklerHam.slice();
  _riskRaporSirala(riskler);

  const firma = aktifFirmaGetir();
  const bugun = gunAyYil(_bugun());
  const ozet = riskOzetiHesapla();

  const kapakCocuklari = [
    new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: firma ? firma.ad : '', bold: true, size: 24 })], spacing: { after: 300 } }),
    new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: 'RİSK DEĞERLENDİRME RAPORU', bold: true, size: 32 })], spacing: { after: 200 } }),
    ...(filtreler.bolum ? [new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: filtreler.bolum, size: 24 })], spacing: { after: 400 } })] : []),
    new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: `Rapor Tarihi: ${bugun}`, size: _RSK_WORD_METIN_BOYUT })] }),
    new docx.Paragraph({ children: [new docx.PageBreak()] })
  ];

  const ozetSatiri = new docx.Paragraph({
    children: [new docx.TextRun({ text: `Toplam: ${ozet.toplam}   •   Açık: ${ozet.acik}   •   Gecikmiş: ${ozet.gecikmis}   •   Önemli+: ${ozet.onemliVeUstu}`, bold: true, size: _RSK_WORD_METIN_BOYUT })],
    spacing: { after: 150 }
  });
  const kisaltmaSatiri = new docx.Paragraph({
    children: [new docx.TextRun({ text: 'Düzey kısaltmaları: ' + Object.keys(_RISK_DUZEY_KISALTMA).map(e => `${_RISK_DUZEY_KISALTMA[e]} = ${e}`).join('  •  '), italics: true, size: 14, color: '4B5563' })],
    spacing: { after: 200 }
  });

  const cocuklar = [
    ..._riskWordYontemBolumu(riskler),
    new docx.Paragraph({ text: 'Risk Listesi', heading: docx.HeadingLevel.HEADING_2 }),
    ozetSatiri,
    kisaltmaSatiri,
    _riskWordListesiTablosu(riskler, !!filtreler.bolum),
    new docx.Paragraph({ text: '', spacing: { after: 300 } }),
    new docx.Paragraph({ keepNext: true, children: [new docx.TextRun({ text: 'RİSK DEĞERLENDİRME EKİBİ', bold: true, size: 22 })], spacing: { after: 120 } }),
    new docx.Table({
      width: { size: 100, type: docx.WidthType.PERCENTAGE },
      rows: [
        new docx.TableRow({ tableHeader: true, cantSplit: true, children: [['Görevi', 24], ['Adı Soyadı', 30], ['Belge No / Unvan', 18], ['İmza', 28]].map(([h, g]) => _riskWordBaslikHucre(h, { width: { size: g, type: docx.WidthType.PERCENTAGE } })) }),
        ..._riskEkipListesi(hazirlayanAdi).map(u => new docx.TableRow({ cantSplit: true, height: { value: 560, rule: docx.HeightRule.ATLEAST }, children: [
          _riskWordMetinHucre(u.gorev || ' '), _riskWordMetinHucre(u.adSoyad || ' '), _riskWordMetinHucre(u.belgeNo || ' '), _riskWordMetinHucre(' ')
        ] }))
      ]
    }),
    new docx.Paragraph({ children: [new docx.TextRun({ text: `Tarih: ${bugun}`, bold: true, size: _RSK_WORD_METIN_BOYUT })], spacing: { before: 120 } })
  ];

  const darKenar = { top: 720, right: 560, bottom: 720, left: 560 };
  const doc = new docx.Document({
    sections: [
      { properties: { page: { size: { orientation: docx.PageOrientation.LANDSCAPE }, margin: darKenar } }, children: kapakCocuklari },
      { properties: { page: { size: { orientation: docx.PageOrientation.LANDSCAPE }, margin: darKenar } }, children: cocuklar }
    ]
  });
  const blob = await docx.Packer.toBlob(doc);
  saveAs(blob, `Risk_Degerlendirme_Raporu_${bugun.replace(/\./g, '-')}.docx`);
}

// ==================== EXCEL RAPORU ====================
// Kullanıcı isteği (2026-10-22): "hazır excel olarak da yapalım risk
// değerlendirmesini" -- PDF/Word ile aynı sütunlar (_riskRaporKolonlari),
// puanlar sayı olarak (Excel'de süzülüp sıralanabilsin), düzey hücreleri
// renkli, başlık her sayfada tekrar eden yatay A4 yazdırma ayarıyla.
// İkinci sayfada Fine-Kinney / 5x5 ölçek ve düzey aralığı tabloları var.
const _RSK_EXCEL_SAYI_SUTUNLARI = new Set(['O', 'F', 'Ş', 'RP1', 'O₂', 'F₂', 'Ş₂', 'RP2']);

function _riskExcelDuzeyDolgu(etiket) {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + _riskWordDuzeyRengi(etiket) } };
}

function _riskExcelHazir() {
  return new Promise(resolve => exceljsHazirOlduğunda(resolve));
}

async function riskRaporuExcelOlustur(hazirlayanAdi) {
  const filtreler = riskListeFiltreleri();
  const riskler = riskleriGetir(document.getElementById('aramaKutusu').value, filtreler);
  if (!riskler.length) {
    alert('Seçili filtreler için Excel raporu oluşturulacak risk kaydı yok.');
    return;
  }
  _riskRaporSirala(riskler);
  await _riskExcelHazir();

  const firma = aktifFirmaGetir();
  const bugun = gunAyYil(_bugun());
  const ozet = riskOzetiHesapla();
  const kolonlar = _riskRaporKolonlari(riskler, !!filtreler.bolum).filter(k => !k.foto);
  const ince = { style: 'thin', color: { argb: 'FF94A3B8' } };
  const kenar = { top: ince, bottom: ince, left: ince, right: ince };

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Risk Değerlendirmesi', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.25, right: 0.25, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 }, printTitlesRow: '5:5' },
    headerFooter: { oddFooter: '&CSayfa &P / &N' }
  });
  ws.columns = kolonlar.map(k => ({ width: Math.max(5, Math.round(k.yuzde * 2.1)) }));
  const sonHarf = ws.getColumn(kolonlar.length).letter;

  const baslikSatiri = (no, metin, boyut, kalin) => {
    ws.mergeCells(`A${no}:${sonHarf}${no}`);
    const c = ws.getCell(`A${no}`);
    c.value = metin;
    c.font = { size: boyut, bold: !!kalin };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  };
  baslikSatiri(1, firma ? firma.ad : '', 12, true);
  baslikSatiri(2, 'RİSK DEĞERLENDİRME RAPORU' + (filtreler.bolum ? ' — ' + filtreler.bolum : ''), 14, true);
  baslikSatiri(3, `Rapor Tarihi: ${bugun}   •   Toplam: ${ozet.toplam}   •   Açık: ${ozet.acik}   •   Gecikmiş: ${ozet.gecikmis}   •   Önemli+: ${ozet.onemliVeUstu}`, 10);
  ws.getRow(2).height = 22;

  const baslik = ws.getRow(5);
  baslik.values = kolonlar.map(k => k.baslik);
  baslik.height = 22;
  baslik.eachCell(c => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.border = kenar;
  });

  riskler.forEach((r, i) => {
    const satir = ws.getRow(6 + i);
    kolonlar.forEach((k, j) => {
      const c = satir.getCell(j + 1);
      if (k.duzey) {
        const etiket = k.duzey(r);
        c.value = etiket || '-';
        if (etiket) {
          c.fill = _riskExcelDuzeyDolgu(etiket);
          c.font = { bold: true, size: 9, color: { argb: etiket === 'Tolerans Gösterilemez' || etiket === 'Kritik Risk' ? 'FFFFFFFF' : 'FF111827' } };
        }
        c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      } else {
        const metin = k.metin(r);
        const sayi = Number(metin);
        c.value = _RSK_EXCEL_SAYI_SUTUNLARI.has(k.baslik) && metin !== '-' && metin !== '' && Number.isFinite(sayi) ? sayi : metin;
        c.font = { size: 9, bold: !!k.kalin };
        c.alignment = { horizontal: k.ortala ? 'center' : 'left', vertical: 'middle', wrapText: true };
      }
      c.border = kenar;
    });
  });

  const sonVeriSatiri = 5 + riskler.length;
  ws.autoFilter = { from: { row: 5, column: 1 }, to: { row: sonVeriSatiri, column: kolonlar.length } };
  ws.views = [{ state: 'frozen', ySplit: 5 }];
  ws.getCell(`A${sonVeriSatiri + 2}`).value = 'Puan sütunları sayıdır; başlıktaki filtre okları ile süzülüp sıralanabilir.';
  ws.getCell(`A${sonVeriSatiri + 2}`).font = { italic: true, size: 8, color: { argb: 'FF4B5563' } };

  // Risk değerlendirme ekibi imza tablosu (4 parça: Görevi / Adı Soyadı /
  // Belge No / İmza), sütun sayısına göre birleştirilmiş hücrelerle.
  let e = sonVeriSatiri + 4;
  ws.getCell(`A${e}`).value = 'RİSK DEĞERLENDİRME EKİBİ';
  ws.getCell(`A${e}`).font = { bold: true, size: 11 };
  e++;
  const n = kolonlar.length;
  const dilimler = [[1, Math.floor(n * 0.24)], [Math.floor(n * 0.24) + 1, Math.floor(n * 0.54)], [Math.floor(n * 0.54) + 1, Math.floor(n * 0.72)], [Math.floor(n * 0.72) + 1, n]];
  const ekipSatiri = (degerler, baslikMi) => {
    dilimler.forEach(([bas, son], i) => {
      if (son > bas) ws.mergeCells(e, bas, e, son);
      const c = ws.getCell(e, bas);
      c.value = degerler[i];
      c.alignment = { vertical: 'middle', horizontal: baslikMi ? 'center' : 'left', wrapText: true };
      c.font = baslikMi ? { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 } : { size: 10 };
      if (baslikMi) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
      for (let k = bas; k <= son; k++) ws.getCell(e, k).border = kenar;
    });
    ws.getRow(e).height = baslikMi ? 18 : 30;
    e++;
  };
  ekipSatiri(['Görevi', 'Adı Soyadı', 'Belge No / Unvan', 'İmza'], true);
  _riskEkipListesi(hazirlayanAdi).forEach(u => ekipSatiri([u.gorev, u.adSoyad, u.belgeNo, '']));
  ws.getCell(`A${e + 1}`).value = `Tarih: ${bugun}`;
  ws.getCell(`A${e + 1}`).font = { bold: true, size: 10 };

  // ---- Yöntem sayfası ----
  const ys = wb.addWorksheet('Yöntem');
  ys.columns = [{ width: 12 }, { width: 46 }, { width: 3 }, { width: 22 }, { width: 24 }, { width: 34 }];
  let y = 1;
  const olcekYaz = (baslikMetni, secenekler) => {
    ys.mergeCells(`A${y}:B${y}`);
    ys.getCell(`A${y}`).value = baslikMetni;
    ys.getCell(`A${y}`).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ys.getCell(`A${y}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
    y++;
    secenekler.forEach(s => {
      ys.getCell(`A${y}`).value = s.deger;
      ys.getCell(`A${y}`).alignment = { horizontal: 'center' };
      ys.getCell(`B${y}`).value = s.etiket.replace(/^[-\d.]+\s*-\s*/, '');
      ['A', 'B'].forEach(h => { ys.getCell(`${h}${y}`).border = kenar; });
      y++;
    });
    y++;
  };
  const duzeyYaz = (duzeyler) => {
    ['Risk Puanı (RP) Aralığı', 'Risk Düzeyi', 'Gerekli Aksiyon'].forEach((h, i) => {
      const c = ys.getCell(y, 4 + i);
      c.value = h; c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } }; c.border = kenar;
    });
    y++;
    duzeyler.forEach((d, i) => {
      const ust = i === 0 ? null : duzeyler[i - 1].minExclusive;
      const aralik = d.minExclusive === -Infinity ? `RP ≤ ${ust}` : (ust === null ? `RP > ${d.minExclusive}` : `${d.minExclusive} < RP ≤ ${ust}`);
      ys.getCell(y, 4).value = aralik;
      ys.getCell(y, 5).value = d.etiket;
      ys.getCell(y, 5).fill = _riskExcelDuzeyDolgu(d.etiket);
      ys.getCell(y, 5).font = { bold: true, color: { argb: d.etiket === 'Tolerans Gösterilemez' || d.etiket === 'Kritik Risk' ? 'FFFFFFFF' : 'FF111827' } };
      ys.getCell(y, 6).value = d.aksiyon;
      [4, 5, 6].forEach(k => { ys.getCell(y, k).border = kenar; });
      y++;
    });
    y++;
  };
  const fineKinneyVarMi = riskler.some(r => r.yontem !== '5x5');
  const matrisVarMi = riskler.some(r => r.yontem === '5x5');
  if (fineKinneyVarMi) {
    ys.getCell(`A${y}`).value = 'Değerlendirme Yöntemi (Fine-Kinney): RP = Olasılık (O) × Frekans (F) × Şiddet (Ş). RP2 önlemler sonrası O₂ × F₂ × Ş₂.';
    ys.getCell(`A${y}`).font = { bold: true };
    y += 2;
    const duzeyBaslangic = y;
    olcekYaz('Olasılık (O)', OLASILIK_SECENEKLERI);
    olcekYaz('Frekans (F)', FREKANS_SECENEKLERI);
    olcekYaz('Şiddet (Ş)', SIDDET_SECENEKLERI);
    const sonrasi = y;
    y = duzeyBaslangic;
    duzeyYaz(RISK_DUZEYLERI);
    y = Math.max(y, sonrasi);
  }
  if (matrisVarMi) {
    ys.getCell(`A${y}`).value = 'Değerlendirme Yöntemi (5x5 Matris): RP = Olasılık (O) × Şiddet (Ş).';
    ys.getCell(`A${y}`).font = { bold: true };
    y += 2;
    const duzeyBaslangic = y;
    olcekYaz('Olasılık (O)', MATRIS_OLASILIK_SECENEKLERI);
    olcekYaz('Şiddet (Ş)', MATRIS_SIDDET_SECENEKLERI);
    const sonrasi = y;
    y = duzeyBaslangic;
    duzeyYaz(MATRIS_DUZEYLERI);
    y = Math.max(y, sonrasi);
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Risk_Degerlendirme_Raporu_${bugun.replace(/\./g, '-')}.xlsx`);
}

// ==================== PPTX ====================
// Eski isg platformundaki risk-defteri aracının PPTX çıktısıyla aynı kalıp:
// kapak + genel özet + risk başına bir slayt (öncesi/sonrası fotoğraflı).

async function riskPptxOlustur() {
  const filtreler = riskListeFiltreleri();
  const risklerHam = riskleriGetir(document.getElementById('aramaKutusu').value, filtreler);
  if (!risklerHam.length) {
    alert('Seçili filtreler için sunum oluşturulacak risk kaydı yok.');
    return;
  }
  const riskler = await Promise.all(risklerHam.map(async r => Object.assign({}, r, {
    fotoOncesi: await fotoBuyukCoz(r.fotoOncesi),
    fotoSonrasi: await fotoBuyukCoz(r.fotoSonrasi)
  })));
  // Farklı yöntemlerin (Fine-Kinney/5x5 Matris) ham RP değerleri kıyaslanamaz olduğundan
  // önce ortak ciddiyet sırasına, eşitlikte kendi ölçeği içindeki göreli puana göre sıralanır.
  _riskRaporSirala(riskler);

  const firma = aktifFirmaGetir();
  const baslik = 'RİSK DEĞERLENDİRME' + (filtreler.bolum ? ' – ' + filtreler.bolum : '');

  const pptx = new PptxGenJS();
  pptx.author = (firma && firma.ad) || 'İSG Yönetim Platformu';
  pptx.company = (firma && firma.ad) || '';
  pptx.title = baslik;

  // Kapak
  {
    const s = pptx.addSlide();
    s.background = { fill: '0B2C52' };
    s.addText((firma && firma.ad) || '', { x: 1, y: 1.5, fontSize: 32, bold: true, color: 'FFFFFF' });
    s.addText(baslik, { x: 1, y: 2.4, fontSize: 20, color: 'FFFFFF' });
    s.addText(`Toplam Risk: ${riskler.length}`, { x: 1, y: 3.3, fontSize: 14, color: 'FFFFFF' });
    s.addText(`Tarih: ${gunAyYil(_bugun())}`, { x: 1, y: 3.8, fontSize: 12, color: 'FFFFFF' });
  }

  // Özet
  {
    const s = pptx.addSlide();
    const sayac = (etiket) => riskler.filter(r => r.duzey1 === etiket).length;
    s.addText('GENEL ÖZET', { x: 0.8, y: 0.5, fontSize: 22, bold: true });
    const satirlar = [
      `Toplam Risk: ${riskler.length}`,
      `Tolerans Gösterilemez: ${sayac('Tolerans Gösterilemez')}`,
      `Esaslı Risk: ${sayac('Esaslı Risk')}`,
      `Önemli Risk: ${sayac('Önemli Risk')}`,
      `Olası Risk: ${sayac('Olası Risk')}`,
      `Önemsiz Risk: ${sayac('Önemsiz Risk')}`
    ];
    s.addText(satirlar.join('\n'), { x: 0.8, y: 1.5, w: 6.8, fontSize: 15, lineSpacing: 28, valign: 'top' });
  }

  // Risk slaytları
  riskler.forEach(r => {
    const s = pptx.addSlide();
    s.addText(`RİSK – ${r.riskNo}`, { x: 0.5, y: 0.3, fontSize: 18, bold: true });
    s.addText(
      `Konu: ${r.bolum || '-'}\nBölüm: ${riskBolumGoruntu(r) || '-'}\nYer: ${r.yer || '-'}\nFaaliyet: ${r.faaliyet || '-'}\nTehlike: ${r.tehlike || '-'}\n\nRisk: ${r.risk || '-'}`,
      { x: 0.5, y: 1.2, w: 5.8, fontSize: 13 }
    );
    s.addText(`RP1: ${r.RP1}\n${r.duzey1}`, { x: 6.3, y: 1.0, fontSize: 14, bold: true });
    s.addText(`Sorumlu: ${r.sorumlu || '-'}\nTermin: ${gunAyYil(r.termin) || '-'}`, { x: 6.3, y: 2.2, fontSize: 12 });

    const renkler = { 'Açık': 'dc2626', 'Devam Ediyor': 'f59e0b', 'Kapalı': '16a34a', 'Gecikmiş': 'dc2626', 'İptal': '9ca3af' };
    s.addText((r.durumGoruntu || '-').toUpperCase(), {
      x: 7.3, y: 4.6, w: 2.2, h: 0.6,
      align: 'center', valign: 'middle',
      fontSize: 18, bold: true, color: 'FFFFFF', fill: renkler[r.durumGoruntu] || '9ca3af', rectRadius: 0.15
    });

    if (r.fotoOncesi) s.addImage(/^https?:\/\//i.test(r.fotoOncesi) ? { path: r.fotoOncesi, x: 0.5, y: 3.2, w: 3.2, h: 1.8 } : { data: r.fotoOncesi, x: 0.5, y: 3.2, w: 3.2, h: 1.8 });
    if (r.fotoSonrasi) s.addImage(/^https?:\/\//i.test(r.fotoSonrasi) ? { path: r.fotoSonrasi, x: 4.0, y: 3.2, w: 3.2, h: 1.8 } : { data: r.fotoSonrasi, x: 4.0, y: 3.2, w: 3.2, h: 1.8 });
  });

  await pptx.writeFile({ fileName: `Risk_Degerlendirme_${gunAyYil(_bugun()).replace(/\./g, '-')}.pptx` });
}

// ==================== CHECKLIST (saha kontrolü) ====================
// Mevcut risklerin sahadaki durumunun kontrolü için kullanılan, RP1'e göre
// azalan sırada, boş "Kontrol" sütunlu form — eski isg platformundaki
// risk-defteri Checklist özelliğiyle aynı mantık.

function _riskChecklistListesiHazirla() {
  const filtreler = riskListeFiltreleri();
  const riskler = riskleriGetir(document.getElementById('aramaKutusu').value, filtreler);
  return riskler.slice().sort((a, b) => b.RP1 - a.RP1);
}

function riskChecklistExcelOlustur() {
  const sirali = _riskChecklistListesiHazirla();
  if (!sirali.length) {
    alert('Seçili filtreler için checklist oluşturulacak risk kaydı yok.');
    return;
  }
  const firma = aktifFirmaGetir();
  const bolum = document.getElementById('bolumFiltre').value || 'Tüm Konular';

  xlsxHazirOlduğunda(() => {
    const ustBilgiSatirlari = [
      ['RİSK DEĞERLENDİRME KONUSU', bolum],
      ['KONTROL TARİHİ', ''],
      ['KONTROL EDEN', ''],
      ['AMAÇ', 'Mevcut risklerin sahadaki durumunun kontrolü'],
      ['NOT', 'Uygun Değil veya Kısmen işaretlenen her madde açıklanacaktır.'],
      []
    ];
    const basliklar = ['Sıra', 'Risk No', 'Yer / Ekipman', 'Faaliyet', 'Tehlike', 'Risk', 'RP1',
      'Mevcut Önlemler', 'Kontrol Sonucu (Uygun / Uygun Değil)', 'Önlem Uygulanıyor mu (E / H / Kısmen)',
      'Uygunsuzluk Var mı (E / H)', 'Açıklama'];
    const satirlar = sirali.map((r, i) => [i + 1, r.riskNo, r.yer, r.faaliyet, r.tehlike, r.risk, r.RP1, r.onlem, '', '', '', '']);

    const ws = XLSX.utils.aoa_to_sheet([...ustBilgiSatirlari, basliklar, ...satirlar]);
    ws['!cols'] = [{ wch: 6 }, { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 8 }, { wch: 35 }, { wch: 26 }, { wch: 32 }, { wch: 24 }, { wch: 40 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'RISK_CHECKLIST');
    XLSX.writeFile(wb, `Risk_Checklist_${((firma && firma.ad) || 'Firma').replace(/\s+/g, '_')}_${bolum.replace(/\s+/g, '_')}.xlsx`);
  });
}

async function riskChecklistPdfOlustur() {
  const sirali = _riskChecklistListesiHazirla();
  if (!sirali.length) {
    alert('Seçili filtreler için checklist oluşturulacak risk kaydı yok.');
    return;
  }
  const firma = aktifFirmaGetir();
  const bolum = document.getElementById('bolumFiltre').value || 'Tüm Konular';
  const bugun = gunAyYil(_bugun());

  const html = `
  <div id="rskChecklistKok">
    <style>
      #rskChecklistKok{ font-family: Arial, Helvetica, sans-serif; color:#111827; background:#fff; width:100%; font-size:9pt; }
      #rskChecklistKok *{ box-sizing:border-box; }
      #rskChecklistKok .fa-kutu{ border-collapse:collapse; font-size:7pt; width:42mm; table-layout:fixed; }
      #rskChecklistKok .fa-kutu td{ padding:1.5px 4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      #rskChecklistKok .fa-kutu td:first-child{ font-weight:700; background:#f1f5f9; width:48%; }
      #rskChecklistKok .cl-ustsatir{ display:flex; justify-content:space-between; align-items:flex-start; gap:4mm; margin-bottom:3mm; }
      #rskChecklistKok .cl-baslik{ text-align:center; font-weight:800; font-size:15pt; margin-bottom:2mm; }
      #rskChecklistKok .cl-firma{ text-align:center; font-weight:600; font-size:11pt; color:#334155; margin-bottom:5mm; }
      #rskChecklistKok .cl-bilgi{ display:flex; justify-content:space-between; flex-wrap:wrap; gap:3mm; border:1px solid #94a3b8; padding:3mm 4mm; font-size:9.5pt; margin-bottom:4mm; }
      #rskChecklistKok .cl-talimat{ border:1px solid #94a3b8; padding:3mm 4mm; font-size:9pt; margin-bottom:4mm; }
      #rskChecklistKok table.cl-tablo{ width:100%; border-collapse:collapse; table-layout:fixed; }
      #rskChecklistKok table.cl-tablo th{ background:#e5e7eb; color:#111827; border:1px solid #333; padding:4px; font-size:8.5pt; }
      #rskChecklistKok table.cl-tablo td{ border:1px solid #94a3b8; padding:4px; font-size:8.5pt; overflow-wrap:anywhere; }
      #rskChecklistKok table.cl-tablo tr{ page-break-inside:avoid; }
      #rskChecklistKok .cl-imza{ margin-top:6mm; border-top:1px solid #94a3b8; padding-top:4mm; display:flex; justify-content:space-between; flex-wrap:wrap; gap:4mm; font-size:9.5pt; }
    </style>

    <div class="cl-ustsatir">
      <div style="flex:1;">
        <div class="cl-baslik">İSG RİSK KONTROL CHECKLIST</div>
        <div class="cl-firma">${_riskCiktiKacir(firma ? firma.ad : '')}</div>
      </div>
      ${formAyarlariKutusuHtml('risk')}
    </div>

    <div class="cl-bilgi">
      <div><b>Risk Değerlendirme Konusu:</b> ${_riskCiktiKacir(bolum)}</div>
      <div><b>Kontrol Tarihi:</b> ______________</div>
      <div><b>Rapor Tarihi:</b> ${bugun}</div>
    </div>

    <div class="cl-talimat">
      <b>Talimat:</b> Bu form, mevcut risklerin sahadaki durumunun kontrolü amacıyla kullanılır.
      "Uygun Değil" veya "Kısmen" işaretlenen her madde için açıklama yazılması zorunludur.
    </div>

    <table class="cl-tablo">
      <colgroup>
        <col style="width:4%"><col style="width:9%"><col style="width:13%"><col style="width:13%">
        <col style="width:12%"><col style="width:15%"><col style="width:6%"><col style="width:16%"><col style="width:12%">
      </colgroup>
      <thead>
        <tr>
          <th>#</th><th>Risk No</th><th>Yer / Ekipman</th><th>Faaliyet</th><th>Tehlike</th>
          <th>Risk</th><th>RP1</th><th>Mevcut Önlem</th><th>Kontrol / Not</th>
        </tr>
      </thead>
      <tbody>
        ${sirali.map((r, i) => `
          <tr>
            <td style="text-align:center;">${i + 1}</td>
            <td>${_riskCiktiKacir(r.riskNo)}</td>
            <td>${_riskCiktiKacir(r.yer)}</td>
            <td>${_riskCiktiKacir(r.faaliyet)}</td>
            <td>${_riskCiktiKacir(r.tehlike)}</td>
            <td>${_riskCiktiKacir(r.risk)}</td>
            <td style="text-align:center; font-weight:700;">${r.RP1}</td>
            <td>${_riskCiktiKacir(r.onlem) || '-'}</td>
            <td style="height:14mm;"></td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="cl-imza">
      <div><b>Kontrol Eden:</b> _____________________</div>
      <div><b>İmza:</b> _____________________</div>
      <div><b>Tarih:</b> ____ / ____ / ______</div>
    </div>
  </div>
  `;

  const mount = document.getElementById('yazdirmaAlani');
  mount.innerHTML = html;
  mount.style.display = 'block';

  await html2pdf()
    .set({
      margin: [8, 8, 8, 8],
      filename: `Risk_Checklist_${((firma && firma.ad) || 'Firma').replace(/\s+/g, '_')}_${bolum.replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollX: 0, scrollY: 0 },
      jsPDF: { orientation: 'landscape', unit: 'mm', format: 'a4', compress: true },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['tr'] }
    })
    .from(mount)
    .save();

  mount.innerHTML = '';
  mount.style.display = 'none';
}
