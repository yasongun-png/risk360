// Risk Değerlendirme Ekipleri sekmesi. Kullanıcı isteği: "bir sekme olarak
// risk değerlendirmesi ekiplerini ekleyelim, birden fazla uzman hekim ve
// işveren vekili ekleyebileyim, özel tanımlamalar yapabileyim".
// Veri: riskEkipleriGetir/Kaydet ve riskEkipGorevleriGetir/Kaydet
// (repository.js). Raporlar ekibi rapor penceresindeki seçimden alır
// (bkz. ui.js hazirlayanModalAc).

function riskTumEkipGorevleri() {
  const ozel = riskEkipGorevleriGetir().filter(g => !RISK_EKIBI_GOREVLERI.includes(g));
  return RISK_EKIBI_GOREVLERI.concat(ozel);
}

function _ekipKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// ---- Görev tanımları ----
function _ekipGorevleriniCiz() {
  const kap = document.getElementById('ekipGorevListesi');
  const ozel = riskEkipGorevleriGetir();
  kap.innerHTML = RISK_EKIBI_GOREVLERI.map(g => `<span class="genel-rozet" style="background:#e5e7eb; color:#111827;">${_ekipKacir(g)}</span>`).join('') +
    ozel.map((g, i) => `<span class="genel-rozet" style="background:#dbeafe; color:#1e3a8a;">${_ekipKacir(g)} <button type="button" data-gorev-sil="${i}" title="Tanımı kaldır" style="border:none; background:none; color:inherit; cursor:pointer; padding:0 0 0 4px; width:auto; font-weight:700;">✕</button></span>`).join('');
  kap.querySelectorAll('[data-gorev-sil]').forEach(b => b.addEventListener('click', () => {
    const liste = riskEkipGorevleriGetir().slice();
    liste.splice(Number(b.dataset.gorevSil), 1);
    riskEkipGorevleriKaydet(liste);
    ekipleriCiz();
  }));
}

function _ekipGorevEkle() {
  const girdi = document.getElementById('ekipYeniGorev');
  const ad = girdi.value.trim();
  if (!ad) return;
  if (riskTumEkipGorevleri().some(g => g.toLocaleLowerCase('tr') === ad.toLocaleLowerCase('tr'))) { alert('Bu görev zaten tanımlı.'); return; }
  riskEkipGorevleriKaydet(riskEkipGorevleriGetir().concat(ad));
  girdi.value = '';
  ekipleriCiz();
}

// ---- Ekipler ----
function _ekipGorevSecimiHtml(secili) {
  const gorevler = riskTumEkipGorevleri();
  const liste = secili && !gorevler.includes(secili) ? gorevler.concat(secili) : gorevler;
  return `<option value="">— Görev —</option>` + liste.map(g => `<option ${g === secili ? 'selected' : ''}>${_ekipKacir(g)}</option>`).join('');
}

function _ekipKartiHtml(ekip, ekipIndex, bolumler) {
  const uyeler = ekip.uyeler || [];
  const bolumSecenek = bolumler.map(b => `<label style="display:inline-flex; align-items:center; gap:4px; font-weight:400; margin:0 12px 4px 0; font-size:12.5px;"><input type="checkbox" data-ekip-bolum value="${_ekipKacir(b)}" ${(ekip.bolumler || []).includes(b) ? 'checked' : ''} style="width:auto; margin:0;">${_ekipKacir(b)}</label>`).join('');
  const satirlar = uyeler.map((u, i) => `
    <tr data-uye="${i}">
      <td><select data-alan="gorev" style="margin:0;">${_ekipGorevSecimiHtml(u.gorev)}</select></td>
      <td><input type="text" data-alan="adSoyad" list="riskEkibiPersonelListesi" value="${_ekipKacir(u.adSoyad)}" placeholder="Ad Soyad" style="margin:0;"></td>
      <td><input type="text" data-alan="belgeNo" value="${_ekipKacir(u.belgeNo)}" placeholder="Belge No / Unvan" style="margin:0;"></td>
      <td style="white-space:nowrap;">
        <button type="button" class="tablo-buton" data-uye-yukari title="Yukarı" ${i === 0 ? 'disabled' : ''}>↑</button>
        <button type="button" class="tablo-buton" data-uye-asagi title="Aşağı" ${i === uyeler.length - 1 ? 'disabled' : ''}>↓</button>
        <button type="button" class="tablo-buton sil" data-uye-sil title="Üyeyi kaldır">✕</button>
      </td>
    </tr>`).join('');
  return `
    <div class="ekip-karti" data-ekip="${ekipIndex}" style="background:var(--kart-bg); border-radius:10px; padding:12px 14px; box-shadow:var(--golge); margin-bottom:14px;">
      <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:8px;">
        <input type="text" data-ekip-ad value="${_ekipKacir(ekip.ad)}" placeholder="Ekip adı" style="flex:1; min-width:220px; margin:0; font-weight:700;">
        <span style="font-size:12px; color:var(--metin-soluk);">${uyeler.length} üye</span>
        <button type="button" class="tablo-buton sil" data-ekip-sil>Ekibi Sil</button>
      </div>
      ${bolumler.length ? `<div style="margin-bottom:8px;"><div style="font-size:12px; color:var(--metin-soluk); margin-bottom:4px;">Kullanılacağı bölümler (hiçbiri seçilmezse tüm bölümler):</div>${bolumSecenek}</div>` : ''}
      <div class="tablo-scroll">
        <table class="veri-tablosu">
          <thead><tr><th style="width:30%;">Görevi</th><th>Adı Soyadı</th><th style="width:22%;">Belge No / Unvan</th><th style="width:120px;"></th></tr></thead>
          <tbody>${satirlar || '<tr><td colspan="4" style="color:var(--metin-soluk);">Henüz üye yok.</td></tr>'}</tbody>
        </table>
      </div>
      <button type="button" class="ikincil" data-uye-ekle style="width:auto; margin-top:8px;">+ Üye Ekle</button>
    </div>`;
}

