// İSG Malzeme Talep — KKD modülünün kendi sekmesi (kullanıcı isteği: "İSG
// malzeme talebini KKD modülü içine alalım"). Eskiden modules/malzeme-talep/
// olarak ayrı bir modüldü; veri modeli + depolama + servis katmanı burada
// (model.js + repository.js + service.js + validation.js birleştirilmiş
// hâli), DOM işlemleri malzeme-talep-ui.js'te, çıktılar malzeme-talep-cikti.js'te.
// Tenant depolama anahtarları ('malzeme_talepleri', 'malzeme_katalogu')
// AYNEN korunmuştur — modules/raporlar/service.js bu anahtarları doğrudan
// okur, taşıma bu okumaları etkilemez.
//
// bugunIso() burada TEKRAR TANIMLANMAZ — modules/kkd/model.js'te zaten var
// (aynı sayfada birlikte yüklenir).

function trTarih(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return '';
  return d.toLocaleDateString('tr-TR');
}

// Eski uygulamadaki REASONS listesiyle birebir aynı (son madde serbest metin girişi tetikler).
const MALZEME_TALEP_GEREKCELERI = [
  'Yeni işbaşı yapan personel için',
  'Kullanım süresi dolan malzemelerin değişimi için',
  'Hasarlı malzemelerin değişimi için',
  'Stok eksikliğinin giderilmesi için',
  'Yeni çalışma alanı için',
  'Ziyaretçilerin kullanımı için',
  'Bakım ve onarım faaliyetleri için',
  'Kapalı alan çalışmaları için',
  'Yüksekte çalışma için',
  'Gürültülü çalışma alanları için',
  'Kimyasal çalışma için',
  'Yangın güvenliği için',
  'Saha sınırlandırması için',
  'İş ekipmanı eksikliğinin giderilmesi için',
  'Periyodik kalibrasyon veya bakım için',
  'Kullanıcı tarafından özel gerekçe'
];

// Eski uygulamadaki STATUS listesiyle birebir aynı — tek yönlü, doğrusal bir
// akış değil; kullanıcı serbestçe herhangi bir aşamaya geçebilir.
const MALZEME_TALEP_DURUMLARI = [
  'Taslak', 'Olur Hazırlandı', 'İmzaya Gönderildi', 'Olur Onayı Bekleniyor', 'Olur Onaylandı',
  'Satın Almaya İletildi', 'Teknik Şartname Hazırlanıyor', 'Teklif Bekleniyor', 'Teklifler Alındı',
  'Değerlendirme Aşamasında', 'Sipariş Verildi', 'Üretim veya Tedarik Aşamasında',
  'Kısmi Teslim Edildi', 'Teslim Edildi', 'Fatura Bekleniyor', 'Ödeme Bekleniyor',
  'Tamamlandı', 'Askıya Alındı', 'İptal Edildi'
];

const MALZEME_TALEP_ACILIYET = ['Normal', 'Yüksek', 'Acil'];
const MALZEME_BIRIMLERI = ['Adet', 'Çift', 'Metre', 'Set', 'İşlem', 'Kutu'];

