// Stajyer Yönetimi ekranının DOM işlemleri.

let _sjGorunum = 'kayitlar';
let _duzenlenenKayitId = null;
let _sjFirma = null;
let _sertifikaKayitId = null;

function _sjKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function sertifikaAyarModalAc(id) {
  const stajyer = stajyerIdIleGetirRepo(id);
  if (!stajyer || !stajyer.isgEgitimTarihi) {
    alert('Sertifika oluşturulamadan önce Temel İSG Eğitim Tarihi girilmelidir.');
    return;
  }
  _sertifikaKayitId = id;

  const varsayilan = TEHLIKE_SINIFLARI.includes(_sjFirma && _sjFirma.tehlikeSinifi) ? _sjFirma.tehlikeSinifi : 'Az Tehlikeli';
  document.getElementById('sertTehlikeSinifi').innerHTML = TEHLIKE_SINIFLARI.map(t => `<option ${t === varsayilan ? 'selected' : ''}>${t}</option>`).join('');
  _sertifikaSureOnizlemesiGuncelle();
  document.getElementById('sertifikaAyarModal').classList.add('acik');
}

function sertifikaAyarModalKapat() {
  document.getElementById('sertifikaAyarModal').classList.remove('acik');
  _sertifikaKayitId = null;
}

function _sertifikaSureOnizlemesiGuncelle() {
  const tehlike = document.getElementById('sertTehlikeSinifi').value;
  const dakika = stajyerSertifikaSuresiHesapla(tehlike);
  document.getElementById('sertSureKutusu').innerHTML = `Toplam Eğitim Süresi: <strong>${dakikayiSaateCevir(dakika)}</strong> (${dakika} dk)`;
}

function sjRozetSinifAdi(durum) {
  return slugOlustur(durum || '');
}

const STAJYER_IMPORT_KOLONLARI = [
  { anahtar: 'adSoyad', baslik: 'Ad Soyad' },
  { anahtar: 'bolum', baslik: 'Staj Bölümü' },
  { anahtar: 'okul', baslik: 'Okul' },
  { anahtar: 'okulBolumu', baslik: 'Okul Bölümü/Programı' },
  { anahtar: 'sinif', baslik: 'Sınıf' },
  { anahtar: 'telefon', baslik: 'Telefon' },
  { anahtar: 'stajTuru', baslik: 'Staj Türü' },
  { anahtar: 'sorumluAdi', baslik: 'Sorumlu' },
  { anahtar: 'baslangicTarihi', baslik: 'Başlangıç Tarihi' },
  { anahtar: 'bitisTarihi', baslik: 'Bitiş Tarihi' },
  { anahtar: 'isgEgitimTarihi', baslik: 'İSG Eğitim Tarihi' },
  { anahtar: 'isgEgitimTarihi2', baslik: 'İSG Eğitim 2. Gün Tarihi' }
];

const STAJYER_EXPORT_KOLONLARI = [
  { anahtar: 'stajNo', baslik: 'Staj No' },
  { anahtar: 'adSoyad', baslik: 'Ad Soyad' },
  { anahtar: 'bolum', baslik: 'Bölüm' },
  { anahtar: 'okul', baslik: 'Okul' },
  { anahtar: 'stajTuru', baslik: 'Staj Türü' },
  { anahtar: 'baslangicTarihi', baslik: 'Başlangıç' },
  { anahtar: 'bitisTarihi', baslik: 'Bitiş' },
  { anahtar: 'durumGoruntu', baslik: 'Durum' }
];

