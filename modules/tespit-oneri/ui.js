// Tespit ve Öneri Defteri ekranının DOM işlemleri.

let _toGorunum = 'kayitlar';
let _toDuzenlenenKayitId = null;
let _toDefterFotografi = '';

function _toKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// Kullanıcı isteği: "tespit ve öneri defterinde sicil no ya göre filtreleme
// yapılsın" -- İşyeri Sicili dropdown'ını, kayıtlarda geçen benzersiz
// sicil değerlerinden doldurur (bkz. modules/uygunsuzluk/ui.js
// _usBolumFiltreDoldur ile aynı desen).
function _toSicilFiltreDoldur() {
  const secim = document.getElementById('sicilFiltre');
  const oncekiSecim = secim.value;
  const siciller = Array.from(new Set(
    tespitOneriKayitlariniGetir('', {}).map(k => (k.isyeriSicili || '').trim()).filter(Boolean)
  )).sort((a, b) => a.localeCompare(b, 'tr'));

  secim.innerHTML = '<option value="">Tüm İşyeri Sicilleri</option>' +
    siciller.map(s => `<option value="${_toKacir(s)}">${_toKacir(s)}</option>`).join('');

  secim.value = siciller.includes(oncekiSecim) ? oncekiSecim : '';
}

// Kullanıcı isteği: "iş güvenliği uzmanı filtesi de olsun" -- Tespiti
// Yapan alanındaki benzersiz isimlerden doldurulan filtre (bkz.
// _toSicilFiltreDoldur ile aynı desen).
function _toUzmanFiltreDoldur() {
  const secim = document.getElementById('uzmanFiltre');
  const oncekiSecim = secim.value;
  const uzmanlar = Array.from(new Set(
    tespitOneriKayitlariniGetir('', {}).map(k => (k.tespitEden || '').trim()).filter(Boolean)
  )).sort((a, b) => a.localeCompare(b, 'tr'));

  secim.innerHTML = '<option value="">Tüm İş Güvenliği Uzmanları</option>' +
    uzmanlar.map(u => `<option value="${_toKacir(u)}">${_toKacir(u)}</option>`).join('');

  secim.value = uzmanlar.includes(oncekiSecim) ? oncekiSecim : '';
}

// Kullanıcı isteği: "tespit öneri ana sayfa üstünde hangi sicile kaç adet
// tespit öneri yapıldı gibi istatistikler olsun" -- sekmeden bağımsız,
// sayfanın en üstünde her zaman görünen kısa dağılım kutusu (bkz.
// service.js tespitOneriOzetiHesapla().sicileGore).
function _toSicilIstatistikleriCiz() {
  const kutu = document.getElementById('sicilIstatistikKutusu');
  const sicileGore = tespitOneriOzetiHesapla().sicileGore;
  if (!sicileGore.length) { kutu.style.display = 'none'; return; }

  kutu.style.display = '';
  kutu.innerHTML = `
    <div style="font-size:12px; font-weight:700; color:var(--metin-soluk); text-transform:uppercase; margin-bottom:8px;">İşyeri Siciline Göre Tespit/Öneri Sayısı</div>
    <div style="display:flex; gap:8px; flex-wrap:wrap;">
      ${sicileGore.map(([sicil, adet]) => `
        <span class="genel-rozet rozet-orta" title="${_toKacir(sicil)}">${_toKacir(sicil)}: ${adet}</span>
      `).join('')}
    </div>
  `;
}

function _toFotoOnizlemeCiz(url) {
  const kutu = document.getElementById('defterFotografiOnizleme');
  kutu.innerHTML = url
    ? `<div style="display:flex; align-items:center; gap:10px;">
         <img data-foto-ref="${url}" style="width:72px; height:72px; object-fit:cover; border-radius:8px; border:1px solid var(--kenarlik);">
         <div>
           <div style="font-size:12px; color:#16a34a; font-weight:600;">✓ Fotoğraf eklendi</div>
           <button type="button" class="tablo-buton sil" style="margin-top:4px;">Fotoğrafı Kaldır</button>
         </div>
       </div>`
    : '<div style="font-size:12px; color:var(--metin-soluk);">Henüz fotoğraf eklenmedi.</div>';
  if (url) {
    kutu.querySelector('button').addEventListener('click', () => { _toDefterFotografi = ''; _toFotoOnizlemeCiz(''); });
    fotoReferanslariCoz(kutu);
  }
}

