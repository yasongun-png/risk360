// İSG Kurulu iş kuralları.

function _bugun() {
  return new Date().toISOString().slice(0, 10);
}

// ---- Denetim Kaydı (audit log) ----
// Eski üretim uygulamasındaki her modülde create/update/delete izleyen
// audit() fonksiyonunun karşılığı (bkz. isg-kurul-standalone-patched.html
// satır ~1227). Fotoğraf gibi büyük alanlar önce/sonra kaydından çıkarılır
// (denetim izinin amacı hangi alanların değiştiğini görmektir, veri yedeği değil).
function _denetimIcinSadelestir(nesne) {
  if (!nesne || typeof nesne !== 'object') return nesne;
  const { fotoOncesi, fotoSonrasi, fotografEk, ...geri } = nesne;
  return geri;
}

function _denetimKullaniciAdi() {
  const kullanici = typeof oturumdakiKullanici === 'function' ? oturumdakiKullanici() : null;
  return kullanici ? kullanici.adSoyad : '';
}

function _denetimEkle(varlikTuru, varlikId, eylem, once, sonra) {
  denetimEkleRepo(denetimKaydiOlustur({
    varlikTuru,
    varlikId,
    eylem,
    once: once ? _denetimIcinSadelestir(once) : null,
    sonra: sonra ? _denetimIcinSadelestir(sonra) : null,
    kullanici: _denetimKullaniciAdi()
  }));
}

function denetimKayitlariniGetir() {
  return denetimTumunuGetir().slice().sort((a, b) => (b.tarihISO || '').localeCompare(a.tarihISO || ''));
}

function denetimTemizle() {
  denetimTemizleRepo();
  return { basarili: true };
}

function _kararZenginlestir(karar) {
  const gecikmisMi = kararGecikmisMi(karar, _bugun());
  return Object.assign({}, karar, {
    durumGoruntu: gecikmisMi ? 'Gecikmiş' : karar.durum
  });
}

function toplantilariGetir(aramaMetni) {
  let liste = toplantiTumunuGetir().slice().sort((a, b) => b.tarih.localeCompare(a.tarih));
  if (!aramaMetni) return liste;
  const kucuk = aramaMetni.trim().toLowerCase();
  return liste.filter(t =>
    t.baslik.toLowerCase().includes(kucuk) ||
    (t.yer || '').toLowerCase().includes(kucuk) ||
    (t.toplantiNo || '').toLowerCase().includes(kucuk)
  );
}

function toplantiKararSayisi(toplantiId) {
  return kararTumunuGetir().filter(k => k.toplantiId === toplantiId).length;
}

function toplantiEkle(veriler) {
  const dogrulama = toplantiDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const mevcut = toplantiTumunuGetir();
  const toplantiNo = (veriler.toplantiNo || '').trim() || toplantiNoUret(veriler.donem, veriler.tarih, mevcut);
  const yeniToplanti = toplantiOlustur(Object.assign({}, veriler, { toplantiNo }));
  toplantiEkleRepo(yeniToplanti);
  _imzaListesiniOncekiToplantidanKopyala(yeniToplanti.id, yeniToplanti.id);
  _denetimEkle('toplanti', yeniToplanti.id, 'ekle', null, yeniToplanti);
  return { basarili: true, toplanti: yeniToplanti };
}

// Eski sistemden JSON içe aktarım için: N toplantıyı TEK bir bulut yazımıyla
// ekler (uygunsuzlukTopluEkle ile aynı gerekçe — bkz. o modüldeki yorum).
// _imzaListesiniOncekiToplantidanKopyala BİLEREK çağrılmaz: içe aktarımda
// katılımcı listesi zaten kaynak JSON'daki gerçek imza satırlarından ayrıca
// yazılır, önceki toplantıdan kopyalama burada yanlış/tekrarlı veri üretir.
async function toplantiTopluEkle(verilerListesi) {
  const hatalar = [];
  const yeniKayitlar = [];
  verilerListesi.forEach((veriler, index) => {
    const dogrulama = toplantiDogrula(veriler);
    if (!dogrulama.gecerli) {
      hatalar.push(`Toplantı ${index + 1}: ${Object.values(dogrulama.hatalar)[0]}`);
      return;
    }
    yeniKayitlar.push(toplantiOlustur(veriler));
  });
  const yazimSonucu = await toplantiTopluEkleRepo(yeniKayitlar);
  return {
    basarili: yazimSonucu.basarili ? yeniKayitlar.length : 0,
    basarisizSayisi: yazimSonucu.basarili ? hatalar.length : (yeniKayitlar.length + hatalar.length),
    hatalar: yazimSonucu.basarili ? hatalar : hatalar.concat(['Bulut yazımı başarısız oldu.']),
    bulutBasarili: yazimSonucu.basarili,
    kayitlar: yazimSonucu.basarili ? yeniKayitlar : []
  };
}

