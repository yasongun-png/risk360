// Toplantı detay ekranının DOM işlemleri (gündem + kararlar + tutanak).

function _ktKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

let _toplantiId = null;
let _duzenlenenKararId = null;
// Karar penceresi bir olaydan ("→ Karar" butonu) açıldıysa o olayın anahtarı — kaydedilen karara kaynakOlayId olarak yazılır.
let _kararKaynakOlayId = '';
let _duzenlenenOlayId = null;
let _duzenlenenAyIciFaaliyetId = null;
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
  _ktBelgeAlaniniKur(toplanti);
  gundemListesiniCiz(toplanti);
  kararlariCiz();
  document.getElementById('yonetmelikMaddeleriKutusu').innerHTML = _yonetmelikMaddeleriGoruntuUret();

  // Kullanıcı isteği: Word/PPTX çıktılarında "Çalışan Temsilcilerinin Görüş ve
  // Önerileri" başlığı var ama uygulamada giriş yöntemi yoktu (alan sadece
  // "Toplantıyı Düzenle" penceresinin en altındaydı) — toplantı sayfasında
  // kendi bölümüyle girilir.
  calisanGorusleriniCiz();
  document.getElementById('calisanGorusEkleBtn').addEventListener('click', () => calisanGorusModalAc(-1));
  document.getElementById('calisanGorusKapatBtn').addEventListener('click', calisanGorusModalKapat);
  document.getElementById('calisanGorusIptalBtn').addEventListener('click', calisanGorusModalKapat);
  document.getElementById('calisanGorusForm').addEventListener('submit', calisanGorusFormGonderildi);

  // Uygunsuzlukların değerlendirmesi (otomatik hesap) — bkz. service.js
  // toplantiUygunsuzlukIstatistikleriHesapla.
  (function () {
    const ist = toplantiUygunsuzlukIstatistikleriHesapla(toplanti);
    const kutu = document.getElementById('uygunsuzlukDegerlendirmeKutusu');
    if (!ist) { kutu.innerHTML = '<div class="bos-durum gorunur">Toplantı tarihi/dönemi olmadığından hesaplanamadı.</div>'; return; }
    const oran = ist.tamamlamaOrani == null ? '-' : '%' + ist.tamamlamaOrani.toFixed(1).replace('.', ',');
    const kart = (etiket, deger) => `<div class="istatistik-kutu"><span>${etiket}</span><b style="font-size:20px;">${deger}</b></div>`;
    kutu.innerHTML = `<div class="istatistik-grid" style="grid-template-columns: repeat(4, minmax(140px,1fr));">
      ${kart(ist.yil + ' Yılında Açılan', ist.acilan)}${kart('Kapatılan Uygunsuzluklar', ist.kapatilan)}${kart('Hâlen Açık', ist.acik)}${kart('Tamamlama Oranı', oran)}
    </div>`;
  })();

  document.getElementById('yeniKararBtn').addEventListener('click', () => kararModalAc());
  document.getElementById('kurulNotlarBtn').addEventListener('click', kurulNotModalAc);
  document.getElementById('kurulNotKapatBtn').addEventListener('click', kurulNotModalKapat);
  document.getElementById('kurulNotIptalBtn').addEventListener('click', kurulNotModalKapat);
  document.getElementById('kurulNotKaydetBtn').addEventListener('click', _kurulNotKaydetTiklandi);
  document.getElementById('kurulNotKapalilariGoster').addEventListener('change', () => { _kurulNotTaslagiTopla(); _kurulNotSatirlariniCiz(); });
  const _ciktiButonu = (id, metin, fn) => document.getElementById(id).addEventListener('click', async () => {
    const btn = document.getElementById(id); const eski = btn.textContent;
    btn.disabled = true; btn.textContent = metin;
    try { await fn(_toplantiId); } catch (hata) { console.error(hata); alert('Çıktı üretilemedi: ' + (hata.message || hata)); }
    finally { btn.disabled = false; btn.textContent = eski; }
  });
  _ciktiButonu('aksiyonPlaniWordBtn', 'Hazırlanıyor...', kurulAksiyonPlaniWordOlustur);
  _ciktiButonu('aksiyonPlaniExcelBtn', 'Hazırlanıyor...', kurulAksiyonPlaniExcelOlustur);
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

  document.getElementById('imzaEpostaYapistirBtn').addEventListener('click', () => {
    document.getElementById('epostaYapistirMetni').value = '';
    document.getElementById('epostaYapistirSonuc').textContent = '';
    document.getElementById('epostaYapistirKatmani').classList.add('acik');
  });
  document.getElementById('epostaYapistirKapatBtn').addEventListener('click', () => {
    document.getElementById('epostaYapistirKatmani').classList.remove('acik');
  });
  document.getElementById('epostaYapistirUygulaBtn').addEventListener('click', () => {
    const sonuc = imzaEpostalariniYapistirdanEsle(_toplantiId, document.getElementById('epostaYapistirMetni').value);
    const kutu = document.getElementById('epostaYapistirSonuc');
    kutu.style.color = sonuc.eslesen ? '#15803d' : 'var(--hata)';
    kutu.textContent = !sonuc.toplam
      ? 'Yapıştırılan metinde e-posta adresi bulunamadı.'
      : `${sonuc.eslesen}/${sonuc.toplam} kişi eşleşti ve e-postası kaydedildi.` +
        (sonuc.eslesmeyen.length ? ` Eşleşmeyen (İmza Listesi'nde bu adla kimse yok): ${sonuc.eslesmeyen.join(', ')}` : '');
    imzalariCiz();
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
  { anahtar: 'eposta', baslik: 'E-posta' },
  { anahtar: 'katildiMi', baslik: 'Katıldı' }
];

const IMZA_EXPORT_KOLONLARI = [
  { anahtar: 'siraNo', baslik: 'Sıra' },
  { anahtar: 'adSoyad', baslik: 'Ad Soyad' },
  { anahtar: 'unvan', baslik: 'Ünvan' },
  { anahtar: 'birim', baslik: 'Birim' },
  { anahtar: 'kuruldakiGorev', baslik: 'Kuruldaki Görevi' },
  { anahtar: 'eposta', baslik: 'E-posta' },
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
      <div class="istatistik-kutu"><span>Yer</span><b style="font-size:15px;">${_ktKacir(toplanti.yer) || '-'}</b></div>
      <div class="istatistik-kutu"><span>Başkan / Kurul Sekreteri</span><b style="font-size:15px;">${_ktKacir(bs.baskan) || '-'} / ${_ktKacir(bs.yazman) || '-'}</b></div>
      <div class="istatistik-kutu"><span>Durum</span><b style="font-size:15px;">${_ktKacir(toplanti.durum)}</b></div>
    </div>
    <p style="font-size:13px;"><strong>Katılımcılar:</strong> ${_ktKacir(toplanti.katilimcilar.join(', ')) || '-'}</p>
    ${toplanti.notlar ? `<p style="font-size:13px;"><strong>Notlar:</strong> ${_ktKacir(toplanti.notlar)}</p>` : ''}
  `;
}

// Kullanıcı isteği: "üretilen ör. kurul tutanağı imzalı pdf halini
// yükleyebileyim" (bkz. core/belge-yukle.js).
// Genel belge alanı (PDF/fotoğraf): onek -> "<onek>Onizleme", alan -> toplantı kaydındaki alan adı.
function _ktBelgeOnizlemeCiz(onek, alan) {
  const toplanti = toplantiIdIleGetirRepo(_toplantiId);
  const referans = toplanti && toplanti[alan];
  document.getElementById(onek + 'Onizleme').innerHTML = belgeOnizlemeHtml(onek, !!referans);
  if (referans) {
    document.getElementById(onek + 'AcLink').addEventListener('click', e => { e.preventDefault(); belgeDosyasiniAc(String(referans).split('|')[0]); });
    document.getElementById(onek + 'KaldirBtn').addEventListener('click', () => {
      toplantiGuncelle(_toplantiId, Object.assign({}, toplanti, { [alan]: '' }));
      _ktBelgeOnizlemeCiz(onek, alan);
    });
  }
}

// Taranmış davet/imza listesi: PDF ise her sayfa pdf.js ile JPEG'e çevrilip (Firestore alan sınırına sığacak
// şekilde sıkıştırılarak) ayrı kaydedilir; alanın değeri "fotoref:a|fotoref:b" biçiminde sayfa listesidir.
async function _ktTaramaDosyasiIsle(dosya, firmaSlug) {
  if (dosya.type !== 'application/pdf') return belgeDosyasiIsle(dosya, firmaSlug);
  if (typeof pdfjsLib === 'undefined') throw new Error('PDF işleyici yüklenemedi (internet bağlantısını kontrol edin).');
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await dosya.arrayBuffer()) }).promise;
  if (pdf.numPages > 6) throw new Error('PDF en fazla 6 sayfa olabilir.');
  const SINIR = 900000;
  const referanslar = [];
  for (let no = 1; no <= pdf.numPages; no++) {
    const sayfa = await pdf.getPage(no);
    let olcek = 1.6, kalite = 0.75, dataUrl = '';
    for (let deneme = 0; deneme < 5; deneme++) {
      const gorunum = sayfa.getViewport({ scale: olcek });
      const tuval = document.createElement('canvas');
      tuval.width = Math.round(gorunum.width); tuval.height = Math.round(gorunum.height);
      const c = tuval.getContext('2d');
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, tuval.width, tuval.height);
      await sayfa.render({ canvasContext: c, viewport: gorunum }).promise;
      dataUrl = tuval.toDataURL('image/jpeg', kalite);
      if (dataUrl.length < SINIR) break;
      olcek *= 0.8; kalite = Math.max(0.5, kalite - 0.08);
    }
    if (dataUrl.length >= SINIR) throw new Error(no + '. sayfa çok büyük; daha düşük çözünürlükte tarayın.');
    referanslar.push(await fotoBuyukKaydet(dataUrl, firmaSlug || ''));
  }
  return referanslar.join('|');
}

function _ktBelgeKur(onek, alanId, baslik, alan, taramaMi) {
  document.getElementById(alanId).innerHTML = belgeYukleyiciHtml(onek, baslik);
  belgeYukleyiciBagla(onek, async dosya => {
    try {
      const firma = aktifFirmaGetir();
      const referans = taramaMi ? await _ktTaramaDosyasiIsle(dosya, firma ? firma.slug : '') : await belgeDosyasiIsle(dosya, firma ? firma.slug : '');
      const mevcut = toplantiIdIleGetirRepo(_toplantiId);
      toplantiGuncelle(_toplantiId, Object.assign({}, mevcut, { [alan]: referans }));
      _ktBelgeOnizlemeCiz(onek, alan);
    } catch (hata) {
      alert(hata.message || 'Belge yüklenemedi.');
    }
  });
  _ktBelgeOnizlemeCiz(onek, alan);
}

function _ktBelgeAlaniniKur() {
  _ktBelgeKur('ktBelge', 'ktBelgeAlani', 'İmzalı Kurul Tutanağı', 'imzaliBelgeUrl');
  _ktBelgeKur('ktDavet', 'ktDavetAlani', 'İmzalı Toplantı Daveti (taranmış)', 'imzaliDavetUrl', true);
  _ktBelgeKur('ktImza', 'ktImzaAlani', 'İmzalı İmza Listesi (taranmış)', 'imzaliImzaListesiUrl', true);
}

function gundemListesiniCiz(toplanti) {
  const kutu = document.getElementById('gundemGoruntuKutusu');
  // "Olaylar" gündem maddesinin altında, o toplantının (otomatik + elle
  // eklenen, toplantı tarihine kadar olan) olaylarının kısa dökümü canlı
  // olarak gösterilir — kullanıcı isteği: "toplantı tarihine kadar olan
  // olayları da gündeme ekleyelim".
  const olaylarMetni = toplantiOlaylarGundemMetni(toplanti.id);
  kutu.innerHTML = kurulGundemSirala(toplanti.gundem).length
    ? `<ol style="padding-left:20px; font-size:13px;">${kurulGundemSirala(toplanti.gundem).map(g => {
        const otoNot = /^olaylar/i.test(g.baslik.trim()) && olaylarMetni
          ? `<div style="margin-top:2px; color:var(--metin-soluk); font-size:12px;">${_ktKacir(olaylarMetni)}</div>`
          : '';
        return `<li style="margin-bottom:6px;">${_ktKacir(g.baslik)}${g.not ? ' — ' + _ktKacir(g.not) : ''}${otoNot}</li>`;
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
    const tamamlandiRozeti = '';
    // Kullanıcı isteği: "İSG kuruluna diğer modüllerden gelen bilgileri
    // silebileyim veya yeniden düzenleyebileyim" — Olay/Kaza modülünden bir
    // olayın (örn. ramak kala) termin/sorumlu girilerek "karar-benzeri" hale
    // getirilmesiyle oluşan satırlar (bkz. service.js
    // _olayKaynakliDevredenKararlariGetir, id = 'olay-' + olayId) gerçek bir
    // kurul_kararlari kaydı DEĞİLDİR; kararSil/kararModalAc bu id ile hiçbir
    // kayıt bulamadığından Düzenle/Sil hiçbir şey yapmıyordu. Bu satırlarda
    // Düzenle/Sil, altındaki gerçek OLAY kaydına yönlendirilir; Taşı ise
    // (karar başka toplantıya taşınamayacağından, olayın kendi toplantısına
    // bağlı olduğundan) bu satırlarda gösterilmez.
    const olayId = k.olayKaynakli ? k.id.replace(/^olay-/, '') : null;
    // Kullanıcı isteği: Düzenle/Taşı/Sil düğmeleri tablonun solunda (ilk sütun).
    satir.innerHTML = `
      <td style="white-space:nowrap;">
        ${olayId
          ? `<button class="tablo-buton" data-duzenle-olay="${olayId}">Düzenle</button><button class="tablo-buton sil" data-sil-olay="${olayId}">Sil</button>`
          : `<button class="tablo-buton" data-duzenle="${k.id}">Düzenle</button><button class="tablo-buton" data-tasi="${k.id}">Taşı</button>${riskeAktarButonHtml('kurul', k.id)}<button class="tablo-buton sil" data-sil="${k.id}">Sil</button>`}
      </td>
      <td>${k.kararNo}</td>
      <td>${_ktKacir(k.kaynakGundem) || '-'}</td>
      <td>${_ktKacir(k.kararMetni)}</td>
      <td style="font-size:12.5px;">${_kurulNotHucresi(k)}</td>
      <td>${_ktKacir(k.sorumlu)}</td>
      <td>${gunAyYil(k.termin) || '-'}</td>
      <td>${_ktKacir(k.oncelik)}</td>
      <td>${_ktKacir(k.durumGoruntu)}${tamamlandiRozeti}</td>
      <td>${_kararFotoHucresiUret(k)}</td>
    `;
    govde.appendChild(satir);
  });
  fotoReferanslariCoz(govde);

  govde.querySelectorAll('[data-duzenle]').forEach(btn => {
    btn.addEventListener('click', () => kararModalAc(kararIdIleGetirRepo(btn.getAttribute('data-duzenle'))));
  });

  govde.querySelectorAll('[data-duzenle-olay]').forEach(btn => {
    btn.addEventListener('click', () => olayModalAc(olayTumunuGetir().find(o => o.id === btn.getAttribute('data-duzenle-olay'))));
  });

  // Risk Değerlendirmesi'ne aktarma (core/risk-aktar.js). Kararda yer bilgisi
  // olmadığından toplantının bölüm/tesis/yer bilgisi kullanılır.
  govde.querySelectorAll('[data-riske-aktar]').forEach(btn => {
    btn.addEventListener('click', () => {
      const k = kararIdIleGetirRepo(btn.getAttribute('data-riske-aktar'));
      if (!k) return;
      const t = toplantiTumunuGetir().find(x => x.id === k.toplantiId) || {};
      riskeAktarModaliAc({
        modul: 'kurul', modulAdi: 'İSG Kurulu', id: k.id, etiket: [t.toplantiNo, k.kararNo].filter(Boolean).join(' / '),
        alanlar: {
          yer: t.bolum || t.tesis || t.yer || '', faaliyet: t.bolum || t.tesis || '',
          tehlike: k.kaynakGundem || k.kararMetni,
          planlanan: k.kararMetni, sorumlu: k.sorumlu, termin: k.termin, fotoOncesi: k.fotoOncesi
        },
        sonra: () => kararlariCiz()
      });
    });
  });

  govde.querySelectorAll('[data-sil]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (await onayModali('Bu kararı silmek istediğinize emin misiniz?', 'Sil')) {
        kararSil(btn.getAttribute('data-sil'));
        kararlariCiz();
      }
    });
  });

  govde.querySelectorAll('[data-sil-olay]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (await onayModali('Bu, ilgili olayı (Olaylar listesindeki asıl kaydı) tamamen silecektir. Devam edilsin mi?', 'Sil')) {
        kurulOlayiSil(btn.getAttribute('data-sil-olay'));
        olaylariCiz();
        kararlariCiz();
      }
    });
  });

  govde.querySelectorAll('[data-tasi]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const digerToplantilar = toplantiTumunuGetir().filter(t => t.id !== _toplantiId);
      if (!digerToplantilar.length) { alert('Taşınacak başka bir toplantı yok.'); return; }
      const secenekler = digerToplantilar.map((t, i) => `${i + 1}. ${t.toplantiNo} - ${t.baslik} (${gunAyYil(t.tarih)})`).join('\n');
      const secim = await metinIstemModali('Bu kararı hangi toplantıya taşımak istiyorsunuz?\n(Devreden/Bu Toplantının Kararı ayrımı, taşındığı toplantıya göre otomatik belirlenir.)\n\n' + secenekler, 'Numara girin', '');
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
// Karar çalışma istatistikleri kutusu (bkz. service.js toplantiKararIstatistikleriHesapla).
function kararIstatistikleriniCiz() {
  const kutu = document.getElementById('kararIstatistikKutusu');
  if (!kutu) return;
  const ist = toplantiKararIstatistikleriHesapla(toplantiIdIleGetirRepo(_toplantiId));
  if (!ist) { kutu.innerHTML = '<div class="bos-durum gorunur">Toplantı tarihi/dönemi olmadığından hesaplanamadı.</div>'; return; }
  const oran = ist.oran == null ? '-' : '%' + ist.oran.toFixed(1).replace('.', ',');
  const kart = (etiket, deger) => `<div class="istatistik-kutu"><span>${etiket}</span><b style="font-size:20px;">${deger}</b></div>`;
  const satirlar = ist.toplantilar.map(t => `<tr><td>${_ktKacir(t.toplantiNo)}</td><td>${t.alinan}</td><td>${t.tamamlanan}</td><td>${t.acik}</td></tr>`).join('');
  kutu.innerHTML = `<div class="istatistik-grid" style="grid-template-columns: repeat(5, minmax(120px,1fr));">
      ${kart(ist.yil + ' Yılında Alınan Karar', ist.alinan)}${kart('Tamamlanan', ist.tamamlanan)}${kart('Açık (Devam Eden)', ist.acik)}${kart('Geciken', ist.geciken)}${kart('Tamamlanma Oranı', oran)}
    </div>
    <div class="tablo-scroll" style="margin-top:10px;"><table class="veri-tablosu"><thead><tr><th>Toplantı</th><th>Alınan Karar</th><th>Tamamlanan</th><th>Açık</th></tr></thead><tbody>${satirlar}</tbody></table></div>`;
}

// ---- Konuşulanlar (toplantı bazlı karar notları) ----

// Tabloda "gg.aa: not" satırları; bu toplantıdan sonraki toplantıların notları gösterilmez.
function _kurulNotHucresi(k) {
  if (k.olayKaynakli) return _ktKacir(k.aksiyonNotu) || '-';
  const notlar = kararToplantiNotlariniGetir(k, _toplantiId);
  if (!notlar.length) return '<span style="color:var(--metin-soluk);">-</span>';
  return notlar.map(n => `<div style="margin-bottom:4px;"><b>${n.eski ? 'Önceki not' : (_kurulNotTarihi(n.tarih) || _ktKacir(n.toplantiNo))}:</b> ${_ktKacir(n.not)}</div>`).join('');
}

let _kurulNotTaslak = {};

function _kurulNotKararlari() {
  const { devreden, yeni } = toplantiKararGruplariniGetir(_toplantiId);
  const kapalilar = document.getElementById('kurulNotKapalilariGoster').checked;
  return yeni.concat(devreden).filter(k => !k.olayKaynakli && k.id && kararIdIleGetirRepo(k.id))
    .filter(k => kapalilar || !kararKapaliMi(k.durum) || (_kurulNotTaslak[k.id] || '').trim());
}

function kurulNotModalAc() {
  const toplanti = toplantiIdIleGetirRepo(_toplantiId);
  document.getElementById('kurulNotBaslik').textContent = 'Bu Toplantıda Konuşulanlar' + (toplanti && toplanti.tarih ? ` — ${gunAyYil(toplanti.tarih)}` : '');
  document.getElementById('kurulNotKapalilariGoster').checked = false;
  _kurulNotTaslak = {};
  kararTumunuGetir().forEach(k => { const n = (k.toplantiNotlari || {})[_toplantiId]; if (n) _kurulNotTaslak[k.id] = n; });
  _kurulNotSatirlariniCiz();
  document.getElementById('kurulNotKatmani').classList.add('acik');
}

function kurulNotModalKapat() {
  document.getElementById('kurulNotKatmani').classList.remove('acik');
}

function _kurulNotTaslagiTopla() {
  document.querySelectorAll('#kurulNotGovde [data-kurul-not]').forEach(el => { _kurulNotTaslak[el.getAttribute('data-kurul-not')] = el.value; });
}

function _kurulNotSatirlariniCiz() {
  const govde = document.getElementById('kurulNotGovde');
  const kararlar = _kurulNotKararlari();
  if (!kararlar.length) { govde.innerHTML = '<tr><td colspan="3">Bu toplantıda gösterilecek karar yok.</td></tr>'; return; }
  govde.innerHTML = kararlar.map(k => {
    const onceki = kararToplantiNotlariniGetir(kararIdIleGetirRepo(k.id), _toplantiId).filter(n => n.toplantiId !== _toplantiId);
    return `
    <tr>
      <td><b>${_ktKacir(k.kararNo)}</b><div style="font-size:11px; color:var(--metin-soluk);">${_ktKacir(kararDurumGoster(k.durum))}</div></td>
      <td style="font-size:12px;">
        ${k.kaynakGundem ? '<b>' + _ktKacir(k.kaynakGundem) + '</b><br>' : ''}${_ktKacir(k.kararMetni)}
        <div style="color:var(--metin-soluk); margin-top:3px;">Sorumlu: ${_ktKacir(k.sorumlu) || '-'} · Termin: ${gunAyYil(k.termin) || '-'}</div>
        ${onceki.length ? `<details style="margin-top:3px;"><summary style="cursor:pointer; color:var(--metin-soluk);">Önceki konuşulanlar (${onceki.length})</summary>${onceki.map(n => `<div><b>${n.eski ? 'Önceki not' : (_kurulNotTarihi(n.tarih) || _ktKacir(n.toplantiNo))}:</b> ${_ktKacir(n.not)}</div>`).join('')}</details>` : ''}
      </td>
      <td><textarea data-kurul-not="${k.id}" rows="3" style="margin:0; font-size:12.5px;" placeholder="Bu toplantıda konuşulan / yapılan çalışma...">${_ktKacir(_kurulNotTaslak[k.id] || '')}</textarea></td>
    </tr>`;
  }).join('');
}

function _kurulNotKaydetTiklandi() {
  _kurulNotTaslagiTopla();
  // Sadece listede görünen kararların notları yazılır (gizli kalanlara dokunulmaz).
  const notlar = {};
  document.querySelectorAll('#kurulNotGovde [data-kurul-not]').forEach(el => { notlar[el.getAttribute('data-kurul-not')] = el.value; });
  kurulToplantiNotlariniKaydet(_toplantiId, notlar);
  kurulNotModalKapat();
  kararlariCiz();
}

function kararlariCiz() {
  kararIstatistikleriniCiz();
  const { devreden, yeni } = toplantiKararGruplariniGetirVeIsaretle(_toplantiId);
  _kararTablosunuCiz('kararDevredenTabloGovde', 'kararDevredenBosDurum', 'Devreden karar bulunmamaktadır.', devreden);
  _kararTablosunuCiz('kararYeniTabloGovde', 'kararYeniBosDurum', 'Bu toplantı için henüz karar eklenmedi.', yeni);
}

// ==================== OLAYLAR ====================

// ==================== ÇALIŞANLARIN GÖRÜŞ VE ÖNERİLERİ ====================
// Kullanıcı isteği: "Çalışan Görüşü Ekle" ile giriş alanı. Veri, çıktıların okuduğu aynı serbest metin alanında
// (calisanTemsilcisiGorusleri) tutulur: her görüş bir satır, "konu | konuşulanlar, kararlar, takip" biçiminde
// (bkz. cikti.js _gorusMaddeleri).
let _duzenlenenGorusIndex = -1;

function _calisanGorusListesi() {
  const toplanti = toplantiIdIleGetirRepo(_toplantiId);
  const metin = String((toplanti && toplanti.calisanTemsilcisiGorusleri) || '').trim();
  return metin ? _gorusMaddeleri(metin) : [];
}

function _calisanGorusKaydet(liste) {
  const mevcut = toplantiIdIleGetirRepo(_toplantiId);
  const temiz = t => String(t || '').replace(/[|\n\r]+/g, ' ').trim();
  const metin = liste.map(g => temiz(g.gorus) + (temiz(g.konusulacak) ? ' | ' + temiz(g.konusulacak) : '')).join('\n');
  return toplantiGuncelle(_toplantiId, Object.assign({}, mevcut, {
    katilimcilar: (mevcut.katilimcilar || []).join(', '),
    calisanTemsilcisiGorusleri: metin
  }));
}

function calisanGorusleriniCiz() {
  const govde = document.getElementById('calisanGorusTabloGovde');
  const bosDurum = document.getElementById('calisanGorusBosDurum');
  const liste = _calisanGorusListesi();
  govde.innerHTML = '';
  if (!liste.length) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = 'Çalışan görüşü eklenmedi. "+ Çalışan Görüşü Ekle" ile ekleyebilirsiniz.';
    return;
  }
  bosDurum.classList.remove('gorunur');
  liste.forEach((g, i) => {
    const satir = document.createElement('tr');
    satir.innerHTML = `
      <td style="white-space:nowrap;"><button class="tablo-buton" data-gorus-duzenle="${i}">Düzenle</button><button class="tablo-buton sil" data-gorus-sil="${i}">Sil</button></td>
      <td>${i + 1}</td>
      <td>${_ktKacir(g.gorus)}</td>
      <td>${_ktKacir(g.konusulacak) || '-'}</td>
    `;
    govde.appendChild(satir);
  });
  govde.querySelectorAll('[data-gorus-duzenle]').forEach(btn => btn.addEventListener('click', () => calisanGorusModalAc(Number(btn.getAttribute('data-gorus-duzenle')))));
  govde.querySelectorAll('[data-gorus-sil]').forEach(btn => btn.addEventListener('click', async () => {
    if (!(await onayModali('Bu çalışan görüşünü silmek istediğinize emin misiniz?', 'Sil'))) return;
    const yeni = _calisanGorusListesi();
    yeni.splice(Number(btn.getAttribute('data-gorus-sil')), 1);
    _calisanGorusKaydet(yeni);
    calisanGorusleriniCiz();
  }));
}