function toRozetSinifAdi(durum) {
  return slugOlustur(durum || '');
}

function tespitOneriSayfasiniBaslat() {
  document.getElementById('sekmeKayitlar').addEventListener('click', () => toGorunumDegistir('kayitlar'));
  document.getElementById('sekmeOzet').addEventListener('click', () => toGorunumDegistir('ozet'));

  document.getElementById('yeniKayitBtn').addEventListener('click', () => toKayitModalAc());
  document.getElementById('modalKapatBtn').addEventListener('click', toKayitModalKapat);
  document.getElementById('modalIptalBtn').addEventListener('click', toKayitModalKapat);
  document.getElementById('kayitForm').addEventListener('submit', toFormGonderildi);
  document.getElementById('aramaKutusu').addEventListener('input', e => toKayitlariCiz(e.target.value));
  document.getElementById('durumFiltre').addEventListener('change', () => toKayitlariCiz(document.getElementById('aramaKutusu').value));
  document.getElementById('oncelikFiltre').addEventListener('change', () => toKayitlariCiz(document.getElementById('aramaKutusu').value));
  document.getElementById('sicilFiltre').addEventListener('change', () => toKayitlariCiz(document.getElementById('aramaKutusu').value));
  document.getElementById('uzmanFiltre').addEventListener('change', () => toKayitlariCiz(document.getElementById('aramaKutusu').value));

  document.getElementById('defterFotografiDosya').addEventListener('change', async e => {
    const dosya = e.target.files[0];
    e.target.value = '';
    if (!dosya) return;
    try {
      const sonuc = await fotoYukle(dosya, 'tespit-oneri/' + (_toDuzenlenenKayitId || 'gecici'));
      _toDefterFotografi = sonuc.url;
      _toFotoOnizlemeCiz(_toDefterFotografi);
    } catch (hata) {
      alert(hata.message || 'Fotoğraf yüklenemedi.');
    }
  });

  document.getElementById('sablonIndirBtn').addEventListener('click', () => {
    excelSablonIndir(TESPIT_ONERI_IMPORT_KOLONLARI, 'tespit_oneri_sablonu.xlsx');
  });
  document.getElementById('disaAktarBtn').addEventListener('click', () => {
    excelDisaAktar(_tespitOneriExcelSatirlariniHazirla(tespitOneriKayitlariniGetir('', {})), TESPIT_ONERI_EXPORT_KOLONLARI, 'tespit_oneri_defteri.xlsx');
  });
  document.getElementById('listeYazdirBtn').addEventListener('click', () => {
    const filtreler = { durum: document.getElementById('durumFiltre').value, oncelik: document.getElementById('oncelikFiltre').value, isyeriSicili: document.getElementById('sicilFiltre').value, tespitEden: document.getElementById('uzmanFiltre').value };
    const kayitlar = tespitOneriKayitlariniGetir(document.getElementById('aramaKutusu').value, filtreler);
    raporListesiYazdir('Tespit ve Öneri Defteri', '', TESPIT_ONERI_EXPORT_KOLONLARI, _tespitOneriExcelSatirlariniHazirla(kayitlar));
  });

  document.getElementById('iceAktarBtn').addEventListener('click', () => document.getElementById('iceAktarDosya').click());
  document.getElementById('iceAktarDosya').addEventListener('change', e => {
    const dosya = e.target.files[0];
    excelIceAktar(dosya, TESPIT_ONERI_IMPORT_KOLONLARI, (satirlar, hataMesaji) => {
      e.target.value = '';
      if (hataMesaji) { alert(hataMesaji); return; }
      satirlar.forEach(satir => {
        satir.tespitTarihi = excelTarihiNormallestir(satir.tespitTarihi);
        satir.tebligTarihi = excelTarihiNormallestir(satir.tebligTarihi);
        satir.kapanisTarihi = excelTarihiNormallestir(satir.kapanisTarihi);
      });
      const sonuc = excelToplulIceAktarSonucOzetle(satirlar, tespitOneriEkle);
      alert(excelIceAktarOzetMesaji(sonuc));
      _toSicilFiltreDoldur();
  _toUzmanFiltreDoldur();
  _toSicilIstatistikleriCiz();
      toKayitlariCiz(document.getElementById('aramaKutusu').value);
    });
  });

  document.getElementById('formAyarlariBtn').addEventListener('click', () => formAyarlariModalAc('tespit-oneri', 'Tespit ve Öneri Defteri'));

  // Kullanıcı isteği: "tespit önerileri yönetici kullanıc toplu da
  // silebilsin" -- bkz. modules/acil-durum/ui.js yanginTupuSeciliSil ile
  // aynı desen.
  document.getElementById('tumunuSecCheckbox').addEventListener('change', e => {
    document.querySelectorAll('#tabloGovde [data-sec]').forEach(cb => { cb.checked = e.target.checked; });
  });
  document.getElementById('topluSilBtn').addEventListener('click', toSeciliSil);

  document.getElementById('imzaKatmaniKapatBtn').addEventListener('click', imzaModalKapat);
  document.getElementById('imzaKatmaniIptalBtn').addEventListener('click', imzaModalKapat);
  document.getElementById('imzaVazgecBtn').addEventListener('click', () => imzaModalAc(_imzaKayitId));
  document.getElementById('imzaTemizleBtn').addEventListener('click', () => { if (_imzaPad) _imzaPad.temizle(); });
  document.getElementById('imzaKaydetBtn').addEventListener('click', _imzaKaydet);

  _toSicilFiltreDoldur();
  _toUzmanFiltreDoldur();
  _toSicilIstatistikleriCiz();
  toGorunumDegistir('kayitlar');
}

