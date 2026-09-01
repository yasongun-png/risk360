// İş İzinleri ekranı DOM işlemleri.

let _izGorunum = 'izinler';
let _duzenlenenIzinId = null;
let _izKontrolMaddeleri = [];
let _izModalTamamlaModu = false;
let _izImzaPad = null;
let _izOnayBekleyenId = null;
let _izOnayBekleyenRol = null;
let _onayImzaPad = null;

function izRozetSinifAdi(durum) {
  return slugOlustur(durum || '');
}

function _izKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// Barkod formundaki ("Formu Tamamla") ile aynı ikonlu KKD grid'i — kullanıcı
// isteği: barkod ve PC girişleri tutarlı olmalı. Kutucuk display:none
// olduğu için etikete tıklamak tarayıcı tarafından zaten native olarak
// kutucuğa yönlendirilir; burada AYRICA manuel toggle YAPILMAZ (bkz.
// is-izni-bildir.html'de daha önce düzeltilen çift-tetiklenme hatası) —
// tek doğru kaynak kutucuğun kendi 'change' olayıdır.
function _izKkdGridiCiz() {
  const kutu = document.getElementById('izKkdGrid');
  kutu.innerHTML = IS_IZNI_KKD_SECENEKLERI.map((k, i) => `
    <label class="iz-kkd-chip" data-idx="${i}">
      <input type="checkbox" value="${_izKacir(k.ad)}">
      <span class="ikon">${k.ikon}</span><span>${_izKacir(k.ad)}</span>
    </label>`).join('');
  kutu.querySelectorAll('.iz-kkd-chip').forEach(etiket => {
    const kutucuk = etiket.querySelector('input');
    kutucuk.addEventListener('change', () => {
      etiket.classList.toggle('secili', kutucuk.checked);
    });
  });
}

// Barkod formundaki imza pad'iyle (is-izni-bildir.html _iiImzaPaduBagla)
// birebir aynı — PC'den "Formu Tamamla" yapan kişi de dijital imza
// bıraksın, tutarlılık için.
function _izImzaPaduBagla(canvasId) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  let dolu = false, ciziliyor = false, sonX = 0, sonY = 0;

  function boyutlandir() {
    const oran = window.devicePixelRatio || 1;
    const genislik = canvas.clientWidth || 300, yukseklik = canvas.clientHeight || 120;
    canvas.width = genislik * oran;
    canvas.height = yukseklik * oran;
    ctx.scale(oran, oran);
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e3a8a'; // mavi dolma kalem rengi
  }
  boyutlandir();

  function konum(e) {
    const r = canvas.getBoundingClientRect();
    const x = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0].clientX);
    const y = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0].clientY);
    return { x: x - r.left, y: y - r.top };
  }
  function basla(e) { ciziliyor = true; dolu = true; const p = konum(e); sonX = p.x; sonY = p.y; }
  function ciz(e) {
    if (!ciziliyor) return;
    e.preventDefault();
    const p = konum(e);
    ctx.beginPath(); ctx.moveTo(sonX, sonY); ctx.lineTo(p.x, p.y); ctx.stroke();
    sonX = p.x; sonY = p.y;
  }
  function bitir() { ciziliyor = false; }

  canvas.addEventListener('pointerdown', basla);
  canvas.addEventListener('pointermove', ciz);
  window.addEventListener('pointerup', bitir);

  return {
    temizle() { ctx.clearRect(0, 0, canvas.width, canvas.height); dolu = false; },
    doluMu: () => dolu,
    canvasElemani: canvas
  };
}

// Storage'a yüklemek (eski hâli: fotoYukle) imzanın PDF çıktısında hiç
// görünmemesine yol açıyordu: Storage'tan dönen gerçek http(s) adresi PDF
// üretiminde CORS engeline takılıp sessizce boş dönüyor, "✓ Onaylandı"
// metnine düşülüyordu. Bunun yerine diğer modüllerin (ör. uygunsuzluk
// fotoğrafları) kullandığı fotoBuyukKaydet ile Firestore'daki ayrı bir
// "fotoğraflar" belgesine "fotoref:<id>" olarak yazılır — Storage ve
// dolayısıyla CORS hiç devreye girmez (bkz. cikti.js _izGorselCoz).
async function _izImzaYukle(canvas) {
  const firma = aktifFirmaGetir();
  const dataUrl = canvas.toDataURL('image/png');
  return fotoBuyukKaydet(dataUrl, firma ? firma.slug : '');
}

