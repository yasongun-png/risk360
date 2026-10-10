// İSG Kurulu çıktıları: Toplantı Daveti (Word), Kurul Raporu (Word/PDF),
// Konu Başlıkları (Word), PPTX. Eski üretim uygulamasındaki (isg-kurul-standalone-*.html)
// docx.js / pptxgenjs / html2pdf.js kütüphaneleriyle aynı çıktı türleri üretilir;
// içerik risk360'ın kendi (daha sade) toplantı/karar/olay/imza veri
// modeline uyarlanmıştır (BAĞFAŞ'a özel logo/marka içeriği taşınmadı — çok
// kiracılı yapı gereği, bkz. [[risk360-architecture]]).

function _ciktiKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function _ciktiDonemMetni(toplanti) {
  const kaynak = toplanti.donem ? toplanti.donem + '-01' : toplanti.tarih;
  if (!kaynak) return '—';
  const d = new Date(kaynak + 'T00:00:00');
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }).toUpperCase();
}

function _ciktiTarihSaat(toplanti) {
  if (!toplanti.tarih) return '—';
  const tarih = new Date(toplanti.tarih + 'T00:00:00').toLocaleDateString('tr-TR');
  return toplanti.saat ? `${tarih} ${toplanti.saat}` : tarih;
}

function _ciktiKararVerisi(toplantiId) {
  // Raporlar salt okunur olmalı: devredenTamamlandiGosterildi bayrağını
  // işaretlemeyen saf sürüm kullanılır (bkz. service.js).
  return toplantiKararGruplariniGetir(toplantiId);
}

// Boş bırakılmış rapor alanları için KURUL_RAPOR_VARSAYILANLARI'ndan hazır
// metin kullanır (bkz. model.js) — böylece hiçbir alan doldurulmasa bile
// rapor boş/amatör görünmez (eski üretim uygulamasındaki ISG_RAPOR_CONFIG
// davranışıyla aynı).
function _varsayilanliMetin(deger, anahtar) {
  const temiz = (deger || '').trim();
  return temiz || KURUL_RAPOR_VARSAYILANLARI[anahtar] || '';
}

// ==================== 1) TOPLANTI DAVETİ (WORD) ====================

// indir=false: dosyayı indirmez, { blob, dosyaAdi } döner — "Toplantı Daveti
// Mail Gönder" Word'ü buluta yükleyip mailde link olarak paylaşır
// (bkz. toplanti-ui.js davetMailGonder).
async function toplantiDavetiWordOlustur(indir = true) {
  const toplanti = toplantiIdIleGetirRepo(_toplantiId);
  if (!toplanti) return null;

  const katilimcilar = toplantiImzalariniGetir(_toplantiId);
  const gundem = toplanti.gundem || [];

  const doc = new docx.Document({
    sections: [{
      // Kullanıcı isteği: davet tek sayfaya sığmalı (imza satırları
      // genişletildikçe taştı) — kenar boşlukları daraltıldı (0.5in) ve
      // boş paragraf ayraçları küçük "spacing.after" değerleriyle
      // değiştirildi ki yer kazanılsın, imza satırı yüksekliği yine de
      // genişletilmiş kalsın.
      properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
      children: [
        new docx.Paragraph({
          alignment: docx.AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new docx.TextRun({ text: 'TOPLANTI DAVETİ', bold: true, size: 32 })]
        }),
        new docx.Paragraph({
          spacing: { after: 200 },
          children: [new docx.TextRun({
            text: `İş Sağlığı ve Güvenliği Kurulumuzun ${_ciktiDonemMetni(toplanti)} toplantısı, ${_ciktiTarihSaat(toplanti)} tarihinde ${toplanti.yer || ''} yapılacaktır. Bilgilerinize sunar, toplantıya tüm kurul üyelerinin katılımını rica ederiz.`
          })]
        }),
        new docx.Paragraph({ spacing: { after: 100 }, children: [new docx.TextRun({ text: 'GÜNDEM', bold: true })] }),
        // Not (2026-08-04): burada eskiden 2 sabit (hardcoded) gündem maddesi
        // ("Bir önceki toplantıda alınan kararların gözden geçirilmesi" ve
        // "...ramak kala, iş kazalarının... görüşülmesi") toplantı.gundem'in
        // ÖNÜNE ekleniyordu — ama VARSAYILAN_GUNDEM_MADDELERI (bkz. ui.js)
        // zaten neredeyse birebir aynı iki maddeyle başlıyor, bu da davette
        // her zaman madde tekrarına yol açıyordu (kullanıcı tespiti). Artık
        // toplantının gerçek gündem listesi tek kaynak, 1'den başlar.
        // "Olaylar" maddesinin altına, toplantı tarihine kadar olan olayların
        // kısa dökümü eklenir (kullanıcı isteği: "toplantı tarihine kadar
        // olan olayları da gündeme ekleyelim") — bkz. service.js
        // toplantiOlaylarGundemMetni.
        ...gundem.flatMap((g, i) => {
          const satirlar = [new docx.Paragraph({ spacing: { after: 60 }, children: [new docx.TextRun({ text: `${i + 1}) ${g.baslik}`, bold: true })] })];
          if (/^olaylar/i.test(g.baslik.trim())) {
            const olaylarMetni = toplantiOlaylarGundemMetni(toplanti.id);
            if (olaylarMetni) {
              satirlar.push(new docx.Paragraph({
                indent: { left: 300 },
                spacing: { after: 60 },
                children: [new docx.TextRun({ text: olaylarMetni, italics: true, size: 18 })]
              }));
            }
          }
          return satirlar;
        }),
        new docx.Paragraph({ text: '', spacing: { after: 140 } }),
        new docx.Table({
          width: { size: 100, type: docx.WidthType.PERCENTAGE },
          rows: [
            // Kullanıcı isteği (3. düzeltme): GÖREVİ biraz genişletildi, İMZA
            // daraltıldı. 19 katılımcılık listede 600 twip taban satır
            // yüksekliği (önceki tur) sayfa sınırına tam denk gelip taşmaya
            // devam ediyordu — güvenli pay bırakmak için 400 twip'e indirildi
            // (yine de eski varsayılan 350'den biraz daha ferah, ve GÖREVİ
            // genişlediği için 2 satıra taşma da daha az olacak).
            new docx.TableRow({
              children: [
                ['ADI VE SOYADI', 30], ['GÖREVİ', 38], ['İMZA', 32]
              ].map(([baslik, genislik]) =>
                new docx.TableCell({ width: { size: genislik, type: docx.WidthType.PERCENTAGE }, children: [new docx.Paragraph({ spacing: { before: 120, after: 120 }, children: [new docx.TextRun({ text: baslik, bold: true })] })] })
              )
            }),
            ...katilimcilar.map((k, i) => new docx.TableRow({
              height: { value: 400, rule: docx.HeightRule.ATLEAST },
              children: [
                new docx.TableCell({ children: [new docx.Paragraph({ text: `${i + 1}) ${k.adSoyad}`, spacing: { before: 60, after: 60 } })] }),
                new docx.TableCell({ children: [new docx.Paragraph({ text: k.unvan || '', spacing: { before: 60, after: 60 } })] }),
                new docx.TableCell({ children: [new docx.Paragraph({ text: '', spacing: { before: 60, after: 60 } })] })
              ]
            }))
          ]
        })
      ]
    }]
  });

  const blob = await docx.Packer.toBlob(doc);
  const dosyaAdi = `Toplanti_Daveti_${toplanti.toplantiNo}.docx`;
  if (indir) saveAs(blob, dosyaAdi);
  return { blob, dosyaAdi };
}

// ==================== 1) TOPLANTI TAKVİM DAVETİ (.ics) ====================

// Kullanıcı isteği: Outlook'taki "Toplantı" (toplantı talebi) penceresinin
// gerekli katılımcılar/başlık/tarih-saat/konum/açıklama alanlarıyla hazır
// açılması — statik uygulama Outlook'a doğrudan bağlanamadığından, aynı
// bilgileri taşıyan bir takvim dosyası (.ics, METHOD:REQUEST) üretilir; Outlook'ta
// açılınca katılımcılar "Gerekli" satırında dolu bir toplantı olarak gelir ve
// "Gönder" ile gerçek toplantı talebi olarak iletilir.
function _icsMetinKacir(m) {
  return String(m || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

function _icsSatirKatla(satir) {
  const parcalar = [];
  let kalan = satir;
  while (kalan.length > 70) { parcalar.push(kalan.slice(0, 70)); kalan = ' ' + kalan.slice(70); }
  parcalar.push(kalan);
  return parcalar.join('\r\n');
}

function toplantiTakvimDavetiOlustur(organizatorEposta) {
  const toplanti = toplantiIdIleGetirRepo(_toplantiId);
  if (!toplanti || !toplanti.tarih) { alert('Toplantı tarihi girilmemiş.'); return; }

  const [ss, dd] = (toplanti.saat || '14:00').split(':').map(Number);
  const baslangic = new Date(`${toplanti.tarih}T${String(ss || 0).padStart(2, '0')}:${String(dd || 0).padStart(2, '0')}:00`);
  const bitis = new Date(baslangic.getTime() + 60 * 60000);
  const bicim = d => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}00`;

  const gundem = (kurulGundemSirala(toplanti.gundem || [])).map((g, i) => `${i + 1}) ${g.baslik}`).join('\n');
  const aciklama = `İş Sağlığı ve Güvenliği Kurulu toplantısı (${_ciktiDonemMetni(toplanti)}).\n\nGÜNDEM\n${gundem || '-'}`;
  const katilimcilar = toplantiImzalariniGetir(_toplantiId).filter(i => i.eposta);

  const satirlar = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Risk360//Kurul Toplanti Daveti//TR', 'CALSCALE:GREGORIAN', 'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:kurul-${toplanti.id}@risk360`,
    `DTSTAMP:${bicim(new Date())}`,
    `DTSTART:${bicim(baslangic)}`,
    `DTEND:${bicim(bitis)}`,
    `SUMMARY:${_icsMetinKacir(toplanti.baslik || ('İSG Kurulu Toplantısı - ' + toplanti.toplantiNo))}`,
    `LOCATION:${_icsMetinKacir(toplanti.yer || '')}`,
    `DESCRIPTION:${_icsMetinKacir(aciklama)}`,
    organizatorEposta ? `ORGANIZER:mailto:${organizatorEposta}` : null,
    ...katilimcilar.map(k => `ATTENDEE;CN="${String(k.adSoyad).replace(/"/g, '')}";ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${k.eposta}`),
    'STATUS:CONFIRMED', 'SEQUENCE:0', 'TRANSP:OPAQUE',
    'END:VEVENT', 'END:VCALENDAR'
  ].filter(Boolean).map(_icsSatirKatla);

  const blob = new Blob([satirlar.join('\r\n') + '\r\n'], { type: 'text/calendar;charset=utf-8' });
  saveAs(blob, `Toplanti_Daveti_${toplanti.toplantiNo}.ics`);
  return katilimcilar.length;
}

// Bu toplantının kararlarında VEYA devreden kararlarda oy dökümü (Kabul/Ret/
// Çekimser) boş olan varsa rapor oluşturmadan önce kullanıcıyı uyarır —
// kullanıcı isteği: "oy kısmı doldurulmadı ise rapor yazdırırken beni uyarsın".
// Onaylarsa true döner (rapor devam eder), iptal ederse false (çağıran fonksiyon
// hiçbir dosya üretmeden çıkar). Word/PDF/PPTX üçünde de ortak kullanılır.
async function _oyEksikKontrolVeUyar(yeni, devreden) {
  const eksikYeni = yeni.filter(k => !kararOyDokumMetni(k));
  const eksikDevreden = devreden.filter(k => !kararOyDokumMetni(k));
  if (!eksikYeni.length && !eksikDevreden.length) return true;
  const satirlar = [];
  if (eksikYeni.length) satirlar.push(`Bu toplantının kararları: ${eksikYeni.map(k => k.kararNo).join(', ')}`);
  if (eksikDevreden.length) satirlar.push(`Devreden kararlar: ${eksikDevreden.map(k => k.kararNo).join(', ')}`);
  return onayModali(`Aşağıdaki kararlarda oy dökümü (Kabul/Ret/Çekimser) girilmemiş:\n\n${satirlar.join('\n')}\n\nYine de rapor oluşturulsun mu?`, 'Yine de Oluştur');
}

// ==================== 2) KURUL RAPORU (WORD) ====================

// Kullanıcı isteği: "iş kazası verilerinde sıklık hızı, LTR vb. yerine aylık
// kaza sayıları grafiği koyabiliriz, bir sayfa" — Word raporunda docx.js yerel
// grafik üretemediğinden, aylık kaza sayıları sütun grafiği canvas ile çizilip
// PNG olarak eklenir (PPTX'te yerel grafik kullanılır).
function _kazaAylikGrafikPngOlustur(aylikDagilim, yil) {
  const G = 1400, Y = 700;
  const tuval = document.createElement('canvas');
  tuval.width = G; tuval.height = Y;
  const c = tuval.getContext('2d');
  c.fillStyle = '#ffffff'; c.fillRect(0, 0, G, Y);

  const sol = 90, sag = 40, ust = 90, alt = 110;
  const cizimG = G - sol - sag, cizimY = Y - ust - alt;
  const degerler = aylikDagilim.map(a => a.kazaSayisi);
  const enYuksek = Math.max(4, ...degerler);
  const adim = Math.max(1, Math.ceil(enYuksek / 6));
  const tavan = Math.ceil(enYuksek / adim) * adim;

  c.fillStyle = '#111827'; c.font = 'bold 34px Arial'; c.textAlign = 'center';
  c.fillText(`${yil} Yılı Aylık İş Kazası Sayıları`, G / 2, 52);

  c.font = '22px Arial'; c.textAlign = 'right'; c.strokeStyle = '#e5e7eb'; c.lineWidth = 1;
  for (let v = 0; v <= tavan; v += adim) {
    const y = ust + cizimY - (v / tavan) * cizimY;
    c.beginPath(); c.moveTo(sol, y); c.lineTo(G - sag, y); c.stroke();
    c.fillStyle = '#6b7280'; c.fillText(String(v), sol - 12, y + 8);
  }

  const kolonG = cizimG / aylikDagilim.length;
  aylikDagilim.forEach((a, i) => {
    const x = sol + i * kolonG + kolonG * 0.18;
    const w = kolonG * 0.64;
    const h = (a.kazaSayisi / tavan) * cizimY;
    c.fillStyle = '#1d4ed8';
    c.fillRect(x, ust + cizimY - h, w, h);
    c.textAlign = 'center';
    c.fillStyle = '#111827'; c.font = 'bold 26px Arial';
    c.fillText(String(a.kazaSayisi), x + w / 2, ust + cizimY - h - 10);
    c.fillStyle = '#374151'; c.font = '22px Arial';
    c.fillText(a.ay, x + w / 2, ust + cizimY + 36);
  });

  c.strokeStyle = '#9ca3af'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(sol, ust + cizimY); c.lineTo(G - sag, ust + cizimY); c.stroke();

  return new Promise(coz => tuval.toBlob(blob => blob.arrayBuffer().then(buf => coz({ veri: new Uint8Array(buf), genislik: 600, yukseklik: 300 })), 'image/png'));
}

// Kullanıcı isteği: kurulda uygunsuzlukların değerlendirmesi (açılan/kapatılan,
// tamamlama oranı). Aylık AÇILAN ve KAPATILAN uygunsuzluk sayıları gruplu sütun
// grafiği olarak canvas ile çizilir; senkron çalışır (PDF şablonu da kullanır).
function _aylikGrupluGrafikCiz(baslik, aylar, seriler) {
  const G = 1400, Y = 700;
  const tuval = document.createElement('canvas');
  tuval.width = G; tuval.height = Y;
  const c = tuval.getContext('2d');
  c.fillStyle = '#ffffff'; c.fillRect(0, 0, G, Y);

  const sol = 90, sag = 40, ust = 110, alt = 110;
  const cizimG = G - sol - sag, cizimY = Y - ust - alt;
  const enYuksek = Math.max(4, ...seriler.flatMap(se => se.degerler));
  const adim = Math.max(1, Math.ceil(enYuksek / 6));
  const tavan = Math.ceil(enYuksek / adim) * adim;

  c.fillStyle = '#111827'; c.font = 'bold 34px Arial'; c.textAlign = 'center';
  c.fillText(baslik, G / 2, 48);

  // Gösterge
  c.font = '22px Arial'; c.textAlign = 'left';
  let gx = G / 2 - seriler.length * 110;
  seriler.forEach(se => {
    c.fillStyle = se.renk; c.fillRect(gx, 66, 26, 26);
    c.fillStyle = '#374151'; c.fillText(se.ad, gx + 36, 88);
    gx += 240;
  });

  c.textAlign = 'right'; c.strokeStyle = '#e5e7eb'; c.lineWidth = 1;
  for (let v = 0; v <= tavan; v += adim) {
    const y = ust + cizimY - (v / tavan) * cizimY;
    c.beginPath(); c.moveTo(sol, y); c.lineTo(G - sag, y); c.stroke();
    c.fillStyle = '#6b7280'; c.fillText(String(v), sol - 12, y + 8);
  }

  const kolonG = cizimG / aylar.length;
  aylar.forEach((ay, i) => {
    const grupG = kolonG * 0.76;
    const cubukG = grupG / seriler.length;
    seriler.forEach((se, j) => {
      const x = sol + i * kolonG + kolonG * 0.12 + j * cubukG;
      const h = (se.degerler[i] / tavan) * cizimY;
      c.fillStyle = se.renk;
      c.fillRect(x, ust + cizimY - h, cubukG - 4, h);
      c.textAlign = 'center'; c.fillStyle = '#111827'; c.font = 'bold 22px Arial';
      c.fillText(String(se.degerler[i]), x + (cubukG - 4) / 2, ust + cizimY - h - 8);
    });
    c.fillStyle = '#374151'; c.font = '22px Arial'; c.textAlign = 'center';
    c.fillText(ay, sol + i * kolonG + kolonG / 2, ust + cizimY + 36);
  });

  c.strokeStyle = '#9ca3af'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(sol, ust + cizimY); c.lineTo(G - sag, ust + cizimY); c.stroke();

  const dataUrl = tuval.toDataURL('image/png');
  const ikili = atob(dataUrl.split(',')[1]);
  const veri = new Uint8Array(ikili.length);
  for (let i = 0; i < ikili.length; i++) veri[i] = ikili.charCodeAt(i);
  return { dataUrl, veri, genislik: 600, yukseklik: 300 };
}

// ==================== DETAYLI İSG İSTATİSTİKLERİ (kaza / ramak kala) ====================
// Kullanıcı isteği: yıllık ve aylık iş kazası, ramak kala kayıtlarıyla ilgili ilk
// sayfalarda detaylı, profesyonel istatistikler (kaza türleri, iş günü kaybı,
// önceki yıllarla kıyaslama). Veri: service.js toplantiDetayliKazaIstatistikleri.
function _istSayi(n, ondalik) {
  if (n == null || Number.isNaN(n)) return '-';
  return Number.isInteger(n) && !ondalik ? String(n) : n.toFixed(ondalik == null ? 2 : ondalik).replace('.', ',');
}

function _istDegisim(bu, onceki) {
  if (bu == null || onceki == null) return '-';
  const fark = bu - onceki;
  if (Math.abs(fark) < 1e-9) return '= 0';
  const yuzde = onceki ? ' (%' + Math.abs((fark / onceki) * 100).toFixed(0) + ')' : '';
  return (fark > 0 ? '▲ +' : '▼ -') + _istSayi(Math.abs(fark)) + yuzde;
}

