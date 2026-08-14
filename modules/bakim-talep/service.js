// Bakım Talep ve Onay Modülü iş mantığı: durum makinesi, rol bazlı görünürlük
// (birim kullanıcıları SADECE kendi biriminin taleplerini görür), hedefli
// bildirimler ve ekipman envanterinin kendiliğinden büyümesi.
//
// Roller (bkz. core/auth.js):
//   admin / duzenleyici -> "İSG" onay makamı, tüm talepleri görür.
//   rol==='bakim'       -> Bakım Bölümü, tüm birimlerin taleplerini görür.
//   rol==='birim'       -> Talep Eden Birim, SADECE kendi birimAdi'sindeki
//                          taleplerini görür/açar/kapatır.

function _btIsgOnaylayiciMi(kullanici) {
  return kullaniciAdminMi(kullanici) || kullanici.rol === 'duzenleyici';
}

function _btBakimRoluMu(kullanici) {
  return _btIsgOnaylayiciMi(kullanici) || kullanici.rol === 'bakim';
}

function _btTalepSahibiMi(kullanici, kayit) {
  if (_btIsgOnaylayiciMi(kullanici) || kullanici.rol === 'bakim') return true;
  return kullanici.rol === 'birim' && kullanici.birimAdi === kayit.talep.birim;
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
    ekipmanEnvanterKaydiEkleRepo(ekipmanEnvanterKaydiOlustur(temizKod, temizKod, konum));
  }
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

  if (f.durum) liste = liste.filter(t => t.durum === f.durum);
  if (f.birim) liste = liste.filter(t => t.talep.birim === f.birim);
  if (f.oncelik) liste = liste.filter(t => t.talep.oncelik === f.oncelik);

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
  _btBildirimEkle({ hedefRol: 'bakim' }, `Yeni bakım talebi (${kayit.talep.birim})`, kayit);
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

  kayit.durum = 'Reddedildi';
  kayit.redGerekcesi = gerekce;
  _btGecmisEkle(kayit, 'Reddedildi: ' + gerekce);
  bakimTalepGuncelleRepo(id, kayit);
  _btBildirimEkle({ hedefBirim: kayit.talep.birim }, 'Talep reddedildi: ' + gerekce, kayit);
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
  liste.forEach(t => {
    const b = t.talep.birim || 'Belirtilmemiş';
    if (!birimGrubu[b]) birimGrubu[b] = { birim: b, acik: 0, kapali: 0, ilaveOnlemli: 0, toplamKapanisSuresiMs: 0, kapanmisSayisi: 0 };
    if (acikDurumlar.includes(t.durum)) birimGrubu[b].acik++;
    if (t.durum === 'Kapatıldı') {
      birimGrubu[b].kapali++;
      if (t.olusturmaTarihi && t.kapanis.kapanisTarihi) {
        birimGrubu[b].toplamKapanisSuresiMs += (new Date(t.kapanis.kapanisTarihi) - new Date(t.olusturmaTarihi));
        birimGrubu[b].kapanmisSayisi++;
      }
    }
    if (t.gecmis.some(g => g.durum === 'İSG İlave Önlem İstedi')) birimGrubu[b].ilaveOnlemli++;
  });

  return {
    toplam: liste.length,
    acik: liste.filter(t => acikDurumlar.includes(t.durum)).length,
    onayBekleyen: liste.filter(t => t.durum === 'İSG Onayında').length,
    birimlerGore: Object.values(birimGrubu).map(b => Object.assign({}, b, {
      ortalamaKapanisGunu: b.kapanmisSayisi ? Math.round(b.toplamKapanisSuresiMs / b.kapanmisSayisi / 86400000) : null
    }))
  };
}
