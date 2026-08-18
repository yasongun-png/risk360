// Kimyasal Yönetimi veri modeli. Eski üretim uygulamasındaki chemical_management
// modülünden mümkün olduğunca aynı iş kuralları taşınmıştır: GHS/H-kodu tabanlı
// risk seviyesi ve NFPA 704 ("yangın elması") başlangıç önerisi, depolama grubu
// bazlı birlikte-depolanamama matrisi, GBF/SDS 5 yıllık geçerlilik kuralı. NFPA
// ve risk önerileri SADECE başlangıç önerisidir — İSG uzmanı SDS Bölüm 2/16'ya
// göre teyit etmeli/değiştirmelidir; otomatik öneri kesin veri yerine geçmez.

function bugunIso() {
  return new Date().toISOString().slice(0, 10);
}

const KIMYASAL_FIZIKSEL_HALLER = ['Katı', 'Sıvı', 'Gaz', 'Aerosol', 'Diğer'];

const KIMYASAL_DEPOLAMA_GRUPLARI = [
  'Asit', 'Baz / Alkali', 'Oksitleyici', 'Yanıcı / Parlayıcı', 'Toksik',
  'Korozif', 'Basınçlı Gaz', 'Su ile Reaktif', 'Patlayıcı', 'Çevre için Tehlikeli', 'Genel'
];

const KIMYASAL_RISK_SEVIYELERI = ['Düşük', 'Orta', 'Yüksek', 'Kritik'];
const KIMYASAL_DURUMLARI = ['Aktif', 'Pasif', 'Kullanım Dışı', 'İptal'];

const GHS_PIKTOGRAMLARI = [
  'GHS01 Patlayıcı', 'GHS02 Alev', 'GHS03 Oksitleyici', 'GHS04 Basınçlı Gaz',
  'GHS05 Korozif', 'GHS06 Akut Toksisite', 'GHS07 Zararlı / Tahriş Edici',
  'GHS08 Sağlık Tehlikesi', 'GHS09 Çevre'
];

const NFPA_OZEL_KODLARI = { OX: 'Oksitleyici (OX)', W: 'Su ile Reaksiyona Girmemeli (W)' };

// Depolama grubu bazlı birlikte-depolanmaması gereken çiftler (simetrik).
const KIMYASAL_UYUMSUZLUK_KURALLARI = {
  'Asit': ['Baz / Alkali', 'Oksitleyici', 'Su ile Reaktif'],
  'Baz / Alkali': ['Asit', 'Oksitleyici'],
  'Oksitleyici': ['Yanıcı / Parlayıcı', 'Asit', 'Baz / Alkali', 'Su ile Reaktif'],
  'Yanıcı / Parlayıcı': ['Oksitleyici', 'Patlayıcı'],
  'Toksik': ['Asit', 'Baz / Alkali'],
  'Korozif': ['Yanıcı / Parlayıcı', 'Su ile Reaktif'],
  'Basınçlı Gaz': ['Yanıcı / Parlayıcı', 'Oksitleyici'],
  'Su ile Reaktif': ['Asit', 'Baz / Alkali', 'Oksitleyici', 'Korozif'],
  'Patlayıcı': ['Yanıcı / Parlayıcı', 'Oksitleyici']
};

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

// İki depolama grubunun birlikte depolanabilir olup olmadığını söyler.
// KIMYASAL_UYUMSUZLUK_KURALLARI tek yönlü tanımlı olabileceğinden (ör.
// yalnızca 'Asit': [...'Oksitleyici'] yazılıp tersi unutulmuş olabilir) her
// iki yönde de bakılır. Aynı grup veya boş grup her zaman uyumlu sayılır.
function kimyasalGruplarUyumluMu(grubuA, grubuB) {
  if (!grubuA || !grubuB || grubuA === grubuB) return true;
  const aYonu = (KIMYASAL_UYUMSUZLUK_KURALLARI[grubuA] || []).includes(grubuB);
  const bYonu = (KIMYASAL_UYUMSUZLUK_KURALLARI[grubuB] || []).includes(grubuA);
  return !(aYonu || bYonu);
}

// Aynı lokasyondaki, aktif kayıtları ikili karşılaştırarak birlikte
// depolanmaması gereken çiftleri tespit eder.
function kimyasalDepolamaUyumsuzluklariBul(kayitlar) {
  const aktifler = (kayitlar || []).filter(k => k.durum !== 'İptal' && k.lokasyon);
  const sonuc = [];
  for (let i = 0; i < aktifler.length; i++) {
    for (let j = i + 1; j < aktifler.length; j++) {
      const a = aktifler[i];
      const b = aktifler[j];
      if (a.lokasyon !== b.lokasyon) continue;
      if (kimyasalGruplarUyumluMu(a.depolamaGrubu, b.depolamaGrubu)) continue;
      sonuc.push({
        lokasyon: a.lokasyon,
        a: a.ad, aGrup: a.depolamaGrubu,
        b: b.ad, bGrup: b.depolamaGrubu,
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
