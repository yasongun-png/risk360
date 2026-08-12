// İSG Malzeme Talep ekranı DOM işlemleri (Yeni Talep Oluru / Takip Listesi / Malzeme Kataloğu).

let _mtGorunum = 'yeniTalep';
let _duzenlenenTalepId = null;
let _duzenlenenMalzemeId = null;
let _mtSecilenMalzemeler = [];

function mtRozetSinifAdi(durum) {
  return slugOlustur(durum || '');
}

function malzemeTalepSayfasiniBaslat() {
  document.querySelectorAll('[data-sekme]').forEach(btn => {
    btn.addEventListener('click', () => mtGorunumDegistir(btn.getAttribute('data-sekme')));
  });

  _mtAyarlarBaslat();
  _mtYeniTalepBaslat();
  _mtTakipBaslat();
  _mtKatalogBaslat();

  mtOzetiCiz();
  mtGorunumDegistir('yeniTalep');
}

function mtGorunumDegistir(gorunum) {
  _mtGorunum = gorunum;
  ['yeniTalep', 'takip', 'katalog'].forEach(g => {
    document.querySelector(`[data-sekme="${g}"]`).classList.toggle('sekme-seciliDegil', g !== gorunum);
    document.getElementById('bolum-' + g).style.display = g === gorunum ? '' : 'none';
  });

  if (gorunum === 'takip') takipListesiniCiz(document.getElementById('takipAramaKutusu').value);
  else if (gorunum === 'katalog') katalogListesiniCiz(document.getElementById('katalogAramaKutusu').value);
  mtOzetiCiz();
}

function mtOzetiCiz() {
  const ozet = malzemeTalepOzetiHesapla();
  const kart = (etiket, deger) => `<div class="istatistik-kutu"><span>${etiket}</span><b>${deger}</b></div>`;
  document.getElementById('mtOzetKutusu').innerHTML = `
    <div class="istatistik-grid">
      ${kart('Toplam Talep', ozet.toplam)}
      ${kart('Bu Yıl', ozet.buYil)}
      ${kart('Aktif (Açık)', ozet.aktif)}
      ${kart('Geciken', ozet.geciken)}
    </div>
  `;
}

// ==================== AYARLAR ====================

function _mtAyarlarBaslat() {
  document.getElementById('ayarlarBtn').addEventListener('click', ayarlarModalAc);
  document.getElementById('ayarlarKapatBtn').addEventListener('click', ayarlarModalKapat);
  document.getElementById('ayarlarIptalBtn').addEventListener('click', ayarlarModalKapat);
  document.getElementById('ayarlarKaydetBtn').addEventListener('click', () => {
    malzemeTalepAyarlariKaydet({
      mudurluk: document.getElementById('ayMudurluk').value,
      hitap: document.getElementById('ayHitap').value,
      imzaYetkilisi: document.getElementById('ayImzaYetkilisi').value,
      unvan: document.getElementById('ayUnvan').value,
      paraf: document.getElementById('ayParaf').value
    });
    ayarlarModalKapat();
  });
}

function ayarlarModalAc() {
  const a = malzemeTalepAyarlariGetir();
  document.getElementById('ayMudurluk').value = a.mudurluk;
  document.getElementById('ayHitap').value = a.hitap;
  document.getElementById('ayImzaYetkilisi').value = a.imzaYetkilisi;
  document.getElementById('ayUnvan').value = a.unvan;
  document.getElementById('ayParaf').value = a.paraf;
  document.getElementById('ayarlarModalKatman').classList.add('acik');
}

function ayarlarModalKapat() {
  document.getElementById('ayarlarModalKatman').classList.remove('acik');
}

// ==================== YENİ TALEP ====================

