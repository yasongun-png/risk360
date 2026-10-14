// ÇSGB Denetimi sayfasının (csgb.html) DOM işlemleri: denetim listesi,
// denetim detayı (maddeler + takip toplantıları), madde / denetim / toplantı
// pencereleri. Çıktılar csgb-cikti.js'te.

let _csgbAcikDenetimId = null;
let _csgbDuzenlenenId = null;
let _csgbDuzenlenenMaddeId = null;
let _csgbToplantiId = null;
let _csgbMaddeFiltre = 'hepsi';
let _csgbMaddeArama = '';
const _csgbAcikMetinler = new Set();
let _csgbKanitlar = [];
// Toplantı penceresinde girilen ama henüz kaydedilmemiş değerler
// ("tamamlananları da göster" ile liste yeniden çizilince kaybolmasın).
let _csgbTopTaslakNot = {};
let _csgbTopTaslakDurum = {};
let _csgbTopTaslakYuzde = {};

function _csgbRozetSinifi(durum) {
  return typeof slugOlustur === 'function' ? slugOlustur(durum || '') : '';
}

function _csgbKalanGunRozeti(d) {
  if (d.durum === 'Kapandı') return '<span class="genel-rozet rozet-kapali">Kapandı</span>';
  if (d.kalanGun === null || d.kalanGun === undefined) return '<span style="font-size:12px; color:var(--metin-soluk);">Son giderme tarihi girilmedi</span>';
  if (d.kalanGun < 0) return `<span class="durum-rozet durum-gecmis">${-d.kalanGun} gün geçti</span>`;
  if (d.kalanGun <= 15) return `<span class="durum-rozet durum-yaklasiyor">${d.kalanGun} gün kaldı</span>`;
  return `<span class="durum-rozet durum-gecerli">${d.kalanGun} gün kaldı</span>`;
}

function _csgbIlerlemeCubugu(yuzde, yukseklik) {
  return `<div style="height:${yukseklik || 6}px; background:#e5e7eb; border-radius:4px; overflow:hidden;"><div style="height:100%; width:${yuzde}%; background:#16a34a;"></div></div>`;
}

function csgbSayfasiniBaslat() {
  document.getElementById('csgbYeniBtn').addEventListener('click', () => csgbDenetimModalAc(null));
  document.getElementById('csgbKapatBtn').addEventListener('click', csgbDenetimModalKapat);
  document.getElementById('csgbIptalBtn').addEventListener('click', csgbDenetimModalKapat);
  document.getElementById('csgbKaydetBtn').addEventListener('click', _csgbDenetimKaydetTiklandi);
  const sonGidermeyiHesapla = () => {
    const hesap = csgbSonGidermeTarihiHesapla(document.getElementById('csgbTebligTarihi').value, document.getElementById('csgbVerilenSure').value);
    if (hesap) document.getElementById('csgbSonGiderme').value = hesap;
  };
  document.getElementById('csgbTebligTarihi').addEventListener('change', sonGidermeyiHesapla);
  document.getElementById('csgbVerilenSure').addEventListener('input', sonGidermeyiHesapla);

  document.getElementById('csgbTopKapatBtn').addEventListener('click', csgbToplantiModalKapat);
  document.getElementById('csgbTopIptalBtn').addEventListener('click', csgbToplantiModalKapat);
  document.getElementById('csgbTopKaydetBtn').addEventListener('click', _csgbToplantiKaydetTiklandi);
  document.getElementById('csgbTopKapalilariGoster').addEventListener('change', () => { _csgbTopTaslagiTopla(); _csgbTopMaddeleriCiz(); });
  document.getElementById('csgbTopKatilimciEkleBtn').addEventListener('click', () => {
    _csgbKatilimcilariCiz(_csgbKatilimcilariTopla(true).concat([{ adSoyad: '', gorev: '', eposta: '' }]));
    const girdiler = document.querySelectorAll('#csgbTopKatilimciGovde [data-kat-ad]');
    girdiler[girdiler.length - 1].focus();
  });
  // Outlook alıcı listesini yapıştır: aynı e-postalı / aynı adlı kişi tekrar eklenmez.
  document.getElementById('csgbTopKatilimciYapistirBtn').addEventListener('click', async () => {
    const metin = await metinIstemModali('Outlook\'tan kopyaladığınız alıcı listesini yapıştırın (ör. Ad Soyad <ad@firma.com>; ...):', '', '');
    if (metin === null || !metin.trim()) return;
    const mevcut = _csgbKatilimcilariTopla();
    const anahtar = k => (k.eposta || k.adSoyad).toLocaleLowerCase('tr');
    const varolan = new Set(mevcut.map(anahtar));
    const yeniler = csgbKatilimciMetniCoz(metin).filter(k => !varolan.has(anahtar(k)) && varolan.add(anahtar(k)));
    _csgbKatilimcilariCiz(mevcut.concat(yeniler));
    alert(`${yeniler.length} katılımcı eklendi. Görevlerini tabloya yazabilirsiniz.`);
  });

  document.getElementById('mdKapatBtn').addEventListener('click', csgbMaddeModalKapat);
  document.getElementById('mdIptalBtn').addEventListener('click', csgbMaddeModalKapat);
  document.getElementById('mdKaydetBtn').addEventListener('click', _csgbMaddeKaydetTiklandi);
  document.getElementById('mdSilBtn').addEventListener('click', _csgbMaddeSilTiklandi);
  document.getElementById('mdBolBtn').addEventListener('click', () => { if (_csgbDuzenlenenMaddeId) csgbBolModalAc(_csgbDuzenlenenMaddeId); });
  document.getElementById('bolKapatBtn').addEventListener('click', csgbBolModalKapat);
  document.getElementById('bolIptalBtn').addEventListener('click', csgbBolModalKapat);
  document.getElementById('bolKaydetBtn').addEventListener('click', _csgbBolKaydetTiklandi);
  document.getElementById('bolSatirEkleBtn').addEventListener('click', () => _csgbBolSatirlariCiz(_csgbBolSatirlariTopla().concat([{ bolum: '', sorumlu: '', termin: '' }])));
  document.getElementById('mdDurum').addEventListener('change', e => {
    if (e.target.value === 'Kapalı') document.getElementById('mdYuzde').value = '100';
  });
  document.getElementById('mdKanitDosyaSecBtn').addEventListener('click', () => document.getElementById('mdKanitDosya').click());
  document.getElementById('mdKanitFotoCekBtn').addEventListener('click', () => document.getElementById('mdKanitFotoCekDosya').click());
  ['mdKanitDosya', 'mdKanitFotoCekDosya'].forEach(id => document.getElementById(id).addEventListener('change', async e => {
    const dosyalar = Array.from(e.target.files || []);
    e.target.value = '';
    if (!dosyalar.length) return;
    document.getElementById('mdKanitListesi').insertAdjacentHTML('afterbegin', '<div style="font-size:12px; color:var(--metin-soluk);">Yükleniyor...</div>');
    await _csgbKanitDosyalariEkle(dosyalar);
  }));

  document.getElementById('csgbIceAktarDosya').addEventListener('change', _csgbExcelDosyasiSecildi);

  // Uygunsuzluk sayfasından ?ac=<denetimId> ile doğrudan bir denetim açılabilir.
  const ac = new URLSearchParams(location.search).get('ac');
  if (ac && csgbDenetimleriTumunuGetir().some(d => d.id === ac)) _csgbAcikDenetimId = ac;
  csgbCiz();
  _csgbEskiSurumTasimasiniSor();
}

