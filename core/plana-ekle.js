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
  return {
    gorevler: (v && Array.isArray(v.gorevler)) ? v.gorevler : [], notlar: (v && Array.isArray(v.notlar)) ? v.notlar : [],
    // Otomatik eklenmiş kaynaklar (kullanıcı başına) — iş silinse de tekrar eklenmez.
    islenenKaynaklar: (v && v.islenenKaynaklar && typeof v.islenenKaynaklar === 'object') ? v.islenenKaynaklar : {}
  };
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

// İş Planım kaydı (planlayici/model.js planGoreviOlustur ile aynı alanlar).
function _peIsEkle(a) {
  const veri = _pePlanVerisi();
  const is = {
    id: rastgeleId(), baslik: a.baslik, aciklama: a.aciklama || '',
    baslangicTarihi: a.baslangicTarihi || '', tarih: a.tarih || '', saat: '', oncelik: a.oncelik || 'Normal',
    kategori: a.kategori || '', durum: 'Yapılacak', tekrar: a.tekrar || 'Bir defalık', sonrakiId: '', tamamlanmaTarihi: '',
    kaynak: a.kaynak || '', kaynakUrl: a.kaynakUrl || '', kaynakAnahtar: a.kaynakAnahtar || '',
    olusturanId: _peKullaniciId(), olusturmaTarihi: new Date().toISOString()
  };
  veri.gorevler.push(is);
  yaz(tenantAnahtar('planlayici'), veri);
  return is;
}

// Tarihe ay ekler; ay sonu taşmaz (31 Ocak + 1 ay = 28/29 Şubat).
function planaAyEkle(iso, ay) {
  const [y, a, g] = String(iso).slice(0, 10).split('-').map(Number);
  if (!y) return '';
  const hedef = new Date(y, a - 1 + ay, 1);
  const son = new Date(hedef.getFullYear(), hedef.getMonth() + 1, 0).getDate();
  hedef.setDate(Math.min(g, son));
  return hedef.getFullYear() + '-' + String(hedef.getMonth() + 1).padStart(2, '0') + '-' + String(hedef.getDate()).padStart(2, '0');
}

// Pencere açmadan ekler (ör. İSG geçici onay verilince takip işi). Aynı
// kaynakAnahtar ile daha önce eklenmiş iş varsa (tamamlanmış olsa bile) eklemez.
// veri: { anahtar, baslik, aciklama, baslangic, bitis, kaynak, url, oncelik }
function planaOtomatikEkle(veri) {
  if (!tenantAnahtar('planlayici') || !veri.anahtar) return null;
  const id = _peKullaniciId();
  if (_pePlanVerisi().gorevler.some(g => g.kaynakAnahtar === veri.anahtar && g.olusturanId === id)) return null;
  return _peIsEkle({
    baslik: veri.baslik, aciklama: veri.aciklama, baslangicTarihi: veri.baslangic || _peBugun(),
    tarih: _peIsoTarih(veri.bitis), oncelik: veri.oncelik, kaynak: veri.kaynak,
    kaynakUrl: veri.url || (location.pathname + location.search), kaynakAnahtar: veri.anahtar
  });
}

// Kaynak kapandığında (ör. geçici onay kaldırıldı) açık takip işini tamamlar.
function planIsiniTamamla(anahtar) {
  if (!tenantAnahtar('planlayici') || !anahtar) return 0;
  const id = _peKullaniciId();
  const veri = _pePlanVerisi();
  let sayi = 0;
  veri.gorevler.forEach(g => {
    if (g.kaynakAnahtar === anahtar && g.olusturanId === id && g.durum !== 'Tamamlandı') {
      g.durum = 'Tamamlandı'; g.tamamlanmaTarihi = _peBugun(); sayi++;
    }
  });
  if (sayi) yaz(tenantAnahtar('planlayici'), veri);
  return sayi;
}

