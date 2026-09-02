// Sınav Oluşturucu ekranının DOM işlemleri — Eğitim modülünün kendi sekmesi
// (bkz. sinav.js dosya başı notu). Üç iç sekme: Soru Bankası, Sınavlar,
// Sonuçlar. Ayrıca tek bir sınavın sonuçlarını görüp yeni sonuç eklemek için
// ayrı bir modal (sonucModal).

let _sinavSekme = 'sorular';
let _duzenlenenSoruId = null;
let _sonucModalSinavId = null;

const SINAV_DURUM_METIN = { gecti: 'Geçti', kaldi: 'Kaldı', bilinmiyor: 'Bilinmiyor' };
const SINAV_DURUM_SINIF = { gecti: 'durum-gecerli', kaldi: 'durum-gecmis', bilinmiyor: 'durum-kayit_yok' };

const SORU_EXCEL_KOLONLARI = [
  { anahtar: 'konu', baslik: 'Eğitim/Konu' },
  { anahtar: 'soruMetni', baslik: 'Soru Metni' },
  { anahtar: 'A', baslik: 'A Şıkkı' },
  { anahtar: 'B', baslik: 'B Şıkkı' },
  { anahtar: 'C', baslik: 'C Şıkkı' },
  { anahtar: 'D', baslik: 'D Şıkkı' },
  { anahtar: 'dogruCevap', baslik: 'Doğru Cevap (A/B/C/D)' }
];

const SINAV_EXCEL_KOLONLARI = [
  { anahtar: 'baslik', baslik: 'Başlık' },
  { anahtar: 'turAdi', baslik: 'Konu' },
  { anahtar: 'tarih', baslik: 'Tarih' },
  { anahtar: 'katilimciSayisi', baslik: 'Katılımcı' },
  { anahtar: 'gecenSayisi', baslik: 'Geçen' }
];

const SONUC_EXCEL_KOLONLARI = [
  { anahtar: 'personelAdi', baslik: 'Personel' },
  { anahtar: 'sinavBasligi', baslik: 'Sınav' },
  { anahtar: 'tarih', baslik: 'Tarih' },
  { anahtar: 'dogruSayisi', baslik: 'Doğru' },
  { anahtar: 'toplamSoru', baslik: 'Toplam Soru' },
  { anahtar: 'puan', baslik: 'Puan' },
  { anahtar: 'durum', baslik: 'Durum' }
];

function _soruIceAktarSatiriEkle(satir) {
  const tur = EGITIM_TURLERI.find(t => _basligiNormallestir(t.ad) === _basligiNormallestir(satir.konu));
  if (!tur) return { basarili: false, hatalar: { genel: `Eğitim/konu "${satir.konu}" tanınmadı.` } };

  return soruEkle({
    egitimTuruId: tur.id,
    soruMetni: satir.soruMetni,
    secenekler: { A: satir.A, B: satir.B, C: satir.C, D: satir.D },
    dogruCevap: String(satir.dogruCevap || '').trim().toUpperCase()
  });
}

function _sinavKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function _sinavKisalt(metin, uzunluk) {
  const m = String(metin || '');
  return m.length > uzunluk ? m.slice(0, uzunluk) + '…' : m;
}

