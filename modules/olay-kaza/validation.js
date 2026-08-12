// Olay/Kaza kaydı doğrulama kuralları.

function olayKaydiDogrula(veriler) {
  const hatalar = {};

  if (!veriler.olayTipi) hatalar.olayTipi = 'Olay tipi zorunludur.';
  if (!veriler.kazaTarihi) hatalar.kazaTarihi = 'Tarih zorunludur.';
  if (!veriler.bolum || !veriler.bolum.trim()) hatalar.bolum = 'Bölüm zorunludur.';
  // Yaralanma içermeyen olay tiplerinde (Ramak Kala, Maddi Hasar, Çevresel
  // Olay, Yangın vb. acil durumlar) mağdur/ilgili personel olmayabilir —
  // kullanıcı isteği: "illaki kişi girmeyi zorunlu tutmasın".
  if (OLAY_KISI_ZORUNLU_TIPLERI.includes(veriler.olayTipi) && (!veriler.adSoyad || !veriler.adSoyad.trim())) {
    hatalar.adSoyad = 'Bu olay tipinde ilgili personel zorunludur.';
  }
  if (!veriler.aciklama || !veriler.aciklama.trim()) hatalar.aciklama = 'Olay anlatımı (açıklama) zorunludur.';

  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}
