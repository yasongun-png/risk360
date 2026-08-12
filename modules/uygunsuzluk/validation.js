// Uygunsuzluk/DÖF kaydı doğrulama kuralları.

// Eski isg platformundaki Uygunsuzluk Takip Sistemi'yle birebir: tek zorunlu
// alan Uygunsuzluk Tanımı'dır (risk360'ta "baslik" olarak saklanır). Bölüm,
// Sorumlu, Termin, Açıklama vb. eski uygulamada da opsiyoneldi (boş/"-"
// olabiliyordu) — burada da zorunlu tutulmaz, aksi halde eski sistemden
// gelen gerçek veriler (geçmiş/kapalı kayıtlarda termin hiç girilmemiş olabilir) içe aktarılamaz.
function uygunsuzlukDogrula(veriler) {
  const hatalar = {};

  if (!veriler.baslik || !veriler.baslik.trim()) hatalar.baslik = 'Uygunsuzluk tanımı zorunludur.';

  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}
