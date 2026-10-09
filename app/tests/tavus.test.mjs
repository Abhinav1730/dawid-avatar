import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { makeTavus, systemPrompt, promptHash } from '../server/tavus.mjs';

const env = { TAVUS_API_KEY: 'test-secret-never-return', TAVUS_FACE_ID: 'face-a', TAVUS_VOICE_ID: 'voice-a' };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
function fixture(t, overrides = {}, responder) {
  const dir = mkdtempSync(path.join(tmpdir(), 'dawid-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const requests = [];
  const tavus = makeTavus({ env: { ...env, ...overrides }, stateFile: path.join(dir, 'state.json'), fetcher: async (url, options) => {
    const route = url.split('/v2/')[1];
    const request = { route, method: options.method, body: options.body && JSON.parse(options.body) };
    requests.push(request);
    if (responder) return responder(request);
    if (route.startsWith('faces/') || route.startsWith('voices/')) return json({ status: 'completed' });
    if (route === 'pals') return json({ pal_id: 'pal-a' });
    if (route === 'conversations') return json({ conversation_id: 'conversation-a', conversation_url: 'https://tavus.daily.co/room', meeting_token: 'private-token' });
    if (route.endsWith('/end')) return new Response(null, { status: 200 });
    throw new Error(`Unexpected request: ${route}`);
  } });
  return { tavus, requests };
}
test('missing media is distinguished from failed credentials and creates no paid room', async t => {
  const { tavus, requests } = fixture(t, { TAVUS_FACE_ID: '', TAVUS_VOICE_ID: '' });
  await assert.rejects(tavus.startConversation(), { code: 'MEDIA_NOT_READY' });
  assert.equal(requests.length, 0);
  assert.equal(JSON.stringify(tavus.status()).includes(env.TAVUS_API_KEY), false);
});
test('the full supplied prompt is sent unchanged and rooms are private and bounded', async t => {
  const { tavus, requests } = fixture(t);
  const session = await tavus.startConversation();
  const pal = requests.find(request => request.route === 'pals').body;
  assert.equal(pal.system_prompt, systemPrompt);
  assert.equal(pal.layers.tts.voice_id, 'voice-a');
  const room = requests.find(request => request.route === 'conversations').body;
  assert.equal(room.require_auth, true);
  assert.equal(room.max_participants, 2);
  assert.equal(room.properties.max_call_duration, 600);
  assert.equal(room.properties.enable_recording, false);
  assert.equal(session.token, 'private-token');
  await tavus.endConversation(session.conversationId);
});
test('in-progress training blocks conversation creation', async t => {
  const { tavus, requests } = fixture(t, {}, () => json({ status: 'started' }));
  await assert.rejects(tavus.startConversation(), { code: 'MEDIA_TRAINING' });
  assert.equal(requests.some(request => request.route === 'conversations'), false);
});
test('portrait mode uses live provider audio without claiming a trained Dawid face', async t => {
  const { tavus, requests } = fixture(t, { TAVUS_FACE_ID: '', TAVUS_PORTRAIT_FACE_ID: 'stock-face' });
  assert.equal(tavus.status().faceConfigured, false);
  assert.equal(tavus.status().ready, true);
  const result = await tavus.startConversation();
  assert.equal(result.presentation, 'portrait');
  assert.equal(requests.find(request => request.route === 'pals').body.default_face_id, 'stock-face');
  assert.equal(requests.find(request => request.route === 'pals').body.system_prompt, systemPrompt);
});
test('a stale PAL prompt is detected before a room is created', async t => {
  const { tavus, requests } = fixture(t, { TAVUS_PAL_ID: 'stale' }, request => json(request.route.startsWith('pals/') ? { system_prompt: 'old prompt', default_face_id: 'face-a', layers: { tts: { voice_id: 'voice-a' } } } : { status: 'completed' }));
  await assert.rejects(tavus.startConversation(), { code: 'PERSONA_MISMATCH' });
  assert.equal(requests.some(request => request.route === 'conversations'), false);
});
for (const [status, code] of [[401, 'PROVIDER_AUTH'], [403, 'PROVIDER_AUTH'], [429, 'PROVIDER_LIMIT'], [500, 'PROVIDER_REJECTED']]) {
  test(`provider HTTP ${status} is classified without leaking its response body`, async t => {
    const { tavus } = fixture(t, {}, () => json({ secret: env.TAVUS_API_KEY }, status));
    await assert.rejects(tavus.request('faces'), error => error.code === code && !error.message.includes(env.TAVUS_API_KEY));
  });
}
test('unreachable provider is distinct from malformed provider data', async t => {
  const network = fixture(t, {}, () => { throw new Error('network'); }).tavus;
  await assert.rejects(network.request('faces'), { code: 'PROVIDER_UNREACHABLE' });
  const invalid = fixture(t, {}, () => new Response('<html>error</html>')).tavus;
  await assert.rejects(invalid.request('faces'), { code: 'PROVIDER_RESPONSE' });
});
test('unusable provider room is immediately cleaned up', async t => {
  const { tavus, requests } = fixture(t, {}, request => {
    if (request.route === 'conversations') return json({ conversation_id: 'bad-room', conversation_url: 'https://attacker.example/room', meeting_token: 'token' });
    if (request.route === 'pals') return json({ pal_id: 'pal' });
    if (request.route.endsWith('/end')) return new Response(null);
    return json({ status: 'completed' });
  });
  await assert.rejects(tavus.startConversation(), { code: 'PROVIDER_RESPONSE' });
  assert.equal(requests.at(-1).route, 'conversations/bad-room/end');
});
test('prompt checksum covers the copied file bytes', () => {
  assert.equal(promptHash, '7200113a2053b2e59295e596e180c10d58b22fe4ff6898b1fd627f467c26a84c');
  assert.equal(readFileSync(new URL('../server/system-prompt.txt', import.meta.url), 'utf8'), systemPrompt);
});