function _mtYeniTalepBaslat() {
  document.getElementById('tAciliyet').innerHTML = MALZEME_TALEP_ACILIYET.map(a => `<option>${a}</option>`).join('');
  document.getElementById('tDurum').innerHTML = MALZEME_TALEP_DURUMLARI.map(d => `<option>${d}</option>`).join('');
  document.getElementById('tGerekce').innerHTML = MALZEME_TALEP_GEREKCELERI.map(g => `<option>${g}</option>`).join('');

  document.getElementById('pickAramaKutusu').addEventListener('input', e => malzemePickerCiz(e.target.value));
  document.getElementById('metinOnerBtn').addEventListener('click', metinOner);
  document.getElementById('talepForm').addEventListener('submit', talepFormGonderildi);
  document.getElementById('talepTemizleBtn').addEventListener('click', () => talepFormuSifirla());
  document.getElementById('talepWordBtn').addEventListener('click', async () => {
    if (!_duzenlenenTalepId) { alert('Önce talebi kaydedin.'); return; }
    try { await malzemeTalepWordOlustur(_duzenlenenTalepId); } catch (hata) { console.error(hata); alert('Word oluşturulamadı: ' + (hata.message || hata)); }
  });
  document.getElementById('talepYazdirBtn').addEventListener('click', () => {
    if (!_duzenlenenTalepId) { alert('Önce talebi kaydedin.'); return; }
    malzemeTalepOnizlemeYazdir(_duzenlenenTalepId);
  });

  ['tTarih', 'tKonu', 'tMetin', 'tMudurluk', 'tHitap', 'tImzaYetkilisi', 'tUnvan'].forEach(id => {
    document.getElementById(id).addEventListener('input', onizlemeGuncelle);
  });

  talepFormuSifirla();
  malzemePickerCiz('');
}

function talepFormuSifirla() {
  _duzenlenenTalepId = null;
  const ayarlar = malzemeTalepAyarlariGetir();
  document.getElementById('talepFormBaslik').textContent = 'Yeni Talep';
  document.getElementById('tTarih').value = bugunIso();
  document.getElementById('tAciliyet').value = 'Normal';
  document.getElementById('tKonu').value = '';
  document.getElementById('tBirim').value = '';
  document.getElementById('tKullanimBolumu').value = '';
  document.getElementById('tGerekce').value = MALZEME_TALEP_GEREKCELERI[0];
  document.getElementById('tOzelGerekce').value = '';
  document.getElementById('tMetin').value = '';
  document.getElementById('tMudurluk').value = ayarlar.mudurluk;
  document.getElementById('tHitap').value = ayarlar.hitap;
  document.getElementById('tImzaYetkilisi').value = ayarlar.imzaYetkilisi;
  document.getElementById('tUnvan').value = ayarlar.unvan;
  document.getElementById('tDurum').value = 'Taslak';
  document.getElementById('tAciklama').value = '';
  _mtSecilenMalzemeler = [];
  secilenMalzemeleriCiz();
  document.querySelectorAll('#talepForm .alan-hatasi').forEach(el => el.textContent = '');
  onizlemeGuncelle();
}

function malzemePickerCiz(aramaMetni) {
  const kutu = document.getElementById('malzemePicker');
  const liste = malzemeleriGetir(aramaMetni, { aktifMi: 'Aktif' });
  kutu.innerHTML = liste.map(m =>
    `<button type="button" class="tablo-buton" style="display:block; width:100%; text-align:left; margin-bottom:4px;" data-pick="${m.id}"><b>${m.ad}</b> <span style="color:var(--metin-soluk); font-size:11px;">${m.kod ? m.kod + ' · ' : ''}${m.kategori || ''} · ${m.birim}</span></button>`
  ).join('') || '<div class="bos-durum gorunur">Kayıt yok.</div>';
  kutu.querySelectorAll('[data-pick]').forEach(btn => btn.addEventListener('click', () => malzemeSec(btn.getAttribute('data-pick'))));
}

function malzemeSec(malzemeId) {
  if (_mtSecilenMalzemeler.some(m => m.malzemeId === malzemeId)) { alert('Bu malzeme zaten seçildi.'); return; }
  const malzeme = malzemeIdIleGetirRepo(malzemeId);
  if (!malzeme) return;

  const aktifTalep = malzemeAktifTalepteMi(malzemeId);
  if (aktifTalep && aktifTalep.id !== _duzenlenenTalepId) alert(`Devam eden ${aktifTalep.belgeNo} numaralı talep var.`);

  _mtSecilenMalzemeler.push(malzemeTalepSatiriOlustur(malzeme, { miktar: malzeme.varsayilanMiktar || 1 }));
  secilenMalzemeleriCiz();
  onizlemeGuncelle();
}

