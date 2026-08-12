// Acil Durum Planı (resmi belge) sayfasının DOM işlemleri.

let _planFirma = null;

function planSayfasiniBaslat(firma) {
  _planFirma = firma;
  const plan = planGetirVeyaOlustur(firma);

  const alanEslesme = {
    planHazirlanmaTarihi: 'hazirlanmaTarihi',
    planGecerlilikTarihi: 'gecerlilikTarihi',
    planHazirlayan: 'hazirlayan',
    planHazirlayanUnvan: 'hazirlayanUnvan',
    planOnaylayan: 'onaylayan',
    planOnaylayanUnvan: 'onaylayanUnvan',
    planUyariSistemleri: 'uyariSistemleri',
    planNotlar: 'notlar'
  };
  Object.entries(alanEslesme).forEach(([elId, alan]) => {
    const el = document.getElementById(elId);
    el.value = plan[alan] || '';
    el.addEventListener('change', () => planGuncelle(alan, el.value));
  });

  const listeAlanEslesme = {
    planOlasiAcilDurumlar: 'olasiAcilDurumlar',
    planToplanmaYerleri: 'toplanmaYerleri',
    planOzelRiskBolgeleri: 'ozelRiskBolgeleri'
  };
  Object.entries(listeAlanEslesme).forEach(([elId, alan]) => {
    const el = document.getElementById(elId);
    el.value = (plan[alan] || []).join('\n');
    el.addEventListener('change', () => planGuncelle(alan, katilimcilariAyir(el.value)));
  });

  document.getElementById('planOnleyiciTedbirler').value = plan.onleyiciTedbirler || '';
  document.getElementById('planOnleyiciTedbirler').addEventListener('change', e => planGuncelle('onleyiciTedbirler', e.target.value));
  document.getElementById('planTahliyePlani').value = plan.tahliyePlani || '';
  document.getElementById('planTahliyePlani').addEventListener('change', e => planGuncelle('tahliyePlani', e.target.value));
  document.getElementById('planDisKurumIletisim').value = plan.disKurumIletisim || '';
  document.getElementById('planDisKurumIletisim').addEventListener('change', e => planGuncelle('disKurumIletisim', e.target.value));

  ozetBilgileriCiz();
  ekipTablosunuCiz();
  document.getElementById('planYazdirBtn').addEventListener('click', planYazdir);
}

function ozetBilgileriCiz() {
  const calisanSayisi = personelleriGetir('', false).length;
  const gereksinim = ekipGereksinimiHesapla(_planFirma.tehlikeSinifi, calisanSayisi);

  document.getElementById('planOzetKutusu').innerHTML = `
    <div class="istatistik-grid">
      <div class="istatistik-kutu"><span>İşyeri</span><b style="font-size:15px;">${_planFirma.ad}</b></div>
      <div class="istatistik-kutu"><span>Tehlike Sınıfı</span><b>${_planFirma.tehlikeSinifi || '-'}</b></div>
      <div class="istatistik-kutu"><span>Çalışan Sayısı</span><b>${calisanSayisi}</b></div>
      <div class="istatistik-kutu"><span>Plan Yenileme Süresi</span><b>${gereksinim.planYenilemeYili} Yıl</b></div>
    </div>
  `;
}

