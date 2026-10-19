// Yüklenici "Formlar / Talimatlar" sekmesi: yükleniciye verilecek form ve
// talimat dosyalarının kütüphanesi. Kullanıcı isteği: "yüklenici modülüne
// formlar/talimatlar sekmesi açalım, oraya yükleme yapabileyim jpeg pdf word
// excel olarak". Desen modules/egitim/materyal.js ile aynı: dosya Firebase
// Storage'a yüklenir, Firestore'da (oku/yaz) sadece küçük metadata tutulur.

const YK_FORM_TURLERI = ['Form', 'Talimat'];
const YK_FORM_IZIN_VERILEN_UZANTILAR = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png'];
const YK_FORM_AZAMI_BOYUT = 50 * 1024 * 1024; // 50 MB

function _ykFormAnahtari() { return tenantAnahtar('yuklenici_formlar'); }

function _ykFormUzantiGecerliMi(dosyaAdi) {
  const ad = (dosyaAdi || '').toLowerCase();
  return YK_FORM_IZIN_VERILEN_UZANTILAR.some(u => ad.endsWith(u));
}

function yukleniciFormlariTumunuGetir() {
  return oku(_ykFormAnahtari(), []);
}

function yukleniciFormlariniGetir(aramaMetni, tur) {
  let liste = yukleniciFormlariTumunuGetir().slice().sort((a, b) => (b.yuklemeTarihi || '').localeCompare(a.yuklemeTarihi || ''));
  if (tur) liste = liste.filter(f => f.tur === tur);
  if (!aramaMetni) return liste;
  const kucuk = aramaMetni.trim().toLocaleLowerCase('tr-TR');
  return liste.filter(f => (f.ad || '').toLocaleLowerCase('tr-TR').includes(kucuk) || (f.dosyaAdi || '').toLocaleLowerCase('tr-TR').includes(kucuk));
}

async function yukleniciFormYukle(dosya, ad, tur) {
  if (!dosya) return { basarili: false, hata: 'Dosya seçilmedi.' };
  if (!_ykFormUzantiGecerliMi(dosya.name)) return { basarili: false, hata: 'Sadece PDF, Word, Excel veya JPEG/PNG dosyaları yüklenebilir.' };
  if (dosya.size > YK_FORM_AZAMI_BOYUT) return { basarili: false, hata: 'Dosya çok büyük (maks. 50 MB).' };

  const storage = bulutStorageAl();
  if (!storage) return { basarili: false, hata: 'Bulut depolama şu an kullanılamıyor — internet bağlantınızı kontrol edip tekrar deneyin.' };

  const firma = aktifFirmaGetir();
  const temizAd = String(dosya.name || 'dosya').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-100);
  const yol = `yuklenici-formlar/${firma ? firma.slug : 'ortak'}/${Date.now()}_${temizAd}`;

  let url;
  try {
    const anlik = await storage.ref().child(yol).put(dosya, { contentType: dosya.type || 'application/octet-stream' });
    url = await anlik.ref.getDownloadURL();
  } catch (hata) {
    return { basarili: false, hata: 'Dosya yüklenemedi: ' + (hata.message || hata) };
  }

  const kayit = _yukleniciEklemeIzi({
    id: rastgeleId(),
    ad: (ad || '').trim() || dosya.name,
    tur: YK_FORM_TURLERI.includes(tur) ? tur : 'Form',
    dosyaAdi: dosya.name,
    url,
    yol,
    boyut: dosya.size,
    yuklemeTarihi: new Date().toISOString()
  });
  const liste = yukleniciFormlariTumunuGetir();
  liste.push(kayit);
  yaz(_ykFormAnahtari(), liste);
  return { basarili: true, form: kayit };
}

function yukleniciFormSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  const liste = yukleniciFormlariTumunuGetir();
  const kayit = liste.find(f => f.id === id);
  if (!kayit) return { basarili: false };
  yaz(_ykFormAnahtari(), liste.filter(f => f.id !== id));
  // Storage'daki dosyayı da silmeyi dene — başarısız olsa bile kayıt silinmiş olur.
  const storage = bulutStorageAl();
  if (storage && kayit.yol) storage.ref().child(kayit.yol).delete().catch(() => {});
  return { basarili: true };
}

// ==================== UI ====================

function _ykFormBoyutMetni(bayt) {
  if (!bayt) return '-';
  if (bayt < 1024 * 1024) return Math.round(bayt / 1024) + ' KB';
  return (bayt / (1024 * 1024)).toFixed(1) + ' MB';
}

