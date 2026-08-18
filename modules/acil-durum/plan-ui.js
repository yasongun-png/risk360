// Acil Durum Planı (resmi belge) sayfasının DOM işlemleri.

let _planFirma = null;

const _PLAN_ALAN_ESLESME = {
  planHazirlanmaTarihi: 'hazirlanmaTarihi',
  planGecerlilikTarihi: 'gecerlilikTarihi',
  planHazirlayan: 'hazirlayan',
  planHazirlayanUnvan: 'hazirlayanUnvan',
  planOnaylayan: 'onaylayan',
  planOnaylayanUnvan: 'onaylayanUnvan',
  planUyariSistemleri: 'uyariSistemleri',
  planNotlar: 'notlar',
  planOnleyiciTedbirler: 'onleyiciTedbirler',
  planTahliyePlani: 'tahliyePlani',
  planDisKurumIletisim: 'disKurumIletisim'
};

const _PLAN_LISTE_ALAN_ESLESME = {
  planOlasiAcilDurumlar: 'olasiAcilDurumlar',
  planToplanmaYerleri: 'toplanmaYerleri',
  planOzelRiskBolgeleri: 'ozelRiskBolgeleri'
};

// Bir plan nesnesindeki değerleri form alanlarına yazar (dinleyici eklemez) —
// hem ilk yüklemede hem de hazır şablon uygulandıktan sonra ekranı
// güncellemek için kullanılır (bkz. planSablonUygulandi).
function planAlanlariniDoldur(plan) {
  Object.entries(_PLAN_ALAN_ESLESME).forEach(([elId, alan]) => {
    document.getElementById(elId).value = plan[alan] || '';
  });
  Object.entries(_PLAN_LISTE_ALAN_ESLESME).forEach(([elId, alan]) => {
    document.getElementById(elId).value = (plan[alan] || []).join('\n');
  });
}

function planSayfasiniBaslat(firma) {
  _planFirma = firma;
  const plan = planGetirVeyaOlustur(firma);
  planAlanlariniDoldur(plan);

  Object.entries(_PLAN_ALAN_ESLESME).forEach(([elId, alan]) => {
    document.getElementById(elId).addEventListener('change', e => planGuncelle(alan, e.target.value));
  });
  Object.entries(_PLAN_LISTE_ALAN_ESLESME).forEach(([elId, alan]) => {
    document.getElementById(elId).addEventListener('change', e => planGuncelle(alan, katilimcilariAyir(e.target.value)));
  });

  ozetBilgileriCiz();
  ekipTablosunuCiz();
  document.getElementById('planYazdirBtn').addEventListener('click', planYazdir);
  document.getElementById('planSablonBtn').addEventListener('click', planSablonModalAc);
  document.getElementById('planSablonModalKapatBtn').addEventListener('click', planSablonModalKapat);

  revizyonleriCiz();
  document.getElementById('yeniRevizyonBtn').addEventListener('click', revizyonModalAc);
  document.getElementById('revizyonModalKapatBtn').addEventListener('click', revizyonModalKapat);
  document.getElementById('revizyonModalIptalBtn').addEventListener('click', revizyonModalKapat);
  document.getElementById('revizyonForm').addEventListener('submit', revizyonFormGonderildi);

  eksikVeriUyarisiniCiz();
  document.getElementById('planWordIndirBtn').addEventListener('click', () => _planCiktiTiklandi(() => acilDurumPlaniWordOlustur(_planFirma)));
  document.getElementById('planPdfIndirBtn').addEventListener('click', () => _planCiktiTiklandi(() => acilDurumPlaniPdfOlustur(_planFirma)));
  document.getElementById('planPptxIndirBtn').addEventListener('click', () => _planCiktiTiklandi(() => acilDurumPlaniPptxOlustur(_planFirma)));
}

function temizleFormHatalari(formId) {
  document.querySelectorAll('#' + formId + ' .alan-hatasi').forEach(el => el.textContent = '');
}

function formHatalariniGoster(hatalar, onEk) {
  Object.keys(hatalar).forEach(alan => {
    const buyukAlan = alan.charAt(0).toUpperCase() + alan.slice(1);
    const hataEl = document.getElementById(onEk + buyukAlan + 'Hata');
    if (hataEl) hataEl.textContent = hatalar[alan];
  });
}

async function _planCiktiTiklandi(uretFn) {
  try {
    await uretFn();
  } catch (hata) {
    console.error(hata);
    alert('Belge oluşturulurken bir hata oluştu: ' + (hata && hata.message ? hata.message : hata));
  }
}

// ---- Doküman Kontrol / Revizyon Geçmişi ----

