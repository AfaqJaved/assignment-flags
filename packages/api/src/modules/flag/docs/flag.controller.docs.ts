import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { CreateFeatureFlagDto } from '../dto/create.feature.flag.dto';
import { UpdateFeatureFlagDto } from '../dto/update.feature.flag.dto';
import { ArchiveFeatureFlagDto } from '../dto/archive.feature.flag.dto';
import { FeatureFlagResponseDto } from '../dto/feature.flag.response.dto';

export const CreateFeatureFlagDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Create a feature flag',
      description:
        'Creates a new flag, disabled with 0% rollout in every environment. ' +
        '`defaultValue` must match the runtime type declared in `type`.',
    }),
    ApiBody({ type: CreateFeatureFlagDto }),
    ApiCreatedResponse({
      description: 'Flag created.',
      type: FeatureFlagResponseDto,
    }),
    ApiConflictResponse({
      description: 'A flag with this key already exists for this tenant.',
    }),
  );

export const ListFeatureFlagsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'List feature flags',
      description:
        'Lists every flag for the authenticated tenant. Optionally filter by ' +
        '`status`, or by `environment` to only return flags enabled there.',
    }),
    ApiOkResponse({
      description: 'Flags listed.',
      type: [FeatureFlagResponseDto],
    }),
  );

export const UpdateFeatureFlagDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: "Update a flag's rollout config for one environment",
      description:
        '`enabled` and `rolloutPercentage` are scoped to ' +
        'the `:environment` path segment. `defaultValue`, if provided, applies across ' +
        'every environment. Archived flags cannot be updated.',
    }),
    ApiBody({ type: UpdateFeatureFlagDto }),
    ApiOkResponse({
      description: 'Flag updated.',
      type: FeatureFlagResponseDto,
    }),
    ApiNotFoundResponse({
      description: 'No flag with this key exists for this tenant.',
    }),
    ApiConflictResponse({
      description: 'This flag has been archived and can no longer be mutated.',
    }),
  );

export const ArchiveFeatureFlagDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Archive a flag',
      description: 'Soft-deletes a flag by marking it archived. Idempotent.',
    }),
    ApiBody({ type: ArchiveFeatureFlagDto }),
    ApiOkResponse({
      description: 'Flag archived.',
      type: FeatureFlagResponseDto,
    }),
    ApiNotFoundResponse({
      description: 'No flag with this key exists for this tenant.',
    }),
  );
