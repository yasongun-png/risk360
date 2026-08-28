// Uygunsuzluk / DÖF iş kuralları: kayıt yaşam döngüsü (Açık → Kapat → Onay → Kapalı) ve özet.

function _uygunsuzlukZenginlestir(kayit) {
  const gecikmisMi = uygunsuzlukGecikmisMi(kayit, bugunIso());
  return Object.assign({}, kayit, { durumGoruntu: gecikmisMi ? 'Gecikmiş' : kayit.durum });
}

function uygunsuzluklariGetir(aramaMetni, filtreler) {
  const f = filtreler || {};
  let liste = uygunsuzlukTumunuGetir().map(_uygunsuzlukZenginlestir);

  if (f.durum) liste = liste.filter(k => k.durumGoruntu === f.durum);
  if (f.riskSeviyesi) liste = liste.filter(k => k.riskSeviyesi === f.riskSeviyesi);
  if (f.bolum) liste = liste.filter(k => k.bolum === f.bolum);
  if (f.konuId) liste = liste.filter(k => k.konuId === f.konuId);

  if (aramaMetni) {
    const kucuk = aramaMetni.trim().toLowerCase();
    liste = liste.filter(k =>
      k.baslik.toLowerCase().includes(kucuk) ||
      k.bolum.toLowerCase().includes(kucuk) ||
      k.sorumlu.toLowerCase().includes(kucuk) ||
      (k.aksiyonNo || '').toLowerCase().includes(kucuk)
    );
  }

  return liste.sort((a, b) => {
    const aKapali = a.durum === 'Kapalı' || a.durum === 'İptal';
    const bKapali = b.durum === 'Kapalı' || b.durum === 'İptal';
    if (aKapali !== bKapali) return aKapali ? 1 : -1;
    // Kullanıcı isteği: "uygunsuzluklarda kapatılanlar kapatıldığı tarihe
    // göre sıralı görünsün" — kapalı/iptal kayıtlar KAPANIŞ tarihine göre
    // (en son kapatılan en üstte), açık kayıtlar ise (bildirim tarihi
    // geriye dönük girilebildiği için) gerçek giriş anına (olusturmaTarihi)
    // göre sıralanır — en son eklenen açık kayıt en üstte görünür.
    if (aKapali) return (b.kapanisTarihi || '').localeCompare(a.kapanisTarihi || '');
    return (b.olusturmaTarihi || '').localeCompare(a.olusturmaTarihi || '');
  });
}

function uygunsuzlukEkle(veriler) {
  const dogrulama = uygunsuzlukDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const yil = (veriler.bildirimTarihi || bugunIso()).slice(0, 4);
  const aksiyonNo = sonrakiAksiyonNoUret(veriler.bolum, uygunsuzlukTumunuGetir(), yil);
  // Elle "Yeni Kayıt" formunda durum her zaman Açık'tır; ama içe aktarımda
  // (ör. eski sistemden zaten kapanmış kayıtlar gelirse) verilen durum korunur.
  const durum = UYGUNSUZLUK_DURUMLARI.includes(veriler.durum) ? veriler.durum : 'Açık';
  const kapaliMi = durum === 'Kapalı' || durum === 'İptal';
  const onayDurumu = kapaliMi
    ? (veriler.onayGerekliMi === false ? 'Onay Gerekmiyor' : 'Onaylandı')
    : (veriler.onayGerekliMi === false ? 'Onay Gerekmiyor' : 'Onay Bekliyor');
  const yeniKayit = uygunsuzlukKaydiOlustur(Object.assign({}, veriler, {
    aksiyonNo, durum, onayDurumu,
    konuId: veriler.konuId || '',
    konuAdi: (veriler.konuAdi || '').trim()
  }));
  uygunsuzlukEkleRepo(yeniKayit);
  return { basarili: true, kayit: yeniKayit };
}

