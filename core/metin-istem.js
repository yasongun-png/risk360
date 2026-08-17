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

// Evet/Hayır onayı gerektiren yerlerde (silme, durdurma, tür değişikliği
// gibi geri dönüşü zor işlemler) tarayıcının native confirm() kutusu
// yerine kullanılan ortak modal — aynı "ilk çağrıda kendi modalını
// enjekte et" deseni. Promise<boolean> döner: true = kullanıcı onayladı,
// false = İptal (confirm()'ün dönüş değerleriyle aynı anlam).
function onayModali(mesaj, onaylaButonMetni) {
  return new Promise(resolve => {
    let katman = document.getElementById('onayModaliKatmani');
    if (!katman) {
      katman = document.createElement('div');
      katman.id = 'onayModaliKatmani';
      katman.className = 'modal-katman';
      katman.innerHTML = `
        <div class="modal-kutu" style="max-width:400px;">
          <p id="omMesaj" style="margin:0 0 4px; font-size:14px; line-height:1.5;"></p>
          <div class="modal-eylemler">
            <button type="button" class="ikincil" id="omIptalBtn">İptal</button>
            <button type="button" class="birincil" id="omOnaylaBtn"></button>
          </div>
        </div>
      `;
      document.body.appendChild(katman);
    }

    document.getElementById('omMesaj').textContent = mesaj || '';
    document.getElementById('omOnaylaBtn').textContent = onaylaButonMetni || 'Onayla';

    const kapat = sonuc => {
      katman.classList.remove('acik');
      resolve(sonuc);
    };

    document.getElementById('omIptalBtn').onclick = () => kapat(false);
    document.getElementById('omOnaylaBtn').onclick = () => kapat(true);

    katman.classList.add('acik');
  });
}
