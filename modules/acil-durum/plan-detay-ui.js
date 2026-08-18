// Acil Durum Planı — Planlama Merkezi (Tesis Bilgi Formu / Tehlike & Senaryo
// Kartları / Komuta Yapısı & Ekip Tanımları) sayfasının DOM işlemleri.

let _pdFirma = null;
let _pdGorunum = 'tesisBilgi';
let _duzenlenenSenaryoId = null;
let _duzenlenenEkipTanimiId = null;
let _duzenlenenKomutaPozisyonuId = null;

function _pdKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function temizleFormHatalari(formId) {
  document.querySelectorAll('#' + formId + ' .alan-hatasi').forEach(el => el.textContent = '');
}

function formHatalariniGoster(hatalar, onEk) {
  Object.keys(hatalar).forEach(alan => {
    const buyukAlan = alan.charAt(0).toUpperCase() + alan.slice(1);
    const hataEl = document.getElementById(onEk + buyukAlan + 'Hata');
    if (hataEl) hataEl.textContent = hatalar[alan];
  });
}

function planDetaySayfasiniBaslat(firma) {
  _pdFirma = firma;

  document.querySelectorAll('[data-sekme]').forEach(btn => {
    btn.addEventListener('click', () => gorunumDegistirDetay(btn.getAttribute('data-sekme')));
  });

  // Katlanabilir form bölümleri (bkz. assets/style.css .form-bolum-baslik.katlanir) — bu
  // sayfaya özgü genel toggle, başlıkla hemen ardından gelen .form-bolum-icerik birlikte açılır/kapanır.
  document.querySelectorAll('.form-bolum-baslik.katlanir').forEach(baslik => {
    baslik.addEventListener('click', () => {
      baslik.classList.toggle('kapali');
      const icerik = baslik.nextElementSibling;
      if (icerik && icerik.classList.contains('form-bolum-icerik')) icerik.classList.toggle('kapali');
    });
  });

  tesisBilgiFormunuKur();

  // Senaryo
  document.getElementById('yeniSenaryoBtn').addEventListener('click', () => senaryoModalAc());
  document.getElementById('senaryoModalKapatBtn').addEventListener('click', senaryoModalKapat);
  document.getElementById('senaryoModalIptalBtn').addEventListener('click', senaryoModalKapat);
  document.getElementById('senaryoForm').addEventListener('submit', senaryoFormGonderildi);
  document.getElementById('senaryoAramaKutusu').addEventListener('input', e => senaryolariCiz(e.target.value));
  document.getElementById('senaryoDisaAktarBtn').addEventListener('click', () => {
    excelDisaAktar(senaryolariGetir(''), SENARYO_EXPORT_KOLONLARI, 'acil_durum_senaryolari.xlsx');
  });
  document.getElementById('senaryoYazdirBtn').addEventListener('click', () => {
    raporListesiYazdir('Acil Durum Senaryoları', _pdFirma ? _pdFirma.ad : '', SENARYO_EXPORT_KOLONLARI, senaryolariGetir(document.getElementById('senaryoAramaKutusu').value));
  });
  document.getElementById('senaryoSablonBtn').addEventListener('click', senaryoSablonModalAc);
  document.getElementById('senaryoSablonModalKapatBtn').addEventListener('click', senaryoSablonModalKapat);
  document.getElementById('senaryoSablonTesisFiltre').addEventListener('change', senaryoSablonlariCiz);
  document.getElementById('senaryoSablonKategoriFiltre').addEventListener('change', senaryoSablonlariCiz);
  document.getElementById('senaryoSablonlariEkleBtn').addEventListener('click', senaryoSablonlariEkleTiklandi);

  // Ekip Tanımları
  document.getElementById('yeniEkipTanimiBtn').addEventListener('click', () => ekipTanimiModalAc());
  document.getElementById('ekipTanimiModalKapatBtn').addEventListener('click', ekipTanimiModalKapat);
  document.getElementById('ekipTanimiModalIptalBtn').addEventListener('click', ekipTanimiModalKapat);
  document.getElementById('ekipTanimiForm').addEventListener('submit', ekipTanimiFormGonderildi);

  // Komuta Yapısı
  document.getElementById('yeniKomutaPozisyonuBtn').addEventListener('click', () => komutaPozisyonuModalAc());
  document.getElementById('komutaPozisyonuModalKapatBtn').addEventListener('click', komutaPozisyonuModalKapat);
  document.getElementById('komutaPozisyonuModalIptalBtn').addEventListener('click', komutaPozisyonuModalKapat);
  document.getElementById('komutaPozisyonuForm').addEventListener('submit', komutaPozisyonuFormGonderildi);
  document.getElementById('komutaStandartBtn').addEventListener('click', komutaStandartOlusturTiklandi);

  gorunumDegistirDetay('tesisBilgi');
}

function gorunumDegistirDetay(gorunum) {
  _pdGorunum = gorunum;
  document.querySelectorAll('[data-sekme]').forEach(btn => {
    btn.classList.toggle('sekme-seciliDegil', btn.getAttribute('data-sekme') !== gorunum);
  });
  ['tesisBilgi', 'senaryo', 'komuta'].forEach(g => {
    document.getElementById('bolum-' + g).style.display = g === gorunum ? '' : 'none';
  });

  if (gorunum === 'senaryo') senaryolariCiz('');
  else if (gorunum === 'komuta') { ekipTanimlariniCiz(); komutaPozisyonlariniCiz(); }
}

