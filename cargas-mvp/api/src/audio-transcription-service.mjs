const DEFAULT_ENDPOINT = 'https://api.openai.com/v1/audio/transcriptions';
const DEFAULT_MODEL = 'gpt-4o-mini-transcribe';

export const TRANSPORT_PROMPT = [
  'Audio operativo de transporte de cargas en Argentina y Sudamérica.',
  'Conservar con precisión nombres de localidades, empresas, rutas, fechas, horarios, toneladas y tarifas.',
  'Vocabulario frecuente: camión, tractor, semirremolque, chasis, acoplado, sider, batea, furgón, cereal, soja, maíz, trigo, fertilizante, carga, descarga, fletero.'
].join(' ');

export function createOpenAITranscriber({
  apiKey = process.env.OPENAI_API_KEY,
  model = process.env.OPENAI_TRANSCRIPTION_MODEL || DEFAULT_MODEL,
  endpoint = DEFAULT_ENDPOINT,
  fetchImpl = globalThis.fetch
} = {}) {
  return async function transcribeAudio({
    bytes,
    filename = 'audio.ogg',
    mimeType = 'audio/ogg',
    language = 'es',
    prompt = TRANSPORT_PROMPT
  } = {}) {
    if (!apiKey) throw Object.assign(new Error('OPENAI_API_KEY no configurado'), { status: 503 });
    if (!fetchImpl) throw new Error('fetch no disponible');
    if (!bytes || Number(bytes.byteLength ?? bytes.length ?? 0) === 0) throw new Error('audio vacío');

    const form = new FormData();
    form.append('file', new Blob([bytes], { type: mimeType }), filename);
    form.append('model', model);
    if (language) form.append('language', language);
    if (prompt) form.append('prompt', prompt);

    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form
    });

    let payload = null;
    try { payload = await response.json(); } catch { payload = {}; }

    if (!response.ok) {
      const detail = payload?.error?.message || `transcription_http_${response.status}`;
      throw Object.assign(new Error(detail), { status: response.status });
    }

    const text = String(payload?.text || '').trim();
    if (!text) throw new Error('transcripción vacía');

    return {
      text,
      model,
      language,
      usage: payload?.usage || null
    };
  };
}
