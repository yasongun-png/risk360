// Firma (tenant) yönetimi: sınırsız firma ekleme, yeniden adlandırma, silme
// ve aktif firma seçimi. data.js ve auth.js'ten sonra yüklenmelidir.

function getFirmalar() {
  const kullanici = oturumdakiKullanici();
  if (!kullanici) return [];
  const tumFirmalar = oku('isg_firmalar', []);
  return tumFirmalar.filter(f => f.sahipId === kullanici.id);
}

// Firmayı SADECE oturumdaki kullanıcı sahibiyse döndürür — aksi halde localStorage
// (ör. isg_aktif_firma) üzerinden başka bir kullanıcının firmaId'sini vermek,
// o firmanın verisine erişim için yeterli olurdu (bkz. aktifFirmaAyarla,
// tenantAnahtarFirma). Aynı kullanıcının yönettiği farklı bir firmaya
// (ör. olay-kaza modülünde çapraz firma kopyalama) erişim hâlâ mümkündür.
function getFirmaById(firmaId) {
  const kullanici = oturumdakiKullanici();
  if (!kullanici) return null;
  const tumFirmalar = oku('isg_firmalar', []);
  return tumFirmalar.find(f => f.id === firmaId && f.sahipId === kullanici.id) || null;
}

function firmaEkle(ad, kullaniciId, tehlikeSinifi, sektor) {
  const temizAd = (ad || '').trim();
  if (!temizAd) {
    return { basarili: false, hata: 'Firma adı boş olamaz.' };
  }

  const tumFirmalar = oku('isg_firmalar', []);
  const ayniKullaniciFirmalari = tumFirmalar.filter(f => f.sahipId === kullaniciId);

  const varMi = ayniKullaniciFirmalari.some(
    f => f.ad.toLowerCase() === temizAd.toLowerCase()
  );
  if (varMi) {
    return { basarili: false, hata: 'Bu isimde bir firma zaten mevcut.' };
  }

  const renk = FIRMA_ROZET_RENKLERI[tumFirmalar.length % FIRMA_ROZET_RENKLERI.length];
  const yeniFirma = {
    id: rastgeleId(),
    ad: temizAd,
    slug: slugOlustur(temizAd) || rastgeleId(),
    renk,
    tehlikeSinifi: TEHLIKE_SINIFLARI.includes(tehlikeSinifi) ? tehlikeSinifi : TEHLIKE_SINIFLARI[0],
    sektor: SEKTORLER.includes(sektor) ? sektor : SEKTORLER[SEKTORLER.length - 1],
    sahipId: kullaniciId,
    // Firmaya özel işyeri bölümleri/pozisyonları listesi — Sorumlu alanlarının
    // altında hızlı seçim butonu olarak gösterilir (bkz. core/bolum-butonlari.js).
    // Kişi adı değil pozisyon/bölüm adı tutulur (kullanıcı isteği: "kişiler
    // değişebilir, pozisyon yazacağım").
    bolumler: [],
    // Aynı sahada birden fazla sicil/tüzel işveren olabilir (kullanıcı isteği:
    // BAĞFAŞ örneği — Bandırma Gübre Fabrikaları / Servis Pazarlama / Teknik
    // Müteahhitlik aynı yerde ama farklı sicil). Kurul/Uygunsuzluk/Eğitim gibi
    // paylaşılan sistemler bölünmez (tek firma), sadece Personel kaydına bu
    // listeden seçilen bir "İşveren" etiketi eklenir (bkz. modules/personel).
    isverenler: [],
    // Standart kataloğa (modules/egitim/model.js EGITIM_TURLERI) ek olarak
    // firmaya özel eğitim/sertifika türleri (kullanıcı isteği: "yeni eğitim
    // türü de ekleyebilmem lazım") — her biri { id, ad, yil }, geçerlilik
    // "tarih + yil" olarak hesaplanır (bkz. egitimTurleriniAyarla).
    ozelEgitimTurleri: []
  };

  tumFirmalar.push(yeniFirma);
  yaz('isg_firmalar', tumFirmalar);
  return { basarili: true, firma: yeniFirma };
}

