import request from 'supertest';
import { baseUrl, startTestServer, stopTestServer } from './utils/e2e-server';
import { loginAsSeedAdmin, registerAndVerifyStudent } from './utils/auth-helpers';

interface EntityResponse<T> {
  data: T;
}

interface PaginatedResponse<T> {
  data: { items: T[]; total: number; page: number; limit: number };
}

async function getUserId(token: string): Promise<string> {
  const res = await request(baseUrl).get('/auth/me').set('Authorization', `Bearer ${token}`);
  return (res.body as EntityResponse<{ id: string }>).data.id;
}

const SHIPPING_ADDRESS = {
  fullName: 'Returns Test Buyer',
  phone: '03001234567',
  line1: '1 Test Street',
  city: 'Lahore',
  state: 'Punjab',
};

const ORDER_STATUS_SEQUENCE = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

/**
 * Walks an order to `delivered`. `currentStatus` must match how it actually
 * started: `pending` for a COD order, `confirmed` for online_stub (which is
 * marked paid and confirmed immediately at checkout).
 */
async function deliverOrder(
  adminToken: string,
  orderId: string,
  currentStatus: 'pending' | 'confirmed' = 'pending',
): Promise<void> {
  const remainingSteps = ORDER_STATUS_SEQUENCE.slice(
    ORDER_STATUS_SEQUENCE.indexOf(currentStatus) + 1,
  );

  for (const status of remainingSteps) {
    await request(baseUrl)
      .patch(`/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status })
      .expect(200);
  }
}

async function findEntryForOrder(
  adminToken: string,
  beneficiaryUserId: string,
  orderId: string,
): Promise<{ orderId: string; amount: number; status: string } | undefined> {
  const res = await request(baseUrl)
    .get(`/commission/entries?beneficiaryUserId=${beneficiaryUserId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .expect(200);
  return (
    res.body as PaginatedResponse<{ orderId: string; amount: number; status: string }>
  ).data.items.find((e) => e.orderId === orderId);
}

describe('Phase 7 — Returns/Refunds/Exchanges & Finance/Settlement (e2e)', () => {
  let adminToken: string;
  let buyerToken: string;
  let otherBuyerToken: string;
  let beneficiaryId: string;
  let categoryId: string;
  let variantId: string;
  let variantBId: string;

  beforeAll(async () => {
    await startTestServer();
    adminToken = await loginAsSeedAdmin();
    buyerToken = await registerAndVerifyStudent(
      `phase7-buyer-${Date.now()}@example.com`,
      'P@ssw0rd123',
    );
    otherBuyerToken = await registerAndVerifyStudent(
      `phase7-other-${Date.now()}@example.com`,
      'P@ssw0rd123',
    );
    const beneficiaryToken = await registerAndVerifyStudent(
      `phase7-beneficiary-${Date.now()}@example.com`,
      'P@ssw0rd123',
    );
    beneficiaryId = await getUserId(beneficiaryToken);

    const categoryRes = await request(baseUrl)
      .post('/catalog/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Phase7-Category-${Date.now()}` })
      .expect(201);
    categoryId = (categoryRes.body as EntityResponse<{ id: string }>).data.id;

    const productRes = await request(baseUrl)
      .post('/catalog/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Returns Test Product ${Date.now()}`, categoryId })
      .expect(201);
    const productId = (productRes.body as EntityResponse<{ id: string }>).data.id;

    const variantRes = await request(baseUrl)
      .post(`/catalog/products/${productId}/variants`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sku: `RET-${Date.now()}`, price: 1000 })
      .expect(201);
    variantId = (variantRes.body as EntityResponse<{ id: string }>).data.id;
    await request(baseUrl)
      .post(`/inventory/variants/${variantId}/restock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ quantity: 1000 })
      .expect(201);

    const variantBRes = await request(baseUrl)
      .post(`/catalog/products/${productId}/variants`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sku: `RETB-${Date.now()}`, price: 1000 })
      .expect(201);
    variantBId = (variantBRes.body as EntityResponse<{ id: string }>).data.id;
    await request(baseUrl)
      .post(`/inventory/variants/${variantBId}/restock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ quantity: 1000 })
      .expect(201);

    // A GLOBAL rule matches every order regardless of the buyer's school
    // hierarchy, so it's a simple way to have something to reverse/release.
    await request(baseUrl)
      .post('/commission/rules')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Head office rate',
        beneficiaryUserId: beneficiaryId,
        scopeType: 'global',
        type: 'percentage',
        value: 5,
      })
      .expect(201);
  }, 30_000);

  afterAll(() => {
    stopTestServer();
  });

  describe('Return: rejected then approved', () => {
    let orderId: string;
    let returnRequestId: string;

    it('places and delivers an order', async () => {
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
      orderId = (orderRes.body as EntityResponse<{ id: string }>).data.id;

      await deliverOrder(adminToken, orderId);
    });

    it('holds a commission entry for the order (return-window hold released immediately in tests)', async () => {
      const entry = await findEntryForOrder(adminToken, beneficiaryId, orderId);
      expect(entry?.amount).toBe(50); // 5% of 1000
      expect(entry?.status).toBe('earned'); // hold window is 0 in e2e, so already released
    });

    it('rejects a return request for a non-delivered order', async () => {
      await request(baseUrl)
        .post('/cart/items')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ productVariantId: variantId, quantity: 1 })
        .expect(201);
      const pendingOrder = await request(baseUrl)
        .post('/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ shippingAddress: SHIPPING_ADDRESS, paymentMethod: 'cod' })
        .expect(201);

      await request(baseUrl)
        .post('/returns')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId: (pendingOrder.body as EntityResponse<{ id: string }>).data.id,
          orderChannel: 'retail',
          type: 'return',
          reason: 'Changed my mind',
        })
        .expect(400);
    });

    it('lets the buyer request a return and rejects a stranger reading it', async () => {
      const res = await request(baseUrl)
        .post('/returns')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ orderId, orderChannel: 'retail', type: 'return', reason: 'Wrong size' })
        .expect(201);
      returnRequestId = (res.body as EntityResponse<{ id: string; status: string }>).data.id;
      expect((res.body as EntityResponse<{ status: string }>).data.status).toBe('requested');

      await request(baseUrl)
        .get(`/returns/${returnRequestId}`)
        .set('Authorization', `Bearer ${otherBuyerToken}`)
        .expect(403);
    });

    it('rejects listing all requests from a non-admin', async () => {
      await request(baseUrl)
        .get('/returns')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(403);
    });

    it('lets admin reject the request, leaving the order and commission untouched', async () => {
      const res = await request(baseUrl)
        .patch(`/returns/${returnRequestId}/decide`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ decision: 'rejected', note: 'Past the return policy window' })
        .expect(200);
      expect((res.body as EntityResponse<{ status: string }>).data.status).toBe('rejected');

      const orderRes = await request(baseUrl)
        .get(`/orders/${orderId}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);
      expect((orderRes.body as EntityResponse<{ status: string }>).data.status).toBe('delivered');

      const entry = await findEntryForOrder(adminToken, beneficiaryId, orderId);
      expect(entry?.status).toBe('earned');
    });

    it('rejects deciding an already-decided request', async () => {
      await request(baseUrl)
        .patch(`/returns/${returnRequestId}/decide`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ decision: 'approved' })
        .expect(400);
    });

    it('lets the buyer request again and admin approve it — restocks, refunds nothing (COD/unpaid), reverses commission', async () => {
      const beforeInventory = await request(baseUrl)
        .get(`/inventory/variants/${variantId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const beforeAvailable = (
        beforeInventory.body as EntityResponse<{ availableQuantity: number }>
      ).data.availableQuantity;

      const secondRequestRes = await request(baseUrl)
        .post('/returns')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ orderId, orderChannel: 'retail', type: 'return', reason: 'Wrong size, retry' })
        .expect(201);
      const secondRequestId = (secondRequestRes.body as EntityResponse<{ id: string }>).data.id;

      await request(baseUrl)
        .patch(`/returns/${secondRequestId}/decide`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ decision: 'approved' })
        .expect(200);

      const orderRes = await request(baseUrl)
        .get(`/orders/${orderId}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);
      expect((orderRes.body as EntityResponse<{ status: string }>).data.status).toBe('returned');

      const afterInventory = await request(baseUrl)
        .get(`/inventory/variants/${variantId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(
        (afterInventory.body as EntityResponse<{ availableQuantity: number }>).data
          .availableQuantity,
      ).toBe(beforeAvailable + 1);

      const entry = await findEntryForOrder(adminToken, beneficiaryId, orderId);
      expect(entry?.status).toBe('reversed');

      await request(baseUrl)
        .get(`/returns/${secondRequestId}/refund`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404); // COD order was never marked paid, so nothing to refund
    });
  });

  describe('Return with a refund (paid order)', () => {
    it('refunds a paid order on approval', async () => {
      await request(baseUrl)
        .post('/cart/items')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ productVariantId: variantId, quantity: 1 })
        .expect(201);
      const orderRes = await request(baseUrl)
        .post('/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ shippingAddress: SHIPPING_ADDRESS, paymentMethod: 'online_stub' })
        .expect(201);
      const order = (orderRes.body as EntityResponse<{ id: string; totalAmount: number }>).data;

      await deliverOrder(adminToken, order.id, 'confirmed');

      const requestRes = await request(baseUrl)
        .post('/returns')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ orderId: order.id, orderChannel: 'retail', type: 'return', reason: 'Defective' })
        .expect(201);
      const requestId = (requestRes.body as EntityResponse<{ id: string }>).data.id;

      await request(baseUrl)
        .patch(`/returns/${requestId}/decide`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ decision: 'approved' })
        .expect(200);

      const afterOrder = await request(baseUrl)
        .get(`/orders/${order.id}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);
      expect(
        (afterOrder.body as EntityResponse<{ paymentStatus: string }>).data.paymentStatus,
      ).toBe('refunded');

      const refundRes = await request(baseUrl)
        .get(`/returns/${requestId}/refund`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect((refundRes.body as EntityResponse<{ amount: number }>).data.amount).toBe(
        order.totalAmount,
      );
    });
  });

  describe('Exchange', () => {
    it('swaps stock between the original and replacement variant without changing order status', async () => {
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
      const order = (orderRes.body as EntityResponse<{ id: string; items: { id: string }[] }>).data;
      await deliverOrder(adminToken, order.id);

      const beforeOriginal = await request(baseUrl)
        .get(`/inventory/variants/${variantId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const beforeReplacement = await request(baseUrl)
        .get(`/inventory/variants/${variantBId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const requestRes = await request(baseUrl)
        .post('/returns')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId: order.id,
          orderChannel: 'retail',
          type: 'exchange',
          reason: 'Prefer the other variant',
          orderItemId: order.items[0].id,
          replacementVariantId: variantBId,
        })
        .expect(201);
      const requestId = (requestRes.body as EntityResponse<{ id: string }>).data.id;

      await request(baseUrl)
        .patch(`/returns/${requestId}/decide`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ decision: 'approved' })
        .expect(200);

      const afterOrder = await request(baseUrl)
        .get(`/orders/${order.id}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);
      expect((afterOrder.body as EntityResponse<{ status: string }>).data.status).toBe('delivered'); // unchanged — an exchange doesn't transition the order

      const afterOriginal = await request(baseUrl)
        .get(`/inventory/variants/${variantId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const afterReplacement = await request(baseUrl)
        .get(`/inventory/variants/${variantBId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(
        (afterOriginal.body as EntityResponse<{ availableQuantity: number }>).data
          .availableQuantity,
      ).toBe(
        (beforeOriginal.body as EntityResponse<{ availableQuantity: number }>).data
          .availableQuantity + 1,
      );
      expect(
        (afterReplacement.body as EntityResponse<{ availableQuantity: number }>).data
          .availableQuantity,
      ).toBe(
        (beforeReplacement.body as EntityResponse<{ availableQuantity: number }>).data
          .availableQuantity - 1,
      );
    });

    it('rejects an exchange missing the replacement variant', async () => {
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
      const order = (orderRes.body as EntityResponse<{ id: string }>).data;
      await deliverOrder(adminToken, order.id);

      await request(baseUrl)
        .post('/returns')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          orderId: order.id,
          orderChannel: 'retail',
          type: 'exchange',
          reason: 'Missing fields',
        })
        .expect(400);
    });
  });

  describe('Settlements & net revenue', () => {
    it('generates a settlement covering earned entries and locks them from re-inclusion', async () => {
      const today = new Date().toISOString().slice(0, 10);
      const res = await request(baseUrl)
        .post('/settlements/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ beneficiaryUserId: beneficiaryId, periodStart: '2020-01-01', periodEnd: today })
        .expect(201);
      const statement = (
        res.body as EntityResponse<{ id: string; totalAmount: number; entryCount: number }>
      ).data;
      expect(statement.entryCount).toBeGreaterThan(0);
      expect(statement.totalAmount).toBeGreaterThan(0);

      // Generating again for the same period finds nothing new to include.
      const secondRes = await request(baseUrl)
        .post('/settlements/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ beneficiaryUserId: beneficiaryId, periodStart: '2020-01-01', periodEnd: today })
        .expect(201);
      expect((secondRes.body as EntityResponse<{ entryCount: number }>).data.entryCount).toBe(0);

      const markPaidRes = await request(baseUrl)
        .patch(`/settlements/${statement.id}/mark-paid`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect((markPaidRes.body as EntityResponse<{ status: string }>).data.status).toBe('paid');

      await request(baseUrl)
        .patch(`/settlements/${statement.id}/mark-paid`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('rejects generating a settlement from a non-admin', async () => {
      await request(baseUrl)
        .post('/settlements/generate')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          beneficiaryUserId: beneficiaryId,
          periodStart: '2020-01-01',
          periodEnd: '2020-01-31',
        })
        .expect(403);
    });

    it('reports net revenue for a period', async () => {
      const today = new Date().toISOString().slice(0, 10);
      const res = await request(baseUrl)
        .get(`/finance/net-revenue?startDate=2020-01-01&endDate=${today}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const report = (
        res.body as EntityResponse<{
          grossRevenue: number;
          totalRefunds: number;
          totalCommissions: number;
          netRevenue: number;
        }>
      ).data;
      expect(report.grossRevenue).toBeGreaterThan(0);
      expect(report.totalRefunds).toBeGreaterThan(0);
      expect(report.netRevenue).toBe(
        report.grossRevenue - report.totalRefunds - report.totalCommissions,
      );
    });

    it('rejects the net revenue report from a non-admin', async () => {
      await request(baseUrl)
        .get('/finance/net-revenue?startDate=2020-01-01&endDate=2020-01-31')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(403);
    });
  });
});
