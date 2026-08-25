// Eğitim/Sertifika PDF çıktıları. Temel İSG Eğitimi için eski üretim
// uygulamasındaki certificate.js ile birebir aynı iki sayfalı belge (ön yüz:
// katılımcı bilgisi + imzalar, arka yüz: "Çalışanların İSG Eğitimlerinin Usul
// ve Esasları Hakkında Yönetmelik" ekindeki konu/süre tablosu) — konu listesi
// ve süre tablosu (tehlike sınıfı × ilk/tekrar) verbatim taşındı. Çok-kiracılı
// yapıya uyum için: sabit "BAGFAS" belge no öneki yerine firma slug'ı, İSG
// Uzmanı/İşyeri Hekimi imza adları eski uygulamadaki "hizmet sözleşmesi"
// köprüsü yerine risk360'ın kendi Hizmet Sözleşmeleri modülünden (en güncel,
// feshedilmemiş kayıt) okunur. "İlk mi Tekrar mı" eski uygulamada ayrı bir
// manuel seçimdi; burada personelin bu türdeki en eski kaydı olup olmadığına
// bakılarak otomatik belirlenir (ayrı bir alan tutmaya gerek kalmaz). Diğer
// eğitim/sertifika türleri (İş Başı, MYK, İlkyardım vb.) için tek sayfalık
// sade bir sertifika/belge şablonu kullanılır.

function _sertKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// ---- Temel İSG Eğitimi: konu listesi + süre tablosu (yönetmelik eki, verbatim) ----

const _EGITIM_KONULARI = {
  genel: [
    'a) Çalışma mevzuatı ile ilgili bilgiler',
    'b) Çalışanların yasal hak ve sorumlulukları',
    'c) İşyeri temizliği ve düzeni',
    'ç) İş kazası ve meslek hastalığından doğan hukuki sonuçlar'
  ],
  saglik: [
    'a) Meslek hastalıklarının sebepleri',
    'b) Hastalıktan korunma prensipleri ve korunma tekniklerinin uygulanması',
    'c) Biyolojik ve psikososyal risk etmenleri',
    'ç) İlkyardım',
    'd) Bağımlılık yapıcı maddelerin zararları ve teknoloji bağımlılığı'
  ],
  teknik: [
    'a) Kimyasal, fiziksel ve ergonomik risk etmenleri',
    'b) Elle kaldırma ve taşıma',
    'c) Parlama, patlama',
    'ç) Yangın ve yangından korunma',
    'd) İş ekipmanlarının güvenli kullanımı',
    'e) Ekranlı araçlarla çalışma',
    'f) Elektrik, tehlikeleri, riskleri ve önlemleri',
    'g) İş kazalarının sebepleri ve korunma prensipleri ile tekniklerinin uygulanması',
    'ğ) Sağlık ve güvenlik işaretleri',
    'h) Kişisel koruyucu donanım kullanımı',
    'ı) İş sağlığı ve güvenliği genel kuralları ve güvenlik kültürü',
    'i) Acil durum planı, tahliye ve kurtarma'
  ]
};

const _EGITIM_SURE_PLANI = {
  ilk: {
    'Çok Tehlikeli': {
      genel: [30, 30, 30, 30], saglik: [30, 20, 20, 30, 20], teknik: [60, 30, 30, 45, 45, 30, 30, 45, 30, 45, 45, 45],
      diger: [['Risk değerlendirmesi', 60], ['İş izin sistemi', 30], ['Acil durum planı', 40], ['Kimyasallar', 50], ['Patlamadan korunma', 20], ['Yüksekte çalışma', 20], ['Kapalı alanda çalışma uygulamaları', 20]]
    },
    'Tehlikeli': {
      genel: [30, 30, 30, 30], saglik: [30, 20, 20, 30, 20], teknik: [40, 20, 20, 40, 40, 10, 20, 30, 20, 20, 20, 20],
      diger: [['Risk değerlendirmesi', 60], ['İş izin sistemi', 20], ['Acil durum planı', 30], ['Kimyasallar', 30], ['Patlamadan korunma', 10], ['Yüksekte çalışma', 10], ['Kapalı alanda çalışma uygulamaları', 20]]
    },
    'Az Tehlikeli': {
      genel: [20, 20, 25, 25], saglik: [15, 15, 15, 15, 30], teknik: [15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15],
      diger: [['Risk değerlendirmesi', 30], ['İş izin sistemi', 20], ['Acil durum planı', 15], ['Kimyasallar', 20], ['Patlamadan korunma', 10], ['Yüksekte çalışma', 10], ['Kapalı alanda çalışma uygulamaları', 15]]
    }
  },
  tekrar: {
    'Çok Tehlikeli': {
      genel: [15, 15, 15, 15], saglik: [10, 10, 10, 10, 20], teknik: Array(12).fill(10),
      diger: [['Risk değerlendirmesi', 60], ['İş izin sistemi', 30], ['Acil durum planı', 40], ['Kimyasallar', 50], ['Patlamadan korunma', 20], ['Yüksekte çalışma', 20], ['Kapalı alanda çalışma uygulamaları', 20]]
    },
    'Tehlikeli': {
      genel: [15, 15, 15, 15], saglik: [10, 10, 10, 10, 20], teknik: Array(12).fill(15),
      diger: [['Risk değerlendirmesi', 40], ['İş izin sistemi', 30], ['Acil durum planı', 20], ['Kimyasallar', 30], ['Patlamadan korunma', 20], ['Yüksekte çalışma', 20], ['Kapalı alanda çalışma uygulamaları', 20]]
    },
    'Az Tehlikeli': {
      genel: [20, 20, 20, 30], saglik: [15, 15, 15, 15, 30], teknik: Array(12).fill(15),
      diger: [['Risk değerlendirmesi', 30], ['İş izin sistemi', 20], ['Acil durum planı', 15], ['Kimyasallar', 20], ['Patlamadan korunma', 10], ['Yüksekte çalışma', 10], ['Kapalı alanda çalışma uygulamaları', 15]]
    }
  }
};

