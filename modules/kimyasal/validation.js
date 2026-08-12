// Kimyasal kaydı doğrulama kuralları.

function kimyasalDogrula(veriler) {
  const hatalar = {};

  if (!veriler.ad || !veriler.ad.trim()) hatalar.ad = 'Kimyasal adı zorunludur.';
  if (!veriler.bolum || !veriler.bolum.trim()) hatalar.bolum = 'Bölüm zorunludur.';
  if (veriler.miktar !== '' && veriler.miktar != null && Number(veriler.miktar) < 0) hatalar.miktar = 'Miktar negatif olamaz.';

  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}