function eksikVeriUyarisiniCiz() {
  const veri = acilDurumBelgeVerisiTopla(_planFirma);
  const eksikler = acilDurumEksikVerileriTespitEt(veri);
  const kutu = document.getElementById('planEksikVeriUyarisi');
  if (!eksikler.length) { kutu.innerHTML = ''; return; }
  kutu.innerHTML = `
    <div style="border:1px solid #f59e0b; background:#fffbeb; border-radius:8px; padding:10px 14px; margin-bottom:10px; font-size:13px;">
      <b>⚠ Belge üretmeden önce tamamlanması önerilen alanlar:</b>
      <ul style="margin:6px 0 0; padding-left:18px;">
        ${eksikler.map(e => `<li>${e}</li>`).join('')}
      </ul>
    </div>
  `;
}

function revizyonleriCiz() {
  const govde = document.getElementById('revizyonTabloGovde');
  const bosDurum = document.getElementById('revizyonBosDurum');
  const liste = revizyonleriGetir();

  govde.innerHTML = '';
  if (!liste.length) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = 'Henüz revizyon kaydı eklenmedi.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  liste.forEach(r => {
    const satir = document.createElement('tr');
    satir.innerHTML = `
      <td>${r.revizyonNo}</td>
      <td>${gunAyYil(r.tarih) || '-'}</td>
      <td style="max-width:280px; white-space:normal;">${r.degisiklikOzeti}</td>
      <td>${r.hazirlayan}</td>
      <td>${r.onaylayan || '-'}</td>
      <td><button class="tablo-buton sil" data-sil="${r.id}">Sil</button></td>
    `;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', async () => {
    if (await onayModali('Bu revizyon kaydını silmek istediğinize emin misiniz?', 'Sil')) { revizyonSil(btn.getAttribute('data-sil')); revizyonleriCiz(); }
  }));
}

function revizyonModalAc() {
  document.getElementById('rvTarih').value = bugunIso();
  document.getElementById('rvDegisiklikOzeti').value = '';
  document.getElementById('rvHazirlayan').value = '';
  document.getElementById('rvOnaylayan').value = '';
  temizleFormHatalari('revizyonForm');
  document.getElementById('revizyonModalKatman').classList.add('acik');
}

function revizyonModalKapat() {
  document.getElementById('revizyonModalKatman').classList.remove('acik');
}

function revizyonFormGonderildi(e) {
  e.preventDefault();
  temizleFormHatalari('revizyonForm');

  const veriler = {
    tarih: document.getElementById('rvTarih').value,
    degisiklikOzeti: document.getElementById('rvDegisiklikOzeti').value,
    hazirlayan: document.getElementById('rvHazirlayan').value,
    onaylayan: document.getElementById('rvOnaylayan').value
  };

  const sonuc = revizyonEkle(veriler);
  if (!sonuc.basarili) { formHatalariniGoster(sonuc.hatalar, 'rv'); return; }

  revizyonModalKapat();
  revizyonleriCiz();
}

// ---- Hazır Şablon Modalı ----

function planSablonModalAc() {
  const liste = document.getElementById('planSablonListesi');
  liste.innerHTML = acilDurumPlanSablonlariniGetir().map(s => `
    <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; padding:10px 12px; border-bottom:1px solid var(--kenarlik);">
      <div>
        <b style="font-size:14px;">${s.ad}</b>
        <div style="font-size:12px; color:var(--metin-soluk); margin-top:2px;">${s.aciklama}</div>
      </div>
      <button type="button" class="birincil" style="width:auto; white-space:nowrap;" data-sablon-uygula="${s.id}">Bu Şablonu Kullan</button>
    </div>
  `).join('');

  liste.querySelectorAll('[data-sablon-uygula]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const onay = await onayModali(
        'Bu şablon; Olası Acil Durumlar, Önleyici Tedbirler, Tahliye Planı, Uyarı Sistemleri ve ' +
        'Dış Kurum İletişim Bilgileri alanlarının üzerine yazacak (diğer alanlar değişmez). Devam edilsin mi?',
        'Uygula'
      );
      if (!onay) return;
      const sonuc = acilDurumPlanSablonUygula(btn.getAttribute('data-sablon-uygula'));
      if (!sonuc.basarili) { alert(sonuc.hata); return; }
      planAlanlariniDoldur(sonuc.plan);
      planSablonModalKapat();
    });
  });

  document.getElementById('planSablonModalKatman').classList.add('acik');
}

function planSablonModalKapat() {
  document.getElementById('planSablonModalKatman').classList.remove('acik');
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
