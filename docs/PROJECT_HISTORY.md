# Proje geçmişi: adım adım ne yaptık?

Bu belge, konuşma sırasında yapılan teknik çalışmanın kronolojik kaydıdır. Takım arkadaşlarının ve depoyu inceleyen bir yapay zekânın “neden böyle?” sorusuna cevap vermeyi amaçlar.

## 1. Hedefi belirledik

Hedef, Chatterbox Multilingual V3 ile Türkçe bir metni kullanıcının kendi sesine benzer şekilde üretmekti. Bu bir model eğitimi veya fine-tuning çalışması değildir. **Zero-shot voice cloning** yapıldı: model, verilen kısa referans kayıttan konuşmacı özelliklerini çıkarıp yeni metinde kullanır.

## 2. Yerel makineyi kontrol ettik

Çalışma makinesi Apple M4, 10 çekirdek ve 16 GB birleşik belleğe sahip bir Mac'ti. Modelin bağımlılıkları açısından en sorunsuz sürüm olduğu ve upstream projenin test ettiği sürüm olduğu için Python 3.11 seçildi.

Python sanal ortamı `chatterbox-v3/.venv/` altında kuruldu. Bu sayede sistem Python'u ve başka projelerin paketleri değiştirilmedi.

## 3. Doğru Chatterbox sürümünü bulduk

İlk denemede PyPI'daki `chatterbox-tts` paketi kullanıldı. Kurulan o sürümde `t3_model="v3"` seçeneği bulunmadığı görüldü; dolayısıyla istenen Multilingual V3 modeli güvenilir şekilde seçilemiyordu.

Bunun üzerine resmî GitHub kaynağı kullanıldı ve çalışan commit sabitlendi:

```text
5de7a54aa4e5e2baadb0182dde554908b48b85c2
```

Bu kararın amacı “bugünkü en yeni kodu” izlemek değil, ekipte aynı davranışı tekrar üretebilmektir. Güncelleme yapılacaksa yeni commit ayrı bir dalda test edilmelidir.

## 4. Modeli yerel önbelleğe aldık

İlk çalıştırma yaklaşık 3 GB model verisini indirdi. Dosyalar `chatterbox-v3/hf-cache/` altında tutuldu. PyTorch ve Türkçe metin işleme önbellekleri de proje içinde ayrı klasörlerde tutuldu.

Bu büyük dosyalar yeniden indirilebilir olduğu için GitHub'a konmaz. Aynı şekilde `.venv` de yaklaşık 1,2 GB olduğu için paylaşılmaz. Toplam yerel çalışma alanı yaklaşık 4,3 GB idi; GitHub deposu bunun yalnızca küçük ve yeniden üretilebilir kısmını içerir.

## 5. İlk Türkçe üretimi yaptık

`generate_tr.py` oluşturuldu. Önemli model çağrısı şu mantıktadır:

```python
model = ChatterboxMultilingualTTS.from_pretrained(
    device=device,
    t3_model="v3",
)

wav = model.generate(
    text,
    language_id="tr",
    audio_prompt_path=reference_path,
    exaggeration=0.4,
    cfg_weight=0.5,
    temperature=0.7,
)
```

Buradaki `language_id="tr"` özellikle önemlidir; modelin Türkçe metin işleme yolunu seçer. `audio_prompt_path` verilmezse model kendi varsayılan sesiyle üretir, verilirse zero-shot ses benzetme yapılır.

## 6. İlk kişisel kaydı denedik

İlk M4A ses kaydı WAV biçimine dönüştürüldü ve yeni bir Türkçe cümle üretildi. Ses benzerliği hissedildi, fakat doğallık istenen seviyede değildi.

Referans kalitesinin sadece uzunlukla artmadığını değerlendirdik. Temiz 15–30 saniyenin; uzun ama yankılı, gürültülü veya değişken mesafeli kayıttan daha faydalı olduğu sonucuna vardık. Tek konuşmacı, sabit ses seviyesi, doğal ton ve sessiz ortam önerildi.

