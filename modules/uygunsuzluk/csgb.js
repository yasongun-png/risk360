// ÇSGB Denetimi sekmesi: Bakanlık (iş müfettişi) denetim raporundaki
// maddelerin giderilmesinin takibi. İSG Kurulu ile Uygunsuzluk'un karışımı:
//  - Denetim kartı (rapor no/tarihi, tebliğ, süre, son giderme tarihi).
//  - Maddeler = denetimin bağlı olduğu konudaki normal uygunsuzluk kayıtları
//    (rapordaki numarasıyla birebir: 1, 2, 5.a, 5.b ... her biri ayrı kayıt).
//  - Dönemsel takip toplantıları: her toplantıda madde bazında not + durum.
//    Notlar toplantı tarihiyle saklanır; listede/raporda madde tek satırdır
//    ve tüm toplantı notları o satırda tarih sırasıyla alt alta görünür.
//  - Çıktılar: Takip Raporu (Word, yatay), Toplantı Tutanağı (Word), Excel.

// ÇSGB madde şablonu: rapordaki sırayla. Başlıklar UYGUNSUZLUK_IMPORT_KOLONLARI
// ile eşleşir (içe aktarım o listeyle yapılır); Dışa Aktar çıktısı da aynı
// başlıkları kullandığı için düzenlenip geri içe aktarılabilir.
const CSGB_SABLON_KOLONLARI = [
  { anahtar: 'denetimMaddeNo', baslik: 'Madde No' },
  { anahtar: 'maddeKonusu', baslik: 'Uygunsuzluk Konusu' },
  { anahtar: 'baslik', baslik: 'Uygunsuzluk Tanımı' },
  { anahtar: 'duzelticiFaaliyet', baslik: 'Faaliyet Önerisi' },
  { anahtar: 'yasalDayanak', baslik: 'Yasal Dayanak' },
  { anahtar: 'bolum', baslik: 'Bölüm' },
  { anahtar: 'sorumlu', baslik: 'Sorumlu' },
  { anahtar: 'termin', baslik: 'Termin' },
  { anahtar: 'riskSeviyesi', baslik: 'Risk Seviyesi' },
  { anahtar: 'durum', baslik: 'Durum' },
  { anahtar: 'kapanisTarihi', baslik: 'Kapanış Tarihi' },
  { anahtar: 'kanitAciklamasi', baslik: 'Kapanış Açıklaması' }
];

let _csgbAcikDenetimId = null;
let _csgbDuzenlenenId = null;
let _csgbToplantiId = null;
let _csgbMaddeFiltre = 'hepsi';
let _csgbAcikMetinler = new Set();
// Toplantı penceresinde girilen ama henüz kaydedilmemiş değerler
// ("tamamlananları da göster" ile liste yeniden çizilince kaybolmasın).
let _csgbTopTaslakNot = {};
let _csgbTopTaslakDurum = {};

// Ekranda/raporda "Kapalı" yerine "Tamamlandı" (Kurul'daki gibi).
function csgbDurumEtiketi(durumGoruntu) {
  return durumGoruntu === 'Kapalı' ? 'Tamamlandı' : (durumGoruntu || '-');
}

function _csgbKalanGunRozeti(d) {
  if (d.durum === 'Kapandı') return '<span class="genel-rozet rozet-kapali">Kapandı</span>';
  if (d.kalanGun === null || d.kalanGun === undefined) return '<span style="font-size:12px; color:var(--metin-soluk);">Son giderme tarihi girilmedi</span>';
  if (d.kalanGun < 0) return `<span class="durum-rozet durum-gecmis">${-d.kalanGun} gün geçti</span>`;
  if (d.kalanGun <= 15) return `<span class="durum-rozet durum-yaklasiyor">${d.kalanGun} gün kaldı</span>`;
  return `<span class="durum-rozet durum-gecerli">${d.kalanGun} gün kaldı</span>`;
}

function _csgbBaslik(d) {
  return d.konuAdi || ('ÇSGB Denetimi ' + gunAyYil(d.raporTarihi || d.denetimTarihi));
}

function csgbSekmesiniBaslat() {
  document.getElementById('csgbYeniBtn').addEventListener('click', () => csgbDenetimModalAc(null));
  document.getElementById('csgbKapatBtn').addEventListener('click', csgbDenetimModalKapat);
  document.getElementById('csgbIptalBtn').addEventListener('click', csgbDenetimModalKapat);
  document.getElementById('csgbKaydetBtn').addEventListener('click', _csgbDenetimKaydetTiklandi);
  document.getElementById('csgbKonu').addEventListener('change', e => {
    document.getElementById('csgbYeniKonuAdi').style.display = e.target.value === '__yeni' ? '' : 'none';
  });
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
  kutu.innerHTML = `<div class="modul-grid" style="grid-template-columns: repeat(auto-fill, minmax(340px,1fr));">${denetimler.map(d => `
    <div class="kart" style="display:flex; flex-direction:column; gap:8px;">
      <div style="display:flex; justify-content:space-between; gap:8px; align-items:flex-start;">
        <div>
          <div style="font-weight:700; font-size:15px;">${_usKacir(_csgbBaslik(d))}</div>
          <div style="font-size:12px; color:var(--metin-soluk);">${_usKacir(d.denetimTuru)}${d.raporNo ? ' · Rapor No: ' + _usKacir(d.raporNo) : ''}</div>
        </div>
        <span class="genel-rozet">${_usKacir(d.durum)}</span>
      </div>
      <div style="font-size:12px; line-height:1.6;">
        ${d.raporTarihi ? 'Rapor Tarihi: <b>' + gunAyYil(d.raporTarihi) + '</b><br>' : ''}
        ${d.sonGidermeTarihi ? 'Son Giderme: <b>' + gunAyYil(d.sonGidermeTarihi) + '</b> ' : ''}${_csgbKalanGunRozeti(d)}
        ${d.mufettisler ? '<br>Müfettiş: ' + _usKacir(d.mufettisler) : ''}
      </div>
      <div>
        <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:3px;"><span>${d.kapaliSayisi} / ${d.maddeSayisi - (d.maddeSayisi - d.kapaliSayisi - d.acikSayisi)} madde tamamlandı</span><b>%${d.ilerlemeYuzde}</b></div>
        <div style="height:8px; background:#e5e7eb; border-radius:4px; overflow:hidden;"><div style="height:100%; width:${d.ilerlemeYuzde}%; background:#16a34a;"></div></div>
      </div>
      <div style="font-size:12px; color:var(--metin-soluk);">
        Açık: <b>${d.acikSayisi}</b> · Gecikmiş: <b style="color:${d.gecikmisSayisi ? '#b91c1c' : 'inherit'};">${d.gecikmisSayisi}</b> · Toplantı: <b>${d.toplantiSayisi}</b>${d.sonrakiToplantiTarihi ? ' · Sonraki toplantı: <b>' + gunAyYil(d.sonrakiToplantiTarihi) + '</b>' : ''}
      </div>
      ${d.konuVarMi ? '' : '<div style="font-size:12px; color:#b91c1c;">Bağlı konu silinmiş; "Düzenle" ile yeni konu bağlayın.</div>'}
      <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:auto;">
        <button type="button" class="birincil" style="width:auto;" data-csgb-ac="${d.id}">Aç</button>
        <button type="button" class="ikincil" data-csgb-duzenle="${d.id}">Düzenle</button>
        <button type="button" class="ikincil" style="color:#b91c1c;" data-csgb-sil="${d.id}">Sil</button>
      </div>
    </div>`).join('')}</div>`;

  kutu.querySelectorAll('[data-csgb-ac]').forEach(b => b.addEventListener('click', () => { _csgbAcikDenetimId = b.getAttribute('data-csgb-ac'); _csgbMaddeFiltre = 'hepsi'; csgbCiz(); }));
  kutu.querySelectorAll('[data-csgb-duzenle]').forEach(b => b.addEventListener('click', () => csgbDenetimModalAc(b.getAttribute('data-csgb-duzenle'))));
  kutu.querySelectorAll('[data-csgb-sil]').forEach(b => b.addEventListener('click', () => _csgbDenetimSilTiklandi(b.getAttribute('data-csgb-sil'))));
}

async function _csgbDenetimSilTiklandi(id) {
  const d = csgbDenetimGetir(id);
  if (!d) return;
  if (!(await onayModali(`"${_csgbBaslik(d)}" denetim kartı ve ${d.toplantiSayisi} takip toplantısı silinecek. Maddeler (uygunsuzluk kayıtları) "${d.konuAdi}" konusunda kalır. Emin misiniz?`, 'Sil'))) return;
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

  // Başka bir denetime bağlı olmayan konular seçilebilir (bu denetimin kendi konusu hariç).
  const baglilar = new Set(csgbDenetimleriTumunuGetir().filter(x => x.id !== id).map(x => x.konuId));
  const konular = uygunsuzlukKonulariniGetir().filter(k => !baglilar.has(k.id));
  document.getElementById('csgbKonu').innerHTML = '<option value="__yeni">+ Yeni konu oluştur</option>' +
    konular.map(k => `<option value="${k.id}" ${d && d.konuId === k.id ? 'selected' : ''}>${_usKacir(k.ad)} (${k.kayitSayisi} kayıt)</option>`).join('');
  if (!d || !konular.some(k => k.id === d.konuId)) document.getElementById('csgbKonu').value = '__yeni';
  document.getElementById('csgbYeniKonuAdi').style.display = document.getElementById('csgbKonu').value === '__yeni' ? '' : 'none';
  document.getElementById('csgbYeniKonuAdi').value = '';

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
  const konuSecim = document.getElementById('csgbKonu').value;
  const veriler = {
    konuId: konuSecim === '__yeni' ? '' : konuSecim,
    yeniKonuAdi: document.getElementById('csgbYeniKonuAdi').value,
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
  };
  const sonuc = csgbDenetimKaydet(veriler, _csgbDuzenlenenId);
  if (!sonuc.basarili) { document.getElementById('csgbHata').textContent = sonuc.hata; return; }
  csgbDenetimModalKapat();
  _konuSecimDoldur();
  _csgbAcikDenetimId = sonuc.denetim.id;
  csgbCiz();
}

