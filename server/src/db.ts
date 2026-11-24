import mysql from 'mysql2/promise';

export type Db = mysql.Pool;

export function createDb(databaseUrl: string): Db {
  // All datetimes are stored and read as UTC.
  return mysql.createPool({ uri: databaseUrl, timezone: 'Z', connectionLimit: 10, namedPlaceholders: false });
}
