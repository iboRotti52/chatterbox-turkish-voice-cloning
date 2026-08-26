# Katkı rehberi

## Yerel geliştirme

1. `./scripts/setup_macos.sh` ile ortamı kurun.
2. Kendi sesinizi `chatterbox-v3/inputs/` altına koyun.
3. Küçük bir metinle `generate_tr.py` çalıştırın.
4. Kod değişikliklerinden sonra en azından aşağıdaki kontrolleri yapın:

```bash
./chatterbox-v3/.venv/bin/python -m compileall -q chatterbox-v3
./chatterbox-v3/.venv/bin/python chatterbox-v3/generate_tr.py --help
./chatterbox-v3/.venv/bin/python chatterbox-v3/compare_tr.py --help
./chatterbox-v3/.venv/bin/python chatterbox-v3/benchmark_m4.py --help
```

## Git güvenliği

Aşağıdakileri commit etmeyin:

- Kişisel veya izin durumu belirsiz ses kayıtları
- Üretilen klon sesler
- Model ağırlıkları ve Hugging Face önbelleği
- `.venv` veya klonlanmış upstream kaynak klasörü
- Anahtarlar, token'lar ve `.env` dosyaları

Commit öncesinde mutlaka kontrol edin:

```bash
git status --short
git diff --cached --stat
git ls-files | grep -E '\.(wav|m4a|mp3|flac|safetensors|ckpt|pt|pth|bin)$'
```

Son komut çıktı vermemelidir.

## Performans sonuçları

Yeni bir cihaz sonucu eklerken şunları kaydedin:

- Cihaz/çip, RAM ve işletim sistemi
- PyTorch ve Chatterbox commit'i
- `device` (`cpu`, `mps`, `cuda`)
- Referans süresi ve üretilen ses süresi
- Modelin önceden yüklü olup olmadığı
- Duvar saati süresi ve RTF
- Isınma turu yapılıp yapılmadığı

Kişisel metin veya ses dosyasını değil, yalnızca ölçüm metadatasını paylaşın.
