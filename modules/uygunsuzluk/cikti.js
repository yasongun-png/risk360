// Uygunsuzluk / DÖF — kapak sayfalı, fotoğraflı PDF raporları.
// Eski üretim uygulamasındaki (uygunsuzluk-platform-standalone.html) kapak +
// liste + öncesi/sonrası fotoğraf sütunlu PDF çıktısıyla mümkün olduğunca
// aynı mantık: kayıtlar Açık/Kapalı olarak İKİ AYRI bölüme ayrılır (tek
// karışık liste değil, aralarında ayırıcı sayfa vardır), durum rengi de aynı
// kalıpta tutulur (Açık = yeşil, Kapalı = kırmızı). Kapak sayfasındaki başlık
// ve giriş metni serbestçe düzenlenebilir (bkz. ui.js raporMetniGetir/Kaydet —
// eski uygulamadaki "Konu" / editTopicPdfIntroPrompt mantığı). Ayrıca her
// kayıt için ayrı, tek sayfalık "İSG Uygunsuzluk Bildirim Formu" PDF'i üretilir
// (gerçek üretim örneğiyle birebir: kapak bilgisi + 4 bölüm + öncesi/sonrası
// fotoğraf). Tüm PDF'lerin sağ üst köşesinde ortak Form Ayarları (Doküman No/
// Sürüm Tarihi/Sürüm No/Sayfa Sayısı) kutusu bulunur (bkz. core/form-ayarlari.js).

function _ucKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function _ucDurumRozet(kayitAcikMi) {
  return kayitAcikMi
    ? '<span class="uc-rozet uc-rozet-acik">AÇIK</span>'
    : '<span class="uc-rozet uc-rozet-kapali">KAPALI</span>';
}

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
    new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { after: mm(4) }, children: [metin('KAPALI UYGUNSUZLUKLAR', { bold: true, size: 32 })] }),
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
          new docx.Paragraph({ children: [metin('UYGUNSUZLUK LİSTESİ', { bold: true, size: 28 })] })
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
  const dosyaAdi = `Uygunsuzluk_Raporu_${bugun.replace(/\./g, '-')}.docx`;
  if (indir) saveAs(blob, dosyaAdi);
  return { blob, dosyaAdi };
}

// Mail Gönder'in EmailJS'e ikinci bir link olarak eklediği "Uygunsuzluk
// Listesi" raporu -- uygunsuzlukKayitPdfUrlOlustur ile AYNI Storage yükleme
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

  // Kullanıcı bildirdi: "liste raporu uzun sürüyor" -- tek kayıt PDF'inden
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

// ==================== TEKİL KAYIT PDF'İ (İSG UYGUNSUZLUK BİLDİRİM FORMU) ====================
// Gerçek üretim çıktısıyla (ISG_Rapor_*.pdf) birebir: logo + başlık + form
// ayarları üst bilgisi, 4 numaralı bölüm, öncesi/sonrası fotoğraf kutuları.

function _ucAlanSatiri(etiket1, deger1, etiket2, deger2) {
  if (etiket2 === undefined) {
    return `<tr><td class="uc-form-etiket">${_ucKacir(etiket1)}</td><td class="uc-form-deger" colspan="3">${deger1}</td></tr>`;
  }
  return `<tr>
    <td class="uc-form-etiket">${_ucKacir(etiket1)}</td><td class="uc-form-deger">${deger1}</td>
    <td class="uc-form-etiket">${_ucKacir(etiket2)}</td><td class="uc-form-deger">${deger2}</td>
  </tr>`;
}

