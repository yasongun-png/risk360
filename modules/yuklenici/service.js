// Yüklenici Yönetimi iş kuralları: evrak uygunluk hesaplama ve özet.

// Firma uygunluğu sadece YUKLENICI_FIRMA_GEREKLI_EVRAKLAR'a göre: diğer
// türdeki evrakların süresi geçse bile firma "Uygun Değil" olmaz. Sözleşmeler
// formda sadece Var/Yok seçildiği için tarih dikkate alınmaz.
function _firmaZenginlestir(firma) {
  const istenenEvraklar = (firma.evraklar || [])
    .filter(e => YUKLENICI_FIRMA_GEREKLI_EVRAKLAR.includes(e.tur))
    .map(e => Object.assign({}, e, { gecerlilikTarihi: '' }));
  const uygunluk = uygunlukHesapla(istenenEvraklar, YUKLENICI_FIRMA_GEREKLI_EVRAKLAR, bugunIso());
  return Object.assign({}, firma, uygunluk);
}

// Kişi uygunluğu artık sabit belge checklist'ine göre hesaplanır (bkz.
// model.js yukleniciKisiKritikSebepHesapla/yukleniciGirebilecegiSonTarihHesapla
// — eski uygulamadaki computeCriticalReason/computeGirebilecegiSonTarih ile
// birebir). "İptal" durumundaki kişiler için belge kontrolü çalıştırılmaz.
function _kisiZenginlestir(kisi) {
  const kritikSebep = kisi.durum === 'İptal' ? null : yukleniciKisiKritikSebepHesapla(kisi, bugunIso());
  const girisSonTarih = yukleniciGirebilecegiSonTarihHesapla(kisi, bugunIso());

  let durumGoruntu = kisi.durum;
  if (kisi.durum !== 'İptal') {
    if (!kritikSebep) durumGoruntu = 'Girişe Uygun';
    else durumGoruntu = kritikSebep.girisEngeli ? 'Girişe Kapalı' : 'Eksik Evrak';
  }

  // Kullanıcı isteği: eski uygulamada 16 belgenin tamamının durumu tek
  // tabloda görünüyordu; kritikSebep sadece İLK (öncelikli) eksik belgeyi
  // döndürdüğü için modal açmadan "kaç belge eksik" sorusu cevapsız
  // kalıyordu — bkz. ui.js kisileriCiz "(+N diğer)" etiketi.
  const bugun = bugunIso();
  const tanimlar = kisi.durum === 'İptal' ? [] : yukleniciGecerliBelgeTanimlari(kisi.personelTuru);
  const eksikBelgeSayisi = tanimlar.filter(b => !yukleniciBelgeUygunMu(b, (kisi.belgeler || {})[b.id], kisi.tehlikeSinifi, bugun)).length;

  return Object.assign({}, kisi, {
    kritikSebep,
    girisSonTarih,
    uygunMu: !kritikSebep,
    durumGoruntu,
    eksikBelgeSayisi
  });
}

// ---- Firmalar ----

function yukleniciFirmalariniGetir(aramaMetni) {
  let liste = yukleniciFirmalariTumunuGetir().map(_firmaZenginlestir);
  if (!aramaMetni) return liste;
  const kucuk = aramaMetni.trim().toLowerCase();
  return liste.filter(f => f.firmaAdi.toLowerCase().includes(kucuk) || (f.firmaNo || '').toLowerCase().includes(kucuk));
}

function yukleniciFirmaEkle(veriler) {
  const dogrulama = yukleniciFirmaDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const firmaNo = sonrakiNoUret('YF', yukleniciFirmalariTumunuGetir(), 'firmaNo');
  const yeniFirma = firmaOlustur(Object.assign({}, veriler, { firmaNo }));
  yukleniciFirmaEkleRepo(yeniFirma);
  return { basarili: true, firma: yeniFirma };
}

function yukleniciFirmaGuncelle(id, veriler) {
  const dogrulama = yukleniciFirmaDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const guncellenen = yukleniciFirmaGuncelleRepo(id, {
    firmaAdi: veriler.firmaAdi.trim(),
    vergiNo: (veriler.vergiNo || '').trim(),
    faaliyetAlani: (veriler.faaliyetAlani || '').trim(),
    yetkiliAdi: (veriler.yetkiliAdi || '').trim(),
    telefon: (veriler.telefon || '').trim(),
    eposta: (veriler.eposta || '').trim(),
    riskSeviyesi: veriler.riskSeviyesi || 'Orta',
    tehlikeSinifi: yukleniciTehlikeSinifiNormallestir(veriler.tehlikeSinifi),
    durum: veriler.durum || 'Aktif',
    gerekliEvraklar: veriler.gerekliEvraklar || VARSAYILAN_GEREKLI_EVRAKLAR.slice(),
    evraklar: veriler.evraklar || [],
    notlar: (veriler.notlar || '').trim()
  });
  const guncellenenPersonelSayisi = guncellenen ? yukleniciFirmaTehlikeSinifiniPersoneleUygula(guncellenen) : 0;
  return { basarili: true, firma: guncellenen, guncellenenPersonelSayisi };
}

// Kullanıcı isteği: firmaya işyeri tehlike sınıfı girildiyse o firmanın
// personelinin kaydındaki tehlike sınıfı da buradan alınsın. Sadece farklı
// olan kişiler, tek yazımda güncellenir. Dönüş: güncellenen kişi sayısı.
function yukleniciFirmaTehlikeSinifiniPersoneleUygula(firma) {
  if (!firma || !firma.tehlikeSinifi) return 0;
  const kisiler = yukleniciKisileriTumunuGetir();
  let sayi = 0;
  const yeni = kisiler.map(k => {
    if (k.firmaId !== firma.id || k.tehlikeSinifi === firma.tehlikeSinifi) return k;
    sayi++;
    return Object.assign({}, k, { tehlikeSinifi: firma.tehlikeSinifi });
  });
  if (sayi) _yukleniciKisileriKaydet(yeni);
  return sayi;
}

