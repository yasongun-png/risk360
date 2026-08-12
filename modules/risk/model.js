// Risk Değerlendirmesi veri modeli.
// İki yöntem desteklenir: Fine-Kinney (Risk Puanı = Olasılık × Frekans × Şiddet)
// ve 5x5 Matris (Olasılık × Şiddet çarpımına dayalı basit risk matrisi),
// 5x5 skala). Yöntem kayıt bazında seçilir (bkz. risk.yontem).

const RISK_YONTEMLERI = ['Fine-Kinney', '5x5'];

const RISK_DURUMLARI = ['Açık', 'Devam Ediyor', 'Kapalı', 'Gecikmiş', 'İptal'];

// Standart Fine-Kinney ölçekleri (Türkiye'de yaygın kullanılan referans tablo).
const OLASILIK_SECENEKLERI = [
  { deger: 0.2, etiket: '0.2 - Neredeyse imkansız' },
  { deger: 0.5, etiket: '0.5 - Mümkün fakat çok düşük ihtimal' },
  { deger: 1, etiket: '1 - Zayıf ihtimal' },
  { deger: 3, etiket: '3 - Mümkün' },
  { deger: 6, etiket: '6 - Muhtemel' },
  { deger: 10, etiket: '10 - Kaçınılmaz / Kesin' }
];

const FREKANS_SECENEKLERI = [
  { deger: 0.5, etiket: '0.5 - Çok nadir (yılda birkaç kez)' },
  { deger: 1, etiket: '1 - Nadir (ayda bir)' },
  { deger: 2, etiket: '2 - Bazen (haftada bir)' },
  { deger: 3, etiket: '3 - Sıklıkla (günde bir)' },
  { deger: 6, etiket: '6 - Sürekli (vardiya boyunca birkaç kez)' },
  { deger: 10, etiket: '10 - Devamlı maruziyet' }
];

const SIDDET_SECENEKLERI = [
  { deger: 1, etiket: '1 - Önemsiz (ilk yardım)' },
  { deger: 3, etiket: '3 - Az (hafif yaralanma)' },
  { deger: 7, etiket: '7 - Orta (kırık, geçici iş göremezlik)' },
  { deger: 15, etiket: '15 - Ciddi (kalıcı sakatlık)' },
  { deger: 40, etiket: '40 - Çok ciddi (tek kişi ölümü)' },
  { deger: 100, etiket: '100 - Katastrofik (çoklu ölüm)' }
];

// minExclusive: bu değerden BÜYÜK puanlar bu seviyeye girer.
const RISK_DUZEYLERI = [
  { minExclusive: 400, etiket: 'Tolerans Gösterilemez', aksiyon: 'Hemen önlem alınmalı' },
  { minExclusive: 200, etiket: 'Esaslı Risk', aksiyon: 'Kısa dönemde iyileştirilmeli' },
  { minExclusive: 70, etiket: 'Önemli Risk', aksiyon: 'Uzun dönemde iyileştirilmeli' },
  { minExclusive: 20, etiket: 'Olası Risk', aksiyon: 'Gözetim altında tutulmalı' },
  { minExclusive: -Infinity, etiket: 'Önemsiz Risk', aksiyon: 'Önlem önceliği düşük' }
];

// 5x5 Matris standart ölçekleri (Olasılık × Şiddet, 1-5 arası).
const MATRIS_OLASILIK_SECENEKLERI = [
  { deger: 1, etiket: '1 - Nadir (neredeyse hiç olmaz)' },
  { deger: 2, etiket: '2 - Az Olası' },
  { deger: 3, etiket: '3 - Olası' },
  { deger: 4, etiket: '4 - Muhtemel' },
  { deger: 5, etiket: '5 - Kesin / Çok Muhtemel' }
];

const MATRIS_SIDDET_SECENEKLERI = [
  { deger: 1, etiket: '1 - Önemsiz (ilk yardım)' },
  { deger: 2, etiket: '2 - Hafif (hafif yaralanma)' },
  { deger: 3, etiket: '3 - Orta (tıbbi tedavi gerektirir)' },
  { deger: 4, etiket: '4 - Ciddi (kalıcı sakatlık)' },
  { deger: 5, etiket: '5 - Çok Ciddi (ölüm)' }
];

// minExclusive: bu değerden BÜYÜK puanlar (maks. 25) bu seviyeye girer.
const MATRIS_DUZEYLERI = [
  { minExclusive: 15, etiket: 'Kritik Risk', aksiyon: 'Hemen önlem alınmalı / iş durdurulmalı' },
  { minExclusive: 9, etiket: 'Yüksek Risk', aksiyon: 'Kısa dönemde iyileştirilmeli' },
  { minExclusive: 4, etiket: 'Orta Risk', aksiyon: 'Planlı şekilde iyileştirilmeli' },
  { minExclusive: -Infinity, etiket: 'Düşük Risk', aksiyon: 'Önlem önceliği düşük' }
];

function riskPuaniHesapla(o, f, s, yontem) {
  const deger = yontem === '5x5'
    ? Number(o || 0) * Number(s || 0)
    : Number(o || 0) * Number(f || 0) * Number(s || 0);
  return Math.round(deger * 10) / 10;
}

function riskDuzeyiGetir(puan, yontem) {
  const sayi = Number(puan || 0);
  const liste = yontem === '5x5' ? MATRIS_DUZEYLERI : RISK_DUZEYLERI;
  return liste.find(d => sayi > d.minExclusive) || liste[liste.length - 1];
}

function azalmaYuzdesiHesapla(rp1, rp2) {
  const once = Number(rp1 || 0);
  const sonra = Number(rp2 || 0);
  if (once <= 0) return '';
  return Math.round(100 * (1 - sonra / once)) + '%';
}

function riskNoOnEkiUret(bolum) {
  const harfEslesme = { ç: 'C', ğ: 'G', ı: 'I', ö: 'O', ş: 'S', ü: 'U', i: 'I' };
  // Türkçe özel karakterler yalnızca küçük harf halleriyle haritada tanımlı;
  // eşleştirmeden önce küçük harfe çevirmezsek büyük harfle başlayan bölüm
  // adlarında (örn. "Üretim") ilk harf haritada bulunamayıp ASCII-dışı kalır
  // ve sonraki regex tarafından sessizce silinir ("Üretim" -> "RET" gibi).
  const temiz = (bolum || 'RSK')
    .toLocaleLowerCase('tr-TR')
    .split('')
    .map(k => harfEslesme[k] || k)
    .join('')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 3);
  return (temiz || 'RSK').padEnd(3, 'X');
}

function sonrakiRiskNoUret(bolum, mevcutRiskler) {
  const onEk = riskNoOnEkiUret(bolum);
  let maks = 0;
  mevcutRiskler.forEach(r => {
    if (!String(r.riskNo || '').startsWith(onEk)) return;
    const kuyruk = parseInt(String(r.riskNo).slice(3), 10);
    if (Number.isFinite(kuyruk) && kuyruk > maks) maks = kuyruk;
  });
  return onEk + String(maks + 1).padStart(4, '0');
}

function riskGecikmisMi(risk, bugunStr) {
  if (risk.durum === 'Kapalı' || risk.durum === 'İptal') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(risk.termin || '')) return false;
  return risk.termin < (bugunStr || new Date().toISOString().slice(0, 10));
}

// Fine-Kinney ve 5x5 Matris düzey etiketlerini ortak bir 1-5 ciddiyet sırasına eşler;
// böylece iki farklı yöntemle puanlanmış kayıtlar (ham RP değerleri kıyaslanamaz
// çünkü ölçekleri tamamen farklıdır) özet/en-yüksek-risk sıralamalarında birlikte
// karşılaştırılabilir.
const RISK_SEVIYESI_SIRASI = {
  'Tolerans Gösterilemez': 5, 'Kritik Risk': 5,
  'Esaslı Risk': 4, 'Yüksek Risk': 4,
  'Önemli Risk': 3, 'Orta Risk': 3,
  'Olası Risk': 2, 'Düşük Risk': 2,
  'Önemsiz Risk': 1
};

function riskSeviyesiSirasi(duzeyEtiketi) {
  return RISK_SEVIYESI_SIRASI[duzeyEtiketi] || 0;
}

function bolumOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    ad: (veriler.ad || '').trim(),
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}

