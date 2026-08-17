// Yıllık Değerlendirme ve Planlama ekranının DOM işlemleri.

let _aktifSekme = 'egitim';
let _yilPlanFirma = null;

// İçe aktarma sütun tanımları — modülün kendi "Excel" (data-export) çıktısıyla
// aynı başlıkları kullanır, böylece daha önce dışa aktarılmış bir dosya
// (veya eski sistemden gelen aynı formattaki bir dosya) doğrudan geri
// yüklenebilir. Ay sütunları "months.<Ay>" noktalı anahtarla eşleşir,
// _duzSatiriAyHaritasinaCevir bunu gerçek months haritasına çevirir.
const YILLIK_EGITIM_IMPORT_KOLONLARI = [
  { anahtar: 'topic', baslik: 'Eğitim Konusu' },
  ...AYLAR.map(ay => ({ anahtar: 'months.' + ay, baslik: ay })),
  { anahtar: 'target', baslik: 'Hedef Grup' },
  { anahtar: 'duration', baslik: 'Süre' },
  { anahtar: 'trainer', baslik: 'Eğitici' },
  { anahtar: 'status', baslik: 'Durum' },
  { anahtar: 'notes', baslik: 'Açıklama' }
];

const YILLIK_CALISMA_IMPORT_KOLONLARI = [
  { anahtar: 'activity', baslik: 'Analizler / Kontroller', esanlamlar: ['Faaliyet'] },
  ...AYLAR.map(ay => ({ anahtar: 'months.' + ay, baslik: ay })),
  { anahtar: 'responsible', baslik: 'Sorumlu' },
  { anahtar: 'status', baslik: 'Durum' },
  { anahtar: 'notes', baslik: 'Açıklama' }
];

function _duzSatiriAyHaritasinaCevir(duzSatir) {
  const months = bosAyHaritasi();
  AYLAR.forEach(ay => { months[ay] = !!String(duzSatir['months.' + ay] || '').trim(); });
  const veriler = Object.assign({}, duzSatir, { months });
  AYLAR.forEach(ay => delete veriler['months.' + ay]);
  return veriler;
}

function kacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function _yil() {
  return document.getElementById('yilSecimi').value;
}

function yillikPlanSayfasiniBaslat(firma) {
  _yilPlanFirma = firma;

  const yilSecimi = document.getElementById('yilSecimi');
  const buYil = new Date().getFullYear();
  for (let y = buYil - 1; y <= buYil + 2; y++) {
    const secenek = document.createElement('option');
    secenek.value = y;
    secenek.textContent = y;
    if (y === buYil) secenek.selected = true;
    yilSecimi.appendChild(secenek);
  }
  yilSecimi.addEventListener('change', tumunuCiz);

  document.getElementById('sekmeEgitim').addEventListener('click', () => sekmeDegistir('egitim'));
  document.getElementById('sekmeCalisma').addEventListener('click', () => sekmeDegistir('calisma'));
  document.getElementById('sekmeRapor').addEventListener('click', () => sekmeDegistir('rapor'));

  document.getElementById('egitimSatiriEkleBtn').addEventListener('click', () => { egitimPlaniEkle(_yil()); renderEgitim(); });
  document.getElementById('calismaSatiriEkleBtn').addEventListener('click', () => { calismaPlaniEkle(_yil()); renderCalisma(); });
  document.getElementById('raporSatiriEkleBtn').addEventListener('click', () => { raporSatiriEkle(_yil()); renderRapor(); });

  document.querySelectorAll('[data-export]').forEach(btn => btn.addEventListener('click', () => disaAktar(btn.getAttribute('data-export'))));
  document.querySelectorAll('[data-print]').forEach(btn => btn.addEventListener('click', () => yazdir(btn.getAttribute('data-print'))));

  document.querySelectorAll('[data-import]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelector(`[data-import-dosya="${btn.getAttribute('data-import')}"]`).click();
    });
  });
  document.querySelectorAll('[data-import-dosya]').forEach(input => {
    input.addEventListener('change', e => iceAktarDosyaSecildi(input.getAttribute('data-import-dosya'), e));
  });

  sekmeDegistir('egitim');
}

