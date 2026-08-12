// İş İzinleri ekranı DOM işlemleri.

let _izGorunum = 'izinler';
let _duzenlenenIzinId = null;
let _izKontrolMaddeleri = [];

function izRozetSinifAdi(durum) {
  return slugOlustur(durum || '');
}

function izinSayfasiniBaslat() {
  document.querySelectorAll('[data-sekme]').forEach(btn => {
    btn.addEventListener('click', () => izGorunumDegistir(btn.getAttribute('data-sekme')));
  });

  document.getElementById('turFiltre').innerHTML += IS_IZNI_TURLERI.map(t => `<option>${t}</option>`).join('');
  document.getElementById('durumFiltre').innerHTML += IS_IZNI_DURUMLARI.map(d => `<option>${d}</option>`).join('');

  document.getElementById('yeniIzinBtn').addEventListener('click', () => izinModalAc());
  document.getElementById('izinModalKapatBtn').addEventListener('click', izinModalKapat);
  document.getElementById('izinModalIptalBtn').addEventListener('click', izinModalKapat);
  document.getElementById('izinForm').addEventListener('submit', izinFormGonderildi);
  document.getElementById('izinAramaKutusu').addEventListener('input', e => izinleriCiz(e.target.value));
  document.getElementById('turFiltre').addEventListener('change', () => izinleriCiz(document.getElementById('izinAramaKutusu').value));
  document.getElementById('durumFiltre').addEventListener('change', () => izinleriCiz(document.getElementById('izinAramaKutusu').value));

  document.getElementById('izTuru').addEventListener('change', () => {
    const isaretliVarMi = _izKontrolMaddeleri.some(m => m.isaretli || m.not);
    if (isaretliVarMi && !confirm('İzin türünü değiştirmek kontrol listesindeki işaretleri sıfırlayacak. Devam edilsin mi?')) return;
    _izKontrolMaddeleri = izinKontrolListesiUret(document.getElementById('izTuru').value);
    kontrolListesiniCiz();
  });

  document.getElementById('disaAktarBtn').addEventListener('click', () => {
    const liste = izinleriGetir('', _izFiltreleriOku()).map(k => Object.assign({}, k, {
      baslangicGoruntu: _izTarihSaatGoruntu(k.baslangic), bitisGoruntu: _izTarihSaatGoruntu(k.bitis)
    }));
    excelDisaAktar(liste, IS_IZNI_EXPORT_KOLONLARI, 'is_izinleri.xlsx');
  });
  document.getElementById('formAyarlariBtn').addEventListener('click', () => formAyarlariModalAc('is-izni', 'İş İzinleri'));

  izOzetiCiz();
  izGorunumDegistir('izinler');
}

const IS_IZNI_EXPORT_KOLONLARI = [
  { anahtar: 'izinNo', baslik: 'İzin No' },
  { anahtar: 'izinTuru', baslik: 'İzin Türü' },
  { anahtar: 'isTanimi', baslik: 'İş Tanımı' },
  { anahtar: 'bolum', baslik: 'Bölüm' },
  { anahtar: 'lokasyon', baslik: 'Lokasyon' },
  { anahtar: 'baslangicGoruntu', baslik: 'Başlangıç' },
  { anahtar: 'bitisGoruntu', baslik: 'Bitiş' },
  { anahtar: 'riskSeviyesi', baslik: 'Risk Seviyesi' },
  { anahtar: 'durumGoruntu', baslik: 'Durum' },
  { anahtar: 'onayDurumu', baslik: 'Onay Durumu' }
];

function _izTarihSaatGoruntu(iso) {
  if (!iso) return '-';
  const [tarih, saat] = iso.split('T');
  return gunAyYil(tarih) + (saat ? ' ' + saat : '');
}

function _izFiltreleriOku() {
  return {
    izinTuru: document.getElementById('turFiltre').value,
    durum: document.getElementById('durumFiltre').value
  };
}

