// Risk Değerlendirmesi iş kuralları: puan/düzey hesaplama, risk no üretimi,
// gecikme tespiti ve özet istatistikler.

function _bugun() {
  return new Date().toISOString().slice(0, 10);
}

// Ham kaydı, RP1/düzey/RP2/düzey2/azalma/görüntülenecek-durum ile zenginleştirir.
// Hesaplanan alanlar depoya YAZILMAZ; her okumada türetilir.
function _riskiZenginlestir(risk) {
  const yontem = risk.yontem === '5x5' ? '5x5' : 'Fine-Kinney';
  const rp1 = riskPuaniHesapla(risk.O, risk.F, risk.S, yontem);
  const duzey1 = riskDuzeyiGetir(rp1, yontem);
  // Fine-Kinney'de RP2 için O/F/Ş(2) gerekir; 5x5 Matris'te frekans boyutu olmadığından
  // yalnızca O/Ş(2) yeterlidir.
  const rp2Hesaplanabilir = yontem === '5x5' ? (risk.On && risk.Sn) : (risk.On && risk.Fn && risk.Sn);
  const rp2 = rp2Hesaplanabilir ? riskPuaniHesapla(risk.On, risk.Fn, risk.Sn, yontem) : null;
  const duzey2 = rp2 !== null ? riskDuzeyiGetir(rp2, yontem) : null;
  const gecikmisMi = riskGecikmisMi(risk, _bugun());

  return Object.assign({}, risk, {
    yontem,
    RP1: rp1,
    duzey1: duzey1.etiket,
    aksiyon1: duzey1.aksiyon,
    RP2: rp2,
    duzey2: duzey2 ? duzey2.etiket : null,
    azalma: rp2 !== null ? azalmaYuzdesiHesapla(rp1, rp2) : '',
    durumGoruntu: gecikmisMi ? 'Gecikmiş' : risk.durum
  });
}

// Bölüm seçim kutusu: kalıcı (elle eklenmiş, henüz riski olmayan) bölümlerle
// mevcut risk kayıtlarında geçen bölüm adlarını birleştirir. Bir bölümü
// kalıcı listeden silmek mevcut risk kayıtlarındaki bolum metnini SİLMEZ —
// o bölümde hâlâ risk varsa listede görünmeye devam eder (veri kaybı olmaz).
function bolumleriGetir() {
  const kalicilar = bolumleriTumunuGetir();
  const risklerdenGelenler = Array.from(new Set(riskTumunuGetir().map(r => r.bolum).filter(Boolean)));
  const adSeti = new Set(kalicilar.map(b => b.ad));
  risklerdenGelenler.forEach(ad => { if (!adSeti.has(ad)) { adSeti.add(ad); kalicilar.push({ id: '', ad }); } });
  return kalicilar.slice().sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
}

function bolumEkle(ad) {
  const temiz = (ad || '').trim();
  if (!temiz) return { basarili: false, hata: 'Bölüm adı boş olamaz.' };
  if (bolumleriGetir().some(b => b.ad.toLocaleLowerCase('tr-TR') === temiz.toLocaleLowerCase('tr-TR'))) {
    return { basarili: false, hata: 'Bu bölüm zaten var.' };
  }
  const yeni = bolumOlustur({ ad: temiz });
  bolumEkleRepo(yeni);
  return { basarili: true, bolum: yeni };
}

// Yalnızca kalıcı listeden çıkarır. "ad" ile silinir (risklerden türeyen
// bölümlerin kalıcı karşılığı olmayabilir, id'siz gösterilirler).
function bolumSil(ad) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  const kayit = bolumleriTumunuGetir().find(b => b.ad === ad);
  if (!kayit) return { basarili: false, hata: 'Bu bölüm kalıcı listede değil (risk kayıtlarından türemiş olabilir).' };
  bolumSilRepo(kayit.id);
  return { basarili: true };
}

