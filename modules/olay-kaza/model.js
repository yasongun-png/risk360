// Olay / Kaza Takibi veri modeli.
// Risk puanlama Fine-Kinney yöntemini kullanır (bkz. ../risk/model.js — aynı ölçek/eşikler
// tekrarlanmadan burada da kullanılır: OLASILIK_SECENEKLERI, FREKANS_SECENEKLERI,
// SIDDET_SECENEKLERI, riskPuaniHesapla, riskDuzeyiGetir).

const OLAY_TIPLERI = [
  'Ramak Kala', 'Tehlike Bildirimi', 'İlk Yardım', 'Tıbbi Tedavi', 'Kayıp Gün (LTI)', 'Kısıtlı İş / Transfer (DART)', 'Maddi Hasar', 'Çevresel Olay', 'Ölüm',
  // Acil durum türü olaylar — kullanıcı isteği: "yangın vb. acil durum
  // olaylarını da seçebileyim" (İşyerlerinde Acil Durumlar Hakkında Yönetmelik'te
  // sayılan tehlike kaynaklarına paralel).
  'Yangın', 'Patlama', 'Doğal Afet (Deprem/Sel/Fırtına)', 'Gaz Kaçağı/Sızıntısı', 'Kimyasal Sızıntı/Dökülme', 'Sabotaj/Güvenlik Olayı', 'Tahliye', 'Diğer Acil Durum'
];
const YARALANMA_TURLERI = ['Kesik/Sıyrık', 'Delinme/Batma', 'Ezilme', 'Burkulma', 'Çıkık', 'Kırık', 'Kas Zorlanması', 'Düşme', 'Kayma/Takılma', 'Çarpma/Vurma', 'Sıkışma', 'Amputasyon', 'Elektrik Çarpması', 'Patlama Basıncı', 'Yanık (Termal)', 'Yanık (Kimyasal)', 'Yanık (Elektrik)', 'Kimyasal Temas', 'Göz Teması', 'Solunum Maruziyeti', 'Gaz Maruziyeti', 'Toz Maruziyeti', 'Zehirlenme', 'Boğulma', 'İşitme Hasarı', 'Titreşim Kaynaklı Yaralanma', 'Kas-İskelet Sistemi Yaralanması', 'Bel İncinmesi', 'Boyun İncinmesi', 'Omuz Yaralanması', 'Diz Yaralanması', 'Alerjik Reaksiyon', 'Enfeksiyon/Biyolojik Maruziyet', 'Bayılma', 'Isı Stresi', 'Soğuk Maruziyeti', 'Psikolojik Travma', 'Ölümcül Yaralanma', 'Diğer'];
const OLAY_DURUMLARI = ['Açık', 'Kapalı'];

// Bu tiplerde bir yaralı/mağdur olması doğası gereği beklenir, bu yüzden
// "İlgili Personel" (Kişi Bilgileri) alanı zorunlu tutulur — diğer tiplerde
// (Ramak Kala, Maddi Hasar, Çevresel Olay ve tüm acil durum türleri: Yangın,
// Patlama, Doğal Afet, vb.) yaralanma olmayabilir, kullanıcı isteği gereği
// kişi girişi zorunlu değildir (bkz. validation.js olayKaydiDogrula).
const OLAY_KISI_ZORUNLU_TIPLERI = ['İlk Yardım', 'Tıbbi Tedavi', 'Kayıp Gün (LTI)', 'Kısıtlı İş / Transfer (DART)', 'Ölüm'];

