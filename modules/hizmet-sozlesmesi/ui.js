// Hizmet Sözleşmeleri ekranının DOM işlemleri.

let _hsDuzenlenenKayitId = null;
let _hsSozlesmeBelgesi = '';

function _hsKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

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

let _hsGorunum = 'kayitlar';

function _hsGorunumDegistir(gorunum) {
  _hsGorunum = gorunum;
  document.getElementById('bolum-kayitlar').style.display = gorunum === 'kayitlar' ? '' : 'none';
  document.getElementById('bolum-sicil-ozeti').style.display = gorunum === 'sicil-ozeti' ? '' : 'none';
  document.querySelectorAll('.sekme-cubugu button').forEach(btn => {
    btn.classList.toggle('sekme-seciliDegil', btn.getAttribute('data-sekme') !== gorunum);
  });
  if (gorunum === 'sicil-ozeti') sicilOzetiCiz();
}

// Kayıt formundaki "Hizmet Verilen Firma" seçici — bu firmanın Personel
// modülünden değil doğrudan Firma Yönetimi'nden gelen listesi (kullanıcı
// isteği: "her hizmet sözleşmesi kaydına hangi firma alanı eklensin").
function _hsFirmaSeciciDoldur() {
  document.getElementById('hizmetFirmaId').innerHTML = '<option value="">— Bağlantısız —</option>' +
    getFirmalar().map(f => `<option value="${f.id}">${_hsKacir(f.ad)}</option>`).join('');
}

function hizmetSozlesmesiSayfasiniBaslat() {
  document.querySelectorAll('.sekme-cubugu button').forEach(btn => {
    btn.addEventListener('click', () => _hsGorunumDegistir(btn.getAttribute('data-sekme')));
  });
  _hsFirmaSeciciDoldur();
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

  // ---- Sicil Özeti ----
  document.getElementById('soSicilModalIptalBtn').addEventListener('click', _soSicilModalKapat);
  document.getElementById('soSicilModalKapatBtn').addEventListener('click', _soSicilModalKapat);
  document.getElementById('soSicilModalKaydetBtn').addEventListener('click', _soSicilModalKaydet);
  document.getElementById('soSablonIndirBtn').addEventListener('click', () => {
    excelSablonIndir(HS_SICIL_OZETI_KOLONLARI, 'sicil_ozeti_sablonu.xlsx');
  });
  document.getElementById('soDisaAktarBtn').addEventListener('click', _sicilOzetiExcelDisaAktar);
  document.getElementById('soIceAktarBtn').addEventListener('click', () => document.getElementById('soIceAktarDosya').click());
  document.getElementById('soIceAktarDosya').addEventListener('change', e => {
    const dosya = e.target.files[0];
    _sicilOzetiExcelIceAktar(dosya, () => { e.target.value = ''; sicilOzetiCiz(); });
  });

  hsOzetiCiz();
  hsKayitlariCiz('');
}