function _yukleniciFirmaTehlikeSinifi(firmaId) {
  const firma = firmaId ? yukleniciFirmaIdIleGetirRepo(firmaId) : null;
  return firma && firma.tehlikeSinifi ? firma.tehlikeSinifi : '';
}

// Kişi kaydedilirken: firmanın tehlike sınıfı girildiyse o geçerlidir.
function _yukleniciKisiTehlikeSinifi(veriler) {
  return _yukleniciFirmaTehlikeSinifi(veriler.firmaId) ||
    (YUKLENICI_TEHLIKE_SINIFLARI.includes(veriler.tehlikeSinifi) ? veriler.tehlikeSinifi : 'az');
}

// Kullanıcı isteği: "daha önce benzer bir firma girildiyse en azından ilk
// 3-4 harfi, kullanıcıyı firma eklemede uyar; bir sürü aynı firma girilmiş".
// Büyük/küçük harf, Türkçe karakter, boşluk ve noktalama yok sayılır.
// Benzer: normalize ad aynı ilk 4 (ad kısaysa 3) harfle başlıyor ya da biri
// diğerini içeriyor. Tam aynı olanlar listenin başında.
function yukleniciBenzerFirmalariBul(firmaAdi, haricId) {
  const n = _basligiNormallestir(firmaAdi);
  if (n.length < 3) return [];
  const onEk = n.slice(0, 4);
  return yukleniciFirmalariTumunuGetir()
    .filter(f => f.id !== haricId)
    .map(f => ({ firma: f, fn: _basligiNormallestir(f.firmaAdi) }))
    .filter(({ fn }) => fn && (fn.startsWith(onEk) || (fn.length >= 4 && n.length >= 4 && (fn.includes(n) || n.includes(fn)))))
    .sort((a, b) => (b.fn === n) - (a.fn === n) || a.firma.firmaAdi.localeCompare(b.firma.firmaAdi, 'tr'))
    .map(({ firma, fn }) => Object.assign({}, firma, { ayniAd: fn === n }));
}

// ---- Mükerrer firmaları birleştirme ----
// Kullanıcı isteği: aynı firma defalarca eklenmiş ("Bursa Merkez Çevre
// Laboratuvarı" / "BURSA MERKEZ ÇEVRE LABORATUVAR"). Kesin grup: normalize
// ad aynı ya da biri diğerini içeriyor (≥4 harf). Olası grup: sadece ilk 4
// harf aynı — bu geniş olduğu için ayrı listelenir, kullanıcı kontrol eder.
function yukleniciMukerrerFirmaGruplariniBul() {
  const firmalar = yukleniciFirmalariTumunuGetir();
  const kisiler = yukleniciKisileriTumunuGetir();
  const araclar = yukleniciAraclariTumunuGetir();
  const n = firmalar.map(f => _basligiNormallestir(f.firmaAdi));

  const ebeveyn = firmalar.map((_, i) => i);
  const kok = i => { while (ebeveyn[i] !== i) { ebeveyn[i] = ebeveyn[ebeveyn[i]]; i = ebeveyn[i]; } return i; };
  const birlestir = (a, b) => { const ka = kok(a), kb = kok(b); if (ka !== kb) ebeveyn[kb] = ka; };

  for (let i = 0; i < firmalar.length; i++) {
    for (let j = i + 1; j < firmalar.length; j++) {
      if (!n[i] || !n[j]) continue;
      if (n[i] === n[j] || (n[i].length >= 4 && n[j].length >= 4 && (n[i].includes(n[j]) || n[j].includes(n[i])))) birlestir(i, j);
    }
  }
  const kesinKok = firmalar.map((_, i) => kok(i));

  // Olası: kesin grupların üstüne ilk-4-harf eşleşmesi eklenir; en az iki
  // farklı kesin gruptan (ya da tekil firmadan) oluşanlar olası sayılır.
  for (let i = 0; i < firmalar.length; i++) {
    for (let j = i + 1; j < firmalar.length; j++) {
      if (n[i].length >= 3 && n[j].length >= 3 && n[i].slice(0, 4) === n[j].slice(0, 4)) birlestir(i, j);
    }
  }

  const firmaBilgisi = i => {
    const f = firmalar[i];
    return Object.assign({}, f, {
      personelSayisi: kisiler.filter(k => k.firmaId === f.id).length,
      aracSayisi: araclar.filter(a => a.firmaId === f.id).length
    });
  };
  // Grup içinde en çok personeli olan başta (varsayılan ana firma), sonra en eski kayıt.
  const sirala = liste => liste.sort((a, b) => (b.personelSayisi + b.aracSayisi) - (a.personelSayisi + a.aracSayisi) ||
    (a.olusturmaTarihi || '').localeCompare(b.olusturmaTarihi || ''));

  const kesinHarita = {};
  const olasiHarita = {};
  firmalar.forEach((_, i) => {
    (kesinHarita[kesinKok[i]] = kesinHarita[kesinKok[i]] || []).push(i);
    (olasiHarita[kok(i)] = olasiHarita[kok(i)] || []).push(i);
  });

  const kesin = Object.values(kesinHarita).filter(g => g.length > 1).map(g => sirala(g.map(firmaBilgisi)));
  const olasi = Object.values(olasiHarita)
    .filter(g => new Set(g.map(i => kesinKok[i])).size > 1)
    .map(g => sirala(g.map(firmaBilgisi)));
  const adSirala = (a, b) => a[0].firmaAdi.localeCompare(b[0].firmaAdi, 'tr');
  return { kesin: kesin.sort(adSirala), olasi: olasi.sort(adSirala) };
}

function _yukleniciEvrakAnahtari(e) {
  return [_basligiNormallestir(e.tur), e.verilisTarihi || '', e.gecerlilikTarihi || ''].join('|');
}

