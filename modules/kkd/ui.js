// KKD Takibi ana sayfa DOM işlemleri (Envanter / Zimmet / İhlal Takibi / Özet).

let _kkdGorunum = 'envanter';
let _duzenlenenEnvanterId = null;
let _duzenlenenZimmetId = null;
let _duzenlenenIhlalId = null;
let _duzenlenenNumuneId = null;

function kkdRozetSinifAdi(durum) {
  return slugOlustur(durum || '');
}

function kkdSayfasiniBaslat() {
  document.querySelectorAll('[data-sekme]').forEach(btn => {
    btn.addEventListener('click', () => kkdGorunumDegistir(btn.getAttribute('data-sekme')));
  });

  document.getElementById('kkdKatalogListesi').innerHTML = KKD_KATALOG.map(k => `<option value="${k.ad}">`).join('');
  document.getElementById('kkdPersonelListesi').innerHTML = personelleriGetir('', false).map(p => `<option value="${p.adSoyad}">`).join('');

  _kkdEnvanterBaslat();
  _kkdZimmetBaslat();
  _kkdIhlalBaslat();
  _kkdNumuneBaslat();

  kkdGorunumDegistir('envanter');
}

function kkdGorunumDegistir(gorunum) {
  _kkdGorunum = gorunum;
  ['envanter', 'zimmet', 'ihlal', 'numune', 'ozet'].forEach(g => {
    document.querySelector(`[data-sekme="${g}"]`).classList.toggle('sekme-seciliDegil', g !== gorunum);
    document.getElementById('bolum-' + g).style.display = g === gorunum ? '' : 'none';
  });

  if (gorunum === 'envanter') envanterleriCiz(document.getElementById('envanterAramaKutusu').value);
  else if (gorunum === 'zimmet') zimmetleriCiz(document.getElementById('zimmetAramaKutusu').value);
  else if (gorunum === 'ihlal') ihlalleriCiz(document.getElementById('ihlalAramaKutusu').value);
  else if (gorunum === 'numune') numuneleriCiz(document.getElementById('numuneAramaKutusu').value);
  else ozetiCiz();
}

// ==================== ENVANTER ====================

function _kkdKatalogOtomatikDoldur(adInputId, turSelectId, enInputId) {
  const input = document.getElementById(adInputId);
  const doldur = e => {
    const bulunan = kkdKatalogBul(e.target.value);
    if (!bulunan) return;
    document.getElementById(turSelectId).value = bulunan.tur;
    document.getElementById(enInputId).value = bulunan.en.join('; ');
  };
  // Datalist'ten seçim bazı tarayıcılarda 'input' yerine (veya onunla birlikte)
  // 'change' tetikler; ikisini de dinlemek seçimin her durumda yakalanmasını sağlar.
  input.addEventListener('input', doldur);
  input.addEventListener('change', doldur);
}

function _kkdEnvanterBaslat() {
  document.getElementById('envanterTurFiltre').innerHTML += KKD_TURLERI.map(t => `<option>${t}</option>`).join('');
  document.getElementById('envanterDurumFiltre').innerHTML += ENVANTER_DURUMLARI.map(d => `<option>${d}</option>`).join('');

  document.getElementById('yeniEnvanterBtn').addEventListener('click', () => envanterModalAc());
  document.getElementById('envanterModalKapatBtn').addEventListener('click', envanterModalKapat);
  document.getElementById('envanterModalIptalBtn').addEventListener('click', envanterModalKapat);
  document.getElementById('envanterForm').addEventListener('submit', envanterFormGonderildi);
  document.getElementById('envanterAramaKutusu').addEventListener('input', e => envanterleriCiz(e.target.value));
  document.getElementById('envanterTurFiltre').addEventListener('change', () => envanterleriCiz(document.getElementById('envanterAramaKutusu').value));
  document.getElementById('envanterDurumFiltre').addEventListener('change', () => envanterleriCiz(document.getElementById('envanterAramaKutusu').value));
  _kkdKatalogOtomatikDoldur('envanterAd', 'envanterTur', 'envanterEnStandartlari');

  document.getElementById('envanterSablonIndirBtn').addEventListener('click', () => excelSablonIndir(KKD_ENVANTER_IMPORT_KOLONLARI, 'kkd_envanter_sablonu.xlsx'));
  document.getElementById('envanterDisaAktarBtn').addEventListener('click', () => {
    const liste = envanterleriGetir('', {}).map(e => Object.assign({}, e, { enStandartlariMetin: (e.enStandartlari || []).join('; ') }));
    excelDisaAktar(liste, KKD_ENVANTER_EXPORT_KOLONLARI, 'kkd_envanteri.xlsx');
  });
  document.getElementById('envanterIceAktarBtn').addEventListener('click', () => document.getElementById('envanterIceAktarDosya').click());
  document.getElementById('envanterIceAktarDosya').addEventListener('change', e => {
    const dosya = e.target.files[0];
    excelIceAktar(dosya, KKD_ENVANTER_IMPORT_KOLONLARI, (satirlar, hataMesaji) => {
      e.target.value = '';
      if (hataMesaji) { alert(hataMesaji); return; }
      const sonuc = excelToplulIceAktarSonucOzetle(satirlar, envanterEkle);
      alert(excelIceAktarOzetMesaji(sonuc));
      envanterleriCiz(document.getElementById('envanterAramaKutusu').value);
    });
  });
}

const KKD_ENVANTER_IMPORT_KOLONLARI = [
  { anahtar: 'ad', baslik: 'KKD Adı' },
  { anahtar: 'tur', baslik: 'KKD Türü' },
  { anahtar: 'marka', baslik: 'Marka' },
  { anahtar: 'model', baslik: 'Model' },
  { anahtar: 'beden', baslik: 'Beden / Ölçü' },
  { anahtar: 'enStandartlari', baslik: 'EN Standartları' },
  { anahtar: 'stok', baslik: 'Stok' },
  { anahtar: 'minimumStok', baslik: 'Minimum Stok' },
  { anahtar: 'bolum', baslik: 'Bölüm' },
  { anahtar: 'lokasyon', baslik: 'Lokasyon' }
];

const KKD_ENVANTER_EXPORT_KOLONLARI = [
  { anahtar: 'envanterNo', baslik: 'KKD No' },
  { anahtar: 'ad', baslik: 'KKD Adı' },
  { anahtar: 'tur', baslik: 'KKD Türü' },
  { anahtar: 'marka', baslik: 'Marka' },
  { anahtar: 'model', baslik: 'Model' },
  { anahtar: 'beden', baslik: 'Beden / Ölçü' },
  { anahtar: 'enStandartlariMetin', baslik: 'EN Standartları' },
  { anahtar: 'stok', baslik: 'Stok' },
  { anahtar: 'minimumStok', baslik: 'Minimum Stok' },
  { anahtar: 'degisimPeriyoduGun', baslik: 'Değişim Periyodu (Gün)' },
  { anahtar: 'bolum', baslik: 'Bölüm' },
  { anahtar: 'lokasyon', baslik: 'Lokasyon' },
  { anahtar: 'durum', baslik: 'Durum' }
];

