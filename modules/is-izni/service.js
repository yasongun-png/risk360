// İş İzni iş kuralları: yaşam döngüsü (Taslak → Onay → Aktif → Kapalı) ve özet.

// bakim-talep/service.js'deki _btIsgOnaylayiciMi/_btBakimRoluMu ile aynı
// mantık — kullanıcı isteği: "isg imzası sadece İSG'ye çıksın", "ama izin
// veren bölümde hepsi çıkabilir" (barkod formunda ?rol= ile zaten
// uygulanıyordu). PC'deki İş İzni listesinde ise Bakım/İSG Onayı butonları
// hiçbir rol kontrolü olmadan HERKESE gösteriliyordu ve izinOnayVer de
// çağıranın gerçek rolünü değil, butonun gönderdiği rol parametresini
// olduğu gibi kabul ediyordu — bir Bakım/Sorumlu Bölüm kullanıcısı PC'den
// doğrudan modülü açıp İSG onayını taklit edebilirdi.
function _izIsgOnaylayiciMi(kullanici) {
  return kullaniciAdminMi(kullanici) || (kullanici.rol === 'duzenleyici' && !!kullanici.isgOnayiVerebilir);
}

function _izBakimRoluMu(kullanici) {
  return _izIsgOnaylayiciMi(kullanici) || kullanici.rol === 'bakim';
}

// PC modülü şu ana kadar hiç bildirim üretmiyordu — sadece barkod formu
// (is-izni-bildir.html _iiBildirimEkle, kendi kopyası) bildirim atıyordu.
// Kullanıcı isteği doğrultusunda ("iş izni sürecini kullanıcı dostu hale
// getir") PC'den yapılan işlemler de aynı bildirim zilini besler — aynı
// hedefRol kuralları (bakim-talep/service.js _btBildirimEkle ile aynı desen).
function _izBildirimEkle(izin, hedefRol, ekEtiket) {
  const kullanici = oturumdakiKullanici();
  const bildirimler = oku('isg_bildirimler', []);
  bildirimler.push({
    id: rastgeleId(),
    kullaniciAdi: kullanici ? kullanici.kullaniciAdi : '',
    adSoyad: kullanici ? kullanici.adSoyad : '',
    anahtar: _izinAnahtari(),
    kayitEtiketleri: [izin.izinNo + ': ' + izin.izinTuru + (ekEtiket ? ' — ' + ekEtiket : '')],
    hedefRol: hedefRol || null,
    tarih: new Date().toISOString(),
    okuyanKullaniciIdleri: []
  });
  yaz('isg_bildirimler', bildirimler.slice(-300));
}

function _izinZenginlestir(izin) {
  return Object.assign({}, izin, {
    durumGoruntu: izinDurumuHesapla(izin, new Date().toISOString()),
    suresiSaat: izinSuresiSaatHesapla(izin.baslangic, izin.bitis),
    // "Yapıldı" ve "İlgili Değil" ikisi de ele alınmış/karara bağlanmış
    // sayılır, tamamlanmayı sadece hâlâ "Kontrol Edilmedi" olanlar düşürür.
    tamamlanmaOrani: izin.kontrolMaddeleri.length
      ? Math.round(100 * izin.kontrolMaddeleri.filter(m => izinKontrolDurumuCoz(m) !== 'yapilmadi').length / izin.kontrolMaddeleri.length)
      : 0
  });
}

function izinleriGetir(aramaMetni, filtreler) {
  const f = filtreler || {};
  let liste = izinTumunuGetir().filter(k => k.durum !== 'İptal').map(_izinZenginlestir);

  if (f.izinTuru) liste = liste.filter(k => k.izinTuru === f.izinTuru);
  if (f.durum) liste = liste.filter(k => k.durumGoruntu === f.durum);
  if (f.riskSeviyesi) liste = liste.filter(k => k.riskSeviyesi === f.riskSeviyesi);

  if (aramaMetni) {
    const kucuk = aramaMetni.trim().toLowerCase();
    liste = liste.filter(k =>
      k.isTanimi.toLowerCase().includes(kucuk) ||
      (k.izinNo || '').toLowerCase().includes(kucuk) ||
      (k.bolum || '').toLowerCase().includes(kucuk) ||
      (k.lokasyon || '').toLowerCase().includes(kucuk)
    );
  }

  // Başlangıç tarihine göre sıralama, yeni açılan bir izni listenin dibine
  // atıyordu: "Yeni Talep"te başlangıç henüz girilmediği için boş kalıyor,
  // boş değer sıralamada en sona düşüyordu. Kullanıcı isteği: "en son
  // açılan her zaman en üstte olsun" — artık oluşturma tarihine göre
  // sıralanıyor, bu alan her kayıtta (Taslak dahil) hep doludur.
  return liste.sort((a, b) => (b.olusturmaTarihi || '').localeCompare(a.olusturmaTarihi || ''));
}

