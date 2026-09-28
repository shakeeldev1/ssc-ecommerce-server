import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase8TaxInvoicing1789200000000 implements MigrationInterface {
  name = 'Phase8TaxInvoicing1789200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" ADD "tax_breakdown" jsonb`);
    await queryRunner.query(
      `ALTER TABLE "wholesale_orders" ADD "tax_amount" numeric(12,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(`ALTER TABLE "wholesale_orders" ADD "tax_breakdown" jsonb`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "wholesale_orders" DROP COLUMN "tax_breakdown"`);
    await queryRunner.query(`ALTER TABLE "wholesale_orders" DROP COLUMN "tax_amount"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "tax_breakdown"`);
  }
}
