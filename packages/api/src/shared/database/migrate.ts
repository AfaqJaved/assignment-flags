import * as path from 'path';
import { promises as fs } from 'fs';
import pg from 'pg';
import { Kysely, PostgresDialect } from 'kysely';
import { Migrator, FileMigrationProvider } from 'kysely/migration';
import { run } from 'kysely-migration-cli';
import { FlagsDatabase } from './schema';

// For ESM environment
// const migrationFolder = new URL('./migrations', import.meta.url).pathname;

// For CJS environment
const migrationFolder = path.join(__dirname, './migrations');

const db = new Kysely<FlagsDatabase>({
  dialect: new PostgresDialect({
    pool: new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    }),
  }),
});

const migrator = new Migrator({
  db,
  provider: new FileMigrationProvider({
    fs,
    path,
    migrationFolder,
  }),
});

run(db, migrator, migrationFolder);
