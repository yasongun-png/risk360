// Saha Dijital Haritası UI katmanı. Bağımsız referans uygulamadan
// (Desktop/haritamodülü/app.js) mantık olarak birebir taşındı; IndexedDB
// çağrıları yerine service.js (tenant-scoped Firestore) kullanılıyor,
// görseller core/data.js'teki fotoYukle/fotoBuyukCoz/fotoReferanslariCoz
// üzerinden depolanıyor.

const state = {
  tesisler: [],
  aktifTesisId: '',
  kayitlar: [],
  etiketler: [],
  etiketlerGorunur: true,
  oklar: [],
  oklarGorunur: true,
  katmanGorunur: {},
  filtreler: { kat: '', bolum: '', durum: '', arama: '' },
  zoom: 1,
  panX: 0,
  panY: 0,
  eklemeModu: false,
  etiketEklemeModu: false,
  okEklemeModu: false,
  bekleyenNokta: null,
  suruklemeAktif: false,
  suruklemeHareketEtti: false,
  suruklemeBaslangic: null,
  sekme: 'harita'
};

let _haritaKayitFotograflari = [];
let _duzenlenenKayitId = null;
// Haritada bir dış kaynağın kaydı için konum seçilmesi bekleniyorsa (bkz.
// URL parametreleri konumKaynak/konumId/donus) dolu olur; sonraki tuval
// tıklaması normal nokta ekleme akışı yerine bu kaydın konumunu günceller.
let _konumSecimBaglami = null;

/* ---------- Dış modül köprüsü ----------
   Uygunsuzluk, Risk Değerlendirmesi ve Acil Durum'un Ekipman kayıtları
   haritada KENDİ türlerinin katmanı olarak görünür ama harita_kayitlar'a
   YAZILMAZ — veri o modüllerin kendi deposunda tek kopya olarak kalır
   (bkz. modules/uygunsuzluk|risk|acil-durum'daki haritaTesisId/haritaX/haritaY
   alanları ve "Haritada Konum Ekle/Gör" butonları). Bu modüllerin
   repository.js'leri index.html'de ayrıca dahil edilir. */
const HARITA_DIS_KAYNAKLAR = {
  uygunsuzluk: {
    turler: ['uygunsuzluk'],
    tumunuGetir: () => uygunsuzlukTumunuGetir(),
    idIleGetir: id => uygunsuzlukIdIleGetirRepo(id),
    konumGuncelle: (id, tesisId, x, y) => uygunsuzlukGuncelleRepo(id, { haritaTesisId: tesisId, haritaX: x, haritaY: y }),
    yeniKayitUrl: (tesisId, x, y) => `../uygunsuzluk/index.html?yeniKonum=1&tesisId=${tesisId}&x=${x}&y=${y}`,
    acUrl: id => `../uygunsuzluk/index.html?ac=${id}`,
    modulAdi: 'Uygunsuzluk',
    normallestir: k => ({
      kaynak: 'uygunsuzluk', kaynakId: k.id, id: 'x-uygunsuzluk-' + k.id, tesisId: k.haritaTesisId,
      x: Number(k.haritaX) || 0, y: Number(k.haritaY) || 0,
      tur: 'uygunsuzluk', altTur: '', no: k.aksiyonNo, baslik: k.baslik, aciklama: k.aciklama,
      kat: '', bolum: k.bolum, durum: k.durum, fotograflar: [],
      ek: { 'Risk Seviyesi': k.riskSeviyesi, 'Sorumlu': k.sorumlu, 'Termin': k.termin },
      kontrolGecmisi: [], olusturmaTarihi: k.olusturmaTarihi, guncellemeTarihi: k.olusturmaTarihi
    })
  },
  risk: {
    turler: ['risk'],
    tumunuGetir: () => riskTumunuGetir(),
    idIleGetir: id => riskIdIleGetirRepo(id),
    konumGuncelle: (id, tesisId, x, y) => riskGuncelleRepo(id, { haritaTesisId: tesisId, haritaX: x, haritaY: y }),
    yeniKayitUrl: (tesisId, x, y) => `../risk/index.html?yeniKonum=1&tesisId=${tesisId}&x=${x}&y=${y}`,
    acUrl: id => `../risk/index.html?ac=${id}`,
    modulAdi: 'Risk Değerlendirmesi',
    normallestir: k => ({
      kaynak: 'risk', kaynakId: k.id, id: 'x-risk-' + k.id, tesisId: k.haritaTesisId,
      x: Number(k.haritaX) || 0, y: Number(k.haritaY) || 0,
      tur: 'risk', altTur: '', no: k.riskNo, baslik: k.tehlike || k.risk, aciklama: k.risk,
      kat: '', bolum: k.bolum, durum: k.durum, fotograflar: [],
      ek: { 'Yer / Ekipman': k.yer, 'Sorumlu': k.sorumlu, 'Termin': k.termin },
      kontrolGecmisi: [], olusturmaTarihi: k.olusturmaTarihi, guncellemeTarihi: k.olusturmaTarihi
    })
  },
  acilDurumEkipman: {
    turler: ['yangin_tupu', 'yangin', 'acil_ekipman', 'cikis', 'toplanma'],
    tumunuGetir: () => ekipmanlariTumunuGetir(),
    idIleGetir: id => ekipmanIdIleGetirRepo(id),
    konumGuncelle: (id, tesisId, x, y) => ekipmanGuncelleRepo(id, { haritaTesisId: tesisId, haritaX: x, haritaY: y }),
    yeniKayitUrl: (tesisId, x, y) => `../acil-durum/index.html?yeniKonum=1&tesisId=${tesisId}&x=${x}&y=${y}`,
    acUrl: id => `../acil-durum/index.html?ac=${id}`,
    modulAdi: 'Acil Durum Yönetimi',
    normallestir: k => {
      const e = _haritaEkipmanTurEslesme(k.tur);
      return {
        kaynak: 'acilDurumEkipman', kaynakId: k.id, id: 'x-ade-' + k.id, tesisId: k.haritaTesisId,
        x: Number(k.haritaX) || 0, y: Number(k.haritaY) || 0,
        tur: e.tur, altTur: e.altTur, no: k.ekipmanNo, baslik: k.ad, aciklama: k.bulgular,
        kat: '', bolum: k.bolum, durum: k.durum, fotograflar: [],
        ek: { 'Son Kontrol': k.sonKontrol, 'Sonraki Kontrol': k.sonrakiKontrol, 'Sorumlu': k.sorumlu },
        kontrolGecmisi: [], olusturmaTarihi: k.olusturmaTarihi, guncellemeTarihi: k.olusturmaTarihi
      };
    }
  }
};

// acil-durum modülünün EKIPMAN_TURLERI (Türkçe metin) → harita tür/altTür.
function _haritaEkipmanTurEslesme(ekipmanTuru) {
  const harita = {
    'Yangın Tüpü': { tur: 'yangin_tupu', altTur: '' },
    'Hidrant': { tur: 'yangin', altTur: 'hidrant' },
    'Yangın Dolabı': { tur: 'yangin', altTur: 'dolap' },
    'Göz Duşu': { tur: 'acil_ekipman', altTur: 'goz_dusu' },
    'Acil Duş': { tur: 'acil_ekipman', altTur: 'acil_dus' },
    'Kaçış Yolu': { tur: 'cikis', altTur: 'kacis_yolu' },
    'Toplanma Alanı': { tur: 'toplanma', altTur: '' },
    'Alarm / Siren': { tur: 'yangin', altTur: 'alarm_butonu' },
    'Acil Aydınlatma': { tur: 'ekipman', altTur: '' },
    'Döküntü Kiti': { tur: 'acil_ekipman', altTur: '' }
  };
  return harita[ekipmanTuru] || { tur: 'diger', altTur: '' };
}

// harita türü → hangi dış kaynağa ait (haritaTurModaliAc'ta yönlendirme için).
const HARITA_TUR_KAYNAK_HARITASI = {};
Object.entries(HARITA_DIS_KAYNAKLAR).forEach(([kaynakAdi, kaynak]) => {
  kaynak.turler.forEach(tur => { HARITA_TUR_KAYNAK_HARITASI[tur] = kaynakAdi; });
});

Object.keys(HARITA_TIPLERI).forEach(t => { state.katmanGorunur[t] = true; });

const el = id => document.getElementById(id);
function qs(sel, root) { return (root || document).querySelector(sel); }

