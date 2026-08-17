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
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  hizmetSozlesmesiSilRepo(id);
  return { basarili: true };
}

// Kullanıcı isteği: "hizmet sözleşmeleri tarafına birebir bu excel
// çıktısını verecek altyapı hazırla" — firmaId'si dolu (ve feshedilmemiş)
// her kayıt, hizmet verdiği firmanın altında görev türüne göre gruplanır;
// "Atanan dk/ay" o gruptaki ayrilanDakika toplamıdır. "Gerekli dk/ay" ve
// "Uygunluk", firmanın tehlikeSinifi + sicilBilgileri.personelSayisi
// kullanılarak hizmetSozlesmesiGerekliDakikaHesapla ile YENİDEN hesaplanır
// (Excel'den asla doğrudan alınmaz — bkz. modules/hizmet-sozlesmesi/ui.js
// içe aktarma, sadece ham atama verisini alır).
function hizmetSozlesmesiSicilOzetiHesapla() {
  const zengin = hizmetSozlesmeleriniGetir('', {}).filter(k => k.firmaId);

  const firmaGrubu = {};
  zengin.forEach(k => {
    if (k.durum === 'Feshedildi') return;
    if (!firmaGrubu[k.firmaId]) firmaGrubu[k.firmaId] = {};
    if (!firmaGrubu[k.firmaId][k.gorevTuru]) firmaGrubu[k.firmaId][k.gorevTuru] = [];
    firmaGrubu[k.firmaId][k.gorevTuru].push(k);
  });

  return getFirmalar().filter(f => firmaGrubu[f.id]).map(firma => {
    const sicil = firma.sicilBilgileri || { sicilNo: '', iseverenVekili: '', personelSayisi: 0 };
    const gorevOzetleri = HIZMET_GOREV_TURLERI.map(gorevTuru => {
      const gorevliler = (firmaGrubu[firma.id][gorevTuru]) || [];
      const atananDakika = gorevliler.reduce((toplam, g) => toplam + (g.ayrilanDakika || 0), 0);
      const hesap = hizmetSozlesmesiGerekliDakikaHesapla(gorevTuru, firma.tehlikeSinifi, sicil.personelSayisi);
      return Object.assign({ gorevTuru, gorevliler, atananDakika, uygunMu: hesap.kapsamDisiMi || atananDakika >= hesap.gerekliDakika }, hesap);
    });
    return {
      firma,
      sicilNo: sicil.sicilNo,
      iseverenVekili: sicil.iseverenVekili,
      personelSayisi: sicil.personelSayisi,
      tehlikeSinifi: firma.tehlikeSinifi,
      gorevOzetleri,
      tumuUygunMu: gorevOzetleri.every(g => g.uygunMu)
    };
  });
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
