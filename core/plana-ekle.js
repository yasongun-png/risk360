// "📝 İş Planıma Ekle" — kullanıcı isteği: İSG Kurulu kararlarından, risk
// analizinden, uygunsuzluklardan ve diğer toplantıların maddelerinden İş Planım'a
// hatırlatma ekleyebilmek. Modüller satırlarına planaEkleButonHtml(veri) koyar;
// tıklama belge düzeyinde (capture) yakalanır, satırın kendi tıklama işleyicileri
// çalışmaz. Kayıt modules/planlayici ile AYNI belgeye (tenantAnahtar('planlayici'),
// { gorevler, notlar }) ve aynı alan şekliyle (planlayici/model.js
// planGoreviOlustur) yazılır; yalnızca ekleyen kullanıcıya görünür.
//
// veri: { anahtar: 'modul:id' (aynı kaydın tekrar eklendiğini anlamak için),
//         baslik, aciklama, bitis (termin, ISO veya gg.aa.yyyy), kaynak (görünen ad) }
// Kaynak bağlantısı, düğmenin bulunduğu sayfanın adresidir.

function _peKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function _peBugun() {
  const t = new Date();
  return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
}

// Termin farklı modüllerde ISO (2026-11-30) ya da gg.aa.yyyy olabiliyor.
function _peIsoTarih(v) {
  const s = String(v || '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(s);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : '';
}

function _pePlanVerisi() {
  const v = oku(tenantAnahtar('planlayici'), null);
  return { gorevler: (v && Array.isArray(v.gorevler)) ? v.gorevler : [], notlar: (v && Array.isArray(v.notlar)) ? v.notlar : [] };
}

function _peKullaniciId() {
  const k = typeof oturumdakiKullanici === 'function' ? oturumdakiKullanici() : null;
  return k ? k.id : '';
}

// Bu kaynaktan eklenmiş, henüz tamamlanmamış iş (kullanıcının kendi işleri arasında).
function _peAcikPlanIsi(anahtar) {
  if (!anahtar || !tenantAnahtar('planlayici')) return null;
  const id = _peKullaniciId();
  return _pePlanVerisi().gorevler.find(g => g.kaynakAnahtar === anahtar && g.olusturanId === id && g.durum !== 'Tamamlandı') || null;
}

function planaEkleButonHtml(veri) {
  const v = Object.assign({}, veri, { url: location.pathname + location.search });
  const mevcut = _peAcikPlanIsi(v.anahtar);
  const ozellik = _peKacir(encodeURIComponent(JSON.stringify(v)));
  return mevcut
    ? `<button type="button" class="tablo-buton" data-plana-ekle="${ozellik}" data-plan-anahtar="${_peKacir(v.anahtar)}" style="color:#047857; font-weight:700;" title="Bu kayıt İş Planım'da var${mevcut.tarih ? ' (bitiş ' + _peKacir(gunAyYil(mevcut.tarih)) + ')' : ''}. Tekrar eklemek için tıklayın.">📝 Planımda</button>`
    : `<button type="button" class="tablo-buton" data-plana-ekle="${ozellik}" data-plan-anahtar="${_peKacir(v.anahtar)}" title="Bu kaydı İş Planım'a hatırlatma olarak ekle">📝 Plana Ekle</button>`;
}

let _peAcikVeri = null;

function _peModalKur() {
  if (document.getElementById('peKatman')) return;
  const katman = document.createElement('div');
  katman.className = 'modal-katman';
  katman.id = 'peKatman';
  katman.innerHTML = `
    <div class="modal-kutu" style="max-width:560px;">
      <h3 style="margin-bottom:4px;">📝 İş Planıma Ekle</h3>
      <p id="peKaynak" style="font-size:12.5px; color:var(--metin-soluk); margin:0 0 10px;"></p>
      <div id="peUyari" style="display:none; font-size:12.5px; background:#fef3c7; color:#92400e; padding:8px 10px; border-radius:8px; margin-bottom:10px;"></div>
      <label for="peBaslik">Yapılacak İş</label>
      <input type="text" id="peBaslik" autocomplete="off">
      <div class="form-satir-ikili">
        <div><label for="peBaslangic">Başlangıç Tarihi</label><input type="date" id="peBaslangic"></div>
        <div><label for="peBitis">Planlanan Bitiş Tarihi</label><input type="date" id="peBitis"></div>
      </div>
      <div class="form-satir-ikili">
        <div><label for="peTekrar">Tekrar</label><select id="peTekrar">${['Bir defalık', 'Her gün', 'Her hafta', 'Her ay', 'Her yıl'].map(o => `<option>${o}</option>`).join('')}</select></div>
        <div><label for="peOncelik">Öncelik</label><select id="peOncelik">${['Düşük', 'Normal', 'Yüksek'].map(o => `<option${o === 'Normal' ? ' selected' : ''}>${o}</option>`).join('')}</select></div>
      </div>
      <label for="peAciklama">Açıklama / Notlar</label>
      <textarea id="peAciklama" rows="4"></textarea>
      <div id="peHata" style="color:var(--hata); font-size:12px; margin:-6px 0 8px;"></div>
      <div class="modal-eylemler">
        <button type="button" class="ikincil" id="peIptal">İptal</button>
        <button type="button" class="birincil" id="peKaydet">Plana Ekle</button>
      </div>
    </div>`;
  document.body.appendChild(katman);
  document.getElementById('peIptal').addEventListener('click', () => katman.classList.remove('acik'));
  document.getElementById('peKaydet').addEventListener('click', _peKaydet);
}

function planaEkleModaliAc(veri) {
  if (!tenantAnahtar('planlayici')) { alert('Önce bir firma seçin.'); return; }
  _peModalKur();
  _peAcikVeri = veri;
  const bitis = _peIsoTarih(veri.bitis);
  const bugun = _peBugun();
  document.getElementById('peKaynak').textContent = 'Kaynak: ' + (veri.kaynak || '-');
  document.getElementById('peBaslik').value = String(veri.baslik || '').replace(/\s+/g, ' ').trim().slice(0, 300);
  document.getElementById('peAciklama').value = String(veri.aciklama || '').trim();
  document.getElementById('peBaslangic').value = bitis && bitis < bugun ? bitis : bugun;
  document.getElementById('peBitis').value = bitis;
  document.getElementById('peTekrar').value = 'Bir defalık';
  document.getElementById('peOncelik').value = 'Normal';
  document.getElementById('peHata').textContent = '';
  const mevcut = _peAcikPlanIsi(veri.anahtar);
  const uyari = document.getElementById('peUyari');
  uyari.style.display = mevcut ? '' : 'none';
  uyari.textContent = mevcut ? `Bu kayıt İş Planım'da zaten açık bir iş olarak var: "${mevcut.baslik}". Yine de ekleyebilirsiniz.` : '';
  document.getElementById('peKatman').classList.add('acik');
  document.getElementById('peBaslik').focus();
}

function _peKaydet() {
  const v = _peAcikVeri || {};
  const baslik = document.getElementById('peBaslik').value.trim();
  const bas = document.getElementById('peBaslangic').value;
  const bit = document.getElementById('peBitis').value;
  const tekrar = document.getElementById('peTekrar').value;
  const hata = document.getElementById('peHata');
  if (!baslik) { hata.textContent = 'Yapılacak işi yazın.'; return; }
  if (bas && bit && bit < bas) { hata.textContent = 'Planlanan bitiş tarihi başlangıçtan önce olamaz.'; return; }
  if (tekrar !== 'Bir defalık' && !bas && !bit) { hata.textContent = 'Tekrarlayan iş için başlangıç veya bitiş tarihi girin.'; return; }
  const veri = _pePlanVerisi();
  veri.gorevler.push({
    id: rastgeleId(), baslik, aciklama: document.getElementById('peAciklama').value.trim(),
    baslangicTarihi: bas, tarih: bit, saat: '', oncelik: document.getElementById('peOncelik').value,
    kategori: '', durum: 'Yapılacak', tekrar, sonrakiId: '', tamamlanmaTarihi: '',
    kaynak: v.kaynak || '', kaynakUrl: v.url || '', kaynakAnahtar: v.anahtar || '',
    olusturanId: _peKullaniciId(), olusturmaTarihi: new Date().toISOString()
  });
  yaz(tenantAnahtar('planlayici'), veri);
  document.getElementById('peKatman').classList.remove('acik');
  // Aynı kaydın düğmelerini yerinde "Planımda" yap (tablo yeniden çizilmeden).
  document.querySelectorAll('[data-plan-anahtar]').forEach(b => {
    if (b.getAttribute('data-plan-anahtar') !== v.anahtar) return;
    b.textContent = '📝 Planımda';
    b.style.color = '#047857'; b.style.fontWeight = '700';
    b.title = "Bu kayıt İş Planım'da var. Tekrar eklemek için tıklayın.";
  });
}

document.addEventListener('click', e => {
  const btn = e.target.closest && e.target.closest('[data-plana-ekle]');
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  try { planaEkleModaliAc(JSON.parse(decodeURIComponent(btn.getAttribute('data-plana-ekle')))); }
  catch (hata) { console.error('İş Planım düğmesi okunamadı:', hata); }
}, true);
