// Malzeme Talep doğrulama kuralları.

function malzemeDogrula(veriler) {
  const hatalar = {};

  if (!veriler.ad || !veriler.ad.trim()) hatalar.ad = 'Malzeme adı zorunludur.';

  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}

// Eski uygulamadaki kurallarla aynı: talep tarihi + konu zorunlu, en az bir
// malzeme seçili, tüm miktarlar pozitif.
function malzemeTalepDogrula(veriler, secilenMalzemeler) {
  const hatalar = {};

  if (!veriler.talepTarihi) hatalar.talepTarihi = 'Talep tarihi zorunludur.';
  if (!veriler.konu || !veriler.konu.trim()) hatalar.konu = 'Konu / Özü zorunludur.';
  if (!secilenMalzemeler || !secilenMalzemeler.length) hatalar.malzemeler = 'En az bir malzeme seçin.';
  else if (secilenMalzemeler.some(m => !(Number(m.miktar) > 0))) hatalar.malzemeler = 'Tüm malzemelerin miktarı pozitif olmalıdır.';

  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}