function calisanGorusModalAc(index) {
  _duzenlenenGorusIndex = index;
  const g = index >= 0 ? _calisanGorusListesi()[index] : null;
  document.getElementById('calisanGorusModalBaslik').textContent = g ? 'Çalışan Görüşünü Düzenle' : 'Çalışan Görüşü Ekle';
  document.getElementById('calisanGorusKonu').value = g ? g.gorus : '';
  document.getElementById('calisanGorusTakip').value = g ? g.konusulacak : '';
  document.getElementById('calisanGorusKonuHata').textContent = '';
  document.getElementById('calisanGorusModalKatman').classList.add('acik');
  document.getElementById('calisanGorusKonu').focus();
}

function calisanGorusModalKapat() {
  document.getElementById('calisanGorusModalKatman').classList.remove('acik');
  _duzenlenenGorusIndex = -1;
}

function calisanGorusFormGonderildi(e) {
  e.preventDefault();
  const gorus = document.getElementById('calisanGorusKonu').value.trim();
  if (!gorus) { document.getElementById('calisanGorusKonuHata').textContent = 'Konu zorunludur.'; return; }
  const liste = _calisanGorusListesi();
  const kayit = { gorus, konusulacak: document.getElementById('calisanGorusTakip').value.trim() };
  if (_duzenlenenGorusIndex >= 0 && liste[_duzenlenenGorusIndex]) liste[_duzenlenenGorusIndex] = kayit; else liste.push(kayit);
  _calisanGorusKaydet(liste);
  calisanGorusModalKapat();
  calisanGorusleriniCiz();
}

