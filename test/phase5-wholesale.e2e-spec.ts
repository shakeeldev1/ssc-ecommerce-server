import request from 'supertest';
import { baseUrl, startTestServer, stopTestServer } from './utils/e2e-server';
import {
  applyAndVerifyVendor,
  loginAsSeedAdmin,
  registerAndVerifyWholesaleBuyer,
} from './utils/auth-helpers';

interface EntityResponse<T> {
  data: T;
}

const SHIPPING_ADDRESS = {
  fullName: 'Bulk Buyer Co',
  phone: '03001234567',
  line1: '1 Industrial Estate',
  city: 'Faisalabad',
  state: 'Punjab',
};

async function findVendorIdByToken(vendorToken: string): Promise<string> {
  const res = await request(baseUrl)
    .get('/vendors/me')
    .set('Authorization', `Bearer ${vendorToken}`)
    .expect(200);
  return (res.body as EntityResponse<{ id: string }>).data.id;
}

async function getUserId(token: string): Promise<string> {
  const res = await request(baseUrl).get('/auth/me').set('Authorization', `Bearer ${token}`);
  return (res.body as EntityResponse<{ id: string }>).data.id;
}

describe('Phase 5 — Wholesale/B2B & Pricing Engine (e2e)', () => {
  let adminToken: string;
  let vendorAToken: string;
  let vendorBToken: string;
  let buyerAToken: string;
  let buyerBToken: string;
  let buyerAId: string;
  let categoryId: string;
  let wholesaleVariantId: string;
  let retailOnlyVariantId: string;

  beforeAll(async () => {
    await startTestServer();
    adminToken = await loginAsSeedAdmin();

    vendorAToken = await applyAndVerifyVendor(
      `phase5w-vendora-${Date.now()}@example.com`,
      'P@ssw0rd123',
      undefined,
      'wholesale_vendor',
    );
    vendorBToken = await applyAndVerifyVendor(
      `phase5w-vendorb-${Date.now()}@example.com`,
      'P@ssw0rd123',
      undefined,
      'wholesale_vendor',
    );
    buyerAToken = await registerAndVerifyWholesaleBuyer(
      `phase5w-buyera-${Date.now()}@example.com`,
      'P@ssw0rd123',
    );
    buyerBToken = await registerAndVerifyWholesaleBuyer(
      `phase5w-buyerb-${Date.now()}@example.com`,
      'P@ssw0rd123',
    );
    buyerAId = await getUserId(buyerAToken);

    const vendorAId = await findVendorIdByToken(vendorAToken);
    const vendorBId = await findVendorIdByToken(vendorBToken);
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

    const categoryRes = await request(baseUrl)
      .post('/catalog/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Phase5W-Category-${Date.now()}` })
      .expect(201);
    categoryId = (categoryRes.body as EntityResponse<{ id: string }>).data.id;

    const productRes = await request(baseUrl)
      .post('/catalog/products')
      .set('Authorization', `Bearer ${vendorAToken}`)
      .send({ name: `Bulk Fabric ${Date.now()}`, categoryId })
      .expect(201);
    const productId = (productRes.body as EntityResponse<{ id: string }>).data.id;

    const variantRes = await request(baseUrl)
      .post(`/catalog/products/${productId}/variants`)
      .set('Authorization', `Bearer ${vendorAToken}`)
      .send({
        sku: `BULK-FABRIC-${Date.now()}`,
        price: 100,
        isWholesaleEligible: true,
        wholesaleMoq: 20,
      })
      .expect(201);
    wholesaleVariantId = (variantRes.body as EntityResponse<{ id: string }>).data.id;
    await request(baseUrl)
      .post(`/inventory/variants/${wholesaleVariantId}/restock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ quantity: 1000 })
      .expect(201);

    const retailOnlyRes = await request(baseUrl)
      .post(`/catalog/products/${productId}/variants`)
      .set('Authorization', `Bearer ${vendorAToken}`)
      .send({ sku: `RETAIL-ONLY-${Date.now()}`, price: 50 })
      .expect(201);
    retailOnlyVariantId = (retailOnlyRes.body as EntityResponse<{ id: string }>).data.id;
  }, 30_000);

  afterAll(() => {
    stopTestServer();
  });

  describe('Pricing engine', () => {
    it('rejects a non-owning vendor setting a price tier', async () => {
      await request(baseUrl)
        .post(`/pricing/variants/${wholesaleVariantId}/tiers`)
        .set('Authorization', `Bearer ${vendorBToken}`)
        .send({ minQuantity: 10, pricePerUnit: 90 })
        .expect(403);
    });

    it('lets the owning vendor create quantity price tiers', async () => {
      await request(baseUrl)
        .post(`/pricing/variants/${wholesaleVariantId}/tiers`)
        .set('Authorization', `Bearer ${vendorAToken}`)
        .send({ minQuantity: 10, pricePerUnit: 90 })
        .expect(201);
      await request(baseUrl)
        .post(`/pricing/variants/${wholesaleVariantId}/tiers`)
        .set('Authorization', `Bearer ${vendorAToken}`)
        .send({ minQuantity: 50, pricePerUnit: 80 })
        .expect(201);
    });

    it('publicly lists tiers ordered by minQuantity', async () => {
      const res = await request(baseUrl)
        .get(`/pricing/variants/${wholesaleVariantId}/tiers`)
        .expect(200);
      const tiers = (res.body as EntityResponse<{ minQuantity: number }[]>).data;
      expect(tiers.map((t) => t.minQuantity)).toEqual([10, 50]);
    });

    it('sets a negotiated buyer-specific price that overrides tiers', async () => {
      await request(baseUrl)
        .post(`/pricing/variants/${wholesaleVariantId}/buyer-prices`)
        .set('Authorization', `Bearer ${vendorAToken}`)
        .send({ buyerUserId: buyerAId, pricePerUnit: 70 })
        .expect(201);
    });

    it("does not expose negotiated buyer prices to the buyer's own request", async () => {
      await request(baseUrl)
        .get(`/pricing/variants/${wholesaleVariantId}/buyer-prices`)
        .set('Authorization', `Bearer ${buyerAToken}`)
        .expect(403);
    });
  });

  describe('Wholesale catalogue', () => {
    it('shows the wholesale-eligible variant but not the retail-only one', async () => {
      const res = await request(baseUrl)
        .get(`/wholesale/variants?categoryId=${categoryId}`)
        .expect(200);
      const result = (res.body as EntityResponse<{ items: { id: string }[] }>).data;
      expect(result.items.some((v) => v.id === wholesaleVariantId)).toBe(true);
      expect(result.items.some((v) => v.id === retailOnlyVariantId)).toBe(false);
    });
  });

  describe('Wholesale cart', () => {
    it('rejects adding below the minimum order quantity', async () => {
      await request(baseUrl)
        .post('/wholesale/cart/items')
        .set('Authorization', `Bearer ${buyerBToken}`)
        .send({ productVariantId: wholesaleVariantId, quantity: 15 })
        .expect(400);
    });

    it("resolves buyer B's price from the quantity tier", async () => {
      const res = await request(baseUrl)
        .post('/wholesale/cart/items')
        .set('Authorization', `Bearer ${buyerBToken}`)
        .send({ productVariantId: wholesaleVariantId, quantity: 30 })
        .expect(201);
      const cart = (
        res.body as EntityResponse<{ subtotal: number; lines: { unitPrice: number }[] }>
      ).data;
      expect(cart.lines[0].unitPrice).toBe(90);
      expect(cart.subtotal).toBe(2700);
    });

    it('moves buyer B into the next tier once quantity crosses it', async () => {
      const res = await request(baseUrl)
        .patch(`/wholesale/cart/items/${wholesaleVariantId}`)
        .set('Authorization', `Bearer ${buyerBToken}`)
        .send({ quantity: 50 })
        .expect(200);
      const cart = (res.body as EntityResponse<{ lines: { unitPrice: number }[] }>).data;
      expect(cart.lines[0].unitPrice).toBe(80);
    });

    it("resolves buyer A's negotiated price regardless of tiers", async () => {
      const res = await request(baseUrl)
        .post('/wholesale/cart/items')
        .set('Authorization', `Bearer ${buyerAToken}`)
        .send({ productVariantId: wholesaleVariantId, quantity: 25 })
        .expect(201);
      const cart = (
        res.body as EntityResponse<{ subtotal: number; lines: { unitPrice: number }[] }>
      ).data;
      expect(cart.lines[0].unitPrice).toBe(70);
      expect(cart.subtotal).toBe(1750);
    });
  });

  describe('Wholesale checkout & order tracking', () => {
    let orderId: string;

    it('checks out into a wholesale order at the tiered price', async () => {
      const res = await request(baseUrl)
        .post('/wholesale/orders')
        .set('Authorization', `Bearer ${buyerBToken}`)
        .send({ shippingAddress: SHIPPING_ADDRESS, paymentMethod: 'cod' })
        .expect(201);
      const order = (
        res.body as EntityResponse<{
          id: string;
          status: string;
          subtotal: number;
          totalAmount: number;
        }>
      ).data;
      orderId = order.id;
      expect(order.status).toBe('pending');
      expect(order.subtotal).toBe(4000); // 50 units at the 80/unit tier
      expect(order.totalAmount).toBe(4000);
    });

    it('cleared the cart and decremented stock', async () => {
      const cartRes = await request(baseUrl)
        .get('/wholesale/cart')
        .set('Authorization', `Bearer ${buyerBToken}`)
        .expect(200);
      expect((cartRes.body as EntityResponse<{ lines: unknown[] }>).data.lines).toHaveLength(0);

      const inventoryRes = await request(baseUrl)
        .get(`/inventory/variants/${wholesaleVariantId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(
        (inventoryRes.body as EntityResponse<{ totalSoldQuantity: number }>).data.totalSoldQuantity,
      ).toBe(50);
    });

    it("rejects reading another buyer's order", async () => {
      await request(baseUrl)
        .get(`/wholesale/orders/${orderId}`)
        .set('Authorization', `Bearer ${buyerAToken}`)
        .expect(403);
    });

    it('walks the order through confirmed -> processing -> shipped -> delivered', async () => {
      for (const status of ['confirmed', 'processing', 'shipped', 'delivered']) {
        await request(baseUrl)
          .patch(`/wholesale/orders/${orderId}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status })
          .expect(200);
      }
    });

    it('cancels a separate pending order and restores stock', async () => {
      await request(baseUrl)
        .post('/wholesale/cart/items')
        .set('Authorization', `Bearer ${buyerBToken}`)
        .send({ productVariantId: wholesaleVariantId, quantity: 20 })
        .expect(201);
      const checkoutRes = await request(baseUrl)
        .post('/wholesale/orders')
        .set('Authorization', `Bearer ${buyerBToken}`)
        .send({ shippingAddress: SHIPPING_ADDRESS, paymentMethod: 'cod' })
        .expect(201);
      const cancelOrderId = (checkoutRes.body as EntityResponse<{ id: string }>).data.id;

      const before = await request(baseUrl)
        .get(`/inventory/variants/${wholesaleVariantId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const beforeAvailable = (before.body as EntityResponse<{ availableQuantity: number }>).data
        .availableQuantity;

      await request(baseUrl)
        .patch(`/wholesale/orders/${cancelOrderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'cancelled' })
        .expect(200);

      const after = await request(baseUrl)
        .get(`/inventory/variants/${wholesaleVariantId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const afterData = (
        after.body as EntityResponse<{ availableQuantity: number; totalSoldQuantity: number }>
      ).data;
      expect(afterData.availableQuantity).toBe(beforeAvailable + 20);
      expect(afterData.totalSoldQuantity).toBe(50); // voided, not counted as sold
    });
  });

  describe('RFQ → Quotation → Order', () => {
    let quoteRequestId: string;
    let quotationId: string;

    it('lets a buyer request a quote for a wholesale-eligible variant', async () => {
      const res = await request(baseUrl)
        .post('/wholesale/quote-requests')
        .set('Authorization', `Bearer ${buyerAToken}`)
        .send({
          productVariantId: wholesaleVariantId,
          requestedQuantity: 500,
          message: 'Need a bulk rate',
        })
        .expect(201);
      quoteRequestId = (res.body as EntityResponse<{ id: string; status: string }>).data.id;
      expect((res.body as EntityResponse<{ status: string }>).data.status).toBe('open');
    });

    it('rejects a non-owning vendor quoting on it', async () => {
      await request(baseUrl)
        .post(`/wholesale/quote-requests/${quoteRequestId}/quotations`)
        .set('Authorization', `Bearer ${vendorBToken}`)
        .send({ pricePerUnit: 65 })
        .expect(403);
    });

    it('lets the owning vendor respond with a quotation', async () => {
      const res = await request(baseUrl)
        .post(`/wholesale/quote-requests/${quoteRequestId}/quotations`)
        .set('Authorization', `Bearer ${vendorAToken}`)
        .send({ pricePerUnit: 60, quantity: 500, notes: 'Best price for this volume' })
        .expect(201);
      quotationId = (res.body as EntityResponse<{ id: string; status: string }>).data.id;
      expect((res.body as EntityResponse<{ status: string }>).data.status).toBe('pending');
    });

    it('rejects quoting again on an already-quoted request', async () => {
      await request(baseUrl)
        .post(`/wholesale/quote-requests/${quoteRequestId}/quotations`)
        .set('Authorization', `Bearer ${vendorAToken}`)
        .send({ pricePerUnit: 62 })
        .expect(400);
    });

    it("rejects a different buyer accepting someone else's quotation", async () => {
      await request(baseUrl)
        .post(`/wholesale/quotations/${quotationId}/accept`)
        .set('Authorization', `Bearer ${buyerBToken}`)
        .send({ shippingAddress: SHIPPING_ADDRESS, paymentMethod: 'cod' })
        .expect(403);
    });

    it('lets the requesting buyer accept the quotation, creating an order at the quoted price', async () => {
      const res = await request(baseUrl)
        .post(`/wholesale/quotations/${quotationId}/accept`)
        .set('Authorization', `Bearer ${buyerAToken}`)
        .send({ shippingAddress: SHIPPING_ADDRESS, paymentMethod: 'cod' })
        .expect(201);
      const order = (res.body as EntityResponse<{ subtotal: number; totalAmount: number }>).data;
      expect(order.subtotal).toBe(30_000); // 500 units at the quoted 60/unit
      expect(order.totalAmount).toBe(30_000);
    });

    it('rejects accepting the same quotation twice', async () => {
      await request(baseUrl)
        .post(`/wholesale/quotations/${quotationId}/accept`)
        .set('Authorization', `Bearer ${buyerAToken}`)
        .send({ shippingAddress: SHIPPING_ADDRESS, paymentMethod: 'cod' })
        .expect(400);
    });

    it('lazily expires a quotation past its validUntil and rejects accepting it', async () => {
      const requestRes = await request(baseUrl)
        .post('/wholesale/quote-requests')
        .set('Authorization', `Bearer ${buyerAToken}`)
        .send({ productVariantId: wholesaleVariantId, requestedQuantity: 100 })
        .expect(201);
      const requestId = (requestRes.body as EntityResponse<{ id: string }>).data.id;

      const quoteRes = await request(baseUrl)
        .post(`/wholesale/quote-requests/${requestId}/quotations`)
        .set('Authorization', `Bearer ${vendorAToken}`)
        .send({ pricePerUnit: 55, validUntil: '2020-01-01T00:00:00.000Z' })
        .expect(201);
      const expiredQuotationId = (quoteRes.body as EntityResponse<{ id: string }>).data.id;

      await request(baseUrl)
        .post(`/wholesale/quotations/${expiredQuotationId}/accept`)
        .set('Authorization', `Bearer ${buyerAToken}`)
        .send({ shippingAddress: SHIPPING_ADDRESS, paymentMethod: 'cod' })
        .expect(400);

      const getRes = await request(baseUrl)
        .get(`/wholesale/quotations/${expiredQuotationId}`)
        .set('Authorization', `Bearer ${buyerAToken}`)
        .expect(200);
      expect((getRes.body as EntityResponse<{ status: string }>).data.status).toBe('expired');
    });

    it('lets a buyer reject a quotation', async () => {
      const requestRes = await request(baseUrl)
        .post('/wholesale/quote-requests')
        .set('Authorization', `Bearer ${buyerAToken}`)
        .send({ productVariantId: wholesaleVariantId, requestedQuantity: 40 })
        .expect(201);
      const requestId = (requestRes.body as EntityResponse<{ id: string }>).data.id;

      const quoteRes = await request(baseUrl)
        .post(`/wholesale/quote-requests/${requestId}/quotations`)
        .set('Authorization', `Bearer ${vendorAToken}`)
        .send({ pricePerUnit: 95 })
        .expect(201);
      const rejectableQuotationId = (quoteRes.body as EntityResponse<{ id: string }>).data.id;

      const res = await request(baseUrl)
        .post(`/wholesale/quotations/${rejectableQuotationId}/reject`)
        .set('Authorization', `Bearer ${buyerAToken}`)
        .expect(201);
      expect((res.body as EntityResponse<{ status: string }>).data.status).toBe('rejected');
    });

    it('shows incoming RFQs to the owning vendor', async () => {
      const res = await request(baseUrl)
        .get('/wholesale/quote-requests/incoming')
        .set('Authorization', `Bearer ${vendorAToken}`)
        .expect(200);
      const requests = (res.body as EntityResponse<{ id: string }[]>).data;
      expect(requests.some((r) => r.id === quoteRequestId)).toBe(true);
    });
  });
});
