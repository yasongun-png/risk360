// ÇSGB Denetimi takip modülü — veri modeli.
// Uygunsuzluk modülünün altında AYRI bir sayfadır (csgb.html); verisi normal
// uygunsuzluk kayıtlarından tamamen ayrıdır (kullanıcı isteği: "diğer
// uygunsuzluklarla aynı tabloyu kullanmayacağız").
//  - Denetim: müfettiş raporunun künyesi (rapor no/tarihi, tebliğ, süre...).
//  - Madde: rapordaki her madde, numarasıyla birebir (1, 2, 5.a, 5.b, 31.c).
//  - Takip toplantısı: dönemsel toplantı; madde bazında not + durum güncellemesi.

const CSGB_DENETIM_TURLERI = ['Programlı Teftiş', 'Şikâyet / İhbar', 'İş Kazası İncelemesi', 'Proje / Kampanya Denetimi', 'SEVESO / BEKRA Denetimi', 'Kontrol (Takip) Denetimi', 'Diğer'];
const CSGB_DENETIM_DURUMLARI = ['Giderme Sürecinde', 'Bakanlığa Bildirildi', 'Kapandı'];
// İçeride 'Kapalı' tutulur, ekranda/raporda "Tamamlandı" yazılır (bkz. csgbDurumEtiketi).
const CSGB_MADDE_DURUMLARI = ['Açık', 'Devam Ediyor', 'Kapalı', 'İptal'];
const CSGB_YUZDE_SECENEKLERI = [0, 25, 50, 75, 100];

function bugunIso() {
  const t = new Date();
  return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
}

function csgbDurumEtiketi(durum) {
  return durum === 'Kapalı' ? 'Tamamlandı' : (durum || '-');
}

// "Tamamlandı" / "tamamlandi" / "Kapalı" -> 'Kapalı'; tanınmayan -> 'Açık'.
function csgbDurumNormallestir(deger) {
  const d = String(deger || '').trim().toLocaleLowerCase('tr');
  if (!d) return 'Açık';
  if (d.startsWith('tamam') || d.startsWith('kapal')) return 'Kapalı';
  if (d.startsWith('devam')) return 'Devam Ediyor';
  if (d.startsWith('iptal')) return 'İptal';
  return 'Açık';
}

// "50", "%50", 50, 0.5 (Excel yüzde hücresi) -> 50; boş/geçersiz -> 0.
function csgbYuzdeNormallestir(deger) {
  if (deger === undefined || deger === null || String(deger).trim() === '') return 0;
  let n = Number(String(deger).replace('%', '').replace(',', '.').trim());
  if (!Number.isFinite(n)) return 0;
  if (n > 0 && n <= 1 && !String(deger).includes('%')) n = n * 100;
  return Math.max(0, Math.min(100, Math.round(n)));
}

// Tamamlanan madde her zaman %100 sayılır.
function csgbMaddeYuzdesi(madde) {
  return madde.durum === 'Kapalı' ? 100 : csgbYuzdeNormallestir(madde.tamamlanmaYuzdesi);
}

function csgbMaddeGecikmisMi(madde, bugunStr) {
  if (madde.durum === 'Kapalı' || madde.durum === 'İptal') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(madde.termin || '')) return false;
  return madde.termin < (bugunStr || bugunIso());
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

// Tebliğ tarihine verilen gün eklenerek son giderme tarihi (YYYY-MM-DD).
function csgbSonGidermeTarihiHesapla(tebligTarihi, gun) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tebligTarihi || '') || !(Number(gun) > 0)) return '';
  const [y, a, g] = tebligTarihi.split('-').map(Number);
  const t = new Date(y, a - 1, g + Number(gun));
  return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
}

function csgbDenetimOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    ad: (veriler.ad || '').trim(),
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
    // Takip toplantılarının sabit katılımcı listesi (bir kez girilir, her yeni
    // toplantı bununla dolu açılır) -- bkz. csgbKatilimcilariNormallestir.
    katilimcilar: csgbKatilimcilariNormallestir(veriler.katilimcilar),
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}

// Denetim maddesi. Alan adları raporlardaki sütunlarla eşleşir:
// denetimMaddeNo = Uygunsuzluk No, maddeKonusu = kısa konu, baslik = tam
// uygunsuzluk metni (tespit), duzelticiFaaliyet = gerekli tedbir,
// yasalDayanak = mevzuat.
// "24-1" -> "24", "31.c-2" -> "31.c"; parça numarası değilse ''.
function csgbAnaMaddeNoCikar(no) {
  const m = String(no ?? '').trim().match(/^(.*\S)\s*-\s*\d+$/);
  return m ? m[1] : '';
}