function stajyerSayfasiniBaslat(firma) {
  _sjFirma = firma;

  document.getElementById('sekmeKayitlar').addEventListener('click', () => gorunumDegistir('kayitlar'));
  document.getElementById('sekmeOzet').addEventListener('click', () => gorunumDegistir('ozet'));

  document.getElementById('yeniKayitBtn').addEventListener('click', () => kayitModalAc());
  document.getElementById('modalKapatBtn').addEventListener('click', kayitModalKapat);
  document.getElementById('modalIptalBtn').addEventListener('click', kayitModalKapat);
  document.getElementById('kayitForm').addEventListener('submit', formGonderildi);
  document.getElementById('aramaKutusu').addEventListener('input', e => kayitlariCiz(e.target.value));
  document.getElementById('durumFiltre').addEventListener('change', () => kayitlariCiz(document.getElementById('aramaKutusu').value));
  document.getElementById('sorumluPersonelId').addEventListener('change', sorumluPersonelSecildi);
  document.getElementById('isgEgitimTarihi').addEventListener('change', isgEgitimUyarisiniGuncelle);
  document.getElementById('isgEgitimTarihi2').addEventListener('change', isgEgitimUyarisiniGuncelle);
  document.getElementById('baslangicTarihi').addEventListener('change', isgEgitimUyarisiniGuncelle);

  document.getElementById('sertTehlikeSinifi').addEventListener('change', _sertifikaSureOnizlemesiGuncelle);
  document.getElementById('sertAyarIptalBtn').addEventListener('click', sertifikaAyarModalKapat);
  document.getElementById('sertAyarKapatBtn').addEventListener('click', sertifikaAyarModalKapat);
  document.getElementById('sertAyarOlusturBtn').addEventListener('click', async () => {
    const id = _sertifikaKayitId;
    if (!id) return;
    const secim = { tehlikeSinifi: document.getElementById('sertTehlikeSinifi').value };
    const btn = document.getElementById('sertAyarOlusturBtn');
    btn.disabled = true;
    try {
      await stajyerSertifikasiOlustur(id, secim);
      sertifikaAyarModalKapat();
    } catch (hata) {
      console.error(hata);
      alert('Sertifika oluşturulamadı: ' + (hata.message || hata));
    } finally {
      btn.disabled = false;
    }
  });

  document.getElementById('sablonIndirBtn').addEventListener('click', () => {
    excelSablonIndir(STAJYER_IMPORT_KOLONLARI, 'stajyer_sablonu.xlsx');
  });
  document.getElementById('disaAktarBtn').addEventListener('click', () => {
    excelDisaAktar(stajyerleriGetir('', {}), STAJYER_EXPORT_KOLONLARI, 'stajyerler.xlsx');
  });
  document.getElementById('listeYazdirBtn').addEventListener('click', () => {
    const filtreler = { durum: document.getElementById('durumFiltre').value };
    raporListesiYazdir('Stajyer Listesi', _sjFirma ? _sjFirma.ad : '', STAJYER_EXPORT_KOLONLARI, stajyerleriGetir(document.getElementById('aramaKutusu').value, filtreler));
  });
  document.getElementById('iceAktarBtn').addEventListener('click', () => document.getElementById('iceAktarDosya').click());
  document.getElementById('iceAktarDosya').addEventListener('change', e => {
    const dosya = e.target.files[0];
    excelIceAktar(dosya, STAJYER_IMPORT_KOLONLARI, (satirlar, hataMesaji) => {
      e.target.value = '';
      if (hataMesaji) { alert(hataMesaji); return; }
      satirlar.forEach(satir => {
        satir.baslangicTarihi = excelTarihiNormallestir(satir.baslangicTarihi);
        satir.bitisTarihi = excelTarihiNormallestir(satir.bitisTarihi);
        satir.isgEgitimTarihi = excelTarihiNormallestir(satir.isgEgitimTarihi);
        satir.isgEgitimTarihi2 = excelTarihiNormallestir(satir.isgEgitimTarihi2);
      });
      const sonuc = excelToplulIceAktarSonucOzetle(satirlar, stajyerEkle);
      alert(excelIceAktarOzetMesaji(sonuc));
      kayitlariCiz(document.getElementById('aramaKutusu').value);
    });
  });

  gorunumDegistir('kayitlar');
}

