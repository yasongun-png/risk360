// Stajyer Temel Eğitim Belgesi çıktısı. Eğitim modülündeki Temel İSG Eğitimi
// sertifikasıyla (bkz. modules/egitim/cikti.js) aynı teknik ve görsel desen:
// html2canvas + jsPDF ile iki sayfalı gerçek PDF (ön yüz: katılımcı bilgisi +
// imzalar, arka yüz: konu/süre tablosu), Sertifika Ayarları penceresinden
// tehlike sınıfı seçimi, İSG Uzmanı/İşyeri Hekimi imzaları Hizmet
// Sözleşmeleri'nden. Konu listesi/süre tablosu zaten stajyer/model.js'te
// (SERTIFIKA_KONULARI/SERTIFIKA_PLANLARI) tanımlı — burada tekrar edilmez.
// Stajyerler için "ilk/tekrar" ayrımı yoktur (her zaman ilk temel eğitim).

function _sjSertKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function _sjBelgeNoUret(stajyer, firma) {
  const tarih = (stajyer.isgEgitimTarihi || bugunIso()).replace(/-/g, '');
  const onEk = ((firma && firma.slug) || 'isg').toUpperCase();
  return `${onEk}-STJ-${tarih}-${stajyer.stajNo || '0000'}`;
}

// En güncel, feshedilmemiş Hizmet Sözleşmesi kaydından ad soyad getirir.
function _sjGorevliAdiGetir(gorevTuru) {
  const liste = (typeof hizmetSozlesmeleriTumunuGetir === 'function' ? hizmetSozlesmeleriTumunuGetir() : [])
    .filter(k => k.gorevTuru === gorevTuru && k.durum !== 'Feshedildi')
    .sort((a, b) => (b.sozlesmeBaslangicTarihi || '').localeCompare(a.sozlesmeBaslangicTarihi || ''));
  return liste[0] ? liste[0].adSoyad : '';
}

function _sjImzaSatirlariHtml() {
  const isg = _sjGorevliAdiGetir('İSG Uzmanı');
  const hekim = _sjGorevliAdiGetir('İşyeri Hekimi');
  return `
    <div class="egt-imzalar">
      <div><span>${_sjSertKacir(isg) || '&nbsp;'}</span><b>İş Güvenliği Uzmanı</b><em>İmza</em></div>
      <div><span>${_sjSertKacir(hekim) || '&nbsp;'}</span><b>İşyeri Hekimi</b><em>İmza</em></div>
      <div><span>&nbsp;</span><b>İşveren Vekili</b><em>İmza</em></div>
    </div>
  `;
}

