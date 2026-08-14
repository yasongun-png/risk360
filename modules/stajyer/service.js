// Stajyer Yönetimi iş kuralları.

function _stajyerZenginlestir(kayit) {
  const durumGoruntu = stajyerDurumuTuret(kayit.baslangicTarihi, kayit.bitisTarihi, kayit.durum, bugunIso());
  const isgEgitimDurumu = isgEgitimDurumuHesapla(isgEgitimEfektifTarihi(kayit), kayit.baslangicTarihi);
  return Object.assign({}, kayit, { durumGoruntu, isgEgitimDurumu });
}

function stajyerleriGetir(aramaMetni, filtreler) {
  const f = filtreler || {};
  let liste = stajyerTumunuGetir().map(_stajyerZenginlestir);

  if (f.durum) liste = liste.filter(k => k.durumGoruntu === f.durum);
  if (f.bolum) liste = liste.filter(k => k.bolum === f.bolum);

  if (aramaMetni) {
    const kucuk = aramaMetni.trim().toLowerCase();
    liste = liste.filter(k =>
      k.adSoyad.toLowerCase().includes(kucuk) ||
      k.bolum.toLowerCase().includes(kucuk) ||
      k.okul.toLowerCase().includes(kucuk) ||
      (k.stajNo || '').toLowerCase().includes(kucuk)
    );
  }

  return liste.sort((a, b) => (b.baslangicTarihi || '').localeCompare(a.baslangicTarihi || ''));
}

function stajyerEkle(veriler) {
  const dogrulama = stajyerDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const stajNo = sonrakiNoUret('STJ', stajyerTumunuGetir(), 'stajNo');
  const yeniKayit = stajyerOlustur(Object.assign({}, veriler, {
    stajNo,
    durum: stajyerDurumuTuret(veriler.baslangicTarihi, veriler.bitisTarihi, veriler.durum, bugunIso())
  }));
  stajyerEkleRepo(yeniKayit);
  return { basarili: true, kayit: yeniKayit };
}

function stajyerGuncelle(id, veriler) {
  const dogrulama = stajyerDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const guncellenen = stajyerGuncelleRepo(id, {
    adSoyad: veriler.adSoyad.trim(),
    bolum: veriler.bolum.trim(),
    okul: veriler.okul.trim(),
    okulBolumu: veriler.okulBolumu.trim(),
    sinif: (veriler.sinif || '').trim(),
    telefon: (veriler.telefon || '').trim(),
    stajTuru: veriler.stajTuru || 'Zorunlu Staj',
    sorumluPersonelId: veriler.sorumluPersonelId || '',
    sorumluAdi: (veriler.sorumluAdi || '').trim(),
    baslangicTarihi: veriler.baslangicTarihi,
    bitisTarihi: veriler.bitisTarihi,
    isgEgitimTarihi: veriler.isgEgitimTarihi || '',
    isgEgitimTarihi2: veriler.isgEgitimTarihi2 || '',
    durum: stajyerDurumuTuret(veriler.baslangicTarihi, veriler.bitisTarihi, veriler.durum, bugunIso()),
    notlar: (veriler.notlar || '').trim()
  });
  return { basarili: true, kayit: guncellenen };
}

function stajyerSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  stajyerSilRepo(id);
  return { basarili: true };
}

function stajyerOzetiHesapla() {
  const liste = stajyerleriGetir('', {});
  const grupla = (secici) => {
    const sonuc = {};
    liste.forEach(k => {
      const anahtar = secici(k) || 'Belirtilmemiş';
      sonuc[anahtar] = (sonuc[anahtar] || 0) + 1;
    });
    return Object.entries(sonuc).sort((a, b) => b[1] - a[1]);
  };

  const yediGunSonra = new Date();
  yediGunSonra.setDate(yediGunSonra.getDate() + 7);
  // toISOString() UTC'ye çevirir; UTC+3'te gece yarısı-03:00 arası bir gün geri kayar.
  const yediGunSonraStr = yediGunSonra.getFullYear() + '-' + String(yediGunSonra.getMonth() + 1).padStart(2, '0') + '-' + String(yediGunSonra.getDate()).padStart(2, '0');
  const bugun = bugunIso();

  return {
    toplam: liste.length,
    aktif: liste.filter(k => k.durumGoruntu === 'Aktif').length,
    planlandi: liste.filter(k => k.durumGoruntu === 'Planlandı').length,
    tamamlandi: liste.filter(k => k.durumGoruntu === 'Tamamlandı').length,
    sorumluAtanmamis: liste.filter(k => k.durumGoruntu !== 'Tamamlandı' && k.durumGoruntu !== 'İptal Edildi' && !k.sorumluAdi).length,
    isgEgitimiEksikVeyaGec: liste.filter(k => k.isgEgitimDurumu !== 'Staj Öncesi Tamamlanmış').length,
    bolumeGore: grupla(k => k.bolum),
    okulaGore: grupla(k => k.okul),
    stajTurune: grupla(k => k.stajTuru),
    yakindaBitecekler: liste.filter(k => k.durumGoruntu === 'Aktif' && k.bitisTarihi >= bugun && k.bitisTarihi <= yediGunSonraStr)
  };
}

// ---- Sertifika (Temel Eğitim Belgesi) ----

function sertifikaVerisiOlustur(stajyer, firma) {
  const tehlikeSinifi = (firma && firma.tehlikeSinifi) || 'Az Tehlikeli';
  const plan = sertifikaPlaniGetir(tehlikeSinifi);
  const toplamDakika = sertifikaToplamDakikaHesapla(plan);
  return {
    tehlikeSinifi,
    plan,
    toplamDakika,
    toplamSure: dakikayiSaateCevir(toplamDakika),
    gecerlilikTarihi: sertifikaGecerlilikTarihiHesapla(isgEgitimEfektifTarihi(stajyer), tehlikeSinifi),
    gecerlilikYili: SERTIFIKA_GECERLILIK_YILI[tehlikeSinifi] || 3
  };
}
