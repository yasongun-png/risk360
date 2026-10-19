// Tabela Yönetimi ekranı DOM işlemleri (Mevcut / İhtiyaç / Katalog / Özet).

let _tbAktifFirma = null;
let _tbGorunum = 'mevcut';
let _tbDuzenlenenMevcutId = null;
let _tbDuzenlenenIhtiyacId = null;
let _tbDuzenlenenKatalogId = null;
// Formlardaki fotoğraf: kayda yazılacak değer (fotoref / Storage URL) ve
// anında önizleme için gerçek görsel (yükleme sonrası tekrar okumamak için).
const _tbFoto = { mv: { deger: '', onizleme: '' }, ih: { deger: '', onizleme: '' }, kt: { deger: '', onizleme: '' } };

function _tbKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function _tbEl(id) { return document.getElementById(id); }

function _tbFotoHucre(foto) {
  return foto ? `<img class="tb-foto" data-foto-ref="${_tbKacir(foto)}" alt="">` : '<div class="tb-foto-bos"></div>';
}

function tabelaSayfasiniBaslat(firma) {
  _tbAktifFirma = firma;
  document.querySelectorAll('[data-sekme]').forEach(btn => {
    btn.addEventListener('click', () => tbGorunumDegistir(btn.getAttribute('data-sekme')));
  });

  _tbSecimleriDoldur();
  _tbMevcutBaslat();
  _tbIhtiyacBaslat();
  _tbKatalogBaslat();
  _tbKatalogIceAktarBaslat();
  _tbOzetBaslat();

  tbGorunumDegistir('mevcut');
}

function tbGorunumDegistir(gorunum) {
  _tbGorunum = gorunum;
  ['mevcut', 'ihtiyac', 'katalog', 'ozet'].forEach(g => {
    document.querySelector(`[data-sekme="${g}"]`).classList.toggle('sekme-seciliDegil', g !== gorunum);
    _tbEl('bolum-' + g).style.display = g === gorunum ? '' : 'none';
  });
  _tbYenidenCiz();
}

function _tbYenidenCiz() {
  _tbBolumFiltreleriniDoldur();
  if (_tbGorunum === 'mevcut') mevcutlariCiz();
  else if (_tbGorunum === 'ihtiyac') ihtiyaclariCiz();
  else if (_tbGorunum === 'katalog') kataloguCiz();
  else tbOzetiCiz();
}

function _tbSecimleriDoldur() {
  const ebatSecenekleri = ['Yatay', 'Dikey'].map(grup =>
    `<optgroup label="${grup}">${TABELA_EBATLARI.filter(e => e.grup === grup).map(e => `<option value="${e.deger}">${tabelaEbatGoruntu(e.deger)}</option>`).join('')}</optgroup>`).join('');
  ['mvEbat', 'ihEbat'].forEach(id => { _tbEl(id).innerHTML = ebatSecenekleri; });
  ['mvMalzeme', 'ihMalzeme'].forEach(id => { _tbEl(id).innerHTML = TABELA_MALZEMELERI.map(m => `<option>${m}</option>`).join(''); });
  _tbEl('ihOncelik').innerHTML = TABELA_ONCELIKLERI.map(o => `<option>${o}</option>`).join('');
  _tbEl('ihtiyacOncelikFiltre').innerHTML += TABELA_ONCELIKLERI.map(o => `<option>${o}</option>`).join('');
  _tbEl('ktKategori').innerHTML = TABELA_KATALOG_KATEGORILERI.map(k => `<option>${k}</option>`).join('');
  _tbEl('katalogKategoriFiltre').innerHTML += TABELA_KATALOG_KATEGORILERI.map(k => `<option>${k}</option>`).join('');

  // Yön ebattan otomatik: etiketin yanında gösterilir.
  [['mvEbat', 'mvYon'], ['ihEbat', 'ihYon']].forEach(([ebatId, yonId]) => {
    _tbEl(ebatId).addEventListener('change', () => { _tbEl(yonId).textContent = '(' + tabelaYonHesapla(_tbEl(ebatId).value) + ')'; });
  });

  // Lokasyon önerileri seçili bölüme göre.
  ['mvBolum', 'ihBolum'].forEach(id => {
    _tbEl(id).addEventListener('change', () => _tbLokasyonOnerileriniDoldur(_tbEl(id).value));
  });
}

function _tbBolumFiltreleriniDoldur() {
  const bolumler = tabelaBolumListesi();
  ['mevcutBolumFiltre', 'ihtiyacBolumFiltre'].forEach(id => {
    const sec = _tbEl(id);
    const onceki = sec.value;
    sec.innerHTML = '<option value="">Tüm Bölümler</option>' + bolumler.map(b => `<option ${b === onceki ? 'selected' : ''}>${_tbKacir(b)}</option>`).join('');
  });
  _tbEl('tbBolumListesi').innerHTML = bolumler.map(b => `<option value="${_tbKacir(b)}"></option>`).join('');
}

function _tbLokasyonOnerileriniDoldur(bolum) {
  _tbEl('tbLokasyonListesi').innerHTML = tabelaLokasyonOnerileri((bolum || '').trim()).map(l => `<option value="${_tbKacir(l)}"></option>`).join('');
}

