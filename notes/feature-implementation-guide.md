# Feature Implementation Guide — Pikslots

Full walkthrough for adding a new "update X" feature end-to-end, from domain to UI.
Follow every step in order. Use existing files as reference (brand-details / appearance).

---

## 1. Domain — Use Case Interface

**File:** `packages/domain/src/business/usecases/update.<feature>.usecase.ts`

```ts
import type { InfrastructureError, Result } from '../../shared';
import type { BusinessNotFoundError } from '../errors';
import type { Business } from '../business.entity';

export interface Update<Feature>Command {
  id: string;
  // ...fields
}

export const IUpdate<Feature>UseCase = Symbol('IUpdate<Feature>UseCase');

export interface Update<Feature>UseCase {
  execute(
    command: Update<Feature>Command,
  ): Promise<Result<Business, BusinessNotFoundError | InfrastructureError>>;
}
```

**Then export it:**
`packages/domain/src/business/usecases/index.ts`

```ts
export * from './update.<feature>.usecase.ts';
```

---

## 2. Domain — Entity Method

**File:** `packages/domain/src/business/business.entity.ts`

Add an immutable update method following the existing pattern:

```ts
update<Feature>(value: {
  // ...fields
  updatedBy: string;
}): Business {
  return new Business({
    ...this.props,
    // ...spread updated fields
    updatedAt: new Date(),
    updatedBy: value.updatedBy,
  });
}
```

Pattern rules:

- Always return `new Business({ ...this.props, ...changes })`
- Always stamp `updatedAt: new Date()` and `updatedBy: value.updatedBy`
- For nested objects (e.g. `brandApperanceDetails`) replace the whole object — don't spread the old one unless you intentionally want to keep unchanged fields

---

## 3. API — Use Case Implementation

**File:** `packages/api/src/modules/business/usecases/update.<feature>.usecase.impl.ts`

```ts
import { Inject, Injectable } from '@nestjs/common';
import { Business, IBusinessRepository, InfrastructureError, Result, err, ok } from '@pikslots/domain';
import type {
  BusinessNotFoundError,
  BusinessRepository,
  Update<Feature>Command,
  Update<Feature>UseCase,
} from '@pikslots/domain';

const BUSINESS_NOT_FOUND = (id: string): BusinessNotFoundError => ({
  kind: 'business_not_found',
  by: 'id',
  value: id,
  message: `Business not found against ${id}`,
  timestamp: new Date(),
});

@Injectable()
export class Update<Feature>UseCaseImpl implements Update<Feature>UseCase {
  constructor(
    @Inject(IBusinessRepository)
    private readonly businessRepository: BusinessRepository,
  ) {}

  async execute(
    command: Update<Feature>Command,
  ): Promise<Result<Business, BusinessNotFoundError | InfrastructureError>> {
    const findResult = await this.businessRepository.findById(command.id);
    if (!findResult.ok) return err(findResult.error as InfrastructureError);

    const business = findResult.value;
    if (!business) return err(BUSINESS_NOT_FOUND(command.id));

    const updated = business.update<Feature>({
      // ...map command fields
      updatedBy: business.ownerId,
    });

    const updateResult = await this.businessRepository.update(updated);
    if (!updateResult.ok) return err(updateResult.error as BusinessNotFoundError | InfrastructureError);

    return ok(updated);
  }
}
```

> **Note:** Use `businessRepository.update()` (SQL UPDATE) not `.save()` (SQL INSERT).
> If `BusinessAlreadyExistsError` is not possible for this feature, type-cast `updateResult.error`.

---

## 4. API — Register the Use Case

**`packages/api/src/modules/business/usecases/index.ts`**

```ts
import { IUpdate<Feature>UseCase } from '@pikslots/domain';
import { Update<Feature>UseCaseImpl } from './update.<feature>.usecase.impl';

export const BUSINESS_USECASES: Provider[] = [
  // ...existing
  {
    useClass: Update<Feature>UseCaseImpl,
    provide: IUpdate<Feature>UseCase,
  },
];
```

**`packages/api/src/modules/business/factroy/business.usecases.factory.ts`**

```ts
import { IUpdate<Feature>UseCase } from '@pikslots/domain';
import type { Update<Feature>UseCase } from '@pikslots/domain';

@Injectable()
export class BusinessUseCaseFactory {
  // ...existing

  @Inject(IUpdate<Feature>UseCase)
  public readonly update<Feature>UseCase: Update<Feature>UseCase;
}
```

---

## 5. Shared — Types & Endpoint

**`packages/shared/src/api/business/business.types.ts`**

```ts
// Request input (consumed by both DTO and UI)
export interface Update<Feature>Input {
  // ...fields (no id — that comes from URL param)
}

// Response (usually just BusinessResponse alias)
export type Update<Feature>Response = BusinessResponse;
```

