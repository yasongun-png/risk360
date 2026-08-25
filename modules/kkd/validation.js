// KKD kayıtları doğrulama kuralları.

function envanterDogrula(veriler) {
  const hatalar = {};

  if (!veriler.ad || !veriler.ad.trim()) hatalar.ad = 'KKD adı zorunludur.';
  if (!veriler.tur) hatalar.tur = 'KKD türü zorunludur.';

  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}

function zimmetDogrula(veriler) {
  const hatalar = {};

  if (!veriler.personelAdi || !veriler.personelAdi.trim()) hatalar.personelAdi = 'Personel zorunludur.';
  if (!veriler.kkdAdi || !veriler.kkdAdi.trim()) hatalar.kkdAdi = 'KKD adı zorunludur.';
  if (!veriler.verilisTarihi) hatalar.verilisTarihi = 'Veriliş tarihi zorunludur.';

  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}

function numuneDogrula(veriler) {
  const hatalar = {};

  if (!veriler.kkdAdi || !veriler.kkdAdi.trim()) hatalar.kkdAdi = 'KKD adı zorunludur.';
  if (!veriler.deneyBaslangic) hatalar.deneyBaslangic = 'Deney başlangıç tarihi zorunludur.';

  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}

function ihlalDogrula(veriler) {
  const hatalar = {};

  if (!veriler.tarih) hatalar.tarih = 'Tarih zorunludur.';
  if (!veriler.adSoyad || !veriler.adSoyad.trim()) hatalar.adSoyad = 'Çalışan ad soyad zorunludur.';
  if (!veriler.ihlalTuru) hatalar.ihlalTuru = 'İhlal türü zorunludur.';
  if (!veriler.tespitEden || !veriler.tespitEden.trim()) hatalar.tespitEden = 'Tespiti yapan zorunludur.';
  if (!veriler.islem) hatalar.islem = 'Uygulanan işlem zorunludur.';

  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}
