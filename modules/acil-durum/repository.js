// Acil Durum Yönetimi depolama katmanı. Firma bazlı izole (tenantAnahtar).

function _ekipAnahtari() { return tenantAnahtar('acil_durum_ekipleri'); }
function _ekipmanAnahtari() { return tenantAnahtar('acil_durum_ekipmanlari'); }
function _yanginTupuAnahtari() { return tenantAnahtar('acil_durum_yangin_tupleri'); }
// Kullanıcı isteği: "yangın tüplerinin kontrol kayıtları listesi yapalım
// ... yangın tüpü periyodik kontrolleri olarak" — dış firma bakım/kontrol
// ziyaretlerinin kendi kaydı, tüp envanterinden AYRI bir liste.
function _yanginTupuZiyaretAnahtari() { return tenantAnahtar('acil_durum_yangin_tupu_ziyaretleri'); }
function _tatbikatAnahtari() { return tenantAnahtar('acil_durum_tatbikatlari'); }
function _senaryoAnahtari() { return tenantAnahtar('acil_durum_senaryolari'); }
function _planAnahtari() { return tenantAnahtar('acil_durum_plani'); }
function _tesisBilgiAnahtari() { return tenantAnahtar('acil_durum_tesis_bilgi'); }
function _ekipTanimiAnahtari() { return tenantAnahtar('acil_durum_ekip_tanimlari'); }
function _komutaPozisyonuAnahtari() { return tenantAnahtar('acil_durum_komuta_pozisyonlari'); }
function _tahliyeAlaniAnahtari() { return tenantAnahtar('acil_durum_tahliye_planlari'); }
function _kimyasalEkiAnahtari() { return tenantAnahtar('acil_durum_kimyasal_ekleri'); }
function _krokiKontrolAnahtari() { return tenantAnahtar('acil_durum_kroki_kontrolleri'); }
function _disKurumAnahtari() { return tenantAnahtar('acil_durum_dis_kurumlar'); }
function _ozDenetimAnahtari() { return tenantAnahtar('acil_durum_oz_denetim'); }
function _eylemPlaniAnahtari() { return tenantAnahtar('acil_durum_eylem_plani'); }
function _mevzuatUygunlukAnahtari() { return tenantAnahtar('acil_durum_mevzuat_uygunluk'); }

function _genelListeGetir(anahtarFn) { return oku(anahtarFn(), []); }
function _genelListeKaydet(anahtarFn, liste) { yaz(anahtarFn(), liste); }
function _genelEkle(anahtarFn, kayit) { const l = _genelListeGetir(anahtarFn); l.push(kayit); _genelListeKaydet(anahtarFn, l); return kayit; }
function _genelGuncelle(anahtarFn, id, veriler) {
  const l = _genelListeGetir(anahtarFn);
  const i = l.findIndex(x => x.id === id);
  if (i === -1) return null;
  l[i] = Object.assign({}, l[i], veriler);
  _genelListeKaydet(anahtarFn, l);
  return l[i];
}
function _genelSil(anahtarFn, id) { _genelListeKaydet(anahtarFn, _genelListeGetir(anahtarFn).filter(x => x.id !== id)); }
// _genelGuncelle'nin aksine Firestore yazımının GERÇEKTEN bitmesini bekler
// (bkz. modules/uygunsuzluk/repository.js uygunsuzlukGuncelleRepoVeBekle —
// harita köprüsündeki konumGuncelle'de sayfa değişmeden önce yazımın
// bitmesini garantilemek için kullanılır).
function _genelGuncelleVeBekle(anahtarFn, id, veriler) {
  const l = _genelListeGetir(anahtarFn);
  const i = l.findIndex(x => x.id === id);
  if (i === -1) return Promise.resolve(null);
  l[i] = Object.assign({}, l[i], veriler);
  return yazVeSonucuGetir(anahtarFn(), l).then(() => l[i]);
}
// Kullanıcı isteği: "yangın tüplerini içe aktarıyorum 281 adet, sayfa
// yenilediğimde sayı azalıyor" — kök neden: Excel içe aktarma satır satır
// N ayrı yaz() çağrısı yapıyordu (her biri o ana kadarki TÜM diziyi yeniden
// gönderen, sonucu doğrulanmayan "fire-and-forget" bir yazım); yüzlerce
// arka arkaya yazımdan biri (veya birçoğu) sessizce başarısız olunca
// sayfada 281 görünse de Firestore'a gerçekte daha az kayıt işleniyordu,
// yenilemede bu ortaya çıkıyordu. Çözüm: "toplu silme" (yanginTupuToplusil)
// ile AYNI ilke -- N ayrı yazım yerine TEK oku + TEK yaz, ve bu kez
// yazVeSonucuGetir ile gerçekten Firestore'a ulaştığından emin olunur.
function _genelListeKaydetVeBekle(anahtarFn, liste) {
  return yazVeSonucuGetir(anahtarFn(), liste);
}