function _egitimToplamDakika(plan) {
  const toplam = arr => arr.reduce((a, b) => a + (Number(b) || 0), 0);
  return toplam(plan.genel) + toplam(plan.saglik) + toplam(plan.teknik) + plan.diger.reduce((a, r) => a + (Number(r[1]) || 0), 0);
}

function _egitimSaatMetni(dakika) {
  const saat = dakika / 60;
  return Number.isInteger(saat) ? `${saat} Saat` : `${saat.toFixed(2).replace('.', ',')} Saat`;
}

// Personelin bu eğitim türündeki en eski kaydıysa "ilk", değilse "tekrar".
function _egitimIlkMiTekrarMi(kayit, tumKayitlar) {
  const ayniKisi = tumKayitlar
    .filter(k => k.personelId === kayit.personelId && k.egitimTuruId === kayit.egitimTuruId)
    .sort((a, b) => (a.tarih || '').localeCompare(b.tarih || ''));
  return ayniKisi.length && ayniKisi[0].id === kayit.id ? 'ilk' : 'tekrar';
}

function _egitimBelgeNoUret(kayit, personel, firma) {
  const tarih = (kayit.tarih2 || kayit.tarih || '').replace(/-/g, '') || bugunIso().replace(/-/g, '');
  const onEk = ((firma && firma.slug) || 'isg').toUpperCase();
  return `${onEk}-ISG-${tarih}-${(personel && personel.sicilNo) || '0000'}`;
}

// En güncel, feshedilmemiş Hizmet Sözleşmesi kaydından ad soyad getirir.
function _egitimGorevliAdiGetir(gorevTuru) {
  const liste = (typeof hizmetSozlesmeleriTumunuGetir === 'function' ? hizmetSozlesmeleriTumunuGetir() : [])
    .filter(k => k.gorevTuru === gorevTuru && k.durum !== 'Feshedildi')
    .sort((a, b) => (b.sozlesmeBaslangicTarihi || '').localeCompare(a.sozlesmeBaslangicTarihi || ''));
  return liste[0] ? liste[0].adSoyad : '';
}

function _egitimImzaSatirlariHtml() {
  const isg = _egitimGorevliAdiGetir('İSG Uzmanı');
  const hekim = _egitimGorevliAdiGetir('İşyeri Hekimi');
  return `
    <div class="egt-imzalar">
      <div><span>${_sertKacir(isg) || '&nbsp;'}</span><b>İş Güvenliği Uzmanı</b><em>İmza</em></div>
      <div><span>${_sertKacir(hekim) || '&nbsp;'}</span><b>İşyeri Hekimi</b><em>İmza</em></div>
      <div><span>&nbsp;</span><b>İşveren Vekili</b><em>İmza</em></div>
    </div>
  `;
}

