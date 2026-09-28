import request from 'supertest';
import { baseUrl, getLastOtpCode, startTestServer, stopTestServer } from './utils/e2e-server';
import { loginAsSeedAdmin, registerAndVerifyStudent } from './utils/auth-helpers';

interface EntityResponse<T> {
  data: T;
}

describe('Phase 2 — Students, Directory & Smart Cards (e2e)', () => {
  const studentEmail = `phase2-${Date.now()}@example.com`;
  const studentPassword = 'P@ssw0rd123';

  let adminToken: string;
  let studentToken: string;
  let regionId: string;
  let districtId: string;
  let institutionId: string;

  beforeAll(async () => {
    await startTestServer();
    adminToken = await loginAsSeedAdmin();
    studentToken = await registerAndVerifyStudent(studentEmail, studentPassword);
  }, 30_000);

  afterAll(() => {
    stopTestServer();
  });

  describe('Directory', () => {
    it('rejects region creation without admin auth', async () => {
      await request(baseUrl)
        .post('/regions')
        .send({ name: `Region-${Date.now()}` })
        .expect(401);
    });

    it('rejects region creation from a student', async () => {
      await request(baseUrl)
        .post('/regions')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ name: `Region-${Date.now()}` })
        .expect(403);
    });

    it('lets an admin create region → district → institution', async () => {
      const regionRes = await request(baseUrl)
        .post('/regions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `Punjab-${Date.now()}` })
        .expect(201);
      regionId = (regionRes.body as EntityResponse<{ id: string }>).data.id;

      const districtRes = await request(baseUrl)
        .post('/districts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Lahore', regionId })
        .expect(201);
      districtId = (districtRes.body as EntityResponse<{ id: string }>).data.id;

      const institutionRes = await request(baseUrl)
        .post('/institutions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Beaconhouse', type: 'school', districtId })
        .expect(201);
      institutionId = (institutionRes.body as EntityResponse<{ id: string }>).data.id;

      expect(regionId).toBeDefined();
      expect(districtId).toBeDefined();
      expect(institutionId).toBeDefined();
    });

    it('lists regions/districts/institutions publicly, filtered', async () => {
      const districts = await request(baseUrl).get(`/districts?regionId=${regionId}`).expect(200);
      expect(
        (districts.body as EntityResponse<{ id: string }[]>).data.some((d) => d.id === districtId),
      ).toBe(true);

      const institutions = await request(baseUrl)
        .get(`/institutions?districtId=${districtId}`)
        .expect(200);
      expect(
        (institutions.body as EntityResponse<{ id: string }[]>).data.some(
          (i) => i.id === institutionId,
        ),
      ).toBe(true);
    });
  });

  describe('Student profile', () => {
    it('auto-creates the profile on first access', async () => {
      const response = await request(baseUrl)
        .get('/students/me')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      const profile = (response.body as EntityResponse<{ studentIdNumber: string }>).data;
      expect(profile.studentIdNumber).toMatch(/^STU-/);
    });

    it('rejects a non-student from accessing the student profile endpoints', async () => {
      await request(baseUrl)
        .get('/students/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('updates the profile with institution mapping', async () => {
      const response = await request(baseUrl)
        .patch('/students/me')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ institutionId, dateOfBirth: '2006-03-20', gender: 'male' })
        .expect(200);

      const profile = (response.body as EntityResponse<{ institutionId: string; gender: string }>)
        .data;
      expect(profile.institutionId).toBe(institutionId);
      expect(profile.gender).toBe('male');
    });

    it('rejects an unknown institution id', async () => {
      await request(baseUrl)
        .patch('/students/me')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ institutionId: '00000000-0000-0000-0000-000000000000' })
        .expect(404);
    });

    it('fails photo upload with a clear error since Cloudinary is not configured', async () => {
      await request(baseUrl)
        .post('/students/me/photo')
        .set('Authorization', `Bearer ${studentToken}`)
        .attach('photo', Buffer.from('fake-image-bytes'), {
          filename: 'photo.png',
          contentType: 'image/png',
        })
        .expect(503);
    });

    it('rejects a non-image file for the photo upload', async () => {
      await request(baseUrl)
        .post('/students/me/photo')
        .set('Authorization', `Bearer ${studentToken}`)
        .attach('photo', Buffer.from('not an image'), {
          filename: 'notes.txt',
          contentType: 'text/plain',
        })
        .expect(400);
    });
  });

  describe('Addresses', () => {
    let addressId: string;

    it('creates, lists, updates and deletes an address', async () => {
      const createRes = await request(baseUrl)
        .post('/students/me/addresses')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ line1: 'House 12, Street 4', city: 'Lahore', state: 'Punjab', isDefault: true })
        .expect(201);
      addressId = (createRes.body as EntityResponse<{ id: string }>).data.id;

      const listRes = await request(baseUrl)
        .get('/students/me/addresses')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);
      expect(
        (listRes.body as EntityResponse<{ id: string }[]>).data.some((a) => a.id === addressId),
      ).toBe(true);

      const updateRes = await request(baseUrl)
        .patch(`/students/me/addresses/${addressId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ city: 'Karachi' })
        .expect(200);
      expect((updateRes.body as EntityResponse<{ city: string }>).data.city).toBe('Karachi');

      await request(baseUrl)
        .delete(`/students/me/addresses/${addressId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(204);
    });

    it('rejects updating an address that belongs to another student', async () => {
      const otherToken = await registerAndVerifyStudent(
        `other-${Date.now()}@example.com`,
        'P@ssw0rd123',
      );
      const createRes = await request(baseUrl)
        .post('/students/me/addresses')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ line1: 'Other address', city: 'Islamabad', state: 'Federal' })
        .expect(201);
      const otherAddressId = (createRes.body as EntityResponse<{ id: string }>).data.id;

      await request(baseUrl)
        .patch(`/students/me/addresses/${otherAddressId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ city: 'Hacked' })
        .expect(403);
    });
  });

  describe('Card activation (external system integration, mocked)', () => {
    const cardNumber = `CARD-LINK-${Date.now()}`;
    let qrToken: string;

    it('has no card before activation', async () => {
      await request(baseUrl)
        .get('/students/me/card')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(404);
    });

    it('rejects linking with a wrong OTP', async () => {
      await request(baseUrl).post('/card-activation/request-otp').send({ cardNumber }).expect(204);

      await request(baseUrl)
        .post('/students/me/card/link')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ cardNumber, code: '000000' })
        .expect(400);
    });

    it('links a verified external card to the existing student account', async () => {
      await request(baseUrl).post('/card-activation/request-otp').send({ cardNumber }).expect(204);
      const code = getLastOtpCode(cardNumber);

      const linkRes = await request(baseUrl)
        .post('/students/me/card/link')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ cardNumber, code })
        .expect(201);

      const card = (
        linkRes.body as EntityResponse<{ status: string; qrToken: string; cardNumber: string }>
      ).data;
      expect(card.status).toBe('active');
      expect(card.cardNumber).toBe(cardNumber);
      qrToken = card.qrToken;

      const profileRes = await request(baseUrl)
        .get('/students/me')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);
      const profile = (
        profileRes.body as EntityResponse<{
          externalHolderType: string;
          externalInstitutionName: string;
        }>
      ).data;
      expect(profile.externalHolderType).toBe('student');
      expect(profile.externalInstitutionName).toBe('Demo High School');
    });

    it('rejects linking the same card number again to anyone', async () => {
      await request(baseUrl).post('/card-activation/request-otp').send({ cardNumber }).expect(204);
      const code = getLastOtpCode(cardNumber);

      await request(baseUrl)
        .post('/students/me/card/link')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ cardNumber, code })
        .expect(409);
    });

    it('verifies the linked card publicly by QR token', async () => {
      const response = await request(baseUrl).get(`/cards/verify/${qrToken}`).expect(200);
      const result = (response.body as EntityResponse<{ valid: boolean; studentName: string }>)
        .data;
      expect(result.valid).toBe(true);
      expect(result.studentName).toBe('E2E Student');
    });

    it('blocks the card on report-lost and fails verification', async () => {
      await request(baseUrl)
        .post('/students/me/card/report-lost')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      const response = await request(baseUrl).get(`/cards/verify/${qrToken}`).expect(200);
      expect((response.body as EntityResponse<{ valid: boolean }>).data.valid).toBe(false);
    });

    it('re-links a new external card after the previous one was blocked', async () => {
      const newCardNumber = `${cardNumber}-REPLACEMENT`;
      await request(baseUrl)
        .post('/card-activation/request-otp')
        .send({ cardNumber: newCardNumber })
        .expect(204);
      const code = getLastOtpCode(newCardNumber);

      const response = await request(baseUrl)
        .post('/students/me/card/link')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ cardNumber: newCardNumber, code })
        .expect(201);

      const card = (
        response.body as EntityResponse<{
          status: string;
          qrToken: string;
          cardNumber: string;
          replacesCardId: string;
        }>
      ).data;
      expect(card.status).toBe('active');
      expect(card.cardNumber).toBe(newCardNumber);
      expect(card.qrToken).not.toBe(qrToken);
      expect(card.replacesCardId).toBeDefined();

      qrToken = card.qrToken;
    });

    it('renews and rotates the QR code of the current card', async () => {
      const renewRes = await request(baseUrl)
        .post('/students/me/card/renew')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);
      const beforeRotate = (renewRes.body as EntityResponse<{ qrToken: string }>).data.qrToken;

      const rotateRes = await request(baseUrl)
        .post('/students/me/card/rotate-qr')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);
      const afterRotate = (rotateRes.body as EntityResponse<{ qrToken: string }>).data.qrToken;

      expect(afterRotate).not.toBe(beforeRotate);
    });

    it('returns a QR code data URL', async () => {
      const response = await request(baseUrl)
        .get('/students/me/card/qrcode')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(
        (response.body as EntityResponse<{ qrCodeDataUrl: string }>).data.qrCodeDataUrl,
      ).toMatch(/^data:image\/png;base64,/);
    });
  });

  describe('Card activation creates a brand-new account, then sets a password', () => {
    const cardNumber = `CARD-NEWACC-${Date.now()}`;
    const email = `${cardNumber.toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com`;
    let accessToken: string;

    it('verifies a fresh card number and returns a working token pair (no password yet)', async () => {
      await request(baseUrl).post('/card-activation/request-otp').send({ cardNumber }).expect(204);
      const code = getLastOtpCode(cardNumber);

      const verifyRes = await request(baseUrl)
        .post('/card-activation/verify')
        .send({ cardNumber, code })
        .expect(201);

      const tokens = (verifyRes.body as EntityResponse<{ accessToken: string }>).data;
      expect(tokens.accessToken).toBeDefined();
      accessToken = tokens.accessToken;

      const meRes = await request(baseUrl)
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      const me = (meRes.body as EntityResponse<{ status: string; isPasswordSet: boolean }>).data;
      expect(me.status).toBe('active');
      expect(me.isPasswordSet).toBe(false);

      const cardRes = await request(baseUrl)
        .get('/students/me/card')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect((cardRes.body as EntityResponse<{ cardNumber: string }>).data.cardNumber).toBe(
        cardNumber,
      );
    });

    it('rejects login before a password has been set', async () => {
      await request(baseUrl)
        .post('/auth/login')
        .send({ email, password: 'AnyPassword123' })
        .expect(401);
    });

    it('sets the password and rejects setting it again', async () => {
      await request(baseUrl)
        .post('/auth/set-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ password: 'MyNewP@ss123' })
        .expect(204);

      await request(baseUrl)
        .post('/auth/set-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ password: 'AnotherP@ss123' })
        .expect(409);
    });

    it('logs in with the newly set password', async () => {
      const loginRes = await request(baseUrl)
        .post('/auth/login')
        .send({ email, password: 'MyNewP@ss123' })
        .expect(200);
      expect(
        (loginRes.body as EntityResponse<{ accessToken: string }>).data.accessToken,
      ).toBeDefined();

      const meRes = await request(baseUrl)
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect((meRes.body as EntityResponse<{ isPasswordSet: boolean }>).data.isPasswordSet).toBe(
        true,
      );
    });
  });
});
