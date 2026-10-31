// Olay/Kaza Excel şablonu ve içe aktarma.
// Kullanıcı isteği: "olay kaza şablonu olay araştırmasındaki her şeyi
// içermiyor, içe aktarma" — şablon formdaki tüm alanları kapsar. Liste
// türündeki bölümler (kronoloji, tanık ifadeleri, düzeltici faaliyetler) tek
// hücrede, her satır ayrı kayıt olacak şekilde (Alt+Enter) girilir; satır
// içindeki parçalar "|" ile ayrılır. Şablonun 2. sayfası her sütunun nasıl
// doldurulacağını ve örneğini, 3. sayfası seçim listelerini verir.
// İçe aktarma core/excel.js excelIceAktar yerine kendi okumasını yapar:
// tarih/saat hücreleri seri sayı olarak alınıp XLSX.SSF ile çözülür (Date
// nesnesine çevrilince saat dilimi yüzünden saatler birkaç dakika kayıyordu).

const OLAY_IMPORT_KOLONLARI = [
  { anahtar: 'kayitNo', baslik: 'Kayıt No', aciklama: 'Boş bırakılırsa otomatik verilir.', ornek: '' },
  { anahtar: 'olayTipi', baslik: 'Olay Tipi', zorunlu: true, aciklama: '"Listeler" sayfasındaki olay tiplerinden biri.', ornek: 'İlk Yardım' },
  { anahtar: 'bolum', baslik: 'Çalıştığı Bölüm', esanlamlar: ['Bölüm'], zorunlu: true, ornek: 'Üretim' },
  { anahtar: 'kazaTarihi', baslik: 'Tarih', zorunlu: true, tur: 'tarih', aciklama: 'GG.AA.YYYY', ornek: '15.10.2026' },
  { anahtar: 'kazaSaati', baslik: 'Saat', tur: 'saat', aciklama: 'SS:DD', ornek: '14:30' },
  { anahtar: 'kazaBolumu', baslik: 'Kazanın Olduğu Bölüm', ornek: 'Paketleme' },
  { anahtar: 'kazaYeri', baslik: 'Olay Yeri', esanlamlar: ['Kaza Yeri'], ornek: 'Paketleme hattı 2, bobin makinesi' },

  { anahtar: 'adSoyad', baslik: 'Ad Soyad', esanlamlar: ['Personel'], aciklama: 'İş kazası tiplerinde zorunlu.', ornek: 'Ahmet Yılmaz' },
  { anahtar: 'sicilNo', baslik: 'Sicil No', ornek: '1234' },
  { anahtar: 'gorev', baslik: 'Görev', ornek: 'Operatör' },
  { anahtar: 'iseGirisTarihi', baslik: 'İşe Giriş Tarihi', tur: 'tarih', aciklama: 'GG.AA.YYYY', ornek: '01.03.2022' },
  { anahtar: 'magdurYasi', baslik: 'Yaşı', esanlamlar: ['Yaş'], tur: 'sayi', ornek: '34' },

  { anahtar: 'isTanimi', baslik: 'Yapılan İş', ornek: 'Bobin değişimi' },
  { anahtar: 'aciklama', baslik: 'Kaza Özeti / Açıklama', esanlamlar: ['Açıklama', 'Kaza Özeti'], zorunlu: true, ornek: 'Bobin değiştirilirken eldiven makineye takıldı...' },
  { anahtar: 'potansiyelSonuc', baslik: 'Potansiyel Sonuç', ornek: 'Parmak kopması' },
  { anahtar: 'tehlikeliMadde', baslik: 'Tehlikeli Madde', ornek: '' },
  { anahtar: 'tanikSayisi', baslik: 'Tanık Sayısı', tur: 'sayi', ornek: '1' },

  { anahtar: 'yaralanmaTuru', baslik: 'Yaralanma Türü', aciklama: '"Listeler" sayfasındaki yaralanma türlerinden biri.', ornek: 'Kesik/Sıyrık' },
  { anahtar: 'yaralananUzuv', baslik: 'Yaralanan Bölge', esanlamlar: ['Yaralanan Uzuv'], ornek: 'Sağ el' },
  { anahtar: 'kayipGun', baslik: 'Kayıp Gün', tur: 'sayi', ornek: '0' },

  { anahtar: 'kronoloji', baslik: 'Olay Kronolojisi', tur: 'liste', aciklama: 'Her satır (Alt+Enter) bir gelişme: SAAT | Gelişme', ornek: '14:25 | Bobin değişimine başlandı\n14:30 | Eldiven makineye takıldı' },
  { anahtar: 'tanikIfadeleri', baslik: 'Tanık İfadeleri', tur: 'liste', aciklama: 'Her satır (Alt+Enter) bir tanık: Ad Soyad | Unvan | İfade', ornek: 'Mehmet Kaya | Vardiya Amiri | Makine durdurulmadan müdahale edildiğini gördüm' },

  { anahtar: 'fkO', baslik: 'Olasılık (O)', tur: 'fk', secenekler: 'OLASILIK_SECENEKLERI', aciklama: 'Fine-Kinney değeri ("Listeler" sayfası)', ornek: '3' },
  { anahtar: 'fkF', baslik: 'Frekans (F)', tur: 'fk', secenekler: 'FREKANS_SECENEKLERI', aciklama: 'Fine-Kinney değeri', ornek: '6' },
  { anahtar: 'fkS', baslik: 'Şiddet (Ş)', esanlamlar: ['Şiddet (S)', 'Şiddet'], tur: 'fk', secenekler: 'SIDDET_SECENEKLERI', aciklama: 'Fine-Kinney değeri', ornek: '7' },

  { anahtar: 'analizNe', baslik: '5N1K - Ne', esanlamlar: ['Ne'], ornek: 'El yaralanması' },
  { anahtar: 'analizNerede', baslik: '5N1K - Nerede', esanlamlar: ['Nerede'], ornek: 'Paketleme hattı 2' },
  { anahtar: 'analizNeZaman', baslik: '5N1K - Ne Zaman', esanlamlar: ['Ne Zaman'], ornek: 'Bobin değişimi sırasında' },
  { anahtar: 'analizKim', baslik: '5N1K - Kim', esanlamlar: ['Kim'], ornek: 'Hat operatörü' },
  { anahtar: 'analizNasil', baslik: '5N1K - Nasıl', esanlamlar: ['Nasıl'], ornek: 'Makine durdurulmadan müdahale' },
  { anahtar: 'analizNeden', baslik: '5N1K - Neden', esanlamlar: ['Neden', 'Kök Neden'], ornek: 'Kilitleme-etiketleme uygulanmadı' },

  { anahtar: 'ilgiliMevzuat', baslik: 'İlgili Mevzuat', tur: 'liste', aciklama: 'Her satır (Alt+Enter) bir mevzuat maddesi.', ornek: '6331 Sayılı İSG Kanunu Md. 4' },
  { anahtar: 'aksiyonlar', baslik: 'Düzeltici / Önleyici Faaliyetler', esanlamlar: ['Aksiyonlar', 'DÖF'], tur: 'liste', aciklama: 'Her satır (Alt+Enter) bir faaliyet: Bulgu | Faaliyet | Sorumlu | Termin (GG.AA.YYYY) | Durum (Açık/Kapalı)', ornek: 'Kilitleme yapılmadı | LOTO eğitimi verilecek | Bakım Şefi | 30.11.2026 | Açık' },
  { anahtar: 'sonucDegerlendirme', baslik: 'Sonuç ve Değerlendirme', esanlamlar: ['Sonuç / Değerlendirme'], ornek: '' },

  { anahtar: 'kazaSinifi', baslik: 'Kaza Sınıfı', ornek: '' },
  { anahtar: 'sorusturmaBaslangic', baslik: 'Soruşturma Başlangıcı', tur: 'tarih', aciklama: 'GG.AA.YYYY', ornek: '15.10.2026' },
  { anahtar: 'sorusturmaBitis', baslik: 'Soruşturma Bitişi', tur: 'tarih', aciklama: 'GG.AA.YYYY', ornek: '20.10.2026' },
  { anahtar: 'hazirlayanAdi', baslik: 'Hazırlayan (Ad Soyad)', ornek: '' },
  { anahtar: 'hazirlayanUnvan', baslik: 'Hazırlayan Unvanı', ornek: 'İş Güvenliği Uzmanı' },
  { anahtar: 'ekipUyesiAdi', baslik: 'Soruşturma Ekibi Üyesi', ornek: '' },
  { anahtar: 'ekipUyesiUnvan', baslik: 'Ekip Üyesi Unvanı', ornek: '' },
  { anahtar: 'onaylayanAdi', baslik: 'Bölüm Yöneticisi (Ad Soyad)', ornek: '' },
  { anahtar: 'onaylayanUnvan', baslik: 'Bölüm Yöneticisi Unvanı', ornek: '' },

  { anahtar: 'durum', baslik: 'Genel Durum', esanlamlar: ['Durum'], aciklama: 'Açık veya Kapalı (boşsa Açık)', ornek: 'Açık' },
  { anahtar: 'kapanisTarihi', baslik: 'Kapanış Tarihi', tur: 'tarih', aciklama: 'GG.AA.YYYY', ornek: '' }
];