function izGorunumDegistir(gorunum) {
  _izGorunum = gorunum;
  ['izinler', 'ozet'].forEach(g => {
    document.querySelector(`[data-sekme="${g}"]`).classList.toggle('sekme-seciliDegil', g !== gorunum);
    document.getElementById('bolum-' + g).style.display = g === gorunum ? '' : 'none';
  });
  if (gorunum === 'izinler') izinleriCiz(document.getElementById('izinAramaKutusu').value);
  else izOzetiCiz();
}

function kontrolListesiniCiz() {
  const kutu = document.getElementById('kontrolListesi');
  kutu.innerHTML = _izKontrolMaddeleri.map((m, i) => `
    <div style="display:flex; align-items:center; gap:8px; padding:4px 0; border-bottom:1px solid var(--kenarlik);">
      <input type="checkbox" data-ki="${i}" style="width:auto; margin:0;" ${m.isaretli ? 'checked' : ''}>
      <span style="flex:1; font-size:13px;">${m.metin}</span>
      <input type="text" data-kn="${i}" placeholder="Not" value="${m.not || ''}" style="width:140px; margin:0; padding:4px 6px; font-size:12px;">
    </div>
  `).join('');
  kutu.querySelectorAll('[data-ki]').forEach(cb => cb.addEventListener('change', () => { _izKontrolMaddeleri[Number(cb.getAttribute('data-ki'))].isaretli = cb.checked; }));
  kutu.querySelectorAll('[data-kn]').forEach(inp => inp.addEventListener('input', () => { _izKontrolMaddeleri[Number(inp.getAttribute('data-kn'))].not = inp.value; }));
}

