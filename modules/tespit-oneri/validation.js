// Tespit ve Öneri Defteri kaydı doğrulama kuralları.

function tespitOneriDogrula(veriler) {
  const hatalar = {};

  if (!veriler.tespitTarihi) hatalar.tespitTarihi = 'Tespit tarihi zorunludur.';
  if (!veriler.tespitEden || !veriler.tespitEden.trim()) hatalar.tespitEden = 'Tespiti yapan kişi zorunludur.';
  if (!veriler.bolum || !veriler.bolum.trim()) hatalar.bolum = 'Bölüm / yer zorunludur.';
  if (!veriler.tespit || !veriler.tespit.trim()) hatalar.tespit = 'Tespit (bulgu) metni zorunludur.';
  if (!veriler.oneri || !veriler.oneri.trim()) hatalar.oneri = 'Öneri metni zorunludur.';
  if (veriler.tebligTarihi && veriler.tespitTarihi && veriler.tebligTarihi < veriler.tespitTarihi) hatalar.tebligTarihi = 'Tebliğ tarihi tespit tarihinden önce olamaz.';

  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}
