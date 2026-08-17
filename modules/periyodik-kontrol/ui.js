// Periyodik Kontrol ekranı DOM işlemleri (Ekipmanlar / Kontrol Kayıtları / Özet).

let _pkGorunum = 'ekipman';
let _duzenlenenEkipmanId = null;
let _duzenlenenKontrolId = null;
let _pkBelgeGorseli = '';

function pkRozetSinifAdi(durum) {
  return slugOlustur(durum || '');
}

function _pkKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function periyodikSayfasiniBaslat() {
  document.querySelectorAll('[data-sekme]').forEach(btn => {
    btn.addEventListener('click', () => pkGorunumDegistir(btn.getAttribute('data-sekme')));
  });

  _pkEkipmanBaslat();
  _pkKontrolBaslat();

  pkGorunumDegistir('ekipman');
}

function pkGorunumDegistir(gorunum) {
  _pkGorunum = gorunum;
  ['ekipman', 'kontrol', 'ozet'].forEach(g => {
    document.querySelector(`[data-sekme="${g}"]`).classList.toggle('sekme-seciliDegil', g !== gorunum);
    document.getElementById('bolum-' + g).style.display = g === gorunum ? '' : 'none';
  });

  if (gorunum === 'ekipman') ekipmanlariCiz(document.getElementById('ekipmanAramaKutusu').value);
  else if (gorunum === 'kontrol') kontrolleriCiz(document.getElementById('kontrolAramaKutusu').value);
  else pkOzetiCiz();
}

// ==================== EKİPMAN ====================

function _pkEkipmanBaslat() {
  document.getElementById('kategoriFiltre').innerHTML += PERIYODIK_KATEGORILERI.map(k => `<option>${k}</option>`).join('');

  document.getElementById('yeniEkipmanBtn').addEventListener('click', () => ekipmanModalAc());
  document.getElementById('ekipmanModalKapatBtn').addEventListener('click', ekipmanModalKapat);
  document.getElementById('ekipmanModalIptalBtn').addEventListener('click', ekipmanModalKapat);
  document.getElementById('ekipmanForm').addEventListener('submit', ekipmanFormGonderildi);
  document.getElementById('ekipmanAramaKutusu').addEventListener('input', e => ekipmanlariCiz(e.target.value));
  document.getElementById('kategoriFiltre').addEventListener('change', () => ekipmanlariCiz(document.getElementById('ekipmanAramaKutusu').value));
  document.getElementById('ekipmanDurumFiltre').addEventListener('change', () => ekipmanlariCiz(document.getElementById('ekipmanAramaKutusu').value));
  document.getElementById('formAyarlariBtn').addEventListener('click', () => formAyarlariModalAc('periyodik-kontrol', 'Periyodik Kontrol'));

  document.getElementById('ekKategori').addEventListener('change', () => {
    if (!document.getElementById('ekPeriyotAy').value) document.getElementById('ekPeriyotAy').value = PERIYODIK_VARSAYILAN_AY;
  });
  document.getElementById('ekSonKontrolTarihi').addEventListener('change', () => {
    const tarih = document.getElementById('ekSonKontrolTarihi').value;
    const periyot = document.getElementById('ekPeriyotAy').value;
    if (tarih && periyot) document.getElementById('ekSonrakiKontrolTarihi').value = periyodikTarihAyEkle(tarih, periyot);
  });

  document.getElementById('ekipmanSablonIndirBtn').addEventListener('click', () => excelSablonIndir(PERIYODIK_EKIPMAN_IMPORT_KOLONLARI, 'periyodik_ekipman_sablonu.xlsx'));
  document.getElementById('ekipmanDisaAktarBtn').addEventListener('click', () => {
    const liste = periyodikEkipmanlariGetir('', {}).map(e => Object.assign({}, e, {
      sonKontrolGoruntu: gunAyYil(e.sonKontrolTarihi), sonrakiKontrolGoruntu: gunAyYil(e.sonrakiKontrolTarihi)
    }));
    excelDisaAktar(liste, PERIYODIK_EKIPMAN_EXPORT_KOLONLARI, 'periyodik_ekipmanlar.xlsx');
  });
  document.getElementById('ekipmanIceAktarBtn').addEventListener('click', () => document.getElementById('ekipmanIceAktarDosya').click());
  document.getElementById('ekipmanIceAktarDosya').addEventListener('change', e => {
    const dosya = e.target.files[0];
    excelIceAktar(dosya, PERIYODIK_EKIPMAN_IMPORT_KOLONLARI, (satirlar, hataMesaji) => {
      e.target.value = '';
      if (hataMesaji) { alert(hataMesaji); return; }
      satirlar.forEach(s => { s.sonKontrolTarihi = excelTarihiNormallestir(s.sonKontrolTarihi); });
      const sonuc = excelToplulIceAktarSonucOzetle(satirlar, periyodikEkipmanEkle);
      alert(excelIceAktarOzetMesaji(sonuc));
      ekipmanlariCiz(document.getElementById('ekipmanAramaKutusu').value);
    });
  });
}