// ==================== DENETİM DETAYI ====================

function _csgbMetinHucresi(k) {
  const acik = _csgbAcikMetinler.has(k.id);
  const ek = [];
  if (k.aciklama) ek.push(`<div style="margin-top:6px;">${_usKacir(k.aciklama)}</div>`);
  if (k.duzelticiFaaliyet) ek.push(`<div style="margin-top:6px;"><b>Gerekli tedbir:</b> ${_usKacir(k.duzelticiFaaliyet)}</div>`);
  if (k.yasalDayanak) ek.push(`<div style="margin-top:6px; color:var(--metin-soluk);"><b>Mevzuat:</b> ${_usKacir(k.yasalDayanak)}</div>`);
  return `
    <div class="${acik ? '' : 'us-tanim-hucre'}" style="white-space:pre-wrap;">${_usKacir(k.baslik)}</div>
    ${acik ? ek.join('') : ''}
    <a href="#" data-csgb-metin="${k.id}" style="font-size:11.5px;">${acik ? '▲ Kısalt' : '▼ Tam metin' + (ek.length ? ' / tedbir / mevzuat' : '')}</a>`;
}

function _csgbNotlarHucresi(k) {
  if (!k.toplantiNotlari.length) return '<span style="color:var(--metin-soluk);">-</span>';
  return k.toplantiNotlari.map(n => `<div style="margin-bottom:5px;"><b>${gunAyYil(n.tarih)}:</b> ${_usKacir(n.not)}</div>`).join('');
}

function _csgbKanitHucresi(k) {
  const liste = Array.isArray(k.kanitlar) ? k.kanitlar : [];
  if (!liste.length) return '<span style="color:var(--metin-soluk);">-</span>';
  return liste.map((x, i) => `<a href="#" data-csgb-kanit="${k.id}|${i}" title="${_usKacir(x.ad)}" style="display:block; font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${x.tur === 'foto' ? '🖼️' : '📄'} ${_usKacir(x.ad)}</a>`).join('');
}