function secilenMalzemeleriCiz() {
  const kutu = document.getElementById('secilenMalzemeler');
  if (!_mtSecilenMalzemeler.length) {
    kutu.innerHTML = '<div class="bos-durum gorunur">Henüz malzeme seçilmedi.</div>';
    return;
  }

  kutu.innerHTML = _mtSecilenMalzemeler.map((m, i) => `
    <div class="kart" style="margin-bottom:8px; padding:10px;" data-si="${i}">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <b>${i + 1}. ${m.ad}</b>
        <button type="button" class="tablo-buton sil" data-rm="${i}">Sil</button>
      </div>
      <div class="form-satir-ikili" style="margin-top:6px;">
        <div><label style="font-size:11px;">Miktar</label><input type="number" min="0.01" step="0.01" data-f="miktar" value="${m.miktar}"></div>
        <div><label style="font-size:11px;">Birim</label><input type="text" data-f="birim" value="${m.birim}"></div>
      </div>
      <div class="form-satir-ikili">
        <div><label style="font-size:11px;">Renk</label><input type="text" data-f="renk" value="${m.renk}"></div>
        <div><label style="font-size:11px;">Beden</label><input type="text" data-f="beden" value="${m.beden}"></div>
      </div>
      <div class="form-satir-ikili">
        <div><label style="font-size:11px;">Numara</label><input type="text" data-f="numara" value="${m.numara}"></div>
        <div><label style="font-size:11px;">Marka / Model</label><input type="text" data-f="marka" value="${m.marka}"></div>
      </div>
      <label style="font-size:11px;">Açıklama</label><input type="text" data-f="aciklama" value="${m.aciklama}">
      ${m.altKalemler.length ? `<div style="margin-top:6px;">${m.altKalemler.map((s, j) => `<label style="margin-right:10px; font-weight:400; font-size:12px;"><input type="checkbox" data-sub="${j}" style="width:auto;" ${m.seciliAltKalemler.includes(s) ? 'checked' : ''}> ${s}</label>`).join('')}</div>` : ''}
    </div>
  `).join('');

  kutu.querySelectorAll('[data-si]').forEach(kart => {
    const i = Number(kart.getAttribute('data-si'));
    kart.querySelectorAll('[data-f]').forEach(inp => inp.addEventListener('input', () => {
      _mtSecilenMalzemeler[i][inp.getAttribute('data-f')] = inp.type === 'number' ? Number(inp.value) : inp.value;
      onizlemeGuncelle();
    }));
    kart.querySelectorAll('[data-sub]').forEach(inp => inp.addEventListener('change', () => {
      const s = _mtSecilenMalzemeler[i].altKalemler[Number(inp.getAttribute('data-sub'))];
      const mevcut = _mtSecilenMalzemeler[i].seciliAltKalemler;
      _mtSecilenMalzemeler[i].seciliAltKalemler = inp.checked ? Array.from(new Set([...mevcut, s])) : mevcut.filter(x => x !== s);
    }));
  });

  kutu.querySelectorAll('[data-rm]').forEach(btn => btn.addEventListener('click', () => {
    _mtSecilenMalzemeler.splice(Number(btn.getAttribute('data-rm')), 1);
    secilenMalzemeleriCiz();
    onizlemeGuncelle();
  }));
}

function metinOner() {
  if (!_mtSecilenMalzemeler.length) { alert('Önce malzeme seçin.'); return; }
  const ozelGerekce = document.getElementById('tOzelGerekce').value.trim();
  const gerekce = ozelGerekce || document.getElementById('tGerekce').value;
  document.getElementById('tMetin').value = malzemeTalepMetniUret(_mtSecilenMalzemeler, gerekce);
  onizlemeGuncelle();
}

function _mtFormdanTaslakOlustur() {
  return {
    talepTarihi: document.getElementById('tTarih').value,
    belgeNo: _duzenlenenTalepId ? (malzemeTalepIdIleGetirRepo(_duzenlenenTalepId) || {}).belgeNo : '',
    ustBelgeNo: _duzenlenenTalepId ? (malzemeTalepIdIleGetirRepo(_duzenlenenTalepId) || {}).ustBelgeNo : '',
    konu: document.getElementById('tKonu').value,
    mudurluk: document.getElementById('tMudurluk').value,
    hitap: document.getElementById('tHitap').value,
    imzaYetkilisi: document.getElementById('tImzaYetkilisi').value,
    unvan: document.getElementById('tUnvan').value,
    duzenlenmisMetin: document.getElementById('tMetin').value,
    malzemeler: _mtSecilenMalzemeler
  };
}

function onizlemeGuncelle() {
  const ayarlar = malzemeTalepAyarlariGetir();
  const taslak = _mtFormdanTaslakOlustur();
  taslak.paraf = ayarlar.paraf;
  document.getElementById('talepOnizleme').innerHTML = malzemeTalepOnizlemeHtmlUret(taslak);
}