const PERIYODIK_EKIPMAN_IMPORT_KOLONLARI = [
  { anahtar: 'ad', baslik: 'Ekipman Adı' },
  { anahtar: 'demirbasNo', baslik: 'Demirbaş No' },
  { anahtar: 'kategori', baslik: 'Kategori' },
  { anahtar: 'marka', baslik: 'Marka' },
  { anahtar: 'model', baslik: 'Model' },
  { anahtar: 'bolum', baslik: 'Bölüm' },
  { anahtar: 'lokasyon', baslik: 'Lokasyon' },
  { anahtar: 'periyotAy', baslik: 'Periyot (Ay)' },
  { anahtar: 'sonKontrolTarihi', baslik: 'Son Kontrol Tarihi' }
];

const PERIYODIK_EKIPMAN_EXPORT_KOLONLARI = [
  { anahtar: 'ekipmanNo', baslik: 'Ekipman No' },
  { anahtar: 'ad', baslik: 'Ekipman Adı' },
  { anahtar: 'demirbasNo', baslik: 'Demirbaş No' },
  { anahtar: 'kategori', baslik: 'Kategori' },
  { anahtar: 'bolum', baslik: 'Bölüm' },
  { anahtar: 'lokasyon', baslik: 'Lokasyon' },
  { anahtar: 'periyotAy', baslik: 'Periyot (Ay)' },
  { anahtar: 'sonKontrolGoruntu', baslik: 'Son Kontrol Tarihi' },
  { anahtar: 'sonrakiKontrolGoruntu', baslik: 'Sonraki Kontrol Tarihi' },
  { anahtar: 'durumGoruntu', baslik: 'Durum' }
];

function _pkEkipmanFiltreleriOku() {
  return {
    kategori: document.getElementById('kategoriFiltre').value,
    durum: document.getElementById('ekipmanDurumFiltre').value
  };
}

function ekipmanlariCiz(aramaMetni) {
  const govde = document.getElementById('ekipmanTabloGovde');
  const bosDurum = document.getElementById('ekipmanBosDurum');
  const liste = periyodikEkipmanlariGetir(aramaMetni, _pkEkipmanFiltreleriOku());

  govde.innerHTML = '';
  if (!liste.length) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = 'Eşleşen ekipman bulunamadı.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  liste.forEach(e => {
    const satir = document.createElement('tr');
    satir.innerHTML = `
      <td>${e.ekipmanNo}</td>
      <td>${_pkKacir(e.ad)}</td>
      <td>${_pkKacir(e.kategori)}</td>
      <td>${_pkKacir([e.bolum, e.lokasyon].filter(Boolean).join(' / ')) || '-'}</td>
      <td>${e.periyotAy} ay</td>
      <td>${gunAyYil(e.sonKontrolTarihi) || '-'}</td>
      <td>${gunAyYil(e.sonrakiKontrolTarihi) || '-'}</td>
      <td><span class="genel-rozet rozet-${pkRozetSinifAdi(e.durumGoruntu)}">${_pkKacir(e.durumGoruntu)}</span></td>
      <td>
        <button class="tablo-buton" data-kontrol-ekle="${e.id}">Kontrol Ekle</button>
        <button class="tablo-buton" data-gecmis="${e.id}">Geçmiş</button>
        <button class="tablo-buton" data-duzenle="${e.id}">Düzenle</button>
        <button class="tablo-buton sil" data-sil="${e.id}">Sil</button>
      </td>
    `;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-duzenle]').forEach(btn => btn.addEventListener('click', () => ekipmanModalAc(periyodikEkipmanIdIleGetirRepo(btn.getAttribute('data-duzenle')))));
  govde.querySelectorAll('[data-kontrol-ekle]').forEach(btn => btn.addEventListener('click', () => kontrolModalAc(null, btn.getAttribute('data-kontrol-ekle'))));
  govde.querySelectorAll('[data-gecmis]').forEach(btn => btn.addEventListener('click', async () => {
    try { await periyodikEkipmanGecmisiniYazdir(btn.getAttribute('data-gecmis')); } catch (hata) { console.error(hata); alert('Yazdırılamadı: ' + (hata.message || hata)); }
  }));
  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', async () => {
    if (await onayModali('Bu ekipmanı ve tüm kontrol geçmişini silmek istediğinize emin misiniz?', 'Sil')) { periyodikEkipmanSil(btn.getAttribute('data-sil')); ekipmanlariCiz(document.getElementById('ekipmanAramaKutusu').value); }
  }));
}

