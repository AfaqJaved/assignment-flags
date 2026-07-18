# Custom Booking Status Workflow

## Context
Businesses need to define their own booking statuses (Pending, Confirmed, Paid, etc.). Currently the `bookings` table has no `status` field. This feature introduces a `booking_statuses` domain — each business owns an ordered list of statuses. Some are system-provided (undeletable) and one is the default applied to every new booking.

---

## Architecture Decision

**New `booking_statuses` table (not JSONB in business settings)**
- Allows filtering/querying bookings by status efficiently
- Relational integrity via FK on `bookings.status_id`

**Lazy seeding of system defaults**
- 5 system statuses are seeded automatically on the *first booking creation* per business
- `SeedDefaultStatusesUseCase` is idempotent — checks `hasAnyStatus(businessId)` before inserting
- Avoids coupling to `RegisterBusinessUseCase`

**Single default enforced at DB level**
- Partial unique index: `UNIQUE (business_id) WHERE is_default = true AND is_deleted = false`

---

## System Default Statuses (seeded per business)

| Name | Color | Order | isDefault | isSystem |
|---|---|---|---|---|
| Pending | `#F59E0B` | 1 | ✅ | ✅ |
| Confirmed | `#3B82F6` | 2 | | ✅ |
| Paid | `#10B981` | 3 | | ✅ |
| No Show | `#6B7280` | 4 | | ✅ |
| Cancelled | `#EF4444` | 5 | | ✅ |

Users can add their own custom statuses after these.

---

## Database Schema

### New table: `booking_statuses`
```sql
id             uuid PRIMARY KEY
business_id    uuid FK → businesses.id ON DELETE CASCADE
name           varchar(100)       -- e.g. "Pending", "Paid"
color          varchar(7)         -- hex color e.g. "#F59E0B"
sort_order     integer            -- 1-based, ordered per business
is_system      boolean            -- true = cannot be deleted
is_default     boolean            -- true = assigned to new bookings
-- AuditFields
created_at, created_by, updated_at, updated_by, deleted_at, deleted_by, is_deleted
```

**Indexes:**
```sql
UNIQUE INDEX (business_id, name)                                         -- no duplicates
UNIQUE INDEX (business_id) WHERE is_default = true AND is_deleted = false -- single default
INDEX (business_id, sort_order)                                          -- ordered fetch
```

### Modified: `bookings` table
```sql
ADD COLUMN status_id uuid REFERENCES booking_statuses(id) ON DELETE RESTRICT
```

---

## New Files

### Domain (`packages/domain/src/booking-status/`)
```
booking-status.entity.ts          BookingStatusProps, BookingStatus class, SYSTEM_BOOKING_STATUSES constant
errors/index.ts                   NotFound, AlreadyExists, IsSystem, IsDefault errors
repository/booking-status.repository.ts
usecases/seed.default.statuses.usecase.ts
usecases/get.booking.statuses.usecase.ts
usecases/create.booking.status.usecase.ts
usecases/update.booking.status.usecase.ts
usecases/reorder.booking.statuses.usecase.ts
usecases/delete.booking.status.usecase.ts
usecases/index.ts
index.ts
```

### Database
```
packages/api/src/shared/database/schema/booking-status.table.ts
packages/api/src/shared/database/migrations/20260620T120000-booking_status_table.ts
packages/api/src/shared/database/migrations/20260620T130000-booking_add_status_id.ts
```

### API Module (`packages/api/src/modules/booking-status/`)
```
booking-status.module.ts
booking-status.controller.ts
factory/booking-status.usecases.factory.ts
mappers/booking-status.database.mapper.ts
repository/booking-status.repository.impl.ts
usecases/seed.default.statuses.usecase.impl.ts
usecases/get.booking.statuses.usecase.impl.ts
usecases/create.booking.status.usecase.impl.ts
usecases/update.booking.status.usecase.impl.ts
usecases/reorder.booking.statuses.usecase.impl.ts
usecases/delete.booking.status.usecase.impl.ts
dto/create.booking.status.dto.ts
dto/update.booking.status.dto.ts
dto/reorder.booking.statuses.dto.ts
errors/booking-status.errors.map.ts
```

### Shared + UI
```
packages/shared/src/api/booking-status/booking-status.endpoints.ts
packages/shared/src/api/booking-status/booking-status.types.ts
packages/shared/src/api/booking-status/index.ts
packages/ui/src/modules/api/booking-status/  (query + mutation files)
packages/ui/src/modules/settings/booking-preferences/booking-statuses/booking-statuses.svelte
```