function gorunumDegistir(gorunum) {
  _sjGorunum = gorunum;
  document.getElementById('sekmeKayitlar').classList.toggle('sekme-seciliDegil', gorunum !== 'kayitlar');
  document.getElementById('sekmeOzet').classList.toggle('sekme-seciliDegil', gorunum !== 'ozet');
  document.getElementById('bolum-kayitlar').style.display = gorunum === 'kayitlar' ? '' : 'none';
  document.getElementById('bolum-ozet').style.display = gorunum === 'ozet' ? '' : 'none';

  if (gorunum === 'kayitlar') kayitlariCiz(document.getElementById('aramaKutusu').value);
  else ozetiCiz();
}

function kayitlariCiz(aramaMetni) {
  const govde = document.getElementById('tabloGovde');
  const bosDurum = document.getElementById('bosDurum');
  const filtreler = { durum: document.getElementById('durumFiltre').value };
  const kayitlar = stajyerleriGetir(aramaMetni, filtreler);

  govde.innerHTML = '';
  if (kayitlar.length === 0) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = aramaMetni ? 'Aramanızla eşleşen stajyer bulunamadı.' : 'Henüz stajyer eklenmedi.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  kayitlar.forEach(k => {
    const satir = document.createElement('tr');
    satir.innerHTML = `
      <td>${_sjKacir(k.stajNo)}</td>
      <td>${_sjKacir(k.adSoyad)}</td>
      <td>${_sjKacir(k.bolum)}</td>
      <td>${_sjKacir(k.okul)}</td>
      <td>${_sjKacir(k.stajTuru)}</td>
      <td>${k.baslangicTarihi} → ${k.bitisTarihi}</td>
      <td><span class="genel-rozet rozet-${sjRozetSinifAdi(k.durumGoruntu)}">${_sjKacir(k.durumGoruntu)}</span></td>
      <td><span class="genel-rozet rozet-${sjRozetSinifAdi(k.isgEgitimDurumu)}">${_sjKacir(k.isgEgitimDurumu)}</span></td>
      <td>
        <button class="tablo-buton" data-duzenle="${k.id}">Düzenle</button>
        ${k.isgEgitimTarihi ? `<button class="tablo-buton" data-sertifika="${k.id}">Sertifika</button>` : ''}
        <button class="tablo-buton sil" data-sil="${k.id}">Sil</button>
      </td>
    `;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-duzenle]').forEach(btn => btn.addEventListener('click', () => kayitModalAc(stajyerIdIleGetirRepo(btn.getAttribute('data-duzenle')))));
  govde.querySelectorAll('[data-sertifika]').forEach(btn => btn.addEventListener('click', () => sertifikaAyarModalAc(btn.getAttribute('data-sertifika'))));
  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', () => {
    if (confirm('Bu stajyer kaydını silmek istediğinize emin misiniz?')) { stajyerSil(btn.getAttribute('data-sil')); kayitlariCiz(document.getElementById('aramaKutusu').value); }
  }));
}

function sorumluPersonelSecildi() {
  const personel = personelIdIleGetirRepo(document.getElementById('sorumluPersonelId').value);
  document.getElementById('sorumluAdi').value = personel ? personel.adSoyad : '';
}