function talepFormunuDoldur(t) {
  _duzenlenenTalepId = t.id;
  document.getElementById('talepFormBaslik').textContent = t.belgeNo + ' Talebini Düzenle';
  document.getElementById('tTarih').value = t.talepTarihi;
  document.getElementById('tAciliyet').value = t.aciliyet;
  document.getElementById('tKonu').value = t.konu;
  document.getElementById('tBirim').value = t.talepEdenBirim;
  document.getElementById('tKullanimBolumu').value = t.kullanimBolumu;
  document.getElementById('tOzelGerekce').value = '';
  document.getElementById('tMetin').value = t.duzenlenmisMetin || t.uretilenMetin;
  document.getElementById('tMudurluk').value = t.mudurluk;
  document.getElementById('tHitap').value = t.hitap;
  document.getElementById('tImzaYetkilisi').value = t.imzaYetkilisi;
  document.getElementById('tUnvan').value = t.unvan;
  document.getElementById('tDurum').value = t.durum;
  document.getElementById('tAciklama').value = t.aciklama;
  _mtSecilenMalzemeler = JSON.parse(JSON.stringify(t.malzemeler || []));
  secilenMalzemeleriCiz();
  document.querySelectorAll('#talepForm .alan-hatasi').forEach(el => el.textContent = '');
  onizlemeGuncelle();
  mtGorunumDegistir('yeniTalep');
}

function talepFormGonderildi(e) {
  e.preventDefault();
  document.querySelectorAll('#talepForm .alan-hatasi').forEach(el => el.textContent = '');

  if (!document.getElementById('tMetin').value.trim()) metinOner();

  const veriler = {
    talepTarihi: document.getElementById('tTarih').value,
    konu: document.getElementById('tKonu').value,
    aciklama: document.getElementById('tAciklama').value,
    uretilenMetin: document.getElementById('tMetin').value,
    duzenlenmisMetin: document.getElementById('tMetin').value,
    talepEdenBirim: document.getElementById('tBirim').value,
    kullanimBolumu: document.getElementById('tKullanimBolumu').value,
    aciliyet: document.getElementById('tAciliyet').value,
    mudurluk: document.getElementById('tMudurluk').value,
    hitap: document.getElementById('tHitap').value,
    imzaYetkilisi: document.getElementById('tImzaYetkilisi').value,
    unvan: document.getElementById('tUnvan').value,
    durum: document.getElementById('tDurum').value
  };

  const sonuc = _duzenlenenTalepId
    ? malzemeTalepGuncelle(_duzenlenenTalepId, veriler, _mtSecilenMalzemeler)
    : malzemeTalepEkle(veriler, _mtSecilenMalzemeler);

  if (!sonuc.basarili) {
    if (sonuc.hatalar && sonuc.hatalar.malzemeler) document.getElementById('tMalzemelerHata').textContent = sonuc.hatalar.malzemeler;
    Object.keys(sonuc.hatalar || {}).forEach(alan => {
      const hataEl = document.getElementById('t' + alan.charAt(0).toUpperCase() + alan.slice(1) + 'Hata');
      if (hataEl) hataEl.textContent = sonuc.hatalar[alan];
    });
    return;
  }

  _duzenlenenTalepId = sonuc.kayit.id;
  document.getElementById('talepFormBaslik').textContent = sonuc.kayit.belgeNo + ' kaydedildi';
  alert(sonuc.kayit.belgeNo + ' olarak kaydedildi.');
  onizlemeGuncelle();
  mtOzetiCiz();
}

// ==================== TAKİP LİSTESİ ====================

function _mtTakipBaslat() {
  document.getElementById('takipDurumFiltre').innerHTML += MALZEME_TALEP_DURUMLARI.map(d => `<option>${d}</option>`).join('');
  document.getElementById('takipAramaKutusu').addEventListener('input', e => takipListesiniCiz(e.target.value));
  document.getElementById('takipDurumFiltre').addEventListener('change', () => takipListesiniCiz(document.getElementById('takipAramaKutusu').value));
  document.getElementById('gecikenlerFiltre').addEventListener('change', () => takipListesiniCiz(document.getElementById('takipAramaKutusu').value));
  document.getElementById('takipDisaAktarBtn').addEventListener('click', () => {
    const liste = _mtTakipFiltreliListe('').map(t => Object.assign({}, t, { talepTarihiGoruntu: gunAyYil(t.talepTarihi) }));
    excelDisaAktar(liste, MALZEME_TALEP_EXPORT_KOLONLARI, 'malzeme_talepleri.xlsx');
  });
}