function toplantiGuncelle(id, veriler) {
  const dogrulama = toplantiDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  // Başkan/Kurul Sekreteri artık toplantı formunda elle girilmiyor (İmza
  // Listesi'ndeki "Kuruldaki Görevi" işaretlemesinden otomatik hesaplanıyor,
  // bkz. toplantiBaskanSekreterGetir). Form bu alanları göndermiyorsa mevcut
  // (eski, elle girilmiş) değer korunur -- her düzenlemede sıfırlanmaz.
  const mevcut = toplantiIdIleGetirRepo(id);
  const toplantiNo = (veriler.toplantiNo || '').trim()
    || (mevcut && mevcut.toplantiNo)
    || toplantiNoUret(veriler.donem, veriler.tarih, toplantiTumunuGetir(), id);
  const guncellenen = toplantiGuncelleRepo(id, {
    toplantiNo,
    baslik: veriler.baslik.trim(),
    tarih: veriler.tarih,
    saat: veriler.saat || '14:00',
    donem: veriler.donem || '',
    yer: (veriler.yer || '').trim(),
    tesis: (veriler.tesis || '').trim(),
    bolum: (veriler.bolum || '').trim(),
    baskan: veriler.baskan !== undefined ? (veriler.baskan || '').trim() : (mevcut ? mevcut.baskan : ''),
    yazman: veriler.yazman !== undefined ? (veriler.yazman || '').trim() : (mevcut ? mevcut.yazman : ''),
    katilimcilar: katilimcilariAyir(veriler.katilimcilar),
    katilimciSayisi: veriler.katilimciSayisi != null && veriler.katilimciSayisi !== '' ? String(veriler.katilimciSayisi) : '',
    gundem: veriler.gundem || [],
    durum: veriler.durum || 'Planlandı',
    genelDegerlendirme: (veriler.genelDegerlendirme || '').trim(),
    planlananFaaliyetlerGerceklesme: (veriler.planlananFaaliyetlerGerceklesme || '').trim(),
    tespitEdilenHususlar: (veriler.tespitEdilenHususlar || '').trim(),
    calisanBildirimleri: (veriler.calisanBildirimleri || '').trim(),
    faaliyetMetni: (veriler.faaliyetMetni || '').trim(),
    metrikler: (veriler.metrikler || '').trim(),
    calisanTemsilcisiGorusleri: (veriler.calisanTemsilcisiGorusleri || '').trim(),
    notlar: (veriler.notlar || '').trim()
  });
  _denetimEkle('toplanti', id, 'guncelle', mevcut, guncellenen);
  return { basarili: true, toplanti: guncellenen };
}

function toplantiSil(id) {
  const mevcut = toplantiIdIleGetirRepo(id);
  toplantiSilRepo(id);
  _denetimEkle('toplanti', id, 'sil', mevcut, null);
  return { basarili: true };
}

function toplantiKararlariniGetir(toplantiId) {
  return kararTumunuGetir()
    .filter(k => k.toplantiId === toplantiId)
    .map(_kararZenginlestir);
}

// Bir kararın "eve sahip olduğu" (oluşturulduğu) toplantı dışındaki her
// toplantıda otomatik olarak nasıl görüneceğini hesaplar — manuel "devret"
// işlemine gerek kalmadan: açık olduğu sürece her sonraki toplantıda devreden
// olarak görünür; kapandığında ise kapandıktan sonraki ilk toplantıda bir kez
// "devreden / tamamlandı" olarak görünür, ardından devredenTamamlandiGosterildi
// bayrağı sayesinde bir daha hiçbir toplantıda görünmez. Yan etkisi yoktur
// (raporlar/PPTX/PDF gibi salt okunur kullanımlar için güvenlidir).
// Termin girilmiş VE durumu "Kapalı"/"İptal" olmayan olaylar (Karar Metni/
// Sorumlu/Termin/Öncelik/Durum alanlarıyla, bkz. model.js kurulOlayiOlustur),
// gerçek bir Karar kaydı OLUŞTURMADAN, daha sonraki her toplantının "Devreden
// Kararlar" listesine de karar-benzeri (salt okunur) bir satır olarak dahil
// edilir — kullanıcı isteği. Otomatik (Olay/Kaza modülünden çekilen) olaylar
// bu alanlara sahip olamayacağından burada zaten yer almaz (termin hep boş).
function _olayKaynakliDevredenKararlariGetir(toplanti) {
  return olayTumunuGetir()
    .filter(o => o.termin && o.toplantiId !== toplanti.id && o.durum !== 'Kapalı' && o.durum !== 'İptal')
    .filter(o => {
      const eviToplanti = toplantiIdIleGetirRepo(o.toplantiId);
      return eviToplanti && eviToplanti.tarih && toplanti.tarih && eviToplanti.tarih < toplanti.tarih;
    })
    .map(o => _kararZenginlestir({
      id: 'olay-' + o.id,
      kararNo: '(Olay) ' + (o.tur || '-'),
      toplantiId: o.toplantiId,
      kararMetni: o.kararMetni || '',
      kaynakGundem: [o.tur, o.olusSekli].filter(Boolean).join(' — '),
      sorumlu: o.sorumlu || '',
      termin: o.termin || '',
      oncelik: o.oncelik || 'Normal',
      durum: o.durum || 'Açık',
      devrederMi: true,
      kapanisTarihi: '',
      kanit: '',
      aksiyonNotu: '',
      oy: '',
      oySonucu: '',
      oyKabul: null,
      oyRet: null,
      oyCekimser: null,
      fotoOncesi: '',
      fotoSonrasi: '',
      fotografEk: (o.fotograflar || []).slice(0, 3),
      olayKaynakli: true
    }));
}

function toplantiKararGruplariniGetir(toplantiId) {
  const toplanti = toplantiIdIleGetirRepo(toplantiId);
  if (!toplanti) return { devreden: [], yeni: [] };

  const tumu = kararTumunuGetir().map(_kararZenginlestir);
  const yeni = tumu.filter(k => k.toplantiId === toplantiId);

  const devreden = tumu.filter(k => {
    if (k.toplantiId === toplantiId) return false;
    const eviToplanti = toplantiIdIleGetirRepo(k.toplantiId);
    if (eviToplanti && eviToplanti.tarih && toplanti.tarih && eviToplanti.tarih >= toplanti.tarih) return false;
    if (k.durum !== 'Kapalı') return k.devrederMi !== false;
    return !k.devredenTamamlandiGosterildi;
  }).concat(_olayKaynakliDevredenKararlariGetir(toplanti));

  return { devreden, yeni };
}

// Yalnızca toplantı ekranı gerçekten görüntülenirken çağrılmalıdır: kapanmış
// ve bu görüntülemede devreden listesinde gösterilen kararları kalıcı olarak
// işaretler ki bir daha başka bir toplantının devreden listesinde çıkmasınlar.
function toplantiKararGruplariniGetirVeIsaretle(toplantiId) {
  const gruplar = toplantiKararGruplariniGetir(toplantiId);
  gruplar.devreden.forEach(k => {
    if (k.durum === 'Kapalı' && !k.devredenTamamlandiGosterildi) {
      kararGuncelleRepo(k.id, { devredenTamamlandiGosterildi: true });
    }
  });
  return gruplar;
}

