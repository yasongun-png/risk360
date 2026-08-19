// Raporlar ekranı DOM işlemleri: KPI kartları, basit çubuk grafikler ve
// konsolide özet raporu yazdırma.

function _rpKart(etiket, deger, vurgu) {
  return `<div class="istatistik-kutu"><span>${_raporKacir(etiket)}</span><b${vurgu ? ' style="color:var(--hata)"' : ''}>${_raporKacir(deger)}</b></div>`;
}

function _rpYatayCubuklar(satirlar) {
  if (!satirlar.length) return '<p style="font-size:12px; color:var(--metin-soluk);">Kayıt yok.</p>';
  const maks = Math.max(1, ...satirlar.map(s => s.sayi));
  return `<div class="rp-cubuk-grafik">${satirlar.map(s => `
    <div class="rp-cubuk-satir">
      <span class="rp-cubuk-etiket">${_raporKacir(s.etiket)}</span>
      <div class="rp-cubuk-track"><div class="rp-cubuk-dolgu" style="width:${Math.round(s.sayi / maks * 100)}%"></div></div>
      <span class="rp-cubuk-sayi">${s.sayi}</span>
    </div>`).join('')}</div>`;
}

function _rpAylikGrafik(satirlar) {
  const maks = Math.max(1, ...satirlar.map(s => s.sayi));
  return `<div class="rp-aylik-grafik">${satirlar.map(s => `
    <div class="rp-ay-sutun" title="${_raporKacir(s.etiket)}: ${s.sayi}">
      <span class="rp-ay-sayi">${s.sayi || ''}</span>
      <div class="rp-ay-cubuk" style="height:${s.sayi ? Math.max(4, Math.round(s.sayi / maks * 100)) : 0}%"></div>
      <span class="rp-ay-etiket">${_raporKacir(s.etiket)}</span>
    </div>`).join('')}</div>`;
}

function _rpBolumBasligi(metin) {
  return `<div class="form-bolum-baslik">${_raporKacir(metin)}</div>`;
}

function _rpYeterlilikTablosu(satirlar) {
  return `<div class="tablo-scroll"><table class="veri-tablosu">
    <thead><tr><th>Ekip Türü</th><th>Gerekli</th><th>Atanan</th><th>Eksik</th><th>Durum</th></tr></thead>
    <tbody>${satirlar.map(s => `
      <tr>
        <td>${_raporKacir(s.tur)}</td>
        <td>${s.gerekli}</td>
        <td>${s.atanan}</td>
        <td>${s.eksik}</td>
        <td><span class="genel-rozet rozet-${s.uygun ? 'uygun' : 'uygun-degil'}">${s.uygun ? 'Uygun' : 'Eksik'}</span></td>
      </tr>`).join('')}</tbody>
  </table></div>`;
}

