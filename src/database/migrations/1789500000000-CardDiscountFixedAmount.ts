import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds a fixed-amount discount option to card_discount_settings: admins can
 * now set either a percentage (existing) or a flat PKR amount (e.g. 200 off)
 * per holder type. Existing rows default to `percent` so behaviour is
 * unchanged until an admin switches a holder type to `fixed`.
 */
export class CardDiscountFixedAmount1789500000000 implements MigrationInterface {
  name = 'CardDiscountFixedAmount1789500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."card_discount_settings_discount_type_enum" AS ENUM('percent', 'fixed')`,
    );
    await queryRunner.query(
      `ALTER TABLE "card_discount_settings" ADD "discount_type" "public"."card_discount_settings_discount_type_enum" NOT NULL DEFAULT 'percent'`,
    );
    await queryRunner.query(
      `ALTER TABLE "card_discount_settings" ADD "discount_amount" numeric(12,2) NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "card_discount_settings" DROP COLUMN "discount_amount"`);
    await queryRunner.query(`ALTER TABLE "card_discount_settings" DROP COLUMN "discount_type"`);
    await queryRunner.query(`DROP TYPE "public"."card_discount_settings_discount_type_enum"`);
  }
}