function _haritaKacir(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function haritaToast(mesaj, tur) {
  const t = el('haritaToast');
  t.textContent = mesaj;
  t.className = 'h-toast' + (tur === 'danger' ? ' danger' : '');
  t.classList.remove('hidden');
  clearTimeout(haritaToast._h);
  haritaToast._h = setTimeout(() => t.classList.add('hidden'), 2600);
}

function aktifTesis() { return state.tesisler.find(t => t.id === state.aktifTesisId) || null; }

/* ---------- Başlangıç ---------- */

async function haritaSayfasiniBaslat() {
  state.tesisler = haritaTesisleriGetir();
  if (!state.tesisler.length) {
    state.tesisler = [haritaTesisEkle('Yeni Tesis')];
  }
  state.aktifTesisId = state.tesisler[0].id;

  const parametreler = new URLSearchParams(location.search);
  const konumKaynak = parametreler.get('konumKaynak');
  const konumId = parametreler.get('konumId');
  const donus = parametreler.get('donus');
  const odaklanKaynak = parametreler.get('odaklanKaynak');
  const odaklanId = parametreler.get('odaklanId');

  let odaklanacakMarkerId = '';
  if (odaklanKaynak && odaklanId && HARITA_DIS_KAYNAKLAR[odaklanKaynak]) {
    const kaynak = HARITA_DIS_KAYNAKLAR[odaklanKaynak];
    const disKayit = kaynak.idIleGetir(odaklanId);
    if (disKayit && disKayit.haritaTesisId && state.tesisler.some(t => t.id === disKayit.haritaTesisId)) {
      state.aktifTesisId = disKayit.haritaTesisId;
      odaklanacakMarkerId = 'x-' + (odaklanKaynak === 'acilDurumEkipman' ? 'ade' : odaklanKaynak) + '-' + odaklanId;
    }
  } else if (konumKaynak && konumId && HARITA_DIS_KAYNAKLAR[konumKaynak]) {
    _konumSecimBaglami = { kaynak: konumKaynak, id: konumId, donus: donus || '../harita/index.html' };
  }

  haritaTesisSelectiCiz();
  haritaKayitlariYukle(state.aktifTesisId);
  haritaOlaylariBagla();
  await haritaHepsiniCiz();

  if (_konumSecimBaglami) {
    el('haritaTuval').classList.add('h-yerlestiriliyor');
    el('eklemeIpucu').textContent = `📍 ${HARITA_DIS_KAYNAKLAR[_konumSecimBaglami.kaynak].modulAdi} kaydı için haritada bir konum seçin…`;
  }
  if (odaklanacakMarkerId) haritaDetayModaliAc(odaklanacakMarkerId);
}

function haritaKayitlariYukle(tesisId) {
  const disTurler = Object.values(HARITA_DIS_KAYNAKLAR).flatMap(k => k.turler);
  const yerel = haritaKayitlariGetir(tesisId).filter(k => !disTurler.includes(k.tur));
  const disKaynakli = [];
  Object.values(HARITA_DIS_KAYNAKLAR).forEach(kaynak => {
    kaynak.tumunuGetir()
      .filter(k => k.haritaTesisId === tesisId)
      .forEach(k => disKaynakli.push(kaynak.normallestir(k)));
  });
  state.kayitlar = yerel.concat(disKaynakli);
  state.etiketler = haritaEtiketleriGetir(tesisId);
  state.oklar = haritaOklariGetir(tesisId);
}

function haritaTesisSelectiCiz() {
  const sel = el('tesisSelect');
  sel.innerHTML = state.tesisler.map(t => `<option value="${t.id}">${_haritaKacir(t.ad)}</option>`).join('');
  sel.value = state.aktifTesisId;
  el('tesisSilBtn').disabled = state.tesisler.length <= 1;
}

/* ---------- Çizim ---------- */

async function haritaHepsiniCiz() {
  haritaKatmanListesiCiz();
  haritaFiltreSecenekleriCiz();
  await haritaHaritaGorseliniCiz();
  haritaIsaretleriCiz();
  haritaEtiketleriCiz();
  haritaOklariCiz();
  haritaListesiCiz();
  const tesis = aktifTesis();
  if (tesis) {
    el('simgeBoyutuAlani').value = tesis.simgeBoyutu || 30;
    el('simgeBoyutuDeger').textContent = tesis.simgeBoyutu || 30;
  }
}

function haritaGorunurKayitlar() {
  const f = state.filtreler;
  const q = f.arama.trim().toLocaleLowerCase('tr-TR');
  return state.kayitlar.filter(r => {
    if (!state.katmanGorunur[r.tur]) return false;
    if (f.kat && r.kat !== f.kat) return false;
    if (f.bolum && r.bolum !== f.bolum) return false;
    if (f.durum && r.durum !== f.durum) return false;
    if (q) {
      const t = haritaTipBilgisi(r.tur);
      const alt = haritaAltTipBilgisi(r.tur, r.altTur);
      const metin = [r.no, r.baslik, r.aciklama, r.kat, r.bolum, t.etiket, alt && alt.etiket, r.durum]
        .filter(Boolean).join(' ').toLocaleLowerCase('tr-TR');
      if (!metin.includes(q)) return false;
    }
    return true;
  });
}

function haritaKatmanListesiCiz() {
  const kutu = el('katmanListesi');
  kutu.innerHTML = Object.entries(HARITA_TIPLERI).map(([anahtar, t]) => {
    const sayi = state.kayitlar.filter(r => r.tur === anahtar).length;
    return `<label class="h-katmanSatir">
      <input type="checkbox" data-katman="${anahtar}" ${state.katmanGorunur[anahtar] ? 'checked' : ''}/>
      <span>${t.ikon} ${t.etiket}</span>
      <span class="h-sayi">${sayi}</span>
    </label>`;
  }).join('');
  kutu.querySelectorAll('input[data-katman]').forEach(cb => {
    cb.addEventListener('change', () => {
      state.katmanGorunur[cb.dataset.katman] = cb.checked;
      haritaIsaretleriCiz();
      haritaListesiCiz();
    });
  });
}

// "Tümünü Seç" / "Tümünü Kaldır" — nokta türleri + bina adı etiketleri +
// kaçış okları dahil haritadaki TÜM katmanları tek seferde açıp kapatır.
function haritaKatmanlariTopluAyarla(gorunur) {
  Object.keys(HARITA_TIPLERI).forEach(t => { state.katmanGorunur[t] = gorunur; });
  state.etiketlerGorunur = gorunur;
  state.oklarGorunur = gorunur;
  el('etiketlerGorunurCheck').checked = gorunur;
  el('oklarGorunurCheck').checked = gorunur;
  haritaKatmanListesiCiz();
  haritaIsaretleriCiz();
  haritaEtiketleriCiz();
  haritaOklariCiz();
  haritaListesiCiz();
}

function haritaFiltreSecenekleriCiz() {
  const tesis = aktifTesis();
  const katlar = new Set(tesis ? tesis.katlar : []);
  const bolumler = new Set(tesis ? tesis.bolumler : []);
  const durumlar = new Set();
  state.kayitlar.forEach(r => {
    if (r.kat) katlar.add(r.kat);
    if (r.bolum) bolumler.add(r.bolum);
    if (r.durum) durumlar.add(r.durum);
  });
  _haritaSelectDoldur(el('filtreKat'), katlar, state.filtreler.kat);
  _haritaSelectDoldur(el('filtreBolum'), bolumler, state.filtreler.bolum);
  _haritaSelectDoldur(el('filtreDurum'), durumlar, state.filtreler.durum);
}

function _haritaSelectDoldur(sel, degerler, secili) {
  const ilk = sel.querySelector('option[value=""]');
  sel.innerHTML = '';
  sel.appendChild(ilk || new Option('Tümü', ''));
  Array.from(degerler).sort().forEach(v => sel.appendChild(new Option(v, v)));
  sel.value = secili || '';
}

async function haritaHaritaGorseliniCiz() {
  const tesis = aktifTesis();
  const img = el('haritaGorseli');
  const bos = el('haritaBos');
  if (tesis && tesis.gorselUrl) {
    const url = await fotoBuyukCoz(tesis.gorselUrl);
    img.src = url;
    img.onload = () => {
      el('haritaSahne').style.width = img.naturalWidth + 'px';
      el('haritaSahne').style.height = img.naturalHeight + 'px';
      img.style.width = img.naturalWidth + 'px';
      img.style.height = img.naturalHeight + 'px';
      haritaZoomSifirla();
    };
    bos.classList.add('hidden');
  } else {
    img.removeAttribute('src');
    bos.classList.remove('hidden');
  }
}

function haritaIsaretleriCiz() {
  const sahne = el('haritaSahne');
  sahne.querySelectorAll('.h-nokta').forEach(n => n.remove());
  const tesis = aktifTesis();
  const simgeBoyutu = (tesis && tesis.simgeBoyutu) || 30;
  haritaGorunurKayitlar().forEach(r => {
    const nokta = document.createElement('div');
    nokta.className = 'h-nokta';
    nokta.style.left = r.x + '%';
    nokta.style.top = r.y + '%';
    // Durum artık ayrı bir renkli nokta olarak simgenin önüne eklenmiyor
    // (kullanıcı isteği) — durum bilgisi detay penceresinde ve listede zaten
    // var, harita üzerinde sade tek bir tür ikonu yeterli.
    // Boru köprüsü gibi yükseklik bilgisi olan noktalarda, o değer salt bilgi
    // amaçlı olarak simgenin ÜSTÜNDE küçük bir etiket halinde gösterilir.
    const yukseklikEtiketi = (r.ek && r.ek.yukseklik)
      ? `<span class="h-nokta-yukseklik">${_haritaKacir(r.ek.yukseklik)}m</span>` : '';
    nokta.innerHTML = `${yukseklikEtiketi}<span class="h-nokta-simge" style="font-size:${simgeBoyutu}px;">${haritaIkonAl(r)}</span><span class="h-nokta-kod">${_haritaKacir(r.no)}</span>`;
    nokta.title = `${r.no} — ${r.baslik || haritaTipBilgisi(r.tur).etiket}`;
    nokta.addEventListener('click', e => { e.stopPropagation(); haritaDetayModaliAc(r.id); });
    sahne.appendChild(nokta);
  });
}

// Bina/alan adı gibi sabit metin etiketleri — takip edilen bir kayıt değil,
// bu yüzden ayrı ve sade bir çizim fonksiyonu (nokta simgesi/durum yok,
// tıklanınca doğrudan küçük bir düzenle/sil modalı açılır). Renk ve yön
// (yatay/dikey) her etikette kullanıcının kendi seçtiği değerlerle çizilir.
function haritaEtiketleriCiz() {
  const sahne = el('haritaSahne');
  sahne.querySelectorAll('.h-etiket').forEach(n => n.remove());
  if (!state.etiketlerGorunur) return;
  state.etiketler.forEach(etk => {
    const el2 = document.createElement('div');
    const yonSinifi = etk.yon === 'dikey' ? ' h-etiket-dikey' : (etk.yon === 'alt-alta' ? ' h-etiket-altalta' : '');
    el2.className = 'h-etiket' + yonSinifi;
    el2.style.left = etk.x + '%';
    el2.style.top = etk.y + '%';
    el2.style.background = etk.renk || '#1d4ed8';
    el2.style.fontSize = (etk.boyut || 9) + 'px';
    if (etk.yon === 'alt-alta') {
      el2.innerHTML = etk.metin.split(/\s+/).filter(Boolean).map(kelime => _haritaKacir(kelime)).join('<br>');
    } else {
      el2.textContent = etk.metin;
    }
    el2.title = 'Taşımak için sürükleyin, düzenlemek/silmek için tıklayın';
    el2.addEventListener('mousedown', e => _haritaEtiketSuruklemeBaslat(e, etk, el2));
    sahne.appendChild(el2);
  });
}

// Etiketi tutup sürükleyerek taşıma — tuval'in kendi pan sürüklemesiyle
// karışmasın diye mousedown burada durduruluyor (stopPropagation) ve ayrı
// bir sürükleme durumu izleniyor. Gerçek hareket olmazsa (sadece tıklama)
// düzenle/sil modalı açılır — aynı "sürükleme mi tıklama mı" ayrımı
// haritaTuvalTiklandi'daki gibi küçük bir eşik mesafesiyle yapılıyor.
let _etiketSurukleme = null;

function _haritaEtiketSuruklemeBaslat(e, etk, elemani) {
  if (e.button !== 0) return;
  e.stopPropagation();
  e.preventDefault();
  _etiketSurukleme = { etk, elemani, baslangicX: e.clientX, baslangicY: e.clientY, hareketEtti: false };
}

function _haritaEtiketSuruklemeDevam(e) {
  if (!_etiketSurukleme) return;
  const dx = e.clientX - _etiketSurukleme.baslangicX;
  const dy = e.clientY - _etiketSurukleme.baslangicY;
  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) _etiketSurukleme.hareketEtti = true;
  if (!_etiketSurukleme.hareketEtti) return;
  const sahne = el('haritaSahne');
  const dikdortgen = sahne.getBoundingClientRect();
  const xYuzde = ((e.clientX - dikdortgen.left) / dikdortgen.width) * 100;
  const yYuzde = ((e.clientY - dikdortgen.top) / dikdortgen.height) * 100;
  const x = Math.min(100, Math.max(0, xYuzde)), y = Math.min(100, Math.max(0, yYuzde));
  _etiketSurukleme.yeniX = x;
  _etiketSurukleme.yeniY = y;
  _etiketSurukleme.elemani.style.left = x + '%';
  _etiketSurukleme.elemani.style.top = y + '%';
}