function riskleriGetir(aramaMetni, filtreler) {
  const f = filtreler || {};
  let liste = riskTumunuGetir().map(_riskiZenginlestir);

  if (f.bolum) liste = liste.filter(r => r.bolum === f.bolum);
  if (f.durum) liste = liste.filter(r => r.durumGoruntu === f.durum);
  if (f.duzey) liste = liste.filter(r => r.duzey1 === f.duzey);

  if (aramaMetni) {
    const kucuk = aramaMetni.trim().toLowerCase();
    liste = liste.filter(r =>
      r.bolum.toLowerCase().includes(kucuk) ||
      r.yer.toLowerCase().includes(kucuk) ||
      r.faaliyet.toLowerCase().includes(kucuk) ||
      r.tehlike.toLowerCase().includes(kucuk) ||
      r.risk.toLowerCase().includes(kucuk) ||
      (r.riskNo || '').toLowerCase().includes(kucuk)
    );
  }

  return liste;
}

function riskEkle(veriler) {
  const dogrulama = riskDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const mevcutRiskler = riskTumunuGetir();
  const riskNo = sonrakiRiskNoUret(veriler.bolum, mevcutRiskler);
  const yeniRisk = riskKaydiOlustur(Object.assign({}, veriler, { riskNo }));
  riskEkleRepo(yeniRisk);
  return { basarili: true, risk: yeniRisk };
}

function riskGuncelle(id, veriler) {
  const dogrulama = riskDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const guncellenen = riskGuncelleRepo(id, {
    yontem: RISK_YONTEMLERI.includes(veriler.yontem) ? veriler.yontem : 'Fine-Kinney',
    bolum: veriler.bolum.trim(),
    yer: veriler.yer.trim(),
    faaliyet: veriler.faaliyet.trim(),
    tehlike: veriler.tehlike.trim(),
    risk: veriler.risk.trim(),
    onlem: (veriler.onlem || '').trim(),
    O: veriler.O,
    F: veriler.F,
    S: veriler.S,
    fotoOncesi: veriler.fotoOncesi || '',
    planlanan: (veriler.planlanan || '').trim(),
    On: veriler.On || '',
    Fn: veriler.Fn || '',
    Sn: veriler.Sn || '',
    fotoSonrasi: veriler.fotoSonrasi || '',
    sorumlu: (veriler.sorumlu || '').trim(),
    termin: veriler.termin || '',
    durum: veriler.durum || 'Açık',
    tespit: (veriler.tespit || '').trim()
  });
  return { basarili: true, risk: guncellenen };
}

function riskSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  riskSilRepo(id);
  return { basarili: true };
}

// ---- Şablonlar (sektöre göre hazır risk şablonları + kullanıcının kendi
// kaydettiği şablonlar) ----
// Hazır kütüphane (kaynak: 'hazir') herkese açıktır; kullanıcının kendi
// kaydettiği şablonlar (kaynak: 'kullanici') yalnızca sahipId'si eşleşen
// kullanıcıya görünür — böylece farklı platform müşterilerinin şablonları
// karışmaz, ama aynı kullanıcı yönettiği farklı firmalar arasında taşıyabilir
// (bkz. sablon-repository.js -- tenantAnahtar kullanmadan firma-bağımsız saklanır).
function riskSablonlariGetir(sektorFiltresi, konuFiltresi, yonetmelikFiltresi) {
  const kullanici = oturumdakiKullanici();
  const kendi = kullanici
    ? riskSablonlariTumunuGetir().filter(s => s.kaynak === 'kullanici' && s.sahipId === kullanici.id)
    : [];
  let tumu = HAZIR_RISK_SABLONLARI.concat(kendi);
  if (sektorFiltresi) tumu = tumu.filter(s => s.sektor === sektorFiltresi);
  if (konuFiltresi) tumu = tumu.filter(s => s.konu === konuFiltresi);
  if (yonetmelikFiltresi) tumu = tumu.filter(s => s.yonetmelik === yonetmelikFiltresi);
  return tumu;
}