// Hazır KKD kataloğu — modules/kkd/model.js'teki KKD_KATALOG ile aynı 60
// kalemlik referans liste (Baş/Göz-Yüz/Solunum/Kulak/El/Ayak/Düşme Önleyici/
// Vücut kategorileri), Malzeme Kataloğu şemasına eşlenmiş. "KKD Kataloğunu
// Yükle" düğmesiyle tek seferde (ada göre tekilleştirilerek) içe aktarılır —
// eski uygulamadaki KKD_CATALOG toplu yükleme özelliğiyle aynı mantık.
const MALZEME_KKD_KATALOG_TOHUMU = [
  { ad: 'Endüstriyel Baret', altKategori: 'Baş Koruyucu', standartlar: ['EN 397'] },
  { ad: 'Elektrik İzoleli Baret', altKategori: 'Baş Koruyucu', standartlar: ['EN 397', 'EN 50365'] },
  { ad: 'Hafif Kafa Koruyucu (Bump Cap)', altKategori: 'Baş Koruyucu', standartlar: ['EN 812'] },
  { ad: 'Yüksek Performanslı Endüstriyel Kask', altKategori: 'Baş Koruyucu', standartlar: ['EN 14052'] },

  { ad: 'Koruyucu Gözlük (Çapak / Toz)', altKategori: 'Göz ve Yüz Koruyucu', standartlar: ['EN 166'] },
  { ad: 'Kaynak Gözlüğü', altKategori: 'Göz ve Yüz Koruyucu', standartlar: ['EN 166', 'EN 169'] },
  { ad: 'Lazer Koruyucu Gözlük', altKategori: 'Göz ve Yüz Koruyucu', standartlar: ['EN 207', 'EN 208'] },
  { ad: 'Gözlük Tipi Kapalı Koruyucu (Goggle)', altKategori: 'Göz ve Yüz Koruyucu', standartlar: ['EN 166'] },
  { ad: 'Yüz Siperi (Face Shield)', altKategori: 'Göz ve Yüz Koruyucu', standartlar: ['EN 166', 'EN 1731'] },
  { ad: 'Kaynak Maskesi (Yüz Tipi / Başlık)', altKategori: 'Göz ve Yüz Koruyucu', standartlar: ['EN 175', 'EN 169'] },

  { ad: 'Toz Maskesi FFP1', altKategori: 'Solunum Koruyucu', standartlar: ['EN 149'] },
  { ad: 'Toz Maskesi FFP2', altKategori: 'Solunum Koruyucu', standartlar: ['EN 149'] },
  { ad: 'Toz Maskesi FFP3', altKategori: 'Solunum Koruyucu', standartlar: ['EN 149'] },
  { ad: 'Yarım Yüz Maske (Değiştirilebilir Filtreli)', altKategori: 'Solunum Koruyucu', standartlar: ['EN 140'] },
  { ad: 'Tam Yüz Maske', altKategori: 'Solunum Koruyucu', standartlar: ['EN 136'] },
  { ad: 'Gaz / Buhar Filtresi (ABEK)', altKategori: 'Solunum Koruyucu', standartlar: ['EN 14387'] },
  { ad: 'Parçacık Filtresi (P1/P2/P3)', altKategori: 'Solunum Koruyucu', standartlar: ['EN 143'] },
  { ad: 'Motorlu Hava Temizleyici Solunum Cihazı (PAPR)', altKategori: 'Solunum Koruyucu', standartlar: ['EN 12941', 'EN 12942'] },
  { ad: 'Hava Beslemeli Maske / Hat Sistemi', altKategori: 'Solunum Koruyucu', standartlar: ['EN 14594', 'EN 138'] },
  { ad: 'Kaçış Tipi Solunum Cihazı', altKategori: 'Solunum Koruyucu', standartlar: ['EN 403', 'EN 1146'] },
  { ad: 'Basınçlı Hava Tüplü Solunum Cihazı (SCBA)', altKategori: 'Solunum Koruyucu', standartlar: ['EN 137'] },

  { ad: 'Kulaklık (Ear Muff)', altKategori: 'Kulak Koruyucu', standartlar: ['EN 352-1'] },
  { ad: 'Kulak Tıkacı', altKategori: 'Kulak Koruyucu', standartlar: ['EN 352-2'] },
  { ad: 'Kafa Bantlı Kulak Tıkacı', altKategori: 'Kulak Koruyucu', standartlar: ['EN 352-3'] },
  { ad: 'Baret Montajlı Kulaklık', altKategori: 'Kulak Koruyucu', standartlar: ['EN 352-3'] },

  { ad: 'Genel Amaçlı İş Eldiveni (Mekanik Risk)', altKategori: 'El Koruyucu', standartlar: ['EN 388'] },
  { ad: 'Kimyasal Koruyucu Eldiven', altKategori: 'El Koruyucu', standartlar: ['EN 374'] },
  { ad: 'Isıya / Ateşe Karşı Koruyucu Eldiven', altKategori: 'El Koruyucu', standartlar: ['EN 407'] },
  { ad: 'Soğuğa Karşı Koruyucu Eldiven', altKategori: 'El Koruyucu', standartlar: ['EN 511'] },
  { ad: 'Elektrik Yalıtımlı Eldiven', altKategori: 'El Koruyucu', standartlar: ['EN 60903'] },
  { ad: 'Kesilmeye Dayanıklı Eldiven', altKategori: 'El Koruyucu', standartlar: ['EN 388', 'EN ISO 13997'] },
  { ad: 'Titreşim Önleyici Eldiven', altKategori: 'El Koruyucu', standartlar: ['EN ISO 10819'] },
  { ad: 'Tek Kullanımlık Muayene Eldiveni', altKategori: 'El Koruyucu', standartlar: ['EN 374', 'EN 455'] },

  { ad: 'Güvenlik Ayakkabısı (Burun Koruma Takozlu)', altKategori: 'Ayak Koruyucu', standartlar: ['EN ISO 20345'] },
  { ad: 'Koruyucu Ayakkabı (Burunsuz)', altKategori: 'Ayak Koruyucu', standartlar: ['EN ISO 20346'] },
  { ad: 'Mesleki Ayakkabı', altKategori: 'Ayak Koruyucu', standartlar: ['EN ISO 20347'] },
  { ad: 'Elektrik Yalıtımlı Ayakkabı', altKategori: 'Ayak Koruyucu', standartlar: ['EN 50321'] },
  { ad: 'Kimyasala Dayanıklı Çizme (PVC / Lastik)', altKategori: 'Ayak Koruyucu', standartlar: ['EN ISO 20345', 'EN 13832'] },
  { ad: 'Kaynakçı Ayakkabısı / Tozluğu', altKategori: 'Ayak Koruyucu', standartlar: ['EN ISO 20345'] },
  { ad: 'İtfaiyeci Botu', altKategori: 'Ayak Koruyucu', standartlar: ['EN 15090'] },

  { ad: 'Tam Vücut Emniyet Kemeri (Harness)', altKategori: 'Düşmeyi Önleyici Sistem', standartlar: ['EN 361'] },
  { ad: 'Bel Kemeri (Tutma Amaçlı)', altKategori: 'Düşmeyi Önleyici Sistem', standartlar: ['EN 358'] },
  { ad: 'Enerji Sönümleyici Bağlantı Halatı (Lanyard)', altKategori: 'Düşmeyi Önleyici Sistem', standartlar: ['EN 355'] },
  { ad: 'Karabina / Bağlantı Elemanı', altKategori: 'Düşmeyi Önleyici Sistem', standartlar: ['EN 362'] },
  { ad: 'Geri Sarmalı Düşme Durdurucu (Yoyo)', altKategori: 'Düşmeyi Önleyici Sistem', standartlar: ['EN 360'] },
  { ad: 'Sabit Ray / Halat Tipi Düşme Önleyici', altKategori: 'Düşmeyi Önleyici Sistem', standartlar: ['EN 353-1', 'EN 353-2'] },
  { ad: 'Ankraj Noktası', altKategori: 'Düşmeyi Önleyici Sistem', standartlar: ['EN 795'] },
  { ad: 'Kurtarma / Tahliye Ekipmanı', altKategori: 'Düşmeyi Önleyici Sistem', standartlar: ['EN 1496', 'EN 1497'] },

  { ad: 'Kimyasal Koruyucu Tulum (Tip 3/4 - Sıvı Geçirmez)', altKategori: 'Vücut Koruyucu', standartlar: ['EN 14605'] },
  { ad: 'Kimyasal Sıçramaya Dayanıklı Tulum (Tip 6)', altKategori: 'Vücut Koruyucu', standartlar: ['EN 13034'] },
  { ad: 'Parçacığa Dayanıklı Tulum (Tip 5)', altKategori: 'Vücut Koruyucu', standartlar: ['EN 13982-1'] },
  { ad: 'Yüksek Görünürlük Yelek / Giysi', altKategori: 'Vücut Koruyucu', standartlar: ['EN ISO 20471'] },
  { ad: 'Alev Almaz Koruyucu Giysi', altKategori: 'Vücut Koruyucu', standartlar: ['EN ISO 11612'] },
  { ad: 'Kaynakçı Önlüğü / Giysisi', altKategori: 'Vücut Koruyucu', standartlar: ['EN ISO 11611'] },
  { ad: 'Elektrik Arkına Dayanıklı Giysi', altKategori: 'Vücut Koruyucu', standartlar: ['EN 61482-1-2', 'EN 61482-2'] },
  { ad: 'Kesilmeye Dayanıklı Koruyucu Giysi', altKategori: 'Vücut Koruyucu', standartlar: ['EN 381', 'EN ISO 13998'] },
  { ad: 'Soğuk Ortam Koruyucu Giysi', altKategori: 'Vücut Koruyucu', standartlar: ['EN 342'] },
  { ad: 'Su Geçirmez / Yağmurluk Koruyucu Giysi', altKategori: 'Vücut Koruyucu', standartlar: ['EN 343'] }
];

