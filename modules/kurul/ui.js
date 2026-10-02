// İSG Kurulu ana sayfa (Toplantılar / Tüm Kararlar / Özet) DOM işlemleri.

let _kurulGorunum = 'toplantilar';
let _duzenlenenToplantiId = null;
let _gundemTaslak = [];

// Her yeni toplantıda varsayılan olarak gelen standart gündem maddeleri.
// Kullanıcı silmezse aynen kalır, silerse bir daha o toplantı için geri gelmez
// (zaten kaydedilen toplantı.gundem düzenlendiğinde kullanılır); isterse
// altına "+ Gündem Maddesi Ekle" ile yenilerini ekleyebilir.
// Liste 2026-08-04'te kullanıcının verdiği kesin sırayla değiştirildi: önce
// olaylar, sonra bu toplantıda görüşülecek/alınacak konular, en son devreden
// kararlar — kurul raporu çıktılarındaki (bkz. cikti.js) "Bu Toplantıda
// Alınan Kararlar" / "Devreden Kararlar" bölüm sırasıyla aynı. 2026-08-07'de
// aynı 6 madde kullanıcının verdiği daha kısa/net metinle güncellendi (1.
// madde artık tehlike/ramak kala bildirimleri ve acil durumları da açıkça
// kapsıyor).
const VARSAYILAN_GUNDEM_MADDELERI = [
  'Olaylar; tehlike ve ramak kala bildirimleri, iş kazaları ve acil durumlar',
  'Yeni görüşülecek konular',
  'Devreden kararlar',
  'Yapılan İSG çalışmaları',
  'Çalışan temsilcilerinin görüş ve önerileri',
  'Kapatılan ve tespit edilen uygunsuzluklar'
];

// "Dönem" alanından (ör. 2026-08) "Ağustos 2026 İSG KURUL TOPLANTISI" başlığını
// üretir -- gerçek verilerinizdeki mevcut toplantı başlıklarıyla aynı kalıp
// (ay adının sadece ilk harfi büyük, geri kalanı büyük harf).
function _kurulToplantiBasligiOner(donem) {
  if (!donem) return '';
  const d = new Date(donem + '-01T00:00:00');
  if (isNaN(d)) return '';
  const ayAdi = d.toLocaleDateString('tr-TR', { month: 'long' });
  const ayAdiBuyukIlkHarf = ayAdi.charAt(0).toLocaleUpperCase('tr-TR') + ayAdi.slice(1);
  return `${ayAdiBuyukIlkHarf} ${d.getFullYear()} İSG KURUL TOPLANTISI`;
}

function kurulSayfasiniBaslat() {
  document.getElementById('yeniToplantiBtn').addEventListener('click', () => modalAc());
  document.getElementById('modalKapatBtn').addEventListener('click', modalKapat);
  document.getElementById('modalIptalBtn').addEventListener('click', modalKapat);
  document.getElementById('toplantiForm').addEventListener('submit', formGonderildi);
  document.getElementById('aramaKutusu').addEventListener('input', e => toplantilariCiz(e.target.value));
  document.getElementById('gundemEkleBtn').addEventListener('click', gundemSatiriEkle);
  document.getElementById('donem').addEventListener('change', () => {
    const oneri = _kurulToplantiBasligiOner(document.getElementById('donem').value);
    if (oneri) document.getElementById('baslik').value = oneri;
  });

  document.getElementById('sekmeToplantilar').addEventListener('click', () => gorunumDegistir('toplantilar'));
  document.getElementById('sekmeKararlar').addEventListener('click', () => gorunumDegistir('kararlar'));
  document.getElementById('sekmeOzet').addEventListener('click', () => gorunumDegistir('ozet'));
  document.getElementById('sekmeDenetim').addEventListener('click', () => gorunumDegistir('denetim'));
  document.getElementById('denetimDisaAktarBtn').addEventListener('click', () => {
    const satirlar = denetimKayitlariniGetir().map(d => Object.assign({}, d, {
      tarihGoruntu: new Date(d.tarihISO).toLocaleString('tr-TR'),
      degisenAlanlar: _denetimDegisenAlanlariOzetle(d)
    }));
    excelDisaAktar(satirlar, DENETIM_EXPORT_KOLONLARI, 'kurul_denetim_kaydi.xlsx');
  });
  document.getElementById('denetimTemizleBtn').addEventListener('click', async () => {
    if (await onayModali('Tüm denetim kaydı kalıcı olarak silinecek. Devam edilsin mi?', 'Temizle')) {
      denetimTemizle();
      denetimCiz();
    }
  });
  document.getElementById('kararDurumFiltre').addEventListener('change', () => kararlariCiz(document.getElementById('kararAramaKutusu').value));
  document.getElementById('kararAramaKutusu').addEventListener('input', e => kararlariCiz(e.target.value));
  document.getElementById('kararDisaAktarBtn').addEventListener('click', () => {
    const durumFiltre = document.getElementById('kararDurumFiltre').value;
    const kararlar = tumKararlariGetir(document.getElementById('kararAramaKutusu').value, durumFiltre ? { durum: durumFiltre } : {});
    excelDisaAktar(kararlar, KURUL_KARAR_EXPORT_KOLONLARI, 'kurul_kararlari.xlsx');
  });

  gorunumDegistir('toplantilar');
}

