import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';

const required = (key: string): string => {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`${key} must be set before running database migrations.`);
  return value;
};

async function main(): Promise<void> {
  const port = Number(process.env.SQL_PORT || '5432');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('SQL_PORT must be a valid TCP port.');
  const pool = new Pool({
    host: required('SQL_HOST'),
    port,
    user: required('SQL_ADMIN_USER'),
    password: required('SQL_ADMIN_PASSWORD'),
    database: required('SQL_DB_NAME'),
    ssl: process.env.SQL_SSL?.trim().toLowerCase() === 'true' ? { rejectUnauthorized: true } : false,
    max: 1,
    connectionTimeoutMillis: 15000,
  });
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock(741852963)');
    await client.query(`CREATE TABLE IF NOT EXISTS public.schema_migrations (
      id text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    const directory = resolve(dirname(fileURLToPath(import.meta.url)), '../db/migrations');
    const files = (await readdir(directory)).filter(name => /^\d+_[a-z0-9_-]+\.sql$/i.test(name)).sort();
    if (!files.length) throw new Error('No SQL migration files were found.');
    for (const filename of files) {
      const applied = await client.query('SELECT 1 FROM public.schema_migrations WHERE id = $1', [filename]);
      if (applied.rowCount) {
        console.log(`Skipping applied migration: ${filename}`);
        continue;
      }
      const contents = await readFile(resolve(directory, filename), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(contents);
        await client.query('INSERT INTO public.schema_migrations (id) VALUES ($1)', [filename]);
        await client.query('COMMIT');
        console.log(`Applied migration: ${filename}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    try { await client.query('SELECT pg_advisory_unlock(741852963)'); } catch {}
    client.release();
    await pool.end();
  }
}
main().catch((error: unknown) => {
  console.error('Database migration failed:', error instanceof Error ? error.message : 'unknown error');
  process.exitCode = 1;
});
