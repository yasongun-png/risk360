// Kimyasal Yönetimi veri modeli. Eski üretim uygulamasındaki chemical_management
// modülünden mümkün olduğunca aynı iş kuralları taşınmıştır: GHS/H-kodu tabanlı
// risk seviyesi ve NFPA 704 ("yangın elması") başlangıç önerisi, depolama grubu
// bazlı birlikte-depolanamama matrisi, GBF/SDS 5 yıllık geçerlilik kuralı. NFPA
// ve risk önerileri SADECE başlangıç önerisidir — İG uzmanı SDS Bölüm 2/16'ya
// göre teyit etmeli/değiştirmelidir; otomatik öneri kesin veri yerine geçmez.

function bugunIso() {
  return new Date().toISOString().slice(0, 10);
}

const KIMYASAL_FIZIKSEL_HALLER = ['Katı', 'Sıvı', 'Gaz', 'Aerosol', 'Diğer'];

const KIMYASAL_DEPOLAMA_GRUPLARI = [
  'Asit', 'Baz / Alkali', 'Oksitleyici', 'Yanıcı / Parlayıcı', 'Toksik',
  'Korozif', 'Basınçlı Gaz', 'Su ile Reaktif', 'Patlayıcı', 'Çevre için Tehlikeli', 'Genel'
];

// Kimyasalın özellikleri (birden fazla seçilebilir, ör. nitrik asit = Asit +
// Oksitleyici Madde + Aşındırıcı Madde). Depolama matrisi bu özelliklere göre
// kurulur. İlk 9 sınıf ve varsayılan kurallar "Kimyasal Depolama Matrisi"
// levhasından (GHS piktogramlarına göre) alınmıştır; son 5 sınıf ek olarak
// tanımlanmıştır. Kurallar firma bazında kullanıcı tarafından değiştirilebilir
// (bkz. kimyasalMatrisKurallariGetir).
const KIMYASAL_OZELLIKLERI = [
  'Yanıcı Madde', 'Patlayıcı Madde', 'Akut Toksisite', 'Oksitleyici Madde', 'Basınçlı Gaz',
  'Sağlık Tehlikesi', 'Ciddi Sağlık Tehlikesi', 'Aşındırıcı Madde', 'Çevre İçin Zararlı',
  'Asit', 'Baz', 'Tuz', 'İndirgen', 'Su ile Reaktif'
];

const KIMYASAL_RISK_SEVIYELERI = ['Düşük', 'Orta', 'Yüksek', 'Kritik'];
const KIMYASAL_DURUMLARI = ['Aktif', 'Pasif', 'Kullanım Dışı', 'İptal'];

const GHS_PIKTOGRAMLARI = [
  'GHS01 Patlayıcı', 'GHS02 Alev', 'GHS03 Oksitleyici', 'GHS04 Basınçlı Gaz',
  'GHS05 Korozif', 'GHS06 Akut Toksisite', 'GHS07 Zararlı / Tahriş Edici',
  'GHS08 Sağlık Tehlikesi', 'GHS09 Çevre'
];

const NFPA_OZEL_KODLARI = { OX: 'Oksitleyici (OX)', W: 'Su ile Reaksiyona Girmemeli (W)' };

const KIMYASAL_OZELLIK_GHS = {
  'Yanıcı Madde': 'GHS02', 'Patlayıcı Madde': 'GHS01', 'Akut Toksisite': 'GHS06',
  'Oksitleyici Madde': 'GHS03', 'Basınçlı Gaz': 'GHS04', 'Sağlık Tehlikesi': 'GHS07',
  'Ciddi Sağlık Tehlikesi': 'GHS08', 'Aşındırıcı Madde': 'GHS05', 'Çevre İçin Zararlı': 'GHS09'
};

// Eski kayıtlardaki Depolama Grubu / özellik adlarını yeni sınıflara çevirir.
const _KIMYASAL_OZELLIK_ESLEME = {
  'Yanıcı / Parlayıcı': 'Yanıcı Madde', 'Patlayıcı': 'Patlayıcı Madde', 'Toksik': 'Akut Toksisite',
  'Oksitleyici': 'Oksitleyici Madde', 'Korozif': 'Aşındırıcı Madde', 'Çevre için Tehlikeli': 'Çevre İçin Zararlı',
  'Baz / Alkali': 'Baz'
};

