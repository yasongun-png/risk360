let _plDuzenlenenGorevId = null;
let _plDuzenlenenNotId = null;

function _plKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function planlayiciSayfasiniBaslat() {
  document.querySelectorAll('[data-sekme]').forEach(btn => btn.addEventListener('click', () => _plSekmeDegistir(btn.getAttribute('data-sekme'))));

  // Hızlı ekle: yazıp Enter. Kullanıcı isteği: başlangıç ve bitiş tarihi yanında girilsin.
  // Tarihler eklemeden sonra korunur (aynı tarihlerle art arda iş girilebilsin).
  document.getElementById('hizliEkleForm').addEventListener('submit', e => {
    e.preventDefault();
    const baslik = document.getElementById('hizliBaslik').value;
    const sonuc = planGoreviKaydet({
      baslik,
      baslangicTarihi: document.getElementById('hizliBaslangic').value,
      tarih: document.getElementById('hizliTarih').value
    });
    document.getElementById('hizliHata').textContent = sonuc.basarili ? '' : (sonuc.hatalar.tarih || '');
    if (!sonuc.basarili) { document.getElementById(sonuc.hatalar.tarih ? 'hizliTarih' : 'hizliBaslik').focus(); return; }
    document.getElementById('hizliBaslik').value = '';
    gorevleriCiz();
  });
  document.getElementById('hizliBaslangic').value = bugunIso();
  document.getElementById('hizliTarih').value = bugunIso();
  document.getElementById('yeniGorevBtn').addEventListener('click', () => gorevModalAc(null));
  document.getElementById('planExcelBtn').addEventListener('click', planExcelIndir);
  document.getElementById('gorevForm').addEventListener('submit', gorevFormGonderildi);
  ['gorevIptalBtn', 'gorevKapatBtn'].forEach(id => document.getElementById(id).addEventListener('click', gorevModalKapat));
  document.getElementById('kategoriFiltre').addEventListener('change', gorevleriCiz);
  document.getElementById('sorumluFiltre').addEventListener('change', gorevleriCiz);
  document.getElementById('gorevArama').addEventListener('input', gorevleriCiz);

  document.getElementById('gOncelik').innerHTML = PLAN_ONCELIKLERI.map(o => `<option>${o}</option>`).join('');
  document.getElementById('gDurum').innerHTML = PLAN_DURUMLARI.map(o => `<option>${o}</option>`).join('');
  document.getElementById('gTekrar').innerHTML = PLAN_TEKRARLARI.map(o => `<option>${o}</option>`).join('');
  document.getElementById('kategoriListesi').innerHTML = PLAN_KATEGORILERI.map(k => `<option value="${_plKacir(k)}">`).join('');

  document.getElementById('yeniNotBtn').addEventListener('click', () => notModalAc(null));
  document.getElementById('notForm').addEventListener('submit', notFormGonderildi);
  ['notIptalBtn', 'notKapatBtn'].forEach(id => document.getElementById(id).addEventListener('click', notModalKapat));
  document.getElementById('notArama').addEventListener('input', notlariCiz);
  document.getElementById('nRenkler').innerHTML = NOT_RENKLERI.map(r =>
    `<label class="pl-renk" title="${r.ad}" style="background:${r.renk};"><input type="radio" name="nRenk" value="${r.renk}"></label>`).join('');

  const sekme = (location.hash || '').replace('#', '');
  _plSekmeDegistir(sekme === 'notlar' ? 'notlar' : 'isler');
}

function _plSekmeDegistir(ad) {
  document.querySelectorAll('[data-sekme]').forEach(b => b.classList.toggle('sekme-seciliDegil', b.getAttribute('data-sekme') !== ad));
  document.getElementById('bolum-isler').style.display = ad === 'isler' ? '' : 'none';
  document.getElementById('bolum-notlar').style.display = ad === 'notlar' ? '' : 'none';
  history.replaceState(null, '', '#' + ad);
  if (ad === 'isler') gorevleriCiz(); else notlariCiz();
}

// ==================== İŞLER ====================

function _plOzetCiz() {
  const o = planOzetiHesapla();
  const kart = (etiket, deger, renk) => `<div class="istatistik-kutu"><span>${etiket}</span><b style="${renk ? 'color:' + renk : ''}">${deger}</b></div>`;
  document.getElementById('planOzeti').innerHTML =
    kart('Gecikmiş', o.gecikmis, o.gecikmis ? 'var(--hata)' : '') + kart('Bugün', o.bugun) +
    kart('Önümüzdeki 7 Gün', o.hafta) + kart('Açık İş', o.acik) + kart('Bu Ay Tamamlanan', o.buAyTamamlanan, 'var(--basari)');
}

