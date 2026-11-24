import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { randomBytes } from 'node:crypto';

import { createApp } from '../src/app.js';
import type { Config } from '../src/config.js';
import { createDb, type Db } from '../src/db.js';
import type { Mailer } from '../src/mailer.js';
import { migrate } from '../src/migrate.js';

export const TEST_DB_URL = process.env.TEST_DATABASE_URL ?? 'mysql://st:st_test_pw@127.0.0.1:3306/subtracker_test';

export function testConfig(): Config {
  return {
    port: 0,
    appUrl: 'http://test.local',
    databaseUrl: TEST_DB_URL,
    dataKey: randomBytes(32),
    emailHashKey: randomBytes(32),
    smtpUrl: undefined,
    mailFrom: 'test',
  };
}

export class CapturingMailer implements Mailer {
  sent: { to: string; url: string }[] = [];
  async sendVerification(to: string, url: string) {
    this.sent.push({ to, url });
  }
  lastToken(): string {
    const url = new URL(this.sent.at(-1)!.url);
    return url.searchParams.get('token')!;
  }
}

export async function startTestServer() {
  await migrate(TEST_DB_URL);
  const db: Db = createDb(TEST_DB_URL);
  const config = testConfig();
  const mailer = new CapturingMailer();
  const server: Server = createApp({ db, config, mailer, authAttemptsPerWindow: 100000 }).listen(0);
  await new Promise<void>((r) => server.once('listening', () => r()));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  async function reset() {
    await db.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const t of ['subscriptions', 'sessions', 'email_verifications', 'users']) {
      await db.query(`TRUNCATE TABLE ${t}`);
    }
    await db.query('SET FOREIGN_KEY_CHECKS = 1');
    mailer.sent = [];
  }

  async function stop() {
    await new Promise<void>((r) => server.close(() => r()));
    await db.end();
  }

  return { db, config, mailer, base, reset, stop };
}

export async function call(base: string, method: string, path: string, opts: { body?: unknown; token?: string } = {}) {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['content-type'] = 'application/json';
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  const res = await fetch(base + path, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    redirect: 'manual',
  });
  const text = await res.text();
  let json: any = undefined;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
  }
  return { status: res.status, json, text };
}
