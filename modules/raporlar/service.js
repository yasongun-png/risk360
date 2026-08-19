// Raporlar: platformdaki tüm modüllerin verisinden İSG performans özetini
// (KPI kartları + basit grafikler) hesaplayan salt-okunur toplama katmanı.
// Merkezi Aksiyon Takibi gibi kendi verisi yoktur, düzenleme kaynak modülde
// yapılır. Aynı gerekçeyle (bkz. merkezi-aksiyon/service.js başlığı) diğer
// modüllerin repository.js/service.js dosyaları YÜKLENMEZ — aynı isimli özel
// yardımcı fonksiyonlar (ör. birçok modülün kendi bugunIso()'su) birlikte
// yüklenince sessizce birbirinin üzerine yazabiliyor. Bunun yerine her
// kaynağın tenant anahtarı burada doğrudan okunur; gereken küçük iş kuralları
// (geçerlilik/durum hesaplama vb.) çakışmaması için kendi önekiyle (_rp) tekrar
// yazılır. Tek istisna: merkezi-aksiyon/service.js — kendi iç adları zaten
// "_ma" önekiyle izole, o yüzden merkeziAksiyonOzetiHesapla() doğrudan tekrar
// kullanılır.

function _rpBugun() { return new Date().toISOString().slice(0, 10); }

function _rp30GunSonraMi(tarih, bugunStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tarih || '')) return false;
  const bugun = bugunStr || _rpBugun();
  if (tarih < bugun) return false;
  const sinir = new Date(bugun + 'T00:00:00');
  sinir.setDate(sinir.getDate() + 30);
  // toISOString() UTC'ye çevirir; UTC+3'te yerel gece yarısı bir gün geri kayar.
  const sinirStr = sinir.getFullYear() + '-' + String(sinir.getMonth() + 1).padStart(2, '0') + '-' + String(sinir.getDate()).padStart(2, '0');
  return tarih <= sinirStr;
}

// ---- Personel / Eğitim ----

const _RP_TEMEL_ISG_YENILEME_YILI = { 'Az Tehlikeli': 3, 'Tehlikeli': 2, 'Çok Tehlikeli': 1 };

const _RP_EGITIM_TURLERI = [
  { id: 'temel_isg', ad: 'Temel İSG Eğitimi', hesaplama: 'tehlikeSinifi' },
  { id: 'is_basi', ad: 'İş Başı Eğitimi', hesaplama: 'tek' },
  { id: 'ise_donus', ad: 'İşe Dönüş Eğitimi', hesaplama: 'sabit', yil: 1 },
  { id: 'acil_durum', ad: 'Acil Durum Ekip Eğitimi', hesaplama: 'sabit', yil: 1 },
  { id: 'yukseklik', ad: 'Yüksekte Çalışma Eğitimi', hesaplama: 'sabit', yil: 1 },
  { id: 'kapali_alan', ad: 'Kapalı Alanda Çalışma Eğitimi', hesaplama: 'sabit', yil: 1 },
  { id: 'is_izni', ad: 'İş İzni Eğitimi', hesaplama: 'sabit', yil: 1 },
  { id: 'risk_ekip', ad: 'Risk Değerlendirmesi Ekip Eğitimi', hesaplama: 'tek' },
  { id: 'myk', ad: 'MYK Belgesi', hesaplama: 'dogrudan' },
  { id: 'ilkyardim', ad: 'İlkyardım Sertifikası', hesaplama: 'dogrudan' }
];

function _rpYilEkle(tarihStr, yil) {
  const tarih = new Date(tarihStr);
  tarih.setFullYear(tarih.getFullYear() + yil);
  return tarih.toISOString().split('T')[0];
}

function _rpEgitimEfektifTarihi(kayit) {
  return (kayit.tarih2 && kayit.tarih2 > kayit.tarih) ? kayit.tarih2 : kayit.tarih;
}

