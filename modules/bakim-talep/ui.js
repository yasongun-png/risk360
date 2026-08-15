// Bakım Talep ve Onay ekranının DOM işlemleri.

let _btGorunum = 'talepler';
let _btAcikKayitId = null;

function _btKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function _btTarihSaat(iso) {
  return iso ? new Date(iso).toLocaleString('tr-TR') : '—';
}

function _btDurumRozetSinifi(durum) {
  return 'rozet-' + slugOlustur(durum || '');
}

// Aktif firmanın bölümler listesi (core/tenant.js firma.bolumler) — hem
// "Talep eden birim" seçimi hem de birim filtresi için kullanılır.
function _btBirimleriGetir() {
  const firma = aktifFirmaGetir();
  return firma && Array.isArray(firma.bolumler) ? firma.bolumler : [];
}

// Bu kaydın, ŞU AN görüntüleyen kullanıcı için "sırada bekleyen bir işi"
// olup olmadığını söyler — hem talep listesindeki "Düzenle" butonunu hem de
// detay modalındaki alan kilidini AYNI kuraldan besler (kullanıcı isteği:
// "talep örneğin bakım birimine düştüyse yanında düzenle tıklanabilir
// olsun").
function _btKayitAksiyonBekliyorMu(k, kullanici) {
  const bakimRoluVarMi = _btBakimRoluMu(kullanici);
  const isgRoluVarMi = _btIsgOnaylayiciMi(kullanici);
  const talepSahibiMi = kullanici.rol === 'birim' && kullanici.birimAdi === k.talep.birim;

  if (bakimRoluVarMi && !BAKIM_TALEP_KAPALI_DURUMLAR.includes(k.durum) && k.durum !== 'Onaylandı / Planlandı' && k.durum !== 'Bakım Tamamladı' && k.durum !== 'İSG Onayında') return true;
  if (isgRoluVarMi && k.durum === 'İSG Onayında') return true;
  if (bakimRoluVarMi && k.durum === 'Onaylandı / Planlandı') return true;
  if (talepSahibiMi && k.durum === 'Bakım Tamamladı') return true;
  return false;
}

function _btGorunumDegistir(gorunum) {
  _btGorunum = gorunum;
  document.getElementById('bolum-talepler').style.display = gorunum === 'talepler' ? '' : 'none';
  document.getElementById('bolum-envanter').style.display = gorunum === 'envanter' ? '' : 'none';
  document.getElementById('bolum-ozet').style.display = gorunum === 'ozet' ? '' : 'none';
  document.querySelectorAll('.sekme-cubugu button').forEach(btn => {
    btn.classList.toggle('sekme-seciliDegil', btn.getAttribute('data-sekme') !== gorunum);
  });
  if (gorunum === 'talepler') talepleriCiz();
  else if (gorunum === 'envanter') envanteriCiz();
  else ozetiCiz();
}

function bakimTalepSayfasiniBaslat() {
  document.querySelectorAll('.sekme-cubugu button').forEach(btn => {
    btn.addEventListener('click', () => _btGorunumDegistir(btn.getAttribute('data-sekme')));
  });

  const kullanici = oturumdakiKullanici();
  const btnYeni = document.getElementById('btYeniTalepBtn');
  // Sadece 'birim' kullanıcıları (kendi biriminden) veya admin/düzenleyici
  // yeni talep açabilir — Bakım/İSG rolleri açmaz, sadece işler.
  const talepAcabilir = kullanici.rol === 'birim' || kullaniciAdminMi(kullanici) || kullanici.rol === 'duzenleyici';
  btnYeni.style.display = talepAcabilir ? '' : 'none';
  btnYeni.addEventListener('click', _btYeniTalepModalAc);

  document.getElementById('btAramaKutusu').addEventListener('input', talepleriCiz);
  document.getElementById('btDurumFiltre').addEventListener('change', talepleriCiz);
  document.getElementById('btBirimFiltre').addEventListener('change', talepleriCiz);
  document.getElementById('btDurumFiltre').innerHTML = '<option value="">Tüm Durumlar</option>' +
    BAKIM_TALEP_DURUMLARI.map(d => `<option>${_btKacir(d)}</option>`).join('');
  document.getElementById('btBirimFiltre').innerHTML = '<option value="">Tüm Birimler</option>' +
    _btBirimleriGetir().map(b => `<option>${_btKacir(b)}</option>`).join('');

  document.getElementById('btYeniTalepIptalBtn').addEventListener('click', _btYeniTalepModalKapat);
  document.getElementById('btYeniTalepKaydetBtn').addEventListener('click', _btYeniTalepKaydet);
  document.getElementById('btDetayKapatBtn').addEventListener('click', _btDetayModalKapat);

  _btGorunumDegistir('talepler');
}

