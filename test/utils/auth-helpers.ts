import request from 'supertest';
import { baseUrl, getLastOtpCode } from './e2e-server';

interface AuthTokensResponse {
  data: { accessToken: string; refreshToken: string };
}

/** Matches server/.env SEED_SUPER_ADMIN_EMAIL / SEED_SUPER_ADMIN_PASSWORD (dev/test only). */
export const SEED_SUPER_ADMIN_EMAIL = 'admin@ssc.local';
export const SEED_SUPER_ADMIN_PASSWORD = 'SuperAdmin@123';

export async function registerAndVerifyStudent(
  email: string,
  password: string,
  fullName = 'E2E Student',
): Promise<string> {
  await request(baseUrl)
    .post('/auth/register')
    .send({ email, password, fullName, role: 'student' });

  const code = getLastOtpCode(email);
  const response = await request(baseUrl).post('/auth/verify-email').send({ email, code });

  return (response.body as AuthTokensResponse).data.accessToken;
}

export async function loginAsSeedAdmin(): Promise<string> {
  const response = await request(baseUrl)
    .post('/auth/login')
    .send({ email: SEED_SUPER_ADMIN_EMAIL, password: SEED_SUPER_ADMIN_PASSWORD });

  return (response.body as AuthTokensResponse).data.accessToken;
}

export async function registerAndVerifyWholesaleBuyer(
  email: string,
  password: string,
  fullName = 'E2E Wholesale Buyer',
): Promise<string> {
  await request(baseUrl)
    .post('/auth/register')
    .send({ email, password, fullName, role: 'wholesale_buyer' });

  const code = getLastOtpCode(email);
  const response = await request(baseUrl).post('/auth/verify-email').send({ email, code });

  return (response.body as AuthTokensResponse).data.accessToken;
}

/** Submits a vendor application and verifies its email OTP, returning an access token (vendor status stays `pending` until an admin approves it). */
export async function applyAndVerifyVendor(
  email: string,
  password: string,
  businessName = `E2E Vendor Business ${Date.now()}`,
  role: 'vendor' | 'wholesale_vendor' = 'vendor',
): Promise<string> {
  await request(baseUrl).post('/vendors/apply').send({
    email,
    password,
    fullName: 'E2E Vendor',
    businessName,
    contactPhone: '+923001234567',
    bankAccountName: 'E2E Vendor',
    bankAccountNumber: '1234567890',
    bankName: 'Test Bank',
    role,
  });

  const code = getLastOtpCode(email);
  const response = await request(baseUrl).post('/auth/verify-email').send({ email, code });

  return (response.body as AuthTokensResponse).data.accessToken;
}
