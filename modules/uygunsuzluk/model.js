// Uygunsuzluk / DÖF (Düzeltici ve Önleyici Faaliyet) veri modeli.

const UYGUNSUZLUK_DURUMLARI = ['Açık', 'Devam Ediyor', 'Onay Bekliyor', 'Kapalı', 'İptal'];
const ONAY_DURUMLARI = ['Onay Gerekmiyor', 'Onay Bekliyor', 'Onaylandı', 'Reddedildi'];
const RISK_SEVIYELERI = ['Düşük', 'Orta', 'Yüksek', 'Çok Yüksek'];
const KAYNAK_TURLERI = ['Saha Denetimi', 'İş Kazası', 'Ramak Kala', 'Yasal Şart', 'Risk Değerlendirme', 'İSG Kurul', 'JSA (İş Güvenliği Analizi)', 'ÇSGB Denetimi', 'Manuel Bildirim'];

// ÇSGB (Bakanlık iş müfettişi) denetim takibi -- bkz. csgbDenetimOlustur.
const CSGB_DENETIM_TURLERI = ['Programlı Teftiş', 'Şikâyet / İhbar', 'İş Kazası İncelemesi', 'Proje / Kampanya Denetimi', 'SEVESO / BEKRA Denetimi', 'Kontrol (Takip) Denetimi', 'Diğer'];
const CSGB_DENETIM_DURUMLARI = ['Giderme Sürecinde', 'Bakanlığa Bildirildi', 'Kapandı'];

