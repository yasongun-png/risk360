// Kimyasal Yönetimi ekranı DOM işlemleri.

let _duzenlenenKimyasalId = null;
let _kimyasalSdsGorseli = '';

function kimRozetSinifAdi(durum) {
  return slugOlustur(durum || '');
}

function kimyasalSayfasiniBaslat() {
  document.getElementById('depolamaGrubuFiltre').innerHTML += KIMYASAL_DEPOLAMA_GRUPLARI.map(g => `<option>${g}</option>`).join('');
  document.getElementById('riskSeviyesiFiltre').innerHTML += KIMYASAL_RISK_SEVIYELERI.map(r => `<option>${r}</option>`).join('');
  document.getElementById('ghsListesi').innerHTML = GHS_PIKTOGRAMLARI.map(g => `<option value="${g}">`).join('');

  document.getElementById('yeniKimyasalBtn').addEventListener('click', () => kimyasalModalAc());
  document.getElementById('modalKapatBtn').addEventListener('click', kimyasalModalKapat);
  document.getElementById('modalIptalBtn').addEventListener('click', kimyasalModalKapat);
  document.getElementById('kimyasalForm').addEventListener('submit', kimyasalFormGonderildi);
  document.getElementById('kimyasalAramaKutusu').addEventListener('input', e => kimyasallariCiz(e.target.value));
  document.getElementById('depolamaGrubuFiltre').addEventListener('change', () => kimyasallariCiz(document.getElementById('kimyasalAramaKutusu').value));
  document.getElementById('riskSeviyesiFiltre').addEventListener('change', () => kimyasallariCiz(document.getElementById('kimyasalAramaKutusu').value));
  document.getElementById('kritikFiltre').addEventListener('change', () => kimyasallariCiz(document.getElementById('kimyasalAramaKutusu').value));
  document.getElementById('formAyarlariBtn').addEventListener('click', () => formAyarlariModalAc('kimyasal', 'Kimyasal Yönetimi'));

  document.getElementById('nfpaTahminBtn').addEventListener('click', () => {
    const hKodlari = document.getElementById('hKodlari').value.split(/[;,]+/).map(s => s.trim()).filter(Boolean);
    const oneri = kimyasalNfpaTahminEt(hKodlari, document.getElementById('depolamaGrubu').value);
    document.getElementById('nfpaSaglik').value = oneri.saglik;
    document.getElementById('nfpaYanicilik').value = oneri.yanicilik;
    document.getElementById('nfpaKararsizlik').value = oneri.kararsizlik;
    document.getElementById('nfpaOzelKod').value = oneri.ozelKod.join('; ');
  });

  document.getElementById('sdsGorseliDosya').addEventListener('change', async e => {
    const dosya = e.target.files[0];
    e.target.value = '';
    if (!dosya) return;
    try {
      const sonuc = await fotoYukle(dosya, 'kimyasal/' + (_duzenlenenKimyasalId || 'gecici'));
      _kimyasalSdsGorseli = sonuc.url;
      _sdsGorseliOnizlemeCiz();
    } catch (hata) {
      alert(hata.message || 'Görsel yüklenemedi.');
    }
  });

  document.getElementById('sablonIndirBtn').addEventListener('click', () => excelSablonIndir(KIMYASAL_IMPORT_KOLONLARI, 'kimyasal_sablonu.xlsx'));
  document.getElementById('disaAktarBtn').addEventListener('click', () => {
    const liste = kimyasallariGetir('', {}).map(k => Object.assign({}, k, {
      ghsMetin: (k.ghsPiktogramlari || []).join('; '),
      hKodlariMetin: (k.hKodlari || []).join('; '),
      pKodlariMetin: (k.pKodlari || []).join('; ')
    }));
    excelDisaAktar(liste, KIMYASAL_EXPORT_KOLONLARI, 'kimyasal_envanteri.xlsx');
  });
  document.getElementById('listeYazdirBtn').addEventListener('click', () => {
    const filtreler = _kimyasalFiltreleriOku();
    raporListesiYazdir('Kimyasal Envanteri', '', KIMYASAL_EXPORT_KOLONLARI, kimyasallariGetir(document.getElementById('kimyasalAramaKutusu').value, filtreler).map(k => Object.assign({}, k, {
      ghsMetin: (k.ghsPiktogramlari || []).join('; '),
      hKodlariMetin: (k.hKodlari || []).join('; '),
      pKodlariMetin: (k.pKodlari || []).join('; ')
    })));
  });
  document.getElementById('iceAktarBtn').addEventListener('click', () => document.getElementById('iceAktarDosya').click());
  document.getElementById('iceAktarDosya').addEventListener('change', e => {
    const dosya = e.target.files[0];
    excelIceAktar(dosya, KIMYASAL_IMPORT_KOLONLARI, (satirlar, hataMesaji) => {
      e.target.value = '';
      if (hataMesaji) { alert(hataMesaji); return; }
      satirlar.forEach(s => { s.sdsRevizyonTarihi = excelTarihiNormallestir(s.sdsRevizyonTarihi); });
      const sonuc = excelToplulIceAktarSonucOzetle(satirlar, kimyasalEkle);
      alert(excelIceAktarOzetMesaji(sonuc));
      kimyasallariCiz(document.getElementById('kimyasalAramaKutusu').value);
    });
  });

  kimyasalOzetiVeUyarilariCiz();
  kimyasallariCiz('');
}

