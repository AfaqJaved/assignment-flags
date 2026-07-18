import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { FlagsAppModule } from '../src/flags.app.module';
import { validationExceptionFactory } from '../src/shared/pipes/validation.exception.factory';
import { FlagsDatabaseModule } from 'src/shared/database/flags.database.module';

describe('Feature flags (e2e)', () => {
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

    const slug = `e2e-flags-tenant-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/tenants')
      .send({ name: 'E2E Flags Tenant', slug })
      .expect(201);

    apiKey = registerResponse.body.data.apiKey;
  });

  afterAll(async () => {
    await app.close();
  });

  const uniqueKey = () =>
    `e2e-flag-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

  it('rejects requests without an X-API-Key header', async () => {
    await request(app.getHttpServer()).get('/api/v1/flags').expect(401);
  });

  it('creates a flag, disabled with 0% rollout in every environment', async () => {
    const key = uniqueKey();

    const response = await request(app.getHttpServer())
      .post('/api/v1/flags')
      .set('X-API-Key', apiKey)
      .send({
        key,
        name: 'E2E Flag',
        type: 'boolean',
        defaultValue: false,
        createdBy: 'user-1',
      })
      .expect(201);

    expect(response.body.data).toMatchObject({
      key,
      name: 'E2E Flag',
      status: 'active',
    });
    expect(response.body.data.environments.production).toMatchObject({
      enabled: false,
      rolloutPercentage: 0,
    });
  });

  it('rejects a second flag with an already-taken key', async () => {
    const key = uniqueKey();

    await request(app.getHttpServer())
      .post('/api/v1/flags')
      .set('X-API-Key', apiKey)
      .send({
        key,
        name: 'First',
        type: 'boolean',
        defaultValue: false,
        createdBy: 'user-1',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/api/v1/flags')
      .set('X-API-Key', apiKey)
      .send({
        key,
        name: 'Second',
        type: 'boolean',
        defaultValue: false,
        createdBy: 'user-1',
      })
      .expect(409);

    expect(response.body.statusCode).toBe(409);
  });

  it('rejects a default value whose type does not match the declared type', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/flags')
      .set('X-API-Key', apiKey)
      .send({
        key: uniqueKey(),
        name: 'Mismatched value',
        type: 'boolean',
        defaultValue: 'not-a-boolean',
        createdBy: 'user-1',
      })
      .expect(400);

    expect(response.body.statusCode).toBe(400);
  });

  it('lists flags for the authenticated tenant', async () => {
    const key = uniqueKey();

    await request(app.getHttpServer())
      .post('/api/v1/flags')
      .set('X-API-Key', apiKey)
      .send({
        key,
        name: 'Listed flag',
        type: 'boolean',
        defaultValue: false,
        createdBy: 'user-1',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/api/v1/flags')
      .set('X-API-Key', apiKey)
      .expect(200);

    expect(
      response.body.data.some((flag: { key: string }) => flag.key === key),
    ).toBe(true);
  });

  it('toggles a flag on for a single environment', async () => {
    const key = uniqueKey();

    await request(app.getHttpServer())
      .post('/api/v1/flags')
      .set('X-API-Key', apiKey)
      .send({
        key,
        name: 'Toggled flag',
        type: 'boolean',
        defaultValue: false,
        createdBy: 'user-1',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .patch(`/api/v1/flags/${key}/environments/staging`)
      .set('X-API-Key', apiKey)
      .send({ enabled: true, rolloutPercentage: 25, updatedBy: 'user-2' })
      .expect(200);

    expect(response.body.data.environments.staging).toMatchObject({
      enabled: true,
      rolloutPercentage: 25,
    });
    expect(response.body.data.environments.production.enabled).toBe(false);
  });

  it('rejects an out-of-range rollout percentage', async () => {
    const key = uniqueKey();

    await request(app.getHttpServer())
      .post('/api/v1/flags')
      .set('X-API-Key', apiKey)
      .send({
        key,
        name: 'Bad rollout',
        type: 'boolean',
        defaultValue: false,
        createdBy: 'user-1',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .patch(`/api/v1/flags/${key}/environments/staging`)
      .set('X-API-Key', apiKey)
      .send({ rolloutPercentage: 142, updatedBy: 'user-2' })
      .expect(400);

    expect(response.body.statusCode).toBe(400);
  });

  it('returns 404 when updating an unknown flag key', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/flags/does-not-exist/environments/staging')
      .set('X-API-Key', apiKey)
      .send({ enabled: true, updatedBy: 'user-2' })
      .expect(404);
  });

  it('archives a flag and then rejects further mutation', async () => {
    const key = uniqueKey();

    await request(app.getHttpServer())
      .post('/api/v1/flags')
      .set('X-API-Key', apiKey)
      .send({
        key,
        name: 'To archive',
        type: 'boolean',
        defaultValue: false,
        createdBy: 'user-1',
      })
      .expect(201);

    const archiveResponse = await request(app.getHttpServer())
      .delete(`/api/v1/flags/${key}`)
      .set('X-API-Key', apiKey)
      .send({ archivedBy: 'user-3' })
      .expect(200);

    expect(archiveResponse.body.data.status).toBe('archived');

    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/v1/flags/${key}/environments/staging`)
      .set('X-API-Key', apiKey)
      .send({ enabled: true, updatedBy: 'user-2' })
      .expect(409);

    expect(updateResponse.body.statusCode).toBe(409);
  });
});