// Eski isg platformundaki ("İlgili Yasal Şartlar" çoklu seçim listesi) ile
// birebir aynı liste — kayıtlar birden fazla mevzuata birden bağlanabilir.
const YASAL_SART_LISTESI = [
  '4857 sayılı İş Kanunu',
  '6331 sayılı İş Sağlığı ve Güvenliği Kanunu',
  'Alt İşverenlik Yönetmeliği',
  'Asansör İşletme, Bakım ve Periyodik Kontrol Yönetmeliği',
  'Asbestle Çalışmalarda Sağlık ve Güvenlik Önlemleri Hakkında Yönetmelik',
  'Asgari Ücret Yönetmeliği',
  'Basınçlı Ekipmanlar Yönetmeliği',
  'Basınçlı Kaplar ve Bu Kapların Muayene Yöntemlerinin Ortak Hükümlerine Dair Yönetmelik',
  'Basit Basınçlı Kaplar Yönetmeliği',
  'Binaların Yangından Korunması Hakkında Yönetmelik',
  'Biyolojik Etkenlerle Maruziyet Risklerinin Önlenmesi Hakkında Yönetmelik',
  'Büyük Endüstriyel Kazaların Önlenmesi ve Etkilerinin Azaltılması Hakkında Yönetmelik',
  'Çalışanların İş Sağlığı ve Güvenliği Eğitimlerinin Usul ve Esasları Hakkında Yönetmelik',
  'Çalışanların Gürültü ile İlgili Risklerden Korunmalarına Dair Yönetmelik',
  'Çalışanların Patlayıcı Ortamların Tehlikelerinden Korunması Hakkında Yönetmelik',
  'Çalışanların Titreşimle İlgili Risklerden Korunmalarına Dair Yönetmelik',
  'Çocuk ve Genç İşçilerin Çalıştırılma Usul ve Esasları Hakkında Yönetmelik',
  'Ekranlı Araçlarla Çalışmalarda Sağlık ve Güvenlik Önlemleri Hakkında Yönetmelik',
  'Elle Taşıma İşleri Yönetmeliği',
  'Gebelik ve Emzirme Dönemindeki Çalışanların Çalıştırılma Şartları Hakkında Yönetmelik',
  'Geçici veya Belirli Süreli İşlerde İş Sağlığı ve Güvenliği Hakkında Yönetmelik',
  'İlkyardım Yönetmeliği',
  'İş Ekipmanlarının Kullanımında Sağlık ve Güvenlik Şartları Yönetmeliği',
  'İş Hijyeni Ölçüm, Test ve Analizi Hakkında Yönetmelik',
  'İş Güvenliği Uzmanlarının Görev, Yetki, Sorumluluk ve Eğitimleri Hakkında Yönetmelik',
  'İş Kanununa İlişkin Çalışma Süreleri Yönetmeliği',
  'İş Kanununa İlişkin Fazla Çalışma ve Fazla Sürelerle Çalışma Yönetmeliği',
  'İş Sağlığı ve Güvenliği Hizmetleri Yönetmeliği',
  'İş Sağlığı ve Güvenliği Kurulları Hakkında Yönetmelik',
  'İş Sağlığı ve Güvenliği Risk Değerlendirmesi Yönetmeliği',
  'İşyeri Bina ve Eklentilerinde Alınacak Sağlık ve Güvenlik Önlemlerine İlişkin Yönetmelik',
  'İşyeri Hekimi ve Diğer Sağlık Personelinin Görev, Yetki, Sorumluluk ve Eğitimleri Hakkında Yönetmelik',
  'İşyerinde Acil Durumlar Hakkında Yönetmelik',
  'İşyerlerinde İşin Durdurulmasına Dair Yönetmelik',
  'Kadın Çalışanların Gece Postalarında Çalıştırılma Koşulları Hakkında Yönetmelik',
  'Kanserojen ve Mutajen Maddelerle Çalışmalarda Sağlık ve Güvenlik Önlemleri Hakkında Yönetmelik',
  'Kimyasal Maddelerle Çalışmalarda Sağlık ve Güvenlik Önlemleri Hakkında Yönetmelik',
  'Kişisel Koruyucu Donanım Yönetmeliği',
  'Kişisel Koruyucu Donanımların İşyerlerinde Kullanılması Hakkında Yönetmelik',
  'Makina Emniyeti Yönetmeliği',
  'Maden İşyerlerinde İş Sağlığı ve Güvenliği Yönetmeliği',
  'Muhtemel Patlayıcı Ortamda Kullanılan Teçhizat ve Koruyucu Sistemler ile İlgili Yönetmelik',
  'Patlamadan Korunma Dokümanı Rehberi',
  'Parlayıcı, Patlayıcı, Tehlikeli ve Zararlı Maddelerle Çalışılan İşyerlerinde ve İşlerde Alınacak Tedbirler Hakkında Tüzük',
  'Postalar Halinde İşçi Çalıştırılarak Yürütülen İşlerde Çalışmalara İlişkin Özel Usul ve Esaslar Hakkında Yönetmelik',
  'Sağlık ve Güvenlik İşaretleri Yönetmeliği',
  'Sağlık ve Güvenlik Dokümanı Hakkında Yönetmelik',
  'Tehlikeli ve Çok Tehlikeli Sınıfta Yer Alan İşlerde Çalıştırılacakların Mesleki Eğitimlerine Dair Yönetmelik',
  'Tehlikeli Maddelerin Karayoluyla Taşınması Hakkında Yönetmelik (ADR)',
  'Tehlikeli Kimyasallar Yönetmeliği',
  'Tozla Mücadele Yönetmeliği',
  'Yapı İşlerinde Sağlık ve Güvenlik Yönetmeliği',
  'Yüksekte Çalışmalarda İş Sağlığı ve Güvenliği Rehberi',
  'Elektrik İç Tesisleri Yönetmeliği',
  'Elektrik Tesislerinde Topraklamalar Yönetmeliği',
  'Elektrik Kuvvetli Akım Tesisleri Yönetmeliği',
  'Kaldırma ve İletme Ekipmanlarının Periyodik Kontrollerine İlişkin Tebliğ',
  'Basınçlı Kap ve Tesisatların Periyodik Kontrollerine İlişkin Tebliğ',
  'Atık Yönetimi Yönetmeliği',
  'Çevre İzin ve Lisans Yönetmeliği',
  'Su Kirliliği Kontrolü Yönetmeliği',
  'Hava Kalitesi Değerlendirme ve Yönetimi Yönetmeliği',
  'Endüstriyel Kaynaklı Hava Kirliliğinin Kontrolü Yönetmeliği',
  'Tehlikeli Atıkların Kontrolü Yönetmeliği',
  'Kapalı Alanlarda Güvenli Çalışma Prosedürleri',
  'Sıcak İşler (Kaynak, Kesme vb.) Güvenlik Kuralları',
  'LOTO (Lockout-Tagout) Enerji İzolasyon Prosedürleri',
  'SEVESO Direktifi Uyum Yönetmelikleri',
  'ISO 45001 İş Sağlığı ve Güvenliği Yönetim Sistemi',
  'ISO 14001 Çevre Yönetim Sistemi'
];

