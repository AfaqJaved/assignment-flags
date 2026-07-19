import {
  Global,
  Inject,
  Logger,
  Module,
  OnModuleDestroy,
} from '@nestjs/common';
import { Cacheable } from 'cacheable';
import { createKeyv, default as KeyvRedis } from '@keyv/redis';
import { ConfigService } from '@nestjs/config';
import { Env } from '../config/env';
import { FlagEvaluationCacheService } from './flag-evaluation/flag.evaluation.cache.service';
import { CACHE } from './cache.tokens';

const logger = new Logger('FlagsCacheModule');

@Global()
@Module({
  providers: [
    {
      provide: CACHE,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const secondary = createKeyv(
          `redis://:${config.get('REDIS_PASSWORD')}@${config.get('REDIS_HOST')}:${config.get('REDIS_PORT')}`,
          { namespace: 'cache' },
        );

        const redisStore = secondary.store as InstanceType<typeof KeyvRedis>;
        redisStore
          .getClient()
          .then(() => logger.debug('Redis connection established'))
          .catch((error: Error) =>
            logger.debug(`Redis connection failed: ${error.message}`),
          );

        // tags power FlagEvaluationCacheService's per-flag invalidation; disabled
        // by default in `cacheable`, so it must be turned on explicitly here
        return new Cacheable({ secondary, ttl: '4h', tags: true });
      },
    },
    FlagEvaluationCacheService,
  ],
  exports: [CACHE, FlagEvaluationCacheService],
})
export class FlagsCacheModule implements OnModuleDestroy {
  constructor(@Inject(CACHE) private readonly cache: Cacheable) {}

  // Without this, the ioredis client behind the secondary store keeps its
  // socket open past `app.close()` — see the matching note in
  // FlagsDatabaseModule for why that matters for tests/CI specifically.
  async onModuleDestroy(): Promise<void> {
    await this.cache.disconnect();
  }
}
