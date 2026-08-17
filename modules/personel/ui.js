// Personel ekranının DOM işlemleri.

let _duzenlenenPersonelId = null;
let _arsivGorunumu = false;
let _seciliPersonelIdleri = new Set();

function _prsKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// esanlamlar listeleri, eski isg platformundaki Personel Excel dışa aktarım
// başlıklarını (bkz. app-import-export.js -> exportExcel) da kapsar; böylece o
// uygulamadan alınan bir Excel dosyası hiç değiştirilmeden buraya içe
// aktarılabilir.
const PERSONEL_EXCEL_KOLONLARI = [
  { anahtar: 'sicilNo', baslik: 'Sicil No', esanlamlar: ['SICIL NO', 'SİCİL NO', 'Personel No'] },
  { anahtar: 'adSoyad', baslik: 'Ad Soyad', esanlamlar: ['ADI SOYADI', 'İsim Soyisim'] },
  { anahtar: 'isveren', baslik: 'İşveren', esanlamlar: ['Sicil Firma', 'İşyeri', 'İşyeri Ünvanı'] },
  { anahtar: 'bolum', baslik: 'Bölüm', esanlamlar: ['Departman', 'Birim', 'BÖLÜMÜ'] },
  { anahtar: 'gorev', baslik: 'Görev', esanlamlar: ['Unvan', 'Pozisyon', 'GÖREVİ'] },
  { anahtar: 'iseGirisTarihi', baslik: 'İşe Giriş Tarihi', esanlamlar: ['İşe Başlama Tarihi', 'İşbaşı Tarihi'] },
  { anahtar: 'istenCikisTarihi', baslik: 'İşten Çıkış Tarihi' },
  { anahtar: 'egitimSeviyesi', baslik: 'Eğitim Seviyesi' },
  { anahtar: 'okulu', baslik: 'Okulu' },
  { anahtar: 'engelliMi', baslik: 'Engelli mi?' },
  { anahtar: 'sendikaliMi', baslik: 'Sendikalı mı?', esanlamlar: ['SENDİKA', 'Sendika'] },
  { anahtar: 'mv', baslik: 'M/V' },
  { anahtar: 'kapsami', baslik: 'Kapsamı' },
  { anahtar: 'kidemYil', baslik: 'Kıdem Yıl' },
  { anahtar: 'lojman', baslik: 'Lojman' }
];

