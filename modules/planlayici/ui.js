let _plDuzenlenenGorevId = null;
let _plDuzenlenenNotId = null;

function _plKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function planlayiciSayfasiniBaslat() {
  document.querySelectorAll('[data-sekme]').forEach(btn => btn.addEventListener('click', () => _plSekmeDegistir(btn.getAttribute('data-sekme'))));

  // Hızlı ekle: yazıp Enter. Kullanıcı isteği: başlangıç ve bitiş tarihi yanında girilsin.
  // Tarihler eklemeden sonra korunur (aynı tarihlerle art arda iş girilebilsin).
  document.getElementById('hizliEkleForm').addEventListener('submit', e => {
    e.preventDefault();
    const baslik = document.getElementById('hizliBaslik').value;
    const sonuc = planGoreviKaydet({
      baslik,
      baslangicTarihi: document.getElementById('hizliBaslangic').value,
      tarih: document.getElementById('hizliTarih').value
    });
    document.getElementById('hizliHata').textContent = sonuc.basarili ? '' : (sonuc.hatalar.tarih || '');
    if (!sonuc.basarili) { document.getElementById(sonuc.hatalar.tarih ? 'hizliTarih' : 'hizliBaslik').focus(); return; }
    document.getElementById('hizliBaslik').value = '';
    gorevleriCiz();
  });
  document.getElementById('hizliBaslangic').value = bugunIso();
  document.getElementById('hizliTarih').value = bugunIso();
  document.getElementById('yeniGorevBtn').addEventListener('click', () => gorevModalAc(null));
  document.getElementById('gorevForm').addEventListener('submit', gorevFormGonderildi);
  ['gorevIptalBtn', 'gorevKapatBtn'].forEach(id => document.getElementById(id).addEventListener('click', gorevModalKapat));
  document.getElementById('kategoriFiltre').addEventListener('change', gorevleriCiz);
  document.getElementById('gorevArama').addEventListener('input', gorevleriCiz);

  document.getElementById('gOncelik').innerHTML = PLAN_ONCELIKLERI.map(o => `<option>${o}</option>`).join('');
  document.getElementById('gDurum').innerHTML = PLAN_DURUMLARI.map(o => `<option>${o}</option>`).join('');
  document.getElementById('gTekrar').innerHTML = PLAN_TEKRARLARI.map(o => `<option>${o}</option>`).join('');
  document.getElementById('kategoriListesi').innerHTML = PLAN_KATEGORILERI.map(k => `<option value="${_plKacir(k)}">`).join('');

  document.getElementById('yeniNotBtn').addEventListener('click', () => notModalAc(null));
  document.getElementById('notForm').addEventListener('submit', notFormGonderildi);
  ['notIptalBtn', 'notKapatBtn'].forEach(id => document.getElementById(id).addEventListener('click', notModalKapat));
  document.getElementById('notArama').addEventListener('input', notlariCiz);
  document.getElementById('nRenkler').innerHTML = NOT_RENKLERI.map(r =>
    `<label class="pl-renk" title="${r.ad}" style="background:${r.renk};"><input type="radio" name="nRenk" value="${r.renk}"></label>`).join('');

  const sekme = (location.hash || '').replace('#', '');
  _plSekmeDegistir(sekme === 'notlar' ? 'notlar' : 'isler');
}

function _plSekmeDegistir(ad) {
  document.querySelectorAll('[data-sekme]').forEach(b => b.classList.toggle('sekme-seciliDegil', b.getAttribute('data-sekme') !== ad));
  document.getElementById('bolum-isler').style.display = ad === 'isler' ? '' : 'none';
  document.getElementById('bolum-notlar').style.display = ad === 'notlar' ? '' : 'none';
  history.replaceState(null, '', '#' + ad);
  if (ad === 'isler') gorevleriCiz(); else notlariCiz();
}

// ==================== İŞLER ====================

