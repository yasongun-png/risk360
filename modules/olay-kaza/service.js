// Olay/Kaza iş kuralları.

function _olayZenginlestir(kayit) {
  return Object.assign({}, kayit, { fkRP: fineKinneyPuaniHesapla(kayit) });
}

function olayKayitlariniGetir(aramaMetni, filtreler) {
  const f = filtreler || {};
  let liste = olayKayitlariTumunuGetir().map(_olayZenginlestir);

  if (f.olayTipi) liste = liste.filter(k => k.olayTipi === f.olayTipi);
  if (f.durum) liste = liste.filter(k => k.durum === f.durum);
  if (f.bolum) liste = liste.filter(k => k.bolum === f.bolum);

  if (aramaMetni) {
    const kucuk = aramaMetni.trim().toLowerCase();
    liste = liste.filter(k =>
      k.adSoyad.toLowerCase().includes(kucuk) ||
      k.bolum.toLowerCase().includes(kucuk) ||
      k.aciklama.toLowerCase().includes(kucuk) ||
      (k.kayitNo || '').toLowerCase().includes(kucuk)
    );
  }

  return liste.sort((a, b) => (b.kazaTarihi || '').localeCompare(a.kazaTarihi || ''));
}

// Aynı kullanıcının yönettiği DİĞER firmalardaki aktif (arşivlenmemiş)
// personeli toplar; her kayıt kaynağı firmayla (_firmaId/_firmaAdi) etiketlenir
// — kullanıcı isteği: "olay kaza modülüne diğer firmalardan da personel
// çekebilmek istiyorum". ASENKRONDUR: bulut (Firebase) gerçekten bağlıyken
// başka bir firmanın personel verisi hafızada (_bulutOnbellek) hiç
// bulunmayabilir — çünkü sadece AKTİF firma dinlenir (bkz. core/data.js
// bulutFirmaHazirOlduğunda). Bu yüzden düz oku() değil, tek seferlik gerçek
// okuma yapan buyukVeriFirmadanOku kullanılır.
async function digerFirmalardanPersonelleriGetir() {
  const aktifFirma = aktifFirmaGetir();
  const digerFirmalar = getFirmalar().filter(f => !aktifFirma || f.id !== aktifFirma.id);
  const listeler = await Promise.all(digerFirmalar.map(async f => {
    // Salt-okunur bir seçim listesi doldurma senaryosu — bir firmanın verisi
    // okunamazsa (ör. geçici ağ hatası) o firma sessizce atlanır, tüm işlemi
    // başarısız kılmaz (yazma tarafındaki gibi bir üzerine-yazma riski yok).
    try {
      const liste = await buyukVeriFirmadanOku(tenantAnahtarFirma(f.id, 'personel'), []);
      return liste.filter(p => !p.istenCikisTarihi).map(p => Object.assign({}, p, { _firmaId: f.id, _firmaAdi: f.ad }));
    } catch (e) {
      console.error('Diğer firmanın personeli okunamadı, atlanıyor:', f.ad, e);
      return [];
    }
  }));
  return listeler.flat();
}

