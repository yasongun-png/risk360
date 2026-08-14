// İş İzni iş kuralları: yaşam döngüsü (Taslak → Onay → Aktif → Kapalı) ve özet.

function _izinZenginlestir(izin) {
  return Object.assign({}, izin, {
    durumGoruntu: izinDurumuHesapla(izin, new Date().toISOString()),
    suresiSaat: izinSuresiSaatHesapla(izin.baslangic, izin.bitis),
    tamamlanmaOrani: izin.kontrolMaddeleri.length
      ? Math.round(100 * izin.kontrolMaddeleri.filter(m => m.isaretli).length / izin.kontrolMaddeleri.length)
      : 0
  });
}

function izinleriGetir(aramaMetni, filtreler) {
  const f = filtreler || {};
  let liste = izinTumunuGetir().filter(k => k.durum !== 'İptal').map(_izinZenginlestir);

  if (f.izinTuru) liste = liste.filter(k => k.izinTuru === f.izinTuru);
  if (f.durum) liste = liste.filter(k => k.durumGoruntu === f.durum);
  if (f.riskSeviyesi) liste = liste.filter(k => k.riskSeviyesi === f.riskSeviyesi);

  if (aramaMetni) {
    const kucuk = aramaMetni.trim().toLowerCase();
    liste = liste.filter(k =>
      k.isTanimi.toLowerCase().includes(kucuk) ||
      (k.izinNo || '').toLowerCase().includes(kucuk) ||
      (k.bolum || '').toLowerCase().includes(kucuk) ||
      (k.lokasyon || '').toLowerCase().includes(kucuk)
    );
  }

  return liste.sort((a, b) => (b.baslangic || '').localeCompare(a.baslangic || ''));
}

function izinEkle(veriler) {
  const dogrulama = izinDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const izinNo = izinSonrakiNoUret(izinTumunuGetir());
  const yeniKayit = izinOlustur(Object.assign({}, veriler, { izinNo }));
  izinEkleRepo(yeniKayit);
  return { basarili: true, kayit: yeniKayit };
}

function izinGuncelle(id, veriler) {
  const dogrulama = izinDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const guncellenen = izinGuncelleRepo(id, {
    izinTuru: veriler.izinTuru,
    isTanimi: veriler.isTanimi.trim(),
    aciklama: (veriler.aciklama || '').trim(),
    bolum: veriler.bolum.trim(),
    lokasyon: veriler.lokasyon.trim(),
    yuklenici: (veriler.yuklenici || '').trim(),
    talepEden: veriler.talepEden.trim(),
    sahaSorumlusu: veriler.sahaSorumlusu.trim(),
    calisanlar: Array.isArray(veriler.calisanlar) ? veriler.calisanlar : String(veriler.calisanlar || '').split(/[;,\n|]+/).map(s => s.trim()).filter(Boolean),
    gerekliKkd: Array.isArray(veriler.gerekliKkd) ? veriler.gerekliKkd : String(veriler.gerekliKkd || '').split(/[;,\n|]+/).map(s => s.trim()).filter(Boolean),
    riskSeviyesi: veriler.riskSeviyesi || 'Orta',
    baslangic: veriler.baslangic,
    bitis: veriler.bitis,
    kontrolMaddeleri: veriler.kontrolMaddeleri,
    gazOlcumu: veriler.gazOlcumu,
    izolasyon: veriler.izolasyon,
    notlar: (veriler.notlar || '').trim()
    // onayDurumu ve durum burada KASITLI OLARAK güncellenmiyor: genel
    // düzenleme formundan doğrudan "Onaylandı"/"Aktif" yazılarak onay adımı
    // atlanamasın diye, bu iki alan yalnızca izinOnayVer/izinReddet/
    // izinAktifEt/izinDurdur/izinKapat üzerinden değişir.
  });
  if (!guncellenen) return { basarili: false, hata: 'Kayıt bulunamadı.' };
  return { basarili: true, kayit: guncellenen };
}

function izinSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  izinSilRepo(id);
  return { basarili: true };
}

function _izinOnayDurumunuYenidenHesapla(onaycilar) {
  if (!onaycilar.length) return 'Gerekmiyor';
  if (onaycilar.some(a => a.durum === 'Reddedildi')) return 'Reddedildi';
  if (onaycilar.every(a => a.durum === 'Onaylandı')) return 'Onaylandı';
  return 'Bekliyor';
}

