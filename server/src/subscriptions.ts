import { randomUUID } from 'node:crypto';
import { Router, type Response } from 'express';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

import { decrypt, encrypt } from './crypto.js';
import type { Config } from './config.js';
import type { Db } from './db.js';
import { requireAuth, type AuthedRequest } from './auth.js';
import { subscriptionSchema, type SubscriptionInput } from './validation.js';

interface SubRow extends RowDataPacket {
  id: string;
  data_enc: string;
  created_at: Date;
}

interface Stored extends SubscriptionInput {
  createdAt: number;
}

function toApi(row: SubRow, config: Config) {
  const data = JSON.parse(decrypt(config.dataKey, row.data_enc)) as Stored;
  return { id: row.id, ...data };
}

function badInput(res: Response, message: string) {
  res.status(400).json({ error: 'invalid_input', message });
}

export function createSubscriptionsRouter(deps: { db: Db; config: Config }): Router {
  const { db, config } = deps;
  const router = Router();
  router.use(requireAuth(db));

  router.get('/', async (req: AuthedRequest, res) => {
    const [rows] = await db.query<SubRow[]>(
      'SELECT id, data_enc, created_at FROM subscriptions WHERE user_id = ? ORDER BY created_at',
      [req.userId],
    );
    res.json(rows.map((r) => toApi(r, config)));
  });

  router.post('/', async (req: AuthedRequest, res) => {
    const parsed = subscriptionSchema.safeParse(req.body);
    if (!parsed.success) return badInput(res, parsed.error.issues[0]?.message ?? 'invalid input');
    const id = randomUUID();
    const stored: Stored = { ...parsed.data, createdAt: Date.now() };
    await db.query('INSERT INTO subscriptions (id, user_id, data_enc) VALUES (?, ?, ?)', [
      id,
      req.userId,
      encrypt(config.dataKey, JSON.stringify(stored)),
    ]);
    res.status(201).json({ id, ...stored });
  });

  router.put('/:id', async (req: AuthedRequest, res) => {
    const parsed = subscriptionSchema.safeParse(req.body);
    if (!parsed.success) return badInput(res, parsed.error.issues[0]?.message ?? 'invalid input');
    const [rows] = await db.query<SubRow[]>('SELECT id, data_enc, created_at FROM subscriptions WHERE id = ? AND user_id = ?', [
      req.params.id,
      req.userId,
    ]);
    const existing = rows[0];
    if (!existing) return res.status(404).json({ error: 'not_found', message: 'Subscription not found.' });
    const createdAt = (JSON.parse(decrypt(config.dataKey, existing.data_enc)) as Stored).createdAt;
    const stored: Stored = { ...parsed.data, createdAt };
    await db.query<ResultSetHeader>('UPDATE subscriptions SET data_enc = ? WHERE id = ? AND user_id = ?', [
      encrypt(config.dataKey, JSON.stringify(stored)),
      existing.id,
      req.userId,
    ]);
    res.json({ id: existing.id, ...stored });
  });

  router.delete('/:id', async (req: AuthedRequest, res) => {
    const [result] = await db.query<ResultSetHeader>('DELETE FROM subscriptions WHERE id = ? AND user_id = ?', [
      req.params.id,
      req.userId,
    ]);
    if (result.affectedRows !== 1) return res.status(404).json({ error: 'not_found', message: 'Subscription not found.' });
    res.status(204).end();
  });

  return router;
}