function kimyasalOzellikNormalize(ad) {
  return _KIMYASAL_OZELLIK_ESLEME[ad] || ad;
}

// U = birlikte depolanabilir, X = birlikte depolanamaz, S = özel önlemlerle
// birlikte depolanabilir. Satır/sütun sırası KIMYASAL_OZELLIKLERI ile aynı.
const _KIMYASAL_MATRIS_VARSAYILAN_SATIRLAR = [
  'UXXXXSSXX XXSSX',
  'XUXXXXXXX XXXXX',
  'XXUXXUUXX XXUUX',
  'XXXUXXXXX XXSXX',
  'XXXXUSSXX XXUSX',
  'SXUXSUUUX UUUUS',
  'SXUXSUUUX UUUUS',
  'XXXXXUUUX UUUSX',
  'XXXXXXXXU XXXXX',
  'XXXXXUUUX UXUXX',
  'XXXXXUUUX XUUUX',
  'SXUSUUUUX UUUUS',
  'SXUXSUUSX XUUUX',
  'XXXXXSSXX XXSXU'
];

function _kimMatrisAnahtari(a, b) {
  const i = KIMYASAL_OZELLIKLERI.indexOf(a), j = KIMYASAL_OZELLIKLERI.indexOf(b);
  return i <= j ? `${a}|${b}` : `${b}|${a}`;
}

function kimyasalMatrisVarsayilanDurum(a, b) {
  const i = KIMYASAL_OZELLIKLERI.indexOf(a), j = KIMYASAL_OZELLIKLERI.indexOf(b);
  if (i < 0 || j < 0) return 'U';
  const satir = _KIMYASAL_MATRIS_VARSAYILAN_SATIRLAR[Math.min(i, j)].replace(' ', '');
  return satir[Math.max(i, j)];
}

// Kullanıcının değiştirdiği hücreler (yalnızca varsayılandan farklı olanlar)
// firma bazlı saklanır: { "A|B": "U"|"X"|"S" }.
function _kimMatrisKuralAnahtari() {
  return tenantAnahtar('kimyasal_matris_kurallari');
}

function kimyasalMatrisKurallariGetir() {
  try { return (typeof oku === 'function' && oku(_kimMatrisKuralAnahtari(), {})) || {}; } catch (e) { return {}; }
}

function kimyasalMatrisKuraliKaydet(a, b, durum) {
  const kurallar = Object.assign({}, kimyasalMatrisKurallariGetir());
  const anahtar = _kimMatrisAnahtari(a, b);
  if (durum === kimyasalMatrisVarsayilanDurum(a, b)) delete kurallar[anahtar];
  else kurallar[anahtar] = durum;
  yaz(_kimMatrisKuralAnahtari(), kurallar);
}

function kimyasalMatrisKurallariniSifirla() {
  yaz(_kimMatrisKuralAnahtari(), {});
}

function kimyasalMatrisDurumu(a, b, kurallar) {
  a = kimyasalOzellikNormalize(a); b = kimyasalOzellikNormalize(b);
  if (!a || !b || a === 'Genel' || b === 'Genel') return 'U';
  const k = kurallar || kimyasalMatrisKurallariGetir();
  return k[_kimMatrisAnahtari(a, b)] || kimyasalMatrisVarsayilanDurum(a, b);
}

function _listeyeAyir(deger) {
  if (Array.isArray(deger)) return deger.map(s => String(s).trim()).filter(Boolean);
  return String(deger || '').split(/[;,]+/).map(s => s.trim()).filter(Boolean);
}

function kimyasalOnEkiUret(bolum) {
  const harfEslesme = { ç: 'C', ğ: 'G', ı: 'I', ö: 'O', ş: 'S', ü: 'U', İ: 'I' };
  const temiz = (bolum || 'KIM')
    .split('')
    .map(k => harfEslesme[k] || k)
    .join('')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 3);
  return (temiz || 'KIM').padEnd(3, 'X');
}