// İlk sürümde Uygunsuzluk kayıtlarına yazılmış maddeleri bu sayfaya taşır (bkz. csgb-service.js).
async function _csgbEskiSurumTasimasiniSor() {
  for (const x of csgbEskiSurumKayitlariniBul()) {
    const ad = x.konu ? x.konu.ad : csgbDenetimBasligi(x.denetim);
    const mesaj = `"${ad}" denetiminin ${x.kayitlar.length} maddesi önceki sürümde Uygunsuzluk kayıtlarına ("${ad}" konusu) yazılmış. ` +
      `Bu maddeler (numaraları, toplantı notları ve kanıtlarıyla) ÇSGB Denetimi sayfasına taşınsın ve Uygunsuzluk'tan kaldırılsın mı?`;
    if (!(await onayModali(mesaj, 'Evet, Taşı'))) continue;
    const sonuc = await csgbEskiSurumKayitlariniTasi(x.denetim.id);
    alert(sonuc.basarili ? `${sonuc.tasinan} madde ÇSGB Denetimi sayfasına taşındı.` : sonuc.hata);
    csgbCiz();
  }
  await _csgbUygunsuzluktanGelenMukerrerleriSor();
}

// Uygunsuzluk'tan taşınan ve ÇSGB'de eşi olan maddeleri silmeyi önerir (bkz. csgb-service.js).
async function _csgbUygunsuzluktanGelenMukerrerleriSor() {
  const { silinecekler, esiOlmayan } = csgbUygunsuzluktanGelenMukerrerleriBul();
  if (!silinecekler.length) return;
  const mesaj = `${silinecekler.length} madde iki kez görünüyor: Uygunsuzluk'tan taşınan kopya ve ÇSGB sayfasında girilen madde. ` +
    `Uygunsuzluk'tan gelen ${silinecekler.length} kopya silinsin mi? ÇSGB'de girilen maddeler aynen kalır.` +
    (esiOlmayan ? ` (Uygunsuzluk'tan gelen ama ÇSGB'de eşi olmayan ${esiOlmayan} madde silinmez.)` : '');
  if (!(await onayModali(mesaj, 'Evet, Sil'))) return;
  const sonuc = await csgbUygunsuzluktanGelenMukerrerleriSil();
  alert(sonuc.basarili ? `Uygunsuzluk'tan gelen ${sonuc.silinen} kopya silindi.` : sonuc.hata);
  csgbCiz();
}

function csgbCiz() {
  const kutu = document.getElementById('csgbKutusu');
  if (_csgbAcikDenetimId && csgbDenetimGetir(_csgbAcikDenetimId)) _csgbDetayCiz(kutu);
  else { _csgbAcikDenetimId = null; _csgbListeCiz(kutu); }
}

// ==================== DENETİM LİSTESİ ====================

function _csgbListeCiz(kutu) {
  document.getElementById('csgbYeniBtn').style.display = '';
  const denetimler = csgbDenetimleriniGetir();
  if (!denetimler.length) {
    kutu.innerHTML = '<div class="bos-durum gorunur">Henüz ÇSGB denetimi eklenmedi. "+ Yeni ÇSGB Denetimi" ile başlayın.</div>';
    return;
  }
  const K = _csgbKacir;
  kutu.innerHTML = `<div class="modul-grid" style="grid-template-columns: repeat(auto-fill, minmax(340px,1fr));">${denetimler.map(d => `
    <div class="kart" style="display:flex; flex-direction:column; gap:8px;">
      <div style="display:flex; justify-content:space-between; gap:8px; align-items:flex-start;">
        <div>
          <div style="font-weight:700; font-size:15px;">${K(d.baslikGoruntu)}</div>
          <div style="font-size:12px; color:var(--metin-soluk);">${K(d.denetimTuru)}${d.raporNo ? ' · Rapor No: ' + K(d.raporNo) : ''}</div>
        </div>
        <span class="genel-rozet">${K(d.durum)}</span>
      </div>
      <div style="font-size:12px; line-height:1.6;">
        ${d.raporTarihi ? 'Rapor Tarihi: <b>' + gunAyYil(d.raporTarihi) + '</b><br>' : ''}
        ${d.sonGidermeTarihi ? 'Son Giderme: <b>' + gunAyYil(d.sonGidermeTarihi) + '</b> ' : ''}${_csgbKalanGunRozeti(d)}
        ${d.mufettisler ? '<br>Müfettiş: ' + K(d.mufettisler) : ''}
      </div>
      <div>
        <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:3px;"><span>${d.kapaliSayisi} / ${d.kapaliSayisi + d.acikSayisi} madde tamamlandı</span><b>İlerleme %${d.ilerlemeYuzde}</b></div>
        ${_csgbIlerlemeCubugu(d.ilerlemeYuzde, 8)}
      </div>
      <div style="font-size:12px; color:var(--metin-soluk);">
        Açık: <b>${d.acikSayisi}</b> · Gecikmiş: <b style="color:${d.gecikmisSayisi ? '#b91c1c' : 'inherit'};">${d.gecikmisSayisi}</b> · Toplantı: <b>${d.toplantiSayisi}</b>${d.sonrakiToplantiTarihi ? ' · Sonraki toplantı: <b>' + gunAyYil(d.sonrakiToplantiTarihi) + '</b>' : ''}
      </div>
      <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:auto;">
        <button type="button" class="birincil" style="width:auto;" data-csgb-ac="${d.id}">Aç</button>
        <button type="button" class="ikincil" data-csgb-duzenle="${d.id}">Düzenle</button>
        <button type="button" class="ikincil" style="color:#b91c1c;" data-csgb-sil="${d.id}">Sil</button>
      </div>
    </div>`).join('')}</div>`;

  kutu.querySelectorAll('[data-csgb-ac]').forEach(b => b.addEventListener('click', () => { _csgbAcikDenetimId = b.getAttribute('data-csgb-ac'); _csgbMaddeFiltre = 'hepsi'; _csgbMaddeArama = ''; csgbCiz(); window.scrollTo(0, 0); }));
  kutu.querySelectorAll('[data-csgb-duzenle]').forEach(b => b.addEventListener('click', () => csgbDenetimModalAc(b.getAttribute('data-csgb-duzenle'))));
  kutu.querySelectorAll('[data-csgb-sil]').forEach(b => b.addEventListener('click', () => _csgbDenetimSilTiklandi(b.getAttribute('data-csgb-sil'))));
}

