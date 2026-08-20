// Tespit ve Öneri Defteri iş kuralları: kayıt yaşam döngüsü (Açık → Tebliğ
// Edildi → Uygulamada → Kapandı, veya Reddedildi) ve özet.

function _tespitOneriZenginlestir(kayit) {
  return Object.assign({}, kayit, { durum: tespitOneriDurumuHesapla(kayit) });
}

function tespitOneriKayitlariniGetir(aramaMetni, filtreler) {
  const f = filtreler || {};
  let liste = tespitOneriTumunuGetir().map(_tespitOneriZenginlestir);

  if (f.durum) liste = liste.filter(k => k.durum === f.durum);
  if (f.oncelik) liste = liste.filter(k => k.oncelik === f.oncelik);
  if (f.bolum) liste = liste.filter(k => k.bolum === f.bolum);
  // Kullanıcı isteği: "tespit ve öneri defterinde sicil no ya göre
  // filtreleme yapılsın".
  if (f.isyeriSicili) liste = liste.filter(k => (k.isyeriSicili || '') === f.isyeriSicili);

  if (aramaMetni) {
    const kucuk = aramaMetni.trim().toLowerCase();
    liste = liste.filter(k =>
      k.bolum.toLowerCase().includes(kucuk) ||
      k.tespit.toLowerCase().includes(kucuk) ||
      k.oneri.toLowerCase().includes(kucuk) ||
      k.tespitEden.toLowerCase().includes(kucuk) ||
      (k.kayitNo || '').toLowerCase().includes(kucuk)
    );
  }

  return liste.sort((a, b) => (b.tespitTarihi || '').localeCompare(a.tespitTarihi || ''));
}

function tespitOneriEkle(veriler) {
  const dogrulama = tespitOneriDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const kayitNo = tespitOneriSonrakiNoUret(tespitOneriTumunuGetir());
  const yeniKayit = tespitOneriKaydiOlustur(Object.assign({}, veriler, { kayitNo }));
  tespitOneriEkleRepo(yeniKayit);
  return { basarili: true, kayit: yeniKayit };
}

function tespitOneriGuncelle(id, veriler) {
  const dogrulama = tespitOneriDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const mevcut = tespitOneriIdIleGetirRepo(id);
  const birlesik = Object.assign({}, mevcut, veriler, { id, kayitNo: mevcut ? mevcut.kayitNo : (veriler.kayitNo || '') });
  const guncellenen = tespitOneriGuncelleRepo(id, tespitOneriKaydiOlustur(birlesik));
  return { basarili: true, kayit: guncellenen };
}

function tespitOneriSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  tespitOneriSilRepo(id);
  return { basarili: true };
}

// Kullanıcı isteği: "tespit önerileri yönetici kullanıcı toplu da
// silebilsin" -- bkz. modules/acil-durum/service.js yanginTupuToplusil ile
// aynı desen (silme yetkisi kontrolü + kaç kayıt silindiği bilgisi).
function tespitOneriToplusil(idler) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  const idSeti = new Set(idler);
  const oncekiSayi = tespitOneriTumunuGetir().length;
  idSeti.forEach(id => tespitOneriSilRepo(id));
  const sonrakiSayi = tespitOneriTumunuGetir().length;
  return { basarili: true, silinen: oncekiSayi - sonrakiSayi };
}

// Tespit ve Öneri Formu'ndaki "Onay" bölümü (kaşe/imza kutuları) için
// dijital imza kaydeder -- rol 'tespitEden' ya da 'tebligEdilen' olabilir
// (bkz. modules/uygunsuzluk/service.js uygunsuzlukImzaVer ile aynı desen).
function tespitOneriImzaVer(id, rol, ad, imzaUrl) {
  if (!['tespitEden', 'tebligEdilen'].includes(rol)) return { basarili: false, hata: 'Geçersiz imza rolü.' };
  const kayit = tespitOneriIdIleGetirRepo(id);
  if (!kayit) return { basarili: false, hata: 'Kayıt bulunamadı.' };
  const imzalar = Object.assign({}, kayit.imzalar, { [rol]: tespitOneriImzaVeriUret(ad, imzaUrl) });
  const guncellenen = tespitOneriGuncelleRepo(id, { imzalar });
  return { basarili: true, kayit: guncellenen };
}

// Kullanıcı isteği: "bunu işlemlerde bir buton ile uygunsuzluklara
// aktarabileyim" -- kaydı, uygunsuzluk modülünün kendi kaydına dönüştürüp
// "Tespit ve Öneri Defterinden Aktarılanlar" konusuna ekler. Aynı kayıt
// tekrar aktarılamaz (aktarilanUygunsuzlukId doluysa engellenir); bu
// modülün sayfası uygunsuzluk/model.js, /validation.js, /repository.js ve
// /service.js dosyalarını da yükler (bkz. modules/acil-durum
// plan-detay.html'in kimyasal modülünü dahil etmesiyle aynı ilke).
const _TO_ONCELIK_RISK_ESLESME = { 'Düşük': 'Düşük', 'Orta': 'Orta', 'Yüksek': 'Yüksek', 'Acil': 'Çok Yüksek' };
const _TO_DURUM_UYGUNSUZLUK_ESLESME = { 'Açık': 'Açık', 'Tebliğ Edildi': 'Devam Ediyor', 'Uygulamada': 'Devam Ediyor', 'Kapandı': 'Kapalı', 'Reddedildi': 'İptal' };

