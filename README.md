# Chatterbox Multilingual V3 — Türkçe Zero‑Shot Ses Klonlama

Bu depo, [Resemble AI Chatterbox](https://github.com/resemble-ai/chatterbox) Multilingual V3 modelini Türkçe metinleri bir referans sese benzeterek yerelde üretmek için hazırlanan, tekrar kurulabilir bir çalışma alanıdır.

> Gizlilik: Kişisel referans kayıtları, üretilen sesler, model ağırlıkları ve Python sanal ortamı GitHub'a yüklenmez. Bunlar `.gitignore` ile özellikle dışarıda tutulur.

## Bu projede ne yapıldı?

1. Apple Silicon Mac üzerinde Python 3.11 tabanlı izole ortam kuruldu.
2. PyPI sürümünde V3 seçimi bulunmadığı için resmî Chatterbox kaynağının doğrulanmış commit'i kullanıldı.
3. Türkçe (`language_id="tr"`) zero-shot ses klonlama akışı hazırlandı.
4. İki farklı kişisel kayıt dönüştürülüp temiz referans WAV olarak denendi.
5. Üç üretim profili karşılaştırıldı; kullanıcı **C profilini** daha doğal buldu.
6. Apple M4 CPU üzerinde model yükleme, referans hazırlama, üretim ve RAM ölçüldü.
7. Kod kişisel dosya adlarından arındırıldı ve ekip kullanımına uygun komut satırı araçlarına dönüştürüldü.

- Ayrıntılı kronoloji: [docs/PROJECT_HISTORY.md](docs/PROJECT_HISTORY.md)
- Teknik akış: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- AI'a verilecek bağlam: [docs/AI_CONTEXT.md](docs/AI_CONTEXT.md)
- Performans ve GPU yorumu: [docs/PERFORMANCE.md](docs/PERFORMANCE.md)

## Hızlı başlangıç (macOS)

Gereksinimler:

- Apple Silicon veya Intel Mac
- Python 3.11
- Git
- `ffmpeg` (M4A gibi kayıtları WAV'a çevirmek için)

Kurulum:

```bash
git clone https://github.com/iboRotti52/chatterbox-turkish-voice-cloning.git
cd chatterbox-turkish-voice-cloning
./scripts/setup_macos.sh
```

İlk kurulum model ağırlıklarını henüz indirmez. İlk ses üretiminde yaklaşık 3 GB model önbelleği `chatterbox-v3/hf-cache/` altına indirilir.

## Referans sesi hazırlama

Sessiz, yankısız bir ortamda 15–30 saniye doğal konuşma kaydedin. Tek konuşmacı, sabit mikrofon mesafesi ve müziksiz kayıt tercih edin. Kayıtta farklı Türkçe sesleri ve doğal duraklamaları içeren bir metin kullanın.

M4A kaydını tek kanallı 24 kHz WAV'a çevirme örneği:

```bash
ffmpeg -i kaydim.m4a -ac 1 -ar 24000 \
  chatterbox-v3/inputs/referans.wav
```

`chatterbox-v3/inputs/` içeriği GitHub'a eklenmez.

## Türkçe ses üretme

Projede tercih edilen **C profili** varsayılandır:

```text
exaggeration = 0.4
cfg_weight   = 0.5
temperature  = 0.7
language_id  = tr
```

```bash
./chatterbox-v3/.venv/bin/python chatterbox-v3/generate_tr.py \
  --text "Merhaba, bu cümle benim referans sesim kullanılarak üretildi." \
  --reference chatterbox-v3/inputs/referans.wav \
  --output outputs/deneme.wav
```

Varsayılan `--device auto` sırasıyla CUDA, MPS ve CPU kullanılabilirliğini kontrol eder. Belirli bir aygıtı zorlamak için `--device cpu`, `--device mps` veya `--device cuda` verilebilir.

## Üç profili karşılaştırma

```bash
./chatterbox-v3/.venv/bin/python chatterbox-v3/compare_tr.py \
  --reference chatterbox-v3/inputs/referans.wav \
  --text "Aynı cümleyi üç farklı ayarla dinleyip karşılaştırıyorum."
```

Çıktılar `outputs/variant-a-dengeli.wav`, `variant-b-sakin.wav` ve `variant-c-sese-bagli.wav` olur. Rastgelelik aynı seed ile sabitlendiğinden ayarların etkisi daha adil karşılaştırılır.

## Benchmark

```bash
./chatterbox-v3/.venv/bin/python chatterbox-v3/benchmark_m4.py \
  --reference chatterbox-v3/inputs/referans.wav \
  --device cpu \
  --threads 4,6,10
```

Araç JSON üretir. Buradaki `rtf = üretim_süresi / üretilen_ses_süresi` değeridir; `1.0` gerçek zaman, `1.0` altı gerçek zamandan hızlıdır.

## Proje yapısı

```text
.
├── README.md
├── CONTRIBUTING.md
├── requirements.txt
├── scripts/
│   └── setup_macos.sh
├── docs/
│   ├── AI_CONTEXT.md
│   ├── ARCHITECTURE.md
│   ├── PERFORMANCE.md
│   └── PROJECT_HISTORY.md
├── chatterbox-v3/
│   ├── runtime.py
│   ├── generate_tr.py
│   ├── compare_tr.py
│   ├── benchmark_m4.py
│   ├── power_benchmark_m4.py
│   └── inputs/              # Git'e girmez
└── outputs/                 # Git'e girmez
```

Yerel kurulumdan sonra oluşan `chatterbox-source/`, `.venv/`, `hf-cache/`, `torch-cache/` ve `pkuseg-cache/` klasörleri de Git'e girmez.

## Sorumlu kullanım

Yalnızca kendi sesinizi veya açık iznini aldığınız bir sesi klonlayın. Üretilmiş içeriği gerçek kayıt gibi sunmayın; ekip içi ve dışı kullanımlarda sentetik olduğunu açıkça belirtin. Ses kayıtları biyometrik veri niteliği taşıyabileceği için erişim ve saklama politikasını ayrıca belirleyin.

## Upstream sürümü

Kurulum betiği resmî Chatterbox deposunun şu commit'ini sabitler:

```text
5de7a54aa4e5e2baadb0182dde554908b48b85c2
```

Upstream lisans ve kullanım koşulları kurulum sırasında klonlanan resmî depoda yer alır. Bu depoda ayrıca bir lisans ilan edilmemiştir; kurum içinde paylaşım öncesinde proje lisansı seçilmelidir.
