// Aktif firmanın "Bölümler" listesinden (bkz. core/tenant.js firma.bolumler,
// firma-yonetim.html'de düzenlenir) bir Sorumlu alanının altına hızlı seçim
// butonu satırı çizer — eski üretim uygulamasındaki uygunsuzluk-takip'teki
// "addResponsible" buton satırıyla aynı fikir (kullanıcı isteği: kişi adı
// değil pozisyon/bölüm adı, çünkü "kişiler değişebilir").
//
// mod:
//   'tekli' (varsayılan) — tek satırlık <input> alanları için: tıklanan bölüm
//            adı, mevcut değere VİRGÜLLE eklenir (kullanıcı isteği: "birden
//            fazla seçebilmem lazım" — bir karara/olaya birden fazla bölüm
//            sorumlu yazılabilsin), aynı isim zaten varsa tekrar eklenmez.
//   'coklu' — çok satırlı <textarea> alanları için: tıklanan bölüm adı yeni
//            satır olarak eklenir, aynı isim zaten varsa tekrar eklenmez
//            (eski üretim uygulamasındaki uygunsuzluk-takip'teki "addResponsible"
//            ile birebir aynı davranış).
function bolumButonlariCiz(kutuId, girdiId, mod) {
  const kutu = document.getElementById(kutuId);
  if (!kutu) return;

  const firma = typeof aktifFirmaGetir === 'function' ? aktifFirmaGetir() : null;
  const bolumler = firma && Array.isArray(firma.bolumler) ? firma.bolumler : [];

  if (!bolumler.length) {
    kutu.innerHTML = '';
    return;
  }

  kutu.innerHTML = bolumler.map(b =>
    `<button type="button" class="tablo-buton" data-bolum-buton="${b.replace(/"/g, '&quot;')}" style="font-size:11px; padding:4px 8px;">${b}</button>`
  ).join(' ');

  kutu.querySelectorAll('[data-bolum-buton]').forEach(btn => {
    btn.addEventListener('click', () => {
      const girdi = document.getElementById(girdiId);
      if (!girdi) return;
      const ad = btn.getAttribute('data-bolum-buton');
      const ayrac = mod === 'coklu' ? '\n' : ', ';

      const mevcut = girdi.value.split(mod === 'coklu' ? '\n' : ',').map(x => x.trim()).filter(Boolean);
      if (!mevcut.includes(ad)) {
        mevcut.push(ad);
        girdi.value = mevcut.join(ayrac);
      }
      girdi.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });
}
