// Yüklenici Yönetimi veri modeli: Yüklenici Firmalar ve Yüklenici Personeli,
// evrak bazlı otomatik uygunluk takibi.

const FIRMA_DURUMLARI = ['Aktif', 'Pasif', 'Blokeli', 'İptal'];
const KISI_DURUMLARI = ['Girişe Uygun', 'Eksik Evrak', 'Süresi Geçmiş', 'Onay Bekliyor', 'Girişe Kapalı', 'İptal'];
const YUKLENICI_RISK_SEVIYELERI = ['Düşük', 'Orta', 'Yüksek', 'Kritik'];
const EVRAK_TURLERI = ['SGK Hizmet / Giriş Bildirgesi', 'İSG Eğitimi', 'Sağlık Raporu', 'Mesleki Yeterlilik', 'KKD Zimmet', 'İş İzni', 'Mali Mesuliyet / Sigorta', 'Sözleşme', 'İş Güvenliği Uzmanı Sözleşmesi', 'İşyeri Hekimi Sözleşmesi', 'Diğer'];
const VARSAYILAN_GEREKLI_EVRAKLAR = ['SGK Hizmet / Giriş Bildirgesi', 'İSG Eğitimi', 'Sağlık Raporu'];

function bugunIso() {
  return new Date().toISOString().slice(0, 10);
}

function gunFarkiHesapla(tarihStr, referansStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tarihStr || '')) return null;
  const hedef = new Date(tarihStr + 'T00:00:00');
  const referans = new Date((referansStr || bugunIso()) + 'T00:00:00');
  return Math.round((hedef - referans) / 86400000);
}

function gunEkle(tarihStr, gun) {
  const t = new Date((tarihStr || bugunIso()) + 'T00:00:00');
  t.setDate(t.getDate() + Number(gun || 0));
  return _yukleniciYerelTarihStr(t);
}

function sonrakiNoUret(onEk, mevcutListe, alanAdi) {
  let maks = 0;
  mevcutListe.forEach(item => {
    const m = String(item[alanAdi] || '').match(/(\d+)$/);
    if (m) maks = Math.max(maks, parseInt(m[1], 10));
  });
  return onEk + String(maks + 1).padStart(4, '0');
}

function evrakOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    tur: veriler.tur || 'Diğer',
    verilisTarihi: veriler.verilisTarihi || '',
    gecerlilikTarihi: veriler.gecerlilikTarihi || '',
    dosyaAdi: (veriler.dosyaAdi || '').trim(),
    not: (veriler.not || '').trim()
  };
}

// Bir evrak listesini gerekli evrak listesiyle karşılaştırıp uygunluk özeti üretir.
function uygunlukHesapla(evraklar, gerekliEvraklar, referansTarih) {
  const liste = evraklar || [];
  // NOT: [] (boş dizi) ile undefined/null farklı anlamlara gelir — boş dizi
  // "bilinçli olarak hiç gerekli evrak yok" demektir (ör. eski uygulamadan
  // içe aktarılan firmalar), undefined/null ise "hiç belirtilmemiş, varsayılanı
  // kullan" demektir. Eskiden ikisi de varsayılana düşüyordu.
  const gerekli = Array.isArray(gerekliEvraklar) ? gerekliEvraklar : VARSAYILAN_GEREKLI_EVRAKLAR;

  const eksikEvraklar = gerekli.filter(tur => !liste.some(e => e.tur === tur));
  const suresiGecenEvraklar = liste
    .filter(e => { const fark = gunFarkiHesapla(e.gecerlilikTarihi, referansTarih); return fark !== null && fark < 0; })
    .map(e => e.tur);
  const yakindaBitecekEvraklar = liste
    .filter(e => { const fark = gunFarkiHesapla(e.gecerlilikTarihi, referansTarih); return fark !== null && fark >= 0 && fark <= 30; })
    .map(e => e.tur);

  return {
    eksikEvraklar: Array.from(new Set(eksikEvraklar)),
    suresiGecenEvraklar: Array.from(new Set(suresiGecenEvraklar)),
    yakindaBitecekEvraklar: Array.from(new Set(yakindaBitecekEvraklar)),
    uygunMu: eksikEvraklar.length === 0 && suresiGecenEvraklar.length === 0
  };
}

function firmaOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    firmaNo: veriler.firmaNo || '',
    firmaAdi: (veriler.firmaAdi || '').trim(),
    vergiNo: (veriler.vergiNo || '').trim(),
    faaliyetAlani: (veriler.faaliyetAlani || '').trim(),
    yetkiliAdi: (veriler.yetkiliAdi || '').trim(),
    telefon: (veriler.telefon || '').trim(),
    eposta: (veriler.eposta || '').trim(),
    riskSeviyesi: veriler.riskSeviyesi || 'Orta',
    durum: veriler.durum || 'Aktif',
    gerekliEvraklar: Array.isArray(veriler.gerekliEvraklar) ? veriler.gerekliEvraklar : VARSAYILAN_GEREKLI_EVRAKLAR.slice(),
    evraklar: Array.isArray(veriler.evraklar) ? veriler.evraklar : [],
    notlar: (veriler.notlar || '').trim(),
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}

// ==================== Araç / Ekipman ====================
// Eski uygulamadaki arac_ekipman koleksiyonunun birebir karşılığı (bkz.
// yuklenici-standalone.html satır 615-678, 1452-1531, 2189-2247). PTM/ZMS/
// TÜVTÜRK her biri: tarih boş bırakılırsa +1 yıl otomatik hesaplanır.

const YUKLENICI_ARAC_TURLERI = ['Araç', 'Ekipman'];

function aracOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    aracNo: veriler.aracNo || '',
    firmaId: veriler.firmaId || '',
    firmaAdi: (veriler.firmaAdi || '').trim(),
    tur: YUKLENICI_ARAC_TURLERI.includes(veriler.tur) ? veriler.tur : 'Araç',
    kimlik: (veriler.kimlik || '').trim(),
    ptmVar: veriler.ptmVar === 'Var' ? 'Var' : 'Yok',
    ptmTarih: veriler.ptmTarih || '',
    ptmGecerlilik: veriler.ptmGecerlilik || '',
    ruhsat: veriler.ruhsat === 'Var' ? 'Var' : 'Yok',
    zmsTarih: veriler.zmsTarih || '',
    zmsGecerlilik: veriler.zmsGecerlilik || '',
    tuvTarih: veriler.tuvTarih || '',
    tuvGecerlilik: veriler.tuvGecerlilik || '',
    pasif: !!veriler.pasif,
    notlar: (veriler.notlar || '').trim(),
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}

// base doluysa ve exp boşsa +1 yıl otomatik hesaplar (eski uygulama:
// "addYears(base,1) if exp left blank" — PTM/ZMS/TÜVTÜRK üçü için de aynı).
function aracEtkinBitisTarihiHesapla(base, exp) {
  if (exp) return exp;
  return base ? yukleniciYilEkle(base, 1) : '';
}

// Eski uygulamadaki a_save handler'ının persist ettiği durum mantığıyla
// birebir: her belge için exp >= bugün ise uygun (base<=bugün ayrıca
// kontrol edilmez — eski uygulamanın recomputeAracStatus'undan farklı olarak
// a_save'in kaydettiği durum budur, "birebir" için o esas alındı).
function aracUygunlukHesapla(arac, referansTarih) {
  const bugun = referansTarih || bugunIso();
  const ptmExp = aracEtkinBitisTarihiHesapla(arac.ptmTarih, arac.ptmGecerlilik);
  const zmsExp = aracEtkinBitisTarihiHesapla(arac.zmsTarih, arac.zmsGecerlilik);
  const tuvExp = aracEtkinBitisTarihiHesapla(arac.tuvTarih, arac.tuvGecerlilik);

  const ptmOk = arac.ptmVar === 'Var' && !!ptmExp && ptmExp >= bugun;
  const ruhsatOk = arac.ruhsat === 'Var';
  const zmsOk = !!zmsExp && zmsExp >= bugun;
  const tuvOk = !!tuvExp && tuvExp >= bugun;

  return {
    ptmExp, zmsExp, tuvExp, ptmOk, ruhsatOk, zmsOk, tuvOk,
    uygunMu: ptmOk && ruhsatOk && zmsOk && tuvOk
  };
}

