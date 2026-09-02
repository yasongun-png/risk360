// Sınav Oluşturucu — Eğitim modülünün kendi sekmesi (kullanıcı isteği: "sınav
// oluşturucu modülünü de eğitimin içine koyalım"). Eskiden ayrı
// modules/sinav/ modülüydü (zaten EGITIM_TURLERI'ye bağımlıydı — bkz.
// modules/egitim/model.js — bu taşıma o bağımlılığı da ortadan kaldırır).
// Veri modeli + depolama + servis katmanı burada (model.js + repository.js +
// service.js + validation.js birleştirilmiş hâli), DOM işlemleri sinav-ui.js'te.
// Tenant depolama anahtarları ('sinav_sorulari', 'sinav_sinavlar',
// 'sinav_sonuclari') AYNEN korunmuştur.

const SINAV_GECME_NOTU_VARSAYILAN = 70;
const SINAV_SIK_HARFLERI = ['A', 'B', 'C', 'D'];

function soruOlustur(veriler) {
  const secenekler = veriler.secenekler || {};
  return {
    id: veriler.id || rastgeleId(),
    egitimTuruId: veriler.egitimTuruId || '',
    soruMetni: (veriler.soruMetni || '').trim(),
    secenekler: {
      A: (secenekler.A || '').trim(),
      B: (secenekler.B || '').trim(),
      C: (secenekler.C || '').trim(),
      D: (secenekler.D || '').trim()
    },
    dogruCevap: veriler.dogruCevap || '',
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}

function sinavOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    baslik: (veriler.baslik || '').trim(),
    egitimTuruId: veriler.egitimTuruId || '',
    tarih: veriler.tarih || '',
    gecmeNotu: veriler.gecmeNotu || SINAV_GECME_NOTU_VARSAYILAN,
    sorular: veriler.sorular || [],
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}

function sinavSonucuOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    sinavId: veriler.sinavId || '',
    personelId: veriler.personelId || '',
    dogruSayisi: veriler.dogruSayisi != null ? veriler.dogruSayisi : 0,
    toplamSoru: veriler.toplamSoru != null ? veriler.toplamSoru : 0,
    puan: veriler.puan != null ? veriler.puan : 0,
    tarih: veriler.tarih || new Date().toISOString().split('T')[0],
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}

// ==================== DOĞRULAMA ====================
// Not: hata anahtarları (soruKonuId/sinavTarih/sonucPersonelId) ilgili HTML
// hata div id'leriyle birebir eşleşir — Eğitim modülünün KENDİ formundaki
// (egitimTuruId/tarih/personelId alanlı) hata div'leriyle çakışmaması için
// kasıtlı olarak farklı adlandırılmıştır (bkz. sinav-ui.js genel
// `alan + 'Hata'` çözümleme deseni).

function soruDogrula(veriler) {
  const hatalar = {};

  if (!veriler.egitimTuruId || !egitimTuruGetir(veriler.egitimTuruId)) {
    hatalar.soruKonuId = 'Geçerli bir eğitim/konu seçiniz.';
  }

  if (!veriler.soruMetni || !veriler.soruMetni.trim()) {
    hatalar.soruMetni = 'Soru metni zorunludur.';
  }

  const secenekler = veriler.secenekler || {};
  SINAV_SIK_HARFLERI.forEach(harf => {
    if (!secenekler[harf] || !secenekler[harf].trim()) {
      hatalar['secenek' + harf] = 'Bu şık boş bırakılamaz.';
    }
  });

  if (!SINAV_SIK_HARFLERI.includes(veriler.dogruCevap)) {
    hatalar.dogruCevap = 'Doğru cevap seçiniz.';
  }

  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}

function sinavOlusturmaDogrula(veriler, soruSayisiMevcut) {
  const hatalar = {};

  if (!veriler.baslik || !veriler.baslik.trim()) {
    hatalar.baslik = 'Sınav başlığı zorunludur.';
  }

  if (!veriler.egitimTuruId || !egitimTuruGetir(veriler.egitimTuruId)) {
    hatalar.sinavKonuId = 'Geçerli bir eğitim/konu seçiniz.';
  }

  if (!veriler.tarih) {
    hatalar.sinavTarih = 'Tarih zorunludur.';
  }

  const soruSayisi = Number(veriler.soruSayisi);
  if (!soruSayisi || soruSayisi < 1) {
    hatalar.soruSayisi = 'En az 1 soru seçilmelidir.';
  } else if (soruSayisi > soruSayisiMevcut) {
    hatalar.soruSayisi = `Soru bankasında bu konu için sadece ${soruSayisiMevcut} soru var.`;
  }

  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}

function sinavSonucGirisDogrula(veriler) {
  const hatalar = {};

  if (!veriler.personelId) {
    hatalar.sonucPersonelId = 'Personel seçimi zorunludur.';
  }

  const puan = Number(veriler.puan);
  if (veriler.puan === '' || veriler.puan == null || isNaN(puan) || puan < 0 || puan > 100) {
    hatalar.puan = 'Puan 0 ile 100 arasında olmalıdır.';
  }

  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}

// ==================== DEPOLAMA ====================

function _soruAnahtari() {
  return tenantAnahtar('sinav_sorulari');
}

function soruTumunuGetirRepo() {
  return oku(_soruAnahtari(), []);
}

function _soruKaydet(liste) {
  yaz(_soruAnahtari(), liste);
}

function soruEkleRepo(soru) {
  const liste = soruTumunuGetirRepo();
  liste.push(soru);
  _soruKaydet(liste);
  return soru;
}

function soruGuncelleRepo(id, veriler) {
  const liste = soruTumunuGetirRepo();
  const index = liste.findIndex(s => s.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], veriler);
  _soruKaydet(liste);
  return liste[index];
}

function soruSilRepo(id) {
  _soruKaydet(soruTumunuGetirRepo().filter(s => s.id !== id));
}

function soruIdIleGetirRepo(id) {
  return soruTumunuGetirRepo().find(s => s.id === id) || null;
}

function _sinavAnahtari() {
  return tenantAnahtar('sinav_sinavlar');
}

function sinavTumunuGetirRepo() {
  return oku(_sinavAnahtari(), []);
}

function _sinavKaydet(liste) {
  yaz(_sinavAnahtari(), liste);
}

function sinavEkleRepo(sinav) {
  const liste = sinavTumunuGetirRepo();
  liste.push(sinav);
  _sinavKaydet(liste);
  return sinav;
}

function sinavSilRepo(id) {
  _sinavKaydet(sinavTumunuGetirRepo().filter(s => s.id !== id));
  _sonucKaydet(sonucTumunuGetirRepo().filter(r => r.sinavId !== id));
}

function sinavIdIleGetirRepo(id) {
  return sinavTumunuGetirRepo().find(s => s.id === id) || null;
}

function _sonucAnahtari() {
  return tenantAnahtar('sinav_sonuclari');
}

function sonucTumunuGetirRepo() {
  return oku(_sonucAnahtari(), []);
}

function _sonucKaydet(liste) {
  yaz(_sonucAnahtari(), liste);
}

function sonucEkleRepo(sonuc) {
  const liste = sonucTumunuGetirRepo();
  liste.push(sonuc);
  _sonucKaydet(liste);
  return sonuc;
}

function sonucSilRepo(id) {
  _sonucKaydet(sonucTumunuGetirRepo().filter(r => r.id !== id));
}

// ==================== SERVİS ====================

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

function _sinavKaristir(liste) {
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
  const secilenler = _sinavKaristir(havuz).slice(0, soruSayisi);

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