function personelSayfasiniBaslat() {
  document.getElementById('yeniPersonelBtn').addEventListener('click', () => modalAc());
  document.getElementById('modalKapatBtn').addEventListener('click', modalKapat);
  document.getElementById('modalIptalBtn').addEventListener('click', modalKapat);
  document.getElementById('personelForm').addEventListener('submit', formGonderildi);
  document.getElementById('aramaKutusu').addEventListener('input', e => tabloyuCiz(e.target.value));
  document.getElementById('sekmeAktif').addEventListener('click', () => sekmeDegistir(false));
  document.getElementById('sekmeArsiv').addEventListener('click', () => sekmeDegistir(true));

  document.getElementById('tumunuSecCheckbox').addEventListener('change', e => {
    const gorunenler = personelleriGetir(document.getElementById('aramaKutusu').value, _arsivGorunumu);
    if (e.target.checked) gorunenler.forEach(p => _seciliPersonelIdleri.add(p.id));
    else gorunenler.forEach(p => _seciliPersonelIdleri.delete(p.id));
    tabloyuCiz(document.getElementById('aramaKutusu').value);
  });

  document.getElementById('topluSilBtn').addEventListener('click', async () => {
    const sayi = _seciliPersonelIdleri.size;
    if (!sayi) return;
    if (!(await onayModali(`Seçili ${sayi} personeli silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`, 'Sil'))) return;
    _seciliPersonelIdleri.forEach(id => personelSil(id));
    _seciliPersonelIdleri.clear();
    tabloyuCiz(document.getElementById('aramaKutusu').value);
  });

  document.getElementById('sablonIndirBtn').addEventListener('click', () => {
    excelSablonIndir(PERSONEL_EXCEL_KOLONLARI, 'personel_sablonu.xlsx');
  });
  document.getElementById('disaAktarBtn').addEventListener('click', () => {
    excelDisaAktar(personelleriGetir('', _arsivGorunumu), PERSONEL_EXCEL_KOLONLARI, 'personel_listesi.xlsx');
  });
  document.getElementById('iceAktarBtn').addEventListener('click', () => {
    document.getElementById('iceAktarDosya').click();
  });
  document.getElementById('iceAktarDosya').addEventListener('change', e => {
    const dosya = e.target.files[0];
    excelIceAktar(dosya, PERSONEL_EXCEL_KOLONLARI, (satirlar, hataMesaji) => {
      e.target.value = '';
      if (hataMesaji) { alert(hataMesaji); return; }
      satirlar.forEach(satir => {
        satir.iseGirisTarihi = excelTarihiNormallestir(satir.iseGirisTarihi);
        satir.istenCikisTarihi = excelTarihiNormallestir(satir.istenCikisTarihi);
        if (satir.kidemYil !== undefined) satir.kidemYil = String(satir.kidemYil).trim();
      });
      const sonuc = excelToplulIceAktarSonucOzetle(satirlar, personelEkle);
      alert(excelIceAktarOzetMesaji(sonuc));
      tabloyuCiz(document.getElementById('aramaKutusu').value);
    });
  });

  tabloyuCiz('');
}

function sekmeDegistir(arsivMi) {
  _arsivGorunumu = arsivMi;
  _seciliPersonelIdleri.clear();
  document.getElementById('sekmeAktif').classList.toggle('sekme-seciliDegil', arsivMi);
  document.getElementById('sekmeArsiv').classList.toggle('sekme-seciliDegil', !arsivMi);
  document.getElementById('yeniPersonelBtn').style.display = arsivMi ? 'none' : '';
  tabloyuCiz(document.getElementById('aramaKutusu').value);
}

function _topluSilDurumunuGuncelle(gorunenler) {
  const buton = document.getElementById('topluSilBtn');
  const sayi = _seciliPersonelIdleri.size;
  buton.style.display = sayi ? '' : 'none';
  buton.textContent = `Seçilenleri Sil (${sayi})`;

  const tumunuSec = document.getElementById('tumunuSecCheckbox');
  const gorunenSecili = gorunenler.length > 0 && gorunenler.every(p => _seciliPersonelIdleri.has(p.id));
  tumunuSec.checked = gorunenSecili;
  tumunuSec.indeterminate = !gorunenSecili && gorunenler.some(p => _seciliPersonelIdleri.has(p.id));
}

function sekmeSayilariniGuncelle() {
  const sayilar = personelSayilari();
  document.getElementById('sekmeAktif').textContent = `Aktif Personel (${sayilar.aktif})`;
  document.getElementById('sekmeArsiv').textContent = `İşten Ayrılanlar (${sayilar.arsiv})`;
}