function _csgbDetayCiz(kutu) {
  document.getElementById('csgbYeniBtn').style.display = 'none';
  const d = csgbDenetimGetir(_csgbAcikDenetimId);
  const tumMaddeler = csgbMaddeleriniGetir(d.id);
  const arama = (document.getElementById('csgbMaddeArama') || {}).value || '';
  let maddeler = tumMaddeler;
  if (_csgbMaddeFiltre === 'acik') maddeler = maddeler.filter(k => k.durum !== 'Kapalı' && k.durum !== 'İptal');
  else if (_csgbMaddeFiltre === 'tamamlanan') maddeler = maddeler.filter(k => k.durum === 'Kapalı');
  else if (_csgbMaddeFiltre === 'gecikmis') maddeler = maddeler.filter(k => k.durumGoruntu === 'Gecikmiş');
  if (arama.trim()) {
    const a = arama.trim().toLocaleLowerCase('tr');
    maddeler = maddeler.filter(k => [k.denetimMaddeNo, k.maddeKonusu, k.baslik, k.sorumlu].some(x => String(x || '').toLocaleLowerCase('tr').includes(a)));
  }
  const toplantilar = csgbToplantilariniGetir(d.id);
  const kart = (etiket, deger) => `<div class="istatistik-kutu"><span>${etiket}</span><b>${deger}</b></div>`;

  kutu.innerHTML = `
    <a href="#" id="csgbGeriLink" class="geri-link">← Tüm ÇSGB Denetimleri</a>
    <div class="kart" style="margin:10px 0 14px;">
      <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap;">
        <div>
          <h3 style="margin:0 0 4px;">${_usKacir(_csgbBaslik(d))}</h3>
          <div style="font-size:12.5px; line-height:1.7;">
            ${_usKacir(d.denetimTuru)}${d.raporNo ? ' · Rapor No: <b>' + _usKacir(d.raporNo) + '</b>' : ''}${d.raporTarihi ? ' · Rapor Tarihi: <b>' + gunAyYil(d.raporTarihi) + '</b>' : ''}${d.denetimTarihi ? ' · Denetim: ' + gunAyYil(d.denetimTarihi) : ''}<br>
            ${d.tebligTarihi ? 'Tebliğ: ' + gunAyYil(d.tebligTarihi) + ' · ' : ''}${d.verilenSureGun ? 'Süre: ' + d.verilenSureGun + ' gün · ' : ''}${d.sonGidermeTarihi ? 'Son Giderme: <b>' + gunAyYil(d.sonGidermeTarihi) + '</b> ' : ''}${_csgbKalanGunRozeti(d)}
            ${d.mufettisler ? '<br>Müfettiş: ' + _usKacir(d.mufettisler) : ''}${d.bildirimTarihi ? ' · Bakanlığa bildirim: ' + gunAyYil(d.bildirimTarihi) : ''}
            ${d.notlar ? '<br><span style="color:var(--metin-soluk);">' + _usKacir(d.notlar) + '</span>' : ''}
          </div>
        </div>
        <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:flex-start;">
          <button type="button" class="ikincil" id="csgbDenetimDuzenleBtn">Denetimi Düzenle</button>
          <button type="button" class="ikincil" id="csgbRaporWordBtn">📄 Takip Raporu (Word)</button>
          <button type="button" class="ikincil" id="csgbRaporPdfBtn" title="Tablodaki maddeye tıklayınca PDF içinde tam metnine gider">📕 Takip Raporu (PDF)</button>
          <button type="button" class="ikincil" id="csgbPptxBtn" title="Son takip toplantısının (toplantı yoksa sıradaki toplantının) sunumu: genel durum, açık maddeler, tamamlananlar">📊 Toplantı Sunumu (PPTX)</button>
          <button type="button" class="ikincil" id="csgbExcelBtn">Dışa Aktar (Excel)</button>
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
            <td>${_usKacir(t.yer) || '-'}</td>
            <td>${t.katilimcilar ? t.katilimcilar.split('\n').filter(s => s.trim()).length : 0}</td>
            <td>${Object.keys(t.maddeNotlari || {}).length}</td>
            <td>${gunAyYil(t.sonrakiToplantiTarihi) || '-'}</td>
          </tr>`).join('') : '<tr><td colspan="6">Henüz takip toplantısı yapılmadı.</td></tr>'}</tbody>
      </table>
    </div>

    <div class="card-title" style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; margin:22px 0 8px;">
      <h3 style="margin:0; font-size:15px;">Denetim Maddeleri</h3>
      <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
        <input type="text" id="csgbMaddeArama" class="arama-kutusu" placeholder="No, konu, metin, sorumlu..." value="${_usKacir(arama)}" style="width:220px; margin:0;">
        <select id="csgbMaddeFiltre" style="width:auto; margin:0;">
          <option value="hepsi">Tüm Maddeler</option>
          <option value="acik">Açık Olanlar</option>
          <option value="gecikmis">Gecikmiş</option>
          <option value="tamamlanan">Tamamlananlar</option>
        </select>
        <button type="button" class="ikincil" id="csgbExcelAktarBtn" title="Excel'deki maddeleri bu denetime aktarır (Madde No, Uygunsuzluk Konusu, Uygunsuzluk Tanımı, Faaliyet Önerisi, Yasal Dayanak, Sorumlu, Termin...)">İçe Aktar (Excel)</button>
        <button type="button" class="ikincil" id="csgbSablonBtn">Şablon</button>
        <button type="button" class="birincil" style="width:auto;" id="csgbMaddeEkleBtn">+ Madde Ekle</button>
      </div>
    </div>
    <div class="tablo-scroll">
      <table class="veri-tablosu" style="table-layout:fixed; min-width:1290px;">
        <colgroup><col style="width:90px;"><col style="width:60px;"><col style="width:150px;"><col style="width:330px;"><col style="width:270px;"><col style="width:150px;"><col style="width:85px;"><col style="width:120px;"><col style="width:100px;"></colgroup>
        <thead><tr><th>İşlemler</th><th>No</th><th>Uygunsuzluk Konusu</th><th>Uygunsuzluk</th><th>Toplantı Notları</th><th>Kanıtlar</th><th>Termin</th><th>Sorumlu</th><th>Durum</th></tr></thead>
        <tbody>${maddeler.length ? maddeler.map(k => `
          <tr>
            <td><button type="button" class="tablo-buton" data-csgb-madde-duzenle="${k.id}">Düzenle</button></td>
            <td><b>${_usKacir(k.denetimMaddeNo) || '-'}</b></td>
            <td>${_usKacir(k.maddeKonusu) || '-'}</td>
            <td style="font-size:12.5px;">${_csgbMetinHucresi(k)}</td>
            <td style="font-size:12px;">${_csgbNotlarHucresi(k)}</td>
            <td>${_csgbKanitHucresi(k)}</td>
            <td>${gunAyYil(k.termin) || '-'}</td>
            <td>${_usKacir(k.sorumlu) || '-'}</td>
            <td><span class="genel-rozet rozet-${usRozetSinifAdi(k.durumGoruntu)}">${_usKacir(csgbDurumEtiketi(k.durumGoruntu))}</span>${k.kapanisTarihi && k.durum === 'Kapalı' ? '<div style="font-size:11px; color:var(--metin-soluk); margin-top:3px;">' + gunAyYil(k.kapanisTarihi) + '</div>' : ''}</td>
          </tr>`).join('') : `<tr><td colspan="9">${tumMaddeler.length ? 'Filtreye uyan madde yok.' : 'Henüz madde girilmedi. "+ Madde Ekle" ya da "İçe Aktar (Excel)" ile rapordaki maddeleri girin.'}</td></tr>`}</tbody>
      </table>
    </div>
  `;

  document.getElementById('csgbMaddeFiltre').value = _csgbMaddeFiltre;
  document.getElementById('csgbGeriLink').addEventListener('click', e => { e.preventDefault(); _csgbAcikDenetimId = null; csgbCiz(); });
  document.getElementById('csgbDenetimDuzenleBtn').addEventListener('click', () => csgbDenetimModalAc(d.id));
  document.getElementById('csgbYeniToplantiBtn').addEventListener('click', () => csgbToplantiModalAc(null));
  document.getElementById('csgbMaddeEkleBtn').addEventListener('click', () => {
    if (!d.konuVarMi) { alert('Bu denetimin bağlı olduğu konu silinmiş. Önce "Denetimi Düzenle" ile konu bağlayın.'); return; }
    kayitModalAc(null, {
      konuId: d.konuId,
      kaynakTuru: 'ÇSGB Denetimi',
      termin: d.sonGidermeTarihi,
      bildirimTarihi: d.tebligTarihi || d.raporTarihi || d.denetimTarihi
    });
  });
  document.getElementById('csgbMaddeFiltre').addEventListener('change', e => { _csgbMaddeFiltre = e.target.value; csgbCiz(); });
  document.getElementById('csgbMaddeArama').addEventListener('input', () => {
    csgbCiz();
    const girdi = document.getElementById('csgbMaddeArama');
    girdi.focus();
    girdi.setSelectionRange(girdi.value.length, girdi.value.length);
  });
  document.getElementById('csgbSablonBtn').addEventListener('click', () => excelSablonIndir(CSGB_SABLON_KOLONLARI, 'csgb_madde_sablonu.xlsx'));
  document.getElementById('csgbRaporPdfBtn').addEventListener('click', async () => {
    const btn = document.getElementById('csgbRaporPdfBtn');
    btn.disabled = true; btn.textContent = 'PDF hazırlanıyor...';
    try { await csgbTakipRaporuPdfOlustur(d.id); }
    catch (hata) { console.error(hata); alert('PDF üretilemedi: ' + (hata.message || hata)); }
    finally { btn.disabled = false; btn.textContent = '📕 Takip Raporu (PDF)'; }
  });
  document.getElementById('csgbPptxBtn').addEventListener('click', async () => {
    const btn = document.getElementById('csgbPptxBtn');
    const son = toplantilar[toplantilar.length - 1];
    btn.disabled = true; btn.textContent = 'Sunum hazırlanıyor...';
    try { await csgbToplantiPptxOlustur(d.id, son ? son.id : null); }
    catch (hata) { console.error(hata); alert('Sunum üretilemedi: ' + (hata.message || hata)); }
    finally { btn.disabled = false; btn.textContent = '📊 Toplantı Sunumu (PPTX)'; }
  });
  document.getElementById('csgbExcelAktarBtn').addEventListener('click', () => {
    if (!d.konuVarMi) { alert('Bu denetimin bağlı olduğu konu silinmiş. Önce "Denetimi Düzenle" ile konu bağlayın.'); return; }
    // Mevcut içe aktarım akışı seçili konuya yazar: önce denetimin konusunu seç.
    _secilenKonuId = d.konuId;
    _konuSecimDoldur();
    document.getElementById('konuSecim').value = d.konuId;
    _secilenKonuId = d.konuId;
    _usBolumFiltreDoldur();
    document.getElementById('iceAktarDosya').click();
  });
  document.getElementById('csgbExcelBtn').addEventListener('click', () => csgbExcelDisaAktar(d.id));
  document.getElementById('csgbRaporWordBtn').addEventListener('click', async () => {
    const btn = document.getElementById('csgbRaporWordBtn');
    const tamMetin = await onayModali('Raporun sonuna maddelerin tam metni (gerekli tedbir, mevzuat) ve kanıt fotoğrafları "Ek" olarak eklensin mi? Hayır derseniz sadece kısa takip tablosu üretilir.', 'Evet, ekle');
    btn.disabled = true; btn.textContent = 'Hazırlanıyor...';
    try { await csgbTakipRaporuWordOlustur(d.id, tamMetin); }
    catch (hata) { console.error(hata); alert('Rapor üretilemedi: ' + (hata.message || hata)); }
    finally { btn.disabled = false; btn.textContent = '📄 Takip Raporu (Word)'; }
  });

  kutu.querySelectorAll('[data-csgb-metin]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    const id = a.getAttribute('data-csgb-metin');
    if (_csgbAcikMetinler.has(id)) _csgbAcikMetinler.delete(id); else _csgbAcikMetinler.add(id);
    csgbCiz();
  }));
  kutu.querySelectorAll('[data-csgb-kanit]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    const [kayitId, i] = a.getAttribute('data-csgb-kanit').split('|');
    const kayit = uygunsuzlukIdIleGetirRepo(kayitId);
    const kanit = kayit && kayit.kanitlar ? kayit.kanitlar[Number(i)] : null;
    if (kanit) belgeDosyasiniAc(kanit.ref);
  }));
  kutu.querySelectorAll('[data-csgb-madde-duzenle]').forEach(b => b.addEventListener('click', () => kayitModalAc(uygunsuzlukIdIleGetirRepo(b.getAttribute('data-csgb-madde-duzenle')))));
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

// ==================== TAKİP TOPLANTISI ====================

function csgbToplantiModalAc(toplantiId) {
  const d = csgbDenetimGetir(_csgbAcikDenetimId);
  if (!d) return;
  _csgbToplantiId = toplantiId;
  const t = toplantiId ? csgbToplantilariTumunuGetir().find(x => x.id === toplantiId) : null;
  // Yeni toplantıda katılımcılar/yer bir önceki toplantıdan kopyalanır.
  const onceki = csgbToplantilariniGetir(d.id).slice(-1)[0];
  document.getElementById('csgbToplantiBaslik').textContent = (t ? 'Takip Toplantısını Düzenle — ' : 'Yeni Takip Toplantısı — ') + _csgbBaslik(d);
  document.getElementById('csgbTopTarih').value = t ? t.tarih : bugunIso();
  document.getElementById('csgbTopSonraki').value = t ? t.sonrakiToplantiTarihi : '';
  document.getElementById('csgbTopYer').value = t ? t.yer : (onceki ? onceki.yer : '');
  document.getElementById('csgbTopKatilimcilar').value = t ? t.katilimcilar : (onceki ? onceki.katilimcilar : '');
  document.getElementById('csgbTopGenel').value = t ? t.genelNotlar : '';
  document.getElementById('csgbTopKapalilariGoster').checked = false;
  document.getElementById('csgbTopHata').textContent = '';
  _csgbTopTaslakNot = Object.assign({}, t ? t.maddeNotlari : {});
  _csgbTopTaslakDurum = {};
  _csgbTopMaddeleriCiz();
  document.getElementById('csgbToplantiKatmani').classList.add('acik');
}

function csgbToplantiModalKapat() {
  document.getElementById('csgbToplantiKatmani').classList.remove('acik');
  _csgbToplantiId = null;
}

function _csgbTopTaslagiTopla() {
  document.querySelectorAll('#csgbTopMaddeGovde [data-top-not]').forEach(el => { _csgbTopTaslakNot[el.getAttribute('data-top-not')] = el.value; });
  document.querySelectorAll('#csgbTopMaddeGovde [data-top-durum]').forEach(el => { _csgbTopTaslakDurum[el.getAttribute('data-top-durum')] = el.value; });
}

function _csgbTopMaddeleriCiz() {
  const kapalilar = document.getElementById('csgbTopKapalilariGoster').checked;
  const maddeler = csgbMaddeleriniGetir(_csgbAcikDenetimId).filter(k =>
    kapalilar || (k.durum !== 'Kapalı' && k.durum !== 'İptal') || (_csgbTopTaslakNot[k.id] || '').trim());
  const govde = document.getElementById('csgbTopMaddeGovde');
  if (!maddeler.length) {
    govde.innerHTML = '<tr><td colspan="4">Gösterilecek madde yok.</td></tr>';
    return;
  }
  govde.innerHTML = maddeler.map(k => {
    const durum = _csgbTopTaslakDurum[k.id] || k.durum;
    const oncekiNotlar = k.toplantiNotlari.filter(n => n.tarih !== document.getElementById('csgbTopTarih').value);
    return `
    <tr>
      <td><b>${_usKacir(k.denetimMaddeNo) || '-'}</b></td>
      <td style="font-size:12px;">
        ${k.maddeKonusu ? '<b>' + _usKacir(k.maddeKonusu) + '</b><br>' : ''}
        <div class="us-tanim-hucre" title="${_usKacir(k.baslik)}">${_usKacir(k.baslik)}</div>
        <div style="color:var(--metin-soluk); margin-top:3px;">Sorumlu: ${_usKacir(k.sorumlu) || '-'} · Termin: ${gunAyYil(k.termin) || '-'}</div>
        ${oncekiNotlar.length ? `<details style="margin-top:3px;"><summary style="cursor:pointer; color:var(--metin-soluk);">Önceki notlar (${oncekiNotlar.length})</summary>${oncekiNotlar.map(n => `<div><b>${gunAyYil(n.tarih)}:</b> ${_usKacir(n.not)}</div>`).join('')}</details>` : ''}
      </td>
      <td><textarea data-top-not="${k.id}" rows="3" style="margin:0; font-size:12.5px;" placeholder="Görüşülen / yapılan çalışma...">${_usKacir(_csgbTopTaslakNot[k.id] || '')}</textarea></td>
      <td><select data-top-durum="${k.id}" style="margin:0;">${UYGUNSUZLUK_DURUMLARI.map(s => `<option value="${s}" ${s === durum ? 'selected' : ''}>${csgbDurumEtiketi(s)}</option>`).join('')}</select></td>
    </tr>`;
  }).join('');
}

function _csgbToplantiKaydetTiklandi() {
  _csgbTopTaslagiTopla();
  const durumGuncellemeleri = {};
  document.querySelectorAll('#csgbTopMaddeGovde [data-top-durum]').forEach(el => {
    const kayit = uygunsuzlukIdIleGetirRepo(el.getAttribute('data-top-durum'));
    if (kayit && kayit.durum !== el.value) durumGuncellemeleri[kayit.id] = el.value;
  });
  const sonuc = csgbToplantiKaydet({
    id: _csgbToplantiId || undefined,
    denetimId: _csgbAcikDenetimId,
    tarih: document.getElementById('csgbTopTarih').value,
    sonrakiToplantiTarihi: document.getElementById('csgbTopSonraki').value,
    yer: document.getElementById('csgbTopYer').value,
    katilimcilar: document.getElementById('csgbTopKatilimcilar').value,
    genelNotlar: document.getElementById('csgbTopGenel').value,
    maddeNotlari: _csgbTopTaslakNot
  }, durumGuncellemeleri);
  if (!sonuc.basarili) { document.getElementById('csgbTopHata').textContent = sonuc.hata; return; }
  csgbToplantiModalKapat();
  csgbCiz();
}

// ==================== EXCEL ====================

function csgbExcelDisaAktar(denetimId) {
  const d = csgbDenetimGetir(denetimId);
  const satirlar = csgbMaddeleriniGetir(denetimId).map(k => ({
    denetimMaddeNo: k.denetimMaddeNo,
    maddeKonusu: k.maddeKonusu,
    baslik: k.baslik,
    duzelticiFaaliyet: k.duzelticiFaaliyet,
    yasalDayanak: k.yasalDayanak,
    toplantiNotlari: k.toplantiNotlari.map(n => gunAyYil(n.tarih) + ': ' + n.not).join('\n'),
    kanitlar: (k.kanitlar || []).map(x => x.ad).join(', '),
    termin: gunAyYil(k.termin),
    sorumlu: k.sorumlu,
    durum: csgbDurumEtiketi(k.durumGoruntu),
    kapanisTarihi: gunAyYil(k.kapanisTarihi)
  }));
  excelDisaAktar(satirlar, [
    { anahtar: 'denetimMaddeNo', baslik: 'Madde No' },
    { anahtar: 'maddeKonusu', baslik: 'Uygunsuzluk Konusu' },
    { anahtar: 'baslik', baslik: 'Uygunsuzluk Tanımı' },
    { anahtar: 'duzelticiFaaliyet', baslik: 'Faaliyet Önerisi' },
    { anahtar: 'yasalDayanak', baslik: 'Yasal Dayanak' },
    { anahtar: 'toplantiNotlari', baslik: 'Toplantı Notları' },
    { anahtar: 'kanitlar', baslik: 'Kanıtlar' },
    { anahtar: 'termin', baslik: 'Termin' },
    { anahtar: 'sorumlu', baslik: 'Sorumlu' },
    { anahtar: 'durum', baslik: 'Tamamlanma Durumu' },
    { anahtar: 'kapanisTarihi', baslik: 'Tamamlanma Tarihi' }
  ], 'CSGB_Takip_' + (d ? (d.raporTarihi || d.denetimTarihi || '') : '') + '.xlsx');
}

// ==================== WORD ÇIKTILARI ====================

// Bir fotoğraf işlenemezse (ağ/izin) rapor süresiz beklemesin: süre dolunca null.
function _csgbZamanSinirli(soz, ms) {
  return Promise.race([soz.catch(() => null), new Promise(coz => setTimeout(() => coz(null), ms))]);
}

function _csgbWordAraclari() {
  const mm = v => Math.round(v * 56.7);
  const px = v => Math.round(v * 96 / 25.4);
  const kenar = { style: docx.BorderStyle.SINGLE, size: 4, color: '94A3B8' };
  const kenarlar = { top: kenar, bottom: kenar, left: kenar, right: kenar };
  const metin = (text, o = {}) => new docx.TextRun(Object.assign({ text: String(text ?? ''), font: 'Arial', color: '111827' }, o));
  // Çok satırlı metni (\n) ayrı paragraflara böler.
  const paragraflar = (deger, o = {}) => String(deger ?? '').split('\n').map(s => new docx.Paragraph({ spacing: { after: 40 }, children: [metin(s, Object.assign({ size: 16 }, o))] }));
  const hucre = (cocuklar, genislik, opts = {}) => new docx.TableCell(Object.assign({
    width: { size: genislik, type: docx.WidthType.DXA },
    margins: { top: 50, bottom: 50, left: 70, right: 70 },
    borders: kenarlar,
    children: Array.isArray(cocuklar) ? cocuklar : [cocuklar]
  }, opts));
  const baslikHucre = (t, genislik) => hucre(new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [metin(t.toLocaleUpperCase('tr'), { bold: true, size: 15 })] }), genislik, {
    shading: { fill: 'E5E7EB', color: 'auto', type: docx.ShadingType.CLEAR }, verticalAlign: docx.VerticalAlign.CENTER
  });
  const altBilgi = new docx.Footer({ children: [new docx.Paragraph({
    alignment: docx.AlignmentType.CENTER,
    children: [new docx.TextRun({ children: ['Sayfa ', docx.PageNumber.CURRENT, ' / ', docx.PageNumber.TOTAL_PAGES], size: 16, color: '646464', font: 'Arial' })]
  })] });
  // Etiket | değer çiftlerinden oluşan bilgi tablosu (2 çift / satır).
  const bilgiTablosu = (ciftler, sayfaGen) => {
    const g = [0.17, 0.33, 0.17, 0.33].map(o => Math.round(sayfaGen * o));
    const satirlar = [];
    for (let i = 0; i < ciftler.length; i += 2) {
      const [a, b] = [ciftler[i], ciftler[i + 1] || ['', '']];
      satirlar.push(new docx.TableRow({ children: [
        hucre(new docx.Paragraph({ children: [metin(a[0], { bold: true, size: 17 })] }), g[0], { shading: { fill: 'F3F4F6', color: 'auto', type: docx.ShadingType.CLEAR } }),
        hucre(new docx.Paragraph({ children: [metin(a[1], { size: 17 })] }), g[1]),
        hucre(new docx.Paragraph({ children: [metin(b[0], { bold: true, size: 17 })] }), g[2], { shading: { fill: 'F3F4F6', color: 'auto', type: docx.ShadingType.CLEAR } }),
        hucre(new docx.Paragraph({ children: [metin(b[1], { size: 17 })] }), g[3])
      ] }));
    }
    return new docx.Table({ width: { size: sayfaGen, type: docx.WidthType.DXA }, columnWidths: g, layout: docx.TableLayoutType.FIXED, rows: satirlar });
  };
  return { mm, px, metin, paragraflar, hucre, baslikHucre, altBilgi, bilgiTablosu };
}

function _csgbDenetimBilgileri(d) {
  return [
    ['Rapor No', d.raporNo || '-'], ['Rapor Tarihi', gunAyYil(d.raporTarihi) || '-'],
    ['Denetim Türü', d.denetimTuru || '-'], ['Denetim Tarihi', gunAyYil(d.denetimTarihi) || '-'],
    ['Tebliğ Tarihi', gunAyYil(d.tebligTarihi) || '-'], ['Verilen Süre', d.verilenSureGun ? d.verilenSureGun + ' gün' : '-'],
    ['Son Giderme Tarihi', gunAyYil(d.sonGidermeTarihi) || '-'], ['Müfettiş(ler)', d.mufettisler || '-']
  ];
}

// Takip raporu: yatay A4. Ana tablo kısa tutulur (No, Konu, Tespit, Toplantı
// Notları, Kanıt, Termin, Sorumlu, Durum); uzun metinler (gerekli tedbir,
// mevzuat) ve kanıt fotoğrafları istenirse "Ek" bölümünde madde madde verilir.
async function csgbTakipRaporuWordOlustur(denetimId, tamMetinEki) {
  const d = csgbDenetimGetir(denetimId);
  const maddeler = csgbMaddeleriniGetir(denetimId);
  if (!maddeler.length) { alert('Bu denetimde henüz madde yok.'); return; }
  const w = _csgbWordAraclari();
  const firma = aktifFirmaGetir();
  const bugun = gunAyYil(bugunIso());
  const SAYFA_GEN = w.mm(297 - 20);
  const SUTUN = [5, 12, 27, 24, 9, 7, 9, 7].map(y => Math.round(SAYFA_GEN * y / 100));

  const satir = k => new docx.TableRow({ cantSplit: true, children: [
    w.hucre(new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [w.metin(k.denetimMaddeNo || '-', { bold: true, size: 16 })] }), SUTUN[0]),
    w.hucre(w.paragraflar(k.maddeKonusu || '-', { bold: true }), SUTUN[1]),
    w.hucre(w.paragraflar(k.baslik), SUTUN[2]),
    w.hucre(k.toplantiNotlari.length
      ? k.toplantiNotlari.map(n => new docx.Paragraph({ spacing: { after: 50 }, children: [w.metin(gunAyYil(n.tarih) + ': ', { bold: true, size: 15 }), w.metin(n.not, { size: 15 })] }))
      : [new docx.Paragraph({ children: [w.metin('-', { size: 15 })] })], SUTUN[3]),
    w.hucre((k.kanitlar || []).length
      ? k.kanitlar.map(x => new docx.Paragraph({ children: [w.metin('• ' + x.ad, { size: 14 })] }))
      : [new docx.Paragraph({ children: [w.metin('-', { size: 15 })] })], SUTUN[4]),
    w.hucre(new docx.Paragraph({ children: [w.metin(gunAyYil(k.termin) || '-', { size: 15 })] }), SUTUN[5]),
    w.hucre(w.paragraflar(k.sorumlu || '-', { size: 15 }), SUTUN[6]),
    w.hucre([
      new docx.Paragraph({ children: [w.metin(csgbDurumEtiketi(k.durumGoruntu), { bold: true, size: 15, color: k.durum === 'Kapalı' ? '15803D' : (k.durumGoruntu === 'Gecikmiş' ? 'B91C1C' : '111827') })] }),
      ...(k.durum === 'Kapalı' && k.kapanisTarihi ? [new docx.Paragraph({ children: [w.metin(gunAyYil(k.kapanisTarihi), { size: 14, color: '64748B' })] })] : [])
    ], SUTUN[7])
  ] });

  const BASLIKLAR = ['No', 'Uygunsuzluk Konusu', 'Uygunsuzluk', 'Toplantı Notları', 'Kanıtlar', 'Termin', 'Sorumlu', 'Durum'];
  const anaTablo = new docx.Table({
    width: { size: SAYFA_GEN, type: docx.WidthType.DXA },
    columnWidths: SUTUN,
    layout: docx.TableLayoutType.FIXED,
    rows: [new docx.TableRow({ tableHeader: true, children: BASLIKLAR.map((b, i) => w.baslikHucre(b, SUTUN[i])) }), ...maddeler.map(satir)]
  });

  const toplantilar = csgbToplantilariniGetir(denetimId);
  const ozetMetni = `Toplam ${maddeler.length} madde · Tamamlanan ${d.kapaliSayisi} · Açık ${d.acikSayisi} · Gecikmiş ${d.gecikmisSayisi} · İlerleme %${d.ilerlemeYuzde} · Takip toplantısı ${toplantilar.length}` +
    (toplantilar.length ? ` (${toplantilar.map(t => gunAyYil(t.tarih)).join(', ')})` : '');

  const ilkBolum = [
    new docx.Paragraph({ children: [w.metin(firma ? firma.ad : '', { bold: true, size: 20, color: '374151' })] }),
    new docx.Paragraph({ spacing: { after: w.mm(3) }, border: { bottom: { style: docx.BorderStyle.SINGLE, size: 12, color: '111827', space: 4 } },
      children: [w.metin('ÇSGB DENETİMİ UYGUNSUZLUK GİDERME TAKİP RAPORU', { bold: true, size: 28 })] }),
    w.bilgiTablosu(_csgbDenetimBilgileri(d), SAYFA_GEN),
    new docx.Paragraph({ spacing: { before: w.mm(3), after: w.mm(3) }, children: [w.metin(ozetMetni, { bold: true, size: 18 })] }),
    anaTablo,
    new docx.Paragraph({ alignment: docx.AlignmentType.RIGHT, spacing: { before: w.mm(4) }, children: [w.metin('Rapor Tarihi: ' + bugun, { size: 16, color: '374151' })] })
  ];

  const sayfa = { size: { orientation: docx.PageOrientation.LANDSCAPE }, margin: { top: w.mm(10), right: w.mm(10), bottom: w.mm(12), left: w.mm(10), footer: w.mm(4) } };
  const bolumler = [{ properties: { page: sayfa }, footers: { default: w.altBilgi }, children: ilkBolum }];

  if (tamMetinEki) {
    const FOTO_GEN = w.px(60), FOTO_YUK = w.px(45);
    const ek = [new docx.Paragraph({ spacing: { after: w.mm(3) }, border: { bottom: { style: docx.BorderStyle.SINGLE, size: 12, color: '111827', space: 4 } },
      children: [w.metin('EK: MADDELERİN TAM METNİ VE KANITLAR', { bold: true, size: 26 })] })];
    for (const k of maddeler) {
      ek.push(new docx.Paragraph({ keepNext: true, spacing: { before: w.mm(4), after: 60 }, children: [
        w.metin(`Madde ${k.denetimMaddeNo || '-'}`, { bold: true, size: 20 }),
        w.metin(k.maddeKonusu ? ' — ' + k.maddeKonusu : '', { bold: true, size: 20 }),
        w.metin('   [' + csgbDurumEtiketi(k.durumGoruntu) + ']', { size: 16, color: '374151' })
      ] }));
      ek.push(...w.paragraflar(k.baslik, { bold: true, size: 18 }));
      if (k.aciklama) ek.push(...w.paragraflar(k.aciklama, { size: 17 }));
      if (k.duzelticiFaaliyet) ek.push(new docx.Paragraph({ spacing: { before: 60 }, children: [w.metin('Gerekli tedbir: ', { bold: true, size: 17 }), w.metin(k.duzelticiFaaliyet, { size: 17 })] }));
      if (k.yasalDayanak) ek.push(new docx.Paragraph({ spacing: { before: 60 }, children: [w.metin('Mevzuat: ', { bold: true, size: 17 }), w.metin(k.yasalDayanak, { size: 17, color: '374151' })] }));
      if (k.kanitAciklamasi) ek.push(new docx.Paragraph({ spacing: { before: 60 }, children: [w.metin('Kapanış açıklaması: ', { bold: true, size: 17 }), w.metin(k.kanitAciklamasi, { size: 17 })] }));
      const kanitlar = k.kanitlar || [];
      if (kanitlar.length) {
        ek.push(new docx.Paragraph({ spacing: { before: 60 }, children: [w.metin('Kanıtlar: ', { bold: true, size: 17 }), w.metin(kanitlar.map(x => x.ad + (x.tur === 'pdf' ? ' (PDF)' : '')).join(', '), { size: 17 })] }));
        // Fotoğraf kanıtları 4'lü sıralar halinde küçük görsel olarak.
        const fotolar = [];
        for (const x of kanitlar.filter(x => x.tur === 'foto')) {
          const url = await fotoBuyukCoz(x.ref);
          const veri = url ? await _csgbZamanSinirli(_ucWordFotoVerisi(url, FOTO_GEN, FOTO_YUK), 10000) : null;
          if (veri) fotolar.push(new docx.ImageRun({ data: veri, transformation: { width: FOTO_GEN, height: FOTO_YUK } }));
        }
        for (let i = 0; i < fotolar.length; i += 4) {
          const grup = [];
          fotolar.slice(i, i + 4).forEach((f, j) => { if (j) grup.push(w.metin('   ')); grup.push(f); });
          ek.push(new docx.Paragraph({ spacing: { before: 80 }, children: grup }));
        }
      }
    }
    bolumler.push({ properties: { page: sayfa }, footers: { default: w.altBilgi }, children: ek });
  }

  const doc = new docx.Document({ styles: { default: { document: { run: { font: 'Arial', size: 16 } } } }, sections: bolumler });
  const blob = await docx.Packer.toBlob(doc);
  saveAs(blob, `CSGB_Takip_Raporu_${bugun.replace(/\./g, '-')}.docx`);
}

// ==================== TAKİP RAPORU (PDF, tıklanabilir) ====================
// Yatay A4. Ana tabloda madde metni kısaltılır; satıra tıklanınca PDF içinde
// o maddenin tam metninin (tedbir, mevzuat, toplantı notları, kanıtlar) olduğu
// ek sayfaya gidilir, oradaki "↑ Tabloya dön" ile geri dönülür. Sayfalar
// html2canvas ile görüntüye çevrilir (Türkçe karakterler sorunsuz), bağlantılar
// jsPDF link() ile görüntünün üstüne eklenir.
async function csgbTakipRaporuPdfOlustur(denetimId) {
  if (!window.jspdf || typeof html2canvas === 'undefined') { alert('PDF kütüphanesi yüklenemedi (internet bağlantısını kontrol edin).'); return; }
  const d = csgbDenetimGetir(denetimId);
  const maddeler = csgbMaddeleriniGetir(denetimId);
  if (!maddeler.length) { alert('Bu denetimde henüz madde yok.'); return; }
  const firma = aktifFirmaGetir();
  const bugun = gunAyYil(bugunIso());
  const toplantilar = csgbToplantilariniGetir(denetimId);
  const K = _usKacir;
  const kisalt = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; };
  const W = 1123, H = 794, PAD = 32, ALT = 40;
  const DURUM_RENK = { 'Tamamlandı': '#15803d', 'Gecikmiş': '#b91c1c', 'Açık': '#b45309', 'Devam Ediyor': '#1d4ed8', 'Onay Bekliyor': '#7c3aed', 'İptal': '#64748b' };

  // Fotoğraf kanıtlarını önceden data URL'e çevir (html2canvas CORS sorunu yaşamasın).
  const fotoVeri = {};
  await Promise.all(maddeler.flatMap(k => (k.kanitlar || []).filter(x => x.tur === 'foto').map(async x => {
    const url = await _csgbZamanSinirli(fotoBuyukCoz(x.ref), 10000);
    if (!url) return;
    if (url.startsWith('data:')) { fotoVeri[x.ref] = url; return; }
    fotoVeri[x.ref] = await _csgbZamanSinirli(fetch(url).then(r => r.blob()).then(b => new Promise(coz => { const o = new FileReader(); o.onload = () => coz(o.result); o.readAsDataURL(b); })), 10000);
  })));

  const kap = document.createElement('div');
  kap.style.cssText = `position:fixed; left:-30000px; top:0; width:${W}px; font-family:Arial, Helvetica, sans-serif; color:#111827;`;
  kap.innerHTML = `<style>
    .cp-sayfa { width:${W}px; height:${H}px; padding:${PAD}px ${PAD}px ${ALT}px; box-sizing:border-box; position:relative; background:#fff; overflow:hidden; }
    .cp-ic { height:${H - PAD - ALT}px; overflow:hidden; }
    .cp-alt { position:absolute; left:${PAD}px; right:${PAD}px; bottom:12px; font-size:10px; color:#64748b; display:flex; justify-content:space-between; }
    .cp-tablo { width:100%; border-collapse:collapse; table-layout:fixed; font-size:10.5px; }
    .cp-tablo th { background:#e5e7eb; border:1px solid #94a3b8; padding:5px 4px; font-size:9.5px; text-transform:uppercase; }
    .cp-tablo td { border:1px solid #cbd5e1; padding:4px 5px; vertical-align:top; line-height:1.35; }
    .cp-tablo tr.cp-satir td:nth-child(-n+3) { color:#1d4ed8; }
    .cp-bilgi { width:100%; border-collapse:collapse; font-size:11px; margin-bottom:8px; }
    .cp-bilgi td { border:1px solid #cbd5e1; padding:4px 6px; }
    .cp-bilgi td:nth-child(odd) { background:#f3f4f6; font-weight:bold; width:15%; }
    .cp-ek { font-size:11.5px; line-height:1.45; margin-bottom:8px; }
    .cp-ek-bas { border-top:2px solid #111827; padding-top:6px; margin-top:6px; display:flex; justify-content:space-between; align-items:baseline; gap:10px; }
    .cp-foto { height:150px; max-width:220px; object-fit:contain; border:1px solid #cbd5e1; margin:0 8px 6px 0; }
  </style>`;
  document.body.appendChild(kap);

  const sayfalar = [];
  const yeniSayfa = () => {
    const s = document.createElement('div');
    s.className = 'cp-sayfa';
    s.innerHTML = '<div class="cp-ic"></div><div class="cp-alt"></div>';
    kap.appendChild(s);
    sayfalar.push(s);
    return s.querySelector('.cp-ic');
  };
  const tasti = ic => ic.scrollHeight > ic.clientHeight + 1;

  try {
    // ---- Ana tablo sayfaları ----
    const SUTUN = [5, 12, 30, 25, 8, 7, 8, 5];
    const tabloBasi = () => `<table class="cp-tablo"><colgroup>${SUTUN.map(y => `<col style="width:${y}%">`).join('')}</colgroup>
      <thead><tr>${['No', 'Uygunsuzluk Konusu', 'Uygunsuzluk', 'Toplantı Notları', 'Kanıt', 'Termin', 'Sorumlu', 'Durum'].map(b => `<th>${b}</th>`).join('')}</tr></thead><tbody></tbody></table>`;
    let ic = yeniSayfa();
    ic.innerHTML = `
      <div style="font-size:13px; font-weight:bold; color:#374151;">${K(firma ? firma.ad : '')}</div>
      <div style="font-size:19px; font-weight:bold; border-bottom:2px solid #111827; padding-bottom:4px; margin-bottom:8px;">ÇSGB DENETİMİ UYGUNSUZLUK GİDERME TAKİP RAPORU</div>
      <table class="cp-bilgi">${_csgbDenetimBilgileri(d).reduce((a, c, i, arr) => i % 2 ? a : a + `<tr><td>${K(c[0])}</td><td>${K(c[1])}</td><td>${K((arr[i + 1] || ['', ''])[0])}</td><td>${K((arr[i + 1] || ['', ''])[1])}</td></tr>`, '')}</table>
      <div style="font-size:12px; font-weight:bold; margin-bottom:4px;">Toplam ${maddeler.length} madde · Tamamlanan ${d.kapaliSayisi} · Açık ${d.acikSayisi} · Gecikmiş ${d.gecikmisSayisi} · İlerleme %${d.ilerlemeYuzde} · Takip toplantısı ${toplantilar.length}</div>
      <div style="font-size:10.5px; color:#1d4ed8; margin-bottom:6px;">Maddenin satırına tıklayarak tam metnine (gerekli tedbir, mevzuat, tüm toplantı notları ve kanıtlar) gidebilirsiniz.</div>
      ${tabloBasi()}`;
    let govde = ic.querySelector('tbody');
    const satirKonum = {}; // maddeId -> sayfa index (ana tablo)
    maddeler.forEach(k => {
      const durum = csgbDurumEtiketi(k.durumGoruntu);
      const tr = document.createElement('tr');
      tr.className = 'cp-satir';
      tr.setAttribute('data-madde', k.id);
      tr.innerHTML = `
        <td style="font-weight:bold; text-align:center;">${K(k.denetimMaddeNo || '-')}</td>
        <td style="font-weight:bold;">${K(k.maddeKonusu || '-')}</td>
        <td>${K(kisalt(k.baslik, 330))}</td>
        <td>${k.toplantiNotlari.length ? k.toplantiNotlari.map(n => `<div><b>${gunAyYil(n.tarih)}:</b> ${K(kisalt(n.not, 260))}</div>`).join('') : '-'}</td>
        <td>${(k.kanitlar || []).length ? (k.kanitlar.length + ' kanıt') : '-'}</td>
        <td>${gunAyYil(k.termin) || '-'}</td>
        <td>${K(k.sorumlu || '-')}</td>
        <td style="font-weight:bold; color:${DURUM_RENK[durum] || '#111827'};">${K(durum)}${k.durum === 'Kapalı' && k.kapanisTarihi ? `<div style="font-weight:normal; color:#64748b;">${gunAyYil(k.kapanisTarihi)}</div>` : ''}</td>`;
      govde.appendChild(tr);
      if (tasti(ic) && govde.children.length > 1) {
        govde.removeChild(tr);
        ic = yeniSayfa();
        ic.innerHTML = tabloBasi();
        govde = ic.querySelector('tbody');
        govde.appendChild(tr);
      }
      satirKonum[k.id] = sayfalar.length - 1;
    });

    // ---- Ek: tam metinler ----
    const ekKonum = {}; // maddeId -> sayfa index (ek)
    ic = yeniSayfa();
    ic.innerHTML = '<div style="font-size:17px; font-weight:bold; border-bottom:2px solid #111827; padding-bottom:4px; margin-bottom:6px;">EK: MADDELERİN TAM METNİ, TOPLANTI NOTLARI VE KANITLAR</div>';
    const ekle = (html, bas) => {
      const el = document.createElement('div');
      el.className = 'cp-ek';
      el.innerHTML = html;
      ic.appendChild(el);
      if (tasti(ic) && ic.children.length > 1) {
        ic.removeChild(el);
        ic = yeniSayfa();
        ic.appendChild(el);
      }
      return el;
    };
    for (const k of maddeler) {
      const durum = csgbDurumEtiketi(k.durumGoruntu);
      // Başlık ile tespit metni tek blok: başlık sayfa sonunda yalnız kalmasın.
      const bas = ekle(`
        <div class="cp-ek-bas" data-ek="${k.id}">
          <div style="font-size:14px; font-weight:bold;">Madde ${K(k.denetimMaddeNo || '-')}${k.maddeKonusu ? ' — ' + K(k.maddeKonusu) : ''}
            <span style="font-size:11px; color:${DURUM_RENK[durum] || '#111827'};">[${K(durum)}]</span></div>
          <div data-geri="${k.id}" style="font-size:10.5px; color:#1d4ed8; white-space:nowrap;">↑ Tabloya dön</div>
        </div>
        <div style="font-weight:bold; margin-top:4px; white-space:pre-wrap;">${K(k.baslik)}</div>
        <div style="color:#374151; margin-top:2px;">Sorumlu: ${K(k.sorumlu || '-')} · Termin: ${gunAyYil(k.termin) || '-'}${k.kapanisTarihi && k.durum === 'Kapalı' ? ' · Tamamlanma: ' + gunAyYil(k.kapanisTarihi) : ''}</div>`);
      ekKonum[k.id] = sayfalar.indexOf(bas.closest('.cp-sayfa'));
      if (k.aciklama) ekle(`<div style="white-space:pre-wrap;">${K(k.aciklama)}</div>`);
      if (k.duzelticiFaaliyet) ekle(`<b>Gerekli tedbir:</b> <span style="white-space:pre-wrap;">${K(k.duzelticiFaaliyet)}</span>`);
      if (k.yasalDayanak) ekle(`<b>Mevzuat:</b> <span style="color:#374151;">${K(k.yasalDayanak)}</span>`);
      if (k.toplantiNotlari.length) ekle(`<b>Toplantı notları:</b>${k.toplantiNotlari.map(n => `<div style="margin-left:10px;"><b>${gunAyYil(n.tarih)}:</b> <span style="white-space:pre-wrap;">${K(n.not)}</span></div>`).join('')}`);
      if (k.kanitAciklamasi) ekle(`<b>Kapanış açıklaması:</b> ${K(k.kanitAciklamasi)}`);
      const kanitlar = k.kanitlar || [];
      if (kanitlar.length) {
        ekle(`<b>Kanıtlar:</b> ${kanitlar.map(x => K(x.ad) + (x.tur === 'pdf' ? ' (PDF)' : '')).join(', ')}`);
        const fotolar = kanitlar.filter(x => x.tur === 'foto' && fotoVeri[x.ref]);
        for (let i = 0; i < fotolar.length; i += 4) {
          const el = ekle(fotolar.slice(i, i + 4).map(x => `<img class="cp-foto" src="${fotoVeri[x.ref]}">`).join(''));
          await Promise.all(Array.from(el.querySelectorAll('img')).map(im => _csgbZamanSinirli(im.decode(), 5000)));
          if (tasti(ic) && ic.children.length > 1) { ic.removeChild(el); ic = yeniSayfa(); ic.appendChild(el); }
        }
      }
    }

    // ---- Alt bilgi ----
    sayfalar.forEach((s, i) => {
      s.querySelector('.cp-alt').innerHTML = `<span>${K(firma ? firma.ad : '')} · ÇSGB Denetimi Takip Raporu · ${bugun}</span><span>Sayfa ${i + 1} / ${sayfalar.length}</span>`;
    });

    // ---- PDF ----
    const pdf = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const MM = 297 / W;
    for (let i = 0; i < sayfalar.length; i++) {
      const s = sayfalar[i];
      const tuval = await html2canvas(s, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
      if (i) pdf.addPage();
      pdf.addImage(tuval.toDataURL('image/jpeg', 0.85), 'JPEG', 0, 0, 297, 210);
      const sk = s.getBoundingClientRect();
      const bag = (el, hedef) => {
        const r = el.getBoundingClientRect();
        pdf.link((r.left - sk.left) * MM, (r.top - sk.top) * MM, r.width * MM, r.height * MM, { pageNumber: hedef + 1 });
      };
      s.querySelectorAll('tr.cp-satir').forEach(tr => { const id = tr.getAttribute('data-madde'); if (ekKonum[id] !== undefined) bag(tr, ekKonum[id]); });
      s.querySelectorAll('[data-geri]').forEach(el => { const id = el.getAttribute('data-geri'); if (satirKonum[id] !== undefined) bag(el, satirKonum[id]); });
    }
    pdf.save(`CSGB_Takip_Raporu_${bugun.replace(/\./g, '-')}.pdf`);
  } finally {
    kap.remove();
  }
}