// [etiket, önceki-2, önceki-1, bu yıl, değişim] satırları — Word ve PPTX tablosu ortak kullanır.
function _istKarsilastirmaSatirlari(kd) {
  const [y2, y1, y0] = kd.yillar;
  const satir = (etiket, alan, ondalik) => [etiket, _istSayi(y2[alan], ondalik), _istSayi(y1[alan], ondalik), _istSayi(y0[alan], ondalik), _istDegisim(y0[alan], y1[alan])];
  return [
    satir('Toplam Olay Bildirimi', 'toplamOlay'),
    satir('İş Kazası Sayısı (LTI+DART+Tıbbi Tedavi+Ölüm)', 'kazaSayisi'),
    satir('   · Kayıp Günlü Kaza (LTI)', 'lti'),
    satir('   · Kısıtlı İş / Transfer (DART)', 'dart'),
    satir('   · Tıbbi Tedavi', 'tibbi'),
    satir('   · Ölüm', 'olum'),
    satir('Ramak Kala', 'ramakKala'),
    satir('İlk Yardım', 'ilkYardim'),
    satir('Tehlike Bildirimi', 'tehlikeBildirimi'),
    satir('Maddi Hasar', 'maddiHasar'),
    satir('Toplam İş Günü Kaybı', 'toplamKayipGun'),
    satir('Kayıp Günlü Kaza Başına Ort. Kayıp Gün', 'ortKayipGun', 1),
    satir('Çalışma Saati', 'calismaSaati'),
    satir('Kaza Sıklık Hızı (LTI x 1.000.000 / saat)', 'siklikHizi', 2),
    satir('Kaza Ağırlık Oranı (kayıp gün x 1.000.000 / saat)', 'agirlikOrani', 2),
    satir('Ramak Kala / İş Kazası Oranı', 'ramakKalaKazaOrani', 1)
  ];
}

// Yatay çubuk grafik (dağılımlar için) — canvas, senkron.
function _yatayCubukGrafikCiz(baslik, kayitlar, renk) {
  const G = 1400, SATIR = 62, UST = 100, ALT = 30, SOL = 560, SAG = 140;
  const Y = UST + ALT + Math.max(1, kayitlar.length) * SATIR;
  const tuval = document.createElement('canvas');
  tuval.width = G; tuval.height = Y;
  const c = tuval.getContext('2d');
  c.fillStyle = '#ffffff'; c.fillRect(0, 0, G, Y);
  c.fillStyle = '#111827'; c.font = 'bold 34px Arial'; c.textAlign = 'center';
  c.fillText(baslik, G / 2, 56);
  const enYuksek = Math.max(1, ...kayitlar.map(k => k.sayi));
  const toplam = kayitlar.reduce((t, k) => t + k.sayi, 0) || 1;
  const cizimG = G - SOL - SAG;
  if (!kayitlar.length) {
    c.fillStyle = '#6b7280'; c.font = '26px Arial'; c.fillText('Kayıt bulunmamaktadır.', G / 2, UST + 40);
  }
  kayitlar.forEach((k, i) => {
    const y = UST + i * SATIR;
    let etiket = k.etiket;
    c.font = '26px Arial';
    while (c.measureText(etiket).width > SOL - 40 && etiket.length > 4) etiket = etiket.slice(0, -2);
    if (etiket !== k.etiket) etiket = etiket.trimEnd() + '…';
    c.textAlign = 'right'; c.fillStyle = '#374151'; c.fillText(etiket, SOL - 18, y + 36);
    const w = (k.sayi / enYuksek) * cizimG;
    c.fillStyle = renk; c.fillRect(SOL, y + 8, Math.max(4, w), SATIR - 20);
    c.textAlign = 'left'; c.fillStyle = '#111827'; c.font = 'bold 26px Arial';
    c.fillText(`${k.sayi}  (%${Math.round((k.sayi / toplam) * 100)})`, SOL + Math.max(4, w) + 14, y + 36);
  });
  c.strokeStyle = '#9ca3af'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(SOL, UST); c.lineTo(SOL, Y - ALT); c.stroke();
  const dataUrl = tuval.toDataURL('image/png');
  const ikili = atob(dataUrl.split(',')[1]);
  const veri = new Uint8Array(ikili.length);
  for (let i = 0; i < ikili.length; i++) veri[i] = ikili.charCodeAt(i);
  return { dataUrl, veri, genislik: 600, yukseklik: Math.round(600 * Y / G) };
}

function _uygunsuzlukDegerlendirmeVerisi(toplanti) {
  const ist = toplantiUygunsuzlukIstatistikleriHesapla(toplanti);
  if (!ist) return null;
  const oran = ist.tamamlamaOrani == null ? '-' : '%' + ist.tamamlamaOrani.toFixed(1).replace('.', ',');
  const grafik = _aylikGrupluGrafikCiz(`${ist.yil} Yılı Aylık Açılan / Kapatılan Uygunsuzluklar`, ist.aylik.map(a => a.ay), [
    { ad: 'Açılan', renk: '#dc2626', degerler: ist.aylik.map(a => a.acilan) },
    { ad: 'Kapatılan', renk: '#16a34a', degerler: ist.aylik.map(a => a.kapatilan) }
  ]);
  return { ist, oran, grafik };
}



// dataURL/uzak URL -> ImageRun'a verilebilecek ham bayt dizisi. file://
// altında fotoğraflar hep base64 data URL olarak geldiği için asıl yol odur
// (bkz. core/data.js fotoYukle IS_FILE_PROTOCOL); uzak Storage URL'i için
// fetch ile yedekleme eklendi ama CORS'a bağımlı, çalışmazsa foto sessizce atlanır.
async function _wordGorselBaytlari(url) {
  if (!url) return null;
  try {
    if (url.startsWith('data:')) {
      const b64 = url.slice(url.indexOf(',') + 1);
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes;
    }
    const res = await fetch(url);
    return new Uint8Array(await res.arrayBuffer());
  } catch (e) {
    return null;
  }
}

