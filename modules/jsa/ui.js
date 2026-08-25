// İş Güvenliği Analizi (JSA) ekranının DOM işlemleri.
// Ekran görüntüsü olarak paylaşılan bağımsız JSA aracının 3 adımlı akışı
// (Görev ve iş adımları / Tehlikeler-riskler-kontroller / Rapor-onay-takip)
// tek bir sayfa içinde, kayıt kaydedilene kadar bellekte tutulan bir taslak
// (_jsaTaslak) üzerinden düzenlenir — "Kaydet"e basılana kadar Firestore'a
// hiçbir şey yazılmaz, PDF/Word önizlemesi ise taslak üzerinden ANINDA
// alınabilir (kullanıcı henüz kaydetmeden çıktısını görebilsin diye).

let _jsaAktifFirma = null;
let _jsaTaslak = null;
let _jsaDuzenlenenId = null;

function _jsaKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function jsaRozetSinifAdi(durum) {
  return slugOlustur(durum || '');
}

// ==================== ÖRNEK JSA'LAR ====================
// Kullanıcı isteği: "iki adet örnek yap uygulama içinde" — ekran
// görüntüsündeki araçtaki "Örnek JSA'yı yükle" butonuna karşılık gelir;
// risk360'ta her kayıt Firestore'a otomatik kaydedildiğinden burada ayrı
// bir dosya/taslak değil, doğrudan gerçek (silinebilir/düzenlenebilir) iki
// örnek KAYIT oluşturur. Bir Çok Tehlikeli (kimya gübre fabrikası) işletme
// bağlamına uygun, farklı risk düzeylerini ve iki farklı durumu (Onay
// Bekliyor / Taslak) gösteren iki örnek seçildi.
function _jsaGunEkle(gun) {
  const d = new Date(bugunIso() + 'T00:00:00');
  d.setDate(d.getDate() + gun);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function _jsaOrnekKayitlariUret() {
  return [
    {
      degerlendirilenIs: 'Yüksekte Boru Hattı Kaynak ve Bakım İşi',
      alanEkipman: 'Proses Binası — 8m Kot, Buhar Hattı',
      isiYapanEkip: 'Kaynakçı, Yardımcı Personel',
      degerlendirmeEkibi: 'İG Uzmanı, Bakım Şefi',
      tarih: bugunIso(),
      revizyon: '00',
      kapsam: 'Sabah vardiyası 08:00-16:00. Aynı bölgede eşzamanlı elektrik işi yapılmayacak.',
      hazirlikKanitlari: JSA_HAZIRLIK_KANITLARI.slice(),
      durum: 'Onay Bekliyor',
      adimlar: [
        { eylem: 'İş iznini alma ve alanı çevirme', tehlikeler: [
          { tehlike: 'Yetkisiz giriş / alt tarafta düşen cisim tehlikesi', olasilik: '3', frekans: '3', siddet: '7', kontroller: 'İş izni imzalanır; bariyer ve uyarı levhaları konulur.' }
        ] },
        { eylem: 'İskeleye/platforma çıkılması', tehlikeler: [
          { tehlike: 'Yüksekten düşme', olasilik: '3', frekans: '3', siddet: '15', kontroller: 'Tam vücut kemer + çift halat; iskele periyodik kontrol etiketi doğrulanır.' }
        ] },
        { eylem: 'Kaynak makinesi ve tüplerin hazırlanması', tehlikeler: [
          { tehlike: 'Elektrik çarpması', olasilik: '1', frekans: '3', siddet: '15', kontroller: 'Topraklama ve kaçak akım rölesi testi yapılır.' },
          { tehlike: 'Gaz tüpü devrilmesi / patlama', olasilik: '1', frekans: '1', siddet: '40', kontroller: 'Tüpler dik ve sabitlenmiş; valfler ve hortum bağlantıları kontrol edilir.' }
        ] },
        { eylem: 'Kaynak işleminin yapılması', tehlikeler: [
          { tehlike: 'Yanık / kıvılcım sıçraması', olasilik: '3', frekans: '6', siddet: '7', kontroller: 'KKD (kaynak gözlüğü, deri eldiven, önlük); yangın gözcüsü bulunur; yanıcı malzeme uzaklaştırılır.' },
          { tehlike: 'Toksik duman solunması', olasilik: '3', frekans: '3', siddet: '7', kontroller: 'Yerel egzoz havalandırma; gerekiyorsa maske kullanımı.' }
        ] },
        { eylem: 'Alanın toparlanması ve iş izninin kapatılması', tehlikeler: [
          { tehlike: 'Kesici/keskin malzeme yaralanması', olasilik: '1', frekans: '1', siddet: '3', kontroller: 'Eldiven kullanımı; atıklar uygun şekilde toplanıp etiketlenir.' }
        ] }
      ],
      aksiyonlar: [{ baslik: 'İskele periyodik kontrol etiketinin süresi yenilensin', sorumlu: 'Bakım', termin: _jsaGunEkle(7) }]
    },
    {
      degerlendirilenIs: 'Kapalı Alanda (Gübre Silosu) Temizlik Çalışması',
      alanEkipman: 'Depo Sahası — Silo No:3',
      isiYapanEkip: 'Temizlik Ekibi (2 kişi) + Gözcü',
      degerlendirmeEkibi: 'İG Uzmanı, İşyeri Hekimi',
      tarih: bugunIso(),
      revizyon: '00',
      kapsam: 'Silo tamamen boşaltıldıktan sonra yapılacak; girişten önce gaz ölçümü zorunlu.',
      hazirlikKanitlari: JSA_HAZIRLIK_KANITLARI.slice(0, 3),
      durum: 'Taslak',
      adimlar: [
        { eylem: 'Kapalı alan giriş izninin alınması ve gaz ölçümü', tehlikeler: [
          { tehlike: 'Oksijen eksikliği / toksik gaz (NH3) birikimi', olasilik: '3', frekans: '1', siddet: '40', kontroller: 'Giriş öncesi ve süreklı gaz ölçümü (O2, H2S, NH3); kapalı alan giriş izni imzalanır.' }
        ] },
        { eylem: 'Havalandırma ekipmanının kurulması', tehlikeler: [
          { tehlike: 'Elektrik çarpması (nemli ortam)', olasilik: '1', frekans: '1', siddet: '15', kontroller: 'Düşük gerilimli/su geçirmez ekipman; ayrı toprak hattı.' }
        ] },
        { eylem: 'Siloya giriş ve temizlik', tehlikeler: [
          { tehlike: 'Boğulma/gömülme (malzeme akması)', olasilik: '1', frekans: '1', siddet: '40', kontroller: 'Tüm besleme hatları enerjisi kesilip kilitlenir (LOTO); gözcü sürekli iletişimde kalır.' },
          { tehlike: 'Toz maruziyeti', olasilik: '6', frekans: '3', siddet: '3', kontroller: 'P2/P3 toz maskesi; lokal aspirasyon.' }
        ] },
        { eylem: 'Ekipman ve personelin siloyu terk etmesi', tehlikeler: [
          { tehlike: 'Dar geçitte sıkışma/düşme', olasilik: '1', frekans: '1', siddet: '7', kontroller: 'Kurtarma tripodu ve halat sistemi hazır bulundurulur.' }
        ] }
      ],
      aksiyonlar: [{ baslik: 'Kapalı alan giriş izni prosedürü güncellensin', sorumlu: 'İG Uzmanı', termin: _jsaGunEkle(14) }]
    }
  ];
}

async function jsaOrnekleriYukle() {
  const mevcutBasliklar = jsaKayitlariTumunuGetir().map(k => k.degerlendirilenIs);
  const ornekler = _jsaOrnekKayitlariUret().filter(o => !mevcutBasliklar.includes(o.degerlendirilenIs));
  if (!ornekler.length) {
    alert('Örnek JSA kayıtları zaten mevcut.');
    return;
  }
  if (!(await onayModali(`${ornekler.length} adet örnek JSA kaydı oluşturulacak. Devam edilsin mi?`, 'Örnekleri Yükle'))) return;

  ornekler.forEach(veriler => {
    const sonuc = jsaKaydiEkle(Object.assign({ isletme: _jsaAktifFirma ? _jsaAktifFirma.ad : '' }, veriler));
    if (!sonuc.basarili) console.error('Örnek JSA eklenemedi:', sonuc.hatalar);
  });
  jsaKayitlariCiz(document.getElementById('aramaKutusu').value);
}

// ==================== LİSTE GÖRÜNÜMÜ ====================

function _jsaOzetiCiz() {
  const ozet = jsaOzetiHesapla();
  const kart = (etiket, deger) => `<div class="istatistik-kutu"><span>${etiket}</span><b>${deger}</b></div>`;
  document.getElementById('ozetKutusu').innerHTML = `
    <div class="istatistik-grid">
      ${kart('Toplam JSA', ozet.toplam)}
      ${kart('Taslak', ozet.taslak)}
      ${kart('Onay Bekliyor', ozet.onayBekliyor)}
      ${kart('Onaylandı', ozet.onaylandi)}
      ${kart('Yüksek/Çok Yüksek Riskli', ozet.yuksekRiskliler.length)}
    </div>
  `;
}

function jsaKayitlariCiz(aramaMetni) {
  const govde = document.getElementById('tabloGovde');
  const bosDurum = document.getElementById('bosDurum');
  const durumFiltre = document.getElementById('durumFiltre').value;
  const kayitlar = jsaKayitlariniGetir(aramaMetni, { durum: durumFiltre });

  govde.innerHTML = '';
  if (!kayitlar.length) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = 'Henüz bir JSA kaydı yok.';
  } else {
    bosDurum.classList.remove('gorunur');
    kayitlar.forEach(k => {
      const satir = document.createElement('tr');
      const riskHtml = k.enYuksekRisk
        ? `<span class="jsa-risk-rozet" style="background:${_jsaRiskRengi(k.enYuksekRisk.duzey)}20; color:${_jsaRiskRengi(k.enYuksekRisk.duzey)};">${_jsaKacir(k.enYuksekRisk.duzey.etiket)} (${k.enYuksekRisk.puan})</span>`
        : '<span style="color:var(--metin-soluk);">-</span>';
      satir.innerHTML = `
        <td>${_jsaKacir(k.kayitNo)}</td>
        <td>${_jsaKacir(k.degerlendirilenIs)}</td>
        <td>${_jsaKacir(k.isletme) || '-'}${k.alanEkipman ? ' — ' + _jsaKacir(k.alanEkipman) : ''}</td>
        <td>${k.tarih || '-'}</td>
        <td>${riskHtml}</td>
        <td><span class="genel-rozet rozet-${jsaRozetSinifAdi(k.durum)}">${_jsaKacir(k.durum)}</span></td>
        <td>
          <button class="tablo-buton" data-duzenle="${k.id}">Düzenle</button>
          <button class="tablo-buton sil" data-sil="${k.id}">Sil</button>
        </td>
      `;
      govde.appendChild(satir);
    });
    govde.querySelectorAll('[data-duzenle]').forEach(btn => btn.addEventListener('click', () => jsaEditorAc(btn.getAttribute('data-duzenle'))));
    govde.querySelectorAll('[data-sil]').forEach(btn => btn.addEventListener('click', async () => {
      if (!(await onayModali('Bu JSA kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.', 'Sil'))) return;
      const sonuc = jsaKaydiSil(btn.getAttribute('data-sil'));
      if (!sonuc.basarili) { alert(sonuc.hata); return; }
      jsaKayitlariCiz(document.getElementById('aramaKutusu').value);
      _jsaOzetiCiz();
    }));
  }
  _jsaOzetiCiz();
}

