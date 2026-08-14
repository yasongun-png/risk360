// Eğitim iş kuralları: geçerlilik/bitiş tarihi hesaplama + durum tespiti.
// warnDays, eski üretim sistemindeki APP.warnDays değeriyle aynı (30 gün).

const EGITIM_UYARI_GUN = 30;

function _yilEkle(tarihStr, yil) {
  const tarih = new Date(tarihStr);
  tarih.setFullYear(tarih.getFullYear() + yil);
  return tarih.toISOString().split('T')[0];
}

// İki günlü eğitimlerde (örn. Temel İSG Eğitimi) geçerlilik süresi eğitimin
// TAMAMLANDIĞI (yani ikinci gün) tarihten başlar.
function egitimEfektifTarihi(kayit) {
  return (kayit.tarih2 && kayit.tarih2 > kayit.tarih) ? kayit.tarih2 : kayit.tarih;
}

function egitimBitisTarihiHesapla(kayit, tur, firma) {
  if (!tur) return null;
  // MYK belgelerinin çoğu belirli bir süre sonunda yenilenir, ama bazıları
  // (ör. "Sanayi Tipi Buhar Kazanı Yakma") SÜRESİZ düzenlenir; bu durumda
  // kayıttaki tarih bir bitiş değil, sadece düzenlenme/referans tarihidir.
  if (kayit.suresizMi) return null;
  if (!kayit.tarih) return null;

  if (tur.hesaplama === 'tek') return null;
  if (tur.hesaplama === 'dogrudan') return kayit.tarih;
  if (tur.hesaplama === 'sabit') return _yilEkle(egitimEfektifTarihi(kayit), tur.yil);
  if (tur.hesaplama === 'tehlikeSinifi') {
    const yil = (firma && TEMEL_ISG_YENILEME_YILI[firma.tehlikeSinifi]) || 1;
    return _yilEkle(egitimEfektifTarihi(kayit), yil);
  }
  return null;
}

function egitimDurumHesapla(tur, bitisTarihi, suresizMi) {
  if (suresizMi) return 'suresiz';
  if (tur && tur.hesaplama === 'tek') return 'suresiz';
  if (!bitisTarihi) return 'kayit_yok';

  const bugun = new Date();
  bugun.setHours(0, 0, 0, 0);
  const bitis = new Date(bitisTarihi);
  const farkGun = Math.round((bitis - bugun) / 86400000);

  if (farkGun < 0) return 'gecmis';
  if (farkGun <= EGITIM_UYARI_GUN) return 'yaklasiyor';
  return 'gecerli';
}

function _kayitZenginlestir(kayit, firma) {
  const tur = egitimTuruGetir(kayit.egitimTuruId);
  const personel = personelIdIleGetirRepo(kayit.personelId);
  const bitisTarihi = egitimBitisTarihiHesapla(kayit, tur, firma);

  return Object.assign({}, kayit, {
    turAdi: tur ? tur.ad : 'Bilinmeyen Tür',
    personelAdi: personel ? personel.adSoyad : 'Silinmiş Personel',
    personelIsveren: personel ? (personel.isveren || '') : '',
    bitisTarihi,
    durum: egitimDurumHesapla(tur, bitisTarihi, kayit.suresizMi)
  });
}

function egitimKayitlariniGetir(aramaMetni, firma) {
  const liste = egitimKayitlariTumunuGetir().map(k => _kayitZenginlestir(k, firma));
  if (!aramaMetni) return liste;

  const kucuk = aramaMetni.trim().toLowerCase();
  return liste.filter(k =>
    k.personelAdi.toLowerCase().includes(kucuk) ||
    k.turAdi.toLowerCase().includes(kucuk)
  );
}

function egitimKaydiEkle(veriler) {
  const dogrulama = egitimKaydiDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const yeniKayit = egitimKaydiOlustur(veriler);
  egitimKaydiEkleRepo(yeniKayit);
  return { basarili: true, kayit: yeniKayit };
}

