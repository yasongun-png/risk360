// Periyodik Kontrol doğrulama kuralları.

function periyodikEkipmanDogrula(veriler) {
  const hatalar = {};

  if (!veriler.ad || !veriler.ad.trim()) hatalar.ad = 'Ekipman adı zorunludur.';
  if (!veriler.bolum || !veriler.bolum.trim()) hatalar.bolum = 'Bölüm zorunludur.';

  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}

function periyodikKontrolDogrula(veriler) {
  const hatalar = {};

  if (!veriler.ekipmanId) hatalar.ekipmanId = 'Ekipman seçimi zorunludur.';
  if (!veriler.kontrolTarihi) hatalar.kontrolTarihi = 'Kontrol tarihi zorunludur.';
  if (!veriler.firma || !veriler.firma.trim()) hatalar.firma = 'Kontrol firması zorunludur.';

  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}