function _jsaRiskRengi(duzey) {
  const etiket = duzey && duzey.etiket;
  if (etiket === 'Tolerans Gösterilemez' || etiket === 'Esaslı Risk') return '#b91c1c';
  if (etiket === 'Önemli Risk') return '#b45309';
  if (etiket === 'Olası Risk') return '#1d4ed8';
  return '#15803d';
}

// ==================== EDİTÖR: GENEL ====================

function _jsaGorunumDegistir(gorunum) {
  document.getElementById('bolum-liste').style.display = gorunum === 'liste' ? '' : 'none';
  document.getElementById('bolum-editor').style.display = gorunum === 'editor' ? '' : 'none';
}

function jsaEditorAc(id) {
  _jsaDuzenlenenId = id || null;
  const mevcut = id ? jsaKaydiIdIleGetirRepo(id) : null;
  _jsaTaslak = jsaKaydiOlustur(mevcut || { isletme: _jsaAktifFirma ? _jsaAktifFirma.ad : '' });
  document.getElementById('editorBaslik').textContent = mevcut ? `Düzenle — ${mevcut.kayitNo}` : 'Yeni JSA';
  _jsaAdim1FormunuDoldur();
  _jsaHazirlikKanitiCiz();
  _jsaGenelFotoOnizlemeCiz();
  _jsaAdimListesiCiz();
  _jsaTehlikeAlaniCiz();
  _jsaAdim3FormunuDoldur();
  jsaAdimGoster(1);
  _jsaGorunumDegistir('editor');
}

