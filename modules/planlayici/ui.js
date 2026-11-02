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
  document.getElementById('planPdfBtn').addEventListener('click', planPdfIndir);
  document.getElementById('gorevForm').addEventListener('submit', gorevFormGonderildi);
  ['gorevIptalBtn', 'gorevKapatBtn'].forEach(id => document.getElementById(id).addEventListener('click', gorevModalKapat));
  document.getElementById('kategoriFiltre').addEventListener('change', gorevleriCiz);
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

// Kategori ve arama filtresine uyan işler (ekran ve PDF raporu aynı listeyi kullanır).
function _plFiltreliGorevler() {
  const kategori = document.getElementById('kategoriFiltre').value;
  const arama = document.getElementById('gorevArama').value.trim().toLocaleLowerCase('tr-TR');
  return planGorevleriGetir().filter(g => (!kategori || g.kategori === kategori)
    && (!arama || (g.baslik + ' ' + g.aciklama).toLocaleLowerCase('tr-TR').includes(arama)));
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

// ==================== PDF RAPORU ====================
// Kullanıcı isteği: "planı PDF olarak rapor olarak indirmek". Ekrandaki filtre
// (kategori / arama) ve gruplar aynen kullanılır: açık işler + bu ay tamamlananlar.
// html2pdf.js yalnızca ilk indirmede yüklenir (kurul modülündeki sürüm).
function _plHtml2pdfYukle() {
  if (window.html2pdf) return Promise.resolve();
  return new Promise((coz, reddet) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js';
    s.onload = () => coz();
    s.onerror = () => reddet(new Error('PDF kütüphanesi yüklenemedi (internet bağlantısını kontrol edin).'));
    document.head.appendChild(s);
  });
}