const KURUL_KARAR_EXPORT_KOLONLARI = [
  { anahtar: 'kararNo', baslik: 'Karar No' },
  { anahtar: 'toplantiNo', baslik: 'Toplantı No' },
  { anahtar: 'kaynakGundem', baslik: 'Konu / Başlık' },
  { anahtar: 'kararMetni', baslik: 'Karar Metni' },
  { anahtar: 'sorumlu', baslik: 'Sorumlu' },
  { anahtar: 'termin', baslik: 'Termin' },
  { anahtar: 'oncelik', baslik: 'Öncelik' },
  { anahtar: 'durumGoruntu', baslik: 'Durum' }
];

function gorunumDegistir(gorunum) {
  _kurulGorunum = gorunum;
  document.getElementById('sekmeToplantilar').classList.toggle('sekme-seciliDegil', gorunum !== 'toplantilar');
  document.getElementById('sekmeKararlar').classList.toggle('sekme-seciliDegil', gorunum !== 'kararlar');
  document.getElementById('sekmeOzet').classList.toggle('sekme-seciliDegil', gorunum !== 'ozet');
  document.getElementById('sekmeDenetim').classList.toggle('sekme-seciliDegil', gorunum !== 'denetim');
  document.getElementById('toplantilarBolumu').style.display = gorunum === 'toplantilar' ? '' : 'none';
  document.getElementById('kararlarBolumu').style.display = gorunum === 'kararlar' ? '' : 'none';
  document.getElementById('ozetBolumu').style.display = gorunum === 'ozet' ? '' : 'none';
  document.getElementById('denetimBolumu').style.display = gorunum === 'denetim' ? '' : 'none';

  if (gorunum === 'toplantilar') toplantilariCiz(document.getElementById('aramaKutusu').value);
  else if (gorunum === 'kararlar') kararlariCiz('');
  else if (gorunum === 'denetim') denetimCiz();
  else ozetiCiz();
}

const DENETIM_EYLEM_ETIKETLERI = { ekle: 'Eklendi', guncelle: 'Güncellendi', sil: 'Silindi' };
const DENETIM_VARLIK_ETIKETLERI = { toplanti: 'Toplantı', karar: 'Karar', aksiyon: 'Aksiyon', olay: 'Olay', imza: 'İmza Listesi', ayIciFaaliyet: 'Ay İçi Faaliyet' };

function _denetimDegisenAlanlariOzetle(kayit) {
  if (kayit.eylem === 'ekle') return 'Yeni kayıt';
  if (kayit.eylem === 'sil') return 'Kayıt silindi';
  if (!kayit.once || !kayit.sonra) return '-';
  const degisen = Object.keys(kayit.sonra).filter(alan => JSON.stringify(kayit.once[alan]) !== JSON.stringify(kayit.sonra[alan]));
  return degisen.length ? degisen.join(', ') : '-';
}

const DENETIM_EXPORT_KOLONLARI = [
  { anahtar: 'tarihGoruntu', baslik: 'Tarih/Saat' },
  { anahtar: 'varlikTuru', baslik: 'Varlık' },
  { anahtar: 'eylem', baslik: 'Eylem' },
  { anahtar: 'kullanici', baslik: 'Kullanıcı' },
  { anahtar: 'degisenAlanlar', baslik: 'Değişen Alanlar' }
];

function denetimCiz() {
  const govde = document.getElementById('denetimTabloGovde');
  const bosDurum = document.getElementById('denetimBosDurum');
  const kayitlar = denetimKayitlariniGetir();

  govde.innerHTML = '';
  if (kayitlar.length === 0) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = 'Henüz denetim kaydı yok.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  kayitlar.forEach(d => {
    const satir = document.createElement('tr');
    satir.innerHTML = `
      <td>${new Date(d.tarihISO).toLocaleString('tr-TR')}</td>
      <td>${DENETIM_VARLIK_ETIKETLERI[d.varlikTuru] || d.varlikTuru}</td>
      <td>${DENETIM_EYLEM_ETIKETLERI[d.eylem] || d.eylem}</td>
      <td>${d.kullanici || '-'}</td>
      <td>${_denetimDegisenAlanlariOzetle(d)}</td>
    `;
    govde.appendChild(satir);
  });
}