const HIZMET_SOZLESMESI_IMPORT_KOLONLARI = [
  { anahtar: 'gorevTuru', baslik: 'Görev Türü' },
  { anahtar: 'adSoyad', baslik: 'Ad Soyad' },
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
      <td>${_hsKacir(k.sozlesmeNo)}<br><small style="color:var(--metin-soluk);">${_hsKacir(k.gorevTuru)}</small></td>
      <td>${_hsKacir(k.adSoyad)}</td>
      <td>${_hsKacir(k.belgeSinifi) || '-'}</td>
      <td>${gunAyYil(k.sozlesmeBaslangicTarihi) || '-'}</td>
      <td>${gunAyYil(k.sozlesmeBitisTarihi) || '-'}</td>
      <td>${_hsKacir(k.ayrilanSure) || '-'}</td>
      <td>${_hsBelgeHucresiUret(k.sozlesmeBelgesi)}</td>
      <td><span class="genel-rozet rozet-${hsRozetSinifAdi(k.durum)}">${_hsKacir(k.durum)}</span></td>
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
  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', async () => {
    if (await onayModali('Bu sözleşme kaydını silmek istediğinize emin misiniz?', 'Sil')) { hizmetSozlesmesiSil(btn.getAttribute('data-sil')); hsKayitlariCiz(document.getElementById('aramaKutusu').value); }
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
  document.getElementById('belgeSinifi').value = kayit ? kayit.belgeSinifi : '';
  document.getElementById('sozlesmeBaslangicTarihi').value = kayit ? kayit.sozlesmeBaslangicTarihi : bugunIso();
  document.getElementById('sozlesmeBitisTarihi').value = kayit ? kayit.sozlesmeBitisTarihi : '';
  document.getElementById('ayrilanSure').value = kayit ? kayit.ayrilanSure : '';
  document.getElementById('ayrilanDakika').value = kayit && kayit.ayrilanDakika ? kayit.ayrilanDakika : '';
  _hsFirmaSeciciDoldur();
  document.getElementById('hizmetFirmaId').value = kayit ? (kayit.firmaId || '') : '';
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
    belgeSinifi: document.getElementById('belgeSinifi').value,
    sozlesmeBaslangicTarihi: document.getElementById('sozlesmeBaslangicTarihi').value,
    sozlesmeBitisTarihi: document.getElementById('sozlesmeBitisTarihi').value,
    ayrilanSure: document.getElementById('ayrilanSure').value,
    ayrilanDakika: document.getElementById('ayrilanDakika').value,
    firmaId: document.getElementById('hizmetFirmaId').value,
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

// ==================== SİCİL ÖZETİ (firma bazlı yasal uygunluk raporu) ====================
// Kullanıcı isteği: "hizmet sözleşmeleri tarafına birebir bu excel
// çıktısını verecek ve bu exeli aktaracak altyapı hazırla" — yüklenen
// örnek raporla (başlık satırları, "Gerekli: X dk/ay · Atanan: Y dk/ay"
// paketlenmiş hücreler, "Kapsam Dışı" durumu) birebir aynı görünüm ve
// aynı yapıda içe/dışa aktarma.

function _soDakikaFormatla(dakika) {
  return Number(dakika || 0).toLocaleString('tr-TR');
}

// "1.780" (TR binlik ayraç) veya "1780" -> 1780.
function _soDakikaCoz(metin) {
  const temiz = String(metin || '').replace(/[^\d]/g, '');
  return parseInt(temiz, 10) || 0;
}

function _soGorevOzetSatirlari(gorevOzeti) {
  const isimler = gorevOzeti.gorevliler.map(g => g.adSoyad).filter(Boolean).join(', ') || '-';
  const sinif = gorevOzeti.gorevliler.map(g => g.belgeSinifi).filter(Boolean).join(', ');
  const durumMetni = gorevOzeti.kapsamDisiMi ? 'Kapsam Dışı' : (gorevOzeti.uygunMu ? 'Uygun' : 'Yetersiz');
  const satirlar = [isimler];
  if (sinif) satirlar.push(sinif);
  satirlar.push(`Gerekli: ${_soDakikaFormatla(gorevOzeti.gerekliDakika)} dk/ay · Atanan: ${_soDakikaFormatla(gorevOzeti.atananDakika)} dk/ay`);
  satirlar.push(durumMetni);
  return satirlar;
}

function _soGorevHucresiHtml(gorevOzeti) {
  const satirlar = _soGorevOzetSatirlari(gorevOzeti);
  const renk = gorevOzeti.kapsamDisiMi ? 'var(--metin-soluk)' : (gorevOzeti.uygunMu ? '#15803d' : '#b91c1c');
  return satirlar.map((s, i) => i === satirlar.length - 1
    ? `<span style="color:${renk}; font-weight:700;">${_hsKacir(s)}</span>`
    : `<span>${_hsKacir(s)}</span>`
  ).join('<br>');
}

function _soPdfBelgeleriHtml(gorevOzeti, etiket) {
  const belgeliGorevliler = gorevOzeti.gorevliler.filter(g => g.sozlesmeBelgesi);
  if (!belgeliGorevliler.length) return '';
  return belgeliGorevliler.map(g => `<a href="#" data-belge-goster="${_hsKacir(g.sozlesmeBelgesi)}" style="font-size:11px;">${etiket} PDF</a>`).join('<br>');
}

function sicilOzetiCiz() {
  const govde = document.getElementById('soTabloGovde');
  const bosDurum = document.getElementById('soBosDurum');
  const liste = hizmetSozlesmesiSicilOzetiHesapla();

  govde.innerHTML = '';
  if (!liste.length) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = 'Henüz bir hizmet sözleşmesi kaydı bir firmaya bağlanmadı. Kayıtlar sekmesinde "Hizmet Verilen Firma" alanını doldurun.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  const gorevEtiketleri = { 'İSG Uzmanı': 'İG Uzmanı', 'İşyeri Hekimi': 'Hekim', 'Diğer Sağlık Personeli': 'DSP' };

  liste.forEach((satirVerisi, i) => {
    const satir = document.createElement('tr');
    const [isg, hekim, dsp] = satirVerisi.gorevOzetleri;
    const pdfHucreleri = satirVerisi.gorevOzetleri.map(g => _soPdfBelgeleriHtml(g, gorevEtiketleri[g.gorevTuru])).filter(Boolean).join('<br>');
    satir.innerHTML = `
      <td>${i + 1}</td>
      <td>${_hsKacir(satirVerisi.firma.ad)}</td>
      <td>${_hsKacir(satirVerisi.sicilNo) || '-'}</td>
      <td>${_hsKacir(satirVerisi.iseverenVekili) || '-'}</td>
      <td>${_soGorevHucresiHtml(isg)}</td>
      <td>${_soGorevHucresiHtml(hekim)}</td>
      <td>${_soGorevHucresiHtml(dsp)}</td>
      <td>${satirVerisi.personelSayisi}<br><small style="color:var(--metin-soluk);">${_hsKacir(satirVerisi.tehlikeSinifi)}</small></td>
      <td>
        <span style="font-weight:700; color:${satirVerisi.tumuUygunMu ? '#15803d' : '#b91c1c'};">${satirVerisi.tumuUygunMu ? 'Uygun' : 'Yetersiz'}</span><br>
        <small style="color:var(--metin-soluk);">${satirVerisi.tumuUygunMu ? 'Atama süreleri uygun.' : 'Eksik görevli/süre var.'}</small>
        ${pdfHucreleri ? '<br>' + pdfHucreleri : ''}
      </td>
      <td><button type="button" class="tablo-buton" data-sicil-duzenle="${satirVerisi.firma.id}">Sicil Bilgileri</button></td>
    `;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-sicil-duzenle]').forEach(btn => {
    btn.addEventListener('click', () => _soSicilModalAc(btn.getAttribute('data-sicil-duzenle')));
  });
  govde.querySelectorAll('[data-belge-goster]').forEach(a => {
    a.addEventListener('click', async e => {
      e.preventDefault();
      const url = await fotoBuyukCoz(a.getAttribute('data-belge-goster'));
      if (url) window.open(url, '_blank');
    });
  });
}

