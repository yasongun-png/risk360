// Yüklenici İSG Uyum Değerlendirmesi. Kullanıcı isteği: "yüklenici
// değerlendirmesi yapalım; belli tarih aralıklarında yaptıkları bir işte İSG
// uyumu değerlendirmesi; firma bilgileri var, tarih aralığı girip kontrol
// listesi ile İSG uyum denetimi ve puanlama olsun".
//
// Her madde: Uygun (2) / Kısmen (1) / Uygun Değil (0) / Uygulanmaz (puana
// girmez). Puan = alınan / (değerlendirilen madde × 2) × 100. Sınıf:
// A (≥85) Uygun — çalışılabilir, B (70–84) İyileştirme gerekli, C (<70) Yetersiz.

// Kullanıcı isteği (2026-10-19): "Dokümantasyon ve Yasal Gereklilikler" grubu
// şimdilik çıkarıldı (d1–d6; personel evrakları zaten Personel Kayıtları'nda
// takip ediliyor). Eski kayıtlardaki d* cevapları puana girmez.
const YK_DEG_KRITERLERI = [
  { id: 's1', grup: 'Saha Uygulamaları', metin: 'KKD (baret, gözlük, iş ayakkabısı vb.) eksiksiz ve doğru kullanıldı' },
  { id: 's2', grup: 'Saha Uygulamaları', metin: 'Yüksekte çalışma önlemleri alındı (emniyet kemeri, iskele, korkuluk)' },
  { id: 's3', grup: 'Saha Uygulamaları', metin: 'Çalışma izinleri (sıcak iş, kapalı alan, yüksekte vb.) alındı ve kurallara uyuldu' },
  { id: 's4', grup: 'Saha Uygulamaları', metin: 'Çalışma alanı düzenli, temiz, çevrilmiş ve işaretlenmiş' },
  { id: 's5', grup: 'Saha Uygulamaları', metin: 'Ekipman ve el aletleri sağlam, periyodik kontrolleri yapılmış' },
  { id: 's6', grup: 'Saha Uygulamaları', metin: 'Elektrikli çalışmalarda güvenlik önlemleri (kilitleme-etiketleme) uygulandı' },
  { id: 's7', grup: 'Saha Uygulamaları', metin: 'Kimyasal / tehlikeli madde kullanımı ve depolaması uygun' },
  { id: 's8', grup: 'Saha Uygulamaları', metin: 'Yangın önlemleri alındı (söndürücü, sıcak işte gözcü vb.)' },
  // Kullanıcı isteği: dokümantasyon grubu yerine tek madde.
  { id: 'y0', grup: 'Yönetim ve İletişim', metin: 'İstenen evraklar zamanında ve eksiksiz gönderildi' },
  { id: 'y1', grup: 'Yönetim ve İletişim', metin: 'Firma sorumlusu / formen sahada ve ulaşılabilir' },
  { id: 'y2', grup: 'Yönetim ve İletişim', metin: 'İSG talimatlarına ve yapılan uyarılara uyuldu' },
  { id: 'y3', grup: 'Yönetim ve İletişim', metin: 'İş kazası / ramak kala olayları zamanında bildirildi' },
  { id: 'y4', grup: 'Yönetim ve İletişim', metin: 'İş bitiminde alan güvenli ve temiz teslim edildi' }
];

const YK_DEG_CEVAPLARI = [
  { deger: '2', ad: 'Uygun' },
  { deger: '1', ad: 'Kısmen' },
  { deger: '0', ad: 'Uygun Değil' },
  { deger: 'na', ad: 'Uygulanmaz' }
];

let _ykDuzenlenenDegId = null;

function _ykDegAnahtari() { return tenantAnahtar('yuklenici_degerlendirmeler'); }
function yukleniciDegerlendirmeleriTumunuGetir() { return oku(_ykDegAnahtari(), []); }

