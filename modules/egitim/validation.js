// Eğitim kaydı doğrulama kuralları.

function egitimKaydiDogrula(veriler) {
  const hatalar = {};

  if (!veriler.personelId) {
    hatalar.personelId = 'Personel seçimi zorunludur.';
  }

  if (!veriler.egitimTuruId || !egitimTuruGetir(veriler.egitimTuruId)) {
    hatalar.egitimTuruId = 'Geçerli bir eğitim/sertifika türü seçiniz.';
  }

  if (!veriler.tarih && !veriler.suresizMi) {
    hatalar.tarih = 'Tarih zorunludur.';
  }

  // Kullanıcı isteği: "ikinci gün zorunlu olmasın" — iki günlü eğitimlerde
  // (ör. Temel İSG Eğitimi) 2. gün tarihi artık ZORUNLU değil (bazı
  // eğitimler tek günde de yapılabiliyor); yalnızca GİRİLMİŞSE 1. günden
  // önce olamaz kuralı hâlâ geçerli.
  const tur = egitimTuruGetir(veriler.egitimTuruId);
  if (tur && tur.ikiGunluMu && veriler.tarih2 && veriler.tarih && veriler.tarih2 < veriler.tarih) {
    hatalar.tarih2 = '2. gün tarihi, 1. gün tarihinden önce olamaz.';
  }

  if (veriler.saat && (isNaN(veriler.saat) || Number(veriler.saat) < 0)) {
    hatalar.saat = 'Saat geçerli bir sayı olmalı.';
  }

  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}
