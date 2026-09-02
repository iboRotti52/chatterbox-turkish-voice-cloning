const MAX_TEXT_LENGTH = 500;
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['wav', 'mp3', 'm4a', 'mp4', 'webm']);
const API_VERSION = '1';

const RESPONSE_HEADERS = {
  'Cache-Control': 'no-store',
  'X-TTS-API-Version': API_VERSION,
};

function errorResponse(error: string, status = 400) {
  return Response.json({ error }, { status, headers: RESPONSE_HEADERS });
}

export function GET() {
  return Response.json(
    {
      status: 'ok',
      apiVersion: API_VERSION,
      contract: {
        method: 'POST',
        contentType: 'multipart/form-data',
        fields: ['text', 'reference', 'consent'],
        response: 'audio/wav',
      },
    },
    { headers: RESPONSE_HEADERS },
  );
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorResponse('İstek okunamadı. Lütfen formu yeniden gönderin.');
  }

  const textValue = form.get('text');
  const text = typeof textValue === 'string' ? textValue.trim() : '';
  const reference = form.get('reference');
  const consentValue = form.get('consent');
  const consent = typeof consentValue === 'string' && consentValue.toLowerCase() === 'true';

  if (!text) return errorResponse('Lütfen okunacak metni yazın.');
  if (text.length > MAX_TEXT_LENGTH) return errorResponse(`Metin en fazla ${MAX_TEXT_LENGTH} karakter olabilir.`);
  if (!(reference instanceof File)) return errorResponse('Lütfen bir referans ses yükleyin.');
  if (!consent) return errorResponse('Sesi kullanma izniniz olduğunu onaylamalısınız.');
  if (!reference.size) return errorResponse('Ses dosyası boş görünüyor.');
  if (reference.size > MAX_FILE_BYTES) return errorResponse("Ses dosyası 15 MB'dan küçük olmalı.");

  const extension = reference.name.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return errorResponse('Bu ses biçimi desteklenmiyor. WAV, MP3, M4A veya WEBM kullanın.');
  }

  const upstreamUrl = process.env.MODAL_TTS_URL;
  const tokenId = process.env.MODAL_PROXY_TOKEN_ID;
  const tokenSecret = process.env.MODAL_PROXY_TOKEN_SECRET;
  if (!upstreamUrl || !tokenId || !tokenSecret) {
    return errorResponse('Ses servisi henüz yapılandırılmadı.', 503);
  }

  const upstreamForm = new FormData();
  upstreamForm.append('text', text);
  upstreamForm.append('reference', reference, reference.name);
  upstreamForm.append('consent', 'true');

  try {
    const response = await fetch(upstreamUrl, {
      method: 'POST',
      headers: { 'Modal-Key': tokenId, 'Modal-Secret': tokenSecret },
      body: upstreamForm,
      signal: AbortSignal.timeout(145_000),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string; detail?: string } | null;
      return errorResponse(payload?.error || payload?.detail || 'Ses servisi isteği tamamlayamadı.', response.status);
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Disposition': 'attachment; filename="ses-atolyesi.wav"',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'X-TTS-API-Version': API_VERSION,
      },
    });
  } catch (upstreamError) {
    if (upstreamError instanceof Error && upstreamError.name === 'TimeoutError') {
      return errorResponse('Ses oluşturma zaman aşımına uğradı. Daha kısa bir metinle tekrar deneyin.', 504);
    }
    return errorResponse('Ses servisine şu anda ulaşılamıyor. Lütfen tekrar deneyin.', 502);
  }
}
