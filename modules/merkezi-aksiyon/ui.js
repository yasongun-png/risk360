// Merkezi Aksiyon Takibi ekranı DOM işlemleri.

function maRozetSinifAdi(durum) {
  return slugOlustur(durum || '');
}

function _maKacir(v) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function merkeziAksiyonSayfasiniBaslat() {
  document.getElementById('maKaynakFiltre').innerHTML += MERKEZI_AKSIYON_KAYNAKLARI.map(k => `<option>${k}</option>`).join('');

  document.getElementById('maAramaKutusu').addEventListener('input', e => maListesiniCiz(e.target.value));
  document.getElementById('maKaynakFiltre').addEventListener('change', () => maListesiniCiz(document.getElementById('maAramaKutusu').value));
  document.getElementById('maDurumFiltre').addEventListener('change', () => maListesiniCiz(document.getElementById('maAramaKutusu').value));
  document.getElementById('maDisaAktarBtn').addEventListener('click', () => {
    const filtreler = { kaynakModul: document.getElementById('maKaynakFiltre').value, durum: document.getElementById('maDurumFiltre').value };
    const liste = merkeziAksiyonlariGetir(document.getElementById('maAramaKutusu').value, filtreler).map(s => Object.assign({}, s, {
      terminGoruntu: gunAyYil(s.termin),
      durumGoruntu: s.gecikmisMi ? 'Gecikmiş' : (s.yaklasiyorMu ? 'Yaklaşıyor' : s.durum)
    }));
    excelDisaAktar(liste, MERKEZI_AKSIYON_EXPORT_KOLONLARI, 'merkezi_aksiyonlar.xlsx');
  });

  maOzetiCiz();
  maListesiniCiz('');
}

const MERKEZI_AKSIYON_EXPORT_KOLONLARI = [
  { anahtar: 'kaynakModul', baslik: 'Kaynak Modül' },
  { anahtar: 'kaynakNo', baslik: 'Kaynak No' },
  { anahtar: 'baslik', baslik: 'Faaliyet / Konu' },
  { anahtar: 'sorumlu', baslik: 'Sorumlu' },
  { anahtar: 'terminGoruntu', baslik: 'Termin' },
  { anahtar: 'durumGoruntu', baslik: 'Durum' }
];

function maOzetiCiz() {
  const ozet = merkeziAksiyonOzetiHesapla();
  const kutu = document.getElementById('maOzetKutusu');
  const kart = (etiket, deger) => `<div class="istatistik-kutu"><span>${etiket}</span><b>${deger}</b></div>`;

  kutu.innerHTML = `
    <div class="istatistik-grid">
      ${kart('Toplam Açık Aksiyon', ozet.toplamAcik)}
      ${kart('Gecikmiş', ozet.gecikmis)}
      ${kart('7 Gün İçinde Termini Dolacak', ozet.yaklasiyor)}
    </div>
  `;
}

function maListesiniCiz(aramaMetni) {
  const govde = document.getElementById('maTabloGovde');
  const bosDurum = document.getElementById('maBosDurum');
  const filtreler = {
    kaynakModul: document.getElementById('maKaynakFiltre').value,
    durum: document.getElementById('maDurumFiltre').value
  };
  const liste = merkeziAksiyonlariGetir(aramaMetni, filtreler);

  govde.innerHTML = '';
  if (!liste.length) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = 'Eşleşen açık aksiyon bulunamadı.';
    return;
  }
  bosDurum.classList.remove('gorunur');

  liste.forEach(s => {
    const satir = document.createElement('tr');
    const durumGoruntu = s.gecikmisMi ? 'Gecikmiş' : (s.yaklasiyorMu ? 'Yaklaşıyor' : s.durum);
    satir.innerHTML = `
      <td>${_maKacir(s.kaynakModul)}</td>
      <td>${_maKacir(s.kaynakNo)}</td>
      <td>${_maKacir(s.baslik)}</td>
      <td>${_maKacir(s.sorumlu)}</td>
      <td>${gunAyYil(s.termin) || '-'}</td>
      <td><span class="genel-rozet rozet-${maRozetSinifAdi(durumGoruntu)}">${_maKacir(durumGoruntu)}</span></td>
      <td><a class="tablo-buton" href="${s.baglanti}" style="text-decoration:none; display:inline-block;">İncele</a></td>
    `;
    govde.appendChild(satir);
  });
}
