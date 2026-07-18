import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { EvaluateFlagsDto } from '../dto/evaluate.flags.dto';
import { BulkEvaluateFlagsDto } from '../dto/bulk.evaluate.flags.dto';
import { EvaluatedFlagResponseDto } from '../dto/evaluated.flag.response.dto';

export const EvaluateFlagsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Evaluate flags for a user/context',
      description:
        'Evaluates the requested `flagKeys`, or every active flag for the tenant ' +
        'if omitted. Percentage rollouts are deterministic — the same `userId` ' +
        'always resolves to the same bucket for a given flag.',
    }),
    ApiBody({ type: EvaluateFlagsDto }),
    ApiOkResponse({
      description: 'Evaluated flag values.',
      type: [EvaluatedFlagResponseDto],
    }),
    ApiBadRequestResponse({ description: 'Unknown environment.' }),
    ApiNotFoundResponse({
      description:
        'Tenant not found, or one or more requested flag keys do not exist.',
    }),
  );

export const BulkEvaluateFlagsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Bulk evaluate every active flag for a user/context',
      description:
        'Evaluates every active flag for the tenant against a single user/context ' +
        'in one request. Same determinism guarantee as the single-flag endpoint.',
    }),
    ApiBody({ type: BulkEvaluateFlagsDto }),
    ApiOkResponse({
      description: 'Evaluated flag values.',
      type: [EvaluatedFlagResponseDto],
    }),
    ApiBadRequestResponse({ description: 'Unknown environment.' }),
    ApiNotFoundResponse({ description: 'Tenant not found.' }),
  );
