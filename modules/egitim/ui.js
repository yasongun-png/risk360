// Eğitim ekranının DOM işlemleri.

let _egitimGorunum = 'kayitlar';
let _aktifFirma = null;
let _duzenlenenKayitId = null;
let _seciliKayitIdleri = new Set();
let _sertifikaKayitId = null;
let _topluSeciliPersonelIdleri = new Set();

function sertifikaAyarModalAc(id) {
  const kayit = egitimKaydiIdIleGetirRepo(id);
  if (!kayit || !_aktifFirma) return;
  _sertifikaKayitId = id;

  const varsayilan = egitimTemelSertifikaVarsayilaniHesapla(kayit, _aktifFirma);
  document.getElementById('sertTehlikeSinifi').innerHTML = TEHLIKE_SINIFLARI.map(t => `<option ${t === varsayilan.tehlikeSinifi ? 'selected' : ''}>${t}</option>`).join('');
  document.getElementById('sertEgitimTuru').value = varsayilan.ilkTekrar;
  _sertifikaSureOnizlemesiGuncelle();
  document.getElementById('sertifikaAyarModal').classList.add('acik');
}

function sertifikaAyarModalKapat() {
  document.getElementById('sertifikaAyarModal').classList.remove('acik');
  _sertifikaKayitId = null;
}

function _sertifikaSureOnizlemesiGuncelle() {
  const tehlike = document.getElementById('sertTehlikeSinifi').value;
  const tur = document.getElementById('sertEgitimTuru').value;
  const dakika = egitimTemelSertifikaSuresiHesapla(tehlike, tur);
  document.getElementById('sertSureKutusu').innerHTML = `Toplam Eğitim Süresi: <strong>${_egitimSaatMetni(dakika)}</strong> (${dakika} dk)`;
}

const DURUM_METIN = {
  gecerli: 'Geçerli',
  yaklasiyor: 'Yakında Bitecek',
  gecmis: 'Süresi Dolmuş',
  suresiz: 'Süresiz',
  kayit_yok: 'Kayıt Yok'
};

const EGITIM_IMPORT_KOLONLARI = [
  { anahtar: 'sicilNo', baslik: 'Sicil No' },
  { anahtar: 'egitimTuru', baslik: 'Eğitim/Sertifika Türü' },
  { anahtar: 'tarih', baslik: 'Tarih' },
  { anahtar: 'tarih2', baslik: '2. Gün Tarihi (Temel İSG için)' },
  { anahtar: 'saat', baslik: 'Süre (Saat)' },
  { anahtar: 'aciklama', baslik: 'Açıklama / Belge Adı (MYK için)' },
  { anahtar: 'suresiz', baslik: 'Süresiz mi? (E/H)' }
];

const EGITIM_EXPORT_KOLONLARI = [
  { anahtar: 'personelAdi', baslik: 'Ad Soyad' },
  { anahtar: 'turAdi', baslik: 'Eğitim/Sertifika Türü' },
  { anahtar: 'tarih', baslik: 'Tarih' },
  { anahtar: 'saat', baslik: 'Süre (Saat)' },
  { anahtar: 'aciklama', baslik: 'Açıklama / Belge Adı' },
  { anahtar: 'bitisTarihi', baslik: 'Geçerlilik Bitiş' },
  { anahtar: 'durum', baslik: 'Durum' }
];

function _excelDegeriEvetMi(deger) {
  const k = _basligiNormallestir(String(deger || ''));
  return k === 'e' || k === 'evet' || k === '1' || k === 'true' || k === 'x';
}

function _egitimIceAktarSatiriEkle(satir) {
  const personel = personelleriGetir('', false).find(p => p.sicilNo === satir.sicilNo);
  if (!personel) return { basarili: false, hatalar: { genel: `Sicil No "${satir.sicilNo}" ile eşleşen personel bulunamadı.` } };

  const tur = egitimTurleriTumu().find(t => _basligiNormallestir(t.ad) === _basligiNormallestir(satir.egitimTuru));
  if (!tur) return { basarili: false, hatalar: { genel: `Eğitim türü "${satir.egitimTuru}" tanınmadı.` } };

  return egitimKaydiEkle({
    personelId: personel.id,
    egitimTuruId: tur.id,
    tarih: excelTarihiNormallestir(satir.tarih),
    tarih2: excelTarihiNormallestir(satir.tarih2),
    saat: satir.saat,
    aciklama: satir.aciklama || '',
    suresizMi: _excelDegeriEvetMi(satir.suresiz)
  });
}

// ==================== ESKİ SİSTEMDEN İÇE AKTARIM (EĞİTİM GEÇMİŞİ MATRİSİ) ====================
// Eski isg platformundaki "personel × eğitim türü" durum tablosu dışa
// aktarımıyla uyumlu: her satır bir personel (Sicil, Ad Soyad, İşbaşı Tarihi,
// İşten Çıkış Tarihi, Grup), ardından her eğitim türü için AYRI bir sütunda
// GÜNCEL BİTİŞ/DURUM tarihi (bunlar risk360'ta zaten canlı hesaplanıyor,
// olduğu gibi içe aktarılmaz). Gerçek kaynak veri ÜÇ ayrı sütunda:
// "Eğitim Geçmişi" (Tür Adı (GG.AA.YYYY) | ...), "MYK" (Belge Adı (GG.AA.YYYY) | ...,
// eski kayıtlarda tarih bazen parantez dışında/eksik olabiliyor) ve
// "İlkyardım" (tek bir GG.AA.YYYY tarihi ya da "Yok"). "Forklift"/"İş Mak."
// sütunları eski uygulamada yalnızca VAR/YOK olarak tutuluyor -- tarih hiç
// yok, bu yüzden risk360'ın tarih zorunlu belge kaydına aktarılamıyor, sadece
// sayılıp kullanıcıya bildiriliyor.
// "Grup" sütunu iki farklı anlama gelebilir: (a) BAĞFAŞ gibi TEK bir firmanın
// birden fazla sicili/işvereni (varsayılan davranış: hepsi aktif firmaya,
// Grup değeri personel.işveren alanına yazılır) ya da (b) OSGB'nin gerçekten
// FARKLI müşterileri (kullanıcı reddederse eski tek-grup-seçme akışına döner).

function _egitimGecmisiAyristir(metin) {
  const sonuc = [];
  const regex = /([^|]+?)\s*\((\d{2}\.\d{2}\.\d{4})\)/g;
  let e;
  while ((e = regex.exec(metin || '')) !== null) {
    sonuc.push({ ad: e[1].trim(), tarih: excelTarihiNormallestir(e[2].trim()) });
  }
  return sonuc;
}

