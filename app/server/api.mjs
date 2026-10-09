import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { randomUUID } from 'node:crypto';
import { AppError, makeTavus } from './tavus.mjs';

export function createApi({ tavus = makeTavus(), rateLimits = true, secureCookies = false } = {}) {
  const app = express();
  app.disable('x-powered-by');
  const owners = new Map();
  const active = new Map();
  const starting = new Set();
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const origin = req.get('origin');
      // Session-mutating requests must come from the same browser origin.
      if (!origin || origin !== `${req.protocol}://${req.get('host')}`) return res.status(403).json({ code: 'ORIGIN_REJECTED', message: 'This request must come from the app.' });
    }
    next();
  });
  if (rateLimits) app.use(rateLimit({ windowMs: 60_000, limit: 80, standardHeaders: 'draft-7', legacyHeaders: false, message: { code: 'RATE_LIMIT', message: 'Please wait a moment before trying again.' } }));
  app.use(express.json({ limit: '8kb' }));
  app.use((req, res, next) => {
    const match = req.get('cookie')?.match(/(?:^|;\s*)dawid_session=([a-f0-9-]{36})(?:;|$)/);
    let sid = match?.[1];
    if (!sid || !owners.has(sid)) {
      sid = randomUUID();
      owners.set(sid, Date.now());
      res.cookie('dawid_session', sid, { httpOnly: true, sameSite: 'strict', secure: secureCookies, maxAge: 86_400_000 });
    }
    req.sessionId = sid;
    next();
  });
  app.get('/status', (_req, res) => res.json(tavus.status()));
  app.get('/readiness', async (_req, res, next) => {
    try {
      if (!tavus.status().keyConfigured) return res.json({ connected: false, mediaReady: false });
      // Authentication is checked independently of missing media configuration.
      await tavus.request('faces?limit=1');
      if (!tavus.status().ready) return res.json({ connected: true, mediaReady: false });
      await tavus.validateMedia();
      res.json({ connected: true, mediaReady: true });
    } catch (error) { next(error); }
  });
  const startLimit = rateLimit({ windowMs: 600_000, limit: 5, standardHeaders: 'draft-7', legacyHeaders: false, message: { code: 'RATE_LIMIT', message: 'Please wait before starting another conversation.' } });
  app.post('/conversations', ...(rateLimits ? [startLimit] : []), async (req, res, next) => {
    const sid = req.sessionId;
    let ownsStart = false;
    try {
      if (Object.keys(req.body || {}).length) throw new AppError('INVALID_REQUEST', 'Conversation settings are managed by the app.', 400);
      if (starting.has(sid) || active.has(sid)) throw new AppError('CONVERSATION_ACTIVE', 'End your current conversation before starting another.', 409);
      starting.add(sid);
      ownsStart = true;
      const session = await tavus.startConversation();
      active.set(sid, { ...session, started: Date.now() });
      res.status(201).json(session);
    } catch (error) { next(error); } finally { if (ownsStart) starting.delete(sid); }
  });
  app.post('/conversations/:id/end', async (req, res, next) => {
    try {
      if (active.get(req.sessionId)?.conversationId !== req.params.id) throw new AppError('NOT_FOUND', 'This conversation does not belong to your session.', 404);
      await tavus.endConversation(req.params.id);
      active.delete(req.sessionId);
      res.json({ ended: true });
    } catch (error) { next(error); }
  });
  app.use((_req, res) => res.status(404).json({ code: 'NOT_FOUND', message: 'This endpoint does not exist.' }));
  app.use((error, _req, res, _next) => {
    if (error instanceof AppError) return res.status(error.status).json({ code: error.code, message: error.message });
    if (error.type === 'entity.too.large') return res.status(413).json({ code: 'REQUEST_TOO_LARGE', message: 'The request is too large.' });
    if (error.type === 'entity.parse.failed') return res.status(400).json({ code: 'INVALID_JSON', message: 'The request could not be read.' });
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' });
  });
  const timer = setInterval(() => {
    for (const [sid, session] of active) if (Date.now() - session.started > 600_000) active.delete(sid);
    for (const [sid, time] of owners) if (Date.now() - time > 86_400_000 && !active.has(sid)) owners.delete(sid);
  }, 60_000);
  timer.unref();
  app.close = async () => {
    clearInterval(timer);
    await Promise.allSettled([...active.values()].map(session => tavus.endConversation(session.conversationId)));
    active.clear();
  };
  return app;
}