function izinSayfasiniBaslat() {
  document.querySelectorAll('[data-sekme]').forEach(btn => {
    btn.addEventListener('click', () => izGorunumDegistir(btn.getAttribute('data-sekme')));
  });

  document.getElementById('turFiltre').innerHTML += IS_IZNI_TURLERI.map(t => `<option>${t}</option>`).join('');
  document.getElementById('durumFiltre').innerHTML += IS_IZNI_DURUMLARI.map(d => `<option>${d}</option>`).join('');

  document.getElementById('yeniIzinBtn').addEventListener('click', () => izinTalepModalAc());
  document.getElementById('izinModalKapatBtn').addEventListener('click', izinModalKapat);
  document.getElementById('izinModalIptalBtn').addEventListener('click', izinModalKapat);
  document.getElementById('izinForm').addEventListener('submit', izinFormGonderildi);
  // Kullanıcı isteği: bir alanı doldurduktan sonra o alanın kırmızı hata
  // metni, tekrar "Kaydet"e basmadan hemen temizlensin (aksi halde dolu bir
  // alanın altında hâlâ "zorunludur" yazması, kayıt engelleniyormuş gibi
  // yanlış izlenim veriyordu).
  document.getElementById('izinForm').addEventListener('input', e => {
    if (!e.target.id) return;
    const hataEl = document.getElementById(e.target.id + 'Hata');
    if (hataEl) hataEl.textContent = '';
  });
  document.getElementById('izinAramaKutusu').addEventListener('input', e => izinleriCiz(e.target.value));
  document.getElementById('turFiltre').addEventListener('change', () => izinleriCiz(document.getElementById('izinAramaKutusu').value));
  document.getElementById('durumFiltre').addEventListener('change', () => izinleriCiz(document.getElementById('izinAramaKutusu').value));

  document.getElementById('itTuru').innerHTML = IS_IZNI_TURLERI.map(t => `<option>${t}</option>`).join('');
  document.getElementById('izinTalepModalKapatBtn').addEventListener('click', izinTalepModalKapat);
  document.getElementById('izinTalepModalIptalBtn').addEventListener('click', izinTalepModalKapat);
  document.getElementById('izinTalepForm').addEventListener('submit', izinTalepFormGonderildi);
  document.getElementById('izinTalepForm').addEventListener('input', e => {
    if (!e.target.id) return;
    const hataEl = document.getElementById(e.target.id + 'Hata');
    if (hataEl) hataEl.textContent = '';
  });

  document.getElementById('onayImzaKapatBtn').addEventListener('click', _onayImzaModalKapat);
  document.getElementById('onayImzaIptalBtn').addEventListener('click', _onayImzaModalKapat);
  document.getElementById('onayImzaTemizleBtn').addEventListener('click', () => { if (_onayImzaPad) _onayImzaPad.temizle(); });
  document.getElementById('onayImzaOnaylaBtn').addEventListener('click', _onayImzaOnayla);

  _izKkdGridiCiz();
  document.getElementById('izImzaTemizleBtn').addEventListener('click', () => { if (_izImzaPad) _izImzaPad.temizle(); });

  document.getElementById('izTuru').addEventListener('change', async () => {
    const isaretliVarMi = _izKontrolMaddeleri.some(m => izinKontrolDurumuCoz(m) !== 'yapilmadi' || m.not);
    if (isaretliVarMi && !(await onayModali('İzin türünü değiştirmek kontrol listesindeki işaretleri sıfırlayacak. Devam edilsin mi?', 'Devam Et'))) return;
    _izKontrolMaddeleri = izinKontrolListesiUret(document.getElementById('izTuru').value);
    kontrolListesiniCiz();
  });

  document.getElementById('disaAktarBtn').addEventListener('click', () => {
    const liste = izinleriGetir('', _izFiltreleriOku()).map(k => Object.assign({}, k, {
      baslangicGoruntu: _izTarihSaatGoruntu(k.baslangic), bitisGoruntu: _izTarihSaatGoruntu(k.bitis)
    }));
    excelDisaAktar(liste, IS_IZNI_EXPORT_KOLONLARI, 'is_izinleri.xlsx');
  });
  document.getElementById('formAyarlariBtn').addEventListener('click', () => formAyarlariModalAc('is-izni', 'İş İzinleri'));

  _gcSayfasiniBaslat();

  izOzetiCiz();
  izGorunumDegistir('izinler');
}

// ==================== GAZ ÖLÇÜM CİHAZLARI ====================
// Kullanıcı isteği: "gaz ölçüm cihazlarının bilgileri ve kalibrasyon
// bilgilerinin gireleceği bir sekme".

let _gcDuzenlenenId = null;
let _gcBelge = '';

function _gcKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function gazCihazlariniCiz(aramaMetni) {
  const govde = document.getElementById('gcTabloGovde');
  const bosDurum = document.getElementById('gcBosDurum');
  const liste = gazCihazlariniGetir(aramaMetni);

  govde.innerHTML = '';
  if (!liste.length) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = aramaMetni ? 'Aramanızla eşleşen cihaz bulunamadı.' : 'Henüz gaz ölçüm cihazı eklenmedi.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  liste.forEach(c => {
    const satir = document.createElement('tr');
    satir.innerHTML = `
      <td>${_gcKacir(c.cihazNo)}</td>
      <td>${[c.marka, c.model].filter(Boolean).map(_gcKacir).join(' ') || '-'}</td>
      <td>${_gcKacir(c.olculenGazlar)}</td>
      <td>${[c.lokasyon, c.sorumlu].filter(Boolean).map(_gcKacir).join(' — ') || '-'}</td>
      <td>${gunAyYil(c.sonKalibrasyonTarihi) || '-'}</td>
      <td>${gunAyYil(c.sonrakiKalibrasyonTarihi) || '-'}</td>
      <td><span class="genel-rozet rozet-${slugOlustur(c.durumGoruntu)}">${_gcKacir(c.durumGoruntu)}</span></td>
      <td>
        <button class="tablo-buton" data-gc-duzenle="${c.id}">Düzenle</button>
        <button class="tablo-buton sil" data-gc-sil="${c.id}">Sil</button>
      </td>
    `;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-gc-duzenle]').forEach(btn => btn.addEventListener('click', () => gcModalAc(gazCihaziIdIleGetirRepo(btn.getAttribute('data-gc-duzenle')))));
  govde.querySelectorAll('[data-gc-sil]').forEach(btn => btn.addEventListener('click', async () => {
    if (await onayModali('Bu gaz ölçüm cihazını silmek istediğinize emin misiniz?', 'Sil')) {
      const sonuc = gazCihaziSil(btn.getAttribute('data-gc-sil'));
      if (!sonuc.basarili) { alert(sonuc.hata); return; }
      gazCihazlariniCiz(document.getElementById('gcAramaKutusu').value);
    }
  }));
}

function _gcSonrakiOnizlemeGuncelle() {
  const tarih = document.getElementById('gcSonKalibrasyonTarihi').value;
  const periyot = document.getElementById('gcKalibrasyonPeriyoduAy').value;
  const kutu = document.getElementById('gcSonrakiOnizleme');
  const sonraki = gazCihaziSonrakiKalibrasyonHesapla(tarih, periyot);
  kutu.textContent = sonraki ? ('Sonraki kalibrasyon: ' + gunAyYil(sonraki)) : '';
}

