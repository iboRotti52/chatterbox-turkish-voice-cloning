const MAX_TEXT_LENGTH = 500;
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['wav', 'mp3', 'm4a', 'mp4', 'webm']);

function allowedOrigin(request, env) {
  const origin = request.headers.get('Origin');
  const allowed = String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return origin && allowed.includes(origin) ? origin : null;
}

function corsHeaders(origin) {
  return {
    ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Cache-Control': 'no-store',
    Vary: 'Origin',
    'X-TTS-API-Version': '1',
  };
}

function json(error, status, origin) {
  return Response.json({ error }, { status, headers: corsHeaders(origin) });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = allowedOrigin(request, env);

    if (request.method === 'OPTIONS') {
      return origin
        ? new Response(null, { status: 204, headers: corsHeaders(origin) })
        : json('Bu site için erişim izni yok.', 403, null);
    }

    if (url.pathname === '/health' && request.method === 'GET') {
      return Response.json({ status: 'ok', apiVersion: '1' }, { headers: corsHeaders(origin) });
    }

    if (url.pathname !== '/api/tts' || request.method !== 'POST') {
      return json('Bulunamadı.', 404, origin);
    }

    if (!origin) return json('Bu site için erişim izni yok.', 403, null);

    let form;
    try {
      form = await request.formData();
    } catch {
      return json('İstek okunamadı.', 400, origin);
    }

    const text = String(form.get('text') || '').trim();
    const reference = form.get('reference');
    const consent = String(form.get('consent') || '').toLowerCase() === 'true';

    if (!text) return json('Lütfen okunacak metni yazın.', 400, origin);
    if (text.length > MAX_TEXT_LENGTH) return json('Metin en fazla 500 karakter olabilir.', 400, origin);
    if (!(reference instanceof File)) return json('Lütfen bir referans ses yükleyin.', 400, origin);
    if (!consent) return json('Sesi kullanma izniniz olduğunu onaylamalısınız.', 400, origin);
    if (!reference.size || reference.size > MAX_FILE_BYTES) return json('Ses dosyası 1 byte–15 MB arasında olmalı.', 400, origin);

    const extension = reference.name.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      return json('Bu ses biçimi desteklenmiyor.', 400, origin);
    }

    if (!env.MODAL_TTS_URL || !env.MODAL_PROXY_TOKEN_ID || !env.MODAL_PROXY_TOKEN_SECRET) {
      return json('Ses servisi yapılandırılmadı.', 503, origin);
    }

    const upstream = new FormData();
    upstream.append('text', text);
    upstream.append('reference', reference, reference.name);
    upstream.append('consent', 'true');

    try {
      const response = await fetch(env.MODAL_TTS_URL, {
        method: 'POST',
        headers: {
          'Modal-Key': env.MODAL_PROXY_TOKEN_ID,
          'Modal-Secret': env.MODAL_PROXY_TOKEN_SECRET,
        },
        body: upstream,
        signal: AbortSignal.timeout(145_000),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        return json(payload?.error || payload?.detail || 'Ses servisi isteği tamamlayamadı.', response.status, origin);
      }

      const headers = corsHeaders(origin);
      headers['Content-Type'] = 'audio/wav';
      headers['Content-Disposition'] = 'attachment; filename="ses-atolyesi.wav"';
      headers['X-Content-Type-Options'] = 'nosniff';
      return new Response(response.body, { status: 200, headers });
    } catch (error) {
      const timedOut = error instanceof Error && error.name === 'TimeoutError';
      return json(
        timedOut ? 'Ses oluşturma zaman aşımına uğradı.' : 'Ses servisine şu anda ulaşılamıyor.',
        timedOut ? 504 : 502,
        origin,
      );
    }
  },
};
