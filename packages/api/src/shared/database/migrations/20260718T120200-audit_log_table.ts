import { type Kysely, sql } from 'kysely';
import { FlagsDatabase } from '../schema';

export async function up(db: Kysely<FlagsDatabase>): Promise<void> {
  await db.schema
    .createTable('audit_logs')
    .addColumn('id', 'uuid', (col) => col.primaryKey().notNull())
    .addColumn('tenant_id', 'uuid', (col) =>
      col.notNull().references('tenants.id').onDelete('cascade'),
    )
    .addColumn('flag_id', 'uuid', (col) =>
      col.notNull().references('feature_flags.id').onDelete('cascade'),
    )
    .addColumn('flag_key', 'varchar(100)', (col) => col.notNull())
    .addColumn(
      'environment',
      sql`varchar CHECK (environment IN ('development', 'staging', 'production'))`,
      (col) => col.defaultTo(null),
    )
    .addColumn(
      'action',
      sql`varchar CHECK (action IN ('flag_created', 'flag_updated', 'flag_toggled', 'flag_archived'))`,
      (col) => col.notNull(),
    )
    .addColumn('changes', 'jsonb', (col) =>
      col.notNull().defaultTo(sql`'[]'::jsonb`),
    )
    .addColumn('actor_id', 'varchar(255)', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  // primary access pattern: chronological history for one flag within a tenant
  await db.schema
    .createIndex('idx_audit_log_tenant_id_flag_key_created_at')
    .on('audit_logs')
    .columns(['tenant_id', 'flag_key', 'created_at'])
    .execute();
}

export async function down(db: Kysely<FlagsDatabase>): Promise<void> {
  await db.schema.dropTable('audit_logs').execute();
}
