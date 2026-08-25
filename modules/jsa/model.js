// İş Güvenliği Analizi (JSA / JHA) veri modeli.
// Ekran görüntüsü olarak paylaşılan bağımsız bir JSA aracının (Dr. İsmail
// Kaya, "İş Güvenliği Analizi (JSA)") 3 adımlı akışı temel alınmıştır:
// 1) Görev ve iş adımları, 2) Tehlikeler/riskler/kontroller, 3) Rapor/onay/
// takip. Risk puanlaması, uygulamanın geri kalanıyla (Risk Değerlendirmesi,
// Olay/Kaza) TUTARLI olması için o modüllerdeki Fine-Kinney altyapısı
// (OLASILIK_SECENEKLERI, FREKANS_SECENEKLERI, SIDDET_SECENEKLERI,
// riskPuaniHesapla, riskDuzeyiGetir — bkz. modules/risk/model.js) AYNEN
// kullanılır, ayrı bir ölçek icat edilmez (kullanıcı isteği: "kendi
// topladığın bilgileri de ekle" — burada "kendi bilgim" risk360'ın zaten
// sahip olduğu, İSG mevzuatına uygun yerleşik risk metodolojisidir).
// Ekran görüntüsündeki "Örnek JSA yükle" / ayrı JSON dosyası olarak "JSA
// çalışması indir/yükle" özellikleri BİLEREK taşınmadı: risk360 zaten her
// kaydı Firestore'a otomatik kaydeder, ayrı bir dosya tabanlı taslak
// mekanizmasına gerek yoktur.

const JSA_HAZIRLIK_KANITLARI = [
  'İş sahada gözlendi',
  'İşi yapanlar katıldı',
  'Kaza/ramak kala geçmişi incelendi',
  'Talimat, SDS ve üretici bilgisi incelendi'
];

const JSA_DURUMLARI = ['Taslak', 'Onay Bekliyor', 'Onaylandı', 'Revizyon Gerekli'];

function bugunIso() {
  return new Date().toISOString().slice(0, 10);
}

// KZ01/2026 (olay-kaza) ile aynı desen: yıl + o yıl içindeki sıra no.
function jsaSonrakiKayitNoUret(mevcutListe) {
  const yil = new Date().getFullYear();
  const sonEk = '/' + yil;
  let maks = 0;
  (mevcutListe || []).forEach(item => {
    const kayitNo = String(item.kayitNo || '');
    if (!kayitNo.endsWith(sonEk)) return;
    const sayi = parseInt(kayitNo.slice(3, kayitNo.length - sonEk.length), 10);
    if (Number.isFinite(sayi) && sayi > maks) maks = sayi;
  });
  return 'JSA' + String(maks + 1).padStart(2, '0') + sonEk;
}

function jsaTehlikeOlustur(veriler) {
  return {
    id: (veriler && veriler.id) || rastgeleId(),
    tehlike: ((veriler && veriler.tehlike) || '').trim(),
    olasilik: (veriler && veriler.olasilik) || '',
    frekans: (veriler && veriler.frekans) || '',
    siddet: (veriler && veriler.siddet) || '',
    kontroller: ((veriler && veriler.kontroller) || '').trim()
  };
}

function jsaAdimOlustur(veriler) {
  return {
    id: (veriler && veriler.id) || rastgeleId(),
    eylem: ((veriler && veriler.eylem) || '').trim(),
    tehlikeler: Array.isArray(veriler && veriler.tehlikeler) ? veriler.tehlikeler.map(jsaTehlikeOlustur) : []
  };
}

// Bir tehlikenin Fine-Kinney risk puanı — modules/risk/model.js
// riskPuaniHesapla ile birebir aynı fonksiyon (yontem sabit 'Fine-Kinney').
function jsaTehlikeRiskPuaniHesapla(tehlike) {
  if (!tehlike.olasilik || !tehlike.frekans || !tehlike.siddet) return null;
  return riskPuaniHesapla(tehlike.olasilik, tehlike.frekans, tehlike.siddet, 'Fine-Kinney');
}

// Bir JSA kaydındaki TÜM tehlikeler arasından en yüksek risk puanını (ve
// düzeyini) bulur — kayıt listesinde/dashboard özetinde "en riskli" rozeti
// için kullanılır.
function jsaEnYuksekRiskiHesapla(kayit) {
  let enYuksek = null;
  (kayit.adimlar || []).forEach(adim => {
    (adim.tehlikeler || []).forEach(t => {
      const puan = jsaTehlikeRiskPuaniHesapla(t);
      if (puan != null && (enYuksek == null || puan > enYuksek)) enYuksek = puan;
    });
  });
  if (enYuksek == null) return null;
  return { puan: enYuksek, duzey: riskDuzeyiGetir(enYuksek, 'Fine-Kinney') };
}

function jsaKaydiOlustur(veriler) {
  const v = veriler || {};
  return {
    id: v.id || rastgeleId(),
    kayitNo: v.kayitNo || '',
    isletme: (v.isletme || '').trim(),
    degerlendirilenIs: (v.degerlendirilenIs || '').trim(),
    alanEkipman: (v.alanEkipman || '').trim(),
    isiYapanEkip: (v.isiYapanEkip || '').trim(),
    degerlendirmeEkibi: (v.degerlendirmeEkibi || '').trim(),
    tarih: v.tarih || bugunIso(),
    revizyon: (v.revizyon || '').trim(),
    kapsam: (v.kapsam || '').trim(),
    hazirlikKanitlari: Array.isArray(v.hazirlikKanitlari) ? v.hazirlikKanitlari.filter(h => JSA_HAZIRLIK_KANITLARI.includes(h)) : [],
    genelFotoUrl: v.genelFotoUrl || '',
    adimlar: Array.isArray(v.adimlar) ? v.adimlar.map(jsaAdimOlustur) : [],
    hazirlayanAdi: (v.hazirlayanAdi || '').trim(),
    hazirlayanUnvan: (v.hazirlayanUnvan || '').trim(),
    onaylayanAdi: (v.onaylayanAdi || '').trim(),
    onaylayanUnvan: (v.onaylayanUnvan || '').trim(),
    // Tespit ve Öneri/Uygunsuzluk modülleriyle aynı dijital kaşe/imza deseni
    // (bkz. modules/tespit-oneri/model.js tespitOneriImzaVeriUret) —
    // { hazirlayan: {ad, imzaUrl, tarih}, onaylayan: {...} }.
    imzalar: v.imzalar || {},
    durum: JSA_DURUMLARI.includes(v.durum) ? v.durum : 'Taslak',
    // Rapor/takip adımındaki aksiyonlar (kaynak: JSA) — olay-kaza ile aynı
    // otomatik Uygunsuzluk aktarımı deseni (bkz. service.js).
    aksiyonlar: Array.isArray(v.aksiyonlar) ? v.aksiyonlar : [],
    olusturmaTarihi: v.olusturmaTarihi || new Date().toISOString()
  };
}

function jsaImzaVeriUret(ad, imzaUrl) {
  return { ad: (ad || '').trim(), imzaUrl: imzaUrl || '', tarih: new Date().toISOString() };
}
