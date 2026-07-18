import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { FlagsAppModule } from '../src/flags.app.module';
import { validationExceptionFactory } from '../src/shared/pipes/validation.exception.factory';
import { FlagsDatabaseModule } from 'src/shared/database/flags.database.module';

describe('Tenant registration (e2e)', () => {
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

  // random per-test slug so repeated runs against the same database never collide
  const uniqueSlug = () =>
    `e2e-tenant-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

  it('registers a new tenant and returns a plaintext API key, without an X-API-Key header', async () => {
    const slug = uniqueSlug();

    const response = await request(app.getHttpServer())
      .post('/api/v1/tenants')
      .send({ name: 'E2E Acme Inc', slug })
      .expect(201);

    expect(response.body.data.tenant).toMatchObject({
      name: 'E2E Acme Inc',
      slug,
      status: 'active',
    });
    expect(response.body.data.tenant.id).toEqual(expect.any(String));
    expect(response.body.data.tenant.apiKeyHash).toBeUndefined();

    expect(typeof response.body.data.apiKey).toBe('string');
    expect(response.body.data.apiKey.startsWith('sk_')).toBe(true);
  });

  it('rejects a second registration with an already-taken slug', async () => {
    const slug = uniqueSlug();

    await request(app.getHttpServer())
      .post('/api/v1/tenants')
      .send({ name: 'First Registration', slug })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/api/v1/tenants')
      .send({ name: 'Second Registration', slug })
      .expect(409);

    expect(response.body.statusCode).toBe(409);
  });

  it('rejects a malformed slug with 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/tenants')
      .send({ name: 'Bad Slug Co', slug: 'Not A Valid Slug!' })
      .expect(400);

    expect(response.body.statusCode).toBe(400);
  });

  it('rejects a missing name with 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/tenants')
      .send({ slug: uniqueSlug() })
      .expect(400);

    expect(response.body.statusCode).toBe(400);
  });
});