function egitimKaydiGuncelle(id, veriler) {
  const dogrulama = egitimKaydiDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const guncellenen = egitimKaydiGuncelleRepo(id, {
    personelId: veriler.personelId,
    egitimTuruId: veriler.egitimTuruId,
    tarih: veriler.tarih,
    tarih2: veriler.tarih2 || '',
    saat: veriler.saat || '',
    aciklama: veriler.aciklama || '',
    suresizMi: !!veriler.suresizMi,
    guncellemeTarihi: new Date().toISOString()
  });
  if (!guncellenen) return { basarili: false, hatalar: { genel: 'Kayıt bulunamadı.' } };
  return { basarili: true, kayit: guncellenen };
}

function egitimKaydiSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  egitimKaydiSilRepo(id);
  return { basarili: true };
}

// Eski sistemden toplu içe aktarım için: N eğitim kaydını TEK bir bulut
// yazımıyla ekler. Aynı (personelId, egitimTuruId, tarih, aciklama) dörtlüsüne
// sahip bir kayıt zaten varsa (aynı dosyanın tekrar yüklenmesi gibi
// durumlarda) yinelenmiş sayılıp atlanır. Açıklama anahtara dahil edilir
// çünkü MYK belgelerinde aynı kişinin aynı tarihte BİRDEN FAZLA FARKLI
// belgesi olabilir (bkz. _eskiEgitimMatrisiIceAktar).
async function egitimKayitlariTopluEkle(verilerListesi) {
  const mevcut = egitimKayitlariTumunuGetir();
  const mevcutAnahtarSeti = new Set(mevcut.map(k => `${k.personelId}|${k.egitimTuruId}|${k.tarih}|${k.aciklama || ''}`));
  const hatalar = [];
  const yeniKayitlar = [];
  let yinelenenSayisi = 0;

  verilerListesi.forEach((veriler, index) => {
    const anahtar = `${veriler.personelId}|${veriler.egitimTuruId}|${veriler.tarih}|${veriler.aciklama || ''}`;
    if (mevcutAnahtarSeti.has(anahtar)) { yinelenenSayisi++; return; }
    const dogrulama = egitimKaydiDogrula(veriler);
    if (!dogrulama.gecerli) {
      hatalar.push(`Kayıt ${index + 1}: ${Object.values(dogrulama.hatalar)[0]}`);
      return;
    }
    mevcutAnahtarSeti.add(anahtar);
    yeniKayitlar.push(egitimKaydiOlustur(veriler));
  });

  const yazimSonucu = await egitimKayitlariTopluEkleRepo(yeniKayitlar);
  return {
    basarili: yazimSonucu.basarili ? yeniKayitlar.length : 0,
    basarisizSayisi: yazimSonucu.basarili ? hatalar.length : (yeniKayitlar.length + hatalar.length),
    hatalar: yazimSonucu.basarili ? hatalar : hatalar.concat(['Bulut yazımı başarısız oldu.']),
    yinelenenSayisi,
    bulutBasarili: yazimSonucu.basarili
  };
}

// Her aktif personel × her eğitim türü için en güncel kayda göre durum matrisi.
function egitimDurumTablosuOlustur(firma) {
  const personeller = personelleriGetir('', false);
  const tumKayitlar = egitimKayitlariTumunuGetir();

  return personeller.map(p => {
    const hucreler = egitimTurleriTumu().map(tur => {
      const kayitlar = tumKayitlar
        .filter(k => k.personelId === p.id && k.egitimTuruId === tur.id)
        .sort((a, b) => b.tarih.localeCompare(a.tarih));

      const sonKayit = kayitlar[0] || null;
      const bitisTarihi = sonKayit ? egitimBitisTarihiHesapla(sonKayit, tur, firma) : null;

      return {
        turId: tur.id,
        turAdi: tur.ad,
        sonTarih: sonKayit ? sonKayit.tarih : null,
        bitisTarihi,
        durum: sonKayit ? egitimDurumHesapla(tur, bitisTarihi, sonKayit.suresizMi) : 'kayit_yok'
      };
    });

    return { personelId: p.id, personelAdi: p.adSoyad, personelIsveren: p.isveren || '', hucreler };
  });
}