function _mtSatirlaraAyir(deger) {
  if (Array.isArray(deger)) return deger.map(s => String(s).trim()).filter(Boolean);
  return String(deger || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
}

function malzemeSlugUret(deger) {
  return String(deger || 'dosya')
    .replace(/ı/g, 'i').replace(/İ/g, 'I').replace(/ş/g, 's').replace(/Ş/g, 'S')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'G').replace(/ç/g, 'c').replace(/Ç/g, 'C')
    .replace(/ö/g, 'o').replace(/Ö/g, 'O').replace(/ü/g, 'u').replace(/Ü/g, 'U')
    .replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

// Eski uygulamadaki fileName() ile birebir aynı desen.
function malzemeTalepDosyaAdiUret(talep, uzanti) {
  const ilkMalzeme = (talep.malzemeler && talep.malzemeler[0]) ? talep.malzemeler[0].ad : talep.konu;
  const siraNo = talep.siraNo ? String(talep.siraNo).padStart(3, '0') : 'TASLAK';
  return `ISG_${siraNo}_${malzemeSlugUret(ilkMalzeme)}_${trTarih(talep.talepTarihi).replace(/\./g, '-')}.${uzanti}`;
}

function malzemeKaydiOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    kod: (veriler.kod || '').trim(),
    ad: (veriler.ad || '').trim(),
    resmiAdi: (veriler.resmiAdi || '').trim(),
    kategori: (veriler.kategori || '').trim(),
    altKategori: (veriler.altKategori || '').trim(),
    birim: veriler.birim || 'Adet',
    varsayilanMiktar: veriler.varsayilanMiktar === '' || veriler.varsayilanMiktar == null ? null : Number(veriler.varsayilanMiktar),
    standartlar: _mtSatirlaraAyir(veriler.standartlar),
    teknikOzellikler: _mtSatirlaraAyir(veriler.teknikOzellikler),
    markaAlternatifleri: _mtSatirlaraAyir(veriler.markaAlternatifleri),
    altKalemler: _mtSatirlaraAyir(veriler.altKalemler),
    kullanimAmaci: (veriler.kullanimAmaci || '').trim(),
    riskAciklamasi: (veriler.riskAciklamasi || '').trim(),
    aktifMi: veriler.aktifMi !== undefined ? !!veriler.aktifMi : true,
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}

