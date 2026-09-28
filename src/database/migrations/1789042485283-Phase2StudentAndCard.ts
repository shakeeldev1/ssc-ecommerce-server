import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase2StudentAndCard1789042485283 implements MigrationInterface {
  name = 'Phase2StudentAndCard1789042485283';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "regions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(150) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4fcd12ed6a046276e2deb08801c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_1eb9a8899a7db89f6ba473fd84" ON "regions"  ("name") `,
    );
    await queryRunner.query(
      `CREATE TABLE "districts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(150) NOT NULL, "region_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_972a72ff4e3bea5c7f43a2b98af" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4271e8e205bbdce31975c55ed3" ON "districts"  ("region_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."institutions_type_enum" AS ENUM('school', 'college', 'university')`,
    );
    await queryRunner.query(
      `CREATE TABLE "institutions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(200) NOT NULL, "type" "public"."institutions_type_enum" NOT NULL, "district_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0be7539dcdba335470dc05e9690" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_da9552d4e529a27d8b71d7d8c5" ON "institutions"  ("district_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."student_profiles_gender_enum" AS ENUM('male', 'female', 'other')`,
    );
    await queryRunner.query(
      `CREATE TABLE "student_profiles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "student_id_number" character varying(32) NOT NULL, "photo_url" character varying(500), "photo_public_id" character varying(255), "date_of_birth" date, "gender" "public"."student_profiles_gender_enum", "institution_id" uuid, "district_id" uuid, "region_id" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_cef016a0d95e26ae7c0f167ec2" UNIQUE ("user_id"), CONSTRAINT "PK_5ed0a32eeaddfe812fb326177d0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_cef016a0d95e26ae7c0f167ec2" ON "student_profiles"  ("user_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_95ec6addd785c694cb868fa684" ON "student_profiles"  ("student_id_number") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e225499d4afecd2c3d1d5ae999" ON "student_profiles"  ("institution_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_baae59c26683095459f35dd192" ON "student_profiles"  ("district_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b3f4a695ad80b710f87139d6b6" ON "student_profiles"  ("region_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."smart_cards_status_enum" AS ENUM('active', 'expired', 'suspended', 'blocked', 're_issued')`,
    );
    await queryRunner.query(
      `CREATE TABLE "smart_cards" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "student_profile_id" uuid NOT NULL, "card_number" character varying(20) NOT NULL, "qr_token" character varying(64) NOT NULL, "status" "public"."smart_cards_status_enum" NOT NULL DEFAULT 'active', "replaces_card_id" uuid, "issued_at" TIMESTAMP WITH TIME ZONE NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_29bcfd85f753c51cbca214e7636" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_90e61fe31592f9dbc0dc1c9d4c" ON "smart_cards"  ("student_profile_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_5175622578434eccfab3234ab5" ON "smart_cards"  ("card_number") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_ff1b9b727535a6ec220038c721" ON "smart_cards"  ("qr_token") `,
    );
    await queryRunner.query(
      `CREATE TABLE "addresses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "student_profile_id" uuid NOT NULL, "label" character varying(50) NOT NULL DEFAULT 'Home', "line1" character varying(255) NOT NULL, "line2" character varying(255), "city" character varying(100) NOT NULL, "state" character varying(100) NOT NULL, "postal_code" character varying(20), "country" character varying(100) NOT NULL DEFAULT 'Pakistan', "is_default" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_745d8f43d3af10ab8247465e450" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f347eaf28a10ed0d36cfbd7a03" ON "addresses"  ("student_profile_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "districts" ADD CONSTRAINT "FK_4271e8e205bbdce31975c55ed3f" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "institutions" ADD CONSTRAINT "FK_da9552d4e529a27d8b71d7d8c58" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_profiles" ADD CONSTRAINT "FK_cef016a0d95e26ae7c0f167ec28" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_profiles" ADD CONSTRAINT "FK_e225499d4afecd2c3d1d5ae9994" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_profiles" ADD CONSTRAINT "FK_baae59c26683095459f35dd1925" FOREIGN KEY ("district_id") REFERENCES "districts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_profiles" ADD CONSTRAINT "FK_b3f4a695ad80b710f87139d6b61" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_cards" ADD CONSTRAINT "FK_90e61fe31592f9dbc0dc1c9d4cf" FOREIGN KEY ("student_profile_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "addresses" ADD CONSTRAINT "FK_f347eaf28a10ed0d36cfbd7a03d" FOREIGN KEY ("student_profile_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "addresses" DROP CONSTRAINT "FK_f347eaf28a10ed0d36cfbd7a03d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "smart_cards" DROP CONSTRAINT "FK_90e61fe31592f9dbc0dc1c9d4cf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_profiles" DROP CONSTRAINT "FK_b3f4a695ad80b710f87139d6b61"`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_profiles" DROP CONSTRAINT "FK_baae59c26683095459f35dd1925"`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_profiles" DROP CONSTRAINT "FK_e225499d4afecd2c3d1d5ae9994"`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_profiles" DROP CONSTRAINT "FK_cef016a0d95e26ae7c0f167ec28"`,
    );
    await queryRunner.query(
      `ALTER TABLE "institutions" DROP CONSTRAINT "FK_da9552d4e529a27d8b71d7d8c58"`,
    );
    await queryRunner.query(
      `ALTER TABLE "districts" DROP CONSTRAINT "FK_4271e8e205bbdce31975c55ed3f"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_f347eaf28a10ed0d36cfbd7a03"`);
    await queryRunner.query(`DROP TABLE "addresses"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ff1b9b727535a6ec220038c721"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_5175622578434eccfab3234ab5"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_90e61fe31592f9dbc0dc1c9d4c"`);
    await queryRunner.query(`DROP TABLE "smart_cards"`);
    await queryRunner.query(`DROP TYPE "public"."smart_cards_status_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_b3f4a695ad80b710f87139d6b6"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_baae59c26683095459f35dd192"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_e225499d4afecd2c3d1d5ae999"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_95ec6addd785c694cb868fa684"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_cef016a0d95e26ae7c0f167ec2"`);
    await queryRunner.query(`DROP TABLE "student_profiles"`);
    await queryRunner.query(`DROP TYPE "public"."student_profiles_gender_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_da9552d4e529a27d8b71d7d8c5"`);
    await queryRunner.query(`DROP TABLE "institutions"`);
    await queryRunner.query(`DROP TYPE "public"."institutions_type_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_4271e8e205bbdce31975c55ed3"`);
    await queryRunner.query(`DROP TABLE "districts"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_1eb9a8899a7db89f6ba473fd84"`);
    await queryRunner.query(`DROP TABLE "regions"`);
  }
}