function olaySablonIndir() {
  xlsxHazirOlduğunda(() => {
    const wb = XLSX.utils.book_new();
    const veri = XLSX.utils.aoa_to_sheet([OLAY_IMPORT_KOLONLARI.map(k => k.baslik)]);
    veri['!cols'] = OLAY_IMPORT_KOLONLARI.map(k => ({ wch: k.tur === 'liste' || k.anahtar === 'aciklama' ? 45 : Math.max(14, k.baslik.length + 2) }));
    XLSX.utils.book_append_sheet(wb, veri, 'Olaylar');

    const yardim = XLSX.utils.aoa_to_sheet([
      ['Sütun', 'Zorunlu', 'Nasıl doldurulur', 'Örnek'],
      ...OLAY_IMPORT_KOLONLARI.map(k => [k.baslik, k.zorunlu ? 'Evet' : '', k.aciklama || '', k.ornek || '']),
      [],
      ['Not: Veriyi yalnız "Olaylar" sayfasına girin; her satır bir olay. Bir hücrede birden fazla satır için Alt+Enter kullanın.']
    ]);
    yardim['!cols'] = [{ wch: 30 }, { wch: 9 }, { wch: 70 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, yardim, 'Açıklama');

    const fk = liste => liste.map(s => s.etiket);
    const sutunlar = [
      ['Olay Tipi', ...OLAY_TIPLERI.filter(t => t !== 'Kısıtlı İş / Transfer (DART)')],
      ['Yaralanma Türü', ...YARALANMA_TURLERI],
      ['Olasılık (O)', ...fk(OLASILIK_SECENEKLERI)],
      ['Frekans (F)', ...fk(FREKANS_SECENEKLERI)],
      ['Şiddet (Ş)', ...fk(SIDDET_SECENEKLERI)],
      ['Genel Durum', ...OLAY_DURUMLARI]
    ];
    const enUzun = Math.max(...sutunlar.map(s => s.length));
    const listeler = XLSX.utils.aoa_to_sheet(Array.from({ length: enUzun }, (_, i) => sutunlar.map(s => s[i] || '')));
    listeler['!cols'] = sutunlar.map(() => ({ wch: 36 }));
    XLSX.utils.book_append_sheet(wb, listeler, 'Listeler');

    XLSX.writeFile(wb, 'olay_kaza_sablonu.xlsx');
  });
}

// Kullanıcı isteği: "Dışa Aktar da şablonla aynı sütunları versin" — dosya
// olduğu gibi tekrar içe aktarılabilir (tarihler GG.AA.YYYY, liste bölümleri
// şablondaki "satır satır, | ile ayrılmış" biçimde). Sonda yalnız bilgi
// amaçlı "Fine-Kinney RP" sütunu var; içe aktarmada yok sayılır.
function olayExcelDisaAktar(kayitlar) {
  const tarih = d => (d && /^\d{4}-\d{2}-\d{2}/.test(d) ? d.slice(0, 10).split('-').reverse().join('.') : (d || ''));
  const hucre = (k, kayit) => {
    const d = kayit[k.anahtar];
    if (k.tur === 'tarih') return tarih(d);
    if (k.tur === 'sayi') return d == null ? '' : d;
    if (k.anahtar === 'kronoloji') return (d || []).map(x => [x.saat, x.gelisme].join(' | ')).join('\n');
    if (k.anahtar === 'tanikIfadeleri') return (d || []).map(x => [x.adSoyad, x.unvan, x.ifade].join(' | ')).join('\n');
    if (k.anahtar === 'aksiyonlar') return (d || []).map(x => [x.baslik, x.duzelticiFaaliyet, x.sorumlu, tarih(x.termin), x.durum].join(' | ')).join('\n');
    return d == null ? '' : String(d);
  };
  xlsxHazirOlduğunda(() => {
    const satirlar = kayitlar.map(kayit => {
      const rp = typeof fineKinneyPuaniHesapla === 'function' ? fineKinneyPuaniHesapla(kayit) : null;
      return OLAY_IMPORT_KOLONLARI.map(k => hucre(k, kayit)).concat([rp == null ? '' : rp]);
    });
    const ws = XLSX.utils.aoa_to_sheet([OLAY_IMPORT_KOLONLARI.map(k => k.baslik).concat(['Fine-Kinney RP']), ...satirlar]);
    ws['!cols'] = OLAY_IMPORT_KOLONLARI.map(k => ({ wch: k.tur === 'liste' || k.anahtar === 'aciklama' ? 45 : Math.max(14, k.baslik.length + 2) })).concat([{ wch: 16 }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Olaylar');
    XLSX.writeFile(wb, 'olay_kaza_kayitlari.xlsx');
  });
}

function _okExcelTarih(deger) {
  if (deger === '' || deger == null) return '';
  if (typeof deger === 'number') {
    const p = XLSX.SSF.parse_date_code(deger);
    return p ? `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}` : '';
  }
  return excelTarihiNormallestir(String(deger).trim());
}

function _okExcelSaat(deger) {
  if (deger === '' || deger == null) return '';
  if (typeof deger === 'number') {
    const toplamDk = Math.round((deger % 1) * 24 * 60) % (24 * 60);
    return `${String(Math.floor(toplamDk / 60)).padStart(2, '0')}:${String(toplamDk % 60).padStart(2, '0')}`;
  }
  const m = String(deger).trim().match(/^(\d{1,2})[:.](\d{2})/);
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : String(deger).trim();
}

function _okExcelSayi(deger) {
  if (deger === '' || deger == null) return '';
  const n = Number(String(deger).replace(',', '.'));
  return isNaN(n) ? '' : n;
}

// "3", "3 - Sık", "0,5" → seçeneklerdeki geçerli değer (form select'i ile aynı biçimde metin).
function _okExcelFk(deger, secenekler) {
  const m = String(deger ?? '').replace(',', '.').match(/\d+(\.\d+)?/);
  if (!m) return '';
  const s = secenekler.find(x => Number(x.deger) === Number(m[0]));
  return s ? String(s.deger) : '';
}

function _okListeSatirlari(deger) {
  return String(deger ?? '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
}

function _okParcalar(satir) {
  return satir.split('|').map(s => s.trim());
}

function _okEsle(deger, liste) {
  const n = _basligiNormallestir(deger);
  return liste.find(x => _basligiNormallestir(x) === n) || '';
}

function _okImportSatiriniDonustur(ham) {
  const v = {};
  OLAY_IMPORT_KOLONLARI.forEach(k => {
    const d = ham[k.anahtar];
    if (k.tur === 'tarih') v[k.anahtar] = _okExcelTarih(d);
    else if (k.tur === 'saat') v[k.anahtar] = _okExcelSaat(d);
    else if (k.tur === 'sayi') v[k.anahtar] = _okExcelSayi(d);
    else if (k.tur === 'fk') v[k.anahtar] = _okExcelFk(d, { OLASILIK_SECENEKLERI, FREKANS_SECENEKLERI, SIDDET_SECENEKLERI }[k.secenekler]);
    else if (k.tur === 'liste') v[k.anahtar] = _okListeSatirlari(d);
    else v[k.anahtar] = String(d ?? '').trim();
  });

  // "İş Kazası – İlk Yardım" gibi listedeki etiketle yazılmışsa da tanınır.
  const tipHam = v.olayTipi.replace(/^İş Kazası\s*[–-]\s*/i, '');
  v.olayTipi = _okEsle(tipHam, OLAY_TIPLERI) || v.olayTipi;
  v.yaralanmaTuru = _okEsle(v.yaralanmaTuru, YARALANMA_TURLERI) || v.yaralanmaTuru;
  v.durum = _okEsle(v.durum, OLAY_DURUMLARI) || 'Açık';

  v.kronoloji = v.kronoloji.map(s => {
    const p = _okParcalar(s);
    if (p.length > 1) return { saat: _okExcelSaat(p[0]), gelisme: p.slice(1).join(' | ') };
    const m = s.match(/^(\d{1,2}[:.]\d{2})\s*[-–]?\s*(.*)$/);
    return m ? { saat: _okExcelSaat(m[1]), gelisme: m[2] } : { saat: '', gelisme: s };
  });
  v.tanikIfadeleri = v.tanikIfadeleri.map(s => {
    const p = _okParcalar(s);
    return { adSoyad: p[0] || '', unvan: p.length > 2 ? p[1] : '', ifade: p.length > 2 ? p.slice(2).join(' | ') : (p[1] || '') };
  });
  v.aksiyonlar = v.aksiyonlar.map(s => {
    const p = _okParcalar(s);
    return { baslik: p[0] || '', duzelticiFaaliyet: p[1] || '', sorumlu: p[2] || '', termin: _okExcelTarih(p[3] || ''), durum: _okEsle(p[4] || '', ['Açık', 'Kapalı']) || 'Açık' };
  }).filter(a => a.baslik || a.duzelticiFaaliyet);
  v.ilgiliMevzuat = v.ilgiliMevzuat.join('\n');
  return v;
}

// callback(sonuc, hataMesaji) — sonuc: excelToplulIceAktarSonucOzetle çıktısı.
function olayExcelIceAktar(dosya, callback) {
  if (!dosya) return;
  xlsxHazirOlduğunda(() => {
    const okuyucu = new FileReader();
    okuyucu.onload = e => {
      let satirlar;
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const sayfaAdi = wb.SheetNames.find(a => _basligiNormallestir(a) === 'olaylar') || wb.SheetNames[0];
        const ham = XLSX.utils.sheet_to_json(wb.Sheets[sayfaAdi], { defval: '', raw: true });
        satirlar = ham.map(s => _satiriEslestirHam(s))
          .filter(s => Object.values(s).some(d => String(d ?? '').trim() !== ''))
          .map(_okImportSatiriniDonustur);
      } catch (err) {
        console.error(err);
        callback(null, 'Dosya okunamadı. Geçerli bir Excel (.xlsx) dosyası seçtiğinizden emin olun.');
        return;
      }
      callback(excelToplulIceAktarSonucOzetle(satirlar, olayKaydiEkle), null);
    };
    okuyucu.onerror = () => callback(null, 'Dosya okunamadı.');
    okuyucu.readAsArrayBuffer(dosya);
  });
}

// core/excel.js _satiriEslestir her değeri metne çevirir; tarih/saat seri
// sayıları korunmalı olduğu için ham değerle eşleştiren kopyası.
function _satiriEslestirHam(satir) {
  const harita = {};
  Object.keys(satir).forEach(k => { harita[_basligiNormallestir(k)] = satir[k]; });
  const sonuc = {};
  OLAY_IMPORT_KOLONLARI.forEach(kolon => {
    const aday = [kolon.baslik].concat(kolon.esanlamlar || []).map(_basligiNormallestir).find(a => Object.prototype.hasOwnProperty.call(harita, a));
    const d = aday !== undefined ? harita[aday] : '';
    sonuc[kolon.anahtar] = typeof d === 'string' ? d.trim() : d;
  });
  return sonuc;
}