// Çok sayıda kaydı doğrulayıp TEK bir bulut yazımıyla ekler (bkz.
// uygunsuzlukTopluEkleRepo). Dönüş, excelIceAktarOzetMesaji ile aynı şekilde
// kullanılabilecek { basarili, basarisizSayisi, hatalar, bulutBasarili } şekli
// döner — bulutBasarili false ise kayıtlar ekranda görünse bile buluta
// yazılamamış olabilir (ör. Firestore'un ~1MB belge sınırı aşıldıysa).
async function uygunsuzlukTopluEkle(verilerListesi) {
  const mevcutListe = uygunsuzlukTumunuGetir();
  const yeniKayitlar = [];
  const hatalar = [];

  verilerListesi.forEach((veriler, index) => {
    const dogrulama = uygunsuzlukDogrula(veriler);
    if (!dogrulama.gecerli) {
      hatalar.push(`Satır ${index + 2}: ${Object.values(dogrulama.hatalar)[0]}`);
      return;
    }
    const yil = (veriler.bildirimTarihi || bugunIso()).slice(0, 4);
    const aksiyonNo = sonrakiAksiyonNoUret(veriler.bolum, mevcutListe.concat(yeniKayitlar), yil);
    const durum = UYGUNSUZLUK_DURUMLARI.includes(veriler.durum) ? veriler.durum : 'Açık';
    const kapaliMi = durum === 'Kapalı' || durum === 'İptal';
    const onayDurumu = kapaliMi
      ? (veriler.onayGerekliMi === false ? 'Onay Gerekmiyor' : 'Onaylandı')
      : (veriler.onayGerekliMi === false ? 'Onay Gerekmiyor' : 'Onay Bekliyor');
    yeniKayitlar.push(uygunsuzlukKaydiOlustur(Object.assign({}, veriler, {
      aksiyonNo, durum, onayDurumu,
      konuId: veriler.konuId || '',
      konuAdi: (veriler.konuAdi || '').trim()
    })));
  });

  const yazimSonucu = await uygunsuzlukTopluEkleRepo(yeniKayitlar);
  return {
    basarili: yazimSonucu.basarili ? yeniKayitlar.length : 0,
    basarisizSayisi: yazimSonucu.basarili ? hatalar.length : (yeniKayitlar.length + hatalar.length),
    hatalar: yazimSonucu.basarili ? hatalar : hatalar.concat(['Bulut yazımı başarısız oldu, aşağıya bakın.']),
    bulutBasarili: yazimSonucu.basarili
  };
}

function uygunsuzlukGuncelle(id, veriler) {
  const dogrulama = uygunsuzlukDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const guncellenen = uygunsuzlukGuncelleRepo(id, {
    konuId: veriler.konuId || '',
    konuAdi: (veriler.konuAdi || '').trim(),
    baslik: veriler.baslik.trim(),
    aciklama: veriler.aciklama.trim(),
    bolum: veriler.bolum.trim(),
    lokasyon: (veriler.lokasyon || '').trim(),
    kaynakTuru: veriler.kaynakTuru || 'Manuel Bildirim',
    riskSeviyesi: veriler.riskSeviyesi || 'Orta',
    kokNeden: (veriler.kokNeden || '').trim(),
    duzelticiFaaliyet: (veriler.duzelticiFaaliyet || '').trim(),
    sorumlu: veriler.sorumlu.trim(),
    atayan: (veriler.atayan || '').trim(),
    bildirimTarihi: veriler.bildirimTarihi || bugunIso(),
    termin: veriler.termin,
    onayGerekliMi: veriler.onayGerekliMi,
    maliyet: (veriler.maliyet || '').trim(),
    satinAlmaDurumu: (veriler.satinAlmaDurumu || '').trim(),
    yasalSartlar: Array.isArray(veriler.yasalSartlar) ? veriler.yasalSartlar.filter(Boolean) : [],
    yasalDayanak: (veriler.yasalDayanak || '').trim(),
    fotoOncesi: veriler.fotoOncesi || '',
    fotoSonrasi: veriler.fotoSonrasi || '',
    fotoOncesi2: veriler.fotoOncesi2 || '',
    fotoSonrasi2: veriler.fotoSonrasi2 || '',
    fotoOncesi3: veriler.fotoOncesi3 || '',
    fotoSonrasi3: veriler.fotoSonrasi3 || '',
    fotoOncesi4: veriler.fotoOncesi4 || '',
    fotoSonrasi4: veriler.fotoSonrasi4 || '',
    durum: veriler.durum || 'Açık',
    kapanisTarihi: veriler.kapanisTarihi || '',
    kanitAciklamasi: (veriler.kanitAciklamasi || '').trim()
  });
  return { basarili: true, kayit: guncellenen };
}

function uygunsuzlukSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  uygunsuzlukSilRepo(id);
  return { basarili: true };
}