async function toSeciliSil() {
  const secililer = Array.from(document.querySelectorAll('#tabloGovde [data-sec]:checked')).map(cb => cb.getAttribute('data-id'));
  if (!secililer.length) { alert('Lütfen silmek için en az bir kayıt seçin.'); return; }
  if (!(await onayModali(`${secililer.length} tespit/öneri kaydı silinsin mi?`, 'Sil'))) return;

  const sonuc = tespitOneriToplusil(secililer);
  if (!sonuc.basarili) { alert(sonuc.hata); return; }
  alert(`${sonuc.silinen} kayıt silindi.`);
  document.getElementById('tumunuSecCheckbox').checked = false;
  _toSicilFiltreDoldur();
  _toUzmanFiltreDoldur();
  _toSicilIstatistikleriCiz();
  toKayitlariCiz(document.getElementById('aramaKutusu').value);
}

const TESPIT_ONERI_IMPORT_KOLONLARI = [
  { anahtar: 'tespitTarihi', baslik: 'Tespit Tarihi' },
  { anahtar: 'tespitEden', baslik: 'Tespiti Yapan' },
  { anahtar: 'isyeriSicili', baslik: 'İşyeri Sicili' },
  { anahtar: 'bolum', baslik: 'Bölüm / Yer' },
  { anahtar: 'tespit', baslik: 'Tespit (Bulgu)' },
  { anahtar: 'oneri', baslik: 'Öneri' },
  { anahtar: 'oncelik', baslik: 'Öncelik' },
  { anahtar: 'tebligEdilen', baslik: 'Tebliğ Edilen Birim/Kişi' },
  { anahtar: 'tebligTarihi', baslik: 'Tebliğ Tarihi' }
];

const TESPIT_ONERI_EXPORT_KOLONLARI = [
  { anahtar: 'kayitNo', baslik: 'No' },
  { anahtar: 'tespitTarihiGoruntu', baslik: 'Tespit Tarihi' },
  { anahtar: 'bolum', baslik: 'Bölüm / Yer' },
  { anahtar: 'tespitEden', baslik: 'Tespiti Yapan' },
  { anahtar: 'isyeriSicili', baslik: 'İşyeri Sicili' },
  { anahtar: 'tespit', baslik: 'Tespit (Bulgu)' },
  { anahtar: 'oneri', baslik: 'Öneri' },
  { anahtar: 'oncelik', baslik: 'Öncelik' },
  { anahtar: 'tebligEdilen', baslik: 'Tebliğ Edilen' },
  { anahtar: 'tebligTarihiGoruntu', baslik: 'Tebliğ Tarihi' },
  { anahtar: 'durum', baslik: 'Durum' },
  { anahtar: 'kapanisTarihiGoruntu', baslik: 'Kapanış Tarihi' }
];

