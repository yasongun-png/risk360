// Yüklenici Yönetimi ekranının DOM işlemleri.

let _ykGorunum = 'firmalar';
let _duzenlenenFirmaId = null;
let _duzenlenenKisiId = null;
let _duzenlenenAracId = null;
let _firmaEvrakTaslak = [];
let _kisiBelgeTaslak = {};

function ykRozetSinifAdi(durum) {
  return slugOlustur(durum || '');
}

function _ykKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// YYYY-MM-DD -> GG.AA.YYYY (eski uygulamadaki fmtTR ile aynı gösterim).
function formatTarihGoster(isoTarih) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoTarih || '')) return '-';
  const [y, a, g] = isoTarih.split('-');
  return `${g}.${a}.${y}`;
}

function yukleniciSayfasiniBaslat() {
  document.querySelectorAll('[data-sekme]').forEach(btn => btn.addEventListener('click', () => gorunumDegistir(btn.getAttribute('data-sekme'))));

  document.getElementById('yeniFirmaBtn').addEventListener('click', () => firmaModalAc());
  document.getElementById('firmaModalKapatBtn').addEventListener('click', firmaModalKapat);
  document.getElementById('firmaModalIptalBtn').addEventListener('click', firmaModalKapat);
  document.getElementById('firmaForm').addEventListener('submit', firmaFormGonderildi);
  document.getElementById('firmaAramaKutusu').addEventListener('input', e => firmalariCiz(e.target.value));
  document.getElementById('firmaEvrakEkleBtn').addEventListener('click', () => { _firmaEvrakTaslak.push(evrakOlustur({})); evrakListesiniCiz('firmaEvrakListesi', _firmaEvrakTaslak); });

  document.getElementById('yeniKisiBtn').addEventListener('click', () => kisiModalAc());
  document.getElementById('kisiModalKapatBtn').addEventListener('click', kisiModalKapat);
  document.getElementById('kisiModalIptalBtn').addEventListener('click', kisiModalKapat);
  document.getElementById('kisiForm').addEventListener('submit', kisiFormGonderildi);
  document.getElementById('kisiAramaKutusu').addEventListener('input', e => kisileriCiz(e.target.value));
  document.getElementById('kisiDurumFiltre').addEventListener('change', () => kisileriCiz(document.getElementById('kisiAramaKutusu').value));
  document.getElementById('kisiTehlikeSinifi').addEventListener('change', _kisiBelgeListesiniCiz);
  document.getElementById('kisiPersonelTuru').addEventListener('change', _kisiBelgeListesiniCiz);
  document.getElementById('kisiIlkGiris').addEventListener('change', _kisiCanliDurumuGuncelle);

  document.getElementById('firmaSablonIndirBtn').addEventListener('click', () => {
    excelSablonIndir(YUKLENICI_FIRMA_IMPORT_KOLONLARI, 'yuklenici_firma_sablonu.xlsx');
  });
  document.getElementById('firmaDisaAktarBtn').addEventListener('click', () => {
    excelDisaAktar(yukleniciFirmalariniGetir(''), YUKLENICI_FIRMA_EXPORT_KOLONLARI, 'yuklenici_firmalari.xlsx');
  });
  document.getElementById('firmaIceAktarBtn').addEventListener('click', () => document.getElementById('firmaIceAktarDosya').click());
  document.getElementById('firmaIceAktarDosya').addEventListener('change', e => {
    const dosya = e.target.files[0];
    excelIceAktar(dosya, YUKLENICI_FIRMA_IMPORT_KOLONLARI, (satirlar, hataMesaji) => {
      e.target.value = '';
      if (hataMesaji) { alert(hataMesaji); return; }
      const sonuc = excelToplulIceAktarSonucOzetle(satirlar, yukleniciFirmaEkle);
      alert(excelIceAktarOzetMesaji(sonuc));
      firmalariCiz(document.getElementById('firmaAramaKutusu').value);
    });
  });

  document.getElementById('kisiSablonIndirBtn').addEventListener('click', () => {
    excelSablonIndir(YUKLENICI_KISI_IMPORT_KOLONLARI, 'yuklenici_personel_sablonu.xlsx');
  });
  document.getElementById('kisiDisaAktarBtn').addEventListener('click', () => {
    excelDisaAktar(yukleniciKisileriniGetir('', {}), YUKLENICI_KISI_EXPORT_KOLONLARI, 'yuklenici_personeli.xlsx');
  });
  document.getElementById('kisiIceAktarBtn').addEventListener('click', () => document.getElementById('kisiIceAktarDosya').click());
  document.getElementById('kisiIceAktarDosya').addEventListener('change', e => {
    const dosya = e.target.files[0];
    excelIceAktar(dosya, YUKLENICI_KISI_IMPORT_KOLONLARI, (satirlar, hataMesaji) => {
      e.target.value = '';
      if (hataMesaji) { alert(hataMesaji); return; }
      const sonuc = excelToplulIceAktarSonucOzetle(satirlar, _yukleniciKisiIceAktarSatiriEkle);
      alert(excelIceAktarOzetMesaji(sonuc));
      kisileriCiz(document.getElementById('kisiAramaKutusu').value);
    });
  });

  document.getElementById('yeniAracBtn').addEventListener('click', () => aracModalAc());
  document.getElementById('aracModalKapatBtn').addEventListener('click', aracModalKapat);
  document.getElementById('aracModalIptalBtn').addEventListener('click', aracModalKapat);
  document.getElementById('aracForm').addEventListener('submit', aracFormGonderildi);
  document.getElementById('aracAramaKutusu').addEventListener('input', e => araclariCiz(e.target.value));
  ['aracPtmVar', 'aracPtmTarih', 'aracPtmGecerlilik', 'aracRuhsat', 'aracZmsTarih', 'aracZmsGecerlilik', 'aracTuvTarih', 'aracTuvGecerlilik'].forEach(id => {
    document.getElementById(id).addEventListener('input', _aracCanliDurumuGuncelle);
  });

  document.getElementById('ziyaretciForm').addEventListener('submit', ziyaretciFormGonderildi);

  document.getElementById('dashAramaKutusu').addEventListener('input', dashboardCiz);
  document.getElementById('dashKapsamFiltre').addEventListener('change', dashboardCiz);

  document.getElementById('kayitAramaKutusu').addEventListener('input', e => kayitlariCiz(e.target.value));
  document.getElementById('kayitTumunuSecCheckbox').addEventListener('change', e => {
    document.querySelectorAll('#kayitTabloGovde [data-kayit-sec]').forEach(cb => { cb.checked = e.target.checked; });
  });
  document.getElementById('kayitSecilenSilBtn').addEventListener('click', kayitSecilenleriSil);
  document.getElementById('kayitTumExcelBtn').addEventListener('click', yukleniciTumKayitlariExcelAktar);
  document.getElementById('kayitUygunExcelBtn').addEventListener('click', yukleniciUygunKayitlariExcelAktar);
  document.getElementById('kayitUygunsuzExcelBtn').addEventListener('click', yukleniciUygunOlmayanKayitlariExcelAktar);
  document.getElementById('kayitDetayliExcelBtn').addEventListener('click', yukleniciDetayliExcelAktar);
  document.getElementById('kayitIceAktarBtn').addEventListener('click', () => document.getElementById('kayitIceAktarDosya').click());
  document.getElementById('kayitIceAktarDosya').addEventListener('change', e => {
    yukleniciKayitlariniIceAktar(e.target.files[0], () => { e.target.value = ''; });
  });
  document.getElementById('kayitPdfBtn').addEventListener('click', yukleniciPdfIndir);

  gorunumDegistir('dashboard');
}

