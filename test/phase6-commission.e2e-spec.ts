import request from 'supertest';
import { baseUrl, startTestServer, stopTestServer } from './utils/e2e-server';
import { loginAsSeedAdmin, registerAndVerifyStudent } from './utils/auth-helpers';

interface EntityResponse<T> {
  data: T;
}

interface PaginatedResponse<T> {
  data: { items: T[]; total: number; page: number; limit: number };
}

interface CommissionEntryShape {
  orderId: string;
  amount: number;
  status: string;
}

async function getUserId(token: string): Promise<string> {
  const res = await request(baseUrl).get('/auth/me').set('Authorization', `Bearer ${token}`);
  return (res.body as EntityResponse<{ id: string }>).data.id;
}

async function findEntryForOrder(
  adminToken: string,
  beneficiaryUserId: string,
  orderId: string,
): Promise<CommissionEntryShape | undefined> {
  const res = await request(baseUrl)
    .get(`/commission/entries?beneficiaryUserId=${beneficiaryUserId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .expect(200);
  return (res.body as PaginatedResponse<CommissionEntryShape>).data.items.find(
    (e) => e.orderId === orderId,
  );
}

const SHIPPING_ADDRESS = {
  fullName: 'Commission Test Buyer',
  phone: '03001234567',
  line1: '1 Test Street',
  city: 'Lahore',
  state: 'Punjab',
};

describe('Phase 6 — Multi-Tier Commission & Incentive Engine (e2e)', () => {
  let adminToken: string;
  let buyerToken: string;

  let regionId: string;
  let districtId: string;
  let institutionId: string;
  let schoolChainId: string;
  let categoryId: string;
  let variantId: string;

  let institutionBeneficiaryId: string;
  let chainBeneficiaryId: string;
  let districtBeneficiaryId: string;
  let regionBeneficiaryId: string;
  let headOfficeBeneficiaryId: string;
  let affiliateBeneficiaryId: string;

  let institutionRuleId: string;
  let districtRuleId: string;
  let campaignCode: string;

  beforeAll(async () => {
    await startTestServer();
    adminToken = await loginAsSeedAdmin();

    const regionRes = await request(baseUrl)
      .post('/regions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Region-${Date.now()}` })
      .expect(201);
    regionId = (regionRes.body as EntityResponse<{ id: string }>).data.id;

    const districtRes = await request(baseUrl)
      .post('/districts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `District-${Date.now()}`, regionId })
      .expect(201);
    districtId = (districtRes.body as EntityResponse<{ id: string }>).data.id;

    const chainRes = await request(baseUrl)
      .post('/school-chains')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Chain-${Date.now()}` })
      .expect(201);
    schoolChainId = (chainRes.body as EntityResponse<{ id: string }>).data.id;

    const institutionRes = await request(baseUrl)
      .post('/institutions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `School-${Date.now()}`, type: 'school', districtId, schoolChainId })
      .expect(201);
    institutionId = (institutionRes.body as EntityResponse<{ id: string }>).data.id;

    const beneficiaryTokens = await Promise.all(
      ['institution', 'chain', 'district', 'region', 'headoffice', 'affiliate'].map((label) =>
        registerAndVerifyStudent(`phase6-${label}-${Date.now()}@example.com`, 'P@ssw0rd123'),
      ),
    );
    [
      institutionBeneficiaryId,
      chainBeneficiaryId,
      districtBeneficiaryId,
      regionBeneficiaryId,
      headOfficeBeneficiaryId,
      affiliateBeneficiaryId,
    ] = await Promise.all(beneficiaryTokens.map((token) => getUserId(token)));

    buyerToken = await registerAndVerifyStudent(
      `phase6-buyer-${Date.now()}@example.com`,
      'P@ssw0rd123',
    );
    await request(baseUrl).get('/students/me').set('Authorization', `Bearer ${buyerToken}`);
    await request(baseUrl)
      .patch('/students/me')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ institutionId, districtId, regionId })
      .expect(200);

    const categoryRes = await request(baseUrl)
      .post('/catalog/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Phase6-Category-${Date.now()}` })
      .expect(201);
    categoryId = (categoryRes.body as EntityResponse<{ id: string }>).data.id;

    const productRes = await request(baseUrl)
      .post('/catalog/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Commission Test Product ${Date.now()}`, categoryId })
      .expect(201);
    const productId = (productRes.body as EntityResponse<{ id: string }>).data.id;

    const variantRes = await request(baseUrl)
      .post(`/catalog/products/${productId}/variants`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sku: `COMM-${Date.now()}`, price: 1000 })
      .expect(201);
    variantId = (variantRes.body as EntityResponse<{ id: string }>).data.id;
    await request(baseUrl)
      .post(`/inventory/variants/${variantId}/restock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ quantity: 1000 })
      .expect(201);
  }, 30_000);

  afterAll(() => {
    stopTestServer();
  });

  describe('Rule management', () => {
    it('rejects rule creation from a non-admin', async () => {
      await request(baseUrl)
        .post('/commission/rules')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          name: 'x',
          beneficiaryUserId: institutionBeneficiaryId,
          scopeType: 'institution',
          scopeId: institutionId,
          type: 'percentage',
          value: 1,
        })
        .expect(403);
    });

    it('rejects a hierarchy rule with no scopeId', async () => {
      await request(baseUrl)
        .post('/commission/rules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Missing scope',
          beneficiaryUserId: institutionBeneficiaryId,
          scopeType: 'district',
          type: 'percentage',
          value: 1,
        })
        .expect(400);
    });

    it('rejects a campaign rule with no campaignCode', async () => {
      await request(baseUrl)
        .post('/commission/rules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Missing code',
          beneficiaryUserId: affiliateBeneficiaryId,
          scopeType: 'campaign',
          type: 'fixed',
          value: 20,
        })
        .expect(400);
    });

    it('rejects a rule pointing at a non-existent scope', async () => {
      await request(baseUrl)
        .post('/commission/rules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Bad scope',
          beneficiaryUserId: districtBeneficiaryId,
          scopeType: 'district',
          scopeId: '00000000-0000-0000-0000-000000000000',
          type: 'percentage',
          value: 1,
        })
        .expect(400);
    });

    it('creates one rule per hierarchy tier plus a campaign rule', async () => {
      const institutionRes = await request(baseUrl)
        .post('/commission/rules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Institution rate',
          beneficiaryUserId: institutionBeneficiaryId,
          scopeType: 'institution',
          scopeId: institutionId,
          type: 'percentage',
          value: 2,
        })
        .expect(201);
      institutionRuleId = (institutionRes.body as EntityResponse<{ id: string }>).data.id;

      await request(baseUrl)
        .post('/commission/rules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Chain rate',
          beneficiaryUserId: chainBeneficiaryId,
          scopeType: 'school_chain',
          scopeId: schoolChainId,
          type: 'percentage',
          value: 1,
        })
        .expect(201);

      const districtRes = await request(baseUrl)
        .post('/commission/rules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'District rate',
          beneficiaryUserId: districtBeneficiaryId,
          scopeType: 'district',
          scopeId: districtId,
          type: 'fixed',
          value: 50,
        })
        .expect(201);
      districtRuleId = (districtRes.body as EntityResponse<{ id: string }>).data.id;

      const regionRuleRes = await request(baseUrl)
        .post('/commission/rules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Region rate (on hold)',
          beneficiaryUserId: regionBeneficiaryId,
          scopeType: 'region',
          scopeId: regionId,
          type: 'percentage',
          value: 1,
        })
        .expect(201);
      const regionRuleId = (regionRuleRes.body as EntityResponse<{ id: string }>).data.id;
      await request(baseUrl)
        .patch(`/commission/rules/${regionRuleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'on_hold' })
        .expect(200);

      await request(baseUrl)
        .post('/commission/rules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Head office rate',
          beneficiaryUserId: headOfficeBeneficiaryId,
          scopeType: 'global',
          type: 'percentage',
          value: 0.5,
        })
        .expect(201);

      campaignCode = `REF100-${Date.now()}`;
      await request(baseUrl)
        .post('/commission/rules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Affiliate code',
          beneficiaryUserId: affiliateBeneficiaryId,
          scopeType: 'campaign',
          campaignCode,
          type: 'fixed',
          value: 20,
        })
        .expect(201);
    });
  });

  describe('Commission computation at checkout', () => {
    it('routes commissions to every matching tier plus the campaign code', async () => {
      await request(baseUrl)
        .post('/cart/items')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ productVariantId: variantId, quantity: 2 })
        .expect(201);

      const orderRes = await request(baseUrl)
        .post('/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          shippingAddress: SHIPPING_ADDRESS,
          paymentMethod: 'cod',
          campaignCode,
        })
        .expect(201);
      const order = (orderRes.body as EntityResponse<{ id: string; totalAmount: number }>).data;
      expect(order.totalAmount).toBe(2000);

      const institutionEntry = await findEntryForOrder(
        adminToken,
        institutionBeneficiaryId,
        order.id,
      );
      expect(institutionEntry?.amount).toBe(40); // 2% of 2000
      // Phase 7: a normally-active rule holds the entry for the return
      // window before it's EARNED (see Phase 7's e2e spec for the
      // hold-release/reversal behavior) — e2e sets the window to 0 days for
      // determinism, so by the time it's read back here it's already earned.
      expect(institutionEntry?.status).toBe('earned');

      const chainEntry = await findEntryForOrder(adminToken, chainBeneficiaryId, order.id);
      expect(chainEntry?.amount).toBe(20); // 1% of 2000

      const districtEntry = await findEntryForOrder(adminToken, districtBeneficiaryId, order.id);
      expect(districtEntry?.amount).toBe(50); // fixed

      const regionEntry = await findEntryForOrder(adminToken, regionBeneficiaryId, order.id);
      expect(regionEntry?.amount).toBe(20); // 1% of 2000, computed even though on hold
      expect(regionEntry?.status).toBe('held');

      const headOfficeEntry = await findEntryForOrder(
        adminToken,
        headOfficeBeneficiaryId,
        order.id,
      );
      expect(headOfficeEntry?.amount).toBe(10); // 0.5% of 2000

      const affiliateEntry = await findEntryForOrder(adminToken, affiliateBeneficiaryId, order.id);
      expect(affiliateEntry?.amount).toBe(20);
    });

    it('lets a beneficiary see their own commission entries', async () => {
      // The institution beneficiary is itself one of the registered student
      // accounts, so it can log in and check its own earnings.
      const res = await request(baseUrl)
        .get('/commission/entries/mine')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);
      // The buyer itself earned nothing (they're the purchaser, not a beneficiary).
      expect((res.body as EntityResponse<{ items: unknown[] }>).data.items).toHaveLength(0);
    });

    it('disabling a rule stops that tier from producing an entry', async () => {
      await request(baseUrl)
        .patch(`/commission/rules/${institutionRuleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'disabled' })
        .expect(200);

      await request(baseUrl)
        .post('/cart/items')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ productVariantId: variantId, quantity: 1 })
        .expect(201);
      const orderRes = await request(baseUrl)
        .post('/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ shippingAddress: SHIPPING_ADDRESS, paymentMethod: 'cod' })
        .expect(201);
      const orderId = (orderRes.body as EntityResponse<{ id: string }>).data.id;

      const institutionEntry = await findEntryForOrder(
        adminToken,
        institutionBeneficiaryId,
        orderId,
      );
      expect(institutionEntry).toBeUndefined();

      // The district tier is untouched and still produces an entry for this order.
      const districtEntry = await findEntryForOrder(adminToken, districtBeneficiaryId, orderId);
      expect(districtEntry).toBeDefined();
    });

    it('zeroing a rule still records an entry, at amount 0', async () => {
      await request(baseUrl)
        .patch(`/commission/rules/${districtRuleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'zeroed' })
        .expect(200);

      await request(baseUrl)
        .post('/cart/items')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ productVariantId: variantId, quantity: 1 })
        .expect(201);
      const orderRes = await request(baseUrl)
        .post('/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ shippingAddress: SHIPPING_ADDRESS, paymentMethod: 'cod' })
        .expect(201);
      const orderId = (orderRes.body as EntityResponse<{ id: string }>).data.id;

      const entry = await findEntryForOrder(adminToken, districtBeneficiaryId, orderId);
      expect(entry?.amount).toBe(0);
      expect(entry?.status).toBe('zeroed');
    });
  });
});
