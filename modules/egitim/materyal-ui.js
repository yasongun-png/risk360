// Eğitim Materyalleri sekmesinin DOM işlemleri (bkz. materyal.js).

function _egitimMateryalBoyutMetni(bayt) {
  if (!bayt) return '-';
  if (bayt < 1024 * 1024) return Math.round(bayt / 1024) + ' KB';
  return (bayt / (1024 * 1024)).toFixed(1) + ' MB';
}

// ---- Uygulama içi önizleme (indirmeden aç) ----
// Kullanıcı isteği: "pptx, word veya pdf'i direkt açabilmek istiyorum, istersem
// indirmeden". Microsoft'un çevrimiçi görüntüleyicisi Storage adresini okuyamayıp
// "Dosya bulunamadı" verdiğinden, dosya tarayıcıda indirilip (fetch) uygulamanın
// kendi penceresinde çizilir: PDF -> tarayıcının PDF görüntüleyicisi (iframe),
// DOCX -> docx-preview, PPTX -> pptx-preview (kütüphaneler ilk kullanımda CDN'den
// yüklenir). Eski ikili .doc/.ppt biçimleri çizilemez, indirme önerilir.
const _materyalScriptOnbellek = {};

function _materyalScriptYukle(src) {
  if (!_materyalScriptOnbellek[src]) {
    _materyalScriptOnbellek[src] = new Promise((coz, reddet) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = coz;
      s.onerror = () => { delete _materyalScriptOnbellek[src]; reddet(new Error('Görüntüleyici kütüphanesi yüklenemedi (internet bağlantısını kontrol edin).')); };
      document.head.appendChild(s);
    });
  }
  return _materyalScriptOnbellek[src];
}

let _docxOnizlemeModulu = null;
async function _docxOnizlemeModuluGetir() {
  if (_docxOnizlemeModulu) return _docxOnizlemeModulu;
  await _materyalScriptYukle('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js');
  // docx-preview global adı "docx" -- Word üreten docx.js ile AYNI ad; yüklerken
  // mevcut docx.js nesnesi korunup geri konur.
  const eskiDocx = window.docx;
  await _materyalScriptYukle('https://cdn.jsdelivr.net/npm/docx-preview@0.4.1/dist/docx-preview.min.js');
  _docxOnizlemeModulu = window.docx;
  window.docx = eskiDocx;
  return _docxOnizlemeModulu;
}

// ---- PPTX sunum modu + tam ekran ----
// Kullanıcı isteği: "istersem ekranı kaplasın, pptx'i sunum şeklinde
// kullanabileyim" — PPTX tek slayt (pptx-preview mode:'slide') gösterilir,
// ←/→/Boşluk/PageUp/PageDown ile ilerlenir; "Tam Ekran" penceredeki kutuyu
// tarayıcı tam ekranına alır ve slayt yeni boyuta göre yeniden çizilir.
let _onizlemeTampon = null;
let _onizlemeUzanti = '';
let _pptxOnizleyici = null;
let _pptxSlaytIndeksi = 0;

async function _pptxSlaytiCiz() {
  const icerik = document.getElementById('materyalOnizlemeIcerik');
  icerik.innerHTML = '';
  const kap = document.createElement('div');
  kap.style.cssText = 'background:#111827; width:100%; height:100%; display:flex; align-items:center; justify-content:center; overflow:hidden;';
  icerik.appendChild(kap);
  const kullanilabilirG = icerik.clientWidth - 24;
  const kullanilabilirY = icerik.clientHeight - 24;
  const genislik = Math.max(320, Math.floor(Math.min(kullanilabilirG, kullanilabilirY * 16 / 9)));
  _pptxOnizleyici = window.pptxPreview.init(kap, { width: genislik, height: Math.round(genislik * 9 / 16), mode: 'slide' });
  await _pptxOnizleyici.preview(_onizlemeTampon);
  // Önceki konumdan devam (yeniden çizimde, örn. tam ekrana geçişte).
  for (let i = 0; i < _pptxSlaytIndeksi; i++) _pptxOnizleyici.renderNextSlide();

  // Kullanıcı isteği: "pptx'de herhangi bir yere tıkladığımda da sayfa
  // ilerlemeli" — sol tık = sonraki slayt, sağ tık = önceki slayt. Kütüphanenin
  // kendi ileri/geri düğmeleri de bu dinleyiciye düşsün diye (çift ilerleme
  // olmasın) tıklama YAKALAMA aşamasında durdurulup tek yerden yönetilir.
  // Güncelleme: ekranın SAĞ yarısına tıklayınca ileri, SOL yarısına tıklayınca geri.
  kap.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    const kutu = kap.getBoundingClientRect();
    _pptxSlaytIlerlet(e.clientX >= kutu.left + kutu.width / 2 ? 1 : -1);
  }, true);
  kap.addEventListener('contextmenu', e => { e.preventDefault(); _pptxSlaytIlerlet(-1); });
}

