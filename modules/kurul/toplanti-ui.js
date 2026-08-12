// Toplantı detay ekranının DOM işlemleri (gündem + kararlar + tutanak).

let _toplantiId = null;
let _duzenlenenKararId = null;
let _duzenlenenOlayId = null;
let _kararFotoOncesi = '';
let _kararFotoSonrasi = '';
let _kararFotoEk = [];
let _olayFotograflari = [];

// Olay yeri fotoğrafları — kararın _kararFotoEkOnizlemeCiz'iyle aynı desen
// (bkz. o fonksiyon), en fazla 3 fotoğraf. Olay/Kaza modülündeki
// _olayFotoOnizlemeCiz ile de aynı görünüm/mantık.
function _olayFotoOnizlemeCiz() {
  const kutu = document.getElementById('olayFotoOnizleme');
  kutu.innerHTML = _olayFotograflari.map((f, i) => `
    <div style="display:inline-flex; flex-direction:column; align-items:center; gap:4px; margin:0 10px 10px 0;">
      <img data-foto-ref="${f.url}" style="width:64px; height:64px; object-fit:cover; border-radius:8px; border:1px solid var(--kenarlik);">
      <button type="button" data-foto-kaldir="${i}" class="tablo-buton sil">Kaldır</button>
    </div>
  `).join('') + (_olayFotograflari.length ? '' : '<div style="font-size:12px; color:var(--metin-soluk);">Henüz fotoğraf eklenmedi.</div>')
    + (_olayFotograflari.length >= 3 ? '<div style="font-size:12px; color:var(--metin-soluk);">En fazla 3 fotoğraf eklenebilir.</div>' : '');
  kutu.querySelectorAll('[data-foto-kaldir]').forEach(btn => {
    btn.addEventListener('click', () => {
      _olayFotograflari.splice(Number(btn.getAttribute('data-foto-kaldir')), 1);
      _olayFotoOnizlemeCiz();
    });
  });
  fotoReferanslariCoz(kutu);
}

function _kararTekFotoOnizlemeCiz(kutuId, url, temizleFn) {
  const kutu = document.getElementById(kutuId);
  kutu.innerHTML = url
    ? `<div style="display:flex; align-items:center; gap:10px;">
         <img data-foto-ref="${url}" style="width:64px; height:64px; object-fit:cover; border-radius:8px; border:1px solid var(--kenarlik);">
         <div>
           <div style="font-size:12px; color:#16a34a; font-weight:600;">✓ Fotoğraf eklendi</div>
           <button type="button" class="tablo-buton sil" style="margin-top:4px;">Fotoğrafı Kaldır</button>
         </div>
       </div>`
    : '<div style="font-size:12px; color:var(--metin-soluk);">Henüz fotoğraf eklenmedi.</div>';
  if (url) {
    kutu.querySelector('button').addEventListener('click', temizleFn);
    fotoReferanslariCoz(kutu);
  }
}

function _kararFotoEkOnizlemeCiz() {
  const kutu = document.getElementById('kararFotoEkOnizleme');
  kutu.innerHTML = _kararFotoEk.map((f, i) => `
    <div style="display:inline-flex; flex-direction:column; align-items:center; gap:4px; margin:0 10px 10px 0;">
      <img data-foto-ref="${f.url}" style="width:64px; height:64px; object-fit:cover; border-radius:8px; border:1px solid var(--kenarlik);">
      <button type="button" data-foto-kaldir="${i}" class="tablo-buton sil">Kaldır</button>
    </div>
  `).join('') + (_kararFotoEk.length ? '' : '<div style="font-size:12px; color:var(--metin-soluk);">Henüz ek fotoğraf eklenmedi.</div>')
    + (_kararFotoEk.length >= 3 ? '<div style="font-size:12px; color:var(--metin-soluk);">En fazla 3 ek fotoğraf eklenebilir.</div>' : '');
  kutu.querySelectorAll('[data-foto-kaldir]').forEach(btn => {
    btn.addEventListener('click', () => {
      _kararFotoEk.splice(Number(btn.getAttribute('data-foto-kaldir')), 1);
      _kararFotoEkOnizlemeCiz();
    });
  });
  fotoReferanslariCoz(kutu);
}

function _toplantiIdAl() {
  return new URLSearchParams(window.location.search).get('id');
}

// İSG Kurulları Hakkında Yönetmelik'in ilgili maddelerini (bkz. model.js
// YONETMELIK_MADDELERI) toplantı sayfasındaki daralt/genişlet referans
// kutusuna basar — kullanıcı isteği: "İSG Kurulları İle İlgili Yasal
// Düzenleme" (metin birebir yönetmelikten, özetlenmeden).
function _yonetmelikMaddeleriGoruntuUret() {
  return YONETMELIK_MADDELERI.map(m => `
    <div style="margin-bottom:16px;">
      <div style="font-weight:600; margin-bottom:4px;">${m.madde} – ${m.baslik}</div>
      ${m.fikralar.map(f => `
        <p style="margin:6px 0 2px;">${f.giris}</p>
        ${f.bentler.length ? `<ul style="margin:0 0 6px 20px; padding:0;">${f.bentler.map(b => `<li style="margin-bottom:4px;">${b}</li>`).join('')}</ul>` : ''}
      `).join('')}
    </div>
  `).join('');
}