// Kararı başka bir toplantıya taşır (kopyalamaz — tek kayıt olarak kalır).
// Devreden/Bu Toplantının Kararı ayrımı otomatik hesaplandığı için, bir
// kararı istediğiniz yönde (devredene veya güncel toplantıya) taşımak
// için kullanılır; "tamamlandı bir kez gösterildi" bayrağı sıfırlanır ki
// yeni konumunda tekrar normal şekilde değerlendirilsin.
// Bu toplantının kararlarına, henüz oy dökümü girilmemişse (hepsi kabul etmiş
// varsayımıyla) katılımcı sayısını Kabul olarak uygular — kullanıcı isteği:
// "hepsi kabul olacak şekilde girsin, gerekirse değiştirebileyim". Yalnızca
// dökümü tamamen boş olan kararlara dokunulur, elle girilmiş değerler ezilmez.
function toplantiKararlarinaVarsayilanOyUygula(toplantiId) {
  const katilimciSayisi = toplantiImzalariniGetir(toplantiId).filter(i => i.katildiMi).length;
  const kararlar = kararTumunuGetir().filter(k => k.toplantiId === toplantiId);
  let guncellenenSayisi = 0;
  kararlar.forEach(k => {
    if (k.oyKabul == null && k.oyRet == null && k.oyCekimser == null) {
      kararGuncelleRepo(k.id, { oyKabul: katilimciSayisi, oyRet: 0, oyCekimser: 0 });
      guncellenenSayisi++;
    }
  });
  return { basarili: true, guncellenenSayisi, katilimciSayisi };
}

function kararTasi(kararId, yeniToplantiId) {
  const karar = kararIdIleGetirRepo(kararId);
  if (!karar) return { basarili: false, hata: 'Karar bulunamadı.' };
  const guncellenen = kararGuncelleRepo(kararId, { toplantiId: yeniToplantiId, devredenTamamlandiGosterildi: false });
  return { basarili: true, karar: guncellenen };
}

function tumKararlariGetir(aramaMetni, filtreler) {
  const f = filtreler || {};
  let liste = kararTumunuGetir().map(_kararZenginlestir);
  const toplantilar = toplantiTumunuGetir();
  const enSonToplanti = toplantilar.slice().sort((a, b) => (b.tarih || '').localeCompare(a.tarih || ''))[0];

  liste = liste.map(k => Object.assign({}, k, {
    toplantiBasligi: (toplantilar.find(t => t.id === k.toplantiId) || {}).baslik || 'Silinmiş Toplantı',
    toplantiNo: (toplantilar.find(t => t.id === k.toplantiId) || {}).toplantiNo || '-',
    suAndaDevredenMi: k.durum !== 'Kapalı' && k.durum !== 'İptal' && (!enSonToplanti || k.toplantiId !== enSonToplanti.id)
  }));

  if (f.toplantiId) liste = liste.filter(k => k.toplantiId === f.toplantiId);
  if (f.durum) liste = liste.filter(k => k.durumGoruntu === f.durum);

  if (aramaMetni) {
    const kucuk = aramaMetni.trim().toLowerCase();
    liste = liste.filter(k =>
      k.kararMetni.toLowerCase().includes(kucuk) ||
      k.sorumlu.toLowerCase().includes(kucuk) ||
      (k.kararNo || '').toLowerCase().includes(kucuk)
    );
  }

  return liste.sort((a, b) => (b.termin || '').localeCompare(a.termin || ''));
}

// Kullanıcı isteğiyle GERİ ALINDI: olaylardan otomatik karar taslağı açma
// özelliği (toplantiOlaylariIcinKararTaslaklariniOlustur) kaldırıldı — Karar
// Metni/Sorumlu/Termin artık doğrudan Olay kaydının kendisinde tutuluyor
// (bkz. model.js kurulOlayiOlustur). Test sırasında zaten açılmış, hiç
// doldurulmamış taslak kararlar (kaynakOlayId işaretli + boş kararMetni/sorumlu)
// bir kerelik temizlenir; kullanıcı bir taslağı doldurup gerçek bir karara
// çevirdiyse (kararMetni veya sorumlu doluysa) dokunulmaz.
function _kaynakOlayliBosKararlariTemizle(toplantiId) {
  const bosTaslaklar = kararTumunuGetir().filter(k =>
    k.toplantiId === toplantiId && k.kaynakOlayId && !k.kararMetni.trim() && !k.sorumlu.trim()
  );
  bosTaslaklar.forEach(k => kararSilRepo(k.id));
}

function kararEkle(toplantiId, veriler) {
  const dogrulama = kararDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  // Kullanıcı Karar No'yu elle girmişse onu kullan; boş bırakılırsa eski
  // üretim uygulamasındaki AY.YIL/SIRA sistemiyle otomatik üretilir (bkz.
  // model.js ayYilSiraNoUret): toplantının kendi tarihi + o toplantı
  // içindeki sıradaki karar numarası.
  const toplanti = toplantiIdIleGetirRepo(toplantiId);
  const buToplantininKararSayisi = kararTumunuGetir().filter(k => k.toplantiId === toplantiId).length;
  const kararNo = (veriler.kararNo || '').trim() || ayYilSiraNoUret(toplanti ? toplanti.tarih : '', buToplantininKararSayisi + 1);
  const yeniKarar = kararOlustur(Object.assign({}, veriler, { toplantiId, kararNo }));
  kararEkleRepo(yeniKarar);
  _denetimEkle('karar', yeniKarar.id, 'ekle', null, yeniKarar);
  return { basarili: true, karar: yeniKarar };
}