// ==================== TESİS BİLGİ FORMU ====================

const TESIS_TEKNIK_UNSUR_ETIKETLERI = {
  elektrikAnaDagitim: 'Elektrik Ana Dağıtım', trafo: 'Trafo', jenerator: 'Jeneratör', dogalgaz: 'Doğalgaz',
  lpg: 'LPG', yakitTanki: 'Yakıt Tankı', kimyasalTank: 'Kimyasal Tank', basincliKap: 'Basınçlı Kap',
  buharSistemi: 'Buhar Sistemi', kompresor: 'Kompresör', kazan: 'Kazan', yanginPompasi: 'Yangın Pompası',
  sprinkler: 'Sprinkler', yanginDolabiSistemi: 'Yangın Dolabı Sistemi', yanginSondurmeCihazi: 'Yangın Söndürme Cihazı',
  yanginAlgilamaSistemi: 'Yangın Algılama Sistemi', gazAlgilamaSistemi: 'Gaz Algılama Sistemi',
  acilDurumAlarmSistemi: 'Acil Durum Alarm Sistemi', acilAydinlatma: 'Acil Aydınlatma',
  yonlendirmeLevhalari: 'Yönlendirme Levhaları', kacisMerdiveni: 'Kaçış Merdiveni', toplanmaAlaniIsaretleme: 'Toplanma Alanı İşaretleme'
};

function tesisBilgiFormunuKur() {
  document.getElementById('tesisTurleriKutusu').innerHTML = TESIS_TURLERI.map(t => `
    <label style="display:flex; align-items:center; gap:6px; font-weight:400; font-size:13px; border:1px solid var(--kenarlik); border-radius:8px; padding:6px 10px; cursor:pointer;">
      <input type="checkbox" data-tesis-turu="${_pdKacir(t)}" style="width:auto;"> ${_pdKacir(t)}
    </label>
  `).join('');

  document.getElementById('tbTeknikKutusu').innerHTML = TESIS_TEKNIK_UNSUR_ANAHTARLARI.map(anahtar => `
    <div style="display:flex; align-items:center; gap:10px; padding:6px 0; border-bottom:1px solid var(--kenarlik);">
      <label style="display:flex; align-items:center; gap:6px; font-weight:400; min-width:220px;">
        <input type="checkbox" data-teknik-varmi="${anahtar}" style="width:auto;"> ${_pdKacir(TESIS_TEKNIK_UNSUR_ETIKETLERI[anahtar] || anahtar)}
      </label>
      <input type="text" data-teknik-detay="${anahtar}" placeholder="Detay (kapasite, konum, bakım tarihi vb.)" style="flex:1;">
    </div>
  `).join('');

  document.getElementById('tbPersonelKutusu').innerHTML = `
    <div class="form-satir-ikili" style="grid-template-columns: repeat(4, 1fr);">
      <div><label for="tbPKadrolu">Kadrolu</label><input type="number" id="tbPKadrolu" min="0"></div>
      <div><label for="tbPTaseron">Taşeron</label><input type="number" id="tbPTaseron" min="0"></div>
      <div><label for="tbPZiyaretci">Ziyaretçi</label><input type="number" id="tbPZiyaretci" min="0"></div>
      <div><label for="tbPSofor">Şoför</label><input type="number" id="tbPSofor" min="0"></div>
    </div>
    <div class="form-satir-ikili" style="grid-template-columns: repeat(4, 1fr);">
      <div><label for="tbPStajyer">Stajyer</label><input type="number" id="tbPStajyer" min="0"></div>
      <div><label for="tbPGecici">Geçici Çalışan</label><input type="number" id="tbPGecici" min="0"></div>
      <div><label for="tbPEngelli">Engelli Çalışan</label><input type="number" id="tbPEngelli" min="0"></div>
      <div><label for="tbPGeceVardiyasi">Gece Vardiyası</label><input type="number" id="tbPGeceVardiyasi" min="0"></div>
    </div>
  `;

  const tesisBilgi = tesisBilgiGetirVeyaOlustur();
  _tesisBilgiFormunuDoldur(tesisBilgi);

  document.querySelectorAll('#tesisTurleriKutusu [data-tesis-turu]').forEach(cb => {
    cb.addEventListener('change', () => {
      const secililer = Array.from(document.querySelectorAll('#tesisTurleriKutusu [data-tesis-turu]:checked')).map(x => x.getAttribute('data-tesis-turu'));
      tesisBilgiGuncelle('tesisTurleri', secililer);
    });
  });

  const metinAlanEslesme = { tbAdres: 'adres', tbFaaliyetKonusu: 'faaliyetKonusu', tbAcikSahaAlanlari: 'acikSahaAlanlari', tbKapaliAlanlar: 'kapaliAlanlar' };
  Object.entries(metinAlanEslesme).forEach(([elId, alan]) => {
    document.getElementById(elId).addEventListener('change', e => tesisBilgiGuncelle(alan, e.target.value));
  });
  const sayiAlanEslesme = { tbVardiyaSayisi: 'vardiyaSayisi', tbVardiyaBasiCalisanSayisi: 'vardiyaBasiCalisanSayisi', tbAltIsverenSayisi: 'altIsverenSayisi', tbZiyaretciSayisiGunlukMaks: 'ziyaretciSayisiGunlukMaks', tbBinaSayisi: 'binaSayisi', tbKatSayisi: 'katSayisi' };
  Object.entries(sayiAlanEslesme).forEach(([elId, alan]) => {
    document.getElementById(elId).addEventListener('change', e => tesisBilgiGuncelle(alan, e.target.value));
  });
  document.getElementById('tbGeceCalismaVarMi').addEventListener('change', e => tesisBilgiGuncelle('geceCalismaVarMi', e.target.checked));

  document.querySelectorAll('#tbTeknikKutusu [data-teknik-varmi]').forEach(cb => {
    cb.addEventListener('change', () => _teknikUnsurGuncelle(cb.getAttribute('data-teknik-varmi')));
  });
  document.querySelectorAll('#tbTeknikKutusu [data-teknik-detay]').forEach(input => {
    input.addEventListener('change', () => _teknikUnsurGuncelle(input.getAttribute('data-teknik-detay')));
  });

  const personelKatAlanEslesme = { tbPKadrolu: 'kadrolu', tbPTaseron: 'taseron', tbPZiyaretci: 'ziyaretci', tbPSofor: 'sofor', tbPStajyer: 'stajyer', tbPGecici: 'gecici', tbPEngelli: 'engelli', tbPGeceVardiyasi: 'geceVardiyasi' };
  Object.entries(personelKatAlanEslesme).forEach(([elId, alan]) => {
    document.getElementById(elId).addEventListener('change', e => {
      const tb = tesisBilgiGetirVeyaOlustur();
      const guncel = Object.assign({}, tb.personelKategorileri, { [alan]: e.target.value });
      tesisBilgiGuncelle('personelKategorileri', guncel);
    });
  });

  const listeAlanEslesme = { tbVardiyaTablosu: 'vardiyaTablosu', tbIletisimZinciri: 'iletisimZinciri' };
  Object.entries(listeAlanEslesme).forEach(([elId, alan]) => {
    document.getElementById(elId).addEventListener('change', e => tesisBilgiGuncelle(alan, katilimcilariAyir(e.target.value)));
  });
  document.getElementById('tbOzelIhtiyaclarNotu').addEventListener('change', e => tesisBilgiGuncelle('ozelIhtiyaclarNotu', e.target.value));
}