**`packages/shared/src/api/business/business.endpoints.ts`**

```ts
export const BUSINESS_ENDPOINTS = {
  // ...existing
  UPDATE_<FEATURE>: '/businesses/:id/<feature-path>',
} as const;
```

---

## 6. API — DTO

**File:** `packages/api/src/modules/business/dto/update.business.<feature>.dto.ts`

```ts
import { ApiProperty } from '@nestjs/swagger';
import type { Update<Feature>Input } from '@pikslots/shared';
import { PikSlotsEnumValidation, PikSlotsStringValidation } from 'src/shared/decorators/validations';

export class Update<Feature>Dto implements Update<Feature>Input {
  @ApiProperty({ example: '...' })
  @PikSlotsStringValidation(1, 100)   // use appropriate validator
  fieldName: string;

  // For arrays:
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl({}, { each: true })
  urlArray: string[];
}
```

Available validators (from `src/shared/decorators/validations`):

- `@PikSlotsStringValidation(min, max)` — required string with length bounds
- `@PikSlotsSlugValidation()` — URL-safe slug
- `@PikSlotsEnumValidation(values[])` — enum membership
- `@PikSlotsOptionalUrlValidation()` — optional URL (skips if null/undefined)
- `@PikSlotsUrlValidation()` — required URL

---

## 7. API — Swagger Docs Decorator

**File:** `packages/api/src/modules/business/docs/business.controller.docs.ts`

```ts
import { Update<Feature>Dto } from '../dto/update.business.<feature>.dto';

export const Update<Feature>Docs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Update <feature> for a business' }),
    ApiParam({ name: 'id', description: 'Business ID', example: 'biz_01j...' }),
    ApiBody({ type: Update<Feature>Dto }),
    ApiResponse({ status: HttpStatus.OK, description: 'Updated successfully', schema: { example: { data: {}, statusCode: 200, timestamp: '' } } }),
    ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Business not found', type: PikslotsBaseErrorResponse }),
    ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Validation error', type: PikslotsBaseErrorResponse }),
    ApiResponse({ status: HttpStatus.INTERNAL_SERVER_ERROR, description: 'Infrastructure failure', type: PikslotsBaseErrorResponse }),
  );
```

---

## 8. API — Controller Method

**File:** `packages/api/src/modules/business/business.controller.ts`

```ts
@Update<Feature>Docs()
@UseGuards(RolesGuard)
@Roles('Platform Owner', 'Business Owner', 'Admin')
@Patch(':id/<feature-path>')
async update<Feature>(
  @Res({ passthrough: true }) res: Response,
  @Param('id') id: string,
  @Body() dto: Update<Feature>Dto,
): Promise<PikslotsBaseErrorResponse | PikslotsBaseResponse<Update<Feature>Response>> {
  const result = await this.businessUseCaseFactory.update<Feature>UseCase.execute({
    id,
    // ...map dto fields
  });

  if (!result.ok) {
    const errorResponse = mapBusinessError(result.error);
    res.status(errorResponse.statusCode);
    return errorResponse;
  }

  const b = result.value;
  const response: Update<Feature>Response = {
    id: b.id, ownerId: b.ownerId, slug: b.slug, name: b.name,
    industry: b.industry, about: b.about,
    appearInSearchResults: b.appearInSearchResults,
    status: b.status, suspendedReason: b.suspendedReason,
    brandDetail: b.brandDetail,
    brandAppearanceDetails: b.brandApperanceDetails,   // note: domain typo "Apperance"
    locationDetails: b.locationDetails,
    bookingPolicies: b.bookingPolicies,
    bookingSetup: b.bookingSetup,
    bookingContactFields: b.bookingContactFields,
    bookingCustomization: b.bookingCustomization,
    bookingLabelOverrides: b.bookingLabelOverrides,
    teamNotifications: b.teamNotifications,
    customerNotifications: b.customerNotifications,
    notificationCustomization: b.notificationCustomization,
    subscriptionPlan: b.subscriptionPlan,
    subscriptionStatus: b.subscriptionStatus,
    trialEndsAt: b.trialEndsAt,
    createdAt: b.createdAt, createdBy: b.createdBy,
    updatedAt: b.updatedAt, updatedBy: b.updatedBy,
  };

  res.status(HttpStatus.OK);
  return new PikslotsBaseResponse(response, HttpStatus.OK);
}
```

> **Gotcha:** The domain entity getter is `brandApperanceDetails` (typo — one 'a' in "Apperance") but the shared/API type uses `brandAppearanceDetails` (correct spelling). Always map between them explicitly.

---

## 9. UI — Model Types

**File:** `packages/ui/src/modules/api/business/models/business-model.ts`

```ts
import type { Update<Feature>Input, Update<Feature>Response } from '@pikslots/shared';

export type BusinessUpdate<Feature>Input = Update<Feature>Input & { id: string };
export type BusinessUpdate<Feature>Result = Update<Feature>Response;
```