function ekipUyeleriTumunuGetir() { return _genelListeGetir(_ekipAnahtari); }
function ekipUyesiEkleRepo(k) { return _genelEkle(_ekipAnahtari, k); }
function ekipUyesiGuncelleRepo(id, v) { return _genelGuncelle(_ekipAnahtari, id, v); }
function ekipUyesiSilRepo(id) { _genelSil(_ekipAnahtari, id); }
function ekipUyesiIdIleGetirRepo(id) { return ekipUyeleriTumunuGetir().find(x => x.id === id) || null; }

function ekipmanlariTumunuGetir() { return _genelListeGetir(_ekipmanAnahtari); }
function ekipmanEkleRepo(k) { return _genelEkle(_ekipmanAnahtari, k); }
function ekipmanGuncelleRepo(id, v) { return _genelGuncelle(_ekipmanAnahtari, id, v); }
function ekipmanGuncelleRepoVeBekle(id, v) { return _genelGuncelleVeBekle(_ekipmanAnahtari, id, v); }
// Kullanıcı isteği: "tüm ekipmanlarda kontrol periyodunu 30 gün yap mevcut
// ekipmanlarda da bu süre değişsin yeniden hesaplansın" -- mevcut kayıtları
// tek seferde (tek yazımla) güncellemek için toplu kaydetme (bkz. service.js
// ekipmanlarPeriyotMigrasyonuUygula).
function ekipmanlariTumunuKaydetRepo(liste) { return _genelListeKaydet(_ekipmanAnahtari, liste); }
function ekipmanSilRepo(id) { _genelSil(_ekipmanAnahtari, id); }
function ekipmanIdIleGetirRepo(id) { return ekipmanlariTumunuGetir().find(x => x.id === id) || null; }

function yanginTupleriTumunuGetir() { return _genelListeGetir(_yanginTupuAnahtari); }
function yanginTupuEkleRepo(k) { return _genelEkle(_yanginTupuAnahtari, k); }
function yanginTupuGuncelleRepo(id, v) { return _genelGuncelle(_yanginTupuAnahtari, id, v); }
function yanginTupuGuncelleRepoVeBekle(id, v) { return _genelGuncelleVeBekle(_yanginTupuAnahtari, id, v); }
function yanginTupuSilRepo(id) { _genelSil(_yanginTupuAnahtari, id); }
function yanginTupuIdIleGetirRepo(id) { return yanginTupleriTumunuGetir().find(x => x.id === id) || null; }
// Toplu silme (bkz. service.js yanginTupuToplusil) — N kayıt için N ayrı
// oku/yaz yerine (bkz. modules/yuklenici/service.js aynı desen) tek
// oku+filtrele+yaz.
function yanginTupuListesiKaydetRepo(liste) { _genelListeKaydet(_yanginTupuAnahtari, liste); }
// Excel içe aktarma için — bkz. _genelListeKaydetVeBekle yorumu.
function yanginTupuListesiKaydetRepoVeBekle(liste) { return _genelListeKaydetVeBekle(_yanginTupuAnahtari, liste); }