// "MYK" sütunu Eğitim Geçmişi'nden daha düzensiz: tarih bazen "Ad (GG.AA.YYYY)"
// biçiminde parantez içinde, bazen parantez dışında bir tireyle ("Ad -GG.AA.YYYY ()"),
// bazen de hiç yok. Önce parantez içindeki tarihi dener, yoksa metnin herhangi
// bir yerindeki GG.AA.YYYY'yi arar; hiç tarih yoksa (gerçekten tarihsiz bir
// kayıt) atlanır ve sayılır.
function _mykGecmisiAyristir(metin) {
  const sonuc = [];
  let atlanan = 0;
  (metin || '').split('|').forEach(parca => {
    const p = parca.trim();
    if (!p) return;
    const parantezli = p.match(/^(.*?)\s*\((\d{2}\.\d{2}\.\d{4})\)\s*$/);
    let ad, tarihStr;
    if (parantezli) {
      ad = parantezli[1].trim();
      tarihStr = parantezli[2];
    } else {
      const tarihEslesme = p.match(/\d{2}\.\d{2}\.\d{4}/);
      if (!tarihEslesme) { atlanan++; return; }
      tarihStr = tarihEslesme[0];
      ad = p.replace(tarihStr, '').replace(/[()\-]/g, ' ').trim();
    }
    ad = ad.replace(/\(\s*\)/g, '').trim() || 'MYK';
    sonuc.push({ ad, tarih: excelTarihiNormallestir(tarihStr) });
  });
  return { kayitlar: sonuc, atlanan };
}

// XLSX'in ham sayfasını başlık satırına göre nesne dizisine çevirir (SheetJS
// sheet_to_json esasen aynı işi yapar; excelIceAktar'ın aksine burada
// modül kolonlarına eşlemeden, TÜM başlıkları olduğu gibi okumamız gerekiyor
// çünkü bu dosyanın gerçek verisi tek bir "Eğitim Geçmişi" sütununda).
function _eskiEgitimMatrisiSatirlariniOku(dosya, callback) {
  xlsxHazirOlduğunda(() => {
    const okuyucu = new FileReader();
    okuyucu.onload = ev => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'array' });
        const sayfa = wb.Sheets[wb.SheetNames[0]];
        const satirlar = XLSX.utils.sheet_to_json(sayfa, { defval: '' });
        callback(satirlar, null);
      } catch (err) {
        callback(null, 'Dosya okunamadı. Geçerli bir Excel (.xlsx) dosyası seçtiğinizden emin olun.');
      }
    };
    okuyucu.onerror = () => callback(null, 'Dosya okunamadı.');
    okuyucu.readAsArrayBuffer(dosya);
  });
}

