/**
 * Seeds sample catalogue + order activity for the test users so the dashboards
 * show populated stat cards and charts instead of zeros:
 *   - vendor.test@ssc.local    → owns a catalogue (active + draft) + incoming RFQs
 *   - student.test@ssc.local   → orders across every status + a few cart items
 *   - individual.test@ssc.local→ a handful of orders
 *
 * Idempotent: if the test vendor already owns products, it assumes the sample
 * data exists and exits without duplicating. Run AFTER seed-test-users.ts:
 *   npx ts-node -r tsconfig-paths/register scripts/seed-sample-data.ts
 */
import 'reflect-metadata';
import dataSource from '@/database/data-source';
import { User } from '@/modules/users/entities/user.entity';
import { Vendor } from '@/modules/vendors/entities/vendor.entity';
import { Category } from '@/modules/catalog/entities/category.entity';
import { Product } from '@/modules/catalog/entities/product.entity';
import { ProductVariant } from '@/modules/catalog/entities/product-variant.entity';
import { CartItem } from '@/modules/cart/entities/cart-item.entity';
import { Order } from '@/modules/orders/entities/order.entity';
import { OrderItem } from '@/modules/orders/entities/order-item.entity';
import { OrderStatus } from '@/modules/orders/enums/order-status.enum';
import { PaymentMethod } from '@/modules/orders/enums/payment-method.enum';
import { PaymentStatus } from '@/modules/orders/enums/payment-status.enum';
import { QuoteRequest } from '@/modules/wholesale/entities/quote-request.entity';
import { QuoteRequestStatus } from '@/modules/wholesale/enums/quote-request-status.enum';

const SHIPPING = {
  fullName: 'Ali Hassan',
  phone: '+923009876500',
  line1: 'House 45, Block C, Model Town',
  city: 'Lahore',
  state: 'Punjab',
  postalCode: '54000',
  country: 'Pakistan',
};