const MALZEME_TALEP_EXPORT_KOLONLARI = [
  { anahtar: 'belgeNo', baslik: 'Belge No' },
  { anahtar: 'talepTarihiGoruntu', baslik: 'Talep Tarihi' },
  { anahtar: 'konu', baslik: 'Konu' },
  { anahtar: 'talepEdenBirim', baslik: 'Talep Eden Birim' },
  { anahtar: 'aciliyet', baslik: 'Aciliyet' },
  { anahtar: 'durum', baslik: 'Durum' }
];

function _mtTakipFiltreliListe(aramaMetni) {
  return malzemeTalepleriGetir(aramaMetni, {
    durum: document.getElementById('takipDurumFiltre').value,
    gecikenlerMi: document.getElementById('gecikenlerFiltre').checked
  });
}

function takipListesiniCiz(aramaMetni) {
  const govde = document.getElementById('takipTabloGovde');
  const bosDurum = document.getElementById('takipBosDurum');
  const liste = _mtTakipFiltreliListe(aramaMetni);

  govde.innerHTML = '';
  if (!liste.length) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = 'Eşleşen talep bulunamadı.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  liste.forEach(t => {
    const satir = document.createElement('tr');
    satir.innerHTML = `
      <td>${t.belgeNo}</td>
      <td>${gunAyYil(t.talepTarihi)}</td>
      <td>${t.konu}</td>
      <td>${t.talepEdenBirim || '-'}</td>
      <td>${t.aciliyet}</td>
      <td>
        <select data-durum="${t.id}" style="width:auto; margin:0; font-size:12px;">
          ${MALZEME_TALEP_DURUMLARI.map(d => `<option ${t.durum === d ? 'selected' : ''}>${d}</option>`).join('')}
        </select>
      </td>
      <td>
        <button class="tablo-buton" data-duzenle="${t.id}">Düzenle</button>
        <button class="tablo-buton" data-tekrarla="${t.id}">Tekrarla</button>
        <button class="tablo-buton" data-word="${t.id}">Word</button>
        <button class="tablo-buton" data-yazdir="${t.id}">Yazdır</button>
        <button class="tablo-buton sil" data-sil="${t.id}">Sil</button>
      </td>
    `;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-durum]').forEach(sel => sel.addEventListener('change', () => {
    malzemeTalepDurumGuncelle(sel.getAttribute('data-durum'), sel.value);
    mtOzetiCiz();
  }));
  govde.querySelectorAll('[data-duzenle]').forEach(btn => btn.addEventListener('click', () => talepFormunuDoldur(malzemeTalepIdIleGetirRepo(btn.getAttribute('data-duzenle')))));
  govde.querySelectorAll('[data-tekrarla]').forEach(btn => btn.addEventListener('click', () => {
    const t = malzemeTalepIdIleGetirRepo(btn.getAttribute('data-tekrarla'));
    if (!t) return;
    talepFormuSifirla();
    document.getElementById('tKonu').value = t.konu;
    document.getElementById('tBirim').value = t.talepEdenBirim;
    document.getElementById('tKullanimBolumu').value = t.kullanimBolumu;
    _mtSecilenMalzemeler = JSON.parse(JSON.stringify(t.malzemeler || [])).map(m => Object.assign({}, m, { id: rastgeleId() }));
    secilenMalzemeleriCiz();
    onizlemeGuncelle();
    mtGorunumDegistir('yeniTalep');
  }));
  govde.querySelectorAll('[data-word]').forEach(btn => btn.addEventListener('click', async () => {
    try { await malzemeTalepWordOlustur(btn.getAttribute('data-word')); } catch (hata) { console.error(hata); alert('Word oluşturulamadı: ' + (hata.message || hata)); }
  }));
  govde.querySelectorAll('[data-yazdir]').forEach(btn => btn.addEventListener('click', () => malzemeTalepOnizlemeYazdir(btn.getAttribute('data-yazdir'))));
  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', () => {
    if (confirm('Bu talebi silmek istediğinize emin misiniz?')) { malzemeTalepSil(btn.getAttribute('data-sil')); takipListesiniCiz(document.getElementById('takipAramaKutusu').value); mtOzetiCiz(); }
  }));
}

