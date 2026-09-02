# Ana site entegrasyon paketi

Bu klasör, mevcut Modal TTS servisini başka bir frontend'e bağlamak için gereken taşınabilir parçaları içerir.

- `browser/tts-client.js`: Formdan gönderim yapan çerçeve-bağımsız tarayıcı yardımcısı
- `nextjs/app/api/tts/route.ts`: Next.js/Vercel için sunucu tarafı adaptör
- `cloudflare-worker/`: Tamamen statik siteler için ayrı edge adaptörü
- `openapi.yaml`: Değişmeyecek API sözleşmesi

Kurulum sırası ve güvenlik notları için `docs/FRONTEND_INTEGRATION_GUIDE.md` dosyasını kullanın. Modal Proxy Token değerlerini hiçbir zaman frontend koduna, Git deposuna veya `NEXT_PUBLIC_*` değişkenlerine koymayın.