// ---- Fotoğraf alanı (üç formda ortak) ----

function _tbFotoAlaniniBagla(onEk) {
  _tbEl(onEk + 'FotoDosya').addEventListener('change', async e => {
    const dosya = e.target.files[0];
    e.target.value = '';
    if (!dosya) return;
    const kutu = _tbEl(onEk + 'FotoOnizleme');
    kutu.innerHTML = '<div style="font-size:12px; color:var(--metin-soluk);">Yükleniyor...</div>';
    try {
      const sonuc = await fotoYukle(dosya, 'tabela/' + (_tbAktifFirma ? _tbAktifFirma.slug : 'firma'), 1600, 0.75);
      _tbFoto[onEk] = { deger: sonuc.url, onizleme: sonuc.onizlemeUrl };
      _tbEl(onEk + 'FotoHata').textContent = '';
    } catch (hata) {
      alert(hata.message || 'Görsel yüklenemedi.');
    }
    _tbFotoOnizlemeCiz(onEk);
  });
}

function _tbFotoAyarla(onEk, deger) {
  _tbFoto[onEk] = { deger: deger || '', onizleme: '' };
  _tbFotoOnizlemeCiz(onEk);
}

function _tbFotoOnizlemeCiz(onEk) {
  const kutu = _tbEl(onEk + 'FotoOnizleme');
  const foto = _tbFoto[onEk];
  if (!foto.deger) {
    kutu.innerHTML = '<div style="font-size:12px; color:var(--metin-soluk);">Henüz fotoğraf seçilmedi.</div>';
    return;
  }
  const img = foto.onizleme
    ? `<img class="tb-foto" src="${_tbKacir(foto.onizleme)}" alt="" style="width:88px; height:88px;">`
    : `<img class="tb-foto" data-foto-ref="${_tbKacir(foto.deger)}" alt="" style="width:88px; height:88px;">`;
  kutu.innerHTML = `<div style="display:flex; align-items:center; gap:10px;">${img}<div style="font-size:12px; color:#16a34a; font-weight:600;">✓ Fotoğraf eklendi</div></div>`;
  fotoReferanslariCoz(kutu);
}

function _tbHatalariGoster(onEk, hatalar) {
  Object.keys(hatalar || {}).forEach(alan => {
    const el = _tbEl(onEk + alan.charAt(0).toUpperCase() + alan.slice(1) + 'Hata');
    if (el) el.textContent = hatalar[alan];
  });
}

function _tbHatalariTemizle(formId) {
  document.querySelectorAll('#' + formId + ' .alan-hatasi').forEach(el => { el.textContent = ''; });
}

function _tbFormOlcuDoldur(onEk, kayit) {
  const ebat = kayit && kayit.ebat ? kayit.ebat : TABELA_VARSAYILAN_EBAT;
  if (!TABELA_EBATLARI.some(e => e.deger === ebat)) {
    _tbEl(onEk + 'Ebat').insertAdjacentHTML('beforeend', `<option value="${_tbKacir(ebat)}">${_tbKacir(tabelaEbatGoruntu(ebat))}</option>`);
  }
  _tbEl(onEk + 'Ebat').value = ebat;
  _tbEl(onEk + 'Yon').textContent = '(' + tabelaYonHesapla(ebat) + ')';
  _tbEl(onEk + 'Malzeme').value = kayit && kayit.malzeme ? kayit.malzeme : TABELA_VARSAYILAN_MALZEME;
}

// ==================== MEVCUT ====================

const TABELA_MEVCUT_KOLONLARI = [
  { anahtar: 'tabelaNo', baslik: 'Tabela No' },
  { anahtar: 'tabelaAdi', baslik: 'Tabela Adı' },
  { anahtar: 'bolum', baslik: 'Bölüm' },
  { anahtar: 'lokasyon', baslik: 'Lokasyon' },
  { anahtar: 'adet', baslik: 'Adet' },
  { anahtar: 'ebatGoruntu', baslik: 'Ebat' },
  { anahtar: 'yon', baslik: 'Yön' },
  { anahtar: 'malzeme', baslik: 'Malzeme' },
  { anahtar: 'tarihGoruntu', baslik: 'Kayıt Tarihi' },
  { anahtar: 'not', baslik: 'Not' }
];

function _tbMevcutBaslat() {
  _tbEl('yeniMevcutBtn').addEventListener('click', () => mevcutModalAc());
  _tbEl('mevcutModalKapatBtn').addEventListener('click', mevcutModalKapat);
  _tbEl('mevcutModalIptalBtn').addEventListener('click', mevcutModalKapat);
  _tbEl('mevcutForm').addEventListener('submit', mevcutFormGonderildi);
  _tbEl('mevcutAramaKutusu').addEventListener('input', mevcutlariCiz);
  _tbEl('mevcutBolumFiltre').addEventListener('change', mevcutlariCiz);
  _tbFotoAlaniniBagla('mv');

  _tbEl('mevcutDisaAktarBtn').addEventListener('click', () => {
    excelDisaAktar(_tbMevcutRaporSatirlari(), TABELA_MEVCUT_KOLONLARI, 'mevcut_tabelalar.xlsx');
  });
  _tbEl('mevcutYazdirBtn').addEventListener('click', () => {
    const bolum = _tbEl('mevcutBolumFiltre').value;
    raporListesiYazdir('Mevcut Tabelalar', _tbKacir(_tbAktifFirma.ad) + (bolum ? ' — Bölüm: ' + _tbKacir(bolum) : ''),
      TABELA_MEVCUT_KOLONLARI.filter(k => k.anahtar !== 'not'), _tbMevcutRaporSatirlari());
  });
}