function kimyasalSonrakiNoUret(bolum, mevcutListe) {
  const onEk = kimyasalOnEkiUret(bolum);
  let maks = 0;
  (mevcutListe || []).forEach(k => {
    if (!String(k.kimyasalNo || '').startsWith(onEk)) return;
    const kuyruk = parseInt(String(k.kimyasalNo).slice(3), 10);
    if (Number.isFinite(kuyruk) && kuyruk > maks) maks = kuyruk;
  });
  return onEk + String(maks + 1).padStart(4, '0');
}

// GHS/H-kodlarına göre risk seviyesi başlangıç önerisi (kullanıcı manuel
// seçmediyse). H-kodları serbest metin listesi olarak tutulur; eşleşme metin
// içinde arama ile yapılır (ör. "H314; H290" içinde "H314" araması).
function kimyasalRiskSeviyesiTahminEt(ghsPiktogramlari, hKodlari) {
  const ghs = (ghsPiktogramlari || []).join(' ');
  const h = (hKodlari || []).join(' ');
  const icerir = (liste) => liste.some(kod => ghs.includes(kod) || h.includes(kod));

  if (icerir(['GHS01', 'GHS06']) || icerir(['H300', 'H310', 'H330', 'H350', 'H360'])) return 'Kritik';
  if (icerir(['GHS02', 'GHS03', 'GHS05', 'GHS08'])) return 'Yüksek';
  if (icerir(['GHS07', 'GHS09'])) return 'Orta';
  return 'Orta';
}

function kimyasalKritikMi(kayit) {
  if (kayit.riskSeviyesi === 'Kritik') return true;
  const ghs = (kayit.ghsPiktogramlari || []).join(' ');
  const h = (kayit.hKodlari || []).join(' ');
  if (ghs.includes('GHS01') || ghs.includes('GHS06')) return true;
  return ['H300', 'H310', 'H330', 'H350', 'H360', 'H370', 'H372'].some(kod => h.includes(kod));
}

// NFPA 704 başlangıç önerisi — bkz. dosya başı uyarı: kesin değildir, SDS
// Bölüm 2/16'dan teyit edilmelidir.
function kimyasalNfpaTahminEt(hKodlari, depolamaGrubu) {
  const h = (hKodlari || []).join(' ');
  const icerir = (liste) => liste.some(kod => h.includes(kod));

  let saglik = 0;
  if (icerir(['H300', 'H310', 'H330'])) saglik = 4;
  else if (icerir(['H301', 'H311', 'H331', 'H314', 'H318', 'H370'])) saglik = 3;
  else if (icerir(['H302', 'H312', 'H332', 'H372', 'H341', 'H351', 'H361'])) saglik = 2;
  else if (icerir(['H315', 'H319', 'H320', 'H335', 'H336'])) saglik = 1;

  let yanicilik = 0;
  if (icerir(['H224'])) yanicilik = 4;
  else if (icerir(['H225'])) yanicilik = 3;
  else if (icerir(['H226'])) yanicilik = 2;
  else if (icerir(['H227', 'H228'])) yanicilik = 1;

  let kararsizlik = 0;
  if (icerir(['H240', 'H241', 'H200', 'H201', 'H202', 'H203'])) kararsizlik = 4;
  else if (icerir(['H242', 'H271'])) kararsizlik = 3;
  else if (icerir(['H272']) || depolamaGrubu === 'Oksitleyici' || depolamaGrubu === 'Su ile Reaktif' || icerir(['H250', 'H251', 'H252'])) kararsizlik = 2;

  const ozelKod = [];
  if (depolamaGrubu === 'Oksitleyici' || icerir(['H270', 'H271', 'H272'])) ozelKod.push('OX');
  if (depolamaGrubu === 'Su ile Reaktif' || icerir(['H260', 'H261'])) ozelKod.push('W');

  return { saglik, yanicilik, kararsizlik, ozelKod };
}