// ==================== OLAYDAN KARARA AKTARMA ====================
// Düzenle ile "yükseltilmiş" otomatik olay farklı bir id alsa da (kaynakKazaId) aynı
// olay sayılsın diye anahtar her zaman Olay/Kaza kaydına göre üretilir.
function _olayKararAnahtari(o) {
  if (o.otomatik) return o.id;
  return o.kaynakKazaId ? 'oto-' + o.kaynakKazaId : o.id;
}

function _olayKararButonuUret(o, aktarilanKararlar) {
  const karar = aktarilanKararlar.get(_olayKararAnahtari(o));
  if (karar) {
    return `<span title="Bu olay Kararlar bölümüne aktarıldı" style="font-size:11px; color:#15803d; font-weight:600; margin-right:6px;">✓ Karar ${_ktKacir(karar.kararNo)}</span>`;
  }
  return `<button class="tablo-buton" data-karara-aktar="${o.id}" title="Bu olayı Kararlar bölümüne aktar">→ Karar</button>`;
}

// Olayın bilgilerinden dolu bir "Yeni Karar" penceresi açar; kullanıcı metni/sorumluyu
// tamamlayıp Kaydet'e basınca karar oluşur (Sorumlu ve Karar Metni zorunludur).
function olayiKararaAktar(olay) {
  const anahtar = _olayKararAnahtari(olay);
  const mevcut = kararTumunuGetir().find(k => k.toplantiId === _toplantiId && k.kaynakOlayId === anahtar);
  if (mevcut) {
    alert('Bu olay zaten Kararlar bölümüne aktarılmış (Karar No: ' + mevcut.kararNo + ').');
    return;
  }
  const toplanti = toplantiIdIleGetirRepo(_toplantiId);
  const olaylarGundemi = (toplanti.gundem || []).find(g => /^olaylar/i.test(String(g.baslik || '').trim()));
  const yerMetni = [olay.yer, olay.birim].filter((v, i, a) => v && a.indexOf(v) === i).join(' / ');
  const ozet = String(olay.olusSekli || '').trim();
  // Elle girilmiş olayda karar metni zaten varsa o kullanılır; yoksa olay özetinden taslak üretilir.
  const taslakMetin = (olay.kararMetni && olay.kararMetni.trim())
    ? olay.kararMetni.trim()
    : `${gunAyYil(olay.tarih) || '-'} tarihinde${yerMetni ? ' ' + yerMetni + ' bölümünde' : ''} meydana gelen "${olay.tur}" olayı${ozet ? ': ' + ozet : ''}${olay.kokNeden ? ' Kök neden: ' + olay.kokNeden + '.' : ''} Tekrarının önlenmesi için gerekli önlemlerin alınmasına karar verilmiştir.`;
  const katilimciSayisi = toplantiImzalariniGetir(_toplantiId).filter(i => i.katildiMi).length;
  _kararKaynakOlayId = anahtar;
  kararModalAc({
    id: '',
    kararNo: '',
    kararMetni: taslakMetin,
    kaynakGundem: olaylarGundemi ? olaylarGundemi.baslik : 'Olaylar',
    yasalSartlar: [],
    yasalDayanak: '',
    sorumlu: olay.sorumlu || '',
    termin: olay.termin || '',
    oncelik: olay.oncelik || 'Normal',
    durum: 'Açık',
    kapanisTarihi: '',
    kanit: '',
    aksiyonNotu: '',
    oy: '',
    oySonucu: '',
    oyKabul: katilimciSayisi,
    oyRet: 0,
    oyCekimser: 0,
    devrederMi: true,
    fotoOncesi: '',
    fotoSonrasi: '',
    fotografEk: (olay.fotograflar || []).filter(f => f && f.url).slice(0, 3).map(f => ({ url: f.url }))
  });
  _kararKaynakOlayId = anahtar;
  document.getElementById('kararModalBaslik').textContent = 'Olaydan Yeni Karar — ' + (olay.tur || '');
}

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
  // Kullanıcı isteği: Olay/Kaza modülünden gelen iş kazası / ramak kala olaylarını tek
  // butonla Kararlar bölümüne aktarma — daha önce aktarılanlar işaretlenir (çift aktarım olmaz).
  const aktarilanKararlar = new Map(kararTumunuGetir().filter(k => k.toplantiId === _toplantiId && k.kaynakOlayId).map(k => [k.kaynakOlayId, k]));

  olaylar.forEach(o => {
    if (!o.otomatik) manuelSira++;
    const satir = document.createElement('tr');
    satir.innerHTML = `
      <td>${_ktKacir(o.tur)}${o.otomatik ? ' <span style="font-size:10px; color:var(--metin-soluk);">(Olay/Kaza modülünden)</span>' : ''}</td><td>${gunAyYil(o.tarih)}</td><td>${_ktKacir(o.yer) || '-'}</td><td>${_ktKacir(o.birim) || '-'}</td>
      <td>${_ktKacir(o.olusSekli) || '-'}</td><td>${_ktKacir(o.kokNeden) || '-'}</td><td>${_ktKacir(o.isGunuKaybi) || '-'}</td>
      <td>${o.otomatik ? '-' : (_ktKacir(o.kararMetni) || '-')}</td>
      <td>${o.otomatik ? '-' : (_ktKacir(o.sorumlu) || '-')}</td>
      <td>${o.otomatik ? '-' : (gunAyYil(o.termin) || '-')}</td>
      <td>${o.otomatik ? '-' : (_ktKacir(o.oncelik) || '-')}</td>
      <td>${o.otomatik ? '-' : (_ktKacir(o.durum) || '-')}</td>
      <td>${_olayFotoHucresiUret(o)}</td>
      <td class="sutun-sabit">
        ${_olayKararButonuUret(o, aktarilanKararlar)}
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
  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', async () => {
    const id = btn.getAttribute('data-sil');
    const olay = olaylar.find(o => o.id === id);
    if (!olay) return;
    if (olay.otomatik) {
      if (await onayModali('Bu olay bu toplantının listesinden gizlenecek (Olay/Kaza modülündeki asıl kayıt silinmez). Devam edilsin mi?', 'Devam Et')) {
        kurulOtomatikOlayiGizle(_toplantiId, id.replace(/^oto-/, ''));
        olaylariCiz();
      }
    } else if (await onayModali('Bu olayı silmek istediğinize emin misiniz?', 'Sil')) {
      kurulOlayiSil(id);
      olaylariCiz();
    }
  }));
  govde.querySelectorAll('[data-karara-aktar]').forEach(btn => btn.addEventListener('click', () => {
    const olay = olaylar.find(o => o.id === btn.getAttribute('data-karara-aktar'));
    if (olay) olayiKararaAktar(olay);
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

// Kullanıcı isteği: "kararlar, olaylar ve önceki toplantı kararları için
// yönetmelik seçme ekleyelim, uygunsuzluk modülündeki sistemle aynı" — aynı
// sayfada hem Karar hem Olay modalı bulunduğundan (uygunsuzluk'taki tek
// #yasalSartlar id'sinin aksine) elementId parametreli, iki modalın da
// paylaştığı ortak yardımcılar.
function _ktYasalSartlariDoldur(selectId) {
  document.getElementById(selectId).innerHTML = YASAL_SART_LISTESI.map(s => `<option value="${s.replace(/"/g, '&quot;')}">${s}</option>`).join('');
}
function _ktSeciliYasalSartlariGetir(selectId) {
  return Array.from(document.getElementById(selectId).selectedOptions).map(o => o.value);
}
function _ktYasalSartlariSec(selectId, secili) {
  const set = new Set(Array.isArray(secili) ? secili : []);
  Array.from(document.getElementById(selectId).options).forEach(opt => { opt.selected = set.has(opt.value); });
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

  _ktYasalSartlariDoldur('olayYasalSartlar');
  _ktYasalSartlariSec('olayYasalSartlar', olay ? olay.yasalSartlar : []);
  document.getElementById('olayYasalDayanak').value = olay ? (olay.yasalDayanak || '') : '';

  document.getElementById('olayKararMetni').value = olay ? (olay.kararMetni || '') : '';
  document.getElementById('olaySorumlu').value = olay ? (olay.sorumlu || '') : '';
  bolumButonlariCiz('olaySorumluBolumButonlari', 'olaySorumlu', 'tekli');
  document.getElementById('olayTermin').value = olay ? (olay.termin || '') : '';
  document.getElementById('olayOncelik').innerHTML = ['Düşük', 'Normal', 'Yüksek', 'Kritik'].map(o => `<option ${olay && olay.oncelik === o ? 'selected' : ''}>${o}</option>`).join('');
  document.getElementById('olayDurum').innerHTML = KARAR_DURUMLARI.map(d => `<option ${olay && kararDurumGoster(olay.durum) === d ? 'selected' : ''}>${d}</option>`).join('');
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
    yasalSartlar: _ktSeciliYasalSartlariGetir('olayYasalSartlar'),
    yasalDayanak: document.getElementById('olayYasalDayanak').value,
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

  imzalar.forEach((i, index) => {
    const satir = document.createElement('tr');
    satir.innerHTML = `
      <td>${i.siraNo}</td><td>${_ktKacir(i.adSoyad)}</td><td>${_ktKacir(i.unvan) || '-'}</td><td>${_ktKacir(i.birim) || '-'}</td><td>${_ktKacir(i.kuruldakiGorev) || '-'}</td>
      <td><button type="button" class="tablo-buton" data-katildi-toggle="${i.id}" title="Tıklayarak katılım durumunu değiştir" style="font-size:16px; font-weight:700; color:${i.katildiMi ? '#16a34a' : '#dc2626'};">${i.katildiMi ? '✓' : '✗'}</button></td>
      <td>
        ${index > 0 ? `<button class="tablo-buton" data-imza-yukari="${i.id}" title="Yukarı taşı">▲</button>` : ''}
        ${index < imzalar.length - 1 ? `<button class="tablo-buton" data-imza-asagi="${i.id}" title="Aşağı taşı">▼</button>` : ''}
        <button class="tablo-buton" data-duzenle="${i.id}">Düzenle</button>
        <button class="tablo-buton" data-atama="${i.id}" title="Bu kişi için atama yazısı oluştur">Atama</button>
        <button class="tablo-buton sil" data-sil="${i.id}">Sil</button>
      </td>
    `;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-imza-yukari]').forEach(btn => btn.addEventListener('click', () => {
    imzaSatiriTasi(btn.getAttribute('data-imza-yukari'), -1);
    imzalariCiz();
  }));
  govde.querySelectorAll('[data-imza-asagi]').forEach(btn => btn.addEventListener('click', () => {
    imzaSatiriTasi(btn.getAttribute('data-imza-asagi'), 1);
    imzalariCiz();
  }));
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
  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', async () => {
    if (await onayModali('Bu katılımcıyı silmek istediğinize emin misiniz?', 'Sil')) { imzaSatiriSil(btn.getAttribute('data-sil')); imzalariCiz(); }
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
    // Kullanıcı isteği: Kurul Başkanı aynı zamanda ilgili işverenin (ör. Bağfaş
    // Bandırma Gübre Fabrikaları) İşveren Vekili oluyor — her işveren için
    // birleşik seçenek de sunulur (başkan tespiti bununla da çalışır, bkz.
    // service.js toplantiBaskanSekreterGetir).
    if (g === 'Kurul Başkanı') {
      return [g].concat(isverenler.length
        ? isverenler.map(i => `Kurul Başkanı / İşveren Vekili — ${i}`)
        : ['Kurul Başkanı / İşveren Vekili']);
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
  document.getElementById('imzaEposta').value = imza ? (imza.eposta || '') : '';
  document.getElementById('imzaKuruldakiGorev').innerHTML = '<option value="">— Seçiniz —</option>' +
    _kuruldakiGorevSecenekleriUret().map(g => `<option ${imza && imza.kuruldakiGorev === g ? 'selected' : ''}>${_ktKacir(g)}</option>`).join('');
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
    eposta: document.getElementById('imzaEposta').value,
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
  const kapali = kararKapaliMi(document.getElementById('kararDurum').value);
  document.getElementById('kapanisSatiri').style.display = kapali ? '' : 'none';
}

