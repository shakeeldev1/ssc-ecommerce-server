import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExternalCardSync1789044402078 implements MigrationInterface {
  name = 'ExternalCardSync1789044402078';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."student_profiles_external_holder_type_enum" AS ENUM('student', 'individual')`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_profiles" ADD "external_holder_type" "public"."student_profiles_external_holder_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_profiles" ADD "external_institution_name" character varying(200)`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_profiles" ADD "external_synced_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_5175622578434eccfab3234ab5"`);
    await queryRunner.query(`ALTER TABLE "smart_cards" DROP COLUMN "card_number"`);
    await queryRunner.query(
      `ALTER TABLE "smart_cards" ADD "card_number" character varying(64) NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_5175622578434eccfab3234ab5" ON "smart_cards"  ("card_number") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_5175622578434eccfab3234ab5"`);
    await queryRunner.query(`ALTER TABLE "smart_cards" DROP COLUMN "card_number"`);
    await queryRunner.query(
      `ALTER TABLE "smart_cards" ADD "card_number" character varying(20) NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_5175622578434eccfab3234ab5" ON "smart_cards" USING btree ("card_number") `,
    );
    await queryRunner.query(`ALTER TABLE "student_profiles" DROP COLUMN "external_synced_at"`);
    await queryRunner.query(
      `ALTER TABLE "student_profiles" DROP COLUMN "external_institution_name"`,
    );
    await queryRunner.query(`ALTER TABLE "student_profiles" DROP COLUMN "external_holder_type"`);
    await queryRunner.query(`DROP TYPE "public"."student_profiles_external_holder_type_enum"`);
  }
}