// ==================== TOPLANTI SUNUMU (PPTX) ====================
// Kurul/Uygunsuzluk PPTX'iyle aynı görsel dil (bkz. cikti.js
// uygunsuzlukKurulPptxOlustur). Gündem = açık maddeler + bu toplantıda notu
// olan maddeler; tamamlananlar sonda tek bir özet tabloda "Tamamlandı" olarak.
// toplantiId null ise (henüz toplantı kaydı yok) bir sonraki toplantının
// gündemi olarak üretilir.
async function csgbToplantiPptxOlustur(denetimId, toplantiId) {
  if (typeof PptxGenJS === 'undefined') { alert('PPTX kütüphanesi yüklenemedi (internet bağlantısını kontrol edin).'); return; }
  const d = csgbDenetimGetir(denetimId);
  if (!d) return;
  const t = toplantiId ? csgbToplantilariTumunuGetir().find(x => x.id === toplantiId) : null;
  const maddeler = csgbMaddeleriniGetir(denetimId);
  if (!maddeler.length) { alert('Bu denetimde henüz madde yok.'); return; }
  const gundem = maddeler.filter(k => (k.durum !== 'Kapalı' && k.durum !== 'İptal') || (t && (t.maddeNotlari[k.id] || '').trim()));
  const tamamlananlar = maddeler.filter(k => k.durum === 'Kapalı');

  const firma = aktifFirmaGetir();
  const firmaAdi = firma ? firma.ad : '';
  const logoUrl = await fotoBuyukCoz(firma && typeof firmaLogoGetir === 'function' ? firmaLogoGetir(firma.id) : '');
  // Her gündem maddesinin ilk fotoğraf kanıtı (yoksa sonrası/öncesi fotoğrafı) slaytta gösterilir.
  const fotolar = {};
  await Promise.all(gundem.map(async k => {
    const ilkFoto = (k.kanitlar || []).find(x => x.tur === 'foto');
    fotolar[k.id] = await fotoBuyukCoz(ilkFoto ? ilkFoto.ref : (k.fotoSonrasi || k.fotoOncesi || ''));
  }));
  await fotoOlculeriniHazirla(Object.values(fotolar), logoUrl);

  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  const R = { bg: 'F1F5F9', baslik: '0F172A', soluk: '64748B', cizgi: 'E2E8F0', birincil: '1D4ED8', birincilKoyu: '15316B' };
  const DURUM_RENK = {
    'Açık': { fg: 'B45309', bg: 'FEF3C7' }, 'Devam Ediyor': { fg: '1D4ED8', bg: 'DBEAFE' },
    'Onay Bekliyor': { fg: '7C3AED', bg: 'EDE9FE' }, 'Tamamlandı': { fg: '15803D', bg: 'DCFCE7' },
    'Gecikmiş': { fg: 'B91C1C', bg: 'FEE2E2' }, 'İptal': { fg: '64748B', bg: 'E2E8F0' }
  };
  const M = 0.55, SW = 13.33, SH = 7.5;
  const toplantiTarihi = gunAyYil(t ? t.tarih : bugunIso());
  const kisalt = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 3).trimEnd() + '...' : s; };

  const MASTER = 'CSGB_MASTER';
  pptx.defineSlideMaster({
    title: MASTER,
    background: { color: R.bg },
    objects: [
      { rect: { x: 0, y: SH - 0.4, w: '100%', h: 0.4, fill: { color: R.baslik } } },
      { text: { text: firmaAdi, options: { x: 0.4, y: SH - 0.4, w: 7.5, h: 0.4, fontSize: 10, color: 'CBD5E1', valign: 'middle', fontFace: 'Calibri' } } },
      { text: { text: 'ÇSGB Denetimi Takip Toplantısı  ·  ' + toplantiTarihi, options: { x: 6.6, y: SH - 0.4, w: 6.2, h: 0.4, fontSize: 10, color: 'CBD5E1', align: 'right', valign: 'middle', fontFace: 'Calibri' } } }
    ],
    slideNumber: { x: SW - 0.7, y: SH - 0.4, w: 0.4, h: 0.4, fontSize: 10, color: 'CBD5E1', align: 'right', valign: 'middle' }
  });

  // Kapak
  const kapak = pptx.addSlide();
  kapak.background = { color: R.birincilKoyu };
  kapak.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: SW, h: 0.16, fill: { color: R.birincil } });
  kapak.addShape(pptx.ShapeType.rect, { x: 0, y: SH - 0.16, w: SW, h: 0.16, fill: { color: R.birincil } });
  if (logoUrl) kapak.addImage(fotoSigdirNesnesi(logoUrl, SW / 2 - 0.75, 0.7, 1.5, 1.5));
  kapak.addText('ÇSGB DENETİMİ UYGUNSUZLUK GİDERME TAKİP TOPLANTISI', { x: 0.8, y: 2.45, w: SW - 1.6, h: 1.3, fontSize: 32, bold: true, color: 'FFFFFF', align: 'center', fontFace: 'Calibri', fit: 'shrink' });
  kapak.addText(firmaAdi, { x: 1, y: 3.85, w: SW - 2, fontSize: 19, color: 'BFDBFE', align: 'center', fontFace: 'Calibri' });
  kapak.addText(`${_csgbBaslik(d)}${d.raporNo ? '  ·  Rapor No: ' + d.raporNo : ''}`, { x: 1, y: 4.5, w: SW - 2, fontSize: 15, color: '93C5FD', align: 'center' });
  kapak.addText(`Toplantı Tarihi: ${toplantiTarihi}`, { x: 1, y: 5.05, w: SW - 2, fontSize: 15, color: '93C5FD', align: 'center' });

  // Genel durum
  const oz = pptx.addSlide({ masterName: MASTER });
  oz.addShape(pptx.ShapeType.rect, { x: 0.22, y: 0.5, w: 0.07, h: 0.62, fill: { color: R.birincil } });
  oz.addText('GENEL DURUM', { x: M, y: 0.42, w: 11.8, h: 0.28, fontSize: 11, bold: true, color: R.birincil, charSpacing: 1 });
  oz.addText(_csgbBaslik(d), { x: M, y: 0.68, w: 12.2, h: 0.6, fontSize: 22, bold: true, color: R.baslik, fit: 'shrink' });
  const kutular = [['Toplam Madde', maddeler.length, R.baslik], ['Tamamlanan', d.kapaliSayisi, '15803D'], ['Açık', d.acikSayisi, 'B45309'], ['Gecikmiş', d.gecikmisSayisi, 'B91C1C'], ['İlerleme', '%' + d.ilerlemeYuzde, R.birincil]];
  const kG = (SW - 2 * M - 0.3 * 4) / 5;
  kutular.forEach(([etiket, deger, renk], i) => {
    const x = M + i * (kG + 0.3);
    oz.addShape(pptx.ShapeType.roundRect, { x, y: 1.6, w: kG, h: 1.5, rectRadius: 0.08, fill: { color: 'FFFFFF' }, line: { color: R.cizgi, width: 1 } });
    oz.addText(String(deger), { x, y: 1.7, w: kG, h: 0.85, fontSize: 36, bold: true, color: renk, align: 'center' });
    oz.addText(etiket, { x, y: 2.55, w: kG, h: 0.4, fontSize: 13, color: R.soluk, align: 'center' });
  });
  oz.addShape(pptx.ShapeType.roundRect, { x: M, y: 3.5, w: SW - 2 * M, h: 0.32, rectRadius: 0.16, fill: { color: R.cizgi }, line: { type: 'none' } });
  if (d.ilerlemeYuzde > 0) oz.addShape(pptx.ShapeType.roundRect, { x: M, y: 3.5, w: (SW - 2 * M) * d.ilerlemeYuzde / 100, h: 0.32, rectRadius: 0.16, fill: { color: '16A34A' }, line: { type: 'none' } });
  const bilgi = [
    ['Rapor No / Tarihi', `${d.raporNo || '-'} / ${gunAyYil(d.raporTarihi) || '-'}`],
    ['Tebliğ / Verilen Süre', `${gunAyYil(d.tebligTarihi) || '-'} / ${d.verilenSureGun ? d.verilenSureGun + ' gün' : '-'}`],
    ['Son Giderme Tarihi', (gunAyYil(d.sonGidermeTarihi) || '-') + (d.kalanGun === null || d.kalanGun === undefined ? '' : (d.kalanGun < 0 ? `  (${-d.kalanGun} gün geçti)` : `  (${d.kalanGun} gün kaldı)`))],
    ['Bu Toplantının Gündemi', `${gundem.length} madde`]
  ];
  oz.addTable(bilgi.map(([e, v]) => [
    { text: e, options: { bold: true, color: R.soluk, fill: { color: R.bg } } },
    { text: v, options: { color: R.baslik, fill: { color: 'FFFFFF' } } }
  ]), { x: M, y: 4.15, w: SW - 2 * M, colW: [3.2, SW - 2 * M - 3.2], fontSize: 13, border: { type: 'solid', color: R.cizgi, pt: 0.75 }, autoPage: false });

  // Gündem maddeleri
  gundem.forEach((k, i) => {
    const foto = fotolar[k.id];
    const metinGen = foto ? 8.3 : SW - 2 * M;
    const durum = csgbDurumEtiketi(k.durumGoruntu);
    const renk = DURUM_RENK[durum] || { fg: R.soluk, bg: R.cizgi };
    const sl = pptx.addSlide({ masterName: MASTER });
    sl.addShape(pptx.ShapeType.rect, { x: 0.22, y: 0.5, w: 0.07, h: 0.62, fill: { color: R.birincil } });
    sl.addText(`MADDE ${k.denetimMaddeNo || '-'}  ·  ${i + 1} / ${gundem.length}`, { x: M, y: 0.42, w: 9, h: 0.28, fontSize: 11, bold: true, color: R.birincil, charSpacing: 1 });
    const w = Math.max(1.1, 0.1 * durum.length + 0.4);
    sl.addShape(pptx.ShapeType.roundRect, { x: SW - M - w, y: 0.4, w, h: 0.34, rectRadius: 0.17, fill: { color: renk.bg }, line: { type: 'none' } });
    sl.addText(durum, { x: SW - M - w, y: 0.4, w, h: 0.34, fontSize: 11, bold: true, color: renk.fg, align: 'center', valign: 'middle' });
    const baslik = k.maddeKonusu || kisalt(k.baslik, 110);
    sl.addText(baslik, { x: M, y: 0.72, w: 12.2, h: 0.6, fontSize: baslik.length <= 60 ? 22 : 17, bold: true, color: R.baslik, fontFace: 'Calibri', valign: 'top', fit: 'shrink' });

    // Tespit (uzun metin kutuya sığacak şekilde küçülür, çok uzunsa kısaltılır).
    sl.addShape(pptx.ShapeType.roundRect, { x: M, y: 1.4, w: metinGen, h: 1.9, rectRadius: 0.06, fill: { color: 'FFFFFF' }, line: { color: R.cizgi, width: 1 } });
    sl.addText(kisalt(k.baslik, 700), { x: M + 0.2, y: 1.5, w: metinGen - 0.4, h: 1.7, fontSize: 13, color: R.baslik, valign: 'top', fit: 'shrink' });

    sl.addTable([
      [{ text: 'Sorumlu', options: { bold: true, color: R.soluk, fill: { color: R.bg } } }, { text: k.sorumlu || '-', options: { color: R.baslik, fill: { color: 'FFFFFF' } } },
       { text: 'Termin', options: { bold: true, color: R.soluk, fill: { color: R.bg } } }, { text: gunAyYil(k.termin) || '-', options: { color: R.baslik, fill: { color: 'FFFFFF' } } }]
    ], { x: M, y: 3.42, w: metinGen, colW: [1.2, metinGen / 2 - 1.2, 1.2, metinGen / 2 - 1.2], fontSize: 12, border: { type: 'solid', color: R.cizgi, pt: 0.75 }, autoPage: false });

    // Toplantı notları (en yeniler altta; sığmazsa son notlar gösterilir).
    const notlar = k.toplantiNotlari.slice(-6);
    sl.addText('Toplantı Notları', { x: M, y: 4.0, w: metinGen, h: 0.32, fontSize: 12, bold: true, color: R.birincil });
    sl.addShape(pptx.ShapeType.roundRect, { x: M, y: 4.32, w: metinGen, h: 2.55, rectRadius: 0.06, fill: { color: 'FFFFFF' }, line: { color: R.cizgi, width: 1 } });
    sl.addText(notlar.length
      ? notlar.map(n => [{ text: gunAyYil(n.tarih) + ': ', options: { bold: true } }, { text: kisalt(n.not, 400), options: { breakLine: true } }]).flat()
      : [{ text: 'Henüz not girilmedi.', options: { color: R.soluk } }],
      { x: M + 0.2, y: 4.4, w: metinGen - 0.4, h: 2.4, fontSize: 12, color: R.baslik, valign: 'top', fit: 'shrink', paraSpaceAfter: 4 });

    if (foto) {
      const x = M + metinGen + 0.3, b = SW - M - x;
      sl.addShape(pptx.ShapeType.roundRect, { x: x - 0.06, y: 1.34, w: b + 0.12, h: 5.6, rectRadius: 0.08, fill: { color: 'FFFFFF' }, line: { color: R.cizgi, width: 1 } });
      sl.addImage(fotoSigdirNesnesi(foto, x, 1.4, b, 5.48));
    }
  });

  // Tamamlanan maddeler (her slaytta 12 satır)
  for (let i = 0; i < tamamlananlar.length; i += 12) {
    const sl = pptx.addSlide({ masterName: MASTER });
    sl.addShape(pptx.ShapeType.rect, { x: 0.22, y: 0.5, w: 0.07, h: 0.62, fill: { color: '16A34A' } });
    sl.addText('TAMAMLANAN MADDELER', { x: M, y: 0.42, w: 11.8, h: 0.28, fontSize: 11, bold: true, color: '15803D', charSpacing: 1 });
    sl.addText(`${tamamlananlar.length} madde tamamlandı`, { x: M, y: 0.68, w: 12.2, h: 0.55, fontSize: 22, bold: true, color: R.baslik });
    const bas = ['No', 'Uygunsuzluk Konusu', 'Sorumlu', 'Tamamlanma'].map(s => ({ text: s, options: { bold: true, color: 'FFFFFF', fill: { color: R.baslik } } }));
    sl.addTable([bas, ...tamamlananlar.slice(i, i + 12).map(k => [
      { text: k.denetimMaddeNo || '-', options: { bold: true } },
      { text: k.maddeKonusu || kisalt(k.baslik, 90) },
      { text: k.sorumlu || '-' },
      { text: gunAyYil(k.kapanisTarihi) || 'Tamamlandı', options: { color: '15803D', bold: true } }
    ])], { x: M, y: 1.4, w: SW - 2 * M, colW: [0.9, 7.6, 2.4, SW - 2 * M - 10.9], fontSize: 12, color: R.baslik, fill: { color: 'FFFFFF' }, border: { type: 'solid', color: R.cizgi, pt: 0.75 }, autoPage: false });
  }

  await pptx.writeFile({ fileName: `CSGB_Takip_Toplantisi_${toplantiTarihi.replace(/\./g, '-')}.pptx` });
}

