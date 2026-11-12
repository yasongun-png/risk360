// Uygunsuzluk / DÖF — kapak sayfalı, fotoğraflı Word raporları.
// Eski üretim uygulamasındaki (uygunsuzluk-platform-standalone.html) kapak +
// liste + öncesi/sonrası fotoğraf sütunlu PDF çıktısıyla mümkün olduğunca
// aynı mantık: kayıtlar Açık/Kapalı olarak İKİ AYRI bölüme ayrılır (tek
// karışık liste değil, aralarında ayırıcı sayfa vardır), durum rengi de aynı
// kalıpta tutulur (Açık = yeşil, Kapalı = kırmızı). Kapak sayfasındaki başlık
// ve giriş metni serbestçe düzenlenebilir (bkz. ui.js raporMetniGetir/Kaydet —
// eski uygulamadaki "Konu" / editTopicPdfIntroPrompt mantığı). Ayrıca her
// kayıt için ayrı "Uygunsuzluk Formu" Word dosyası üretilir
// (gerçek üretim örneğiyle birebir: kapak bilgisi + 4 bölüm + öncesi/sonrası
// fotoğraf). Formun sağ üst köşesinde ortak Form Ayarları (Doküman No/
// Sürüm Tarihi/Sürüm No/Sayfa Sayısı) kutusu bulunur (bkz. core/form-ayarlari.js).

// Toplu Word raporunda her tablo sayfasına düşen kayıt sayısı (yatay A4,
// satır başına ~34mm fotoğraf kutusu) — bkz. uygunsuzlukRaporuWordOlustur.
const UC_SAYFA_BASINA_SATIR = 4;

function _ucKayitlariParcala(kayitlar, boyut) {
  const parcalar = [];
  for (let i = 0; i < kayitlar.length; i += boyut) parcalar.push(kayitlar.slice(i, i + boyut));
  return parcalar.length ? parcalar : [[]];
}

// ==================== TOPLU RAPOR (WORD) ====================
// Kullanıcı isteği: "uygunsuzluk pdf raporunun yanına aynısının word
// butonunu yapalım, rapor birebir aynı olsun; beğenirsem pdf'i kaldıracağız"
// — eski PDF liste raporuyla AYNI veri/filtre/bölüm sırası ve ölçüler:
// yatay A4, 7mm kenar, kapak (dikey ortalı çerçeveli kutu), AÇIK kayıtlar
// (sayfa başına UC_SAYFA_BASINA_SATIR satır, ilk sayfada başlık +
// istatistik), "KAPALI UYGUNSUZLUKLAR" ayırıcı sayfası, KAPALI kayıtlar,
// altta ortalı "Sayfa X / Y". Kullanıcı Word'ü beğenince PDF liste raporu
// tamamen kaldırıldı ("pdf raporunu kaldır", "maili word yapalım").

// Eski PDF'teki fotoğraf kutusu (object-fit:cover, 34mm yükseklik) ile aynı:
// fotoğraf kutuyu dolduracak şekilde ortadan kırpılıp JPEG'e çevrilir
// (Word'de kırpma olmadığı için kırpma burada yapılır; ayrıca dosya boyutu
// küçük kalır). Çözülemeyen fotoğraf null döner → boş gri kutu basılır.
async function _ucWordFotoVerisi(url, genPx, yukPx) {
  if (!url) return null;
  try {
    const blob = await (await fetch(url)).blob();
    const img = await new Promise((coz, red) => {
      const i = new Image();
      i.onload = () => coz(i);
      i.onerror = red;
      i.src = URL.createObjectURL(blob);
    });
    const hedefOran = genPx / yukPx;
    let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
    if (sw / sh > hedefOran) { sw = sh * hedefOran; sx = (img.naturalWidth - sw) / 2; }
    else { sh = sw / hedefOran; sy = (img.naturalHeight - sh) / 2; }
    const canvas = document.createElement('canvas');
    canvas.width = genPx * 2;
    canvas.height = yukPx * 2;
    canvas.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    const jpeg = await new Promise(coz => canvas.toBlob(coz, 'image/jpeg', 0.8));
    return new Uint8Array(await jpeg.arrayBuffer());
  } catch (e) {
    console.error('Uygunsuzluk fotoğrafı Word raporuna eklenemedi:', e);
    return null;
  }
}

