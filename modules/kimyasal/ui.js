// Kimyasal Yönetimi ekranı DOM işlemleri.

let _duzenlenenKimyasalId = null;
let _kimyasalSdsGorseli = '';
let _kimGorunum = 'liste';

function kimRozetSinifAdi(durum) {
  return slugOlustur(durum || '');
}

function kimyasalGorunumDegistir(gorunum) {
  _kimGorunum = gorunum;
  ['liste', 'matris'].forEach(g => {
    document.querySelector(`[data-sekme="${g}"]`).classList.toggle('sekme-seciliDegil', g !== gorunum);
    document.getElementById('bolum-' + g).style.display = g === gorunum ? '' : 'none';
  });

  if (gorunum === 'liste') kimyasallariCiz(document.getElementById('kimyasalAramaKutusu').value);
  else _kimDepolamaMatrisiniEkranaCiz();
}

function kimyasalSayfasiniBaslat() {
  document.querySelectorAll('[data-sekme]').forEach(btn => {
    btn.addEventListener('click', () => kimyasalGorunumDegistir(btn.getAttribute('data-sekme')));
  });

  // Katlanabilir form bölümleri (bkz. modules/acil-durum/ui.js ile aynı genel
  // desen) -- form kısa kalsın diye ikincil alanlar varsayılan kapalı.
  document.querySelectorAll('.form-bolum-baslik.katlanir').forEach(baslik => {
    baslik.addEventListener('click', () => {
      baslik.classList.toggle('kapali');
      const icerik = baslik.nextElementSibling;
      if (icerik && icerik.classList.contains('form-bolum-icerik')) icerik.classList.toggle('kapali');
    });
  });

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
  document.getElementById('formAyarlariBtn').addEventListener('click', () => formAyarlariModalAc('kimyasal', 'Kimyasal'));

  document.getElementById('nfpaTahminBtn').addEventListener('click', () => {
    const hKodlari = document.getElementById('hKodlari').value.split(/[;,]+/).map(s => s.trim()).filter(Boolean);
    const oneri = kimyasalNfpaTahminEt(hKodlari, document.getElementById('depolamaGrubu').value);
    document.getElementById('nfpaSaglik').value = oneri.saglik;
    document.getElementById('nfpaYanicilik').value = oneri.yanicilik;
    document.getElementById('nfpaKararsizlik').value = oneri.kararsizlik;
    document.getElementById('nfpaOzelKod').value = oneri.ozelKod.join('; ');
  });

  document.getElementById('depolamaGrubuTahminBtn').addEventListener('click', () => {
    const hKodlari = document.getElementById('hKodlari').value.split(/[;,]+/).map(s => s.trim()).filter(Boolean);
    const oneri = kimyasalDepolamaGrubuTahminEt(document.getElementById('ad').value, hKodlari);
    if (!oneri) { alert('Kimyasal adından bir depolama grubu önerisi çıkarılamadı, lütfen elle seçin.'); return; }
    const secim = document.getElementById('depolamaGrubu');
    Array.from(secim.options).forEach(o => { o.selected = (o.value === oneri); });
  });

  document.getElementById('ozellikTahminBtn').addEventListener('click', () => {
    const hKodlari = document.getElementById('hKodlari').value.split(/[;,]+/).map(s => s.trim()).filter(Boolean);
    const ghs = document.getElementById('ghsPiktogramlari').value.split(/[;,]+/).map(s => s.trim()).filter(Boolean);
    const oneri = kimyasalOzellikleriTahminEt(document.getElementById('ad').value, hKodlari, ghs);
    if (!oneri.length) { alert('Kimyasal adından veya H kodlarından özellik önerisi çıkarılamadı, lütfen elle işaretleyin.'); return; }
    const secili = Array.from(document.querySelectorAll('#kimyasalOzellikleri input:checked')).map(c => c.value);
    _kimOzellikKutulariniCiz(Array.from(new Set(secili.concat(oneri))));
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

  document.getElementById('sdsPdfDosya').addEventListener('change', async e => {
    const dosya = e.target.files[0];
    const sonucKutu = document.getElementById('sdsPdfSonucu');
    if (!dosya) return;
    sonucKutu.textContent = 'PDF okunuyor...';
    try {
      const metin = await sdsPdfMetniniOku(dosya);
      const veri = sdsMetnindenVeriCikar(metin);
      const dolanAlanlar = _kimSdsVerisiniFormaYaz(veri, dosya.name);
      sonucKutu.innerHTML = dolanAlanlar.length
        ? `✓ Şu alanlar dolduruldu: ${dolanAlanlar.join(', ')}. Kaydetmeden önce kontrol edin (özellikle H/P kodları ve firma isimlerindeki Türkçe karakterler bazı SDS'lerde bozuk çıkabilir).`
        : 'Bu PDF metninden alan çıkarılamadı (taranmış görsel PDF olabilir). Alanları elle doldurun.';
    } catch (hata) {
      console.error(hata);
      sonucKutu.textContent = 'PDF okunamadı: ' + (hata.message || hata);
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
  document.getElementById('matrisKuralSifirlaBtn').addEventListener('click', () => {
    if (!confirm('Tüm uyumluluk kuralları ve kimyasal çiftleri için yaptığınız değişiklikler silinip levhadaki varsayılanlara dönülecek. Emin misiniz?')) return;
    kimyasalMatrisKurallariniSifirla();
    _kimDepolamaMatrisiniEkranaCiz();
  });
  document.getElementById('matrisYazdirBtn').addEventListener('click', () => {
    const kayitlar = _kimDepolamaMatrisiKayitlariGetir();
    if (kayitlar.length < 2) { alert('Matris oluşturmak için en az 2 aktif kimyasal kaydı gerekli.'); return; }
    _raporYazdirmaAlaniniGoster(_kimDepolamaMatrisiHtml(kayitlar));
  });
  document.getElementById('matrisWordBtn').addEventListener('click', () => {
    const kayitlar = _kimDepolamaMatrisiKayitlariGetir();
    if (kayitlar.length < 2) { alert('Matris oluşturmak için en az 2 aktif kimyasal kaydı gerekli.'); return; }
    _kimDepolamaMatrisiWordOlustur(kayitlar).catch(e => alert('Word oluşturulamadı: ' + e.message));
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
  kimyasalGorunumDegistir('liste');
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

// data-katlanir="X" olan katlanır bölümü açar (ör. SDS'ten alan dolan ama
// varsayılan kapalı bir bölümdeki değeri kullanıcı görebilsin diye).
function _kimBolumAc(anahtar) {
  const baslik = document.querySelector(`.form-bolum-baslik[data-katlanir="${anahtar}"]`);
  if (!baslik) return;
  baslik.classList.remove('kapali');
  const icerik = baslik.nextElementSibling;
  if (icerik && icerik.classList.contains('form-bolum-icerik')) icerik.classList.remove('kapali');
}

// sdsMetnindenVeriCikar() sonucunu forma yazar; sadece PDF'ten değer
// çıkarılabilen alanlar doldurulur (boş dönenler formdaki mevcut değere
// dokunmaz). Doldurulan alanların Türkçe etiket listesini döner ve, alan
// varsayılan kapalı bir bölümdeyse, kullanıcı görebilsin diye o bölümü açar.
function _kimSdsVerisiniFormaYaz(veri, dosyaAdi) {
  const dolanlar = [];
  const yaz = (id, deger, etiket, bolum) => {
    if (!deger) return;
    document.getElementById(id).value = deger;
    dolanlar.push(etiket);
    if (bolum) _kimBolumAc(bolum);
  };
  yaz('ad', veri.ad, 'Kimyasal Adı');
  yaz('ticariAdi', veri.ticariAdi, 'Ticari Adı', 'tanimlayici');
  yaz('casNo', veri.casNo, 'CAS No', 'tanimlayici');
  yaz('ecNo', veri.ecNo, 'EC No', 'tanimlayici');
  yaz('tedarikci', veri.tedarikci, 'Tedarikçi', 'tanimlayici');
  yaz('hKodlari', (veri.hKodlari || []).join('; '), 'H Kodları', 'tehlike');
  yaz('pKodlari', (veri.pKodlari || []).join('; '), 'P Kodları', 'tehlike');
  yaz('ghsPiktogramlari', (veri.ghsPiktogramlari || []).join('; '), 'GHS Piktogramları', 'tehlike');
  yaz('sdsRevizyonTarihi', veri.sdsRevizyonTarihi, 'Revizyon Tarihi');
  if (veri.fizikselHali) {
    const secim = document.getElementById('fizikselHali');
    Array.from(secim.options).forEach(o => { o.selected = (o.value === veri.fizikselHali); });
    dolanlar.push('Fiziksel Hali');
  }
  const depolamaOnerisi = kimyasalDepolamaGrubuTahminEt(veri.ad, veri.hKodlari);
  if (depolamaOnerisi) {
    const secim = document.getElementById('depolamaGrubu');
    Array.from(secim.options).forEach(o => { o.selected = (o.value === depolamaOnerisi); });
    dolanlar.push('Depolama Grubu (öneri, kontrol edin)');
  }
  if (dosyaAdi) {
    document.getElementById('sdsDosyaAdi').value = dosyaAdi;
    dolanlar.push('Dosya Adı');
  }
  return dolanlar;
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

function _kimOzellikKutulariniCiz(secililer) {
  secililer = (secililer || []).map(kimyasalOzellikNormalize);
  document.getElementById('kimyasalOzellikleri').innerHTML = KIMYASAL_OZELLIKLERI.map(o =>
    `<label style="display:inline-flex; align-items:center; gap:4px; font-weight:400; margin:0; cursor:pointer;"><input type="checkbox" value="${o}" ${secililer.includes(o) ? 'checked' : ''} style="width:auto; margin:0;">${o}</label>`
  ).join('');
}

function _kimKisalt(metin, uzunluk) {
  const m = String(metin || '');
  return m.length > uzunluk ? m.slice(0, uzunluk) + '…' : m;
}

// Kayıtta Depolama Grubu elle seçilmemiş/'Genel' bırakılmışsa (kullanıcı
// henüz "Öner" ile kaydetmediyse) matris her şeyi "Uyumlu" gösterip
// anlamsızlaşmasın diye ada göre CANLI bir tahminle doldurulur -- kayda
// YAZILMAZ, sadece bu görünüm için kullanılır ve tahmini olduğu
// (depolamaGrubuTahminiMi) ayrıca işaretlenir ki kullanıcı yanıltılmasın.
function _kimDepolamaMatrisiKayitlariGetir() {
  return kimyasallariGetir('', {})
    .filter(k => k.durum !== 'İptal')
    .map(k => {
      const ef = kimyasalEfektifOzellikleri(k);
      return Object.assign({}, k, {
        ozellikListesi: ef.liste,
        depolamaGrubuEfektif: ef.liste.join(', '),
        depolamaGrubuTahminiMi: ef.tahminMi
      });
    })
    .sort((a, b) => a.ad.localeCompare(b.ad, 'tr'));
}

// Levhadaki gibi yuvarlak işaretler: U yeşil ✓, X kırmızı ✕, S sarı !
const _KIM_DURUM_ISARET = {
  U: { renk: '#16a34a', isaret: '✓', ad: 'Birlikte depolanabilir' },
  X: { renk: '#dc2626', isaret: '✕', ad: 'Birlikte depolanamaz' },
  S: { renk: '#eab308', isaret: '!', ad: 'Özel önlemlerle birlikte depolanabilir' }
};
const _KIM_DURUM_SIRASI = { U: 'X', X: 'S', S: 'U' };

function _kimDurumIsaretiHtml(durum, degistiMi) {
  const d = _KIM_DURUM_ISARET[durum] || _KIM_DURUM_ISARET.U;
  return `<span title="${d.ad}" style="display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px; border-radius:50%; background:${d.renk}; color:#fff; font-weight:800; font-size:15px;${degistiMi ? ' box-shadow:0 0 0 3px #2563eb;' : ''}">${d.isaret}</span>`;
}

function _kimCiftAnahtari(a, b) {
  return 'kim:' + [a.id, b.id].sort().join('|');
}

// İki kimyasalın durumu: kullanıcı bu çift için özel durum girdiyse o,
// yoksa özellik kurallarından hesaplanan en kötü durum.
function _kimCiftDurumu(a, b, kurallar) {
  const ozel = kurallar[_kimCiftAnahtari(a, b)];
  const hesap = kimyasalOzellikKarsilastir(a.ozellikListesi, b.ozellikListesi, kurallar);
  return { durum: ozel || hesap.durum, ozelMi: !!ozel, ciftler: hesap.ciftler, hesaplanan: hesap.durum };
}

function _kimCiftDurumuKaydet(a, b, durum, hesaplanan) {
  const kurallar = Object.assign({}, kimyasalMatrisKurallariGetir());
  const anahtar = _kimCiftAnahtari(a, b);
  if (durum === hesaplanan) delete kurallar[anahtar];
  else kurallar[anahtar] = durum;
  yaz(tenantAnahtar('kimyasal_matris_kurallari'), kurallar);
}

function _kimDepolamaMatrisiniEkranaCiz() {
  _kimMatrisKurallariniCiz();
  const icerik = document.getElementById('depolamaMatrisiIcerik');
  const bosDurum = document.getElementById('depolamaMatrisiBosDurum');
  const kayitlar = _kimDepolamaMatrisiKayitlariGetir();

  if (kayitlar.length < 2) {
    icerik.innerHTML = '';
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = 'Matris için en az 2 aktif kimyasal kaydı gerekli.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  const kurallar = kimyasalMatrisKurallariGetir();
  const tahminUyarisi = kayitlar.some(k => k.depolamaGrubuTahminiMi)
    ? '<p style="font-size:12px; color:#b45309; margin:0 0 10px;">⚠ "*" ile işaretli kimyasallarda Kimyasal Özellikleri seçilmemiş; GHS piktogramı, H kodu ve addan tahmin edilmiştir. Kesin olması için kaydı açıp özellikleri işaretleyin.</p>'
    : '';
  const basliklar = kayitlar.map(k => `<th title="${_kimKacir(k.ad)}">${_kimKacir(k.kimyasalNo)}</th>`).join('');
  const govde = kayitlar.map((satirK, i) => {
    const hucreler = kayitlar.map((sutunK, j) => {
      if (i === j) return '<td style="text-align:center; background:#f1f5f9;">—</td>';
      const s = _kimCiftDurumu(satirK, sutunK, kurallar);
      const aciklama = (s.ozelMi ? 'Kullanıcı tarafından değiştirildi. ' : '') + (s.ciftler.join('; ') || _KIM_DURUM_ISARET[s.durum].ad) + ' — değiştirmek için tıklayın';
      return `<td style="text-align:center; cursor:pointer;" data-kim-a="${i}" data-kim-b="${j}" title="${_kimKacir(aciklama)}">${_kimDurumIsaretiHtml(s.durum, s.ozelMi)}</td>`;
    }).join('');
    const yildiz = satirK.depolamaGrubuTahminiMi ? '*' : '';
    return `<tr><td style="font-weight:700; white-space:nowrap;">${_kimKacir(satirK.kimyasalNo)} — ${_kimKacir(_kimKisalt(satirK.ad, 30))}<div style="font-weight:400; font-size:11px; color:var(--metin-soluk);">${_kimKacir(satirK.depolamaGrubuEfektif)}${yildiz}</div></td>${hucreler}</tr>`;
  }).join('');

  icerik.innerHTML = `${tahminUyarisi}<table class="veri-tablosu"><thead><tr><th>Kimyasal</th>${basliklar}</tr></thead><tbody>${govde}</tbody></table>`;
  icerik.querySelectorAll('[data-kim-a]').forEach(td => td.addEventListener('click', () => {
    const a = kayitlar[Number(td.dataset.kimA)], b = kayitlar[Number(td.dataset.kimB)];
    const s = _kimCiftDurumu(a, b, kimyasalMatrisKurallariGetir());
    _kimCiftDurumuKaydet(a, b, _KIM_DURUM_SIRASI[s.durum], s.hesaplanan);
    _kimDepolamaMatrisiniEkranaCiz();
  }));
}

// Özellik x özellik kural tablosu (levha görünümü), hücreye tıklayınca
// ✓ → ✕ → ! → ✓ döner; simetrik olarak kaydedilir.
function _kimMatrisKurallariniCiz() {
  const kap = document.getElementById('matrisKurallariIcerik');
  if (!kap) return;
  const kurallar = kimyasalMatrisKurallariGetir();
  const etiket = (o) => `${KIMYASAL_OZELLIK_GHS[o] ? `<span style="display:block; font-size:10px; color:#b91c1c;">◆ ${KIMYASAL_OZELLIK_GHS[o]}</span>` : ''}${_kimKacir(o)}`;
  const basliklar = KIMYASAL_OZELLIKLERI.map(o => `<th style="font-size:11px; text-align:center; min-width:62px;">${etiket(o)}</th>`).join('');
  const govde = KIMYASAL_OZELLIKLERI.map((a, i) => {
    const hucreler = KIMYASAL_OZELLIKLERI.map((b, j) => {
      const durum = kimyasalMatrisDurumu(a, b, kurallar);
      const degisti = durum !== kimyasalMatrisVarsayilanDurum(a, b);
      return `<td style="text-align:center; cursor:pointer;" data-kural-a="${i}" data-kural-b="${j}" title="${_kimKacir(a)} ↔ ${_kimKacir(b)}: ${_KIM_DURUM_ISARET[durum].ad}">${_kimDurumIsaretiHtml(durum, degisti)}</td>`;
    }).join('');
    return `<tr${i % 2 ? ' style="background:var(--zemin-ikincil, #f8fafc);"' : ''}><td style="font-weight:700; font-size:12px; white-space:nowrap;">${etiket(a)}</td>${hucreler}</tr>`;
  }).join('');
  kap.innerHTML = `<table class="veri-tablosu"><thead><tr><th></th>${basliklar}</tr></thead><tbody>${govde}</tbody></table>`;
  kap.querySelectorAll('[data-kural-a]').forEach(td => td.addEventListener('click', () => {
    const a = KIMYASAL_OZELLIKLERI[Number(td.dataset.kuralA)], b = KIMYASAL_OZELLIKLERI[Number(td.dataset.kuralB)];
    kimyasalMatrisKuraliKaydet(a, b, _KIM_DURUM_SIRASI[kimyasalMatrisDurumu(a, b)]);
    _kimDepolamaMatrisiniEkranaCiz();
  }));
}

function _kimYaziciIsaret(durum) {
  const d = _KIM_DURUM_ISARET[durum];
  return `<span class="kim-isaret kim-isaret-${durum}" style="display:inline-block; width:18px; height:18px; line-height:18px; border-radius:50%; background:${d.renk}; color:#fff; font-weight:800; text-align:center; -webkit-print-color-adjust:exact; print-color-adjust:exact;">${d.isaret}</span>`;
}

// Yazdırma çıktısı: kimyasallar arası matris + kullanılan kural tablosu.
function _kimDepolamaMatrisiHtml(kayitlar) {
  const kurallar = kimyasalMatrisKurallariGetir();
  const basliklar = kayitlar.map(k => `<th>${_raporKacir(k.kimyasalNo)}</th>`).join('');
  const govde = kayitlar.map((satirK, i) => {
    const hucreler = kayitlar.map((sutunK, j) => {
      if (i === j) return '<td class="kim-kosegen" style="background:#f1f5f9; text-align:center;">—</td>';
      return `<td style="text-align:center;">${_kimYaziciIsaret(_kimCiftDurumu(satirK, sutunK, kurallar).durum)}</td>`;
    }).join('');
    const yildiz = satirK.depolamaGrubuTahminiMi ? '*' : '';
    return `<tr><td style="font-weight:700;">${_raporKacir(satirK.kimyasalNo)} — ${_raporKacir(satirK.ad)} <span style="font-weight:400; color:#555;">(${_raporKacir(satirK.depolamaGrubuEfektif)}${yildiz})</span></td>${hucreler}</tr>`;
  }).join('');
  const kuralBaslik = KIMYASAL_OZELLIKLERI.map(o => `<th style="font-size:9px;">${_raporKacir(o)}</th>`).join('');
  const kuralGovde = KIMYASAL_OZELLIKLERI.map(a => `<tr><td style="font-weight:700; font-size:10px;">${_raporKacir(a)}</td>${KIMYASAL_OZELLIKLERI.map(b => `<td style="text-align:center;">${_kimYaziciIsaret(kimyasalMatrisDurumu(a, b, kurallar))}</td>`).join('')}</tr>`).join('');
  const tahminNotu = kayitlar.some(k => k.depolamaGrubuTahminiMi)
    ? ' "*" işaretli kimyasallarda özellikler kayıtta seçilmemiş, GHS/H kodu/addan tahmin edilmiştir.'
    : '';

  return `
    <div class="doc-title">Kimyasal Depolama Matrisi</div>
    <div class="doc-meta">✓ Birlikte depolanabilir, ✕ Birlikte depolanamaz, ! Özel önlemlerle birlikte depolanabilir. Toplam ${kayitlar.length} kimyasal; sütun başlıkları Kimyasal No'dur.${tahminNotu}</div>
    <table><tr><th>Kimyasal</th>${basliklar}</tr>${govde}</table>
    <div class="doc-title" style="margin-top:18px; font-size:15px;">Uyumluluk Kuralları</div>
    <table><tr><th></th>${kuralBaslik}</tr>${kuralGovde}</table>
  `;
}

// Word (.docx) çıktısı: yazdırmadakiyle aynı iki tablo, hücreler durum
// rengiyle (yeşil/kırmızı/sarı) boyanır, işaret beyaz yazılır. A4 yatay.
async function _kimDepolamaMatrisiWordOlustur(kayitlar) {
  if (!window.docx) { alert('docx.js yüklenemedi.'); return; }
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, VerticalAlign, ShadingType, PageOrientation } = docx;
  const font = 'Calibri';
  const kurallar = kimyasalMatrisKurallariGetir();
  const boya = (renk) => ({ fill: renk.replace('#', ''), type: ShadingType.CLEAR, color: 'auto' });
  const metinHucre = (metin, opts = {}) => new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 30, bottom: 30, left: 50, right: 50 },
    shading: opts.renk ? boya(opts.renk) : undefined,
    children: [new Paragraph({ alignment: opts.orta ? AlignmentType.CENTER : AlignmentType.LEFT, children: [new TextRun({ text: String(metin ?? ''), bold: !!opts.kalin, font, size: opts.boyut || 16 })] })]
  });
  const isaretHucre = (durum) => {
    const d = _KIM_DURUM_ISARET[durum] || _KIM_DURUM_ISARET.U;
    return new TableCell({
      verticalAlign: VerticalAlign.CENTER,
      shading: boya(d.renk),
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: d.isaret, bold: true, color: 'FFFFFF', font, size: 20 })] })]
    });
  };

  const matrisSatirlari = [
    new TableRow({ tableHeader: true, children: [metinHucre('Kimyasal', { kalin: true }), ...kayitlar.map(k => metinHucre(k.kimyasalNo, { kalin: true, orta: true }))] }),
    ...kayitlar.map((satirK, i) => new TableRow({
      cantSplit: true,
      children: [
        metinHucre(`${satirK.kimyasalNo} — ${satirK.ad} (${satirK.depolamaGrubuEfektif}${satirK.depolamaGrubuTahminiMi ? '*' : ''})`, { kalin: true }),
        ...kayitlar.map((sutunK, j) => i === j ? metinHucre('—', { orta: true, renk: '#E2E8F0' }) : isaretHucre(_kimCiftDurumu(satirK, sutunK, kurallar).durum))
      ]
    }))
  ];
  const kuralSatirlari = [
    new TableRow({ tableHeader: true, children: [metinHucre(''), ...KIMYASAL_OZELLIKLERI.map(o => metinHucre(o, { kalin: true, orta: true, boyut: 13 }))] }),
    ...KIMYASAL_OZELLIKLERI.map(a => new TableRow({
      cantSplit: true,
      children: [metinHucre(a, { kalin: true, boyut: 14 }), ...KIMYASAL_OZELLIKLERI.map(b => isaretHucre(kimyasalMatrisDurumu(a, b, kurallar)))]
    }))
  ];
  const lejant = ['U', 'X', 'S'].flatMap(d => [
    new TextRun({ text: ` ${_KIM_DURUM_ISARET[d].isaret} `, bold: true, color: 'FFFFFF', shading: boya(_KIM_DURUM_ISARET[d].renk), font, size: 18 }),
    new TextRun({ text: ` ${_KIM_DURUM_ISARET[d].ad}     `, font, size: 18 })
  ]);
  const tahminNotu = kayitlar.some(k => k.depolamaGrubuTahminiMi)
    ? ' "*" işaretli kimyasallarda özellikler kayıtta seçilmemiş, GHS/H kodu/addan tahmin edilmiştir.'
    : '';

  const belge = new Document({
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE }, margin: { top: 567, right: 567, bottom: 567, left: 567 } } },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: 'Kimyasal Depolama Matrisi', bold: true, font, size: 32 })] }),
        new Paragraph({ spacing: { after: 80 }, children: lejant }),
        new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: `Toplam ${kayitlar.length} kimyasal; sütun başlıkları Kimyasal No'dur. Tarih: ${gunAyYil(new Date().toISOString().slice(0, 10))}.${tahminNotu}`, font, size: 16 })] }),
        new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: matrisSatirlari }),
        new Paragraph({ pageBreakBefore: true, alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new TextRun({ text: 'Uyumluluk Kuralları', bold: true, font, size: 28 })] }),
        new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: kuralSatirlari })
      ]
    }]
  });
  saveAs(await Packer.toBlob(belge), `Kimyasal_Depolama_Matrisi_${new Date().toISOString().slice(0, 10)}.docx`);
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
      <td title="${_kimKacir(k.ad)}">${_kimKacir(_kimKisalt(k.ad, 60))}${k.kritikMi ? ' <span class="genel-rozet rozet-cok-yuksek">Kritik</span>' : ''}</td>
      <td>${[k.bolum, k.lokasyon].filter(Boolean).join(' / ') || '-'}</td>
      <td>${_kimGhsHucre(k)}</td>
      <td>${k.nfpaSaglik}-${k.nfpaYanicilik}-${k.nfpaKararsizlik}${k.nfpaOzelKod.length ? ' ' + k.nfpaOzelKod.join('/') : ''}</td>
      <td><span class="genel-rozet rozet-${kimRozetSinifAdi(k.riskSeviyesi)}">${k.riskSeviyesi}</span></td>
      <td>${sdsGoruntu}</td>
      <td><span class="genel-rozet rozet-${kimRozetSinifAdi(k.durum)}">${k.durum}</span></td>
      <td>
        <button class="tablo-buton" data-duzenle="${k.id}">Düzenle</button>
        <button class="tablo-buton" data-form="${k.id}">Form</button>
        ${riskeAktarButonHtml('kimyasal', k.id)}
        <button class="tablo-buton sil" data-sil="${k.id}">Sil</button>
      </td>
    `;
    govde.appendChild(satir);
  });

  // Risk Değerlendirmesi'ne aktarma (core/risk-aktar.js): H kodları tehlike,
  // P kodları ve depolama notu mevcut önlem olarak taşınır.
  govde.querySelectorAll('[data-riske-aktar]').forEach(btn => btn.addEventListener('click', () => {
    const k = kimyasalIdIleGetirRepo(btn.getAttribute('data-riske-aktar'));
    if (!k) return;
    const ozellikler = (typeof kimyasalEfektifOzellikleri === 'function' ? kimyasalEfektifOzellikleri(k).liste : []).filter(o => o !== 'Genel');
    riskeAktarModaliAc({
      modul: 'kimyasal', modulAdi: 'Kimyasal', id: k.id, etiket: k.kimyasalNo,
      alanlar: {
        yer: k.lokasyon || k.bolum,
        faaliyet: `${k.ad} kullanımı ve depolanması`,
        tehlike: [`${k.ad}${k.casNo ? ' (CAS ' + k.casNo + ')' : ''}`, ozellikler.length ? 'Özellikler: ' + ozellikler.join(', ') : '', (k.hKodlari || []).length ? 'H kodları: ' + k.hKodlari.join(', ') : ''].filter(Boolean).join(' - '),
        risk: 'Kimyasal maruziyet (soluma, cilt/göz teması), yangın/patlama',
        onlem: [(k.pKodlari || []).length ? 'P kodları: ' + k.pKodlari.join(', ') : '', k.depolamaNotu].filter(Boolean).join('\n')
      },
      sonra: () => kimyasallariCiz(document.getElementById('kimyasalAramaKutusu').value)
    });
  }));

  govde.querySelectorAll('[data-duzenle]').forEach(btn => btn.addEventListener('click', () => kimyasalModalAc(kimyasalIdIleGetirRepo(btn.getAttribute('data-duzenle')))));
  govde.querySelectorAll('[data-form]').forEach(btn => btn.addEventListener('click', async () => {
    try { await kimyasalFormunuPdfOlustur(btn.getAttribute('data-form')); } catch (hata) { console.error(hata); alert('PDF üretilemedi: ' + (hata.message || hata)); }
  }));
  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', async () => {
    if (await onayModali('Bu kimyasal kaydını silmek istediğinize emin misiniz?', 'Sil')) { kimyasalSil(btn.getAttribute('data-sil')); kimyasallariCiz(document.getElementById('kimyasalAramaKutusu').value); kimyasalOzetiVeUyarilariCiz(); }
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
  _kimOzellikKutulariniCiz(kayit ? (kayit.ozellikler || []) : []);
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
  document.getElementById('sdsPdfDosya').value = '';
  document.getElementById('sdsPdfSonucu').textContent = '';

  // Katlanır bölümler her açılışta varsayılan kapalı başlar; kayıtta o
  // bölüme ait bir veri varsa (düzenleme) kullanıcı görebilsin diye açılır.
  document.querySelectorAll('.form-bolum-baslik.katlanir, .form-bolum-icerik').forEach(el => el.classList.add('kapali'));
  if (kayit) {
    if (kayit.ticariAdi || kayit.casNo || kayit.ecNo || kayit.tedarikci) _kimBolumAc('tanimlayici');
    if ((kayit.ghsPiktogramlari || []).length || (kayit.hKodlari || []).length || (kayit.pKodlari || []).length || kayit.riskSeviyesi) _kimBolumAc('tehlike');
    if (kayit.nfpaSaglik || kayit.nfpaYanicilik || kayit.nfpaKararsizlik || (kayit.nfpaOzelKod || []).length) _kimBolumAc('nfpa');
    if (kayit.riskDegerlendirmeBaglantisi || kayit.depolamaNotu || kayit.notlar || kayit.sdsGorseli) _kimBolumAc('digerVeGorsel');
  }

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
    ozellikler: Array.from(document.querySelectorAll('#kimyasalOzellikleri input:checked')).map(c => c.value),
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
