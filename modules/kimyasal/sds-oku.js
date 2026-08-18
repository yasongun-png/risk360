// SDS/GBF (Güvenlik Bilgi Formu) PDF'inden otomatik veri çıkarma. KKDİK
// Yönetmeliği Ek-2 / eski 28848-29204 formatındaki (BÖLÜM 1-16) dijital metin
// PDF'lerini hedefler -- taranmış/görsel PDF'lerde metin bulunamayacağı için
// sonuç boş döner. Çıkarılan veriler bir İLK ÖNERİDİR; kaydetmeden önce
// kullanıcı formda kontrol etmelidir (bkz. model.js dosya başı NFPA/risk
// uyarısıyla aynı ilke).

if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
}

// H-kodundan GHS piktogramına eşleme (ECHA GHS sınıflandırma tablosuna göre).
const SDS_H_KODU_GHS_ESLESMESI = {
  GHS01: ['H200', 'H201', 'H202', 'H203', 'H204', 'H205', 'H240', 'H241'],
  GHS02: ['H220', 'H221', 'H222', 'H223', 'H224', 'H225', 'H226', 'H227', 'H228', 'H242', 'H250', 'H251', 'H252', 'H260', 'H261'],
  GHS03: ['H270', 'H271', 'H272'],
  GHS04: ['H280', 'H281'],
  GHS05: ['H290', 'H314', 'H318'],
  GHS06: ['H300', 'H301', 'H310', 'H311', 'H330', 'H331'],
  GHS07: ['H302', 'H303', 'H312', 'H313', 'H315', 'H317', 'H319', 'H320', 'H332', 'H333', 'H335', 'H336'],
  GHS08: ['H304', 'H334', 'H340', 'H341', 'H350', 'H351', 'H360', 'H361', 'H362', 'H370', 'H371', 'H372', 'H373'],
  GHS09: ['H400', 'H410', 'H411', 'H412', 'H413', 'H420']
};

function sdsHKodlarindanGhsTahminEt(hKodlari) {
  const kodlar = new Set((hKodlari || []).map(k => (String(k).match(/H\d{3}/) || [])[0]).filter(Boolean));
  return Object.keys(SDS_H_KODU_GHS_ESLESMESI).filter(ghsKodu =>
    SDS_H_KODU_GHS_ESLESMESI[ghsKodu].some(h => kodlar.has(h))
  );
}

function _sdsTarihiIsoyaCevir(tarih) {
  const parcalar = String(tarih || '').split(/[./]/);
  if (parcalar.length !== 3) return '';
  let [gun, ay, yil] = parcalar;
  if (yil.length === 2) yil = '20' + yil;
  gun = gun.padStart(2, '0');
  ay = ay.padStart(2, '0');
  if (!/^\d{4}$/.test(yil) || !/^\d{2}$/.test(ay) || !/^\d{2}$/.test(gun)) return '';
  return `${yil}-${ay}-${gun}`;
}

function _sdsEtiketSonrasiniAl(metin, etiketler) {
  for (const etiket of etiketler) {
    // Etiketin devamı küçük harfle sürüyorsa (ör. "tedarikçisinin bilgileri"
    // başlığı "Tedarikçi" etiketiyle karışmasın) bu bir eşleşme sayılmaz.
    const eslesme = metin.match(new RegExp(etiket + '(?![a-zçğıöşü])\\s*[:：]?\\s*([^\\n]+)', 'i'));
    if (eslesme && eslesme[1].trim()) return eslesme[1].trim();
  }
  return '';
}

function _sdsFizikselHaliTahminEt(metin) {
  const deger = _sdsEtiketSonrasiniAl(metin, ['Fiziksel\\s*Durumu', 'Fiziksel\\s*Hali', 'Agrega\\s*Hali', 'Görünüm', 'Görünüş']).toLocaleLowerCase('tr');
  if (!deger) return '';
  if (deger.includes('sıvı') || deger.includes('likit')) return 'Sıvı';
  if (deger.includes('katı') || deger.includes('toz') || deger.includes('granül') || deger.includes('pellet')) return 'Katı';
  if (deger.includes('gaz')) return 'Gaz';
  if (deger.includes('aerosol') || deger.includes('sprey')) return 'Aerosol';
  return '';
}

