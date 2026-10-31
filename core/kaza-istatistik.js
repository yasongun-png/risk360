// İş kazası istatistikleri ve grafikleri — İSG Kurulu raporu (modules/kurul)
// ile Olay/Kaza modülünün Özet sekmesi AYNI hesabı ve AYNI grafikleri kullanır
// (kullanıcı isteği: "bu grafikleri ve istatistikleri olay araştırma modülüne
// de koy"). Eskiden kurul/service.js (toplantiDetayliKazaIstatistikleri) ve
// kurul/cikti.js (grafik çizimleri) içindeydi.

// ==================== BÖLÜM STANDARDI ====================
// Kullanıcı isteği: kurul raporundaki "Bölüm / Birim Dağılımı" tablosunda aynı
// bölüm farklı yazımlarla ayrı satırlara bölünüyordu ("Sülfürik asit tesisi",
// "Sülfürik asit", "Can/an tesisi" ~ "Canan"). Standart bölüm listesi Olay/Kaza
// ayarlarında (olay_kaza_ayarlari.bolumler) tutulur ve "Bölümleri
// Standartlaştır" penceresinden düzenlenir. Firma Yönetimi > Bölümler
// (müdürlükler) KULLANILMAZ — kullanıcı: "müdürlükler bölümlerle aynı şey
// değil, mesela sülfürik asitin müdürlüğü yok". Karşılaştırmada büyük/küçük
// harf, noktalama ve "tesisi / bölümü / birimi" gibi ekler fark etmez.
const _KAZA_BOLUM_EKLERI = new Set(['tesisi', 'tesis', 'bölümü', 'bölüm', 'birimi', 'birim', 'ünitesi', 'ünite', 'müdürlüğü', 'müdürlük']);

function kazaBolumAnahtari(ad) {
  const kelimeler = String(ad || '').toLocaleLowerCase('tr-TR').replace(/[^\p{L}\p{N}]+/gu, ' ').split(' ').filter(Boolean);
  const anlamli = kelimeler.filter(k => !_KAZA_BOLUM_EKLERI.has(k));
  return (anlamli.length ? anlamli : kelimeler).join('');
}

function kazaStandartBolumleri() {
  const ayarlar = oku(tenantAnahtar('olay_kaza_ayarlari'), {});
  return Array.isArray(ayarlar.bolumler) ? ayarlar.bolumler : [];
}

// Standartlaştırma aracı için öneri: birebir eşleşme yoksa, yazımın adında
// geçtiği tek bir standart bölüm varsa onu önerir ("Canan" → "Canan Üretim
// Tesisi"); birden fazla aday varsa öneri yapmaz. Ters yön ("Servis & liman"
// içinde "Liman") önerilmez — yanlış eşleşme riski yüksek.
function kazaBolumOnerisi(ad, standartListe) {
  const liste = standartListe || kazaStandartBolumleri();
  const anahtar = kazaBolumAnahtari(ad);
  if (!anahtar) return '';
  const birebir = liste.find(s => kazaBolumAnahtari(s) === anahtar);
  if (birebir) return birebir;
  if (anahtar.length < 4) return '';
  const adaylar = liste.filter(s => kazaBolumAnahtari(s).includes(anahtar));
  return adaylar.length === 1 ? adaylar[0] : '';
}

// Yazımı standart listedeki karşılığına çevirir; karşılığı yoksa olduğu gibi döner.
function kazaBolumStandartla(ad, standartListe) {
  const liste = standartListe || kazaStandartBolumleri();
  const anahtar = kazaBolumAnahtari(ad);
  if (!anahtar) return String(ad || '').trim();
  return liste.find(s => kazaBolumAnahtari(s) === anahtar) || String(ad || '').trim();
}

// Standart liste henüz yokken başlangıç önerisi: kayıtlardaki yazımlar
// kazaBolumAnahtari'na göre birleştirilir, her grup için en sık yazım (baş
// harfi büyük) alınır — "Sülfürik asit tesisi" / "Sülfürik asit" tek satır olur.
function kazaBolumOneriListesi(yazimlar) {
  const gruplar = new Map();
  yazimlar.forEach(y => {
    const ad = String(y || '').trim();
    const anahtar = kazaBolumAnahtari(ad);
    if (!anahtar) return;
    const g = gruplar.get(anahtar) || new Map();
    g.set(ad, (g.get(ad) || 0) + 1);
    gruplar.set(anahtar, g);
  });
  return Array.from(gruplar.values())
    .map(g => { const ad = Array.from(g.entries()).sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)[0][0]; return ad.charAt(0).toLocaleUpperCase('tr-TR') + ad.slice(1); })
    .sort((a, b) => a.localeCompare(b, 'tr'));
}

