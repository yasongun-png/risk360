// Tespit ve Öneri Defteri iş kuralları: kayıt yaşam döngüsü (Açık → Tebliğ
// Edildi → Uygulamada → Kapandı, veya Reddedildi) ve özet.

function _tespitOneriZenginlestir(kayit) {
  return Object.assign({}, kayit, { durum: tespitOneriDurumuHesapla(kayit) });
}

function tespitOneriKayitlariniGetir(aramaMetni, filtreler) {
  const f = filtreler || {};
  let liste = tespitOneriTumunuGetir().map(_tespitOneriZenginlestir);

  if (f.durum) liste = liste.filter(k => k.durum === f.durum);
  if (f.oncelik) liste = liste.filter(k => k.oncelik === f.oncelik);
  if (f.bolum) liste = liste.filter(k => k.bolum === f.bolum);

  if (aramaMetni) {
    const kucuk = aramaMetni.trim().toLowerCase();
    liste = liste.filter(k =>
      k.bolum.toLowerCase().includes(kucuk) ||
      k.tespit.toLowerCase().includes(kucuk) ||
      k.oneri.toLowerCase().includes(kucuk) ||
      k.tespitEden.toLowerCase().includes(kucuk) ||
      (k.kayitNo || '').toLowerCase().includes(kucuk)
    );
  }

  return liste.sort((a, b) => (b.tespitTarihi || '').localeCompare(a.tespitTarihi || ''));
}

function tespitOneriEkle(veriler) {
  const dogrulama = tespitOneriDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const kayitNo = tespitOneriSonrakiNoUret(tespitOneriTumunuGetir());
  const yeniKayit = tespitOneriKaydiOlustur(Object.assign({}, veriler, { kayitNo }));
  tespitOneriEkleRepo(yeniKayit);
  return { basarili: true, kayit: yeniKayit };
}

function tespitOneriGuncelle(id, veriler) {
  const dogrulama = tespitOneriDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const mevcut = tespitOneriIdIleGetirRepo(id);
  const birlesik = Object.assign({}, mevcut, veriler, { id, kayitNo: mevcut ? mevcut.kayitNo : (veriler.kayitNo || '') });
  const guncellenen = tespitOneriGuncelleRepo(id, tespitOneriKaydiOlustur(birlesik));
  return { basarili: true, kayit: guncellenen };
}

function tespitOneriSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  tespitOneriSilRepo(id);
  return { basarili: true };
}

// Hızlı işlem: tebliğ edildi olarak işaretler (tarih bugün, birim/kişi verilir).
function tespitOneriTebligEt(id, tebligEdilen) {
  const guncellenen = tespitOneriGuncelleRepo(id, {
    tebligEdilen: (tebligEdilen || '').trim(),
    tebligTarihi: bugunIso()
  });
  if (!guncellenen) return { basarili: false, hata: 'Kayıt bulunamadı.' };
  guncellenen.durum = tespitOneriDurumuHesapla(guncellenen);
  tespitOneriGuncelleRepo(id, { durum: guncellenen.durum });
  return { basarili: true, kayit: guncellenen };
}

// Hızlı işlem: kapanış tarihi bugün olarak kaydedilir, yapılan işlem eklenir.
function tespitOneriKapat(id, yapilanIslem) {
  const guncellenen = tespitOneriGuncelleRepo(id, {
    yapilanIslem: (yapilanIslem || '').trim(),
    kapanisTarihi: bugunIso()
  });
  if (!guncellenen) return { basarili: false, hata: 'Kayıt bulunamadı.' };
  guncellenen.durum = tespitOneriDurumuHesapla(guncellenen);
  tespitOneriGuncelleRepo(id, { durum: guncellenen.durum });
  return { basarili: true, kayit: guncellenen };
}

function tespitOneriOzetiHesapla() {
  const liste = tespitOneriKayitlariniGetir('', {});
  const grupla = (secici) => {
    const sonuc = {};
    liste.forEach(k => { const anahtar = secici(k) || 'Belirtilmemiş'; sonuc[anahtar] = (sonuc[anahtar] || 0) + 1; });
    return Object.entries(sonuc).sort((a, b) => b[1] - a[1]);
  };

  return {
    toplam: liste.length,
    acik: liste.filter(k => !TESPIT_KAPALI_DURUMLAR.includes(k.durum)).length,
    acilAcik: liste.filter(k => k.oncelik === 'Acil' && k.durum === 'Açık').length,
    tebligBekleyen: liste.filter(k => k.durum === 'Açık').length,
    kapanan: liste.filter(k => k.durum === 'Kapandı').length,
    bolumeGore: grupla(k => k.bolum),
    durumaGore: grupla(k => k.durum),
    oncelikliAcikKayitlar: liste
      .filter(k => !TESPIT_KAPALI_DURUMLAR.includes(k.durum))
      .sort((a, b) => {
        const siralama = { 'Acil': 4, 'Yüksek': 3, 'Orta': 2, 'Düşük': 1 };
        return (siralama[b.oncelik] || 0) - (siralama[a.oncelik] || 0) || (a.tespitTarihi || '').localeCompare(b.tespitTarihi || '');
      })
      .slice(0, 10)
  };
}