function _haritaEtiketSuruklemeBitir() {
  if (!_etiketSurukleme) return;
  const s = _etiketSurukleme;
  _etiketSurukleme = null;
  if (s.hareketEtti) {
    haritaEtiketGuncelle(s.etk.id, { x: s.yeniX, y: s.yeniY });
    state.etiketler = haritaEtiketleriGetir(state.aktifTesisId);
  } else {
    haritaEtiketDuzenleModaliAc(s.etk);
  }
}

/* ---------- Acil kaçış okları ----------
   Etiketler gibi ayrı, sade bir katman — takip edilen bir kayıt değil.
   SVG overlay ile çiziliyor (viewBox 0 0 100 100, sahne ile aynı yüzde
   koordinat sistemini paylaşıyor — nokta/etiketlerle birebir aynı x/y
   mantığı). Çizim: tuval'de mousedown ile başlar, sürüklerken canlı önizleme
   çizgisi gösterilir, mouseup'ta ok kaydedilip stil/renk modalı açılır. */

function haritaOklariCiz() {
  const svg = el('haritaOklarSvg');
  svg.querySelectorAll('.h-ok-grup').forEach(n => n.remove());
  if (!state.oklarGorunur) return;
  state.oklar.forEach(ok => {
    // Bir nokta/ orta-nokta sürüklenirken canlı önizleme — o ok için
    // kaydedilmiş hali yerine sürüklemedeki geçici hali çizilir.
    const gosterilecek = (_okNoktaSurukleme && _okNoktaSurukleme.ok.id === ok.id) ? _okNoktaSurukleme.canliOk : ok;
    svg.appendChild(_haritaOkElemaniOlustur(gosterilecek));
  });
}

// Oku (birden fazla noktadan geçen kırık çizgiyi) + uç noktalarındaki ve
// segment ortalarındaki sürükleme tutamaçlarını çizer. Orta nokta tutamacı
// sürüklenince o segmente YENİ bir bükülme noktası eklenmiş olur ("kesilmeden
// eğim verme") — çizgi kopmaz, sadece o noktadan bükülür.
function _haritaOkElemaniOlustur(ok) {
  const ns = 'http://www.w3.org/2000/svg';
  const grup = document.createElementNS(ns, 'g');
  grup.setAttribute('class', 'h-ok-grup');
  const noktalar = ok.noktalar;
  const son = noktalar.length - 1;

  const okBasiVarMi = ok.okBasi !== false;
  const sonAcisi = Math.atan2(noktalar[son].y - noktalar[son - 1].y, noktalar[son].x - noktalar[son - 1].x);
  const okBasiUzunluk = Math.max(1.2, ok.kalinlik * 3);

  // Geniş, görünmez vuruş alanı (tıklama/sürüklemeyi kolaylaştırır) — tüm
  // segmentler için tek bir polyline.
  const genisVurusluk = document.createElementNS(ns, 'polyline');
  genisVurusluk.setAttribute('points', noktalar.map(n => `${n.x},${n.y}`).join(' '));
  genisVurusluk.setAttribute('fill', 'none');
  genisVurusluk.setAttribute('stroke', 'transparent');
  genisVurusluk.setAttribute('stroke-width', Math.max(2, ok.kalinlik * 4));
  grup.appendChild(genisVurusluk);

  // Ok başı varsa son segment, üçgenin içinde kalmasın diye biraz geride
  // bitecek şekilde ayrı çizilir; diğer segmentler olduğu gibi.
  const gorunurNoktalar = noktalar.slice(0, son);
  const sonNokta = okBasiVarMi
    ? { x: noktalar[son].x - Math.cos(sonAcisi) * okBasiUzunluk * 0.6, y: noktalar[son].y - Math.sin(sonAcisi) * okBasiUzunluk * 0.6 }
    : noktalar[son];
  gorunurNoktalar.push(sonNokta);

  const cizgi = document.createElementNS(ns, 'polyline');
  cizgi.setAttribute('points', gorunurNoktalar.map(n => `${n.x},${n.y}`).join(' '));
  cizgi.setAttribute('fill', 'none');
  cizgi.setAttribute('stroke', ok.renk);
  cizgi.setAttribute('stroke-width', ok.kalinlik);
  cizgi.setAttribute('stroke-linecap', 'round');
  cizgi.setAttribute('stroke-linejoin', 'round');
  if (ok.stil === 'kesikli') cizgi.setAttribute('stroke-dasharray', (ok.kalinlik * 2.5) + ',' + (ok.kalinlik * 2));
  grup.appendChild(cizgi);

  if (okBasiVarMi) {
    const ucX1 = noktalar[son].x - okBasiUzunluk * Math.cos(sonAcisi - Math.PI / 7);
    const ucY1 = noktalar[son].y - okBasiUzunluk * Math.sin(sonAcisi - Math.PI / 7);
    const ucX2 = noktalar[son].x - okBasiUzunluk * Math.cos(sonAcisi + Math.PI / 7);
    const ucY2 = noktalar[son].y - okBasiUzunluk * Math.sin(sonAcisi + Math.PI / 7);
    const okBasi = document.createElementNS(ns, 'polygon');
    okBasi.setAttribute('points', `${noktalar[son].x},${noktalar[son].y} ${ucX1},${ucY1} ${ucX2},${ucY2}`);
    okBasi.setAttribute('fill', ok.renk);
    grup.appendChild(okBasi);
  }

  grup.addEventListener('click', e => { e.stopPropagation(); haritaOkDuzenleModaliAc(ok); });

  // Uç nokta tutamaçları — sürükleyip o noktayı taşımak için.
  noktalar.forEach((n, i) => {
    const tutamac = document.createElementNS(ns, 'circle');
    tutamac.setAttribute('cx', n.x); tutamac.setAttribute('cy', n.y);
    tutamac.setAttribute('r', Math.max(0.5, ok.kalinlik * 0.9));
    tutamac.setAttribute('class', 'h-ok-tutamac');
    tutamac.addEventListener('mousedown', e => { e.stopPropagation(); _haritaOkNoktaSuruklemeBaslat(e, ok, i, false); });
    grup.appendChild(tutamac);
  });

  // Segment orta-nokta tutamaçları — sürüklenince o segmente yeni bir
  // bükülme noktası ekler (kesilmeden eğim verme).
  for (let i = 0; i < son; i++) {
    const ortaX = (noktalar[i].x + noktalar[i + 1].x) / 2;
    const ortaY = (noktalar[i].y + noktalar[i + 1].y) / 2;
    const ortaTutamac = document.createElementNS(ns, 'circle');
    ortaTutamac.setAttribute('cx', ortaX); ortaTutamac.setAttribute('cy', ortaY);
    ortaTutamac.setAttribute('r', Math.max(0.4, ok.kalinlik * 0.65));
    ortaTutamac.setAttribute('class', 'h-ok-orta-tutamac');
    ortaTutamac.addEventListener('mousedown', e => { e.stopPropagation(); _haritaOkNoktaSuruklemeBaslat(e, ok, i + 1, true); });
    grup.appendChild(ortaTutamac);
  }

  return grup;
}

let _okNoktaSurukleme = null;

function _haritaOkNoktaSuruklemeBaslat(e, ok, index, yeniNoktaMi) {
  if (e.button !== 0) return;
  e.preventDefault();
  const canliOk = Object.assign({}, ok, { noktalar: ok.noktalar.map(n => ({ x: n.x, y: n.y })) });
  if (yeniNoktaMi) {
    const onceki = canliOk.noktalar[index - 1], sonraki = canliOk.noktalar[index];
    canliOk.noktalar.splice(index, 0, { x: (onceki.x + sonraki.x) / 2, y: (onceki.y + sonraki.y) / 2 });
  }
  _okNoktaSurukleme = { ok, canliOk, index };
}

function _haritaOkNoktaSuruklemeDevam(e) {
  if (!_okNoktaSurukleme) return;
  const sahne = el('haritaSahne');
  const dikdortgen = sahne.getBoundingClientRect();
  const x = Math.min(100, Math.max(0, ((e.clientX - dikdortgen.left) / dikdortgen.width) * 100));
  const y = Math.min(100, Math.max(0, ((e.clientY - dikdortgen.top) / dikdortgen.height) * 100));
  _okNoktaSurukleme.canliOk.noktalar[_okNoktaSurukleme.index] = { x, y };
  haritaOklariCiz();
}

function _haritaOkNoktaSuruklemeBitir() {
  if (!_okNoktaSurukleme) return;
  const s = _okNoktaSurukleme;
  _okNoktaSurukleme = null;
  haritaOkGuncelle(s.ok.id, { noktalar: s.canliOk.noktalar });
  state.oklar = haritaOklariGetir(state.aktifTesisId);
  haritaOklariCiz();
}

function haritaOkEklemeModunuAyarla(acik) {
  state.okEklemeModu = acik;
  if (acik) {
    if (state.eklemeModu) haritaEklemeModunuAyarla(false);
    if (state.etiketEklemeModu) haritaEtiketEklemeModunuAyarla(false);
  }
  el('haritaTuval').classList.toggle('h-yerlestiriliyor', acik);
  el('eklemeIpucu').textContent = acik ? 'Okun başlangıç noktasından sürükleyip bitiş noktasında bırakın…' : '';
  el('okEkleBtn').textContent = acik ? '✕ Vazgeç' : '➡️ Kaçış Oku Ekle';
  if (state.sekme !== 'harita') haritaSekmeDegistir('harita');
}

let _okCizimi = null;

function _haritaOkCizimBaslat(e) {
  if (!state.okEklemeModu) return;
  const sahne = el('haritaSahne');
  if (!sahne.offsetWidth) { haritaToast('Önce bu tesis için bir harita görseli yükleyin.', 'danger'); return; }
  const dikdortgen = sahne.getBoundingClientRect();
  const x = Math.min(100, Math.max(0, ((e.clientX - dikdortgen.left) / dikdortgen.width) * 100));
  const y = Math.min(100, Math.max(0, ((e.clientY - dikdortgen.top) / dikdortgen.height) * 100));

  const ns = 'http://www.w3.org/2000/svg';
  const onizlemeCizgi = document.createElementNS(ns, 'line');
  onizlemeCizgi.setAttribute('x1', x); onizlemeCizgi.setAttribute('y1', y);
  onizlemeCizgi.setAttribute('x2', x); onizlemeCizgi.setAttribute('y2', y);
  onizlemeCizgi.setAttribute('stroke', '#39ff14');
  onizlemeCizgi.setAttribute('stroke-width', 0.4);
  onizlemeCizgi.setAttribute('stroke-dasharray', '1,1');
  onizlemeCizgi.setAttribute('id', 'haritaOkOnizleme');
  el('haritaOklarSvg').appendChild(onizlemeCizgi);

  _okCizimi = { x1: x, y1: y, x2: x, y2: y };
}