let _soDuzenlenenFirmaId = null;

function _soSicilModalAc(firmaId) {
  _soDuzenlenenFirmaId = firmaId;
  const firma = getFirmaById(firmaId);
  if (!firma) return;
  document.getElementById('soSicilModalBaslik').textContent = firma.ad + ' — Sicil Bilgileri';
  const sicil = firma.sicilBilgileri || { sicilNo: '', iseverenVekili: '', personelSayisi: 0 };
  document.getElementById('soSicilNo').value = sicil.sicilNo || '';
  document.getElementById('soIseverenVekili').value = sicil.iseverenVekili || '';
  document.getElementById('soPersonelSayisi').value = sicil.personelSayisi || '';
  document.getElementById('soSicilModalKatman').classList.add('acik');
}

function _soSicilModalKapat() {
  document.getElementById('soSicilModalKatman').classList.remove('acik');
  _soDuzenlenenFirmaId = null;
}

function _soSicilModalKaydet() {
  if (!_soDuzenlenenFirmaId) return;
  firmaSicilBilgileriAyarla(_soDuzenlenenFirmaId, {
    sicilNo: document.getElementById('soSicilNo').value,
    iseverenVekili: document.getElementById('soIseverenVekili').value,
    personelSayisi: document.getElementById('soPersonelSayisi').value
  });
  _soSicilModalKapat();
  sicilOzetiCiz();
}