function toplantiDetaySayfasiniBaslat() {
  _toplantiId = _toplantiIdAl();
  const toplanti = toplantiIdIleGetirRepo(_toplantiId);

  if (!toplanti) {
    document.getElementById('anaIcerik').innerHTML = '<div class="bos-durum gorunur">Toplantı bulunamadı.</div>';
    return;
  }

  _kaynakOlayliBosKararlariTemizle(_toplantiId);

  bilgiKartiniCiz(toplanti);
  _genelDegerlendirmeFormunuDoldur(toplanti);
  gundemListesiniCiz(toplanti);
  kararlariCiz();
  document.getElementById('yonetmelikMaddeleriKutusu').innerHTML = _yonetmelikMaddeleriGoruntuUret();
  document.getElementById('genelDegerlendirmeForm').addEventListener('submit', _genelDegerlendirmeFormGonderildi);

  document.getElementById('yeniKararBtn').addEventListener('click', () => kararModalAc());
  document.getElementById('kararModalKapatBtn').addEventListener('click', kararModalKapat);
  document.getElementById('kararModalIptalBtn').addEventListener('click', kararModalKapat);
  document.getElementById('kararForm').addEventListener('submit', kararFormGonderildi);
  document.getElementById('kararDurum').addEventListener('change', kararKapanisAlanlariniGuncelle);
  document.getElementById('tutanakBtn').addEventListener('click', tutanagiGoster);
  document.getElementById('kararFotoOncesiDosya').addEventListener('change', async e => {
    const dosya = e.target.files[0];
    e.target.value = '';
    if (!dosya) return;
    try {
      const sonuc = await fotoYukle(dosya, 'kurul/' + (_duzenlenenKararId || 'gecici'));
      _kararFotoOncesi = sonuc.url;
      _kararTekFotoOnizlemeCiz('kararFotoOncesiOnizleme', _kararFotoOncesi, () => { _kararFotoOncesi = ''; _kararTekFotoOnizlemeCiz('kararFotoOncesiOnizleme', '', null); });
    } catch (hata) {
      alert(hata.message || 'Fotoğraf yüklenemedi.');
    }
  });
  document.getElementById('kararFotoSonrasiDosya').addEventListener('change', async e => {
    const dosya = e.target.files[0];
    e.target.value = '';
    if (!dosya) return;
    try {
      const sonuc = await fotoYukle(dosya, 'kurul/' + (_duzenlenenKararId || 'gecici'));
      _kararFotoSonrasi = sonuc.url;
      _kararTekFotoOnizlemeCiz('kararFotoSonrasiOnizleme', _kararFotoSonrasi, () => { _kararFotoSonrasi = ''; _kararTekFotoOnizlemeCiz('kararFotoSonrasiOnizleme', '', null); });
    } catch (hata) {
      alert(hata.message || 'Fotoğraf yüklenemedi.');
    }
  });
  document.getElementById('kararFotoEkDosya').addEventListener('change', async e => {
    const dosya = e.target.files[0];
    e.target.value = '';
    if (!dosya) return;
    if (_kararFotoEk.length >= 3) { alert('Bu karara zaten 3 ek fotoğraf eklenmiş. Fazlası eklenemez.'); return; }
    try {
      const sonuc = await fotoYukle(dosya, 'kurul/' + (_duzenlenenKararId || 'gecici'));
      _kararFotoEk.push({ url: sonuc.url });
      _kararFotoEkOnizlemeCiz();
    } catch (hata) {
      alert(hata.message || 'Fotoğraf yüklenemedi.');
    }
  });

  document.getElementById('olayFotoDosya').addEventListener('change', async e => {
    const dosya = e.target.files[0];
    e.target.value = '';
    if (!dosya) return;
    if (_olayFotograflari.length >= 3) { alert('Bu olaya zaten 3 fotoğraf eklenmiş. Fazlası eklenemez.'); return; }
    try {
      const sonuc = await fotoYukle(dosya, 'kurul/olay-' + _toplantiId);
      _olayFotograflari.push({ url: sonuc.url });
      _olayFotoOnizlemeCiz();
    } catch (hata) {
      alert(hata.message || 'Fotoğraf yüklenemedi.');
    }
  });

  tespitEdilenUygunsuzluklariCiz(toplanti);
  kapananUygunsuzluklariCiz(toplanti);
  aylikEgitimleriCiz(toplanti);

  ayIciFaaliyetleriCiz();
  document.getElementById('yeniAyIciFaaliyetBtn').addEventListener('click', () => ayIciFaaliyetModalAc());
  document.getElementById('ayIciFaaliyetModalKapatBtn').addEventListener('click', ayIciFaaliyetModalKapat);
  document.getElementById('ayIciFaaliyetModalIptalBtn').addEventListener('click', ayIciFaaliyetModalKapat);
  document.getElementById('ayIciFaaliyetForm').addEventListener('submit', ayIciFaaliyetFormGonderildi);

  olaylariCiz();
  document.getElementById('yeniOlayBtn').addEventListener('click', () => olayModalAc());
  document.getElementById('olayModalKapatBtn').addEventListener('click', olayModalKapat);
  document.getElementById('olayModalIptalBtn').addEventListener('click', olayModalKapat);
  document.getElementById('olayForm').addEventListener('submit', olayFormGonderildi);

  imzalariCiz();
  document.getElementById('yeniImzaBtn').addEventListener('click', () => imzaModalAc());
  document.getElementById('imzaModalKapatBtn').addEventListener('click', imzaModalKapat);
  document.getElementById('imzaModalIptalBtn').addEventListener('click', imzaModalKapat);
  document.getElementById('imzaForm').addEventListener('submit', imzaFormGonderildi);

  ciktiButonlariniBagla();

  document.getElementById('kararSablonIndirBtn').addEventListener('click', () => {
    excelSablonIndir(KARAR_IMPORT_KOLONLARI, 'kurul_karar_sablonu.xlsx');
  });
  document.getElementById('kararDisaAktarBtn').addEventListener('click', () => {
    excelDisaAktar(toplantiKararlariniGetir(_toplantiId), KARAR_EXPORT_KOLONLARI, toplanti.toplantiNo + '_kararlari.xlsx');
  });
  document.getElementById('kararIceAktarBtn').addEventListener('click', () => {
    document.getElementById('kararIceAktarDosya').click();
  });
  document.getElementById('kararlaraVarsayilanOyBtn').addEventListener('click', () => {
    const sonuc = toplantiKararlarinaVarsayilanOyUygula(_toplantiId);
    alert(sonuc.guncellenenSayisi
      ? `${sonuc.guncellenenSayisi} kararın oy dökümü, katılımcı sayısına göre (${sonuc.katilimciSayisi} Kabul / 0 Ret / 0 Çekimser) dolduruldu. Gerekirse her kararı ayrı ayrı düzenleyebilirsiniz.`
      : 'Tüm kararların oy dökümü zaten girilmiş — değiştirilen olmadı.');
    kararlariCiz();
  });
  document.getElementById('kararIceAktarDosya').addEventListener('change', e => {
    const dosya = e.target.files[0];
    excelIceAktar(dosya, KARAR_IMPORT_KOLONLARI, (satirlar, hataMesaji) => {
      e.target.value = '';
      if (hataMesaji) { alert(hataMesaji); return; }
      satirlar.forEach(satir => { satir.termin = excelTarihiNormallestir(satir.termin); });
      const sonuc = excelToplulIceAktarSonucOzetle(satirlar, satir => kararEkle(_toplantiId, satir));
      alert(excelIceAktarOzetMesaji(sonuc));
      kararlariCiz();
    });
  });

  document.getElementById('imzaSablonIndirBtn').addEventListener('click', () => {
    excelSablonIndir(IMZA_IMPORT_KOLONLARI, 'kurul_imza_sablonu.xlsx');
  });
  document.getElementById('imzaDisaAktarBtn').addEventListener('click', () => {
    const satirlar = toplantiImzalariniGetir(_toplantiId).map(i => Object.assign({}, i, { katildiMi: i.katildiMi ? 'Evet' : 'Hayır' }));
    excelDisaAktar(satirlar, IMZA_EXPORT_KOLONLARI, toplanti.toplantiNo + '_imza_listesi.xlsx');
  });
  document.getElementById('imzaIceAktarBtn').addEventListener('click', () => {
    document.getElementById('imzaIceAktarDosya').click();
  });
  document.getElementById('imzaIceAktarDosya').addEventListener('change', e => {
    const dosya = e.target.files[0];
    excelIceAktar(dosya, IMZA_IMPORT_KOLONLARI, (satirlar, hataMesaji) => {
      e.target.value = '';
      if (hataMesaji) { alert(hataMesaji); return; }
      satirlar.forEach(satir => { satir.katildiMi = !/^(hay[iı]r|no|0)$/i.test(String(satir.katildiMi || '').trim()); });
      const sonuc = excelToplulIceAktarSonucOzetle(satirlar, satir => imzaSatiriEkle(_toplantiId, satir));
      alert(excelIceAktarOzetMesaji(sonuc));
      imzalariCiz();
    });
  });
}

