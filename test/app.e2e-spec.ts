import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * End-to-end smoke tests. Requires a running PostgreSQL (see docker-compose at
 * the workspace root and apps/falina-api/.env). Run with: npm run test:e2e
 */
describe('falina-api (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1', {
      exclude: [
        { path: 'health', method: 0 },
        { path: 'health/ready', method: 0 },
      ],
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns ok', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok' });
  });

  it('GET /health/ready reports the database', async () => {
    const res = await request(app.getHttpServer()).get('/health/ready').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', checks: { database: 'ok' } });
  });

  it('GET /api/v1 exposes service metadata', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1').expect(200);
    expect(res.body).toMatchObject({ service: 'falina-api' });
  });
});