// PDF çıktısındaki karar/uygunsuzluk fotoğraf listesini ({url, etiket}) ImageRun
// paragrafına çevirir — kart tablosunun ALTINA (içine değil) eklenir.
async function _wordFotoParagraflari(fotoListesi) {
  const baytli = await Promise.all(fotoListesi.map(async f => ({ etiket: f.etiket, bytes: await _wordGorselBaytlari(f.url) })));
  const gecerli = baytli.filter(f => f.bytes);
  if (!gecerli.length) return [];
  // Kullanıcı isteği: fotoğraflar arasında küçük boşluk — her fotoğraf (altında kendi
  // etiketiyle) kenarlıksız bir tablonun ayrı hücresine konur; hücre genişliği
  // fotoğraftan geniş olduğu için aralarında ~0,3" boşluk kalır.
  const yok = { style: docx.BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const kenarsiz = { top: yok, bottom: yok, left: yok, right: yok };
  const HUCRE = 1700;
  return [
    new docx.Table({
      width: { size: HUCRE * gecerli.length, type: docx.WidthType.DXA },
      columnWidths: gecerli.map(() => HUCRE),
      layout: docx.TableLayoutType.FIXED,
      borders: { top: yok, bottom: yok, left: yok, right: yok, insideHorizontal: yok, insideVertical: yok },
      rows: [new docx.TableRow({
        cantSplit: true,
        children: gecerli.map(f => new docx.TableCell({
          width: { size: HUCRE, type: docx.WidthType.DXA },
          borders: kenarsiz,
          margins: { top: 60, bottom: 20, left: 0, right: 0 },
          children: [
            new docx.Paragraph({ children: [new docx.ImageRun({ data: f.bytes, transformation: { width: 85, height: 85 } })] }),
            new docx.Paragraph({ children: [new docx.TextRun({ text: f.etiket, size: 16, italics: true, color: '64748B' })] })
          ]
        }))
      })]
    }),
    new docx.Paragraph({ children: [], spacing: { after: 120 } })
  ];
}

const _wordKenar = { style: docx.BorderStyle.SINGLE, size: 4, color: '94A3B8' };
const _wordKenarSet = { top: _wordKenar, bottom: _wordKenar, left: _wordKenar, right: _wordKenar };
const _wordGolge = { fill: 'E5E7EB', color: 'auto', type: docx.ShadingType.CLEAR };
// Kullanıcı isteği: "yazı karakterleri arasında boyutlarında farklılıklar
// var, görüntüyü bozuyor" — kurulRaporuWordOlustur'daki (kapak hariç) TÜM
// gövde metni artık bu TEK boyutu kullanıyor; vurgu boyutla değil sadece
// bold ile yapılıyor (bkz. aşağıdaki _wordEtiketDeger, table(), P()).
const KURUL_WORD_METIN_BOYUT = 18;
const _wordHucre = (children, opts = {}) => new docx.TableCell({
  children: Array.isArray(children) ? children : [children],
  borders: _wordKenarSet,
  margins: { top: 60, bottom: 60, left: 100, right: 100 },
  ...opts
});
const _wordEtiketDeger = (etiket, deger) => [
  new docx.Paragraph({ children: [new docx.TextRun({ text: etiket, bold: true, size: KURUL_WORD_METIN_BOYUT, color: '111827' })] }),
  new docx.Paragraph({ children: [new docx.TextRun({ text: String(deger ?? '') || '-', size: KURUL_WORD_METIN_BOYUT })] })
];

// Olayın Karar Metni/Sorumlu/Termin/Öncelik/Durum/Oy alanları (bkz. model.js
// kurulOlayiOlustur) doluysa, karar kartlarındaki notSatirlari ile aynı
// mantıkla ek satırlar üretir (2 sütunlu olay tablosuna uysun diye columnSpan:2).
function _wordOlayKararTakibiSatirlari(o) {
  const satirlar = [];
  if (!(o.kararMetni || o.sorumlu || o.termin)) return satirlar;
  if (o.kararMetni) satirlar.push(new docx.TableRow({ children: [_wordHucre(_wordEtiketDeger('Karar Metni', o.kararMetni), { columnSpan: 2 })] }));
  satirlar.push(new docx.TableRow({ children: [
    _wordHucre(_wordEtiketDeger('Sorumlu', o.sorumlu)),
    _wordHucre(_wordEtiketDeger('Termin', gunAyYil(o.termin)))
  ]}));
  satirlar.push(new docx.TableRow({ children: [
    _wordHucre(_wordEtiketDeger('Öncelik', o.oncelik)),
    _wordHucre(_wordEtiketDeger('Durum', o.durum))
  ]}));
  const oyDokumu = kararOyDokumMetni(o);
  if (o.oySonucu || oyDokumu) {
    satirlar.push(new docx.TableRow({ children: [_wordHucre(_wordEtiketDeger('Oy Sonucu', [[o.oy, o.oySonucu].filter(Boolean).join(' — '), oyDokumu && `(${oyDokumu})`].filter(Boolean).join('  ')), { columnSpan: 2 })] }));
  }
  return satirlar;
}

// Olaylar için PDF'teki "info-card" görünümünün Word karşılığı: başlık satırı
// (Tür | Tarih) + 2 sütunlu etiket/değer ızgarası (bkz. cikti.js _pdfInfoCardGrid).
// Olay/Kaza modülünden otomatik çekilen kayıtlarda varsa "Olay Yeri
// Fotoğrafları" tablonun altına eklenir (kararlar/uygunsuzluklarla aynı desen).
async function _wordOlayKarti(o) {
  const tablo = new docx.Table({
    width: { size: 100, type: docx.WidthType.PERCENTAGE },
    rows: [
      new docx.TableRow({ children: [
        _wordHucre(new docx.Paragraph({ children: [new docx.TextRun({ text: o.tur || '-', bold: true, size: KURUL_WORD_METIN_BOYUT })] }), { width: { size: 50, type: docx.WidthType.PERCENTAGE }, shading: _wordGolge }),
        _wordHucre(new docx.Paragraph({ children: [new docx.TextRun({ text: gunAyYil(o.tarih) || '-', bold: true, size: KURUL_WORD_METIN_BOYUT })] }), { width: { size: 50, type: docx.WidthType.PERCENTAGE }, shading: _wordGolge })
      ]}),
      new docx.TableRow({ children: [
        _wordHucre(_wordEtiketDeger('Yer', o.yer)),
        _wordHucre(_wordEtiketDeger('Birim', o.birim))
      ]}),
      new docx.TableRow({ children: [ _wordHucre(_wordEtiketDeger('Oluş Şekli', o.olusSekli), { columnSpan: 2 }) ] }),
      new docx.TableRow({ children: [
        _wordHucre(_wordEtiketDeger('Kök Neden', o.kokNeden)),
        _wordHucre(_wordEtiketDeger('İş Günü Kaybı', o.isGunuKaybi))
      ]}),
      ..._wordOlayKararTakibiSatirlari(o)
    ]
  });

  const fotoParagraflari = await _wordFotoParagraflari((o.fotograflar || []).map((f, i) => ({ url: f.url, etiket: 'Olay Yeri ' + (i + 1) })));
  return [tablo, ...fotoParagraflari, new docx.Paragraph({ text: '', spacing: { after: fotoParagraflari.length ? 0 : 200 } })];
}

// Kararlar için PDF'teki "decision-card" görünümünün Word karşılığı (bkz.
// cikti.js _pdfKararKarti) — başlık, karar metni, 4 sütunlu meta ızgarası,
// varsa aksiyon/oy/kapanış notları; fotoğraflar tablonun altına ayrı eklenir.
async function _wordKararKarti(k) {
  const notSatirlari = [];
  if (k.aksiyonNotu) notSatirlari.push(new docx.TableRow({ children: [_wordHucre(_wordEtiketDeger('Aksiyon', k.aksiyonNotu), { columnSpan: 4 })] }));
  const oyDokumu = kararOyDokumMetni(k);
  if (k.oySonucu || oyDokumu) notSatirlari.push(new docx.TableRow({ children: [_wordHucre(_wordEtiketDeger('Oy Sonucu', [[k.oy, k.oySonucu].filter(Boolean).join(' — '), oyDokumu && `(${oyDokumu})`].filter(Boolean).join('  ')), { columnSpan: 4 })] }));
  if (k.kanit || k.kapanisTarihi) notSatirlari.push(new docx.TableRow({ children: [_wordHucre(_wordEtiketDeger('Kapanış / Kanıt', [gunAyYil(k.kapanisTarihi), k.kanit].filter(Boolean).join(' / ')), { columnSpan: 4 })] }));

  const tablo = new docx.Table({
    width: { size: 100, type: docx.WidthType.PERCENTAGE },
    rows: [
      new docx.TableRow({ children: [
        _wordHucre(new docx.Paragraph({ children: [new docx.TextRun({ text: k.kararNo || '-', bold: true, size: KURUL_WORD_METIN_BOYUT })] }), { width: { size: 25, type: docx.WidthType.PERCENTAGE }, shading: _wordGolge, columnSpan: 1 }),
        _wordHucre(new docx.Paragraph({ children: [new docx.TextRun({ text: k.kaynakGundem || '', bold: true, size: KURUL_WORD_METIN_BOYUT })] }), { width: { size: 75, type: docx.WidthType.PERCENTAGE }, shading: _wordGolge, columnSpan: 3 })
      ]}),
      new docx.TableRow({ children: [ _wordHucre(new docx.Paragraph({ children: [new docx.TextRun({ text: k.kararMetni || '', size: KURUL_WORD_METIN_BOYUT })] }), { columnSpan: 4 }) ] }),
      new docx.TableRow({ children: [
        _wordHucre(_wordEtiketDeger('Sorumlu', k.sorumlu)),
        _wordHucre(_wordEtiketDeger('Termin', gunAyYil(k.termin))),
        _wordHucre(_wordEtiketDeger('Öncelik', k.oncelik)),
        _wordHucre(_wordEtiketDeger('Durum', k.durumGoruntu || k.durum))
      ]}),
      ...notSatirlari
    ]
  });

  const fotoParagraflari = await _wordFotoParagraflari(_pdfKararFotograflari(k));
  return [tablo, ...fotoParagraflari, new docx.Paragraph({ text: '', spacing: { after: fotoParagraflari.length ? 0 : 200 } })];
}

// Uygunsuzluklar için PDF'teki "decision-card" görünümünün Word karşılığı
// (bkz. cikti.js _pdfUygunsuzlukKarti) — Kararlarla aynı kart mantığı, farklı alanlar.
async function _wordUygunsuzlukKarti(k) {
  const onlemSatiri = k.alinanOnlem ? [new docx.TableRow({ children: [_wordHucre(_wordEtiketDeger('Alınan Önlem', k.alinanOnlem), { columnSpan: 4 })] })] : [];

  const tablo = new docx.Table({
    width: { size: 100, type: docx.WidthType.PERCENTAGE },
    rows: [
      new docx.TableRow({ children: [
        _wordHucre(new docx.Paragraph({ children: [new docx.TextRun({ text: k.bolum || '-', bold: true, size: KURUL_WORD_METIN_BOYUT })] }), { width: { size: 25, type: docx.WidthType.PERCENTAGE }, shading: _wordGolge, columnSpan: 1 }),
        _wordHucre(new docx.Paragraph({ children: [new docx.TextRun({ text: k.konuBasligi || '', bold: true, size: KURUL_WORD_METIN_BOYUT })] }), { width: { size: 75, type: docx.WidthType.PERCENTAGE }, shading: _wordGolge, columnSpan: 3 })
      ]}),
      new docx.TableRow({ children: [ _wordHucre(new docx.Paragraph({ children: [new docx.TextRun({ text: k.uygunsuzluk || '', size: KURUL_WORD_METIN_BOYUT })] }), { columnSpan: 4 }) ] }),
      new docx.TableRow({ children: [
        _wordHucre(_wordEtiketDeger('Tespit', gunAyYil(k.tespitTarihi))),
        _wordHucre(_wordEtiketDeger('Kapanış', gunAyYil(k.kapanisTarihi))),
        _wordHucre(_wordEtiketDeger('Sorumlu', k.sorumlu)),
        _wordHucre(_wordEtiketDeger('Durum', k.durum))
      ]}),
      ...onlemSatiri
    ]
  });

  const fotograflar = [];
  if (k.fotoOncesi) fotograflar.push({ url: k.fotoOncesi, etiket: 'Öncesi' });
  if (k.fotoSonrasi) fotograflar.push({ url: k.fotoSonrasi, etiket: 'Sonrası' });
  const fotoParagraflari = await _wordFotoParagraflari(fotograflar);
  return [tablo, ...fotoParagraflari, new docx.Paragraph({ text: '', spacing: { after: fotoParagraflari.length ? 0 : 200 } })];
}

async function kurulRaporuWordOlustur() {
  const toplanti = toplantiIdIleGetirRepo(_toplantiId);
  if (!toplanti) return;

  const gundem = kurulGundemSirala(toplanti.gundem || []);
  const olaylarHam = toplantiOlaylariniGetir(_toplantiId);
  const { devreden: devredenHam, yeni: yeniHam } = _ciktiKararVerisi(_toplantiId);
  if (!(await _oyEksikKontrolVeUyar(yeniHam, devredenHam))) return;
  const tespitEdilenUygunsuzluklarHam = toplantiTespitEdilenUygunsuzluklariGetir(toplanti);
  const kapananUygunsuzluklarHam = toplantiKapananUygunsuzluklariGetir(toplanti);
  const aylikEgitimler = toplantiAylikEgitimleriGetir(toplanti);
  const ayIciFaaliyetler = toplantiAyIciFaaliyetleriniGetir(_toplantiId);
  const imzalar = toplantiImzalariniGetir(_toplantiId);
  const katilanlar = imzalar.filter(i => i.katildiMi);
  const bsRapor = toplantiBaskanSekreterGetir(_toplantiId);
  const firma = aktifFirmaGetir();

  // PDF çıktısıyla aynı: kararlar/uygunsuzluklar/olaylar önce foto referansları
  // çözülür (bkz. kurulRaporuPdfOlustur), sonra kart tablolarına dönüştürülür.
  const logoUrl = firma ? await fotoBuyukCoz(firmaLogoGetir(firma.id)) : '';
  const [logoBytes, devreden, yeni, tespitEdilenUygunsuzluklar, kapananUygunsuzluklar, olaylar] = await Promise.all([
    _wordGorselBaytlari(logoUrl),
    _pdfKararlariFotoCoz(devredenHam),
    _pdfKararlariFotoCoz(yeniHam),
    _pdfUygunsuzluklariFotoCoz(tespitEdilenUygunsuzluklarHam),
    _pdfUygunsuzluklariFotoCoz(kapananUygunsuzluklarHam),
    _pdfOlaylarFotoCoz(olaylarHam)
  ]);

  const [yeniKartlari, devredenKartlari, tespitKartlari, kapananKartlari, olayKartlari] = await Promise.all([
    Promise.all(yeni.map(_wordKararKarti)),
    Promise.all(devreden.map(_wordKararKarti)),
    Promise.all(tespitEdilenUygunsuzluklar.map(_wordUygunsuzlukKarti)),
    Promise.all(kapananUygunsuzluklar.map(_wordUygunsuzlukKarti)),
    Promise.all(olaylar.map(_wordOlayKarti))
  ]);

  const P = (t, opts = {}) => new docx.Paragraph({ children: [new docx.TextRun({ text: String(t), size: KURUL_WORD_METIN_BOYUT, ...opts })] });
  const H = (t) => new docx.Paragraph({ text: t, heading: docx.HeadingLevel.HEADING_2 });
  const BR = () => new docx.Paragraph({ children: [new docx.PageBreak()] });
  // Genel Değerlendirme'nin alt başlıkları için ("Etiket: değer", etiket kalın) —
  // kullanıcı isteği: "planlanan faaliyetlerin gerçekleşme durumları, tespit
  // edilen hususlar, çalışanların bildirimleri gibi şeyler ekleyelim".
  const PL = (etiket, deger) => new docx.Paragraph({
    children: [new docx.TextRun({ text: etiket + ': ', bold: true, size: KURUL_WORD_METIN_BOYUT }), new docx.TextRun({ text: String(deger), size: KURUL_WORD_METIN_BOYUT })],
    spacing: { after: 120 }
  });
  // "İSG Kurulları İle İlgili Yasal Düzenleme" bölümü için (bkz. model.js
  // YONETMELIK_MADDELERI) — kullanıcı isteği: "yasal düzenleme referansı
  // raporlarda olmalı".
  const maddeParagraflari = (m) => [
    new docx.Paragraph({ children: [new docx.TextRun({ text: `${m.madde} – ${m.baslik}`, bold: true, size: KURUL_WORD_METIN_BOYUT })], spacing: { before: 200, after: 80 } }),
    ...m.fikralar.flatMap(f => [
      P(f.giris, { spacing: { after: 60 } }),
      ...f.bentler.map(b => new docx.Paragraph({ children: [new docx.TextRun({ text: b, size: KURUL_WORD_METIN_BOYUT })], indent: { left: 360 }, spacing: { after: 60 } }))
    ])
  ];

  const table = (headers, rows) => new docx.Table({
    width: { size: 100, type: docx.WidthType.PERCENTAGE },
    rows: [
      new docx.TableRow({
        tableHeader: true,
        children: headers.map(h => new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: h, bold: true, size: KURUL_WORD_METIN_BOYUT })] })] }))
      }),
      ...rows.map(r => new docx.TableRow({
        children: r.map(c => new docx.TableCell({ children: [new docx.Paragraph({ children: [new docx.TextRun({ text: String(c ?? ''), size: KURUL_WORD_METIN_BOYUT })] })] }))
      }))
    ]
  });

  // "Toplantı Bilgileri" PDF'te ayrı bir kutu (meeting-info) — Word'de aynı
  // 6 satırı bir tablo olarak kapak sonrası, "1) Gündem"'den önce basar.
  const bilgiTablosu = new docx.Table({
    width: { size: 100, type: docx.WidthType.PERCENTAGE },
    rows: [
      ['Toplantı No', toplanti.toplantiNo],
      ['Tarih / Saat', _ciktiTarihSaat(toplanti)],
      ['Yer', toplanti.yer || '-'],
      ['Kurul Başkanı', bsRapor.baskan || '-'],
      ['Kurul Sekreteri', bsRapor.yazman || '-'],
      ['Katılımcı Sayısı', katilanlar.length || '-']
    ].map(([etiket, deger]) => new docx.TableRow({ children: [
      _wordHucre(new docx.Paragraph({ children: [new docx.TextRun({ text: etiket, bold: true, size: KURUL_WORD_METIN_BOYUT })] }), { width: { size: 30, type: docx.WidthType.PERCENTAGE }, shading: _wordGolge }),
      _wordHucre(new docx.Paragraph({ children: [new docx.TextRun({ text: String(deger), size: KURUL_WORD_METIN_BOYUT })] }), { width: { size: 70, type: docx.WidthType.PERCENTAGE } })
    ]}))
  });

  // Yıl bazlı iş kazası istatistikleri (bkz. service.js
  // toplantiKazaIstatistikleriHesapla) — kullanıcı isteği: "word raporda
  // ilk konularda [yıl] içinde gerçekleşen iş kazası sayısı, toplam iş
  // günü kaybı, kaza sıklık ağırlık oranı ve kaza sıklık hızı yer alsın".
  const kazaIst = toplantiKazaIstatistikleriHesapla(toplanti);
  const kazaIstatistikTablosu = kazaIst ? new docx.Table({
    width: { size: 100, type: docx.WidthType.PERCENTAGE },
    rows: [
      ['İş Kazası Sayısı (LTI+DART+Tıbbi Tedavi)', String(kazaIst.kazaSayisi)],
      ['Toplam İş Günü Kaybı', String(kazaIst.toplamKayipGun)]
    ].map(([etiket, deger]) => new docx.TableRow({ children: [
      _wordHucre(new docx.Paragraph({ children: [new docx.TextRun({ text: etiket, bold: true, size: KURUL_WORD_METIN_BOYUT })] }), { width: { size: 50, type: docx.WidthType.PERCENTAGE }, shading: _wordGolge }),
      _wordHucre(new docx.Paragraph({ children: [new docx.TextRun({ text: String(deger), size: KURUL_WORD_METIN_BOYUT })] }), { width: { size: 50, type: docx.WidthType.PERCENTAGE } })
    ]}))
  }) : null;
  const kazaGrafikResmi = kazaIst ? await _kazaAylikGrafikPngOlustur(kazaIst.aylikDagilim, kazaIst.yil) : null;

  // Uygunsuzlukların değerlendirmesi: bu yıl açılan / kapatılan / açık sayıları,
  // tamamlama oranı ve aylık grafik (kullanıcı isteği).
  const usVeri = _uygunsuzlukDegerlendirmeVerisi(toplanti);
  const usTablo = usVeri ? new docx.Table({
    width: { size: 100, type: docx.WidthType.PERCENTAGE },
    rows: [
      [`${usVeri.ist.yil} Yılında Açılan Uygunsuzluk`, String(usVeri.ist.acilan)],
      ['Bunlardan Kapatılan (Yapılan)', String(usVeri.ist.kapatilan)],
      ['Hâlen Açık', String(usVeri.ist.acik)],
      ['Tamamlama Oranı', usVeri.oran]
    ].map(([etiket, deger]) => new docx.TableRow({ children: [
      _wordHucre(new docx.Paragraph({ children: [new docx.TextRun({ text: etiket, bold: true, size: KURUL_WORD_METIN_BOYUT })] }), { width: { size: 50, type: docx.WidthType.PERCENTAGE }, shading: _wordGolge }),
      _wordHucre(new docx.Paragraph({ children: [new docx.TextRun({ text: String(deger), size: KURUL_WORD_METIN_BOYUT })] }), { width: { size: 50, type: docx.WidthType.PERCENTAGE } })
    ]}))
  }) : null;

  // Kullanıcı isteği: kapak sayfasındaki logo/yazılar sayfaya düşeyde
  // ortalansın. docx.js'te paragraf listesi kendiliğinden dikeyde
  // ortalanmaz — tam sayfa yüksekliğinde, kenarlıksız TEK hücreli bir
  // tabloya sarılıp o hücrenin verticalAlign:CENTER özelliği kullanılır
  // (Word'de dikey ortalamanın standart yolu budur).
  const _kapakKenarYok = { style: docx.BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const kapakTablosu = new docx.Table({
    width: { size: 100, type: docx.WidthType.PERCENTAGE },
    borders: { top: _kapakKenarYok, bottom: _kapakKenarYok, left: _kapakKenarYok, right: _kapakKenarYok, insideHorizontal: _kapakKenarYok, insideVertical: _kapakKenarYok },
    rows: [
      new docx.TableRow({
        height: { value: 15200, rule: docx.HeightRule.EXACT },
        children: [
          new docx.TableCell({
            verticalAlign: docx.VerticalAlign.CENTER,
            borders: { top: _kapakKenarYok, bottom: _kapakKenarYok, left: _kapakKenarYok, right: _kapakKenarYok },
            children: [
              ...(logoBytes ? [new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.ImageRun({ data: logoBytes, transformation: { width: 110, height: 110 } })], spacing: { after: 200 } })] : []),
              new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: _denetimAktifFirmaAdi(), bold: true, size: 32 })], spacing: { after: 200 } }),
              new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: 'İŞ SAĞLIĞI VE GÜVENLİĞİ KURULU', bold: true, size: 24 })], spacing: { after: 800 } }),
              new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: 'İSG KURULU TOPLANTI RAPORU', bold: true, size: 30 })], spacing: { after: 400 } }),
              new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: _ciktiDonemMetni(toplanti), bold: true, size: 24 })], spacing: { after: 1200 } }),
              new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: '6331 Sayılı İş Sağlığı ve Güvenliği Kanunu', italics: true, size: 20 })] }),
              new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: 'MADDE 22 – Elli ve daha fazla çalışanın bulunduğu işyerlerinde işveren, iş sağlığı ve güvenliği kurulu oluşturur.', size: 18 })] }),
              new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: 'İSG Kurulları Hakkında Yönetmelik (Madde 4)', size: 18 })] })
            ]
          })
        ]
      })
    ]
  });

  // Detaylı iş kazası / ramak kala istatistik bölümü (Word).
  const kazaDetayElemanlari = (() => {
    const kd = toplantiDetayliKazaIstatistikleri(toplanti);
    if (!kd) return [];
    const [y2, y1, y0] = kd.yillar;
    const resim = (g) => new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { after: 160 }, children: [new docx.ImageRun({ data: g.veri, transformation: { width: g.genislik, height: g.yukseklik } })] });
    const donemNotu = `Önceki yıllar, toplantı dönemine uygun olarak aynı aralıkta (Ocak–${kd.sonAyAdi}) karşılaştırılmıştır. İş kazası = Kayıp Gün (LTI) + Kısıtlı İş (DART) + Tıbbi Tedavi + Ölüm. Oranlar için ilgili yılın aylık çalışma saati Olay/Kaza modülünde girilmiş olmalıdır.`;
    const kazasiz = kd.kazasizGun == null ? 'Kayıtlı iş kazası bulunmamaktadır.' : `Son iş kazası: ${gunAyYil(kd.sonKazaTarihi)} — kazasız geçen gün: ${kd.kazasizGun}`;
    const grafikKaza = _aylikGrupluGrafikCiz(`Aylık İş Kazası Sayıları: ${y1.yil} / ${y0.yil}`, kd.aylar, [
      { ad: String(y1.yil), renk: '#94a3b8', degerler: kd.aylikKaza.onceki }, { ad: String(y0.yil), renk: '#1d4ed8', degerler: kd.aylikKaza.bu }
    ]);
    const grafikRamak = _aylikGrupluGrafikCiz(`Aylık Ramak Kala Sayıları: ${y1.yil} / ${y0.yil}`, kd.aylar, [
      { ad: String(y1.yil), renk: '#94a3b8', degerler: kd.aylikRamak.onceki }, { ad: String(y0.yil), renk: '#ea580c', degerler: kd.aylikRamak.bu }
    ]);
    const dagilimGrafikleri = [
      _yatayCubukGrafikCiz(`${y0.yil} Olay Türlerine Göre Dağılım`, kd.olayTurleri, '#1d4ed8'),
      _yatayCubukGrafikCiz(`${y0.yil} Kaza / Yaralanma Türleri`, kd.yaralanmaTurleri, '#dc2626'),
      _yatayCubukGrafikCiz(`${y0.yil} Yaralanan Uzuv Dağılımı`, kd.yaralananUzuvlar, '#7c3aed'),
      _yatayCubukGrafikCiz(`${y0.yil} Bölüm / Birim Dağılımı`, kd.bolumler, '#0f766e')
    ];
    return [
      BR(),
      H(`${kd.yil} Yılı İSG İstatistikleri (Ocak–${kd.sonAyAdi})`),
      P(donemNotu, { italics: true }),
      P(' ', { spacing: { after: 100 } }),
      table(['Gösterge', String(y2.yil), String(y1.yil), String(y0.yil), `${y1.yil} ile Değişim`], _istKarsilastirmaSatirlari(kd)),
      P(' ', { spacing: { after: 160 } }),
      P(kazasiz, { bold: true }),
      BR(),
      H('Aylık İş Kazası ve Ramak Kala Karşılaştırması'),
      resim(grafikKaza),
      resim(grafikRamak),
      BR(),
      H('Kaza Türleri ve Dağılımlar'),
      resim(dagilimGrafikleri[0]),
      resim(dagilimGrafikleri[1]),
      BR(),
      resim(dagilimGrafikleri[2]),
      resim(dagilimGrafikleri[3]),
      ...(kazaIst && kazaIst.kazalarKayipGuneSirali && kazaIst.kazalarKayipGuneSirali.length ? [
        P(' ', { spacing: { after: 120 } }),
        P('Kayıp günlü kazalar (en yüksekten en düşüğe)', { bold: true }),
        table(['Tarih', 'Tür', 'Yer', 'Kayıp Gün'], kazaIst.kazalarKayipGuneSirali.slice(0, 10).map(k => [gunAyYil(k.tarih) || '-', k.tur, k.yer || '-', String(k.kayipGun)]))
      ] : []),
      BR()
    ];
  })();

  const kapakCocuklari = [
    kapakTablosu,
    BR(),

    H('Toplantı Bilgileri'),
    bilgiTablosu,
    P(' ', { spacing: { after: 400 } }),

    // Kullanıcı isteği: ilk sayfalarda detaylı iş kazası / ramak kala istatistikleri
    // (yıllık-aylık, kaza türleri, iş günü kaybı, önceki yıllarla kıyaslama).
    ...kazaDetayElemanlari,

    H('1) Gündem'),
    ...(gundem.length ? gundem.flatMap((g, i) => {
      const satirlar = [P(`${i + 1}. ${g.baslik}${g.not ? ' — ' + g.not : ''}`)];
      if (/^olaylar/i.test(g.baslik.trim())) {
        const olaylarMetni = toplantiOlaylarGundemMetni(toplanti.id);
        if (olaylarMetni) satirlar.push(new docx.Paragraph({ indent: { left: 300 }, children: [new docx.TextRun({ text: olaylarMetni, italics: true, size: 18 })] }));
      }
      return satirlar;
    }) : [P('Gündem maddesi bulunmamaktadır.')]),
    P(' ', { spacing: { after: 600 } }),

    BR(),
    H('2) Olaylar'),
    ...(olayKartlari.length ? olayKartlari.flat() : [P(_varsayilanliMetin('', 'olaylar'))]),

    H('3) Çalışanların Görüş ve Önerileri'),
    P(_varsayilanliMetin(toplanti.calisanTemsilcisiGorusleri, 'gorusler')),
    P(' ', { spacing: { after: 400 } }),

    H('4) Bu Toplantıda Alınan Kararlar'),
    ...(yeniKartlari.length ? yeniKartlari.flat() : [P('Karar alınmamıştır.')]),
    ...(yeni.some(k => kararOyDokumMetni(k)) ? [P(KARAR_OY_DOKUM_DIPNOTU, { italics: true })] : []),

    H('5) Önceki Toplantılardan Devreden Kararlar'),
    ...(devredenKartlari.length ? devredenKartlari.flat() : [P(_varsayilanliMetin('', 'devredenKararlar'))]),
    ...(devreden.some(k => kararOyDokumMetni(k)) ? [P(KARAR_OY_DOKUM_DIPNOTU, { italics: true })] : []),
    BR(),

    H('6) Ay İçinde Yapılan Eğitimler'),
    aylikEgitimler.length ? table(['Eğitim Adı', 'Tarih', 'Katılımcı Sayısı', 'Birim'], aylikEgitimler.map(k => [k.egitimAdi, gunAyYil(k.egitimTarihi), k.katilimciSayisi, k.birim])) : P('Bu dönemde verilen eğitim bulunmamaktadır.'),
    P(' ', { spacing: { after: 400 } }),

    H('7) Ay İçi İSG Çalışmaları'),
    P(_varsayilanliMetin(toplanti.faaliyetMetni, 'ayIciCalismalar')),
    ayIciFaaliyetler.length ? table(['Faaliyet', 'Adet', 'Açıklama'], ayIciFaaliyetler.map(f => [f.faaliyet, f.adet, f.aciklama])) : P(' '),
    toplanti.metrikler ? P('Metrikler: ' + toplanti.metrikler) : P(' '),

    BR(),

    H('8) Ay İçinde Tespit Edilen Uygunsuzluklar'),
    ...(tespitKartlari.length ? tespitKartlari.flat() : [P('Bu dönemde tespit edilen uygunsuzluk bulunmamaktadır.')]),

    H('9) Ay İçinde Kapatılan Uygunsuzluklar'),
    ...(kapananKartlari.length ? kapananKartlari.flat() : [P('Bu dönemde kapatılan uygunsuzluk bulunmamaktadır.')]),
    BR(),

    ...(usTablo ? [
      H('10) Uygunsuzlukların Değerlendirmesi'),
      usTablo,
      P(' ', { spacing: { after: 200 } }),
      new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.ImageRun({ data: usVeri.grafik.veri, transformation: { width: 600, height: 300 } })] }),
      BR()
    ] : []),

    H('11) İSG Kurulları İle İlgili Yasal Düzenleme'),
    ...YONETMELIK_MADDELERI.flatMap(maddeParagraflari),
    BR(),

    H('12) İmza Listesi'),
    katilanlar.length ? table(['Sıra', 'Ad Soyad', 'Ünvan', 'İmza'], katilanlar.map(k => [k.siraNo, k.adSoyad, k.unvan, ''])) : P('Toplantıya katılan bulunmamaktadır.')
  ];

  const doc = new docx.Document({
    sections: [{
      properties: { page: { size: { orientation: docx.PageOrientation.PORTRAIT }, margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
      // Kullanıcı isteği: her sayfa "Sayfa X / Y" olarak numaralandırılsın —
      // PDF çıktısında bu zaten jsPDF son-işleme döngüsüyle var (bkz.
      // kurulRaporuPdfOlustur), Word'de docx.PageNumber alanlarıyla eklendi;
      // Word içinde otomatik güncellenir (sabit metin değil, gerçek alan).
      footers: {
        default: new docx.Footer({
          children: [new docx.Paragraph({
            alignment: docx.AlignmentType.CENTER,
            children: [new docx.TextRun({ children: ['Sayfa ', docx.PageNumber.CURRENT, ' / ', docx.PageNumber.TOTAL_PAGES], size: 16, color: '64748B' })]
          })]
        })
      },
      children: kapakCocuklari
    }]
  });

  const blob = await docx.Packer.toBlob(doc);
  saveAs(blob, `Kurul_Raporu_${toplanti.toplantiNo}.docx`);
}

function _denetimAktifFirmaAdi() {
  const firma = aktifFirmaGetir();
  return firma ? firma.ad : '';
}

// ==================== 3) KONU BAŞLIKLARI (WORD) ====================

// kararMetni "{no}/{no} - {Kısa Başlık}: {Tam Metin}" biçimindeyse kısa başlığı
// ve gövdeyi ayırır (eski üretim uygulamasından taşınan kararlarda bu biçim
// kullanılır); biçime uymayan kararlarda tüm metin başlık olur.
function _kararBasligiVeMetni(kararMetni) {
  const metin = String(kararMetni || '');
  const ikiNoktaIndex = metin.indexOf(':');
  if (ikiNoktaIndex === -1) return { baslik: metin, govde: '' };
  let baslik = metin.slice(0, ikiNoktaIndex).trim();
  const govde = metin.slice(ikiNoktaIndex + 1).trim();
  const onekEslesme = baslik.match(/^[\d.]+\/?\d*\s*-\s*(.+)$/);
  if (onekEslesme) baslik = onekEslesme[1].trim();
  return { baslik: baslik || metin, govde };
}

// notFormu=true: aynı içerik, ama her maddenin altında elle 'Alınan karar' yazmak için çizgili boşluk bırakır
// (kullanıcı isteği: Konu Başlıkları'nın aynısı, her maddenin altında karar notu alanı).
async function konuBasliklariWordOlustur(notFormu = false) {
  const toplanti = toplantiIdIleGetirRepo(_toplantiId);
  if (!toplanti) return;

  const gundem = kurulGundemSirala(toplanti.gundem || []);
  const olaylar = toplantiOlaylariniGetir(_toplantiId);
  const { devreden, yeni } = _ciktiKararVerisi(_toplantiId);

  // Kullanıcı isteği: "yazı karakterini küçült, yerden tasarruf et, boşlukları
  // değerlendir, başlıklar dışında koyu (bold) renk kullanma" — tek yerden
  // ayarlanabilen boyut/aralık sabitleri; bold sadece ana başlık ve bölüm
  // başlıklarında (bolumBasligi), madde metinlerinde kullanılmaz.
  const ANA_BASLIK_BOYUT = 26;
  const BOLUM_BASLIK_BOYUT = 20;
  const METIN_BOYUT = 17;
  const MADDE_ARASI_BOSLUK = 60;

  const baslikParagrafi = new docx.Paragraph({
    alignment: docx.AlignmentType.CENTER,
    children: [new docx.TextRun({ text: `${_ciktiDonemMetni(toplanti)} İSG KURUL TOPLANTI ${notFormu ? 'KARAR NOT FORMU' : 'KONU BAŞLIKLARI'}`, bold: true, size: ANA_BASLIK_BOYUT })],
    spacing: { after: 150 }
  });

  // Kullanıcı isteği: "mümkün mertebe yerden tasarruf et, gerekirse sayfayı
  // ikiye bölüp yap" — başlık tek sütun genişliğinde ortalanabilsin diye
  // ayrı (tek sütunlu) bir bölümde, geri kalan tüm liste ise aynı sayfada
  // (SectionType.CONTINUOUS — yeni sayfaya geçmeden) 2 sütunlu akar.
  const children = [];

  const notAlani = (satir = 3) => {
    if (!notFormu) return;
    const cizgi = { bottom: { style: docx.BorderStyle.SINGLE, size: 4, color: '94A3B8', space: 1 } };
    children.push(new docx.Paragraph({ border: cizgi, spacing: { before: 40 }, children: [new docx.TextRun({ text: 'Alınan karar:', size: 15, italics: true, color: '64748B' })] }));
    for (let i = 1; i < satir; i++) children.push(new docx.Paragraph({ border: cizgi, spacing: { before: 280 }, children: [] }));
    children.push(new docx.Paragraph({ spacing: { after: 100 }, children: [] }));
  };

  // Kullanıcı isteği: "neden D'den F'e atlıyor" — harfler artık sabit
  // yazılmıyor, yalnızca fiilen görünen (dolu) bölümlere göre otomatik
  // sırayla verilir (bkz. _okBolumHarfSayaci) — bir bölüm o toplantı için
  // boşsa (ör. Çalışan Temsilcisi Görüşü girilmemişse) hiç görünmez VE
  // harf de atlanmadan sıradaki bölüme geçer.
  let _bolumHarfSayaci = 0;
  const bolumBasligi = (baslikMetni) => {
    const harf = String.fromCharCode('A'.charCodeAt(0) + _bolumHarfSayaci++);
    children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: `${harf}) ${baslikMetni}`, bold: true, size: BOLUM_BASLIK_BOYUT })], spacing: { before: 160, after: 90 } }));
  };

  // Gündem — düz madde listesi.
  if (gundem.length) {
    bolumBasligi('GÜNDEM');
    gundem.forEach((g, i) => {
      children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: `${i + 1}. ${g.baslik}${g.not ? ' — ' + g.not : ''}`, size: METIN_BOYUT })] }));
      notAlani(3);
    });
  }

  // Olaylar — her olay için başlık satırı + varsa "Kazalı: Ad Soyad | Tür | Açıklama".
  if (olaylar.length) {
    bolumBasligi('OLAYLAR');
    olaylar.forEach((o, i) => {
      children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: `${i + 1}. ${o.tarih || '—'} – ${o.yer || '—'}`, size: METIN_BOYUT })] }));
      const detay = o.adSoyad
        ? `Kazalı: ${o.adSoyad} | ${o.tur || '-'} | ${o.olusSekli || '-'}`
        : (o.olusSekli || o.tur || '-');
      children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: detay, size: METIN_BOYUT })], spacing: { after: MADDE_ARASI_BOSLUK } }));
      notAlani(3);
    });
  }

  // (Sıra: Olaylardan hemen sonra — kullanıcı isteği.) Kullanıcı isteği: "çalışan temsilcisi görüşü girilmemiş olsa da başlığı
  // yaz mutlaka" — diğer bölümlerin aksine bu başlık boş olsa da HER ZAMAN
  // görünür (girilmemişse "-" yazılır).
  bolumBasligi('ÇALIŞANLARIN GÖRÜŞ VE ÖNERİLERİ');
  children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: (toplanti.calisanTemsilcisiGorusleri || '').trim() || '-', size: METIN_BOYUT })], spacing: { after: MADDE_ARASI_BOSLUK } }));
  notAlani(5);

  // Kararlar — kısa başlık + tam metin + varsa Aksiyon + Sorumlu/Durum/Termin.
  const kararBolumuEkle = (baslikMetni, kararlar) => {
    if (!kararlar.length) return;
    bolumBasligi(baslikMetni);
    kararlar.forEach((k, i) => {
      const { baslik: kBaslik, govde } = _kararBasligiVeMetni(k.kararMetni);
      children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: `${i + 1}. ${kBaslik}`, size: METIN_BOYUT })] }));
      if (govde) children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: govde, size: METIN_BOYUT })] }));
      if (k.aksiyonNotu) children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: `Aksiyon: ${k.aksiyonNotu}`, size: METIN_BOYUT })] }));
      children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: `Sorumlu: ${k.sorumlu || '-'}`, size: METIN_BOYUT })] }));
      children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: `Durum: ${k.durumGoruntu || k.durum || '-'}`, size: METIN_BOYUT })] }));
      children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: `Termin: ${gunAyYil(k.termin) || '-'}`, size: METIN_BOYUT })], spacing: { after: MADDE_ARASI_BOSLUK } }));
      notAlani(3);
    });
  };

  kararBolumuEkle('BU TOPLANTIDA GÖRÜŞÜLECEK KONULAR', yeni);
  kararBolumuEkle('ÖNCEKİ TOPLANTIDAN DEVREDEN KARARLAR', devreden);

  // Kullanıcı isteği: Kararlar (C/D) gibi Uygunsuzluklar da tek birleşik
  // bölüm yerine, Kapatılan / Yeni Açılan diye AYRI iki bölüm olsun.
  const tespitEdilenUygunsuzluklar = toplantiTespitEdilenUygunsuzluklariGetir(toplanti);
  const kapananUygunsuzluklar = toplantiKapananUygunsuzluklariGetir(toplanti);

  if (kapananUygunsuzluklar.length) {
    bolumBasligi('KAPATILAN UYGUNSUZLUKLAR');
    kapananUygunsuzluklar.forEach((k, i) => {
      children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: `${i + 1}. [Kapanış ${gunAyYil(k.kapanisTarihi) || '-'}] ${k.konuBasligi}`, size: METIN_BOYUT })] }));
      children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: `Alınan Önlem: ${k.alinanOnlem || '-'}`, size: METIN_BOYUT })], spacing: { after: MADDE_ARASI_BOSLUK } }));
      notAlani(2);
    });
  }

  if (tespitEdilenUygunsuzluklar.length) {
    bolumBasligi('YENİ AÇILAN UYGUNSUZLUKLAR');
    tespitEdilenUygunsuzluklar.forEach((k, i) => {
      children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: `${i + 1}. [Tespit ${gunAyYil(k.tespitTarihi) || '-'}] ${k.konuBasligi}`, size: METIN_BOYUT })] }));
      children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: `${k.uygunsuzluk || '-'} | Bölüm: ${k.bolum || '-'} | Durum: ${k.durum || '-'}`, size: METIN_BOYUT })], spacing: { after: MADDE_ARASI_BOSLUK } }));
      notAlani(2);
    });
  }

  // Uygunsuzlukların değerlendirmesi: yıl içinde açılan / kapatılan / tamamlama oranı.
  const usIstKb = toplantiUygunsuzlukIstatistikleriHesapla(toplanti);
  if (usIstKb) {
    bolumBasligi('UYGUNSUZLUKLARIN DEĞERLENDİRMESİ');
    const oranKb = usIstKb.tamamlamaOrani == null ? '-' : '%' + usIstKb.tamamlamaOrani.toFixed(1).replace('.', ',');
    [
      `${usIstKb.yil} yılında açılan uygunsuzluk: ${usIstKb.acilan}`,
      `Bunlardan kapatılan (yapılan): ${usIstKb.kapatilan}`,
      `Hâlen açık: ${usIstKb.acik}`,
      `Tamamlama oranı: ${oranKb}`
    ].forEach(satir => children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: satir, size: METIN_BOYUT })] })));
    notAlani(3);
  }

  if (notFormu) {
    bolumBasligi('DİLEK VE TEMENNİLER / DİĞER KONULAR');
    notAlani(6);
  }

  const darKenar = { top: 720, right: 560, bottom: 720, left: 560 };
  const doc = new docx.Document({
    sections: [
      { properties: { page: { margin: darKenar } }, children: [baslikParagrafi] },
      { properties: { type: docx.SectionType.CONTINUOUS, page: { margin: darKenar }, column: { count: notFormu ? 1 : 2, space: 360 } }, children }
    ]
  });
  const blob = await docx.Packer.toBlob(doc);
  saveAs(blob, `${notFormu ? 'Kurul_Karar_Not_Formu' : 'Konu_Basliklari'}_${toplanti.toplantiNo}.docx`);
}