// Eski sistemden JSON içe aktarım — bkz. toplantiTopluEkle. Karar No verilen
// kararlarda korunur (eski sistemin "AY.YIL/SIRA" numaraları zaten
// ayYilSiraNoUret ile aynı kalıpta — bkz. model.js).
async function kararTopluEkle(verilerListesi) {
  const hatalar = [];
  const yeniKayitlar = [];
  verilerListesi.forEach((veriler, index) => {
    const dogrulama = kararDogrula(veriler);
    if (!dogrulama.gecerli) {
      hatalar.push(`Karar ${index + 1} (${veriler.kararNo || '?'}): ${Object.values(dogrulama.hatalar)[0]}`);
      return;
    }
    yeniKayitlar.push(kararOlustur(veriler));
  });
  const yazimSonucu = await kararTopluEkleRepo(yeniKayitlar);
  return {
    basarili: yazimSonucu.basarili ? yeniKayitlar.length : 0,
    basarisizSayisi: yazimSonucu.basarili ? hatalar.length : (yeniKayitlar.length + hatalar.length),
    hatalar: yazimSonucu.basarili ? hatalar : hatalar.concat(['Bulut yazımı başarısız oldu.']),
    bulutBasarili: yazimSonucu.basarili
  };
}

function kararGuncelle(id, veriler) {
  const dogrulama = kararDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const mevcut = kararIdIleGetirRepo(id);
  const kararNo = (veriler.kararNo || '').trim() || (mevcut ? mevcut.kararNo : '');
  const guncellenen = kararGuncelleRepo(id, {
    kararNo,
    kararMetni: veriler.kararMetni.trim(),
    kaynakGundem: (veriler.kaynakGundem || '').trim(),
    sorumlu: veriler.sorumlu.trim(),
    termin: veriler.termin || '',
    oncelik: veriler.oncelik || 'Normal',
    durum: veriler.durum || 'Açık',
    oy: (veriler.oy || '').trim(),
    oySonucu: (veriler.oySonucu || '').trim(),
    oyKabul: veriler.oyKabul === '' || veriler.oyKabul == null ? null : Number(veriler.oyKabul),
    oyRet: veriler.oyRet === '' || veriler.oyRet == null ? null : Number(veriler.oyRet),
    oyCekimser: veriler.oyCekimser === '' || veriler.oyCekimser == null ? null : Number(veriler.oyCekimser),
    devrederMi: veriler.devrederMi !== undefined ? !!veriler.devrederMi : (mevcut ? mevcut.devrederMi !== false : true),
    kapanisTarihi: veriler.durum === 'Kapalı' ? (veriler.kapanisTarihi || _bugun()) : '',
    kanit: (veriler.kanit || '').trim(),
    aksiyonNotu: (veriler.aksiyonNotu || '').trim(),
    fotoOncesi: veriler.fotoOncesi || '',
    fotoSonrasi: veriler.fotoSonrasi || '',
    fotografEk: (Array.isArray(veriler.fotografEk) ? veriler.fotografEk : []).slice(0, 3)
  });
  _denetimEkle('karar', id, 'guncelle', mevcut, guncellenen);
  return { basarili: true, karar: guncellenen };
}

function kararSil(id) {
  const mevcut = kararIdIleGetirRepo(id);
  kararSilRepo(id);
  _denetimEkle('karar', id, 'sil', mevcut, null);
  return { basarili: true };
}

function kararDevret(kararId, yeniToplantiId) {
  const karar = kararIdIleGetirRepo(kararId);
  if (!karar) return { basarili: false, hata: 'Karar bulunamadı.' };

  const mevcut = kararTumunuGetir();
  const kararNo = sonrakiNoUret('KR', mevcut, 'kararNo');
  const yeniKarar = kararOlustur({
    toplantiId: yeniToplantiId,
    kararNo,
    kararMetni: karar.kararMetni,
    kaynakGundem: karar.kaynakGundem,
    sorumlu: karar.sorumlu,
    termin: karar.termin,
    oncelik: karar.oncelik,
    durum: 'Açık',
    devreden: true
  });
  kararEkleRepo(yeniKarar);
  return { basarili: true, karar: yeniKarar };
}

// ---- Olaylar (toplantıda görüşülen) ----