function sinavSayfasiniBaslat() {
  document.getElementById('sekmeSorular').addEventListener('click', () => sinavSekmeDegistir('sorular'));
  document.getElementById('sekmeSinavlar').addEventListener('click', () => sinavSekmeDegistir('sinavlar'));
  document.getElementById('sekmeSonuclar').addEventListener('click', () => sinavSekmeDegistir('sonuclar'));

  document.getElementById('yeniSoruBtn').addEventListener('click', () => soruModalAc());
  document.getElementById('soruModalKapatBtn').addEventListener('click', soruModalKapat);
  document.getElementById('soruModalIptalBtn').addEventListener('click', soruModalKapat);
  document.getElementById('soruForm').addEventListener('submit', soruFormGonderildi);
  document.getElementById('soruKonuFiltre').addEventListener('change', soruTablosunuCiz);
  document.getElementById('soruAramaKutusu').addEventListener('input', soruTablosunuCiz);

  document.getElementById('yeniSinavBtn').addEventListener('click', () => sinavModalAc());
  document.getElementById('sinavModalKapatBtn').addEventListener('click', sinavModalKapat);
  document.getElementById('sinavModalIptalBtn').addEventListener('click', sinavModalKapat);
  document.getElementById('sinavForm').addEventListener('submit', sinavFormGonderildi);
  document.getElementById('sinavAramaKutusu').addEventListener('input', sinavTablosunuCiz);

  document.getElementById('sonucAramaKutusu').addEventListener('input', sonucTablosunuCiz);

  document.getElementById('sonucModalKapatBtn').addEventListener('click', sonucModalKapat);
  document.getElementById('sonucEkleForm').addEventListener('submit', sonucEkleFormGonderildi);

  document.getElementById('soruSablonIndirBtn').addEventListener('click', () => {
    excelSablonIndir(SORU_EXCEL_KOLONLARI, 'soru_bankasi_sablonu.xlsx');
  });
  document.getElementById('soruDisaAktarBtn').addEventListener('click', () => {
    const satirlar = sorulariGetir(document.getElementById('soruKonuFiltre').value, '').map(s => ({
      konu: s.turAdi, soruMetni: s.soruMetni,
      A: s.secenekler.A, B: s.secenekler.B, C: s.secenekler.C, D: s.secenekler.D,
      dogruCevap: s.dogruCevap
    }));
    excelDisaAktar(satirlar, SORU_EXCEL_KOLONLARI, 'soru_bankasi.xlsx');
  });
  document.getElementById('soruIceAktarBtn').addEventListener('click', () => document.getElementById('soruIceAktarDosya').click());
  document.getElementById('soruIceAktarDosya').addEventListener('change', e => {
    const dosya = e.target.files[0];
    excelIceAktar(dosya, SORU_EXCEL_KOLONLARI, (satirlar, hataMesaji) => {
      e.target.value = '';
      if (hataMesaji) { alert(hataMesaji); return; }
      const sonuc = excelToplulIceAktarSonucOzetle(satirlar, _soruIceAktarSatiriEkle);
      alert(excelIceAktarOzetMesaji(sonuc));
      soruTablosunuCiz();
      _konuSecimleriniDoldur('soruKonuFiltre', true);
      _konuSecimleriniDoldur('sinavKonuId', false);
    });
  });

  document.getElementById('sinavDisaAktarBtn').addEventListener('click', () => {
    excelDisaAktar(sinavlariGetir(document.getElementById('sinavAramaKutusu').value), SINAV_EXCEL_KOLONLARI, 'sinavlar.xlsx');
  });

  document.getElementById('sonucDisaAktarBtn').addEventListener('click', () => {
    excelDisaAktar(tumSonuclariGetir(document.getElementById('sonucAramaKutusu').value), SONUC_EXCEL_KOLONLARI, 'sinav_sonuclari.xlsx');
  });

  _konuSecimleriniDoldur('soruKonuFiltre', true);
  _konuSecimleriniDoldur('soruKonuId', false);
  _konuSecimleriniDoldur('sinavKonuId', false);

  sinavSekmeDegistir('sorular');
}

function _konuSecimleriniDoldur(selectId, hepsiSecenegiEkle) {
  const secim = document.getElementById(selectId);
  const konuSayilari = soruBankasiKonuSayilari();
  const secenekler = EGITIM_TURLERI.map(t => {
    const sayi = konuSayilari[t.id] || 0;
    return `<option value="${t.id}">${_sinavKacir(t.ad)} (${sayi} soru)</option>`;
  }).join('');
  secim.innerHTML = (hepsiSecenegiEkle ? '<option value="">Tüm Konular</option>' : '') + secenekler;
}