function toplantilariCiz(aramaMetni) {
  const govde = document.getElementById('tabloGovde');
  const bosDurum = document.getElementById('bosDurum');
  const toplantilar = toplantilariGetir(aramaMetni);

  govde.innerHTML = '';

  if (toplantilar.length === 0) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = aramaMetni ? 'Aramanızla eşleşen toplantı bulunamadı.' : 'Henüz toplantı eklenmedi.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  toplantilar.forEach(t => {
    const satir = document.createElement('tr');
    satir.innerHTML = `
      <td>${t.toplantiNo}</td>
      <td>${t.baslik}</td>
      <td>${gunAyYil(t.tarih)} ${t.saat}</td>
      <td>${t.yer || '-'}</td>
      <td>${t.durum}</td>
      <td>${t.gundem.length}</td>
      <td>${toplantiKararSayisi(t.id)}</td>
      <td>
        <a class="tablo-buton" href="toplanti.html?id=${t.id}">Detay</a>
        <button class="tablo-buton" data-duzenle="${t.id}">Düzenle</button>
        <button class="tablo-buton sil" data-sil="${t.id}">Sil</button>
      </td>
    `;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-duzenle]').forEach(btn => {
    btn.addEventListener('click', () => modalAc(toplantiIdIleGetirRepo(btn.getAttribute('data-duzenle'))));
  });
  govde.querySelectorAll('[data-sil]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (await onayModali('Bu toplantıyı ve bağlı kararlarını silmek istediğinize emin misiniz?', 'Sil')) {
        toplantiSil(btn.getAttribute('data-sil'));
        toplantilariCiz(document.getElementById('aramaKutusu').value);
      }
    });
  });
}

function kararlariCiz(aramaMetni) {
  const govde = document.getElementById('kararTabloGovde');
  const bosDurum = document.getElementById('kararBosDurum');
  const durumFiltre = document.getElementById('kararDurumFiltre').value;
  const kararlar = tumKararlariGetir(aramaMetni, durumFiltre ? { durum: durumFiltre } : {});

  govde.innerHTML = '';

  if (kararlar.length === 0) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = 'Eşleşen karar bulunamadı.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  kararlar.forEach(k => {
    const satir = document.createElement('tr');
    satir.innerHTML = `
      <td>${k.kararNo}</td>
      <td><a href="toplanti.html?id=${k.toplantiId}">${k.toplantiNo}</a></td>
      <td>${k.kaynakGundem || '-'}</td>
      <td>${k.kararMetni}</td>
      <td>${k.sorumlu}</td>
      <td>${gunAyYil(k.termin) || '-'}</td>
      <td>${k.oncelik}</td>
      <td>${k.durumGoruntu}${k.suAndaDevredenMi ? ' <span style="font-size:10px; color:var(--metin-soluk);">(devreden)</span>' : ''}</td>
    `;
    govde.appendChild(satir);
  });
}

function ozetiCiz() {
  const ozet = kurulOzetiHesapla();
  const kutu = document.getElementById('ozetKutusu');
  const kart = (etiket, deger) => `<div class="istatistik-kutu"><span>${etiket}</span><b>${deger}</b></div>`;

  kutu.innerHTML = `
    <div class="istatistik-grid">
      ${kart('Toplam Toplantı', ozet.toplamToplanti)}
      ${kart('Toplam Karar', ozet.toplamKarar)}
      ${kart('Açık Karar', ozet.acikKarar)}
      ${kart('Kapalı Karar', ozet.kapaliKarar)}
      ${kart('Gecikmiş Karar', ozet.gecikmisKarar)}
      ${kart('Devreden Karar', ozet.devredenKarar)}
    </div>
  `;
}

// ---- Toplantı ekle/düzenle modalı ----

function gundemSatiriEkle() {
  _gundemTaslak.push(gundemMaddesiOlustur({}));
  gundemListesiniCiz();
}

function gundemListesiniCiz() {
  const kutu = document.getElementById('gundemListesi');
  kutu.innerHTML = _gundemTaslak.map((g, i) => `
    <div class="form-satir-ikili" style="grid-template-columns: 1fr 1fr 32px; align-items:start; margin-bottom:8px;" data-gundem-satir="${g.id}">
      <input placeholder="Gündem maddesi" data-gundem-alan="baslik" data-gundem-id="${g.id}" value="${g.baslik.replace(/"/g, '&quot;')}">
      <input placeholder="Not (opsiyonel)" data-gundem-alan="not" data-gundem-id="${g.id}" value="${g.not.replace(/"/g, '&quot;')}">
      <button type="button" class="tablo-buton sil" data-gundem-sil="${g.id}" title="Sil">✕</button>
    </div>
  `).join('') || '<p style="font-size:12px; color:var(--metin-soluk);">Henüz gündem maddesi eklenmedi.</p>';

  kutu.querySelectorAll('[data-gundem-alan]').forEach(el => {
    el.addEventListener('input', () => {
      const madde = _gundemTaslak.find(g => g.id === el.getAttribute('data-gundem-id'));
      if (madde) madde[el.getAttribute('data-gundem-alan')] = el.value;
    });
  });
  kutu.querySelectorAll('[data-gundem-sil]').forEach(btn => {
    btn.addEventListener('click', () => {
      _gundemTaslak = _gundemTaslak.filter(g => g.id !== btn.getAttribute('data-gundem-sil'));
      gundemListesiniCiz();
    });
  });
}

