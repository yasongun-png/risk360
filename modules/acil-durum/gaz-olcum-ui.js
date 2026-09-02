// Gaz Ölçüm Cihazları sekmesi DOM işlemleri (Yangın Tüpü sekmesiyle aynı
// genel kalıp: cihaz envanteri tablosu + kalibrasyon kayıtları tablosu).

let _duzenlenenGocCihazId = null;
let _duzenlenenGocKalibrasyonId = null;
let _gocKalibrasyonBelgesi = '';

function gocRozetSinifAdi(durum) {
  return slugOlustur(durum || '');
}

// Kullanıcı isteği: "bunlar 3 harften oluşur bunları içe aktara bir
// excel'e aktar ve oradan ben içe aktırırım" — Yangın Tüpü sekmesindeki
// Şablon İndir/İçe Aktar/Dışa Aktar akışının aynısı (bkz. ui.js
// YANGIN_TUPU_IMPORT_KOLONLARI ve _acilDurumExcelRaporBaglantilariniKur).
const GOC_IMPORT_KOLONLARI = [
  { anahtar: 'cihazNo', baslik: 'Cihaz No', esanlamlar: ['Cihaz No (boşsa otomatik üretilir)'] },
  { anahtar: 'tur', baslik: 'Tür (Mobil/Sabit)' },
  { anahtar: 'ad', baslik: 'Ad' },
  { anahtar: 'marka', baslik: 'Marka' },
  { anahtar: 'model', baslik: 'Model' },
  { anahtar: 'seriNo', baslik: 'Seri No' },
  { anahtar: 'imalYili', baslik: 'İmal Yılı' },
  { anahtar: 'olculenGazlar', baslik: 'Ölçülen Gazlar' },
  { anahtar: 'bolum', baslik: 'Bölüm' },
  { anahtar: 'lokasyon', baslik: 'Lokasyon' },
  { anahtar: 'sorumluPersonel', baslik: 'Sorumlu Personel' },
  { anahtar: 'periyotAy', baslik: 'Kalibrasyon Periyodu (Ay)' },
  { anahtar: 'sonKalibrasyonTarihi', baslik: 'Son Kalibrasyon Tarihi' },
  { anahtar: 'sonrakiKalibrasyonTarihi', baslik: 'Sonraki Kalibrasyon Tarihi' },
  { anahtar: 'durum', baslik: 'Durum' },
  { anahtar: 'notlar', baslik: 'Notlar' }
];

const GOC_EXPORT_KOLONLARI = [
  { anahtar: 'cihazNo', baslik: 'Cihaz No' },
  { anahtar: 'ad', baslik: 'Ad' },
  { anahtar: 'tur', baslik: 'Tür' },
  { anahtar: 'marka', baslik: 'Marka' },
  { anahtar: 'model', baslik: 'Model' },
  { anahtar: 'seriNo', baslik: 'Seri No' },
  { anahtar: 'olculenGazlar', baslik: 'Ölçülen Gazlar' },
  { anahtar: 'bolum', baslik: 'Bölüm' },
  { anahtar: 'lokasyon', baslik: 'Lokasyon' },
  { anahtar: 'sonKalibrasyonTarihi', baslik: 'Son Kalibrasyon' },
  { anahtar: 'sonrakiKalibrasyonTarihi', baslik: 'Sonraki Kalibrasyon' },
  { anahtar: 'durumGoruntu', baslik: 'Durum' }
];

