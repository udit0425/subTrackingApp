import express, { type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { createAuthRouter } from './auth.js';
import type { Config } from './config.js';
import type { Db } from './db.js';
import type { Mailer } from './mailer.js';
import { createSubscriptionsRouter } from './subscriptions.js';

export interface AppDeps {
  db: Db;
  config: Config;
  mailer: Mailer;
  /** Max sign-up, resend and login attempts per IP per 15 minutes. */
  authAttemptsPerWindow?: number;
}

export function createApp({ db, config, mailer, authAttemptsPerWindow = 20 }: AppDeps) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // one proxy in front (e.g. the hosting platform), so rate limits see real client IPs
  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));

  // Sign-up, resend and login are the abuse targets: keep their limit tight.
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: authAttemptsPerWindow,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'rate_limited', message: 'Too many attempts. Try again in a few minutes.' },
  });
  app.use('/auth/signup', authLimiter);
  app.use('/auth/login', authLimiter);
  app.use('/auth/resend', authLimiter);

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/auth', createAuthRouter({ db, config, mailer }));
  app.use('/subscriptions', createSubscriptionsRouter({ db, config }));

  app.use((_req, res) => res.status(404).json({ error: 'not_found', message: 'Not found.' }));

  // Never leak stack traces or database details to clients.
  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({ error: 'invalid_json', message: 'Request body is not valid JSON.' });
    }
    console.error(err);
    res.status(500).json({ error: 'server_error', message: 'Something went wrong.' });
  };
  app.use(onError);
  return app;
}
