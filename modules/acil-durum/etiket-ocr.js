// Yangın tüpü metal etiketinin fotoğrafından bilgi çıkarma.
//
// ÖNEMLİ: Uygulamada herhangi bir AI/LLM entegrasyonu YOKTUR (vanilla JS +
// Firestore, client-side). Burada kullanılan Tesseract.js (index.html'e CDN
// ile eklenir) klasik, kural tabanlı bir OCR (optik karakter tanıma)
// motorudur — görüntüyü "anlamaz", sadece karakterleri tanımaya çalışır.
// Bu yüzden sonuç ASLA doğrudan kaydedilmez: her zaman "Yangın Tüpü Ekle"
// formuna ÖN DOLU olarak aktarılır, kullanıcı gözden geçirip düzeltir ve
// kendisi kaydeder (bkz. ui.js yanginTupuEtiketAktar).

// Etiketlerde alan adları "ANAHTAR : DEĞER" biçiminde satır satır basılı
// (bkz. kullanıcının paylaştığı örnek etiket). Anahtarı OCR gürültüsüne
// (Türkçe karakter hataları, boşluk farkları) karşı dayanıklı eşleştirmek
// için ASCII'ye indirgenmiş büyük harf haliyle karşılaştırıyoruz.
function _eoAnahtarNormallestir(s) {
  const harfEslesme = { 'İ': 'I', 'Ş': 'S', 'Ğ': 'G', 'Ü': 'U', 'Ö': 'O', 'Ç': 'C' };
  return s.toUpperCase().split('').map(c => harfEslesme[c] || c).join('');
}

// "104" -> "2024-01-01" gibi tahmini gün eklemeden, etikette verilen
// gün/ay/yıl hassasiyetini olabildiğince koruyarak ISO tarihe çevirir.
// Yalnızca yıl varsa 1 Ocak, yalnızca ay/yıl varsa ayın 1'i varsayılır —
// kullanıcı forma aktarıldıktan sonra tam tarihi düzeltebilir.
function _eoTarihIsoyeCevir(ham) {
  if (!ham) return '';
  const temiz = ham.trim();
  let e = temiz.match(/^(\d{4})$/);
  if (e) return e[1] + '-01-01';
  e = temiz.match(/^(\d{1,2})[.\/-](\d{4})$/);
  if (e) return e[2] + '-' + e[1].padStart(2, '0') + '-01';
  e = temiz.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);
  if (e) return e[3] + '-' + e[2].padStart(2, '0') + '-' + e[1].padStart(2, '0');
  return '';
}

const _EO_TIP_HARITASI = { KKT: 'Kuru Kimyevi Toz (KKT)', CO2: 'CO2', KOPUK: 'Köpük', SU: 'Su' };

function _eoTemizle(s) {
  return (s || '').replace(/\s+/g, ' ').trim();
}

// Serbest metin alanları (üretici/lokasyon/firma) hiçbir sayı/newline sınırı
// olmadan "sonraki alanın adına kadar" her şeyi yutabiliyordu (ör. "POWEREX
// YSC CINSI" gibi) — hem yakalanan değerde hem de (daha önemlisi) metinden
// SİLİNEN kısımda, bu da bir sonraki alanın anahtar kelimesini bozup o alanın
// hiç bulunamamasına yol açıyordu. Regex'in kendisine "bilinen bir alan
// anahtarı görürsen dur" negatif ileriye bakışı (lookahead) ekleyerek hem
// yakalamayı hem metinden çıkarmayı aynı anda doğru sınırda tutuyoruz.
const _EO_DURDURMA_DESENI = '(?:YSC|CINSI|BULUNDUGU|YER|URETIM|DOLUM|TEKRAR|TEST|SERI|FIRMA|URETICI|TARIHI|NUMARASI|KONTROLLER)';
function _eoAnahtarSonrasiMetinDeseni(anahtarDeseni, azMiktar, cokMiktar) {
  return new RegExp(anahtarDeseni + '[^A-Z]{0,10}([A-Z](?:(?!\\b' + _EO_DURDURMA_DESENI + '\\b)[A-Z .]){' + (azMiktar - 1) + ',' + (cokMiktar - 1) + '})');
}

