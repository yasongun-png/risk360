// Kullanıcı isteği: "OSHA'nın yöntemleri, Avrupa'da kullanılan istatistikler —
// bunları kıyasla, görselce zengin bir tasarım yap". Olay/Kaza > Özet'te, 5 yıllık
// karşılaştırmanın altında. Yıl seçimi Özet'teki #kazaIstYil ile ortak; geçmiş
// yıllar da aynı döneme (Ocak–sonAy) göre alınır, böylece yıllar adil kıyaslanır.
//
// OSHA (ABD, 29 CFR 1904): 200.000 saat = 100 tam zamanlı çalışanın bir yılı.
//   TRIR = kayıt edilebilir vaka × 200.000 / saat     (kayıp günlü + kısıtlı iş + tıbbi tedavi)
//   DART = (kayıp günlü + kısıtlı iş) × 200.000 / saat
//   LTIR = kayıp günlü vaka × 200.000 / saat
//   Şiddet = kayıp gün × 200.000 / saat
// ILO / Avrupa:
//   Sıklık oranı  = kayıp günlü kaza × 1.000.000 / saat   (ILO 16. ICLS, 1998)
//   Ağırlık oranı = kayıp gün × 1.000 / saat
//   ESAW insidansı = 3 günden uzun iş göremezlikli kaza × 100.000 / çalışan (Eurostat;
//   yıl tamamlanmadıysa yıllıklandırılır)
// Saat kaynağı: Özet'teki aylık çalışma saati tablosu; tablo yoksa Personel'deki o yıl
// çalışan sayısı × 2.000 saat (tahmini olarak işaretlenir).
// Kullanıcı isteği: hiçbir yerde "ölüm" ifadesi geçmesin — bu tip ciddi kazaya katılır.

const _KK_KAZA_TIPLERI = ['Kayıp Gün (LTI)', 'Kısıtlı İş / Transfer (DART)', 'Tıbbi Tedavi', 'Ölüm'];
const _KK_GUNLER = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

function _kkSayi(n, basamak) {
  if (n == null || !isFinite(n)) return '—';
  return Number(n).toLocaleString('tr-TR', { minimumFractionDigits: basamak == null ? 2 : basamak, maximumFractionDigits: basamak == null ? 2 : basamak });
}

// Yılda en az bir gün çalışmış personel (işe giriş ≤ dönem sonu, çıkış yok veya ≥ dönem başı).
function _kkCalisanlar(yil, sonAy) {
  const liste = oku(tenantAnahtar('personel'), []);
  const bas = `${yil}-01-01`, son = `${yil}-${String(sonAy).padStart(2, '0')}-31`;
  return (Array.isArray(liste) ? liste : []).filter(p => (!p.iseGirisTarihi || p.iseGirisTarihi <= son) && (!p.istenCikisTarihi || p.istenCikisTarihi >= bas));
}

function _kkSaatBul(yil, sonAy, ayarlar) {
  const tablo = (ayarlar.aylikCalismaSaatleri || {})[yil] || (typeof CALISMA_SAATI_VARSAYILAN !== 'undefined' ? CALISMA_SAATI_VARSAYILAN[yil] : null);
  if (tablo) {
    const aylar = Object.keys(tablo).filter(a => Number(a) <= sonAy);
    const saat = aylar.reduce((t, a) => t + (Number((tablo[a] && tablo[a].saat) || 0)), 0);
    if (saat > 0) return { saat, kaynak: aylar.some(a => tablo[a] && tablo[a].tahmini) ? 'tablo-tahmini' : 'tablo' };
  }
  const calisan = _kkCalisanlar(yil, sonAy).length;
  if (calisan) return { saat: calisan * 2000 * sonAy / 12, kaynak: 'personel' };
  return { saat: 0, kaynak: '' };
}