// Kimyasal adındaki (ve varsa H kodlarındaki) anahtar kelimelere göre
// Depolama Grubu başlangıç önerisi -- bkz. dosya başı uyarı: kesin değildir,
// kullanıcı SDS'e göre teyit/değiştirmelidir. Eşleşme yoksa '' döner (mevcut
// seçim değiştirilmez).
function kimyasalDepolamaGrubuTahminEt(ad, hKodlari) {
  const isim = String(ad || '').toLocaleLowerCase('tr');
  const h = (hKodlari || []).join(' ');
  const iceren = (liste) => liste.some(kelime => isim.includes(kelime));

  const hVar = (re) => re.test(h);

  // Önce H kodundan kesin sınıflar (ad yanıltıcı olabilir).
  if (hVar(/H20[0-5]/)) return 'Patlayıcı';
  if (hVar(/H26[01]/)) return 'Su ile Reaktif';
  if (hVar(/H27[012]/)) return 'Oksitleyici';

  if (iceren(['nitrat', 'perklorat', 'peroksit', 'permanganat', 'kromat', 'klorat', 'hipoklorit'])) return 'Oksitleyici';
  if (iceren(['asit'])) return 'Asit';
  if (iceren(['hidroksit', 'kostik', 'amonyak', 'amonyum hidroksit', 'sud kostik'])) return 'Baz / Alkali';
  if (iceren(['benzin', 'tiner', 'etanol', 'metanol', 'izopropanol', 'alkol', 'solvent', 'aseton', 'lpg', 'propan', 'bütan', 'hidrojen', 'asetilen', 'motorin', 'mazot', 'dizel', 'yakıt', 'kükürt'])) return 'Yanıcı / Parlayıcı';

  if (hVar(/H22[0-8]|H24[12]|H25[012]/)) return 'Yanıcı / Parlayıcı';
  if (hVar(/H28[01]/)) return 'Basınçlı Gaz';
  if (hVar(/H290|H314/)) return 'Korozif';
  if (hVar(/H30[01]|H31[01]|H33[01]/)) return 'Toksik';
  if (hVar(/H4[01]\d/)) return 'Çevre için Tehlikeli';
  return '';
}

function kimyasalNfpaGenelSeviye(saglik, yanicilik, kararsizlik) {
  const maks = Math.max(Number(saglik) || 0, Number(yanicilik) || 0, Number(kararsizlik) || 0);
  if (maks >= 4) return 'Kritik';
  if (maks === 3) return 'Yüksek';
  if (maks === 2) return 'Orta';
  return 'Düşük';
}

// GBF/SDS 5 yıl (1825 gün) geçerlilik kuralı — eski uygulamayla aynı.
function kimyasalSdsSuresiGecmisMi(sdsRevizyonTarihi, bugunStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sdsRevizyonTarihi || '')) return true;
  const bugun = new Date((bugunStr || bugunIso()) + 'T00:00:00');
  const revizyon = new Date(sdsRevizyonTarihi + 'T00:00:00');
  const gunFarki = Math.round((bugun - revizyon) / 86400000);
  return gunFarki > 1825;
}

// Geriye uyumluluk: iki grup/özellik "birlikte depolanamaz" değilse uyumlu.
function kimyasalGruplarUyumluMu(grubuA, grubuB) {
  return kimyasalMatrisDurumu(grubuA, grubuB) !== 'X';
}

