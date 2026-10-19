// Tabela Kataloğu içe aktarma. Kullanıcı isteği: "katalog oluşturmak için içe
// aktarma olsun; jpeg ile veya pdf ile tek tek uyarı işareti yüklensin, adı
// girilsin; kategorilere ayır (uyarı, zorunluluk, yangın, acil durum, yasak)".
//
// Kabul edilenler:
//  - Katalog paketi (.json, tur: 'risk360-tabela-katalog-paketi'): hazır
//    { ad, kategori, foto(dataURL) } listesi (ör. levha kataloğu PDF'inden
//    bir kez çıkarılmış set).
//  - JPEG/PNG: her resim bir levha; ad dosya adından gelir.
//  - PDF: her sayfa bir levha (beyaz kenarlar kırpılır).
// Önce gözden geçirme listesi açılır (ad, kategori, dahil et); "Kataloğa
// Kaydet" ile görseller fotoref olarak kaydedilir ve katalog TEK yazımla
// güncellenir. Aynı adlı kayıt katalogda zaten varsa varsayılan olarak
// işaretsiz gelir (mükerrer olmasın).

const TABELA_KATALOG_PAKET_TURU = 'risk360-tabela-katalog-paketi';
let _tbIceAktarAdaylar = [];

function _tbAdNormal(ad) {
  return typeof _basligiNormallestir === 'function' ? _basligiNormallestir(ad) : String(ad || '').toLocaleLowerCase('tr-TR').replace(/\s+/g, '');
}

// Dosya adından/addan kategori tahmini (kullanıcı listede değiştirebilir).
// Türkçe karakter/boşluk farkı olmasın diye normalize edilmiş ad üzerinde
// (ör. "yangin_tupu" = "Yangın Tüpü") ASCII anahtar kelimelerle bakılır.
function _tbKategoriTahmin(ad) {
  const a = _tbAdNormal(ad);
  if (/yangin(sondur|dolab|hortum|alarm|merdiven|tupu)/.test(a)) return 'Yangın';
  if (/acil|ilkyardim|toplanma|kacis|cikisyolu|gozdusu|sedye|siginak/.test(a)) return 'Acil Durum';
  if (/yasak|girilmez|giremez|yapma|etme|icilmez|dokunma|yaklasma/.test(a)) return 'Yasak';
  if (/kullan|tak|giy|zorunlu|mecburi/.test(a)) return 'Zorunluluk';
  if (/kimyasal|asit|zehir|toksik|yanici|patlayici|korozif|gaz|lpg/.test(a)) return 'Kimyasal';
  if (/park|hiz|yaya|trafik|arac/.test(a)) return 'Trafik';
  if (/dikkat|tehlike|uyari|kaygan|elektrik|gerilim/.test(a)) return 'Uyarı';
  return 'Diğer';
}

function _tbDosyaAdindanAd(dosyaAdi) {
  const ad = String(dosyaAdi || '').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return ad ? ad.charAt(0).toLocaleUpperCase('tr-TR') + ad.slice(1) : 'Levha';
}

function _tbDataUrlOku(dosya) {
  return new Promise((coz, red) => {
    const r = new FileReader();
    r.onload = () => coz(r.result);
    r.onerror = () => red(new Error('Dosya okunamadı: ' + dosya.name));
    r.readAsDataURL(dosya);
  });
}

// Görseli en fazla 600 px'e küçültüp beyaz zeminli JPEG yapar.
function _tbGorselHazirla(dataUrl, azami) {
  return new Promise((coz, red) => {
    const img = new Image();
    img.onload = () => {
      const o = Math.min(1, (azami || 600) / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * o));
      c.height = Math.max(1, Math.round(img.height * o));
      const x = c.getContext('2d');
      x.fillStyle = '#fff';
      x.fillRect(0, 0, c.width, c.height);
      x.drawImage(img, 0, 0, c.width, c.height);
      coz(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => red(new Error('Görsel okunamadı.'));
    img.src = dataUrl;
  });
}

let _tbPdfJsSoz = null;
function _tbPdfJsYukle() {
  if (window.pdfjsLib) return Promise.resolve();
  if (!_tbPdfJsSoz) {
    _tbPdfJsSoz = new Promise((coz, red) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      s.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        coz();
      };
      s.onerror = () => { _tbPdfJsSoz = null; red(new Error('PDF okuyucu yüklenemedi (internet bağlantısını kontrol edin).')); };
      document.head.appendChild(s);
    });
  }
  return _tbPdfJsSoz;
}

