// Diğer modüllerden Risk Değerlendirmesi'ne aktarma (ortak bileşen).
// Kullanıcı isteği (2026-10-22): "diğer modüllerden örneğin uygunsuzluk
// modülünden risk değerlendirmesine aktar, iş kazası modülünden aktarma
// istenirse ... kimyasal modülünden, isg kurulu modülünden".
//
// Kullanım (modül ui.js'inde):
//   riskeAktarModaliAc({
//     modul: 'uygunsuzluk', modulAdi: 'Uygunsuzluk', id: kayit.id, etiket: 'UYG-0012',
//     alanlar: { bolum, yer, faaliyet, tehlike, risk, onlem, planlanan, sorumlu, termin, fotoOncesi },
//     sonra: riskNo => { ...listeyi yenile... }
//   });
//   riskeAktarilanRiskNo('uygunsuzluk', kayit.id) -> 'BAG0012' | null (buton etiketi için)
//
// Risk modülünün script'lerine bağımlı değildir (her modül sayfasında ayrı
// yüklenebilsin diye ölçekler ve risk no üretimi burada küçük bir kopya
// olarak tutulur; risk modülündeki model.js ile aynı kurallar). Kayıt,
// risk modülünün kendi riskKaydiOlustur şemasıyla aynı alanlarla ve ek
// olarak `kaynak: { modul, modulAdi, id, etiket }` ile tenantAnahtar('risk_kayitlari')
// listesine TEK yazımla (yazVeSonucuGetir -- buluta ulaştığı doğrulanır) eklenir.

const _RA_OLASILIK = [[0.2, 'Neredeyse imkansız'], [0.5, 'Mümkün fakat çok düşük ihtimal'], [1, 'Zayıf ihtimal'], [3, 'Mümkün'], [6, 'Muhtemel'], [10, 'Kaçınılmaz / Kesin']];
const _RA_FREKANS = [[0.5, 'Çok nadir (yılda birkaç kez)'], [1, 'Nadir (ayda bir)'], [2, 'Bazen (haftada bir)'], [3, 'Sıklıkla (günde bir)'], [6, 'Sürekli (vardiya boyunca birkaç kez)'], [10, 'Devamlı maruziyet']];
const _RA_SIDDET = [[1, 'Önemsiz (ilk yardım)'], [3, 'Az (hafif yaralanma)'], [7, 'Orta (kırık, geçici iş göremezlik)'], [15, 'Ciddi (kalıcı sakatlık)'], [40, 'Çok ciddi (tek kişi ölümü)'], [100, 'Katastrofik (çoklu ölüm)']];
const _RA_DUZEYLER = [[400, 'Tolerans Gösterilemez'], [200, 'Esaslı Risk'], [70, 'Önemli Risk'], [20, 'Olası Risk'], [-Infinity, 'Önemsiz Risk']];

let _raAcikIstek = null;

function _raKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function _raRiskAnahtari() {
  return tenantAnahtar('risk_kayitlari');
}

// modules/risk/model.js riskNoOnEkiUret / sonrakiRiskNoUret ile aynı kural.
function _raRiskNoUret(bolum, mevcut) {
  const harf = { ç: 'C', ğ: 'G', ı: 'I', ö: 'O', ş: 'S', ü: 'U', i: 'I' };
  const onEk = ((bolum || 'RSK').toLocaleLowerCase('tr-TR').split('').map(k => harf[k] || k).join('')
    .toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3) || 'RSK').padEnd(3, 'X');
  let maks = 0;
  mevcut.forEach(r => {
    if (!String(r.riskNo || '').startsWith(onEk)) return;
    const n = parseInt(String(r.riskNo).slice(3), 10);
    if (Number.isFinite(n) && n > maks) maks = n;
  });
  return onEk + String(maks + 1).padStart(4, '0');
}

function riskeAktarilanRiskNo(modul, id) {
  if (!id) return null;
  const r = (oku(_raRiskAnahtari(), []) || []).find(k => k.kaynak && k.kaynak.modul === modul && k.kaynak.id === id);
  return r ? (r.riskNo || '✓') : null;
}

// Liste satırlarına konacak buton (etiket aktarılmışsa risk no'yu gösterir).
// Tıklama modülün kendi dinleyicisiyle yakalanır: data-riske-aktar="<id>".
function riskeAktarButonHtml(modul, id) {
  const no = riskeAktarilanRiskNo(modul, id);
  return no
    ? `<button type="button" class="tablo-buton" data-riske-aktar="${_raKacir(id)}" title="Bu kayıt Risk Değerlendirmesi'ne ${_raKacir(no)} numarasıyla aktarıldı. Tekrar aktarmak için tıklayın.">⚠ Riskte: ${_raKacir(no)}</button>`
    : `<button type="button" class="tablo-buton" data-riske-aktar="${_raKacir(id)}" title="Bu kaydı Risk Değerlendirmesi'ne yeni risk olarak aktar">⚠ Riske Aktar</button>`;
}