const YUKLENICI_FIRMA_IMPORT_KOLONLARI = [
  { anahtar: 'firmaAdi', baslik: 'Firma Adı' },
  { anahtar: 'vergiNo', baslik: 'Vergi No' },
  { anahtar: 'faaliyetAlani', baslik: 'Faaliyet Alanı' },
  { anahtar: 'yetkiliAdi', baslik: 'Yetkili Adı' },
  { anahtar: 'telefon', baslik: 'Telefon' },
  { anahtar: 'eposta', baslik: 'E-posta' },
  { anahtar: 'riskSeviyesi', baslik: 'Risk Seviyesi' }
];

const YUKLENICI_FIRMA_EXPORT_KOLONLARI = [
  { anahtar: 'firmaNo', baslik: 'Firma No' },
  { anahtar: 'firmaAdi', baslik: 'Firma Adı' },
  { anahtar: 'yetkiliAdi', baslik: 'Yetkili' },
  { anahtar: 'riskSeviyesi', baslik: 'Risk' },
  { anahtar: 'durum', baslik: 'Durum' }
];

const YUKLENICI_KISI_IMPORT_KOLONLARI = [
  { anahtar: 'adSoyad', baslik: 'Ad Soyad' },
  { anahtar: 'kimlikNo', baslik: 'Kimlik No' },
  { anahtar: 'firmaAdi', baslik: 'Firma Adı' },
  { anahtar: 'bolum', baslik: 'Bölüm' },
  { anahtar: 'gorev', baslik: 'Görev' },
  { anahtar: 'telefon', baslik: 'Telefon' }
];

const YUKLENICI_KISI_EXPORT_KOLONLARI = [
  { anahtar: 'personelNo', baslik: 'Personel No' },
  { anahtar: 'adSoyad', baslik: 'Ad Soyad' },
  { anahtar: 'firmaAdi', baslik: 'Firma' },
  { anahtar: 'bolum', baslik: 'Bölüm' },
  { anahtar: 'gorev', baslik: 'Görev' },
  { anahtar: 'durumGoruntu', baslik: 'Durum' },
  { anahtar: 'sonrakiKontrolTarihi', baslik: 'Sonraki Kontrol' }
];

function _yukleniciKisiIceAktarSatiriEkle(satir) {
  const firma = yukleniciFirmalariniGetir('').find(f => _basligiNormallestir(f.firmaAdi) === _basligiNormallestir(satir.firmaAdi));
  if (!firma) return { basarili: false, hatalar: { genel: `Firma "${satir.firmaAdi}" bulunamadı. Önce firmayı ekleyin.` } };
  return yukleniciKisiEkle(Object.assign({}, satir, { firmaId: firma.id }));
}

function gorunumDegistir(gorunum) {
  _ykGorunum = gorunum;
  document.querySelectorAll('[data-sekme]').forEach(btn => btn.classList.toggle('sekme-seciliDegil', btn.getAttribute('data-sekme') !== gorunum));
  ['dashboard', 'firmalar', 'kisiler', 'araclar', 'ziyaretciler', 'kayitlar', 'ozet'].forEach(g => { document.getElementById('bolum-' + g).style.display = g === gorunum ? '' : 'none'; });

  if (gorunum === 'dashboard') dashboardCiz();
  else if (gorunum === 'firmalar') firmalariCiz('');
  else if (gorunum === 'kisiler') kisileriCiz('');
  else if (gorunum === 'araclar') araclariCiz('');
  else if (gorunum === 'ziyaretciler') ziyaretcileriCiz();
  else if (gorunum === 'kayitlar') kayitlariCiz('');
  else ozetiCiz();
}

// ==================== DASHBOARD / AKSİYON MERKEZİ ====================

function dashboardCiz() {
  const veri = yukleniciDashboardVerisiHesapla();
  document.getElementById('dashToplamPersonel').textContent = veri.toplamPersonel;
  document.getElementById('dashToplamArac').textContent = veri.toplamArac;
  document.getElementById('dashUygun').textContent = veri.uygunSayisi;
  document.getElementById('dashUygunsuz').textContent = veri.uygunsuzSayisi;

  const aramaMetni = document.getElementById('dashAramaKutusu').value.trim().toLowerCase();
  const kapsam = document.getElementById('dashKapsamFiltre').value;

  let satirlar = veri.aksiyonSatirlari;
  if (aramaMetni) {
    satirlar = satirlar.filter(r => r.firma.toLowerCase().includes(aramaMetni) || r.kimlik.toLowerCase().includes(aramaMetni));
  }
  if (kapsam === 'critical') satirlar = satirlar.filter(r => r.durum === 'Giriş Engeli');
  else if (kapsam === 'warn') satirlar = satirlar.filter(r => r.durum === 'Yakında Dolacak');

  const aksiyonGovde = document.getElementById('dashAksiyonGovde');
  aksiyonGovde.innerHTML = satirlar.length
    ? satirlar.map(r => `
      <tr>
        <td>${_ykKacir(r.tur)}</td>
        <td>${_ykKacir(r.firma)}</td>
        <td>${_ykKacir(r.kimlik)}</td>
        <td><span class="genel-rozet ${r.durum === 'Giriş Engeli' ? 'rozet-uygun-degil' : 'rozet-yaklasiyor'}">${_ykKacir(r.durum)}</span></td>
        <td>${_ykKacir(r.sebep)}</td>
        <td>${r.sonTarih ? formatTarihGoster(r.sonTarih) : 'İSG ile görüşün'}</td>
        <td>${r.kalanGun === null || r.kalanGun === undefined ? '-' : r.kalanGun}</td>
        <td>
          <span class="genel-rozet ${r.pasif ? 'rozet-pasif' : 'rozet-uygun'}" style="font-size:10px;">${r.pasif ? 'Pasif' : 'Aktif'}</span>
          <button class="tablo-buton" data-pasif-degistir="${r.id}" data-yeni-pasif="${r.pasif ? 'false' : 'true'}">${r.pasif ? 'Aktif Yap' : 'Pasif Yap'}</button>
        </td>
      </tr>
    `).join('')
    : '<tr><td colspan="8" style="text-align:center;">Sonuç yok</td></tr>';

  aksiyonGovde.querySelectorAll('[data-pasif-degistir]').forEach(btn => {
    btn.addEventListener('click', () => {
      yukleniciKisiPasifDurumunuDegistir(btn.getAttribute('data-pasif-degistir'), btn.getAttribute('data-yeni-pasif') === 'true');
      dashboardCiz();
    });
  });

  document.getElementById('dashFirmaGovde').innerHTML = veri.firmaBazliSorun.length
    ? veri.firmaBazliSorun.map(x => `<tr><td>${_ykKacir(x.firma) || '-'}</td><td>${x.kritik}</td><td>${x.uyari}</td><td>${x.toplam}</td></tr>`).join('')
    : '<tr><td colspan="4" style="text-align:center;">Veri yok</td></tr>';

  document.getElementById('dashBelgeGovde').innerHTML = veri.belgeBazliSorun.length
    ? veri.belgeBazliSorun.map(x => `<tr><td>${x.belge}</td><td>${x.adet}</td></tr>`).join('')
    : '<tr><td colspan="2" style="text-align:center;">Veri yok</td></tr>';
}