function sinavSekmeDegistir(sekme) {
  _sinavSekme = sekme;
  document.getElementById('sekmeSorular').classList.toggle('sekme-seciliDegil', sekme !== 'sorular');
  document.getElementById('sekmeSinavlar').classList.toggle('sekme-seciliDegil', sekme !== 'sinavlar');
  document.getElementById('sekmeSonuclar').classList.toggle('sekme-seciliDegil', sekme !== 'sonuclar');
  document.getElementById('panelSorular').style.display = sekme === 'sorular' ? '' : 'none';
  document.getElementById('panelSinavlar').style.display = sekme === 'sinavlar' ? '' : 'none';
  document.getElementById('panelSonuclar').style.display = sekme === 'sonuclar' ? '' : 'none';

  if (sekme === 'sorular') soruTablosunuCiz();
  if (sekme === 'sinavlar') sinavTablosunuCiz();
  if (sekme === 'sonuclar') sonucTablosunuCiz();
}

function _sinavFormHatalariniTemizle(formId) {
  document.querySelectorAll('#' + formId + ' .alan-hatasi').forEach(el => el.textContent = '');
}

// ---- Soru Bankası ----

function soruTablosunuCiz() {
  const govde = document.getElementById('soruTabloGovde');
  const bosDurum = document.getElementById('soruBosDurum');
  const konuId = document.getElementById('soruKonuFiltre').value;
  const aramaMetni = document.getElementById('soruAramaKutusu').value;
  const liste = sorulariGetir(konuId, aramaMetni);

  govde.innerHTML = '';

  if (liste.length === 0) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = aramaMetni || konuId
      ? 'Aramanızla eşleşen soru bulunamadı.'
      : 'Henüz soru bankasına soru eklenmedi.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  liste.forEach(s => {
    const satir = document.createElement('tr');
    satir.innerHTML = `
      <td>${_sinavKacir(_sinavKisalt(s.soruMetni, 90))}</td>
      <td>${_sinavKacir(s.turAdi)}</td>
      <td>${_sinavKacir(s.dogruCevap)}) ${_sinavKacir(_sinavKisalt(s.secenekler[s.dogruCevap], 40))}</td>
      <td>
        <button class="tablo-buton" data-duzenle="${s.id}">Düzenle</button>
        <button class="tablo-buton sil" data-sil="${s.id}">Sil</button>
      </td>
    `;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-duzenle]').forEach(btn => {
    btn.addEventListener('click', () => soruModalAc(btn.getAttribute('data-duzenle')));
  });
  govde.querySelectorAll('[data-sil]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (await onayModali('Bu soruyu silmek istediğinize emin misiniz? (Bu soruyu kullanan geçmiş sınavlar etkilenmez.)', 'Sil')) {
        soruSil(btn.getAttribute('data-sil'));
        soruTablosunuCiz();
        _konuSecimleriniDoldur('soruKonuFiltre', true);
      }
    });
  });
}

function soruModalAc(soruId) {
  _duzenlenenSoruId = soruId || null;
  _konuSecimleriniDoldur('soruKonuId', false);
  _sinavFormHatalariniTemizle('soruForm');

  if (_duzenlenenSoruId) {
    const soru = soruIdIleGetirRepo(_duzenlenenSoruId);
    document.getElementById('soruModalBaslik').textContent = 'Soruyu Düzenle';
    document.getElementById('soruKonuId').value = soru.egitimTuruId;
    document.getElementById('soruMetni').value = soru.soruMetni;
    document.getElementById('secenekA').value = soru.secenekler.A;
    document.getElementById('secenekB').value = soru.secenekler.B;
    document.getElementById('secenekC').value = soru.secenekler.C;
    document.getElementById('secenekD').value = soru.secenekler.D;
    document.getElementById('dogruCevap').value = soru.dogruCevap;
  } else {
    document.getElementById('soruModalBaslik').textContent = 'Yeni Soru';
    document.getElementById('soruForm').reset();
  }

  document.getElementById('soruModalKatman').classList.add('acik');
}

