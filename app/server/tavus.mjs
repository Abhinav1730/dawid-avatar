import { createHash } from 'node:crypto';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const systemPrompt = readFileSync(new URL('./system-prompt.txt', import.meta.url), 'utf8');
export const promptHash = createHash('sha256').update(systemPrompt).digest('hex');
export class AppError extends Error {
  constructor(code, message, status = 503) { super(message); this.code = code; this.status = status; }
}

export function makeTavus({ env = process.env, fetcher = fetch, stateFile = path.join(root, '.private', 'tavus-state.json') } = {}) {
  let state = {};
  try { if (existsSync(stateFile)) state = JSON.parse(readFileSync(stateFile, 'utf8')); } catch { /* A corrupt cache is not trusted. */ }
  let personaPromise;
  const config = () => {
    try { if (existsSync(stateFile)) state = JSON.parse(readFileSync(stateFile, 'utf8')); } catch { /* Keep the last valid local state. */ }
    return {
    key: env.TAVUS_API_KEY?.trim(),
    face: env.TAVUS_FACE_ID?.trim() || state.faceId,
    portraitFace: env.TAVUS_PORTRAIT_FACE_ID?.trim() || state.portraitFaceId,
    voice: env.TAVUS_VOICE_ID?.trim() || state.voiceId,
    pal: env.TAVUS_PAL_ID?.trim() || ((env.TAVUS_FACE_ID?.trim() || state.faceId) ? state.palId : state.portraitPalId),
    };
  };
  function save(next) {
    state = { ...state, ...next };
    mkdirSync(path.dirname(stateFile), { recursive: true });
    writeFileSync(stateFile, JSON.stringify(state, null, 2), { mode: 0o600 });
  }
  async function request(route, { method = 'GET', body } = {}) {
    const { key } = config();
    if (!key) throw new AppError('MISSING_API_KEY', 'The Tavus connection has not been configured.');
    let response;
    try {
      response = await fetcher(`https://tavusapi.com/v2/${route}`, {
        method,
        headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(25_000),
      });
    } catch { throw new AppError('PROVIDER_UNREACHABLE', 'Tavus could not be reached. Please try again.'); }
    let data;
    try { const raw = await response.text(); data = raw ? JSON.parse(raw) : {}; }
    catch { throw new AppError('PROVIDER_RESPONSE', 'Tavus returned an unreadable response.'); }
    if (!response.ok) {
      // Do not forward provider bodies: they may contain request details or credentials.
      const code = response.status === 401 || response.status === 403 ? 'PROVIDER_AUTH' : response.status === 429 ? 'PROVIDER_LIMIT' : 'PROVIDER_REJECTED';
      const message = code === 'PROVIDER_AUTH' ? 'Tavus rejected the account credentials.' : code === 'PROVIDER_LIMIT' ? 'Tavus is at its current account limit. Please try again later.' : `Tavus could not complete this request (HTTP ${response.status}).`;
      throw new AppError(code, message, code === 'PROVIDER_LIMIT' ? 429 : 502);
    }
    return data;
  }
  function status() {
    const c = config();
    return { keyConfigured: Boolean(c.key), faceConfigured: Boolean(c.face), voiceConfigured: Boolean(c.voice), palConfigured: Boolean(c.pal), ready: Boolean(c.key && (c.face || c.portraitFace) && c.voice), presentation: c.face ? 'video' : 'portrait', voiceLabel: state.voiceLabel || 'Configured voice', promptHash, promptCharacters: systemPrompt.length };
  }
  async function validateMedia() {
    const c = config();
    if (!(c.face || c.portraitFace) || !c.voice) throw new AppError('MEDIA_NOT_READY', 'Dawid’s avatar and voice are being prepared. You can explore the reflection practices in the meantime.');
    const [face, voice] = await Promise.all([request(`faces/${encodeURIComponent(c.face || c.portraitFace)}`), request(`voices/${encodeURIComponent(c.voice)}`)]);
    if (face.status !== 'completed' || voice.status !== 'completed') throw new AppError('MEDIA_TRAINING', 'Dawid’s avatar or voice is still training. Please try again when it is ready.');
    return { face, voice };
  }
  async function ensurePal() {
    if (personaPromise) return personaPromise;
    personaPromise = (async () => {
      await validateMedia();
      const c = config();
      if (c.pal) {
        const pal = await request(`pals/${encodeURIComponent(c.pal)}`);
        if (pal.system_prompt !== systemPrompt || pal.default_face_id !== (c.face || c.portraitFace) || pal.layers?.tts?.voice_id !== c.voice) {
          throw new AppError('PERSONA_MISMATCH', 'The configured Tavus guide does not match the current prompt, avatar, and voice. Recreate the app’s guide configuration before starting.');
        }
        return c.pal;
      }
      const pal = await request('pals', { method: 'POST', body: {
        pal_name: c.face ? 'Dawid — Awakened Guide' : 'Dawid — portrait and live voice',
        pipeline_mode: 'full',
        system_prompt: systemPrompt,
        default_face_id: c.face || c.portraitFace,
        greeting: 'Hello. I’m an AI guide inspired by Dawid. What would you like to explore today?',
        languages: ['en'],
        layers: { tts: { voice_id: c.voice }, conversational_flow: { idle_engagement: 'off' } },
      } });
      if (!pal.pal_id) throw new AppError('PROVIDER_RESPONSE', 'Tavus did not return a guide identifier.');
      save({ [c.face ? 'palId' : 'portraitPalId']: pal.pal_id, promptHash });
      return pal.pal_id;
    })();
    try { return await personaPromise; } finally { personaPromise = undefined; }
  }
  async function startConversation({ testMode = false } = {}) {
    const palId = await ensurePal();
    const data = await request('conversations', { method: 'POST', body: {
      pal_id: palId, face_id: config().face || config().portraitFace, conversation_name: 'A conversation with Dawid',
      require_auth: true, max_participants: 2, test_mode: testMode,
      properties: { max_call_duration: 600, participant_absent_timeout: 45, participant_left_timeout: 5, enable_recording: false, enable_closed_captions: true, languages: ['en'] },
    } });
    let url;
    try { url = new URL(data.conversation_url); } catch { /* handled below */ }
    if (!data.conversation_id || !url || url.protocol !== 'https:' || !url.hostname.endsWith('.daily.co') || (!testMode && !data.meeting_token)) {
      // A provider-created room must be closed even if its response cannot be used.
      if (data.conversation_id) await request(`conversations/${encodeURIComponent(data.conversation_id)}/end`, { method: 'POST' }).catch(() => {});
      throw new AppError('PROVIDER_RESPONSE', 'Tavus did not return a valid private conversation.');
    }
    return { conversationId: data.conversation_id, url: url.href, token: data.meeting_token, presentation: status().presentation };
  }
  return { config, status, request, save, validateMedia, ensurePal, startConversation,
    endConversation: id => request(`conversations/${encodeURIComponent(id)}/end`, { method: 'POST' }) };
}
