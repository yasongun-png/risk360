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

function csgbDenetimKatilimcilariniKaydet(denetimId, liste) {
  const d = csgbDenetimleriTumunuGetir().find(x => x.id === denetimId);
  if (!d) return { basarili: false, hata: 'Denetim bulunamadı.' };
  csgbDenetimKaydetRepo(csgbDenetimOlustur(Object.assign({}, d, { katilimcilar: liste })));
  return { basarili: true };
}

// İSG Kurulu modülünün en son katılımcı/imza listesi olan toplantısından
// katılımcıları okur (kurul_toplantilari + kurul_imzalari; firma verisi bu
// sayfada zaten yüklü). Sadece ad soyad ve görev (kişinin unvanı) alınır;
// kuruldaki görevi ve e-posta alınmaz (kullanıcı isteği).
function csgbKurulKatilimcilariniGetir() {
  const toplantilar = oku(tenantAnahtar('kurul_toplantilari'), []);
  const imzalar = oku(tenantAnahtar('kurul_imzalari'), []);
  const sirali = toplantilar.slice().sort((a, b) => (b.tarih || '').localeCompare(a.tarih || ''));
  for (const t of sirali) {
    const satirlar = imzalar.filter(i => i.toplantiId === t.id && (i.adSoyad || '').trim());
    if (!satirlar.length) continue;
    satirlar.sort((a, b) => (Number(a.siraNo) || 0) - (Number(b.siraNo) || 0));
    return {
      toplantiTarihi: t.tarih || '',
      liste: satirlar.map(i => ({ adSoyad: i.adSoyad, gorev: i.unvan || '', eposta: '' }))
    };
  }
  return { toplantiTarihi: '', liste: [] };
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

// Birden fazla bölümü kapsayan maddeyi bölüm bazında ayrı takip edilen
// parçalara ayırır (kullanıcı isteği: "acil çıkış kapıları farklı bölümlerde,
// kireçtaşı ayrı, 1 nolu ambar ayrı"). parcalar: [{ bolum, sorumlu, termin }].
// İlk parça asıl maddenin kendisidir (id, toplantı notları ve kanıtları
// korunur); diğerleri metin/tedbir/mevzuat kopyalanarak yeni madde olur.
// Numara: <rapordaki no>-1, -2 ... Tek bulut yazımı.
async function csgbMaddeyiBol(maddeId, parcalar) {
  const liste = csgbMaddeleriTumunuGetir();
  const index = liste.findIndex(m => m.id === maddeId);
  if (index === -1) return { basarili: false, hata: 'Madde bulunamadı.' };
  const gecerli = (parcalar || []).filter(p => (p.bolum || '').trim());
  if (gecerli.length < 2) return { basarili: false, hata: 'En az iki bölüm girin.' };

  const asil = liste[index];
  const anaNo = asil.anaMaddeNo || asil.denetimMaddeNo || '';
  // Daha önce bölünmüşse kardeş parçaların numaraları dolu: yeni parçalar sona eklenir.
  const kardesNolar = liste.filter(m => m.denetimId === asil.denetimId && m.anaMaddeNo && m.anaMaddeNo === anaNo).map(m => m.denetimMaddeNo);
  let sira = 0;
  const sonrakiNo = () => {
    let no;
    do { sira++; no = anaNo ? `${anaNo}-${sira}` : String(sira); } while (kardesNolar.includes(no));
    kardesNolar.push(no);
    return no;
  };
  const kisaKonu = (asil.maddeKonusu || '').split(' — ')[0];
  const parcaKonusu = bolum => (kisaKonu ? kisaKonu + ' — ' : '') + bolum.trim();

  gecerli.forEach((p, i) => {
    const ortak = {
      anaMaddeNo: anaNo,
      bolum: p.bolum.trim(),
      maddeKonusu: parcaKonusu(p.bolum),
      sorumlu: (p.sorumlu || '').trim() || (i === 0 ? asil.sorumlu : ''),
      termin: p.termin || asil.termin
    };
    if (i === 0) {
      // İlk satır maddenin kendisi: bölünmemişse "-1" numarasını alır, zaten parçaysa numarası korunur.
      liste[index] = csgbMaddeOlustur(Object.assign({}, asil, ortak, { denetimMaddeNo: asil.anaMaddeNo ? asil.denetimMaddeNo : sonrakiNo() }));
    } else {
      liste.push(csgbMaddeOlustur(Object.assign({}, asil, ortak, {
        id: undefined, denetimMaddeNo: sonrakiNo(), durum: 'Açık', tamamlanmaYuzdesi: 0,
        kapanisTarihi: '', kanitAciklamasi: '', kanitlar: [], olusturmaTarihi: undefined
      })));
    }
  });
  const sonuc = await csgbMaddeleriYazRepo(liste);
  return { basarili: sonuc.basarili, hata: sonuc.basarili ? '' : 'Buluta yazılamadı.', parcaSayisi: gecerli.length };
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
  const ayniNo = (a, b) => !!a && String(a).toLocaleLowerCase('tr') === String(b).toLocaleLowerCase('tr');
  const hatalar = [];
  let eklenen = 0, guncellenen = 0;
  const ALANLAR = ['maddeKonusu', 'baslik', 'aciklama', 'duzelticiFaaliyet', 'yasalDayanak', 'bolum', 'sorumlu', 'termin', 'durum', 'tamamlanmaYuzdesi', 'kapanisTarihi', 'kanitAciklamasi'];
  satirlar.forEach((satir, i) => {
    const dolu = {};
    ALANLAR.forEach(a => { const v = satir[a]; if (v !== undefined && v !== null && String(v).trim() !== '') dolu[a] = typeof v === 'string' ? v.trim() : v; });
    if (dolu.durum !== undefined) dolu.durum = csgbDurumNormallestir(dolu.durum);
    const no = String(satir.denetimMaddeNo ?? '').trim();
    const ayni = x => String(x || '').toLocaleLowerCase('tr') === no.toLocaleLowerCase('tr');
    let mevcutIndex = no ? liste.findIndex(m => m.denetimId === denetimId && ayni(m.denetimMaddeNo)) : -1;
    // Excel'de "24-1, 24-2" gibi parçalar varsa ve uygulamada henüz bölünmemiş
    // "24" maddesi duruyorsa: "24" yeni kopya açılmadan ilk parçaya dönüşür
    // (id, toplantı notları ve kanıtları korunur); diğer parçalar eklenir.
    const anaNo = csgbAnaMaddeNoCikar(no);
    if (mevcutIndex === -1 && anaNo) {
      mevcutIndex = liste.findIndex(m => m.denetimId === denetimId &&
        String(m.denetimMaddeNo || '').toLocaleLowerCase('tr') === anaNo.toLocaleLowerCase('tr'));
      if (mevcutIndex !== -1) dolu.denetimMaddeNo = no;
    }
    if (mevcutIndex !== -1) {
      if (!Object.keys(dolu).length) return;
      const birlesik = Object.assign({}, liste[mevcutIndex], dolu);
      if (dolu.denetimMaddeNo) {
        birlesik.anaMaddeNo = anaNo;
        if (dolu.maddeKonusu === undefined && dolu.bolum && birlesik.maddeKonusu) birlesik.maddeKonusu = birlesik.maddeKonusu.split(' — ')[0] + ' — ' + dolu.bolum;
      }
      if (birlesik.durum === 'Kapalı' && !birlesik.kapanisTarihi) birlesik.kapanisTarihi = bugunIso();
      liste[mevcutIndex] = csgbMaddeOlustur(birlesik);
      guncellenen++;
      return;
    }
    // Parça satırında (24-2) sadece numara/bölüm/sorumlu yazılmışsa metinler ana maddeden (24 / 24-1) alınır.
    if (anaNo) {
      const kaynak = liste.find(m => m.denetimId === denetimId && (ayniNo(m.denetimMaddeNo, anaNo) || ayniNo(m.anaMaddeNo, anaNo)));
      if (kaynak) ['baslik', 'aciklama', 'duzelticiFaaliyet', 'yasalDayanak', 'termin'].forEach(a => { if (dolu[a] === undefined && kaynak[a]) dolu[a] = kaynak[a]; });
      if (kaynak && dolu.maddeKonusu === undefined && kaynak.maddeKonusu) dolu.maddeKonusu = kaynak.maddeKonusu.split(' — ')[0] + (dolu.bolum ? ' — ' + dolu.bolum : '');
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

// ---- Uygunsuzluk'tan taşınıp mükerrer olan maddeleri silme ----
// Taşıma, Excel'le ÇSGB sayfasına zaten girilmiş maddelerin yanına
// Uygunsuzluk'taki eski kayıtları da ekledi; her madde iki kez göründü.
// Kullanıcı isteği: "geri taşıma, Uygunsuzluk'tan gelenleri sil".
// Uygunsuzluk'tan gelenler, ayrı ÇSGB sayfası yayına girmeden (8629fc9,
// 2026-10-13 17:00:25 TSİ) oluşturulmuştur -- o anda ÇSGB madde deposu yoktu.
// Sadece aynı denetimde aynı Madde No'lu, sonradan girilmiş bir eşi olanlar
// silinir; eşi olmayan madde kalır.
const _CSGB_AYRI_SAYFA_BASLANGICI = Date.parse('2026-10-13T14:00:25Z');

function _csgbMaddeOlusturmaZamani(m) {
  const t = Date.parse(m.olusturmaTarihi || '');
  if (Number.isFinite(t)) return t;
  const idZamani = parseInt(String(m.id || '').slice(0, 8), 36);
  return Number.isFinite(idZamani) ? idZamani : NaN;
}

function _csgbUygunsuzluktanGelenMi(m) {
  return _csgbMaddeOlusturmaZamani(m) < _CSGB_AYRI_SAYFA_BASLANGICI;
}

// { silinecekler: [madde], kalanEsi: {silinenId: kalanId}, esiOlmayan: sayı }
function csgbUygunsuzluktanGelenMukerrerleriBul() {
  const gruplar = {};
  const tum = csgbMaddeleriTumunuGetir();
  tum.forEach(m => {
    const no = String(m.denetimMaddeNo || '').trim().toLocaleLowerCase('tr');
    if (no) (gruplar[m.denetimId + '|' + no] = gruplar[m.denetimId + '|' + no] || []).push(m);
  });
  const silinecekler = [];
  const kalanEsi = {};
  Object.values(gruplar).forEach(g => {
    const yeniler = g.filter(m => !_csgbUygunsuzluktanGelenMi(m));
    if (!yeniler.length) return;
    g.filter(_csgbUygunsuzluktanGelenMi).forEach(m => { silinecekler.push(m); kalanEsi[m.id] = yeniler[0].id; });
  });
  const esiOlmayan = tum.filter(m => _csgbUygunsuzluktanGelenMi(m) && !kalanEsi[m.id]).length;
  return { silinecekler, kalanEsi, esiOlmayan };
}

// Silinen kopyalara yazılmış toplantı notları (varsa) eşine aktarılır.
async function csgbUygunsuzluktanGelenMukerrerleriSil() {
  const { silinecekler, kalanEsi } = csgbUygunsuzluktanGelenMukerrerleriBul();
  if (!silinecekler.length) return { basarili: true, silinen: 0 };
  const yazim = await csgbMaddeleriYazRepo(csgbMaddeleriTumunuGetir().filter(m => !kalanEsi[m.id]));
  if (!yazim.basarili) return { basarili: false, hata: 'Maddeler buluta yazılamadı, hiçbir şey silinmedi.' };

  let toplantiDegisti = false;
  const toplantilar = csgbToplantilariTumunuGetir().map(t => {
    const notlar = Object.assign({}, t.maddeNotlari || {});
    Object.keys(notlar).forEach(id => {
      const hedef = kalanEsi[id];
      if (!hedef) return;
      const eklenecek = (notlar[id] || '').trim();
      const mevcut = (notlar[hedef] || '').trim();
      if (eklenecek && mevcut !== eklenecek) notlar[hedef] = mevcut ? mevcut + '\n' + eklenecek : eklenecek;
      delete notlar[id];
      toplantiDegisti = true;
    });
    return Object.assign({}, t, { maddeNotlari: notlar });
  });
  if (toplantiDegisti) await yazVeSonucuGetir(_csgbToplantiAnahtari(), toplantilar);
  return { basarili: true, silinen: silinecekler.length };
}

// Toplantı numarası: denetim içinde tarih sırasına göre 1, 2, 3... (saklanmaz,
// hesaplanır; araya geçmiş tarihli toplantı girilirse numaralar kendiliğinden düzelir).
function csgbToplantiNo(toplanti) {
  if (!toplanti) return 0;
  const sira = csgbToplantilariniGetir(toplanti.denetimId).findIndex(t => t.id === toplanti.id);
  return sira === -1 ? 0 : sira + 1;
}

function csgbToplantiSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  csgbToplantiSilRepo(id);
  return { basarili: true };
}