function kararModalAc(karar) {
  // id'si olmayan bir taslak (olaydan aktarma) yeni karar gibi kaydedilir.
  _duzenlenenKararId = karar && karar.id ? karar.id : null;
  _kararKaynakOlayId = '';
  document.getElementById('kararModalBaslik').textContent = karar && karar.id ? 'Kararı Düzenle' : 'Yeni Karar';
  document.getElementById('kararNo').value = karar ? karar.kararNo : '';
  document.getElementById('kararMetni').value = karar ? karar.kararMetni : '';
  document.getElementById('kararKaynakGundem').value = karar ? karar.kaynakGundem : '';
  _ktYasalSartlariDoldur('kararYasalSartlar');
  _ktYasalSartlariSec('kararYasalSartlar', karar ? karar.yasalSartlar : []);
  document.getElementById('kararYasalDayanak').value = karar ? (karar.yasalDayanak || '') : '';
  document.getElementById('kararSorumlu').value = karar ? karar.sorumlu : '';
  bolumButonlariCiz('kararSorumluBolumButonlari', 'kararSorumlu', 'tekli');
  document.getElementById('kararTermin').value = karar ? karar.termin : '';
  document.getElementById('kararOncelik').innerHTML = ['Düşük', 'Normal', 'Yüksek', 'Kritik'].map(o => `<option ${karar && karar.oncelik === o ? 'selected' : ''}>${o}</option>`).join('');
  document.getElementById('kararDurum').innerHTML = KARAR_DURUMLARI.map(d => `<option ${karar && kararDurumGoster(karar.durum) === d ? 'selected' : ''}>${d}</option>`).join('');
  document.getElementById('kararKapanisTarihi').value = karar ? karar.kapanisTarihi : '';
  document.getElementById('kararKanit').value = karar ? karar.kanit : '';
  // Konuşulanlar: önceki toplantıların notları salt okunur, bu toplantınınki düzenlenir.
  const oncekiNotlar = karar ? kararToplantiNotlariniGetir(karar, _toplantiId).filter(n => n.toplantiId !== _toplantiId) : [];
  document.getElementById('kararNotGecmisi').innerHTML = oncekiNotlar.length
    ? `<div style="font-weight:600; margin-bottom:3px;">Önceki toplantılarda konuşulanlar</div>` + oncekiNotlar.map(n => `<div style="padding:3px 0; border-bottom:1px solid var(--kenarlik);"><b>${n.eski ? 'Önceki not' : (_kurulNotTarihi(n.tarih) || _ktKacir(n.toplantiNo))}:</b> ${_ktKacir(n.not)}</div>`).join('')
    : '';
  const buToplanti = toplantiIdIleGetirRepo(_toplantiId);
  document.getElementById('kararToplantiNotuEtiket').textContent = 'Bu Toplantıda Konuşulanlar' + (buToplanti && buToplanti.tarih ? ` (${gunAyYil(buToplanti.tarih)})` : '');
  document.getElementById('kararToplantiNotu').value = karar && karar.toplantiNotlari ? (karar.toplantiNotlari[_toplantiId] || '') : '';
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
  _kararKaynakOlayId = '';
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
    yasalSartlar: _ktSeciliYasalSartlariGetir('kararYasalSartlar'),
    yasalDayanak: document.getElementById('kararYasalDayanak').value,
    sorumlu: document.getElementById('kararSorumlu').value,
    termin: document.getElementById('kararTermin').value,
    oncelik: document.getElementById('kararOncelik').value,
    durum: document.getElementById('kararDurum').value,
    kapanisTarihi: document.getElementById('kararKapanisTarihi').value,
    kanit: document.getElementById('kararKanit').value,
    toplantiNotlari: (() => {
      const mevcut = _duzenlenenKararId ? kararIdIleGetirRepo(_duzenlenenKararId) : null;
      const tn = Object.assign({}, (mevcut && mevcut.toplantiNotlari) || {});
      const not = document.getElementById('kararToplantiNotu').value.trim();
      if (not) tn[_toplantiId] = not; else delete tn[_toplantiId];
      return tn;
    })(),
    oy: document.getElementById('kararOy').value,
    oySonucu: document.getElementById('kararOySonucu').value,
    oyKabul: document.getElementById('kararOyKabul').value,
    oyRet: document.getElementById('kararOyRet').value,
    oyCekimser: document.getElementById('kararOyCekimser').value,
    devrederMi: document.getElementById('kararDevrederMi').checked,
    fotoOncesi: _kararFotoOncesi,
    fotoSonrasi: _kararFotoSonrasi,
    fotografEk: _kararFotoEk,
    kaynakOlayId: _duzenlenenKararId ? '' : _kararKaynakOlayId
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
  olaylariCiz();
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
      <td>${_ktKacir(k.konuBasligi)}</td><td>${gunAyYil(k.tespitTarihi) || '-'}</td>
      <td>${_ktKacir(k.bolum) || '-'}</td><td>${_ktKacir(k.uygunsuzluk) || '-'}</td><td>${_ktKacir(k.sorumlu) || '-'}</td><td>${_ktKacir(k.durum) || '-'}</td>
      <td>${_uygunsuzlukFotoHucresiUret(k)}</td>
      <td><button class="tablo-buton sil" data-tespit-uygunsuzluk-sil="${_ktKacir(k.id)}">Sil</button></td>
    `;
    govde.appendChild(satir);
  });
  fotoReferanslariCoz(govde);

  govde.querySelectorAll('[data-tespit-uygunsuzluk-sil]').forEach(btn => btn.addEventListener('click', async () => {
    if (await onayModali('Bu uygunsuzluğu gündemden kaldırmak istediğinize emin misiniz? Asıl kayıt Uygunsuzluk modülünde kalır, sadece bu toplantı için bir daha görünmeyecektir.', 'Kaldır')) {
      tespitEdilenUygunsuzlukOtomatikGizle(_toplantiId, btn.getAttribute('data-tespit-uygunsuzluk-sil'));
      tespitEdilenUygunsuzluklariCiz(toplanti);
    }
  }));
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
      <td>${_ktKacir(k.konuBasligi)}</td><td>${gunAyYil(k.tespitTarihi) || '-'}</td><td>${gunAyYil(k.kapanisTarihi) || '-'}</td>
      <td>${_ktKacir(k.bolum) || '-'}</td><td>${_ktKacir(k.uygunsuzluk) || '-'}</td><td>${_ktKacir(k.alinanOnlem) || '-'}</td><td>${_ktKacir(k.sorumlu) || '-'}</td>
      <td>${_uygunsuzlukFotoHucresiUret(k)}</td>
      <td><button class="tablo-buton sil" data-kapanan-uygunsuzluk-sil="${_ktKacir(k.id)}">Sil</button></td>
    `;
    govde.appendChild(satir);
  });
  fotoReferanslariCoz(govde);

  govde.querySelectorAll('[data-kapanan-uygunsuzluk-sil]').forEach(btn => btn.addEventListener('click', async () => {
    if (await onayModali('Bu uygunsuzluğu gündemden kaldırmak istediğinize emin misiniz? Asıl kayıt Uygunsuzluk modülünde kalır, sadece bu toplantı için bir daha görünmeyecektir.', 'Kaldır')) {
      kapananUygunsuzlukOtomatikGizle(_toplantiId, btn.getAttribute('data-kapanan-uygunsuzluk-sil'));
      kapananUygunsuzluklariCiz(toplanti);
    }
  }));
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
    satir.innerHTML = `<td>${k.siraNo}</td><td>${_ktKacir(k.egitimAdi)}</td><td>${tarihGoruntu || '-'}</td><td>${k.katilimciSayisi}</td><td>${_ktKacir(k.birim) || '-'}</td>
      <td><button class="tablo-buton sil" data-egitim-sil="${_ktKacir(k.id)}">Sil</button></td>`;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-egitim-sil]').forEach(btn => btn.addEventListener('click', async () => {
    if (await onayModali('Bu eğitim satırını gündemden kaldırmak istediğinize emin misiniz? Bu toplantı için tekrar görünmeyecektir.', 'Kaldır')) {
      egitimOtomatikGizle(_toplantiId, btn.getAttribute('data-egitim-sil'));
      aylikEgitimleriCiz(toplanti);
    }
  }));
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
    const islemler = f.otomatik
      ? `<button class="tablo-buton sil" data-oto-sil="${_ktKacir(f.id)}">Sil</button>`
      : `<button class="tablo-buton" data-duzenle="${f.id}">Düzenle</button> <button class="tablo-buton sil" data-sil="${f.id}">Sil</button>`;
    satir.innerHTML = `
      <td>${_ktKacir(f.faaliyet)}${f.otomatik ? ' <span style="font-size:10px; color:var(--metin-soluk);">(Acil Durum modülünden)</span>' : ''}</td><td>${f.adet || '-'}</td><td>${_ktKacir(f.aciklama) || '-'}</td>
      <td>${islemler}</td>
    `;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', async () => {
    if (await onayModali('Bu faaliyeti silmek istediğinize emin misiniz?', 'Sil')) { ayIciFaaliyetSil(btn.getAttribute('data-sil')); ayIciFaaliyetleriCiz(); }
  }));
  govde.querySelectorAll('[data-oto-sil]').forEach(btn => btn.addEventListener('click', async () => {
    if (await onayModali('Bu faaliyeti gündemden kaldırmak istediğinize emin misiniz? Bu toplantı için tekrar görünmeyecektir.', 'Kaldır')) {
      ayIciFaaliyetOtomatikGizle(_toplantiId, btn.getAttribute('data-oto-sil'));
      ayIciFaaliyetleriCiz();
    }
  }));
  govde.querySelectorAll('[data-duzenle]').forEach(btn => btn.addEventListener('click', () => {
    const f = faaliyetler.find(x => x.id === btn.getAttribute('data-duzenle'));
    if (f) ayIciFaaliyetModalAc(f);
  }));
}

