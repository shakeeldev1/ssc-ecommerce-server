import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase5VendorManagement1789053498966 implements MigrationInterface {
  name = 'Phase5VendorManagement1789053498966';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."vendor_documents_type_enum" AS ENUM('business_registration', 'tax_certificate', 'identity', 'bank_statement', 'other')`,
    );
    await queryRunner.query(
      `CREATE TABLE "vendor_documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "vendor_id" uuid NOT NULL, "type" "public"."vendor_documents_type_enum" NOT NULL, "url" character varying(512) NOT NULL, "public_id" character varying(255) NOT NULL, "uploaded_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b6aa864f4d6f4a283445266a4dc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_218ad2aece37d1c3bf7cfe6c72" ON "vendor_documents"  ("vendor_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."vendors_status_enum" AS ENUM('pending', 'approved', 'rejected', 'suspended', 'blocked', 'deactivated')`,
    );
    await queryRunner.query(
      `CREATE TABLE "vendors" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "business_name" character varying(255) NOT NULL, "business_type" character varying(100), "tax_id" character varying(64), "contact_phone" character varying(32) NOT NULL, "bank_account_name" character varying(255) NOT NULL, "bank_account_number" character varying(64) NOT NULL, "bank_name" character varying(100) NOT NULL, "status" "public"."vendors_status_enum" NOT NULL DEFAULT 'pending', "rejection_reason" text, "approved_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_65b4134d1ddc73872e6abee2c1" UNIQUE ("user_id"), CONSTRAINT "PK_9c956c9797edfae5c6ddacc4e6e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_65b4134d1ddc73872e6abee2c1" ON "vendors"  ("user_id") `,
    );
    await queryRunner.query(`ALTER TABLE "products" ADD "vendor_id" uuid`);
    await queryRunner.query(
      `CREATE INDEX "IDX_0e859a83f1dd6b774c20c02885" ON "products"  ("vendor_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "vendor_documents" ADD CONSTRAINT "FK_218ad2aece37d1c3bf7cfe6c72f" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vendors" ADD CONSTRAINT "FK_65b4134d1ddc73872e6abee2c17" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "FK_0e859a83f1dd6b774c20c02885d" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "FK_0e859a83f1dd6b774c20c02885d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vendors" DROP CONSTRAINT "FK_65b4134d1ddc73872e6abee2c17"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vendor_documents" DROP CONSTRAINT "FK_218ad2aece37d1c3bf7cfe6c72f"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_0e859a83f1dd6b774c20c02885"`);
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "vendor_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_65b4134d1ddc73872e6abee2c1"`);
    await queryRunner.query(`DROP TABLE "vendors"`);
    await queryRunner.query(`DROP TYPE "public"."vendors_status_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_218ad2aece37d1c3bf7cfe6c72"`);
    await queryRunner.query(`DROP TABLE "vendor_documents"`);
    await queryRunner.query(`DROP TYPE "public"."vendor_documents_type_enum"`);
  }
}