function sekmeDegistir(sekme) {
  _aktifSekme = sekme;
  document.getElementById('sekmeEgitim').classList.toggle('sekme-seciliDegil', sekme !== 'egitim');
  document.getElementById('sekmeCalisma').classList.toggle('sekme-seciliDegil', sekme !== 'calisma');
  document.getElementById('sekmeRapor').classList.toggle('sekme-seciliDegil', sekme !== 'rapor');
  document.getElementById('panelEgitim').style.display = sekme === 'egitim' ? '' : 'none';
  document.getElementById('panelCalisma').style.display = sekme === 'calisma' ? '' : 'none';
  document.getElementById('panelRapor').style.display = sekme === 'rapor' ? '' : 'none';
  tumunuCiz();
}

function tumunuCiz() {
  if (_aktifSekme === 'egitim') renderEgitim();
  else if (_aktifSekme === 'calisma') renderCalisma();
  else renderRapor();
}

function _istatistikleriCiz(satirlar) {
  const ist = planIstatistikleriHesapla(satirlar);
  document.getElementById('stToplam').textContent = ist.toplam;
  document.getElementById('stAyToplami').textContent = ist.ayToplami;
  document.getElementById('stTamamlanan').textContent = ist.tamamlanan;
  document.getElementById('stYilEtiketi').textContent = _yil();
}

function _ayHucreleriCiz(satir) {
  return AYLAR.map(ay => `
    <td class="center">
      <span class="check ${satir.months[ay] ? 'on' : ''}" data-ay-toggle="${satir.id}" data-ay="${ay}">${satir.months[ay] ? 'X' : ''}</span>
    </td>
  `).join('');
}

function renderEgitim() {
  const yil = _yil();
  const satirlar = egitimPlaniYilGetir(yil);
  _istatistikleriCiz(satirlar);

  const kutu = document.getElementById('egitimTablosu');
  const basliklar = `<tr><th style="width:50px">No</th><th>Eğitim Konusu</th>${AYLAR.map(a => `<th class="month">${a}</th>`).join('')}<th>Hedef Grup</th><th>Süre</th><th>Eğitici</th><th>Durum</th><th>Açıklama</th><th>İşlem</th></tr>`;

  const govde = satirlar.map((s, i) => `
    <tr>
      <td class="center">${i + 1}</td>
      <td><input data-alan="topic" data-id="${s.id}" value="${kacir(s.topic)}"></td>
      ${_ayHucreleriCiz(s)}
      <td><input data-alan="target" data-id="${s.id}" value="${kacir(s.target)}"></td>
      <td><input data-alan="duration" data-id="${s.id}" value="${kacir(s.duration)}"></td>
      <td><input data-alan="trainer" data-id="${s.id}" value="${kacir(s.trainer)}"></td>
      <td>
        <select data-alan="status" data-id="${s.id}">
          ${EGITIM_PLANI_DURUMLARI.map(d => `<option ${s.status === d ? 'selected' : ''}>${d}</option>`).join('')}
        </select>
      </td>
      <td><input data-alan="notes" data-id="${s.id}" value="${kacir(s.notes)}"></td>
      <td><button class="tablo-buton sil" data-sil="${s.id}">Sil</button></td>
    </tr>
  `).join('');

  kutu.innerHTML = satirlar.length
    ? `<table><thead>${basliklar}</thead><tbody>${govde}</tbody></table>`
    : '<div class="bos-durum gorunur">Bu yıl için henüz eğitim planı satırı eklenmedi.</div>';

  _girdileriBagla(kutu, 'egitim');
}

function renderCalisma() {
  const yil = _yil();
  const satirlar = calismaPlaniYilGetir(yil);
  _istatistikleriCiz(satirlar);

  const kutu = document.getElementById('calismaTablosu');
  const basliklar = `<tr><th style="width:50px">No</th><th>Analizler / Kontroller</th>${AYLAR.map(a => `<th class="month">${a}</th>`).join('')}<th>Sorumlu</th><th>Durum</th><th>Açıklama</th><th>İşlem</th></tr>`;

  const govde = satirlar.map((s, i) => `
    <tr>
      <td class="center">${i + 1}</td>
      <td><input data-alan="activity" data-id="${s.id}" value="${kacir(s.activity)}"></td>
      ${_ayHucreleriCiz(s)}
      <td><input data-alan="responsible" data-id="${s.id}" value="${kacir(s.responsible)}"></td>
      <td>
        <select data-alan="status" data-id="${s.id}">
          ${CALISMA_PLANI_DURUMLARI.map(d => `<option ${s.status === d ? 'selected' : ''}>${d}</option>`).join('')}
        </select>
      </td>
      <td><input data-alan="notes" data-id="${s.id}" value="${kacir(s.notes)}"></td>
      <td><button class="tablo-buton sil" data-sil="${s.id}">Sil</button></td>
    </tr>
  `).join('');

  kutu.innerHTML = satirlar.length
    ? `<table><thead>${basliklar}</thead><tbody>${govde}</tbody></table>`
    : '<div class="bos-durum gorunur">Bu yıl için henüz çalışma planı satırı eklenmedi.</div>';

  _girdileriBagla(kutu, 'calisma');
}