function _haritaOkCizimDevam(e) {
  if (!_okCizimi) return;
  const sahne = el('haritaSahne');
  const dikdortgen = sahne.getBoundingClientRect();
  const x = Math.min(100, Math.max(0, ((e.clientX - dikdortgen.left) / dikdortgen.width) * 100));
  const y = Math.min(100, Math.max(0, ((e.clientY - dikdortgen.top) / dikdortgen.height) * 100));
  _okCizimi.x2 = x; _okCizimi.y2 = y;
  const onizleme = document.getElementById('haritaOkOnizleme');
  if (onizleme) { onizleme.setAttribute('x2', x); onizleme.setAttribute('y2', y); }
}

async function _haritaOkCizimBitir() {
  if (!_okCizimi) return;
  const s = _okCizimi;
  _okCizimi = null;
  const onizleme = document.getElementById('haritaOkOnizleme');
  if (onizleme) onizleme.remove();
  haritaOkEklemeModunuAyarla(false);

  const uzunluk = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
  if (uzunluk < 2) return; // yanlışlıkla tıklama — çok kısa, ok oluşturulmaz

  const ok = haritaOkEkle({ tesisId: state.aktifTesisId, noktalar: [{ x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }] });
  state.oklar = haritaOklariGetir(state.aktifTesisId);
  haritaOklariCiz();
  haritaOkDuzenleModaliAc(ok);
}

function haritaOkDuzenleModaliAc(ok) {
  haritaModalAc(`
    <div class="h-modalBas"><h3>➡️ Kaçış Oku</h3><button class="h-modalKapatBtn" data-kapat>✕</button></div>
    <div class="h-formIzgara">
      <label>Renk
        <input type="color" id="okRenkAlani" value="${/^#[0-9a-fA-F]{6}$/.test(ok.renk || '') ? ok.renk : '#39ff14'}">
      </label>
      <label>Kalınlık
        <input type="number" id="okKalinlikAlani" min="0.1" max="3" step="0.1" value="${ok.kalinlik || 0.4}">
      </label>
      <label>Stil
        <select id="okStilAlani">
          <option value="duz" ${ok.stil === 'duz' ? 'selected' : ''}>Düz</option>
          <option value="kesikli" ${ok.stil === 'kesikli' ? 'selected' : ''}>Kesikli</option>
        </select>
      </label>
      <label class="h-tam" style="flex-direction:row; align-items:center; gap:8px;">
        <input type="checkbox" id="okBasiAlani" ${ok.okBasi !== false ? 'checked' : ''} style="width:auto;">
        <span>Ok başı (yön ucu) göster — kapatılırsa sadece düz çizgi olur</span>
      </label>
    </div>
    <div class="h-modalAlt">
      <button class="ikincil sil" id="okSilBtn" style="margin-right:auto;">Sil</button>
      <button class="ikincil" data-kapat>Vazgeç</button>
      <button class="birincil" id="okKaydetBtn">Kaydet</button>
    </div>
  `, true);

  document.querySelectorAll('[data-kapat]').forEach(btn => btn.addEventListener('click', haritaModalKapat));
  document.getElementById('okSilBtn').addEventListener('click', () => {
    if (!confirm('Bu ok silinsin mi?')) return;
    haritaOkSil(ok.id);
    state.oklar = haritaOklariGetir(state.aktifTesisId);
    haritaOklariCiz();
    haritaModalKapat();
  });
  document.getElementById('okKaydetBtn').addEventListener('click', () => {
    const renk = document.getElementById('okRenkAlani').value;
    const kalinlik = Number(document.getElementById('okKalinlikAlani').value) || 0.4;
    const stil = document.getElementById('okStilAlani').value;
    const okBasi = document.getElementById('okBasiAlani').checked;
    haritaOkGuncelle(ok.id, { renk, kalinlik, stil, okBasi });
    state.oklar = haritaOklariGetir(state.aktifTesisId);
    haritaOklariCiz();
    haritaModalKapat();
  });
}

function haritaEtiketEklemeModunuAyarla(acik) {
  state.etiketEklemeModu = acik;
  if (acik && state.eklemeModu) haritaEklemeModunuAyarla(false);
  if (acik && state.okEklemeModu) haritaOkEklemeModunuAyarla(false);
  el('haritaTuval').classList.toggle('h-yerlestiriliyor', acik);
  el('eklemeIpucu').textContent = acik ? 'Bina adının yazılacağı noktayı haritada seçin…' : '';
  el('etiketEkleBtn').textContent = acik ? '✕ Vazgeç' : '🏷️ Bina Adı Ekle';
  if (state.sekme !== 'harita') haritaSekmeDegistir('harita');
}

async function haritaEtiketOlustur(x, y) {
  haritaEtiketDuzenleModaliAc(null, { x, y });
}

// etk=null ise yeni etiket (konum bekleyenNoktada), doluysa mevcut etiketin
// düzenlenmesi. Aynı modal her iki durumda da kullanılır.
function haritaEtiketDuzenleModaliAc(etk, yeniKonum) {
  const varsayilan = etk || { metin: '', renk: '#1d4ed8', yon: 'yatay', boyut: 9 };
  // <input type="color"> geçersiz bir değer (undefined, boş, geçersiz format)
  // verilirse tarayıcı sessizce siyaha düşüyor — eski etiketlerde renk alanı
  // hiç olmayabilir, bu yüzden burada da model.js'teki gibi doğrulanıyor.
  const guvenliRenk = /^#[0-9a-fA-F]{6}$/.test(varsayilan.renk || '') ? varsayilan.renk : '#1d4ed8';
  haritaModalAc(`
    <div class="h-modalBas"><h3>🏷️ Bina / Alan Adı</h3><button class="h-modalKapatBtn" data-kapat>✕</button></div>
    <div class="h-formIzgara">
      <label class="h-tam">Metin
        <input type="text" id="etiketMetinAlani" value="${_haritaKacir(varsayilan.metin)}" placeholder="ör. A Binası">
      </label>
      <label>Renk
        <input type="color" id="etiketRenkAlani" value="${guvenliRenk}">
      </label>
      <label>Yön
        <select id="etiketYonAlani">
          <option value="yatay" ${varsayilan.yon === 'yatay' ? 'selected' : ''}>Yatay</option>
          <option value="dikey" ${varsayilan.yon === 'dikey' ? 'selected' : ''}>Dikey (döndürülmüş)</option>
          <option value="alt-alta" ${varsayilan.yon === 'alt-alta' ? 'selected' : ''}>Kelime kelime alt alta</option>
        </select>
      </label>
      <label>Boyut (px)
        <input type="number" id="etiketBoyutAlani" min="6" max="40" value="${varsayilan.boyut || 9}">
      </label>
    </div>
    <div class="h-modalAlt">
      ${etk ? '<button class="ikincil sil" id="etiketSilBtn" style="margin-right:auto;">Sil</button>' : ''}
      <button class="ikincil" data-kapat>Vazgeç</button>
      <button class="birincil" id="etiketKaydetBtn">Kaydet</button>
    </div>
  `, true);

  document.querySelectorAll('[data-kapat]').forEach(btn => btn.addEventListener('click', haritaModalKapat));
  if (etk) {
    document.getElementById('etiketSilBtn').addEventListener('click', () => {
      if (!confirm('Bu etiket silinsin mi?')) return;
      haritaEtiketSil(etk.id);
      state.etiketler = haritaEtiketleriGetir(state.aktifTesisId);
      haritaEtiketleriCiz();
      haritaModalKapat();
    });
  }
  document.getElementById('etiketKaydetBtn').addEventListener('click', () => {
    const metin = document.getElementById('etiketMetinAlani').value.trim();
    if (!metin) { haritaToast('Metin zorunludur.', 'danger'); return; }
    const renk = document.getElementById('etiketRenkAlani').value;
    const yon = document.getElementById('etiketYonAlani').value;
    const boyut = Number(document.getElementById('etiketBoyutAlani').value) || 9;
    if (etk) {
      haritaEtiketGuncelle(etk.id, { metin, renk, yon, boyut });
    } else {
      haritaEtiketEkle({ tesisId: state.aktifTesisId, metin, renk, yon, boyut, x: yeniKonum.x, y: yeniKonum.y });
    }
    state.etiketler = haritaEtiketleriGetir(state.aktifTesisId);
    haritaEtiketleriCiz();
    haritaModalKapat();
  });
}

function haritaListesiCiz() {
  const govde = el('kayitTabloGovde');
  const satirlar = haritaGorunurKayitlar().slice().sort((a, b) => a.no.localeCompare(b.no));
  const bugun = new Date().toISOString().slice(0, 10);
  govde.innerHTML = satirlar.map(r => {
    const t = haritaTipBilgisi(r.tur);
    const sonrakiKontrol = r.ek && r.ek.sonrakiKontrol ? r.ek.sonrakiKontrol : '';
    let sinif = '';
    if (sonrakiKontrol) {
      const gun = Math.round((new Date(sonrakiKontrol) - new Date(bugun)) / 86400000);
      if (gun < 0) sinif = 'h-gecmis'; else if (gun <= 14) sinif = 'h-yaklasiyor';
    }
    return `<tr data-id="${r.id}">
      <td>${t.ikon} ${t.etiket}</td>
      <td><b>${_haritaKacir(r.no)}</b></td>
      <td>${_haritaKacir(r.baslik || '—')}</td>
      <td>${_haritaKacir(r.kat || '—')}</td>
      <td>${_haritaKacir(r.bolum || '—')}</td>
      <td>${haritaDurumNoktasi(r.durum)} ${_haritaKacir(r.durum)}</td>
      <td class="${sinif}">${sonrakiKontrol || '—'}</td>
      <td><button class="tablo-buton" data-ac="${r.id}">Aç</button></td>
    </tr>`;
  }).join('') || `<tr><td colspan="8" style="text-align:center; color:var(--metin-soluk); padding:24px;">Kayıt yok</td></tr>`;
  govde.querySelectorAll('[data-ac]').forEach(b => b.addEventListener('click', () => haritaDetayModaliAc(b.dataset.ac)));
  govde.querySelectorAll('tr[data-id]').forEach(tr => tr.addEventListener('dblclick', () => haritaDetayModaliAc(tr.dataset.id)));
}

/* ---------- Zoom / kaydırma ---------- */

function haritaDonusumUygula() {
  el('haritaSahne').style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
  el('zoomEtiketi').textContent = Math.round(state.zoom * 100) + '%';
}