---

## 10. UI — Mutation File

**File:** `packages/ui/src/modules/api/business/update.business.<feature>.mutation.ts`

```ts
import { BUSINESS_ENDPOINTS } from '@pikslots/shared';
import type { BaseErrorResponse } from '@pikslots/shared';
import { apiClient } from '$lib/http/axios.js';
import { mutationOptions } from '@tanstack/svelte-query';
import type { AxiosError } from 'axios';
import type { BusinessUpdate<Feature>Input, BusinessUpdate<Feature>Result } from './models/business-model';
import type { PikslotResponse } from '../common/common-models';

export const update<Feature> = async (
  input: BusinessUpdate<Feature>Input
): Promise<BusinessUpdate<Feature>Result> => {
  const { id, ...body } = input;
  const endpoint = BUSINESS_ENDPOINTS.UPDATE_<FEATURE>.replace(':id', id);
  const { data } = await apiClient.patch<PikslotResponse<BusinessUpdate<Feature>Result>>(endpoint, body);
  return data.data;
};

export const update<Feature>MutationOptions = () =>
  mutationOptions<BusinessUpdate<Feature>Result, AxiosError<BaseErrorResponse>, BusinessUpdate<Feature>Input>({
    mutationKey: ['update-business-<feature>'],
    mutationFn: update<Feature>,
  });
```

---

## 11. UI — Svelte Component

**Pattern to follow in the component's `<script>` block:**

```ts
import { createMutation } from '@tanstack/svelte-query';
import { update<Feature> } from '../../../api/business/update.business.<feature>.mutation';
import type { BusinessUpdate<Feature>Input, BusinessUpdate<Feature>Result } from '../../../api/business/models/business-model';
import type { BaseErrorResponse } from '@pikslots/shared';
import type { AxiosError } from 'axios';
import { toast } from 'svelte-sonner';
import { businessStore } from '../../../core/store/business.svelte';

const business = $derived(businessStore.selectedBusiness);

// 1. Local state for each editable field
let fieldA = $state('');
let fieldB = $state<SomeType>('default');

// 2. Sync local state from store (runs once when business loads)
$effect(() => {
  if (business) {
    fieldA = business.someSection.fieldA;
    fieldB = business.someSection.fieldB;
  }
});

// 3. Dirty check — compare each local field against the store value
const isDirty = $derived(
  !!business &&
    (fieldA !== business.someSection.fieldA ||
     fieldB !== business.someSection.fieldB)
);

// 4. Mutation
const updateMutation = createMutation<
  BusinessUpdate<Feature>Result,
  AxiosError<BaseErrorResponse>,
  BusinessUpdate<Feature>Input
>(() => ({
  mutationFn: update<Feature>,
}));

// 5. React to mutation result
$effect(() => {
  if (updateMutation.data) {
    businessStore.setSelectedBusiness(updateMutation.data); // resets dirty state
    toast.success('<Feature> saved successfully.');
  }
  if (updateMutation.isError) {
    toast.error(
      updateMutation.error?.response?.data?.message ?? 'Failed to save. Please try again.'
    );
  }
});

// 6. Save handler
function handleSave() {
  if (!business) return;
  updateMutation.mutate({
    id: business.id,
    fieldA,
    fieldB,
  });
}
```

**Save button pattern:**

```svelte
<Button
  size="sm"
  onclick={handleSave}
  disabled={!isDirty || updateMutation.isPending}
>
  {updateMutation.isPending ? 'Saving...' : 'Save'}
</Button>
```

**Why `isDirty` resets automatically after save:**
`businessStore.setSelectedBusiness(updateMutation.data)` updates the store, which changes the `business` derived value, which causes `$effect` to re-sync local state to the new values — making `isDirty` false again.

---

## Key Conventions & Gotchas

| Thing                         | Rule                                                                                                                                                        |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository method for updates | Always use `businessRepository.update()`, never `save()` (that's INSERT-only)                                                                               |
| Entity getter typo            | Domain has `brandApperanceDetails` (one 'a') — shared type has `brandAppearanceDetails` (correct). Map explicitly in controller.                            |
| `id` in mutation input        | The `id` field is added only on the UI model type (`& { id: string }`). Strip it before sending to the API by destructuring `const { id, ...body } = input` |
| Error map                     | `mapBusinessError` in `business.errors.map.ts` handles all `BusinessError` kinds. No need to add new entries unless you introduce a new error kind.         |
| Roles                         | Use `@Roles('Platform Owner', 'Business Owner', 'Admin')` for settings endpoints that the business owner should manage                                      |
| Gallery/array dirty check     | Use `JSON.stringify` comparison: `JSON.stringify(localArr) !== JSON.stringify(business.section.arr)`                                                        |