// Uygunsuzluk'taki "Konuyu Sil" gibi iki aşamalı: uyarı + rapor no / ad yazma.
async function _csgbDenetimSilTiklandi(id) {
  const d = csgbDenetimGetir(id);
  if (!d) return;
  if (!(await onayModali(`DİKKAT! "${d.baslikGoruntu}" denetimi, ${d.maddeSayisi} maddesi (kanıtlar ve notlar dahil) ve ${d.toplantiSayisi} takip toplantısı KALICI olarak silinecek. Bu işlem GERİ ALINAMAZ. Emin misiniz?`, 'Evet, Sil'))) return;
  const yazilan = await metinIstemModali('Son onay: silmek için "SİL" yazın', '', '');
  if (yazilan === null) return;
  if (yazilan.trim().toLocaleUpperCase('tr') !== 'SİL') { alert('Onay metni eşleşmedi, silme iptal edildi.'); return; }
  const sonuc = csgbDenetimSil(id);
  if (!sonuc.basarili) { alert(sonuc.hata); return; }
  if (_csgbAcikDenetimId === id) _csgbAcikDenetimId = null;
  csgbCiz();
}

// ==================== DENETİM FORMU ====================

function csgbDenetimModalAc(id) {
  _csgbDuzenlenenId = id;
  const d = id ? csgbDenetimleriTumunuGetir().find(x => x.id === id) : null;
  document.getElementById('csgbModalBaslik').textContent = d ? 'ÇSGB Denetimini Düzenle' : 'Yeni ÇSGB Denetimi';
  document.getElementById('csgbDenetimTuru').innerHTML = CSGB_DENETIM_TURLERI.map(t => `<option ${d && d.denetimTuru === t ? 'selected' : ''}>${t}</option>`).join('');
  document.getElementById('csgbDurum').innerHTML = CSGB_DENETIM_DURUMLARI.map(t => `<option ${d && d.durum === t ? 'selected' : ''}>${t}</option>`).join('');
  document.getElementById('csgbAd').value = d ? d.ad : '';
  document.getElementById('csgbRaporNo').value = d ? d.raporNo : '';
  document.getElementById('csgbRaporTarihi').value = d ? d.raporTarihi : '';
  document.getElementById('csgbDenetimTarihi').value = d ? d.denetimTarihi : '';
  document.getElementById('csgbMufettisler').value = d ? d.mufettisler : '';
  document.getElementById('csgbTebligTarihi').value = d ? d.tebligTarihi : '';
  document.getElementById('csgbVerilenSure').value = d && d.verilenSureGun !== '' ? d.verilenSureGun : '';
  document.getElementById('csgbSonGiderme').value = d ? d.sonGidermeTarihi : '';
  document.getElementById('csgbBildirimTarihi').value = d ? d.bildirimTarihi : '';
  document.getElementById('csgbNotlar').value = d ? d.notlar : '';
  document.getElementById('csgbHata').textContent = '';
  document.getElementById('csgbKatmani').classList.add('acik');
}

function csgbDenetimModalKapat() {
  document.getElementById('csgbKatmani').classList.remove('acik');
  _csgbDuzenlenenId = null;
}

function _csgbDenetimKaydetTiklandi() {
  const sonuc = csgbDenetimKaydet({
    ad: document.getElementById('csgbAd').value,
    raporNo: document.getElementById('csgbRaporNo').value,
    raporTarihi: document.getElementById('csgbRaporTarihi').value,
    denetimTarihi: document.getElementById('csgbDenetimTarihi').value,
    denetimTuru: document.getElementById('csgbDenetimTuru').value,
    mufettisler: document.getElementById('csgbMufettisler').value,
    tebligTarihi: document.getElementById('csgbTebligTarihi').value,
    verilenSureGun: document.getElementById('csgbVerilenSure').value,
    sonGidermeTarihi: document.getElementById('csgbSonGiderme').value,
    bildirimTarihi: document.getElementById('csgbBildirimTarihi').value,
    durum: document.getElementById('csgbDurum').value,
    notlar: document.getElementById('csgbNotlar').value
  }, _csgbDuzenlenenId);
  if (!sonuc.basarili) { document.getElementById('csgbHata').textContent = sonuc.hata; return; }
  csgbDenetimModalKapat();
  _csgbAcikDenetimId = sonuc.denetim.id;
  csgbCiz();
}

// ==================== DENETİM DETAYI ====================

function _csgbMetinHucresi(k) {
  const K = _csgbKacir;
  const acik = _csgbAcikMetinler.has(k.id);
  const ek = [];
  if (k.aciklama) ek.push(`<div style="margin-top:6px; white-space:pre-wrap;">${K(k.aciklama)}</div>`);
  if (k.duzelticiFaaliyet) ek.push(`<div style="margin-top:6px; white-space:pre-wrap;"><b>Gerekli tedbir:</b> ${K(k.duzelticiFaaliyet)}</div>`);
  if (k.yasalDayanak) ek.push(`<div style="margin-top:6px; color:var(--metin-soluk);"><b>Mevzuat:</b> ${K(k.yasalDayanak)}</div>`);
  return `
    <div class="${acik ? '' : 'csgb-kisalt'}" style="white-space:pre-wrap;">${K(k.baslik)}</div>
    ${acik ? ek.join('') : ''}
    <a href="#" data-csgb-metin="${k.id}" style="font-size:11.5px;">${acik ? '▲ Kısalt' : '▼ Tam metin' + (ek.length ? ' / tedbir / mevzuat' : '')}</a>`;
}

function _csgbNotlarHucresi(k) {
  if (!k.toplantiNotlari.length) return '<span style="color:var(--metin-soluk);">-</span>';
  return k.toplantiNotlari.map(n => `<div style="margin-bottom:5px;"><b>${gunAyYil(n.tarih)}:</b> ${_csgbKacir(n.not)}</div>`).join('');
}

function _csgbKanitHucresi(k) {
  if (!k.kanitlar.length) return '<span style="color:var(--metin-soluk);">-</span>';
  return k.kanitlar.map((x, i) => `<a href="#" data-csgb-kanit="${k.id}|${i}" title="${_csgbKacir(x.ad)}" style="display:block; font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${x.tur === 'foto' ? '🖼️' : '📄'} ${_csgbKacir(x.ad)}</a>`).join('');
}

function _csgbButonIsle(id, metin, fn) {
  const btn = document.getElementById(id);
  btn.addEventListener('click', async () => {
    const eski = btn.textContent;
    btn.disabled = true; btn.textContent = metin;
    try { await fn(); } catch (hata) { console.error(hata); alert('İşlem tamamlanamadı: ' + (hata.message || hata)); }
    finally { btn.disabled = false; btn.textContent = eski; }
  });
}