function _sjOrtakStilHtml(kokSelector) {
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

function _sjKonuSatirlariHtml(baslik, konular, sureler) {
  const govde = konular.map((k, i) => `<tr><td>${_sjSertKacir(k)}</td><td class="center">${_sjSertKacir(sureler[i] || 0)} dk</td></tr>`).join('');
  const toplam = sureler.reduce((a, b) => a + (Number(b) || 0), 0);
  return `
    <tr class="egt-konu-baslik"><td colspan="2">${_sjSertKacir(baslik)}</td></tr>
    ${govde}
    <tr class="egt-konu-toplam"><td>${_sjSertKacir(baslik)} toplamı</td><td class="center">${_sjSertKacir(dakikayiSaateCevir(toplam))}</td></tr>
  `;
}

async function _sjSayfaCanvasaCevir(el) {
  return await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
}

// Sertifika Ayarları penceresi için varsayılan/canlı süre hesabı.
function stajyerSertifikaSuresiHesapla(tehlikeSinifi) {
  const plan = sertifikaPlaniGetir(tehlikeSinifi);
  return sertifikaToplamDakikaHesapla(plan);
}

async function stajyerSertifikasiOlustur(id, secim) {
  const stajyer = stajyerIdIleGetirRepo(id);
  if (!stajyer || !stajyer.isgEgitimTarihi) {
    alert('Sertifika oluşturulamadı: Temel İSG Eğitim Tarihi girilmemiş.');
    return;
  }

  const firma = aktifFirmaGetir();
  if (!firma) { alert('Sertifika oluşturulamadı: firma bilgisi eksik.'); return; }

  const tehlikeSinifi = (secim && TEHLIKE_SINIFLARI.includes(secim.tehlikeSinifi)) ? secim.tehlikeSinifi : ((TEHLIKE_SINIFLARI.includes(firma.tehlikeSinifi) ? firma.tehlikeSinifi : 'Az Tehlikeli'));
  const veri = sertifikaVerisiOlustur(stajyer, { tehlikeSinifi });
  const plan = veri.plan;
  const belgeNo = _sjBelgeNoUret(stajyer, firma);
  const logo = firmaLogoGetir(firma.id);
  const egitimTarihiGoruntu = stajyer.isgEgitimTarihi2 ? `${gunAyYil(stajyer.isgEgitimTarihi)} - ${gunAyYil(stajyer.isgEgitimTarihi2)}` : gunAyYil(stajyer.isgEgitimTarihi);
  const sonGunTarihi = isgEgitimEfektifTarihi(stajyer);

  const on = `
    <section class="egt-sayfa egt-yatay">
      <div class="egt-ustbilgi">
        ${logo ? `<img class="egt-logo" src="${logo}">` : ''}
        <div class="egt-baslik-blok">
          <div class="egt-baslik">TEMEL İŞ SAĞLIĞI VE GÜVENLİĞİ EĞİTİMİ</div>
          <div class="egt-belgeno">Belge No: ${_sjSertKacir(belgeNo)}</div>
        </div>
      </div>

      <p class="egt-metin">
        İşbu belge, <b>${_sjSertKacir(stajyer.adSoyad)}</b> adına; Çalışanların İş Sağlığı ve Güvenliği Eğitimlerinin Usul ve Esasları Hakkında Yönetmelik
        kapsamında <b>Temel İş Sağlığı ve Güvenliği Eğitimi</b>'ni tamamlaması üzerine düzenlenmiştir.
      </p>

      <table class="egt-bilgi">
        <tr><th>Adı Soyadı</th><td colspan="3">${_sjSertKacir(stajyer.adSoyad)}</td></tr>
        <tr><th>Okul / Bölüm</th><td>${_sjSertKacir(stajyer.okul)}</td><th>Okul Bölümü</th><td>${_sjSertKacir(stajyer.okulBolumu) || '-'}</td></tr>
        <tr><th>Staj Yapılan Bölüm</th><td>${_sjSertKacir(stajyer.bolum)}</td><th>Sınıf / Dönem</th><td>${_sjSertKacir(stajyer.sinif) || '-'}</td></tr>
        <tr><th>İşyeri Ünvanı</th><td>${_sjSertKacir(firma.ad)}</td><th>Tehlike Sınıfı</th><td>${_sjSertKacir(tehlikeSinifi)}</td></tr>
        <tr><th>Eğitim Tarihi</th><td>${_sjSertKacir(egitimTarihiGoruntu)}</td><th>Geçerlilik Tarihi</th><td>${_sjSertKacir(gunAyYil(veri.gecerlilikTarihi))}</td></tr>
        <tr><th>Eğitim Süresi</th><td>${_sjSertKacir(veri.toplamSure)} (${veri.toplamDakika} dk)</td><th>Eğitim Şekli</th><td>☑ Yüz yüze &nbsp;&nbsp; ☐ Uzaktan</td></tr>
      </table>

      <div class="egt-tarih">${_sjSertKacir(gunAyYil(sonGunTarihi))}</div>

      ${_sjImzaSatirlariHtml()}

      <div class="egt-altbilgi">Eğitim içeriği ve konu bazlı süreler belgenin ikinci sayfasındadır.</div>
    </section>
  `;

  const arka = `
    <section class="egt-sayfa egt-dikey" id="sjArkaSayfa">
      <div class="egt-ustbilgi">
        <div class="egt-baslik-blok">
          <div class="egt-baslik" style="font-size:13pt;">EĞİTİM KONULARI VE SÜRELERİ</div>
          <div class="egt-belgeno">Katılımcı: ${_sjSertKacir(stajyer.adSoyad)} &nbsp;|&nbsp; Tehlike Sınıfı: ${_sjSertKacir(tehlikeSinifi)} &nbsp;|&nbsp; Toplam: ${_sjSertKacir(veri.toplamSure)}</div>
        </div>
      </div>

      <table class="egt-konu">
        <thead><tr><th>EĞİTİM KONULARI</th><th class="center">SÜRE</th></tr></thead>
        <tbody>
          ${_sjKonuSatirlariHtml('1. Genel Konular', SERTIFIKA_KONULARI.genel, plan.genel)}
          ${_sjKonuSatirlariHtml('2. Sağlık Konuları', SERTIFIKA_KONULARI.saglik, plan.saglik)}
          ${_sjKonuSatirlariHtml('3. Teknik Konular', SERTIFIKA_KONULARI.teknik, plan.teknik)}
          <tr class="egt-konu-baslik"><td colspan="2">4. İşe ve işyerine özgü riskler / risk değerlendirmesine dayalı konular</td></tr>
          ${plan.diger.map(([k, s]) => `<tr><td>${_sjSertKacir(k)}</td><td class="center">${_sjSertKacir(s)} dk</td></tr>`).join('')}
          <tr class="egt-konu-toplam"><td>4. Diğer konular toplamı</td><td class="center">${_sjSertKacir(dakikayiSaateCevir(plan.diger.reduce((a, r) => a + (Number(r[1]) || 0), 0)))}</td></tr>
          <tr class="egt-genel-toplam"><td>GENEL TOPLAM</td><td class="center">${_sjSertKacir(veri.toplamSure)}</td></tr>
        </tbody>
      </table>
    </section>
  `;

  const html = `<div id="sjSertifikaPdf">${_sjOrtakStilHtml('#sjSertifikaPdf')}${on}${arka}</div>`;

  const mount = document.getElementById('yazdirmaAlani');
  mount.innerHTML = html;
  mount.style.display = 'block';

  const dosyaAdi = `${stajyer.adSoyad}_Temel_ISG_Sertifikasi`.replace(/[^\p{L}\p{N}]+/gu, '_');

  const onCanvas = await _sjSayfaCanvasaCevir(mount.querySelector('.egt-yatay'));
  const arkaCanvas = await _sjSayfaCanvasaCevir(mount.querySelector('.egt-dikey'));

  const pdf = new jspdf.jsPDF('l', 'mm', 'a4');
  pdf.addImage(onCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 297, 210);
  pdf.addPage('a4', 'p');
  pdf.addImage(arkaCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, 297);
  pdf.save(`${dosyaAdi}.pdf`);

  mount.innerHTML = '';
  mount.style.display = 'none';
}
