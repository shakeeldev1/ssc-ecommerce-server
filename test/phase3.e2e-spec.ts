import request from 'supertest';
import { baseUrl, startTestServer, stopTestServer } from './utils/e2e-server';
import { loginAsSeedAdmin, registerAndVerifyStudent } from './utils/auth-helpers';

interface EntityResponse<T> {
  data: T;
}

describe('Phase 3 — Catalog & Inventory (e2e)', () => {
  let adminToken: string;
  let studentToken: string;
  let categoryId: string;
  let brandId: string;
  let productId: string;
  let variantId: string;

  beforeAll(async () => {
    await startTestServer();
    adminToken = await loginAsSeedAdmin();
    studentToken = await registerAndVerifyStudent(
      `phase3-${Date.now()}@example.com`,
      'P@ssw0rd123',
    );
  }, 30_000);

  afterAll(() => {
    stopTestServer();
  });

  describe('Brands & Categories', () => {
    it('rejects brand/category creation from a student', async () => {
      await request(baseUrl)
        .post('/catalog/brands')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ name: `Brand-${Date.now()}` })
        .expect(403);
    });

    it('creates a brand and a category as admin', async () => {
      const brandRes = await request(baseUrl)
        .post('/catalog/brands')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `Nike-${Date.now()}` })
        .expect(201);
      brandId = (brandRes.body as EntityResponse<{ id: string }>).data.id;

      const categoryRes = await request(baseUrl)
        .post('/catalog/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `Footwear-${Date.now()}` })
        .expect(201);
      categoryId = (categoryRes.body as EntityResponse<{ id: string; slug: string }>).data.id;

      expect(brandId).toBeDefined();
      expect(categoryId).toBeDefined();
    });

    it('lists brands and categories publicly', async () => {
      const brands = await request(baseUrl).get('/catalog/brands').expect(200);
      expect(
        (brands.body as EntityResponse<{ id: string }[]>).data.some((b) => b.id === brandId),
      ).toBe(true);

      const categories = await request(baseUrl).get('/catalog/categories').expect(200);
      expect(
        (categories.body as EntityResponse<{ id: string }[]>).data.some((c) => c.id === categoryId),
      ).toBe(true);
    });

    it('generates unique slugs for categories with the same name', async () => {
      const name = `Duplicate-${Date.now()}`;
      const first = await request(baseUrl)
        .post('/catalog/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name })
        .expect(201);
      const second = await request(baseUrl)
        .post('/catalog/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name })
        .expect(201);

      const firstSlug = (first.body as EntityResponse<{ slug: string }>).data.slug;
      const secondSlug = (second.body as EntityResponse<{ slug: string }>).data.slug;
      expect(firstSlug).not.toBe(secondSlug);
    });
  });

  describe('Products & Variants', () => {
    it('creates a product with a student-discount flag', async () => {
      const res = await request(baseUrl)
        .post('/catalog/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: `Classic Sneaker ${Date.now()}`,
          description: 'A comfortable everyday sneaker',
          categoryId,
          brandId,
          isStudentDiscountEligible: true,
          specifications: { Material: 'Canvas' },
        })
        .expect(201);

      const product = (res.body as EntityResponse<{ id: string; slug: string }>).data;
      productId = product.id;
      expect(product.slug).toBeDefined();
    });

    it('adds a variant and auto-creates its inventory record', async () => {
      const res = await request(baseUrl)
        .post(`/catalog/products/${productId}/variants`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          sku: `SNEAKER-RED-M-${Date.now()}`,
          attributes: { color: 'Red', size: 'M' },
          price: 2999,
        })
        .expect(201);

      const variant = (res.body as EntityResponse<{ id: string; price: number }>).data;
      variantId = variant.id;
      expect(variant.price).toBe(2999);

      const inventoryRes = await request(baseUrl)
        .get(`/inventory/variants/${variantId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const inventory = (inventoryRes.body as EntityResponse<{ availableQuantity: number }>).data;
      expect(inventory.availableQuantity).toBe(0);
    });

    it('rejects a variant update aimed at the wrong product', async () => {
      const otherProductRes = await request(baseUrl)
        .post('/catalog/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `Other Product ${Date.now()}`, categoryId })
        .expect(201);
      const otherProductId = (otherProductRes.body as EntityResponse<{ id: string }>).data.id;

      await request(baseUrl)
        .patch(`/catalog/products/${otherProductId}/variants/${variantId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ price: 1 })
        .expect(403);
    });

    it('lists and filters products publicly, without needing auth', async () => {
      const res = await request(baseUrl)
        .get(`/catalog/products?isStudentDiscountEligible=true&categoryId=${categoryId}`)
        .expect(200);

      const result = (res.body as EntityResponse<{ items: { id: string }[]; total: number }>).data;
      expect(result.items.some((p) => p.id === productId)).toBe(true);
    });

    it('gets a product with its variants populated', async () => {
      const res = await request(baseUrl).get(`/catalog/products/${productId}`).expect(200);
      const product = (res.body as EntityResponse<{ variants: { id: string }[] }>).data;
      expect(product.variants.some((v) => v.id === variantId)).toBe(true);
    });

    it('uploads a product image (fails cleanly, Cloudinary not configured in tests)', async () => {
      await request(baseUrl)
        .post(`/catalog/products/${productId}/images`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('image', Buffer.from('fake-image-bytes'), {
          filename: 'shoe.png',
          contentType: 'image/png',
        })
        .expect(503);
    });
  });

  describe('Inventory operations', () => {
    it('restocks and reads back the adjustment history', async () => {
      const restockRes = await request(baseUrl)
        .post(`/inventory/variants/${variantId}/restock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ quantity: 100, reason: 'Initial stock' })
        .expect(201);
      expect(
        (restockRes.body as EntityResponse<{ availableQuantity: number }>).data.availableQuantity,
      ).toBe(100);

      const historyRes = await request(baseUrl)
        .get(`/inventory/variants/${variantId}/adjustments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const history = (historyRes.body as EntityResponse<{ type: string }[]>).data;
      expect(history.some((a) => a.type === 'restock')).toBe(true);
    });

    it('marks stock as damaged', async () => {
      const res = await request(baseUrl)
        .post(`/inventory/variants/${variantId}/damage`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ quantity: 5, reason: 'Water damage' })
        .expect(201);

      const inventory = (
        res.body as EntityResponse<{ availableQuantity: number; damagedQuantity: number }>
      ).data;
      expect(inventory.availableQuantity).toBe(95);
      expect(inventory.damagedQuantity).toBe(5);
    });

    it('rejects marking more stock as damaged than is available', async () => {
      await request(baseUrl)
        .post(`/inventory/variants/${variantId}/damage`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ quantity: 999999 })
        .expect(400);
    });

    it('records a restockable return', async () => {
      const res = await request(baseUrl)
        .post(`/inventory/variants/${variantId}/return`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ quantity: 2, restock: true })
        .expect(201);

      const inventory = (
        res.body as EntityResponse<{ availableQuantity: number; totalReturnedQuantity: number }>
      ).data;
      expect(inventory.availableQuantity).toBe(97);
      expect(inventory.totalReturnedQuantity).toBe(2);
    });

    it('applies a manual correction', async () => {
      const res = await request(baseUrl)
        .post(`/inventory/variants/${variantId}/adjust`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ quantityChange: -7, reason: 'Stock-take correction' })
        .expect(201);

      expect(
        (res.body as EntityResponse<{ availableQuantity: number }>).data.availableQuantity,
      ).toBe(90);
    });

    it('appears in the low-stock report once below its threshold', async () => {
      await request(baseUrl)
        .post(`/inventory/variants/${variantId}/adjust`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ quantityChange: -86, reason: 'Simulate depletion for low-stock test' })
        .expect(201);

      const res = await request(baseUrl)
        .get('/inventory/low-stock')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const lowStock = (res.body as EntityResponse<{ productVariantId: string }[]>).data;
      expect(lowStock.some((i) => i.productVariantId === variantId)).toBe(true);
    });

    it('restock adds to the running available balance', async () => {
      // Reserve/release/consume have no HTTP endpoint yet — they're internal
      // InventoryService methods Phase 4's cart/checkout will call directly.
      const res = await request(baseUrl)
        .post(`/inventory/variants/${variantId}/restock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ quantity: 10 })
        .expect(201);

      expect(
        (res.body as EntityResponse<{ availableQuantity: number }>).data.availableQuantity,
      ).toBe(14);
    });
  });
});