// Toplantının ait olduğu dönem (girilmişse "donem" alanı, yoksa toplantı
// tarihinin ayı) içinde Olay/Kaza modülünde kayıtlı kaza/ramak kala varsa,
// bunlar kurul toplantısının Olaylar bölümüne otomatik olarak (ayrı bir
// kurul_olaylari kaydı oluşturmadan, salt okunur şekilde) dahil edilir.
// Not: olay-kaza/repository.js'i script olarak yüklemiyoruz -- o dosyadaki
// _olayAnahtari()/_olayKaydet() isimleri kurul/repository.js'teki aynı isimli
// (ama farklı işlev gören) fonksiyonlarla çakışıp birbirinin üzerine yazardı
// (ikisi de global scope'ta, namespace yok). Bunun yerine tenantAnahtar('olay_kaza_kayitlari')
// anahtarı doğrudan burada, tek satırda okunur.
function _kurulOtomatikOlaylariGetir(toplanti) {
  const ay = toplanti && (toplanti.donem || (toplanti.tarih || '').slice(0, 7));
  if (!ay) return [];
  const kayitlar = oku(tenantAnahtar('olay_kaza_kayitlari'), []);
  // Aynı ay içinde ama toplantı tarihinden SONRA meydana gelen bir kaza henüz
  // görüşülmemiş sayılır — kullanıcı isteği: "bu ayda toplantı tarihine kadar
  // kaza olduysa onu da ekleyelim". toplanti.tarih yoksa (nadir/eski kayıt) ay
  // eşleşmesi tek başına yeterli sayılır.
  // Kullanıcı bir otomatik satırı "Düzenle" ya da "Sil" yaptıysa, o kaza id'si
  // burada dışlanır — Düzenle gerçek bir manuel kurul_olaylari kaydına
  // "yükseltir" (kaynakKazaId ile işaretli), Sil ise toplanti.otomatikOlayGizliKazaIdleri
  // listesine eklenir. İkisi de olmadan aynı satır her sayfa açılışında
  // yeniden (olduğu gibi) üretilirdi, hiç "silinmiş"/"düzenlenmiş" sayılmazdı.
  const gizliSet = new Set(toplanti.otomatikOlayGizliKazaIdleri || []);
  const yukseltilmisSet = new Set(olayTumunuGetir().filter(o => o.toplantiId === toplanti.id && o.kaynakKazaId).map(o => o.kaynakKazaId));
  return kayitlar
    .filter(k => String(k.kazaTarihi || '').slice(0, 7) === ay)
    .filter(k => !toplanti.tarih || !k.kazaTarihi || k.kazaTarihi <= toplanti.tarih)
    .filter(k => !gizliSet.has(k.id) && !yukseltilmisSet.has(k.id))
    .map(k => ({
      id: 'oto-' + k.id,
      toplantiId: toplanti.id,
      tur: k.olayTipi || '-',
      tarih: k.kazaTarihi || '',
      yer: k.kazaYeri || '',
      birim: k.bolum || '',
      adSoyad: k.adSoyad || '',
      olusSekli: k.aciklama || k.olayOzeti || '',
      kokNeden: k.temelNeden || k.dogrudanNeden || '',
      isGunuKaybi: k.kayipGun != null && k.kayipGun !== '' ? String(k.kayipGun) : '',
      // Olay/Kaza kaydının "Olay Yeri Fotoğrafları" (en fazla 3) buraya
      // taşınır ki kurul raporunda da gösterilebilsin (bkz. cikti.js
      // _pdfOlaylarFotoCoz / _wordOlayKarti) — ham foto referansları, henüz çözülmemiş.
      fotograflar: Array.isArray(k.olayYeriFotograflari) ? k.olayYeriFotograflari.slice(0, 3) : [],
      otomatik: true
    }));
}

function toplantiOlaylariniGetir(toplantiId) {
  const manuel = olayTumunuGetir().filter(o => o.toplantiId === toplantiId)
    .sort((a, b) => Number(a.sira || 0) - Number(b.sira || 0));
  const otomatik = _kurulOtomatikOlaylariGetir(toplantiIdIleGetirRepo(toplantiId));
  return [...otomatik, ...manuel];
}

// Gündemdeki "Olaylar" maddesinin altında gösterilmek üzere, bu toplantının
// (otomatik + elle eklenen, toplantı tarihine kadar olan) olaylarının kısa
// bir dökümü — kullanıcı isteği: "toplantı tarihine kadar olan olayları da
// gündeme ekleyelim". Tarih filtrelemesi zaten toplantiOlaylariniGetir'in
// kaynağı olan _kurulOtomatikOlaylariGetir'de yapılıyor.
function toplantiOlaylarGundemMetni(toplantiId) {
  const olaylar = toplantiOlaylariniGetir(toplantiId);
  if (!olaylar.length) return '';
  return olaylar.map(o => `${gunAyYil(o.tarih) || '-'} - ${o.tur}${o.yer ? ' (' + o.yer + ')' : ''}`).join('; ');
}

// Otomatik (Olay/Kaza modülünden çekilen) bir satırda "Sil" denildiğinde:
// gerçek bir Olay/Kaza kaydı silinmez (o modülün kendi verisi), sadece bu
// toplantının Olaylar listesinden kalıcı olarak gizlenir.
function kurulOtomatikOlayiGizle(toplantiId, kazaId) {
  const toplanti = toplantiIdIleGetirRepo(toplantiId);
  if (!toplanti) return { basarili: false };
  const mevcut = Array.isArray(toplanti.otomatikOlayGizliKazaIdleri) ? toplanti.otomatikOlayGizliKazaIdleri : [];
  if (!mevcut.includes(kazaId)) {
    toplantiGuncelleRepo(toplantiId, { otomatikOlayGizliKazaIdleri: mevcut.concat([kazaId]) });
  }
  return { basarili: true };
}

// Otomatik bir satırda "Düzenle" denildiğinde: o satır gerçek, düzenlenebilir
// bir kurul_olaylari kaydına "yükseltilir" (kaynakKazaId ile kaynağına
// bağlanır) — böylece kullanıcı Karar Metni/Sorumlu/Termin/Öncelik/Durum
// girebilir ve normal bir olay gibi düzenleyip silebilir.
function kurulOtomatikOlayiYukselt(toplantiId, otomatikOlay) {
  const mevcutSayisi = olayTumunuGetir().filter(o => o.toplantiId === toplantiId).length;
  const yeni = kurulOlayiOlustur({
    toplantiId,
    tur: otomatikOlay.tur,
    tarih: otomatikOlay.tarih,
    yer: otomatikOlay.yer,
    birim: otomatikOlay.birim,
    olusSekli: otomatikOlay.olusSekli,
    kokNeden: otomatikOlay.kokNeden,
    isGunuKaybi: otomatikOlay.isGunuKaybi,
    fotograflar: otomatikOlay.fotograflar,
    kaynakKazaId: otomatikOlay.id.replace(/^oto-/, ''),
    sira: mevcutSayisi
  });
  olayEkleRepo(yeni);
  _denetimEkle('olay', yeni.id, 'ekle', null, yeni);
  return { basarili: true, olay: yeni };
}

function kurulOlayiEkle(toplantiId, veriler) {
  const dogrulama = kurulOlayiDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const mevcutSayisi = olayTumunuGetir().filter(o => o.toplantiId === toplantiId).length;
  const yeni = kurulOlayiOlustur(Object.assign({}, veriler, { toplantiId, sira: mevcutSayisi }));
  olayEkleRepo(yeni);
  _denetimEkle('olay', yeni.id, 'ekle', null, yeni);
  return { basarili: true, olay: yeni };
}