function _gcBelgeOnizlemeCiz() {
  document.getElementById('gcBelgeOnizleme').innerHTML = belgeOnizlemeHtml('gcBelge', !!_gcBelge);
  if (_gcBelge) {
    document.getElementById('gcBelgeAcLink').addEventListener('click', e => { e.preventDefault(); belgeDosyasiniAc(_gcBelge); });
    document.getElementById('gcBelgeKaldirBtn').addEventListener('click', () => { _gcBelge = ''; _gcBelgeOnizlemeCiz(); });
  }
}

function _gcBelgeAlaniniKur() {
  document.getElementById('gcBelgeAlani').innerHTML = belgeYukleyiciHtml('gcBelge', 'Kalibrasyon Sertifikası');
  belgeYukleyiciBagla('gcBelge', async dosya => {
    try {
      const firma = aktifFirmaGetir();
      _gcBelge = await belgeDosyasiIsle(dosya, firma ? firma.slug : '');
      _gcBelgeOnizlemeCiz();
    } catch (hata) {
      alert(hata.message || 'Belge yüklenemedi.');
    }
  });
  _gcBelgeOnizlemeCiz();
}

function gcModalAc(cihaz) {
  _gcDuzenlenenId = cihaz ? cihaz.id : null;
  document.getElementById('gcModalBaslik').textContent = cihaz ? (cihaz.cihazNo + ' — Düzenle') : 'Yeni Gaz Ölçüm Cihazı';
  document.getElementById('gcCihazNo').value = cihaz ? cihaz.cihazNo : '';
  document.getElementById('gcDurum').innerHTML = GAZ_CIHAZI_DURUMLARI.map(d => `<option ${cihaz && cihaz.durum === d ? 'selected' : ''}>${d}</option>`).join('');
  document.getElementById('gcMarka').value = cihaz ? cihaz.marka : '';
  document.getElementById('gcModel').value = cihaz ? cihaz.model : '';
  document.getElementById('gcSeriNo').value = cihaz ? cihaz.seriNo : '';
  document.getElementById('gcOlculenGazlar').value = cihaz ? cihaz.olculenGazlar : '';
  document.getElementById('gcLokasyon').value = cihaz ? cihaz.lokasyon : '';
  document.getElementById('gcSorumlu').value = cihaz ? cihaz.sorumlu : '';
  document.getElementById('gcSonKalibrasyonTarihi').value = cihaz ? cihaz.sonKalibrasyonTarihi : '';
  document.getElementById('gcKalibrasyonPeriyoduAy').value = cihaz ? cihaz.kalibrasyonPeriyoduAy : 12;
  document.getElementById('gcKalibrasyonFirmasi').value = cihaz ? cihaz.kalibrasyonFirmasi : '';
  document.getElementById('gcNotlar').value = cihaz ? cihaz.notlar : '';
  _gcBelge = cihaz ? (cihaz.sertifikaBelgesi || '') : '';
  _gcBelgeAlaniniKur();
  _gcSonrakiOnizlemeGuncelle();
  document.querySelectorAll('#gcForm .alan-hatasi').forEach(el => el.textContent = '');
  document.getElementById('gcModalKatman').classList.add('acik');
}

function gcModalKapat() {
  document.getElementById('gcModalKatman').classList.remove('acik');
  _gcDuzenlenenId = null;
}

function gcFormGonderildi(e) {
  e.preventDefault();
  document.querySelectorAll('#gcForm .alan-hatasi').forEach(el => el.textContent = '');
  const veriler = {
    cihazNo: document.getElementById('gcCihazNo').value,
    durum: document.getElementById('gcDurum').value,
    marka: document.getElementById('gcMarka').value,
    model: document.getElementById('gcModel').value,
    seriNo: document.getElementById('gcSeriNo').value,
    olculenGazlar: document.getElementById('gcOlculenGazlar').value,
    lokasyon: document.getElementById('gcLokasyon').value,
    sorumlu: document.getElementById('gcSorumlu').value,
    sonKalibrasyonTarihi: document.getElementById('gcSonKalibrasyonTarihi').value,
    kalibrasyonPeriyoduAy: document.getElementById('gcKalibrasyonPeriyoduAy').value,
    kalibrasyonFirmasi: document.getElementById('gcKalibrasyonFirmasi').value,
    sertifikaBelgesi: _gcBelge,
    notlar: document.getElementById('gcNotlar').value
  };
  const sonuc = _gcDuzenlenenId ? gazCihaziGuncelle(_gcDuzenlenenId, veriler) : gazCihaziEkle(veriler);
  if (!sonuc.basarili) {
    Object.keys(sonuc.hatalar || {}).forEach(alan => {
      const hataEl = document.getElementById('gc' + alan.charAt(0).toUpperCase() + alan.slice(1) + 'Hata');
      if (hataEl) hataEl.textContent = sonuc.hatalar[alan];
    });
    return;
  }
  gcModalKapat();
  gazCihazlariniCiz(document.getElementById('gcAramaKutusu').value);
}

function _gcSayfasiniBaslat() {
  document.getElementById('gcYeniBtn').addEventListener('click', () => gcModalAc());
  document.getElementById('gcModalKapatBtn').addEventListener('click', gcModalKapat);
  document.getElementById('gcModalIptalBtn').addEventListener('click', gcModalKapat);
  document.getElementById('gcForm').addEventListener('submit', gcFormGonderildi);
  document.getElementById('gcSonKalibrasyonTarihi').addEventListener('change', _gcSonrakiOnizlemeGuncelle);
  document.getElementById('gcKalibrasyonPeriyoduAy').addEventListener('input', _gcSonrakiOnizlemeGuncelle);
  document.getElementById('gcAramaKutusu').addEventListener('input', e => gazCihazlariniCiz(e.target.value));
}

