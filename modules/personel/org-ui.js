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
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-pozisyon-sil');
      if (confirm('Bu pozisyonu (ve varsa alt pozisyonlarını) silmek istediğinize emin misiniz? Bu pozisyona atanmış personelin ataması kaldırılır.')) {
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

  const mount = document.getElementById('yazdirmaAlani');
  mount.innerHTML = `
    <div class="doc-title">ORGANİZASYON ŞEMASI</div>
    <div class="doc-meta" style="text-align:center;"><b>${firma ? firma.ad : ''}</b></div>
    <ul class="org-print-agac">${kokler.map(k => _orgDugumYazdirCiz(k, tumPersonel)).join('')}</ul>
  `;
  mount.style.display = 'block';
  setTimeout(() => {
    window.print();
    setTimeout(() => { mount.innerHTML = ''; mount.style.display = 'none'; }, 400);
  }, 80);
}
