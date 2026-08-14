// Yüklenici Yönetimi iş kuralları: evrak uygunluk hesaplama ve özet.

function _firmaZenginlestir(firma) {
  const uygunluk = uygunlukHesapla(firma.evraklar, firma.gerekliEvraklar, bugunIso());
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

  return Object.assign({}, kisi, {
    kritikSebep,
    girisSonTarih,
    uygunMu: !kritikSebep,
    durumGoruntu
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
    durum: veriler.durum || 'Aktif',
    gerekliEvraklar: veriler.gerekliEvraklar || VARSAYILAN_GEREKLI_EVRAKLAR.slice(),
    evraklar: veriler.evraklar || [],
    notlar: (veriler.notlar || '').trim()
  });
  return { basarili: true, firma: guncellenen };
}

function yukleniciFirmaSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  yukleniciFirmaSilRepo(id);
  return { basarili: true };
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
    firmaAdi: firma ? firma.firmaAdi : ''
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
    tehlikeSinifi: YUKLENICI_TEHLIKE_SINIFLARI.includes(veriler.tehlikeSinifi) ? veriler.tehlikeSinifi : 'az',
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
        tehlikeSinifi: (v.tehlikeSinifi && v.tehlikeSinifi !== 'az') ? v.tehlikeSinifi : varOlan.tehlikeSinifi,
        belgeler: Object.assign({}, varOlan.belgeler || {}, doluBelgeler),
        // pasif/ilkGiris sadece kaynak dosyada AÇIKÇA belirtilmişse (true/false,
        // undefined değil) güncellenir — belirtilmemişse mevcut değer korunur.
        pasif: v.pasif !== undefined ? v.pasif : varOlan.pasif,
        ilkGiris: v.ilkGiris !== undefined ? v.ilkGiris : varOlan.ilkGiris
      });
      guncellenenSayisi++;
    } else {
      sonNo += 1;
      const yeniKisi = kisiOlustur(Object.assign({}, v, { personelNo: 'YP' + String(sonNo).padStart(4, '0') }));
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
  const firmaAgg = {};
  const belgeAgg = {};

  kisiler.forEach(k => {
    if (yukleniciKisiSatirSinifiHesapla(k, bugun) === 'row-ok') uygunSayisi++; else uygunsuzSayisi++;

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