const KIMYASAL_IMPORT_KOLONLARI = [
  { anahtar: 'ad', baslik: 'Kimyasal Adı' },
  { anahtar: 'ticariAdi', baslik: 'Ticari Adı' },
  { anahtar: 'casNo', baslik: 'CAS No' },
  { anahtar: 'ecNo', baslik: 'EC No' },
  { anahtar: 'tedarikci', baslik: 'Tedarikçi' },
  { anahtar: 'bolum', baslik: 'Bölüm' },
  { anahtar: 'lokasyon', baslik: 'Lokasyon / Raf' },
  { anahtar: 'depolamaGrubu', baslik: 'Depolama Grubu' },
  { anahtar: 'fizikselHali', baslik: 'Fiziksel Hali' },
  { anahtar: 'miktar', baslik: 'Miktar' },
  { anahtar: 'birim', baslik: 'Birim' },
  { anahtar: 'ghsPiktogramlari', baslik: 'GHS Piktogramları' },
  { anahtar: 'hKodlari', baslik: 'H Kodları' },
  { anahtar: 'pKodlari', baslik: 'P Kodları' },
  { anahtar: 'riskSeviyesi', baslik: 'Risk Seviyesi' },
  { anahtar: 'sdsRevizyonTarihi', baslik: 'GBF/SDS Revizyon Tarihi' },
  { anahtar: 'sdsDosyaAdi', baslik: 'GBF/SDS Dosya Adı' }
];

const KIMYASAL_EXPORT_KOLONLARI = [
  { anahtar: 'kimyasalNo', baslik: 'Kimyasal No' },
  { anahtar: 'ad', baslik: 'Kimyasal Adı' },
  { anahtar: 'ticariAdi', baslik: 'Ticari Adı' },
  { anahtar: 'casNo', baslik: 'CAS No' },
  { anahtar: 'bolum', baslik: 'Bölüm' },
  { anahtar: 'lokasyon', baslik: 'Lokasyon / Raf' },
  { anahtar: 'depolamaGrubu', baslik: 'Depolama Grubu' },
  { anahtar: 'miktar', baslik: 'Miktar' },
  { anahtar: 'birim', baslik: 'Birim' },
  { anahtar: 'ghsMetin', baslik: 'GHS Piktogramları' },
  { anahtar: 'hKodlariMetin', baslik: 'H Kodları' },
  { anahtar: 'pKodlariMetin', baslik: 'P Kodları' },
  { anahtar: 'riskSeviyesi', baslik: 'Risk Seviyesi' },
  { anahtar: 'sdsRevizyonTarihi', baslik: 'GBF/SDS Revizyon Tarihi' },
  { anahtar: 'durum', baslik: 'Durum' }
];

