// Uygunsuzluk/DÖF kaydı doğrulama kuralları.

// Eski isg platformundaki Uygunsuzluk Takip Sistemi'yle birebir: tek zorunlu
// alan Uygunsuzluk Tanımı'dır (risk360'ta "baslik" olarak saklanır). Bölüm,
// Sorumlu, Termin, Açıklama vb. eski uygulamada da opsiyoneldi (boş/"-"
// olabiliyordu) — burada da zorunlu tutulmaz, aksi halde eski sistemden
// gelen gerçek veriler (geçmiş/kapalı kayıtlarda termin hiç girilmemiş olabilir) içe aktarılamaz.
function uygunsuzlukDogrula(veriler) {
  const hatalar = {};

  if (!veriler.baslik || !veriler.baslik.trim()) hatalar.baslik = 'Uygunsuzluk tanımı zorunludur.';

  // sorumluEposta opsiyoneldir ama doluysa (Mail Gönder'in çalışabilmesi
  // için) geçerli bir e-posta biçiminde olmalı. Form <input type="email">
  // kullanır ama tarayıcının kendi doğrulaması sessizce engelleyip hiçbir
  // hata göstermeden Kaydet'i işlevsiz bırakabildiğinden (form novalidate),
  // biçim kontrolü burada, görünür bir hata mesajıyla yapılır.
  const eposta = (veriler.sorumluEposta || '').trim();
  if (eposta && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(eposta)) {
    hatalar.sorumluEposta = 'Geçerli bir e-posta adresi girin (ör. ornek@firma.com).';
  }

  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}