function _pptxSlaytIlerlet(yon) {
  if (!_pptxOnizleyici || !_onizlemeTampon) return;
  if (yon > 0) _pptxOnizleyici.renderNextSlide();
  else _pptxOnizleyici.renderPreSlide();
  _pptxSlaytIndeksi = _pptxOnizleyici.currentIndex;
}

function materyalTamEkranDegistir() {
  const kutu = document.getElementById('materyalOnizlemeKutu');
  if (document.fullscreenElement) document.exitFullscreen();
  else if (kutu.requestFullscreen) kutu.requestFullscreen();
}

document.addEventListener('fullscreenchange', async () => {
  const katman = document.getElementById('materyalOnizlemeKatmani');
  if (!katman || !katman.classList.contains('acik')) return;
  // Boyut değişti: PPTX'i yeni alana göre yeniden çiz (konum korunur).
  if (_onizlemeUzanti === 'pptx' && _onizlemeTampon) {
    await new Promise(r => setTimeout(r, 150));
    try { await _pptxSlaytiCiz(); } catch (e) { console.error(e); }
  }
});

document.addEventListener('keydown', e => {
  const katman = document.getElementById('materyalOnizlemeKatmani');
  if (!katman || !katman.classList.contains('acik') || _onizlemeUzanti !== 'pptx') return;
  if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); _pptxSlaytIlerlet(1); }
  else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); _pptxSlaytIlerlet(-1); }
});

function materyalOnizlemeKapat() {
  if (document.fullscreenElement) document.exitFullscreen();
  _onizlemeTampon = null;
  _pptxOnizleyici = null;
  _onizlemeUzanti = '';
  const katman = document.getElementById('materyalOnizlemeKatmani');
  katman.classList.remove('acik');
  const icerik = document.getElementById('materyalOnizlemeIcerik');
  const iframe = icerik.querySelector('iframe');
  if (iframe && iframe.dataset.blobUrl) URL.revokeObjectURL(iframe.dataset.blobUrl);
  icerik.innerHTML = '';
}

async function materyalOnizle(id) {
  const m = egitimMateryalleriniGetir('').find(x => x.id === id);
  if (!m) return;

  const baslik = document.getElementById('materyalOnizlemeBaslik');
  const icerik = document.getElementById('materyalOnizlemeIcerik');
  const indirLink = document.getElementById('materyalOnizlemeIndir');
  baslik.textContent = m.ad;
  indirLink.href = m.url;
  _onizlemeUzanti = '';
  _onizlemeTampon = null;
  _pptxOnizleyici = null;
  icerik.innerHTML = '<div style="padding:30px; text-align:center; color:var(--metin-soluk);">Dosya yükleniyor...</div>';
  document.getElementById('materyalOnizlemeKatmani').classList.add('acik');

  const uzanti = (String(m.dosyaAdi || '').toLowerCase().match(/\.([a-z0-9]+)$/) || [])[1] || '';
  try {
    if (uzanti === 'doc' || uzanti === 'ppt') throw new Error('Eski .doc/.ppt biçimi uygulama içinde gösterilemiyor.');
    if (!['pdf', 'docx', 'pptx'].includes(uzanti)) throw new Error('Bu dosya türü uygulama içinde gösterilemiyor.');

    const yanit = await fetch(m.url);
    if (!yanit.ok) throw new Error('Dosya depolamadan alınamadı (HTTP ' + yanit.status + ').');
    const tampon = await yanit.arrayBuffer();
    icerik.innerHTML = '';

    if (uzanti === 'pdf') {
      const blobUrl = URL.createObjectURL(new Blob([tampon], { type: 'application/pdf' }));
      const iframe = document.createElement('iframe');
      iframe.src = blobUrl;
      iframe.dataset.blobUrl = blobUrl;
      iframe.style.cssText = 'width:100%; height:100%; border:0;';
      icerik.appendChild(iframe);
    } else if (uzanti === 'docx') {
      const modul = await _docxOnizlemeModuluGetir();
      const kap = document.createElement('div');
      kap.style.cssText = 'background:#e5e7eb; padding:12px; overflow:auto; height:100%;';
      icerik.appendChild(kap);
      await modul.renderAsync(tampon, kap, null, { className: 'docx', inWrapper: true, ignoreWidth: false, breakPages: true });
    } else {
      await _materyalScriptYukle('https://cdn.jsdelivr.net/npm/pptx-preview@1.0.7/dist/pptx-preview.umd.js');
      _onizlemeTampon = tampon;
      _pptxSlaytIndeksi = 0;
      await _pptxSlaytiCiz();
    }
    _onizlemeUzanti = uzanti;
  } catch (hata) {
    console.error(hata);
    icerik.innerHTML = `<div style="padding:30px; text-align:center;">
      <p style="font-weight:600;">Dosya uygulama içinde açılamadı.</p>
      <p style="font-size:13px; color:var(--metin-soluk);">${_egKacir(hata.message || String(hata))}</p>
      <p style="font-size:13px;">Sağ üstteki <b>İndir</b> ile dosyayı indirip açabilirsiniz.</p>
    </div>`;
  }
}