// Seçilen katalog malzemesinden bir talep satırı (snapshot) üretir — sonraki
// katalog değişiklikleri geçmiş taleplerdeki bu kopyayı etkilemez.
function malzemeTalepSatiriOlustur(malzeme, ekVeriler) {
  const ek = ekVeriler || {};
  return {
    id: rastgeleId(),
    malzemeId: malzeme.id,
    ad: malzeme.ad,
    resmiAdi: malzeme.resmiAdi || malzeme.ad,
    kod: malzeme.kod,
    kategori: malzeme.kategori,
    birim: malzeme.birim || 'Adet',
    miktar: ek.miktar != null ? Number(ek.miktar) : 1,
    standartlar: (malzeme.standartlar || []).slice(),
    teknikOzellikler: (malzeme.teknikOzellikler || []).slice(),
    markaAlternatifleri: (malzeme.markaAlternatifleri || []).slice(),
    altKalemler: (malzeme.altKalemler || []).slice(),
    seciliAltKalemler: [],
    kullanimAmaci: malzeme.kullanimAmaci || '',
    riskAciklamasi: malzeme.riskAciklamasi || '',
    renk: '', beden: '', numara: '', marka: '', aciklama: ''
  };
}

// Eski uygulamadaki generate() ile birebir aynı metin kalıbı.
function malzemeTalepMetniUret(secilenMalzemeler, gerekceMetni) {
  if (!secilenMalzemeler || !secilenMalzemeler.length) return '';
  if (secilenMalzemeler.length === 1) {
    const m = secilenMalzemeler[0];
    const p = m.kullanimAmaci || gerekceMetni || '';
    const buyukHarfli = p.charAt(0).toLocaleUpperCase('tr-TR') + p.slice(1);
    return `${buyukHarfli} amacıyla, teknik özellikleri aşağıda belirtilen ${m.miktar} ${m.birim} ${m.resmiAdi || m.ad} temin edilmesini arz ederim.`;
  }
  return `${gerekceMetni} kapsamında, aşağıda cins ve miktarları belirtilen malzemelerin temin edilmesini arz ederim.`;
}

function malzemeTalepKaydiOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    yil: veriler.yil || new Date(veriler.talepTarihi || bugunIso()).getFullYear(),
    siraNo: veriler.siraNo || null,
    belgeNo: veriler.belgeNo || '',
    ustBelgeNo: veriler.ustBelgeNo || '',
    talepTarihi: veriler.talepTarihi || bugunIso(),
    konu: (veriler.konu || '').trim(),
    aciklama: (veriler.aciklama || '').trim(),
    uretilenMetin: (veriler.uretilenMetin || '').trim(),
    duzenlenmisMetin: (veriler.duzenlenmisMetin || veriler.uretilenMetin || '').trim(),
    talepEdenBirim: (veriler.talepEdenBirim || '').trim(),
    kullanimBolumu: (veriler.kullanimBolumu || '').trim(),
    aciliyet: veriler.aciliyet || 'Normal',
    mudurluk: (veriler.mudurluk || '').trim(),
    hitap: (veriler.hitap || '').trim(),
    imzaYetkilisi: (veriler.imzaYetkilisi || '').trim(),
    unvan: (veriler.unvan || '').trim(),
    durum: veriler.durum || 'Taslak',
    malzemeler: Array.isArray(veriler.malzemeler) ? veriler.malzemeler : [],
    // Kullanıcı isteği: "üretilen ör. malzeme talep oluru imzalı pdf halini
    // yükleyebileyim" (bkz. core/belge-yukle.js).
    imzaliBelgeUrl: veriler.imzaliBelgeUrl || '',
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}

// ==================== DOĞRULAMA ====================

function malzemeDogrula(veriler) {
  const hatalar = {};
  if (!veriler.ad || !veriler.ad.trim()) hatalar.ad = 'Malzeme adı zorunludur.';
  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}

// Eski uygulamadaki kurallarla aynı: talep tarihi + konu zorunlu, en az bir
// malzeme seçili, tüm miktarlar pozitif.
function malzemeTalepDogrula(veriler, secilenMalzemeler) {
  const hatalar = {};
  if (!veriler.talepTarihi) hatalar.talepTarihi = 'Talep tarihi zorunludur.';
  if (!veriler.konu || !veriler.konu.trim()) hatalar.konu = 'Konu / Özü zorunludur.';
  if (!secilenMalzemeler || !secilenMalzemeler.length) hatalar.malzemeler = 'En az bir malzeme seçin.';
  else if (secilenMalzemeler.some(m => !(Number(m.miktar) > 0))) hatalar.malzemeler = 'Tüm malzemelerin miktarı pozitif olmalıdır.';
  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}

// ==================== DEPOLAMA ====================

function _malzemeKatalogAnahtari() { return tenantAnahtar('malzeme_katalogu'); }
function _malzemeTalepAnahtari() { return tenantAnahtar('malzeme_talepleri'); }

function malzemeTumunuGetir() { return oku(_malzemeKatalogAnahtari(), []); }
function _malzemeKaydet(liste) { yaz(_malzemeKatalogAnahtari(), liste); }

function malzemeEkleRepo(kayit) {
  const liste = malzemeTumunuGetir();
  liste.push(kayit);
  _malzemeKaydet(liste);
  return kayit;
}

function malzemeGuncelleRepo(id, veriler) {
  const liste = malzemeTumunuGetir();
  const index = liste.findIndex(k => k.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], veriler);
  _malzemeKaydet(liste);
  return liste[index];
}

function malzemeSilRepo(id) {
  _malzemeKaydet(malzemeTumunuGetir().filter(k => k.id !== id));
}

function malzemeIdIleGetirRepo(id) {
  return malzemeTumunuGetir().find(k => k.id === id) || null;
}