// Personel başka bir firmadan seçildiyse, aynı kaydın bir kopyasını o
// firmanın kendi Olay/Kaza listesine de işler (kullanıcı isteği: "eğer başka
// bir firmadan çekip kayıt oluşturduysam yaptığım kaydın aynısı o firmaya da
// işlensin") — böylece olay hem gerçekleştiği firmada hem personelin asıl
// firmasında görünür. kayitNo, hedef firmanın KENDİ sırasına göre yeniden
// üretilir (aynen kopyalanırsa iki firmanın numaralandırması çakışabilir);
// id de yeni ve bağımsızdır. Bilerek arka planda (fire-and-forget) çalışır —
// olayKaydiEkle'nin geri dönüşünü bu ikincil kopyalamanın (özellikle ağ
// gecikmesi/çevrimdışılık durumunda yavaş kalabilecek) tamamlanmasına
// bağlamak, kullanıcının asıl kaydı kaydederken arayüzün "takılmış" gibi
// görünmesine yol açardı. SADECE oluşturma anında yapılır, sonraki
// düzenlemeler diğer firmadaki kopyaya yansımaz (kapsam kasıtlı sınırlı).
//
// KRİTİK: hedef firmanın mevcut listesi düz oku() ile DEĞİL,
// buyukVeriFirmadanOku ile okunur — bulut aktifken düz oku() aktif olmayan
// bir firmanın verisini hiç çekmemiş olabileceğinden yanlışlıkla boş sanılıp
// üzerine yazılırsa o firmanın TÜM olay/kaza geçmişi silinirdi. Okuma
// başarısız olursa kopyalama sessizce atlanır (asıl kayıt etkilenmez).
async function _kaydiDigerFirmayaKopyala(personelFirmaId, yeniKayit) {
  const hedefFirma = getFirmaById(personelFirmaId);
  const digerAnahtar = tenantAnahtarFirma(personelFirmaId, 'olay_kaza_kayitlari');
  if (!digerAnahtar || !hedefFirma) return;
  try {
    const digerListe = await buyukVeriFirmadanOku(digerAnahtar, []);
    const digerKayitNo = sonrakiKayitNoUret(digerListe);
    digerListe.push(Object.assign({}, yeniKayit, { id: rastgeleId(), kayitNo: digerKayitNo }));
    // yaz() DEĞİL: yaz(), büyük veriyi HER ZAMAN o an aktif olan firmanın
    // slug'ıyla (_bulutFirmaSlugu) etiketleyerek Firestore'a yazar — burada
    // hedef, aktif firmadan FARKLI bir firma olduğu için düz yaz() kullanılırsa
    // belge yanlış firma etiketiyle kaydedilir ve o firma kendi listesini
    // dinlerken (bkz. bulutFirmaHazirOlduğunda -> .where('firma','==',...))
    // bu belgeyi HİÇ BULAMAZ. buyukVeriFirmayaYaz doğru firmaSlug'ı açıkça alır.
    buyukVeriFirmayaYaz(digerAnahtar, digerListe, hedefFirma.slug);
  } catch (e) {
    console.error('Kayıt diğer firmaya kopyalanamadı (mevcut veri okunamadı):', e);
  }
}

// Bir DÖF/Uygunsuzluk (aksiyon) satırı gerçek Uygunsuzluk modülüne otomatik
// işlenir — kullanıcı isteği: "döf yerine uygunsuzluk diyelim, uygunsuzluk
// açarsam uygunsuzluk modülüne de yazsın otomatik olarak" + "uygunsuzluktaki
// ile uyumlu olacak". Uygunsuzluk modülü zaten kaynakTuru seçeneklerinde
// "İş Kazası"nı barındırıyordu (bkz. modules/uygunsuzluk/model.js
// KAYNAK_TURLERI) ama hiçbir modül bunu otomatik tetiklemiyordu — bu ilk
// gerçek entegrasyon. Aynı firma içinde (cross-firma değil) olduğu için
// düz uygunsuzlukEkle() yeterlidir, buyukVeriFirmadanOku gerekmez.
// Döner: başarısız olan (sessizce kaybolmaması gereken) aksiyon aktarımlarını
// açıklayan uyarı metinleri dizisi — çağıran, bunu kullanıcıya göstermelidir.
function _aksiyonlariUygunsuzluguYaz(aksiyonlar, olayKaydi) {
  if (typeof uygunsuzlukEkle !== 'function' || !Array.isArray(aksiyonlar) || !aksiyonlar.length) return [];
  const fkRP = fineKinneyPuaniHesapla(olayKaydi);
  const riskSeviyesi = fkRP == null ? 'Orta' : fkRP < 20 ? 'Düşük' : fkRP < 70 ? 'Orta' : fkRP < 200 ? 'Yüksek' : 'Çok Yüksek';

  const uyarilar = [];
  aksiyonlar.forEach(a => {
    if (!a.baslik && !a.duzelticiFaaliyet) return;
    const sonuc = uygunsuzlukEkle({
      baslik: a.baslik || a.duzelticiFaaliyet,
      aciklama: [a.duzelticiFaaliyet, olayKaydi.kayitNo ? ('Kaynak: Olay/Kaza ' + olayKaydi.kayitNo) : ''].filter(Boolean).join(' — '),
      bolum: olayKaydi.bolum,
      lokasyon: olayKaydi.kazaYeri,
      kaynakTuru: 'İş Kazası',
      riskSeviyesi,
      kokNeden: olayKaydi.analizNeden || '',
      duzelticiFaaliyet: a.duzelticiFaaliyet,
      sorumlu: a.sorumlu,
      termin: a.termin,
      yasalDayanak: olayKaydi.ilgiliMevzuat || ''
    });
    if (!sonuc || !sonuc.basarili) {
      uyarilar.push('"' + (a.baslik || a.duzelticiFaaliyet) + '" aksiyonu Uygunsuzluk kaydına işlenemedi.');
    }
  });
  return uyarilar;
}