// Kullanıcı isteği: raporlarda İngilizce ifade (LTI, DART) görünmesin — olay tipinin Türkçe gösterimi.
function kazaTipiGorunen(tip) {
  const t = String(tip || '');
  if (t === 'Kayıp Gün (LTI)') return 'Kayıp Günlü Kaza';
  if (t === 'Kısıtlı İş / Transfer (DART)') return 'Kısıtlı İş / Görev Değişikliği';
  if (t === 'Ölüm') return 'İş Kazası';
  return t || '-';
}

// ==================== HESAP ====================
// Kullanıcı isteği: yıllık/aylık iş kazası istatistikleri — kaza türleri, iş günü
// kaybı ve önceki yıllarla kıyaslama. Karşılaştırma ADİL olsun diye geçmiş yıllar
// da aynı aya kadar (Ocak–sonAy) alınır; bu yılda ayrıca sinirTarih'e (ör.
// toplantı tarihi) kadarki kayıtlar sayılır. Oranlar (sıklık hızı/ağırlık oranı)
// aynı formül; önceki yılın aylık çalışma saati girilmemişse tahmin edilir.
function kazaIstatistikleriHesapla(yil, sonAy, sinirTarih) {
  if (!yil) return null;
  const AY_ADLARI = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const KAZA_TIPLERI = ['Kayıp Gün (LTI)', 'Kısıtlı İş / Transfer (DART)', 'Tıbbi Tedavi', 'Ölüm'];
  const tumKayitlar = oku(tenantAnahtar('olay_kaza_kayitlari'), []);
  const ayarlar = oku(tenantAnahtar('olay_kaza_ayarlari'), {});

  const ayNo = k => Number(String(k.kazaTarihi || '').slice(5, 7));
  // Kullanıcı isteği: ramak kala sayıları şimdilik istatistiklerde yer almasın.
  const donemKayitlari = y => tumKayitlar.filter(k =>
    k.olayTipi !== 'Ramak Kala' &&
    String(k.kazaTarihi || '').slice(0, 4) === String(y) && ayNo(k) >= 1 && ayNo(k) <= sonAy &&
    (y !== yil || !sinirTarih || k.kazaTarihi <= sinirTarih));

  const kayitliSaat = y => {
    const aylikSaat = ayarlar.aylikCalismaSaatleri && ayarlar.aylikCalismaSaatleri[y];
    return aylikSaat
      ? Object.keys(aylikSaat).filter(a => Number(a) <= sonAy).reduce((t, a) => t + (Number((aylikSaat[a] && aylikSaat[a].saat) || 0)), 0)
      : (y === yil ? Number(ayarlar.yillikCalismaSaati || 0) : 0);
  };

  const yilOzeti = y => {
    const kayitlar = donemKayitlari(y);
    const sayac = tip => kayitlar.filter(k => k.olayTipi === tip).length;
    const kazalar = kayitlar.filter(k => KAZA_TIPLERI.includes(k.olayTipi));
    const lti = sayac('Kayıp Gün (LTI)');
    const toplamKayipGun = kayitlar.reduce((t, k) => t + (Number(k.kayipGun) || 0), 0);
    let saat = kayitliSaat(y);
    // Kullanıcı isteği: önceki yılın çalışma saati girilmemişse tahmin et — bu yılın aynı
    // dönem saatinin 1/3 fazlası (x 4/3). Gerçek saat girilirse o kullanılır.
    let saatTahmini = false;
    if (!saat && y !== yil) {
      const buSaat = kayitliSaat(yil);
      if (buSaat) { saat = buSaat * 4 / 3; saatTahmini = true; }
    }
    const kayipGunluKaza = kazalar.filter(k => Number(k.kayipGun) > 0).length;
    return {
      yil: y, kayitlar,
      toplamOlay: kayitlar.length,
      kazaSayisi: kazalar.length,
      ilkYardim: sayac('İlk Yardım'),
      tehlikeBildirimi: sayac('Tehlike Bildirimi'),
      maddiHasar: sayac('Maddi Hasar'),
      lti, dart: sayac('Kısıtlı İş / Transfer (DART)'), tibbi: sayac('Tıbbi Tedavi'),
      toplamKayipGun,
      ortKayipGun: kayipGunluKaza ? toplamKayipGun / kayipGunluKaza : null,
      calismaSaati: saat, saatTahmini,
      siklikHizi: saat ? (lti * 1000000) / saat : null,
      agirlikOrani: saat ? (toplamKayipGun * 1000000) / saat : null
    };
  };

  const yillar = [yil - 2, yil - 1, yil].map(yilOzeti);
  // Kullanıcı isteği: basit 5 yıllık iş kazası karşılaştırması (aynı dönem: Ocak–sonAy).
  const besYil = [yil - 4, yil - 3, yil - 2, yil - 1, yil].map(y => y >= yil - 2 ? yillar[y - (yil - 2)] : yilOzeti(y));
  const bu = yillar[2], onceki = yillar[1];

  const aylik = (ozet, filtre) => AY_ADLARI.slice(0, sonAy).map((ad, i) => ozet.kayitlar.filter(k => ayNo(k) === i + 1 && filtre(k)).length);
  const kazaMi = k => KAZA_TIPLERI.includes(k.olayTipi);
  const aylar = AY_ADLARI.slice(0, sonAy);

  const dagilim = (anahtarFn, kayitlar, enFazla) => {
    const harita = new Map();
    kayitlar.forEach(k => {
      const a = String(anahtarFn(k) || '').trim();
      if (!a) return;
      const gorunen = a.charAt(0).toLocaleUpperCase('tr-TR') + a.slice(1).toLocaleLowerCase('tr-TR');
      harita.set(gorunen, (harita.get(gorunen) || 0) + 1);
    });
    return Array.from(harita.entries()).sort((a, b) => b[1] - a[1]).slice(0, enFazla || 8).map(([etiket, sayi]) => ({ etiket, sayi }));
  };

  // Bölümler yazım farkı gözetmeden (kazaBolumAnahtari) gruplanır; etiket standart
  // listedeki ad, listede yoksa en sık kullanılan yazım. Kazanın olduğu bölüm
  // girilmişse o, yoksa (eski kayıtlar) çalıştığı bölüm sayılır.
  const standartBolumler = kazaStandartBolumleri();
  const bolumAdi = k => kazaBolumStandartla(k.kazaBolumu || k.bolum || k.kazaYeri, standartBolumler);
  const bolumDagilimi = (kayitlar, enFazla) => {
    const gruplar = new Map();
    kayitlar.forEach(k => {
      const ad = bolumAdi(k);
      const anahtar = kazaBolumAnahtari(ad);
      if (!anahtar) return;
      const g = gruplar.get(anahtar) || { sayi: 0, yazimlar: new Map() };
      g.sayi++;
      g.yazimlar.set(ad, (g.yazimlar.get(ad) || 0) + 1);
      gruplar.set(anahtar, g);
    });
    return Array.from(gruplar.values()).map(g => {
      const yazim = Array.from(g.yazimlar.entries()).sort((a, b) => b[1] - a[1])[0][0];
      const etiket = standartBolumler.includes(yazim) ? yazim : yazim.charAt(0).toLocaleUpperCase('tr-TR') + yazim.slice(1);
      return { etiket, sayi: g.sayi };
    }).sort((a, b) => b.sayi - a.sayi).slice(0, enFazla || 8);
  };

  // Kullanıcı isteği: tüm kazaların açıklaması da olsun — bu yılın (Ocak–sonAy) TÜM iş kazaları,
  // tarih sırasıyla, oluş şekli açıklamasıyla.
  const kazalarTumu = bu.kayitlar
    .filter(k => KAZA_TIPLERI.includes(k.olayTipi))
    .slice()
    .sort((a, b) => String(a.kazaTarihi).localeCompare(String(b.kazaTarihi)))
    .map(k => ({
      tarih: k.kazaTarihi || '',
      tur: kazaTipiGorunen(k.olayTipi),
      yer: [(k.kazaBolumu || k.bolum) ? kazaBolumStandartla(k.kazaBolumu || k.bolum, standartBolumler) : '', k.kazaYeri].filter((v, i, a) => v && a.indexOf(v) === i).join(' / '),
      kayipGun: Number(k.kayipGun) || 0,
      aciklama: String((typeof olayAciklamaOnEkiTemizle === 'function' ? olayAciklamaOnEkiTemizle(k.aciklama) : k.aciklama) || k.olayOzeti || '').trim()
    }));

  // Son kazadan bu yana geçen gün: sinirTarih'e kadarki en son iş kazası (tüm yıllar).
  let sonKazaTarihi = '';
  tumKayitlar.filter(k => KAZA_TIPLERI.includes(k.olayTipi) && k.kazaTarihi && (!sinirTarih || k.kazaTarihi <= sinirTarih))
    .forEach(k => { if (k.kazaTarihi > sonKazaTarihi) sonKazaTarihi = k.kazaTarihi; });
  const referans = sinirTarih ? new Date(sinirTarih + 'T00:00:00') : new Date();
  const kazasizGun = sonKazaTarihi ? Math.max(0, Math.round((referans - new Date(sonKazaTarihi + 'T00:00:00')) / 86400000)) : null;

  return {
    yil, sonAy, sonAyAdi: AY_ADLARI[sonAy - 1], yillar, besYil,
    tahminiSaatYillari: yillar.filter(x => x.saatTahmini).map(x => x.yil),
    aylar, kazalarTumu,
    aylikKaza: { bu: aylik(bu, kazaMi), onceki: aylik(onceki, kazaMi) },
    // Kullanıcı isteği: "ölüm" ifadesi hiçbir yerde geçmesin.
    olayTurleri: dagilim(k => (/ölüm/i.test(k.olayTipi || '') ? '' : kazaTipiGorunen(k.olayTipi)), bu.kayitlar, 10),
    yaralanmaTurleri: dagilim(k => (/ölüm/i.test(k.yaralanmaTuru || '') ? '' : k.yaralanmaTuru), bu.kayitlar, 8),
    yaralananUzuvlar: dagilim(k => k.yaralananUzuv, bu.kayitlar, 8),
    bolumler: bolumDagilimi(bu.kayitlar, 8),
    sonKazaTarihi, kazasizGun
  };
}