// Toplantı tutanağı: dikey A4. Bilgiler, katılımcılar (imza sütunlu),
// genel notlar ve o toplantıda görüşülen maddeler.
async function csgbToplantiTutanagiWordOlustur(toplantiId) {
  const t = csgbToplantilariTumunuGetir().find(x => x.id === toplantiId);
  if (!t) return;
  const d = csgbDenetimGetir(t.denetimId);
  const w = _csgbWordAraclari();
  const firma = aktifFirmaGetir();
  const SAYFA_GEN = w.mm(210 - 30);
  const maddeler = csgbMaddeleriniGetir(t.denetimId);
  const gorusulenler = maddeler.filter(k => (t.maddeNotlari[k.id] || '').trim());
  const SUTUN = [7, 18, 41, 12, 12, 10].map(y => Math.round(SAYFA_GEN * y / 100));

  const katilimcilar = (t.katilimcilar || '').split('\n').map(s => s.trim()).filter(Boolean);
  const KG = [8, 62, 30].map(y => Math.round(SAYFA_GEN * y / 100));
  const katilimTablosu = new docx.Table({
    width: { size: SAYFA_GEN, type: docx.WidthType.DXA }, columnWidths: KG, layout: docx.TableLayoutType.FIXED,
    rows: [
      new docx.TableRow({ tableHeader: true, children: ['Sıra', 'Ad Soyad - Görevi', 'İmza'].map((b, i) => w.baslikHucre(b, KG[i])) }),
      ...(katilimcilar.length ? katilimcilar : ['', '', '']).map((k, i) => new docx.TableRow({ height: { value: w.mm(10), rule: docx.HeightRule.ATLEAST }, cantSplit: true, children: [
        w.hucre(new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [w.metin(i + 1, { size: 17 })] }), KG[0], { verticalAlign: docx.VerticalAlign.CENTER }),
        w.hucre(new docx.Paragraph({ children: [w.metin(k, { size: 17 })] }), KG[1], { verticalAlign: docx.VerticalAlign.CENTER }),
        w.hucre(new docx.Paragraph(''), KG[2])
      ] }))
    ]
  });

  const maddeTablosu = new docx.Table({
    width: { size: SAYFA_GEN, type: docx.WidthType.DXA }, columnWidths: SUTUN, layout: docx.TableLayoutType.FIXED,
    rows: [
      new docx.TableRow({ tableHeader: true, children: ['No', 'Konu', 'Görüşülen / Yapılan', 'Sorumlu', 'Termin', 'Durum'].map((b, i) => w.baslikHucre(b, SUTUN[i])) }),
      ...(gorusulenler.length ? gorusulenler.map(k => new docx.TableRow({ cantSplit: true, children: [
        w.hucre(new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [w.metin(k.denetimMaddeNo || '-', { bold: true, size: 16 })] }), SUTUN[0]),
        w.hucre(w.paragraflar(k.maddeKonusu || (k.baslik || '').slice(0, 80), { size: 15 }), SUTUN[1]),
        w.hucre(w.paragraflar(t.maddeNotlari[k.id]), SUTUN[2]),
        w.hucre(w.paragraflar(k.sorumlu || '-', { size: 15 }), SUTUN[3]),
        w.hucre(new docx.Paragraph({ children: [w.metin(gunAyYil(k.termin) || '-', { size: 15 })] }), SUTUN[4]),
        w.hucre(new docx.Paragraph({ children: [w.metin(csgbDurumEtiketi(k.durumGoruntu), { bold: true, size: 15 })] }), SUTUN[5])
      ] })) : [new docx.TableRow({ children: [w.hucre(new docx.Paragraph({ children: [w.metin('Bu toplantıda madde notu girilmedi.', { size: 16 })] }), SAYFA_GEN, { columnSpan: 6 })] })])
    ]
  });

  const altBaslik = s => new docx.Paragraph({ keepNext: true, spacing: { before: w.mm(5), after: w.mm(2) }, children: [w.metin(s, { bold: true, size: 20 })] });
  const children = [
    new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [w.metin(firma ? firma.ad : '', { bold: true, size: 20, color: '374151' })] }),
    new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { after: w.mm(4) }, children: [w.metin('ÇSGB DENETİMİ UYGUNSUZLUK GİDERME TAKİP TOPLANTI TUTANAĞI', { bold: true, size: 24 })] }),
    w.bilgiTablosu([
      ['Toplantı Tarihi', gunAyYil(t.tarih)], ['Yer', t.yer || '-'],
      ['Denetim', d ? _csgbBaslik(d) : '-'], ['Rapor No / Tarihi', d ? `${d.raporNo || '-'} / ${gunAyYil(d.raporTarihi) || '-'}` : '-'],
      ['Son Giderme Tarihi', d ? (gunAyYil(d.sonGidermeTarihi) || '-') : '-'], ['Sonraki Toplantı', gunAyYil(t.sonrakiToplantiTarihi) || '-'],
      ['Durum', d ? `${maddeler.length} madde · ${d.kapaliSayisi} tamamlandı · ${d.acikSayisi} açık · ${d.gecikmisSayisi} gecikmiş` : '-'], ['', '']
    ], SAYFA_GEN),
    ...(t.genelNotlar ? [altBaslik('Genel Notlar'), ...w.paragraflar(t.genelNotlar, { size: 18 })] : []),
    altBaslik(`Görüşülen Maddeler (${gorusulenler.length})`),
    maddeTablosu,
    altBaslik('Katılımcılar'),
    katilimTablosu
  ];

  const sayfa = { margin: { top: w.mm(15), right: w.mm(15), bottom: w.mm(15), left: w.mm(15), footer: w.mm(6) } };
  const doc = new docx.Document({ styles: { default: { document: { run: { font: 'Arial', size: 16 } } } }, sections: [{ properties: { page: sayfa }, footers: { default: w.altBilgi }, children }] });
  const blob = await docx.Packer.toBlob(doc);
  saveAs(blob, `CSGB_Takip_Toplantisi_${gunAyYil(t.tarih).replace(/\./g, '-')}.docx`);
}