// İş kazası/olay soruşturma raporlarında sık referans edilen İSG mevzuatı —
// kullanıcı isteği: serbest metin yerine listeden seçilsin (bkz. index.html
// "İlgili Mevzuat" bölümü + ui.js _mevzuatKutulariCiz). Kayıt hâlâ
// ilgiliMevzuat alanında satır satır (newline-join) string olarak tutulur
// (cikti.js/service.js zaten bu biçimi bekliyor) — liste dışı özel bir madde
// için formda ayrıca "Diğer" serbest metin kutusu bırakıldı.
const MEVZUAT_LISTESI = [
  '6331 Sayılı İş Sağlığı ve Güvenliği Kanunu',
  '4857 Sayılı İş Kanunu',
  '5510 Sayılı Sosyal Sigortalar ve Genel Sağlık Sigortası Kanunu (Md. 13-14, İş Kazası Bildirimi)',
  'İş Sağlığı ve Güvenliği Risk Değerlendirmesi Yönetmeliği',
  'İş Sağlığı ve Güvenliği Kurulları Hakkında Yönetmelik',
  'İş Güvenliği Uzmanlarının Görev, Yetki, Sorumluluk ve Eğitimleri Hakkında Yönetmelik',
  'İşyeri Hekimi ve Diğer Sağlık Personelinin Görev, Yetki, Sorumluluk ve Eğitimleri Hakkında Yönetmelik',
  'İş Sağlığı ve Güvenliği Hizmetleri Yönetmeliği',
  'Çalışanların İş Sağlığı ve Güvenliği Eğitimlerinin Usul ve Esasları Hakkında Yönetmelik',
  'İşyeri Bina ve Eklentilerinde Alınacak Sağlık ve Güvenlik Önlemlerine İlişkin Yönetmelik',
  'Kişisel Koruyucu Donanımların İşyerlerinde Kullanılması Hakkında Yönetmelik',
  'İş Ekipmanlarının Kullanımında Sağlık ve Güvenlik Şartlarına Dair Yönetmelik',
  'İş Sağlığı ve Güvenliğine İlişkin İşyeri Tehlike Sınıfları Tebliği',
  'İşyerlerinde Acil Durumlar Hakkında Yönetmelik',
  'Binaların Yangından Korunması Hakkında Yönetmelik',
  'Elle Taşıma İşleri Yönetmeliği',
  'Ekranlı Araçlarla Çalışmalarda Sağlık ve Güvenlik Önlemleri Hakkında Yönetmelik',
  'Çalışanların Gürültü ile İlgili Risklerden Korunmalarına Dair Yönetmelik',
  'Çalışanların Titreşimle İlgili Risklerden Korunmalarına Dair Yönetmelik',
  'Kimyasal Maddelerle Çalışmalarda Sağlık ve Güvenlik Önlemleri Hakkında Yönetmelik',
  'Kanserojen veya Mutajen Maddelerle Çalışmalarda Sağlık ve Güvenlik Önlemleri Hakkında Yönetmelik',
  'Tozla Mücadele Yönetmeliği',
  'Biyolojik Etkenlere Maruziyet Risklerinin Önlenmesi Hakkında Yönetmelik',
  'Patlayıcı Ortamların Tehlikelerinden Çalışanların Korunması Hakkında Yönetmelik',
  'Asbestle Çalışmalarda Sağlık ve Güvenlik Önlemleri Hakkında Yönetmelik',
  'Yapı İşlerinde İş Sağlığı ve Güvenliği Yönetmeliği',
  'Maden İşyerlerinde İş Sağlığı ve Güvenliği Yönetmeliği',
  'Geçici veya Belirli Süreli İşlerde İş Sağlığı ve Güvenliği Hakkında Yönetmelik',
  'Gebe veya Emziren Kadınların Çalıştırılma Şartlarıyla Emzirme Odaları ve Çocuk Bakım Yurtlarına Dair Yönetmelik',
  'Çocuk ve Genç İşçilerin Çalıştırılma Usul ve Esasları Hakkında Yönetmelik',
  'Sağlık Kuralları Bakımından Günde Ancak Yedi Buçuk Saat veya Daha Az Çalışılması Gereken İşler Hakkında Yönetmelik',
  'İşyeri Sağlık ve Güvenlik Birimleri ile Ortak Sağlık ve Güvenlik Birimleri Hakkında Yönetmelik'
];
const AKSIYON_DURUMLARI = ['Açık', 'Devam', 'Tamamlandı', 'İptal'];

function bugunIso() {
  return new Date().toISOString().slice(0, 10);
}

function sonrakiNoUret(onEk, mevcutListe, alanAdi) {
  let maks = 0;
  mevcutListe.forEach(item => {
    const m = String(item[alanAdi] || '').match(/(\d+)$/);
    if (m) maks = Math.max(maks, parseInt(m[1], 10));
  });
  return onEk + String(maks + 1).padStart(4, '0');
}

// Kayıt numarası formatı: "KZ01/2026" — sıra numarası + yıl. Yıl değiştiğinde
// sıra otomatik olarak 1'den başlar (sadece o yıla ait "/YYYY" son ekiyle
// biten mevcut kayıtlar sayılır) — kullanıcı isteği: "kaza numaralansın
// KZ01/2026 yani yıl ve kaçıncı kaza olduğunu da gösterelim".
function sonrakiKayitNoUret(mevcutListe) {
  const yil = new Date().getFullYear();
  const sonEk = '/' + yil;
  let maks = 0;
  mevcutListe.forEach(item => {
    const kayitNo = String(item.kayitNo || '');
    if (!kayitNo.endsWith(sonEk)) return;
    const sayi = parseInt(kayitNo.slice(2, kayitNo.length - sonEk.length), 10);
    if (Number.isFinite(sayi) && sayi > maks) maks = sayi;
  });
  return 'KZ' + String(maks + 1).padStart(2, '0') + sonEk;
}

