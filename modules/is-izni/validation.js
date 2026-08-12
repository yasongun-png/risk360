// İş İzni doğrulama kuralları. Eski uygulamadaki kurallarla aynı, ama LOTO ve
// kapalı alan oksijen kontrolleri artık gerçek form alanlarına dayanıyor
// (bkz. model.js dosya başı notu — eski uygulamada bu alanlar hiç yoktu).

function izinDogrula(veriler) {
  const hatalar = {};

  if (!veriler.isTanimi || !veriler.isTanimi.trim()) hatalar.isTanimi = 'İş tanımı zorunludur.';
  if (!veriler.bolum || !veriler.bolum.trim()) hatalar.bolum = 'Bölüm zorunludur.';
  if (!veriler.lokasyon || !veriler.lokasyon.trim()) hatalar.lokasyon = 'Lokasyon / ekipman zorunludur.';
  if (!veriler.talepEden || !veriler.talepEden.trim()) hatalar.talepEden = 'Talep eden zorunludur.';
  if (!veriler.sahaSorumlusu || !veriler.sahaSorumlusu.trim()) hatalar.sahaSorumlusu = 'Saha sorumlusu zorunludur.';
  if (!veriler.baslangic) hatalar.baslangic = 'Başlangıç tarihi/saati zorunludur.';
  if (!veriler.bitis) hatalar.bitis = 'Bitiş tarihi/saati zorunludur.';

  if (veriler.baslangic && veriler.bitis) {
    const saat = izinSuresiSaatHesapla(veriler.baslangic, veriler.bitis);
    if (saat !== null && saat <= 0) hatalar.bitis = 'Bitiş, başlangıçtan sonra olmalıdır.';
    else if (saat !== null && saat > 24) hatalar.bitis = 'Tek iş izni 24 saatten uzun olmamalıdır; yeni izin açın.';
  }

  if (veriler.izinTuru === 'Kapalı Alan') {
    const oksijen = Number(String((veriler.gazOlcumu && veriler.gazOlcumu.oksijen) || '').replace(',', '.'));
    if (!veriler.gazOlcumu || !veriler.gazOlcumu.olcumZamani) hatalar.gazOlcumu = 'Kapalı alan için gaz ölçüm zamanı zorunludur.';
    else if (!Number.isFinite(oksijen) || oksijen < 19.5 || oksijen > 23.5) hatalar.gazOlcumu = 'Kapalı alan oksijen ölçümü 19,5 - 23,5 aralığında olmalıdır.';
  }

  if (IS_IZNI_LOTO_GEREKTIREN_TURLER.includes(veriler.izinTuru)) {
    const izolasyon = veriler.izolasyon || {};
    if (!izolasyon.lotoGerekli && !izolasyon.lotoUygulandi) hatalar.izolasyon = 'Bu iş türünde LOTO / enerji izolasyonu değerlendirilmelidir.';
  }

  if (veriler.riskSeviyesi === 'Kritik' && veriler.onayDurumu === 'Gerekmiyor') {
    hatalar.onayDurumu = 'Kritik riskli işlerde onay akışı gereklidir.';
  }

  if (!veriler.kontrolMaddeleri || !veriler.kontrolMaddeleri.length) hatalar.kontrolMaddeleri = 'En az bir kontrol maddesi bulunmalıdır.';

  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}