const IMZA_IMPORT_KOLONLARI = [
  { anahtar: 'adSoyad', baslik: 'Ad Soyad' },
  { anahtar: 'unvan', baslik: 'Ünvan' },
  { anahtar: 'birim', baslik: 'Birim' },
  { anahtar: 'kuruldakiGorev', baslik: 'Kuruldaki Görevi' },
  { anahtar: 'katildiMi', baslik: 'Katıldı' }
];

const IMZA_EXPORT_KOLONLARI = [
  { anahtar: 'siraNo', baslik: 'Sıra' },
  { anahtar: 'adSoyad', baslik: 'Ad Soyad' },
  { anahtar: 'unvan', baslik: 'Ünvan' },
  { anahtar: 'birim', baslik: 'Birim' },
  { anahtar: 'kuruldakiGorev', baslik: 'Kuruldaki Görevi' },
  { anahtar: 'katildiMi', baslik: 'Katıldı' }
];

const KARAR_IMPORT_KOLONLARI = [
  { anahtar: 'kaynakGundem', baslik: 'Konu / Başlık', esanlamlar: ['Konu', 'Başlık', 'Gündem'] },
  { anahtar: 'kararMetni', baslik: 'Karar Metni' },
  { anahtar: 'sorumlu', baslik: 'Sorumlu' },
  { anahtar: 'termin', baslik: 'Termin' },
  { anahtar: 'oncelik', baslik: 'Öncelik' },
  { anahtar: 'oy', baslik: 'Oy' },
  { anahtar: 'oySonucu', baslik: 'Oy Sonucu' }
];

const KARAR_EXPORT_KOLONLARI = [
  { anahtar: 'kararNo', baslik: 'Karar No' },
  { anahtar: 'kaynakGundem', baslik: 'Konu / Başlık' },
  { anahtar: 'kararMetni', baslik: 'Karar Metni' },
  { anahtar: 'sorumlu', baslik: 'Sorumlu' },
  { anahtar: 'termin', baslik: 'Termin' },
  { anahtar: 'oncelik', baslik: 'Öncelik' },
  { anahtar: 'durumGoruntu', baslik: 'Durum' },
  { anahtar: 'oy', baslik: 'Oy' },
  { anahtar: 'oySonucu', baslik: 'Oy Sonucu' }
];

function bilgiKartiniCiz(toplanti) {
  const bs = toplantiBaskanSekreterGetir(toplanti.id);
  document.getElementById('toplantiBaslik').textContent = toplanti.toplantiNo + ' - ' + toplanti.baslik;
  document.getElementById('toplantiBilgiKutusu').innerHTML = `
    <div class="istatistik-grid" style="grid-template-columns: repeat(5, minmax(150px,1fr));">
      <div class="istatistik-kutu"><span>Tarih / Saat</span><b style="font-size:15px;">${gunAyYil(toplanti.tarih)} ${toplanti.saat}</b></div>
      <div class="istatistik-kutu"><span>Dönem</span><b style="font-size:15px;">${_ciktiDonemMetni(toplanti)}</b></div>
      <div class="istatistik-kutu"><span>Yer</span><b style="font-size:15px;">${toplanti.yer || '-'}</b></div>
      <div class="istatistik-kutu"><span>Başkan / Kurul Sekreteri</span><b style="font-size:15px;">${bs.baskan || '-'} / ${bs.yazman || '-'}</b></div>
      <div class="istatistik-kutu"><span>Durum</span><b style="font-size:15px;">${toplanti.durum}</b></div>
    </div>
    <p style="font-size:13px;"><strong>Katılımcılar:</strong> ${toplanti.katilimcilar.join(', ') || '-'}</p>
    ${toplanti.notlar ? `<p style="font-size:13px;"><strong>Notlar:</strong> ${toplanti.notlar}</p>` : ''}
  `;
}

// Genel Değerlendirme, önceden yalnızca ayrı "Toplantıyı Düzenle" formundan
// (kurul/index.html) girilebiliyordu -- kullanıcı toplantı sayfasında
// bulamadı ("genel değerlendirme olmamış"). Artık toplantı sayfasında
// doğrudan görünür/düzenlenebilir, diğer tüm bölümlerle aynı yerde.
function _genelDegerlendirmeFormunuDoldur(toplanti) {
  document.getElementById('gdGenelDegerlendirme').value = toplanti.genelDegerlendirme || '';
  document.getElementById('gdPlanlananFaaliyetlerGerceklesme').value = toplanti.planlananFaaliyetlerGerceklesme || '';
  document.getElementById('gdTespitEdilenHususlar').value = toplanti.tespitEdilenHususlar || '';
  document.getElementById('gdCalisanBildirimleri').value = toplanti.calisanBildirimleri || '';
}

function _genelDegerlendirmeFormGonderildi(e) {
  e.preventDefault();
  const mevcut = toplantiIdIleGetirRepo(_toplantiId);
  if (!mevcut) return;

  const sonuc = toplantiGuncelle(_toplantiId, Object.assign({}, mevcut, {
    genelDegerlendirme: document.getElementById('gdGenelDegerlendirme').value,
    planlananFaaliyetlerGerceklesme: document.getElementById('gdPlanlananFaaliyetlerGerceklesme').value,
    tespitEdilenHususlar: document.getElementById('gdTespitEdilenHususlar').value,
    calisanBildirimleri: document.getElementById('gdCalisanBildirimleri').value
  }));
  if (!sonuc.basarili) return;

  const mesaj = document.getElementById('gdKaydedildiMesaji');
  mesaj.style.display = '';
  setTimeout(() => { mesaj.style.display = 'none'; }, 2000);
}