// ---- "İSG Eğitim ve MYK Raporu" (eski üretim uygulamasındaki rapor) ----

function _egitimTuruDurumu(personelId, turId, firma) {
  const tur = egitimTuruGetir(turId);
  const kayitlar = egitimKayitlariTumunuGetir()
    .filter(k => k.personelId === personelId && k.egitimTuruId === turId)
    .sort((a, b) => b.tarih.localeCompare(a.tarih));
  const sonKayit = kayitlar[0] || null;
  if (!sonKayit) return { varMi: false, tarihMetni: '', durum: 'kayit_yok' };

  const bitisTarihi = egitimBitisTarihiHesapla(sonKayit, tur, firma);
  const durum = egitimDurumHesapla(tur, bitisTarihi, sonKayit.suresizMi);
  return {
    varMi: durum === 'gecerli' || durum === 'yaklasiyor' || durum === 'suresiz',
    tarihMetni: bitisTarihi ? gunAyYil(bitisTarihi) : (sonKayit.tarih ? gunAyYil(sonKayit.tarih) : 'Süresiz'),
    durum
  };
}

function _mykBelgeleriGetir(personelId) {
  return egitimKayitlariTumunuGetir()
    .filter(k => k.personelId === personelId && k.egitimTuruId === 'myk')
    .sort((a, b) => (a.tarih || '').localeCompare(b.tarih || ''))
    .map(k => ({
      tarih: k.tarih,
      tarihMetni: k.suresizMi ? 'Süresiz' : (k.tarih ? gunAyYil(k.tarih) : '-'),
      aciklama: k.aciklama || ''
    }));
}

// İlkyardım Uygunluk Değerlendirmesi: eski isg platformundaki (bkz.
// app-data.js buildIlkyardimComplianceByGroup) tehlike sınıfına göre oran
// tablosuyla birebir aynı formül. Eski uygulamada "Grup" bazında (OSGB'nin
// birden fazla müşterisi bir arada) hesaplanıyordu; risk360'ta her firma zaten
// ayrı bir tenant olduğu için burada doğrudan AKTİF FİRMA için tek satır
// hesaplanır.
function _ilkyardimUygunlugunuHesapla(satirlar, firma) {
  const tehlike = (firma && firma.tehlikeSinifi) || '';
  const oran = ILKYARDIM_GEREKLI_ORAN[tehlike] || ILKYARDIM_VARSAYILAN_ORAN;
  const toplam = satirlar.length;
  const gerekli = Math.max(1, Math.ceil(toplam / oran));
  const mevcut = satirlar.filter(s => s.ilkyardim.varMi).length;
  const eksik = Math.max(0, gerekli - mevcut);
  return { tehlike: tehlike || 'Belirtilmemiş', oran, toplam, gerekli, mevcut, eksik, uygun: mevcut >= gerekli };
}

function egitimMykRaporuVerisiHazirla(firma) {
  const personeller = personelleriGetir('', false).slice().sort((a, b) => a.adSoyad.localeCompare(b.adSoyad, 'tr'));
  const buYil = new Date().getFullYear();

  const satirlar = personeller.map(p => ({
    personel: p,
    temelIsg: _egitimTuruDurumu(p.id, 'temel_isg', firma),
    yukseklik: _egitimTuruDurumu(p.id, 'yukseklik', firma),
    kapaliAlan: _egitimTuruDurumu(p.id, 'kapali_alan', firma),
    isIzni: _egitimTuruDurumu(p.id, 'is_izni', firma),
    ilkyardim: _egitimTuruDurumu(p.id, 'ilkyardim', firma),
    forklift: _egitimTuruDurumu(p.id, 'forklift', firma),
    isMakinasi: _egitimTuruDurumu(p.id, 'is_makinasi', firma),
    mykBelgeleri: _mykBelgeleriGetir(p.id),
    buYilIsbasiMi: (p.iseGirisTarihi || '').slice(0, 4) === String(buYil)
  }));

  return {
    satirlar,
    buYil,
    ilkyardimUygunluk: _ilkyardimUygunlugunuHesapla(satirlar, firma)
  };
}
