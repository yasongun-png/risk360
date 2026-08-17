// Bakım Talep ve Onay Modülü iş mantığı: durum makinesi, rol bazlı görünürlük
// (birim kullanıcıları SADECE kendi biriminin taleplerini görür), hedefli
// bildirimler ve ekipman envanterinin kendiliğinden büyümesi.
//
// Roller (bkz. core/auth.js):
//   admin / duzenleyici -> "İSG" onay makamı, tüm talepleri görür.
//   rol==='bakim'       -> Bakım Bölümü, tüm birimlerin taleplerini görür.
//   rol==='birim'       -> Talep Eden Birim, SADECE kendi birimAdi'sindeki
//                          taleplerini görür/açar/kapatır.

// Kullanıcı isteği: "kullanıcılar kısmında İSG onayı verebilecekleri de
// admin belirleyebilsin" — artık TÜM düzenleyiciler değil, sadece admin'in
// bu yetkiyi açıkça verdiği düzenleyiciler İSG onaylayıcısı sayılır (bkz.
// kullanicilar.html kkIsgOnayi, core/auth.js ikKullaniciEkle/Guncelle).
function _btIsgOnaylayiciMi(kullanici) {
  return kullaniciAdminMi(kullanici) || (kullanici.rol === 'duzenleyici' && !!kullanici.isgOnayiVerebilir);
}

function _btBakimRoluMu(kullanici) {
  return _btIsgOnaylayiciMi(kullanici) || kullanici.rol === 'bakim';
}

function _btTalepSahibiMi(kullanici, kayit) {
  if (_btIsgOnaylayiciMi(kullanici) || kullanici.rol === 'bakim') return true;
  return kullanici.rol === 'birim' && kullanici.birimAdi === kayit.talep.birim;
}

// Ekipman envanteri kaydını kim düzenleyebilir: Bakım/İSG'nin yanı sıra
// Üretim/Talep Eden Birim tarafı da ekleyebilir (kullanıcı isteği: "bunu
// ekleyebilecekler üretim ve bakım tarafı olacak") — 'birim' burada kendi
// birimiyle sınırlı DEĞİLDİR, çünkü envanter firma genelinde ortak/paylaşılan
// tek bir liste (talep formundaki gibi birim bazlı ayrım yok).
function _btEkipmanDuzenleyebilirMi(kullanici) {
  return _btBakimRoluMu(kullanici) || kullanici.rol === 'birim';
}

// Hedefli bildirim: hedefRol/hedefBirim boşsa herkese görünür (bkz.
// dashboard.html _bildirimKullaniciyaGorunurMu), doluysa sadece ilgili
// role/birime görünür. Aynı 'isg_bildirimler' anahtarını (mevcut zil
// altyapısını) yeniden kullanır.
function _btBildirimEkle(hedef, mesaj, kayit) {
  const kullanici = oturumdakiKullanici();
  const bildirimler = oku('isg_bildirimler', []);
  bildirimler.push({
    id: rastgeleId(),
    kullaniciAdi: kullanici ? kullanici.kullaniciAdi : '',
    adSoyad: kullanici ? kullanici.adSoyad : '',
    anahtar: _bakimTalepAnahtari(),
    kayitEtiketleri: [kayit.talepNo + ' — ' + mesaj],
    hedefRol: (hedef && hedef.hedefRol) || null,
    hedefBirim: (hedef && hedef.hedefBirim) || null,
    hedefBakimTuru: (hedef && hedef.hedefBakimTuru) || null,
    baglanti: 'modules/bakim-talep/index.html?id=' + kayit.id,
    tarih: new Date().toISOString(),
    okuyanKullaniciIdleri: []
  });
  yaz('isg_bildirimler', bildirimler.slice(-300));
}

function _btGecmisEkle(kayit, not) {
  const kullanici = oturumdakiKullanici();
  kayit.gecmis = Array.isArray(kayit.gecmis) ? kayit.gecmis : [];
  kayit.gecmis.push(bakimTalepGecmisSatiri(kayit.durum, kullanici, not));
}