function _rpEgitimBitisTarihiHesapla(kayit, tur, firma) {
  if (!tur || !kayit.tarih) return null;
  if (tur.hesaplama === 'tek') return null;
  if (tur.hesaplama === 'dogrudan') return kayit.tarih;
  if (tur.hesaplama === 'sabit') return _rpYilEkle(_rpEgitimEfektifTarihi(kayit), tur.yil);
  if (tur.hesaplama === 'tehlikeSinifi') {
    const yil = (firma && _RP_TEMEL_ISG_YENILEME_YILI[firma.tehlikeSinifi]) || 1;
    return _rpYilEkle(_rpEgitimEfektifTarihi(kayit), yil);
  }
  return null;
}

function _rpEgitimDurumHesapla(tur, bitisTarihi) {
  if (tur && tur.hesaplama === 'tek') return 'gecerli';
  if (!bitisTarihi) return 'kayit_yok';
  const bugun = new Date();
  bugun.setHours(0, 0, 0, 0);
  const bitis = new Date(bitisTarihi);
  const farkGun = Math.round((bitis - bugun) / 86400000);
  if (farkGun < 0) return 'gecmis';
  if (farkGun <= 30) return 'yaklasiyor';
  return 'gecerli';
}

function raporPersonelEgitimOzeti(firma) {
  const personeller = oku(tenantAnahtar('personel'), []).filter(p => !p.istenCikisTarihi);
  const kayitlar = oku(tenantAnahtar('egitim_kayitlari'), []);

  let toplamHucre = 0, uyumlu = 0, yaklasan = 0, gecmisVeyaYok = 0;

  personeller.forEach(p => {
    _RP_EGITIM_TURLERI.forEach(tur => {
      const kPersonel = kayitlar
        .filter(k => k.personelId === p.id && k.egitimTuruId === tur.id)
        .sort((a, b) => (b.tarih || '').localeCompare(a.tarih || ''));
      const son = kPersonel[0] || null;
      const bitis = son ? _rpEgitimBitisTarihiHesapla(son, tur, firma) : null;
      const durum = son ? _rpEgitimDurumHesapla(tur, bitis) : 'kayit_yok';

      toplamHucre++;
      if (durum === 'gecerli') uyumlu++;
      else if (durum === 'yaklasiyor') { uyumlu++; yaklasan++; }
      else gecmisVeyaYok++;
    });
  });

  return {
    personelSayisi: personeller.length,
    uyumYuzdesi: toplamHucre ? Math.round(100 * uyumlu / toplamHucre) : 100,
    yaklasan,
    gecmisVeyaYok
  };
}

// ---- Risk Değerlendirmesi ----

const _RP_RISK_DUZEYLERI = [
  { minExclusive: 400, etiket: 'Tolerans Gösterilemez' },
  { minExclusive: 200, etiket: 'Esaslı Risk' },
  { minExclusive: 70, etiket: 'Önemli Risk' },
  { minExclusive: 20, etiket: 'Olası Risk' },
  { minExclusive: -Infinity, etiket: 'Önemsiz Risk' }
];

function _rpRiskDuzeyi(puan) {
  const sayi = Number(puan || 0);
  return (_RP_RISK_DUZEYLERI.find(d => sayi > d.minExclusive) || _RP_RISK_DUZEYLERI[_RP_RISK_DUZEYLERI.length - 1]).etiket;
}

function raporRiskOzeti() {
  const liste = oku(tenantAnahtar('risk_kayitlari'), []);
  const kapali = ['Kapalı', 'İptal'];
  const acik = liste.filter(r => !kapali.includes(r.durum));
  const bugun = _rpBugun();
  const gecikmis = acik.filter(r => /^\d{4}-\d{2}-\d{2}$/.test(r.termin || '') && r.termin < bugun).length;

  const duzeyeGore = {};
  acik.forEach(r => {
    const duzey = _rpRiskDuzeyi(Number(r.O || 0) * Number(r.F || 0) * Number(r.S || 0));
    duzeyeGore[duzey] = (duzeyeGore[duzey] || 0) + 1;
  });

  return {
    toplamKayit: liste.length,
    acikSayisi: acik.length,
    gecikmis,
    duzeyeGore: _RP_RISK_DUZEYLERI.map(d => ({ etiket: d.etiket, sayi: duzeyeGore[d.etiket] || 0 })).filter(d => d.sayi > 0)
  };
}