function tabloyuCiz(aramaMetni) {
  sekmeSayilariniGuncelle();

  const govde = document.getElementById('tabloGovde');
  const bosDurum = document.getElementById('bosDurum');
  const cikisBaslik = document.getElementById('cikisBaslik');
  cikisBaslik.style.display = _arsivGorunumu ? '' : 'none';

  const personeller = personelleriGetir(aramaMetni, _arsivGorunumu);

  govde.innerHTML = '';

  if (personeller.length === 0) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = aramaMetni
      ? 'Aramanızla eşleşen personel bulunamadı.'
      : (_arsivGorunumu
        ? 'Henüz işten ayrılan personel yok.'
        : 'Henüz personel eklenmedi. "+ Yeni Personel" ile başlayın.');
    _topluSilDurumunuGuncelle([]);
    return;
  }
  bosDurum.classList.remove('gorunur');

  personeller.forEach(p => {
    const satir = document.createElement('tr');
    satir.innerHTML = `
      <td><input type="checkbox" class="satir-secim" data-secim="${p.id}" ${_seciliPersonelIdleri.has(p.id) ? 'checked' : ''}></td>
      <td>${_prsKacir(p.sicilNo)}</td>
      <td>${_prsKacir(p.adSoyad)}</td>
      <td>${_prsKacir(p.isveren) || '-'}</td>
      <td>${_prsKacir(p.bolum)}</td>
      <td>${_prsKacir(p.gorev)}</td>
      <td>${p.iseGirisTarihi || '-'}</td>
      ${_arsivGorunumu ? `<td>${p.istenCikisTarihi || '-'}</td>` : ''}
      <td>${_prsKacir(p.egitimSeviyesi) || '-'}</td>
      <td>${_prsKacir(p.okulu) || '-'}</td>
      <td>${_prsKacir(p.mv) || '-'}</td>
      <td>${_prsKacir(p.engelliMi) || 'HAYIR'}</td>
      <td>${_prsKacir(p.sendikaliMi) || 'HAYIR'}</td>
      <td>${_prsKacir(p.kapsami) || '-'}</td>
      <td>${p.kidemYil ?? '-'}</td>
      <td>${_prsKacir(p.lojman) || 'YOK'}</td>
      <td>
        <button class="tablo-buton" data-duzenle="${p.id}">Düzenle</button>
        <button class="tablo-buton sil" data-sil="${p.id}">Sil</button>
      </td>
    `;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-duzenle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = personelIdIleGetirRepo(btn.getAttribute('data-duzenle'));
      if (p) modalAc(p);
    });
  });

  govde.querySelectorAll('[data-sil]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-sil');
      const p = personelIdIleGetirRepo(id);
      if (await onayModali(`"${p.adSoyad}" adlı personeli silmek istediğinize emin misiniz?`, 'Sil')) {
        personelSil(id);
        _seciliPersonelIdleri.delete(id);
        tabloyuCiz(document.getElementById('aramaKutusu').value);
      }
    });
  });

  govde.querySelectorAll('[data-secim]').forEach(kutu => {
    kutu.addEventListener('change', () => {
      const id = kutu.getAttribute('data-secim');
      if (kutu.checked) _seciliPersonelIdleri.add(id);
      else _seciliPersonelIdleri.delete(id);
      _topluSilDurumunuGuncelle(personeller);
    });
  });

  _topluSilDurumunuGuncelle(personeller);
}

function pozisyonSecimleriniDoldur(seciliId) {
  const secim = document.getElementById('pozisyonId');
  const yollar = pozisyonYollariniGetir();

  secim.innerHTML = '<option value="">— Seçilmedi —</option>' +
    yollar.map(y => `<option value="${y.id}" ${y.id === seciliId ? 'selected' : ''}>${_prsKacir(y.yol)}</option>`).join('');
}