function firmaGuncelle(firmaId, yeniAd) {
  const temizAd = (yeniAd || '').trim();
  if (!temizAd) return { basarili: false, hata: 'Firma adı boş olamaz.' };

  const tumFirmalar = oku('isg_firmalar', []);
  const firma = tumFirmalar.find(f => f.id === firmaId);
  if (!firma) return { basarili: false, hata: 'Firma bulunamadı.' };

  firma.ad = temizAd;
  yaz('isg_firmalar', tumFirmalar);
  return { basarili: true, firma };
}

function firmaTehlikeSinifiAyarla(firmaId, tehlikeSinifi) {
  if (!TEHLIKE_SINIFLARI.includes(tehlikeSinifi)) {
    return { basarili: false, hata: 'Geçersiz tehlike sınıfı.' };
  }

  const tumFirmalar = oku('isg_firmalar', []);
  const firma = tumFirmalar.find(f => f.id === firmaId);
  if (!firma) return { basarili: false, hata: 'Firma bulunamadı.' };

  firma.tehlikeSinifi = tehlikeSinifi;
  yaz('isg_firmalar', tumFirmalar);
  return { basarili: true, firma };
}

function firmaSektoruAyarla(firmaId, sektor) {
  if (!SEKTORLER.includes(sektor)) {
    return { basarili: false, hata: 'Geçersiz sektör.' };
  }

  const tumFirmalar = oku('isg_firmalar', []);
  const firma = tumFirmalar.find(f => f.id === firmaId);
  if (!firma) return { basarili: false, hata: 'Firma bulunamadı.' };

  firma.sektor = sektor;
  yaz('isg_firmalar', tumFirmalar);
  return { basarili: true, firma };
}

function firmaBolumleriAyarla(firmaId, bolumler) {
  const tumFirmalar = oku('isg_firmalar', []);
  const firma = tumFirmalar.find(f => f.id === firmaId);
  if (!firma) return { basarili: false, hata: 'Firma bulunamadı.' };

  // Boş satırlar/tekrarlar temizlenir, sıra korunur.
  const temiz = [];
  (Array.isArray(bolumler) ? bolumler : []).forEach(b => {
    const ad = String(b || '').trim();
    if (ad && !temiz.includes(ad)) temiz.push(ad);
  });

  firma.bolumler = temiz;
  yaz('isg_firmalar', tumFirmalar);
  return { basarili: true, firma };
}

function firmaIsverenleriAyarla(firmaId, isverenler) {
  const tumFirmalar = oku('isg_firmalar', []);
  const firma = tumFirmalar.find(f => f.id === firmaId);
  if (!firma) return { basarili: false, hata: 'Firma bulunamadı.' };

  const temiz = [];
  (Array.isArray(isverenler) ? isverenler : []).forEach(b => {
    const ad = String(b || '').trim();
    if (ad && !temiz.includes(ad)) temiz.push(ad);
  });

  firma.isverenler = temiz;
  yaz('isg_firmalar', tumFirmalar);
  return { basarili: true, firma };
}

function firmaOzelEgitimTuruEkle(firmaId, ad, yil) {
  const temizAd = String(ad || '').trim();
  if (!temizAd) return { basarili: false, hata: 'Eğitim türü adı boş olamaz.' };
  const temizYil = Number(yil);
  if (!Number.isFinite(temizYil) || temizYil < 1) return { basarili: false, hata: 'Geçerlilik yılı en az 1 olmalı.' };

  const tumFirmalar = oku('isg_firmalar', []);
  const firma = tumFirmalar.find(f => f.id === firmaId);
  if (!firma) return { basarili: false, hata: 'Firma bulunamadı.' };

  const liste = Array.isArray(firma.ozelEgitimTurleri) ? firma.ozelEgitimTurleri : [];
  if (liste.some(t => t.ad.toLocaleLowerCase('tr-TR') === temizAd.toLocaleLowerCase('tr-TR'))) {
    return { basarili: false, hata: 'Bu isimde bir eğitim türü zaten tanımlı.' };
  }

  const yeniTur = { id: 'ozel_' + rastgeleId(), ad: temizAd, yil: temizYil };
  firma.ozelEgitimTurleri = liste.concat([yeniTur]);
  yaz('isg_firmalar', tumFirmalar);
  return { basarili: true, firma, tur: yeniTur };
}