function _girdileriBagla(kutu, tur) {
  const yil = _yil();
  const guncelle = tur === 'egitim' ? egitimPlaniGuncelle : calismaPlaniGuncelle;
  const sil = tur === 'egitim' ? egitimPlaniSil : calismaPlaniSil;
  const yenidenCiz = tur === 'egitim' ? renderEgitim : renderCalisma;

  kutu.querySelectorAll('[data-alan]').forEach(el => {
    el.addEventListener('change', () => {
      guncelle(yil, el.getAttribute('data-id'), el.getAttribute('data-alan'), el.value);
      if (el.getAttribute('data-alan') === 'status') yenidenCiz();
      else _istatistikleriCiz(tur === 'egitim' ? egitimPlaniYilGetir(yil) : calismaPlaniYilGetir(yil));
    });
  });

  kutu.querySelectorAll('[data-ay-toggle]').forEach(el => {
    el.addEventListener('click', () => {
      const yeniDeger = el.classList.contains('on') ? false : true;
      guncelle(yil, el.getAttribute('data-ay-toggle'), 'months.' + el.getAttribute('data-ay'), yeniDeger);
      yenidenCiz();
    });
  });

  kutu.querySelectorAll('[data-sil]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (await onayModali('Bu satırı silmek istediğinize emin misiniz?', 'Sil')) {
        sil(yil, btn.getAttribute('data-sil'));
        yenidenCiz();
      }
    });
  });
}

function renderRapor() {
  const yil = _yil();
  const rapor = raporGetirVeyaOlustur(yil, _yilPlanFirma);
  document.getElementById('stToplam').textContent = rapor.rows.length;
  document.getElementById('stAyToplami').textContent = '-';
  document.getElementById('stTamamlanan').textContent = '-';
  document.getElementById('stYilEtiketi').textContent = yil;

  const alanEslesme = {
    metaFirma: 'company', metaSgk: 'sgk', metaIsKolu: 'sector', metaAdres: 'address',
    metaTelefon: 'phone', metaEposta: 'email', metaErkek: 'male', metaKadin: 'female',
    metaGenc: 'young', metaCocuk: 'child', metaUzman: 'expert', metaHekim: 'doctor', metaIsveren: 'employer'
  };
  Object.entries(alanEslesme).forEach(([elId, alan]) => {
    const el = document.getElementById(elId);
    el.value = rapor.meta[alan] ?? '';
    el.onchange = () => { raporMetaGuncelle(yil, alan, el.value); };
  });

  const govde = document.getElementById('raporSatirGovdesi');
  govde.innerHTML = rapor.rows.map((r, i) => `
    <tr>
      <td class="center">${i + 1}</td>
      <td><textarea data-alan="work" data-id="${r.id}">${kacir(r.work)}</textarea></td>
      <td><textarea data-alan="date" data-id="${r.id}">${kacir(r.date)}</textarea></td>
      <td><textarea data-alan="person" data-id="${r.id}">${kacir(r.person)}</textarea></td>
      <td><input data-alan="repeat" data-id="${r.id}" value="${kacir(r.repeat)}"></td>
      <td><textarea data-alan="method" data-id="${r.id}">${kacir(r.method)}</textarea></td>
      <td><textarea data-alan="result" data-id="${r.id}">${kacir(r.result)}</textarea></td>
      <td><button class="tablo-buton sil" data-sil="${r.id}">Sil</button></td>
    </tr>
  `).join('');

  govde.querySelectorAll('[data-alan]').forEach(el => {
    el.addEventListener('change', () => raporSatiriGuncelle(yil, el.getAttribute('data-id'), el.getAttribute('data-alan'), el.value));
  });
  govde.querySelectorAll('[data-sil]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (await onayModali('Bu faaliyet satırını silmek istediğinize emin misiniz?', 'Sil')) {
        raporSatiriSil(yil, btn.getAttribute('data-sil'));
        renderRapor();
      }
    });
  });
}

