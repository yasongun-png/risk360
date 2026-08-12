// Saha Denetim ekranının DOM işlemleri.
// Liste + "Yeni Denetim" modalı + tek bir denetimin kontrol listesini doldurmak
// için ayrı bir detay modalı + bulguyu Uygunsuzluk/DÖF'e aktarma için mini modal.

let _denetimAktifFirma = null;
let _detayModalDenetimId = null;
let _aktarBaglam = null;

function kacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function temizleFormHatalari(formId) {
  document.querySelectorAll('#' + formId + ' .alan-hatasi').forEach(el => el.textContent = '');
}

const DENETIM_EXCEL_KOLONLARI = [
  { anahtar: 'denetimNo', baslik: 'Denetim No' },
  { anahtar: 'denetimTuru', baslik: 'Konu' },
  { anahtar: 'tarih', baslik: 'Tarih' },
  { anahtar: 'bolum', baslik: 'Bölüm' },
  { anahtar: 'denetci', baslik: 'Denetçi' },
  { anahtar: 'puan', baslik: 'Puan' },
  { anahtar: 'uygunsuzMaddeSayisi', baslik: 'Uygunsuz Madde' },
  { anahtar: 'durumMetni', baslik: 'Durum' }
];

function sahaDenetimSayfasiniBaslat(firma) {
  _denetimAktifFirma = firma;

  document.getElementById('yeniDenetimBtn').addEventListener('click', yeniDenetimModalAc);
  document.getElementById('yeniDenetimModalIptalBtn').addEventListener('click', yeniDenetimModalKapat);
  document.getElementById('yeniDenetimModalKapatBtn').addEventListener('click', yeniDenetimModalKapat);
  document.getElementById('yeniDenetimForm').addEventListener('submit', yeniDenetimFormGonderildi);

  document.getElementById('denetimAramaKutusu').addEventListener('input', denetimTablosunuCiz);
  document.getElementById('denetimTuruFiltre').addEventListener('change', denetimTablosunuCiz);
  document.getElementById('denetimDurumFiltre').addEventListener('change', denetimTablosunuCiz);

  document.getElementById('denetimDetayModalKapatBtn').addEventListener('click', denetimDetayModalKapat);
  document.getElementById('denetimDetayTamamlaBtn').addEventListener('click', denetimTamamlaTiklandi);
  document.getElementById('denetimDetayYazdirBtn').addEventListener('click', () => {
    if (_detayModalDenetimId) denetimYazdir(_detayModalDenetimId);
  });
  document.getElementById('denetimDetayNotlar').addEventListener('change', denetimNotDegisti);
  document.getElementById('denetimDetayListe').addEventListener('change', denetimDetayListeDegisti);
  document.getElementById('denetimDetayListe').addEventListener('click', denetimDetayListeTiklandi);

  document.getElementById('aktarForm').addEventListener('submit', aktarFormGonderildi);
  document.getElementById('aktarModalIptalBtn').addEventListener('click', aktarModalKapat);
  document.getElementById('aktarModalKapatBtn').addEventListener('click', aktarModalKapat);

  document.getElementById('denetimDisaAktarBtn').addEventListener('click', () => {
    const filtreler = { denetimTuru: document.getElementById('denetimTuruFiltre').value, tamamlandiMi: document.getElementById('denetimDurumFiltre').value };
    excelDisaAktar(denetimleriGetir(document.getElementById('denetimAramaKutusu').value, filtreler), DENETIM_EXCEL_KOLONLARI, 'saha_denetimleri.xlsx');
  });
  document.getElementById('denetimListeYazdirBtn').addEventListener('click', () => {
    const filtreler = { denetimTuru: document.getElementById('denetimTuruFiltre').value, tamamlandiMi: document.getElementById('denetimDurumFiltre').value };
    raporListesiYazdir('Saha Denetim Listesi', _denetimAktifFirma ? _denetimAktifFirma.ad : '', DENETIM_EXCEL_KOLONLARI, denetimleriGetir(document.getElementById('denetimAramaKutusu').value, filtreler));
  });

  _denetimTuruSecimleriniDoldur('denetimTuruFiltre', true);
  _denetimTuruSecimleriniDoldur('yeniDenetimTuru', false);
  document.getElementById('aktarRiskSeviyesi').innerHTML = RISK_SEVIYELERI.map(r => `<option>${kacir(r)}</option>`).join('');

  denetimTablosunuCiz();
}