function jsaEditorKapat() {
  _jsaTaslak = null;
  _jsaDuzenlenenId = null;
  _jsaGorunumDegistir('liste');
  jsaKayitlariCiz(document.getElementById('aramaKutusu').value);
}

function jsaAdimGoster(n) {
  [1, 2, 3].forEach(i => {
    document.getElementById('jsaAdim' + i).style.display = i === n ? '' : 'none';
    const btn = document.getElementById('adimSekme' + i);
    btn.classList.toggle('birincil', i === n);
    btn.classList.toggle('ikincil', i !== n);
  });
  if (n === 2) _jsaTehlikeAlaniCiz();
}

// ==================== ADIM 1: Görev ve iş adımları ====================

function _jsaAdim1FormunuDoldur() {
  document.getElementById('jsaIsletme').value = _jsaTaslak.isletme;
  document.getElementById('jsaDegerlendirilenIs').value = _jsaTaslak.degerlendirilenIs;
  document.getElementById('jsaAlanEkipman').value = _jsaTaslak.alanEkipman;
  document.getElementById('jsaIsiYapanEkip').value = _jsaTaslak.isiYapanEkip;
  document.getElementById('jsaDegerlendirmeEkibi').value = _jsaTaslak.degerlendirmeEkibi;
  document.getElementById('jsaTarih').value = _jsaTaslak.tarih;
  document.getElementById('jsaRevizyon').value = _jsaTaslak.revizyon;
  document.getElementById('jsaKapsam').value = _jsaTaslak.kapsam;
}

