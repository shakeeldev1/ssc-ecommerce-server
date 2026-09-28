import request from 'supertest';
import { baseUrl, startTestServer, stopTestServer } from './utils/e2e-server';
import { loginAsSeedAdmin, registerAndVerifyStudent } from './utils/auth-helpers';

interface EntityResponse<T> {
  data: T;
}

async function getUserId(token: string): Promise<string> {
  const res = await request(baseUrl).get('/auth/me').set('Authorization', `Bearer ${token}`);
  return (res.body as EntityResponse<{ id: string }>).data.id;
}

describe('Phase 4 — Retail E-Commerce (e2e)', () => {
  let adminToken: string;
  let studentToken: string;
  let studentId: string;
  let otherStudentToken: string;

  let categoryId: string;
  let inStockVariantId: string;
  let outOfStockVariantId: string;
  let productId: string;

  beforeAll(async () => {
    await startTestServer();
    adminToken = await loginAsSeedAdmin();
    studentToken = await registerAndVerifyStudent(
      `phase4-${Date.now()}@example.com`,
      'P@ssw0rd123',
    );
    otherStudentToken = await registerAndVerifyStudent(
      `phase4-other-${Date.now()}@example.com`,
      'P@ssw0rd123',
    );
    studentId = await getUserId(studentToken);

    const categoryRes = await request(baseUrl)
      .post('/catalog/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Phase4-Category-${Date.now()}` })
      .expect(201);
    categoryId = (categoryRes.body as EntityResponse<{ id: string }>).data.id;

    const productRes = await request(baseUrl)
      .post('/catalog/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Phase4 Product ${Date.now()}`,
        categoryId,
        isStudentDiscountEligible: true,
      })
      .expect(201);
    productId = (productRes.body as EntityResponse<{ id: string }>).data.id;

    const inStockRes = await request(baseUrl)
      .post(`/catalog/products/${productId}/variants`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sku: `P4-INSTOCK-${Date.now()}`, price: 1000 })
      .expect(201);
    inStockVariantId = (inStockRes.body as EntityResponse<{ id: string }>).data.id;
    await request(baseUrl)
      .post(`/inventory/variants/${inStockVariantId}/restock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ quantity: 50 })
      .expect(201);

    const outOfStockRes = await request(baseUrl)
      .post(`/catalog/products/${productId}/variants`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ sku: `P4-OOS-${Date.now()}`, price: 500 })
      .expect(201);
    outOfStockVariantId = (outOfStockRes.body as EntityResponse<{ id: string }>).data.id;
    // Left at its default 0 available quantity on purpose.
  }, 30_000);

  afterAll(() => {
    stopTestServer();
  });

  describe('Cart', () => {
    it('adds an item and reports the correct subtotal', async () => {
      const res = await request(baseUrl)
        .post('/cart/items')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ productVariantId: inStockVariantId, quantity: 2 })
        .expect(201);

      const cart = (res.body as EntityResponse<{ subtotal: number; totalItems: number }>).data;
      expect(cart.subtotal).toBe(2000);
      expect(cart.totalItems).toBe(2);
    });

    it('increases quantity when the same variant is added again', async () => {
      const res = await request(baseUrl)
        .post('/cart/items')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ productVariantId: inStockVariantId, quantity: 1 })
        .expect(201);

      const cart = (res.body as EntityResponse<{ totalItems: number }>).data;
      expect(cart.totalItems).toBe(3);
    });

    it('sets an exact quantity via PATCH', async () => {
      const res = await request(baseUrl)
        .patch(`/cart/items/${inStockVariantId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ quantity: 2 })
        .expect(200);

      const cart = (res.body as EntityResponse<{ totalItems: number; subtotal: number }>).data;
      expect(cart.totalItems).toBe(2);
      expect(cart.subtotal).toBe(2000);
    });
  });

  describe('Wishlist', () => {
    it('adds, lists and removes a product', async () => {
      await request(baseUrl)
        .post('/wishlist/items')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ productId })
        .expect(201);

      const listRes = await request(baseUrl)
        .get('/wishlist')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);
      expect(
        (listRes.body as EntityResponse<{ productId: string }[]>).data.some(
          (i) => i.productId === productId,
        ),
      ).toBe(true);

      await request(baseUrl)
        .delete(`/wishlist/items/${productId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(204);
    });

    it('rejects adding the same product twice', async () => {
      await request(baseUrl)
        .post('/wishlist/items')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ productId })
        .expect(201);

      await request(baseUrl)
        .post('/wishlist/items')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ productId })
        .expect(409);
    });
  });

  describe('Coupons', () => {
    let percentCode: string;
    let studentOnlyCode: string;

    it('rejects coupon creation from a student', async () => {
      await request(baseUrl)
        .post('/coupons')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ code: `X-${Date.now()}`, type: 'percentage', value: 10 })
        .expect(403);
    });

    it('creates a percentage coupon as admin', async () => {
      percentCode = `SAVE10-${Date.now()}`;
      await request(baseUrl)
        .post('/coupons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: percentCode, type: 'percentage', value: 10 })
        .expect(201);
    });

    it('creates a student-only fixed coupon as admin', async () => {
      studentOnlyCode = `STUDENTFIXED-${Date.now()}`;
      await request(baseUrl)
        .post('/coupons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: studentOnlyCode, type: 'fixed', value: 100, studentOnly: true })
        .expect(201);
    });

    it('validates a percentage coupon against the current cart', async () => {
      const res = await request(baseUrl)
        .post('/coupons/validate')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ code: percentCode })
        .expect(201);

      const evaluation = (res.body as EntityResponse<{ discountAmount: number }>).data;
      expect(evaluation.discountAmount).toBe(200); // 10% of the 2000 subtotal from the Cart block
    });

    it('rejects an unknown coupon code', async () => {
      await request(baseUrl)
        .post('/coupons/validate')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ code: 'DOES-NOT-EXIST' })
        .expect(400);
    });
  });

  describe('Checkout & Orders', () => {
    let orderId: string;

    it('checks out the cart into an order and applies the coupon', async () => {
      const couponCode = `CHECKOUT10-${Date.now()}`;
      await request(baseUrl)
        .post('/coupons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ code: couponCode, type: 'percentage', value: 10 })
        .expect(201);

      const res = await request(baseUrl)
        .post('/orders')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          shippingAddress: {
            fullName: 'Test Student',
            phone: '03001234567',
            line1: '123 Main Street',
            city: 'Lahore',
            state: 'Punjab',
          },
          paymentMethod: 'cod',
          couponCode,
        })
        .expect(201);

      const order = (
        res.body as EntityResponse<{
          id: string;
          status: string;
          subtotal: number;
          discountAmount: number;
          totalAmount: number;
          items: { quantity: number }[];
        }>
      ).data;
      orderId = order.id;

      expect(order.status).toBe('pending');
      expect(order.subtotal).toBe(2000);
      expect(order.discountAmount).toBe(200);
      expect(order.totalAmount).toBe(1800);
      expect(order.items).toHaveLength(1);
    });

    it('cleared the cart after checkout', async () => {
      const res = await request(baseUrl)
        .get('/cart')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);
      expect((res.body as EntityResponse<{ items: unknown[] }>).data.items).toHaveLength(0);
    });

    it('decremented available stock and recorded a sale', async () => {
      const res = await request(baseUrl)
        .get(`/inventory/variants/${inStockVariantId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const inventory = (
        res.body as EntityResponse<{ availableQuantity: number; totalSoldQuantity: number }>
      ).data;
      expect(inventory.availableQuantity).toBe(48);
      expect(inventory.totalSoldQuantity).toBe(2);
    });

    it('rejects checkout with an empty cart', async () => {
      await request(baseUrl)
        .post('/orders')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          shippingAddress: {
            fullName: 'Test Student',
            phone: '03001234567',
            line1: '123 Main Street',
            city: 'Lahore',
            state: 'Punjab',
          },
          paymentMethod: 'cod',
        })
        .expect(400);
    });

    it('rolls back an earlier line when a later line is out of stock', async () => {
      await request(baseUrl)
        .post('/cart/items')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ productVariantId: inStockVariantId, quantity: 1 })
        .expect(201);
      await request(baseUrl)
        .post('/cart/items')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ productVariantId: outOfStockVariantId, quantity: 1 })
        .expect(201);

      await request(baseUrl)
        .post('/orders')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          shippingAddress: {
            fullName: 'Test Student',
            phone: '03001234567',
            line1: '123 Main Street',
            city: 'Lahore',
            state: 'Punjab',
          },
          paymentMethod: 'cod',
        })
        .expect(400);

      const res = await request(baseUrl)
        .get(`/inventory/variants/${inStockVariantId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const inventory = (
        res.body as EntityResponse<{ availableQuantity: number; totalSoldQuantity: number }>
      ).data;
      // Unchanged from the previous successful checkout: the in-stock line
      // was reserved+consumed then rolled back when the second line failed.
      expect(inventory.availableQuantity).toBe(48);
      expect(inventory.totalSoldQuantity).toBe(2);

      // Clean up the still-present cart line for later tests.
      await request(baseUrl)
        .delete('/cart')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(204);
    });

    it("rejects reading another user's order", async () => {
      await request(baseUrl)
        .get(`/orders/${orderId}`)
        .set('Authorization', `Bearer ${otherStudentToken}`)
        .expect(403);
    });

    it('rejects an invalid status transition', async () => {
      await request(baseUrl)
        .patch(`/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'shipped' })
        .expect(400);
    });

    it('rejects a status transition from a student', async () => {
      await request(baseUrl)
        .patch(`/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ status: 'confirmed' })
        .expect(403);
    });

    it('walks an order through confirmed -> processing -> shipped -> delivered', async () => {
      for (const status of ['confirmed', 'processing', 'shipped', 'delivered']) {
        const res = await request(baseUrl)
          .patch(`/orders/${orderId}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status })
          .expect(200);
        expect((res.body as EntityResponse<{ status: string }>).data.status).toBe(status);
      }
    });

    it('lists the order for the admin across all users', async () => {
      const res = await request(baseUrl)
        .get('/orders/admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const result = (res.body as EntityResponse<{ items: { id: string }[] }>).data;
      expect(result.items.some((o) => o.id === orderId)).toBe(true);
    });

    it('returns an invoice for the order', async () => {
      const res = await request(baseUrl)
        .get(`/orders/${orderId}/invoice`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);
      expect((res.body as EntityResponse<{ invoiceNumber: string }>).data.invoiceNumber).toMatch(
        /^INV-/,
      );
    });
  });

  describe('Order cancellation restores stock', () => {
    it('cancels a pending order and restocks its items', async () => {
      await request(baseUrl)
        .post('/cart/items')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ productVariantId: inStockVariantId, quantity: 3 })
        .expect(201);

      const checkoutRes = await request(baseUrl)
        .post('/orders')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          shippingAddress: {
            fullName: 'Test Student',
            phone: '03001234567',
            line1: '123 Main Street',
            city: 'Lahore',
            state: 'Punjab',
          },
          paymentMethod: 'cod',
        })
        .expect(201);
      const cancelOrderId = (checkoutRes.body as EntityResponse<{ id: string }>).data.id;

      const beforeCancel = await request(baseUrl)
        .get(`/inventory/variants/${inStockVariantId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(
        (beforeCancel.body as EntityResponse<{ availableQuantity: number }>).data.availableQuantity,
      ).toBe(45);

      await request(baseUrl)
        .patch(`/orders/${cancelOrderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'cancelled' })
        .expect(200);

      const afterCancel = await request(baseUrl)
        .get(`/inventory/variants/${inStockVariantId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const inventory = (
        afterCancel.body as EntityResponse<{
          availableQuantity: number;
          totalSoldQuantity: number;
          totalReturnedQuantity: number;
        }>
      ).data;
      expect(inventory.availableQuantity).toBe(48);
      // A cancellation voids the sale outright (nothing was ever delivered),
      // so it reverses totalSoldQuantity rather than counting as a return.
      expect(inventory.totalSoldQuantity).toBe(2);
      expect(inventory.totalReturnedQuantity).toBe(0);
    });
  });

  describe('Reviews', () => {
    it('rejects reviewing a product with no delivered order', async () => {
      await request(baseUrl)
        .post(`/catalog/products/${productId}/reviews`)
        .set('Authorization', `Bearer ${otherStudentToken}`)
        .send({ rating: 5, comment: 'Great!' })
        .expect(400);
    });

    it('lets a buyer with a delivered order submit a review (goes to moderation)', async () => {
      const res = await request(baseUrl)
        .post(`/catalog/products/${productId}/reviews`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ rating: 4, comment: 'Solid product' })
        .expect(201);
      expect((res.body as EntityResponse<{ status: string }>).data.status).toBe('pending');
    });

    it('rejects a second review from the same buyer for the same product', async () => {
      await request(baseUrl)
        .post(`/catalog/products/${productId}/reviews`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ rating: 3 })
        .expect(409);
    });

    it('does not show a pending review publicly', async () => {
      const res = await request(baseUrl).get(`/catalog/products/${productId}/reviews`).expect(200);
      expect((res.body as EntityResponse<unknown[]>).data).toHaveLength(0);
    });

    it('lists the pending review for admin moderation and approves it', async () => {
      const pendingRes = await request(baseUrl)
        .get('/reviews/pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const pending = (pendingRes.body as EntityResponse<{ id: string; userId: string }[]>).data;
      const review = pending.find((r) => r.userId === studentId);
      expect(review).toBeDefined();

      await request(baseUrl)
        .patch(`/reviews/${review!.id}/moderate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'approved' })
        .expect(200);
    });

    it('shows the approved review publicly', async () => {
      const res = await request(baseUrl).get(`/catalog/products/${productId}/reviews`).expect(200);
      const reviews = (res.body as EntityResponse<{ status: string }[]>).data;
      expect(reviews.some((r) => r.status === 'approved')).toBe(true);
    });
  });
});