// Ad, H kodları ve GHS piktogramlarından olası TÜM özellikleri önerir.
function kimyasalOzellikleriTahminEt(ad, hKodlari, ghsPiktogramlari) {
  const isim = String(ad || '').toLocaleLowerCase('tr');
  const h = (hKodlari || []).join(' ');
  const ghs = (ghsPiktogramlari || []).join(' ');
  const iceren = (liste) => liste.some(kelime => isim.includes(kelime));
  const sonuc = new Set();

  Object.keys(KIMYASAL_OZELLIK_GHS).forEach(o => { if (ghs.includes(KIMYASAL_OZELLIK_GHS[o])) sonuc.add(o); });
  if (iceren(['asit'])) sonuc.add('Asit');
  if (iceren(['hidroksit', 'kostik', 'amonyak'])) sonuc.add('Baz');
  if (iceren(['nitrat', 'perklorat', 'peroksit', 'permanganat', 'kromat', 'klorat', 'hipoklorit', 'nitrik']) || /H27[012]/.test(h)) sonuc.add('Oksitleyici Madde');
  if (iceren(['sülfit', 'tiyosülfat', 'hidrazin', 'hidrür', 'ditiyonit'])) sonuc.add('İndirgen');
  if (iceren(['klorür', 'sülfat', 'nitrat', 'karbonat', 'fosfat', 'sülfit', 'asetat', 'tuz']) && !sonuc.has('Asit')) sonuc.add('Tuz');
  if (iceren(['benzin', 'tiner', 'etanol', 'metanol', 'izopropanol', 'alkol', 'solvent', 'aseton', 'lpg', 'propan', 'bütan', 'hidrojen', 'asetilen', 'motorin', 'mazot', 'dizel', 'yakıt']) && !sonuc.has('Oksitleyici Madde')) sonuc.add('Yanıcı Madde');
  if (/H22[0-8]|H24[12]|H25[012]/.test(h)) sonuc.add('Yanıcı Madde');
  if (/H20[0-5]/.test(h)) sonuc.add('Patlayıcı Madde');
  if (/H26[01]/.test(h)) sonuc.add('Su ile Reaktif');
  if (/H28[01]/.test(h)) sonuc.add('Basınçlı Gaz');
  if (/H290|H314/.test(h)) sonuc.add('Aşındırıcı Madde');
  if (/H30[01]|H31[01]|H33[01]/.test(h)) sonuc.add('Akut Toksisite');
  if (/H334|H34\d|H35\d|H36\d|H37\d/.test(h)) sonuc.add('Ciddi Sağlık Tehlikesi');
  if (/H302|H312|H332|H315|H317|H319|H335|H336/.test(h)) sonuc.add('Sağlık Tehlikesi');
  if (/H4[01]\d/.test(h)) sonuc.add('Çevre İçin Zararlı');
  return KIMYASAL_OZELLIKLERI.filter(o => sonuc.has(o));
}

// İki özellik listesi için genel durum (en kötüsü: X > S > U) ve
// sorunlu çiftler.
function kimyasalOzellikKarsilastir(listeA, listeB, kurallar) {
  const k = kurallar || kimyasalMatrisKurallariGetir();
  let durum = 'U';
  const ciftler = [];
  (listeA || []).forEach(a => (listeB || []).forEach(b => {
    const d = kimyasalMatrisDurumu(a, b, k);
    if (d === 'U') return;
    ciftler.push(`${kimyasalOzellikNormalize(a)} ↔ ${kimyasalOzellikNormalize(b)}${d === 'S' ? ' (özel önlem)' : ''}`);
    if (d === 'X') durum = 'X';
    else if (durum !== 'X') durum = 'S';
  }));
  return { durum, ciftler };
}

// Yalnızca "birlikte depolanamaz" çiftler (boş dizi = depolanabilir).
function kimyasalOzellikCatismalari(listeA, listeB) {
  const k = kimyasalMatrisKurallariGetir();
  const catisma = [];
  (listeA || []).forEach(a => (listeB || []).forEach(b => {
    if (kimyasalMatrisDurumu(a, b, k) === 'X') catisma.push(`${kimyasalOzellikNormalize(a)} ↔ ${kimyasalOzellikNormalize(b)}`);
  }));
  return catisma;
}

// Bir kaydın matriste kullanılacak özellikleri: seçili özellikler; yoksa
// GHS piktogramları + Depolama Grubu; hiçbiri yoksa ad/H kodlarından tahmin.
function kimyasalEfektifOzellikleri(k) {
  if (Array.isArray(k.ozellikler) && k.ozellikler.length) {
    return { liste: Array.from(new Set(k.ozellikler.map(kimyasalOzellikNormalize))), tahminMi: false };
  }
  const tahmin = new Set(kimyasalOzellikleriTahminEt(k.ad, k.hKodlari, k.ghsPiktogramlari));
  if (k.depolamaGrubu && k.depolamaGrubu !== 'Genel') tahmin.add(kimyasalOzellikNormalize(k.depolamaGrubu));
  const liste = KIMYASAL_OZELLIKLERI.filter(o => tahmin.has(o));
  return { liste: liste.length ? liste : ['Genel'], tahminMi: liste.length > 0 };
}