// PDF'in her sayfasını bir levha görseline çevirir (beyaz kenarlar kırpılır).
async function _tbPdfSayfalari(dosya) {
  await _tbPdfJsYukle();
  const pdf = await window.pdfjsLib.getDocument({ data: await dosya.arrayBuffer() }).promise;
  const sonuc = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const sayfa = await pdf.getPage(n);
    const v = sayfa.getViewport({ scale: 2 });
    const c = document.createElement('canvas');
    c.width = Math.round(v.width);
    c.height = Math.round(v.height);
    const x = c.getContext('2d');
    x.fillStyle = '#fff';
    x.fillRect(0, 0, c.width, c.height);
    await sayfa.render({ canvasContext: x, viewport: v }).promise;
    // beyaz kenar kırpma
    const d = x.getImageData(0, 0, c.width, c.height).data;
    let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
    for (let y = 0; y < c.height; y += 2) {
      for (let xx = 0; xx < c.width; xx += 2) {
        const i = (y * c.width + xx) * 4;
        if (d[i] < 235 || d[i + 1] < 235 || d[i + 2] < 235) {
          if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
    }
    if (x1 < 0) continue; // boş sayfa
    const pay = 6;
    x0 = Math.max(0, x0 - pay); y0 = Math.max(0, y0 - pay);
    x1 = Math.min(c.width - 1, x1 + pay); y1 = Math.min(c.height - 1, y1 + pay);
    const k = document.createElement('canvas');
    k.width = x1 - x0 + 1;
    k.height = y1 - y0 + 1;
    k.getContext('2d').drawImage(c, x0, y0, k.width, k.height, 0, 0, k.width, k.height);
    sonuc.push({ dataUrl: await _tbGorselHazirla(k.toDataURL('image/png'), 600), sayfa: n, sayfaSayisi: pdf.numPages });
  }
  return sonuc;
}

async function _tbIceAktarDosyalariOku(dosyalar) {
  const adaylar = [];
  for (const dosya of dosyalar) {
    const ad = String(dosya.name || '').toLowerCase();
    if (ad.endsWith('.json')) {
      let paket;
      try { paket = JSON.parse(await dosya.text()); } catch (e) { throw new Error(dosya.name + ' okunamadı (geçerli bir JSON değil).'); }
      if (!paket || paket.tur !== TABELA_KATALOG_PAKET_TURU || !Array.isArray(paket.kayitlar)) {
        throw new Error(dosya.name + ' bir tabela katalog paketi değil.');
      }
      paket.kayitlar.forEach(k => {
        if (!k || !/^data:image\//.test(k.foto || '')) return;
        adaylar.push({ ad: String(k.ad || '').trim() || 'Levha', kategori: TABELA_KATALOG_KATEGORILERI.includes(k.kategori) ? k.kategori : 'Diğer', foto: k.foto });
      });
    } else if (ad.endsWith('.pdf') || dosya.type === 'application/pdf') {
      const sayfalar = await _tbPdfSayfalari(dosya);
      const temel = _tbDosyaAdindanAd(dosya.name);
      sayfalar.forEach(s => adaylar.push({
        ad: s.sayfaSayisi > 1 ? `${temel} ${s.sayfa}` : temel,
        kategori: _tbKategoriTahmin(temel),
        foto: s.dataUrl
      }));
    } else if (/^image\/(jpeg|png|webp)$/i.test(dosya.type || '') || /\.(jpe?g|png|webp)$/.test(ad)) {
      const temel = _tbDosyaAdindanAd(dosya.name);
      adaylar.push({ ad: temel, kategori: _tbKategoriTahmin(temel), foto: await _tbGorselHazirla(await _tbDataUrlOku(dosya), 600) });
    } else {
      throw new Error(dosya.name + ': desteklenmeyen dosya türü (JPEG, PNG, PDF veya katalog paketi seçin).');
    }
  }
  return adaylar;
}

// ---- Gözden geçirme penceresi ----

function _tbIceAktarAc() {
  _tbEl('katalogIceAktarDurum').textContent = '';
  _tbEl('katalogIceAktarListe').innerHTML = '';
  _tbEl('katalogIceAktarAra').value = '';
  _tbEl('katalogIceAktarKategori').value = '';
  _tbIceAktarAdaylar = [];
  _tbIceAktarOzetCiz();
  _tbEl('katalogIceAktarKatman').classList.add('acik');
}

function _tbIceAktarKapat() {
  _tbEl('katalogIceAktarKatman').classList.remove('acik');
  _tbIceAktarAdaylar = [];
  _tbEl('katalogIceAktarListe').innerHTML = '';
}

async function _tbIceAktarDosyalarSecildi(dosyalar) {
  if (!dosyalar || !dosyalar.length) return;
  const durum = _tbEl('katalogIceAktarDurum');
  durum.textContent = 'Dosyalar okunuyor...';
  try {
    const yeni = await _tbIceAktarDosyalariOku(Array.from(dosyalar));
    const mevcutAdlar = new Set(tabelaKatalogTumunuGetir().map(k => _tbAdNormal(k.tabelaAdi)));
    yeni.forEach(a => {
      a.id = rastgeleId();
      a.mukerrer = mevcutAdlar.has(_tbAdNormal(a.ad));
      a.secili = !a.mukerrer;
    });
    _tbIceAktarAdaylar = _tbIceAktarAdaylar.concat(yeni);
    durum.textContent = yeni.length + ' levha listeye eklendi. Adları ve kategorileri kontrol edip "Kataloğa Kaydet"e basın.';
  } catch (hata) {
    console.error(hata);
    durum.textContent = '';
    alert(hata.message || String(hata));
  }
  _tbIceAktarListeCiz();
}

function _tbIceAktarFiltreli() {
  const ara = _tbAdNormal(_tbEl('katalogIceAktarAra').value);
  const kat = _tbEl('katalogIceAktarKategori').value;
  return _tbIceAktarAdaylar.filter(a => (!kat || a.kategori === kat) && (!ara || _tbAdNormal(a.ad).includes(ara)));
}

function _tbIceAktarOzetCiz() {
  const secili = _tbIceAktarAdaylar.filter(a => a.secili).length;
  _tbEl('katalogIceAktarKaydetBtn').textContent = `Kataloğa Kaydet (${secili})`;
  _tbEl('katalogIceAktarKaydetBtn').disabled = !secili;
  const sayac = {};
  _tbIceAktarAdaylar.forEach(a => { sayac[a.kategori] = (sayac[a.kategori] || 0) + 1; });
  _tbEl('katalogIceAktarOzet').textContent = _tbIceAktarAdaylar.length
    ? `Toplam ${_tbIceAktarAdaylar.length} levha, ${secili} seçili — ` + Object.entries(sayac).map(([k, n]) => `${k}: ${n}`).join(', ')
    : 'Henüz dosya seçilmedi.';
}

function _tbIceAktarListeCiz() {
  const kutu = _tbEl('katalogIceAktarListe');
  const liste = _tbIceAktarFiltreli();
  const kategoriSecenek = sec => TABELA_KATALOG_KATEGORILERI.map(k => `<option ${k === sec ? 'selected' : ''}>${k}</option>`).join('');
  kutu.innerHTML = liste.map(a => `
    <div class="tb-ia-satir" data-ia="${a.id}" style="display:flex; align-items:center; gap:8px; padding:6px; border-bottom:1px solid var(--kenarlik); ${a.secili ? '' : 'opacity:.55;'}">
      <input type="checkbox" data-ia-sec ${a.secili ? 'checked' : ''} style="width:auto; margin:0;" title="Kataloğa ekle">
      <img src="${a.foto}" alt="" loading="lazy" style="width:56px; height:56px; object-fit:contain; border:1px solid var(--kenarlik); border-radius:6px; background:#fff;">
      <input type="text" data-ia-ad value="${_tbKacir(a.ad)}" style="flex:1; min-width:0; margin:0;">
      <select data-ia-kat style="width:auto; margin:0;">${kategoriSecenek(a.kategori)}</select>
      ${a.mukerrer ? '<span title="Bu adla katalogda kayıt var" style="font-size:11px; color:#b45309; white-space:nowrap;">katalogda var</span>' : ''}
    </div>`).join('') || '<div style="padding:16px; text-align:center; color:var(--metin-soluk);">Gösterilecek levha yok.</div>';

  kutu.querySelectorAll('[data-ia]').forEach(satir => {
    const a = _tbIceAktarAdaylar.find(x => x.id === satir.getAttribute('data-ia'));
    satir.querySelector('[data-ia-sec]').addEventListener('change', e => { a.secili = e.target.checked; satir.style.opacity = a.secili ? '' : '.55'; _tbIceAktarOzetCiz(); });
    satir.querySelector('[data-ia-ad]').addEventListener('input', e => { a.ad = e.target.value; });
    satir.querySelector('[data-ia-kat]').addEventListener('change', e => { a.kategori = e.target.value; _tbIceAktarOzetCiz(); });
  });
  _tbIceAktarOzetCiz();
}

function _tbIceAktarHepsiniSec(secili) {
  _tbIceAktarFiltreli().forEach(a => { a.secili = secili; });
  _tbIceAktarListeCiz();
}

async function _tbIceAktarKaydet() {
  const secililer = _tbIceAktarAdaylar.filter(a => a.secili);
  if (!secililer.length) return;
  const adsiz = secililer.filter(a => !String(a.ad || '').trim());
  if (adsiz.length) { alert(`${adsiz.length} levhanın adı boş. Lütfen ad girin ya da işaretini kaldırın.`); return; }

  const btn = _tbEl('katalogIceAktarKaydetBtn');
  const durum = _tbEl('katalogIceAktarDurum');
  btn.disabled = true;
  const slug = _tbAktifFirma ? _tbAktifFirma.slug : '';
  const yeniKayitlar = [];
  try {
    for (let i = 0; i < secililer.length; i++) {
      durum.textContent = `Kaydediliyor... ${i + 1} / ${secililer.length}`;
      const a = secililer[i];
      const foto = await fotoBuyukKaydet(a.foto, slug);
      yeniKayitlar.push(tabelaKatalogOlustur({ tabelaAdi: a.ad, kategori: a.kategori, foto }));
    }
    // Katalog tek yazımla güncellenir.
    tabelaKatalogTopluKaydetRepo(tabelaKatalogTumunuGetir().concat(yeniKayitlar));
  } catch (hata) {
    console.error(hata);
    // Kaydedilebilenler yine de kataloğa yazılır (görselleri zaten kaydedildi).
    if (yeniKayitlar.length) tabelaKatalogTopluKaydetRepo(tabelaKatalogTumunuGetir().concat(yeniKayitlar));
    alert(`Kayıt sırasında hata oluştu: ${hata.message || hata}\n${yeniKayitlar.length} levha kataloğa eklendi; kalanları tekrar deneyebilirsiniz.`);
    const eklenen = new Set(secililer.slice(0, yeniKayitlar.length).map(a => a.id));
    _tbIceAktarAdaylar = _tbIceAktarAdaylar.filter(a => !eklenen.has(a.id));
    btn.disabled = false;
    durum.textContent = '';
    _tbIceAktarListeCiz();
    kataloguCiz();
    return;
  }
  durum.textContent = '';
  btn.disabled = false;
  _tbIceAktarKapat();
  kataloguCiz();
  alert(`${yeniKayitlar.length} levha kataloğa eklendi.`);
}

function _tbKatalogIceAktarBaslat() {
  _tbEl('katalogIceAktarKategori').innerHTML = '<option value="">Tüm Kategoriler</option>' + TABELA_KATALOG_KATEGORILERI.map(k => `<option>${k}</option>`).join('');
  _tbEl('katalogIceAktarBtn').addEventListener('click', _tbIceAktarAc);
  _tbEl('katalogIceAktarKapatBtn').addEventListener('click', _tbIceAktarKapat);
  _tbEl('katalogIceAktarSecBtn').addEventListener('click', () => _tbEl('katalogIceAktarDosya').click());
  _tbEl('katalogIceAktarDosya').addEventListener('change', e => {
    const dosyalar = Array.from(e.target.files || []);
    e.target.value = '';
    _tbIceAktarDosyalarSecildi(dosyalar);
  });
  _tbEl('katalogIceAktarAra').addEventListener('input', _tbIceAktarListeCiz);
  _tbEl('katalogIceAktarKategori').addEventListener('change', _tbIceAktarListeCiz);
  _tbEl('katalogIceAktarHepsiBtn').addEventListener('click', () => _tbIceAktarHepsiniSec(true));
  _tbEl('katalogIceAktarHicbiriBtn').addEventListener('click', () => _tbIceAktarHepsiniSec(false));
  _tbEl('katalogIceAktarKaydetBtn').addEventListener('click', _tbIceAktarKaydet);

  // Pencereye sürükle-bırak.
  const alan = _tbEl('katalogIceAktarKutu');
  alan.addEventListener('dragover', e => e.preventDefault());
  alan.addEventListener('drop', e => {
    e.preventDefault();
    _tbIceAktarDosyalarSecildi(Array.from((e.dataTransfer && e.dataTransfer.files) || []));
  });
}