function _ekipmanEnvanteriGuncelle(kod, konum) {
  const temizKod = (kod || '').trim();
  if (!temizKod) return;
  const liste = ekipmanEnvanteriTumunuGetirRepo();
  const mevcut = liste.find(e => e.kod.toLowerCase() === temizKod.toLowerCase());
  if (mevcut) {
    ekipmanEnvanterKaydiGuncelleRepo(mevcut.id, {
      sonKullanimTarihi: new Date().toISOString(),
      talepSayisi: (mevcut.talepSayisi || 0) + 1,
      konum: konum || mevcut.konum
    });
  } else {
    // Ad kasıtlı olarak boş bırakılır (kod ile aynı doldurulmuyor) —
    // envanter listesinde "-" olarak görünür, "Düzenle" ile elle
    // girilene kadar kod ile adın aynı şey olduğu yanılgısına yol açmaz.
    ekipmanEnvanterKaydiEkleRepo(ekipmanEnvanterKaydiOlustur(temizKod, '', konum));
  }
}

// Ekipman Bakım Kartına bir girdi ekler — kayıt kodla eşleştirilir (talep
// kapanışında otomatik çağrılır) VEYA doğrudan ekipman id'siyle (barkod
// formundan, bkz. ekipman-bakim-bildir.html). Kasıtlı olarak oturum/rol
// kontrolü YAPMAZ — ramak-kala-bildir.html ile aynı gerekçe: barkodu okutan
// anonim/giriş yapmamış olabilir, esas güvenlik sınırı Firestore kurallarıdır.
function _ekipmanBakimKartinaYaz(ekipmanId, girdi) {
  if (!ekipmanId) return;
  const mevcut = ekipmanEnvanterKaydiIdIleGetirRepo(ekipmanId);
  if (!mevcut) return;
  const gecmis = Array.isArray(mevcut.bakimGecmisi) ? mevcut.bakimGecmisi : [];
  ekipmanEnvanterKaydiGuncelleRepo(ekipmanId, { bakimGecmisi: gecmis.concat([girdi]) });
}

function _ekipmanKoduIleIdBul(ekipmanKodu) {
  const temizKod = (ekipmanKodu || '').trim().toLowerCase();
  if (!temizKod) return null;
  const mevcut = ekipmanEnvanteriTumunuGetirRepo().find(e => e.kod.toLowerCase() === temizKod);
  return mevcut ? mevcut.id : null;
}

// Sahada barkod ile: kod taratılır, envanterde bulunursa kartına yazılır;
// bulunamazsa kullanıcı isteği gereği YENİ bir envanter kaydı açılıp aynı
// anda o kayda yazılır (bkz. ekipman-bakim-bildir.html).
function ekipmanBakimKartiGirdiEkle(ekipmanKodu, konum, girdi) {
  const temizKod = (ekipmanKodu || '').trim();
  if (!temizKod) return { basarili: false, hata: 'Ekipman kodu zorunludur.' };
  let ekipmanId = _ekipmanKoduIleIdBul(temizKod);
  if (!ekipmanId) {
    const yeni = ekipmanEnvanterKaydiEkleRepo(ekipmanEnvanterKaydiOlustur(temizKod, '', konum));
    ekipmanId = yeni.id;
  } else {
    ekipmanEnvanterKaydiGuncelleRepo(ekipmanId, { sonKullanimTarihi: new Date().toISOString() });
  }
  _ekipmanBakimKartinaYaz(ekipmanId, girdi);
  return { basarili: true, ekipmanId };
}

// Envanter kaydı talep formundan otomatik oluştuktan SONRA elle
// zenginleştirilebilir (kullanıcı isteği: "ekipman adı/tipi/konumu/kodu/
// fotoğrafı sonradan eklenebilsin", "bunu ekleyebilecekler üretim ve bakım
// tarafı olacak").
function ekipmanKaydiDuzenle(id, veriler) {
  const kullanici = oturumdakiKullanici();
  if (!kullanici || !_btEkipmanDuzenleyebilirMi(kullanici)) return { basarili: false, hata: 'Bu işlem için yetkiniz yok.' };
  const mevcut = ekipmanEnvanteriTumunuGetirRepo().find(e => e.id === id);
  if (!mevcut) return { basarili: false, hata: 'Ekipman kaydı bulunamadı.' };

  const guncellenen = ekipmanEnvanterKaydiGuncelleRepo(id, {
    kod: (veriler.kod || '').trim() || mevcut.kod,
    ad: (veriler.ad || '').trim(),
    tip: (veriler.tip || '').trim(),
    konum: (veriler.konum || '').trim(),
    fotograf: veriler.fotograf || ''
  });
  return { basarili: true, kayit: guncellenen };
}

