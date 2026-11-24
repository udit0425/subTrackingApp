import { loadConfig } from './config.js';
import { createDb } from './db.js';
import { SCHEMA } from './schema.js';

export async function migrate(databaseUrl: string): Promise<void> {
  const db = createDb(databaseUrl);
  try {
    for (const statement of SCHEMA) await db.query(statement);
  } finally {
    await db.end();
  }
}

// Run directly: `npm run migrate`
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate(loadConfig().databaseUrl)
    .then(() => console.log('Schema is up to date'))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