function raporlarSayfasiniCiz(ozet) {
  const pe = ozet.personelEgitim, r = ozet.risk, ok = ozet.olayKaza, u = ozet.uygunsuzluk,
    kkd = ozet.kkd, kim = ozet.kimyasal, per = ozet.periyodik, izin = ozet.isIzni,
    mlz = ozet.malzemeTalep, ad = ozet.acilDurum, eng = ozet.engelliKotasi, ma = ozet.merkeziAksiyon;

  document.getElementById('rpIcerik').innerHTML = `
    ${_rpBolumBasligi('Genel Bakış')}
    <div class="istatistik-grid">
      ${_rpKart('Aktif Personel', pe.personelSayisi)}
      ${_rpKart('Eğitim Uyum Oranı', pe.uyumYuzdesi + '%')}
      ${_rpKart('Açık Risk', r.acikSayisi, r.gecikmis > 0)}
      ${_rpKart('Son 12 Ay Olay/Kaza', ok.son12AySayisi)}
      ${_rpKart('Açık Uygunsuzluk', u.acikSayisi, u.gecikmis > 0)}
      ${_rpKart('Açık İş İzni', izin.acikSayisi)}
      ${_rpKart('Acil Durum Ekip Yeterliliği', ad.uygun ? 'Uygun' : ad.toplamEksik + ' Eksik', !ad.uygun)}
      ${_rpKart('Engelli Çalışan Kotası (%3)', eng.zorunlulukKapsaminda ? (eng.uygun ? 'Uygun' : eng.eksik + ' Eksik') : 'Kapsam Dışı', eng.zorunlulukKapsaminda && !eng.uygun)}
      ${_rpKart('Toplam Açık Aksiyon', ma.toplamAcik)}
    </div>

    ${_rpBolumBasligi('Eğitim ve Personel')}
    <div class="istatistik-grid">
      ${_rpKart('Aktif Personel', pe.personelSayisi)}
      ${_rpKart('Eğitim Uyum Oranı', pe.uyumYuzdesi + '%')}
      ${_rpKart('30 Gün İçinde Yenilenecek', pe.yaklasan)}
      ${_rpKart('Süresi Geçmiş / Eksik Eğitim', pe.gecmisVeyaYok, pe.gecmisVeyaYok > 0)}
    </div>

    ${_rpBolumBasligi('Risk Değerlendirmesi')}
    <div class="istatistik-grid">
      ${_rpKart('Toplam Kayıt', r.toplamKayit)}
      ${_rpKart('Açık', r.acikSayisi)}
      ${_rpKart('Gecikmiş', r.gecikmis, r.gecikmis > 0)}
    </div>
    <p style="font-size:12px; font-weight:700; color:var(--metin-soluk); margin:14px 0 4px;">Açık Risklerin Düzeye Göre Dağılımı</p>
    ${_rpYatayCubuklar(r.duzeyeGore)}

    ${_rpBolumBasligi('Olay / Kaza (Son 12 Ay)')}
    <div class="istatistik-grid">
      ${_rpKart('Toplam Kayıt', ok.toplamKayit)}
      ${_rpKart('Açık', ok.acikSayisi)}
      ${_rpKart('Son 12 Ay Olay/Kaza', ok.son12AySayisi)}
      ${_rpKart('Toplam Kayıp Gün', ok.toplamKayipGun)}
    </div>
    <p style="font-size:12px; font-weight:700; color:var(--metin-soluk); margin:14px 0 4px;">Aylık Dağılım</p>
    ${_rpAylikGrafik(ok.aylikDagilim)}
    <p style="font-size:12px; font-weight:700; color:var(--metin-soluk); margin:14px 0 4px;">Olay Tipine Göre Dağılım</p>
    ${_rpYatayCubuklar(ok.tipeGore)}

    ${_rpBolumBasligi('Uygunsuzluk')}
    <div class="istatistik-grid">
      ${_rpKart('Toplam Kayıt', u.toplamKayit)}
      ${_rpKart('Açık', u.acikSayisi)}
      ${_rpKart('Gecikmiş', u.gecikmis, u.gecikmis > 0)}
    </div>

    ${_rpBolumBasligi('KKD Takibi')}
    <div class="istatistik-grid">
      ${_rpKart('Aktif Zimmet', kkd.aktifZimmetSayisi)}
      ${_rpKart('Değişim Süresi Geçen', kkd.suresiGecti, kkd.suresiGecti > 0)}
      ${_rpKart('Değişimi Yaklaşan (30 Gün)', kkd.yaklasiyor)}
      ${_rpKart('Bu Yıl İhlal Sayısı', kkd.buYilIhlal)}
    </div>

    ${_rpBolumBasligi('Kimyasal Yönetimi')}
    <div class="istatistik-grid">
      ${_rpKart('Toplam Kayıt', kim.toplamKayit)}
      ${_rpKart('SDS Süresi Geçmiş (5 Yıl)', kim.sdsSuresiGecmis, kim.sdsSuresiGecmis > 0)}
      ${_rpKart('Kritik Risk Seviyeli', kim.kritikSayisi, kim.kritikSayisi > 0)}
    </div>

    ${_rpBolumBasligi('Periyodik Kontrol')}
    <div class="istatistik-grid">
      ${_rpKart('Aktif Ekipman', per.toplamEkipman)}
      ${_rpKart('Kontrol Süresi Geçen', per.suresiGecti, per.suresiGecti > 0)}
      ${_rpKart('Kontrolü Yaklaşan (30 Gün)', per.yaklasiyor)}
      ${_rpKart('Son Kontrolde Uygun Değil', per.uygunDegil, per.uygunDegil > 0)}
    </div>

    ${_rpBolumBasligi('İş İzinleri')}
    <div class="istatistik-grid">
      ${_rpKart('Toplam Kayıt', izin.toplamKayit)}
      ${_rpKart('Açık İzin', izin.acikSayisi)}
      ${_rpKart('Onay Bekleyen', izin.onayBekleyen)}
      ${_rpKart('Kritik Riskli Açık İzin', izin.kritikRiskli, izin.kritikRiskli > 0)}
    </div>

    ${_rpBolumBasligi('İSG Malzeme Talep')}
    <div class="istatistik-grid">
      ${_rpKart('Toplam Talep', mlz.toplamKayit)}
      ${_rpKart('Açık Talep', mlz.acikSayisi)}
    </div>

    ${_rpBolumBasligi('Acil Durum Ekipleri ve İlkyardımcı Yeterliliği')}
    <p style="font-size:12px; color:var(--metin-soluk); margin-top:-8px;">${_raporKacir(ad.tehlikeSinifi)} tehlike sınıfı, ${ad.calisanSayisi} çalışana göre asgari gereksinim (İşyerlerinde Acil Durumlar Hakkında Yönetmelik Md.11, İlkyardım Yönetmeliği Md.19). Söndürme/Kurtarma/Koruma sayıları Acil Durum modülünün ekip listesinden, İlk Yardım sayısı ise Eğitim modülündeki geçerli "İlkyardım Sertifikası" kayıtlarından alınır.</p>
    <div class="istatistik-grid">
      ${_rpKart('Genel Durum', ad.uygun ? 'Uygun' : 'Eksik Var', !ad.uygun)}
      ${_rpKart('Toplam Eksik Kişi', ad.toplamEksik, ad.toplamEksik > 0)}
      ${_rpKart('Müdahale Ekibinde Geçerliliği Geçmiş Üye', ad.egitimiGecmis, ad.egitimiGecmis > 0)}
    </div>
    ${_rpYeterlilikTablosu(ad.satirlar)}
    <p style="margin-top:10px;"><a class="geri-link" href="../acil-durum/index.html">Vardiya bazlı uygunluk değerlendirmesini incele →</a></p>

    ${_rpBolumBasligi('Engelli Çalışan Kotası (İş Kanunu Md.30)')}
    <p style="font-size:12px; color:var(--metin-soluk); margin-top:-8px;">Özel sektörde aynı il sınırları içinde 50 ve üzeri işçi çalıştıran işyerlerinde toplam işçi sayısının en az %3'ü engelli olmalıdır (4857 sayılı İş Kanunu Md.30, Engelli ve Eski Hükümlü Çalıştırma Yönetmeliği). 50'nin altındaki işyerleri bu zorunluluk kapsamı dışındadır.</p>
    <div class="istatistik-grid">
      ${_rpKart('Toplam Aktif Çalışan', eng.toplamCalisan)}
      ${_rpKart('Engelli Çalışan Sayısı', eng.engelliSayisi)}
      ${_rpKart('Oran', eng.oranYuzde + '%', eng.zorunlulukKapsaminda && eng.oranYuzde < 3)}
      ${_rpKart('Kanuni Kapsam (50+)', eng.zorunlulukKapsaminda ? 'Kapsamda' : 'Kapsam Dışı')}
      ${_rpKart('Gerekli Sayı (%3)', eng.gerekliSayi)}
      ${_rpKart('Eksik', eng.eksik, eng.zorunlulukKapsaminda && eng.eksik > 0)}
    </div>

    ${_rpBolumBasligi('Merkezi Aksiyon Takibi')}
    <div class="istatistik-grid">
      ${_rpKart('Toplam Açık Aksiyon', ma.toplamAcik)}
      ${_rpKart('Gecikmiş', ma.gecikmis, ma.gecikmis > 0)}
      ${_rpKart('7 Gün İçinde Termini Dolacak', ma.yaklasiyor)}
    </div>
    <p style="font-size:12px; font-weight:700; color:var(--metin-soluk); margin:14px 0 4px;">Kaynak Modüle Göre Dağılım</p>
    ${_rpYatayCubuklar(ma.kaynagaGore.map(([etiket, sayi]) => ({ etiket, sayi })))}
    <p style="margin-top:10px;"><a class="geri-link" href="../merkezi-aksiyon/index.html">Tüm açık aksiyonları incele →</a></p>
  `;
}

