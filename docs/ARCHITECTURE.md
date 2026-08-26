# Teknik mimari

## Kapsam

Bu proje bir servis veya kullanıcı arayüzü değildir. Chatterbox Multilingual V3'ü kuran ve Türkçe zero-shot ses üretimini komut satırından çalıştıran ince bir uygulama katmanıdır.

## Veri akışı

```text
Türkçe metin ─────────────┐
                         ├─> Chatterbox Multilingual V3 ─> tensor ─> WAV dosyası
Referans WAV ─> koşullama ┘       language_id="tr"
```

Model iki tür girdiyi birleştirir:

- Metin içeriği: Ne söyleneceğini belirler.
- Referans ses koşullaması: Konuşmacı kimliği, tını, tempo ve kayıt özelliklerinden sinyal sağlar.

Bu depoda eğitim yapılmaz ve kalıcı bir “kişiye özel model” oluşmaz. Yeni bir referans ilk kullanıldığında koşullama hesaplanır; aynı model süreci içinde tekrar kullanılabilir.

## Dosya sorumlulukları

### `runtime.py`

- Yerel önbellek yollarını ayarlar.
- Kurulum betiğinin klonladığı upstream `src/` klasörünü tercih eder.
- `auto`, `cpu`, `mps`, `cuda` aygıt seçimini çözer.
- Modeli daima `t3_model="v3"` ile yükler.

### `generate_tr.py`

Tek bir metni üretir. C profili varsayılandır. Referans verilmesi opsiyoneldir; kendi sesine benzetme için verilmelidir.

### `compare_tr.py`

Aynı metin ve aynı seed ile A/B/C profillerini üretir. Model bir defa yüklenir; böylece karşılaştırma sırasında model yükleme maliyeti üç kez ödenmez.

### `benchmark_m4.py`

Şu aşamaları ayrı ölçer:

1. Model yükleme
2. Referans koşullaması
3. Metinden ses üretimi

CPU'da farklı thread sayılarını karşılaştırır. GPU/MPS seçildiğinde thread taraması yapmaz. Sonucu makine tarafından okunabilir JSON olarak standart çıktıya yazar.

### `power_benchmark_m4.py`

macOS `AppleSmartBattery/SystemLoad` telemetrisinden yaklaşık tüm-sistem gücünü örnekler. Üretim ortalamasından boşta ortalamasını çıkararak kaba ek güç tahmini yapar. Bu laboratuvar tipi bir güç ölçer değildir; adaptör, pil durumu, ekran ve arka plan süreçlerinden etkilenir.

## Parametreler

| Parametre | Etkisi | Proje varsayılanı |
|---|---|---:|
| `language_id` | Dil/metin işleme yolu | `tr` |
| `exaggeration` | İfade/prozodi yoğunluğu | 0.40 |
| `cfg_weight` | Metin/referans yönlendirme dengesi | 0.50 |
| `temperature` | Örnekleme değişkenliği | 0.70 |
| `seed` | Deneyin tekrarlanabilirliği | 20260810 |

Yüksek `exaggeration` her zaman “daha doğal” demek değildir. Düşük `temperature` değişkenliği azaltabilir ama monotonluk yaratabilir. Parametreleri tek tek değiştirmek ve aynı seed ile karşılaştırmak gerekir.

## Model yaşam döngüsü ve gecikme

Bir üretim isteğinin toplam süresi şu parçalara ayrılır:

```text
soğuk başlangıç = model yükleme + yeni referans koşullaması + üretim + WAV yazma
sıcak/yeni ses  = yeni referans koşullaması + üretim + WAV yazma
sıcak/aynı ses  = üretim + WAV yazma
```

Bir API servisi tasarlanırsa model uygulama başlarken bir kez yüklenmeli, sık kullanılan ve izinli referans koşullamaları güvenli biçimde önbelleğe alınmalı, istek başına tekrar model yüklenmemelidir.

## Aygıt seçimi

`--device auto` önceliği:

1. NVIDIA CUDA
2. Apple MPS
3. CPU

MPS bazı PyTorch işlemleri için CPU fallback kullanabilir. Bu nedenle “MPS seçildi” bilgisi tüm hesaplamanın GPU'da gerçekleştiğini garanti etmez. Gerçek karar benchmark sonucu, ses kalitesi ve bellek kullanımıyla verilmelidir.

## Veri ve güven sınırı

- Referans ses biyometrik/kişisel veri kabul edilmelidir.
- Girdi ve çıktı klasörleri Git kapsamı dışındadır.
- Model önbelleği yeniden indirilebilir; kaynak kod değildir.
- Buluta geçildiğinde kayıt aktarımı, şifreleme, silme süresi, loglama ve erişim yetkisi tasarlanmalıdır.
- Chatterbox çıktıları upstream tarafından PerTh watermark ile işaretlenir; bu davranış kaldırılmamalıdır.

## Bilinen sınırlamalar

- Kalite değerlendirmesi tek kullanıcının öznel dinlemesine dayanır.
- Mevcut kesin performans ölçümü yalnızca Apple M4 CPU içindir.
- Türkçe sayı, kısaltma ve özel ad normalizasyonu için ayrı bir ön işleyici eklenmemiştir.
- Uzun metinleri cümlelere bölüp birleştiren üretim hattı yoktur.
- Eşzamanlı istek, kuyruk, API kimlik doğrulama ve üretim servisleştirmesi kapsam dışıdır.