// Kullanıcı isteği: son günü gelen (planlanan bitişi bugün olan) işler sayfa
// açılınca kırmızı yanıp sönsün, tıklayınca dursun. Durdurulanlar bu tarayıcıda
// o gün boyunca hatırlanır; ertesi gün liste sıfırlanır.
const _PL_SONGUN_ANAHTARI = 'isg_plan_songun_durdurulan';

function _plSonGunDurdurulanlar() {
  try {
    const v = JSON.parse(localStorage.getItem(_PL_SONGUN_ANAHTARI) || '{}');
    return v.gun === bugunIso() && Array.isArray(v.idler) ? v.idler : [];
  } catch (e) { return []; }
}

function _plSonGunDurdur(id) {
  const idler = _plSonGunDurdurulanlar();
  if (!idler.includes(id)) idler.push(id);
  try { localStorage.setItem(_PL_SONGUN_ANAHTARI, JSON.stringify({ gun: bugunIso(), idler })); } catch (e) { /* yalnızca bu oturumda durur */ }
}

// Kategori, sorumlu ve arama filtresine uyan işler (ekran ve Excel raporu aynı listeyi kullanır).
// Sorumlu filtresinde '-' = sorumlusu boş olanlar.
function _plFiltreliGorevler() {
  const kategori = document.getElementById('kategoriFiltre').value;
  const sorumlu = document.getElementById('sorumluFiltre').value;
  const arama = document.getElementById('gorevArama').value.trim().toLocaleLowerCase('tr-TR');
  return planGorevleriGetir().filter(g => (!kategori || g.kategori === kategori)
    && (!sorumlu || (sorumlu === '-' ? !g.sorumlu : g.sorumlu === sorumlu))
    && (!arama || (g.baslik + ' ' + g.aciklama + ' ' + (g.sorumlu || '')).toLocaleLowerCase('tr-TR').includes(arama)));
}

// Ekrandaki gruplar (sırasıyla): termini bugün olanlar, bir defalık işlerin tarih
// grupları, tekrarlayan iş grupları; tamamlananlar ayrı.
function _plEkranGruplari(liste) {
  // Kullanıcı isteği: her gün / aylık / yıllık işler ayrı ayrı görünsün — tarih
  // grupları yalnızca bir defalık işler için; tekrarlayanlar kendi bölümlerinde.
  const tekrarliMi = g => g.tekrar && g.tekrar !== 'Bir defalık';
  const bugun = bugunIso();
  // Kullanıcı isteği: termini (son günü) bugün olan işler en üstte ayrı grup —
  // tekrarlayan olsun olmasın; diğer gruplarda tekrar görünmez.
  const sonGunMu = g => g.durum !== 'Tamamlandı' && g.tarih === bugun;
  const sonGunGrubu = { baslik: '⏰ Termini Bugün Olan İşler', renk: '#dc2626', liste: planBitiseGoreSirala(liste.filter(sonGunMu)) };
  const { gruplar } = planGorevleriGrupla(liste.filter(g => !tekrarliMi(g) && !sonGunMu(g)));
  const { tamamlanan } = planGorevleriGrupla(liste);
  const tekrarGruplari = [
    { tekrar: 'Her gün', baslik: '🔁 Her Gün Yapılan İşler', renk: '#047857' },
    { tekrar: 'Her hafta', baslik: '🔁 Haftalık İşler', renk: '#0e7490' },
    { tekrar: 'Her ay', baslik: '🔁 Aylık İşler', renk: '#7c3aed' },
    { tekrar: 'Her yıl', baslik: '🔁 Yıllık İşler', renk: '#b45309' }
  ].map(gr => Object.assign(gr, {
    liste: planBitiseGoreSirala(liste.filter(g => g.durum !== 'Tamamlandı' && !sonGunMu(g) && g.tekrar === gr.tekrar))
  }));
  return { dolu: [sonGunGrubu].concat(gruplar, tekrarGruplari).filter(gr => gr.liste.length), tamamlanan };
}