function _kimyasalFiltreleriOku() {
  return {
    depolamaGrubu: document.getElementById('depolamaGrubuFiltre').value,
    riskSeviyesi: document.getElementById('riskSeviyesiFiltre').value,
    kritik: document.getElementById('kritikFiltre').value
  };
}

function kimyasalOzetiVeUyarilariCiz() {
  const ozet = kimyasalOzetiHesapla();
  const kart = (etiket, deger) => `<div class="istatistik-kutu"><span>${etiket}</span><b>${deger}</b></div>`;
  document.getElementById('kimyasalOzetKutusu').innerHTML = `
    <div class="istatistik-grid">
      ${kart('Toplam Kimyasal', ozet.toplam)}
      ${kart('Kritik', ozet.kritik)}
      ${kart('Yüksek/Kritik Risk', ozet.yuksekVeUstuRisk)}
      ${kart('GBF/SDS Eksik', ozet.sdsEksik)}
      ${kart('GBF/SDS Eski (5+ yıl)', ozet.sdsEski)}
      ${kart('Depolama Uyumsuzluğu', ozet.depolamaUyumsuzluklari.length)}
    </div>
  `;

  const uyariKutu = document.getElementById('kimyasalUyarilarKutusu');
  const uyarilar = ozet.depolamaUyumsuzluklari.slice(0, 5).map(u =>
    `<div>⚠️ <b>${u.lokasyon}</b>: ${u.a} (${u.aGrup}) ile ${u.b} (${u.bGrup}) birlikte depolanmamalı. <span class="genel-rozet rozet-${kimRozetSinifAdi(u.siddet)}">${u.siddet}</span></div>`
  );
  uyariKutu.innerHTML = uyarilar.length
    ? `<div class="kart" style="margin-bottom:14px; border-color:#fca5a5;">${uyarilar.join('')}</div>`
    : '';
}

function _sdsGorseliOnizlemeCiz() {
  const kutu = document.getElementById('sdsGorseliOnizleme');
  kutu.innerHTML = _kimyasalSdsGorseli
    ? `<div style="display:flex; align-items:center; gap:10px;">
         <img data-foto-ref="${_kimyasalSdsGorseli}" style="width:72px; height:72px; object-fit:cover; border-radius:8px; border:1px solid var(--kenarlik);">
         <div>
           <div style="font-size:12px; color:#16a34a; font-weight:600;">✓ Görsel eklendi</div>
           <button type="button" class="tablo-buton sil" style="margin-top:4px;">Görseli Kaldır</button>
         </div>
       </div>`
    : '<div style="font-size:12px; color:var(--metin-soluk);">Henüz görsel eklenmedi.</div>';
  if (_kimyasalSdsGorseli) {
    kutu.querySelector('button').addEventListener('click', () => { _kimyasalSdsGorseli = ''; _sdsGorseliOnizlemeCiz(); });
    fotoReferanslariCoz(kutu);
  }
}

function _kimGhsHucre(k) {
  const rozetler = (k.ghsPiktogramlari || []).map(g => `<span class="genel-rozet" style="background:#fee2e2; color:#b91c1c;">${g.split(' ')[0]}</span>`).join(' ');
  return `${rozetler}${k.hKodlari && k.hKodlari.length ? `<div style="font-size:10px; color:var(--metin-soluk); margin-top:3px;">${k.hKodlari.join(', ')}</div>` : ''}` || '-';
}