function _ykFormDosyaTuru(dosyaAdi) {
  const u = ((String(dosyaAdi || '').toLowerCase().match(/\.([a-z0-9]+)$/) || [])[1]) || '';
  if (u === 'pdf') return 'PDF';
  if (u === 'doc' || u === 'docx') return 'Word';
  if (u === 'xls' || u === 'xlsx') return 'Excel';
  if (['jpg', 'jpeg', 'png'].includes(u)) return 'Resim';
  return u.toUpperCase() || '-';
}

function formlariCiz() {
  const govde = document.getElementById('formTabloGovde');
  const bosDurum = document.getElementById('formBosDurum');
  const arama = document.getElementById('formAramaKutusu').value;
  const tur = document.getElementById('formTurFiltre').value;
  const liste = yukleniciFormlariniGetir(arama, tur);

  govde.innerHTML = '';
  if (!liste.length) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = arama || tur ? 'Aramanızla eşleşen dosya bulunamadı.' : 'Henüz form/talimat yüklenmedi. "+ Dosya Yükle" ile ya da dosyayı bu alana sürükleyerek ekleyin.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  govde.innerHTML = liste.map(f => `
    <tr>
      <td><span class="genel-rozet ${f.tur === 'Talimat' ? 'rozet-yaklasiyor' : 'rozet-uygun'}">${_ykKacir(f.tur || 'Form')}</span></td>
      <td>${_ykKacir(f.ad)}</td>
      <td>${_ykKacir(f.dosyaAdi)} <span style="font-size:11px; color:var(--metin-soluk);">(${_ykFormDosyaTuru(f.dosyaAdi)})</span></td>
      <td>${_ykFormBoyutMetni(f.boyut)}</td>
      <td>${f.yuklemeTarihi ? formatTarihGoster(f.yuklemeTarihi.slice(0, 10)) : '-'}</td>
      <td>
        <button class="tablo-buton" data-form-ac="${f.id}" title="İndirmeden uygulama içinde açar">Aç</button>
        <button class="tablo-buton" data-form-indir="${f.id}">İndir</button>
        <button class="tablo-buton sil" data-form-sil="${f.id}">Sil</button>
      </td>
    </tr>
  `).join('');

  govde.querySelectorAll('[data-form-ac]').forEach(btn => btn.addEventListener('click', () => yukleniciFormOnizle(btn.getAttribute('data-form-ac'))));
  govde.querySelectorAll('[data-form-indir]').forEach(btn => btn.addEventListener('click', () => yukleniciFormIndir(btn.getAttribute('data-form-indir'))));

  govde.querySelectorAll('[data-form-sil]').forEach(btn => btn.addEventListener('click', async () => {
    if (!(await onayModali('Bu dosyayı silmek istediğinize emin misiniz?', 'Sil'))) return;
    const sonuc = yukleniciFormSil(btn.getAttribute('data-form-sil'));
    if (sonuc.basarili) formlariCiz();
  }));
}

// ---- İndir / indirmeden aç ----
// Kullanıcı isteği: "istendiğinde oradan indirilebilsin veya indirmeden açıp
// okunabilsin". Dosya tarayıcıda alınıp (fetch) uygulamanın kendi penceresinde
// çizilir: PDF -> tarayıcının PDF görüntüleyicisi, resim -> <img>, DOCX ->
// docx-preview, Excel -> SheetJS ile HTML tablo (bkz. egitim materyal-ui.js).

async function _ykFormTamponAl(f) {
  const yanit = await fetch(f.url);
  if (!yanit.ok) throw new Error('Dosya depolamadan alınamadı (HTTP ' + yanit.status + ').');
  return yanit.blob();
}

async function yukleniciFormIndir(id) {
  const f = yukleniciFormlariTumunuGetir().find(x => x.id === id);
  if (!f) return;
  try {
    const blob = await _ykFormTamponAl(f);
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = f.dosyaAdi || 'dosya';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  } catch (hata) {
    // fetch engellenirse (CORS vb.) en azından yeni sekmede aç.
    window.open(f.url, '_blank', 'noopener');
  }
}

const _ykFormScriptOnbellek = {};
function _ykFormScriptYukle(src) {
  if (!_ykFormScriptOnbellek[src]) {
    _ykFormScriptOnbellek[src] = new Promise((coz, reddet) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = coz;
      s.onerror = () => { delete _ykFormScriptOnbellek[src]; reddet(new Error('Görüntüleyici kütüphanesi yüklenemedi (internet bağlantısını kontrol edin).')); };
      document.head.appendChild(s);
    });
  }
  return _ykFormScriptOnbellek[src];
}

let _ykDocxOnizleme = null;
async function _ykDocxOnizlemeGetir() {
  if (_ykDocxOnizleme) return _ykDocxOnizleme;
  await _ykFormScriptYukle('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js');
  // docx-preview'in global adı "docx" — Word üreten docx.js ile aynı; korunur.
  const eskiDocx = window.docx;
  await _ykFormScriptYukle('https://cdn.jsdelivr.net/npm/docx-preview@0.4.1/dist/docx-preview.min.js');
  _ykDocxOnizleme = window.docx;
  window.docx = eskiDocx;
  return _ykDocxOnizleme;
}

function yukleniciFormOnizlemeKapat() {
  const icerik = document.getElementById('formOnizlemeIcerik');
  icerik.querySelectorAll('[data-blob-url]').forEach(el => URL.revokeObjectURL(el.getAttribute('data-blob-url')));
  icerik.innerHTML = '';
  document.getElementById('formOnizlemeKatman').classList.remove('acik');
}

async function yukleniciFormOnizle(id) {
  const f = yukleniciFormlariTumunuGetir().find(x => x.id === id);
  if (!f) return;
  const icerik = document.getElementById('formOnizlemeIcerik');
  document.getElementById('formOnizlemeBaslik').textContent = f.ad;
  document.getElementById('formOnizlemeIndirBtn').onclick = () => yukleniciFormIndir(id);
  icerik.innerHTML = '<div style="padding:30px; text-align:center; color:var(--metin-soluk);">Dosya yükleniyor...</div>';
  document.getElementById('formOnizlemeKatman').classList.add('acik');

  const uzanti = ((String(f.dosyaAdi || '').toLowerCase().match(/\.([a-z0-9]+)$/) || [])[1]) || '';
  try {
    if (uzanti === 'doc' || uzanti === 'xls') throw new Error('Eski .doc/.xls biçimi uygulama içinde gösterilemiyor.');
    const blob = await _ykFormTamponAl(f);
    icerik.innerHTML = '';

    if (uzanti === 'pdf' || ['jpg', 'jpeg', 'png'].includes(uzanti)) {
      const tip = uzanti === 'pdf' ? 'application/pdf' : (uzanti === 'png' ? 'image/png' : 'image/jpeg');
      const blobUrl = URL.createObjectURL(new Blob([blob], { type: tip }));
      if (uzanti === 'pdf') {
        icerik.innerHTML = `<iframe data-blob-url="${blobUrl}" src="${blobUrl}" style="width:100%; height:100%; border:0;"></iframe>`;
      } else {
        icerik.innerHTML = `<div style="height:100%; overflow:auto; background:#e5e7eb; text-align:center;"><img data-blob-url="${blobUrl}" src="${blobUrl}" style="max-width:100%; height:auto;"></div>`;
      }
    } else if (uzanti === 'docx') {
      const modul = await _ykDocxOnizlemeGetir();
      const kap = document.createElement('div');
      kap.style.cssText = 'background:#e5e7eb; padding:12px; overflow:auto; height:100%;';
      icerik.appendChild(kap);
      await modul.renderAsync(await blob.arrayBuffer(), kap, null, { className: 'docx', inWrapper: true, ignoreWidth: false, breakPages: true });
    } else if (uzanti === 'xlsx') {
      await new Promise(coz => xlsxHazirOlduğunda(coz));
      const wb = XLSX.read(await blob.arrayBuffer(), { type: 'array' });
      const sekmeler = wb.SheetNames.map((ad, i) => `<button type="button" class="tablo-buton" data-form-sayfa="${i}">${_ykKacir(ad)}</button>`).join(' ');
      icerik.innerHTML = `<div style="display:flex; flex-direction:column; height:100%;">
        ${wb.SheetNames.length > 1 ? `<div style="padding:6px; border-bottom:1px solid var(--kenarlik);">${sekmeler}</div>` : ''}
        <div id="formOnizlemeExcel" style="flex:1; overflow:auto; padding:8px; font-size:12px;"></div>
      </div>`;
      const sayfaCiz = i => {
        const kutu = document.getElementById('formOnizlemeExcel');
        kutu.innerHTML = XLSX.utils.sheet_to_html(wb.Sheets[wb.SheetNames[i]]);
        const tablo = kutu.querySelector('table');
        if (tablo) {
          tablo.style.borderCollapse = 'collapse';
          tablo.querySelectorAll('td').forEach(td => { td.style.border = '1px solid #cbd5e1'; td.style.padding = '3px 6px'; });
        }
      };
      icerik.querySelectorAll('[data-form-sayfa]').forEach(b => b.addEventListener('click', () => sayfaCiz(Number(b.getAttribute('data-form-sayfa')))));
      sayfaCiz(0);
    } else {
      throw new Error('Bu dosya türü uygulama içinde gösterilemiyor.');
    }
  } catch (hata) {
    console.error(hata);
    icerik.innerHTML = `<div style="padding:30px; text-align:center;">
      <p style="font-weight:600;">Dosya uygulama içinde açılamadı.</p>
      <p style="font-size:13px; color:var(--metin-soluk);">${_ykKacir(hata.message || String(hata))}</p>
      <p style="font-size:13px;">Sağ üstteki <b>İndir</b> ile dosyayı indirip açabilirsiniz.</p>
    </div>`;
  }
}

let _ykFormSeciliDosya = null;

function _ykFormYuklemePenceresiAc(dosya) {
  if (!dosya) return;
  if (!_ykFormUzantiGecerliMi(dosya.name)) { alert('Sadece PDF, Word, Excel veya JPEG/PNG dosyaları yüklenebilir.'); return; }
  _ykFormSeciliDosya = dosya;
  document.getElementById('formYukleDosyaAdi').textContent = dosya.name + ' (' + _ykFormBoyutMetni(dosya.size) + ')';
  document.getElementById('formYukleAd').value = dosya.name.replace(/\.[^.]+$/, '');
  document.getElementById('formYukleTur').value = document.getElementById('formTurFiltre').value || 'Form';
  document.getElementById('formYukleHata').textContent = '';
  document.getElementById('formYukleKatman').classList.add('acik');
  document.getElementById('formYukleAd').focus();
}

function _ykFormYuklemePenceresiKapat() {
  document.getElementById('formYukleKatman').classList.remove('acik');
  _ykFormSeciliDosya = null;
}

async function _ykFormYuklemeyiKaydet() {
  const btn = document.getElementById('formYukleKaydetBtn');
  const hataEl = document.getElementById('formYukleHata');
  hataEl.textContent = '';
  btn.disabled = true;
  const eskiMetin = btn.textContent;
  btn.textContent = 'Yükleniyor...';
  try {
    const sonuc = await yukleniciFormYukle(_ykFormSeciliDosya, document.getElementById('formYukleAd').value, document.getElementById('formYukleTur').value);
    if (!sonuc.basarili) { hataEl.textContent = sonuc.hata; return; }
    _ykFormYuklemePenceresiKapat();
    formlariCiz();
  } finally {
    btn.disabled = false;
    btn.textContent = eskiMetin;
  }
}

// Sekmenin tamamı sürükle-bırak alanı (bkz. egitim materyal-ui.js).
function _ykFormSurukleBirakKur() {
  const alan = document.getElementById('bolum-formlar');
  let sayac = 0;
  alan.addEventListener('dragover', e => e.preventDefault());
  alan.addEventListener('dragenter', e => { e.preventDefault(); sayac++; alan.style.outline = '2px dashed var(--birincil, #2563eb)'; });
  alan.addEventListener('dragleave', e => { e.preventDefault(); sayac = Math.max(0, sayac - 1); if (!sayac) alan.style.outline = ''; });
  alan.addEventListener('drop', e => {
    e.preventDefault();
    sayac = 0;
    alan.style.outline = '';
    const dosya = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    _ykFormYuklemePenceresiAc(dosya);
  });
}

function yukleniciFormlarBaslat() {
  document.getElementById('formTurFiltre').innerHTML = '<option value="">Tümü</option>' + YK_FORM_TURLERI.map(t => `<option value="${t}">${t}</option>`).join('');
  document.getElementById('formYukleTur').innerHTML = YK_FORM_TURLERI.map(t => `<option value="${t}">${t}</option>`).join('');
  document.getElementById('formAramaKutusu').addEventListener('input', formlariCiz);
  document.getElementById('formTurFiltre').addEventListener('change', formlariCiz);
  document.getElementById('formYukleBtn').addEventListener('click', () => document.getElementById('formDosya').click());
  document.getElementById('formDosya').addEventListener('change', e => {
    const dosya = e.target.files[0];
    e.target.value = '';
    _ykFormYuklemePenceresiAc(dosya);
  });
  document.getElementById('formYukleIptalBtn').addEventListener('click', _ykFormYuklemePenceresiKapat);
  document.getElementById('formYukleKaydetBtn').addEventListener('click', _ykFormYuklemeyiKaydet);
  document.getElementById('formOnizlemeKapatBtn').addEventListener('click', yukleniciFormOnizlemeKapat);
  _ykFormSurukleBirakKur();
}