// Kullanıcı isteği: "envanterden ekipman silmeyi admin yapabilsin".
function ekipmanKaydiSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  ekipmanEnvanterKaydiSilRepo(id);
  return { basarili: true };
}

// ---- Listeleme (rol bazlı görünürlük) ----

function bakimTalepleriGetir(aramaMetni, filtreler) {
  const kullanici = oturumdakiKullanici();
  if (!kullanici) return [];
  const f = filtreler || {};
  let liste = bakimTalepleriTumunuGetirRepo();

  // 'birim' rolü SADECE kendi biriminin taleplerini görür — admin/düzenleyici/
  // bakım tüm birimleri görür (kullanıcı isteği: "Her bölümün kullanıcıları
  // ... sadece kendi birimlerinin taleplerini görür/açar; Bakım ve İSG
  // rolleri tüm birimlerin taleplerini görür").
  if (kullanici.rol === 'birim') {
    liste = liste.filter(t => t.talep.birim === kullanici.birimAdi);
  }
  // 'bakim' rolü, hesabına bir/birden fazla bakım türü atanmışsa (bkz.
  // kullanicilar.html kkBakimTuruListesi) SADECE o türlerdeki talepleri
  // görür — kullanıcı isteği: "elektrik ile mekanik ayrı olmalı", sonra
  // "bakım türlerinde birden fazla seçebileyim". Hiç atanmamışsa (eski
  // hesaplar / admin tarafından hiçbiri işaretlenmemiş) geriye dönük
  // uyumlu şekilde hepsini görür.
  const _btKullaniciBakimTurleri = bakimTurleriCoz(kullanici);
  if (kullanici.rol === 'bakim' && _btKullaniciBakimTurleri.length) {
    liste = liste.filter(t => _btKullaniciBakimTurleri.includes(t.talep.bakimTuru));
  }

  if (f.durum) liste = liste.filter(t => t.durum === f.durum);
  if (f.birim) liste = liste.filter(t => t.talep.birim === f.birim);
  if (f.oncelik) liste = liste.filter(t => t.talep.oncelik === f.oncelik);
  if (f.bakimTuru) liste = liste.filter(t => t.talep.bakimTuru === f.bakimTuru);

  if (aramaMetni) {
    const kucuk = aramaMetni.trim().toLowerCase();
    liste = liste.filter(t =>
      (t.talepNo || '').toLowerCase().includes(kucuk) ||
      (t.talep.isTanimi || '').toLowerCase().includes(kucuk) ||
      (t.talep.ekipmanKodu || '').toLowerCase().includes(kucuk) ||
      (t.talep.birim || '').toLowerCase().includes(kucuk)
    );
  }

  return liste.sort((a, b) => {
    const aKapali = BAKIM_TALEP_KAPALI_DURUMLAR.includes(a.durum);
    const bKapali = BAKIM_TALEP_KAPALI_DURUMLAR.includes(b.durum);
    if (aKapali !== bKapali) return aKapali ? 1 : -1;
    return (b.olusturmaTarihi || '').localeCompare(a.olusturmaTarihi || '');
  });
}

function bakimTalepIdIleGetir(id) {
  const kullanici = oturumdakiKullanici();
  if (!kullanici) return null;
  const kayit = bakimTalepIdIleGetirRepo(id);
  if (!kayit) return null;
  return _btTalepSahibiMi(kullanici, kayit) ? kayit : null;
}

// ---- Durum geçişleri ----