function _teknikUnsurGuncelle(anahtar) {
  const tb = tesisBilgiGetirVeyaOlustur();
  const varMi = document.querySelector(`[data-teknik-varmi="${anahtar}"]`).checked;
  const detay = document.querySelector(`[data-teknik-detay="${anahtar}"]`).value;
  const guncel = Object.assign({}, tb.teknikUnsurlar, { [anahtar]: { varMi, detay } });
  tesisBilgiGuncelle('teknikUnsurlar', guncel);
}

function _tesisBilgiFormunuDoldur(tb) {
  document.querySelectorAll('#tesisTurleriKutusu [data-tesis-turu]').forEach(cb => {
    cb.checked = (tb.tesisTurleri || []).includes(cb.getAttribute('data-tesis-turu'));
  });
  document.getElementById('tbAdres').value = tb.adres || '';
  document.getElementById('tbFaaliyetKonusu').value = tb.faaliyetKonusu || '';
  document.getElementById('tbVardiyaSayisi').value = tb.vardiyaSayisi || '';
  document.getElementById('tbVardiyaBasiCalisanSayisi').value = tb.vardiyaBasiCalisanSayisi || '';
  document.getElementById('tbAltIsverenSayisi').value = tb.altIsverenSayisi || '';
  document.getElementById('tbZiyaretciSayisiGunlukMaks').value = tb.ziyaretciSayisiGunlukMaks || '';
  document.getElementById('tbBinaSayisi').value = tb.binaSayisi || '';
  document.getElementById('tbKatSayisi').value = tb.katSayisi || '';
  document.getElementById('tbAcikSahaAlanlari').value = tb.acikSahaAlanlari || '';
  document.getElementById('tbKapaliAlanlar').value = tb.kapaliAlanlar || '';
  document.getElementById('tbGeceCalismaVarMi').checked = !!tb.geceCalismaVarMi;

  TESIS_TEKNIK_UNSUR_ANAHTARLARI.forEach(anahtar => {
    const unsur = (tb.teknikUnsurlar || {})[anahtar] || { varMi: false, detay: '' };
    document.querySelector(`[data-teknik-varmi="${anahtar}"]`).checked = !!unsur.varMi;
    document.querySelector(`[data-teknik-detay="${anahtar}"]`).value = unsur.detay || '';
  });

  const pk = tb.personelKategorileri || {};
  document.getElementById('tbPKadrolu').value = pk.kadrolu || '';
  document.getElementById('tbPTaseron').value = pk.taseron || '';
  document.getElementById('tbPZiyaretci').value = pk.ziyaretci || '';
  document.getElementById('tbPSofor').value = pk.sofor || '';
  document.getElementById('tbPStajyer').value = pk.stajyer || '';
  document.getElementById('tbPGecici').value = pk.gecici || '';
  document.getElementById('tbPEngelli').value = pk.engelli || '';
  document.getElementById('tbPGeceVardiyasi').value = pk.geceVardiyasi || '';

  document.getElementById('tbVardiyaTablosu').value = (tb.vardiyaTablosu || []).join('\n');
  document.getElementById('tbIletisimZinciri').value = (tb.iletisimZinciri || []).join('\n');
  document.getElementById('tbOzelIhtiyaclarNotu').value = tb.ozelIhtiyaclarNotu || '';
}