function _egitimOrtakStilHtml(kokSelector) {
  return `
    <style>
      ${kokSelector}{ font-family: Arial, Helvetica, sans-serif; color:#111827; background:#fff; width:100%; }
      ${kokSelector} *{ box-sizing:border-box; }
      ${kokSelector} .egt-sayfa{ box-sizing:border-box; border:3px solid #0b2c52; padding:12mm; position:relative; overflow:hidden; background:#fff; }
      ${kokSelector} .egt-yatay{ width:297mm; height:210mm; }
      ${kokSelector} .egt-dikey{ width:210mm; height:297mm; }
      ${kokSelector} .egt-ustbilgi{ display:flex; align-items:center; gap:8mm; border-bottom:2px solid #0b2c52; padding-bottom:5mm; margin-bottom:6mm; }
      ${kokSelector} .egt-logo{ max-width:26mm; max-height:18mm; }
      ${kokSelector} .egt-baslik-blok{ flex:1; }
      ${kokSelector} .egt-baslik{ font-size:17pt; font-weight:800; color:#0b2c52; margin:0; }
      ${kokSelector} .egt-belgeno{ font-size:9pt; color:#374151; margin-top:2mm; }
      ${kokSelector} .egt-metin{ font-size:10.5pt; line-height:1.7; margin:0 0 6mm; }
      ${kokSelector} table.egt-bilgi{ width:100%; border-collapse:collapse; margin-bottom:8mm; }
      ${kokSelector} table.egt-bilgi th{ text-align:left; background:#f1f5f9; font-size:9pt; font-weight:700; padding:2.5mm 3mm; border:1px solid #cbd5e1; width:22%; }
      ${kokSelector} table.egt-bilgi td{ font-size:10pt; padding:2.5mm 3mm; border:1px solid #cbd5e1; }
      ${kokSelector} .egt-tarih{ text-align:right; font-size:9pt; color:#374151; margin-bottom:8mm; }
      ${kokSelector} .egt-imzalar{ display:flex; justify-content:space-between; gap:6mm; margin-top:10mm; }
      ${kokSelector} .egt-imzalar > div{ flex:1; text-align:center; border-top:1px solid #94a3b8; padding-top:2mm; }
      ${kokSelector} .egt-imzalar span{ display:block; font-weight:700; font-size:9.5pt; min-height:5mm; }
      ${kokSelector} .egt-imzalar b{ display:block; font-size:8.5pt; color:#374151; margin-top:1mm; }
      ${kokSelector} .egt-imzalar em{ display:block; font-size:7.5pt; color:#94a3b8; font-style:normal; margin-top:1mm; }
      ${kokSelector} .egt-altbilgi{ position:absolute; bottom:6mm; left:12mm; right:12mm; text-align:center; font-size:7.5pt; color:#94a3b8; }
      ${kokSelector} table.egt-konu{ width:100%; border-collapse:collapse; }
      ${kokSelector} table.egt-konu th{ background:#5b82ab; color:#fff; font-size:8.5pt; padding:2mm 3mm; text-transform:uppercase; text-align:left; }
      ${kokSelector} table.egt-konu td{ font-size:8.5pt; padding:1.6mm 3mm; border-bottom:1px solid #e2e8f0; }
      ${kokSelector} .egt-konu-baslik td{ font-weight:700; background:#f1f5f9; color:#0b2c52; }
      ${kokSelector} .egt-konu-toplam td{ font-weight:700; border-top:1.5px solid #0b2c52; }
      ${kokSelector} .egt-genel-toplam td{ font-weight:800; font-size:10pt; background:#5b82ab; color:#fff; }
      ${kokSelector} .center{ text-align:center; }
    </style>
  `;
}

function _egitimKonuSatirlariHtml(baslik, konular, sureler) {
  const govde = konular.map((k, i) => `<tr><td>${_sertKacir(k)}</td><td class="center">${_sertKacir(sureler[i] || 0)} dk</td></tr>`).join('');
  const toplam = sureler.reduce((a, b) => a + (Number(b) || 0), 0);
  return `
    <tr class="egt-konu-baslik"><td colspan="2">${_sertKacir(baslik)}</td></tr>
    ${govde}
    <tr class="egt-konu-toplam"><td>${_sertKacir(baslik)} toplamı</td><td class="center">${_sertKacir(_egitimSaatMetni(toplam))}</td></tr>
  `;
}

// ---- Temel İSG Eğitimi: iki sayfalı resmi belge ----

// Sertifika oluşturmadan önce kullanıcının değiştirebileceği varsayılanlar
// (tehlike sınıfı firmadan, ilk/tekrar personelin kayıt geçmişinden gelir).
function egitimTemelSertifikaVarsayilaniHesapla(kayit, firma) {
  const tumKayitlar = egitimKayitlariTumunuGetir();
  return {
    ilkTekrar: _egitimIlkMiTekrarMi(kayit, tumKayitlar),
    tehlikeSinifi: TEHLIKE_SINIFLARI.includes(firma && firma.tehlikeSinifi) ? firma.tehlikeSinifi : 'Az Tehlikeli'
  };
}

// Sertifika Ayarları penceresindeki canlı süre önizlemesi için.
function egitimTemelSertifikaSuresiHesapla(tehlikeSinifi, ilkTekrar) {
  const plan = _EGITIM_SURE_PLANI[ilkTekrar === 'tekrar' ? 'tekrar' : 'ilk'][TEHLIKE_SINIFLARI.includes(tehlikeSinifi) ? tehlikeSinifi : 'Az Tehlikeli'];
  return _egitimToplamDakika(plan);
}