async function _eskiEgitimMatrisiIceAktar(dosya) {
  _eskiEgitimMatrisiSatirlariniOku(dosya, async (satirlarHam, hataMesaji) => {
    if (hataMesaji) { alert(hataMesaji); return; }
    if (!satirlarHam.length) { alert('Dosyada okunacak satır bulunamadı.'); return; }

    const grupSutunu = Object.keys(satirlarHam[0]).find(k => _basligiNormallestir(k) === _basligiNormallestir('Grup'));
    const gecmisSutunu = Object.keys(satirlarHam[0]).find(k => _basligiNormallestir(k) === _basligiNormallestir('Eğitim Geçmişi'));
    const mykSutunu = Object.keys(satirlarHam[0]).find(k => _basligiNormallestir(k) === _basligiNormallestir('MYK'));
    const ilkYardimSutunu = Object.keys(satirlarHam[0]).find(k => _basligiNormallestir(k) === _basligiNormallestir('İlkyardım'));
    const forkliftSutunu = Object.keys(satirlarHam[0]).find(k => _basligiNormallestir(k) === _basligiNormallestir('Forklift'));
    const isMakSutunu = Object.keys(satirlarHam[0]).find(k => _basligiNormallestir(k) === _basligiNormallestir('İş Mak.'));
    if (!gecmisSutunu) { alert('Tanınmayan dosya biçimi: "Eğitim Geçmişi" sütunu bulunamadı.'); return; }

    const gruplar = grupSutunu ? Array.from(new Set(satirlarHam.map(s => String(s[grupSutunu] || '').trim()).filter(Boolean))) : [];

    // Birden fazla Grup varsa: varsayılan olarak HEPSİ aktif firmaya aktarılır
    // ve Grup değeri her personelin İşveren alanına yazılır (BAĞFAŞ'ın 3
    // sicili gibi -- bkz. dosya başındaki not). Kullanıcı bunun yerine eskisi
    // gibi TEK bir grubu (farklı bir OSGB müşterisi gibi) ayrı aktarmak
    // isterse reddedebilir.
    let seciliGrup = '';
    let isverenModu = false;
    let satirlar = satirlarHam;
    if (gruplar.length > 1) {
      isverenModu = confirm(
        `Dosyada ${gruplar.length} farklı "Grup" değeri var:\n${gruplar.join(', ')}\n\n` +
        `Bunlar aynı firmanın farklı işverenleri/sicilleri ise (ör. BAĞFAŞ'ın 3 sicili) "Tamam" deyin: ` +
        `TÜM satırlar aktif firma "${_aktifFirma ? _aktifFirma.ad : '?'}" içine aktarılır, Grup değeri her personelin İşveren alanına yazılır.\n\n` +
        `Bunun yerine SADECE BİR grubu (farklı bir OSGB müşterisi gibi) aktarmak isterseniz "İptal" deyin.`
      );
      if (!isverenModu) {
        const varsayilan = (_aktifFirma && gruplar.find(g => _basligiNormallestir(g) === _basligiNormallestir(_aktifFirma.ad))) || gruplar[0];
        const girdi = prompt(
          `Aktarılacak grubun adını (aşağıdaki gibi) yazın:\n\n${gruplar.map((g, i) => `${i + 1}. ${g}`).join('\n')}`,
          varsayilan
        );
        if (girdi === null) return;
        seciliGrup = gruplar.find(g => _basligiNormallestir(g) === _basligiNormallestir(girdi.trim()));
        if (!seciliGrup) { alert('Bu isimde bir grup bulunamadı. İşlem iptal edildi.'); return; }
        satirlar = satirlarHam.filter(s => String(s[grupSutunu] || '').trim() === seciliGrup);
      }
    } else if (gruplar.length === 1) {
      seciliGrup = gruplar[0];
    }
    if (!satirlar.length) { alert('Seçili grup için satır bulunamadı.'); return; }

    const ozetBaslik = isverenModu ? `${gruplar.length} grup (İşveren etiketi olarak)` : (seciliGrup || 'Tüm satırlar');
    if (!confirm(`"${ozetBaslik}" için ${satirlar.length} personel satırı, aktif firma "${_aktifFirma ? _aktifFirma.ad : '?'}" içine aktarılacak. Devam edilsin mi?`)) return;

    const dugme = document.getElementById('eskiMatrisIceAktarBtn');
    const eskiMetin = dugme.textContent;
    dugme.disabled = true;
    dugme.textContent = 'İçe aktarılıyor...';

    try {
      const sicilSutunu = Object.keys(satirlarHam[0]).find(k => _basligiNormallestir(k) === _basligiNormallestir('Sicil'));
      const adSutunu = Object.keys(satirlarHam[0]).find(k => _basligiNormallestir(k) === _basligiNormallestir('Ad Soyad'));
      const girisSutunu = Object.keys(satirlarHam[0]).find(k => _basligiNormallestir(k) === _basligiNormallestir('İşbaşı Tarihi'));
      const cikisSutunu = Object.keys(satirlarHam[0]).find(k => _basligiNormallestir(k) === _basligiNormallestir('İşten Çıkış Tarihi'));

      // ---- 1) Eksik personelleri tek seferde oluştur (Grup -> İşveren) ----
      const mevcutPersoneller = personelleriGetir('', false).concat(personelleriGetir('', true));
      const yeniPersonelVerileri = [];
      const yeniPersonelSicilleri = new Set();
      satirlar.forEach(satir => {
        const sicilNo = String(satir[sicilSutunu] || '').trim();
        if (!sicilNo || yeniPersonelSicilleri.has(sicilNo)) return;
        if (mevcutPersoneller.some(p => p.sicilNo === sicilNo)) return;
        yeniPersonelSicilleri.add(sicilNo);
        yeniPersonelVerileri.push({
          sicilNo,
          adSoyad: String(satir[adSutunu] || '').trim() || sicilNo,
          bolum: 'Belirtilmemiş',
          gorev: 'Belirtilmemiş',
          iseGirisTarihi: excelTarihiNormallestir(satir[girisSutunu]) || new Date().toISOString().slice(0, 10),
          istenCikisTarihi: excelTarihiNormallestir(satir[cikisSutunu]),
          isveren: grupSutunu ? String(satir[grupSutunu] || '').trim() : ''
        });
      });
      const personelSonuc = yeniPersonelVerileri.length
        ? await personelTopluEkle(yeniPersonelVerileri)
        : { basarili: 0, basarisizSayisi: 0, hatalar: [], bulutBasarili: true, kayitlar: [] };
      if (!personelSonuc.bulutBasarili) {
        alert('Personel kayıtları buluta yazılamadı, içe aktarım durduruldu:\n' + personelSonuc.hatalar.join('\n'));
        return;
      }

      // ---- 1b) Var olan ama İşveren alanı boş personeli, dosyadaki Grup
      // değeriyle güncelle (yeni oluşturulanlar zaten yukarıda alıyor).
      if (grupSutunu) {
        const guncellenenIdler = new Set();
        satirlar.forEach(satir => {
          const sicilNo = String(satir[sicilSutunu] || '').trim();
          if (!sicilNo) return;
          const mevcutP = mevcutPersoneller.find(p => p.sicilNo === sicilNo);
          const grupDegeri = String(satir[grupSutunu] || '').trim();
          if (mevcutP && !mevcutP.isveren && grupDegeri && !guncellenenIdler.has(mevcutP.id)) {
            guncellenenIdler.add(mevcutP.id);
            personelGuncelle(mevcutP.id, Object.assign({}, mevcutP, { isveren: grupDegeri }));
          }
        });
      }

      // ---- 2) Eğitim Geçmişi / MYK / İlkyardım'ı ayrıştırıp kayıt listesi oluştur ----
      // Eski sistemde "Eğitim Geçmişi" sütunu sadece kataloğa uyan eğitim/
      // sertifikaları değil, kişiye özel diploma benzeri kayıtları da AYNI
      // "Ad (Tarih)" biçiminde içerebiliyordu. Kataloğa (EGITIM_TURLERI) isim
      // olarak uymayan her girdi, adı "Açıklama" alanında saklanan bir MYK
      // Belgesi kaydı olarak içe aktarılır. Ayrıca eski uygulamada AYRI
      // tutulan "MYK" ve "İlkyardım" sütunları da burada aynı şekilde işlenir.
      const tumPersoneller = personelleriGetir('', false).concat(personelleriGetir('', true));
      let mykOlarakEklenenSayisi = 0;
      let mykAtlananSayisi = 0;
      let ilkYardimSayisi = 0;
      let forkliftVarAmaTarihsiz = 0;
      let isMakVarAmaTarihsiz = 0;
      const personelBulunamayan = [];
      const egitimVerileri = [];

      satirlar.forEach(satir => {
        const sicilNo = String(satir[sicilSutunu] || '').trim();
        if (!sicilNo) return;
        const personel = tumPersoneller.find(p => p.sicilNo === sicilNo);
        if (!personel) { personelBulunamayan.push(sicilNo); return; }

        const gecmis = _egitimGecmisiAyristir(satir[gecmisSutunu]);
        gecmis.forEach(g => {
          if (!g.tarih) return;
          const tur = egitimTurleriTumu().find(t => _basligiNormallestir(t.ad) === _basligiNormallestir(g.ad));
          if (tur) {
            egitimVerileri.push({
              personelId: personel.id,
              egitimTuruId: tur.id,
              tarih: g.tarih,
              // Eski sistemde 2 günlü eğitimler (Temel İSG) tek tarih olarak
              // tutuluyordu; ikinci gün bilinmediği için aynı tarih kullanılır.
              tarih2: tur.ikiGunluMu ? g.tarih : '',
              saat: ''
            });
          } else {
            mykOlarakEklenenSayisi++;
            egitimVerileri.push({
              personelId: personel.id,
              egitimTuruId: 'myk',
              tarih: g.tarih,
              tarih2: '',
              saat: '',
              aciklama: g.ad,
              // Bazı MYK belgeleri (ör. "...(Süresiz-03.04.2026)") süresizdir;
              // parantez içindeki tarih bu durumda bir bitiş değil, sadece
              // düzenlenme tarihidir -- belge adında "süresiz" geçiyorsa
              // bitiş tarihi hesaplamasına dahil edilmez.
              suresizMi: /süresiz/i.test(g.ad)
            });
          }
        });

        // "MYK" sütunu -- eski uygulamada Eğitim Geçmişi'nden AYRI tutulan
        // kişiye özel meslek belgeleri listesi (bkz. dosya başı notu).
        if (mykSutunu && satir[mykSutunu]) {
          const { kayitlar, atlanan } = _mykGecmisiAyristir(satir[mykSutunu]);
          mykAtlananSayisi += atlanan;
          kayitlar.forEach(g => {
            if (!g.tarih) { mykAtlananSayisi++; return; }
            mykOlarakEklenenSayisi++;
            egitimVerileri.push({
              personelId: personel.id,
              egitimTuruId: 'myk',
              tarih: g.tarih,
              tarih2: '',
              saat: '',
              aciklama: g.ad,
              suresizMi: /süresiz/i.test(g.ad)
            });
          });
        }

        // "İlkyardım" sütunu -- tek bir geçerlilik tarihi ya da "Yok".
        if (ilkYardimSutunu) {
          const deger = String(satir[ilkYardimSutunu] || '').trim();
          if (deger && _basligiNormallestir(deger) !== _basligiNormallestir('Yok')) {
            const tarih = excelTarihiNormallestir(deger);
            if (tarih) {
              ilkYardimSayisi++;
              egitimVerileri.push({
                personelId: personel.id,
                egitimTuruId: 'ilkyardim',
                tarih,
                tarih2: '',
                saat: ''
              });
            }
          }
        }

        // "Forklift"/"İş Mak." -- eski uygulamada tarihsiz VAR/YOK olarak
        // tutuluyor; risk360'ta bu belgeler için geçerlilik tarihi zorunlu
        // olduğundan otomatik aktarılamaz, sadece sayılıp bildirilir.
        if (forkliftSutunu && _basligiNormallestir(String(satir[forkliftSutunu] || '')) === _basligiNormallestir('VAR')) forkliftVarAmaTarihsiz++;
        if (isMakSutunu && _basligiNormallestir(String(satir[isMakSutunu] || '')) === _basligiNormallestir('VAR')) isMakVarAmaTarihsiz++;
      });

      const egitimSonuc = egitimVerileri.length
        ? await egitimKayitlariTopluEkle(egitimVerileri)
        : { basarili: 0, basarisizSayisi: 0, hatalar: [], yinelenenSayisi: 0, bulutBasarili: true };

      let mesaj = `${personelSonuc.basarili} yeni personel oluşturuldu (bölüm/görev bilgisi dosyada olmadığı için "Belirtilmemiş" ile eklendi, gerekirse düzenleyin).\n`;
      mesaj += `${egitimSonuc.basarili} eğitim/sertifika/MYK belgesi kaydı içe aktarıldı`;
      if (mykOlarakEklenenSayisi > 0) mesaj += ` (bunlardan ${mykOlarakEklenenSayisi} tanesi MYK Belgesi olarak, belge adı Açıklama alanına yazılarak eklendi)`;
      if (ilkYardimSayisi > 0) mesaj += `, ${ilkYardimSayisi} İlkyardım Sertifikası kaydı eklendi`;
      mesaj += '.';
      if (mykAtlananSayisi > 0) mesaj += `\n${mykAtlananSayisi} MYK kaydında tarih okunamadığı için atlandı, bunları elle girmeniz gerekir.`;
      if (forkliftVarAmaTarihsiz > 0) mesaj += `\n${forkliftVarAmaTarihsiz} kişide Forklift belgesi VAR yazıyor ama eski uygulamada tarih tutulmadığı için aktarılamadı, elle giriniz.`;
      if (isMakVarAmaTarihsiz > 0) mesaj += `\n${isMakVarAmaTarihsiz} kişide İş Makinesi belgesi VAR yazıyor ama eski uygulamada tarih tutulmadığı için aktarılamadı, elle giriniz.`;
      if (egitimSonuc.yinelenenSayisi > 0) mesaj += `\n${egitimSonuc.yinelenenSayisi} kayıt zaten mevcut olduğu için atlandı.`;
      if (personelBulunamayan.length) mesaj += `\n${personelBulunamayan.length} satırda personel oluşturulamadı, eğitim kayıtları atlandı.`;
      if (egitimSonuc.basarisizSayisi > 0) mesaj += `\n${egitimSonuc.basarisizSayisi} kayıt eklenemedi:\n` + egitimSonuc.hatalar.slice(0, 10).join('\n');
      if (!egitimSonuc.bulutBasarili) mesaj += '\nUYARI: Eğitim kayıtları buluta yazılamadı.';
      alert(mesaj);

      personelSecimleriniDoldur();
      kayitTablosunuCiz(document.getElementById('aramaKutusu').value);
    } catch (hata) {
      console.error(hata);
      alert('İçe aktarım sırasında beklenmeyen bir hata oluştu: ' + (hata.message || hata));
    } finally {
      dugme.disabled = false;
      dugme.textContent = eskiMetin;
    }
  });
}