// ---- Olay / Kaza ----

const _RP_AY_KISALTMALARI = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

function _rpSon12AyAnahtarlari() {
  const sonuc = [];
  const su = new Date();
  su.setDate(1);
  for (let i = 11; i >= 0; i--) {
    const d = new Date(su.getFullYear(), su.getMonth() - i, 1);
    const anahtar = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    sonuc.push({ anahtar, etiket: _RP_AY_KISALTMALARI[d.getMonth()] });
  }
  return sonuc;
}

function raporOlayKazaOzeti() {
  const liste = oku(tenantAnahtar('olay_kaza_kayitlari'), []);
  const ayAnahtarlari = _rpSon12AyAnahtarlari();
  const ilkAy = ayAnahtarlari[0].anahtar;

  const son12Ay = liste.filter(k => (k.kazaTarihi || '').slice(0, 7) >= ilkAy);
  const aySayaci = {};
  son12Ay.forEach(k => {
    const ay = (k.kazaTarihi || '').slice(0, 7);
    aySayaci[ay] = (aySayaci[ay] || 0) + 1;
  });

  const tipeGore = {};
  son12Ay.forEach(k => { tipeGore[k.olayTipi] = (tipeGore[k.olayTipi] || 0) + 1; });

  const toplamKayipGun = son12Ay.reduce((t, k) => t + (Number(k.kayipGun) || 0), 0);

  return {
    toplamKayit: liste.length,
    acikSayisi: liste.filter(k => k.durum === 'Açık').length,
    son12AySayisi: son12Ay.length,
    toplamKayipGun,
    aylikDagilim: ayAnahtarlari.map(a => ({ etiket: a.etiket, sayi: aySayaci[a.anahtar] || 0 })),
    tipeGore: Object.entries(tipeGore).sort((a, b) => b[1] - a[1]).map(([etiket, sayi]) => ({ etiket, sayi }))
  };
}

// ---- Uygunsuzluk / DÖF ----

function raporUygunsuzlukOzeti() {
  const liste = oku(tenantAnahtar('uygunsuzluk_kayitlari'), []);
  const kapali = ['Kapalı', 'İptal'];
  const acik = liste.filter(k => !kapali.includes(k.durum));
  const bugun = _rpBugun();
  const gecikmis = acik.filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k.termin || '') && k.termin < bugun).length;
  return { toplamKayit: liste.length, acikSayisi: acik.length, gecikmis };
}

// ---- KKD ----

function raporKkdOzeti() {
  const zimmetler = oku(tenantAnahtar('kkd_zimmetler'), []);
  const terminal = ['İade Edildi', 'Kayıp', 'Hasarlı', 'İptal'];
  const aktifZimmetler = zimmetler.filter(z => !terminal.includes(z.durum));
  const bugun = _rpBugun();

  let suresiGecti = 0, yaklasiyor = 0;
  aktifZimmetler.forEach(z => {
    if (!z.degisimTarihi) return;
    if (z.degisimTarihi < bugun) suresiGecti++;
    else if (_rp30GunSonraMi(z.degisimTarihi, bugun)) yaklasiyor++;
  });

  const ihlaller = oku(tenantAnahtar('kkd_ihlaller'), []);
  const buYilIhlal = ihlaller.filter(i => (i.tarih || '').startsWith(String(new Date().getFullYear()))).length;

  return { aktifZimmetSayisi: aktifZimmetler.length, suresiGecti, yaklasiyor, buYilIhlal };
}

// ---- Kimyasal ----

