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

function ekipTanimiDogrula(veriler) {
  const hatalar = {};
  if (!veriler.ekipTuru) hatalar.ekipTuru = 'Ekip türü zorunludur.';
  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}

function komutaPozisyonuDogrula(veriler) {
  const hatalar = {};
  if (!veriler.pozisyonAdi || !veriler.pozisyonAdi.trim()) hatalar.pozisyonAdi = 'Pozisyon adı zorunludur.';
  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}

function tahliyeAlaniDogrula(veriler) {
  const hatalar = {};
  if (!veriler.binaAdi || !veriler.binaAdi.trim()) hatalar.binaAdi = 'Bina/alan adı zorunludur.';
  if (!veriler.toplanmaAlani || !veriler.toplanmaAlani.trim()) hatalar.toplanmaAlani = 'Toplanma alanı zorunludur.';
  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}

function kimyasalEkiDogrula(veriler) {
  const hatalar = {};
  if (!veriler.kimyasalId) hatalar.kimyasalId = 'Kimyasal seçimi zorunludur.';
  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}

function krokiKontrolMaddesiDogrula(veriler) {
  const hatalar = {};
  if (!veriler.binaAlan || !veriler.binaAlan.trim()) hatalar.binaAlan = 'Bina/alan zorunludur.';
  if (!veriler.unsurTuru) hatalar.unsurTuru = 'Unsur türü zorunludur.';
  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}

function disKurumDogrula(veriler) {
  const hatalar = {};
  if (!veriler.ad || !veriler.ad.trim()) hatalar.ad = 'Kurum adı zorunludur.';
  if (!veriler.telefon || !veriler.telefon.trim()) hatalar.telefon = 'Telefon zorunludur.';
  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}

function eylemPlaniMaddesiDogrula(veriler) {
  const hatalar = {};
  if (!veriler.eksiklik || !veriler.eksiklik.trim()) hatalar.eksiklik = 'Eksiklik açıklaması zorunludur.';
  if (!veriler.sorumlu || !veriler.sorumlu.trim()) hatalar.sorumlu = 'Sorumlu zorunludur.';
  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}
