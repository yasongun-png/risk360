// Ortak "Dokümanlar" kütüphanesi — her modülün kendi form/talimat/prosedür
// dosyaları. Kullanıcı isteği: "bütün modüllerde ayrı ayrı olsun, ismini
// dokümanlar olarak değiştir" (ilk hâli: Yüklenici > Formlar / Talimatlar).
//
// - PDF, Word, Excel, JPEG/PNG yüklenir (buton veya sürükle-bırak); yüklerken
//   ad ve tür girilir.
// - Dosya Firebase Storage'a (dokumanlar/<modül>/<firma>/), küçük metadata
//   tenantAnahtar('<modül>_dokumanlar') altına yazılır (egitim materyalleri
//   ile aynı desen). Yüklenici geriye dönük olarak 'yuklenici_formlar'
//   anahtarını kullanır.
// - Aç (indirmeden uygulama içinde), Yazdır (indirmeden), İndir, Sil.
//
// Kullanım:
//   * Modül sayfasına <script src="../../core/dokumanlar.js"></script> eklemek
//     yeterli: "← Kontrol Paneline Dön" bağlantısının yanına "📁 Dokümanlar"
//     butonu konur, tıklanınca kütüphane büyük bir pencerede açılır.
//   * Kütüphaneyi bir sekmenin içinde göstermek için (bkz. Yüklenici): sayfada
//     data-dokumanlar-satir-ici özniteliği taşıyan bir kapsayıcı olur ve
//     dokumanKutuphanesiniKur(kapsayici) çağrılır; o zaman buton eklenmez.

const DOKUMAN_TURLERI = ['Form', 'Talimat', 'Prosedür', 'Diğer'];
const DOKUMAN_UZANTILARI = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png'];
const DOKUMAN_AZAMI_BOYUT = 50 * 1024 * 1024; // 50 MB
const _DOKUMAN_ANAHTAR_ISTISNA = { yuklenici: 'yuklenici_formlar' };

let _dkmListeKutusu = null;
let _dkmSeciliDosya = null;

