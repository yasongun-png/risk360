// Ortak Excel yardımcıları: şablon indirme, dışa aktarma, esnek başlık
// eşleştirmeli içe aktarma. SheetJS (xlsx.js) kütüphanesi ihtiyaç anında
// (Excel butonlarından biri kullanılınca) CDN'den yüklenir; hiçbir modülün
// varsayılan sayfa yüklemesini yavaşlatmaz.
//
// Her modül, kendi alanları için bir "kolonlar" listesi tanımlar:
//   [{ anahtar: 'adSoyad', baslik: 'Ad Soyad', esanlamlar: ['ADI SOYADI', 'İsim Soyisim'] }, ...]
// anahtar -> veriler nesnesindeki alan adı (modülün xEkle() fonksiyonuna gider)
// baslik  -> Excel'de görünecek/aranacak başlık
// esanlamlar -> içe aktarmada ayrıca kabul edilecek alternatif başlıklar (opsiyonel)

const XLSX_CDN_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';

function _xlsxYuklu() {
  return typeof XLSX !== 'undefined';
}

function xlsxHazirOlduğunda(callback) {
  if (_xlsxYuklu()) { callback(); return; }
  const mevcutScript = document.querySelector(`script[src="${XLSX_CDN_URL}"]`);
  if (mevcutScript) { mevcutScript.addEventListener('load', callback); return; }

  const script = document.createElement('script');
  script.src = XLSX_CDN_URL;
  script.onload = callback;
  script.onerror = () => alert('Excel kütüphanesi yüklenemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.');
  document.head.appendChild(script);
}

function excelSablonIndir(kolonlar, dosyaAdi) {
  xlsxHazirOlduğunda(() => {
    const basliklar = kolonlar.map(k => k.baslik);
    const ws = XLSX.utils.aoa_to_sheet([basliklar]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Şablon');
    XLSX.writeFile(wb, dosyaAdi);
  });
}

function excelDisaAktar(liste, kolonlar, dosyaAdi) {
  xlsxHazirOlduğunda(() => {
    const basliklar = kolonlar.map(k => k.baslik);
    const satirlar = liste.map(satir => kolonlar.map(k => (satir[k.anahtar] ?? '')));
    const ws = XLSX.utils.aoa_to_sheet([basliklar, ...satirlar]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Veri');
    XLSX.writeFile(wb, dosyaAdi);
  });
}

function _basligiNormallestir(metin) {
  const harfEslesme = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', İ: 'i' };
  return String(metin ?? '')
    .trim()
    .toLowerCase()
    .split('')
    .map(k => harfEslesme[k] || k)
    .join('')
    .replace(/[^a-z0-9]+/g, '');
}

function _satiriEslestir(satir, kolonlar) {
  const normalliHaritasi = {};
  Object.keys(satir).forEach(k => { normalliHaritasi[_basligiNormallestir(k)] = satir[k]; });

  const sonuc = {};
  kolonlar.forEach(kolon => {
    const adaylar = [kolon.baslik].concat(kolon.esanlamlar || []);
    const bulunanAday = adaylar.find(aday => Object.prototype.hasOwnProperty.call(normalliHaritasi, _basligiNormallestir(aday)));
    sonuc[kolon.anahtar] = bulunanAday !== undefined ? String(normalliHaritasi[_basligiNormallestir(bulunanAday)] ?? '').trim() : '';
  });
  return sonuc;
}

// dosya: <input type="file"> seçilen dosya (.files[0])
// callback(satirlar, hataMesaji) -> satirlar: [{anahtar: deger, ...}], basarisizsa hataMesaji dolu
function excelIceAktar(dosya, kolonlar, callback) {
  if (!dosya) return;
  xlsxHazirOlduğunda(() => {
    const okuyucu = new FileReader();
    okuyucu.onload = e => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true });
        const sayfa = wb.Sheets[wb.SheetNames[0]];
        const hamSatirlar = XLSX.utils.sheet_to_json(sayfa, { defval: '' });
        const eslesmis = hamSatirlar.map(satir => _satiriEslestir(satir, kolonlar));
        callback(eslesmis, null);
      } catch (err) {
        callback(null, 'Dosya okunamadı. Geçerli bir Excel (.xlsx) dosyası seçtiğinizden emin olun.');
      }
    };
    okuyucu.onerror = () => callback(null, 'Dosya okunamadı.');
    okuyucu.readAsArrayBuffer(dosya);
  });
}

// Satır satır ekleFn(veriler) çağırır (modülün servis katmanındaki xEkle),
// başarı/hata sayısını ve ilk birkaç hatayı özetler.
function excelToplulIceAktarSonucOzetle(satirlar, ekleFn) {
  let basarili = 0;
  const hatalar = [];

  satirlar.forEach((satir, index) => {
    const sonuc = ekleFn(satir);
    if (sonuc && sonuc.basarili) {
      basarili++;
    } else {
      const ilkHata = sonuc && sonuc.hatalar ? Object.values(sonuc.hatalar)[0] : 'Bilinmeyen hata';
      hatalar.push(`Satır ${index + 2}: ${ilkHata}`);
    }
  });

  return { basarili, basarisizSayisi: hatalar.length, hatalar };
}

// Excel'den gelen tarih değerlerini (Date nesnesi, DD.MM.YYYY, DD/MM/YYYY,
// veya zaten YYYY-MM-DD) form input'larının beklediği YYYY-MM-DD'ye çevirir.
function excelTarihiNormallestir(deger) {
  if (deger === '' || deger == null) return '';
  if (deger instanceof Date && !isNaN(deger)) {
    return `${deger.getFullYear()}-${String(deger.getMonth() + 1).padStart(2, '0')}-${String(deger.getDate()).padStart(2, '0')}`;
  }
  const metin = String(deger).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(metin)) return metin.slice(0, 10);
  const trFormat = metin.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (trFormat) {
    return `${trFormat[3]}-${trFormat[2].padStart(2, '0')}-${trFormat[1].padStart(2, '0')}`;
  }
  return metin;
}

function excelIceAktarOzetMesaji(sonuc) {
  let mesaj = `${sonuc.basarili} kayıt başarıyla eklendi.`;
  if (sonuc.basarisizSayisi > 0) {
    mesaj += `\n${sonuc.basarisizSayisi} kayıt eklenemedi:\n` + sonuc.hatalar.slice(0, 10).join('\n');
    if (sonuc.hatalar.length > 10) mesaj += `\n... ve ${sonuc.hatalar.length - 10} tane daha.`;
  }
  return mesaj;
}