function gundemListesiniCiz(toplanti) {
  const kutu = document.getElementById('gundemGoruntuKutusu');
  // "Olaylar" gündem maddesinin altında, o toplantının (otomatik + elle
  // eklenen, toplantı tarihine kadar olan) olaylarının kısa dökümü canlı
  // olarak gösterilir — kullanıcı isteği: "toplantı tarihine kadar olan
  // olayları da gündeme ekleyelim".
  const olaylarMetni = toplantiOlaylarGundemMetni(toplanti.id);
  kutu.innerHTML = toplanti.gundem.length
    ? `<ol style="padding-left:20px; font-size:13px;">${toplanti.gundem.map(g => {
        const otoNot = /^olaylar/i.test(g.baslik.trim()) && olaylarMetni
          ? `<div style="margin-top:2px; color:var(--metin-soluk); font-size:12px;">${olaylarMetni}</div>`
          : '';
        return `<li style="margin-bottom:6px;">${g.baslik}${g.not ? ' — ' + g.not : ''}${otoNot}</li>`;
      }).join('')}</ol>`
    : '<div class="bos-durum gorunur">Gündem maddesi eklenmemiş.</div>';
}

function _kararFotoHucresiUret(k) {
  const img = (url, baslik) => url ? `<img data-foto-ref="${url}" title="${baslik}" style="width:26px; height:26px; object-fit:cover; border-radius:6px; margin-right:2px;">` : '';
  const parcalar = [
    img(k.fotoOncesi, 'Öncesi'),
    img(k.fotoSonrasi, 'Sonrası'),
    ...(k.fotografEk || []).map(f => img(f.url, 'Ek'))
  ].filter(Boolean);
  return parcalar.join('') || '-';
}

function _kararTablosunuCiz(govdeId, bosDurumId, bosMesaj, kararlar) {
  const govde = document.getElementById(govdeId);
  const bosDurum = document.getElementById(bosDurumId);
  govde.innerHTML = '';

  if (kararlar.length === 0) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = bosMesaj;
    return;
  }
  bosDurum.classList.remove('gorunur');

  kararlar.forEach(k => {
    const satir = document.createElement('tr');
    const tamamlandiRozeti = k.durum === 'Kapalı' ? ' <span style="font-size:10px; color:var(--metin-soluk);">(Tamamlandı)</span>' : '';
    satir.innerHTML = `
      <td>${k.kararNo}</td>
      <td>${k.kaynakGundem || '-'}</td>
      <td>${k.kararMetni}</td>
      <td>${k.sorumlu}</td>
      <td>${gunAyYil(k.termin) || '-'}</td>
      <td>${k.oncelik}</td>
      <td>${k.durumGoruntu}${tamamlandiRozeti}</td>
      <td>${_kararFotoHucresiUret(k)}</td>
      <td class="sutun-sabit">
        <button class="tablo-buton" data-duzenle="${k.id}">Düzenle</button>
        <button class="tablo-buton" data-tasi="${k.id}">Taşı</button>
        <button class="tablo-buton sil" data-sil="${k.id}">Sil</button>
      </td>
    `;
    govde.appendChild(satir);
  });
  fotoReferanslariCoz(govde);

  govde.querySelectorAll('[data-duzenle]').forEach(btn => {
    btn.addEventListener('click', () => kararModalAc(kararIdIleGetirRepo(btn.getAttribute('data-duzenle'))));
  });

  govde.querySelectorAll('[data-sil]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Bu kararı silmek istediğinize emin misiniz?')) {
        kararSil(btn.getAttribute('data-sil'));
        kararlariCiz();
      }
    });
  });

  govde.querySelectorAll('[data-tasi]').forEach(btn => {
    btn.addEventListener('click', () => {
      const digerToplantilar = toplantiTumunuGetir().filter(t => t.id !== _toplantiId);
      if (!digerToplantilar.length) { alert('Taşınacak başka bir toplantı yok.'); return; }
      const secenekler = digerToplantilar.map((t, i) => `${i + 1}. ${t.toplantiNo} - ${t.baslik} (${gunAyYil(t.tarih)})`).join('\n');
      const secim = prompt('Bu kararı hangi toplantıya taşımak istiyorsunuz?\n(Devreden/Bu Toplantının Kararı ayrımı, taşındığı toplantıya göre otomatik belirlenir.)\n\n' + secenekler + '\n\nNumara girin:');
      const index = parseInt(secim, 10) - 1;
      if (Number.isInteger(index) && digerToplantilar[index]) {
        kararTasi(btn.getAttribute('data-tasi'), digerToplantilar[index].id);
        kararlariCiz();
      }
    });
  });
}

// Devreden/yeni ayrımı artık otomatik hesaplanır (bkz. service.js
// toplantiKararGruplariniGetirVeIsaretle): açık kararlar kapanana kadar her
// toplantıda devreden olarak görünür; kapananlar kapandıktan sonraki ilk
// toplantıda "(Tamamlandı)" ile bir kez gösterilip bir daha görünmez. Elle
// "devret" işlemine gerek yoktur.
function kararlariCiz() {
  const { devreden, yeni } = toplantiKararGruplariniGetirVeIsaretle(_toplantiId);
  _kararTablosunuCiz('kararDevredenTabloGovde', 'kararDevredenBosDurum', 'Devreden karar bulunmamaktadır.', devreden);
  _kararTablosunuCiz('kararYeniTabloGovde', 'kararYeniBosDurum', 'Bu toplantı için henüz karar eklenmedi.', yeni);
}

// ==================== OLAYLAR ====================