// Kullanıcı isteği: "yangın tüpü periyodik kontrolleri" (dış firma
// ziyaretleri) — tüp envanterinden ayrı, kendi basit CRUD'u.
function yanginTupuZiyaretleriTumunuGetir() { return _genelListeGetir(_yanginTupuZiyaretAnahtari); }
function yanginTupuZiyaretiEkleRepo(k) { return _genelEkle(_yanginTupuZiyaretAnahtari, k); }
function yanginTupuZiyaretiGuncelleRepo(id, v) { return _genelGuncelle(_yanginTupuZiyaretAnahtari, id, v); }
function yanginTupuZiyaretiSilRepo(id) { _genelSil(_yanginTupuZiyaretAnahtari, id); }
function yanginTupuZiyaretiIdIleGetirRepo(id) { return yanginTupuZiyaretleriTumunuGetir().find(x => x.id === id) || null; }

function tatbikatlariTumunuGetir() { return _genelListeGetir(_tatbikatAnahtari); }
function tatbikatEkleRepo(k) { return _genelEkle(_tatbikatAnahtari, k); }
function tatbikatGuncelleRepo(id, v) { return _genelGuncelle(_tatbikatAnahtari, id, v); }
function tatbikatSilRepo(id) { _genelSil(_tatbikatAnahtari, id); }
function tatbikatIdIleGetirRepo(id) { return tatbikatlariTumunuGetir().find(x => x.id === id) || null; }

function senaryolariTumunuGetir() { return _genelListeGetir(_senaryoAnahtari); }
function senaryoEkleRepo(k) { return _genelEkle(_senaryoAnahtari, k); }
function senaryoGuncelleRepo(id, v) { return _genelGuncelle(_senaryoAnahtari, id, v); }
function senaryoSilRepo(id) { _genelSil(_senaryoAnahtari, id); }
function senaryoIdIleGetirRepo(id) { return senaryolariTumunuGetir().find(x => x.id === id) || null; }

function planGetirRepo() { return oku(_planAnahtari(), null); }
function planKaydetRepo(plan) { yaz(_planAnahtari(), plan); return plan; }

function tesisBilgiGetirRepo() { return oku(_tesisBilgiAnahtari(), null); }
function tesisBilgiKaydetRepo(tesisBilgi) { yaz(_tesisBilgiAnahtari(), tesisBilgi); return tesisBilgi; }

function ekipTanimlariTumunuGetir() { return _genelListeGetir(_ekipTanimiAnahtari); }
function ekipTanimiEkleRepo(k) { return _genelEkle(_ekipTanimiAnahtari, k); }
function ekipTanimiGuncelleRepo(id, v) { return _genelGuncelle(_ekipTanimiAnahtari, id, v); }
function ekipTanimiSilRepo(id) { _genelSil(_ekipTanimiAnahtari, id); }
function ekipTanimiIdIleGetirRepo(id) { return ekipTanimlariTumunuGetir().find(x => x.id === id) || null; }

function komutaPozisyonlariTumunuGetir() { return _genelListeGetir(_komutaPozisyonuAnahtari); }
function komutaPozisyonuEkleRepo(k) { return _genelEkle(_komutaPozisyonuAnahtari, k); }
function komutaPozisyonuGuncelleRepo(id, v) { return _genelGuncelle(_komutaPozisyonuAnahtari, id, v); }
function komutaPozisyonuSilRepo(id) { _genelSil(_komutaPozisyonuAnahtari, id); }
function komutaPozisyonuIdIleGetirRepo(id) { return komutaPozisyonlariTumunuGetir().find(x => x.id === id) || null; }