// ---- Liste ----

function talepleriCiz() {
  const govde = document.getElementById('btTabloGovde');
  const bosDurum = document.getElementById('btBosDurum');
  const filtreler = {
    durum: document.getElementById('btDurumFiltre').value,
    birim: document.getElementById('btBirimFiltre').value
  };
  const liste = bakimTalepleriGetir(document.getElementById('btAramaKutusu').value, filtreler);

  govde.innerHTML = '';
  if (!liste.length) {
    bosDurum.classList.add('gorunur');
    return;
  }
  bosDurum.classList.remove('gorunur');

  const kullanici = oturumdakiKullanici();
  liste.forEach(t => {
    const aksiyonBekliyor = _btKayitAksiyonBekliyorMu(t, kullanici);
    const satir = document.createElement('tr');
    satir.innerHTML = `
      <td><button type="button" class="tablo-buton" data-detay="${t.id}">${_btKacir(t.talepNo)}</button></td>
      <td>${_btKacir(t.talep.birim)}</td>
      <td>${_btKacir(t.talep.isTanimi)}</td>
      <td>${_btKacir(t.talep.oncelik)}</td>
      <td><span class="genel-rozet ${_btDurumRozetSinifi(t.durum)}">${_btKacir(t.durum)}</span></td>
      <td>${_btTarihSaat(t.olusturmaTarihi)}</td>
      <td><button type="button" class="${aksiyonBekliyor ? 'birincil' : 'ikincil'}" style="width:auto; padding:6px 12px; font-size:12px;" data-detay="${t.id}">${aksiyonBekliyor ? 'Düzenle' : 'Görüntüle'}</button></td>
    `;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-detay]').forEach(btn => {
    btn.addEventListener('click', () => _btDetayModalAc(btn.getAttribute('data-detay')));
  });
}

// ---- Yeni Talep ----

// Talebi Açan Kişi, giriş yapan hesabın adı değil — Personel listesinden
// seçilir (kullanıcı isteği: "talebi açan kişi personel listesinden
// seçilsin", "eskiden belirlediğim kullanıcılar yok" — yani her çalışan
// için ayrı bir giriş hesabı yok, sadece hangi personelin talep ettiği
// seçilir).
function _btAcanKisiSecimDoldur() {
  const secim = document.getElementById('btYtAcanKisi');
  const personeller = personelleriGetir('', false).slice().sort((a, b) => a.adSoyad.localeCompare(b.adSoyad, 'tr'));
  secim.innerHTML = personeller.map(p => `<option>${_btKacir(p.adSoyad)}</option>`).join('')
    || '<option value="">Önce Personel modülünden kayıt ekleyin</option>';
}

function _btYeniTalepModalAc() {
  document.getElementById('btYtBirim').innerHTML = _btBirimleriGetir().map(b => `<option>${_btKacir(b)}</option>`).join('')
    || '<option value="">Önce Firma Yönetimi\'nden bölüm ekleyin</option>';
  const kullanici = oturumdakiKullanici();
  if (kullanici.rol === 'birim' && kullanici.birimAdi) document.getElementById('btYtBirim').value = kullanici.birimAdi;
  _btAcanKisiSecimDoldur();
  document.getElementById('btYtKonum').value = '';
  document.getElementById('btYtEkipmanKodu').value = '';
  document.getElementById('btYtIsTanimi').value = '';
  document.getElementById('btYtOncelik').value = 'Normal';
  document.getElementById('btYtEkipmanDurdu').checked = false;
  document.getElementById('btYeniTalepHata').textContent = '';
  document.getElementById('btYeniTalepKatman').classList.add('acik');
}

function _btYeniTalepModalKapat() {
  document.getElementById('btYeniTalepKatman').classList.remove('acik');
}