// imzaKaydi: {ad, tarih} (modules/uygunsuzluk/model.js uygunsuzlukImzaVeriUret),
// imzaGorselUrl: fotoBuyukCoz ile çözülmüş data URL (varsa). Dijital imza
// atılmışsa çizilmiş imza görseli + tarih basılır; atılmamışsa kağıda elle
// imzalamak için boş bir alan bırakılır (bkz. is-izni/cikti.js _izImzaHucre
// ile aynı ilke — dijital varsa göster, yoksa boş kutu).
function _ucOnayKutusu(baslik, adSoyad, imzaKaydi, imzaGorselUrl) {
  const gosterilecekAd = (imzaKaydi && imzaKaydi.ad) || adSoyad;
  const imzaIcerik = imzaGorselUrl
    ? `<img src="${imzaGorselUrl}" style="max-width:100%; max-height:12mm;">`
    : '';
  const tarihSatiri = (imzaKaydi && imzaKaydi.tarih)
    ? `<div style="font-size:7pt; color:#64748b; margin-top:0.5mm;">${_ucKacir(gunAyYil((imzaKaydi.tarih || '').slice(0, 10)))}</div>`
    : '';
  return `
    <div class="uc-onay-kutu">
      <div class="uc-onay-etiket">${_ucKacir(baslik)}</div>
      <div class="uc-onay-ad">${_ucKacir(gosterilecekAd) || '&nbsp;'}</div>
      <div class="uc-onay-imza-alani">${imzaIcerik}</div>
      <div class="uc-onay-imza-baslik">İmza${tarihSatiri}</div>
    </div>
  `;
}

function _ucFormFotoKutusu(url, etiket) {
  return `
    <div class="uc-form-foto-kutu">
      <div class="uc-form-foto-govde">${url ? `<img src="${url}">` : ''}</div>
      <div class="uc-form-foto-etiket">${_ucKacir(etiket)}</div>
    </div>
  `;
}

// Firebase Storage URL'leri (kroki görseli file:// değil gerçek http(s)
// sunucudan geliyorsa buraya düşer) CORS başlığı olmadan html2canvas'ın
// canvas'a "okuma" adımında sessizce boş/şeffaf çıkabiliyor — ekranda normal
// <img> olarak görünse bile. Bunu kesin önlemek için görsel önce tamamen
// indirilip data: URL'e çevrilir; zaten data: ise (base64/fotoref çözümü)
// dokunmadan geri döner.
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
// konum varsa, o tesisin kroki görselinin üstünde noktayı gösteren küçük bir
// görüntü döner; yoksa null (çağıran taraf yer tutucu metin gösterir).
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

