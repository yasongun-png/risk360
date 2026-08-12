// Personel formu doğrulama kuralları.

function personelDogrula(veriler, mevcutPersoneller, duzenlenenId) {
  const hatalar = {};

  if (!veriler.sicilNo || !veriler.sicilNo.trim()) {
    hatalar.sicilNo = 'Sicil No zorunludur.';
  } else {
    const cakisan = mevcutPersoneller.find(
      p => p.sicilNo === veriler.sicilNo.trim() && p.id !== duzenlenenId
    );
    if (cakisan) {
      hatalar.sicilNo = 'Bu Sicil No ile kayıtlı başka bir personel var.';
    }
  }

  if (!veriler.adSoyad || veriler.adSoyad.trim().length < 3) {
    hatalar.adSoyad = 'Ad soyad en az 3 karakter olmalı.';
  }

  if (!veriler.bolum || !veriler.bolum.trim()) {
    hatalar.bolum = 'Bölüm zorunludur.';
  }

  if (!veriler.gorev || !veriler.gorev.trim()) {
    hatalar.gorev = 'Görev zorunludur.';
  }

  if (!veriler.iseGirisTarihi) {
    hatalar.iseGirisTarihi = 'İşe giriş tarihi zorunludur.';
  }

  if (veriler.istenCikisTarihi && veriler.iseGirisTarihi && veriler.istenCikisTarihi < veriler.iseGirisTarihi) {
    hatalar.istenCikisTarihi = 'İşten çıkış tarihi, işe giriş tarihinden önce olamaz.';
  }

  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}
