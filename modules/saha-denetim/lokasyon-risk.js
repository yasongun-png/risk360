// Kullanıcı isteği (2026-11-20): "bu kontrol listesinden bir risk analizi
// hazırlamak istiyorum ... bu uygulamadaki risk analizi Fine-Kinney'e uygun
// olsun, aktarabilecek şekilde ... her bir soruyu aynı zamanda risk olarak
// düşünebiliriz". Lokasyon kontrolünün soru bankasındaki (bkz.
// lokasyon-model.js ldSoruBankasiniUygula) HER soru bir risk satırı olur ve
// Risk Değerlendirmesi modülünün Excel içe aktarma formatında (bkz.
// modules/risk/ui.js RISK_IMPORT_KOLONLARI) indirilir:
//   Konu      = "<Tesis/Bölüm> Risk Değerlendirmesi"
//   Bölüm     = Tesis/Bölüm, Yer/Ekipman = Alt başlık
//   Tehlike   = sorunun olumsuz hali ("… açık mı?" → "… açık değil.")
//   Olması gereken (Planlanan) = sorunun olumlu hali
//   Risk, Faaliyet ve O/F/Ş = sorunun konusuna göre (gaz, patlama, yüksekte
//   çalışma, elektrik, makine, kimyasal …) kurallarla; önlem sonrası O₂
//   düşürülür, F ve Ş aynı kalır. Değerler başlangıç önerisidir; içe
//   aktarınca uygulamada risk risk düzenlenebilir.

// ---- Soru → olumlu / olumsuz ifade ----
function _lrSesliUyum(kelime) {
  const m = String(kelime).match(/[aıoueiöü](?=[^aıoueiöü]*$)/i);
  return m && /[eiöü]/i.test(m[0]) ? 'e' : 'a';
}

function _lrSonKelimeOlumsuz(k) {
  if (k === 'var') return 'yok';
  if (k === 'yok') return 'var';
  if (/m[ae]m[ıiuü]ş$/.test(k)) return k.replace(/m[ae](m[ıiuü]ş)$/, '$1');           // bırakılmamış → bırakılmış
  if (/[^aeıioöuü]m[ıiuü]yor$/.test(k)) return k.replace(/m([ıiuü]yor)$/, '$1');     // kullanılmıyor → kullanılıyor
  if (/ebiliyor$/.test(k)) return k.replace(/ebiliyor$/, 'emiyor');                  // erişilebiliyor → erişilemiyor
  if (/abiliyor$/.test(k)) return k.replace(/abiliyor$/, 'amıyor');
  if (/[ıiuü]yor$/.test(k)) return k.replace(/([ıiuü])yor$/, 'm$1yor');              // kullanılıyor → kullanılmıyor
  if (/m[ıiuü]ş$/.test(k)) {                                                          // yapılmış → yapılmamış
    const kok = k.replace(/m[ıiuü]ş$/, '');
    return kok + 'm' + _lrSesliUyum(kok) + k.slice(kok.length);
  }
  if (/(ebilir|abilir)$/.test(k)) return k.replace(/ebilir$/, 'emez').replace(/abilir$/, 'amaz');
  return k + ' değil';
}

function ldSoruIfadeleri(soru) {
  let s = String(soru || '').trim().replace(/\?+\s*$/, '').trim();
  // Son soru eki (mı/mi/mu/mü); ardından parantezli açıklama gelebilir.
  const ekler = Array.from(s.matchAll(/\s(m[ıiuü])(?=\s|$)/g));
  if (!ekler.length) {
    const t = s.replace(/\.$/, '');
    return { olumlu: t + '.', olumsuz: t + ' sağlanmıyor.' };
  }
  const son = ekler[ekler.length - 1];
  const yuklem = s.slice(0, son.index).trim();
  const kalan = s.slice(son.index + son[0].length).trim();
  const kelimeler = yuklem.split(/\s+/);
  const olumsuz = kelimeler.slice(0, -1).concat([_lrSonKelimeOlumsuz(kelimeler[kelimeler.length - 1])]).join(' ');
  return {
    olumlu: yuklem + (kalan ? ' ' + kalan : '') + '.',
    olumsuz: olumsuz + (kalan ? ' ' + kalan : '') + '.'
  };
}

