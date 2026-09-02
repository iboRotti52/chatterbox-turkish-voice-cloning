# Mevcut frontend'e Türkçe zero-shot TTS ekleme rehberi

## Sonuçta kurulacak yapı

```text
Arkadaşlarınızın mevcut frontend'i
              │  POST /api/tts
              ▼
Küçük sunucu/edge adaptörü (anahtarlar burada)
              │  korumalı istek
              ▼
Modal L4 GPU + Chatterbox Multilingual V3
              │
              ▼
            WAV
```

Frontend doğrudan Modal'ı çağırmamalıdır. Modal Proxy Token bir tarayıcı paketine, `NEXT_PUBLIC_*` değişkenine veya Git deposuna konursa herkes tarafından görülebilir ve GPU maliyeti kötüye kullanılabilir.

## Hazır parçalar

| Dosya | Ne zaman kullanılır? |
|---|---|
| `integration/browser/tts-client.js` | Her frontend'de form isteğini göndermek için |
| `integration/nextjs/app/api/tts/route.ts` | Site Next.js/Vercel veya App Router kullanıyorsa |
| `integration/cloudflare-worker/worker.mjs` | Site gerçekten yalnızca statik dosyalardan oluşuyorsa |
| `integration/openapi.yaml` | API alanlarını, cevapları ve sınırları görmek için |

## Seçenek A — Next.js veya sunucu fonksiyonu olan bir hosting

1. `integration/nextjs/app/api/tts/route.ts` dosyasını ana sitenin `app/api/tts/route.ts` konumuna kopyalayın.
2. Hosting panelinin **server-side environment variables / secrets** bölümüne aşağıdaki üç değeri ekleyin:

```text
MODAL_TTS_URL=https://ibrahimgozlukaya--chatterbox-turkish-demo-turkishvoicese-f7ce7c.modal.run/tts
MODAL_PROXY_TOKEN_ID=<ayrı entegrasyon token kimliği>
MODAL_PROXY_TOKEN_SECRET=<ayrı entegrasyon token gizli değeri>
```

3. Bu değişkenlerin hiçbirinin başına `NEXT_PUBLIC_` koymayın.
4. Frontend formu aynı alan adındaki `/api/tts` yoluna göndersin.
5. Hosting'in istek gövdesi sınırının en az 15 MB, zaman aşımının en az 145 saniye olduğundan emin olun. Sağlayıcı bu süreyi desteklemiyorsa aşağıdaki Worker seçeneğini kullanın.

## Seçenek B — Tamamen statik frontend

Statik HTML/React/Vue çıktısı tek başına sır saklayamaz. Bu durumda `integration/cloudflare-worker/` klasörü bağımsız bir edge adaptörü olarak yayınlanır.

1. `wrangler.toml.example` dosyasını `wrangler.toml` olarak kopyalayın.
2. `ALLOWED_ORIGINS` değerine ana sitenin kesin production ve gerekiyorsa preview adreslerini yazın. `*` kullanmayın.
3. `MODAL_PROXY_TOKEN_ID` ve `MODAL_PROXY_TOKEN_SECRET` değerlerini Worker secret olarak ekleyin; dosyaya yazmayın.
4. Worker'ı `api.ornek-site.com` benzeri bir alt alan adına bağlayın.
5. Frontend yardımcısında endpoint'i `https://api.ornek-site.com/api/tts` olarak verin.

Origin allowlist yalnızca tarayıcı erişimini sınırlar; tek başına güçlü kimlik doğrulama veya maliyet koruması değildir. Halka açık üretimde Cloudflare rate limiting/WAF, kullanıcı başına kota veya oturum kontrolü ekleyin.

## Frontend kullanım örneği

```js
import { createTurkishSpeech } from './tts-client.js';

const controller = new AbortController();

try {
  const wav = await createTurkishSpeech({
    text: textArea.value,
    reference: fileInput.files[0],
    consent: consentCheckbox.checked,
    endpoint: '/api/tts',
    signal: controller.signal,
  });

  const previousUrl = audioPlayer.dataset.objectUrl;
  if (previousUrl) URL.revokeObjectURL(previousUrl);

  const objectUrl = URL.createObjectURL(wav);
  audioPlayer.src = objectUrl;
  audioPlayer.dataset.objectUrl = objectUrl;
  audioPlayer.play();
} catch (error) {
  errorBox.textContent = error instanceof Error ? error.message : 'Ses oluşturulamadı.';
}
```

Formda şu üç alan zorunludur:

- `text`: 1–500 karakter Türkçe metin
- `reference`: WAV, MP3, M4A, MP4 veya WEBM; en fazla 15 MB ve 3–45 saniye
- `consent`: yalnızca kullanıcı açıkça onayladıysa `true`

Başarılı yanıt `audio/wav` dosyasıdır. Hatalar `{ "error": "..." }` biçiminde JSON döner.

## Entegrasyon kabul listesi

- Modal anahtarları yalnızca sunucu/Worker secret alanında bulunuyor.
- Tarayıcı kodunda veya kaynak haritasında anahtar yok.
- Form; boş metni, eksik dosyayı ve onaysız gönderimi engelliyor.
- Gönderim sırasında düğme devre dışı ve kullanıcı bekleme durumunu görüyor.
- Dönen WAV oynatılabiliyor ve indirilebiliyor.
- Yeni ses seçildiğinde eski `ObjectURL`, `URL.revokeObjectURL` ile serbest bırakılıyor.
- Hatalar kullanıcı girdisini silmeden gösteriliyor.
- Sitede sentetik ses olduğu ve yalnızca izinli seslerin kullanılabileceği açıkça yazıyor.
- Production öncesinde kullanıcı/IP kotası ve kötüye kullanım alarmı bulunuyor.

## Anahtar teslimi ve operasyon

Ana site için demo token'ını paylaşmak yerine ayrı bir Modal Proxy Token oluşturun. Token değerlerini sohbet veya e-posta ile değil, hosting'in secret yönetimi ya da ekip parola kasasıyla aktarın. Bir değer yanlışlıkla Git'e girerse token'ı hemen iptal edip yenisini oluşturun.

Model servisi trafiksizken kapanır. Bu nedenle ilk istek 60–90 saniye sürebilir; sıcak istekler daha hızlıdır. Frontend en az 145 saniyelik bekleme durumu göstermeli ve aynı isteğin art arda gönderilmesini engellemelidir.

## Değişmeden kalacak API sözleşmesi

Ana site tasarımı, teknoloji yığını veya hosting değişse bile browser tarafı yalnızca `POST /api/tts` sözleşmesini bilmelidir. Model sağlayıcısı ileride değişirse aynı cevap biçimini koruyan adaptör güncellenir; form bileşeni değişmez.
