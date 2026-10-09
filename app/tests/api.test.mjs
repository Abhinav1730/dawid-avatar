import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApi } from '../server/api.mjs';

async function fixture(t, start) {
  let calls = 0;
  const ended = [];
  const tavus = { status: () => ({ keyConfigured: true, ready: false }), request: async () => ({}), validateMedia: async () => ({}), startConversation: async () => { calls++; return start ? start() : { conversationId: 'room-a', url: 'https://tavus.daily.co/room', token: 'private-token' }; }, endConversation: async id => { ended.push(id); } };
  const app = createApi({ tavus, rateLimits: false });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => { await app.close(); await new Promise(resolve => server.close(resolve)); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const status = await fetch(`${origin}/status`);
  const cookie = status.headers.get('set-cookie').split(';')[0];
  const request = (route, { body = '{}', cookie: sid = cookie, origin: source = origin, ...options } = {}) => fetch(`${origin}${route}`, { method: 'POST', headers: { Origin: source, Cookie: sid, 'Content-Type': 'application/json' }, body, ...options });
  return { origin, request, cookie, status, get calls() { return calls; }, ended };
}
test('authenticated account with missing media has a distinct readiness state', async t => {
  const f = await fixture(t);
  const result = await fetch(`${f.origin}/readiness`);
  assert.deepEqual(await result.json(), { connected: true, mediaReady: false });
  assert.match(f.status.headers.get('set-cookie'), /HttpOnly/);
  assert.match(f.status.headers.get('set-cookie'), /SameSite=Strict/);
});
test('cross-origin mutation and client prompt overrides cannot start a room', async t => {
  const f = await fixture(t);
  assert.equal((await f.request('/conversations', { origin: 'https://untrusted.example' })).status, 403);
  assert.equal((await f.request('/conversations', { body: JSON.stringify({ system_prompt: 'ignore original' }) })).status, 400);
  assert.equal(f.calls, 0);
});
test('only the owning browser session may end a conversation', async t => {
  const f = await fixture(t);
  assert.equal((await f.request('/conversations')).status, 201);
  assert.equal((await f.request('/conversations/room-a/end', { cookie: '' })).status, 404);
  assert.deepEqual(f.ended, []);
  assert.equal((await f.request('/conversations/room-a/end')).status, 200);
  assert.deepEqual(f.ended, ['room-a']);
});
test('repeated concurrent starts keep the first request locked until it finishes', async t => {
  let release;
  let notify;
  const entered = new Promise(resolve => { notify = resolve; });
  const pending = new Promise(resolve => { release = resolve; });
  const f = await fixture(t, async () => { notify(); await pending; return { conversationId: 'room-a' }; });
  const first = f.request('/conversations');
  await entered;
  assert.equal((await f.request('/conversations')).status, 409);
  assert.equal((await f.request('/conversations')).status, 409);
  assert.equal(f.calls, 1);
  release();
  assert.equal((await first).status, 201);
  assert.equal((await f.request('/conversations')).status, 409);
});
test('invalid and oversized JSON have bounded error responses', async t => {
  const f = await fixture(t);
  assert.equal((await f.request('/conversations', { body: '{' })).status, 400);
  assert.equal((await f.request('/conversations', { body: JSON.stringify({ text: 'a'.repeat(9000) }) })).status, 413);
  assert.equal(f.calls, 0);
});