// ==================== FİRMA: SERBEST EVRAK LİSTESİ BUILDER ====================
// Yüklenici Personeli artık sabit belge checklist'i kullanıyor (aşağıda), bu
// serbest liste sadece Firma modalında kalıyor.

function evrakListesiniCiz(kutuId, taslakDizisi) {
  const kutu = document.getElementById(kutuId);
  kutu.innerHTML = taslakDizisi.map(e => `
    <div style="display:grid; grid-template-columns: 1.4fr 1fr 1fr 1fr 1fr 32px; gap:8px; align-items:start; margin-bottom:8px;">
      <select data-evrak-alan="tur" data-evrak-id="${e.id}">
        ${EVRAK_TURLERI.map(t => `<option ${e.tur === t ? 'selected' : ''}>${t}</option>`).join('')}
      </select>
      <input type="date" placeholder="Veriliş" data-evrak-alan="verilisTarihi" data-evrak-id="${e.id}" value="${e.verilisTarihi}">
      <input type="date" placeholder="Geçerlilik" data-evrak-alan="gecerlilikTarihi" data-evrak-id="${e.id}" value="${e.gecerlilikTarihi}">
      <input placeholder="Dosya adı" data-evrak-alan="dosyaAdi" data-evrak-id="${e.id}" value="${e.dosyaAdi.replace(/"/g, '&quot;')}">
      <input placeholder="Not" data-evrak-alan="not" data-evrak-id="${e.id}" value="${e.not.replace(/"/g, '&quot;')}">
      <button type="button" class="tablo-buton sil" data-evrak-sil="${e.id}" title="Sil">✕</button>
    </div>
  `).join('') || '<p style="font-size:12px; color:var(--metin-soluk);">Henüz evrak eklenmedi.</p>';

  kutu.querySelectorAll('[data-evrak-alan]').forEach(el => {
    el.addEventListener('input', () => {
      const evrak = _firmaEvrakTaslak.find(x => x.id === el.getAttribute('data-evrak-id'));
      if (evrak) evrak[el.getAttribute('data-evrak-alan')] = el.value;
    });
  });
  kutu.querySelectorAll('[data-evrak-sil]').forEach(btn => {
    btn.addEventListener('click', () => {
      _firmaEvrakTaslak = _firmaEvrakTaslak.filter(x => x.id !== btn.getAttribute('data-evrak-sil'));
      evrakListesiniCiz('firmaEvrakListesi', _firmaEvrakTaslak);
    });
  });
}

// ==================== KİŞİ: SABİT BELGE CHECKLIST BUILDER ====================
// Eski uygulamadaki 16 sabit belgeyi render eder (bkz. model.js
// YUKLENICI_BELGE_TANIMLARI). _kisiBelgeTaslak nesnesi { belgeId: {...} }
// şeklinde tutulur ve kisiFormGonderildi'de doğrudan kisi.belgeler olarak kaydedilir.

function _kisiBelgeSatiriHtml(belgeTanimi, kayit, tehlikeSinifi) {
  const k = kayit || {};
  let alanlar = '';

  if (belgeTanimi.tur === 'var-yok') {
    alanlar = `
      <select data-belge-alan="deger" data-belge-id="${belgeTanimi.id}" style="width:auto;">
        <option value="Yok" ${k.deger !== 'Var' ? 'selected' : ''}>Yok</option>
        <option value="Var" ${k.deger === 'Var' ? 'selected' : ''}>Var</option>
      </select>
    `;
  } else if (belgeTanimi.tur === 'tarih-manuel') {
    alanlar = `
      <input type="date" data-belge-alan="base" data-belge-id="${belgeTanimi.id}" value="${k.base || ''}" title="Veriliş" style="width:auto;">
      <input type="date" data-belge-alan="exp" data-belge-id="${belgeTanimi.id}" value="${k.exp || ''}" title="${belgeTanimi.suresizOlabilir ? 'Geçerlilik (boş = süresiz)' : 'Geçerlilik'}" style="width:auto;">
    `;
  } else if (belgeTanimi.tur === 'tarih-tehlike') {
    const hesapExp = yukleniciBelgeBitisTarihiHesapla(belgeTanimi, k, tehlikeSinifi);
    alanlar = `
      <input type="date" data-belge-alan="base" data-belge-id="${belgeTanimi.id}" value="${k.base || ''}" title="Veriliş" style="width:auto;">
      <span style="font-size:12px; color:var(--metin-soluk); white-space:nowrap;">Geçerlilik: ${hesapExp || '-'}</span>
    `;
  } else if (belgeTanimi.tur === 'egitim') {
    alanlar = `
      <input type="date" data-belge-alan="base" data-belge-id="${belgeTanimi.id}" value="${k.base || ''}" title="Veriliş" style="width:auto;">
      <select data-belge-alan="ay" data-belge-id="${belgeTanimi.id}" style="width:auto;">
        ${YUKLENICI_FIRMA_EGITIMI_AY_SECENEKLERI.map(a => `<option value="${a}" ${Number(k.ay || YUKLENICI_FIRMA_EGITIMI_VARSAYILAN_AY) === a ? 'selected' : ''}>${a} ay</option>`).join('')}
      </select>
      <input type="text" data-belge-alan="egitmen" data-belge-id="${belgeTanimi.id}" value="${(k.egitmen || '').replace(/"/g, '&quot;')}" placeholder="Eğitmen" style="width:120px;">
    `;
  }

  return `
    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; padding:6px 0; border-bottom:1px solid var(--kenarlik);">
      <span style="font-size:13px; ${belgeTanimi.girisEngelleyici ? 'font-weight:600;' : ''}">${belgeTanimi.ad}${belgeTanimi.girisEngelleyici ? ' *' : ''}</span>
      <div style="display:flex; gap:8px; align-items:center; margin-left:auto; flex-wrap:wrap;">${alanlar}</div>
    </div>
  `;
}

