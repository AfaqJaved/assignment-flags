import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { EvaluatedFlag, Environment } from '@flags/domain';
import { EvaluationUsecasesFactory } from './factory/evaluation.usecases.factory';
import { EvaluateFlagsDto } from './dto/evaluate.flags.dto';
import { BulkEvaluateFlagsDto } from './dto/bulk.evaluate.flags.dto';
import { EvaluatedFlagResponseDto } from './dto/evaluated.flag.response.dto';
import { FlagsBaseResponse } from '../../shared/types/base.response';
import { SecurityContext } from '../../shared/security/context/security.context';
import { FlagEvaluationCacheService } from '../../shared/cache/flag-evaluation/flag.evaluation.cache.service';
import { toEvaluatedFlagResponseDto } from './mappers/evaluated.flag.response.mapper';
import { mapEvaluationError } from './errors/evaluation.errors.map';
import {
  BulkEvaluateFlagsDocs,
  EvaluateFlagsDocs,
} from './docs/evaluation.controller.docs';

@ApiTags('Flag Evaluation')
@Controller('evaluate')
export class EvaluationController {
  constructor(
    private readonly evaluationUsecasesFactory: EvaluationUsecasesFactory,
    private readonly securityContext: SecurityContext,
    private readonly evaluationCache: FlagEvaluationCacheService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @EvaluateFlagsDocs()
  async evaluate(
    @Body() dto: EvaluateFlagsDto,
  ): Promise<FlagsBaseResponse<EvaluatedFlagResponseDto[]>> {
    const tenantId = this.securityContext.tenantId;
    const context = { userId: dto.userId, attributes: dto.context ?? {} };

    // no explicit keys means "every active flag" — the set isn't known ahead of
    // time, so there's nothing to check the cache against before calling out
    if (!dto.flagKeys || dto.flagKeys.length === 0) {
      const result =
        await this.evaluationUsecasesFactory.evaluateFlagsUseCase.execute({
          tenantId,
          environment: dto.environment,
          context,
        });

      if (!result.ok) {
        const errorResponse = mapEvaluationError(result.error);
        throw new HttpException(errorResponse, errorResponse.statusCode);
      }

      await this.cacheEvaluations(tenantId, dto.environment, dto.userId, result.value);

      return new FlagsBaseResponse(
        result.value.map(toEvaluatedFlagResponseDto),
        HttpStatus.OK,
      );
    }

    const cached = new Map<string, EvaluatedFlag>();
    for (const flagKey of dto.flagKeys) {
      const hit = await this.evaluationCache.get({
        tenantId,
        environment: dto.environment,
        flagKey,
        userId: dto.userId,
      });
      if (hit) cached.set(flagKey, hit);
    }

    const missingKeys = dto.flagKeys.filter((key) => !cached.has(key));
    let computed: EvaluatedFlag[] = [];

    if (missingKeys.length > 0) {
      const result =
        await this.evaluationUsecasesFactory.evaluateFlagsUseCase.execute({
          tenantId,
          environment: dto.environment,
          flagKeys: missingKeys,
          context,
        });

      if (!result.ok) {
        const errorResponse = mapEvaluationError(result.error);
        throw new HttpException(errorResponse, errorResponse.statusCode);
      }

      computed = result.value;
      await this.cacheEvaluations(tenantId, dto.environment, dto.userId, computed);
    }

    const byFlagKey = new Map<string, EvaluatedFlag>(cached);
    for (const evaluated of computed) byFlagKey.set(evaluated.flagKey, evaluated);

    // rebuilt in the order the caller asked for, regardless of which came from
    // cache vs. which were just computed
    const merged = dto.flagKeys.map((flagKey) => byFlagKey.get(flagKey)!);

    return new FlagsBaseResponse(
      merged.map(toEvaluatedFlagResponseDto),
      HttpStatus.OK,
    );
  }

  @Post('bulk')
  @HttpCode(HttpStatus.OK)
  @BulkEvaluateFlagsDocs()
  async bulkEvaluate(
    @Body() dto: BulkEvaluateFlagsDto,
  ): Promise<FlagsBaseResponse<EvaluatedFlagResponseDto[]>> {
    const tenantId = this.securityContext.tenantId;

    // the full active-flag set isn't known ahead of time, so bulk always calls
    // through — but every result is written to cache for later single-flag reads
    const result =
      await this.evaluationUsecasesFactory.bulkEvaluateFlagsUseCase.execute({
        tenantId,
        environment: dto.environment,
        context: { userId: dto.userId, attributes: dto.context ?? {} },
      });

    if (!result.ok) {
      const errorResponse = mapEvaluationError(result.error);
      throw new HttpException(errorResponse, errorResponse.statusCode);
    }

    await this.cacheEvaluations(tenantId, dto.environment, dto.userId, result.value);

    return new FlagsBaseResponse(
      result.value.map(toEvaluatedFlagResponseDto),
      HttpStatus.OK,
    );
  }

  private async cacheEvaluations(
    tenantId: string,
    environment: Environment,
    userId: string,
    evaluations: EvaluatedFlag[],
  ): Promise<void> {
    await Promise.all(
      evaluations.map((evaluated) =>
        this.evaluationCache.set(
          { tenantId, environment, flagKey: evaluated.flagKey, userId },
          evaluated,
        ),
      ),
    );
  }
}
