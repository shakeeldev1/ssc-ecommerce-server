import request from 'supertest';
import { baseUrl, startTestServer, stopTestServer } from './utils/e2e-server';
import {
  applyAndVerifyVendor,
  loginAsSeedAdmin,
  registerAndVerifyStudent,
} from './utils/auth-helpers';

interface EntityResponse<T> {
  data: T;
}

async function findVendorIdByToken(adminToken: string, vendorToken: string): Promise<string> {
  const meRes = await request(baseUrl)
    .get('/vendors/me')
    .set('Authorization', `Bearer ${vendorToken}`)
    .expect(200);
  return (meRes.body as EntityResponse<{ id: string }>).data.id;
}

describe('Phase 5 — Vendor Management (e2e)', () => {
  let adminToken: string;
  let studentToken: string;
  let categoryId: string;

  beforeAll(async () => {
    await startTestServer();
    adminToken = await loginAsSeedAdmin();
    studentToken = await registerAndVerifyStudent(
      `phase5-student-${Date.now()}@example.com`,
      'P@ssw0rd123',
    );

    const categoryRes = await request(baseUrl)
      .post('/catalog/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Phase5-Category-${Date.now()}` })
      .expect(201);
    categoryId = (categoryRes.body as EntityResponse<{ id: string }>).data.id;
  }, 30_000);

  afterAll(() => {
    stopTestServer();
  });

  describe('Application & onboarding', () => {
    it('applies as a vendor, verifies email, and starts out pending', async () => {
      const vendorToken = await applyAndVerifyVendor(
        `phase5-apply-${Date.now()}@example.com`,
        'P@ssw0rd123',
      );

      const res = await request(baseUrl)
        .get('/vendors/me')
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(200);
      expect((res.body as EntityResponse<{ status: string }>).data.status).toBe('pending');
    });

    it('rejects catalog product creation from a not-yet-approved vendor', async () => {
      const vendorToken = await applyAndVerifyVendor(
        `phase5-notapproved-${Date.now()}@example.com`,
        'P@ssw0rd123',
      );

      await request(baseUrl)
        .post('/catalog/products')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ name: `Should Fail ${Date.now()}`, categoryId })
        .expect(403);
    });

    it('rejects listing/approving vendors from a student', async () => {
      await request(baseUrl)
        .get('/vendors')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });

    it('rejects an invalid status transition', async () => {
      const vendorToken = await applyAndVerifyVendor(
        `phase5-badtransition-${Date.now()}@example.com`,
        'P@ssw0rd123',
      );
      const vendorId = await findVendorIdByToken(adminToken, vendorToken);

      await request(baseUrl)
        .patch(`/vendors/${vendorId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'deactivated' })
        .expect(400);
    });

    it('rejects a vendor application with a reason', async () => {
      const vendorToken = await applyAndVerifyVendor(
        `phase5-rejected-${Date.now()}@example.com`,
        'P@ssw0rd123',
      );
      const vendorId = await findVendorIdByToken(adminToken, vendorToken);

      const res = await request(baseUrl)
        .patch(`/vendors/${vendorId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'rejected', reason: 'Incomplete bank details' })
        .expect(200);
      const vendor = (res.body as EntityResponse<{ status: string; rejectionReason: string }>).data;
      expect(vendor.status).toBe('rejected');
      expect(vendor.rejectionReason).toBe('Incomplete bank details');

      await request(baseUrl)
        .post('/catalog/products')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ name: `Still Rejected ${Date.now()}`, categoryId })
        .expect(403);
    });

    it('appears in the pending list and can be approved by admin', async () => {
      const vendorToken = await applyAndVerifyVendor(
        `phase5-approve-${Date.now()}@example.com`,
        'P@ssw0rd123',
      );
      const vendorId = await findVendorIdByToken(adminToken, vendorToken);

      const pendingRes = await request(baseUrl)
        .get('/vendors?status=pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(
        (pendingRes.body as EntityResponse<{ id: string }[]>).data.some((v) => v.id === vendorId),
      ).toBe(true);

      const approveRes = await request(baseUrl)
        .patch(`/vendors/${vendorId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'approved' })
        .expect(200);
      expect((approveRes.body as EntityResponse<{ status: string }>).data.status).toBe('approved');
    });
  });

  describe('Vendor-scoped catalog management', () => {
    let vendorAToken: string;
    let vendorBToken: string;
    let vendorAProductId: string;

    beforeAll(async () => {
      vendorAToken = await applyAndVerifyVendor(
        `phase5-vendora-${Date.now()}@example.com`,
        'P@ssw0rd123',
      );
      vendorBToken = await applyAndVerifyVendor(
        `phase5-vendorb-${Date.now()}@example.com`,
        'P@ssw0rd123',
      );

      const vendorAId = await findVendorIdByToken(adminToken, vendorAToken);
      const vendorBId = await findVendorIdByToken(adminToken, vendorBToken);
      await request(baseUrl)
        .patch(`/vendors/${vendorAId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'approved' })
        .expect(200);
      await request(baseUrl)
        .patch(`/vendors/${vendorBId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'approved' })
        .expect(200);
    }, 30_000);

    it('lets an approved vendor create their own product', async () => {
      const res = await request(baseUrl)
        .post('/catalog/products')
        .set('Authorization', `Bearer ${vendorAToken}`)
        .send({ name: `Vendor A Product ${Date.now()}`, categoryId })
        .expect(201);
      vendorAProductId = (res.body as EntityResponse<{ id: string }>).data.id;
      expect(vendorAProductId).toBeDefined();
    });

    it("shows the product in the vendor's own listing", async () => {
      const res = await request(baseUrl)
        .get('/catalog/products/mine')
        .set('Authorization', `Bearer ${vendorAToken}`)
        .expect(200);
      expect(
        (res.body as EntityResponse<{ id: string }[]>).data.some((p) => p.id === vendorAProductId),
      ).toBe(true);
    });

    it("rejects a second vendor managing the first vendor's product", async () => {
      await request(baseUrl)
        .patch(`/catalog/products/${vendorAProductId}`)
        .set('Authorization', `Bearer ${vendorBToken}`)
        .send({ name: 'Hijacked name' })
        .expect(403);

      await request(baseUrl)
        .post(`/catalog/products/${vendorAProductId}/variants`)
        .set('Authorization', `Bearer ${vendorBToken}`)
        .send({ sku: `HIJACK-${Date.now()}`, price: 100 })
        .expect(403);
    });

    it('lets the owning vendor add a variant to their own product', async () => {
      await request(baseUrl)
        .post(`/catalog/products/${vendorAProductId}/variants`)
        .set('Authorization', `Bearer ${vendorAToken}`)
        .send({ sku: `VENDORA-${Date.now()}`, price: 500 })
        .expect(201);
    });

    it('still lets a super admin manage a vendor-owned product', async () => {
      await request(baseUrl)
        .patch(`/catalog/products/${vendorAProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(200);
    });

    it('blocks catalog management once the vendor is suspended', async () => {
      const vendorAId = await findVendorIdByToken(adminToken, vendorAToken);
      await request(baseUrl)
        .patch(`/vendors/${vendorAId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'suspended' })
        .expect(200);

      await request(baseUrl)
        .patch(`/catalog/products/${vendorAProductId}`)
        .set('Authorization', `Bearer ${vendorAToken}`)
        .send({ isActive: true })
        .expect(403);
    });
  });

  describe('Vendor documents', () => {
    it('fails cleanly uploading a document (Cloudinary not configured in tests)', async () => {
      const vendorToken = await applyAndVerifyVendor(
        `phase5-docs-${Date.now()}@example.com`,
        'P@ssw0rd123',
      );

      await request(baseUrl)
        .post('/vendors/me/documents')
        .set('Authorization', `Bearer ${vendorToken}`)
        .field('type', 'business_registration')
        .attach('document', Buffer.from('fake-doc-bytes'), {
          filename: 'reg.png',
          contentType: 'image/png',
        })
        .expect(503);
    });
  });
});
