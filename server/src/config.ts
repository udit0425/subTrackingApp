export interface Config {
  port: number;
  appUrl: string;
  databaseUrl: string;
  dataKey: Buffer;
  emailHashKey: Buffer;
  smtpUrl: string | undefined;
  mailFrom: string;
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

function key32(env: NodeJS.ProcessEnv, name: string): Buffer {
  const buf = Buffer.from(required(env, name), 'base64');
  if (buf.length !== 32) throw new Error(`${name} must decode to 32 bytes (base64)`);
  return buf;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    port: Number(env.PORT ?? 3000),
    appUrl: env.APP_URL ?? 'http://localhost:3000',
    databaseUrl: required(env, 'DATABASE_URL'),
    dataKey: key32(env, 'DATA_ENCRYPTION_KEY'),
    emailHashKey: key32(env, 'EMAIL_HASH_KEY'),
    smtpUrl: env.SMTP_URL || undefined,
    mailFrom: env.MAIL_FROM ?? 'SubTracker <no-reply@example.com>',
  };
}