function _raBolumleri() {
  // Risk analizi tamamlanmış konular önerilmez (risk modülünde "Tamamlanan Değerlendirmeler").
  const kalicilar = oku(tenantAnahtar('risk_bolumleri'), []) || [];
  const tamamlanan = new Set(kalicilar.filter(b => b.tamamlandi).map(b => b.ad));
  const risklerden = (oku(_raRiskAnahtari(), []) || []).map(r => r.bolum);
  return Array.from(new Set(kalicilar.map(b => b.ad).concat(risklerden).filter(ad => ad && !tamamlanan.has(ad))))
    .sort((a, b) => a.localeCompare(b, 'tr'));
}

function _raPuanGuncelle() {
  const o = Number(document.getElementById('raO').value || 0);
  const f = Number(document.getElementById('raF').value || 0);
  const s = Number(document.getElementById('raS').value || 0);
  const kutu = document.getElementById('raPuan');
  if (!(o && f && s)) { kutu.textContent = 'Risk puanı: O, F ve Ş seçince hesaplanır.'; return; }
  const rp = Math.round(o * f * s * 10) / 10;
  const duzey = _RA_DUZEYLER.find(([min]) => rp > min)[1];
  kutu.innerHTML = `Risk puanı (RP1): <b>${rp}</b> — <b>${duzey}</b>`;
}

function _raModalKur() {
  if (document.getElementById('raKatman')) return;
  const secenek = liste => '<option value="">— Seçiniz —</option>' + liste.map(([d, e]) => `<option value="${d}">${d} - ${e}</option>`).join('');
  const katman = document.createElement('div');
  katman.className = 'modal-katman';
  katman.id = 'raKatman';
  katman.innerHTML = `
    <div class="modal-kutu" style="max-width:680px;">
      <h3 style="margin-bottom:4px;">Risk Değerlendirmesine Aktar</h3>
      <p id="raKaynak" style="font-size:12.5px; color:var(--metin-soluk); margin:0 0 10px;"></p>
      <div id="raUyari" style="display:none; font-size:12.5px; background:#fef3c7; color:#92400e; padding:8px 10px; border-radius:8px; margin-bottom:10px;"></div>
      <datalist id="raKonuListesi"></datalist>
      <label for="raKonu">Risk Değerlendirme Konusu</label><input type="text" id="raKonu" list="raKonuListesi" placeholder="Mevcut konuyu seçin veya yeni ad yazın">
      <div class="form-satir-ikili">
        <div><label for="raBolum">Bölüm</label><input type="text" id="raBolum"></div>
        <div><label for="raYer">Yer / Ekipman</label><input type="text" id="raYer"></div>
      </div>
      <label for="raFaaliyet">Faaliyet</label><input type="text" id="raFaaliyet">
      <label for="raTehlike">Tehlike</label><textarea id="raTehlike" rows="2"></textarea>
      <label for="raRisk">Risk</label><textarea id="raRisk" rows="2"></textarea>
      <label for="raOnlem">Mevcut Önlemler</label><textarea id="raOnlem" rows="2"></textarea>
      <div class="form-satir-ikili" style="grid-template-columns:repeat(3,1fr);">
        <div><label for="raO">Olasılık (O)</label><select id="raO">${secenek(_RA_OLASILIK)}</select></div>
        <div><label for="raF">Frekans (F)</label><select id="raF">${secenek(_RA_FREKANS)}</select></div>
        <div><label for="raS">Şiddet (Ş)</label><select id="raS">${secenek(_RA_SIDDET)}</select></div>
      </div>
      <div id="raPuan" style="font-size:13px; margin:-4px 0 10px;"></div>
      <label for="raPlanlanan">Planlanan / Yapılacak Faaliyet</label><textarea id="raPlanlanan" rows="2"></textarea>
      <div class="form-satir-ikili">
        <div><label for="raSorumlu">Sorumlu</label><input type="text" id="raSorumlu"></div>
        <div><label for="raTermin">Termin</label><input type="date" id="raTermin"></div>
      </div>
      <div id="raHata" style="color:var(--hata, #b91c1c); font-size:13px; min-height:18px;"></div>
      <div class="modal-eylemler">
        <button type="button" class="ikincil" id="raIptal">İptal</button>
        <button type="button" class="birincil" id="raKaydet" style="width:auto;">Riske Aktar</button>
      </div>
    </div>`;
  document.body.appendChild(katman);
  ['raO', 'raF', 'raS'].forEach(id => document.getElementById(id).addEventListener('change', _raPuanGuncelle));
  document.getElementById('raIptal').addEventListener('click', () => katman.classList.remove('acik'));
  document.getElementById('raKaydet').addEventListener('click', _raKaydet);
}