async function _egitimTemelSertifikasiOlustur(kayit, personel, firma, secim) {
  const varsayilan = egitimTemelSertifikaVarsayilaniHesapla(kayit, firma);
  const ilkTekrar = (secim && secim.ilkTekrar) || varsayilan.ilkTekrar;
  const tehlikeSinifi = (secim && TEHLIKE_SINIFLARI.includes(secim.tehlikeSinifi)) ? secim.tehlikeSinifi : varsayilan.tehlikeSinifi;
  const plan = _EGITIM_SURE_PLANI[ilkTekrar][tehlikeSinifi];
  const dakika = _egitimToplamDakika(plan);
  const bitisTarihi = egitimBitisTarihiHesapla(kayit, egitimTuruGetir('temel_isg'), firma);
  const belgeNo = _egitimBelgeNoUret(kayit, personel, firma);
  const logo = firmaLogoGetir(firma.id);
  const egitimAdiBaslik = 'TEMEL İŞ SAĞLIĞI VE GÜVENLİĞİ EĞİTİMİ';
  const egitimTarihiGoruntu = kayit.tarih2 ? `${gunAyYil(kayit.tarih)} - ${gunAyYil(kayit.tarih2)}` : gunAyYil(kayit.tarih);

  const on = `
    <section class="egt-sayfa egt-yatay">
      <div class="egt-ustbilgi">
        ${logo ? `<img class="egt-logo" src="${logo}">` : ''}
        <div class="egt-baslik-blok">
          <div class="egt-baslik">${egitimAdiBaslik}</div>
          <div class="egt-belgeno">Belge No: ${_sertKacir(belgeNo)}</div>
        </div>
      </div>

      <p class="egt-metin">
        İşbu belge, <b>${_sertKacir(personel.adSoyad)}</b> adına; Çalışanların İş Sağlığı ve Güvenliği Eğitimlerinin Usul ve Esasları Hakkında Yönetmelik
        kapsamında <b>Temel İş Sağlığı ve Güvenliği Eğitimi</b>'ni tamamlaması üzerine düzenlenmiştir.
      </p>

      <table class="egt-bilgi">
        <tr><th>Adı Soyadı</th><td>${_sertKacir(personel.adSoyad)}</td><th>Sicil No</th><td>${_sertKacir(personel.sicilNo)}</td></tr>
        <tr><th>Görevi</th><td>${_sertKacir(personel.gorev)}</td><th>Bölüm</th><td>${_sertKacir(personel.bolum)}</td></tr>
        <tr><th>İşyeri Ünvanı</th><td>${_sertKacir(personel.isveren || firma.ad)}</td><th>Tehlike Sınıfı</th><td>${_sertKacir(tehlikeSinifi)}</td></tr>
        <tr><th>Eğitim Tarihi</th><td>${_sertKacir(egitimTarihiGoruntu)}</td><th>Geçerlilik Tarihi</th><td>${_sertKacir(gunAyYil(bitisTarihi))}</td></tr>
        <tr><th>Eğitim Süresi</th><td>${_sertKacir(_egitimSaatMetni(dakika))} (${dakika} dk)</td><th>Eğitim Şekli</th><td>☑ Yüz yüze &nbsp;&nbsp; ☐ Uzaktan</td></tr>
        <tr><th>Eğitim Türü</th><td colspan="3">${ilkTekrar === 'tekrar' ? '☐' : '☑'} İlk defa verilen temel eğitim &nbsp;&nbsp;&nbsp; ${ilkTekrar === 'tekrar' ? '☑' : '☐'} Tekrar verilen temel eğitim</td></tr>
      </table>

      <div class="egt-tarih">${_sertKacir(gunAyYil(kayit.tarih2 || kayit.tarih))}</div>

      ${_egitimImzaSatirlariHtml()}

      <div class="egt-altbilgi">Eğitim içeriği ve konu bazlı süreler belgenin ikinci sayfasındadır.</div>
    </section>
  `;

  const arka = `
    <section class="egt-sayfa egt-dikey" id="egtArkaSayfa">
      <div class="egt-ustbilgi">
        <div class="egt-baslik-blok">
          <div class="egt-baslik" style="font-size:13pt;">EĞİTİM KONULARI VE SÜRELERİ</div>
          <div class="egt-belgeno">Katılımcı: ${_sertKacir(personel.adSoyad)} &nbsp;|&nbsp; Tehlike Sınıfı: ${_sertKacir(tehlikeSinifi)} &nbsp;|&nbsp; Toplam: ${_sertKacir(_egitimSaatMetni(dakika))}</div>
        </div>
      </div>

      <table class="egt-konu">
        <thead><tr><th>EĞİTİM KONULARI</th><th class="center">SÜRE</th></tr></thead>
        <tbody>
          ${_egitimKonuSatirlariHtml('1. Genel Konular', _EGITIM_KONULARI.genel, plan.genel)}
          ${_egitimKonuSatirlariHtml('2. Sağlık Konuları', _EGITIM_KONULARI.saglik, plan.saglik)}
          ${_egitimKonuSatirlariHtml('3. Teknik Konular', _EGITIM_KONULARI.teknik, plan.teknik)}
          <tr class="egt-konu-baslik"><td colspan="2">4. İşe ve işyerine özgü riskler / risk değerlendirmesine dayalı konular</td></tr>
          ${plan.diger.map(([k, s]) => `<tr><td>${_sertKacir(k)}</td><td class="center">${_sertKacir(s)} dk</td></tr>`).join('')}
          <tr class="egt-konu-toplam"><td>4. Diğer konular toplamı</td><td class="center">${_sertKacir(_egitimSaatMetni(plan.diger.reduce((a, r) => a + (Number(r[1]) || 0), 0)))}</td></tr>
          <tr class="egt-genel-toplam"><td>GENEL TOPLAM</td><td class="center">${_sertKacir(_egitimSaatMetni(dakika))}</td></tr>
        </tbody>
      </table>
    </section>
  `;

  const html = `<div id="egtSertifikaPdf">${_egitimOrtakStilHtml('#egtSertifikaPdf')}${on}${arka}</div>`;

  const mount = document.getElementById('yazdirmaAlani');
  mount.innerHTML = html;
  mount.style.display = 'block';

  const dosyaAdi = `${personel.adSoyad}_Temel_ISG_Sertifikasi`.replace(/[^\p{L}\p{N}]+/gu, '_');

  const onCanvas = await _egitimSayfaCanvasaCevir(mount.querySelector('.egt-yatay'));
  const arkaCanvas = await _egitimSayfaCanvasaCevir(mount.querySelector('.egt-dikey'));

  const pdf = new jspdf.jsPDF('l', 'mm', 'a4');
  pdf.addImage(onCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 297, 210);
  pdf.addPage('a4', 'p');
  pdf.addImage(arkaCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, 297);
  pdf.save(`${dosyaAdi}.pdf`);

  mount.innerHTML = '';
  mount.style.display = 'none';
}