function soruModalKapat() {
  document.getElementById('soruModalKatman').classList.remove('acik');
}

function soruFormGonderildi(e) {
  e.preventDefault();
  _sinavFormHatalariniTemizle('soruForm');

  const veriler = {
    egitimTuruId: document.getElementById('soruKonuId').value,
    soruMetni: document.getElementById('soruMetni').value,
    secenekler: {
      A: document.getElementById('secenekA').value,
      B: document.getElementById('secenekB').value,
      C: document.getElementById('secenekC').value,
      D: document.getElementById('secenekD').value
    },
    dogruCevap: document.getElementById('dogruCevap').value
  };

  const sonuc = _duzenlenenSoruId ? soruGuncelle(_duzenlenenSoruId, veriler) : soruEkle(veriler);

  if (!sonuc.basarili) {
    Object.keys(sonuc.hatalar).forEach(alan => {
      const hataEl = document.getElementById(alan + 'Hata');
      if (hataEl) hataEl.textContent = sonuc.hatalar[alan];
    });
    return;
  }

  soruModalKapat();
  soruTablosunuCiz();
  _konuSecimleriniDoldur('soruKonuFiltre', true);
  _konuSecimleriniDoldur('sinavKonuId', false);
}

// ---- Sınavlar ----

function sinavTablosunuCiz() {
  const govde = document.getElementById('sinavTabloGovde');
  const bosDurum = document.getElementById('sinavBosDurum');
  const aramaMetni = document.getElementById('sinavAramaKutusu').value;
  const liste = sinavlariGetir(aramaMetni);

  govde.innerHTML = '';

  if (liste.length === 0) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = aramaMetni ? 'Aramanızla eşleşen sınav bulunamadı.' : 'Henüz sınav oluşturulmadı.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  liste.forEach(s => {
    const satir = document.createElement('tr');
    satir.innerHTML = `
      <td>${_sinavKacir(s.baslik)}</td>
      <td>${_sinavKacir(s.turAdi)}</td>
      <td>${_sinavKacir(s.tarih)}</td>
      <td>${s.sorular.length}</td>
      <td>${s.katilimciSayisi} (${s.gecenSayisi} geçti)</td>
      <td>
        <button class="tablo-buton" data-kagit="${s.id}">Sınav Kağıdı</button>
        <button class="tablo-buton" data-cevap="${s.id}">Cevap Anahtarı</button>
        <button class="tablo-buton" data-sonuc="${s.id}">Sonuçlar</button>
        <button class="tablo-buton sil" data-sil="${s.id}">Sil</button>
      </td>
    `;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-kagit]').forEach(btn => {
    btn.addEventListener('click', () => sinavKagidiYazdir(btn.getAttribute('data-kagit')));
  });
  govde.querySelectorAll('[data-cevap]').forEach(btn => {
    btn.addEventListener('click', () => cevapAnahtariYazdir(btn.getAttribute('data-cevap')));
  });
  govde.querySelectorAll('[data-sonuc]').forEach(btn => {
    btn.addEventListener('click', () => sonucModalAc(btn.getAttribute('data-sonuc')));
  });
  govde.querySelectorAll('[data-sil]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (await onayModali('Bu sınavı silmek istediğinize emin misiniz? Bu sınava ait tüm sonuçlar da silinecek.', 'Sil')) {
        sinavSil(btn.getAttribute('data-sil'));
        sinavTablosunuCiz();
      }
    });
  });
}

function sinavModalAc() {
  _sinavFormHatalariniTemizle('sinavForm');
  _konuSecimleriniDoldur('sinavKonuId', false);
  document.getElementById('sinavForm').reset();
  document.getElementById('sinavGecmeNotu').value = SINAV_GECME_NOTU_VARSAYILAN;
  document.getElementById('sinavModalKatman').classList.add('acik');
}

function sinavModalKapat() {
  document.getElementById('sinavModalKatman').classList.remove('acik');
}