// Şablon: kullanıcının kendi hazırladığı bir risk kaydını (veya hazır
// kütüphanedeki bir öneriyi) yeni risk kayıtları oluşturmak için yeniden
// kullanılabilir hâle getirir. Firma-bağımsız (tenantAnahtar KULLANILMAZ,
// bkz. sablon-repository.js) saklanır ki bir kullanıcı bir firmada hazırladığı
// şablonu başka bir firmasında da kullanabilsin; "kaynak: hazir" olanlar
// herkese açık başlangıç kütüphanesidir, "kaynak: kullanici" olanlar yalnızca
// onu kaydeden kullanıcıya (sahipId) görünür.
// Konu: sektörden bağımsız, tehlike türüne göre çapraz kategori (aynı konu
// birden çok sektörde geçebilir) — kullanıcı "sektörden iyi de konu daha iyi"
// diyerek bunu birincil arama/filtre boyutu olarak istedi.
const RISK_SABLON_KONULARI = [
  'Yüksekte Çalışma / İskele', 'Kapalı Alan Çalışması', 'Elektrik İşleri', 'Yangın ve Patlama',
  'Kimyasal Madde Kullanımı', 'Kaldırma ve Taşıma Ekipmanları', 'Kaynak ve Kesme İşlemleri',
  'Makine ve Ekipman Kullanımı', 'Kazı ve İstinat Çalışması', 'Trafik ve Araç Kullanımı',
  'Gürültü Maruziyeti', 'Titreşim Maruziyeti', 'Ergonomi ve Elle Taşıma',
  'Kayma, Takılma ve Düşme', 'Biyolojik Etkenler', 'Toz, Gaz ve Buhar Maruziyeti',
  'Termal Konfor (Sıcak/Soğuk Ortam)', 'Basınçlı Kaplar ve Sistemler', 'Depolama ve İstifleme',
  'Şiddet ve Güvenlik Olayları', 'Radyasyon', 'Psikososyal Riskler', 'Kişisel Koruyucu Donanım (KKD)'
];

// Şablonun dayandığı mevzuat — kullanıcı istekle eklendi ("yönetmelik bazında
// da şablonlar koy"); tek bir birincil yönetmelik etiketlenir (bir tehlike
// birden çok mevzuata girebilir ama liste/filtre sadeliği için tek alan).
const RISK_SABLON_YONETMELIKLERI = [
  '6331 Sayılı İş Sağlığı ve Güvenliği Kanunu (Genel Hükümler)',
  'İşyeri Bina ve Eklentilerinde Alınacak Sağlık ve Güvenlik Önlemlerine İlişkin Yönetmelik',
  'Binaların Yangından Korunması Hakkında Yönetmelik',
  'İşyerlerinde Acil Durumlar Hakkında Yönetmelik',
  'İş Ekipmanlarının Kullanımında Sağlık ve Güvenlik Şartları Yönetmeliği',
  'Makina Emniyeti Yönetmeliği',
  'Sağlık ve Güvenlik İşaretleri Yönetmeliği',
  'Kimyasal Maddelerle Çalışmalarda Sağlık ve Güvenlik Önlemleri Hakkında Yönetmelik',
  'Kanserojen veya Mutajen Maddelerle Çalışmalarda Sağlık ve Güvenlik Önlemleri Hakkında Yönetmelik',
  'Kişisel Koruyucu Donanımların İşyerlerinde Kullanılması Hakkında Yönetmelik',
  'Elle Taşıma İşleri Yönetmeliği',
  'Ekranlı Araçlarla Çalışmalarda Sağlık ve Güvenlik Önlemleri Hakkında Yönetmelik',
  'Çalışanların Gürültü ile İlgili Risklerden Korunmalarına Dair Yönetmelik',
  'Çalışanların Titreşimle İlgili Risklerden Korunmalarına Dair Yönetmelik',
  'Biyolojik Etkenlere Maruziyet Risklerinin Önlenmesi Hakkında Yönetmelik',
  'Yapı İşlerinde İş Sağlığı ve Güvenliği Yönetmeliği',
  'Maden İşyerlerinde İş Sağlığı ve Güvenliği Yönetmeliği',
  'Basınçlı Ekipmanlar Yönetmeliği',
  'İyonlaştırıcı Radyasyona Karşı Çalışanların Sağlık ve Güvenliğinin Korunmasına Dair Yönetmelik'
];

// Bir O/F/Ş değerini, ait olduğu ölçekte bir alt kademeye indirger — şablonun
// "planlanan" önlemi uygulandığında olasılık/frekansın nasıl azalacağını temsil
// eder (RP2'nin otomatik hesaplanabilmesi için); zaten en düşük kademedeyse
// değişmeden kalır. Şiddet (Sn) kasıtlı olarak İNDİRİLMEZ — idari/prosedürel
// önlemler genelde maruziyet olasılığını/sıklığını azaltır, tehlikenin
// gerçekleşme anındaki potansiyel şiddetini değil (o, mühendislik/ikame
// düzeyinde bir önlem gerektirir).
function _sablonAzaltilmisDeger(deger, secenekler) {
  const sayi = Number(deger);
  if (!Number.isFinite(sayi)) return deger;
  const siraliDegerler = secenekler.map(s => s.deger).slice().sort((a, b) => a - b);
  const index = siraliDegerler.indexOf(sayi);
  if (index <= 0) return siraliDegerler[0];
  return siraliDegerler[index - 1];
}