// ==================== TOPLU EĞİTİM GİRİŞİ ====================
// Kullanıcı isteği: "bir eğitimi 10 kişi katılmış mesela hepsini birlikte
// seçip aynı tarih saat ile kayıt yapabilmeliyim" — tek bir tür/tarih/saat
// için birden fazla personeli tek seferde (tek bulut yazımıyla) kaydeder.

function topluTurAlanlariniGuncelle() {
  const tur = egitimTuruGetir(document.getElementById('topluTuruId').value);
  document.getElementById('topluTarihEtiket').textContent = tur && tur.hesaplama === 'dogrudan'
    ? 'Son Geçerlilik Tarihi'
    : (tur && tur.ikiGunluMu ? '1. Gün Tarihi' : 'Eğitim Tarihi');
  document.getElementById('topluSaatSatiri').style.display = tur && tur.saatliMi ? '' : 'none';
  document.getElementById('topluTarih2Satiri').style.display = tur && tur.ikiGunluMu ? '' : 'none';
  document.getElementById('topluAciklamaSatiri').style.display = tur && tur.belgeAdiVarMi ? '' : 'none';
}

// "kolay olmalı girişler" -- arama kutusuyla filtrelenen, tıklanabilir
// (sadece minik kutucuk değil) bir onay listesi; seçim modal kapanana kadar
// hafızada tutulur, arama filtresi değişse de kaybolmaz.
function _topluPersonelListesiCiz(aramaMetni) {
  const kutu = document.getElementById('topluPersonelListesi');
  const kucuk = (aramaMetni || '').trim().toLocaleLowerCase('tr-TR');
  const personeller = _personelSirali().filter(p =>
    !kucuk || p.adSoyad.toLocaleLowerCase('tr-TR').includes(kucuk) || p.sicilNo.toLowerCase().includes(kucuk)
  );

  if (!personeller.length) {
    kutu.innerHTML = '<div style="font-size:12px; color:var(--metin-soluk); padding:6px;">Eşleşen personel bulunamadı.</div>';
  } else {
    kutu.innerHTML = personeller.map(p => `
      <label style="display:flex; align-items:center; gap:8px; padding:4px 2px; cursor:pointer;">
        <input type="checkbox" data-toplu-personel="${p.id}" style="width:auto;" ${_topluSeciliPersonelIdleri.has(p.id) ? 'checked' : ''}>
        <span>${p.adSoyad} (${p.sicilNo})${p.isveren ? ' — ' + p.isveren : ''}</span>
      </label>
    `).join('');
    kutu.querySelectorAll('[data-toplu-personel]').forEach(kutucuk => {
      kutucuk.addEventListener('change', () => {
        const id = kutucuk.getAttribute('data-toplu-personel');
        if (kutucuk.checked) _topluSeciliPersonelIdleri.add(id);
        else _topluSeciliPersonelIdleri.delete(id);
        _topluSeciliSayisiGuncelle(personeller);
      });
    });
  }
  _topluSeciliSayisiGuncelle(personeller);
}