function sinavFormGonderildi(e) {
  e.preventDefault();
  _sinavFormHatalariniTemizle('sinavForm');

  const veriler = {
    baslik: document.getElementById('sinavBaslik').value,
    egitimTuruId: document.getElementById('sinavKonuId').value,
    tarih: document.getElementById('sinavTarih').value,
    soruSayisi: document.getElementById('sinavSoruSayisi').value,
    gecmeNotu: document.getElementById('sinavGecmeNotu').value
  };

  const sonuc = sinavEkle(veriler);

  if (!sonuc.basarili) {
    Object.keys(sonuc.hatalar).forEach(alan => {
      const hataEl = document.getElementById(alan + 'Hata');
      if (hataEl) hataEl.textContent = sonuc.hatalar[alan];
    });
    return;
  }

  sinavModalKapat();
  sinavTablosunuCiz();
}

// ---- Sonuçlar (genel) ----

function sonucTablosunuCiz() {
  const govde = document.getElementById('sonucTabloGovde');
  const bosDurum = document.getElementById('sonucBosDurum');
  const aramaMetni = document.getElementById('sonucAramaKutusu').value;
  const liste = tumSonuclariGetir(aramaMetni);

  govde.innerHTML = '';

  if (liste.length === 0) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = aramaMetni ? 'Aramanızla eşleşen sonuç bulunamadı.' : 'Henüz sınav sonucu girilmedi.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  liste.forEach(r => {
    const satir = document.createElement('tr');
    satir.innerHTML = `
      <td>${_sinavKacir(r.personelAdi)}</td>
      <td>${_sinavKacir(r.sinavBasligi)}</td>
      <td>${_sinavKacir(r.tarih)}</td>
      <td>${r.dogruSayisi} / ${r.toplamSoru}</td>
      <td>${r.puan}</td>
      <td><span class="durum-rozet ${SINAV_DURUM_SINIF[r.durum]}">${SINAV_DURUM_METIN[r.durum]}</span></td>
      <td><button class="tablo-buton sil" data-sil="${r.id}">Sil</button></td>
    `;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-sil]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (await onayModali('Bu sonucu silmek istediğinize emin misiniz?', 'Sil')) {
        sinavSonucSil(btn.getAttribute('data-sil'));
        sonucTablosunuCiz();
        sinavTablosunuCiz();
      }
    });
  });
}

// ---- Sonuç Modal (tek sınavın sonuçları + yeni sonuç girişi) ----

function sonucModalAc(sinavId) {
  _sonucModalSinavId = sinavId;
  const sinav = sinavGetir(sinavId);
  if (!sinav) return;

  _sinavFormHatalariniTemizle('sonucEkleForm');
  document.getElementById('sonucModalBaslik').textContent = `Sonuçlar — ${sinav.baslik}`;

  const personelSecim = document.getElementById('sonucPersonelId');
  personelSecim.innerHTML = personelleriGetir('', false)
    .map(p => `<option value="${p.id}">${_sinavKacir(p.adSoyad)} (${_sinavKacir(p.sicilNo)})</option>`)
    .join('');

  document.getElementById('sonucPuan').value = '';
  document.getElementById('sonucTarih').value = sinav.tarih;

  sonucModalTablosunuCiz();
  document.getElementById('sonucModalKatman').classList.add('acik');
}

function sonucModalKapat() {
  document.getElementById('sonucModalKatman').classList.remove('acik');
  _sonucModalSinavId = null;
}