const IS_IZNI_EXPORT_KOLONLARI = [
  { anahtar: 'izinNo', baslik: 'İzin No' },
  { anahtar: 'izinTuru', baslik: 'İzin Türü' },
  { anahtar: 'isTanimi', baslik: 'İş Tanımı' },
  { anahtar: 'bolum', baslik: 'Bölüm' },
  { anahtar: 'lokasyon', baslik: 'Lokasyon' },
  { anahtar: 'baslangicGoruntu', baslik: 'Başlangıç' },
  { anahtar: 'bitisGoruntu', baslik: 'Bitiş' },
  { anahtar: 'riskSeviyesi', baslik: 'Risk Seviyesi' },
  { anahtar: 'durumGoruntu', baslik: 'Durum' },
  { anahtar: 'onayDurumu', baslik: 'Onay Durumu' }
];

function _izTarihSaatGoruntu(iso) {
  if (!iso) return '-';
  const [tarih, saat] = iso.split('T');
  return gunAyYil(tarih) + (saat ? ' ' + saat : '');
}

function _izFiltreleriOku() {
  return {
    izinTuru: document.getElementById('turFiltre').value,
    durum: document.getElementById('durumFiltre').value
  };
}

function izGorunumDegistir(gorunum) {
  _izGorunum = gorunum;
  ['izinler', 'gazCihazlari', 'ozet'].forEach(g => {
    document.querySelector(`[data-sekme="${g}"]`).classList.toggle('sekme-seciliDegil', g !== gorunum);
    document.getElementById('bolum-' + g).style.display = g === gorunum ? '' : 'none';
  });
  if (gorunum === 'izinler') izinleriCiz(document.getElementById('izinAramaKutusu').value);
  else if (gorunum === 'gazCihazlari') gazCihazlariniCiz(document.getElementById('gcAramaKutusu').value);
  else izOzetiCiz();
}

function kontrolListesiniCiz() {
  const kutu = document.getElementById('kontrolListesi');
  kutu.innerHTML = _izKontrolMaddeleri.map((m, i) => `
    <div style="display:flex; align-items:center; gap:8px; padding:4px 0; border-bottom:1px solid var(--kenarlik);">
      <select data-ki="${i}" style="width:auto; margin:0; padding:4px 6px; font-size:12px;">
        ${IS_IZNI_KONTROL_DURUMLARI.map(d => `<option value="${d}" ${izinKontrolDurumuCoz(m) === d ? 'selected' : ''}>${IS_IZNI_KONTROL_DURUM_ETIKETLERI[d]}</option>`).join('')}
      </select>
      <span style="flex:1; font-size:13px;">${m.metin}</span>
      <input type="text" data-kn="${i}" placeholder="Not" value="${m.not || ''}" style="width:140px; margin:0; padding:4px 6px; font-size:12px;">
    </div>
  `).join('');
  kutu.querySelectorAll('[data-ki]').forEach(sel => sel.addEventListener('change', () => { _izKontrolMaddeleri[Number(sel.getAttribute('data-ki'))].durum = sel.value; }));
  kutu.querySelectorAll('[data-kn]').forEach(inp => inp.addEventListener('input', () => { _izKontrolMaddeleri[Number(inp.getAttribute('data-kn'))].not = inp.value; }));
}