function olaylariCiz() {
  const govde = document.getElementById('olayTabloGovde');
  const bosDurum = document.getElementById('olayBosDurum');
  const olaylar = toplantiOlaylariniGetir(_toplantiId);

  govde.innerHTML = '';
  if (olaylar.length === 0) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = 'Bu toplantı için görüşülen olay eklenmedi.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  // Yukarı/Aşağı oku, yalnızca elle eklenen olaylar arasındaki SIRAYA göre
  // hesaplanır (otomatik olaylar hep en üstte sabit, kullanıcı isteği:
  // "isg kurulu olay içinde yukarı aşağı taşıma olsun" — toplantılar arası
  // taşıma değil, aynı toplantı içinde sıralama).
  const manuelOlaylar = olaylar.filter(o => !o.otomatik);
  let manuelSira = -1;

  olaylar.forEach(o => {
    if (!o.otomatik) manuelSira++;
    const satir = document.createElement('tr');
    satir.innerHTML = `
      <td>${o.tur}${o.otomatik ? ' <span style="font-size:10px; color:var(--metin-soluk);">(Olay/Kaza modülünden)</span>' : ''}</td><td>${gunAyYil(o.tarih)}</td><td>${o.yer || '-'}</td><td>${o.birim || '-'}</td>
      <td>${o.olusSekli || '-'}</td><td>${o.kokNeden || '-'}</td><td>${o.isGunuKaybi || '-'}</td>
      <td>${o.otomatik ? '-' : (o.kararMetni || '-')}</td>
      <td>${o.otomatik ? '-' : (o.sorumlu || '-')}</td>
      <td>${o.otomatik ? '-' : (gunAyYil(o.termin) || '-')}</td>
      <td>${o.otomatik ? '-' : (o.oncelik || '-')}</td>
      <td>${o.otomatik ? '-' : (o.durum || '-')}</td>
      <td>${_olayFotoHucresiUret(o)}</td>
      <td class="sutun-sabit">
        ${!o.otomatik && manuelSira > 0 ? `<button class="tablo-buton" data-yukari="${o.id}" title="Yukarı taşı">▲</button>` : ''}
        ${!o.otomatik && manuelSira < manuelOlaylar.length - 1 ? `<button class="tablo-buton" data-asagi="${o.id}" title="Aşağı taşı">▼</button>` : ''}
        <button class="tablo-buton" data-duzenle="${o.id}">Düzenle</button>
        <button class="tablo-buton sil" data-sil="${o.id}">Sil</button>
      </td>
    `;
    govde.appendChild(satir);
  });

  // Otomatik (Olay/Kaza modülünden çekilen) satırlarda Düzenle/Sil, normal
  // olaylardan farklı çalışır: gerçek bir kurul_olaylari kaydı olmadıkları
  // için önce "yükseltilir" (Düzenle) ya da kalıcı olarak gizlenir (Sil) —
  // bkz. service.js kurulOtomatikOlayiYukselt / kurulOtomatikOlayiGizle.
  govde.querySelectorAll('[data-duzenle]').forEach(btn => btn.addEventListener('click', () => {
    const olay = olaylar.find(o => o.id === btn.getAttribute('data-duzenle'));
    if (!olay) return;
    if (olay.otomatik) {
      const sonuc = kurulOtomatikOlayiYukselt(_toplantiId, olay);
      olaylariCiz();
      olayModalAc(sonuc.olay);
    } else {
      olayModalAc(olay);
    }
  }));
  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', () => {
    const id = btn.getAttribute('data-sil');
    const olay = olaylar.find(o => o.id === id);
    if (!olay) return;
    if (olay.otomatik) {
      if (confirm('Bu olay bu toplantının listesinden gizlenecek (Olay/Kaza modülündeki asıl kayıt silinmez). Devam edilsin mi?')) {
        kurulOtomatikOlayiGizle(_toplantiId, id.replace(/^oto-/, ''));
        olaylariCiz();
      }
    } else if (confirm('Bu olayı silmek istediğinize emin misiniz?')) {
      kurulOlayiSil(id);
      olaylariCiz();
    }
  }));
  govde.querySelectorAll('[data-yukari]').forEach(btn => btn.addEventListener('click', () => {
    kurulOlayiYukariTasi(btn.getAttribute('data-yukari'));
    olaylariCiz();
  }));
  govde.querySelectorAll('[data-asagi]').forEach(btn => btn.addEventListener('click', () => {
    kurulOlayiAsagiTasi(btn.getAttribute('data-asagi'));
    olaylariCiz();
  }));
  fotoReferanslariCoz(govde);
}

// Karar tablosundaki _kararFotoHucresiUret ile aynı desen — olayın (elle
// eklenen ya da Olay/Kaza modülünden otomatik çekilen) fotoğraflarını küçük
// resim olarak gösterir.
function _olayFotoHucresiUret(o) {
  const parcalar = (o.fotograflar || []).map((f, i) =>
    f && f.url ? `<img data-foto-ref="${f.url}" title="Olay Yeri ${i + 1}" style="width:26px; height:26px; object-fit:cover; border-radius:6px; margin-right:2px;">` : ''
  ).filter(Boolean);
  return parcalar.join('') || '-';
}

function olayModalAc(olay) {
  _duzenlenenOlayId = olay ? olay.id : null;
  document.getElementById('olayModalBaslik').textContent = olay ? 'Olayı Düzenle' : 'Yeni Olay';
  document.getElementById('olayForm').reset();
  document.querySelectorAll('#olayForm .alan-hatasi').forEach(el => el.textContent = '');

  document.getElementById('olayTur').value = olay ? olay.tur : '';
  document.getElementById('olayTarih').value = olay ? olay.tarih : '';
  document.getElementById('olayYer').value = olay ? olay.yer : '';
  document.getElementById('olayBirim').value = olay ? olay.birim : '';
  document.getElementById('olayOlusSekli').value = olay ? olay.olusSekli : '';
  document.getElementById('olayKokNeden').value = olay ? olay.kokNeden : '';
  document.getElementById('olayIsGunuKaybi').value = olay ? olay.isGunuKaybi : '';

  document.getElementById('olayKararMetni').value = olay ? (olay.kararMetni || '') : '';
  document.getElementById('olaySorumlu').value = olay ? (olay.sorumlu || '') : '';
  bolumButonlariCiz('olaySorumluBolumButonlari', 'olaySorumlu', 'tekli');
  document.getElementById('olayTermin').value = olay ? (olay.termin || '') : '';
  document.getElementById('olayOncelik').innerHTML = ['Düşük', 'Normal', 'Yüksek', 'Kritik'].map(o => `<option ${olay && olay.oncelik === o ? 'selected' : ''}>${o}</option>`).join('');
  document.getElementById('olayDurum').innerHTML = KARAR_DURUMLARI.map(d => `<option ${olay && olay.durum === d ? 'selected' : ''}>${d}</option>`).join('');
  if (!olay) document.getElementById('olayOncelik').value = 'Normal';

  document.getElementById('olayOy').value = olay ? (olay.oy || '') : '';
  document.getElementById('olayOySonucu').value = olay ? (olay.oySonucu || '') : '';
  // Kararlardaki gibi: yeni olayda oylama dökümü katılımcı sayısına göre
  // "hepsi kabul etmiş" varsayımıyla otomatik doldurulur, gerekirse değiştirilir.
  const katilimciSayisiOlay = olay ? null : toplantiImzalariniGetir(_toplantiId).filter(i => i.katildiMi).length;
  document.getElementById('olayOyKabul').value = olay ? (olay.oyKabul != null ? olay.oyKabul : '') : katilimciSayisiOlay;
  document.getElementById('olayOyRet').value = olay ? (olay.oyRet != null ? olay.oyRet : '') : 0;
  document.getElementById('olayOyCekimser').value = olay ? (olay.oyCekimser != null ? olay.oyCekimser : '') : 0;

  _olayFotograflari = olay && Array.isArray(olay.fotograflar) ? olay.fotograflar.slice(0, 3) : [];
  _olayFotoOnizlemeCiz();

  document.getElementById('olayModalKatman').classList.add('acik');
}
function olayModalKapat() {
  document.getElementById('olayModalKatman').classList.remove('acik');
  _duzenlenenOlayId = null;
}
function olayFormGonderildi(e) {
  e.preventDefault();
  document.querySelectorAll('#olayForm .alan-hatasi').forEach(el => el.textContent = '');

  const veriler = {
    tur: document.getElementById('olayTur').value,
    tarih: document.getElementById('olayTarih').value,
    yer: document.getElementById('olayYer').value,
    birim: document.getElementById('olayBirim').value,
    olusSekli: document.getElementById('olayOlusSekli').value,
    kokNeden: document.getElementById('olayKokNeden').value,
    isGunuKaybi: document.getElementById('olayIsGunuKaybi').value,
    kararMetni: document.getElementById('olayKararMetni').value,
    sorumlu: document.getElementById('olaySorumlu').value,
    termin: document.getElementById('olayTermin').value,
    oncelik: document.getElementById('olayOncelik').value,
    durum: document.getElementById('olayDurum').value,
    oy: document.getElementById('olayOy').value,
    oySonucu: document.getElementById('olayOySonucu').value,
    oyKabul: document.getElementById('olayOyKabul').value,
    oyRet: document.getElementById('olayOyRet').value,
    oyCekimser: document.getElementById('olayOyCekimser').value,
    fotograflar: _olayFotograflari
  };
  const sonuc = _duzenlenenOlayId ? kurulOlayiGuncelle(_duzenlenenOlayId, veriler) : kurulOlayiEkle(_toplantiId, veriler);
  if (!sonuc.basarili) {
    Object.keys(sonuc.hatalar).forEach(alan => {
      const el = document.getElementById(alan + 'Hata');
      if (el) el.textContent = sonuc.hatalar[alan];
    });
    return;
  }
  olayModalKapat();
  olaylariCiz();
}