function _topluSeciliSayisiGuncelle(gorunenler) {
  document.getElementById('topluSeciliSayisi').textContent = `${_topluSeciliPersonelIdleri.size} kişi seçildi`;
  const tumunuSec = document.getElementById('topluTumunuSecCheckbox');
  const gorunenSecili = gorunenler.length > 0 && gorunenler.every(p => _topluSeciliPersonelIdleri.has(p.id));
  tumunuSec.checked = gorunenSecili;
  tumunuSec.indeterminate = !gorunenSecili && gorunenler.some(p => _topluSeciliPersonelIdleri.has(p.id));
}

function topluModalAc() {
  _topluSeciliPersonelIdleri.clear();
  document.getElementById('topluForm').reset();
  document.getElementById('topluTuruId').innerHTML = egitimTurleriTumu().map(t => `<option value="${t.id}">${t.ad}</option>`).join('');
  topluTurAlanlariniGuncelle();
  document.getElementById('topluPersonelArama').value = '';
  _topluPersonelListesiCiz('');
  document.getElementById('topluModal').classList.add('acik');
}

function topluModalKapat() {
  document.getElementById('topluModal').classList.remove('acik');
}

async function topluFormGonderildi(e) {
  e.preventDefault();
  const turuId = document.getElementById('topluTuruId').value;
  const tur = egitimTuruGetir(turuId);
  const tarih = document.getElementById('topluTarih').value;
  const tarih2 = document.getElementById('topluTarih2').value;
  const saat = document.getElementById('topluSaat').value;
  const aciklama = document.getElementById('topluAciklama').value;

  if (!tarih) { alert('Tarih zorunludur.'); return; }
  if (tur && tur.ikiGunluMu && !tarih2) { alert('2. gün tarihi zorunludur.'); return; }
  if (!_topluSeciliPersonelIdleri.size) { alert('En az bir personel seçin.'); return; }

  const veriler = Array.from(_topluSeciliPersonelIdleri).map(personelId => ({
    personelId,
    egitimTuruId: turuId,
    tarih,
    tarih2: tur && tur.ikiGunluMu ? tarih2 : '',
    saat,
    aciklama,
    suresizMi: false
  }));

  const dugme = document.querySelector('#topluForm button[type="submit"]');
  dugme.disabled = true;
  try {
    const sonuc = await egitimKayitlariTopluEkle(veriler);
    let mesaj = `${sonuc.basarili} kayıt eklendi.`;
    if (sonuc.yinelenenSayisi > 0) mesaj += `\n${sonuc.yinelenenSayisi} kayıt zaten mevcut olduğu için atlandı.`;
    if (sonuc.basarisizSayisi > 0) mesaj += `\n${sonuc.basarisizSayisi} kayıt eklenemedi:\n` + sonuc.hatalar.slice(0, 10).join('\n');
    if (!sonuc.bulutBasarili) mesaj += '\nUYARI: Kayıtlar buluta yazılamadı.';
    alert(mesaj);
    topluModalKapat();
    kayitTablosunuCiz(document.getElementById('aramaKutusu').value);
  } catch (hata) {
    console.error(hata);
    alert('Toplu kayıt sırasında beklenmeyen bir hata oluştu: ' + (hata.message || hata));
  } finally {
    dugme.disabled = false;
  }
}

// ==================== EĞİTİM TÜRLERİNİ YÖNET ====================
// Kullanıcı isteği: "yeni eğitim türü de ekleyebilmem lazım" — standart
// kataloğa (EGITIM_TURLERI) ek olarak firmaya özel tür tanımlar
// (firma.ozelEgitimTurleri, bkz. core/tenant.js).

