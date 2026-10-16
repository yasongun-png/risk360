// Tabela Yönetimi doğrulama kuralları.

function _tabelaOrtakDogrula(veriler, hatalar) {
  if (!veriler.bolum || !veriler.bolum.trim()) hatalar.bolum = 'Bölüm seçilmeden kayıt yapılamaz.';
  if (!veriler.lokasyon || !veriler.lokasyon.trim()) hatalar.lokasyon = 'Lokasyon girilmeden kayıt yapılamaz.';
  if (!veriler.tabelaAdi || !veriler.tabelaAdi.trim()) hatalar.tabelaAdi = 'Tabela adı girilmeden kayıt yapılamaz.';
  if (!veriler.foto) hatalar.foto = 'Fotoğraf seçilmeden kayıt yapılamaz.';
}

// digerKayitlar: aynı Tabela No'nun başka bir kayıtta kullanılıp
// kullanılmadığını kontrol etmek için (düzenlenen kaydın kendisi hariç).
function tabelaMevcutDogrula(veriler, digerKayitlar) {
  const hatalar = {};
  _tabelaOrtakDogrula(veriler, hatalar);
  const no = (veriler.tabelaNo || '').trim();
  if (!no) hatalar.tabelaNo = 'Tabela No girilmeden kayıt yapılamaz.';
  else if ((digerKayitlar || []).some(k => String(k.tabelaNo || '').trim().toUpperCase() === no.toUpperCase())) {
    hatalar.tabelaNo = no + ' numarası başka bir tabelada kullanılıyor.';
  }
  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}

function tabelaIhtiyacDogrula(veriler) {
  const hatalar = {};
  _tabelaOrtakDogrula(veriler, hatalar);
  if (!(parseInt(veriler.adet, 10) >= 1)) hatalar.adet = 'Adet en az 1 olmalıdır.';
  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}

function tabelaKatalogDogrula(veriler) {
  const hatalar = {};
  if (!veriler.tabelaAdi || !veriler.tabelaAdi.trim()) hatalar.tabelaAdi = 'Tabela adı girilmeden kayıt yapılamaz.';
  if (!veriler.foto) hatalar.foto = 'Fotoğraf seçilmeden kayıt yapılamaz.';
  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}
