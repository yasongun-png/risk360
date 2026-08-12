// İSG Malzeme Talep veri modeli. Eski üretim uygulamasındaki material_request
// modülünden mümkün olduğunca aynı iş kuralları ve BİREBİR aynı çıktı metni/
// yapısı taşınmıştır: 16 gerekçe metni, durum iş akışı (19 aşama), yıl bazlı
// belge numaralandırma ("İSG.001"), otomatik talep metni üretimi. Çıktı
// belgesinin (Word) tam biçimlendirmesi cikti.js'te — burada sadece veri ve
// metin üretimi.

function bugunIso() {
  return new Date().toISOString().slice(0, 10);
}

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

function _satirlaraAyir(deger) {
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
    standartlar: _satirlaraAyir(veriler.standartlar),
    teknikOzellikler: _satirlaraAyir(veriler.teknikOzellikler),
    markaAlternatifleri: _satirlaraAyir(veriler.markaAlternatifleri),
    altKalemler: _satirlaraAyir(veriler.altKalemler),
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
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}