// ---- Konuya göre Fine-Kinney profili ----
// İlk eşleşen kural geçerlidir (sıra önemlidir). O/F/Ş: önlem öncesi,
// O2: önlem sonrası olasılık (F ve Ş değişmez).
const LD_RISK_KURALLARI = [
  { ad: 'patlama', kelime: /patla|amonyum nitrat|\ban\b|an\/can|can\/an|bekra|hidrojen|\bh2\b|lpg|dogalgaz|yanici gaz/,
    faaliyet: 'Proses işletmesi ve tehlikeli madde depolama', risk: 'Yangın, patlama; çoklu ölüm, tesis ve çevre hasarı', O: 1, F: 3, S: 100, O2: 0.2 },
  { ad: 'gaz', kelime: /amonyak|nh3|so2|so3|nox|no2|\bno\b|h2s|gaz kacag|gaz alg|gaz olc|dedektor|zehir|solunum cihaz|scba|asit sisi|asit buhar/,
    faaliyet: 'Proses ve gaz hatlarında çalışma', risk: 'Toksik gaz maruziyeti; zehirlenme, solunum yolu hasarı, ölüm', O: 3, F: 3, S: 40, O2: 0.5 },
  { ad: 'kapali', kelime: /kapali alan|oksijen|tank ic|ambar(a|in)? gir|denize|bogul|can simi|kurtarma halat|silo|kuyu|rogar/,
    faaliyet: 'Kapalı alan / su kenarı çalışmaları', risk: 'Boğulma, oksijensiz kalma, gömülme; ölüm', O: 3, F: 2, S: 40, O2: 0.5 },
  { ad: 'yuksek', kelime: /yuksekte|yuksek nokta|iskele|dusus|cati|parasut|ankraj|yasam hatti/,
    faaliyet: 'Yüksekte çalışma', risk: 'Yüksekten düşme; ciddi yaralanma, ölüm', O: 3, F: 3, S: 40, O2: 0.5 },
  { ad: 'platform', kelime: /platform|korkuluk|merdiven|topuk levha|izgara/,
    faaliyet: 'Platform ve merdiven kullanımı', risk: 'Düşme, kayma; kırık, ciddi yaralanma', O: 3, F: 3, S: 15, O2: 1 },
  { ad: 'elektrik', kelime: /elektrik|pano|kablo|topraklama|kacak akim|\bex\b|ip sinif|priz|paratoner|trafo/,
    faaliyet: 'Elektrikli ekipman kullanımı ve bakımı', risk: 'Elektrik çarpması, ark yanığı, yangın; ölüm', O: 3, F: 3, S: 40, O2: 0.5 },
  { ad: 'kaldirma', kelime: /vinc|sapan|kanca|mapa|kaldirma|askida|askidaki|isaretci|yuk kaymas/,
    faaliyet: 'Kaldırma operasyonları', risk: 'Yük düşmesi, devrilme, ezilme; ölüm', O: 3, F: 3, S: 40, O2: 0.5 },
  { ad: 'arac', kelime: /forklift|arac|is makine|kamyon|trafik|yaya|hiz sinir|geri manevra|geri vites|ehliyet|park/,
    faaliyet: 'Araç ve iş makinesi trafiği', risk: 'Araç/iş makinesi çarpması, ezilme, devrilme; ölüm', O: 3, F: 3, S: 40, O2: 0.5 },
  { ad: 'basinc', kelime: /basinc|tup|ventil|manometre|kazan|buhar|hortum|hidrolik/,
    faaliyet: 'Basınçlı ekipman işletmesi', risk: 'Basınçlı kap/hat patlaması, parça fırlaması, yanık', O: 1, F: 3, S: 40, O2: 0.5 },
  { ad: 'makine', kelime: /pres|konveyor|bant|tambur|loto|enerji izol|kilitleme/,
    faaliyet: 'Makine/konveyör işletmesi ve bakımı', risk: 'Sıkışma, uzuv kopması, ezilme; ölüm', O: 3, F: 3, S: 40, O2: 0.5 },
  { ad: 'makine2', kelime: /makine|doner|kasnak|dayama|siperlik|tas arasi|kaplin|koruyucu|muhafaza|acil durdurma|kesici|el alet|torna|taslama|freze|matkap|testere|fan|pompa|kompresor|ayna|talas|kalip|titresim/,
    faaliyet: 'Makine ve ekipman kullanımı', risk: 'Uzuv sıkışması, kesik, parça fırlaması; kalıcı sakatlık', O: 3, F: 3, S: 15, O2: 1 },
  { ad: 'sicak', kelime: /sicak|kaynak|kivilcim|yanik|atesli|alev/,
    faaliyet: 'Sıcak işler ve sıcak yüzeylerde çalışma', risk: 'Termal yanık, yangın', O: 3, F: 3, S: 15, O2: 1 },
  { ad: 'kkd', kelime: /\bkkd|baret|gozluk|eldiven|ayakkabi|kulak koruyucu|solunum koruyucu|koruyucu giysi|yuz siper|maske/,
    faaliyet: 'Kişisel koruyucu donanım kullanımı', risk: 'Baş, göz, el ve ayak yaralanmaları; maruziyet', O: 3, F: 3, S: 15, O2: 1 },
  { ad: 'kimyasal', kelime: /kimyasal|asit|kostik|guvenlik bilgi|dokulme|sizinti|kacak|goz ve vucut|goz dus|vucut dus|sicrama|nitrik|sulfur|kukurt|recine|klor|camasir suyu|tank|etiket/,
    faaliyet: 'Kimyasal depolama, transfer ve kullanım', risk: 'Kimyasal yanık, göz/cilt hasarı, zehirlenme', O: 3, F: 3, S: 15, O2: 1 },
  { ad: 'acil', kelime: /yangin|sondurucu|hidrant|alarm|acil|tahliye|toplanma|ilk yardim|tatbikat|kacis|anons|ruzgar/,
    faaliyet: 'Acil durum hazırlığı ve müdahale', risk: 'Acil duruma geç/yetersiz müdahale; yaralanma, can kaybı', O: 3, F: 2, S: 40, O2: 0.5 },
  { ad: 'engelli', kelime: /engelli/,
    faaliyet: 'Engelli çalışanların çalışma ve tahliyesi', risk: 'Tahliyede geride kalma, düşme, yaralanma', O: 3, F: 3, S: 15, O2: 1 },
  { ad: 'ortam', kelime: /toz|gurultu|aydinlatma|havalandirma|sicaklik|isi stres|termal|ergonomi|elle tasi|ortam olc/,
    faaliyet: 'Çalışma ortamı koşulları', risk: 'Meslek hastalığı (işitme kaybı, solunum hastalığı), ısı stresi, yorgunluk', O: 3, F: 6, S: 7, O2: 1 },
  { ad: 'hijyen', kelime: /yemek|mutfak|gida|hijyen|soyunma|tuvalet|icme suyu|dinlenme|lavabo|bulasik/,
    faaliyet: 'Yemekhane ve sosyal alan kullanımı', risk: 'Gıda zehirlenmesi, enfeksiyon, kayma, kesik/yanık', O: 3, F: 3, S: 7, O2: 1 },
  { ad: 'duzen', kelime: /duzen|tertip|zemin|kayma|takil|istif|atik|kanal|cukur|bosluk|yurume|gecis|temiz/,
    faaliyet: 'Saha içi yürüme, malzeme taşıma ve istifleme', risk: 'Kayma, takılma, düşme; malzeme devrilmesi', O: 3, F: 3, S: 7, O2: 1 },
  { ad: 'yonetim', kelime: /egitim|izin|prosedur|talimat|kayit|risk deger|plan|taseron|yetkin|belge|bilgilendir|periyodik|muayene/,
    faaliyet: 'İSG yönetimi, eğitim ve çalışma izinleri', risk: 'Kontrolsüz/bilgisiz çalışma nedeniyle iş kazası', O: 3, F: 3, S: 15, O2: 1 }
];
const LD_RISK_VARSAYILAN = { ad: 'genel', faaliyet: 'Saha çalışmaları', risk: 'İş kazası, yaralanma', O: 3, F: 3, S: 7, O2: 1 };

