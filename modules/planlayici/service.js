function _planKullaniciId() {
  const k = oturumdakiKullanici();
  return k ? k.id : '';
}

// ==================== İŞLER ====================

function planGorevleriGetir() {
  const id = _planKullaniciId();
  return planVerisiGetir().gorevler.filter(g => g.olusturanId === id);
}

function planGoreviKaydet(veriler, id) {
  const dogrulama = planGoreviDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };
  const veri = planVerisiGetir();
  const mevcut = id ? veri.gorevler.find(g => g.id === id) : null;
  if (id && !mevcut) return { basarili: false, hatalar: { baslik: 'Kayıt bulunamadı.' } };
  const kayit = planGoreviOlustur(Object.assign({}, mevcut || {}, veriler, {
    id: mevcut ? mevcut.id : undefined,
    olusturanId: mevcut ? mevcut.olusturanId : _planKullaniciId()
  }));
  kayit.tamamlanmaTarihi = kayit.durum === 'Tamamlandı' ? (mevcut && mevcut.tamamlanmaTarihi) || bugunIso() : '';
  if (mevcut) veri.gorevler[veri.gorevler.indexOf(mevcut)] = kayit; else veri.gorevler.push(kayit);
  planVerisiKaydet(veri);
  return { basarili: true, kayit };
}

function planGoreviTamamla(id, tamamlandi) {
  const g = planGorevleriGetir().find(x => x.id === id);
  if (!g) return;
  planGoreviKaydet(Object.assign({}, g, { durum: tamamlandi ? 'Tamamlandı' : 'Yapılacak' }), id);
}

function planGoreviSil(id) {
  const veri = planVerisiGetir();
  veri.gorevler = veri.gorevler.filter(g => !(g.id === id && g.olusturanId === _planKullaniciId()));
  planVerisiKaydet(veri);
}

// Tarihe göre gruplama — açık işler: Gecikmiş / Bugün / Yarın / Bu Hafta (7 gün) /
// Daha Sonra / Tarihsiz; tamamlananlar ayrı (en yeni önce).
function planGorevleriGrupla(liste) {
  const bugun = bugunIso();
  const gunEkle = n => { const d = new Date(bugun + 'T12:00:00'); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const yarin = gunEkle(1), hafta = gunEkle(7);
  const oncelikSira = { Yüksek: 0, Normal: 1, Düşük: 2 };
  const sirala = a => a.sort((x, y) => String(x.tarih).localeCompare(String(y.tarih)) || String(x.saat).localeCompare(String(y.saat)) || oncelikSira[x.oncelik] - oncelikSira[y.oncelik]);
  const acik = liste.filter(g => g.durum !== 'Tamamlandı');
  const gruplar = [
    { anahtar: 'gecikmis', baslik: 'Gecikmiş', renk: 'var(--hata)', liste: acik.filter(g => g.tarih && g.tarih < bugun) },
    { anahtar: 'bugun', baslik: 'Bugün', renk: 'var(--celik-mavi)', liste: acik.filter(g => g.tarih === bugun) },
    { anahtar: 'yarin', baslik: 'Yarın', renk: '#0891b2', liste: acik.filter(g => g.tarih === yarin) },
    { anahtar: 'hafta', baslik: 'Bu Hafta', renk: '#7c3aed', liste: acik.filter(g => g.tarih > yarin && g.tarih <= hafta) },
    { anahtar: 'sonra', baslik: 'Daha Sonra', renk: '#475569', liste: acik.filter(g => g.tarih > hafta) },
    { anahtar: 'tarihsiz', baslik: 'Tarihsiz', renk: '#94a3b8', liste: acik.filter(g => !g.tarih) }
  ];
  gruplar.forEach(g => sirala(g.liste));
  const tamamlanan = liste.filter(g => g.durum === 'Tamamlandı')
    .sort((x, y) => String(y.tamamlanmaTarihi).localeCompare(String(x.tamamlanmaTarihi)));
  return { gruplar, tamamlanan };
}

function planOzetiHesapla() {
  const liste = planGorevleriGetir();
  const { gruplar, tamamlanan } = planGorevleriGrupla(liste);
  const sayi = a => gruplar.find(g => g.anahtar === a).liste.length;
  const buAy = bugunIso().slice(0, 7);
  return {
    gecikmis: sayi('gecikmis'), bugun: sayi('bugun'),
    hafta: sayi('yarin') + sayi('hafta'),
    acik: liste.filter(g => g.durum !== 'Tamamlandı').length,
    buAyTamamlanan: tamamlanan.filter(g => String(g.tamamlanmaTarihi).startsWith(buAy)).length
  };
}

// ==================== NOTLAR ====================

function planNotlariGetir(arama) {
  const id = _planKullaniciId();
  const kucuk = String(arama || '').trim().toLocaleLowerCase('tr-TR');
  return planVerisiGetir().notlar
    .filter(n => n.olusturanId === id)
    .filter(n => !kucuk || (n.baslik + ' ' + n.icerik).toLocaleLowerCase('tr-TR').includes(kucuk))
    .sort((a, b) => (b.sabit - a.sabit) || String(b.guncellemeTarihi).localeCompare(String(a.guncellemeTarihi)));
}

function planNotuKaydet(veriler, id) {
  const dogrulama = planNotuDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };
  const veri = planVerisiGetir();
  const mevcut = id ? veri.notlar.find(n => n.id === id) : null;
  const kayit = planNotuOlustur(Object.assign({}, mevcut || {}, veriler, {
    id: mevcut ? mevcut.id : undefined,
    olusturanId: mevcut ? mevcut.olusturanId : _planKullaniciId()
  }));
  if (mevcut) veri.notlar[veri.notlar.indexOf(mevcut)] = kayit; else veri.notlar.push(kayit);
  planVerisiKaydet(veri);
  return { basarili: true, kayit };
}

function planNotuSabitle(id) {
  const n = planNotlariGetir('').find(x => x.id === id);
  if (n) planNotuKaydet(Object.assign({}, n, { sabit: !n.sabit }), id);
}

function planNotuSil(id) {
  const veri = planVerisiGetir();
  veri.notlar = veri.notlar.filter(n => !(n.id === id && n.olusturanId === _planKullaniciId()));
  planVerisiKaydet(veri);
}
