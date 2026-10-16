// Tabela Yönetimi iş kuralları: filtreli listeler, ihtiyaç -> mevcut aktarımı
// (asılan tabela otomatik TB-xxxx numarası alır), bölüm özeti ve eski
// tabela-yonetim uygulamasının JSON yedeğinden içe aktarma.

const TABELA_ONCELIK_SIRASI = { 'Yüksek': 0, 'Orta': 1, 'Düşük': 2 };

function _tabelaAramaEslesir(kayit, kucuk) {
  return [kayit.tabelaAdi, kayit.tabelaNo, kayit.bolum, kayit.lokasyon, kayit.kategori, kayit.not, kayit.gerekce, kayit.malzeme]
    .filter(Boolean).join(' ').toLocaleLowerCase('tr').includes(kucuk);
}

function _tabelaFiltrele(liste, aramaMetni, filtreler) {
  const f = filtreler || {};
  let sonuc = liste;
  if (f.bolum) sonuc = sonuc.filter(k => k.bolum === f.bolum);
  if (f.oncelik) sonuc = sonuc.filter(k => k.oncelik === f.oncelik);
  if (f.kategori) sonuc = sonuc.filter(k => k.kategori === f.kategori);
  const kucuk = (aramaMetni || '').trim().toLocaleLowerCase('tr');
  if (kucuk) sonuc = sonuc.filter(k => _tabelaAramaEslesir(k, kucuk));
  return sonuc;
}

const _tabelaTr = (a, b) => String(a || '').localeCompare(String(b || ''), 'tr');

function tabelaMevcutlariGetir(aramaMetni, filtreler) {
  return _tabelaFiltrele(tabelaMevcutTumunuGetir(), aramaMetni, filtreler).slice().sort((a, b) =>
    _tabelaTr(a.bolum, b.bolum) || _tabelaTr(a.lokasyon, b.lokasyon) || _tabelaTr(a.tabelaNo, b.tabelaNo));
}

function tabelaIhtiyaclariGetir(aramaMetni, filtreler) {
  return _tabelaFiltrele(tabelaIhtiyacTumunuGetir(), aramaMetni, filtreler).slice().sort((a, b) =>
    ((TABELA_ONCELIK_SIRASI[a.oncelik] ?? 9) - (TABELA_ONCELIK_SIRASI[b.oncelik] ?? 9)) ||
    _tabelaTr(a.bolum, b.bolum) || _tabelaTr(a.lokasyon, b.lokasyon) || _tabelaTr(a.tabelaAdi, b.tabelaAdi));
}

function tabelaKataloguGetir(aramaMetni, filtreler) {
  return _tabelaFiltrele(tabelaKatalogTumunuGetir(), aramaMetni, filtreler).slice().sort((a, b) => _tabelaTr(a.tabelaAdi, b.tabelaAdi));
}

// Firma kartındaki bölümler + kayıtlarda geçen (firma listesinde olmayan) bölümler.
function tabelaBolumListesi() {
  const firma = typeof aktifFirmaGetir === 'function' ? aktifFirmaGetir() : null;
  const kume = new Set(firma && Array.isArray(firma.bolumler) ? firma.bolumler.filter(Boolean) : []);
  tabelaMevcutTumunuGetir().concat(tabelaIhtiyacTumunuGetir()).forEach(k => { if (k.bolum) kume.add(k.bolum); });
  return Array.from(kume).sort(_tabelaTr);
}

// Seçili bölümde daha önce girilmiş lokasyonlar (yazarken öneri için).
function tabelaLokasyonOnerileri(bolum) {
  const kume = new Set();
  tabelaMevcutTumunuGetir().concat(tabelaIhtiyacTumunuGetir()).forEach(k => {
    if (k.lokasyon && (!bolum || k.bolum === bolum)) kume.add(k.lokasyon);
  });
  return Array.from(kume).sort(_tabelaTr);
}

function tabelaSonrakiNo() { return tabelaSonrakiNoUret(tabelaMevcutTumunuGetir()); }

// ---- Mevcut ----

function tabelaMevcutEkle(veriler) {
  const dogrulama = tabelaMevcutDogrula(veriler, tabelaMevcutTumunuGetir());
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };
  const kayit = tabelaMevcutOlustur(veriler);
  tabelaMevcutEkleRepo(kayit);
  return { basarili: true, kayit };
}

