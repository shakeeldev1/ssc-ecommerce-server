import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds an admin moderation gate to products: vendor-created products must be
 * APPROVED by an admin before they appear on the storefront. Existing products
 * are backfilled to 'approved' so nothing currently live disappears.
 */
export class ProductApproval1789700000000 implements MigrationInterface {
  name = 'ProductApproval1789700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."products_approval_status_enum" AS ENUM('pending', 'approved', 'rejected')`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD "approval_status" "public"."products_approval_status_enum" NOT NULL DEFAULT 'pending'`,
    );
    await queryRunner.query(`ALTER TABLE "products" ADD "rejection_reason" text`);
    // Everything that already exists was live before moderation — keep it visible.
    await queryRunner.query(`UPDATE "products" SET "approval_status" = 'approved'`);
    await queryRunner.query(
      `CREATE INDEX "IDX_products_approval_status" ON "products" ("approval_status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_products_approval_status"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "rejection_reason"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "approval_status"`);
    await queryRunner.query(`DROP TYPE "public"."products_approval_status_enum"`);
  }
}