function envanterleriCiz(aramaMetni) {
  const govde = document.getElementById('envanterTabloGovde');
  const bosDurum = document.getElementById('envanterBosDurum');
  const filtreler = {
    tur: document.getElementById('envanterTurFiltre').value,
    durum: document.getElementById('envanterDurumFiltre').value
  };
  const liste = envanterleriGetir(aramaMetni, filtreler);

  govde.innerHTML = '';
  if (!liste.length) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = 'Eşleşen envanter kaydı bulunamadı.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  liste.forEach(k => {
    const satir = document.createElement('tr');
    const stokUyari = k.dusukStokMu ? ` <span class="genel-rozet rozet-kirmizi" title="Minimum stok altında">Düşük Stok</span>` : '';
    satir.innerHTML = `
      <td>${k.envanterNo}</td>
      <td>${k.ad}</td>
      <td>${k.tur}</td>
      <td>${[k.marka, k.model].filter(Boolean).join(' / ') || '-'}</td>
      <td>${k.beden || '-'}</td>
      <td>${(k.enStandartlari || []).join(', ') || '-'}${k.enEksikMi ? ' <span style="color:var(--hata); font-size:11px;">(Eksik)</span>' : ''}</td>
      <td>${k.stok}${stokUyari}</td>
      <td>${k.minimumStok}</td>
      <td>${k.degisimPeriyoduGun} gün</td>
      <td>${k.bolum || '-'}</td>
      <td><span class="genel-rozet rozet-${kkdRozetSinifAdi(k.durum)}">${k.durum}</span></td>
      <td>
        <button class="tablo-buton" data-duzenle="${k.id}">Düzenle</button>
        <button class="tablo-buton sil" data-sil="${k.id}">Sil</button>
      </td>
    `;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-duzenle]').forEach(btn => btn.addEventListener('click', () => envanterModalAc(envanterIdIleGetirRepo(btn.getAttribute('data-duzenle')))));
  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', async () => {
    if (await onayModali('Bu envanter kaydını silmek istediğinize emin misiniz?', 'Sil')) { envanterSil(btn.getAttribute('data-sil')); envanterleriCiz(document.getElementById('envanterAramaKutusu').value); }
  }));
}

function envanterModalAc(kayit) {
  _duzenlenenEnvanterId = kayit ? kayit.id : null;
  document.getElementById('envanterModalBaslik').textContent = kayit ? (kayit.envanterNo + ' Kaydını Düzenle') : 'Yeni Envanter Kaydı';

  document.getElementById('envanterAd').value = kayit ? kayit.ad : '';
  document.getElementById('envanterTur').innerHTML = KKD_TURLERI.map(t => `<option ${kayit && kayit.tur === t ? 'selected' : ''}>${t}</option>`).join('');
  document.getElementById('envanterEnStandartlari').value = kayit ? (kayit.enStandartlari || []).join('; ') : '';
  document.getElementById('envanterMarka').value = kayit ? kayit.marka : '';
  document.getElementById('envanterModel').value = kayit ? kayit.model : '';
  document.getElementById('envanterBeden').value = kayit ? kayit.beden : '';
  document.getElementById('envanterStok').value = kayit ? kayit.stok : 0;
  document.getElementById('envanterMinimumStok').value = kayit ? kayit.minimumStok : 0;
  document.getElementById('envanterDegisimPeriyoduGun').value = kayit ? kayit.degisimPeriyoduGun : '';
  document.getElementById('envanterBolum').value = kayit ? kayit.bolum : '';
  document.getElementById('envanterLokasyon').value = kayit ? kayit.lokasyon : '';
  document.getElementById('envanterTedarikci').value = kayit ? kayit.tedarikci : '';
  document.getElementById('envanterSatinAlmaTarihi').value = kayit ? kayit.satinAlmaTarihi : '';
  document.getElementById('envanterSonKullanmaTarihi').value = kayit ? kayit.sonKullanmaTarihi : '';
  document.getElementById('envanterDurum').innerHTML = ENVANTER_DURUMLARI.map(d => `<option ${kayit && kayit.durum === d ? 'selected' : ''}>${d}</option>`).join('');
  document.getElementById('envanterNotlar').value = kayit ? kayit.notlar : '';

  document.querySelectorAll('#envanterForm .alan-hatasi').forEach(el => el.textContent = '');
  document.getElementById('envanterModalKatman').classList.add('acik');
}

function envanterModalKapat() {
  document.getElementById('envanterModalKatman').classList.remove('acik');
  _duzenlenenEnvanterId = null;
}

function envanterFormGonderildi(e) {
  e.preventDefault();
  document.querySelectorAll('#envanterForm .alan-hatasi').forEach(el => el.textContent = '');

  const veriler = {
    ad: document.getElementById('envanterAd').value,
    tur: document.getElementById('envanterTur').value,
    enStandartlari: document.getElementById('envanterEnStandartlari').value,
    marka: document.getElementById('envanterMarka').value,
    model: document.getElementById('envanterModel').value,
    beden: document.getElementById('envanterBeden').value,
    stok: document.getElementById('envanterStok').value,
    minimumStok: document.getElementById('envanterMinimumStok').value,
    degisimPeriyoduGun: document.getElementById('envanterDegisimPeriyoduGun').value,
    bolum: document.getElementById('envanterBolum').value,
    lokasyon: document.getElementById('envanterLokasyon').value,
    tedarikci: document.getElementById('envanterTedarikci').value,
    satinAlmaTarihi: document.getElementById('envanterSatinAlmaTarihi').value,
    sonKullanmaTarihi: document.getElementById('envanterSonKullanmaTarihi').value,
    durum: document.getElementById('envanterDurum').value,
    notlar: document.getElementById('envanterNotlar').value
  };

  const sonuc = _duzenlenenEnvanterId ? envanterGuncelle(_duzenlenenEnvanterId, veriler) : envanterEkle(veriler);
  if (!sonuc.basarili) {
    Object.keys(sonuc.hatalar || {}).forEach(alan => {
      const hataEl = document.getElementById('envanter' + alan.charAt(0).toUpperCase() + alan.slice(1) + 'Hata');
      if (hataEl) hataEl.textContent = sonuc.hatalar[alan];
    });
    return;
  }

  envanterModalKapat();
  envanterleriCiz(document.getElementById('envanterAramaKutusu').value);
}

