# Performans, kapasite ve cihaz karşılaştırması

Bu dosya **ölçülmüş**, **hesaplanmış** ve **dış kaynak/varsayım** sayılarını birbirine karıştırmamak için ayrı tutar.

## Ölçülmüş yerel sonuç

Koşullar:

- Apple M4, 10 çekirdek, 16 GB birleşik bellek
- Chatterbox Multilingual V3, sabitlenmiş upstream commit
- PyTorch CPU
- C profili: `0.4 / 0.5 / 0.7`
- Aynı referans ve aynı Türkçe metin

| Aşama | Duvar saati |
|---|---:|
| Modeli belleğe yükleme | 13,118 sn |
| Zero-shot yeni referansı hazırlama | 1,520 sn |
| 5,84 sn sesi üretme — 4 thread | 20,581 sn |
| 5,84 sn sesi üretme — 6 thread | 23,302 sn |
| 5,84 sn sesi üretme — 10 thread | 22,905 sn |

4-thread sonucunun RTF değeri:

```text
RTF = 20,581 / 5,84 = 3,524
```

Yani bu koşulda bir saniye ses için yaklaşık 3,52 saniye hesaplama gerekti. Tepe süreç belleği 3,312 GiB ölçüldü.

## Model zaten yüklüyken 5 saniyelik istek

Aynı RTF'nin yaklaşık doğrusal kaldığını varsayan hesap:

```text
üretim = 5,0 × 3,524 = 17,62 sn
yeni referans dahil = 17,62 + 1,52 = 19,14 sn
```

Bu iki sayı **hesaplanmış tahmindir**, doğrudan 5,00 saniyelik çıktı ölçümü değildir:

- Model yüklü + referans daha önce hazırlanmış: yaklaşık **17,6 sn**
- Model yüklü + zero-shot yeni referans: yaklaşık **19,1 sn**
- Soğuk başlangıç: bunlara yaklaşık **13,1 sn model yükleme** eklenir

Gerçek süre metnin token sayısı, noktalama, çıkan sesin gerçek uzunluğu, seed, sıcaklık, termal durum ve arka plan yüküne göre değişir.

## Başka cihazları neden yalnızca TFLOPS ile hesaplamıyoruz?

Teorik TFLOPS oranı tek başına güvenilir TTS süresi vermez. Chatterbox hattında metin modeli, akış/difüzyon benzeri üretim, decoder, bellek aktarımı ve bazı cihazlarda CPU fallback birlikte rol oynar. Ayrıca PyTorch kernel kalitesi cihazdan cihaza değişir.

Güvenilir karşılaştırma yöntemi:

1. Model commit'i, PyTorch sürümü, metin, referans, seed ve ayarları sabitleyin.
2. Modeli bir kez yükleyin.
3. Bir ısınma üretimi yapın; bunu rapora katmayın.
4. En az 10 tekrar yapıp medyan ve p95 süreyi alın.
5. Referans hazırlama ile üretimi ayrı raporlayın.
6. Üretilen ses uzunluğunu kaydedip RTF hesaplayın.

## Cihaz planlama tablosu

Aşağıdaki satırlardan yalnızca ilk satır bu projede ölçülmüştür. Diğerleri gerçek benchmark tamamlanana kadar boş bırakılmıştır; kesinmiş gibi tahmin yazılmamıştır.

| Cihaz | Backend | Model yüklü | Yeni referans | 5 sn üretim | Durum |
|---|---|---:|---:|---:|---|
| Apple M4 16 GB | CPU, 4 thread | Evet | 1,520 sn | ~17,62 sn | Yerel ölçümden hesap |
| Apple M4 16 GB | MPS | — | — | — | Ölçülmeli |
| NVIDIA T4 | CUDA | — | — | — | Ölçülmeli |
| NVIDIA L4 | CUDA | — | — | — | Ölçülmeli |
| NVIDIA A10G | CUDA | — | — | — | Ölçülmeli |
| NVIDIA A100 | CUDA | — | — | — | Ölçülmeli |
| NVIDIA H100 | CUDA | — | — | — | Ölçülmeli |

Upstream README, Multilingual V3'ü 500M parametreli model olarak tanımlar ve `cpu`, `mps`, `cuda` kullanımını gösterir; ancak V3 için bu cihazların hepsinde aynı protokolle hazırlanmış gecikme tablosu sunmaz. Bu nedenle satın alma/kapasite kararında hedef GPU üzerinde bu deponun benchmark aracı çalıştırılmalıdır.

## Servis süresini kısaltma seçenekleri

Etki sırasına göre pratik seçenekler:

1. Modeli sürekli bellekte tutun; istek başına yüklemeyin.
2. İzinli ve sık kullanılan referans koşullamasını önceden hesaplayın.
3. Hedef makinede CPU, MPS ve CUDA'yı aynı testle ölçün.
4. Metni kısa cümlelere bölerek ilk ses parçasını daha erken döndürün.
5. Streaming/servis mimarisi varsa ilk parçayı tüm metni beklemeden istemciye gönderin.
6. PyTorch sürümü, derleme modu, precision ve kernel optimizasyonlarını ses kalitesini kontrol ederek deneyin.
7. Çoklu isteklerde körlemesine eşzamanlılık yerine kuyruk ve kontrollü batching kullanın.

Her optimizasyonda yalnızca süreyi değil; konuşmacı benzerliği, doğallık, halüsinasyon, VRAM/RAM ve p95 gecikmeyi birlikte izleyin.