// Uygunsuzluk (Düzeltici/Önleyici Faaliyet) satırı — alan adları gerçek
// Uygunsuzluk modülüyle (modules/uygunsuzluk/model.js) bilerek aynı tutuldu
// (baslik/duzelticiFaaliyet) ki her satır otomatik aktarılırken (bkz.
// service.js -> _aksiyonlariUygunsuzluguYaz) hem kavramsal hem isim olarak
// gerçek bir uygunsuzluk kaydıyla birebir örtüşsün.
function aksiyonOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    // veriler.bulgu / veriler.faaliyet: bu alanlar "baslik"/"duzelticiFaaliyet"
    // olarak yeniden adlandırılmadan ÖNCE (bu oturumda) kaydedilmiş gerçek
    // kayıtlarda hâlâ eski adlarla duruyor — geriye dönük uyumluluk için
    // düşülür, yoksa o kayıtlar açılırken "Cannot read properties of
    // undefined (reading 'replace')" hatasıyla Düzenle'nin çökmesine sebep olur.
    baslik: (veriler.baslik || veriler.bulgu || '').trim(),
    duzelticiFaaliyet: (veriler.duzelticiFaaliyet || veriler.faaliyet || '').trim(),
    sorumlu: (veriler.sorumlu || '').trim(),
    termin: veriler.termin || '',
    durum: veriler.durum || 'Açık',
    kanit: (veriler.kanit || '').trim()
  };
}

// Olay Kronolojisi satırı (saat + gelişme) — kaza anına kadarki ve sonraki
// dakika dakika gelişmeleri tutar.
function kronolojiSatiriOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    saat: (veriler.saat || '').trim(),
    gelisme: (veriler.gelisme || '').trim()
  };
}

// Tanık ifadesi satırı.
function tanikOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    adSoyad: (veriler.adSoyad || '').trim(),
    unvan: (veriler.unvan || '').trim(),
    ifade: (veriler.ifade || '').trim()
  };
}

function olayKaydiOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    kayitNo: veriler.kayitNo || '',

    olayTipi: veriler.olayTipi || 'Ramak Kala',
    kazaTarihi: veriler.kazaTarihi || '',
    kazaSaati: veriler.kazaSaati || '',
    bolum: (veriler.bolum || '').trim(),
    kazaYeri: (veriler.kazaYeri || '').trim(),
    // Olay yeri fotoğrafları — en fazla 3 (bkz. kurul modülündeki kararFotoEk
    // ile aynı desen); kurul toplantısına "iş kazası" olarak çekilen olaylarda
    // bu fotoğraflar toplantı raporunda da gösterilir (bkz. kurul/service.js
    // toplantiOlaylariniGetir + kurul/cikti.js).
    olayYeriFotograflari: Array.isArray(veriler.olayYeriFotograflari) ? veriler.olayYeriFotograflari.slice(0, 3) : [],

    personelId: veriler.personelId || '',
    // Personel başka bir firmadan (aynı kullanıcının yönettiği) seçildiyse o
    // firmanın id'sini tutar; kendi firmasından seçildiyse boştur. Personel
    // kayıtları firma-bağımsız DEĞİLDİR (tenantAnahtar ile izole) — bu alan
    // olmadan hangi firmanın personel listesinde arama yapılacağı bilinemez.
    personelFirmaId: (veriler.personelFirmaId || '').trim(),
    adSoyad: (veriler.adSoyad || '').trim(),
    sicilNo: (veriler.sicilNo || '').trim(),
    gorev: (veriler.gorev || '').trim(),
    iseGirisTarihi: veriler.iseGirisTarihi || '',
    magdurYasi: veriler.magdurYasi === '' || veriler.magdurYasi == null ? null : Number(veriler.magdurYasi),

    yaralanmaTuru: veriler.yaralanmaTuru || '',
    yaralananUzuv: (veriler.yaralananUzuv || '').trim(),
    kayipGun: veriler.kayipGun === '' || veriler.kayipGun == null ? null : Number(veriler.kayipGun),
    dartGun: veriler.dartGun === '' || veriler.dartGun == null ? null : Number(veriler.dartGun),

    tehlikeliMadde: (veriler.tehlikeliMadde || '').trim(),
    tanikSayisi: veriler.tanikSayisi === '' || veriler.tanikSayisi == null ? null : Number(veriler.tanikSayisi),

    isTanimi: (veriler.isTanimi || '').trim(),
    aciklama: (veriler.aciklama || '').trim(),
    potansiyelSonuc: (veriler.potansiyelSonuc || '').trim(),

    kronoloji: Array.isArray(veriler.kronoloji) ? veriler.kronoloji.map(kronolojiSatiriOlustur) : [],
    tanikIfadeleri: Array.isArray(veriler.tanikIfadeleri) ? veriler.tanikIfadeleri.map(tanikOlustur) : [],

    fkO: veriler.fkO || '',
    fkF: veriler.fkF || '',
    fkS: veriler.fkS || '',

    // 5N1K (Ne/Nerede/Ne Zaman/Kim/Nasıl/Neden) — gerçek kaza araştırma
    // raporlarında standart kök neden tekniği; eski ayrı "5 Neden" + serbest
    // doğrudan/temel neden alanlarının yerini alır.
    analizNe: (veriler.analizNe || '').trim(),
    analizNerede: (veriler.analizNerede || '').trim(),
    analizNeZaman: (veriler.analizNeZaman || '').trim(),
    analizKim: (veriler.analizKim || '').trim(),
    analizNasil: (veriler.analizNasil || '').trim(),
    analizNeden: (veriler.analizNeden || '').trim(),

    // Satır satır (her satır bir mevzuat/madde) serbest metin — sabit bir
    // listeye zorlamak yerine soruşturmacının ilgili gördüğü maddeleri
    // yazmasına izin verir.
    ilgiliMevzuat: (veriler.ilgiliMevzuat || '').trim(),

    // .map(aksiyonOlustur) İLE — ham diziyi olduğu gibi geçirmek DEĞİL: her
    // satır kendi normalize/varsayılan-doldurma mantığından (ve yukarıdaki
    // eski alan adı uyumluluğundan) geçmeli, yoksa eski satırlarda ".baslik"
    // gibi alanlar undefined kalıp arayüzde çökmeye yol açar.
    aksiyonlar: Array.isArray(veriler.aksiyonlar) ? veriler.aksiyonlar.map(aksiyonOlustur) : [],

    sonucDegerlendirme: (veriler.sonucDegerlendirme || '').trim(),

    // Rapor üst bilgisi / imza alanları (Hazırlayan, Soruşturma Ekibi Üyesi,
    // Onaylayan) — gerçek rapor örneğindeki 3 imzalı kapanış formatı.
    hazirlayanAdi: (veriler.hazirlayanAdi || '').trim(),
    hazirlayanUnvan: (veriler.hazirlayanUnvan || '').trim(),
    ekipUyesiAdi: (veriler.ekipUyesiAdi || '').trim(),
    ekipUyesiUnvan: (veriler.ekipUyesiUnvan || '').trim(),
    onaylayanAdi: (veriler.onaylayanAdi || '').trim(),
    onaylayanUnvan: (veriler.onaylayanUnvan || '').trim(),
    kazaSinifi: (veriler.kazaSinifi || '').trim(),
    sorusturmaBaslangic: veriler.sorusturmaBaslangic || '',
    sorusturmaBitis: veriler.sorusturmaBitis || '',

    kapanisTarihi: veriler.kapanisTarihi || '',
    durum: veriler.durum || 'Açık',

    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}