// İçe aktarma şablonu — kullanıcı isteği doğrultusunda, HESAPLANAN
// sütunlar (Gerekli/Atanan/Uygunluk) asla içe aktarılmaz, sadece ham
// atama verisi (kim, hangi firma, kaç dakika) alınır; gerekli/uygunluk
// içe aktarım sonrasında YENİDEN hesaplanır.
const HS_SICIL_OZETI_KOLONLARI = [
  { anahtar: 'firmaAdi', baslik: 'Sicil / Firma' },
  { anahtar: 'sicilNo', baslik: 'Sicil No' },
  { anahtar: 'iseverenVekili', baslik: 'İşveren Vekili' },
  { anahtar: 'tehlikeSinifi', baslik: 'Tehlike Sınıfı' },
  { anahtar: 'personelSayisi', baslik: 'Personel Sayısı' },
  { anahtar: 'isgUzmaniAdSoyad', baslik: 'İSG Uzmanı Ad Soyad' },
  { anahtar: 'isgUzmaniSinifi', baslik: 'İSG Uzmanı Sınıfı' },
  { anahtar: 'isgUzmaniAtananDakika', baslik: 'İSG Uzmanı Atanan dk/ay' },
  { anahtar: 'hekimAdSoyad', baslik: 'İşyeri Hekimi Ad Soyad' },
  { anahtar: 'hekimAtananDakika', baslik: 'İşyeri Hekimi Atanan dk/ay' },
  { anahtar: 'dspAdSoyad', baslik: 'DSP Ad Soyad' },
  { anahtar: 'dspAtananDakika', baslik: 'DSP Atanan dk/ay' }
];

// Rapor başlık satırlarını (title/subtitle/rapor tarihi) içeren, kullanıcının
// paylaştığı örnekle birebir aynı yapıda bir Excel üretir — core/excel.js'teki
// genel excelDisaAktar sadece düz başlık+satır dökümü yaptığından burada
// doğrudan SheetJS (aoa_to_sheet) kullanılıyor.
function _sicilOzetiExcelDisaAktar() {
  const liste = hizmetSozlesmesiSicilOzetiHesapla();
  xlsxHazirOlduğunda(() => {
    const simdi = new Date();
    const tarihMetni = simdi.toLocaleDateString('tr-TR') + ' ' + simdi.toLocaleTimeString('tr-TR');
    const basSatirlar = [
      ['Hizmet Sözleşmeleri'],
      ['Sicil bazında İSG profesyoneli atama dakikası, yasal süre hesabı ve uygunluk değerlendirmesi.'],
      [`Rapor Tarihi: ${tarihMetni}   |   Kayıt Sayısı: ${liste.length}`],
      [],
      ['No', 'Sicil / Firma', 'Sicil No', 'İşveren Vekili', 'İSG Uzmanı', 'İşyeri Hekimi', 'DSP', 'Personel / Tehlike', 'Uygunluk Durumu', 'PDF Belgeler']
    ];
    const gorevEtiketleri = { 'İSG Uzmanı': 'İG Uzmanı', 'İşyeri Hekimi': 'Hekim', 'Diğer Sağlık Personeli': 'DSP' };
    const veriSatirlari = liste.map((satirVerisi, i) => {
      const [isg, hekim, dsp] = satirVerisi.gorevOzetleri;
      const pdfMetni = satirVerisi.gorevOzetleri
        .map(g => g.gorevliler.some(gv => gv.sozlesmeBelgesi) ? gorevEtiketleri[g.gorevTuru] + ' PDF' : '')
        .filter(Boolean).join('\n');
      return [
        i + 1,
        satirVerisi.firma.ad,
        satirVerisi.sicilNo,
        satirVerisi.iseverenVekili,
        _soGorevOzetSatirlari(isg).join('\n'),
        _soGorevOzetSatirlari(hekim).join('\n'),
        _soGorevOzetSatirlari(dsp).join('\n'),
        satirVerisi.personelSayisi + '\n' + satirVerisi.tehlikeSinifi,
        (satirVerisi.tumuUygunMu ? 'Uygun' : 'Yetersiz') + '\n' + (satirVerisi.tumuUygunMu ? 'Atama süreleri uygun.' : 'Eksik görevli/süre var.'),
        pdfMetni
      ];
    });
    const ws = XLSX.utils.aoa_to_sheet(basSatirlar.concat(veriSatirlari));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Hizmet Sözleşmeleri');
    XLSX.writeFile(wb, 'ISG_Hizmet_Sozlesmeleri_Ana_Sayfa_Raporu.xlsx');
  });
}