// Kaydı kapatmaya çalışır: onay gerekiyorsa "Onay Bekliyor"a geçer, gerekmiyorsa doğrudan kapanır.
function uygunsuzlukKapat(id, kanitAciklamasi) {
  const kayit = uygunsuzlukIdIleGetirRepo(id);
  if (!kayit) return { basarili: false, hata: 'Kayıt bulunamadı.' };

  const onayGerekli = kayit.onayGerekliMi !== false;
  const guncellenen = uygunsuzlukGuncelleRepo(id, {
    durum: onayGerekli ? 'Onay Bekliyor' : 'Kapalı',
    onayDurumu: onayGerekli ? 'Onay Bekliyor' : 'Onay Gerekmiyor',
    kapanisTarihi: bugunIso(),
    kanitAciklamasi: (kanitAciklamasi || '').trim()
  });
  return { basarili: true, kayit: guncellenen };
}

// Kaydı başka bir konuya/deftere taşır (kullanıcı isteği: "Tüm Konular"
// seçiliyken oluşturulan kayıtlar hiçbir gerçek konuya atanmadan
// "sahipsiz" kalıyordu — bununla sonradan doğru konuya taşınabilirler).
// konuId boş bırakılırsa kayıt konusuz bırakılır (yine "Tüm Konular"da
// görünmeye devam eder).
function uygunsuzlukKonuTasi(id, konuId) {
  const konu = konuId ? uygunsuzlukKonulariTumunuGetir().find(k => k.id === konuId) : null;
  if (konuId && !konu) return { basarili: false, hata: 'Konu bulunamadı.' };
  const guncellenen = uygunsuzlukGuncelleRepo(id, {
    konuId: konu ? konu.id : '',
    konuAdi: konu ? konu.ad : ''
  });
  if (!guncellenen) return { basarili: false, hata: 'Kayıt bulunamadı.' };
  return { basarili: true, kayit: guncellenen };
}

// Bildirim Formu'ndaki "Onay" bölümü (kaşe/imza kutuları) için dijital imza
// kaydeder -- rol 'bildiren' ya da 'sorumlu' olabilir. imzalar nesnesinin
// tamamı değil sadece ilgili rol güncellenir (bkz. is-izni/service.js
// izinOnayVer ile aynı desen).
function uygunsuzlukImzaVer(id, rol, ad, imzaUrl) {
  if (!['bildiren', 'sorumlu'].includes(rol)) return { basarili: false, hata: 'Geçersiz imza rolü.' };
  const kayit = uygunsuzlukIdIleGetirRepo(id);
  if (!kayit) return { basarili: false, hata: 'Kayıt bulunamadı.' };
  const imzalar = Object.assign({}, kayit.imzalar, { [rol]: uygunsuzlukImzaVeriUret(ad, imzaUrl) });
  const guncellenen = uygunsuzlukGuncelleRepo(id, { imzalar });
  return { basarili: true, kayit: guncellenen };
}

function uygunsuzlukOnayla(id, onaylayan) {
  const guncellenen = uygunsuzlukGuncelleRepo(id, {
    durum: 'Kapalı',
    onayDurumu: 'Onaylandı',
    onaylayan: (onaylayan || '').trim(),
    onayTarihi: bugunIso()
  });
  if (!guncellenen) return { basarili: false, hata: 'Kayıt bulunamadı.' };
  return { basarili: true, kayit: guncellenen };
}

function uygunsuzlukReddet(id, onaylayan, redSebebi) {
  const guncellenen = uygunsuzlukGuncelleRepo(id, {
    durum: 'Devam Ediyor',
    onayDurumu: 'Reddedildi',
    onaylayan: (onaylayan || '').trim(),
    onayTarihi: bugunIso(),
    redSebebi: (redSebebi || '').trim()
  });
  if (!guncellenen) return { basarili: false, hata: 'Kayıt bulunamadı.' };
  return { basarili: true, kayit: guncellenen };
}

// ---- Uygunsuzluk Konusu / Defteri ----

function uygunsuzlukKonulariniGetir() {
  const kayitlar = uygunsuzlukTumunuGetir();
  return uygunsuzlukKonulariTumunuGetir()
    .map(k => Object.assign({}, k, { kayitSayisi: kayitlar.filter(x => x.konuId === k.id).length }))
    .sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
}

