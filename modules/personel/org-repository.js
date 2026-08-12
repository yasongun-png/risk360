// Organizasyon şeması: kullanıcının kendi tanımladığı bölüm/unvan hiyerarşisi.
// Her düğüm bir bölümü (en üst seviye) ya da bir unvanı (müdür, müdür yrd.,
// formen, vardiya amiri vb.) temsil eder. Firma bazlı izole tutulur.

function _pozisyonAnahtari() {
  return tenantAnahtar('organizasyon_pozisyonlari');
}

function pozisyonTumunuGetir() {
  return oku(_pozisyonAnahtari(), []);
}

function _pozisyonKaydet(liste) {
  yaz(_pozisyonAnahtari(), liste);
}

function pozisyonEkle(ad, ustId) {
  const temizAd = (ad || '').trim();
  if (!temizAd) return { basarili: false, hata: 'Ad boş olamaz.' };

  const liste = pozisyonTumunuGetir();
  const yeniDugum = {
    id: rastgeleId(),
    ad: temizAd,
    ustId: ustId || ''
  };
  liste.push(yeniDugum);
  _pozisyonKaydet(liste);
  return { basarili: true, pozisyon: yeniDugum };
}

function pozisyonGuncelle(id, ad) {
  const temizAd = (ad || '').trim();
  if (!temizAd) return { basarili: false, hata: 'Ad boş olamaz.' };

  const liste = pozisyonTumunuGetir();
  const dugum = liste.find(p => p.id === id);
  if (!dugum) return { basarili: false, hata: 'Pozisyon bulunamadı.' };

  dugum.ad = temizAd;
  _pozisyonKaydet(liste);
  return { basarili: true, pozisyon: dugum };
}

function _altSoyunToplaId(liste, id) {
  const sonuc = [id];
  liste.filter(p => p.ustId === id).forEach(cocuk => {
    sonuc.push(..._altSoyunToplaId(liste, cocuk.id));
  });
  return sonuc;
}

function pozisyonSil(id) {
  const liste = pozisyonTumunuGetir();
  const silinecekIdler = _altSoyunToplaId(liste, id);
  const kalanlar = liste.filter(p => !silinecekIdler.includes(p.id));
  _pozisyonKaydet(kalanlar);

  // Bu pozisyonlara atanmış personelin bağlantısını temizle.
  const personeller = personelTumunuGetir();
  let degisti = false;
  personeller.forEach(p => {
    if (silinecekIdler.includes(p.pozisyonId)) {
      p.pozisyonId = '';
      degisti = true;
    }
  });
  if (degisti) yaz(_personelAnahtari(), personeller);

  return { basarili: true };
}

function pozisyonAgaciOlustur() {
  const liste = pozisyonTumunuGetir();
  const dugumler = new Map(liste.map(p => [p.id, Object.assign({}, p, { cocuklar: [] })]));

  const kokler = [];
  dugumler.forEach(dugum => {
    if (dugum.ustId && dugumler.has(dugum.ustId)) {
      dugumler.get(dugum.ustId).cocuklar.push(dugum);
    } else {
      kokler.push(dugum);
    }
  });

  return kokler;
}

// Açılır listede göstermek için "Bölüm > Müdür > Formen" gibi yol metinleri üretir.
function pozisyonYollariniGetir() {
  const liste = pozisyonTumunuGetir();
  const idToNode = new Map(liste.map(p => [p.id, p]));

  function yolBul(id) {
    const parcalar = [];
    let mevcut = idToNode.get(id);
    while (mevcut) {
      parcalar.unshift(mevcut.ad);
      mevcut = mevcut.ustId ? idToNode.get(mevcut.ustId) : null;
    }
    return parcalar.join(' > ');
  }

  return liste
    .map(p => ({ id: p.id, yol: yolBul(p.id) }))
    .sort((a, b) => a.yol.localeCompare(b.yol, 'tr'));
}