function tabelaMevcutGuncelle(id, veriler) {
  const digerleri = tabelaMevcutTumunuGetir().filter(k => k.id !== id);
  const dogrulama = tabelaMevcutDogrula(veriler, digerleri);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };
  const eski = tabelaMevcutIdIleGetirRepo(id);
  if (!eski) return { basarili: false, hata: 'Kayıt bulunamadı.' };
  const yeni = tabelaMevcutOlustur(Object.assign({}, veriler, { id, tarih: eski.tarih }));
  return { basarili: true, kayit: tabelaMevcutGuncelleRepo(id, yeni) };
}

function tabelaMevcutSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  tabelaMevcutSilRepo(id);
  return { basarili: true };
}

// ---- İhtiyaç ----

function tabelaIhtiyacEkle(veriler) {
  const dogrulama = tabelaIhtiyacDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };
  const kayit = tabelaIhtiyacOlustur(veriler);
  tabelaIhtiyacEkleRepo(kayit);
  return { basarili: true, kayit };
}

function tabelaIhtiyacGuncelle(id, veriler) {
  const dogrulama = tabelaIhtiyacDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };
  const eski = tabelaIhtiyacIdIleGetirRepo(id);
  if (!eski) return { basarili: false, hata: 'Kayıt bulunamadı.' };
  const yeni = tabelaIhtiyacOlustur(Object.assign({}, veriler, { id, tarih: eski.tarih }));
  return { basarili: true, kayit: tabelaIhtiyacGuncelleRepo(id, yeni) };
}

function tabelaIhtiyacSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  tabelaIhtiyacSilRepo(id);
  return { basarili: true };
}

// İhtiyaç karşılandı ve yerine asıldı: sıradaki TB numarasıyla mevcuda
// eklenir, ihtiyaç listesinden düşer.
function tabelaIhtiyaciMevcudaAktar(id) {
  const ihtiyac = tabelaIhtiyacIdIleGetirRepo(id);
  if (!ihtiyac) return { basarili: false, hata: 'Kayıt bulunamadı.' };
  const kayit = tabelaMevcutOlustur({
    bolum: ihtiyac.bolum,
    lokasyon: ihtiyac.lokasyon,
    tabelaAdi: ihtiyac.tabelaAdi,
    tabelaNo: tabelaSonrakiNo(),
    foto: ihtiyac.foto,
    adet: ihtiyac.adet,
    ebat: ihtiyac.ebat,
    malzeme: ihtiyac.malzeme,
    not: ihtiyac.gerekce ? 'İhtiyaçtan aktarıldı: ' + ihtiyac.gerekce : 'İhtiyaçtan aktarıldı.',
    tarih: tabelaBugun()
  });
  tabelaMevcutEkleRepo(kayit);
  tabelaIhtiyacSilRepo(id);
  return { basarili: true, kayit };
}

// ---- Katalog ----

function tabelaKatalogEkle(veriler) {
  const dogrulama = tabelaKatalogDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };
  const kayit = tabelaKatalogOlustur(veriler);
  tabelaKatalogEkleRepo(kayit);
  return { basarili: true, kayit };
}

function tabelaKatalogGuncelle(id, veriler) {
  const dogrulama = tabelaKatalogDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };
  const eski = tabelaKatalogIdIleGetirRepo(id);
  if (!eski) return { basarili: false, hata: 'Kayıt bulunamadı.' };
  const yeni = tabelaKatalogOlustur(Object.assign({}, veriler, { id, tarih: eski.tarih }));
  return { basarili: true, kayit: tabelaKatalogGuncelleRepo(id, yeni) };
}

function tabelaKatalogSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  tabelaKatalogSilRepo(id);
  return { basarili: true };
}

// ---- Özet ----

function tabelaOzetiHesapla() {
  const mevcut = tabelaMevcutTumunuGetir();
  const ihtiyac = tabelaIhtiyacTumunuGetir();
  const adetTopla = liste => liste.reduce((t, k) => t + (Number(k.adet) || 1), 0);

  const bolumler = {};
  const bolumAl = ad => (bolumler[ad] = bolumler[ad] || { bolum: ad, mevcut: 0, ihtiyac: 0, yuksek: 0 });
  mevcut.forEach(k => { bolumAl(k.bolum || 'Belirtilmemiş').mevcut += Number(k.adet) || 1; });
  ihtiyac.forEach(k => {
    const b = bolumAl(k.bolum || 'Belirtilmemiş');
    b.ihtiyac += Number(k.adet) || 1;
    if (k.oncelik === 'Yüksek') b.yuksek += Number(k.adet) || 1;
  });

  return {
    mevcutAdet: adetTopla(mevcut),
    mevcutKayit: mevcut.length,
    ihtiyacAdet: adetTopla(ihtiyac),
    yuksekOncelikAdet: adetTopla(ihtiyac.filter(k => k.oncelik === 'Yüksek')),
    katalogSayisi: tabelaKatalogTumunuGetir().length,
    bolumeGore: Object.values(bolumler).sort((a, b) => _tabelaTr(a.bolum, b.bolum))
  };
}