function _csgbDetayCiz(kutu) {
  const K = _csgbKacir;
  document.getElementById('csgbYeniBtn').style.display = 'none';
  const d = csgbDenetimGetir(_csgbAcikDenetimId);
  const tumMaddeler = csgbMaddeleriniGetir(d.id);
  let maddeler = tumMaddeler;
  if (_csgbMaddeFiltre === 'acik') maddeler = maddeler.filter(k => k.durum !== 'Kapalı' && k.durum !== 'İptal');
  else if (_csgbMaddeFiltre === 'tamamlanan') maddeler = maddeler.filter(k => k.durum === 'Kapalı');
  else if (_csgbMaddeFiltre === 'gecikmis') maddeler = maddeler.filter(k => k.durumGoruntu === 'Gecikmiş');
  if (_csgbMaddeArama.trim()) {
    const a = _csgbMaddeArama.trim().toLocaleLowerCase('tr');
    maddeler = maddeler.filter(k => [k.denetimMaddeNo, k.maddeKonusu, k.baslik, k.sorumlu, k.bolum].some(x => String(x || '').toLocaleLowerCase('tr').includes(a)));
  }
  const toplantilar = csgbToplantilariniGetir(d.id);
  const kart = (etiket, deger) => `<div class="istatistik-kutu"><span>${etiket}</span><b>${deger}</b></div>`;

  kutu.innerHTML = `
    <a href="#" id="csgbGeriLink" class="geri-link">← Tüm ÇSGB Denetimleri</a>
    <div class="kart" style="margin:10px 0 14px;">
      <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap;">
        <div>
          <h3 style="margin:0 0 4px;">${K(d.baslikGoruntu)}</h3>
          <div style="font-size:12.5px; line-height:1.7;">
            ${K(d.denetimTuru)}${d.raporNo ? ' · Rapor No: <b>' + K(d.raporNo) + '</b>' : ''}${d.raporTarihi ? ' · Rapor Tarihi: <b>' + gunAyYil(d.raporTarihi) + '</b>' : ''}${d.denetimTarihi ? ' · Denetim: ' + gunAyYil(d.denetimTarihi) : ''}<br>
            ${d.tebligTarihi ? 'Tebliğ: ' + gunAyYil(d.tebligTarihi) + ' · ' : ''}${d.verilenSureGun ? 'Süre: ' + d.verilenSureGun + ' gün · ' : ''}${d.sonGidermeTarihi ? 'Son Giderme: <b>' + gunAyYil(d.sonGidermeTarihi) + '</b> ' : ''}${_csgbKalanGunRozeti(d)}
            ${d.mufettisler ? '<br>Müfettiş: ' + K(d.mufettisler) : ''}${d.bildirimTarihi ? ' · Bakanlığa bildirim: ' + gunAyYil(d.bildirimTarihi) : ''}
            ${d.notlar ? '<br><span style="color:var(--metin-soluk);">' + K(d.notlar) + '</span>' : ''}
          </div>
        </div>
        <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:flex-start; max-width:560px; justify-content:flex-end;">
          <button type="button" class="ikincil" id="csgbDenetimDuzenleBtn">Denetimi Düzenle</button>
          <button type="button" class="ikincil" id="csgbRaporWordBtn">📄 Takip Raporu (Word)</button>
          <button type="button" class="ikincil" id="csgbRaporPdfBtn" title="Tablodaki maddeye tıklayınca PDF içinde tam metnine gider">📕 Takip Raporu (PDF)</button>
          <button type="button" class="ikincil" id="csgbPptxBtn" title="Son takip toplantısının (toplantı yoksa sıradaki toplantının) sunumu: genel durum, açık maddeler, tamamlananlar">📊 Toplantı Sunumu (PPTX)</button>
        </div>
      </div>
    </div>

    <div class="istatistik-grid">
      ${kart('Toplam Madde', tumMaddeler.length)}
      ${kart('Tamamlanan', d.kapaliSayisi)}
      ${kart('Açık', d.acikSayisi)}
      ${kart('Gecikmiş', d.gecikmisSayisi)}
      ${kart('İlerleme', '%' + d.ilerlemeYuzde)}
      ${kart('Toplantı', toplantilar.length)}
    </div>

    <div class="card-title" style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; margin:18px 0 8px;">
      <h3 style="margin:0; font-size:15px;">Takip Toplantıları</h3>
      <button type="button" class="birincil" style="width:auto;" id="csgbYeniToplantiBtn">+ Takip Toplantısı</button>
    </div>
    <div class="tablo-scroll">
      <table class="veri-tablosu">
        <thead><tr><th>İşlemler</th><th>Tarih</th><th>Yer</th><th>Katılımcı</th><th>Not Girilen Madde</th><th>Sonraki Toplantı</th></tr></thead>
        <tbody>${toplantilar.length ? toplantilar.slice().reverse().map(t => `
          <tr>
            <td style="white-space:nowrap;">
              <button type="button" class="tablo-buton" data-csgb-top-duzenle="${t.id}">Düzenle</button>
              <button type="button" class="tablo-buton" data-csgb-top-word="${t.id}">Tutanak (Word)</button>
              <button type="button" class="tablo-buton" data-csgb-top-pptx="${t.id}">Sunum (PPTX)</button>
              <button type="button" class="tablo-buton sil" data-csgb-top-sil="${t.id}">Sil</button>
            </td>
            <td>${gunAyYil(t.tarih)}</td>
            <td>${K(t.yer) || '-'}</td>
            <td>${csgbKatilimcilariNormallestir(t.katilimcilar).length}</td>
            <td>${Object.keys(t.maddeNotlari || {}).length}</td>
            <td>${gunAyYil(t.sonrakiToplantiTarihi) || '-'}</td>
          </tr>`).join('') : '<tr><td colspan="6">Henüz takip toplantısı yapılmadı.</td></tr>'}</tbody>
      </table>
    </div>

    <div class="card-title" style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; margin:22px 0 8px;">
      <h3 style="margin:0; font-size:15px;">Denetim Maddeleri</h3>
      <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
        <input type="text" id="csgbMaddeArama" class="arama-kutusu" placeholder="No, konu, metin, sorumlu..." value="${K(_csgbMaddeArama)}" style="width:220px; margin:0;">
        <select id="csgbMaddeFiltre" style="width:auto; margin:0;">
          <option value="hepsi">Tüm Maddeler</option>
          <option value="acik">Açık Olanlar</option>
          <option value="gecikmis">Gecikmiş</option>
          <option value="tamamlanan">Tamamlananlar</option>
        </select>
        <button type="button" class="ikincil" id="csgbSablonBtn">Şablon İndir</button>
        <button type="button" class="ikincil" id="csgbIceAktarBtn" title="Excel'deki maddeleri bu denetime aktarır. Aynı Madde No varsa o madde güncellenir.">İçe Aktar (Excel)</button>
        <button type="button" class="ikincil" id="csgbDisaAktarBtn">Dışa Aktar (Excel)</button>
        <button type="button" class="birincil" style="width:auto;" id="csgbMaddeEkleBtn">+ Madde Ekle</button>
      </div>
    </div>
    <div class="tablo-scroll">
      <table class="veri-tablosu" style="table-layout:fixed; min-width:1290px;">
        <colgroup><col style="width:80px;"><col style="width:60px;"><col style="width:150px;"><col style="width:330px;"><col style="width:270px;"><col style="width:150px;"><col style="width:85px;"><col style="width:120px;"><col style="width:110px;"></colgroup>
        <thead><tr><th>İşlemler</th><th>No</th><th>Uygunsuzluk Konusu</th><th>Uygunsuzluk</th><th>Toplantı Notları</th><th>Kanıtlar</th><th>Termin</th><th>Sorumlu</th><th>Durum</th></tr></thead>
        <tbody>${maddeler.length ? maddeler.map(k => `
          <tr>
            <td><button type="button" class="tablo-buton" data-csgb-madde-duzenle="${k.id}">Düzenle</button></td>
            <td><b>${K(k.denetimMaddeNo) || '-'}</b></td>
            <td>${K(k.maddeKonusu) || '-'}</td>
            <td style="font-size:12.5px;">${_csgbMetinHucresi(k)}</td>
            <td style="font-size:12px;">${_csgbNotlarHucresi(k)}</td>
            <td>${_csgbKanitHucresi(k)}</td>
            <td>${gunAyYil(k.termin) || '-'}</td>
            <td>${K(k.sorumlu) || '-'}</td>
            <td>
              <span class="genel-rozet rozet-${_csgbRozetSinifi(k.durumGoruntu)}">${K(csgbDurumEtiketi(k.durumGoruntu))}</span>
              <div style="font-size:11px; margin:4px 0 2px;">%${k.yuzde}</div>${_csgbIlerlemeCubugu(k.yuzde, 5)}
              ${k.kapanisTarihi && k.durum === 'Kapalı' ? '<div style="font-size:11px; color:var(--metin-soluk); margin-top:3px;">' + gunAyYil(k.kapanisTarihi) + '</div>' : ''}
            </td>
          </tr>`).join('') : `<tr><td colspan="9">${tumMaddeler.length ? 'Filtreye uyan madde yok.' : 'Henüz madde girilmedi. "+ Madde Ekle" ya da "İçe Aktar (Excel)" ile rapordaki maddeleri girin.'}</td></tr>`}</tbody>
      </table>
    </div>
  `;

  document.getElementById('csgbMaddeFiltre').value = _csgbMaddeFiltre;
  document.getElementById('csgbGeriLink').addEventListener('click', e => { e.preventDefault(); _csgbAcikDenetimId = null; csgbCiz(); });
  document.getElementById('csgbDenetimDuzenleBtn').addEventListener('click', () => csgbDenetimModalAc(d.id));
  document.getElementById('csgbYeniToplantiBtn').addEventListener('click', () => csgbToplantiModalAc(null));
  document.getElementById('csgbMaddeEkleBtn').addEventListener('click', () => csgbMaddeModalAc(null));
  document.getElementById('csgbMaddeFiltre').addEventListener('change', e => { _csgbMaddeFiltre = e.target.value; csgbCiz(); });
  document.getElementById('csgbMaddeArama').addEventListener('input', e => {
    _csgbMaddeArama = e.target.value;
    csgbCiz();
    const girdi = document.getElementById('csgbMaddeArama');
    girdi.focus();
    girdi.setSelectionRange(girdi.value.length, girdi.value.length);
  });
  document.getElementById('csgbSablonBtn').addEventListener('click', () => excelSablonIndir(CSGB_EXCEL_KOLONLARI, 'csgb_madde_sablonu.xlsx'));
  document.getElementById('csgbIceAktarBtn').addEventListener('click', () => document.getElementById('csgbIceAktarDosya').click());
  document.getElementById('csgbDisaAktarBtn').addEventListener('click', () => csgbExcelDisaAktar(d.id));
  _csgbButonIsle('csgbRaporWordBtn', 'Hazırlanıyor...', async () => {
    const tamMetin = await onayModali('Raporun sonuna maddelerin tam metni (gerekli tedbir, mevzuat) ve kanıt fotoğrafları "Ek" olarak eklensin mi? Hayır derseniz sadece kısa takip tablosu üretilir.', 'Evet, ekle');
    await csgbTakipRaporuWordOlustur(d.id, tamMetin);
  });
  _csgbButonIsle('csgbRaporPdfBtn', 'PDF hazırlanıyor...', () => csgbTakipRaporuPdfOlustur(d.id));
  _csgbButonIsle('csgbPptxBtn', 'Sunum hazırlanıyor...', () => {
    const son = toplantilar[toplantilar.length - 1];
    return csgbToplantiPptxOlustur(d.id, son ? son.id : null);
  });

  kutu.querySelectorAll('[data-csgb-metin]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    const id = a.getAttribute('data-csgb-metin');
    if (_csgbAcikMetinler.has(id)) _csgbAcikMetinler.delete(id); else _csgbAcikMetinler.add(id);
    csgbCiz();
  }));
  kutu.querySelectorAll('[data-csgb-kanit]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    const [maddeId, i] = a.getAttribute('data-csgb-kanit').split('|');
    const madde = csgbMaddeGetirRepo(maddeId);
    const kanit = madde && madde.kanitlar ? madde.kanitlar[Number(i)] : null;
    if (kanit) belgeDosyasiniAc(kanit.ref);
  }));
  kutu.querySelectorAll('[data-csgb-madde-duzenle]').forEach(b => b.addEventListener('click', () => csgbMaddeModalAc(b.getAttribute('data-csgb-madde-duzenle'))));
  kutu.querySelectorAll('[data-csgb-top-duzenle]').forEach(b => b.addEventListener('click', () => csgbToplantiModalAc(b.getAttribute('data-csgb-top-duzenle'))));
  kutu.querySelectorAll('[data-csgb-top-word]').forEach(b => b.addEventListener('click', async () => {
    try { await csgbToplantiTutanagiWordOlustur(b.getAttribute('data-csgb-top-word')); }
    catch (hata) { console.error(hata); alert('Tutanak üretilemedi: ' + (hata.message || hata)); }
  }));
  kutu.querySelectorAll('[data-csgb-top-pptx]').forEach(b => b.addEventListener('click', async () => {
    try { await csgbToplantiPptxOlustur(d.id, b.getAttribute('data-csgb-top-pptx')); }
    catch (hata) { console.error(hata); alert('Sunum üretilemedi: ' + (hata.message || hata)); }
  }));
  kutu.querySelectorAll('[data-csgb-top-sil]').forEach(b => b.addEventListener('click', async () => {
    if (!(await onayModali('Bu takip toplantısı ve içindeki madde notları silinecek (maddelerin durumları değişmez). Emin misiniz?', 'Sil'))) return;
    const sonuc = csgbToplantiSil(b.getAttribute('data-csgb-top-sil'));
    if (!sonuc.basarili) { alert(sonuc.hata); return; }
    csgbCiz();
  }));
}

