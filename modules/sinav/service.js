// Sınav iş kuralları: soru bankası yönetimi, sınavın soru bankasından rastgele
// seçimle oluşturulması ve sonuçların (puan -> geçti/kaldı) hesaplanması.
// Puan girişi kağıt üzerinde yapılan sınavın uzman tarafından değerlendirilip
// tek bir puan olarak sisteme girilmesi varsayımıyla tasarlandı (0-100).

function soruEkle(veriler) {
  const dogrulama = soruDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const yeniSoru = soruOlustur(veriler);
  soruEkleRepo(yeniSoru);
  return { basarili: true, soru: yeniSoru };
}

function soruGuncelle(id, veriler) {
  const dogrulama = soruDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const guncellenen = soruGuncelleRepo(id, {
    egitimTuruId: veriler.egitimTuruId,
    soruMetni: veriler.soruMetni.trim(),
    secenekler: {
      A: veriler.secenekler.A.trim(),
      B: veriler.secenekler.B.trim(),
      C: veriler.secenekler.C.trim(),
      D: veriler.secenekler.D.trim()
    },
    dogruCevap: veriler.dogruCevap
  });
  return { basarili: true, soru: guncellenen };
}

function soruSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  soruSilRepo(id);
  return { basarili: true };
}

function sorulariGetir(egitimTuruId, aramaMetni) {
  let liste = soruTumunuGetirRepo();
  if (egitimTuruId) {
    liste = liste.filter(s => s.egitimTuruId === egitimTuruId);
  }
  if (aramaMetni) {
    const kucuk = aramaMetni.trim().toLowerCase();
    liste = liste.filter(s => s.soruMetni.toLowerCase().includes(kucuk));
  }
  return liste
    .map(s => Object.assign({}, s, { turAdi: (egitimTuruGetir(s.egitimTuruId) || {}).ad || 'Bilinmeyen Konu' }))
    .sort((a, b) => b.olusturmaTarihi.localeCompare(a.olusturmaTarihi));
}

function soruBankasiKonuSayilari() {
  const tumu = soruTumunuGetirRepo();
  const harita = {};
  tumu.forEach(s => { harita[s.egitimTuruId] = (harita[s.egitimTuruId] || 0) + 1; });
  return harita;
}

function _karistir(liste) {
  const kopya = liste.slice();
  for (let i = kopya.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const gecici = kopya[i];
    kopya[i] = kopya[j];
    kopya[j] = gecici;
  }
  return kopya;
}

function sinavEkle(veriler) {
  const havuz = soruTumunuGetirRepo().filter(s => s.egitimTuruId === veriler.egitimTuruId);
  const dogrulama = sinavOlusturmaDogrula(veriler, havuz.length);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const soruSayisi = Number(veriler.soruSayisi);
  const secilenler = _karistir(havuz).slice(0, soruSayisi);

  const yeniSinav = sinavOlustur({
    baslik: veriler.baslik.trim(),
    egitimTuruId: veriler.egitimTuruId,
    tarih: veriler.tarih,
    gecmeNotu: veriler.gecmeNotu ? Number(veriler.gecmeNotu) : SINAV_GECME_NOTU_VARSAYILAN,
    sorular: secilenler.map(s => ({
      soruId: s.id,
      soruMetni: s.soruMetni,
      secenekler: s.secenekler,
      dogruCevap: s.dogruCevap
    }))
  });
  sinavEkleRepo(yeniSinav);
  return { basarili: true, sinav: yeniSinav };
}

function sinavSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  sinavSilRepo(id);
  return { basarili: true };
}

function _sinavZenginlestir(sinav) {
  const sonuclar = sonucTumunuGetirRepo().filter(r => r.sinavId === sinav.id);
  return Object.assign({}, sinav, {
    turAdi: (egitimTuruGetir(sinav.egitimTuruId) || {}).ad || 'Bilinmeyen Konu',
    katilimciSayisi: sonuclar.length,
    gecenSayisi: sonuclar.filter(r => r.puan >= sinav.gecmeNotu).length
  });
}

function sinavlariGetir(aramaMetni) {
  let liste = sinavTumunuGetirRepo().map(_sinavZenginlestir);
  if (aramaMetni) {
    const kucuk = aramaMetni.trim().toLowerCase();
    liste = liste.filter(s => s.baslik.toLowerCase().includes(kucuk) || s.turAdi.toLowerCase().includes(kucuk));
  }
  return liste.sort((a, b) => b.tarih.localeCompare(a.tarih));
}

function sinavGetir(id) {
  const sinav = sinavIdIleGetirRepo(id);
  return sinav ? _sinavZenginlestir(sinav) : null;
}

function sinavSonucuKaydet(sinavId, veriler) {
  const dogrulama = sinavSonucGirisDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const sinav = sinavIdIleGetirRepo(sinavId);
  if (!sinav) return { basarili: false, hatalar: { genel: 'Sınav bulunamadı.' } };

  const toplamSoru = sinav.sorular.length;
  const puan = Math.round(Number(veriler.puan));
  const dogruSayisi = toplamSoru ? Math.round((puan / 100) * toplamSoru) : 0;

  const yeniSonuc = sinavSonucuOlustur({
    sinavId,
    personelId: veriler.personelId,
    dogruSayisi,
    toplamSoru,
    puan,
    tarih: veriler.tarih || sinav.tarih
  });
  sonucEkleRepo(yeniSonuc);
  return { basarili: true, sonuc: yeniSonuc };
}

function sinavSonucSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  sonucSilRepo(id);
  return { basarili: true };
}

function sinavSonuclariniGetir(sinavId) {
  const sinav = sinavIdIleGetirRepo(sinavId);
  const gecmeNotu = sinav ? sinav.gecmeNotu : SINAV_GECME_NOTU_VARSAYILAN;

  return sonucTumunuGetirRepo()
    .filter(r => r.sinavId === sinavId)
    .map(r => {
      const personel = personelIdIleGetirRepo(r.personelId);
      return Object.assign({}, r, {
        personelAdi: personel ? personel.adSoyad : 'Silinmiş Personel',
        durum: r.puan >= gecmeNotu ? 'gecti' : 'kaldi'
      });
    })
    .sort((a, b) => b.puan - a.puan);
}

function tumSonuclariGetir(aramaMetni) {
  const sinavHaritasi = {};
  sinavTumunuGetirRepo().forEach(s => { sinavHaritasi[s.id] = s; });

  let liste = sonucTumunuGetirRepo().map(r => {
    const sinav = sinavHaritasi[r.sinavId];
    const personel = personelIdIleGetirRepo(r.personelId);
    return Object.assign({}, r, {
      sinavBasligi: sinav ? sinav.baslik : 'Silinmiş Sınav',
      personelAdi: personel ? personel.adSoyad : 'Silinmiş Personel',
      durum: sinav ? (r.puan >= sinav.gecmeNotu ? 'gecti' : 'kaldi') : 'bilinmiyor'
    });
  });

  if (aramaMetni) {
    const kucuk = aramaMetni.trim().toLowerCase();
    liste = liste.filter(r =>
      r.personelAdi.toLowerCase().includes(kucuk) ||
      r.sinavBasligi.toLowerCase().includes(kucuk)
    );
  }

  return liste.sort((a, b) => b.tarih.localeCompare(a.tarih));
}