function haritaZoomSifirla() {
  const tuval = el('haritaTuval');
  state.zoom = 1;
  state.panX = Math.max(0, (tuval.clientWidth - el('haritaSahne').offsetWidth) / 2);
  state.panY = Math.max(0, (tuval.clientHeight - el('haritaSahne').offsetHeight) / 2);
  haritaDonusumUygula();
}

function haritaZoomYap(carpan, cx, cy) {
  const tuval = el('haritaTuval');
  const dikdortgen = tuval.getBoundingClientRect();
  const px = cx != null ? cx - dikdortgen.left : tuval.clientWidth / 2;
  const py = cy != null ? cy - dikdortgen.top : tuval.clientHeight / 2;
  const eskiZoom = state.zoom;
  const yeniZoom = Math.min(6, Math.max(0.15, eskiZoom * carpan));
  const sahneX = (px - state.panX) / eskiZoom;
  const sahneY = (py - state.panY) / eskiZoom;
  state.panX = px - sahneX * yeniZoom;
  state.panY = py - sahneY * yeniZoom;
  state.zoom = yeniZoom;
  haritaDonusumUygula();
}

/* ---------- Nokta ekleme akışı ---------- */

function haritaEklemeModunuAyarla(acik) {
  state.eklemeModu = acik;
  if (acik && state.etiketEklemeModu) haritaEtiketEklemeModunuAyarla(false);
  if (acik && state.okEklemeModu) haritaOkEklemeModunuAyarla(false);
  el('haritaTuval').classList.toggle('h-yerlestiriliyor', acik);
  el('eklemeIpucu').textContent = acik ? 'Haritada bir nokta seçin…' : '';
  el('noktaEkleBtn').classList.toggle('birincil', !acik);
  el('noktaEkleBtn').textContent = acik ? '✕ Vazgeç' : '📍 Nokta Ekle';
  if (state.sekme !== 'harita') haritaSekmeDegistir('harita');
}

function haritaTuvalTiklandi(e) {
  if (state.suruklemeHareketEtti) { state.suruklemeHareketEtti = false; return; }
  if (!_konumSecimBaglami && !state.eklemeModu && !state.etiketEklemeModu) return;
  const sahne = el('haritaSahne');
  if (!sahne.offsetWidth) { haritaToast('Önce bu tesis için bir harita görseli yükleyin.', 'danger'); return; }
  const dikdortgen = sahne.getBoundingClientRect();
  const xYuzde = ((e.clientX - dikdortgen.left) / dikdortgen.width) * 100;
  const yYuzde = ((e.clientY - dikdortgen.top) / dikdortgen.height) * 100;
  const x = Math.min(100, Math.max(0, xYuzde)), y = Math.min(100, Math.max(0, yYuzde));

  if (_konumSecimBaglami) {
    const kaynak = HARITA_DIS_KAYNAKLAR[_konumSecimBaglami.kaynak];
    kaynak.konumGuncelle(_konumSecimBaglami.id, state.aktifTesisId, x, y);
    haritaToast('Konum kaydedildi, yönlendiriliyorsunuz…');
    const donusUrl = _konumSecimBaglami.donus;
    _konumSecimBaglami = null;
    setTimeout(() => { window.location.href = donusUrl; }, 400);
    return;
  }

  if (state.etiketEklemeModu) {
    haritaEtiketEklemeModunuAyarla(false);
    haritaEtiketOlustur(x, y);
    return;
  }

  state.bekleyenNokta = { x, y };
  haritaEklemeModunuAyarla(false);
  haritaTurModaliAc();
}

/* ---------- Modallar ---------- */

function haritaModalKapat() { el('haritaModalKok').classList.add('hidden'); el('haritaModalKok').innerHTML = ''; }

function haritaModalAc(html, genis) {
  const kok = el('haritaModalKok');
  kok.innerHTML = `<div class="h-modalKutu${genis ? ' h-genis' : ''}">${html}</div>`;
  kok.classList.remove('hidden');
  kok.onclick = e => { if (e.target === kok) haritaModalKapat(); };
}

function haritaTurModaliAc() {
  const kartlar = Object.entries(HARITA_TIPLERI).map(([anahtar, t]) => {
    const kaynakAdi = HARITA_TUR_KAYNAK_HARITASI[anahtar];
    const rozet = kaynakAdi ? `<div style="font-size:10px; color:var(--celik-mavi); margin-top:2px;">↗ ${HARITA_DIS_KAYNAKLAR[kaynakAdi].modulAdi}'nda açılır</div>` : '';
    return `<button class="h-turKart" data-tur="${anahtar}">
      <div class="h-ic">${t.ikon}</div>
      <div class="h-lb">${t.etiket}</div>
      ${rozet}
    </button>`;
  }).join('');
  haritaModalAc(`
    <div class="h-modalBas"><h3>Kayıt Türü Seçin</h3><button class="h-modalKapatBtn" data-kapat>✕</button></div>
    <div class="h-turIzgara">${kartlar}</div>
  `, true);
  document.querySelectorAll('[data-kapat]').forEach(btn => btn.addEventListener('click', haritaModalKapat));
  document.querySelectorAll('.h-turKart').forEach(c => {
    c.addEventListener('click', () => {
      const tur = c.dataset.tur;
      const kaynakAdi = HARITA_TUR_KAYNAK_HARITASI[tur];
      if (kaynakAdi) {
        const kaynak = HARITA_DIS_KAYNAKLAR[kaynakAdi];
        window.location.href = kaynak.yeniKayitUrl(state.aktifTesisId, state.bekleyenNokta.x, state.bekleyenNokta.y);
        return;
      }
      haritaKayitFormuAc(tur, null);
    });
  });
}

const HARITA_EK_ALANLAR = {
  uygunsuzluk: [
    { anahtar: 'riskSeviyesi', etiket: 'Risk Seviyesi', tur: 'select', secenekler: HARITA_RISK_SEVIYELERI },
    { anahtar: 'sorumluBolum', etiket: 'Sorumlu Bölüm', tur: 'text' },
    { anahtar: 'sorumluKisi', etiket: 'Sorumlu Kişi', tur: 'text' },
    { anahtar: 'termin', etiket: 'Termin', tur: 'date' }
  ],
  ariza: [
    { anahtar: 'ekipman', etiket: 'Ekipman', tur: 'text' },
    { anahtar: 'arizaSeviyesi', etiket: 'Arıza Seviyesi', tur: 'select', secenekler: HARITA_RISK_SEVIYELERI },
    { anahtar: 'bakimEkibi', etiket: 'Sorumlu Bakım Ekibi', tur: 'text' },
    { anahtar: 'termin', etiket: 'Termin', tur: 'date' }
  ],
  risk: [
    { anahtar: 'riskKategorisi', etiket: 'Risk Kategorisi', tur: 'text' },
    { anahtar: 'riskSeviyesi', etiket: 'Risk Seviyesi', tur: 'select', secenekler: HARITA_RISK_SEVIYELERI },
    { anahtar: 'onerilenOnlem', etiket: 'Önerilen Önlem', tur: 'textarea', tam: true }
  ],
  yangin: [
    { anahtar: 'tip', etiket: 'Tip (örn. ABC Kuru Kimyevi Toz)', tur: 'text' },
    { anahtar: 'kapasite', etiket: 'Kapasite', tur: 'text' },
    { anahtar: 'sonKontrol', etiket: 'Son Kontrol', tur: 'date' },
    { anahtar: 'sonrakiKontrol', etiket: 'Sonraki Kontrol', tur: 'date' }
  ],
  acil_ekipman: [
    { anahtar: 'sonKontrol', etiket: 'Son Kontrol', tur: 'date' },
    { anahtar: 'sonrakiKontrol', etiket: 'Sonraki Kontrol', tur: 'date' }
  ],
  kkd: [
    { anahtar: 'stokAdedi', etiket: 'Stok Adedi', tur: 'number' }
  ],
  cikis: [
    { anahtar: 'kapasiteNotu', etiket: 'Kapasite / Not', tur: 'text' }
  ],
  toplanma: [
    { anahtar: 'kapasite', etiket: 'Kapasite (Kişi)', tur: 'number' },
    { anahtar: 'sorumlu', etiket: 'Sorumlu', tur: 'text' }
  ],
  fotograf: [],
  ekipman: [
    { anahtar: 'ekipmanTuru', etiket: 'Ekipman Türü (Pompa, Kompresör, Tank...)', tur: 'text' },
    { anahtar: 'ekipmanKodu', etiket: 'Ekipman Kodu', tur: 'text' }
  ],
  boru_koprusu: [
    { anahtar: 'yukseklik', etiket: 'Yükseklik (m)', tur: 'number' }
  ],
  diger: []
};

function _haritaAlanHtml(f, deger) {
  const v = _haritaKacir(deger ?? '');
  const sarmala = ic => `<label class="${f.tam ? 'h-tam' : ''}">${f.etiket}${ic}</label>`;
  if (f.tur === 'select') {
    const secenekler = f.secenekler.map(o => `<option value="${o}" ${o === deger ? 'selected' : ''}>${o}</option>`).join('');
    return sarmala(`<select data-alan="${f.anahtar}"><option value="">—</option>${secenekler}</select>`);
  }
  if (f.tur === 'textarea') return sarmala(`<textarea data-alan="${f.anahtar}">${v}</textarea>`);
  return sarmala(`<input type="${f.tur}" data-alan="${f.anahtar}" value="${v}"/>`);
}