function _dkmModul() {
  const m = location.pathname.match(/\/modules\/([^/]+)\//);
  return m ? decodeURIComponent(m[1]) : 'genel';
}

function _dkmAnahtar() {
  const modul = _dkmModul();
  return tenantAnahtar(_DOKUMAN_ANAHTAR_ISTISNA[modul] || (modul.replace(/-/g, '_') + '_dokumanlar'));
}

function _dkmKacir(m) {
  return String(m == null ? '' : m).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function _dkmTarih(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : '-';
}

function _dkmBoyut(bayt) {
  if (!bayt) return '-';
  if (bayt < 1024 * 1024) return Math.round(bayt / 1024) + ' KB';
  return (bayt / (1024 * 1024)).toFixed(1) + ' MB';
}

function _dkmUzanti(dosyaAdi) {
  return ((String(dosyaAdi || '').toLowerCase().match(/\.([a-z0-9]+)$/) || [])[1]) || '';
}

function _dkmDosyaTuru(dosyaAdi) {
  const u = _dkmUzanti(dosyaAdi);
  if (u === 'pdf') return 'PDF';
  if (u === 'doc' || u === 'docx') return 'Word';
  if (u === 'xls' || u === 'xlsx') return 'Excel';
  if (['jpg', 'jpeg', 'png'].includes(u)) return 'Resim';
  return u.toUpperCase() || '-';
}

function _dkmUzantiGecerliMi(dosyaAdi) {
  const ad = (dosyaAdi || '').toLowerCase();
  return DOKUMAN_UZANTILARI.some(u => ad.endsWith(u));
}

function _dkmOnay(mesaj, buton) {
  return typeof onayModali === 'function' ? onayModali(mesaj, buton) : Promise.resolve(confirm(mesaj));
}

const _dkmScriptOnbellek = {};
function _dkmScriptYukle(src) {
  if (!_dkmScriptOnbellek[src]) {
    _dkmScriptOnbellek[src] = new Promise((coz, reddet) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = coz;
      s.onerror = () => { delete _dkmScriptOnbellek[src]; reddet(new Error('Gerekli kütüphane yüklenemedi (internet bağlantısını kontrol edin).')); };
      document.head.appendChild(s);
    });
  }
  return _dkmScriptOnbellek[src];
}

// Bulut depolama: sayfada firebase-storage-compat yoksa ihtiyaç anında yüklenir.
async function _dkmStorage() {
  if (typeof firebase !== 'undefined' && !firebase.storage) {
    try { await _dkmScriptYukle('https://www.gstatic.com/firebasejs/10.14.1/firebase-storage-compat.js'); } catch (e) { /* aşağıda null döner */ }
  }
  return typeof bulutStorageAl === 'function' ? bulutStorageAl() : null;
}

// ==================== Veri ====================

function dokumanlariTumunuGetir() {
  return oku(_dkmAnahtar(), []);
}

function dokumanlariGetir(aramaMetni, tur) {
  let liste = dokumanlariTumunuGetir().slice().sort((a, b) => (b.yuklemeTarihi || '').localeCompare(a.yuklemeTarihi || ''));
  if (tur) liste = liste.filter(d => d.tur === tur);
  if (!aramaMetni) return liste;
  const kucuk = aramaMetni.trim().toLocaleLowerCase('tr-TR');
  return liste.filter(d => (d.ad || '').toLocaleLowerCase('tr-TR').includes(kucuk) || (d.dosyaAdi || '').toLocaleLowerCase('tr-TR').includes(kucuk));
}

async function dokumanYukle(dosya, ad, tur) {
  if (!dosya) return { basarili: false, hata: 'Dosya seçilmedi.' };
  if (!_dkmUzantiGecerliMi(dosya.name)) return { basarili: false, hata: 'Sadece PDF, Word, Excel veya JPEG/PNG dosyaları yüklenebilir.' };
  if (dosya.size > DOKUMAN_AZAMI_BOYUT) return { basarili: false, hata: 'Dosya çok büyük (maks. 50 MB).' };

  const storage = await _dkmStorage();
  if (!storage) return { basarili: false, hata: 'Bulut depolama şu an kullanılamıyor — internet bağlantınızı kontrol edip tekrar deneyin.' };

  const firma = typeof aktifFirmaGetir === 'function' ? aktifFirmaGetir() : null;
  const temizAd = String(dosya.name || 'dosya').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-100);
  const yol = `dokumanlar/${_dkmModul()}/${firma ? firma.slug : 'ortak'}/${Date.now()}_${temizAd}`;

  let url;
  try {
    const anlik = await storage.ref().child(yol).put(dosya, { contentType: dosya.type || 'application/octet-stream' });
    url = await anlik.ref.getDownloadURL();
  } catch (hata) {
    return { basarili: false, hata: 'Dosya yüklenemedi: ' + (hata.message || hata) };
  }

  const kullanici = typeof oturumdakiKullanici === 'function' ? oturumdakiKullanici() : null;
  const kayit = {
    id: rastgeleId(),
    ad: (ad || '').trim() || dosya.name,
    tur: DOKUMAN_TURLERI.includes(tur) ? tur : 'Form',
    dosyaAdi: dosya.name,
    url,
    yol,
    boyut: dosya.size,
    yuklemeTarihi: new Date().toISOString(),
    olusturan: kullanici ? (kullanici.adSoyad || kullanici.kullaniciAdi || '') : ''
  };
  const liste = dokumanlariTumunuGetir();
  liste.push(kayit);
  yaz(_dkmAnahtar(), liste);
  return { basarili: true, dokuman: kayit };
}