// Kullanıcı isteği: "barkotla yapılan girişlerle PC'den yapılan iş izni
// tutarlı olmalı" — PC'deki "+ Yeni İzin" artık barkod formundaki Mod 1
// ("Yeni Talep") ile aynı, sadece asgari alanları isteyen bir ilk adım;
// kalan alanlar izinFormunuTamamla ile ("Formu Tamamla") doldurulur.
function izinEkle(veriler) {
  const dogrulama = izinTalepDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const izinNo = izinSonrakiNoUret(izinTumunuGetir());
  // Barkod formundaki Mod 1 ile aynı: bu aşamada ayrı bir "lokasyon" alanı
  // sorulmaz, bölüm otomatik lokasyon olarak da kullanılır — aksi halde
  // izinDogrula'nın (Formu Tamamla adımında) zorunlu tuttuğu lokasyon alanı
  // hep boş kalır.
  const yeniKayit = izinOlustur(Object.assign({}, veriler, { izinNo, lokasyon: veriler.lokasyon || veriler.bolum }));
  izinEkleRepo(yeniKayit);
  // Barkod Mod 1'deki _iiBildirimEkle(yeniIzin, 'bakim', ...) ile aynı kural.
  _izBildirimEkle(yeniKayit, 'bakim', veriler.isTanimi ? veriler.isTanimi.slice(0, 60) : '');
  return { basarili: true, kayit: yeniKayit };
}

function izinGuncelle(id, veriler) {
  const dogrulama = izinDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const guncellenen = izinGuncelleRepo(id, {
    izinTuru: veriler.izinTuru,
    isTanimi: veriler.isTanimi.trim(),
    aciklama: (veriler.aciklama || '').trim(),
    bolum: veriler.bolum.trim(),
    lokasyon: veriler.lokasyon.trim(),
    yuklenici: (veriler.yuklenici || '').trim(),
    talepEden: veriler.talepEden.trim(),
    sahaSorumlusu: veriler.sahaSorumlusu.trim(),
    calisanlar: Array.isArray(veriler.calisanlar) ? veriler.calisanlar : String(veriler.calisanlar || '').split(/[;,\n|]+/).map(s => s.trim()).filter(Boolean),
    gerekliKkd: Array.isArray(veriler.gerekliKkd) ? veriler.gerekliKkd : String(veriler.gerekliKkd || '').split(/[;,\n|]+/).map(s => s.trim()).filter(Boolean),
    riskSeviyesi: veriler.riskSeviyesi || 'Orta',
    baslangic: veriler.baslangic,
    bitis: veriler.bitis,
    kontrolMaddeleri: veriler.kontrolMaddeleri,
    gazOlcumu: veriler.gazOlcumu,
    izolasyon: veriler.izolasyon,
    notlar: (veriler.notlar || '').trim()
    // onayDurumu ve durum burada KASITLI OLARAK güncellenmiyor: genel
    // düzenleme formundan doğrudan "Onaylandı"/"Aktif" yazılarak onay adımı
    // atlanamasın diye, bu iki alan yalnızca izinOnayVer/izinReddet/
    // izinAktifEt/izinDurdur/izinKapat üzerinden değişir.
  });
  if (!guncellenen) return { basarili: false, hata: 'Kayıt bulunamadı.' };
  return { basarili: true, kayit: guncellenen };
}