// PDF'in tüm sayfalarındaki metni sırayla birleştirir (pdfjsLib gerektirir).
// pdf.js metin öğelerini "satır" bilgisi olmadan tek tek döner; öğe
// düşey konumu (transform[5]) bir öncekinden belirgin farklıysa yeni
// satıra geçildiği kabul edilir (ayrıca pdf.js'in kendi hasEOL bayrağı da
// yedek sinyal olarak kullanılır). Bu olmadan bir sayfadaki TÜM metin tek
// satır haline gelir ve etiket/değer eşleştirmesi (ör. "Ürün Adı") o
// satırdaki geri kalan tüm sayfa içeriğini yakalar.
async function sdsPdfMetniniOku(dosya) {
  if (typeof pdfjsLib === 'undefined') throw new Error('PDF okuma kütüphanesi yüklenemedi.');
  const arrayBuffer = await dosya.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let metin = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const sayfa = await pdf.getPage(i);
    const icerik = await sayfa.getTextContent();
    let oncekiY = null;
    icerik.items.forEach(o => {
      if (typeof o.str !== 'string') return;
      const y = Array.isArray(o.transform) && o.transform.length === 6 ? o.transform[5] : null;
      if (oncekiY !== null && y !== null && Math.abs(y - oncekiY) > 1.5) metin += '\n';
      else if (metin && !/\s$/.test(metin)) metin += ' ';
      metin += o.str;
      if (o.hasEOL) metin += '\n';
      if (y !== null) oncekiY = y;
    });
    metin += '\n';
  }
  return metin;
}

// Ham SDS metninden yapılandırılmış bir öneri objesi çıkarır. Hiçbir alan
// bulunamazsa boş/[] döner -- çağıran taraf sadece dolu alanları forma yazar.
function sdsMetnindenVeriCikar(metinHam) {
  const metin = String(metinHam || '').replace(/\r/g, '');

  const maddeAdi = _sdsEtiketSonrasiniAl(metin, ['Madde\\s*[Aa]dı']);
  const urunAdi = _sdsEtiketSonrasiniAl(metin, ['Ürün\\s*[Aa]dı']);
  const ad = maddeAdi || urunAdi;
  const ticariAdi = (urunAdi && urunAdi !== ad) ? urunAdi : '';

  // Tablo düzenli SDS'lerde etiket ile değer arasında çok geniş boşluk
  // dolgusu olabilir (sütun hizalama) -- satır atlamadan geniş bir aralıkta ara.
  const casEslesme = metin.match(/CAS\s*(?:No\.?|Numarası)[^\d\n]{0,80}?(\d{2,7}-\d{2}-\d)/i);
  const ecEslesme = metin.match(/EC\s*(?:No\.?|[Nn]umarası)[^\d\n]{0,80}?(\d{3}-\d{3}-\d)/i);

  const tedarikci = _sdsEtiketSonrasiniAl(metin, ['Tedarikçi']);

  const hKodlari = Array.from(new Set((metin.match(/\bH\d{3}(?:\s*\+\s*H\d{3})*\b/g) || []).map(s => s.replace(/\s+/g, ''))));
  const pKodlari = Array.from(new Set((metin.match(/\bP\d{3}(?:\s*\+\s*P\d{3})*\b/g) || []).map(s => s.replace(/\s+/g, ''))));
  const ghsPiktogramlari = sdsHKodlarindanGhsTahminEt(hKodlari);

  const tarihEslesme = metin.match(/(?:Yeni\s*Düzenleme\s*Tarihi|Düzenleme\s*Tarihi|Hazırlama\s*Tarihi)\D{0,5}(\d{1,2}[./]\d{1,2}[./]\d{2,4})/i);
  const sdsRevizyonTarihi = tarihEslesme ? _sdsTarihiIsoyaCevir(tarihEslesme[1]) : '';

  const fizikselHali = _sdsFizikselHaliTahminEt(metin);

  return {
    ad,
    ticariAdi,
    casNo: casEslesme ? casEslesme[1] : '',
    ecNo: ecEslesme ? ecEslesme[1] : '',
    tedarikci,
    hKodlari,
    pKodlari,
    ghsPiktogramlari,
    sdsRevizyonTarihi,
    fizikselHali
  };
}