function _gocExcelBaglantilariniKur() {
  document.getElementById('gocCihazSablonIndirBtn').addEventListener('click', () => {
    excelSablonIndir(GOC_IMPORT_KOLONLARI, 'acil_durum_gaz_olcum_sablonu.xlsx');
  });
  document.getElementById('gocCihazDisaAktarBtn').addEventListener('click', () => {
    excelDisaAktar(gocCihazlariGetir(''), GOC_EXPORT_KOLONLARI, 'acil_durum_gaz_olcum_cihazlari.xlsx');
  });
  document.getElementById('gocCihazIceAktarBtn').addEventListener('click', () => document.getElementById('gocCihazIceAktarDosya').click());
  document.getElementById('gocCihazIceAktarDosya').addEventListener('change', e => {
    const dosya = e.target.files[0];
    excelIceAktar(dosya, GOC_IMPORT_KOLONLARI, async (satirlar, hataMesaji) => {
      e.target.value = '';
      if (hataMesaji) { alert(hataMesaji); return; }
      satirlar.forEach(satir => {
        satir.sonKalibrasyonTarihi = excelTarihiNormallestir(satir.sonKalibrasyonTarihi);
        satir.sonrakiKalibrasyonTarihi = excelTarihiNormallestir(satir.sonrakiKalibrasyonTarihi);
      });
      const dugme = document.getElementById('gocCihazIceAktarBtn');
      dugme.disabled = true;
      try {
        const sonuc = await gocCihazTopluIceAktar(satirlar);
        if (!sonuc.yazimBasarili) {
          alert('İçe aktarılan kayıtlar sunucuya KAYDEDİLEMEDİ, lütfen tekrar deneyin: ' + (sonuc.yazimHatasi ? (sonuc.yazimHatasi.message || sonuc.yazimHatasi) : 'bilinmeyen hata'));
        } else {
          alert(excelIceAktarOzetMesaji(sonuc));
        }
      } finally {
        dugme.disabled = false;
      }
      gocCihazlariCiz(document.getElementById('gocCihazAramaKutusu').value);
    });
  });
}

function _gocBaslat() {
  document.getElementById('yeniGocCihazBtn').addEventListener('click', () => gocCihazModalAc());
  _gocExcelBaglantilariniKur();
  document.getElementById('gocCihazModalKapatBtn').addEventListener('click', gocCihazModalKapat);
  document.getElementById('gocCihazModalIptalBtn').addEventListener('click', gocCihazModalKapat);
  document.getElementById('gocCihazForm').addEventListener('submit', gocCihazFormGonderildi);
  document.getElementById('gocCihazAramaKutusu').addEventListener('input', e => gocCihazlariCiz(e.target.value));

  document.getElementById('gocSonKalibrasyonTarihi').addEventListener('change', () => {
    const tarih = document.getElementById('gocSonKalibrasyonTarihi').value;
    const periyot = document.getElementById('gocPeriyotAy').value;
    if (tarih && periyot) document.getElementById('gocSonrakiKalibrasyonTarihi').value = gocTarihAyEkle(tarih, periyot);
  });

  document.getElementById('gocKalibrasyonModalKapatBtn').addEventListener('click', gocKalibrasyonModalKapat);
  document.getElementById('gocKalibrasyonModalIptalBtn').addEventListener('click', gocKalibrasyonModalKapat);
  document.getElementById('gocKalibrasyonForm').addEventListener('submit', gocKalibrasyonFormGonderildi);
  document.getElementById('gocKalibrasyonAramaKutusu').addEventListener('input', e => gocKalibrasyonlariCiz(e.target.value));

  document.getElementById('gocKalibrasyonBelgeAlani').innerHTML = belgeYukleyiciHtml('gocKalibrasyonBelge', 'Kalibrasyon Sertifikası');
  belgeYukleyiciBagla('gocKalibrasyonBelge', async dosya => {
    try {
      _gocKalibrasyonBelgesi = await belgeDosyasiIsle(dosya, _adFirma ? _adFirma.slug : '');
      _gocKalibrasyonBelgeOnizlemeCiz();
    } catch (hata) {
      alert(hata.message || 'Belge yüklenemedi.');
    }
  });
}

function _gocKalibrasyonBelgeOnizlemeCiz() {
  const kutu = document.getElementById('gocKalibrasyonBelgeOnizleme');
  kutu.innerHTML = belgeOnizlemeHtml('gocKalibrasyonBelge', _gocKalibrasyonBelgesi);
  if (_gocKalibrasyonBelgesi) {
    document.getElementById('gocKalibrasyonBelgeAcLink').addEventListener('click', e => { e.preventDefault(); belgeDosyasiniAc(_gocKalibrasyonBelgesi); });
    document.getElementById('gocKalibrasyonBelgeKaldirBtn').addEventListener('click', () => { _gocKalibrasyonBelgesi = ''; _gocKalibrasyonBelgeOnizlemeCiz(); });
  }
}

// ==================== CİHAZ ENVANTERİ ====================