function _tbMevcutFiltreli() {
  return tabelaMevcutlariGetir(_tbEl('mevcutAramaKutusu').value, { bolum: _tbEl('mevcutBolumFiltre').value });
}

function _tbMevcutRaporSatirlari() {
  return _tbMevcutFiltreli().map(k => Object.assign({}, k, { ebatGoruntu: tabelaEbatGoruntu(k.ebat), yon: tabelaYonHesapla(k.ebat), tarihGoruntu: gunAyYil(k.tarih) }));
}

function mevcutlariCiz() {
  const govde = _tbEl('mevcutTabloGovde');
  const bosDurum = _tbEl('mevcutBosDurum');
  const liste = _tbMevcutFiltreli();

  govde.innerHTML = '';
  if (!liste.length) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = tabelaMevcutTumunuGetir().length ? 'Eşleşen tabela bulunamadı.' : 'Henüz mevcut tabela kaydı yok.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  govde.innerHTML = liste.map(k => `
    <tr>
      <td>${_tbFotoHucre(k.foto)}</td>
      <td><b>${_tbKacir(k.tabelaNo)}</b></td>
      <td>${_tbKacir(k.tabelaAdi)}${k.not ? `<div class="tb-alt">${_tbKacir(k.not)}</div>` : ''}</td>
      <td>${_tbKacir(k.bolum) || '-'}<div class="tb-alt">${_tbKacir(k.lokasyon)}</div></td>
      <td>${_tbKacir(tabelaOlcuSatiri(k))}</td>
      <td>${Number(k.adet) || 1}</td>
      <td>${gunAyYil(k.tarih) || '-'}</td>
      <td>
        <button class="tablo-buton" data-duzenle="${k.id}">Düzenle</button>
        <button class="tablo-buton sil" data-sil="${k.id}">Sil</button>
      </td>
    </tr>`).join('');

  govde.querySelectorAll('[data-duzenle]').forEach(btn => btn.addEventListener('click', () => mevcutModalAc(tabelaMevcutIdIleGetirRepo(btn.getAttribute('data-duzenle')))));
  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', async () => {
    if (await onayModali('Bu tabela kaydını silmek istediğinize emin misiniz?', 'Sil')) { tabelaMevcutSil(btn.getAttribute('data-sil')); mevcutlariCiz(); }
  }));
  fotoReferanslariCoz(govde);
}

function mevcutModalAc(kayit) {
  _tbDuzenlenenMevcutId = kayit ? kayit.id : null;
  _tbEl('mevcutModalBaslik').textContent = kayit ? (kayit.tabelaNo + ' Düzenle') : 'Mevcut Tabela Ekle';
  _tbEl('mvBolum').value = kayit ? kayit.bolum : (_tbEl('mevcutBolumFiltre').value || '');
  _tbEl('mvLokasyon').value = kayit ? kayit.lokasyon : '';
  _tbEl('mvTabelaAdi').value = kayit ? kayit.tabelaAdi : '';
  _tbEl('mvTabelaNo').value = kayit ? kayit.tabelaNo : tabelaSonrakiNo();
  _tbEl('mvAdet').value = kayit ? (Number(kayit.adet) || 1) : 1;
  _tbEl('mvNot').value = kayit ? (kayit.not || '') : '';
  _tbFormOlcuDoldur('mv', kayit);
  _tbFotoAyarla('mv', kayit ? kayit.foto : '');
  _tbLokasyonOnerileriniDoldur(_tbEl('mvBolum').value);
  _tbHatalariTemizle('mevcutForm');
  _tbEl('mevcutModalKatman').classList.add('acik');
}

function mevcutModalKapat() {
  _tbEl('mevcutModalKatman').classList.remove('acik');
  _tbDuzenlenenMevcutId = null;
}

function mevcutFormGonderildi(e) {
  e.preventDefault();
  _tbHatalariTemizle('mevcutForm');
  const veriler = {
    bolum: _tbEl('mvBolum').value,
    lokasyon: _tbEl('mvLokasyon').value,
    tabelaAdi: _tbEl('mvTabelaAdi').value,
    tabelaNo: _tbEl('mvTabelaNo').value,
    ebat: _tbEl('mvEbat').value,
    malzeme: _tbEl('mvMalzeme').value,
    adet: _tbEl('mvAdet').value,
    not: _tbEl('mvNot').value,
    foto: _tbFoto.mv.deger
  };
  const sonuc = _tbDuzenlenenMevcutId ? tabelaMevcutGuncelle(_tbDuzenlenenMevcutId, veriler) : tabelaMevcutEkle(veriler);
  if (!sonuc.basarili) {
    if (sonuc.hata) alert(sonuc.hata);
    _tbHatalariGoster('mv', sonuc.hatalar);
    return;
  }
  mevcutModalKapat();
  _tbYenidenCiz();
}

// ==================== İHTİYAÇ ====================

const TABELA_IHTIYAC_KOLONLARI = [
  { anahtar: 'tabelaAdi', baslik: 'Tabela Adı' },
  { anahtar: 'bolum', baslik: 'Bölüm' },
  { anahtar: 'lokasyon', baslik: 'Lokasyon' },
  { anahtar: 'adet', baslik: 'Adet' },
  { anahtar: 'oncelik', baslik: 'Öncelik' },
  { anahtar: 'ebatGoruntu', baslik: 'Ebat' },
  { anahtar: 'yon', baslik: 'Yön' },
  { anahtar: 'malzeme', baslik: 'Malzeme' },
  { anahtar: 'kategori', baslik: 'Kategori' },
  { anahtar: 'gerekce', baslik: 'Gerekçe / Not' },
  { anahtar: 'tarihGoruntu', baslik: 'Kayıt Tarihi' }
];

function _tbIhtiyacBaslat() {
  _tbEl('yeniIhtiyacBtn').addEventListener('click', () => ihtiyacModalAc());
  _tbEl('ihtiyacModalKapatBtn').addEventListener('click', ihtiyacModalKapat);
  _tbEl('ihtiyacModalIptalBtn').addEventListener('click', ihtiyacModalKapat);
  _tbEl('ihtiyacForm').addEventListener('submit', ihtiyacFormGonderildi);
  _tbEl('ihtiyacAramaKutusu').addEventListener('input', ihtiyaclariCiz);
  _tbEl('ihtiyacBolumFiltre').addEventListener('change', ihtiyaclariCiz);
  _tbEl('ihtiyacOncelikFiltre').addEventListener('change', ihtiyaclariCiz);
  _tbEl('ihKatalogdanSecBtn').addEventListener('click', () => katalogSeciciAc(_tbKatalogdanIhtiyacaDoldur));
  _tbFotoAlaniniBagla('ih');

  _tbEl('ihtiyacDisaAktarBtn').addEventListener('click', () => {
    excelDisaAktar(_tbIhtiyacRaporSatirlari(), TABELA_IHTIYAC_KOLONLARI, 'tabela_ihtiyac_listesi.xlsx');
  });
  _tbEl('ihtiyacYazdirBtn').addEventListener('click', async () => {
    try { await _tbIhtiyacListesiYazdir(); } catch (hata) { console.error(hata); alert('Yazdırılamadı: ' + (hata.message || hata)); }
  });

  _tbKatalogSeciciBaslat();
}

function _tbIhtiyacFiltreli() {
  return tabelaIhtiyaclariGetir(_tbEl('ihtiyacAramaKutusu').value, {
    bolum: _tbEl('ihtiyacBolumFiltre').value,
    oncelik: _tbEl('ihtiyacOncelikFiltre').value
  });
}

function _tbIhtiyacRaporSatirlari() {
  return _tbIhtiyacFiltreli().map(k => Object.assign({}, k, { ebatGoruntu: tabelaEbatGoruntu(k.ebat), yon: tabelaYonHesapla(k.ebat), tarihGoruntu: gunAyYil(k.tarih) }));
}

function ihtiyaclariCiz() {
  const govde = _tbEl('ihtiyacTabloGovde');
  const bosDurum = _tbEl('ihtiyacBosDurum');
  const liste = _tbIhtiyacFiltreli();

  govde.innerHTML = '';
  if (!liste.length) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = tabelaIhtiyacTumunuGetir().length ? 'Eşleşen ihtiyaç bulunamadı.' : 'Bekleyen tabela ihtiyacı yok.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  govde.innerHTML = liste.map(k => `
    <tr>
      <td>${_tbFotoHucre(k.foto)}</td>
      <td>${_tbKacir(k.tabelaAdi)}${k.kategori ? `<div class="tb-alt">${_tbKacir(k.kategori)}</div>` : ''}</td>
      <td>${_tbKacir(k.bolum) || '-'}<div class="tb-alt">${_tbKacir(k.lokasyon)}</div></td>
      <td>${_tbKacir(tabelaOlcuSatiri(k))}</td>
      <td>${Number(k.adet) || 1}</td>
      <td><span class="genel-rozet rozet-${slugOlustur(k.oncelik || '')}">${_tbKacir(k.oncelik)}</span></td>
      <td>${_tbKacir(k.gerekce) || '-'}</td>
      <td>
        <button class="tablo-buton" data-aktar="${k.id}" title="Tabela asıldı: sıradaki TB numarasıyla Mevcut listesine taşı">✓ Asıldı</button>
        <button class="tablo-buton" data-duzenle="${k.id}">Düzenle</button>
        <button class="tablo-buton sil" data-sil="${k.id}">Sil</button>
      </td>
    </tr>`).join('');

  govde.querySelectorAll('[data-aktar]').forEach(btn => btn.addEventListener('click', async () => {
    if (!await onayModali('Bu tabela temin edilip yerine asıldı mı? Kayıt sıradaki Tabela No ile Mevcut listesine taşınacak.', 'Mevcuda Aktar')) return;
    const sonuc = tabelaIhtiyaciMevcudaAktar(btn.getAttribute('data-aktar'));
    if (!sonuc.basarili) { alert(sonuc.hata); return; }
    alert('Mevcut listesine eklendi: ' + sonuc.kayit.tabelaNo);
    _tbYenidenCiz();
  }));
  govde.querySelectorAll('[data-duzenle]').forEach(btn => btn.addEventListener('click', () => ihtiyacModalAc(tabelaIhtiyacIdIleGetirRepo(btn.getAttribute('data-duzenle')))));
  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', async () => {
    if (await onayModali('Bu ihtiyaç kaydını silmek istediğinize emin misiniz?', 'Sil')) { tabelaIhtiyacSil(btn.getAttribute('data-sil')); ihtiyaclariCiz(); }
  }));
  fotoReferanslariCoz(govde);
}

function ihtiyacModalAc(kayit) {
  _tbDuzenlenenIhtiyacId = kayit && kayit.id ? kayit.id : null;
  _tbEl('ihtiyacModalBaslik').textContent = _tbDuzenlenenIhtiyacId ? 'İhtiyaç Düzenle' : 'İhtiyaç Ekle';
  _tbEl('ihBolum').value = kayit ? (kayit.bolum || '') : (_tbEl('ihtiyacBolumFiltre').value || '');
  _tbEl('ihLokasyon').value = kayit ? (kayit.lokasyon || '') : '';
  _tbEl('ihTabelaAdi').value = kayit ? (kayit.tabelaAdi || '') : '';
  _tbEl('ihAdet').value = kayit ? (Number(kayit.adet) || 1) : 1;
  _tbEl('ihOncelik').value = kayit && kayit.oncelik ? kayit.oncelik : 'Orta';
  _tbEl('ihKategori').value = kayit ? (kayit.kategori || '') : '';
  _tbEl('ihGerekce').value = kayit ? (kayit.gerekce || '') : '';
  _tbFormOlcuDoldur('ih', kayit);
  _tbFotoAyarla('ih', kayit ? kayit.foto : '');
  _tbLokasyonOnerileriniDoldur(_tbEl('ihBolum').value);
  _tbHatalariTemizle('ihtiyacForm');
  _tbEl('ihtiyacModalKatman').classList.add('acik');
}

function ihtiyacModalKapat() {
  _tbEl('ihtiyacModalKatman').classList.remove('acik');
  _tbDuzenlenenIhtiyacId = null;
}

function _tbKatalogdanIhtiyacaDoldur(katalog) {
  _tbEl('ihTabelaAdi').value = katalog.tabelaAdi;
  _tbEl('ihKategori').value = katalog.kategori || '';
  if (katalog.foto) _tbFotoAyarla('ih', katalog.foto);
  _tbEl('ihTabelaAdiHata').textContent = '';
  _tbEl('ihFotoHata').textContent = '';
}

function ihtiyacFormGonderildi(e) {
  e.preventDefault();
  _tbHatalariTemizle('ihtiyacForm');
  const veriler = {
    bolum: _tbEl('ihBolum').value,
    lokasyon: _tbEl('ihLokasyon').value,
    tabelaAdi: _tbEl('ihTabelaAdi').value,
    adet: _tbEl('ihAdet').value,
    oncelik: _tbEl('ihOncelik').value,
    ebat: _tbEl('ihEbat').value,
    malzeme: _tbEl('ihMalzeme').value,
    kategori: _tbEl('ihKategori').value,
    gerekce: _tbEl('ihGerekce').value,
    foto: _tbFoto.ih.deger
  };
  const sonuc = _tbDuzenlenenIhtiyacId ? tabelaIhtiyacGuncelle(_tbDuzenlenenIhtiyacId, veriler) : tabelaIhtiyacEkle(veriler);
  if (!sonuc.basarili) {
    if (sonuc.hata) alert(sonuc.hata);
    _tbHatalariGoster('ih', sonuc.hatalar);
    return;
  }
  ihtiyacModalKapat();
  _tbYenidenCiz();
}

// Görsel bekleyen <img>'ler yazdırma önizlemesine boş düşmesin diye
// fotoğraflar önce çözülüp tarayıcı önbelleğine alınır.
async function _tbFotolariHazirla(liste) {
  const urller = {};
  await Promise.all(liste.map(async k => {
    if (!k.foto) return;
    const url = await fotoBuyukCoz(k.foto);
    if (!url) return;
    urller[k.id] = url;
    await new Promise(coz => { const im = new Image(); im.onload = im.onerror = coz; im.src = url; });
  }));
  return urller;
}

async function _tbIhtiyacListesiYazdir() {
  const liste = _tbIhtiyacFiltreli();
  if (!liste.length) { alert('Yazdırılacak ihtiyaç kaydı yok.'); return; }
  const urller = await _tbFotolariHazirla(liste);
  const f = { bolum: _tbEl('ihtiyacBolumFiltre').value, oncelik: _tbEl('ihtiyacOncelikFiltre').value };
  const altBilgi = [_tbKacir(_tbAktifFirma.ad), f.bolum ? 'Bölüm: ' + _tbKacir(f.bolum) : '', f.oncelik ? 'Öncelik: ' + _tbKacir(f.oncelik) : '', gunAyYil(tabelaBugun())].filter(Boolean).join(' — ');
  const toplamAdet = liste.reduce((t, k) => t + (Number(k.adet) || 1), 0);
  const satirlar = liste.map(k => `
    <tr>
      <td style="width:70px;">${urller[k.id] ? `<img src="${_tbKacir(urller[k.id])}" style="width:60px; height:60px; object-fit:contain;">` : ''}</td>
      <td>${_tbKacir(k.bolum)}</td>
      <td>${_tbKacir(k.lokasyon)}</td>
      <td>${_tbKacir(k.tabelaAdi)}</td>
      <td style="text-align:center;">${Number(k.adet) || 1}</td>
      <td>${_tbKacir(k.oncelik)}</td>
      <td>${_tbKacir(tabelaEbatGoruntu(k.ebat))}</td>
      <td>${_tbKacir(tabelaYonHesapla(k.ebat))}</td>
      <td>${_tbKacir(k.malzeme)}</td>
    </tr>`).join('');
  _raporYazdirmaAlaniniGoster(`
    <div class="doc-title">Satın Alınması Gereken İş Güvenliği Levhaları</div>
    <div class="doc-meta">${altBilgi}<br>Toplam ${liste.length} kalem, ${toplamAdet} adet</div>
    <table>
      <tr><th>Görsel</th><th>Bölüm</th><th>Lokasyon</th><th>Tabela Adı</th><th>Adet</th><th>Öncelik</th><th>Ebat</th><th>Yön</th><th>Malzeme</th></tr>
      ${satirlar}
    </table>
  `);
}

// ==================== KATALOG ====================

function _tbKatalogBaslat() {
  _tbEl('yeniKatalogBtn').addEventListener('click', () => katalogModalAc());
  _tbEl('katalogModalKapatBtn').addEventListener('click', katalogModalKapat);
  _tbEl('katalogModalIptalBtn').addEventListener('click', katalogModalKapat);
  _tbEl('katalogForm').addEventListener('submit', katalogFormGonderildi);
  _tbEl('katalogAramaKutusu').addEventListener('input', kataloguCiz);
  _tbEl('katalogKategoriFiltre').addEventListener('change', kataloguCiz);
  _tbFotoAlaniniBagla('kt');
  _tbEl('katalogYazdirBtn').addEventListener('click', async () => {
    try { await _tbKatalogSahaFormuYazdir(); } catch (hata) { console.error(hata); alert('Yazdırılamadı: ' + (hata.message || hata)); }
  });
}

function _tbKatalogFiltreli() {
  return tabelaKataloguGetir(_tbEl('katalogAramaKutusu').value, { kategori: _tbEl('katalogKategoriFiltre').value });
}

function kataloguCiz() {
  const govde = _tbEl('katalogTabloGovde');
  const bosDurum = _tbEl('katalogBosDurum');
  const liste = _tbKatalogFiltreli();

  govde.innerHTML = '';
  if (!liste.length) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = tabelaKatalogTumunuGetir().length ? 'Eşleşen katalog kaydı bulunamadı.' : 'Katalog boş. "+ Katalog Tabelası" ile levha görsellerini ekleyin.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  govde.innerHTML = liste.map(k => `
    <tr>
      <td>${_tbFotoHucre(k.foto)}</td>
      <td>${_tbKacir(k.tabelaAdi)}</td>
      <td>${_tbKacir(k.kategori)}</td>
      <td>
        <button class="tablo-buton" data-ihtiyaca="${k.id}">+ İhtiyaca Ekle</button>
        <button class="tablo-buton" data-duzenle="${k.id}">Düzenle</button>
        <button class="tablo-buton sil" data-sil="${k.id}">Sil</button>
      </td>
    </tr>`).join('');

  govde.querySelectorAll('[data-ihtiyaca]').forEach(btn => btn.addEventListener('click', () => {
    const k = tabelaKatalogIdIleGetirRepo(btn.getAttribute('data-ihtiyaca'));
    if (!k) return;
    ihtiyacModalAc(null);
    _tbKatalogdanIhtiyacaDoldur(k);
  }));
  govde.querySelectorAll('[data-duzenle]').forEach(btn => btn.addEventListener('click', () => katalogModalAc(tabelaKatalogIdIleGetirRepo(btn.getAttribute('data-duzenle')))));
  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', async () => {
    if (await onayModali('Bu katalog kaydını silmek istediğinize emin misiniz?', 'Sil')) { tabelaKatalogSil(btn.getAttribute('data-sil')); kataloguCiz(); }
  }));
  fotoReferanslariCoz(govde);
}

function katalogModalAc(kayit) {
  _tbDuzenlenenKatalogId = kayit ? kayit.id : null;
  _tbEl('katalogModalBaslik').textContent = kayit ? 'Katalog Tabelası Düzenle' : 'Katalog Tabelası Ekle';
  _tbEl('ktTabelaAdi').value = kayit ? kayit.tabelaAdi : '';
  _tbEl('ktKategori').value = kayit && kayit.kategori ? kayit.kategori : TABELA_KATALOG_KATEGORILERI[0];
  _tbFotoAyarla('kt', kayit ? kayit.foto : '');
  _tbHatalariTemizle('katalogForm');
  _tbEl('katalogModalKatman').classList.add('acik');
}

function katalogModalKapat() {
  _tbEl('katalogModalKatman').classList.remove('acik');
  _tbDuzenlenenKatalogId = null;
}

function katalogFormGonderildi(e) {
  e.preventDefault();
  _tbHatalariTemizle('katalogForm');
  const veriler = { tabelaAdi: _tbEl('ktTabelaAdi').value, kategori: _tbEl('ktKategori').value, foto: _tbFoto.kt.deger };
  const sonuc = _tbDuzenlenenKatalogId ? tabelaKatalogGuncelle(_tbDuzenlenenKatalogId, veriler) : tabelaKatalogEkle(veriler);
  if (!sonuc.basarili) {
    if (sonuc.hata) alert(sonuc.hata);
    _tbHatalariGoster('kt', sonuc.hatalar);
    return;
  }
  katalogModalKapat();
  kataloguCiz();
}

// Katalogdan seçici (İhtiyaç formunun üstünde açılır; form kapanmaz).
let _tbKatalogSecildiFn = null;

function _tbKatalogSeciciBaslat() {
  _tbEl('katalogSecKapatBtn').addEventListener('click', _tbKatalogSeciciKapat);
  _tbEl('katalogSecArama').addEventListener('input', _tbKatalogSeciciCiz);
}

function katalogSeciciAc(secildiFn) {
  if (!tabelaKatalogTumunuGetir().length) { alert('Katalog boş. Önce Katalog sekmesinden levha ekleyin.'); return; }
  _tbKatalogSecildiFn = secildiFn;
  _tbEl('katalogSecArama').value = '';
  _tbKatalogSeciciCiz();
  _tbEl('katalogSecKatman').classList.add('acik');
  _tbEl('katalogSecArama').focus();
}

function _tbKatalogSeciciKapat() {
  _tbEl('katalogSecKatman').classList.remove('acik');
  _tbKatalogSecildiFn = null;
}

function _tbKatalogSeciciCiz() {
  const kutu = _tbEl('katalogSecListe');
  const liste = tabelaKataloguGetir(_tbEl('katalogSecArama').value, {});
  kutu.innerHTML = liste.length ? liste.map(k => `
    <div class="tb-katalog-satir" data-sec="${k.id}">
      ${_tbFotoHucre(k.foto)}
      <div style="flex:1;"><b>${_tbKacir(k.tabelaAdi)}</b><div class="tb-alt">${_tbKacir(k.kategori)}</div></div>
      <span class="tablo-buton">Seç</span>
    </div>`).join('') : '<div class="bos-durum gorunur">Eşleşme yok.</div>';
  kutu.querySelectorAll('[data-sec]').forEach(satir => satir.addEventListener('click', () => {
    const k = tabelaKatalogIdIleGetirRepo(satir.getAttribute('data-sec'));
    const fn = _tbKatalogSecildiFn;
    _tbKatalogSeciciKapat();
    if (k && fn) fn(k);
  }));
  fotoReferanslariCoz(kutu);
}

// Eski uygulamadaki "Yazdır": her levha görseli + yanında boş, çizgili
// LOKASYON kutusu — sahada elle doldurulmak üzere A4 form.
async function _tbKatalogSahaFormuYazdir() {
  const liste = _tbKatalogFiltreli();
  if (!liste.length) { alert('Katalog boş.'); return; }
  const pencere = window.open('', '_blank');
  if (!pencere) { alert('Açılır pencere engellendi. Bu site için açılır pencere izni verin.'); return; }
  pencere.document.write('<p style="font-family:Arial; padding:20px;">Hazırlanıyor...</p>');
  const urller = await _tbFotolariHazirla(liste);
  const satirlar = liste.map(k => `
    <tr class="satir">
      <td class="sol">
        <div class="gorsel">${urller[k.id] ? `<img src="${_tbKacir(urller[k.id])}">` : ''}</div>
        <div class="ad">${_tbKacir(k.tabelaAdi)}</div>
      </td>
      <td><div class="yazi"></div></td>
    </tr>`).join('');
  pencere.document.open();
  pencere.document.write(`<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><title>Tabela Kataloğu - Saha Formu</title>
    <style>
      *{box-sizing:border-box} body{font-family:Arial,sans-serif; margin:0; color:#111;}
      @page{ size:A4 portrait; margin:10mm; }
      table{ width:100%; border-collapse:collapse; table-layout:fixed; }
      thead{ display:table-header-group; }
      th{ border:1px solid #000; padding:6px 8px; font-size:14px; text-align:left; }
      th.sag{ text-align:center; letter-spacing:.5px; }
      td{ vertical-align:top; padding:6px 0; }
      tr.satir{ break-inside:avoid; page-break-inside:avoid; }
      .sol{ width:70mm; padding-right:6mm; }
      .gorsel{ width:70mm; height:26mm; border:1px solid #000; display:flex; align-items:center; justify-content:center; overflow:hidden; }
      .gorsel img{ width:100%; height:100%; object-fit:contain; }
      .ad{ margin-top:2mm; font-size:11px; font-weight:700; min-height:8mm; }
      .yazi{ height:36mm; border:1px solid #000; background-image:repeating-linear-gradient(to bottom, transparent 0, transparent 6mm, rgba(0,0,0,.18) 6mm, rgba(0,0,0,.18) 6.2mm); }
    </style></head><body>
    <table><thead><tr><th>Tabela Kataloğu — ${_tbKacir(_tbAktifFirma.ad)}</th><th class="sag">LOKASYON</th></tr></thead>
    <tbody>${satirlar}</tbody></table>
    </body></html>`);
  pencere.document.close();
  pencere.focus();
  setTimeout(() => pencere.print(), 300);
}

// ==================== ÖZET ====================

function _tbOzetBaslat() {
  _tbEl('eskiYedekBtn').addEventListener('click', () => _tbEl('eskiYedekDosya').click());
  _tbEl('eskiYedekDosya').addEventListener('change', async e => {
    const dosya = e.target.files[0];
    e.target.value = '';
    if (!dosya) return;
    const durum = _tbEl('eskiYedekDurum');
    const btn = _tbEl('eskiYedekBtn');
    try {
      const yedek = JSON.parse(await dosya.text());
      btn.disabled = true;
      const sonuc = await tabelaEskiYedektenIceAktar(yedek, _tbAktifFirma.slug, (n, toplam) => { durum.textContent = 'Aktarılıyor... ' + n + ' / ' + toplam; });
      durum.textContent = '';
      alert(`Aktarım tamamlandı.\n\nMevcut: ${sonuc.mevcut}\nİhtiyaç: ${sonuc.ihtiyac}\nKatalog: ${sonuc.katalog}` + (sonuc.atlanan ? `\nZaten aktarılmış olduğu için atlanan: ${sonuc.atlanan}` : ''));
      _tbYenidenCiz();
    } catch (hata) {
      durum.textContent = '';
      alert(hata instanceof SyntaxError ? 'Dosya okunamadı: geçerli bir JSON değil.' : (hata.message || 'İçe aktarma başarısız.'));
    } finally {
      btn.disabled = false;
    }
  });
}

function tbOzetiCiz() {
  const ozet = tabelaOzetiHesapla();
  const kart = (etiket, deger) => `<div class="istatistik-kutu"><span>${etiket}</span><b>${deger}</b></div>`;
  _tbEl('tabelaOzetKutusu').innerHTML = `
    <div class="istatistik-grid">
      ${kart('Mevcut Tabela (Adet)', ozet.mevcutAdet)}
      ${kart('İhtiyaç (Adet)', ozet.ihtiyacAdet)}
      ${kart('Yüksek Öncelikli İhtiyaç', ozet.yuksekOncelikAdet)}
      ${kart('Katalogdaki Levha', ozet.katalogSayisi)}
    </div>
    <div class="kart">
      <h3 style="margin:0 0 8px; font-size:14px;">Bölümlere Göre</h3>
      ${ozet.bolumeGore.length ? `
        <div class="tablo-scroll"><table class="veri-tablosu">
          <thead><tr><th>Bölüm</th><th>Mevcut (Adet)</th><th>İhtiyaç (Adet)</th><th>Yüksek Öncelik</th></tr></thead>
          <tbody>${ozet.bolumeGore.map(b => `
            <tr class="tb-bolum-satir" data-bolum="${_tbKacir(b.bolum)}" title="Bu bölümün kayıtlarını aç">
              <td><b>${_tbKacir(b.bolum)}</b></td><td>${b.mevcut}</td><td>${b.ihtiyac}</td>
              <td>${b.yuksek ? `<span class="genel-rozet rozet-yuksek">${b.yuksek}</span>` : '0'}</td>
            </tr>`).join('')}</tbody>
        </table></div>` : '<div class="bos-durum gorunur">Henüz kayıt yok.</div>'}
    </div>
  `;
  _tbEl('tabelaOzetKutusu').querySelectorAll('[data-bolum]').forEach(satir => satir.addEventListener('click', () => {
    const bolum = satir.getAttribute('data-bolum');
    const ihtiyacaGit = !tabelaMevcutTumunuGetir().some(k => k.bolum === bolum);
    _tbBolumFiltreleriniDoldur();
    _tbEl(ihtiyacaGit ? 'ihtiyacBolumFiltre' : 'mevcutBolumFiltre').value = bolum;
    tbGorunumDegistir(ihtiyacaGit ? 'ihtiyac' : 'mevcut');
  }));
}