function ekipmanModalAc(kayit) {
  _duzenlenenEkipmanId = kayit ? kayit.id : null;
  document.getElementById('ekipmanModalBaslik').textContent = kayit ? (kayit.ekipmanNo + ' Kaydını Düzenle') : 'Yeni Ekipman';

  document.getElementById('ekAd').value = kayit ? kayit.ad : '';
  document.getElementById('ekDemirbasNo').value = kayit ? kayit.demirbasNo : '';
  document.getElementById('ekKategori').innerHTML = PERIYODIK_KATEGORILERI.map(k => `<option ${kayit && kayit.kategori === k ? 'selected' : ''}>${k}</option>`).join('');
  document.getElementById('ekRiskSeviyesi').innerHTML = PERIYODIK_RISK_SEVIYELERI.map(r => `<option ${kayit && kayit.riskSeviyesi === r ? 'selected' : ''}>${r}</option>`).join('');
  document.getElementById('ekMarka').value = kayit ? kayit.marka : '';
  document.getElementById('ekModel').value = kayit ? kayit.model : '';
  document.getElementById('ekSeriNo').value = kayit ? kayit.seriNo : '';
  document.getElementById('ekImalYili').value = kayit ? kayit.imalYili : '';
  document.getElementById('ekBolum').value = kayit ? kayit.bolum : '';
  document.getElementById('ekLokasyon').value = kayit ? kayit.lokasyon : '';
  document.getElementById('ekSorumluPersonel').value = kayit ? kayit.sorumluPersonel : '';
  document.getElementById('ekPeriyotAy').value = kayit ? kayit.periyotAy : PERIYODIK_VARSAYILAN_AY;
  document.getElementById('ekDurum').innerHTML = PERIYODIK_EKIPMAN_DURUMLARI.map(d => `<option ${kayit && kayit.durum === d ? 'selected' : ''}>${d}</option>`).join('');
  document.getElementById('ekSonKontrolTarihi').value = kayit ? kayit.sonKontrolTarihi : '';
  document.getElementById('ekSonrakiKontrolTarihi').value = kayit ? kayit.sonrakiKontrolTarihi : '';
  document.getElementById('ekNotlar').value = kayit ? kayit.notlar : '';

  document.querySelectorAll('#ekipmanForm .alan-hatasi').forEach(el => el.textContent = '');
  document.getElementById('ekipmanModalKatman').classList.add('acik');
}

function ekipmanModalKapat() {
  document.getElementById('ekipmanModalKatman').classList.remove('acik');
  _duzenlenenEkipmanId = null;
}

