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

  const tur = egitimTuruGetir(veriler.egitimTuruId);
  if (tur && tur.ikiGunluMu) {
    if (!veriler.tarih2) {
      hatalar.tarih2 = '2. gün tarihi zorunludur.';
    } else if (veriler.tarih && veriler.tarih2 < veriler.tarih) {
      hatalar.tarih2 = '2. gün tarihi, 1. gün tarihinden önce olamaz.';
    }
  }

  if (veriler.saat && (isNaN(veriler.saat) || Number(veriler.saat) < 0)) {
    hatalar.saat = 'Saat geçerli bir sayı olmalı.';
  }

  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}
