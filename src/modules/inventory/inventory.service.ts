import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { AdjustmentType } from '@/modules/inventory/enums/adjustment-type.enum';
import { ReservationStatus } from '@/modules/inventory/enums/reservation-status.enum';
import { Inventory } from '@/modules/inventory/entities/inventory.entity';
import { InventoryAdjustment } from '@/modules/inventory/entities/inventory-adjustment.entity';
import { StockReservation } from '@/modules/inventory/entities/stock-reservation.entity';

const DEFAULT_RESERVATION_HOLD_MINUTES = 15;

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,
    @InjectRepository(InventoryAdjustment)
    private readonly adjustmentsRepository: Repository<InventoryAdjustment>,
    @InjectRepository(StockReservation)
    private readonly reservationsRepository: Repository<StockReservation>,
  ) {}

  async initializeForVariant(productVariantId: string): Promise<Inventory> {
    return this.inventoryRepository.save(this.inventoryRepository.create({ productVariantId }));
  }

  async getByVariantId(productVariantId: string): Promise<Inventory> {
    await this.expireStaleReservations(productVariantId);
    const inventory = await this.inventoryRepository.findOne({ where: { productVariantId } });
    if (!inventory) {
      throw new NotFoundException('No inventory record for this variant');
    }
    return inventory;
  }

  async listLowStock(): Promise<Inventory[]> {
    // Load variant + product so the admin report can show names/SKUs, not just ids.
    const inventories = await this.inventoryRepository.find({
      relations: { productVariant: { product: true } },
    });
    return inventories.filter((inv) => inv.availableQuantity <= inv.lowStockThreshold);
  }

  async listAdjustments(productVariantId: string): Promise<InventoryAdjustment[]> {
    const inventory = await this.getByVariantId(productVariantId);
    return this.adjustmentsRepository.find({
      where: { inventoryId: inventory.id },
      order: { createdAt: 'DESC' },
    });
  }

  async restock(
    productVariantId: string,
    quantity: number,
    actorUserId: string,
    reason?: string,
  ): Promise<Inventory> {
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be positive');
    }

    const inventory = await this.getByVariantId(productVariantId);
    await this.inventoryRepository.update(inventory.id, {
      availableQuantity: inventory.availableQuantity + quantity,
    });
    await this.recordAdjustment(
      inventory.id,
      AdjustmentType.RESTOCK,
      quantity,
      actorUserId,
      reason,
    );

    return this.getByVariantId(productVariantId);
  }

  async markDamaged(
    productVariantId: string,
    quantity: number,
    actorUserId: string,
    reason?: string,
  ): Promise<Inventory> {
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be positive');
    }

    const inventory = await this.getByVariantId(productVariantId);
    if (inventory.availableQuantity < quantity) {
      throw new BadRequestException('Not enough available stock to mark as damaged');
    }

    await this.inventoryRepository.update(inventory.id, {
      availableQuantity: inventory.availableQuantity - quantity,
      damagedQuantity: inventory.damagedQuantity + quantity,
    });
    await this.recordAdjustment(
      inventory.id,
      AdjustmentType.DAMAGE,
      -quantity,
      actorUserId,
      reason,
    );

    return this.getByVariantId(productVariantId);
  }

  /** Records a returned item; `restock: true` puts it back in available stock, otherwise it's written off (mark it damaged separately if needed). */
  async recordReturn(
    productVariantId: string,
    quantity: number,
    restock: boolean,
    actorUserId: string,
    reason?: string,
  ): Promise<Inventory> {
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be positive');
    }

    const inventory = await this.getByVariantId(productVariantId);
    await this.inventoryRepository.update(inventory.id, {
      availableQuantity: restock
        ? inventory.availableQuantity + quantity
        : inventory.availableQuantity,
      totalReturnedQuantity: inventory.totalReturnedQuantity + quantity,
    });
    await this.recordAdjustment(
      inventory.id,
      AdjustmentType.RETURN,
      restock ? quantity : 0,
      actorUserId,
      reason,
    );

    return this.getByVariantId(productVariantId);
  }

  /** Arbitrary correction to available stock (e.g. after a physical stock-take). */
  async manualAdjustment(
    productVariantId: string,
    quantityChange: number,
    actorUserId: string,
    reason: string,
  ): Promise<Inventory> {
    if (quantityChange === 0) {
      throw new BadRequestException('Quantity change must not be zero');
    }

    const inventory = await this.getByVariantId(productVariantId);
    const newAvailable = inventory.availableQuantity + quantityChange;
    if (newAvailable < 0) {
      throw new BadRequestException('Adjustment would result in negative available stock');
    }

    await this.inventoryRepository.update(inventory.id, { availableQuantity: newAvailable });
    await this.recordAdjustment(
      inventory.id,
      AdjustmentType.MANUAL_CORRECTION,
      quantityChange,
      actorUserId,
      reason,
    );

    return this.getByVariantId(productVariantId);
  }

  /**
   * Undoes a sale that must be voided entirely — e.g. a checkout that failed
   * partway through, or an order cancelled before it ever shipped. Unlike
   * `recordReturn`, nothing was actually received back from a customer, so
   * `totalSoldQuantity` itself is reversed instead of counting it as sold
   * and then separately returned.
   */
  async voidSale(
    productVariantId: string,
    quantity: number,
    actorUserId: string,
    reason?: string,
  ): Promise<Inventory> {
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be positive');
    }

    const inventory = await this.getByVariantId(productVariantId);
    await this.inventoryRepository.update(inventory.id, {
      availableQuantity: inventory.availableQuantity + quantity,
      totalSoldQuantity: Math.max(0, inventory.totalSoldQuantity - quantity),
    });
    await this.recordAdjustment(
      inventory.id,
      AdjustmentType.MANUAL_CORRECTION,
      quantity,
      actorUserId,
      reason,
    );

    return this.getByVariantId(productVariantId);
  }

  /** Holds stock for a limited time (e.g. an item added to a cart) — see StockReservation. */
  async reserve(
    productVariantId: string,
    quantity: number,
    holdMinutes: number = DEFAULT_RESERVATION_HOLD_MINUTES,
  ): Promise<StockReservation> {
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be positive');
    }

    const inventory = await this.getByVariantId(productVariantId);
    if (inventory.availableQuantity < quantity) {
      throw new BadRequestException('Not enough available stock to reserve');
    }

    await this.inventoryRepository.update(inventory.id, {
      availableQuantity: inventory.availableQuantity - quantity,
      reservedQuantity: inventory.reservedQuantity + quantity,
    });
    await this.recordAdjustment(inventory.id, AdjustmentType.RESERVE, -quantity, null);

    return this.reservationsRepository.save(
      this.reservationsRepository.create({
        productVariantId,
        quantity,
        status: ReservationStatus.ACTIVE,
        expiresAt: new Date(Date.now() + holdMinutes * 60_000),
      }),
    );
  }

  async releaseReservation(reservationId: string): Promise<void> {
    const reservation = await this.reservationsRepository.findOne({
      where: { id: reservationId },
    });
    if (!reservation || reservation.status !== ReservationStatus.ACTIVE) {
      return;
    }

    await this.returnReservedStockToAvailable(reservation, ReservationStatus.RELEASED);
  }

  /** Converts a reservation into a completed sale (called at checkout time by Phase 4). */
  async consumeReservation(reservationId: string): Promise<void> {
    const reservation = await this.reservationsRepository.findOne({
      where: { id: reservationId },
    });
    if (!reservation || reservation.status !== ReservationStatus.ACTIVE) {
      throw new BadRequestException('Reservation is not active');
    }

    const inventory = await this.getByVariantId(reservation.productVariantId);
    await this.inventoryRepository.update(inventory.id, {
      reservedQuantity: inventory.reservedQuantity - reservation.quantity,
      totalSoldQuantity: inventory.totalSoldQuantity + reservation.quantity,
    });
    await this.recordAdjustment(inventory.id, AdjustmentType.SALE, -reservation.quantity, null);

    await this.reservationsRepository.update(reservation.id, {
      status: ReservationStatus.CONSUMED,
      consumedAt: new Date(),
    });
  }

  /** Lazily sweeps expired-but-unreleased reservations for one variant back to available stock. */
  private async expireStaleReservations(productVariantId: string): Promise<void> {
    const expired = await this.reservationsRepository.find({
      where: {
        productVariantId,
        status: ReservationStatus.ACTIVE,
        expiresAt: LessThan(new Date()),
      },
    });

    for (const reservation of expired) {
      await this.returnReservedStockToAvailable(reservation, ReservationStatus.EXPIRED);
    }
  }

  private async returnReservedStockToAvailable(
    reservation: StockReservation,
    resultingStatus: ReservationStatus.RELEASED | ReservationStatus.EXPIRED,
  ): Promise<void> {
    const inventory = await this.inventoryRepository.findOneOrFail({
      where: { productVariantId: reservation.productVariantId },
    });

    await this.inventoryRepository.update(inventory.id, {
      availableQuantity: inventory.availableQuantity + reservation.quantity,
      reservedQuantity: inventory.reservedQuantity - reservation.quantity,
    });
    await this.recordAdjustment(
      inventory.id,
      AdjustmentType.RELEASE_RESERVATION,
      reservation.quantity,
      null,
    );

    await this.reservationsRepository.update(reservation.id, {
      status: resultingStatus,
      releasedAt: new Date(),
    });
  }

  private async recordAdjustment(
    inventoryId: string,
    type: AdjustmentType,
    quantityChange: number,
    actorUserId: string | null,
    reason?: string,
  ): Promise<void> {
    await this.adjustmentsRepository.save(
      this.adjustmentsRepository.create({
        inventoryId,
        type,
        quantityChange,
        actorUserId,
        reason: reason ?? null,
      }),
    );
  }
}