// ==================== ZİMMET ====================

function _kkdZimmetBaslat() {
  document.getElementById('zimmetDurumFiltre').innerHTML += ZIMMET_DURUMLARI.map(d => `<option>${d}</option>`).join('');

  document.getElementById('yeniZimmetBtn').addEventListener('click', () => zimmetModalAc());
  document.getElementById('zimmetModalKapatBtn').addEventListener('click', zimmetModalKapat);
  document.getElementById('zimmetModalIptalBtn').addEventListener('click', zimmetModalKapat);
  document.getElementById('zimmetForm').addEventListener('submit', zimmetFormGonderildi);
  document.getElementById('zimmetAramaKutusu').addEventListener('input', e => zimmetleriCiz(e.target.value));
  document.getElementById('zimmetDurumFiltre').addEventListener('change', () => zimmetleriCiz(document.getElementById('zimmetAramaKutusu').value));
  _kkdKatalogOtomatikDoldur('zimmetKkdAdi', 'zimmetKkdTuru', 'zimmetEnStandartlari');

  document.getElementById('zimmetPersonelAdi').addEventListener('input', e => {
    const personel = personelleriGetir('', false).find(p => p.adSoyad === e.target.value);
    if (!personel) return;
    document.getElementById('zimmetBolum').value = personel.bolum || '';
    document.getElementById('zimmetGorev').value = personel.gorev || '';
    document.getElementById('zimmetPersonelAdi').dataset.personelId = personel.id;
  });

  document.getElementById('zimmetKkdTuru').addEventListener('change', () => {
    if (document.getElementById('zimmetDegisimPeriyoduGun').value) return;
    document.getElementById('zimmetDegisimPeriyoduGun').value = KKD_VARSAYILAN_PERIYOT[document.getElementById('zimmetKkdTuru').value] || 365;
  });

  document.getElementById('zimmetSablonIndirBtn').addEventListener('click', () => excelSablonIndir(KKD_ZIMMET_IMPORT_KOLONLARI, 'kkd_zimmet_sablonu.xlsx'));
  document.getElementById('zimmetDisaAktarBtn').addEventListener('click', () => {
    const liste = zimmetleriGetir('', {}).map(z => Object.assign({}, z, { enStandartlariMetin: (z.enStandartlari || []).join('; ') }));
    excelDisaAktar(liste, KKD_ZIMMET_EXPORT_KOLONLARI, 'kkd_zimmetleri.xlsx');
  });
  document.getElementById('zimmetIceAktarBtn').addEventListener('click', () => document.getElementById('zimmetIceAktarDosya').click());
  document.getElementById('zimmetIceAktarDosya').addEventListener('change', e => {
    const dosya = e.target.files[0];
    excelIceAktar(dosya, KKD_ZIMMET_IMPORT_KOLONLARI, (satirlar, hataMesaji) => {
      e.target.value = '';
      if (hataMesaji) { alert(hataMesaji); return; }
      satirlar.forEach(s => { s.verilisTarihi = excelTarihiNormallestir(s.verilisTarihi); });
      const sonuc = excelToplulIceAktarSonucOzetle(satirlar, zimmetEkle);
      alert(excelIceAktarOzetMesaji(sonuc));
      zimmetleriCiz(document.getElementById('zimmetAramaKutusu').value);
    });
  });
}

const KKD_ZIMMET_IMPORT_KOLONLARI = [
  { anahtar: 'personelAdi', baslik: 'Personel' },
  { anahtar: 'bolum', baslik: 'Bölüm' },
  { anahtar: 'kkdAdi', baslik: 'KKD Adı' },
  { anahtar: 'kkdTuru', baslik: 'KKD Türü' },
  { anahtar: 'beden', baslik: 'Beden / Ölçü' },
  { anahtar: 'verilisTarihi', baslik: 'Veriliş Tarihi' },
  { anahtar: 'adet', baslik: 'Adet' }
];

const KKD_ZIMMET_EXPORT_KOLONLARI = [
  { anahtar: 'zimmetNo', baslik: 'Zimmet No' },
  { anahtar: 'personelAdi', baslik: 'Personel' },
  { anahtar: 'bolum', baslik: 'Bölüm' },
  { anahtar: 'kkdAdi', baslik: 'KKD Adı' },
  { anahtar: 'kkdTuru', baslik: 'KKD Türü' },
  { anahtar: 'enStandartlariMetin', baslik: 'EN Standartları' },
  { anahtar: 'verilisTarihi', baslik: 'Veriliş Tarihi' },
  { anahtar: 'degisimTarihi', baslik: 'Değişim Tarihi' },
  { anahtar: 'adet', baslik: 'Adet' },
  { anahtar: 'kondisyon', baslik: 'Durum / Kondisyon' },
  { anahtar: 'durumGoruntu', baslik: 'Zimmet Durumu' },
  { anahtar: 'teslimEden', baslik: 'Teslim Eden' },
  { anahtar: 'notlar', baslik: 'Not' }
];

function zimmetleriCiz(aramaMetni) {
  const govde = document.getElementById('zimmetTabloGovde');
  const bosDurum = document.getElementById('zimmetBosDurum');
  const filtreler = { durum: document.getElementById('zimmetDurumFiltre').value };
  const liste = zimmetleriGetir(aramaMetni, filtreler);

  govde.innerHTML = '';
  if (!liste.length) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = 'Eşleşen zimmet kaydı bulunamadı.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  liste.forEach(z => {
    const satir = document.createElement('tr');
    const iadeButonu = ['İade Edildi', 'Kayıp', 'İptal'].includes(z.durumGoruntu) ? '' : `<button class="tablo-buton" data-iade="${z.id}">İade Et</button>`;
    satir.innerHTML = `
      <td>${z.zimmetNo}</td>
      <td>${z.personelAdi}</td>
      <td>${z.bolum || '-'}</td>
      <td>${z.kkdAdi}</td>
      <td>${z.kkdTuru}</td>
      <td>${gunAyYil(z.verilisTarihi) || '-'}</td>
      <td>${gunAyYil(z.degisimTarihi) || '-'}</td>
      <td><span class="genel-rozet rozet-${kkdRozetSinifAdi(z.durumGoruntu)}">${z.durumGoruntu}</span></td>
      <td>${z.kondisyon}</td>
      <td>
        <button class="tablo-buton" data-duzenle="${z.id}">Düzenle</button>
        <button class="tablo-buton" data-form="${z.id}">Zimmet Formu</button>
        ${iadeButonu}
        <button class="tablo-buton sil" data-sil="${z.id}">Sil</button>
      </td>
    `;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-duzenle]').forEach(btn => btn.addEventListener('click', () => zimmetModalAc(zimmetIdIleGetirRepo(btn.getAttribute('data-duzenle')))));
  govde.querySelectorAll('[data-form]').forEach(btn => btn.addEventListener('click', async () => {
    try { await kkdZimmetFormuPdfOlustur(btn.getAttribute('data-form')); } catch (hata) { console.error(hata); alert('PDF üretilemedi: ' + (hata.message || hata)); }
  }));
  govde.querySelectorAll('[data-iade]').forEach(btn => btn.addEventListener('click', async () => {
    if (await onayModali('Bu KKD iade edildi olarak işaretlensin mi?', 'İşaretle')) { zimmetIadeEt(btn.getAttribute('data-iade')); zimmetleriCiz(document.getElementById('zimmetAramaKutusu').value); }
  }));
  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', async () => {
    if (await onayModali('Bu zimmet kaydını silmek istediğinize emin misiniz?', 'Sil')) { zimmetSil(btn.getAttribute('data-sil')); zimmetleriCiz(document.getElementById('zimmetAramaKutusu').value); }
  }));
}