function _plOzetCiz() {
  const o = planOzetiHesapla();
  const kart = (etiket, deger, renk) => `<div class="istatistik-kutu"><span>${etiket}</span><b style="${renk ? 'color:' + renk : ''}">${deger}</b></div>`;
  document.getElementById('planOzeti').innerHTML =
    kart('Gecikmiş', o.gecikmis, o.gecikmis ? 'var(--hata)' : '') + kart('Bugün', o.bugun) +
    kart('Önümüzdeki 7 Gün', o.hafta) + kart('Açık İş', o.acik) + kart('Bu Ay Tamamlanan', o.buAyTamamlanan, 'var(--basari)');
}

// Kullanıcı isteği: son günü gelen (planlanan bitişi bugün olan) işler sayfa
// açılınca kırmızı yanıp sönsün, tıklayınca dursun. Durdurulanlar bu tarayıcıda
// o gün boyunca hatırlanır; ertesi gün liste sıfırlanır.
const _PL_SONGUN_ANAHTARI = 'isg_plan_songun_durdurulan';

function _plSonGunDurdurulanlar() {
  try {
    const v = JSON.parse(localStorage.getItem(_PL_SONGUN_ANAHTARI) || '{}');
    return v.gun === bugunIso() && Array.isArray(v.idler) ? v.idler : [];
  } catch (e) { return []; }
}

function _plSonGunDurdur(id) {
  const idler = _plSonGunDurdurulanlar();
  if (!idler.includes(id)) idler.push(id);
  try { localStorage.setItem(_PL_SONGUN_ANAHTARI, JSON.stringify({ gun: bugunIso(), idler })); } catch (e) { /* yalnızca bu oturumda durur */ }
}

