// Tespit ve Öneri Defteri ekranının DOM işlemleri.

let _toGorunum = 'kayitlar';
let _toDuzenlenenKayitId = null;
let _toDefterFotografi = '';

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
    const filtreler = { durum: document.getElementById('durumFiltre').value, oncelik: document.getElementById('oncelikFiltre').value };
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
      toKayitlariCiz(document.getElementById('aramaKutusu').value);
    });
  });

  toGorunumDegistir('kayitlar');
}

const TESPIT_ONERI_IMPORT_KOLONLARI = [
  { anahtar: 'tespitTarihi', baslik: 'Tespit Tarihi' },
  { anahtar: 'tespitEden', baslik: 'Tespiti Yapan' },
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

async function tespitOneriKaydiniYazdir(id) {
  const k = tespitOneriIdIleGetirRepo(id);
  if (!k) return;
  const defterSayfasiUrl = await fotoBuyukCoz(k.defterSayfasiFotografi);
  raporKartiYazdir('TESPİT VE ÖNERİ KAYDI — ' + k.kayitNo, '', [
    { etiket: 'Tespit Tarihi', deger: gunAyYil(k.tespitTarihi) },
    { etiket: 'Tespiti Yapan', deger: k.tespitEden },
    { etiket: 'Bölüm / Yer', deger: k.bolum },
    { etiket: 'Tespit (Bulgu)', deger: k.tespit },
    { etiket: 'Öneri', deger: k.oneri },
    { etiket: 'Öncelik', deger: k.oncelik },
    { etiket: 'Tebliğ Edilen / Tarih', deger: [k.tebligEdilen, gunAyYil(k.tebligTarihi)].filter(Boolean).join(' / ') },
    { etiket: 'Yapılan İşlem', deger: k.yapilanIslem },
    { etiket: 'Kapanış Tarihi', deger: gunAyYil(k.kapanisTarihi) },
    { etiket: 'Durum', deger: k.durum },
    { etiket: 'Not', deger: k.notlar }
  ], [
    { etiket: 'Defter Sayfası', url: defterSayfasiUrl }
  ]);
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

function _toIslemButonlariUret(k) {
  const butonlar = [
    `<button class="tablo-buton" data-duzenle="${k.id}">Düzenle</button>`,
    `<button class="tablo-buton" data-yazdir="${k.id}">Yazdır</button>`
  ];
  if (k.durum === 'Açık') butonlar.push(`<button class="tablo-buton" data-tebligEt="${k.id}">Tebliğ Et</button>`);
  if (!TESPIT_KAPALI_DURUMLAR.includes(k.durum)) butonlar.push(`<button class="tablo-buton" data-kapat="${k.id}">Kapat</button>`);
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
    oncelik: document.getElementById('oncelikFiltre').value
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
      <td>${k.kayitNo}<br><small style="color:var(--metin-soluk);">${gunAyYil(k.tespitTarihi) || '-'}</small></td>
      <td>${k.bolum}<br><small style="color:var(--metin-soluk);">${k.tespitEden}</small></td>
      <td>${k.tespit}</td>
      <td>${k.oneri}</td>
      <td><span class="genel-rozet rozet-${toRozetSinifAdi(k.oncelik)}">${k.oncelik}</span></td>
      <td>${k.tebligEdilen || '-'}<br><small style="color:var(--metin-soluk);">${gunAyYil(k.tebligTarihi) || ''}</small></td>
      <td>${_toFotoHucresiUret(k.defterSayfasiFotografi)}</td>
      <td><span class="genel-rozet rozet-${toRozetSinifAdi(k.durum)}">${k.durum}</span></td>
      <td>${_toIslemButonlariUret(k)}</td>
    `;
    govde.appendChild(satir);
  });
  fotoReferanslariCoz(govde);

  govde.querySelectorAll('[data-duzenle]').forEach(btn => btn.addEventListener('click', () => toKayitModalAc(tespitOneriIdIleGetirRepo(btn.getAttribute('data-duzenle')))));
  govde.querySelectorAll('[data-yazdir]').forEach(btn => btn.addEventListener('click', () => tespitOneriKaydiniYazdir(btn.getAttribute('data-yazdir'))));
  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', async () => {
    if (await onayModali('Bu kaydı silmek istediğinize emin misiniz?', 'Sil')) { tespitOneriSil(btn.getAttribute('data-sil')); toKayitlariCiz(document.getElementById('aramaKutusu').value); }
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
  toKayitlariCiz(document.getElementById('aramaKutusu').value);
}
