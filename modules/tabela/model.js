// Tabela Yönetimi veri modeli: sahadaki İSG levhaları (Mevcut), satın
// alınması/asılması gereken levhalar (İhtiyaç) ve levha görsel kataloğu
// (Katalog). Eski BAGFAŞ "Tabela Yönetim Sistemi" (isg1/tabela-yonetim)
// uygulamasından taşındı; bölüm artık firma kartındaki Bölümler listesinden
// gelir (bkz. core/tenant.js firma.bolumler), fotoğraflar "fotoref:" ile
// ayrı belgelerde tutulur (bkz. core/data.js fotoYukle).

// Ebat "boy x en" (cm) yazılır; yön ebattan otomatik belirlenir: boy < en ise
// Yatay (ör. 35x50), değilse Dikey (ör. 50x35) — aşağıdaki gruplamayla aynı.
// Not: eski uygulama yönü ters hesaplıyordu (35x50'yi Dikey kaydediyordu);
// içe aktarımda yön ebattan yeniden hesaplanır.
const TABELA_EBATLARI = [
  { deger: '12x30', grup: 'Yatay' },
  { deger: '25x35', grup: 'Yatay' },
  { deger: '35x50', grup: 'Yatay' },
  { deger: '50x70', grup: 'Yatay' },
  { deger: '35x25', grup: 'Dikey' },
  { deger: '50x35', grup: 'Dikey' },
  { deger: '70x50', grup: 'Dikey' }
];
const TABELA_VARSAYILAN_EBAT = '35x50';
const TABELA_MALZEMELERI = ['Dekota', 'PVC', 'Galvaniz Saç'];
const TABELA_VARSAYILAN_MALZEME = 'PVC';
const TABELA_ONCELIKLERI = ['Yüksek', 'Orta', 'Düşük'];
const TABELA_KATALOG_KATEGORILERI = ['Yangın', 'Uyarı', 'Zorunluluk', 'Yasak', 'Acil Durum', 'Trafik', 'Kimyasal', 'Diğer'];

// toISOString() UTC'ye çevirir; UTC+3'te gece yarısı bir gün geri kayar
// (bkz. periyodik-kontrol/model.js _periyodikYerelTarihStr).
function tabelaBugun() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function tabelaYonHesapla(ebat) {
  const m = /(\d+)\s*[x×]\s*(\d+)/i.exec(String(ebat || ''));
  if (!m) return 'Dikey';
  return Number(m[1]) < Number(m[2]) ? 'Yatay' : 'Dikey';
}

function tabelaEbatGoruntu(ebat) {
  return ebat ? String(ebat).replace(/x/gi, '×') + ' cm' : '';
}

// "35×50 cm • Yatay • PVC"
function tabelaOlcuSatiri(kayit) {
  return [tabelaEbatGoruntu(kayit.ebat), kayit.ebat ? tabelaYonHesapla(kayit.ebat) : '', kayit.malzeme].filter(Boolean).join(' • ');
}

// Mevcut tabelalarda bir sonraki "TB-0001" numarası (listedeki en büyük + 1).
function tabelaSonrakiNoUret(mevcutListe) {
  let maks = 0;
  (mevcutListe || []).forEach(k => {
    const m = /^TB-(\d+)$/i.exec(String(k.tabelaNo || '').trim());
    if (m) maks = Math.max(maks, parseInt(m[1], 10));
  });
  return 'TB-' + String(maks + 1).padStart(4, '0');
}

function _tabelaOrtakAlanlar(veriler) {
  const ebat = veriler.ebat || TABELA_VARSAYILAN_EBAT;
  return {
    bolum: (veriler.bolum || '').trim(),
    lokasyon: (veriler.lokasyon || '').trim(),
    tabelaAdi: (veriler.tabelaAdi || '').trim(),
    foto: veriler.foto || '',
    adet: Math.max(1, parseInt(veriler.adet, 10) || 1),
    ebat,
    yon: tabelaYonHesapla(ebat),
    malzeme: veriler.malzeme || TABELA_VARSAYILAN_MALZEME
  };
}

function tabelaMevcutOlustur(veriler) {
  return Object.assign({ id: veriler.id || rastgeleId() }, _tabelaOrtakAlanlar(veriler), {
    tabelaNo: (veriler.tabelaNo || '').trim(),
    not: (veriler.not || '').trim(),
    tarih: veriler.tarih || tabelaBugun()
  });
}

function tabelaIhtiyacOlustur(veriler) {
  return Object.assign({ id: veriler.id || rastgeleId() }, _tabelaOrtakAlanlar(veriler), {
    oncelik: TABELA_ONCELIKLERI.includes(veriler.oncelik) ? veriler.oncelik : 'Orta',
    kategori: (veriler.kategori || '').trim(),
    gerekce: (veriler.gerekce || '').trim(),
    tarih: veriler.tarih || tabelaBugun()
  });
}

function tabelaKatalogOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    tabelaAdi: (veriler.tabelaAdi || '').trim(),
    kategori: TABELA_KATALOG_KATEGORILERI.includes(veriler.kategori) ? veriler.kategori : 'Diğer',
    foto: veriler.foto || '',
    tarih: veriler.tarih || tabelaBugun()
  };
}