// Birleştirme yapılmadan önce onay penceresinde gösterilecek sayılar.
function yukleniciFirmaBirlestirmeOzeti(anaId, kopyaIdleri) {
  const kopyalar = new Set(kopyaIdleri.filter(id => id !== anaId));
  const firmalar = yukleniciFirmalariTumunuGetir();
  const ana = firmalar.find(f => f.id === anaId);
  const kopyaFirmalar = firmalar.filter(f => kopyalar.has(f.id));
  if (!ana || !kopyaFirmalar.length) return null;
  const kopyaAdlari = new Set(kopyaFirmalar.map(f => _basligiNormallestir(f.firmaAdi)));
  kopyaAdlari.delete(_basligiNormallestir(ana.firmaAdi));

  const kisiler = yukleniciKisileriTumunuGetir();
  const anaKisiAdlari = new Set(kisiler.filter(k => k.firmaId === anaId).map(k => _basligiNormallestir(k.adSoyad)));
  const tasinacakKisiler = kisiler.filter(k => kopyalar.has(k.firmaId));
  const anaEvraklar = new Set((ana.evraklar || []).map(_yukleniciEvrakAnahtari));
  const yeniEvrak = new Set();
  kopyaFirmalar.forEach(f => (f.evraklar || []).forEach(e => { const a = _yukleniciEvrakAnahtari(e); if (!anaEvraklar.has(a)) yeniEvrak.add(a); }));

  return {
    ana,
    kopyaFirmalar,
    personel: tasinacakKisiler.length,
    ayniIsimliPersonel: tasinacakKisiler.filter(k => anaKisiAdlari.has(_basligiNormallestir(k.adSoyad))).length,
    arac: yukleniciAraclariTumunuGetir().filter(a => kopyalar.has(a.firmaId)).length,
    ziyaretci: yukleniciZiyaretcileriTumunuGetir().filter(z => kopyaAdlari.has(_basligiNormallestir(z.firma))).length,
    evrak: yeniEvrak.size
  };
}

// Kopya firmaları ana firmaya birleştirir: personel/araçlar ana firmaya
// taşınır (firmaId + firmaAdi), ziyaretçi kayıtlarındaki firma adı
// güncellenir, evraklar ve gerekli evrak listeleri birleştirilir, ana firmada
// boş kalan bilgiler kopyalardan doldurulur, sonra kopyalar silinir. Her
// liste tek seferde yazılır (bkz. yukleniciKisilerTopluEkle gerekçesi).
function yukleniciFirmalariBirlestir(anaId, kopyaIdleri) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  const ozet = yukleniciFirmaBirlestirmeOzeti(anaId, kopyaIdleri);
  if (!ozet) return { basarili: false, hata: 'Birleştirilecek firma bulunamadı.' };

  const { ana, kopyaFirmalar } = ozet;
  const kopyalar = new Set(kopyaFirmalar.map(f => f.id));
  const kopyaAdlari = new Set(kopyaFirmalar.map(f => _basligiNormallestir(f.firmaAdi)));
  kopyaAdlari.delete(_basligiNormallestir(ana.firmaAdi));
  const iz = yukleniciIzBilgisi();

  // Ana firmanın yeni hâli
  const evrakAnahtarlari = new Set();
  const evraklar = [];
  [ana].concat(kopyaFirmalar).forEach(f => (f.evraklar || []).forEach(e => {
    const a = _yukleniciEvrakAnahtari(e);
    if (evrakAnahtarlari.has(a)) return;
    evrakAnahtarlari.add(a);
    evraklar.push(e);
  }));
  const gerekliEvraklar = Array.from(new Set([ana].concat(kopyaFirmalar).reduce((t, f) => t.concat(f.gerekliEvraklar || []), [])));
  const yeniAna = Object.assign({}, ana, { evraklar, gerekliEvraklar, guncellemeTarihi: iz.zaman, guncelleyen: iz.kim });
  ['vergiNo', 'faaliyetAlani', 'yetkiliAdi', 'telefon', 'eposta', 'tehlikeSinifi', 'notlar'].forEach(alan => {
    if (yeniAna[alan]) return;
    const kaynak = kopyaFirmalar.find(f => f[alan]);
    if (kaynak) yeniAna[alan] = kaynak[alan];
  });

  let degisenKisi = 0;
  const kisiler = yukleniciKisileriTumunuGetir().map(k => {
    if (!kopyalar.has(k.firmaId) && !(k.firmaId === anaId && yeniAna.tehlikeSinifi && k.tehlikeSinifi !== yeniAna.tehlikeSinifi)) return k;
    degisenKisi++;
    return Object.assign({}, k, {
      firmaId: anaId,
      firmaAdi: yeniAna.firmaAdi,
      tehlikeSinifi: yeniAna.tehlikeSinifi || k.tehlikeSinifi,
      guncellemeTarihi: iz.zaman,
      guncelleyen: iz.kim
    });
  });
  const araclar = yukleniciAraclariTumunuGetir().map(a => kopyalar.has(a.firmaId)
    ? Object.assign({}, a, { firmaId: anaId, firmaAdi: yeniAna.firmaAdi, guncellemeTarihi: iz.zaman, guncelleyen: iz.kim })
    : a);
  const ziyaretciler = yukleniciZiyaretcileriTumunuGetir().map(z => kopyaAdlari.has(_basligiNormallestir(z.firma))
    ? Object.assign({}, z, { firma: yeniAna.firmaAdi })
    : z);
  const firmalar = yukleniciFirmalariTumunuGetir()
    .filter(f => !kopyalar.has(f.id))
    .map(f => f.id === anaId ? yeniAna : f);

  if (degisenKisi) _yukleniciKisileriKaydet(kisiler);
  if (ozet.arac) _yukleniciAraclariKaydet(araclar);
  if (ozet.ziyaretci) _yukleniciZiyaretcileriKaydet(ziyaretciler);
  _yukleniciFirmalariKaydet(firmalar);

  return { basarili: true, firma: yeniAna, silinenFirma: kopyaFirmalar.length, personel: ozet.personel, arac: ozet.arac, ziyaretci: ozet.ziyaretci };
}

function yukleniciFirmaSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  yukleniciFirmaSilRepo(id);
  return { basarili: true };
}

// ---- Mail için eksiklik metni ----
// Kullanıcı isteği: personel formlarında "Mail için Eksiklikler" — kişinin
// adı ve eksik/süresi dolmuş/yaklaşan belgeleri, maile yapıştırılacak düz
// yazı olarak. Diploma/MYK gibi karşılıklı belgelerden biri uygunsa diğeri
// eksik sayılmaz; Firma Eğitimi hiç listelenmez.
function yukleniciKisiEksikBelgeleri(kisi) {
  const bugun = bugunIso();
  const belgeler = kisi.belgeler || {};
  const tanimlar = yukleniciGecerliBelgeTanimlari(kisi.personelTuru);
  const uygunMu = b => yukleniciBelgeUygunMu(b, belgeler[b.id], kisi.tehlikeSinifi, bugun);
  const satirlar = [];
  tanimlar.forEach(b => {
    // Kullanıcı isteği: Firma Eğitimi'ni yüklenici değil biz veriyoruz — mailde istenmez.
    if (b.id === 'firmaEgitimi') return;
    const kayit = belgeler[b.id] || {};
    if (uygunMu(b)) {
      // Kullanıcı isteği: Geçici Görevlendirme geçerliyse yeterli, "doluyor" yazılmaz.
      if (b.id === 'geciciGorev') return;
      const exp = yukleniciBelgeBitisTarihiHesapla(b, kayit, kisi.tehlikeSinifi);
      const kalan = exp ? gunFarkiHesapla(exp, bugun) : null;
      if (kalan !== null && kalan <= 30) satirlar.push(`${b.ad}: süresi ${formatTarihGoster(exp)} tarihinde doluyor`);
      return;
    }
    const es = b.karsilikliId ? tanimlar.find(t => t.id === b.karsilikliId) : null;
    if (es && uygunMu(es)) return;
    if (es) { // ikisi de yoksa tek satır
      if (tanimlar.indexOf(es) < tanimlar.indexOf(b)) return;
      satirlar.push(`${b.ad} veya ${es.ad}: yok`);
      return;
    }
    const exp = yukleniciBelgeBitisTarihiHesapla(b, kayit, kisi.tehlikeSinifi);
    if (b.tur === 'egitim' && kayit.base && !(kayit.egitmen || '').trim() && (!exp || exp >= bugun)) satirlar.push(`${b.ad}: eğitmen bilgisi eksik`);
    else if (exp && exp < bugun) satirlar.push(`${b.ad}: süresi dolmuş (${formatTarihGoster(exp)})`);
    else if (exp && !kayit.base && b.tur !== 'tarih-aralik') satirlar.push(`${b.ad}: veriliş tarihi girilmemiş`);
    else if (kayit.base && kayit.base > bugun) satirlar.push(`${b.ad}: tarihi ileri bir tarih (${formatTarihGoster(kayit.base)})`);
    else satirlar.push(`${b.ad}: yok`);
  });
  return satirlar;
}

// kisiler: [{ adSoyad, firmaId, belgeler, tehlikeSinifi, personelTuru, ilkGiris }]
function yukleniciEksiklikMailMetni(kisiler) {
  const gruplar = [];
  kisiler.forEach(k => {
    let g = gruplar.find(x => x.firmaId === (k.firmaId || ''));
    if (!g) gruplar.push(g = { firmaId: k.firmaId || '', kisiler: [] });
    g.kisiler.push(k);
  });

  const bloklar = gruplar.map(g => {
    const firma = g.firmaId ? yukleniciFirmaIdIleGetirRepo(g.firmaId) : null;
    const satirlar = [];
    // Kullanıcı isteği: firma sözleşmeleri (İSG uzmanı / hekim) mailde istenmez.
    if (firma) satirlar.push(`Firma: ${firma.firmaAdi}`);
    g.kisiler.forEach(k => {
      const eksikler = yukleniciKisiEksikBelgeleri(k);
      satirlar.push('', `${(k.adSoyad || '').trim() || '(Ad soyad girilmedi)'}:`);
      if (eksikler.length) eksikler.forEach(s => satirlar.push(`- ${s}`));
      else satirlar.push('- Eksik belge yok');
    });
    return satirlar.join('\n');
  });

  return ['Merhaba,', '', 'Aşağıdaki personelin eksik belgelerinin tamamlanarak tarafımıza iletilmesini rica ederiz.', '', bloklar.join('\n\n' + '-'.repeat(40) + '\n\n'), '', 'Bagfaş İş Güvenliği Birimi', 'Tel: 0 266 714 10 00 - Dahili: 374'].join('\n');
}

// ---- Kişiler ----

function yukleniciKisileriniGetir(aramaMetni, filtreler) {
  const f = filtreler || {};
  let liste = yukleniciKisileriTumunuGetir().map(_kisiZenginlestir);

  if (f.firmaId) liste = liste.filter(k => k.firmaId === f.firmaId);
  if (f.durum) liste = liste.filter(k => k.durumGoruntu === f.durum);

  if (aramaMetni) {
    const kucuk = aramaMetni.trim().toLowerCase();
    liste = liste.filter(k =>
      k.adSoyad.toLowerCase().includes(kucuk) ||
      k.firmaAdi.toLowerCase().includes(kucuk) ||
      (k.personelNo || '').toLowerCase().includes(kucuk)
    );
  }

  return liste;
}