function _jsaAdim1FormunuTaslagaYaz() {
  _jsaTaslak.isletme = document.getElementById('jsaIsletme').value.trim();
  _jsaTaslak.degerlendirilenIs = document.getElementById('jsaDegerlendirilenIs').value.trim();
  _jsaTaslak.alanEkipman = document.getElementById('jsaAlanEkipman').value.trim();
  _jsaTaslak.isiYapanEkip = document.getElementById('jsaIsiYapanEkip').value.trim();
  _jsaTaslak.degerlendirmeEkibi = document.getElementById('jsaDegerlendirmeEkibi').value.trim();
  _jsaTaslak.tarih = document.getElementById('jsaTarih').value;
  _jsaTaslak.revizyon = document.getElementById('jsaRevizyon').value.trim();
  _jsaTaslak.kapsam = document.getElementById('jsaKapsam').value.trim();
}

function _jsaHazirlikKanitiCiz() {
  const kutu = document.getElementById('hazirlikKanitiListesi');
  kutu.innerHTML = JSA_HAZIRLIK_KANITLARI.map(h => `
    <label>
      <input type="checkbox" data-hazirlik="${_jsaKacir(h)}" ${_jsaTaslak.hazirlikKanitlari.includes(h) ? 'checked' : ''}>
      ${_jsaKacir(h)}
    </label>
  `).join('');
  kutu.querySelectorAll('[data-hazirlik]').forEach(chk => {
    chk.addEventListener('change', () => {
      const deger = chk.getAttribute('data-hazirlik');
      if (chk.checked) { if (!_jsaTaslak.hazirlikKanitlari.includes(deger)) _jsaTaslak.hazirlikKanitlari.push(deger); }
      else _jsaTaslak.hazirlikKanitlari = _jsaTaslak.hazirlikKanitlari.filter(h => h !== deger);
    });
  });
}

function _jsaGenelFotoOnizlemeCiz() {
  const kutu = document.getElementById('genelFotoOnizleme');
  kutu.innerHTML = _jsaTaslak.genelFotoUrl
    ? `<div style="display:flex; align-items:center; gap:10px;">
         <img data-foto-ref="${_jsaKacir(_jsaTaslak.genelFotoUrl)}" style="width:96px; height:96px; object-fit:cover; border-radius:8px; border:1px solid var(--kenarlik);">
         <button type="button" class="tablo-buton sil" id="genelFotoKaldirBtn">Fotoğrafı Kaldır</button>
       </div>`
    : '<div style="font-size:12px; color:var(--metin-soluk);">Henüz fotoğraf eklenmedi.</div>';
  if (_jsaTaslak.genelFotoUrl) {
    fotoReferanslariCoz(kutu);
    document.getElementById('genelFotoKaldirBtn').addEventListener('click', () => {
      _jsaTaslak.genelFotoUrl = '';
      _jsaGenelFotoOnizlemeCiz();
    });
  }
}

function _jsaAdimListesiCiz() {
  const kutu = document.getElementById('jsaAdimListesi');
  kutu.innerHTML = _jsaTaslak.adimlar.map((a, i) => `
    <div class="jsa-adim-baslik">
      <div class="jsa-adim-no">${String(i + 1).padStart(2, '0')}</div>
      <input type="text" class="jsa-adim-eylem" data-adim-eylem="${a.id}" placeholder="Tek eylemle, fiille başlayın" value="${_jsaKacir(a.eylem)}">
      <button type="button" class="tablo-buton sil" data-adim-sil="${a.id}">✕</button>
    </div>
  `).join('');
  kutu.querySelectorAll('[data-adim-eylem]').forEach(input => {
    input.addEventListener('input', () => {
      const adim = _jsaTaslak.adimlar.find(a => a.id === input.getAttribute('data-adim-eylem'));
      if (adim) adim.eylem = input.value;
    });
  });
  kutu.querySelectorAll('[data-adim-sil]').forEach(btn => {
    btn.addEventListener('click', () => {
      _jsaTaslak.adimlar = _jsaTaslak.adimlar.filter(a => a.id !== btn.getAttribute('data-adim-sil'));
      _jsaAdimListesiCiz();
    });
  });
}

function _jsaAdimEkle() {
  _jsaTaslak.adimlar.push(jsaAdimOlustur({}));
  _jsaAdimListesiCiz();
}

// ==================== ADIM 2: Tehlikeler, riskler ve kontroller ====================