## 7. İkinci referans kaydı denedik

İkinci M4A kayıt tek kanallı WAV'a dönüştürüldü, ses seviyesi düzenlendi ve uygun konuşma bölümü referans olarak hazırlandı. Kişisel dosya GitHub'a eklenmedi; yalnızca bu işlemin genel yöntemi README'de belgelendi.

## 8. Üç farklı profil ürettik

Aynı metin, aynı referans ve aynı rastgelelik tohumu kullanılarak üç profil üretildi:

| Profil | `exaggeration` | `cfg_weight` | `temperature` | Amaç |
|---|---:|---:|---:|---|
| A — dengeli | 0.40 | 0.40 | 0.70 | Daha serbest ve dengeli okuma |
| B — sakin | 0.30 | 0.35 | 0.65 | Daha düşük ifade ve değişkenlik |
| C — sese bağlı | 0.40 | 0.50 | 0.70 | Referans yönlendirmesini daha güçlü koruma |

Karşılaştırmayı kullanıcı kendi kulağıyla yaptı ve **C profilini tercih etti**. Bu nedenle `generate_tr.py` varsayılanları C profiline ayarlandı. Bu bilimsel bir MOS testi değildir; tek konuşmacının öznel tercihidir.

## 9. Yerel performansı ölçtük

Apple M4 CPU'da, model ve referans belleğe alınarak yapılan ölçümde:

| Aşama | Sonuç |
|---|---:|
| Model yükleme | 13,118 sn |
| Yeni referansı hazırlama | 1,520 sn |
| Üretilen ses | 5,84 sn |
| 4 CPU thread üretim | 20,581 sn |
| 6 CPU thread üretim | 23,302 sn |
| 10 CPU thread üretim | 22,905 sn |
| Tepe süreç belleği | 3,312 GiB |

En iyi ölçülen CPU sonucu 4 thread ile geldi. Daha fazla thread bu iş yükünde daha hızlı olmadı; thread koordinasyonu ve bellek bant genişliği gibi etkiler olabilir. Bu tek koşullu küçük bir benchmark'tır, evrensel sonuç değildir.

## 10. MPS konusunu ayırdık

Başta “MCP” denmiş, ardından bunun Apple'ın **MPS** (Metal Performance Shaders) hızlandırması olduğu düzeltilmiştir. PyTorch kurulumu MPS destekli derlenmiş görünse de ölçüm yapılan izole çalışma ortamında fiziksel MPS aygıtına erişilemediği için güvenilir bir MPS benchmark sonucu üretilemedi.

Kod artık `--device auto|cpu|mps|cuda` kabul eder. Ekip gerçek Terminal ortamında MPS'yi ölçüp `docs/PERFORMANCE.md` tablosuna ayrı bir satır ekleyebilir.

## 11. Depoyu paylaşılabilir hale getirdik

Son aşamada:

- Kişisel dosya adları komut dosyalarından kaldırıldı.
- Referans, metin, çıktı, device ve temel ayarlar komut satırı parametresi oldu.
- Ortak cihaz/model yükleme mantığı `runtime.py` içine alındı.
- Tek komutlu macOS kurulum betiği eklendi.
- Kişisel sesler, çıktılar, model ve ortam `.gitignore` ile kapatıldı.
- İnsanlar için README/mimari/performans belgeleri ve AI için yoğun bağlam dosyası eklendi.

## Bugünkü durum

Proje yerelde çalışıyor; Türkçe zero-shot üretim, üçlü profil karşılaştırması ve benchmark araçları mevcut. C profili başlangıç ayarıdır. Üretim kalitesi için bir sonraki mantıklı çalışma, birkaç temiz referans kaydıyla kör dinleme testi; hız için ise aynı metin ve seed ile CPU, MPS ve hedef bulut GPU'sunu gerçek ölçmektir.
