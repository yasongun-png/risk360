// Hizmet Sözleşmeleri ekranının DOM işlemleri.

let _hsDuzenlenenKayitId = null;
let _hsSozlesmeBelgesi = '';

function _hsBelgeOnizlemeCiz(url) {
  const kutu = document.getElementById('sozlesmeBelgesiOnizleme');
  kutu.innerHTML = url
    ? `<div style="display:flex; align-items:center; gap:10px;">
         <img data-foto-ref="${url}" style="width:72px; height:72px; object-fit:cover; border-radius:8px; border:1px solid var(--kenarlik);">
         <div>
           <div style="font-size:12px; color:#16a34a; font-weight:600;">✓ Belge eklendi</div>
           <button type="button" class="tablo-buton sil" style="margin-top:4px;">Belgeyi Kaldır</button>
         </div>
       </div>`
    : '<div style="font-size:12px; color:var(--metin-soluk);">Henüz sözleşme belgesi eklenmedi.</div>';
  if (url) {
    kutu.querySelector('button').addEventListener('click', () => { _hsSozlesmeBelgesi = ''; _hsBelgeOnizlemeCiz(''); });
    fotoReferanslariCoz(kutu);
  }
}

function hsRozetSinifAdi(durum) {
  return slugOlustur(durum || '');
}

function hizmetSozlesmesiSayfasiniBaslat() {
  document.getElementById('yeniKayitBtn').addEventListener('click', () => hsKayitModalAc());
  document.getElementById('modalKapatBtn').addEventListener('click', hsKayitModalKapat);
  document.getElementById('modalIptalBtn').addEventListener('click', hsKayitModalKapat);
  document.getElementById('kayitForm').addEventListener('submit', hsFormGonderildi);
  document.getElementById('aramaKutusu').addEventListener('input', e => hsKayitlariCiz(e.target.value));
  document.getElementById('gorevFiltre').addEventListener('change', () => hsKayitlariCiz(document.getElementById('aramaKutusu').value));
  document.getElementById('durumFiltre').addEventListener('change', () => hsKayitlariCiz(document.getElementById('aramaKutusu').value));

  document.getElementById('sozlesmeBelgesiDosya').addEventListener('change', async e => {
    const dosya = e.target.files[0];
    e.target.value = '';
    if (!dosya) return;
    try {
      const sonuc = await fotoYukle(dosya, 'hizmet-sozlesmesi/' + (_hsDuzenlenenKayitId || 'gecici'));
      _hsSozlesmeBelgesi = sonuc.url;
      _hsBelgeOnizlemeCiz(_hsSozlesmeBelgesi);
    } catch (hata) {
      alert(hata.message || 'Belge yüklenemedi.');
    }
  });

  document.getElementById('sablonIndirBtn').addEventListener('click', () => {
    excelSablonIndir(HIZMET_SOZLESMESI_IMPORT_KOLONLARI, 'hizmet_sozlesmeleri_sablonu.xlsx');
  });
  document.getElementById('disaAktarBtn').addEventListener('click', () => {
    excelDisaAktar(_hizmetSozlesmesiExcelSatirlariniHazirla(hizmetSozlesmeleriniGetir('', {})), HIZMET_SOZLESMESI_EXPORT_KOLONLARI, 'hizmet_sozlesmeleri.xlsx');
  });
  document.getElementById('listeYazdirBtn').addEventListener('click', () => {
    const filtreler = { gorevTuru: document.getElementById('gorevFiltre').value, durum: document.getElementById('durumFiltre').value };
    const kayitlar = hizmetSozlesmeleriniGetir(document.getElementById('aramaKutusu').value, filtreler);
    raporListesiYazdir('Hizmet Sözleşmeleri', '', HIZMET_SOZLESMESI_EXPORT_KOLONLARI, _hizmetSozlesmesiExcelSatirlariniHazirla(kayitlar));
  });

  document.getElementById('iceAktarBtn').addEventListener('click', () => document.getElementById('iceAktarDosya').click());
  document.getElementById('iceAktarDosya').addEventListener('change', e => {
    const dosya = e.target.files[0];
    excelIceAktar(dosya, HIZMET_SOZLESMESI_IMPORT_KOLONLARI, (satirlar, hataMesaji) => {
      e.target.value = '';
      if (hataMesaji) { alert(hataMesaji); return; }
      satirlar.forEach(satir => {
        satir.sozlesmeBaslangicTarihi = excelTarihiNormallestir(satir.sozlesmeBaslangicTarihi);
        satir.sozlesmeBitisTarihi = excelTarihiNormallestir(satir.sozlesmeBitisTarihi);
      });
      const sonuc = excelToplulIceAktarSonucOzetle(satirlar, hizmetSozlesmesiEkle);
      alert(excelIceAktarOzetMesaji(sonuc));
      hsKayitlariCiz(document.getElementById('aramaKutusu').value);
    });
  });

  hsOzetiCiz();
  hsKayitlariCiz('');
}