function _jsaTehlikeAlaniCiz() {
  const alan = document.getElementById('jsaTehlikeAlani');
  if (!_jsaTaslak.adimlar.length) {
    alan.innerHTML = '<p style="color:var(--metin-soluk); font-size:13px;">Önce 1. adımda en az bir iş adımı ekleyin.</p>';
    return;
  }

  alan.innerHTML = _jsaTaslak.adimlar.map((adim, i) => `
    <div class="jsa-adim-kutu">
      <div class="jsa-adim-baslik">
        <div class="jsa-adim-no">${String(i + 1).padStart(2, '0')}</div>
        <div style="font-weight:700;">${_jsaKacir(adim.eylem) || '(iş adımı boş)'}</div>
      </div>
      <div class="jsa-tehlike-satir" style="font-size:11px; font-weight:700; color:var(--metin-soluk); border-top:none;">
        <div>Tehlike</div><div>Olasılık</div><div>Frekans</div><div>Şiddet</div><div>Risk</div><div>Kontroller / Önlemler</div><div></div>
      </div>
      ${adim.tehlikeler.map(t => _jsaTehlikeSatiriHtml(adim.id, t)).join('')}
      <button type="button" class="ikincil" data-tehlike-ekle="${adim.id}" style="margin-top:8px;">+ Tehlike Ekle</button>
    </div>
  `).join('');

  alan.querySelectorAll('[data-tehlike-ekle]').forEach(btn => btn.addEventListener('click', () => {
    const adim = _jsaTaslak.adimlar.find(a => a.id === btn.getAttribute('data-tehlike-ekle'));
    if (adim) { adim.tehlikeler.push(jsaTehlikeOlustur({})); _jsaTehlikeAlaniCiz(); }
  }));
  alan.querySelectorAll('[data-tehlike-sil]').forEach(btn => btn.addEventListener('click', () => {
    const [adimId, tehlikeId] = btn.getAttribute('data-tehlike-sil').split('|');
    const adim = _jsaTaslak.adimlar.find(a => a.id === adimId);
    if (adim) { adim.tehlikeler = adim.tehlikeler.filter(t => t.id !== tehlikeId); _jsaTehlikeAlaniCiz(); }
  }));
  alan.querySelectorAll('[data-tehlike-alan]').forEach(el => {
    const olayAdi = el.tagName === 'SELECT' ? 'change' : 'input';
    el.addEventListener(olayAdi, () => {
      const [adimId, tehlikeId, alanAdi] = el.getAttribute('data-tehlike-alan').split('|');
      const adim = _jsaTaslak.adimlar.find(a => a.id === adimId);
      const tehlike = adim && adim.tehlikeler.find(t => t.id === tehlikeId);
      if (!tehlike) return;
      tehlike[alanAdi] = el.value;
      if (['olasilik', 'frekans', 'siddet'].includes(alanAdi)) {
        const rozet = alan.querySelector(`[data-risk-rozet="${adimId}|${tehlikeId}"]`);
        if (rozet) rozet.outerHTML = _jsaRiskRozetiHtml(tehlike, adimId, tehlikeId);
      }
    });
  });
}

function _jsaRiskRozetiHtml(tehlike, adimId, tehlikeId) {
  const puan = jsaTehlikeRiskPuaniHesapla(tehlike);
  if (puan == null) return `<span data-risk-rozet="${adimId}|${tehlikeId}" style="font-size:11px; color:var(--metin-soluk);">-</span>`;
  const duzey = riskDuzeyiGetir(puan, 'Fine-Kinney');
  const renk = _jsaRiskRengi(duzey);
  return `<span data-risk-rozet="${adimId}|${tehlikeId}" class="jsa-risk-rozet" style="background:${renk}20; color:${renk};">${_jsaKacir(duzey.etiket)} (${puan})</span>`;
}

function _jsaTehlikeSatiriHtml(adimId, t) {
  const secenekHtml = (secenekler, secili) => secenekler.map(s => `<option value="${s.deger}" ${String(s.deger) === String(secili) ? 'selected' : ''}>${_jsaKacir(s.etiket)}</option>`).join('');
  return `
    <div class="jsa-tehlike-satir">
      <textarea rows="2" data-tehlike-alan="${adimId}|${t.id}|tehlike" placeholder="Tehlike tanımı">${_jsaKacir(t.tehlike)}</textarea>
      <select data-tehlike-alan="${adimId}|${t.id}|olasilik"><option value="">—</option>${secenekHtml(OLASILIK_SECENEKLERI, t.olasilik)}</select>
      <select data-tehlike-alan="${adimId}|${t.id}|frekans"><option value="">—</option>${secenekHtml(FREKANS_SECENEKLERI, t.frekans)}</select>
      <select data-tehlike-alan="${adimId}|${t.id}|siddet"><option value="">—</option>${secenekHtml(SIDDET_SECENEKLERI, t.siddet)}</select>
      <div>${_jsaRiskRozetiHtml(t, adimId, t.id)}</div>
      <textarea rows="2" data-tehlike-alan="${adimId}|${t.id}|kontroller" placeholder="Alınacak/alınmış kontrol önlemleri">${_jsaKacir(t.kontroller)}</textarea>
      <button type="button" class="tablo-buton sil" data-tehlike-sil="${adimId}|${t.id}">✕</button>
    </div>
  `;
}

