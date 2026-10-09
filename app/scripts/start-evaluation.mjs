import { readFileSync, writeFileSync } from 'node:fs';
import { makeTavus } from '../server/tavus.mjs';
const tavus = makeTavus();
const saved = JSON.parse(readFileSync(new URL('../.private/evaluation.json', import.meta.url), 'utf8'));
const result = await tavus.request('conversations', { method: 'POST', body: { persona_id: saved.palId, chat: true, require_auth: true, max_participants: 2, conversation_name: 'Dawid prompt evaluation — text only', properties: { max_call_duration: 360, participant_absent_timeout: 45, participant_left_timeout: 5, enable_recording: false } } });
writeFileSync(new URL('../.private/evaluation-session.json', import.meta.url), JSON.stringify(result));
console.log('Created a bounded text-only evaluation session; private token saved locally.');
