// Personel iş kuralları: doğrulama + depolamayı birleştiren tek giriş noktası.
// İşten çıkış tarihi girilen personel otomatik olarak arşive düşer; aktif
// listede görünmez (ayrı bir "arşivle" işlemi gerekmez).

// Kullanıcı isteği: "personel modülünde filtreleme ve sütuna göre sıralama
// ekleyelim" — bolum parametresi opsiyonel Bölüm filtresi (bkz. ui.js
// bolumFiltre); sütuna göre sıralama render aşamasında (ui.js tabloyuCiz)
// ayrıca uygulanır, burada sadece arama+bölüm filtrelemesi yapılır.
function personelleriGetir(aramaMetni, arsivMi, bolum) {
  const tumu = personelTumunuGetir();
  let kapsam = tumu.filter(p => arsivMi ? !!p.istenCikisTarihi : !p.istenCikisTarihi);

  if (bolum) kapsam = kapsam.filter(p => p.bolum === bolum);

  if (!aramaMetni) return kapsam;

  const kucuk = aramaMetni.trim().toLowerCase();
  return kapsam.filter(p =>
    p.adSoyad.toLowerCase().includes(kucuk) ||
    p.sicilNo.toLowerCase().includes(kucuk) ||
    p.bolum.toLowerCase().includes(kucuk) ||
    p.gorev.toLowerCase().includes(kucuk)
  );
}

// Mevcut (aktif ya da arşiv) personellerdeki benzersiz Bölüm listesi —
// Bölüm filtresi dropdown'ını doldurmak için.
function personelBolumleriGetir(arsivMi) {
  const tumu = personelTumunuGetir().filter(p => arsivMi ? !!p.istenCikisTarihi : !p.istenCikisTarihi);
  return Array.from(new Set(tumu.map(p => (p.bolum || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'tr'));
}

// Kullanıcı isteği: "personel modülünün üst boşluğunda bu ay/bu yıl işe
// başlayan, bu ay/bu yıl işten ayrılan sayıları ve yıllık devir daim oranı
// görünsün" -- devir daim oranı = (dönem içinde ayrılan / dönemin ortalama
// aktif personel sayısı [dönem başı+dönem sonu ortalaması]) x 100. Arşivdeki
// (işten ayrılmış) personel de geçmiş tarihte aktif sayılabilmesi için dahil
// edilir (bkz. modules/raporlar/service.js raporDevirDaimOzeti — aynı desen,
// modüller arası script paylaşımı olmadığından burada tekrar yazılır).
function _prsAktifPersonelSayisi(tumu, tarihStr) {
  return tumu.filter(p => p.iseGirisTarihi && p.iseGirisTarihi <= tarihStr && (!p.istenCikisTarihi || p.istenCikisTarihi > tarihStr)).length;
}

function _prsDevirDaimOraniHesapla(tumu, basTarihi, sonTarihi, ayrilanSayisi) {
  const ortalama = (_prsAktifPersonelSayisi(tumu, basTarihi) + _prsAktifPersonelSayisi(tumu, sonTarihi)) / 2;
  return ortalama > 0 ? Math.round((ayrilanSayisi / ortalama) * 1000) / 10 : 0;
}

function personelDevirDaimIstatistikleri() {
  const tumu = personelTumunuGetir();
  const bugun = new Date();
  const yil = bugun.getFullYear();
  const bugunStr = bugun.toISOString().slice(0, 10);
  const yilBasi = `${yil}-01-01`;
  const ayBasi = `${yil}-${String(bugun.getMonth() + 1).padStart(2, '0')}-01`;

  const buAyIseBaslayan = tumu.filter(p => p.iseGirisTarihi >= ayBasi && p.iseGirisTarihi <= bugunStr).length;
  const buYilIseBaslayan = tumu.filter(p => p.iseGirisTarihi >= yilBasi && p.iseGirisTarihi <= bugunStr).length;
  const buAyAyrilan = tumu.filter(p => p.istenCikisTarihi && p.istenCikisTarihi >= ayBasi && p.istenCikisTarihi <= bugunStr).length;
  const buYilAyrilan = tumu.filter(p => p.istenCikisTarihi && p.istenCikisTarihi >= yilBasi && p.istenCikisTarihi <= bugunStr).length;

  return {
    buAyIseBaslayan,
    buYilIseBaslayan,
    buAyAyrilan,
    buYilAyrilan,
    yillikDevirDaimOrani: _prsDevirDaimOraniHesapla(tumu, yilBasi, bugunStr, buYilAyrilan)
  };
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
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  personelSilRepo(id);
  return { basarili: true };
}