// Belgeler, eski uygulamada tek düz liste iken burada okunabilirlik için
// YUKLENICI_BELGE_BOLUMLERI'ne göre alt başlıklarla gruplanır (hesaplamayı
// etkilemez, sadece görünüm).
function _kisiBelgeListesiniCiz() {
  const kutu = document.getElementById('kisiBelgeListesi');
  const tehlikeSinifi = document.getElementById('kisiTehlikeSinifi').value;
  const personelTuru = document.getElementById('kisiPersonelTuru').value;
  const tanimlar = yukleniciGecerliBelgeTanimlari(personelTuru);

  const bolumSirasi = ['zorunlu', 'firma', 'operator'];
  kutu.innerHTML = bolumSirasi
    .map(bolumId => {
      const buBolum = tanimlar.filter(b => b.bolum === bolumId);
      if (!buBolum.length) return '';
      return `
        <div style="font-size:12px; font-weight:600; color:var(--metin-soluk); text-transform:uppercase; letter-spacing:.03em; margin:14px 0 4px;">${YUKLENICI_BELGE_BOLUMLERI[bolumId]}</div>
        ${buBolum.map(b => _kisiBelgeSatiriHtml(b, _kisiBelgeTaslak[b.id], tehlikeSinifi)).join('')}
      `;
    })
    .join('');

  kutu.querySelectorAll('[data-belge-alan]').forEach(el => {
    el.addEventListener('input', () => {
      const id = el.getAttribute('data-belge-id');
      const alan = el.getAttribute('data-belge-alan');
      if (!_kisiBelgeTaslak[id]) _kisiBelgeTaslak[id] = {};
      _kisiBelgeTaslak[id][alan] = el.value;
      // Sağlık/Temel İSG'de veriliş tarihi değişince hesaplanan geçerlilik
      // metnini güncellemek için satırı yeniden çiz.
      if (alan === 'base' && yukleniciBelgeTanimiGetir(id).tur === 'tarih-tehlike') { _kisiBelgeListesiniCiz(); return; }
      _kisiCanliDurumuGuncelle();
    });
  });

  _kisiCanliDurumuGuncelle();
}

// Kaydetmeden önce, o an formda girilmiş veriyle canlı olarak "bu kişi şu an
// girişe uygun mu, değilse neden" bilgisini gösterir — eski uygulamada
// sadece kayıt sonrası Dashboard'da görülebilen bu bilgiyi form doldurulurken
// anlık geri bildirim olarak sunar (kullanıcı dostu iyileştirme).
function _kisiCanliDurumuGuncelle() {
  const kutu = document.getElementById('kisiCanliDurum');
  if (!kutu) return;

  const gecici = {
    tehlikeSinifi: document.getElementById('kisiTehlikeSinifi').value,
    ilkGiris: document.getElementById('kisiIlkGiris').checked,
    belgeler: _kisiBelgeTaslak
  };

  if (document.getElementById('kisiIlkGiris').checked) {
    kutu.innerHTML = `<div class="genel-rozet rozet-yaklasiyor" style="font-size:13px; padding:8px 12px;">🎓 İlk Giriş işaretli — diğer belgelerden bağımsız olarak "Eğitim Verilecek" olarak işlenecek.</div>`;
    return;
  }

  const kritik = yukleniciKisiKritikSebepHesapla(gecici, bugunIso());
  if (!kritik) {
    kutu.innerHTML = `<div class="genel-rozet rozet-uygun" style="font-size:13px; padding:8px 12px;">✓ Girişe Uygun — girilen belgelerde eksik/süresi geçmiş bir sorun yok.</div>`;
  } else if (kritik.girisEngeli) {
    kutu.innerHTML = `<div class="genel-rozet rozet-uygun-degil" style="font-size:13px; padding:8px 12px;">⛔ Girişe Kapalı — ${kritik.sebep}${kritik.sonTarih ? ` (${formatTarihGoster(kritik.sonTarih)})` : ''}</div>`;
  } else {
    kutu.innerHTML = `<div class="genel-rozet rozet-yaklasiyor" style="font-size:13px; padding:8px 12px;">⚠ Yakında Dolacak — ${kritik.sebep}${kritik.sonTarih ? ` (${formatTarihGoster(kritik.sonTarih)}, ${kritik.kalanGun} gün kaldı)` : ''}</div>`;
  }
}

function _gerekliEvrakCheckboxHtml(kutuId, seciliListe) {
  return EVRAK_TURLERI.map(t => `
    <label style="display:inline-flex; align-items:center; gap:6px; font-size:13px; margin-right:14px; margin-bottom:6px;">
      <input type="checkbox" name="${kutuId}" value="${t}" ${seciliListe.includes(t) ? 'checked' : ''}> ${t}
    </label>
  `).join('');
}

// Firma için: serbest evrak modeli (eksikEvraklar/suresiGecenEvraklar).
function _uygunlukOzetiHtml(z) {
  if (z.uygunMu) return '<span class="genel-rozet rozet-uygun">Uygun</span>';
  const parcalar = [];
  if (z.eksikEvraklar.length) parcalar.push(`Eksik: ${z.eksikEvraklar.join(', ')}`);
  if (z.suresiGecenEvraklar.length) parcalar.push(`Süresi Geçen: ${z.suresiGecenEvraklar.join(', ')}`);
  return `<span class="genel-rozet rozet-uygun-degil">Uygun Değil</span> <span style="font-size:11px; color:var(--metin-soluk);">${parcalar.join(' | ')}</span>`;
}

// Kişi için: sabit belge checklist'i / kritikSebep (bkz. _kisiZenginlestir).
function _kisiUygunlukOzetiHtml(k) {
  if (k.uygunMu) return '<span class="genel-rozet rozet-uygun">Uygun</span>';
  const rozetSinifi = k.kritikSebep && k.kritikSebep.girisEngeli ? 'rozet-uygun-degil' : 'rozet-yaklasiyor';
  return `<span class="genel-rozet ${rozetSinifi}">${k.durumGoruntu}</span> <span style="font-size:11px; color:var(--metin-soluk);">${k.kritikSebep ? k.kritikSebep.sebep : ''}</span>`;
}

// ==================== FİRMALAR ====================

function firmalariCiz(aramaMetni) {
  const govde = document.getElementById('firmaTabloGovde');
  const bosDurum = document.getElementById('firmaBosDurum');
  const firmalar = yukleniciFirmalariniGetir(aramaMetni);

  govde.innerHTML = '';
  if (firmalar.length === 0) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = aramaMetni ? 'Aramanızla eşleşen firma bulunamadı.' : 'Henüz yüklenici firma eklenmedi.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  firmalar.forEach(f => {
    const satir = document.createElement('tr');
    satir.innerHTML = `
      <td>${f.firmaNo}</td>
      <td>${_ykKacir(f.firmaAdi)}</td>
      <td>${_ykKacir(f.yetkiliAdi) || '-'}</td>
      <td><span class="genel-rozet rozet-${ykRozetSinifAdi(f.riskSeviyesi)}">${_ykKacir(f.riskSeviyesi)}</span></td>
      <td><span class="genel-rozet rozet-${ykRozetSinifAdi(f.durum)}">${_ykKacir(f.durum)}</span></td>
      <td>${_uygunlukOzetiHtml(f)}</td>
      <td>
        <button class="tablo-buton" data-duzenle="${f.id}">Düzenle</button>
        <button class="tablo-buton sil" data-sil="${f.id}">Sil</button>
      </td>
    `;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-duzenle]').forEach(btn => btn.addEventListener('click', () => firmaModalAc(yukleniciFirmaIdIleGetirRepo(btn.getAttribute('data-duzenle')))));
  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', async () => {
    if (await onayModali('Bu firmayı ve bağlı personelini silmek istediğinize emin misiniz?', 'Sil')) { yukleniciFirmaSil(btn.getAttribute('data-sil')); firmalariCiz(document.getElementById('firmaAramaKutusu').value); }
  }));
}