// ==================== 4) KURUL RAPORU (PDF) ====================

// html2canvas tabanlı PDF üretimi bir tablonun <thead>'ini her sayfada
// otomatik tekrar edemez (bkz. uygunsuzluk/cikti.js'teki aynı gerekçe) — bu
// yüzden uzun tablolar (ör. imza listesi) sabit boyutlu gruplara bölünüp HER
// GRUP KENDİ <thead>'İYLE ayrı bir <table> olarak, aralarında zorla sayfa
// kırılımıyla basılır.
const PDF_TABLO_SAYFA_BASINA_SATIR = 20;

function _pdfTablo(basliklar, satirlar, ekSinif, genislikler) {
  if (!satirlar.length) return '<p class="empty">Kayıt bulunmamaktadır.</p>';
  const colgroup = genislikler ? `<colgroup>${genislikler.map(w => `<col style="width:${w}%">`).join('')}</colgroup>` : '';
  const thead = `<thead><tr>${basliklar.map(h => `<th>${_ciktiKacir(h)}</th>`).join('')}</tr></thead>`;

  const parcalar = [];
  for (let i = 0; i < satirlar.length; i += PDF_TABLO_SAYFA_BASINA_SATIR) parcalar.push(satirlar.slice(i, i + PDF_TABLO_SAYFA_BASINA_SATIR));

  return parcalar.map((parca, i) => `
    <table class="pdf-table${ekSinif ? ' ' + ekSinif : ''}" style="${i === parcalar.length - 1 ? '' : 'page-break-after:always;'}">
      ${colgroup}
      ${thead}
      <tbody>${parca.map(r => `<tr>${r.map(c => `<td>${_ciktiKacir(c ?? '-')}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>
  `).join('');
}

// Gündem/olay maddesi için "info-card": eski üretim uygulamasındaki başlıklı kutu görünümü.
function _pdfInfoCardTek(no, baslik, icerik) {
  return `
    <div class="info-card">
      <div class="info-head"><div>${_ciktiKacir(no)}</div><div>${_ciktiKacir(baslik)}</div></div>
      <div class="info-content">${_ciktiKacir(icerik || '-')}</div>
    </div>`;
}

function _pdfInfoCardGrid(no, baslik, alanlar) {
  return `
    <div class="info-card">
      <div class="info-head"><div>${_ciktiKacir(no)}</div><div>${_ciktiKacir(baslik)}</div></div>
      <div class="info-grid">${alanlar.map(([e, d]) => `<div><b>${_ciktiKacir(e)}</b><span>${_ciktiKacir(d || '-')}</span></div>`).join('')}</div>
    </div>`;
}

// Karar kartı: eski üretim uygulamasındaki "decision-card" görünümü; varsa
// kararın ilk fotoğrafı (öncesi/sonrası/ek sırasıyla) küçük resim olarak eklenir.
function _pdfKararFotograflari(k) {
  const parcalar = [];
  if (k.fotoOncesi) parcalar.push({ url: k.fotoOncesi, etiket: 'Öncesi' });
  if (k.fotoSonrasi) parcalar.push({ url: k.fotoSonrasi, etiket: 'Sonrası' });
  (k.fotografEk || []).forEach((f, i) => { if (f && f.url) parcalar.push({ url: f.url, etiket: 'Ek ' + (i + 1) }); });
  return parcalar;
}

async function _pdfKararlariFotoCoz(kararlar) {
  return Promise.all(kararlar.map(async k => {
    const [fotoOncesi, fotoSonrasi, fotografEk] = await Promise.all([
      fotoBuyukCoz(k.fotoOncesi),
      fotoBuyukCoz(k.fotoSonrasi),
      Promise.all((k.fotografEk || []).map(async f => Object.assign({}, f, { url: await fotoBuyukCoz(f.url) })))
    ]);
    return Object.assign({}, k, { fotoOncesi, fotoSonrasi, fotografEk });
  }));
}

// Uygunsuzluk kartı: eski üretim uygulamasındaki "nc-card"/"nc-photos"
// görünümü (satır ~5979) — konu/tarih/sorumlu bilgisi solda, öncesi/sonrası
// fotoğrafları sağda. Karar kartından farklı olarak öncelik/durum yerine
// tespit/kapanış tarihi ve alınan önlem gösterilir.
async function _pdfUygunsuzluklariFotoCoz(liste) {
  return Promise.all(liste.map(async k => Object.assign({}, k, {
    fotoOncesi: await fotoBuyukCoz(k.fotoOncesi),
    fotoSonrasi: await fotoBuyukCoz(k.fotoSonrasi)
  })));
}

// Olaylar bölümündeki "otomatik" (Olay/Kaza modülünden çekilen) satırların
// "Olay Yeri Fotoğrafları" alanını çözer — manuel eklenen kurul olayları bu
// alana hiç sahip olmadığından ([] gelir) etkilenmez.
async function _pdfOlaylarFotoCoz(olaylar) {
  return Promise.all(olaylar.map(async o => Object.assign({}, o, {
    fotograflar: await Promise.all((o.fotograflar || []).map(async f => Object.assign({}, f, { url: await fotoBuyukCoz(f.url) })))
  })));
}

// Olaylar kartına, varsa Olay/Kaza modülünden gelen fotoğrafları ekler (karar/
// uygunsuzluk kartlarındaki "decision-photo" ile aynı görünüm).
// Olayın Karar Metni/Sorumlu/Termin/Öncelik/Durum/Oy alanları doluysa, karar
// kartlarındaki "decision-action" satırlarıyla aynı görünümde eklenir (bkz.
// _wordOlayKararTakibiSatirlari — Word karşılığı).
function _pdfOlayKararTakibiBlogu(o) {
  if (!(o.kararMetni || o.sorumlu || o.termin)) return '';
  const parcalar = [];
  if (o.kararMetni) parcalar.push(`<div class="decision-text">${_ciktiKacir(o.kararMetni)}</div>`);
  parcalar.push(`
    <div class="decision-meta">
      <div><b>Sorumlu</b><span>${_ciktiKacir(o.sorumlu)}</span></div>
      <div><b>Termin</b><span>${_ciktiKacir(gunAyYil(o.termin))}</span></div>
      <div><b>Öncelik</b><span>${_ciktiKacir(o.oncelik)}</span></div>
      <div><b>Durum</b><span>${_ciktiKacir(o.durum)}</span></div>
    </div>`);
  const oyDokumu = kararOyDokumMetni(o);
  if (o.oySonucu || oyDokumu) {
    parcalar.push(`<div class="decision-action"><b>Oy Sonucu</b><span>${_ciktiKacir([[o.oy, o.oySonucu].filter(Boolean).join(' — '), oyDokumu && `(${oyDokumu})`].filter(Boolean).join('  '))}</span></div>`);
  }
  return parcalar.join('');
}

function _pdfOlayFotoBlogu(o) {
  const gecerli = (o.fotograflar || []).filter(f => f && f.url);
  if (!gecerli.length) return '';
  return `<div class="decision-photo">${gecerli.map((f, i) => `<span style="display:inline-block; margin:0 4mm 2mm 0; text-align:center;"><img src="${f.url}"><br><small>Olay Yeri ${i + 1}</small></span>`).join('')}</div>`;
}

function _pdfUygunsuzlukKarti(k) {
  const fotograflar = [];
  if (k.fotoOncesi) fotograflar.push({ url: k.fotoOncesi, etiket: 'Öncesi' });
  if (k.fotoSonrasi) fotograflar.push({ url: k.fotoSonrasi, etiket: 'Sonrası' });
  return `
    <div class="decision-card">
      <div class="decision-head"><div class="decision-no">${_ciktiKacir(k.bolum || '-')}</div><div class="decision-title">${_ciktiKacir(k.konuBasligi || '')}</div></div>
      <div class="decision-text">${_ciktiKacir(k.uygunsuzluk)}</div>
      <div class="decision-meta">
        <div><b>Tespit</b><span>${_ciktiKacir(gunAyYil(k.tespitTarihi))}</span></div>
        <div><b>Kapanış</b><span>${_ciktiKacir(gunAyYil(k.kapanisTarihi))}</span></div>
        <div><b>Sorumlu</b><span>${_ciktiKacir(k.sorumlu)}</span></div>
        <div><b>Durum</b><span>${_ciktiKacir(k.durum)}</span></div>
      </div>
      ${k.alinanOnlem ? `<div class="decision-action"><b>Alınan Önlem</b><span>${_ciktiKacir(k.alinanOnlem)}</span></div>` : ''}
      ${fotograflar.length ? `<div class="decision-photo">${fotograflar.map(f => `<span style="display:inline-block; margin:0 4mm 2mm 0; text-align:center;"><img src="${f.url}"><br><small>${_ciktiKacir(f.etiket)}</small></span>`).join('')}</div>` : ''}
    </div>`;
}

function _pdfKararKarti(k) {
  const fotograflar = _pdfKararFotograflari(k);
  return `
    <div class="decision-card">
      <div class="decision-head"><div class="decision-no">${_ciktiKacir(k.kararNo)}</div><div class="decision-title">${_ciktiKacir(k.kaynakGundem || '')}</div></div>
      <div class="decision-text">${_ciktiKacir(k.kararMetni)}</div>
      <div class="decision-meta">
        <div><b>Sorumlu</b><span>${_ciktiKacir(k.sorumlu)}</span></div>
        <div><b>Termin</b><span>${_ciktiKacir(gunAyYil(k.termin))}</span></div>
        <div><b>Öncelik</b><span>${_ciktiKacir(k.oncelik)}</span></div>
        <div><b>Durum</b><span>${_ciktiKacir(k.durumGoruntu || k.durum)}</span></div>
      </div>
      ${k.aksiyonNotu ? `<div class="decision-action"><b>Aksiyon</b><span>${_ciktiKacir(k.aksiyonNotu)}</span></div>` : ''}
      ${(k.oySonucu || kararOyDokumMetni(k)) ? `<div class="decision-action"><b>Oy Sonucu</b><span>${_ciktiKacir([[k.oy, k.oySonucu].filter(Boolean).join(' — '), kararOyDokumMetni(k) && `(${kararOyDokumMetni(k)})`].filter(Boolean).join('  '))}</span></div>` : ''}
      ${(k.kanit || k.kapanisTarihi) ? `<div class="decision-action"><b>Kapanış / Kanıt</b><span>${_ciktiKacir([gunAyYil(k.kapanisTarihi), k.kanit].filter(Boolean).join(' / '))}</span></div>` : ''}
      ${fotograflar.length ? `<div class="decision-photo">${fotograflar.map(f => `<span style="display:inline-block; margin:0 4mm 2mm 0; text-align:center;"><img src="${f.url}"><br><small>${_ciktiKacir(f.etiket)}</small></span>`).join('')}</div>` : ''}
    </div>`;
}

async function kurulRaporuPdfOlustur() {
  const toplanti = toplantiIdIleGetirRepo(_toplantiId);
  if (!toplanti) return;

  const gundem = kurulGundemSirala(toplanti.gundem || []);
  const olaylarHam = toplantiOlaylariniGetir(_toplantiId);
  const { devreden: devredenHam, yeni: yeniHam } = _ciktiKararVerisi(_toplantiId);
  if (!(await _oyEksikKontrolVeUyar(yeniHam, devredenHam))) return;
  const tespitEdilenUygunsuzluklarHam = toplantiTespitEdilenUygunsuzluklariGetir(toplanti);
  const kapananUygunsuzluklarHam = toplantiKapananUygunsuzluklariGetir(toplanti);
  const aylikEgitimler = toplantiAylikEgitimleriGetir(toplanti);
  const ayIciFaaliyetler = toplantiAyIciFaaliyetleriniGetir(_toplantiId);
  const imzalar = toplantiImzalariniGetir(_toplantiId);
  const katilanlar = imzalar.filter(i => i.katildiMi);
  const bsPdf = toplantiBaskanSekreterGetir(_toplantiId);
  const firma = aktifFirmaGetir();
  const [logoUrl, devreden, yeni, tespitEdilenUygunsuzluklar, kapananUygunsuzluklar, olaylar] = await Promise.all([
    fotoBuyukCoz(firma ? firmaLogoGetir(firma.id) : ''),
    _pdfKararlariFotoCoz(devredenHam),
    _pdfKararlariFotoCoz(yeniHam),
    _pdfUygunsuzluklariFotoCoz(tespitEdilenUygunsuzluklarHam),
    _pdfUygunsuzluklariFotoCoz(kapananUygunsuzluklarHam),
    _pdfOlaylarFotoCoz(olaylarHam)
  ]);

  const html = `
  <div id="kurulPdfReport">
    <style>
      #kurulPdfReport{ font-family: Arial, Helvetica, sans-serif; color:#111827; background:#fff; font-size:9.5pt; line-height:1.32; box-sizing:border-box; width:100%; max-width:194mm; overflow:hidden; }
      #kurulPdfReport *{ box-sizing:border-box; }

      #kurulPdfReport .cover{ min-height:250mm; position:relative; padding:28mm 22mm; text-align:center; page-break-after:always; background:#fff; overflow:hidden; }
      #kurulPdfReport .cover-logo{ display:block; margin:0 auto 8mm; max-width:34mm; max-height:34mm; object-fit:contain; }
      #kurulPdfReport .cover-brand{ text-align:center; }
      #kurulPdfReport .cover-brand .company{ font-size:18pt; font-weight:800; color:#111827; line-height:1.25; letter-spacing:.2px; }
      #kurulPdfReport .cover-brand .dept{ margin-top:3mm; font-size:11pt; color:#64748b; letter-spacing:.5px; text-transform:uppercase; }
      #kurulPdfReport .cover-main{ margin-top:42mm; }
      #kurulPdfReport .cover-main h1{ font-size:26pt; font-weight:800; color:#111827; line-height:1.25; margin:0; }
      #kurulPdfReport .period{ margin-top:14mm; font-size:15pt; font-weight:700; color:#111827; letter-spacing:.4px; }
      #kurulPdfReport .cover-law{ position:absolute; left:24mm; right:24mm; bottom:24mm; border-top:1px solid #d1d5db; padding-top:5mm; text-align:center; font-size:8.8pt; color:#4b5563; line-height:1.45; }
      #kurulPdfReport .cover-law div{ margin:1mm 0; }

      #kurulPdfReport .body{ width:100%; padding:9mm 7mm; overflow:hidden; }
      #kurulPdfReport .section{ margin:0 0 9mm; }
      #kurulPdfReport .section.keep{ page-break-inside:avoid; }
      #kurulPdfReport .page-break{ page-break-before:always; break-before:page; }
      #kurulPdfReport .signature-section{ page-break-before:always; break-before:page; }
      #kurulPdfReport h2{ font-size:14pt; color:#111827; border-bottom:2px solid #111827; padding-bottom:4px; margin:0 0 5mm; }
      #kurulPdfReport .gundem-satir{ margin:0 0 2mm; padding:0; font-size:9.5pt; color:#111827; line-height:1.4; }

      #kurulPdfReport table.pdf-table{ width:100%; max-width:100%; border-collapse:collapse; table-layout:fixed; margin-bottom:4mm; }
      #kurulPdfReport th{ background:#e5e7eb; color:#111827; font-weight:700; border:1px solid #94a3b8; padding:4px 5px; font-size:8.2pt; line-height:1.2; overflow-wrap:anywhere; white-space:normal; }
      #kurulPdfReport td{ border:1px solid #cbd5e1; padding:4px 5px; vertical-align:top; overflow-wrap:anywhere; white-space:normal; font-size:9pt; }
      #kurulPdfReport tr{ page-break-inside:avoid; }
      #kurulPdfReport thead{ display:table-header-group; }

      #kurulPdfReport .meeting-info{ width:100%; border:1px solid #dbe3ef; padding:6mm 7mm; margin-bottom:8mm; page-break-inside:avoid; }
      #kurulPdfReport .meeting-row{ display:flex; gap:6mm; padding:1.5mm 0; font-size:9.5pt; }
      #kurulPdfReport .meeting-row b{ width:38mm; flex:0 0 38mm; color:#111827; }

      #kurulPdfReport .note, #kurulPdfReport .empty{ color:#475569; font-style:italic; }
      #kurulPdfReport p{ page-break-inside:avoid; break-inside:avoid; orphans:3; widows:3; }
      #kurulPdfReport h2{ page-break-after:avoid; break-after:avoid; page-break-inside:avoid; break-inside:avoid; }
      #kurulPdfReport li{ page-break-inside:avoid; break-inside:avoid; }

      #kurulPdfReport .info-card{ page-break-inside:avoid; border:1px solid #cbd5e1; margin:0 0 3.5mm; width:100%; }
      #kurulPdfReport .info-head{ display:grid; grid-template-columns:20mm 1fr; background:#e5e7eb; color:#111827; font-weight:700; }
      #kurulPdfReport .info-head div{ padding:5px 6px; overflow-wrap:anywhere; }
      #kurulPdfReport .info-head div:first-child{ border-right:1px solid #94a3b8; }
      #kurulPdfReport .info-content{ padding:7px 8px; line-height:1.42; min-height:9mm; overflow-wrap:anywhere; white-space:normal; }
      #kurulPdfReport .info-grid{ display:grid; grid-template-columns:1fr 1fr; }
      #kurulPdfReport .info-grid div{ border-top:1px solid #cbd5e1; min-height:9mm; padding:5px 6px; overflow-wrap:anywhere; }
      #kurulPdfReport .info-grid div:nth-child(odd){ border-right:1px solid #cbd5e1; }
      #kurulPdfReport .info-card b{ display:block; font-size:8pt; margin-bottom:2px; }
      #kurulPdfReport .info-grid b{ color:#111827; }

      #kurulPdfReport .decision-card{ page-break-inside:avoid; border:1px solid #cbd5e1; margin:0 0 4mm; width:100%; }
      #kurulPdfReport .decision-head{ display:grid; grid-template-columns:24mm 1fr; background:#e5e7eb; color:#111827; font-weight:700; }
      #kurulPdfReport .decision-no, #kurulPdfReport .decision-title{ padding:5px 6px; overflow-wrap:anywhere; }
      #kurulPdfReport .decision-no{ border-right:1px solid #94a3b8; }
      #kurulPdfReport .decision-text{ padding:6px; border-bottom:1px solid #cbd5e1; min-height:10mm; overflow-wrap:anywhere; }
      #kurulPdfReport .decision-meta{ display:grid; grid-template-columns:25% 25% 25% 25%; }
      #kurulPdfReport .decision-meta div{ border-right:1px solid #cbd5e1; border-top:1px solid #cbd5e1; padding:5px 6px; min-height:10mm; overflow-wrap:anywhere; }
      #kurulPdfReport .decision-meta div:last-child{ border-right:0; }
      #kurulPdfReport .decision-meta b, #kurulPdfReport .decision-action b{ display:block; color:#111827; font-size:8pt; margin-bottom:2px; }
      #kurulPdfReport .decision-action{ border-top:1px solid #cbd5e1; padding:5px 6px; overflow-wrap:anywhere; }
      #kurulPdfReport .decision-photo{ border-top:1px solid #cbd5e1; padding:5px 6px; display:flex; flex-wrap:wrap; gap:3mm; }
      #kurulPdfReport .decision-photo img{ max-width:28mm; max-height:28mm; object-fit:cover; border:1px solid #cbd5e1; }
      #kurulPdfReport .decision-photo small{ font-size:7pt; color:#64748b; }

      #kurulPdfReport .sign-table td{ height:12mm; vertical-align:middle; font-size:8.3pt; }
      #kurulPdfReport .sign-table th{ vertical-align:middle; }
    </style>

    <div class="cover">
      <div class="cover-brand">
        ${logoUrl ? `<img class="cover-logo" src="${logoUrl}">` : ''}
        <div class="company">${_ciktiKacir(_denetimAktifFirmaAdi())}</div>
        <div class="dept">İş Sağlığı ve Güvenliği Kurulu</div>
      </div>
      <div class="cover-main">
        <h1>İSG KURULU<br>TOPLANTI RAPORU</h1>
        <div class="period">${_ciktiKacir(_ciktiDonemMetni(toplanti))}</div>
      </div>
      <div class="cover-law">
        <div><b>6331 Sayılı İş Sağlığı ve Güvenliği Kanunu</b></div>
        <div><b>İş Sağlığı ve Güvenliği Kurulu</b></div>
        <div><b>MADDE 22</b> – Elli ve daha fazla çalışanın bulunduğu işyerlerinde işveren, iş sağlığı ve güvenliği kurulu oluşturur.</div>
        <div><b>İSG Kurulları Hakkında Yönetmelik (Madde 4)</b></div>
      </div>
    </div>

    <div class="body">
      <div class="section keep">
        <h2>Toplantı Bilgileri</h2>
        <div class="meeting-info">
          <div class="meeting-row"><b>Toplantı No</b><span>${_ciktiKacir(toplanti.toplantiNo)}</span></div>
          <div class="meeting-row"><b>Tarih / Saat</b><span>${_ciktiKacir(_ciktiTarihSaat(toplanti))}</span></div>
          <div class="meeting-row"><b>Yer</b><span>${_ciktiKacir(toplanti.yer)}</span></div>
          <div class="meeting-row"><b>Kurul Başkanı</b><span>${_ciktiKacir(bsPdf.baskan)}</span></div>
          <div class="meeting-row"><b>Kurul Sekreteri</b><span>${_ciktiKacir(bsPdf.yazman)}</span></div>
          <div class="meeting-row"><b>Katılımcı Sayısı</b><span>${katilanlar.length || '-'}</span></div>
        </div>
      </div>

      <div class="section">
        <h2>1) Gündem</h2>
        ${gundem.length ? gundem.map((g, i) => {
          const olaylarMetni = /^olaylar/i.test(g.baslik.trim()) ? toplantiOlaylarGundemMetni(toplanti.id) : '';
          return `<p class="gundem-satir">${i + 1}. ${_ciktiKacir(g.baslik)}${g.not ? ' — ' + _ciktiKacir(g.not) : ''}</p>` +
            (olaylarMetni ? `<p class="gundem-satir" style="margin-left:6mm; font-style:italic; color:#475569;">${_ciktiKacir(olaylarMetni)}</p>` : '');
        }).join('') : '<p class="empty">Gündem maddesi bulunmamaktadır.</p>'}
      </div>

      <div class="section">
        <div class="page-break"></div>
        <h2>2) Olaylar</h2>
        ${olaylar.length ? olaylar.map(o => _pdfInfoCardGrid(o.tur, gunAyYil(o.tarih), [['Yer', o.yer], ['Birim', o.birim], ['Oluş Şekli', o.olusSekli], ['Kök Neden', o.kokNeden], ['İş Günü Kaybı', o.isGunuKaybi]]) + _pdfOlayKararTakibiBlogu(o) + _pdfOlayFotoBlogu(o)).join('') : `<p class="empty">${_ciktiKacir(_varsayilanliMetin('', 'olaylar'))}</p>`}
      </div>

      <div class="section keep">
        <h2>3) Çalışanların Görüş ve Önerileri</h2>
        <p>${_ciktiKacir(_varsayilanliMetin(toplanti.calisanTemsilcisiGorusleri, 'gorusler'))}</p>
      </div>

      <div class="section">
        <h2>4) Bu Toplantıda Alınan Kararlar</h2>
        ${yeni.length ? yeni.map(_pdfKararKarti).join('') : '<p class="empty">Karar bulunmamaktadır.</p>'}
        ${yeni.some(k => kararOyDokumMetni(k)) ? `<p class="note">${_ciktiKacir(KARAR_OY_DOKUM_DIPNOTU)}</p>` : ''}
      </div>

      <div class="section">
        <h2>5) Önceki Toplantılardan Devreden Kararlar</h2>
        ${devreden.length ? devreden.map(_pdfKararKarti).join('') : `<p class="empty">${_ciktiKacir(_varsayilanliMetin('', 'devredenKararlar'))}</p>`}
        ${devreden.some(k => kararOyDokumMetni(k)) ? `<p class="note">${_ciktiKacir(KARAR_OY_DOKUM_DIPNOTU)}</p>` : ''}
      </div>

      <div class="section">
        <h2>6) Ay İçinde Yapılan Eğitimler</h2>
        ${_pdfTablo(['Eğitim Adı', 'Tarih', 'Katılımcı Sayısı', 'Birim'], aylikEgitimler.map(k => [k.egitimAdi, gunAyYil(k.egitimTarihi), k.katilimciSayisi, k.birim]))}
      </div>

      <div class="section">
        <h2>7) Ay İçi İSG Çalışmaları</h2>
        <p>${_ciktiKacir(_varsayilanliMetin(toplanti.faaliyetMetni, 'ayIciCalismalar'))}</p>
        ${ayIciFaaliyetler.length ? _pdfTablo(['Faaliyet', 'Adet', 'Açıklama'], ayIciFaaliyetler.map(f => [f.faaliyet, f.adet, f.aciklama])) : ''}
        ${toplanti.metrikler ? `<p><b>Metrikler:</b> ${_ciktiKacir(toplanti.metrikler)}</p>` : ''}
      </div>

      <div class="section">
        <h2>8) Ay İçinde Tespit Edilen Uygunsuzluklar</h2>
        ${tespitEdilenUygunsuzluklar.length ? tespitEdilenUygunsuzluklar.map(_pdfUygunsuzlukKarti).join('') : '<p class="empty">Bu dönemde tespit edilen uygunsuzluk bulunmamaktadır.</p>'}
      </div>

      <div class="section">
        <h2>9) Ay İçinde Kapatılan Uygunsuzluklar</h2>
        ${kapananUygunsuzluklar.length ? kapananUygunsuzluklar.map(_pdfUygunsuzlukKarti).join('') : '<p class="empty">Bu dönemde kapatılan uygunsuzluk bulunmamaktadır.</p>'}
      </div>

      ${(() => {
        const v = _uygunsuzlukDegerlendirmeVerisi(toplanti);
        if (!v) return '';
        return `<div class="section keep">
        <h2>10) Uygunsuzlukların Değerlendirmesi</h2>
        ${_pdfTablo(['Gösterge', 'Değer'], [
          [`${v.ist.yil} Yılında Açılan Uygunsuzluk`, String(v.ist.acilan)],
          ['Bunlardan Kapatılan (Yapılan)', String(v.ist.kapatilan)],
          ['Hâlen Açık', String(v.ist.acik)],
          ['Tamamlama Oranı', v.oran]
        ])}
        <img src="${v.grafik.dataUrl}" style="width:100%; max-width:170mm; display:block; margin:4mm auto 0;">
      </div>`;
      })()}

      <div class="section">
        <h2>11) İSG Kurulları İle İlgili Yasal Düzenleme</h2>
        ${_yonetmelikMaddeleriGoruntuUret()}
      </div>

      <div class="section signature-section">
        <h2>12) İmza Listesi</h2>
        ${_pdfTablo(['Sıra', 'Ad Soyad', 'Ünvan', 'İmza'], katilanlar.map(k => [k.siraNo, k.adSoyad, k.unvan, '']), 'sign-table', [6, 22, 47, 25])}
      </div>
    </div>
  </div>`;

  const mount = document.getElementById('yazdirmaAlani');
  mount.innerHTML = html;
  mount.style.display = 'block';

  const worker = html2pdf()
    .set({
      margin: [7, 7, 10, 7],
      filename: `Kurul_Raporu_${toplanti.toplantiNo}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollX: 0, scrollY: 0 },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4', compress: true },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.decision-card', '.info-card', '.meeting-info', 'p', 'h2', 'li'] }
    })
    .from(mount)
    .toPdf();

  const pdf = await worker.get('pdf');
  const totalPages = pdf.internal.getNumberOfPages();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(100);
    pdf.text(`Sayfa ${i} / ${totalPages}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
  }
  await worker.save();

  mount.innerHTML = '';
  mount.style.display = 'none';
}

// ==================== 5) PPTX OLUŞTUR ====================

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
async function pptxOlustur() {
  const toplanti = toplantiIdIleGetirRepo(_toplantiId);
  if (!toplanti) return;

  const gundem = kurulGundemSirala(toplanti.gundem || []);
  const olaylarHam = toplantiOlaylariniGetir(_toplantiId);
  const { devreden: devredenHam, yeni: yeniHam } = _ciktiKararVerisi(_toplantiId);
  if (!(await _oyEksikKontrolVeUyar(yeniHam, devredenHam))) return;
  const tespitEdilenUygunsuzluklarHam = toplantiTespitEdilenUygunsuzluklariGetir(toplanti);
  const kapananUygunsuzluklarHam = toplantiKapananUygunsuzluklariGetir(toplanti);
  const aylikEgitimler = toplantiAylikEgitimleriGetir(toplanti);
  const ayIciFaaliyetler = toplantiAyIciFaaliyetleriniGetir(_toplantiId);
  const firma = aktifFirmaGetir();
  // Kullanıcı isteği: "ay içinde tespit edilen uygunsuzluklar kapatılan
  // uygunsuzluklar pptx de fotoları da olsun" — PDF/Word'de zaten kullanılan
  // öncesi/sonrası foto çözücü (bkz. _pdfUygunsuzluklariFotoCoz) burada da
  // kullanılıp tam ekran foto slaytları eklenir.
  const [devreden, yeni, olaylar, tespitEdilenUygunsuzluklar, kapananUygunsuzluklar, logoUrl] = await Promise.all([
    _pdfKararlariFotoCoz(devredenHam),
    _pdfKararlariFotoCoz(yeniHam),
    _pdfOlaylarFotoCoz(olaylarHam),
    _pdfUygunsuzluklariFotoCoz(tespitEdilenUygunsuzluklarHam),
    _pdfUygunsuzluklariFotoCoz(kapananUygunsuzluklarHam),
    fotoBuyukCoz(firma ? firmaLogoGetir(firma.id) : '')
  ]);
  await fotoOlculeriniHazirla(devreden, yeni, olaylar, tespitEdilenUygunsuzluklar, kapananUygunsuzluklar, logoUrl);

  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';

  // ---- Kurumsal tasarım sistemi (kullanıcı isteği: "daha modern ve etkin",
  // "bütün müdürlerin olduğu toplantıda kullanıyorum" -- yönetim kurulu
  // sunumu görünümü olsun). Veri/sıra AYNI kaldı, sadece görsel tasarım
  // baştan yapıldı: tutarlı üst/alt şerit + sayfa no taşıyan bir slayt
  // master'ı, durum/öncelik renk kodlu rozetler, kart görünümlü metin/foto
  // slaytları, bölüm ara slaytları ve gerçek "fotoğraf çekiştirilmesin"
  // isteği için HER görselde sizing:contain (en-boy oranı bozulmadan,
  // kutuya sığdırılarak yerleştirilir).
  const R = { bg: 'F1F5F9', kart: 'FFFFFF', baslik: '0F172A', soluk: '64748B', cizgi: 'E2E8F0', birincil: '1D4ED8', birincilKoyu: '15316B', birincilAcik: 'DBEAFE' };
  const DURUM_RENK = {
    'Açık': { fg: 'B45309', bg: 'FEF3C7' },
    'Devam Ediyor': { fg: '1D4ED8', bg: 'DBEAFE' },
    'Onay Bekliyor': { fg: '7C3AED', bg: 'EDE9FE' },
    'Kapalı': { fg: '15803D', bg: 'DCFCE7' },
    'Tamamlandı': { fg: '15803D', bg: 'DCFCE7' },
    'İptal': { fg: '64748B', bg: 'E2E8F0' }
  };
  const ONCELIK_RENK = {
    'Düşük': { fg: '15803D', bg: 'DCFCE7' },
    'Normal': { fg: '1D4ED8', bg: 'DBEAFE' },
    'Yüksek': { fg: 'B45309', bg: 'FEF3C7' },
    'Acil': { fg: 'B91C1C', bg: 'FEE2E2' }
  };
  const _renkGetir = (harita, deger) => harita[deger] || { fg: R.soluk, bg: R.cizgi };
  const M = 0.55;
  const SW = 13.33, SH = 7.5;

  // ---- Slayt master'ı: tüm içerik slaytlarında tekrar eden üst/alt şerit,
  // firma adı, dönem ve otomatik sayfa numarası (sayfa başına elle yazmak
  // yerine pptxgenjs'in slideNumber alanı kullanılır, tutarlı ve otomatik).
  const MASTER = 'ISG_MASTER';
  const masterNesneleri = [
    { rect: { x: 0, y: 0, w: '100%', h: 0.09, fill: { color: R.birincil } } },
    { rect: { x: 0, y: SH - 0.4, w: '100%', h: 0.4, fill: { color: R.baslik } } },
    { text: { text: _denetimAktifFirmaAdi(), options: { x: 0.4, y: SH - 0.4, w: 7.5, h: 0.4, fontSize: 10, color: 'CBD5E1', valign: 'middle', fontFace: 'Calibri' } } },
    { text: { text: 'İSG Kurul Toplantısı  ·  ' + _ciktiDonemMetni(toplanti), options: { x: 7.6, y: SH - 0.4, w: 5.2, h: 0.4, fontSize: 10, color: 'CBD5E1', align: 'right', valign: 'middle', fontFace: 'Calibri' } } }
  ];
  pptx.defineSlideMaster({
    title: MASTER,
    background: { color: R.bg },
    objects: masterNesneleri,
    slideNumber: { x: SW - 0.7, y: SH - 0.4, w: 0.4, h: 0.4, fontSize: 10, color: 'CBD5E1', align: 'right', valign: 'middle' }
  });

  // ---- Kapak: koyu kurumsal mavi, tam ekran vurgulu.
  let s = pptx.addSlide();
  s.background = { color: R.birincilKoyu };
  s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: SW, h: 0.16, fill: { color: R.birincil } });
  s.addShape(pptx.ShapeType.rect, { x: 0, y: SH - 0.16, w: SW, h: 0.16, fill: { color: R.birincil } });
  if (logoUrl) {
    s.addImage(fotoSigdirNesnesi(logoUrl, SW / 2 - 0.75, 0.85, 1.5, 1.5));
  }
  s.addText('İŞ SAĞLIĞI VE GÜVENLİĞİ\nKURUL TOPLANTISI', { x: 1, y: 2.75, w: SW - 2, h: 1.6, fontSize: 38, bold: true, color: 'FFFFFF', align: 'center', fontFace: 'Calibri', lineSpacingMultiple: 1.08 });
  s.addText(_denetimAktifFirmaAdi(), { x: 1, y: 4.35, w: SW - 2, fontSize: 19, color: 'BFDBFE', align: 'center', fontFace: 'Calibri' });
  const donemMetni = _ciktiDonemMetni(toplanti);
  const cipW = Math.max(2.6, 0.135 * donemMetni.length);
  s.addShape(pptx.ShapeType.roundRect, { x: SW / 2 - cipW / 2, y: 4.95, w: cipW, h: 0.55, rectRadius: 0.28, fill: { color: R.birincil } });
  s.addText(donemMetni, { x: SW / 2 - cipW / 2, y: 4.95, w: cipW, h: 0.55, fontSize: 16, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle' });
  const kapakBilgi = [
    toplanti.tarih ? `📅 ${gunAyYil(toplanti.tarih)}${toplanti.saat ? ', ' + toplanti.saat : ''}` : '',
    toplanti.yer ? `📍 ${toplanti.yer}` : '',
    toplanti.baskan ? `👤 Başkan: ${toplanti.baskan}` : ''
  ].filter(Boolean).join('      ');
  if (kapakBilgi) s.addText(kapakBilgi, { x: 1, y: 5.85, w: SW - 2, fontSize: 13, color: '93C5FD', align: 'center' });

  const yeniSlayt = () => pptx.addSlide({ masterName: MASTER });

  // ---- Bölüm ara slaydı: kalın renkli zemin + büyük numara/başlık —
  // uzun bir sunumda gözü dinlendirip yönetim kurulunun akışı takip
  // etmesini kolaylaştırır (kart yığını yerine belirgin duraklar).
  let _bolumNo = 0;
  const bolumAraSlaydi = (baslik, altBaslik) => {
    _bolumNo++;
    const sl = pptx.addSlide();
    sl.background = { color: R.birincilKoyu };
    sl.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: SW, h: 0.16, fill: { color: R.birincil } });
    sl.addShape(pptx.ShapeType.rect, { x: 0, y: SH - 0.16, w: SW, h: 0.16, fill: { color: R.birincil } });
    sl.addText(String(_bolumNo).padStart(2, '0'), { x: 0.9, y: 2.5, w: 3.6, h: 2.2, fontSize: 110, bold: true, color: R.birincil, fontFace: 'Calibri' });
    sl.addShape(pptx.ShapeType.rect, { x: 4.5, y: 3.0, w: 0.05, h: 1.5, fill: { color: R.birincil } });
    sl.addText(baslik, { x: 4.85, y: 2.85, w: 7.8, h: 1.0, fontSize: 30, bold: true, color: 'FFFFFF', valign: 'top', fontFace: 'Calibri' });
    if (altBaslik) sl.addText(altBaslik, { x: 4.85, y: 3.75, w: 7.8, h: 0.7, fontSize: 14, color: '93C5FD', valign: 'top' });
  };

  // ---- Durum/öncelik rozeti (renkli hap) — modern yönetim sunumlarındaki
  // durum etiketi görünümü.
  const rozetEkle = (sl, metin, x, y, renk) => {
    if (!metin) return;
    const w = Math.max(0.9, 0.1 * metin.length + 0.35);
    sl.addShape(pptx.ShapeType.roundRect, { x, y, w, h: 0.34, rectRadius: 0.17, fill: { color: renk.bg }, line: { type: 'none' } });
    sl.addText(metin, { x, y, w, h: 0.34, fontSize: 11, bold: true, color: renk.fg, align: 'center', valign: 'middle' });
    return w;
  };

  // Küçük, en-boy oranı bozulmayan "çerçeveli" fotoğraf — kart slaytlarının
  // sağında kullanılır (kullanıcı isteği: "fotoğraflar gereksiz
  // çekiştirilmesin" -- sizing:contain ile kutuya sığdırılır, kırpılıp
  // deforme edilmez).
  const kucukFotoEkle = (sl, url, x, y, boyut) => {
    if (!url) return;
    sl.addShape(pptx.ShapeType.roundRect, { x: x - 0.06, y: y - 0.06, w: boyut + 0.12, h: boyut + 0.12, rectRadius: 0.08, fill: { color: 'FFFFFF' }, line: { color: R.cizgi, width: 1 } });
    sl.addImage(fotoSigdirNesnesi(url, x, y, boyut, boyut));
  };

  // Başlık şeridi: sol renkli çubuk + üst bilgi satırı (sıra/toplam) — tüm
  // "kart" slaytlarında (olay/karar/uygunsuzluk) ortak.
  const kartBasligi = (sl, ustEtiket, baslik) => {
    sl.addShape(pptx.ShapeType.rect, { x: 0.22, y: 0.5, w: 0.07, h: 0.62, fill: { color: R.birincil } });
    sl.addText(ustEtiket, { x: M, y: 0.42, w: 11.8, h: 0.28, fontSize: 11, bold: true, color: R.birincil, charSpacing: 1 });
    // Uzun başlık (ör. uygunsuzluk konusu cümle uzunluğunda) üst etiketin ve kutunun üstüne taşmasın: tek satıra sığacak şekilde küçült/kısalt.
    // Uzun başlık kesilmez: iki satıra yayılır (çok uzunsa yazı küçülür), üst etiketin ve kutunun üstüne taşmaz.
    const kisa = baslik.length > 170 ? baslik.slice(0, 167).trimEnd() + '...' : baslik;
    sl.addText(kisa, { x: M, y: 0.68, w: 12.2, h: 0.64, fontSize: kisa.length <= 60 ? 21 : (kisa.length <= 110 ? 17 : 14), bold: true, color: R.baslik, fontFace: 'Calibri', valign: 'top', fit: 'shrink' });
  };

  // Meta bilgi tablosu: etiket/değer satırları, ince ayraç çizgili, açık
  // kurumsal görünüm (eskiden çıplak addTable idi).
  const metaTablosuEkle = (sl, satirlar, x, y, w) => {
    sl.addTable(satirlar.map(([e, d]) => [
      { text: e, options: { bold: true, color: R.soluk, fill: { color: R.bg } } },
      { text: d, options: { color: R.baslik, fill: { color: 'FFFFFF' } } }
    ]), { x, y, w, colW: [1.9, w - 1.9], fontSize: 11.5, border: { type: 'solid', color: R.cizgi, pt: 0.75 }, autoPage: false });
  };

  const tabloSlaydi = (baslik, basliklar, satirlar, colW) => {
    const sl = yeniSlayt();
    kartBasligi(sl, 'GÜNDEM MADDESİ', baslik);
    if (satirlar.length) {
      const govde = satirlar.map((satir, i) => satir.map(deger => ({
        text: String(deger ?? ''),
        options: { fill: { color: i % 2 ? R.bg : 'FFFFFF' }, color: R.baslik }
      })));
      sl.addTable([
        basliklar.map(h => ({ text: h, options: { bold: true, color: 'FFFFFF', fill: { color: R.birincil } } })),
        ...govde
      ], { x: M, y: 1.35, w: SW - 2 * M, colW, fontSize: 11, border: { type: 'solid', color: R.cizgi, pt: 0.75 }, autoPage: false });
    } else {
      sl.addShape(pptx.ShapeType.roundRect, { x: M, y: 1.5, w: SW - 2 * M, h: 0.9, rectRadius: 0.06, fill: { color: 'FFFFFF' }, line: { color: R.cizgi, width: 1 } });
      sl.addText('Bu dönem için kayıt bulunmamaktadır.', { x: M, y: 1.5, w: SW - 2 * M, h: 0.9, fontSize: 14, color: R.soluk, align: 'center', valign: 'middle' });
    }
  };

  const metinSlaydi = (baslik, metin) => {
    const sl = yeniSlayt();
    kartBasligi(sl, 'DEĞERLENDİRME', baslik);
    sl.addShape(pptx.ShapeType.roundRect, { x: M, y: 1.35, w: SW - 2 * M, h: 5.4, rectRadius: 0.08, fill: { color: 'FFFFFF' }, line: { color: R.cizgi, width: 1 } });
    sl.addText(metin || 'Bu dönem için kayıt bulunmamaktadır.', { x: M + 0.3, y: 1.6, w: SW - 2 * M - 0.6, h: 4.9, fontSize: 15, color: R.baslik, valign: 'top' });
  };

  // Yıl bazlı iş kazası istatistikleri (bkz. service.js
  // toplantiKazaIstatistikleriHesapla) -- kullanıcı isteği: "ilk slaytta
  // [yıl] içinde gerçekleşen iş kazası sayısı, toplam iş günü kaybı, kaza
  // sıklık ağırlık oranı ve kaza sıklık hızı yer alsın". Kapaktan hemen
  // sonra, kurumsal stat-kartı görünümünde tek bir slaytta gösterilir.
  const kazaIst = toplantiKazaIstatistikleriHesapla(toplanti);
  if (kazaIst) {
    const sl = yeniSlayt();
    kartBasligi(sl, 'İSG PERFORMANSI', `${kazaIst.yil} Yılı Aylık İş Kazası Sayıları`);
    // Kullanıcı isteği: sıklık hızı/ağırlık oranı yerine aylık kaza sayıları grafiği.
    const kutular = [
      { etiket: 'İş Kazası Sayısı', deger: String(kazaIst.kazaSayisi) },
      { etiket: 'Toplam İş Günü Kaybı', deger: String(kazaIst.toplamKayipGun) }
    ];
    const kutuW = 2.6;
    kutular.forEach((k, i) => {
      const y = 1.4 + i * 1.75;
      sl.addShape(pptx.ShapeType.roundRect, { x: M, y, w: kutuW, h: 1.55, rectRadius: 0.08, fill: { color: 'FFFFFF' }, line: { color: R.cizgi, width: 1 } });
      sl.addShape(pptx.ShapeType.rect, { x: M, y, w: kutuW, h: 0.08, fill: { color: R.birincil } });
      sl.addText(k.deger, { x: M, y: y + 0.2, w: kutuW, h: 0.8, fontSize: 30, bold: true, color: R.birincil, align: 'center' });
      sl.addText(k.etiket, { x: M + 0.1, y: y + 0.95, w: kutuW - 0.2, h: 0.5, fontSize: 11, color: R.soluk, align: 'center', valign: 'top' });
    });
    const grafikX = M + kutuW + 0.3;
    sl.addChart(pptx.charts.BAR, [{
      name: 'İş Kazası Sayısı',
      labels: kazaIst.aylikDagilim.map(a => a.ay),
      values: kazaIst.aylikDagilim.map(a => a.kazaSayisi)
    }], {
      x: grafikX, y: 1.35, w: SW - grafikX - M, h: 5.3,
      barDir: 'col', chartColors: [R.birincil],
      showValue: true, dataLabelPosition: 'outEnd', dataLabelFontSize: 12, dataLabelFormatCode: '0',
      catAxisLabelFontSize: 11, valAxisLabelFontSize: 11,
      valAxisMinVal: 0, valAxisMajorUnit: 1, valAxisLabelFormatCode: '0',
      valGridLine: { color: 'E5E7EB', size: 0.5 }, catGridLine: { style: 'none' },
      showLegend: false
    });
    sl.addText('(*) İş kazası sayısı = LTI + DART + Tıbbi Tedavi. Toplantı tarihine kadar kayıtlı kazalar gösterilir.', { x: M, y: 6.75, w: SW - 2 * M, h: 0.4, fontSize: 9, italic: true, color: R.soluk });
  }

  // Kullanıcı isteği: "hangi ay kaç kaza olmuş ve hangi ay kaç gün rapor
  // alınmış ve hangi kazalar ilk üç kaza en yüksek raporlu" — yıllık özet
  // slaydından hemen sonra, aylık kırılım (sol) ve en ağır 3 kaza (sağ) tek
  // bir slaytta yan yana gösterilir. Ay verisi hiç yoksa (kazaSayisi=0
  // ve toplamKayipGun=0) slayt hiç eklenmez.
  if (kazaIst && (kazaIst.kazaSayisi > 0 || kazaIst.toplamKayipGun > 0)) {
    const sl = yeniSlayt();
    kartBasligi(sl, 'İSG PERFORMANSI', `${kazaIst.yil} Yılı Kazaların Kayıp Gününe Göre Dağılımı`);

    const solW = (SW - 2 * M) * 0.56;
    const sagX = M + solW + 0.3;
    const sagW = SW - 2 * M - solW - 0.3;

    // Kullanıcı isteği (2026-09-11): aylık toplam kayıp gün yerine, HER
    // kazanın kendi kayıp günüyle en yüksekten en düşüğe sıralı listesi.
    const kazaSatirlari = kazaIst.kazalarKayipGuneSirali;
    if (kazaSatirlari.length) {
      sl.addTable([
        [{ text: 'Tarih', options: { bold: true, color: 'FFFFFF', fill: { color: R.birincil } } },
         { text: 'Tür', options: { bold: true, color: 'FFFFFF', fill: { color: R.birincil } } },
         { text: 'Kayıp Gün', options: { bold: true, color: 'FFFFFF', fill: { color: R.birincil } } }],
        ...kazaSatirlari.map((k, i) => [
          { text: gunAyYil(k.tarih) || '-', options: { fill: { color: i % 2 ? R.bg : 'FFFFFF' }, color: R.baslik } },
          { text: k.tur, options: { fill: { color: i % 2 ? R.bg : 'FFFFFF' }, color: R.baslik } },
          { text: String(k.kayipGun), options: { fill: { color: i % 2 ? R.bg : 'FFFFFF' }, color: R.baslik, align: 'center' } }
        ])
      ], { x: M, y: 1.35, w: solW, colW: [solW * 0.32, solW * 0.44, solW * 0.24], fontSize: 10.5, border: { type: 'solid', color: R.cizgi, pt: 0.75 }, autoPage: false });
    } else {
      sl.addShape(pptx.ShapeType.roundRect, { x: M, y: 1.35, w: solW, h: 0.9, rectRadius: 0.06, fill: { color: 'FFFFFF' }, line: { color: R.cizgi, width: 1 } });
      sl.addText('Bu yıl için kayıp günlü kaza bulunmamaktadır.', { x: M, y: 1.35, w: solW, h: 0.9, fontSize: 12, color: R.soluk, align: 'center', valign: 'middle' });
    }

    sl.addText('EN YÜKSEK KAYIP GÜNLÜ İLK 3 KAZA', { x: sagX, y: 1.35, w: sagW, h: 0.35, fontSize: 11, bold: true, color: R.birincil });
    if (kazaIst.enYuksekKayipGunlu.length) {
      const kartH = 1.55;
      kazaIst.enYuksekKayipGunlu.forEach((k, i) => {
        const y = 1.8 + i * (kartH + 0.15);
        sl.addShape(pptx.ShapeType.roundRect, { x: sagX, y, w: sagW, h: kartH, rectRadius: 0.06, fill: { color: 'FFFFFF' }, line: { color: R.cizgi, width: 1 } });
        sl.addText(String(k.kayipGun), { x: sagX, y, w: 1.1, h: kartH, fontSize: 26, bold: true, color: R.birincil, align: 'center', valign: 'middle' });
        sl.addText([
          { text: `${i + 1}. ${gunAyYil(k.tarih) || '-'}  •  ${k.tur}`, options: { fontSize: 12, bold: true, color: R.baslik, breakLine: true } },
          { text: k.yer || '-', options: { fontSize: 10, color: R.soluk, breakLine: true } },
          { text: k.aciklama ? (k.aciklama.length > 160 ? k.aciklama.slice(0, 160) + '…' : k.aciklama) : 'Oluş şekli açıklaması girilmemiş.', options: { fontSize: 9.5, italic: !k.aciklama, color: R.baslik } }
        ], { x: sagX + 1.25, y: y + 0.08, w: sagW - 1.35, h: kartH - 0.16, valign: 'top' });
      });
    } else {
      sl.addShape(pptx.ShapeType.roundRect, { x: sagX, y: 1.8, w: sagW, h: 0.9, rectRadius: 0.06, fill: { color: 'FFFFFF' }, line: { color: R.cizgi, width: 1 } });
      sl.addText('Kayıp günlü kaza bulunmamaktadır.', { x: sagX, y: 1.8, w: sagW, h: 0.9, fontSize: 11, color: R.soluk, align: 'center', valign: 'middle' });
    }
  }

  // Kullanıcı isteği: yıllık/aylık iş kazası ve ramak kala istatistikleri,
  // kaza türleri, iş günü kaybı ve önceki yıllarla kıyaslama (ilk slaytlarda).
  const kdPptx = toplantiDetayliKazaIstatistikleri(toplanti);
  if (kdPptx) {
    const [y2, y1, y0] = kdPptx.yillar;
    const baslikHucre = (t, hiza) => ({ text: t, options: { bold: true, color: 'FFFFFF', fill: { color: R.birincil }, align: hiza || 'center', valign: 'middle' } });

    // 1) Yıllık karşılaştırma tablosu
    {
      const sl = yeniSlayt();
      kartBasligi(sl, 'İSG İSTATİSTİKLERİ', `${kdPptx.yil} Yılı İş Kazası ve Ramak Kala Karşılaştırması (Ocak–${kdPptx.sonAyAdi})`);
      const satirlar = _istKarsilastirmaSatirlari(kdPptx);
      const tabloW = SW - 2 * M;
      sl.addTable([
        [baslikHucre('Gösterge', 'left'), baslikHucre(String(y2.yil)), baslikHucre(String(y1.yil)), baslikHucre(String(y0.yil)), baslikHucre(`${y1.yil} ile Değişim`)],
        ...satirlar.map((s, i) => {
          const ana = !s[0].startsWith('   ');
          const zemin = { fill: { color: i % 2 ? R.bg : 'FFFFFF' } };
          const degisimRenk = s[4].startsWith('▲') ? 'B91C1C' : (s[4].startsWith('▼') ? '15803D' : R.soluk);
          return [
            { text: ana ? s[0] : '      ' + s[0].trim(), options: Object.assign({ color: R.baslik, bold: ana }, zemin) },
            { text: s[1], options: Object.assign({ color: R.soluk, align: 'center' }, zemin) },
            { text: s[2], options: Object.assign({ color: R.soluk, align: 'center' }, zemin) },
            { text: s[3], options: Object.assign({ color: R.baslik, bold: true, align: 'center' }, zemin) },
            { text: s[4], options: Object.assign({ color: degisimRenk, bold: true, align: 'center' }, zemin) }
          ];
        })
      ], { x: M, y: 1.35, w: tabloW, colW: [tabloW * 0.43, tabloW * 0.12, tabloW * 0.12, tabloW * 0.12, tabloW * 0.21], fontSize: 10, rowH: 0.3, border: { type: 'solid', color: R.cizgi, pt: 0.75 }, autoPage: false });
      const kazasizMetni = kdPptx.kazasizGun == null ? 'Kayıtlı iş kazası bulunmamaktadır.' : `Son iş kazası: ${gunAyYil(kdPptx.sonKazaTarihi)}  ·  Kazasız geçen gün: ${kdPptx.kazasizGun}`;
      sl.addText(kazasizMetni, { x: M, y: 6.72, w: 7.2, h: 0.35, fontSize: 12, bold: true, color: R.birincil });
      sl.addText('Önceki yıllar aynı dönem (Ocak–' + kdPptx.sonAyAdi + ') için hesaplanmıştır.  ▲ artış  ▼ azalış', { x: 7.4, y: 6.72, w: SW - 7.4 - M, h: 0.35, fontSize: 9, italic: true, color: R.soluk, align: 'right' });
    }

    // 2) Aylık karşılaştırma: iş kazası ve ramak kala (iki grafik yan yana)
    {
      const sl = yeniSlayt();
      kartBasligi(sl, 'İSG İSTATİSTİKLERİ', `Aylık İş Kazası ve Ramak Kala Sayıları: ${y1.yil} / ${y0.yil}`);
      const grafikW = (SW - 2 * M - 0.3) / 2;
      const ciz = (x, baslik, seri, renk) => {
        sl.addText(baslik, { x, y: 1.3, w: grafikW, h: 0.35, fontSize: 13, bold: true, color: R.baslik, align: 'center' });
        sl.addChart(pptx.charts.BAR, [
          { name: String(y1.yil), labels: kdPptx.aylar, values: seri.onceki },
          { name: String(y0.yil), labels: kdPptx.aylar, values: seri.bu }
        ], {
          x, y: 1.65, w: grafikW, h: 5.0,
          barDir: 'col', barGrouping: 'clustered', chartColors: ['94A3B8', renk],
          showValue: true, dataLabelPosition: 'outEnd', dataLabelFontSize: 9, dataLabelFormatCode: '0',
          catAxisLabelFontSize: 10, valAxisLabelFontSize: 10, valAxisMinVal: 0, valAxisLabelFormatCode: '0',
          valGridLine: { color: 'E5E7EB', size: 0.5 }, catGridLine: { style: 'none' },
          showLegend: true, legendPos: 'b', legendFontSize: 11
        });
      };
      ciz(M, 'İş Kazası Sayıları', kdPptx.aylikKaza, R.birincil);
      ciz(M + grafikW + 0.3, 'Ramak Kala Sayıları', kdPptx.aylikRamak, 'EA580C');
    }

    // 3-4) Dağılımlar: olay türleri / yaralanma türleri, yaralanan uzuv / bölüm
    const dagilimSlaydi = (baslik, sol, sag) => {
      const sl = yeniSlayt();
      kartBasligi(sl, 'İSG İSTATİSTİKLERİ', baslik);
      const grafikW = (SW - 2 * M - 0.3) / 2;
      [[M, sol], [M + grafikW + 0.3, sag]].forEach(([x, g]) => {
        sl.addText(g.baslik, { x, y: 1.3, w: grafikW, h: 0.35, fontSize: 13, bold: true, color: R.baslik, align: 'center' });
        if (!g.veri.length) {
          sl.addShape(pptx.ShapeType.roundRect, { x, y: 1.75, w: grafikW, h: 0.9, rectRadius: 0.06, fill: { color: 'FFFFFF' }, line: { color: R.cizgi, width: 1 } });
          sl.addText('Kayıt bulunmamaktadır.', { x, y: 1.75, w: grafikW, h: 0.9, fontSize: 12, color: R.soluk, align: 'center', valign: 'middle' });
          return;
        }
        sl.addChart(pptx.charts.BAR, [{ name: g.baslik, labels: g.veri.map(v => v.etiket), values: g.veri.map(v => v.sayi) }], {
          x, y: 1.65, w: grafikW, h: 5.0,
          barDir: 'bar', chartColors: [g.renk], catAxisOrientation: 'maxMin',
          showValue: true, dataLabelPosition: 'outEnd', dataLabelFontSize: 11, dataLabelFormatCode: '0',
          catAxisLabelFontSize: 10, valAxisHidden: true, valAxisMinVal: 0, valGridLine: { style: 'none' }, catGridLine: { style: 'none' },
          showLegend: false
        });
      });
    };
    dagilimSlaydi(`${kdPptx.yil} Yılı Kaza Türleri ve Dağılımlar (Ocak–${kdPptx.sonAyAdi})`,
      { baslik: 'Olay Türlerine Göre', veri: kdPptx.olayTurleri, renk: R.birincil },
      { baslik: 'Kaza / Yaralanma Türleri', veri: kdPptx.yaralanmaTurleri, renk: 'DC2626' });
    dagilimSlaydi(`${kdPptx.yil} Yılı Yaralanan Uzuv ve Bölüm Dağılımları (Ocak–${kdPptx.sonAyAdi})`,
      { baslik: 'Yaralanan Uzuv', veri: kdPptx.yaralananUzuvlar, renk: '7C3AED' },
      { baslik: 'Bölüm / Birim', veri: kdPptx.bolumler, renk: '0F766E' });
  }

  bolumAraSlaydi('GÜNDEM', 'Toplantı gündem maddeleri');
  tabloSlaydi('GÜNDEM', ['No', 'Konu', 'Not'], gundem.map((g, i) => {
    const olaylarMetni = /^olaylar/i.test(g.baslik.trim()) ? toplantiOlaylarGundemMetni(toplanti.id) : '';
    return [String(i + 1), g.baslik, [g.not, olaylarMetni].filter(Boolean).join(' — ')];
  }), [1, 5, 5.5]);

  // Tam ekran fotoğraf slaydı — hem kararlar hem olaylar için ortak (kullanıcı
  // isteği: "fotoğraflar slaytta olsun sonraki slaytta büyük tam ekran
  // olsun"). Alt kısımda yarı saydam bir başlık şeridi + sizing:contain ile
  // fotoğraf hiçbir zaman kırpılıp deforme edilmeden (en-boy oranı korunarak)
  // kutuya sığdırılır.
  const fotoTamEkranSlaydiEkle = (baslik, url) => {
    if (!url) return;
    const sl = pptx.addSlide();
    sl.background = { color: '0B1220' };
    sl.addImage(fotoSigdirNesnesi(url, 0.5, 0.5, SW - 1, SH - 1.3));
    sl.addShape(pptx.ShapeType.rect, { x: 0, y: SH - 0.7, w: SW, h: 0.7, fill: { color: R.baslik, transparency: 15 } });
    sl.addText(baslik, { x: 0.5, y: SH - 0.7, w: SW - 1, h: 0.7, fontSize: 14, bold: true, color: 'FFFFFF', valign: 'middle' });
  };

  // Her olay kendi slaydında (karar deseniyle aynı) — varsa ilk fotoğrafı
  // sağda küçük, tüm fotoğrafları da hemen ardından birer tam ekran slaytta.
  const olaySlaydi = (o, sira, toplam) => {
    const sl = yeniSlayt();
    const foto = o.fotograflar && o.fotograflar[0] && o.fotograflar[0].url;
    const metinGenislik = foto ? 7.3 : SW - 2 * M;
    kartBasligi(sl, `OLAY  ·  ${sira} / ${toplam}${o.otomatik ? '  ·  Olay/Kaza modülünden' : ''}`, o.tur || '-');
    sl.addShape(pptx.ShapeType.roundRect, { x: M, y: 1.35, w: metinGenislik, h: 1.55, rectRadius: 0.06, fill: { color: 'FFFFFF' }, line: { color: R.cizgi, width: 1 } });
    sl.addText(o.olusSekli || '-', { x: M + 0.25, y: 1.5, w: metinGenislik - 0.5, h: 1.25, fontSize: 13.5, color: R.baslik, valign: 'top' });
    const metaSatirlari = [
      ['Tarih', gunAyYil(o.tarih) || '-'],
      ['Yer', o.yer || '-'],
      ['Birim', o.birim || '-'],
      ['Kök Neden', o.kokNeden || '-'],
      ['İş Günü Kaybı', o.isGunuKaybi || '-']
    ];
    if (o.kararMetni || o.sorumlu || o.termin) {
      metaSatirlari.push(
        ['Karar Metni', o.kararMetni || '-'],
        ['Sorumlu', o.sorumlu || '-'],
        ['Termin', gunAyYil(o.termin) || '-'],
        ['Oy Sonucu', [o.oySonucu, kararOyDokumMetni(o) && `(${kararOyDokumMetni(o)})`].filter(Boolean).join('  ') || '-']
      );
    }
    metaTablosuEkle(sl, metaSatirlari, M, 3.1, metinGenislik);
    if (o.oncelik) rozetEkle(sl, o.oncelik, M, 2.98 - 0.42, _renkGetir(ONCELIK_RENK, o.oncelik));
    if (o.durum) rozetEkle(sl, o.durum, M + 1.3, 2.98 - 0.42, _renkGetir(DURUM_RENK, o.durum));
    if (foto) kucukFotoEkle(sl, foto, 8.55, 1.35, 3.5);
  };

  if (olaylar.length) {
    olaylar.forEach((o, i) => {
      olaySlaydi(o, i + 1, olaylar.length);
      (o.fotograflar || []).forEach((f, fi) => fotoTamEkranSlaydiEkle(`${o.tur || 'Olay'} — Olay Yeri ${fi + 1}`, f.url));
    });
  } else {
    tabloSlaydi('OLAYLAR', ['Bilgi'], [], []);
  }

  // Her karar kendi slaydında: metin + meta bilgiler sol tarafta, varsa ilk
  // fotoğraf (öncesi/sonrası/ek sırasıyla) sağ tarafta küçük resim olarak
  // (eski üretim uygulamasındaki "karar başına ayrı slayt" kuralıyla aynı).
  const kararIlkFotografi = (k) => k.fotoOncesi || k.fotoSonrasi || (k.fotografEk && k.fotografEk[0] && k.fotografEk[0].url) || '';

  // Kullanıcı isteği: "her karar iki slayt + fotoğraflar olsun, karar metni
  // sorumlu termin öncelik vb ilk sayfa, ikinci sayfa aksiyon ilerleme
  // durumu" — hem Yeni Karar hem Devreden Karar için HER ZAMAN 2 slayt
  // (eskiden metin uzunluğuna göre değişen 1/2 slayt kuralı kaldırıldı):
  // 1) karar metni + takip bilgileri (sorumlu/termin/öncelik/durum/kaynak
  // gündem/oy sonucu/kapanış) + varsa fotoğraf, 2) yalnızca aksiyon ilerleme
  // notu.
  const kararSlaydi = (baslikOnEki, k, sira, toplam) => {
    const foto = kararIlkFotografi(k);
    const metinGenislik = foto ? 7.3 : SW - 2 * M;

    const sl = yeniSlayt();
    kartBasligi(sl, `${baslikOnEki}  ·  ${sira} / ${toplam}`, k.kararNo);
    sl.addShape(pptx.ShapeType.roundRect, { x: M, y: 1.35, w: metinGenislik, h: 1.35, rectRadius: 0.06, fill: { color: 'FFFFFF' }, line: { color: R.cizgi, width: 1 } });
    sl.addText(k.kararMetni || '-', { x: M + 0.25, y: 1.5, w: metinGenislik - 0.5, h: 1.05, fontSize: 13.5, color: R.baslik, valign: 'top' });

    const kararDurum = k.durumGoruntu || k.durum || '';
    let rozetX = M;
    if (k.oncelik) rozetX += (rozetEkle(sl, k.oncelik, rozetX, 2.9, _renkGetir(ONCELIK_RENK, k.oncelik)) || 0) + 0.15;
    if (kararDurum) rozetEkle(sl, kararDurum, rozetX, 2.9, _renkGetir(DURUM_RENK, kararDurum));

    const metaSatirlari = [
      ['Sorumlu', k.sorumlu || '-'],
      ['Termin', gunAyYil(k.termin) || '-'],
      ['Kaynak Gündem', k.kaynakGundem || '-'],
      ['Oy Sonucu', [k.oySonucu, kararOyDokumMetni(k) && `(${kararOyDokumMetni(k)})`].filter(Boolean).join('  ') || '-'],
      ['Kapanış / Kanıt', [k.kapanisTarihi, k.kanit].filter(Boolean).join(' / ') || '-']
    ];
    metaTablosuEkle(sl, metaSatirlari, M, 3.4, metinGenislik);
    if (foto) kucukFotoEkle(sl, foto, 8.55, 1.35, 3.5);

    const sl2 = yeniSlayt();
    kartBasligi(sl2, `${baslikOnEki}  ·  ${sira} / ${toplam}  ·  ${k.kararNo}`, 'Aksiyon İlerleme Notu');
    sl2.addShape(pptx.ShapeType.roundRect, { x: M, y: 1.35, w: SW - 2 * M, h: 5.4, rectRadius: 0.08, fill: { color: 'FFFFFF' }, line: { color: R.cizgi, width: 1 } });
    sl2.addText(k.aksiyonNotu || 'Aksiyon ilerleme notu girilmemiştir.', { x: M + 0.3, y: 1.6, w: SW - 2 * M - 0.6, h: 4.9, fontSize: 15, color: R.baslik, valign: 'top' });
  };

  // Kararın TÜM fotoğrafları (öncesi/sonrası/en fazla 3 ek — bkz.
  // _pdfKararFotograflari) için, karar slaydından hemen sonra birer tam ekran
  // slayt eklenir — kullanıcı isteği: "fotoğraflar slaytta olsun sonraki
  // slaytta büyük tam ekran olsun".
  const kararFotoTamEkranSlaytlariniEkle = (k) => {
    _pdfKararFotograflari(k).forEach(f => fotoTamEkranSlaydiEkle(`${k.kararNo} — ${f.etiket}`, f.url));
  };

  const kararSlaytlariniEkle = (baslikOnEki, liste) => {
    if (!liste.length) {
      tabloSlaydi(baslikOnEki, ['Bilgi'], [], []);
      return;
    }
    liste.forEach((k, i) => {
      kararSlaydi(baslikOnEki, k, i + 1, liste.length);
      kararFotoTamEkranSlaytlariniEkle(k);
    });
  };

  // Sıra: Olaylardan hemen sonra Çalışanların Görüş ve Önerileri (kullanıcı isteği).
  bolumAraSlaydi('GÖRÜŞ VE ÖNERİLER', 'Çalışanların değerlendirmesi');
  metinSlaydi('ÇALIŞANLARIN GÖRÜŞ VE ÖNERİLERİ', toplanti.calisanTemsilcisiGorusleri || KURUL_RAPOR_VARSAYILANLARI.gorusler);

  bolumAraSlaydi('KARARLAR', 'Yeni kararlar ve devreden kararların takibi');
  kararSlaytlariniEkle('YENİ KARAR', yeni);
  kararSlaytlariniEkle('DEVREDEN KARAR', devreden);

  bolumAraSlaydi('EĞİTİM VE FAALİYETLER', 'Ay içinde yapılan eğitimler ve İSG çalışmaları');
  tabloSlaydi('AY İÇİNDE YAPILAN EĞİTİMLER', ['Eğitim Adı', 'Tarih', 'Katılımcı', 'Birim'], aylikEgitimler.map(k => [k.egitimAdi, gunAyYil(k.egitimTarihi), String(k.katilimciSayisi), k.birim]), [4, 2.5, 2, 3]);
  tabloSlaydi('AY İÇİ İSG ÇALIŞMALARI', ['Faaliyet', 'Adet', 'Açıklama'], ayIciFaaliyetler.map(f => [f.faaliyet, f.adet || '', f.aciklama || '']), [3, 1.5, 7]);

  // Kullanıcı isteği: "ay içinde tespit edilen uygunsuzluklar ve kapatılan
  // uygunsuzluklar da tek tek slaytlarda ayrı slaytlarda olmalı" — önceden
  // tüm liste TEK bir özet tablo slaydında gösteriliyordu; artık kararlar/
  // olaylardaki gibi HER uygunsuzluk kendi slaydında (metin + meta bilgiler
  // + varsa küçük fotoğraf), ardından öncesi/sonrası fotoğrafları için birer
  // tam ekran slayt (aynı desen — bkz. fotoTamEkranSlaydiEkle).
  const uygunsuzlukSlaydi = (baslikOnEki, k, sira, toplam) => {
    const foto = k.fotoOncesi || k.fotoSonrasi || '';
    const metinGenislik = foto ? 7.3 : SW - 2 * M;

    const sl = yeniSlayt();
    kartBasligi(sl, `${baslikOnEki}  ·  ${sira} / ${toplam}`, k.konuBasligi || '-');
    sl.addShape(pptx.ShapeType.roundRect, { x: M, y: 1.35, w: metinGenislik, h: 1.35, rectRadius: 0.06, fill: { color: 'FFFFFF' }, line: { color: R.cizgi, width: 1 } });
    // Açıklama boşsa (sadece '-') kutuda konu başlığının tamamı gösterilir (başlık üstte kısaltılıyor).
    const aciklama = (k.uygunsuzluk && k.uygunsuzluk.trim() !== '-') ? k.uygunsuzluk : (k.konuBasligi || '-');
    sl.addText(aciklama, { x: M + 0.25, y: 1.5, w: metinGenislik - 0.5, h: 1.05, fontSize: 13.5, color: R.baslik, valign: 'top', fit: 'shrink' });
    if (k.durum) rozetEkle(sl, k.durum, M, 2.9, _renkGetir(DURUM_RENK, k.durum));

    const metaSatirlari = [
      ['Bölüm', k.bolum || '-'],
      ['Tespit', gunAyYil(k.tespitTarihi) || '-'],
      ['Kapanış', gunAyYil(k.kapanisTarihi) || '-'],
      ['Sorumlu', k.sorumlu || '-']
    ];
    if (k.alinanOnlem) metaSatirlari.push(['Alınan Önlem', k.alinanOnlem]);
    metaTablosuEkle(sl, metaSatirlari, M, 3.4, metinGenislik);
    if (foto) kucukFotoEkle(sl, foto, 8.55, 1.35, 3.5);
  };

  const uygunsuzlukSlaytlariniEkle = (baslikOnEki, liste) => {
    if (!liste.length) {
      tabloSlaydi(baslikOnEki, ['Bilgi'], [], []);
      return;
    }
    liste.forEach((k, i) => {
      uygunsuzlukSlaydi(baslikOnEki, k, i + 1, liste.length);
      if (k.fotoOncesi) fotoTamEkranSlaydiEkle(`${k.konuBasligi} — Öncesi`, k.fotoOncesi);
      if (k.fotoSonrasi) fotoTamEkranSlaydiEkle(`${k.konuBasligi} — Sonrası`, k.fotoSonrasi);
    });
  };

  bolumAraSlaydi('UYGUNSUZLUKLAR', 'Ay içinde tespit edilen ve kapatılan uygunsuzluklar');
  uygunsuzlukSlaytlariniEkle('AY İÇİNDE TESPİT EDİLEN UYGUNSUZLUK', tespitEdilenUygunsuzluklar);
  uygunsuzlukSlaytlariniEkle('AY İÇİNDE KAPATILAN UYGUNSUZLUK', kapananUygunsuzluklar);

  // Uygunsuzlukların değerlendirmesi (kullanıcı isteği): yıl içinde açılan /
  // kapatılan / açık, tamamlama oranı kutuları + aylık açılan-kapatılan grafiği.
  const usIstPptx = toplantiUygunsuzlukIstatistikleriHesapla(toplanti);
  if (usIstPptx) {
    const sl = yeniSlayt();
    kartBasligi(sl, 'UYGUNSUZLUKLAR', `${usIstPptx.yil} Yılı Uygunsuzlukların Değerlendirmesi`);
    const oranPptx = usIstPptx.tamamlamaOrani == null ? '-' : '%' + usIstPptx.tamamlamaOrani.toFixed(1).replace('.', ',');
    const kutularUs = [
      { etiket: `${usIstPptx.yil} Yılında Açılan`, deger: String(usIstPptx.acilan) },
      { etiket: 'Kapatılan (Yapılan)', deger: String(usIstPptx.kapatilan) },
      { etiket: 'Hâlen Açık', deger: String(usIstPptx.acik) },
      { etiket: 'Tamamlama Oranı', deger: oranPptx }
    ];
    // Kullanıcı isteği: aylık grafik kaldırıldı, sadece rakamlar kalsın — dört kutu slayta yayılır (2x2).
    const bosluk = 0.4, kutuWUs = (SW - 2 * M - bosluk) / 2, kutuHUs = 2.3;
    kutularUs.forEach((k, i) => {
      const x = M + (i % 2) * (kutuWUs + bosluk);
      const y = 1.5 + Math.floor(i / 2) * (kutuHUs + bosluk);
      sl.addShape(pptx.ShapeType.roundRect, { x, y, w: kutuWUs, h: kutuHUs, rectRadius: 0.08, fill: { color: 'FFFFFF' }, line: { color: R.cizgi, width: 1 } });
      sl.addShape(pptx.ShapeType.rect, { x, y, w: kutuWUs, h: 0.09, fill: { color: R.birincil } });
      sl.addText(k.deger, { x, y: y + 0.35, w: kutuWUs, h: 1.1, fontSize: 54, bold: true, color: R.birincil, align: 'center', valign: 'middle' });
      sl.addText(k.etiket, { x: x + 0.1, y: y + 1.5, w: kutuWUs - 0.2, h: 0.55, fontSize: 18, color: R.soluk, align: 'center', valign: 'top' });
    });
  }

  // "İSG Kurulları İle İlgili Yasal Düzenleme" — kullanıcı isteği: "yasal
  // düzenleme referansı raporlarda olmalı"; her madde (bkz. model.js
  // YONETMELIK_MADDELERI) kendi slaydında, küçük yazı tipiyle tam metin.
  bolumAraSlaydi('YASAL DAYANAK', 'İSG Kurulları ile ilgili mevzuat referansı');
  YONETMELIK_MADDELERI.forEach(m => {
    const sl = yeniSlayt();
    kartBasligi(sl, 'YASAL DAYANAK', `${m.madde} – ${m.baslik}`);
    sl.addShape(pptx.ShapeType.roundRect, { x: M, y: 1.35, w: SW - 2 * M, h: 5.4, rectRadius: 0.08, fill: { color: 'FFFFFF' }, line: { color: R.cizgi, width: 1 } });
    const metin = m.fikralar.map(f => [f.giris, ...f.bentler].join('\n')).join('\n\n');
    sl.addText(metin, { x: M + 0.3, y: 1.55, w: SW - 2 * M - 0.6, h: 4.9, fontSize: 10.5, color: R.baslik, valign: 'top' });
  });

  await pptx.writeFile({ fileName: `Kurul_Toplantisi_${toplanti.toplantiNo}.pptx` });
}

