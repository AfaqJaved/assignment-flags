import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { FlagsAppModule } from '../src/flags.app.module';
import { validationExceptionFactory } from '../src/shared/pipes/validation.exception.factory';
import { FlagsDatabaseModule } from 'src/shared/database/flags.database.module';

describe('Flag evaluation (e2e)', () => {
  let app: INestApplication<App>;
  let apiKey: string;

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

    const slug = `e2e-eval-tenant-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/tenants')
      .send({ name: 'E2E Evaluation Tenant', slug })
      .expect(201);

    apiKey = registerResponse.body.data.apiKey;
  });

  afterAll(async () => {
    await app.close();
  });

  const uniqueKey = () =>
    `e2e-eval-flag-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

  it('resolves a disabled flag to its default value', async () => {
    const key = uniqueKey();

    await request(app.getHttpServer())
      .post('/api/v1/flags')
      .set('X-API-Key', apiKey)
      .send({
        key,
        name: 'Disabled flag',
        type: 'boolean',
        defaultValue: false,
        createdBy: 'user-1',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/api/v1/evaluate')
      .set('X-API-Key', apiKey)
      .send({
        environment: 'production',
        userId: 'user-42',
        flagKeys: [key],
      })
      .expect(200);

    expect(response.body.data).toMatchObject([
      { flagKey: key, value: false, reason: 'flag_disabled' },
    ]);
  });

  it('resolves a 100%-rollout flag to true for every user', async () => {
    const key = uniqueKey();

    await request(app.getHttpServer())
      .post('/api/v1/flags')
      .set('X-API-Key', apiKey)
      .send({
        key,
        name: 'Full rollout flag',
        type: 'boolean',
        defaultValue: false,
        createdBy: 'user-1',
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/flags/${key}/environments/production`)
      .set('X-API-Key', apiKey)
      .send({ enabled: true, rolloutPercentage: 100, updatedBy: 'user-2' })
      .expect(200);

    const response = await request(app.getHttpServer())
      .post('/api/v1/evaluate')
      .set('X-API-Key', apiKey)
      .send({
        environment: 'production',
        userId: 'user-42',
        flagKeys: [key],
      })
      .expect(200);

    expect(response.body.data).toMatchObject([
      { flagKey: key, value: true, reason: 'rollout' },
    ]);
  });

  it('is deterministic: the same userId always gets the same rollout result', async () => {
    const key = uniqueKey();

    await request(app.getHttpServer())
      .post('/api/v1/flags')
      .set('X-API-Key', apiKey)
      .send({
        key,
        name: 'Sticky rollout flag',
        type: 'boolean',
        defaultValue: false,
        createdBy: 'user-1',
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/flags/${key}/environments/production`)
      .set('X-API-Key', apiKey)
      .send({ enabled: true, rolloutPercentage: 50, updatedBy: 'user-2' })
      .expect(200);

    const evaluateOnce = () =>
      request(app.getHttpServer())
        .post('/api/v1/evaluate')
        .set('X-API-Key', apiKey)
        .send({
          environment: 'production',
          userId: 'sticky-user-7',
          flagKeys: [key],
        })
        .expect(200);

    const first = await evaluateOnce();
    const second = await evaluateOnce();
    const third = await evaluateOnce();

    // cacheHit legitimately differs between calls (first is a miss, later
    // ones are hits), so it's excluded from the determinism comparison
    const withoutCacheHit = (data: any[]) =>
      data.map(({ flagKey, value, reason }) => ({ flagKey, value, reason }));

    expect(withoutCacheHit(first.body.data)).toEqual(
      withoutCacheHit(second.body.data),
    );
    expect(withoutCacheHit(second.body.data)).toEqual(
      withoutCacheHit(third.body.data),
    );
  });

  it('bulk-evaluates every active flag for a user in one request', async () => {
    const key = uniqueKey();

    await request(app.getHttpServer())
      .post('/api/v1/flags')
      .set('X-API-Key', apiKey)
      .send({
        key,
        name: 'Bulk flag',
        type: 'boolean',
        defaultValue: true,
        createdBy: 'user-1',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/api/v1/evaluate/bulk')
      .set('X-API-Key', apiKey)
      .send({ environment: 'production', userId: 'user-42' })
      .expect(200);

    expect(
      response.body.data.some(
        (entry: { flagKey: string }) => entry.flagKey === key,
      ),
    ).toBe(true);
  });

  it('rejects an unknown flag key with 404', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/evaluate')
      .set('X-API-Key', apiKey)
      .send({
        environment: 'production',
        userId: 'user-42',
        flagKeys: ['does-not-exist'],
      })
      .expect(404);

    expect(response.body.statusCode).toBe(404);
  });

  it('rejects an unsupported environment with 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/evaluate')
      .set('X-API-Key', apiKey)
      .send({ environment: 'preprod', userId: 'user-42' })
      .expect(400);

    expect(response.body.statusCode).toBe(400);
  });

  it('rejects requests without an X-API-Key header', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/evaluate')
      .send({ environment: 'production', userId: 'user-42' })
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/v1/evaluate/bulk')
      .send({ environment: 'production', userId: 'user-42' })
      .expect(401);
  });
});