// ==================== Ziyaretçiler ====================
// Eski uygulamadaki ziyaretciler koleksiyonunun birebir karşılığı — basit
// giriş kaydı, evrak/uygunluk hesabı yok (bkz. yuklenici-standalone.html
// satır 810-838, 4508-4591).

function ziyaretciOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    adSoyad: (veriler.adSoyad || '').trim(),
    firma: (veriler.firma || '').trim(),
    ziyaretEdilen: (veriler.ziyaretEdilen || '').trim(),
    tarih: veriler.tarih || bugunIso(),
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}

function kisiOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    personelNo: veriler.personelNo || '',
    adSoyad: (veriler.adSoyad || '').trim(),
    kimlikNo: (veriler.kimlikNo || '').trim(),
    firmaId: veriler.firmaId || '',
    firmaAdi: (veriler.firmaAdi || '').trim(),
    bolum: (veriler.bolum || '').trim(),
    gorev: (veriler.gorev || '').trim(),
    telefon: (veriler.telefon || '').trim(),
    durum: veriler.durum || 'Onay Bekliyor',
    // Eski uygulamadaki tehlike sınıfı / personel türü — Sağlık Raporu ve Temel
    // İSG Eğitimi belgelerinin geçerlilik süresini belirler (bkz. YUKLENICI_BELGE_TANIMLARI).
    tehlikeSinifi: YUKLENICI_TEHLIKE_SINIFLARI.includes(veriler.tehlikeSinifi) ? veriler.tehlikeSinifi : 'az',
    personelTuru: YUKLENICI_PERSONEL_TURLERI.includes(veriler.personelTuru) ? veriler.personelTuru : 'teknik',
    // "Pasif Yap" — Dashboard/Kayıtlar/PDF'ten hariç tutulur ama kayıt silinmez.
    pasif: !!veriler.pasif,
    // "İlk Giriş" — işaretliyse Kayıtlar/PDF'teki uygunluk metni "Eğitim Verilecek"
    // olarak görünür, diğer tüm belge kontrolleri bu durumda atlanır.
    ilkGiris: !!veriler.ilkGiris,
    // Sabit belge checklist'i: YUKLENICI_BELGE_TANIMLARI'ndaki her id için bir
    // kayıt tutar (bkz. yukleniciBosBelgeler). Şekli belge türüne göre değişir:
    // var-yok -> {deger:'Var'|'Yok'}, tarih-manuel -> {base,exp}, tarih-tehlike
    // -> {base} (exp tehlike sınıfına göre hesaplanır), egitim -> {base,ay,egitmen}.
    belgeler: veriler.belgeler && typeof veriler.belgeler === 'object' ? veriler.belgeler : yukleniciBosBelgeler(),
    // NOT: gerekliEvraklar/evraklar risk360'ın eski serbest evrak modelinden
    // kalan alanlar — Yüklenici kişi formu sabit checklist'e taşınana kadar
    // (bkz. görev #2) geriye dönük uyumluluk için tutuluyor, silinmedi.
    gerekliEvraklar: Array.isArray(veriler.gerekliEvraklar) ? veriler.gerekliEvraklar : VARSAYILAN_GEREKLI_EVRAKLAR.slice(),
    evraklar: Array.isArray(veriler.evraklar) ? veriler.evraklar : [],
    sonrakiKontrolTarihi: veriler.sonrakiKontrolTarihi || gunEkle(bugunIso(), 30),
    notlar: (veriler.notlar || '').trim(),
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}