// ---- İçe aktarma ----

function iceAktarDosyaSecildi(tur, e) {
  const dosya = e.target.files[0];
  if (!dosya) return;

  if (tur === 'rapor') {
    _raporExceldenIceAktar(dosya, () => { e.target.value = ''; });
    return;
  }

  const kolonlar = tur === 'egitim' ? YILLIK_EGITIM_IMPORT_KOLONLARI : YILLIK_CALISMA_IMPORT_KOLONLARI;
  excelIceAktar(dosya, kolonlar, (satirlar, hataMesaji) => {
    e.target.value = '';
    if (hataMesaji) { alert(hataMesaji); return; }
    const hamSatirlar = satirlar.map(_duzSatiriAyHaritasinaCevir);
    const sonuc = tur === 'egitim'
      ? egitimPlaniTopluIceAktar(_yil(), hamSatirlar)
      : calismaPlaniTopluIceAktar(_yil(), hamSatirlar);
    alert(`${sonuc.basarili} satır içe aktarıldı.`);
    tumunuCiz();
  });
}

// Değerlendirme Raporu tablosu, meta bilgi satırlarının altında ikinci bir
// başlık satırıyla başlıyor (bkz. _tabloHtmlUret 'rapor' dalı) — bu yüzden
// core/excel.js'teki excelIceAktar (ilk satırı başlık varsayar) kullanılamaz.
// Ham satır-satır (AOA) okunup "Yapılan Çalışmalar" başlığı aranarak asıl
// veri satırlarının başladığı yer bulunur. Sadece satırlar içe aktarılır;
// üstteki firma/SGK/adres meta alanları elle doldurulmaya devam eder.
function _raporExceldenIceAktar(dosya, tamamlaninca) {
  xlsxHazirOlduğunda(() => {
    const okuyucu = new FileReader();
    okuyucu.onload = e => {
      tamamlaninca();
      try {
        const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true });
        const sayfa = wb.Sheets[wb.SheetNames[0]];
        const satirlarAOA = XLSX.utils.sheet_to_json(sayfa, { header: 1, defval: '' });
        const baslikIndeksi = satirlarAOA.findIndex(satir => _basligiNormallestir(satir[1]) === _basligiNormallestir('Yapılan Çalışmalar'));
        if (baslikIndeksi === -1) {
          alert('Bu dosyada "Yapılan Çalışmalar" başlıklı bir satır bulunamadı. Değerlendirme Raporu Excel çıktısıyla aynı formatta bir dosya seçin.');
          return;
        }
        const hamSatirlar = satirlarAOA.slice(baslikIndeksi + 1)
          .filter(satir => String(satir[1] || '').trim())
          .map(satir => ({
            work: String(satir[1] || '').trim(),
            date: String(satir[2] || '').trim(),
            person: String(satir[3] || '').trim(),
            repeat: String(satir[4] || '').trim(),
            method: String(satir[5] || '').trim(),
            result: String(satir[6] || '').trim()
          }));
        const sonuc = raporSatirlariTopluIceAktar(_yil(), hamSatirlar);
        alert(`${sonuc.basarili} satır içe aktarıldı.`);
        tumunuCiz();
      } catch (err) {
        alert('Dosya okunamadı. Geçerli bir Excel (.xlsx/.xls) dosyası seçtiğinizden emin olun.');
      }
    };
    okuyucu.onerror = () => { tamamlaninca(); alert('Dosya okunamadı.'); };
    okuyucu.readAsArrayBuffer(dosya);
  });
}

// ---- Dışa aktarma / yazdırma ----

