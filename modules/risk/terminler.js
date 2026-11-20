// Risk Değerlendirmesi > "Risk Terminleri" sekmesi.
// Kullanıcı isteği (2026-11-18): "risk değerlendirmesi modülünün üstünde de bir
// sekmede olsun risk terminleri aynı zamanda" — İş Planım'daki "Risk
// Terminleri" sekmesiyle aynı kapsam (bkz. core/plana-ekle.js
// riskTerminleriniPlanaEsitle): en son değerlendirme yılının tarih terminli,
// açık (Kapalı / İptal / Operasyonel olmayan) riskleri; termini geçmiş, bugün
// ve 7 gün içinde olanlar. Burada doğrudan risk kayıtlarından okunur, buradan
// düzenlenip kapatılabilir.

const RISK_TERMIN_UYARI_GUN = 7;

function _rtGun(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function _rtK(v) { return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }

function riskTerminUyarilari() {
  const yillar = riskYillariListesi();
  const yil = yillar[yillar.length - 1];
  const bugun = _rtGun(0);
  const sinir = _rtGun(RISK_TERMIN_UYARI_GUN);
  const liste = riskTumunuGetir()
    .filter(r => riskYili(r) === yil && !['Kapalı', 'İptal', 'Operasyonel'].includes(r.durum) && riskTerminTarihMi(r.termin) && r.termin <= sinir)
    .map(_riskiZenginlestir)
    .sort((a, b) => a.termin.localeCompare(b.termin) || (riskSeviyesiSirasi(b.duzey1) - riskSeviyesiSirasi(a.duzey1)));
  return {
    yil,
    gecmis: liste.filter(r => r.termin < bugun),
    bugun: liste.filter(r => r.termin === bugun),
    yakin: liste.filter(r => r.termin > bugun)
  };
}

function riskTerminSekmeEtiketi() {
  const btn = document.getElementById('sekmeTerminler');
  if (!btn) return;
  const u = riskTerminUyarilari();
  const toplam = u.gecmis.length + u.bugun.length + u.yakin.length;
  const acil = u.gecmis.length + u.bugun.length;
  btn.innerHTML = `⏰ Risk Terminleri${toplam ? ` <span class="in-sayac" style="background:${acil ? '#dc2626' : '#f59e0b'};">${toplam}</span>` : ''}`;
}

function riskTerminleriCiz() {
  const kutu = document.getElementById('terminlerBolumu');
  if (!kutu) return;
  const u = riskTerminUyarilari();
  const bugun = _rtGun(0);
  const kalanGun = t => Math.round((Date.parse(t) - Date.parse(bugun)) / 86400000);
  const satir = r => {
    const k = kalanGun(r.termin);
    const rozet = k < 0 ? `<span class="genel-rozet rozet-gecikmis">${-k} gün gecikti</span>`
      : k === 0 ? '<span class="genel-rozet rozet-gecikmis">Son gün</span>'
        : `<span class="genel-rozet rozet-yaklasiyor">${k} gün kaldı</span>`;
    return `<tr>
      <td><b>${_rtK(r.riskNo)}</b><div><span class="duzey-rozet duzey-${slugOlustur(r.duzey1)}">${_rtK(r.duzey1)}</span></div></td>
      <td>${_rtK(r.bolum)}${riskBolumGoruntu(r) && riskBolumGoruntu(r) !== r.bolum ? '<div class="in-bilgi">' + _rtK(riskBolumGoruntu(r)) + '</div>' : ''}</td>
      <td>${_rtK(r.tehlike)}</td>
      <td>${_rtK(r.planlanan) || '-'}</td>
      <td>${_rtK(r.sorumlu) || '-'}</td>
      <td style="white-space:nowrap;">${_rtK(gunAyYil(r.termin))}<div>${rozet}</div></td>
      <td>${_rtK(r.durumGoruntu)}</td>
      <td style="white-space:nowrap;">
        <button class="tablo-buton" data-rt-duzenle="${r.id}">Düzenle</button>
        <button class="tablo-buton" data-rt-durum="Kapalı" data-rt-id="${r.id}" title="Önlem tamamlandı">✓ Kapat</button>
        <button class="tablo-buton" data-rt-durum="Operasyonel" data-rt-id="${r.id}" title="Önlem sürekli uygulanıyor">Operasyonel</button>
      </td>
    </tr>`;
  };
  const grup = (baslik, renk, liste) => liste.length ? `
    <div class="pl-grup-rt">
      <div class="in-gun-baslik" style="color:${renk};">${baslik} <span class="in-bilgi">(${liste.length})</span></div>
      <div class="tablo-scroll"><table class="veri-tablosu">
        <thead><tr><th>Risk No</th><th>Tesis/Konu · Lokasyon</th><th>Tehlike</th><th>Alınacak Önlem</th><th>Sorumlu</th><th>Termin</th><th>Durum</th><th></th></tr></thead>
        <tbody>${liste.map(satir).join('')}</tbody>
      </table></div>
    </div>` : '';
  const toplam = u.gecmis.length + u.bugun.length + u.yakin.length;
  kutu.innerHTML = `
    <p class="in-bilgi" style="margin:0 0 10px;">${u.yil} yılı değerlendirmesinde termini geçmiş, bugün ya da ${RISK_TERMIN_UYARI_GUN} gün içinde olan açık riskler. Aynı liste İş Planım'ın "Risk Terminleri" sekmesinde de hatırlatılır. "Sürekli", "Her defasında" gibi tarih olmayan terminler ve Kapalı / Operasyonel riskler listelenmez.</p>
    ${toplam
      ? grup('⚠️ Termini Geçmiş Riskler', '#7c3aed', u.gecmis) + grup('⏰ Termini Bugün Olan Riskler', '#dc2626', u.bugun) + grup(`⏳ ${RISK_TERMIN_UYARI_GUN} Gün İçinde Termini Gelen Riskler`, '#b45309', u.yakin)
      : '<div class="in-tamam">Termini yaklaşan ya da geçmiş açık risk yok. 🎉</div>'}`;
  riskTerminSekmeEtiketi();
}

function riskTerminleriBaslat() {
  const kutu = document.getElementById('terminlerBolumu');
  if (!kutu) return;
  kutu.addEventListener('click', async e => {
    const d = e.target.closest('[data-rt-duzenle]');
    if (d) { const r = riskIdIleGetirRepo(d.getAttribute('data-rt-duzenle')); if (r) modalAc(r); return; }
    const b = e.target.closest('[data-rt-durum]');
    if (!b) return;
    const durum = b.getAttribute('data-rt-durum');
    const r = riskIdIleGetirRepo(b.getAttribute('data-rt-id'));
    if (!r) return;
    if (!(await onayModali(`${r.riskNo} durumu "${durum}" yapılsın mı?`, durum === 'Kapalı' ? 'Kapat' : 'Onayla'))) return;
    riskGuncelleRepo(r.id, { durum });
    if (typeof riskTerminleriniPlanaEsitle === 'function') riskTerminleriniPlanaEsitle();
    riskTerminleriCiz();
  });
  document.getElementById('sekmeTerminler').addEventListener('click', () => gorunumDegistir('terminler'));
  riskTerminSekmeEtiketi();
}