function kurulOlayiGuncelle(id, veriler) {
  const dogrulama = kurulOlayiDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const mevcut = olayTumunuGetir().find(o => o.id === id) || null;
  const guncellenen = olayGuncelleRepo(id, kurulOlayiOlustur(Object.assign({}, veriler, { id, toplantiId: mevcut ? mevcut.toplantiId : veriler.toplantiId })));
  _denetimEkle('olay', id, 'guncelle', mevcut, guncellenen);
  return { basarili: true, olay: guncellenen };
}

// Eski sistemden JSON içe aktarım — bkz. toplantiTopluEkle.
async function olayTopluEkle(verilerListesi) {
  const hatalar = [];
  const yeniKayitlar = [];
  verilerListesi.forEach((veriler, index) => {
    const dogrulama = kurulOlayiDogrula(veriler);
    if (!dogrulama.gecerli) {
      hatalar.push(`Olay ${index + 1}: ${Object.values(dogrulama.hatalar)[0]}`);
      return;
    }
    yeniKayitlar.push(kurulOlayiOlustur(veriler));
  });
  const yazimSonucu = await olayTopluEkleRepo(yeniKayitlar);
  return {
    basarili: yazimSonucu.basarili ? yeniKayitlar.length : 0,
    basarisizSayisi: yazimSonucu.basarili ? hatalar.length : (yeniKayitlar.length + hatalar.length),
    hatalar: yazimSonucu.basarili ? hatalar : hatalar.concat(['Bulut yazımı başarısız oldu.']),
    bulutBasarili: yazimSonucu.basarili
  };
}

function kurulOlayiSil(id) {
  const mevcut = olayTumunuGetir().find(o => o.id === id) || null;
  olaySilRepo(id);
  _denetimEkle('olay', id, 'sil', mevcut, null);
  return { basarili: true };
}

// Aynı toplantı içindeki elle eklenen olayları komşusuyla yer değiştirerek
// yukarı/aşağı taşır (kullanıcı isteği: "isg kurulu olay içinde yukarı aşağı
// taşıma olsun" — toplantılar arası değil, tek bir toplantının Olaylar
// listesi içinde sıralama). Otomatik satırlar zaten en üstte sabittir ve bu
// fonksiyona konu değildir.
function _kurulOlayiKomsuylaDegistir(olayId, yon) {
  const olay = olayTumunuGetir().find(o => o.id === olayId);
  if (!olay) return { basarili: false, hata: 'Olay bulunamadı.' };
  const liste = olayTumunuGetir().filter(o => o.toplantiId === olay.toplantiId)
    .sort((a, b) => Number(a.sira || 0) - Number(b.sira || 0));

  // Bu özellikten önce oluşturulmuş olayların hepsinde sira boş/0 olabilir —
  // bu durumda komşu değerleri de 0/0 olup "değiştirme" etkisiz kalırdı. Önce
  // mevcut (stabil) sıraya göre 0,1,2... değerlerini kesinleştiriyoruz.
  liste.forEach((o, i) => {
    if (Number(o.sira || 0) !== i) olayGuncelleRepo(o.id, { sira: i });
    o.sira = i;
  });

  const index = liste.findIndex(o => o.id === olayId);
  const komsuIndex = index + yon;
  if (index === -1 || komsuIndex < 0 || komsuIndex >= liste.length) return { basarili: false };

  const mevcut = liste[index];
  const komsu = liste[komsuIndex];
  olayGuncelleRepo(mevcut.id, { sira: komsu.sira });
  olayGuncelleRepo(komsu.id, { sira: mevcut.sira });
  return { basarili: true };
}

function kurulOlayiYukariTasi(olayId) {
  return _kurulOlayiKomsuylaDegistir(olayId, -1);
}

function kurulOlayiAsagiTasi(olayId) {
  return _kurulOlayiKomsuylaDegistir(olayId, 1);
}

// ---- İmza Listesi ----

function toplantiImzalariniGetir(toplantiId) {
  return imzaTumunuGetir().filter(i => i.toplantiId === toplantiId).sort((a, b) => Number(a.siraNo || 0) - Number(b.siraNo || 0));
}

function imzaSatiriEkle(toplantiId, veriler) {
  const dogrulama = imzaSatiriDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const siraNo = String(toplantiImzalariniGetir(toplantiId).length + 1);
  const yeni = imzaSatiriOlustur(Object.assign({}, veriler, { toplantiId, siraNo }));
  imzaEkleRepo(yeni);
  _denetimEkle('imza', yeni.id, 'ekle', null, yeni);
  return { basarili: true, imza: yeni };
}

// Eski sistemden JSON içe aktarım — bkz. toplantiTopluEkle. siraNo çağıran
// tarafından (import sırasındaki listedeki sırayla) verilir.
async function imzaTopluEkle(verilerListesi) {
  const hatalar = [];
  const yeniKayitlar = [];
  verilerListesi.forEach((veriler, index) => {
    const dogrulama = imzaSatiriDogrula(veriler);
    if (!dogrulama.gecerli) {
      hatalar.push(`İmza ${index + 1}: ${Object.values(dogrulama.hatalar)[0]}`);
      return;
    }
    yeniKayitlar.push(imzaSatiriOlustur(veriler));
  });
  const yazimSonucu = await imzaTopluEkleRepo(yeniKayitlar);
  return {
    basarili: yazimSonucu.basarili ? yeniKayitlar.length : 0,
    basarisizSayisi: yazimSonucu.basarili ? hatalar.length : (yeniKayitlar.length + hatalar.length),
    hatalar: yazimSonucu.basarili ? hatalar : hatalar.concat(['Bulut yazımı başarısız oldu.']),
    bulutBasarili: yazimSonucu.basarili
  };
}

