// Yüklenici Yönetimi — Kayıtlar sekmesi dışa aktarımları (4 Excel varyantı +
// PDF). Eski uygulamadaki (isg1/yuklenici-standalone.html) karşılıklarıyla
// birebir içerik/sütun/sıralama eşleşmesi hedeflenir.
//
// NOT: Eski uygulamada "Girebileceği Son Tarih" için AYNI isimde İKİ FARKLI
// fonksiyon tanımlıydı (satır 2896 — SGK/Adli Sicil kontrolsüz, Excel'de
// kullanılan; satır 3371 — SGK/Adli Sicil kontrollü + İlk Giriş dallı, PDF'te
// kullanılan). Aynı scope'ta `function` sonra `const` ile yeniden tanımlamak
// JS'te SyntaxError'dır — muhtemelen dosyanın bu hâli hiç çalışmamış/test
// edilmemiş bir ara sürüm. Bu belirsizlik yüzünden burada HER İKİ dışa
// aktarımda da (Excel ve PDF) daha eksiksiz olan tek kural kullanıldı:
// yukleniciGirebilecegiSonTarihHesapla (model.js).

function _yukleniciKimlikGoster(satir) {
  return satir.kimlik;
}

// PDF'in HTML ara temsili için kaçış — yuklenici modülünde ui.js'te bir
// eşdeğeri yok, burada yerelde tanımlandı.
function _yukleniciKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// ---- 1) Tüm Kayıtları Excel'e Aktar ----
function yukleniciTumKayitlariExcelAktar() {
  xlsxHazirOlduğunda(() => {
    const kisiler = yukleniciKisileriTumunuGetir();
    if (!kisiler.length) { alert('Aktarılacak kayıt bulunamadı.'); return; }

    const excelData = [
      ['İSG ONAYLI YÜKLENİCİ PERSONEL LİSTESİ'],
      [],
      ['Firma', 'Personel', 'Sağlık Muayene Son Tarih', 'Temel İSG Eğitimi Son Tarih', 'Firma Eğitimi Son Tarih', 'Girebileceği Son Tarih']
    ];

    kisiler.forEach(k => {
      const belgeler = k.belgeler || {};
      const saglikExp = yukleniciBelgeBitisTarihiHesapla(yukleniciBelgeTanimiGetir('saglik'), belgeler.saglik || {}, k.tehlikeSinifi);
      const isgExp = yukleniciBelgeBitisTarihiHesapla(yukleniciBelgeTanimiGetir('temelIsg'), belgeler.temelIsg || {}, k.tehlikeSinifi);
      const feExp = yukleniciBelgeBitisTarihiHesapla(yukleniciBelgeTanimiGetir('firmaEgitimi'), belgeler.firmaEgitimi || {}, k.tehlikeSinifi);
      const girisSonuc = yukleniciGirebilecegiSonTarihHesapla(k, bugunIso());

      excelData.push([
        k.firmaAdi || '',
        k.adSoyad || '',
        saglikExp ? formatTarihGoster(saglikExp) : 'YOK',
        isgExp ? formatTarihGoster(isgExp) : 'YOK',
        feExp ? formatTarihGoster(feExp) : 'YOK',
        `${girisSonuc.sonTarih ? formatTarihGoster(girisSonuc.sonTarih) : '-'} | ${girisSonuc.durumMetni}`
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(excelData);
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
    ws['!cols'] = [{ wch: 26 }, { wch: 26 }, { wch: 22 }, { wch: 24 }, { wch: 22 }, { wch: 30 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'İSG_Kontrol');
    XLSX.writeFile(wb, 'ISG_Kontrol_Listesi.xlsx');
  });
}

// ---- 2) Tam Uygun Olanlar (Excel) ----
function yukleniciUygunKayitlariExcelAktar() {
  xlsxHazirOlduğunda(() => {
    const kayitlar = yukleniciKayitlariniGetir('').filter(r => r.sinif === 'row-ok');
    if (!kayitlar.length) { alert('Tam uygun (yeşil) kayıt bulunamadı.'); return; }

    const rows = kayitlar.map(r => ({ 'Tür': r.tur, 'Firma': r.firma, 'Ad/Kimlik': r.kimlik }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Uygun_Olanlar');
    XLSX.writeFile(wb, 'uygun_olanlar.xlsx');
  });
}

// ---- 3) Uygun Olmayanlar (Excel) ----
function _yukleniciUygunOlmayanBelgelerListesi(satir) {
  if (satir.kind === 'personel') {
    const kisi = satir.kaynak;
    const belgeler = kisi.belgeler || {};
    return yukleniciGecerliBelgeTanimlari(kisi.personelTuru)
      .filter(b => b.id !== 'firmaEgitimi')
      .filter(b => !yukleniciBelgeUygunMu(b, belgeler[b.id], kisi.tehlikeSinifi, bugunIso()))
      .map(b => b.ad)
      .join(', ');
  }
  const arac = satir.kaynak;
  const belgeler = [];
  if (!arac.ptmOk) belgeler.push('Periyodik Teknik Muayene');
  if (!arac.ruhsatOk) belgeler.push('Ruhsat');
  if (!arac.zmsOk) belgeler.push('Zorunlu Mali Sorumluluk Sigortası');
  if (!arac.tuvOk) belgeler.push('TÜVTÜRK Muayenesi');
  return belgeler.join(', ');
}

function yukleniciUygunOlmayanKayitlariExcelAktar() {
  xlsxHazirOlduğunda(() => {
    const kayitlar = yukleniciKayitlariniGetir('').filter(r => r.sinif !== 'row-ok');
    if (!kayitlar.length) { alert('Uygun olmayan (kırmızı/sarı) kayıt bulunamadı.'); return; }

    const rows = kayitlar.map(r => ({
      'Tür': r.tur, 'Firma': r.firma, 'Ad/Kimlik': r.kimlik,
      'Uygun Olmayan Belgeler': _yukleniciUygunOlmayanBelgelerListesi(r)
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Uygun_Olmayanlar');
    XLSX.writeFile(wb, 'uygun_olmayanlar.xlsx');
  });
}

// ---- 4) Detaylı Excel (Kriterli) ----
function yukleniciDetayliExcelAktar() {
  xlsxHazirOlduğunda(() => {
    const kisiler = yukleniciKisileriTumunuGetir();
    if (!kisiler.length) { alert('Aktarılacak personel kaydı yok.'); return; }

    const rows = kisiler.map(k => {
      const belgeler = k.belgeler || {};
      const kritik = yukleniciKisiKritikSebepHesapla(k, bugunIso());
      const bg = id => belgeler[id] || {};
      const expHesap = id => yukleniciBelgeBitisTarihiHesapla(yukleniciBelgeTanimiGetir(id), bg(id), k.tehlikeSinifi);
      const uygunMu = id => yukleniciBelgeUygunMu(yukleniciBelgeTanimiGetir(id), bg(id), k.tehlikeSinifi, bugunIso());

      return {
        'Firma': k.firmaAdi || '',
        'Personel': k.adSoyad || '',
        'Tehlike Sınıfı': YUKLENICI_TEHLIKE_SINIFI_ETIKETLERI[k.tehlikeSinifi] || k.tehlikeSinifi,
        'Durum': kritik ? (kritik.girisEngeli ? 'Giriş Engeli' : 'Yakında Dolacak') : 'Tam Uygun',
        'Sebep': kritik ? kritik.sebep : '—',
        'Tetikleyen Belge': kritik ? (kritik.belgeLabel || '—') : '—',
        'Son Tarih': kritik && kritik.sonTarih ? formatTarihGoster(kritik.sonTarih) : '—',
        'Kalan Gün': kritik && kritik.kalanGun !== null && kritik.kalanGun !== undefined ? kritik.kalanGun : '',
        'SGK (Var)': yukleniciBelgeVarMi(bg('sgk')) ? 'Evet' : 'Hayır',
        'Adli Sicil (Var)': yukleniciBelgeVarMi(bg('adliSicil')) ? 'Evet' : 'Hayır',
        'KKD Zimmet (Var)': yukleniciBelgeVarMi(bg('kkd')) ? 'Evet' : 'Hayır',
        'Sağlık Başlangıç': bg('saglik').base ? formatTarihGoster(bg('saglik').base) : '',
        'Sağlık Bitiş': expHesap('saglik') ? formatTarihGoster(expHesap('saglik')) : '',
        'Sağlık Uygun': uygunMu('saglik') ? 'Uygun' : 'Uygun Değil',
        'Temel İSG Başlangıç': bg('temelIsg').base ? formatTarihGoster(bg('temelIsg').base) : '',
        'Temel İSG Bitiş': expHesap('temelIsg') ? formatTarihGoster(expHesap('temelIsg')) : '',
        'Temel İSG Uygun': uygunMu('temelIsg') ? 'Uygun' : 'Uygun Değil',
        'Geçici Görev Başlangıç': bg('geciciGorev').base ? formatTarihGoster(bg('geciciGorev').base) : '',
        'Geçici Görev Bitiş': bg('geciciGorev').exp ? formatTarihGoster(bg('geciciGorev').exp) : '',
        'Geçici Görev Uygun': uygunMu('geciciGorev') ? 'Uygun' : 'Uygun Değil',
        'MYK (Var)': yukleniciBelgeVarMi(bg('myk')) ? 'Evet' : 'Hayır',
        'Diploma (Var)': yukleniciBelgeVarMi(bg('diploma')) ? 'Evet' : 'Hayır',
        'Firma Eğitimi Tarih': bg('firmaEgitimi').base ? formatTarihGoster(bg('firmaEgitimi').base) : '',
        'Firma Eğitimi Bitiş': expHesap('firmaEgitimi') ? formatTarihGoster(expHesap('firmaEgitimi')) : '',
        'Firma Eğitimi Eğitmen': bg('firmaEgitimi').egitmen || '',
        'Firma Eğitimi Uygun': uygunMu('firmaEgitimi') ? 'Uygun' : 'Uygun Değil',
        'Pasif': k.pasif ? 'Evet' : 'Hayır',
        'İlk Giriş': k.ilkGiris ? 'Evet' : 'Hayır',
        // Geri yüklemede kaybolmasın diye (bkz. YUKLENICI_DETAYLI_ICE_AKTAR_KOLONLARI).
        'Personel Türü': YUKLENICI_PERSONEL_TURU_ETIKETLERI[k.personelTuru] || '',
        'Psikoteknik (Var)': yukleniciBelgeVarMi(bg('psikoteknik')) ? 'Evet' : 'Hayır',
        'SRC (Var)': yukleniciBelgeVarMi(bg('src')) ? 'Evet' : 'Hayır',
        'Operatörlük (Var)': yukleniciBelgeVarMi(bg('operatorluk')) ? 'Evet' : 'Hayır',
        'Ehliyet (Var)': yukleniciBelgeVarMi(bg('ehliyet')) ? 'Evet' : 'Hayır',
        'Yüksekte Çalışma (Var)': yukleniciBelgeVarMi(bg('yuksekteCalisma')) ? 'Evet' : 'Hayır',
        'Kayıt Tarihi': k.olusturmaTarihi ? formatTarihGoster(k.olusturmaTarihi.slice(0, 10)) : ''
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = Object.keys(rows[0] || {}).map(k => {
      if (k.includes('Sebep')) return { wch: 40 };
      if (k.includes('Firma') && !k.includes('Eğitimi')) return { wch: 28 };
      if (k.includes('Personel')) return { wch: 26 };
      if (k.includes('Eğitmen')) return { wch: 24 };
      return { wch: 16 };
    });
    XLSX.utils.book_append_sheet(wb, ws, 'Detayli_Kriter');

    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const dosyaAdi = `detayli_kriter_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.xlsx`;
    XLSX.writeFile(wb, dosyaAdi);
  });
}

// ---- İçe Aktar (Diğer Uygulamadan) ----
// Eski uygulamanın kendi "Detaylı Excel (Kriterli)" çıktısı (bkz.
// firmalariExcelAktar'ın yanına eklenen mantıkla aynı köprü fikri — eski
// uygulama btnExportExcelDetail ile TAMAMEN AYNI sütun başlıklarını üretir,
// bkz. yuklenici-standalone.html satır 3108-3187) buradan geri okunup
// risk360'ın sabit belge modeline aktarılır. Böylece iki uygulama arasında
// Excel üzerinden veri taşınabilir.
const YUKLENICI_DETAYLI_ICE_AKTAR_KOLONLARI = [
  { anahtar: 'firma', baslik: 'Firma' },
  { anahtar: 'personel', baslik: 'Personel' },
  { anahtar: 'tehlike', baslik: 'Tehlike Sınıfı' },
  { anahtar: 'sgk', baslik: 'SGK (Var)' },
  { anahtar: 'adliSicil', baslik: 'Adli Sicil (Var)' },
  { anahtar: 'kkd', baslik: 'KKD Zimmet (Var)' },
  { anahtar: 'saglikBaslangic', baslik: 'Sağlık Başlangıç' },
  { anahtar: 'temelIsgBaslangic', baslik: 'Temel İSG Başlangıç' },
  { anahtar: 'geciciBaslangic', baslik: 'Geçici Görev Başlangıç' },
  { anahtar: 'geciciBitis', baslik: 'Geçici Görev Bitiş' },
  { anahtar: 'mykBaslangic', baslik: 'MYK Başlangıç' },
  { anahtar: 'mykVar', baslik: 'MYK (Var)' },
  { anahtar: 'mykBitis', baslik: 'MYK Bitiş' },
  { anahtar: 'feTarih', baslik: 'Firma Eğitimi Tarih' },
  { anahtar: 'feBitis', baslik: 'Firma Eğitimi Bitiş' },
  { anahtar: 'feEgitmen', baslik: 'Firma Eğitimi Eğitmen' },
  // Eski uygulamanın orijinal btnExportExcelDetail'inde bu sütunlar yoktu —
  // kullanıcı isteği üzerine hem eski uygulamaya hem risk360'a eklendi
  // (bkz. yuklenici-standalone.html'deki aynı isimli değişiklik). Sütun
  // dosyada yoksa (eski bir dışa aktarımdan geliyorsa) boş kalır, hatalı olmaz.
  // NOT: İş Güv. Uzmanı / İşyeri Hekimi (Var) sütunları eski uygulamanın
  // Excel çıktısında hâlâ var (personel bazında tekrarlanıyor) ama risk360
  // artık bunları personel seviyesinde SORMUYOR — firma bazlı sözleşme
  // olarak Firma modalındaki genel evrak listesinden takip ediliyor
  // (kullanıcı isteği), bu yüzden burada bilerek eşleştirilmiyor.
  { anahtar: 'diploma', baslik: 'Diploma (Var)' },
  { anahtar: 'pasif', baslik: 'Pasif' },
  { anahtar: 'ilkGiris', baslik: 'İlk Giriş' },
  // 2026-10-20: silinen bir firmanın personeli geri yüklenirken operatör
  // bilgileri kaybolmasın diye eklendi (dosyada yoksa boş kalır).
  { anahtar: 'personelTuru', baslik: 'Personel Türü' },
  { anahtar: 'psikoteknik', baslik: 'Psikoteknik (Var)' },
  { anahtar: 'src', baslik: 'SRC (Var)' },
  { anahtar: 'operatorluk', baslik: 'Operatörlük (Var)' },
  { anahtar: 'ehliyet', baslik: 'Ehliyet (Var)' },
  { anahtar: 'yuksekteCalisma', baslik: 'Yüksekte Çalışma (Var)' }
];

function _yukleniciPersonelTuruCoz(deger) {
  const n = _basligiNormallestir(deger);
  if (!n) return undefined;
  if (n.startsWith('operator')) return 'operator';
  if (n.startsWith('teknik')) return 'teknik';
  return undefined;
}

// Eski uygulamanın "Detaylı Excel" çıktısı Tehlike Sınıfı'nı düz etiketle
// DEĞİL, ham iç kodla yazıyor ("cok"/"tehlikeli"/"az" — bkz. btnExportExcelDetail
// satır 3125: `"Tehlike Sınıfı": tehlike`). Önce ham kodu, sonra (risk360'ın
// kendi Detaylı Excel çıktısıyla uyum için) Türkçe etiketi dener.
function _yukleniciTehlikeSinifiCoz(deger) {
  const ham = (deger || '').trim().toLowerCase();
  if (YUKLENICI_TEHLIKE_SINIFLARI.includes(ham)) return ham;
  const bulunan = Object.entries(YUKLENICI_TEHLIKE_SINIFI_ETIKETLERI).find(([, ad]) => ad === (deger || '').trim());
  return bulunan ? bulunan[0] : 'az';
}

function _yukleniciVarYokCoz(evetHayir) {
  return String(evetHayir || '').trim().toLowerCase() === 'evet' ? 'Var' : 'Yok';
}

// Eski uygulamanın SADE "Tüm Kayıtları Excel'e Aktar" çıktısı (btnExportExcel,
// satır 3208-3262) — sadece Firma/Personel/3 hesaplanmış bitiş tarihi içerir,
// SGK/Adli Sicil/KKD/Geçici Görev/MYK gibi ham belge verisi yok. Bu yüzden
// içe aktarılan kişilerde bu üç tarih dolu gelir ama diğer zorunlu belgeler
// boş kalır (Dashboard'da "SGK yok" görünmesi normaldir — kaynak dosyada o
// bilgi hiç yok, elle tamamlanmalı).
const YUKLENICI_SADE_ICE_AKTAR_KOLONLARI = [
  { anahtar: 'firma', baslik: 'Firma' },
  { anahtar: 'personel', baslik: 'Personel' },
  { anahtar: 'saglikSon', baslik: 'Sağlık Muayene Son Tarih' },
  { anahtar: 'isgSon', baslik: 'Temel İSG Eğitimi Son Tarih' },
  { anahtar: 'feSon', baslik: 'Firma Eğitimi Son Tarih' }
];

function _yukleniciYokMu(deger) {
  return !deger || /^yok$/i.test(deger.trim());
}

// Aynı "İçe Aktar" butonu iki farklı eski-uygulama çıktısını da kabul eder:
// Detaylı Excel (Kriterli) (28 sütun, tam veri) veya sade "Tüm Kayıtları
// Excel'e Aktar" (6 sütun, sadece hesaplanmış bitiş tarihleri). Hangisi
// olduğu başlık satırından anlaşılır.
function yukleniciKayitlariniIceAktar(dosya, tamamlaninca) {
  xlsxHazirOlduğunda(() => {
    const okuyucu = new FileReader();
    okuyucu.onload = e => {
      let baslikSatiri = [];
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const sayfa = wb.Sheets[wb.SheetNames[0]];
        const aoa = XLSX.utils.sheet_to_json(sayfa, { header: 1, defval: '' });
        baslikSatiri = aoa.find(satir => satir.some(h => _basligiNormallestir(h) === _basligiNormallestir('Personel'))) || [];
      } catch (err) { /* format tespiti başarısız olursa detaylı denenir, hata orada gösterilir */ }

      const detayliMi = baslikSatiri.some(h => _basligiNormallestir(h) === _basligiNormallestir('SGK (Var)'));
      if (detayliMi) _yukleniciDetayliExcelIceAktarUygula(dosya, tamamlaninca);
      else _yukleniciSadeExcelIceAktarUygula(dosya, tamamlaninca);
    };
    okuyucu.onerror = () => { tamamlaninca(); alert('Dosya okunamadı.'); };
    okuyucu.readAsArrayBuffer(dosya);
  });
}

// Eski uygulamanın bu çıktısı bir başlık + boş satırla başlıyor (bkz.
// btnExportExcel: excelData.push(["İSG ONAYLI..."]); excelData.push([]);
// excelData.push([gerçek başlıklar])) — core/excel.js'teki excelIceAktar
// başlığın 1. satırda olduğunu varsayar, bu yüzden burada ham AOA okunup
// gerçek başlık satırı aranıyor (yıllık-plan'ın rapor içe aktarımıyla aynı gerekçe).
function _yukleniciSadeExcelIceAktarUygula(dosya, tamamlaninca) {
  xlsxHazirOlduğunda(() => {
    const okuyucu = new FileReader();
    okuyucu.onload = e => {
      tamamlaninca();
      let gecerliSatirlar;
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const sayfa = wb.Sheets[wb.SheetNames[0]];
        const aoa = XLSX.utils.sheet_to_json(sayfa, { header: 1, defval: '' });
        const baslikIndeksi = aoa.findIndex(satir => _basligiNormallestir(satir[1]) === _basligiNormallestir('Personel'));
        if (baslikIndeksi === -1) { alert('Bu dosyada "Personel" başlıklı bir sütun bulunamadı.'); return; }

        gecerliSatirlar = aoa.slice(baslikIndeksi + 1)
          .filter(satir => String(satir[1] || '').trim())
          .map(satir => ({
            firma: String(satir[0] || '').trim(),
            personel: String(satir[1] || '').trim(),
            saglikSon: String(satir[2] || '').trim(),
            isgSon: String(satir[3] || '').trim(),
            feSon: String(satir[4] || '').trim()
          }));
      } catch (err) {
        alert('Dosya okunamadı. Geçerli bir Excel (.xlsx/.xls) dosyası seçtiğinizden emin olun.');
        return;
      }

      if (!gecerliSatirlar.length) { alert('İçe aktarılacak satır bulunamadı.'); return; }

      const firmaHaritasi = {};
      yukleniciFirmalariTumunuGetir().forEach(f => { firmaHaritasi[_basligiNormallestir(f.firmaAdi)] = f; });
      Array.from(new Set(gecerliSatirlar.map(s => (s.firma || '').trim()).filter(Boolean)))
        .filter(ad => !firmaHaritasi[_basligiNormallestir(ad)])
        .forEach(ad => {
          // gerekliEvraklar:[] — eski uygulamada firma seviyesinde hiç evrak
        // kavramı yoktu; içe aktarılan firmalara risk360'ın kendi
        // VARSAYILAN_GEREKLI_EVRAKLAR listesini dayatmak yanlış "Uygun
        // Değil" sinyaline yol açıyordu.
        const sonuc = yukleniciFirmaEkle({ firmaAdi: ad, gerekliEvraklar: [] });
          if (sonuc.basarili) firmaHaritasi[_basligiNormallestir(ad)] = sonuc.firma;
        });

      const kayitlar = gecerliSatirlar.map(s => {
        const firma = firmaHaritasi[_basligiNormallestir((s.firma || '').trim())];
        const belgeler = yukleniciBosBelgeler();
        if (!_yukleniciYokMu(s.saglikSon)) belgeler.saglik = { exp: excelTarihiNormallestir(s.saglikSon) };
        if (!_yukleniciYokMu(s.isgSon)) belgeler.temelIsg = { exp: excelTarihiNormallestir(s.isgSon) };
        if (!_yukleniciYokMu(s.feSon)) belgeler.firmaEgitimi = { exp: excelTarihiNormallestir(s.feSon) };
        return {
          firmaId: firma ? firma.id : '',
          firmaAdi: firma ? firma.firmaAdi : (s.firma || '').trim(),
          adSoyad: s.personel,
          belgeler
        };
      });

      const sonuc = yukleniciKisilerTopluEkle(kayitlar);
      let mesaj = `${sonuc.basarili} yeni personel eklendi, ${sonuc.guncellenen} mevcut personelin bilgisi güncellendi (sade format — sadece Sağlık/Temel İSG/Firma Eğitimi bitiş tarihleri geldi; SGK, Adli Sicil, KKD, Geçici Görev ve MYK bu dosyada yoktu — "Detaylı Excel (Kriterli)" dosyasıyla tekrar içe aktararak tamamlayabilirsiniz, aynı kişiler mükerrer eklenmez).`;
      if (sonuc.atlanan) mesaj += `\n${sonuc.atlanan} satır atlandı.`;
      alert(mesaj);

      if (typeof kayitlariCiz === 'function') kayitlariCiz(document.getElementById('kayitAramaKutusu').value);
      if (typeof dashboardCiz === 'function' && document.getElementById('dashToplamPersonel')) dashboardCiz();
    };
    okuyucu.onerror = () => { tamamlaninca(); alert('Dosya okunamadı.'); };
    okuyucu.readAsArrayBuffer(dosya);
  });
}

function _yukleniciDetayliExcelIceAktarUygula(dosya, tamamlaninca) {
  excelIceAktar(dosya, YUKLENICI_DETAYLI_ICE_AKTAR_KOLONLARI, (satirlar, hataMesaji) => {
    tamamlaninca();
    if (hataMesaji) { alert(hataMesaji); return; }

    const gecerliSatirlar = satirlar.filter(s => (s.personel || '').trim());
    if (!gecerliSatirlar.length) { alert('İçe aktarılacak satır bulunamadı.'); return; }

    // 1) Eksik firmaları TEK seferde (isim başına bir yazım) oluştur.
    const firmaHaritasi = {};
    yukleniciFirmalariTumunuGetir().forEach(f => { firmaHaritasi[_basligiNormallestir(f.firmaAdi)] = f; });

    Array.from(new Set(gecerliSatirlar.map(s => (s.firma || '').trim()).filter(Boolean)))
      .filter(ad => !firmaHaritasi[_basligiNormallestir(ad)])
      .forEach(ad => {
        // gerekliEvraklar:[] — eski uygulamada firma seviyesinde hiç evrak
        // kavramı yoktu; içe aktarılan firmalara risk360'ın kendi
        // VARSAYILAN_GEREKLI_EVRAKLAR listesini dayatmak yanlış "Uygun
        // Değil" sinyaline yol açıyordu.
        const sonuc = yukleniciFirmaEkle({ firmaAdi: ad, gerekliEvraklar: [] });
        if (sonuc.basarili) firmaHaritasi[_basligiNormallestir(ad)] = sonuc.firma;
      });

    // 2) Personel kayıtlarını TEK yazımla oluştur/güncelle (yukleniciKisilerTopluEkle
    // — aynı firma+ad soyad varsa günceller, mükerrer açmaz). Sadece kaynak
    // dosyada gerçekten dolu olan hücreler belgeler'e eklenir — boş bir
    // hücre yüzünden var/yok varsayılanı ("Yok") mevcut "Var" veriyi
    // ezmesin diye (bkz. yukleniciKisilerTopluEkle'deki birleştirme kuralı).
    const kayitlar = gecerliSatirlar.map(s => {
      const firma = firmaHaritasi[_basligiNormallestir((s.firma || '').trim())];
      const belgeler = yukleniciBosBelgeler();
      if ((s.sgk || '').trim()) belgeler.sgk = { deger: _yukleniciVarYokCoz(s.sgk) };
      if ((s.adliSicil || '').trim()) belgeler.adliSicil = { deger: _yukleniciVarYokCoz(s.adliSicil) };
      if ((s.kkd || '').trim()) belgeler.kkd = { deger: _yukleniciVarYokCoz(s.kkd) };
      if ((s.saglikBaslangic || '').trim()) belgeler.saglik = { base: excelTarihiNormallestir(s.saglikBaslangic) };
      if ((s.temelIsgBaslangic || '').trim()) belgeler.temelIsg = { base: excelTarihiNormallestir(s.temelIsgBaslangic) };
      // geciciGorev: başlangıç–bitiş tarih aralığı (tarih-aralik).
      if ((s.geciciBaslangic || '').trim() || (s.geciciBitis || '').trim()) {
        belgeler.geciciGorev = { base: excelTarihiNormallestir(s.geciciBaslangic), exp: excelTarihiNormallestir(s.geciciBitis) };
      }
      // MYK artık Var/Yok — eski dosyada bir başlangıç tarihi varsa belge
      // fiilen mevcuttu demektir, "Var" olarak aktarılır.
      if ((s.mykBaslangic || '').trim()) belgeler.myk = { deger: 'Var' };
      else if ((s.mykVar || '').trim()) belgeler.myk = { deger: _yukleniciVarYokCoz(s.mykVar) };
      if ((s.feTarih || '').trim()) {
        belgeler.firmaEgitimi = { base: excelTarihiNormallestir(s.feTarih), exp: excelTarihiNormallestir(s.feBitis), egitmen: s.feEgitmen, ay: YUKLENICI_FIRMA_EGITIMI_VARSAYILAN_AY };
      }
      if ((s.diploma || '').trim()) belgeler.diploma = { deger: _yukleniciVarYokCoz(s.diploma) };
      ['psikoteknik', 'src', 'operatorluk', 'ehliyet', 'yuksekteCalisma'].forEach(id => {
        if ((s[id] || '').trim()) belgeler[id] = { deger: _yukleniciVarYokCoz(s[id]) };
      });

      return {
        personelTuru: _yukleniciPersonelTuruCoz(s.personelTuru),
        firmaId: firma ? firma.id : '',
        firmaAdi: firma ? firma.firmaAdi : (s.firma || '').trim(),
        adSoyad: s.personel,
        tehlikeSinifi: _yukleniciTehlikeSinifiCoz(s.tehlike),
        // Pasif/İlk Giriş sütunları dosyada varsa (Evet/Hayır) okunur; yoksa
        // undefined kalır ve yukleniciKisilerTopluEkle mevcut değeri korur.
        pasif: (s.pasif || '').trim() ? /evet/i.test(s.pasif) : undefined,
        ilkGiris: (s.ilkGiris || '').trim() ? /evet/i.test(s.ilkGiris) : undefined,
        belgeler
      };
    });

    const sonuc = yukleniciKisilerTopluEkle(kayitlar);
    let mesaj = `${sonuc.basarili} personel kaydı içe aktarıldı.`;
    if (sonuc.atlanan) mesaj += `\n${sonuc.atlanan} satır atlandı (firma/ad soyad eksik).`;
    alert(mesaj);

    if (typeof kayitlariCiz === 'function') kayitlariCiz(document.getElementById('kayitAramaKutusu').value);
    if (typeof dashboardCiz === 'function' && document.getElementById('dashToplamPersonel')) dashboardCiz();
  });
}

// ---- 5) PDF İndir ----
// Eski uygulama jsPDF+autoTable ile tabloyu doğrudan çiziyordu ve Türkçe
// karakterler için özel bir Roboto TTF fontu gömülü olarak yüklüyordu
// (ROBOTO_FONT). risk360'ın diğer tüm modülleri (bkz. kurul/cikti.js)
// html2pdf.js (HTML -> canvas -> PDF) kullanıyor; bu, tarayıcının kendi font
// render motorunu kullandığı için Türkçe karakterler ek bir font gömülmeden
// doğru çıkar. İçerik (sütunlar, renkler, sıralama, footer, dosya adı) eski
// uygulamayla birebir, sadece üretim tekniği risk360'ın kendi konvansiyonuna
// uyarlandı.
// Eski uygulamadaki trTitleCase/normalizeCompanyName ile birebir (satır
// 933-956) — kaynak veride (ör. içe aktarılan iki farklı dosyada) tutarsız
// olan BÜYÜK HARF / karışık yazımları PDF'te tek tip Baş Harf Büyük yapar.
function _yukleniciTrTitleCase(str) {
  if (!str) return '';
  const temiz = String(str).replace(/\s+/g, ' ').trim();
  const kucuk = temiz.toLocaleLowerCase('tr-TR');
  return kucuk.split(' ').map(k => k ? k.charAt(0).toLocaleUpperCase('tr-TR') + k.slice(1) : '').join(' ');
}

function _yukleniciFirmaAdiNormallestir(str) {
  if (!str) return '';
  let s = _yukleniciTrTitleCase(str);
  ['OSB', 'A.Ş.', 'A.Ş', 'LTD.', 'LTD', 'SAN.', 'SAN', 'TİC.', 'TİC', 'İSG'].forEach(k => {
    const re = new RegExp(`\\b${k.replace(/\./g, '\\.')}\\b`, 'gi');
    s = s.replace(re, k);
  });
  return s;
}

function _yukleniciNormalizeText(str) {
  return (str || '')
    .toString()
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/\s+/g, ' ')
    .trim();
}

// jsPDF'in yerleşik fontları (Helvetica vb.) Türkçe'ye özgü ş/ğ/ı/İ
// karakterlerini desteklemiyor. Önceki sürüm bu yüzden tüm raporu
// html2canvas ile GÖRSELE çeviriyordu — bu da Türkçe karakterleri doğru
// bastı ama PDF'in tamamı tek bir resme dönüştüğü için Ctrl+F ile arama
// yapılamıyordu (kullanıcı isteği: aranabilir olsun). Çözüm: eski
// uygulamanın (isg/yuklenici-standalone.html) kendi çözümüyle aynı —
// gerçek Unicode destekli bir TTF fontu (Roboto) jsPDF'e gömüp tabloyu
// jsPDF-AutoTable ile GERÇEK METİN olarak çizmek. Böylece hem Türkçe
// karakterler doğru çıkar hem de PDF içeriği aranabilir/seçilebilir olur.
function _yukleniciPdfHazirla() {
  if (!window.jspdf || !window.jspdf.jsPDF) { alert('jsPDF yüklenmemiş.'); return null; }
  const hasAutoTable = (window.jspdf.jsPDF.API && window.jspdf.jsPDF.API.autoTable) || window.jspdf.autoTable;
  if (!hasAutoTable) { alert('jsPDF-AutoTable yüklenmemiş.'); return null; }
  if (typeof YUKLENICI_ROBOTO_FONT === 'undefined' || !YUKLENICI_ROBOTO_FONT || YUKLENICI_ROBOTO_FONT.length < 1000) {
    alert('Roboto font gömülü değil. Türkçe karakterler doğru basılamaz.');
    return null;
  }

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  pdf.addFileToVFS('Roboto-Regular.ttf', YUKLENICI_ROBOTO_FONT);
  pdf.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
  pdf.setFont('Roboto', 'normal');
  return pdf;
}

// ---- İSG Onaylı Liste ortak parçaları ----
// Personel, araç ve birleşik liste aynı başlık/tablo/altbilgi düzenini
// kullanır. Altbilgi (sayfa no) en sonda tüm sayfalara birlikte basılır ki
// birden fazla tablo olduğunda "Sayfa x / y" toplamı doğru çıksın.

const _YK_PDF_ALTBILGI_H = 12;

function _ykSiraliPersonelSatirlari() {
  return yukleniciKisileriTumunuGetir().filter(k => !k.pasif)
    .map(k => ({ kisi: k, sonuc: yukleniciGirebilecegiSonTarihHesapla(k, bugunIso()) }))
    .sort((a, b) => {
      const f = _yukleniciNormalizeText(a.kisi.firmaAdi).localeCompare(_yukleniciNormalizeText(b.kisi.firmaAdi));
      if (f !== 0) return f;
      return _yukleniciNormalizeText(a.kisi.adSoyad).localeCompare(_yukleniciNormalizeText(b.kisi.adSoyad));
    });
}

function _ykSiraliAracSatirlari() {
  return yukleniciAraclariniGetir('').filter(a => !a.pasif)
    .sort((a, b) => {
      const f = _yukleniciNormalizeText(a.firmaAdi).localeCompare(_yukleniciNormalizeText(b.firmaAdi));
      if (f !== 0) return f;
      return _yukleniciNormalizeText(a.kimlik).localeCompare(_yukleniciNormalizeText(b.kimlik));
    });
}

function _ykPdfBaslikYaz(pdf, baslik) {
  const olusturmaTR = new Date().toLocaleString('tr-TR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  pdf.setFont('Roboto', 'normal');
  pdf.setTextColor(0);
  pdf.setFontSize(13);
  pdf.text(baslik, 14, 12);
  pdf.setFontSize(10);
  pdf.text(`Oluşturma: ${olusturmaTR}`, 14, 18);
}

// Son sütun "tarih | durum" biçiminde; durum rengi renkSec(durum) ile.
function _ykPdfTabloCiz(pdf, startY, head, body, columnStyles, renkSec) {
  const sonSutun = head.length - 1;
  pdf.autoTable({
    startY,
    head: [head],
    body,
    margin: { left: 14, right: 14, top: 22, bottom: _YK_PDF_ALTBILGI_H },
    styles: { font: 'Roboto', fontStyle: 'normal', fontSize: 9, cellPadding: 2, overflow: 'linebreak', textColor: 20 },
    // Açık füme başlık rengi kullanıcı isteğiyle eski uygulamanın lacivert
    // (11,44,82) başlığından bilerek farklılaştırıldı.
    headStyles: { font: 'Roboto', fontStyle: 'normal', fontSize: 9, fillColor: [184, 178, 168], textColor: [31, 41, 55] },
    columnStyles,
    didParseCell: data => {
      if (data.section === 'body' && data.column.index === sonSutun) data.cell.text = [];
    },
    didDrawCell: data => {
      if (data.section !== 'body' || data.column.index !== sonSutun) return;
      const doc = data.doc;
      const parts = String(data.row.raw[sonSutun] || '').split('|');
      const x = data.cell.x + 2;
      const y = data.cell.y + data.cell.height / 2 + 2;
      doc.setTextColor(0, 0, 0);
      doc.text(parts[0].trim(), x, y);
      if (parts[1]) {
        const durum = parts[1].trim();
        doc.setTextColor(...renkSec(durum));
        doc.text(durum, x + doc.getTextWidth(parts[0].trim()) + 4, y);
      }
      doc.setTextColor(0, 0, 0);
    }
  });
  return pdf.lastAutoTable.finalY;
}

function _ykPersonelTablosuCiz(pdf, startY, satirlar) {
  const body = satirlar.map(({ kisi, sonuc }) => ([
    _yukleniciFirmaAdiNormallestir(kisi.firmaAdi),
    _yukleniciTrTitleCase(kisi.adSoyad),
    `${sonuc.sonTarih ? formatTarihGoster(sonuc.sonTarih) : '-'} | ${sonuc.durumMetni}`
  ]));
  return _ykPdfTabloCiz(pdf, startY, ['Firma', 'Personel', 'Girebileceği Son Tarih'], body,
    { 0: { cellWidth: 62 }, 1: { cellWidth: 62 }, 2: { cellWidth: 58 } },
    durum => {
      if (durum.includes('Uygun')) return [22, 163, 74];
      if (durum.includes('Eğitim Verilecek')) return [245, 158, 11];
      if (durum.includes('Eksik')) return [220, 38, 38];
      return [20, 20, 20];
    });
}

// Araçta son tarih = PTM/ZMS/TÜVTÜRK bitişlerinden en erken olanı.
function _ykAracTablosuCiz(pdf, startY, araclar) {
  const body = araclar.map(a => {
    const eksikler = [];
    if (!a.ptmOk) eksikler.push('PTM');
    if (!a.ruhsatOk) eksikler.push('Ruhsat');
    if (!a.zmsOk) eksikler.push('ZMS');
    if (!a.tuvOk) eksikler.push('TÜVTÜRK');
    const tarihler = [a.ptmExp, a.zmsExp, a.tuvExp].filter(Boolean).sort();
    const sonTarih = a.uygunMu && tarihler.length ? formatTarihGoster(tarihler[0]) : '-';
    const durum = a.uygunMu ? 'Uygun' : 'Eksik: ' + eksikler.join(', ');
    return [
      _yukleniciFirmaAdiNormallestir(a.firmaAdi),
      a.tur || '-',
      String(a.kimlik || '').toLocaleUpperCase('tr-TR'),
      `${sonTarih} | ${durum}`
    ];
  });
  return _ykPdfTabloCiz(pdf, startY, ['Firma', 'Tür', 'Plaka / Seri No', 'Girebileceği Son Tarih'], body,
    { 0: { cellWidth: 58 }, 1: { cellWidth: 20 }, 2: { cellWidth: 38 }, 3: { cellWidth: 66 } },
    durum => durum === 'Uygun' ? [22, 163, 74] : [220, 38, 38]);
}

// İkinci tablonun ara başlığı; sayfanın dibine sıkışacaksa yeni sayfaya geçer.
function _ykPdfAraBaslik(pdf, y, metin) {
  const pageH = pdf.internal.pageSize.getHeight();
  if (y + 30 > pageH - _YK_PDF_ALTBILGI_H) { pdf.addPage(); y = 14; }
  pdf.setFont('Roboto', 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor(0);
  pdf.text(metin, 14, y + 2);
  return y + 6;
}

function _ykPdfAltbilgileriYazVeKaydet(pdf, onEk) {
  const footerText = '✓ Çevre sorumluluğunuzu düşünerek lütfen gerekmedikçe çıktı almayınız.';
  const pageCount = pdf.internal.getNumberOfPages();
  const pageW = pdf.internal.pageSize.getWidth();
  const y = pdf.internal.pageSize.getHeight() - 6;
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFont('Roboto', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(0, 128, 0);
    pdf.text(footerText, 14, y);
    pdf.setTextColor(120);
    const pText = `Sayfa ${i} / ${pageCount}`;
    pdf.text(pText, pageW - 14 - pdf.getTextWidth(pText), y);
    pdf.setTextColor(0);
  }
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  pdf.save(`${onEk}_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.pdf`);
}

function yukleniciPdfIndir() {
  const satirlar = _ykSiraliPersonelSatirlari();
  if (!satirlar.length) { alert('PDF için uygun veri bulunamadı.'); return; }
  const pdf = _yukleniciPdfHazirla();
  if (!pdf) return;
  try {
    _ykPdfBaslikYaz(pdf, 'İSG ONAYLI YÜKLENİCİ PERSONEL LİSTESİ');
    _ykPersonelTablosuCiz(pdf, 22, satirlar);
    _ykPdfAltbilgileriYazVeKaydet(pdf, 'isgonaylitaseronlistesi');
  } catch (e) {
    console.error(e);
    alert('PDF indirilemedi: ' + (e.message || e));
  }
}

function yukleniciAracPdfIndir() {
  const araclar = _ykSiraliAracSatirlari();
  if (!araclar.length) { alert('PDF için uygun araç / ekipman kaydı bulunamadı.'); return; }
  const pdf = _yukleniciPdfHazirla();
  if (!pdf) return;
  try {
    _ykPdfBaslikYaz(pdf, 'İSG ONAYLI YÜKLENİCİ ARAÇ / EKİPMAN LİSTESİ');
    _ykAracTablosuCiz(pdf, 22, araclar);
    _ykPdfAltbilgileriYazVeKaydet(pdf, 'isgonayliaraclistesi');
  } catch (e) {
    console.error(e);
    alert('PDF indirilemedi: ' + (e.message || e));
  }
}

// Personel + araç/ekipman tek PDF'te (Dashboard butonu).
function yukleniciBirlesikPdfIndir() {
  const satirlar = _ykSiraliPersonelSatirlari();
  const araclar = _ykSiraliAracSatirlari();
  if (!satirlar.length && !araclar.length) { alert('PDF için uygun personel veya araç / ekipman kaydı bulunamadı.'); return; }
  const pdf = _yukleniciPdfHazirla();
  if (!pdf) return;
  try {
    _ykPdfBaslikYaz(pdf, 'İSG ONAYLI YÜKLENİCİ PERSONEL VE ARAÇ / EKİPMAN LİSTESİ');
    let y = _ykPdfAraBaslik(pdf, 24, `Personel (${satirlar.length})`);
    if (satirlar.length) y = _ykPersonelTablosuCiz(pdf, y, satirlar);
    else { pdf.setFontSize(9); pdf.text('Aktif personel kaydı yok.', 14, y + 3); y += 6; }
    y = _ykPdfAraBaslik(pdf, y + 8, `Araç / Ekipman (${araclar.length})`);
    if (araclar.length) _ykAracTablosuCiz(pdf, y, araclar);
    else { pdf.setFontSize(9); pdf.text('Aktif araç / ekipman kaydı yok.', 14, y + 3); }
    _ykPdfAltbilgileriYazVeKaydet(pdf, 'isgonaylipersonelaraclistesi');
  } catch (e) {
    console.error(e);
    alert('PDF indirilemedi: ' + (e.message || e));
  }
}