function izinleriCiz(aramaMetni) {
  const govde = document.getElementById('izinTabloGovde');
  const bosDurum = document.getElementById('izinBosDurum');
  const liste = izinleriGetir(aramaMetni, _izFiltreleriOku());

  govde.innerHTML = '';
  if (!liste.length) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = 'Eşleşen iş izni bulunamadı.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  liste.forEach(k => {
    const satir = document.createElement('tr');
    const islemler = [`<button class="tablo-buton" data-duzenle="${k.id}">Düzenle</button>`, `<button class="tablo-buton" data-form="${k.id}">Form</button>`];
    if (k.durumGoruntu === 'Onay Bekliyor') {
      islemler.push(`<button class="tablo-buton" data-onay="${k.id}">Onay Ver</button>`);
      islemler.push(`<button class="tablo-buton sil" data-red="${k.id}">Reddet</button>`);
    } else if (['Onaylandı', 'Gerekmiyor'].includes(k.onayDurumu) && k.durum !== 'Aktif' && !IS_IZNI_TERMINAL_DURUMLAR.includes(k.durum)) {
      islemler.push(`<button class="tablo-buton" data-aktif="${k.id}">Aktifleştir</button>`);
    } else if (k.durum === 'Aktif') {
      islemler.push(`<button class="tablo-buton" data-kapat="${k.id}">Kapat</button>`);
      islemler.push(`<button class="tablo-buton sil" data-durdur="${k.id}">Durdur</button>`);
    }
    islemler.push(`<button class="tablo-buton sil" data-sil="${k.id}">Sil</button>`);

    satir.innerHTML = `
      <td>${k.izinNo}</td>
      <td>${k.izinTuru}</td>
      <td>${k.isTanimi}</td>
      <td>${[k.bolum, k.lokasyon].filter(Boolean).join(' / ') || '-'}</td>
      <td>${_izTarihSaatGoruntu(k.baslangic)}</td>
      <td>${_izTarihSaatGoruntu(k.bitis)}</td>
      <td><span class="genel-rozet rozet-${izRozetSinifAdi(k.riskSeviyesi)}">${k.riskSeviyesi}</span></td>
      <td><span class="genel-rozet rozet-${izRozetSinifAdi(k.durumGoruntu)}">${k.durumGoruntu}</span> <span style="font-size:11px; color:var(--metin-soluk);">%${k.tamamlanmaOrani}</span></td>
      <td><span class="genel-rozet rozet-${izRozetSinifAdi(k.onayDurumu)}">${k.onayDurumu}</span></td>
      <td>${islemler.join(' ')}</td>
    `;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-duzenle]').forEach(btn => btn.addEventListener('click', () => izinModalAc(izinIdIleGetirRepo(btn.getAttribute('data-duzenle')))));
  govde.querySelectorAll('[data-form]').forEach(btn => btn.addEventListener('click', async () => {
    try { await izinFormunuPdfOlustur(btn.getAttribute('data-form')); } catch (hata) { console.error(hata); alert('PDF üretilemedi: ' + (hata.message || hata)); }
  }));
  govde.querySelectorAll('[data-onay]').forEach(btn => btn.addEventListener('click', () => {
    const ad = prompt('Onaylayan ad soyad:', '');
    if (ad === null || !ad.trim()) return;
    const rol = prompt('Onaylayanın rolü:', '') || '';
    izinOnayVer(btn.getAttribute('data-onay'), ad, rol);
    izinleriCiz(document.getElementById('izinAramaKutusu').value);
    izOzetiCiz();
  }));
  govde.querySelectorAll('[data-red]').forEach(btn => btn.addEventListener('click', () => {
    const ad = prompt('Reddeden ad soyad:', '');
    if (ad === null || !ad.trim()) return;
    const sebep = prompt('Red sebebi:', '') || '';
    izinReddet(btn.getAttribute('data-red'), ad, '', sebep);
    izinleriCiz(document.getElementById('izinAramaKutusu').value);
    izOzetiCiz();
  }));
  govde.querySelectorAll('[data-aktif]').forEach(btn => btn.addEventListener('click', () => {
    const sonuc = izinAktifEt(btn.getAttribute('data-aktif'));
    if (!sonuc.basarili) { alert(sonuc.hata); return; }
    izinleriCiz(document.getElementById('izinAramaKutusu').value);
  }));
  govde.querySelectorAll('[data-durdur]').forEach(btn => btn.addEventListener('click', () => {
    if (confirm('Bu izin durdurulsun mu?')) { izinDurdur(btn.getAttribute('data-durdur')); izinleriCiz(document.getElementById('izinAramaKutusu').value); }
  }));
  govde.querySelectorAll('[data-kapat]').forEach(btn => btn.addEventListener('click', () => {
    const not = prompt('Kapanış notu (opsiyonel):', 'İş güvenli şekilde tamamlandı.');
    if (not !== null) { izinKapat(btn.getAttribute('data-kapat'), not); izinleriCiz(document.getElementById('izinAramaKutusu').value); izOzetiCiz(); }
  }));
  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', () => {
    if (confirm('Bu iş izni kaydını silmek istediğinize emin misiniz?')) { izinSil(btn.getAttribute('data-sil')); izinleriCiz(document.getElementById('izinAramaKutusu').value); izOzetiCiz(); }
  }));
}