function _tespitOneriExcelSatirlariniHazirla(kayitlar) {
  return kayitlar.map(k => Object.assign({}, k, {
    tespitTarihiGoruntu: gunAyYil(k.tespitTarihi),
    tebligTarihiGoruntu: gunAyYil(k.tebligTarihi),
    kapanisTarihiGoruntu: gunAyYil(k.kapanisTarihi)
  }));
}

function toGorunumDegistir(gorunum) {
  _toGorunum = gorunum;
  document.getElementById('sekmeKayitlar').classList.toggle('sekme-seciliDegil', gorunum !== 'kayitlar');
  document.getElementById('sekmeOzet').classList.toggle('sekme-seciliDegil', gorunum !== 'ozet');
  document.getElementById('bolum-kayitlar').style.display = gorunum === 'kayitlar' ? '' : 'none';
  document.getElementById('bolum-ozet').style.display = gorunum === 'ozet' ? '' : 'none';

  if (gorunum === 'kayitlar') toKayitlariCiz(document.getElementById('aramaKutusu').value);
  else toOzetiCiz();
}

// Kullanıcı isteği: "kaşe imza yapıldıysa farklı bir renk olsun kaşe imza
// yazısı" -- Tespit Eden/Tebliğ Edilen rollerinden en az biri imzalanmışsa
// düğme metni yeşile döner (diğer "tamamlandı" göstergeleriyle aynı renk).
function _toImzaliMi(k) {
  const imzalar = k.imzalar || {};
  return !!((imzalar.tespitEden && imzalar.tespitEden.imzaUrl) || (imzalar.tebligEdilen && imzalar.tebligEdilen.imzaUrl));
}

function _toIslemButonlariUret(k) {
  const imzaStili = _toImzaliMi(k) ? ' style="color:#16a34a; font-weight:700; border-color:#86efac;"' : '';
  const butonlar = [
    `<button class="tablo-buton" data-duzenle="${k.id}">Düzenle</button>`,
    `<button class="tablo-buton" data-pdf="${k.id}">PDF</button>`,
    `<button class="tablo-buton" data-imza="${k.id}"${imzaStili}>✍️ Kaşe/İmza</button>`
  ];
  if (k.durum === 'Açık') butonlar.push(`<button class="tablo-buton" data-tebligEt="${k.id}">Tebliğ Et</button>`);
  if (!TESPIT_KAPALI_DURUMLAR.includes(k.durum)) butonlar.push(`<button class="tablo-buton" data-kapat="${k.id}">Kapat</button>`);
  // Kullanıcı isteği: "bunu işlemlerde bir buton ile uygunsuzluklara
  // aktarabileyim" -- zaten aktarılmışsa tekrar aktarılamaz, bilgi rozeti gösterilir.
  butonlar.push(k.aktarilanUygunsuzlukId
    ? '<span style="font-size:11px; color:#16a34a; font-weight:600;">✓ Uygunsuzluğa Aktarıldı</span>'
    : `<button class="tablo-buton" data-aktar="${k.id}">→ Uygunsuzluğa Aktar</button>`);
  butonlar.push(`<button class="tablo-buton sil" data-sil="${k.id}">Sil</button>`);
  return butonlar.join(' ');
}

function _toFotoHucresiUret(url) {
  return url ? `<img data-foto-ref="${url}" title="Defter Sayfası" style="width:32px; height:32px; object-fit:cover; border-radius:6px;">` : '-';
}

