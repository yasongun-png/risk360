// ÇSGB Denetimi iş kuralları.

function _csgbGunFarki(hedefIso, bugunStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(hedefIso || '')) return null;
  const [y1, a1, g1] = hedefIso.split('-').map(Number);
  const [y2, a2, g2] = bugunStr.split('-').map(Number);
  return Math.round((Date.UTC(y1, a1 - 1, g1) - Date.UTC(y2, a2 - 1, g2)) / 86400000);
}

function csgbDenetimBasligi(d) {
  return d.ad || ('ÇSGB Denetimi ' + (gunAyYil(d.raporTarihi || d.denetimTarihi) || ''));
}

function csgbToplantilariniGetir(denetimId) {
  return csgbToplantilariTumunuGetir()
    .filter(t => t.denetimId === denetimId)
    .sort((a, b) => (a.tarih || '').localeCompare(b.tarih || ''));
}

// Denetimin maddeleri, rapordaki madde numarasına göre sıralı. Her maddeye
// durumGoruntu (gecikmiş), yüzde ve tüm toplantılardaki notları tarih
// sırasıyla eklenir (toplantiNotlari: [{tarih, not}]) -- raporda madde tek
// satır, notlar alt alta görünür.
function csgbMaddeleriniGetir(denetimId) {
  const toplantilar = csgbToplantilariniGetir(denetimId);
  const bugun = bugunIso();
  return csgbMaddeleriTumunuGetir()
    .filter(m => m.denetimId === denetimId)
    .map(m => Object.assign({}, m, {
      durumGoruntu: csgbMaddeGecikmisMi(m, bugun) ? 'Gecikmiş' : m.durum,
      yuzde: csgbMaddeYuzdesi(m),
      kanitlar: Array.isArray(m.kanitlar) ? m.kanitlar : [],
      toplantiNotlari: toplantilar
        .filter(t => ((t.maddeNotlari || {})[m.id] || '').trim())
        .map(t => ({ tarih: t.tarih, not: t.maddeNotlari[m.id].trim() }))
    }))
    .sort((a, b) => csgbMaddeNoKarsilastir(a.denetimMaddeNo, b.denetimMaddeNo) || (a.olusturmaTarihi || '').localeCompare(b.olusturmaTarihi || ''));
}

// Denetimleri madde sayıları, ilerleme (madde yüzdelerinin ortalaması) ve
// son giderme tarihine kalan günle zenginleştirir. En yeni denetim üstte.
function csgbDenetimleriniGetir() {
  const bugun = bugunIso();
  return csgbDenetimleriTumunuGetir().map(d => {
    const maddeler = csgbMaddeleriniGetir(d.id);
    const gecerli = maddeler.filter(m => m.durum !== 'İptal');
    const kapali = maddeler.filter(m => m.durum === 'Kapalı').length;
    const toplantilar = csgbToplantilariniGetir(d.id);
    const sonToplanti = toplantilar[toplantilar.length - 1];
    return Object.assign({}, d, {
      baslikGoruntu: csgbDenetimBasligi(d),
      maddeSayisi: maddeler.length,
      kapaliSayisi: kapali,
      acikSayisi: gecerli.length - kapali,
      gecikmisSayisi: maddeler.filter(m => m.durumGoruntu === 'Gecikmiş').length,
      ilerlemeYuzde: gecerli.length ? Math.round(gecerli.reduce((t, m) => t + m.yuzde, 0) / gecerli.length) : 0,
      toplantiSayisi: toplantilar.length,
      sonToplantiTarihi: sonToplanti ? sonToplanti.tarih : '',
      sonrakiToplantiTarihi: sonToplanti ? sonToplanti.sonrakiToplantiTarihi : '',
      kalanGun: d.durum === 'Kapandı' ? null : _csgbGunFarki(d.sonGidermeTarihi, bugun)
    });
  }).sort((a, b) => (b.raporTarihi || b.denetimTarihi || '').localeCompare(a.raporTarihi || a.denetimTarihi || ''));
}

function csgbDenetimGetir(id) {
  return csgbDenetimleriniGetir().find(d => d.id === id) || null;
}

function csgbDenetimKaydet(veriler, duzenlenenId) {
  if (!veriler.raporTarihi && !veriler.denetimTarihi) return { basarili: false, hata: 'Rapor tarihi ya da denetim tarihi girin.' };
  const mevcut = duzenlenenId ? csgbDenetimleriTumunuGetir().find(d => d.id === duzenlenenId) : null;
  const sonGiderme = veriler.sonGidermeTarihi || csgbSonGidermeTarihiHesapla(veriler.tebligTarihi, veriler.verilenSureGun);
  const denetim = csgbDenetimOlustur(Object.assign({}, mevcut || {}, veriler, { sonGidermeTarihi: sonGiderme }));
  csgbDenetimKaydetRepo(denetim);
  return { basarili: true, denetim };
}

function csgbDenetimSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  csgbDenetimSilRepo(id);
  return { basarili: true };
}

function csgbMaddeKaydet(veriler, duzenlenenId) {
  if (!(veriler.baslik || '').trim()) return { basarili: false, hata: 'Uygunsuzluk metni zorunludur.' };
  if (!veriler.denetimId) return { basarili: false, hata: 'Denetim bulunamadı.' };
  const mevcut = duzenlenenId ? csgbMaddeGetirRepo(duzenlenenId) : null;
  const no = String(veriler.denetimMaddeNo ?? '').trim().toLocaleLowerCase('tr');
  if (no && csgbMaddeleriTumunuGetir().some(m => m.denetimId === veriler.denetimId && m.id !== duzenlenenId && String(m.denetimMaddeNo || '').toLocaleLowerCase('tr') === no)) {
    return { basarili: false, hata: `Bu denetimde "${veriler.denetimMaddeNo}" numaralı madde zaten var.` };
  }
  // Tamamlanmış maddenin tarihi korunur; yeniden açılırsa silinir.
  const kapanis = veriler.durum === 'Kapalı' ? (veriler.kapanisTarihi || (mevcut && mevcut.kapanisTarihi) || bugunIso()) : '';
  const madde = csgbMaddeOlustur(Object.assign({}, mevcut || {}, veriler, { kapanisTarihi: kapanis }));
  csgbMaddeKaydetRepo(madde);
  return { basarili: true, madde };
}

function csgbMaddeSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  csgbMaddeSilRepo(id);
  return { basarili: true };
}

// Excel'den madde aktarımı: aynı Madde No'lu madde varsa Excel'de DOLU olan
// alanlarla güncellenir, yoksa yeni madde eklenir. Tek bulut yazımı.
async function csgbMaddeleriIceAktar(denetimId, satirlar) {
  const liste = csgbMaddeleriTumunuGetir();
  const hatalar = [];
  let eklenen = 0, guncellenen = 0;
  const ALANLAR = ['maddeKonusu', 'baslik', 'aciklama', 'duzelticiFaaliyet', 'yasalDayanak', 'bolum', 'sorumlu', 'termin', 'durum', 'tamamlanmaYuzdesi', 'kapanisTarihi', 'kanitAciklamasi'];
  satirlar.forEach((satir, i) => {
    const dolu = {};
    ALANLAR.forEach(a => { const v = satir[a]; if (v !== undefined && v !== null && String(v).trim() !== '') dolu[a] = typeof v === 'string' ? v.trim() : v; });
    if (dolu.durum !== undefined) dolu.durum = csgbDurumNormallestir(dolu.durum);
    const no = String(satir.denetimMaddeNo ?? '').trim();
    const mevcutIndex = no ? liste.findIndex(m => m.denetimId === denetimId && String(m.denetimMaddeNo || '').toLocaleLowerCase('tr') === no.toLocaleLowerCase('tr')) : -1;
    if (mevcutIndex !== -1) {
      if (!Object.keys(dolu).length) return;
      const birlesik = Object.assign({}, liste[mevcutIndex], dolu);
      if (birlesik.durum === 'Kapalı' && !birlesik.kapanisTarihi) birlesik.kapanisTarihi = bugunIso();
      liste[mevcutIndex] = csgbMaddeOlustur(birlesik);
      guncellenen++;
      return;
    }
    if (!dolu.baslik) { hatalar.push(`Satır ${i + 2}: Uygunsuzluk Tanımı boş.`); return; }
    liste.push(csgbMaddeOlustur(Object.assign({}, dolu, { denetimId, denetimMaddeNo: no })));
    eklenen++;
  });
  const sonuc = (eklenen || guncellenen) ? await csgbMaddeleriYazRepo(liste) : { basarili: true };
  return { eklenen, guncellenen, hatalar, bulutBasarili: sonuc.basarili };
}

