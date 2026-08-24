// Olay/Kaza ekranının DOM işlemleri.

let _okGorunum = 'kayitlar';
let _duzenlenenKayitId = null;
let _aksiyonTaslak = [];
let _kronolojiTaslak = [];
let _tanikTaslak = [];
let _olayFotograflari = [];

// Olay yeri fotoğrafları önizlemesi — kurul modülündeki _kararFotoEkOnizlemeCiz
// ile aynı desen (bkz. modules/kurul/toplanti-ui.js), en fazla 3 fotoğraf.
// İlgili Mevzuat — MEVZUAT_LISTESI'nden checkbox ızgarası üretir; kayıt hâlâ
// tek bir newline-join string (ilgiliMevzuat) olarak saklanır, listede
// olmayan maddeler "Diğer" kutusunda ayrıca tutulur (bkz. model.js MEVZUAT_LISTESI).
function _mevzuatKutulariOlustur() {
  const kutu = document.getElementById('mevzuatListesi');
  kutu.innerHTML = MEVZUAT_LISTESI.map(m => `
    <label style="display:flex; align-items:flex-start; gap:6px; font-weight:400; font-size:13px; margin:0;">
      <input type="checkbox" data-mevzuat-kutu value="${m.replace(/"/g, '&quot;')}" style="width:auto; margin-top:3px;">
      <span>${m}</span>
    </label>
  `).join('');
}

function _mevzuatSeciliDoldur(satirlar) {
  const kutuListesi = new Set(MEVZUAT_LISTESI);
  document.querySelectorAll('#mevzuatListesi [data-mevzuat-kutu]').forEach(kutu => {
    kutu.checked = satirlar.includes(kutu.value);
  });
  document.getElementById('ilgiliMevzuatDiger').value = satirlar.filter(s => !kutuListesi.has(s)).join('\n');
}

function _mevzuatSecilenleriTopla() {
  const secilen = Array.from(document.querySelectorAll('#mevzuatListesi [data-mevzuat-kutu]:checked')).map(k => k.value);
  const diger = document.getElementById('ilgiliMevzuatDiger').value.split('\n').map(s => s.trim()).filter(Boolean);
  return secilen.concat(diger).join('\n');
}

function _olayFotoOnizlemeCiz() {
  const kutu = document.getElementById('olayFotoOnizleme');
  kutu.innerHTML = _olayFotograflari.map((f, i) => `
    <div style="display:inline-flex; flex-direction:column; align-items:center; gap:4px; margin:0 10px 10px 0;">
      <img data-foto-ref="${f.url}" style="width:64px; height:64px; object-fit:cover; border-radius:8px; border:1px solid var(--kenarlik);">
      <button type="button" data-foto-kaldir="${i}" class="tablo-buton sil">Kaldır</button>
    </div>
  `).join('') + (_olayFotograflari.length ? '' : '<div style="font-size:12px; color:var(--metin-soluk);">Henüz fotoğraf eklenmedi.</div>')
    + (_olayFotograflari.length >= 3 ? '<div style="font-size:12px; color:var(--metin-soluk);">En fazla 3 fotoğraf eklenebilir.</div>' : '');
  kutu.querySelectorAll('[data-foto-kaldir]').forEach(btn => {
    btn.addEventListener('click', () => {
      _olayFotograflari.splice(Number(btn.getAttribute('data-foto-kaldir')), 1);
      _olayFotoOnizlemeCiz();
    });
  });
  fotoReferanslariCoz(kutu);
}

function okRozetSinifAdi(durum) {
  if (durum === 'Kapalı') return 'tamamlandi';
  return 'planlandi';
}

