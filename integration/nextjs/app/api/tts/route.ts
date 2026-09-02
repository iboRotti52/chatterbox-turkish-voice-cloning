// Drop-in Next.js App Router gateway. Keep this file server-side.

const MAX_TEXT_LENGTH = 500;
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['wav', 'mp3', 'm4a', 'mp4', 'webm']);

function errorResponse(error: string, status = 400) {
  return Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorResponse('İstek okunamadı. Lütfen formu yeniden gönderin.');
  }

  const rawText = form.get('text');
  const text = typeof rawText === 'string' ? rawText.trim() : '';
  const reference = form.get('reference');
  const consent = String(form.get('consent') ?? '').toLowerCase() === 'true';

  if (!text) return errorResponse('Lütfen okunacak metni yazın.');
  if (text.length > MAX_TEXT_LENGTH) return errorResponse(`Metin en fazla ${MAX_TEXT_LENGTH} karakter olabilir.`);
  if (!(reference instanceof File)) return errorResponse('Lütfen bir referans ses yükleyin.');
  if (!consent) return errorResponse('Sesi kullanma izniniz olduğunu onaylamalısınız.');
  if (!reference.size) return errorResponse('Ses dosyası boş görünüyor.');
  if (reference.size > MAX_FILE_BYTES) return errorResponse("Ses dosyası 15 MB'dan küçük olmalı.");

  const extension = reference.name.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return errorResponse('Bu ses biçimi desteklenmiyor. WAV, MP3, M4A, MP4 veya WEBM kullanın.');
  }

  const modalUrl = process.env.MODAL_TTS_URL;
  const tokenId = process.env.MODAL_PROXY_TOKEN_ID;
  const tokenSecret = process.env.MODAL_PROXY_TOKEN_SECRET;
  if (!modalUrl || !tokenId || !tokenSecret) {
    return errorResponse('Ses servisi yapılandırılmadı.', 503);
  }

  const upstream = new FormData();
  upstream.append('text', text);
  upstream.append('reference', reference, reference.name);
  upstream.append('consent', 'true');

  try {
    const response = await fetch(modalUrl, {
      method: 'POST',
      headers: { 'Modal-Key': tokenId, 'Modal-Secret': tokenSecret },
      body: upstream,
      signal: AbortSignal.timeout(145_000),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string; detail?: string } | null;
      return errorResponse(payload?.error || payload?.detail || 'Ses servisi isteği tamamlayamadı.', response.status);
    }

    return new Response(response.body, {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Disposition': 'attachment; filename="ses-atolyesi.wav"',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'X-TTS-API-Version': '1',
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      return errorResponse('Ses oluşturma zaman aşımına uğradı. Daha kısa bir metinle tekrar deneyin.', 504);
    }
    return errorResponse('Ses servisine şu anda ulaşılamıyor. Lütfen tekrar deneyin.', 502);
  }
}