function _tabloHtmlUret(tur) {
  const yil = _yil();
  if (tur === 'egitim') {
    const satirlar = egitimPlaniYilGetir(yil);
    return `<table><tr><th>No</th><th>Eğitim Konusu</th>${AYLAR.map(a => `<th>${a}</th>`).join('')}<th>Hedef Grup</th><th>Süre</th><th>Eğitici</th><th>Durum</th><th>Açıklama</th></tr>${satirlar.map((s, i) => `<tr><td>${i + 1}</td><td>${kacir(s.topic)}</td>${AYLAR.map(a => `<td>${s.months[a] ? 'X' : ''}</td>`).join('')}<td>${kacir(s.target)}</td><td>${kacir(s.duration)}</td><td>${kacir(s.trainer)}</td><td>${kacir(s.status)}</td><td>${kacir(s.notes)}</td></tr>`).join('')}</table>`;
  }
  if (tur === 'calisma') {
    const satirlar = calismaPlaniYilGetir(yil);
    return `<table><tr><th>No</th><th>Analizler / Kontroller</th>${AYLAR.map(a => `<th>${a}</th>`).join('')}<th>Sorumlu</th><th>Durum</th><th>Açıklama</th></tr>${satirlar.map((s, i) => `<tr><td>${i + 1}</td><td>${kacir(s.activity)}</td>${AYLAR.map(a => `<td>${s.months[a] ? 'X' : ''}</td>`).join('')}<td>${kacir(s.responsible)}</td><td>${kacir(s.status)}</td><td>${kacir(s.notes)}</td></tr>`).join('')}</table>`;
  }

  const rapor = raporGetirVeyaOlustur(yil, _yilPlanFirma);
  const m = rapor.meta;
  const toplamCalisan = Number(m.male || 0) + Number(m.female || 0);
  return `<table>
    <tr><th colspan="7">${kacir(yil)} YILLIK DEĞERLENDİRME RAPORU</th></tr>
    <tr><td>Firma</td><td colspan="3">${kacir(m.company)}</td><td>SGK Sicil No</td><td colspan="2">${kacir(m.sgk)}</td></tr>
    <tr><td>Adres</td><td colspan="3">${kacir(m.address)}</td><td>İşkolu</td><td colspan="2">${kacir(m.sector)}</td></tr>
    <tr><td>Telefon</td><td>${kacir(m.phone)}</td><td>E-posta</td><td>${kacir(m.email)}</td><td>Çalışan</td><td colspan="2">Erkek: ${kacir(m.male)} Kadın: ${kacir(m.female)} Genç: ${kacir(m.young)} Çocuk: ${kacir(m.child)} Toplam: ${toplamCalisan}</td></tr>
    <tr><th>Sıra No</th><th>Yapılan Çalışmalar</th><th>Tarih / Geçerlilik</th><th>Yapan Kişi ve Unvanı</th><th>Tekrar Sayısı</th><th>Kullanılan Yöntem</th><th>Sonuç ve Yorum</th></tr>
    ${rapor.rows.map((r, i) => `<tr><td>${i + 1}</td><td>${kacir(r.work)}</td><td>${kacir(r.date)}</td><td>${kacir(r.person)}</td><td>${kacir(r.repeat)}</td><td>${kacir(r.method)}</td><td>${kacir(r.result)}</td></tr>`).join('')}
  </table>`;
}

function disaAktar(tur) {
  const yil = _yil();
  const html = `<html><head><meta charset="utf-8"></head><body>${_tabloHtmlUret(tur)}</body></html>`;
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${tur}_${yil}.xls`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function yazdir(tur) {
  const yil = _yil();
  const mount = document.getElementById('yazdirmaAlani');
  const baslik = tur === 'egitim'
    ? `${yil} YILLIK İŞ SAĞLIĞI VE GÜVENLİĞİ EĞİTİM PLANI`
    : tur === 'calisma'
      ? `${yil} YILLIK İŞ SAĞLIĞI VE GÜVENLİĞİ ÇALIŞMA PLANI`
      : '';

  const icerik = tur === 'rapor'
    ? _tabloHtmlUret('rapor')
    : `<div class="doc-title">${kacir(baslik)}</div><div class="doc-meta"><b>${kacir(_yilPlanFirma ? _yilPlanFirma.ad : '')}</b><br>Yıl: ${yil}</div>${_tabloHtmlUret(tur).replace('<table>', "<table class='doc-table'>")}`;

  mount.innerHTML = icerik;
  mount.style.display = 'block';
  setTimeout(() => {
    window.print();
    setTimeout(() => { mount.innerHTML = ''; mount.style.display = 'none'; }, 400);
  }, 80);
}