// "Formu Tamamla" adımı: barkod formundaki Mod 2 ile birebir aynı mantık —
// izinGuncelle'nin tüm alan kurallarını uygular, AYRICA kayıt hâlâ Taslak
// ise (ilk kez tamamlanıyorsa) durumu Onay Bekliyor'a taşır ve varsa
// çizilen "Talep Eden" imzasını (talepEdenImza — imzaUrl olabilir/olmayabilir)
// imzalar.talepEden'e yazar.
function izinFormunuTamamla(id, veriler, talepEdenImza) {
  const sonuc = izinGuncelle(id, veriler);
  if (!sonuc.basarili) return sonuc;

  const guncellemeler = {};
  const ilkTamamlamaMi = sonuc.kayit.durum === 'Taslak';
  if (ilkTamamlamaMi) guncellemeler.durum = 'Onay Bekliyor';
  if (talepEdenImza) guncellemeler.imzalar = Object.assign({}, sonuc.kayit.imzalar, { talepEden: talepEdenImza });
  if (!Object.keys(guncellemeler).length) return sonuc;

  const guncellenen = izinGuncelleRepo(id, guncellemeler);
  // Barkod Mod 2'deki _iiBildirimEkle(liste[index], 'isg', ...) ile aynı kural.
  if (ilkTamamlamaMi) _izBildirimEkle(guncellenen, 'isg', 'form tamamlandı, İSG onayı bekliyor');
  return { basarili: true, kayit: guncellenen };
}

function izinSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  izinSilRepo(id);
  return { basarili: true };
}

// Onay akışı, sırasız bir onaycı listesi üzerinden ilerler (eski uygulamadaki
// gibi) — her "Onay Ver" tıklaması listeye yeni, zaten karar verilmiş bir
// onaycı satırı ekler. Onaylayan kimliği artık serbest metinle (prompt)
// değil, oturum açmış kullanıcıdan alınır — aksi halde herhangi biri
// devtools/konsoldan veya prompt kutusuna istediği bir adı yazarak onayı
// sahteleyebilirdi.
// PC'den onay artık barkoddaki "İmza At" ile birebir aynı: gerçek çizilmiş
// bir imza gerektiriyor (bkz. ui.js _onayImzaOnayla) — kullanıcı isteği:
// "imzanın kendisi görünmüyor, formda sadece onaylandı yazıyor". imzaAdi/
// imzaUrl verilmezse (ör. eski/başka bir çağrı yolu) eskisi gibi sadece
// oturumdaki kullanıcının adıyla, görselsiz onaylanır.
// Genel onay durumunu SADECE İSG onayı ilerletir — barkoddaki "İmza At"
// ile aynı kural (bkz. is-izni-bildir.html Mod 3: yalnızca _siAktifRol
// === 'isg' durum/onayDurumu'nu değiştirir). Bakım onayı da AYNI şekilde
// kayda geçer ve kendi imza kutusunu doldurur ama izni tek başına
// "Onaylandı" yapmaz — aksi halde tek bir bakım onayı, İSG onayını
// beklemeden izni ilerletip "İSG Onayı" butonunu listeden düşürüyordu
// (kullanıcı isteği: "bakım onayını verdim, İSG onayı işlemlerden gitti").
function izinOnayVer(id, rol, imzaAdi, imzaUrl) {
  const izin = izinIdIleGetirRepo(id);
  if (!izin) return { basarili: false, hata: 'Kayıt bulunamadı.' };
  const kullanici = oturumdakiKullanici();
  if (!kullanici) return { basarili: false, hata: 'Oturum bulunamadı.' };
  if (rol === 'isg' && !_izIsgOnaylayiciMi(kullanici)) return { basarili: false, hata: 'İSG onayı verme yetkiniz yok.' };
  if (rol === 'bakim' && !_izBakimRoluMu(kullanici)) return { basarili: false, hata: 'Bakım onayı verme yetkiniz yok.' };
  const ad = (imzaAdi || '').trim() || kullanici.adSoyad;
  const yeniOnayci = Object.assign(onayciOlustur({ ad, rol, durum: 'Onaylandı' }), { onayTarihi: new Date().toISOString() });
  const onaycilar = izin.onaycilar.concat([yeniOnayci]);
  const imzalar = ['bakim', 'isg'].includes(rol)
    ? Object.assign({}, izin.imzalar, { [rol]: izinImzaVeriUret(ad, imzaUrl || '') })
    : izin.imzalar;
  const onayDurumu = rol === 'isg' ? 'Onaylandı' : izin.onayDurumu;
  const durum = rol === 'isg' ? 'Onaylandı' : izin.durum;
  const guncellenen = izinGuncelleRepo(id, { onaycilar, onayDurumu, durum, imzalar });
  // Barkod Mod 3'teki _iiBildirimEkle(guncellenen, null, ...) ile aynı kural
  // — imzalayan kim olursa olsun herkese (hedefRol yok) görünür.
  _izBildirimEkle(guncellenen, null, (rol === 'isg' ? 'İSG' : 'Bakım Personeli') + ' imzaladı');
  return { basarili: true, kayit: guncellenen };
}

