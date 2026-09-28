import request from 'supertest';
import { baseUrl, startTestServer, stopTestServer } from './utils/e2e-server';

interface HealthResponseBody {
  status: string;
}

describe('Health (e2e)', () => {
  beforeAll(async () => {
    await startTestServer();
  }, 30_000);

  afterAll(() => {
    stopTestServer();
  });

  it('GET /health returns ok status', () => {
    return request(baseUrl)
      .get('/health')
      .expect(200)
      .expect((res: { body: { data: HealthResponseBody } }) => {
        expect(res.body.data.status).toBe('ok');
      });
  });
});