// indir=false: dosyayı indirmez, { blob, dosyaAdi } döner — Mail Gönder'in
// "Uygunsuzluk Listesi" linki için (bkz. uygunsuzlukListesiWordUrlOlustur).
async function uygunsuzlukRaporuWordOlustur(indir = true) {
  const filtreler = _usAktifFiltreleriGetir();
  const kayitlarHam = uygunsuzluklariGetir(document.getElementById('aramaKutusu').value, filtreler);
  if (!kayitlarHam.length) {
    alert('Seçili filtreler için Word raporu oluşturulacak kayıt yok.');
    return;
  }

  const mm = v => Math.round(v * 56.7);          // mm → twip
  const px = v => Math.round(v * 96 / 25.4);     // mm → docx görsel pikseli
  const FOTO_GEN = px(35), FOTO_YUK = px(34);
  const SAYFA_GEN = mm(297 - 14);                // 7mm sol/sağ kenar
  const SUTUNLAR = [7, 8, 6, 19, 6, 6, 9, 6, 7, 13, 13].map(y => Math.round(SAYFA_GEN * y / 100));
  const hucreKenar = { style: docx.BorderStyle.SINGLE, size: 4, color: 'CBD5E1' };
  const baslikKenar = { style: docx.BorderStyle.SINGLE, size: 4, color: '94A3B8' };
  const yok = { style: docx.BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const kenarsiz = { top: yok, bottom: yok, left: yok, right: yok, insideHorizontal: yok, insideVertical: yok };
  const koyuCizgi = { style: docx.BorderStyle.SINGLE, size: 12, color: '111827' };
  const kalinCerceve = { style: docx.BorderStyle.SINGLE, size: 18, color: '111827' };
  const hucreBosluk = { top: 45, bottom: 45, left: 60, right: 60 };

  const kayitlar = await Promise.all(kayitlarHam.map(async k => {
    const [oncesi, sonrasi] = await Promise.all([k.fotoOncesi, k.fotoSonrasi].map(async ref => {
      const url = await fotoBuyukCoz(ref);
      return url ? _ucWordFotoVerisi(url, FOTO_GEN, FOTO_YUK) : null;
    }));
    return Object.assign({}, k, { _fotoOncesi: oncesi, _fotoSonrasi: sonrasi });
  }));
  const acikKayitlar = kayitlar.filter(k => k.durum !== 'Kapalı');
  const kapaliKayitlar = kayitlar.filter(k => k.durum === 'Kapalı');
  const ozet = uygunsuzlukOzetiHesapla({ konuId: _secilenKonuId });
  const firma = aktifFirmaGetir();
  const bugun = gunAyYil(bugunIso());
  const rapor = raporMetniGetir();

  const metin = (text, o = {}) => new docx.TextRun(Object.assign({ text: String(text ?? ''), font: 'Arial', color: '111827' }, o));

  const tdHucre = (cocuk, genislik, opts = {}) => new docx.TableCell(Object.assign({
    width: { size: genislik, type: docx.WidthType.DXA },
    margins: hucreBosluk,
    verticalAlign: docx.VerticalAlign.CENTER,
    borders: { top: hucreKenar, bottom: hucreKenar, left: hucreKenar, right: hucreKenar },
    children: Array.isArray(cocuk) ? cocuk : [cocuk]
  }, opts));
  const tdMetin = (deger, genislik) => tdHucre(new docx.Paragraph({ children: [metin(deger, { size: 16 })] }), genislik);

  const fotoHucre = (veri, genislik) => veri
    ? tdHucre(new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.ImageRun({ data: veri, transformation: { width: FOTO_GEN, height: FOTO_YUK } })] }), genislik)
    // PDF'teki .uc-foto-bos: aynı yükseklikte gri kutu.
    : tdHucre(new docx.Table({
        width: { size: SUTUNLAR[9] - 120, type: docx.WidthType.DXA },
        rows: [new docx.TableRow({ height: { value: mm(34), rule: docx.HeightRule.EXACT }, children: [new docx.TableCell({
          shading: { fill: 'F3F4F6', color: 'auto', type: docx.ShadingType.CLEAR },
          borders: { top: hucreKenar, bottom: hucreKenar, left: hucreKenar, right: hucreKenar },
          children: [new docx.Paragraph('')]
        })] })]
      }), genislik);

  const rozet = acikMi => new docx.Paragraph({ children: [metin(acikMi ? ' AÇIK ' : ' KAPALI ', {
    bold: true, size: 15, color: 'FFFFFF',
    shading: { fill: acikMi ? '16A34A' : 'DC2626', color: 'auto', type: docx.ShadingType.CLEAR }
  })] });

  const satir = k => new docx.TableRow({ cantSplit: true, children: [
    tdMetin(k.aksiyonNo, SUTUNLAR[0]),
    tdMetin(k.bolum, SUTUNLAR[1]),
    tdMetin(gunAyYil(k.bildirimTarihi), SUTUNLAR[2]),
    tdMetin(`${k.baslik || ''}${k.aciklama ? ' — ' + k.aciklama : ''}`, SUTUNLAR[3]),
    tdMetin(k.riskSeviyesi, SUTUNLAR[4]),
    tdMetin(gunAyYil(k.termin) || '-', SUTUNLAR[5]),
    tdMetin(k.sorumlu, SUTUNLAR[6]),
    tdHucre(rozet(k.durum !== 'Kapalı'), SUTUNLAR[7]),
    tdMetin(k.kanitAciklamasi || '-', SUTUNLAR[8]),
    fotoHucre(k._fotoOncesi, SUTUNLAR[9]),
    fotoHucre(k._fotoSonrasi, SUTUNLAR[10])
  ] });

  const BASLIKLAR = ['No', 'Tesis / Birim', 'Bildirim Tarihi', 'Uygunsuzluk Tanımı', 'Risk', 'Termin', 'Sorumlu', 'Durum', 'Kapanış Açıklaması', 'Öncesi', 'Sonrası'];
  const tablo = parca => new docx.Table({
    width: { size: SAYFA_GEN, type: docx.WidthType.DXA },
    columnWidths: SUTUNLAR,
    layout: docx.TableLayoutType.FIXED,
    rows: [
      new docx.TableRow({ tableHeader: true, children: BASLIKLAR.map((b, i) => new docx.TableCell({
        width: { size: SUTUNLAR[i], type: docx.WidthType.DXA },
        margins: hucreBosluk,
        verticalAlign: docx.VerticalAlign.CENTER,
        shading: { fill: 'E5E7EB', color: 'auto', type: docx.ShadingType.CLEAR },
        borders: { top: baslikKenar, bottom: baslikKenar, left: baslikKenar, right: baslikKenar },
        children: [new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [metin(b.toLocaleUpperCase('tr'), { bold: true, size: 15 })] })]
      })) }),
      ...(parca.length ? parca.map(satir) : [new docx.TableRow({ children: [tdHucre(
        new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [metin('Kayıt bulunmamaktadır.', { size: 16, color: '64748B' })] }),
        SAYFA_GEN, { columnSpan: 11 }
      )] })])
    ]
  });

  const bolumBasligi = t => new docx.Paragraph({
    spacing: { after: mm(3) },
    border: { bottom: { style: docx.BorderStyle.SINGLE, size: 12, color: '111827', space: 4 } },
    children: [metin(t, { bold: true, size: 26 })]
  });

  // Kayıtları UC_SAYFA_BASINA_SATIR'lık sayfalara böler; her sayfa kendi
  // başlık satırlı tablosu (PDF'te her sayfa ayrı tablo olduğu gibi).
  const listeSayfalari = (liste, ilkSayfaOnEki) => _ucKayitlariParcala(liste, UC_SAYFA_BASINA_SATIR).flatMap((parca, i) => [
    ...(i > 0 ? [new docx.Paragraph({ children: [new docx.PageBreak()] })] : []),
    ...(i === 0 ? ilkSayfaOnEki : []),
    tablo(parca)
  ]);

  // Kapak ve ayırıcı: PDF'teki gibi sayfanın ortasında kalın çerçeveli kutu.
  const cerceveliKutu = (yuzde, cocuklar) => new docx.Table({
    width: { size: Math.round(SAYFA_GEN * yuzde / 100), type: docx.WidthType.DXA },
    alignment: docx.AlignmentType.CENTER,
    rows: [new docx.TableRow({ children: [new docx.TableCell({
      margins: { top: mm(14), bottom: mm(14), left: mm(14), right: mm(14) },
      borders: { top: kalinCerceve, bottom: kalinCerceve, left: kalinCerceve, right: kalinCerceve },
      children: cocuklar
    })] })]
  });

  const girisParagraflari = (rapor.girisMetni || '').split(/\n+/).map(p => p.trim()).filter(Boolean);
  const kapak = cerceveliKutu(78, [
    new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { after: mm(6) }, children: [metin(firma ? firma.ad : '', { bold: true, size: 24, color: '374151' })] }),
    new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { after: mm(8) }, children: [metin(rapor.konu, { bold: true, size: 38 })] }),
    ...(girisParagraflari.length
      ? girisParagraflari.map(p => new docx.Paragraph({ spacing: { after: mm(4), line: 384 }, children: [metin(p, { size: 20 })] }))
      : [new docx.Paragraph({ spacing: { after: mm(4), line: 384 }, children: [metin('Rapor kapak metni henüz girilmedi. "Rapor Kapak Metni" düğmesinden ekleyebilirsiniz.', { size: 20, color: '64748B' })] })]),
    new docx.Paragraph({ alignment: docx.AlignmentType.RIGHT, spacing: { before: mm(8) }, children: [metin(`Rapor Tarihi: ${bugun}`, { size: 18, color: '374151' })] })
  ]);

  const ayirici = cerceveliKutu(70, [
    new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { after: mm(4) }, children: [metin(UYG_CEVRE_MODU ? 'KAPALI ÇEVRE UYGUNSUZLUKLARI' : 'KAPALI UYGUNSUZLUKLAR', { bold: true, size: 32 })] }),
    new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { after: mm(8) }, children: [metin('Bu bölümde kapalı uygunsuzluklar yer alır.', { size: 20, color: '374151' })] }),
    new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [metin(`Rapor Tarihi: ${bugun}`, { size: 18, color: '374151' })] })
  ]);

  // PDF'teki .uc-liste-ustbilgi: solda iki satırlık başlık, sağda Toplam/
  // Açık/Kapalı sayıları, altında koyu çizgi.
  const istatistikHucre = (sayi, etiket) => new docx.TableCell({
    width: { size: mm(15), type: docx.WidthType.DXA },
    verticalAlign: docx.VerticalAlign.BOTTOM,
    margins: { bottom: mm(3) },
    borders: { top: yok, left: yok, right: yok, bottom: koyuCizgi },
    children: [
      new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [metin(sayi, { bold: true, size: 28 })] }),
      new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [metin(etiket, { size: 18 })] })
    ]
  });
  const listeUstBilgi = new docx.Table({
    width: { size: SAYFA_GEN, type: docx.WidthType.DXA },
    columnWidths: [SAYFA_GEN - mm(15) * 3 - mm(10), mm(15), mm(15), mm(15), mm(10)],
    borders: kenarsiz,
    rows: [new docx.TableRow({ children: [
      new docx.TableCell({
        width: { size: SAYFA_GEN - mm(15) * 3 - mm(10), type: docx.WidthType.DXA },
        verticalAlign: docx.VerticalAlign.BOTTOM,
        margins: { bottom: mm(3) },
        borders: { top: yok, left: yok, right: yok, bottom: koyuCizgi },
        children: [
          new docx.Paragraph({ children: [metin('İŞ SAĞLIĞI VE GÜVENLİĞİ', { bold: true, size: 28 })] }),
          new docx.Paragraph({ children: [metin(UYG_CEVRE_MODU ? 'ÇEVRE UYGUNSUZLUK LİSTESİ' : 'UYGUNSUZLUK LİSTESİ', { bold: true, size: 28 })] })
        ]
      }),
      istatistikHucre(ozet.toplam, 'Toplam'),
      istatistikHucre(ozet.acik, 'Açık'),
      istatistikHucre(ozet.kapali, 'Kapalı'),
      new docx.TableCell({ width: { size: mm(10), type: docx.WidthType.DXA }, borders: { top: yok, left: yok, right: yok, bottom: koyuCizgi }, children: [new docx.Paragraph('')] })
    ] })]
  });

  const altBilgi = new docx.Footer({ children: [new docx.Paragraph({
    alignment: docx.AlignmentType.CENTER,
    children: [new docx.TextRun({ children: ['Sayfa ', docx.PageNumber.CURRENT, ' / ', docx.PageNumber.TOTAL_PAGES], size: 16, color: '646464', font: 'Arial' })]
  })] });
  const sayfa = { size: { orientation: docx.PageOrientation.LANDSCAPE }, margin: { top: mm(7), right: mm(7), bottom: mm(9), left: mm(7), footer: mm(3) } };
  const bolum = (children, ortali) => ({
    properties: Object.assign({ page: sayfa }, ortali ? { verticalAlign: docx.VerticalAlign.CENTER } : {}),
    footers: { default: altBilgi },
    children
  });

  const doc = new docx.Document({
    styles: { default: { document: { run: { font: 'Arial', size: 16 } } } },
    sections: [
      bolum([kapak], true),
      bolum(listeSayfalari(acikKayitlar, [
        listeUstBilgi,
        new docx.Paragraph({ spacing: { after: mm(5) }, children: [] }),
        bolumBasligi(`AÇIK KAYITLAR (${acikKayitlar.length})`)
      ])),
      bolum([ayirici], true),
      bolum(listeSayfalari(kapaliKayitlar, [bolumBasligi(`KAPALI KAYITLAR (${kapaliKayitlar.length})`)]))
    ]
  });
  const blob = await docx.Packer.toBlob(doc);
  const dosyaAdi = `${UYG_CEVRE_MODU ? 'Cevre_' : ''}Uygunsuzluk_Raporu_${bugun.replace(/\./g, '-')}.docx`;
  if (indir) saveAs(blob, dosyaAdi);
  return { blob, dosyaAdi };
}

