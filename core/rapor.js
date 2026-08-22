// Ortak raporlama yardımcıları: filtrelenmiş liste raporu ve tekil kayıt kartı
// yazdırma. Var olan #yazdirmaAlani / @media print deseni (bkz. assets/style.css)
// kullanılır; ekstra kütüphane gerekmez.

function _raporKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function _raporYazdirmaAlaniniGoster(icerikHtml) {
  const mount = document.getElementById('yazdirmaAlani');
  mount.innerHTML = icerikHtml;
  mount.style.display = 'block';
  setTimeout(() => {
    window.print();
    setTimeout(() => { mount.innerHTML = ''; mount.style.display = 'none'; }, 400);
  }, 80);
}

// kolonlar: [{anahtar, baslik}], satirlar: liste (zenginleştirilmiş) kayıtlar.
function raporListesiYazdir(baslik, altBilgi, kolonlar, satirlar) {
  const basliklar = kolonlar.map(k => `<th>${_raporKacir(k.baslik)}</th>`).join('');
  const govde = satirlar.map(satir => `<tr>${kolonlar.map(k => `<td>${_raporKacir(_tarihGoruntuyeCevir(satir[k.anahtar] ?? '-'))}</td>`).join('')}</tr>`).join('');

  _raporYazdirmaAlaniniGoster(`
    <div class="doc-title">${_raporKacir(baslik)}</div>
    <div class="doc-meta">${altBilgi}<br>Toplam ${satirlar.length} kayıt</div>
    <table>${basliklar ? `<tr>${basliklar}</tr>` : ''}${govde}</table>
  `);
}

// alanlar: [{etiket, deger}] — tek kayıt için etiket/değer çiftleri, sade bir kart görünümü.
// fotograflar (opsiyonel): [{etiket, url}] — kart altına küçük resimler basar (örn. öncesi/sonrası kanıt fotoğrafı).
function raporKartiYazdir(baslik, altBilgi, alanlar, fotograflar) {
  const satirlar = alanlar.map(a => `<tr><td style="font-weight:700; width:220px;">${_raporKacir(a.etiket)}</td><td>${_raporKacir(_tarihGoruntuyeCevir(a.deger ?? '-'))}</td></tr>`).join('');
  const fotoHtml = (fotograflar || []).filter(f => f && f.url).map(f => `
    <div style="display:inline-block; margin:8px 12px 0 0; text-align:center;">
      <img src="${f.url}" style="max-width:220px; max-height:220px; object-fit:cover; border:1px solid #ccc;"><br>
      <span style="font-size:11px;">${_raporKacir(f.etiket || '')}</span>
    </div>`).join('');
  _raporYazdirmaAlaniniGoster(`
    <div class="doc-title">${_raporKacir(baslik)}</div>
    <div class="doc-meta">${altBilgi}</div>
    <table>${satirlar}</table>
    ${fotoHtml}
  `);
}