function izinModalAc(kayit) {
  _duzenlenenIzinId = kayit ? kayit.id : null;
  document.getElementById('izinModalBaslik').textContent = kayit ? (kayit.izinNo + ' İznini Düzenle') : 'Yeni İş İzni';

  document.getElementById('izTuru').innerHTML = IS_IZNI_TURLERI.map(t => `<option ${kayit && kayit.izinTuru === t ? 'selected' : ''}>${t}</option>`).join('');
  document.getElementById('izRiskSeviyesi').innerHTML = IS_IZNI_RISK_SEVIYELERI.map(r => `<option ${kayit && kayit.riskSeviyesi === r ? 'selected' : ''}>${r}</option>`).join('');
  document.getElementById('izIsTanimi').value = kayit ? kayit.isTanimi : '';
  document.getElementById('izAciklama').value = kayit ? kayit.aciklama : '';
  document.getElementById('izBolum').value = kayit ? kayit.bolum : '';
  document.getElementById('izLokasyon').value = kayit ? kayit.lokasyon : '';
  document.getElementById('izYuklenici').value = kayit ? kayit.yuklenici : '';
  document.getElementById('izTalepEden').value = kayit ? kayit.talepEden : '';
  document.getElementById('izSahaSorumlusu').value = kayit ? kayit.sahaSorumlusu : '';
  document.getElementById('izCalisanlar').value = kayit ? (kayit.calisanlar || []).join('; ') : '';
  document.getElementById('izGerekliKkd').value = kayit ? (kayit.gerekliKkd || []).join('; ') : '';
  document.getElementById('izBaslangic').value = kayit ? kayit.baslangic : _izVarsayilanBaslangic();
  document.getElementById('izBitis').value = kayit ? kayit.bitis : _izVarsayilanBitis();

  _izKontrolMaddeleri = kayit ? JSON.parse(JSON.stringify(kayit.kontrolMaddeleri)) : izinKontrolListesiUret(document.getElementById('izTuru').value);
  kontrolListesiniCiz();

  const gaz = kayit ? kayit.gazOlcumu : { oksijen: '', lel: '', toksik: '', olcumZamani: '', olcenKisi: '' };
  document.getElementById('izOksijen').value = gaz.oksijen;
  document.getElementById('izLel').value = gaz.lel;
  document.getElementById('izToksik').value = gaz.toksik;
  document.getElementById('izOlcumZamani').value = gaz.olcumZamani;
  document.getElementById('izOlcenKisi').value = gaz.olcenKisi;

  const izo = kayit ? kayit.izolasyon : { lotoGerekli: false, lotoUygulandi: false, enerjiIzolasyonu: '', korlemeListesi: '' };
  document.getElementById('izLotoGerekli').checked = !!izo.lotoGerekli;
  document.getElementById('izLotoUygulandi').checked = !!izo.lotoUygulandi;
  document.getElementById('izEnerjiIzolasyonu').value = izo.enerjiIzolasyonu;
  document.getElementById('izKorlemeListesi').value = izo.korlemeListesi;

  document.getElementById('izOnayDurumu').innerHTML = IS_IZNI_ONAY_DURUMLARI.map(o => `<option ${kayit && kayit.onayDurumu === o ? 'selected' : ''}>${o}</option>`).join('');
  document.getElementById('izDurum').innerHTML = IS_IZNI_DURUMLARI.map(d => `<option ${kayit && kayit.durum === d ? 'selected' : ''}>${d}</option>`).join('');
  document.getElementById('izNotlar').value = kayit ? kayit.notlar : '';

  document.querySelectorAll('#izinForm .alan-hatasi').forEach(el => el.textContent = '');
  document.getElementById('izinModalKatman').classList.add('acik');
}

function _izVarsayilanBaslangic() {
  const d = new Date();
  d.setHours(8, 0, 0, 0);
  return d.toISOString().slice(0, 16);
}

function _izVarsayilanBitis() {
  const d = new Date();
  d.setHours(16, 0, 0, 0);
  return d.toISOString().slice(0, 16);
}

function izinModalKapat() {
  document.getElementById('izinModalKatman').classList.remove('acik');
  _duzenlenenIzinId = null;
}