function _jsonDosyaOlarakIndir(veri, dosyaAdi) {
  const blob = new Blob([JSON.stringify(veri, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = dosyaAdi;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Eski "KazaPaneli" aracının JSON yedeğiyle uyumlu (schema: "bagfas-kaza-v3"):
// { meta:{...}, settings:{...}, accidents:[...] }. Alan adları risk360'ınkiyle
// neredeyse birebir aynı; tek farklar fkP (-> fkO), createdAt (-> olusturmaTarihi)
// ve why5'in bazı kayıtlarda 5'ten az eleman taşıyabilmesi. "id" (ör. "KZ-2026-001")
// hem benzersiz kimlik hem de kayıt no olarak korunur — tekrar yüklendiğinde
// aynı kayıtlar id eşleşmesiyle otomatik atlanır.
function _eskiKazaPaneliKaydiEsle(r) {
  const why5 = Array.isArray(r.why5) ? r.why5.slice(0, 5) : [];
  while (why5.length < 5) why5.push('');
  return Object.assign({}, r, {
    id: r.id || undefined,
    kayitNo: r.id || r.kayitNo || '',
    fkO: r.fkP != null ? r.fkP : (r.fkO || ''),
    olusturmaTarihi: r.createdAt || r.olusturmaTarihi || new Date().toISOString(),
    why5
  });
}

function olayKazaSayfasiniBaslat() {
  document.getElementById('sekmeKayitlar').addEventListener('click', () => gorunumDegistir('kayitlar'));
  document.getElementById('sekmeRCA').addEventListener('click', () => gorunumDegistir('rca'));

  _mevzuatKutulariOlustur();
  document.getElementById('yeniKayitBtn').addEventListener('click', () => kayitModalAc());
  document.getElementById('modalKapatBtn').addEventListener('click', kayitModalKapat);
  document.getElementById('modalIptalBtn').addEventListener('click', kayitModalKapat);
  document.getElementById('kayitForm').addEventListener('submit', formGonderildi);
  document.getElementById('olayFotoDosya').addEventListener('change', async e => {
    const dosya = e.target.files[0];
    e.target.value = '';
    if (!dosya) return;
    if (_olayFotograflari.length >= 3) { alert('Bu kayda zaten 3 fotoğraf eklenmiş. Fazlası eklenemez.'); return; }
    try {
      const sonuc = await fotoYukle(dosya, 'olay-kaza/' + (_duzenlenenKayitId || 'gecici'));
      _olayFotograflari.push({ url: sonuc.url });
      _olayFotoOnizlemeCiz();
    } catch (hata) {
      alert(hata.message || 'Fotoğraf yüklenemedi.');
    }
  });
  document.getElementById('aramaKutusu').addEventListener('input', e => kayitlariCiz(e.target.value));
  document.getElementById('olayTipiFiltre').addEventListener('change', () => {
    kayitlariCiz(document.getElementById('aramaKutusu').value);
    _okHizliTipButonDurumunuGuncelle();
  });
  document.getElementById('durumFiltre').addEventListener('change', () => kayitlariCiz(document.getElementById('aramaKutusu').value));
  // Ramak Kala / Tehlike Bildirimi / İş Kazaları listelerine tek tıkla
  // ulaşmak için (kullanıcı isteği) — "Olay Tipi" dropdown'ını o değere
  // ayarlayıp aynı filtrelemeyi tetikler; zaten seçiliyse tekrar tıklamak
  // filtreyi kaldırır.
  document.getElementById('isKazasiFiltreBtn').addEventListener('click', () => _okHizliTipFiltreUygula('is-kazasi'));
  document.getElementById('ramakKalaFiltreBtn').addEventListener('click', () => _okHizliTipFiltreUygula('Ramak Kala'));
  document.getElementById('tehlikeBildirimFiltreBtn').addEventListener('click', () => _okHizliTipFiltreUygula('Tehlike Bildirimi'));
  // Sahadaki barkodu okutunca açılan AYNI sayfa (ramak-kala-bildir.html) —
  // kullanıcı isteği: ofisten/masabaşından da aynı basit formla bildirim
  // girilebilsin, tam kaza formunu doldurmaya gerek kalmasın. Yeni sekmede
  // açılır ki liste ekranındaki mevcut filtre/arama durumu kaybolmasın.
  document.getElementById('ramakKalaBildirBtn').addEventListener('click', () => {
    const firma = aktifFirmaGetir();
    if (!firma) return;
    window.open('../../ramak-kala-bildir.html?firma=' + encodeURIComponent(firma.slug), '_blank');
  });

  document.getElementById('temelOlayTipi').addEventListener('change', _okKisiBolumleriniGuncelle);
  document.getElementById('kisiPersonelId').addEventListener('change', kisiPersonelSecildi);
  ['fkO', 'fkF', 'fkS'].forEach(id => document.getElementById(id).addEventListener('change', fineKinneyHesabiCiz));
  document.getElementById('aksiyonEkleBtn').addEventListener('click', aksiyonSatiriEkle);
  document.getElementById('kronolojiEkleBtn').addEventListener('click', kronolojiSatiriEkle);
  document.getElementById('tanikEkleBtn').addEventListener('click', tanikSatiriEkle);

  // Kayıt formu çok kalabalık geldiği için bölümler katlanabilir yapıldı —
  // veri modeli/doğrulama/PDF raporu hiç değişmedi, sadece Temel Bilgiler/
  // Kişi Bilgileri/Olay Anlatımı (zorunlu alanları taşıyanlar) açık başlar,
  // gerçek bir kaza araştırmasında ikincil sayılan bölümler (sınıflandırma,
  // Fine-Kinney, kök neden, Bowtie, aksiyonlar, kapanış) kapalı başlar.
  document.querySelectorAll('#kayitForm [data-bolum-toggle]').forEach(baslik => {
    baslik.addEventListener('click', () => {
      baslik.classList.toggle('kapali');
      const icerik = baslik.nextElementSibling;
      if (icerik && icerik.classList.contains('form-bolum-icerik')) icerik.classList.toggle('kapali');
    });
  });

  document.getElementById('yillikCalismaSaati').addEventListener('change', ayarKaydet);

  document.getElementById('sablonIndirBtn').addEventListener('click', () => {
    excelSablonIndir(OLAY_IMPORT_KOLONLARI, 'olay_kaza_sablonu.xlsx');
  });
  document.getElementById('disaAktarBtn').addEventListener('click', () => {
    excelDisaAktar(olayKayitlariniGetir('', {}), OLAY_EXPORT_KOLONLARI, 'olay_kaza_kayitlari.xlsx');
  });
  document.getElementById('listeYazdirBtn').addEventListener('click', () => {
    const filtreler = {
      olayTipi: _okOlayTipiFiltreDegeri(),
      durum: document.getElementById('durumFiltre').value
    };
    raporListesiYazdir('Olay / Kaza Kayıtları', '', OLAY_EXPORT_KOLONLARI, olayKayitlariniGetir(document.getElementById('aramaKutusu').value, filtreler));
  });
  document.getElementById('iceAktarBtn').addEventListener('click', () => document.getElementById('iceAktarDosya').click());
  document.getElementById('iceAktarDosya').addEventListener('change', e => {
    const dosya = e.target.files[0];
    excelIceAktar(dosya, OLAY_IMPORT_KOLONLARI, (satirlar, hataMesaji) => {
      e.target.value = '';
      if (hataMesaji) { alert(hataMesaji); return; }
      satirlar.forEach(satir => { satir.kazaTarihi = excelTarihiNormallestir(satir.kazaTarihi); });
      const sonuc = excelToplulIceAktarSonucOzetle(satirlar, olayKaydiEkle);
      alert(excelIceAktarOzetMesaji(sonuc));
      kayitlariCiz(document.getElementById('aramaKutusu').value);
    });
  });

  document.getElementById('jsonDisaAktarBtn').addEventListener('click', () => {
    const filtreler = {
      olayTipi: _okOlayTipiFiltreDegeri(),
      durum: document.getElementById('durumFiltre').value
    };
    const veri = olayKayitlariniJsonaAktar(document.getElementById('aramaKutusu').value, filtreler);
    _jsonDosyaOlarakIndir(veri, 'olay_kaza_kayitlari.json');
  });
  document.getElementById('formAyarlariBtn').addEventListener('click', () => formAyarlariModalAc('olay-kaza', 'Olay / Kaza Takibi'));
  document.getElementById('jsonIceAktarBtn').addEventListener('click', () => document.getElementById('jsonIceAktarDosya').click());
  document.getElementById('jsonIceAktarDosya').addEventListener('change', async e => {
    const dosya = e.target.files[0];
    e.target.value = '';
    if (!dosya) return;
    let veri;
    try {
      veri = JSON.parse(await dosya.text());
    } catch (hata) {
      alert('JSON dosyası okunamadı: ' + (hata.message || hata));
      return;
    }
    let kayitlar = Array.isArray(veri) ? veri : (veri.kayitlar || veri.accidents);
    if (!Array.isArray(kayitlar)) {
      alert('Tanınmayan dosya biçimi: "kayitlar" ya da "accidents" listesi bulunamadı.');
      return;
    }
    // Eski KazaPaneli aracının çıktısı (schema: "bagfas-kaza-v3") "accidents"
    // altında gelir ve birkaç alan adı farklıdır — otomatik eşlenir.
    if (!Array.isArray(veri.kayitlar) && Array.isArray(veri.accidents)) {
      kayitlar = kayitlar.map(_eskiKazaPaneliKaydiEsle);
    }
    if (!(await onayModali(`${kayitlar.length} olay/kaza kaydı içe aktarılacak. Devam edilsin mi?`, 'İçe Aktar'))) return;

    const dugme = document.getElementById('jsonIceAktarBtn');
    const eskiMetin = dugme.textContent;
    dugme.disabled = true;
    dugme.textContent = 'İçe aktarılıyor...';
    try {
      const sonuc = await olayKayitlariniJsondanIceAktar(kayitlar);
      let mesaj = `${sonuc.basarili} kayıt içe aktarıldı.`;
      if (sonuc.yinelenenSayisi > 0) mesaj += `\n${sonuc.yinelenenSayisi} kayıt zaten mevcut olduğu için atlandı.`;
      if (sonuc.basarisizSayisi > 0) mesaj += `\n${sonuc.basarisizSayisi} kayıt eklenemedi:\n` + sonuc.hatalar.slice(0, 10).join('\n');
      if (!sonuc.bulutBasarili) mesaj += '\nUYARI: Buluta yazılamadı.';
      alert(mesaj);
      kayitlariCiz(document.getElementById('aramaKutusu').value);
    } catch (hata) {
      console.error(hata);
      alert('İçe aktarım sırasında beklenmeyen bir hata oluştu: ' + (hata.message || hata));
    } finally {
      dugme.disabled = false;
      dugme.textContent = eskiMetin;
    }
  });

  gorunumDegistir('kayitlar');
}

const OLAY_IMPORT_KOLONLARI = [
  { anahtar: 'olayTipi', baslik: 'Olay Tipi' },
  { anahtar: 'kazaTarihi', baslik: 'Tarih' },
  { anahtar: 'kazaSaati', baslik: 'Saat' },
  { anahtar: 'bolum', baslik: 'Bölüm' },
  { anahtar: 'kazaYeri', baslik: 'Kaza Yeri' },
  { anahtar: 'adSoyad', baslik: 'Ad Soyad' },
  { anahtar: 'sicilNo', baslik: 'Sicil No' },
  { anahtar: 'gorev', baslik: 'Görev' },
  { anahtar: 'yaralanmaTuru', baslik: 'Yaralanma Türü' },
  { anahtar: 'aciklama', baslik: 'Açıklama' }
];

const OLAY_EXPORT_KOLONLARI = [
  { anahtar: 'kayitNo', baslik: 'Kayıt No' },
  { anahtar: 'olayTipi', baslik: 'Olay Tipi' },
  { anahtar: 'kazaTarihi', baslik: 'Tarih' },
  { anahtar: 'bolum', baslik: 'Bölüm' },
  { anahtar: 'adSoyad', baslik: 'Ad Soyad' },
  { anahtar: 'yaralanmaTuru', baslik: 'Yaralanma Türü' },
  { anahtar: 'fkRP', baslik: 'Fine-Kinney RP' },
  { anahtar: 'durum', baslik: 'Durum' }
];

function gorunumDegistir(gorunum) {
  _okGorunum = gorunum;
  document.getElementById('sekmeKayitlar').classList.toggle('sekme-seciliDegil', gorunum !== 'kayitlar');
  document.getElementById('sekmeRCA').classList.toggle('sekme-seciliDegil', gorunum !== 'rca');
  document.getElementById('bolum-kayitlar').style.display = gorunum === 'kayitlar' ? '' : 'none';
  document.getElementById('bolum-rca').style.display = gorunum === 'rca' ? '' : 'none';

  if (gorunum === 'kayitlar') kayitlariCiz('');
  else rcaOzetiCiz();
}

// ==================== KAYITLAR ====================

function _okHizliTipFiltreUygula(tip) {
  const secim = document.getElementById('olayTipiFiltre');
  secim.value = secim.value === tip ? '' : tip;
  kayitlariCiz(document.getElementById('aramaKutusu').value);
  _okHizliTipButonDurumunuGuncelle();
}

function _okHizliTipButonDurumunuGuncelle() {
  const secilen = document.getElementById('olayTipiFiltre').value;
  document.getElementById('isKazasiFiltreBtn').classList.toggle('filtre-aktif', secilen === 'is-kazasi');
  document.getElementById('ramakKalaFiltreBtn').classList.toggle('filtre-aktif', secilen === 'Ramak Kala');
  document.getElementById('tehlikeBildirimFiltreBtn').classList.toggle('filtre-aktif', secilen === 'Tehlike Bildirimi');
}

// "İş Kazaları" dropdown seçeneği tek bir olayTipi değil, yaralanma içeren
// tüm tipleri (İlk Yardım, Tıbbi Tedavi, LTI, DART, Ölüm — bkz. model.js
// OLAY_KISI_ZORUNLU_TIPLERI) birden kapsar; bu yüzden filtreler.olayTipi'ye
// geçmeden önce dizi olarak açılır (service.js buna göre güncellendi).
function _okOlayTipiFiltreDegeri() {
  const secilen = document.getElementById('olayTipiFiltre').value;
  return secilen === 'is-kazasi' ? OLAY_KISI_ZORUNLU_TIPLERI : secilen;
}

// Ramak Kala / Tehlike Bildirimi kayıtları artık barkod ile giriş
// yapılmadan (bkz. ramak-kala-bildir.html) da oluşturulabildiğinden, bölüm/
// isim gibi serbest metin alanları artık anonim/güvenilmeyen girdi
// içerebilir — tabloya yazdırılmadan önce kaçırılır (XSS'e karşı).
function _okKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// Olayın anlatımı (özellikle barkod ile gelen Ramak Kala/Tehlike
// Bildirimi kayıtlarında bölüm/kişi dışında tek gerçek içerik budur)
// listede hiç görünmüyordu, sadece Düzenle açılınca okunabiliyordu —
// kullanıcı isteği: "uygulama olay/kaza modül ekranında görmem lazım".
// Uygunsuzluk modülündeki .us-tanim-hucre ile aynı kırpma/tooltip deseni.
function _okAciklamaHucresiUret(k) {
  return `<div class="us-tanim-hucre" title="${_okKacir(k.aciklama)}">${_okKacir(k.aciklama) || '-'}</div>`;
}

function kayitlariCiz(aramaMetni) {
  const govde = document.getElementById('tabloGovde');
  const bosDurum = document.getElementById('bosDurum');
  const filtreler = {
    olayTipi: _okOlayTipiFiltreDegeri(),
    durum: document.getElementById('durumFiltre').value
  };
  const kayitlar = olayKayitlariniGetir(aramaMetni, filtreler);

  govde.innerHTML = '';
  if (kayitlar.length === 0) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = 'Eşleşen kayıt bulunamadı.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  kayitlar.forEach(k => {
    const satir = document.createElement('tr');
    const fotograflar = Array.isArray(k.olayYeriFotograflari) ? k.olayYeriFotograflari : [];
    const fotoHucresi = fotograflar.length
      ? `<img data-foto-ref="${_okKacir(fotograflar[0].url)}" style="width:40px; height:40px; object-fit:cover; border-radius:6px; border:1px solid var(--kenarlik);">${fotograflar.length > 1 ? `<span style="font-size:10px; color:var(--metin-soluk);"> +${fotograflar.length - 1}</span>` : ''}`
      : '-';
    satir.innerHTML = `
      <td>${_okKacir(k.kayitNo)}</td>
      <td>${_okKacir(k.olayTipi)}${OLAY_KISI_ZORUNLU_TIPLERI.includes(k.olayTipi) ? '<br><span class="genel-rozet rozet-kirmizi" style="font-size:10px;">İş Kazası</span>' : ''}</td>
      <td>${k.kazaTarihi}${k.kazaSaati ? ' ' + k.kazaSaati : ''}</td>
      <td>${_okKacir(k.bolum)}</td>
      <td>${_okKacir(k.adSoyad)}${k.personelFirmaId ? ' <span style="font-size:11px; color:var(--metin-soluk);">(' + _okKacir(_digerFirmaAdiGetir(k.personelFirmaId)) + ')</span>' : ''}</td>
      <td>${_okAciklamaHucresiUret(k)}</td>
      <td>${_okKacir(k.yaralanmaTuru) || '-'}</td>
      <td>${k.fkRP !== null ? k.fkRP : '-'}</td>
      <td>${fotoHucresi}</td>
      <td><span class="genel-rozet rozet-${okRozetSinifAdi(k.durum)}">${_okKacir(k.durum)}</span></td>
      <td>
        <button class="tablo-buton" data-duzenle="${k.id}">Düzenle</button>
        <button class="tablo-buton" data-rapor="${k.id}">Rapor PDF</button>
        <button class="tablo-buton" data-rapor-word="${k.id}">Rapor Word</button>
        <button class="tablo-buton sil" data-sil="${k.id}">Sil</button>
      </td>
    `;
    govde.appendChild(satir);
  });
  fotoReferanslariCoz(govde);

  govde.querySelectorAll('[data-duzenle]').forEach(btn => btn.addEventListener('click', () => kayitModalAc(olayKaydiIdIleGetirRepo(btn.getAttribute('data-duzenle')))));
  govde.querySelectorAll('[data-rapor]').forEach(btn => btn.addEventListener('click', async () => {
    try { await kazaRaporuPdfOlustur(btn.getAttribute('data-rapor')); } catch (hata) { console.error(hata); alert('PDF üretilemedi: ' + (hata.message || hata)); }
  }));
  govde.querySelectorAll('[data-rapor-word]').forEach(btn => btn.addEventListener('click', async () => {
    try { await kazaRaporuWordOlustur(btn.getAttribute('data-rapor-word')); } catch (hata) { console.error(hata); alert('Word raporu üretilemedi: ' + (hata.message || hata)); }
  }));
  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', async () => {
    if (await onayModali('Bu kaydı silmek istediğinize emin misiniz?', 'Sil')) { olayKaydiSil(btn.getAttribute('data-sil')); kayitlariCiz(document.getElementById('aramaKutusu').value); }
  }));
}

