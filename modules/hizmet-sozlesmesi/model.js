// Hizmet Sözleşmeleri veri modeli. Firmaya hizmet veren İG Uzmanı (İş
// Güvenliği Uzmanı), İşyeri Hekimi ve Diğer Sağlık Personeli için sözleşme
// kayıtlarını tutar (6331 sayılı Kanun ve İSG Hizmetleri Yönetmeliği
// kapsamında OSGB/işveren ile görevlendirilen personel arasındaki hizmet
// sözleşmesi). Durum, sözleşme bitiş tarihine göre otomatik türetilir —
// kullanıcı elle "Feshedildi" seçtiyse o korunur.
// Kullanıcı isteği: "hiçbir modülde hiçbir yerde İSG Uzmanı olmasın,
// bizler iş güvenliği uzmanıyız, sağlık işyeri hekimi ve diğer sağlık
// personellerinin işi, İG uzmanı diyebiliriz" — bu görev türü artık
// "İG Uzmanı" (bkz. repository.js hizmetSozlesmeleriTumunuGetir: eski
// kayıtlardaki "İSG Uzmanı" değeri okuma sırasında otomatik "İG Uzmanı"na
// çevrilir, veri kaybı olmaz).

function bugunIso() {
  return new Date().toISOString().slice(0, 10);
}

const HIZMET_GOREV_TURLERI = ['İG Uzmanı', 'İşyeri Hekimi', 'Diğer Sağlık Personeli'];
const HIZMET_SOZLESME_DURUMLARI = ['Aktif', 'Yaklaşıyor', 'Süresi Geçti', 'Feshedildi'];
const HIZMET_SOZLESME_TERMINAL_DURUMLAR = ['Feshedildi'];

function hizmetSozlesmesiSonrakiNoUret(mevcutListe) {
  let maks = 0;
  (mevcutListe || []).forEach(k => {
    const eslesme = String(k.sozlesmeNo || '').match(/(\d+)$/);
    if (eslesme) { const n = parseInt(eslesme[1], 10); if (n > maks) maks = n; }
  });
  return 'HS' + String(maks + 1).padStart(4, '0');
}

// Terminal durumlar (Feshedildi) hariç, bitiş tarihine göre otomatik hesaplanır.
function hizmetSozlesmesiDurumuHesapla(veriler, bugunStr) {
  if (HIZMET_SOZLESME_TERMINAL_DURUMLAR.includes(veriler.durum)) return veriler.durum;
  const bugun = bugunStr || bugunIso();
  if (!veriler.sozlesmeBitisTarihi) return 'Aktif';
  if (veriler.sozlesmeBitisTarihi < bugun) return 'Süresi Geçti';
  const otuzGunSonra = new Date(bugun + 'T00:00:00');
  otuzGunSonra.setDate(otuzGunSonra.getDate() + 30);
  // toISOString() UTC'ye çevirir; UTC+3'te yerel gece yarısı bir gün geri kayar.
  const otuzGunSonraStr = otuzGunSonra.getFullYear() + '-' + String(otuzGunSonra.getMonth() + 1).padStart(2, '0') + '-' + String(otuzGunSonra.getDate()).padStart(2, '0');
  if (veriler.sozlesmeBitisTarihi <= otuzGunSonraStr) return 'Yaklaşıyor';
  return 'Aktif';
}