// Sayfayı, kendi mm cinsinden CSS boyutuyla birebir oranlı yakalar (aspect
// ratio bozulmasın diye) — böylece jsPDF'e tam sayfa (kenar boşluksuz)
// addImage ile basılır; sayfanın kendi border/padding'i görsel kenar boşluğu
// görevi görür.
async function _egitimSayfaCanvasaCevir(el) {
  return await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
}

// ---- Diğer eğitim/sertifika türleri: tek sayfalık sade belge ----

async function _egitimGenelSertifikasiOlustur(kayit, personel, tur, firma) {
  const bitisTarihi = egitimBitisTarihiHesapla(kayit, tur, firma);
  const belgeNo = _egitimBelgeNoUret(kayit, personel, firma);
  const logo = firmaLogoGetir(firma.id);
  const gecerlilikMetni = tur.hesaplama === 'tek' ? 'Süresiz' : (bitisTarihi ? gunAyYil(bitisTarihi) : '-');

  const html = `
    <div id="egtSertifikaPdf">
      ${_egitimOrtakStilHtml('#egtSertifikaPdf')}
      <section class="egt-sayfa egt-yatay">
        <div class="egt-ustbilgi">
          ${logo ? `<img class="egt-logo" src="${logo}">` : ''}
          <div class="egt-baslik-blok">
            <div class="egt-baslik">${_sertKacir(tur.ad).toUpperCase()} BELGESİ</div>
            <div class="egt-belgeno">Belge No: ${_sertKacir(belgeNo)}</div>
          </div>
        </div>

        <p class="egt-metin">
          İşbu belge, <b>${_sertKacir(personel.adSoyad)}</b> adına; <b>${_sertKacir(tur.ad)}</b>'ni tamamlaması üzerine düzenlenmiştir.
        </p>

        <table class="egt-bilgi">
          <tr><th>Adı Soyadı</th><td>${_sertKacir(personel.adSoyad)}</td><th>Sicil No</th><td>${_sertKacir(personel.sicilNo)}</td></tr>
          <tr><th>Görevi</th><td>${_sertKacir(personel.gorev)}</td><th>Bölüm</th><td>${_sertKacir(personel.bolum)}</td></tr>
          <tr><th>Firma</th><td>${_sertKacir(personel.isveren || firma.ad)}</td><th>Eğitim/Belge Tarihi</th><td>${_sertKacir(gunAyYil(kayit.tarih))}</td></tr>
          <tr><th>Geçerlilik</th><td>${_sertKacir(gecerlilikMetni)}</td><th>Süre</th><td>${kayit.saat ? _sertKacir(kayit.saat) + ' Saat' : '-'}</td></tr>
        </table>

        <div class="egt-tarih">${_sertKacir(gunAyYil(kayit.tarih))}</div>

        ${_egitimImzaSatirlariHtml()}
      </section>
    </div>
  `;

  const mount = document.getElementById('yazdirmaAlani');
  mount.innerHTML = html;
  mount.style.display = 'block';

  const dosyaAdi = `${personel.adSoyad}_${tur.ad}_Sertifikasi`.replace(/[^\p{L}\p{N}]+/gu, '_');

  const canvas = await _egitimSayfaCanvasaCevir(mount.querySelector('.egt-yatay'));
  const pdf = new jspdf.jsPDF('l', 'mm', 'a4');
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 297, 210);
  pdf.save(`${dosyaAdi}.pdf`);

  mount.innerHTML = '';
  mount.style.display = 'none';
}

// ---- Genel API ----

async function egitimSertifikasiOlustur(id, secim) {
  const kayit = egitimKaydiIdIleGetirRepo(id);
  if (!kayit) return;
  const personel = personelIdIleGetirRepo(kayit.personelId);
  const tur = egitimTuruGetir(kayit.egitimTuruId);
  const firma = aktifFirmaGetir();

  if (!tur || !personel || !firma) {
    alert('Sertifika oluşturulamadı: kayıt, personel ya da firma bilgisi eksik.');
    return;
  }

  if (tur.id === 'temel_isg') {
    await _egitimTemelSertifikasiOlustur(kayit, personel, firma, secim);
  } else {
    await _egitimGenelSertifikasiOlustur(kayit, personel, tur, firma);
  }
}