function materyalTablosunuCiz(aramaMetni) {
  const govde = document.getElementById('materyalTabloGovde');
  const bosDurum = document.getElementById('materyalBosDurum');
  const liste = egitimMateryalleriniGetir(aramaMetni);

  govde.innerHTML = '';
  if (liste.length === 0) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = aramaMetni ? 'Aramanızla eşleşen materyal bulunamadı.' : 'Henüz materyal eklenmedi. "+ Materyal Yükle" ile başlayın.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  govde.innerHTML = liste.map(m => `
    <tr>
      <td>${_egKacir(m.ad)}</td>
      <td>${_egKacir(m.dosyaAdi)}</td>
      <td>${_egitimMateryalBoyutMetni(m.boyut)}</td>
      <td>${m.yuklemeTarihi ? gunAyYil(m.yuklemeTarihi.slice(0, 10)) : '-'}</td>
      <td>
        <button class="tablo-buton" data-materyal-ac="${m.id}" title="İndirmeden uygulama içinde açar">Aç</button>
        <a class="tablo-buton" href="${m.url}" target="_blank" rel="noopener">İndir</a>
        <button class="tablo-buton sil" data-materyal-sil="${m.id}">Sil</button>
      </td>
    </tr>
  `).join('');

  govde.querySelectorAll('[data-materyal-ac]').forEach(btn => {
    btn.addEventListener('click', () => materyalOnizle(btn.getAttribute('data-materyal-ac')));
  });
  govde.querySelectorAll('[data-materyal-sil]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (await onayModali('Bu materyali silmek istediğinize emin misiniz?', 'Sil')) {
        egitimMateryaliSil(btn.getAttribute('data-materyal-sil'));
        materyalTablosunuCiz(document.getElementById('materyalAramaKutusu').value);
      }
    });
  });
}

async function _materyalDosyayiYukle(dosya) {
  if (!dosya) return;

  const varsayilanAd = dosya.name.replace(/\.[^.]+$/, '');
  const ad = await metinIstemModali('Materyal için bir başlık girin', 'Örn: Amonyak Sızıntısı Toolbox Talk', varsayilanAd);
  if (ad === null) return;

  const btn = document.getElementById('materyalYukleBtn');
  const eskiMetin = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Yükleniyor...';
  try {
    const sonuc = await egitimMateryaliYukle(dosya, ad);
    if (!sonuc.basarili) alert(sonuc.hata);
    else materyalTablosunuCiz(document.getElementById('materyalAramaKutusu').value);
  } finally {
    btn.disabled = false;
    btn.textContent = eskiMetin;
  }
}

function _materyalDosyaSecildi(e) {
  const dosya = e.target.files[0];
  e.target.value = '';
  _materyalDosyayiYukle(dosya);
}

// Kullanıcı isteği: "bu alana sürüklediğimde de kayıt olsun" -- tüm
// materyal sekmesi (tablo dahil) bir bırakma (drop) alanı, dosya sürükleme
// sırasında hafif bir vurgu (kesikli çerçeve) gösterilir.
function _materyalSurukleBirakKur() {
  const alan = document.getElementById('materyalBolumu');
  let surukleSayaci = 0;

  alan.addEventListener('dragover', e => { e.preventDefault(); });
  alan.addEventListener('dragenter', e => {
    e.preventDefault();
    surukleSayaci++;
    alan.classList.add('materyal-surukle-aktif');
  });
  alan.addEventListener('dragleave', e => {
    e.preventDefault();
    surukleSayaci = Math.max(0, surukleSayaci - 1);
    if (surukleSayaci === 0) alan.classList.remove('materyal-surukle-aktif');
  });
  alan.addEventListener('drop', e => {
    e.preventDefault();
    surukleSayaci = 0;
    alan.classList.remove('materyal-surukle-aktif');
    const dosya = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (!dosya) return;
    if (!EGITIM_MATERYAL_IZIN_VERILEN_UZANTILAR.some(u => dosya.name.toLowerCase().endsWith(u))) {
      alert('Sadece PDF, PPT/PPTX veya Word dosyaları yüklenebilir.');
      return;
    }
    _materyalDosyayiYukle(dosya);
  });
}

function materyalSayfasiniBaslat() {
  document.getElementById('materyalOnizlemeKapatBtn').addEventListener('click', materyalOnizlemeKapat);
  document.getElementById('materyalTamEkranBtn').addEventListener('click', materyalTamEkranDegistir);
  document.getElementById('materyalAramaKutusu').addEventListener('input', e => materyalTablosunuCiz(e.target.value));
  document.getElementById('materyalYukleBtn').addEventListener('click', () => document.getElementById('materyalDosya').click());
  document.getElementById('materyalDosya').addEventListener('change', _materyalDosyaSecildi);
  _materyalSurukleBirakKur();
}