function malzemeTalepTumunuGetir() { return oku(_malzemeTalepAnahtari(), []); }
function _malzemeTalepKaydet(liste) { yaz(_malzemeTalepAnahtari(), liste); }

function malzemeTalepEkleRepo(kayit) {
  const liste = malzemeTalepTumunuGetir();
  liste.push(kayit);
  _malzemeTalepKaydet(liste);
  return kayit;
}

function malzemeTalepGuncelleRepo(id, veriler) {
  const liste = malzemeTalepTumunuGetir();
  const index = liste.findIndex(k => k.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], veriler);
  _malzemeTalepKaydet(liste);
  return liste[index];
}

function malzemeTalepSilRepo(id) {
  _malzemeTalepKaydet(malzemeTalepTumunuGetir().filter(k => k.id !== id));
}

function malzemeTalepIdIleGetirRepo(id) {
  return malzemeTalepTumunuGetir().find(k => k.id === id) || null;
}

// ==================== SERVİS ====================

function _malzemeTalepAyarAnahtari() { return tenantAnahtar('malzeme_talep_ayarlari'); }

// Eski uygulamadaki DEF varsayılanları — kiracıya özel olduğundan burada
// sabit değer olarak DOLDURULMAZ, ilk kullanımda boş gelir ve Ayarlar
// bölümünden bir kez girilip sonra hatırlanır (bkz. core/form-ayarlari.js'teki
// aynı desen).
function malzemeTalepAyarlariGetir() {
  return oku(_malzemeTalepAyarAnahtari(), {
    mudurluk: '', hitap: '', imzaYetkilisi: '', unvan: '', paraf: ''
  });
}

function malzemeTalepAyarlariKaydet(ayarlar) {
  yaz(_malzemeTalepAyarAnahtari(), {
    mudurluk: (ayarlar.mudurluk || '').trim(),
    hitap: (ayarlar.hitap || '').trim(),
    imzaYetkilisi: (ayarlar.imzaYetkilisi || '').trim(),
    unvan: (ayarlar.unvan || '').trim(),
    paraf: (ayarlar.paraf || '').trim()
  });
}

// ==================== MALZEME KATALOĞU ====================

function malzemeleriGetir(aramaMetni, filtreler) {
  const f = filtreler || {};
  let liste = malzemeTumunuGetir();

  if (f.kategori) liste = liste.filter(m => m.kategori === f.kategori);
  if (f.aktifMi === 'Aktif') liste = liste.filter(m => m.aktifMi);
  if (f.aktifMi === 'Pasif') liste = liste.filter(m => !m.aktifMi);

  if (aramaMetni) {
    const kucuk = aramaMetni.trim().toLowerCase();
    liste = liste.filter(m =>
      m.ad.toLowerCase().includes(kucuk) ||
      (m.kod || '').toLowerCase().includes(kucuk) ||
      (m.kategori || '').toLowerCase().includes(kucuk)
    );
  }

  return liste.sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
}

function malzemeEkle(veriler) {
  const dogrulama = malzemeDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  if (veriler.kod && malzemeTumunuGetir().some(m => m.kod.toLowerCase() === veriler.kod.trim().toLowerCase())) {
    return { basarili: false, hatalar: { kod: 'Bu malzeme kodu zaten kullanılıyor.' } };
  }

  const yeniKayit = malzemeKaydiOlustur(veriler);
  malzemeEkleRepo(yeniKayit);
  return { basarili: true, kayit: yeniKayit };
}

// Hazır KKD kataloğunu (MALZEME_KKD_KATALOG_TOHUMU) mevcut kataloğa ekler —
// eski uygulamadaki gibi ada göre tekilleştirilir, zaten var olan malzemeler
// tekrar eklenmez.
function kkdKatalogunuYukle() {
  const mevcutAdlar = new Set(malzemeTumunuGetir().map(m => m.ad.toLocaleLowerCase('tr-TR')));
  let eklenen = 0;
  MALZEME_KKD_KATALOG_TOHUMU.forEach(tohum => {
    if (mevcutAdlar.has(tohum.ad.toLocaleLowerCase('tr-TR'))) return;
    malzemeEkleRepo(malzemeKaydiOlustur({
      ad: tohum.ad,
      kategori: 'KKD',
      altKategori: tohum.altKategori,
      birim: 'Adet',
      standartlar: tohum.standartlar
    }));
    eklenen++;
  });
  return { basarili: true, eklenen, atlanan: MALZEME_KKD_KATALOG_TOHUMU.length - eklenen };
}