// 1) Talep Eden Birim (veya admin) yeni talep açar.
function bakimTalepAc(veriler) {
  const kullanici = oturumdakiKullanici();
  if (!kullanici) return { basarili: false, hata: 'Oturum bulunamadı.' };

  const dogrulama = bakimTalepDogrula(veriler.talep || {});
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const talepNo = sonrakiBakimTalepNoUret(bakimTalepleriTumunuGetirRepo());
  const kayit = bakimTalepOlustur(veriler, talepNo);
  _btGecmisEkle(kayit, 'Talep oluşturuldu.');
  bakimTalepEkleRepo(kayit);
  _ekipmanEnvanteriGuncelle(kayit.talep.ekipmanKodu, kayit.talep.konum);
  _btBildirimEkle({ hedefRol: 'bakim', hedefBakimTuru: kayit.talep.bakimTuru }, `Yeni bakım talebi (${kayit.talep.birim})`, kayit);
  return { basarili: true, kayit };
}

// Kullanıcı isteği: "bakıma gelen bir talebin yapılabilmesi için elektrik
// veya otomasyon işi yapılması gerekiyorsa, veya elektrik/otomasyona geldi
// ama bakım işi de varsa, bakım/elektrik/otomasyon birbirlerine yönlendirme
// yapabilmeli" — durum/aşama değişmez, sadece bakimTuru değişir ve ilgili
// yeni türün ekibine bildirim gider.
function bakimTuruYonlendir(id, yeniTur, not) {
  const kullanici = oturumdakiKullanici();
  if (!kullanici || !_btBakimRoluMu(kullanici)) return { basarili: false, hata: 'Bu işlem için yetkiniz yok.' };
  if (!BAKIM_TALEP_BAKIM_TURLERI.includes(yeniTur)) return { basarili: false, hata: 'Geçersiz bakım türü.' };
  const kayit = bakimTalepIdIleGetirRepo(id);
  if (!kayit) return { basarili: false, hata: 'Talep bulunamadı.' };
  if (BAKIM_TALEP_KAPALI_DURUMLAR.includes(kayit.durum) || kayit.durum === 'Onaylandı / Planlandı' || kayit.durum === 'Bakım Tamamladı' || kayit.durum === 'İSG Onayında') {
    return { basarili: false, hata: 'Bu aşamadaki bir talep başka bir bakım türüne yönlendirilemez.' };
  }
  if (kayit.talep.bakimTuru === yeniTur) return { basarili: false, hata: 'Talep zaten bu bakım türünde.' };

  const eskiTur = kayit.talep.bakimTuru;
  kayit.talep = Object.assign({}, kayit.talep, { bakimTuru: yeniTur });
  _btGecmisEkle(kayit, `${eskiTur} ekibinden ${yeniTur} ekibine yönlendirildi.` + (not ? ' Not: ' + not : ''));
  bakimTalepGuncelleRepo(id, kayit);
  _btBildirimEkle({ hedefRol: 'bakim', hedefBakimTuru: yeniTur }, `${eskiTur}'dan yönlendirildi`, kayit);
  return { basarili: true, kayit };
}

// 2) Bakım, değerlendirme alanlarını kaydeder (taslak — durum henüz
// değişmez, birden çok kez kaydedilebilir) ve/veya İSG'ye gönderir.
function bakimDegerlendirmeKaydet(id, veriler) {
  const kullanici = oturumdakiKullanici();
  if (!kullanici || !_btBakimRoluMu(kullanici)) return { basarili: false, hata: 'Bu işlem için yetkiniz yok.' };
  const kayit = bakimTalepIdIleGetirRepo(id);
  if (!kayit) return { basarili: false, hata: 'Talep bulunamadı.' };
  if (BAKIM_TALEP_KAPALI_DURUMLAR.includes(kayit.durum)) return { basarili: false, hata: 'Kapatılmış/reddedilmiş talep düzenlenemez.' };

  kayit.bakim = Object.assign({}, kayit.bakim, veriler, {
    degerlendirenKisi: kullanici.adSoyad,
    tarih: new Date().toISOString()
  });
  if (kayit.durum === 'Yeni') kayit.durum = 'Bakım Değerlendirmede';
  bakimTalepGuncelleRepo(id, kayit);
  return { basarili: true, kayit };
}

