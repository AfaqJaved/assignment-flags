import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { FlagsConfigModule } from './shared/config/flags.config.module';
import { FlagsDatabaseModule } from './shared/database/flags.database.module';
import { ApiKeyAuthenticationMiddleware } from './shared/security/middleware/api.key.authentication.middleware';
import { FlagsSecurityModule } from './shared/security/flags.security.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { FlagModule } from './modules/flag/flag.module';
import { AuditModule } from './modules/audit/audit.module';
import { EvaluationModule } from './modules/evaluation/evaluation.module';
import { HealthModule } from './modules/health/health.module';
import { FlagsCacheModule } from './shared/cache/flags.cache.module';
import { FlagsThrottlerModule } from './shared/rate-limit/flags.throttler.module';

@Module({
  imports: [
    FlagsSecurityModule,
    FlagsConfigModule,
    FlagsDatabaseModule, // also runs the migrations
    FlagsCacheModule,
    FlagsThrottlerModule,
    HealthModule,

    // domain modules
    TenantModule,
    FlagModule,
    AuditModule,
    EvaluationModule,
  ],
  controllers: [],
  providers: [],
})
export class FlagsAppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ApiKeyAuthenticationMiddleware).forRoutes('*');
  }
}