// Olayın kendisi, Risk Değerlendirmesi modülüne "İş Kazaları" sabit bölümü
// altında bir risk kaydı olarak da işlenir — kullanıcı isteği: "kazayı risk
// analizine de eklesin, iş kazaları diye bir bölüm altında". Fine-Kinney her
// iki modülde de aynı ölçeği kullandığından (bkz. ../risk/model.js), kaza
// kaydında O/F/Ş girilmişse doğrudan aktarılır; girilmemişse olay tipine göre
// makul bir varsayılan şiddet ile (olasılık/frekans "gerçekleşmiş tek olay"
// için ölçülü bir taban değerle) kaba bir başlangıç puanı üretilir — kesin
// değer değil, kullanıcı Risk Değerlendirmesi'nde düzenleyebilir.
function _olayTipineGoreVarsayilanSiddet(olayTipi) {
  const harita = {
    'Ramak Kala': 1, 'İlk Yardım': 3, 'Tıbbi Tedavi': 7, 'Maddi Hasar': 7,
    'Kayıp Gün (LTI)': 15, 'Kısıtlı İş / Transfer (DART)': 15, 'Çevresel Olay': 15,
    'Ölüm': 100
  };
  return harita[olayTipi] || 7;
}

// Döner: başarısızsa kullanıcıya gösterilecek bir uyarı metni, başarılıysa null.
function _kaydiRiskeYaz(olayKaydi) {
  if (typeof riskEkle !== 'function') return null;
  const o = olayKaydi.fkO || 3;
  const f = olayKaydi.fkF || 1;
  const s = olayKaydi.fkS || _olayTipineGoreVarsayilanSiddet(olayKaydi.olayTipi);

  const sonuc = riskEkle({
    yontem: 'Fine-Kinney',
    bolum: 'İş Kazaları',
    yer: olayKaydi.kazaYeri,
    // isTanimi (Yapılan İş) olay/kaza formunda opsiyoneldir ama risk
    // modülünde "faaliyet" zorunludur — boşsa olayKaydiDogrula'nın zaten
    // garanti ettiği (dolu olmak zorunda) aciklama alanına düşülür ki
    // validation her zaman geçsin.
    faaliyet: olayKaydi.isTanimi || olayKaydi.aciklama.slice(0, 80),
    tehlike: olayKaydi.tehlikeliMadde || olayKaydi.olayTipi,
    risk: [olayKaydi.yaralanmaTuru, olayKaydi.yaralananUzuv].filter(Boolean).join(' - ') || olayKaydi.aciklama,
    onlem: (olayKaydi.aksiyonlar || []).map(a => a.duzelticiFaaliyet).filter(Boolean).join('; '),
    O: o, F: f, S: s,
    sorumlu: olayKaydi.hazirlayanAdi,
    tespit: olayKaydi.hazirlayanAdi,
    durum: 'Açık'
  });
  return (sonuc && sonuc.basarili) ? null : 'Kayıt Risk Değerlendirmesi modülüne işlenemedi.';
}