function izinleriCiz(aramaMetni) {
  const govde = document.getElementById('izinTabloGovde');
  const bosDurum = document.getElementById('izinBosDurum');
  const liste = izinleriGetir(aramaMetni, _izFiltreleriOku());
  const kullanici = oturumdakiKullanici();

  govde.innerHTML = '';
  if (!liste.length) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = 'Eşleşen iş izni bulunamadı.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  liste.forEach(k => {
    const satir = document.createElement('tr');
    // Taslak durumundaki kayıt henüz barkod/PC "Yeni Talep" ile açılmış,
    // kalan bilgiler doldurulmamış — "Düzenle" yerine "Formu Tamamla"
    // gösterilir (bkz. izinModalAc'in ikinci parametresi).
    const islemler = k.durumGoruntu === 'Taslak'
      ? [`<button class="tablo-buton" data-tamamla="${k.id}">Formu Tamamla</button>`]
      : [`<button class="tablo-buton" data-duzenle="${k.id}">Düzenle</button>`];
    islemler.push(`<button class="tablo-buton" data-form="${k.id}">Form</button>`);
    if (k.durumGoruntu === 'Onay Bekliyor') {
      // Barkoddaki dijital imza rolleriyle (Bakım Personeli/İSG) aynı —
      // kullanıcı isteği: barkod ve PC girişleri tutarlı olmalı. Genel onayı
      // sadece İSG ilerletir (bkz. service.js izinOnayVer) — bakım onayı
      // kendi imzasını bırakır ama İSG onayı butonunu düşürmez. Zaten
      // imzalanmış rolün butonu tekrar tekrar tıklanmasın diye gizlenir.
      if (!(k.imzalar && k.imzalar.bakim) && _izBakimRoluMu(kullanici)) islemler.push(`<button class="tablo-buton" data-onay="${k.id}" data-rol="bakim">🔧 Bakım Onayı</button>`);
      if (!(k.imzalar && k.imzalar.isg) && _izIsgOnaylayiciMi(kullanici)) islemler.push(`<button class="tablo-buton" data-onay="${k.id}" data-rol="isg">🛡️ İSG Onayı</button>`);
      islemler.push(`<button class="tablo-buton sil" data-red="${k.id}">Reddet</button>`);
    } else if (['Onaylandı', 'Gerekmiyor'].includes(k.onayDurumu) && k.durum !== 'Aktif' && !IS_IZNI_TERMINAL_DURUMLAR.includes(k.durum)) {
      islemler.push(`<button class="tablo-buton" data-aktif="${k.id}">Aktifleştir</button>`);
    } else if (k.durum === 'Aktif') {
      islemler.push(`<button class="tablo-buton" data-kapat="${k.id}">Kapat</button>`);
      islemler.push(`<button class="tablo-buton sil" data-durdur="${k.id}">Durdur</button>`);
    }
    // Kullanıcı isteği: bakım onarım listesindeki gibi Sil sadece admin'e
    // görünsün — diğer roller zaten servis katmanında engelleniyordu, ama
    // buton herkese görünüyor olması gereksiz tıklama/"yetkiniz yok" hatası
    // üretiyordu.
    if (kullaniciAdminMi(kullanici)) islemler.push(`<button class="tablo-buton sil" data-sil="${k.id}">Sil</button>`);

    satir.innerHTML = `
      <td>${_izKacir(k.izinNo)}</td>
      <td>${_izKacir(k.izinTuru)}</td>
      <td>${_izKacir(k.isTanimi)}</td>
      <td>${_izKacir([k.bolum, k.lokasyon].filter(Boolean).join(' / ') || '-')}</td>
      <td>${_izTarihSaatGoruntu(k.baslangic)}</td>
      <td>${_izTarihSaatGoruntu(k.bitis)}</td>
      <td><span class="genel-rozet rozet-${izRozetSinifAdi(k.riskSeviyesi)}">${_izKacir(k.riskSeviyesi)}</span></td>
      <td>
        <span class="genel-rozet rozet-${izRozetSinifAdi(k.durumGoruntu)}">${_izKacir(k.durumGoruntu)}</span> <span style="font-size:11px; color:var(--metin-soluk);">%${k.tamamlanmaOrani}</span>
        ${k.durumGoruntu === 'Onay Bekliyor' && izinBeklemeGunSayisi(k) >= IS_IZNI_GECIKME_ESIK_GUN ? `<span class="yanip-sonen-uyari">⚠️ ${izinBeklemeGunSayisi(k)} gündür bekliyor</span>` : ''}
      </td>
      <td><span class="genel-rozet rozet-${izRozetSinifAdi(k.onayDurumu)}">${_izKacir(k.onayDurumu)}</span></td>
      <td>${islemler.join(' ')}</td>
    `;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-duzenle]').forEach(btn => btn.addEventListener('click', () => izinModalAc(izinIdIleGetirRepo(btn.getAttribute('data-duzenle')))));
  govde.querySelectorAll('[data-tamamla]').forEach(btn => btn.addEventListener('click', () => izinModalAc(izinIdIleGetirRepo(btn.getAttribute('data-tamamla')), true)));
  govde.querySelectorAll('[data-form]').forEach(btn => btn.addEventListener('click', async () => {
    try { await izinFormunuPdfOlustur(btn.getAttribute('data-form')); } catch (hata) { console.error(hata); alert('PDF üretilemedi: ' + (hata.message || hata)); }
  }));
  govde.querySelectorAll('[data-onay]').forEach(btn => btn.addEventListener('click', () => {
    _onayImzaModalAc(btn.getAttribute('data-onay'), btn.getAttribute('data-rol'));
  }));
  govde.querySelectorAll('[data-red]').forEach(btn => btn.addEventListener('click', async () => {
    const sebep = await metinIstemModali('Red Sebebi', 'Sebebi yazın…', '');
    if (sebep === null) return;
    const sonuc = izinReddet(btn.getAttribute('data-red'), '', sebep);
    if (!sonuc.basarili) { alert(sonuc.hata); return; }
    izinleriCiz(document.getElementById('izinAramaKutusu').value);
    izOzetiCiz();
  }));
  govde.querySelectorAll('[data-aktif]').forEach(btn => btn.addEventListener('click', () => {
    const sonuc = izinAktifEt(btn.getAttribute('data-aktif'));
    if (!sonuc.basarili) { alert(sonuc.hata); return; }
    izinleriCiz(document.getElementById('izinAramaKutusu').value);
  }));
  govde.querySelectorAll('[data-durdur]').forEach(btn => btn.addEventListener('click', async () => {
    if (await onayModali('Bu izin durdurulsun mu?', 'Durdur')) { izinDurdur(btn.getAttribute('data-durdur')); izinleriCiz(document.getElementById('izinAramaKutusu').value); }
  }));
  govde.querySelectorAll('[data-kapat]').forEach(btn => btn.addEventListener('click', async () => {
    const not = await metinIstemModali('Kapanış Notu', 'Notunuzu yazın (opsiyonel)…', 'İş güvenli şekilde tamamlandı.');
    if (not !== null) { izinKapat(btn.getAttribute('data-kapat'), not); izinleriCiz(document.getElementById('izinAramaKutusu').value); izOzetiCiz(); }
  }));
  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', async () => {
    if (await onayModali('Bu iş izni kaydını silmek istediğinize emin misiniz?', 'Sil')) { izinSil(btn.getAttribute('data-sil')); izinleriCiz(document.getElementById('izinAramaKutusu').value); izOzetiCiz(); }
  }));
}