function _denetimTuruSecimleriniDoldur(selectId, hepsiSecenegiEkle) {
  const secim = document.getElementById(selectId);
  const secenekler = DENETIM_TURLERI.map(t => `<option value="${kacir(t)}">${kacir(t)}</option>`).join('');
  secim.innerHTML = (hepsiSecenegiEkle ? '<option value="">Tüm Türler</option>' : '') + secenekler;
}

// ---- Denetim listesi ----

function denetimTablosunuCiz() {
  const govde = document.getElementById('denetimTabloGovde');
  const bosDurum = document.getElementById('denetimBosDurum');
  const aramaMetni = document.getElementById('denetimAramaKutusu').value;
  const filtreler = {
    denetimTuru: document.getElementById('denetimTuruFiltre').value,
    tamamlandiMi: document.getElementById('denetimDurumFiltre').value
  };
  const liste = denetimleriGetir(aramaMetni, filtreler);

  govde.innerHTML = '';

  if (liste.length === 0) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = (aramaMetni || filtreler.denetimTuru || filtreler.tamamlandiMi)
      ? 'Aramanızla eşleşen denetim bulunamadı.'
      : 'Henüz saha denetimi oluşturulmadı.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  liste.forEach(d => {
    const satir = document.createElement('tr');
    const puanGoster = d.puan == null ? '-' : d.puan + ' / 100';
    satir.innerHTML = `
      <td>${kacir(d.denetimNo)}</td>
      <td>${kacir(d.denetimTuru)}</td>
      <td>${kacir(d.tarih)}</td>
      <td>${kacir(d.bolum)}</td>
      <td>${kacir(d.denetci)}</td>
      <td>${puanGoster}</td>
      <td><span class="genel-rozet ${d.tamamlandiMi ? 'rozet-tamamlandi' : 'rozet-devam-ediyor'}">${d.durumMetni}</span></td>
      <td>
        <button class="tablo-buton" data-doldur="${d.id}">${d.tamamlandiMi ? 'Görüntüle' : 'Doldur'}</button>
        <button class="tablo-buton" data-yazdir="${d.id}">Yazdır</button>
        <button class="tablo-buton sil" data-sil="${d.id}">Sil</button>
      </td>
    `;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-doldur]').forEach(btn => {
    btn.addEventListener('click', () => denetimDetayModalAc(btn.getAttribute('data-doldur')));
  });
  govde.querySelectorAll('[data-yazdir]').forEach(btn => {
    btn.addEventListener('click', () => denetimYazdir(btn.getAttribute('data-yazdir')));
  });
  govde.querySelectorAll('[data-sil]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Bu denetimi silmek istediğinize emin misiniz?')) {
        denetimSil(btn.getAttribute('data-sil'));
        denetimTablosunuCiz();
      }
    });
  });
}

// ---- Yeni Denetim ----

function yeniDenetimModalAc() {
  temizleFormHatalari('yeniDenetimForm');
  document.getElementById('yeniDenetimForm').reset();
  document.getElementById('yeniDenetimModalKatman').classList.add('acik');
}

function yeniDenetimModalKapat() {
  document.getElementById('yeniDenetimModalKatman').classList.remove('acik');
}

function yeniDenetimFormGonderildi(e) {
  e.preventDefault();
  temizleFormHatalari('yeniDenetimForm');

  const veriler = {
    denetimTuru: document.getElementById('yeniDenetimTuru').value,
    tarih: document.getElementById('yeniDenetimTarih').value,
    denetci: document.getElementById('yeniDenetimDenetci').value,
    bolum: document.getElementById('yeniDenetimBolum').value,
    lokasyon: document.getElementById('yeniDenetimLokasyon').value
  };

  const sonuc = denetimBaslat(veriler);

  if (!sonuc.basarili) {
    Object.keys(sonuc.hatalar).forEach(alan => {
      const hataEl = document.getElementById(alan + 'Hata');
      if (hataEl) hataEl.textContent = sonuc.hatalar[alan];
    });
    return;
  }

  yeniDenetimModalKapat();
  denetimTablosunuCiz();
  denetimDetayModalAc(sonuc.denetim.id);
}

// ---- Denetim Detayı (kontrol listesini doldurma) ----