// Kullanıcının paylaştığı gerçek etiketler her zaman aynı sabit şablon:
// üstte servis firmasının başlık bloğu (adres/telefon), bir "KONTROLLER"
// çeyrek dönem kontrol tablosu, QR kod ve yuvarlak tarih çarkı etiketi —
// ardından 9 satırlık "ANAHTAR : DEĞER" bilgi bloğu. Satır satır ayrıştırma
// OCR satırları birleştirdiğinde/böldüğünde kırılgan kalıyordu; bunun yerine
// TÜM ham metin üzerinde her alanı ayrı, dar kapsamlı bir "anahtar kelimeden
// sonraki yakın değer" deseniyle arıyoruz — bu, satır sınırlarından ve
// KONTROLLER/QR/telefon gibi etraftaki gürültüden etkilenmiyor. Bir alan
// bulunduğunda metinden çıkarılıyor ki aynı sayı/metin grubu başka bir alanla
// yanlışlıkla tekrar eşleşmesin (ör. "TEKRAR DOLUM" içindeki "DOLUM" ayrı bir
// "DOLUM TARİHİ" eşleşmesi olarak tekrar sayılmasın).
function _eoAlanlariAyikla(hamMetin) {
  const alanlar = {};
  let kalan = _eoAnahtarNormallestir(_eoTemizle(hamMetin || ''));

  const bul = (desen) => {
    const e = kalan.match(desen);
    if (e) kalan = kalan.replace(e[0], ' ');
    return e;
  };

  // "6 KG KKT" / "30 KG CO2" — çok belirgin bir sayı+birim+tür örüntüsü,
  // metnin neresinde geçerse geçsin güvenle yakalanabilir.
  const yscEslesme = bul(/(\d{1,3}(?:[.,]\d+)?)\s*KG\s*(KKT|CO2|KOPUK|SU)\b/);
  if (yscEslesme) {
    alanlar.kapasite = yscEslesme[1].replace(',', '.') + ' KG';
    alanlar.tip = _EO_TIP_HARITASI[yscEslesme[2]] || '';
  }

  // "Tekrar Dolum Tarihi" — genel "Dolum Tarihi" aramasından ÖNCE bulunup
  // metinden çıkarılmalı, aksi halde aşağıdaki arama onu tekrar yakalar.
  const tekrarEslesme = bul(/TEKRAR[^0-9A-Z]{0,20}DOLUM[^0-9]{0,10}(\d{1,2}[.\/-]\d{4}|\d{4})/);
  if (tekrarEslesme) alanlar.sonrakiYillikBakim = _eoTarihIsoyeCevir(tekrarEslesme[1]);

  // "SERİ NUMARASI" -> "SERI NUMARASI"; OCR "İ"yi zaman zaman "1"/"L" olarak
  // okuyabildiğinden "SER" + 1-2 belirsiz karakterle eşleşiyoruz.
  const seriEslesme = bul(/SER[İIL1]{1,2}[^0-9]{0,20}(\d{1,6})\b/);
  if (seriEslesme) alanlar.seriNumarasi = seriEslesme[1];

  const uretimEslesme = bul(/URET[İIL1]M[^0-9]{0,15}(\d{4})/);
  if (uretimEslesme) alanlar.uretimTarihi = uretimEslesme[1];

  const testEslesme = bul(/TEST[^0-9]{0,15}(\d{4})/);
  if (testEslesme) alanlar.sonrakiHidrostatikTest = _eoTarihIsoyeCevir(testEslesme[1]);

  const dolumEslesme = bul(/DOLUM[^0-9]{0,15}(\d{1,2}[.\/-]\d{4}|\d{4})/);
  if (dolumEslesme) alanlar.doluTarihi = _eoTarihIsoyeCevir(dolumEslesme[1]);

  const ureticiEslesme = bul(_eoAnahtarSonrasiMetinDeseni('URET[İIL1]C[İIL1]', 1, 30));
  if (ureticiEslesme) alanlar.uretici = _eoTemizle(ureticiEslesme[1]);

  const yerEslesme = bul(_eoAnahtarSonrasiMetinDeseni('BULUNDU[GĞ]U\\s*YER', 2, 40));
  if (yerEslesme) alanlar.lokasyon = _eoTemizle(yerEslesme[1]);

  // Etiketteki "Firma" bölgede kurulu olan işyerinin adıdır (bakım/dolum
  // firmasının müşterisi) — uygulamada zaten aktif firma bağlamı var,
  // otomatik forma yazılmaz; sadece notlar alanına bilgi olarak eklenir.
  const firmaEslesme = bul(_eoAnahtarSonrasiMetinDeseni('\\bFIRMA', 2, 40));
  if (firmaEslesme) alanlar.firmaNotu = _eoTemizle(firmaEslesme[1]);

  return alanlar;
}