// ==================== EXCEL İÇE AKTARIM ====================

function _csgbExcelDosyasiSecildi(e) {
  const dosya = e.target.files[0];
  const denetimId = _csgbAcikDenetimId;
  if (!dosya || !denetimId) return;
  excelIceAktar(dosya, CSGB_EXCEL_KOLONLARI, async (satirlar, hataMesaji) => {
    e.target.value = '';
    if (hataMesaji) { alert(hataMesaji); return; }
    satirlar.forEach(s => {
      s.termin = excelTarihiNormallestir(s.termin);
      s.kapanisTarihi = excelTarihiNormallestir(s.kapanisTarihi);
    });
    const btn = document.getElementById('csgbIceAktarBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Kaydediliyor...'; }
    let sonuc;
    try { sonuc = await csgbMaddeleriIceAktar(denetimId, satirlar); }
    finally { if (btn) { btn.disabled = false; btn.textContent = 'İçe Aktar (Excel)'; } }
    let mesaj = `${sonuc.eklenen} madde eklendi, ${sonuc.guncellenen} madde (aynı Madde No) güncellendi.`;
    if (sonuc.hatalar.length) mesaj += `\n\n${sonuc.hatalar.length} satır aktarılamadı:\n` + sonuc.hatalar.slice(0, 15).join('\n');
    if (!sonuc.bulutBasarili) mesaj += '\n\nUYARI: Kayıtlar buluta YAZILAMADI. Sayfayı yenilerseniz kaybolurlar; dosyayı daha az satırla bölerek aktarın.';
    alert(mesaj);
    csgbCiz();
  });
}

