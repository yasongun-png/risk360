// Eğitim Materyalleri: kullanıcının hazırladığı Toolbox Talk/PDF/PPTX gibi
// eğitim dosyalarını saklayıp istediğinde indirebileceği basit bir kütüphane.
// Kullanıcı isteği: "hazırladığım toobax, pdf, pptx eğitimleri kaydedebileceğim
// istediğimde oradan indirebileceğim bir yer olsun".
//
// Dosyanın kendisi Firebase Storage'a yüklenir — Firestore'un belge başına
// ~1MB sınırı (bkz. core/data.js fotoBuyukKaydet) PPTX/PDF sunumları için
// yetersiz kalır; Firestore'da (oku/yaz ile, diğer koleksiyonlarla aynı
// desende) sadece küçük metadata (başlık, dosya adı, Storage URL'i, boyut,
// tarih) tutulur.

const EGITIM_MATERYAL_IZIN_VERILEN_UZANTILAR = ['.pdf', '.ppt', '.pptx', '.doc', '.docx'];
const EGITIM_MATERYAL_AZAMI_BOYUT = 50 * 1024 * 1024; // 50 MB

function _materyalUzantiGecerliMi(dosyaAdi) {
  const ad = (dosyaAdi || '').toLowerCase();
  return EGITIM_MATERYAL_IZIN_VERILEN_UZANTILAR.some(u => ad.endsWith(u));
}

function egitimMateryalleriTumunuGetir() {
  return oku(tenantAnahtar('egitim_materyalleri'), []);
}

function egitimMateryalleriniGetir(aramaMetni) {
  const liste = egitimMateryalleriTumunuGetir().slice().sort((a, b) => (b.yuklemeTarihi || '').localeCompare(a.yuklemeTarihi || ''));
  if (!aramaMetni) return liste;
  const kucuk = aramaMetni.trim().toLocaleLowerCase('tr-TR');
  return liste.filter(m => m.ad.toLocaleLowerCase('tr-TR').includes(kucuk));
}

async function egitimMateryaliYukle(dosya, ad) {
  if (!dosya) return { basarili: false, hata: 'Dosya seçilmedi.' };
  if (!_materyalUzantiGecerliMi(dosya.name)) return { basarili: false, hata: 'Sadece PDF, PPT/PPTX veya Word dosyaları yüklenebilir.' };
  if (dosya.size > EGITIM_MATERYAL_AZAMI_BOYUT) return { basarili: false, hata: 'Dosya çok büyük (maks. 50 MB).' };

  const storage = bulutStorageAl();
  if (!storage) return { basarili: false, hata: 'Bulut depolama şu an kullanılamıyor — internet bağlantınızı kontrol edip tekrar deneyin.' };

  const firma = aktifFirmaGetir();
  const temizAd = String(dosya.name || 'dosya').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-100);
  const yol = `egitim-materyalleri/${firma ? firma.slug : 'ortak'}/${Date.now()}_${temizAd}`;

  let url;
  try {
    const anlik = await storage.ref().child(yol).put(dosya, { contentType: dosya.type || 'application/octet-stream' });
    url = await anlik.ref.getDownloadURL();
  } catch (hata) {
    return { basarili: false, hata: 'Dosya yüklenemedi: ' + (hata.message || hata) };
  }

  const materyal = {
    id: rastgeleId(),
    ad: (ad || '').trim() || dosya.name,
    dosyaAdi: dosya.name,
    url,
    yol,
    boyut: dosya.size,
    yuklemeTarihi: new Date().toISOString()
  };

  const liste = egitimMateryalleriTumunuGetir();
  liste.push(materyal);
  yaz(tenantAnahtar('egitim_materyalleri'), liste);
  return { basarili: true, materyal };
}

function egitimMateryaliSil(id) {
  const liste = egitimMateryalleriTumunuGetir();
  const materyal = liste.find(m => m.id === id);
  if (!materyal) return { basarili: false };

  yaz(tenantAnahtar('egitim_materyalleri'), liste.filter(m => m.id !== id));

  // Storage'daki gerçek dosyayı da silmeyi dene — best-effort: başarısız
  // olsa bile (ör. eski/kırık referans) metadata zaten silinmiş olur.
  const storage = bulutStorageAl();
  if (storage && materyal.yol) {
    storage.ref().child(materyal.yol).delete().catch(() => {});
  }
  return { basarili: true };
}