function ekipmanFormGonderildi(e) {
  e.preventDefault();
  document.querySelectorAll('#ekipmanForm .alan-hatasi').forEach(el => el.textContent = '');

  const veriler = {
    ad: document.getElementById('ekAd').value,
    demirbasNo: document.getElementById('ekDemirbasNo').value,
    kategori: document.getElementById('ekKategori').value,
    riskSeviyesi: document.getElementById('ekRiskSeviyesi').value,
    marka: document.getElementById('ekMarka').value,
    model: document.getElementById('ekModel').value,
    seriNo: document.getElementById('ekSeriNo').value,
    imalYili: document.getElementById('ekImalYili').value,
    bolum: document.getElementById('ekBolum').value,
    lokasyon: document.getElementById('ekLokasyon').value,
    sorumluPersonel: document.getElementById('ekSorumluPersonel').value,
    periyotAy: document.getElementById('ekPeriyotAy').value,
    durum: document.getElementById('ekDurum').value,
    sonKontrolTarihi: document.getElementById('ekSonKontrolTarihi').value,
    sonrakiKontrolTarihi: document.getElementById('ekSonrakiKontrolTarihi').value,
    notlar: document.getElementById('ekNotlar').value
  };

  const sonuc = _duzenlenenEkipmanId ? periyodikEkipmanGuncelle(_duzenlenenEkipmanId, veriler) : periyodikEkipmanEkle(veriler);
  if (!sonuc.basarili) {
    Object.keys(sonuc.hatalar || {}).forEach(alan => {
      const hataEl = document.getElementById('ek' + alan.charAt(0).toUpperCase() + alan.slice(1) + 'Hata');
      if (hataEl) hataEl.textContent = sonuc.hatalar[alan];
    });
    return;
  }

  ekipmanModalKapat();
  ekipmanlariCiz(document.getElementById('ekipmanAramaKutusu').value);
}

// ==================== KONTROL KAYITLARI ====================

function _pkKontrolBaslat() {
  document.getElementById('sonucFiltre').innerHTML += PERIYODIK_SONUCLAR.map(s => `<option>${s}</option>`).join('');

  document.getElementById('yeniKontrolBtn').addEventListener('click', () => kontrolModalAc());
  document.getElementById('kontrolModalKapatBtn').addEventListener('click', kontrolModalKapat);
  document.getElementById('kontrolModalIptalBtn').addEventListener('click', kontrolModalKapat);
  document.getElementById('kontrolForm').addEventListener('submit', kontrolFormGonderildi);
  document.getElementById('kontrolAramaKutusu').addEventListener('input', e => kontrolleriCiz(e.target.value));
  document.getElementById('sonucFiltre').addEventListener('change', () => kontrolleriCiz(document.getElementById('kontrolAramaKutusu').value));

  document.getElementById('koBelgeDosya').addEventListener('change', async e => {
    const dosya = e.target.files[0];
    e.target.value = '';
    if (!dosya) return;
    try {
      const sonuc = await fotoYukle(dosya, 'periyodik-kontrol/' + (_duzenlenenKontrolId || 'gecici'));
      _pkBelgeGorseli = sonuc.url;
      _pkBelgeOnizlemeCiz();
    } catch (hata) {
      alert(hata.message || 'Görsel yüklenemedi.');
    }
  });

  document.getElementById('kontrolDisaAktarBtn').addEventListener('click', () => {
    const liste = periyodikKontrolleriGetir('', {}).map(k => Object.assign({}, k, { kontrolTarihiGoruntu: gunAyYil(k.kontrolTarihi) }));
    excelDisaAktar(liste, PERIYODIK_KONTROL_EXPORT_KOLONLARI, 'periyodik_kontrol_kayitlari.xlsx');
  });
}

const PERIYODIK_KONTROL_EXPORT_KOLONLARI = [
  { anahtar: 'ekipmanNo', baslik: 'Ekipman No' },
  { anahtar: 'ekipmanAdi', baslik: 'Ekipman' },
  { anahtar: 'kontrolTarihiGoruntu', baslik: 'Kontrol Tarihi' },
  { anahtar: 'kontrolTuru', baslik: 'Kontrol Türü' },
  { anahtar: 'raporNo', baslik: 'Rapor No' },
  { anahtar: 'firma', baslik: 'Kontrol Firması' },
  { anahtar: 'uzman', baslik: 'Kontrol Uzmanı' },
  { anahtar: 'sonuc', baslik: 'Sonuç' },
  { anahtar: 'aciklama', baslik: 'Açıklama' }
];