// ==================== TEHLİKE & SENARYO KARTLARI ====================

const SENARYO_EXPORT_KOLONLARI = [
  { anahtar: 'senaryoNo', baslik: 'Senaryo No' },
  { anahtar: 'baslik', baslik: 'Başlık' },
  { anahtar: 'kategori', baslik: 'Kategori' },
  { anahtar: 'tur', baslik: 'Tür' },
  { anahtar: 'sorumluEkip', baslik: 'Sorumlu Ekip' },
  { anahtar: 'oncelik', baslik: 'Öncelik' },
  { anahtar: 'gozdenGecirmeTarihi', baslik: 'Gözden Geçirme' },
  { anahtar: 'durumGoruntu', baslik: 'Durum' }
];

function rozetSinifAdi(durum) {
  return slugOlustur(durum || '');
}

function senaryolariCiz(aramaMetni) {
  const govde = document.getElementById('senaryoTabloGovde');
  const bosDurum = document.getElementById('senaryoBosDurum');
  const liste = senaryolariGetir(aramaMetni);

  govde.innerHTML = '';
  if (liste.length === 0) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = aramaMetni ? 'Aramanızla eşleşen senaryo bulunamadı.' : 'Henüz senaryo eklenmedi. Manuel ekleyebilir veya "📚 Hazır Kütüphaneden Ekle" ile başlayabilirsiniz.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  liste.forEach(s => {
    const satir = document.createElement('tr');
    satir.innerHTML = `
      <td>${_pdKacir(s.senaryoNo)}</td><td>${_pdKacir(s.baslik)}</td><td>${_pdKacir(s.kategori) || '-'}</td><td>${_pdKacir(s.sorumluEkip)}</td>
      <td>${s.oncelik ? `<span class="genel-rozet rozet-${rozetSinifAdi(s.oncelik)}">${_pdKacir(s.oncelik)}</span>` : '-'}</td>
      <td>${s.gozdenGecirmeTarihi || '-'}</td>
      <td><span class="genel-rozet rozet-${rozetSinifAdi(s.durumGoruntu)}">${_pdKacir(s.durumGoruntu)}</span></td>
      <td>
        <button class="tablo-buton" data-duzenle="${s.id}">Düzenle</button>
        <button class="tablo-buton sil" data-sil="${s.id}">Sil</button>
      </td>
    `;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-duzenle]').forEach(btn => btn.addEventListener('click', () => senaryoModalAc(senaryoIdIleGetirRepo(btn.getAttribute('data-duzenle')))));
  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', async () => {
    if (await onayModali('Bu senaryoyu silmek istediğinize emin misiniz?', 'Sil')) { senaryoSil(btn.getAttribute('data-sil')); senaryolariCiz(document.getElementById('senaryoAramaKutusu').value); }
  }));
}