function _ozelTurListesiCiz() {
  const kutu = document.getElementById('ozelTurListesi');
  const liste = _aktifFirma && Array.isArray(_aktifFirma.ozelEgitimTurleri) ? _aktifFirma.ozelEgitimTurleri : [];
  if (!liste.length) {
    kutu.innerHTML = '<div style="font-size:12px; color:var(--metin-soluk);">Henüz özel eğitim türü tanımlanmadı.</div>';
    return;
  }
  kutu.innerHTML = liste.map(t => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:5px 0; border-bottom:1px solid var(--kenarlik);">
      <span>${t.ad} <span style="color:var(--metin-soluk); font-size:12px;">(${t.yil} yıl geçerli)</span></span>
      <button type="button" class="tablo-buton sil" data-ozel-tur-sil="${t.id}">Sil</button>
    </div>
  `).join('');
  kutu.querySelectorAll('[data-ozel-tur-sil]').forEach(btn => btn.addEventListener('click', () => {
    if (!confirm('Bu eğitim türünü listeden kaldırmak istediğinize emin misiniz? (Bu türle daha önce girilmiş kayıtlar etkilenmez.)')) return;
    const sonuc = firmaOzelEgitimTuruSil(_aktifFirma.id, btn.getAttribute('data-ozel-tur-sil'));
    if (sonuc.basarili) {
      _aktifFirma = sonuc.firma;
      egitimTurleriniAyarla(_aktifFirma);
      _ozelTurListesiCiz();
      turSecimleriniDoldur();
    }
  }));
}

function turYonetModalAc() {
  _ozelTurListesiCiz();
  document.getElementById('yeniTurAdi').value = '';
  document.getElementById('yeniTurYil').value = '1';
  document.getElementById('turYonetModal').classList.add('acik');
}

function turYonetModalKapat() {
  document.getElementById('turYonetModal').classList.remove('acik');
}

function egitimSayfasiniBaslat(firma) {
  _aktifFirma = firma;
  egitimTurleriniAyarla(_aktifFirma);

  document.getElementById('yeniKayitBtn').addEventListener('click', () => modalAc());
  document.getElementById('modalKapatBtn').addEventListener('click', modalKapat);
  document.getElementById('modalIptalBtn').addEventListener('click', modalKapat);
  document.getElementById('egitimForm').addEventListener('submit', formGonderildi);
  document.getElementById('aramaKutusu').addEventListener('input', e => kayitTablosunuCiz(e.target.value));
  document.getElementById('egitimTuruId').addEventListener('change', turAlanlariniGuncelle);
  document.getElementById('suresizMi').addEventListener('change', turAlanlariniGuncelle);
  document.getElementById('sekmeKayitlar').addEventListener('click', () => gorunumDegistir('kayitlar'));
  document.getElementById('sekmeDurum').addEventListener('click', () => gorunumDegistir('durum'));

  document.getElementById('sertTehlikeSinifi').addEventListener('change', _sertifikaSureOnizlemesiGuncelle);
  document.getElementById('sertEgitimTuru').addEventListener('change', _sertifikaSureOnizlemesiGuncelle);
  document.getElementById('sertAyarIptalBtn').addEventListener('click', sertifikaAyarModalKapat);
  document.getElementById('sertAyarKapatBtn').addEventListener('click', sertifikaAyarModalKapat);
  document.getElementById('sertAyarOlusturBtn').addEventListener('click', async () => {
    const id = _sertifikaKayitId;
    if (!id) return;
    const secim = {
      tehlikeSinifi: document.getElementById('sertTehlikeSinifi').value,
      ilkTekrar: document.getElementById('sertEgitimTuru').value
    };
    const btn = document.getElementById('sertAyarOlusturBtn');
    btn.disabled = true;
    try {
      await egitimSertifikasiOlustur(id, secim);
      sertifikaAyarModalKapat();
    } catch (hata) {
      console.error(hata);
      alert('Sertifika oluşturulamadı: ' + (hata.message || hata));
    } finally {
      btn.disabled = false;
    }
  });

  document.getElementById('tumunuSecCheckbox').addEventListener('change', e => {
    const gorunenler = egitimKayitlariniGetir(document.getElementById('aramaKutusu').value, _aktifFirma);
    if (e.target.checked) gorunenler.forEach(k => _seciliKayitIdleri.add(k.id));
    else gorunenler.forEach(k => _seciliKayitIdleri.delete(k.id));
    kayitTablosunuCiz(document.getElementById('aramaKutusu').value);
  });

  document.getElementById('topluSilBtn').addEventListener('click', () => {
    const sayi = _seciliKayitIdleri.size;
    if (!sayi) return;
    if (!confirm(`Seçili ${sayi} eğitim/sertifika kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) return;
    _seciliKayitIdleri.forEach(id => egitimKaydiSil(id));
    _seciliKayitIdleri.clear();
    kayitTablosunuCiz(document.getElementById('aramaKutusu').value);
  });

  document.getElementById('sablonIndirBtn').addEventListener('click', () => {
    excelSablonIndir(EGITIM_IMPORT_KOLONLARI, 'egitim_sablonu.xlsx');
  });
  document.getElementById('disaAktarBtn').addEventListener('click', () => {
    excelDisaAktar(egitimKayitlariniGetir('', _aktifFirma), EGITIM_EXPORT_KOLONLARI, 'egitim_kayitlari.xlsx');
  });
  document.getElementById('iceAktarBtn').addEventListener('click', () => {
    document.getElementById('iceAktarDosya').click();
  });
  document.getElementById('iceAktarDosya').addEventListener('change', e => {
    const dosya = e.target.files[0];
    excelIceAktar(dosya, EGITIM_IMPORT_KOLONLARI, (satirlar, hataMesaji) => {
      e.target.value = '';
      if (hataMesaji) { alert(hataMesaji); return; }
      const sonuc = excelToplulIceAktarSonucOzetle(satirlar, _egitimIceAktarSatiriEkle);
      alert(excelIceAktarOzetMesaji(sonuc));
      kayitTablosunuCiz(document.getElementById('aramaKutusu').value);
    });
  });

  document.getElementById('mykBelgeEkleBtn').addEventListener('click', () => mykKaydiModalAc());
  document.getElementById('mykRaporuBtn').addEventListener('click', async () => {
    const dugme = document.getElementById('mykRaporuBtn');
    const eskiMetin = dugme.textContent;
    dugme.disabled = true;
    dugme.textContent = 'Hazırlanıyor...';
    try {
      await egitimMykRaporuPdfOlustur();
    } catch (hata) {
      console.error(hata);
      alert('Rapor üretilemedi: ' + (hata.message || hata));
    } finally {
      dugme.disabled = false;
      dugme.textContent = eskiMetin;
    }
  });

  document.getElementById('eskiMatrisIceAktarBtn').addEventListener('click', () => document.getElementById('eskiMatrisIceAktarDosya').click());
  document.getElementById('eskiMatrisIceAktarDosya').addEventListener('change', e => {
    const dosya = e.target.files[0];
    e.target.value = '';
    if (dosya) _eskiEgitimMatrisiIceAktar(dosya);
  });

  document.getElementById('personelAramaKutusu').addEventListener('input', e => {
    personelSecimleriniDoldur(e.target.value, document.getElementById('personelId').value);
  });

  document.getElementById('topluGirisBtn').addEventListener('click', () => topluModalAc());
  document.getElementById('topluIptalBtn').addEventListener('click', topluModalKapat);
  document.getElementById('topluKapatBtn').addEventListener('click', topluModalKapat);
  document.getElementById('topluForm').addEventListener('submit', topluFormGonderildi);
  document.getElementById('topluTuruId').addEventListener('change', topluTurAlanlariniGuncelle);
  document.getElementById('topluPersonelArama').addEventListener('input', e => _topluPersonelListesiCiz(e.target.value));
  document.getElementById('topluTumunuSecCheckbox').addEventListener('change', e => {
    const kucuk = (document.getElementById('topluPersonelArama').value || '').trim().toLocaleLowerCase('tr-TR');
    const gorunenler = _personelSirali().filter(p =>
      !kucuk || p.adSoyad.toLocaleLowerCase('tr-TR').includes(kucuk) || p.sicilNo.toLowerCase().includes(kucuk)
    );
    if (e.target.checked) gorunenler.forEach(p => _topluSeciliPersonelIdleri.add(p.id));
    else gorunenler.forEach(p => _topluSeciliPersonelIdleri.delete(p.id));
    _topluPersonelListesiCiz(document.getElementById('topluPersonelArama').value);
  });

  document.getElementById('turYonetBtn').addEventListener('click', () => turYonetModalAc());
  document.getElementById('turYonetKapatBtn').addEventListener('click', turYonetModalKapat);
  document.getElementById('turEkleBtn').addEventListener('click', () => {
    const sonuc = firmaOzelEgitimTuruEkle(_aktifFirma.id, document.getElementById('yeniTurAdi').value, document.getElementById('yeniTurYil').value);
    if (!sonuc.basarili) { alert(sonuc.hata); return; }
    _aktifFirma = sonuc.firma;
    egitimTurleriniAyarla(_aktifFirma);
    document.getElementById('yeniTurAdi').value = '';
    document.getElementById('yeniTurYil').value = '1';
    _ozelTurListesiCiz();
    turSecimleriniDoldur();
  });

  personelSecimleriniDoldur();
  turSecimleriniDoldur();
  gorunumDegistir('kayitlar');
}