async function dokumanSil(id) {
  if (typeof _silmeYetkisiKontrolEt === 'function' && !_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  const liste = dokumanlariTumunuGetir();
  const kayit = liste.find(d => d.id === id);
  if (!kayit) return { basarili: false };
  yaz(_dkmAnahtar(), liste.filter(d => d.id !== id));
  // Storage'daki dosyayı da silmeyi dene — başarısız olsa bile kayıt silinmiş olur.
  const storage = await _dkmStorage();
  if (storage && kayit.yol) storage.ref().child(kayit.yol).delete().catch(() => {});
  return { basarili: true };
}

// ==================== Arayüz ====================

function _dkmPencereleriEkle() {
  if (document.getElementById('dkmYukleKatman')) return;
  const kap = document.createElement('div');
  kap.innerHTML = `
    <div class="modal-katman" id="dkmKutuphaneKatman">
      <div class="modal-kutu" style="max-width:1000px; width:95vw; max-height:90vh; overflow:auto;">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
          <h3 style="margin:0; flex:1;">📁 Dokümanlar</h3>
          <button type="button" class="tablo-buton" id="dkmKutuphaneKapatBtn">✕ Kapat</button>
        </div>
        <div id="dkmKutuphaneIcerik"></div>
      </div>
    </div>

    <div class="modal-katman" id="dkmYukleKatman">
      <div class="modal-kutu" style="max-width:480px;">
        <h3>Doküman Yükle</h3>
        <p id="dkmYukleDosyaAdi" style="font-size:13px; color:var(--metin-soluk); margin-top:-6px;"></p>
        <label for="dkmYukleAd">Adı</label>
        <input type="text" id="dkmYukleAd" placeholder="Örn: Sıcak Çalışma İzin Formu">
        <label for="dkmYukleTur">Tür</label>
        <select id="dkmYukleTur">${DOKUMAN_TURLERI.map(t => `<option value="${t}">${t}</option>`).join('')}</select>
        <div id="dkmYukleHata" style="color:var(--hata); font-size:13px; min-height:18px;"></div>
        <div class="modal-eylemler">
          <button type="button" class="ikincil" id="dkmYukleIptalBtn">İptal</button>
          <button type="button" class="birincil" id="dkmYukleKaydetBtn">Yükle</button>
        </div>
      </div>
    </div>

    <div class="modal-katman" id="dkmOnizlemeKatman">
      <div class="modal-kutu" style="max-width:1100px; width:95vw; height:90vh; display:flex; flex-direction:column;">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
          <h3 id="dkmOnizlemeBaslik" style="margin:0; flex:1; font-size:16px;"></h3>
          <button type="button" class="tablo-buton" id="dkmOnizlemeYazdirBtn">🖨 Yazdır</button>
          <button type="button" class="tablo-buton" id="dkmOnizlemeIndirBtn">İndir</button>
          <button type="button" class="tablo-buton" id="dkmOnizlemeKapatBtn">✕ Kapat</button>
        </div>
        <div id="dkmOnizlemeIcerik" style="flex:1; min-height:0; border:1px solid var(--kenarlik); border-radius:8px; overflow:hidden;"></div>
      </div>
    </div>`;
  while (kap.firstElementChild) document.body.appendChild(kap.firstElementChild);

  document.getElementById('dkmKutuphaneKapatBtn').addEventListener('click', () => document.getElementById('dkmKutuphaneKatman').classList.remove('acik'));
  document.getElementById('dkmYukleIptalBtn').addEventListener('click', _dkmYuklemePenceresiKapat);
  document.getElementById('dkmYukleKaydetBtn').addEventListener('click', _dkmYuklemeyiKaydet);
  document.getElementById('dkmOnizlemeKapatBtn').addEventListener('click', dokumanOnizlemeKapat);
  document.getElementById('dkmOnizlemeYazdirBtn').addEventListener('click', dokumanOnizlemeyiYazdir);
}

// Kütüphaneyi (arama, filtre, yükle butonu, tablo) verilen kapsayıcıya kurar.
function dokumanKutuphanesiniKur(kapsayici) {
  _dkmPencereleriEkle();
  kapsayici.innerHTML = `
    <div class="arac-cubugu">
      <input type="text" id="dkmAramaKutusu" class="arama-kutusu" placeholder="Doküman adına göre ara...">
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <select id="dkmTurFiltre" style="width:auto; margin:0;"><option value="">Tüm Türler</option>${DOKUMAN_TURLERI.map(t => `<option value="${t}">${t}</option>`).join('')}</select>
        <button type="button" class="birincil" id="dkmYukleBtn" style="width:auto;">+ Doküman Yükle</button>
        <input type="file" id="dkmDosya" accept="${DOKUMAN_UZANTILARI.join(',')}" style="display:none;">
      </div>
    </div>
    <p style="font-size:12.5px; color:var(--metin-soluk); margin:-4px 0 10px;">PDF, Word, Excel veya JPEG/PNG yükleyebilirsiniz; dosyayı bu alana sürükleyip bırakmak da olur.</p>
    <div class="tablo-scroll">
      <table class="veri-tablosu">
        <thead><tr><th>Tür</th><th>Adı</th><th>Dosya</th><th>Boyut</th><th>Yükleme Tarihi</th><th>İşlemler</th></tr></thead>
        <tbody id="dkmTabloGovde"></tbody>
      </table>
    </div>
    <div class="bos-durum" id="dkmBosDurum"></div>`;
  _dkmListeKutusu = kapsayici;

  document.getElementById('dkmAramaKutusu').addEventListener('input', dokumanListesiniCiz);
  document.getElementById('dkmTurFiltre').addEventListener('change', dokumanListesiniCiz);
  document.getElementById('dkmYukleBtn').addEventListener('click', () => document.getElementById('dkmDosya').click());
  document.getElementById('dkmDosya').addEventListener('change', e => {
    const dosya = e.target.files[0];
    e.target.value = '';
    _dkmYuklemePenceresiAc(dosya);
  });

  // Kapsayıcının tamamı sürükle-bırak alanı.
  let sayac = 0;
  kapsayici.addEventListener('dragover', e => e.preventDefault());
  kapsayici.addEventListener('dragenter', e => { e.preventDefault(); sayac++; kapsayici.style.outline = '2px dashed var(--birincil, #2563eb)'; });
  kapsayici.addEventListener('dragleave', e => { e.preventDefault(); sayac = Math.max(0, sayac - 1); if (!sayac) kapsayici.style.outline = ''; });
  kapsayici.addEventListener('drop', e => {
    e.preventDefault();
    sayac = 0;
    kapsayici.style.outline = '';
    const dosya = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    _dkmYuklemePenceresiAc(dosya);
  });

  dokumanListesiniCiz();
}

function dokumanListesiniCiz() {
  const govde = document.getElementById('dkmTabloGovde');
  if (!govde) return;
  const bosDurum = document.getElementById('dkmBosDurum');
  const arama = document.getElementById('dkmAramaKutusu').value;
  const tur = document.getElementById('dkmTurFiltre').value;
  const liste = dokumanlariGetir(arama, tur);

  govde.innerHTML = '';
  if (!liste.length) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = arama || tur ? 'Aramanızla eşleşen doküman bulunamadı.' : 'Henüz doküman yüklenmedi. "+ Doküman Yükle" ile ya da dosyayı bu alana sürükleyerek ekleyin.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  govde.innerHTML = liste.map(d => `
    <tr>
      <td><span class="genel-rozet ${d.tur === 'Talimat' ? 'rozet-yaklasiyor' : d.tur === 'Prosedür' ? 'rozet-devam-ediyor' : d.tur === 'Diğer' ? 'rozet-normal' : 'rozet-uygun'}">${_dkmKacir(d.tur || 'Form')}</span></td>
      <td>${_dkmKacir(d.ad)}</td>
      <td>${_dkmKacir(d.dosyaAdi)} <span style="font-size:11px; color:var(--metin-soluk);">(${_dkmDosyaTuru(d.dosyaAdi)})</span></td>
      <td>${_dkmBoyut(d.boyut)}</td>
      <td>${_dkmTarih(d.yuklemeTarihi)}</td>
      <td>
        <button class="tablo-buton" data-dkm-ac="${d.id}" title="İndirmeden uygulama içinde açar">Aç</button>
        <button class="tablo-buton" data-dkm-yazdir="${d.id}" title="İndirmeden yazdırır">Yazdır</button>
        <button class="tablo-buton" data-dkm-indir="${d.id}">İndir</button>
        <button class="tablo-buton sil" data-dkm-sil="${d.id}">Sil</button>
      </td>
    </tr>`).join('');

  govde.querySelectorAll('[data-dkm-ac]').forEach(b => b.addEventListener('click', () => dokumanOnizle(b.getAttribute('data-dkm-ac'))));
  govde.querySelectorAll('[data-dkm-yazdir]').forEach(b => b.addEventListener('click', () => dokumanYazdir(b.getAttribute('data-dkm-yazdir'))));
  govde.querySelectorAll('[data-dkm-indir]').forEach(b => b.addEventListener('click', () => dokumanIndir(b.getAttribute('data-dkm-indir'))));
  govde.querySelectorAll('[data-dkm-sil]').forEach(b => b.addEventListener('click', async () => {
    if (!(await _dkmOnay('Bu dokümanı silmek istediğinize emin misiniz?', 'Sil'))) return;
    const sonuc = await dokumanSil(b.getAttribute('data-dkm-sil'));
    if (sonuc.basarili) dokumanListesiniCiz();
  }));
}

// ---- Yükleme penceresi ----

function _dkmYuklemePenceresiAc(dosya) {
  if (!dosya) return;
  if (!_dkmUzantiGecerliMi(dosya.name)) { alert('Sadece PDF, Word, Excel veya JPEG/PNG dosyaları yüklenebilir.'); return; }
  _dkmSeciliDosya = dosya;
  document.getElementById('dkmYukleDosyaAdi').textContent = dosya.name + ' (' + _dkmBoyut(dosya.size) + ')';
  document.getElementById('dkmYukleAd').value = dosya.name.replace(/\.[^.]+$/, '');
  document.getElementById('dkmYukleTur').value = document.getElementById('dkmTurFiltre').value || 'Form';
  document.getElementById('dkmYukleHata').textContent = '';
  document.getElementById('dkmYukleKatman').classList.add('acik');
  document.getElementById('dkmYukleAd').focus();
}

function _dkmYuklemePenceresiKapat() {
  document.getElementById('dkmYukleKatman').classList.remove('acik');
  _dkmSeciliDosya = null;
}

async function _dkmYuklemeyiKaydet() {
  const btn = document.getElementById('dkmYukleKaydetBtn');
  const hataEl = document.getElementById('dkmYukleHata');
  hataEl.textContent = '';
  btn.disabled = true;
  const eskiMetin = btn.textContent;
  btn.textContent = 'Yükleniyor...';
  try {
    const sonuc = await dokumanYukle(_dkmSeciliDosya, document.getElementById('dkmYukleAd').value, document.getElementById('dkmYukleTur').value);
    if (!sonuc.basarili) { hataEl.textContent = sonuc.hata; return; }
    _dkmYuklemePenceresiKapat();
    dokumanListesiniCiz();
  } finally {
    btn.disabled = false;
    btn.textContent = eskiMetin;
  }
}

// ---- İndir / indirmeden aç / yazdır ----

async function _dkmBlobAl(d) {
  const yanit = await fetch(d.url);
  if (!yanit.ok) throw new Error('Dosya depolamadan alınamadı (HTTP ' + yanit.status + ').');
  return yanit.blob();
}

async function dokumanIndir(id) {
  const d = dokumanlariTumunuGetir().find(x => x.id === id);
  if (!d) return;
  try {
    const blobUrl = URL.createObjectURL(await _dkmBlobAl(d));
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = d.dosyaAdi || 'dosya';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  } catch (hata) {
    window.open(d.url, '_blank', 'noopener'); // fetch engellenirse yeni sekmede aç
  }
}

let _dkmDocxModulu = null;
async function _dkmDocxModuluGetir() {
  if (_dkmDocxModulu) return _dkmDocxModulu;
  await _dkmScriptYukle('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js');
  // docx-preview'in global adı "docx" — Word üreten docx.js ile aynı; korunur.
  const eskiDocx = window.docx;
  await _dkmScriptYukle('https://cdn.jsdelivr.net/npm/docx-preview@0.4.1/dist/docx-preview.min.js');
  _dkmDocxModulu = window.docx;
  window.docx = eskiDocx;
  return _dkmDocxModulu;
}

async function _dkmXlsxHazir() {
  if (typeof XLSX !== 'undefined') return;
  await _dkmScriptYukle('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
}

function dokumanOnizlemeKapat() {
  const icerik = document.getElementById('dkmOnizlemeIcerik');
  icerik.querySelectorAll('[data-blob-url]').forEach(el => URL.revokeObjectURL(el.getAttribute('data-blob-url')));
  icerik.innerHTML = '';
  document.getElementById('dkmOnizlemeKatman').classList.remove('acik');
}

async function dokumanOnizle(id) {
  const d = dokumanlariTumunuGetir().find(x => x.id === id);
  if (!d) return;
  _dkmPencereleriEkle();
  const icerik = document.getElementById('dkmOnizlemeIcerik');
  document.getElementById('dkmOnizlemeBaslik').textContent = d.ad;
  document.getElementById('dkmOnizlemeIndirBtn').onclick = () => dokumanIndir(id);
  icerik.innerHTML = '<div style="padding:30px; text-align:center; color:var(--metin-soluk);">Dosya yükleniyor...</div>';
  document.getElementById('dkmOnizlemeKatman').classList.add('acik');

  const uzanti = _dkmUzanti(d.dosyaAdi);
  try {
    if (uzanti === 'doc' || uzanti === 'xls') throw new Error('Eski .doc/.xls biçimi uygulama içinde gösterilemiyor.');
    const blob = await _dkmBlobAl(d);
    icerik.innerHTML = '';

    if (uzanti === 'pdf' || ['jpg', 'jpeg', 'png'].includes(uzanti)) {
      const tip = uzanti === 'pdf' ? 'application/pdf' : (uzanti === 'png' ? 'image/png' : 'image/jpeg');
      const blobUrl = URL.createObjectURL(new Blob([blob], { type: tip }));
      if (uzanti === 'pdf') {
        icerik.innerHTML = `<iframe data-blob-url="${blobUrl}" src="${blobUrl}" style="width:100%; height:100%; border:0;"></iframe>`;
        // Yazdır'ın PDF yüklenmeden çağrılmaması için yüklenmeyi bekle.
        const iframe = icerik.querySelector('iframe');
        await new Promise(coz => { iframe.addEventListener('load', coz, { once: true }); setTimeout(coz, 4000); });
      } else {
        icerik.innerHTML = `<div style="height:100%; overflow:auto; background:#e5e7eb; text-align:center;"><img data-blob-url="${blobUrl}" src="${blobUrl}" style="max-width:100%; height:auto;"></div>`;
      }
    } else if (uzanti === 'docx') {
      const modul = await _dkmDocxModuluGetir();
      const kap = document.createElement('div');
      kap.style.cssText = 'background:#e5e7eb; padding:12px; overflow:auto; height:100%;';
      icerik.appendChild(kap);
      await modul.renderAsync(await blob.arrayBuffer(), kap, null, { className: 'docx', inWrapper: true, ignoreWidth: false, breakPages: true });
    } else if (uzanti === 'xlsx') {
      await _dkmXlsxHazir();
      const wb = XLSX.read(await blob.arrayBuffer(), { type: 'array' });
      const sayfalar = wb.SheetNames.map((ad, i) => `<button type="button" class="tablo-buton" data-dkm-sayfa="${i}">${_dkmKacir(ad)}</button>`).join(' ');
      icerik.innerHTML = `<div style="display:flex; flex-direction:column; height:100%;">
        ${wb.SheetNames.length > 1 ? `<div style="padding:6px; border-bottom:1px solid var(--kenarlik);">${sayfalar}</div>` : ''}
        <div id="dkmOnizlemeExcel" style="flex:1; overflow:auto; padding:8px; font-size:12px;"></div>
      </div>`;
      const sayfaCiz = i => {
        const kutu = document.getElementById('dkmOnizlemeExcel');
        kutu.innerHTML = XLSX.utils.sheet_to_html(wb.Sheets[wb.SheetNames[i]]);
        const tablo = kutu.querySelector('table');
        if (tablo) {
          tablo.style.borderCollapse = 'collapse';
          tablo.querySelectorAll('td').forEach(td => { td.style.border = '1px solid #cbd5e1'; td.style.padding = '3px 6px'; });
        }
      };
      icerik.querySelectorAll('[data-dkm-sayfa]').forEach(b => b.addEventListener('click', () => sayfaCiz(Number(b.getAttribute('data-dkm-sayfa')))));
      sayfaCiz(0);
    } else {
      throw new Error('Bu dosya türü uygulama içinde gösterilemiyor.');
    }
  } catch (hata) {
    console.error(hata);
    icerik.innerHTML = `<div style="padding:30px; text-align:center;">
      <p style="font-weight:600;">Dosya uygulama içinde açılamadı.</p>
      <p style="font-size:13px; color:var(--metin-soluk);">${_dkmKacir(hata.message || String(hata))}</p>
      <p style="font-size:13px;">Sağ üstteki <b>İndir</b> ile dosyayı indirip açabilirsiniz.</p>
    </div>`;
  }
}

// Önizlemede açılan içeriği yazdırır: PDF tarayıcının kendi PDF yazdırmasıyla,
// resim/Word/Excel ise görünmez bir çerçeveye kopyalanıp oradan yazdırılır.
function dokumanOnizlemeyiYazdir() {
  const icerik = document.getElementById('dkmOnizlemeIcerik');
  const pdfCerceve = icerik.querySelector('iframe');
  if (pdfCerceve) {
    try { pdfCerceve.contentWindow.focus(); pdfCerceve.contentWindow.print(); return; } catch (e) { console.error(e); }
  }
  const kaynak = icerik.querySelector('img, .docx-wrapper, #dkmOnizlemeExcel');
  if (!kaynak) { alert('Bu dosya uygulama içinde yazdırılamıyor; İndir ile indirip yazdırabilirsiniz.'); return; }

  const cerceve = document.createElement('iframe');
  cerceve.style.cssText = 'position:fixed; right:0; bottom:0; width:0; height:0; border:0;';
  document.body.appendChild(cerceve);
  const belge = cerceve.contentDocument;
  const baslik = _dkmKacir(document.getElementById('dkmOnizlemeBaslik').textContent);
  const stiller = Array.from(icerik.querySelectorAll('style')).map(s => s.outerHTML).join(''); // docx-preview stilleri
  belge.open();
  belge.write(`<!doctype html><html><head><meta charset="utf-8"><title>${baslik}</title>${stiller}
    <style>
      @page { margin: 10mm; }
      body { margin: 0; font-family: Arial, sans-serif; }
      img { max-width: 100%; height: auto; display: block; margin: 0 auto; }
      table { border-collapse: collapse; }
      #dkmOnizlemeExcel td { border: 1px solid #94a3b8; padding: 3px 6px; font-size: 11px; }
      .docx-wrapper { background: none !important; padding: 0 !important; }
      .docx-wrapper > section.docx { box-shadow: none !important; margin: 0 !important; }
    </style></head><body>${kaynak.outerHTML}</body></html>`);
  belge.close();

  const yazdir = () => {
    cerceve.contentWindow.focus();
    cerceve.contentWindow.print();
    setTimeout(() => cerceve.remove(), 1000);
  };
  const resimler = Array.from(belge.images).filter(i => !i.complete);
  if (!resimler.length) yazdir();
  else Promise.all(resimler.map(i => new Promise(coz => { i.onload = i.onerror = coz; }))).then(yazdir);
}

async function dokumanYazdir(id) {
  await dokumanOnizle(id);
  dokumanOnizlemeyiYazdir();
}

// ---- Otomatik buton (sekmesi olmayan modüller) ----

function dokumanKutuphanesiPenceresiniAc() {
  _dkmPencereleriEkle();
  const icerik = document.getElementById('dkmKutuphaneIcerik');
  if (!icerik.firstElementChild) dokumanKutuphanesiniKur(icerik);
  else dokumanListesiniCiz();
  document.getElementById('dkmKutuphaneKatman').classList.add('acik');
}

// Kullanıcı isteği: "diğer sekmelerin yanına koy" — sayfada sekme çubuğu
// varsa buton son sekmenin hemen yanına (sekme görünümünde) konur; yoksa
// "← Kontrol Paneline Dön" bağlantısının sağına. Buton data-sekme taşımaz,
// modüllerin sekme kodu onu sekme saymaz (bkz. hizmet-sozlesmesi ui.js).
function _dkmOtomatikButonuEkle() {
  if (document.querySelector('[data-dokumanlar-satir-ici]') || document.getElementById('dkmAcBtn')) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'dkmAcBtn';
  btn.textContent = '📁 Dokümanlar';
  btn.title = 'Bu modüle ait form, talimat ve prosedür dosyaları';
  btn.addEventListener('click', dokumanKutuphanesiPenceresiniAc);

  const cubuk = document.querySelector('.sekme-cubugu');
  if (cubuk) {
    btn.className = 'sekme-seciliDegil';
    const sekmeler = cubuk.querySelectorAll('button[data-sekme]');
    const son = sekmeler.length ? sekmeler[sekmeler.length - 1] : null;
    if (son && son.parentNode === cubuk) son.insertAdjacentElement('afterend', btn);
    else cubuk.appendChild(btn);
    return;
  }
  const geri = document.querySelector('a.geri-link');
  if (!geri) return;
  btn.className = 'ikincil';
  btn.style.cssText = 'float:right; width:auto; padding:7px 14px; font-size:13px; font-weight:600;';
  geri.parentNode.insertBefore(btn, geri);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _dkmOtomatikButonuEkle);
else _dkmOtomatikButonuEkle();