// cevaplar: { kriterId: { deger: '2'|'1'|'0'|'na'|'', not } }
function yukleniciDegPuanHesapla(cevaplar) {
  let alinan = 0, azami = 0, cevaplanan = 0;
  YK_DEG_KRITERLERI.forEach(k => {
    const c = (cevaplar || {})[k.id];
    if (!c || c.deger === '' || c.deger == null) return;
    cevaplanan++;
    if (c.deger === 'na') return;
    azami += 2;
    alinan += Number(c.deger) || 0;
  });
  const puan = azami ? Math.round(alinan / azami * 100) : null;
  let sinif = '', sonuc = '';
  if (puan !== null) {
    if (puan >= 85) { sinif = 'A'; sonuc = 'Uygun — çalışılabilir'; }
    else if (puan >= 70) { sinif = 'B'; sonuc = 'İyileştirme gerekli'; }
    else { sinif = 'C'; sonuc = 'Yetersiz — çalışma riskli'; }
  }
  return { puan, sinif, sonuc, alinan, azami, cevaplanan };
}

function yukleniciDegerlendirmeleriniGetir(aramaMetni, firmaId) {
  let liste = yukleniciDegerlendirmeleriTumunuGetir().map(d => Object.assign({}, d, yukleniciDegPuanHesapla(d.cevaplar)));
  if (firmaId) liste = liste.filter(d => d.firmaId === firmaId);
  if (aramaMetni) {
    const a = _basligiNormallestir(aramaMetni);
    liste = liste.filter(d => _basligiNormallestir(d.firmaAdi + ' ' + (d.isTanimi || '') + ' ' + (d.degerlendiren || '')).includes(a));
  }
  return liste.sort((x, y) => (y.bitis || '').localeCompare(x.bitis || '') || (y.olusturmaTarihi || '').localeCompare(x.olusturmaTarihi || ''));
}

// Firma tablosu için: firmanın en son (bitiş tarihi en yeni) değerlendirmesi.
function yukleniciFirmaSonDegerlendirme(firmaId) {
  return yukleniciDegerlendirmeleriniGetir('', firmaId)[0] || null;
}

function _ykDegDogrula(v) {
  const hatalar = {};
  if (!v.firmaId) hatalar.firma = 'Firma seçin.';
  if (!v.baslangic) hatalar.baslangic = 'Başlangıç tarihi girin.';
  if (!v.bitis) hatalar.bitis = 'Bitiş tarihi girin.';
  if (v.baslangic && v.bitis && v.bitis < v.baslangic) hatalar.bitis = 'Bitiş, başlangıçtan önce olamaz.';
  if (!yukleniciDegPuanHesapla(v.cevaplar).azami) hatalar.genel = 'En az bir maddeyi Uygun / Kısmen / Uygun Değil olarak puanlayın.';
  return { gecerli: !Object.keys(hatalar).length, hatalar };
}

function yukleniciDegerlendirmeKaydet(id, v) {
  const d = _ykDegDogrula(v);
  if (!d.gecerli) return { basarili: false, hatalar: d.hatalar };
  const firma = yukleniciFirmaIdIleGetirRepo(v.firmaId);
  const alanlar = {
    firmaId: v.firmaId,
    firmaAdi: firma ? firma.firmaAdi : '',
    baslangic: v.baslangic,
    bitis: v.bitis,
    isTanimi: (v.isTanimi || '').trim(),
    lokasyon: (v.lokasyon || '').trim(),
    degerlendiren: (v.degerlendiren || '').trim(),
    kazaSayisi: Math.max(0, parseInt(v.kazaSayisi, 10) || 0),
    ramakKalaSayisi: Math.max(0, parseInt(v.ramakKalaSayisi, 10) || 0),
    cevaplar: v.cevaplar || {},
    notlar: (v.notlar || '').trim()
  };
  const liste = yukleniciDegerlendirmeleriTumunuGetir();
  if (id) {
    const i = liste.findIndex(x => x.id === id);
    if (i === -1) return { basarili: false, hatalar: { genel: 'Kayıt bulunamadı.' } };
    liste[i] = Object.assign({}, liste[i], _yukleniciGuncellemeIzi(alanlar));
  } else {
    liste.push(_yukleniciEklemeIzi(Object.assign({ id: rastgeleId(), olusturmaTarihi: new Date().toISOString() }, alanlar)));
  }
  yaz(_ykDegAnahtari(), liste);
  return { basarili: true };
}