// ==================== MALZEME KATALOĞU ====================

function _mtKatalogBaslat() {
  document.getElementById('mBirim').innerHTML = MALZEME_BIRIMLERI.map(b => `<option>${b}</option>`).join('');

  document.getElementById('yeniMalzemeBtn').addEventListener('click', () => malzemeModalAc());
  document.getElementById('malzemeModalKapatBtn').addEventListener('click', malzemeModalKapat);
  document.getElementById('malzemeModalIptalBtn').addEventListener('click', malzemeModalKapat);
  document.getElementById('malzemeForm').addEventListener('submit', malzemeFormGonderildi);
  document.getElementById('katalogAramaKutusu').addEventListener('input', e => katalogListesiniCiz(e.target.value));
  document.getElementById('kkdKatalogYukleBtn').addEventListener('click', () => {
    const sonuc = kkdKatalogunuYukle();
    alert(`${sonuc.eklenen} yeni KKD malzemesi eklendi.${sonuc.atlanan ? ' ' + sonuc.atlanan + ' tanesi zaten kataloğda olduğu için atlandı.' : ''}`);
    katalogListesiniCiz(document.getElementById('katalogAramaKutusu').value);
    malzemePickerCiz(document.getElementById('pickAramaKutusu').value);
  });

  document.getElementById('katalogSablonIndirBtn').addEventListener('click', () => excelSablonIndir(MALZEME_IMPORT_KOLONLARI, 'malzeme_katalogu_sablonu.xlsx'));
  document.getElementById('katalogDisaAktarBtn').addEventListener('click', () => {
    const liste = malzemeleriGetir('', {}).map(m => Object.assign({}, m, { durumGoruntu: m.aktifMi ? 'Aktif' : 'Pasif' }));
    excelDisaAktar(liste, MALZEME_EXPORT_KOLONLARI, 'malzeme_katalogu.xlsx');
  });
  document.getElementById('katalogIceAktarBtn').addEventListener('click', () => document.getElementById('katalogIceAktarDosya').click());
  document.getElementById('katalogIceAktarDosya').addEventListener('change', e => {
    const dosya = e.target.files[0];
    excelIceAktar(dosya, MALZEME_IMPORT_KOLONLARI, (satirlar, hataMesaji) => {
      e.target.value = '';
      if (hataMesaji) { alert(hataMesaji); return; }
      const sonuc = excelToplulIceAktarSonucOzetle(satirlar, malzemeEkle);
      alert(excelIceAktarOzetMesaji(sonuc));
      katalogListesiniCiz(document.getElementById('katalogAramaKutusu').value);
    });
  });
}

const MALZEME_IMPORT_KOLONLARI = [
  { anahtar: 'ad', baslik: 'Malzeme Adı' },
  { anahtar: 'kod', baslik: 'Malzeme Kodu' },
  { anahtar: 'kategori', baslik: 'Kategori' },
  { anahtar: 'birim', baslik: 'Birim' },
  { anahtar: 'standartlar', baslik: 'Standartlar' }
];

const MALZEME_EXPORT_KOLONLARI = [
  { anahtar: 'kod', baslik: 'Kod' },
  { anahtar: 'ad', baslik: 'Ad' },
  { anahtar: 'kategori', baslik: 'Kategori' },
  { anahtar: 'birim', baslik: 'Birim' },
  { anahtar: 'durumGoruntu', baslik: 'Durum' }
];

function katalogListesiniCiz(aramaMetni) {
  const govde = document.getElementById('katalogTabloGovde');
  const bosDurum = document.getElementById('katalogBosDurum');
  const liste = malzemeleriGetir(aramaMetni, {});

  govde.innerHTML = '';
  if (!liste.length) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = 'Eşleşen malzeme bulunamadı.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  liste.forEach(m => {
    const satir = document.createElement('tr');
    satir.innerHTML = `
      <td>${m.kod || '-'}</td>
      <td>${m.ad}</td>
      <td>${m.kategori || '-'}</td>
      <td>${m.birim}</td>
      <td><span class="genel-rozet rozet-${mtRozetSinifAdi(m.aktifMi ? 'Aktif' : 'Pasif')}">${m.aktifMi ? 'Aktif' : 'Pasif'}</span></td>
      <td>
        <button class="tablo-buton" data-duzenle="${m.id}">Düzenle</button>
        <button class="tablo-buton sil" data-sil="${m.id}">Sil</button>
      </td>
    `;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-duzenle]').forEach(btn => btn.addEventListener('click', () => malzemeModalAc(malzemeIdIleGetirRepo(btn.getAttribute('data-duzenle')))));
  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', () => {
    if (confirm('Bu malzemeyi katalogdan silmek istediğinize emin misiniz?')) { malzemeSil(btn.getAttribute('data-sil')); katalogListesiniCiz(document.getElementById('katalogAramaKutusu').value); }
  }));
}