function modalAc(personel) {
  _duzenlenenPersonelId = personel ? personel.id : null;
  document.getElementById('modalBaslik').textContent = personel ? 'Personel Düzenle' : 'Yeni Personel';
  document.getElementById('sicilNo').value = personel ? personel.sicilNo : '';
  document.getElementById('adSoyad').value = personel ? personel.adSoyad : '';
  const firma = typeof aktifFirmaGetir === 'function' ? aktifFirmaGetir() : null;
  const isverenler = firma && Array.isArray(firma.isverenler) ? firma.isverenler : [];
  document.getElementById('isveren').innerHTML = '<option value="">— Seçilmedi —</option>' +
    isverenler.map(i => `<option ${personel && personel.isveren === i ? 'selected' : ''}>${_prsKacir(i)}</option>`).join('');
  document.getElementById('bolum').value = personel ? personel.bolum : '';
  document.getElementById('gorev').value = personel ? personel.gorev : '';
  pozisyonSecimleriniDoldur(personel ? personel.pozisyonId : '');
  document.getElementById('iseGirisTarihi').value = personel ? personel.iseGirisTarihi : '';
  document.getElementById('istenCikisTarihi').value = personel ? personel.istenCikisTarihi : '';

  document.getElementById('egitimSeviyesi').innerHTML = '<option value="">Seçiniz</option>' +
    PERSONEL_EGITIM_SEVIYELERI.map(s => `<option ${personel && personel.egitimSeviyesi === s ? 'selected' : ''}>${s}</option>`).join('');
  document.getElementById('okulu').value = personel ? personel.okulu : '';
  const mevcutEngelli = personel ? (personel.engelliMi || 'HAYIR') : 'HAYIR';
  document.getElementById('engelliMi').innerHTML = PERSONEL_EVET_HAYIR.map(v => `<option ${v === mevcutEngelli ? 'selected' : ''}>${v}</option>`).join('');
  const mevcutSendikali = personel ? (personel.sendikaliMi || 'HAYIR') : 'HAYIR';
  document.getElementById('sendikaliMi').innerHTML = PERSONEL_EVET_HAYIR.map(v => `<option ${v === mevcutSendikali ? 'selected' : ''}>${v}</option>`).join('');
  document.getElementById('mv').value = personel ? personel.mv : '';
  document.getElementById('kapsami').value = personel ? personel.kapsami : '';
  document.getElementById('kidemYil').value = personel && personel.kidemYil != null ? personel.kidemYil : '';
  const mevcutLojman = personel ? (personel.lojman || 'YOK') : 'YOK';
  document.getElementById('lojman').innerHTML = PERSONEL_LOJMAN_SECENEKLERI.map(v => `<option ${v === mevcutLojman ? 'selected' : ''}>${v}</option>`).join('');

  temizleFormHatalari();
  document.getElementById('modalKatman').classList.add('acik');
}

function modalKapat() {
  document.getElementById('modalKatman').classList.remove('acik');
  _duzenlenenPersonelId = null;
}

function temizleFormHatalari() {
  document.querySelectorAll('#personelForm .alan-hatasi').forEach(el => el.textContent = '');
}

function formGonderildi(e) {
  e.preventDefault();
  temizleFormHatalari();

  const veriler = {
    sicilNo: document.getElementById('sicilNo').value,
    adSoyad: document.getElementById('adSoyad').value,
    isveren: document.getElementById('isveren').value,
    bolum: document.getElementById('bolum').value,
    gorev: document.getElementById('gorev').value,
    pozisyonId: document.getElementById('pozisyonId').value,
    iseGirisTarihi: document.getElementById('iseGirisTarihi').value,
    istenCikisTarihi: document.getElementById('istenCikisTarihi').value,
    egitimSeviyesi: document.getElementById('egitimSeviyesi').value,
    okulu: document.getElementById('okulu').value,
    engelliMi: document.getElementById('engelliMi').value,
    sendikaliMi: document.getElementById('sendikaliMi').value,
    mv: document.getElementById('mv').value,
    kapsami: document.getElementById('kapsami').value,
    kidemYil: document.getElementById('kidemYil').value,
    lojman: document.getElementById('lojman').value
  };

  const sonuc = _duzenlenenPersonelId
    ? personelGuncelle(_duzenlenenPersonelId, veriler)
    : personelEkle(veriler);

  if (!sonuc.basarili) {
    Object.keys(sonuc.hatalar).forEach(alan => {
      const hataEl = document.getElementById(alan + 'Hata');
      if (hataEl) hataEl.textContent = sonuc.hatalar[alan];
    });
    return;
  }

  modalKapat();
  tabloyuCiz(document.getElementById('aramaKutusu').value);
}