function olayKaydiEkle(veriler) {
  const dogrulama = olayKaydiDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const kayitNo = (veriler.kayitNo || '').trim() || sonrakiKayitNoUret(olayKayitlariTumunuGetir());
  const yeniKayit = olayKaydiOlustur(Object.assign({}, veriler, { kayitNo }));
  olayKaydiEkleRepo(yeniKayit);

  const aktifFirma = aktifFirmaGetir();
  if (veriler.personelFirmaId && (!aktifFirma || veriler.personelFirmaId !== aktifFirma.id)) {
    _kaydiDigerFirmayaKopyala(veriler.personelFirmaId, yeniKayit);
  }

  // Bu iki aktarım (Uygunsuzluk/DÖF ve Risk Değerlendirmesi) başarısız olursa
  // artık sessizce kaybolmaz — uyarı olarak sonuçta döner, çağıran (ui.js)
  // kullanıcıyı bilgilendirir; asıl olay/kaza kaydı yine de kaydedilmiş sayılır.
  const uyarilar = _aksiyonlariUygunsuzluguYaz(yeniKayit.aksiyonlar, yeniKayit);
  const riskUyarisi = _kaydiRiskeYaz(yeniKayit);
  if (riskUyarisi) uyarilar.push(riskUyarisi);

  return { basarili: true, kayit: yeniKayit, uyarilar: uyarilar.length ? uyarilar : undefined };
}

function olayKaydiGuncelle(id, veriler) {
  const dogrulama = olayKaydiDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  // Sadece YENİ eklenen DÖF/Uygunsuzluk satırları Uygunsuzluk modülüne
  // yazılır — daha önce zaten aktarılmış satırlar her düzenlemede tekrar
  // kopyalanmasın diye eski kayıttaki aksiyon id'leriyle karşılaştırılır.
  const oncekiKayit = olayKaydiIdIleGetirRepo(id);
  const oncekiAksiyonIdleri = new Set(((oncekiKayit && oncekiKayit.aksiyonlar) || []).map(a => a.id));

  // Kayıt No artık formda elle değiştirilebilir bir alan (kullanıcı isteği).
  // Kullanıcı boş bırakırsa depodaki mevcut kaydın kayitNo'su korunur — boş
  // bırakma HİÇBİR ZAMAN kayıt numarasını sessizce sıfırlamamalı.
  const guncellenen = olayKaydiGuncelleRepo(id, olayKaydiOlustur(Object.assign({}, veriler, {
    id,
    kayitNo: (veriler.kayitNo || '').trim() || (oncekiKayit && oncekiKayit.kayitNo) || ''
  })));

  const yeniEklenenler = (guncellenen.aksiyonlar || []).filter(a => !oncekiAksiyonIdleri.has(a.id));
  _aksiyonlariUygunsuzluguYaz(yeniEklenenler, guncellenen);

  return { basarili: true, kayit: guncellenen };
}

function olayKaydiSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  olayKaydiSilRepo(id);
  return { basarili: true };
}

// ---- JSON yedekleme / taşıma ----
// Excel içe/dışa aktarım sadece düz alanları taşır; 5N1K (why5), bariyer
// analizi, aksiyon listesi gibi iç içe alanlar JSON'da tam olarak korunur.
// Bu yüzden JSON dışa/içe aktarım, tam kayıt yedekleme/taşıma amaçlıdır.

function olayKayitlariniJsonaAktar(aramaMetni, filtreler) {
  // olayKayitlariniGetir zenginleştirilmiş kayıt döner (ör. hesaplanan fkRP);
  // içe aktarımda olayKaydiOlustur bilinmeyen alanları zaten yok sayar, bu
  // yüzden ekstra alan taşımak zararsızdır.
  return {
    schema: 'risk360-olay-kaza@1',
    exportedAt: new Date().toISOString(),
    kayitlar: olayKayitlariniGetir(aramaMetni, filtreler)
  };
}

