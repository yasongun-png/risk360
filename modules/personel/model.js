// Personel veri modeli. Eski üretim uygulamasındaki (isg platformu) "Yeni
// Personel" formuyla aynı bilgileri taşır — temel özlük bilgilerinin yanına
// İK bilgileri (eğitim seviyesi, okul, engelli/sendikalı durumu, medeni hal,
// kapsam, kıdem, lojman) eklendi.

const PERSONEL_EGITIM_SEVIYELERI = ['İlkokul', 'Ortaokul', 'Lise', 'Ön Lisans', 'Lisans', 'Yüksek Lisans'];
const PERSONEL_EVET_HAYIR = ['HAYIR', 'EVET'];
const PERSONEL_LOJMAN_SECENEKLERI = ['YOK', 'VAR'];

function personelOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    sicilNo: (veriler.sicilNo || '').trim(),
    adSoyad: (veriler.adSoyad || '').trim(),
    // Aynı sahada birden fazla sicil/tüzel işveren olabilir (bkz. core/tenant.js
    // firma.isverenler, firma-yonetim.html'de düzenlenir) — kullanıcı isteği:
    // BAĞFAŞ örneği, aynı yerde çalışan 3 farklı sicilli şirket.
    isveren: (veriler.isveren || '').trim(),
    bolum: (veriler.bolum || '').trim(),
    gorev: (veriler.gorev || '').trim(),
    pozisyonId: veriler.pozisyonId || '',
    iseGirisTarihi: veriler.iseGirisTarihi || '',
    istenCikisTarihi: veriler.istenCikisTarihi || '',
    egitimSeviyesi: veriler.egitimSeviyesi || '',
    okulu: (veriler.okulu || '').trim(),
    engelliMi: veriler.engelliMi || 'HAYIR',
    sendikaliMi: veriler.sendikaliMi || 'HAYIR',
    mv: (veriler.mv || '').trim(),
    kapsami: (veriler.kapsami || '').trim(),
    kidemYil: veriler.kidemYil === '' || veriler.kidemYil == null ? null : Number(veriler.kidemYil),
    lojman: veriler.lojman || 'YOK',
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}