function bakimIsgeGonder(id) {
  const kullanici = oturumdakiKullanici();
  if (!kullanici || !_btBakimRoluMu(kullanici)) return { basarili: false, hata: 'Bu işlem için yetkiniz yok.' };
  const kayit = bakimTalepIdIleGetirRepo(id);
  if (!kayit) return { basarili: false, hata: 'Talep bulunamadı.' };

  const dogrulama = bakimDegerlendirmeDogrula(kayit.bakim);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  kayit.durum = 'İSG Onayında';
  _btGecmisEkle(kayit, 'Bakım değerlendirmesi İSG onayına gönderildi.');
  bakimTalepGuncelleRepo(id, kayit);
  _btBildirimEkle({ hedefRol: 'isg' }, 'İSG onayı bekliyor', kayit);
  return { basarili: true, kayit };
}

// 3) İSG onaylar / ilave önlem ister / reddeder.
function isgOnayla(id) {
  const kullanici = oturumdakiKullanici();
  if (!kullanici || !_btIsgOnaylayiciMi(kullanici)) return { basarili: false, hata: 'Bu işlem için yetkiniz yok.' };
  const kayit = bakimTalepIdIleGetirRepo(id);
  if (!kayit) return { basarili: false, hata: 'Talep bulunamadı.' };

  kayit.isg = Object.assign({}, kayit.isg, {
    onayDurumu: 'Onaylandı', onaylayanKisi: kullanici.adSoyad, tarih: new Date().toISOString()
  });
  kayit.durum = 'Onaylandı / Planlandı';
  _btGecmisEkle(kayit, 'İSG onayladı.');
  bakimTalepGuncelleRepo(id, kayit);
  _btBildirimEkle({ hedefBirim: kayit.talep.birim }, 'İSG onayladı, planlandı', kayit);
  _btBildirimEkle({ hedefRol: 'bakim' }, 'İSG onayladı, iş planlanabilir', kayit);
  return { basarili: true, kayit };
}

function isgIlaveOnlemIste(id, aciklama) {
  const kullanici = oturumdakiKullanici();
  if (!kullanici || !_btIsgOnaylayiciMi(kullanici)) return { basarili: false, hata: 'Bu işlem için yetkiniz yok.' };
  const kayit = bakimTalepIdIleGetirRepo(id);
  if (!kayit) return { basarili: false, hata: 'Talep bulunamadı.' };

  const dogrulama = isgOnayDogrula({ ilaveOnlemGerekli: true, ilaveOnlemAciklama: aciklama });
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  kayit.isg = Object.assign({}, kayit.isg, {
    ilaveOnlemGerekli: true, ilaveOnlemAciklama: aciklama,
    onaylayanKisi: kullanici.adSoyad, tarih: new Date().toISOString()
  });
  kayit.durum = 'İSG İlave Önlem İstedi';
  _btGecmisEkle(kayit, 'İSG ilave önlem istedi: ' + aciklama);
  bakimTalepGuncelleRepo(id, kayit);
  _btBildirimEkle({ hedefRol: 'bakim' }, 'İSG ilave önlem istedi', kayit);
  return { basarili: true, kayit };
}

// Bakım, İSG'nin istediği ilave önlemi işleyip tekrar gönderir.
function bakimTekrarGonder(id) {
  const kullanici = oturumdakiKullanici();
  if (!kullanici || !_btBakimRoluMu(kullanici)) return { basarili: false, hata: 'Bu işlem için yetkiniz yok.' };
  const kayit = bakimTalepIdIleGetirRepo(id);
  if (!kayit) return { basarili: false, hata: 'Talep bulunamadı.' };
  if (kayit.durum !== 'İSG İlave Önlem İstedi') return { basarili: false, hata: 'Bu talep şu an İSG ilave önlem aşamasında değil.' };

  kayit.durum = 'İSG Onayında';
  _btGecmisEkle(kayit, 'İlave önlem işlendi, tekrar İSG onayına gönderildi.');
  bakimTalepGuncelleRepo(id, kayit);
  _btBildirimEkle({ hedefRol: 'isg' }, 'İlave önlem işlendi, tekrar onay bekliyor', kayit);
  return { basarili: true, kayit };
}

