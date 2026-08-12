// Hizmet Sözleşmeleri iş kuralları.

function _hizmetSozlesmesiZenginlestir(kayit) {
  return Object.assign({}, kayit, { durum: hizmetSozlesmesiDurumuHesapla(kayit) });
}

function hizmetSozlesmeleriniGetir(aramaMetni, filtreler) {
  const f = filtreler || {};
  let liste = hizmetSozlesmeleriTumunuGetir().map(_hizmetSozlesmesiZenginlestir);

  if (f.gorevTuru) liste = liste.filter(k => k.gorevTuru === f.gorevTuru);
  if (f.durum) liste = liste.filter(k => k.durum === f.durum);

  if (aramaMetni) {
    const kucuk = aramaMetni.trim().toLowerCase();
    liste = liste.filter(k =>
      k.adSoyad.toLowerCase().includes(kucuk) ||
      k.belgeNo.toLowerCase().includes(kucuk) ||
      (k.sozlesmeNo || '').toLowerCase().includes(kucuk)
    );
  }

  return liste.sort((a, b) => (b.sozlesmeBaslangicTarihi || '').localeCompare(a.sozlesmeBaslangicTarihi || ''));
}

function hizmetSozlesmesiEkle(veriler) {
  const dogrulama = hizmetSozlesmesiDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const sozlesmeNo = hizmetSozlesmesiSonrakiNoUret(hizmetSozlesmeleriTumunuGetir());
  const yeniKayit = hizmetSozlesmesiKaydiOlustur(Object.assign({}, veriler, { sozlesmeNo }));
  hizmetSozlesmesiEkleRepo(yeniKayit);
  return { basarili: true, kayit: yeniKayit };
}

function hizmetSozlesmesiGuncelle(id, veriler) {
  const dogrulama = hizmetSozlesmesiDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const mevcut = hizmetSozlesmesiIdIleGetirRepo(id);
  const birlesik = Object.assign({}, mevcut, veriler, { id, sozlesmeNo: mevcut ? mevcut.sozlesmeNo : (veriler.sozlesmeNo || '') });
  const guncellenen = hizmetSozlesmesiGuncelleRepo(id, hizmetSozlesmesiKaydiOlustur(birlesik));
  return { basarili: true, kayit: guncellenen };
}

function hizmetSozlesmesiSil(id) {
  hizmetSozlesmesiSilRepo(id);
  return { basarili: true };
}

function hizmetSozlesmesiOzetiHesapla() {
  const liste = hizmetSozlesmeleriniGetir('', {});
  return {
    toplam: liste.length,
    aktif: liste.filter(k => k.durum === 'Aktif').length,
    yaklasiyor: liste.filter(k => k.durum === 'Yaklaşıyor').length,
    suresiGecti: liste.filter(k => k.durum === 'Süresi Geçti').length,
    gorevTuruneGore: HIZMET_GOREV_TURLERI.map(g => ({ gorevTuru: g, sayi: liste.filter(k => k.gorevTuru === g && k.durum !== 'Feshedildi').length }))
  };
}