function kazaKiyasHesapla(yil, sonAy, sinirTarih) {
  const tum = oku(tenantAnahtar('olay_kaza_kayitlari'), []);
  const ayarlar = oku(tenantAnahtar('olay_kaza_ayarlari'), {});
  const std = kazaStandartBolumleri();
  const ayNo = k => Number(String(k.kazaTarihi || '').slice(5, 7));
  const donem = y => tum.filter(k => String(k.kazaTarihi || '').slice(0, 4) === String(y) && ayNo(k) >= 1 && ayNo(k) <= sonAy && (y !== yil || !sinirTarih || k.kazaTarihi <= sinirTarih));
  const kazaMi = k => _KK_KAZA_TIPLERI.includes(k.olayTipi);
  const gun = k => Number(k.kayipGun) || 0;

  const yilMetrik = y => {
    const kayitlar = donem(y);
    const kazalar = kayitlar.filter(kazaMi);
    const say = tip => kayitlar.filter(k => k.olayTipi === tip).length;
    const lti = say('Kayıp Gün (LTI)') + say('Ölüm'), dart = say('Kısıtlı İş / Transfer (DART)'), tibbi = say('Tıbbi Tedavi');
    const kayipGun = kazalar.reduce((t, k) => t + gun(k), 0);
    const esaw = kazalar.filter(k => gun(k) > 3).length;
    const { saat, kaynak } = _kkSaatBul(y, sonAy, ayarlar);
    let calisan = _kkCalisanlar(y, sonAy).length;
    let calisanTahmini = false;
    if (!calisan && saat) { calisan = Math.round(saat / (2000 * sonAy / 12)); calisanTahmini = true; }
    const oran = (pay, carpan) => saat ? pay * carpan / saat : null;
    return {
      yil: y, kayitlar, kazalar, saat, saatKaynak: kaynak, calisan, calisanTahmini,
      kazaSayisi: kazalar.length, lti, dart, tibbi, kayipGun, esaw,
      ilkYardim: say('İlk Yardım'), maddiHasar: say('Maddi Hasar'), ramakKala: say('Ramak Kala') + say('Tehlike Bildirimi'),
      trir: oran(lti + dart + tibbi, 200000), dartOrani: oran(lti + dart, 200000), ltir: oran(lti, 200000), siddet: oran(kayipGun, 200000),
      siklik: oran(lti, 1000000), agirlik: oran(kayipGun, 1000),
      esawInsidans: calisan ? esaw * 100000 / calisan * 12 / sonAy : null
    };
  };

  const yillar = [yil - 4, yil - 3, yil - 2, yil - 1, yil].map(yilMetrik);
  const bu = yillar[4];

  // Bölüm anahtarı (yazım farkı gözetmeden) → görünen ad
  const adlar = new Map();
  const bolumAnahtari = ham => {
    const ad = kazaBolumStandartla(ham, std);
    const a = kazaBolumAnahtari(ad);
    if (a && !adlar.has(a)) adlar.set(a, ad.charAt(0).toLocaleUpperCase('tr-TR') + ad.slice(1));
    return a;
  };
  const kazaYeriAnahtari = k => bolumAnahtari(k.kazaBolumu || k.bolum || k.kazaYeri);

  // Bölüm × yıl ısı haritası (5 yılda en çok kaza olan 10 bölüm)
  const toplamlar = new Map();
  yillar.forEach(y => y.kazalar.forEach(k => { const a = kazaYeriAnahtari(k); if (a) toplamlar.set(a, (toplamlar.get(a) || 0) + 1); }));
  const isiBolumleri = Array.from(toplamlar.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([a]) => a);
  const isiHaritasi = isiBolumleri.map(a => ({ etiket: adlar.get(a), degerler: yillar.map(y => y.kazalar.filter(k => kazaYeriAnahtari(k) === a).length) }));

  // Seçili yıl: bölüm bazında kayıp gün
  const gunHarita = new Map();
  bu.kazalar.forEach(k => { const a = kazaYeriAnahtari(k); if (a && gun(k)) gunHarita.set(a, (gunHarita.get(a) || 0) + gun(k)); });
  const kayipGunBolum = Array.from(gunHarita.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([a, v]) => ({ etiket: adlar.get(a), deger: v }));

  // Saat / vardiya / gün dağılımı — örnek küçük olduğundan son 5 yılın tüm kazaları
  const besYilKaza = yillar.flatMap(y => y.kazalar);
  const saatler = new Array(24).fill(0), vardiya = [0, 0, 0], gunler = new Array(7).fill(0);
  let saatsiz = 0;
  besYilKaza.forEach(k => {
    const m = /^(\d{1,2})/.exec(String(k.kazaSaati || ''));
    if (m && Number(m[1]) < 24) {
      const s = Number(m[1]);
      saatler[s]++;
      vardiya[s >= 8 && s < 16 ? 0 : (s >= 16 ? 1 : 2)]++;
    } else saatsiz++;
    if (k.kazaTarihi) gunler[(new Date(k.kazaTarihi + 'T12:00:00').getDay() + 6) % 7]++;
  });

  // Başka bölümde kaza: çalıştığı bölüm ≠ kazanın olduğu bölüm (ikisi de girilmiş kayıtlar)
  const ikisiDolu = bu.kazalar.filter(k => k.bolum && k.kazaBolumu);
  const farkli = ikisiDolu.filter(k => bolumAnahtari(k.bolum) !== bolumAnahtari(k.kazaBolumu));
  const ciftler = new Map();
  farkli.forEach(k => { const c = `${adlar.get(bolumAnahtari(k.bolum))} → ${adlar.get(bolumAnahtari(k.kazaBolumu))}`; ciftler.set(c, (ciftler.get(c) || 0) + 1); });

  // 100 çalışan başına kaza (çalıştığı bölüme göre, Personel'deki o yıl çalışanlar)
  const personelBolum = new Map();
  _kkCalisanlar(yil, sonAy).forEach(p => { const a = bolumAnahtari(p.bolum); if (a) personelBolum.set(a, (personelBolum.get(a) || 0) + 1); });
  const kazaBolum = new Map();
  bu.kazalar.forEach(k => { const a = bolumAnahtari(k.bolum); if (a) kazaBolum.set(a, (kazaBolum.get(a) || 0) + 1); });
  const yuzCalisan = Array.from(personelBolum.entries()).filter(([a, c]) => c >= 3)
    .map(([a, c]) => ({ etiket: adlar.get(a), calisan: c, kaza: kazaBolum.get(a) || 0, oran: (kazaBolum.get(a) || 0) * 100 / c }))
    .sort((x, y) => y.oran - x.oran || y.calisan - x.calisan).slice(0, 10);
  const eslesmeyenKaza = Array.from(kazaBolum.entries()).filter(([a]) => !personelBolum.has(a)).reduce((t, [, v]) => t + v, 0);

  return {
    yil, sonAy, yillar, bu, onceki: yillar[3], isiHaritasi, kayipGunBolum,
    saatler, vardiya, gunler, saatsiz, besYilKazaSayisi: besYilKaza.length,
    baskaBolum: { toplam: ikisiDolu.length, farkli: farkli.length, ciftler: Array.from(ciftler.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5) },
    yuzCalisan, eslesmeyenKaza
  };
}