// ==================== MADDE FORMU ====================

function _csgbKanitlariCiz() {
  const kutu = document.getElementById('mdKanitListesi');
  if (!_csgbKanitlar.length) {
    kutu.innerHTML = '<div style="font-size:12px; color:var(--metin-soluk);">Henüz kanıt eklenmedi.</div>';
    return;
  }
  const K = _csgbKacir;
  kutu.innerHTML = _csgbKanitlar.map((k, i) => `
    <div style="display:flex; align-items:center; gap:10px; padding:6px 0; border-bottom:1px solid var(--kenarlik);">
      ${k.tur === 'foto'
        ? `<img data-foto-ref="${K(k.ref)}" style="width:48px; height:48px; object-fit:cover; border-radius:6px; border:1px solid var(--kenarlik);">`
        : '<span style="font-size:26px; width:48px; text-align:center;">📄</span>'}
      <div style="flex:1; min-width:0; font-size:12px;">
        <div style="font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${K(k.ad)}">${K(k.ad)}</div>
        <div style="color:var(--metin-soluk);">${gunAyYil((k.tarih || '').slice(0, 10))}</div>
      </div>
      <a href="#" data-kanit-ac="${i}" style="font-size:12px;">Aç</a>
      <button type="button" class="tablo-buton sil" data-kanit-sil="${i}">Kaldır</button>
    </div>`).join('');
  fotoReferanslariCoz(kutu);
  kutu.querySelectorAll('[data-kanit-ac]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    belgeDosyasiniAc(_csgbKanitlar[Number(a.getAttribute('data-kanit-ac'))].ref);
  }));
  kutu.querySelectorAll('[data-kanit-sil]').forEach(b => b.addEventListener('click', () => {
    _csgbKanitlar.splice(Number(b.getAttribute('data-kanit-sil')), 1);
    _csgbKanitlariCiz();
  }));
}

async function _csgbKanitDosyalariEkle(dosyalar) {
  const firma = aktifFirmaGetir();
  const hatalar = [];
  for (const dosya of dosyalar) {
    try {
      const ref = await belgeDosyasiIsle(dosya, firma ? firma.slug : '');
      _csgbKanitlar.push({ id: rastgeleId(), ad: dosya.name || 'Kanıt', tur: dosya.type === 'application/pdf' ? 'pdf' : 'foto', ref, tarih: new Date().toISOString() });
    } catch (hata) {
      hatalar.push(`${dosya.name}: ${hata.message || hata}`);
    }
  }
  _csgbKanitlariCiz();
  if (hatalar.length) alert('Bazı kanıtlar eklenemedi:\n' + hatalar.join('\n'));
}

function csgbMaddeModalAc(maddeId) {
  const d = csgbDenetimGetir(_csgbAcikDenetimId);
  if (!d) return;
  _csgbDuzenlenenMaddeId = maddeId;
  const m = maddeId ? csgbMaddeGetirRepo(maddeId) : null;
  document.getElementById('mdBaslik').textContent = m ? `Madde ${m.denetimMaddeNo || ''} — Düzenle` : 'Yeni Denetim Maddesi';
  document.getElementById('mdNo').value = m ? m.denetimMaddeNo : '';
  document.getElementById('mdKonu').value = m ? m.maddeKonusu : '';
  document.getElementById('mdTanim').value = m ? m.baslik : '';
  document.getElementById('mdTedbir').value = m ? m.duzelticiFaaliyet : '';
  document.getElementById('mdMevzuat').value = m ? m.yasalDayanak : '';
  document.getElementById('mdAciklama').value = m ? m.aciklama : '';
  document.getElementById('mdBolum').value = m ? m.bolum : '';
  document.getElementById('sorumlu').value = m ? m.sorumlu : '';
  if (typeof bolumButonlariCiz === 'function') bolumButonlariCiz('sorumluBolumButonlari', 'sorumlu', 'tekli');
  // Yeni maddede termin varsayılan olarak denetimin son giderme tarihidir.
  document.getElementById('mdTermin').value = m ? m.termin : (d.sonGidermeTarihi || '');
  document.getElementById('mdDurum').innerHTML = CSGB_MADDE_DURUMLARI.map(s => `<option value="${s}" ${(m ? m.durum : 'Açık') === s ? 'selected' : ''}>${csgbDurumEtiketi(s)}</option>`).join('');
  const yuzde = m ? csgbMaddeYuzdesi(m) : 0;
  document.getElementById('mdYuzde').innerHTML = Array.from(new Set(CSGB_YUZDE_SECENEKLERI.concat([yuzde]))).sort((a, b) => a - b)
    .map(y => `<option value="${y}" ${y === yuzde ? 'selected' : ''}>%${y}</option>`).join('');
  document.getElementById('mdKapanisTarihi').value = m ? m.kapanisTarihi : '';
  document.getElementById('mdKapanisAciklamasi').value = m ? m.kanitAciklamasi : '';
  document.getElementById('mdSilBtn').style.display = m ? '' : 'none';
  document.getElementById('mdBolBtn').style.display = m ? '' : 'none';
  _csgbKanitlar = m && Array.isArray(m.kanitlar) ? m.kanitlar.slice() : [];
  _csgbKanitlariCiz();
  document.getElementById('mdHata').textContent = '';
  document.getElementById('maddeKatmani').classList.add('acik');
}

function csgbMaddeModalKapat() {
  document.getElementById('maddeKatmani').classList.remove('acik');
  _csgbDuzenlenenMaddeId = null;
}

function _csgbMaddeKaydetTiklandi() {
  const durum = document.getElementById('mdDurum').value;
  const sonuc = csgbMaddeKaydet({
    denetimId: _csgbAcikDenetimId,
    denetimMaddeNo: document.getElementById('mdNo').value,
    maddeKonusu: document.getElementById('mdKonu').value,
    baslik: document.getElementById('mdTanim').value,
    duzelticiFaaliyet: document.getElementById('mdTedbir').value,
    yasalDayanak: document.getElementById('mdMevzuat').value,
    aciklama: document.getElementById('mdAciklama').value,
    bolum: document.getElementById('mdBolum').value,
    sorumlu: document.getElementById('sorumlu').value,
    termin: document.getElementById('mdTermin').value,
    durum,
    tamamlanmaYuzdesi: durum === 'Kapalı' ? 100 : document.getElementById('mdYuzde').value,
    kapanisTarihi: document.getElementById('mdKapanisTarihi').value,
    kanitAciklamasi: document.getElementById('mdKapanisAciklamasi').value,
    kanitlar: _csgbKanitlar.slice()
  }, _csgbDuzenlenenMaddeId);
  if (!sonuc.basarili) { document.getElementById('mdHata').textContent = sonuc.hata; return; }
  csgbMaddeModalKapat();
  csgbCiz();
}

async function _csgbMaddeSilTiklandi() {
  if (!_csgbDuzenlenenMaddeId) return;
  if (!(await onayModali('Bu madde (kanıtları ve toplantı notlarıyla birlikte) silinecek. Emin misiniz?', 'Sil'))) return;
  const sonuc = csgbMaddeSil(_csgbDuzenlenenMaddeId);
  if (!sonuc.basarili) { alert(sonuc.hata); return; }
  csgbMaddeModalKapat();
  csgbCiz();
}