function riskeAktarModaliAc(istek) {
  _raModalKur();
  _raAcikIstek = istek;
  const a = istek.alanlar || {};
  const deger = (id, v) => { document.getElementById(id).value = v == null ? '' : String(v); };
  const konular = _raBolumleri();
  document.getElementById('raKonuListesi').innerHTML = konular.map(b => `<option value="${_raKacir(b)}">`).join('');
  // Kaynak kaydın bölümü mevcut bir konuyla aynı adı taşıyorsa konu da önerilir.
  deger('raKonu', konular.includes(a.bolum) ? a.bolum : '');
  document.getElementById('raKaynak').textContent = `Kaynak: ${istek.modulAdi || istek.modul}${istek.etiket ? ' — ' + istek.etiket : ''}. Alanlar kayıttan dolduruldu; kontrol edip O/F/Ş puanlarını seçin.`;
  const onceki = riskeAktarilanRiskNo(istek.modul, istek.id);
  const uyari = document.getElementById('raUyari');
  uyari.style.display = onceki ? '' : 'none';
  uyari.textContent = onceki ? `Bu kayıt daha önce ${onceki} numarasıyla aktarıldı. Devam ederseniz ikinci bir risk kaydı oluşur.` : '';
  deger('raBolum', a.bolum); deger('raYer', a.yer); deger('raFaaliyet', a.faaliyet);
  deger('raTehlike', a.tehlike); deger('raRisk', a.risk); deger('raOnlem', a.onlem);
  deger('raPlanlanan', a.planlanan); deger('raSorumlu', a.sorumlu);
  deger('raTermin', /^\d{4}-\d{2}-\d{2}$/.test(a.termin || '') ? a.termin : '');
  deger('raO', a.O); deger('raF', a.F); deger('raS', a.S);
  document.getElementById('raHata').textContent = '';
  _raPuanGuncelle();
  document.getElementById('raKatman').classList.add('acik');
}

async function _raKaydet() {
  const istek = _raAcikIstek;
  if (!istek) return;
  const v = id => document.getElementById(id).value.trim();
  const zorunlu = [['raKonu', 'Risk Değerlendirme Konusu'], ['raYer', 'Yer / Ekipman'], ['raFaaliyet', 'Faaliyet'], ['raTehlike', 'Tehlike'], ['raRisk', 'Risk'], ['raO', 'Olasılık'], ['raF', 'Frekans'], ['raS', 'Şiddet']];
  const eksik = zorunlu.filter(([id]) => !v(id)).map(([, ad]) => ad);
  if (eksik.length) { document.getElementById('raHata').textContent = 'Doldurulması gereken alanlar: ' + eksik.join(', '); return; }

  const anahtar = _raRiskAnahtari();
  const mevcut = oku(anahtar, []) || [];
  // Risk modülündeki gibi: konu `bolum`, formdaki bölüm `altBolum`.
  const bolum = v('raKonu');
  const kayit = {
    id: rastgeleId(),
    riskNo: _raRiskNoUret(bolum, mevcut),
    yontem: 'Fine-Kinney',
    bolum, altBolum: v('raBolum'), yer: v('raYer'), faaliyet: v('raFaaliyet'), tehlike: v('raTehlike'), risk: v('raRisk'), onlem: v('raOnlem'),
    O: v('raO'), F: v('raF'), S: v('raS'),
    fotoOncesi: (istek.alanlar && istek.alanlar.fotoOncesi) || '',
    planlanan: v('raPlanlanan'), On: '', Fn: '', Sn: '', fotoSonrasi: '',
    sorumlu: v('raSorumlu'), termin: v('raTermin'), durum: 'Açık',
    tespit: istek.modulAdi || istek.modul,
    olusturmaTarihi: new Date().toISOString(),
    haritaTesisId: '', haritaX: '', haritaY: '',
    kaynak: { modul: istek.modul, modulAdi: istek.modulAdi || istek.modul, id: istek.id, etiket: istek.etiket || '' }
  };

  const dugme = document.getElementById('raKaydet');
  dugme.disabled = true;
  try {
    const sonuc = await yazVeSonucuGetir(anahtar, mevcut.concat(kayit));
    if (!sonuc.basarili) { document.getElementById('raHata').textContent = 'Kaydedilemedi (bulut yazımı başarısız). Lütfen tekrar deneyin.'; return; }
    document.getElementById('raKatman').classList.remove('acik');
    alert(`Risk Değerlendirmesi'ne ${kayit.riskNo} numarasıyla "${bolum}" konusuna aktarıldı.`);
    if (typeof istek.sonra === 'function') istek.sonra(kayit.riskNo);
  } finally {
    dugme.disabled = false;
  }
}
