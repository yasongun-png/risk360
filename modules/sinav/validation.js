// Sınav modülü doğrulama kuralları.

function soruDogrula(veriler) {
  const hatalar = {};

  if (!veriler.egitimTuruId || !egitimTuruGetir(veriler.egitimTuruId)) {
    hatalar.egitimTuruId = 'Geçerli bir eğitim/konu seçiniz.';
  }

  if (!veriler.soruMetni || !veriler.soruMetni.trim()) {
    hatalar.soruMetni = 'Soru metni zorunludur.';
  }

  const secenekler = veriler.secenekler || {};
  SINAV_SIK_HARFLERI.forEach(harf => {
    if (!secenekler[harf] || !secenekler[harf].trim()) {
      hatalar['secenek' + harf] = 'Bu şık boş bırakılamaz.';
    }
  });

  if (!SINAV_SIK_HARFLERI.includes(veriler.dogruCevap)) {
    hatalar.dogruCevap = 'Doğru cevap seçiniz.';
  }

  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}

function sinavOlusturmaDogrula(veriler, soruSayisiMevcut) {
  const hatalar = {};

  if (!veriler.baslik || !veriler.baslik.trim()) {
    hatalar.baslik = 'Sınav başlığı zorunludur.';
  }

  if (!veriler.egitimTuruId || !egitimTuruGetir(veriler.egitimTuruId)) {
    hatalar.sinavKonuId = 'Geçerli bir eğitim/konu seçiniz.';
  }

  if (!veriler.tarih) {
    hatalar.tarih = 'Tarih zorunludur.';
  }

  const soruSayisi = Number(veriler.soruSayisi);
  if (!soruSayisi || soruSayisi < 1) {
    hatalar.soruSayisi = 'En az 1 soru seçilmelidir.';
  } else if (soruSayisi > soruSayisiMevcut) {
    hatalar.soruSayisi = `Soru bankasında bu konu için sadece ${soruSayisiMevcut} soru var.`;
  }

  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}

function sinavSonucGirisDogrula(veriler) {
  const hatalar = {};

  if (!veriler.personelId) {
    hatalar.personelId = 'Personel seçimi zorunludur.';
  }

  const puan = Number(veriler.puan);
  if (veriler.puan === '' || veriler.puan == null || isNaN(puan) || puan < 0 || puan > 100) {
    hatalar.puan = 'Puan 0 ile 100 arasında olmalıdır.';
  }

  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}
