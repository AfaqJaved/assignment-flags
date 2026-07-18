import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { FlagsBaseResponse } from '../../shared/types/base.response';
import { HealthResponseDto } from './dto/health.response.dto';

/**
 * No auth, no dependencies — this is the container/orchestrator's liveness
 * probe. It only needs to prove the process is up and serving HTTP; it
 * deliberately does not check the database or cache (that's what would make
 * it a *readiness* probe instead, which is a different guarantee).
 *
 * Exempt from rate limiting: a healthcheck getting 429'd would make the
 * orchestrator kill a perfectly healthy container.
 */
@ApiTags('Health')
@Controller('health')
@SkipThrottle()
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Liveness check' })
  @ApiOkResponse({ description: 'The app is running.', type: HealthResponseDto })
  check(): FlagsBaseResponse<HealthResponseDto> {
    return new FlagsBaseResponse(
      { status: 'ok', message: 'App is running' },
      HttpStatus.OK,
    );
  }
}
