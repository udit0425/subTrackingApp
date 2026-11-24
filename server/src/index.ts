import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createDb } from './db.js';
import { createConsoleMailer, createSmtpMailer } from './mailer.js';
import { migrate } from './migrate.js';

const config = loadConfig();

if (!config.smtpUrl && process.env.NODE_ENV === 'production') {
  throw new Error('SMTP_URL is required in production');
}

await migrate(config.databaseUrl);
const db = createDb(config.databaseUrl);
const mailer = config.smtpUrl
  ? createSmtpMailer(config.smtpUrl, config.mailFrom)
  : createConsoleMailer();

createApp({ db, config, mailer }).listen(config.port, () => {
  console.log(`SubTracker API listening on port ${config.port}`);
});
