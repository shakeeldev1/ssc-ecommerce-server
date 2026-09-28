import { BadRequestException } from '@nestjs/common';
import { FindOperator } from 'typeorm';
import { AdjustmentType } from '@/modules/inventory/enums/adjustment-type.enum';
import { ReservationStatus } from '@/modules/inventory/enums/reservation-status.enum';
import { Inventory } from '@/modules/inventory/entities/inventory.entity';
import { InventoryAdjustment } from '@/modules/inventory/entities/inventory-adjustment.entity';
import { StockReservation } from '@/modules/inventory/entities/stock-reservation.entity';
import { InventoryService } from '@/modules/inventory/inventory.service';

type WhereClause<T> = Partial<Record<keyof T, unknown>>;

function matchesWhere<T extends object>(row: T, where: WhereClause<T>): boolean {
  return Object.entries(where).every(([key, expected]) => {
    const actual = (row as Record<string, unknown>)[key];
    if (expected instanceof FindOperator) {
      if (expected.type === 'lessThan') {
        return (actual as Date) < (expected.value as Date);
      }
      throw new Error(`Unsupported FindOperator type in test fake: ${expected.type}`);
    }
    return actual === expected;
  });
}

/** Minimal in-memory stand-in for a TypeORM Repository, covering only what InventoryService calls. */
function createFakeRepository<T extends { id: string }>() {
  const rows = new Map<string, T>();
  let nextId = 1;

  const repo = {
    rows,
    create: (partial: Partial<T>): T => ({ id: `id-${nextId++}`, ...partial }) as T,
    save: (entity: T): Promise<T> => {
      rows.set(entity.id, entity);
      return Promise.resolve(entity);
    },
    findOne: ({ where }: { where: WhereClause<T> }): Promise<T | null> => {
      const match = [...rows.values()].find((row) => matchesWhere(row, where));
      return Promise.resolve(match ?? null);
    },
    findOneOrFail: async ({ where }: { where: WhereClause<T> }): Promise<T> => {
      const result = await repo.findOne({ where });
      if (!result) throw new Error('Not found');
      return result;
    },
    find: ({ where }: { where?: WhereClause<T> } = {}): Promise<T[]> => {
      const results = where
        ? [...rows.values()].filter((row) => matchesWhere(row, where))
        : [...rows.values()];
      return Promise.resolve(results);
    },
    update: (id: string, partial: Partial<T>): Promise<void> => {
      const existing = rows.get(id);
      if (existing) rows.set(id, { ...existing, ...partial });
      return Promise.resolve();
    },
  };

  return repo;
}

describe('InventoryService', () => {
  let inventoryRepo: ReturnType<typeof createFakeRepository<Inventory>>;
  let adjustmentsRepo: ReturnType<typeof createFakeRepository<InventoryAdjustment>>;
  let reservationsRepo: ReturnType<typeof createFakeRepository<StockReservation>>;
  let service: InventoryService;
  const variantId = 'variant-1';

  beforeEach(async () => {
    inventoryRepo = createFakeRepository<Inventory>();
    adjustmentsRepo = createFakeRepository<InventoryAdjustment>();
    reservationsRepo = createFakeRepository<StockReservation>();

    service = new InventoryService(
      inventoryRepo as never,
      adjustmentsRepo as never,
      reservationsRepo as never,
    );

    // The real entity's DB column defaults (0 for these counters) only get
    // filled in via Postgres's INSERT ... RETURNING on a real save — this
    // in-memory fake doesn't replicate that, so seed them explicitly here.
    const inventory = await service.initializeForVariant(variantId);
    await inventoryRepo.update(inventory.id, {
      availableQuantity: 20,
      reservedQuantity: 0,
      damagedQuantity: 0,
      totalSoldQuantity: 0,
      totalReturnedQuantity: 0,
      lowStockThreshold: 5,
    });
  });

  it('reserve() moves stock from available to reserved and logs the adjustment', async () => {
    const reservation = await service.reserve(variantId, 5, 15);

    expect(reservation.status).toBe(ReservationStatus.ACTIVE);
    expect(reservation.quantity).toBe(5);

    const inventory = await service.getByVariantId(variantId);
    expect(inventory.availableQuantity).toBe(15);
    expect(inventory.reservedQuantity).toBe(5);

    const adjustments = [...adjustmentsRepo.rows.values()];
    expect(adjustments.some((a) => a.type === AdjustmentType.RESERVE)).toBe(true);
  });

  it('reserve() rejects when there is not enough available stock', async () => {
    await expect(service.reserve(variantId, 999)).rejects.toThrow(BadRequestException);
  });

  it('releaseReservation() returns stock to available', async () => {
    const reservation = await service.reserve(variantId, 5, 15);
    await service.releaseReservation(reservation.id);

    const inventory = await service.getByVariantId(variantId);
    expect(inventory.availableQuantity).toBe(20);
    expect(inventory.reservedQuantity).toBe(0);

    const updated = reservationsRepo.rows.get(reservation.id);
    expect(updated?.status).toBe(ReservationStatus.RELEASED);
  });

  it('consumeReservation() converts a reservation into a recorded sale', async () => {
    const reservation = await service.reserve(variantId, 5, 15);
    await service.consumeReservation(reservation.id);

    const inventory = await service.getByVariantId(variantId);
    expect(inventory.reservedQuantity).toBe(0);
    expect(inventory.totalSoldQuantity).toBe(5);

    const updated = reservationsRepo.rows.get(reservation.id);
    expect(updated?.status).toBe(ReservationStatus.CONSUMED);
  });

  it('lazily expires a stale reservation back to available stock on the next read', async () => {
    // holdMinutes negative => already expired at creation time
    const reservation = await service.reserve(variantId, 5, -1);

    const inventory = await service.getByVariantId(variantId);
    expect(inventory.availableQuantity).toBe(20);
    expect(inventory.reservedQuantity).toBe(0);

    const updated = reservationsRepo.rows.get(reservation.id);
    expect(updated?.status).toBe(ReservationStatus.EXPIRED);
  });

  it('voidSale() reverses a completed sale entirely, unlike recordReturn()', async () => {
    const reservation = await service.reserve(variantId, 5, 15);
    await service.consumeReservation(reservation.id);

    await service.voidSale(variantId, 5, 'actor-1', 'checkout rolled back');

    const inventory = await service.getByVariantId(variantId);
    expect(inventory.availableQuantity).toBe(20);
    expect(inventory.totalSoldQuantity).toBe(0);
    expect(inventory.totalReturnedQuantity).toBe(0);
  });
});