function kayitModalAc(kayit) {
  _duzenlenenKayitId = kayit ? kayit.id : null;
  document.getElementById('modalBaslik').textContent = kayit ? (kayit.stajNo + ' Kaydını Düzenle') : 'Yeni Stajyer';

  document.getElementById('adSoyad').value = kayit ? kayit.adSoyad : '';
  document.getElementById('bolum').value = kayit ? kayit.bolum : '';
  document.getElementById('okul').value = kayit ? kayit.okul : '';
  document.getElementById('okulBolumu').value = kayit ? kayit.okulBolumu : '';
  document.getElementById('sinif').value = kayit ? kayit.sinif : '';
  document.getElementById('telefon').value = kayit ? kayit.telefon : '';
  document.getElementById('stajTuru').innerHTML = STAJ_TURLERI.map(t => `<option ${kayit && kayit.stajTuru === t ? 'selected' : ''}>${t}</option>`).join('');

  const personeller = personelleriGetir('', false);
  document.getElementById('sorumluPersonelId').innerHTML = '<option value="">— Seçilmedi —</option>' +
    personeller.map(p => `<option value="${p.id}" ${kayit && kayit.sorumluPersonelId === p.id ? 'selected' : ''}>${_sjKacir(p.adSoyad)}</option>`).join('');
  document.getElementById('sorumluAdi').value = kayit ? kayit.sorumluAdi : '';

  document.getElementById('baslangicTarihi').value = kayit ? kayit.baslangicTarihi : '';
  document.getElementById('bitisTarihi').value = kayit ? kayit.bitisTarihi : '';
  document.getElementById('isgEgitimTarihi').value = kayit ? kayit.isgEgitimTarihi : '';
  document.getElementById('isgEgitimTarihi2').value = kayit ? kayit.isgEgitimTarihi2 : '';
  document.getElementById('durum').innerHTML = STAJYER_DURUMLARI.map(d => `<option ${kayit && kayit.durum === d ? 'selected' : ''}>${d}</option>`).join('');
  document.getElementById('notlar').value = kayit ? kayit.notlar : '';

  isgEgitimUyarisiniGuncelle();
  temizleFormHatalari();
  document.getElementById('modalKatman').classList.add('acik');
}

function isgEgitimUyarisiniGuncelle() {
  const egitimTarihi = document.getElementById('isgEgitimTarihi').value;
  const egitimTarihi2 = document.getElementById('isgEgitimTarihi2').value;
  const baslangic = document.getElementById('baslangicTarihi').value;
  const kutu = document.getElementById('isgEgitimUyarisi');
  const efektifTarih = isgEgitimEfektifTarihi({ isgEgitimTarihi: egitimTarihi, isgEgitimTarihi2: egitimTarihi2 });
  const durum = isgEgitimDurumuHesapla(efektifTarih, baslangic);

  if (durum === 'Eğitim Kaydı Yok') {
    kutu.innerHTML = '⚠️ Temel İSG eğitim tarihi girilmemiş. Mevzuata göre staja başlamadan önce eğitim verilmelidir.';
  } else if (durum === 'Staj Sonrası Verilmiş') {
    kutu.innerHTML = '⚠️ Eğitim tarihi staj başlangıcından sonra görünüyor. Mevzuata aykırı olabilir, kontrol edin.';
  } else {
    kutu.innerHTML = '✅ Temel İSG eğitimi staj başlangıcından önce tamamlanmış görünüyor.';
  }
}

function kayitModalKapat() {
  document.getElementById('modalKatman').classList.remove('acik');
  _duzenlenenKayitId = null;
}

function temizleFormHatalari() {
  document.querySelectorAll('#kayitForm .alan-hatasi').forEach(el => el.textContent = '');
}