function raporOzetiYazdir(ozet, firmaAdi) {
  const pe = ozet.personelEgitim, r = ozet.risk, ok = ozet.olayKaza, u = ozet.uygunsuzluk,
    kkd = ozet.kkd, kim = ozet.kimyasal, per = ozet.periyodik, izin = ozet.isIzni,
    mlz = ozet.malzemeTalep, ad = ozet.acilDurum, eng = ozet.engelliKotasi, ma = ozet.merkeziAksiyon;

  const satir = (etiket, deger) => `<tr><td style="font-weight:700; width:280px;">${_raporKacir(etiket)}</td><td>${_raporKacir(deger)}</td></tr>`;

  const html = `
    <div class="doc-title">İSG Yönetim Özet Raporu</div>
    <div class="doc-meta">${_raporKacir(firmaAdi)} — ${gunAyYil(new Date().toISOString().slice(0, 10))} itibarıyla</div>
    <table>
      ${satir('Aktif Personel', pe.personelSayisi)}
      ${satir('Eğitim Uyum Oranı', pe.uyumYuzdesi + '%')}
      ${satir('Açık Risk Değerlendirmesi / Gecikmiş', r.acikSayisi + ' / ' + r.gecikmis)}
      ${satir('Son 12 Ay Olay/Kaza Sayısı / Toplam Kayıp Gün', ok.son12AySayisi + ' / ' + ok.toplamKayipGun)}
      ${satir('Açık Uygunsuzluk-DÖF / Gecikmiş', u.acikSayisi + ' / ' + u.gecikmis)}
      ${satir('Aktif KKD Zimmet / Süresi Geçen', kkd.aktifZimmetSayisi + ' / ' + kkd.suresiGecti)}
      ${satir('Kimyasal Kayıt / SDS Süresi Geçmiş', kim.toplamKayit + ' / ' + kim.sdsSuresiGecmis)}
      ${satir('Aktif Periyodik Kontrol Ekipmanı / Süresi Geçen', per.toplamEkipman + ' / ' + per.suresiGecti)}
      ${satir('Açık İş İzni / Onay Bekleyen', izin.acikSayisi + ' / ' + izin.onayBekleyen)}
      ${satir('Açık İSG Malzeme Talebi', mlz.acikSayisi)}
      ${satir('Acil Durum Ekip / İlkyardımcı Yeterliliği', (ad.uygun ? 'Uygun' : ad.toplamEksik + ' kişi eksik'))}
      ${satir('Engelli Çalışan Kotası (%3, İş Kanunu Md.30)', eng.zorunlulukKapsaminda ? (eng.engelliSayisi + ' / ' + eng.toplamCalisan + ' (%' + eng.oranYuzde + ') — ' + (eng.uygun ? 'Uygun' : eng.eksik + ' kişi eksik')) : 'Kapsam dışı (< 50 çalışan)')}
      ${satir('Toplam Açık Aksiyon / Gecikmiş', ma.toplamAcik + ' / ' + ma.gecikmis)}
    </table>
  `;
  _raporYazdirmaAlaniniGoster(html);
}

function raporlarSayfasiniBaslat(firma) {
  const ozet = raporGenelOzetiHesapla(firma);
  raporlarSayfasiniCiz(ozet);
  document.getElementById('rpYazdirBtn').addEventListener('click', () => raporOzetiYazdir(ozet, firma.ad));
}
