// Uygunsuzluk/DÖF kaydı doğrulama kuralları.

// Eski isg platformundaki Uygunsuzluk Takip Sistemi'yle birebir: tek zorunlu
// alan Uygunsuzluk Tanımı'dır (risk360'ta "baslik" olarak saklanır). Bölüm,
// Sorumlu, Termin, Açıklama vb. eski uygulamada da opsiyoneldi (boş/"-"
// olabiliyordu) — burada da zorunlu tutulmaz, aksi halde eski sistemden
// gelen gerçek veriler (geçmiş/kapalı kayıtlarda termin hiç girilmemiş olabilir) içe aktarılamaz.
function uygunsuzlukDogrula(veriler) {
  const hatalar = {};

  if (!veriler.baslik || !veriler.baslik.trim()) hatalar.baslik = 'Uygunsuzluk tanımı zorunludur.';

  // İlgililer (Kime/Bilgi) opsiyoneldir ama doluysa (Mail Gönder'in
  // çalışabilmesi için) geçerli e-posta biçiminde olmalı; virgülle ayrılmış
  // birden fazla adres desteklenir, her biri ayrı ayrı doğrulanır. Alanlar
  // <input type="text"> olduğundan (tarayıcının type="email" doğrulaması
  // virgüllü çoklu adresi ve sessiz engellemeyi -- form novalidate --
  // desteklemiyordu), biçim kontrolü burada, görünür hata mesajıyla yapılır.
  const _epostaBicimGecerliMi = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const _epostaListesiDogrula = (deger, alanAdi, etiket) => {
    const temiz = (deger || '').trim();
    if (!temiz) return;
    const adresler = temiz.split(',').map(a => a.trim()).filter(Boolean);
    if (adresler.some(a => !_epostaBicimGecerliMi(a))) {
      hatalar[alanAdi] = `${etiket} için geçerli e-posta adresi/adresleri girin (ör. ornek@firma.com, birden fazlaysa virgülle ayırın).`;
    }
  };
  _epostaListesiDogrula(veriler.ilgiliKime, 'ilgiliKime', 'İlgililer: Kime');
  _epostaListesiDogrula(veriler.ilgiliBilgi, 'ilgiliBilgi', 'İlgililer: Bilgi');

  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}
