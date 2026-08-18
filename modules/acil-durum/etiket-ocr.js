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

// "6 KG KKT" -> { tip:'Kuru Kimyevi Toz (KKT)', kapasite:'6 KG' }
function _eoYscCinsiAyikla(ham) {
  const sonuc = { tip: '', kapasite: '' };
  if (!ham) return sonuc;
  const kapasiteEslesme = ham.match(/(\d+(?:[.,]\d+)?)\s*KG/i);
  if (kapasiteEslesme) sonuc.kapasite = kapasiteEslesme[1].replace(',', '.') + ' KG';
  const buyuk = _eoAnahtarNormallestir(ham);
  if (/KKT|KURU KIM/.test(buyuk)) sonuc.tip = 'Kuru Kimyevi Toz (KKT)';
  else if (/CO2|KARBONDIOKSIT/.test(buyuk)) sonuc.tip = 'CO2';
  else if (/KOPUK|FOAM/.test(buyuk)) sonuc.tip = 'Köpük';
  else if (/\bSU\b|SULU/.test(buyuk)) sonuc.tip = 'Su';
  return sonuc;
}

// OCR'ın ham metnini satır satır tarayıp "ANAHTAR : DEĞER" eşlemelerini
// bilinen alan adlarıyla eşleştirir. Tanınmayan satırlar sessizce atlanır.
function _eoAlanlariAyikla(hamMetin) {
  const ham = { firma: '' };
  const alanlar = {};

  (hamMetin || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean).forEach(satir => {
    const esleme = satir.match(/^(.{2,40}?)\s*[:;]\s*(.+)$/);
    if (!esleme) return;
    const anahtar = _eoAnahtarNormallestir(esleme[1]);
    const deger = esleme[2].trim();
    if (!deger) return;

    if (/SERI/.test(anahtar) && /NO/.test(anahtar)) alanlar.seriNumarasi = deger;
    else if (/URETICI/.test(anahtar)) alanlar.uretici = deger;
    else if (/^FIRMA/.test(anahtar)) ham.firma = deger;
    else if (/YSC/.test(anahtar) || /CINSI/.test(anahtar)) Object.assign(alanlar, _eoYscCinsiAyikla(deger));
    else if (/BULUNDUGU/.test(anahtar) || /YER$/.test(anahtar)) alanlar.lokasyon = deger;
    else if (/URETIM/.test(anahtar)) alanlar.uretimTarihi = deger;
    else if (/TEKRAR/.test(anahtar) && /DOLUM/.test(anahtar)) alanlar.sonrakiYillikBakim = _eoTarihIsoyeCevir(deger);
    else if (/DOLUM/.test(anahtar)) alanlar.doluTarihi = _eoTarihIsoyeCevir(deger);
    else if (/TEST/.test(anahtar)) alanlar.sonrakiHidrostatikTest = _eoTarihIsoyeCevir(deger);
  });

  // Etiketteki "Firma" bölgede kurulu olan işyerinin adıdır (bakım/dolum
  // firmasının müşterisi) — uygulamada zaten aktif firma bağlamı var,
  // otomatik forma yazılmaz; sadece notlar alanına bilgi olarak eklenir.
  if (ham.firma) alanlar.firmaNotu = ham.firma;

  return alanlar;
}

// dosya: <input type="file"> seçilen File nesnesi. ilerlemeCallback(yuzde)
// isteğe bağlı — tarama sırasında ilerleme çubuğu göstermek için.
async function yanginTupuEtiketiOku(dosya, ilerlemeCallback) {
  const sonuc = await Tesseract.recognize(dosya, 'tur', {
    logger: m => {
      if (ilerlemeCallback && m.status === 'recognizing text') ilerlemeCallback(Math.round((m.progress || 0) * 100));
    }
  });
  const hamMetin = (sonuc && sonuc.data && sonuc.data.text) || '';
  return { hamMetin, alanlar: _eoAlanlariAyikla(hamMetin) };
}
