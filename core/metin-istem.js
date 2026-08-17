// Tek satırlık/kısa metin girişi gerektiren yerlerde (red gerekçesi,
// yönlendirme notu, kapanış notu vb.) tarayıcının native prompt() kutusu
// yerine kullanılan ortak modal — kullanıcı isteği doğrultusunda ("iş
// izni ve bakım onarım süreçlerini kullanıcı dostu hale getir"):
// prompt() mobilde çirkin görünüyor, çok satırlı metin desteklemiyor ve
// yanlışlıkla iptal edilmesi kolay. form-ayarlari.js'teki
// formAyarlariModalAc ile aynı "ilk çağrıda kendi modalını enjekte et"
// deseni kullanılır — çağıran sayfanın HTML'ine dokunmaya gerek yok.
//
// Promise<string|null> döner: null = kullanıcı İptal'e bastı (prompt()'un
// null dönüşüyle aynı anlam), aksi halde girilen metin (boş string dahil).
function metinIstemModali(baslik, yerTutucu, varsayilanDeger) {
  return new Promise(resolve => {
    let katman = document.getElementById('metinIstemKatmani');
    if (!katman) {
      katman = document.createElement('div');
      katman.id = 'metinIstemKatmani';
      katman.className = 'modal-katman';
      katman.innerHTML = `
        <div class="modal-kutu" style="max-width:420px;">
          <h3 id="miBaslik"></h3>
          <textarea id="miMetin" rows="3"></textarea>
          <div class="modal-eylemler">
            <button type="button" class="ikincil" id="miIptalBtn">İptal</button>
            <button type="button" class="birincil" id="miTamamBtn">Tamam</button>
          </div>
        </div>
      `;
      document.body.appendChild(katman);
    }

    document.getElementById('miBaslik').textContent = baslik || '';
    const metinEl = document.getElementById('miMetin');
    metinEl.placeholder = yerTutucu || '';
    metinEl.value = varsayilanDeger || '';

    const kapat = sonuc => {
      katman.classList.remove('acik');
      resolve(sonuc);
    };

    document.getElementById('miIptalBtn').onclick = () => kapat(null);
    document.getElementById('miTamamBtn').onclick = () => kapat(metinEl.value);

    katman.classList.add('acik');
    metinEl.focus();
  });
}