// ==================== FOTOĞRAF SUNUMU (PPTX) ====================
// Kullanıcı isteği: "isg kurulu modülünde pptx sunum var aynı şekilde sadece
// fotoların ve karar noların olduğu, sırasıyla bir sunum istiyorum, indirilebilir
// olsun" — kurul raporundaki sırayla (önce Bu Toplantıda Alınan Kararlar, sonra
// Devreden Kararlar) her kararın TÜM fotoğrafları (öncesi/sonrası/ekler) tam
// ekran birer slayt, altında sadece Karar No + fotoğraf etiketi. Kapak/metin yok.
async function fotoSunumuPptxOlustur() {
  const toplanti = toplantiIdIleGetirRepo(_toplantiId);
  if (!toplanti) return;

  const { devreden: devredenHam, yeni: yeniHam } = _ciktiKararVerisi(_toplantiId);
  const [yeni, devreden] = await Promise.all([_pdfKararlariFotoCoz(yeniHam), _pdfKararlariFotoCoz(devredenHam)]);

  const fotolar = [];
  yeni.concat(devreden).forEach(k => {
    _pdfKararFotograflari(k).forEach(f => fotolar.push({ kararNo: k.kararNo || '-', etiket: f.etiket, url: f.url }));
  });
  if (!fotolar.length) {
    alert('Bu toplantının kararlarında (yeni ve devreden) fotoğraf bulunamadı.');
    return;
  }

  await fotoOlculeriniHazirla(fotolar.map(f => f.url));
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  const SW = 13.33, SH = 7.5;
  fotolar.forEach(f => {
    const sl = pptx.addSlide();
    sl.background = { color: '0B1220' };
    sl.addImage(fotoSigdirNesnesi(f.url, 0.4, 0.35, SW - 0.8, SH - 1.35));
    sl.addShape(pptx.ShapeType.rect, { x: 0, y: SH - 0.75, w: SW, h: 0.75, fill: { color: '0F172A' } });
    sl.addText(`${f.kararNo}   ·   ${f.etiket}`, { x: 0.5, y: SH - 0.75, w: SW - 1, h: 0.75, fontSize: 20, bold: true, color: 'FFFFFF', valign: 'middle' });
  });

  await pptx.writeFile({ fileName: `Kurul_Foto_Sunumu_${toplanti.toplantiNo}.pptx` });
}

