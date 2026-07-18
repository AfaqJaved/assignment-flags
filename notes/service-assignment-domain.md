# Service Assignment — User ↔ Service Many-to-Many (Domain Layer)

A Service (e.g. "Haircut") can be offered by multiple Users (staff), and a User can offer multiple Services.

**Do NOT** embed `staffIds: string[]` in `ServiceProps` or `serviceIds: string[]` in `UserProps`. The relationship needs its own entity because:
- It has its own lifecycle (created, soft-deleted)
- It carries audit data
- Queries are symmetric — "staff for a service" AND "services for a staff member"

---

## Entity Name: `ServiceAssignment`

Not `UserService` / `ServiceUser` — those are just concatenations of entity names.
`ServiceAssignment` is the domain noun: "the act of assigning a staff member to perform a service."

Lives inside the `/service/` bounded context (not a new top-level folder).

---

## Target Folder Structure

```
packages/domain/src/service/
├── service.entity.ts                               (exists — no changes)
├── index.ts                                        NEW — barrel
├── errors/
│   └── index.ts                                    NEW
├── events/
│   └── index.ts                                    NEW
├── repository/
│   ├── index.ts                                    NEW
│   ├── service.repository.ts                       NEW
│   └── service.assignment.repository.ts            NEW
└── service-assignment/
    └── service.assignment.entity.ts                NEW — core file
```

---

## 1. Association Entity

**File:** `packages/domain/src/service/service-assignment/service.assignment.entity.ts`

```ts
// ── Props ──────────────────────────────────────────────────────────────────────

export interface ServiceAssignmentProps {
  readonly id: string;
  readonly serviceId: string;
  readonly userId: string;
  readonly businessId: string; // denormalized — every entity in this codebase carries businessId
  // audit
  readonly createdAt: Date;
  readonly createdBy: string;
  readonly updatedAt: Date;
  readonly updatedBy: string;
  readonly deletedAt: Date | null;
  readonly deletedBy: string | null;
  readonly isDeleted: boolean;
}

// ── Create Input ───────────────────────────────────────────────────────────────

export interface ServiceAssignmentCreateInput {
  id: string;
  serviceId: string;
  userId: string;
  businessId: string;
  createdBy: string;
}

// ── Entity ─────────────────────────────────────────────────────────────────────

export class ServiceAssignment {
  private readonly props: ServiceAssignmentProps;

  private constructor(props: ServiceAssignmentProps) {
    this.props = props;
  }

  static create(input: ServiceAssignmentCreateInput): ServiceAssignment {
    const now = new Date();
    return new ServiceAssignment({
      id: input.id,
      serviceId: input.serviceId,
      userId: input.userId,
      businessId: input.businessId,
      createdAt: now,
      createdBy: input.createdBy,
      updatedAt: now,
      updatedBy: input.createdBy,
      deletedAt: null,
      deletedBy: null,
      isDeleted: false,
    });
  }

  static reconstitute(props: ServiceAssignmentProps): ServiceAssignment {
    return new ServiceAssignment(props);
  }

  // ── Mutation ────────────────────────────────────────────────────────────────

  softDelete(deletedBy: string): ServiceAssignment {
    return new ServiceAssignment({
      ...this.props,
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy,
      updatedAt: new Date(),
      updatedBy: deletedBy,
    });
  }

  // ── Identity ────────────────────────────────────────────────────────────────

  get id(): string { return this.props.id; }

  equals(other: ServiceAssignment): boolean {
    return this.props.id === other.props.id;
  }

  // ── Core fields ─────────────────────────────────────────────────────────────

  get serviceId(): string { return this.props.serviceId; }
  get userId(): string { return this.props.userId; }
  get businessId(): string { return this.props.businessId; }

  // ── Audit fields ────────────────────────────────────────────────────────────

  get createdAt(): Date { return this.props.createdAt; }
  get createdBy(): string { return this.props.createdBy; }
  get updatedAt(): Date { return this.props.updatedAt; }
  get updatedBy(): string { return this.props.updatedBy; }
  get deletedAt(): Date | null { return this.props.deletedAt; }
  get deletedBy(): string | null { return this.props.deletedBy; }
  get isDeleted(): boolean { return this.props.isDeleted; }
}
```

> **Mutation note:** `softDelete` is the only mutation. "Changing" an assignment (different user or service) means deleting the old one and creating a new one — there is nothing to update in-place.

---

## 2. Errors

**File:** `packages/domain/src/service/errors/index.ts`