// ==================== Sabit Belge Checklist Modeli ====================
// Eski uygulamadaki (isg1/yuklenici-standalone.html) 16 sabit belgeyi ve
// tehlike-sınıfı bazlı süre hesaplarını birebir taşır (satır 994-1018,
// 2584-2894, 3371-3427).

const YUKLENICI_TEHLIKE_SINIFLARI = ['az', 'tehlikeli', 'cok'];
const YUKLENICI_TEHLIKE_SINIFI_ETIKETLERI = { az: 'Az Tehlikeli', tehlikeli: 'Tehlikeli', cok: 'Çok Tehlikeli' };
const YUKLENICI_PERSONEL_TURLERI = ['teknik', 'operator'];
const YUKLENICI_PERSONEL_TURU_ETIKETLERI = { teknik: 'Teknik Personel', operator: 'Operatör' };

// Sağlık Raporu / Temel İSG Eğitimi: base tarihinden itibaren kaç yıl geçerli
// (eski uygulama: mapSaglikYears/mapEgitimYears).
const YUKLENICI_SAGLIK_YIL_HARITASI = { az: 5, tehlikeli: 3, cok: 1 };
const YUKLENICI_EGITIM_YIL_HARITASI = { az: 3, tehlikeli: 2, cok: 1 };

const YUKLENICI_FIRMA_EGITIMI_AY_SECENEKLERI = [1, 2, 3, 4, 5, 6, 9, 12];
const YUKLENICI_FIRMA_EGITIMI_VARSAYILAN_AY = 6;

// tur: 'var-yok' | 'tarih-manuel' (Geçici Görevlendirme/MYK, exp elle girilir;
// MYK'de exp boş bırakılırsa süresiz sayılır) | 'tarih-tehlike' (Sağlık/Temel
// İSG; exp boşsa base+tehlike-sınıfı-yılı ile hesaplanır) | 'egitim' (Firma
// Eğitimi; exp boşsa base+ay ile hesaplanır, eğitmen adı zorunlu).
// girisEngelleyici: eksik/süresi geçmişse "Giriş Engeli" (kritik) sayılır —
// false olanlar (Diploma, İSG Uzmanı/Hekim atama belgeleri, operatör belgeleri)
// eski uygulamada da girişi engellemez, sadece bilgi amaçlıdır.
// bolum: sadece UI'da gruplama/başlıklandırma için (hesaplamayı etkilemez).
const YUKLENICI_BELGE_BOLUMLERI = {
  zorunlu: 'Girişi Etkileyen Zorunlu Belgeler',
  firma: 'Firma / Diğer Belgeler',
  operator: 'Operatör Belgeleri'
};

