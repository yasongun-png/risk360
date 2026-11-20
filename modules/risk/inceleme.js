// Günlük Risk İncelemesi.
// Kullanıcı isteği (2026-11-18): "uygulama her gün 10 riski incelemem için
// bana göstersin, açılan sayfada riskleri düzenleyebileyim kullanıcı dostu
// bir şekilde, incelenenleri takip etsin, onaylı olsun onlar" + "en son yılın
// risklerini".
//
// - Her gün en son değerlendirme yılının henüz onaylanmamış risklerinden 10
//   tanesi (en yüksek düzeyden başlayarak) günün listesine alınır; liste gün
//   içinde sabittir (firma bazında tenantAnahtar('risk_gunluk_inceleme')).
// - Kartlarda risk doğrudan düzenlenir; "Kaydet ve Onayla" ile risk kaydına
//   inceleme: { onayli, tarih, kullanici, kullaniciId } yazılır.
// - İncelenenler listesi ve yıl geneli ilerleme (onaylı / toplam) tutulur.

const RISK_GUNLUK_HEDEF = 10;

function _inBugun() { return new Date().toISOString().slice(0, 10); }
function _inK(v) { return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
function _inAnahtar() { return tenantAnahtar('risk_gunluk_inceleme'); }

function riskIncelemeYili() {
  const yillar = riskYillariListesi();
  return yillar[yillar.length - 1];
}

function riskOnayliMi(r) { return !!(r && r.inceleme && r.inceleme.onayli); }

function _inAdaylar(yil, haric) {
  const goreli = r => r.RP1 / (r.yontem === '5x5' ? 25 : 1000);
  return riskTumunuGetir()
    .filter(r => riskYili(r) === yil && r.durum !== 'İptal' && !riskOnayliMi(r) && !haric.has(r.id))
    .map(_riskiZenginlestir)
    .sort((a, b) => (riskSeviyesiSirasi(b.duzey1) - riskSeviyesiSirasi(a.duzey1)) || (goreli(b) - goreli(a)) ||
      String(a.riskNo || '').localeCompare(String(b.riskNo || ''), 'tr', { numeric: true }));
}

// Günün listesi: { tarih, yil, idler, atlananlar }. Gün ya da yıl değişince yeniden kurulur.
function riskGunlukListeGetir() {
  const yil = riskIncelemeYili();
  const bugun = _inBugun();
  let kayit = oku(_inAnahtar(), null);
  const mevcutIdler = new Set(riskTumunuGetir().map(r => r.id));
  if (!kayit || kayit.tarih !== bugun || kayit.yil !== yil) {
    kayit = { tarih: bugun, yil, idler: _inAdaylar(yil, new Set()).slice(0, RISK_GUNLUK_HEDEF).map(r => r.id), atlananlar: [] };
    yaz(_inAnahtar(), kayit);
  } else if (kayit.idler.some(id => !mevcutIdler.has(id))) {
    kayit.idler = kayit.idler.filter(id => mevcutIdler.has(id));
    yaz(_inAnahtar(), kayit);
  }
  return kayit;
}

function riskGunlukListeyeEkle(adet) {
  const kayit = riskGunlukListeGetir();
  const haric = new Set(kayit.idler.concat(kayit.atlananlar || []));
  const yeni = _inAdaylar(kayit.yil, haric).slice(0, adet || RISK_GUNLUK_HEDEF).map(r => r.id);
  kayit.idler = kayit.idler.concat(yeni);
  yaz(_inAnahtar(), kayit);
  return yeni.length;
}

// Kullanıcı isteği (2026-11-20): "burada istersem riski tamamen sil butonu
// olsun, silebileyim kontrol ederken" — risk kaydı silinir (riskSil), günün
// listesinde yerine sıradaki onaylanmamış risk gelir.
function riskGunlukSil(id) {
  // Liste silmeden ÖNCE alınır: sonra okunursa silinen id listeden zaten
  // atılmış olur ve yerine yenisi konamaz.
  const kayit = riskGunlukListeGetir();
  const s = riskSil(id);
  if (!s.basarili) return s;
  const haric = new Set(kayit.idler.concat(kayit.atlananlar || []));
  const yerine = _inAdaylar(kayit.yil, haric)[0];
  kayit.idler = kayit.idler.flatMap(x => x === id ? (yerine ? [yerine.id] : []) : [x]);
  kayit.atlananlar = (kayit.atlananlar || []).filter(x => x !== id);
  yaz(_inAnahtar(), kayit);
  return { basarili: true, yerine: yerine || null };
}

// Riski bugünkü listeden çıkarıp yerine sıradaki adayı koyar.
function riskGunlukAtla(id) {
  const kayit = riskGunlukListeGetir();
  kayit.atlananlar = Array.from(new Set((kayit.atlananlar || []).concat([id])));
  const haric = new Set(kayit.idler.concat(kayit.atlananlar));
  const yerine = _inAdaylar(kayit.yil, haric)[0];
  kayit.idler = kayit.idler.flatMap(x => x === id ? (yerine ? [yerine.id] : []) : [x]);
  yaz(_inAnahtar(), kayit);
  return yerine || null;
}

function riskOnayla(id) {
  const k = oturumdakiKullanici ? oturumdakiKullanici() : null;
  return riskGuncelleRepo(id, { inceleme: { onayli: true, tarih: _inBugun(), zaman: new Date().toISOString(), kullanici: (k && k.adSoyad) || '', kullaniciId: (k && k.id) || '' } });
}

function riskOnayiGeriAl(id) {
  return riskGuncelleRepo(id, { inceleme: null });
}

function riskIncelemeIstatistik() {
  const yil = riskIncelemeYili();
  const liste = riskTumunuGetir().filter(r => riskYili(r) === yil && r.durum !== 'İptal');
  const onayli = liste.filter(riskOnayliMi);
  const kayit = riskGunlukListeGetir();
  const bugunkuler = kayit.idler.map(id => liste.find(r => r.id === id)).filter(Boolean);
  return {
    yil, toplam: liste.length, onayli: onayli.length,
    bugunToplam: bugunkuler.length, bugunOnayli: bugunkuler.filter(riskOnayliMi).length,
    bugunOnaylanan: onayli.filter(r => r.inceleme.tarih === _inBugun()).length
  };
}

// ===================== EKRAN =====================

let _inGecmisAcik = false;
const _inAcikKartlar = new Set();

function _inSecenekler(liste, secili) {
  return '<option value="">—</option>' + liste.map(s => `<option value="${s.deger}" ${String(secili) === String(s.deger) ? 'selected' : ''}>${_inK(s.etiket)}</option>`).join('');
}

function _inOlcekler(yontem) {
  return yontem === '5x5'
    ? { O: MATRIS_OLASILIK_SECENEKLERI, F: null, S: MATRIS_SIDDET_SECENEKLERI }
    : { O: OLASILIK_SECENEKLERI, F: FREKANS_SECENEKLERI, S: SIDDET_SECENEKLERI };
}

function _inPuanHtml(o, f, s, yontem) {
  const tamam = yontem === '5x5' ? (o && s) : (o && f && s);
  if (!tamam) return '<span class="in-bilgi">Puan için değerleri seçin</span>';
  const rp = riskPuaniHesapla(o, f, s, yontem);
  const d = riskDuzeyiGetir(rp, yontem);
  return `<b>${rp}</b> <span class="duzey-rozet duzey-${slugOlustur(d.etiket)}">${_inK(d.etiket)}</span>`;
}

function _inKartHtml(r) {
  const z = _riskiZenginlestir(r);
  const onayli = riskOnayliMi(r);
  const acik = _inAcikKartlar.has(r.id) || !onayli;
  const olc = _inOlcekler(z.yontem);
  const alan = (ad, etiket, deger, satir) => `<label class="in-alan"><span>${etiket}</span>${satir
    ? `<textarea rows="${satir}" data-in-alan="${ad}">${_inK(deger)}</textarea>`
    : `<input type="text" data-in-alan="${ad}" value="${_inK(deger)}">`}</label>`;
  const secim = (ad, etiket, liste, deger) => liste ? `<label class="in-alan"><span>${etiket}</span><select data-in-alan="${ad}">${_inSecenekler(liste, deger)}</select></label>` : '';
  const ust = `
    <div class="in-kart-bas" data-in-ac="${r.id}">
      <div>
        <div class="in-baslik">${_inK(z.riskNo)} <span class="duzey-rozet duzey-${slugOlustur(z.duzey1)}">${_inK(z.duzey1)}</span> <span class="in-rp">RP1 ${z.RP1}</span></div>
        <div class="in-bilgi">${_inK(z.bolum)}${riskBolumGoruntu(z) && riskBolumGoruntu(z) !== z.bolum ? ' · ' + _inK(riskBolumGoruntu(z)) : ''} · ${_inK(z.yer)}</div>
        ${acik ? '' : `<div class="in-ozet">${_inK(z.tehlike)}</div>`}
      </div>
      <div>${onayli
        ? `<span class="genel-rozet rozet-uygun">✓ Onaylı · ${_inK(gunAyYil(r.inceleme.tarih))}${r.inceleme.kullanici ? ' · ' + _inK(r.inceleme.kullanici) : ''}</span>`
        : '<span class="genel-rozet rozet-acik">İncelenecek</span>'}</div>
    </div>`;
  if (!acik) return `<div class="in-kart onayli" id="inKart_${r.id}">${ust}</div>`;
  return `<div class="in-kart${onayli ? ' onayli' : ''}" id="inKart_${r.id}" data-in-kart="${r.id}">
    ${ust}
    <div class="in-govde">
      <div class="in-izgara">
        ${alan('yer', 'Yer / Ekipman', z.yer)}
        ${alan('faaliyet', 'Faaliyet', z.faaliyet)}
      </div>
      ${alan('tehlike', 'Tehlike', z.tehlike, 2)}
      ${alan('risk', 'Risk', z.risk, 2)}
      ${alan('onlem', 'Mevcut (Alınmış) Önlemler', z.onlem, 2)}
      <div class="in-bolum-baslik">Mevcut durum puanı — <span data-in-puan="1">${_inPuanHtml(z.O, z.F, z.S, z.yontem)}</span></div>
      <div class="in-izgara in-uclu">
        ${secim('O', 'Olasılık', olc.O, z.O)}${secim('F', 'Frekans', olc.F, z.F)}${secim('S', 'Şiddet', olc.S, z.S)}
      </div>
      ${alan('planlanan', 'Alınacak Önlem / Planlanan Faaliyet', z.planlanan, 2)}
      <div class="in-bolum-baslik">Önlem sonrası puan — <span data-in-puan="2">${_inPuanHtml(z.On, z.Fn, z.Sn, z.yontem)}</span></div>
      <div class="in-izgara in-uclu">
        ${secim('On', 'Olasılık', olc.O, z.On)}${secim('Fn', 'Frekans', olc.F, z.Fn)}${secim('Sn', 'Şiddet', olc.S, z.Sn)}
      </div>
      <label class="in-alan"><span>Sorumlu <span style="font-weight:400;">(yazın ya da aşağıdan bölüm seçin; birden çok seçilebilir)</span></span><input type="text" id="inSorumlu_${r.id}" data-in-alan="sorumlu" value="${_inK(z.sorumlu)}"><div id="inSorumluBtn_${r.id}" class="in-sorumlu-btn"></div></label>
      <div class="in-izgara">
        <label class="in-alan"><span>Termin</span>
          <select data-in-termin="tur">${riskTerminSecenekleriHtml(z.termin)}</select>
          <input type="date" data-in-termin="tarih" value="${_inK(riskTerminTarihMi(z.termin) ? z.termin : '')}" style="margin-top:4px;${riskTerminTuru(z.termin) === 'tarih' ? '' : ' display:none;'}">
          <input type="text" data-in-termin="metin" placeholder="ör. Her bakım öncesi" value="${_inK(riskTerminTuru(z.termin) === 'diger' ? z.termin : '')}" style="margin-top:4px;${riskTerminTuru(z.termin) === 'diger' ? '' : ' display:none;'}">
        </label>
        <label class="in-alan"><span>Durum</span><select data-in-alan="durum">${RISK_DURUMLARI.filter(d => d !== 'Gecikmiş').map(d => `<option ${z.durum === d ? 'selected' : ''}>${d}</option>`).join('')}</select></label>
      </div>
      ${z.fotoOncesi || z.fotoSonrasi ? `<div class="in-fotolar">${z.fotoOncesi ? `<img data-foto-ref="${_inK(z.fotoOncesi)}" alt="Öncesi" title="Öncesi">` : ''}${z.fotoSonrasi ? `<img data-foto-ref="${_inK(z.fotoSonrasi)}" alt="Sonrası" title="Sonrası">` : ''}</div>` : ''}
      <div class="in-hata" data-in-hata="1"></div>
      <div class="in-eylemler">
        ${onayli
          ? `<button type="button" class="ikincil" data-in-kaydet="${r.id}">💾 Değişiklikleri Kaydet</button><button type="button" class="ikincil" data-in-geri="${r.id}">↺ Onayı Geri Al</button>`
          : `<button type="button" class="birincil" data-in-onayla="${r.id}">✓ Kaydet ve Onayla</button><button type="button" class="ikincil" data-in-kaydet="${r.id}">💾 Sadece Kaydet</button><button type="button" class="ikincil" data-in-atla="${r.id}" title="Bugünün listesinden çıkar, yerine sıradakini getir">Atla</button>`}
        <button type="button" class="tablo-buton" data-in-form="${r.id}" title="Fotoğraf, harita ve tüm alanlar için tam formu açar">Tam formda aç</button>
        <button type="button" class="tablo-buton sil" data-in-sil="${r.id}" title="Bu risk kaydını tamamen siler; yerine sıradaki risk gelir" style="margin-left:auto;">🗑 Riski Sil</button>
      </div>
    </div>
  </div>`;
}

function riskIncelemeCiz() {
  const kutu = document.getElementById('incelemeBolumu');
  if (!kutu) return;
  const kayit = riskGunlukListeGetir();
  const ist = riskIncelemeIstatistik();
  const riskler = kayit.idler.map(id => riskIdIleGetirRepo(id)).filter(Boolean);
  const kalan = riskler.filter(r => !riskOnayliMi(r)).length;
  const yuzde = (a, b) => b ? Math.round(a * 100 / b) : 0;
  const gecmis = _inGecmisAcik ? riskTumunuGetir().filter(r => riskYili(r) === ist.yil && riskOnayliMi(r))
    .sort((a, b) => (b.inceleme.zaman || b.inceleme.tarih || '').localeCompare(a.inceleme.zaman || a.inceleme.tarih || '')) : [];

  kutu.innerHTML = `
    <div class="in-ust">
      <div class="in-ilerleme">
        <div class="in-ilerleme-baslik"><b>Bugün (${_inK(gunAyYil(_inBugun()))})</b><span>${ist.bugunOnayli} / ${ist.bugunToplam} onaylandı</span></div>
        <div class="in-cubuk"><div style="width:${yuzde(ist.bugunOnayli, ist.bugunToplam)}%"></div></div>
      </div>
      <div class="in-ilerleme">
        <div class="in-ilerleme-baslik"><b>${ist.yil} değerlendirmesi</b><span>${ist.onayli} / ${ist.toplam} risk onaylı (%${yuzde(ist.onayli, ist.toplam)})</span></div>
        <div class="in-cubuk yesil"><div style="width:${yuzde(ist.onayli, ist.toplam)}%"></div></div>
      </div>
      <div class="in-ust-eylemler">
        <button type="button" class="ikincil" id="inDahaBtn" ${ist.onayli + kalan >= ist.toplam ? 'disabled' : ''}>+ ${RISK_GUNLUK_HEDEF} risk daha</button>
        <button type="button" class="ikincil" id="inGecmisBtn">${_inGecmisAcik ? 'Günün listesine dön' : `📋 İncelenenler (${ist.onayli})`}</button>
      </div>
    </div>
    <p class="in-bilgi" style="margin:6px 0 12px;">Her gün ${ist.yil} yılının henüz onaylanmamış risklerinden ${RISK_GUNLUK_HEDEF} tanesi en yüksek risk düzeyinden başlayarak listelenir. Alanları düzenleyip <b>Kaydet ve Onayla</b>'ya basın; onaylanan risk kayıtlarda "✓ Onaylı" görünür.</p>
    ${_inGecmisAcik ? _inGecmisHtml(gecmis) : (riskler.length
      ? (kalan ? '' : `<div class="in-tamam">🎉 Bugünün ${riskler.length} riski onaylandı.${ist.onayli < ist.toplam ? ' İsterseniz "+10 risk daha" ile devam edebilirsiniz.' : ' Bu yılın tüm riskleri onaylı.'}</div>`) + riskler.map(_inKartHtml).join('')
      : `<div class="in-tamam">${ist.toplam ? `${ist.yil} yılının tüm riskleri onaylı.` : `${ist.yil} yılında henüz risk kaydı yok.`}</div>`)}`;

  if (typeof fotoReferanslariCoz === 'function') fotoReferanslariCoz(kutu);
  // Sorumlu: Uygunsuzluk'taki gibi firma bölümlerinden hızlı seçim (core/bolum-butonlari.js).
  if (typeof bolumButonlariCiz === 'function') {
    riskler.forEach(r => { if (document.getElementById('inSorumluBtn_' + r.id)) bolumButonlariCiz('inSorumluBtn_' + r.id, 'inSorumlu_' + r.id, 'tekli'); });
  }
  _riskIncelemeSekmeEtiketi();
}

function _inGecmisHtml(liste) {
  if (!liste.length) return '<div class="in-tamam">Henüz onaylanmış risk yok.</div>';
  const gunler = {};
  liste.forEach(r => { (gunler[r.inceleme.tarih] = gunler[r.inceleme.tarih] || []).push(r); });
  return Object.keys(gunler).sort().reverse().map(g => `
    <div class="in-gun-baslik">${_inK(gunAyYil(g))} — ${gunler[g].length} risk</div>
    <div class="tablo-scroll"><table class="veri-tablosu">
      <thead><tr><th>Risk No</th><th>Konu</th><th>Tehlike</th><th>Düzey</th><th>Onaylayan</th><th></th></tr></thead>
      <tbody>${gunler[g].map(r => { const z = _riskiZenginlestir(r); return `<tr>
        <td>${_inK(z.riskNo)}</td><td>${_inK(z.bolum)}</td><td>${_inK(z.tehlike)}</td>
        <td><span class="duzey-rozet duzey-${slugOlustur(z.duzey1)}">${_inK(z.duzey1)}</span></td>
        <td>${_inK(r.inceleme.kullanici || '-')}</td>
        <td><button class="tablo-buton" data-in-form="${r.id}">Aç</button> <button class="tablo-buton" data-in-geri="${r.id}">Onayı geri al</button></td>
      </tr>`; }).join('')}</tbody>
    </table></div>`).join('');
}

function _inKarttanVeri(kart) {
  const v = {};
  kart.querySelectorAll('[data-in-alan]').forEach(el => { v[el.getAttribute('data-in-alan')] = el.value; });
  const t = ad => { const el = kart.querySelector(`[data-in-termin="${ad}"]`); return el ? el.value : ''; };
  v.termin = riskTerminBirlestir(t('tur'), t('tarih'), t('metin'));
  return v;
}

function _inKaydet(id, onayla) {
  const kart = document.getElementById('inKart_' + id);
  const mevcut = riskIdIleGetirRepo(id);
  if (!kart || !mevcut) return;
  const veri = Object.assign({}, mevcut, _inKarttanVeri(kart));
  const sonuc = riskGuncelle(id, veri);
  const hataKutu = kart.querySelector('[data-in-hata]');
  if (!sonuc.basarili) {
    hataKutu.textContent = 'Eksik alanlar: ' + Object.values(sonuc.hatalar).join(' ');
    return;
  }
  if (onayla) { riskOnayla(id); _inAcikKartlar.delete(id); }
  if (typeof _bolumFiltreDoldur === 'function') _bolumFiltreDoldur();
  riskIncelemeCiz();
  if (!onayla) { const yeni = document.getElementById('inKart_' + id); if (yeni) { const h = yeni.querySelector('[data-in-hata]'); if (h) { h.style.color = 'var(--basari)'; h.textContent = '✓ Kaydedildi'; } } }
}

function _riskIncelemeSekmeEtiketi() {
  const btn = document.getElementById('sekmeInceleme');
  if (!btn) return;
  const kayit = riskGunlukListeGetir();
  const kalan = kayit.idler.map(id => riskIdIleGetirRepo(id)).filter(r => r && !riskOnayliMi(r)).length;
  btn.innerHTML = `Günlük İnceleme ${kalan ? `<span class="in-sayac">${kalan}</span>` : '✓'}`;
  const afis = document.getElementById('incelemeAfisi');
  if (afis) {
    afis.style.display = kalan && _riskGorunum !== 'inceleme' ? '' : 'none';
    afis.querySelector('[data-in-afis-metin]').textContent = `Bugün incelemeniz gereken ${kalan} risk var (${kayit.yil}).`;
  }
}

function riskIncelemeBaslat() {
  const kutu = document.getElementById('incelemeBolumu');
  kutu.addEventListener('click', async e => {
    const b = e.target.closest('button');
    const bas = e.target.closest('[data-in-ac]');
    if (!b && bas) {
      const id = bas.getAttribute('data-in-ac');
      const r = riskIdIleGetirRepo(id);
      if (r && riskOnayliMi(r)) { if (_inAcikKartlar.has(id)) _inAcikKartlar.delete(id); else _inAcikKartlar.add(id); riskIncelemeCiz(); }
      return;
    }
    if (!b) return;
    if (b.id === 'inDahaBtn') { const n = riskGunlukListeyeEkle(RISK_GUNLUK_HEDEF); if (!n) alert('Onaylanmamış başka risk kalmadı.'); riskIncelemeCiz(); return; }
    if (b.id === 'inGecmisBtn') { _inGecmisAcik = !_inGecmisAcik; riskIncelemeCiz(); return; }
    const id = b.getAttribute('data-in-onayla') || b.getAttribute('data-in-kaydet') || b.getAttribute('data-in-atla') || b.getAttribute('data-in-geri') || b.getAttribute('data-in-form') || b.getAttribute('data-in-sil');
    if (!id) return;
    if (b.hasAttribute('data-in-sil')) {
      const r = riskIdIleGetirRepo(id);
      if (!r || !(await onayModali(`${r.riskNo || 'Bu'} risk kaydı tamamen silinsin mi? (${(r.tehlike || '').slice(0, 80)})`, 'Sil'))) return;
      const s = riskGunlukSil(id);
      if (!s.basarili) { alert(s.hata || 'Silinemedi.'); return; }
      _inAcikKartlar.delete(id);
      if (typeof _bolumFiltreDoldur === 'function') _bolumFiltreDoldur();
      riskIncelemeCiz();
      return;
    }
    if (b.hasAttribute('data-in-onayla')) _inKaydet(id, true);
    else if (b.hasAttribute('data-in-kaydet')) _inKaydet(id, false);
    else if (b.hasAttribute('data-in-atla')) { if (!riskGunlukAtla(id)) alert('Yerine getirilecek başka onaylanmamış risk yok.'); riskIncelemeCiz(); }
    else if (b.hasAttribute('data-in-geri')) {
      if (await onayModali('Bu riskin onayı geri alınsın mı? Risk tekrar incelenecekler arasına girer.', 'Geri Al')) { riskOnayiGeriAl(id); riskIncelemeCiz(); }
    } else if (b.hasAttribute('data-in-form')) {
      const r = riskIdIleGetirRepo(id);
      if (r) modalAc(r);
    }
  });
  kutu.addEventListener('change', e => {
    const el = e.target;
    if (el.getAttribute && el.getAttribute('data-in-termin') === 'tur') {
      const kap = el.closest('label');
      kap.querySelector('[data-in-termin="tarih"]').style.display = el.value === 'tarih' ? '' : 'none';
      kap.querySelector('[data-in-termin="metin"]').style.display = el.value === 'diger' ? '' : 'none';
      return;
    }
    const ad = el.getAttribute && el.getAttribute('data-in-alan');
    if (!['O', 'F', 'S', 'On', 'Fn', 'Sn'].includes(ad)) return;
    const kart = el.closest('[data-in-kart]');
    const r = riskIdIleGetirRepo(kart.getAttribute('data-in-kart'));
    const v = _inKarttanVeri(kart);
    const yontem = r && r.yontem === '5x5' ? '5x5' : 'Fine-Kinney';
    kart.querySelector('[data-in-puan="1"]').innerHTML = _inPuanHtml(v.O, v.F, v.S, yontem);
    kart.querySelector('[data-in-puan="2"]').innerHTML = _inPuanHtml(v.On, v.Fn, v.Sn, yontem);
  });
  document.getElementById('sekmeInceleme').addEventListener('click', () => gorunumDegistir('inceleme'));
  document.getElementById('incelemeAfisBtn').addEventListener('click', () => gorunumDegistir('inceleme'));
  _riskIncelemeSekmeEtiketi();
}