function riskSablonKaydetKayittan(riskId) {
  const kullanici = oturumdakiKullanici();
  if (!kullanici) return { basarili: false, hata: 'Oturum bulunamadı.' };
  const risk = riskIdIleGetirRepo(riskId);
  if (!risk) return { basarili: false, hata: 'Risk kaydı bulunamadı.' };

  const aktifFirma = aktifFirmaGetir();
  const yeni = riskSablonuOlustur({
    kaynak: 'kullanici',
    sahipId: kullanici.id,
    sektor: aktifFirma ? aktifFirma.sektor : 'Diğer',
    faaliyet: risk.faaliyet,
    tehlike: risk.tehlike,
    risk: risk.risk,
    onlem: risk.onlem,
    yontem: risk.yontem,
    O: risk.O,
    F: risk.F,
    S: risk.S
  });
  riskSablonEkleRepo(yeni);
  return { basarili: true, sablon: yeni };
}

function riskSablonSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  const kullanici = oturumdakiKullanici();
  const sablon = riskSablonlariTumunuGetir().find(s => s.id === id);
  if (!sablon) return { basarili: false, hata: 'Şablon bulunamadı.' };
  if (sablon.kaynak !== 'kullanici' || !kullanici || sablon.sahipId !== kullanici.id) {
    return { basarili: false, hata: 'Bu şablonu silme yetkiniz yok (yalnızca kendi eklediğiniz şablonlar silinebilir).' };
  }
  riskSablonSilRepo(id);
  return { basarili: true };
}

// Seçilen şablonları verilen bölüm/yer altında yeni risk kayıtları olarak
// ekler; oluşturulan kayıtlar taslak niteliğindedir, kullanıcı O/F/Ş
// değerlerini ve metinleri "Düzenle" ile firmaya özgü hâle getirebilir.
function riskSablonlardanEkle(sablonIdleri, bolum, yer) {
  const temizBolum = (bolum || '').trim();
  if (!temizBolum) return { basarili: false, hata: 'Bölüm seçiniz.' };
  const temizYer = (yer || '').trim() || 'Genel';

  const tumSablonlar = riskSablonlariGetir();
  const secilenler = (sablonIdleri || []).map(id => tumSablonlar.find(s => s.id === id)).filter(Boolean);
  if (!secilenler.length) return { basarili: false, hata: 'En az bir şablon seçiniz.' };

  let eklenen = 0;
  const hatalar = [];
  secilenler.forEach(sablon => {
    const sonuc = riskEkle({
      yontem: sablon.yontem,
      bolum: temizBolum,
      yer: temizYer,
      faaliyet: sablon.faaliyet,
      tehlike: sablon.tehlike,
      risk: sablon.risk,
      onlem: sablon.onlem,
      O: sablon.O,
      F: sablon.F,
      S: sablon.S,
      planlanan: sablon.planlanan,
      On: sablon.On,
      Fn: sablon.Fn,
      Sn: sablon.Sn,
      durum: 'Açık'
    });
    if (sonuc.basarili) eklenen++;
    else hatalar.push(sablon.tehlike);
  });
  return { basarili: true, eklenen, basarisiz: hatalar.length, hatalar };
}

// ---- JSON yedekleme / taşıma ----
// fotoOncesi/fotoSonrasi kayıtta "fotoref:<id>" gibi ayrı bir Firestore
// belgesine işaret eden bir referans olabilir; JSON taşınabilir/kendi
// kendine yeterli olsun diye dışa aktarırken gerçek görsel veriye çözülür.
async function riskKayitlariniJsonaAktar(aramaMetni, filtreler) {
  const kayitlar = riskleriGetir(aramaMetni, filtreler);
  const cozulmus = await Promise.all(kayitlar.map(async r => Object.assign({}, r, {
    fotoOncesi: await fotoBuyukCoz(r.fotoOncesi),
    fotoSonrasi: await fotoBuyukCoz(r.fotoSonrasi)
  })));
  return {
    schema: 'risk360-risk-degerlendirme@1',
    exportedAt: new Date().toISOString(),
    kayitlar: cozulmus
  };
}

