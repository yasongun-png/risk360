// Yüklenici depolama katmanı. Firma bazlı izole (tenantAnahtar).

function _yukleniciFirmaAnahtari() { return tenantAnahtar('yuklenici_firmalari'); }
function _yukleniciKisiAnahtari() { return tenantAnahtar('yuklenici_kisileri'); }
function _yukleniciAracAnahtari() { return tenantAnahtar('yuklenici_araclari'); }
function _yukleniciZiyaretciAnahtari() { return tenantAnahtar('yuklenici_ziyaretciler'); }

// Dashboard'daki "Yüklenici — Son Güncellemeler" için kim/ne zaman izi
// (kullanıcı isteği). Ekleme: olusturan (olusturmaTarihi modelde zaten var);
// güncelleme: guncellemeTarihi + guncelleyen.
function yukleniciIzBilgisi() {
  const k = typeof oturumdakiKullanici === 'function' ? oturumdakiKullanici() : null;
  return { zaman: new Date().toISOString(), kim: k ? (k.adSoyad || k.kullaniciAdi || '') : '' };
}

function _yukleniciEklemeIzi(kayit) {
  if (!kayit.olusturan) kayit.olusturan = yukleniciIzBilgisi().kim;
  return kayit;
}

function _yukleniciGuncellemeIzi(veriler) {
  const iz = yukleniciIzBilgisi();
  return Object.assign({}, veriler, { guncellemeTarihi: iz.zaman, guncelleyen: iz.kim });
}

function yukleniciFirmalariTumunuGetir() {
  return oku(_yukleniciFirmaAnahtari(), []);
}

function _yukleniciFirmalariKaydet(liste) {
  yaz(_yukleniciFirmaAnahtari(), liste);
}

function yukleniciFirmaEkleRepo(firma) {
  const liste = yukleniciFirmalariTumunuGetir();
  liste.push(_yukleniciEklemeIzi(firma));
  _yukleniciFirmalariKaydet(liste);
  return firma;
}

function yukleniciFirmaGuncelleRepo(id, veriler) {
  const liste = yukleniciFirmalariTumunuGetir();
  const index = liste.findIndex(f => f.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], _yukleniciGuncellemeIzi(veriler));
  _yukleniciFirmalariKaydet(liste);
  return liste[index];
}

function yukleniciFirmaSilRepo(id) {
  _yukleniciFirmalariKaydet(yukleniciFirmalariTumunuGetir().filter(f => f.id !== id));
  _yukleniciKisileriKaydet(yukleniciKisileriTumunuGetir().filter(k => k.firmaId !== id));
}

function yukleniciFirmaIdIleGetirRepo(id) {
  return yukleniciFirmalariTumunuGetir().find(f => f.id === id) || null;
}

function yukleniciKisileriTumunuGetir() {
  return oku(_yukleniciKisiAnahtari(), []);
}

// Kullanıcı isteği: "ilk giriş seçildikten bir hafta sonra sorsun, ilk giriş
// kaldırılsın mı" — İlk Giriş hangi yoldan (form, toplu ekleme, Excel)
// işaretlenirse işaretlensin seçildiği an burada damgalanır, kaldırılınca
// silinir (bkz. ui.js _ykIlkGirisHatirlat).
function _yukleniciKisileriKaydet(liste) {
  const simdi = new Date().toISOString();
  yaz(_yukleniciKisiAnahtari(), liste.map(k => {
    if (k.ilkGiris && !k.ilkGirisTarihi) return Object.assign({}, k, { ilkGirisTarihi: simdi });
    if (!k.ilkGiris && (k.ilkGirisTarihi || k.ilkGirisSorulduTarihi)) return Object.assign({}, k, { ilkGirisTarihi: '', ilkGirisSorulduTarihi: '' });
    return k;
  }));
}

function yukleniciKisiEkleRepo(kisi) {
  const liste = yukleniciKisileriTumunuGetir();
  liste.push(_yukleniciEklemeIzi(kisi));
  _yukleniciKisileriKaydet(liste);
  return kisi;
}

function yukleniciKisiGuncelleRepo(id, veriler) {
  const liste = yukleniciKisileriTumunuGetir();
  const index = liste.findIndex(k => k.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], _yukleniciGuncellemeIzi(veriler));
  _yukleniciKisileriKaydet(liste);
  return liste[index];
}

