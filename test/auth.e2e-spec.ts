import request from 'supertest';
import { baseUrl, getLastOtpCode, startTestServer, stopTestServer } from './utils/e2e-server';

interface AuthTokensResponse {
  data: { accessToken: string; refreshToken: string };
}

interface UserProfileResponse {
  data: { email: string; passwordHash?: string };
}

interface RegisterResponse {
  data: { email: string };
}

describe('Auth (e2e)', () => {
  const email = `e2e-${Date.now()}@example.com`;
  const password = 'P@ssw0rd123';

  beforeAll(async () => {
    await startTestServer();
  }, 30_000);

  afterAll(() => {
    stopTestServer();
  });

  it('rejects self-registration with a non-self-registerable role', async () => {
    await request(baseUrl)
      .post('/auth/register')
      .send({ email: 'blocked@example.com', password, fullName: 'X', role: 'super_admin' })
      .expect(400);
  });

  it('registers a student and sends an OTP, without logging them in yet', async () => {
    const response = await request(baseUrl)
      .post('/auth/register')
      .send({ email, password, fullName: 'E2E Student', role: 'student' })
      .expect(201);

    expect((response.body as RegisterResponse).data.email).toBe(email);
  });

  it('rejects login before the email is verified', async () => {
    await request(baseUrl).post('/auth/login').send({ email, password }).expect(403);
  });

  it('rejects verify-email with the wrong code', async () => {
    await request(baseUrl).post('/auth/verify-email').send({ email, code: '000000' }).expect(400);
  });

  it('verifies the email with the OTP and logs the user in', async () => {
    const code = getLastOtpCode(email);

    const response = await request(baseUrl)
      .post('/auth/verify-email')
      .send({ email, code })
      .expect(200);

    const body = response.body as AuthTokensResponse;
    expect(body.data.accessToken).toBeDefined();
    expect(body.data.refreshToken).toBeDefined();
  });

  it('rejects login with the wrong password', async () => {
    await request(baseUrl)
      .post('/auth/login')
      .send({ email, password: 'WrongPass123' })
      .expect(401);
  });

  it('logs in (now verified) and returns the profile via /auth/me', async () => {
    const loginResponse = await request(baseUrl)
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    const { accessToken } = (loginResponse.body as AuthTokensResponse).data;

    const meResponse = await request(baseUrl)
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const profile = (meResponse.body as UserProfileResponse).data;
    expect(profile.email).toBe(email);
    expect(profile.passwordHash).toBeUndefined();
  });

  it('rejects /auth/me without a token', async () => {
    await request(baseUrl).get('/auth/me').expect(401);
  });

  it('rotates the refresh token and invalidates the previous one', async () => {
    const loginResponse = await request(baseUrl)
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    const { refreshToken } = (loginResponse.body as AuthTokensResponse).data;

    await request(baseUrl).post('/auth/refresh').send({ refreshToken }).expect(200);

    await request(baseUrl).post('/auth/refresh').send({ refreshToken }).expect(401);
  });

  it('logout revokes the refresh token', async () => {
    const loginResponse = await request(baseUrl)
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    const { refreshToken } = (loginResponse.body as AuthTokensResponse).data;

    await request(baseUrl).post('/auth/logout').send({ refreshToken }).expect(204);

    await request(baseUrl).post('/auth/refresh').send({ refreshToken }).expect(401);
  });
});