function formGonderildi(e) {
  e.preventDefault();
  temizleFormHatalari();

  const secilenPersonel = personelIdIleGetirRepo(document.getElementById('sorumluPersonelId').value);
  const veriler = {
    adSoyad: document.getElementById('adSoyad').value,
    bolum: document.getElementById('bolum').value,
    okul: document.getElementById('okul').value,
    okulBolumu: document.getElementById('okulBolumu').value,
    sinif: document.getElementById('sinif').value,
    telefon: document.getElementById('telefon').value,
    stajTuru: document.getElementById('stajTuru').value,
    sorumluPersonelId: document.getElementById('sorumluPersonelId').value,
    sorumluAdi: secilenPersonel ? secilenPersonel.adSoyad : document.getElementById('sorumluAdi').value,
    baslangicTarihi: document.getElementById('baslangicTarihi').value,
    bitisTarihi: document.getElementById('bitisTarihi').value,
    isgEgitimTarihi: document.getElementById('isgEgitimTarihi').value,
    isgEgitimTarihi2: document.getElementById('isgEgitimTarihi2').value,
    durum: document.getElementById('durum').value,
    notlar: document.getElementById('notlar').value
  };

  const sonuc = _duzenlenenKayitId ? stajyerGuncelle(_duzenlenenKayitId, veriler) : stajyerEkle(veriler);
  if (!sonuc.basarili) {
    Object.keys(sonuc.hatalar).forEach(alan => {
      const hataEl = document.getElementById(alan + 'Hata');
      if (hataEl) hataEl.textContent = sonuc.hatalar[alan];
    });
    return;
  }

  kayitModalKapat();
  kayitlariCiz(document.getElementById('aramaKutusu').value);
}

// ==================== ÖZET ====================

function ozetiCiz() {
  const ozet = stajyerOzetiHesapla();
  const kutu = document.getElementById('ozetKutusu');
  const kart = (etiket, deger) => `<div class="istatistik-kutu"><span>${etiket}</span><b>${deger}</b></div>`;
  const dagilimHtml = (baslik, satirlar) => `
    <div class="kart" style="margin-bottom:14px;">
      <div class="card-title" style="margin-bottom:8px;"><h3 style="margin:0; font-size:14px;">${baslik}</h3></div>
      ${satirlar.length
        ? satirlar.map(([k, v]) => `<div style="display:flex; justify-content:space-between; font-size:13px; padding:6px 0; border-bottom:1px solid var(--kenarlik);"><span>${_sjKacir(k)}</span><strong>${v}</strong></div>`).join('')
        : '<div class="bos-durum gorunur">Veri yok.</div>'}
    </div>
  `;

  kutu.innerHTML = `
    <div class="istatistik-grid">
      ${kart('Toplam Stajyer', ozet.toplam)}
      ${kart('Aktif', ozet.aktif)}
      ${kart('Planlandı', ozet.planlandi)}
      ${kart('Tamamlandı', ozet.tamamlandi)}
      ${kart('Sorumlu Atanmamış', ozet.sorumluAtanmamis)}
      ${kart('İSG Eğitimi Eksik/Geç', ozet.isgEgitimiEksikVeyaGec)}
    </div>

    <div class="modul-grid" style="grid-template-columns: repeat(auto-fill, minmax(260px,1fr));">
      <div>${dagilimHtml('Bölüme Göre', ozet.bolumeGore)}</div>
      <div>${dagilimHtml('Okula Göre', ozet.okulaGore)}</div>
      <div>${dagilimHtml('Staj Türüne Göre', ozet.stajTurune)}</div>
    </div>

    <div class="card-title" style="margin:20px 0 8px;"><h3 style="margin:0; font-size:14px;">Önümüzdeki 7 Gün İçinde Bitecek Stajlar</h3></div>
    <div class="tablo-scroll">
      <table class="veri-tablosu">
        <thead><tr><th>Staj No</th><th>Ad Soyad</th><th>Bölüm</th><th>Bitiş Tarihi</th></tr></thead>
        <tbody>
          ${ozet.yakindaBitecekler.map(k => `<tr><td>${_sjKacir(k.stajNo)}</td><td>${_sjKacir(k.adSoyad)}</td><td>${_sjKacir(k.bolum)}</td><td>${k.bitisTarihi}</td></tr>`).join('') || '<tr><td colspan="4">Yaklaşan bitiş yok.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

// Sertifika oluşturma (Temel Eğitim Belgesi) artık cikti.js'te — Eğitim
// modülüyle aynı Sertifika Ayarları penceresi + html2canvas/jsPDF akışı
// (bkz. sertifikaAyarModalAc yukarıda, stajyerSertifikasiOlustur cikti.js'te).