---

## Modified Files

| File | Change |
|---|---|
| `packages/domain/src/booking/booking.entity.ts` | Add `statusId: string` to props, inputs, `create()`, `update()` |
| `packages/domain/src/index.ts` | Export `booking-status` |
| `packages/api/src/shared/database/schema/booking.table.ts` | Add `status_id: string \| null` |
| `packages/api/src/shared/database/schema/index.ts` | Register `booking_statuses` on `PikSlotsDatabase` |
| `packages/api/src/modules/booking/mappers/booking.database.mapper.ts` | Map `status_id ↔ statusId` |
| `packages/api/src/modules/booking/repository/booking.repository.impl.ts` | Include `status_id` in queries |
| `packages/api/src/modules/booking/usecases/register.booking.usecase.impl.ts` | Inject seed use case → resolve default status id → pass to `Booking.create()` |
| `packages/api/src/pikslots.app.module.ts` | Import `BookingStatusModule` |
| `packages/shared/src/api/index.ts` | Export booking-status contracts |

---

## Use Cases

| Use Case | Auth | Key Rules |
|---|---|---|
| `SeedDefaultStatuses` | internal | Idempotent — `hasAnyStatus()` check before insert |
| `GetBookingStatuses` | same business | Ordered by `sort_order` asc |
| `CreateBookingStatus` | same business | `max(sort_order)+1`; name uniqueness check |
| `UpdateBookingStatus` | same business | Cannot rename to an existing name |
| `ReorderBookingStatuses` | same business | Accepts `orderedIds: string[]`; reassigns `sort_order` in a transaction |
| `DeleteBookingStatus` | same business | Blocked if `is_system=true` OR `is_default=true` |

---

## Domain Entity Sketch

```typescript
export interface BookingStatusProps {
  id: string;
  businessId: string;
  name: string;
  color: string;
  sortOrder: number;
  isSystem: boolean;
  isDefault: boolean;
  // + AuditFields
}

export const SYSTEM_BOOKING_STATUSES = [
  { name: 'Pending',   color: '#F59E0B', sortOrder: 1, isDefault: true  },
  { name: 'Confirmed', color: '#3B82F6', sortOrder: 2, isDefault: false },
  { name: 'Paid',      color: '#10B981', sortOrder: 3, isDefault: false },
  { name: 'No Show',   color: '#6B7280', sortOrder: 4, isDefault: false },
  { name: 'Cancelled', color: '#EF4444', sortOrder: 5, isDefault: false },
] as const;

export class BookingStatus {
  canDelete(): boolean { return !this.props.isSystem; }
  rename(name, updatedBy): BookingStatus { ... }
  recolor(color, updatedBy): BookingStatus { ... }
  reorder(sortOrder, updatedBy): BookingStatus { ... }
  markAsDefault(updatedBy): BookingStatus { ... }
  softDelete(deletedBy): BookingStatus { ... }
}
```

---

## Register Booking Flow (updated)

```
RegisterBookingUseCaseImpl.execute()
  1. Authorize caller (SecurityContext)
  2. Check time conflict (hasConflict)
  3. SeedDefaultStatusesUseCase.execute({ businessId })  ← idempotent
  4. BookingStatusRepository.findDefaultByBusiness(businessId)
  5. Booking.create({ ..., statusId: defaultStatus.id })
  6. BookingRepository.save(booking)
```

---

## Implementation Order

1. Domain entity + errors + repository interface
2. Domain use case interfaces (6 files)
3. Update `booking.entity.ts` — add `statusId`
4. DB schema files + update `schema/index.ts` + update `booking.table.ts`
5. Migrations (table first, then alter bookings)
6. Repository implementation
7. Use case implementations (seed impl is critical path)
8. Update booking infra (mapper, repo impl, register use case impl)
9. Module wiring (BookingStatusModule → app module; import in BookingModule)
10. Shared API contracts
11. UI — queries/mutations + settings Svelte page

---

## Verification Steps

1. `pnpm db:migrate` — runs both migrations cleanly
2. Create a booking via API — `booking_statuses` seeded, `bookings.status_id` populated
3. `GET /booking-statuses?businessId=X` — returns 5 system statuses in order
4. `POST /booking-statuses` — custom status appended at end
5. `PATCH /booking-statuses/reorder` — sort_order updates correctly
6. `DELETE` system status → `403 BookingStatusIsSystem`
7. UI: Settings → Booking Preferences → Statuses — color swatches, drag handles, CRUD
