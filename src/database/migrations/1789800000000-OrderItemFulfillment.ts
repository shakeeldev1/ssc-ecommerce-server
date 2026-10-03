import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds a per-line vendor fulfillment status to order items so vendors can mark
 * their own items packed/shipped independently of the overall order status.
 * Existing items default to 'pending'.
 */
export class OrderItemFulfillment1789800000000 implements MigrationInterface {
  name = 'OrderItemFulfillment1789800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."order_items_fulfillment_status_enum" AS ENUM('pending', 'packed', 'shipped')`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD "fulfillment_status" "public"."order_items_fulfillment_status_enum" NOT NULL DEFAULT 'pending'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "order_items" DROP COLUMN "fulfillment_status"`);
    await queryRunner.query(`DROP TYPE "public"."order_items_fulfillment_status_enum"`);
  }
}