function yukleniciKisiSilRepo(id) {
  _yukleniciKisileriKaydet(yukleniciKisileriTumunuGetir().filter(k => k.id !== id));
}

function yukleniciKisiIdIleGetirRepo(id) {
  return yukleniciKisileriTumunuGetir().find(k => k.id === id) || null;
}

// Birden çok kişiyi TEK yazımla günceller (toplu pasif/aktif): art arda yaz()
// çağrıları ağ sırası yüzünden birbirini ezebiliyordu.
function yukleniciKisileriTopluGuncelleRepo(idler, veriler) {
  const set = new Set(idler);
  const liste = yukleniciKisileriTumunuGetir();
  let sayi = 0;
  liste.forEach((k, i) => { if (set.has(k.id)) { liste[i] = Object.assign({}, k, _yukleniciGuncellemeIzi(veriler)); sayi++; } });
  if (sayi) _yukleniciKisileriKaydet(liste);
  return sayi;
}

// Birden çok kişiye KİŞİ BAŞINA FARKLI değerleri TEK yazımla uygular
// (Seçilenleri Toplu Düzenle). degisiklikler: [{ id, veriler }]. Her satır
// yalnızca kendi id'siyle birebir eşleşen kayda yazılır; id'si boş ya da
// listede bulunmayan satır varsa hiçbir şey yazılmaz (yanlış kayda
// düşmesin) ve null döner.
function yukleniciKisileriFarkliGuncelleRepo(degisiklikler) {
  const liste = yukleniciKisileriTumunuGetir();
  const indexler = degisiklikler.map(d => (d.id ? liste.findIndex(k => k.id === d.id) : -1));
  if (indexler.some(i => i === -1)) return null;
  degisiklikler.forEach((d, j) => { liste[indexler[j]] = Object.assign({}, liste[indexler[j]], _yukleniciGuncellemeIzi(d.veriler)); });
  _yukleniciKisileriKaydet(liste);
  return indexler.map(i => liste[i]);
}

function yukleniciAraclariTumunuGetir() {
  return oku(_yukleniciAracAnahtari(), []);
}

function _yukleniciAraclariKaydet(liste) {
  yaz(_yukleniciAracAnahtari(), liste);
}

function yukleniciAracEkleRepo(arac) {
  const liste = yukleniciAraclariTumunuGetir();
  liste.push(_yukleniciEklemeIzi(arac));
  _yukleniciAraclariKaydet(liste);
  return arac;
}

function yukleniciAraclariTopluGuncelleRepo(idler, veriler) {
  const set = new Set(idler);
  const liste = yukleniciAraclariTumunuGetir();
  let sayi = 0;
  liste.forEach((a, i) => { if (set.has(a.id)) { liste[i] = Object.assign({}, a, _yukleniciGuncellemeIzi(veriler)); sayi++; } });
  if (sayi) _yukleniciAraclariKaydet(liste);
  return sayi;
}

function yukleniciAracGuncelleRepo(id, veriler) {
  const liste = yukleniciAraclariTumunuGetir();
  const index = liste.findIndex(a => a.id === id);
  if (index === -1) return null;
  liste[index] = Object.assign({}, liste[index], _yukleniciGuncellemeIzi(veriler));
  _yukleniciAraclariKaydet(liste);
  return liste[index];
}

function yukleniciAracSilRepo(id) {
  _yukleniciAraclariKaydet(yukleniciAraclariTumunuGetir().filter(a => a.id !== id));
}

function yukleniciAracIdIleGetirRepo(id) {
  return yukleniciAraclariTumunuGetir().find(a => a.id === id) || null;
}

function yukleniciZiyaretcileriTumunuGetir() {
  return oku(_yukleniciZiyaretciAnahtari(), []);
}

function _yukleniciZiyaretcileriKaydet(liste) {
  yaz(_yukleniciZiyaretciAnahtari(), liste);
}

function yukleniciZiyaretciEkleRepo(ziyaretci) {
  const liste = yukleniciZiyaretcileriTumunuGetir();
  liste.push(_yukleniciEklemeIzi(ziyaretci));
  _yukleniciZiyaretcileriKaydet(liste);
  return ziyaretci;
}

function yukleniciZiyaretciSilRepo(id) {
  _yukleniciZiyaretcileriKaydet(yukleniciZiyaretcileriTumunuGetir().filter(z => z.id !== id));
}
