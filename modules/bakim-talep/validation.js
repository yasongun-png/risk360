// Bakım Talep formunun AŞAMA bazlı zorunlu alan kontrolleri. Her fonksiyon
// { gecerli, hatalar } döner (diğer modüllerdeki xDogrula desenindeki gibi).

function bakimTalepDogrula(talep) {
  const hatalar = {};
  if (!talep.birim || !talep.birim.trim()) hatalar.birim = 'Birim seçimi zorunludur.';
  if (!talep.acanKisi || !talep.acanKisi.trim()) hatalar.acanKisi = 'Talebi açan kişi zorunludur.';
  if (!talep.isTanimi || !talep.isTanimi.trim()) hatalar.isTanimi = 'İş tanımı / arıza açıklaması zorunludur.';
  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}

function bakimDegerlendirmeDogrula(bakim) {
  const hatalar = {};
  if (!bakim.gorus || !bakim.gorus.trim()) hatalar.gorus = 'Bakım görüşü / teknik değerlendirme zorunludur (İSG\'ye göndermeden önce doldurulmalı).';
  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}

function isgOnayDogrula(isg) {
  const hatalar = {};
  if (isg.ilaveOnlemGerekli && (!isg.ilaveOnlemAciklama || !isg.ilaveOnlemAciklama.trim())) {
    hatalar.ilaveOnlemAciklama = 'İlave önlem gerekli işaretlendiyse açıklama zorunludur.';
  }
  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}

function bakimTalepRedDogrula(gerekce) {
  const hatalar = {};
  if (!gerekce || !gerekce.trim()) hatalar.redGerekcesi = 'Reddetme gerekçesi zorunludur.';
  return { gecerli: Object.keys(hatalar).length === 0, hatalar };
}
