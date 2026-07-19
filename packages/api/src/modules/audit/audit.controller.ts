import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuditUsecasesFactory } from './factory/audit.usecases.factory';
import { AuditLogEntryResponseDto } from './dto/audit.log.response.dto';
import { FlagsBaseResponse } from '../../shared/types/base.response';
import { toAuditLogEntryResponseDto } from './mappers/audit.log.response.mapper';
import { mapAuditError } from './errors/audit.errors.map';
import { GetFlagHistoryDocs } from './docs/audit.controller.docs';

@ApiTags('Flag History Audit')
@Controller('audit/flags')
export class AuditController {
  constructor(private readonly auditUsecasesFactory: AuditUsecasesFactory) {}

  @Get(':key/history')
  @GetFlagHistoryDocs()
  async getHistory(
    @Param('key') key: string,
  ): Promise<FlagsBaseResponse<AuditLogEntryResponseDto[]>> {
    const result =
      await this.auditUsecasesFactory.getFlagHistoryUseCase.execute({
        flagKey: key,
      });

    if (!result.ok) {
      const errorResponse = mapAuditError(result.error);
      throw new HttpException(errorResponse, errorResponse.statusCode);
    }

    return new FlagsBaseResponse(
      result.value.map(toAuditLogEntryResponseDto),
      HttpStatus.OK,
    );
  }
}