function gocCihazlariCiz(aramaMetni) {
  const govde = document.getElementById('gocCihazTabloGovde');
  const bosDurum = document.getElementById('gocCihazBosDurum');
  const liste = gocCihazlariGetir(aramaMetni);

  govde.innerHTML = '';
  if (!liste.length) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = 'Eşleşen gaz ölçüm cihazı bulunamadı.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  liste.forEach(c => {
    const satir = document.createElement('tr');
    satir.innerHTML = `
      <td>${c.cihazNo}</td>
      <td>${_adKacir(c.ad)}</td>
      <td>${_adKacir(c.tur)}</td>
      <td>${_adKacir(c.olculenGazlar) || '-'}</td>
      <td>${_adKacir([c.bolum, c.lokasyon].filter(Boolean).join(' / ')) || '-'}</td>
      <td>${gunAyYil(c.sonKalibrasyonTarihi) || '-'}</td>
      <td>${gunAyYil(c.sonrakiKalibrasyonTarihi) || '-'}</td>
      <td><span class="genel-rozet rozet-${gocRozetSinifAdi(c.durumGoruntu)}">${_adKacir(c.durumGoruntu)}</span></td>
      <td>
        <button class="tablo-buton" data-kalibrasyon-ekle="${c.id}">Kalibrasyon Ekle</button>
        <button class="tablo-buton" data-gecmis="${c.id}">Geçmiş</button>
        <button class="tablo-buton" data-duzenle="${c.id}">Düzenle</button>
        <button class="tablo-buton sil" data-sil="${c.id}">Sil</button>
      </td>
    `;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-duzenle]').forEach(btn => btn.addEventListener('click', () => gocCihazModalAc(gocCihazIdIleGetirRepo(btn.getAttribute('data-duzenle')))));
  govde.querySelectorAll('[data-kalibrasyon-ekle]').forEach(btn => btn.addEventListener('click', () => gocKalibrasyonModalAc(null, btn.getAttribute('data-kalibrasyon-ekle'))));
  govde.querySelectorAll('[data-gecmis]').forEach(btn => btn.addEventListener('click', async () => {
    try { await gocCihazGecmisiniYazdir(btn.getAttribute('data-gecmis')); } catch (hata) { console.error(hata); alert('Yazdırılamadı: ' + (hata.message || hata)); }
  }));
  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', async () => {
    if (await onayModali('Bu cihazı ve tüm kalibrasyon geçmişini silmek istediğinize emin misiniz?', 'Sil')) { gocCihazSil(btn.getAttribute('data-sil')); gocCihazlariCiz(document.getElementById('gocCihazAramaKutusu').value); }
  }));
}

function gocCihazModalAc(kayit) {
  _duzenlenenGocCihazId = kayit ? kayit.id : null;
  document.getElementById('gocCihazModalBaslik').textContent = kayit ? (kayit.cihazNo + ' Kaydını Düzenle') : 'Yeni Gaz Ölçüm Cihazı';

  document.getElementById('gocAd').value = kayit ? kayit.ad : '';
  document.getElementById('gocTur').innerHTML = GOC_TURLERI.map(t => `<option ${kayit && kayit.tur === t ? 'selected' : ''}>${t}</option>`).join('');
  document.getElementById('gocMarka').value = kayit ? kayit.marka : '';
  document.getElementById('gocModel').value = kayit ? kayit.model : '';
  document.getElementById('gocSeriNo').value = kayit ? kayit.seriNo : '';
  document.getElementById('gocImalYili').value = kayit ? kayit.imalYili : '';
  document.getElementById('gocOlculenGazlar').value = kayit ? kayit.olculenGazlar : '';
  document.getElementById('gocBolum').value = kayit ? kayit.bolum : '';
  document.getElementById('gocLokasyon').value = kayit ? kayit.lokasyon : '';
  document.getElementById('gocSorumluPersonel').value = kayit ? kayit.sorumluPersonel : '';
  document.getElementById('gocPeriyotAy').value = kayit ? kayit.periyotAy : GOC_VARSAYILAN_AY;
  document.getElementById('gocDurum').innerHTML = GOC_DURUMLARI.map(d => `<option ${kayit && kayit.durum === d ? 'selected' : ''}>${d}</option>`).join('');
  document.getElementById('gocSonKalibrasyonTarihi').value = kayit ? kayit.sonKalibrasyonTarihi : '';
  document.getElementById('gocSonrakiKalibrasyonTarihi').value = kayit ? kayit.sonrakiKalibrasyonTarihi : '';
  document.getElementById('gocNotlar').value = kayit ? kayit.notlar : '';

  document.querySelectorAll('#gocCihazForm .alan-hatasi').forEach(el => el.textContent = '');
  document.getElementById('gocCihazModalKatman').classList.add('acik');
}