function yukleniciKisiEkle(veriler) {
  const dogrulama = yukleniciKisiDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const firma = yukleniciFirmaIdIleGetirRepo(veriler.firmaId);
  const personelNo = sonrakiNoUret('YP', yukleniciKisileriTumunuGetir(), 'personelNo');
  const yeniKisi = kisiOlustur(Object.assign({}, veriler, {
    personelNo,
    firmaAdi: firma ? firma.firmaAdi : '',
    tehlikeSinifi: _yukleniciKisiTehlikeSinifi(veriler)
  }));
  yukleniciKisiEkleRepo(yeniKisi);
  return { basarili: true, kisi: yeniKisi };
}

function yukleniciKisiGuncelle(id, veriler) {
  const dogrulama = yukleniciKisiDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const firma = yukleniciFirmaIdIleGetirRepo(veriler.firmaId);
  const guncellenen = yukleniciKisiGuncelleRepo(id, {
    adSoyad: veriler.adSoyad.trim(),
    kimlikNo: (veriler.kimlikNo || '').trim(),
    firmaId: veriler.firmaId,
    firmaAdi: firma ? firma.firmaAdi : '',
    bolum: (veriler.bolum || '').trim(),
    gorev: (veriler.gorev || '').trim(),
    telefon: (veriler.telefon || '').trim(),
    durum: veriler.durum || 'Onay Bekliyor',
    tehlikeSinifi: _yukleniciKisiTehlikeSinifi(veriler),
    personelTuru: YUKLENICI_PERSONEL_TURLERI.includes(veriler.personelTuru) ? veriler.personelTuru : 'teknik',
    pasif: !!veriler.pasif,
    ilkGiris: !!veriler.ilkGiris,
    belgeler: veriler.belgeler && typeof veriler.belgeler === 'object' ? veriler.belgeler : yukleniciBosBelgeler(),
    gerekliEvraklar: veriler.gerekliEvraklar || VARSAYILAN_GEREKLI_EVRAKLAR.slice(),
    evraklar: veriler.evraklar || [],
    sonrakiKontrolTarihi: veriler.sonrakiKontrolTarihi || gunEkle(bugunIso(), 30),
    notlar: (veriler.notlar || '').trim()
  });
  return { basarili: true, kisi: guncellenen };
}

function yukleniciKisiSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  yukleniciKisiSilRepo(id);
  return { basarili: true };
}

// Diğer uygulamadan (ör. eski standalone app) toplu içe aktarım için TEK
// yazımlı ekle-veya-güncelle — bkz. egitimPlaniTopluIceAktar'daki race-durumu
// gerekçesi. Aynı firma + ad soyad (normalize edilmiş) eşleşen bir kişi
// zaten varsa YENİ KAYIT AÇMAZ; belgelerini birleştirir (yeni gelen dolu
// alanlar eskinin üzerine yazılır, yeni satırda boş bırakılan alanlar
// mevcut veriyi SİLMEZ). Bu sayede önce "sade" formatla (sadece 3 bitiş
// tarihi) içe aktarılan bir kişi, sonra "Detaylı Excel" ile tekrar içe
// aktarıldığında SGK/Adli Sicil/KKD/Geçici Görev/MYK gibi eksik kalan
// alanlar mükerrer kayıt açmadan tamamlanabilir.
function yukleniciKisilerTopluEkle(kayitlarListesi) {
  const gecerliler = kayitlarListesi.filter(v => (v.adSoyad || '').trim() && v.firmaId);
  if (!gecerliler.length) return { basarili: 0, guncellenen: 0, atlanan: kayitlarListesi.length };

  const mevcut = yukleniciKisileriTumunuGetir();
  const anahtarUret = (firmaId, adSoyad) => firmaId + '|' + _basligiNormallestir(adSoyad);
  const indeksHaritasi = {};
  mevcut.forEach((k, i) => { indeksHaritasi[anahtarUret(k.firmaId, k.adSoyad)] = i; });

  let sonNo = 0;
  mevcut.forEach(k => { const m = String(k.personelNo || '').match(/(\d+)$/); if (m) sonNo = Math.max(sonNo, parseInt(m[1], 10)); });

  const sonucListe = mevcut.slice();
  let eklenenSayisi = 0;
  let guncellenenSayisi = 0;
  const iz = yukleniciIzBilgisi();

  gecerliler.forEach(v => {
    const anahtar = anahtarUret(v.firmaId, v.adSoyad);
    const mevcutIndeks = indeksHaritasi[anahtar];

    if (mevcutIndeks !== undefined) {
      const varOlan = sonucListe[mevcutIndeks];
      // Yeni satırda gerçekten dolu olan belgeler eskinin üzerine yazılır;
      // yeni satırın boş bıraktığı belgeler eski değerinde kalır. NOT:
      // {base:''} gibi anahtarı var ama değeri boş-string olan alanlar da
      // "dolu" sayılmamalı — yoksa boş veri, mevcut iyi veriyi ezer.
      const doluBelgeler = {};
      Object.entries(v.belgeler || {}).forEach(([id, deger]) => {
        const gercektenDolu = deger && Object.entries(deger).some(([alan, alanDegeri]) => alan !== 'ay' && alanDegeri !== '' && alanDegeri != null);
        if (gercektenDolu) doluBelgeler[id] = deger;
      });
      sonucListe[mevcutIndeks] = Object.assign({}, varOlan, {
        tehlikeSinifi: _yukleniciFirmaTehlikeSinifi(v.firmaId) || ((v.tehlikeSinifi && v.tehlikeSinifi !== 'az') ? v.tehlikeSinifi : varOlan.tehlikeSinifi),
        belgeler: Object.assign({}, varOlan.belgeler || {}, doluBelgeler),
        // pasif/ilkGiris sadece kaynak dosyada AÇIKÇA belirtilmişse (true/false,
        // undefined değil) güncellenir — belirtilmemişse mevcut değer korunur.
        pasif: v.pasif !== undefined ? v.pasif : varOlan.pasif,
        ilkGiris: v.ilkGiris !== undefined ? v.ilkGiris : varOlan.ilkGiris,
        guncellemeTarihi: iz.zaman,
        guncelleyen: iz.kim
      });
      guncellenenSayisi++;
    } else {
      sonNo += 1;
      const yeniKisi = kisiOlustur(Object.assign({}, v, { personelNo: 'YP' + String(sonNo).padStart(4, '0'), tehlikeSinifi: _yukleniciKisiTehlikeSinifi(v) }));
      yeniKisi.olusturan = iz.kim;
      sonucListe.push(yeniKisi);
      indeksHaritasi[anahtar] = sonucListe.length - 1;
      eklenenSayisi++;
    }
  });

  _yukleniciKisileriKaydet(sonucListe);
  return { basarili: eklenenSayisi, guncellenen: guncellenenSayisi, atlanan: kayitlarListesi.length - gecerliler.length };
}