// ==================== ADIM 3: Rapor, onay ve takip ====================

function _jsaAdim3FormunuDoldur() {
  document.getElementById('jsaDurum').innerHTML = JSA_DURUMLARI.map(d => `<option value="${d}" ${d === _jsaTaslak.durum ? 'selected' : ''}>${d}</option>`).join('');
  _jsaImzaDurumGosterCiz();
  _jsaAksiyonListesiCiz();
}

function _jsaImzaDurumGosterCiz() {
  ['hazirlayan', 'onaylayan'].forEach(rol => {
    const imza = _jsaTaslak.imzalar[rol];
    const el = document.getElementById(rol + 'ImzaDurum');
    el.textContent = imza && imza.imzaUrl
      ? `✓ İmzalandı — ${imza.ad} (${gunAyYil((imza.tarih || '').slice(0, 10))})`
      : 'Henüz imzalanmadı';
    el.style.color = imza && imza.imzaUrl ? '#15803d' : 'var(--metin-soluk)';
  });
}

function _jsaAksiyonListesiCiz() {
  const kutu = document.getElementById('jsaAksiyonListesi');
  if (!_jsaTaslak.aksiyonlar.length) {
    kutu.innerHTML = '<p style="font-size:12px; color:var(--metin-soluk);">Henüz aksiyon eklenmedi.</p>';
    return;
  }
  kutu.innerHTML = _jsaTaslak.aksiyonlar.map((a, i) => `
    <div class="form-satir-ikili" style="align-items:flex-end; margin-bottom:8px;" data-aksiyon-satir="${i}">
      <div>
        <label>Aksiyon</label>
        <input type="text" data-aksiyon-alan="${i}|baslik" value="${_jsaKacir(a.baslik)}" placeholder="Düzeltici/önleyici faaliyet">
      </div>
      <div style="display:flex; gap:8px;">
        <div style="flex:1;">
          <label>Sorumlu</label>
          <input type="text" data-aksiyon-alan="${i}|sorumlu" value="${_jsaKacir(a.sorumlu)}">
        </div>
        <div style="flex:1;">
          <label>Termin</label>
          <input type="date" data-aksiyon-alan="${i}|termin" value="${a.termin || ''}">
        </div>
        <button type="button" class="tablo-buton sil" data-aksiyon-sil="${i}" style="margin-bottom:2px;">✕</button>
      </div>
    </div>
  `).join('');
  kutu.querySelectorAll('[data-aksiyon-alan]').forEach(input => {
    input.addEventListener('input', () => {
      const [i, alanAdi] = input.getAttribute('data-aksiyon-alan').split('|');
      _jsaTaslak.aksiyonlar[Number(i)][alanAdi] = input.value;
    });
  });
  kutu.querySelectorAll('[data-aksiyon-sil]').forEach(btn => {
    btn.addEventListener('click', () => {
      _jsaTaslak.aksiyonlar.splice(Number(btn.getAttribute('data-aksiyon-sil')), 1);
      _jsaAksiyonListesiCiz();
    });
  });
}

function _jsaAksiyonEkle() {
  _jsaTaslak.aksiyonlar.push({ baslik: '', sorumlu: '', termin: '' });
  _jsaAksiyonListesiCiz();
}

// ==================== KAYDET ====================

async function jsaEditorKaydet() {
  _jsaAdim1FormunuTaslagaYaz();
  _jsaTaslak.durum = document.getElementById('jsaDurum').value;

  const dogrulama = jsaDogrula(_jsaTaslak);
  if (!dogrulama.gecerli) {
    jsaAdimGoster(1);
    document.getElementById('degerlendirilenIsHata').textContent = dogrulama.hatalar.degerlendirilenIs || '';
    document.getElementById('tarihHata').textContent = dogrulama.hatalar.tarih || '';
    if (dogrulama.hatalar.adimlar) alert(dogrulama.hatalar.adimlar);
    return;
  }
  document.getElementById('degerlendirilenIsHata').textContent = '';
  document.getElementById('tarihHata').textContent = '';

  const dugme = document.getElementById('editorKaydetBtn');
  dugme.disabled = true;
  try {
    const sonuc = _jsaDuzenlenenId ? jsaKaydiGuncelle(_jsaDuzenlenenId, _jsaTaslak) : jsaKaydiEkle(_jsaTaslak);
    if (!sonuc.basarili) { alert('Kaydedilemedi: ' + Object.values(sonuc.hatalar || {})[0]); return; }

    const yeniAksiyonlar = _jsaTaslak.aksiyonlar.filter(a => !a._aktarildi && (a.baslik || '').trim());
    if (yeniAksiyonlar.length) {
      const uyarilar = jsaAksiyonlariAktar(sonuc.kayit.id, yeniAksiyonlar);
      yeniAksiyonlar.forEach(a => { a._aktarildi = true; });
      jsaKaydiGuncelleRepo(sonuc.kayit.id, { aksiyonlar: _jsaTaslak.aksiyonlar });
      if (uyarilar.length) alert(uyarilar.join('\n'));
    }

    jsaEditorKapat();
  } catch (hata) {
    console.error(hata);
    alert('Kaydetme sırasında beklenmeyen bir hata oluştu: ' + (hata.message || hata));
  } finally {
    dugme.disabled = false;
  }
}

