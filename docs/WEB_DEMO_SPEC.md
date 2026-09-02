# Türkçe zero-shot TTS web demosu — ürün ve teknik spec

## 1. Amaç ve kapsam

Kullanıcı kısa bir Türkçe metin ve kullanım izni olan bir referans ses dosyası verir. Sistem, Chatterbox Multilingual V3 ile metni referans sese benzer biçimde okur ve tarayıcıda dinlenebilen/indirilebilen bir WAV döndürür.

Bu sürüm bilinçli olarak tek görevli bir demodur. Hesap, geçmiş, kalıcı dosya saklama, çoklu dil, profil seçimi ve uzun metin birleştirme kapsam dışıdır. Arayüz ile çıkarım servisi ayrı tutulur; ana ürüne taşınırken yalnızca `/api/tts` adaptörü değiştirilir.

## 2. Değerlendirilen seçenekler

### Çıkarım altyapısı

| Seçenek | Artısı | Eksisi | Karar |
|---|---|---|---|
| Modal serverless GPU | Trafik yokken sıfıra iner, Python/GPU kurulumu kodla tekrarlanabilir, küçük demo için düşük operasyon yükü | Soğuk başlangıç, sağlayıcı bağımlılığı, kullanım başına maliyet ve 150 sn HTTP sınırı | **Seçildi** |
| Sürekli açık GPU VM | Tahmin edilebilir sıcak gecikme, tam sistem kontrolü | Demo için boşta GPU maliyeti ve sunucu işletme yükü | Trafik sabitleşirse yeniden değerlendir |
| Yönetilen TTS API | En az operasyon, genelde düşük gecikme | Model/ayar kontrolü azalır, dış hizmet maliyeti ve ses verisi üçüncü tarafa gider | Üretim SLA'sı öne çıkarsa alternatif |
| Tarayıcı/CPU üzerinde çıkarım | Ses cihazdan çıkmaz, sunucu maliyeti yok | 500M model ve bağımlılıklar web demosu için ağır; cihaz uyumluluğu zayıf | Uygun değil |

### GPU seçimi

| GPU | Artısı | Eksisi | Kullanım |
|---|---|---|---|
| T4 | En düşük birim maliyet | Daha eski mimari; üretim süresi ve kuyruk riski artabilir | Maliyet testi |
| **L4** | 24 GB VRAM, küçük/orta çıkarım için iyi fiyat-performans | T4'ten pahalı | **Demo varsayılanı** |
| A10 | Daha yüksek ham kapasite | L4'e göre daha pahalı; 500M model için ölçümsüz fazla olabilir | L4 benchmark'ı yetersizse |
| L40S/A100/H100 | Yüksek hız ve kapasite | Bu tekli 500M iş yükü için maliyetli ve büyük olasılıkla gereksiz | Kapsam dışı |

GPU kararı teorik hız iddiasına değil, aynı ses/metinle yapılacak Modal benchmark'ına göre değiştirilecektir. Başlangıçta tek L4, kap başına tek eşzamanlı üretim ve en fazla iki kap kullanılır.

### Model dosyaları ve kullanıcı sesleri

- Model ağırlıkları Hugging Face önbelleği olarak bir Modal Volume'da tutulur; her yeni imajda yeniden indirilmez.
- Kullanıcı girdisi ve üretilen WAV geçici dizinde işlenir ve istek bitince silinir.
- Uygulama geçmiş tutmaz; R2/D1 veya başka kalıcı veri deposu yoktur.
- Modal uç noktası Proxy Token ile korunur. Token yalnızca web uygulamasının sunucu tarafında bulunur; tarayıcıya gönderilmez.

## 3. Sabit model ayarları

- Model: Resemble AI Chatterbox Multilingual V3 (`t3_model="v3"`)
- Upstream commit: `5de7a54aa4e5e2baadb0182dde554908b48b85c2`
- Dil: `language_id="tr"`
- `exaggeration=0.40`
- `cfg_weight=0.50`
- `temperature=0.70`
- Aygıt: CUDA / Modal L4
- PerTh sentetik ses filigranı korunur.