function riskSablonuOlustur(veriler) {
  const yontem = RISK_YONTEMLERI.includes(veriler.yontem) ? veriler.yontem : 'Fine-Kinney';
  const olasilikOlcek = yontem === '5x5' ? MATRIS_OLASILIK_SECENEKLERI : OLASILIK_SECENEKLERI;
  const O = veriler.O || '';
  const F = veriler.F || '';
  const S = veriler.S || '';

  return {
    id: veriler.id || rastgeleId(),
    kaynak: veriler.kaynak === 'kullanici' ? 'kullanici' : 'hazir',
    sahipId: veriler.sahipId || null,
    sektor: SEKTORLER.includes(veriler.sektor) ? veriler.sektor : 'Diğer',
    konu: RISK_SABLON_KONULARI.includes(veriler.konu) ? veriler.konu : '',
    yonetmelik: RISK_SABLON_YONETMELIKLERI.includes(veriler.yonetmelik) ? veriler.yonetmelik : '',
    faaliyet: (veriler.faaliyet || '').trim(),
    tehlike: (veriler.tehlike || '').trim(),
    risk: (veriler.risk || '').trim(),
    onlem: (veriler.onlem || '').trim(),
    planlanan: (veriler.planlanan || '').trim(),
    yontem,
    O, F, S,
    On: veriler.On !== undefined ? veriler.On : (O !== '' ? _sablonAzaltilmisDeger(O, olasilikOlcek) : ''),
    Fn: veriler.Fn !== undefined ? veriler.Fn : (yontem !== '5x5' && F !== '' ? _sablonAzaltilmisDeger(F, FREKANS_SECENEKLERI) : ''),
    Sn: veriler.Sn !== undefined ? veriler.Sn : S,
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}

// Başlangıç kütüphanesi: konu (tehlike kategorisi) bazında gruplanmış, her
// tehlikenin dayandığı yönetmelik etiketlenmiş, gerçekçi tehlike/risk/önlem
// örnekleri (Fine-Kinney ölçeğinde varsayılan O/F/Ş ile). Kullanıcı ekleyip
// düzenleyerek risk kaydına dönüştürür; puanlar yalnızca başlangıç önerisidir.
const HAZIR_RISK_SABLONLARI = [
  // ---- Yüksekte Çalışma / İskele ----
  { konu: 'Yüksekte Çalışma / İskele', yonetmelik: 'Yapı İşlerinde İş Sağlığı ve Güvenliği Yönetmeliği', sektor: 'İnşaat', faaliyet: 'İskele kurulumu ve sökümü', tehlike: 'Uygun olmayan iskele montajı/sökümü', risk: 'İskelenin devrilmesi veya çökmesi sonucu yaralanma', onlem: 'Yetkili iskele kurulum ekibi kullanımı, montaj sonrası kontrol formu, üretici talimatına uygun kurulum', planlanan: 'Haftalık planlı iskele denetim takvimi oluşturulacak; montaj onay imzası alınmadan platform kullanıma açılmayacak', O: 1, F: 1, S: 15 },
  { konu: 'Yüksekte Çalışma / İskele', yonetmelik: 'Yapı İşlerinde İş Sağlığı ve Güvenliği Yönetmeliği', sektor: 'İnşaat', faaliyet: 'İskelede çalışma (genel)', tehlike: 'Korkuluksuz/ağsız platformda çalışma sırasında düşme', risk: 'Yüksekten düşme sonucu ağır yaralanma veya ölüm', onlem: 'Korkuluk, ara korkuluk, eteklik, tam vücut kemeri ve yaşam hattı kullanımı', planlanan: 'Tüm iskele hatlarına sürekli yaşam hattı (lifeline) tesis edilecek; haftalık iskele uygunluk etiketi asılacak', O: 3, F: 3, S: 40 },
  { konu: 'Yüksekte Çalışma / İskele', yonetmelik: 'Yapı İşlerinde İş Sağlığı ve Güvenliği Yönetmeliği', sektor: 'İnşaat', faaliyet: 'İskele üzerinde malzeme/alet taşıma', tehlike: 'Malzeme veya el aletinin yükseklikten düşmesi', risk: 'Aşağıda çalışan/geçen kişinin başına düşen cisimle yaralanması', onlem: 'Alet kayışı/torbası kullanımı, iskele eteklik/ağ uygulaması, alt bölgede geçiş yasağı ve bariyer', planlanan: 'Alt bölgeye düşme önleyici platform ağı eklenecek; malzeme taşıma için sepetli kaldırma sistemi kullanılacak', O: 3, F: 3, S: 15 },
  { konu: 'Yüksekte Çalışma / İskele', yonetmelik: 'Yapı İşlerinde İş Sağlığı ve Güvenliği Yönetmeliği', sektor: 'İnşaat', faaliyet: 'İskelenin enerji hattına yakın kurulumu', tehlike: 'İskelenin yakınındaki elektrik hattına teması veya yaklaşması', risk: 'Elektrik çarpması', onlem: 'Hat işletmecisinden kesinti/mesafe onayı alınması, izole bariyer, minimum güvenlik mesafesine uyulması', planlanan: 'İlgili elektrik dağıtım şirketinden hat kesintisi/izolasyon onayı alınmadan bu bölgede iskele kurulumuna başlanmayacak', O: 1, F: 1, S: 100 },
  { konu: 'Yüksekte Çalışma / İskele', yonetmelik: 'Yapı İşlerinde İş Sağlığı ve Güvenliği Yönetmeliği', sektor: 'İnşaat', faaliyet: 'Islak/donmuş iskele platformunda çalışma', tehlike: 'Platformun kayganlaşması', risk: 'Kayma sonucu düşme', onlem: 'Kaymaz platform yüzeyi, hava koşuluna göre çalışmanın durdurulması, uygun ayakkabı', planlanan: 'Yağışlı/donlu havalarda çalışmayı otomatik durduran hava durumu takip prosedürü uygulamaya alınacak', O: 3, F: 3, S: 15 },
  { konu: 'Yüksekte Çalışma / İskele', yonetmelik: 'Yapı İşlerinde İş Sağlığı ve Güvenliği Yönetmeliği', sektor: 'İnşaat', faaliyet: 'Sertifikasız personelin iskelede çalışması', tehlike: 'Yetkin olmayan personelin yüksekte çalıştırılması', risk: 'Usulsüz davranış sonucu düşme/yaralanma', onlem: 'Yüksekte çalışma eğitimi ve sertifikası zorunluluğu, iş izni sistemi', planlanan: 'Yüksekte çalışma sertifikası olmayan personelin sahaya girişini engelleyen kontrol listesi/turnike uygulaması başlatılacak', O: 1, F: 3, S: 15 },

  // ---- Kapalı Alan Çalışması ----
  { konu: 'Kapalı Alan Çalışması', yonetmelik: 'İşyeri Bina ve Eklentilerinde Alınacak Sağlık ve Güvenlik Önlemlerine İlişkin Yönetmelik', sektor: 'Kimya', faaliyet: 'Tank/silo içi çalışma', tehlike: 'Oksijen eksikliği veya zehirli gaz birikmesi', risk: 'Boğulma, zehirlenme, bilinç kaybı', onlem: 'Giriş öncesi gaz ölçümü, sürekli havalandırma, gözcü personel bulundurma, kurtarma ekipmanı hazır bulundurma', planlanan: 'Sürekli ölçüm yapan sabit gaz dedektörü ve otomatik alarm sistemi kurulacak', O: 1, F: 1, S: 100 },
  { konu: 'Kapalı Alan Çalışması', yonetmelik: 'İşyerlerinde Acil Durumlar Hakkında Yönetmelik', sektor: 'Kimya', faaliyet: 'Kapalı alana giriş-çıkış kontrolü', tehlike: 'İzinsiz veya kontrolsüz kapalı alan girişi', risk: 'Acil durumda tahliye edilememe', onlem: 'Kapalı alan çalışma izin belgesi (giriş izni), sürekli iletişim sistemi, gözcü personel', planlanan: 'Elektronik giriş-çıkış takip sistemi (personel sayaç) kurularak izinsiz giriş engellenecek', O: 1, F: 1, S: 40 },
  { konu: 'Kapalı Alan Çalışması', yonetmelik: 'Kimyasal Maddelerle Çalışmalarda Sağlık ve Güvenlik Önlemleri Hakkında Yönetmelik', sektor: 'Kimya', faaliyet: 'Kapalı alanda sıcak çalışma (kaynak vb.)', tehlike: 'Kapalı alanda yanıcı gaz birikimi ile kaynak kıvılcımının teması', risk: 'Patlama, yangın', onlem: 'Çalışma öncesi/sürekli gaz ölçümü, havalandırma, yangın gözcüsü, ATEX sertifikalı ekipman', planlanan: 'Sıcak çalışma öncesi bağımsız gaz ölçüm ekibi onayı zorunlu hale getirilecek', O: 1, F: 1, S: 100 },
  { konu: 'Kapalı Alan Çalışması', yonetmelik: 'Kimyasal Maddelerle Çalışmalarda Sağlık ve Güvenlik Önlemleri Hakkında Yönetmelik', sektor: 'Kimya', faaliyet: 'Kapalı alan temizliği', tehlike: 'Temizlik kimyasallarının kapalı ortamda buharlaşması', risk: 'Zehirlenme, bayılma', onlem: 'Solunum koruyucu ekipman, zorunlu havalandırma, kısa süreli çalışma rotasyonu', planlanan: 'Kimyasal bazlı temizlik ürünleri yerine düşük buharlı/su bazlı ürünlere geçiş yapılacak', O: 3, F: 3, S: 15 },

  // ---- Elektrik İşleri ----
  { konu: 'Elektrik İşleri', yonetmelik: 'İşyeri Bina ve Eklentilerinde Alınacak Sağlık ve Güvenlik Önlemlerine İlişkin Yönetmelik', sektor: 'Enerji', faaliyet: 'Enerjili pano/hat üzerinde bakım', tehlike: 'Enerjinin kesilmeden müdahale edilmesi', risk: 'Elektrik çarpması, yanık', onlem: 'Enerji kesme-etiketleme-kilitleme prosedürü (LOTO), gerilim kontrolü, izole KKD kullanımı', planlanan: 'Tüm bakım işlemleri için yazılı çalışma izni (LOTO onay formu) zorunlu hale getirilecek', O: 1, F: 1, S: 100 },
  { konu: 'Elektrik İşleri', yonetmelik: 'İşyeri Bina ve Eklentilerinde Alınacak Sağlık ve Güvenlik Önlemlerine İlişkin Yönetmelik', sektor: 'İnşaat', faaliyet: 'Geçici şantiye elektrik tesisatı', tehlike: 'Hasarlı/açıkta kalmış kablo ile temas', risk: 'Elektrik çarpması', onlem: 'Kaçak akım rölesi (30mA) kullanımı, periyodik topraklama ölçümü, kablo koruma kanalı', planlanan: 'Şantiye elektrik hattı haftalık termal kamera ile kontrol edilecek', O: 1, F: 1, S: 15 },
  { konu: 'Elektrik İşleri', yonetmelik: 'İşyeri Bina ve Eklentilerinde Alınacak Sağlık ve Güvenlik Önlemlerine İlişkin Yönetmelik', sektor: 'Bilişim', faaliyet: 'Elektrik pano odası çalışması', tehlike: 'Yetkisiz personelin pano odasına girmesi', risk: 'Elektrik çarpması', onlem: 'Pano odasının kilitli tutulması, yetkilendirme, uyarı işaretleri', planlanan: 'Pano odası girişine kartlı geçiş sistemi kurulacak', O: 1, F: 1, S: 40 },
  { konu: 'Elektrik İşleri', yonetmelik: 'İşyeri Bina ve Eklentilerinde Alınacak Sağlık ve Güvenlik Önlemlerine İlişkin Yönetmelik', sektor: 'Gıda', faaliyet: 'Islak ortamda elektrikli ekipman kullanımı', tehlike: 'Nem/su ile elektrikli cihazın teması', risk: 'Elektrik çarpması, kısa devre', onlem: 'IP67 sınıfı ekipman kullanımı, kaçak akım koruması, düzenli yalıtım kontrolü', planlanan: 'Islak alanlarda yalnızca düşük gerilimli (24V) ekipman kullanımına geçilecek', O: 3, F: 3, S: 15 },

  // ---- Yangın ve Patlama ----
  { konu: 'Yangın ve Patlama', yonetmelik: 'Binaların Yangından Korunması Hakkında Yönetmelik', sektor: 'Diğer', faaliyet: 'Bina içi yangın önleme', tehlike: 'Yangın algılama/söndürme sisteminin eksik veya arızalı olması', risk: 'Yangının kontrol altına alınamaması, can/mal kaybı', onlem: 'Periyodik sistem bakımı, yangın dolabı/hidrant kontrolü, kaçış yollarının açık tutulması', planlanan: 'Yangın algılama sistemi 7/24 uzaktan izlemeli hale getirilecek', O: 1, F: 1, S: 40 },
  { konu: 'Yangın ve Patlama', yonetmelik: 'İşyerlerinde Acil Durumlar Hakkında Yönetmelik', sektor: 'Diğer', faaliyet: 'Kaçış yolu ve acil çıkışların kullanımı', tehlike: 'Kaçış yollarının kapalı/malzeme ile dolu olması', risk: 'Yangın anında tahliye edilememe', onlem: 'Kaçış yolu önlerinin açık tutulması, yönlendirme/acil aydınlatma işaretleri, düzenli tahliye tatbikatı', planlanan: 'Kaçış yolu önü boş tutma kuralı ihlallerine yönelik günlük gözetim turu başlatılacak', O: 1, F: 1, S: 15 },
  { konu: 'Yangın ve Patlama', yonetmelik: 'Binaların Yangından Korunması Hakkında Yönetmelik', sektor: 'Kimya', faaliyet: 'Yanıcı madde depolanan bina bölümleri', tehlike: 'Yangına dayanıklı bölmelerin (yangın duvarı/kapısı) eksikliği', risk: 'Yangının hızla yayılması', onlem: 'Yangın kompartımanlaması, yangına dayanıklı kapı/duvar uygulaması, yangın yükü hesabına göre depolama', planlanan: 'Depo bölümü ayrı bir yangın kompartımanına alınacak; otomatik sprinkler sistemi kurulacak', O: 1, F: 1, S: 40 },
  { konu: 'Yangın ve Patlama', yonetmelik: 'Binaların Yangından Korunması Hakkında Yönetmelik', sektor: 'Diğer', faaliyet: 'Bina otoparkı / kapalı garaj kullanımı', tehlike: 'Araç yangını riski ve yetersiz havalandırma', risk: 'Yangın, duman zehirlenmesi', onlem: 'Duman tahliye sistemi, yangın algılama sistemi, düzenli kontrol', planlanan: 'Otomatik duman tahliye fanı ve CO dedektörü sistemi kurulacak', O: 1, F: 1, S: 15 },

  // ---- Kimyasal Madde Kullanımı ----
  { konu: 'Kimyasal Madde Kullanımı', yonetmelik: 'Kimyasal Maddelerle Çalışmalarda Sağlık ve Güvenlik Önlemleri Hakkında Yönetmelik', sektor: 'Kimya', faaliyet: 'Kimyasal madde transferi/aktarımı', tehlike: 'Kimyasalın cilt/göz ile teması veya sıçraması', risk: 'Kimyasal yanık, tahriş', onlem: 'KKD (eldiven, gözlük, önlük) kullanımı, göz duşu/acil duş istasyonu, MSDS eğitimi', planlanan: 'Manuel transfer yerine kapalı sistem pompa/hortum bağlantısına geçilecek', O: 3, F: 3, S: 7 },
  { konu: 'Kimyasal Madde Kullanımı', yonetmelik: 'Kimyasal Maddelerle Çalışmalarda Sağlık ve Güvenlik Önlemleri Hakkında Yönetmelik', sektor: 'Kimya', faaliyet: 'Farklı kimyasalların birlikte depolanması', tehlike: 'Uyumsuz kimyasalların karışması/reaksiyona girmesi', risk: 'Zehirli gaz oluşumu, yangın, patlama', onlem: 'Uyumluluk tablosuna göre ayrı depolama, doğru etiketleme, sızıntı önleyici tava kullanımı', planlanan: 'Uyumsuz kimyasallar için fiziksel olarak ayrı, kilitli depo bölmeleri oluşturulacak', O: 1, F: 1, S: 40 },
  { konu: 'Kimyasal Madde Kullanımı', yonetmelik: 'Kimyasal Maddelerle Çalışmalarda Sağlık ve Güvenlik Önlemleri Hakkında Yönetmelik', sektor: 'Kimya', faaliyet: 'Kimyasal madde taşıma (varil/IBC)', tehlike: 'Taşıma sırasında varillerin devrilmesi/sızıntı yapması', risk: 'Kimyasal maruziyet, kayma', onlem: 'Uygun taşıma ekipmanı (drum karyolası), sızıntı müdahale kiti, eğitim', planlanan: 'Varil taşımada tekerlekli sabit karyola/pompa sistemi zorunlu hale getirilecek', O: 3, F: 3, S: 7 },
  { konu: 'Kimyasal Madde Kullanımı', yonetmelik: 'Kimyasal Maddelerle Çalışmalarda Sağlık ve Güvenlik Önlemleri Hakkında Yönetmelik', sektor: 'Metal / Makine', faaliyet: 'Solvent bazlı boyama/kaplama', tehlike: 'Uçucu organik bileşiklerin (VOC) solunması', risk: 'Zehirlenme, baş dönmesi, kronik solunum rahatsızlığı', onlem: 'Yerel egzoz havalandırma sistemi, solunum maskesi, sınırlı çalışma süresi', planlanan: 'Solvent bazlı boyadan su bazlı/düşük VOC\'lu boyaya geçiş planlanacak', O: 6, F: 6, S: 7 },
  { konu: 'Kimyasal Madde Kullanımı', yonetmelik: 'Kimyasal Maddelerle Çalışmalarda Sağlık ve Güvenlik Önlemleri Hakkında Yönetmelik', sektor: 'Gübre', faaliyet: 'Kimyasal gübre depolama ve uygulama', tehlike: 'Amonyum nitrat bazlı gübrenin uygunsuz depolanması, ısı/nem/yanıcı maddeyle bir arada tutulması', risk: 'Yangın, patlama; toz solunması halinde zehirlenme ve cilt/göz tahrişi', onlem: 'Serin, kuru ve yanıcı maddelerden ayrı depolama; KKD (eldiven, toz maskesi, gözlük) kullanımı, MSDS eğitimi', planlanan: 'Gübre deposu ayrı, havalandırmalı ve yangına dayanıklı bir bölüme taşınacak; sıcaklık takip sensörü kurulacak', O: 1, F: 1, S: 40 },

  // ---- Kaldırma ve Taşıma Ekipmanları ----
  { konu: 'Kaldırma ve Taşıma Ekipmanları', yonetmelik: 'İş Ekipmanlarının Kullanımında Sağlık ve Güvenlik Şartları Yönetmeliği', sektor: 'Metal / Makine', faaliyet: 'Vinç ile yük kaldırma', tehlike: 'Yükün taşıma sırasında düşmesi', risk: 'Ezilme, ölüm', onlem: 'Periyodik vinç kontrolü, yük limitine uyum, güvenli çalışma alanı sınırlaması', planlanan: 'Yük altı bölgesine giriş engelleyen fiziksel bariyer ve yük sensörlü alarm sistemi kurulacak', O: 1, F: 3, S: 40 },
  { konu: 'Kaldırma ve Taşıma Ekipmanları', yonetmelik: 'İş Ekipmanlarının Kullanımında Sağlık ve Güvenlik Şartları Yönetmeliği', sektor: 'Lojistik / Nakliye', faaliyet: 'Forklift ile malzeme taşıma', tehlike: 'Forklift/yaya çarpışması', risk: 'Ezilme, çarpma yaralanması', onlem: 'Yaya-araç yolu ayrımı, sesli/ışıklı uyarı sistemi, operatör sertifikası zorunluluğu', planlanan: 'Depo içi yaya yollarına fiziksel bariyer (bollard) ve forklift hız sınırlayıcı kurulacak', O: 3, F: 6, S: 15 },
  { konu: 'Kaldırma ve Taşıma Ekipmanları', yonetmelik: 'İş Ekipmanlarının Kullanımında Sağlık ve Güvenlik Şartları Yönetmeliği', sektor: 'İnşaat', faaliyet: 'Halat/zincir ile yük bağlama (rigging)', tehlike: 'Yanlış bağlama sonucu yükün kayması', risk: 'Düşen yükle yaralanma', onlem: 'Sertifikalı rigger görevlendirme, periyodik ekipman muayenesi, yük hesaplaması', planlanan: 'Standart olmayan bağlama ekipmanının kullanımını engelleyen renkli etiketleme/kontrol sistemi uygulanacak', O: 1, F: 3, S: 40 },
  { konu: 'Kaldırma ve Taşıma Ekipmanları', yonetmelik: 'İş Ekipmanlarının Kullanımında Sağlık ve Güvenlik Şartları Yönetmeliği', sektor: 'Perakende / Ticaret', faaliyet: 'Yüksek raf sisteminde forklift ile istifleme', tehlike: 'Yüksek raftan malzeme düşmesi', risk: 'Çarpma, ezilme', onlem: 'Raf yük limiti işaretlemesi, güvenlik ağı, düzenli raf kontrolü', planlanan: 'Raf sistemine devrilme önleyici çelik file/koruma bariyeri eklenecek', O: 3, F: 3, S: 7 },

  // ---- Kaynak ve Kesme İşlemleri ----
  { konu: 'Kaynak ve Kesme İşlemleri', yonetmelik: 'İş Ekipmanlarının Kullanımında Sağlık ve Güvenlik Şartları Yönetmeliği', sektor: 'Metal / Makine', faaliyet: 'Ark kaynağı yapımı', tehlike: 'Kaynak ışını ve kıvılcım sıçraması', risk: 'Göz/cilt yanığı, yangın', onlem: 'Kaynak maskesi, deri önlük, yanmaz paravan kullanımı', planlanan: 'Sabit kaynak istasyonlarına duman emiş kollu lokal egzoz sistemi kurulacak', O: 6, F: 6, S: 7 },
  { konu: 'Kaynak ve Kesme İşlemleri', yonetmelik: 'İş Ekipmanlarının Kullanımında Sağlık ve Güvenlik Şartları Yönetmeliği', sektor: 'Metal / Makine', faaliyet: 'Oksi-gaz ile kesme', tehlike: 'Gaz tüpü sızıntısı veya geri tepme (flashback)', risk: 'Patlama, yangın', onlem: 'Geri tepme valfi kullanımı, periyodik hortum kontrolü, tüplerin dik ve sabit taşınması', planlanan: 'Tüm oksi-gaz hatlarına hem oksijen hem yakıt gazı tarafında çift yönlü geri tepme valfi takılacak', O: 1, F: 1, S: 40 },
  { konu: 'Kaynak ve Kesme İşlemleri', yonetmelik: 'Kimyasal Maddelerle Çalışmalarda Sağlık ve Güvenlik Önlemleri Hakkında Yönetmelik', sektor: 'Metal / Makine', faaliyet: 'Kaynak dumanına maruziyet', tehlike: 'Metal kaynak dumanının solunması', risk: 'Solunum yolu hastalıkları, metal buharı ateşi', onlem: 'Yerel egzoz sistemi, solunum maskesi, periyodik sağlık taraması', planlanan: 'Kaynak istasyonlarına kişisel taşınabilir duman emici üniteler eklenecek', O: 6, F: 6, S: 7 },

  // ---- Makine ve Ekipman Kullanımı ----
  { konu: 'Makine ve Ekipman Kullanımı', yonetmelik: 'Makina Emniyeti Yönetmeliği', sektor: 'Tekstil', faaliyet: 'Hareketli parçalı makine kullanımı', tehlike: 'Koruyucusuz hareketli parçaya el/parmak kaptırma', risk: 'Kesik, ezilme, ampütasyon', onlem: 'Makine koruyucuları, acil stop düğmesi, kilitleme-etiketleme bakım prosedürü', planlanan: 'Tüm makinelere ışık perdesi/çift el kumanda gibi ek güvenlik cihazları takılacak', O: 3, F: 6, S: 7 },
  { konu: 'Makine ve Ekipman Kullanımı', yonetmelik: 'Makina Emniyeti Yönetmeliği', sektor: 'Metal / Makine', faaliyet: 'Basınçlı hava/hidrolik ekipman bakımı', tehlike: 'Basınçlı hat/hortum patlaması', risk: 'Yaralanma, göz yaralanması', onlem: 'Periyodik bakım, basınç tahliyesi sonrası müdahale, koruyucu gözlük kullanımı', planlanan: 'Bakım öncesi zorunlu basınç tahliye ve kilitleme prosedürü yazılı hale getirilecek', O: 1, F: 1, S: 15 },
  { konu: 'Makine ve Ekipman Kullanımı', yonetmelik: 'Makina Emniyeti Yönetmeliği', sektor: 'Metal / Makine', faaliyet: 'Ekipmanın devreye alınması sırasında bakım', tehlike: 'Bakım sırasında ekipmanın beklenmedik şekilde çalışması', risk: 'Sıkışma, yaralanma', onlem: 'Kilitleme-etiketleme (LOTO) prosedürü, enerji izolasyonunun doğrulanması', planlanan: 'Her ekipman için ayrı kilitleme-etiketleme noktası ve kişisel kilit kutusu tesis edilecek', O: 1, F: 1, S: 15 },

  // ---- Kazı ve İstinat Çalışması ----
  { konu: 'Kazı ve İstinat Çalışması', yonetmelik: 'Yapı İşlerinde İş Sağlığı ve Güvenliği Yönetmeliği', sektor: 'İnşaat', faaliyet: 'Derin kazı çalışması', tehlike: 'Kazı yamacının göçmesi', risk: 'Çalışanın toprak altında kalması', onlem: 'İksa/şevlendirme yapılması, kazı kenarına yaklaşımın engellenmesi, günlük stabilite kontrolü', planlanan: 'Kazı derinliğine göre standart iksa sistemi (trench box) zorunlu hale getirilecek', O: 1, F: 1, S: 100 },
  { konu: 'Kazı ve İstinat Çalışması', yonetmelik: 'Yapı İşlerinde İş Sağlığı ve Güvenliği Yönetmeliği', sektor: 'İnşaat', faaliyet: 'Kazı alanında yeraltı tesisatına rastlanması', tehlike: 'Elektrik/gaz/su hattına kazı sırasında zarar verilmesi', risk: 'Patlama, elektrik çarpması, su baskını', onlem: 'Kazı öncesi altyapı taraması, ilgili kurumdan onay alınması, kritik bölgede elle kazı yapılması', planlanan: 'Kazı öncesi zemin radar taraması (GPR) standart prosedür olarak uygulanacak', O: 1, F: 1, S: 40 },
  { konu: 'Kazı ve İstinat Çalışması', yonetmelik: 'Yapı İşlerinde İş Sağlığı ve Güvenliği Yönetmeliği', sektor: 'İnşaat', faaliyet: 'Kazı çevresinde araç/ekipman trafiği', tehlike: 'Ağır ekipmanın kazı kenarına yaklaşması', risk: 'Kazı yamacının çökmesi, ekipmanın devrilmesi', onlem: 'Güvenli mesafe işaretlemesi, bariyer kullanımı, ekipman operatör talimatı', planlanan: 'Kazı kenarına araç yaklaşımını fiziksel olarak engelleyen beton bariyer/tekerlek stopu konulacak', O: 3, F: 3, S: 15 },

  // ---- Trafik ve Araç Kullanımı ----
  { konu: 'Trafik ve Araç Kullanımı', yonetmelik: '6331 Sayılı İş Sağlığı ve Güvenliği Kanunu (Genel Hükümler)', sektor: 'Lojistik / Nakliye', faaliyet: 'Şehir içi/şehirlerarası sevkiyat sürüşü', tehlike: 'Yorgun veya dikkatsiz sürüş', risk: 'Trafik kazası', onlem: 'Sürüş süresi ve mola takibi, sürücü eğitimi, araç periyodik bakımı', planlanan: 'Araçlara sürücü yorgunluk takip sistemi (telematik) kurulacak', O: 3, F: 6, S: 15 },
  { konu: 'Trafik ve Araç Kullanımı', yonetmelik: 'İşyeri Bina ve Eklentilerinde Alınacak Sağlık ve Güvenlik Önlemlerine İlişkin Yönetmelik', sektor: 'İnşaat', faaliyet: 'Saha içi araç trafiği', tehlike: 'Yaya ile aracın çakışması', risk: 'Çarpma yaralanması', onlem: 'Yaya/araç yolu ayrımı, hız sınırlaması, geri manevra sesli uyarı sistemi', planlanan: 'Saha trafik planı yeniden düzenlenerek yaya/araç kesişim noktaları asgariye indirilecek', O: 3, F: 6, S: 15 },
  { konu: 'Trafik ve Araç Kullanımı', yonetmelik: '6331 Sayılı İş Sağlığı ve Güvenliği Kanunu (Genel Hükümler)', sektor: 'Lojistik / Nakliye', faaliyet: 'Kış koşullarında araç kullanımı', tehlike: 'Buzlu/kaygan yolda sürüş', risk: 'Kayma, kaza', onlem: 'Kış lastiği kullanımı, sürüş eğitimi, hava koşuluna göre sefer planlaması', planlanan: 'Kış aylarında riskli güzergâhlar için sefer iptal/erteleme kriterleri belirlenecek', O: 1, F: 3, S: 15 },

  // ---- Gürültü Maruziyeti ----
  { konu: 'Gürültü Maruziyeti', yonetmelik: 'Çalışanların Gürültü ile İlgili Risklerden Korunmalarına Dair Yönetmelik', sektor: 'Tekstil', faaliyet: 'Yüksek gürültülü üretim hattında çalışma', tehlike: 'Sürekli yüksek desibelde gürültüye maruziyet', risk: 'İşitme kaybı', onlem: 'Kulaklık/kulak tıkacı kullanımı, periyodik gürültü ölçümü, rotasyon', planlanan: 'Gürültü kaynağı ekipmanlara akustik kapak/izolasyon uygulanacak', O: 6, F: 10, S: 3 },
  { konu: 'Gürültü Maruziyeti', yonetmelik: 'Çalışanların Gürültü ile İlgili Risklerden Korunmalarına Dair Yönetmelik', sektor: 'Metal / Makine', faaliyet: 'Kısa süreli yüksek darbeli gürültü (perçin/pres)', tehlike: 'Ani yüksek şiddette gürültü', risk: 'Akut işitme hasarı', onlem: 'Kulak koruyucu ekipman zorunluluğu, ekipmanın akustik izolasyonu', planlanan: 'Perçin/pres hattı ayrı bir akustik kabine alınacak', O: 3, F: 6, S: 3 },

  // ---- Titreşim Maruziyeti ----
  { konu: 'Titreşim Maruziyeti', yonetmelik: 'Çalışanların Titreşimle İlgili Risklerden Korunmalarına Dair Yönetmelik', sektor: 'İnşaat', faaliyet: 'El-kol titreşimli ekipman kullanımı (matkap, kırıcı)', tehlike: 'Uzun süreli el-kol titreşimine maruziyet', risk: 'Beyaz parmak sendromu, dolaşım bozukluğu', onlem: 'Titreşim emici eldiven, çalışma süresi sınırlandırması, ekipman periyodik bakımı', planlanan: 'Titreşim seviyesi düşük yeni nesil ekipmanlara kademeli geçiş planlanacak', O: 6, F: 6, S: 3 },
  { konu: 'Titreşim Maruziyeti', yonetmelik: 'Çalışanların Titreşimle İlgili Risklerden Korunmalarına Dair Yönetmelik', sektor: 'Madencilik', faaliyet: 'Ağır iş makinesi operatörlüğü (tüm gövde titreşimi)', tehlike: 'Sürekli tüm-gövde titreşimine maruziyet', risk: 'Bel/omurga rahatsızlıkları', onlem: 'Ergonomik operatör koltuğu, çalışma süresi rotasyonu, periyodik sağlık kontrolü', planlanan: 'Operatör koltuklarına aktif titreşim sönümleme sistemi takılacak', O: 6, F: 6, S: 3 },

  // ---- Ergonomi ve Elle Taşıma ----
  { konu: 'Ergonomi ve Elle Taşıma', yonetmelik: 'Elle Taşıma İşleri Yönetmeliği', sektor: 'Lojistik / Nakliye', faaliyet: 'Elle ağır yük kaldırma/taşıma', tehlike: 'Yanlış duruşla ağır yük kaldırma', risk: 'Bel fıtığı, kas-iskelet yaralanması', onlem: 'Ergonomi eğitimi, mekanik kaldırma ekipmanı kullanımı, yük ağırlığı sınırlaması', planlanan: 'Elle taşıma yerine transpalet/konveyör gibi mekanik taşıma sistemine geçilecek', O: 6, F: 6, S: 3 },
  { konu: 'Ergonomi ve Elle Taşıma', yonetmelik: 'Elle Taşıma İşleri Yönetmeliği', sektor: 'Gıda', faaliyet: 'Uzun süreli ayakta/tekrarlayan iş', tehlike: 'Tekrarlayan hareketlerle çalışma', risk: 'Kas-iskelet sistemi rahatsızlığı', onlem: 'Düzenli mola, iş rotasyonu, ergonomik iş istasyonu tasarımı', planlanan: 'İstasyonlar arası dönüşümlü görev rotasyonu haftalık program olarak uygulanacak', O: 10, F: 10, S: 1 },
  { konu: 'Ergonomi ve Elle Taşıma', yonetmelik: 'Ekranlı Araçlarla Çalışmalarda Sağlık ve Güvenlik Önlemleri Hakkında Yönetmelik', sektor: 'Bilişim', faaliyet: 'Bilgisayar başında masa başı çalışma', tehlike: 'Uygunsuz oturma pozisyonu/ekran mesafesi', risk: 'Boyun/bel ağrısı, göz yorgunluğu', onlem: 'Ergonomik mobilya, ekran yüksekliği ayarı, düzenli ara verme', planlanan: 'Yükseklik ayarlı masa ve ekran kolu tüm çalışma istasyonlarına kademeli olarak sağlanacak', O: 10, F: 10, S: 1 },

  // ---- Kayma, Takılma ve Düşme ----
  { konu: 'Kayma, Takılma ve Düşme', yonetmelik: 'İşyeri Bina ve Eklentilerinde Alınacak Sağlık ve Güvenlik Önlemlerine İlişkin Yönetmelik', sektor: 'Gıda', faaliyet: 'Islak/yağlı zeminde hareket', tehlike: 'Zeminin kaygan olması', risk: 'Düşme yaralanması', onlem: 'Kaymaz zemin kaplaması, uyarı levhası, anında temizlik prosedürü', planlanan: 'Islanmaya açık bölgelere kalıcı kaymaz zemin kaplaması uygulanacak', O: 6, F: 10, S: 3 },
  { konu: 'Kayma, Takılma ve Düşme', yonetmelik: 'İşyeri Bina ve Eklentilerinde Alınacak Sağlık ve Güvenlik Önlemlerine İlişkin Yönetmelik', sektor: 'Bilişim', faaliyet: 'Dağınık kablo/malzeme arasında yürüme', tehlike: 'Zeminde takılma riski oluşturan nesneler', risk: 'Düşme, çarpma', onlem: 'Düzenli sahra/ofis düzeni (5S), kablo kanalı kullanımı', planlanan: 'Tüm kablolar yerden yükseltilmiş kablo kanalına alınacak', O: 6, F: 6, S: 1 },
  { konu: 'Kayma, Takılma ve Düşme', yonetmelik: 'İşyeri Bina ve Eklentilerinde Alınacak Sağlık ve Güvenlik Önlemlerine İlişkin Yönetmelik', sektor: 'Eğitim', faaliyet: 'Merdiven kullanımı', tehlike: 'Korkuluksuz veya aydınlatmasız merdiven', risk: 'Düşme yaralanması', onlem: 'Korkuluk uygulaması, kaymaz basamak bandı, yeterli aydınlatma', planlanan: 'Merdivenlere çift taraflı korkuluk ve hareket sensörlü aydınlatma eklenecek', O: 3, F: 6, S: 3 },
  { konu: 'Kayma, Takılma ve Düşme', yonetmelik: 'Sağlık ve Güvenlik İşaretleri Yönetmeliği', sektor: 'Diğer', faaliyet: 'Tehlikeli alan ve ekipmanların işaretlenmesi', tehlike: 'Uyarı/yasaklama işaretlerinin eksik veya görünür olmaması', risk: 'Tehlikeden habersiz çalışanın kazaya maruz kalması', onlem: 'ISO 7010 uyumlu güvenlik işaretleri, görünür ve aydınlatılmış işaretleme, periyodik kontrol', planlanan: 'Tesis genelinde işaretleme envanteri çıkarılıp eksikler tamamlanacak', O: 3, F: 3, S: 3 },

  // ---- Biyolojik Etkenler ----
  { konu: 'Biyolojik Etkenler', yonetmelik: 'Biyolojik Etkenlere Maruziyet Risklerinin Önlenmesi Hakkında Yönetmelik', sektor: 'Sağlık', faaliyet: 'Kullanılmış tıbbi malzeme ile çalışma', tehlike: 'Kontamine iğne/malzeme ile temas', risk: 'Kan yoluyla bulaşan enfeksiyon', onlem: 'Güvenli atık kutusu, eğitim, hepatit B aşılama programı', planlanan: 'İğnesiz/güvenlikli enjeksiyon sistemlerine geçiş planlanacak', O: 3, F: 3, S: 7 },
  { konu: 'Biyolojik Etkenler', yonetmelik: 'Biyolojik Etkenlere Maruziyet Risklerinin Önlenmesi Hakkında Yönetmelik', sektor: 'Tarım', faaliyet: 'Hayvansal ürünlerle çalışma (mezbaha/tarım)', tehlike: 'Zoonotik hastalık etkenlerine maruziyet', risk: 'Enfeksiyon', onlem: 'KKD kullanımı, hijyen prosedürleri, periyodik sağlık kontrolü', planlanan: 'Aşılama takvimi dijital olarak takip edilip zorunlu hale getirilecek', O: 3, F: 3, S: 7 },
  { konu: 'Biyolojik Etkenler', yonetmelik: 'Biyolojik Etkenlere Maruziyet Risklerinin Önlenmesi Hakkında Yönetmelik', sektor: 'Enerji', faaliyet: 'Atıksu/kanalizasyon çalışması', tehlike: 'Patojen mikroorganizmalara maruziyet', risk: 'Enfeksiyon, gastrointestinal hastalık', onlem: 'KKD (eldiven, çizme), aşılama, el hijyeni', planlanan: 'Çalışma öncesi ve sonrası zorunlu duş/dekontaminasyon istasyonu kurulacak', O: 3, F: 3, S: 7 },

  // ---- Toz, Gaz ve Buhar Maruziyeti ----
  { konu: 'Toz, Gaz ve Buhar Maruziyeti', yonetmelik: 'Maden İşyerlerinde İş Sağlığı ve Güvenliği Yönetmeliği', sektor: 'Madencilik', faaliyet: 'Taş/maden tozu oluşan ortamda çalışma', tehlike: 'Solunabilir toza sürekli maruziyet', risk: 'Silikoz, akciğer hastalığı', onlem: 'Islak kazı/kesme yöntemi, toz maskesi, periyodik akciğer taraması', planlanan: 'Islak kesim yöntemine ek olarak yerel toz emiş sistemi kurulacak', O: 6, F: 10, S: 15 },
  { konu: 'Toz, Gaz ve Buhar Maruziyeti', yonetmelik: 'Kimyasal Maddelerle Çalışmalarda Sağlık ve Güvenlik Önlemleri Hakkında Yönetmelik', sektor: 'Kimya', faaliyet: 'Kapalı üretim alanında kimyasal buhar oluşumu', tehlike: 'Zehirli/boğucu gaz birikmesi', risk: 'Zehirlenme', onlem: 'Havalandırma, gaz dedektörü, solunum koruyucu ekipman', planlanan: 'Üretim hattına sürekli izleme yapan sabit gaz sensörü ve otomatik havalandırma bağlanacak', O: 1, F: 3, S: 15 },
  { konu: 'Toz, Gaz ve Buhar Maruziyeti', yonetmelik: 'Kimyasal Maddelerle Çalışmalarda Sağlık ve Güvenlik Önlemleri Hakkında Yönetmelik', sektor: 'Gıda', faaliyet: 'Un/tahıl tozu oluşan üretim ortamı', tehlike: 'Organik toza maruziyet ve patlayıcı toz bulutu oluşumu', risk: 'Solunum rahatsızlığı, toz patlaması', onlem: 'Toz toplama sistemi, statik elektrik önlemleri, maske kullanımı', planlanan: 'Toz toplama sistemine patlama tahliye panelleri (explosion vent) eklenecek', O: 3, F: 6, S: 7 },

  // ---- Termal Konfor (Sıcak/Soğuk Ortam) ----
  { konu: 'Termal Konfor (Sıcak/Soğuk Ortam)', yonetmelik: 'İşyeri Bina ve Eklentilerinde Alınacak Sağlık ve Güvenlik Önlemlerine İlişkin Yönetmelik', sektor: 'Tarım', faaliyet: 'Açık alanda yaz aylarında çalışma', tehlike: 'Yüksek sıcaklık ve güneş ışınına maruziyet', risk: 'Sıcak çarpması, dehidratasyon', onlem: 'Gölgelik/dinlenme alanı, su temini, çalışma saatlerinin düzenlenmesi', planlanan: 'En sıcak saatlerde (12:00-16:00) açık alan çalışması ertelenecek şekilde vardiya planı güncellenecek', O: 6, F: 6, S: 3 },
  { konu: 'Termal Konfor (Sıcak/Soğuk Ortam)', yonetmelik: 'İşyeri Bina ve Eklentilerinde Alınacak Sağlık ve Güvenlik Önlemlerine İlişkin Yönetmelik', sektor: 'Gıda', faaliyet: 'Soğuk hava deposunda çalışma', tehlike: 'Düşük sıcaklığa uzun süre maruziyet', risk: 'Hipotermi, soğuk çarpması', onlem: 'Uygun termal kıyafet temini, çalışma-mola rotasyonu', planlanan: 'Depoda maksimum kesintisiz çalışma süresi belirlenip zorunlu ısınma molaları uygulanacak', O: 3, F: 3, S: 3 },

  // ---- Basınçlı Kaplar ve Sistemler ----
  { konu: 'Basınçlı Kaplar ve Sistemler', yonetmelik: 'Basınçlı Ekipmanlar Yönetmeliği', sektor: 'Enerji', faaliyet: 'Basınçlı kazan/tank işletimi', tehlike: 'Basıncın kontrolsüz artışı', risk: 'Patlama', onlem: 'Emniyet valfi kullanımı, periyodik basınç testi, yetkili operatör görevlendirme', planlanan: 'Basınç izleme sistemine uzaktan alarm ve otomatik kapatma fonksiyonu eklenecek', O: 1, F: 1, S: 40 },
  { konu: 'Basınçlı Kaplar ve Sistemler', yonetmelik: 'Basınçlı Ekipmanlar Yönetmeliği', sektor: 'Kimya', faaliyet: 'Gaz tüpü depolama ve kullanımı', tehlike: 'Tüpün devrilmesi veya sızıntı yapması', risk: 'Patlama, yangın, zehirlenme', onlem: 'Tüplerin sabitlenmesi, dik depolanması, periyodik sızdırmazlık kontrolü', planlanan: 'Gaz tüpleri için ayrı, havalandırmalı ve kilitli depolama kafesi kurulacak', O: 1, F: 1, S: 40 },

  // ---- Depolama ve İstifleme ----
  { konu: 'Depolama ve İstifleme', yonetmelik: 'İş Ekipmanlarının Kullanımında Sağlık ve Güvenlik Şartları Yönetmeliği', sektor: 'Perakende / Ticaret', faaliyet: 'Yüksek raf sistemlerinde ürün istiflenmesi', tehlike: 'Rafın devrilmesi veya aşırı yüklenmesi', risk: 'Çarpma, ezilme', onlem: 'Raf yük limiti belirlenmesi, düzenli raf kontrolü, güvenli istifleme yöntemi', planlanan: 'Raf ayaklarına çarpma koruma bariyeri (rack protector) takılacak', O: 3, F: 3, S: 3 },
  { konu: 'Depolama ve İstifleme', yonetmelik: 'İş Ekipmanlarının Kullanımında Sağlık ve Güvenlik Şartları Yönetmeliği', sektor: 'Lojistik / Nakliye', faaliyet: 'Palet üzerinde düzensiz istifleme', tehlike: 'Dengesiz istiflenmiş paletlerin devrilmesi', risk: 'Ezilme yaralanması', onlem: 'Paletleme standardı, streç film ile sabitleme, yükseklik sınırı uygulaması', planlanan: 'Standart paletleme prosedürü yazılı hale getirilip depo personeline eğitim verilecek', O: 3, F: 3, S: 7 },

  // ---- Şiddet ve Güvenlik Olayları ----
  { konu: 'Şiddet ve Güvenlik Olayları', yonetmelik: '6331 Sayılı İş Sağlığı ve Güvenliği Kanunu (Genel Hükümler)', sektor: 'Sağlık', faaliyet: 'Müşteri/hasta ile birebir hizmet', tehlike: 'Sözlü veya fiziksel saldırı riski', risk: 'Yaralanma, psikolojik travma', onlem: 'Güvenlik personeli, iletişim/çatışma yönetimi eğitimi, acil çağrı butonu', planlanan: 'Riskli görüşme odalarına panik butonu ve gözlem kamerası eklenecek', O: 3, F: 3, S: 3 },
  { konu: 'Şiddet ve Güvenlik Olayları', yonetmelik: '6331 Sayılı İş Sağlığı ve Güvenliği Kanunu (Genel Hükümler)', sektor: 'Perakende / Ticaret', faaliyet: 'Nakit işlem yapılan iş yeri', tehlike: 'Hırsızlık/gasp girişimi', risk: 'Fiziksel/psikolojik travma', onlem: 'Güvenlik kamerası, alarm sistemi, personel eğitimi', planlanan: 'Kasa bölgesine güvenlik camı ve zaman gecikmeli kasa sistemi kurulacak', O: 1, F: 1, S: 7 },
  { konu: 'Şiddet ve Güvenlik Olayları', yonetmelik: '6331 Sayılı İş Sağlığı ve Güvenliği Kanunu (Genel Hükümler)', sektor: 'Diğer', faaliyet: 'Gece vardiyasında tek başına çalışma', tehlike: 'Yalnız çalışma sırasında müdahale edilememe', risk: 'Saldırı veya kaza durumunda geç müdahale', onlem: 'Check-in prosedürü, panik butonu, kamera sistemi', planlanan: 'Gece vardiyasında en az iki kişilik çalışma kuralı getirilecek', O: 1, F: 3, S: 7 },

  // ---- Radyasyon ----
  { konu: 'Radyasyon', yonetmelik: 'İyonlaştırıcı Radyasyona Karşı Çalışanların Sağlık ve Güvenliğinin Korunmasına Dair Yönetmelik', sektor: 'Sağlık', faaliyet: 'Röntgen/görüntüleme cihazı kullanımı', tehlike: 'İyonize radyasyona maruziyet', risk: 'Radyasyon hastalığı, kanser riski', onlem: 'Kurşun önlük kullanımı, dozimetre takibi, mesafe/süre sınırlaması', planlanan: 'Çekim odasına kurşun kapı kilidi ve otomatik uyarı ışığı sistemi eklenecek', O: 3, F: 6, S: 15 },
  { konu: 'Radyasyon', yonetmelik: 'İyonlaştırıcı Radyasyona Karşı Çalışanların Sağlık ve Güvenliğinin Korunmasına Dair Yönetmelik', sektor: 'Enerji', faaliyet: 'Endüstriyel radyografi (NDT) kontrolü', tehlike: 'Radyoaktif kaynağın kontrolsüz kullanımı', risk: 'Radyasyon maruziyeti', onlem: 'Yetkili operatör görevlendirme, güvenlik bölgesi işaretlemesi, dozimetre kullanımı', planlanan: 'Radyografi çalışma bölgesi mesai saatleri dışında da kilitli/erişimsiz hale getirilecek', O: 1, F: 1, S: 40 },

  // ---- Psikososyal Riskler ----
  { konu: 'Psikososyal Riskler', yonetmelik: '6331 Sayılı İş Sağlığı ve Güvenliği Kanunu (Genel Hükümler)', sektor: 'Diğer', faaliyet: 'Yoğun iş yükü ve zaman baskısı altında çalışma', tehlike: 'Aşırı iş yükü ve stres', risk: 'Tükenmişlik, kaygı bozukluğu', onlem: 'İş yükü planlaması, destek mekanizmaları, düzenli izin kullanımının sağlanması', planlanan: 'Departman bazlı iş yükü analizi yapılıp gerekli ek personel planlaması yapılacak', O: 6, F: 6, S: 1 },
  { konu: 'Psikososyal Riskler', yonetmelik: '6331 Sayılı İş Sağlığı ve Güvenliği Kanunu (Genel Hükümler)', sektor: 'Sağlık', faaliyet: 'Vardiyalı/gece çalışma düzeni', tehlike: 'Uyku düzeninin bozulması', risk: 'Yorgunluk, dikkat dağınıklığı, kaza riski artışı', onlem: 'Vardiya rotasyon planlaması, yeterli dinlenme süresinin sağlanması', planlanan: 'Vardiya geçiş sıklığı azaltılıp ileri dönüşlü (sabah-akşam-gece) rotasyona geçilecek', O: 6, F: 6, S: 3 },

  // ---- Kişisel Koruyucu Donanım (KKD) ----
  { konu: 'Kişisel Koruyucu Donanım (KKD)', yonetmelik: 'Kişisel Koruyucu Donanımların İşyerlerinde Kullanılması Hakkında Yönetmelik', sektor: 'Diğer', faaliyet: 'Sahada genel KKD kullanımı', tehlike: 'Gerekli KKD\'nin kullanılmaması veya uygun olmayan KKD', risk: 'Önlenebilir yaralanmaların önlenememesi', onlem: 'Risklere uygun KKD temini, kullanım eğitimi, düzenli KKD denetimi', planlanan: 'KKD kullanım denetimi için haftalık saha turu ve dijital kontrol listesi uygulamaya alınacak', O: 3, F: 6, S: 7 },
  { konu: 'Kişisel Koruyucu Donanım (KKD)', yonetmelik: 'Kişisel Koruyucu Donanımların İşyerlerinde Kullanılması Hakkında Yönetmelik', sektor: 'Diğer', faaliyet: 'KKD bakım ve saklama', tehlike: 'Hasarlı veya süresi geçmiş KKD kullanımı', risk: 'KKD\'nin koruma sağlamaması', onlem: 'Periyodik KKD muayenesi, son kullanma tarihi takibi, uygun saklama koşulları', planlanan: 'Her KKD için son kullanma tarihi takibi yapan dijital envanter sistemi kurulacak', O: 3, F: 3, S: 7 }
].map(s => riskSablonuOlustur(Object.assign({ kaynak: 'hazir', sahipId: null }, s)));

function riskKaydiOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    riskNo: veriler.riskNo || '',
    yontem: RISK_YONTEMLERI.includes(veriler.yontem) ? veriler.yontem : 'Fine-Kinney',
    bolum: (veriler.bolum || '').trim(),
    yer: (veriler.yer || '').trim(),
    faaliyet: (veriler.faaliyet || '').trim(),
    tehlike: (veriler.tehlike || '').trim(),
    risk: (veriler.risk || '').trim(),
    onlem: (veriler.onlem || '').trim(),
    O: veriler.O || '',
    F: veriler.F || '',
    S: veriler.S || '',
    fotoOncesi: veriler.fotoOncesi || '',
    planlanan: (veriler.planlanan || '').trim(),
    On: veriler.On || '',
    Fn: veriler.Fn || '',
    Sn: veriler.Sn || '',
    fotoSonrasi: veriler.fotoSonrasi || '',
    sorumlu: (veriler.sorumlu || '').trim(),
    termin: veriler.termin || '',
    durum: veriler.durum || 'Açık',
    tespit: (veriler.tespit || '').trim(),
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString(),

    // Saha Dijital Haritası köprüsü — bkz. modules/harita.
    haritaTesisId: veriler.haritaTesisId || '',
    haritaX: veriler.haritaX !== undefined ? veriler.haritaX : '',
    haritaY: veriler.haritaY !== undefined ? veriler.haritaY : ''
  };
}