function hizmetSozlesmesiKaydiOlustur(veriler) {
  const kayit = {
    id: veriler.id || rastgeleId(),
    sozlesmeNo: veriler.sozlesmeNo || '',
    gorevTuru: HIZMET_GOREV_TURLERI.includes(veriler.gorevTuru) ? veriler.gorevTuru : 'İG Uzmanı',
    adSoyad: (veriler.adSoyad || '').trim(),
    belgeNo: (veriler.belgeNo || '').trim(),
    belgeSinifi: (veriler.belgeSinifi || '').trim(),
    sozlesmeBaslangicTarihi: veriler.sozlesmeBaslangicTarihi || '',
    sozlesmeBitisTarihi: veriler.sozlesmeBitisTarihi || '',
    ayrilanSure: (veriler.ayrilanSure || '').trim(),
    // Kullanıcı isteği: "hizmet sözleşmeleri tarafına birebir bu excel
    // çıktısını verecek altyapı hazırla" — Sicil Özeti raporundaki
    // "Atanan dk/ay" toplamı için sayısal bir alan gerekiyordu; mevcut
    // ayrilanSure serbest metin olduğundan (ör. "Ayda 8 saat") hesaplamaya
    // uygun değil, bu yüzden AYRI bir sayısal alan eklendi — eski kayıtlar
    // bozulmaz, sadece bu yeni alan boş/0 kalır.
    ayrilanDakika: Math.max(0, parseInt(veriler.ayrilanDakika, 10) || 0),
    // Hangi firmaya (sicile) hizmet verildiği — kullanıcı isteği: "her
    // hizmet sözleşmesi kaydına hangi firma alanı eklensin". Opsiyonel:
    // boş bırakılırsa kayıt Sicil Özeti raporuna dahil edilmez.
    firmaId: (veriler.firmaId || '').trim(),
    telefon: (veriler.telefon || '').trim(),
    eposta: (veriler.eposta || '').trim(),
    sozlesmeBelgesi: veriler.sozlesmeBelgesi || '',
    notlar: (veriler.notlar || '').trim(),
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
  kayit.durum = hizmetSozlesmesiDurumuHesapla(veriler);
  return kayit;
}

// ---- Sicil Özeti: yasal atama süresi hesabı ----
// Kullanıcının paylaştığı 3 yönetmelik maddesinden (İş Güvenliği Uzmanları
// Yönetmeliği Md.12, İşyeri Hekimi Yönetmeliği Md.12, Diğer Sağlık
// Personeli Yönetmeliği Md.19) birebir alınmıştır; örnek rapordaki 6
// satırın TAMAMIYLA doğrulanmıştır. NOT: her üç maddenin de 2-4. fıkralarında
// tanımlı "çok büyük işyerlerinde ek tam gün görevli" eşiği (İG Uzmanı
// 1000/500/250, İşyeri Hekimi 2000/1000/750 çalışan başına) burada
// UYGULANMAZ — "tam gün" karşılığı dakika/ay değeri yönetmelikte sayısal
// olarak verilmediğinden (genel çalışma mevzuatına bağlı) tahminle
// hardcode edilmedi. Bu eşiklerin üzerindeki çok büyük işyerleri için
// "Gerekli" değeri gerçek yasal asgariden düşük hesaplanabilir.
const HIZMET_GEREKLI_DAKIKA_KISI = {
  'İG Uzmanı': { 'Az Tehlikeli': 10, 'Tehlikeli': 20, 'Çok Tehlikeli': 40 },
  'İşyeri Hekimi': { 'Az Tehlikeli': 5, 'Tehlikeli': 10, 'Çok Tehlikeli': 15 }
};

// DSP (Diğer Sağlık Personeli) SADECE Çok Tehlikeli sınıfta ve 10+
// çalışanda gereklidir (Md.19/1); personel sayısı aralığına göre kişi
// başı dakika değişir. Az Tehlikeli/Tehlikeli sınıflarda veya 10'un
// altındaki Çok Tehlikeli işyerlerinde "Kapsam Dışı" döner.
function _hsDspKisiBasiDakika(tehlikeSinifi, personelSayisi) {
  if (tehlikeSinifi !== 'Çok Tehlikeli' || personelSayisi < 10) return null;
  if (personelSayisi <= 49) return 10;
  if (personelSayisi <= 249) return 15;
  return 20;
}

// { gerekliDakika, kapsamDisiMi } döner. kapsamDisiMi true ise (SADECE
// DSP için mümkün) gerekliDakika 0'dır ve "Kapsam Dışı" gösterilir.
function hizmetSozlesmesiGerekliDakikaHesapla(gorevTuru, tehlikeSinifi, personelSayisi) {
  const kisi = Math.max(0, parseInt(personelSayisi, 10) || 0);
  if (gorevTuru === 'Diğer Sağlık Personeli') {
    const kisiBasi = _hsDspKisiBasiDakika(tehlikeSinifi, kisi);
    if (kisiBasi == null) return { gerekliDakika: 0, kapsamDisiMi: true };
    return { gerekliDakika: kisi * kisiBasi, kapsamDisiMi: false };
  }
  const tablo = HIZMET_GEREKLI_DAKIKA_KISI[gorevTuru];
  const kisiBasi = tablo ? (tablo[tehlikeSinifi] || 0) : 0;
  return { gerekliDakika: kisi * kisiBasi, kapsamDisiMi: false };
}
