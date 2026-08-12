// Personel iş kuralları: doğrulama + depolamayı birleştiren tek giriş noktası.
// İşten çıkış tarihi girilen personel otomatik olarak arşive düşer; aktif
// listede görünmez (ayrı bir "arşivle" işlemi gerekmez).

function personelleriGetir(aramaMetni, arsivMi) {
  const tumu = personelTumunuGetir();
  const kapsam = tumu.filter(p => arsivMi ? !!p.istenCikisTarihi : !p.istenCikisTarihi);

  if (!aramaMetni) return kapsam;

  const kucuk = aramaMetni.trim().toLowerCase();
  return kapsam.filter(p =>
    p.adSoyad.toLowerCase().includes(kucuk) ||
    p.sicilNo.toLowerCase().includes(kucuk) ||
    p.bolum.toLowerCase().includes(kucuk) ||
    p.gorev.toLowerCase().includes(kucuk)
  );
}

function personelSayilari() {
  const tumu = personelTumunuGetir();
  return {
    aktif: tumu.filter(p => !p.istenCikisTarihi).length,
    arsiv: tumu.filter(p => !!p.istenCikisTarihi).length
  };
}

function personelEkle(veriler) {
  const mevcut = personelTumunuGetir();
  const dogrulama = personelDogrula(veriler, mevcut, null);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const yeniPersonel = personelOlustur(veriler);
  personelEkleRepo(yeniPersonel);
  return { basarili: true, personel: yeniPersonel };
}

// Eski sistemden toplu içe aktarım için: N personeli TEK bir bulut yazımıyla
// ekler (bkz. uygunsuzluk/kurul modüllerindeki aynı desen).
async function personelTopluEkle(verilerListesi) {
  const mevcut = personelTumunuGetir();
  const hatalar = [];
  const yeniKayitlar = [];
  const buTurdaGorulenSiciller = new Set();

  verilerListesi.forEach((veriler, index) => {
    if (buTurdaGorulenSiciller.has(veriler.sicilNo)) {
      hatalar.push(`Personel ${index + 1} (${veriler.sicilNo}): bu içe aktarımda tekrar ediyor.`);
      return;
    }
    const dogrulama = personelDogrula(veriler, mevcut.concat(yeniKayitlar), null);
    if (!dogrulama.gecerli) {
      hatalar.push(`Personel ${index + 1} (${veriler.sicilNo || '?'}): ${Object.values(dogrulama.hatalar)[0]}`);
      return;
    }
    buTurdaGorulenSiciller.add(veriler.sicilNo);
    yeniKayitlar.push(personelOlustur(veriler));
  });

  const yazimSonucu = await personelTopluEkleRepo(yeniKayitlar);
  return {
    basarili: yazimSonucu.basarili ? yeniKayitlar.length : 0,
    basarisizSayisi: yazimSonucu.basarili ? hatalar.length : (yeniKayitlar.length + hatalar.length),
    hatalar: yazimSonucu.basarili ? hatalar : hatalar.concat(['Bulut yazımı başarısız oldu.']),
    bulutBasarili: yazimSonucu.basarili,
    kayitlar: yazimSonucu.basarili ? yeniKayitlar : []
  };
}

function personelGuncelle(id, veriler) {
  const mevcut = personelTumunuGetir();
  const dogrulama = personelDogrula(veriler, mevcut, id);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const guncellenen = personelGuncelleRepo(id, {
    sicilNo: veriler.sicilNo.trim(),
    adSoyad: veriler.adSoyad.trim(),
    isveren: (veriler.isveren || '').trim(),
    bolum: veriler.bolum.trim(),
    gorev: veriler.gorev.trim(),
    pozisyonId: veriler.pozisyonId || '',
    iseGirisTarihi: veriler.iseGirisTarihi,
    istenCikisTarihi: veriler.istenCikisTarihi || '',
    egitimSeviyesi: veriler.egitimSeviyesi || '',
    okulu: (veriler.okulu || '').trim(),
    engelliMi: veriler.engelliMi || 'HAYIR',
    sendikaliMi: veriler.sendikaliMi || 'HAYIR',
    mv: (veriler.mv || '').trim(),
    kapsami: (veriler.kapsami || '').trim(),
    kidemYil: veriler.kidemYil === '' || veriler.kidemYil == null ? null : Number(veriler.kidemYil),
    lojman: veriler.lojman || 'YOK'
  });
  return { basarili: true, personel: guncellenen };
}

function personelSil(id) {
  personelSilRepo(id);
  return { basarili: true };
}