// ==================== GRAFİKLER ====================

// Yıllık karşılaştırma grafiği (5 yıl): geçmiş yıllar soluk, güncel yıl vurgulu sütun; değer etiketleri
// sütun üstünde, yıllar arası eğilim çizgisi. Kullanıcı isteği: önceki grafik beğenilmedi, daha sade/okunur.
function _yillikTrendGrafikCiz(baslik, etiketler, degerler, renk, soluk) {
  const G = 1400, Y = 620;
  const tuval = document.createElement('canvas');
  tuval.width = G; tuval.height = Y;
  const c = tuval.getContext('2d');
  c.fillStyle = '#ffffff'; c.fillRect(0, 0, G, Y);
  const sol = 70, sag = 70, ust = 120, alt = 90;
  const cizimG = G - sol - sag, cizimY = Y - ust - alt;
  const enYuksek = Math.max(4, ...degerler);
  const tavan = Math.ceil(enYuksek * 1.2);

  c.fillStyle = '#0f172a'; c.font = 'bold 38px Arial'; c.textAlign = 'left';
  c.fillText(baslik, sol, 62);
  c.fillStyle = '#94a3b8'; c.fillRect(sol, 84, 70, 5);

  // Yatay ince kılavuz çizgileri (değer ekseni etiketsiz: değerler sütunların üstünde)
  c.strokeStyle = '#eef2f7'; c.lineWidth = 2;
  for (let i = 0; i <= 4; i++) {
    const y = ust + cizimY - (i / 4) * cizimY;
    c.beginPath(); c.moveTo(sol, y); c.lineTo(G - sag, y); c.stroke();
  }

  const kolonG = cizimG / etiketler.length;
  const noktalar = [];
  etiketler.forEach((et, i) => {
    const w = kolonG * 0.5;
    const x = sol + i * kolonG + (kolonG - w) / 2;
    const h = Math.max(4, (degerler[i] / tavan) * cizimY);
    const guncel = i === etiketler.length - 1;
    c.fillStyle = guncel ? renk : soluk;
    c.fillRect(x, ust + cizimY - h, w, h);
    c.textAlign = 'center';
    c.fillStyle = guncel ? renk : '#475569'; c.font = 'bold 40px Arial';
    c.fillText(String(degerler[i]), x + w / 2, ust + cizimY - h - 16);
    c.fillStyle = guncel ? '#0f172a' : '#64748b'; c.font = (guncel ? 'bold ' : '') + '32px Arial';
    c.fillText(et, x + w / 2, ust + cizimY + 52);
    noktalar.push([x + w / 2, ust + cizimY - h]);
  });

  // Eğilim çizgisi
  c.strokeStyle = '#334155'; c.lineWidth = 4; c.setLineDash([12, 10]);
  c.beginPath(); noktalar.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
  c.setLineDash([]);
  noktalar.forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 8, 0, Math.PI * 2); c.fillStyle = '#334155'; c.fill(); c.strokeStyle = '#ffffff'; c.lineWidth = 3; c.stroke(); });

  c.strokeStyle = '#94a3b8'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(sol, ust + cizimY); c.lineTo(G - sag, ust + cizimY); c.stroke();

  const dataUrl = tuval.toDataURL('image/png');
  const ikili = atob(dataUrl.split(',')[1]);
  const veri = new Uint8Array(ikili.length);
  for (let i = 0; i < ikili.length; i++) veri[i] = ikili.charCodeAt(i);
  return { dataUrl, veri, genislik: 600, yukseklik: Math.round(600 * Y / G) };
}

