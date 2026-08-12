// Saha Denetim doğrulama kuralları.

function denetimBaslatDogrula(veriler) {
  const hatalar = {};

  if (!veriler.denetimTuru || !DENETIM_TURLERI.includes(veriler.denetimTuru)) {
    hatalar.denetimTuru = 'Geçerli bir denetim türü seçiniz.';
  }

  if (!veriler.tarih) {
    hatalar.tarih = 'Tarih zorunludur.';
  }

  if (!veriler.denetci || !veriler.denetci.trim()) {
    hatalar.denetci = 'Denetçi zorunludur.';
  }

  if (!veriler.bolum || !veriler.bolum.trim()) {
    hatalar.bolum = 'Bölüm zorunludur.';
  }

  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}
