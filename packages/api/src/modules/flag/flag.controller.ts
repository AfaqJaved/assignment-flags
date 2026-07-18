import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { v7 as uuidv7 } from 'uuid';
import { FlagUsecasesFactory } from './factory/flag.usecases.factory';
import { CreateFeatureFlagDto } from './dto/create.feature.flag.dto';
import {
  UpdateFeatureFlagDto,
  UpdateFeatureFlagParamsDto,
} from './dto/update.feature.flag.dto';
import { ListFeatureFlagsQueryDto } from './dto/list.feature.flags.query.dto';
import { ArchiveFeatureFlagDto } from './dto/archive.feature.flag.dto';
import { FeatureFlagResponseDto } from './dto/feature.flag.response.dto';
import { FlagsBaseResponse } from '../../shared/types/base.response';
import { SecurityContext } from '../../shared/security/context/security.context';
import { toFeatureFlagResponseDto } from './mappers/feature.flag.response.mapper';
import { mapFlagError } from './errors/flag.errors.map';
import {
  ArchiveFeatureFlagDocs,
  CreateFeatureFlagDocs,
  ListFeatureFlagsDocs,
  UpdateFeatureFlagDocs,
} from './docs/flag.controller.docs';

@ApiTags('Feature Flags')
@Controller('flags')
export class FlagController {
  constructor(
    private readonly flagUsecasesFactory: FlagUsecasesFactory,
    private readonly securityContext: SecurityContext,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @CreateFeatureFlagDocs()
  async create(
    @Body() dto: CreateFeatureFlagDto,
  ): Promise<FlagsBaseResponse<FeatureFlagResponseDto>> {
    const result =
      await this.flagUsecasesFactory.createFeatureFlagUseCase.execute({
        id: uuidv7(),
        tenantId: this.securityContext.tenantId,
        key: dto.key,
        name: dto.name,
        description: dto.description,
        type: dto.type,
        defaultValue: dto.defaultValue,
        createdBy: dto.createdBy,
      });

    if (!result.ok) {
      const errorResponse = mapFlagError(result.error);
      throw new HttpException(errorResponse, errorResponse.statusCode);
    }

    return new FlagsBaseResponse(
      toFeatureFlagResponseDto(result.value),
      HttpStatus.CREATED,
    );
  }

  @Get()
  @ListFeatureFlagsDocs()
  async list(
    @Query() query: ListFeatureFlagsQueryDto,
  ): Promise<FlagsBaseResponse<FeatureFlagResponseDto[]>> {
    const result =
      await this.flagUsecasesFactory.listFeatureFlagsUseCase.execute({
        tenantId: this.securityContext.tenantId,
        environment: query.environment,
        status: query.status,
      });

    if (!result.ok) {
      const errorResponse = mapFlagError(result.error);
      throw new HttpException(errorResponse, errorResponse.statusCode);
    }

    return new FlagsBaseResponse(
      result.value.map(toFeatureFlagResponseDto),
      HttpStatus.OK,
    );
  }

  @Patch(':key/environments/:environment')
  @UpdateFeatureFlagDocs()
  async update(
    @Param() params: UpdateFeatureFlagParamsDto,
    @Body() dto: UpdateFeatureFlagDto,
  ): Promise<FlagsBaseResponse<FeatureFlagResponseDto>> {
    const result =
      await this.flagUsecasesFactory.updateFeatureFlagUseCase.execute({
        flagKey: params.key,
        environment: params.environment,
        enabled: dto.enabled,
        rolloutPercentage: dto.rolloutPercentage,
        defaultValue: dto.defaultValue,
        updatedBy: dto.updatedBy,
      });

    if (!result.ok) {
      const errorResponse = mapFlagError(result.error);
      throw new HttpException(errorResponse, errorResponse.statusCode);
    }

    return new FlagsBaseResponse(
      toFeatureFlagResponseDto(result.value),
      HttpStatus.OK,
    );
  }

  @Delete(':key')
  @HttpCode(HttpStatus.OK)
  @ArchiveFeatureFlagDocs()
  async archive(
    @Param('key') key: string,
    @Body() dto: ArchiveFeatureFlagDto,
  ): Promise<FlagsBaseResponse<FeatureFlagResponseDto>> {
    const result =
      await this.flagUsecasesFactory.archiveFeatureFlagUseCase.execute({
        flagKey: key,
        archivedBy: dto.archivedBy,
      });

    if (!result.ok) {
      const errorResponse = mapFlagError(result.error);
      throw new HttpException(errorResponse, errorResponse.statusCode);
    }

    return new FlagsBaseResponse(
      toFeatureFlagResponseDto(result.value),
      HttpStatus.OK,
    );
  }
}