function _btYeniTalepKaydet() {
  const veriler = {
    talep: {
      birim: document.getElementById('btYtBirim').value,
      acanKisi: document.getElementById('btYtAcanKisi').value,
      konum: document.getElementById('btYtKonum').value,
      ekipmanKodu: document.getElementById('btYtEkipmanKodu').value,
      isTanimi: document.getElementById('btYtIsTanimi').value,
      oncelik: document.getElementById('btYtOncelik').value,
      ekipmanDurdu: document.getElementById('btYtEkipmanDurdu').checked
    }
  };
  const sonuc = bakimTalepAc(veriler);
  if (!sonuc.basarili) {
    document.getElementById('btYeniTalepHata').textContent = sonuc.hata || Object.values(sonuc.hatalar || {}).join(' ');
    return;
  }
  _btYeniTalepModalKapat();
  talepleriCiz();
}

// ---- Detay / Onay Akışı ----

function _btDetayModalAc(id) {
  const kayit = bakimTalepIdIleGetir(id);
  if (!kayit) { alert('Bu talebe erişiminiz yok veya bulunamadı.'); return; }
  _btAcikKayitId = id;
  const kullanici = oturumdakiKullanici();

  document.getElementById('btDetayBaslik').textContent = kayit.talepNo + ' — ' + kayit.talep.birim;
  document.getElementById('btDetayGovde').innerHTML = _btDetayIcerikOlustur(kayit, kullanici);
  _btDetayOlaylariBagla(kayit, kullanici);
  document.getElementById('btDetayKatman').classList.add('acik');
}

function _btDetayModalKapat() {
  document.getElementById('btDetayKatman').classList.remove('acik');
  _btAcikKayitId = null;
  talepleriCiz();
}

function _btAlan(etiket, deger) {
  return `<div style="margin-bottom:8px;"><div style="font-size:11px; color:var(--metin-soluk); font-weight:600;">${_btKacir(etiket)}</div><div style="font-size:13px;">${_btKacir(deger || '—')}</div></div>`;
}