async function main(): Promise<void> {
  await dataSource.initialize();

  const users = dataSource.getRepository(User);
  const vendors = dataSource.getRepository(Vendor);
  const categories = dataSource.getRepository(Category);
  const products = dataSource.getRepository(Product);
  const variants = dataSource.getRepository(ProductVariant);
  const cartItems = dataSource.getRepository(CartItem);
  const orders = dataSource.getRepository(Order);
  const orderItems = dataSource.getRepository(OrderItem);
  const quoteRequests = dataSource.getRepository(QuoteRequest);

  const vendorUser = await users.findOne({ where: { email: 'vendor.test@ssc.local' } });
  const studentUser = await users.findOne({ where: { email: 'student.test@ssc.local' } });
  const individualUser = await users.findOne({ where: { email: 'individual.test@ssc.local' } });
  if (!vendorUser || !studentUser || !individualUser) {
    throw new Error('Test users not found — run scripts/seed-test-users.ts first.');
  }
  const vendor = await vendors.findOne({ where: { userId: vendorUser.id } });
  if (!vendor) {
    throw new Error('Test vendor profile not found — run scripts/seed-test-users.ts first.');
  }

  const already = await products.count({ where: { vendorId: vendor.id } });
  if (already > 0) {
    console.log(`• Vendor already owns ${already} products — sample data looks seeded. Skipping.`);
    await dataSource.destroy();
    return;
  }

  // Category (reuse by slug or create).
  let category = await categories.findOne({ where: { slug: 'school-supplies' } });
  if (!category) {
    category = await categories.save(
      categories.create({ name: 'School Supplies', slug: 'school-supplies', isActive: true }),
    );
  }

  // Catalogue: 4 active + 2 draft, each with one variant.
  const catalogue = [
    { name: 'Classic Notebook A4 (5-pack)', price: 650, active: true, wholesale: true, studentEligible: true },
    { name: 'Gel Pens (Set of 10)', price: 450, active: true, wholesale: true, studentEligible: true },
    { name: 'School Backpack 20L', price: 2800, active: true, wholesale: true, studentEligible: false },
    { name: 'Geometry Box Deluxe', price: 550, active: true, wholesale: false, studentEligible: true },
    { name: 'Watercolor Paint Set', price: 900, active: false, wholesale: false, studentEligible: true },
    { name: 'Scientific Calculator FX-82', price: 1950, active: false, wholesale: false, studentEligible: false },
  ];

  const createdVariants: Array<{ variant: ProductVariant; name: string }> = [];
  let sku = 1;
  for (const item of catalogue) {
    const slug = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const product = await products.save(
      products.create({
        name: item.name,
        slug: `${slug}-tst`,
        description: `${item.name} — sample catalogue item for dashboard demo.`,
        categoryId: category.id,
        vendorId: vendor.id,
        isStudentDiscountEligible: item.studentEligible,
        isActive: item.active,
      }),
    );
    const variant = await variants.save(
      variants.create({
        productId: product.id,
        sku: `TST-SKU-${String(sku++).padStart(3, '0')}`,
        attributes: {},
        price: item.price,
        isActive: item.active,
        isWholesaleEligible: item.wholesale,
        wholesaleMoq: item.wholesale ? 50 : null,
      }),
    );
    createdVariants.push({ variant, name: item.name });
  }
  const activeCount = catalogue.filter((c) => c.active).length;
  console.log(`✓ vendor catalogue: ${catalogue.length} products (${activeCount} active, ${catalogue.length - activeCount} draft)`);

  // Incoming RFQs against the vendor's first three variants.
  const rfqSpecs = [
    { idx: 0, qty: 100, message: 'Need 100 notebooks for new term.' },
    { idx: 1, qty: 200, message: 'Bulk gel pens for school store.' },
    { idx: 2, qty: 60, message: 'Backpacks for grade 6 intake.' },
  ];
  for (const r of rfqSpecs) {
    await quoteRequests.save(
      quoteRequests.create({
        buyerUserId: individualUser.id,
        productVariantId: createdVariants[r.idx].variant.id,
        requestedQuantity: r.qty,
        message: r.message,
        status: QuoteRequestStatus.OPEN,
      }),
    );
  }
  console.log(`✓ incoming RFQs: ${rfqSpecs.length} open`);

  // Cart items for the student (totalItems = 3).
  await cartItems.save([
    cartItems.create({ userId: studentUser.id, productVariantId: createdVariants[0].variant.id, quantity: 2 }),
    cartItems.create({ userId: studentUser.id, productVariantId: createdVariants[3].variant.id, quantity: 1 }),
  ]);
  console.log('✓ student cart: 2 lines (3 items)');

  // Orders — spread across statuses so the order-status chart is full.
  let seq = 1;
  const stamp = Date.now().toString(36).toUpperCase();
  const makeOrder = async (
    userId: string,
    status: OrderStatus,
    lines: Array<{ idx: number; qty: number }>,
  ): Promise<void> => {
    const paid = status === OrderStatus.DELIVERED || status === OrderStatus.SHIPPED;
    const itemsData = lines.map((l) => {
      const { variant, name } = createdVariants[l.idx];
      return {
        productVariantId: variant.id,
        productName: name,
        sku: variant.sku,
        variantAttributes: {},
        unitPrice: variant.price,
        quantity: l.qty,
        lineTotal: variant.price * l.qty,
      };
    });
    const subtotal = itemsData.reduce((sum, it) => sum + it.lineTotal, 0);
    const n = String(seq++).padStart(3, '0');
    const order = await orders.save(
      orders.create({
        orderNumber: `TST-${stamp}-${n}`,
        invoiceNumber: `TST-INV-${stamp}-${n}`,
        userId,
        status,
        paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
        paymentStatus: paid ? PaymentStatus.PAID : PaymentStatus.UNPAID,
        shippingAddress: SHIPPING,
        subtotal,
        discountAmount: 0,
        cardDiscountAmount: 0,
        cardDiscountPercent: null,
        cardHolderType: null,
        shippingAmount: 0,
        taxAmount: 0,
        taxBreakdown: null,
        totalAmount: subtotal,
        couponCode: null,
        campaignCode: null,
      }),
    );
    await orderItems.save(itemsData.map((it) => orderItems.create({ orderId: order.id, ...it })));
  };

  // Student: every status represented.
  await makeOrder(studentUser.id, OrderStatus.PENDING, [{ idx: 1, qty: 1 }]);
  await makeOrder(studentUser.id, OrderStatus.CONFIRMED, [{ idx: 0, qty: 2 }]);
  await makeOrder(studentUser.id, OrderStatus.PROCESSING, [{ idx: 2, qty: 1 }]);
  await makeOrder(studentUser.id, OrderStatus.SHIPPED, [{ idx: 3, qty: 3 }]);
  await makeOrder(studentUser.id, OrderStatus.DELIVERED, [{ idx: 0, qty: 1 }]);
  await makeOrder(studentUser.id, OrderStatus.DELIVERED, [{ idx: 1, qty: 2 }, { idx: 3, qty: 1 }]);
  console.log('✓ student orders: 6 (pending, confirmed, processing, shipped, delivered×2)');

  // Individual: a few orders.
  await makeOrder(individualUser.id, OrderStatus.DELIVERED, [{ idx: 2, qty: 1 }]);
  await makeOrder(individualUser.id, OrderStatus.DELIVERED, [{ idx: 0, qty: 4 }]);
  await makeOrder(individualUser.id, OrderStatus.SHIPPED, [{ idx: 1, qty: 1 }]);
  console.log('✓ individual orders: 3 (delivered×2, shipped)');

  await dataSource.destroy();
  console.log('\nDone. Reload the vendor and customer dashboards to see populated stats & charts.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