// ==================== KAŞE / İMZA MODAL ====================
// modules/tespit-oneri/ui.js _toImzaPaduBagla/_toImzaKirp ile aynı canvas
// imza pad'i deseni — kayıt henüz kaydedilmemiş (taslak) olabileceğinden
// Firestore'a değil doğrudan _jsaTaslak.imzalar'a yazılır; Storage'a hiç
// yüklenmeden kırpılmış canvas'ın küçük PNG dataURL'i saklanır (kısa
// ömürlü, birkaç KB — modules/acil-durum/ui.js _kfImzaPaduBagla ile aynı
// yaklaşım).

let _jsaImzaAktifRol = null;
let _jsaImzaPad = null;

const _JSA_IMZA_ROL_ETIKETLERI = { hazirlayan: 'Hazırlayan', onaylayan: 'Onaylayan' };

function _jsaImzaPaduBagla(canvasId) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  let dolu = false, ciziliyor = false, sonX = 0, sonY = 0;

  function boyutlandir() {
    const oran = window.devicePixelRatio || 1;
    const genislik = canvas.clientWidth || 300, yukseklik = canvas.clientHeight || 120;
    canvas.width = genislik * oran;
    canvas.height = yukseklik * oran;
    ctx.scale(oran, oran);
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e3a8a';
  }
  boyutlandir();

  function konum(e) {
    const r = canvas.getBoundingClientRect();
    const x = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0].clientX);
    const y = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0].clientY);
    return { x: x - r.left, y: y - r.top };
  }
  function basla(e) { ciziliyor = true; dolu = true; const p = konum(e); sonX = p.x; sonY = p.y; }
  function ciz(e) {
    if (!ciziliyor) return;
    e.preventDefault();
    const p = konum(e);
    ctx.beginPath(); ctx.moveTo(sonX, sonY); ctx.lineTo(p.x, p.y); ctx.stroke();
    sonX = p.x; sonY = p.y;
  }
  function bitir() { ciziliyor = false; }

  canvas.addEventListener('pointerdown', basla);
  canvas.addEventListener('pointermove', ciz);
  window.addEventListener('pointerup', bitir);

  return {
    temizle() { ctx.clearRect(0, 0, canvas.width, canvas.height); dolu = false; },
    doluMu: () => dolu,
    canvasElemani: canvas
  };
}