const HIZMET_SOZLESMESI_IMPORT_KOLONLARI = [
  { anahtar: 'gorevTuru', baslik: 'Görev Türü' },
  { anahtar: 'adSoyad', baslik: 'Ad Soyad' },
  { anahtar: 'belgeNo', baslik: 'Belge / Sertifika No' },
  { anahtar: 'belgeSinifi', baslik: 'Belge Sınıfı' },
  { anahtar: 'sozlesmeBaslangicTarihi', baslik: 'Sözleşme Başlangıç Tarihi' },
  { anahtar: 'sozlesmeBitisTarihi', baslik: 'Sözleşme Bitiş Tarihi' },
  { anahtar: 'ayrilanSure', baslik: 'Ayrılan Süre' },
  { anahtar: 'telefon', baslik: 'Telefon' },
  { anahtar: 'eposta', baslik: 'E-posta' }
];

const HIZMET_SOZLESMESI_EXPORT_KOLONLARI = [
  { anahtar: 'sozlesmeNo', baslik: 'Sözleşme No' },
  { anahtar: 'gorevTuru', baslik: 'Görev Türü' },
  { anahtar: 'adSoyad', baslik: 'Ad Soyad' },
  { anahtar: 'belgeNo', baslik: 'Belge / Sertifika No' },
  { anahtar: 'belgeSinifi', baslik: 'Belge Sınıfı' },
  { anahtar: 'baslangicGoruntu', baslik: 'Başlangıç' },
  { anahtar: 'bitisGoruntu', baslik: 'Bitiş' },
  { anahtar: 'ayrilanSure', baslik: 'Ayrılan Süre' },
  { anahtar: 'durum', baslik: 'Durum' }
];

function _hizmetSozlesmesiExcelSatirlariniHazirla(kayitlar) {
  return kayitlar.map(k => Object.assign({}, k, {
    baslangicGoruntu: gunAyYil(k.sozlesmeBaslangicTarihi),
    bitisGoruntu: gunAyYil(k.sozlesmeBitisTarihi)
  }));
}

async function hizmetSozlesmesiniYazdir(id) {
  const k = hizmetSozlesmesiIdIleGetirRepo(id);
  if (!k) return;
  const sozlesmeBelgesiUrl = await fotoBuyukCoz(k.sozlesmeBelgesi);
  raporKartiYazdir('HİZMET SÖZLEŞMESİ — ' + k.sozlesmeNo, '', [
    { etiket: 'Görev Türü', deger: k.gorevTuru },
    { etiket: 'Ad Soyad', deger: k.adSoyad },
    { etiket: 'Belge / Sertifika No', deger: k.belgeNo },
    { etiket: 'Belge Sınıfı', deger: k.belgeSinifi },
    { etiket: 'Sözleşme Başlangıç / Bitiş', deger: [gunAyYil(k.sozlesmeBaslangicTarihi), gunAyYil(k.sozlesmeBitisTarihi)].filter(Boolean).join(' / ') },
    { etiket: 'Ayrılan Süre', deger: k.ayrilanSure },
    { etiket: 'Telefon / E-posta', deger: [k.telefon, k.eposta].filter(Boolean).join(' / ') },
    { etiket: 'Durum', deger: k.durum },
    { etiket: 'Not', deger: k.notlar }
  ], [
    { etiket: 'Sözleşme Belgesi', url: sozlesmeBelgesiUrl }
  ]);
}

function _hsBelgeHucresiUret(url) {
  return url ? `<img data-foto-ref="${url}" title="Sözleşme Belgesi" style="width:32px; height:32px; object-fit:cover; border-radius:6px;">` : '-';
}