// ==================== BÖLÜMLERE AYIR ====================

let _csgbBolMaddeId = null;

function _csgbBolNumaralari(madde, adet) {
  const ana = madde.anaMaddeNo || madde.denetimMaddeNo || '';
  return Array.from({ length: adet }, (_, i) => madde.anaMaddeNo && i === 0 ? madde.denetimMaddeNo : (ana ? `${ana}-${i + 1}` : String(i + 1)));
}

function _csgbBolSatirlariCiz(satirlar) {
  const madde = csgbMaddeGetirRepo(_csgbBolMaddeId);
  const K = _csgbKacir;
  const nolar = _csgbBolNumaralari(madde, satirlar.length);
  document.getElementById('bolGovde').innerHTML = satirlar.map((s, i) => `
    <tr>
      <td><b>${K(madde.anaMaddeNo && i > 0 ? '(yeni)' : nolar[i])}</b></td>
      <td><input type="text" data-bol-bolum value="${K(s.bolum)}" placeholder="ör. Kireçtaşı üretim kumanda odası" style="margin:0;"></td>
      <td><input type="text" data-bol-sorumlu value="${K(s.sorumlu)}" placeholder="Sorumlu" style="margin:0;"></td>
      <td><input type="date" data-bol-termin value="${K(s.termin)}" style="margin:0;"></td>
      <td><button type="button" class="tablo-buton sil" data-bol-sil="${i}">✕</button></td>
    </tr>`).join('');
  document.querySelectorAll('#bolGovde [data-bol-sil]').forEach(b => b.addEventListener('click', () => {
    const liste = _csgbBolSatirlariTopla();
    liste.splice(Number(b.getAttribute('data-bol-sil')), 1);
    _csgbBolSatirlariCiz(liste.length ? liste : [{ bolum: '', sorumlu: '', termin: '' }]);
  }));
}

function _csgbBolSatirlariTopla() {
  return Array.from(document.querySelectorAll('#bolGovde tr')).map(tr => ({
    bolum: tr.querySelector('[data-bol-bolum]').value.trim(),
    sorumlu: tr.querySelector('[data-bol-sorumlu]').value.trim(),
    termin: tr.querySelector('[data-bol-termin]').value
  }));
}

function csgbBolModalAc(maddeId) {
  const madde = csgbMaddeGetirRepo(maddeId);
  if (!madde) return;
  _csgbBolMaddeId = maddeId;
  const onceden = !!madde.anaMaddeNo;
  document.getElementById('bolBaslik').textContent = `Madde ${madde.denetimMaddeNo || ''} — Bölümlere Ayır`;
  document.getElementById('bolAciklama').textContent = onceden
    ? 'Bu madde zaten bir parça. Eklediğiniz yeni bölümler aynı ana maddenin sıradaki parçaları olarak açılır (ilk satır bu maddenin kendisidir).'
    : 'Her satır ayrı takip edilen bir madde olur. İlk satır bu maddenin kendisidir (notları ve kanıtları onda kalır); diğerleri metin, tedbir ve mevzuat kopyalanarak açılır. Öneriler madde metnindeki yer listesinden geldi; düzenleyebilirsiniz.';
  const oneriler = onceden ? [] : csgbBolumOnerileriCikar(madde.baslik);
  const ilk = { bolum: madde.bolum || '', sorumlu: madde.sorumlu || '', termin: madde.termin || '' };
  const satirlar = oneriler.length
    ? oneriler.map((b, i) => ({ bolum: b, sorumlu: i === 0 ? madde.sorumlu || '' : '', termin: madde.termin || '' }))
    : [ilk, { bolum: '', sorumlu: '', termin: madde.termin || '' }];
  _csgbBolSatirlariCiz(satirlar);
  document.getElementById('bolHata').textContent = '';
  document.getElementById('bolKatmani').classList.add('acik');
}

function csgbBolModalKapat() {
  document.getElementById('bolKatmani').classList.remove('acik');
  _csgbBolMaddeId = null;
}

async function _csgbBolKaydetTiklandi() {
  const madde = csgbMaddeGetirRepo(_csgbBolMaddeId);
  if (!madde) return;
  const satirlar = _csgbBolSatirlariTopla();
  // Zaten parça olan maddede ilk satır maddenin kendisidir: sadece güncellenir, yeniler eklenir.
  const sonuc = await csgbMaddeyiBol(_csgbBolMaddeId, satirlar);
  if (!sonuc.basarili) { document.getElementById('bolHata').textContent = sonuc.hata; return; }
  csgbBolModalKapat();
  csgbMaddeModalKapat();
  csgbCiz();
  alert(`Madde ${sonuc.parcaSayisi} bölüme ayrıldı. Her parçayı "Düzenle" ile ayrı takip edebilirsiniz.`);
}

// ==================== TAKİP TOPLANTISI ====================
// Gündem = açık maddeler (tamamlananlar gizli; "tamamlananları da göster" ile
// açılır). Her maddeye bu toplantının notu, durum ve tamamlanma yüzdesi girilir.

function csgbToplantiModalAc(toplantiId) {
  const d = csgbDenetimGetir(_csgbAcikDenetimId);
  if (!d) return;
  _csgbToplantiId = toplantiId;
  const t = toplantiId ? csgbToplantilariTumunuGetir().find(x => x.id === toplantiId) : null;
  // Yeni toplantıda katılımcılar/yer bir önceki toplantıdan kopyalanır.
  const onceki = csgbToplantilariniGetir(d.id).slice(-1)[0];
  document.getElementById('csgbToplantiBaslik').textContent = (t ? 'Takip Toplantısını Düzenle — ' : 'Yeni Takip Toplantısı — ') + d.baslikGoruntu;
  document.getElementById('csgbTopTarih').value = t ? t.tarih : bugunIso();
  document.getElementById('csgbTopSonraki').value = t ? t.sonrakiToplantiTarihi : '';
  document.getElementById('csgbTopYer').value = t ? t.yer : (onceki ? onceki.yer : '');
  _csgbKatilimcilariCiz(csgbKatilimcilariNormallestir(t ? t.katilimcilar : (onceki ? onceki.katilimcilar : [])));
  document.getElementById('csgbTopGenel').value = t ? t.genelNotlar : '';
  document.getElementById('csgbTopKapalilariGoster').checked = false;
  document.getElementById('csgbTopHata').textContent = '';
  _csgbTopTaslakNot = Object.assign({}, t ? t.maddeNotlari : {});
  _csgbTopTaslakDurum = {};
  _csgbTopTaslakYuzde = {};
  _csgbTopMaddeleriCiz();
  document.getElementById('csgbToplantiKatmani').classList.add('acik');
}

