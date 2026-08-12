// Periyodik Kontrol veri modeli: Ekipman (kontrole tabi iş ekipmanı) ve
// Kontrol Kaydı (her muayene olayı) — iki ayrı ama ilişkili kayıt türü.
// "İş Ekipmanlarının Kullanımında Sağlık ve Güvenlik Şartları Yönetmeliği"
// kapsamındaki ekipman kategorileri; yönetmelik somut bir süre tablosu
// vermediği için (işverenin risk değerlendirmesine bırakılmıştır), yaygın
// İSG uygulamasındaki gibi tüm kategoriler için varsayılan periyot 12 aydır
// — ekipman bazında değiştirilebilir.

function bugunIso() {
  return new Date().toISOString().slice(0, 10);
}

const PERIYODIK_KATEGORILERI = [
  'Basınçlı Kaplar', 'Buhar Kazanları', 'Hava Tankları / Kompresörler',
  'Vinç ve Caraskallar', 'Forkliftler', 'Transpaletler', 'Platformlar (Yüksekte Çalışma)',
  'Asansörler', 'Elektrik Tesisatı', 'Topraklama Tesisatı', 'Paratoner (Yıldırımlık)',
  'Yangın Söndürme Cihazları', 'Yangın Dolapları / Hidrant', 'Sprinkler Sistemleri',
  'Gaz Tesisatı', 'İskeleler', 'Kimyasal Tanklar', 'Konveyörler', 'Pompalar', 'Diğer'
];

// Tüm kategoriler için yaygın uygulamadaki varsayılan periyot: 12 ay.
// Risk değerlendirmesi farklı bir süre gerektiriyorsa ekipman kaydında değiştirilebilir.
const PERIYODIK_VARSAYILAN_AY = 12;

const PERIYODIK_EKIPMAN_DURUMLARI = ['Aktif', 'Pasif', 'Bakımda', 'Hurda'];
const PERIYODIK_RISK_SEVIYELERI = ['Düşük', 'Orta', 'Yüksek', 'Kritik'];
const PERIYODIK_KONTROL_TURLERI = ['Periyodik Kontrol', 'İlk Kontrol', 'Tekrar Kontrol', 'Özel Muayene'];
const PERIYODIK_SONUCLAR = ['Uygun', 'Şartlı Uygun', 'Uygun Değil'];

function periyodikOnEkiUret(bolum) {
  const harfEslesme = { ç: 'C', ğ: 'G', ı: 'I', ö: 'O', ş: 'S', ü: 'U', İ: 'I' };
  const temiz = (bolum || 'EKP')
    .split('')
    .map(k => harfEslesme[k] || k)
    .join('')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 3);
  return (temiz || 'EKP').padEnd(3, 'X');
}

function periyodikSonrakiNoUret(bolum, mevcutListe) {
  const onEk = periyodikOnEkiUret(bolum);
  let maks = 0;
  (mevcutListe || []).forEach(k => {
    if (!String(k.ekipmanNo || '').startsWith(onEk)) return;
    const kuyruk = parseInt(String(k.ekipmanNo).slice(3), 10);
    if (Number.isFinite(kuyruk) && kuyruk > maks) maks = kuyruk;
  });
  return onEk + String(maks + 1).padStart(4, '0');
}

// toISOString() UTC'ye çevirir; UTC+3'te yerel gece yarısı bir gün geri kayar
// (bkz. yuklenici/model.js -> _yukleniciYerelTarihStr) — bu yüzden yerel Y/A/G
// bileşenlerinden string üretiyoruz.
function _periyodikYerelTarihStr(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function periyodikTarihAyEkle(tarihIso, ay) {
  if (!tarihIso) return '';
  const d = new Date(tarihIso + 'T00:00:00');
  if (isNaN(d)) return '';
  d.setMonth(d.getMonth() + Number(ay || 0));
  return _periyodikYerelTarihStr(d);
}

// Ekipman durumunu hesaplar: en son kontrol sonucu "Uygun Değil" ise (tarihten
// bağımsız olarak) öncelikli uyarı; aksi halde sonraki kontrol tarihine göre
// gecikmiş/yaklaşan/uygun.
function periyodikEkipmanDurumuHesapla(ekipman, sonKontrol, bugunStr) {
  if (ekipman.durum === 'Pasif' || ekipman.durum === 'Hurda' || ekipman.durum === 'Bakımda') return ekipman.durum;
  if (sonKontrol && sonKontrol.sonuc === 'Uygun Değil') return 'Uygun Değil';

  const bugun = bugunStr || bugunIso();
  if (!ekipman.sonrakiKontrolTarihi) return 'Aktif';
  if (ekipman.sonrakiKontrolTarihi < bugun) return 'Süresi Geçti';
  const otuzGunSonra = new Date(bugun + 'T00:00:00');
  otuzGunSonra.setDate(otuzGunSonra.getDate() + 30);
  if (ekipman.sonrakiKontrolTarihi <= _periyodikYerelTarihStr(otuzGunSonra)) return 'Yaklaşıyor';
  return 'Aktif';
}

function periyodikEkipmanOlustur(veriler) {
  const periyotAy = Number(veriler.periyotAy) || PERIYODIK_VARSAYILAN_AY;
  const sonKontrolTarihi = veriler.sonKontrolTarihi || '';
  return {
    id: veriler.id || rastgeleId(),
    ekipmanNo: veriler.ekipmanNo || '',
    demirbasNo: (veriler.demirbasNo || '').trim(),
    ad: (veriler.ad || '').trim(),
    kategori: veriler.kategori || 'Diğer',
    marka: (veriler.marka || '').trim(),
    model: (veriler.model || '').trim(),
    seriNo: (veriler.seriNo || '').trim(),
    imalYili: veriler.imalYili || '',
    bolum: (veriler.bolum || '').trim(),
    lokasyon: (veriler.lokasyon || '').trim(),
    sorumluPersonel: (veriler.sorumluPersonel || '').trim(),
    riskSeviyesi: veriler.riskSeviyesi || 'Orta',
    periyotAy,
    sonKontrolTarihi,
    sonrakiKontrolTarihi: veriler.sonrakiKontrolTarihi || (sonKontrolTarihi ? periyodikTarihAyEkle(sonKontrolTarihi, periyotAy) : ''),
    durum: veriler.durum || 'Aktif',
    notlar: (veriler.notlar || '').trim(),
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}

function periyodikKontrolKaydiOlustur(veriler) {
  return {
    id: veriler.id || rastgeleId(),
    ekipmanId: veriler.ekipmanId || '',
    kontrolTarihi: veriler.kontrolTarihi || bugunIso(),
    kontrolTuru: veriler.kontrolTuru || 'Periyodik Kontrol',
    raporNo: (veriler.raporNo || '').trim(),
    firma: (veriler.firma || '').trim(),
    uzman: (veriler.uzman || '').trim(),
    sonuc: veriler.sonuc || 'Uygun',
    aciklama: (veriler.aciklama || '').trim(),
    belgeGorseli: veriler.belgeGorseli || '',
    olusturmaTarihi: veriler.olusturmaTarihi || new Date().toISOString()
  };
}
