import express from 'express';
import path from 'node:path';
import { root } from '../server/tavus.mjs';
const app = express();
// Loopback-only evaluation utility; only these four files are accessible.
const routes = {
  '/': 'tools/evaluation.html',
  '/evaluation-session.json': '.private/evaluation-session.json',
  '/tests/prompt-probes.json': 'tests/prompt-probes.json',
  '/node_modules/@daily-co/daily-js/dist/daily-esm.js': 'node_modules/@daily-co/daily-js/dist/daily-esm.js',
};
for (const [route, file] of Object.entries(routes)) app.get(route, (_req, res) => { res.set('Cache-Control', 'no-store'); res.sendFile(path.join(root, file), { dotfiles: 'allow' }); });
app.listen(4174, '127.0.0.1', () => console.log('Isolated prompt evaluator: http://127.0.0.1:4174/'));