// ==================== YÜKLENİCİ İSG GEÇİCİ ONAY TAKİBİ ====================
// Kullanıcı isteği: İSG geçici onay verilen yüklenici personeli, evrakını
// tamamlatmak için BİR AY termini ile İş Planım'a OTOMATİK eklensin (düğme yok);
// onayı başka bir kullanıcı vermiş olsa da. Bu yüzden eşitleme hem Yüklenici
// sayfasında (açılışta ve onay değişince) hem İş Planım açılırken çalışır ve
// sayfayı açan kullanıcının planına yazar. Her onay (kişi + onay günü) bir kez
// eklenir; iş tamamlanıp silinse de aynı onay için tekrar eklenmez, yeniden onay
// verilirse yeni iş açılır. Onay kaldırılan veya pasife alınan kişinin açık işi
// tamamlandı yapılır. Kişi verisi: modules/yuklenici (yuklenici_kisileri).
const _PE_GECICI_ONAY_ONEK = 'yuklenici-gecici-onay:';

function yukleniciGeciciOnayPlaniniEsitle() {
  const kisiAnahtari = tenantAnahtar('yuklenici_kisileri');
  if (!kisiAnahtari || !tenantAnahtar('planlayici')) return 0;
  const kisiler = oku(kisiAnahtari, []);
  if (!Array.isArray(kisiler)) return 0;
  const kullaniciId = _peKullaniciId();
  if (!kullaniciId) return 0;
  const veri = _pePlanVerisi();
  const benim = veri.gorevler.filter(g => g.olusturanId === kullaniciId && String(g.kaynakAnahtar || '').startsWith(_PE_GECICI_ONAY_ONEK));
  const islenen = Array.isArray(veri.islenenKaynaklar[kullaniciId]) ? veri.islenenKaynaklar[kullaniciId] : [];
  const mevcutAnahtarlar = new Set(benim.map(g => g.kaynakAnahtar).concat(islenen));
  // Eşitleme İş Planım'da da çalıştığı için bağlantı her zaman Yüklenici sayfasına.
  const url = location.pathname.replace(/modules\/[^/]+\/[^/]*$/, 'modules/yuklenici/index.html');
  const gecerli = new Set();
  let degisti = 0;
  kisiler.forEach(k => {
    if (!k || !k.isgOnayBypass || k.pasif) return;
    const onayGunu = String(k.isgOnayTarihi || '').slice(0, 10);
    const anahtar = _PE_GECICI_ONAY_ONEK + k.id + ':' + onayGunu;
    gecerli.add(anahtar);
    if (mevcutAnahtarlar.has(anahtar)) return;
    const baslangic = onayGunu || _peBugun();
    veri.gorevler.push({
      id: rastgeleId(),
      baslik: `Geçici onaylı yüklenici personeli: ${k.adSoyad || ''}${k.firmaAdi ? ' (' + k.firmaAdi + ')' : ''} — eksik evrakları tamamlat`,
      aciklama: [
        'İSG geçici onay ile "Uygun" görünüyor; evrakları tamamlanınca bu işi kapatın.',
        k.isgOnayVeren ? 'Onaylayan: ' + k.isgOnayVeren : '',
        onayGunu ? 'Onay tarihi: ' + gunAyYil(onayGunu) : ''
      ].filter(Boolean).join('\n'),
      baslangicTarihi: baslangic, tarih: planaAyEkle(baslangic, 1), saat: '', oncelik: 'Normal',
      kategori: '', durum: 'Yapılacak', tekrar: 'Bir defalık', sonrakiId: '', tamamlanmaTarihi: '',
      kaynak: 'Yüklenici · İSG geçici onay', kaynakUrl: url, kaynakAnahtar: anahtar,
      olusturanId: kullaniciId, olusturmaTarihi: new Date().toISOString()
    });
    islenen.push(anahtar);
    degisti++;
  });
  veri.islenenKaynaklar[kullaniciId] = islenen;
  benim.forEach(g => {
    if (g.durum !== 'Tamamlandı' && !gecerli.has(g.kaynakAnahtar)) {
      g.durum = 'Tamamlandı'; g.tamamlanmaTarihi = _peBugun();
      g.aciklama = (g.aciklama ? g.aciklama + '\n' : '') + 'Geçici onay kaldırıldı / kişi pasife alındı — otomatik kapatıldı.';
      degisti++;
    }
  });
  if (degisti) yaz(tenantAnahtar('planlayici'), veri);
  return degisti;
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
  _peIsEkle({
    baslik, aciklama: document.getElementById('peAciklama').value.trim(),
    baslangicTarihi: bas, tarih: bit, oncelik: document.getElementById('peOncelik').value, tekrar,
    kaynak: v.kaynak, kaynakUrl: v.url, kaynakAnahtar: v.anahtar
  });
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