function raporKimyasalOzeti() {
  const liste = oku(tenantAnahtar('kimyasal_envanteri'), []).filter(k => k.durum !== 'İptal');
  const bugun = _rpBugun();

  let sdsSuresiGecmis = 0;
  liste.forEach(k => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k.sdsRevizyonTarihi || '')) { sdsSuresiGecmis++; return; }
    const gunFarki = Math.round((new Date(bugun + 'T00:00:00') - new Date(k.sdsRevizyonTarihi + 'T00:00:00')) / 86400000);
    if (gunFarki > 1825) sdsSuresiGecmis++;
  });

  return {
    toplamKayit: liste.length,
    sdsSuresiGecmis,
    kritikSayisi: liste.filter(k => k.riskSeviyesi === 'Kritik').length
  };
}

// ---- Periyodik Kontrol ----

function raporPeriyodikOzeti() {
  const ekipmanlar = oku(tenantAnahtar('periyodik_ekipmanlar'), []).filter(e => !['Pasif', 'Hurda'].includes(e.durum));
  const kontroller = oku(tenantAnahtar('periyodik_kontroller'), []);
  const bugun = _rpBugun();

  let suresiGecti = 0, yaklasiyor = 0, uygunDegil = 0;
  ekipmanlar.forEach(e => {
    const sonKontrol = kontroller
      .filter(k => k.ekipmanId === e.id)
      .sort((a, b) => (b.kontrolTarihi || '').localeCompare(a.kontrolTarihi || ''))[0];
    if (sonKontrol && sonKontrol.sonuc === 'Uygun Değil') { uygunDegil++; return; }
    if (!e.sonrakiKontrolTarihi) return;
    if (e.sonrakiKontrolTarihi < bugun) suresiGecti++;
    else if (_rp30GunSonraMi(e.sonrakiKontrolTarihi, bugun)) yaklasiyor++;
  });

  return { toplamEkipman: ekipmanlar.length, suresiGecti, yaklasiyor, uygunDegil };
}

// ---- İş İzinleri ----

function raporIsIzniOzeti() {
  const liste = oku(tenantAnahtar('is_izinleri'), []);
  const terminal = ['Kapalı', 'Reddedildi', 'İptal'];
  const acik = liste.filter(k => !terminal.includes(k.durum));
  return {
    toplamKayit: liste.length,
    acikSayisi: acik.length,
    onayBekleyen: acik.filter(k => k.onayDurumu === 'Bekliyor').length,
    kritikRiskli: acik.filter(k => k.riskSeviyesi === 'Kritik').length
  };
}

// ---- Acil Durum Ekipleri (Md.11) ve İlkyardımcı Yeterliliği (İlkyardım Yön. Md.19) ----
// Eşikler acil-durum/model.js (MUDAHALE_EKIP_ORANI, ILKYARDIM_ORANI) ile birebir
// aynı tutulur — o modülün eşikleri değişirse burası da güncellenmelidir. Detaylı
// vardiya bazlı değerlendirme için acil-durum modülünün kendi "Uygunluk
// Değerlendirmesi" sekmesine yönlendirilir (bkz. raporlar/ui.js).

const _RP_MUDAHALE_EKIP_ORANI = { 'Çok Tehlikeli': 30, 'Tehlikeli': 40, 'Az Tehlikeli': 50 };
const _RP_ILKYARDIM_ORANI = { 'Çok Tehlikeli': 10, 'Tehlikeli': 15, 'Az Tehlikeli': 20 };

function _rpGerekliMudahaleEkibiSayisi(tehlikeSinifi, calisanSayisi) {
  const sayi = Math.max(0, Number(calisanSayisi || 0));
  if (sayi <= 0) return 0;
  if (sayi < 10) return 1;
  const oran = _RP_MUDAHALE_EKIP_ORANI[tehlikeSinifi] || _RP_MUDAHALE_EKIP_ORANI['Az Tehlikeli'];
  return Math.max(1, Math.ceil(sayi / oran));
}

function _rpGerekliIlkyardimciSayisi(tehlikeSinifi, calisanSayisi) {
  const sayi = Math.max(0, Number(calisanSayisi || 0));
  if (sayi <= 0) return 0;
  const oran = _RP_ILKYARDIM_ORANI[tehlikeSinifi] || _RP_ILKYARDIM_ORANI['Az Tehlikeli'];
  return Math.max(1, Math.ceil(sayi / oran));
}

