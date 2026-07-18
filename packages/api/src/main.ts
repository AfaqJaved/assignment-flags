import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';
import { FlagsAppModule } from './flags.app.module';
import { type Env } from './shared/config/env';
import { PrintLoadedEnv } from './shared/config/print.env';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { validationExceptionFactory } from './shared/pipes/validation.exception.factory';
import { LoggingInterceptor } from './shared/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(FlagsAppModule);

  app.setGlobalPrefix('api/v1');

  //validation pipe global
  app.useGlobalPipes(
    new ValidationPipe({ exceptionFactory: validationExceptionFactory }),
  );

  app.useGlobalInterceptors(new LoggingInterceptor());

  // printing the loaded env variables
  app.get(PrintLoadedEnv).logEnv();

  app.use(cookieParser());

  const config = app.get(ConfigService<Env, true>);

  const corsOrigins = config.get('CORS_ORIGINS', { infer: true });
  const corsOriginMatchers = corsOrigins.map(
    (pattern) =>
      new RegExp(
        `^${pattern
          .split('*')
          .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
          .join('.*')}$`,
      ),
  );

  app.enableCors({
    origin: (origin, callback) => {
      // requests with no origin (e.g. curl, server-to-server) are allowed
      if (!origin || corsOriginMatchers.some((re) => re.test(origin))) {
        callback(null, true);
      } else {
        callback(new Error(`Not allowed by CORS: ${origin}`));
      }
    },
    credentials: true,
  });

  const enableApiDocs = config.get('ENABLE_API_DOCS', { infer: true });

  if (enableApiDocs) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Feature Flag Service')
      .setDescription(
        'Multi-tenant configuration & feature flag service API. ' +
          'All routes except tenant registration require a tenant API key ' +
          'in the `X-API-Key` header.',
      )
      .setVersion('1.0')
      .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'api-key')
      .addSecurityRequirements('api-key')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    // mounted at /docs (not /api) so it doesn't collide with the /api/v1/* business routes
    SwaggerModule.setup('docs', app, document);
  }

  const port = config.get('PORT', { infer: true });
  await app.listen(port);
}

bootstrap();