// Kayıt tipine göre Fine-Kinney puanı (fkRP) hesaplar; O/F/S boşsa null döner.
function fineKinneyPuaniHesapla(kayit) {
  if (!kayit.fkO || !kayit.fkF || !kayit.fkS) return null;
  return riskPuaniHesapla(kayit.fkO, kayit.fkF, kayit.fkS);
}

// OSHA benzeri standart iş güvenliği oranları (yıllık çalışılan saate göre).
// TRIR: Toplam Kayıt Edilebilir Olay Oranı, LTIFR: Kayıp Günlü Olay Sıklık Oranı,
// Şiddet Oranı: kayıp gün / çalışılan saat, DART Oranı: LTI+DART / çalışılan saat.
function guvenlikOranlariniHesapla(kayitlar, yillikCalismaSaati) {
  const saat = Number(yillikCalismaSaati || 0);
  const sayac = (tip) => kayitlar.filter(k => k.olayTipi === tip).length;

  const lti = sayac('Kayıp Gün (LTI)');
  const dart = sayac('Kısıtlı İş / Transfer (DART)');
  const tibbi = sayac('Tıbbi Tedavi');
  const olum = sayac('Ölüm');
  const ilkYardim = sayac('İlk Yardım');
  const ramakKala = sayac('Ramak Kala');
  const kayitEdilebilir = lti + dart + tibbi + olum;
  const toplamKayipGun = kayitlar.reduce((t, k) => t + (k.kayipGun || 0), 0);

  return {
    lti, dart, tibbi, olum, ilkYardim, ramakKala,
    kayitEdilebilir,
    toplamKayipGun,
    TRIR: saat ? (kayitEdilebilir * 200000) / saat : 0,
    LTIFR: saat ? (lti * 1000000) / saat : 0,
    siddetOrani: saat ? (toplamKayipGun * 1000000) / saat : 0,
    DARTOrani: saat ? ((lti + dart) * 200000) / saat : 0
  };
}