function toKayitlariCiz(aramaMetni) {
  const govde = document.getElementById('tabloGovde');
  const bosDurum = document.getElementById('bosDurum');
  const filtreler = {
    durum: document.getElementById('durumFiltre').value,
    oncelik: document.getElementById('oncelikFiltre').value,
    isyeriSicili: document.getElementById('sicilFiltre').value,
    tespitEden: document.getElementById('uzmanFiltre').value
  };
  const kayitlar = tespitOneriKayitlariniGetir(aramaMetni, filtreler);

  govde.innerHTML = '';
  if (kayitlar.length === 0) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = 'Eşleşen kayıt bulunamadı.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  kayitlar.forEach(k => {
    const satir = document.createElement('tr');
    satir.innerHTML = `
      <td><input type="checkbox" data-sec data-id="${k.id}"></td>
      <td>${_toIslemButonlariUret(k)}</td>
      <td>${k.kayitNo}<br><small style="color:var(--metin-soluk);">${gunAyYil(k.tespitTarihi) || '-'}</small></td>
      <td>${k.bolum}<br><small style="color:var(--metin-soluk);">${k.tespitEden}${k.isyeriSicili ? ' — Sicil: ' + k.isyeriSicili : ''}</small></td>
      <td>${k.tespit}</td>
      <td>${k.oneri}</td>
      <td><span class="genel-rozet rozet-${toRozetSinifAdi(k.oncelik)}">${k.oncelik}</span></td>
      <td>${k.tebligEdilen || '-'}<br><small style="color:var(--metin-soluk);">${gunAyYil(k.tebligTarihi) || ''}</small></td>
      <td>${_toFotoHucresiUret(k.defterSayfasiFotografi)}</td>
      <td><span class="genel-rozet rozet-${toRozetSinifAdi(k.durum)}">${k.durum}</span></td>
    `;
    govde.appendChild(satir);
  });
  fotoReferanslariCoz(govde);

  govde.querySelectorAll('[data-duzenle]').forEach(btn => btn.addEventListener('click', () => toKayitModalAc(tespitOneriIdIleGetirRepo(btn.getAttribute('data-duzenle')))));
  govde.querySelectorAll('[data-pdf]').forEach(btn => btn.addEventListener('click', async () => {
    try { await tespitOneriKaydiPdfOlustur(btn.getAttribute('data-pdf')); } catch (hata) { console.error(hata); alert('PDF üretilemedi: ' + (hata.message || hata)); }
  }));
  govde.querySelectorAll('[data-imza]').forEach(btn => btn.addEventListener('click', () => imzaModalAc(btn.getAttribute('data-imza'))));
  govde.querySelectorAll('[data-aktar]').forEach(btn => btn.addEventListener('click', async () => {
    const id = btn.getAttribute('data-aktar');
    const k = tespitOneriIdIleGetirRepo(id);
    if (!k) return;
    if (!(await onayModali(`"${k.tespit}" kaydı Uygunsuzluk/DÖF modülüne aktarılsın mı?`, 'Aktar'))) return;
    const sonuc = tespitOneriUygunsuzlugaAktar(id);
    if (!sonuc.basarili) { alert(sonuc.hata); return; }
    alert(`Uygunsuzluk kaydı oluşturuldu: ${sonuc.kayit.aksiyonNo}`);
    toKayitlariCiz(document.getElementById('aramaKutusu').value);
  }));
  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', async () => {
    if (await onayModali('Bu kaydı silmek istediğinize emin misiniz?', 'Sil')) { tespitOneriSil(btn.getAttribute('data-sil')); _toSicilFiltreDoldur(); _toSicilIstatistikleriCiz(); toKayitlariCiz(document.getElementById('aramaKutusu').value); }
  }));
  govde.querySelectorAll('[data-tebligEt]').forEach(btn => btn.addEventListener('click', async () => {
    const tebligEdilen = await metinIstemModali('Tebliğ edilen birim/kişi:', '', '');
    if (tebligEdilen !== null) { tespitOneriTebligEt(btn.getAttribute('data-tebligEt'), tebligEdilen); toKayitlariCiz(document.getElementById('aramaKutusu').value); }
  }));
  govde.querySelectorAll('[data-kapat]').forEach(btn => btn.addEventListener('click', async () => {
    const yapilanIslem = await metinIstemModali('Yapılan işlem / kapanış açıklaması (opsiyonel):', '', '');
    if (yapilanIslem !== null) { tespitOneriKapat(btn.getAttribute('data-kapat'), yapilanIslem); toKayitlariCiz(document.getElementById('aramaKutusu').value); }
  }));
}