function malzemeModalAc(kayit) {
  _duzenlenenMalzemeId = kayit ? kayit.id : null;
  document.getElementById('malzemeModalBaslik').textContent = kayit ? 'Malzemeyi Düzenle' : 'Yeni Malzeme';

  document.getElementById('mAd').value = kayit ? kayit.ad : '';
  document.getElementById('mKod').value = kayit ? kayit.kod : '';
  document.getElementById('mResmiAdi').value = kayit ? kayit.resmiAdi : '';
  document.getElementById('mKategori').value = kayit ? kayit.kategori : '';
  document.getElementById('mAltKategori').value = kayit ? kayit.altKategori : '';
  document.getElementById('mBirim').innerHTML = MALZEME_BIRIMLERI.map(b => `<option ${kayit && kayit.birim === b ? 'selected' : ''}>${b}</option>`).join('');
  document.getElementById('mVarsayilanMiktar').value = kayit && kayit.varsayilanMiktar != null ? kayit.varsayilanMiktar : '';
  document.getElementById('mStandartlar').value = kayit ? (kayit.standartlar || []).join('\n') : '';
  document.getElementById('mTeknikOzellikler').value = kayit ? (kayit.teknikOzellikler || []).join('\n') : '';
  document.getElementById('mMarkaAlternatifleri').value = kayit ? (kayit.markaAlternatifleri || []).join('\n') : '';
  document.getElementById('mAltKalemler').value = kayit ? (kayit.altKalemler || []).join('\n') : '';
  document.getElementById('mKullanimAmaci').value = kayit ? kayit.kullanimAmaci : '';
  document.getElementById('mRiskAciklamasi').value = kayit ? kayit.riskAciklamasi : '';
  document.getElementById('mAktifMi').checked = kayit ? kayit.aktifMi !== false : true;

  document.querySelectorAll('#malzemeForm .alan-hatasi').forEach(el => el.textContent = '');
  document.getElementById('malzemeModalKatman').classList.add('acik');
}

function malzemeModalKapat() {
  document.getElementById('malzemeModalKatman').classList.remove('acik');
  _duzenlenenMalzemeId = null;
}

function malzemeFormGonderildi(e) {
  e.preventDefault();
  document.querySelectorAll('#malzemeForm .alan-hatasi').forEach(el => el.textContent = '');

  const veriler = {
    ad: document.getElementById('mAd').value,
    kod: document.getElementById('mKod').value,
    resmiAdi: document.getElementById('mResmiAdi').value,
    kategori: document.getElementById('mKategori').value,
    altKategori: document.getElementById('mAltKategori').value,
    birim: document.getElementById('mBirim').value,
    varsayilanMiktar: document.getElementById('mVarsayilanMiktar').value,
    standartlar: document.getElementById('mStandartlar').value,
    teknikOzellikler: document.getElementById('mTeknikOzellikler').value,
    markaAlternatifleri: document.getElementById('mMarkaAlternatifleri').value,
    altKalemler: document.getElementById('mAltKalemler').value,
    kullanimAmaci: document.getElementById('mKullanimAmaci').value,
    riskAciklamasi: document.getElementById('mRiskAciklamasi').value,
    aktifMi: document.getElementById('mAktifMi').checked
  };

  const sonuc = _duzenlenenMalzemeId ? malzemeGuncelle(_duzenlenenMalzemeId, veriler) : malzemeEkle(veriler);
  if (!sonuc.basarili) {
    Object.keys(sonuc.hatalar || {}).forEach(alan => {
      const hataEl = document.getElementById('m' + alan.charAt(0).toUpperCase() + alan.slice(1) + 'Hata');
      if (hataEl) hataEl.textContent = sonuc.hatalar[alan];
    });
    return;
  }

  malzemeModalKapat();
  katalogListesiniCiz(document.getElementById('katalogAramaKutusu').value);
  malzemePickerCiz(document.getElementById('pickAramaKutusu').value);
}
