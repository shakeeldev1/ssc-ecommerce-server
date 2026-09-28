import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase5WholesaleAndPricing1789054894696 implements MigrationInterface {
  name = 'Phase5WholesaleAndPricing1789054894696';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "buyer_prices" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "product_variant_id" uuid NOT NULL, "buyer_user_id" uuid NOT NULL, "price_per_unit" numeric(12,2) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_90efcd8d557c1d71318dfcd6480" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0b64fb7850051580c1f5735f97" ON "buyer_prices"  ("product_variant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_db596a944a8653fe52e7ef9d1e" ON "buyer_prices"  ("buyer_user_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_e4302798a77d3212fd010ef37e" ON "buyer_prices"  ("product_variant_id", "buyer_user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "price_tiers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "product_variant_id" uuid NOT NULL, "min_quantity" integer NOT NULL, "price_per_unit" numeric(12,2) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_32e26c73f31f2d3a75bb2143d62" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b708697d0deee0fd7770dc9a88" ON "price_tiers"  ("product_variant_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_2326c817d6470a3cc5ac8fb05f" ON "price_tiers"  ("product_variant_id", "min_quantity") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."quote_requests_status_enum" AS ENUM('open', 'quoted', 'closed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "quote_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "buyer_user_id" uuid NOT NULL, "product_variant_id" uuid NOT NULL, "requested_quantity" integer NOT NULL, "message" text, "status" "public"."quote_requests_status_enum" NOT NULL DEFAULT 'open', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c05f72de8be0ec6b0985a851558" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_74382b5c809e23b313227506b6" ON "quote_requests"  ("buyer_user_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."quotations_status_enum" AS ENUM('pending', 'accepted', 'rejected', 'expired')`,
    );
    await queryRunner.query(
      `CREATE TABLE "quotations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "quote_request_id" uuid NOT NULL, "issued_by_user_id" uuid NOT NULL, "price_per_unit" numeric(12,2) NOT NULL, "quantity" integer NOT NULL, "valid_until" TIMESTAMP WITH TIME ZONE, "notes" text, "status" "public"."quotations_status_enum" NOT NULL DEFAULT 'pending', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6c00eb8ba181f28c21ffba7ecb1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_419088e1a6115855bfad99637a" ON "quotations"  ("quote_request_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "wholesale_cart_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "buyer_user_id" uuid NOT NULL, "product_variant_id" uuid NOT NULL, "quantity" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1bc22f80873edb74fd85ffcece4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a334cb28276941976f3086afb2" ON "wholesale_cart_items"  ("buyer_user_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_29bfe5a83128b5a36c4e6f157d" ON "wholesale_cart_items"  ("buyer_user_id", "product_variant_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."wholesale_order_status_history_status_enum" AS ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned')`,
    );
    await queryRunner.query(
      `CREATE TABLE "wholesale_order_status_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "order_id" uuid NOT NULL, "status" "public"."wholesale_order_status_history_status_enum" NOT NULL, "note" text, "actor_user_id" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c5b8fac336c48bdf2e7b4e4ca98" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6bac70037bc794dd397bfbaf51" ON "wholesale_order_status_history"  ("order_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."wholesale_orders_status_enum" AS ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."wholesale_orders_payment_method_enum" AS ENUM('cod', 'online_stub')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."wholesale_orders_payment_status_enum" AS ENUM('unpaid', 'paid', 'refunded')`,
    );
    await queryRunner.query(
      `CREATE TABLE "wholesale_orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "order_number" character varying(32) NOT NULL, "invoice_number" character varying(32) NOT NULL, "buyer_user_id" uuid NOT NULL, "status" "public"."wholesale_orders_status_enum" NOT NULL DEFAULT 'pending', "payment_method" "public"."wholesale_orders_payment_method_enum" NOT NULL, "payment_status" "public"."wholesale_orders_payment_status_enum" NOT NULL DEFAULT 'unpaid', "shipping_address" jsonb NOT NULL, "subtotal" numeric(12,2) NOT NULL, "total_amount" numeric(12,2) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c5ed4070c2fb92374a5f99f6d8a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_ce1a5bf2773b1ff3d20e65a050" ON "wholesale_orders"  ("order_number") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_56f25dcc0dbc482504eb062b46" ON "wholesale_orders"  ("invoice_number") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6d65b01ed875975c7ce9430312" ON "wholesale_orders"  ("buyer_user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "wholesale_order_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "order_id" uuid NOT NULL, "product_variant_id" uuid NOT NULL, "product_name" character varying(255) NOT NULL, "sku" character varying(64) NOT NULL, "variant_attributes" jsonb NOT NULL DEFAULT '{}', "unit_price" numeric(12,2) NOT NULL, "quantity" integer NOT NULL, "line_total" numeric(12,2) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_92aca0c39c677cffcf4bf41cfb6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_92c17714ad3dc6e9bed7862228" ON "wholesale_order_items"  ("order_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ce53e0c8f945eb7fd49c1a9d95" ON "wholesale_order_items"  ("product_variant_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variants" ADD "is_wholesale_eligible" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(`ALTER TABLE "product_variants" ADD "wholesale_moq" integer`);
    await queryRunner.query(
      `CREATE INDEX "IDX_5ad6629438dcf2331eced8299c" ON "product_variants"  ("is_wholesale_eligible") `,
    );
    await queryRunner.query(
      `ALTER TABLE "quote_requests" ADD CONSTRAINT "FK_bea855db4b83908902447335d76" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "quotations" ADD CONSTRAINT "FK_419088e1a6115855bfad99637a1" FOREIGN KEY ("quote_request_id") REFERENCES "quote_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "wholesale_cart_items" ADD CONSTRAINT "FK_d68ea9acf7e3fce81dd7d2ed79f" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "wholesale_order_status_history" ADD CONSTRAINT "FK_6bac70037bc794dd397bfbaf512" FOREIGN KEY ("order_id") REFERENCES "wholesale_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "wholesale_order_items" ADD CONSTRAINT "FK_92c17714ad3dc6e9bed78622280" FOREIGN KEY ("order_id") REFERENCES "wholesale_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "wholesale_order_items" DROP CONSTRAINT "FK_92c17714ad3dc6e9bed78622280"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wholesale_order_status_history" DROP CONSTRAINT "FK_6bac70037bc794dd397bfbaf512"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wholesale_cart_items" DROP CONSTRAINT "FK_d68ea9acf7e3fce81dd7d2ed79f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quotations" DROP CONSTRAINT "FK_419088e1a6115855bfad99637a1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quote_requests" DROP CONSTRAINT "FK_bea855db4b83908902447335d76"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_5ad6629438dcf2331eced8299c"`);
    await queryRunner.query(`ALTER TABLE "product_variants" DROP COLUMN "wholesale_moq"`);
    await queryRunner.query(`ALTER TABLE "product_variants" DROP COLUMN "is_wholesale_eligible"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ce53e0c8f945eb7fd49c1a9d95"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_92c17714ad3dc6e9bed7862228"`);
    await queryRunner.query(`DROP TABLE "wholesale_order_items"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_6d65b01ed875975c7ce9430312"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_56f25dcc0dbc482504eb062b46"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ce1a5bf2773b1ff3d20e65a050"`);
    await queryRunner.query(`DROP TABLE "wholesale_orders"`);
    await queryRunner.query(`DROP TYPE "public"."wholesale_orders_payment_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."wholesale_orders_payment_method_enum"`);
    await queryRunner.query(`DROP TYPE "public"."wholesale_orders_status_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_6bac70037bc794dd397bfbaf51"`);
    await queryRunner.query(`DROP TABLE "wholesale_order_status_history"`);
    await queryRunner.query(`DROP TYPE "public"."wholesale_order_status_history_status_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_29bfe5a83128b5a36c4e6f157d"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a334cb28276941976f3086afb2"`);
    await queryRunner.query(`DROP TABLE "wholesale_cart_items"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_419088e1a6115855bfad99637a"`);
    await queryRunner.query(`DROP TABLE "quotations"`);
    await queryRunner.query(`DROP TYPE "public"."quotations_status_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_74382b5c809e23b313227506b6"`);
    await queryRunner.query(`DROP TABLE "quote_requests"`);
    await queryRunner.query(`DROP TYPE "public"."quote_requests_status_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_2326c817d6470a3cc5ac8fb05f"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_b708697d0deee0fd7770dc9a88"`);
    await queryRunner.query(`DROP TABLE "price_tiers"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_e4302798a77d3212fd010ef37e"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_db596a944a8653fe52e7ef9d1e"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_0b64fb7850051580c1f5735f97"`);
    await queryRunner.query(`DROP TABLE "buyer_prices"`);
  }
}