// ---- Araç / Ekipman ----

function _aracZenginlestir(arac) {
  const uygunluk = aracUygunlukHesapla(arac, bugunIso());
  return Object.assign({}, arac, uygunluk);
}

function yukleniciAraclariniGetir(aramaMetni) {
  let liste = yukleniciAraclariTumunuGetir().map(_aracZenginlestir);
  if (!aramaMetni) return liste;
  const kucuk = aramaMetni.trim().toLowerCase();
  return liste.filter(a => a.kimlik.toLowerCase().includes(kucuk) || a.firmaAdi.toLowerCase().includes(kucuk));
}

function yukleniciAracEkle(veriler) {
  const dogrulama = yukleniciAracDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const firma = yukleniciFirmaIdIleGetirRepo(veriler.firmaId);
  const aracNo = sonrakiNoUret('YA', yukleniciAraclariTumunuGetir(), 'aracNo');
  const yeniArac = aracOlustur(Object.assign({}, veriler, { aracNo, firmaAdi: firma ? firma.firmaAdi : '' }));
  yukleniciAracEkleRepo(yeniArac);
  return { basarili: true, arac: yeniArac };
}

function yukleniciAracGuncelle(id, veriler) {
  const dogrulama = yukleniciAracDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const firma = yukleniciFirmaIdIleGetirRepo(veriler.firmaId);
  const guncellenen = yukleniciAracGuncelleRepo(id, {
    firmaId: veriler.firmaId,
    firmaAdi: firma ? firma.firmaAdi : '',
    tur: veriler.tur,
    kimlik: veriler.kimlik.trim(),
    ptmVar: veriler.ptmVar,
    ptmTarih: veriler.ptmTarih || '',
    ptmGecerlilik: veriler.ptmGecerlilik || '',
    ruhsat: veriler.ruhsat,
    zmsTarih: veriler.zmsTarih || '',
    zmsGecerlilik: veriler.zmsGecerlilik || '',
    tuvTarih: veriler.tuvTarih || '',
    tuvGecerlilik: veriler.tuvGecerlilik || '',
    pasif: !!veriler.pasif,
    notlar: (veriler.notlar || '').trim()
  });
  return { basarili: true, arac: guncellenen };
}

function yukleniciAracSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  yukleniciAracSilRepo(id);
  return { basarili: true };
}

// ---- Ziyaretçiler ----

function yukleniciZiyaretcileriniGetir() {
  // Eski uygulama: en yeni tarih üstte (bkz. ziyaretciTabloYukle).
  return yukleniciZiyaretcileriTumunuGetir().slice().sort((a, b) => (b.tarih || '').localeCompare(a.tarih || ''));
}

function yukleniciZiyaretciEkle(veriler) {
  const dogrulama = yukleniciZiyaretciDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const yeniZiyaretci = ziyaretciOlustur(veriler);
  yukleniciZiyaretciEkleRepo(yeniZiyaretci);
  return { basarili: true, ziyaretci: yeniZiyaretci };
}

function yukleniciZiyaretciSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  yukleniciZiyaretciSilRepo(id);
  return { basarili: true };
}

// ---- Detaylı Arama ----
// Eski uygulamadaki s_run handler ile birebir: firma/personel(kimlik) metin
// araması (bulanık eşleşme) + opsiyonel belge türü filtresiyle, KİŞİ BAZLI
// değil BELGE BAZLI satırlar üretir — bir kişinin N belgesi varsa N satır
// oluşur (bkz. yuklenici-standalone.html satır 3761-3837).

const YUKLENICI_ARAMA_ARAC_BELGE_ADLARI = {
  ptm: 'Periyodik Teknik Muayene',
  ruhsat: 'Ruhsat',
  zms: 'Zorunlu Mali Sorumluluk Sigortası',
  tuv: 'TÜVTÜRK Muayenesi'
};

function yukleniciDetayliArama(aramaMetni, belgeFiltre) {
  const bugun = bugunIso();
  const sonuclar = [];

  yukleniciKisileriTumunuGetir().forEach(k => {
    if (aramaMetni && !yukleniciFuzzyEslesir(k.firmaAdi + ' ' + k.adSoyad, aramaMetni)) return;

    yukleniciGecerliBelgeTanimlari(k.personelTuru).forEach(b => {
      if (belgeFiltre && belgeFiltre !== b.ad) return;
      const kayit = (k.belgeler || {})[b.id] || {};
      const uygun = yukleniciBelgeUygunMu(b, kayit, k.tehlikeSinifi, bugun);
      const exp = yukleniciBelgeBitisTarihiHesapla(b, kayit, k.tehlikeSinifi);
      sonuclar.push({
        tur: 'Personel', firma: k.firmaAdi, kimlik: k.adSoyad, belge: b.ad,
        belgeTarihiDeger: b.tur === 'var-yok' ? (kayit.deger || '') : (kayit.base || ''),
        gecerlilik: exp || '',
        durum: uygun ? 'Uygun' : 'Uygun Değil'
      });
    });
  });

  yukleniciAraclariTumunuGetir().forEach(a => {
    if (aramaMetni && !yukleniciFuzzyEslesir(a.firmaAdi + ' ' + a.kimlik, aramaMetni)) return;
    const zengin = _aracZenginlestir(a);
    const belgeler = [
      { id: 'ptm', deger: a.ptmVar, base: a.ptmTarih, exp: zengin.ptmExp, uygun: zengin.ptmOk },
      { id: 'ruhsat', deger: a.ruhsat, base: '', exp: '', uygun: zengin.ruhsatOk },
      { id: 'zms', deger: '', base: a.zmsTarih, exp: zengin.zmsExp, uygun: zengin.zmsOk },
      { id: 'tuv', deger: '', base: a.tuvTarih, exp: zengin.tuvExp, uygun: zengin.tuvOk }
    ];
    belgeler.forEach(b => {
      const ad = YUKLENICI_ARAMA_ARAC_BELGE_ADLARI[b.id];
      if (belgeFiltre && belgeFiltre !== ad) return;
      sonuclar.push({
        tur: a.tur || 'Araç', firma: a.firmaAdi, kimlik: `${a.tur || 'Araç'} – ${a.kimlik}`, belge: ad,
        belgeTarihiDeger: b.deger || b.base || '',
        gecerlilik: b.exp || '',
        durum: b.uygun ? 'Uygun' : 'Uygun Değil'
      });
    });
  });

  return sonuclar;
}

