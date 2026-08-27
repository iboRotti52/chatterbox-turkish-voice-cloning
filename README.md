# Chatterbox Multilingual V3 ile Türkçe ses klonlama

Bu proje basit bir soruyla başladı: **Kısa bir ses kaydı verip, hiç eğitim yapmadan kendi sesimize benzeyen yeni Türkçe cümleler üretebilir miyiz?**

Bunu denemek için Resemble AI'ın açık kaynaklı [Chatterbox Multilingual V3](https://github.com/resemble-ai/chatterbox) modelini bir Apple M4 Mac'e kurduk. İki farklı referans kayıtla denemeler yaptık, aynı cümleyi farklı ayarlarla ürettik ve sonuçları dinleyerek karşılaştırdık. Sonunda sesi en iyi koruduğunu düşündüğümüz ayarı varsayılan hale getirdik.

Bu repo, o deneme sürecinin temizlenmiş ve başkasının bilgisayarında yeniden kurulabilir hâlidir. Modeli eğitmez; verdiğiniz kısa kaydı o anda analiz ederek yeni metni benzer bir sesle okur. Buna **zero-shot voice cloning** deniyor.

En kısa hâliyle çalışma şekli şöyle:

```text
Kısa referans kayıt + yazdığın Türkçe metin
                    ↓
         Chatterbox Multilingual V3
                    ↓
       Referans sese benzeyen yeni WAV
```

Örneğin 20 saniyelik normal konuşma kaydını referans olarak verip, kayıtta hiç söylemediğin “Yarın toplantı saat onda başlayacak” cümlesini aynı sese yakın biçimde üretebilirsin.

## Bu proje tam olarak nedir?

Chatterbox, yazıyı konuşmaya çeviren bir **text-to-speech (TTS)** model ailesidir. Multilingual V3 modeli birden fazla dili, Türkçe dâhil, destekler. Normal bir TTS sistemi yalnızca hazır bir yapay sesle konuşurken bu model ayrıca kısa bir ses kaydını örnek alabilir.

Model referans kayıttan kabaca şunlarla ilgili ipuçları çıkarır:

- Sesin tınısı ve konuşmacı karakteri
- Konuşma hızı ve ritmi
- Vurgu ve tonlama biçimi
- Kaydın içerdiği aksan ve telaffuz özellikleri

Ardından bu özellikleri yazdığın yeni Türkçe metinle birleştirir. Ortaya çıkan ses, orijinal kaydın kesilip birleştirilmiş hâli değildir; model tarafından sıfırdan üretilen yeni bir ses dalgasıdır.

### “Zero-shot” ne anlama geliyor?

Buradaki “zero-shot”, modelin senin sesin için yeniden eğitilmemesi demektir. Klasik bir kişisel ses modeli hazırlamak için dakikalar veya saatler süren kayıtlar, eğitim verisi ve uzun bir GPU eğitimi gerekebilir. Bu projede ise:

1. Hazır Chatterbox modeli bir kez yüklenir.
2. Kısa referans kayıt analiz edilir.
3. Konuşmacı bilgisi yalnızca üretimi yönlendirmek için kullanılır.
4. Verdiğin metin yeni bir WAV dosyasına dönüştürülür.

Bu yaklaşım hızlı deneme yapmayı kolaylaştırır. Buna karşılık, yalnızca kısa bir kayda dayandığı için profesyonel olarak eğitilmiş kişisel bir model kadar tutarlı olmayabilir.

### Bu proje ne değildir?

- Ses kaydını kelime kelime kesip yeni cümle oluşturan bir montaj aracı değildir.
- Kişinin sesini kullanarak yeni bir model eğitmez.
- Kaydı otomatik olarak buluta yükleyen bir servis değildir; mevcut kullanım yereldir.
- Her seste kusursuz sonuç vereceğini garanti eden tamamlanmış bir ürün değildir.
- Şimdilik web arayüzü veya API servisi değildir; komut satırından çalışan bir deney ve geliştirme projesidir.

## Şu anda ne yapabiliyor?

- Türkçe bir metni Chatterbox Multilingual V3 ile WAV olarak üretebiliyor.
- 15–30 saniyelik bir referans kaydı kullanarak konuşmacının sesine yaklaşabiliyor.
- CPU, Apple MPS ve NVIDIA CUDA arasında uygun olan aygıtı otomatik seçebiliyor.
- Aynı metni üç farklı doğallık ayarıyla üretip dinleme karşılaştırması yaptırabiliyor.
- Model yükleme, referans analizi, üretim süresi ve bellek kullanımını ölçebiliyor.