```ts
import type { ErrorShape } from '../../shared';

export type ServiceNotFoundError = ErrorShape & {
  kind: 'service_not_found';
  by: 'id' | 'businessId';
  value: string;
};

export type ServiceAssignmentAlreadyExistsError = ErrorShape & {
  kind: 'service_assignment_already_exists';
  serviceId: string;
  userId: string;
};

export type ServiceAssignmentNotFoundError = ErrorShape & {
  kind: 'service_assignment_not_found';
  by: 'id' | 'serviceId' | 'userId';
  value: string;
};
```

---

## 3. Events

**File:** `packages/domain/src/service/events/index.ts`

```ts
export interface UserAssignedToServiceEvent {
  assignmentId: string;
  serviceId: string;
  userId: string;
  businessId: string;
  assignedBy: string;
}

export interface UserRemovedFromServiceEvent {
  assignmentId: string;
  serviceId: string;
  userId: string;
  businessId: string;
  removedBy: string;
}
```

---

## 4. Repository Interfaces

**File:** `packages/domain/src/service/repository/service.repository.ts`

```ts
import type { Result } from '../../shared/result';
import type { InfrastructureError } from '../../shared';
import type { ServiceNotFoundError } from '../errors';
import type { Service } from '../service.entity';

export interface ServiceRepository {
  save(service: Service): Promise<Result<void, InfrastructureError>>;
  findById(id: string): Promise<Result<Service | null, ServiceNotFoundError | InfrastructureError>>;
  findAllByBusiness(businessId: string): Promise<Result<Service[], InfrastructureError>>;
  update(service: Service): Promise<Result<void, ServiceNotFoundError | InfrastructureError>>;
  existsById(id: string): Promise<Result<boolean, InfrastructureError>>;
}

export const IServiceRepository = Symbol('IServiceRepository');
```

**File:** `packages/domain/src/service/repository/service.assignment.repository.ts`

```ts
import type { Result } from '../../shared/result';
import type { InfrastructureError } from '../../shared';
import type { ServiceAssignmentAlreadyExistsError, ServiceAssignmentNotFoundError } from '../errors';
import type { ServiceAssignment } from '../service-assignment/service.assignment.entity';

export interface ServiceAssignmentRepository {
  save(assignment: ServiceAssignment): Promise<Result<void, ServiceAssignmentAlreadyExistsError | InfrastructureError>>;
  findById(id: string): Promise<Result<ServiceAssignment | null, ServiceAssignmentNotFoundError | InfrastructureError>>;
  findAllByService(serviceId: string): Promise<Result<ServiceAssignment[], InfrastructureError>>;
  findAllByUser(userId: string): Promise<Result<ServiceAssignment[], InfrastructureError>>;
  findAllByBusiness(businessId: string): Promise<Result<ServiceAssignment[], InfrastructureError>>;
  findByServiceAndUser(serviceId: string, userId: string): Promise<Result<ServiceAssignment | null, InfrastructureError>>;
  existsByServiceAndUser(serviceId: string, userId: string): Promise<Result<boolean, InfrastructureError>>;
  update(assignment: ServiceAssignment): Promise<Result<void, ServiceAssignmentNotFoundError | InfrastructureError>>;
}

export const IServiceAssignmentRepository = Symbol('IServiceAssignmentRepository');
```

> The natural uniqueness constraint is `(serviceId, userId)` — hence `findByServiceAndUser` and `existsByServiceAndUser`.
> `update` is used to persist soft-delete state from `softDelete()`.

**File:** `packages/domain/src/service/repository/index.ts`

```ts
export * from './service.repository';
export * from './service.assignment.repository';
```

---

## 5. Barrel

**File:** `packages/domain/src/service/index.ts`

```ts
export * from './service.entity';
export * from './service-assignment/service.assignment.entity';
export * from './errors/';
export * from './events/';
export * from './repository/';
```

---

## 6. Wire Into Domain Root

**File:** `packages/domain/src/index.ts`

```ts
export * from './shared/';
export * from './user/';
export * from './business/';
export * from './service/';   // add this line
```

---

## Key Conventions

| Thing | Rule |
|-------|------|
| Uniqueness constraint | `(serviceId, userId)` pair must be unique — enforce at DB level too |
| Removing assignment | Call `assignment.softDelete(deletedBy)` then `repository.update(assignment)` — never hard delete |
| Re-assignment | Delete old `ServiceAssignment`, create a new one — don't mutate in place |
| `businessId` denormalization | Carry it on the assignment (same as every other entity) to allow business-scoped queries without joins |
