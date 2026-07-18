import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TenantUsecasesFactory } from './factory/tenant.usecases.factory';
import { RegisterTenantDto } from './dto/register.tenant.dto';
import { RegisterTenantResponseDto } from './dto/tenant.response.dto';
import { FlagsBaseResponse } from '../../shared/types/base.response';
import { toTenantResponseDto } from './mappers/tenant.response.mapper';
import { mapTenantError } from './errors/tenant.errors.map';
import { RegisterTenantDocs } from './docs/tenant.controller.docs';

@ApiTags('Tenants')
@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantUsecasesFactory: TenantUsecasesFactory) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RegisterTenantDocs()
  async register(
    @Body() dto: RegisterTenantDto,
  ): Promise<FlagsBaseResponse<RegisterTenantResponseDto>> {
    const result =
      await this.tenantUsecasesFactory.registerTenantUseCase.execute(dto);

    if (!result.ok) {
      const errorResponse = mapTenantError(result.error);
      throw new HttpException(errorResponse, errorResponse.statusCode);
    }

    return new FlagsBaseResponse(
      {
        tenant: toTenantResponseDto(result.value.tenant),
        apiKey: result.value.apiKey,
      },
      HttpStatus.CREATED,
    );
  }
}