// Var olan id'yle eşleşen kayıtlar (aynı dosyanın yanlışlıkla iki kez
// yüklenmesi gibi durumlarda) yinelenmiş sayılıp atlanır. Gömülü base64
// fotoğraflar tekrar sıkıştırılıp kendi ayrı belgesine ("fotoref:...") yazılır
// — kayıt dizisinin kendisi ham görsel veri taşımasın diye (Firestore ~1MB
// belge sınırı).
async function riskKayitlariniJsondanIceAktar(kayitlarHam) {
  const mevcutIdSeti = new Set(riskTumunuGetir().map(r => r.id));
  const hatalar = [];
  const yeniKayitlar = [];
  let yinelenenSayisi = 0;
  const firmaSlug = (aktifFirmaGetir() || {}).slug || '';

  for (let index = 0; index < (kayitlarHam || []).length; index++) {
    const veriler = kayitlarHam[index] || {};
    if (veriler.id && mevcutIdSeti.has(veriler.id)) { yinelenenSayisi++; continue; }
    const dogrulama = riskDogrula(veriler);
    if (!dogrulama.gecerli) {
      hatalar.push(`Kayıt ${index + 1}${veriler.riskNo ? ' (' + veriler.riskNo + ')' : ''}: ${Object.values(dogrulama.hatalar)[0]}`);
      continue;
    }
    const [fotoOncesi, fotoSonrasi] = await Promise.all([
      _riskFotoYenidenSaklaIhtiyacHalinde(veriler.fotoOncesi, firmaSlug),
      _riskFotoYenidenSaklaIhtiyacHalinde(veriler.fotoSonrasi, firmaSlug)
    ]);
    yeniKayitlar.push(riskKaydiOlustur(Object.assign({}, veriler, { fotoOncesi, fotoSonrasi })));
  }

  const yazimSonucu = await riskKayitlariTopluEkleRepo(yeniKayitlar);
  return {
    basarili: yazimSonucu.basarili ? yeniKayitlar.length : 0,
    basarisizSayisi: yazimSonucu.basarili ? hatalar.length : (yeniKayitlar.length + hatalar.length),
    hatalar: yazimSonucu.basarili ? hatalar : hatalar.concat(['Bulut yazımı başarısız oldu.']),
    yinelenenSayisi,
    bulutBasarili: yazimSonucu.basarili
  };
}

// Değer zaten "fotoref:..." (henüz çözülmemiş referans) ya da boşsa dokunmaz;
// gerçek base64 data URL ise (dışa aktarımdan geldiği için) kendi ayrı
// belgesine yazıp referansa çevirir.
async function _riskFotoYenidenSaklaIhtiyacHalinde(deger, firmaSlug) {
  if (!deger || deger.startsWith('fotoref:') || /^https?:\/\//i.test(deger)) return deger || '';
  return fotoBuyukKaydet(deger, firmaSlug);
}

function riskOzetiHesapla() {
  const liste = riskleriGetir('', {});
  const grupla = (secici) => {
    const sonuc = {};
    liste.forEach(r => {
      const anahtar = secici(r) || 'Belirsiz';
      sonuc[anahtar] = (sonuc[anahtar] || 0) + 1;
    });
    return sonuc;
  };

  return {
    toplam: liste.length,
    acik: liste.filter(r => r.durumGoruntu !== 'Kapalı' && r.durumGoruntu !== 'İptal').length,
    kapali: liste.filter(r => r.durum === 'Kapalı').length,
    gecikmis: liste.filter(r => r.durumGoruntu === 'Gecikmiş').length,
    onemliVeUstu: liste.filter(r => riskSeviyesiSirasi(r.duzey1) >= 4).length,
    toleransGosterilemez: liste.filter(r => riskSeviyesiSirasi(r.duzey1) >= 5).length,
    bolumeGore: grupla(r => r.bolum),
    duzeyeGore: grupla(r => r.duzey1),
    sorumluyaGore: grupla(r => r.sorumlu || 'Atanmamış'),
    // Farklı yöntemlerin ham RP değerleri kıyaslanamaz olduğundan önce ciddiyet
    // sırasına, eşitlikte kendi ölçeği içindeki göreli puana (RP/skala max) göre sıralanır.
    enYuksekRiskler: liste.slice().sort((a, b) => {
      const siraFarki = riskSeviyesiSirasi(b.duzey1) - riskSeviyesiSirasi(a.duzey1);
      if (siraFarki !== 0) return siraFarki;
      const goreliPuan = r => r.RP1 / (r.yontem === '5x5' ? 25 : 1000);
      return goreliPuan(b) - goreliPuan(a);
    }).slice(0, 10)
  };
}