## 4. Kullanıcı akışı

1. Kullanıcı en fazla 500 karakterlik Türkçe metin girer.
2. WAV, MP3, M4A veya WEBM referans dosyası seçer (en fazla 15 MB).
3. Sesi kullanma izni ve sentetik üretim beyanını onaylar.
4. “Sesi oluştur” eylemi yalnızca üç koşul da sağlanınca etkinleşir.
5. Arayüz yükleme durumunu gösterir ve tekrar göndermeyi engeller.
6. Başarılı yanıtta WAV için yerleşik oynatıcı ve indirme düğmesi görünür.
7. Hatalar sade Türkçe mesajla gösterilir; kullanıcının girdileri kaybolmaz.

Referans için 15–30 saniye önerilir; servis teknik olarak 3–45 saniyeyi kabul eder. Sunucu tüm girişleri mono 24 kHz PCM WAV'a dönüştürür.

## 5. API sözleşmesi

### Site → aynı origin

`POST /api/tts`, `multipart/form-data`

- `text`: 1–500 karakter
- `reference`: desteklenen ses dosyası, en fazla 15 MB
- `consent`: `true`

Başarı: `200 audio/wav`, `Cache-Control: no-store`, indirme dosyası `ses-atolyesi.wav`.

Hata biçimi: `{ "error": "Kullanıcıya gösterilecek kısa mesaj" }`.

### Site sunucusu → Modal

Site route'u aynı formu `MODAL_TTS_URL` adresine iletir ve isteğe `Modal-Key` / `Modal-Secret` başlıklarını ekler. Böylece Modal adresi ve anahtarlar istemci paketine girmez. Ana ürüne taşınırken arayüz değil bu adaptör değiştirilir.

## 6. Güvenlik, gizlilik ve kötüye kullanım sınırları

- Açık rıza kutusu zorunludur; bu hukuki kimlik doğrulaması değildir, demo seviyesinde sürtünmedir.
- Ham referans ve çıktı loglanmaz, saklanmaz ve cache'lenmez.
- Dosya uzantısına güvenilmez; FFmpeg ile çözülebilirliği ve dönüştürülmüş ses süresi kontrol edilir.
- İstek boyutu, metin uzunluğu, dosya türü ve ses süresi iki katmanda doğrulanır.
- Modal Proxy Token maliyetli uç noktayı doğrudan internet kullanımına kapatır.
- Üretime geçerken kullanıcı kimliği, kota/rate limit, denetim kaydı, silme politikası ve açık sentetik medya etiketi eklenmelidir.

## 7. Operasyon ve hata davranışı

- Model `@modal.enter` ile kap başına bir kez yüklenir.
- `scaledown_window=300` ardışık demo isteklerinde soğuk başlangıç olasılığını azaltır; boşta GPU süresinin maliyeti kabul edilir.
- `min_containers=0` trafiksizken GPU maliyetini kapatır; ilk istek daha uzun sürebilir.
- 140 saniyelik işlev süresi, Modal'ın web isteği sınırının altında tutulur.
- Model hazır değilse/soğuk başlıyorsa kullanıcı aynı yükleme durumunda kalır; timeout veya upstream hata Türkçe mesaja çevrilir.
- Sağlık uç noktası yalnızca servis/model bilgisini döndürür, kullanıcı verisi içermez.

## 8. Kabul kriterleri

- Metin, dosya ve onay olmadan gönderim yapılamaz.
- Geçersiz tür, 15 MB üzeri dosya, 3 saniyeden kısa veya 45 saniyeden uzun ses reddedilir.
- Başarılı istek tarayıcıda oynatılabilen ve indirilebilen WAV döndürür.
- Model V3, Türkçe ve seçilen C profilinden sapmaz.
- Kullanıcı dosyaları kalıcı depoya yazılmaz.
- Site mobil ve masaüstünde tek sayfalı temel akışı eksiksiz sunar.
- Web build'i ve Python sözdizimi/temel doğrulama testleri geçer.