function zimmetModalAc(kayit) {
  _duzenlenenZimmetId = kayit ? kayit.id : null;
  document.getElementById('zimmetModalBaslik').textContent = kayit ? (kayit.zimmetNo + ' Kaydını Düzenle') : 'Yeni Zimmet Kaydı';

  document.getElementById('zimmetPersonelAdi').value = kayit ? kayit.personelAdi : '';
  document.getElementById('zimmetPersonelAdi').dataset.personelId = kayit ? kayit.personelId : '';
  document.getElementById('zimmetBolum').value = kayit ? kayit.bolum : '';
  document.getElementById('zimmetGorev').value = kayit ? kayit.gorev : '';
  document.getElementById('zimmetKkdAdi').value = kayit ? kayit.kkdAdi : '';
  document.getElementById('zimmetKkdTuru').innerHTML = KKD_TURLERI.map(t => `<option ${kayit && kayit.kkdTuru === t ? 'selected' : ''}>${t}</option>`).join('');
  document.getElementById('zimmetEnStandartlari').value = kayit ? (kayit.enStandartlari || []).join('; ') : '';
  document.getElementById('zimmetMarka').value = kayit ? kayit.marka : '';
  document.getElementById('zimmetModel').value = kayit ? kayit.model : '';
  document.getElementById('zimmetBeden').value = kayit ? kayit.beden : '';
  document.getElementById('zimmetAdet').value = kayit ? kayit.adet : 1;
  document.getElementById('zimmetVerilisTarihi').value = kayit ? kayit.verilisTarihi : bugunIso();
  document.getElementById('zimmetDegisimPeriyoduGun').value = kayit ? kayit.degisimPeriyoduGun : '';
  document.getElementById('zimmetDegisimTarihi').value = kayit ? kayit.degisimTarihi : '';
  document.getElementById('zimmetKondisyon').innerHTML = KKD_KONDISYONLARI.map(k => `<option ${kayit && kayit.kondisyon === k ? 'selected' : ''}>${k}</option>`).join('');
  document.getElementById('zimmetTeslimEden').value = kayit ? kayit.teslimEden : '';
  document.getElementById('zimmetTeslimAlanImza').value = kayit ? kayit.teslimAlanImza : '';
  document.getElementById('zimmetNotlar').value = kayit ? kayit.notlar : '';

  document.querySelectorAll('#zimmetForm .alan-hatasi').forEach(el => el.textContent = '');
  document.getElementById('zimmetModalKatman').classList.add('acik');
}

function zimmetModalKapat() {
  document.getElementById('zimmetModalKatman').classList.remove('acik');
  _duzenlenenZimmetId = null;
}

function zimmetFormGonderildi(e) {
  e.preventDefault();
  document.querySelectorAll('#zimmetForm .alan-hatasi').forEach(el => el.textContent = '');

  const personelAdiInput = document.getElementById('zimmetPersonelAdi');
  const veriler = {
    personelId: personelAdiInput.dataset.personelId || '',
    personelAdi: personelAdiInput.value,
    bolum: document.getElementById('zimmetBolum').value,
    gorev: document.getElementById('zimmetGorev').value,
    kkdAdi: document.getElementById('zimmetKkdAdi').value,
    kkdTuru: document.getElementById('zimmetKkdTuru').value,
    enStandartlari: document.getElementById('zimmetEnStandartlari').value,
    marka: document.getElementById('zimmetMarka').value,
    model: document.getElementById('zimmetModel').value,
    beden: document.getElementById('zimmetBeden').value,
    adet: document.getElementById('zimmetAdet').value,
    verilisTarihi: document.getElementById('zimmetVerilisTarihi').value,
    degisimPeriyoduGun: document.getElementById('zimmetDegisimPeriyoduGun').value,
    degisimTarihi: document.getElementById('zimmetDegisimTarihi').value,
    kondisyon: document.getElementById('zimmetKondisyon').value,
    teslimEden: document.getElementById('zimmetTeslimEden').value,
    teslimAlanImza: document.getElementById('zimmetTeslimAlanImza').value,
    notlar: document.getElementById('zimmetNotlar').value
  };

  const sonuc = _duzenlenenZimmetId ? zimmetGuncelle(_duzenlenenZimmetId, veriler) : zimmetEkle(veriler);
  if (!sonuc.basarili) {
    Object.keys(sonuc.hatalar || {}).forEach(alan => {
      const hataEl = document.getElementById('zimmet' + alan.charAt(0).toUpperCase() + alan.slice(1) + 'Hata');
      if (hataEl) hataEl.textContent = sonuc.hatalar[alan];
    });
    return;
  }

  zimmetModalKapat();
  zimmetleriCiz(document.getElementById('zimmetAramaKutusu').value);
}

// ==================== İHLAL ====================