function firmaModalAc(firma) {
  _duzenlenenFirmaId = firma ? firma.id : null;
  _firmaEvrakTaslak = firma ? firma.evraklar.map(e => Object.assign({}, e)) : [];

  document.getElementById('firmaModalBaslik').textContent = firma ? (firma.firmaNo + ' Firmasını Düzenle') : 'Yeni Yüklenici Firma';
  document.getElementById('firmaAdi').value = firma ? firma.firmaAdi : '';
  document.getElementById('vergiNo').value = firma ? firma.vergiNo : '';
  document.getElementById('faaliyetAlani').value = firma ? firma.faaliyetAlani : '';
  document.getElementById('yetkiliAdi').value = firma ? firma.yetkiliAdi : '';
  document.getElementById('firmaTelefon').value = firma ? firma.telefon : '';
  document.getElementById('eposta').value = firma ? firma.eposta : '';
  document.getElementById('firmaRiskSeviyesi').innerHTML = YUKLENICI_RISK_SEVIYELERI.map(r => `<option ${firma && firma.riskSeviyesi === r ? 'selected' : ''}>${r}</option>`).join('');
  document.getElementById('firmaDurum').innerHTML = FIRMA_DURUMLARI.map(d => `<option ${firma && firma.durum === d ? 'selected' : ''}>${d}</option>`).join('');
  document.getElementById('firmaGerekliEvraklarKutusu').innerHTML = _gerekliEvrakCheckboxHtml('firmaGerekliEvrak', firma ? firma.gerekliEvraklar : VARSAYILAN_GEREKLI_EVRAKLAR);
  document.getElementById('firmaNotlar').value = firma ? firma.notlar : '';

  evrakListesiniCiz('firmaEvrakListesi', _firmaEvrakTaslak);
  temizleFormHatalari('firmaForm');
  document.getElementById('firmaModalKatman').classList.add('acik');
}

function firmaModalKapat() {
  document.getElementById('firmaModalKatman').classList.remove('acik');
  _duzenlenenFirmaId = null;
}

function firmaFormGonderildi(e) {
  e.preventDefault();
  temizleFormHatalari('firmaForm');

  const veriler = {
    firmaAdi: document.getElementById('firmaAdi').value,
    vergiNo: document.getElementById('vergiNo').value,
    faaliyetAlani: document.getElementById('faaliyetAlani').value,
    yetkiliAdi: document.getElementById('yetkiliAdi').value,
    telefon: document.getElementById('firmaTelefon').value,
    eposta: document.getElementById('eposta').value,
    riskSeviyesi: document.getElementById('firmaRiskSeviyesi').value,
    durum: document.getElementById('firmaDurum').value,
    gerekliEvraklar: Array.from(document.querySelectorAll('input[name="firmaGerekliEvrak"]:checked')).map(el => el.value),
    evraklar: _firmaEvrakTaslak.filter(e => e.tur),
    notlar: document.getElementById('firmaNotlar').value
  };

  const sonuc = _duzenlenenFirmaId ? yukleniciFirmaGuncelle(_duzenlenenFirmaId, veriler) : yukleniciFirmaEkle(veriler);
  if (!sonuc.basarili) { formHatalariniGoster(sonuc.hatalar); return; }

  firmaModalKapat();
  firmalariCiz(document.getElementById('firmaAramaKutusu').value);
}

// ==================== KİŞİLER ====================

function kisileriCiz(aramaMetni) {
  const govde = document.getElementById('kisiTabloGovde');
  const bosDurum = document.getElementById('kisiBosDurum');
  const filtreler = { durum: document.getElementById('kisiDurumFiltre').value };
  const kisiler = yukleniciKisileriniGetir(aramaMetni, filtreler);

  govde.innerHTML = '';
  if (kisiler.length === 0) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = 'Eşleşen kişi bulunamadı.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  kisiler.forEach(k => {
    const satir = document.createElement('tr');
    satir.classList.add(yukleniciKisiSatirSinifiHesapla(k, bugunIso()));
    if (k.pasif) satir.style.opacity = '0.55';
    const sonTarihMetni = k.girisSonTarih.sonTarih ? formatTarihGoster(k.girisSonTarih.sonTarih) : '-';
    satir.innerHTML = `
      <td>${k.personelNo}</td>
      <td>${_ykKacir(k.adSoyad)}${k.pasif ? ' <span class="genel-rozet rozet-pasif" style="font-size:10px;">Pasif</span>' : ''}</td>
      <td>${_ykKacir(k.firmaAdi)}</td>
      <td><span class="genel-rozet rozet-${ykRozetSinifAdi(k.durumGoruntu)}">${_ykKacir(k.durumGoruntu)}</span>${k.kritikSebep ? `<div style="font-size:11px; color:var(--metin-soluk); margin-top:2px;">${_ykKacir(k.kritikSebep.sebep)}</div>` : ''}</td>
      <td>${sonTarihMetni}</td>
      <td>
        <button class="tablo-buton" data-duzenle="${k.id}">Düzenle</button>
        <button class="tablo-buton sil" data-sil="${k.id}">Sil</button>
      </td>
    `;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-duzenle]').forEach(btn => btn.addEventListener('click', () => kisiModalAc(yukleniciKisiIdIleGetirRepo(btn.getAttribute('data-duzenle')))));
  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', async () => {
    if (await onayModali('Bu kişiyi silmek istediğinize emin misiniz?', 'Sil')) { yukleniciKisiSil(btn.getAttribute('data-sil')); kisileriCiz(document.getElementById('kisiAramaKutusu').value); }
  }));
}

// Firma sayısı fazla olduğunda (300+) doğru firmayı bulmayı hızlandırmak için
// kişi/araç modallarındaki firma listesi bir arama kutusuyla daraltılabilir.
function _yukleniciFirmaListesiCiz(selectEl, firmalar, seciliId) {
  selectEl.innerHTML = '<option value="">— Firma seçiniz —</option>' +
    firmalar.map(f => `<option value="${f.id}" ${seciliId === f.id ? 'selected' : ''}>${_ykKacir(f.firmaAdi)}</option>`).join('');
}

function _yukleniciFirmaAramaBagla(aramaId, selectId, firmalar) {
  const aramaEl = document.getElementById(aramaId);
  const selectEl = document.getElementById(selectId);
  aramaEl.value = '';
  aramaEl.oninput = () => {
    const seciliId = selectEl.value;
    const terim = _basligiNormallestir(aramaEl.value);
    const filtreli = terim ? firmalar.filter(f => _basligiNormallestir(f.firmaAdi).includes(terim)) : firmalar;
    _yukleniciFirmaListesiCiz(selectEl, filtreli, seciliId);
  };
}