function tahliyeAlanlariTumunuGetir() { return _genelListeGetir(_tahliyeAlaniAnahtari); }
function tahliyeAlaniEkleRepo(k) { return _genelEkle(_tahliyeAlaniAnahtari, k); }
function tahliyeAlaniGuncelleRepo(id, v) { return _genelGuncelle(_tahliyeAlaniAnahtari, id, v); }
function tahliyeAlaniGuncelleRepoVeBekle(id, v) { return _genelGuncelleVeBekle(_tahliyeAlaniAnahtari, id, v); }
function tahliyeAlaniSilRepo(id) { _genelSil(_tahliyeAlaniAnahtari, id); }
function tahliyeAlaniIdIleGetirRepo(id) { return tahliyeAlanlariTumunuGetir().find(x => x.id === id) || null; }

function kimyasalEkleriTumunuGetir() { return _genelListeGetir(_kimyasalEkiAnahtari); }
function kimyasalEkiEkleRepo(k) { return _genelEkle(_kimyasalEkiAnahtari, k); }
function kimyasalEkiGuncelleRepo(id, v) { return _genelGuncelle(_kimyasalEkiAnahtari, id, v); }
function kimyasalEkiSilRepo(id) { _genelSil(_kimyasalEkiAnahtari, id); }
function kimyasalEkiIdIleGetirRepo(id) { return kimyasalEkleriTumunuGetir().find(x => x.id === id) || null; }

function krokiKontrolleriTumunuGetir() { return _genelListeGetir(_krokiKontrolAnahtari); }
function krokiKontrolMaddesiEkleRepo(k) { return _genelEkle(_krokiKontrolAnahtari, k); }
function krokiKontrolMaddesiGuncelleRepo(id, v) { return _genelGuncelle(_krokiKontrolAnahtari, id, v); }
function krokiKontrolMaddesiSilRepo(id) { _genelSil(_krokiKontrolAnahtari, id); }
function krokiKontrolMaddesiIdIleGetirRepo(id) { return krokiKontrolleriTumunuGetir().find(x => x.id === id) || null; }

function disKurumlariTumunuGetir() { return _genelListeGetir(_disKurumAnahtari); }
function disKurumEkleRepo(k) { return _genelEkle(_disKurumAnahtari, k); }
function disKurumGuncelleRepo(id, v) { return _genelGuncelle(_disKurumAnahtari, id, v); }
function disKurumSilRepo(id) { _genelSil(_disKurumAnahtari, id); }
function disKurumIdIleGetirRepo(id) { return disKurumlariTumunuGetir().find(x => x.id === id) || null; }

function ozDenetimGetirRepo() { return oku(_ozDenetimAnahtari(), null); }
function ozDenetimKaydetRepo(ozDenetim) { yaz(_ozDenetimAnahtari(), ozDenetim); return ozDenetim; }

function eylemPlaniTumunuGetir() { return _genelListeGetir(_eylemPlaniAnahtari); }
function eylemPlaniMaddesiEkleRepo(k) { return _genelEkle(_eylemPlaniAnahtari, k); }
function eylemPlaniMaddesiGuncelleRepo(id, v) { return _genelGuncelle(_eylemPlaniAnahtari, id, v); }
function eylemPlaniMaddesiSilRepo(id) { _genelSil(_eylemPlaniAnahtari, id); }
function eylemPlaniMaddesiIdIleGetirRepo(id) { return eylemPlaniTumunuGetir().find(x => x.id === id) || null; }

function mevzuatUygunlukTumunuGetir() { return _genelListeGetir(_mevzuatUygunlukAnahtari); }
function mevzuatUygunlukListesiKaydetRepo(liste) { _genelListeKaydet(_mevzuatUygunlukAnahtari, liste); }
function mevzuatUygunlukMaddesiEkleRepo(k) { return _genelEkle(_mevzuatUygunlukAnahtari, k); }
function mevzuatUygunlukMaddesiGuncelleRepo(id, v) { return _genelGuncelle(_mevzuatUygunlukAnahtari, id, v); }
function mevzuatUygunlukMaddesiSilRepo(id) { _genelSil(_mevzuatUygunlukAnahtari, id); }
function mevzuatUygunlukMaddesiIdIleGetirRepo(id) { return mevzuatUygunlukTumunuGetir().find(x => x.id === id) || null; }