function _kkdIhlalBaslat() {
  document.getElementById('ihlalTuruFiltre').innerHTML += IHLAL_TURLERI.map(t => `<option>${t}</option>`).join('');

  document.getElementById('yeniIhlalBtn').addEventListener('click', () => ihlalModalAc());
  document.getElementById('ihlalModalKapatBtn').addEventListener('click', ihlalModalKapat);
  document.getElementById('ihlalModalIptalBtn').addEventListener('click', ihlalModalKapat);
  document.getElementById('ihlalForm').addEventListener('submit', ihlalFormGonderildi);
  document.getElementById('ihlalAramaKutusu').addEventListener('input', e => ihlalleriCiz(e.target.value));
  document.getElementById('ihlalTuruFiltre').addEventListener('change', () => ihlalleriCiz(document.getElementById('ihlalAramaKutusu').value));
  document.getElementById('ihlalTekrarFiltre').addEventListener('change', () => ihlalleriCiz(document.getElementById('ihlalAramaKutusu').value));

  document.getElementById('ihlalAdSoyad').addEventListener('input', e => {
    const personel = personelleriGetir('', false).find(p => p.adSoyad === e.target.value);
    if (!personel) return;
    document.getElementById('ihlalSicil').value = personel.sicilNo || '';
    document.getElementById('ihlalCalismaBolumu').value = [personel.bolum, personel.gorev].filter(Boolean).join(' - ');
  });

  document.getElementById('ihlalSablonIndirBtn').addEventListener('click', () => excelSablonIndir(KKD_IHLAL_IMPORT_KOLONLARI, 'kkd_ihlal_sablonu.xlsx'));
  document.getElementById('ihlalDisaAktarBtn').addEventListener('click', () => excelDisaAktar(ihlalleriGetir('', {}), KKD_IHLAL_EXPORT_KOLONLARI, 'kkd_ihlalleri.xlsx'));
  document.getElementById('ihlalIceAktarBtn').addEventListener('click', () => document.getElementById('ihlalIceAktarDosya').click());
  document.getElementById('ihlalIceAktarDosya').addEventListener('change', e => {
    const dosya = e.target.files[0];
    excelIceAktar(dosya, KKD_IHLAL_IMPORT_KOLONLARI, (satirlar, hataMesaji) => {
      e.target.value = '';
      if (hataMesaji) { alert(hataMesaji); return; }
      satirlar.forEach(s => { s.tarih = excelTarihiNormallestir(s.tarih); });
      const sonuc = excelToplulIceAktarSonucOzetle(satirlar, ihlalEkle);
      alert(excelIceAktarOzetMesaji(sonuc));
      ihlalleriCiz(document.getElementById('ihlalAramaKutusu').value);
    });
  });
}

const KKD_IHLAL_IMPORT_KOLONLARI = [
  { anahtar: 'tarih', baslik: 'Tarih' },
  { anahtar: 'saat', baslik: 'Tespit Saati' },
  { anahtar: 'adSoyad', baslik: 'Ad Soyad' },
  { anahtar: 'sicil', baslik: 'Sicil No' },
  { anahtar: 'firma', baslik: 'Firma' },
  { anahtar: 'bolum', baslik: 'Bölüm / Lokasyon' },
  { anahtar: 'calismaBolumu', baslik: 'Çalıştığı Bölüm' },
  { anahtar: 'kkd', baslik: 'KKD' },
  { anahtar: 'ihlalTuru', baslik: 'İhlal Türü' },
  { anahtar: 'tespitEden', baslik: 'Tespiti Yapan' },
  { anahtar: 'islem', baslik: 'Uygulanan İşlem' },
  { anahtar: 'aciklama', baslik: 'Açıklama' }
];

const KKD_IHLAL_EXPORT_KOLONLARI = [
  { anahtar: 'ihlalNo', baslik: 'İhlal No' },
  { anahtar: 'tarih', baslik: 'Tarih' },
  { anahtar: 'saat', baslik: 'Tespit Saati' },
  { anahtar: 'adSoyad', baslik: 'Ad Soyad' },
  { anahtar: 'sicil', baslik: 'Sicil No' },
  { anahtar: 'firma', baslik: 'Firma' },
  { anahtar: 'bolum', baslik: 'Bölüm / Lokasyon' },
  { anahtar: 'calismaBolumu', baslik: 'Çalıştığı Bölüm' },
  { anahtar: 'kkd', baslik: 'KKD' },
  { anahtar: 'ihlalTuru', baslik: 'İhlal Türü' },
  { anahtar: 'tespitEden', baslik: 'Tespiti Yapan' },
  { anahtar: 'islem', baslik: 'Uygulanan İşlem' },
  { anahtar: 'aciklama', baslik: 'Açıklama' },
  { anahtar: 'tekrar', baslik: 'Tekrar' },
  { anahtar: 'sonIhlalTarihi', baslik: 'Son İhlal Tarihi' }
];

function ihlalleriCiz(aramaMetni) {
  const govde = document.getElementById('ihlalTabloGovde');
  const bosDurum = document.getElementById('ihlalBosDurum');
  const filtreler = {
    ihlalTuru: document.getElementById('ihlalTuruFiltre').value,
    tekrar: document.getElementById('ihlalTekrarFiltre').value
  };
  const liste = ihlalleriGetir(aramaMetni, filtreler);

  govde.innerHTML = '';
  if (!liste.length) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = 'Eşleşen ihlal kaydı bulunamadı.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  liste.forEach(k => {
    const satir = document.createElement('tr');
    const tekrarRozet = k.tekrar === 'Evet' ? `<span class="genel-rozet rozet-kirmizi">Evet${k.sonIhlalTarihi ? ' (' + gunAyYil(k.sonIhlalTarihi) + ')' : ''}</span>` : 'Hayır';
    satir.innerHTML = `
      <td>${k.ihlalNo}</td>
      <td>${gunAyYil(k.tarih)}</td>
      <td>${k.adSoyad}</td>
      <td>${k.sicil || '-'}</td>
      <td>${k.bolum || '-'}</td>
      <td>${k.kkd || '-'}</td>
      <td>${k.ihlalTuru}</td>
      <td>${k.islem}</td>
      <td>${tekrarRozet}</td>
      <td>
        <button class="tablo-buton" data-duzenle="${k.id}">Düzenle</button>
        <button class="tablo-buton" data-tutanak="${k.id}">Tutanak</button>
        <button class="tablo-buton sil" data-sil="${k.id}">Sil</button>
      </td>
    `;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-duzenle]').forEach(btn => btn.addEventListener('click', () => ihlalModalAc(ihlalIdIleGetirRepo(btn.getAttribute('data-duzenle')))));
  govde.querySelectorAll('[data-tutanak]').forEach(btn => btn.addEventListener('click', async () => {
    try { await kkdIhlalTutanagiPdfOlustur(btn.getAttribute('data-tutanak')); } catch (hata) { console.error(hata); alert('PDF üretilemedi: ' + (hata.message || hata)); }
  }));
  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', async () => {
    if (await onayModali('Bu ihlal kaydını silmek istediğinize emin misiniz?', 'Sil')) { ihlalSil(btn.getAttribute('data-sil')); ihlalleriCiz(document.getElementById('ihlalAramaKutusu').value); }
  }));
}

