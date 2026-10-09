import { readFileSync, rmSync } from 'node:fs';
import { makeTavus } from '../server/tavus.mjs';
const file = new URL('../.private/evaluation-session.json', import.meta.url);
const session = JSON.parse(readFileSync(file, 'utf8'));
await makeTavus().endConversation(session.conversation_id);
rmSync(file);
console.log('Evaluation room ended; local meeting token removed.');
