// Saha Dijital Haritası — kayıt türleri, alt türler, numaralandırma ve
// dönüştürme kuralları. Bağımsız referans uygulamadan (Desktop/haritamodülü)
// birebir mantıkla, risk360'ın Türkçe adlandırma ve tenant-scoped depolama
// konvansiyonlarına taşındı.

const HARITA_TIPLERI = {
  uygunsuzluk: {
    // ⚠️ sembol karakteri diğer (dolgulu) emojilere göre çok daha küçük/ince
    // görünüyordu — 🔺 aynı boyutta çok daha dolgun/okunaklı çiziliyor.
    etiket: 'Uygunsuzluk', ikon: '🔺', renk: '#e53935', onek: 'UYG',
    durumlar: ['Açık', 'Kapalı'], varsayilanDurum: 'Açık'
  },
  ariza: {
    etiket: 'Arıza', ikon: '🔧', renk: '#fb8c00', onek: 'ARZ',
    durumlar: ['Açık', 'Bakımda', 'Kapalı'], varsayilanDurum: 'Açık'
  },
  risk: {
    etiket: 'Risk', ikon: '💀', renk: '#fdd835', onek: 'RSK',
    durumlar: ['Aktif', 'Dönüştürüldü', 'Kapalı'], varsayilanDurum: 'Aktif'
  },
  yangin_tupu: {
    etiket: 'Yangın Tüpü', ikon: '🧯', renk: '#c62828', onek: 'YSC',
    durumlar: ['Kullanılabilir', 'Kontrol Bekliyor', 'Arızalı', 'Kullanılamaz'], varsayilanDurum: 'Kullanılabilir'
  },
  yangin: {
    etiket: 'Yangın Ekipmanı', ikon: '🧯', renk: '#c62828',
    durumlar: ['Kullanılabilir', 'Kontrol Bekliyor', 'Arızalı', 'Kullanılamaz'], varsayilanDurum: 'Kullanılabilir',
    altTipler: {
      dolap: { etiket: 'Yangın Dolabı', onek: 'YD', ikon: '🗄️' },
      hidrant: { etiket: 'Hidrant', onek: 'HD', ikon: '🚰' },
      alarm_butonu: { etiket: 'Yangın Alarm Butonu', onek: 'YAB', ikon: '🔔' },
      monitor: { etiket: 'Yangın Monitörü', onek: 'YM', ikon: '💦' },
      sprinkler: { etiket: 'Sprinkler Sistemi', onek: 'SPK', ikon: '💧' },
      kopuk: { etiket: 'Köpük Sistemi', onek: 'KOP', ikon: '🫧' },
      diger: { etiket: 'Diğer', onek: 'YX' }
    }
  },
  acil_ekipman: {
    etiket: 'Acil Durum Ekipmanı', ikon: '🚨', renk: '#1e88e5',
    durumlar: ['Kullanılabilir', 'Kontrol Bekliyor', 'Arızalı', 'Kullanılamaz'], varsayilanDurum: 'Kullanılabilir',
    altTipler: {
      goz_dusu: { etiket: 'Göz Duşu', onek: 'GD', ikon: '🚿' },
      acil_dus: { etiket: 'Acil Duş', onek: 'AD', ikon: '🚿' },
      ilkyardim: { etiket: 'İlk Yardım Dolabı', onek: 'ECZ', ikon: '⛑️' },
      sedye: { etiket: 'Sedye', onek: 'SED', ikon: '🛏️' },
      acil_dolap: { etiket: 'Acil Durum Dolabı', onek: 'ADO', ikon: '🗄️' },
      solunum: { etiket: 'Solunum Cihazı', onek: 'SC', ikon: '😷' },
      kacis_ekipmani: { etiket: 'Kaçış Ekipmanı', onek: 'KEK', ikon: '🎒' }
    }
  },
  kkd: {
    etiket: 'KKD Noktası', ikon: '🦺', renk: '#00897b',
    durumlar: ['Kullanılabilir', 'Kontrol Bekliyor', 'Arızalı', 'Kullanılamaz'], varsayilanDurum: 'Kullanılabilir',
    altTipler: {
      kkd_dolabi: { etiket: 'KKD Dolabı', onek: 'KKD', ikon: '🗄️' },
      baret: { etiket: 'Baret Noktası', onek: 'BRT', ikon: '⛑️' },
      gozluk: { etiket: 'Gözlük Noktası', onek: 'GZL', ikon: '🥽' },
      kimyasal_kkd: { etiket: 'Kimyasal KKD Noktası', onek: 'KKY', ikon: '🧤' },
      acil_kkd: { etiket: 'Acil KKD Noktası', onek: 'AKK', ikon: '🦺' }
    }
  },
  cikis: {
    etiket: 'Acil Çıkış / Kaçış Yolu', ikon: '🚪', renk: '#2e7d32',
    durumlar: ['Açık', 'Engelli', 'Kapalı'], varsayilanDurum: 'Açık',
    altTipler: {
      acil_cikis: { etiket: 'Acil Çıkış Kapısı', onek: 'AC', ikon: '🚪' },
      kacis_yolu: { etiket: 'Kaçış Yolu', onek: 'KCY', ikon: '🏃' },
      acil_merdiven: { etiket: 'Acil Durum Çıkış Merdiveni', onek: 'AM', ikon: '🪜' }
    }
  },
  toplanma: {
    etiket: 'Acil Durum Toplanma Bölgesi', ikon: '🧭', renk: '#00838f', onek: 'TA',
    durumlar: ['Uygun', 'Engelli', 'Kullanım Dışı'], varsayilanDurum: 'Uygun'
  },
  fotograf: {
    etiket: 'Fotoğraf Noktası', ikon: '📷', renk: '#757575', onek: 'FOT',
    durumlar: ['Kayıtlı'], varsayilanDurum: 'Kayıtlı'
  },
  ekipman: {
    etiket: 'Ekipman / Tesis', ikon: '⚙️', renk: '#6a1b9a', onek: 'EKP',
    durumlar: ['Çalışıyor', 'Bakımda', 'Durdu'], varsayilanDurum: 'Çalışıyor'
  },
  boru_koprusu: {
    // Emoji köprü ("🌉") gece manzarası gibi görünüyordu, dolgun kare de
    // ("🟫") köprüye benzemiyordu — "∩" ince, sade bir çizgi sembolü ve
    // gerçekten iki ayaklı bir köprü/gantry siluetine benziyor.
    etiket: 'Boru Köprüsü', ikon: '∩', renk: '#795548', onek: 'BK',
    durumlar: ['Uygun', 'Bakımda', 'Arızalı', 'Kullanım Dışı'], varsayilanDurum: 'Uygun'
  },
  diger: {
    etiket: 'Diğer', ikon: '📍', renk: '#546e7a', onek: 'DIG',
    durumlar: ['Kayıtlı'], varsayilanDurum: 'Kayıtlı'
  }
};

