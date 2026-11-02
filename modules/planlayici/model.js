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
    tarih: v.tarih || '',
    saat: v.saat || '',
    oncelik: PLAN_ONCELIKLERI.includes(v.oncelik) ? v.oncelik : 'Normal',
    kategori: String(v.kategori || '').trim(),
    durum: PLAN_DURUMLARI.includes(v.durum) ? v.durum : 'Yapılacak',
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
  return { gecerli: !Object.keys(hatalar).length, hatalar };
}

function planNotuDogrula(v) {
  const hatalar = {};
  if (!String(v.baslik || '').trim() && !String(v.icerik || '').trim()) hatalar.icerik = 'Başlık veya not metni girin.';
  return { gecerli: !Object.keys(hatalar).length, hatalar };
}
