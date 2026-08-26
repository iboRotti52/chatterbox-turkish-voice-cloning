# AI için proje bağlamı

Bu dosya, depoyu bir yapay zekâ aracına verip hızlı ve doğru açıklama/yardım almak için hazırlanmıştır. AI'dan yardım isterken bu dosyayla birlikte ilgili `.py` dosyasını paylaşın. Kişisel ses kaydı paylaşmayın.

## Kısa tanım

- Amaç: Türkçe metni kısa bir referans sese benzeterek üretmek.
- Model: Resemble AI Chatterbox Multilingual V3, yaklaşık 500M parametre.
- Yöntem: Zero-shot voice cloning; fine-tuning/eğitim yok.
- Dil: `language_id="tr"`.
- Tercih edilen profil: `exaggeration=0.4`, `cfg_weight=0.5`, `temperature=0.7`.
- Upstream commit: `5de7a54aa4e5e2baadb0182dde554908b48b85c2`.
- Doğrulanmış yerel ortam: Apple M4, 16 GB, Python 3.11, CPU.

## Değişmezler

AI şu kuralları korumalıdır:

1. `t3_model="v3"` kaldırılmamalı veya sessizce V2'ye düşürülmemeli.
2. Türkçe üretimde `language_id="tr"` korunmalı.
3. Kişisel sesler, çıktılar, model dosyaları ve `.venv` Git'e eklenmemeli.
4. Model her istek için yeniden yüklenmemeli; servis ömrü boyunca bellekte tutulmalı.
5. Ölçümde model yükleme, yeni referans hazırlama ve üretim süreleri ayrı raporlanmalı.
6. MPS desteği varsayılmamalı; `torch.backends.mps.is_available()` ile kontrol edilmeli.
7. Yeni optimizasyon ses benzerliği ve doğallık testi olmadan “daha iyi” ilan edilmemeli.

## Giriş noktaları

| Dosya | Görev |
|---|---|
| `chatterbox-v3/runtime.py` | Önbellek, device seçimi ve V3 model yükleme |
| `chatterbox-v3/generate_tr.py` | Tek Türkçe WAV üretimi |
| `chatterbox-v3/compare_tr.py` | A/B/C ayar karşılaştırması |
| `chatterbox-v3/benchmark_m4.py` | Süre, RTF ve tepe RAM benchmark'ı |
| `chatterbox-v3/power_benchmark_m4.py` | Deneysel macOS batarya telemetrisi |
| `scripts/setup_macos.sh` | Python ortamı ve sabit upstream sürüm kurulumu |

## Veri yerleşimi

```text
chatterbox-v3/inputs/   kullanıcıya ait yerel referans sesler; Git'e girmez
outputs/                sentetik WAV çıktıları; Git'e girmez
chatterbox-v3/hf-cache/ model ağırlıkları; Git'e girmez
chatterbox-v3/.venv/    Python ortamı; Git'e girmez
```

## Bilinen gerçek sonuçlar

Apple M4 CPU, 4 thread:

- model load: 13.118 s
- reference preparation: 1.520 s
- generation wall time: 20.581 s
- generated audio: 5.84 s
- RTF: 3.524
- peak process RSS: 3.312 GiB

6 ve 10 CPU thread aynı testte daha yavaş çıktı. Güvenilir MPS veya bulut GPU ölçümü henüz yoktur. Başka cihaz sonuçları teorik TFLOPS'tan “net” türetilmemeli, aynı benchmark ile ölçülmelidir.

## Tercih kararının anlamı

C profili, tek kullanıcının A/B/C dinleme karşılaştırmasında tercih ettiği profildir. Bu tercih tüm konuşmacılara genellenemez. Yeni konuşmacı veya mikrofon için profiller yeniden dinlenmelidir.

## AI'ın değişiklik öncesi sorması gerekenler

- Hedef yerel kullanım mı, API servisi mi, mobil uygulama mı?
- Hedef donanım ve kabul edilen p95 gecikme nedir?
- Aynı konuşmacı mı tekrar kullanılacak, her istekte yeni zero-shot ses mi gelecek?
- Ham referansın saklama/erişim/silme politikası nedir?
- Öncelik doğallık, ses benzerliği, hız, maliyet veya eşzamanlılık mı?

## Yararlı komutlar

```bash
./scripts/setup_macos.sh

./chatterbox-v3/.venv/bin/python chatterbox-v3/generate_tr.py \
  --reference chatterbox-v3/inputs/referans.wav \
  --text "Test cümlesi." \
  --output outputs/test.wav

./chatterbox-v3/.venv/bin/python chatterbox-v3/benchmark_m4.py \
  --reference chatterbox-v3/inputs/referans.wav \
  --device cpu --threads 4,6,10
```

## AI'a örnek görev metni

```text
Bu depodaki docs/AI_CONTEXT.md ve docs/ARCHITECTURE.md kurallarını koru.
Hedef cihazım [cihaz], hedefim [kalite/gecikme/maliyet]. İlgili kodu incele,
ölçülmüş sonuçlarla tahminleri ayır ve kişisel ses dosyalarını hiçbir çıktıya
veya Git commit'ine eklemeden öneri/patch hazırla.
```