function gorevleriCiz() {
  _plOzetCiz();
  const kategori = document.getElementById('kategoriFiltre').value;
  const tumu = planGorevleriGetir();
  const kategoriler = [...new Set(tumu.map(g => g.kategori).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'));
  const secim = document.getElementById('kategoriFiltre');
  secim.innerHTML = '<option value="">Tüm Kategoriler</option>' + kategoriler.map(k => `<option ${k === kategori ? 'selected' : ''}>${_plKacir(k)}</option>`).join('');
  const sorumluSecim = document.getElementById('sorumluFiltre');
  const sorumlu = sorumluSecim.value;
  const sorumlular = [...new Set(tumu.map(g => g.sorumlu).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'));
  sorumluSecim.innerHTML = '<option value="">Tüm Sorumlular</option>'
    + sorumlular.map(s => `<option value="${_plKacir(s)}" ${s === sorumlu ? 'selected' : ''}>${_plKacir(s)}</option>`).join('')
    + (sorumlular.length ? `<option value="-" ${sorumlu === '-' ? 'selected' : ''}>(Sorumlu belirtilmemiş)</option>` : '');
  sorumluSecim.style.display = sorumlular.length ? '' : 'none';
  if (sorumlu && !sorumlular.includes(sorumlu) && sorumlu !== '-') sorumluSecim.value = '';
  const liste = _plFiltreliGorevler();
  const tekrarliMi = g => g.tekrar && g.tekrar !== 'Bir defalık';
  const bugun = bugunIso();
  const t = g => g.tarih || g.baslangicTarihi || '';
  const { dolu, tamamlanan } = _plEkranGruplari(liste);

  const durdurulanlar = _plSonGunDurdurulanlar();
  const satir = g => {
    const bitti = g.durum === 'Tamamlandı';
    const saat = g.saat ? ' ' + g.saat : '';
    const tarih = [
      g.baslangicTarihi ? `▶ ${gunAyYil(g.baslangicTarihi)}` : '',
      g.tarih ? `🏁 ${gunAyYil(g.tarih)}` : ''
    ].filter(Boolean).join(' → ') + (g.baslangicTarihi || g.tarih ? saat : '');
    const baslamaEtiketi = bitti || tekrarliMi(g) ? '' : g.baslangicTarihi === bugun ? '<span class="pl-etiket pl-devam">Bugün başlıyor</span>'
      : (!bitti && g.baslangicTarihi && g.baslangicTarihi < bugun && g.durum === 'Yapılacak' ? '<span class="pl-etiket pl-devam">Devam ediyor</span>' : '');
    const sonGun = !bitti && g.tarih === bugun;
    const yanip = sonGun && !durdurulanlar.includes(g.id);
    return `<div class="pl-gorev${bitti ? ' bitti' : ''}${sonGun ? ' pl-songun' : ''}${yanip ? ' pl-yanip' : ''}" data-oncelik="${g.oncelik}" data-gorev="${g.id}"${yanip ? ' title="Son gün! Yanıp sönmeyi durdurmak için tıklayın."' : ''}>
      <input type="checkbox" data-tamamla="${g.id}" ${bitti ? 'checked' : ''} title="${bitti ? 'Geri al' : 'Tamamlandı işaretle'}">
      <div class="pl-gorev-govde" data-duzenle="${g.id}">
        <div class="pl-gorev-baslik">${g.oncelik === 'Yüksek' ? '<span class="pl-oncelik" title="Yüksek öncelik">!</span>' : ''}${_plKacir(g.baslik)}</div>
        <div class="pl-gorev-alt">
          ${tarih ? `<span title="Başlangıç → Planlanan bitiş">${tarih}</span>` : ''}
          ${baslamaEtiketi}
          ${!bitti && tekrarliMi(g) && g.tarih && g.tarih < bugun ? '<span class="pl-etiket" style="background:#fee2e2; color:#b91c1c;">Gecikti</span>' : ''}
          ${sonGun ? '<span class="pl-etiket" style="background:#dc2626; color:#fff;">⏰ Son gün</span>' : ''}
          ${!bitti && !sonGun && tekrarliMi(g) && t(g) === bugun ? '<span class="pl-etiket" style="background:#dbeafe; color:#1e40af;">Bugün</span>' : ''}
          ${bitti && g.tamamlanmaTarihi ? `<span>✔ ${gunAyYil(g.tamamlanmaTarihi)}</span>` : ''}
          ${g.tekrar && g.tekrar !== 'Bir defalık' ? `<span class="pl-etiket" style="background:#ecfdf5; color:#047857;" title="Tamamlandığında bir sonraki tarih için yeniden eklenir">🔁 ${g.tekrar}</span>` : ''}
          ${g.sorumlu ? `<span class="pl-etiket pl-sorumlu" title="Sorumlu">👤 ${_plKacir(g.sorumlu)}</span>` : ''}
          ${g.kategori ? `<span class="pl-etiket">${_plKacir(g.kategori)}</span>` : ''}
          ${g.kaynak ? (g.kaynakUrl
            ? `<a class="pl-etiket pl-kaynak" href="${_plKacir(g.kaynakUrl)}" title="Kaynağa git">📎 ${_plKacir(g.kaynak)}</a>`
            : `<span class="pl-etiket pl-kaynak">📎 ${_plKacir(g.kaynak)}</span>`) : ''}
          ${g.durum === 'Devam Ediyor' ? '<span class="pl-etiket pl-devam">Devam ediyor</span>' : ''}
          ${g.aciklama ? `<span class="pl-aciklama">${_plKacir(g.aciklama)}</span>` : ''}
        </div>
      </div>
      <button type="button" class="tablo-buton sil" data-sil="${g.id}" title="Sil">✕</button>
    </div>`;
  };

  // Tamamlananlar en altta, kapalı (tıklayınca açılır) — kullanıcı açık hâlini beğenmedi.
  document.getElementById('gorevListesi').innerHTML = (dolu.length
    ? dolu.map(gr => `<div class="pl-grup">
        <div class="pl-grup-baslik" style="color:${gr.renk};">${gr.baslik} <small>${gr.liste.length}</small></div>
        ${gr.liste.map(satir).join('')}
      </div>`).join('')
    : `<div class="bos-durum gorunur">${tumu.length ? 'Açık iş yok. 🎉' : 'Henüz iş eklemediniz. Yukarıdaki kutuya yazıp Enter\'a basın.'}</div>`)
    + (tamamlanan.length ? `<details class="pl-grup"><summary class="pl-grup-baslik" style="color:var(--basari); cursor:pointer;">✔ Tamamlanan İşler <small>${tamamlanan.length}</small></summary>${tamamlanan.map(satir).join('')}</details>` : '');

  const kutu = document.getElementById('gorevListesi');
  // Yanıp sönen satıra ilk tıklama yalnızca durdurur (düzenleme penceresi açılmaz);
  // kutucuğa veya sil düğmesine tıklanırsa hem durur hem o işlem yapılır.
  kutu.querySelectorAll('.pl-yanip').forEach(s => s.addEventListener('click', e => {
    _plSonGunDurdur(s.getAttribute('data-gorev'));
    s.classList.remove('pl-yanip');
    s.removeAttribute('title');
    if (!e.target.closest('[data-tamamla], [data-sil]')) e.stopPropagation();
  }, { capture: true, once: true }));
  kutu.querySelectorAll('[data-tamamla]').forEach(c => c.addEventListener('change', () => { planGoreviTamamla(c.getAttribute('data-tamamla'), c.checked); gorevleriCiz(); }));
  kutu.querySelectorAll('[data-duzenle]').forEach(d => d.addEventListener('click', e => {
    if (e.target.closest('a')) return; // kaynak bağlantısı: sayfaya gider, düzenleme açılmaz
    gorevModalAc(d.getAttribute('data-duzenle'));
  }));
  kutu.querySelectorAll('[data-sil]').forEach(b => b.addEventListener('click', async () => {
    if (await onayModali('Bu iş silinsin mi?', 'Sil')) { planGoreviSil(b.getAttribute('data-sil')); gorevleriCiz(); }
  }));
}

// ==================== EXCEL RAPORU ====================
// Kullanıcı isteği: planı rapor olarak indirmek — önce PDF yapıldı, kullanıcı
// "PDF yerine Excel olsa daha iyi" dedi. Biçimli xlsx (core/xlsx-bicimli.js).
// Ekrandaki filtre (kategori / arama) ve grup sırası kullanılır.
// Sayfa 1 "Açık İşler": gruplar sırasıyla, Grup sütunu filtrelenebilir.
// Sayfa 2 "Tamamlanan": tamamlanma tarihine göre en yeni üstte. Her gün
// tekrarlanan işlerin tamamlanmış kopyaları alınmaz (kullanıcı isteği; PDF'te de böyleydi).
async function planExcelIndir() {
  const btn = document.getElementById('planExcelBtn');
  const eski = btn.textContent;
  btn.disabled = true; btn.textContent = 'Excel hazırlanıyor…';
  try {
    // xlsxKitapIndir FileSaver'ın saveAs'ini kullanır; bu sayfada yüklü değil.
    if (typeof window.saveAs !== 'function') {
      window.saveAs = (blob, ad) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = ad;
        document.body.appendChild(a); a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      };
    }
    const X = XLSX_STIL, h = (v, s) => ({ v: v == null ? '' : v, s });
    const bugun = bugunIso();
    const liste = _plFiltreliGorevler();
    const { dolu, tamamlanan } = _plEkranGruplari(liste);
    const bitenler = tamamlanan.filter(g => g.tekrar !== 'Her gün')
      .sort((a, b) => String(b.tamamlanmaTarihi).localeCompare(String(a.tamamlanmaTarihi)));
    const o = planOzetiHesapla();
    const firma = typeof aktifFirmaGetir === 'function' ? aktifFirmaGetir() : null;
    const kullanici = oturumdakiKullanici();
    const kategori = document.getElementById('kategoriFiltre').value;
    const sorumluF = document.getElementById('sorumluFiltre').value;
    const arama = document.getElementById('gorevArama').value.trim();
    const duz = b => b.replace(/^[^\p{L}]+/u, '');
    const tarih = t => t ? gunAyYil(t) : '';
    const tekrarMetni = g => g.tekrar && g.tekrar !== 'Bir defalık' ? g.tekrar : '';

    const sayfa = (baslik, basliklar, satirlar, genislikler) => {
      const son = xlsxKolonHarfi(basliklar.length - 1);
      const ust = [
        { hucreler: [h(baslik, X.baslik)], yukseklik: 26 },
        { hucreler: [h('Firma', X.bilgiEtiket), h(firma ? firma.ad : '', X.bilgiDeger), h('Hazırlayan', X.bilgiEtiket), h(kullanici ? kullanici.adSoyad : '', X.bilgiDeger), h('Rapor Tarihi', X.bilgiEtiket), h(gunAyYil(bugun), X.bilgiDeger)] },
        { hucreler: [h('Özet', X.ozet), h(`Açık iş: ${o.acik} · Gecikmiş: ${o.gecikmis} · Bugün: ${o.bugun} · Önümüzdeki 7 gün: ${o.hafta} · Bu ay tamamlanan: ${bitenler.filter(g => String(g.tamamlanmaTarihi).startsWith(bugun.slice(0, 7))).length}`
          + (kategori || sorumluF || arama ? ` · Filtre: ${[kategori ? 'Kategori: ' + kategori : '', sorumluF ? 'Sorumlu: ' + (sorumluF === '-' ? 'belirtilmemiş' : sorumluF) : '', arama ? 'Arama: "' + arama + '"' : ''].filter(Boolean).join(', ')}` : ''), X.ozet)] },
        { hucreler: [] },
        { hucreler: basliklar.map(b => h(b, X.tabloBaslik)), yukseklik: 22 }
      ];
      const tum = ust.concat(satirlar);
      return {
        xml: xlsxSayfaXml(tum, { genislikler, birlesik: [`A1:${son}1`, `B3:${son}3`], dondur: 5, filtre: `A5:${son}${Math.max(5, tum.length)}`, yatay: true }),
        filtre: `A5:${son}${Math.max(5, tum.length)}`
      };
    };

    // Açık işler
    const acikBasliklar = ['Grup', 'Yapılacak İş', 'Sorumlu', 'Başlangıç', 'Planlanan Bitiş', 'Durum', 'Öncelik', 'Kategori', 'Tekrar', 'Kaynak', 'Açıklama'];
    const acikSatirlar = [];
    dolu.forEach(gr => gr.liste.forEach(g => {
      const gecikti = g.tarih && g.tarih < bugun, sonGun = g.tarih === bugun;
      acikSatirlar.push({ hucreler: [
        h(duz(gr.baslik), X.hucreKalin), h(g.baslik, g.oncelik === 'Yüksek' ? X.hucreKalin : X.hucre),
        h(g.sorumlu, X.hucre), h(tarih(g.baslangicTarihi), X.hucreOrta),
        h(tarih(g.tarih) + (gecikti ? ' (gecikti)' : sonGun ? ' (son gün)' : ''), gecikti || sonGun ? X.gecikmis : X.hucreOrta),
        h(g.durum, g.durum === 'Devam Ediyor' ? X.devam : X.acik), h(g.oncelik, g.oncelik === 'Yüksek' ? X.gecikmis : X.hucre),
        h(g.kategori, X.hucre), h(tekrarMetni(g), X.hucre), h(g.kaynak, X.hucre), h(g.aciklama, X.hucre)
      ] });
    }));
    if (!acikSatirlar.length) acikSatirlar.push({ hucreler: [h('Açık iş yok.', X.hucre)] });
    const s1 = sayfa('İŞ PLANI — AÇIK İŞLER', acikBasliklar, acikSatirlar, [22, 48, 20, 12, 16, 13, 10, 16, 11, 28, 45]);

    // Tamamlananlar
    const bitenBasliklar = ['Yapılacak İş', 'Sorumlu', 'Başlangıç', 'Planlanan Bitiş', 'Tamamlanma', 'Öncelik', 'Kategori', 'Tekrar', 'Kaynak', 'Açıklama'];
    const bitenSatirlar = bitenler.map(g => ({ hucreler: [
      h(g.baslik, X.hucre), h(g.sorumlu, X.hucre), h(tarih(g.baslangicTarihi), X.hucreOrta), h(tarih(g.tarih), X.hucreOrta),
      h(tarih(g.tamamlanmaTarihi), X.tamam), h(g.oncelik, X.hucre), h(g.kategori, X.hucre),
      h(tekrarMetni(g), X.hucre), h(g.kaynak, X.hucre), h(g.aciklama, X.hucre)
    ] }));
    if (!bitenSatirlar.length) bitenSatirlar.push({ hucreler: [h('Tamamlanan iş yok.', X.hucre)] });
    const s2 = sayfa('İŞ PLANI — TAMAMLANAN İŞLER', bitenBasliklar, bitenSatirlar, [48, 20, 12, 16, 14, 10, 16, 11, 28, 45]);

    const dosya = `Is_Plani_${(firma && firma.ad ? firma.ad : 'firma').replace(/[^\p{L}\p{N}]+/gu, '_')}_${bugun}.xlsx`;
    await xlsxKitapIndir(dosya, [
      { ad: 'Açık İşler', xml: s1.xml, filtre: s1.filtre, baslikSatiri: 5 },
      { ad: 'Tamamlanan', xml: s2.xml, filtre: s2.filtre, baslikSatiri: 5 }
    ]);
  } catch (hata) {
    console.error(hata);
    alert('Excel oluşturulamadı: ' + (hata.message || hata));
  } finally {
    btn.disabled = false; btn.textContent = eski;
  }
}

function gorevModalAc(id) {
  const g = id ? planGorevleriGetir().find(x => x.id === id) : null;
  _plDuzenlenenGorevId = g ? g.id : null;
  document.getElementById('gorevModalBaslik').textContent = g ? 'İşi Düzenle' : 'Yeni İş';
  document.getElementById('gBaslik').value = g ? g.baslik : '';
  document.getElementById('gAciklama').value = g ? g.aciklama : '';
  document.getElementById('gBaslangic').value = g ? g.baslangicTarihi || '' : bugunIso();
  document.getElementById('gTarih').value = g ? g.tarih : '';
  document.getElementById('gTarihHata').textContent = '';
  document.getElementById('gSaat').value = g ? g.saat : '';
  document.getElementById('gTekrar').value = (g && g.tekrar) || 'Bir defalık';
  document.getElementById('gOncelik').value = g ? g.oncelik : 'Normal';
  document.getElementById('gKategori').value = g ? g.kategori : '';
  document.getElementById('gSorumlu').value = g ? g.sorumlu || '' : '';
  document.getElementById('sorumluListesiKutu').innerHTML = planSorumluDatalistHtml('sorumluListesi');
  document.getElementById('gDurum').value = g ? g.durum : 'Yapılacak';
  document.getElementById('gBaslikHata').textContent = '';
  document.getElementById('gorevModalKatman').classList.add('acik');
  document.getElementById('gBaslik').focus();
}

function gorevModalKapat() {
  document.getElementById('gorevModalKatman').classList.remove('acik');
}

function gorevFormGonderildi(e) {
  e.preventDefault();
  const sonuc = planGoreviKaydet({
    baslik: document.getElementById('gBaslik').value,
    aciklama: document.getElementById('gAciklama').value,
    baslangicTarihi: document.getElementById('gBaslangic').value,
    tarih: document.getElementById('gTarih').value,
    saat: document.getElementById('gSaat').value,
    tekrar: document.getElementById('gTekrar').value,
    oncelik: document.getElementById('gOncelik').value,
    kategori: document.getElementById('gKategori').value,
    sorumlu: document.getElementById('gSorumlu').value,
    durum: document.getElementById('gDurum').value
  }, _plDuzenlenenGorevId);
  if (!sonuc.basarili) {
    document.getElementById('gBaslikHata').textContent = sonuc.hatalar.baslik || '';
    document.getElementById('gTarihHata').textContent = sonuc.hatalar.tarih || '';
    return;
  }
  gorevModalKapat();
  gorevleriCiz();
}

// ==================== NOTLAR ====================

function notlariCiz() {
  const liste = planNotlariGetir(document.getElementById('notArama').value);
  const kutu = document.getElementById('notIzgarasi');
  const bos = document.getElementById('notBos');
  bos.classList.toggle('gorunur', !liste.length);
  bos.textContent = planNotlariGetir('').length ? 'Aramayla eşleşen not yok.' : 'Henüz not yok. "+ Yeni Not" ile ekleyin.';
  kutu.innerHTML = liste.map(n => `
    <div class="pl-not" style="background:${n.renk};" data-not="${n.id}">
      <div class="pl-not-ust">
        <strong>${_plKacir(n.baslik) || '&nbsp;'}</strong>
        <span>
          <button type="button" class="pl-ikon${n.sabit ? ' aktif' : ''}" data-sabitle="${n.id}" title="${n.sabit ? 'Sabitlemeyi kaldır' : 'Üste sabitle'}">📌</button>
          <button type="button" class="pl-ikon" data-notsil="${n.id}" title="Sil">🗑️</button>
        </span>
      </div>
      <div class="pl-not-metin">${_plKacir(n.icerik)}</div>
      <div class="pl-not-tarih">${gunAyYil(String(n.guncellemeTarihi).slice(0, 10))}</div>
    </div>`).join('');
  kutu.querySelectorAll('[data-not]').forEach(d => d.addEventListener('click', e => {
    if (e.target.closest('button')) return;
    notModalAc(d.getAttribute('data-not'));
  }));
  kutu.querySelectorAll('[data-sabitle]').forEach(b => b.addEventListener('click', () => { planNotuSabitle(b.getAttribute('data-sabitle')); notlariCiz(); }));
  kutu.querySelectorAll('[data-notsil]').forEach(b => b.addEventListener('click', async () => {
    if (await onayModali('Bu not silinsin mi?', 'Sil')) { planNotuSil(b.getAttribute('data-notsil')); notlariCiz(); }
  }));
}

function notModalAc(id) {
  const n = id ? planNotlariGetir('').find(x => x.id === id) : null;
  _plDuzenlenenNotId = n ? n.id : null;
  document.getElementById('notModalBaslik').textContent = n ? 'Notu Düzenle' : 'Yeni Not';
  document.getElementById('nBaslik').value = n ? n.baslik : '';
  document.getElementById('nIcerik').value = n ? n.icerik : '';
  document.getElementById('nSabit').checked = n ? n.sabit : false;
  const renk = n ? n.renk : NOT_RENKLERI[1].renk;
  document.querySelectorAll('input[name="nRenk"]').forEach(r => { r.checked = r.value === renk; });
  document.getElementById('nIcerikHata').textContent = '';
  document.getElementById('notModalKatman').classList.add('acik');
  document.getElementById('nBaslik').focus();
}

function notModalKapat() {
  document.getElementById('notModalKatman').classList.remove('acik');
}

function notFormGonderildi(e) {
  e.preventDefault();
  const secili = document.querySelector('input[name="nRenk"]:checked');
  const sonuc = planNotuKaydet({
    baslik: document.getElementById('nBaslik').value,
    icerik: document.getElementById('nIcerik').value,
    renk: secili ? secili.value : '',
    sabit: document.getElementById('nSabit').checked
  }, _plDuzenlenenNotId);
  if (!sonuc.basarili) { document.getElementById('nIcerikHata').textContent = sonuc.hatalar.icerik || ''; return; }
  notModalKapat();
  notlariCiz();
}