function _btDetayIcerikOlustur(k, kullanici) {
  const bakimRoluVarMi = _btBakimRoluMu(kullanici);
  const isgRoluVarMi = _btIsgOnaylayiciMi(kullanici);
  const talepSahibiMi = kullanici.rol === 'birim' && kullanici.birimAdi === k.talep.birim;

  let html = '<div style="display:flex; flex-direction:column; gap:18px;">';

  // ---- Talep bölümü (her zaman görüntülenir) ----
  html += `<div>
    <h4 style="margin:0 0 8px;">1. Talep</h4>
    ${_btAlan('Birim', k.talep.birim)}
    ${_btAlan('Açan Kişi', k.talep.acanKisi)}
    ${_btAlan('Tarih', _btTarihSaat(k.talep.tarih))}
    ${_btAlan('Konum / Ekipman / Hat', k.talep.konum)}
    ${_btAlan('Ekipman Kodu', k.talep.ekipmanKodu)}
    ${_btAlan('İş Tanımı', k.talep.isTanimi)}
    ${_btAlan('Öncelik', k.talep.oncelik)}
    ${_btAlan('Ekipman/Hat Durdu mu?', k.talep.ekipmanDurdu ? 'Evet' : 'Hayır')}
  </div>`;

  // ---- Bakım Değerlendirme ----
  const bakimDuzenlenebilir = bakimRoluVarMi && !BAKIM_TALEP_KAPALI_DURUMLAR.includes(k.durum) && k.durum !== 'Onaylandı / Planlandı' && k.durum !== 'Bakım Tamamladı';
  html += '<div><h4 style="margin:0 0 8px;">2. Bakım Değerlendirme</h4>';
  if (bakimDuzenlenebilir) {
    html += `
      <label for="btBkGorus">Bakım Görüşü / Teknik Değerlendirme</label>
      <textarea id="btBkGorus" rows="3">${_btKacir(k.bakim.gorus)}</textarea>
      <label for="btBkPlan">Yapılabilecek Tarih/Saat</label>
      <input type="datetime-local" id="btBkPlan" value="${k.bakim.planlanmaTarihi ? k.bakim.planlanmaTarihi.slice(0, 16) : ''}">
      <label for="btBkSartlar">Gerekli Şartlar (virgülle ayırın)</label>
      <input type="text" id="btBkSartlar" value="${_btKacir((k.bakim.gerekliSartlar || []).join(', '))}">
      <label for="btBkRiskler">Tespit Edilen Riskler</label>
      <div id="btBkRiskler" style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px;">
        ${BAKIM_TALEP_RISK_TURLERI.map(r => `<label style="display:inline-flex; align-items:center; gap:4px; font-weight:400; font-size:12px;"><input type="checkbox" value="${_btKacir(r)}" ${(k.bakim.riskler || []).includes(r) ? 'checked' : ''}> ${_btKacir(r)}</label>`).join('')}
      </div>
      <label for="btBkOnlemler">Alınması Gereken Önlemler</label>
      <textarea id="btBkOnlemler" rows="3">${_btKacir(k.bakim.onlemler)}</textarea>
      <label for="btBkSure">Tahmini Süre / İş Gücü</label>
      <input type="text" id="btBkSure" value="${_btKacir(k.bakim.tahminiSure)}">
      <div style="display:flex; gap:8px; margin-top:10px;">
        <button type="button" class="ikincil" id="btBkKaydetBtn">Taslak Kaydet</button>
        ${k.durum !== 'İSG İlave Önlem İstedi'
          ? '<button type="button" class="birincil" id="btBkGonderBtn">İSG\'ye Gönder</button>'
          : '<button type="button" class="birincil" id="btBkTekrarGonderBtn">İlave Önlemle Tekrar Gönder</button>'}
        <button type="button" class="ikincil" id="btBkReddetBtn" style="color:var(--hata);">Reddet</button>
      </div>
      <div class="alan-hatasi" id="btBkHata"></div>
    `;
  } else {
    html += _btAlan('Bakım Görüşü', k.bakim.gorus) + _btAlan('Planlanma', _btTarihSaat(k.bakim.planlanmaTarihi)) +
      _btAlan('Gerekli Şartlar', (k.bakim.gerekliSartlar || []).join(', ')) + _btAlan('Riskler', (k.bakim.riskler || []).join(', ')) +
      _btAlan('Önlemler', k.bakim.onlemler) + _btAlan('Tahmini Süre', k.bakim.tahminiSure);
  }
  html += '</div>';

  // ---- İSG Değerlendirme ----
  const isgDuzenlenebilir = isgRoluVarMi && k.durum === 'İSG Onayında';
  html += '<div><h4 style="margin:0 0 8px;">3. İSG Değerlendirme</h4>';
  if (isgDuzenlenebilir) {
    html += `
      <label style="display:flex; align-items:center; gap:6px; font-weight:400;">
        <input type="checkbox" id="btIsgIlaveVar" style="width:auto;"> İlave önlem gerekli
      </label>
      <label for="btIsgAciklama">İlave Önlem Açıklaması</label>
      <textarea id="btIsgAciklama" rows="2"></textarea>
      <div style="display:flex; gap:8px; margin-top:10px;">
        <button type="button" class="birincil" id="btIsgOnaylaBtn">Onayla</button>
        <button type="button" class="ikincil" id="btIsgIlaveBtn">İlave Önlem İste</button>
        <button type="button" class="ikincil" id="btIsgReddetBtn" style="color:var(--hata);">Reddet</button>
      </div>
      <div class="alan-hatasi" id="btIsgHata"></div>
    `;
  } else {
    html += _btAlan('Onay Durumu', k.isg.onayDurumu) + _btAlan('İlave Önlem', k.isg.ilaveOnlemGerekli ? k.isg.ilaveOnlemAciklama : 'Gerekmedi') +
      _btAlan('Onaylayan', k.isg.onaylayanKisi) + _btAlan('Tarih', _btTarihSaat(k.isg.tarih));
  }
  html += '</div>';

  // ---- Kapanış ----
  html += '<div><h4 style="margin:0 0 8px;">4. Kapanış</h4>';
  if (bakimRoluVarMi && k.durum === 'Onaylandı / Planlandı') {
    html += `
      <label for="btKpNot">Tamamlama Notu (opsiyonel)</label>
      <textarea id="btKpNot" rows="2"></textarea>
      <button type="button" class="birincil" id="btKpTamamlaBtn">İş Tamamlandı</button>
    `;
  } else if (talepSahibiMi && k.durum === 'Bakım Tamamladı') {
    html += `
      <label for="btKpMemnuniyet">Not (opsiyonel)</label>
      <textarea id="btKpMemnuniyet" rows="2"></textarea>
      <button type="button" class="birincil" id="btKpOnaylaBtn">Onaylıyorum, İş Kapatılabilir</button>
    `;
  } else {
    html += _btAlan('Bakım Tamamlama', _btTarihSaat(k.kapanis.bakimTamamlamaTarihi)) + _btAlan('Bakım Notu', k.kapanis.bakimNotu) +
      _btAlan('Talep Eden Onayı', k.kapanis.talepEdenOnay ? 'Evet' : 'Hayır') + _btAlan('Kapanış Tarihi', _btTarihSaat(k.kapanis.kapanisTarihi));
  }
  if (k.durum === 'Reddedildi') html += _btAlan('Red Gerekçesi', k.redGerekcesi);
  html += '</div>';

  // ---- Geçmiş ----
  html += `<div><h4 style="margin:0 0 8px;">Geçmiş</h4><div style="font-size:12px; display:flex; flex-direction:column; gap:4px;">
    ${(k.gecmis || []).slice().reverse().map(g => `<div>${_btTarihSaat(g.tarih)} — <strong>${_btKacir(g.kullanici)}</strong>: ${_btKacir(g.not)}</div>`).join('')}
  </div></div>`;

  html += '</div>';
  return html;
}

