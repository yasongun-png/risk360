// Hizmet Sözleşmesi kaydı doğrulama kuralları.

function hizmetSozlesmesiDogrula(veriler) {
  const hatalar = {};

  if (!HIZMET_GOREV_TURLERI.includes(veriler.gorevTuru)) hatalar.gorevTuru = 'Görev türü zorunludur.';
  if (!veriler.adSoyad || !veriler.adSoyad.trim()) hatalar.adSoyad = 'Ad soyad zorunludur.';
  if (!veriler.sozlesmeBaslangicTarihi) hatalar.sozlesmeBaslangicTarihi = 'Sözleşme başlangıç tarihi zorunludur.';
  if (veriler.sozlesmeBitisTarihi && veriler.sozlesmeBaslangicTarihi && veriler.sozlesmeBitisTarihi < veriler.sozlesmeBaslangicTarihi) {
    hatalar.sozlesmeBitisTarihi = 'Bitiş tarihi başlangıç tarihinden önce olamaz.';
  }

  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}