const _UC_KAYIT_STIL = `
      #ucKayitPdf{ font-family: Arial, Helvetica, sans-serif; color:#111827; background:#fff; width:210mm; min-height:297mm; padding:8mm; font-size:9pt; }
      #ucKayitPdf *{ box-sizing:border-box; }

      #ucKayitPdf .fa-kutu{ border-collapse:collapse; font-size:6.8pt; width:100%; table-layout:fixed; }
      #ucKayitPdf .fa-kutu td{ padding:1.5px 4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      #ucKayitPdf .fa-kutu td:first-child{ font-weight:700; background:#fff; width:48%; }

      #ucKayitPdf .uc-form-ustbilgi{ display:flex; align-items:stretch; border:2px solid #111827; margin-bottom:4mm; background:#fff; }
      #ucKayitPdf .uc-form-ustbilgi > div{ padding:3mm; display:flex; align-items:center; justify-content:center; border-right:2px solid #111827; background:#fff; }
      #ucKayitPdf .uc-form-ustbilgi > div:last-child{ border-right:none; }
      #ucKayitPdf .uc-form-logo{ flex:0 0 28mm; width:28mm; text-align:center; color:#94a3b8; font-size:8pt; font-weight:700; }
      #ucKayitPdf .uc-form-logo img{ max-width:24mm; max-height:16mm; }
      #ucKayitPdf .uc-form-baslik{ flex:1 1 auto; min-width:0; text-align:center; font-size:13pt; font-weight:700; color:#111827; line-height:1.3; }
      #ucKayitPdf .uc-form-fa{ flex:0 0 42mm; width:42mm; padding:2mm !important; align-items:stretch !important; }

      #ucKayitPdf .uc-form-bolum{ margin-bottom:3mm; background:#fff; }
      #ucKayitPdf .uc-form-bolum h2{ margin:0; background:#fff; color:#111827; font-size:9.5pt; padding:2mm 3mm; text-transform:uppercase; border:1px solid #111827; border-bottom:none; }
      #ucKayitPdf .uc-form-bolum table{ width:100%; border-collapse:collapse; border:1px solid #111827; }
      #ucKayitPdf .uc-form-bolum td{ border:1px solid #111827; padding:2.5mm 3mm; vertical-align:top; font-size:9pt; }
      #ucKayitPdf .uc-form-etiket{ font-weight:700; width:16%; background:#fff; white-space:pre-line; }
      #ucKayitPdf .uc-form-deger{ width:34%; white-space:pre-line; }

      #ucKayitPdf .uc-rozet{ display:inline-block; padding:2px 10px; border-radius:8px; font-size:8.5pt; font-weight:700; }
      #ucKayitPdf .uc-rozet-acik{ background:#16a34a; color:#fff; }
      #ucKayitPdf .uc-rozet-kapali{ background:#dc2626; color:#fff; }
      #ucKayitPdf .uc-rozet-risk{ display:inline-block; padding:2px 10px; border-radius:8px; font-size:8.5pt; font-weight:700; }
      #ucKayitPdf .uc-rozet-risk.dusuk{ background:#dcfce7; color:#15803d; }
      #ucKayitPdf .uc-rozet-risk.orta{ background:#fef3c7; color:#b45309; }
      #ucKayitPdf .uc-rozet-risk.yuksek, #ucKayitPdf .uc-rozet-risk.cok-yuksek{ background:#fee2e2; color:#b91c1c; }

      #ucKayitPdf .uc-form-fotograflar{ display:flex; gap:4mm; }
      #ucKayitPdf .uc-form-foto-kutu{ flex:1; border:1px solid #111827; background:#fff; }
      #ucKayitPdf .uc-form-foto-govde{ height:56mm; display:flex; align-items:center; justify-content:center; background:#fff; overflow:hidden; }
      #ucKayitPdf .uc-form-foto-govde img{ max-width:100%; max-height:100%; object-fit:contain; }
      #ucKayitPdf .uc-form-foto-etiket{ text-align:center; font-weight:700; font-size:8pt; padding:2mm; border-top:1px solid #111827; text-transform:uppercase; }

      #ucKayitPdf .uc-kroki-kutu{ position:relative; width:100%; background:#f3f4f6; border:1px solid #111827; overflow:hidden; }
      #ucKayitPdf .uc-kroki-kutu img{ display:block; width:100%; height:auto; max-height:85mm; object-fit:contain; margin:0 auto; }
      #ucKayitPdf .uc-kroki-nokta{ position:absolute; transform:translate(-50%, -100%); display:flex; flex-direction:column; align-items:center; filter:drop-shadow(0 1px 2px rgba(0,0,0,.5)); }
      #ucKayitPdf .uc-kroki-ikon{ font-size:26px; line-height:1; }
      #ucKayitPdf .uc-kroki-kod{ font-size:7.5pt; font-weight:700; background:#111827dd; color:#fff; padding:1px 5px; border-radius:3px; margin-top:1px; white-space:nowrap; }
      #ucKayitPdf .uc-kroki-tesis{ font-size:7.5pt; color:#64748b; margin-top:1.5mm; }
      #ucKayitPdf .uc-kroki-yok{ color:#64748b; font-size:9pt; text-align:center; padding:6mm; border:1px dashed #cbd5e1; }

      #ucKayitPdf .uc-form-altbilgi{ text-align:center; font-size:7.5pt; color:#64748b; margin-top:5mm; }
      #ucKayitPdf .uc-kroki-kutu-buyuk img{ max-height:70mm; }

      #ucKayitPdf .uc-onay-satir{ display:flex; gap:6mm; }
      #ucKayitPdf .uc-onay-kutu{ flex:1; border:1px solid #111827; padding:3mm; text-align:center; background:#fff; }
      #ucKayitPdf .uc-onay-etiket{ font-size:8pt; font-weight:700; color:#111827; text-transform:uppercase; }
      #ucKayitPdf .uc-onay-ad{ font-size:9pt; margin-top:1.5mm; min-height:4mm; }
      #ucKayitPdf .uc-onay-imza-alani{ height:12mm; border-bottom:1px solid #111827; margin-top:4mm; display:flex; align-items:flex-end; justify-content:center; }
      #ucKayitPdf .uc-onay-imza-alani img{ display:block; margin:0 auto; }
      #ucKayitPdf .uc-onay-imza-baslik{ font-size:7.5pt; color:#64748b; margin-top:1mm; }

      #ucKayitPdf table.uc-ek-foto-tablo{ width:100%; border-collapse:collapse; table-layout:fixed; }
      #ucKayitPdf table.uc-ek-foto-tablo th{ background:#e5e7eb; color:#111827; font-size:8pt; padding:3px 4px; border:1px solid #94a3b8; text-transform:uppercase; }
      #ucKayitPdf table.uc-ek-foto-tablo th:first-child, #ucKayitPdf table.uc-ek-foto-tablo td.uc-ek-foto-no{ width:8%; }
      #ucKayitPdf table.uc-ek-foto-tablo th:not(:first-child){ width:46%; }
      #ucKayitPdf table.uc-ek-foto-tablo td{ border:1px solid #cbd5e1; padding:3px; vertical-align:middle; text-align:center; overflow:hidden; }
      #ucKayitPdf table.uc-ek-foto-tablo td.uc-ek-foto-no{ font-weight:700; }
      #ucKayitPdf .uc-ek-foto-govde{ height:40mm; display:flex; align-items:center; justify-content:center; background:#f3f4f6; overflow:hidden; }
      #ucKayitPdf .uc-ek-foto-govde img{ max-width:100%; max-height:100%; object-fit:contain; }
`;

