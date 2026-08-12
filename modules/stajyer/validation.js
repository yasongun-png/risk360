// Stajyer kaydı doğrulama kuralları.

function stajyerDogrula(veriler) {
  const hatalar = {};

  if (!veriler.adSoyad || !veriler.adSoyad.trim()) hatalar.adSoyad = 'Ad Soyad zorunludur.';
  if (!veriler.bolum || !veriler.bolum.trim()) hatalar.bolum = 'Staj yapılacak bölüm zorunludur.';
  if (!veriler.okul || !veriler.okul.trim()) hatalar.okul = 'Okul zorunludur.';
  if (!veriler.okulBolumu || !veriler.okulBolumu.trim()) hatalar.okulBolumu = 'Okul bölümü/programı zorunludur.';
  if (!veriler.baslangicTarihi) hatalar.baslangicTarihi = 'Staj başlangıç tarihi zorunludur.';
  if (!veriler.bitisTarihi) hatalar.bitisTarihi = 'Staj bitiş tarihi zorunludur.';

  if (veriler.baslangicTarihi && veriler.bitisTarihi && veriler.bitisTarihi < veriler.baslangicTarihi) {
    hatalar.bitisTarihi = 'Staj bitiş tarihi başlangıç tarihinden önce olamaz.';
  }

  if (veriler.isgEgitimTarihi2 && veriler.isgEgitimTarihi && veriler.isgEgitimTarihi2 < veriler.isgEgitimTarihi) {
    hatalar.isgEgitimTarihi2 = '2. gün tarihi, 1. gün tarihinden önce olamaz.';
  }

  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}