// ==================== İMZA LİSTESİ ====================

function imzalariCiz() {
  const govde = document.getElementById('imzaTabloGovde');
  const bosDurum = document.getElementById('imzaBosDurum');
  const imzalar = toplantiImzalariniGetir(_toplantiId);

  govde.innerHTML = '';
  if (imzalar.length === 0) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = 'Bu toplantı için katılımcı eklenmedi.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  imzalar.forEach(i => {
    const satir = document.createElement('tr');
    satir.innerHTML = `
      <td>${i.siraNo}</td><td>${i.adSoyad}</td><td>${i.unvan || '-'}</td><td>${i.birim || '-'}</td><td>${i.kuruldakiGorev || '-'}</td>
      <td><button type="button" class="tablo-buton" data-katildi-toggle="${i.id}" title="Tıklayarak katılım durumunu değiştir" style="font-size:16px; font-weight:700; color:${i.katildiMi ? '#16a34a' : '#dc2626'};">${i.katildiMi ? '✓' : '✗'}</button></td>
      <td>
        <button class="tablo-buton" data-duzenle="${i.id}">Düzenle</button>
        <button class="tablo-buton" data-atama="${i.id}" title="Bu kişi için atama yazısı oluştur">Atama</button>
        <button class="tablo-buton sil" data-sil="${i.id}">Sil</button>
      </td>
    `;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-katildi-toggle]').forEach(btn => btn.addEventListener('click', () => {
    _imzaKatildiToggle(btn.getAttribute('data-katildi-toggle'));
  }));
  govde.querySelectorAll('[data-duzenle]').forEach(btn => btn.addEventListener('click', () => {
    const imza = toplantiImzalariniGetir(_toplantiId).find(x => x.id === btn.getAttribute('data-duzenle'));
    if (imza) imzaModalAc(imza);
  }));
  govde.querySelectorAll('[data-atama]').forEach(btn => btn.addEventListener('click', async () => {
    try { await atamaYazisiWordOlustur(btn.getAttribute('data-atama')); } catch (hata) { console.error(hata); alert('Atama yazısı üretilemedi: ' + (hata.message || hata)); }
  }));
  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', () => {
    if (confirm('Bu katılımcıyı silmek istediğinize emin misiniz?')) { imzaSatiriSil(btn.getAttribute('data-sil')); imzalariCiz(); }
  }));
}

// Katıldı/Katılmadı durumunu modal açmadan tek tıkla değiştirir — kullanıcı
// isteği: "hepsi tikli gelsin, gelmeyenlere çarpı atarım" (varsayılan katildiMi
// zaten true, bkz. model.js imzaSatiriOlustur). Yalnızca uygulamada görünür,
// raporlara ayrıca yansımaz (raporlar zaten katılan/katılmayan listesini ayrı gösterir).
function _imzaKatildiToggle(id) {
  const imza = toplantiImzalariniGetir(_toplantiId).find(i => i.id === id);
  if (!imza) return;
  imzaSatiriGuncelle(id, Object.assign({}, imza, { katildiMi: !imza.katildiMi }));
  imzalariCiz();
}

let _duzenlenenImzaId = null;

// "İşveren Vekili" rolü, aynı sahada birden fazla sicil/tüzel işveren
// olabileceğinden (bkz. core/tenant.js firma.isverenler) tek bir seçenek
// değil, her işveren için AYRI AYRI bir seçenek olarak sunulur (kullanıcı
// isteği) — ör. "İşveren Vekili — Bağfaş Teknik Müteahhitlik". Firma hiç
// İşveren tanımlamadıysa (bkz. firma-yonetim.html) genel "İşveren Vekili"
// seçeneği olduğu gibi kalır.
function _kuruldakiGorevSecenekleriUret() {
  const firma = typeof aktifFirmaGetir === 'function' ? aktifFirmaGetir() : null;
  const isverenler = firma && Array.isArray(firma.isverenler) ? firma.isverenler : [];
  return KURUL_GOREVLERI.flatMap(g => {
    if (g === 'İşveren Vekili' && isverenler.length) {
      return isverenler.map(i => `İşveren Vekili — ${i}`);
    }
    return [g];
  });
}

function imzaModalAc(imza) {
  _duzenlenenImzaId = imza ? imza.id : null;
  document.getElementById('imzaModalBaslik').textContent = imza ? 'Katılımcıyı Düzenle' : 'Katılımcı Ekle';
  document.getElementById('imzaForm').reset();
  document.querySelectorAll('#imzaForm .alan-hatasi').forEach(el => el.textContent = '');
  document.getElementById('imzaAdSoyad').value = imza ? imza.adSoyad : '';
  document.getElementById('imzaUnvan').value = imza ? imza.unvan : '';
  document.getElementById('imzaBirim').value = imza ? imza.birim : '';
  document.getElementById('imzaKuruldakiGorev').innerHTML = '<option value="">— Seçiniz —</option>' +
    _kuruldakiGorevSecenekleriUret().map(g => `<option ${imza && imza.kuruldakiGorev === g ? 'selected' : ''}>${g}</option>`).join('');
  document.getElementById('imzaKatildiMi').checked = imza ? !!imza.katildiMi : true;
  document.getElementById('imzaModalKatman').classList.add('acik');
}
function imzaModalKapat() {
  document.getElementById('imzaModalKatman').classList.remove('acik');
  _duzenlenenImzaId = null;
}
function imzaFormGonderildi(e) {
  e.preventDefault();
  document.querySelectorAll('#imzaForm .alan-hatasi').forEach(el => el.textContent = '');

  const veriler = {
    adSoyad: document.getElementById('imzaAdSoyad').value,
    unvan: document.getElementById('imzaUnvan').value,
    birim: document.getElementById('imzaBirim').value,
    kuruldakiGorev: document.getElementById('imzaKuruldakiGorev').value,
    katildiMi: document.getElementById('imzaKatildiMi').checked
  };
  const sonuc = _duzenlenenImzaId
    ? imzaSatiriGuncelle(_duzenlenenImzaId, veriler)
    : imzaSatiriEkle(_toplantiId, veriler);
  if (!sonuc.basarili) {
    Object.keys(sonuc.hatalar || {}).forEach(alan => {
      const el = document.getElementById(alan + 'Hata');
      if (el) el.textContent = sonuc.hatalar[alan];
    });
    return;
  }
  imzaModalKapat();
  imzalariCiz();
}

