// An isolated text-evaluation PAL. Never used as Dawid's live avatar.
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { makeTavus, systemPrompt, promptHash } from '../server/tavus.mjs';
const tavus = makeTavus();
const file = new URL('../.private/evaluation.json', import.meta.url);
try {
  if (existsSync(file)) {
    const saved = JSON.parse(readFileSync(file, 'utf8'));
    if (saved.promptHash !== promptHash) throw new Error('The evaluation prompt changed; inspect the saved PAL before creating another.');
    const pal = await tavus.request(`pals/${encodeURIComponent(saved.palId)}`);
    if (pal.system_prompt !== systemPrompt) throw new Error('Evaluation PAL prompt does not match.');
    console.log('Existing evaluation PAL still matches the supplied prompt.');
  } else {
    const faces = await tavus.request('faces?face_type=system&limit=1');
    const face = faces.data?.[0];
    if (!face?.face_id) throw new Error('No stock face available for text evaluation.');
    const pal = await tavus.request('pals', { method: 'POST', body: { pal_name: 'Dawid prompt evaluation — text only', default_face_id: face.face_id, pipeline_mode: 'full', system_prompt: systemPrompt, greeting: '', languages: ['en'] } });
    if (!pal.pal_id) throw new Error('No evaluation PAL identifier returned. Inspect the account before retrying.');
    mkdirSync(new URL('../.private/', import.meta.url), { recursive: true });
    writeFileSync(file, JSON.stringify({ palId: pal.pal_id, promptHash }, null, 2));
    const check = await tavus.request(`pals/${encodeURIComponent(pal.pal_id)}`);
    if (check.system_prompt !== systemPrompt) throw new Error('Tavus did not preserve the full prompt.');
    console.log('Tavus accepted and returned all 35,653 characters unchanged in an isolated evaluation PAL. No video conversation was started.');
  }
} catch (error) { console.error(`${error.code || 'EVALUATION_FAILED'}: ${error.message}`); process.exitCode = 1; }