// Toplantıyı kaydeder; maddeGuncellemeleri ({id: {durum, tamamlanmaYuzdesi}})
// verilen maddeler de TEK yazımla güncellenir.
async function csgbToplantiKaydet(veriler, maddeGuncellemeleri) {
  if (!veriler.denetimId) return { basarili: false, hata: 'Denetim bulunamadı.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(veriler.tarih || '')) return { basarili: false, hata: 'Toplantı tarihi zorunludur.' };
  const mevcut = veriler.id ? csgbToplantilariTumunuGetir().find(t => t.id === veriler.id) : null;
  const maddeNotlari = {};
  Object.entries(veriler.maddeNotlari || {}).forEach(([id, not]) => { if ((not || '').trim()) maddeNotlari[id] = not.trim(); });
  const toplanti = csgbToplantiOlustur(Object.assign({}, mevcut || {}, veriler, { maddeNotlari }));
  csgbToplantiKaydetRepo(toplanti);

  const guncellemeler = maddeGuncellemeleri || {};
  if (Object.keys(guncellemeler).length) {
    const liste = csgbMaddeleriTumunuGetir().map(m => {
      const g = guncellemeler[m.id];
      if (!g) return m;
      const yeni = Object.assign({}, m, g);
      if (yeni.durum === 'Kapalı') yeni.kapanisTarihi = m.durum === 'Kapalı' ? (m.kapanisTarihi || toplanti.tarih) : toplanti.tarih;
      else yeni.kapanisTarihi = '';
      return csgbMaddeOlustur(yeni);
    });
    await csgbMaddeleriYazRepo(liste);
  }
  return { basarili: true, toplanti };
}

// ---- İlk sürümden taşıma (tek seferlik) ----
// İlk sürümde (2026-10-13, kısa süre yayında kaldı) denetim maddeleri normal
// uygunsuzluk kayıtları olarak, denetimin konuId'siyle bağlı bir uygunsuzluk
// konusunda tutuluyordu. Kullanıcı "aynı tabloyu kullanmayacağız" dediği için
// bu kayıtlar ÇSGB madde deposuna AYNI id'lerle taşınır (toplantı notları
// madde id'sine bağlı olduğundan kopmaz), uygunsuzluk tarafından silinir.

function _csgbUygunsuzlukAnahtarlari() {
  return { kayit: tenantAnahtar('uygunsuzluk_kayitlari'), konu: tenantAnahtar('uygunsuzluk_konulari') };
}

function csgbEskiSurumKayitlariniBul() {
  const a = _csgbUygunsuzlukAnahtarlari();
  const kayitlar = oku(a.kayit, []);
  const konular = oku(a.konu, []);
  return csgbDenetimleriTumunuGetir()
    .filter(d => d.konuId)
    .map(d => ({
      denetim: d,
      konu: konular.find(k => k.id === d.konuId) || null,
      kayitlar: kayitlar.filter(k => k.konuId === d.konuId)
    }))
    .filter(x => x.konu || x.kayitlar.length);
}

async function csgbEskiSurumKayitlariniTasi(denetimId) {
  const bulunan = csgbEskiSurumKayitlariniBul().find(x => x.denetim.id === denetimId);
  if (!bulunan) return { basarili: false, hata: 'Taşınacak kayıt bulunamadı.' };
  const a = _csgbUygunsuzlukAnahtarlari();
  const idler = new Set(bulunan.kayitlar.map(k => k.id));

  const maddeler = csgbMaddeleriTumunuGetir().filter(m => !idler.has(m.id));
  bulunan.kayitlar.forEach(k => maddeler.push(csgbMaddeOlustur({
    id: k.id,
    denetimId,
    denetimMaddeNo: k.denetimMaddeNo,
    maddeKonusu: k.maddeKonusu,
    baslik: k.baslik,
    aciklama: k.aciklama,
    duzelticiFaaliyet: k.duzelticiFaaliyet,
    yasalDayanak: k.yasalDayanak,
    bolum: k.bolum,
    sorumlu: k.sorumlu,
    termin: k.termin,
    // Uygunsuzluk'taki 'Onay Bekliyor' durumu ÇSGB'de yok.
    durum: k.durum === 'Onay Bekliyor' ? 'Devam Ediyor' : k.durum,
    tamamlanmaYuzdesi: k.tamamlanmaYuzdesi,
    kapanisTarihi: k.kapanisTarihi,
    kanitAciklamasi: k.kanitAciklamasi,
    kanitlar: k.kanitlar,
    olusturmaTarihi: k.olusturmaTarihi
  })));
  // Önce ÇSGB tarafına yazılır; ancak başarılıysa uygunsuzluktan silinir (veri kaybı olmasın).
  const yazim = await csgbMaddeleriYazRepo(maddeler);
  if (!yazim.basarili) return { basarili: false, hata: 'Maddeler buluta yazılamadı, hiçbir şey silinmedi.' };

  const uygKalan = oku(a.kayit, []).filter(k => !idler.has(k.id));
  await yazVeSonucuGetir(a.kayit, uygKalan);
  if (bulunan.konu) await yazVeSonucuGetir(a.konu, oku(a.konu, []).filter(k => k.id !== bulunan.konu.id));

  const denetim = Object.assign({}, bulunan.denetim);
  if (!denetim.ad && bulunan.konu) denetim.ad = bulunan.konu.ad;
  delete denetim.konuId;
  csgbDenetimKaydetRepo(csgbDenetimOlustur(denetim));
  return { basarili: true, tasinan: bulunan.kayitlar.length };
}

// ---- Mükerrer madde birleştirme ----
// Taşıma, aynı denetime Excel'le zaten girilmiş maddelerin yanına eski
// kayıtları da ekleyince her madde iki kez göründü. Aynı denetimdeki aynı
// Madde No'lu maddeler tek maddede birleştirilir.

function _csgbMaddeNoAnahtari(m) {
  const no = String(m.denetimMaddeNo || '').trim().toLocaleLowerCase('tr');
  return no ? m.denetimId + '|' + no : '';
}

function csgbMukerrerMaddeGruplari() {
  const gruplar = {};
  csgbMaddeleriTumunuGetir().forEach(m => {
    const a = _csgbMaddeNoAnahtari(m);
    if (a) (gruplar[a] = gruplar[a] || []).push(m);
  });
  return Object.values(gruplar).filter(g => g.length > 1);
}

// Kalan madde: toplantı notu olan, yoksa en ilerlemiş, eşitse en eski olan.
// Boş alanları ve kanıtları diğer kopyalardan tamamlanır; diğer kopyalara
// yazılmış toplantı notları kalan maddeye aktarılır.
async function csgbMukerrerMaddeleriBirlestir() {
  const gruplar = csgbMukerrerMaddeGruplari();
  if (!gruplar.length) return { basarili: true, birlesen: 0 };
  const toplantilar = csgbToplantilariTumunuGetir();
  const notSayisi = id => toplantilar.filter(t => ((t.maddeNotlari || {})[id] || '').trim()).length;
  const yeniId = {};
  const birlesikler = {};

  gruplar.forEach(g => {
    const sirali = g.slice().sort((a, b) =>
      notSayisi(b.id) - notSayisi(a.id) ||
      csgbMaddeYuzdesi(b) - csgbMaddeYuzdesi(a) ||
      (a.olusturmaTarihi || '').localeCompare(b.olusturmaTarihi || ''));
    const birlesik = Object.assign({}, sirali[0]);
    sirali.slice(1).forEach(m => {
      Object.keys(m).forEach(k => {
        if (k === 'kanitlar') return;
        const v = birlesik[k];
        if ((v === undefined || v === null || v === '') && m[k] !== '' && m[k] != null) birlesik[k] = m[k];
      });
      const refler = new Set((birlesik.kanitlar || []).map(x => x.ref));
      birlesik.kanitlar = (birlesik.kanitlar || []).concat((m.kanitlar || []).filter(x => x && x.ref && !refler.has(x.ref) && refler.add(x.ref)));
      yeniId[m.id] = birlesik.id;
    });
    birlesikler[birlesik.id] = csgbMaddeOlustur(birlesik);
  });

  const maddeler = csgbMaddeleriTumunuGetir()
    .filter(m => !yeniId[m.id])
    .map(m => birlesikler[m.id] || m);
  const yazim = await csgbMaddeleriYazRepo(maddeler);
  if (!yazim.basarili) return { basarili: false, hata: 'Maddeler buluta yazılamadı, hiçbir şey değişmedi.' };

  let toplantiDegisti = false;
  const yeniToplantilar = toplantilar.map(t => {
    const notlar = Object.assign({}, t.maddeNotlari || {});
    Object.keys(notlar).forEach(id => {
      const hedef = yeniId[id];
      if (!hedef) return;
      const eklenecek = (notlar[id] || '').trim();
      const mevcut = (notlar[hedef] || '').trim();
      if (eklenecek && mevcut !== eklenecek) notlar[hedef] = mevcut ? mevcut + '\n' + eklenecek : eklenecek;
      delete notlar[id];
      toplantiDegisti = true;
    });
    return Object.assign({}, t, { maddeNotlari: notlar });
  });
  if (toplantiDegisti) await yazVeSonucuGetir(_csgbToplantiAnahtari(), yeniToplantilar);

  return { basarili: true, birlesen: gruplar.length, silinen: Object.keys(yeniId).length };
}

function csgbToplantiSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  csgbToplantiSilRepo(id);
  return { basarili: true };
}
