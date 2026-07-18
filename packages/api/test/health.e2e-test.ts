import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { FlagsAppModule } from '../src/flags.app.module';
import { validationExceptionFactory } from '../src/shared/pipes/validation.exception.factory';
import { FlagsDatabaseModule } from 'src/shared/database/flags.database.module';

describe('Health check (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [FlagsAppModule, FlagsDatabaseModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ exceptionFactory: validationExceptionFactory }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('reports the app is running, without an X-API-Key header', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);

    expect(response.body.data).toEqual({
      status: 'ok',
      message: 'App is running',
    });
  });
});