// Fotoğrafın çoğu genelde tüpün kırmızı gövdesi/arka plan — etiketin kendisi
// karenin küçük bir bölümü. Tesseract'ın sayfa segmentasyonu böyle "az metin,
// çok metin-dışı alan" içeren fotoğraflarda hiç metin bulamayıp boş sonuç
// dönebiliyor (hata fırlatmadan). Bunu iyileştirmek için fotoğrafı OCR'a
// vermeden önce gri tonlamaya çevirip kontrastı güçlendiriyoruz — metal
// etiket üzerindeki siyah yazı/beyaz zemin ayrımını netleştirir.
// Bradley'nin yerel ortalama uyarlamalı eşikleme algoritması — her pikseli
// KENDİ çevresindeki (pencere) ortalama parlaklıkla karşılaştırıp siyah/beyaz
// karar verir. Metal etiketler eğik/kavisli yüzeyde parlama ve gölge
// içerdiğinden (fotoğrafın bir köşesi parlak, diğeri karanlık olabilir), tek
// bir global eşik (ör. min-max kontrast germe) bunu düzeltemiyor — yerel
// pencere yaklaşımı aydınlatma farklılıklarına karşı çok daha dayanıklı.
// (integral image ile O(piksel) karmaşıklıkta, pencere boyutundan bağımsız hızlı.)
function _eoUyarlamaliEsikle(griler, genislik, yukseklik) {
  const integral = new Float64Array(genislik * yukseklik);
  for (let y = 0; y < yukseklik; y++) {
    let satirToplami = 0;
    for (let x = 0; x < genislik; x++) {
      const idx = y * genislik + x;
      satirToplami += griler[idx];
      integral[idx] = satirToplami + (y > 0 ? integral[idx - genislik] : 0);
    }
  }

  const pencereYarisi = Math.max(8, Math.round(genislik / 16));
  const esikOrani = 0.85; // pikselin siyah sayılması için yerel ortalamanın altında kalması gereken oran
  const sonuc = new Uint8ClampedArray(genislik * yukseklik);

  const alanToplami = (x1, y1, x2, y2) => {
    const a = y2 * genislik + x2;
    const b = x1 > 0 ? y2 * genislik + (x1 - 1) : -1;
    const c = y1 > 0 ? (y1 - 1) * genislik + x2 : -1;
    const d = (x1 > 0 && y1 > 0) ? (y1 - 1) * genislik + (x1 - 1) : -1;
    return integral[a] - (b >= 0 ? integral[b] : 0) - (c >= 0 ? integral[c] : 0) + (d >= 0 ? integral[d] : 0);
  };

  for (let y = 0; y < yukseklik; y++) {
    const y1 = Math.max(0, y - pencereYarisi);
    const y2 = Math.min(yukseklik - 1, y + pencereYarisi);
    for (let x = 0; x < genislik; x++) {
      const x1 = Math.max(0, x - pencereYarisi);
      const x2 = Math.min(genislik - 1, x + pencereYarisi);
      const alan = (x2 - x1 + 1) * (y2 - y1 + 1);
      const ortalama = alanToplami(x1, y1, x2, y2) / alan;
      const idx = y * genislik + x;
      sonuc[idx] = griler[idx] < ortalama * esikOrani ? 0 : 255;
    }
  }
  return sonuc;
}

