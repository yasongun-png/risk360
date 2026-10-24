// Uygunsuzluk / DÖF (Düzeltici ve Önleyici Faaliyet) veri modeli.

const UYGUNSUZLUK_DURUMLARI = ['Açık', 'Devam Ediyor', 'Onay Bekliyor', 'Kapalı', 'İptal'];
const ONAY_DURUMLARI = ['Onay Gerekmiyor', 'Onay Bekliyor', 'Onaylandı', 'Reddedildi'];
const RISK_SEVIYELERI = ['Düşük', 'Orta', 'Yüksek', 'Çok Yüksek'];
// Kullanıcı isteği (2026-10-24): Uygunsuzluk modülünde İSG ve Çevre sekmeleri.
// index.html?alan=cevre -> Çevre: kayıtlar ve ayarlar ayrı anahtarlarda
// (cevre_uygunsuzluk_*) tutulur; diğer modüllerin (Olay/Kaza, Saha Denetim,
// Kurul, Raporlar) okuduğu/yazdığı İSG kayıtlarına karışmaz. Kaynak türleri ve
// mevzuat listesi çevreye göredir.
const UYG_CEVRE_MODU = typeof location !== 'undefined' && new URLSearchParams(location.search).get('alan') === 'cevre';
const UYG_ALAN_ETIKETI = UYG_CEVRE_MODU ? 'Çevre' : 'İSG';
function uygunsuzlukAnahtari(ad) { return tenantAnahtar((UYG_CEVRE_MODU ? 'cevre_' : '') + ad); }

const ISG_KAYNAK_TURLERI = ['Saha Denetimi', 'İş Kazası', 'Ramak Kala', 'Yasal Şart', 'Risk Değerlendirme', 'İSG Kurul', 'JSA (İş Güvenliği Analizi)', 'Manuel Bildirim'];
const CEVRE_KAYNAK_TURLERI = [
  'Saha Denetimi', 'Çevre Denetimi (Bakanlık / İl Müdürlüğü)', 'İç Denetim (ISO 14001)', 'Çevresel Olay (Dökülme / Sızıntı / Yangın)',
  'Emisyon / Ölçüm Sonucu', 'Atıksu / Deşarj Analizi', 'Atık Yönetimi Kontrolü', 'Çevre İzni / Lisans Şartı', 'Yasal Şart',
  'Çevresel Boyut Değerlendirmesi', 'Şikâyet (Komşu / Kamu)', 'Manuel Bildirim'
];
const KAYNAK_TURLERI = UYG_CEVRE_MODU ? CEVRE_KAYNAK_TURLERI : ISG_KAYNAK_TURLERI;

// Çevre sekmesinin "İlgili Yasal Şartlar" listesi.
const CEVRE_YASAL_SART_LISTESI = [
  '2872 sayılı Çevre Kanunu',
  '5491 sayılı Çevre Kanununda Değişiklik Yapılmasına Dair Kanun',
  '5312 sayılı Deniz Çevresinin Petrol ve Diğer Zararlı Maddelerle Kirlenmesinde Acil Durumlarda Müdahale Kanunu',
  'Çevre İzin ve Lisans Yönetmeliği',
  'Çevre Denetimi Yönetmeliği',
  'Çevre Yönetimi Hizmetleri Hakkında Yönetmelik',
  'Çevresel Etki Değerlendirmesi (ÇED) Yönetmeliği',
  'İdari Para Cezalarında Uygulama Usul ve Esasları (Çevre)',
  'Atık Yönetimi Yönetmeliği',
  'Sıfır Atık Yönetmeliği',
  'Ambalaj Atıklarının Kontrolü Yönetmeliği',
  'Atık Yağların Kontrolü Yönetmeliği',
  'Bitkisel Atık Yağların Kontrolü Yönetmeliği',
  'Atık Pil ve Akümülatörlerin Kontrolü Yönetmeliği',
  'Atık Elektrikli ve Elektronik Eşyaların Kontrolü Yönetmeliği',
  'Ömrünü Tamamlamış Lastiklerin Kontrolü Yönetmeliği',
  'Tıbbi Atıkların Kontrolü Yönetmeliği',
  'Hafriyat Toprağı, İnşaat ve Yıkıntı Atıklarının Kontrolü Yönetmeliği',
  'Atıkların Düzenli Depolanmasına Dair Yönetmelik',
  'Atıkların Yakılmasına İlişkin Yönetmelik',
  'Atıktan Türetilmiş Yakıt, Ek Yakıt ve Alternatif Hammadde Tebliği',
  'Su Kirliliği Kontrolü Yönetmeliği',
  'Atıksu Arıtma Tesisleri Teknik Usuller Tebliği',
  'Kentsel Atıksu Arıtımı Yönetmeliği',
  'Atıksuların Kanalizasyon Şebekesine Deşarj Yönetmeliği (İSKİ / yerel idare)',
  'Yüzeysel Su Kalitesi Yönetmeliği',
  'Yeraltı Sularının Kirlenmeye ve Bozulmaya Karşı Korunması Hakkında Yönetmelik',
  'Toprak Kirliliğinin Kontrolü ve Noktasal Kaynaklı Kirlenmiş Sahalara Dair Yönetmelik',
  'Sanayi Kaynaklı Hava Kirliliğinin Kontrolü Yönetmeliği (SKHKKY)',
  'Hava Kalitesi Değerlendirme ve Yönetimi Yönetmeliği',
  'Isınmadan Kaynaklanan Hava Kirliliğinin Kontrolü Yönetmeliği',
  'Emisyon Ölçüm Cihazları / Sürekli Emisyon İzleme Sistemleri Tebliği',
  'Sera Gazı Emisyonlarının Takibi Hakkında Yönetmelik',
  'Florlu Sera Gazlarına İlişkin Yönetmelik',
  'Ozon Tabakasını İncelten Maddelere İlişkin Yönetmelik',
  'Çevresel Gürültünün Değerlendirilmesi ve Yönetimi Yönetmeliği',
  'Büyük Endüstriyel Kazaların Önlenmesi ve Etkilerinin Azaltılması Hakkında Yönetmelik (SEVESO)',
  'Kimyasalların Kaydı, Değerlendirilmesi, İzni ve Kısıtlanması Hakkında Yönetmelik (KKDİK)',
  'Zararlı Maddelerin ve Karışımların Sınıflandırılması, Etiketlenmesi ve Ambalajlanması Hakkında Yönetmelik (SEA)',
  'Tehlikeli Maddelerin Karayoluyla Taşınması Hakkında Yönetmelik (ADR)',
  'Gemilerden Atık Alınması ve Atıkların Kontrolü Yönetmeliği',
  'Kıyı Kanunu ve Uygulama Yönetmeliği',
  'İşletmeye özgü Çevre İzni / Lisans Şartları',
  'ISO 14001 Çevre Yönetim Sistemi',
  'ISO 50001 Enerji Yönetim Sistemi'
];

// Eski isg platformundaki ("İlgili Yasal Şartlar" çoklu seçim listesi) ile
// birebir aynı liste — kayıtlar birden fazla mevzuata birden bağlanabilir.
const ISG_YASAL_SART_LISTESI = [
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
const YASAL_SART_LISTESI = UYG_CEVRE_MODU ? CEVRE_YASAL_SART_LISTESI : ISG_YASAL_SART_LISTESI;

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

function uygunsuzlukKaydiOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    aksiyonNo: veriler.aksiyonNo || '',

    konuId: veriler.konuId || '',
    konuAdi: (veriler.konuAdi || '').trim(),

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