function _pkBelgeOnizlemeCiz() {
  const kutu = document.getElementById('koBelgeOnizleme');
  kutu.innerHTML = _pkBelgeGorseli
    ? `<div style="display:flex; align-items:center; gap:10px;">
         <img data-foto-ref="${_pkBelgeGorseli}" style="width:72px; height:72px; object-fit:cover; border-radius:8px; border:1px solid var(--kenarlik);">
         <div>
           <div style="font-size:12px; color:#16a34a; font-weight:600;">✓ Görsel eklendi</div>
           <button type="button" class="tablo-buton sil" style="margin-top:4px;">Görseli Kaldır</button>
         </div>
       </div>`
    : '<div style="font-size:12px; color:var(--metin-soluk);">Henüz görsel eklenmedi.</div>';
  if (_pkBelgeGorseli) {
    kutu.querySelector('button').addEventListener('click', () => { _pkBelgeGorseli = ''; _pkBelgeOnizlemeCiz(); });
    fotoReferanslariCoz(kutu);
  }
}

function kontrolleriCiz(aramaMetni) {
  const govde = document.getElementById('kontrolTabloGovde');
  const bosDurum = document.getElementById('kontrolBosDurum');
  const liste = periyodikKontrolleriGetir(aramaMetni, { sonuc: document.getElementById('sonucFiltre').value });

  govde.innerHTML = '';
  if (!liste.length) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = 'Eşleşen kontrol kaydı bulunamadı.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  liste.forEach(k => {
    const satir = document.createElement('tr');
    satir.innerHTML = `
      <td>${_pkKacir(k.ekipmanAdi)} <span style="color:var(--metin-soluk); font-size:11px;">(${k.ekipmanNo})</span></td>
      <td>${gunAyYil(k.kontrolTarihi)}</td>
      <td>${_pkKacir(k.kontrolTuru)}</td>
      <td>${_pkKacir(k.raporNo) || '-'}</td>
      <td>${_pkKacir(k.firma)}</td>
      <td>${_pkKacir(k.uzman) || '-'}</td>
      <td><span class="genel-rozet rozet-${pkRozetSinifAdi(k.sonuc)}">${_pkKacir(k.sonuc)}</span></td>
      <td>
        <button class="tablo-buton" data-duzenle="${k.id}">Düzenle</button>
        <button class="tablo-buton sil" data-sil="${k.id}">Sil</button>
      </td>
    `;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-duzenle]').forEach(btn => btn.addEventListener('click', () => kontrolModalAc(periyodikKontrolIdIleGetirRepo(btn.getAttribute('data-duzenle')))));
  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', async () => {
    if (await onayModali('Bu kontrol kaydını silmek istediğinize emin misiniz?', 'Sil')) { periyodikKontrolSil(btn.getAttribute('data-sil')); kontrolleriCiz(document.getElementById('kontrolAramaKutusu').value); ekipmanlariCiz(document.getElementById('ekipmanAramaKutusu').value); }
  }));
}

function kontrolModalAc(kayit, onSecilenEkipmanId) {
  _duzenlenenKontrolId = kayit ? kayit.id : null;
  document.getElementById('kontrolModalBaslik').textContent = kayit ? 'Kontrol Kaydını Düzenle' : 'Yeni Kontrol Kaydı';

  const ekipmanlar = periyodikEkipmanTumunuGetir();
  const seciliId = kayit ? kayit.ekipmanId : (onSecilenEkipmanId || '');
  document.getElementById('koEkipmanId').innerHTML = '<option value="">Seçiniz</option>' +
    ekipmanlar.map(e => `<option value="${e.id}" ${seciliId === e.id ? 'selected' : ''}>${e.ekipmanNo} - ${_pkKacir(e.ad)}</option>`).join('');

  document.getElementById('koKontrolTarihi').value = kayit ? kayit.kontrolTarihi : bugunIso();
  document.getElementById('koKontrolTuru').innerHTML = PERIYODIK_KONTROL_TURLERI.map(t => `<option ${kayit && kayit.kontrolTuru === t ? 'selected' : ''}>${t}</option>`).join('');
  document.getElementById('koRaporNo').value = kayit ? kayit.raporNo : '';
  document.getElementById('koSonuc').innerHTML = PERIYODIK_SONUCLAR.map(s => `<option ${kayit && kayit.sonuc === s ? 'selected' : ''}>${s}</option>`).join('');
  document.getElementById('koFirma').value = kayit ? kayit.firma : '';
  document.getElementById('koUzman').value = kayit ? kayit.uzman : '';
  document.getElementById('koAciklama').value = kayit ? kayit.aciklama : '';
  _pkBelgeGorseli = kayit ? (kayit.belgeGorseli || '') : '';
  _pkBelgeOnizlemeCiz();

  document.querySelectorAll('#kontrolForm .alan-hatasi').forEach(el => el.textContent = '');
  document.getElementById('kontrolModalKatman').classList.add('acik');
}