function yukleniciDegerlendirmeSil(id) {
  if (!_silmeYetkisiKontrolEt()) return { basarili: false };
  yaz(_ykDegAnahtari(), yukleniciDegerlendirmeleriTumunuGetir().filter(d => d.id !== id));
  return { basarili: true };
}

// ==================== UI ====================

function _ykDegSinifRozeti(d) {
  if (d.puan === null || d.puan === undefined) return '<span class="genel-rozet rozet-normal">—</span>';
  const sinif = d.sinif === 'A' ? 'rozet-uygun' : d.sinif === 'B' ? 'rozet-yaklasiyor' : 'rozet-uygun-degil';
  return `<span class="genel-rozet ${sinif}" title="${_ykKacir(d.sonuc)}">${d.puan} / 100 · ${d.sinif}</span>`;
}

function degerlendirmeleriCiz() {
  const govde = document.getElementById('degTabloGovde');
  const bos = document.getElementById('degBosDurum');
  const liste = yukleniciDegerlendirmeleriniGetir(document.getElementById('degAramaKutusu').value, document.getElementById('degFirmaFiltre').value);
  govde.innerHTML = '';
  if (!liste.length) {
    bos.classList.add('gorunur');
    bos.textContent = yukleniciDegerlendirmeleriTumunuGetir().length ? 'Aramanızla eşleşen değerlendirme bulunamadı.' : 'Henüz değerlendirme yapılmadı. "+ Yeni Değerlendirme" ile başlayın.';
    return;
  }
  bos.classList.remove('gorunur');
  govde.innerHTML = liste.map(d => `
    <tr>
      <td>${formatTarihGoster(d.baslangic)} – ${formatTarihGoster(d.bitis)}</td>
      <td>${_ykKacir(d.firmaAdi)}</td>
      <td>${_ykKacir(d.isTanimi) || '-'}</td>
      <td>${_ykDegSinifRozeti(d)}</td>
      <td style="font-size:12px;">${_ykKacir(d.sonuc || '')}</td>
      <td>${_ykKacir(d.degerlendiren) || '-'}</td>
      <td>
        <button class="tablo-buton" data-deg-yazdir="${d.id}">Yazdır</button>
        <button class="tablo-buton" data-deg-duzenle="${d.id}">Düzenle</button>
        <button class="tablo-buton sil" data-deg-sil="${d.id}">Sil</button>
      </td>
    </tr>`).join('');
  govde.querySelectorAll('[data-deg-yazdir]').forEach(b => b.addEventListener('click', () => yukleniciDegerlendirmeYazdir(b.getAttribute('data-deg-yazdir'))));
  govde.querySelectorAll('[data-deg-duzenle]').forEach(b => b.addEventListener('click', () => degerlendirmeModalAc(yukleniciDegerlendirmeleriTumunuGetir().find(x => x.id === b.getAttribute('data-deg-duzenle')))));
  govde.querySelectorAll('[data-deg-sil]').forEach(b => b.addEventListener('click', async () => {
    if (!(await onayModali('Bu değerlendirmeyi silmek istediğinize emin misiniz?', 'Sil'))) return;
    if (yukleniciDegerlendirmeSil(b.getAttribute('data-deg-sil')).basarili) { degerlendirmeleriCiz(); if (typeof firmalariCiz === 'function') firmalariCiz(document.getElementById('firmaAramaKutusu').value); }
  }));
}

