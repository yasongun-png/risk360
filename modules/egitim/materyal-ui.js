// Eğitim Materyalleri sekmesinin DOM işlemleri (bkz. materyal.js).

function _egitimMateryalBoyutMetni(bayt) {
  if (!bayt) return '-';
  if (bayt < 1024 * 1024) return Math.round(bayt / 1024) + ' KB';
  return (bayt / (1024 * 1024)).toFixed(1) + ' MB';
}

function materyalTablosunuCiz(aramaMetni) {
  const govde = document.getElementById('materyalTabloGovde');
  const bosDurum = document.getElementById('materyalBosDurum');
  const liste = egitimMateryalleriniGetir(aramaMetni);

  govde.innerHTML = '';
  if (liste.length === 0) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = aramaMetni ? 'Aramanızla eşleşen materyal bulunamadı.' : 'Henüz materyal eklenmedi. "+ Materyal Yükle" ile başlayın.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  govde.innerHTML = liste.map(m => `
    <tr>
      <td>${_egKacir(m.ad)}</td>
      <td>${_egKacir(m.dosyaAdi)}</td>
      <td>${_egitimMateryalBoyutMetni(m.boyut)}</td>
      <td>${m.yuklemeTarihi ? gunAyYil(m.yuklemeTarihi.slice(0, 10)) : '-'}</td>
      <td>
        <a class="tablo-buton" href="${m.url}" target="_blank" rel="noopener">İndir / Aç</a>
        <button class="tablo-buton sil" data-materyal-sil="${m.id}">Sil</button>
      </td>
    </tr>
  `).join('');

  govde.querySelectorAll('[data-materyal-sil]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (await onayModali('Bu materyali silmek istediğinize emin misiniz?', 'Sil')) {
        egitimMateryaliSil(btn.getAttribute('data-materyal-sil'));
        materyalTablosunuCiz(document.getElementById('materyalAramaKutusu').value);
      }
    });
  });
}

async function _materyalDosyayiYukle(dosya) {
  if (!dosya) return;

  const varsayilanAd = dosya.name.replace(/\.[^.]+$/, '');
  const ad = await metinIstemModali('Materyal için bir başlık girin', 'Örn: Amonyak Sızıntısı Toolbox Talk', varsayilanAd);
  if (ad === null) return;

  const btn = document.getElementById('materyalYukleBtn');
  const eskiMetin = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Yükleniyor...';
  try {
    const sonuc = await egitimMateryaliYukle(dosya, ad);
    if (!sonuc.basarili) alert(sonuc.hata);
    else materyalTablosunuCiz(document.getElementById('materyalAramaKutusu').value);
  } finally {
    btn.disabled = false;
    btn.textContent = eskiMetin;
  }
}

function _materyalDosyaSecildi(e) {
  const dosya = e.target.files[0];
  e.target.value = '';
  _materyalDosyayiYukle(dosya);
}

// Kullanıcı isteği: "bu alana sürüklediğimde de kayıt olsun" -- tüm
// materyal sekmesi (tablo dahil) bir bırakma (drop) alanı, dosya sürükleme
// sırasında hafif bir vurgu (kesikli çerçeve) gösterilir.
function _materyalSurukleBirakKur() {
  const alan = document.getElementById('materyalBolumu');
  let surukleSayaci = 0;

  alan.addEventListener('dragover', e => { e.preventDefault(); });
  alan.addEventListener('dragenter', e => {
    e.preventDefault();
    surukleSayaci++;
    alan.classList.add('materyal-surukle-aktif');
  });
  alan.addEventListener('dragleave', e => {
    e.preventDefault();
    surukleSayaci = Math.max(0, surukleSayaci - 1);
    if (surukleSayaci === 0) alan.classList.remove('materyal-surukle-aktif');
  });
  alan.addEventListener('drop', e => {
    e.preventDefault();
    surukleSayaci = 0;
    alan.classList.remove('materyal-surukle-aktif');
    const dosya = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (!dosya) return;
    if (!EGITIM_MATERYAL_IZIN_VERILEN_UZANTILAR.some(u => dosya.name.toLowerCase().endsWith(u))) {
      alert('Sadece PDF, PPT/PPTX veya Word dosyaları yüklenebilir.');
      return;
    }
    _materyalDosyayiYukle(dosya);
  });
}

function materyalSayfasiniBaslat() {
  document.getElementById('materyalAramaKutusu').addEventListener('input', e => materyalTablosunuCiz(e.target.value));
  document.getElementById('materyalYukleBtn').addEventListener('click', () => document.getElementById('materyalDosya').click());
  document.getElementById('materyalDosya').addEventListener('change', _materyalDosyaSecildi);
  _materyalSurukleBirakKur();
}