function bugunIso() {
  return new Date().toISOString().slice(0, 10);
}

function aksiyonOnEkiUret(bolum) {
  const harfEslesme = { ç: 'C', ğ: 'G', ı: 'I', ö: 'O', ş: 'S', ü: 'U', İ: 'I' };
  const temiz = (bolum || 'AKS')
    .split('')
    .map(k => harfEslesme[k] || k)
    .join('')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 3);
  return (temiz || 'AKS').padEnd(3, 'X');
}

// Numaralandırma her yıl yeniden 1'den başlar (kullanıcı isteği), bölüm
// bazında. Yıl, sayının sonuna ".YYYY" olarak eklenir (ör. "TOR0007.2026").
// Hangi kaydın hangi yıla ait olduğu, aksiyonNo'nun kendisinden değil (eski
// kayıtlarda yıl eki yoktu) o kaydın bildirimTarihi'nden okunur — böylece
// yıl içinde eklenen eski-formatlı kayıtlar da sayaca dahil olur, sadece
// takvim yılı değiştiğinde sayaç doğal olarak sıfırlanır.
function sonrakiAksiyonNoUret(bolum, mevcutListe, yilStr) {
  const onEk = aksiyonOnEkiUret(bolum);
  const yil = yilStr || String(new Date().getFullYear());
  let maks = 0;
  mevcutListe.forEach(item => {
    const no = String(item.aksiyonNo || '');
    if (!no.startsWith(onEk)) return;
    if (String(item.bildirimTarihi || '').slice(0, 4) !== yil) return;
    const kuyruk = parseInt(no.slice(3).split('.')[0], 10);
    if (Number.isFinite(kuyruk) && kuyruk > maks) maks = kuyruk;
  });
  return onEk + String(maks + 1).padStart(4, '0') + '.' + yil;
}

function uygunsuzlukGecikmisMi(kayit, bugunStr) {
  if (kayit.durum === 'Kapalı' || kayit.durum === 'İptal') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(kayit.termin || '')) return false;
  return kayit.termin < (bugunStr || bugunIso());
}

// Uygunsuzluk Konusu / Defteri: eski üretim uygulamasındaki gibi kayıtları
// isimli gruplara (ör. "Çsgb Seveso Denetimi") ayırmaya yarar. Silme yok —
// eski uygulamada da sadece oluşturma/yeniden adlandırma vardı.
// Bildirim Formu PDF'indeki "Onay" bölümünde (kaşe/imza kutuları) gösterilen
// dijital imza kaydı -- is-izni/model.js izinImzaVeriUret ile aynı şekil
// (ad/imzaUrl/tarih), bu modülün kendi kaydına ('bildiren'/'sorumlu' rolü
// altında) yazılır.
function uygunsuzlukImzaVeriUret(ad, imzaUrl) {
  return { ad: (ad || '').trim(), imzaUrl: imzaUrl || '', tarih: new Date().toISOString() };
}

function uygunsuzlukKonuOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    ad: (veriler.ad || '').trim(),
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}

