import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase6CommissionEngine1789057896429 implements MigrationInterface {
  name = 'Phase6CommissionEngine1789057896429';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."commission_rules_scope_type_enum" AS ENUM('global', 'region', 'district', 'institution', 'school_chain', 'campaign')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."commission_rules_channel_enum" AS ENUM('retail', 'wholesale')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."commission_rules_type_enum" AS ENUM('percentage', 'fixed')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."commission_rules_status_enum" AS ENUM('active', 'disabled', 'on_hold', 'zeroed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "commission_rules" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(150) NOT NULL, "beneficiary_user_id" uuid NOT NULL, "scope_type" "public"."commission_rules_scope_type_enum" NOT NULL, "scope_id" uuid, "campaign_code" character varying(64), "channel" "public"."commission_rules_channel_enum", "type" "public"."commission_rules_type_enum" NOT NULL, "value" numeric(12,2) NOT NULL, "min_amount" numeric(12,2), "max_amount" numeric(12,2), "priority" integer NOT NULL DEFAULT '0', "status" "public"."commission_rules_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_399c9fa57f7fd28dfc57acea3bd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0bea6e2782d33ed559e5a5ee8d" ON "commission_rules"  ("beneficiary_user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3f56d6956f9f40fc463d3bff13" ON "commission_rules"  ("scope_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9e782982d9c47e48770ae365d8" ON "commission_rules"  ("campaign_code") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."commission_entries_order_channel_enum" AS ENUM('retail', 'wholesale')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."commission_entries_scope_type_enum" AS ENUM('global', 'region', 'district', 'institution', 'school_chain', 'campaign')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."commission_entries_type_enum" AS ENUM('percentage', 'fixed')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."commission_entries_status_enum" AS ENUM('earned', 'held', 'zeroed', 'reversed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "commission_entries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "rule_id" uuid NOT NULL, "beneficiary_user_id" uuid NOT NULL, "order_channel" "public"."commission_entries_order_channel_enum" NOT NULL, "order_id" uuid NOT NULL, "order_number" character varying(32) NOT NULL, "scope_type" "public"."commission_entries_scope_type_enum" NOT NULL, "base_amount" numeric(12,2) NOT NULL, "type" "public"."commission_entries_type_enum" NOT NULL, "value" numeric(12,2) NOT NULL, "amount" numeric(12,2) NOT NULL, "status" "public"."commission_entries_status_enum" NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_35b5372834c1af9e381d1bd2f97" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f15c25674034cc027ab2b916ce" ON "commission_entries"  ("rule_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6c2c53ea832a51e6a4427eeeed" ON "commission_entries"  ("beneficiary_user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8b86519ac3ec1ffaeabc493ffe" ON "commission_entries"  ("order_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "school_chains" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(150) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_bcef6235aafe737b395ee32f30e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_c4793699f61082dd08894b519e" ON "school_chains"  ("name") `,
    );
    await queryRunner.query(`ALTER TABLE "institutions" ADD "school_chain_id" uuid`);
    await queryRunner.query(`ALTER TABLE "orders" ADD "campaign_code" character varying(64)`);
    await queryRunner.query(
      `CREATE INDEX "IDX_15c31cbaa18ac04c20bffdba6a" ON "institutions"  ("school_chain_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "commission_rules" ADD CONSTRAINT "FK_0bea6e2782d33ed559e5a5ee8d7" FOREIGN KEY ("beneficiary_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "commission_entries" ADD CONSTRAINT "FK_f15c25674034cc027ab2b916ce0" FOREIGN KEY ("rule_id") REFERENCES "commission_rules"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "commission_entries" ADD CONSTRAINT "FK_6c2c53ea832a51e6a4427eeeed3" FOREIGN KEY ("beneficiary_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "institutions" ADD CONSTRAINT "FK_15c31cbaa18ac04c20bffdba6a3" FOREIGN KEY ("school_chain_id") REFERENCES "school_chains"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "institutions" DROP CONSTRAINT "FK_15c31cbaa18ac04c20bffdba6a3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "commission_entries" DROP CONSTRAINT "FK_6c2c53ea832a51e6a4427eeeed3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "commission_entries" DROP CONSTRAINT "FK_f15c25674034cc027ab2b916ce0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "commission_rules" DROP CONSTRAINT "FK_0bea6e2782d33ed559e5a5ee8d7"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_15c31cbaa18ac04c20bffdba6a"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "campaign_code"`);
    await queryRunner.query(`ALTER TABLE "institutions" DROP COLUMN "school_chain_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c4793699f61082dd08894b519e"`);
    await queryRunner.query(`DROP TABLE "school_chains"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_8b86519ac3ec1ffaeabc493ffe"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_6c2c53ea832a51e6a4427eeeed"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_f15c25674034cc027ab2b916ce"`);
    await queryRunner.query(`DROP TABLE "commission_entries"`);
    await queryRunner.query(`DROP TYPE "public"."commission_entries_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."commission_entries_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."commission_entries_scope_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."commission_entries_order_channel_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_9e782982d9c47e48770ae365d8"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_3f56d6956f9f40fc463d3bff13"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_0bea6e2782d33ed559e5a5ee8d"`);
    await queryRunner.query(`DROP TABLE "commission_rules"`);
    await queryRunner.query(`DROP TYPE "public"."commission_rules_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."commission_rules_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."commission_rules_channel_enum"`);
    await queryRunner.query(`DROP TYPE "public"."commission_rules_scope_type_enum"`);
  }
}