function kisiModalAc(kisi) {
  _duzenlenenKisiId = kisi ? kisi.id : null;
  // Derin kopya: taslak üzerindeki değişiklikler kaydedilmeden modal kapatılırsa
  // orijinal kayıt (repository'deki referans) bozulmasın.
  _kisiBelgeTaslak = kisi && kisi.belgeler ? JSON.parse(JSON.stringify(kisi.belgeler)) : yukleniciBosBelgeler();

  document.getElementById('kisiModalBaslik').textContent = kisi ? (kisi.personelNo + ' Kişisini Düzenle') : 'Yeni Yüklenici Personeli';

  const firmalar = yukleniciFirmalariTumunuGetir();
  _yukleniciFirmaListesiCiz(document.getElementById('kisiFirmaId'), firmalar, kisi ? kisi.firmaId : '');
  _yukleniciFirmaAramaBagla('kisiFirmaAra', 'kisiFirmaId', firmalar);

  document.getElementById('adSoyad').value = kisi ? kisi.adSoyad : '';
  document.getElementById('kisiTelefon').value = kisi ? kisi.telefon : '';
  document.getElementById('kisiDurum').innerHTML = KISI_DURUMLARI.map(d => `<option ${kisi && kisi.durum === d ? 'selected' : ''}>${d}</option>`).join('');
  document.getElementById('kisiTehlikeSinifi').innerHTML = YUKLENICI_TEHLIKE_SINIFLARI.map(t => `<option value="${t}" ${(kisi ? kisi.tehlikeSinifi : 'az') === t ? 'selected' : ''}>${YUKLENICI_TEHLIKE_SINIFI_ETIKETLERI[t]}</option>`).join('');
  document.getElementById('kisiPersonelTuru').innerHTML = YUKLENICI_PERSONEL_TURLERI.map(t => `<option value="${t}" ${(kisi ? kisi.personelTuru : 'teknik') === t ? 'selected' : ''}>${YUKLENICI_PERSONEL_TURU_ETIKETLERI[t]}</option>`).join('');
  document.getElementById('kisiPasif').checked = !!(kisi && kisi.pasif);
  document.getElementById('kisiIlkGiris').checked = !!(kisi && kisi.ilkGiris);
  document.getElementById('kisiNotlar').value = kisi ? kisi.notlar : '';

  _kisiBelgeListesiniCiz();
  temizleFormHatalari('kisiForm');
  document.getElementById('kisiModalKatman').classList.add('acik');
}

function kisiModalKapat() {
  document.getElementById('kisiModalKatman').classList.remove('acik');
  _duzenlenenKisiId = null;
}

function kisiFormGonderildi(e) {
  e.preventDefault();
  temizleFormHatalari('kisiForm');

  // kimlikNo/bolum/gorev/sonrakiKontrolTarihi artık modalda gösterilmiyor (kullanıcı isteği) —
  // ama düzenlenen kişinin bu alanlarda zaten kayıtlı bir değeri varsa
  // (ör. toplu içe aktarımdan gelmiş), formu kaydederken sessizce silinmesin
  // diye mevcut kayıttan aynen korunuyor.
  const _duzenlenenKisi = _duzenlenenKisiId ? yukleniciKisiIdIleGetirRepo(_duzenlenenKisiId) : null;

  const veriler = {
    firmaId: document.getElementById('kisiFirmaId').value,
    adSoyad: document.getElementById('adSoyad').value,
    kimlikNo: _duzenlenenKisi ? _duzenlenenKisi.kimlikNo : '',
    bolum: _duzenlenenKisi ? _duzenlenenKisi.bolum : '',
    gorev: _duzenlenenKisi ? _duzenlenenKisi.gorev : '',
    telefon: document.getElementById('kisiTelefon').value,
    durum: document.getElementById('kisiDurum').value,
    tehlikeSinifi: document.getElementById('kisiTehlikeSinifi').value,
    personelTuru: document.getElementById('kisiPersonelTuru').value,
    pasif: document.getElementById('kisiPasif').checked,
    ilkGiris: document.getElementById('kisiIlkGiris').checked,
    belgeler: _kisiBelgeTaslak,
    sonrakiKontrolTarihi: _duzenlenenKisi ? _duzenlenenKisi.sonrakiKontrolTarihi : undefined,
    notlar: document.getElementById('kisiNotlar').value
  };

  const sonuc = _duzenlenenKisiId ? yukleniciKisiGuncelle(_duzenlenenKisiId, veriler) : yukleniciKisiEkle(veriler);
  if (!sonuc.basarili) { formHatalariniGoster(sonuc.hatalar); return; }

  kisiModalKapat();
  kisileriCiz(document.getElementById('kisiAramaKutusu').value);
}

// ==================== ARAÇ / EKİPMAN ====================

function _aracBelgeRozetHtml(varMi) {
  return varMi
    ? '<span class="genel-rozet rozet-uygun">Uygun</span>'
    : '<span class="genel-rozet rozet-uygun-degil">Uygun Değil</span>';
}

function araclariCiz(aramaMetni) {
  const govde = document.getElementById('aracTabloGovde');
  const bosDurum = document.getElementById('aracBosDurum');
  const araclar = yukleniciAraclariniGetir(aramaMetni);

  govde.innerHTML = '';
  if (araclar.length === 0) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = aramaMetni ? 'Aramanızla eşleşen araç/ekipman bulunamadı.' : 'Henüz araç/ekipman eklenmedi.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  araclar.forEach(a => {
    const satir = document.createElement('tr');
    satir.classList.add(yukleniciAracSatirSinifiHesapla(a));
    if (a.pasif) satir.style.opacity = '0.55';
    satir.innerHTML = `
      <td>${a.aracNo}</td>
      <td>${_ykKacir(a.firmaAdi)}${a.pasif ? ' <span class="genel-rozet rozet-pasif" style="font-size:10px;">Pasif</span>' : ''}</td>
      <td>${_ykKacir(a.tur)}</td>
      <td>${_ykKacir(a.kimlik)}</td>
      <td>${_aracBelgeRozetHtml(a.ptmOk)}</td>
      <td>${_aracBelgeRozetHtml(a.ruhsatOk)}</td>
      <td>${_aracBelgeRozetHtml(a.zmsOk)}</td>
      <td>${_aracBelgeRozetHtml(a.tuvOk)}</td>
      <td>${a.uygunMu ? '<span class="genel-rozet rozet-uygun">Uygun</span>' : '<span class="genel-rozet rozet-uygun-degil">Uygun Değil</span>'}</td>
      <td>
        <button class="tablo-buton" data-duzenle="${a.id}">Düzenle</button>
        <button class="tablo-buton sil" data-sil="${a.id}">Sil</button>
      </td>
    `;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-duzenle]').forEach(btn => btn.addEventListener('click', () => aracModalAc(yukleniciAracIdIleGetirRepo(btn.getAttribute('data-duzenle')))));
  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', async () => {
    if (await onayModali('Bu araç/ekipman kaydını silmek istediğinize emin misiniz?', 'Sil')) { yukleniciAracSil(btn.getAttribute('data-sil')); araclariCiz(document.getElementById('aracAramaKutusu').value); }
  }));
}