function izinModalAc(kayit, tamamlaModu) {
  _duzenlenenIzinId = kayit ? kayit.id : null;
  _izModalTamamlaModu = !!tamamlaModu;
  document.getElementById('izinModalBaslik').textContent = tamamlaModu
    ? (kayit.izinNo + ' — Formu Tamamla')
    : (kayit ? (kayit.izinNo + ' İznini Düzenle') : 'Yeni İş İzni');
  document.getElementById('izinKaydetBtn').textContent = tamamlaModu ? 'Formu Tamamla ve Kaydet' : 'Kaydet';

  document.getElementById('izTuru').innerHTML = IS_IZNI_TURLERI.map(t => `<option ${kayit && kayit.izinTuru === t ? 'selected' : ''}>${t}</option>`).join('');
  document.getElementById('izRiskSeviyesi').innerHTML = IS_IZNI_RISK_SEVIYELERI.map(r => `<option ${kayit && kayit.riskSeviyesi === r ? 'selected' : ''}>${r}</option>`).join('');
  document.getElementById('izIsTanimi').value = kayit ? kayit.isTanimi : '';
  document.getElementById('izAciklama').value = kayit ? kayit.aciklama : '';
  document.getElementById('izBolum').value = kayit ? kayit.bolum : '';
  document.getElementById('izLokasyon').value = kayit ? kayit.lokasyon : '';
  document.getElementById('izYuklenici').value = kayit ? kayit.yuklenici : '';
  document.getElementById('izTalepEden').value = kayit ? kayit.talepEden : '';
  document.getElementById('izSahaSorumlusu').value = kayit ? kayit.sahaSorumlusu : '';
  document.getElementById('izCalisanlar').value = kayit ? (kayit.calisanlar || []).join('; ') : '';
  document.getElementById('izBaslangic').value = kayit ? kayit.baslangic : _izVarsayilanBaslangic();
  document.getElementById('izBitis').value = kayit ? kayit.bitis : _izVarsayilanBitis();

  const seciliKkd = new Set(kayit ? (kayit.gerekliKkd || []) : []);
  document.querySelectorAll('#izKkdGrid .iz-kkd-chip').forEach(etiket => {
    const kutucuk = etiket.querySelector('input');
    kutucuk.checked = seciliKkd.has(kutucuk.value);
    etiket.classList.toggle('secili', kutucuk.checked);
  });

  // Barkoddaki "Formu Tamamla" ile tutarlılık: talep eden imzası sadece bu
  // aşamada isteniyor, düzenlemede opsiyonel/gizli. Farklı bir izin
  // açıldığında imza her zaman temizlenir (barkoddaki _ftIzinSecildi ile
  // aynı davranış).
  document.getElementById('izImzaBolumu').style.display = tamamlaModu ? '' : 'none';
  document.getElementById('izImzaAdSoyad').value = kayit ? (kayit.talepEden || '') : '';
  requestAnimationFrame(() => {
    if (!_izImzaPad) _izImzaPad = _izImzaPaduBagla('izImzaCanvas');
    if (_izImzaPad) _izImzaPad.temizle();
  });

  _izKontrolMaddeleri = kayit ? JSON.parse(JSON.stringify(kayit.kontrolMaddeleri)) : izinKontrolListesiUret(document.getElementById('izTuru').value);
  kontrolListesiniCiz();

  const gaz = kayit ? kayit.gazOlcumu : { oksijen: '', lel: '', toksik: '', olcumZamani: '', olcenKisi: '' };
  document.getElementById('izOksijen').value = gaz.oksijen;
  document.getElementById('izLel').value = gaz.lel;
  document.getElementById('izToksik').value = gaz.toksik;
  document.getElementById('izOlcumZamani').value = gaz.olcumZamani;
  document.getElementById('izOlcenKisi').value = gaz.olcenKisi;

  const izo = kayit ? kayit.izolasyon : { lotoGerekli: false, lotoUygulandi: false, enerjiIzolasyonu: '', korlemeListesi: '' };
  document.getElementById('izLotoGerekli').checked = !!izo.lotoGerekli;
  document.getElementById('izLotoUygulandi').checked = !!izo.lotoUygulandi;
  document.getElementById('izEnerjiIzolasyonu').value = izo.enerjiIzolasyonu;
  document.getElementById('izKorlemeListesi').value = izo.korlemeListesi;

  // Salt-okunur bilgi amaçlı: onayDurumu/durum bu formdan gönderilmez, sadece
  // Onay Ver/Reddet/Aktifleştir/Durdur/Kapat aksiyonlarıyla değişir (bkz.
  // izinGuncelle) — bu yüzden düzenlenebilir bir alan (select) yerine düz
  // etiket olarak gösterilir (kullanıcı isteği: "neden değiştiremiyorum"
  // izlenimi vermesin).
  const onayDurumuMetni = kayit ? kayit.onayDurumu : 'Gerekmiyor';
  const durumMetni = kayit ? kayit.durum : 'Taslak';
  document.getElementById('izOnayDurumuEtiket').textContent = onayDurumuMetni;
  document.getElementById('izOnayDurumuEtiket').className = 'genel-rozet rozet-' + izRozetSinifAdi(onayDurumuMetni);
  document.getElementById('izDurumEtiket').textContent = durumMetni;
  document.getElementById('izDurumEtiket').className = 'genel-rozet rozet-' + izRozetSinifAdi(durumMetni);
  document.getElementById('izNotlar').value = kayit ? kayit.notlar : '';

  document.querySelectorAll('#izinForm .alan-hatasi').forEach(el => el.textContent = '');
  document.getElementById('izinModalKatman').classList.add('acik');
}

function _izVarsayilanBaslangic() {
  const d = new Date();
  d.setHours(8, 0, 0, 0);
  return d.toISOString().slice(0, 16);
}

function _izVarsayilanBitis() {
  const d = new Date();
  d.setHours(16, 0, 0, 0);
  return d.toISOString().slice(0, 16);
}

function izinModalKapat() {
  document.getElementById('izinModalKatman').classList.remove('acik');
  _duzenlenenIzinId = null;
  _izModalTamamlaModu = false;
}

// ===================== ONAY İMZA MODALI =====================
// Barkoddaki "İmza At" ile aynı: Bakım/İSG onayı artık tek tıkla değil,
// gerçek çizilmiş bir imzayla veriliyor (bkz. service.js izinOnayVer).
// Onaylayan adı SALT OKUNUR — oturumdaki kullanıcıdan otomatik gelir,
// serbest metinle değiştirilemez (kullanıcı isteği: "onaylayan
// kullanıcının adı soyadı yazsın formda"). Aksi halde herhangi biri bu
// alanı değiştirip onayı başka bir kişi adına atmış gibi gösterebilirdi
// — aynı kaygıyla izinOnayVer zaten serbest metin prompt'unu kaldırmıştı.

