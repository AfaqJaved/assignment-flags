import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { FlagsAppModule } from '../src/flags.app.module';
import { validationExceptionFactory } from '../src/shared/pipes/validation.exception.factory';
import { FlagsDatabaseModule } from 'src/shared/database/flags.database.module';

describe('Flag history (e2e)', () => {
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

    const slug = `e2e-audit-tenant-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

    const registerResponse = await request(app.getHttpServer())
      .post('/api/v1/tenants')
      .send({ name: 'E2E Audit Tenant', slug })
      .expect(201);

    apiKey = registerResponse.body.data.apiKey;
  });

  afterAll(async () => {
    await app.close();
  });

  const uniqueKey = () =>
    `e2e-audit-flag-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

  it('records a flag_created entry for a freshly created flag', async () => {
    const key = uniqueKey();

    await request(app.getHttpServer())
      .post('/api/v1/flags')
      .set('X-API-Key', apiKey)
      .send({
        key,
        name: 'History flag',
        type: 'boolean',
        defaultValue: false,
        createdBy: 'user-1',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/api/v1/audit/flags/${key}/history`)
      .set('X-API-Key', apiKey)
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      flagKey: key,
      environment: null,
      action: 'flag_created',
      changes: [],
      actorId: 'user-1',
    });
  });

  it('records flag_toggled and flag_archived entries, most recent first', async () => {
    const key = uniqueKey();

    await request(app.getHttpServer())
      .post('/api/v1/flags')
      .set('X-API-Key', apiKey)
      .send({
        key,
        name: 'History flag',
        type: 'boolean',
        defaultValue: false,
        createdBy: 'user-1',
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/flags/${key}/environments/staging`)
      .set('X-API-Key', apiKey)
      .send({ enabled: true, updatedBy: 'user-2' })
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/api/v1/flags/${key}`)
      .set('X-API-Key', apiKey)
      .send({ archivedBy: 'user-3' })
      .expect(200);

    const response = await request(app.getHttpServer())
      .get(`/api/v1/audit/flags/${key}/history`)
      .set('X-API-Key', apiKey)
      .expect(200);

    expect(
      response.body.data.map((entry: { action: string }) => entry.action),
    ).toEqual(['flag_archived', 'flag_toggled', 'flag_created']);

    expect(response.body.data[0]).toMatchObject({
      action: 'flag_archived',
      changes: [
        { field: 'status', previousValue: 'active', newValue: 'archived' },
      ],
      actorId: 'user-3',
    });

    expect(response.body.data[1]).toMatchObject({
      action: 'flag_toggled',
      environment: 'staging',
      changes: [{ field: 'enabled', previousValue: false, newValue: true }],
      actorId: 'user-2',
    });
  });

  it('returns 404 for an unknown flag key', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/audit/flags/does-not-exist/history')
      .set('X-API-Key', apiKey)
      .expect(404);

    expect(response.body.statusCode).toBe(404);
  });

  it('rejects requests without an X-API-Key header', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/audit/flags/some-flag/history')
      .expect(401);
  });

  it("returns 404 when a different tenant's API key is used to fetch a flag's history", async () => {
    const key = uniqueKey();

    await request(app.getHttpServer())
      .post('/api/v1/flags')
      .set('X-API-Key', apiKey)
      .send({
        key,
        name: 'Isolated history flag',
        type: 'boolean',
        defaultValue: false,
        createdBy: 'user-1',
      })
      .expect(201);

    const otherSlug = `e2e-audit-tenant-other-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const otherTenant = await request(app.getHttpServer())
      .post('/api/v1/tenants')
      .send({ name: 'E2E Audit Other Tenant', slug: otherSlug })
      .expect(201);
    const otherApiKey: string = otherTenant.body.data.apiKey;

    // tenant is resolved entirely from X-API-Key now, so another tenant's key
    // simply can't see this flag — it's not "unauthorized", it's just not found
    const response = await request(app.getHttpServer())
      .get(`/api/v1/audit/flags/${key}/history`)
      .set('X-API-Key', otherApiKey)
      .expect(404);

    expect(response.body.statusCode).toBe(404);
  });
});
