import { after, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { call, startTestServer, CapturingMailer } from './helpers.js';
import { createDb } from '../src/db.js';
import { TEST_DB_URL } from './helpers.js';

const env = await startTestServer();
const { base, reset, stop, db } = env;
const mailer: CapturingMailer = env.mailer;

const PASSWORD = 'correct horse battery';
const sub = {
  name: 'Netflix',
  amount: 649,
  currency: 'INR',
  cycle: 'monthly',
  startDate: '2026-01-05',
  category: 'Entertainment',
  reminderDaysBefore: 1,
  notes: 'family plan',
};

async function signupAndVerify(email: string, name = 'Udit') {
  const s = await call(base, 'POST', '/auth/signup', { body: { email, password: PASSWORD, name } });
  assert.equal(s.status, 202);
  const token = mailer.lastToken();
  const v = await call(base, 'GET', `/auth/verify?token=${encodeURIComponent(token)}`);
  assert.equal(v.status, 200);
  return token;
}

async function login(email: string, password = PASSWORD) {
  return call(base, 'POST', '/auth/login', { body: { email, password } });
}

describe('signup and email verification', () => {
  beforeEach(reset);

  it('creates an unverified account and sends one verification link', async () => {
    const r = await call(base, 'POST', '/auth/signup', { body: { email: 'A@Example.com ', password: PASSWORD, name: 'A' } });
    assert.equal(r.status, 202);
    assert.equal(mailer.sent.length, 1);
    assert.equal(mailer.sent[0]!.to, 'a@example.com');
    const login1 = await login('a@example.com');
    assert.equal(login1.status, 403);
    assert.equal(login1.json.error, 'email_not_verified');
  });

  it('refuses to sign in until the email link is used', async () => {
    await signupAndVerify('b@example.com');
    const ok = await login('b@example.com');
    assert.equal(ok.status, 200);
    assert.ok(ok.json.token.length > 30);
  });

  it('verification links are single use', async () => {
    await call(base, 'POST', '/auth/signup', { body: { email: 'c@example.com', password: PASSWORD, name: 'C' } });
    const token = mailer.lastToken();
    assert.equal((await call(base, 'GET', `/auth/verify?token=${token}`)).status, 200);
    assert.equal((await call(base, 'GET', `/auth/verify?token=${token}`)).status, 400);
  });

  it('expired verification links are rejected', async () => {
    await call(base, 'POST', '/auth/signup', { body: { email: 'd@example.com', password: PASSWORD, name: 'D' } });
    const token = mailer.lastToken();
    await db.query('UPDATE email_verifications SET expires_at = NOW() - INTERVAL 1 MINUTE');
    assert.equal((await call(base, 'GET', `/auth/verify?token=${token}`)).status, 400);
    assert.equal((await login('d@example.com')).status, 403);
  });

  it('a made-up token does nothing', async () => {
    assert.equal((await call(base, 'GET', '/auth/verify?token=nonsense')).status, 400);
  });

  it('answers the same way for an email that already has an account, and sends nothing new', async () => {
    await signupAndVerify('e@example.com');
    const before = mailer.sent.length;
    const again = await call(base, 'POST', '/auth/signup', { body: { email: 'e@example.com', password: 'another password 1', name: 'X' } });
    assert.equal(again.status, 202);
    assert.equal(mailer.sent.length, before);
    const [rows] = await db.query<any[]>('SELECT COUNT(*) AS n FROM users');
    assert.equal(Number(rows[0].n), 1);
  });

  it('resend issues a fresh link and invalidates the old one', async () => {
    await call(base, 'POST', '/auth/signup', { body: { email: 'f@example.com', password: PASSWORD, name: 'F' } });
    const oldToken = mailer.lastToken();
    await call(base, 'POST', '/auth/resend', { body: { email: 'f@example.com' } });
    const newToken = mailer.lastToken();
    assert.notEqual(oldToken, newToken);
    assert.equal((await call(base, 'GET', `/auth/verify?token=${oldToken}`)).status, 400);
    assert.equal((await call(base, 'GET', `/auth/verify?token=${newToken}`)).status, 200);
  });

  it('rejects weak passwords and bad input', async () => {
    const short = await call(base, 'POST', '/auth/signup', { body: { email: 'g@example.com', password: 'short', name: 'G' } });
    assert.equal(short.status, 400);
    const bad = await call(base, 'POST', '/auth/signup', { body: { email: 'not-an-email', password: PASSWORD, name: 'G' } });
    assert.equal(bad.status, 400);
  });

  it('stores no plaintext email or name in the database', async () => {
    await signupAndVerify('h@example.com', 'Plaintext Person');
    const [rows] = await db.query<any[]>('SELECT * FROM users');
    const dump = JSON.stringify(rows);
    assert.ok(!dump.includes('h@example.com'));
    assert.ok(!dump.includes('Plaintext Person'));
    assert.ok(!dump.includes(PASSWORD));
  });
});

after(stop);

describe('login and sessions', () => {
  beforeEach(reset);

  it('wrong password and unknown email both return 401 with the same message', async () => {
    await signupAndVerify('i@example.com');
    const wrong = await login('i@example.com', 'wrong password here');
    const unknown = await login('nobody@example.com', 'wrong password here');
    assert.equal(wrong.status, 401);
    assert.equal(unknown.status, 401);
    assert.equal(wrong.json.message, unknown.json.message);
  });

  it('logout revokes the session token', async () => {
    await signupAndVerify('j@example.com');
    const { json } = await login('j@example.com');
    assert.equal((await call(base, 'GET', '/auth/me', { token: json.token })).status, 200);
    assert.equal((await call(base, 'POST', '/auth/logout', { token: json.token })).status, 204);
    assert.equal((await call(base, 'GET', '/auth/me', { token: json.token })).status, 401);
  });

  it('expired sessions are rejected', async () => {
    await signupAndVerify('k@example.com');
    const { json } = await login('k@example.com');
    await db.query('UPDATE sessions SET expires_at = NOW() - INTERVAL 1 MINUTE');
    assert.equal((await call(base, 'GET', '/auth/me', { token: json.token })).status, 401);
  });

  it('protected routes need a token', async () => {
    assert.equal((await call(base, 'GET', '/subscriptions')).status, 401);
    assert.equal((await call(base, 'GET', '/subscriptions', { token: 'made-up' })).status, 401);
  });
});

describe('subscriptions', () => {
  beforeEach(reset);

  it('create, list, update and delete, with personal fields encrypted at rest', async () => {
    await signupAndVerify('l@example.com');
    const { json: s } = await login('l@example.com');
    const t = s.token;

    const created = await call(base, 'POST', '/subscriptions', { token: t, body: sub });
    assert.equal(created.status, 201);
    const id = created.json.id;

    const list = await call(base, 'GET', '/subscriptions', { token: t });
    assert.equal(list.json.length, 1);
    assert.equal(list.json[0].name, 'Netflix');
    assert.equal(list.json[0].notes, 'family plan');

    const [raw] = await db.query<any[]>('SELECT data_enc FROM subscriptions');
    assert.ok(!JSON.stringify(raw).includes('Netflix'));
    assert.ok(!JSON.stringify(raw).includes('family plan'));

    const updated = await call(base, 'PUT', `/subscriptions/${id}`, { token: t, body: { ...sub, amount: 799 } });
    assert.equal(updated.status, 200);
    assert.equal(updated.json.amount, 799);
    assert.equal(updated.json.createdAt, created.json.createdAt);

    assert.equal((await call(base, 'DELETE', `/subscriptions/${id}`, { token: t })).status, 204);
    assert.equal((await call(base, 'GET', '/subscriptions', { token: t })).json.length, 0);
  });

  it("one user cannot read, change or delete another user's subscriptions", async () => {
    await signupAndVerify('m@example.com');
    await signupAndVerify('n@example.com');
    const a = (await login('m@example.com')).json.token;
    const b = (await login('n@example.com')).json.token;
    const { json: created } = await call(base, 'POST', '/subscriptions', { token: a, body: sub });

    assert.equal((await call(base, 'GET', '/subscriptions', { token: b })).json.length, 0);
    assert.equal((await call(base, 'PUT', `/subscriptions/${created.id}`, { token: b, body: sub })).status, 404);
    assert.equal((await call(base, 'DELETE', `/subscriptions/${created.id}`, { token: b })).status, 404);
    assert.equal((await call(base, 'GET', '/subscriptions', { token: a })).json.length, 1);
  });

  it('rejects invalid subscription data', async () => {
    await signupAndVerify('o@example.com');
    const t = (await login('o@example.com')).json.token;
    const bad = { ...sub, amount: -5 };
    assert.equal((await call(base, 'POST', '/subscriptions', { token: t, body: bad })).status, 400);
    assert.equal((await call(base, 'POST', '/subscriptions', { token: t, body: { ...sub, currency: 'XYZ' } })).status, 400);
    assert.equal((await call(base, 'POST', '/subscriptions', { token: t, body: { ...sub, reminderDaysBefore: 5 } })).status, 400);
  });
});