function _btDetayOlaylariBagla(k, kullanici) {
  const btBkKaydet = document.getElementById('btBkKaydetBtn');
  if (btBkKaydet) btBkKaydet.addEventListener('click', () => _btBakimKaydet(k.id, false));

  const btBkGonder = document.getElementById('btBkGonderBtn');
  if (btBkGonder) btBkGonder.addEventListener('click', () => _btBakimKaydet(k.id, true));

  const btBkTekrarGonder = document.getElementById('btBkTekrarGonderBtn');
  if (btBkTekrarGonder) btBkTekrarGonder.addEventListener('click', () => {
    _btBakimKaydet(k.id, false, () => {
      const sonuc = bakimTekrarGonder(k.id);
      if (!sonuc.basarili) { alert(sonuc.hata); return; }
      _btDetayModalKapat();
    });
  });

  const btBkReddet = document.getElementById('btBkReddetBtn');
  if (btBkReddet) btBkReddet.addEventListener('click', () => {
    const gerekce = prompt('Reddetme gerekçesi:', '');
    if (gerekce === null) return;
    const sonuc = talepReddet(k.id, gerekce);
    if (!sonuc.basarili) { alert(sonuc.hata || Object.values(sonuc.hatalar || {}).join(' ')); return; }
    _btDetayModalKapat();
  });

  const btIsgOnayla = document.getElementById('btIsgOnaylaBtn');
  if (btIsgOnayla) btIsgOnayla.addEventListener('click', () => {
    const sonuc = isgOnayla(k.id);
    if (!sonuc.basarili) { alert(sonuc.hata); return; }
    _btDetayModalKapat();
  });

  const btIsgIlave = document.getElementById('btIsgIlaveBtn');
  if (btIsgIlave) btIsgIlave.addEventListener('click', () => {
    const aciklama = document.getElementById('btIsgAciklama').value;
    const sonuc = isgIlaveOnlemIste(k.id, aciklama);
    if (!sonuc.basarili) { document.getElementById('btIsgHata').textContent = sonuc.hata || Object.values(sonuc.hatalar || {}).join(' '); return; }
    _btDetayModalKapat();
  });

  const btIsgReddet = document.getElementById('btIsgReddetBtn');
  if (btIsgReddet) btIsgReddet.addEventListener('click', () => {
    const gerekce = prompt('Reddetme gerekçesi:', '');
    if (gerekce === null) return;
    const sonuc = talepReddet(k.id, gerekce);
    if (!sonuc.basarili) { alert(sonuc.hata || Object.values(sonuc.hatalar || {}).join(' ')); return; }
    _btDetayModalKapat();
  });

  const btKpTamamla = document.getElementById('btKpTamamlaBtn');
  if (btKpTamamla) btKpTamamla.addEventListener('click', () => {
    const not = document.getElementById('btKpNot').value;
    const sonuc = bakimTamamlandiIsaretle(k.id, not);
    if (!sonuc.basarili) { alert(sonuc.hata); return; }
    _btDetayModalKapat();
  });

  const btKpOnayla = document.getElementById('btKpOnaylaBtn');
  if (btKpOnayla) btKpOnayla.addEventListener('click', () => {
    const not = document.getElementById('btKpMemnuniyet').value;
    const sonuc = talepEdenKapat(k.id, not);
    if (!sonuc.basarili) { alert(sonuc.hata); return; }
    _btDetayModalKapat();
  });
}