function kimyasallariCiz(aramaMetni) {
  const govde = document.getElementById('kimyasalTabloGovde');
  const bosDurum = document.getElementById('kimyasalBosDurum');
  const liste = kimyasallariGetir(aramaMetni, _kimyasalFiltreleriOku());

  govde.innerHTML = '';
  if (!liste.length) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = 'Eşleşen kimyasal kaydı bulunamadı.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  liste.forEach(k => {
    const satir = document.createElement('tr');
    const sdsGoruntu = k.sdsRevizyonTarihi
      ? `${gunAyYil(k.sdsRevizyonTarihi)}${k.sdsSuresiGecmisMi ? ' <span class="genel-rozet rozet-gecikmis">Eski</span>' : ''}`
      : '<span class="genel-rozet rozet-gecikmis">Eksik</span>';
    satir.innerHTML = `
      <td>${k.kimyasalNo}</td>
      <td>${k.ad}${k.kritikMi ? ' <span class="genel-rozet rozet-cok-yuksek">Kritik</span>' : ''}</td>
      <td>${[k.bolum, k.lokasyon].filter(Boolean).join(' / ') || '-'}</td>
      <td>${_kimGhsHucre(k)}</td>
      <td>${k.nfpaSaglik}-${k.nfpaYanicilik}-${k.nfpaKararsizlik}${k.nfpaOzelKod.length ? ' ' + k.nfpaOzelKod.join('/') : ''}</td>
      <td><span class="genel-rozet rozet-${kimRozetSinifAdi(k.riskSeviyesi)}">${k.riskSeviyesi}</span></td>
      <td>${sdsGoruntu}</td>
      <td><span class="genel-rozet rozet-${kimRozetSinifAdi(k.durum)}">${k.durum}</span></td>
      <td>
        <button class="tablo-buton" data-duzenle="${k.id}">Düzenle</button>
        <button class="tablo-buton" data-form="${k.id}">Form</button>
        <button class="tablo-buton sil" data-sil="${k.id}">Sil</button>
      </td>
    `;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-duzenle]').forEach(btn => btn.addEventListener('click', () => kimyasalModalAc(kimyasalIdIleGetirRepo(btn.getAttribute('data-duzenle')))));
  govde.querySelectorAll('[data-form]').forEach(btn => btn.addEventListener('click', async () => {
    try { await kimyasalFormunuPdfOlustur(btn.getAttribute('data-form')); } catch (hata) { console.error(hata); alert('PDF üretilemedi: ' + (hata.message || hata)); }
  }));
  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', () => {
    if (confirm('Bu kimyasal kaydını silmek istediğinize emin misiniz?')) { kimyasalSil(btn.getAttribute('data-sil')); kimyasallariCiz(document.getElementById('kimyasalAramaKutusu').value); kimyasalOzetiVeUyarilariCiz(); }
  }));
}

function kimyasalModalAc(kayit) {
  _duzenlenenKimyasalId = kayit ? kayit.id : null;
  document.getElementById('modalBaslik').textContent = kayit ? (kayit.kimyasalNo + ' Kaydını Düzenle') : 'Yeni Kimyasal Kaydı';

  document.getElementById('ad').value = kayit ? kayit.ad : '';
  document.getElementById('ticariAdi').value = kayit ? kayit.ticariAdi : '';
  document.getElementById('casNo').value = kayit ? kayit.casNo : '';
  document.getElementById('ecNo').value = kayit ? kayit.ecNo : '';
  document.getElementById('bolum').value = kayit ? kayit.bolum : '';
  document.getElementById('lokasyon').value = kayit ? kayit.lokasyon : '';
  document.getElementById('tedarikci').value = kayit ? kayit.tedarikci : '';
  document.getElementById('depolamaGrubu').innerHTML = KIMYASAL_DEPOLAMA_GRUPLARI.map(g => `<option ${kayit && kayit.depolamaGrubu === g ? 'selected' : ''}>${g}</option>`).join('');
  document.getElementById('fizikselHali').innerHTML = KIMYASAL_FIZIKSEL_HALLER.map(f => `<option ${kayit && kayit.fizikselHali === f ? 'selected' : ''}>${f}</option>`).join('');
  document.getElementById('miktar').value = kayit && kayit.miktar != null ? kayit.miktar : '';
  document.getElementById('birim').value = kayit ? kayit.birim : '';

  document.getElementById('ghsPiktogramlari').value = kayit ? (kayit.ghsPiktogramlari || []).join('; ') : '';
  document.getElementById('hKodlari').value = kayit ? (kayit.hKodlari || []).join('; ') : '';
  document.getElementById('pKodlari').value = kayit ? (kayit.pKodlari || []).join('; ') : '';
  document.getElementById('riskSeviyesi').innerHTML = '<option value="">Otomatik</option>' + KIMYASAL_RISK_SEVIYELERI.map(r => `<option ${kayit && kayit.riskSeviyesi === r ? 'selected' : ''}>${r}</option>`).join('');

  document.getElementById('nfpaSaglik').value = kayit ? kayit.nfpaSaglik : 0;
  document.getElementById('nfpaYanicilik').value = kayit ? kayit.nfpaYanicilik : 0;
  document.getElementById('nfpaKararsizlik').value = kayit ? kayit.nfpaKararsizlik : 0;
  document.getElementById('nfpaOzelKod').value = kayit ? (kayit.nfpaOzelKod || []).join('; ') : '';

  document.getElementById('sdsRevizyonTarihi').value = kayit ? kayit.sdsRevizyonTarihi : '';
  document.getElementById('sdsDosyaAdi').value = kayit ? kayit.sdsDosyaAdi : '';
  _kimyasalSdsGorseli = kayit ? (kayit.sdsGorseli || '') : '';
  _sdsGorseliOnizlemeCiz();

  document.getElementById('riskDegerlendirmeBaglantisi').value = kayit ? kayit.riskDegerlendirmeBaglantisi : '';
  document.getElementById('depolamaNotu').value = kayit ? kayit.depolamaNotu : '';
  document.getElementById('notlar').value = kayit ? kayit.notlar : '';
  document.getElementById('durum').innerHTML = KIMYASAL_DURUMLARI.map(d => `<option ${kayit && kayit.durum === d ? 'selected' : ''}>${d}</option>`).join('');

  document.querySelectorAll('#kimyasalForm .alan-hatasi').forEach(el => el.textContent = '');
  document.getElementById('modalKatman').classList.add('acik');
}

