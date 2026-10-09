import test from 'node:test';
import assert from 'node:assert/strict';
import { appendUtterance, normalizeUtterance } from '../src/conversation.mjs';

const event = (role, speech = 'A quiet moment.', extra = {}) => ({ event_type: 'conversation.utterance', inference_id: 'turn-a', properties: { role, speech }, ...extra });
test('PAL and legacy replica copies produce one assistant turn', () => {
  const messages = appendUtterance(appendUtterance([], event('pal')), event('replica'));
  assert.equal(messages.length, 1);
  assert.equal(messages[0].role, 'assistant');
});
test('turn zero remains a stable identity as speech changes', () => {
  const first = event('pal', 'Hello', { inference_id: undefined, turn_idx: 0 });
  const second = event('replica', 'Hello there', { inference_id: undefined, turn_idx: 0 });
  assert.equal(appendUtterance(appendUtterance([], first), second).length, 1);
});
test('echo replaces an optimistic user message without duplicating it', () => {
  const result = appendUtterance([{ id: 'pending', role: 'user', text: 'Hello', pending: true }], event('user', 'Hello'));
  assert.equal(result.length, 1);
  assert.equal(result[0].pending, undefined);
});
test('unrelated, empty, and invalid-role events cannot enter the transcript', () => {
  for (const value of [null, {}, event('system'), event('pal', ''), { ...event('user'), event_type: 'other' }]) assert.equal(normalizeUtterance(value), null);
});
test('transcript stays bounded without discarding the newest turn', () => {
  let messages = [];
  for (let i = 0; i < 120; i++) messages = appendUtterance(messages, event('pal', `message ${i}`, { inference_id: i }));
  assert.equal(messages.length, 100);
  assert.equal(messages.at(-1).text, 'message 119');
});