function senaryoModalAc(senaryo) {
  _duzenlenenSenaryoId = senaryo ? senaryo.id : null;
  document.getElementById('senaryoModalBaslik').textContent = senaryo ? 'Senaryoyu Düzenle' : 'Yeni Senaryo';
  document.getElementById('senaryoBaslik').value = senaryo ? senaryo.baslik : '';
  document.getElementById('senaryoKategori').innerHTML = '<option value="">— Seçiniz —</option>' + SENARYO_KATEGORILERI.map(k => `<option ${senaryo && senaryo.kategori === k ? 'selected' : ''}>${k}</option>`).join('');
  document.getElementById('senaryoTur').innerHTML = SENARYO_TURLERI.map(t => `<option ${senaryo && senaryo.tur === t ? 'selected' : ''}>${t}</option>`).join('');
  document.getElementById('senaryoSorumluEkip').innerHTML = EKIP_TURLERI.map(t => `<option ${senaryo && senaryo.sorumluEkip === t ? 'selected' : ''}>${t}</option>`).join('');
  document.getElementById('senaryoTahliyeKarari').innerHTML = '<option value="">— Seçiniz —</option>' + SENARYO_TAHLIYE_KARARLARI.map(t => `<option ${senaryo && senaryo.tahliyeKarari === t ? 'selected' : ''}>${t}</option>`).join('');
  document.getElementById('senaryoBolum').value = senaryo ? senaryo.bolum : '';
  document.getElementById('senaryoLokasyon').value = senaryo ? senaryo.lokasyon : '';
  document.getElementById('senaryoTetikleyici').value = senaryo ? senaryo.tetikleyici : '';
  document.getElementById('senaryoMudahaleAdimlari').value = senaryo ? senaryo.mudahaleAdimlari.join('\n') : '';
  document.getElementById('senaryoGozdenGecirmeTarihi').value = senaryo ? senaryo.gozdenGecirmeTarihi : '';
  document.getElementById('senaryoDurum').innerHTML = ['Aktif', 'Pasif', 'İptal'].map(d => `<option ${senaryo && senaryo.durum === d ? 'selected' : ''}>${d}</option>`).join('');
  document.getElementById('senaryoNotlar').value = senaryo ? senaryo.notlar : '';

  document.getElementById('senaryoOlayinTanimi').value = senaryo ? senaryo.olayinTanimi : '';
  document.getElementById('senaryoMuhtemelNedenler').value = senaryo ? senaryo.muhtemelNedenler : '';
  document.getElementById('senaryoIlkBelirtiTespit').value = senaryo ? senaryo.ilkBelirtiTespit : '';
  document.getElementById('senaryoTehlikeKaynaklari').value = senaryo ? senaryo.tehlikeKaynaklari : '';
  document.getElementById('senaryoEtkilenecekAlanlar').value = senaryo ? senaryo.etkilenecekAlanlar : '';
  document.getElementById('senaryoEtkiInsan').value = senaryo ? senaryo.etkiInsan : '';
  document.getElementById('senaryoEtkiCevre').value = senaryo ? senaryo.etkiCevre : '';
  document.getElementById('senaryoEtkiTesis').value = senaryo ? senaryo.etkiTesis : '';
  document.getElementById('senaryoIlk1Dk').value = senaryo ? senaryo.ilk1Dk : '';
  document.getElementById('senaryoIlk5Dk').value = senaryo ? senaryo.ilk5Dk : '';
  document.getElementById('senaryoIlk15Dk').value = senaryo ? senaryo.ilk15Dk : '';
  document.getElementById('senaryoAlarmIhbarYontemi').value = senaryo ? senaryo.alarmIhbarYontemi : '';
  document.getElementById('senaryoToplanmaAlani').value = senaryo ? senaryo.toplanmaAlani : '';
  document.getElementById('senaryoGuvenliDurdurmaNoktalari').value = senaryo ? senaryo.guvenliDurdurmaNoktalari.join('\n') : '';
  document.getElementById('senaryoKkd').value = senaryo ? senaryo.kkd.join('\n') : '';
  document.getElementById('senaryoMudahaleSiniri').value = senaryo ? senaryo.mudahaleSiniri : '';
  document.getElementById('senaryoDisKurumBildirimi').value = senaryo ? senaryo.disKurumBildirimi : '';

  ['Olasilik', 'Siddet', 'Yayilim', 'InsanEtkisi', 'CevreselEtki', 'Kritiklik', 'Oncelik'].forEach(alan => {
    const elId = 'senaryo' + alan;
    const deger = senaryo ? senaryo[alan.charAt(0).toLowerCase() + alan.slice(1)] : '';
    document.getElementById(elId).innerHTML = '<option value="">— Seçiniz —</option>' + SENARYO_ONEM_SEVIYELERI.map(s => `<option ${deger === s ? 'selected' : ''}>${s}</option>`).join('');
  });

  document.getElementById('senaryoEnKotuMu').checked = !!(senaryo && senaryo.enKotuSenaryoMu);
  const ekd = (senaryo && senaryo.enKotuSenaryoDetay) || {};
  document.getElementById('ekdEtkiAlani').value = ekd.etkiAlani || '';
  document.getElementById('ekdTahliyeAlaniBuyuklugu').value = ekd.tahliyeAlaniBuyuklugu || '';
  document.getElementById('ekdSiginmaAlani').value = ekd.siginmaAlani || '';
  document.getElementById('ekdRuzgarYonu').value = ekd.ruzgarYonu || '';
  document.getElementById('ekdKomsuTesisEtkisi').value = ekd.komsuTesisEtkisi || '';
  document.getElementById('ekdCevreEtkisi').value = ekd.cevreEtkisi || '';
  document.getElementById('ekdDisEkipIhtiyaci').value = ekd.disEkipIhtiyaci || '';
  document.getElementById('ekdKritikEkipmanDurdurma').value = ekd.kritikEkipmanDurdurma || '';
  document.getElementById('ekdHaberlesmePlani').value = ekd.haberlesmePlani || '';
  document.getElementById('ekdPersonelSayimPlani').value = ekd.personelSayimPlani || '';

  temizleFormHatalari('senaryoForm');
  document.getElementById('senaryoModalKatman').classList.add('acik');
}

function senaryoModalKapat() {
  document.getElementById('senaryoModalKatman').classList.remove('acik');
  _duzenlenenSenaryoId = null;
}