function gorevleriCiz() {
  _plOzetCiz();
  const kategori = document.getElementById('kategoriFiltre').value;
  const arama = document.getElementById('gorevArama').value.trim().toLocaleLowerCase('tr-TR');
  const tumu = planGorevleriGetir();
  const kategoriler = [...new Set(tumu.map(g => g.kategori).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'));
  const secim = document.getElementById('kategoriFiltre');
  secim.innerHTML = '<option value="">Tüm Kategoriler</option>' + kategoriler.map(k => `<option ${k === kategori ? 'selected' : ''}>${_plKacir(k)}</option>`).join('');
  const liste = tumu.filter(g => (!kategori || g.kategori === kategori)
    && (!arama || (g.baslik + ' ' + g.aciklama).toLocaleLowerCase('tr-TR').includes(arama)));
  // Kullanıcı isteği: her gün / aylık / yıllık işler ayrı ayrı görünsün — tarih
  // grupları yalnızca bir defalık işler için; tekrarlayanlar kendi bölümlerinde.
  const tekrarliMi = g => g.tekrar && g.tekrar !== 'Bir defalık';
  const bugun = bugunIso();
  // Kullanıcı isteği: termini (son günü) bugün olan işler en üstte ayrı grup —
  // tekrarlayan olsun olmasın; diğer gruplarda tekrar görünmez.
  const sonGunMu = g => g.durum !== 'Tamamlandı' && g.tarih === bugun;
  const sonGunGrubu = { baslik: '⏰ Termini Bugün Olan İşler', renk: '#dc2626', liste: planBitiseGoreSirala(liste.filter(sonGunMu)) };
  const { gruplar } = planGorevleriGrupla(liste.filter(g => !tekrarliMi(g) && !sonGunMu(g)));
  const { tamamlanan } = planGorevleriGrupla(liste);
  const t = g => g.tarih || g.baslangicTarihi || '';
  const tekrarGruplari = [
    { tekrar: 'Her gün', baslik: '🔁 Her Gün Yapılan İşler', renk: '#047857' },
    { tekrar: 'Her hafta', baslik: '🔁 Haftalık İşler', renk: '#0e7490' },
    { tekrar: 'Her ay', baslik: '🔁 Aylık İşler', renk: '#7c3aed' },
    { tekrar: 'Her yıl', baslik: '🔁 Yıllık İşler', renk: '#b45309' }
  ].map(gr => Object.assign(gr, {
    liste: planBitiseGoreSirala(liste.filter(g => g.durum !== 'Tamamlandı' && !sonGunMu(g) && g.tekrar === gr.tekrar))
  }));

  const durdurulanlar = _plSonGunDurdurulanlar();
  const satir = g => {
    const bitti = g.durum === 'Tamamlandı';
    const saat = g.saat ? ' ' + g.saat : '';
    const tarih = [
      g.baslangicTarihi ? `▶ ${gunAyYil(g.baslangicTarihi)}` : '',
      g.tarih ? `🏁 ${gunAyYil(g.tarih)}` : ''
    ].filter(Boolean).join(' → ') + (g.baslangicTarihi || g.tarih ? saat : '');
    const baslamaEtiketi = bitti || tekrarliMi(g) ? '' : g.baslangicTarihi === bugun ? '<span class="pl-etiket pl-devam">Bugün başlıyor</span>'
      : (!bitti && g.baslangicTarihi && g.baslangicTarihi < bugun && g.durum === 'Yapılacak' ? '<span class="pl-etiket pl-devam">Devam ediyor</span>' : '');
    const sonGun = !bitti && g.tarih === bugun;
    const yanip = sonGun && !durdurulanlar.includes(g.id);
    return `<div class="pl-gorev${bitti ? ' bitti' : ''}${sonGun ? ' pl-songun' : ''}${yanip ? ' pl-yanip' : ''}" data-oncelik="${g.oncelik}" data-gorev="${g.id}"${yanip ? ' title="Son gün! Yanıp sönmeyi durdurmak için tıklayın."' : ''}>
      <input type="checkbox" data-tamamla="${g.id}" ${bitti ? 'checked' : ''} title="${bitti ? 'Geri al' : 'Tamamlandı işaretle'}">
      <div class="pl-gorev-govde" data-duzenle="${g.id}">
        <div class="pl-gorev-baslik">${g.oncelik === 'Yüksek' ? '<span class="pl-oncelik" title="Yüksek öncelik">!</span>' : ''}${_plKacir(g.baslik)}</div>
        <div class="pl-gorev-alt">
          ${tarih ? `<span title="Başlangıç → Planlanan bitiş">${tarih}</span>` : ''}
          ${baslamaEtiketi}
          ${!bitti && tekrarliMi(g) && g.tarih && g.tarih < bugun ? '<span class="pl-etiket" style="background:#fee2e2; color:#b91c1c;">Gecikti</span>' : ''}
          ${sonGun ? '<span class="pl-etiket" style="background:#dc2626; color:#fff;">⏰ Son gün</span>' : ''}
          ${!bitti && !sonGun && tekrarliMi(g) && t(g) === bugun ? '<span class="pl-etiket" style="background:#dbeafe; color:#1e40af;">Bugün</span>' : ''}
          ${bitti && g.tamamlanmaTarihi ? `<span>✔ ${gunAyYil(g.tamamlanmaTarihi)}</span>` : ''}
          ${g.tekrar && g.tekrar !== 'Bir defalık' ? `<span class="pl-etiket" style="background:#ecfdf5; color:#047857;" title="Tamamlandığında bir sonraki tarih için yeniden eklenir">🔁 ${g.tekrar}</span>` : ''}
          ${g.kategori ? `<span class="pl-etiket">${_plKacir(g.kategori)}</span>` : ''}
          ${g.kaynak ? (g.kaynakUrl
            ? `<a class="pl-etiket pl-kaynak" href="${_plKacir(g.kaynakUrl)}" title="Kaynağa git">📎 ${_plKacir(g.kaynak)}</a>`
            : `<span class="pl-etiket pl-kaynak">📎 ${_plKacir(g.kaynak)}</span>`) : ''}
          ${g.durum === 'Devam Ediyor' ? '<span class="pl-etiket pl-devam">Devam ediyor</span>' : ''}
          ${g.aciklama ? `<span class="pl-aciklama">${_plKacir(g.aciklama)}</span>` : ''}
        </div>
      </div>
      <button type="button" class="tablo-buton sil" data-sil="${g.id}" title="Sil">✕</button>
    </div>`;
  };

  const dolu = [sonGunGrubu].concat(gruplar, tekrarGruplari).filter(gr => gr.liste.length);
  // Tamamlananlar en altta, kapalı (tıklayınca açılır) — kullanıcı açık hâlini beğenmedi.
  document.getElementById('gorevListesi').innerHTML = (dolu.length
    ? dolu.map(gr => `<div class="pl-grup">
        <div class="pl-grup-baslik" style="color:${gr.renk};">${gr.baslik} <small>${gr.liste.length}</small></div>
        ${gr.liste.map(satir).join('')}
      </div>`).join('')
    : `<div class="bos-durum gorunur">${tumu.length ? 'Açık iş yok. 🎉' : 'Henüz iş eklemediniz. Yukarıdaki kutuya yazıp Enter\'a basın.'}</div>`)
    + (tamamlanan.length ? `<details class="pl-grup"><summary class="pl-grup-baslik" style="color:var(--basari); cursor:pointer;">✔ Tamamlanan İşler <small>${tamamlanan.length}</small></summary>${tamamlanan.map(satir).join('')}</details>` : '');

  const kutu = document.getElementById('gorevListesi');
  // Yanıp sönen satıra ilk tıklama yalnızca durdurur (düzenleme penceresi açılmaz);
  // kutucuğa veya sil düğmesine tıklanırsa hem durur hem o işlem yapılır.
  kutu.querySelectorAll('.pl-yanip').forEach(s => s.addEventListener('click', e => {
    _plSonGunDurdur(s.getAttribute('data-gorev'));
    s.classList.remove('pl-yanip');
    s.removeAttribute('title');
    if (!e.target.closest('[data-tamamla], [data-sil]')) e.stopPropagation();
  }, { capture: true, once: true }));
  kutu.querySelectorAll('[data-tamamla]').forEach(c => c.addEventListener('change', () => { planGoreviTamamla(c.getAttribute('data-tamamla'), c.checked); gorevleriCiz(); }));
  kutu.querySelectorAll('[data-duzenle]').forEach(d => d.addEventListener('click', e => {
    if (e.target.closest('a')) return; // kaynak bağlantısı: sayfaya gider, düzenleme açılmaz
    gorevModalAc(d.getAttribute('data-duzenle'));
  }));
  kutu.querySelectorAll('[data-sil]').forEach(b => b.addEventListener('click', async () => {
    if (await onayModali('Bu iş silinsin mi?', 'Sil')) { planGoreviSil(b.getAttribute('data-sil')); gorevleriCiz(); }
  }));
}

function gorevModalAc(id) {
  const g = id ? planGorevleriGetir().find(x => x.id === id) : null;
  _plDuzenlenenGorevId = g ? g.id : null;
  document.getElementById('gorevModalBaslik').textContent = g ? 'İşi Düzenle' : 'Yeni İş';
  document.getElementById('gBaslik').value = g ? g.baslik : '';
  document.getElementById('gAciklama').value = g ? g.aciklama : '';
  document.getElementById('gBaslangic').value = g ? g.baslangicTarihi || '' : bugunIso();
  document.getElementById('gTarih').value = g ? g.tarih : '';
  document.getElementById('gTarihHata').textContent = '';
  document.getElementById('gSaat').value = g ? g.saat : '';
  document.getElementById('gTekrar').value = (g && g.tekrar) || 'Bir defalık';
  document.getElementById('gOncelik').value = g ? g.oncelik : 'Normal';
  document.getElementById('gKategori').value = g ? g.kategori : '';
  document.getElementById('gDurum').value = g ? g.durum : 'Yapılacak';
  document.getElementById('gBaslikHata').textContent = '';
  document.getElementById('gorevModalKatman').classList.add('acik');
  document.getElementById('gBaslik').focus();
}

function gorevModalKapat() {
  document.getElementById('gorevModalKatman').classList.remove('acik');
}

function gorevFormGonderildi(e) {
  e.preventDefault();
  const sonuc = planGoreviKaydet({
    baslik: document.getElementById('gBaslik').value,
    aciklama: document.getElementById('gAciklama').value,
    baslangicTarihi: document.getElementById('gBaslangic').value,
    tarih: document.getElementById('gTarih').value,
    saat: document.getElementById('gSaat').value,
    tekrar: document.getElementById('gTekrar').value,
    oncelik: document.getElementById('gOncelik').value,
    kategori: document.getElementById('gKategori').value,
    durum: document.getElementById('gDurum').value
  }, _plDuzenlenenGorevId);
  if (!sonuc.basarili) {
    document.getElementById('gBaslikHata').textContent = sonuc.hatalar.baslik || '';
    document.getElementById('gTarihHata').textContent = sonuc.hatalar.tarih || '';
    return;
  }
  gorevModalKapat();
  gorevleriCiz();
}

// ==================== NOTLAR ====================

function notlariCiz() {
  const liste = planNotlariGetir(document.getElementById('notArama').value);
  const kutu = document.getElementById('notIzgarasi');
  const bos = document.getElementById('notBos');
  bos.classList.toggle('gorunur', !liste.length);
  bos.textContent = planNotlariGetir('').length ? 'Aramayla eşleşen not yok.' : 'Henüz not yok. "+ Yeni Not" ile ekleyin.';
  kutu.innerHTML = liste.map(n => `
    <div class="pl-not" style="background:${n.renk};" data-not="${n.id}">
      <div class="pl-not-ust">
        <strong>${_plKacir(n.baslik) || '&nbsp;'}</strong>
        <span>
          <button type="button" class="pl-ikon${n.sabit ? ' aktif' : ''}" data-sabitle="${n.id}" title="${n.sabit ? 'Sabitlemeyi kaldır' : 'Üste sabitle'}">📌</button>
          <button type="button" class="pl-ikon" data-notsil="${n.id}" title="Sil">🗑️</button>
        </span>
      </div>
      <div class="pl-not-metin">${_plKacir(n.icerik)}</div>
      <div class="pl-not-tarih">${gunAyYil(String(n.guncellemeTarihi).slice(0, 10))}</div>
    </div>`).join('');
  kutu.querySelectorAll('[data-not]').forEach(d => d.addEventListener('click', e => {
    if (e.target.closest('button')) return;
    notModalAc(d.getAttribute('data-not'));
  }));
  kutu.querySelectorAll('[data-sabitle]').forEach(b => b.addEventListener('click', () => { planNotuSabitle(b.getAttribute('data-sabitle')); notlariCiz(); }));
  kutu.querySelectorAll('[data-notsil]').forEach(b => b.addEventListener('click', async () => {
    if (await onayModali('Bu not silinsin mi?', 'Sil')) { planNotuSil(b.getAttribute('data-notsil')); notlariCiz(); }
  }));
}

function notModalAc(id) {
  const n = id ? planNotlariGetir('').find(x => x.id === id) : null;
  _plDuzenlenenNotId = n ? n.id : null;
  document.getElementById('notModalBaslik').textContent = n ? 'Notu Düzenle' : 'Yeni Not';
  document.getElementById('nBaslik').value = n ? n.baslik : '';
  document.getElementById('nIcerik').value = n ? n.icerik : '';
  document.getElementById('nSabit').checked = n ? n.sabit : false;
  const renk = n ? n.renk : NOT_RENKLERI[1].renk;
  document.querySelectorAll('input[name="nRenk"]').forEach(r => { r.checked = r.value === renk; });
  document.getElementById('nIcerikHata').textContent = '';
  document.getElementById('notModalKatman').classList.add('acik');
  document.getElementById('nBaslik').focus();
}

function notModalKapat() {
  document.getElementById('notModalKatman').classList.remove('acik');
}

function notFormGonderildi(e) {
  e.preventDefault();
  const secili = document.querySelector('input[name="nRenk"]:checked');
  const sonuc = planNotuKaydet({
    baslik: document.getElementById('nBaslik').value,
    icerik: document.getElementById('nIcerik').value,
    renk: secili ? secili.value : '',
    sabit: document.getElementById('nSabit').checked
  }, _plDuzenlenenNotId);
  if (!sonuc.basarili) { document.getElementById('nIcerikHata').textContent = sonuc.hatalar.icerik || ''; return; }
  notModalKapat();
  notlariCiz();
}
