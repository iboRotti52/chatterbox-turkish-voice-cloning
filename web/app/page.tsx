'use client';

import { type ChangeEvent, type DragEvent, type SyntheticEvent, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  AudioLines,
  Check,
  Download,
  FileAudio,
  Mic2,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const MAX_TEXT_LENGTH = 500;
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ['wav', 'mp3', 'm4a', 'mp4', 'webm'];

function formatBytes(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.0', '')} MB`;
}

function validateFile(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!ACCEPTED_EXTENSIONS.includes(extension)) {
    return 'Bu ses biçimi desteklenmiyor. WAV, MP3, M4A veya WEBM kullanın.';
  }
  if (file.size > MAX_FILE_BYTES) return "Ses dosyası 15 MB'dan küçük olmalı.";
  if (file.size === 0) return 'Ses dosyası boş görünüyor.';
  return null;
}

export default function Home() {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [resultUrl]);

  const chooseFile = (selected: File | null) => {
    if (!selected) return;
    const validationError = validateFile(selected);
    if (validationError) {
      setFile(null);
      setError(validationError);
      return;
    }
    setFile(selected);
    setError(null);
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
      setResultUrl(null);
    }
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    chooseFile(event.target.files?.[0] ?? null);
    event.target.value = '';
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsDragging(false);
    chooseFile(event.dataTransfer.files?.[0] ?? null);
  };

  const reset = () => {
    setText('');
    setFile(null);
    setConsent(false);
    setError(null);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
  };

  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file || !text.trim() || !consent || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
      setResultUrl(null);
    }

    const formData = new FormData();
    formData.append('text', text.trim());
    formData.append('reference', file);
    formData.append('consent', 'true');

    try {
      const response = await fetch('/api/tts', { method: 'POST', body: formData });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || 'Ses oluşturulamadı. Lütfen tekrar deneyin.');
      }
      const audio = await response.blob();
      setResultUrl(URL.createObjectURL(audio));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Beklenmeyen bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = Boolean(text.trim() && file && consent && !isSubmitting);

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_12%_0%,oklch(0.91_0.07_67/.5),transparent_32%),radial-gradient(circle_at_92%_88%,oklch(0.9_0.06_190/.45),transparent_30%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1180px] flex-col px-5 pb-10 pt-6 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-[14px] bg-primary text-primary-foreground shadow-[0_10px_30px_oklch(0.27_0.055_240/.18)]">
              <AudioLines className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="font-heading text-[15px] font-bold tracking-[-0.02em]">Ses Atölyesi</p>
              <p className="text-[11px] text-muted-foreground">Türkçe zero-shot ses üretimi</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/80 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
            <span className="size-1.5 rounded-full bg-[#2aa879] shadow-[0_0_0_4px_rgb(42_168_121/12%)]" />
            Demo
          </span>
        </header>

        <section className="mx-auto grid w-full flex-1 items-center gap-10 py-12 lg:grid-cols-[0.78fr_1.22fr] lg:py-16">
          <div className="max-w-lg">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#d8cec1] bg-white/55 px-3 py-1.5 text-xs font-semibold text-[#7d513f] backdrop-blur">
              <Sparkles className="size-3.5" aria-hidden="true" />
              Chatterbox Multilingual V3
            </div>
            <h1 className="font-heading text-[clamp(2.6rem,6vw,5.15rem)] font-bold leading-[0.92] tracking-[-0.065em] text-balance">
              Metnin, seçtiğin sesle konuşsun.
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-muted-foreground sm:text-lg">
              Kısa bir Türkçe metin yaz, izinli bir ses örneği ekle. Model sesi taklit ederek yeni bir WAV üretir.
            </p>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-2"><ShieldCheck className="size-4 text-[#2a8b70]" /> Kayıtlar saklanmaz</span>
              <span className="inline-flex items-center gap-2"><Mic2 className="size-4 text-[#c56243]" /> 15–30 sn önerilir</span>
            </div>
          </div>

          <form onSubmit={submit} className="rounded-[30px] border border-white/70 bg-card/88 p-4 shadow-[0_28px_80px_rgb(48_38_28/12%)] backdrop-blur-md sm:p-6">
            <div className="mb-6 flex items-center justify-between border-b border-border/70 pb-5">
              <div>
                <p className="font-heading text-lg font-bold tracking-tight">Yeni ses oluştur</p>
                <p className="mt-1 text-xs text-muted-foreground">İki adım, tek çıktı.</p>
              </div>
              <span className="rounded-full bg-secondary px-2.5 py-1 font-mono text-[10px] font-semibold tracking-wide text-secondary-foreground">TR · V3</span>
            </div>

            <div className="space-y-5">
              <label className="block" htmlFor="tts-text">
                <span className="mb-2 flex items-center justify-between text-sm font-semibold">
                  Okunacak metin
                  <span className={text.length === MAX_TEXT_LENGTH ? 'font-normal text-[#b85a3d]' : 'font-normal text-muted-foreground'}>{text.length} / {MAX_TEXT_LENGTH}</span>
                </span>
                <Textarea
                  id="tts-text"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  maxLength={MAX_TEXT_LENGTH}
                  disabled={isSubmitting}
                  className="min-h-32 resize-none rounded-2xl border-border bg-[#fbfaf7] p-4 text-base leading-6 shadow-inner shadow-black/[0.02]"
                  placeholder="Örn. Merhaba, bu cümle kısa bir ses örneğiyle üretildi."
                  aria-label="Okunacak metin"
                />
              </label>

              <div>
                <p className="mb-2 text-sm font-semibold">Referans ses</p>
                {file ? (
                  <div className="flex min-h-24 items-center gap-3 rounded-2xl border border-[#bcd4cb] bg-[#f2f8f5] p-4">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-[#27775f] shadow-sm"><FileAudio className="size-5" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{file.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatBytes(file.size)} · Yüklemeye hazır</p>
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => setFile(null)} disabled={isSubmitting} aria-label="Ses dosyasını kaldır">
                      <X className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                  <input ref={fileInputRef} id="reference-audio" type="file" className="sr-only" accept="audio/wav,audio/mpeg,audio/mp4,audio/x-m4a,audio/webm" onChange={handleFileInput} disabled={isSubmitting} />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    onDragEnter={() => setIsDragging(true)}
                    onDragLeave={() => setIsDragging(false)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={handleDrop}
                    className={`group grid min-h-36 cursor-pointer place-items-center rounded-2xl border border-dashed px-5 py-6 text-center transition focus-within:ring-3 focus-within:ring-ring/40 ${isDragging ? 'border-[#c56243] bg-[#fbf0e6]' : 'border-[#cab9a7] bg-[#faf7f1] hover:border-[#c56243] hover:bg-[#fbf4ed]'}`}
                    aria-label="Referans ses dosyası seç"
                  >
                    <span>
                      <span className="mx-auto mb-3 grid size-10 place-items-center rounded-full bg-white text-[#b85a3d] shadow-sm">
                        <Upload className="size-4.5" aria-hidden="true" />
                      </span>
                      <span className="block text-sm font-semibold">Ses dosyasını buraya bırak</span>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">veya seçmek için tıkla · WAV, MP3, M4A, WEBM · en fazla 15 MB</span>
                    </span>
                  </button>
                  </>
                )}
              </div>

              <label htmlFor="voice-consent" className="flex cursor-pointer items-start gap-3 rounded-2xl bg-secondary/60 p-3.5 text-xs leading-5 text-muted-foreground">
                <input
                  id="voice-consent"
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                  disabled={isSubmitting}
                  aria-label="Ses kullanım izni onayı"
                  className="mt-0.5 size-4 shrink-0 accent-[#c56243]"
                />
                Bu sesi kullanma iznim olduğunu ve üretimin yapay ses olduğunu kabul ediyorum.
              </label>

              {error && (
                <div role="alert" className="flex items-start gap-2.5 rounded-2xl border border-[#efc9be] bg-[#fff4f0] p-3.5 text-xs leading-5 text-[#91472f]">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {isSubmitting && (
                <div className="overflow-hidden rounded-2xl border border-[#ccd8dd] bg-[#f3f7f8] p-4" aria-live="polite">
                  <div className="flex items-center gap-3">
                    <Spinner className="size-4 text-primary" />
                    <div>
                      <p className="text-sm font-semibold">Ses hazırlanıyor…</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">İlk deneme, model uyanırken biraz daha uzun sürebilir.</p>
                    </div>
                  </div>
                  <div className="mt-4 flex h-7 items-end gap-1" aria-hidden="true">
                    {[28, 56, 38, 82, 52, 70, 34, 62, 44, 76, 48, 30].map((height, index) => (
                      <span key={index} className="voice-bar w-full rounded-full bg-[#5e8997]" style={{ height: `${height}%`, animationDelay: `${index * 80}ms` }} />
                    ))}
                  </div>
                </div>
              )}

              {resultUrl && !isSubmitting && (
                <div className="rounded-2xl border border-[#bcd4cb] bg-[#f1f8f5] p-4" aria-live="polite">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#23664f]"><span className="grid size-6 place-items-center rounded-full bg-[#d8eee5]"><Check className="size-3.5" /></span> Sesin hazır</div>
                  <audio controls className="h-10 w-full" src={resultUrl}>
                    <track
                      default
                      kind="captions"
                      srcLang="tr"
                      label="Türkçe metin"
                      src={`data:text/vtt;charset=utf-8,${encodeURIComponent(`WEBVTT\n\n00:00.000 --> 00:59.000\n${text}`)}`}
                    />
                    Tarayıcınız ses oynatmayı desteklemiyor.
                  </audio>
                  <div className="mt-3 flex gap-2">
                    <a href={resultUrl} download="ses-atolyesi.wav" className={cn(buttonVariants({ variant: 'outline' }), 'h-9 flex-1 rounded-xl bg-white')}><Download className="size-4" /> WAV indir</a>
                    <Button type="button" variant="ghost" className="h-9 rounded-xl" onClick={reset}><RotateCcw className="size-4" /> Yeni ses</Button>
                  </div>
                </div>
              )}

              {!resultUrl && (
                <Button type="submit" disabled={!canSubmit} className="h-12 w-full rounded-2xl bg-[#213844] text-sm font-bold shadow-[0_12px_26px_rgb(33_56_68/20%)] hover:bg-[#2a4654]">
                  {isSubmitting ? <><Spinner /> Oluşturuluyor</> : <><AudioLines className="size-4.5" /> Sesi oluştur</>}
                </Button>
              )}
            </div>
          </form>
        </section>

        <footer className="flex flex-col gap-2 border-t border-border/70 pt-5 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>Yalnızca kendi sesinizi veya kullanım izniniz olan bir sesi yükleyin.</span>
          <span>Üretilen ses görünmez bir yapay ses filigranı içerir.</span>
        </footer>
      </div>
    </main>
  );
}