// Kullanıcı isteği: modalda önce Var/Yok tipi belgeler, sonra tarihli
// (tek/çok tarihli) belgeler gösterilsin — bu yüzden dizi sırası da tur'a
// göre: var-yok'lar başta, tarihliler sonda (bolum grubu içinde).
const YUKLENICI_BELGE_TANIMLARI = [
  { id: 'sgk', ad: 'İşe Giriş Bildirgesi (SGK)', tur: 'var-yok', girisEngelleyici: true, bolum: 'zorunlu' },
  { id: 'kkd', ad: 'KKD Zimmet Formu', tur: 'var-yok', girisEngelleyici: true, bolum: 'zorunlu' },
  { id: 'adliSicil', ad: 'Adli Sicil Kaydı', tur: 'var-yok', girisEngelleyici: true, bolum: 'zorunlu' },
  // NOT: İş Güv. Uzmanı / İşyeri Hekimi atama belgeleri kişi bazında DEĞİL,
  // firma bazında bir kez var olan sözleşmelerdir — bir firmanın tüm
  // personeli için aynı belgedir. Kullanıcı isteğiyle personel checklist'inden
  // çıkarılıp Firma modalındaki genel evrak listesine taşındı (bkz.
  // EVRAK_TURLERI: 'İş Güvenliği Uzmanı Sözleşmesi', 'İşyeri Hekimi Sözleşmesi').
  { id: 'diploma', ad: 'Diploma', tur: 'var-yok', girisEngelleyici: false, karsilikliId: 'myk', bolum: 'zorunlu' },
  { id: 'geciciGorev', ad: 'Geçici Görevlendirme Belgesi', tur: 'tarih-manuel', girisEngelleyici: true, bolum: 'zorunlu' },
  // NOT: eski uygulamada MYK'nin "base" alanı eksikse Giriş Engeli sayılır
  // (computeCriticalReason: "MYK yok"), sadece "exp" boş bırakılırsa süresiz
  // kabul edilir — bu yüzden girisEngelleyici true.
  { id: 'myk', ad: 'MYK Belgesi', tur: 'tarih-manuel', girisEngelleyici: true, suresizOlabilir: true, karsilikliId: 'diploma', bolum: 'zorunlu' },
  { id: 'saglik', ad: 'Sağlık Raporu', tur: 'tarih-tehlike', girisEngelleyici: true, yilHaritasi: 'saglik', bolum: 'zorunlu' },
  { id: 'temelIsg', ad: 'Temel İSG Eğitimi Belgesi', tur: 'tarih-tehlike', girisEngelleyici: true, yilHaritasi: 'egitim', bolum: 'zorunlu' },
  { id: 'firmaEgitimi', ad: 'Firma Eğitimi', tur: 'egitim', girisEngelleyici: true, bolum: 'zorunlu' },
  { id: 'psikoteknik', ad: 'Psikoteknik Belgesi', tur: 'var-yok', girisEngelleyici: false, operatorSart: true, bolum: 'operator' },
  { id: 'src', ad: 'SRC Belgesi', tur: 'var-yok', girisEngelleyici: false, operatorSart: true, bolum: 'operator' },
  { id: 'operatorluk', ad: 'Operatörlük Belgesi', tur: 'var-yok', girisEngelleyici: false, operatorSart: true, bolum: 'operator' },
  { id: 'ehliyet', ad: 'Ehliyet', tur: 'var-yok', girisEngelleyici: false, operatorSart: true, bolum: 'operator' }
];

function yukleniciBelgeTanimiGetir(id) {
  return YUKLENICI_BELGE_TANIMLARI.find(b => b.id === id) || null;
}

function yukleniciGecerliBelgeTanimlari(personelTuru) {
  return YUKLENICI_BELGE_TANIMLARI.filter(b => !b.operatorSart || personelTuru === 'operator');
}

function yukleniciBosBelgeler() {
  const sonuc = {};
  YUKLENICI_BELGE_TANIMLARI.forEach(b => { sonuc[b.id] = {}; });
  return sonuc;
}