function talepReddet(id, gerekce) {
  const kullanici = oturumdakiKullanici();
  if (!kullanici || !_btBakimRoluMu(kullanici)) return { basarili: false, hata: 'Bu işlem için yetkiniz yok.' };
  const kayit = bakimTalepIdIleGetirRepo(id);
  if (!kayit) return { basarili: false, hata: 'Talep bulunamadı.' };

  const dogrulama = bakimTalepRedDogrula(gerekce);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  // Reddin HANGİ aşamada yapıldığı kaydedilir — kimin düzeltip tekrar
  // gönderebileceğini belirler (kullanıcı isteği: "reddedildiğinde talep
  // eden düzenleyip tekrar geri gönderebilsin, İSG reddederse bakım
  // düzenleyip tekrar onaya göndersin"). Reddet butonu SADECE 'İSG
  // Onayında' aşamasında İSG'ye, diğer tüm açık aşamalarda Bakım'a
  // gösterildiğinden (bkz. ui.js _btDetayIcerikOlustur), durum tek başına
  // yeterli bir ayrım sağlar.
  kayit.redEdenAsama = kayit.durum === 'İSG Onayında' ? 'isg' : 'bakim';
  kayit.durum = 'Reddedildi';
  kayit.redGerekcesi = gerekce;
  _btGecmisEkle(kayit, 'Reddedildi: ' + gerekce);
  bakimTalepGuncelleRepo(id, kayit);
  if (kayit.redEdenAsama === 'isg') {
    _btBildirimEkle({ hedefRol: 'bakim' }, 'İSG reddetti, düzenleyip tekrar gönderebilirsiniz: ' + gerekce, kayit);
  } else {
    _btBildirimEkle({ hedefBirim: kayit.talep.birim }, 'Talep reddedildi: ' + gerekce, kayit);
  }
  return { basarili: true, kayit };
}

// Bakım'ın reddettiği talebi talep eden düzeltip tekrar gönderir.
function talebiDuzenleyipTekrarGonder(id, veriler) {
  const kullanici = oturumdakiKullanici();
  if (!kullanici) return { basarili: false, hata: 'Oturum bulunamadı.' };
  const kayit = bakimTalepIdIleGetirRepo(id);
  if (!kayit) return { basarili: false, hata: 'Talep bulunamadı.' };
  if (kayit.durum !== 'Reddedildi' || kayit.redEdenAsama !== 'bakim') {
    return { basarili: false, hata: 'Bu talep şu an düzenlenip tekrar gönderilebilecek durumda değil.' };
  }
  if (!((kullanici.rol === 'birim' && kullanici.birimAdi === kayit.talep.birim) || _btIsgOnaylayiciMi(kullanici))) {
    return { basarili: false, hata: 'Bu işlem için yetkiniz yok.' };
  }

  const dogrulama = bakimTalepDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  kayit.talep = Object.assign({}, kayit.talep, {
    konum: (veriler.konum || '').trim(),
    ekipmanKodu: (veriler.ekipmanKodu || '').trim(),
    isTanimi: (veriler.isTanimi || '').trim(),
    oncelik: BAKIM_TALEP_ONCELIKLERI.includes(veriler.oncelik) ? veriler.oncelik : kayit.talep.oncelik,
    fotograflar: Array.isArray(veriler.fotograflar) ? veriler.fotograflar.slice(0, 2) : kayit.talep.fotograflar
  });
  kayit.durum = 'Yeni';
  kayit.redGerekcesi = '';
  kayit.redEdenAsama = '';
  _btGecmisEkle(kayit, 'Talep, talep eden tarafından düzeltilip tekrar gönderildi.');
  bakimTalepGuncelleRepo(id, kayit);
  _btBildirimEkle({ hedefRol: 'bakim' }, 'Reddedilen talep düzeltilip tekrar gönderildi', kayit);
  return { basarili: true, kayit };
}