function sonucModalTablosunuCiz() {
  const govde = document.getElementById('sonucModalTabloGovde');
  const bosDurum = document.getElementById('sonucModalBosDurum');
  const liste = sinavSonuclariniGetir(_sonucModalSinavId);

  govde.innerHTML = '';

  if (liste.length === 0) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = 'Bu sınav için henüz sonuç girilmedi.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  liste.forEach(r => {
    const satir = document.createElement('tr');
    satir.innerHTML = `
      <td>${_sinavKacir(r.personelAdi)}</td>
      <td>${r.dogruSayisi} / ${r.toplamSoru}</td>
      <td>${r.puan}</td>
      <td><span class="durum-rozet ${SINAV_DURUM_SINIF[r.durum]}">${SINAV_DURUM_METIN[r.durum]}</span></td>
      <td><button class="tablo-buton sil" data-sil="${r.id}">Sil</button></td>
    `;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-sil]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (await onayModali('Bu sonucu silmek istediğinize emin misiniz?', 'Sil')) {
        sinavSonucSil(btn.getAttribute('data-sil'));
        sonucModalTablosunuCiz();
        sinavTablosunuCiz();
      }
    });
  });
}

function sonucEkleFormGonderildi(e) {
  e.preventDefault();
  _sinavFormHatalariniTemizle('sonucEkleForm');

  const veriler = {
    personelId: document.getElementById('sonucPersonelId').value,
    puan: document.getElementById('sonucPuan').value,
    tarih: document.getElementById('sonucTarih').value
  };

  const sonuc = sinavSonucuKaydet(_sonucModalSinavId, veriler);

  if (!sonuc.basarili) {
    Object.keys(sonuc.hatalar).forEach(alan => {
      const hataEl = document.getElementById(alan + 'Hata');
      if (hataEl) hataEl.textContent = sonuc.hatalar[alan];
    });
    return;
  }

  document.getElementById('sonucPuan').value = '';
  sonucModalTablosunuCiz();
  sinavTablosunuCiz();
}

// ---- Yazdırma: boş sınav kağıdı ve cevap anahtarı ----

function _sinavSorularHtmlUret(sinav, cevapGoster) {
  return sinav.sorular.map((soru, i) => `
    <div style="margin-bottom:14px; break-inside:avoid;">
      <div style="font-weight:700; margin-bottom:4px;">${i + 1}. ${_sinavKacir(soru.soruMetni)}</div>
      ${SINAV_SIK_HARFLERI.map(harf => {
        const vurgula = cevapGoster && harf === soru.dogruCevap;
        return `<div style="margin-left:16px; ${vurgula ? 'font-weight:700; color:#15803d;' : ''}">
          ${vurgula ? '✔' : '☐'} ${harf}) ${_sinavKacir(soru.secenekler[harf])}
        </div>`;
      }).join('')}
    </div>
  `).join('');
}

function _sinavKagidiYazdirOrtak(sinavId, baslikOnEki, cevapGoster) {
  const sinav = sinavGetir(sinavId);
  if (!sinav) return;

  const firma = aktifFirmaGetir();
  const mount = document.getElementById('yazdirmaAlani');
  mount.innerHTML = `
    <div class="doc-title">${_sinavKacir(baslikOnEki)}: ${_sinavKacir(sinav.baslik)}</div>
    <div class="doc-meta">
      <b>${_sinavKacir(firma ? firma.ad : '')}</b><br>
      Konu: ${_sinavKacir(sinav.turAdi)} &nbsp; | &nbsp; Tarih: ${_sinavKacir(sinav.tarih)} &nbsp; | &nbsp; Geçme Notu: ${sinav.gecmeNotu}
      ${cevapGoster ? '' : '<br><br>Ad Soyad: ______________________________ &nbsp;&nbsp; Sicil No: ______________'}
    </div>
    ${_sinavSorularHtmlUret(sinav, cevapGoster)}
  `;
  mount.style.display = 'block';
  setTimeout(() => {
    window.print();
    setTimeout(() => { mount.innerHTML = ''; mount.style.display = 'none'; }, 400);
  }, 80);
}

function sinavKagidiYazdir(sinavId) {
  _sinavKagidiYazdirOrtak(sinavId, 'SINAV KAĞIDI', false);
}

function cevapAnahtariYazdir(sinavId) {
  _sinavKagidiYazdirOrtak(sinavId, 'CEVAP ANAHTARI', true);
}