function uygunsuzlukKonuEkle(ad) {
  const temiz = (ad || '').trim();
  if (!temiz) return { basarili: false, hata: 'Konu adı boş olamaz.' };
  const varMi = uygunsuzlukKonulariTumunuGetir().some(k => k.ad.toLocaleLowerCase('tr-TR') === temiz.toLocaleLowerCase('tr-TR'));
  if (varMi) return { basarili: false, hata: 'Bu isimde bir konu zaten mevcut.' };
  const konu = uygunsuzlukKonuOlustur({ ad: temiz });
  uygunsuzlukKonuEkleRepo(konu);
  return { basarili: true, konu };
}

function uygunsuzlukKonuYenidenAdlandir(id, yeniAd) {
  const temiz = (yeniAd || '').trim();
  if (!temiz) return { basarili: false, hata: 'Konu adı boş olamaz.' };
  const konu = uygunsuzlukKonuGuncelleRepo(id, { ad: temiz });
  if (!konu) return { basarili: false, hata: 'Konu bulunamadı.' };
  // Kayıtlardaki görüntü adı da (konuAdi) güncel kalsın.
  const kayitlar = uygunsuzlukTumunuGetir();
  kayitlar.filter(k => k.konuId === id).forEach(k => uygunsuzlukGuncelleRepo(k.id, { konuAdi: temiz }));
  return { basarili: true, konu };
}

// Ada göre konu bulur, yoksa oluşturur (JSON içe aktarımda eski "Konu" adları
// otomatik eşlenir/oluşturulur). Ad boşsa null döner (konusuz kayıt).
function uygunsuzlukKonuBulYaDaOlustur(ad) {
  const temiz = (ad || '').trim();
  if (!temiz) return null;
  const mevcut = uygunsuzlukKonulariTumunuGetir().find(k => k.ad.toLocaleLowerCase('tr-TR') === temiz.toLocaleLowerCase('tr-TR'));
  if (mevcut) return mevcut;
  const konu = uygunsuzlukKonuOlustur({ ad: temiz });
  uygunsuzlukKonuEkleRepo(konu);
  return konu;
}

function uygunsuzlukOzetiHesapla(filtreler) {
  const liste = uygunsuzluklariGetir('', filtreler || {});
  const grupla = (secici) => {
    const sonuc = {};
    liste.forEach(k => {
      const anahtar = secici(k) || 'Belirtilmemiş';
      sonuc[anahtar] = (sonuc[anahtar] || 0) + 1;
    });
    return Object.entries(sonuc).sort((a, b) => b[1] - a[1]);
  };

  const bugun = bugunIso();
  const yediGunSonra = new Date();
  yediGunSonra.setDate(yediGunSonra.getDate() + 7);
  // toISOString() UTC'ye çevirir; UTC+3'te gece yarısı-03:00 arası bir gün geri kayar.
  const yediGunSonraStr = yediGunSonra.getFullYear() + '-' + String(yediGunSonra.getMonth() + 1).padStart(2, '0') + '-' + String(yediGunSonra.getDate()).padStart(2, '0');

  return {
    toplam: liste.length,
    acik: liste.filter(k => k.durumGoruntu !== 'Kapalı' && k.durumGoruntu !== 'İptal').length,
    kapali: liste.filter(k => k.durum === 'Kapalı').length,
    gecikmis: liste.filter(k => k.durumGoruntu === 'Gecikmiş').length,
    onayBekleyen: liste.filter(k => k.onayDurumu === 'Onay Bekliyor' && k.durum === 'Onay Bekliyor').length,
    yuksekVeUstuRisk: liste.filter(k => k.riskSeviyesi === 'Yüksek' || k.riskSeviyesi === 'Çok Yüksek').length,
    bolumeGore: grupla(k => k.bolum),
    durumaGore: grupla(k => k.durumGoruntu),
    riskSeviyesineGore: grupla(k => k.riskSeviyesi),
    sorumluyaGore: grupla(k => k.sorumlu || 'Atanmamış'),
    yakindaTerminDolacaklar: liste.filter(k => k.durum !== 'Kapalı' && k.termin >= bugun && k.termin <= yediGunSonraStr).slice(0, 10),
    enOncelikliAcikKayitlar: liste
      .filter(k => k.durum !== 'Kapalı' && k.durum !== 'İptal')
      .sort((a, b) => {
        const siralama = { 'Çok Yüksek': 4, 'Yüksek': 3, 'Orta': 2, 'Düşük': 1 };
        return (siralama[b.riskSeviyesi] || 0) - (siralama[a.riskSeviyesi] || 0) || (a.termin || '').localeCompare(b.termin || '');
      })
      .slice(0, 10)
  };
}