function kontrolModalKapat() {
  document.getElementById('kontrolModalKatman').classList.remove('acik');
  _duzenlenenKontrolId = null;
}

function kontrolFormGonderildi(e) {
  e.preventDefault();
  document.querySelectorAll('#kontrolForm .alan-hatasi').forEach(el => el.textContent = '');

  const veriler = {
    ekipmanId: document.getElementById('koEkipmanId').value,
    kontrolTarihi: document.getElementById('koKontrolTarihi').value,
    kontrolTuru: document.getElementById('koKontrolTuru').value,
    raporNo: document.getElementById('koRaporNo').value,
    sonuc: document.getElementById('koSonuc').value,
    firma: document.getElementById('koFirma').value,
    uzman: document.getElementById('koUzman').value,
    aciklama: document.getElementById('koAciklama').value,
    belgeGorseli: _pkBelgeGorseli
  };

  const sonuc = _duzenlenenKontrolId ? periyodikKontrolGuncelle(_duzenlenenKontrolId, veriler) : periyodikKontrolEkle(veriler);
  if (!sonuc.basarili) {
    Object.keys(sonuc.hatalar || {}).forEach(alan => {
      const hataEl = document.getElementById('ko' + alan.charAt(0).toUpperCase() + alan.slice(1) + 'Hata');
      if (hataEl) hataEl.textContent = sonuc.hatalar[alan];
    });
    return;
  }

  kontrolModalKapat();
  kontrolleriCiz(document.getElementById('kontrolAramaKutusu').value);
  ekipmanlariCiz(document.getElementById('ekipmanAramaKutusu').value);
}

// ==================== ÖZET ====================

function pkOzetiCiz() {
  const ozet = periyodikOzetiHesapla();
  const kutu = document.getElementById('periyodikOzetKutusu');
  const kart = (etiket, deger) => `<div class="istatistik-kutu"><span>${etiket}</span><b>${deger}</b></div>`;
  const liste = (baslik, satirlar, bosMetin) => `
    <div class="kart" style="margin-bottom:14px;">
      <div class="card-title" style="margin-bottom:8px;"><h3 style="margin:0; font-size:14px;">${baslik}</h3></div>
      ${satirlar.length
        ? satirlar.map(([k, v]) => `<div style="display:flex; justify-content:space-between; font-size:13px; padding:6px 0; border-bottom:1px solid var(--kenarlik);"><span>${_pkKacir(k)}</span><strong>${v}</strong></div>`).join('')
        : `<div class="bos-durum gorunur">${bosMetin}</div>`}
    </div>
  `;

  kutu.innerHTML = `
    <div class="istatistik-grid">
      ${kart('Toplam Ekipman', ozet.toplam)}
      ${kart('Süresi Geçen', ozet.suresiGecen)}
      ${kart('Yaklaşan (30 gün)', ozet.yaklasiyor)}
      ${kart('Uygun Değil', ozet.uygunDegil)}
    </div>

    <div class="modul-grid" style="grid-template-columns: repeat(auto-fill, minmax(280px,1fr));">
      <div>${liste('Süresi Geçen Ekipmanlar', ozet.suresiGecenListesi.map(e => [e.ad, gunAyYil(e.sonrakiKontrolTarihi)]), 'Süresi geçen ekipman yok.')}</div>
      <div>${liste('Sonucu "Uygun Değil" Olanlar', ozet.uygunDegilListesi.map(e => [e.ad, e.ekipmanNo]), 'Uygun değil işaretli ekipman yok.')}</div>
      <div>${liste('Kategoriye Göre', ozet.kategoriyeGore, 'Veri yok.')}</div>
      <div>${liste('Bölüme Göre', ozet.bolumeGore, 'Veri yok.')}</div>
    </div>
  `;
}