// Kullanıcının paylaştığı ORİJİNAL rapor formatını (başlık satırları +
// paketlenmiş çok satırlı hücreler) da doğrudan içe aktarabilir — böylece
// elde var olan eski raporlar risk360'a taşınabilir. Basit HS_SICIL_OZETI_
// KOLONLARI şablonunu da (düz sütunlu) kabul eder; hangi format olduğu ilk
// satırdaki başlığa bakılarak otomatik anlaşılır.
function _sicilOzetiExcelIceAktar(dosya, tamamlandiCB) {
  if (!dosya) return;
  xlsxHazirOlduğunda(() => {
    const okuyucu = new FileReader();
    okuyucu.onload = e => {
      let ozetSatirlari;
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const sayfa = wb.Sheets[wb.SheetNames[0]];
        const hamSatirlar = XLSX.utils.sheet_to_json(sayfa, { header: 1, defval: '' });
        ozetSatirlari = _sicilRaporSatirlariniAyristir(hamSatirlar);
      } catch (err) {
        alert('Dosya okunamadı. Geçerli bir Excel (.xlsx) dosyası seçtiğinizden emin olun.');
        tamamlandiCB();
        return;
      }
      if (!ozetSatirlari.length) {
        alert('Tanınan bir sicil satırı bulunamadı.');
        tamamlandiCB();
        return;
      }

      let basariliFirma = 0, basariliKayit = 0;
      const hatalar = [];
      ozetSatirlari.forEach((satir, index) => {
        if (!satir.firmaAdi) { hatalar.push(`Satır ${index + 1}: Sicil/Firma adı boş.`); return; }
        let firma = getFirmalar().find(f => f.ad.trim().toLowerCase() === satir.firmaAdi.trim().toLowerCase());
        if (!firma) {
          const eklemeSonucu = firmaEkle(satir.firmaAdi, oturumdakiKullanici().id, TEHLIKE_SINIFLARI.includes(satir.tehlikeSinifi) ? satir.tehlikeSinifi : TEHLIKE_SINIFLARI[0], SEKTORLER[SEKTORLER.length - 1]);
          if (!eklemeSonucu.basarili) { hatalar.push(`Satır ${index + 1}: Firma oluşturulamadı (${eklemeSonucu.hata}).`); return; }
          firma = eklemeSonucu.firma;
        }
        if (TEHLIKE_SINIFLARI.includes(satir.tehlikeSinifi)) firmaTehlikeSinifiAyarla(firma.id, satir.tehlikeSinifi);
        firmaSicilBilgileriAyarla(firma.id, { sicilNo: satir.sicilNo, iseverenVekili: satir.iseverenVekili, personelSayisi: satir.personelSayisi });
        basariliFirma++;

        [
          { gorevTuru: 'İSG Uzmanı', ad: satir.isgUzmaniAdSoyad, sinif: satir.isgUzmaniSinifi, dakika: satir.isgUzmaniAtananDakika },
          { gorevTuru: 'İşyeri Hekimi', ad: satir.hekimAdSoyad, sinif: '', dakika: satir.hekimAtananDakika },
          { gorevTuru: 'Diğer Sağlık Personeli', ad: satir.dspAdSoyad, sinif: '', dakika: satir.dspAtananDakika }
        ].forEach(gorev => {
          if (!gorev.ad) return;
          const sonuc = hizmetSozlesmesiEkle({
            gorevTuru: gorev.gorevTuru,
            adSoyad: gorev.ad,
            belgeSinifi: gorev.sinif,
            sozlesmeBaslangicTarihi: bugunIso(),
            ayrilanDakika: gorev.dakika,
            firmaId: firma.id
          });
          if (sonuc.basarili) basariliKayit++;
          else hatalar.push(`Satır ${index + 1} (${gorev.gorevTuru}): ${Object.values(sonuc.hatalar || {})[0] || 'Bilinmeyen hata'}`);
        });
      });

      let mesaj = `${basariliFirma} sicil işlendi, ${basariliKayit} görevli ataması eklendi.`;
      if (hatalar.length) mesaj += `\n${hatalar.length} satırda sorun oluştu:\n` + hatalar.slice(0, 10).join('\n');
      alert(mesaj);
      hsKayitlariCiz(document.getElementById('aramaKutusu').value);
      tamamlandiCB();
    };
    okuyucu.onerror = () => { alert('Dosya okunamadı.'); tamamlandiCB(); };
    okuyucu.readAsArrayBuffer(dosya);
  });
}