function senaryoFormGonderildi(e) {
  e.preventDefault();
  temizleFormHatalari('senaryoForm');

  const veriler = {
    baslik: document.getElementById('senaryoBaslik').value,
    kategori: document.getElementById('senaryoKategori').value,
    tur: document.getElementById('senaryoTur').value,
    sorumluEkip: document.getElementById('senaryoSorumluEkip').value,
    tahliyeKarari: document.getElementById('senaryoTahliyeKarari').value,
    bolum: document.getElementById('senaryoBolum').value,
    lokasyon: document.getElementById('senaryoLokasyon').value,
    tetikleyici: document.getElementById('senaryoTetikleyici').value,
    mudahaleAdimlari: document.getElementById('senaryoMudahaleAdimlari').value,
    gozdenGecirmeTarihi: document.getElementById('senaryoGozdenGecirmeTarihi').value,
    durum: document.getElementById('senaryoDurum').value,
    notlar: document.getElementById('senaryoNotlar').value,

    olayinTanimi: document.getElementById('senaryoOlayinTanimi').value,
    muhtemelNedenler: document.getElementById('senaryoMuhtemelNedenler').value,
    ilkBelirtiTespit: document.getElementById('senaryoIlkBelirtiTespit').value,
    tehlikeKaynaklari: document.getElementById('senaryoTehlikeKaynaklari').value,
    etkilenecekAlanlar: document.getElementById('senaryoEtkilenecekAlanlar').value,
    etkiInsan: document.getElementById('senaryoEtkiInsan').value,
    etkiCevre: document.getElementById('senaryoEtkiCevre').value,
    etkiTesis: document.getElementById('senaryoEtkiTesis').value,
    ilk1Dk: document.getElementById('senaryoIlk1Dk').value,
    ilk5Dk: document.getElementById('senaryoIlk5Dk').value,
    ilk15Dk: document.getElementById('senaryoIlk15Dk').value,
    alarmIhbarYontemi: document.getElementById('senaryoAlarmIhbarYontemi').value,
    toplanmaAlani: document.getElementById('senaryoToplanmaAlani').value,
    guvenliDurdurmaNoktalari: document.getElementById('senaryoGuvenliDurdurmaNoktalari').value,
    kkd: document.getElementById('senaryoKkd').value,
    mudahaleSiniri: document.getElementById('senaryoMudahaleSiniri').value,
    disKurumBildirimi: document.getElementById('senaryoDisKurumBildirimi').value,

    olasilik: document.getElementById('senaryoOlasilik').value,
    siddet: document.getElementById('senaryoSiddet').value,
    yayilim: document.getElementById('senaryoYayilim').value,
    insanEtkisi: document.getElementById('senaryoInsanEtkisi').value,
    cevreselEtki: document.getElementById('senaryoCevreselEtki').value,
    kritiklik: document.getElementById('senaryoKritiklik').value,
    oncelik: document.getElementById('senaryoOncelik').value,

    enKotuSenaryoMu: document.getElementById('senaryoEnKotuMu').checked,
    enKotuSenaryoDetay: {
      etkiAlani: document.getElementById('ekdEtkiAlani').value,
      tahliyeAlaniBuyuklugu: document.getElementById('ekdTahliyeAlaniBuyuklugu').value,
      siginmaAlani: document.getElementById('ekdSiginmaAlani').value,
      ruzgarYonu: document.getElementById('ekdRuzgarYonu').value,
      komsuTesisEtkisi: document.getElementById('ekdKomsuTesisEtkisi').value,
      cevreEtkisi: document.getElementById('ekdCevreEtkisi').value,
      disEkipIhtiyaci: document.getElementById('ekdDisEkipIhtiyaci').value,
      kritikEkipmanDurdurma: document.getElementById('ekdKritikEkipmanDurdurma').value,
      haberlesmePlani: document.getElementById('ekdHaberlesmePlani').value,
      personelSayimPlani: document.getElementById('ekdPersonelSayimPlani').value
    }
  };

  const sonuc = _duzenlenenSenaryoId ? senaryoGuncelle(_duzenlenenSenaryoId, veriler) : senaryoEkle(veriler);
  if (!sonuc.basarili) { formHatalariniGoster(sonuc.hatalar, 'senaryo'); return; }

  senaryoModalKapat();
  senaryolariCiz(document.getElementById('senaryoAramaKutusu').value);
}

// ---- Hazır Senaryo Kütüphanesi Modalı ----

function senaryoSablonModalAc() {
  document.getElementById('senaryoSablonTesisFiltre').innerHTML = '<option value="">Tümü</option>' + TESIS_TURLERI.map(t => `<option>${_pdKacir(t)}</option>`).join('');
  document.getElementById('senaryoSablonKategoriFiltre').innerHTML = '<option value="">Tümü</option>' + SENARYO_KATEGORILERI.map(k => `<option>${_pdKacir(k)}</option>`).join('');
  senaryoSablonlariCiz();
  document.getElementById('senaryoSablonModalKatman').classList.add('acik');
}

function senaryoSablonModalKapat() {
  document.getElementById('senaryoSablonModalKatman').classList.remove('acik');
}

function senaryoSablonlariCiz() {
  const kutu = document.getElementById('senaryoSablonListesi');
  const tesisTuru = document.getElementById('senaryoSablonTesisFiltre').value;
  const kategori = document.getElementById('senaryoSablonKategoriFiltre').value;
  const sablonlar = acilDurumSenaryoSablonlariGetir(tesisTuru, kategori);

  if (!sablonlar.length) {
    kutu.innerHTML = '<div class="bos-durum gorunur" style="padding:16px;">Seçilen filtrelere uygun şablon bulunamadı.</div>';
    return;
  }

  kutu.innerHTML = sablonlar.map(s => `
    <label style="display:flex; align-items:flex-start; gap:10px; padding:10px 12px; border-bottom:1px solid var(--kenarlik); font-weight:400; cursor:pointer;">
      <input type="checkbox" data-sablon-id="${s.id}" style="width:auto; margin-top:3px;">
      <span style="flex:1;">
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:2px;">
          <strong style="font-size:13px;">${_pdKacir(s.baslik)}</strong>
          <span style="font-size:11px; color:#7c3aed; background:#ede9fe; border-radius:6px; padding:1px 6px;">${_pdKacir(s.kategori)}</span>
          <span style="font-size:11px; color:var(--metin-soluk); background:var(--kenarlik); border-radius:6px; padding:1px 6px;">${_pdKacir(s.tesisTuru)}</span>
          ${s.enKotuSenaryoMu ? '<span style="font-size:11px; color:#b91c1c; background:#fee2e2; border-radius:6px; padding:1px 6px;">En Kötü Makul Senaryo</span>' : ''}
        </div>
        <div style="font-size:12px; color:var(--metin-soluk);">${_pdKacir(s.olayinTanimi)}</div>
      </span>
    </label>
  `).join('');
}

