// İnsan Kaynakları paneli — kullanıcı isteği: "personel modülünde insan
// kaynakları için dashboard veya İK butonu; içinde eğitim, engelli personel,
// turn over gibi İK'yı ilgilendiren bilgiler, istatistikler olsun". Personel
// sayfasındaki "Raporlar" düğmesinin yerine geldi (kullanıcı: "raporu kaldır,
// onun yerine"). Yalnızca okur; veri Personel ve Eğitim modüllerinden gelir.
//
// Engelli kotası (4857 sayılı İş Kanunu Md.30): 50 ve üzeri işçi çalıştıran
// işyerinde işçilerin %3'ü engelli olmalı. Kullanıcı isteği: her İşyeri Sicili
// ayrı hesaplansın (ör. BAĞFAŞ'ta Bandırma Gübre Fabrikaları, Teknik
// Müteahhitlik ve Servis Pazarlama ayrı işverenler). Yönetmelik gereği yarımdan
// küçük kesir atılır, yarım ve üstü tama tamamlanır (Math.round).
//
// Devir (turnover) oranı = dönemde ayrılan / dönemin ortalama aktif personeli
// (dönem başı + dönem sonu ortalaması) × 100 — Personel ve Raporlar ile aynı yöntem.

const _IK_KOTA_ORANI = 0.03;
const _IK_KOTA_ESIK = 50;
const _IK_AYLAR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const _IK_SICILSIZ = 'İşyeri sicili belirtilmemiş';

let _ikFirma = null;

function _ikKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function _ikBugun() {
  const t = new Date();
  return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
}

function _ikSayi(n, basamak) {
  return Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: basamak || 0, maximumFractionDigits: basamak || 0 });
}

function _ikYuzde(pay, payda) {
  return payda ? Math.round(pay / payda * 1000) / 10 : 0;
}

// Tarihte aktif: işe girmiş ve henüz ayrılmamış (çıkış günü aktif sayılmaz).
function _ikAktifMi(p, tarih) {
  return !!p.iseGirisTarihi && p.iseGirisTarihi <= tarih && (!p.istenCikisTarihi || p.istenCikisTarihi > tarih);
}

function _ikGunFarki(bas, son) {
  return Math.round((new Date(son + 'T12:00:00') - new Date(bas + 'T12:00:00')) / 86400000);
}

// Kıdem: işe giriş tarihinden bugüne (yoksa kayıttaki Kıdem Yıl).
function _ikKidemYil(p, bugun) {
  if (p.iseGirisTarihi) return Math.max(0, _ikGunFarki(p.iseGirisTarihi, bugun) / 365.25);
  return p.kidemYil != null && p.kidemYil !== '' ? Number(p.kidemYil) : null;
}

function _ikDevirOrani(tumu, bas, son, ayrilan) {
  const ort = (tumu.filter(p => _ikAktifMi(p, bas)).length + tumu.filter(p => _ikAktifMi(p, son)).length) / 2;
  return ort > 0 ? Math.round(ayrilan / ort * 1000) / 10 : 0;
}

function _ikSay(liste, anahtarFn) {
  const m = new Map();
  liste.forEach(x => { const a = anahtarFn(x); m.set(a, (m.get(a) || 0) + 1); });
  return [...m].map(([etiket, deger]) => ({ etiket, deger })).sort((a, b) => b.deger - a.deger || String(a.etiket).localeCompare(String(b.etiket), 'tr'));
}

// ==================== HESAPLAMA ====================