// "Ad Soyad\nSınıf\nGerekli: X dk/ay · Atanan: Y dk/ay\nDurum" paketlenmiş
// hücresinden SADECE ad soyad + sınıf + Atanan dakikayı çıkarır (Gerekli/
// Durum kasıtlı olarak YOK SAYILIR, yeniden hesaplanacak).
function _sicilGorevHucresiniAyristir(hucreMetni) {
  const satirlar = String(hucreMetni || '').split('\n').map(s => s.trim()).filter(Boolean);
  if (!satirlar.length || satirlar[0] === '-') return { adSoyad: '', sinif: '', dakika: 0 };
  const adSoyad = satirlar[0];
  const atananEslesme = String(hucreMetni || '').match(/Atanan:\s*([\d.,]+)\s*dk/i);
  const dakika = atananEslesme ? _soDakikaCoz(atananEslesme[1]) : 0;
  // 2. satır "Gerekli:" ile başlamıyorsa ve "Uygun/Yetersiz/Kapsam Dışı"
  // değilse, bu bir belge sınıfı satırıdır (ör. "A Sınıfı").
  const sinif = (satirlar.length > 2 && !/^Gerekli:/i.test(satirlar[1]) && !/^(Uygun|Yetersiz|Kapsam)/i.test(satirlar[1])) ? satirlar[1] : '';
  return { adSoyad, sinif, dakika };
}