function haritaKayitFormuAc(tur, mevcutKayit) {
  const t = haritaTipBilgisi(tur);
  const tesis = aktifTesis();
  const r = mevcutKayit;
  _duzenlenenKayitId = r ? r.id : null;
  _haritaKayitFotograflari = r && Array.isArray(r.fotograflar) ? r.fotograflar.slice(0, 3) : [];

  const altTurSecenekleri = t.altTipler
    ? `<label>Ekipman Türü
        <select data-alan="altTur" id="fAltTur">
          <option value="">Seçin…</option>
          ${Object.entries(t.altTipler).map(([k, s]) => `<option value="${k}" ${r && r.altTur === k ? 'selected' : ''}>${s.etiket}</option>`).join('')}
        </select>
      </label>` : '';
  const bolumSecenek = (tesis.bolumler || []).map(d => `<option value="${_haritaKacir(d)}">${_haritaKacir(d)}</option>`).join('');
  const ek = (r && r.ek) || {};
  const ekHtml = (HARITA_EK_ALANLAR[tur] || []).map(f => _haritaAlanHtml(f, ek[f.anahtar])).join('');

  haritaModalAc(`
    <div class="h-modalBas"><h3>${t.ikon} ${t.etiket}${r ? ' — Düzenle' : ' — Yeni Kayıt'}</h3><button class="h-modalKapatBtn" data-kapat>✕</button></div>
    <div class="h-formIzgara">
      ${altTurSecenekleri}
      <label class="h-tam">Başlık
        <input type="text" id="fBaslik" value="${_haritaKacir(r ? r.baslik : t.etiket)}" placeholder="${t.etiket}" />
      </label>
      <label>Bölüm
        <input list="bolumListesi" id="fBolum" value="${_haritaKacir(r ? r.bolum : '')}"/>
        <datalist id="bolumListesi">${bolumSecenek}</datalist>
      </label>
      <label>Durum
        <select id="fDurum">${t.durumlar.map(s => `<option value="${s}" ${(r ? r.durum : t.varsayilanDurum) === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
      </label>
      <label class="h-tam">Açıklama
        <textarea id="fAciklama">${_haritaKacir(r ? r.aciklama : '')}</textarea>
      </label>
      ${ekHtml}
      <label class="h-tam">Fotoğraf
        <input type="file" id="fFoto" accept="image/png,image/jpeg,image/webp">
        <div id="kayitFotoOnizleme" style="margin-top:6px;"></div>
      </label>
    </div>
    <div class="h-modalAlt">
      <button class="ikincil" data-kapat>Vazgeç</button>
      <button class="birincil" id="fKaydet">Kaydet</button>
    </div>
  `, true);

  document.querySelectorAll('[data-kapat]').forEach(btn => btn.addEventListener('click', haritaModalKapat));
  _haritaKayitFotoOnizlemeCiz();
  el('fFoto').addEventListener('change', async e => {
    const dosya = e.target.files[0];
    e.target.value = '';
    if (!dosya) return;
    if (_haritaKayitFotograflari.length >= 3) { haritaToast('Bu kayda zaten 3 fotoğraf eklenmiş.', 'danger'); return; }
    try {
      const sonuc = await fotoYukle(dosya, 'harita/' + (_duzenlenenKayitId || 'gecici'));
      _haritaKayitFotograflari.push({ url: sonuc.url });
      _haritaKayitFotoOnizlemeCiz();
    } catch (hata) {
      haritaToast(hata.message || 'Fotoğraf yüklenemedi.', 'danger');
    }
  });
  el('fKaydet').addEventListener('click', () => haritaKayitFormuGonder(tur, r));
}

function _haritaKayitFotoOnizlemeCiz() {
  const kutu = el('kayitFotoOnizleme');
  kutu.innerHTML = _haritaKayitFotograflari.map((f, i) => `
    <div style="display:inline-flex; flex-direction:column; align-items:center; gap:4px; margin:0 10px 10px 0;">
      <img data-foto-ref="${f.url}" style="width:64px; height:64px; object-fit:cover; border-radius:8px; border:1px solid var(--kenarlik);">
      <button type="button" data-foto-kaldir="${i}" class="tablo-buton sil">Kaldır</button>
    </div>
  `).join('') + (_haritaKayitFotograflari.length ? '' : '<div style="font-size:12px; color:var(--metin-soluk);">Henüz fotoğraf eklenmedi.</div>')
    + (_haritaKayitFotograflari.length >= 3 ? '<div style="font-size:12px; color:var(--metin-soluk);">En fazla 3 fotoğraf eklenebilir.</div>' : '');
  kutu.querySelectorAll('[data-foto-kaldir]').forEach(btn => {
    btn.addEventListener('click', () => {
      _haritaKayitFotograflari.splice(Number(btn.getAttribute('data-foto-kaldir')), 1);
      _haritaKayitFotoOnizlemeCiz();
    });
  });
  fotoReferanslariCoz(kutu);
}

async function haritaKayitFormuGonder(tur, mevcutKayit) {
  const t = haritaTipBilgisi(tur);
  const baslik = el('fBaslik').value.trim();
  if (!baslik) { haritaToast('Başlık zorunludur.', 'danger'); return; }
  if (t.altTipler) {
    const altEl = el('fAltTur');
    if (altEl && !altEl.value) { haritaToast('Ekipman türü seçin.', 'danger'); return; }
  }
  const ek = {};
  (HARITA_EK_ALANLAR[tur] || []).forEach(f => {
    const node = qs(`[data-alan="${f.anahtar}"]`);
    if (node) ek[f.anahtar] = node.value.trim();
  });

  const veriler = {
    tesisId: state.aktifTesisId,
    tur,
    altTur: t.altTipler ? qs('[data-alan="altTur"]').value : '',
    baslik,
    aciklama: el('fAciklama').value.trim(),
    // Kat artık formda sorulmuyor (kullanıcı isteği) — ama mevcut bir
    // kayıtta zaten dolu bir kat değeri varsa (ör. eski veri) sessizce
    // silinmesin diye korunuyor.
    kat: mevcutKayit ? mevcutKayit.kat : '',
    bolum: el('fBolum').value.trim(),
    durum: el('fDurum').value,
    x: mevcutKayit ? mevcutKayit.x : state.bekleyenNokta.x,
    y: mevcutKayit ? mevcutKayit.y : state.bekleyenNokta.y,
    fotograflar: _haritaKayitFotograflari,
    ek: Object.assign({}, mevcutKayit ? mevcutKayit.ek : {}, ek)
  };

  const kayit = mevcutKayit ? haritaKayitGuncelle(mevcutKayit.id, veriler) : haritaKayitEkle(veriler);
  state.tesisler = haritaTesisleriGetir();
  haritaKayitlariYukle(state.aktifTesisId);
  haritaModalKapat();
  await haritaHepsiniCiz();
  haritaToast((mevcutKayit ? 'Kayıt güncellendi: ' : 'Kayıt oluşturuldu: ') + kayit.no);
  haritaDetayModaliAc(kayit.id);
}

// Dış kaynaklı (uygunsuzluk/risk/acil-durum ekipman) bir noktanın detayı —
// harita üzerinden düzenlenip silinmez, sadece görüntülenir; gerçek
// düzenleme kaynak modülün kendisinde yapılır.
function haritaDisKaynakDetayAc(r) {
  const t = haritaTipBilgisi(r.tur);
  const kaynak = HARITA_DIS_KAYNAKLAR[r.kaynak];
  const ekGirdileri = Object.entries(r.ek || {}).filter(([, v]) => v);
  const ekHtml = ekGirdileri.length
    ? `<div class="h-detayMeta">${ekGirdileri.map(([k, v]) => `<div><span>${k}</span>${_haritaKacir(v)}</div>`).join('')}</div>`
    : '';

  haritaModalAc(`
    <div class="h-modalBas"><h3>${t.ikon} ${_haritaKacir(r.baslik || t.etiket)}</h3><button class="h-modalKapatBtn" data-kapat>✕</button></div>
    <div class="h-detayBas">
      <span class="h-no">${_haritaKacir(r.no || '')}</span>
      <span class="h-durumRozet">${haritaDurumNoktasi(r.durum)} ${_haritaKacir(r.durum)}</span>
    </div>
    <div style="color:var(--metin-soluk); margin:6px 0; font-size:13px;">${_haritaKacir(r.aciklama || '—')}</div>
    <div class="h-detayMeta">
      <div><span>Bölüm</span>${_haritaKacir(r.bolum || '—')}</div>
    </div>
    ${ekHtml}
    <div style="font-size:12px; color:var(--metin-soluk); margin:10px 0;">Bu kayıt ${kaynak.modulAdi} modülünden geliyor — düzenlemek için o modülü açın.</div>
    <div class="h-eylemSatiri">
      <button class="birincil" id="disKaynakAcBtn" style="width:auto;">${kaynak.modulAdi}'nda Aç</button>
    </div>
  `, true);

  document.querySelectorAll('[data-kapat]').forEach(btn => btn.addEventListener('click', haritaModalKapat));
  document.getElementById('disKaynakAcBtn').addEventListener('click', () => {
    window.location.href = kaynak.acUrl(r.kaynakId);
  });
}

async function haritaDetayModaliAc(id) {
  const r = state.kayitlar.find(x => x.id === id);
  if (!r) return;
  if (r.kaynak) { haritaDisKaynakDetayAc(r); return; }
  const t = haritaTipBilgisi(r.tur);
  const alt = haritaAltTipBilgisi(r.tur, r.altTur);
  const fotoHtml = r.fotograflar.length
    ? `<div class="h-fotoSatir">${r.fotograflar.map(p => `<img data-foto-ref="${p.url}"/>`).join('')}</div>`
    : `<div style="color:var(--metin-soluk); font-size:12px;">Fotoğraf yok</div>`;

  const ekipmanMi = ['yangin', 'acil_ekipman', 'kkd', 'cikis'].includes(r.tur);
  const gecmisHtml = ekipmanMi
    ? `<div class="panel-baslik" style="margin-top:10px;">Kontrol Geçmişi</div>
       <div class="h-gecmisListe">${
         r.kontrolGecmisi.length
           ? r.kontrolGecmisi.slice().reverse().map(h => `<div class="h-satir"><span>${h.tarih} — ${_haritaKacir(h.sonuc)}</span><span>${_haritaKacir(h.not || '')}</span></div>`).join('')
           : `<div style="color:var(--metin-soluk);">Kayıt yok</div>`
       }</div>
       <button class="tablo-buton" id="kontrolEkleBtn">+ Kontrol Ekle</button>`
    : '';

  const ekGirdileri = Object.entries(r.ek || {}).filter(([, v]) => v);
  const ekHtml = ekGirdileri.length
    ? `<div class="h-detayMeta">${ekGirdileri.map(([k, v]) => `<div><span>${k}</span>${_haritaKacir(v)}</div>`).join('')}</div>`
    : '';

  let eylemler = `<button class="tablo-buton" id="duzenleBtn">Düzenle</button>
    <button class="tablo-buton sil" id="silBtn">Sil</button>`;
  if (r.tur === 'risk' && r.durum !== 'Dönüştürüldü') {
    eylemler += `<button class="birincil" id="cevirBtn" style="width:auto;">Uygunsuzluğa Dönüştür</button>`;
  }
  if (r.tur === 'ariza') {
    if (!r.bagliKayitId) {
      eylemler += `<button class="birincil" id="bakimGoreviBtn" style="width:auto;">Bakım Görevi Oluştur</button>`;
    } else if (r.ek.bakimDurumu !== 'Tamamlandı') {
      eylemler += `<button class="tablo-buton" id="bakimTamamBtn">Bakımı Tamamlandı İşaretle</button>`;
    }
  }

  haritaModalAc(`
    <div class="h-modalBas">
      <h3>${t.ikon} ${alt ? alt.etiket : t.etiket}</h3>
      <button class="h-modalKapatBtn" data-kapat>✕</button>
    </div>
    <div class="h-detayBas">
      <span class="h-no">${r.no}</span>
      <span class="h-durumRozet">${haritaDurumNoktasi(r.durum)} ${_haritaKacir(r.durum)}</span>
    </div>
    <div><b>${_haritaKacir(r.baslik || '—')}</b></div>
    <div style="color:var(--metin-soluk); margin:6px 0; font-size:13px;">${_haritaKacir(r.aciklama || '—')}</div>
    <div class="h-detayMeta">
      <div><span>Kat</span>${_haritaKacir(r.kat || '—')}</div>
      <div><span>Bölüm</span>${_haritaKacir(r.bolum || '—')}</div>
      <div><span>Oluşturma</span>${(r.olusturmaTarihi || '').slice(0, 10)}</div>
      <div><span>Güncelleme</span>${(r.guncellemeTarihi || '').slice(0, 10)}</div>
    </div>
    ${ekHtml}
    ${fotoHtml}
    ${gecmisHtml}
    <div class="h-eylemSatiri">${eylemler}</div>
  `, true);

  document.querySelectorAll('[data-kapat]').forEach(btn => btn.addEventListener('click', haritaModalKapat));
  el('duzenleBtn')?.addEventListener('click', () => haritaKayitFormuAc(r.tur, r));
  el('silBtn')?.addEventListener('click', () => haritaKayitSilOnayla(r.id));
  el('cevirBtn')?.addEventListener('click', () => haritaRiskiCevir(r));
  el('bakimGoreviBtn')?.addEventListener('click', () => haritaBakimGoreviOlustur(r));
  el('bakimTamamBtn')?.addEventListener('click', () => haritaBakimiTamamla(r));
  el('kontrolEkleBtn')?.addEventListener('click', () => haritaKontrolGirdisiEkle(r));
  await fotoReferanslariCoz(el('haritaModalKok'));
}

async function haritaKayitSilOnayla(id) {
  if (!confirm('Bu kayıt silinsin mi?')) return;
  haritaKayitSil(id);
  haritaKayitlariYukle(state.aktifTesisId);
  haritaModalKapat();
  await haritaHepsiniCiz();
  haritaToast('Kayıt silindi.');
}

async function haritaRiskiCevir(risk) {
  const uygunsuzluk = haritaRiskiUygunsuzlugaCevir(risk.id);
  haritaKayitlariYukle(state.aktifTesisId);
  await haritaHepsiniCiz();
  haritaToast(`${risk.no} → ${uygunsuzluk.no} olarak Uygunsuzluğa dönüştürüldü.`);
  haritaDetayModaliAc(uygunsuzluk.id);
}

async function haritaBakimGoreviOlustur(ariza) {
  const gorev = haritaArizaIcinBakimGorevi(ariza.id);
  haritaKayitlariYukle(state.aktifTesisId);
  await haritaHepsiniCiz();
  haritaToast(`${ariza.no} için ${gorev.kod} bakım görevi oluşturuldu.`);
  haritaDetayModaliAc(ariza.id);
}

async function haritaBakimiTamamla(ariza) {
  haritaBakimTamamlandi(ariza.id);
  haritaKayitlariYukle(state.aktifTesisId);
  await haritaHepsiniCiz();
  haritaToast(`${ariza.no} bakımı tamamlandı olarak işaretlendi.`);
  haritaDetayModaliAc(ariza.id);
}

async function haritaKontrolGirdisiEkle(r) {
  const sonuc = prompt('Kontrol sonucu: Uygun / Uygun Değil', 'Uygun');
  if (sonuc === null) return;
  const not = prompt('Not (opsiyonel):', '') || '';
  const sonrakiKontrol = prompt('Sonraki kontrol tarihi (YYYY-AA-GG, opsiyonel):', (r.ek && r.ek.sonrakiKontrol) || '') || '';
  haritaKontrolEkle(r.id, sonuc.trim() || 'Uygun', not.trim(), sonrakiKontrol.trim());
  haritaKayitlariYukle(state.aktifTesisId);
  await haritaHepsiniCiz();
  haritaDetayModaliAc(r.id);
}

/* ---------- Tesisler ---------- */

async function haritaTesisSilUi() {
  if (state.tesisler.length <= 1) return;
  const tesis = aktifTesis();
  if (!tesis) return;
  if (!confirm(`"${tesis.ad}" tesisini silmek istediğinize emin misiniz? Bu tesisin haritadaki yerel noktaları da silinir (uygunsuzluk/risk/acil durum kayıtları kendi modüllerinde kalır, sadece harita konum bağlantısı kopar).`)) return;
  haritaTesisSil(tesis.id);
  state.tesisler = haritaTesisleriGetir();
  state.aktifTesisId = state.tesisler[0].id;
  haritaTesisSelectiCiz();
  haritaKayitlariYukle(state.aktifTesisId);
  await haritaHepsiniCiz();
  haritaToast('Tesis silindi: ' + tesis.ad);
}

async function haritaTesisEkleUi() {
  const ad = prompt('Yeni tesis adı:', 'Yeni Tesis');
  if (!ad) return;
  const tesis = haritaTesisEkle(ad.trim());
  state.tesisler.push(tesis);
  state.aktifTesisId = tesis.id;
  haritaTesisSelectiCiz();
  haritaKayitlariYukle(tesis.id);
  await haritaHepsiniCiz();
  haritaToast('Tesis eklendi: ' + tesis.ad);
}

async function haritaTesisGorseliYukle(dosya) {
  const tesis = aktifTesis();
  if (!tesis || !dosya) return;
  try {
    const sonuc = await fotoYukle(dosya, 'harita/tesis/' + tesis.id, 2000, 0.82);
    haritaTesisGorseliGuncelle(tesis.id, sonuc.url);
    state.tesisler = haritaTesisleriGetir();
    el('haritaGorseli').src = sonuc.onizlemeUrl;
    el('haritaBos').classList.add('hidden');
    haritaToast('Tesis görseli yüklendi.');
  } catch (hata) {
    haritaToast(hata.message || 'Görsel yüklenemedi.', 'danger');
  }
}

/* ---------- Hızlı arama çipleri ---------- */

const HARITA_HIZLI_CIPLER = [
  { etiket: 'Göz duşları', ayarla: { tur: 'acil_ekipman', altTur: 'goz_dusu' } },
  { etiket: 'Yangın tüpleri', ayarla: { tur: 'yangin', altTur: 'tup' } },
  { etiket: 'Açık uygunsuzluklar', ayarla: { tur: 'uygunsuzluk', durum: 'Açık' } },
  { etiket: 'Kapatılan uygunsuzluklar', ayarla: { tur: 'uygunsuzluk', durum: 'Kapalı' } },
  { etiket: 'Arızalı ekipmanlar', ayarla: { durum: 'Arızalı' } },
  { etiket: 'Aktif riskler', ayarla: { tur: 'risk', durum: 'Aktif' } }
];

function haritaHizliCipleriCiz() {
  el('hizliCipler').innerHTML = HARITA_HIZLI_CIPLER.map((c, i) => `<button class="h-cip" data-cip="${i}">${c.etiket}</button>`).join('');
  el('hizliCipler').querySelectorAll('[data-cip]').forEach(b => {
    b.addEventListener('click', () => {
      const cfg = HARITA_HIZLI_CIPLER[Number(b.dataset.cip)].ayarla;
      Object.keys(HARITA_TIPLERI).forEach(t => { state.katmanGorunur[t] = cfg.tur ? t === cfg.tur : true; });
      state.filtreler.durum = cfg.durum || '';
      el('filtreDurum').value = state.filtreler.durum;
      haritaKatmanListesiCiz();
      haritaIsaretleriCiz();
      haritaListesiCiz();
    });
  });
}

/* ---------- JPEG dışa aktarma ---------- */
// O an ekranda görünen katmanlar neyse (Katmanlar panelindeki açık/kapalı
// durum, aktif filtreler, Bina Adı Etiketleri ve Kaçış Okları görünürlük
// anahtarları) tam olarak onlar tek bir JPEG'e düzleştirilir. Noktalar/
// etiketler/oklar DOM/SVG üzerinde ayrı katmanlar olduğu için, dışa
// aktarımda hepsi aynı <canvas> üzerine görsel + üstüne çizilerek
// birleştiriliyor (görselin kendisi taban, oklar ortada, nokta/etiketler
// en üstte — ekrandaki katman sırasıyla aynı).
function _haritaYuvarlakDikdortgenCiz(ctx, x, y, genislik, yukseklik, yaricap) {
  ctx.beginPath();
  ctx.moveTo(x + yaricap, y);
  ctx.arcTo(x + genislik, y, x + genislik, y + yukseklik, yaricap);
  ctx.arcTo(x + genislik, y + yukseklik, x, y + yukseklik, yaricap);
  ctx.arcTo(x, y + yukseklik, x, y, yaricap);
  ctx.arcTo(x, y, x + genislik, y, yaricap);
  ctx.closePath();
}

async function haritaJpegIndir() {
  const tesis = aktifTesis();
  if (!tesis || !tesis.gorselUrl) { haritaToast('Bu tesis için harita görseli yok.', 'danger'); return; }

  const kaynakUrl = await fotoBuyukCoz(tesis.gorselUrl);
  const img = new Image();
  img.crossOrigin = 'anonymous';
  const yuklendi = new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = () => reject(new Error('Görsel yüklenemedi.'));
  });
  img.src = kaynakUrl;
  try { await yuklendi; } catch (e) { haritaToast(e.message, 'danger'); return; }

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  try {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  } catch (e) {
    haritaToast('Görsel çiziminde sorun oluştu, indirme iptal edildi.', 'danger');
    return;
  }

  const pxX = yuzde => (yuzde / 100) * canvas.width;
  const pxY = yuzde => (yuzde / 100) * canvas.height;

  // 1) Oklar — en altta (nokta/etiketler üstüne biner). Birden fazla
  // noktadan geçen kırık çizgi (bükülmüş ok) olarak çizilir.
  if (state.oklarGorunur) {
    state.oklar.forEach(ok => {
      const noktalarPx = ok.noktalar.map(n => ({ x: pxX(n.x), y: pxY(n.y) }));
      const son = noktalarPx.length - 1;
      const kalinlikPx = Math.max(1, (ok.kalinlik / 100) * canvas.width);
      const okBasiVarMi = ok.okBasi !== false;
      const sonAcisi = Math.atan2(noktalarPx[son].y - noktalarPx[son - 1].y, noktalarPx[son].x - noktalarPx[son - 1].x);
      const okBasiUzunluk = Math.max(kalinlikPx * 3, canvas.width * 0.012);
      const sonNokta = okBasiVarMi
        ? { x: noktalarPx[son].x - Math.cos(sonAcisi) * okBasiUzunluk * 0.6, y: noktalarPx[son].y - Math.sin(sonAcisi) * okBasiUzunluk * 0.6 }
        : noktalarPx[son];

      ctx.strokeStyle = ok.renk;
      ctx.fillStyle = ok.renk;
      ctx.lineWidth = kalinlikPx;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash(ok.stil === 'kesikli' ? [kalinlikPx * 2.5, kalinlikPx * 2] : []);
      ctx.beginPath();
      ctx.moveTo(noktalarPx[0].x, noktalarPx[0].y);
      for (let i = 1; i < son; i++) ctx.lineTo(noktalarPx[i].x, noktalarPx[i].y);
      ctx.lineTo(sonNokta.x, sonNokta.y);
      ctx.stroke();
      ctx.setLineDash([]);

      if (okBasiVarMi) {
        const ucX1 = noktalarPx[son].x - okBasiUzunluk * Math.cos(sonAcisi - Math.PI / 7);
        const ucY1 = noktalarPx[son].y - okBasiUzunluk * Math.sin(sonAcisi - Math.PI / 7);
        const ucX2 = noktalarPx[son].x - okBasiUzunluk * Math.cos(sonAcisi + Math.PI / 7);
        const ucY2 = noktalarPx[son].y - okBasiUzunluk * Math.sin(sonAcisi + Math.PI / 7);
        ctx.beginPath();
        ctx.moveTo(noktalarPx[son].x, noktalarPx[son].y); ctx.lineTo(ucX1, ucY1); ctx.lineTo(ucX2, ucY2);
        ctx.closePath();
        ctx.fill();
      }
    });
  }

  // 2) Nokta kayıtları — mevcut katman/filtre görünürlüğüne göre (harita
  // ekranındaki checkbox/filtre durumu neyse dışa aktarımda da o geçerli)
  const simgeFontPx = (tesis.simgeBoyutu) || 30;
  haritaGorunurKayitlar().forEach(r => {
    const x = pxX(r.x), y = pxY(r.y);
    const simge = haritaIkonAl(r);
    ctx.font = simgeFontPx + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(simge, x, y);

    const kod = r.no || '';
    if (kod) {
      const kodFontPx = Math.max(9, simgeFontPx * 0.4);
      ctx.font = 'bold ' + kodFontPx + 'px sans-serif';
      const genislik = ctx.measureText(kod).width + kodFontPx * 1.2;
      const yukseklik = kodFontPx * 1.6;
      const kutuY = y + kodFontPx * 0.35;
      ctx.fillStyle = 'rgba(17,24,39,0.87)';
      _haritaYuvarlakDikdortgenCiz(ctx, x - genislik / 2, kutuY, genislik, yukseklik, kodFontPx * 0.3);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textBaseline = 'middle';
      ctx.fillText(kod, x, kutuY + yukseklik / 2);
    }
  });

  // 3) Bina adı etiketleri — en üstte
  if (state.etiketlerGorunur) {
    state.etiketler.forEach(etk => {
      const x = pxX(etk.x), y = pxY(etk.y);
      const fontPx = etk.boyut || 9;
      ctx.font = 'bold ' + fontPx + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const satirlar = etk.yon === 'alt-alta' ? etk.metin.split(/\s+/).filter(Boolean) : [etk.metin];
      const satirYuksekligi = fontPx * 1.5;
      const genislikler = satirlar.map(s => ctx.measureText(s).width);
      const kutuGenislik = Math.max(...genislikler) + fontPx * 1.2;
      const kutuYukseklik = satirlar.length * satirYuksekligi + fontPx * 0.4;
      ctx.save();
      ctx.translate(x, y);
      if (etk.yon === 'dikey') ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = etk.renk || '#1d4ed8';
      _haritaYuvarlakDikdortgenCiz(ctx, -kutuGenislik / 2, -kutuYukseklik / 2, kutuGenislik, kutuYukseklik, Math.min(4, fontPx * 0.3));
      ctx.fill();
      ctx.fillStyle = '#fff';
      satirlar.forEach((satir, i) => {
        const satirY = -kutuYukseklik / 2 + fontPx * 0.2 + satirYuksekligi * i + satirYuksekligi / 2;
        ctx.fillText(satir, 0, satirY);
      });
      ctx.restore();
    });
  }

  let veriUrl;
  try {
    veriUrl = canvas.toDataURL('image/jpeg', 0.92);
  } catch (e) {
    haritaToast('JPEG oluşturulamadı (görsel farklı bir kaynaktan güvenlik kısıtlamasıyla geliyor olabilir).', 'danger');
    return;
  }

  const a = document.createElement('a');
  a.href = veriUrl;
  const guvenliAd = (tesis.ad || 'harita').replace(/[^a-zA-Z0-9ığüşöçİĞÜŞÖÇ_-]+/g, '_');
  a.download = `${guvenliAd}_harita.jpg`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  haritaToast('JPEG indirildi.');
}

/* ---------- Olaylar ---------- */

function haritaOlaylariBagla() {
  el('tesisSelect').addEventListener('change', async e => {
    state.aktifTesisId = e.target.value;
    state.filtreler = { kat: '', bolum: '', durum: '', arama: '' };
    el('haritaAramaKutusu').value = '';
    haritaKayitlariYukle(state.aktifTesisId);
    await haritaHepsiniCiz();
  });

  el('tesisEkleBtn').addEventListener('click', haritaTesisEkleUi);
  el('tesisSilBtn').addEventListener('click', haritaTesisSilUi);

  el('tesisGorselDosya').addEventListener('change', e => {
    const f = e.target.files[0];
    e.target.value = '';
    if (f) haritaTesisGorseliYukle(f);
  });
  el('tesisGorselBtn').addEventListener('click', () => el('tesisGorselDosya').click());
  el('haritaBosGorselBtn').addEventListener('click', () => el('tesisGorselDosya').click());

  el('noktaEkleBtn').addEventListener('click', () => haritaEklemeModunuAyarla(!state.eklemeModu));
  el('etiketEkleBtn').addEventListener('click', () => haritaEtiketEklemeModunuAyarla(!state.etiketEklemeModu));
  el('etiketlerGorunurCheck').addEventListener('change', e => {
    state.etiketlerGorunur = e.target.checked;
    haritaEtiketleriCiz();
  });
  el('okEkleBtn').addEventListener('click', () => haritaOkEklemeModunuAyarla(!state.okEklemeModu));
  el('oklarGorunurCheck').addEventListener('change', e => {
    state.oklarGorunur = e.target.checked;
    haritaOklariCiz();
  });
  el('jpegIndirBtn').addEventListener('click', haritaJpegIndir);
  el('katmanlarTumunuSecBtn').addEventListener('click', () => haritaKatmanlariTopluAyarla(true));
  el('katmanlarTumunuKaldirBtn').addEventListener('click', () => haritaKatmanlariTopluAyarla(false));
  el('simgeBoyutuAlani').addEventListener('input', e => {
    const boyut = Number(e.target.value) || 30;
    el('simgeBoyutuDeger').textContent = boyut;
    haritaTesisGuncelleRepo(state.aktifTesisId, { simgeBoyutu: boyut });
    state.tesisler = haritaTesisleriGetir();
    haritaIsaretleriCiz();
  });

  el('haritaAramaKutusu').addEventListener('input', e => {
    state.filtreler.arama = e.target.value;
    haritaIsaretleriCiz();
    haritaListesiCiz();
  });

  el('filtreKat').addEventListener('change', e => { state.filtreler.kat = e.target.value; haritaIsaretleriCiz(); haritaListesiCiz(); });
  el('filtreBolum').addEventListener('change', e => { state.filtreler.bolum = e.target.value; haritaIsaretleriCiz(); haritaListesiCiz(); });
  el('filtreDurum').addEventListener('change', e => { state.filtreler.durum = e.target.value; haritaIsaretleriCiz(); haritaListesiCiz(); });
  el('filtreTemizleBtn').addEventListener('click', () => {
    state.filtreler = { kat: '', bolum: '', durum: '', arama: '' };
    el('filtreKat').value = ''; el('filtreBolum').value = ''; el('filtreDurum').value = ''; el('haritaAramaKutusu').value = '';
    Object.keys(HARITA_TIPLERI).forEach(t => { state.katmanGorunur[t] = true; });
    haritaKatmanListesiCiz(); haritaIsaretleriCiz(); haritaListesiCiz();
  });

  el('sekmeHaritaBtn').addEventListener('click', () => haritaSekmeDegistir('harita'));
  el('sekmeListeBtn').addEventListener('click', () => haritaSekmeDegistir('liste'));

  const tuval = el('haritaTuval');
  tuval.addEventListener('click', haritaTuvalTiklandi);
  tuval.addEventListener('wheel', e => { e.preventDefault(); haritaZoomYap(e.deltaY < 0 ? 1.12 : 0.9, e.clientX, e.clientY); }, { passive: false });
  tuval.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    if (state.okEklemeModu) { _haritaOkCizimBaslat(e); return; }
    state.suruklemeAktif = true; state.suruklemeHareketEtti = false;
    state.suruklemeBaslangic = { x: e.clientX, y: e.clientY, panX: state.panX, panY: state.panY };
    tuval.classList.add('h-kaydiriliyor');
  });
  window.addEventListener('mousemove', e => {
    if (_etiketSurukleme) { _haritaEtiketSuruklemeDevam(e); return; }
    if (_okNoktaSurukleme) { _haritaOkNoktaSuruklemeDevam(e); return; }
    if (_okCizimi) { _haritaOkCizimDevam(e); return; }
    if (!state.suruklemeAktif) return;
    const dx = e.clientX - state.suruklemeBaslangic.x, dy = e.clientY - state.suruklemeBaslangic.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) state.suruklemeHareketEtti = true;
    state.panX = state.suruklemeBaslangic.panX + dx;
    state.panY = state.suruklemeBaslangic.panY + dy;
    haritaDonusumUygula();
  });
  window.addEventListener('mouseup', () => {
    if (_etiketSurukleme) { _haritaEtiketSuruklemeBitir(); return; }
    if (_okNoktaSurukleme) { _haritaOkNoktaSuruklemeBitir(); return; }
    if (_okCizimi) { _haritaOkCizimBitir(); return; }
    state.suruklemeAktif = false; tuval.classList.remove('h-kaydiriliyor');
  });

  el('zoomInBtn').addEventListener('click', () => haritaZoomYap(1.2));
  el('zoomOutBtn').addEventListener('click', () => haritaZoomYap(0.83));
  el('zoomSifirlaBtn').addEventListener('click', haritaZoomSifirla);

  haritaHizliCipleriCiz();
}

function haritaSekmeDegistir(sekme) {
  state.sekme = sekme;
  el('sekmeHaritaBtn').classList.toggle('sekme-seciliDegil', sekme !== 'harita');
  el('sekmeListeBtn').classList.toggle('sekme-seciliDegil', sekme !== 'liste');
  el('haritaGorunumu').classList.toggle('hidden', sekme !== 'harita');
  el('listeGorunumu').classList.toggle('hidden', sekme !== 'liste');
  if (sekme === 'liste') haritaListesiCiz();
}