function csgbMaddeOlustur(veriler) {
  const durum = CSGB_MADDE_DURUMLARI.includes(veriler.durum) ? veriler.durum : csgbDurumNormallestir(veriler.durum);
  veriler = Object.assign({}, veriler, { anaMaddeNo: veriler.anaMaddeNo || csgbAnaMaddeNoCikar(veriler.denetimMaddeNo) });
  return {
    id: veriler.id || rastgeleId(),
    denetimId: veriler.denetimId || '',
    denetimMaddeNo: String(veriler.denetimMaddeNo ?? '').trim(),
    // Bölümlere ayrılmış maddelerde rapordaki asıl numara (ör. 36.b-2 -> "36.b").
    anaMaddeNo: String(veriler.anaMaddeNo ?? '').trim(),
    maddeKonusu: (veriler.maddeKonusu || '').trim(),
    baslik: (veriler.baslik || '').trim(),
    aciklama: (veriler.aciklama || '').trim(),
    duzelticiFaaliyet: (veriler.duzelticiFaaliyet || '').trim(),
    yasalDayanak: (veriler.yasalDayanak || '').trim(),
    bolum: (veriler.bolum || '').trim(),
    sorumlu: (veriler.sorumlu || '').trim(),
    termin: veriler.termin || '',
    durum,
    tamamlanmaYuzdesi: durum === 'Kapalı' ? 100 : csgbYuzdeNormallestir(veriler.tamamlanmaYuzdesi),
    kapanisTarihi: durum === 'Kapalı' ? (veriler.kapanisTarihi || bugunIso()) : '',
    kanitAciklamasi: (veriler.kanitAciklamasi || '').trim(),
    // [{ id, ad, tur: 'foto'|'pdf', ref: 'fotoref:..', tarih }] -- bkz. core/belge-yukle.js
    kanitlar: Array.isArray(veriler.kanitlar) ? veriler.kanitlar.filter(k => k && k.ref) : [],
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}

// Katılımcı listesi: [{ adSoyad, gorev, eposta }]. Eski metin biçimi ("Ad Soyad - Görevi",
// her satıra bir kişi) de okunur.
function csgbKatilimcilariNormallestir(deger) {
  const liste = Array.isArray(deger)
    ? deger
    : String(deger || '').split('\n').map(s => {
        const [ad, ...gorev] = s.split(' - ');
        return { adSoyad: ad, gorev: gorev.join(' - ') };
      });
  return liste
    .map(k => ({ adSoyad: String((k && k.adSoyad) || '').trim(), gorev: String((k && k.gorev) || '').trim(), eposta: String((k && k.eposta) || '').trim() }))
    .filter(k => k.adSoyad || k.gorev || k.eposta);
}

// Outlook'tan kopyalanan alıcı listesi: "Ad Soyad <ad@firma.com>; Ad2 <...>"
// (noktalı virgül, virgül ya da satır sonuyla ayrılmış; sadece e-posta da olur).
function csgbKatilimciMetniCoz(metin) {
  return String(metin || '').split(/[;\n]+/).map(s => s.trim()).filter(Boolean).map(parca => {
    const m = parca.match(/^"?(.*?)"?\s*<\s*([^>\s]+@[^>\s]+)\s*>$/);
    if (m) return { adSoyad: m[1].trim(), gorev: '', eposta: m[2].trim() };
    if (/^[^\s@]+@[^\s@]+$/.test(parca)) return { adSoyad: '', gorev: '', eposta: parca };
    return { adSoyad: parca, gorev: '', eposta: '' };
  });
}

// Madde metnindeki yer listesinden bölüm önerisi çıkarır: parantez içinde
// virgülle ayrılmış en az iki yer varsa onlar ("vb./vd." atılır).
// ör. "...kapıları(Can üretim tesisi, malzeme ambarı, su tasfiye ünitesi vb.)..."
function csgbBolumOnerileriCikar(metin) {
  const gruplar = String(metin || '').match(/\(([^()]*,[^()]*)\)/g) || [];
  for (const g of gruplar) {
    const parcalar = g.slice(1, -1).split(',')
      .map(s => s.replace(/\b(vb|vd|v\.b|v\.d)\.?\s*$/i, '').trim())
      .filter(s => s && s.length <= 80);
    // "2 nolu, 3 nolu", "1,5 katı", "senaryo-3, 5 ve 6" gibi yer olmayan listeler atlanır.
    const yerDegil = parcalar.some(s => /^\d/.test(s) || /\bnolu\b|\bkatı\b|senaryo/i.test(s) || s.length < 3);
    if (parcalar.length >= 2 && !yerDegil) return parcalar.map(s => s.charAt(0).toLocaleUpperCase('tr') + s.slice(1));
  }
  return [];
}

// maddeNotlari: { <madde id>: 'o toplantıda konuşulan/yapılan' }.
function csgbToplantiOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    denetimId: veriler.denetimId || '',
    tarih: veriler.tarih || bugunIso(),
    yer: (veriler.yer || '').trim(),
    katilimcilar: csgbKatilimcilariNormallestir(veriler.katilimcilar),
    genelNotlar: (veriler.genelNotlar || '').trim(),
    maddeNotlari: veriler.maddeNotlari && typeof veriler.maddeNotlari === 'object' ? veriler.maddeNotlari : {},
    sonrakiToplantiTarihi: veriler.sonrakiToplantiTarihi || '',
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}
