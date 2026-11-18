// Lokasyon Bazlı Saha Denetimi — ekran.
// İki sekme: Denetimler (liste + seçilen denetimin lokasyon ziyaretleri) ve
// Lokasyonlar (denetim noktaları + barkod etiketleri).

let _ldFirma = null;
let _ldKullanici = null;
let _ldAktifDenetimId = null;
const _ldAcikZiyaretler = new Set();
let _ldKategoriBaglam = null;   // { ziyaretId }
let _ldSerbestBaglam = null;    // { ziyaretId }
let _ldAktarBaglam = null;      // { ziyaretId, anahtar } | { toplu: true }
let _ldLokasyonDuzenlenenId = null;
let _ldTarayici = null;
let _ldTaramaMesgul = false;

function _ldK(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
function _ldEl(id) { return document.getElementById(id); }
function _ldBugunIso() { return new Date().toISOString().slice(0, 10); }
function _ldTarihGoster(iso) { return iso ? (typeof gunAyYil === 'function' ? gunAyYil(iso.slice(0, 10)) : iso.slice(0, 10)) : '-'; }
function _ldSaatGoster(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}
function _ldModalAc(id) { _ldEl(id).classList.add('acik'); }
function _ldModalKapat(id) { _ldEl(id).classList.remove('acik'); }

function lokasyonDenetimSayfasiniBaslat(firma, kullanici) {
  _ldFirma = firma;
  _ldKullanici = kullanici;

  document.querySelectorAll('#ldSekmeler [data-sekme]').forEach(b => b.addEventListener('click', () => _ldSekmeSec(b.getAttribute('data-sekme'))));

  // Denetimler
  _ldEl('ldDenetimArama').addEventListener('input', _ldDenetimListesiCiz);
  _ldEl('ldYeniDenetimBtn').addEventListener('click', () => _ldDenetimModalAc(null));
  _ldEl('ldDenetimModalIptal').addEventListener('click', () => _ldModalKapat('ldDenetimModal'));
  _ldEl('ldDenetimModalKaydet').addEventListener('click', _ldDenetimModalKaydet);
  _ldEl('ldDenetimGovde').addEventListener('click', _ldDenetimListesiTiklandi);

  // Detay
  _ldEl('ldDetayGeriBtn').addEventListener('click', () => _ldDetayKapat());
  _ldEl('ldBarkodOkutBtn').addEventListener('click', _ldTaramaBaslat);
  _ldEl('ldLokasyonSecBtn').addEventListener('click', _ldLokasyonSecAc);
  _ldEl('ldWordRaporBtn').addEventListener('click', () => _ldWordRapor(_ldAktifDenetimId));
  _ldEl('ldTopluAktarBtn').addEventListener('click', _ldTopluAktarAc);
  _ldEl('ldDenetimDuzenleBtn').addEventListener('click', () => _ldDenetimModalAc(ldDenetimGetir(_ldAktifDenetimId)));
  _ldEl('ldTamamlaBtn').addEventListener('click', _ldTamamlaTiklandi);
  _ldEl('ldGenelDegerlendirme').addEventListener('change', e => {
    if (_ldAktifDenetimId) ldDenetimAlanGuncelle(_ldAktifDenetimId, { genelDegerlendirme: e.target.value.trim() });
  });
  const ziyaretKutusu = _ldEl('ldZiyaretler');
  ziyaretKutusu.addEventListener('click', _ldZiyaretTiklandi);
  ziyaretKutusu.addEventListener('change', _ldZiyaretDegisti);

  // Lokasyon seçimi / kategori / serbest bulgu / aktar / tarama modalları
  _ldEl('ldLokasyonSecKapat').addEventListener('click', () => _ldModalKapat('ldLokasyonSecModal'));
  _ldEl('ldLokasyonSecArama').addEventListener('input', _ldLokasyonSecListeCiz);
  _ldEl('ldLokasyonSecListe').addEventListener('click', e => {
    const b = e.target.closest('[data-lok-sec]');
    if (!b) return;
    _ldModalKapat('ldLokasyonSecModal');
    _ldLokasyonaGir(b.getAttribute('data-lok-sec'), 'manuel');
  });
  _ldEl('ldKategoriIptal').addEventListener('click', () => _ldModalKapat('ldKategoriModal'));
  _ldEl('ldKategoriKaydet').addEventListener('click', _ldKategoriKaydet);
  _ldEl('ldSerbestIptal').addEventListener('click', () => _ldModalKapat('ldSerbestModal'));
  _ldEl('ldSerbestKaydet').addEventListener('click', _ldSerbestKaydet);
  _ldEl('ldAktarIptal').addEventListener('click', () => _ldModalKapat('ldAktarModal'));
  _ldEl('ldAktarKaydet').addEventListener('click', _ldAktarKaydet);
  _ldEl('ldTaramaKapat').addEventListener('click', _ldTaramaDurdur);
  _ldEl('ldTaramaElleBtn').addEventListener('click', () => _ldKodOkundu(_ldEl('ldTaramaElle').value));
  _ldEl('ldTaramaElle').addEventListener('keydown', e => { if (e.key === 'Enter') _ldKodOkundu(_ldEl('ldTaramaElle').value); });

  _ldEl('ldARisk').innerHTML = (typeof RISK_SEVIYELERI !== 'undefined' ? RISK_SEVIYELERI : ['Olası Risk'])
    .map(r => `<option value="${_ldK(r)}">${_ldK(r)}</option>`).join('');
  _ldEl('ldSKategori').innerHTML = LD_KATEGORILER.concat([LD_SERBEST_KATEGORI])
    .map(k => `<option value="${k.id}">${_ldK(k.ad)}</option>`).join('');

  // Lokasyonlar
  _ldEl('ldLokasyonArama').addEventListener('input', _ldLokasyonListesiCiz);
  _ldEl('ldYeniLokasyonBtn').addEventListener('click', () => _ldLokasyonModalAc(null));
  _ldEl('ldLokasyonModalIptal').addEventListener('click', () => _ldModalKapat('ldLokasyonModal'));
  _ldEl('ldLokasyonModalKaydet').addEventListener('click', _ldLokasyonModalKaydet);
  _ldEl('ldLBolum').addEventListener('input', _ldLokasyonModalBolumDegisti);
  _ldEl('ldLLokasyon').addEventListener('input', _ldLokasyonEkipmanBilgisiCiz);
  _ldEl('ldLCoklu').addEventListener('change', _ldCokluModGuncelle);
  _ldEl('ldLokasyonGovde').addEventListener('click', _ldLokasyonListesiTiklandi);
  _ldEl('ldLokTumunuSec').addEventListener('change', e => {
    document.querySelectorAll('#ldLokasyonGovde [data-lok-cb]').forEach(cb => { cb.checked = e.target.checked; });
  });
  _ldEl('ldBarkodPdfBtn').addEventListener('click', () => {
    const secili = new Set(Array.from(document.querySelectorAll('#ldLokasyonGovde [data-lok-cb]:checked')).map(cb => cb.getAttribute('data-lok-cb')));
    let liste = _ldLokasyonFiltreli();
    if (secili.size) liste = liste.filter(l => secili.has(l.id));
    if (!liste.length) { alert('Barkodu basılacak lokasyon yok. Önce lokasyon ekleyin.'); return; }
    ldBarkodEtiketleriPdf(liste, _ldFirma, _ldBarkodUrl);
  });
  // Boş kontrol formu (Excel): seçili lokasyonlar varsa her biri kendi
  // sayfasında kendi kategorileriyle; seçim yoksa tüm maddeler tek sayfada.
  const formIndir = async lokasyonlar => {
    try { await ldKontrolFormuExcelIndir(lokasyonlar, _ldFirma); }
    catch (hata) { console.error(hata); alert('Excel oluşturulamadı: ' + (hata.message || hata)); }
  };
  _ldEl('ldBosFormExcelBtn').addEventListener('click', () => formIndir(null));
  _ldEl('ldFormExcelBtn').addEventListener('click', () => {
    const secili = new Set(Array.from(document.querySelectorAll('#ldLokasyonGovde [data-lok-cb]:checked')).map(cb => cb.getAttribute('data-lok-cb')));
    formIndir(secili.size ? _ldLokasyonFiltreli().filter(l => secili.has(l.id)) : null);
  });

  _ldDenetimListesiCiz();
  _ldLokasyonListesiCiz();
  _ldUrlLokasyonuIsle();
}

function _ldSekmeSec(sekme) {
  document.querySelectorAll('#ldSekmeler [data-sekme]').forEach(b => b.classList.toggle('sekme-seciliDegil', b.getAttribute('data-sekme') !== sekme));
  const denetimMi = sekme === 'denetimler';
  _ldEl('ldLokasyonBolumu').classList.toggle('ld-gizli', denetimMi);
  _ldEl('ldDenetimListesiBolumu').classList.toggle('ld-gizli', !denetimMi || !!_ldAktifDenetimId);
  _ldEl('ldDenetimDetayBolumu').classList.toggle('ld-gizli', !denetimMi || !_ldAktifDenetimId);
  if (!denetimMi) _ldLokasyonListesiCiz();
}

// Etiketteki QR, bu sayfayı ?firma=<slug>&lok=<kod> ile açar.
function _ldBarkodUrl(lok) {
  const taban = location.href.split('#')[0].split('?')[0];
  return `${taban}?firma=${encodeURIComponent(_ldFirmaKodu())}&lok=${encodeURIComponent(lok.kod)}`;
}

function _ldFirmaKodu() {
  return _ldFirma ? (_ldFirma.slug || _ldFirma.id || '') : '';
}

// ===================== DENETİM LİSTESİ =====================

function _ldDenetimListesiCiz() {
  const ara = ldNormalize(_ldEl('ldDenetimArama').value);
  const liste = ldDenetimleriGetir().filter(d => !ara || ldNormalize([d.denetimNo, d.baslik, d.denetciler, d.kapsam, ...d.ziyaretler.map(z => z.bolum + ' ' + z.lokasyon)].join(' ')).includes(ara));
  const govde = _ldEl('ldDenetimGovde');
  const bos = _ldEl('ldDenetimBos');
  if (!liste.length) {
    govde.innerHTML = '';
    bos.textContent = ara ? 'Aramayla eşleşen kontrol yok.' : 'Henüz lokasyon bazlı kontrol yok. "+ Yeni Kontrol" ile başlayın.';
    bos.classList.add('gorunur');
    return;
  }
  bos.classList.remove('gorunur');
  govde.innerHTML = liste.map(d => {
    const ist = ldDenetimIstatistik(d);
    const bulgu = ldDenetimBulgulari(d).length;
    return `<tr>
      <td><b>${_ldK(d.denetimNo)}</b>${d.baslik ? `<div class="ld-bilgi">${_ldK(d.baslik)}</div>` : ''}</td>
      <td>${_ldTarihGoster(d.tarih)}${d.bitisTarihi && d.bitisTarihi !== d.tarih ? ' – ' + _ldTarihGoster(d.bitisTarihi) : ''}</td>
      <td>${_ldK(d.denetciler)}</td>
      <td>${ist.lokasyon}</td>
      <td>${bulgu ? `<span class="genel-rozet rozet-uygun-degil">${bulgu}</span>` : '0'}</td>
      <td><span class="genel-rozet ${ldPuanSinifi(ist.puan)}">${ist.puan == null ? '-' : '%' + ist.puan}</span></td>
      <td><span class="genel-rozet ${d.tamamlandiMi ? 'rozet-tamamlandi' : 'rozet-devam-ediyor'}">${d.tamamlandiMi ? 'Tamamlandı' : 'Devam Ediyor'}</span></td>
      <td>
        <button class="tablo-buton" data-den-ac="${d.id}">${d.tamamlandiMi ? 'Görüntüle' : 'Aç'}</button>
        <button class="tablo-buton" data-den-word="${d.id}">Word</button>
        <button class="tablo-buton sil" data-den-sil="${d.id}">Sil</button>
      </td>
    </tr>`;
  }).join('');
}

async function _ldDenetimListesiTiklandi(e) {
  const ac = e.target.closest('[data-den-ac]');
  const word = e.target.closest('[data-den-word]');
  const sil = e.target.closest('[data-den-sil]');
  if (ac) _ldDetayAc(ac.getAttribute('data-den-ac'));
  else if (word) _ldWordRapor(word.getAttribute('data-den-word'));
  else if (sil) {
    const d = ldDenetimGetir(sil.getAttribute('data-den-sil'));
    if (!d) return;
    if (!(await onayModali(`${d.denetimNo} kontrolü ve tüm lokasyon kayıtları silinsin mi? (Uygunsuzluğa/riske aktarılmış kayıtlar o modüllerde kalır.)`, 'Sil'))) return;
    const s = ldDenetimSil(d.id);
    if (!s.basarili) { alert(s.hata); return; }
    _ldDenetimListesiCiz();
  }
}

function _ldDenetimModalAc(d) {
  _ldEl('ldDenetimModal').dataset.id = d ? d.id : '';
  _ldEl('ldDenetimModalBaslik').textContent = d ? `${d.denetimNo} — Kontrol Bilgileri` : 'Yeni Lokasyon Bazlı Kontrol';
  _ldEl('ldDBaslik').value = d ? d.baslik : '';
  _ldEl('ldDTarih').value = d ? d.tarih : _ldBugunIso();
  _ldEl('ldDBitis').value = d ? d.bitisTarihi : '';
  _ldEl('ldDDenetciler').value = d ? d.denetciler : (_ldKullanici && _ldKullanici.adSoyad) || '';
  _ldEl('ldDEslik').value = d ? d.eslikEdenler : '';
  _ldEl('ldDKapsam').value = d ? d.kapsam : '';
  _ldEl('ldDTarihHata').textContent = '';
  _ldEl('ldDDenetcilerHata').textContent = '';
  _ldModalAc('ldDenetimModal');
}

function _ldDenetimModalKaydet() {
  const id = _ldEl('ldDenetimModal').dataset.id || '';
  const sonuc = ldDenetimKaydet({
    id: id || undefined,
    baslik: _ldEl('ldDBaslik').value, tarih: _ldEl('ldDTarih').value, bitisTarihi: _ldEl('ldDBitis').value,
    denetciler: _ldEl('ldDDenetciler').value, eslikEdenler: _ldEl('ldDEslik').value, kapsam: _ldEl('ldDKapsam').value
  });
  _ldEl('ldDTarihHata').textContent = (sonuc.hatalar && sonuc.hatalar.tarih) || '';
  _ldEl('ldDDenetcilerHata').textContent = (sonuc.hatalar && sonuc.hatalar.denetciler) || '';
  if (!sonuc.basarili) { if (sonuc.hatalar && sonuc.hatalar.genel) alert(sonuc.hatalar.genel); return; }
  _ldModalKapat('ldDenetimModal');
  _ldDenetimListesiCiz();
  if (id) _ldDetayCiz(); else _ldDetayAc(sonuc.denetim.id);
}

// ===================== DENETİM DETAYI =====================

function _ldDetayAc(id) {
  _ldAktifDenetimId = id;
  _ldAcikZiyaretler.clear();
  _ldSekmeSec('denetimler');
  _ldDetayCiz();
  window.scrollTo(0, 0);
}

function _ldDetayKapat() {
  _ldAktifDenetimId = null;
  _ldSekmeSec('denetimler');
  _ldDenetimListesiCiz();
}

function _ldDetayCiz() {
  const d = ldDenetimGetir(_ldAktifDenetimId);
  if (!d) { _ldDetayKapat(); return; }
  const ist = ldDenetimIstatistik(d);
  const bulgular = ldDenetimBulgulari(d);
  const aktarilan = bulgular.filter(b => b.madde.cevap.uygId).length;
  _ldEl('ldDetayBaslik').textContent = `${d.denetimNo}${d.baslik ? ' — ' + d.baslik : ''}`;
  _ldEl('ldDetayMeta').innerHTML = [
    `Tarih: <b>${_ldTarihGoster(d.tarih)}${d.bitisTarihi && d.bitisTarihi !== d.tarih ? ' – ' + _ldTarihGoster(d.bitisTarihi) : ''}</b>`,
    `Kontrol Eden: <b>${_ldK(d.denetciler)}</b>`,
    d.eslikEdenler ? `Eşlik eden: ${_ldK(d.eslikEdenler)}` : '',
    d.kapsam ? `Kapsam: ${_ldK(d.kapsam)}` : '',
    d.tamamlandiMi ? '<span class="genel-rozet rozet-tamamlandi">Tamamlandı</span>' : ''
  ].filter(Boolean).join(' &nbsp;|&nbsp; ');
  _ldEl('ldDetayIstat').innerHTML = `
    <div><b>${ist.lokasyon}</b><span>Lokasyon</span></div>
    <div><b>${ist.cevaplanan}/${ist.toplam}</b><span>Değerlendirilen madde</span></div>
    <div><b style="color:#15803d;">${ist.uygun}</b><span>Uygun</span></div>
    <div><b style="color:#b91c1c;">${ist.uygunDegil}</b><span>Uygun değil (bulgu)</span></div>
    <div><b>${ist.puan == null ? '-' : '%' + ist.puan}</b><span>Uygunluk oranı</span></div>
    <div><b>${aktarilan}/${bulgular.length}</b><span>Uygunsuzluğa aktarılan</span></div>`;

  const kilitli = d.tamamlandiMi;
  ['ldBarkodOkutBtn', 'ldLokasyonSecBtn', 'ldTamamlaBtn'].forEach(id => { _ldEl(id).disabled = kilitli; });
  _ldEl('ldTamamlaBtn').textContent = kilitli ? '↺ Kontrolü Yeniden Aç' : '✓ Kontrolü Tamamla';
  _ldEl('ldTamamlaBtn').disabled = false;
  _ldEl('ldGenelDegerlendirme').value = d.genelDegerlendirme || '';
  _ldBelgeAlaniniKur(d);

  _ldEl('ldZiyaretBos').classList.toggle('gorunur', !d.ziyaretler.length);
  _ldEl('ldZiyaretler').innerHTML = d.ziyaretler.map(z => _ldZiyaretKartiHtml(d, z)).join('');
  if (typeof fotoReferanslariCoz === 'function') fotoReferanslariCoz(_ldEl('ldZiyaretler'));
}

function _ldZiyaretKartiHtml(d, z) {
  const ist = ldZiyaretIstatistik(z);
  const acik = _ldAcikZiyaretler.has(z.id);
  const sorunluEkipman = (z.ekipmanOzeti || []).filter(e => e.sonucMetni !== 'Uygun').length;
  const bas = `
    <div class="ld-kart-bas" data-kart-ac="${z.id}">
      <div>
        <h4>${acik ? '▾' : '▸'} ${_ldK(z.bolum)} — ${_ldK(z.lokasyon)}</h4>
        <div class="ld-bilgi"><span class="ld-kod">${_ldK(z.kod)}</span> · Giriş: ${_ldTarihGoster(z.girisZamani)} ${_ldSaatGoster(z.girisZamani)}${z.girisYontemi === 'barkod' ? ' (barkod)' : ''} · ${ist.cevaplanan}/${ist.toplam} madde</div>
      </div>
      <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
        ${ist.uygunDegil ? `<span class="genel-rozet rozet-uygun-degil">${ist.uygunDegil} bulgu</span>` : ''}
        ${sorunluEkipman ? `<span class="genel-rozet rozet-orta" title="Acil durum ekipmanı uyarısı">🧯 ${sorunluEkipman}</span>` : ''}
        <span class="genel-rozet ${ldPuanSinifi(ist.puan)}">${ist.puan == null ? 'Puanlanmadı' : '%' + ist.puan}</span>
      </div>
    </div>`;
  if (!acik) return `<div class="ld-kart" id="ldKart_${z.id}">${bas}</div>`;

  const kilitli = d.tamamlandiMi;
  const maddeler = ldZiyaretMaddeleri(z);
  const gruplar = [];
  maddeler.forEach(m => {
    let g = gruplar.find(x => x.kategori.id === m.kategori.id);
    if (!g) { g = { kategori: m.kategori, maddeler: [] }; gruplar.push(g); }
    g.maddeler.push(m);
  });
  const govde = gruplar.map(g => `
    <div class="ld-kategori">
      <div class="ld-kategori-bas">
        <span>${_ldK(g.kategori.ad)}</span>
        ${!kilitli && g.kategori.sorular ? `<button type="button" class="tablo-buton" data-tum-uygun="${g.kategori.id}" data-z="${z.id}" title="Cevaplanmamış maddeleri Uygun işaretle">Kalanlar Uygun</button>` : ''}
      </div>
      ${g.maddeler.map(m => _ldMaddeHtml(d, z, m, kilitli)).join('')}
    </div>`).join('');

  return `<div class="ld-kart" id="ldKart_${z.id}">${bas}
    <div class="ld-kart-govde">
      ${kilitli ? '' : `<div class="ld-eylemler" style="margin-top:10px;">
        <button type="button" class="ikincil" data-kat-duzenle="${z.id}" style="width:auto;">☰ Kategoriler</button>
        <button type="button" class="ikincil" data-serbest-ekle="${z.id}" style="width:auto;">+ Listede Olmayan Tespit</button>
        <button type="button" class="ikincil sil" data-ziyaret-sil="${z.id}" style="width:auto;">Lokasyonu Kontrolden Çıkar</button>
      </div>`}
      ${_ldEkipmanPaneliHtml(z, kilitli)}
      ${govde}
      <label style="margin-top:14px;">Lokasyon notu</label>
      <textarea rows="2" data-lok-not="${z.id}" ${kilitli ? 'disabled' : ''} placeholder="Bu lokasyona ait genel gözlem (rapora girer)">${_ldK(z.lokasyonNotu)}</textarea>
    </div>
  </div>`;
}

function _ldMaddeHtml(d, z, m, kilitli) {
  const c = m.cevap || {};
  const sonuc = c.sonuc || '';
  const btn = (deger, etiket, sinif) => `<button type="button" ${kilitli ? 'disabled' : ''} class="${sonuc === deger ? sinif : ''}" data-sonuc="${deger}" data-z="${z.id}" data-a="${_ldK(m.anahtar)}">${etiket}</button>`;
  const ortak = `data-z="${z.id}" data-a="${_ldK(m.anahtar)}"`;
  let detay = '';
  if (sonuc === 'Uygun Değil') {
    const riskNo = riskeAktarilanRiskNo('saha-lokasyon', ldRiskKaynakId(d.id, z.id, m.anahtar));
    const riskSecenek = ['<option value="">— Seçiniz —</option>'].concat((typeof RISK_SEVIYELERI !== 'undefined' ? RISK_SEVIYELERI : []).map(r => `<option ${c.risk === r ? 'selected' : ''}>${_ldK(r)}</option>`)).join('');
    const fotolar = (c.fotolar || []).map((f, i) => `<div class="ld-foto-kutu"><img data-foto-ref="${_ldK(f)}" alt="">${kilitli ? '' : `<button type="button" data-foto-sil="${i}" ${ortak}>✕</button>`}</div>`).join('');
    detay = `<div class="ld-detay">
      <label>Tespit <span class="ld-bilgi">(raporda ve uygunsuzluk kaydında başlık olur)</span></label>
      <textarea rows="2" data-alan="not" ${ortak} ${kilitli ? 'disabled' : ''} placeholder="Görülen durum, ör. H14 konveyörü emniyet halatı arızalı">${_ldK(c.not)}</textarea>
      <label>Önerilen önlem</label>
      <textarea rows="2" data-alan="oneri" ${ortak} ${kilitli ? 'disabled' : ''} placeholder="Ör. Kasnak muhafazası takılmalı, sökülmesi önlenmelidir.">${_ldK(c.oneri)}</textarea>
      <label>Risk seviyesi</label>
      <select data-alan="risk" ${ortak} ${kilitli ? 'disabled' : ''}>${riskSecenek}</select>
      <div class="ld-fotolar">${fotolar}
        ${!kilitli && (c.fotolar || []).length < 3 ? `<label class="tablo-buton" style="cursor:pointer; margin:0;">📷 Fotoğraf ekle<input type="file" accept="image/*" capture="environment" data-foto-ekle ${ortak} style="display:none;"></label>` : ''}
      </div>
      <div class="ld-eylemler">
        ${c.uygId
          ? `<span class="genel-rozet rozet-tamamlandi">✔ Uygunsuzlukta: ${_ldK(c.uygNo || 'aktarıldı')}</span>`
          : `<button type="button" class="tablo-buton" data-uyg-aktar ${ortak}>↪ Uygunsuzluğa Aktar</button>`}
        <button type="button" class="tablo-buton" data-risk-aktar ${ortak}>${riskNo ? '⚠ Riskte: ' + _ldK(riskNo) : '⚠ Riske Aktar'}</button>
        ${c.serbest && !kilitli && !c.uygId ? `<button type="button" class="tablo-buton sil" data-serbest-sil ${ortak}>Tespiti sil</button>` : ''}
      </div>
    </div>`;
  }
  return `<div class="ld-madde">
    <div class="ld-madde-ust">
      <div class="ld-madde-metin">${_ldK(m.soru)}${m.mevzuat ? `<div class="ld-mevzuat">${_ldK(m.mevzuat)}</div>` : ''}</div>
      <div class="ld-sonuc">
        ${c.serbest ? '<span class="genel-rozet rozet-uygun-degil">Ek tespit</span>' : `${btn('Uygun', '✓ Uygun', 'secili-uygun')}${btn('Uygun Değil', '✗ Uygun Değil', 'secili-uygun-degil')}${btn('Uygulanamaz', 'U/D', 'secili-uygulanamaz')}`}
      </div>
    </div>
    ${detay}
  </div>`;
}

function _ldEkipmanPaneliHtml(z, kilitli) {
  const liste = z.ekipmanOzeti || [];
  const yenile = kilitli ? '' : `<button type="button" class="tablo-buton" data-ekipman-yenile="${z.id}">↻ Güncelle</button>`;
  if (!liste.length) {
    return `<div class="ld-kategori"><div class="ld-kategori-bas"><span>🧯 Acil Durum Ekipmanları</span>${yenile}</div>
      <div class="ld-bilgi" style="padding:8px 2px;">Bu bölüm/lokasyon adıyla eşleşen acil durum ekipmanı bulunamadı (Acil Durum > Ekipmanlar'daki bölüm ve lokasyon adları bu lokasyonla aynı yazılmalı).</div></div>`;
  }
  const rozet = e => e.sonucMetni === 'Uygun' ? 'rozet-uygun' : e.kontrolYok || e.gecikmis ? 'rozet-gecikmis' : 'rozet-orta';
  return `<div class="ld-kategori"><div class="ld-kategori-bas"><span>🧯 Acil Durum Ekipmanları (${liste.length}) <span class="ld-bilgi" style="font-weight:400;">— Acil Durum modülündeki son kontrollere göre, ${_ldTarihGoster(z.ekipmanOzetiTarihi)}</span></span>${yenile}</div>
    <div class="tablo-scroll"><table class="veri-tablosu ld-ekipman-tablo">
      <thead><tr><th>Ekipman</th><th>Tür</th><th>Son / Sonraki Kontrol</th><th>Durum</th><th></th></tr></thead>
      <tbody>${liste.map(e => `<tr>
        <td><b>${_ldK(e.ekipmanNo || '-')}</b><div class="ld-bilgi">${_ldK(e.lokasyon)}</div></td>
        <td>${_ldK(e.tur)}</td>
        <td>${_ldTarihGoster(e.sonKontrol)} / ${_ldTarihGoster(e.sonrakiKontrol)}</td>
        <td><span class="genel-rozet ${rozet(e)}">${_ldK(e.sonucMetni)}</span>${e.uygunDegil.length ? `<div class="ld-bilgi">${e.uygunDegil.map(_ldK).join('; ')}</div>` : ''}</td>
        <td>${!kilitli && e.sonucMetni !== 'Uygun' ? `<button type="button" class="tablo-buton" data-ekipman-bulgu="${_ldK(e.id)}" data-z="${z.id}">+ Bulgu</button>` : ''}</td>
      </tr>`).join('')}</tbody>
    </table></div></div>`;
}

function _ldMaddeBul(z, anahtar) {
  return ldZiyaretMaddeleri(z).find(m => m.anahtar === anahtar) || null;
}

function _ldAktifZiyaret(zid) {
  const d = ldDenetimGetir(_ldAktifDenetimId);
  return d ? d.ziyaretler.find(z => z.id === zid) || null : null;
}

async function _ldZiyaretTiklandi(e) {
  const t = e.target;
  const did = _ldAktifDenetimId;
  const kartAc = t.closest('[data-kart-ac]');
  if (kartAc && !t.closest('button')) {
    const zid = kartAc.getAttribute('data-kart-ac');
    if (_ldAcikZiyaretler.has(zid)) _ldAcikZiyaretler.delete(zid); else _ldAcikZiyaretler.add(zid);
    _ldDetayCiz();
    return;
  }
  const b = t.closest('button');
  if (!b) return;
  const zid = b.getAttribute('data-z');
  const a = b.getAttribute('data-a');

  if (b.hasAttribute('data-sonuc')) {
    const z = _ldAktifZiyaret(zid);
    const m = z && _ldMaddeBul(z, a);
    if (!m) return;
    const yeni = b.getAttribute('data-sonuc');
    const mevcut = m.cevap && m.cevap.sonuc;
    if (mevcut === 'Uygun Değil' && yeni !== 'Uygun Değil' && m.cevap.uygId) {
      alert('Bu bulgu uygunsuzluğa aktarıldı; sonucu değiştirmek için önce Uygunsuzluk modülünde kaydı kapatın veya silin.');
      return;
    }
    ldCevapGuncelle(did, zid, a, m, { sonuc: mevcut === yeni ? '' : yeni });
    _ldDetayCiz();
  } else if (b.hasAttribute('data-tum-uygun')) {
    ldKategoriTumunuUygun(did, b.getAttribute('data-z'), b.getAttribute('data-tum-uygun'));
    _ldDetayCiz();
  } else if (b.hasAttribute('data-foto-sil')) {
    const z = _ldAktifZiyaret(zid);
    const m = z && _ldMaddeBul(z, a);
    if (!m || !m.cevap) return;
    const fotolar = (m.cevap.fotolar || []).slice();
    fotolar.splice(Number(b.getAttribute('data-foto-sil')), 1);
    ldCevapGuncelle(did, zid, a, m, { fotolar });
    _ldDetayCiz();
  } else if (b.hasAttribute('data-uyg-aktar')) {
    _ldAktarAc(zid, a);
  } else if (b.hasAttribute('data-risk-aktar')) {
    _ldRiskeAktar(zid, a);
  } else if (b.hasAttribute('data-serbest-sil')) {
    if (await onayModali('Bu tespit silinsin mi?', 'Sil')) { ldSerbestBulguSil(did, zid, a); _ldDetayCiz(); }
  } else if (b.hasAttribute('data-kat-duzenle')) {
    _ldKategoriModalAc(b.getAttribute('data-kat-duzenle'));
  } else if (b.hasAttribute('data-serbest-ekle')) {
    _ldSerbestBaglam = { ziyaretId: b.getAttribute('data-serbest-ekle') };
    _ldEl('ldSTespit').value = '';
    _ldEl('ldSMevzuat').value = '';
    _ldEl('ldSKategori').value = LD_SERBEST_KATEGORI.id;
    _ldEl('ldSHata').textContent = '';
    _ldModalAc('ldSerbestModal');
  } else if (b.hasAttribute('data-ziyaret-sil')) {
    const z = _ldAktifZiyaret(b.getAttribute('data-ziyaret-sil'));
    if (!z) return;
    if (Object.values(z.cevaplar || {}).some(c => c.uygId)) { alert('Bu lokasyonun uygunsuzluğa aktarılmış bulguları var; kontrolden çıkarılamaz.'); return; }
    if (!(await onayModali(`${z.bolum} — ${z.lokasyon} bu kontrolden çıkarılsın mı? Girilen cevaplar silinir.`, 'Çıkar'))) return;
    ldZiyaretSil(did, z.id);
    _ldAcikZiyaretler.delete(z.id);
    _ldDetayCiz();
  } else if (b.hasAttribute('data-ekipman-yenile')) {
    ldZiyaretEkipmanYenile(did, b.getAttribute('data-ekipman-yenile'));
    _ldDetayCiz();
  } else if (b.hasAttribute('data-ekipman-bulgu')) {
    const z = _ldAktifZiyaret(zid);
    const e2 = z && (z.ekipmanOzeti || []).find(x => x.id === b.getAttribute('data-ekipman-bulgu'));
    if (!e2) return;
    const tespit = `${e2.tur} ${e2.ekipmanNo}${e2.lokasyon ? ' (' + e2.lokasyon + ')' : ''}: ${e2.sonucMetni}${e2.uygunDegil.length ? ' — ' + e2.uygunDegil.join('; ') : ''}${e2.gecikmis ? ` (sonraki kontrol tarihi ${_ldTarihGoster(e2.sonrakiKontrol)})` : ''}`;
    ldSerbestBulguEkle(did, zid, tespit, 'acil', e2.tur === 'Yangın Tüpü' || e2.tur === 'Yangın Dolabı' || e2.tur === 'Hidrant' ? _LD_M.yangin : _LD_M.acil);
    _ldDetayCiz();
  }
}

async function _ldZiyaretDegisti(e) {
  const t = e.target;
  const did = _ldAktifDenetimId;
  if (t.hasAttribute('data-lok-not')) {
    ldZiyaretAlanGuncelle(did, t.getAttribute('data-lok-not'), { lokasyonNotu: t.value.trim() });
    return;
  }
  const zid = t.getAttribute('data-z');
  const a = t.getAttribute('data-a');
  if (!zid || !a) return;
  const z = _ldAktifZiyaret(zid);
  const m = z && _ldMaddeBul(z, a);
  if (!m) return;
  if (t.hasAttribute('data-alan')) {
    ldCevapGuncelle(did, zid, a, m, { [t.getAttribute('data-alan')]: t.value.trim() });
  } else if (t.hasAttribute('data-foto-ekle')) {
    const dosya = t.files && t.files[0];
    t.value = '';
    if (!dosya) return;
    try {
      const d = ldDenetimGetir(did);
      const sonuc = await fotoYukle(dosya, 'saha-denetim/' + (d ? d.denetimNo : 'lokasyon'));
      if (!sonuc || !sonuc.url) return;
      const guncel = _ldMaddeBul(_ldAktifZiyaret(zid), a);
      ldCevapGuncelle(did, zid, a, guncel, { fotolar: ((guncel.cevap && guncel.cevap.fotolar) || []).concat(sonuc.url).slice(0, 3) });
      _ldDetayCiz();
    } catch (hata) {
      alert(hata.message || 'Fotoğraf yüklenemedi.');
    }
  }
}

async function _ldTamamlaTiklandi() {
  const d = ldDenetimGetir(_ldAktifDenetimId);
  if (!d) return;
  if (d.tamamlandiMi) {
    if (await onayModali('Kontrol yeniden düzenlemeye açılsın mı?', 'Aç')) { ldDenetimAlanGuncelle(d.id, { tamamlandiMi: false }); _ldDetayCiz(); }
    return;
  }
  const ist = ldDenetimIstatistik(d);
  const eksik = ist.toplam - ist.cevaplanan;
  const mesaj = eksik > 0
    ? `${eksik} madde henüz değerlendirilmedi (raporda "Değerlendirilmedi" görünür). Yine de kontrol tamamlansın mı?`
    : 'Kontrol tamamlandı olarak işaretlensin mi?';
  if (!(await onayModali(mesaj, 'Tamamla'))) return;
  ldDenetimAlanGuncelle(d.id, { tamamlandiMi: true, bitisTarihi: d.bitisTarihi || (d.tarih !== _ldBugunIso() ? _ldBugunIso() : '') });
  _ldDetayCiz();
}

function _ldBelgeAlaniniKur(d) {
  const alan = _ldEl('ldBelgeAlani');
  if (typeof belgeYukleyiciHtml !== 'function') { alan.innerHTML = ''; return; }
  alan.innerHTML = belgeYukleyiciHtml('ldBelge', 'İmzalı Kontrol Raporu');
  belgeYukleyiciBagla('ldBelge', async dosya => {
    try {
      const referans = await belgeDosyasiIsle(dosya, _ldFirma ? _ldFirma.slug : '');
      ldDenetimAlanGuncelle(d.id, { imzaliBelgeUrl: referans });
      _ldDetayCiz();
    } catch (hata) { alert(hata.message || 'Belge yüklenemedi.'); }
  });
  _ldEl('ldBelgeOnizleme').innerHTML = belgeOnizlemeHtml('ldBelge', !!d.imzaliBelgeUrl);
  if (d.imzaliBelgeUrl) {
    _ldEl('ldBelgeAcLink').addEventListener('click', e => { e.preventDefault(); belgeDosyasiniAc(d.imzaliBelgeUrl); });
    _ldEl('ldBelgeKaldirBtn').addEventListener('click', () => { ldDenetimAlanGuncelle(d.id, { imzaliBelgeUrl: '' }); _ldDetayCiz(); });
  }
}

// ---------- Lokasyona giriş ----------

function _ldLokasyonaGir(lokasyonId, yontem) {
  const s = ldZiyaretBaslat(_ldAktifDenetimId, lokasyonId, yontem);
  if (!s.basarili) { alert(s.hata); return; }
  _ldAcikZiyaretler.add(s.ziyaret.id);
  _ldDetayCiz();
  const kart = _ldEl('ldKart_' + s.ziyaret.id);
  if (kart) kart.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (!s.yeniMi && yontem === 'barkod') _ldBildirim(`${s.ziyaret.bolum} — ${s.ziyaret.lokasyon} bu kontrolde zaten açık; kaldığınız yerden devam edebilirsiniz.`);
}

function _ldBildirim(metin) {
  let kutu = _ldEl('ldBildirimKutusu');
  if (!kutu) {
    kutu = document.createElement('div');
    kutu.id = 'ldBildirimKutusu';
    kutu.style.cssText = 'position:fixed; left:50%; bottom:22px; transform:translateX(-50%); background:#1f2937; color:#fff; padding:10px 16px; border-radius:10px; font-size:13.5px; z-index:9999; max-width:90vw; box-shadow:0 6px 20px rgba(0,0,0,.25);';
    document.body.appendChild(kutu);
  }
  kutu.textContent = metin;
  kutu.style.display = 'block';
  clearTimeout(kutu._zaman);
  kutu._zaman = setTimeout(() => { kutu.style.display = 'none'; }, 3500);
}

function _ldLokasyonSecAc() {
  _ldEl('ldLokasyonSecArama').value = '';
  _ldLokasyonSecListeCiz();
  _ldModalAc('ldLokasyonSecModal');
}

function _ldLokasyonSecListeCiz() {
  const d = ldDenetimGetir(_ldAktifDenetimId);
  const ziyaretli = new Set(d ? d.ziyaretler.map(z => z.lokasyonId) : []);
  const ara = ldNormalize(_ldEl('ldLokasyonSecArama').value);
  const liste = ldLokasyonlariGetir().filter(l => !ara || ldNormalize(`${l.kod} ${l.bolum} ${l.lokasyon}`).includes(ara));
  const kutu = _ldEl('ldLokasyonSecListe');
  if (!liste.length) {
    kutu.innerHTML = `<div class="ld-bilgi" style="padding:10px;">Lokasyon bulunamadı. "Lokasyonlar ve Barkodlar" sekmesinden lokasyon tanımlayın.</div>`;
    return;
  }
  let sonBolum = null;
  kutu.innerHTML = liste.map(l => {
    const baslik = l.bolum !== sonBolum ? `<div style="font-weight:600; margin:10px 0 4px;">${_ldK(l.bolum)}</div>` : '';
    sonBolum = l.bolum;
    return baslik + `<button type="button" class="ikincil" data-lok-sec="${l.id}" style="width:100%; text-align:left; margin-bottom:6px;">
      ${ziyaretli.has(l.id) ? '✔ ' : ''}${_ldK(l.lokasyon)} <span class="ld-kod">${_ldK(l.kod)}</span></button>`;
  }).join('');
}

// ---------- Kategori / serbest bulgu ----------

function _ldKategoriSecimHtml(secili, ad) {
  return LD_KATEGORILER.map(k => `<label><input type="checkbox" name="${ad}" value="${k.id}" ${secili.includes(k.id) ? 'checked' : ''}> ${_ldK(k.ad)} <span class="ld-bilgi">(${k.sorular.length})</span></label>`).join('');
}

function _ldKategoriModalAc(zid) {
  const z = _ldAktifZiyaret(zid);
  if (!z) return;
  _ldKategoriBaglam = { ziyaretId: zid };
  _ldEl('ldKategoriSecim').innerHTML = _ldKategoriSecimHtml(z.kategoriler, 'ldKatZ');
  _ldModalAc('ldKategoriModal');
}

function _ldKategoriKaydet() {
  if (!_ldKategoriBaglam) return;
  const secili = Array.from(document.querySelectorAll('input[name="ldKatZ"]:checked')).map(i => i.value);
  if (!secili.length) { alert('En az bir kategori seçin.'); return; }
  ldZiyaretKategorileriGuncelle(_ldAktifDenetimId, _ldKategoriBaglam.ziyaretId, secili);
  _ldModalKapat('ldKategoriModal');
  _ldDetayCiz();
}

function _ldSerbestKaydet() {
  if (!_ldSerbestBaglam) return;
  const tespit = _ldEl('ldSTespit').value.trim();
  if (!tespit) { _ldEl('ldSHata').textContent = 'Tespit metni zorunludur.'; return; }
  ldSerbestBulguEkle(_ldAktifDenetimId, _ldSerbestBaglam.ziyaretId, tespit, _ldEl('ldSKategori').value, _ldEl('ldSMevzuat').value);
  _ldModalKapat('ldSerbestModal');
  _ldDetayCiz();
}

// ---------- Aktarımlar ----------

function _ldAktarAc(zid, anahtar) {
  const z = _ldAktifZiyaret(zid);
  const c = z && z.cevaplar[anahtar];
  if (!c) return;
  _ldAktarBaglam = { ziyaretId: zid, anahtar };
  _ldEl('ldAktarBaslik').textContent = 'Uygunsuzluğa Aktar';
  _ldEl('ldAktarAciklama').textContent = `${z.bolum} — ${z.lokasyon}: ${ldBulguTespiti(c)}`;
  _ldEl('ldASorumlu').value = '';
  _ldEl('ldATermin').value = '';
  _ldEl('ldARisk').value = c.risk || (typeof UYG_VARSAYILAN_RISK !== 'undefined' ? UYG_VARSAYILAN_RISK : '');
  _ldEl('ldAHata').textContent = '';
  _ldModalAc('ldAktarModal');
}

function _ldTopluAktarAc() {
  const d = ldDenetimGetir(_ldAktifDenetimId);
  if (!d) return;
  const bekleyen = ldDenetimBulgulari(d).filter(b => !b.madde.cevap.uygId);
  if (!bekleyen.length) { alert('Aktarılmayı bekleyen bulgu yok.'); return; }
  _ldAktarBaglam = { toplu: true };
  _ldEl('ldAktarBaslik').textContent = `${bekleyen.length} Bulguyu Uygunsuzluğa Aktar`;
  _ldEl('ldAktarAciklama').textContent = 'Her bulgu ayrı bir uygunsuzluk kaydı olur. Bulguda risk seviyesi seçildiyse o kullanılır; seçilmediyse aşağıdaki seviye uygulanır. Sorumlu/termin boş bırakılabilir.';
  _ldEl('ldASorumlu').value = '';
  _ldEl('ldATermin').value = '';
  _ldEl('ldARisk').value = typeof UYG_VARSAYILAN_RISK !== 'undefined' ? UYG_VARSAYILAN_RISK : '';
  _ldEl('ldAHata').textContent = '';
  _ldModalAc('ldAktarModal');
}

function _ldAktarKaydet() {
  if (!_ldAktarBaglam) return;
  const ek = { sorumlu: _ldEl('ldASorumlu').value.trim(), termin: _ldEl('ldATermin').value, riskSeviyesi: _ldEl('ldARisk').value };
  if (_ldAktarBaglam.toplu) {
    const d = ldDenetimGetir(_ldAktifDenetimId);
    let basarili = 0;
    const hatalar = [];
    ldDenetimBulgulari(d).filter(b => !b.madde.cevap.uygId).forEach(b => {
      const s = ldBulguyuUygunsuzlugaAktar(d.id, b.ziyaret.id, b.madde.anahtar, Object.assign({}, ek, { riskSeviyesi: b.madde.cevap.risk || ek.riskSeviyesi }));
      if (s.basarili) basarili++; else hatalar.push(b.no + ': ' + Object.values(s.hatalar || {}).join(' '));
    });
    _ldModalKapat('ldAktarModal');
    _ldDetayCiz();
    alert(`${basarili} bulgu Uygunsuzluk modülüne aktarıldı.${hatalar.length ? '\nAktarılamayan: ' + hatalar.join('\n') : ''}`);
    return;
  }
  const s = ldBulguyuUygunsuzlugaAktar(_ldAktifDenetimId, _ldAktarBaglam.ziyaretId, _ldAktarBaglam.anahtar, ek);
  if (!s.basarili) { _ldEl('ldAHata').textContent = Object.values(s.hatalar || {}).join(' ') || 'Aktarılamadı.'; return; }
  _ldModalKapat('ldAktarModal');
  _ldDetayCiz();
  _ldBildirim(`Uygunsuzluk kaydı oluşturuldu: ${s.kayit.aksiyonNo || ''}`);
}

function _ldRiskeAktar(zid, anahtar) {
  const d = ldDenetimGetir(_ldAktifDenetimId);
  const z = d && d.ziyaretler.find(x => x.id === zid);
  const c = z && z.cevaplar[anahtar];
  if (!c) return;
  const bulgu = ldDenetimBulgulari(d).find(b => b.ziyaret.id === zid && b.madde.anahtar === anahtar);
  const kat = ldKategoriGetir(c.k);
  riskeAktarModaliAc({
    modul: 'saha-lokasyon',
    modulAdi: 'Lokasyon Bazlı Saha Kontrolü',
    id: ldRiskKaynakId(d.id, zid, anahtar),
    etiket: `${d.denetimNo}${bulgu ? ' / ' + bulgu.no : ''}`,
    alanlar: {
      bolum: z.bolum,
      yer: z.lokasyon,
      faaliyet: kat ? kat.ad : '',
      tehlike: ldBulguTespiti(c),
      risk: '',
      onlem: '',
      planlanan: c.oneri || '',
      sorumlu: '',
      termin: '',
      fotoOncesi: (c.fotolar || [])[0] || ''
    },
    sonra: () => _ldDetayCiz()
  });
}

async function _ldWordRapor(id) {
  const d = ldDenetimGetir(id);
  if (!d) return;
  if (!d.ziyaretler.length) { alert('Raporda gösterilecek lokasyon yok. Önce lokasyon ekleyip değerlendirin.'); return; }
  if (typeof docx === 'undefined') { alert('Word bileşeni yüklenemedi (internet bağlantısını kontrol edin).'); return; }
  _ldBildirim('Word raporu hazırlanıyor…');
  try {
    await ldDenetimRaporuWordOlustur(d, _ldFirma);
  } catch (hata) {
    console.error(hata);
    alert('Rapor oluşturulamadı: ' + (hata.message || hata));
  }
}

// ===================== BARKOD TARAMA =====================

function _ldTaramaBaslat() {
  const durum = _ldEl('ldTaramaDurum');
  durum.textContent = '';
  durum.classList.remove('gorunur');
  _ldEl('ldTaramaElle').value = '';
  _ldModalAc('ldTaramaModal');
  if (typeof Html5Qrcode === 'undefined') {
    durum.textContent = 'Kamera bileşeni yüklenemedi; lokasyon kodunu elle yazabilirsiniz.';
    durum.classList.add('gorunur');
    return;
  }
  _ldTaramaMesgul = false;
  _ldTarayici = new Html5Qrcode('ldTaramaOkuyucu', { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE, Html5QrcodeSupportedFormats.CODE_128], verbose: false });
  _ldTarayici.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 240, height: 240 } }, kod => _ldKodOkundu(kod), () => {})
    .catch(h => { durum.textContent = 'Kamera açılamadı: ' + (h.message || h) + ' — lokasyon kodunu elle yazabilirsiniz.'; durum.classList.add('gorunur'); });
}