function _onayImzaModalAc(id, rol) {
  _izOnayBekleyenId = id;
  _izOnayBekleyenRol = rol;
  document.getElementById('onayImzaBaslik').textContent = (rol === 'isg' ? 'İSG Onayı' : 'Bakım Onayı') + ' — İmza';
  document.getElementById('onayImzaAdSoyad').value = (oturumdakiKullanici() || {}).adSoyad || '';
  document.getElementById('onayImzaHata').textContent = '';
  document.getElementById('onayImzaModalKatman').classList.add('acik');
  requestAnimationFrame(() => {
    if (!_onayImzaPad) _onayImzaPad = _izImzaPaduBagla('onayImzaCanvas');
    if (_onayImzaPad) _onayImzaPad.temizle();
  });
}

function _onayImzaModalKapat() {
  document.getElementById('onayImzaModalKatman').classList.remove('acik');
  _izOnayBekleyenId = null;
  _izOnayBekleyenRol = null;
}

async function _onayImzaOnayla() {
  const hataEl = document.getElementById('onayImzaHata');
  const ad = document.getElementById('onayImzaAdSoyad').value.trim();
  if (!ad) { hataEl.textContent = 'Lütfen adınızı girin.'; return; }
  if (!_onayImzaPad || !_onayImzaPad.doluMu()) { hataEl.textContent = 'Lütfen imza alanına imzanızı atın.'; return; }

  const btn = document.getElementById('onayImzaOnaylaBtn');
  btn.disabled = true;
  btn.textContent = 'Kaydediliyor…';
  try {
    const imzaUrl = await _izImzaYukle(_onayImzaPad.canvasElemani);
    const sonuc = izinOnayVer(_izOnayBekleyenId, _izOnayBekleyenRol, ad, imzaUrl);
    if (!sonuc.basarili) { hataEl.textContent = sonuc.hata; return; }
    _onayImzaModalKapat();
    izinleriCiz(document.getElementById('izinAramaKutusu').value);
    izOzetiCiz();
  } catch (hata) {
    console.error('İmza yüklenemedi:', hata);
    hataEl.textContent = 'İmza yüklenemedi, lütfen tekrar deneyin.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Onayla';
  }
}

// ===================== YENİ TALEP MODALI =====================
// Barkod formundaki Mod 1 ("Yeni Talep") ile aynı — sadece asgari alanlar.

// Bakım Onarım modülü burada yüklenmez (aynı isimli özel yardımcılar
// çakışabilir) — tenant anahtarı doğrudan okunur, aynı is-izni-bildir.html
// _iiBakimTalepleriniDoldur deseniyle.
function _itBakimTalepleriniDoldur() {
  const secim = document.getElementById('itBakimTalebi');
  const kapali = ['Kapatıldı', 'Reddedildi'];
  const liste = oku(tenantAnahtar('bakim_talepleri'), []).filter(t => !kapali.includes(t.durum));
  secim.innerHTML = '<option value="">— Bağlantısız / Genel İş İzni —</option>' +
    liste.map(t => `<option value="${t.id}">${_izKacir(t.talepNo)} — ${_izKacir(t.talep.isTanimi)}</option>`).join('');
}

function izinTalepModalAc() {
  document.getElementById('itIsTanimi').value = '';
  document.getElementById('itBolum').value = '';
  document.getElementById('itTalepEden').value = '';
  _itBakimTalepleriniDoldur();
  document.querySelectorAll('#izinTalepForm .alan-hatasi').forEach(el => el.textContent = '');
  document.getElementById('izinTalepModalKatman').classList.add('acik');
}

function izinTalepModalKapat() {
  document.getElementById('izinTalepModalKatman').classList.remove('acik');
}

// İş izni ilgili bir bakım talebine bağlıysa, o talebin kendi kaydına da
// bu iznin referansı işlenir (bkz. is-izni-bildir.html aynı isimli mantık
// _iiBakimTalebineIsle) — bakım-talep modülü burada yüklenmediği için
// doğrudan oku/yaz ile.
async function _itBakimTalebineIsle(bakimTalepId, izin) {
  if (!bakimTalepId) return;
  const anahtar = tenantAnahtar('bakim_talepleri');
  const liste = oku(anahtar, []);
  const index = liste.findIndex(t => t.id === bakimTalepId);
  if (index === -1) return;
  const mevcutIzinler = Array.isArray(liste[index].isIzinleri) ? liste[index].isIzinleri : [];
  liste[index] = Object.assign({}, liste[index], {
    isIzinleri: mevcutIzinler.concat([{ id: izin.id, izinNo: izin.izinNo, olusturmaTarihi: izin.olusturmaTarihi }])
  });
  await yazVeSonucuGetir(anahtar, liste);
}

async function izinTalepFormGonderildi(e) {
  e.preventDefault();
  document.querySelectorAll('#izinTalepForm .alan-hatasi').forEach(el => el.textContent = '');

  const veriler = {
    izinTuru: document.getElementById('itTuru').value,
    isTanimi: document.getElementById('itIsTanimi').value,
    bolum: document.getElementById('itBolum').value,
    bakimTalepId: document.getElementById('itBakimTalebi').value,
    talepEden: document.getElementById('itTalepEden').value
  };

  const sonuc = izinEkle(veriler);
  if (!sonuc.basarili) {
    Object.keys(sonuc.hatalar || {}).forEach(alan => {
      const hataEl = document.getElementById('it' + alan.charAt(0).toUpperCase() + alan.slice(1) + 'Hata');
      if (hataEl) hataEl.textContent = sonuc.hatalar[alan];
    });
    return;
  }
  await _itBakimTalebineIsle(veriler.bakimTalepId, sonuc.kayit);

  izinTalepModalKapat();
  izinleriCiz(document.getElementById('izinAramaKutusu').value);
  izOzetiCiz();
}