function aracModalAc(arac) {
  _duzenlenenAracId = arac ? arac.id : null;

  document.getElementById('aracModalBaslik').textContent = arac ? (arac.aracNo + ' Kaydını Düzenle') : 'Yeni Araç / Ekipman';

  const firmalar = yukleniciFirmalariTumunuGetir();
  _yukleniciFirmaListesiCiz(document.getElementById('aracFirmaId'), firmalar, arac ? arac.firmaId : '');
  _yukleniciFirmaAramaBagla('aracFirmaAra', 'aracFirmaId', firmalar);

  document.getElementById('aracTur').innerHTML = YUKLENICI_ARAC_TURLERI.map(t => `<option ${arac && arac.tur === t ? 'selected' : ''}>${t}</option>`).join('');
  document.getElementById('aracKimlik').value = arac ? arac.kimlik : '';
  document.getElementById('aracPtmVar').value = arac ? arac.ptmVar : 'Var';
  document.getElementById('aracPtmTarih').value = arac ? arac.ptmTarih : '';
  document.getElementById('aracPtmGecerlilik').value = arac ? arac.ptmGecerlilik : '';
  document.getElementById('aracRuhsat').value = arac ? arac.ruhsat : 'Var';
  document.getElementById('aracZmsTarih').value = arac ? arac.zmsTarih : '';
  document.getElementById('aracZmsGecerlilik').value = arac ? arac.zmsGecerlilik : '';
  document.getElementById('aracTuvTarih').value = arac ? arac.tuvTarih : '';
  document.getElementById('aracTuvGecerlilik').value = arac ? arac.tuvGecerlilik : '';
  document.getElementById('aracPasif').checked = !!(arac && arac.pasif);
  document.getElementById('aracNotlar').value = arac ? arac.notlar : '';

  _aracCanliDurumuGuncelle();
  temizleFormHatalari('aracForm');
  document.getElementById('aracModalKatman').classList.add('acik');
}

function aracModalKapat() {
  document.getElementById('aracModalKatman').classList.remove('acik');
  _duzenlenenAracId = null;
}

function _aracFormDenVeriOku() {
  return {
    firmaId: document.getElementById('aracFirmaId').value,
    tur: document.getElementById('aracTur').value,
    kimlik: document.getElementById('aracKimlik').value,
    ptmVar: document.getElementById('aracPtmVar').value,
    ptmTarih: document.getElementById('aracPtmTarih').value,
    ptmGecerlilik: document.getElementById('aracPtmGecerlilik').value,
    ruhsat: document.getElementById('aracRuhsat').value,
    zmsTarih: document.getElementById('aracZmsTarih').value,
    zmsGecerlilik: document.getElementById('aracZmsGecerlilik').value,
    tuvTarih: document.getElementById('aracTuvTarih').value,
    tuvGecerlilik: document.getElementById('aracTuvGecerlilik').value,
    pasif: document.getElementById('aracPasif').checked,
    notlar: document.getElementById('aracNotlar').value
  };
}

// Kaydetmeden önce canlı "Genel Durum" önizlemesi (bkz. _kisiCanliDurumuGuncelle
// ile aynı gerekçe — kullanıcı dostu anlık geri bildirim).
function _aracCanliDurumuGuncelle() {
  const kutu = document.getElementById('aracCanliDurum');
  if (!kutu) return;
  const uygunluk = aracUygunlukHesapla(_aracFormDenVeriOku(), bugunIso());
  kutu.innerHTML = uygunluk.uygunMu
    ? '<div class="genel-rozet rozet-uygun" style="font-size:13px; padding:8px 12px;">✓ Genel Durum: Uygun</div>'
    : '<div class="genel-rozet rozet-uygun-degil" style="font-size:13px; padding:8px 12px;">⛔ Genel Durum: Uygun Değil — PTM/Ruhsat/ZMS/TÜVTÜRK belgelerinden en az biri eksik veya süresi geçmiş.</div>';
}

function aracFormGonderildi(e) {
  e.preventDefault();
  temizleFormHatalari('aracForm');

  const veriler = _aracFormDenVeriOku();
  const sonuc = _duzenlenenAracId ? yukleniciAracGuncelle(_duzenlenenAracId, veriler) : yukleniciAracEkle(veriler);
  if (!sonuc.basarili) {
    formHatalariniGoster(sonuc.hatalar);
    // #firmaIdHata kişi formunda da kullanıldığı için araç formu kendi ayrı
    // #firmaIdHata2 elemanına yazıyor (bkz. index.html).
    if (sonuc.hatalar.firmaId) document.getElementById('firmaIdHata2').textContent = sonuc.hatalar.firmaId;
    return;
  }

  aracModalKapat();
  araclariCiz(document.getElementById('aracAramaKutusu').value);
}

// ==================== ZİYARETÇİLER ====================

function ziyaretcileriCiz() {
  const govde = document.getElementById('ziyaretciTabloGovde');
  const bosDurum = document.getElementById('ziyaretciBosDurum');
  const ziyaretciler = yukleniciZiyaretcileriniGetir();

  govde.innerHTML = '';
  if (ziyaretciler.length === 0) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = 'Henüz ziyaretçi kaydı eklenmedi.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  ziyaretciler.forEach(z => {
    const satir = document.createElement('tr');
    satir.innerHTML = `
      <td>${formatTarihGoster(z.tarih)}</td>
      <td>${_ykKacir(z.adSoyad)}</td>
      <td>${_ykKacir(z.firma) || '-'}</td>
      <td>${_ykKacir(z.ziyaretEdilen) || '-'}</td>
      <td><button class="tablo-buton sil" data-sil="${z.id}">Sil</button></td>
    `;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', async () => {
    if (await onayModali('Bu ziyaretçi kaydını silmek istediğinize emin misiniz?', 'Sil')) { yukleniciZiyaretciSil(btn.getAttribute('data-sil')); ziyaretcileriCiz(); }
  }));
}

function ziyaretciFormGonderildi(e) {
  e.preventDefault();
  temizleFormHatalari('ziyaretciForm');

  const veriler = {
    adSoyad: document.getElementById('ziyaretciAdSoyad').value,
    firma: document.getElementById('ziyaretciFirma').value,
    ziyaretEdilen: document.getElementById('ziyaretciZiyaretEdilen').value,
    tarih: document.getElementById('ziyaretciTarih').value
  };

  const sonuc = yukleniciZiyaretciEkle(veriler);
  if (!sonuc.basarili) {
    if (sonuc.hatalar.adSoyad) document.getElementById('adSoyadHata2').textContent = sonuc.hatalar.adSoyad;
    if (sonuc.hatalar.tarih) document.getElementById('tarihHata').textContent = sonuc.hatalar.tarih;
    return;
  }

  document.getElementById('ziyaretciForm').reset();
  ziyaretcileriCiz();
}

// ==================== KAYITLAR ====================

