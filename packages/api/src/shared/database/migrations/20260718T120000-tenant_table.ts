import { type Kysely, sql } from 'kysely';
import { FlagsDatabase } from '../schema';

export async function up(db: Kysely<FlagsDatabase>): Promise<void> {
  await db.schema
    .createTable('tenants')
    .addColumn('id', 'uuid', (col) => col.primaryKey().notNull())
    .addColumn('name', 'varchar(100)', (col) => col.notNull())
    .addColumn('slug', 'varchar(100)', (col) => col.notNull().unique())
    .addColumn('api_key_hash', 'varchar(255)', (col) => col.notNull().unique())
    .addColumn(
      'status',
      sql`varchar CHECK (status IN ('active', 'suspended'))`,
      (col) => col.notNull().defaultTo('active'),
    )
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();
}

export async function down(db: Kysely<FlagsDatabase>): Promise<void> {
  await db.schema.dropTable('tenants').execute();
}