function _plPdfRaporHtml() {
  const K = _plKacir;
  const bugun = bugunIso();
  const liste = _plFiltreliGorevler();
  const { dolu, tamamlanan } = _plEkranGruplari(liste);
  const buAy = bugun.slice(0, 7);
  // Kullanıcı isteği: her gün yapılan işlerin tamamlanma durumu PDF'te olmasın —
  // her gün tamamlandıkça listeyi dolduruyordu; tamamlananlarda ve sayıda yer almaz.
  const buAyBiten = tamamlanan.filter(g => String(g.tamamlanmaTarihi).startsWith(buAy) && g.tekrar !== 'Her gün');
  const o = Object.assign({}, planOzetiHesapla(), {
    buAyTamamlanan: planGorevleriGetir().filter(g => g.durum === 'Tamamlandı' && String(g.tamamlanmaTarihi).startsWith(buAy) && g.tekrar !== 'Her gün').length
  });
  const firma = typeof aktifFirmaGetir === 'function' ? aktifFirmaGetir() : null;
  const kullanici = oturumdakiKullanici();
  const kategori = document.getElementById('kategoriFiltre').value;
  const arama = document.getElementById('gorevArama').value.trim();
  // Grup başlıklarındaki simgeler PDF'te düz metin olsun.
  const duz = b => b.replace(/^[^\p{L}]+/u, '');
  const tarihHucresi = g => [g.baslangicTarihi ? gunAyYil(g.baslangicTarihi) : '', g.tarih ? gunAyYil(g.tarih) : ''];
  const satir = (g, i, bitti) => {
    const [bas, bit] = tarihHucresi(g);
    const gecikti = !bitti && g.tarih && g.tarih < bugun;
    const sonGun = !bitti && g.tarih === bugun;
    const ek = [g.kategori, g.tekrar && g.tekrar !== 'Bir defalık' ? g.tekrar : '', g.kaynak ? 'Kaynak: ' + g.kaynak : ''].filter(Boolean).join(' · ');
    return `<tr>
      <td style="text-align:center; color:#64748b;">${i + 1}</td>
      <td><div style="font-weight:600;">${g.oncelik === 'Yüksek' ? '<span style="color:#dc2626;">(!) </span>' : ''}${K(g.baslik)}</div>
        ${ek ? `<div style="font-size:9.5px; color:#475569; margin-top:2px;">${K(ek)}</div>` : ''}
        ${g.aciklama ? `<div style="font-size:9.5px; color:#334155; margin-top:2px; white-space:pre-wrap;">${K(g.aciklama)}</div>` : ''}</td>
      <td style="text-align:center;">${bas || '-'}</td>
      <td style="text-align:center; ${gecikti || sonGun ? 'color:#b91c1c; font-weight:700;' : ''}">${bit || '-'}${gecikti ? '<div style="font-size:9px;">gecikti</div>' : (sonGun ? '<div style="font-size:9px;">son gün</div>' : '')}</td>
      <td style="text-align:center;">${bitti ? 'Tamamlandı' + (g.tamamlanmaTarihi ? '<div style="font-size:9px; color:#64748b;">' + gunAyYil(g.tamamlanmaTarihi) + '</div>' : '') : K(g.durum)}</td>
      <td style="text-align:center;">${K(g.oncelik)}</td>
    </tr>`;
  };
  const tablo = (baslik, renk, isler, bitti) => `
    <div style="page-break-inside:auto; margin-top:12px;">
      <div style="font-weight:700; font-size:12px; color:${renk}; border-bottom:2px solid ${renk}; padding-bottom:3px; margin-bottom:4px;">${K(baslik)} (${isler.length})</div>
      <table style="width:100%; border-collapse:collapse; font-size:10.5px;">
        <thead><tr style="background:#f1f5f9;">
          <th style="width:28px;">#</th><th style="text-align:left;">Yapılacak İş</th><th style="width:78px;">Başlangıç</th><th style="width:78px;">Planlanan Bitiş</th><th style="width:88px;">Durum</th><th style="width:60px;">Öncelik</th>
        </tr></thead>
        <tbody>${isler.map((g, i) => satir(g, i, bitti)).join('')}</tbody>
      </table>
    </div>`;
  const kutu = (etiket, deger, renk) => `<td style="border:1px solid #cbd5e1; padding:6px 8px; text-align:center;"><div style="font-size:9.5px; color:#64748b; text-transform:uppercase;">${etiket}</div><div style="font-size:16px; font-weight:800; color:${renk || '#0f172a'};">${deger}</div></td>`;
  return `
    <div style="font-family:Arial, Helvetica, sans-serif; color:#0f172a; width:100%; box-sizing:border-box; padding:4px;">
      <style>
        table th, table td { border:1px solid #cbd5e1; padding:4px 6px; vertical-align:top; }
        tr { page-break-inside:avoid; }
      </style>
      <table style="width:100%; border-collapse:collapse; margin-bottom:8px;"><tr>
        <td style="border:none; padding:0;"><div style="font-size:20px; font-weight:800;">İŞ PLANI</div>
          <div style="font-size:12px; color:#334155;">${K(firma ? firma.ad : '')}</div></td>
        <td style="border:none; padding:0; text-align:right; font-size:11px; color:#334155;">
          Hazırlayan: <b>${K(kullanici ? kullanici.adSoyad : '')}</b><br>Rapor tarihi: <b>${gunAyYil(bugun)}</b>
          ${kategori || arama ? `<br>Filtre: ${K([kategori ? 'Kategori: ' + kategori : '', arama ? 'Arama: "' + arama + '"' : ''].filter(Boolean).join(', '))}` : ''}
        </td></tr></table>
      <table style="width:100%; border-collapse:collapse;"><tr>
        ${kutu('Açık İş', o.acik)}${kutu('Gecikmiş', o.gecikmis, o.gecikmis ? '#b91c1c' : '')}${kutu('Bugün', o.bugun)}${kutu('Önümüzdeki 7 Gün', o.hafta)}${kutu('Bu Ay Tamamlanan', o.buAyTamamlanan, '#15803d')}
      </tr></table>
      ${dolu.length ? dolu.map(gr => tablo(duz(gr.baslik), gr.renk, gr.liste, false)).join('') : '<p style="margin-top:14px;">Açık iş yok.</p>'}
      ${buAyBiten.length ? tablo('Bu Ay Tamamlanan İşler', '#15803d', buAyBiten, true) : ''}
    </div>`;
}

async function planPdfIndir() {
  const btn = document.getElementById('planPdfBtn');
  const eski = btn.textContent;
  btn.disabled = true; btn.textContent = 'PDF hazırlanıyor…';
  try {
    await _plHtml2pdfYukle();
    const kutu = document.createElement('div');
    kutu.innerHTML = _plPdfRaporHtml();
    const firma = typeof aktifFirmaGetir === 'function' ? aktifFirmaGetir() : null;
    const dosya = `Is_Plani_${(firma && firma.ad ? firma.ad : 'firma').replace(/[^\p{L}\p{N}]+/gu, '_')}_${bugunIso()}.pdf`;
    await html2pdf().set({
      margin: [8, 8, 12, 8], filename: dosya,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
      pagebreak: { mode: ['css', 'legacy'], avoid: 'tr' }
    }).from(kutu.firstElementChild).toPdf().get('pdf').then(pdf => {
      const toplam = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= toplam; i++) {
        pdf.setPage(i); pdf.setFontSize(8); pdf.setTextColor(120);
        pdf.text(`${i} / ${toplam}`, pdf.internal.pageSize.getWidth() - 14, pdf.internal.pageSize.getHeight() - 5);
      }
    }).save();
  } catch (hata) {
    console.error(hata);
    alert('PDF oluşturulamadı: ' + (hata.message || hata));
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