function _ykDegFirmaSecenekleri(secili) {
  const firmalar = yukleniciFirmalariTumunuGetir().slice().sort((a, b) => a.firmaAdi.localeCompare(b.firmaAdi, 'tr'));
  return '<option value="">— Firma seçin —</option>' + firmalar.map(f => `<option value="${f.id}" ${f.id === secili ? 'selected' : ''}>${_ykKacir(f.firmaAdi)}</option>`).join('');
}

function _ykDegListeHtml(cevaplar) {
  let grup = '';
  return YK_DEG_KRITERLERI.map((k, i) => {
    const c = (cevaplar || {})[k.id] || {};
    const baslik = k.grup !== grup ? `<tr><td colspan="3" style="background:#f1f5f9; font-weight:700; font-size:12.5px;">${_ykKacir(k.grup)}</td></tr>` : '';
    grup = k.grup;
    return baslik + `
      <tr data-deg-kriter="${k.id}">
        <td style="font-size:13px;">${i + 1}. ${_ykKacir(k.metin)}</td>
        <td style="white-space:nowrap;">
          <select data-deg-deger style="width:auto; margin:0;">
            <option value="">— Seçin —</option>
            ${YK_DEG_CEVAPLARI.map(o => `<option value="${o.deger}" ${c.deger === o.deger ? 'selected' : ''}>${o.ad}</option>`).join('')}
          </select>
        </td>
        <td><input type="text" data-deg-not value="${_ykKacir(c.not || '')}" placeholder="Açıklama / tespit" style="margin:0; min-width:140px;"></td>
      </tr>`;
  }).join('');
}

function _ykDegFormCevaplari() {
  const cevaplar = {};
  document.querySelectorAll('#degKriterGovde [data-deg-kriter]').forEach(tr => {
    const deger = tr.querySelector('[data-deg-deger]').value;
    const not = tr.querySelector('[data-deg-not]').value.trim();
    if (deger || not) cevaplar[tr.getAttribute('data-deg-kriter')] = { deger, not };
  });
  return cevaplar;
}

function _ykDegCanliPuan() {
  const p = yukleniciDegPuanHesapla(_ykDegFormCevaplari());
  document.getElementById('degCanliPuan').innerHTML = p.puan === null
    ? `<span style="color:var(--metin-soluk);">Puan: maddeleri değerlendirdikçe hesaplanır (${p.cevaplanan}/${YK_DEG_KRITERLERI.length})</span>`
    : `Puan: ${_ykDegSinifRozeti(p)} <span style="font-size:12.5px;">${_ykKacir(p.sonuc)} — ${p.cevaplanan}/${YK_DEG_KRITERLERI.length} madde değerlendirildi</span>`;
}

function degerlendirmeModalAc(kayit) {
  _ykDuzenlenenDegId = kayit ? kayit.id : null;
  const k = kayit || {};
  const kullanici = typeof oturumdakiKullanici === 'function' ? oturumdakiKullanici() : null;
  document.getElementById('degModalBaslik').textContent = kayit ? 'Değerlendirmeyi Düzenle' : 'Yeni İSG Uyum Değerlendirmesi';
  document.getElementById('degFirma').innerHTML = _ykDegFirmaSecenekleri(k.firmaId || document.getElementById('degFirmaFiltre').value);
  document.getElementById('degBaslangic').value = k.baslangic || '';
  document.getElementById('degBitis').value = k.bitis || bugunIso();
  document.getElementById('degIsTanimi').value = k.isTanimi || '';
  document.getElementById('degLokasyon').value = k.lokasyon || '';
  document.getElementById('degDegerlendiren').value = k.degerlendiren || (kullanici ? (kullanici.adSoyad || '') : '');
  document.getElementById('degKazaSayisi').value = k.kazaSayisi || 0;
  document.getElementById('degRamakKalaSayisi').value = k.ramakKalaSayisi || 0;
  document.getElementById('degNotlar').value = k.notlar || '';
  document.getElementById('degKriterGovde').innerHTML = _ykDegListeHtml(k.cevaplar);
  document.getElementById('degHata').textContent = '';
  _ykDegCanliPuan();
  document.getElementById('degModalKatman').classList.add('acik');
}