// toISOString() UTC'ye çevirdiği için UTC+3 gibi dilimlerde yerel gece
// yarısını bir gün geriye kaydırabilir (bkz. görev doğrulamasında yakalanan
// hata) — bu yüzden yerel Y/A/G bileşenlerinden string üretiyoruz.
function _yukleniciYerelTarihStr(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function yukleniciAyEkle(tarihStr, ay) {
  if (!tarihStr) return '';
  const t = new Date(tarihStr + 'T00:00:00');
  if (isNaN(t)) return '';
  t.setMonth(t.getMonth() + Number(ay || 0));
  return _yukleniciYerelTarihStr(t);
}

function yukleniciYilEkle(tarihStr, yil) {
  if (!tarihStr) return '';
  const t = new Date(tarihStr + 'T00:00:00');
  if (isNaN(t)) return '';
  t.setFullYear(t.getFullYear() + Number(yil || 0));
  return _yukleniciYerelTarihStr(t);
}

// Bir belge kaydının (deger/base/exp/ay/egitmen) etkin bitiş tarihini
// (YYYY-MM-DD ya da boş) hesaplar. Eski uygulamadaki calcRowExpISO/
// effectiveExpDate ile birebir aynı kurallar.
function yukleniciBelgeBitisTarihiHesapla(belgeTanimi, kayit, tehlikeSinifi) {
  if (!belgeTanimi || !kayit) return '';
  if (belgeTanimi.tur === 'var-yok') return '';

  if (belgeTanimi.tur === 'egitim') {
    if (kayit.exp) return kayit.exp;
    const ay = Number(kayit.ay || YUKLENICI_FIRMA_EGITIMI_VARSAYILAN_AY);
    return kayit.base ? yukleniciAyEkle(kayit.base, ay) : '';
  }

  if (belgeTanimi.tur === 'tarih-tehlike') {
    if (kayit.exp) return kayit.exp;
    if (!kayit.base) return '';
    const yilHaritasi = belgeTanimi.yilHaritasi === 'saglik' ? YUKLENICI_SAGLIK_YIL_HARITASI : YUKLENICI_EGITIM_YIL_HARITASI;
    return yukleniciYilEkle(kayit.base, yilHaritasi[tehlikeSinifi] || 1);
  }

  // tarih-manuel (Geçici Görevlendirme, MYK) — exp elle girilir; MYK'de boş
  // bırakılırsa süresiz sayılır (eski uygulama: "base var exp yok -> süresiz OK").
  return kayit.exp || '';
}

function yukleniciBelgeVarMi(kayit) {
  if (!kayit) return false;
  return String(kayit.deger || '').toLowerCase() === 'var';
}

// Öncelik sıralı "kritik sebep" hesabı — eski uygulamadaki computeCriticalReason
// ile birebir aynı sıra ve metinler: SGK -> Adli Sicil -> KKD -> (Sağlık/Temel
// İSG, en erken biten) -> Geçici Görevlendirme -> MYK -> Firma Eğitimi.
// İlk başarısız kontrolde durur ve onu döner; hiçbir sorun yoksa null döner.
function yukleniciKisiKritikSebepHesapla(kisi, referansTarih) {
  const bugun = referansTarih || bugunIso();
  const belgeler = kisi.belgeler || {};
  const tehlike = kisi.tehlikeSinifi || 'az';

  const belgeGetir = id => belgeler[id] || {};
  const tanimGetir = id => yukleniciBelgeTanimiGetir(id);
  const kalanGunHesapla = tarihIso => (tarihIso ? gunFarkiHesapla(tarihIso, bugun) : null);
  const sorunUret = (sebep, sonIso, girisEngeli, belgeLabel) => ({
    girisEngeli: girisEngeli !== false,
    sebep,
    sonTarih: sonIso || '',
    kalanGun: kalanGunHesapla(sonIso),
    belgeLabel: belgeLabel || ''
  });

  if (!yukleniciBelgeVarMi(belgeGetir('sgk'))) return sorunUret('SGK yok', '', true, 'SGK');
  if (!yukleniciBelgeVarMi(belgeGetir('adliSicil'))) return sorunUret('Adli Sicil yok', '', true, 'Adli Sicil');
  if (!yukleniciBelgeVarMi(belgeGetir('kkd'))) return sorunUret('KKD Zimmet yok', '', true, 'KKD Zimmet');

  const saglik = belgeGetir('saglik');
  const temelIsg = belgeGetir('temelIsg');
  if (!saglik.base) return sorunUret('Sağlık raporu yok', '', true, 'Sağlık');
  if (!temelIsg.base) return sorunUret('Temel İSG yok', '', true, 'Temel İSG');

  const saglikExp = yukleniciBelgeBitisTarihiHesapla(tanimGetir('saglik'), saglik, tehlike);
  const temelIsgExp = yukleniciBelgeBitisTarihiHesapla(tanimGetir('temelIsg'), temelIsg, tehlike);
  const adaylar = [{ etiket: 'Sağlık', exp: saglikExp }, { etiket: 'Temel İSG', exp: temelIsgExp }]
    .filter(a => a.exp)
    .sort((a, b) => a.exp.localeCompare(b.exp));
  const ilkBiten = adaylar[0];
  if (ilkBiten) {
    const kalan = kalanGunHesapla(ilkBiten.exp);
    if (kalan !== null && kalan < 0) return sorunUret(`${ilkBiten.etiket} süresi dolmuş`, ilkBiten.exp, true, ilkBiten.etiket);
    if (kalan !== null && kalan <= 30) return sorunUret(`${ilkBiten.etiket} yaklaşıyor`, ilkBiten.exp, false, ilkBiten.etiket);
  }

  const gecici = belgeGetir('geciciGorev');
  if (!gecici.base || !gecici.exp) return sorunUret('Geçici Görevlendirme yok', '', true, 'Geçici Görev');
  const geciciKalan = kalanGunHesapla(gecici.exp);
  if (geciciKalan !== null && geciciKalan < 0) return sorunUret('Geçici Görevlendirme süresi dolmuş', gecici.exp, true, 'Geçici Görev');
  if (geciciKalan !== null && geciciKalan <= 30) return sorunUret('Geçici Görevlendirme yaklaşıyor', gecici.exp, false, 'Geçici Görev');

  const myk = belgeGetir('myk');
  if (!myk.base) return sorunUret('MYK yok', '', true, 'MYK');
  if (myk.exp) {
    const mykKalan = kalanGunHesapla(myk.exp);
    if (mykKalan !== null && mykKalan < 0) return sorunUret('MYK süresi dolmuş', myk.exp, true, 'MYK');
    if (mykKalan !== null && mykKalan <= 30) return sorunUret('MYK yaklaşıyor', myk.exp, false, 'MYK');
  }
  // exp boşsa MYK süresizdir, sorun yok.

  const firmaEgitimi = belgeGetir('firmaEgitimi');
  const feExp = yukleniciBelgeBitisTarihiHesapla(tanimGetir('firmaEgitimi'), firmaEgitimi, tehlike);
  if (!firmaEgitimi.base || !feExp || !(firmaEgitimi.egitmen || '').trim()) return sorunUret('Firma Eğitimi yok / eksik', '', true, 'Firma Eğitimi');
  const feKalan = kalanGunHesapla(feExp);
  if (feKalan !== null && feKalan < 0) return sorunUret('Firma Eğitimi süresi dolmuş', feExp, true, 'Firma Eğitimi');
  if (feKalan !== null && feKalan <= 30) return sorunUret('Firma Eğitimi yaklaşıyor', feExp, false, 'Firma Eğitimi');

  return null;
}

// Tek bir belgenin "Uygun" sayılıp sayılmayacağı — satır renklendirme
// (getRowClassForPersonel) ve Dashboard KPI'ları için kullanılır. var-yok
// belgede deger==='Var'; tarihli belgelerde base<=bugün<=exp aralığında
// olması gerekir (MYK süresizse — base var, exp yok — otomatik uygun sayılır).
function yukleniciBelgeUygunMu(belgeTanimi, kayit, tehlikeSinifi, referansTarih) {
  const bugun = referansTarih || bugunIso();
  const k = kayit || {};
  if (belgeTanimi.tur === 'var-yok') return k.deger === 'Var';
  if (belgeTanimi.suresizOlabilir && k.base && !k.exp) return true;
  const exp = yukleniciBelgeBitisTarihiHesapla(belgeTanimi, k, tehlikeSinifi);
  if (!k.base || !exp) return false;
  return k.base <= bugun && bugun <= exp;
}

// Eski uygulamadaki getRowClassForPersonel ile birebir: Firma Eğitimi renge
// etki etmez, geçerli belgelerin >=9'u uygunsa yeşil (row-ok), >=6'sı
// uygunsa sarı (row-mid), aksi halde kırmızı (row-bad).
function yukleniciKisiSatirSinifiHesapla(kisi, referansTarih) {
  const tanimlar = yukleniciGecerliBelgeTanimlari(kisi.personelTuru).filter(b => b.id !== 'firmaEgitimi');
  if (!tanimlar.length) return 'row-bad';
  const uygunSayisi = tanimlar.filter(b => yukleniciBelgeUygunMu(b, (kisi.belgeler || {})[b.id], kisi.tehlikeSinifi, referansTarih)).length;
  if (uygunSayisi >= 9) return 'row-ok';
  if (uygunSayisi >= 6) return 'row-mid';
  return 'row-bad';
}

// Eski uygulamadaki getRowClassForArac ile birebir: PTM/Ruhsat/ZMS/TÜVTÜRK'ün
// hepsi uygunsa yeşil, aksi halde kırmızı (ara durum yok).
function yukleniciAracSatirSinifiHesapla(arac) {
  return arac.uygunMu ? 'row-ok' : 'row-bad';
}

// ==================== Detaylı Arama: Bulanık Eşleştirme ====================
// Eski uygulamadaki normalizeText/levenshtein/fuzzyMatch ile birebir
// (yuklenici-standalone.html satır 1296-1334) — Detaylı Arama sekmesinde
// firma/personel/kimlik metin araması için kullanılır.

function _yukleniciAramaNormallestir(str) {
  return (str || '')
    .toString()
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/\s+/g, ' ')
    .trim();
}