function malzemeGuncelle(id, veriler) {
  const dogrulama = malzemeDogrula(veriler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  if (veriler.kod && malzemeTumunuGetir().some(m => m.id !== id && m.kod.toLowerCase() === veriler.kod.trim().toLowerCase())) {
    return { basarili: false, hatalar: { kod: 'Bu malzeme kodu zaten kullanılıyor.' } };
  }

  const guncellenen = malzemeGuncelleRepo(id, {
    kod: (veriler.kod || '').trim(),
    ad: veriler.ad.trim(),
    resmiAdi: (veriler.resmiAdi || '').trim(),
    kategori: (veriler.kategori || '').trim(),
    altKategori: (veriler.altKategori || '').trim(),
    birim: veriler.birim || 'Adet',
    varsayilanMiktar: veriler.varsayilanMiktar === '' || veriler.varsayilanMiktar == null ? null : Number(veriler.varsayilanMiktar),
    standartlar: Array.isArray(veriler.standartlar) ? veriler.standartlar : String(veriler.standartlar || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean),
    teknikOzellikler: Array.isArray(veriler.teknikOzellikler) ? veriler.teknikOzellikler : String(veriler.teknikOzellikler || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean),
    markaAlternatifleri: Array.isArray(veriler.markaAlternatifleri) ? veriler.markaAlternatifleri : String(veriler.markaAlternatifleri || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean),
    altKalemler: Array.isArray(veriler.altKalemler) ? veriler.altKalemler : String(veriler.altKalemler || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean),
    kullanimAmaci: (veriler.kullanimAmaci || '').trim(),
    riskAciklamasi: (veriler.riskAciklamasi || '').trim(),
    aktifMi: veriler.aktifMi !== undefined ? !!veriler.aktifMi : true
  });
  if (!guncellenen) return { basarili: false, hata: 'Kayıt bulunamadı.' };
  return { basarili: true, kayit: guncellenen };
}

function malzemeSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  malzemeSilRepo(id);
  return { basarili: true };
}

// Bir malzeme başka bir AKTİF (Tamamlandı/İptal Edildi dışı) talepte zaten
// var mı — eski uygulamadaki uyarı ("Devam eden X numaralı talep var").
function malzemeAktifTalepteMi(malzemeId) {
  const kapaliDurumlar = ['Tamamlandı', 'İptal Edildi'];
  return malzemeTalepTumunuGetir().find(t =>
    !kapaliDurumlar.includes(t.durum) && (t.malzemeler || []).some(m => m.malzemeId === malzemeId)
  ) || null;
}

// ==================== TALEP ====================

function malzemeTalepleriGetir(aramaMetni, filtreler) {
  const f = filtreler || {};
  let liste = malzemeTalepTumunuGetir();

  if (f.durum) liste = liste.filter(t => t.durum === f.durum);
  if (f.gecikenlerMi) {
    const bugun = bugunIso();
    liste = liste.filter(t => !['Teslim Edildi', 'Tamamlandı', 'İptal Edildi'].includes(t.durum) && t.talepTarihi < bugun);
  }

  if (aramaMetni) {
    const kucuk = aramaMetni.trim().toLowerCase();
    liste = liste.filter(t =>
      t.konu.toLowerCase().includes(kucuk) ||
      (t.belgeNo || '').toLowerCase().includes(kucuk) ||
      (t.talepEdenBirim || '').toLowerCase().includes(kucuk)
    );
  }

  return liste.sort((a, b) => (b.belgeNo || '').localeCompare(a.belgeNo || ''));
}

// Eski uygulamadaki saveRequest() numaralandırma mantığıyla birebir aynı:
// yıl + o yıl içindeki en yüksek sıra no + 1; belge arşivlense/silinse bile
// numara tekrar kullanılmaz (max hesaplaması tüm kayıtlar üzerinden yapılır).
function _malzemeTalepSiraNoUret(yil) {
  const mevcut = malzemeTalepTumunuGetir().filter(t => t.yil === yil && Number.isFinite(t.siraNo)).map(t => t.siraNo);
  return (mevcut.length ? Math.max(...mevcut) : 0) + 1;
}

