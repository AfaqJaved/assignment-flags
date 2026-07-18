import * as path from 'path';
import { promises as fs } from 'fs';
import { Kysely } from 'kysely';
import { Migrator, FileMigrationProvider } from 'kysely/migration';
import { FlagsDatabase } from './schema';
import { Logger } from '@nestjs/common';

/**
 * Runs all pending Kysely migrations against the provided `db` instance.
 *
 * Called automatically at application startup from `FlagsDatabaseModule`
 * so the schema is always up to date before the first request is served.
 * Uses the same connection pool as the rest of the app — no second pool is
 * created.
 *
 * Throws if any migration fails, which will abort the NestJS bootstrap and
 * prevent the app from starting with a stale schema.
 */
export async function runMigrations(db: Kysely<FlagsDatabase>) {
  const logger = new Logger('Migrations');
  logger.fatal('Starting Migrations ..... ');
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, './migrations'),
    }),
  });

  const { error, results } = await migrator.migrateToLatest();

  results?.forEach((result) => {
    if (result.status === 'Success') {
      console.log(`Migration applied: ${result.migrationName}`);
    } else if (result.status === 'Error') {
      console.error(`Migration failed: ${result.migrationName}`);
    }
  });

  if (error) {
    logger.error('Migration Failed !!! ..... ');
    throw error;
  } else {
    logger.fatal('Migrations Completed Sucessfully!!! ..... ');
  }
}