function firmaOzelEgitimTuruSil(firmaId, turId) {
  const tumFirmalar = oku('isg_firmalar', []);
  const firma = tumFirmalar.find(f => f.id === firmaId);
  if (!firma) return { basarili: false, hata: 'Firma bulunamadı.' };

  firma.ozelEgitimTurleri = (Array.isArray(firma.ozelEgitimTurleri) ? firma.ozelEgitimTurleri : []).filter(t => t.id !== turId);
  yaz('isg_firmalar', tumFirmalar);
  return { basarili: true, firma };
}

// Logo AYRI bir anahtarda tutulur (isg_firmalar'ın içine gömülmez): isg_firmalar
// "küçük senkron" anahtarlardan biridir ve her kayıtta değişmeden localStorage'a
// da yazılır (bkz. core/data.js) -- bir logo (sıkıştırılmış görsel bile olsa)
// birkaç firma için bu localStorage kotasını kolayca aşar. Bu yüzden logo,
// "büyük veri" yoluna (bellek + Firestore, localStorage'a hiç yazılmaz) giden
// kendi anahtarında saklanır.
function _firmaLogoAnahtari(firmaId) {
  return 'isg_firma_logosu_' + firmaId;
}

function firmaLogoAyarla(firmaId, logoUrl) {
  const firma = getFirmaById(firmaId);
  if (!firma) return { basarili: false, hata: 'Firma bulunamadı.' };

  // firma-yonetim.html'de "aktif firma" kavramı yok (tüm firmalar birden
  // yönetiliyor); bu yüzden ambient bağlam yerine firma.slug açıkça verilir --
  // aksi halde kayıt yanlış (boş) firma etiketiyle gidip başka hiçbir sayfanın
  // dinleyicisine düşmezdi.
  buyukVeriFirmayaYaz(_firmaLogoAnahtari(firmaId), logoUrl || '', firma.slug);
  return { basarili: true, firma };
}

function firmaLogoGetir(firmaId) {
  if (!firmaId) return '';
  return oku(_firmaLogoAnahtari(firmaId), '');
}

function firmaSil(firmaId) {
  const tumFirmalar = oku('isg_firmalar', []);
  const firma = tumFirmalar.find(f => f.id === firmaId);
  if (!firma) return { basarili: false, hata: 'Firma bulunamadı.' };

  const kalanlar = tumFirmalar.filter(f => f.id !== firmaId);
  yaz('isg_firmalar', kalanlar);

  // Bu firmaya ait izole modül verilerini de temizle (isg_<slug>_*).
  const onEk = `isg_${firma.slug}_`;
  Object.keys(localStorage)
    .filter(anahtar => anahtar.startsWith(onEk))
    .forEach(anahtar => localStorage.removeItem(anahtar));

  if (localStorage.getItem('isg_aktif_firma') === firmaId) {
    localStorage.removeItem('isg_aktif_firma');
  }

  return { basarili: true };
}

function aktifFirmaAyarla(firmaId) {
  // Sahiplik kontrolü: kullanıcı yalnızca kendi firmalarından birini aktif
  // firma yapabilir (bkz. getFirmaById).
  if (!getFirmaById(firmaId)) return;
  localStorage.setItem('isg_aktif_firma', firmaId);
}

function aktifFirmaGetir() {
  const firmaId = localStorage.getItem('isg_aktif_firma');
  if (!firmaId) return null;
  return getFirmaById(firmaId);
}