function ihlalModalAc(kayit) {
  _duzenlenenIhlalId = kayit ? kayit.id : null;
  document.getElementById('ihlalModalBaslik').textContent = kayit ? (kayit.ihlalNo + ' Kaydını Düzenle') : 'Yeni İhlal Kaydı';

  document.getElementById('ihlalTarih').value = kayit ? kayit.tarih : bugunIso();
  document.getElementById('ihlalSaat').value = kayit ? kayit.saat : '';
  document.getElementById('ihlalAdSoyad').value = kayit ? kayit.adSoyad : '';
  document.getElementById('ihlalSicil').value = kayit ? kayit.sicil : '';
  document.getElementById('ihlalFirma').value = kayit ? kayit.firma : '';
  document.getElementById('ihlalBolum').value = kayit ? kayit.bolum : '';
  document.getElementById('ihlalCalismaBolumu').value = kayit ? kayit.calismaBolumu : '';
  document.getElementById('ihlalKkd').value = kayit ? kayit.kkd : '';
  document.getElementById('ihlalIhlalTuru').innerHTML = '<option value="">Seçiniz</option>' + IHLAL_TURLERI.map(t => `<option ${kayit && kayit.ihlalTuru === t ? 'selected' : ''}>${t}</option>`).join('');
  document.getElementById('ihlalIslem').innerHTML = '<option value="">Seçiniz</option>' + IHLAL_ISLEMLERI.map(t => `<option ${kayit && kayit.islem === t ? 'selected' : ''}>${t}</option>`).join('');
  document.getElementById('ihlalTespitEden').value = kayit ? kayit.tespitEden : '';
  document.getElementById('ihlalAciklama').value = kayit ? kayit.aciklama : '';

  document.querySelectorAll('#ihlalForm .alan-hatasi').forEach(el => el.textContent = '');
  document.getElementById('ihlalModalKatman').classList.add('acik');
}

function ihlalModalKapat() {
  document.getElementById('ihlalModalKatman').classList.remove('acik');
  _duzenlenenIhlalId = null;
}

function ihlalFormGonderildi(e) {
  e.preventDefault();
  document.querySelectorAll('#ihlalForm .alan-hatasi').forEach(el => el.textContent = '');

  const veriler = {
    tarih: document.getElementById('ihlalTarih').value,
    saat: document.getElementById('ihlalSaat').value,
    adSoyad: document.getElementById('ihlalAdSoyad').value,
    sicil: document.getElementById('ihlalSicil').value,
    firma: document.getElementById('ihlalFirma').value,
    bolum: document.getElementById('ihlalBolum').value,
    calismaBolumu: document.getElementById('ihlalCalismaBolumu').value,
    kkd: document.getElementById('ihlalKkd').value,
    ihlalTuru: document.getElementById('ihlalIhlalTuru').value,
    tespitEden: document.getElementById('ihlalTespitEden').value,
    islem: document.getElementById('ihlalIslem').value,
    aciklama: document.getElementById('ihlalAciklama').value
  };

  const sonuc = _duzenlenenIhlalId ? ihlalGuncelle(_duzenlenenIhlalId, veriler) : ihlalEkle(veriler);
  if (!sonuc.basarili) {
    Object.keys(sonuc.hatalar || {}).forEach(alan => {
      const hataEl = document.getElementById('ihlal' + alan.charAt(0).toUpperCase() + alan.slice(1) + 'Hata');
      if (hataEl) hataEl.textContent = sonuc.hatalar[alan];
    });
    return;
  }

  ihlalModalKapat();
  ihlalleriCiz(document.getElementById('ihlalAramaKutusu').value);
}

// ==================== NUMUNE DEĞERLENDİRME ====================
// Kullanıcı isteği: "kkd modülüne numune deneme kısmı ekleyelim, nihayetinde
// çalışan ve İSG imzalı Numune Değerlendirme Formu" — imza pad'i
// modules/acil-durum/ui.js _kfImzaPaduBagla/_kfImzaKirp ile birebir aynı
// desen (bkz. o dosyadaki not: her modül kendi önekiyle tekrarlar, ortak
// yardımcı yok). İmza butonları kayıt Firestore'a bir kez kaydedilene kadar
// disabled kalır çünkü imza doğrudan kalıcı kayda (numuneImzaVer) yazılır.

function _kkdNumuneBaslat() {
  document.getElementById('numuneSonucFiltre').innerHTML += NUMUNE_SONUC_SECENEKLERI.map(s => `<option>${s}</option>`).join('');

  document.getElementById('yeniNumuneBtn').addEventListener('click', () => numuneModalAc());
  document.getElementById('numuneModalKapatBtn').addEventListener('click', numuneModalKapat);
  document.getElementById('numuneModalIptalBtn').addEventListener('click', numuneModalKapat);
  document.getElementById('numuneForm').addEventListener('submit', numuneFormGonderildi);
  document.getElementById('numuneAramaKutusu').addEventListener('input', e => numuneleriCiz(e.target.value));
  document.getElementById('numuneSonucFiltre').addEventListener('change', () => numuneleriCiz(document.getElementById('numuneAramaKutusu').value));
  _kkdKatalogOtomatikDoldur('numuneKkdAdi', 'numuneKkdTuru', 'numuneMarka');

  document.getElementById('numunePersonelAdi').addEventListener('input', e => {
    const personel = personelleriGetir('', false).find(p => p.adSoyad === e.target.value);
    document.getElementById('numunePersonelAdi').dataset.personelId = personel ? personel.id : '';
    if (!personel) return;
    document.getElementById('numuneBolum').value = personel.bolum || '';
  });

  document.getElementById('numuneCalisanImzaBtn').addEventListener('click', () => numImzaModalAc('calisan'));
  document.getElementById('numuneIsgImzaBtn').addEventListener('click', () => numImzaModalAc('isgUzmani'));
  document.getElementById('numImzaIptalBtn').addEventListener('click', numImzaModalKapat);
  document.getElementById('numImzaKapatBtn').addEventListener('click', numImzaModalKapat);
  document.getElementById('numImzaTemizleBtn').addEventListener('click', () => { if (_numImzaPad) _numImzaPad.temizle(); });
  document.getElementById('numImzaKaydetBtn').addEventListener('click', numImzaKaydetTiklandi);
}