function kayitlariCiz(aramaMetni) {
  const govde = document.getElementById('kayitTabloGovde');
  const bosDurum = document.getElementById('kayitBosDurum');
  const kayitlar = yukleniciKayitlariniGetir(aramaMetni);
  document.getElementById('kayitTumunuSecCheckbox').checked = false;

  govde.innerHTML = '';
  if (kayitlar.length === 0) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = aramaMetni ? 'Aramanızla eşleşen kayıt bulunamadı.' : 'Henüz kayıt yok.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  kayitlar.forEach(r => {
    const satir = document.createElement('tr');
    satir.classList.add(r.sinif);
    if (r.pasif) satir.style.opacity = '0.55';
    satir.innerHTML = `
      <td><input type="checkbox" data-kayit-sec data-kind="${r.kind}" data-id="${r.id}"></td>
      <td>${_ykKacir(r.tur)}</td>
      <td>${_ykKacir(r.firma)}</td>
      <td>${_ykKacir(r.kimlik)}</td>
      <td>${r.uygunSayisi}/${r.toplamSayisi}</td>
      <td>${r.kayitTarihi ? formatTarihGoster(r.kayitTarihi) : '-'}</td>
      <td>${_ykKacir(r.egitmen)}</td>
      <td>
        <span class="genel-rozet ${r.pasif ? 'rozet-pasif' : 'rozet-uygun'}" style="font-size:10px;">${r.pasif ? 'Pasif' : 'Aktif'}</span>
        ${r.kind === 'personel' ? `<button class="tablo-buton" data-pasif-degistir2="${r.id}" data-yeni-pasif="${r.pasif ? 'false' : 'true'}">${r.pasif ? 'Aktif Yap' : 'Pasif Yap'}</button>` : ''}
        <button class="tablo-buton" data-duzenle-kayit="${r.id}" data-kind="${r.kind}">Düzenle</button>
        <button class="tablo-buton sil" data-sil-kayit="${r.id}" data-kind="${r.kind}">Sil</button>
      </td>
    `;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-pasif-degistir2]').forEach(btn => {
    btn.addEventListener('click', () => {
      yukleniciKisiPasifDurumunuDegistir(btn.getAttribute('data-pasif-degistir2'), btn.getAttribute('data-yeni-pasif') === 'true');
      kayitlariCiz(document.getElementById('kayitAramaKutusu').value);
    });
  });
  govde.querySelectorAll('[data-duzenle-kayit]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-duzenle-kayit');
      if (btn.getAttribute('data-kind') === 'personel') kisiModalAc(yukleniciKisiIdIleGetirRepo(id));
      else aracModalAc(yukleniciAracIdIleGetirRepo(id));
    });
  });
  govde.querySelectorAll('[data-sil-kayit]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!(await onayModali('Bu kaydı silmek istediğinize emin misiniz?', 'Sil'))) return;
      const id = btn.getAttribute('data-sil-kayit');
      if (btn.getAttribute('data-kind') === 'personel') yukleniciKisiSil(id); else yukleniciAracSil(id);
      kayitlariCiz(document.getElementById('kayitAramaKutusu').value);
    });
  });
}

async function kayitSecilenleriSil() {
  const secililer = Array.from(document.querySelectorAll('#kayitTabloGovde [data-kayit-sec]:checked'))
    .map(cb => ({ kind: cb.getAttribute('data-kind'), id: cb.getAttribute('data-id') }));
  if (!secililer.length) { alert('Lütfen silmek için en az bir kayıt seçin.'); return; }
  if (!(await onayModali(`${secililer.length} kayıt silinsin mi?`, 'Sil'))) return;

  const sonuc = yukleniciKayitlariToplusil(secililer);
  alert(`${sonuc.silinen} kayıt silindi.`);
  kayitlariCiz(document.getElementById('kayitAramaKutusu').value);
}

// ==================== ÖZET ====================

function ozetiCiz() {
  const ozet = yukleniciOzetiHesapla();
  const kutu = document.getElementById('ozetKutusu');
  const kart = (etiket, deger) => `<div class="istatistik-kutu"><span>${etiket}</span><b>${deger}</b></div>`;
  const dagilimHtml = (baslik, satirlar) => `
    <div class="kart" style="margin-bottom:14px;">
      <div class="card-title" style="margin-bottom:8px;"><h3 style="margin:0; font-size:14px;">${baslik}</h3></div>
      ${satirlar.length
        ? satirlar.map(([k, v]) => `<div style="display:flex; justify-content:space-between; font-size:13px; padding:6px 0; border-bottom:1px solid var(--kenarlik);"><span>${_ykKacir(k)}</span><strong>${v}</strong></div>`).join('')
        : '<div class="bos-durum gorunur">Veri yok.</div>'}
    </div>
  `;

  kutu.innerHTML = `
    <div class="istatistik-grid">
      ${kart('Toplam Firma', ozet.toplamFirma)}
      ${kart('Aktif Firma', ozet.aktifFirma)}
      ${kart('Toplam Personel', ozet.toplamKisi)}
      ${kart('Girişe Uygun', ozet.girisUygunKisi)}
      ${kart('Girişe Kapalı', ozet.girisKapaliKisi)}
      ${kart('Uygunluk Oranı', ozet.uygunlukOrani + '%')}
      ${kart('Toplam Araç/Ekipman', ozet.toplamArac)}
      ${kart('Uygun Araç/Ekipman', ozet.uygunArac)}
    </div>

    <div class="modul-grid" style="grid-template-columns: repeat(auto-fill, minmax(260px,1fr));">
      <div>${dagilimHtml('Risk Seviyesine Göre Firma', ozet.riskeGoreFirma)}</div>
      <div>${dagilimHtml('Firmaya Göre Personel', ozet.firmayaGoreKisi)}</div>
    </div>

    <div class="card-title" style="margin:20px 0 8px;"><h3 style="margin:0; font-size:14px;">Uygun Olmayan Firmalar</h3></div>
    <div class="tablo-scroll">
      <table class="veri-tablosu">
        <thead><tr><th>Firma No</th><th>Firma Adı</th><th>Uygunluk Durumu</th></tr></thead>
        <tbody>
          ${ozet.uygunOlmayanFirmalar.map(f => `<tr><td>${f.firmaNo}</td><td>${_ykKacir(f.firmaAdi)}</td><td>${_uygunlukOzetiHtml(f)}</td></tr>`).join('') || '<tr><td colspan="3">Tüm firmalar uygun.</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="card-title" style="margin:20px 0 8px;"><h3 style="margin:0; font-size:14px;">Uygun Olmayan Personel</h3></div>
    <div class="tablo-scroll">
      <table class="veri-tablosu">
        <thead><tr><th>Personel No</th><th>Ad Soyad</th><th>Firma</th><th>Uygunluk Durumu</th></tr></thead>
        <tbody>
          ${ozet.uygunOlmayanKisiler.map(k => `<tr><td>${k.personelNo}</td><td>${_ykKacir(k.adSoyad)}</td><td>${_ykKacir(k.firmaAdi)}</td><td>${_kisiUygunlukOzetiHtml(k)}</td></tr>`).join('') || '<tr><td colspan="4">Tüm personel uygun.</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="card-title" style="margin:20px 0 8px;"><h3 style="margin:0; font-size:14px;">Uygun Olmayan Araç / Ekipman</h3></div>
    <div class="tablo-scroll">
      <table class="veri-tablosu">
        <thead><tr><th>Araç No</th><th>Plaka / Seri No</th><th>Firma</th><th>Uygunluk Durumu</th></tr></thead>
        <tbody>
          ${ozet.uygunOlmayanAraclar.map(a => `<tr><td>${a.aracNo}</td><td>${_ykKacir(a.kimlik)}</td><td>${_ykKacir(a.firmaAdi)}</td><td><span class="genel-rozet rozet-uygun-degil">Uygun Değil</span></td></tr>`).join('') || '<tr><td colspan="4">Tüm araç/ekipman uygun.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

// ==================== Ortak yardımcılar ====================

function temizleFormHatalari(formId) {
  document.querySelectorAll('#' + formId + ' .alan-hatasi').forEach(el => el.textContent = '');
}

function formHatalariniGoster(hatalar) {
  Object.keys(hatalar).forEach(alan => {
    const hataEl = document.getElementById(alan + 'Hata');
    if (hataEl) hataEl.textContent = hatalar[alan];
  });
}
