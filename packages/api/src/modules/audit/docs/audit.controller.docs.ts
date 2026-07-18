import { applyDecorators } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { AuditLogEntryResponseDto } from '../dto/audit.log.response.dto';

export const GetFlagHistoryDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: "Get a flag's audit history",
      description:
        'Returns every recorded change for this flag, most recent first, ' +
        "for the tenant resolved from the caller's X-API-Key. Audit records are append-only.",
    }),
    ApiParam({ name: 'key', example: 'new-checkout' }),
    ApiOkResponse({
      description: 'Flag history.',
      type: [AuditLogEntryResponseDto],
    }),
    ApiNotFoundResponse({
      description: 'No flag with this key exists for this tenant.',
    }),
  );