// ==================== İSG EĞİTİM VE MYK RAPORU ====================
// Eski üretim uygulamasındaki "İSG Eğitim ve MYK Raporu" ile aynı bölüm
// yapısı: Temel İSG (var/eksik), bu yıl işbaşı yapanların uyumu, yükseklik/
// kapalı alan/iş izni eğitimi alanlar, ilkyardım sertifikası + tehlike
// sınıfına göre yeterlilik değerlendirmesi, forklift/iş makinası belgesi
// olanlar, MYK belgeleri listesi.

function _egtRaporKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function _egtRaporTablo(basliklar, satirlar, satirFn, bosMesaj) {
  return `
    <table class="egt-rapor-tablo">
      <thead><tr>${basliklar.map(h => `<th>${_egtRaporKacir(h)}</th>`).join('')}</tr></thead>
      <tbody>
        ${satirlar.length ? satirlar.map(satirFn).join('') : `<tr><td colspan="${basliklar.length}" style="text-align:center; color:#64748b;">${_egtRaporKacir(bosMesaj || 'Kayıt bulunmamaktadır.')}</td></tr>`}
      </tbody>
    </table>
  `;
}

function _egtRaporBolum(baslik, icerikHtml) {
  return `
    <div class="egt-rapor-bolum">
      <h2>${_egtRaporKacir(baslik)}</h2>
      ${icerikHtml}
    </div>
  `;
}

const _EGT_RAPOR_STIL = `
  #egtRaporKok{ font-family: Arial, Helvetica, sans-serif; color:#111827; background:#fff; font-size:9pt; width:100%; }
  #egtRaporKok *{ box-sizing:border-box; }

  #egtRaporKok .egt-rapor-ustbilgi{ display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:6mm; border-bottom:2px solid #111827; padding-bottom:3mm; }
  #egtRaporKok .egt-rapor-ustbilgi h1{ margin:0; font-size:16pt; color:#111827; }
  #egtRaporKok .egt-rapor-meta{ font-size:9pt; color:#374151; text-align:right; }

  #egtRaporKok .egt-rapor-bolum{ margin-bottom:6mm; }
  #egtRaporKok .egt-rapor-bolum h2{ font-size:12pt; color:#111827; border-bottom:2px solid #111827; padding-bottom:2mm; margin:0 0 3mm; }
  #egtRaporKok .egt-rapor-bolum h3{ font-size:10pt; color:#111827; margin:4mm 0 2mm; }

  #egtRaporKok table.egt-rapor-tablo{ width:100%; border-collapse:collapse; table-layout:fixed; margin-bottom:3mm; }
  #egtRaporKok table.egt-rapor-tablo th{ background:#e5e7eb; color:#111827; font-size:8pt; padding:3px 5px; border:1px solid #94a3b8; text-align:left; }
  #egtRaporKok table.egt-rapor-tablo td{ font-size:8.3pt; padding:3px 5px; border:1px solid #cbd5e1; vertical-align:top; overflow-wrap:anywhere; }
  #egtRaporKok table.egt-rapor-tablo tr{ page-break-inside:avoid; }

  #egtRaporKok .egt-not{ padding:2.5mm 3mm; border:1px solid #94a3b8; margin-bottom:3mm; font-size:8.5pt; }
  #egtRaporKok .egt-not.ok{ background:#f0fdf4; border-color:#16a34a; color:#166534; }
  #egtRaporKok .egt-not.warn{ background:#fffbeb; border-color:#eab308; color:#92400e; }

  #egtRaporKok .egt-rozet{ display:inline-block; padding:1px 7px; border-radius:999px; font-size:7.5pt; font-weight:700; margin-left:4px; white-space:nowrap; }
  #egtRaporKok .egt-rozet.ok{ background:#dcfce7; color:#166534; border:1px solid #16a34a; }
`;

function _egtDurumSatiri(s, alanlar) {
  return `
    <tr>
      <td>${_egtRaporKacir(s.personel.sicilNo)}</td>
      <td>${_egtRaporKacir(s.personel.adSoyad)}</td>
      <td>${_egtRaporKacir(s.personel.bolum) || '-'}</td>
      ${alanlar}
    </tr>
  `;
}