// ==================== ATAMA YAZISI (WORD) ====================
// İmza Listesi'ndeki bir kişi için tek sayfalık görevlendirme yazısı —
// kullanıcı isteği: "isimlerin yanlarında buton olsun tıkladığımda atama
// yazısı çıkarsın, o kişi için atayan da kurul başkanı olsun". Atayan, aynı
// toplantının İmza Listesi'nde "Kurul Başkanı" olarak işaretli kişiden
// otomatik gelir (bkz. service.js toplantiBaskanSekreterGetir).
async function atamaYazisiWordOlustur(imzaId) {
  const imza = toplantiImzalariniGetir(_toplantiId).find(i => i.id === imzaId);
  if (!imza) return;

  const bsAtama = toplantiBaskanSekreterGetir(_toplantiId);
  const bugunAtama = gunAyYil(_bugun());

  const doc = new docx.Document({
    sections: [{
      properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      children: [
        new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: _denetimAktifFirmaAdi(), bold: true, size: 26 })], spacing: { after: 200 } }),
        new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: 'İŞ SAĞLIĞI VE GÜVENLİĞİ KURULU GÖREVLENDİRME YAZISI', bold: true, size: 24 })], spacing: { after: 600 } }),
        new docx.Paragraph({ alignment: docx.AlignmentType.RIGHT, children: [new docx.TextRun({ text: bugunAtama })], spacing: { after: 400 } }),
        new docx.Paragraph({
          spacing: { after: 400, line: 360 },
          children: [new docx.TextRun({
            text: `İşyerimiz İş Sağlığı ve Güvenliği Kurulu bünyesinde, ${imza.adSoyad} (${imza.unvan || imza.birim || '-'})'nin ` +
              `"${imza.kuruldakiGorev || 'Kurul Üyesi'}" görevini yürütmek üzere ${bugunAtama} tarihi itibarıyla görevlendirilmesi uygun görülmüştür.`
          })]
        }),
        new docx.Paragraph({
          spacing: { after: 800, line: 360 },
          children: [new docx.TextRun({
            text: '6331 sayılı İş Sağlığı ve Güvenliği Kanunu ve İş Sağlığı ve Güvenliği Kurulları Hakkında Yönetmelik hükümleri gereğince bilgilerinize ve gereğini arz/rica ederiz.'
          })]
        }),
        new docx.Table({
          width: { size: 100, type: docx.WidthType.PERCENTAGE },
          borders: { top: { style: docx.BorderStyle.NONE, size: 0, color: 'FFFFFF' }, bottom: { style: docx.BorderStyle.NONE, size: 0, color: 'FFFFFF' }, left: { style: docx.BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: docx.BorderStyle.NONE, size: 0, color: 'FFFFFF' }, insideHorizontal: { style: docx.BorderStyle.NONE, size: 0, color: 'FFFFFF' }, insideVertical: { style: docx.BorderStyle.NONE, size: 0, color: 'FFFFFF' } },
          rows: [new docx.TableRow({ children: [
            new docx.TableCell({ borders: { top: { style: docx.BorderStyle.SINGLE, size: 4, color: '111827' } }, margins: { top: 100 }, children: [
              new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: 'Tebliğ Eden', size: 18, color: '64748B' })] }),
              new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { before: 100 }, children: [new docx.TextRun({ text: bsAtama.baskan || '-', bold: true })] }),
              new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: 'Kurul Başkanı', size: 18 })] })
            ] }),
            new docx.TableCell({ borders: { top: { style: docx.BorderStyle.SINGLE, size: 4, color: '111827' } }, margins: { top: 100 }, children: [
              new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: 'Tebellüğ Eden', size: 18, color: '64748B' })] }),
              new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, spacing: { before: 100 }, children: [new docx.TextRun({ text: imza.adSoyad || '-', bold: true })] }),
              new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: imza.kuruldakiGorev || imza.unvan || '-', size: 18 })] })
            ] })
          ] })]
        })
      ]
    }]
  });

  const blob = await docx.Packer.toBlob(doc);
  saveAs(blob, `Atama_Yazisi_${(imza.adSoyad || 'kisi').replace(/[^\p{L}\p{N}]+/gu, '_')}.docx`);
}