function ikPaneliHesapla(yil) {
  const tumu = personelTumunuGetir().filter(p => p && p.adSoyad);
  const bugun = _ikBugun();
  const buYil = Number(bugun.slice(0, 4));
  const yilBas = `${yil}-01-01`;
  const yilSon = yil === buYil ? bugun : `${yil}-12-31`;
  const aktif = tumu.filter(p => !p.istenCikisTarihi || p.istenCikisTarihi > bugun);
  const sicil = p => (p.isveren || '').trim() || _IK_SICILSIZ;
  const engelliMi = p => p.engelliMi === 'EVET';

  // --- Engelli kotası: İşyeri Sicili başına ayrı ---
  const siciller = [...new Set(aktif.map(sicil))].sort((a, b) => (a === _IK_SICILSIZ) - (b === _IK_SICILSIZ) || a.localeCompare(b, 'tr'));
  const kota = siciller.map(ad => {
    const calisanlar = aktif.filter(p => sicil(p) === ad);
    const engelli = calisanlar.filter(engelliMi).length;
    const kapsamda = calisanlar.length >= _IK_KOTA_ESIK;
    const gerekli = kapsamda ? Math.round(calisanlar.length * _IK_KOTA_ORANI) : 0;
    return { ad, calisan: calisanlar.length, engelli, oran: _ikYuzde(engelli, calisanlar.length), kapsamda, gerekli, eksik: Math.max(0, gerekli - engelli), fazla: Math.max(0, engelli - gerekli) };
  });
  const engelliler = aktif.filter(engelliMi).sort((a, b) => sicil(a).localeCompare(sicil(b), 'tr') || a.adSoyad.localeCompare(b.adSoyad, 'tr'));

  // --- Devir (turnover) ---
  const girenler = tumu.filter(p => p.iseGirisTarihi >= yilBas && p.iseGirisTarihi <= yilSon);
  const ayrilanlar = tumu.filter(p => p.istenCikisTarihi && p.istenCikisTarihi >= yilBas && p.istenCikisTarihi <= yilSon);
  const aylik = _IK_AYLAR.map((ad, i) => {
    const ay = String(i + 1).padStart(2, '0');
    const bas = `${yil}-${ay}-01`;
    if (bas > yilSon) return { ad, giren: null, cikan: null, oran: null };
    const sonGun = new Date(yil, i + 1, 0).getDate();
    const son = `${yil}-${ay}-${String(sonGun).padStart(2, '0')}` > yilSon ? yilSon : `${yil}-${ay}-${String(sonGun).padStart(2, '0')}`;
    const giren = tumu.filter(p => p.iseGirisTarihi >= bas && p.iseGirisTarihi <= son).length;
    const cikan = tumu.filter(p => p.istenCikisTarihi && p.istenCikisTarihi >= bas && p.istenCikisTarihi <= son).length;
    return { ad, giren, cikan, oran: _ikDevirOrani(tumu, bas, son, cikan) };
  });
  const sureler = ayrilanlar.filter(p => p.iseGirisTarihi).map(p => _ikGunFarki(p.iseGirisTarihi, p.istenCikisTarihi));
  const yillik = [yil - 4, yil - 3, yil - 2, yil - 1, yil].map(y => {
    const b = `${y}-01-01`, s = y === buYil ? bugun : `${y}-12-31`;
    const ayr = tumu.filter(p => p.istenCikisTarihi && p.istenCikisTarihi >= b && p.istenCikisTarihi <= s).length;
    const gir = tumu.filter(p => p.iseGirisTarihi >= b && p.iseGirisTarihi <= s).length;
    return { yil: y, giren: gir, ayrilan: ayr, oran: _ikDevirOrani(tumu, b, s, ayr), devam: y === buYil };
  });
  const bolum = p => (p.bolum || '').trim() || 'Belirtilmemiş';
  const bolumler = [...new Set(tumu.filter(p => _ikAktifMi(p, yilBas) || _ikAktifMi(p, yilSon) || ayrilanlar.includes(p)).map(bolum))];
  const bolumDevir = bolumler.map(b => {
    const grup = tumu.filter(p => bolum(p) === b);
    const ayr = ayrilanlar.filter(p => bolum(p) === b).length;
    return { etiket: b, ayrilan: ayr, giren: girenler.filter(p => bolum(p) === b).length, aktif: grup.filter(p => _ikAktifMi(p, yilSon)).length, oran: _ikDevirOrani(grup, yilBas, yilSon, ayr) };
  }).filter(b => b.ayrilan || b.giren).sort((a, b) => b.ayrilan - a.ayrilan || b.oran - a.oran);

  // --- Eğitim (İSG eğitimleri ve belgeler) ---
  const kayitlar = egitimKayitlariTumunuGetir();
  const sonKayit = new Map();
  kayitlar.forEach(k => {
    const a = k.personelId + '|' + k.egitimTuruId;
    const m = sonKayit.get(a);
    if (!m || String(k.tarih) > String(m.tarih)) sonKayit.set(a, k);
  });
  const durumu = (p, tur) => {
    const k = sonKayit.get(p.id + '|' + tur.id);
    if (!k) return 'kayit_yok';
    return egitimDurumHesapla(tur, egitimBitisTarihiHesapla(k, tur, _ikFirma, p), k.suresizMi);
  };
  const aktifIdler = new Set(aktif.map(p => p.id));
  const turler = egitimTurleriTumu().filter(t => t.id === 'temel_isg' || t.id === 'is_basi' || kayitlar.some(k => k.egitimTuruId === t.id && aktifIdler.has(k.personelId)));
  const turDurumlari = turler.map(tur => {
    const s = { gecerli: 0, yaklasiyor: 0, gecmis: 0, kayit_yok: 0 };
    aktif.forEach(p => { const d = durumu(p, tur); s[d === 'suresiz' ? 'gecerli' : d]++; });
    return Object.assign({ tur }, s, { uyum: _ikYuzde(s.gecerli + s.yaklasiyor, aktif.length) });
  });
  const temel = egitimTuruGetir('temel_isg');
  const temelEksikler = temel ? aktif.map(p => ({ p, d: durumu(p, temel) })).filter(x => x.d === 'gecmis' || x.d === 'kayit_yok') : [];
  const bolumTemel = temel ? _ikSay(aktif, bolum).map(b => {
    const grup = aktif.filter(p => bolum(p) === b.etiket);
    const uygun = grup.filter(p => ['gecerli', 'yaklasiyor', 'suresiz'].includes(durumu(p, temel))).length;
    return { etiket: b.etiket, calisan: grup.length, uygun, oran: _ikYuzde(uygun, grup.length) };
  }).sort((a, b) => a.oran - b.oran || b.calisan - a.calisan) : [];
  const yilKayitlari = kayitlar.filter(k => String(k.tarih) >= yilBas && String(k.tarih) <= yilSon);
  const egitimSaati = yilKayitlari.reduce((t, k) => t + (Number(String(k.saat).replace(',', '.')) || 0), 0);
  const ortAktif = (tumu.filter(p => _ikAktifMi(p, yilBas)).length + tumu.filter(p => _ikAktifMi(p, yilSon)).length) / 2;
  const isBasi = egitimTuruGetir('is_basi');
  const isBasiEksik = isBasi ? girenler.filter(p => aktifIdler.has(p.id) && !sonKayit.has(p.id + '|is_basi')) : [];

  // --- Dağılımlar ---
  const kidemler = aktif.map(p => _ikKidemYil(p, bugun)).filter(k => k != null);
  const kidemGrubu = k => k < 1 ? '1 yıldan az' : k < 3 ? '1–3 yıl' : k < 5 ? '3–5 yıl' : k < 10 ? '5–10 yıl' : k < 20 ? '10–20 yıl' : '20 yıl ve üzeri';
  const kidemSira = ['1 yıldan az', '1–3 yıl', '3–5 yıl', '5–10 yıl', '10–20 yıl', '20 yıl ve üzeri'];
  const ogrenimSira = PERSONEL_EGITIM_SEVIYELERI.concat(['Belirtilmemiş']);

  return {
    yil, yilSon, devam: yil === buYil, aktif, tumuSayisi: tumu.length,
    kota, engelliler, sicil,
    giren: girenler.length, ayrilan: ayrilanlar.length, devirOrani: _ikDevirOrani(tumu, yilBas, yilSon, ayrilanlar.length),
    aylik, yillik, bolumDevir,
    ayrilanOrtSureAy: sureler.length ? sureler.reduce((t, g) => t + g, 0) / sureler.length / 30.44 : null,
    ilk6Ay: sureler.filter(g => g < 183).length, ilkYil: sureler.filter(g => g < 365).length, sureliAyrilan: sureler.length,
    turDurumlari, temelEksikler, bolumTemel, isBasiEksik,
    egitimSaati, egitimKatilim: yilKayitlari.length, kisiBasiSaat: ortAktif ? egitimSaati / ortAktif : 0,
    ortKidem: kidemler.length ? kidemler.reduce((t, k) => t + k, 0) / kidemler.length : null,
    kidemDagilimi: kidemSira.map(e => ({ etiket: e, deger: kidemler.filter(k => kidemGrubu(k) === e).length })).filter(x => x.deger),
    ogrenim: ogrenimSira.map(e => ({ etiket: e, deger: aktif.filter(p => (p.egitimSeviyesi || 'Belirtilmemiş') === e).length })).filter(x => x.deger),
    bolumDagilimi: _ikSay(aktif, bolum),
    sicilDagilimi: _ikSay(aktif, sicil),
    sendikali: aktif.filter(p => p.sendikaliMi === 'EVET').length,
    lojman: aktif.filter(p => p.lojman === 'VAR').length,
    mv: _ikSay(aktif.filter(p => p.mv), p => p.mv),
    kapsam: _ikSay(aktif.filter(p => p.kapsami), p => p.kapsami)
  };
}

