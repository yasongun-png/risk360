// Risk kaydı doğrulama kuralları.

function riskDogrula(veriler) {
  const hatalar = {};

  if (!veriler.bolum || !veriler.bolum.trim()) hatalar.bolum = 'Bölüm zorunludur.';
  if (!veriler.yer || !veriler.yer.trim()) hatalar.yer = 'Yer / Ekipman zorunludur.';
  if (!veriler.faaliyet || !veriler.faaliyet.trim()) hatalar.faaliyet = 'Faaliyet zorunludur.';
  if (!veriler.tehlike || !veriler.tehlike.trim()) hatalar.tehlike = 'Tehlike zorunludur.';
  if (!veriler.risk || !veriler.risk.trim()) hatalar.risk = 'Risk açıklaması zorunludur.';

  if (!veriler.O) hatalar.O = 'Olasılık seçiniz.';
  // 5x5 Matris yönteminde frekans boyutu yok (Risk Puanı = Olasılık × Şiddet); F yalnızca
  // Fine-Kinney için zorunludur.
  if (veriler.yontem !== '5x5' && !veriler.F) hatalar.F = 'Frekans seçiniz.';
  if (!veriler.S) hatalar.S = 'Şiddet seçiniz.';

  if (veriler.termin && !/^\d{4}-\d{2}-\d{2}$/.test(veriler.termin)) {
    hatalar.termin = 'Geçerli bir tarih giriniz.';
  }

  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}