// ==================== 6) STANDALONE İMZA LİSTESİ (WORD/PDF) ====================
// Eski üretim uygulamasındaki ayrı btnSigWord/btnSigPDF butonlarının karşılığı
// — tam Kurul Raporu'nun içine gömülü değil, yalnızca imza listesinin tek
// başına yazdırılabilir/dolaştırılabilir bir belge olarak çıkarılması.

async function imzaListesiWordOlustur() {
  const toplanti = toplantiIdIleGetirRepo(_toplantiId);
  if (!toplanti) return;

  const imzalar = toplantiImzalariniGetir(_toplantiId);

  const doc = new docx.Document({
    sections: [{
      children: [
        new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: _denetimAktifFirmaAdi(), bold: true })] }),
        new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: 'İSG KURULU İMZA LİSTESİ', bold: true, size: 28 })], spacing: { after: 200 } }),
        new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: [new docx.TextRun({ text: `${toplanti.toplantiNo} — ${_ciktiDonemMetni(toplanti)} — ${_ciktiTarihSaat(toplanti)}` })], spacing: { after: 400 } }),
        new docx.Table({
          width: { size: 100, type: docx.WidthType.PERCENTAGE },
          rows: [
            // Kullanıcı isteği: sütun genişlikleri artırıldı (eşit dörtte-bir
            // varsayılanı yerine SIRA dar, diğer üç sütun daha geniş).
            new docx.TableRow({
              children: [
                ['SIRA', 8], ['ADI VE SOYADI', 30], ['ÜNVAN / KURULDAKİ GÖREVİ', 30], ['İMZA', 32]
              ].map(([baslik, genislik]) =>
                new docx.TableCell({ width: { size: genislik, type: docx.WidthType.PERCENTAGE }, children: [new docx.Paragraph({ spacing: { before: 120, after: 120 }, children: [new docx.TextRun({ text: baslik, bold: true })] })] })
              )
            }),
            ...imzalar.map(i => new docx.TableRow({
              height: { value: 350, rule: docx.HeightRule.ATLEAST },
              children: [
                new docx.TableCell({ children: [new docx.Paragraph({ text: i.siraNo, spacing: { before: 60, after: 60 } })] }),
                new docx.TableCell({ children: [new docx.Paragraph({ text: i.adSoyad, spacing: { before: 60, after: 60 } })] }),
                new docx.TableCell({ children: [new docx.Paragraph({ text: [i.unvan, i.kuruldakiGorev].filter(Boolean).join(' / '), spacing: { before: 60, after: 60 } })] }),
                new docx.TableCell({ children: [new docx.Paragraph({ text: '', spacing: { before: 60, after: 60 } })] })
              ]
            }))
          ]
        })
      ]
    }]
  });

  const blob = await docx.Packer.toBlob(doc);
  saveAs(blob, `Imza_Listesi_${toplanti.toplantiNo}.docx`);
}