// Ham (header:1) satır dizisini hem "Sicil Özeti Şablonu" (düz sütunlu)
// hem de kullanıcının paylaştığı orijinal rapor formatını (başlık
// satırlı, paketlenmiş hücreli) tanıyıp aynı ara veri yapısına çevirir.
function _sicilRaporSatirlariniAyristir(hamSatirlar) {
  const basliklarSatiriIndex = hamSatirlar.findIndex(satir => satir.some(h => String(h).trim() === 'Sicil / Firma' || String(h).trim() === 'Sicil/Firma'));
  if (basliklarSatiriIndex === -1) return [];
  const basliklar = hamSatirlar[basliklarSatiriIndex].map(h => String(h || '').trim());
  const veriSatirlari = hamSatirlar.slice(basliklarSatiriIndex + 1).filter(satir => satir.some(h => String(h).trim()));

  // Orijinal rapor formatı: "İSG Uzmanı" / "İşyeri Hekimi" / "DSP" paketlenmiş
  // sütunları ve "Personel / Tehlike" birleşik sütunu var.
  const paketliMi = basliklar.includes('İSG Uzmanı') && basliklar.includes('Personel / Tehlike');
  const sutunIndex = ad => basliklar.indexOf(ad);

  if (paketliMi) {
    const iFirma = sutunIndex('Sicil / Firma'), iSicilNo = sutunIndex('Sicil No'), iVekil = sutunIndex('İşveren Vekili'),
      iIsg = sutunIndex('İSG Uzmanı'), iHekim = sutunIndex('İşyeri Hekimi'), iDsp = sutunIndex('DSP'), iPersonel = sutunIndex('Personel / Tehlike');
    return veriSatirlari.map(satir => {
      const isg = _sicilGorevHucresiniAyristir(satir[iIsg]);
      const hekim = _sicilGorevHucresiniAyristir(satir[iHekim]);
      const dsp = _sicilGorevHucresiniAyristir(satir[iDsp]);
      const personelHucresi = String(satir[iPersonel] || '').split('\n').map(s => s.trim()).filter(Boolean);
      const firmaMetni = String(satir[iFirma] || '').split('\n')[0].trim();
      return {
        firmaAdi: firmaMetni,
        sicilNo: String(satir[iSicilNo] || '').trim(),
        iseverenVekili: String(satir[iVekil] || '').split('\n')[0].trim(),
        tehlikeSinifi: personelHucresi[1] || '',
        personelSayisi: _soDakikaCoz(personelHucresi[0] || '0'),
        isgUzmaniAdSoyad: isg.adSoyad, isgUzmaniSinifi: isg.sinif, isgUzmaniAtananDakika: isg.dakika,
        hekimAdSoyad: hekim.adSoyad, hekimAtananDakika: hekim.dakika,
        dspAdSoyad: dsp.adSoyad, dspAtananDakika: dsp.dakika
      };
    });
  }

  // Düz "Şablon İndir" formatı — HS_SICIL_OZETI_KOLONLARI ile birebir.
  const eslesim = _basliktanIndexBul(basliklar, HS_SICIL_OZETI_KOLONLARI);
  return veriSatirlari.map(satir => {
    const deger = anahtar => (eslesim[anahtar] != null ? String(satir[eslesim[anahtar]] ?? '').trim() : '');
    return {
      firmaAdi: deger('firmaAdi'), sicilNo: deger('sicilNo'), iseverenVekili: deger('iseverenVekili'),
      tehlikeSinifi: deger('tehlikeSinifi'), personelSayisi: _soDakikaCoz(deger('personelSayisi')),
      isgUzmaniAdSoyad: deger('isgUzmaniAdSoyad'), isgUzmaniSinifi: deger('isgUzmaniSinifi'), isgUzmaniAtananDakika: _soDakikaCoz(deger('isgUzmaniAtananDakika')),
      hekimAdSoyad: deger('hekimAdSoyad'), hekimAtananDakika: _soDakikaCoz(deger('hekimAtananDakika')),
      dspAdSoyad: deger('dspAdSoyad'), dspAtananDakika: _soDakikaCoz(deger('dspAtananDakika'))
    };
  });
}

function _basliktanIndexBul(basliklar, kolonlar) {
  const eslesim = {};
  kolonlar.forEach(kolon => {
    const index = basliklar.findIndex(b => b === kolon.baslik);
    if (index !== -1) eslesim[kolon.anahtar] = index;
  });
  return eslesim;
}