// kisiPersonelId seçim kutusundaki her <option>, personelin sicilNo/görev/işe
// giriş/bölüm/ad-soyad bilgisini data-* öznitelikleriyle ÜZERİNDE TAŞIR —
// seçim anında AYRICA bir depo okuması (senkron veya asenkron) yapılmaz.
// Bu bilinçli bir tasarım: diğer firmalardan gelen personel bulut aktifken
// (Firestore) her zaman anında/senkron okunamayabilir (bkz. core/data.js ->
// buyukVeriFirmadanOku, ağ gecikmesi veya geçici çevrimdışılık olabilir);
// liste zaten doldurulurken (bkz. digerFirmalardanPersonelleriGetir) veriyi
// bir kez başarıyla çekmişiz, o veriyi doğrudan option'a gömüp seçim anında
// tekrar bir kaynağa bel bağlamamak "sicil no ve görev gelmiyor" tipi
// senkronizasyon hatalarını kökten önler.
function _personelSecenekleriniCiz(tumPersonel, kayit) {
  const secim = document.getElementById('kisiPersonelId');
  const oncekiDeger = secim.value;
  const oncekiOption = secim.options[secim.selectedIndex];
  const oncekiFirmaId = oncekiOption ? oncekiOption.getAttribute('data-firma-id') : '';

  secim.innerHTML = '<option value="">— Personel seçiniz —</option>' +
    tumPersonel.map(p => {
      const kayitliSecim = kayit && kayit.personelId === p.id && (kayit.personelFirmaId || '') === p._firmaId;
      const kullaniciSecimi = !kayit && oncekiDeger === p.id && (oncekiFirmaId || '') === p._firmaId;
      const kacir = (v) => String(v || '').replace(/"/g, '&quot;');
      return `<option value="${p.id}" data-firma-id="${p._firmaId}" data-ad-soyad="${kacir(p.adSoyad)}" data-sicil-no="${kacir(p.sicilNo)}" data-gorev="${kacir(p.gorev)}" data-ise-giris="${kacir(p.iseGirisTarihi)}" data-bolum="${kacir(p.bolum)}" ${kayitliSecim || kullaniciSecimi ? 'selected' : ''}>${p.adSoyad} (${p.sicilNo})${p.isveren ? ' — ' + p.isveren : ''}${p._firmaAdi ? ' — ' + p._firmaAdi : ''}</option>`;
    }).join('');
}

function _digerFirmaAdiGetir(firmaId) {
  const firma = getFirmaById(firmaId);
  return firma ? firma.ad : 'diğer firma';
}

function kisiPersonelSecildi() {
  const secim = document.getElementById('kisiPersonelId');
  const o = secim.options[secim.selectedIndex];
  const varMi = o && o.value;
  document.getElementById('kisiSicilNo').value = varMi ? o.getAttribute('data-sicil-no') : '';
  document.getElementById('kisiGorev').value = varMi ? o.getAttribute('data-gorev') : '';
  document.getElementById('kisiIseGirisTarihi').value = varMi ? o.getAttribute('data-ise-giris') : '';
  if (varMi && !document.getElementById('temelBolum').value) {
    document.getElementById('temelBolum').value = o.getAttribute('data-bolum');
  }
}

function _secimDoldur(elId, secenekler, seciliDeger) {
  const el = document.getElementById(elId);
  el.innerHTML = '<option value="">— Seçiniz —</option>' + secenekler.map(s => `<option ${seciliDeger === s ? 'selected' : ''}>${s}</option>`).join('');
}

function _fkSecimDoldur(elId, secenekler, seciliDeger) {
  const el = document.getElementById(elId);
  el.innerHTML = '<option value="">— Seçiniz —</option>' + secenekler.map(s => `<option value="${s.deger}" ${String(seciliDeger) === String(s.deger) ? 'selected' : ''}>${s.etiket}</option>`).join('');
}

function fineKinneyHesabiCiz() {
  const o = document.getElementById('fkO').value;
  const f = document.getElementById('fkF').value;
  const s = document.getElementById('fkS').value;
  const kutu = document.getElementById('fkHesapKutusu');

  if (!o || !f || !s) { kutu.innerHTML = 'Risk puanını görmek için Olasılık, Frekans ve Şiddet seçiniz.'; return; }

  const puan = riskPuaniHesapla(o, f, s);
  const duzey = riskDuzeyiGetir(puan);
  kutu.innerHTML = `Fine-Kinney Risk Puanı: <strong>${puan}</strong> &nbsp; <span class="duzey-rozet duzey-${slugOlustur(duzey.etiket)}">${duzey.etiket}</span>`;
}

function aksiyonSatiriEkle() {
  _aksiyonTaslak.push(aksiyonOlustur({}));
  aksiyonListesiniCiz();
}

function aksiyonListesiniCiz() {
  const kutu = document.getElementById('aksiyonListesi');
  kutu.innerHTML = _aksiyonTaslak.map(a => `
    <div style="display:grid; grid-template-columns: 1.6fr 1.6fr 1fr 110px 110px 1fr 32px; gap:8px; align-items:start; margin-bottom:8px;">
      <input placeholder="Uygunsuzluk Tanımı" data-aksiyon-alan="baslik" data-aksiyon-id="${a.id}" value="${a.baslik.replace(/"/g, '&quot;')}">
      <input placeholder="Düzeltici Faaliyet" data-aksiyon-alan="duzelticiFaaliyet" data-aksiyon-id="${a.id}" value="${a.duzelticiFaaliyet.replace(/"/g, '&quot;')}">
      <input placeholder="Sorumlu" data-aksiyon-alan="sorumlu" data-aksiyon-id="${a.id}" value="${a.sorumlu.replace(/"/g, '&quot;')}">
      <input type="date" data-aksiyon-alan="termin" data-aksiyon-id="${a.id}" value="${a.termin}">
      <select data-aksiyon-alan="durum" data-aksiyon-id="${a.id}">
        ${AKSIYON_DURUMLARI.map(d => `<option ${a.durum === d ? 'selected' : ''}>${d}</option>`).join('')}
      </select>
      <input placeholder="Kanıt" data-aksiyon-alan="kanit" data-aksiyon-id="${a.id}" value="${a.kanit.replace(/"/g, '&quot;')}">
      <button type="button" class="tablo-buton sil" data-aksiyon-sil="${a.id}" title="Sil">✕</button>
    </div>
  `).join('') || '<p style="font-size:12px; color:var(--metin-soluk);">Henüz uygunsuzluk eklenmedi.</p>';

  kutu.querySelectorAll('[data-aksiyon-alan]').forEach(el => {
    el.addEventListener('input', () => {
      const a = _aksiyonTaslak.find(x => x.id === el.getAttribute('data-aksiyon-id'));
      if (a) a[el.getAttribute('data-aksiyon-alan')] = el.value;
    });
  });
  kutu.querySelectorAll('[data-aksiyon-sil]').forEach(btn => {
    btn.addEventListener('click', () => {
      _aksiyonTaslak = _aksiyonTaslak.filter(a => a.id !== btn.getAttribute('data-aksiyon-sil'));
      aksiyonListesiniCiz();
    });
  });
}

// Olay Kronolojisi — aksiyon listesiyle aynı taslak-düzenle deseni.
function kronolojiSatiriEkle() {
  _kronolojiTaslak.push(kronolojiSatiriOlustur({}));
  kronolojiListesiniCiz();
}

function kronolojiListesiniCiz() {
  const kutu = document.getElementById('kronolojiListesi');
  kutu.innerHTML = _kronolojiTaslak.map(k => `
    <div style="display:grid; grid-template-columns: 110px 1fr 32px; gap:8px; align-items:start; margin-bottom:8px;">
      <input type="time" data-kronoloji-alan="saat" data-kronoloji-id="${k.id}" value="${k.saat}">
      <input placeholder="Gelişme" data-kronoloji-alan="gelisme" data-kronoloji-id="${k.id}" value="${k.gelisme.replace(/"/g, '&quot;')}">
      <button type="button" class="tablo-buton sil" data-kronoloji-sil="${k.id}" title="Sil">✕</button>
    </div>
  `).join('') || '<p style="font-size:12px; color:var(--metin-soluk);">Henüz kronoloji satırı eklenmedi.</p>';

  kutu.querySelectorAll('[data-kronoloji-alan]').forEach(el => {
    el.addEventListener('input', () => {
      const k = _kronolojiTaslak.find(x => x.id === el.getAttribute('data-kronoloji-id'));
      if (k) k[el.getAttribute('data-kronoloji-alan')] = el.value;
    });
  });
  kutu.querySelectorAll('[data-kronoloji-sil]').forEach(btn => {
    btn.addEventListener('click', () => {
      _kronolojiTaslak = _kronolojiTaslak.filter(k => k.id !== btn.getAttribute('data-kronoloji-sil'));
      kronolojiListesiniCiz();
    });
  });
}

// Tanık İfadeleri — aynı desen.
function tanikSatiriEkle() {
  _tanikTaslak.push(tanikOlustur({}));
  tanikListesiniCiz();
}

function tanikListesiniCiz() {
  const kutu = document.getElementById('tanikListesi');
  kutu.innerHTML = _tanikTaslak.map(t => `
    <div style="display:grid; grid-template-columns: 1fr 1fr 2fr 32px; gap:8px; align-items:start; margin-bottom:8px;">
      <input placeholder="Ad Soyad" data-tanik-alan="adSoyad" data-tanik-id="${t.id}" value="${t.adSoyad.replace(/"/g, '&quot;')}">
      <input placeholder="Unvan" data-tanik-alan="unvan" data-tanik-id="${t.id}" value="${t.unvan.replace(/"/g, '&quot;')}">
      <input placeholder="İfade" data-tanik-alan="ifade" data-tanik-id="${t.id}" value="${t.ifade.replace(/"/g, '&quot;')}">
      <button type="button" class="tablo-buton sil" data-tanik-sil="${t.id}" title="Sil">✕</button>
    </div>
  `).join('') || '<p style="font-size:12px; color:var(--metin-soluk);">Henüz tanık ifadesi eklenmedi.</p>';

  kutu.querySelectorAll('[data-tanik-alan]').forEach(el => {
    el.addEventListener('input', () => {
      const t = _tanikTaslak.find(x => x.id === el.getAttribute('data-tanik-id'));
      if (t) t[el.getAttribute('data-tanik-alan')] = el.value;
    });
  });
  kutu.querySelectorAll('[data-tanik-sil]').forEach(btn => {
    btn.addEventListener('click', () => {
      _tanikTaslak = _tanikTaslak.filter(t => t.id !== btn.getAttribute('data-tanik-sil'));
      tanikListesiniCiz();
    });
  });
}

// Formda sorulan sorular olay tipine göre farklılaşsın diye (kullanıcı
// isteği) — Ramak Kala/Tehlike Bildirimi/Maddi Hasar/Çevresel Olay ve acil
// durum türü olaylarda (Yangın, Patlama vb.) yaralı olması beklenmez, bu
// yüzden "Kişi Bilgileri (Mağdur)" ve "Yaralanma Bilgileri" bölümleri hiç
// gösterilmez. Aynı ayrım zaten validation.js'te OLAY_KISI_ZORUNLU_TIPLERI
// ile "zorunlu mu" için kullanılıyordu — burada "gösterilsin mi" için de
// aynı liste kullanılır. Tip henüz seçilmemişse (yeni kayıt, boş seçim)
// bölümler görünür kalır, admin'i şaşırtacak şekilde önceden gizlenmez.
function _okKisiBolumleriniGuncelle() {
  const tip = document.getElementById('temelOlayTipi').value;
  const goster = !tip || OLAY_KISI_ZORUNLU_TIPLERI.includes(tip);
  ['kisiBilgileriBaslik', 'kisiBilgileriIcerik', 'yaralanmaBilgileriBaslik', 'yaralanmaBilgileriIcerik'].forEach(id => {
    document.getElementById(id).style.display = goster ? '' : 'none';
  });
}

function kayitModalAc(kayitHam) {
  // Model bu oturumda genişletildi (5N1K, kronoloji, tanık ifadeleri
  // vb. yeni alanlar eklendi) — bu alanlar eklenmeden ÖNCE oluşturulmuş eski
  // kayıtlarda bu alanlar hiç yok (undefined), bu da örn. kayit.kronoloji.map(...)
  // çağrısında "Cannot read properties of undefined" hatasıyla Düzenle'nin hiç
  // açılmamasına yol açıyordu. olayKaydiOlustur eksik her alana varsayılan
  // (boş dizi/metin) atadığından, eski kaydı buradan geçirmek onu güvenle
  // normalize eder; id (ve dolayısıyla düzenleme kimliği) korunur.
  const kayit = kayitHam ? olayKaydiOlustur(kayitHam) : null;
  _duzenlenenKayitId = kayit ? kayit.id : null;
  _aksiyonTaslak = kayit ? kayit.aksiyonlar.map(a => Object.assign({}, a)) : [];

  document.getElementById('modalBaslik').textContent = kayit ? (kayit.kayitNo + ' Kaydını Düzenle') : 'Yeni Olay/Kaza Kaydı';

  // Temel bilgiler
  document.getElementById('temelKayitNo').value = kayit ? (kayit.kayitNo || '') : '';
  _secimDoldur('temelOlayTipi', OLAY_TIPLERI, kayit ? kayit.olayTipi : '');
  _okKisiBolumleriniGuncelle();
  document.getElementById('temelKazaTarihi').value = kayit ? kayit.kazaTarihi : '';
  document.getElementById('temelKazaSaati').value = kayit ? kayit.kazaSaati : '';
  document.getElementById('temelBolum').value = kayit ? kayit.bolum : '';
  document.getElementById('temelKazaYeri').value = kayit ? kayit.kazaYeri : '';
  _olayFotograflari = kayit && Array.isArray(kayit.olayYeriFotograflari) ? kayit.olayYeriFotograflari.slice(0, 3) : [];
  _olayFotoOnizlemeCiz();

  // Kişi — kendi firmanın personeli HEMEN doldurulur; kullanıcının yönettiği
  // diğer firmalardaki personel bulut (Firestore) üzerinden tek seferlik
  // asenkron çekildiği için geldiğinde listeye eklenir (bkz.
  // digerFirmalardanPersonelleriGetir, core/data.js -> buyukVeriFirmadanOku).
  const kendiPersonel = personelleriGetir('', false).map(p => Object.assign({}, p, { _firmaId: '', _firmaAdi: '' }));
  _personelSecenekleriniCiz(kendiPersonel, kayit);
  digerFirmalardanPersonelleriGetir().then(digerPersonel => {
    _personelSecenekleriniCiz(kendiPersonel.concat(digerPersonel), kayit);
  });
  document.getElementById('kisiSicilNo').value = kayit ? kayit.sicilNo : '';
  document.getElementById('kisiGorev').value = kayit ? kayit.gorev : '';
  document.getElementById('kisiIseGirisTarihi').value = kayit ? kayit.iseGirisTarihi : '';
  document.getElementById('kisiYas').value = kayit && kayit.magdurYasi != null ? kayit.magdurYasi : '';

  // Olay Anlatımı (Kaza Özeti)
  document.getElementById('anlatimIsTanimi').value = kayit ? kayit.isTanimi : '';
  document.getElementById('anlatimAciklama').value = kayit ? kayit.aciklama : '';
  document.getElementById('anlatimPotansiyelSonuc').value = kayit ? kayit.potansiyelSonuc : '';
  document.getElementById('anlatimTehlikeliMadde').value = kayit ? kayit.tehlikeliMadde : '';
  document.getElementById('anlatimTanikSayisi').value = kayit && kayit.tanikSayisi != null ? kayit.tanikSayisi : '';

  // Yaralanma / Sınıflandırma
  _secimDoldur('siniflandirmaYaralanmaTuru', YARALANMA_TURLERI, kayit ? kayit.yaralanmaTuru : '');
  document.getElementById('siniflandirmaYaralananUzuv').value = kayit ? kayit.yaralananUzuv : '';
  document.getElementById('siniflandirmaKayipGun').value = kayit && kayit.kayipGun != null ? kayit.kayipGun : '';
  document.getElementById('siniflandirmaDartGun').value = kayit && kayit.dartGun != null ? kayit.dartGun : '';

  // Olay Kronolojisi
  _kronolojiTaslak = kayit ? kayit.kronoloji.map(k => Object.assign({}, k)) : [];
  kronolojiListesiniCiz();

  // Tanık İfadeleri
  _tanikTaslak = kayit ? kayit.tanikIfadeleri.map(t => Object.assign({}, t)) : [];
  tanikListesiniCiz();

  // Fine-Kinney
  _fkSecimDoldur('fkO', OLASILIK_SECENEKLERI, kayit ? kayit.fkO : '');
  _fkSecimDoldur('fkF', FREKANS_SECENEKLERI, kayit ? kayit.fkF : '');
  _fkSecimDoldur('fkS', SIDDET_SECENEKLERI, kayit ? kayit.fkS : '');
  fineKinneyHesabiCiz();

  // 5N1K Analizi
  document.getElementById('analiz5n1kNe').value = kayit ? kayit.analizNe : '';
  document.getElementById('analiz5n1kNerede').value = kayit ? kayit.analizNerede : '';
  document.getElementById('analiz5n1kNeZaman').value = kayit ? kayit.analizNeZaman : '';
  document.getElementById('analiz5n1kKim').value = kayit ? kayit.analizKim : '';
  document.getElementById('analiz5n1kNasil').value = kayit ? kayit.analizNasil : '';
  document.getElementById('analiz5n1kNeden').value = kayit ? kayit.analizNeden : '';

  // İlgili Mevzuat
  _mevzuatSeciliDoldur(kayit ? (kayit.ilgiliMevzuat || '').split('\n').map(s => s.trim()).filter(Boolean) : []);

  // Aksiyonlar (DÖF)
  aksiyonListesiniCiz();

  // Sonuç ve Değerlendirme
  document.getElementById('sonucDegerlendirme').value = kayit ? kayit.sonucDegerlendirme : '';

  // Rapor Bilgileri (Hazırlayan / Soruşturma Ekibi / Onaylayan)
  document.getElementById('raporHazirlayanAdi').value = kayit ? kayit.hazirlayanAdi : '';
  document.getElementById('raporHazirlayanUnvan').value = kayit ? kayit.hazirlayanUnvan : '';
  document.getElementById('raporEkipUyesiAdi').value = kayit ? kayit.ekipUyesiAdi : '';
  document.getElementById('raporEkipUyesiUnvan').value = kayit ? kayit.ekipUyesiUnvan : '';
  document.getElementById('raporOnaylayanAdi').value = kayit ? kayit.onaylayanAdi : '';
  document.getElementById('raporOnaylayanUnvan').value = kayit ? kayit.onaylayanUnvan : '';
  document.getElementById('raporKazaSinifi').value = kayit ? kayit.kazaSinifi : '';
  document.getElementById('raporSorusturmaBaslangic').value = kayit ? kayit.sorusturmaBaslangic : '';
  document.getElementById('raporSorusturmaBitis').value = kayit ? kayit.sorusturmaBitis : '';

  // Kapanış
  document.getElementById('kapanisTarihi').value = kayit ? kayit.kapanisTarihi : '';
  document.getElementById('kapanisDurum').innerHTML = OLAY_DURUMLARI.map(d => `<option ${kayit && kayit.durum === d ? 'selected' : ''}>${d}</option>`).join('');

  temizleFormHatalari();
  document.getElementById('modalKatman').classList.add('acik');
}

function kayitModalKapat() {
  document.getElementById('modalKatman').classList.remove('acik');
  _duzenlenenKayitId = null;
}

function temizleFormHatalari() {
  document.querySelectorAll('#kayitForm .alan-hatasi').forEach(el => el.textContent = '');
}

async function formGonderildi(e) {
  e.preventDefault();
  temizleFormHatalari();

  const personelSecim = document.getElementById('kisiPersonelId');
  const personelSecilenOption = personelSecim.options[personelSecim.selectedIndex];
  const personelFirmaId = (personelSecilenOption ? personelSecilenOption.getAttribute('data-firma-id') : '') || '';
  const personelAdSoyad = personelSecim.value ? personelSecilenOption.getAttribute('data-ad-soyad') : '';

  const veriler = {
    kayitNo: document.getElementById('temelKayitNo').value,
    olayTipi: document.getElementById('temelOlayTipi').value,
    kazaTarihi: document.getElementById('temelKazaTarihi').value,
    kazaSaati: document.getElementById('temelKazaSaati').value,
    bolum: document.getElementById('temelBolum').value,
    kazaYeri: document.getElementById('temelKazaYeri').value,
    olayYeriFotograflari: _olayFotograflari,

    personelId: personelSecim.value,
    personelFirmaId: personelFirmaId,
    adSoyad: personelAdSoyad || '',
    sicilNo: document.getElementById('kisiSicilNo').value,
    gorev: document.getElementById('kisiGorev').value,
    iseGirisTarihi: document.getElementById('kisiIseGirisTarihi').value,
    magdurYasi: document.getElementById('kisiYas').value,

    isTanimi: document.getElementById('anlatimIsTanimi').value,
    aciklama: document.getElementById('anlatimAciklama').value,
    potansiyelSonuc: document.getElementById('anlatimPotansiyelSonuc').value,
    tehlikeliMadde: document.getElementById('anlatimTehlikeliMadde').value,
    tanikSayisi: document.getElementById('anlatimTanikSayisi').value,

    yaralanmaTuru: document.getElementById('siniflandirmaYaralanmaTuru').value,
    yaralananUzuv: document.getElementById('siniflandirmaYaralananUzuv').value,
    kayipGun: document.getElementById('siniflandirmaKayipGun').value,
    dartGun: document.getElementById('siniflandirmaDartGun').value,

    kronoloji: _kronolojiTaslak.filter(k => k.gelisme.trim()),
    tanikIfadeleri: _tanikTaslak.filter(t => t.adSoyad.trim() || t.ifade.trim()),

    fkO: document.getElementById('fkO').value,
    fkF: document.getElementById('fkF').value,
    fkS: document.getElementById('fkS').value,

    analizNe: document.getElementById('analiz5n1kNe').value,
    analizNerede: document.getElementById('analiz5n1kNerede').value,
    analizNeZaman: document.getElementById('analiz5n1kNeZaman').value,
    analizKim: document.getElementById('analiz5n1kKim').value,
    analizNasil: document.getElementById('analiz5n1kNasil').value,
    analizNeden: document.getElementById('analiz5n1kNeden').value,

    ilgiliMevzuat: _mevzuatSecilenleriTopla(),

    aksiyonlar: _aksiyonTaslak.filter(a => a.baslik.trim() || a.duzelticiFaaliyet.trim()),

    sonucDegerlendirme: document.getElementById('sonucDegerlendirme').value,

    hazirlayanAdi: document.getElementById('raporHazirlayanAdi').value,
    hazirlayanUnvan: document.getElementById('raporHazirlayanUnvan').value,
    ekipUyesiAdi: document.getElementById('raporEkipUyesiAdi').value,
    ekipUyesiUnvan: document.getElementById('raporEkipUyesiUnvan').value,
    onaylayanAdi: document.getElementById('raporOnaylayanAdi').value,
    onaylayanUnvan: document.getElementById('raporOnaylayanUnvan').value,
    kazaSinifi: document.getElementById('raporKazaSinifi').value,
    sorusturmaBaslangic: document.getElementById('raporSorusturmaBaslangic').value,
    sorusturmaBitis: document.getElementById('raporSorusturmaBitis').value,

    kapanisTarihi: document.getElementById('kapanisTarihi').value,
    durum: document.getElementById('kapanisDurum').value
  };

  const sonuc = _duzenlenenKayitId ? olayKaydiGuncelle(_duzenlenenKayitId, veriler) : olayKaydiEkle(veriler);
  if (!sonuc.basarili) {
    Object.keys(sonuc.hatalar).forEach(alan => {
      const hataEl = document.getElementById(alan + 'Hata');
      if (hataEl) hataEl.textContent = sonuc.hatalar[alan];
    });
    return;
  }

  kayitModalKapat();
  kayitlariCiz(document.getElementById('aramaKutusu').value);

  if (sonuc.uyarilar && sonuc.uyarilar.length) {
    alert('Kayıt kaydedildi, ancak şu aktarımlar tamamlanamadı:\n\n' + sonuc.uyarilar.join('\n'));
  }
}

// ==================== RCA İSTATİSTİK ====================

function ayarKaydet() {
  olayAyarlariniKaydet({ yillikCalismaSaati: document.getElementById('yillikCalismaSaati').value });
  rcaOzetiCiz();
}

function rcaOzetiCiz() {
  const ayarlar = olayAyarlariniGetir();
  document.getElementById('yillikCalismaSaati').value = ayarlar.yillikCalismaSaati;

  const ozet = olayRCAOzetiHesapla();
  const kart = (etiket, deger) => `<div class="istatistik-kutu"><span>${etiket}</span><b>${deger}</b></div>`;
  const dagilimHtml = (baslik, satirlar) => `
    <div class="kart" style="margin-bottom:14px;">
      <div class="card-title" style="margin-bottom:8px;"><h3 style="margin:0; font-size:14px;">${baslik}</h3></div>
      ${satirlar.length
        ? satirlar.map(([k, v]) => `<div style="display:flex; justify-content:space-between; font-size:13px; padding:6px 0; border-bottom:1px solid var(--kenarlik);"><span>${k}</span><strong>${v}</strong></div>`).join('')
        : '<div class="bos-durum gorunur">Veri yok.</div>'}
    </div>
  `;

  document.getElementById('rcaKutusu').innerHTML = `
    <div class="istatistik-grid">
      ${kart('Toplam Kayıt', ozet.toplam)}
      ${kart('Kayıt Edilebilir Olay', ozet.oranlar.kayitEdilebilir)}
      ${kart('TRIR', ozet.oranlar.TRIR.toFixed(2))}
      ${kart('LTIFR', ozet.oranlar.LTIFR.toFixed(2))}
      ${kart('Şiddet Oranı', ozet.oranlar.siddetOrani.toFixed(2))}
      ${kart('DART Oranı', ozet.oranlar.DARTOrani.toFixed(2))}
      ${kart('Açık Aksiyon', ozet.acikAksiyonSayisi)}
      ${kart('Gecikmiş Aksiyon', ozet.gecikmisAksiyonSayisi)}
    </div>

    <div class="istatistik-grid" style="grid-template-columns: repeat(6, minmax(100px,1fr));">
      ${kart('Ramak Kala', ozet.oranlar.ramakKala)}
      ${kart('İlk Yardım', ozet.oranlar.ilkYardim)}
      ${kart('Tıbbi Tedavi', ozet.oranlar.tibbi)}
      ${kart('LTI', ozet.oranlar.lti)}
      ${kart('DART', ozet.oranlar.dart)}
      ${kart('Ölüm', ozet.oranlar.olum)}
    </div>

    <div class="modul-grid" style="grid-template-columns: repeat(auto-fill, minmax(260px,1fr));">
      <div>${dagilimHtml('Bölüme Göre', ozet.bolumeGore)}</div>
      <div>${dagilimHtml('Kişiye Göre', ozet.kisiyeGore)}</div>
      <div>${dagilimHtml('Olay Tipine Göre', ozet.olayTipineGore)}</div>
      <div>${dagilimHtml('Yaralanma Türüne Göre', ozet.yaralanmaTurune)}</div>
      <div>${dagilimHtml('Tehlikeli Maddeye Göre', ozet.tehlikeliMaddeyeGore)}</div>
      <div>${dagilimHtml('Aylık Trend', ozet.aylikTrend)}</div>
    </div>

    <div class="card-title" style="margin:20px 0 8px;"><h3 style="margin:0; font-size:14px;">En Yüksek Fine-Kinney Riskli Olaylar</h3></div>
    <div class="tablo-scroll">
      <table class="veri-tablosu">
        <thead><tr><th>Kayıt No</th><th>Bölüm</th><th>Olay Tipi</th><th>Fine-Kinney RP</th></tr></thead>
        <tbody>
          ${ozet.yuksekRiskliler.map(k => `<tr><td>${k.kayitNo}</td><td>${k.bolum}</td><td>${k.olayTipi}</td><td>${k.fkRP}</td></tr>`).join('') || '<tr><td colspan="4">Fine-Kinney puanlanmış kayıt yok.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