// Onay akışı, sırasız bir onaycı listesi üzerinden ilerler (eski uygulamadaki
// gibi) — her "Onay Ver" tıklaması listeye yeni, zaten karar verilmiş bir
// onaycı satırı ekler. Tümü Onaylandı ise genel onayDurumu Onaylandı'ya,
// herhangi biri Reddedildi ise Reddedildi'ye döner.
// Onaylayan kimliği artık serbest metinle (prompt) değil, oturum açmış
// kullanıcıdan alınır — aksi halde herhangi biri devtools/konsoldan veya
// prompt kutusuna istediği bir adı yazarak onayı sahteleyebilirdi.
function izinOnayVer(id, rol) {
  const izin = izinIdIleGetirRepo(id);
  if (!izin) return { basarili: false, hata: 'Kayıt bulunamadı.' };
  const kullanici = oturumdakiKullanici();
  if (!kullanici) return { basarili: false, hata: 'Oturum bulunamadı.' };
  const yeniOnayci = Object.assign(onayciOlustur({ ad: kullanici.adSoyad, rol, durum: 'Onaylandı' }), { onayTarihi: new Date().toISOString() });
  const onaycilar = izin.onaycilar.concat([yeniOnayci]);
  const onayDurumu = _izinOnayDurumunuYenidenHesapla(onaycilar);
  const durum = onayDurumu === 'Onaylandı' ? 'Onaylandı' : izin.durum;
  return { basarili: true, kayit: izinGuncelleRepo(id, { onaycilar, onayDurumu, durum }) };
}

function izinReddet(id, rol, sebep) {
  const izin = izinIdIleGetirRepo(id);
  if (!izin) return { basarili: false, hata: 'Kayıt bulunamadı.' };
  const kullanici = oturumdakiKullanici();
  if (!kullanici) return { basarili: false, hata: 'Oturum bulunamadı.' };
  const yeniOnayci = Object.assign(onayciOlustur({ ad: kullanici.adSoyad, rol, durum: 'Reddedildi', not: sebep }), { onayTarihi: new Date().toISOString() });
  const onaycilar = izin.onaycilar.concat([yeniOnayci]);
  return { basarili: true, kayit: izinGuncelleRepo(id, { onaycilar, onayDurumu: 'Reddedildi', durum: 'Reddedildi' }) };
}

function izinAktifEt(id) {
  const izin = izinIdIleGetirRepo(id);
  if (!izin) return { basarili: false, hata: 'Kayıt bulunamadı.' };
  if (!['Onaylandı', 'Gerekmiyor'].includes(izin.onayDurumu)) return { basarili: false, hata: 'Onay tamamlanmadan izin aktifleştirilemez.' };
  const guncellenen = izinGuncelleRepo(id, { durum: 'Aktif' });
  return { basarili: true, kayit: guncellenen };
}

function izinDurdur(id) {
  const guncellenen = izinGuncelleRepo(id, { durum: 'Durduruldu' });
  if (!guncellenen) return { basarili: false, hata: 'Kayıt bulunamadı.' };
  return { basarili: true, kayit: guncellenen };
}

function izinKapat(id, kapanisNotu) {
  const guncellenen = izinGuncelleRepo(id, {
    durum: 'Kapalı',
    kapanisTarihi: new Date().toISOString(),
    kapanisNotu: (kapanisNotu || 'İş güvenli şekilde tamamlandı.').trim()
  });
  if (!guncellenen) return { basarili: false, hata: 'Kayıt bulunamadı.' };
  return { basarili: true, kayit: guncellenen };
}

function izinOzetiHesapla() {
  const liste = izinleriGetir('', {});
  const acikDurumlar = ['Taslak', 'Onay Bekliyor', 'Onaylandı', 'Aktif', 'Durduruldu'];
  const dortSaatSonra = new Date(Date.now() + 4 * 3600000).toISOString();

  return {
    toplam: liste.length,
    acik: liste.filter(k => acikDurumlar.includes(k.durumGoruntu)).length,
    onayBekleyen: liste.filter(k => k.durumGoruntu === 'Onay Bekliyor').length,
    suresiGecen: liste.filter(k => k.durumGoruntu === 'Süresi Geçti').length,
    yuksekVeUstuRisk: liste.filter(k => acikDurumlar.includes(k.durumGoruntu) && (k.riskSeviyesi === 'Yüksek' || k.riskSeviyesi === 'Kritik')).length,
    tamamlanmaUyarilari: liste.filter(k => acikDurumlar.includes(k.durumGoruntu) && k.tamamlanmaOrani < 80).slice(0, 10),
    yakindaBitecekler: liste.filter(k => k.durum === 'Aktif' && k.bitis && k.bitis <= dortSaatSonra && k.bitis >= new Date().toISOString()).slice(0, 10),
    kritikAcikListesi: liste.filter(k => acikDurumlar.includes(k.durumGoruntu) && k.riskSeviyesi === 'Kritik').slice(0, 10)
  };
}