// İlkyardımcı sayısı, acil-durum modülünün kendi "İlk Yardım" ekip listesi
// yerine Eğitim modülündeki geçerli "İlkyardım Sertifikası" kayıtlarından
// sayılır — kullanıcı tercihi: sertifikalı olup henüz acil durum ekibine
// atanmamış personel de yeterlilik hesabına dahil olsun istendi. Söndürme/
// Kurtarma/Koruma için eğitim modülünde role özel bir eğitim türü olmadığından
// (hepsi tek bir "Acil Durum Ekip Eğitimi"nde toplanıyor) bu üç rol için tek
// kaynak olarak acil-durum modülünün kendi ekip listesi kullanılmaya devam eder.
function _rpGecerliEgitimliPersonelSayisi(turId, firma) {
  const personeller = oku(tenantAnahtar('personel'), []).filter(p => !p.istenCikisTarihi);
  const kayitlar = oku(tenantAnahtar('egitim_kayitlari'), []).filter(k => k.egitimTuruId === turId);
  const tur = _RP_EGITIM_TURLERI.find(t => t.id === turId);

  let sayac = 0;
  personeller.forEach(p => {
    const son = kayitlar
      .filter(k => k.personelId === p.id)
      .sort((a, b) => (b.tarih || '').localeCompare(a.tarih || ''))[0];
    if (!son) return;
    const bitis = _rpEgitimBitisTarihiHesapla(son, tur, firma);
    const durum = _rpEgitimDurumHesapla(tur, bitis);
    if (durum === 'gecerli' || durum === 'yaklasiyor') sayac++;
  });
  return sayac;
}

// acil-durum/model.js'deki _ekipTuruNormallestir ile birebir aynı --
// gerçek dünyadaki içe aktarılmış verilerde ekipTuru büyük/küçük harf,
// baştaki/sondaki boşluk veya "... Ekibi" son ekiyle farklı yazılabiliyor;
// bu dosya diğer modüllerin service.js'ini yüklemediğinden (bkz. dosya başı
// açıklama) aynı fonksiyon burada da kendi önekiyle tekrarlanır.
function _rpEkipTuruNormallestir(tur) {
  return String(tur || '').trim().toLocaleUpperCase('tr').replace(/\s+EKİBİ$/, '').replace(/\s+/g, ' ').trim();
}

function raporAcilDurumYeterlilikOzeti(firma, calisanSayisi) {
  const tehlikeSinifi = (firma && firma.tehlikeSinifi) || 'Az Tehlikeli';
  const mudahale = _rpGerekliMudahaleEkibiSayisi(tehlikeSinifi, calisanSayisi);
  const gereksinimler = {
    'Söndürme': mudahale, 'Kurtarma': mudahale, 'Koruma': mudahale,
    'İlk Yardım': _rpGerekliIlkyardimciSayisi(tehlikeSinifi, calisanSayisi)
  };

  const uyeler = oku(tenantAnahtar('acil_durum_ekipleri'), []);
  const bugun = _rpBugun();
  const aktifMudahaleUyeleri = uyeler.filter(u => u.durum !== 'İptal' && _rpEkipTuruNormallestir(u.ekipTuru) !== _rpEkipTuruNormallestir('İlk Yardım'));

  const atananSayilar = {
    'Söndürme': aktifMudahaleUyeleri.filter(u => _rpEkipTuruNormallestir(u.ekipTuru) === _rpEkipTuruNormallestir('Söndürme')).length,
    'Kurtarma': aktifMudahaleUyeleri.filter(u => _rpEkipTuruNormallestir(u.ekipTuru) === _rpEkipTuruNormallestir('Kurtarma')).length,
    'Koruma': aktifMudahaleUyeleri.filter(u => _rpEkipTuruNormallestir(u.ekipTuru) === _rpEkipTuruNormallestir('Koruma')).length,
    'İlk Yardım': _rpGecerliEgitimliPersonelSayisi('ilkyardim', firma)
  };

  const satirlar = ['Söndürme', 'Kurtarma', 'Koruma', 'İlk Yardım'].map(tur => {
    const gerekli = gereksinimler[tur] || 0;
    const atanan = atananSayilar[tur] || 0;
    const eksik = Math.max(0, gerekli - atanan);
    return { tur, gerekli, atanan, eksik, uygun: gerekli === 0 ? true : atanan >= gerekli };
  });

  const egitimiGecmis = aktifMudahaleUyeleri.filter(u => /^\d{4}-\d{2}-\d{2}$/.test(u.gecerlilikTarihi || '') && u.gecerlilikTarihi < bugun).length;

  return {
    tehlikeSinifi,
    calisanSayisi,
    satirlar,
    uygun: satirlar.every(s => s.uygun),
    toplamEksik: satirlar.reduce((t, s) => t + s.eksik, 0),
    egitimiGecmis
  };
}

