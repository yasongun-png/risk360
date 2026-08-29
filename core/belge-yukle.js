// Genel "Belge / Kanıt Yükle" yardımcıları — PDF veya fotoğraf olarak
// belge ekleme birçok modülde tekrarlanan bir ihtiyaç (kullanıcı isteği:
// "tüm modüllerde üretilen örneğin acil durum planı imzalı pdf halini
// yükleyebileyim, tüm modüllerde bu gibi ihtiyaçları tara ve gereken
// yerlerde bu eklemeleri yap"). Bu dosya yalnızca dosya -> "fotoref:<id>"
// dönüşümünü (doğrulama + sıkıştırma + kayıt) ve o referansı açma mantığını
// taşır; DOM'a bağlama (hangi id'ler, önizleme HTML'i) her modülün kendi
// ui.js'inde kalır (bkz. modules/egitim/ui.js _egtBelgeDosyasiSecildi —
// oradaki mantığın modüller arası ortak hale getirilmiş hâli).
//
// Kullanım (bir modülün ui.js'inde):
//   async function _xBelgeSecildi(e) {
//     const dosya = e.target.files[0]; e.target.value = '';
//     if (!dosya) return;
//     try {
//       _xBelge = await belgeDosyasiIsle(dosya, _xAktifFirma ? _xAktifFirma.slug : '');
//       _xBelgeOnizlemeCiz();
//     } catch (hata) { alert(hata.message || 'Belge yüklenemedi.'); }
//   }
//   document.getElementById('xBelgeAcLink').addEventListener('click', e => { e.preventDefault(); belgeDosyasiniAc(_xBelge); });

function _belgePdfDataUrlOku(dosya) {
  return new Promise((coz, red) => {
    const okuyucu = new FileReader();
    okuyucu.onload = () => coz(okuyucu.result);
    okuyucu.onerror = () => red(new Error('Dosya okunamadı.'));
    okuyucu.readAsDataURL(dosya);
  });
}

// PDF veya fotoğraf dosyasını doğrular, gerekiyorsa küçültür ve
// fotoBuyukKaydet ile "fotoref:<id>" dolaylı referansına kaydeder.
async function belgeDosyasiIsle(dosya, firmaSlug) {
  const pdfMi = dosya.type === 'application/pdf';
  const fotoMi = dosya.type.startsWith('image/');
  if (!pdfMi && !fotoMi) throw new Error('Lütfen bir PDF dosyası veya fotoğraf seçin.');
  // Firestore belge başına ~1MB sınırı var; base64 kodlama ham boyutu ~%37
  // büyüttüğünden 2MB üzerindeki PDF'ler güvenli aralığın dışında kalır.
  // Fotoğraflar zaten fotoSikistir ile küçültüldüğünden bu sınıra takılmaz.
  if (pdfMi && dosya.size > 2 * 1024 * 1024) throw new Error('PDF dosyası çok büyük (maks. 2 MB). Lütfen daha küçük bir dosya seçin.');
  const dataUrl = pdfMi ? await _belgePdfDataUrlOku(dosya) : await fotoSikistir(dosya, 1600, 0.7);
  return fotoBuyukKaydet(dataUrl, firmaSlug || '');
}

// Bir "fotoref:<id>" belgesini yeni sekmede açar — modules/egitim/ui.js
// _egtBelgeAc ile birebir aynı (senkron pencere açma + blob URL'ine
// yönlendirme; popup engelleyicilerden ve Chrome'un data: URL kısıtından
// kaçınmak için gerekli, bkz. oradaki uzun yorum).
async function belgeDosyasiniAc(referans) {
  if (!referans) { alert('Belge bulunamadı.'); return; }
  const yeniSekme = window.open('', '_blank');
  try {
    const dataUrl = await fotoBuyukCoz(referans);
    if (!dataUrl) { if (yeniSekme) yeniSekme.close(); alert('Belge açılamadı.'); return; }
    const yanit = await fetch(dataUrl);
    const blob = await yanit.blob();
    const blobUrl = URL.createObjectURL(blob);
    if (yeniSekme) yeniSekme.location.href = blobUrl;
    else window.open(blobUrl, '_blank');
  } catch (hata) {
    console.error(hata);
    if (yeniSekme) yeniSekme.close();
    alert('Belge açılamadı: ' + (hata.message || hata));
  }
}

// Üç düğme (PDF Seç / Fotoğraf Çek / Fotoğraf Seç) + önizleme kutusu için
// standart HTML iskeleti — modüller kendi id öneki ile tek satırda basar.
// Önizleme kutusunun içeriği _belgeOnizlemeHtml ile üretilir.
function belgeYukleyiciHtml(onek, baslikMetni) {
  return `
    <label>${baslikMetni || 'Belge / Kanıt'} <span style="color:var(--metin-soluk); font-weight:400;">(isteğe bağlı — PDF veya fotoğraf olarak ekleyebilirsiniz)</span></label>
    <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:6px;">
      <button type="button" class="ikincil" id="${onek}PdfSecBtn">📄 PDF Seç</button>
      <button type="button" class="ikincil" id="${onek}FotoCekBtn">📷 Fotoğraf Çek</button>
      <button type="button" class="ikincil" id="${onek}FotoSecBtn">🖼️ Fotoğraf Seç</button>
    </div>
    <input type="file" id="${onek}PdfDosya" accept="application/pdf" style="display:none;">
    <input type="file" id="${onek}FotoCekDosya" accept="image/*" capture="environment" style="display:none;">
    <input type="file" id="${onek}FotoSecDosya" accept="image/*" style="display:none;">
    <div id="${onek}Onizleme" style="margin-top:6px; margin-bottom:14px;"></div>
  `;
}

// belgeYukleyiciHtml ile üretilen düğmeleri bağlar. `secildiCb(dosya)`
// seçilen dosyayı işler (genelde belgeDosyasiIsle çağırıp sonucu taslağa
// yazar ve önizlemeyi yeniden çizer).
function belgeYukleyiciBagla(onek, secildiCb) {
  document.getElementById(onek + 'PdfSecBtn').addEventListener('click', () => document.getElementById(onek + 'PdfDosya').click());
  document.getElementById(onek + 'FotoCekBtn').addEventListener('click', () => document.getElementById(onek + 'FotoCekDosya').click());
  document.getElementById(onek + 'FotoSecBtn').addEventListener('click', () => document.getElementById(onek + 'FotoSecDosya').click());
  ['PdfDosya', 'FotoCekDosya', 'FotoSecDosya'].forEach(ad => {
    document.getElementById(onek + ad).addEventListener('change', async e => {
      const dosya = e.target.files[0];
      e.target.value = '';
      if (!dosya) return;
      await secildiCb(dosya);
    });
  });
}

// Standart önizleme HTML'i: belge varsa "✓ eklendi + Aç/İndir + Kaldır",
// yoksa "henüz eklenmedi" — modüller isterse kendi HTML'ini yazabilir, bu
// sadece en sık kullanılan hâli.
function belgeOnizlemeHtml(onek, belgeVar) {
  if (!belgeVar) return '<div style="font-size:12px; color:var(--metin-soluk);">Henüz belge eklenmedi.</div>';
  return `
    <div style="display:flex; align-items:center; gap:10px;">
      <span style="font-size:12px; color:#16a34a; font-weight:600;">✓ Belge eklendi</span>
      <a href="#" id="${onek}AcLink" style="font-size:12px;">Aç / İndir</a>
      <button type="button" class="tablo-buton sil" id="${onek}KaldirBtn">Kaldır</button>
    </div>
  `;
}