// ---- Dashboard / Aksiyon Merkezi ----
// Eski uygulamadaki loadDashboard/renderDashboardTables ile birebir aynı
// mantık: personel+araç genel uygunluk sayaçları, öncelik sıralı aksiyon
// listesi, firma bazlı ve belge bazlı sorun özetleri (bkz.
// yuklenici-standalone.html satır 2464-2560, 2756-2855).
function yukleniciDashboardVerisiHesapla() {
  const bugun = bugunIso();
  const kisiler = yukleniciKisileriTumunuGetir();
  const araclar = yukleniciAraclariTumunuGetir();

  let uygunSayisi = 0;
  let uygunsuzSayisi = 0;
  const aksiyonSatirlari = [];
  // Kullanıcı isteği: eski uygulamadaki Dashboard kapsam filtresindeki "Tam
  // Uygun" seçeneği geri getirildi — aksiyonSatirlari sadece SORUNLU
  // kayıtları tuttuğu için (aşağıdaki erken return), bu filtre için ayrı bir
  // liste tutulur.
  const tamUygunSatirlari = [];
  const firmaAgg = {};
  const belgeAgg = {};

  kisiler.forEach(k => {
    if (yukleniciKisiSatirSinifiHesapla(k, bugun) === 'row-ok') {
      uygunSayisi++;
      tamUygunSatirlari.push({ id: k.id, tur: 'Personel', firma: k.firmaAdi || '', kimlik: k.adSoyad, pasif: !!k.pasif });
    } else {
      uygunsuzSayisi++;
    }

    const kritik = yukleniciKisiKritikSebepHesapla(k, bugun);
    if (!kritik) return;

    const firma = k.firmaAdi || '';
    firmaAgg[firma] = firmaAgg[firma] || { kritik: 0, uyari: 0 };
    if (kritik.girisEngeli) firmaAgg[firma].kritik++; else firmaAgg[firma].uyari++;

    const belgeAnahtari = kritik.belgeLabel || 'Diğer';
    belgeAgg[belgeAnahtari] = (belgeAgg[belgeAnahtari] || 0) + 1;

    aksiyonSatirlari.push({
      id: k.id,
      tur: 'Personel',
      firma,
      kimlik: k.adSoyad,
      durum: kritik.girisEngeli ? 'Giriş Engeli' : 'Yakında Dolacak',
      sebep: kritik.sebep,
      sonTarih: kritik.sonTarih,
      kalanGun: kritik.kalanGun,
      pasif: !!k.pasif
    });
  });

  // Eski uygulama araç için aksiyon merkezi satırı üretmiyor, sadece genel
  // uygun/uygunsuz sayacına dahil ediyor (bkz. loadDashboard satır 2522-2529).
  araclar.forEach(a => {
    if (_aracZenginlestir(a).uygunMu) uygunSayisi++; else uygunsuzSayisi++;
  });

  aksiyonSatirlari.sort((x, y) => {
    const xk = x.durum === 'Giriş Engeli' ? 0 : 1;
    const yk = y.durum === 'Giriş Engeli' ? 0 : 1;
    if (xk !== yk) return xk - yk;
    return (x.kalanGun ?? 999999) - (y.kalanGun ?? 999999);
  });

  const firmaBazliSorun = Object.entries(firmaAgg)
    .map(([firma, o]) => ({ firma, kritik: o.kritik, uyari: o.uyari, toplam: o.kritik + o.uyari }))
    .sort((a, b) => b.toplam - a.toplam)
    .slice(0, 10);

  const belgeBazliSorun = Object.entries(belgeAgg)
    .map(([belge, adet]) => ({ belge, adet }))
    .sort((a, b) => b.adet - a.adet)
    .slice(0, 15);

  return {
    toplamPersonel: kisiler.length,
    toplamArac: araclar.length,
    uygunSayisi,
    uygunsuzSayisi,
    aksiyonSatirlari,
    tamUygunSatirlari,
    firmaBazliSorun,
    belgeBazliSorun
  };
}

function yukleniciKisiPasifDurumunuDegistir(id, pasif) {
  const kisi = yukleniciKisiIdIleGetirRepo(id);
  if (!kisi) return { basarili: false };
  yukleniciKisiGuncelleRepo(id, { pasif: !!pasif });
  return { basarili: true };
}