// ---- Engelli Çalışan Kotası (İş Kanunu Md.30) ----
// Özel sektör işyerlerinde, aynı il sınırları içinde 50 ve üzerinde işçi
// çalıştırılıyorsa toplam işçi sayısının en az %3'ü engelli olmalıdır (4857
// sayılı İş Kanunu Md.30, Engelli ve Eski Hükümlü Çalıştırma Yönetmeliği).
// 50'nin altındaki işyerlerinde bu zorunluluk yoktur; oran yine de
// bilgilendirme amaçlı hesaplanır. Gerekli sayı hesabında yönetmeliğin
// kesir kuralına uyulur: 0,5 ve üzeri yukarı, altı aşağı yuvarlanır
// (Math.round ile aynı davranış).
const _RP_ENGELLI_KOTA_ORANI = 0.03;
const _RP_ENGELLI_KOTA_ESIK_CALISAN = 50;

function raporEngelliCalisanOzeti() {
  const personeller = oku(tenantAnahtar('personel'), []).filter(p => !p.istenCikisTarihi);
  const toplam = personeller.length;
  const engelliSayisi = personeller.filter(p => p.engelliMi === 'EVET').length;
  const zorunlulukKapsaminda = toplam >= _RP_ENGELLI_KOTA_ESIK_CALISAN;
  const gerekliSayi = zorunlulukKapsaminda ? Math.round(toplam * _RP_ENGELLI_KOTA_ORANI) : 0;

  return {
    toplamCalisan: toplam,
    engelliSayisi,
    oranYuzde: toplam ? Math.round((engelliSayisi / toplam) * 1000) / 10 : 0,
    zorunlulukKapsaminda,
    gerekliSayi,
    eksik: Math.max(0, gerekliSayi - engelliSayisi),
    uygun: !zorunlulukKapsaminda || engelliSayisi >= gerekliSayi
  };
}

// ---- İSG Malzeme Talep ----

function raporMalzemeTalepOzeti() {
  const liste = oku(tenantAnahtar('malzeme_talepleri'), []);
  const terminal = ['Tamamlandı', 'İptal Edildi'];
  return { toplamKayit: liste.length, acikSayisi: liste.filter(t => !terminal.includes(t.durum)).length };
}

// ---- Genel API ----

function raporGenelOzetiHesapla(firma) {
  const personelEgitim = raporPersonelEgitimOzeti(firma);
  return {
    personelEgitim,
    risk: raporRiskOzeti(),
    olayKaza: raporOlayKazaOzeti(),
    uygunsuzluk: raporUygunsuzlukOzeti(),
    kkd: raporKkdOzeti(),
    kimyasal: raporKimyasalOzeti(),
    periyodik: raporPeriyodikOzeti(),
    isIzni: raporIsIzniOzeti(),
    malzemeTalep: raporMalzemeTalepOzeti(),
    acilDurum: raporAcilDurumYeterlilikOzeti(firma, personelEgitim.personelSayisi),
    engelliKotasi: raporEngelliCalisanOzeti(),
    merkeziAksiyon: merkeziAksiyonOzetiHesapla()
  };
}