function ekipTablosunuCiz() {
  const calisanSayisi = personelleriGetir('', false).length;
  const gereksinim = ekipGereksinimiHesapla(_planFirma.tehlikeSinifi, calisanSayisi);
  const uyeler = ekipUyeleriTumunuGetir().filter(u => u.durum !== 'İptal');

  const kutu = document.getElementById('planEkipKutusu');
  kutu.innerHTML = `
    <div class="tablo-scroll">
      <table class="veri-tablosu">
        <thead><tr><th>Ekip Türü</th><th>Asgari Gerekli</th><th>Mevcut Görevli</th></tr></thead>
        <tbody>
          ${['Söndürme', 'Kurtarma', 'Koruma', 'İlk Yardım'].map(tur => `
            <tr><td>${tur}</td><td>${gereksinim.gereksinimler[tur]}</td><td>${uyeler.filter(u => u.ekipTuru === tur).length}</td></tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <div class="tablo-scroll" style="margin-top:14px;">
      <table class="veri-tablosu">
        <thead><tr><th>Personel</th><th>Bölüm</th><th>Ekip</th><th>Rol</th><th>Vardiya</th><th>Telefon</th></tr></thead>
        <tbody>
          ${uyeler.map(u => `<tr><td>${u.personelAdi}</td><td>${u.bolum || '-'}</td><td>${u.ekipTuru}</td><td>${u.rol}</td><td>${u.vardiya}</td><td>${u.telefon || '-'}</td></tr>`).join('') || '<tr><td colspan="6">Henüz ekip üyesi atanmadı.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

function planYazdir(e) {
  if (e) e.preventDefault();
  const plan = planGetirVeyaOlustur(_planFirma);
  const calisanSayisi = personelleriGetir('', false).length;
  const gereksinim = ekipGereksinimiHesapla(_planFirma.tehlikeSinifi, calisanSayisi);
  const uyeler = ekipUyeleriTumunuGetir().filter(u => u.durum !== 'İptal');

  const liste = (arr) => arr.length ? `<ul>${arr.map(x => `<li>${x}</li>`).join('')}</ul>` : '<p>-</p>';

  const mount = document.getElementById('yazdirmaAlani');
  mount.innerHTML = `
    <div class="doc-title">ACİL DURUM PLANI</div>
    <div class="doc-meta">
      <b>${_planFirma.ad}</b><br>
      Tehlike Sınıfı: ${_planFirma.tehlikeSinifi || '-'} | Çalışan Sayısı: ${calisanSayisi}<br>
      Hazırlanma Tarihi: ${plan.hazirlanmaTarihi || '-'} | Geçerlilik Tarihi: ${plan.gecerlilikTarihi || '-'}<br>
      Hazırlayan: ${plan.hazirlayan || '-'} (${plan.hazirlayanUnvan || '-'}) | Onaylayan: ${plan.onaylayan || '-'} (${plan.onaylayanUnvan || '-'})
    </div>
    <h3>Olası Acil Durumlar</h3>${liste(plan.olasiAcilDurumlar)}
    <h3>Önleyici Tedbirler</h3><p>${(plan.onleyiciTedbirler || '-').replace(/\n/g, '<br>')}</p>
    <h3>Tahliye Planı</h3><p>${(plan.tahliyePlani || '-').replace(/\n/g, '<br>')}</p>
    <h3>Toplanma Yerleri</h3>${liste(plan.toplanmaYerleri)}
    <h3>Özel Risk Bölgeleri</h3>${liste(plan.ozelRiskBolgeleri)}
    <h3>Uyarı Sistemleri</h3><p>${plan.uyariSistemleri || '-'}</p>
    <h3>Dış Kurum İletişim Bilgileri</h3><p>${(plan.disKurumIletisim || '-').replace(/\n/g, '<br>')}</p>
    <h3>Mevzuata Göre Asgari / Mevcut Ekip Sayıları</h3>
    <table>
      <tr><th>Ekip Türü</th><th>Asgari Gerekli</th><th>Mevcut Görevli</th></tr>
      ${['Söndürme', 'Kurtarma', 'Koruma', 'İlk Yardım'].map(tur => `<tr><td>${tur}</td><td>${gereksinim.gereksinimler[tur]}</td><td>${uyeler.filter(u => u.ekipTuru === tur).length}</td></tr>`).join('')}
    </table>
    <h3>Görevli Ekip Üyeleri</h3>
    <table>
      <tr><th>Personel</th><th>Bölüm</th><th>Ekip</th><th>Rol</th><th>Vardiya</th><th>Telefon</th></tr>
      ${uyeler.map(u => `<tr><td>${u.personelAdi}</td><td>${u.bolum || '-'}</td><td>${u.ekipTuru}</td><td>${u.rol}</td><td>${u.vardiya}</td><td>${u.telefon || '-'}</td></tr>`).join('')}
    </table>
    ${plan.notlar ? `<h3>Notlar</h3><p>${plan.notlar.replace(/\n/g, '<br>')}</p>` : ''}
  `;
  mount.style.display = 'block';
  setTimeout(() => {
    window.print();
    setTimeout(() => { mount.innerHTML = ''; mount.style.display = 'none'; }, 400);
  }, 80);
}