// ==================== ÇİZİM ====================

function _kkStilEkle() {
  if (document.getElementById('kkStil')) return;
  document.head.insertAdjacentHTML('beforeend', `<style id="kkStil">
    .kk-izgara { display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:14px; margin-bottom:14px; }
    .kk-kart { background:var(--kart-bg); border:1px solid var(--kenarlik); border-radius:12px; padding:14px 16px; box-shadow:var(--golge); min-width:0; }
    .kk-kart h4 { margin:0 0 2px; font-size:15px; }
    .kk-alt { font-size:11.5px; color:var(--metin-soluk); margin:0 0 10px; }
    .kk-bant { height:4px; border-radius:2px; margin:-14px -16px 12px; border-radius:12px 12px 0 0; }
    .kk-metrik { display:grid; grid-template-columns:1fr auto 96px; gap:4px 10px; align-items:center; padding:8px 0; border-top:1px solid var(--kenarlik); }
    .kk-metrik:first-of-type { border-top:none; }
    .kk-ad { font-size:13px; font-weight:600; }
    .kk-formul { font-size:11px; color:var(--metin-soluk); font-weight:400; }
    .kk-deger { font-size:22px; font-weight:800; text-align:right; font-variant-numeric:tabular-nums; }
    .kk-fark { font-size:11px; font-weight:700; text-align:right; display:block; }
    .kk-iyi { color:#15803d; } .kk-kotu { color:#b91c1c; } .kk-notr { color:var(--metin-soluk); }
    .kk-isi { border-collapse:collapse; width:100%; font-size:12px; }
    .kk-isi th { font-weight:600; color:var(--metin-soluk); padding:4px 6px; text-align:center; }
    .kk-isi th:first-child { text-align:left; }
    .kk-isi td { padding:0; border:2px solid var(--kart-bg); }
    .kk-isi td:first-child { padding:4px 8px 4px 0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:180px; }
    .kk-hucre { text-align:center; font-weight:700; padding:7px 0; border-radius:5px; font-variant-numeric:tabular-nums; }
    .kk-cubuk { display:grid; grid-template-columns:minmax(90px, 38%) 1fr 44px; gap:8px; align-items:center; font-size:12.5px; margin:5px 0; }
    .kk-cubuk span:first-child { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .kk-cubuk-iz { background:var(--kenarlik); border-radius:4px; height:12px; overflow:hidden; }
    .kk-cubuk-iz div { height:100%; border-radius:4px; }
    .kk-cubuk b { text-align:right; font-variant-numeric:tabular-nums; }
    .kk-buyuk { font-size:30px; font-weight:800; line-height:1.1; }
    .kk-not { font-size:11.5px; color:var(--metin-soluk); margin-top:8px; }
    .kk-rozet { display:inline-block; font-size:10.5px; font-weight:700; border-radius:9px; padding:1px 7px; background:#fef3c7; color:#92400e; margin-left:6px; vertical-align:middle; }
  </style>`);
}