function izinFormGonderildi(e) {
  e.preventDefault();
  document.querySelectorAll('#izinForm .alan-hatasi').forEach(el => el.textContent = '');

  const veriler = {
    izinTuru: document.getElementById('izTuru').value,
    isTanimi: document.getElementById('izIsTanimi').value,
    aciklama: document.getElementById('izAciklama').value,
    bolum: document.getElementById('izBolum').value,
    lokasyon: document.getElementById('izLokasyon').value,
    yuklenici: document.getElementById('izYuklenici').value,
    talepEden: document.getElementById('izTalepEden').value,
    sahaSorumlusu: document.getElementById('izSahaSorumlusu').value,
    calisanlar: document.getElementById('izCalisanlar').value,
    gerekliKkd: document.getElementById('izGerekliKkd').value,
    riskSeviyesi: document.getElementById('izRiskSeviyesi').value,
    baslangic: document.getElementById('izBaslangic').value,
    bitis: document.getElementById('izBitis').value,
    kontrolMaddeleri: _izKontrolMaddeleri,
    gazOlcumu: {
      oksijen: document.getElementById('izOksijen').value,
      lel: document.getElementById('izLel').value,
      toksik: document.getElementById('izToksik').value,
      olcumZamani: document.getElementById('izOlcumZamani').value,
      olcenKisi: document.getElementById('izOlcenKisi').value
    },
    izolasyon: {
      lotoGerekli: document.getElementById('izLotoGerekli').checked,
      lotoUygulandi: document.getElementById('izLotoUygulandi').checked,
      enerjiIzolasyonu: document.getElementById('izEnerjiIzolasyonu').value,
      korlemeListesi: document.getElementById('izKorlemeListesi').value
    },
    onayDurumu: document.getElementById('izOnayDurumu').value,
    durum: document.getElementById('izDurum').value,
    notlar: document.getElementById('izNotlar').value
  };

  const sonuc = _duzenlenenIzinId ? izinGuncelle(_duzenlenenIzinId, veriler) : izinEkle(veriler);
  if (!sonuc.basarili) {
    Object.keys(sonuc.hatalar || {}).forEach(alan => {
      const hataEl = document.getElementById('iz' + alan.charAt(0).toUpperCase() + alan.slice(1) + 'Hata');
      if (hataEl) hataEl.textContent = sonuc.hatalar[alan];
    });
    return;
  }

  izinModalKapat();
  izinleriCiz(document.getElementById('izinAramaKutusu').value);
  izOzetiCiz();
}

function izOzetiCiz() {
  const ozet = izinOzetiHesapla();
  const kutu = document.getElementById('izinOzetKutusu');
  const kart = (etiket, deger) => `<div class="istatistik-kutu"><span>${etiket}</span><b>${deger}</b></div>`;
  const liste = (baslik, satirlar, bosMetin) => `
    <div class="kart" style="margin-bottom:14px;">
      <div class="card-title" style="margin-bottom:8px;"><h3 style="margin:0; font-size:14px;">${baslik}</h3></div>
      ${satirlar.length
        ? satirlar.map(s => `<div style="display:flex; justify-content:space-between; font-size:13px; padding:6px 0; border-bottom:1px solid var(--kenarlik);"><span>${s[0]}</span><strong>${s[1]}</strong></div>`).join('')
        : `<div class="bos-durum gorunur">${bosMetin}</div>`}
    </div>
  `;

  kutu.innerHTML = `
    <div class="istatistik-grid">
      ${kart('Açık İzinler', ozet.acik)}
      ${kart('Onay Bekleyen', ozet.onayBekleyen)}
      ${kart('Süresi Geçen', ozet.suresiGecen)}
      ${kart('Yüksek/Kritik Risk (Açık)', ozet.yuksekVeUstuRisk)}
    </div>
    <div class="modul-grid" style="grid-template-columns: repeat(auto-fill, minmax(280px,1fr));">
      <div>${liste('Kontrol Listesi Tamamlanma Düşük (%80 altı)', ozet.tamamlanmaUyarilari.map(k => [k.izinNo + ' - ' + k.isTanimi, '%' + k.tamamlanmaOrani]), 'Uyarı yok.')}</div>
      <div>${liste('4 Saat İçinde Bitecek Aktif İzinler', ozet.yakindaBitecekler.map(k => [k.izinNo + ' - ' + k.isTanimi, _izTarihSaatGoruntu(k.bitis)]), 'Yaklaşan bitiş yok.')}</div>
      <div>${liste('Kritik Riskli Açık İzinler', ozet.kritikAcikListesi.map(k => [k.izinNo + ' - ' + k.isTanimi, k.durumGoruntu]), 'Kritik açık izin yok.')}</div>
    </div>
  `;
}
