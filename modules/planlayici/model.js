// İş Planım ve Notlarım — kullanıcı isteği: "uygulama içinde yapacağım işleri
// planlayabileceğim, not alabileceğim bir alan". Kontrol panelinde kart değil,
// ızgaranın üstünde tam genişlik şerit olarak açılır (kullanıcı: tek kart
// sayfanın şeklini bozar). Kayıtlar aktif firmaya göre tutulur ama yalnızca
// oluşturan kullanıcıya gösterilir.

// Yerel tarih (toISOString UTC verir; gece 00:00–03:00 arası bir önceki gün çıkardı).
function bugunIso() {
  const t = new Date();
  return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
}

const PLAN_ONCELIKLERI =['Düşük', 'Normal', 'Yüksek'];
const PLAN_DURUMLARI = ['Yapılacak', 'Devam Ediyor', 'Tamamlandı'];
// Kullanıcı isteği: iş bir defalık mı, her gün / hafta / ay / yıl mı tekrarlanacak.
const PLAN_TEKRARLARI = ['Bir defalık', 'Her gün', 'Her hafta', 'Her ay', 'Her yıl'];
const PLAN_KATEGORILERI = ['Saha Denetimi', 'Eğitim', 'Toplantı', 'Evrak / Rapor', 'Risk Değerlendirmesi', 'Ölçüm / Kontrol', 'Görüşme / Telefon', 'Diğer'];
const NOT_RENKLERI = [
  { ad: 'Beyaz', renk: '#ffffff' }, { ad: 'Sarı', renk: '#fef9c3' }, { ad: 'Yeşil', renk: '#dcfce7' },
  { ad: 'Mavi', renk: '#dbeafe' }, { ad: 'Pembe', renk: '#fce7f3' }, { ad: 'Turuncu', renk: '#ffedd5' }
];

function planGoreviOlustur(v) {
  return {
    id: v.id || rastgeleId(),
    baslik: String(v.baslik || '').trim(),
    aciklama: String(v.aciklama || '').trim(),
    // Kullanıcı isteği: "işin başladığı tarih ve planlanan bitiş tarihi".
    // tarih = planlanan bitiş (ilk sürümde tek tarih alanıydı; eski kayıtlarda
    // anlamı değişmesin diye adı korundu).
    baslangicTarihi: v.baslangicTarihi || '',
    tarih: v.tarih || '',
    saat: v.saat || '',
    oncelik: PLAN_ONCELIKLERI.includes(v.oncelik) ? v.oncelik : 'Normal',
    kategori: String(v.kategori || '').trim(),
    durum: PLAN_DURUMLARI.includes(v.durum) ? v.durum : 'Yapılacak',
    tekrar: PLAN_TEKRARLARI.includes(v.tekrar) ? v.tekrar : 'Bir defalık',
    // Tekrarlayan iş tamamlanınca oluşturulan bir sonraki tekrarın id'si (geri alınırsa silinir).
    sonrakiId: v.sonrakiId || '',
    // Başka modülden "📝 Plana Ekle" ile gelen işlerde kaynak (bkz. core/plana-ekle.js).
    kaynak: v.kaynak || '',
    kaynakUrl: v.kaynakUrl || '',
    kaynakAnahtar: v.kaynakAnahtar || '',
    tamamlanmaTarihi: v.tamamlanmaTarihi || '',
    olusturanId: v.olusturanId || '',
    olusturmaTarihi: v.olusturmaTarihi || new Date().toISOString()
  };
}

function planNotuOlustur(v) {
  return {
    id: v.id || rastgeleId(),
    baslik: String(v.baslik || '').trim(),
    icerik: String(v.icerik || '').trim(),
    renk: NOT_RENKLERI.some(r => r.renk === v.renk) ? v.renk : NOT_RENKLERI[1].renk,
    sabit: !!v.sabit,
    olusturanId: v.olusturanId || '',
    olusturmaTarihi: v.olusturmaTarihi || new Date().toISOString(),
    guncellemeTarihi: new Date().toISOString()
  };
}

function planGoreviDogrula(v) {
  const hatalar = {};
  if (!String(v.baslik || '').trim()) hatalar.baslik = 'Yapılacak işi yazın.';
  if (v.baslangicTarihi && v.tarih && v.tarih < v.baslangicTarihi) hatalar.tarih = 'Planlanan bitiş tarihi başlangıçtan önce olamaz.';
  else if (v.tekrar && v.tekrar !== 'Bir defalık' && !v.baslangicTarihi && !v.tarih) hatalar.tarih = 'Tekrarlayan iş için başlangıç veya bitiş tarihi girin.';
  return { gecerli: !Object.keys(hatalar).length, hatalar };
}

// Tarihi tekrar periyodu kadar ileri alır. Ay/yıl sonu taşmaz: 31 Ocak + 1 ay = 28/29 Şubat.
function planTarihIlerlet(iso, tekrar) {
  if (!iso) return '';
  const [y, a, g] = iso.split('-').map(Number);
  let d;
  if (tekrar === 'Her gün') d = new Date(y, a - 1, g + 1);
  else if (tekrar === 'Her hafta') d = new Date(y, a - 1, g + 7);
  else {
    const yeniY = tekrar === 'Her yıl' ? y + 1 : y + (a === 12 ? 1 : 0);
    const yeniA = tekrar === 'Her yıl' ? a - 1 : a % 12;
    d = new Date(yeniY, yeniA, Math.min(g, new Date(yeniY, yeniA + 1, 0).getDate()));
  }
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function planNotuDogrula(v) {
  const hatalar = {};
  if (!String(v.baslik || '').trim() && !String(v.icerik || '').trim()) hatalar.icerik = 'Başlık veya not metni girin.';
  return { gecerli: !Object.keys(hatalar).length, hatalar };
}