function _btBakimKaydet(id, gonder, sonrasi) {
  const veriler = {
    gorus: document.getElementById('btBkGorus').value,
    planlanmaTarihi: document.getElementById('btBkPlan').value,
    gerekliSartlar: document.getElementById('btBkSartlar').value.split(',').map(s => s.trim()).filter(Boolean),
    riskler: Array.from(document.querySelectorAll('#btBkRiskler input:checked')).map(cb => cb.value),
    onlemler: document.getElementById('btBkOnlemler').value,
    tahminiSure: document.getElementById('btBkSure').value
  };
  const kaydetSonuc = bakimDegerlendirmeKaydet(id, veriler);
  if (!kaydetSonuc.basarili) {
    const hataEl = document.getElementById('btBkHata');
    if (hataEl) hataEl.textContent = kaydetSonuc.hata || Object.values(kaydetSonuc.hatalar || {}).join(' ');
    return;
  }
  if (sonrasi) { sonrasi(); return; }
  if (gonder) {
    const gonderSonuc = bakimIsgeGonder(id);
    if (!gonderSonuc.basarili) {
      document.getElementById('btBkHata').textContent = gonderSonuc.hata || Object.values(gonderSonuc.hatalar || {}).join(' ');
      return;
    }
    _btDetayModalKapat();
  } else {
    _btDetayModalAc(id);
  }
}

// ---- Ekipman Envanteri (Bakım modülü içinde bir sekme/rapor) ----

function envanteriCiz() {
  const govde = document.getElementById('btEnvanterTabloGovde');
  const liste = ekipmanEnvanteriTumunuGetirRepo().slice().sort((a, b) => b.talepSayisi - a.talepSayisi);
  govde.innerHTML = liste.map(e => `
    <tr>
      <td>${_btKacir(e.kod)}</td>
      <td>${_btKacir(e.konum)}</td>
      <td>${e.talepSayisi}</td>
      <td>${_btTarihSaat(e.sonKullanimTarihi)}</td>
    </tr>
  `).join('') || '<tr><td colspan="4" style="text-align:center; color:var(--metin-soluk);">Henüz ekipman kaydı yok.</td></tr>';
}

// ---- Özet (birim bazlı dashboard) ----

function ozetiCiz() {
  const kutu = document.getElementById('btOzetKutusu');
  const ozet = bakimTalepOzetiHesapla();
  kutu.innerHTML = `
    <div class="istatistik-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(160px,1fr)); gap:10px; margin-bottom:18px;">
      <div class="istatistik-kutu"><span>Toplam Talep</span><b>${ozet.toplam}</b></div>
      <div class="istatistik-kutu"><span>Açık Talep</span><b>${ozet.acik}</b></div>
      <div class="istatistik-kutu"><span>İSG Onayı Bekleyen</span><b>${ozet.onayBekleyen}</b></div>
    </div>
    <h4>Birime Göre</h4>
    <table class="veri-tablosu">
      <thead><tr><th>Birim</th><th>Açık</th><th>Kapanan</th><th>İlave Önlem Alan</th><th>Ort. Kapanış (gün)</th></tr></thead>
      <tbody>
        ${ozet.birimlerGore.map(b => `
          <tr>
            <td>${_btKacir(b.birim)}</td>
            <td>${b.acik}</td>
            <td>${b.kapali}</td>
            <td>${b.ilaveOnlemli}</td>
            <td>${b.ortalamaKapanisGunu ?? '—'}</td>
          </tr>
        `).join('') || '<tr><td colspan="5" style="text-align:center; color:var(--metin-soluk);">Veri yok.</td></tr>'}
      </tbody>
    </table>
  `;
}