function gocCihazModalKapat() {
  document.getElementById('gocCihazModalKatman').classList.remove('acik');
  _duzenlenenGocCihazId = null;
}

function gocCihazFormGonderildi(e) {
  e.preventDefault();
  document.querySelectorAll('#gocCihazForm .alan-hatasi').forEach(el => el.textContent = '');

  const veriler = {
    ad: document.getElementById('gocAd').value,
    tur: document.getElementById('gocTur').value,
    marka: document.getElementById('gocMarka').value,
    model: document.getElementById('gocModel').value,
    seriNo: document.getElementById('gocSeriNo').value,
    imalYili: document.getElementById('gocImalYili').value,
    olculenGazlar: document.getElementById('gocOlculenGazlar').value,
    bolum: document.getElementById('gocBolum').value,
    lokasyon: document.getElementById('gocLokasyon').value,
    sorumluPersonel: document.getElementById('gocSorumluPersonel').value,
    periyotAy: document.getElementById('gocPeriyotAy').value,
    durum: document.getElementById('gocDurum').value,
    sonKalibrasyonTarihi: document.getElementById('gocSonKalibrasyonTarihi').value,
    sonrakiKalibrasyonTarihi: document.getElementById('gocSonrakiKalibrasyonTarihi').value,
    notlar: document.getElementById('gocNotlar').value
  };

  const sonuc = _duzenlenenGocCihazId ? gocCihazGuncelle(_duzenlenenGocCihazId, veriler) : gocCihazEkle(veriler);
  if (!sonuc.basarili) {
    Object.keys(sonuc.hatalar || {}).forEach(alan => {
      const hataEl = document.getElementById('goc' + alan.charAt(0).toUpperCase() + alan.slice(1) + 'Hata');
      if (hataEl) hataEl.textContent = sonuc.hatalar[alan];
    });
    return;
  }

  gocCihazModalKapat();
  gocCihazlariCiz(document.getElementById('gocCihazAramaKutusu').value);
}

// ==================== KALİBRASYON KAYITLARI ====================

function gocKalibrasyonlariCiz(aramaMetni) {
  const govde = document.getElementById('gocKalibrasyonTabloGovde');
  const bosDurum = document.getElementById('gocKalibrasyonBosDurum');
  const liste = gocKalibrasyonlariGetir(aramaMetni);

  govde.innerHTML = '';
  if (!liste.length) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = 'Eşleşen kalibrasyon kaydı bulunamadı.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  liste.forEach(k => {
    const satir = document.createElement('tr');
    satir.innerHTML = `
      <td>${_adKacir(k.cihazAdi)} <span style="color:var(--metin-soluk); font-size:11px;">(${k.cihazNo})</span></td>
      <td>${gunAyYil(k.kalibrasyonTarihi)}</td>
      <td>${_adKacir(k.tur)}</td>
      <td>${_adKacir(k.raporNo) || '-'}</td>
      <td>${_adKacir(k.firma)}</td>
      <td>${_adKacir(k.uzman) || '-'}</td>
      <td><span class="genel-rozet rozet-${gocRozetSinifAdi(k.sonuc)}">${_adKacir(k.sonuc)}</span></td>
      <td>
        <button class="tablo-buton" data-duzenle="${k.id}">Düzenle</button>
        <button class="tablo-buton sil" data-sil="${k.id}">Sil</button>
      </td>
    `;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-duzenle]').forEach(btn => btn.addEventListener('click', () => gocKalibrasyonModalAc(gocKalibrasyonIdIleGetirRepo(btn.getAttribute('data-duzenle')))));
  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', async () => {
    if (await onayModali('Bu kalibrasyon kaydını silmek istediğinize emin misiniz?', 'Sil')) { gocKalibrasyonSil(btn.getAttribute('data-sil')); gocKalibrasyonlariCiz(document.getElementById('gocKalibrasyonAramaKutusu').value); gocCihazlariCiz(document.getElementById('gocCihazAramaKutusu').value); }
  }));
}