// İSG'nin reddettiği talebi Bakım yeniden değerlendirmeye açar — buradan
// sonrası normal bakimDegerlendirmeKaydet/bakimIsgeGonder akışıyla devam eder.
function bakimReddedileniYenidenAc(id) {
  const kullanici = oturumdakiKullanici();
  if (!kullanici || !_btBakimRoluMu(kullanici)) return { basarili: false, hata: 'Bu işlem için yetkiniz yok.' };
  const kayit = bakimTalepIdIleGetirRepo(id);
  if (!kayit) return { basarili: false, hata: 'Talep bulunamadı.' };
  if (kayit.durum !== 'Reddedildi' || kayit.redEdenAsama !== 'isg') {
    return { basarili: false, hata: 'Bu talep şu an yeniden açılabilecek durumda değil.' };
  }

  kayit.durum = 'Bakım Değerlendirmede';
  kayit.redGerekcesi = '';
  kayit.redEdenAsama = '';
  _btGecmisEkle(kayit, 'İSG tarafından reddedilen talep, Bakım tarafından yeniden değerlendirmeye açıldı.');
  bakimTalepGuncelleRepo(id, kayit);
  return { basarili: true, kayit };
}

// 4) Bakım işi tamamladığını işaretler.
function bakimTamamlandiIsaretle(id, not) {
  const kullanici = oturumdakiKullanici();
  if (!kullanici || !_btBakimRoluMu(kullanici)) return { basarili: false, hata: 'Bu işlem için yetkiniz yok.' };
  const kayit = bakimTalepIdIleGetirRepo(id);
  if (!kayit) return { basarili: false, hata: 'Talep bulunamadı.' };
  if (kayit.durum !== 'Onaylandı / Planlandı') return { basarili: false, hata: 'İş henüz onaylanıp planlanmadan tamamlandı işaretlenemez.' };

  kayit.kapanis = Object.assign({}, kayit.kapanis, {
    bakimTamamlamaTarihi: new Date().toISOString(), bakimNotu: not || ''
  });
  kayit.durum = 'Bakım Tamamladı';
  _btGecmisEkle(kayit, 'Bakım işi tamamladı.' + (not ? ' Not: ' + not : ''));
  bakimTalepGuncelleRepo(id, kayit);
  _btBildirimEkle({ hedefBirim: kayit.talep.birim }, 'İş tamamlandı, onayınız bekleniyor', kayit);
  return { basarili: true, kayit };
}

// 5) Talep eden birim son onayı verip kaydı kapatır.
function talepEdenKapat(id, not) {
  const kullanici = oturumdakiKullanici();
  if (!kullanici) return { basarili: false, hata: 'Oturum bulunamadı.' };
  const kayit = bakimTalepIdIleGetirRepo(id);
  if (!kayit) return { basarili: false, hata: 'Talep bulunamadı.' };
  if (!(kullanici.rol === 'birim' && kullanici.birimAdi === kayit.talep.birim) && !_btIsgOnaylayiciMi(kullanici)) {
    return { basarili: false, hata: 'Sadece talebi açan birim veya admin bu işi kapatabilir.' };
  }
  if (kayit.durum !== 'Bakım Tamamladı') return { basarili: false, hata: 'İş, Bakım tarafından tamamlandı olarak işaretlenmeden kapatılamaz.' };

  kayit.kapanis = Object.assign({}, kayit.kapanis, {
    talepEdenOnay: true, onaylayanKisi: kullanici.adSoyad, kapanisTarihi: new Date().toISOString(),
    memnuniyetNotu: not || ''
  });
  kayit.durum = 'Kapatıldı';
  _btGecmisEkle(kayit, 'Talep eden birim onayladı, kayıt kapatıldı.');
  bakimTalepGuncelleRepo(id, kayit);
  // Kullanıcı isteği: "ekipmanın bakım kartında yapılan işlemler çıksın...
  // en altına formun tarih tarih ekipmana neler yapıldığı listelerle
  // ulaşılabilsin" — talep tamamen kapandığında, Bakım'ın girdiği tamamlama
  // notu o ekipmanın kartına otomatik işlenir.
  const ekipmanId = _ekipmanKoduIleIdBul(kayit.talep.ekipmanKodu);
  if (ekipmanId) {
    _ekipmanBakimKartinaYaz(ekipmanId, {
      tarih: kayit.kapanis.kapanisTarihi,
      talepNo: kayit.talepNo,
      not: kayit.kapanis.bakimNotu || '(Tamamlama notu girilmedi)'
    });
  }
  _btBildirimEkle({ hedefRol: 'bakim' }, 'Talep kapatıldı', kayit);
  _btBildirimEkle({ hedefRol: 'isg' }, 'Talep kapatıldı', kayit);
  return { basarili: true, kayit };
}

function bakimTalepSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  bakimTalepSilRepo(id);
  return { basarili: true };
}

// ---- Özet (birim bazlı dashboard) ----

function bakimTalepOzetiHesapla() {
  const kullanici = oturumdakiKullanici();
  const liste = bakimTalepleriGetir('', {});
  const acikDurumlar = BAKIM_TALEP_DURUMLARI.filter(d => !BAKIM_TALEP_KAPALI_DURUMLAR.includes(d));

  const birimGrubu = {};
  let toplamKapanisSuresiMsGenel = 0, kapanmisSayisiGenel = 0;
  const oncelikDagilimi = {};
  BAKIM_TALEP_ONCELIKLERI.forEach(o => { oncelikDagilimi[o] = 0; });

  liste.forEach(t => {
    const b = t.talep.birim || 'Belirtilmemiş';
    if (!birimGrubu[b]) birimGrubu[b] = { birim: b, acik: 0, kapali: 0, ilaveOnlemli: 0, toplamKapanisSuresiMs: 0, kapanmisSayisi: 0 };
    if (acikDurumlar.includes(t.durum)) birimGrubu[b].acik++;
    if (t.durum === 'Kapatıldı') {
      birimGrubu[b].kapali++;
      if (t.olusturmaTarihi && t.kapanis.kapanisTarihi) {
        const sureMs = new Date(t.kapanis.kapanisTarihi) - new Date(t.olusturmaTarihi);
        birimGrubu[b].toplamKapanisSuresiMs += sureMs;
        birimGrubu[b].kapanmisSayisi++;
        toplamKapanisSuresiMsGenel += sureMs;
        kapanmisSayisiGenel++;
      }
    }
    if (t.gecmis.some(g => g.durum === 'İSG İlave Önlem İstedi')) birimGrubu[b].ilaveOnlemli++;
    if (oncelikDagilimi[t.talep.oncelik] != null) oncelikDagilimi[t.talep.oncelik]++;
  });

  // Kullanıcı isteği: "bazı istatistikler olsun, yapılan bakım / talep
  // oranı vb" — toplam talebe kıyasla tamamlanma/red oranı ve genel
  // ortalama çözüm süresi.
  const tamamlanan = liste.filter(t => t.durum === 'Kapatıldı').length;
  const reddedilen = liste.filter(t => t.durum === 'Reddedildi').length;

  // Kullanıcı isteği: "X günden uzun süre aynı aşamada bekleyen talepler
  // için genel bir uyarı olsun" — açık (kapanmamış) kayıtlardan, son
  // hareketinin üzerinden BAKIM_TALEP_GECIKME_ESIK_GUN veya daha fazla gün
  // geçmiş olanların sayısı.
  const gecikmisSayisi = liste.filter(t => acikDurumlar.includes(t.durum) && bakimTalepBeklemeGunSayisi(t) >= BAKIM_TALEP_GECIKME_ESIK_GUN).length;

  return {
    toplam: liste.length,
    acik: liste.filter(t => acikDurumlar.includes(t.durum)).length,
    onayBekleyen: liste.filter(t => t.durum === 'İSG Onayında').length,
    gecikmisSayisi,
    tamamlanan,
    reddedilen,
    tamamlanmaOrani: liste.length ? Math.round((tamamlanan / liste.length) * 100) : 0,
    redOrani: liste.length ? Math.round((reddedilen / liste.length) * 100) : 0,
    ortalamaCozumGunu: kapanmisSayisiGenel ? Math.round(toplamKapanisSuresiMsGenel / kapanmisSayisiGenel / 86400000) : null,
    oncelikDagilimi,
    birimlerGore: Object.values(birimGrubu).map(b => Object.assign({}, b, {
      ortalamaKapanisGunu: b.kapanmisSayisi ? Math.round(b.toplamKapanisSuresiMs / b.kapanmisSayisi / 86400000) : null
    }))
  };
}