function gorunumDegistir(gorunum) {
  _egitimGorunum = gorunum;
  document.getElementById('sekmeKayitlar').classList.toggle('sekme-seciliDegil', gorunum !== 'kayitlar');
  document.getElementById('sekmeDurum').classList.toggle('sekme-seciliDegil', gorunum !== 'durum');
  document.getElementById('kayitlarBolumu').style.display = gorunum === 'kayitlar' ? '' : 'none';
  document.getElementById('durumBolumu').style.display = gorunum === 'durum' ? '' : 'none';

  if (gorunum === 'kayitlar') {
    kayitTablosunuCiz(document.getElementById('aramaKutusu').value);
  } else {
    durumTablosunuCiz();
  }
}

// Personel listesi her yerde alfabetik (kullanıcı isteği: "personeller
// alfabitik sıraya göre dizilsin"); 260+ kayıtla arama olmadan bulmak zor
// olduğundan tek kayıt modalında da bir arama kutusu var (bkz. modalAc,
// _personelAramaKutusuFiltrele).
function _personelSirali() {
  return personelleriGetir('', false).sort((a, b) => a.adSoyad.localeCompare(b.adSoyad, 'tr-TR'));
}

function personelSecimleriniDoldur(aramaMetni, seciliId) {
  const secim = document.getElementById('personelId');
  const kucuk = (aramaMetni || '').trim().toLocaleLowerCase('tr-TR');
  const personeller = _personelSirali().filter(p =>
    !kucuk || p.adSoyad.toLocaleLowerCase('tr-TR').includes(kucuk) || p.sicilNo.toLowerCase().includes(kucuk)
  );
  secim.innerHTML = personeller.map(p => `<option value="${p.id}">${p.adSoyad} (${p.sicilNo})${p.isveren ? ' — ' + p.isveren : ''}</option>`).join('');
  if (seciliId && personeller.some(p => p.id === seciliId)) secim.value = seciliId;
}

function turSecimleriniDoldur() {
  const secim = document.getElementById('egitimTuruId');
  secim.innerHTML = egitimTurleriTumu().map(t => `<option value="${t.id}">${t.ad}</option>`).join('');
  turAlanlariniGuncelle();
}

function turAlanlariniGuncelle() {
  const tur = egitimTuruGetir(document.getElementById('egitimTuruId').value);
  const suresizMi = document.getElementById('suresizMi').checked;
  document.getElementById('tarihEtiket').textContent = tur && tur.hesaplama === 'dogrudan'
    ? (suresizMi ? 'Düzenlenme Tarihi (opsiyonel)' : 'Son Geçerlilik Tarihi')
    : (tur && tur.ikiGunluMu ? '1. Gün Tarihi' : 'Eğitim Tarihi');
  document.getElementById('saatSatiri').style.display = tur && tur.saatliMi ? '' : 'none';
  document.getElementById('tarih2Satiri').style.display = tur && tur.ikiGunluMu ? '' : 'none';
  document.getElementById('aciklamaSatiri').style.display = tur && tur.belgeAdiVarMi ? '' : 'none';
}

// Depoda normal olmayan bir değer varsa (ör. eski/bozuk bir kayıtta tam zaman
// damgası saklanmışsa) bile tabloda her zaman sade "GG.AA.YYYY" gösterir.
function _egitimTarihGoruntu(deger) {
  if (!deger) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(deger)) return gunAyYil(deger.slice(0, 10));
  const d = new Date(deger);
  return isNaN(d) ? deger : gunAyYil(d.toISOString().slice(0, 10));
}

function kayitTablosunuCiz(aramaMetni) {
  const govde = document.getElementById('tabloGovde');
  const bosDurum = document.getElementById('bosDurum');
  // Kullanıcı isteği: "eğitimler düzenlenme tarihine göre sıralansın" --
  // eğitimin kendi tarihi değil, kaydın oluşturulma/son düzenlenme zamanı
  // (en yeni en üstte); toplu girişte eklenen kayıtlar böylece bir arada görünür.
  const kayitlar = egitimKayitlariniGetir(aramaMetni, _aktifFirma)
    .sort((a, b) => (b.guncellemeTarihi || b.olusturmaTarihi || '').localeCompare(a.guncellemeTarihi || a.olusturmaTarihi || ''));

  govde.innerHTML = '';

  if (kayitlar.length === 0) {
    bosDurum.classList.add('gorunur');
    bosDurum.textContent = aramaMetni
      ? 'Aramanızla eşleşen kayıt bulunamadı.'
      : 'Henüz eğitim/sertifika kaydı eklenmedi.';
    _topluSilDurumunuGuncelle([]);
    return;
  }
  bosDurum.classList.remove('gorunur');

  kayitlar.forEach(k => {
    const satir = document.createElement('tr');
    satir.innerHTML = `
      <td><input type="checkbox" class="satir-secim" data-secim="${k.id}" ${_seciliKayitIdleri.has(k.id) ? 'checked' : ''}></td>
      <td>${k.personelAdi}${k.personelIsveren ? ` <span style="font-size:11px; color:var(--metin-soluk);">(${k.personelIsveren})</span>` : ''}</td>
      <td>${k.turAdi}${k.aciklama ? ' — ' + k.aciklama : ''}</td>
      <td>${k.tarih2 ? _egitimTarihGoruntu(k.tarih) + ' - ' + _egitimTarihGoruntu(k.tarih2) : _egitimTarihGoruntu(k.tarih)}</td>
      <td>${k.saat || '-'}</td>
      <td>${k.bitisTarihi ? _egitimTarihGoruntu(k.bitisTarihi) : '-'}</td>
      <td><span class="durum-rozet durum-${k.durum}">${DURUM_METIN[k.durum]}</span></td>
      <td>
        <button class="tablo-buton" data-duzenle="${k.id}">Düzenle</button>
        <button class="tablo-buton" data-sertifika="${k.id}">Sertifika</button>
        <button class="tablo-buton sil" data-sil="${k.id}">Sil</button>
      </td>
    `;
    govde.appendChild(satir);
  });

  govde.querySelectorAll('[data-duzenle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const kayit = egitimKaydiIdIleGetirRepo(btn.getAttribute('data-duzenle'));
      if (kayit) modalAc(kayit);
    });
  });

  govde.querySelectorAll('[data-sertifika]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-sertifika');
      const kayit = egitimKaydiIdIleGetirRepo(id);
      if (kayit && kayit.egitimTuruId === 'temel_isg') {
        sertifikaAyarModalAc(id);
        return;
      }
      btn.disabled = true;
      try { await egitimSertifikasiOlustur(id); }
      catch (hata) { console.error(hata); alert('Sertifika oluşturulamadı: ' + (hata.message || hata)); }
      finally { btn.disabled = false; }
    });
  });

  govde.querySelectorAll('[data-sil]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Bu kaydı silmek istediğinize emin misiniz?')) {
        const id = btn.getAttribute('data-sil');
        egitimKaydiSil(id);
        _seciliKayitIdleri.delete(id);
        kayitTablosunuCiz(document.getElementById('aramaKutusu').value);
      }
    });
  });

  govde.querySelectorAll('[data-secim]').forEach(kutu => {
    kutu.addEventListener('change', () => {
      const id = kutu.getAttribute('data-secim');
      if (kutu.checked) _seciliKayitIdleri.add(id);
      else _seciliKayitIdleri.delete(id);
      _topluSilDurumunuGuncelle(kayitlar);
    });
  });

  _topluSilDurumunuGuncelle(kayitlar);
}

