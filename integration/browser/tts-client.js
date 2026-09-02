/**
 * Framework-independent browser client for the Turkish TTS gateway.
 * Keep endpoint same-origin whenever possible (default: /api/tts).
 */
export async function createTurkishSpeech({
  text,
  reference,
  consent,
  endpoint = '/api/tts',
  signal,
}) {
  const normalizedText = String(text ?? '').trim();

  if (!normalizedText) throw new Error('Lütfen okunacak metni yazın.');
  if (normalizedText.length > 500) throw new Error('Metin en fazla 500 karakter olabilir.');
  if (!(reference instanceof File)) throw new Error('Lütfen bir referans ses yükleyin.');
  if (!consent) throw new Error('Sesi kullanma izniniz olduğunu onaylamalısınız.');

  const form = new FormData();
  form.append('text', normalizedText);
  form.append('reference', reference, reference.name);
  form.append('consent', 'true');

  const response = await fetch(endpoint, {
    method: 'POST',
    body: form,
    signal,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error || 'Ses oluşturulamadı. Lütfen tekrar deneyin.');
  }

  const blob = await response.blob();
  if (!blob.type.startsWith('audio/')) {
    throw new Error('Sunucu beklenen ses dosyasını döndürmedi.');
  }

  return blob;
}
