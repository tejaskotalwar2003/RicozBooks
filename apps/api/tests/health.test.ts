import request from 'supertest';
import { createApp } from '../src/app';

describe('Health & Root API Endpoints', () => {
  const app = createApp();

  it('GET / should return application metadata', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('RicozBooks API');
    expect(res.body.version).toBe('1.3.0');
  });

  it('GET /api/v1/health should return online status and version 1.3.0', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('online');
    expect(res.body.version).toBe('1.3.0');
    expect(res.body.database).toBeDefined();
  });
});