async function imzaListesiPdfOlustur() {
  const toplanti = toplantiIdIleGetirRepo(_toplantiId);
  if (!toplanti) return;

  const imzalar = toplantiImzalariniGetir(_toplantiId);

  const html = `
  <div id="kurulImzaPdf">
    <style>
      #kurulImzaPdf{ font-family: Arial, Helvetica, sans-serif; color:#111827; font-size:10pt; width:100%; }
      #kurulImzaPdf h1{ text-align:center; font-size:16pt; margin:0 0 4mm; }
      #kurulImzaPdf .alt{ text-align:center; font-size:10pt; color:#475569; margin:0 0 8mm; }
      #kurulImzaPdf table{ width:100%; border-collapse:collapse; }
      #kurulImzaPdf th{ background:#e5e7eb; border:1px solid #94a3b8; padding:5px 6px; font-size:9pt; }
      #kurulImzaPdf td{ border:1px solid #cbd5e1; padding:6px; height:11mm; font-size:9.5pt; }
    </style>
    <h1>${_ciktiKacir(_denetimAktifFirmaAdi())} — İSG KURULU İMZA LİSTESİ</h1>
    <div class="alt">${_ciktiKacir(toplanti.toplantiNo)} — ${_ciktiKacir(_ciktiDonemMetni(toplanti))} — ${_ciktiKacir(_ciktiTarihSaat(toplanti))}</div>
    ${_pdfTablo(['Sıra', 'Ad Soyad', 'Ünvan / Kuruldaki Görevi', 'İmza'], imzalar.map(i => [i.siraNo, i.adSoyad, [i.unvan, i.kuruldakiGorev].filter(Boolean).join(' / '), '']), '', [8, 27, 40, 25])}
  </div>`;

  const mount = document.getElementById('yazdirmaAlani');
  mount.innerHTML = html;
  mount.style.display = 'block';

  await html2pdf()
    .set({
      margin: [10, 10, 10, 10],
      filename: `Imza_Listesi_${toplanti.toplantiNo}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4', compress: true },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['tr'] }
    })
    .from(mount)
    .save();

  mount.innerHTML = '';
  mount.style.display = 'none';
}

// ==================== Buton bağlantıları ====================

function ciktiButonlariniBagla() {
  document.getElementById('btnInviteWord').addEventListener('click', async () => {
    try { await toplantiDavetiWordOlustur(); } catch (e) { console.error(e); alert('Davet üretilemedi: ' + (e.message || e)); }
  });
  document.getElementById('btnReportWord').addEventListener('click', async () => {
    await kurulRaporuWordOlustur();
  });
  document.getElementById('btnKonuBasliklariWord').addEventListener('click', async () => {
    await konuBasliklariWordOlustur();
  });
  document.getElementById('btnReportPDF').addEventListener('click', async () => {
    try {
      await kurulRaporuPdfOlustur();
    } catch (e) {
      console.error(e);
      alert('PDF üretilemedi: ' + (e.message || e));
    }
  });
  document.getElementById('btnPPTX').addEventListener('click', async () => {
    try {
      await pptxOlustur();
    } catch (e) {
      console.error(e);
      alert('PPTX üretilemedi: ' + (e.message || e));
    }
  });
  document.getElementById('btnKararNotFormu').addEventListener('click', async () => {
    try { await konuBasliklariWordOlustur(true); } catch (e) { console.error(e); alert('Not formu üretilemedi: ' + (e.message || e)); }
  });
  document.getElementById('btnFotoPPTX').addEventListener('click', async () => {
    try {
      await fotoSunumuPptxOlustur();
    } catch (e) {
      console.error(e);
      alert('Foto sunumu üretilemedi: ' + (e.message || e));
    }
  });
  document.getElementById('btnImzaListesiWord').addEventListener('click', async () => {
    await imzaListesiWordOlustur();
  });
  document.getElementById('btnImzaListesiPDF').addEventListener('click', async () => {
    try {
      await imzaListesiPdfOlustur();
    } catch (e) {
      console.error(e);
      alert('PDF üretilemedi: ' + (e.message || e));
    }
  });
  document.getElementById('btnFormAyarlari').addEventListener('click', () => formAyarlariModalAc('kurul', 'İSG Kurulu'));
}