function _lrKatla(metin) {
  return String(metin || '').toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/â/g, 'a')
    .replace(/₂/g, '2').replace(/₃/g, '3');
}

// Önce sorunun kendisine bakılır; eşleşme yoksa alt başlığa, sonra tesise.
function ldRiskProfili(soru, grup, tesis) {
  for (const metin of [soru, grup, tesis]) {
    const t = ' ' + _lrKatla(metin) + ' ';
    const k = LD_RISK_KURALLARI.find(r => r.kelime.test(t));
    if (k) return k;
  }
  return LD_RISK_VARSAYILAN;
}

function ldRiskSinifi(puan) {
  return puan >= 400 ? 'Tolerans gösterilemez' : puan >= 200 ? 'Esaslı risk' : puan >= 70 ? 'Önemli risk' : puan >= 20 ? 'Olası risk' : 'Önemsiz risk';
}

function ldRiskKonuAdi(tesis) {
  const t = String(tesis || '').trim();
  if (/^genel\b/i.test(t)) return 'Genel Saha Risk Değerlendirmesi';
  return t.charAt(0).toLocaleUpperCase('tr-TR') + t.slice(1) + ' Risk Değerlendirmesi';
}

// kategoriler: LD_KATEGORILER (soru bankası). Dönüş: risk satırları.
function ldSoruBankasindanRiskler(kategoriler) {
  const satirlar = [];
  let no = 0;
  (kategoriler || []).forEach(k => (k.sorular || []).forEach(s => {
    no++;
    const ifade = ldSoruIfadeleri(s.soru);
    const p = ldRiskProfili(s.soru, s.grup, k.ad);
    const dokuman = /dok[uü]man/i.test(s.tur || '');
    satirlar.push({
      no,
      bolum: ldRiskKonuAdi(k.ad),
      altBolum: k.ad,
      yer: s.grup || k.ad,
      faaliyet: dokuman ? p.faaliyet + ' (doküman/kayıt)' : p.faaliyet,
      tehlike: ifade.olumsuz,
      risk: p.risk,
      onlem: 'Saha kontrol listesi ile periyodik kontrol',
      O: p.O, F: p.F, S: p.S,
      planlanan: `Olması gereken: ${ifade.olumlu} Saha kontrolünde takip edilmeli, uygunsuzluk tespitinde DÖF açılmalıdır.`,
      On: p.O2, Fn: p.F, Sn: p.S,
      soru: s.soru, profil: p.ad
    });
  }));
  return satirlar;
}

