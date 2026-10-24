// Toplantı Yönetimi ana sekmeleri: İSG Kurulu, ÇSGB Denetimi ve kullanıcının
// "+ Yeni Toplantı" ile açtığı her konu toplantısı (kendi adıyla ayrı sekme).
// Kullanıcı isteği (2026-10-24): "toplantı adı girilince sekme ve altındaki
// buton vb. ismi buna göre şekillensin". Konu toplantılarının verisi
// kurul_konu_* anahtarlarındadır ve ÇSGB Denetimi koduyla işlenir (bkz.
// konu-toplanti.html, ../uygunsuzluk/csgb-model.js CSGB_KONU_MODU).
// Sayfada <div class="sekme-cubugu ana-sekme-cubugu" id="toplantiAnaSekmeler">
// bulunmalı; firma verisi yüklendikten sonra çağrılır.

function _tsKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// kurul klasöründen mi (index.html, konu-toplanti.html) yoksa
// uygunsuzluk/csgb.html'den mi çağrıldığına göre göreli yol.
function _tsKurulYolu(dosya) {
  return (location.pathname.includes('/modules/kurul/') ? '' : '../kurul/') + dosya;
}

function toplantiKonulariniGetir() {
  return oku(tenantAnahtar('kurul_konu_denetimleri'), [])
    .slice()
    .sort((a, b) => (a.olusturmaTarihi || '').localeCompare(b.olusturmaTarihi || ''));
}

// aktif: 'kurul' | 'csgb' | konu toplantısının id'si
function toplantiAnaSekmeleriniCiz(aktif) {
  const cubuk = document.getElementById('toplantiAnaSekmeler');
  if (!cubuk) return;
  const sinif = anahtar => anahtar === aktif ? '' : 'sekme-seciliDegil';
  const konular = toplantiKonulariniGetir();
  // Dokümanlar düğmesi (core/dokumanlar.js) bu çubuğa eklenmiş olabilir; korunur.
  const ekler = Array.from(cubuk.children).filter(b => !b.hasAttribute('data-ts'));
  cubuk.innerHTML = `
    <button type="button" data-ts="kurul" class="${sinif('kurul')}">🏛️ İSG Kurulu</button>
    <button type="button" data-ts="csgb" class="${sinif('csgb')}">📋 ÇSGB Denetimi</button>
    ${konular.map(k => `<button type="button" data-ts="${_tsKacir(k.id)}" class="${sinif(k.id)}">🗂️ ${_tsKacir(k.ad || 'Toplantı')}</button>`).join('')}
    <button type="button" data-ts="yeni" class="sekme-seciliDegil" title="Yeni bir konuda toplantı takibi başlatır (ÇSGB Denetimi ile aynı çalışma sistemi)">+ Yeni Toplantı</button>`;
  ekler.forEach(b => cubuk.appendChild(b));

  cubuk.querySelectorAll('[data-ts]').forEach(btn => btn.addEventListener('click', () => {
    const hedef = btn.getAttribute('data-ts');
    if (hedef === aktif) return;
    if (hedef === 'kurul') location.href = _tsKurulYolu('index.html');
    else if (hedef === 'csgb') location.href = (location.pathname.includes('/modules/kurul/') ? '../uygunsuzluk/' : '') + 'csgb.html';
    else if (hedef === 'yeni') _tsYeniToplanti();
    else location.href = _tsKurulYolu('konu-toplanti.html?id=' + encodeURIComponent(hedef));
  }));

  // Konu toplantısı sayfasında başlık da toplantının adıdır.
  const konu = konular.find(k => k.id === aktif);
  if (konu) {
    const baslik = document.getElementById('konuToplantiBaslik');
    if (baslik) baslik.textContent = konu.ad;
    document.title = 'İSG Platform - ' + konu.ad;
  }
}

async function _tsYeniToplanti() {
  const ad = await metinIstemModali('Yeni toplantının adı', 'Örn. Yangın Güvenliği Komitesi, Haftalık Üretim İSG Toplantısı', '');
  if (ad === null) return;
  const temiz = ad.trim();
  if (!temiz) { alert('Toplantı adı boş olamaz.'); return; }
  const konular = oku(tenantAnahtar('kurul_konu_denetimleri'), []);
  if (konular.some(k => (k.ad || '').trim().toLocaleLowerCase('tr') === temiz.toLocaleLowerCase('tr'))) {
    alert('Bu adla bir toplantı zaten var.');
    return;
  }
  const yeni = { id: rastgeleId(), ad: temiz, notlar: '', katilimcilar: [], olusturmaTarihi: new Date().toISOString() };
  konular.push(yeni);
  const sonuc = await yazVeSonucuGetir(tenantAnahtar('kurul_konu_denetimleri'), konular);
  if (!sonuc.basarili) { alert('Toplantı kaydedilemedi, internet bağlantısını kontrol edip tekrar deneyin.'); return; }
  location.href = _tsKurulYolu('konu-toplanti.html?id=' + encodeURIComponent(yeni.id));
}