const HARITA_RISK_SEVIYELERI = ['Düşük', 'Orta', 'Yüksek', 'Kritik'];

const HARITA_DURUM_NOKTASI = {
  'Kullanılabilir': '🟢', 'Çalışıyor': '🟢', 'Açık': '🟢', 'Aktif': '🟢', 'Kayıtlı': '🟢', 'Uygun': '🟢',
  'Kontrol Bekliyor': '🟡', 'Bakımda': '🟡', 'Devam Ediyor': '🟡', 'Onay Bekliyor': '🟡',
  'Arızalı': '🟠', 'Engelli': '🟠', 'Gecikmiş': '🟠',
  'Kullanılamaz': '🔴', 'Kapalı': '🔴', 'Durdu': '🔴', 'Dönüştürüldü': '🔴', 'Kullanım Dışı': '🔴', 'İptal': '🔴'
};

function haritaTipBilgisi(tur) { return HARITA_TIPLERI[tur] || HARITA_TIPLERI.diger; }
function haritaAltTipBilgisi(tur, altTur) {
  const t = haritaTipBilgisi(tur);
  return (t.altTipler && t.altTipler[altTur]) || null;
}
function haritaOnekAl(tur, altTur) {
  const alt = haritaAltTipBilgisi(tur, altTur);
  if (alt) return alt.onek;
  return haritaTipBilgisi(tur).onek || 'REC';
}
// Alt tür kendi ikonuna sahipse (ör. Yangın Tüpü/Dolabı birbirinden farklı
// görünsün diye) onu, yoksa üst türün genel ikonunu döner.
function haritaIkonAl(kayit) {
  const alt = haritaAltTipBilgisi(kayit.tur, kayit.altTur);
  if (alt && alt.ikon) return alt.ikon;
  return haritaTipBilgisi(kayit.tur).ikon;
}
function haritaDurumNoktasi(durum) { return HARITA_DURUM_NOKTASI[durum] || '⚪'; }