// İki pasta grafiği yan yana tek görselde (Word): kullanıcı isteği — daha az, daha düzgün grafik.
// Her dilimde yüzde; sağda adet/etiket göstergesi (en çok 6 dilim, kalanı "Diğer").
function _ikiPastaGrafikCiz(baslikSol, kayitSol, baslikSag, kayitSag) {
  const G = 1400, Y = 620;
  const RENKLER = ['#1d4ed8', '#dc2626', '#16a34a', '#f59e0b', '#7c3aed', '#0891b2', '#94a3b8'];
  const tuval = document.createElement('canvas');
  tuval.width = G; tuval.height = Y;
  const c = tuval.getContext('2d');
  c.fillStyle = '#ffffff'; c.fillRect(0, 0, G, Y);
  const grupla = (liste) => {
    const ilk = liste.slice(0, 6);
    const kalan = liste.slice(6).reduce((t, k) => t + k.sayi, 0);
    return kalan ? ilk.concat([{ etiket: 'Diğer', sayi: kalan }]) : ilk;
  };
  const ciz = (x0, baslik, liste) => {
    c.textAlign = 'left'; c.fillStyle = '#0f172a'; c.font = 'bold 34px Arial';
    c.fillText(baslik, x0 + 20, 56);
    c.fillStyle = '#94a3b8'; c.fillRect(x0 + 20, 76, 60, 5);
    const kayitlar = grupla(liste);
    const toplam = kayitlar.reduce((t, k) => t + k.sayi, 0);
    if (!toplam) { c.fillStyle = '#6b7280'; c.font = '26px Arial'; c.fillText('Kayıt bulunmamaktadır.', x0 + 20, 200); return; }
    const cx = x0 + 190, cy = 340, r = 160;
    let aci = -Math.PI / 2;
    kayitlar.forEach((k, i) => {
      const dilim = (k.sayi / toplam) * Math.PI * 2;
      c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, r, aci, aci + dilim); c.closePath();
      c.fillStyle = RENKLER[i % RENKLER.length]; c.fill();
      c.strokeStyle = '#ffffff'; c.lineWidth = 4; c.stroke();
      if (k.sayi / toplam >= 0.08) {
        const orta = aci + dilim / 2;
        c.fillStyle = '#ffffff'; c.font = 'bold 26px Arial'; c.textAlign = 'center';
        c.fillText('%' + Math.round((k.sayi / toplam) * 100), cx + Math.cos(orta) * r * 0.62, cy + Math.sin(orta) * r * 0.62 + 9);
      }
      aci += dilim;
    });
    c.textAlign = 'left';
    kayitlar.forEach((k, i) => {
      const y = 170 + i * 62;
      c.fillStyle = RENKLER[i % RENKLER.length]; c.fillRect(x0 + 390, y, 28, 28);
      c.fillStyle = '#334155'; c.font = '26px Arial';
      let etiket = k.etiket;
      while (c.measureText(etiket).width > 200 && etiket.length > 4) etiket = etiket.slice(0, -2);
      if (etiket !== k.etiket) etiket = etiket.trimEnd() + '…';
      c.fillText(etiket, x0 + 430, y + 24);
      c.fillStyle = '#0f172a'; c.font = 'bold 26px Arial'; c.textAlign = 'right';
      c.fillText(String(k.sayi), x0 + 680, y + 24);
      c.textAlign = 'left';
    });
  };
  ciz(0, baslikSol, kayitSol);
  ciz(700, baslikSag, kayitSag);
  c.strokeStyle = '#e2e8f0'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(700, 30); c.lineTo(700, Y - 30); c.stroke();
  const dataUrl = tuval.toDataURL('image/png');
  const ikili = atob(dataUrl.split(',')[1]);
  const veri = new Uint8Array(ikili.length);
  for (let i = 0; i < ikili.length; i++) veri[i] = ikili.charCodeAt(i);
  return { dataUrl, veri, genislik: 600, yukseklik: Math.round(600 * Y / G) };
}