function senaryoSablonlariEkleTiklandi() {
  const sablonIdleri = Array.from(document.querySelectorAll('#senaryoSablonListesi [data-sablon-id]:checked')).map(cb => cb.getAttribute('data-sablon-id'));
  if (!sablonIdleri.length) { alert('Lütfen en az bir şablon seçin.'); return; }
  const sonuc = acilDurumSenaryolariSablonlardanEkle(sablonIdleri);
  senaryoSablonModalKapat();
  senaryolariCiz(document.getElementById('senaryoAramaKutusu').value);
  alert(`${sonuc.eklenen} senaryo envantere eklendi.` + (sonuc.hatalar.length ? `\nEklenemeyenler: ${sonuc.hatalar.join(', ')}` : ''));
}

// ==================== EKİP TANIMLARI ====================

function ekipTanimlariniCiz() {
  const govde = document.getElementById('ekipTanimiTabloGovde');
  const bosDurum = document.getElementById('ekipTanimiBosDurum');
  const liste = ekipTanimlariGetir();

  govde.innerHTML = '';
  if (!liste.length) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = 'Henüz ekip tanımı eklenmedi.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  liste.forEach(et => {
    const satir = document.createElement('tr');
    satir.innerHTML = `
      <td>${_pdKacir(et.ekipTuru)}</td>
      <td style="max-width:220px; white-space:normal;">${_pdKacir(et.mudahaleSiniri) || '-'}</td>
      <td style="max-width:260px; white-space:normal;">${_pdKacir(et.gorevTanimi) || '-'}</td>
      <td>
        <button class="tablo-buton" data-duzenle="${et.id}">Düzenle</button>
        <button class="tablo-buton sil" data-sil="${et.id}">Sil</button>
      </td>
    `;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-duzenle]').forEach(btn => btn.addEventListener('click', () => ekipTanimiModalAc(ekipTanimiIdIleGetirRepo(btn.getAttribute('data-duzenle')))));
  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', async () => {
    if (await onayModali('Bu ekip tanımını silmek istediğinize emin misiniz?', 'Sil')) { ekipTanimiSil(btn.getAttribute('data-sil')); ekipTanimlariniCiz(); }
  }));
}

function ekipTanimiModalAc(ekipTanimi) {
  _duzenlenenEkipTanimiId = ekipTanimi ? ekipTanimi.id : null;
  document.getElementById('ekipTanimiModalBaslik').textContent = ekipTanimi ? 'Ekip Tanımını Düzenle' : 'Yeni Ekip Tanımı';
  document.getElementById('etEkipTuru').innerHTML = EKIP_TURLERI.map(t => `<option ${ekipTanimi && ekipTanimi.ekipTuru === t ? 'selected' : ''}>${t}</option>`).join('');
  document.getElementById('etEkipmanListesi').value = ekipTanimi ? ekipTanimi.ekipmanListesi.join('\n') : '';
  document.getElementById('etMudahaleSiniri').value = ekipTanimi ? ekipTanimi.mudahaleSiniri : '';
  document.getElementById('etHaberlesmeYontemi').value = ekipTanimi ? ekipTanimi.haberlesmeYontemi : '';
  document.getElementById('etGorevTanimi').value = ekipTanimi ? ekipTanimi.gorevTanimi : '';
  document.getElementById('etEgitimGereksinimi').value = ekipTanimi ? ekipTanimi.egitimGereksinimi : '';
  temizleFormHatalari('ekipTanimiForm');
  document.getElementById('ekipTanimiModalKatman').classList.add('acik');
}

function ekipTanimiModalKapat() {
  document.getElementById('ekipTanimiModalKatman').classList.remove('acik');
  _duzenlenenEkipTanimiId = null;
}

function ekipTanimiFormGonderildi(e) {
  e.preventDefault();
  temizleFormHatalari('ekipTanimiForm');

  const veriler = {
    ekipTuru: document.getElementById('etEkipTuru').value,
    ekipmanListesi: document.getElementById('etEkipmanListesi').value,
    mudahaleSiniri: document.getElementById('etMudahaleSiniri').value,
    haberlesmeYontemi: document.getElementById('etHaberlesmeYontemi').value,
    gorevTanimi: document.getElementById('etGorevTanimi').value,
    egitimGereksinimi: document.getElementById('etEgitimGereksinimi').value
  };

  const sonuc = _duzenlenenEkipTanimiId ? ekipTanimiGuncelle(_duzenlenenEkipTanimiId, veriler) : ekipTanimiEkle(veriler);
  if (!sonuc.basarili) { formHatalariniGoster(sonuc.hatalar, 'et'); return; }

  ekipTanimiModalKapat();
  ekipTanimlariniCiz();
}

// ==================== KOMUTA YAPISI ====================