function haritaIdUret(onek) {
  return (window.crypto && window.crypto.randomUUID)
    ? window.crypto.randomUUID()
    : `${onek || 'rec'}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function _haritaTemizle(v) { return String(v ?? '').trim(); }
function haritaSimdiIso() { return new Date().toISOString(); }

function haritaSonrakiNumara(mevcutKayitlar, onek) {
  const satirlar = Array.isArray(mevcutKayitlar) ? mevcutKayitlar : [];
  const re = new RegExp('^' + onek + '-(\\d+)$');
  const maks = satirlar.reduce((acc, r) => {
    const m = re.exec(_haritaTemizle(r.no));
    return m ? Math.max(acc, Number(m[1])) : acc;
  }, 0);
  return `${onek}-${String(maks + 1).padStart(3, '0')}`;
}

// ctx.mevcutKayitlar: numaralandırma için aynı tesisin diğer kayıtları.
function haritaKaydiNormallestir(girdi, ctx) {
  const src = girdi || {};
  const tur = HARITA_TIPLERI[src.tur] ? src.tur : 'diger';
  const t = haritaTipBilgisi(tur);
  const altTur = (t.altTipler && t.altTipler[src.altTur]) ? src.altTur : '';
  const onek = haritaOnekAl(tur, altTur);
  const olusturmaTarihi = src.olusturmaTarihi || haritaSimdiIso();
  const id = _haritaTemizle(src.id) || haritaIdUret(onek);
  const no = _haritaTemizle(src.no) || haritaSonrakiNumara((ctx && ctx.mevcutKayitlar) || [], onek);
  const durum = _haritaTemizle(src.durum) || t.varsayilanDurum;

  return {
    id,
    tesisId: _haritaTemizle(src.tesisId),
    tur,
    altTur,
    no,
    baslik: _haritaTemizle(src.baslik),
    aciklama: _haritaTemizle(src.aciklama),
    x: Number(src.x) || 0,
    y: Number(src.y) || 0,
    kat: _haritaTemizle(src.kat),
    bolum: _haritaTemizle(src.bolum),
    durum,
    fotograflar: Array.isArray(src.fotograflar) ? src.fotograflar : [],
    ek: src.ek && typeof src.ek === 'object' ? src.ek : {},
    bagliKayitId: _haritaTemizle(src.bagliKayitId),
    kaynakKayitId: _haritaTemizle(src.kaynakKayitId),
    kontrolGecmisi: Array.isArray(src.kontrolGecmisi) ? src.kontrolGecmisi : [],
    olusturan: _haritaTemizle(src.olusturan),
    olusturmaTarihi,
    guncellemeTarihi: src.guncellemeTarihi || olusturmaTarihi,
    silinmeTarihi: src.silinmeTarihi || ''
  };
}

function haritaTesisiNormallestir(girdi) {
  const src = girdi || {};
  const olusturmaTarihi = src.olusturmaTarihi || haritaSimdiIso();
  return {
    id: _haritaTemizle(src.id) || haritaIdUret('tesis'),
    ad: _haritaTemizle(src.ad) || 'Yeni Tesis',
    gorselUrl: src.gorselUrl || '',
    katlar: Array.isArray(src.katlar) ? src.katlar : [],
    bolumler: Array.isArray(src.bolumler) ? src.bolumler : [],
    // Nokta simgelerinin (tür/alt tür ikonlarının) haritada kaç px
    // gösterileceği — kullanıcı ayarlayabilir, bu tesise özel kalıcıdır.
    simgeBoyutu: Number(src.simgeBoyutu) >= 10 && Number(src.simgeBoyutu) <= 80 ? Number(src.simgeBoyutu) : 30,
    olusturmaTarihi,
    guncellemeTarihi: src.guncellemeTarihi || olusturmaTarihi
  };
}

// Bina/alan adı gibi sabit metin etiketleri — uygunsuzluk/risk/ekipman gibi
// takip edilen bir "kayıt" değil, sadece haritada konum gösteren bir yazı.
// Bu yüzden durum/kontrol geçmişi/foto gibi alanları yok, ayrı ve sade bir
// veri şekli.
function haritaEtiketiNormallestir(girdi) {
  const src = girdi || {};
  const olusturmaTarihi = src.olusturmaTarihi || haritaSimdiIso();
  return {
    id: _haritaTemizle(src.id) || haritaIdUret('etiket'),
    tesisId: _haritaTemizle(src.tesisId),
    metin: _haritaTemizle(src.metin),
    x: Number(src.x) || 0,
    y: Number(src.y) || 0,
    renk: /^#[0-9a-fA-F]{6}$/.test(src.renk || '') ? src.renk : '#1d4ed8',
    yon: ['dikey', 'alt-alta'].includes(src.yon) ? src.yon : 'yatay',
    boyut: Number(src.boyut) >= 6 && Number(src.boyut) <= 40 ? Number(src.boyut) : 9,
    olusturmaTarihi,
    guncellemeTarihi: src.guncellemeTarihi || olusturmaTarihi
  };
}

// Acil kaçış planı okları / toplanma yönü çizgileri — etiket gibi ayrı ve
// sade bir veri şekli. Birden fazla noktadan geçen bir kırık çizgi (polyline)
// olarak tutulur — "noktalar" en az 2 eleman içerir, ok başı sadece son
// segmentin yönünde çizilir. Eski (x1,y1,x2,y2) şeklindeki kayıtlar (bükülme
// özelliğinden önce oluşturulmuş) burada otomatik olarak tek segmentlik bir
// "noktalar" dizisine çevrilir — geriye dönük uyumluluk için.
function haritaOkuNormallestir(girdi) {
  const src = girdi || {};
  const olusturmaTarihi = src.olusturmaTarihi || haritaSimdiIso();
  const noktalar = Array.isArray(src.noktalar) && src.noktalar.length >= 2
    ? src.noktalar.map(n => ({ x: Number(n.x) || 0, y: Number(n.y) || 0 }))
    : [
        { x: Number(src.x1) || 0, y: Number(src.y1) || 0 },
        { x: Number(src.x2) || 0, y: Number(src.y2) || 0 }
      ];
  return {
    id: _haritaTemizle(src.id) || haritaIdUret('ok'),
    tesisId: _haritaTemizle(src.tesisId),
    noktalar,
    renk: /^#[0-9a-fA-F]{6}$/.test(src.renk || '') ? src.renk : '#39ff14',
    kalinlik: Number(src.kalinlik) >= 0.1 && Number(src.kalinlik) <= 3 ? Number(src.kalinlik) : 0.4,
    // Yeni bir ok çizildiğinde (stil hiç belirtilmemişse) varsayılan
    // kesiklidir — istenirse düzenleme penceresinden düze çevrilebilir.
    // Zaten kaydedilmiş oklarda kendi stil değeri korunur.
    stil: src.stil === 'duz' ? 'duz' : 'kesikli',
    // false ise sadece düz çizgi çizilir, yön oku (üçgen) eklenmez.
    okBasi: src.okBasi !== false,
    olusturmaTarihi,
    guncellemeTarihi: src.guncellemeTarihi || olusturmaTarihi
  };
}

// Kasıtlı olarak haritaKaydiNormallestir() ÇAĞRILMAZ: no burada atanırsa
// çağıran taraf gerçek mevcutKayitlar bağlamıyla tekrar normalize ettiğinde
// zaten dolu no alanı yüzünden numaralandırma atlanır ve her dönüşüm
// UYG-001 üretir. Ham taslak döndürülür, numarayı çağıran atar.
function haritaRiskUygunsuzlukTaslagi(risk) {
  return {
    tesisId: risk.tesisId,
    tur: 'uygunsuzluk',
    baslik: risk.baslik || `${risk.no} kaynaklı uygunsuzluk`,
    aciklama: risk.aciklama,
    x: risk.x, y: risk.y,
    kat: risk.kat, bolum: risk.bolum,
    fotograflar: risk.fotograflar,
    kaynakKayitId: risk.id,
    ek: { riskSeviyesi: (risk.ek && risk.ek.riskSeviyesi) || 'Orta', sorumluBolum: '', sorumluKisi: '', termin: '' }
  };
}

function haritaArizayiBakimGoreviyleEslestir() {
  return {
    id: haritaIdUret('BAKIM'),
    kod: 'BAKIM-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 900) + 100),
    durum: 'Açık',
    olusturmaTarihi: haritaSimdiIso(),
    tamamlanmaFotografi: '',
    kapanmaTarihi: ''
  };
}