function _eoGoruntuOnIsle(dosya) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(dosya);
    img.onload = () => {
      URL.revokeObjectURL(url);
      // Uzun kenarı ~1800px'e getiriyoruz: çok küçük fotoğrafları büyütüp
      // karakterleri okunur hale getiriyor, telefon kameralarının ürettiği
      // çok büyük fotoğrafları da (yavaş piksel işleme) makul boyuta indiriyor.
      const uzunKenar = Math.max(img.naturalWidth, img.naturalHeight);
      const olcek = Math.min(2, Math.max(0.5, 1800 / uzunKenar));
      const genislik = Math.round(img.naturalWidth * olcek);
      const yukseklik = Math.round(img.naturalHeight * olcek);

      const canvas = document.createElement('canvas');
      canvas.width = genislik;
      canvas.height = yukseklik;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, genislik, yukseklik);

      const veri = ctx.getImageData(0, 0, genislik, yukseklik);
      const p = veri.data;
      const griler = new Uint8ClampedArray(p.length / 4);
      for (let i = 0; i < p.length; i += 4) {
        griler[i / 4] = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
      }

      const esiklenmis = _eoUyarlamaliEsikle(griler, genislik, yukseklik);
      for (let i = 0; i < p.length; i += 4) {
        const g = esiklenmis[i / 4];
        p[i] = g; p[i + 1] = g; p[i + 2] = g;
      }
      ctx.putImageData(veri, 0, 0);
      resolve(canvas);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Fotoğraf yüklenemedi.')); };
    img.src = url;
  });
}

// dosya: <input type="file"> seçilen File nesnesi. ilerlemeCallback(yuzde)
// isteğe bağlı — tarama sırasında ilerleme çubuğu göstermek için.
async function yanginTupuEtiketiOku(dosya, ilerlemeCallback) {
  const islenmisGorsel = await _eoGoruntuOnIsle(dosya);

  // Deprecated Tesseract.recognize() kısayolu sayfa segmentasyon modunu
  // (PSM) değiştirmeye izin vermiyor, bu yüzden worker'ı elle oluşturup
  // worker.setParameters çağırıyoruz. PSM.AUTO ("tam otomatik sayfa
  // segmentasyonu") — etiket fotoğrafında birbirinden farklı biçimli birden
  // fazla blok olduğundan (üst bilgi paragrafı, KONTROLLER tablosu, QR kod,
  // alan listesi) hem "tek düzgün blok" varsayan SINGLE_BLOCK hem de "sadece
  // dağınık tek kelimeler" varsayan SPARSE_TEXT modundan daha dengeli.
  const worker = await Tesseract.createWorker('tur', 1, {
    logger: m => {
      if (ilerlemeCallback && m.status === 'recognizing text') ilerlemeCallback(Math.round((m.progress || 0) * 100));
    }
  });
  let hamMetin = '';
  try {
    await worker.setParameters({ tessedit_pageseg_mode: Tesseract.PSM.AUTO });
    const sonuc = await worker.recognize(islenmisGorsel);
    hamMetin = (sonuc && sonuc.data && sonuc.data.text) || '';
  } finally {
    await worker.terminate();
  }

  return { hamMetin, alanlar: _eoAlanlariAyikla(hamMetin) };
}
