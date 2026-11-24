import { randomUUID } from 'node:crypto';
import { Router, type Request, type Response, type NextFunction } from 'express';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

import type { Config } from './config.js';
import type { Db } from './db.js';
import { decrypt, encrypt, hashPassword, hmacHex, randomSecret, sha256Hex, verifyPassword } from './crypto.js';
import type { Mailer } from './mailer.js';
import { loginSchema, resendSchema, signupSchema } from './validation.js';

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const GENERIC_SIGNUP_MESSAGE = 'If this email can be registered, a verification link is on its way.';

export interface AuthDeps {
  db: Db;
  config: Config;
  mailer: Mailer;
}

export interface AuthedRequest extends Request {
  userId?: string;
}

interface UserRow extends RowDataPacket {
  id: string;
  email_enc: string;
  name_enc: string;
  password_hash: string;
  email_verified_at: Date | null;
}

let dummyHash: Promise<string> | undefined;
/** Used so that unknown emails cost the same time as known ones during login. */
function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword('timing-equaliser-not-a-real-password');
  return dummyHash;
}

function sendError(res: Response, status: number, code: string, message: string) {
  res.status(status).json({ error: code, message });
}

export function createAuthRouter({ db, config, mailer }: AuthDeps): Router {
  const router = Router();

  async function issueVerification(userId: string, email: string) {
    // Invalidate older unused links so only the newest one works.
    await db.query('DELETE FROM email_verifications WHERE user_id = ? AND used_at IS NULL', [userId]);
    const token = randomSecret();
    await db.query<ResultSetHeader>(
      'INSERT INTO email_verifications (token_hash, user_id, expires_at) VALUES (?, ?, ?)',
      [sha256Hex(token), userId, new Date(Date.now() + VERIFY_TTL_MS)],
    );
    const url = `${config.appUrl}/auth/verify?token=${encodeURIComponent(token)}`;
    await mailer.sendVerification(email, url);
  }

  async function findUserByEmail(email: string): Promise<UserRow | undefined> {
    const [rows] = await db.query<UserRow[]>(
      'SELECT id, email_enc, name_enc, password_hash, email_verified_at FROM users WHERE email_hash = ?',
      [hmacHex(config.emailHashKey, email)],
    );
    return rows[0];
  }

  // Sign up: always answers the same way, so the endpoint can't be used to find out who has an account.
  router.post('/signup', async (req, res) => {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, 400, 'invalid_input', parsed.error.issues[0]?.message ?? 'invalid input');
    const { email, password, name } = parsed.data;

    const existing = await findUserByEmail(email);
    const passwordHash = await hashPassword(password); // same cost whether or not the account exists
    if (!existing) {
      const id = randomUUID();
      await db.query(
        'INSERT INTO users (id, email_hash, email_enc, name_enc, password_hash) VALUES (?, ?, ?, ?, ?)',
        [
          id,
          hmacHex(config.emailHashKey, email),
          encrypt(config.dataKey, email),
          encrypt(config.dataKey, name),
          passwordHash,
        ],
      );
      await issueVerification(id, email);
    }
    res.status(202).json({ message: GENERIC_SIGNUP_MESSAGE });
  });

  // The link from the email. Single use and time limited.
  router.get('/verify', async (req, res) => {
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    const page = (ok: boolean, text: string) =>
      res
        .status(ok ? 200 : 400)
        .type('html')
        .send(`<!doctype html><meta charset="utf-8"><title>SubTracker</title><p>${text}</p>`);
    if (!token) return page(false, 'This link is not valid.');

    const tokenHash = sha256Hex(token);
    const [claimed] = await db.query<ResultSetHeader>(
      'UPDATE email_verifications SET used_at = NOW() WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()',
      [tokenHash],
    );
    if (claimed.affectedRows !== 1) return page(false, 'This link has expired or was already used. Request a new one in the app.');

    const [rows] = await db.query<RowDataPacket[]>('SELECT user_id FROM email_verifications WHERE token_hash = ?', [tokenHash]);
    await db.query('UPDATE users SET email_verified_at = COALESCE(email_verified_at, NOW()) WHERE id = ?', [rows[0]!.user_id]);
    return page(true, 'Your email is verified. You can now sign in to SubTracker.');
  });

  // Resend a verification link. Same answer whether or not the account exists.
  router.post('/resend', async (req, res) => {
    const parsed = resendSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, 400, 'invalid_input', 'enter a valid email');
    const user = await findUserByEmail(parsed.data.email);
    if (user && !user.email_verified_at) {
      await issueVerification(user.id, decrypt(config.dataKey, user.email_enc));
    }
    res.status(202).json({ message: GENERIC_SIGNUP_MESSAGE });
  });

  router.post('/login', async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, 400, 'invalid_input', 'email and password are required');
    const { email, password } = parsed.data;

    const user = await findUserByEmail(email);
    const ok = await verifyPassword(password, user?.password_hash ?? (await getDummyHash()));
    if (!user || !ok) return sendError(res, 401, 'invalid_credentials', 'Email or password is incorrect.');
    if (!user.email_verified_at) {
      return sendError(res, 403, 'email_not_verified', 'Verify your email first. Check your inbox for the link.');
    }

    const token = randomSecret();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await db.query('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)', [
      sha256Hex(token),
      user.id,
      expiresAt,
    ]);
    res.json({ token, expiresAt: expiresAt.toISOString() });
  });

  router.get('/me', requireAuth(db), async (req: AuthedRequest, res) => {
    const [rows] = await db.query<UserRow[]>('SELECT name_enc FROM users WHERE id = ?', [req.userId]);
    const row = rows[0];
    if (!row) return sendError(res, 401, 'unauthenticated', 'Sign in again.');
    res.json({ id: req.userId, name: decrypt(config.dataKey, row.name_enc) });
  });

  router.post('/logout', requireAuth(db), async (req: AuthedRequest, res) => {
    const token = bearer(req);
    if (token) await db.query('DELETE FROM sessions WHERE token_hash = ?', [sha256Hex(token)]);
    res.status(204).end();
  });

  return router;
}

function bearer(req: Request): string | undefined {
  const header = req.headers.authorization ?? '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : undefined;
}

/** Requires a valid, unexpired session for a verified account. Sets req.userId. */
export function requireAuth(db: Db) {
  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const token = bearer(req);
      if (!token) return sendError(res, 401, 'unauthenticated', 'Sign in first.');
      const [rows] = await db.query<RowDataPacket[]>(
        `SELECT s.user_id FROM sessions s
           JOIN users u ON u.id = s.user_id
          WHERE s.token_hash = ? AND s.expires_at > NOW() AND u.email_verified_at IS NOT NULL`,
        [sha256Hex(token)],
      );
      if (!rows[0]) return sendError(res, 401, 'unauthenticated', 'Sign in again.');
      req.userId = rows[0].user_id as string;
      next();
    } catch (err) {
      next(err);
    }
  };
}
