// Toplantı ve karar doğrulama kuralları.

function toplantiDogrula(veriler) {
  const hatalar = {};
  if (!veriler.baslik || !veriler.baslik.trim()) hatalar.baslik = 'Başlık zorunludur.';
  if (!veriler.tarih) hatalar.tarih = 'Tarih zorunludur.';
  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}

function kararDogrula(veriler) {
  const hatalar = {};
  if (!veriler.kararMetni || !veriler.kararMetni.trim()) hatalar.kararMetni = 'Karar metni zorunludur.';
  if (!veriler.sorumlu || !veriler.sorumlu.trim()) hatalar.sorumlu = 'Sorumlu zorunludur.';
  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}

function kurulOlayiDogrula(veriler) {
  const hatalar = {};
  if (!veriler.tur || !veriler.tur.trim()) hatalar.tur = 'Tür zorunludur.';
  if (!veriler.tarih) hatalar.tarih = 'Tarih zorunludur.';
  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}

function imzaSatiriDogrula(veriler) {
  const hatalar = {};
  if (!veriler.adSoyad || !veriler.adSoyad.trim()) hatalar.adSoyad = 'Ad soyad zorunludur.';
  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}

function ayIciFaaliyetDogrula(veriler) {
  const hatalar = {};
  if (!veriler.faaliyet || !veriler.faaliyet.trim()) hatalar.faaliyet = 'Faaliyet zorunludur.';
  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}