// Katılımcı tablosu: her satır Ad Soyad + Görevi (imza tutanakta ıslak imza için boş sütun).
function _csgbKatilimcilariCiz(liste) {
  const govde = document.getElementById('csgbTopKatilimciGovde');
  const satirlar = liste.length ? liste : [{ adSoyad: '', gorev: '', eposta: '' }];
  govde.innerHTML = satirlar.map((k, i) => `
    <tr>
      <td style="text-align:center;">${i + 1}</td>
      <td><input type="text" data-kat-ad value="${_csgbKacir(k.adSoyad)}" placeholder="Ad Soyad" style="margin:0;"></td>
      <td><input type="text" data-kat-gorev value="${_csgbKacir(k.gorev)}" placeholder="Görevi" style="margin:0;"></td>
      <td><input type="text" data-kat-eposta value="${_csgbKacir(k.eposta || '')}" placeholder="E-posta" style="margin:0;"></td>
      <td><button type="button" class="tablo-buton sil" data-kat-sil="${i}" title="Satırı sil">✕</button></td>
    </tr>`).join('');
  govde.querySelectorAll('[data-kat-sil]').forEach(b => b.addEventListener('click', () => {
    const mevcut = _csgbKatilimcilariTopla(true);
    mevcut.splice(Number(b.getAttribute('data-kat-sil')), 1);
    _csgbKatilimcilariCiz(mevcut);
  }));
}

// bosDahil: satır silme/ekleme sırasında henüz doldurulmamış satırlar kaybolmasın.
function _csgbKatilimcilariTopla(bosDahil) {
  const liste = Array.from(document.querySelectorAll('#csgbTopKatilimciGovde tr')).map(tr => ({
    adSoyad: tr.querySelector('[data-kat-ad]').value.trim(),
    gorev: tr.querySelector('[data-kat-gorev]').value.trim(),
    eposta: tr.querySelector('[data-kat-eposta]').value.trim()
  }));
  return bosDahil ? liste : liste.filter(k => k.adSoyad || k.gorev || k.eposta);
}

function csgbToplantiModalKapat() {
  document.getElementById('csgbToplantiKatmani').classList.remove('acik');
  _csgbToplantiId = null;
}

function _csgbTopTaslagiTopla() {
  document.querySelectorAll('#csgbTopMaddeGovde [data-top-not]').forEach(el => { _csgbTopTaslakNot[el.getAttribute('data-top-not')] = el.value; });
  document.querySelectorAll('#csgbTopMaddeGovde [data-top-durum]').forEach(el => { _csgbTopTaslakDurum[el.getAttribute('data-top-durum')] = el.value; });
  document.querySelectorAll('#csgbTopMaddeGovde [data-top-yuzde]').forEach(el => { _csgbTopTaslakYuzde[el.getAttribute('data-top-yuzde')] = el.value; });
}

function _csgbTopMaddeleriCiz() {
  const K = _csgbKacir;
  const kapalilar = document.getElementById('csgbTopKapalilariGoster').checked;
  const maddeler = csgbMaddeleriniGetir(_csgbAcikDenetimId).filter(k =>
    kapalilar || (k.durum !== 'Kapalı' && k.durum !== 'İptal') || (_csgbTopTaslakNot[k.id] || '').trim());
  const govde = document.getElementById('csgbTopMaddeGovde');
  if (!maddeler.length) {
    govde.innerHTML = '<tr><td colspan="4">Gösterilecek madde yok.</td></tr>';
    return;
  }
  const buToplantiTarihi = document.getElementById('csgbTopTarih').value;
  govde.innerHTML = maddeler.map(k => {
    const durum = _csgbTopTaslakDurum[k.id] || k.durum;
    const yuzde = Number(_csgbTopTaslakYuzde[k.id] ?? k.yuzde);
    const oncekiNotlar = k.toplantiNotlari.filter(n => n.tarih !== buToplantiTarihi);
    return `
    <tr>
      <td><b>${K(k.denetimMaddeNo) || '-'}</b></td>
      <td style="font-size:12px;">
        ${k.maddeKonusu ? '<b>' + K(k.maddeKonusu) + '</b><br>' : ''}
        <div class="csgb-kisalt" title="${K(k.baslik)}">${K(k.baslik)}</div>
        <div style="color:var(--metin-soluk); margin-top:3px;">Sorumlu: ${K(k.sorumlu) || '-'} · Termin: ${gunAyYil(k.termin) || '-'}</div>
        ${oncekiNotlar.length ? `<details style="margin-top:3px;"><summary style="cursor:pointer; color:var(--metin-soluk);">Önceki notlar (${oncekiNotlar.length})</summary>${oncekiNotlar.map(n => `<div><b>${gunAyYil(n.tarih)}:</b> ${K(n.not)}</div>`).join('')}</details>` : ''}
      </td>
      <td><textarea data-top-not="${k.id}" rows="3" style="margin:0; font-size:12.5px;" placeholder="Görüşülen / yapılan çalışma...">${K(_csgbTopTaslakNot[k.id] || '')}</textarea></td>
      <td>
        <select data-top-durum="${k.id}" style="margin:0 0 6px;">${CSGB_MADDE_DURUMLARI.map(s => `<option value="${s}" ${s === durum ? 'selected' : ''}>${csgbDurumEtiketi(s)}</option>`).join('')}</select>
        <select data-top-yuzde="${k.id}" style="margin:0;">${Array.from(new Set(CSGB_YUZDE_SECENEKLERI.concat([yuzde]))).sort((a, b) => a - b).map(y => `<option value="${y}" ${y === yuzde ? 'selected' : ''}>%${y}</option>`).join('')}</select>
      </td>
    </tr>`;
  }).join('');
  // Tamamlandı seçilince yüzde %100'e çekilir.
  govde.querySelectorAll('[data-top-durum]').forEach(sel => sel.addEventListener('change', () => {
    if (sel.value === 'Kapalı') govde.querySelector(`[data-top-yuzde="${sel.getAttribute('data-top-durum')}"]`).value = '100';
  }));
}

async function _csgbToplantiKaydetTiklandi() {
  _csgbTopTaslagiTopla();
  const guncellemeler = {};
  document.querySelectorAll('#csgbTopMaddeGovde [data-top-durum]').forEach(el => {
    const id = el.getAttribute('data-top-durum');
    const madde = csgbMaddeGetirRepo(id);
    if (!madde) return;
    const yuzdeEl = document.querySelector(`#csgbTopMaddeGovde [data-top-yuzde="${id}"]`);
    const yeniYuzde = el.value === 'Kapalı' ? 100 : Number(yuzdeEl ? yuzdeEl.value : csgbMaddeYuzdesi(madde));
    if (madde.durum !== el.value || csgbMaddeYuzdesi(madde) !== yeniYuzde) guncellemeler[id] = { durum: el.value, tamamlanmaYuzdesi: yeniYuzde };
  });
  const btn = document.getElementById('csgbTopKaydetBtn');
  btn.disabled = true;
  let sonuc;
  try {
    sonuc = await csgbToplantiKaydet({
      id: _csgbToplantiId || undefined,
      denetimId: _csgbAcikDenetimId,
      tarih: document.getElementById('csgbTopTarih').value,
      sonrakiToplantiTarihi: document.getElementById('csgbTopSonraki').value,
      yer: document.getElementById('csgbTopYer').value,
      katilimcilar: _csgbKatilimcilariTopla(),
      genelNotlar: document.getElementById('csgbTopGenel').value,
      maddeNotlari: _csgbTopTaslakNot
    }, guncellemeler);
  } finally { btn.disabled = false; }
  if (!sonuc.basarili) { document.getElementById('csgbTopHata').textContent = sonuc.hata; return; }
  csgbToplantiModalKapat();
  csgbCiz();
}
