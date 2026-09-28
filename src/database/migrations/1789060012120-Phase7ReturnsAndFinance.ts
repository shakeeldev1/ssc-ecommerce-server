import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase7ReturnsAndFinance1789060012120 implements MigrationInterface {
  name = 'Phase7ReturnsAndFinance1789060012120';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."settlement_statements_status_enum" AS ENUM('generated', 'paid')`,
    );
    await queryRunner.query(
      `CREATE TABLE "settlement_statements" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "beneficiary_user_id" uuid NOT NULL, "period_start" date NOT NULL, "period_end" date NOT NULL, "total_amount" numeric(12,2) NOT NULL, "entry_count" integer NOT NULL, "status" "public"."settlement_statements_status_enum" NOT NULL DEFAULT 'generated', "paid_at" TIMESTAMP WITH TIME ZONE, "generated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e4603ed0ad0d945f912d59851ae" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_607aacb16ab43ef5b9ba56149f" ON "settlement_statements"  ("beneficiary_user_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."return_requests_order_channel_enum" AS ENUM('retail', 'wholesale')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."return_requests_type_enum" AS ENUM('return', 'exchange')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."return_requests_status_enum" AS ENUM('requested', 'approved', 'rejected')`,
    );
    await queryRunner.query(
      `CREATE TABLE "return_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "order_channel" "public"."return_requests_order_channel_enum" NOT NULL, "order_id" uuid NOT NULL, "order_number" character varying(32) NOT NULL, "buyer_user_id" uuid NOT NULL, "type" "public"."return_requests_type_enum" NOT NULL, "reason" text NOT NULL, "restock" boolean NOT NULL DEFAULT true, "order_item_id" uuid, "replacement_variant_id" uuid, "status" "public"."return_requests_status_enum" NOT NULL DEFAULT 'requested', "decision_note" text, "decided_by_user_id" uuid, "decided_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_38714de8942bd9bc3a450a06889" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c7f39dfc32be2b7be25c139ba0" ON "return_requests"  ("order_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_72c0420734f83ad7f6e83ca870" ON "return_requests"  ("buyer_user_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."refunds_order_channel_enum" AS ENUM('retail', 'wholesale')`,
    );
    await queryRunner.query(
      `CREATE TABLE "refunds" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "return_request_id" uuid NOT NULL, "order_channel" "public"."refunds_order_channel_enum" NOT NULL, "order_id" uuid NOT NULL, "amount" numeric(12,2) NOT NULL, "reason" text NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5106efb01eeda7e49a78b869738" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a46ac94548ec7f359e31c90da8" ON "refunds"  ("return_request_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a42db6369017df60549539f556" ON "refunds"  ("order_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "commission_entries" ADD "hold_until" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(`ALTER TABLE "commission_entries" ADD "settlement_statement_id" uuid`);
    await queryRunner.query(
      `CREATE INDEX "IDX_bbefc45e2e7d7012e30fb4e380" ON "commission_entries"  ("settlement_statement_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "settlement_statements" ADD CONSTRAINT "FK_607aacb16ab43ef5b9ba56149f2" FOREIGN KEY ("beneficiary_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "refunds" ADD CONSTRAINT "FK_a46ac94548ec7f359e31c90da88" FOREIGN KEY ("return_request_id") REFERENCES "return_requests"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "refunds" DROP CONSTRAINT "FK_a46ac94548ec7f359e31c90da88"`,
    );
    await queryRunner.query(
      `ALTER TABLE "settlement_statements" DROP CONSTRAINT "FK_607aacb16ab43ef5b9ba56149f2"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_bbefc45e2e7d7012e30fb4e380"`);
    await queryRunner.query(
      `ALTER TABLE "commission_entries" DROP COLUMN "settlement_statement_id"`,
    );
    await queryRunner.query(`ALTER TABLE "commission_entries" DROP COLUMN "hold_until"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a42db6369017df60549539f556"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a46ac94548ec7f359e31c90da8"`);
    await queryRunner.query(`DROP TABLE "refunds"`);
    await queryRunner.query(`DROP TYPE "public"."refunds_order_channel_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_72c0420734f83ad7f6e83ca870"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c7f39dfc32be2b7be25c139ba0"`);
    await queryRunner.query(`DROP TABLE "return_requests"`);
    await queryRunner.query(`DROP TYPE "public"."return_requests_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."return_requests_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."return_requests_order_channel_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_607aacb16ab43ef5b9ba56149f"`);
    await queryRunner.query(`DROP TABLE "settlement_statements"`);
    await queryRunner.query(`DROP TYPE "public"."settlement_statements_status_enum"`);
  }
}