function degerlendirmeModalKapat() {
  document.getElementById('degModalKatman').classList.remove('acik');
  _ykDuzenlenenDegId = null;
}

function _ykDegKaydet() {
  const v = {
    firmaId: document.getElementById('degFirma').value,
    baslangic: document.getElementById('degBaslangic').value,
    bitis: document.getElementById('degBitis').value,
    isTanimi: document.getElementById('degIsTanimi').value,
    lokasyon: document.getElementById('degLokasyon').value,
    degerlendiren: document.getElementById('degDegerlendiren').value,
    kazaSayisi: document.getElementById('degKazaSayisi').value,
    ramakKalaSayisi: document.getElementById('degRamakKalaSayisi').value,
    notlar: document.getElementById('degNotlar').value,
    cevaplar: _ykDegFormCevaplari()
  };
  const sonuc = yukleniciDegerlendirmeKaydet(_ykDuzenlenenDegId, v);
  if (!sonuc.basarili) {
    document.getElementById('degHata').textContent = Object.values(sonuc.hatalar).join(' ');
    return;
  }
  degerlendirmeModalKapat();
  degerlendirmeleriCiz();
  if (typeof firmalariCiz === 'function') firmalariCiz(document.getElementById('firmaAramaKutusu').value);
}

// Yazdırılabilir rapor (imza alanlı), görünmez çerçeveden yazdırılır.
function yukleniciDegerlendirmeYazdir(id) {
  const ham = yukleniciDegerlendirmeleriTumunuGetir().find(x => x.id === id);
  if (!ham) return;
  const d = Object.assign({}, ham, yukleniciDegPuanHesapla(ham.cevaplar));
  const firma = yukleniciFirmaIdIleGetirRepo(d.firmaId) || {};
  const aktif = typeof aktifFirmaGetir === 'function' ? aktifFirmaGetir() : null;
  const ad = v => _ykKacir(v || '');
  const cevapAdi = deger => (YK_DEG_CEVAPLARI.find(o => o.deger === deger) || { ad: '—' }).ad;
  let grup = '';
  const satirlar = YK_DEG_KRITERLERI.map((k, i) => {
    const c = (d.cevaplar || {})[k.id] || {};
    const baslik = k.grup !== grup ? `<tr><td colspan="4" class="grup">${ad(k.grup)}</td></tr>` : '';
    grup = k.grup;
    const renk = c.deger === '0' ? '#fee2e2' : c.deger === '1' ? '#fef3c7' : '';
    return baslik + `<tr><td class="no">${i + 1}</td><td>${ad(k.metin)}</td><td class="c" style="background:${renk}">${cevapAdi(c.deger)}</td><td>${ad(c.not)}</td></tr>`;
  }).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Yüklenici İSG Uyum Değerlendirmesi - ${ad(d.firmaAdi)}</title>
    <style>
      @page { size: A4; margin: 12mm; }
      body { font-family: Arial, sans-serif; font-size: 11px; color: #111; }
      h1 { font-size: 16px; text-align: center; margin: 0 0 4px; }
      .alt { text-align: center; font-size: 11px; margin-bottom: 10px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
      td, th { border: 1px solid #94a3b8; padding: 4px 6px; vertical-align: top; }
      th { background: #e2e8f0; text-align: left; }
      .grup { background: #f1f5f9; font-weight: bold; }
      .no { width: 22px; text-align: center; } .c { width: 80px; text-align: center; }
      .puan { font-size: 14px; font-weight: bold; }
      .imza td { height: 60px; width: 50%; }
    </style></head><body>
    <h1>YÜKLENİCİ İSG UYUM DEĞERLENDİRMESİ</h1>
    <div class="alt">${ad(aktif ? aktif.ad : '')}</div>
    <table>
      <tr><th style="width:22%">Yüklenici Firma</th><td>${ad(d.firmaAdi)}</td><th style="width:18%">Değerlendirme Dönemi</th><td>${formatTarihGoster(d.baslangic)} – ${formatTarihGoster(d.bitis)}</td></tr>
      <tr><th>Yapılan İş</th><td>${ad(d.isTanimi)}</td><th>Lokasyon</th><td>${ad(d.lokasyon)}</td></tr>
      <tr><th>Firma Yetkilisi</th><td>${ad(firma.yetkiliAdi)}</td><th>Değerlendiren</th><td>${ad(d.degerlendiren)}</td></tr>
      <tr><th>İş Kazası Sayısı</th><td>${d.kazaSayisi || 0}</td><th>Ramak Kala Sayısı</th><td>${d.ramakKalaSayisi || 0}</td></tr>
    </table>
    <table><tr><th class="no">No</th><th>Kriter</th><th class="c">Sonuç</th><th>Açıklama / Tespit</th></tr>${satirlar}</table>
    <table>
      <tr><th style="width:22%">Puan</th><td class="puan">${d.puan === null ? '—' : d.puan + ' / 100'} &nbsp; Sınıf: ${ad(d.sinif) || '—'}</td></tr>
      <tr><th>Sonuç</th><td>${ad(d.sonuc)}</td></tr>
      <tr><th>Puanlama</th><td>Uygun = 2, Kısmen = 1, Uygun Değil = 0, Uygulanmaz = puana girmez. A ≥ 85, B 70–84, C &lt; 70.</td></tr>
      <tr><th>Notlar</th><td>${ad(d.notlar).replace(/\n/g, '<br>')}</td></tr>
    </table>
    <table class="imza"><tr><th>Değerlendiren (İSG)</th><th>Yüklenici Firma Yetkilisi</th></tr><tr><td>${ad(d.degerlendiren)}</td><td>${ad(firma.yetkiliAdi)}</td></tr></table>
    </body></html>`;
  const cerceve = document.createElement('iframe');
  cerceve.style.cssText = 'position:fixed; right:0; bottom:0; width:0; height:0; border:0;';
  document.body.appendChild(cerceve);
  cerceve.contentDocument.open();
  cerceve.contentDocument.write(html);
  cerceve.contentDocument.close();
  setTimeout(() => {
    cerceve.contentWindow.focus();
    cerceve.contentWindow.print();
    setTimeout(() => cerceve.remove(), 1000);
  }, 100);
}

function yukleniciDegerlendirmeBaslat() {
  const filtre = document.getElementById('degFirmaFiltre');
  const filtreDoldur = () => {
    const secili = filtre.value;
    filtre.innerHTML = _ykDegFirmaSecenekleri(secili).replace('— Firma seçin —', 'Tüm Firmalar');
  };
  filtreDoldur();
  filtre.addEventListener('focus', filtreDoldur);
  filtre.addEventListener('change', degerlendirmeleriCiz);
  document.getElementById('degAramaKutusu').addEventListener('input', degerlendirmeleriCiz);
  document.getElementById('yeniDegBtn').addEventListener('click', () => degerlendirmeModalAc(null));
  document.getElementById('degModalIptalBtn').addEventListener('click', degerlendirmeModalKapat);
  document.getElementById('degModalKaydetBtn').addEventListener('click', _ykDegKaydet);
  document.getElementById('degKriterGovde').addEventListener('change', _ykDegCanliPuan);
  document.getElementById('degTumuUygunBtn').addEventListener('click', () => {
    document.querySelectorAll('#degKriterGovde [data-deg-deger]').forEach(s => { if (!s.value) s.value = '2'; });
    _ykDegCanliPuan();
  });
}