function modalAc(toplanti) {
  _duzenlenenToplantiId = toplanti ? toplanti.id : null;
  _gundemTaslak = toplanti
    ? toplanti.gundem.map(g => Object.assign({}, g))
    : VARSAYILAN_GUNDEM_MADDELERI.map(baslik => gundemMaddesiOlustur({ baslik }));

  document.getElementById('modalBaslik').textContent = toplanti ? 'Toplantıyı Düzenle' : 'Yeni Toplantı';
  document.getElementById('toplantiNo').value = toplanti ? (toplanti.toplantiNo || '') : '';
  document.getElementById('baslik').value = toplanti ? toplanti.baslik : '';
  document.getElementById('tarih').value = toplanti ? toplanti.tarih : '';
  document.getElementById('saat').value = toplanti ? toplanti.saat : '14:00';
  document.getElementById('donem').value = toplanti ? (toplanti.donem || '') : '';
  document.getElementById('yer').value = toplanti ? toplanti.yer : '';
  document.getElementById('katilimciSayisi').value = toplanti ? (toplanti.katilimciSayisi || '') : '';
  document.getElementById('tesis').value = toplanti ? (toplanti.tesis || '') : '';
  document.getElementById('bolum').value = toplanti ? (toplanti.bolum || '') : '';
  document.getElementById('katilimcilar').value = toplanti ? toplanti.katilimcilar.join(', ') : '';
  document.getElementById('durum').innerHTML = TOPLANTI_DURUMLARI.map(d => `<option ${toplanti && toplanti.durum === d ? 'selected' : ''}>${d}</option>`).join('');
  document.getElementById('faaliyetMetni').value = toplanti ? (toplanti.faaliyetMetni || '') : '';
  document.getElementById('metrikler').value = toplanti ? (toplanti.metrikler || '') : '';
  document.getElementById('calisanTemsilcisiGorusleri').value = toplanti ? (toplanti.calisanTemsilcisiGorusleri || '') : '';
  document.getElementById('notlar').value = toplanti ? toplanti.notlar : '';

  gundemListesiniCiz();
  temizleFormHatalari();
  document.getElementById('modalKatman').classList.add('acik');
}

function modalKapat() {
  document.getElementById('modalKatman').classList.remove('acik');
  _duzenlenenToplantiId = null;
}

function temizleFormHatalari() {
  document.querySelectorAll('#toplantiForm .alan-hatasi').forEach(el => el.textContent = '');
}

function formGonderildi(e) {
  e.preventDefault();
  temizleFormHatalari();

  const veriler = {
    toplantiNo: document.getElementById('toplantiNo').value,
    baslik: document.getElementById('baslik').value,
    tarih: document.getElementById('tarih').value,
    saat: document.getElementById('saat').value,
    donem: document.getElementById('donem').value,
    yer: document.getElementById('yer').value,
    katilimciSayisi: document.getElementById('katilimciSayisi').value,
    tesis: document.getElementById('tesis').value,
    bolum: document.getElementById('bolum').value,
    katilimcilar: document.getElementById('katilimcilar').value,
    gundem: _gundemTaslak.filter(g => g.baslik.trim()),
    durum: document.getElementById('durum').value,
    faaliyetMetni: document.getElementById('faaliyetMetni').value,
    metrikler: document.getElementById('metrikler').value,
    calisanTemsilcisiGorusleri: document.getElementById('calisanTemsilcisiGorusleri').value,
    notlar: document.getElementById('notlar').value
  };

  const sonuc = _duzenlenenToplantiId
    ? toplantiGuncelle(_duzenlenenToplantiId, veriler)
    : toplantiEkle(veriler);

  if (!sonuc.basarili) {
    Object.keys(sonuc.hatalar).forEach(alan => {
      const hataEl = document.getElementById(alan + 'Hata');
      if (hataEl) hataEl.textContent = sonuc.hatalar[alan];
    });
    return;
  }

  modalKapat();
  toplantilariCiz(document.getElementById('aramaKutusu').value);
}