function _jsaImzaKirp(canvas) {
  const ctx = canvas.getContext('2d');
  const genislik = canvas.width, yukseklik = canvas.height;
  const veri = ctx.getImageData(0, 0, genislik, yukseklik).data;
  let minX = genislik, minY = yukseklik, maxX = 0, maxY = 0, doluVarMi = false;
  for (let y = 0; y < yukseklik; y++) {
    for (let x = 0; x < genislik; x++) {
      if (veri[(y * genislik + x) * 4 + 3] > 10) {
        doluVarMi = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (!doluVarMi) return canvas;
  const bosluk = Math.round(genislik * 0.02);
  minX = Math.max(0, minX - bosluk);
  minY = Math.max(0, minY - bosluk);
  maxX = Math.min(genislik, maxX + bosluk);
  maxY = Math.min(yukseklik, maxY + bosluk);

  const kirpilmis = document.createElement('canvas');
  kirpilmis.width = maxX - minX;
  kirpilmis.height = maxY - minY;
  kirpilmis.getContext('2d').drawImage(canvas, minX, minY, kirpilmis.width, kirpilmis.height, 0, 0, kirpilmis.width, kirpilmis.height);
  return kirpilmis;
}

function imzaModalAc(rol) {
  _jsaImzaAktifRol = rol;
  document.getElementById('imzaKayitEtiketi').textContent = _JSA_IMZA_ROL_ETIKETLERI[rol] + ' imzası';
  document.getElementById('imzaAdSoyad').value = (_jsaTaslak.imzalar[rol] && _jsaTaslak.imzalar[rol].ad) || (oturumdakiKullanici() || {}).adSoyad || '';
  document.getElementById('imzaHata').textContent = '';
  document.getElementById('imzaKatmani').classList.add('acik');
  requestAnimationFrame(() => {
    if (!_jsaImzaPad) _jsaImzaPad = _jsaImzaPaduBagla('imzaCanvas');
    if (_jsaImzaPad) _jsaImzaPad.temizle();
  });
}

function imzaModalKapat() {
  document.getElementById('imzaKatmani').classList.remove('acik');
  _jsaImzaAktifRol = null;
}

function _jsaImzaKaydet() {
  const hataEl = document.getElementById('imzaHata');
  const ad = document.getElementById('imzaAdSoyad').value.trim();
  if (!ad) { hataEl.textContent = 'Lütfen ad soyad girin.'; return; }
  if (!_jsaImzaPad || !_jsaImzaPad.doluMu()) { hataEl.textContent = 'Lütfen imza alanına imzanızı atın.'; return; }

  const dataUrl = _jsaImzaKirp(_jsaImzaPad.canvasElemani).toDataURL('image/png');
  _jsaTaslak.imzalar[_jsaImzaAktifRol] = jsaImzaVeriUret(ad, dataUrl);
  _jsaImzaDurumGosterCiz();
  imzaModalKapat();
}

// ==================== BAŞLAT ====================

function jsaSayfasiniBaslat(firma) {
  _jsaAktifFirma = firma;

  document.getElementById('aramaKutusu').addEventListener('input', e => jsaKayitlariCiz(e.target.value));
  document.getElementById('durumFiltre').innerHTML = '<option value="">Tüm Durumlar</option>' + JSA_DURUMLARI.map(d => `<option value="${d}">${d}</option>`).join('');
  document.getElementById('durumFiltre').addEventListener('change', () => jsaKayitlariCiz(document.getElementById('aramaKutusu').value));
  document.getElementById('yeniKayitBtn').addEventListener('click', () => jsaEditorAc(null));
  document.getElementById('ornekYukleBtn').addEventListener('click', jsaOrnekleriYukle);
  document.getElementById('formAyarlariBtn').addEventListener('click', () => formAyarlariModalAc('jsa', 'İş Güvenliği Analizi (JSA)'));

  document.getElementById('editorGeriLink').addEventListener('click', e => { e.preventDefault(); jsaEditorKapat(); });
  document.getElementById('editorKaydetBtn').addEventListener('click', jsaEditorKaydet);
  document.getElementById('editorPdfBtn').addEventListener('click', () => { _jsaAdim1FormunuTaslagaYaz(); jsaRaporuPdfOlustur(_jsaTaslak, _jsaAktifFirma); });
  document.getElementById('editorWordBtn').addEventListener('click', () => { _jsaAdim1FormunuTaslagaYaz(); jsaRaporuWordOlustur(_jsaTaslak, _jsaAktifFirma); });

  document.getElementById('adimSekme1').addEventListener('click', () => jsaAdimGoster(1));
  document.getElementById('adimSekme2').addEventListener('click', () => { _jsaAdim1FormunuTaslagaYaz(); jsaAdimGoster(2); });
  document.getElementById('adimSekme3').addEventListener('click', () => jsaAdimGoster(3));

  document.getElementById('jsaAdimEkleBtn').addEventListener('click', _jsaAdimEkle);
  document.getElementById('jsaAksiyonEkleBtn').addEventListener('click', _jsaAksiyonEkle);

  document.getElementById('genelFotoSecBtn').addEventListener('click', () => document.getElementById('genelFotoDosya').click());
  document.getElementById('genelFotoDosya').addEventListener('change', async e => {
    const dosya = e.target.files[0];
    e.target.value = '';
    if (!dosya) return;
    try {
      const sonuc = await fotoYukle(dosya, 'jsa/' + (_jsaDuzenlenenId || 'gecici'));
      _jsaTaslak.genelFotoUrl = sonuc.url;
      _jsaGenelFotoOnizlemeCiz();
    } catch (hata) {
      alert(hata.message || 'Fotoğraf yüklenemedi.');
    }
  });

  document.getElementById('hazirlayanImzaBtn').addEventListener('click', () => imzaModalAc('hazirlayan'));
  document.getElementById('onaylayanImzaBtn').addEventListener('click', () => imzaModalAc('onaylayan'));
  document.getElementById('imzaKatmaniIptalBtn').addEventListener('click', imzaModalKapat);
  document.getElementById('imzaKatmaniKapatBtn').addEventListener('click', imzaModalKapat);
  document.getElementById('imzaTemizleBtn').addEventListener('click', () => { if (_jsaImzaPad) _jsaImzaPad.temizle(); });
  document.getElementById('imzaKaydetBtn').addEventListener('click', _jsaImzaKaydet);

  jsaKayitlariCiz('');
}