// Var olan id'yle eşleşen kayıtlar (aynı dosyanın yanlışlıkla iki kez
// yüklenmesi gibi durumlarda) yinelenmiş sayılıp atlanır — orijinal id/kayitNo
// korunur (backup/restore senaryosunda numaraların değişmemesi için).
async function olayKayitlariniJsondanIceAktar(kayitlarHam) {
  const mevcutIdSeti = new Set(olayKayitlariTumunuGetir().map(k => k.id));
  const hatalar = [];
  const yeniKayitlar = [];
  let yinelenenSayisi = 0;

  (kayitlarHam || []).forEach((veriler, index) => {
    if (veriler && veriler.id && mevcutIdSeti.has(veriler.id)) { yinelenenSayisi++; return; }
    const dogrulama = olayKaydiDogrula(veriler || {});
    if (!dogrulama.gecerli) {
      hatalar.push(`Kayıt ${index + 1}${veriler && veriler.kayitNo ? ' (' + veriler.kayitNo + ')' : ''}: ${Object.values(dogrulama.hatalar)[0]}`);
      return;
    }
    yeniKayitlar.push(olayKaydiOlustur(veriler));
  });

  const yazimSonucu = await olayKayitlariTopluEkleRepo(yeniKayitlar);
  return {
    basarili: yazimSonucu.basarili ? yeniKayitlar.length : 0,
    basarisizSayisi: yazimSonucu.basarili ? hatalar.length : (yeniKayitlar.length + hatalar.length),
    hatalar: yazimSonucu.basarili ? hatalar : hatalar.concat(['Bulut yazımı başarısız oldu.']),
    yinelenenSayisi,
    bulutBasarili: yazimSonucu.basarili
  };
}

function olayRCAOzetiHesapla() {
  const kayitlar = olayKayitlariTumunuGetir().map(_olayZenginlestir);
  const ayarlar = olayAyarlariGetirRepo();
  const oranlar = guvenlikOranlariniHesapla(kayitlar, ayarlar.yillikCalismaSaati);

  const grupla = (secici) => {
    const sonuc = {};
    kayitlar.forEach(k => {
      const anahtar = secici(k) || 'Belirtilmemiş';
      sonuc[anahtar] = (sonuc[anahtar] || 0) + 1;
    });
    return Object.entries(sonuc).sort((a, b) => b[1] - a[1]).slice(0, 10);
  };

  const tumAksiyonlar = kayitlar.flatMap(k => (k.aksiyonlar || []).map(a => Object.assign({}, a, { kayitNo: k.kayitNo })));
  const acikAksiyonlar = tumAksiyonlar.filter(a => a.durum !== 'Tamamlandı' && a.durum !== 'İptal');
  const gecikmisAksiyonlar = acikAksiyonlar.filter(a => a.termin && a.termin < bugunIso());

  const yuksekRiskliler = kayitlar
    .filter(k => k.fkRP !== null)
    .sort((a, b) => b.fkRP - a.fkRP)
    .slice(0, 10);

  return {
    toplam: kayitlar.length,
    oranlar,
    bolumeGore: grupla(k => k.bolum),
    kisiyeGore: grupla(k => [k.sicilNo, k.adSoyad].filter(Boolean).join(' - ')),
    olayTipineGore: grupla(k => k.olayTipi),
    yaralanmaTurune: grupla(k => k.yaralanmaTuru),
    tehlikeliMaddeyeGore: grupla(k => k.tehlikeliMadde),
    aylikTrend: grupla(k => (k.kazaTarihi || '').slice(0, 7)).sort((a, b) => a[0].localeCompare(b[0])),
    acikAksiyonSayisi: acikAksiyonlar.length,
    gecikmisAksiyonSayisi: gecikmisAksiyonlar.length,
    yuksekRiskliler
  };
}

function olayAyarlariniGetir() {
  return olayAyarlariGetirRepo();
}

function olayAyarlariniKaydet(veriler) {
  return olayAyarlariKaydetRepo({ yillikCalismaSaati: Number(veriler.yillikCalismaSaati || 0) });
}