// Aynı lokasyondaki, aktif kayıtları ikili karşılaştırarak birlikte
// depolanmaması gereken çiftleri tespit eder.
function kimyasalDepolamaUyumsuzluklariBul(kayitlar) {
  const aktifler = (kayitlar || []).filter(k => k.durum !== 'İptal' && k.lokasyon);
  const kurallar = kimyasalMatrisKurallariGetir();
  const sonuc = [];
  for (let i = 0; i < aktifler.length; i++) {
    for (let j = i + 1; j < aktifler.length; j++) {
      const a = aktifler[i];
      const b = aktifler[j];
      if (a.lokasyon !== b.lokasyon) continue;
      const aO = kimyasalEfektifOzellikleri(a).liste;
      const bO = kimyasalEfektifOzellikleri(b).liste;
      const ozel = kurallar['kim:' + [a.id, b.id].sort().join('|')];
      if (ozel ? ozel !== 'X' : kimyasalOzellikKarsilastir(aO, bO, kurallar).durum !== 'X') continue;
      sonuc.push({
        lokasyon: a.lokasyon,
        a: a.ad, aGrup: aO.join(', '),
        b: b.ad, bGrup: bO.join(', '),
        siddet: (a.kritikMi || b.kritikMi) ? 'Kritik' : 'Yüksek'
      });
    }
  }
  return sonuc;
}

function kimyasalKaydiOlustur(veriler) {
  const ghsPiktogramlari = _listeyeAyir(veriler.ghsPiktogramlari);
  const hKodlari = _listeyeAyir(veriler.hKodlari);
  const pKodlari = _listeyeAyir(veriler.pKodlari);
  const riskSeviyesi = veriler.riskSeviyesi || kimyasalRiskSeviyesiTahminEt(ghsPiktogramlari, hKodlari);

  return {
    id: veriler.id || rastgeleId(),
    kimyasalNo: veriler.kimyasalNo || '',
    ad: (veriler.ad || '').trim(),
    ticariAdi: (veriler.ticariAdi || '').trim(),
    casNo: (veriler.casNo || '').trim(),
    ecNo: (veriler.ecNo || '').trim(),
    tedarikci: (veriler.tedarikci || '').trim(),
    bolum: (veriler.bolum || '').trim(),
    lokasyon: (veriler.lokasyon || '').trim(),
    depolamaGrubu: veriler.depolamaGrubu || 'Genel',
    ozellikler: Array.isArray(veriler.ozellikler) ? veriler.ozellikler : _listeyeAyir(veriler.ozellikler),
    fizikselHali: veriler.fizikselHali || 'Sıvı',
    miktar: veriler.miktar === '' || veriler.miktar == null ? null : Number(veriler.miktar),
    birim: (veriler.birim || '').trim(),

    ghsPiktogramlari,
    hKodlari,
    pKodlari,
    riskSeviyesi,

    nfpaSaglik: Number(veriler.nfpaSaglik) || 0,
    nfpaYanicilik: Number(veriler.nfpaYanicilik) || 0,
    nfpaKararsizlik: Number(veriler.nfpaKararsizlik) || 0,
    nfpaOzelKod: _listeyeAyir(veriler.nfpaOzelKod),

    sdsRevizyonTarihi: veriler.sdsRevizyonTarihi || '',
    sdsDosyaAdi: (veriler.sdsDosyaAdi || '').trim(),
    sdsGorseli: veriler.sdsGorseli || '',

    riskDegerlendirmeBaglantisi: (veriler.riskDegerlendirmeBaglantisi || '').trim(),
    depolamaNotu: (veriler.depolamaNotu || '').trim(),
    notlar: (veriler.notlar || '').trim(),

    durum: veriler.durum || 'Aktif',
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}