function toOzetiCiz() {
  const ozet = tespitOneriOzetiHesapla();
  const kutu = document.getElementById('ozetKutusu');
  const kart = (etiket, deger) => `<div class="istatistik-kutu"><span>${etiket}</span><b>${deger}</b></div>`;
  const dagilimHtml = (baslik, satirlar) => `
    <div class="kart" style="margin-bottom:14px;">
      <div class="card-title" style="margin-bottom:8px;"><h3 style="margin:0; font-size:14px;">${baslik}</h3></div>
      ${satirlar.length
        ? satirlar.map(([k, v]) => `<div style="display:flex; justify-content:space-between; font-size:13px; padding:6px 0; border-bottom:1px solid var(--kenarlik);"><span>${k}</span><strong>${v}</strong></div>`).join('')
        : '<div class="bos-durum gorunur">Veri yok.</div>'}
    </div>
  `;

  kutu.innerHTML = `
    <div class="istatistik-grid">
      ${kart('Toplam Kayıt', ozet.toplam)}
      ${kart('Açık', ozet.acik)}
      ${kart('Acil ve Açık', ozet.acilAcik)}
      ${kart('Tebliğ Bekleyen', ozet.tebligBekleyen)}
      ${kart('Kapanan', ozet.kapanan)}
    </div>

    <div class="modul-grid" style="grid-template-columns: repeat(auto-fill, minmax(260px,1fr));">
      <div>${dagilimHtml('Bölüme Göre', ozet.bolumeGore)}</div>
      <div>${dagilimHtml('Duruma Göre', ozet.durumaGore)}</div>
      <div>${dagilimHtml('İşyeri Siciline Göre', ozet.sicileGore)}</div>
    </div>

    <div class="card-title" style="margin:20px 0 8px;"><h3 style="margin:0; font-size:14px;">Önceliğe Göre Açık Kayıtlar</h3></div>
    <div class="tablo-scroll">
      <table class="veri-tablosu">
        <thead><tr><th>No</th><th>Bölüm</th><th>Tespit</th><th>Öncelik</th><th>Durum</th></tr></thead>
        <tbody>
          ${ozet.oncelikliAcikKayitlar.map(k => `<tr><td>${k.kayitNo}</td><td>${k.bolum}</td><td>${k.tespit}</td><td>${k.oncelik}</td><td>${k.durum}</td></tr>`).join('') || '<tr><td colspan="5">Açık kayıt yok.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

function toKayitModalAc(kayit) {
  _toDuzenlenenKayitId = kayit ? kayit.id : null;
  document.getElementById('modalBaslik').textContent = kayit ? (kayit.kayitNo + ' Kaydını Düzenle') : 'Yeni Tespit Kaydı';

  document.getElementById('tespitTarihi').value = kayit ? kayit.tespitTarihi : bugunIso();
  document.getElementById('oncelik').innerHTML = TESPIT_ONCELIKLERI.map(o => `<option ${kayit && kayit.oncelik === o ? 'selected' : ''}>${o}</option>`).join('');
  document.getElementById('tespitEden').value = kayit ? kayit.tespitEden : '';
  document.getElementById('isyeriSicili').value = kayit ? (kayit.isyeriSicili || '') : '';
  document.getElementById('bolum').value = kayit ? kayit.bolum : '';
  document.getElementById('tespit').value = kayit ? kayit.tespit : '';
  document.getElementById('oneri').value = kayit ? kayit.oneri : '';
  document.getElementById('tebligEdilen').value = kayit ? kayit.tebligEdilen : '';
  document.getElementById('tebligTarihi').value = kayit ? kayit.tebligTarihi : '';
  document.getElementById('yapilanIslem').value = kayit ? kayit.yapilanIslem : '';
  document.getElementById('kapanisTarihi').value = kayit ? kayit.kapanisTarihi : '';
  document.getElementById('notlar').value = kayit ? kayit.notlar : '';
  document.getElementById('durum').innerHTML = '<option value="">Otomatik</option>' + TESPIT_DURUMLARI.map(d => `<option ${kayit && kayit.durum === d ? 'selected' : ''}>${d}</option>`).join('');
  if (!kayit) document.getElementById('durum').value = '';

  _toDefterFotografi = kayit ? (kayit.defterSayfasiFotografi || '') : '';
  _toFotoOnizlemeCiz(_toDefterFotografi);

  toTemizleFormHatalari();
  document.getElementById('modalKatman').classList.add('acik');
}

function toKayitModalKapat() {
  document.getElementById('modalKatman').classList.remove('acik');
  _toDuzenlenenKayitId = null;
}

function toTemizleFormHatalari() {
  document.querySelectorAll('#kayitForm .alan-hatasi').forEach(el => el.textContent = '');
}

function toFormGonderildi(e) {
  e.preventDefault();
  toTemizleFormHatalari();

  const veriler = {
    tespitTarihi: document.getElementById('tespitTarihi').value,
    oncelik: document.getElementById('oncelik').value,
    tespitEden: document.getElementById('tespitEden').value,
    isyeriSicili: document.getElementById('isyeriSicili').value,
    bolum: document.getElementById('bolum').value,
    tespit: document.getElementById('tespit').value,
    oneri: document.getElementById('oneri').value,
    tebligEdilen: document.getElementById('tebligEdilen').value,
    tebligTarihi: document.getElementById('tebligTarihi').value,
    yapilanIslem: document.getElementById('yapilanIslem').value,
    kapanisTarihi: document.getElementById('kapanisTarihi').value,
    notlar: document.getElementById('notlar').value,
    durum: document.getElementById('durum').value,
    defterSayfasiFotografi: _toDefterFotografi
  };

  const sonuc = _toDuzenlenenKayitId ? tespitOneriGuncelle(_toDuzenlenenKayitId, veriler) : tespitOneriEkle(veriler);
  if (!sonuc.basarili) {
    Object.keys(sonuc.hatalar).forEach(alan => {
      const hataEl = document.getElementById(alan + 'Hata');
      if (hataEl) hataEl.textContent = sonuc.hatalar[alan];
    });
    return;
  }

  toKayitModalKapat();
  _toSicilFiltreDoldur();
  _toUzmanFiltreDoldur();
  _toSicilIstatistikleriCiz();
  toKayitlariCiz(document.getElementById('aramaKutusu').value);
}

// ==================== KAŞE / DİJİTAL İMZA ====================
// modules/uygunsuzluk/ui.js _ucImzaPaduBagla ile birebir aynı canvas imza
// pad'i -- bu modül diğer modüllerin ui.js'ini yüklemediğinden kendi
// önekiyle (_to) tekrarlanır (bkz. modules/uygunsuzluk/cikti.js dosya başı
// açıklaması, aynı ilke).
function _toImzaPaduBagla(canvasId) {
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
    ctx.strokeStyle = '#1e3a8a';
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

// Ham canvas geniş/boş bir tuval (pad'in tam boyutu) olduğundan, imza sadece
// sol tarafa küçük çizilmişse PDF'te "sola yaslanmış" görünüyordu -- bkz.
// modules/uygunsuzluk/ui.js _ucImzaKirp ile aynı çözüm: kaydetmeden önce
// gerçekte boyanmış (alpha>0) piksellerin sınırlayıcı kutusuna kırpılır.
function _toImzaKirp(canvas) {
  const ctx = canvas.getContext('2d');
  const genislik = canvas.width, yukseklik = canvas.height;
  const veri = ctx.getImageData(0, 0, genislik, yukseklik).data;
  let minX = genislik, minY = yukseklik, maxX = 0, maxY = 0, doluVarMi = false;
  for (let y = 0; y < yukseklik; y++) {
    for (let x = 0; x < genislik; x++) {
      if (veri[(y * genislik + x) * 4 + 3] > 10) {
        doluVarMi = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (!doluVarMi) return canvas;
  const bosluk = Math.round(genislik * 0.02);
  minX = Math.max(0, minX - bosluk);
  minY = Math.max(0, minY - bosluk);
  maxX = Math.min(genislik, maxX + bosluk);
  maxY = Math.min(yukseklik, maxY + bosluk);

  const kirpilmis = document.createElement('canvas');
  kirpilmis.width = maxX - minX;
  kirpilmis.height = maxY - minY;
  kirpilmis.getContext('2d').drawImage(canvas, minX, minY, kirpilmis.width, kirpilmis.height, 0, 0, kirpilmis.width, kirpilmis.height);
  return kirpilmis;
}

// Storage yerine fotoBuyukKaydet ile "fotoref:<id>" -- modules/uygunsuzluk
// _ucImzaYukle ile aynı gerekçe: Storage'ın gerçek http(s) URL'i PDF
// üretiminde (html2canvas) CORS'a takılıp sessizce boş çıkabiliyordu.
async function _toImzaYukle(canvas) {
  const firma = aktifFirmaGetir();
  const dataUrl = _toImzaKirp(canvas).toDataURL('image/png');
  return fotoBuyukKaydet(dataUrl, firma ? firma.slug : '');
}

let _imzaKayitId = null;
let _imzaAktifRol = null;
let _imzaPad = null;

const _TO_IMZA_ROL_ETIKETLERI = { tespitEden: 'Tespit Eden', tebligEdilen: 'Tebliğ Edilen' };

function _imzaDurumGosterimiCiz(kayit) {
  const kutu = document.getElementById('imzaDurumGosterimi');
  const imzalar = kayit.imzalar || {};
  kutu.innerHTML = ['tespitEden', 'tebligEdilen'].map(rol => {
    const imza = imzalar[rol];
    const durum = imza && imza.imzaUrl
      ? `<span style="color:#15803d; font-weight:600;">✓ İmzalandı</span> — ${_toKacir(imza.ad)} (${gunAyYil((imza.tarih || '').slice(0, 10)) || '-'})`
      : '<span style="color:var(--metin-soluk);">Henüz imzalanmadı</span>';
    return `
      <div class="uc-imza-rol-satir">
        <div><b>${_TO_IMZA_ROL_ETIKETLERI[rol]}</b><br><span style="font-size:12px;">${durum}</span></div>
        <button type="button" class="tablo-buton" data-imza-rol="${rol}">${imza && imza.imzaUrl ? 'Yeniden İmzala' : 'İmza At'}</button>
      </div>
    `;
  }).join('');
  kutu.querySelectorAll('[data-imza-rol]').forEach(btn => btn.addEventListener('click', () => _imzaCizimBasla(btn.getAttribute('data-imza-rol'))));
}

function imzaModalAc(id) {
  const kayit = tespitOneriIdIleGetirRepo(id);
  if (!kayit) return;
  _imzaKayitId = id;
  _imzaAktifRol = null;
  document.getElementById('imzaKayitEtiketi').textContent = `${kayit.kayitNo} — ${kayit.tespit}`;
  document.getElementById('imzaCizimAlani').style.display = 'none';
  document.getElementById('imzaDurumGosterimi').style.display = '';
  document.getElementById('imzaKapatEylemi').style.display = '';
  _imzaDurumGosterimiCiz(kayit);
  document.getElementById('imzaKatmani').classList.add('acik');
}

function _imzaCizimBasla(rol) {
  _imzaAktifRol = rol;
  document.getElementById('imzaDurumGosterimi').style.display = 'none';
  document.getElementById('imzaKapatEylemi').style.display = 'none';
  document.getElementById('imzaCizimAlani').style.display = '';
  document.getElementById('imzaAdSoyad').value = (oturumdakiKullanici() || {}).adSoyad || '';
  document.getElementById('imzaHata').textContent = '';
  requestAnimationFrame(() => {
    if (!_imzaPad) _imzaPad = _toImzaPaduBagla('imzaCanvas');
    if (_imzaPad) _imzaPad.temizle();
  });
}

async function _imzaKaydet() {
  const hataEl = document.getElementById('imzaHata');
  const ad = document.getElementById('imzaAdSoyad').value.trim();
  if (!ad) { hataEl.textContent = 'Lütfen ad soyad girin.'; return; }
  if (!_imzaPad || !_imzaPad.doluMu()) { hataEl.textContent = 'Lütfen imza alanına imzanızı atın.'; return; }

  const btn = document.getElementById('imzaKaydetBtn');
  btn.disabled = true;
  btn.textContent = 'Kaydediliyor…';
  try {
    const imzaUrl = await _toImzaYukle(_imzaPad.canvasElemani);
    const sonuc = tespitOneriImzaVer(_imzaKayitId, _imzaAktifRol, ad, imzaUrl);
    if (!sonuc.basarili) { hataEl.textContent = sonuc.hata; return; }
    imzaModalAc(_imzaKayitId);
  } catch (hata) {
    console.error('İmza yüklenemedi:', hata);
    hataEl.textContent = 'İmza kaydedilemedi: ' + (hata.message || hata);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Kaydet';
  }
}

function imzaModalKapat() {
  document.getElementById('imzaKatmani').classList.remove('acik');
  _imzaKayitId = null;
  _imzaAktifRol = null;
}