function izinReddet(id, rol, sebep) {
  const izin = izinIdIleGetirRepo(id);
  if (!izin) return { basarili: false, hata: 'Kayıt bulunamadı.' };
  const kullanici = oturumdakiKullanici();
  if (!kullanici) return { basarili: false, hata: 'Oturum bulunamadı.' };
  const yeniOnayci = Object.assign(onayciOlustur({ ad: kullanici.adSoyad, rol, durum: 'Reddedildi', not: sebep }), { onayTarihi: new Date().toISOString() });
  const onaycilar = izin.onaycilar.concat([yeniOnayci]);
  const guncellenen = izinGuncelleRepo(id, { onaycilar, onayDurumu: 'Reddedildi', durum: 'Reddedildi' });
  _izBildirimEkle(guncellenen, null, 'Reddedildi: ' + sebep);
  return { basarili: true, kayit: guncellenen };
}

function izinAktifEt(id) {
  const izin = izinIdIleGetirRepo(id);
  if (!izin) return { basarili: false, hata: 'Kayıt bulunamadı.' };
  if (!['Onaylandı', 'Gerekmiyor'].includes(izin.onayDurumu)) return { basarili: false, hata: 'Onay tamamlanmadan izin aktifleştirilemez.' };
  const guncellenen = izinGuncelleRepo(id, { durum: 'Aktif' });
  return { basarili: true, kayit: guncellenen };
}

function izinDurdur(id) {
  const guncellenen = izinGuncelleRepo(id, { durum: 'Durduruldu' });
  if (!guncellenen) return { basarili: false, hata: 'Kayıt bulunamadı.' };
  return { basarili: true, kayit: guncellenen };
}

function izinKapat(id, kapanisNotu) {
  const guncellenen = izinGuncelleRepo(id, {
    durum: 'Kapalı',
    kapanisTarihi: new Date().toISOString(),
    kapanisNotu: (kapanisNotu || 'İş güvenli şekilde tamamlandı.').trim()
  });
  if (!guncellenen) return { basarili: false, hata: 'Kayıt bulunamadı.' };
  return { basarili: true, kayit: guncellenen };
}

function izinOzetiHesapla() {
  const liste = izinleriGetir('', {});
  const acikDurumlar = ['Taslak', 'Onay Bekliyor', 'Onaylandı', 'Aktif', 'Durduruldu'];
  const dortSaatSonra = new Date(Date.now() + 4 * 3600000).toISOString();

  return {
    toplam: liste.length,
    acik: liste.filter(k => acikDurumlar.includes(k.durumGoruntu)).length,
    onayBekleyen: liste.filter(k => k.durumGoruntu === 'Onay Bekliyor').length,
    onayGecikenSayisi: liste.filter(k => k.durumGoruntu === 'Onay Bekliyor' && izinBeklemeGunSayisi(k) >= IS_IZNI_GECIKME_ESIK_GUN).length,
    suresiGecen: liste.filter(k => k.durumGoruntu === 'Süresi Geçti').length,
    yuksekVeUstuRisk: liste.filter(k => acikDurumlar.includes(k.durumGoruntu) && (k.riskSeviyesi === 'Yüksek' || k.riskSeviyesi === 'Kritik')).length,
    tamamlanmaUyarilari: liste.filter(k => acikDurumlar.includes(k.durumGoruntu) && k.tamamlanmaOrani < 80).slice(0, 10),
    yakindaBitecekler: liste.filter(k => k.durum === 'Aktif' && k.bitis && k.bitis <= dortSaatSonra && k.bitis >= new Date().toISOString()).slice(0, 10),
    kritikAcikListesi: liste.filter(k => acikDurumlar.includes(k.durumGoruntu) && k.riskSeviyesi === 'Kritik').slice(0, 10)
  };
}
