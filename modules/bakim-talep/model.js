// Bakım Talep ve Onay Modülü veri modeli. Talep Eden Birim → Bakım → İSG
// onayından geçip kapanışa kadar TEK bir kayıt/form üzerinde ilerler (bkz.
// service.js durum makinesi). Aşama bazlı alan kilidi ui.js'te uygulanır.

const BAKIM_TALEP_DURUMLARI = [
  'Yeni',
  'Bakım Değerlendirmede',
  'İSG Onayında',
  'İSG İlave Önlem İstedi',
  'Onaylandı / Planlandı',
  'Bakım Tamamladı',
  'Kapatıldı',
  'Reddedildi'
];

// Kapalı sayılan (aktif takip listelerinden/merkezi aksiyondan düşen) durumlar.
const BAKIM_TALEP_KAPALI_DURUMLAR = ['Kapatıldı', 'Reddedildi'];

const BAKIM_TALEP_ONCELIKLERI = ['Acil', 'Yüksek', 'Normal', 'Düşük'];

// Kullanıcı isteği: "bakım tarafında elektrik ve otomasyon bakım da var,
// elektrik ile mekanik ayrı olmalı" — Bakım artık TEK bir havuz değil, her
// türün kendi 'bakim' rolündeki kullanıcıları SADECE kendi türündeki
// talepleri görür (bkz. kullanicilar.html kkBakimTuru, core/auth.js
// ikKullaniciEkle/Guncelle, service.js bakimTalepleriGetir).
const BAKIM_TALEP_BAKIM_TURLERI = ['Mekanik', 'Elektrik', 'Otomasyon'];

const BAKIM_TALEP_RISK_TURLERI = [
  'Elektrik', 'Yüksekte Çalışma', 'Kapalı Alan', 'Sıcak Çalışma',
  'Kimyasal', 'Mekanik', 'Diğer'
];

// Talep No: "BKM-YYYY-NNNN", her takvim yılı 1'den başlar (uygunsuzluk
// modülündeki sonrakiAksiyonNoUret ile aynı fikir, bölüm ön eki olmadan).
function sonrakiBakimTalepNoUret(mevcutListe, yilStr) {
  const yil = yilStr || String(new Date().getFullYear());
  let maks = 0;
  mevcutListe.forEach(item => {
    const no = String(item.talepNo || '');
    const eslesme = /^BKM-(\d{4})-(\d{4})$/.exec(no);
    if (!eslesme || eslesme[1] !== yil) return;
    const kuyruk = parseInt(eslesme[2], 10);
    if (Number.isFinite(kuyruk) && kuyruk > maks) maks = kuyruk;
  });
  return `BKM-${yil}-${String(maks + 1).padStart(4, '0')}`;
}

function bakimTalepOlustur(veriler, talepNo) {
  const t = veriler.talep || {};
  return {
    id: rastgeleId(),
    talepNo,
    durum: 'Yeni',
    olusturmaTarihi: new Date().toISOString(),
    talep: {
      birim: (t.birim || '').trim(),
      acanKisi: (t.acanKisi || '').trim(),
      tarih: new Date().toISOString(),
      konum: (t.konum || '').trim(),
      ekipmanKodu: (t.ekipmanKodu || '').trim(),
      isTanimi: (t.isTanimi || '').trim(),
      oncelik: BAKIM_TALEP_ONCELIKLERI.includes(t.oncelik) ? t.oncelik : 'Normal',
      bakimTuru: BAKIM_TALEP_BAKIM_TURLERI.includes(t.bakimTuru) ? t.bakimTuru : 'Mekanik',
      fotograflar: Array.isArray(t.fotograflar) ? t.fotograflar : []
    },
    bakim: {
      gorus: '', planlanmaTarihi: '', gerekliSartlar: [], riskler: [],
      onlemler: '', tahminiSure: '', degerlendirenKisi: '', tarih: ''
    },
    isg: {
      ilaveOnlemGerekli: false, ilaveOnlemAciklama: '',
      onayDurumu: '', onaylayanKisi: '', tarih: ''
    },
    kapanis: {
      bakimTamamlamaTarihi: '', bakimNotu: '',
      talepEdenOnay: false, onaylayanKisi: '', kapanisTarihi: ''
    },
    redGerekcesi: '',
    ilgiliUygunsuzlukNo: (veriler.ilgiliUygunsuzlukNo || '').trim(),
    gecmis: []
  };
}

function bakimTalepGecmisSatiri(durum, kullanici, not) {
  return {
    durum,
    kullanici: kullanici ? (kullanici.adSoyad || kullanici.kullaniciAdi) : '',
    tarih: new Date().toISOString(),
    not: not || ''
  };
}

// ---- Ekipman Envanteri (talep formlarından kendiliğinden oluşur) ----
// ad/tip/fotograf talep formundan gelmez (talep formu sadece kod/konum
// bilir) — kullanıcı isteği: "ekipman konumu/adı/kodu/tipi/fotoğrafı
// sonradan [envanter ekranından] eklenebilsin", bkz. ekipmanKaydiDuzenle.
function ekipmanEnvanterKaydiOlustur(kod, ad, konum) {
  return {
    id: rastgeleId(),
    kod: (kod || '').trim(),
    ad: (ad || '').trim(),
    tip: '',
    konum: (konum || '').trim(),
    fotograf: '',
    // Saha Dijital Haritası köprüsü — kullanıcı isteği: "ekipman konumu
    // haritadan seçilebilsin, nokta olarak işaretlenebilsin" (bkz.
    // modules/harita/ui.js HARITA_DIS_KAYNAKLAR.bakimEkipman).
    haritaTesisId: '', haritaX: 0, haritaY: 0,
    ilkGorulmeTarihi: new Date().toISOString(),
    sonKullanimTarihi: new Date().toISOString(),
    talepSayisi: 1
  };
}
