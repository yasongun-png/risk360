// Yıllık plan/rapor iş kuralları.

function egitimPlaniEkle(yil) {
  const satirlar = egitimPlaniYilGetir(yil);
  satirlar.push(egitimSatiriOlustur({}));
  egitimPlaniYilKaydet(yil, satirlar);
  return satirlar;
}

function egitimPlaniGuncelle(yil, id, alan, deger) {
  const satirlar = egitimPlaniYilGetir(yil);
  const satir = satirlar.find(s => s.id === id);
  if (!satir) return;
  if (alan.startsWith('months.')) {
    satir.months[alan.split('.')[1]] = deger;
  } else {
    satir[alan] = deger;
  }
  egitimPlaniYilKaydet(yil, satirlar);
}

function egitimPlaniSil(yil, id) {
  egitimPlaniYilKaydet(yil, egitimPlaniYilGetir(yil).filter(s => s.id !== id));
}

// Excel içe aktarımda satır satır egitimPlaniEkle/Kaydet çağırmak, her satırın
// kendi bulut yazımını ateşlemesine yol açar — büyük plan tablolarında (20+
// satır) canlı onSnapshot dinleyicisiyle yarışıp satır kaybına sebep olabilir
// (İSG Kurulu'nun imza listesi kopyalamasında yaşanan hatayla aynı kök neden).
// Bunun yerine TÜM satırlar tek seferde birleştirilip TEK egitimPlaniYilKaydet
// çağrısıyla yazılır.
function egitimPlaniTopluIceAktar(yil, hamSatirlar) {
  const eklenenler = hamSatirlar
    .filter(v => (v.topic || '').trim())
    .map(v => egitimSatiriOlustur(v));
  if (!eklenenler.length) return { basarili: 0 };
  egitimPlaniYilKaydet(yil, egitimPlaniYilGetir(yil).concat(eklenenler));
  return { basarili: eklenenler.length };
}

function calismaPlaniEkle(yil) {
  const satirlar = calismaPlaniYilGetir(yil);
  satirlar.push(calismaSatiriOlustur({}));
  calismaPlaniYilKaydet(yil, satirlar);
  return satirlar;
}

function calismaPlaniGuncelle(yil, id, alan, deger) {
  const satirlar = calismaPlaniYilGetir(yil);
  const satir = satirlar.find(s => s.id === id);
  if (!satir) return;
  if (alan.startsWith('months.')) {
    satir.months[alan.split('.')[1]] = deger;
  } else {
    satir[alan] = deger;
  }
  calismaPlaniYilKaydet(yil, satirlar);
}

function calismaPlaniSil(yil, id) {
  calismaPlaniYilKaydet(yil, calismaPlaniYilGetir(yil).filter(s => s.id !== id));
}

// bkz. egitimPlaniTopluIceAktar — aynı gerekçeyle tek yazım.
function calismaPlaniTopluIceAktar(yil, hamSatirlar) {
  const eklenenler = hamSatirlar
    .filter(v => (v.activity || '').trim())
    .map(v => calismaSatiriOlustur(v));
  if (!eklenenler.length) return { basarili: 0 };
  calismaPlaniYilKaydet(yil, calismaPlaniYilGetir(yil).concat(eklenenler));
  return { basarili: eklenenler.length };
}

function satirAyToplami(satir) {
  return AYLAR.reduce((toplam, ay) => toplam + (satir.months[ay] ? 1 : 0), 0);
}

function planIstatistikleriHesapla(satirlar) {
  return {
    toplam: satirlar.length,
    ayToplami: satirlar.reduce((t, s) => t + satirAyToplami(s), 0),
    tamamlanan: satirlar.filter(s => s.status === 'Tamamlandı').length
  };
}

// Çalışma planı + eğitim planındaki kayıtlardan varsayılan rapor satırları üretir.
// Metinler genel 6331 sayılı Kanun / ilgili yönetmelik referanslarıdır, firmaya özel değildir.
function _varsayilanRaporSatirlariniUret(yil) {
  const satirlar = [];

  calismaPlaniYilGetir(yil).forEach(w => {
    const isaretliAylar = AYLAR.filter(ay => w.months[ay]);
    satirlar.push(raporSatiriOlustur({
      work: w.activity || '',
      date: isaretliAylar.length ? isaretliAylar.join(', ') + ' ' + yil : String(yil),
      person: w.responsible || 'İSG Birimi',
      repeat: isaretliAylar.length || 1,
      method: '6331 sayılı İş Sağlığı ve Güvenliği Kanunu ve ilgili yönetmelikler gereğince',
      result: w.notes || (w.status === 'Tamamlandı' ? 'Faaliyet tamamlanmıştır.' : 'Plan ve belirlenen riskler üzerinden takip yapılmaktadır.')
    }));
  });

  const egitimSatirlari = egitimPlaniYilGetir(yil);
  if (egitimSatirlari.length) {
    satirlar.push(raporSatiriOlustur({
      work: 'İş Sağlığı ve Güvenliği Eğitimleri',
      date: '01.01.' + yil + ' - 31.12.' + yil,
      person: 'İSG Birimi',
      repeat: egitimSatirlari.length,
      method: 'Çalışanların İş Sağlığı ve Güvenliği Eğitimlerinin Usul ve Esasları Hakkında Yönetmelik',
      result: egitimSatirlari.length + ' eğitim/faaliyet kaydı yıllık plan kapsamında değerlendirilmiştir.'
    }));
  }

  return satirlar;
}

function raporGetirVeyaOlustur(yil, firma) {
  let rapor = raporYilGetir(yil);
  if (!rapor) {
    rapor = { meta: bosRaporMeta(), rows: _varsayilanRaporSatirlariniUret(yil) };
  }
  if (!rapor.meta.company && firma) {
    rapor.meta.company = firma.ad;
  }
  raporYilKaydet(yil, rapor);
  return rapor;
}

function raporMetaGuncelle(yil, alan, deger) {
  const rapor = raporYilGetir(yil);
  if (!rapor) return;
  rapor.meta[alan] = deger;
  raporYilKaydet(yil, rapor);
}

function raporSatiriEkle(yil) {
  const rapor = raporYilGetir(yil);
  if (!rapor) return;
  rapor.rows.push(raporSatiriOlustur({}));
  raporYilKaydet(yil, rapor);
}

function raporSatiriGuncelle(yil, id, alan, deger) {
  const rapor = raporYilGetir(yil);
  if (!rapor) return;
  const satir = rapor.rows.find(s => s.id === id);
  if (!satir) return;
  satir[alan] = deger;
  raporYilKaydet(yil, rapor);
}

function raporSatiriSil(yil, id) {
  const rapor = raporYilGetir(yil);
  if (!rapor) return;
  rapor.rows = rapor.rows.filter(s => s.id !== id);
  raporYilKaydet(yil, rapor);
}

// bkz. egitimPlaniTopluIceAktar — aynı gerekçeyle tek yazım.
function raporSatirlariTopluIceAktar(yil, hamSatirlar) {
  const eklenenler = hamSatirlar
    .filter(v => (v.work || '').trim())
    .map(v => raporSatiriOlustur(v));
  if (!eklenenler.length) return { basarili: 0 };
  const rapor = raporYilGetir(yil) || { meta: bosRaporMeta(), rows: [] };
  rapor.rows = rapor.rows.concat(eklenenler);
  raporYilKaydet(yil, rapor);
  return { basarili: eklenenler.length };
}