function denetimDetayModalAc(id) {
  _detayModalDenetimId = id;
  denetimDetayCiz();
  document.getElementById('denetimDetayModalKatman').classList.add('acik');
}

function denetimDetayModalKapat() {
  document.getElementById('denetimDetayModalKatman').classList.remove('acik');
  _detayModalDenetimId = null;
  denetimTablosunuCiz();
}

function denetimDetayCiz() {
  const denetim = denetimGetir(_detayModalDenetimId);
  if (!denetim) return;

  document.getElementById('denetimDetayBaslik').textContent = `${denetim.denetimNo} — ${denetim.denetimTuru}`;
  document.getElementById('denetimDetayMeta').innerHTML = `
    <b>${kacir(_denetimAktifFirma ? _denetimAktifFirma.ad : '')}</b><br>
    Tarih: ${kacir(denetim.tarih)} &nbsp;|&nbsp; Denetçi: ${kacir(denetim.denetci)}<br>
    Bölüm: ${kacir(denetim.bolum)}${denetim.lokasyon ? ' &nbsp;|&nbsp; Lokasyon: ' + kacir(denetim.lokasyon) : ''}
  `;

  const puanEl = document.getElementById('denetimDetayPuan');
  if (denetim.puan == null) {
    puanEl.innerHTML = '<span class="genel-rozet rozet-pasif">Henüz puanlanmadı</span>';
  } else {
    const sinif = denetim.puan >= 90 ? 'rozet-uygun' : denetim.puan >= 70 ? 'rozet-orta' : 'rozet-yuksek';
    puanEl.innerHTML = `<span class="genel-rozet ${sinif}">${denetim.puan} / 100</span>`;
  }

  const satirlar = denetim.kontrolListesi.map((m, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${kacir(m.madde)}</td>
      <td>
        <select data-sonuc-index="${i}">
          <option value="" ${m.sonuc === '' ? 'selected' : ''}>Seçiniz</option>
          <option value="Uygun" ${m.sonuc === 'Uygun' ? 'selected' : ''}>Uygun</option>
          <option value="Uygun Değil" ${m.sonuc === 'Uygun Değil' ? 'selected' : ''}>Uygun Değil</option>
          <option value="Uygulanamaz" ${m.sonuc === 'Uygulanamaz' ? 'selected' : ''}>Uygulanamaz</option>
        </select>
      </td>
      <td><input type="text" data-not-index="${i}" value="${kacir(m.not)}" placeholder="Not (opsiyonel)"></td>
      <td>
        ${m.sonuc === 'Uygun Değil'
          ? (m.aktarildiId
              ? '<span class="genel-rozet rozet-tamamlandi">✔ Aktarıldı</span>'
              : `<button type="button" class="tablo-buton" data-aktar-index="${i}">Uygunsuzluğa Aktar</button>`)
          : ''}
      </td>
    </tr>
  `).join('');

  document.getElementById('denetimDetayListe').innerHTML = `
    <div class="tablo-scroll">
      <table class="veri-tablosu">
        <thead><tr><th>#</th><th>Kontrol Maddesi</th><th>Sonuç</th><th>Not</th><th>İşlem</th></tr></thead>
        <tbody>${satirlar}</tbody>
      </table>
    </div>
  `;

  document.getElementById('denetimDetayNotlar').value = denetim.notlar || '';

  const tamamlaBtn = document.getElementById('denetimDetayTamamlaBtn');
  tamamlaBtn.textContent = denetim.tamamlandiMi ? '✓ Tamamlandı' : 'Denetimi Tamamla';
  tamamlaBtn.disabled = denetim.tamamlandiMi;
}

function denetimDetayListeDegisti(e) {
  if (!_detayModalDenetimId) return;

  const sonucIndex = e.target.getAttribute('data-sonuc-index');
  const notIndex = e.target.getAttribute('data-not-index');

  if (sonucIndex !== null) {
    denetimMaddeGuncelle(_detayModalDenetimId, Number(sonucIndex), { sonuc: e.target.value });
    denetimDetayCiz();
  } else if (notIndex !== null) {
    denetimMaddeGuncelle(_detayModalDenetimId, Number(notIndex), { not: e.target.value });
  }
}

function denetimDetayListeTiklandi(e) {
  const aktarIndex = e.target.getAttribute('data-aktar-index');
  if (aktarIndex !== null && _detayModalDenetimId) {
    aktarModalAc(_detayModalDenetimId, Number(aktarIndex));
  }
}

function denetimNotDegisti() {
  if (!_detayModalDenetimId) return;
  denetimNotGuncelle(_detayModalDenetimId, document.getElementById('denetimDetayNotlar').value);
}

function denetimTamamlaTiklandi() {
  if (!_detayModalDenetimId) return;
  if (confirm('Bu denetimi tamamlandı olarak işaretlemek istediğinize emin misiniz?')) {
    denetimTamamla(_detayModalDenetimId);
    denetimDetayCiz();
  }
}

// ---- Bulguyu Uygunsuzluğa Aktar (mini modal) ----

function aktarModalAc(denetimId, maddeIndex) {
  const denetim = denetimGetir(denetimId);
  const madde = denetim ? denetim.kontrolListesi[maddeIndex] : null;
  if (!madde) return;

  _aktarBaglam = { denetimId, maddeIndex };
  temizleFormHatalari('aktarForm');
  document.getElementById('aktarModalBaslik').textContent = 'Uygunsuzluğa Aktar: ' + madde.madde;
  document.getElementById('aktarForm').reset();
  document.getElementById('aktarModalKatman').classList.add('acik');
}

function aktarModalKapat() {
  document.getElementById('aktarModalKatman').classList.remove('acik');
  _aktarBaglam = null;
}

function aktarFormGonderildi(e) {
  e.preventDefault();
  temizleFormHatalari('aktarForm');
  if (!_aktarBaglam) return;

  const veriler = {
    sorumlu: document.getElementById('aktarSorumlu').value,
    termin: document.getElementById('aktarTermin').value,
    riskSeviyesi: document.getElementById('aktarRiskSeviyesi').value
  };

  const sonuc = denetimBulgusunuUygunsuzlugaAktar(_aktarBaglam.denetimId, _aktarBaglam.maddeIndex, veriler);

  if (!sonuc.basarili) {
    const hatalar = sonuc.hatalar || {};
    if (hatalar.sorumlu) document.getElementById('aktarSorumluHata').textContent = hatalar.sorumlu;
    if (hatalar.termin) document.getElementById('aktarTerminHata').textContent = hatalar.termin;
    if (hatalar.genel) alert(hatalar.genel);
    return;
  }

  aktarModalKapat();
  denetimDetayCiz();
}

// ---- Yazdırma ----

function denetimYazdir(id) {
  const denetim = denetimGetir(id);
  if (!denetim) return;

  const satirlar = denetim.kontrolListesi.map((m, i) => `
    <tr><td>${i + 1}</td><td>${kacir(m.madde)}</td><td>${kacir(m.sonuc || '-')}</td><td>${kacir(m.not || '-')}</td></tr>
  `).join('');

  const mount = document.getElementById('yazdirmaAlani');
  mount.innerHTML = `
    <div class="doc-title">SAHA DENETİM RAPORU: ${kacir(denetim.denetimNo)}</div>
    <div class="doc-meta">
      <b>${kacir(_denetimAktifFirma ? _denetimAktifFirma.ad : '')}</b><br>
      Konu: ${kacir(denetim.denetimTuru)} &nbsp;|&nbsp; Tarih: ${kacir(denetim.tarih)} &nbsp;|&nbsp; Denetçi: ${kacir(denetim.denetci)}<br>
      Bölüm: ${kacir(denetim.bolum)}${denetim.lokasyon ? ' &nbsp;|&nbsp; Lokasyon: ' + kacir(denetim.lokasyon) : ''}<br>
      Puan: ${denetim.puan == null ? '-' : denetim.puan + ' / 100'} &nbsp;|&nbsp; Durum: ${kacir(denetim.durumMetni)}
    </div>
    <table><tr><th>#</th><th>Kontrol Maddesi</th><th>Sonuç</th><th>Not</th></tr>${satirlar}</table>
    ${denetim.notlar ? `<p style="margin-top:10px;"><b>Genel Notlar:</b> ${kacir(denetim.notlar)}</p>` : ''}
  `;
  mount.style.display = 'block';
  setTimeout(() => {
    window.print();
    setTimeout(() => { mount.innerHTML = ''; mount.style.display = 'none'; }, 400);
  }, 80);
}
