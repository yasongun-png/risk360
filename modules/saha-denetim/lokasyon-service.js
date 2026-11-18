// Lokasyon Bazlı Saha Denetimi — veri erişimi ve iş kuralları.
// Anahtarlar tenantAnahtar() ile firmaya özeldir (bkz. lokasyon-model.js başı).

function _ldLokAnahtar() { return tenantAnahtar('saha_lokasyonlari'); }
function _ldDenAnahtar() { return tenantAnahtar('saha_lokasyon_denetimleri'); }
function _ldAcilEkipmanAnahtar() { return tenantAnahtar('acil_durum_ekipmanlari'); }

// ---------- Lokasyonlar ----------

function ldLokasyonlariGetir() {
  return (oku(_ldLokAnahtar(), []) || []).map(ldLokasyonOlustur).sort((a, b) =>
    a.bolum.localeCompare(b.bolum, 'tr') || (a.sira - b.sira) || a.lokasyon.localeCompare(b.lokasyon, 'tr', { numeric: true }));
}

function ldLokasyonGetir(id) {
  return ldLokasyonlariGetir().find(l => l.id === id) || null;
}

// Barkoddan okunan metin: lokasyon kodu (LOK-0001) ya da id.
function ldLokasyonKodlaBul(kod) {
  const k = String(kod || '').trim().toUpperCase();
  if (!k) return null;
  return ldLokasyonlariGetir().find(l => l.kod.toUpperCase() === k || l.id.toUpperCase() === k) || null;
}

function ldLokasyonKaydet(veri) {
  const hatalar = {};
  if (!(veri.bolum || '').trim()) hatalar.bolum = 'Bölüm zorunludur.';
  if (!(veri.lokasyon || '').trim()) hatalar.lokasyon = 'Lokasyon / kat zorunludur.';
  if (!veri.kategoriler || !veri.kategoriler.length) hatalar.kategoriler = 'En az bir kontrol kategorisi seçin.';
  if (Object.keys(hatalar).length) return { basarili: false, hatalar };

  const liste = oku(_ldLokAnahtar(), []) || [];
  const ayni = liste.find(l => l.id !== veri.id && ldNormalize(l.bolum) === ldNormalize(veri.bolum) && ldNormalize(l.lokasyon) === ldNormalize(veri.lokasyon));
  if (ayni) return { basarili: false, hatalar: { lokasyon: `Bu bölümde aynı adlı bir lokasyon zaten var (${ayni.kod}).` } };

  if (veri.id) {
    const i = liste.findIndex(l => l.id === veri.id);
    if (i < 0) return { basarili: false, hatalar: { genel: 'Lokasyon bulunamadı.' } };
    liste[i] = ldLokasyonOlustur(Object.assign({}, liste[i], veri, { kod: liste[i].kod }));
    yaz(_ldLokAnahtar(), liste);
    return { basarili: true, lokasyon: liste[i] };
  }
  const yeni = ldLokasyonOlustur(Object.assign({}, veri, { kod: ldSonrakiLokasyonKodu(liste) }));
  liste.push(yeni);
  yaz(_ldLokAnahtar(), liste);
  return { basarili: true, lokasyon: yeni };
}

