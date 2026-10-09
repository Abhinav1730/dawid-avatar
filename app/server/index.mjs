import express from 'express';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { createApi } from './api.mjs';
import { root } from './tavus.mjs';

if (existsSync(path.join(root, '.env.local'))) process.loadEnvFile(path.join(root, '.env.local'));
const app = express();
const api = createApi({ secureCookies: process.env.NODE_ENV === 'production' });
app.use('/api', api);
app.use(express.static(path.join(root, 'dist/client')));
app.get('/{*path}', (_req, res) => res.sendFile(path.join(root, 'dist/client/index.html')));
const server = app.listen(Number(process.env.PORT) || 4173, process.env.HOST || '127.0.0.1', () => console.log('Dawid app is listening on port ' + (Number(process.env.PORT) || 4173)));
for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, async () => { await api.close(); server.close(() => process.exit(0)); });