function ayIciFaaliyetModalAc(duzenlenecek) {
  document.getElementById('ayIciFaaliyetForm').reset();
  document.querySelectorAll('#ayIciFaaliyetForm .alan-hatasi').forEach(el => el.textContent = '');
  _duzenlenenAyIciFaaliyetId = duzenlenecek ? duzenlenecek.id : null;
  const baslik = document.getElementById('ayIciFaaliyetModalBaslik');
  if (baslik) baslik.textContent = duzenlenecek ? 'Ay İçi Faaliyeti Düzenle' : 'Yeni Ay İçi Faaliyet';
  if (duzenlenecek) {
    document.getElementById('ayIciFaaliyetAdi').value = duzenlenecek.faaliyet || '';
    document.getElementById('ayIciFaaliyetAdet').value = duzenlenecek.adet || '';
    document.getElementById('ayIciFaaliyetAciklama').value = duzenlenecek.aciklama || '';
  }
  document.getElementById('ayIciFaaliyetModalKatman').classList.add('acik');
}

function ayIciFaaliyetModalKapat() {
  document.getElementById('ayIciFaaliyetModalKatman').classList.remove('acik');
  _duzenlenenAyIciFaaliyetId = null;
}

function ayIciFaaliyetFormGonderildi(e) {
  e.preventDefault();
  document.querySelectorAll('#ayIciFaaliyetForm .alan-hatasi').forEach(el => el.textContent = '');

  const veriler = {
    faaliyet: document.getElementById('ayIciFaaliyetAdi').value,
    adet: document.getElementById('ayIciFaaliyetAdet').value,
    aciklama: document.getElementById('ayIciFaaliyetAciklama').value
  };
  const sonuc = _duzenlenenAyIciFaaliyetId
    ? ayIciFaaliyetGuncelle(_duzenlenenAyIciFaaliyetId, veriler)
    : ayIciFaaliyetEkle(_toplantiId, veriler);
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