// ==================== ÇİZİM ====================

function _ikKart(etiket, deger, alt, renk) {
  return `<div class="istatistik-kutu"><span>${etiket}</span><b style="${renk ? 'color:' + renk : ''}">${deger}</b>${alt ? `<small class="ik-kart-alt">${alt}</small>` : ''}</div>`;
}

function _ikCubuklar(satirlar, renk, sonEk) {
  if (!satirlar.length) return '<p class="ik-bos">Veri yok.</p>';
  const enBuyuk = Math.max(...satirlar.map(s => s.deger), 1);
  return `<div class="ik-cubuklar">${satirlar.map(s => `
    <div class="ik-cubuk-satir" title="${_ikKacir(s.etiket)}: ${_ikSayi(s.deger, s.basamak)}${sonEk || ''}">
      <span class="ik-cubuk-etiket">${_ikKacir(s.etiket)}</span>
      <span class="ik-cubuk-iz"><span style="width:${Math.max(2, s.deger / enBuyuk * 100)}%; background:${s.renk || renk};"></span></span>
      <b>${_ikSayi(s.deger, s.basamak)}${sonEk || ''}</b>
    </div>`).join('')}</div>`;
}

function _ikBolum(baslik, aciklama, icerik) {
  return `<section class="ik-bolum"><h3>${baslik}</h3>${aciklama ? `<p class="ik-aciklama">${aciklama}</p>` : ''}${icerik}</section>`;
}