function imzaSatiriGuncelle(id, veriler) {
  const dogrulama = imzaSatiriDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const mevcut = imzaTumunuGetir().find(i => i.id === id) || null;
  const guncellenen = imzaGuncelleRepo(id, {
    adSoyad: veriler.adSoyad.trim(),
    unvan: (veriler.unvan || '').trim(),
    birim: (veriler.birim || '').trim(),
    kuruldakiGorev: (veriler.kuruldakiGorev || '').trim(),
    katildiMi: veriler.katildiMi !== undefined ? !!veriler.katildiMi : true
  });
  if (!guncellenen) return { basarili: false, hata: 'Katılımcı bulunamadı.' };
  _denetimEkle('imza', id, 'guncelle', mevcut, guncellenen);
  return { basarili: true, imza: guncellenen };
}

function imzaSatiriSil(id) {
  const mevcut = imzaTumunuGetir().find(i => i.id === id) || null;
  imzaSilRepo(id);
  _denetimEkle('imza', id, 'sil', mevcut, null);
  return { basarili: true };
}

// Yeni toplantı oluşturulduğunda, en son toplantının imza listesini (katılımcı
// rosterini) yeni toplantıya kopyalar; her yeni toplantıda katılımcıları
// tekrar tekrar elle girmemek için. "Katıldı mı" varsayılan olarak Evet'e
// sıfırlanır (yeni toplantının fiili katılımı henüz bilinmiyor).
// imzaTopluEkle (TEK bulut yazımı) kasıtlı olarak kullanılır — imzaSatiriEkle
// ile satır satır eklemek büyük rosterlerde (ör. 21 kişi) son satırların
// kaybolmasına yol açıyordu: her satır kendi async Firestore .set() çağrısını
// aynı belgeye ateşliyor, canlı onSnapshot dinleyicisi ise ara yazımlardan
// birinin yerel önbellek yankısını en son (tam) durumdan SONRA uygulayıp
// _bulutOnbellek'i eski/eksik bir listeyle geri yazabiliyordu (bkz.
// toplantiTopluEkle/uygunsuzlukTopluEkle'deki aynı gerekçe).
function _imzaListesiniOncekiToplantidanKopyala(yeniToplantiId, oncekiHaric) {
  const oncekiToplantilar = toplantiTumunuGetir()
    .filter(t => t.id !== oncekiHaric)
    .sort((a, b) => (b.tarih || '').localeCompare(a.tarih || ''));

  for (const onceki of oncekiToplantilar) {
    const roster = toplantiImzalariniGetir(onceki.id);
    if (!roster.length) continue;
    imzaTopluEkle(roster.map((i, index) => ({
      toplantiId: yeniToplantiId,
      siraNo: String(index + 1),
      adSoyad: i.adSoyad,
      unvan: i.unvan,
      birim: i.birim,
      kuruldakiGorev: i.kuruldakiGorev,
      katildiMi: true
    })));
    return roster.length;
  }
  return 0;
}

// Başkan/Kurul Sekreteri artık toplantı formunda elle girilmez: İmza
// Listesi'nde "Kuruldaki Görevi" alanı "Kurul Başkanı" / "Kurul Sekreteri"
// olarak işaretlenen katılımcıdan otomatik gelir. Henüz kimse işaretlenmediyse
// (ör. bu özellikten önce oluşturulmuş eski toplantılar), toplantı kaydındaki
// eski elle-girilmiş baskan/yazman alanına düşülür.
function toplantiBaskanSekreterGetir(toplantiId) {
  const toplanti = toplantiIdIleGetirRepo(toplantiId);
  const imzalar = toplantiImzalariniGetir(toplantiId);
  const baskanSatiri = imzalar.find(i => i.kuruldakiGorev === 'Kurul Başkanı');
  const sekreterSatiri = imzalar.find(i => i.kuruldakiGorev === 'Kurul Sekreteri');
  return {
    baskan: baskanSatiri ? baskanSatiri.adSoyad : ((toplanti && toplanti.baskan) || ''),
    yazman: sekreterSatiri ? sekreterSatiri.adSoyad : ((toplanti && toplanti.yazman) || '')
  };
}

// ---- Ay İçi İSG Çalışmaları (serbest biçimli faaliyet dökümü) ----

function toplantiAyIciFaaliyetleriniGetir(toplantiId) {
  return ayIciFaaliyetTumunuGetir().filter(f => f.toplantiId === toplantiId);
}

function ayIciFaaliyetEkle(toplantiId, veriler) {
  const dogrulama = ayIciFaaliyetDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const yeni = ayIciFaaliyetOlustur(Object.assign({}, veriler, { toplantiId }));
  ayIciFaaliyetEkleRepo(yeni);
  _denetimEkle('ayIciFaaliyet', yeni.id, 'ekle', null, yeni);
  return { basarili: true, faaliyet: yeni };
}

function ayIciFaaliyetSil(id) {
  const mevcut = ayIciFaaliyetTumunuGetir().find(f => f.id === id) || null;
  ayIciFaaliyetSilRepo(id);
  _denetimEkle('ayIciFaaliyet', id, 'sil', mevcut, null);
  return { basarili: true };
}

