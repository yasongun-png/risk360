// Tespit ve Öneri Defteri veri modeli. 6331 sayılı Kanun Madde 13 (çalışan
// görüşlerinin alınması) ve İSG Kurulları Hakkında Yönetmelik Madde 6
// kapsamındaki fiziksel "Tespit ve Öneri Defteri"nin dijital karşılığı. Eski
// üretim uygulamasındaki tespit_oneri modülünden aynı iş kuralı taşınmıştır:
// durum, girilen tarihlere göre otomatik türetilir — kapanış tarihi varsa
// Kapandı, tebliğ tarihi varsa en az Tebliğ Edildi, hiçbiri yoksa Açık.
// Kullanıcı elle Açık dışında bir durum seçtiyse (ör. Uygulamada, Reddedildi)
// o değer korunur.

function bugunIso() {
  return new Date().toISOString().slice(0, 10);
}

const TESPIT_ONCELIKLERI = ['Düşük', 'Orta', 'Yüksek', 'Acil'];
const TESPIT_DURUMLARI = ['Açık', 'Tebliğ Edildi', 'Uygulamada', 'Kapandı', 'Reddedildi'];
const TESPIT_KAPALI_DURUMLAR = ['Kapandı', 'Reddedildi'];

function tespitOneriSonrakiNoUret(mevcutListe) {
  let maks = 0;
  (mevcutListe || []).forEach(k => {
    const eslesme = String(k.kayitNo || '').match(/(\d+)$/);
    if (eslesme) { const n = parseInt(eslesme[1], 10); if (n > maks) maks = n; }
  });
  return 'TÖ' + String(maks + 1).padStart(4, '0');
}

function tespitOneriDurumuHesapla(veriler) {
  if (veriler.durum && veriler.durum !== 'Açık' && TESPIT_DURUMLARI.includes(veriler.durum)) return veriler.durum;
  if (veriler.kapanisTarihi) return 'Kapandı';
  if (veriler.tebligTarihi) return 'Tebliğ Edildi';
  return 'Açık';
}

function tespitOneriKaydiOlustur(veriler) {
  const kayit = {
    id: veriler.id || rastgeleId(),
    kayitNo: veriler.kayitNo || '',
    tespitTarihi: veriler.tespitTarihi || bugunIso(),
    tespitEden: (veriler.tespitEden || '').trim(),
    bolum: (veriler.bolum || '').trim(),
    tespit: (veriler.tespit || '').trim(),
    oneri: (veriler.oneri || '').trim(),
    oncelik: veriler.oncelik || 'Orta',
    tebligEdilen: (veriler.tebligEdilen || '').trim(),
    tebligTarihi: veriler.tebligTarihi || '',
    yapilanIslem: (veriler.yapilanIslem || '').trim(),
    kapanisTarihi: veriler.kapanisTarihi || '',
    defterSayfasiFotografi: veriler.defterSayfasiFotografi || '',
    notlar: (veriler.notlar || '').trim(),
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
  kayit.durum = tespitOneriDurumuHesapla(veriler);
  return kayit;
}