function ikPaneliniCiz() {
  const yil = Number(document.getElementById('ikYil').value);
  const h = ikPaneliHesapla(yil);
  const donem = h.devam ? `${yil} (bugüne kadar)` : String(yil);
  const toplamEngelli = h.engelliler.length;
  const kotaEksik = h.kota.reduce((t, k) => t + k.eksik, 0);

  // Özet kartları
  document.getElementById('ikOzet').innerHTML =
    _ikKart('Aktif Personel', _ikSayi(h.aktif.length), `${h.sicilDagilimi.length} işyeri sicili · ${h.bolumDagilimi.length} bölüm`) +
    _ikKart(`İşe Giren · ${yil}`, _ikSayi(h.giren), '', 'var(--basari)') +
    _ikKart(`Ayrılan · ${yil}`, _ikSayi(h.ayrilan), '', h.ayrilan ? 'var(--hata)' : '') +
    _ikKart(`Devir Oranı · ${yil}`, '%' + _ikSayi(h.devirOrani, 1), h.devam ? 'yıl sonu değil, bugüne kadar' : 'yıllık') +
    _ikKart('Engelli Çalışan', _ikSayi(toplamEngelli), kotaEksik ? `kota: ${kotaEksik} kişi eksik` : 'kota uygun', kotaEksik ? 'var(--hata)' : '') +
    _ikKart('Ortalama Kıdem', h.ortKidem == null ? '—' : _ikSayi(h.ortKidem, 1) + ' yıl') +
    _ikKart('Temel İSG Uyumu', h.turDurumlari.length ? '%' + _ikSayi(h.turDurumlari.find(t => t.tur.id === 'temel_isg').uyum, 1) : '—', `${h.temelEksikler.length} kişi eksik / süresi geçmiş`, h.temelEksikler.length ? 'var(--hata)' : 'var(--basari)') +
    _ikKart(`Eğitim Saati · ${yil}`, _ikSayi(h.egitimSaati, 0), `kişi başı ${_ikSayi(h.kisiBasiSaat, 1)} saat`);

  // Engelli kotası
  const kotaSatir = k => {
    const durum = !k.kapsamda ? '<span class="ik-rozet gri">Kapsam dışı (&lt; 50)</span>'
      : k.eksik ? `<span class="ik-rozet kirmizi">${k.eksik} kişi eksik</span>`
        : `<span class="ik-rozet yesil">Uygun${k.fazla ? ' (+' + k.fazla + ')' : ''}</span>`;
    return `<tr${k.ad === _IK_SICILSIZ ? ' class="ik-soluk"' : ''}><td><b>${_ikKacir(k.ad)}</b></td><td class="sag">${_ikSayi(k.calisan)}</td><td class="sag">${k.kapsamda ? _ikSayi(k.gerekli) : '—'}</td><td class="sag">${_ikSayi(k.engelli)}</td><td class="sag">%${_ikSayi(k.oran, 1)}</td><td>${durum}</td></tr>`;
  };
  const sicilsizVar = h.kota.some(k => k.ad === _IK_SICILSIZ);
  const engelliHtml = _ikBolum('♿ Engelli Çalışan Kotası — İşyeri Sicili Bazında',
    '4857 sayılı İş Kanunu Md.30: 50 ve üzeri işçi çalıştıran işyerlerinde işçilerin en az %3\'ü engelli olmalıdır. Her işyeri sicili (işveren) ayrı hesaplanır; yarımdan küçük kesir dikkate alınmaz, yarım ve üstü tama tamamlanır.',
    `<div class="tablo-scroll"><table class="veri-tablosu ik-tablo"><thead><tr><th>İşyeri Sicili</th><th class="sag">Çalışan</th><th class="sag">Gerekli (%3)</th><th class="sag">Engelli</th><th class="sag">Oran</th><th>Durum</th></tr></thead>
      <tbody>${h.kota.map(kotaSatir).join('') || '<tr><td colspan="6">Aktif personel yok.</td></tr>'}</tbody></table></div>
    ${sicilsizVar ? `<p class="ik-uyari">⚠️ İşyeri sicili girilmemiş personel var; bu kişiler hiçbir işverenin kotasına sayılmıyor. Personel kaydında "İşyeri Sicili" alanını doldurun.</p>` : ''}
    ${toplamEngelli ? `<details class="ik-detay"><summary>Engelli personel listesi (${toplamEngelli})</summary>
      <table class="veri-tablosu ik-tablo"><thead><tr><th>Sicil No</th><th>Ad Soyad</th><th>İşyeri Sicili</th><th>Bölüm</th><th>Görev</th><th>İşe Giriş</th></tr></thead><tbody>
      ${h.engelliler.map(p => `<tr><td>${_ikKacir(p.sicilNo)}</td><td>${_ikKacir(p.adSoyad)}</td><td>${_ikKacir(h.sicil(p))}</td><td>${_ikKacir(p.bolum)}</td><td>${_ikKacir(p.gorev)}</td><td>${p.iseGirisTarihi ? gunAyYil(p.iseGirisTarihi) : ''}</td></tr>`).join('')}
      </tbody></table></details>` : ''}`);

  // Devir
  const enBuyukAy = Math.max(1, ...h.aylik.map(a => Math.max(a.giren || 0, a.cikan || 0)));
  const ayGrafik = `<div class="ik-aylik">${h.aylik.map(a => `
    <div class="ik-ay${a.giren == null ? ' gelecek' : ''}" title="${a.ad}: ${a.giren == null ? 'henüz gelmedi' : `giren ${a.giren}, ayrılan ${a.cikan}, devir %${_ikSayi(a.oran, 1)}`}">
      <div class="ik-ay-cubuklar">
        <span class="giren" style="height:${(a.giren || 0) / enBuyukAy * 100}%;">${a.giren ? `<i>${a.giren}</i>` : ''}</span>
        <span class="cikan" style="height:${(a.cikan || 0) / enBuyukAy * 100}%;">${a.cikan ? `<i>${a.cikan}</i>` : ''}</span>
      </div>
      <small>${a.ad}</small><small class="ik-ay-oran">${a.oran == null ? '' : '%' + _ikSayi(a.oran, 1)}</small>
    </div>`).join('')}</div>
    <div class="ik-lejant"><span><i class="giren"></i> İşe giren</span><span><i class="cikan"></i> Ayrılan</span><span>Alttaki yüzde: aylık devir oranı</span></div>`;
  const devirHtml = _ikBolum(`🔄 Personel Devri (Turnover) — ${donem}`,
    'Devir oranı = dönemde ayrılan ÷ dönemin ortalama aktif personeli (dönem başı ve sonu ortalaması) × 100.',
    `<div class="istatistik-grid ik-mini">
      ${_ikKart('Ayrılanların Ortalama Çalışma Süresi', h.ayrilanOrtSureAy == null ? '—' : _ikSayi(h.ayrilanOrtSureAy, 1) + ' ay')}
      ${_ikKart('İlk 6 Ayda Ayrılan', _ikSayi(h.ilk6Ay), h.sureliAyrilan ? `ayrılanların %${_ikSayi(_ikYuzde(h.ilk6Ay, h.sureliAyrilan), 1)}'i` : '', h.ilk6Ay ? '#b45309' : '')}
      ${_ikKart('İlk 1 Yılda Ayrılan', _ikSayi(h.ilkYil), h.sureliAyrilan ? `ayrılanların %${_ikSayi(_ikYuzde(h.ilkYil, h.sureliAyrilan), 1)}'i` : '')}
      ${_ikKart('Net Değişim', (h.giren - h.ayrilan > 0 ? '+' : '') + _ikSayi(h.giren - h.ayrilan), 'giren − ayrılan', h.giren - h.ayrilan < 0 ? 'var(--hata)' : 'var(--basari)')}
    </div>
    <div class="ik-iki">
      <div><h4>Aylık giriş / çıkış</h4>${ayGrafik}</div>
      <div><h4>Son 5 yıl devir oranı</h4>${_ikCubuklar(h.yillik.map(y => ({ etiket: y.yil + (y.devam ? ' *' : '') + `  (${y.giren} giren / ${y.ayrilan} ayrılan)`, deger: y.oran, basamak: 1, renk: y.yil === yil ? '#dc2626' : '#94a3b8' })), '#94a3b8', '%')}
        ${h.yillik.some(y => y.devam) ? '<p class="ik-not">* Devam eden yıl, bugüne kadar.</p>' : ''}</div>
    </div>
    <h4>Bölüm bazında devir — ${donem}</h4>
    ${h.bolumDevir.length ? `<div class="tablo-scroll"><table class="veri-tablosu ik-tablo"><thead><tr><th>Bölüm</th><th class="sag">Giren</th><th class="sag">Ayrılan</th><th class="sag">Şu An Aktif</th><th class="sag">Devir Oranı</th></tr></thead><tbody>
      ${h.bolumDevir.map(b => `<tr><td>${_ikKacir(b.etiket)}</td><td class="sag">${b.giren}</td><td class="sag">${b.ayrilan}</td><td class="sag">${b.aktif}</td><td class="sag"${b.oran >= 20 ? ' style="color:var(--hata); font-weight:700;"' : ''}>%${_ikSayi(b.oran, 1)}</td></tr>`).join('')}
      </tbody></table></div>` : '<p class="ik-bos">Bu dönemde giriş/çıkış yok.</p>'}`);

  // Eğitim
  const durumHucre = (n, sinif) => `<td class="sag">${n ? `<span class="ik-rozet ${sinif}">${n}</span>` : '<span class="ik-soluk">0</span>'}</td>`;
  const egitimHtml = _ikBolum('📚 Eğitim',
    'Aktif personelin her eğitim türündeki en son kaydına göre (Eğitim modülündeki geçerlilik kurallarıyla). Temel İSG süresi işyeri siciline tanımlı tehlike sınıfına göre hesaplanır.',
    `<div class="istatistik-grid ik-mini">
      ${_ikKart(`Eğitim Katılımı · ${yil}`, _ikSayi(h.egitimKatilim), 'kayıt sayısı')}
      ${_ikKart(`Toplam Eğitim Saati · ${yil}`, _ikSayi(h.egitimSaati, 0))}
      ${_ikKart('Kişi Başı Eğitim Saati', _ikSayi(h.kisiBasiSaat, 1), 'ortalama aktif personele göre')}
      ${_ikKart('İş Başı Eğitimi Eksik', _ikSayi(h.isBasiEksik.length), `${yil} yılında işe girenlerden`, h.isBasiEksik.length ? 'var(--hata)' : '')}
    </div>
    <div class="tablo-scroll"><table class="veri-tablosu ik-tablo"><thead><tr><th>Eğitim / Belge</th><th class="sag">Geçerli</th><th class="sag">30 Gün İçinde Bitiyor</th><th class="sag">Süresi Geçmiş</th><th class="sag">Kaydı Yok</th><th class="sag">Uyum</th></tr></thead><tbody>
      ${h.turDurumlari.map(t => `<tr><td>${_ikKacir(t.tur.ad)}</td>${durumHucre(t.gecerli, 'yesil')}${durumHucre(t.yaklasiyor, 'sari')}${durumHucre(t.gecmis, 'kirmizi')}${durumHucre(t.kayit_yok, 'gri')}<td class="sag"><b>%${_ikSayi(t.uyum, 1)}</b></td></tr>`).join('')}
    </tbody></table></div>
    <p class="ik-not">Uyum = geçerli + 30 gün içinde bitecek olanlar ÷ aktif personel. İş Başı, Risk Ekip gibi tek seferlik eğitimlerde kaydı olan herkes geçerli sayılır. MYK ve operatörlük belgeleri herkes için gerekli değildir; bu satırlarda "kaydı yok" eksiklik anlamına gelmeyebilir.</p>
    <div class="ik-iki">
      <div><h4>Bölüm bazında Temel İSG uyumu</h4>${_ikCubuklar(h.bolumTemel.map(b => ({ etiket: `${b.etiket} (${b.uygun}/${b.calisan})`, deger: b.oran, basamak: 1, renk: b.oran >= 90 ? '#16a34a' : b.oran >= 70 ? '#f59e0b' : '#dc2626' })), '#16a34a', '%')}</div>
      <div><h4>Öğrenim durumu</h4>${_ikCubuklar(h.ogrenim, '#6366f1')}</div>
    </div>
    ${h.temelEksikler.length ? `<details class="ik-detay"><summary>Temel İSG eğitimi süresi geçmiş / kaydı olmayan personel (${h.temelEksikler.length})</summary>
      <table class="veri-tablosu ik-tablo"><thead><tr><th>Sicil No</th><th>Ad Soyad</th><th>İşyeri Sicili</th><th>Bölüm</th><th>Durum</th></tr></thead><tbody>
      ${h.temelEksikler.sort((a, b) => String(a.p.bolum).localeCompare(String(b.p.bolum), 'tr') || a.p.adSoyad.localeCompare(b.p.adSoyad, 'tr')).map(x => `<tr><td>${_ikKacir(x.p.sicilNo)}</td><td>${_ikKacir(x.p.adSoyad)}</td><td>${_ikKacir(h.sicil(x.p))}</td><td>${_ikKacir(x.p.bolum)}</td><td>${x.d === 'gecmis' ? '<span class="ik-rozet kirmizi">Süresi geçmiş</span>' : '<span class="ik-rozet gri">Kaydı yok</span>'}</td></tr>`).join('')}
      </tbody></table></details>` : ''}
    ${h.isBasiEksik.length ? `<details class="ik-detay"><summary>${yil} yılında işe girip İş Başı Eğitimi kaydı olmayanlar (${h.isBasiEksik.length})</summary>
      <table class="veri-tablosu ik-tablo"><thead><tr><th>Sicil No</th><th>Ad Soyad</th><th>Bölüm</th><th>İşe Giriş</th></tr></thead><tbody>
      ${h.isBasiEksik.map(p => `<tr><td>${_ikKacir(p.sicilNo)}</td><td>${_ikKacir(p.adSoyad)}</td><td>${_ikKacir(p.bolum)}</td><td>${gunAyYil(p.iseGirisTarihi)}</td></tr>`).join('')}
      </tbody></table></details>` : ''}`);

  // Dağılımlar
  const dagilimHtml = _ikBolum('👥 Personel Yapısı', 'Bugün aktif olan personele göre.',
    `<div class="istatistik-grid ik-mini">
      ${_ikKart('Sendikalı', _ikSayi(h.sendikali), `%${_ikSayi(_ikYuzde(h.sendikali, h.aktif.length), 1)}`)}
      ${_ikKart('Lojmanda Kalan', _ikSayi(h.lojman), `%${_ikSayi(_ikYuzde(h.lojman, h.aktif.length), 1)}`)}
      ${_ikKart('Engelli', _ikSayi(toplamEngelli), `%${_ikSayi(_ikYuzde(toplamEngelli, h.aktif.length), 1)}`)}
      ${_ikKart('Arşivde (Ayrılmış)', _ikSayi(h.tumuSayisi - h.aktif.length))}
    </div>
    <div class="ik-iki">
      <div><h4>İşyeri sicili</h4>${_ikCubuklar(h.sicilDagilimi, '#0e7490')}</div>
      <div><h4>Kıdem</h4>${_ikCubuklar(h.kidemDagilimi, '#7c3aed')}</div>
      <div><h4>Bölüm</h4>${_ikCubuklar(h.bolumDagilimi.slice(0, 15), '#2563eb')}${h.bolumDagilimi.length > 15 ? `<p class="ik-not">İlk 15 bölüm gösteriliyor (toplam ${h.bolumDagilimi.length}).</p>` : ''}</div>
      <div>${h.kapsam.length ? `<h4>Kapsamı</h4>${_ikCubuklar(h.kapsam, '#0891b2')}` : ''}${h.mv.length ? `<h4>M/V</h4>${_ikCubuklar(h.mv, '#64748b')}` : ''}</div>
    </div>`);

  document.getElementById('ikIcerik').innerHTML = engelliHtml + devirHtml + egitimHtml + dagilimHtml;
}

function ikPaneliniBaslat(firma) {
  _ikFirma = firma;
  egitimTurleriniAyarla(firma);
  const tumu = personelTumunuGetir();
  const buYil = new Date().getFullYear();
  const yillar = tumu.flatMap(p => [p.iseGirisTarihi, p.istenCikisTarihi]).filter(Boolean).map(t => Number(String(t).slice(0, 4))).filter(y => y > 1950 && y <= buYil);
  const ilk = Math.max(Math.min(buYil, ...yillar), buYil - 15);
  const secim = document.getElementById('ikYil');
  secim.innerHTML = Array.from({ length: buYil - ilk + 1 }, (_, i) => buYil - i).map(y => `<option>${y}</option>`).join('');
  secim.addEventListener('change', ikPaneliniCiz);
  document.getElementById('ikYazdirBtn').addEventListener('click', () => window.print());
  ikPaneliniCiz();
}
