// Yüklenici firma/personel doğrulama kuralları.

function yukleniciFirmaDogrula(veriler) {
  const hatalar = {};
  if (!veriler.firmaAdi || !veriler.firmaAdi.trim()) hatalar.firmaAdi = 'Firma adı zorunludur.';
  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}

function yukleniciKisiDogrula(veriler) {
  const hatalar = {};
  if (!veriler.adSoyad || !veriler.adSoyad.trim()) hatalar.adSoyad = 'Ad soyad zorunludur.';
  if (!veriler.firmaId) hatalar.firmaId = 'Firma seçimi zorunludur.';
  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}

// Eski uygulamadaki "Firma ve Kimlik zorunlu" kuralı (a_save handler).
function yukleniciAracDogrula(veriler) {
  const hatalar = {};
  if (!veriler.firmaId) hatalar.firmaId = 'Firma seçimi zorunludur.';
  if (!veriler.kimlik || !veriler.kimlik.trim()) hatalar.kimlik = 'Plaka / Seri No zorunludur.';
  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}

// Eski uygulamadaki "Ad Soyad ve Tarih zorunlu" kuralı (ziyaretciEkle).
function yukleniciZiyaretciDogrula(veriler) {
  const hatalar = {};
  if (!veriler.adSoyad || !veriler.adSoyad.trim()) hatalar.adSoyad = 'Ad soyad zorunludur.';
  if (!veriler.tarih) hatalar.tarih = 'Tarih zorunludur.';
  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}
