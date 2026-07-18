import { Selectable, Insertable, Updateable } from 'kysely';
import type { TenantStatus } from '@flags/domain';

export interface TenantTable {
  id: string; // uuid primary key
  name: string; // display name of the tenant application
  slug: string; // unique URL-friendly identifier
  api_key_hash: string; // hashed API key; plaintext is only ever returned once, at registration
  status: TenantStatus; // 'active' | 'suspended'
  created_at: Date;
  updated_at: Date;
}

export type TenantTableSelect = Selectable<TenantTable>;
export type TenantTableInsert = Insertable<TenantTable>;
export type TenantTableUpdate = Updateable<TenantTable>;