Burada fine-tuning veya kişiye özel model eğitimi yok. Herhangi bir konuşmacının sesinden kalıcı bir model dosyası oluşturulmuyor.

## Bir cümle üretilirken perde arkasında ne oluyor?

`generate_tr.py` çalıştırıldığında süreç şu sırayla ilerler:

1. **Çalıştırma aygıtı seçilir.** Kod önce NVIDIA CUDA'yı, sonra Apple MPS'yi kontrol eder; ikisi de yoksa CPU kullanır.
2. **Multilingual V3 yüklenir.** Yaklaşık 500 milyon parametreli model disk önbelleğinden belleğe alınır. İlk çalıştırmada model dosyaları internetten indirilir.
3. **Referans kayıt hazırlanır.** WAV dosyası okunur ve model konuşmacıyı temsil eden koşullama bilgilerini çıkarır.
4. **Türkçe metin işlenir.** `language_id="tr"` sayesinde model Türkçe dil yolunu kullanır.
5. **Ses üretilir.** Metnin içeriği, referans ses bilgisi ve doğallık ayarları birlikte kullanılarak yeni ses örnekleri oluşturulur.
6. **Sonuç diske yazılır.** Üretilen tensor standart bir WAV dosyasına çevrilip `outputs/` klasörüne kaydedilir.

Model her seferinde yeniden başlatılırsa yükleme süresi tekrar oluşur. İleride bir API yapılırsa modelin uygulama başlarken bir kez yüklenip bellekte tutulması gerekir. Aynı izinli referans tekrar kullanılacaksa referans analizi de önceden hazırlanabilir.

## Biz nasıl ilerledik?

İlk olarak Chatterbox'ın PyPI paketini kurduk. Ancak o pakette Multilingual V3'ü açıkça seçmemizi sağlayan `t3_model="v3"` desteğinin olmadığını gördük. Bu yüzden resmî GitHub kaynağına geçtik ve çalışan sürümü belirli bir commit'e sabitledik. Böylece ekipte projeyi kuran herkes aynı kodu kullanabiliyor.

Python 3.11'i özellikle seçtik; Chatterbox'ın resmî projesi bu sürümle geliştirilip test edilmiş. Paketleri sistem Python'una kurmak yerine `chatterbox-v3/.venv/` altında ayrı bir sanal ortam oluşturduk. Böylece bu projenin PyTorch ve ses işleme bağımlılıkları bilgisayardaki başka Python projeleriyle karışmıyor.

İlk ses kaydında konuşmacıya benzerlik vardı ama sonuç yeterince doğal değildi. Daha temiz ve biraz daha uzun ikinci bir kayıt hazırlayıp üç ayarı aynı metin ve aynı rastgelelik tohumu ile karşılaştırdık:

| Profil | Karakteri | `exaggeration` | `cfg_weight` | `temperature` |
|---|---|---:|---:|---:|
| A | Dengeli ve biraz daha serbest | 0.40 | 0.40 | 0.70 |
| B | Daha sakin ve kontrollü | 0.30 | 0.35 | 0.65 |
| C | Referans sese daha bağlı | 0.40 | 0.50 | 0.70 |

Dinleme karşılaştırmasında **C profilini daha doğal bulduk**. Bu nedenle tek cümle üreten araç artık C ayarlarıyla başlıyor. Bu değerler evrensel bir “en iyi ayar” değil; farklı sesler ve kayıt ortamları için yeniden karşılaştırmak gerekebilir.

Yaptığımız bütün adımların daha ayrıntılı anlatımı [Proje Geçmişi](docs/PROJECT_HISTORY.md) dosyasında bulunuyor.

## Kendi bilgisayarında çalıştırmak

Kurulum şu anda macOS ve özellikle Apple Silicon düşünülerek hazırlandı. Bilgisayarında şunların bulunması gerekiyor:

- Python 3.11
- Git
- `ffmpeg` — iPhone/Mac ses kayıtlarını WAV'a çevirmek için

Projeyi indirip kurulumu başlat:

```bash
git clone https://github.com/iboRotti52/chatterbox-turkish-voice-cloning.git
cd chatterbox-turkish-voice-cloning
./scripts/setup_macos.sh
```

Kurulum betiği kendi Python ortamını oluşturur ve doğruladığımız Chatterbox sürümünü indirir. İlk ses üretiminde model ağırlıkları da indirilir; yaklaşık 3 GB boş alan ayırmak gerekir. Sonraki çalıştırmalarda aynı dosyalar tekrar indirilmez.

`setup_macos.sh` betiği daha açık şekilde şu işleri yapar:

1. Python 3.11'in bilgisayarda bulunup bulunmadığını kontrol eder.
2. Kişisel girişler ve üretilen çıktılar için yerel klasörleri hazırlar.
3. Resmî Chatterbox deposunu `chatterbox-v3/chatterbox-source/` altına klonlar.
4. Daha önce doğruladığımız commit'e geçer.
5. `chatterbox-v3/.venv/` altında izole Python ortamı oluşturur.
6. Chatterbox ve gerekli Python paketlerini bu ortama kurar.

Betik mevcut upstream klasöründe beklenmeyen başka bir commit görürse onu sessizce silmez veya değiştirmez; kişisel çalışmayı korumak için hata verip durur.

## Nasıl bir referans kayıt vermeliyim?

Modelin sese benzemesi kadar doğal konuşması da kaydın kalitesine bağlı. Çok uzun bir kayıt vermek tek başına daha iyi sonuç sağlamıyor. Bizim denemelerimiz için en kullanışlı başlangıç şuydu:

- 15–30 saniye doğal konuşma
- Sessiz ve yankısız bir oda
- Tek konuşmacı
- Sabit mikrofon mesafesi
- Müzik, efekt ve arka plan konuşması olmayan kayıt
- Fısıldamadan veya özellikle rol yapmadan, gündelik konuşma tonu

Telefonun Sesli Notlar uygulamasından gelen M4A kaydını şu şekilde hazırlayabilirsin:

```bash
ffmpeg -i kaydim.m4a -ac 1 -ar 24000 \
  chatterbox-v3/inputs/referans.wav
```

Kayıt `chatterbox-v3/inputs/` klasöründe kalır. Bu klasördeki sesler GitHub'a yüklenmez.

## Yeni bir Türkçe cümle üretmek

```bash
./chatterbox-v3/.venv/bin/python chatterbox-v3/generate_tr.py \
  --reference chatterbox-v3/inputs/referans.wav \
  --text "Merhaba, bu cümle kısa bir referans kayıt kullanılarak üretildi." \
  --output outputs/deneme.wav
```

Üretilen dosya `outputs/deneme.wav` olur. `outputs/` klasörü de GitHub'a yüklenmez.

Araç varsayılan olarak `--device auto` kullanır. Önce NVIDIA CUDA'yı, sonra Apple MPS'yi kontrol eder; ikisi de kullanılamıyorsa CPU'ya geçer. İstersen aygıtı açıkça belirtebilirsin:

```bash
--device cpu
--device mps
--device cuda
```

Tek üretim aracındaki önemli seçeneklerin tamamı:

| Seçenek | Ne işe yarar? |
|---|---|
| `--text` | Seslendirilecek Türkçe cümleyi verir. |
| `--reference` | Benzetilecek konuşmacının WAV kaydını verir. Verilmezse modelin varsayılan sesi kullanılır. |
| `--output` | Üretilen WAV dosyasının nereye yazılacağını belirler. |
| `--device` | Hesabın CPU, Apple MPS veya NVIDIA CUDA üzerinde yapılmasını seçer. |
| `--exaggeration` | İfade ve prozodi yoğunluğunu etkiler. Çok yükseltmek doğallığı bozabilir. |
| `--cfg-weight` | Üretimin referans/metin yönlendirmesine ne kadar bağlı kalacağını etkiler. |
| `--temperature` | Üretimdeki örnekleme değişkenliğini etkiler. Düşürmek daha kontrollü ama daha tekdüze sonuç verebilir. |

Projede dil seçeneğini komuta bırakmak yerine kod içinde `tr` olarak sabitledik; bu araç özellikle Türkçe akışını test etmek için hazırlanmış durumda.

## A, B ve C profillerini kendin dinlemek

Her ses için C'nin en iyi olacağını varsaymıyoruz. Üç profili kendi referansınla üretmek için:

```bash
./chatterbox-v3/.venv/bin/python chatterbox-v3/compare_tr.py \
  --reference chatterbox-v3/inputs/referans.wav \
  --text "Aynı cümleyi üç farklı ayarla dinleyip karşılaştırıyorum."
```

Şu üç dosya oluşur:

```text
outputs/variant-a-dengeli.wav
outputs/variant-b-sakin.wav
outputs/variant-c-sese-bagli.wav
```

Araç her üretimde aynı seed'i kullandığı için duyduğun farkın mümkün olduğunca ayarlardan gelmesini sağlar.

## M4 üzerinde ne kadar sürdü?

Apple M4, 16 GB belleğe sahip test bilgisayarında CPU ile aldığımız sonuçlar:

| İşlem | Süre |
|---|---:|
| Modeli ilk kez belleğe yükleme | 13,12 saniye |
| Yeni referans sesi analiz etme | 1,52 saniye |
| 5,84 saniyelik sesi üretme | 20,58 saniye |
| Ölçülen tepe süreç belleği | 3,31 GiB |

Bu ölçüm 4 CPU thread ile yapıldı. Aynı denemede 6 ve 10 thread daha hızlı çıkmadı. Model zaten bellekte ve aynı referans daha önce analiz edilmişse model yükleme ve referans hazırlama süreleri tekrar ödenmez.

Bu değerlerden hareketle, model bellekteyken 5 saniyelik sesin M4 CPU'da yaklaşık 17,6 saniyede üretileceğini hesaplıyoruz. Bu doğrudan 5,00 saniyelik bir ölçüm değil; ölçülen RTF üzerinden yapılmış yaklaşık hesaptır.

MPS ve bulut GPU'ları için elimizde aynı koşullarda alınmış kesin sonuç bulunmadığından tahminleri gerçek ölçüm gibi yazmadık. Cihaz karşılaştırmasının nasıl yapılması gerektiği [Performans Notları](docs/PERFORMANCE.md) içinde anlatılıyor.

Benchmark'ı kendi bilgisayarında çalıştırmak için:

```bash
./chatterbox-v3/.venv/bin/python chatterbox-v3/benchmark_m4.py \
  --reference chatterbox-v3/inputs/referans.wav \
  --device cpu \
  --threads 4,6,10
```

## Repoda hangi dosya ne işe yarıyor?

```text
.
├── README.md                         şu anda okuduğun başlangıç rehberi
├── scripts/setup_macos.sh            yerel ortamı kurar
├── chatterbox-v3/
│   ├── runtime.py                    model ve aygıt seçimini yönetir
│   ├── generate_tr.py                tek bir Türkçe ses üretir
│   ├── compare_tr.py                 A/B/C profillerini üretir
│   ├── benchmark_m4.py               süre ve bellek ölçer
│   ├── power_benchmark_m4.py         deneysel macOS güç ölçümü yapar
│   └── inputs/                       kişisel kayıtlar burada kalır
├── outputs/                          üretilen WAV dosyaları burada kalır
└── docs/
    ├── PROJECT_HISTORY.md             çalışmanın adım adım geçmişi
    ├── ARCHITECTURE.md                teknik akış ve tasarım kararları
    ├── PERFORMANCE.md                 ölçümler ve cihaz karşılaştırması
    └── AI_CONTEXT.md                  yapay zekâ araçları için kısa bağlam
```

Takım arkadaşların projeyi bir yapay zekâ aracına açıklatmak veya geliştirtmek isterse önce [AI_CONTEXT.md](docs/AI_CONTEXT.md) dosyasını vermeleri yeterli. Orada projenin değişmemesi gereken noktaları, ölçülmüş sonuçları ve dosyaların görevlerini kısa biçimde topladık.

## Neden ses dosyaları repoda yok?

Referans ses, sahibini tanımlayabilen kişisel ve biyometrik bir veridir. Bu nedenle kullandığımız gerçek kayıtları, üretilen klon sesleri, yaklaşık 3 GB model ağırlığını ve 1,2 GB Python ortamını GitHub'a koymadık. `.gitignore` bunların yanlışlıkla commit edilmesini de engelliyor.

Projeyi klonlayan kişi kendi izinli referansını yerel olarak eklemeli. Yalnızca kendi sesini veya açıkça izin aldığı bir sesi kullanmalı; üretilen içeriğin sentetik olduğunu dinleyiciden saklamamalıdır.

## Teknik ayrıntıya inmek istersen

- [Adım adım proje geçmişi](docs/PROJECT_HISTORY.md)
- [Model ve kod mimarisi](docs/ARCHITECTURE.md)
- [Performans ve cihaz karşılaştırması](docs/PERFORMANCE.md)
- [AI araçlarına verilecek proje özeti](docs/AI_CONTEXT.md)
- [Katkı ve Git güvenliği rehberi](CONTRIBUTING.md)

Kurulumda kullanılan resmî Chatterbox commit'i:

```text
5de7a54aa4e5e2baadb0182dde554908b48b85c2
```

Upstream projenin lisansı ve kullanım koşulları [Resemble AI Chatterbox](https://github.com/resemble-ai/chatterbox) deposunda yer alır. Bu repo için ayrıca bir lisans seçilmedi; dışarıdan katkı veya yeniden dağıtım planlanıyorsa önce proje lisansı belirlenmelidir.
