import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';
import { Env } from '../config/env';
import { FlagsDatabase } from './schema';
import { runMigrations } from './migration.runner';

export const FLAGS_DB = 'FLAGS_DB';
export type FlagsPersistence = Kysely<FlagsDatabase>;

const KyselyProvider = {
  provide: FLAGS_DB,
  inject: [ConfigService],
  useFactory: async (
    configService: ConfigService<Env, true>,
  ): Promise<FlagsPersistence> => {
    const dialect = new PostgresDialect({
      pool: new Pool({
        connectionString: configService.get('DATABASE_URL', { infer: true }),
        max: 10,
      }).on('error', (error) => {
        console.log('Database error : ' + error.message);
      }),
    });
    const db = new Kysely<FlagsDatabase>({ dialect });
    await sql`SELECT 1`.execute(db);
    await runMigrations(db);
    return db;
  },
};

@Global()
@Module({
  providers: [KyselyProvider],
  exports: [FLAGS_DB],
})
export class FlagsDatabaseModule {}
