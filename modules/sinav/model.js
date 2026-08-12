// Sınav Oluşturucu veri modeli: soru bankası, sınav ve sonuç kayıtları.
// Sorular eğitim türüne (EGITIM_TURLERI, bkz. modules/egitim/model.js) bağlıdır.
// Bir sınav oluşturulduğunda seçilen sorular sınavın içine "kopyalanır" (snapshot);
// böylece soru bankasında sonradan yapılan bir değişiklik geçmiş sınavları etkilemez.

const SINAV_GECME_NOTU_VARSAYILAN = 70;
const SINAV_SIK_HARFLERI = ['A', 'B', 'C', 'D'];

function soruOlustur(veriler) {
  const secenekler = veriler.secenekler || {};
  return {
    id: veriler.id || rastgeleId(),
    egitimTuruId: veriler.egitimTuruId || '',
    soruMetni: (veriler.soruMetni || '').trim(),
    secenekler: {
      A: (secenekler.A || '').trim(),
      B: (secenekler.B || '').trim(),
      C: (secenekler.C || '').trim(),
      D: (secenekler.D || '').trim()
    },
    dogruCevap: veriler.dogruCevap || '',
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}

function sinavOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    baslik: (veriler.baslik || '').trim(),
    egitimTuruId: veriler.egitimTuruId || '',
    tarih: veriler.tarih || '',
    gecmeNotu: veriler.gecmeNotu || SINAV_GECME_NOTU_VARSAYILAN,
    sorular: veriler.sorular || [],
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}

function sinavSonucuOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    sinavId: veriler.sinavId || '',
    personelId: veriler.personelId || '',
    dogruSayisi: veriler.dogruSayisi != null ? veriler.dogruSayisi : 0,
    toplamSoru: veriler.toplamSoru != null ? veriler.toplamSoru : 0,
    puan: veriler.puan != null ? veriler.puan : 0,
    tarih: veriler.tarih || new Date().toISOString().split('T')[0],
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}