// Mail Gönder'in EmailJS'e ikinci bir link olarak eklediği "Uygunsuzluk
// Listesi" raporu -- uygunsuzlukKayitWordUrlOlustur ile AYNI Storage yükleme
// deseni (bkz. orada ki uzun yorum: ek boyutu sınırı, CORS vb.). Mail
// gönderilirken tablodaki O ANKİ arama/filtre neyse onunla üretilir --
// "Word Raporu" düğmesiyle birebir aynı dosya. Kullanıcı isteği: "maili
// word yapalım" — eskiden PDF liste raporuydu. EmailJS şablonu değişkeni
// geriye dönük uyumluluk için hâlâ liste_pdf_url adıyla gönderilir.
async function uygunsuzlukListesiWordUrlOlustur() {
  const storage = typeof bulutStorageAl === 'function' ? bulutStorageAl() : null;
  if (!storage) return null;

  const uretim = await uygunsuzlukRaporuWordOlustur(false);
  if (!uretim) return null;

  const firma = typeof aktifFirmaGetir === 'function' ? aktifFirmaGetir() : null;
  const yol = 'uygunsuzluk_liste_word/' + (firma ? firma.slug : 'genel') + '/' + Date.now() + '_' + uretim.dosyaAdi;
  const blob = uretim.blob;

  // Kullanıcı bildirdi: "liste raporu uzun sürüyor" -- tek kayıt formundan
  // farklı olarak bu, filtreye uyan TÜM kayıtları (çok sayfalı, fotoğraflı
  // olabilir) içerdiğinden dosya çok daha büyük olabilir; tek kayıt
  // linkindeki 20 saniyelik süre bu yükleme için gerçekçi çıkabiliyordu,
  // 60 saniyeye çıkarıldı.
  const zamanAsimi = new Promise((_, reddet) => setTimeout(() => reddet(new Error('Liste Word yükleme zaman aşımına uğradı (Storage yanıt vermedi).')), 60000));
  const yukleme = (async () => {
    const anlik = await storage.ref().child(yol).put(blob, { contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    return anlik.ref.getDownloadURL();
  })();
  return Promise.race([yukleme, zamanAsimi]);
}

// ==================== TEKİL KAYIT WORD'Ü (UYGUNSUZLUK FORMU) ====================
// Kullanıcı isteği: "uygunsuzluk pdf i word olarak versin, pdf istemiyorum,
// aynısını word olarak versin" — eski PDF formuyla aynı içerik ve sıra: logo +
// başlık + form ayarları üst bilgisi, 3 metin bölümü, 2. sayfadan itibaren
// görsel kanıtlar, ek fotoğraflar, onay (konum krokisi kullanıcı isteğiyle
// kaldırıldı). Üst bilgi Word'ün kendi
// sayfa başlığında olduğundan her sayfada tekrar eder; "Sayfa Sayısı" Word alanı
// olduğundan her sayfada gerçek değeri gösterir.

// Firebase Storage URL'leri canvas'a sorunsuz çizilsin diye görsel önce
// indirilip data: URL'e çevrilir; zaten data: ise dokunmadan geri döner.
async function _ucGorseliDataUrlaCevir(url) {
  if (!url || url.startsWith('data:')) return url || '';
  try {
    const yanit = await fetch(url);
    const blob = await yanit.blob();
    return await new Promise((coz, red) => {
      const okuyucu = new FileReader();
      okuyucu.onload = () => coz(okuyucu.result);
      okuyucu.onerror = red;
      okuyucu.readAsDataURL(blob);
    });
  } catch (e) {
    console.error('Kroki görseli indirilemedi (CORS/ağ hatası olabilir):', e);
    return '';
  }
}

// Saha Dijital Haritası köprüsü — bkz. modules/harita. Kayıtta işaretli bir
// konum varsa o tesisin kroki görselini ve noktayı döner; yoksa null (çağıran
// taraf yer tutucu metin gösterir).
async function _ucKrokiGorseliniHazirla(k) {
  if (!k.haritaTesisId || k.haritaX === '' || k.haritaY === '') {
    console.warn('[Kroki] Kayıtta haritaTesisId/haritaX/haritaY yok:', k.aksiyonNo);
    return null;
  }
  const tesis = haritaTesisIdIleGetirRepo(k.haritaTesisId);
  if (!tesis) { console.warn('[Kroki] Tesis bulunamadı, id:', k.haritaTesisId); return null; }
  if (!tesis.gorselUrl) { console.warn('[Kroki] Tesiste gorselUrl yok:', tesis.ad); return null; }
  const krokiUrl = await fotoBuyukCoz(tesis.gorselUrl);
  if (!krokiUrl) { console.warn('[Kroki] fotoBuyukCoz boş döndü, gorselUrl:', tesis.gorselUrl); return null; }
  const dataUrl = await _ucGorseliDataUrlaCevir(krokiUrl);
  if (!dataUrl) { console.warn('[Kroki] Görsel data URL\'e çevrilemedi:', krokiUrl.slice(0, 60)); return null; }
  return { url: dataUrl, x: Number(k.haritaX) || 0, y: Number(k.haritaY) || 0, tesisAdi: tesis.ad };
}

async function _ucWordGorselAc(url) {
  const blob = await (await fetch(url)).blob();
  return new Promise((coz, red) => {
    const i = new Image();
    i.onload = () => coz(i);
    i.onerror = red;
    i.src = URL.createObjectURL(blob);
  });
}

// Görseli kırpmadan kutuya sığdırır (eski PDF'teki object-fit:contain).
// Şeffaf logo/imza JPEG'de siyah çıkmasın diye zemin beyaz boyanır. kroki
// verilirse işaret noktası görselin üstüne çizilir. Çözülemezse null döner.
async function _ucWordGorselSigdir(url, maksGen, maksYuk, kroki) {
  if (!url) return null;
  try {
    const img = await _ucWordGorselAc(url);
    const oran = Math.min(maksGen / img.naturalWidth, maksYuk / img.naturalHeight, kroki ? Infinity : 1);
    const gen = Math.max(1, Math.round(img.naturalWidth * oran));
    const yuk = Math.max(1, Math.round(img.naturalHeight * oran));
    const canvas = document.createElement('canvas');
    canvas.width = gen * 2;
    canvas.height = yuk * 2;
    const c = canvas.getContext('2d');
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, canvas.width, canvas.height);
    c.drawImage(img, 0, 0, canvas.width, canvas.height);
    if (kroki) {
      const x = canvas.width * kroki.x / 100, y = canvas.height * kroki.y / 100;
      c.font = 'bold 22px Arial';
      const kutuGen = c.measureText(kroki.kod).width + 16, kutuYuk = 30;
      c.fillStyle = 'rgba(17,24,39,0.87)';
      c.fillRect(x - kutuGen / 2, y - kutuYuk, kutuGen, kutuYuk);
      c.fillStyle = '#ffffff';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(kroki.kod, x, y - kutuYuk / 2);
      const ucgenAlt = y - kutuYuk - 4;
      c.fillStyle = '#dc2626';
      c.beginPath();
      c.moveTo(x, ucgenAlt - 36);
      c.lineTo(x - 20, ucgenAlt);
      c.lineTo(x + 20, ucgenAlt);
      c.closePath();
      c.fill();
    }
    const jpeg = await new Promise(coz => canvas.toBlob(coz, 'image/jpeg', 0.85));
    return { veri: new Uint8Array(await jpeg.arrayBuffer()), gen, yuk };
  } catch (e) {
    console.error('Görsel Word formuna eklenemedi:', e);
    return null;
  }
}

// indir=false: dosyayı indirmez, { blob, dosyaAdi } döner — Mail Gönder'in form
// linki için (bkz. uygunsuzlukKayitWordUrlOlustur).
async function uygunsuzlukKayitWordOlustur(id, indir = true) {
  const k = uygunsuzlukIdIleGetirRepo(id);
  if (!k) return null;

  const firma = aktifFirmaGetir();
  const logo = firma ? firmaLogoGetir(firma.id) : '';
  const acikMi = k.durum !== 'Kapalı';
  const tanim = [k.baslik, k.aciklama].filter(Boolean).join(' — ');
  const imzalar = k.imzalar || {};
  const fa = formAyarlariGetir('uygunsuzluk');

  const mm = v => Math.round(v * 56.7);          // mm → twip
  const px = v => Math.round(v * 96 / 25.4);     // mm → docx görsel pikseli
  const GENISLIK = mm(194);                      // A4 dikey, 8mm kenar
  const koyu = { style: docx.BorderStyle.SINGLE, size: 8, color: '111827' };
  const kalin = { style: docx.BorderStyle.SINGLE, size: 12, color: '111827' };
  const acik = { style: docx.BorderStyle.SINGLE, size: 4, color: 'CBD5E1' };
  const cerceve = kenar => ({ top: kenar, bottom: kenar, left: kenar, right: kenar });

  const gorsel = async (ref, gen, yuk) => _ucWordGorselSigdir(await fotoBuyukCoz(ref), px(gen), px(yuk));
  // Kullanıcı isteği: konum krokisi Uygunsuzluk Formu'nda gösterilmesin — kroki
  // hazırlanmaz. _ucKrokiGorseliniHazirla şu an kullanılmıyor; geri istenirse diye duruyor.
  const [logoGorsel, fotoOncesi, fotoSonrasi, bildirenImza, sorumluImza, ekFotolar] = await Promise.all([
    _ucWordGorselSigdir(logo, px(24), px(16)),
    gorsel(k.fotoOncesi, 91, 54),
    gorsel(k.fotoSonrasi, 91, 54),
    gorsel(imzalar.bildiren && imzalar.bildiren.imzaUrl, 80, 12),
    gorsel(imzalar.sorumlu && imzalar.sorumlu.imzaUrl, 80, 12),
    Promise.all([2, 3, 4].map(async no => ({
      no,
      oncesiVarMi: !!k['fotoOncesi' + no],
      sonrasiVarMi: !!k['fotoSonrasi' + no],
      oncesi: await gorsel(k['fotoOncesi' + no], 85, 38),
      sonrasi: await gorsel(k['fotoSonrasi' + no], 85, 38)
    })))
  ]);
  // Boş kalan çiftler tabloya hiç girmez.
  const ekFotoSatirlari = ekFotolar.filter(f => f.oncesiVarMi || f.sonrasiVarMi);

  const metin = (text, o = {}) => new docx.TextRun(Object.assign({ text: String(text ?? ''), font: 'Arial', color: '111827', size: 18 }, o));
  // Çok satırlı metin (Ek Açıklama vb.) satır satır korunur.
  const satirli = (deger, o = {}) => String(deger ?? '').split('\n').map((s, i) => metin(s, Object.assign(i ? { break: 1 } : {}, o)));
  const resim = g => new docx.ImageRun({ data: g.veri, transformation: { width: g.gen, height: g.yuk } });
  const paragraf = (children, o = {}) => new docx.Paragraph(Object.assign({ children }, o));
  const ortali = (children, o = {}) => paragraf(children, Object.assign({ alignment: docx.AlignmentType.CENTER }, o));
  const hucre = (children, genislik, o = {}) => new docx.TableCell(Object.assign({
    width: { size: genislik, type: docx.WidthType.DXA },
    borders: cerceve(koyu),
    margins: { top: mm(2), bottom: mm(2), left: mm(3), right: mm(3) },
    children
  }, o));
  const tablo = (sutunlar, rows) => new docx.Table({
    width: { size: GENISLIK, type: docx.WidthType.DXA },
    columnWidths: sutunlar,
    layout: docx.TableLayoutType.FIXED,
    rows
  });
  const bosluk = () => paragraf([metin('', { size: 8 })], { spacing: { before: 0, after: mm(1) } });
  const bolumBasligi = (baslik, sutunSayisi) => new docx.TableRow({ cantSplit: true, children: [hucre(
    [paragraf([metin(baslik.toLocaleUpperCase('tr'), { bold: true, size: 19 })], { keepNext: true })],
    GENISLIK,
    { columnSpan: sutunSayisi }
  )] });

  // 1-3. bölümlerin ortak 4 sütunlu etiket/değer tablosu.
  const ETIKET = mm(31), DEGER = mm(66);
  const SUTUNLAR = [ETIKET, DEGER, ETIKET, DEGER];
  const etiketHucre = etiket => hucre([paragraf([metin(etiket, { bold: true })])], ETIKET);
  const degerRun = d => (Array.isArray(d) ? d : satirli(d || '-'));
  const tekAlan = (etiket, d) => new docx.TableRow({ children: [etiketHucre(etiket), hucre([paragraf(degerRun(d))], GENISLIK - ETIKET, { columnSpan: 3 })] });
  const ikiAlan = (e1, d1, e2, d2) => new docx.TableRow({ children: [etiketHucre(e1), hucre([paragraf(degerRun(d1))], DEGER), etiketHucre(e2), hucre([paragraf(degerRun(d2))], DEGER)] });
  const rozet = (yazi, zemin, renk) => [metin(` ${yazi} `, { bold: true, size: 17, color: renk, shading: { fill: zemin, color: 'auto', type: docx.ShadingType.CLEAR } })];
  // Fine-Kinney düzeyleri (risk modülü renkleri) + eski 4'lü ölçek.
  const riskRenk = {
    'Önemsiz Risk': ['DCFCE7', '15803D'], 'Olası Risk': ['FEF3C7', 'B45309'], 'Önemli Risk': ['FFEDD5', 'C2410C'],
    'Esaslı Risk': ['FEE2E2', 'B91C1C'], 'Tolerans Gösterilemez': ['450A0A', 'FECACA'],
    'Düşük': ['DCFCE7', '15803D'], 'Orta': ['FEF3C7', 'B45309'], 'Yüksek': ['FEE2E2', 'B91C1C'], 'Çok Yüksek': ['FEE2E2', 'B91C1C']
  }[k.riskSeviyesi];

  // ---- Her sayfada tekrar eden üst bilgi ----
  const FA_GEN = mm(42), LOGO_GEN = mm(28);
  const faSatir = (etiket, degerRunlari) => paragraf([metin(etiket, { bold: true, size: 14 }), new docx.TextRun({ children: [new docx.Tab(), ...degerRunlari], font: 'Arial', color: '111827', size: 14 })], { tabStops: [{ type: docx.TabStopType.LEFT, position: mm(17) }] });
  const ustBilgi = new docx.Header({ children: [
    new docx.Table({
      width: { size: GENISLIK, type: docx.WidthType.DXA },
      columnWidths: [LOGO_GEN, GENISLIK - LOGO_GEN - FA_GEN, FA_GEN],
      layout: docx.TableLayoutType.FIXED,
      rows: [new docx.TableRow({ children: [
        hucre([ortali(logoGorsel ? [resim(logoGorsel)] : [metin('LOGO YOK', { bold: true, size: 16, color: '94A3B8' })])], LOGO_GEN, { borders: cerceve(kalin), verticalAlign: docx.VerticalAlign.CENTER, margins: { top: mm(2), bottom: mm(2), left: mm(1), right: mm(1) } }),
        hucre([ortali([metin(UYG_CEVRE_MODU ? 'ÇEVRE UYGUNSUZLUK FORMU' : 'UYGUNSUZLUK FORMU', { bold: true, size: 26 })])], GENISLIK - LOGO_GEN - FA_GEN, { borders: cerceve(kalin), verticalAlign: docx.VerticalAlign.CENTER }),
        hucre([
          faSatir('Doküman No', [`: ${fa.dokumanNo || '-'}`]),
          faSatir('Sürüm Tarihi', [`: ${fa.surumTarihi || '-'}`]),
          faSatir('Sürüm No', [`: ${fa.surumNo || '-'}`]),
          faSatir('Sayfa Sayısı', [': ', docx.PageNumber.CURRENT, '/', docx.PageNumber.TOTAL_PAGES])
        ], FA_GEN, { borders: cerceve(kalin), verticalAlign: docx.VerticalAlign.CENTER, margins: { top: mm(1), bottom: mm(1), left: mm(1.5), right: mm(1) } })
      ] })]
    }),
    bosluk()
  ] });

  const altBilgi = new docx.Footer({ children: [
    ortali([metin('🌱 Çevre sorumluluğunuzu düşünerek lütfen gerekmedikçe çıktı almayınız.', { size: 15, color: '64748B' })]),
    ortali([new docx.TextRun({ children: ['Sayfa ', docx.PageNumber.CURRENT, ' / ', docx.PageNumber.TOTAL_PAGES], size: 16, color: '646464', font: 'Arial' })])
  ] });

  // ---- 1. sayfa: metin bölümleri ----
  const genelBilgiler = tablo(SUTUNLAR, [
    bolumBasligi('1. Genel Bilgiler', 4),
    ikiAlan('Bildirim No', k.aksiyonNo, 'Bildirim Tarihi', gunAyYil(k.bildirimTarihi)),
    tekAlan('Birim / Tesis', k.bolum),
    ikiAlan('Bildiren Kişi', k.atayan, 'Risk Seviyesi', riskRenk ? rozet(k.riskSeviyesi, riskRenk[0], riskRenk[1]) : k.riskSeviyesi),
    ...(fk => fk ? [tekAlan('Fine-Kinney', `O: ${k.fkO}  ×  F: ${k.fkF}  ×  Ş: ${k.fkS}  =  RP ${fk.puan.toLocaleString('tr-TR')} (${fk.duzey})`)] : [])(uygunsuzlukFineKinney(k))
  ]);
  const detaylar = tablo(SUTUNLAR, [
    bolumBasligi('2. Uygunsuzluk Detayları', 4),
    tekAlan('Tanım', tanim),
    tekAlan('Kök Neden', k.kokNeden),
    tekAlan('Faaliyet Önerisi', k.duzelticiFaaliyet),
    tekAlan('İlgili Yasal Şartlar', (k.yasalSartlar && k.yasalSartlar.length) ? k.yasalSartlar.join(', ') : '-'),
    tekAlan('Yasal Dayanak / Not', k.yasalDayanak)
  ]);
  const aksiyon = tablo(SUTUNLAR, [
    bolumBasligi('3. Aksiyon ve Kapanış', 4),
    ikiAlan('Sorumlu', k.sorumlu, 'Hedef Termin', gunAyYil(k.termin)),
    ikiAlan('Durum', acikMi ? rozet('AÇIK', '16A34A', 'FFFFFF') : rozet('KAPALI', 'DC2626', 'FFFFFF'), 'Kapanış Tarihi', gunAyYil(k.kapanisTarihi)),
    tekAlan('Kapanış Notu', k.kanitAciklamasi)
  ]);

  // ---- 2. sayfadan itibaren: görsel kanıtlar, ek fotoğraflar, kroki, onay ----
  let bolumNo = 5;
  const YARIM = Math.round(GENISLIK / 2);
  const IKI_SUTUN = [YARIM, GENISLIK - YARIM];
  const fotoHucre = (g, genislik) => hucre([ortali(g ? [resim(g)] : [metin('')])], genislik, { verticalAlign: docx.VerticalAlign.CENTER, margins: { top: mm(1), bottom: mm(1), left: mm(1), right: mm(1) } });
  const gorselKanitlar = tablo(IKI_SUTUN, [
    bolumBasligi('4. Görsel Kanıtlar (Öncesi / Sonrası)', 2),
    new docx.TableRow({ cantSplit: true, height: { value: mm(58), rule: docx.HeightRule.EXACT }, children: [fotoHucre(fotoOncesi, IKI_SUTUN[0]), fotoHucre(fotoSonrasi, IKI_SUTUN[1])] }),
    new docx.TableRow({ cantSplit: true, children: ['Uygunsuzluk Anı (Öncesi)', 'Düzeltici Faaliyet (Sonrası)'].map((e, i) => hucre([ortali([metin(e.toLocaleUpperCase('tr'), { bold: true, size: 16 })])], IKI_SUTUN[i])) })
  ]);

  const EK_NO = mm(16), EK_FOTO = Math.round((GENISLIK - EK_NO) / 2);
  const EK_SUTUN = [EK_NO, EK_FOTO, GENISLIK - EK_NO - EK_FOTO];
  const ekFotograflar = ekFotoSatirlari.length ? tablo(EK_SUTUN, [
    bolumBasligi(`${bolumNo++}. Ek Fotoğraflar`, 3),
    new docx.TableRow({ cantSplit: true, children: ['#', 'ÖNCESİ', 'SONRASI'].map((e, i) => hucre([ortali([metin(e, { bold: true, size: 16 })])], EK_SUTUN[i], { shading: { fill: 'E5E7EB', color: 'auto', type: docx.ShadingType.CLEAR }, borders: cerceve(acik) })) }),
    ...ekFotoSatirlari.map(f => new docx.TableRow({ cantSplit: true, height: { value: mm(42), rule: docx.HeightRule.EXACT }, children: [
      hucre([ortali([metin(f.no, { bold: true })])], EK_SUTUN[0], { verticalAlign: docx.VerticalAlign.CENTER, borders: cerceve(acik) }),
      fotoHucre(f.oncesi, EK_SUTUN[1]),
      fotoHucre(f.sonrasi, EK_SUTUN[2])
    ] }))
  ]) : null;

  // Dijital imza varsa görseli + tarih basılır; yoksa kağıda elle imzalamak için boş alan kalır.
  const onayHucre = (baslik, adSoyad, imzaKaydi, imza, genislik) => {
    const tarih = imzaKaydi && imzaKaydi.tarih ? gunAyYil(imzaKaydi.tarih.slice(0, 10)) : '';
    return hucre([
      ortali([metin(baslik.toLocaleUpperCase('tr'), { bold: true, size: 16 })]),
      ortali([metin((imzaKaydi && imzaKaydi.ad) || adSoyad || '')], { spacing: { before: mm(1) } }),
      ortali(imza ? [resim(imza)] : [metin('')], {
        spacing: { before: imza ? mm(2) : mm(10) },
        border: { bottom: { style: docx.BorderStyle.SINGLE, size: 6, color: '111827', space: 1 } }
      }),
      ortali([metin('İmza', { size: 15, color: '64748B' })], { spacing: { before: mm(1) } }),
      ...(tarih ? [ortali([metin(tarih, { size: 14, color: '64748B' })])] : [])
    ], genislik);
  };
  const onay = tablo(IKI_SUTUN, [
    bolumBasligi(`${bolumNo}. Onay`, 2),
    new docx.TableRow({ cantSplit: true, children: [
      onayHucre('Tespit Eden', k.atayan, imzalar.bildiren, bildirenImza, IKI_SUTUN[0]),
      onayHucre('Bölüm Sorumlusu', k.sorumlu, imzalar.sorumlu, sorumluImza, IKI_SUTUN[1])
    ] })
  ]);

  // Görsel Kanıtlar eski PDF'teki gibi hep 2. sayfanın başında başlar; sonrakiler
  // Word tarafından akar, satırlar (cantSplit) sayfa arasında bölünmez.
  const govde = [
    genelBilgiler, bosluk(), detaylar, bosluk(), aksiyon,
    paragraf([new docx.PageBreak()]),
    gorselKanitlar, bosluk(),
    ...(ekFotograflar ? [ekFotograflar, bosluk()] : []),
    onay,
    bosluk()
  ];

  const doc = new docx.Document({
    styles: { default: { document: { run: { font: 'Arial', size: 18 } } } },
    sections: [{
      properties: { page: {
        size: { orientation: docx.PageOrientation.PORTRAIT },
        margin: { top: mm(8), right: mm(8), bottom: mm(14), left: mm(8), header: mm(8), footer: mm(4) }
      } },
      headers: { default: ustBilgi },
      footers: { default: altBilgi },
      children: govde
    }]
  });
  const blob = await docx.Packer.toBlob(doc);
  const dosyaAdi = `${UYG_CEVRE_MODU ? 'Cevre_' : ''}Uygunsuzluk_Bildirim_${(k.aksiyonNo || id).replace(/[\\/]/g, '-')}.docx`;
  if (indir) saveAs(blob, dosyaAdi);
  return { blob, dosyaAdi };
}

// Mail Gönder'in EmailJS'e doğrudan ek olarak eklemek yerine kullandığı yol:
// fotoğraflı form birkaç MB olabildiğinden EmailJS'in ek boyutu sınırlarını
// (ücretsiz planda ~50KB) aşıyor -- ek olarak gönderilince EmailJS bunu sessizce
// düşürüp maili eksiz gönderiyordu (kullanıcı bildirdi). Bunun yerine dosya, foto
// yüklemede zaten kullanılan aynı Firebase Storage'a (bkz. core/data.js
// fotoYukle) yüklenir ve mail gövdesine bir indirme linki eklenir. Storage
// yapılandırılmamışsa/başarısız olursa null döner (çağıran taraf linksiz devam
// eder). EmailJS şablonu değişkeni geriye dönük uyumluluk için hâlâ pdf_url.
async function uygunsuzlukKayitWordUrlOlustur(id) {
  const storage = typeof bulutStorageAl === 'function' ? bulutStorageAl() : null;
  if (!storage) return null;

  const uretim = await uygunsuzlukKayitWordOlustur(id, false);
  if (!uretim) return null;

  const firma = typeof aktifFirmaGetir === 'function' ? aktifFirmaGetir() : null;
  const yol = 'uygunsuzluk_form_word/' + (firma ? firma.slug : 'genel') + '/' + Date.now() + '_' + uretim.dosyaAdi;

  // fotoYukle'deki (core/data.js) aynı önlem: Storage isteği ağ/izin
  // sorunuyla süresiz asılı kalabiliyor -- belirli sürede sonuçlanmazsa hata
  // fırlatılıp linksiz devam edilmesi sağlanır.
  const zamanAsimi = new Promise((_, reddet) => setTimeout(() => reddet(new Error('Form Word yükleme zaman aşımına uğradı (Storage yanıt vermedi).')), 20000));
  const yukleme = (async () => {
    const anlik = await storage.ref().child(yol).put(uretim.blob, { contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    return anlik.ref.getDownloadURL();
  })();
  return Promise.race([yukleme, zamanAsimi]);
}

// ==================== KURUL SUNUMU (PPTX) ====================
// Kullanıcı isteği: Uygunsuzluk modülünde seçilen uygunsuzlukların, İSG Kurulu
// PPTX'iyle uyumlu (aynı renk/şerit/rozet/kart düzeni) sunuma çevrilmesi.
// Her uygunsuzluk: tanım kartı + (varsa) öncesi/sonrası tam ekran fotoğraf slaytı.
// ==================== PPTX FOTOĞRAF YERLEŞİMİ ====================
// Kullanıcı isteği: dik (portre) çekilmiş fotoğraflar slayta yayılıyordu.
// pptxgenjs'in sizing:contain seçeneği gerçek en-boy oranını bilmediği için
// bozuyordu; bu yüzden fotoğrafın gerçek ölçüsü okunur ve kutuya oran bozulmadan
// (ortalanarak) yerleştirilir.
const _fotoOlcuOnbellek = new Map();

function _fotoOlcuOku(url) {
  return new Promise(coz => {
    if (!url) return coz(null);
    const im = new Image();
    im.onload = () => coz({ w: im.naturalWidth, h: im.naturalHeight });
    im.onerror = () => coz(null);
    im.src = url;
  });
}

function _fotoUrlleriniTopla(nesne, sonuc = new Set(), derinlik = 0) {
  if (derinlik > 6 || nesne == null) return sonuc;
  if (typeof nesne === 'string') { if (/^(data:image|https?:)/i.test(nesne)) sonuc.add(nesne); return sonuc; }
  if (Array.isArray(nesne)) { nesne.forEach(n => _fotoUrlleriniTopla(n, sonuc, derinlik + 1)); return sonuc; }
  if (typeof nesne === 'object') Object.keys(nesne).forEach(a => _fotoUrlleriniTopla(nesne[a], sonuc, derinlik + 1));
  return sonuc;
}

async function fotoOlculeriniHazirla(...kaynaklar) {
  const urller = Array.from(_fotoUrlleriniTopla(kaynaklar)).filter(u => !_fotoOlcuOnbellek.has(u));
  await Promise.all(urller.map(async u => _fotoOlcuOnbellek.set(u, await _fotoOlcuOku(u))));
}

// x,y,w,h kutusuna sığan, ortalanmış addImage seçeneklerini döner (ölçü okunamadıysa sizing:contain'e düşer).
function fotoSigdirNesnesi(url, x, y, w, h) {
  const kaynak = /^https?:\/\//i.test(url) ? { path: url } : { data: url };
  const o = _fotoOlcuOnbellek.get(url);
  if (!o || !o.w || !o.h) return Object.assign(kaynak, { x, y, w, h, sizing: { type: 'contain', w, h } });
  const oran = Math.min(w / o.w, h / o.h);
  const iw = o.w * oran, ih = o.h * oran;
  return Object.assign(kaynak, { x: x + (w - iw) / 2, y: y + (h - ih) / 2, w: iw, h: ih });
}
async function uygunsuzlukKurulPptxOlustur(kayitlar) {
  if (!kayitlar || !kayitlar.length) { alert('Sunuma eklenecek uygunsuzluk yok.'); return; }
  if (typeof PptxGenJS === 'undefined') { alert('PPTX kütüphanesi yüklenemedi (internet bağlantısını kontrol edin).'); return; }

  const firma = typeof aktifFirmaGetir === 'function' ? aktifFirmaGetir() : null;
  const firmaAdi = firma ? firma.ad : '';
  const [logoUrl, cozulmus] = await Promise.all([
    fotoBuyukCoz(firma && typeof firmaLogoGetir === 'function' ? firmaLogoGetir(firma.id) : ''),
    Promise.all(kayitlar.map(async k => Object.assign({}, k, { fotoOncesi: await fotoBuyukCoz(k.fotoOncesi), fotoSonrasi: await fotoBuyukCoz(k.fotoSonrasi) })))
  ]);

  await fotoOlculeriniHazirla(cozulmus, logoUrl);
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  const R = { bg: 'F1F5F9', baslik: '0F172A', soluk: '64748B', cizgi: 'E2E8F0', birincil: '1D4ED8', birincilKoyu: '15316B' };
  const DURUM_RENK = {
    'Açık': { fg: 'B45309', bg: 'FEF3C7' }, 'Devam Ediyor': { fg: '1D4ED8', bg: 'DBEAFE' },
    'Onay Bekliyor': { fg: '7C3AED', bg: 'EDE9FE' }, 'Kapalı': { fg: '15803D', bg: 'DCFCE7' },
    'Gecikmiş': { fg: 'B91C1C', bg: 'FEE2E2' }, 'İptal': { fg: '64748B', bg: 'E2E8F0' }
  };
  const M = 0.55, SW = 13.33, SH = 7.5;
  const bugunMetni = gunAyYil(new Date().toISOString().slice(0, 10));
  const resimNesnesi = (url, ek) => Object.assign(/^https?:\/\//i.test(url) ? { path: url } : { data: url }, ek);

  const MASTER = 'US_MASTER';
  pptx.defineSlideMaster({
    title: MASTER,
    background: { color: R.bg },
    objects: [
      { rect: { x: 0, y: SH - 0.4, w: '100%', h: 0.4, fill: { color: R.baslik } } },
      { text: { text: firmaAdi, options: { x: 0.4, y: SH - 0.4, w: 7.5, h: 0.4, fontSize: 10, color: 'CBD5E1', valign: 'middle', fontFace: 'Calibri' } } },
      { text: { text: (UYG_CEVRE_MODU ? 'Çevre Uygunsuzlukları  ·  ' : 'İSG Kurul Toplantısı  ·  Uygunsuzluklar  ·  ') + bugunMetni, options: { x: 6.6, y: SH - 0.4, w: 6.2, h: 0.4, fontSize: 10, color: 'CBD5E1', align: 'right', valign: 'middle', fontFace: 'Calibri' } } }
    ],
    slideNumber: { x: SW - 0.7, y: SH - 0.4, w: 0.4, h: 0.4, fontSize: 10, color: 'CBD5E1', align: 'right', valign: 'middle' }
  });

  // Kapak
  const kapak = pptx.addSlide();
  kapak.background = { color: R.birincilKoyu };
  kapak.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: SW, h: 0.16, fill: { color: R.birincil } });
  kapak.addShape(pptx.ShapeType.rect, { x: 0, y: SH - 0.16, w: SW, h: 0.16, fill: { color: R.birincil } });
  if (logoUrl) kapak.addImage(fotoSigdirNesnesi(logoUrl, SW / 2 - 0.75, 0.85, 1.5, 1.5));
  kapak.addText(UYG_CEVRE_MODU ? 'ÇEVRE UYGUNSUZLUKLARI' : 'UYGUNSUZLUKLAR', { x: 1, y: 2.75, w: SW - 2, h: 1.1, fontSize: 40, bold: true, color: 'FFFFFF', align: 'center', fontFace: 'Calibri' });
  kapak.addText(firmaAdi, { x: 1, y: 3.95, w: SW - 2, fontSize: 19, color: 'BFDBFE', align: 'center', fontFace: 'Calibri' });
  kapak.addText(`${cozulmus.length} uygunsuzluk  ·  ${bugunMetni}`, { x: 1, y: 4.75, w: SW - 2, fontSize: 15, color: '93C5FD', align: 'center' });

  cozulmus.forEach((k, i) => {
    const foto = k.fotoOncesi || k.fotoSonrasi || '';
    const metinGenislik = foto ? 7.3 : SW - 2 * M;
    const baslik = String(k.baslik || '-');
    const durum = k.durumGoruntu || k.durum || '';
    const renk = DURUM_RENK[durum] || { fg: R.soluk, bg: R.cizgi };

    const sl = pptx.addSlide({ masterName: MASTER });
    sl.addShape(pptx.ShapeType.rect, { x: 0.22, y: 0.5, w: 0.07, h: 0.62, fill: { color: R.birincil } });
    sl.addText(`UYGUNSUZLUK  ·  ${i + 1} / ${cozulmus.length}${k.aksiyonNo ? '  ·  ' + k.aksiyonNo : ''}`, { x: M, y: 0.42, w: 11.8, h: 0.28, fontSize: 11, bold: true, color: R.birincil, charSpacing: 1 });
    // Uzun başlık kesilmez: iki satıra yayılır (çok uzunsa yazı küçülür), üst etiketin ve kutunun üstüne taşmaz.
    const baslikSeridi = String(k.bolum || '').trim() || baslik;
    const kisa = baslikSeridi.length > 170 ? baslikSeridi.slice(0, 167).trimEnd() + '...' : baslikSeridi;
    sl.addText(kisa, { x: M, y: 0.68, w: 12.2, h: 0.64, fontSize: kisa.length <= 60 ? 21 : (kisa.length <= 110 ? 17 : 14), bold: true, color: R.baslik, fontFace: 'Calibri', valign: 'top', fit: 'shrink' });

    // Açıklama boşsa kutuda başlığın tamamı gösterilir (başlık üstte kısaltılıyor).
    // Beyaz kutu = Uygunsuzluk Tanımı (modül tablosundaki gibi başlık + açıklama); başlık şeridinde ise tesis/birim görünür, böylece aynı cümle iki kez yazılmaz.
    const aciklama = baslik + ((k.aciklama && k.aciklama.trim() !== '-' && k.aciklama.trim() !== baslik.trim()) ? ' — ' + k.aciklama.trim() : '');
    sl.addShape(pptx.ShapeType.roundRect, { x: M, y: 1.35, w: metinGenislik, h: 1.35, rectRadius: 0.06, fill: { color: 'FFFFFF' }, line: { color: R.cizgi, width: 1 } });
    sl.addText(aciklama, { x: M + 0.25, y: 1.5, w: metinGenislik - 0.5, h: 1.05, fontSize: 13.5, color: R.baslik, valign: 'top', fit: 'shrink' });

    if (durum) {
      const w = Math.max(0.9, 0.1 * durum.length + 0.35);
      sl.addShape(pptx.ShapeType.roundRect, { x: M, y: 2.9, w, h: 0.34, rectRadius: 0.17, fill: { color: renk.bg }, line: { type: 'none' } });
      sl.addText(durum, { x: M, y: 2.9, w, h: 0.34, fontSize: 11, bold: true, color: renk.fg, align: 'center', valign: 'middle' });
    }
    const alinanOnlem = [k.duzelticiFaaliyet, k.onleyiciFaaliyet].filter(Boolean).join(' / ') || k.kanitAciklamasi || '';
    const meta = [
      ['Bölüm', k.bolum || '-'],
      ['Bildirim', gunAyYil(k.bildirimTarihi) || '-'],
      ['Termin', gunAyYil(k.termin) || '-'],
      ['Kapanış', gunAyYil(k.kapanisTarihi) || '-'],
      ['Sorumlu', k.sorumlu || '-']
    ];
    if (k.riskSeviyesi) meta.splice(3, 0, ['Risk Seviyesi', k.riskSeviyesi]);
    if (alinanOnlem) meta.push(['Alınan Önlem', alinanOnlem]);
    sl.addTable(meta.map(([e, d]) => [
      { text: e, options: { bold: true, color: R.soluk, fill: { color: R.bg } } },
      { text: String(d), options: { color: R.baslik, fill: { color: 'FFFFFF' } } }
    ]), { x: M, y: 3.4, w: metinGenislik, colW: [1.9, metinGenislik - 1.9], fontSize: 11.5, border: { type: 'solid', color: R.cizgi, pt: 0.75 }, autoPage: false });
    if (foto) {
      const b = 3.5, x = 8.55, y = 1.35;
      sl.addShape(pptx.ShapeType.roundRect, { x: x - 0.06, y: y - 0.06, w: b + 0.12, h: b + 0.12, rectRadius: 0.08, fill: { color: 'FFFFFF' }, line: { color: R.cizgi, width: 1 } });
      sl.addImage(fotoSigdirNesnesi(foto, x, y, b, b));
    }

    [['Öncesi', k.fotoOncesi], ['Sonrası', k.fotoSonrasi]].forEach(([etiket, url]) => {
      if (!url) return;
      const f = pptx.addSlide();
      f.background = { color: '0B1220' };
      f.addImage(fotoSigdirNesnesi(url, 0.5, 0.5, SW - 1, SH - 1.3));
      f.addShape(pptx.ShapeType.rect, { x: 0, y: SH - 0.7, w: SW, h: 0.7, fill: { color: R.baslik, transparency: 15 } });
      f.addText(`${baslik.length > 110 ? baslik.slice(0, 107).trimEnd() + '...' : baslik} — ${etiket}`, { x: 0.5, y: SH - 0.7, w: SW - 1, h: 0.7, fontSize: 14, bold: true, color: 'FFFFFF', valign: 'middle' });
    });
  });

  await pptx.writeFile({ fileName: `${UYG_CEVRE_MODU ? 'Cevre_Uygunsuzluk_Sunumu_' : 'Uygunsuzluk_Kurul_Sunumu_'}${new Date().toISOString().slice(0, 10)}.pptx` });
}