function gocKalibrasyonModalAc(kayit, onSecilenCihazId) {
  _duzenlenenGocKalibrasyonId = kayit ? kayit.id : null;
  document.getElementById('gocKalibrasyonModalBaslik').textContent = kayit ? 'Kalibrasyon Kaydını Düzenle' : 'Yeni Kalibrasyon Kaydı';

  const cihazlar = gocCihazTumunuGetirRepo();
  const seciliId = kayit ? kayit.cihazId : (onSecilenCihazId || '');
  document.getElementById('gocKoCihazId').innerHTML = '<option value="">Seçiniz</option>' +
    cihazlar.map(c => `<option value="${c.id}" ${seciliId === c.id ? 'selected' : ''}>${c.cihazNo} - ${_adKacir(c.ad)}</option>`).join('');

  document.getElementById('gocKoKalibrasyonTarihi').value = kayit ? kayit.kalibrasyonTarihi : gocBugunIso();
  document.getElementById('gocKoTur').innerHTML = GOC_KALIBRASYON_TURLERI.map(t => `<option ${kayit && kayit.tur === t ? 'selected' : ''}>${t}</option>`).join('');
  document.getElementById('gocKoRaporNo').value = kayit ? kayit.raporNo : '';
  document.getElementById('gocKoSonuc').innerHTML = GOC_SONUCLAR.map(s => `<option ${kayit && kayit.sonuc === s ? 'selected' : ''}>${s}</option>`).join('');
  document.getElementById('gocKoFirma').value = kayit ? kayit.firma : '';
  document.getElementById('gocKoUzman').value = kayit ? kayit.uzman : '';
  document.getElementById('gocKoAciklama').value = kayit ? kayit.aciklama : '';
  _gocKalibrasyonBelgesi = kayit ? (kayit.belgeGorseli || '') : '';
  _gocKalibrasyonBelgeOnizlemeCiz();

  document.querySelectorAll('#gocKalibrasyonForm .alan-hatasi').forEach(el => el.textContent = '');
  document.getElementById('gocKalibrasyonModalKatman').classList.add('acik');
}

function gocKalibrasyonModalKapat() {
  document.getElementById('gocKalibrasyonModalKatman').classList.remove('acik');
  _duzenlenenGocKalibrasyonId = null;
}

function gocKalibrasyonFormGonderildi(e) {
  e.preventDefault();
  document.querySelectorAll('#gocKalibrasyonForm .alan-hatasi').forEach(el => el.textContent = '');

  const veriler = {
    cihazId: document.getElementById('gocKoCihazId').value,
    kalibrasyonTarihi: document.getElementById('gocKoKalibrasyonTarihi').value,
    tur: document.getElementById('gocKoTur').value,
    raporNo: document.getElementById('gocKoRaporNo').value,
    sonuc: document.getElementById('gocKoSonuc').value,
    firma: document.getElementById('gocKoFirma').value,
    uzman: document.getElementById('gocKoUzman').value,
    aciklama: document.getElementById('gocKoAciklama').value,
    belgeGorseli: _gocKalibrasyonBelgesi
  };

  const sonuc = _duzenlenenGocKalibrasyonId ? gocKalibrasyonGuncelle(_duzenlenenGocKalibrasyonId, veriler) : gocKalibrasyonEkle(veriler);
  if (!sonuc.basarili) {
    Object.keys(sonuc.hatalar || {}).forEach(alan => {
      const hataEl = document.getElementById('gocKo' + alan.charAt(0).toUpperCase() + alan.slice(1) + 'Hata');
      if (hataEl) hataEl.textContent = sonuc.hatalar[alan];
    });
    return;
  }

  gocKalibrasyonModalKapat();
  gocKalibrasyonlariCiz(document.getElementById('gocKalibrasyonAramaKutusu').value);
  gocCihazlariCiz(document.getElementById('gocCihazAramaKutusu').value);
}
