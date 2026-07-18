import { Global, Module } from '@nestjs/common';
import { Cacheable } from 'cacheable';
import { createKeyv } from '@keyv/redis';
import { ConfigService } from '@nestjs/config';
import { Env } from '../config/env';
import { FlagEvaluationCacheService } from './flag-evaluation/flag.evaluation.cache.service';
import { CACHE } from './cache.tokens';

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
        // tags power FlagEvaluationCacheService's per-flag invalidation; disabled
        // by default in `cacheable`, so it must be turned on explicitly here
        return new Cacheable({ secondary, ttl: '4h', tags: true });
      },
    },
    FlagEvaluationCacheService,
  ],
  exports: [CACHE, FlagEvaluationCacheService],
})
export class FlagsCacheModule {}
