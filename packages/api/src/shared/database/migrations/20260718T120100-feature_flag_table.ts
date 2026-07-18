import { type Kysely, sql } from 'kysely';
import { FlagsDatabase } from '../schema';

export async function up(db: Kysely<FlagsDatabase>): Promise<void> {
  await db.schema
    .createTable('feature_flags')
    .addColumn('id', 'uuid', (col) => col.primaryKey().notNull())
    .addColumn('tenant_id', 'uuid', (col) =>
      col.notNull().references('tenants.id').onDelete('cascade'),
    )
    .addColumn('key', 'varchar(100)', (col) => col.notNull())
    .addColumn('name', 'varchar(200)', (col) => col.notNull())
    .addColumn('description', 'text', (col) => col.defaultTo(null))
    .addColumn(
      'type',
      sql`varchar CHECK (type IN ('boolean', 'string', 'number'))`,
      (col) => col.notNull(),
    )
    .addColumn('default_value', 'jsonb', (col) => col.notNull())
    .addColumn(
      'status',
      sql`varchar CHECK (status IN ('active', 'archived'))`,
      (col) => col.notNull().defaultTo('active'),
    )
    .addColumn('environments', 'jsonb', (col) => col.notNull())
    // audit
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('created_by', 'varchar(255)', (col) => col.notNull())
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_by', 'varchar(255)', (col) => col.notNull())
    .execute();

  // flag keys are only unique within a tenant, not globally
  await db.schema
    .createIndex('idx_feature_flag_tenant_id_key')
    .on('feature_flags')
    .columns(['tenant_id', 'key'])
    .unique()
    .execute();

  await db.schema
    .createIndex('idx_feature_flag_tenant_id_status')
    .on('feature_flags')
    .columns(['tenant_id', 'status'])
    .execute();
}

export async function down(db: Kysely<FlagsDatabase>): Promise<void> {
  await db.schema.dropTable('feature_flags').execute();
}
