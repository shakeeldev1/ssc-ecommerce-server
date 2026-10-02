import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Stores the EFU takaful product variant (1–10) and derived coverage amount
 * (variant × 100,000 PKR) synced from the issuer (studentsmartcardpk.com), so
 * the SSC smart card can display the holder's coverage. Nullable — older cards
 * and pre-coverage holders simply have no value.
 */
export class ExternalCardCoverage1789400000000 implements MigrationInterface {
  name = 'ExternalCardCoverage1789400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "student_profiles" ADD "external_product_variant" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_profiles" ADD "external_coverage_amount" integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "student_profiles" DROP COLUMN "external_coverage_amount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_profiles" DROP COLUMN "external_product_variant"`,
    );
  }
}
