// Hizmet Sözleşmeleri veri modeli. Firmaya hizmet veren İSG Uzmanı, İşyeri
// Hekimi ve Diğer Sağlık Personeli için sözleşme kayıtlarını tutar (6331 sayılı
// Kanun ve İSG Hizmetleri Yönetmeliği kapsamında OSGB/işveren ile görevlendirilen
// personel arasındaki hizmet sözleşmesi). Durum, sözleşme bitiş tarihine göre
// otomatik türetilir — kullanıcı elle "Feshedildi" seçtiyse o korunur.

function bugunIso() {
  return new Date().toISOString().slice(0, 10);
}

const HIZMET_GOREV_TURLERI = ['İSG Uzmanı', 'İşyeri Hekimi', 'Diğer Sağlık Personeli'];
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
    gorevTuru: HIZMET_GOREV_TURLERI.includes(veriler.gorevTuru) ? veriler.gorevTuru : 'İSG Uzmanı',
    adSoyad: (veriler.adSoyad || '').trim(),
    belgeNo: (veriler.belgeNo || '').trim(),
    belgeSinifi: (veriler.belgeSinifi || '').trim(),
    sozlesmeBaslangicTarihi: veriler.sozlesmeBaslangicTarihi || '',
    sozlesmeBitisTarihi: veriler.sozlesmeBitisTarihi || '',
    ayrilanSure: (veriler.ayrilanSure || '').trim(),
    telefon: (veriler.telefon || '').trim(),
    eposta: (veriler.eposta || '').trim(),
    sozlesmeBelgesi: veriler.sozlesmeBelgesi || '',
    notlar: (veriler.notlar || '').trim(),
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
  kayit.durum = hizmetSozlesmesiDurumuHesapla(veriler);
  return kayit;
}