// Bir kök elemanı yakalayıp, kendi doğal (sayfadan uzun olabilen) yüksekliğini
// gerçek A4 sayfa yüksekliğine göre PİKSEL BAZINDA kendi dilimleyip PDF'e
// sayfa sayfa ekler -- html2pdf'in css/legacy modlarındaki tahmine dayalı
// otomatik sayfalamasına GÜVENİLMEZ (bu modüldeki diğer raporlarda tekrar
// tekrar başlıksız/gereksiz boş sayfa sorununa yol açtığı görüldü). Her
// "grup" (bkz. çağıran fonksiyon) kendi başlığıyla ayrı bir sayfa/sayfa
// dizisi olarak eklenir.
async function _egtGrubuPdfeEkle(pdf, kokEleman, ilkSayfaMi, icerikGenislikMm, kenarBosluguMm, sayfaYukseklikMm) {
  const canvas = await html2canvas(kokEleman, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
  // pxPerMm, YAKALANAN elemanın kendi genişliğinden (icerikGenislikMm) türetilir
  // -- sayfa toplam genişliğinden değil, aksi halde addImage'da oran bozulup
  // metin yatayda gerilmiş/sıkışmış görünür.
  const pxPerMm = canvas.width / icerikGenislikMm;
  const kullanilabilirYukseklikMm = sayfaYukseklikMm - kenarBosluguMm * 2;
  const sayfaYukseklikPx = Math.floor(kullanilabilirYukseklikMm * pxPerMm);
  const toplamParca = Math.max(1, Math.ceil(canvas.height / sayfaYukseklikPx));

  for (let i = 0; i < toplamParca; i++) {
    const parcaYukseklikPx = Math.min(sayfaYukseklikPx, canvas.height - i * sayfaYukseklikPx);
    const parcaCanvas = document.createElement('canvas');
    parcaCanvas.width = canvas.width;
    parcaCanvas.height = parcaYukseklikPx;
    const ctx = parcaCanvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, parcaCanvas.width, parcaCanvas.height);
    ctx.drawImage(canvas, 0, i * sayfaYukseklikPx, canvas.width, parcaYukseklikPx, 0, 0, canvas.width, parcaYukseklikPx);

    if (!(ilkSayfaMi && i === 0)) pdf.addPage('a4', 'p');
    const parcaYukseklikMm = parcaYukseklikPx / pxPerMm;
    pdf.addImage(parcaCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', kenarBosluguMm, kenarBosluguMm, icerikGenislikMm, parcaYukseklikMm);
  }
}

async function egitimMykRaporuPdfOlustur() {
  const firma = aktifFirmaGetir();
  if (!firma) { alert('Aktif firma bulunamadı.'); return; }

  const veri = egitimMykRaporuVerisiHazirla(firma);
  if (!veri.satirlar.length) { alert('Rapor oluşturulacak aktif personel kaydı yok.'); return; }

  const temelIsgVarOlanlar = veri.satirlar.filter(s => s.temelIsg.varMi);
  const temelIsgEksikOlanlar = veri.satirlar.filter(s => !s.temelIsg.varMi);
  const buYilIsbasiYapanlar = veri.satirlar.filter(s => s.buYilIsbasiMi);
  const buYilHepsiTemelIsgVarMi = buYilIsbasiYapanlar.every(s => s.temelIsg.varMi);

  const trainingBolumu = (baslik, alanAdi) => _egtRaporBolum(baslik, _egtRaporTablo(
    ['Sicil', 'Ad Soyad', 'Bölüm', 'Geçerlilik'],
    veri.satirlar.filter(s => s[alanAdi].varMi),
    s => _egtDurumSatiri(s, `<td>${_egtRaporKacir(s[alanAdi].tarihMetni) || '-'}</td>`),
    'Bu eğitimi almış personel bulunmamaktadır.'
  ));

  const certBolumu = (baslik, alanAdi) => _egtRaporBolum(baslik, _egtRaporTablo(
    ['Sicil', 'Ad Soyad', 'Bölüm', 'Geçerlilik'],
    veri.satirlar.filter(s => s[alanAdi].varMi),
    s => _egtDurumSatiri(s, `<td>${_egtRaporKacir(s[alanAdi].tarihMetni) || '-'}</td>`),
    'Bu belgeye sahip personel bulunmamaktadır.'
  ));

  const iy = veri.ilkyardimUygunluk;

  // Her biri AYRI bir sayfa grubu olarak eklenecek bölümler. İlkine üstbilgi
  // eklenir; her grup kendi doğal uzunluğuna göre gerekirse birden çok
  // fiziksel PDF sayfasına yayılır (bkz. _egtGrubuPdfeEkle).
  const gruplar = [
    `
    <div class="egt-rapor-ustbilgi">
      <h1>İSG EĞİTİM VE MYK RAPORU</h1>
      <div class="egt-rapor-meta">
        ${_egtRaporKacir(firma.ad)}<br>
        Rapor Tarihi: ${_egtRaporKacir(gunAyYil(new Date().toISOString().slice(0, 10)))} | Personel Sayısı: ${veri.satirlar.length}
      </div>
    </div>
    ${_egtRaporBolum('1. Temel İSG Eğitimleri', `
      ${_egtRaporTablo(
        ['Sicil', 'Ad Soyad', 'Bölüm', 'Son Geçerlilik'],
        temelIsgVarOlanlar,
        s => _egtDurumSatiri(s, `<td>${_egtRaporKacir(s.temelIsg.tarihMetni)} <span class="egt-rozet ok">✓ Uygun</span></td>`)
      )}
      <h3>Temel İSG eğitimi alması gereken kişiler</h3>
      ${_egtRaporTablo(
        ['Sicil', 'Ad Soyad', 'Bölüm'],
        temelIsgEksikOlanlar,
        s => `<tr><td>${_egtRaporKacir(s.personel.sicilNo)}</td><td>${_egtRaporKacir(s.personel.adSoyad)}</td><td>${_egtRaporKacir(s.personel.bolum) || '-'}</td></tr>`,
        'Tüm personelin Temel İSG eğitimi güncel.'
      )}
    `)}
    `,
    _egtRaporBolum('2. Bu Yıl İşbaşı Yapan Personel', `
      <div class="egt-not ${buYilHepsiTemelIsgVarMi ? 'ok' : 'warn'}">
        ${buYilHepsiTemelIsgVarMi
          ? `Bu yıl (${veri.buYil}) işbaşı yapan personelin tamamı Temel İSG eğitimi almıştır.`
          : `Bu yıl (${veri.buYil}) işbaşı yapan personel içinde Temel İSG eğitimi eksik olan kişiler bulunmaktadır.`}
      </div>
      ${_egtRaporTablo(
        ['Sicil', 'Ad Soyad', 'İşbaşı Tarihi', 'Temel İSG'],
        buYilIsbasiYapanlar,
        s => `<tr><td>${_egtRaporKacir(s.personel.sicilNo)}</td><td>${_egtRaporKacir(s.personel.adSoyad)}</td><td>${_egtRaporKacir(gunAyYil(s.personel.iseGirisTarihi))}</td><td>${_egtRaporKacir(s.temelIsg.tarihMetni) || '-'}</td></tr>`,
        'Bu yıl işbaşı yapan personel yok.'
      )}
    `),
    trainingBolumu('3. Yüksekte Çalışma Eğitimi Alanlar', 'yukseklik'),
    trainingBolumu('4. Kapalı Alanda Çalışma Eğitimi Alanlar', 'kapaliAlan'),
    trainingBolumu('5. İş İzni Eğitimi Alanlar', 'isIzni'),
    certBolumu('6. İlkyardım Sertifikası Olanlar', 'ilkyardim') + _egtRaporBolum('7. İlkyardım Uygunluk Değerlendirmesi', `
      ${_egtRaporTablo(
        ['Firma', 'Tehlike Sınıfı', 'Toplam Çalışan', 'Geçerli İlkyardımcı', 'Gerekli', 'Eksik', 'Durum'],
        [iy],
        () => `
          <tr>
            <td>${_egtRaporKacir(firma.ad)}</td>
            <td>${_egtRaporKacir(iy.tehlike)}</td>
            <td>${iy.toplam}</td>
            <td>${iy.mevcut}</td>
            <td>${iy.gerekli}</td>
            <td>${iy.eksik}</td>
            <td>${iy.uygun ? 'Uygun' : 'Uygun Değil'}</td>
          </tr>
        `
      )}
      <div class="egt-not ${iy.uygun ? 'ok' : 'warn'}">
        ${iy.uygun ? 'Yeterlilik durumu uygun.' : `Yeterlilik durumu uygun değil. En az ${iy.eksik} kişiye daha ilkyardım eğitimi aldırılmalı.`}
      </div>
    `),
    certBolumu('8. Forklift Operatörlük Belgesi Olanlar', 'forklift'),
    certBolumu('9. İş Makinası Operatörlük Belgesi Olanlar', 'isMakinasi'),
    _egtRaporBolum('10. MYK Belgeleri', _egtRaporTablo(
      ['Sicil', 'Ad Soyad', 'Bölüm', 'MYK Belgesi / Tarih'],
      veri.satirlar.filter(s => s.mykBelgeleri.length),
      s => `<tr><td>${_egtRaporKacir(s.personel.sicilNo)}</td><td>${_egtRaporKacir(s.personel.adSoyad)}</td><td>${_egtRaporKacir(s.personel.bolum) || '-'}</td><td>${s.mykBelgeleri.map(m => `${_egtRaporKacir(m.aciklama || 'MYK Belgesi')} (${_egtRaporKacir(m.tarihMetni)})`).join('<br>')}</td></tr>`,
      'MYK belgesi kaydı bulunmamaktadır.'
    ))
  ];

  const mount = document.getElementById('yazdirmaAlani');
  mount.style.display = 'block';

  const pdf = new jspdf.jsPDF('p', 'mm', 'a4');
  const KENAR_BOSLUGU_MM = 10;
  const icerikGenislikMm = pdf.internal.pageSize.getWidth() - KENAR_BOSLUGU_MM * 2;
  const sayfaYukseklikMm = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < gruplar.length; i++) {
    mount.innerHTML = `<div id="egtRaporKok" style="width:${icerikGenislikMm}mm; padding:0;"><style>${_EGT_RAPOR_STIL}</style>${gruplar[i]}</div>`;
    await _egtGrubuPdfeEkle(pdf, document.getElementById('egtRaporKok'), i === 0, icerikGenislikMm, KENAR_BOSLUGU_MM, sayfaYukseklikMm);
  }

  const toplamSayfa = pdf.internal.getNumberOfPages();
  const sayfaGenislikMm = pdf.internal.pageSize.getWidth();
  for (let i = 1; i <= toplamSayfa; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(100);
    pdf.text(`Sayfa ${i} / ${toplamSayfa}`, sayfaGenislikMm / 2, sayfaYukseklikMm - 5, { align: 'center' });
  }
  pdf.save(`Isg_Egitim_MYK_Raporu_${firma.ad.replace(/\s+/g, '_')}.pdf`);

  mount.innerHTML = '';
  mount.style.display = 'none';
}
