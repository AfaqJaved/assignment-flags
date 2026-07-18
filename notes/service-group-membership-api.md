# Plan: ServiceGroupMembership — API Layer Implementation

## Context

The domain layer for `ServiceGroupMembership` is already complete (entity, repository interface, 3 use case interfaces, errors). This plan covers wiring it up in the API (`packages/api`) and shared (`packages/shared`) packages — everything from the DB table to the HTTP endpoints. All work is contained inside the existing `service-group` module.

## Files to Create

```
packages/api/src/shared/database/
  schema/service.group.membership.table.ts            NEW — Kysely table type
  migrations/20260609T000000-service_group_membership_table.ts  NEW

packages/api/src/modules/service-group/
  mappers/service.group.membership.database.mapper.ts NEW
  repository/service.group.membership.repository.impl.ts  NEW
  usecases/assign.service.to.group.usecase.impl.ts    NEW
  usecases/remove.service.from.group.usecase.impl.ts  NEW
  usecases/find.services.by.group.usecase.impl.ts     NEW
  dto/assign.service.to.group.dto.ts                  NEW
  docs/service.group.membership.controller.docs.ts    NEW
```

## Files to Modify

| File | Change |
|------|--------|
| `packages/api/src/shared/database/schema/index.ts` | Add `service_group_memberships: ServiceGroupMembershipTable` to `PikSlotsDatabase` |
| `packages/api/src/modules/service-group/usecases/index.ts` | Register 3 new `Provider` entries |
| `packages/api/src/modules/service-group/factory/service.group.usecases.factory.ts` | Add 3 injected usecase properties |
| `packages/api/src/modules/service-group/errors/service.group.errors.map.ts` | Add `service_group_membership_already_exists` and `service_group_membership_not_found` cases |
| `packages/api/src/modules/service-group/service.group.module.ts` | Register `ServiceGroupMembershipRepositoryImpl` with `IServiceGroupMembershipRepository` |
| `packages/api/src/modules/service-group/service.group.controller.ts` | Add 3 new endpoint methods |
| `packages/shared/src/api/service-group/service.group.types.ts` | Add request/response types for membership |
| `packages/shared/src/api/service-group/service.group.endpoints.ts` | Add 3 new endpoint constants |

---

## 1 — Database Schema (`service.group.membership.table.ts`)

```ts
export interface ServiceGroupMembershipTable extends AuditFields {
  id: string;
  service_id: string;       // fk → services.id CASCADE
  service_group_id: string; // fk → service_groups.id CASCADE
  business_id: string;      // fk → businesses.id CASCADE (denormalized)
}
```

Types: `Selectable`, `Insertable`, `Updateable` — same pattern as `ServiceGroupTable`.

## 2 — Migration

Table: `service_group_memberships`
- Columns: same as schema above + full audit columns
- FKs: `service_id → services.id ON DELETE CASCADE`, `service_group_id → service_groups.id ON DELETE CASCADE`, `business_id → businesses.id ON DELETE CASCADE`
- **Partial unique index** on `(service_id, service_group_id) WHERE is_deleted = false` — prevents duplicate active memberships while allowing a service to be re-added after removal
- Indexes on `service_group_id`, `service_id`, `business_id`, `is_deleted`

## 3 — Mapper (`service.group.membership.database.mapper.ts`)

Same pattern as `ServiceGroupPersistenceMapper`. Uses `persistenceAuditToDomain` / `domainAuditToPersistence` helpers.

## 4 — Repository Impl

`ServiceGroupMembershipRepositoryImpl implements ServiceGroupMembershipRepository`:
- `save` → `insertInto('service_group_memberships')`
- `findById` → `selectFrom` where `id = ?`
- `findAllByServiceGroup` → `where service_group_id = ?`
- `findAllByService` → `where service_id = ?`
- `findAllByBusiness` → `where business_id = ?`
- `findByServiceAndGroup` → `where service_id = ? AND service_group_id = ? AND is_deleted = false` — returns first or null
- `existsByServiceAndGroup` → same filter, `select count` or `limit 1`
- `update` → `updateTable` where `id = ?`

All methods return `ok(...)` / `err(InfrastructureError)`.

## 5 — Use Case Impls

### `AssignServiceToGroupUseCaseImpl`
1. `existsByServiceAndGroup(serviceId, serviceGroupId)` → if `true` return `err(ServiceGroupMembershipAlreadyExistsError)`
2. `ServiceGroupMembership.create({ id: uuidv7(), serviceId, serviceGroupId, businessId, createdBy })`
3. `membershipRepository.save(membership)` → propagate error
4. Return `ok(membership)`

### `RemoveServiceFromGroupUseCaseImpl`
1. `findByServiceAndGroup(serviceId, serviceGroupId)` → if `null` return `err(ServiceGroupMembershipNotFoundError)`
2. `membership.softDelete(deletedBy)`
3. `membershipRepository.update(softDeleted)` → propagate error
4. Return `ok(undefined)`

### `FindServicesByGroupUseCaseImpl`
1. `findAllByServiceGroup(serviceGroupId)`
2. Filter `!m.isDeleted`
3. Return `ok(active)`

## 6 — Shared Types (additions to `service.group.types.ts`)

```ts
export interface AssignServiceToGroupInput {
  serviceId: string;
  businessId: string;
}

export interface ServiceGroupMembershipResponse {
  id: string;
  serviceId: string;
  serviceGroupId: string;
  businessId: string;
}

export type FindServicesByGroupResponse = ServiceGroupMembershipResponse[];
```

## 7 — Shared Endpoints (additions to `service.group.endpoints.ts`)

```ts
ASSIGN_SERVICE:          '/service-groups/:serviceGroupId/members',
REMOVE_SERVICE:          '/service-groups/:serviceGroupId/members/:serviceId',
FIND_SERVICES_BY_GROUP:  '/service-groups/:serviceGroupId/members',
```

## 8 — DTO (`assign.service.to.group.dto.ts`)

Fields: `serviceId: string`, `businessId: string`. `serviceGroupId` comes from `@Param`.

## 9 — Controller Endpoints (added to `service.group.controller.ts`)

| Method | Decorator | Path constant | Roles |
|--------|-----------|---------------|-------|
| `POST` | `@Post(SERVICE_GROUP_ENDPOINTS.ASSIGN_SERVICE)` | `/service-groups/:serviceGroupId/members` | Platform Owner, Business Owner, Admin |
| `DELETE` | `@Delete(SERVICE_GROUP_ENDPOINTS.REMOVE_SERVICE)` | `/service-groups/:serviceGroupId/members/:serviceId` | Platform Owner, Business Owner, Admin |
| `GET` | `@Get(SERVICE_GROUP_ENDPOINTS.FIND_SERVICES_BY_GROUP)` | `/service-groups/:serviceGroupId/members` | (no role guard — public read) |

`createdBy` / `deletedBy` come from `securityContext.userId`.

## 10 — Error Map Update

Add to `serviceGroupErrorMap`:
```ts
service_group_membership_already_exists: () => 409 CONFLICT
service_group_membership_not_found:      () => 404 NOT_FOUND
```

Update the `ServiceGroupError` union type accordingly.

## Verification

- `bun run build` in `packages/api` compiles with no errors
- `POST /service-groups/:serviceGroupId/members` → 201 on success, 409 on duplicate
- `DELETE /service-groups/:serviceGroupId/members/:serviceId` → 200 on success, 404 if not assigned
- `GET /service-groups/:serviceGroupId/members` → 200 with array of membership records