// ---- Eski uygulamadan içe aktarma ----

// isg1/tabela-yonetim "Ayarlar -> Yedek Al (JSON)" dosyası. Bölüm id'leri
// yedekteki departments listesinden ada çevrilir; fotoğraflar tek tek
// fotoref belgesine yazılır. Aynı id'li kayıt zaten varsa atlanır, böylece
// aynı yedek iki kez yüklenirse çift kayıt oluşmaz.
async function tabelaEskiYedektenIceAktar(yedek, firmaSlug, ilerlemeFn) {
  if (!yedek || typeof yedek !== 'object' || !Array.isArray(yedek.inventorySigns) || !Array.isArray(yedek.neededSigns) || !Array.isArray(yedek.catalogSigns)) {
    throw new Error('Bu dosya Tabela Yönetimi yedeği değil (inventorySigns / neededSigns / catalogSigns bulunamadı).');
  }
  const bolumAdi = {};
  (yedek.departments || []).forEach(d => { if (d && d.id) bolumAdi[d.id] = d.name || ''; });

  const mevcut = tabelaMevcutTumunuGetir();
  const ihtiyac = tabelaIhtiyacTumunuGetir();
  const katalog = tabelaKatalogTumunuGetir();
  const varOlan = new Set(mevcut.concat(ihtiyac, katalog).map(k => k.id));

  const toplam = yedek.inventorySigns.length + yedek.neededSigns.length + yedek.catalogSigns.length;
  let islenen = 0;
  const sonuc = { mevcut: 0, ihtiyac: 0, katalog: 0, atlanan: 0 };

  const fotoTasi = async foto => (foto && /^data:image\//.test(foto)) ? await fotoBuyukKaydet(foto, firmaSlug) : (foto || '');
  const ortak = async s => ({
    id: s.id,
    bolum: bolumAdi[s.deptId] || '',
    lokasyon: s.lokasyon,
    tabelaAdi: s.tabelaAdi,
    foto: await fotoTasi(s.foto),
    adet: s.adet,
    ebat: s.ebat,
    malzeme: s.malzeme,
    tarih: s.tarih
  });

  for (const s of yedek.inventorySigns) {
    if (varOlan.has(s.id)) sonuc.atlanan++;
    else { mevcut.push(tabelaMevcutOlustur(Object.assign(await ortak(s), { tabelaNo: s.tabelaNo, not: s.not }))); sonuc.mevcut++; }
    if (ilerlemeFn) ilerlemeFn(++islenen, toplam);
  }
  for (const s of yedek.neededSigns) {
    if (varOlan.has(s.id)) sonuc.atlanan++;
    else { ihtiyac.push(tabelaIhtiyacOlustur(Object.assign(await ortak(s), { oncelik: s.oncelik, kategori: s.kategori, gerekce: s.gerekce || s.not }))); sonuc.ihtiyac++; }
    if (ilerlemeFn) ilerlemeFn(++islenen, toplam);
  }
  for (const s of yedek.catalogSigns) {
    if (varOlan.has(s.id)) sonuc.atlanan++;
    else { katalog.push(tabelaKatalogOlustur({ id: s.id, tabelaAdi: s.tabelaAdi, kategori: s.kategori, foto: await fotoTasi(s.foto), tarih: s.tarih })); sonuc.katalog++; }
    if (ilerlemeFn) ilerlemeFn(++islenen, toplam);
  }

  if (sonuc.mevcut) tabelaMevcutTopluKaydetRepo(mevcut);
  if (sonuc.ihtiyac) tabelaIhtiyacTopluKaydetRepo(ihtiyac);
  if (sonuc.katalog) tabelaKatalogTopluKaydetRepo(katalog);
  return sonuc;
}