async function ldRiskAnaliziExcelIndir(firma) {
  if (typeof xlsxSayfaXml !== 'function') { alert('Excel bileşeni yüklenemedi.'); return; }
  const satirlar = ldSoruBankasindanRiskler(LD_KATEGORILER);
  if (!satirlar.length) { alert('Soru bankasında soru yok.'); return; }
  const X = XLSX_STIL;
  const h = (v, s) => ({ v, s });
  // İlk satır başlık: Risk modülünün içe aktarması başlık adlarıyla eşler
  // (RISK_IMPORT_KOLONLARI). R/Sınıf/Kontrol Sorusu sütunları bilgi içindir,
  // içe aktarmada yok sayılır.
  const basliklar = ['Risk Değerlendirme Konusu', 'Bölüm', 'Yer / Ekipman', 'Faaliyet', 'Tehlike', 'Risk', 'Mevcut Önlemler',
    'Olasılık (O)', 'Frekans (F)', 'Şiddet (Ş)', 'Risk Puanı (R)', 'Risk Sınıfı',
    'Planlanan / Yapılan Faaliyet', 'Olasılık (O₂)', 'Frekans (F₂)', 'Şiddet (Ş₂)', 'Risk Puanı (R₂)', 'Risk Sınıfı (2)',
    'Sorumlu', 'Termin', 'Durum', 'Kontrol Listesi No', 'Kontrol Sorusu'];
  const tablo = [{ hucreler: basliklar.map(b => h(b, X.tabloBaslik)), yukseklik: 30 }];
  satirlar.forEach(r => {
    const R1 = Math.round(r.O * r.F * r.S * 10) / 10;
    const R2 = Math.round(r.On * r.Fn * r.Sn * 10) / 10;
    tablo.push({ hucreler: [
      h(r.bolum, X.hucre), h(r.altBolum, X.hucre), h(r.yer, X.hucre), h(r.faaliyet, X.hucre), h(r.tehlike, X.hucre), h(r.risk, X.hucre), h(r.onlem, X.hucre),
      h(r.O, X.hucreOrta), h(r.F, X.hucreOrta), h(r.S, X.hucreOrta), h(R1, X.hucreOrta), h(ldRiskSinifi(R1), X.hucre),
      h(r.planlanan, X.hucre), h(r.On, X.hucreOrta), h(r.Fn, X.hucreOrta), h(r.Sn, X.hucreOrta), h(R2, X.hucreOrta), h(ldRiskSinifi(R2), X.hucre),
      h('', X.hucre), h('', X.hucre), h('Açık', X.hucre), h(r.no, X.hucreOrta), h(r.soru, X.hucre)
    ], yukseklik: 45 });
  });
  const xml = xlsxSayfaXml(tablo, { genislikler: [30, 22, 24, 26, 46, 34, 26, 9, 9, 9, 10, 18, 52, 9, 9, 9, 10, 18, 16, 12, 10, 9, 46], dondur: 1, yatay: true });
  const ad = `Risk_Analizi_Kontrol_Listesinden_${new Date().toISOString().slice(0, 10)}.xlsx`;
  await xlsxKitapIndir(ad, [{ ad: 'Risk Analizi', xml, baslikSatiri: 1 }]);
  return satirlar.length;
}
