// İş Güvenliği Analizi (JSA) kaydı doğrulama kuralları.

function jsaDogrula(veriler) {
  const hatalar = {};

  if (!veriler.degerlendirilenIs || !veriler.degerlendirilenIs.trim()) hatalar.degerlendirilenIs = 'Değerlendirilen iş/faaliyet zorunludur.';
  if (!veriler.tarih) hatalar.tarih = 'Tarih zorunludur.';
  if (!Array.isArray(veriler.adimlar) || !veriler.adimlar.some(a => a.eylem && a.eylem.trim())) {
    hatalar.adimlar = 'En az bir iş adımı girilmelidir.';
  }

  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}
