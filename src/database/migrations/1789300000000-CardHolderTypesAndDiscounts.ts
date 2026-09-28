import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * - student_profiles: card details synced from the issuer (school logo,
 *   class, section, roll number) for the student card design.
 * - card_discount_settings: admin-managed automatic discount, one row per
 *   holder type (school-linked student vs individual). Seeded disabled at
 *   0% so nothing changes until an admin sets real rates.
 * - orders: the card discount applied, kept separate from coupon discounts.
 */
export class CardHolderTypesAndDiscounts1789300000000 implements MigrationInterface {
  name = 'CardHolderTypesAndDiscounts1789300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "student_profiles" ADD "external_institution_logo_url" character varying(500)`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_profiles" ADD "external_class_name" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_profiles" ADD "external_section_name" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_profiles" ADD "external_roll_number" character varying(50)`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."card_discount_settings_holder_type_enum" AS ENUM('student', 'individual')`,
    );
    await queryRunner.query(
      `CREATE TABLE "card_discount_settings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "holder_type" "public"."card_discount_settings_holder_type_enum" NOT NULL, "discount_percent" numeric(5,2) NOT NULL DEFAULT '0', "max_discount_per_order" numeric(12,2), "is_active" boolean NOT NULL DEFAULT false, "updated_by_user_id" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_card_discount_settings_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_card_discount_settings_holder_type" ON "card_discount_settings" ("holder_type")`,
    );
    await queryRunner.query(
      `INSERT INTO "card_discount_settings" ("holder_type") VALUES ('student'), ('individual')`,
    );

    await queryRunner.query(
      `ALTER TABLE "orders" ADD "card_discount_amount" numeric(12,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(`ALTER TABLE "orders" ADD "card_discount_percent" numeric(5,2)`);
    await queryRunner.query(`ALTER TABLE "orders" ADD "card_holder_type" character varying(16)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "card_holder_type"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "card_discount_percent"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "card_discount_amount"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_card_discount_settings_holder_type"`);
    await queryRunner.query(`DROP TABLE "card_discount_settings"`);
    await queryRunner.query(`DROP TYPE "public"."card_discount_settings_holder_type_enum"`);
    await queryRunner.query(`ALTER TABLE "student_profiles" DROP COLUMN "external_roll_number"`);
    await queryRunner.query(`ALTER TABLE "student_profiles" DROP COLUMN "external_section_name"`);
    await queryRunner.query(`ALTER TABLE "student_profiles" DROP COLUMN "external_class_name"`);
    await queryRunner.query(
      `ALTER TABLE "student_profiles" DROP COLUMN "external_institution_logo_url"`,
    );
  }
}