function komutaPozisyonlariniCiz() {
  const govde = document.getElementById('komutaPozisyonuTabloGovde');
  const bosDurum = document.getElementById('komutaPozisyonuBosDurum');
  const liste = komutaPozisyonlariGetir();

  govde.innerHTML = '';
  if (!liste.length) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = 'Henüz komuta pozisyonu eklenmedi. "Standart Yapıyı Oluştur" ile başlayabilirsiniz.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  liste.forEach(p => {
    const ust = liste.find(x => x.id === p.ustPozisyonId);
    const satir = document.createElement('tr');
    satir.innerHTML = `
      <td>${_pdKacir(p.pozisyonAdi)}</td>
      <td>${ust ? _pdKacir(ust.pozisyonAdi) : '-'}</td>
      <td>${_pdKacir(p.personelAdi) || '-'}</td>
      <td>${_pdKacir(p.yedekPersonelAdi) || '-'}</td>
      <td>${_pdKacir(p.vardiya)}</td>
      <td>${_pdKacir(p.telefon) || '-'}</td>
      <td>
        <button class="tablo-buton" data-duzenle="${p.id}">Düzenle</button>
        <button class="tablo-buton sil" data-sil="${p.id}">Sil</button>
      </td>
    `;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-duzenle]').forEach(btn => btn.addEventListener('click', () => komutaPozisyonuModalAc(komutaPozisyonuIdIleGetirRepo(btn.getAttribute('data-duzenle')))));
  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', async () => {
    if (await onayModali('Bu pozisyonu silmek istediğinize emin misiniz? Alt pozisyonlar varsa köke bağlanır.', 'Sil')) { komutaPozisyonuSil(btn.getAttribute('data-sil')); komutaPozisyonlariniCiz(); }
  }));
}

function komutaPozisyonuModalAc(pozisyon) {
  _duzenlenenKomutaPozisyonuId = pozisyon ? pozisyon.id : null;
  document.getElementById('komutaPozisyonuModalBaslik').textContent = pozisyon ? 'Pozisyonu Düzenle' : 'Yeni Pozisyon';
  document.getElementById('kpPozisyonAdi').value = pozisyon ? pozisyon.pozisyonAdi : '';

  const digerPozisyonlar = komutaPozisyonlariGetir().filter(p => !pozisyon || p.id !== pozisyon.id);
  document.getElementById('kpUstPozisyonId').innerHTML = '<option value="">— Yok (Kök) —</option>' +
    digerPozisyonlar.map(p => `<option value="${p.id}" ${pozisyon && pozisyon.ustPozisyonId === p.id ? 'selected' : ''}>${_pdKacir(p.pozisyonAdi)}</option>`).join('');

  const personeller = personelleriGetir('', false);
  const personelSecenekleri = '<option value="">— Personel seçiniz —</option>' + personeller.map(p => `<option value="${p.id}">${_pdKacir(p.adSoyad)} (${_pdKacir(p.sicilNo)})</option>`).join('');
  document.getElementById('kpPersonelId').innerHTML = personelSecenekleri;
  document.getElementById('kpYedekPersonelId').innerHTML = personelSecenekleri;
  if (pozisyon && pozisyon.personelId) document.getElementById('kpPersonelId').value = pozisyon.personelId;
  if (pozisyon && pozisyon.yedekPersonelId) document.getElementById('kpYedekPersonelId').value = pozisyon.yedekPersonelId;

  document.getElementById('kpVardiya').innerHTML = VARDIYALAR.map(v => `<option ${pozisyon && pozisyon.vardiya === v ? 'selected' : ''}>${v}</option>`).join('');
  document.getElementById('kpTelefon').value = pozisyon ? pozisyon.telefon : '';
  document.getElementById('kpGorevYetki').value = pozisyon ? pozisyon.gorevYetki : '';

  temizleFormHatalari('komutaPozisyonuForm');
  document.getElementById('komutaPozisyonuModalKatman').classList.add('acik');
}

function komutaPozisyonuModalKapat() {
  document.getElementById('komutaPozisyonuModalKatman').classList.remove('acik');
  _duzenlenenKomutaPozisyonuId = null;
}

function komutaPozisyonuFormGonderildi(e) {
  e.preventDefault();
  temizleFormHatalari('komutaPozisyonuForm');

  const personelSecim = personelIdIleGetirRepo(document.getElementById('kpPersonelId').value);
  const yedekPersonelSecim = personelIdIleGetirRepo(document.getElementById('kpYedekPersonelId').value);
  const veriler = {
    pozisyonAdi: document.getElementById('kpPozisyonAdi').value,
    ustPozisyonId: document.getElementById('kpUstPozisyonId').value || null,
    personelId: document.getElementById('kpPersonelId').value,
    personelAdi: personelSecim ? personelSecim.adSoyad : '',
    yedekPersonelId: document.getElementById('kpYedekPersonelId').value,
    yedekPersonelAdi: yedekPersonelSecim ? yedekPersonelSecim.adSoyad : '',
    vardiya: document.getElementById('kpVardiya').value,
    telefon: document.getElementById('kpTelefon').value,
    gorevYetki: document.getElementById('kpGorevYetki').value
  };

  const sonuc = _duzenlenenKomutaPozisyonuId ? komutaPozisyonuGuncelle(_duzenlenenKomutaPozisyonuId, veriler) : komutaPozisyonuEkle(veriler);
  if (!sonuc.basarili) { formHatalariniGoster(sonuc.hatalar, 'kp'); return; }

  komutaPozisyonuModalKapat();
  komutaPozisyonlariniCiz();
}

async function komutaStandartOlusturTiklandi() {
  if (!(await onayModali('Standart komuta yapısı (Acil Durum Yöneticisi → Olay Komutanı → 7 sorumlu pozisyon) oluşturulsun mu? Bu, mevcut pozisyon yoksa çalışır.', 'Oluştur'))) return;
  const sonuc = komutaYapisiStandartOlustur();
  if (!sonuc.basarili) { alert(sonuc.hata); return; }
  komutaPozisyonlariniCiz();
}