function _topluSilDurumunuGuncelle(gorunenler) {
  const buton = document.getElementById('topluSilBtn');
  const sayi = _seciliKayitIdleri.size;
  buton.style.display = sayi ? '' : 'none';
  buton.textContent = `Seçilenleri Sil (${sayi})`;

  const tumunuSec = document.getElementById('tumunuSecCheckbox');
  const gorunenSecili = gorunenler.length > 0 && gorunenler.every(k => _seciliKayitIdleri.has(k.id));
  tumunuSec.checked = gorunenSecili;
  tumunuSec.indeterminate = !gorunenSecili && gorunenler.some(k => _seciliKayitIdleri.has(k.id));
}

function durumTablosunuCiz() {
  const kutu = document.getElementById('durumTablosuKutusu');
  const satirlar = egitimDurumTablosuOlustur(_aktifFirma);

  if (satirlar.length === 0) {
    kutu.innerHTML = '<div class="bos-durum gorunur">Durum tablosu için aktif personel bulunamadı.</div>';
    return;
  }

  const basliklar = egitimTurleriTumu().map(t => `<th>${t.ad}</th>`).join('');
  const govde = satirlar.map(satir => `
    <tr>
      <td>${satir.personelAdi}${satir.personelIsveren ? ` <span style="font-size:11px; color:var(--metin-soluk);">(${satir.personelIsveren})</span>` : ''}</td>
      ${satir.hucreler.map(h => `
        <td>
          <span class="durum-rozet durum-${h.durum}" title="${h.sonTarih ? 'Son: ' + _egitimTarihGoruntu(h.sonTarih) : ''}">${DURUM_METIN[h.durum]}</span>
        </td>
      `).join('')}
    </tr>
  `).join('');

  kutu.innerHTML = `
    <div class="tablo-scroll">
      <table class="veri-tablosu">
        <thead><tr><th>Personel</th>${basliklar}</tr></thead>
        <tbody>${govde}</tbody>
      </table>
    </div>
  `;
}

// MYK belgesi girişleri sık tekrarlandığı için ayrı bir hızlı giriş butonu:
// aynı modalı açar, sadece Eğitim/Sertifika Türü'nü doğrudan "MYK Belgesi"ne
// ayarlar (kullanıcı her seferinde dropdown'dan seçmek zorunda kalmaz).
function mykKaydiModalAc() {
  modalAc();
  document.getElementById('egitimTuruId').value = 'myk';
  turAlanlariniGuncelle();
}

function modalAc(kayit) {
  _duzenlenenKayitId = kayit ? kayit.id : null;
  document.getElementById('modalBaslik').textContent = kayit ? 'Eğitim/Sertifika Kaydını Düzenle' : 'Yeni Eğitim/Sertifika Kaydı';

  document.getElementById('personelAramaKutusu').value = '';
  personelSecimleriniDoldur('', kayit ? kayit.personelId : null);
  turSecimleriniDoldur();

  document.getElementById('personelId').value = kayit ? kayit.personelId : '';
  document.getElementById('egitimTuruId').value = kayit ? kayit.egitimTuruId : document.getElementById('egitimTuruId').value;
  document.getElementById('suresizMi').checked = kayit ? !!kayit.suresizMi : false;
  turAlanlariniGuncelle();

  document.getElementById('tarih').value = kayit ? kayit.tarih : '';
  document.getElementById('tarih2').value = kayit ? kayit.tarih2 : '';
  document.getElementById('saat').value = kayit ? kayit.saat : '';
  document.getElementById('aciklama').value = kayit ? (kayit.aciklama || '') : '';
  temizleFormHatalari();
  document.getElementById('modalKatman').classList.add('acik');
}

function modalKapat() {
  document.getElementById('modalKatman').classList.remove('acik');
  _duzenlenenKayitId = null;
}

function temizleFormHatalari() {
  document.querySelectorAll('#egitimForm .alan-hatasi').forEach(el => el.textContent = '');
}

function formGonderildi(e) {
  e.preventDefault();
  temizleFormHatalari();

  const veriler = {
    personelId: document.getElementById('personelId').value,
    egitimTuruId: document.getElementById('egitimTuruId').value,
    tarih: document.getElementById('tarih').value,
    tarih2: document.getElementById('tarih2').value,
    saat: document.getElementById('saat').value,
    aciklama: document.getElementById('aciklama').value,
    suresizMi: document.getElementById('suresizMi').checked
  };

  const sonuc = _duzenlenenKayitId ? egitimKaydiGuncelle(_duzenlenenKayitId, veriler) : egitimKaydiEkle(veriler);

  if (!sonuc.basarili) {
    Object.keys(sonuc.hatalar).forEach(alan => {
      const hataEl = document.getElementById(alan + 'Hata');
      if (hataEl) hataEl.textContent = sonuc.hatalar[alan];
    });
    return;
  }

  modalKapat();
  kayitTablosunuCiz(document.getElementById('aramaKutusu').value);
}
