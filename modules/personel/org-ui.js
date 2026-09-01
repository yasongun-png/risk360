// Organizasyon şeması ekranının DOM işlemleri.

function orgSayfasiniBaslat() {
  document.getElementById('pozisyonForm').addEventListener('submit', pozisyonFormGonderildi);
  document.getElementById('orgYazdirBtn').addEventListener('click', orgYazdir);
  agaciCiz();
}

function ustPozisyonSecimleriniDoldur() {
  const secim = document.getElementById('ustPozisyon');
  const yollar = pozisyonYollariniGetir();

  secim.innerHTML = '<option value="">— Bölüm (En Üst Seviye)</option>' +
    yollar.map(y => `<option value="${y.id}">${y.yol}</option>`).join('');
}

function pozisyonFormGonderildi(e) {
  e.preventDefault();
  const ad = document.getElementById('pozisyonAdi').value;
  const ustId = document.getElementById('ustPozisyon').value;
  const hataMesaji = document.getElementById('hataMesaji');

  const sonuc = pozisyonEkle(ad, ustId);
  if (!sonuc.basarili) {
    hataMesaji.textContent = sonuc.hata;
    hataMesaji.classList.add('gorunur');
    return;
  }

  hataMesaji.classList.remove('gorunur');
  document.getElementById('pozisyonAdi').value = '';
  agaciCiz();
}

function agaciCiz() {
  ustPozisyonSecimleriniDoldur();

  const kokler = pozisyonAgaciOlustur();
  const kutu = document.getElementById('agacKutusu');

  if (kokler.length === 0) {
    kutu.innerHTML = '<div class="bos-durum gorunur">Henüz bölüm veya pozisyon eklenmedi.</div>';
    return;
  }

  const tumPersonel = personelleriGetir('', false);
  kutu.innerHTML = `<ul class="org-agac">${kokler.map(d => dugumCiz(d, tumPersonel)).join('')}</ul>`;

  kutu.querySelectorAll('[data-pozisyon-sil]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-pozisyon-sil');
      if (await onayModali('Bu pozisyonu (ve varsa alt pozisyonlarını) silmek istediğinize emin misiniz? Bu pozisyona atanmış personelin ataması kaldırılır.', 'Sil')) {
        pozisyonSil(id);
        agaciCiz();
      }
    });
  });
}

function dugumCiz(dugum, tumPersonel) {
  const atananlar = tumPersonel.filter(p => p.pozisyonId === dugum.id);
  const kisiHtml = atananlar.length
    ? `<div class="org-kisi-listesi">${atananlar.map(p => `<span class="org-kisi">${p.adSoyad}</span>`).join('')}</div>`
    : '';

  return `
    <li class="org-dugum">
      <div class="org-dugum-baslik">
        <span class="org-dugum-ad">${dugum.ad}</span>
        <span class="org-dugum-sayi">${atananlar.length} kişi</span>
        <button type="button" class="tablo-buton sil" data-pozisyon-sil="${dugum.id}">Sil</button>
      </div>
      ${kisiHtml}
      ${dugum.cocuklar.length
        ? `<ul class="org-agac">${dugum.cocuklar.map(c => dugumCiz(c, tumPersonel)).join('')}</ul>`
        : ''
      }
    </li>
  `;
}

// Uygulama içindeki ağaç görünümü (yönetim için, girintili liste) yazdırmaya
// uygun değil — klasik kutu + bağlantı çizgili şema burada ayrıca üretilir.
function _orgDugumYazdirCiz(dugum, tumPersonel) {
  const atananlar = tumPersonel.filter(p => p.pozisyonId === dugum.id);
  const isimHtml = atananlar.length
    ? `<div class="org-print-isim">${atananlar.map(p => p.adSoyad).join('<br>')}</div>`
    : '';

  return `
    <li>
      <div class="org-print-kutu">
        <div class="org-print-ad">${dugum.ad}</div>
        ${isimHtml}
      </div>
      ${dugum.cocuklar.length
        ? `<ul>${dugum.cocuklar.map(c => _orgDugumYazdirCiz(c, tumPersonel)).join('')}</ul>`
        : ''
      }
    </li>
  `;
}

function orgYazdir(e) {
  if (e) e.preventDefault();
  const kokler = pozisyonAgaciOlustur();
  if (kokler.length === 0) {
    alert('Yazdırılacak bir organizasyon şeması yok.');
    return;
  }

  const tumPersonel = personelleriGetir('', false);
  const firma = aktifFirmaGetir();

  // Kullanıcı raporu: "burdada duruyo kötü" — #yazdirmaAlani zaten CSS'te
  // (assets/style.css) varsayılan olarak display:none ve sadece @media print
  // içinde görünür kılınıyor; buradaki mount.style.display = 'block' satırı
  // bunu SATIR-İÇİ STİLLE (CSS kuralından daha yüksek özgüllükte) eziyordu,
  // bu yüzden şema, yazdırma iletişim kutusu açılmadan önce sayfanın altında
  // biçimsiz şekilde gerçekten görünür oluyordu. Görünürlük tamamen CSS'e
  // bırakılır — inline style hiç ayarlanmaz.
  const mount = document.getElementById('yazdirmaAlani');
  mount.innerHTML = `
    <div class="doc-title">ORGANİZASYON ŞEMASI</div>
    <div class="doc-meta" style="text-align:center;"><b>${firma ? firma.ad : ''}</b></div>
    <div class="org-print-sarici">
      <ul class="org-print-agac">${kokler.map(k => _orgDugumYazdirCiz(k, tumPersonel)).join('')}</ul>
    </div>
  `;

  // Kullanıcı raporu: "şema sağa sola doğru fazla gereksiz büyüyor" — çok
  // kardeşli/derin şemalar tek satırlık flex ağaçta sayfa genişliğini
  // kolayca aşar. Gerçek çizilmiş genişlik ölçülüp gerekiyorsa sarıcıya tek
  // bir transform: scale uygulanır (metin kırılmadan orantılı küçülür).
  // Ölçüm için #yazdirmaAlani display:none'dan (0 genişlik döner) geçici
  // olarak EKRAN DIŞINA taşınır — acil-durum/index.html'deki barkod
  // okuyucuyla aynı teknik — sonra satır-içi stil TAMAMEN kaldırılır ki
  // yazdırma diyaloğu açılana kadar ekranda hiç görünmesin (bkz. yukarıdaki
  // "burdada duruyo kötü" düzeltmesi).
  mount.style.cssText = 'display:block; position:absolute; left:-9999px; top:-9999px;';
  const sarici = mount.querySelector('.org-print-sarici');
  const genislikMm = sarici.scrollWidth / 96 * 25.4;
  const SAYFA_GENISLIK_MM = 277; // A4 yatay (297mm) - @page kuralındaki 10mm+10mm kenar boşluğu
  sarici.style.transform = genislikMm > SAYFA_GENISLIK_MM ? `scale(${(SAYFA_GENISLIK_MM / genislikMm).toFixed(3)})` : '';
  mount.removeAttribute('style');

  setTimeout(() => {
    window.print();
    setTimeout(() => { mount.innerHTML = ''; }, 400);
  }, 80);
}
