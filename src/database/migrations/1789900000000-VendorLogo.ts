import { MigrationInterface, QueryRunner } from 'typeorm';

/** Adds an optional business logo (Cloudinary) to vendor accounts. */
export class VendorLogo1789900000000 implements MigrationInterface {
  name = 'VendorLogo1789900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "vendors" ADD "logo_url" character varying(500)`);
    await queryRunner.query(`ALTER TABLE "vendors" ADD "logo_public_id" character varying(255)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "vendors" DROP COLUMN "logo_public_id"`);
    await queryRunner.query(`ALTER TABLE "vendors" DROP COLUMN "logo_url"`);
  }
}