async function izinFormGonderildi(e) {
  e.preventDefault();
  document.querySelectorAll('#izinForm .alan-hatasi').forEach(el => el.textContent = '');

  // Barkoddaki Mod 2 ("Formu Tamamla") ile aynı kural: talep eden imzası
  // bu aşamada zorunlu. Düzenle modunda opsiyonel (boş bırakılabilir).
  if (_izModalTamamlaModu && (!_izImzaPad || !_izImzaPad.doluMu())) {
    alert('Lütfen imza alanına imzanızı atın.');
    return;
  }

  const veriler = {
    izinTuru: document.getElementById('izTuru').value,
    isTanimi: document.getElementById('izIsTanimi').value,
    aciklama: document.getElementById('izAciklama').value,
    bolum: document.getElementById('izBolum').value,
    lokasyon: document.getElementById('izLokasyon').value,
    yuklenici: document.getElementById('izYuklenici').value,
    talepEden: document.getElementById('izTalepEden').value,
    sahaSorumlusu: document.getElementById('izSahaSorumlusu').value,
    calisanlar: document.getElementById('izCalisanlar').value,
    gerekliKkd: Array.from(document.querySelectorAll('#izKkdGrid input:checked')).map(i => i.value),
    riskSeviyesi: document.getElementById('izRiskSeviyesi').value,
    baslangic: document.getElementById('izBaslangic').value,
    bitis: document.getElementById('izBitis').value,
    kontrolMaddeleri: _izKontrolMaddeleri,
    gazOlcumu: {
      oksijen: document.getElementById('izOksijen').value,
      lel: document.getElementById('izLel').value,
      toksik: document.getElementById('izToksik').value,
      olcumZamani: document.getElementById('izOlcumZamani').value,
      olcenKisi: document.getElementById('izOlcenKisi').value
    },
    izolasyon: {
      lotoGerekli: document.getElementById('izLotoGerekli').checked,
      lotoUygulandi: document.getElementById('izLotoUygulandi').checked,
      enerjiIzolasyonu: document.getElementById('izEnerjiIzolasyonu').value,
      korlemeListesi: document.getElementById('izKorlemeListesi').value
    },
    notlar: document.getElementById('izNotlar').value
  };

  let talepEdenImza = null;
  if (_izModalTamamlaModu && _izImzaPad && _izImzaPad.doluMu()) {
    try {
      const imzaUrl = await _izImzaYukle(_izImzaPad.canvasElemani);
      talepEdenImza = izinImzaVeriUret(document.getElementById('izImzaAdSoyad').value.trim() || veriler.talepEden, imzaUrl);
    } catch (hata) {
      console.error('İmza yüklenemedi:', hata);
      alert('İmza yüklenemedi, lütfen tekrar deneyin.');
      return;
    }
  }

  const sonuc = !_duzenlenenIzinId ? izinEkle(veriler)
    : _izModalTamamlaModu ? izinFormunuTamamla(_duzenlenenIzinId, veriler, talepEdenImza)
    : izinGuncelle(_duzenlenenIzinId, veriler);
  if (!sonuc.basarili) {
    Object.keys(sonuc.hatalar || {}).forEach(alan => {
      const hataEl = document.getElementById('iz' + alan.charAt(0).toUpperCase() + alan.slice(1) + 'Hata');
      if (hataEl) hataEl.textContent = sonuc.hatalar[alan];
    });
    return;
  }

  izinModalKapat();
  izinleriCiz(document.getElementById('izinAramaKutusu').value);
  izOzetiCiz();
}

function izOzetiCiz() {
  const ozet = izinOzetiHesapla();
  const kutu = document.getElementById('izinOzetKutusu');
  const kart = (etiket, deger, uyariMi) => `<div class="istatistik-kutu"${uyariMi ? ' style="background:#fee2e2;"' : ''}><span>${etiket}</span><b${uyariMi ? ' style="color:#b91c1c;"' : ''}>${deger}</b></div>`;
  const liste = (baslik, satirlar, bosMetin) => `
    <div class="kart" style="margin-bottom:14px;">
      <div class="card-title" style="margin-bottom:8px;"><h3 style="margin:0; font-size:14px;">${baslik}</h3></div>
      ${satirlar.length
        ? satirlar.map(s => `<div style="display:flex; justify-content:space-between; font-size:13px; padding:6px 0; border-bottom:1px solid var(--kenarlik);"><span>${s[0]}</span><strong>${s[1]}</strong></div>`).join('')
        : `<div class="bos-durum gorunur">${bosMetin}</div>`}
    </div>
  `;

  kutu.innerHTML = `
    <div class="istatistik-grid">
      ${kart('Açık İzinler', ozet.acik)}
      ${kart('Onay Bekleyen', ozet.onayBekleyen)}
      ${kart(IS_IZNI_GECIKME_ESIK_GUN + '+ Gündür Onay Bekleyen', ozet.onayGecikenSayisi, ozet.onayGecikenSayisi > 0)}
      ${kart('Süresi Geçen', ozet.suresiGecen)}
      ${kart('Yüksek/Kritik Risk (Açık)', ozet.yuksekVeUstuRisk)}
    </div>
    <div class="modul-grid" style="grid-template-columns: repeat(auto-fill, minmax(280px,1fr));">
      <div>${liste('Kontrol Listesi Tamamlanma Düşük (%80 altı)', ozet.tamamlanmaUyarilari.map(k => [k.izinNo + ' - ' + k.isTanimi, '%' + k.tamamlanmaOrani]), 'Uyarı yok.')}</div>
      <div>${liste('4 Saat İçinde Bitecek Aktif İzinler', ozet.yakindaBitecekler.map(k => [k.izinNo + ' - ' + k.isTanimi, _izTarihSaatGoruntu(k.bitis)]), 'Yaklaşan bitiş yok.')}</div>
      <div>${liste('Kritik Riskli Açık İzinler', ozet.kritikAcikListesi.map(k => [k.izinNo + ' - ' + k.isTanimi, k.durumGoruntu]), 'Kritik açık izin yok.')}</div>
    </div>
  `;
}