// ---- Uygunsuzluk modülünden: Ay İçinde Kapatılan Uygunsuzluklar ----
// olay-kaza entegrasyonuyla aynı gerekçeyle (bkz. _kurulOtomatikOlaylariGetir):
// uygunsuzluk/repository.js'i script olarak yüklemek isim çakışmasına yol açar,
// bu yüzden tenantAnahtar('uygunsuzluk_kayitlari') doğrudan burada okunur.
// Tespit tarihi değil KAPANIŞ tarihi toplantı dönemine göre filtrelenir (eski
// üretim uygulamasındaki isNCInMeetingPeriod ile aynı kural).
// Not (2026-08-04 düzeltme): eski üretim uygulamasının kendi verisinde
// "kaynak" iç yönetim ızgarasında vardı ama gerçek Word/PDF/PPTX çıktısında
// hiç gösterilmiyordu (bkz. isg-kurul-standalone-patched.html satır 4447 —
// tablo sütunları no/bölüm/tarihler/tanım/sorumlu/durum/açıklama, kaynak yok)
// — bu yüzden burada da taşınmadı. Aynı eski uygulamada bu liste satırları
// öncesi/sonrası fotoğraflarıyla birlikte kart olarak basılıyordu (nc-card /
// nc-photos, satır ~5992) — fotoOncesi/fotoSonrasi burada da taşınır ve
// toplanti-ui.js/cikti.js tarafında görüntülenir.
function _uygunsuzlukSatiriEsle(k) {
  return {
    id: k.id,
    konuBasligi: k.baslik || k.konuAdi || '-',
    tespitTarihi: k.bildirimTarihi || '',
    kapanisTarihi: k.kapanisTarihi || '',
    bolum: k.bolum || '',
    uygunsuzluk: k.aciklama || '',
    alinanOnlem: [k.duzelticiFaaliyet, k.onleyiciFaaliyet].filter(Boolean).join(' / ') || k.kanitAciklamasi || '',
    sorumlu: k.sorumlu || '',
    durum: k.durum,
    fotoOncesi: k.fotoOncesi || '',
    fotoSonrasi: k.fotoSonrasi || ''
  };
}

function toplantiKapananUygunsuzluklariGetir(toplanti) {
  const ay = toplanti && (toplanti.donem || (toplanti.tarih || '').slice(0, 7));
  if (!ay) return [];
  const kayitlar = oku(tenantAnahtar('uygunsuzluk_kayitlari'), []);
  return kayitlar
    .filter(k => k.durum === 'Kapalı' && String(k.kapanisTarihi || '').slice(0, 7) === ay)
    .map(_uygunsuzlukSatiriEsle);
}

// Gündem maddesi "Ay içinde tespit edilen, ay içinde kapatılan uygunsuzluklar"
// (2026-08-04) — kapanan listeden ayrı: TESPİT/bildirim tarihi döneme denk
// gelen tüm kayıtları (durumdan bağımsız — henüz açık olanlar dahil) gösterir.
function toplantiTespitEdilenUygunsuzluklariGetir(toplanti) {
  const ay = toplanti && (toplanti.donem || (toplanti.tarih || '').slice(0, 7));
  if (!ay) return [];
  const kayitlar = oku(tenantAnahtar('uygunsuzluk_kayitlari'), []);
  return kayitlar
    .filter(k => String(k.bildirimTarihi || '').slice(0, 7) === ay)
    .map(_uygunsuzlukSatiriEsle);
}

// ---- Eğitim modülünden: Ay İçinde Yapılan Eğitimler ----
// Aynı script-yükleme çakışması gerekçesiyle egitim/personel modüllerinin
// anahtarları doğrudan tenantAnahtar() ile okunur. Aynı ay içinde aynı eğitim
// türünde verilen kayıtlar TEK bir özet satırında toplanır (katılımcı sayısı
// birleştirilerek) — eski üretim uygulamasındaki groupTrainingsForKurul ile
// aynı davranış.
function toplantiAylikEgitimleriGetir(toplanti) {
  const ay = toplanti && (toplanti.donem || (toplanti.tarih || '').slice(0, 7));
  if (!ay) return [];
  const kayitlar = oku(tenantAnahtar('egitim_kayitlari'), []);
  const personelListesi = oku(tenantAnahtar('personel'), []);
  const buAyKayitlari = kayitlar.filter(k => {
    const tarih1 = String(k.tarih || '').slice(0, 7);
    const tarih2 = String(k.tarih2 || '').slice(0, 7);
    return tarih1 === ay || tarih2 === ay;
  });

  const gruplar = new Map();
  buAyKayitlari.forEach(k => {
    const tur = (typeof egitimTuruGetir === 'function' && egitimTuruGetir(k.egitimTuruId)) || { ad: k.egitimTuruId || 'Eğitim' };
    const personel = personelListesi.find(p => p.id === k.personelId);
    const anahtar = k.egitimTuruId + '|' + (k.tarih || '') + '|' + (k.tarih2 || '');
    if (!gruplar.has(anahtar)) {
      gruplar.set(anahtar, {
        id: anahtar,
        egitimAdi: tur.ad,
        egitimTarihi: k.tarih || '',
        egitimTarihi2: k.tarih2 || '',
        katilimciSayisi: 0,
        birimler: new Set()
      });
    }
    const grup = gruplar.get(anahtar);
    grup.katilimciSayisi += 1;
    if (personel && personel.bolum) grup.birimler.add(personel.bolum);
  });

  return Array.from(gruplar.values()).map((g, i) => ({
    id: g.id,
    siraNo: i + 1,
    egitimAdi: g.egitimAdi,
    egitimTarihi: g.egitimTarihi,
    egitimTarihi2: g.egitimTarihi2,
    katilimciSayisi: g.katilimciSayisi,
    birim: Array.from(g.birimler).join(', ')
  }));
}

function kurulOzetiHesapla() {
  const toplantilar = toplantiTumunuGetir();
  const kararlar = kararTumunuGetir().map(_kararZenginlestir);
  const enSonToplanti = toplantilar.slice().sort((a, b) => (b.tarih || '').localeCompare(a.tarih || ''))[0];

  return {
    toplamToplanti: toplantilar.length,
    toplamKarar: kararlar.length,
    acikKarar: kararlar.filter(k => k.durumGoruntu !== 'Kapalı' && k.durumGoruntu !== 'İptal').length,
    kapaliKarar: kararlar.filter(k => k.durum === 'Kapalı').length,
    gecikmisKarar: kararlar.filter(k => k.durumGoruntu === 'Gecikmiş').length,
    // Şu anda hâlâ açık olup en son toplantıdan önce açılmış (yani otomatik
    // olarak bir sonraki toplantıya devreden) karar sayısı.
    devredenKarar: kararlar.filter(k => k.durum !== 'Kapalı' && k.durum !== 'İptal' && (!enSonToplanti || k.toplantiId !== enSonToplanti.id)).length
  };
}