function kararKapanisAlanlariniGuncelle() {
  const kapali = document.getElementById('kararDurum').value === 'Kapalı';
  document.getElementById('kapanisSatiri').style.display = kapali ? '' : 'none';
}

function kararModalAc(karar) {
  _duzenlenenKararId = karar ? karar.id : null;
  document.getElementById('kararModalBaslik').textContent = karar ? 'Kararı Düzenle' : 'Yeni Karar';
  document.getElementById('kararNo').value = karar ? karar.kararNo : '';
  document.getElementById('kararMetni').value = karar ? karar.kararMetni : '';
  document.getElementById('kararKaynakGundem').value = karar ? karar.kaynakGundem : '';
  document.getElementById('kararSorumlu').value = karar ? karar.sorumlu : '';
  bolumButonlariCiz('kararSorumluBolumButonlari', 'kararSorumlu', 'tekli');
  document.getElementById('kararTermin').value = karar ? karar.termin : '';
  document.getElementById('kararOncelik').innerHTML = ['Düşük', 'Normal', 'Yüksek', 'Kritik'].map(o => `<option ${karar && karar.oncelik === o ? 'selected' : ''}>${o}</option>`).join('');
  document.getElementById('kararDurum').innerHTML = KARAR_DURUMLARI.map(d => `<option ${karar && karar.durum === d ? 'selected' : ''}>${d}</option>`).join('');
  document.getElementById('kararKapanisTarihi').value = karar ? karar.kapanisTarihi : '';
  document.getElementById('kararKanit').value = karar ? karar.kanit : '';
  document.getElementById('kararAksiyonNotu').value = karar ? (karar.aksiyonNotu || '') : '';
  document.getElementById('kararOy').value = karar ? (karar.oy || '') : '';
  document.getElementById('kararOySonucu').value = karar ? (karar.oySonucu || '') : '';
  // Yeni kararda oylama dökümü, katılımcı sayısına göre "hepsi kabul etmiş"
  // varsayımıyla otomatik doldurulur (kullanıcı isteği) — gerekirse elle
  // düzeltilir; düzenlemede mevcut değerler korunur.
  const katilimciSayisi = karar ? null : toplantiImzalariniGetir(_toplantiId).filter(i => i.katildiMi).length;
  document.getElementById('kararOyKabul').value = karar ? (karar.oyKabul != null ? karar.oyKabul : '') : katilimciSayisi;
  document.getElementById('kararOyRet').value = karar ? (karar.oyRet != null ? karar.oyRet : '') : 0;
  document.getElementById('kararOyCekimser').value = karar ? (karar.oyCekimser != null ? karar.oyCekimser : '') : 0;
  document.getElementById('kararDevrederMi').checked = karar ? karar.devrederMi !== false : true;
  if (!karar) document.getElementById('kararOncelik').value = 'Normal';
  _kararFotoOncesi = karar ? (karar.fotoOncesi || '') : '';
  _kararFotoSonrasi = karar ? (karar.fotoSonrasi || '') : '';
  _kararFotoEk = karar && Array.isArray(karar.fotografEk) ? karar.fotografEk.slice(0, 3) : [];
  _kararTekFotoOnizlemeCiz('kararFotoOncesiOnizleme', _kararFotoOncesi, () => { _kararFotoOncesi = ''; _kararTekFotoOnizlemeCiz('kararFotoOncesiOnizleme', '', null); });
  _kararTekFotoOnizlemeCiz('kararFotoSonrasiOnizleme', _kararFotoSonrasi, () => { _kararFotoSonrasi = ''; _kararTekFotoOnizlemeCiz('kararFotoSonrasiOnizleme', '', null); });
  _kararFotoEkOnizlemeCiz();
  kararKapanisAlanlariniGuncelle();
  temizleKararFormHatalari();
  document.getElementById('kararModalKatman').classList.add('acik');
}

function kararModalKapat() {
  document.getElementById('kararModalKatman').classList.remove('acik');
  _duzenlenenKararId = null;
}

function temizleKararFormHatalari() {
  document.querySelectorAll('#kararForm .alan-hatasi').forEach(el => el.textContent = '');
}

function kararFormGonderildi(e) {
  e.preventDefault();
  temizleKararFormHatalari();

  const veriler = {
    kararNo: document.getElementById('kararNo').value,
    kararMetni: document.getElementById('kararMetni').value,
    kaynakGundem: document.getElementById('kararKaynakGundem').value,
    sorumlu: document.getElementById('kararSorumlu').value,
    termin: document.getElementById('kararTermin').value,
    oncelik: document.getElementById('kararOncelik').value,
    durum: document.getElementById('kararDurum').value,
    kapanisTarihi: document.getElementById('kararKapanisTarihi').value,
    kanit: document.getElementById('kararKanit').value,
    aksiyonNotu: document.getElementById('kararAksiyonNotu').value,
    oy: document.getElementById('kararOy').value,
    oySonucu: document.getElementById('kararOySonucu').value,
    oyKabul: document.getElementById('kararOyKabul').value,
    oyRet: document.getElementById('kararOyRet').value,
    oyCekimser: document.getElementById('kararOyCekimser').value,
    devrederMi: document.getElementById('kararDevrederMi').checked,
    fotoOncesi: _kararFotoOncesi,
    fotoSonrasi: _kararFotoSonrasi,
    fotografEk: _kararFotoEk
  };

  const sonuc = _duzenlenenKararId
    ? kararGuncelle(_duzenlenenKararId, veriler)
    : kararEkle(_toplantiId, veriler);

  if (!sonuc.basarili) {
    Object.keys(sonuc.hatalar).forEach(alan => {
      const hataEl = document.getElementById(alan + 'Hata');
      if (hataEl) hataEl.textContent = sonuc.hatalar[alan];
    });
    return;
  }

  kararModalKapat();
  kararlariCiz();
}

// ==================== AY İÇİNDE TESPİT EDİLEN UYGUNSUZLUKLAR (salt okunur) ====================

