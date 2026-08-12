// Saha Denetim iş kuralları: denetim başlatma, kontrol maddesi güncelleme,
// puan hesaplama ve "Uygun Değil" bulguların Uygunsuzluk/DÖF modülüne aktarılması.
// Puan, yalnızca cevaplanmış maddeler (Uygun / Uygun Değil) üzerinden hesaplanır;
// "Uygulanamaz" maddeler ve henüz cevaplanmamış maddeler hesaba katılmaz.

function denetimBaslat(veriler) {
  const dogrulama = denetimBaslatDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const mevcutListe = denetimTumunuGetirRepo();
  const yeniDenetim = denetimOlustur({
    denetimNo: sonrakiDenetimNoUret(mevcutListe),
    denetimTuru: veriler.denetimTuru,
    tarih: veriler.tarih,
    denetci: veriler.denetci.trim(),
    bolum: veriler.bolum.trim(),
    lokasyon: (veriler.lokasyon || '').trim(),
    kontrolListesi: denetimKontrolListesiUret(veriler.denetimTuru)
  });
  denetimEkleRepo(yeniDenetim);
  return { basarili: true, denetim: yeniDenetim };
}

function denetimSil(id) {
  denetimSilRepo(id);
  return { basarili: true };
}

function denetimPuanHesapla(kontrolListesi) {
  const cevaplanan = (kontrolListesi || []).filter(m => m.sonuc === 'Uygun' || m.sonuc === 'Uygun Değil');
  if (cevaplanan.length === 0) return null;
  const uygunSayisi = cevaplanan.filter(m => m.sonuc === 'Uygun').length;
  return Math.round((uygunSayisi / cevaplanan.length) * 100);
}

function _denetimZenginlestir(denetim) {
  return Object.assign({}, denetim, {
    puan: denetimPuanHesapla(denetim.kontrolListesi),
    uygunsuzMaddeSayisi: denetim.kontrolListesi.filter(m => m.sonuc === 'Uygun Değil').length,
    durumMetni: denetim.tamamlandiMi ? 'Tamamlandı' : 'Devam Ediyor'
  });
}

function denetimleriGetir(aramaMetni, filtreler) {
  const f = filtreler || {};
  let liste = denetimTumunuGetirRepo().map(_denetimZenginlestir);

  if (f.denetimTuru) {
    liste = liste.filter(d => d.denetimTuru === f.denetimTuru);
  }
  if (f.tamamlandiMi === 'true' || f.tamamlandiMi === 'false') {
    const hedef = f.tamamlandiMi === 'true';
    liste = liste.filter(d => d.tamamlandiMi === hedef);
  }

  if (aramaMetni) {
    const kucuk = aramaMetni.trim().toLowerCase();
    liste = liste.filter(d =>
      d.denetimNo.toLowerCase().includes(kucuk) ||
      d.denetimTuru.toLowerCase().includes(kucuk) ||
      d.bolum.toLowerCase().includes(kucuk) ||
      d.denetci.toLowerCase().includes(kucuk)
    );
  }

  return liste.sort((a, b) => b.tarih.localeCompare(a.tarih));
}

function denetimGetir(id) {
  const denetim = denetimIdIleGetirRepo(id);
  return denetim ? _denetimZenginlestir(denetim) : null;
}

function denetimMaddeGuncelle(denetimId, maddeIndex, degisiklik) {
  const denetim = denetimIdIleGetirRepo(denetimId);
  if (!denetim) return { basarili: false };

  const kontrolListesi = denetim.kontrolListesi.slice();
  kontrolListesi[maddeIndex] = Object.assign({}, kontrolListesi[maddeIndex], degisiklik);
  const guncellenen = denetimGuncelleRepo(denetimId, { kontrolListesi });
  return { basarili: true, denetim: _denetimZenginlestir(guncellenen) };
}

function denetimNotGuncelle(id, notlar) {
  const guncellenen = denetimGuncelleRepo(id, { notlar: (notlar || '').trim() });
  return guncellenen ? { basarili: true, denetim: _denetimZenginlestir(guncellenen) } : { basarili: false };
}

function denetimTamamla(id) {
  const guncellenen = denetimGuncelleRepo(id, { tamamlandiMi: true });
  return guncellenen ? { basarili: true, denetim: _denetimZenginlestir(guncellenen) } : { basarili: false };
}

// "Uygun Değil" işaretlenen bir kontrol maddesini, mevcut Uygunsuzluk/DÖF
// modülüne (uygunsuzlukEkle) yeni bir kayıt olarak aktarır. Aktarılan madde
// tekrar aktarılamaz (aktarildiId ile işaretlenir).
function denetimBulgusunuUygunsuzlugaAktar(denetimId, maddeIndex, ekVeriler) {
  const denetim = denetimIdIleGetirRepo(denetimId);
  if (!denetim) return { basarili: false, hatalar: { genel: 'Denetim bulunamadı.' } };

  const madde = denetim.kontrolListesi[maddeIndex];
  if (!madde) return { basarili: false, hatalar: { genel: 'Kontrol maddesi bulunamadı.' } };
  if (madde.aktarildiId) return { basarili: false, hatalar: { genel: 'Bu madde zaten aktarılmış.' } };

  const sonuc = uygunsuzlukEkle({
    baslik: `${denetim.denetimNo} - ${madde.madde}`,
    aciklama: madde.not ? `${madde.madde} — ${madde.not}` : madde.madde,
    bolum: denetim.bolum,
    lokasyon: denetim.lokasyon,
    kaynakTuru: 'Saha Denetimi',
    riskSeviyesi: ekVeriler.riskSeviyesi || 'Orta',
    sorumlu: ekVeriler.sorumlu,
    atayan: denetim.denetci,
    bildirimTarihi: denetim.tarih,
    termin: ekVeriler.termin,
    onayGerekliMi: true
  });
  if (!sonuc.basarili) return sonuc;

  const kontrolListesi = denetim.kontrolListesi.slice();
  kontrolListesi[maddeIndex] = Object.assign({}, kontrolListesi[maddeIndex], { aktarildiId: sonuc.kayit.id });
  denetimGuncelleRepo(denetimId, { kontrolListesi });

  return { basarili: true, kayit: sonuc.kayit };
}