function kimyasalModalKapat() {
  document.getElementById('modalKatman').classList.remove('acik');
  _duzenlenenKimyasalId = null;
}

function kimyasalFormGonderildi(e) {
  e.preventDefault();
  document.querySelectorAll('#kimyasalForm .alan-hatasi').forEach(el => el.textContent = '');

  const veriler = {
    ad: document.getElementById('ad').value,
    ticariAdi: document.getElementById('ticariAdi').value,
    casNo: document.getElementById('casNo').value,
    ecNo: document.getElementById('ecNo').value,
    bolum: document.getElementById('bolum').value,
    lokasyon: document.getElementById('lokasyon').value,
    tedarikci: document.getElementById('tedarikci').value,
    depolamaGrubu: document.getElementById('depolamaGrubu').value,
    fizikselHali: document.getElementById('fizikselHali').value,
    miktar: document.getElementById('miktar').value,
    birim: document.getElementById('birim').value,
    ghsPiktogramlari: document.getElementById('ghsPiktogramlari').value,
    hKodlari: document.getElementById('hKodlari').value,
    pKodlari: document.getElementById('pKodlari').value,
    riskSeviyesi: document.getElementById('riskSeviyesi').value,
    nfpaSaglik: document.getElementById('nfpaSaglik').value,
    nfpaYanicilik: document.getElementById('nfpaYanicilik').value,
    nfpaKararsizlik: document.getElementById('nfpaKararsizlik').value,
    nfpaOzelKod: document.getElementById('nfpaOzelKod').value,
    sdsRevizyonTarihi: document.getElementById('sdsRevizyonTarihi').value,
    sdsDosyaAdi: document.getElementById('sdsDosyaAdi').value,
    sdsGorseli: _kimyasalSdsGorseli,
    riskDegerlendirmeBaglantisi: document.getElementById('riskDegerlendirmeBaglantisi').value,
    depolamaNotu: document.getElementById('depolamaNotu').value,
    notlar: document.getElementById('notlar').value,
    durum: document.getElementById('durum').value
  };

  const sonuc = _duzenlenenKimyasalId ? kimyasalGuncelle(_duzenlenenKimyasalId, veriler) : kimyasalEkle(veriler);
  if (!sonuc.basarili) {
    Object.keys(sonuc.hatalar || {}).forEach(alan => {
      const hataEl = document.getElementById(alan + 'Hata');
      if (hataEl) hataEl.textContent = sonuc.hatalar[alan];
    });
    return;
  }

  kimyasalModalKapat();
  kimyasallariCiz(document.getElementById('kimyasalAramaKutusu').value);
  kimyasalOzetiVeUyarilariCiz();
}