// indir=false: dosyayı indirmez, jsPDF nesnesini döner -- "Mail Gönder"in
// PDF'i EmailJS eki olarak göndermek için ayrı bir indirme diyaloğu
// açtırmadan aynı PDF'i üretmesini sağlar (bkz. ui.js
// _uygunsuzlukMailGonderTiklandi).
async function uygunsuzlukKayitPdfOlustur(id, indir = true) {
  const k = uygunsuzlukIdIleGetirRepo(id);
  if (!k) return null;

  const firma = aktifFirmaGetir();
  const logo = firma ? firmaLogoGetir(firma.id) : '';
  const acikMi = k.durum !== 'Kapalı';
  const tanim = [k.baslik, k.aciklama].filter(Boolean).join(' — ');
  const imzalar = k.imzalar || {};
  const [fotoOncesiUrl, fotoSonrasiUrl, kroki, ekFotoUrlleri, bildirenImzaUrl, sorumluImzaUrl] = await Promise.all([
    fotoBuyukCoz(k.fotoOncesi),
    fotoBuyukCoz(k.fotoSonrasi),
    _ucKrokiGorseliniHazirla(k),
    Promise.all([2, 3, 4].map(async n => ({
      no: n,
      oncesi: await fotoBuyukCoz(k['fotoOncesi' + n]),
      sonrasi: await fotoBuyukCoz(k['fotoSonrasi' + n])
    }))),
    fotoBuyukCoz(imzalar.bildiren && imzalar.bildiren.imzaUrl),
    fotoBuyukCoz(imzalar.sorumlu && imzalar.sorumlu.imzaUrl)
  ]);
  // Boş kalan çiftler tabloya hiç girmez.
  const ekFotoSatirlari = ekFotoUrlleri.filter(f => f.oncesi || f.sonrasi);

  // Form Ayarları kutusundaki "Sayfa Sayısı" satırı varsayılan olarak sabit
  // bir metin (ör. "1/1") -- bu form her zaman en az 2 sayfa ürettiğinden
  // (aşağıdaki sayfalar dizisi), her sayfaya kendi gerçek "mevcut/toplam"
  // değeri (bkz. formAyarlariKutusuHtml'in 4. parametresi) geçilir; aksi
  // halde her iki sayfa da aynı sabit değeri (ör. "1/1") gösteriyordu
  // (kullanıcı bildirdi).
  //
  // 2. sayfa SABİT 4 parça değildir: Ek Fotoğraflar (0-3 çift) ve Konum
  // Krokisi (görsel oranına göre değişken yükseklik) yüzünden içerik toplam
  // yüksekliği kayıttan kayda ciddi oranda değişiyor -- eskiden bu parçalar
  // hep TEK bir 2. sayfaya sabitlenmişti ve taşan kısım 3. sayfaya
  // GEÇMİYORDU, sayfa sınırının altında görünmeden kırpılıyordu (kullanıcı
  // bildirdi: "3. sayfaya geçmiyor"). Şimdi bu parçalar birer "blok" olarak
  // önce gerçek DOM yüksekliği ölçülüp (bkz. _ucSayfaIcerigiYuksekligiOlcMm),
  // sığdığı kadarı aynı sayfada, sığmayanı otomatik yeni bir sayfada
  // basılıyor -- gerekirse 3, 4... sayfaya kadar uzayabilir.
  let _ucBolumNo = 5;
  const blokGorselKanitlar = `
    <div class="uc-form-bolum">
      <h2>4. Görsel Kanıtlar (Öncesi / Sonrası)</h2>
      <div style="padding:3mm;">
        <div class="uc-form-fotograflar">
          ${_ucFormFotoKutusu(fotoOncesiUrl, 'Uygunsuzluk Anı (Öncesi)')}
          ${_ucFormFotoKutusu(fotoSonrasiUrl, 'Düzeltici Faaliyet (Sonrası)')}
        </div>
      </div>
    </div>
  `;

  const blokEkFotograflar = ekFotoSatirlari.length ? `
    <div class="uc-form-bolum">
      <h2>${_ucBolumNo++}. Ek Fotoğraflar</h2>
      <table class="uc-ek-foto-tablo">
        <thead><tr><th>#</th><th>Öncesi</th><th>Sonrası</th></tr></thead>
        <tbody>
          ${ekFotoSatirlari.map(f => `
            <tr>
              <td class="uc-ek-foto-no">${f.no}</td>
              <td><div class="uc-ek-foto-govde">${f.oncesi ? `<img src="${f.oncesi}">` : ''}</div></td>
              <td><div class="uc-ek-foto-govde">${f.sonrasi ? `<img src="${f.sonrasi}">` : ''}</div></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : '';

  const blokKroki = `
    <div class="uc-form-bolum">
      <h2>${_ucBolumNo++}. Konum Krokisi</h2>
      <div style="padding:3mm;">
        ${kroki ? `
          <div class="uc-kroki-kutu uc-kroki-kutu-buyuk">
            <img src="${kroki.url}">
            <div class="uc-kroki-nokta" style="left:${kroki.x}%; top:${kroki.y}%;">
              <span class="uc-kroki-ikon">🔺</span>
              <span class="uc-kroki-kod">${_ucKacir(k.aksiyonNo)}</span>
            </div>
          </div>
          <div class="uc-kroki-tesis">${_ucKacir(kroki.tesisAdi)}</div>
        ` : `<div class="uc-kroki-yok">Bu kayıt için Saha Dijital Haritası'nda bir konum işaretlenmemiş.</div>`}
      </div>
    </div>
  `;

  const blokOnay = `
    <div class="uc-form-bolum">
      <h2>${_ucBolumNo}. Onay</h2>
      <div style="padding:3mm;">
        <div class="uc-onay-satir">
          ${_ucOnayKutusu('Tespit Eden', k.atayan, imzalar.bildiren, bildirenImzaUrl)}
          ${_ucOnayKutusu('Bölüm Sorumlusu', k.sorumlu, imzalar.sorumlu, sorumluImzaUrl)}
        </div>
      </div>
    </div>
  `;

  const ikinciSayfaBloklari = [blokGorselKanitlar, blokEkFotograflar, blokKroki, blokOnay].filter(Boolean);

  const mount = document.getElementById('yazdirmaAlani');
  mount.style.display = 'block';

  function _ucKayitSayfaGovdesiOlustur(sayfaEtiketi, icerikHtml, ekStil) {
    return `
      <div id="ucKayitPdf" style="${ekStil || ''}">
        <style>${_UC_KAYIT_STIL}</style>
        <div class="uc-form-ustbilgi">
          <div class="uc-form-logo">${logo ? `<img src="${logo}">` : 'LOGO YOK'}</div>
          <div class="uc-form-baslik">UYGUNSUZLUK FORMU</div>
          <div class="uc-form-fa">${formAyarlariKutusuHtml('uygunsuzluk', null, false, sayfaEtiketi)}</div>
        </div>
        ${icerikHtml}
        <div class="uc-form-altbilgi">🌱 Çevre sorumluluğunuzu düşünerek lütfen gerekmedikçe çıktı almayınız.</div>
      </div>
    `;
  }

  async function _ucGorsellerYuklensinBekle() {
    await Promise.all(Array.from(document.getElementById('ucKayitPdf').querySelectorAll('img')).map(img => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise(resolve => {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      });
    }));
  }

  // CSS'te #ucKayitPdf min-height:297mm sabitlenmiş (tam sayfa render için) --
  // ölçüm sırasında bunu ezmezsek her ölçüm en az 297mm dönerdi, gerçek
  // içerik yüksekliğini hiç ayırt edemezdik. Inline style, ID seçiciden
  // yüksek önceliğe sahip olduğundan min-height:0 ile geçici olarak iptal
  // edilir (yalnızca ölçüm anında; gerçek yakalama sırasında kullanılmaz).
  const UC_PX_PER_MM = 96 / 25.4;
  async function _ucSayfaIcerigiYuksekligiOlcMm(icerikHtml) {
    mount.innerHTML = _ucKayitSayfaGovdesiOlustur('9/9', icerikHtml, 'min-height:0;');
    await _ucGorsellerYuklensinBekle();
    return document.getElementById('ucKayitPdf').offsetHeight / UC_PX_PER_MM;
  }

  // A4 yüksekliği 297mm; üstbilgi+altbilgi+güvenlik payı düşülünce bir
  // sayfaya güvenle sığan içerik bütçesi ~290mm olarak alınır.
  const UC_SAYFA_ICERIK_BUDGET_MM = 290;
  const ikinciSayfaSonrasiSayfalar = [];
  let biriktirilenBloklar = [];
  for (const blok of ikinciSayfaBloklari) {
    const adayBloklari = [...biriktirilenBloklar, blok];
    const adayYukseklikMm = await _ucSayfaIcerigiYuksekligiOlcMm(adayBloklari.join(''));
    if (adayYukseklikMm <= UC_SAYFA_ICERIK_BUDGET_MM || biriktirilenBloklar.length === 0) {
      biriktirilenBloklar = adayBloklari;
    } else {
      ikinciSayfaSonrasiSayfalar.push(biriktirilenBloklar);
      biriktirilenBloklar = [blok];
    }
  }
  if (biriktirilenBloklar.length) ikinciSayfaSonrasiSayfalar.push(biriktirilenBloklar);

  const UC_TOPLAM_SAYFA = 1 + ikinciSayfaSonrasiSayfalar.length;

  const html = `
  <div id="ucKayitPdf">
    <style>${_UC_KAYIT_STIL}</style>

    <div class="uc-form-ustbilgi">
      <div class="uc-form-logo">${logo ? `<img src="${logo}">` : 'LOGO YOK'}</div>
      <div class="uc-form-baslik">UYGUNSUZLUK FORMU</div>
      <div class="uc-form-fa">${formAyarlariKutusuHtml('uygunsuzluk', null, false, `1/${UC_TOPLAM_SAYFA}`)}</div>
    </div>

    <div class="uc-form-bolum">
      <h2>1. Genel Bilgiler</h2>
      <table>
        ${_ucAlanSatiri('Bildirim No', _ucKacir(k.aksiyonNo), 'Bildirim Tarihi', _ucKacir(gunAyYil(k.bildirimTarihi)) || '-')}
        ${_ucAlanSatiri('Birim / Tesis', _ucKacir(k.bolum) || '-')}
        ${_ucAlanSatiri('Bildiren Kişi', _ucKacir(k.atayan) || '-', 'Risk Seviyesi', `<span class="uc-rozet-risk ${slugOlustur(k.riskSeviyesi || '')}">${_ucKacir(k.riskSeviyesi)}</span>`)}
      </table>
    </div>

    <div class="uc-form-bolum">
      <h2>2. Uygunsuzluk Detayları</h2>
      <table>
        ${_ucAlanSatiri('Tanım', _ucKacir(tanim) || '-')}
        ${_ucAlanSatiri('Kök Neden', _ucKacir(k.kokNeden) || '-')}
        ${_ucAlanSatiri('Faaliyet Önerisi', _ucKacir(k.duzelticiFaaliyet) || '-')}
        ${_ucAlanSatiri('İlgili Yasal Şartlar', _ucKacir((k.yasalSartlar && k.yasalSartlar.length) ? k.yasalSartlar.join(', ') : '-'))}
        ${_ucAlanSatiri('Yasal Dayanak / Not', _ucKacir(k.yasalDayanak) || '-')}
      </table>
    </div>

    <div class="uc-form-bolum">
      <h2>3. Aksiyon ve Kapanış</h2>
      <table>
        ${_ucAlanSatiri('Sorumlu', _ucKacir(k.sorumlu) || '-', 'Hedef Termin', _ucKacir(gunAyYil(k.termin)) || '-')}
        ${_ucAlanSatiri('Durum', _ucDurumRozet(acikMi), 'Kapanış Tarihi', _ucKacir(gunAyYil(k.kapanisTarihi)) || '-')}
        ${_ucAlanSatiri('Kapanış Notu', _ucKacir(k.kanitAciklamasi) || '-')}
      </table>
    </div>

    <div class="uc-form-altbilgi">🌱 Çevre sorumluluğunuzu düşünerek lütfen gerekmedikçe çıktı almayınız.</div>
  </div>
  `;

  // Kullanıcı bildirdi: "yukarıya biraz fazla yazı yazınca görsel kanıtlar
  // sayfa arasında bölündü, bir fotoğrafın böyle ikiye bölünmemesi lazım"
  // -- 1-3. bölümlerin metin uzunluğu kayıttan kayda değiştiğinden, Görsel
  // Kanıtlar (sabit ~56mm yükseklikte foto kutuları) sayfa 1'in altında
  // kalırsa canvas'ın A4 sayfasına sığdırılması sırasında görünmeden
  // kırpılıyordu. Bu yüzden Görsel Kanıtlar hep sayfa 1'de DEĞİL, kendi
  // başlık şeridini tekrar eden 2. sayfanın EN BAŞINDA basılıyor; ondan
  // sonraki bloklar (Ek Fotoğraflar/Kroki/Onay) yukarıda ölçülüp
  // paketlenerek gerekirse 3., 4. sayfaya taşıyor (bkz. yukarıdaki
  // ikinciSayfaSonrasiSayfalar).
  const digerSayfalar = ikinciSayfaSonrasiSayfalar.map((bloklar, i) =>
    _ucKayitSayfaGovdesiOlustur(`${i + 2}/${UC_TOPLAM_SAYFA}`, bloklar.join(''))
  );

  // html2pdf'in kenar boşluklu/oto-ölçeklemeli hattı, sağdaki 1-2px'lik
  // box-shadow çerçeve çizgisini büyütme/kesme sırasında kayıp edebiliyordu
  // (bkz. egitim/stajyer sertifikalarında aynı sorun için kullanılan çözüm) —
  // bunun yerine her sayfa tam kenardan kenara (full-bleed) ayrı ayrı
  // yakalanıp kendi PDF sayfasına eklenir; formun kendi 8mm padding'i görsel
  // kenar boşluğu görevi görür.
  const pdf = new jspdf.jsPDF('p', 'mm', 'a4');
  const sayfalar = [html, ...digerSayfalar];
  for (let i = 0; i < sayfalar.length; i++) {
    mount.innerHTML = sayfalar[i];
    // Kroki data: URL'i olsa bile tarayıcı boyutlarını (naturalWidth/Height)
    // henüz hesaplamamış olabilir — "height:auto" o ana kadar 0'a çözülüp
    // kutuyu görünmez yapıyordu (kullanıcı bildirdi, canlı testte doğrulandı).
    // html2canvas çağrılmadan önce sayfadaki TÜM <img>'lerin gerçekten
    // yüklenmesi/decode olması beklenir.
    await _ucGorsellerYuklensinBekle();
    // Kullanıcı isteği: "uygunsuzluk pdf raporunun mb'ı büyük düşürmek
    // mümkün mü" -- bkz. yukarıdaki genel rapor fonksiyonundaki aynı not.
    const canvas = await html2canvas(document.getElementById('ucKayitPdf'), { scale: 1.5, backgroundColor: '#ffffff', useCORS: true });
    if (i > 0) pdf.addPage('a4', 'p');
    const genislikMm = 210;
    const yukseklikMm = canvas.height * (genislikMm / canvas.width);
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.75), 'JPEG', 0, 0, genislikMm, yukseklikMm);
    pdf.setFontSize(8);
    pdf.setTextColor(100);
    pdf.text(`Sayfa ${i + 1} / ${sayfalar.length}`, 210 / 2, 297 - 5, { align: 'center' });
  }
  const dosyaAdi = `Uygunsuzluk_Bildirim_${(k.aksiyonNo || id).replace(/[\\/]/g, '-')}.pdf`;
  if (indir) pdf.save(dosyaAdi);

  mount.innerHTML = '';
  mount.style.display = 'none';
  return { pdf, dosyaAdi };
}

// Mail Gönder'in EmailJS'e doğrudan ek olarak eklemek yerine kullandığı yol:
// bu PDF'ler (fotoğraflı kayıtlarda ~birkaç MB) EmailJS'in ek boyutu
// sınırlarını (ücretsiz planda ~50KB) fazlasıyla aşıyor -- ek olarak
// gönderilince EmailJS bunu sessizce düşürüp maili eksiz gönderiyordu
// (kullanıcı bildirdi). Bunun yerine PDF, foto yüklemede zaten kullanılan
// aynı Firebase Storage'a (bkz. core/data.js fotoYukle) yüklenir ve mail
// gövdesine bir indirme linki eklenir -- boyut sınırı yok, güvenilir.
// Storage yapılandırılmamışsa/başarısız olursa null döner (çağıran taraf
// linksiz devam eder, e-posta yine de gider).
async function uygunsuzlukKayitPdfUrlOlustur(id) {
  const storage = typeof bulutStorageAl === 'function' ? bulutStorageAl() : null;
  if (!storage) return null;

  const uretim = await uygunsuzlukKayitPdfOlustur(id, false);
  if (!uretim) return null;

  const firma = typeof aktifFirmaGetir === 'function' ? aktifFirmaGetir() : null;
  const yol = 'uygunsuzluk_pdf/' + (firma ? firma.slug : 'genel') + '/' + Date.now() + '_' + uretim.dosyaAdi;
  const blob = uretim.pdf.output('blob');

  // fotoYukle'deki (core/data.js) aynı önlem: Storage isteği ağ/izin
  // sorunuyla süresiz asılı kalabiliyor (kullanıcı bildirdi: "PDF
  // hazırlanıyor"da kalıyordu) -- belirli sürede sonuçlanmazsa hata
  // fırlatılıp linksiz devam edilmesi sağlanır.
  const zamanAsimi = new Promise((_, reddet) => setTimeout(() => reddet(new Error('PDF yükleme zaman aşımına uğradı (Storage yanıt vermedi).')), 20000));
  const yukleme = (async () => {
    const anlik = await storage.ref().child(yol).put(blob, { contentType: 'application/pdf' });
    return anlik.ref.getDownloadURL();
  })();
  return Promise.race([yukleme, zamanAsimi]);
}