// ÇSGB Denetimi: müfettiş denetiminin künyesi. Denetimde yazılan maddeler ayrı
// bir varlık DEĞİL -- normal uygunsuzluk kayıtlarıdır ve denetimin bağlı olduğu
// konuda (konuId) tutulur; ilerleme/kalan gün o konunun kayıtlarından hesaplanır.
function csgbDenetimOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    konuId: veriler.konuId || '',
    denetimTarihi: veriler.denetimTarihi || '',
    denetimTuru: veriler.denetimTuru || CSGB_DENETIM_TURLERI[0],
    mufettisler: (veriler.mufettisler || '').trim(),
    raporNo: (veriler.raporNo || '').trim(),
    raporTarihi: veriler.raporTarihi || '',
    tebligTarihi: veriler.tebligTarihi || '',
    verilenSureGun: veriler.verilenSureGun !== undefined && veriler.verilenSureGun !== '' ? Number(veriler.verilenSureGun) || 0 : '',
    sonGidermeTarihi: veriler.sonGidermeTarihi || '',
    bildirimTarihi: veriler.bildirimTarihi || '',
    durum: CSGB_DENETIM_DURUMLARI.includes(veriler.durum) ? veriler.durum : CSGB_DENETIM_DURUMLARI[0],
    notlar: (veriler.notlar || '').trim(),
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}

// Denetimin maddelerini gidermek için dönemsel takip toplantısı.
// maddeNotlari: { <uygunsuzluk kayıt id>: 'o toplantıda konuşulan/yapılan' }.
function csgbToplantiOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    denetimId: veriler.denetimId || '',
    tarih: veriler.tarih || bugunIso(),
    yer: (veriler.yer || '').trim(),
    katilimcilar: (veriler.katilimcilar || '').trim(),
    genelNotlar: (veriler.genelNotlar || '').trim(),
    maddeNotlari: veriler.maddeNotlari && typeof veriler.maddeNotlari === 'object' ? veriler.maddeNotlari : {},
    sonrakiToplantiTarihi: veriler.sonrakiToplantiTarihi || '',
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}

// Rapordaki madde numaralarını (1, 2, 5, 5.a, 5b, 29.b, 31.c) doğal sırayla
// karşılaştırır: önce baştaki sayı, sonra kalan harf/ek.
function csgbMaddeNoKarsilastir(a, b) {
  const ayir = s => {
    const m = String(s || '').trim().match(/^(\d+)\s*[.\-)]?\s*(.*)$/);
    return m ? [Number(m[1]), m[2].toLocaleLowerCase('tr')] : [Infinity, String(s || '').toLocaleLowerCase('tr')];
  };
  const [an, ae] = ayir(a);
  const [bn, be] = ayir(b);
  return an !== bn ? an - bn : ae.localeCompare(be, 'tr');
}

// Madde tamamlanma yüzdesi seçenekleri (ÇSGB takibi).
const CSGB_YUZDE_SECENEKLERI = [0, 25, 50, 75, 100];

// "50", "%50", 50, 0.5 (Excel yüzde hücresi) -> 50; boş/geçersiz -> 0.
function csgbYuzdeNormallestir(deger) {
  if (deger === undefined || deger === null || String(deger).trim() === '') return 0;
  let n = Number(String(deger).replace('%', '').replace(',', '.').trim());
  if (!Number.isFinite(n)) return 0;
  if (n > 0 && n <= 1 && !String(deger).includes('%')) n = n * 100;
  return Math.max(0, Math.min(100, Math.round(n)));
}

// Kapalı (tamamlanan) madde her zaman %100 sayılır.
function csgbMaddeYuzdesi(kayit) {
  return kayit.durum === 'Kapalı' ? 100 : csgbYuzdeNormallestir(kayit.tamamlanmaYuzdesi);
}

// Tebliğ tarihine verilen gün eklenerek son giderme tarihi (YYYY-MM-DD).
function csgbSonGidermeTarihiHesapla(tebligTarihi, gun) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tebligTarihi || '') || !(Number(gun) > 0)) return '';
  const [y, a, g] = tebligTarihi.split('-').map(Number);
  const t = new Date(y, a - 1, g + Number(gun));
  return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
}

function uygunsuzlukKaydiOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    aksiyonNo: veriler.aksiyonNo || '',

    konuId: veriler.konuId || '',
    konuAdi: (veriler.konuAdi || '').trim(),

    // ÇSGB denetim maddeleri için: rapordaki madde numarası (ör. "31.c") ve
    // maddenin kısa konusu. Diğer kayıtlarda boş kalır.
    denetimMaddeNo: String(veriler.denetimMaddeNo || '').trim(),
    maddeKonusu: (veriler.maddeKonusu || '').trim(),
    tamamlanmaYuzdesi: csgbYuzdeNormallestir(veriler.tamamlanmaYuzdesi),

    baslik: (veriler.baslik || '').trim(),
    aciklama: (veriler.aciklama || '').trim(),
    bolum: (veriler.bolum || '').trim(),
    lokasyon: (veriler.lokasyon || '').trim(),
    kaynakTuru: veriler.kaynakTuru || 'Manuel Bildirim',
    riskSeviyesi: veriler.riskSeviyesi || 'Orta',

    kokNeden: (veriler.kokNeden || '').trim(),
    duzelticiFaaliyet: (veriler.duzelticiFaaliyet || '').trim(),

    sorumlu: (veriler.sorumlu || '').trim(),
    atayan: (veriler.atayan || '').trim(),

    // İlgililer: SADECE "Mail Gönder" için kullanılır -- tabloda, PDF/Excel
    // çıktılarında veya başka hiçbir yerde gösterilmez (kullanıcı isteği).
    // Virgülle ayrılmış birden fazla adres girilebilir.
    ilgiliKime: (veriler.ilgiliKime || '').trim(),
    ilgiliBilgi: (veriler.ilgiliBilgi || '').trim(),
    bildirimTarihi: veriler.bildirimTarihi || bugunIso(),
    termin: veriler.termin || '',
    kapanisTarihi: veriler.kapanisTarihi || '',

    onayGerekliMi: veriler.onayGerekliMi !== undefined ? !!veriler.onayGerekliMi : true,
    onayDurumu: veriler.onayDurumu || 'Onay Bekliyor',
    onaylayan: (veriler.onaylayan || '').trim(),
    onayTarihi: veriler.onayTarihi || '',
    redSebebi: (veriler.redSebebi || '').trim(),
    kanitAciklamasi: (veriler.kanitAciklamasi || '').trim(),

    maliyet: (veriler.maliyet || '').trim(),
    satinAlmaDurumu: (veriler.satinAlmaDurumu || '').trim(),
    yasalSartlar: Array.isArray(veriler.yasalSartlar) ? veriler.yasalSartlar.filter(Boolean) : [],
    yasalDayanak: (veriler.yasalDayanak || '').trim(),

    fotoOncesi: veriler.fotoOncesi || '',
    fotoSonrasi: veriler.fotoSonrasi || '',
    fotoOncesi2: veriler.fotoOncesi2 || '',
    fotoSonrasi2: veriler.fotoSonrasi2 || '',
    fotoOncesi3: veriler.fotoOncesi3 || '',
    fotoSonrasi3: veriler.fotoSonrasi3 || '',
    fotoOncesi4: veriler.fotoOncesi4 || '',
    fotoSonrasi4: veriler.fotoSonrasi4 || '',

    // Birden fazla kanıt: [{ id, ad, tur: 'foto'|'pdf', ref: 'fotoref:..', tarih }]
    // (bkz. core/belge-yukle.js belgeDosyasiIsle).
    kanitlar: Array.isArray(veriler.kanitlar) ? veriler.kanitlar.filter(k => k && k.ref) : [],

    durum: veriler.durum || 'Açık',
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString(),

    // Saha Dijital Haritası köprüsü — bkz. modules/harita. Kaydın haritada
    // işaretlendiği tesis ve o tesisin görseli üzerindeki yüzde konumu
    // (x/y). Boşsa kayıt haritada henüz işaretlenmemiş demektir.
    haritaTesisId: veriler.haritaTesisId || '',
    haritaX: veriler.haritaX !== undefined ? veriler.haritaX : '',
    haritaY: veriler.haritaY !== undefined ? veriler.haritaY : '',

    // Bildirim Formu'ndaki Onay bölümü için dijital imzalar --
    // { bildiren: {ad, imzaUrl, tarih}, sorumlu: {ad, imzaUrl, tarih} }.
    imzalar: veriler.imzalar || {}
  };
}