function numuneleriCiz(aramaMetni) {
  const govde = document.getElementById('numuneTabloGovde');
  const bosDurum = document.getElementById('numuneBosDurum');
  const filtreler = { sonuc: document.getElementById('numuneSonucFiltre').value };
  const liste = numuneleriGetir(aramaMetni, filtreler);

  govde.innerHTML = '';
  if (!liste.length) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = 'Eşleşen numune denemesi bulunamadı.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  liste.forEach(k => {
    const satir = document.createElement('tr');
    const sonucRozet = k.sonuc ? `<span class="genel-rozet rozet-${kkdRozetSinifAdi(k.sonuc)}">${k.sonuc}</span>` : '-';
    const imzaDurumu = [
      k.imzalar && k.imzalar.calisan ? 'Çalışan ✓' : 'Çalışan —',
      k.imzalar && k.imzalar.isgUzmani ? 'İSG ✓' : 'İSG —'
    ].join(' / ');
    satir.innerHTML = `
      <td>${k.numuneNo}</td>
      <td>${k.kkdAdi}</td>
      <td>${[k.marka, k.model].filter(Boolean).join(' / ') || '-'}</td>
      <td>${k.personelAdSoyad || '-'}</td>
      <td>${k.bolum || '-'}</td>
      <td>${gunAyYil(k.deneyBaslangic) || '-'}</td>
      <td>${sonucRozet}</td>
      <td style="font-size:11.5px;">${imzaDurumu}</td>
      <td>
        <button class="tablo-buton" data-duzenle="${k.id}">Düzenle</button>
        <button class="tablo-buton" data-form="${k.id}">PDF</button>
        <button class="tablo-buton sil" data-sil="${k.id}">Sil</button>
      </td>
    `;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-duzenle]').forEach(btn => btn.addEventListener('click', () => numuneModalAc(numuneIdIleGetir(btn.getAttribute('data-duzenle')))));
  govde.querySelectorAll('[data-form]').forEach(btn => btn.addEventListener('click', async () => {
    try { await kkdNumuneFormuPdfOlustur(btn.getAttribute('data-form')); } catch (hata) { console.error(hata); alert('PDF üretilemedi: ' + (hata.message || hata)); }
  }));
  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', async () => {
    if (await onayModali('Bu numune denemesini silmek istediğinize emin misiniz?', 'Sil')) { numuneSil(btn.getAttribute('data-sil')); numuneleriCiz(document.getElementById('numuneAramaKutusu').value); }
  }));
}

function _numuneImzaButonlariniGuncelle(kayit) {
  const dolu = !!_duzenlenenNumuneId;
  document.getElementById('numuneCalisanImzaBtn').disabled = !dolu;
  document.getElementById('numuneIsgImzaBtn').disabled = !dolu;

  const calisanImza = kayit && kayit.imzalar ? kayit.imzalar.calisan : null;
  const isgImza = kayit && kayit.imzalar ? kayit.imzalar.isgUzmani : null;
  document.getElementById('calisanImzaDurum').textContent = calisanImza ? `İmzalandı: ${calisanImza.ad} (${gunAyYil(calisanImza.tarih.slice(0, 10))})` : 'Henüz imzalanmadı';
  document.getElementById('isgUzmaniImzaDurum').textContent = isgImza ? `İmzalandı: ${isgImza.ad} (${gunAyYil(isgImza.tarih.slice(0, 10))})` : 'Henüz imzalanmadı';
}

function numuneModalAc(kayit) {
  _duzenlenenNumuneId = kayit ? kayit.id : null;
  document.getElementById('numuneModalBaslik').textContent = kayit ? (kayit.numuneNo + ' Kaydını Düzenle') : 'Yeni Numune Denemesi';

  document.getElementById('numuneKkdAdi').value = kayit ? kayit.kkdAdi : '';
  document.getElementById('numuneKkdTuru').innerHTML = '<option value="">Seçiniz</option>' + KKD_TURLERI.map(t => `<option ${kayit && kayit.kkdTuru === t ? 'selected' : ''}>${t}</option>`).join('');
  document.getElementById('numuneMarka').value = kayit ? kayit.marka : '';
  document.getElementById('numuneModel').value = kayit ? kayit.model : '';
  document.getElementById('numuneGonderenFirma').value = kayit ? kayit.gonderenFirma : '';
  document.getElementById('numuneIlgiliKisi').value = kayit ? kayit.ilgiliKisi : '';
  document.getElementById('numuneIlgiliKisiTel').value = kayit ? kayit.ilgiliKisiTel : '';
  document.getElementById('numunePersonelAdi').value = kayit ? kayit.personelAdSoyad : '';
  document.getElementById('numunePersonelAdi').dataset.personelId = kayit ? kayit.personelId : '';
  document.getElementById('numuneBolum').value = kayit ? kayit.bolum : '';
  document.getElementById('numuneDeneyBaslangic').value = kayit ? kayit.deneyBaslangic : bugunIso();
  document.getElementById('numuneDeneyBitis').value = kayit ? kayit.deneyBitis : '';
  document.getElementById('numuneCalisanGorusu').value = kayit ? kayit.calisanGorusu : '';
  document.getElementById('numuneIsgDegerlendirmesi').value = kayit ? kayit.isgDegerlendirmesi : '';
  document.getElementById('numuneSonuc').innerHTML = '<option value="">— Seçilmedi —</option>' + NUMUNE_SONUC_SECENEKLERI.map(s => `<option ${kayit && kayit.sonuc === s ? 'selected' : ''}>${s}</option>`).join('');

  document.querySelectorAll('#numuneForm .alan-hatasi').forEach(el => el.textContent = '');
  _numuneImzaButonlariniGuncelle(kayit);
  document.getElementById('numuneModalKatman').classList.add('acik');
}

function numuneModalKapat() {
  document.getElementById('numuneModalKatman').classList.remove('acik');
  _duzenlenenNumuneId = null;
}

