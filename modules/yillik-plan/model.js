// Yıllık Değerlendirme ve Planlama: veri modeli.
// Üç alt bölüm: Eğitim Planı, Yıllık Çalışma Planı, Yıllık Değerlendirme Raporu.

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

const EGITIM_PLANI_DURUMLARI = ['Planlandı', 'Tamamlandı', 'Ertelendi'];
const CALISMA_PLANI_DURUMLARI = ['Planlandı', 'Tamamlandı', 'Devam Ediyor'];

function bosAyHaritasi() {
  return Object.fromEntries(AYLAR.map(ay => [ay, false]));
}

function egitimSatiriOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    topic: veriler.topic || '',
    months: veriler.months || bosAyHaritasi(),
    target: veriler.target || '',
    duration: veriler.duration || '',
    trainer: veriler.trainer || '',
    status: veriler.status || 'Planlandı',
    notes: veriler.notes || ''
  };
}

function calismaSatiriOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    activity: veriler.activity || '',
    months: veriler.months || bosAyHaritasi(),
    responsible: veriler.responsible || '',
    status: veriler.status || 'Planlandı',
    notes: veriler.notes || ''
  };
}

function raporSatiriOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    work: veriler.work || '',
    date: veriler.date || '',
    person: veriler.person || '',
    repeat: veriler.repeat || '',
    method: veriler.method || '',
    result: veriler.result || ''
  };
}

function bosRaporMeta() {
  return {
    company: '', sgk: '', sector: '', address: '',
    phone: '', email: '', male: 0, female: 0, young: 0, child: 0,
    expert: '', doctor: '', employer: ''
  };
}