function hsKayitlariCiz(aramaMetni) {
  const govde = document.getElementById('tabloGovde');
  const bosDurum = document.getElementById('bosDurum');
  const filtreler = {
    gorevTuru: document.getElementById('gorevFiltre').value,
    durum: document.getElementById('durumFiltre').value
  };
  const kayitlar = hizmetSozlesmeleriniGetir(aramaMetni, filtreler);

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
      <td>${k.sozlesmeNo}<br><small style="color:var(--metin-soluk);">${k.gorevTuru}</small></td>
      <td>${k.adSoyad}</td>
      <td>${k.belgeNo || '-'}${k.belgeSinifi ? ' — ' + k.belgeSinifi : ''}</td>
      <td>${gunAyYil(k.sozlesmeBaslangicTarihi) || '-'}</td>
      <td>${gunAyYil(k.sozlesmeBitisTarihi) || '-'}</td>
      <td>${k.ayrilanSure || '-'}</td>
      <td>${_hsBelgeHucresiUret(k.sozlesmeBelgesi)}</td>
      <td><span class="genel-rozet rozet-${hsRozetSinifAdi(k.durum)}">${k.durum}</span></td>
      <td>
        <button class="tablo-buton" data-duzenle="${k.id}">Düzenle</button>
        <button class="tablo-buton" data-yazdir="${k.id}">Yazdır</button>
        <button class="tablo-buton sil" data-sil="${k.id}">Sil</button>
      </td>
    `;
    govde.appendChild(satir);
  });
  fotoReferanslariCoz(govde);

  govde.querySelectorAll('[data-duzenle]').forEach(btn => btn.addEventListener('click', () => hsKayitModalAc(hizmetSozlesmesiIdIleGetirRepo(btn.getAttribute('data-duzenle')))));
  govde.querySelectorAll('[data-yazdir]').forEach(btn => btn.addEventListener('click', () => hizmetSozlesmesiniYazdir(btn.getAttribute('data-yazdir'))));
  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', () => {
    if (confirm('Bu sözleşme kaydını silmek istediğinize emin misiniz?')) { hizmetSozlesmesiSil(btn.getAttribute('data-sil')); hsKayitlariCiz(document.getElementById('aramaKutusu').value); }
  }));
}

function hsOzetiCiz() {
  const ozet = hizmetSozlesmesiOzetiHesapla();
  const kutu = document.getElementById('ozetKutusu');
  const kart = (etiket, deger) => `<div class="istatistik-kutu"><span>${etiket}</span><b>${deger}</b></div>`;

  kutu.innerHTML = `
    <div class="istatistik-grid">
      ${kart('Toplam Sözleşme', ozet.toplam)}
      ${kart('Aktif', ozet.aktif)}
      ${kart('Yenileme Yaklaşan', ozet.yaklasiyor)}
      ${kart('Süresi Geçen', ozet.suresiGecti)}
    </div>
    <div class="istatistik-grid">
      ${ozet.gorevTuruneGore.map(g => kart(g.gorevTuru, g.sayi)).join('')}
    </div>
  `;
}

function hsKayitModalAc(kayit) {
  _hsDuzenlenenKayitId = kayit ? kayit.id : null;
  document.getElementById('modalBaslik').textContent = kayit ? (kayit.sozlesmeNo + ' Kaydını Düzenle') : 'Yeni Hizmet Sözleşmesi';

  document.getElementById('gorevTuru').innerHTML = HIZMET_GOREV_TURLERI.map(g => `<option ${kayit && kayit.gorevTuru === g ? 'selected' : ''}>${g}</option>`).join('');
  document.getElementById('adSoyad').value = kayit ? kayit.adSoyad : '';
  document.getElementById('belgeNo').value = kayit ? kayit.belgeNo : '';
  document.getElementById('belgeSinifi').value = kayit ? kayit.belgeSinifi : '';
  document.getElementById('sozlesmeBaslangicTarihi').value = kayit ? kayit.sozlesmeBaslangicTarihi : bugunIso();
  document.getElementById('sozlesmeBitisTarihi').value = kayit ? kayit.sozlesmeBitisTarihi : '';
  document.getElementById('ayrilanSure').value = kayit ? kayit.ayrilanSure : '';
  document.getElementById('telefon').value = kayit ? kayit.telefon : '';
  document.getElementById('eposta').value = kayit ? kayit.eposta : '';
  document.getElementById('notlar').value = kayit ? kayit.notlar : '';
  document.getElementById('durum').innerHTML = '<option value="">Otomatik</option>' + HIZMET_SOZLESME_DURUMLARI.map(d => `<option ${kayit && kayit.durum === d ? 'selected' : ''}>${d}</option>`).join('');

  _hsSozlesmeBelgesi = kayit ? (kayit.sozlesmeBelgesi || '') : '';
  _hsBelgeOnizlemeCiz(_hsSozlesmeBelgesi);

  hsTemizleFormHatalari();
  document.getElementById('modalKatman').classList.add('acik');
}

function hsKayitModalKapat() {
  document.getElementById('modalKatman').classList.remove('acik');
  _hsDuzenlenenKayitId = null;
}

function hsTemizleFormHatalari() {
  document.querySelectorAll('#kayitForm .alan-hatasi').forEach(el => el.textContent = '');
}

function hsFormGonderildi(e) {
  e.preventDefault();
  hsTemizleFormHatalari();

  const veriler = {
    gorevTuru: document.getElementById('gorevTuru').value,
    adSoyad: document.getElementById('adSoyad').value,
    belgeNo: document.getElementById('belgeNo').value,
    belgeSinifi: document.getElementById('belgeSinifi').value,
    sozlesmeBaslangicTarihi: document.getElementById('sozlesmeBaslangicTarihi').value,
    sozlesmeBitisTarihi: document.getElementById('sozlesmeBitisTarihi').value,
    ayrilanSure: document.getElementById('ayrilanSure').value,
    telefon: document.getElementById('telefon').value,
    eposta: document.getElementById('eposta').value,
    notlar: document.getElementById('notlar').value,
    durum: document.getElementById('durum').value,
    sozlesmeBelgesi: _hsSozlesmeBelgesi
  };

  const sonuc = _hsDuzenlenenKayitId ? hizmetSozlesmesiGuncelle(_hsDuzenlenenKayitId, veriler) : hizmetSozlesmesiEkle(veriler);
  if (!sonuc.basarili) {
    Object.keys(sonuc.hatalar).forEach(alan => {
      const hataEl = document.getElementById(alan + 'Hata');
      if (hataEl) hataEl.textContent = sonuc.hatalar[alan];
    });
    return;
  }

  hsKayitModalKapat();
  hsKayitlariCiz(document.getElementById('aramaKutusu').value);
  hsOzetiCiz();
}