function malzemeTalepEkle(veriler, secilenMalzemeler) {
  const dogrulama = malzemeTalepDogrula(veriler, secilenMalzemeler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const yil = new Date(veriler.talepTarihi).getFullYear();
  const siraNo = _malzemeTalepSiraNoUret(yil);
  const belgeNo = `İSG.${String(siraNo).padStart(3, '0')}`;
  const ustBelgeNo = `İSG.:${String(siraNo).padStart(2, '0')}`;

  const yeniKayit = malzemeTalepKaydiOlustur(Object.assign({}, veriler, {
    yil, siraNo, belgeNo, ustBelgeNo,
    malzemeler: JSON.parse(JSON.stringify(secilenMalzemeler))
  }));
  malzemeTalepEkleRepo(yeniKayit);
  return { basarili: true, kayit: yeniKayit };
}

function malzemeTalepGuncelle(id, veriler, secilenMalzemeler) {
  const dogrulama = malzemeTalepDogrula(veriler, secilenMalzemeler);
  if (!dogrulama.gecerli) return { basarili: false, hatalar: dogrulama.hatalar };

  const guncellenen = malzemeTalepGuncelleRepo(id, {
    talepTarihi: veriler.talepTarihi,
    konu: veriler.konu.trim(),
    aciklama: (veriler.aciklama || '').trim(),
    uretilenMetin: (veriler.uretilenMetin || '').trim(),
    duzenlenmisMetin: (veriler.duzenlenmisMetin || veriler.uretilenMetin || '').trim(),
    talepEdenBirim: (veriler.talepEdenBirim || '').trim(),
    kullanimBolumu: (veriler.kullanimBolumu || '').trim(),
    aciliyet: veriler.aciliyet || 'Normal',
    mudurluk: (veriler.mudurluk || '').trim(),
    hitap: (veriler.hitap || '').trim(),
    imzaYetkilisi: (veriler.imzaYetkilisi || '').trim(),
    unvan: (veriler.unvan || '').trim(),
    durum: veriler.durum || 'Taslak',
    malzemeler: JSON.parse(JSON.stringify(secilenMalzemeler))
  });
  if (!guncellenen) return { basarili: false, hata: 'Kayıt bulunamadı.' };
  return { basarili: true, kayit: guncellenen };
}

function malzemeTalepDurumGuncelle(id, yeniDurum) {
  const guncellenen = malzemeTalepGuncelleRepo(id, { durum: yeniDurum });
  if (!guncellenen) return { basarili: false, hata: 'Kayıt bulunamadı.' };
  return { basarili: true, kayit: guncellenen };
}

// Kullanıcı isteği: "üretilen ör. malzeme talep oluru imzalı pdf halini
// yükleyebileyim" (bkz. core/belge-yukle.js).
function malzemeTalepBelgeGuncelle(id, referans) {
  const guncellenen = malzemeTalepGuncelleRepo(id, { imzaliBelgeUrl: referans || '' });
  if (!guncellenen) return { basarili: false, hata: 'Kayıt bulunamadı.' };
  return { basarili: true, kayit: guncellenen };
}

function malzemeTalepSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false, hata: 'Bu işlem için silme yetkiniz yok.' };
  malzemeTalepSilRepo(id);
  return { basarili: true };
}

function malzemeTalepOzetiHesapla() {
  const liste = malzemeTalepTumunuGetir();
  const bugun = bugunIso();
  const kapali = ['Teslim Edildi', 'Tamamlandı', 'İptal Edildi'];
  const grupla = (secici) => {
    const sonuc = {};
    liste.forEach(t => { const k = secici(t) || 'Belirtilmemiş'; sonuc[k] = (sonuc[k] || 0) + 1; });
    return Object.entries(sonuc).sort((a, b) => b[1] - a[1]);
  };

  return {
    toplam: liste.length,
    buYil: liste.filter(t => t.yil === new Date().getFullYear()).length,
    aktif: liste.filter(t => !kapali.includes(t.durum)).length,
    geciken: liste.filter(t => !kapali.includes(t.durum) && t.talepTarihi < bugun).length,
    durumaGore: grupla(t => t.durum)
  };
}