function ldLokasyonSil(id) {
  if (typeof _silmeYetkisiKontrolEt === 'function' && !_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  yaz(_ldLokAnahtar(), (oku(_ldLokAnahtar(), []) || []).filter(l => l.id !== id));
  return { basarili: true };
}

// ---------- Acil durum ekipmanları (Acil Durum modülünden, salt okunur) ----------

function _ldAcilEkipmanlari() {
  return oku(_ldAcilEkipmanAnahtar(), []) || [];
}

function ldAcilBolumleri() {
  return Array.from(new Set(_ldAcilEkipmanlari().map(e => (e.bolum || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'tr'));
}

function ldAcilLokasyonlari(bolum) {
  const nb = ldNormalize(bolum);
  return Array.from(new Set(_ldAcilEkipmanlari()
    .filter(e => !nb || ldNormalize(e.bolum) === nb)
    .map(e => (e.lokasyon || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'tr', { numeric: true }));
}

// Lokasyonla eşleşen ekipmanlar: bölüm aynı ve ekipmanın lokasyon metni
// lokasyon/kat adını içeriyor (ya da tersi). Ör. lokasyon "Zemin Kat",
// ekipman lokasyonu "Zemin kat - doğu kapısı" -> eşleşir.
function ldLokasyonEkipmanlari(bolum, lokasyon) {
  const nb = ldNormalize(bolum);
  const nl = ldNormalize(lokasyon);
  return _ldAcilEkipmanlari().filter(e => {
    if (ldNormalize(e.bolum) !== nb) return false;
    if (!nl) return true;
    const el = ldNormalize(e.lokasyon);
    return el && (el.includes(nl) || nl.includes(el));
  }).sort((a, b) => (a.tur || '').localeCompare(b.tur || '', 'tr') || (a.ekipmanNo || '').localeCompare(b.ekipmanNo || '', 'tr', { numeric: true }));
}

function _ldBugun() { return new Date().toISOString().slice(0, 10); }

// Acil Durum > Ekipman kontrollerinin o anki durumunun özeti (denetim
// raporuna "Acil Durum Ekipmanları" bölümü olarak girer).
function ldEkipmanOzetiCikar(bolum, lokasyon) {
  const bugun = _ldBugun();
  const soruMetni = (tur, id) => {
    const liste = (typeof EKIPMAN_KONTROL_SORULARI !== 'undefined' && EKIPMAN_KONTROL_SORULARI[tur]) || [];
    const s = liste.find(x => x.id === id);
    return s ? s.soru : id;
  };
  return ldLokasyonEkipmanlari(bolum, lokasyon).map(e => {
    const cevaplar = e.kontrolCevaplari || {};
    const uygunDegil = Object.keys(cevaplar).filter(id => cevaplar[id] === 'Uygun Değil').map(id => soruMetni(e.tur, id));
    const malzemeCevap = e.malzemeKontrolleri || {};
    (Array.isArray(e.malzemeListesi) ? e.malzemeListesi : []).forEach(m => {
      if (malzemeCevap[m.id] === 'Uygun Değil') uygunDegil.push('Eksik/uygun değil: ' + m.ad);
    });
    const kontrolYok = !e.sonKontrol;
    const gecikmis = !!(e.sonrakiKontrol && e.sonrakiKontrol < bugun);
    return {
      id: e.id, ekipmanNo: e.ekipmanNo || '', tur: e.tur || '', lokasyon: e.lokasyon || '',
      sonKontrol: e.sonKontrol || '', sonrakiKontrol: e.sonrakiKontrol || '', kontrolEden: e.kontrolEden || '',
      durum: e.durum || '', bulgular: e.bulgular || '', uygunDegil,
      gecikmis, kontrolYok,
      sonucMetni: kontrolYok ? 'Kontrol kaydı yok' : gecikmis ? 'Kontrol süresi geçmiş' : uygunDegil.length ? 'Uygunsuzluk var' : 'Uygun'
    };
  });
}

// ---------- Denetimler ----------

function _ldDenetimListesi() {
  return (oku(_ldDenAnahtar(), []) || []).map(ldDenetimOlustur);
}

function _ldDenetimListesiYaz(liste) {
  yaz(_ldDenAnahtar(), liste);
}

function ldDenetimleriGetir() {
  return _ldDenetimListesi().sort((a, b) => (b.tarih || '').localeCompare(a.tarih || '') || (b.denetimNo || '').localeCompare(a.denetimNo || ''));
}

function ldDenetimGetir(id) {
  return _ldDenetimListesi().find(d => d.id === id) || null;
}

function _ldDenetimDegistir(id, degistir) {
  const liste = _ldDenetimListesi();
  const i = liste.findIndex(d => d.id === id);
  if (i < 0) return null;
  const sonuc = degistir(liste[i]);
  if (sonuc === false) return null;
  _ldDenetimListesiYaz(liste);
  return liste[i];
}

function ldDenetimKaydet(veri) {
  const hatalar = {};
  if (!veri.tarih) hatalar.tarih = 'Kontrol tarihi zorunludur.';
  if (!(veri.denetciler || '').trim()) hatalar.denetciler = 'Kontrol Eden zorunludur.';
  if (Object.keys(hatalar).length) return { basarili: false, hatalar };

  if (veri.id) {
    const d = _ldDenetimDegistir(veri.id, d => {
      ['baslik', 'tarih', 'bitisTarihi', 'denetciler', 'eslikEdenler', 'kapsam'].forEach(k => { if (k in veri) d[k] = (veri[k] || '').trim(); });
    });
    return d ? { basarili: true, denetim: d } : { basarili: false, hatalar: { genel: 'Kontrol bulunamadı.' } };
  }
  const liste = _ldDenetimListesi();
  const yeni = ldDenetimOlustur(Object.assign({}, veri, { denetimNo: ldSonrakiDenetimNo(liste, veri.tarih) }));
  liste.push(yeni);
  _ldDenetimListesiYaz(liste);
  return { basarili: true, denetim: yeni };
}

function ldDenetimAlanGuncelle(id, alanlar) {
  const d = _ldDenetimDegistir(id, d => { Object.assign(d, alanlar); });
  return d ? { basarili: true, denetim: d } : { basarili: false };
}

function ldDenetimSil(id) {
  if (typeof _silmeYetkisiKontrolEt === 'function' && !_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  _ldDenetimListesiYaz(_ldDenetimListesi().filter(d => d.id !== id));
  return { basarili: true };
}

// Lokasyona giriş (barkodla ya da listeden). Aynı denetimde bu lokasyon
// zaten ziyaret edildiyse yeni ziyaret açılmaz, mevcut olan döner.
function ldZiyaretBaslat(denetimId, lokasyonId, yontem) {
  const lok = ldLokasyonGetir(lokasyonId);
  if (!lok) return { basarili: false, hata: 'Lokasyon bulunamadı.' };
  let ziyaret = null;
  let yeniMi = false;
  const d = _ldDenetimDegistir(denetimId, d => {
    if (d.tamamlandiMi) return false;
    ziyaret = d.ziyaretler.find(z => z.lokasyonId === lokasyonId) || null;
    if (ziyaret) return false;
    ziyaret = ldZiyaretOlustur({
      lokasyonId: lok.id, bolum: lok.bolum, lokasyon: lok.lokasyon, kod: lok.kod,
      kategoriler: lok.kategoriler, girisYontemi: yontem || 'manuel',
      ekipmanOzeti: ldEkipmanOzetiCikar(lok.bolum, lok.lokasyon), ekipmanOzetiTarihi: new Date().toISOString()
    });
    d.ziyaretler.push(ziyaret);
    yeniMi = true;
  });
  if (!ziyaret) {
    const mevcut = ldDenetimGetir(denetimId);
    if (mevcut && mevcut.tamamlandiMi) return { basarili: false, hata: 'Bu kontrol tamamlanmış; yeni lokasyon eklenemez.' };
    return { basarili: false, hata: 'Kontrol bulunamadı.' };
  }
  return { basarili: true, ziyaret, yeniMi, denetim: d || ldDenetimGetir(denetimId) };
}

function ldZiyaretSil(denetimId, ziyaretId) {
  return !!_ldDenetimDegistir(denetimId, d => { d.ziyaretler = d.ziyaretler.filter(z => z.id !== ziyaretId); });
}

function _ldZiyaretDegistir(denetimId, ziyaretId, degistir) {
  let hedef = null;
  _ldDenetimDegistir(denetimId, d => {
    hedef = d.ziyaretler.find(z => z.id === ziyaretId);
    if (!hedef) return false;
    return degistir(hedef, d);
  });
  return hedef;
}

function ldZiyaretAlanGuncelle(denetimId, ziyaretId, alanlar) {
  return _ldZiyaretDegistir(denetimId, ziyaretId, z => { Object.assign(z, alanlar); });
}

function ldZiyaretEkipmanYenile(denetimId, ziyaretId) {
  return _ldZiyaretDegistir(denetimId, ziyaretId, z => {
    z.ekipmanOzeti = ldEkipmanOzetiCikar(z.bolum, z.lokasyon);
    z.ekipmanOzetiTarihi = new Date().toISOString();
  });
}

// Kategori çıkarılınca o kategorinin cevapları (aktarılmamış olanlar) silinir.
function ldZiyaretKategorileriGuncelle(denetimId, ziyaretId, kategoriler) {
  return _ldZiyaretDegistir(denetimId, ziyaretId, z => {
    z.kategoriler = kategoriler.slice();
    Object.keys(z.cevaplar || {}).forEach(a => {
      const c = z.cevaplar[a];
      if (!c.serbest && !kategoriler.includes(c.k) && !c.uygId) delete z.cevaplar[a];
    });
  });
}

// madde: ldZiyaretMaddeleri'nden gelen öğe (soru/mevzuat kopyalanır).
function ldCevapGuncelle(denetimId, ziyaretId, anahtar, madde, degisiklik) {
  return _ldZiyaretDegistir(denetimId, ziyaretId, z => {
    z.cevaplar = z.cevaplar || {};
    const onceki = z.cevaplar[anahtar] || { k: madde.kategori.id, s: madde.soru, m: madde.mevzuat, sonuc: '', not: '', oneri: '', risk: '', fotolar: [] };
    const yeni = Object.assign({}, onceki, degisiklik);
    // Hiç bilgi kalmadıysa kaydı tutmaya gerek yok.
    const bos = !yeni.sonuc && !yeni.not && !yeni.oneri && !(yeni.fotolar || []).length && !yeni.uygId && !yeni.serbest;
    if (bos) delete z.cevaplar[anahtar]; else z.cevaplar[anahtar] = yeni;
  });
}

// Kategorideki cevaplanmamış maddelerin hepsini "Uygun" yapar (sahada hız için).
function ldKategoriTumunuUygun(denetimId, ziyaretId, kategoriId) {
  return _ldZiyaretDegistir(denetimId, ziyaretId, z => {
    const kat = ldKategoriGetir(kategoriId);
    if (!kat || !kat.sorular) return false;
    z.cevaplar = z.cevaplar || {};
    kat.sorular.forEach(s => {
      const a = kategoriId + '.' + s.id;
      const c = z.cevaplar[a];
      if (c && c.sonuc) return;
      z.cevaplar[a] = Object.assign({ k: kategoriId, s: s.soru, m: s.mevzuat, not: '', oneri: '', risk: '', fotolar: [] }, c || {}, { sonuc: 'Uygun' });
    });
  });
}

function ldSerbestBulguEkle(denetimId, ziyaretId, tespit, kategoriId, mevzuat) {
  const id = rastgeleId();
  const anahtar = 'serbest.' + id;
  const kat = ldKategoriGetir(kategoriId);
  const z = _ldZiyaretDegistir(denetimId, ziyaretId, z => {
    z.cevaplar = z.cevaplar || {};
    z.cevaplar[anahtar] = {
      k: kat ? kat.id : LD_SERBEST_KATEGORI.id, s: (tespit || '').trim(), m: (mevzuat || '').trim(),
      sonuc: 'Uygun Değil', not: '', oneri: '', risk: '', fotolar: [], serbest: true
    };
  });
  return z ? anahtar : null;
}

function ldSerbestBulguSil(denetimId, ziyaretId, anahtar) {
  return _ldZiyaretDegistir(denetimId, ziyaretId, z => { delete z.cevaplar[anahtar]; });
}

// ---------- Doldurulmuş Excel formunu içe aktarma ----------
// Kullanıcı isteği (2026-11-18): "doldurulan Excel formu tekrar sisteme
// yüklenebilsin". satirlar: SheetJS sheet_to_json({header:1}) dizisi (A..H).
// Gizli H sütunundaki kodlarla eşlenir: LD-FORM-1 (form imzası), lokasyon
// kodu (LOK-0001), madde kodu ("kategori.soruId"), "serbest" (listede olmayan
// tespit), "not" (lokasyon notu). Boş bırakılan sonuçlar mevcut cevabı
// silmez; uygunsuzluğa aktarılmış maddeler değiştirilmez.
function _ldSonucNormallestir(v) {
  const s = ldNormalize(v).replace(/ı/g, 'i').replace(/ğ/g, 'g');
  if (!s) return '';
  if (/^(uygun degil|uygunsuz|ud|x|hayir)$/.test(s)) return 'Uygun Değil';
  if (/^(uygun|u|evet|ok|tamam)$/.test(s)) return 'Uygun';
  if (/^(uygulanamaz|u d|ilgili degil|na|n a)$/.test(s)) return 'Uygulanamaz';
  return null;
}

function _ldRiskNormallestir(v) {
  const s = ldNormalize(v);
  if (!s || typeof RISK_SEVIYELERI === 'undefined') return '';
  return RISK_SEVIYELERI.find(r => ldNormalize(r) === s) || '';
}

function ldKontrolFormuLokasyonuBul(satirlar) {
  const hucre = (r, c) => String(((satirlar[r] || [])[c]) ?? '').trim();
  for (let r = 0; r < Math.min(8, satirlar.length); r++) {
    const kod = hucre(r, 7);
    if (/^LOK-\d+$/i.test(kod)) { const l = ldLokasyonKodlaBul(kod); if (l) return l; }
    const m = hucre(r, 4).match(/\((LOK-\d+)\)/i);
    if (m) { const l = ldLokasyonKodlaBul(m[1]); if (l) return l; }
  }
  // "Tüm maddeler" formu: Bölüm (B) ve Lokasyon (E) elle yazıldıysa adla bulunur.
  for (let r = 0; r < Math.min(8, satirlar.length); r++) {
    if (ldNormalize(hucre(r, 0)) !== ldNormalize('Bölüm')) continue;
    const bolum = ldNormalize(hucre(r, 1));
    const lok = ldNormalize(hucre(r, 4).replace(/\(LOK-\d+\)/i, ''));
    if (!bolum || !lok) return null;
    return ldLokasyonlariGetir().find(l => ldNormalize(l.bolum) === bolum && ldNormalize(l.lokasyon) === lok) || null;
  }
  return null;
}

function ldKontrolFormuMu(satirlar) {
  return (satirlar || []).some(r => String((r || [])[7] ?? '').trim() === 'LD-FORM-1');
}

function ldKontrolFormuSatirlariniIsle(denetimId, satirlar) {
  const sonuc = { lokasyon: null, islenen: 0, bulgu: 0, serbest: 0, atlanan: [], hata: '' };
  if (!ldKontrolFormuMu(satirlar)) { sonuc.hata = 'Bu sayfa uygulamadan indirilen saha kontrol formu değil.'; return sonuc; }
  const lok = ldKontrolFormuLokasyonuBul(satirlar);
  if (!lok) { sonuc.hata = 'Lokasyon bulunamadı: formdaki Bölüm ve Lokasyon/Kat tanımlı bir lokasyonla eşleşmiyor (tüm maddeler formunda bu iki alanı lokasyon listesindeki gibi yazın).'; return sonuc; }
  sonuc.lokasyon = lok;
  const giris = ldZiyaretBaslat(denetimId, lok.id, 'excel');
  if (!giris.basarili) { sonuc.hata = giris.hata; return sonuc; }
  const ziyaretId = giris.ziyaret.id;
  const metin = (r, c) => String((r || [])[c] ?? '').trim();
  const ziyaret = () => ldDenetimGetir(denetimId).ziyaretler.find(x => x.id === ziyaretId);
  const eklenecekKategoriler = new Set();

  satirlar.forEach((r, i) => {
    const kod = metin(r, 7);
    if (!kod || kod === 'Kod' || kod === 'LD-FORM-1' || kod === 'lokasyon' || /^LOK-/i.test(kod)) return;
    if (kod === 'not') {
      if (metin(r, 1)) ldZiyaretAlanGuncelle(denetimId, ziyaretId, { lokasyonNotu: metin(r, 1) });
      return;
    }
    const sonucDeger = _ldSonucNormallestir(metin(r, 3));
    const tespit = metin(r, 4), oneri = metin(r, 5), risk = _ldRiskNormallestir(metin(r, 6));
    if (kod === 'serbest') {
      const s = tespit || metin(r, 1);
      if (!s) return;
      const anahtar = ldSerbestBulguEkle(denetimId, ziyaretId, s, LD_SERBEST_KATEGORI.id, metin(r, 2));
      const madde = anahtar && ldZiyaretMaddeleri(ziyaret()).find(m => m.anahtar === anahtar);
      if (madde && (oneri || risk)) ldCevapGuncelle(denetimId, ziyaretId, anahtar, madde, { oneri, risk });
      if (anahtar) { sonuc.serbest++; sonuc.bulgu++; }
      return;
    }
    const [kid, sid] = kod.split('.');
    const kat = ldKategoriGetir(kid);
    const soru = kat && kat.sorular && kat.sorular.find(s => s.id === sid);
    if (!soru) { sonuc.atlanan.push(`Satır ${i + 1}: tanınmayan madde`); return; }
    if (sonucDeger === null) { sonuc.atlanan.push(`Satır ${i + 1}: "${metin(r, 3)}" sonucu anlaşılmadı`); return; }
    if (!sonucDeger && !tespit && !oneri && !risk) return;
    const z = ziyaret();
    const mevcut = (z.cevaplar || {})[kod];
    if (mevcut && mevcut.uygId) { sonuc.atlanan.push(`Satır ${i + 1}: uygunsuzluğa aktarılmış madde değiştirilmedi`); return; }
    const madde = { anahtar: kod, kategori: kat, soru: soru.soru, mevzuat: soru.mevzuat, cevap: mevcut || null };
    const degisiklik = {};
    if (sonucDeger) degisiklik.sonuc = sonucDeger;
    if (tespit) degisiklik.not = tespit;
    if (oneri) degisiklik.oneri = oneri;
    if (risk) degisiklik.risk = risk;
    ldCevapGuncelle(denetimId, ziyaretId, kod, madde, degisiklik);
    if (!(z.kategoriler || []).includes(kid)) eklenecekKategoriler.add(kid);
    sonuc.islenen++;
    if ((sonucDeger || (mevcut && mevcut.sonuc)) === 'Uygun Değil') sonuc.bulgu++;
  });

  if (eklenecekKategoriler.size) {
    const z = ziyaret();
    ldZiyaretKategorileriGuncelle(denetimId, ziyaretId, Array.from(new Set((z.kategoriler || []).concat(Array.from(eklenecekKategoriler)))));
  }
  sonuc.ziyaretId = ziyaretId;
  return sonuc;
}

// ---------- Aktarımlar ----------

// Risk Değerlendirmesi'ne aktarılan kaydın kaynak id'si (core/risk-aktar.js).
function ldRiskKaynakId(denetimId, ziyaretId, anahtar) {
  return `${denetimId}:${ziyaretId}:${anahtar}`;
}

function _ldBulguAciklamasi(denetim, ziyaret, c, bulguNo) {
  return [
    `${denetim.denetimNo}${bulguNo ? ' / ' + bulguNo : ''} lokasyon bazlı saha kontrolü tespiti.`,
    `Lokasyon: ${ziyaret.bolum} — ${ziyaret.lokasyon}`,
    `Tespit: ${ldBulguTespiti(c)}`,
    ldBulguKriteri(c) ? `Kontrol maddesi (olması gereken): ${ldBulguKriteri(c)}` : '',
    c.m ? `Mevzuat: ${c.m}` : ''
  ].filter(Boolean).join('\n');
}

function ldBulguyuUygunsuzlugaAktar(denetimId, ziyaretId, anahtar, ek) {
  const denetim = ldDenetimGetir(denetimId);
  const ziyaret = denetim && denetim.ziyaretler.find(z => z.id === ziyaretId);
  const c = ziyaret && ziyaret.cevaplar[anahtar];
  if (!c) return { basarili: false, hatalar: { genel: 'Bulgu bulunamadı.' } };
  if (c.uygId) return { basarili: false, hatalar: { genel: 'Bu bulgu zaten uygunsuzluğa aktarılmış.' } };
  const bulgu = ldDenetimBulgulari(denetim).find(b => b.ziyaret.id === ziyaretId && b.madde.anahtar === anahtar);
  const fotolar = (c.fotolar || []).slice(0, 4);
  const sonuc = uygunsuzlukEkle({
    baslik: ldBulguTespiti(c),
    aciklama: _ldBulguAciklamasi(denetim, ziyaret, c, bulgu ? bulgu.no : ''),
    bolum: ziyaret.bolum,
    lokasyon: ziyaret.lokasyon,
    kaynakTuru: 'Saha Denetimi',
    riskSeviyesi: ek.riskSeviyesi || c.risk || UYG_VARSAYILAN_RISK,
    duzelticiFaaliyet: c.oneri || '',
    yasalDayanak: c.m || '',
    sorumlu: ek.sorumlu || '',
    atayan: denetim.denetciler,
    bildirimTarihi: denetim.tarih,
    termin: ek.termin || '',
    onayGerekliMi: true,
    fotoOncesi: fotolar[0] || '', fotoOncesi2: fotolar[1] || '', fotoOncesi3: fotolar[2] || '', fotoOncesi4: fotolar[3] || ''
  });
  if (!sonuc.basarili) return sonuc;
  _ldZiyaretDegistir(denetimId, ziyaretId, z => {
    if (z.cevaplar[anahtar]) {
      z.cevaplar[anahtar].uygId = sonuc.kayit.id;
      z.cevaplar[anahtar].uygNo = sonuc.kayit.aksiyonNo || '';
      if (ek.riskSeviyesi) z.cevaplar[anahtar].risk = ek.riskSeviyesi;
    }
  });
  return { basarili: true, kayit: sonuc.kayit };
}

// Uygunsuzluk modülündeki bağlı kaydın güncel durumu (rapor için).
function ldBagliUygunsuzluk(uygId) {
  if (!uygId || typeof uygunsuzlukTumunuGetir !== 'function') return null;
  return uygunsuzlukTumunuGetir().find(k => k.id === uygId) || null;
}