function _uygunsuzlukFotoHucresiUret(k) {
  const img = (url, baslik) => url ? `<img data-foto-ref="${url}" title="${baslik}" style="width:26px; height:26px; object-fit:cover; border-radius:6px; margin-right:2px;">` : '';
  const parcalar = [img(k.fotoOncesi, 'Öncesi'), img(k.fotoSonrasi, 'Sonrası')].filter(Boolean);
  return parcalar.join('') || '-';
}

function tespitEdilenUygunsuzluklariCiz(toplanti) {
  const govde = document.getElementById('tespitEdilenUygunsuzlukTabloGovde');
  const bosDurum = document.getElementById('tespitEdilenUygunsuzlukBosDurum');
  const kayitlar = toplantiTespitEdilenUygunsuzluklariGetir(toplanti);

  govde.innerHTML = '';
  if (kayitlar.length === 0) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = 'Bu dönemde tespit edilen uygunsuzluk bulunmamaktadır.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  kayitlar.forEach(k => {
    const satir = document.createElement('tr');
    satir.innerHTML = `
      <td>${k.konuBasligi}</td><td>${gunAyYil(k.tespitTarihi) || '-'}</td>
      <td>${k.bolum || '-'}</td><td>${k.uygunsuzluk || '-'}</td><td>${k.sorumlu || '-'}</td><td>${k.durum || '-'}</td>
      <td>${_uygunsuzlukFotoHucresiUret(k)}</td>
    `;
    govde.appendChild(satir);
  });
  fotoReferanslariCoz(govde);
}

// ==================== AY İÇİNDE KAPATILAN UYGUNSUZLUKLAR (salt okunur) ====================

function kapananUygunsuzluklariCiz(toplanti) {
  const govde = document.getElementById('kapananUygunsuzlukTabloGovde');
  const bosDurum = document.getElementById('kapananUygunsuzlukBosDurum');
  const kayitlar = toplantiKapananUygunsuzluklariGetir(toplanti);

  govde.innerHTML = '';
  if (kayitlar.length === 0) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = 'Bu dönemde kapatılan uygunsuzluk bulunmamaktadır.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  kayitlar.forEach(k => {
    const satir = document.createElement('tr');
    satir.innerHTML = `
      <td>${k.konuBasligi}</td><td>${gunAyYil(k.tespitTarihi) || '-'}</td><td>${gunAyYil(k.kapanisTarihi) || '-'}</td>
      <td>${k.bolum || '-'}</td><td>${k.uygunsuzluk || '-'}</td><td>${k.alinanOnlem || '-'}</td><td>${k.sorumlu || '-'}</td>
      <td>${_uygunsuzlukFotoHucresiUret(k)}</td>
    `;
    govde.appendChild(satir);
  });
  fotoReferanslariCoz(govde);
}

// ==================== AY İÇİNDE YAPILAN EĞİTİMLER (salt okunur) ====================

function aylikEgitimleriCiz(toplanti) {
  const govde = document.getElementById('aylikEgitimTabloGovde');
  const bosDurum = document.getElementById('aylikEgitimBosDurum');
  const kayitlar = toplantiAylikEgitimleriGetir(toplanti);

  govde.innerHTML = '';
  if (kayitlar.length === 0) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = 'Bu dönemde verilen eğitim bulunmamaktadır.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  kayitlar.forEach(k => {
    const tarihGoruntu = k.egitimTarihi2 ? `${gunAyYil(k.egitimTarihi)} - ${gunAyYil(k.egitimTarihi2)}` : gunAyYil(k.egitimTarihi);
    const satir = document.createElement('tr');
    satir.innerHTML = `<td>${k.siraNo}</td><td>${k.egitimAdi}</td><td>${tarihGoruntu || '-'}</td><td>${k.katilimciSayisi}</td><td>${k.birim || '-'}</td>`;
    govde.appendChild(satir);
  });
}

// ==================== AY İÇİ İSG ÇALIŞMALARI ====================

function ayIciFaaliyetleriCiz() {
  const govde = document.getElementById('ayIciFaaliyetTabloGovde');
  const bosDurum = document.getElementById('ayIciFaaliyetBosDurum');
  const faaliyetler = toplantiAyIciFaaliyetleriniGetir(_toplantiId);

  govde.innerHTML = '';
  if (faaliyetler.length === 0) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = 'Bu toplantı için henüz ay içi faaliyet eklenmedi.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  faaliyetler.forEach(f => {
    const satir = document.createElement('tr');
    satir.innerHTML = `
      <td>${f.faaliyet}</td><td>${f.adet || '-'}</td><td>${f.aciklama || '-'}</td>
      <td><button class="tablo-buton sil" data-sil="${f.id}">Sil</button></td>
    `;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', () => {
    if (confirm('Bu faaliyeti silmek istediğinize emin misiniz?')) { ayIciFaaliyetSil(btn.getAttribute('data-sil')); ayIciFaaliyetleriCiz(); }
  }));
}

function ayIciFaaliyetModalAc() {
  document.getElementById('ayIciFaaliyetForm').reset();
  document.querySelectorAll('#ayIciFaaliyetForm .alan-hatasi').forEach(el => el.textContent = '');
  document.getElementById('ayIciFaaliyetModalKatman').classList.add('acik');
}

function ayIciFaaliyetModalKapat() {
  document.getElementById('ayIciFaaliyetModalKatman').classList.remove('acik');
}

function ayIciFaaliyetFormGonderildi(e) {
  e.preventDefault();
  document.querySelectorAll('#ayIciFaaliyetForm .alan-hatasi').forEach(el => el.textContent = '');

  const veriler = {
    faaliyet: document.getElementById('ayIciFaaliyetAdi').value,
    adet: document.getElementById('ayIciFaaliyetAdet').value,
    aciklama: document.getElementById('ayIciFaaliyetAciklama').value
  };
  const sonuc = ayIciFaaliyetEkle(_toplantiId, veriler);
  if (!sonuc.basarili) {
    Object.keys(sonuc.hatalar || {}).forEach(alan => {
      const el = document.getElementById(alan + 'Hata');
      if (el) el.textContent = sonuc.hatalar[alan];
    });
    return;
  }
  ayIciFaaliyetModalKapat();
  ayIciFaaliyetleriCiz();
}

function tutanagiGoster() {
  const toplanti = toplantiIdIleGetirRepo(_toplantiId);
  const kararlar = toplantiKararlariniGetir(_toplantiId);
  const metin = tutanakMetniUret(toplanti, kararlar, toplantiBaskanSekreterGetir(_toplantiId));

  const mount = document.getElementById('yazdirmaAlani');
  mount.innerHTML = `<pre style="white-space:pre-wrap; font-family:inherit; font-size:13px;">${metin.replace(/</g, '&lt;')}</pre>`;
  mount.style.display = 'block';
  setTimeout(() => {
    window.print();
    setTimeout(() => { mount.innerHTML = ''; mount.style.display = 'none'; }, 400);
  }, 80);
}
