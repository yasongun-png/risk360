// Ortak "Form Ayarları" — doküman kontrol bilgisi (Doküman No, Sürüm Tarihi,
// Sürüm No, Sayfa Sayısı). Her modül bu bilgiyi ayrı tutar (ör. Kurul ve
// Uygunsuzluk farklı doküman numaraları kullanır); son kullanıcı bir kez
// girer, sonraki tüm raporlarda otomatik kullanılır, istediğinde tekrar
// değiştirebilir. Üretilen tüm PDF raporlarının sağ üst köşesinde gösterilir.

function _formAyarlariAnahtari(modulAdi) {
  return tenantAnahtar('form_ayarlari_' + modulAdi);
}

function formAyarlariGetir(modulAdi) {
  return oku(_formAyarlariAnahtari(modulAdi), { dokumanNo: '', surumTarihi: '', surumNo: '00', sayfaSayisi: '1/1' });
}

function formAyarlariKaydet(modulAdi, ayarlar) {
  yaz(_formAyarlariAnahtari(modulAdi), {
    dokumanNo: (ayarlar.dokumanNo || '').trim(),
    surumTarihi: (ayarlar.surumTarihi || '').trim(),
    surumNo: (ayarlar.surumNo || '').trim(),
    sayfaSayisi: (ayarlar.sayfaSayisi || '').trim()
  });
}

function _faKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// PDF üst bilgisinde sağ üstte kullanılacak küçük bilgi tablosu (HTML).
// sinifAdi: PDF'in kendi <style> bloğunda tanımladığı CSS sınıfı (isteğe bağlı).
// dokumanNoGizle: true verilirse "Doküman No" satırı atlanır (ör. kurul raporu
// bu numarayı hiç göstermek istemiyor; diğer modülleri etkilemez).
// sayfaSayisiGoruntu (opsiyonel): verilirse Form Ayarları'ndaki sabit
// sayfaSayisi metni yerine bu kullanılır -- birden çok sayfalı bir PDF'in
// HER sayfası aynı kutuyu bastığından (kullanıcı bildirdi: "1. sayfa 1/1,
// 2. sayfada da 1/1" -- ikisi de aynı sabit değeri gösteriyordu), çağıran
// taraf gerçek "mevcut sayfa/toplam sayfa" değerini (ör. "1/2", "2/2")
// buradan geçebilir.
// sayfaSayisiGizle (opsiyonel): true verilirse "Sayfa Sayısı" satırı hiç
// basılmaz -- kullanıcı ekran görüntüsüyle bildirdi: JSA raporunda kutu
// "2/2" gösterirken sayfa altındaki dinamik damga "1/1" diyordu. Bu tutarsızlık
// kaçınılmaz: bu modüller gerçek sayfa sayısını html2pdf üretiminden SONRA
// öğrenip pdf.setPage() ile alt bilgiye damgalıyor (bkz. modules/jsa/cikti.js
// vb.), ama üst bilgi kutusu üretimden ÖNCE tek seferlik basılan bir canvas
// görüntüsü olduğundan gerçek sayısı asla bilemez -- kalan tek doğru kaynak
// olan alt bilgi damgasıyla çelişmemesi için üst bilgideki (elle girilen/
// bayat kalabilen) satır tamamen gizlenir.
function formAyarlariKutusuHtml(modulAdi, sinifAdi, dokumanNoGizle, sayfaSayisiGoruntu, sayfaSayisiGizle) {
  const a = formAyarlariGetir(modulAdi);
  return `
    <table class="${sinifAdi || 'fa-kutu'}">
      ${dokumanNoGizle ? '' : `<tr><td>Doküman No</td><td>: ${_faKacir(a.dokumanNo) || '-'}</td></tr>`}
      <tr><td>Sürüm Tarihi</td><td>: ${_faKacir(a.surumTarihi) || '-'}</td></tr>
      <tr><td>Sürüm No</td><td>: ${_faKacir(a.surumNo) || '-'}</td></tr>
      ${sayfaSayisiGizle ? '' : `<tr><td>Sayfa Sayısı</td><td>: ${_faKacir(sayfaSayisiGoruntu || a.sayfaSayisi) || '-'}</td></tr>`}
    </table>
  `;
}

// Genel "Form Ayarları" modalı — herhangi bir modül tek satırla çağırabilir.
// modulAdi: tenantAnahtar için ayrım anahtarı (ör. 'uygunsuzluk', 'kurul').
// modulEtiketi: modal başlığında gösterilecek okunur ad (ör. 'Uygunsuzluk / DÖF').
// kaydedildiCB (opsiyonel): kaydettikten sonra çağrılır (ör. ekranı yeniden çizmek için).
function formAyarlariModalAc(modulAdi, modulEtiketi, kaydedildiCB) {
  let katman = document.getElementById('formAyarlariKatmani');
  if (!katman) {
    katman = document.createElement('div');
    katman.id = 'formAyarlariKatmani';
    katman.className = 'modal-katman';
    katman.innerHTML = `
      <div class="modal-kutu" style="max-width:420px;">
        <h3>Form Ayarları</h3>
        <p style="font-size:12px; color:var(--metin-soluk); margin-top:-8px;" id="faModulEtiketi"></p>
        <label for="faDokumanNo">Doküman No</label>
        <input type="text" id="faDokumanNo" placeholder="ör. F010 İSG">
        <label for="faSurumTarihi">Sürüm Tarihi</label>
        <input type="text" id="faSurumTarihi" placeholder="ör. 02.02.2026">
        <label for="faSurumNo">Sürüm No</label>
        <input type="text" id="faSurumNo" placeholder="ör. 00">
        <label for="faSayfaSayisi">Sayfa Sayısı</label>
        <input type="text" id="faSayfaSayisi" placeholder="ör. 1/1">
        <div class="modal-eylemler">
          <button type="button" class="ikincil" id="faIptalBtn">İptal</button>
          <button type="button" class="birincil" id="faKaydetBtn">Kaydet</button>
        </div>
        <button type="button" class="tablo-buton" id="faKapatBtn" style="position:absolute; top:20px; right:24px;">✕</button>
      </div>
    `;
    document.body.appendChild(katman);
    katman.querySelector('#faKapatBtn').addEventListener('click', () => katman.classList.remove('acik'));
    katman.querySelector('#faIptalBtn').addEventListener('click', () => katman.classList.remove('acik'));
  }

  document.getElementById('faModulEtiketi').textContent = modulEtiketi || '';
  const mevcut = formAyarlariGetir(modulAdi);
  document.getElementById('faDokumanNo').value = mevcut.dokumanNo;
  document.getElementById('faSurumTarihi').value = mevcut.surumTarihi;
  document.getElementById('faSurumNo').value = mevcut.surumNo;
  document.getElementById('faSayfaSayisi').value = mevcut.sayfaSayisi;

  document.getElementById('faKaydetBtn').onclick = () => {
    formAyarlariKaydet(modulAdi, {
      dokumanNo: document.getElementById('faDokumanNo').value,
      surumTarihi: document.getElementById('faSurumTarihi').value,
      surumNo: document.getElementById('faSurumNo').value,
      sayfaSayisi: document.getElementById('faSayfaSayisi').value
    });
    katman.classList.remove('acik');
    if (kaydedildiCB) kaydedildiCB();
  };

  katman.classList.add('acik');
}