// 5 yıllık küçük eğilim çizgisi; son nokta vurgulu, boş yıllar atlanır.
function _kkKivilcim(degerler, renk) {
  const G = 96, Y = 30, p = 4;
  const gecerli = degerler.map((v, i) => [i, v]).filter(([, v]) => v != null && isFinite(v));
  if (gecerli.length < 2) return `<svg width="${G}" height="${Y}"></svg>`;
  const enB = Math.max(...gecerli.map(([, v]) => v)), enK = Math.min(0, ...gecerli.map(([, v]) => v));
  const x = i => p + i * (G - 2 * p) / (degerler.length - 1);
  const y = v => Y - p - (enB === enK ? 0.5 : (v - enK) / (enB - enK)) * (Y - 2 * p);
  const yol = gecerli.map(([i, v], j) => `${j ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const [si, sv] = gecerli[gecerli.length - 1];
  return `<svg width="${G}" height="${Y}" viewBox="0 0 ${G} ${Y}" aria-hidden="true">
    <path d="${yol}" fill="none" stroke="${renk}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" opacity=".85"/>
    ${gecerli.map(([i, v]) => `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="${i === si ? 3.6 : 1.8}" fill="${renk}"/>`).join('')}
  </svg>`;
}

function _kkFark(bu, onceki) {
  if (bu == null || onceki == null) return '<span class="kk-fark kk-notr">önceki yıl yok</span>';
  if (!onceki) return bu ? '<span class="kk-fark kk-kotu">▲ önceki yıl 0</span>' : '<span class="kk-fark kk-notr">= değişim yok</span>';
  const yuzde = (bu - onceki) / onceki * 100;
  if (Math.abs(yuzde) < 0.5) return '<span class="kk-fark kk-notr">= değişim yok</span>';
  return `<span class="kk-fark ${yuzde < 0 ? 'kk-iyi' : 'kk-kotu'}">${yuzde < 0 ? '▼' : '▲'} %${_kkSayi(Math.abs(yuzde), 0)} önceki yıla göre</span>`;
}

function _kkMetrik(ad, formul, anahtar, kd, renk, basamak) {
  const seri = kd.yillar.map(y => y[anahtar]);
  return `<div class="kk-metrik">
    <div><div class="kk-ad">${ad}</div><div class="kk-formul">${formul}</div></div>
    <div><div class="kk-deger" style="color:${renk};">${_kkSayi(kd.bu[anahtar], basamak)}</div>${_kkFark(kd.bu[anahtar], kd.onceki[anahtar])}</div>
    <div title="${kd.yillar.map(y => `${y.yil}: ${_kkSayi(y[anahtar], basamak)}`).join('\n')}">${_kkKivilcim(seri, renk)}</div>
  </div>`;
}

function _kkCubuklar(liste, renk, birim) {
  const enB = Math.max(1, ...liste.map(x => x.deger));
  return liste.map(x => `<div class="kk-cubuk" title="${_okKacir(x.etiket)}: ${x.deger}${birim || ''}">
    <span>${_okKacir(x.etiket)}</span>
    <div class="kk-cubuk-iz"><div style="width:${(x.deger / enB * 100).toFixed(1)}%; background:${renk};"></div></div>
    <b>${typeof x.deger === 'number' && x.deger % 1 ? _kkSayi(x.deger, 1) : x.deger}</b>
  </div>`).join('');
}

// Dikey sütunlar (saat / gün dağılımı) — SVG
function _kkSutunlar(degerler, etiketler, renk, etiketAdimi) {
  const G = 560, Y = 150, alt = 20, ust = 16;
  const enB = Math.max(1, ...degerler);
  const w = G / degerler.length;
  return `<svg viewBox="0 0 ${G} ${Y}" width="100%" style="display:block;" role="img">
    ${degerler.map((v, i) => {
      const h = (v / enB) * (Y - alt - ust);
      const x = i * w + w * 0.15, bw = w * 0.7;
      return `<rect x="${x.toFixed(1)}" y="${(Y - alt - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(h, v ? 2 : 0).toFixed(1)}" rx="3" fill="${renk}" opacity="${v === enB ? 1 : 0.55}"><title>${etiketler[i]}: ${v}</title></rect>
        ${v ? `<text x="${(x + bw / 2).toFixed(1)}" y="${(Y - alt - h - 4).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="700" fill="var(--metin)">${v}</text>` : ''}
        ${i % (etiketAdimi || 1) === 0 ? `<text x="${(x + bw / 2).toFixed(1)}" y="${Y - 5}" text-anchor="middle" font-size="11" fill="var(--metin-soluk)">${etiketler[i]}</text>` : ''}`;
    }).join('')}
  </svg>`;
}

// Heinrich / Bird piramidi — katmanlar alttan üste daralır; kendi oranımız ve 1:29:300 kıyası.
function _kkPiramit(bu) {
  const katmanlar = [
    { ad: 'Kayıp günlü kaza', deger: bu.lti, renk: '#b91c1c' },
    { ad: 'Kısıtlı iş / tıbbi tedavi', deger: bu.dart + bu.tibbi, renk: '#ea580c' },
    { ad: 'İlk yardım', deger: bu.ilkYardim, renk: '#d97706' },
    { ad: 'Maddi hasar', deger: bu.maddiHasar, renk: '#0891b2' },
    { ad: 'Ramak kala / tehlike bildirimi', deger: bu.ramakKala, renk: '#2563eb' }
  ];
  const G = 560, katY = 40, bosluk = 4, merkez = 170, enGenis = 300, enDar = 60;
  const Y = katmanlar.length * (katY + bosluk);
  const genislik = i => enDar + (enGenis - enDar) * (i / (katmanlar.length - 1));
  const svg = katmanlar.map((k, i) => {
    const y = i * (katY + bosluk);
    const ust = genislik(i) - (enGenis - enDar) / (katmanlar.length - 1) * 0.5, alt = genislik(i) + (enGenis - enDar) / (katmanlar.length - 1) * 0.5;
    const nok = [[merkez - ust / 2, y], [merkez + ust / 2, y], [merkez + alt / 2, y + katY], [merkez - alt / 2, y + katY]].map(p => p.map(n => n.toFixed(1)).join(',')).join(' ');
    return `<polygon points="${nok}" fill="${k.renk}" opacity=".9"/>
      <text x="${merkez}" y="${y + katY / 2 + 6}" text-anchor="middle" font-size="17" font-weight="800" fill="#fff">${k.deger}</text>
      <line x1="${merkez + alt / 2 + 8}" y1="${y + katY / 2}" x2="${merkez + enGenis / 2 + 30}" y2="${y + katY / 2}" stroke="var(--kenarlik)" stroke-width="1.5"/>
      <text x="${merkez + enGenis / 2 + 36}" y="${y + katY / 2 + 5}" font-size="13" fill="var(--metin)">${k.ad}</text>`;
  }).join('');
  const tepe = bu.lti;
  const oran = tepe ? `1 : ${_kkSayi((bu.dart + bu.tibbi + bu.ilkYardim) / tepe, 0)} : ${_kkSayi((bu.maddiHasar + bu.ramakKala) / tepe, 0)}` : '';
  return `<svg viewBox="0 0 ${G} ${Y}" width="100%" style="display:block; max-width:560px;" role="img">${svg}</svg>
    <div class="kk-not">${oran ? `Bu yılın oranı <b>${oran}</b> (ciddi : hafif : hasarsız/ramak kala). ` : ''}Heinrich (1931) 1 : 29 : 300 öngörür; tabanın dar olması ramak kala bildirimlerinin eksik toplandığına işaret edebilir.</div>`;
}

function kazaKiyasPaneliniCiz(yil, sonAy, sinirTarih) {
  const kutu = document.getElementById('kazaKiyasKutusu');
  if (!kutu) return;
  _kkStilEkle();
  const kd = kazaKiyasHesapla(yil, sonAy, sinirTarih);
  const bu = kd.bu;
  const AY = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const donem = sonAy === 12 ? `${yil}` : `${yil} Ocak–${AY[sonAy - 1]}`;
  const kaynakMetni = { tablo: 'aylık çalışma saati tablosu', 'tablo-tahmini': 'aylık çalışma saati tablosu (bazı aylar tahmini)', personel: 'tahmini: Personel çalışan sayısı × 2.000 saat', '': 'çalışma saati yok — oranlar hesaplanamadı' };
  const tahminiRozet = bu.saatKaynak === 'personel' || bu.saatKaynak === 'tablo-tahmini' ? '<span class="kk-rozet">tahmini</span>' : '';
  const tahminiYillar = kd.yillar.filter(y => y.saatKaynak === 'personel').map(y => y.yil);
  const saatsizYillar = kd.yillar.filter(y => !y.saatKaynak).map(y => y.yil);

  const isiEnB = Math.max(1, ...kd.isiHaritasi.flatMap(s => s.degerler));
  const isi = kd.isiHaritasi.length ? `<table class="kk-isi">
      <thead><tr><th>Bölüm</th>${kd.yillar.map(y => `<th>${y.yil}</th>`).join('')}</tr></thead>
      <tbody>${kd.isiHaritasi.map(s => `<tr><td title="${_okKacir(s.etiket)}">${_okKacir(s.etiket)}</td>${s.degerler.map(v => {
        const a = v ? 0.15 + 0.85 * v / isiEnB : 0;
        return `<td><div class="kk-hucre" style="background:${v ? `rgba(220,38,38,${a.toFixed(2)})` : 'transparent'}; color:${a > 0.55 ? '#fff' : 'var(--metin)'};">${v || '·'}</div></td>`;
      }).join('')}</tr>`).join('')}</tbody></table>` : '<div class="bos-durum gorunur">Kayıt yok.</div>';

  const vardiyaToplam = kd.vardiya.reduce((a, b) => a + b, 0);
  const bb = kd.baskaBolum;

  kutu.innerHTML = `
    <div class="dashboard-ust" style="margin-top:6px;">
      <h3 style="margin:0;">OSHA ve Avrupa (ILO / Eurostat) Yöntemleriyle Kaza Oranları — ${donem}</h3>
    </div>
    <p style="font-size:12px; color:var(--metin-soluk); margin:4px 0 12px;">
      Çalışma saati: <b>${_kkSayi(bu.saat, 0)}</b> (${kaynakMetni[bu.saatKaynak]}) · Çalışan: <b>${bu.calisan || '—'}</b>${bu.calisanTahmini ? ' (saatten tahmini)' : ''} ·
      Her yıl aynı dönemle (Ocak–${AY[sonAy - 1]}) kıyaslanır; küçük çizgiler son 5 yılın eğilimidir, ▼ yeşil = iyileşme.
      ${tahminiYillar.length ? `<br>${tahminiYillar.join(', ')} için saat tablosu yok; çalışan sayısı × 2.000 saat ile tahmin edildi.` : ''}
      ${saatsizYillar.length ? `<br>${saatsizYillar.join(', ')} için ne saat ne personel verisi var; o yılların oranları boş.` : ''}
    </p>

    <div class="kk-izgara">
      <div class="kk-kart">
        <div class="kk-bant" style="background:#1d4ed8;"></div>
        <h4>OSHA yöntemi <span style="font-size:11px; font-weight:600; color:var(--metin-soluk);">ABD</span> ${tahminiRozet}</h4>
        <p class="kk-alt">200.000 saat başına (100 tam zamanlı çalışanın bir yılı). ABD'de ve uluslararası şirket raporlamasında yaygın.</p>
        ${_kkMetrik('TRIR', 'Kayıt edilebilir vaka (kayıp gün + kısıtlı iş + tıbbi)', 'trir', kd, '#1d4ed8')}
        ${_kkMetrik('DART oranı', 'Kayıp günlü + kısıtlı iş / görev değişikliği', 'dartOrani', kd, '#1d4ed8')}
        ${_kkMetrik('LTIR', 'Kayıp günlü vaka', 'ltir', kd, '#1d4ed8')}
        ${_kkMetrik('Şiddet oranı', 'Kayıp iş günü × 200.000 / saat', 'siddet', kd, '#1d4ed8', 1)}
      </div>
      <div class="kk-kart">
        <div class="kk-bant" style="background:#0f766e;"></div>
        <h4>ILO / Avrupa yöntemi <span style="font-size:11px; font-weight:600; color:var(--metin-soluk);">AB · Eurostat</span> ${tahminiRozet}</h4>
        <p class="kk-alt">ILO sıklık ve ağırlık oranları (Türkiye'deki raporlamada da kullanılır) ve Eurostat ESAW insidans oranı.</p>
        ${_kkMetrik('Sıklık oranı', 'Kayıp günlü kaza × 1.000.000 / saat', 'siklik', kd, '#0f766e')}
        ${_kkMetrik('Ağırlık oranı', 'Kayıp iş günü × 1.000 / saat', 'agirlik', kd, '#0f766e', 3)}
        ${_kkMetrik('ESAW insidansı', '3 günden uzun iş göremezlik × 100.000 / çalışan' + (sonAy < 12 ? ' (yıllıklandırılmış)' : ''), 'esawInsidans', kd, '#0f766e', 0)}
        <div class="kk-not">İki yöntemin farkı: OSHA tıbbi tedavi gerektiren her vakayı sayar ve saate bölerek normalleştirir; ESAW yalnızca 3 günü aşan iş göremezlikleri sayar ve çalışan başına normalleştirir — bu yüzden ESAW sayıları daha az vakayı kapsar.</div>
      </div>
    </div>

    <div class="kk-izgara">
      <div class="kk-kart">
        <h4>Bölüm × Yıl Isı Haritası</h4>
        <p class="kk-alt">İş kazası sayısı, kazanın olduğu bölüme göre (Ocak–${AY[sonAy - 1]}). Koyu = çok kaza.</p>
        ${isi}
      </div>
      <div class="kk-kart">
        <h4>Bölümlere Göre Kayıp İş Günü — ${donem}</h4>
        <p class="kk-alt">Kaza sayısı az ama kayıp günü yüksek bölümler ağır sonuçlu kazaları gösterir.</p>
        ${kd.kayipGunBolum.length ? _kkCubuklar(kd.kayipGunBolum, '#b91c1c', ' gün') : '<div class="bos-durum gorunur">Bu dönemde kayıp günlü kaza yok.</div>'}
      </div>
    </div>

    <div class="kk-izgara">
      <div class="kk-kart">
        <h4>Kaza Saati ve Vardiya</h4>
        <p class="kk-alt">Son 5 yılın ${kd.besYilKazaSayisi} iş kazası${kd.saatsiz ? ` (${kd.saatsiz} kayıtta saat girilmemiş)` : ''}.</p>
        ${_kkSutunlar(kd.saatler, kd.saatler.map((_, i) => String(i).padStart(2, '0')), '#7c3aed', 2)}
        <div style="display:flex; gap:8px; margin-top:8px;">
          ${['08–16', '16–24', '00–08'].map((v, i) => `<div style="flex:1; text-align:center; border:1px solid var(--kenarlik); border-radius:8px; padding:6px 4px;">
            <div style="font-size:11px; color:var(--metin-soluk);">${v} vardiyası</div>
            <div style="font-size:18px; font-weight:800;">${kd.vardiya[i]}</div>
            <div style="font-size:11px; color:var(--metin-soluk);">${vardiyaToplam ? '%' + _kkSayi(kd.vardiya[i] * 100 / vardiyaToplam, 0) : ''}</div>
          </div>`).join('')}
        </div>
      </div>
      <div class="kk-kart">
        <h4>Haftanın Günlerine Göre</h4>
        <p class="kk-alt">Son 5 yılın iş kazaları. Pazartesi yoğunluğu hafta sonu dönüşü, cuma yoğunluğu yorgunluk işareti olabilir.</p>
        ${_kkSutunlar(kd.gunler, _KK_GUNLER, '#0891b2')}
      </div>
    </div>

    <div class="kk-izgara">
      <div class="kk-kart">
        <h4>Kendi Bölümü Dışında Kaza — ${donem}</h4>
        <p class="kk-alt">Çalıştığı bölüm ile kazanın olduğu bölüm farklı olan kazalar (ikisi de girilmiş ${bb.toplam} kaza).</p>
        <div class="kk-buyuk">${bb.toplam ? '%' + _kkSayi(bb.farkli * 100 / bb.toplam, 0) : '—'} <span style="font-size:14px; font-weight:600; color:var(--metin-soluk);">${bb.farkli} / ${bb.toplam} kaza</span></div>
        ${bb.ciftler.length ? `<div style="margin-top:8px;">${_kkCubuklar(bb.ciftler.map(([e, v]) => ({ etiket: e, deger: v })), '#d97706')}</div>` : ''}
        <div class="kk-not">Yüksek oran; bakım, taşıma veya geçici görevlendirmede başka bölümün risklerine yeterince hazırlanılmadığını gösterebilir.</div>
      </div>
      <div class="kk-kart">
        <h4>100 Çalışan Başına Kaza — ${donem}</h4>
        <p class="kk-alt">Kazazedenin çalıştığı bölüme göre; çalışan sayısı Personel modülünden (o dönemde çalışmış olanlar, en az 3 kişilik bölümler).</p>
        ${kd.yuzCalisan.length ? kd.yuzCalisan.map(x => `<div class="kk-cubuk" title="${x.kaza} kaza / ${x.calisan} çalışan">
            <span>${_okKacir(x.etiket)}</span>
            <div class="kk-cubuk-iz"><div style="width:${Math.min(100, x.oran / Math.max(1, kd.yuzCalisan[0].oran) * 100).toFixed(1)}%; background:#be185d;"></div></div>
            <b>${_kkSayi(x.oran, 1)}</b>
          </div>`).join('') : '<div class="bos-durum gorunur">Personel modülünde bölüm bilgisi olan çalışan bulunamadı.</div>'}
        ${kd.eslesmeyenKaza ? `<div class="kk-not">${kd.eslesmeyenKaza} kazanın bölümü Personel'deki bölüm adlarıyla eşleşmedi; Personel'de bölüm adlarını standart listeyle aynı yazarsanız bu tabloya girer.</div>` : ''}
      </div>
    </div>

    <div class="kk-izgara">
      <div class="kk-kart">
        <h4>Olay Piramidi (Heinrich / Bird) — ${donem}</h4>
        <p class="kk-alt">Tüm olay kayıtları, ağırlığına göre.</p>
        ${_kkPiramit(bu)}
      </div>
    </div>
  `;
}