// ---- Kayıtlar (Personel + Araç birleşik liste) ----
// Eski uygulamadaki "Kayıtlar" sekmesinin karşılığı (bkz.
// yuklenici-standalone.html satır 2273-2367) — iki farklı varlığı TEK
// tabloda, en yeni üstte gösterir.
function yukleniciKayitlariniGetir(aramaMetni) {
  const bugun = bugunIso();
  const personelSatirlari = yukleniciKisileriTumunuGetir().map(k => {
    // NOT: eski uygulamada satır RENGİ (getRowClassForPersonel) Firma
    // Eğitimi'ni hariç tutar, ama "Uygun/Toplam" SÜTUNU (loadKayitlar'daki
    // ok/total) TÜM belgeleri (Firma Eğitimi dahil) sayar — ikisi FARKLI
    // hesaplardır. Önceden ikisi de aynı (firmaEgitimi hariç) filtreyi
    // kullanıyordu, bu da eski uygulamaya göre daha düşük bir oran gösteriyordu.
    const sinif = yukleniciKisiSatirSinifiHesapla(k, bugun);
    const tumTanimlar = yukleniciGecerliBelgeTanimlari(k.personelTuru);
    const uygunSayisi = tumTanimlar.filter(b => yukleniciBelgeUygunMu(b, (k.belgeler || {})[b.id], k.tehlikeSinifi, bugun)).length;
    const firmaEgitimi = (k.belgeler || {}).firmaEgitimi || {};
    return {
      kind: 'personel', id: k.id, tur: 'Personel', firma: k.firmaAdi, kimlik: k.adSoyad,
      uygunSayisi, toplamSayisi: tumTanimlar.length, sinif, pasif: !!k.pasif, ilkGiris: !!k.ilkGiris,
      egitmen: firmaEgitimi.egitmen || '—', kayitTarihi: (k.olusturmaTarihi || '').slice(0, 10),
      kaynak: k
    };
  });

  const aracSatirlari = yukleniciAraclariTumunuGetir().map(a => {
    const zengin = _aracZenginlestir(a);
    const uygunSayisi = [zengin.ptmOk, zengin.ruhsatOk, zengin.zmsOk, zengin.tuvOk].filter(Boolean).length;
    return {
      kind: 'arac', id: a.id, tur: a.tur || 'Araç', firma: a.firmaAdi, kimlik: `${a.tur || 'Araç'} – ${a.kimlik}`,
      uygunSayisi, toplamSayisi: 4, sinif: yukleniciAracSatirSinifiHesapla(zengin), pasif: !!a.pasif, ilkGiris: false,
      egitmen: '—', kayitTarihi: (a.olusturmaTarihi || '').slice(0, 10),
      kaynak: zengin
    };
  });

  let liste = personelSatirlari.concat(aracSatirlari).sort((x, y) => (y.kayitTarihi || '').localeCompare(x.kayitTarihi || ''));

  if (aramaMetni) {
    const kucuk = aramaMetni.trim().toLowerCase();
    liste = liste.filter(r => r.firma.toLowerCase().includes(kucuk) || r.kimlik.toLowerCase().includes(kucuk));
  }
  return liste;
}

// Seçili kayıtları TEK yazımla siler (kind bazında toplu filtre + tek
// kaydet) — N ayrı sil çağrısı yerine, aynı race-durumu riskini taşımaz
// (bkz. egitimPlaniTopluIceAktar'daki gerekçe).
function yukleniciKayitlariToplusil(secililer) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  const personelIdleri = new Set(secililer.filter(s => s.kind === 'personel').map(s => s.id));
  const aracIdleri = new Set(secililer.filter(s => s.kind === 'arac').map(s => s.id));
  if (personelIdleri.size) _yukleniciKisileriKaydet(yukleniciKisileriTumunuGetir().filter(k => !personelIdleri.has(k.id)));
  if (aracIdleri.size) _yukleniciAraclariKaydet(yukleniciAraclariTumunuGetir().filter(a => !aracIdleri.has(a.id)));
  return { basarili: true, silinen: personelIdleri.size + aracIdleri.size };
}

// ---- Özet ----

function yukleniciOzetiHesapla() {
  const firmalar = yukleniciFirmalariniGetir('');
  const kisiler = yukleniciKisileriniGetir('', {});
  const araclar = yukleniciAraclariniGetir('');

  const grupla = (liste, secici) => {
    const sonuc = {};
    liste.forEach(item => {
      const anahtar = secici(item) || 'Belirtilmemiş';
      sonuc[anahtar] = (sonuc[anahtar] || 0) + 1;
    });
    return Object.entries(sonuc).sort((a, b) => b[1] - a[1]);
  };

  // Firma hâlâ serbest evrak modeli kullanıyor (eksikEvraklar/suresiGecenEvraklar
  // dizileri), kişi ise artık sabit checklist tabanlı kritikSebep kullanıyor
  // (bkz. _kisiZenginlestir) — bu yüzden ikisi farklı şekilde sayılır.
  const eksikEvrakToplam = firmalar.reduce((t, f) => t + f.eksikEvraklar.length, 0) + kisiler.filter(k => k.kritikSebep).length;
  const suresiGecenToplam = firmalar.reduce((t, f) => t + f.suresiGecenEvraklar.length, 0);

  return {
    toplamFirma: firmalar.length,
    aktifFirma: firmalar.filter(f => f.durum === 'Aktif').length,
    toplamKisi: kisiler.length,
    girisUygunKisi: kisiler.filter(k => k.durumGoruntu === 'Girişe Uygun').length,
    girisKapaliKisi: kisiler.filter(k => k.durumGoruntu === 'Girişe Kapalı').length,
    toplamArac: araclar.length,
    uygunArac: araclar.filter(a => a.uygunMu).length,
    eksikEvrakToplam,
    suresiGecenToplam,
    uygunlukOrani: kisiler.length ? Math.round((kisiler.filter(k => k.uygunMu).length / kisiler.length) * 100) : 0,
    riskeGoreFirma: grupla(firmalar, f => f.riskSeviyesi),
    firmayaGoreKisi: grupla(kisiler, k => k.firmaAdi),
    uygunOlmayanFirmalar: firmalar.filter(f => !f.uygunMu),
    uygunOlmayanKisiler: kisiler.filter(k => !k.uygunMu),
    uygunOlmayanAraclar: araclar.filter(a => !a.uygunMu)
  };
}