function tespitOneriUygunsuzlugaAktar(id) {
  const k = tespitOneriIdIleGetirRepo(id);
  if (!k) return { basarili: false, hata: 'Kayıt bulunamadı.' };
  if (k.aktarilanUygunsuzlukId) return { basarili: false, hata: 'Bu kayıt daha önce Uygunsuzluk\'a aktarılmış.' };

  const konu = uygunsuzlukKonuBulYaDaOlustur('Tespit ve Öneri Defterinden Aktarılanlar');
  const sonuc = uygunsuzlukEkle({
    konuId: konu ? konu.id : '',
    konuAdi: konu ? konu.ad : '',
    baslik: k.tespit,
    aciklama: [(k.oneri ? 'Öneri: ' + k.oneri : ''), `(Tespit ve Öneri Defteri No: ${k.kayitNo})`].filter(Boolean).join(' '),
    bolum: k.bolum,
    atayan: k.tespitEden,
    sorumlu: k.tebligEdilen,
    riskSeviyesi: _TO_ONCELIK_RISK_ESLESME[k.oncelik] || 'Orta',
    bildirimTarihi: k.tespitTarihi,
    kapanisTarihi: k.kapanisTarihi,
    kanitAciklamasi: k.yapilanIslem,
    fotoOncesi: k.defterSayfasiFotografi,
    durum: _TO_DURUM_UYGUNSUZLUK_ESLESME[k.durum] || 'Açık'
  });
  if (!sonuc.basarili) return sonuc;

  tespitOneriGuncelleRepo(id, { aktarilanUygunsuzlukId: sonuc.kayit.id });
  return { basarili: true, kayit: sonuc.kayit };
}

// Hızlı işlem: tebliğ edildi olarak işaretler (tarih bugün, birim/kişi verilir).
function tespitOneriTebligEt(id, tebligEdilen) {
  const guncellenen = tespitOneriGuncelleRepo(id, {
    tebligEdilen: (tebligEdilen || '').trim(),
    tebligTarihi: bugunIso()
  });
  if (!guncellenen) return { basarili: false, hata: 'Kayıt bulunamadı.' };
  guncellenen.durum = tespitOneriDurumuHesapla(guncellenen);
  tespitOneriGuncelleRepo(id, { durum: guncellenen.durum });
  return { basarili: true, kayit: guncellenen };
}

// Hızlı işlem: kapanış tarihi bugün olarak kaydedilir, yapılan işlem eklenir.
function tespitOneriKapat(id, yapilanIslem) {
  const guncellenen = tespitOneriGuncelleRepo(id, {
    yapilanIslem: (yapilanIslem || '').trim(),
    kapanisTarihi: bugunIso()
  });
  if (!guncellenen) return { basarili: false, hata: 'Kayıt bulunamadı.' };
  guncellenen.durum = tespitOneriDurumuHesapla(guncellenen);
  tespitOneriGuncelleRepo(id, { durum: guncellenen.durum });
  return { basarili: true, kayit: guncellenen };
}

function tespitOneriOzetiHesapla() {
  const liste = tespitOneriKayitlariniGetir('', {});
  const grupla = (secici) => {
    const sonuc = {};
    liste.forEach(k => { const anahtar = secici(k) || 'Belirtilmemiş'; sonuc[anahtar] = (sonuc[anahtar] || 0) + 1; });
    return Object.entries(sonuc).sort((a, b) => b[1] - a[1]);
  };

  return {
    toplam: liste.length,
    acik: liste.filter(k => !TESPIT_KAPALI_DURUMLAR.includes(k.durum)).length,
    acilAcik: liste.filter(k => k.oncelik === 'Acil' && k.durum === 'Açık').length,
    tebligBekleyen: liste.filter(k => k.durum === 'Açık').length,
    kapanan: liste.filter(k => k.durum === 'Kapandı').length,
    bolumeGore: grupla(k => k.bolum),
    durumaGore: grupla(k => k.durum),
    oncelikliAcikKayitlar: liste
      .filter(k => !TESPIT_KAPALI_DURUMLAR.includes(k.durum))
      .sort((a, b) => {
        const siralama = { 'Acil': 4, 'Yüksek': 3, 'Orta': 2, 'Düşük': 1 };
        return (siralama[b.oncelik] || 0) - (siralama[a.oncelik] || 0) || (a.tespitTarihi || '').localeCompare(b.tespitTarihi || '');
      })
      .slice(0, 10)
  };
}