function _ldTaramaDurdur() {
  _ldModalKapat('ldTaramaModal');
  if (_ldTarayici) {
    const t = _ldTarayici;
    _ldTarayici = null;
    t.stop().then(() => t.clear()).catch(() => {});
  }
}

// Okunan metin: QR'daki adres (…lokasyon.html?firma=x&lok=LOK-0001) ya da
// çizgi barkoddaki/elle yazılan kod.
function _ldKoddanLokasyonKodu(metin) {
  const s = String(metin || '').trim();
  const m = s.match(/[?&]lok=([^&#]+)/i);
  return m ? decodeURIComponent(m[1]) : s;
}

function _ldKodOkundu(metin) {
  if (_ldTaramaMesgul) return;
  const kod = _ldKoddanLokasyonKodu(metin);
  const lok = ldLokasyonKodlaBul(kod);
  const durum = _ldEl('ldTaramaDurum');
  if (!lok) {
    durum.textContent = `"${kod}" koduyla tanımlı lokasyon bulunamadı, taramaya devam ediliyor…`;
    durum.classList.add('gorunur');
    return;
  }
  _ldTaramaMesgul = true;
  _ldTaramaDurdur();
  _ldLokasyonaGir(lok.id, 'barkod');
}

// Telefon kamerasıyla QR okutulup sayfa ?lok= ile açıldıysa: açık denetime
// (yoksa bugün için yeni bir denetime) o lokasyon eklenir.
async function _ldUrlLokasyonuIsle() {
  const p = new URLSearchParams(location.search);
  const kod = p.get('lok');
  if (!kod) return;
  const temizle = () => { try { history.replaceState(null, '', location.pathname); } catch (e) { /* yok say */ } };
  const firmaSlug = p.get('firma');
  if (firmaSlug && _ldFirma && firmaSlug !== _ldFirmaKodu()) {
    alert(`Bu barkod başka bir firmaya ait ("${firmaSlug}"). Aktif firma: ${_ldFirma.ad}. Firma değiştirip tekrar okutun.`);
    temizle();
    return;
  }
  const lok = ldLokasyonKodlaBul(kod);
  if (!lok) { alert(`"${kod}" koduyla tanımlı lokasyon bulunamadı.`); temizle(); return; }
  const acik = ldDenetimleriGetir().filter(d => !d.tamamlandiMi);
  let hedef = acik.find(d => d.tarih === _ldBugunIso() || (d.bitisTarihi && d.tarih <= _ldBugunIso() && _ldBugunIso() <= d.bitisTarihi)) || acik[0] || null;
  if (!hedef) {
    if (!(await onayModali(`Devam eden kontrol yok. ${lok.bolum} — ${lok.lokasyon} için bugün yeni bir kontrol başlatılsın mı?`, 'Başlat'))) { temizle(); return; }
    const s = ldDenetimKaydet({ tarih: _ldBugunIso(), denetciler: (_ldKullanici && _ldKullanici.adSoyad) || 'İSG Uzmanı' });
    if (!s.basarili) { alert('Kontrol başlatılamadı.'); temizle(); return; }
    hedef = s.denetim;
  }
  temizle();
  _ldDetayAc(hedef.id);
  _ldLokasyonaGir(lok.id, 'barkod');
}

// ===================== LOKASYONLAR =====================

function _ldLokasyonFiltreli() {
  const ara = ldNormalize(_ldEl('ldLokasyonArama').value);
  return ldLokasyonlariGetir().filter(l => !ara || ldNormalize(`${l.kod} ${l.bolum} ${l.lokasyon} ${l.aciklama}`).includes(ara));
}

function _ldLokasyonListesiCiz() {
  const liste = _ldLokasyonFiltreli();
  const govde = _ldEl('ldLokasyonGovde');
  const bos = _ldEl('ldLokasyonBos');
  _ldEl('ldLokTumunuSec').checked = false;
  if (!liste.length) {
    govde.innerHTML = '';
    bos.textContent = _ldEl('ldLokasyonArama').value ? 'Aramayla eşleşen lokasyon yok.' : 'Henüz lokasyon tanımlanmadı. "+ Lokasyon Ekle" ile bölüm ve katları ekleyin.';
    bos.classList.add('gorunur');
    return;
  }
  bos.classList.remove('gorunur');
  govde.innerHTML = liste.map(l => {
    const ekipman = ldLokasyonEkipmanlari(l.bolum, l.lokasyon).length;
    const katAdlari = l.kategoriler.map(k => (ldKategoriGetir(k) || {}).ad).filter(Boolean).join(', ');
    return `<tr>
      <td><input type="checkbox" data-lok-cb="${l.id}" style="width:auto; margin:0;"></td>
      <td class="ld-kod">${_ldK(l.kod)}</td>
      <td>${_ldK(l.bolum)}</td>
      <td>${_ldK(l.lokasyon)}${l.aciklama ? `<div class="ld-bilgi">${_ldK(l.aciklama)}</div>` : ''}</td>
      <td title="${_ldK(katAdlari)}">${l.kategoriler.length} kategori</td>
      <td>${ekipman ? ekipman + ' ekipman' : '<span class="ld-bilgi">eşleşme yok</span>'}</td>
      <td>
        <button class="tablo-buton" data-lok-duzenle="${l.id}">Düzenle</button>
        <button class="tablo-buton" data-lok-barkod="${l.id}">Barkod</button>
        <button class="tablo-buton sil" data-lok-sil="${l.id}">Sil</button>
      </td>
    </tr>`;
  }).join('');
}

async function _ldLokasyonListesiTiklandi(e) {
  const duz = e.target.closest('[data-lok-duzenle]');
  const bar = e.target.closest('[data-lok-barkod]');
  const sil = e.target.closest('[data-lok-sil]');
  if (duz) _ldLokasyonModalAc(ldLokasyonGetir(duz.getAttribute('data-lok-duzenle')));
  else if (bar) {
    const l = ldLokasyonGetir(bar.getAttribute('data-lok-barkod'));
    if (l) ldBarkodEtiketleriPdf([l], _ldFirma, _ldBarkodUrl);
  } else if (sil) {
    const l = ldLokasyonGetir(sil.getAttribute('data-lok-sil'));
    if (!l) return;
    if (!(await onayModali(`${l.kod} ${l.bolum} — ${l.lokasyon} silinsin mi? (Geçmiş kontrollerdeki kayıtları etkilenmez; asılı barkodu artık okunmaz.)`, 'Sil'))) return;
    const s = ldLokasyonSil(l.id);
    if (!s.basarili) { alert(s.hata); return; }
    _ldLokasyonListesiCiz();
  }
}

function _ldLokasyonModalAc(l) {
  _ldLokasyonDuzenlenenId = l ? l.id : null;
  _ldEl('ldLokasyonModalBaslik').textContent = l ? `Lokasyonu Düzenle (${l.kod})` : 'Lokasyon Ekle';
  _ldEl('ldLBolum').value = l ? l.bolum : '';
  _ldEl('ldLLokasyon').value = l ? l.lokasyon : '';
  _ldEl('ldLLokasyonCoklu').value = '';
  _ldEl('ldLCoklu').checked = false;
  _ldEl('ldLCokluSecimEtiket').classList.toggle('ld-gizli', !!l);
  _ldEl('ldLAciklama').value = l ? l.aciklama : '';
  _ldEl('ldLKategoriler').innerHTML = _ldKategoriSecimHtml(l ? l.kategoriler : ldVarsayilanKategoriler(), 'ldKatL');
  ['ldLBolumHata', 'ldLLokasyonHata', 'ldLKategorilerHata'].forEach(id => { _ldEl(id).textContent = ''; });
  _ldEl('ldAcilBolumListesi').innerHTML = ldAcilBolumleri().map(b => `<option value="${_ldK(b)}">`).join('');
  _ldCokluModGuncelle();
  _ldLokasyonModalBolumDegisti();
  _ldModalAc('ldLokasyonModal');
}

function _ldCokluModGuncelle() {
  const coklu = _ldEl('ldLCoklu').checked;
  _ldEl('ldLLokasyon').classList.toggle('ld-gizli', coklu);
  _ldEl('ldLLokasyonCoklu').classList.toggle('ld-gizli', !coklu);
  _ldEl('ldLLokasyonEtiket').textContent = coklu ? 'Lokasyonlar / Katlar (her satıra bir tane)' : 'Lokasyon / Kat';
}

function _ldLokasyonModalBolumDegisti() {
  _ldEl('ldAcilLokasyonListesi').innerHTML = ldAcilLokasyonlari(_ldEl('ldLBolum').value).map(b => `<option value="${_ldK(b)}">`).join('');
  _ldLokasyonEkipmanBilgisiCiz();
}

function _ldLokasyonEkipmanBilgisiCiz() {
  const bolum = _ldEl('ldLBolum').value.trim();
  const kutu = _ldEl('ldLEkipmanBilgi');
  if (!bolum) { kutu.textContent = ''; return; }
  const lok = _ldEl('ldLCoklu').checked ? '' : _ldEl('ldLLokasyon').value.trim();
  const n = ldLokasyonEkipmanlari(bolum, lok).length;
  kutu.textContent = n
    ? `🧯 Acil Durum modülünde bu ${lok ? 'lokasyonla' : 'bölümle'} eşleşen ${n} ekipman var; son kontrol durumları kontrole gelecek.`
    : '🧯 Acil Durum modülünde bu adla eşleşen ekipman yok (adları oradakiyle aynı yazarsanız ekipman durumları kontrole gelir).';
}

function _ldLokasyonModalKaydet() {
  const kategoriler = Array.from(document.querySelectorAll('input[name="ldKatL"]:checked')).map(i => i.value);
  const ortak = { bolum: _ldEl('ldLBolum').value, aciklama: _ldEl('ldLAciklama').value, kategoriler };
  ['ldLBolumHata', 'ldLLokasyonHata', 'ldLKategorilerHata'].forEach(id => { _ldEl(id).textContent = ''; });
  const hataGoster = h => {
    _ldEl('ldLBolumHata').textContent = h.bolum || '';
    _ldEl('ldLLokasyonHata').textContent = h.lokasyon || h.genel || '';
    _ldEl('ldLKategorilerHata').textContent = h.kategoriler || '';
  };
  if (!_ldLokasyonDuzenlenenId && _ldEl('ldLCoklu').checked) {
    const satirlar = _ldEl('ldLLokasyonCoklu').value.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    if (!satirlar.length) { _ldEl('ldLLokasyonHata').textContent = 'En az bir lokasyon yazın.'; return; }
    const hatalar = [];
    let eklenen = 0;
    satirlar.forEach(lokasyon => {
      const s = ldLokasyonKaydet(Object.assign({}, ortak, { lokasyon }));
      if (s.basarili) eklenen++; else hatalar.push(`${lokasyon}: ${Object.values(s.hatalar).join(' ')}`);
    });
    if (!eklenen && hatalar.length) { hataGoster({ lokasyon: hatalar.join(' | ') }); return; }
    _ldModalKapat('ldLokasyonModal');
    _ldLokasyonListesiCiz();
    alert(`${eklenen} lokasyon eklendi.${hatalar.length ? '\nEklenemeyen: ' + hatalar.join('\n') : ''}`);
    return;
  }
  const s = ldLokasyonKaydet(Object.assign({}, ortak, { id: _ldLokasyonDuzenlenenId || undefined, lokasyon: _ldEl('ldLLokasyon').value }));
  if (!s.basarili) { hataGoster(s.hatalar); return; }
  _ldModalKapat('ldLokasyonModal');
  _ldLokasyonListesiCiz();
}