function numuneFormGonderildi(e) {
  e.preventDefault();
  document.querySelectorAll('#numuneForm .alan-hatasi').forEach(el => el.textContent = '');

  const personelAdiInput = document.getElementById('numunePersonelAdi');
  const veriler = {
    kkdAdi: document.getElementById('numuneKkdAdi').value,
    kkdTuru: document.getElementById('numuneKkdTuru').value,
    marka: document.getElementById('numuneMarka').value,
    model: document.getElementById('numuneModel').value,
    gonderenFirma: document.getElementById('numuneGonderenFirma').value,
    ilgiliKisi: document.getElementById('numuneIlgiliKisi').value,
    ilgiliKisiTel: document.getElementById('numuneIlgiliKisiTel').value,
    personelId: personelAdiInput.dataset.personelId || '',
    bolum: document.getElementById('numuneBolum').value,
    deneyBaslangic: document.getElementById('numuneDeneyBaslangic').value,
    deneyBitis: document.getElementById('numuneDeneyBitis').value,
    calisanGorusu: document.getElementById('numuneCalisanGorusu').value,
    isgDegerlendirmesi: document.getElementById('numuneIsgDegerlendirmesi').value,
    sonuc: document.getElementById('numuneSonuc').value
  };

  const sonuc = _duzenlenenNumuneId ? numuneGuncelle(_duzenlenenNumuneId, veriler) : numuneEkle(veriler);
  if (!sonuc.basarili) {
    Object.keys(sonuc.hatalar || {}).forEach(alan => {
      const hataEl = document.getElementById('numune' + alan.charAt(0).toUpperCase() + alan.slice(1) + 'Hata');
      if (hataEl) hataEl.textContent = sonuc.hatalar[alan];
    });
    return;
  }

  // Yeni kayıt ilk kez kaydedildiğinde imza butonlarının hemen açılması için
  // formu kapatmadan modalı kaydedilen kayıtla yeniden aç.
  _duzenlenenNumuneId = sonuc.kayit.id;
  _numuneImzaButonlariniGuncelle(numuneIdIleGetir(sonuc.kayit.id));
  numuneModalKapat();
  numuneleriCiz(document.getElementById('numuneAramaKutusu').value);
}

// ---- İmza modalı (canvas pad) ----
// modules/acil-durum/ui.js _kfImzaPaduBagla/_kfImzaKirp ile aynı; bu modül
// diğerlerinin ui.js'ini yüklemediğinden kendi önekiyle (_numImza) tekrarlanır.
let _numImzaPad = null;
let _numImzaBekleyenRol = null;

function _numImzaPaduBagla(canvasId) {
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

function _numImzaKirp(canvas) {
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

function numImzaModalAc(rol) {
  if (!_duzenlenenNumuneId) { alert('İmzalamak için önce kaydı bir kez kaydedin.'); return; }
  _numImzaBekleyenRol = rol;
  document.getElementById('numImzaRolEtiketi').textContent = rol === 'calisan' ? 'Denemeyi Yapan Çalışan' : 'İSG Uzmanı';
  document.getElementById('numImzaAdSoyad').value = rol === 'calisan' ? (document.getElementById('numunePersonelAdi').value || '') : '';
  document.getElementById('numImzaHata').textContent = '';
  document.getElementById('numImzaKatmani').classList.add('acik');
  requestAnimationFrame(() => {
    if (!_numImzaPad) _numImzaPad = _numImzaPaduBagla('numImzaCanvas'); else _numImzaPad.temizle();
  });
}

function numImzaModalKapat() {
  document.getElementById('numImzaKatmani').classList.remove('acik');
  _numImzaBekleyenRol = null;
}

async function numImzaKaydetTiklandi() {
  if (!_numImzaBekleyenRol || !_duzenlenenNumuneId) return;
  const ad = document.getElementById('numImzaAdSoyad').value.trim();
  if (!ad) { document.getElementById('numImzaHata').textContent = 'Ad soyad zorunludur.'; return; }
  if (!_numImzaPad || !_numImzaPad.doluMu()) { document.getElementById('numImzaHata').textContent = 'Lütfen imzalayın.'; return; }

  const dataUrl = _numImzaKirp(_numImzaPad.canvasElemani).toDataURL('image/png');
  const sonuc = numuneImzaVer(_duzenlenenNumuneId, _numImzaBekleyenRol, ad, dataUrl);
  if (!sonuc.basarili) { document.getElementById('numImzaHata').textContent = sonuc.hata || 'İmza kaydedilemedi.'; return; }

  _numuneImzaButonlariniGuncelle(sonuc.kayit);
  numImzaModalKapat();
  numuneleriCiz(document.getElementById('numuneAramaKutusu').value);
}

// ==================== ÖZET ====================

function ozetiCiz() {
  const ozet = kkdOzetiHesapla();
  const kutu = document.getElementById('ozetKutusu');
  const kart = (etiket, deger) => `<div class="istatistik-kutu"><span>${etiket}</span><b>${deger}</b></div>`;
  const liste = (baslik, satirlar, bosMetin) => `
    <div class="kart" style="margin-bottom:14px;">
      <div class="card-title" style="margin-bottom:8px;"><h3 style="margin:0; font-size:14px;">${baslik}</h3></div>
      ${satirlar.length
        ? satirlar.map(([k, v]) => `<div style="display:flex; justify-content:space-between; font-size:13px; padding:6px 0; border-bottom:1px solid var(--kenarlik);"><span>${k}</span><strong>${v}</strong></div>`).join('')
        : `<div class="bos-durum gorunur">${bosMetin}</div>`}
    </div>
  `;

  kutu.innerHTML = `
    <div class="istatistik-grid">
      ${kart('Envanter Kalemi', ozet.envanterKalemi)}
      ${kart('Aktif Zimmet', ozet.aktifZimmet)}
      ${kart('Değişim Süresi Geçen', ozet.degisimGecenler.length)}
      ${kart('Bu Ay Yeni İhlal', ozet.ihlalBuAy)}
      ${kart('Toplam İhlal', ozet.ihlalToplam)}
      ${kart('Tekrar Eden İhlal', ozet.tekrarEdenSayisi)}
    </div>

    <div class="modul-grid" style="grid-template-columns: repeat(auto-fill, minmax(280px,1fr));">
      <div>${liste('Değişim Süresi Geçen Zimmetler', ozet.degisimGecenler.map(z => [`${z.personelAdi} — ${z.kkdAdi}`, gunAyYil(z.degisimTarihi)]), 'Süresi geçen zimmet yok.')}</div>
      <div>${liste('Değişimi Yaklaşan Zimmetler (30 gün)', ozet.degisimYaklasanlar.map(z => [`${z.personelAdi} — ${z.kkdAdi}`, gunAyYil(z.degisimTarihi)]), 'Yaklaşan değişim yok.')}</div>
      <div>${liste('Minimum Stok Altındaki Envanter', ozet.dusukStokListesi.map(e => [e.ad, `${e.stok} / min ${e.minimumStok}`]), 'Düşük stok yok.')}</div>
      <div>${liste('EN Standardı Eksik Envanter', ozet.enEksikListesi.map(e => [e.ad, e.envanterNo]), 'Eksik EN standardı yok.')}</div>
      <div>${liste('Bölüme Göre İhlal (Top 10)', ozet.bolumeGoreIhlal, 'İhlal kaydı yok.')}</div>
      <div>${liste('İhlal Türüne Göre (Top 10)', ozet.turuGoreIhlal, 'İhlal kaydı yok.')}</div>
      <div>${liste('Tekrar Eden Çalışanlar (Top 15)', ozet.tekrarEdenler, 'Tekrar eden ihlal yok.')}</div>
    </div>
  `;
}