function _yukleniciLevenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function yukleniciFuzzyEslesir(text, query) {
  const t = _yukleniciAramaNormallestir(text);
  const q = _yukleniciAramaNormallestir(query);
  if (!q) return true;
  if (!t) return false;
  if (t.includes(q)) return true;
  const kelimeler = t.split(' ');
  const maksMesafe = Math.max(1, Math.round(q.length / 4));
  return kelimeler.some(k => _yukleniciLevenshtein(k, q) <= maksMesafe);
}

// PDF'in ("Kayıtlar" sekmesi) kullandığı DAR uygunluk kontrolü — eski
// uygulamadaki computeGirebilecegiSonTarih ile birebir. computeCriticalReason'dan
// (yukarısı, Dashboard'da kullanılır) KASITLI olarak daha dar: sadece
// SGK+Adli Sicil (var/yok) ile Sağlık/Temel İSG tarihlerine bakar; KKD, Geçici
// Görevlendirme, MYK, Firma Eğitimi'ni kontrol ETMEZ. Bu asimetri eski
// uygulamada da vardı — "birebir" eşleşme için burada da korunmalı, düzeltilmemeli.
function yukleniciGirebilecegiSonTarihHesapla(kisi, referansTarih) {
  const bugun = referansTarih || bugunIso();
  const belgeler = kisi.belgeler || {};
  const tehlike = kisi.tehlikeSinifi || 'az';

  const sgkVar = yukleniciBelgeVarMi(belgeler.sgk);
  const adliVar = yukleniciBelgeVarMi(belgeler.adliSicil);
  const saglikExp = yukleniciBelgeBitisTarihiHesapla(yukleniciBelgeTanimiGetir('saglik'), belgeler.saglik || {}, tehlike);
  const temelIsgExp = yukleniciBelgeBitisTarihiHesapla(yukleniciBelgeTanimiGetir('temelIsg'), belgeler.temelIsg || {}, tehlike);

  let secilen = '';
  if (saglikExp && temelIsgExp) secilen = saglikExp <= temelIsgExp ? saglikExp : temelIsgExp;
  else secilen = saglikExp || temelIsgExp || '';

  if (kisi.ilkGiris) {
    return { sonTarih: secilen, durumMetni: 'Eğitim Verilecek - İSG ile görüşün', uygunMu: false, ilkGiris: true };
  }

  const eksik = !sgkVar || !adliVar || !saglikExp || !temelIsgExp || (secilen && secilen < bugun);
  return {
    sonTarih: secilen,
    durumMetni: eksik ? 'Eksik evrak - İSG ile görüşün' : 'Uygun',
    uygunMu: !eksik,
    ilkGiris: false
  };
}