function _ekipleriKaydetVeCiz(ekipler) {
  riskEkipleriKaydet(ekipler);
  ekipleriCiz();
}

function ekipleriCiz() {
  _ekipGorevleriniCiz();
  // Ad soyad önerileri (rapor penceresiyle ortak datalist).
  const dl = document.getElementById('riskEkibiPersonelListesi');
  if (dl && !dl.children.length && typeof personelleriGetir === 'function') {
    dl.innerHTML = personelleriGetir('', false).map(p => `<option value="${_ekipKacir(p.adSoyad)}">`).join('');
  }
  const ekipler = riskEkipleriGetir();
  const bolumler = bolumleriGetir().map(b => b.ad);
  const kap = document.getElementById('ekipKartlari');
  const bos = document.getElementById('ekipBosDurum');
  kap.innerHTML = ekipler.map((e, i) => _ekipKartiHtml(e, i, bolumler)).join('');
  bos.classList.toggle('gorunur', !ekipler.length);
  bos.textContent = ekipler.length ? '' : 'Henüz ekip tanımlanmadı. "+ Yeni Ekip" ile başlayın.';

  kap.querySelectorAll('.ekip-karti').forEach(kart => {
    const ei = Number(kart.dataset.ekip);
    const guncelle = fn => { const liste = JSON.parse(JSON.stringify(riskEkipleriGetir())); fn(liste[ei]); return liste; };

    kart.querySelector('[data-ekip-ad]').addEventListener('change', e => riskEkipleriKaydet(guncelle(k => { k.ad = e.target.value.trim(); })));
    kart.querySelectorAll('[data-ekip-bolum]').forEach(cb => cb.addEventListener('change', () => {
      const secili = Array.from(kart.querySelectorAll('[data-ekip-bolum]:checked')).map(x => x.value);
      riskEkipleriKaydet(guncelle(k => { k.bolumler = secili; }));
    }));
    kart.querySelector('[data-ekip-sil]').addEventListener('click', async () => {
      const ekip = riskEkipleriGetir()[ei];
      if (!(await onayModali(`"${ekip.ad || 'Adsız ekip'}" ekibi silinsin mi?`, 'Sil'))) return;
      const liste = riskEkipleriGetir().slice();
      liste.splice(ei, 1);
      _ekipleriKaydetVeCiz(liste);
    });
    kart.querySelector('[data-uye-ekle]').addEventListener('click', () => _ekipleriKaydetVeCiz(guncelle(k => { k.uyeler = (k.uyeler || []).concat({ gorev: '', adSoyad: '', belgeNo: '' }); })));

    kart.querySelectorAll('tr[data-uye]').forEach(tr => {
      const ui = Number(tr.dataset.uye);
      tr.querySelectorAll('[data-alan]').forEach(alan => alan.addEventListener('change', () => {
        riskEkipleriKaydet(guncelle(k => { k.uyeler[ui][alan.dataset.alan] = alan.value.trim(); }));
      }));
      const tasi = yon => _ekipleriKaydetVeCiz(guncelle(k => {
        const hedef = ui + yon;
        if (hedef < 0 || hedef >= k.uyeler.length) return;
        [k.uyeler[ui], k.uyeler[hedef]] = [k.uyeler[hedef], k.uyeler[ui]];
      }));
      tr.querySelector('[data-uye-yukari]').addEventListener('click', () => tasi(-1));
      tr.querySelector('[data-uye-asagi]').addEventListener('click', () => tasi(1));
      tr.querySelector('[data-uye-sil]').addEventListener('click', () => _ekipleriKaydetVeCiz(guncelle(k => { k.uyeler.splice(ui, 1); })));
    });
  });
}

function _ekipYeniEkle() {
  const ekipler = riskEkipleriGetir();
  ekipler.push({
    id: rastgeleId(),
    ad: ekipler.length ? `Risk Değerlendirme Ekibi ${ekipler.length + 1}` : 'Risk Değerlendirme Ekibi',
    bolumler: [],
    uyeler: RISK_EKIBI_GOREVLERI.map(gorev => ({ gorev, adSoyad: '', belgeNo: '' }))
  });
  _ekipleriKaydetVeCiz(ekipler);
}

// Rapor için uygun ekip: seçili bölüme atanmış ilk ekip, yoksa bölüm
// atanmamış ilk ekip, o da yoksa ilk ekip.
function riskRaporIcinEkipIndex(bolum) {
  const ekipler = riskEkipleriGetir();
  if (!ekipler.length) return -1;
  if (bolum) {
    const i = ekipler.findIndex(e => (e.bolumler || []).includes(bolum));
    if (i !== -1) return i;
  }
  const genel = ekipler.findIndex(e => !(e.bolumler || []).length);
  return genel !== -1 ? genel : 0;
}

function riskEkipleriSekmesiniBaslat() {
  document.getElementById('ekipGorevEkleBtn').addEventListener('click', _ekipGorevEkle);
  document.getElementById('ekipYeniGorev').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); _ekipGorevEkle(); } });
  document.getElementById('ekipYeniBtn').addEventListener('click', _ekipYeniEkle);
}
