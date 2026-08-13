// Acil Durum Yönetimi doğrulama kuralları.

function ekipUyesiDogrula(veriler) {
  const hatalar = {};
  if (!veriler.personelAdi || !veriler.personelAdi.trim()) hatalar.personelAdi = 'Personel seçimi zorunludur.';
  if (!veriler.ekipTuru) hatalar.ekipTuru = 'Ekip türü zorunludur.';
  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}

function ekipmanDogrula(veriler) {
  const hatalar = {};
  if (!veriler.tur) hatalar.tur = 'Ekipman türü zorunludur.';
  if (!veriler.lokasyon || !veriler.lokasyon.trim()) hatalar.lokasyon = 'Lokasyon zorunludur.';
  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}

function yanginTupuDogrula(veriler) {
  const hatalar = {};
  if (!veriler.tip) hatalar.tip = 'Tip zorunludur.';
  if (!veriler.lokasyon || !veriler.lokasyon.trim()) hatalar.lokasyon = 'Lokasyon zorunludur.';
  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}

function tatbikatDogrula(veriler) {
  const hatalar = {};
  if (!veriler.baslik || !veriler.baslik.trim()) hatalar.baslik = 'Tatbikat adı zorunludur.';
  if (!veriler.planlananTarih) hatalar.planlananTarih = 'Planlanan tarih zorunludur.';
  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}

function senaryoDogrula(veriler) {
  const hatalar = {};
  if (!veriler.baslik || !veriler.baslik.trim()) hatalar.baslik = 'Senaryo adı zorunludur.';
  if (!veriler.tetikleyici || !veriler.tetikleyici.trim()) hatalar.tetikleyici = 'Tetikleyici olay zorunludur.';
  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}
