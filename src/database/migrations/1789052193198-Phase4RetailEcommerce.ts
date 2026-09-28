import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase4RetailEcommerce1789052193198 implements MigrationInterface {
  name = 'Phase4RetailEcommerce1789052193198';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "cart_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "product_variant_id" uuid NOT NULL, "quantity" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6fccf5ec03c172d27a28a82928b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b7213c20c1ecdc6597abc8f121" ON "cart_items"  ("user_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_48b30402c64971334bd5aca388" ON "cart_items"  ("user_id", "product_variant_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "coupon_redemptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "coupon_id" uuid NOT NULL, "user_id" uuid NOT NULL, "order_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5086813ea980d21dbeb190ed0a7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9df1b9bc48e3eea5da3762f8e5" ON "coupon_redemptions"  ("coupon_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_986f8dd830915cf2835f89709d" ON "coupon_redemptions"  ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."coupons_type_enum" AS ENUM('percentage', 'fixed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "coupons" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(32) NOT NULL, "type" "public"."coupons_type_enum" NOT NULL, "value" numeric(12,2) NOT NULL, "min_order_amount" numeric(12,2) NOT NULL DEFAULT '0', "max_discount_amount" numeric(12,2), "student_only" boolean NOT NULL DEFAULT false, "usage_limit" integer, "usage_count" integer NOT NULL DEFAULT '0', "per_user_limit" integer, "starts_at" TIMESTAMP WITH TIME ZONE, "expires_at" TIMESTAMP WITH TIME ZONE, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d7ea8864a0150183770f3e9a8cb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_e025109230e82925843f2a14c4" ON "coupons"  ("code") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."order_status_history_status_enum" AS ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned')`,
    );
    await queryRunner.query(
      `CREATE TABLE "order_status_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "order_id" uuid NOT NULL, "status" "public"."order_status_history_status_enum" NOT NULL, "note" text, "actor_user_id" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e6c66d853f155531985fc4f6ec8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1ca7d5228cf9dc589b60243933" ON "order_status_history"  ("order_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."orders_status_enum" AS ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."orders_payment_method_enum" AS ENUM('cod', 'online_stub')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."orders_payment_status_enum" AS ENUM('unpaid', 'paid', 'refunded')`,
    );
    await queryRunner.query(
      `CREATE TABLE "orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "order_number" character varying(32) NOT NULL, "invoice_number" character varying(32) NOT NULL, "user_id" uuid NOT NULL, "status" "public"."orders_status_enum" NOT NULL DEFAULT 'pending', "payment_method" "public"."orders_payment_method_enum" NOT NULL, "payment_status" "public"."orders_payment_status_enum" NOT NULL DEFAULT 'unpaid', "shipping_address" jsonb NOT NULL, "subtotal" numeric(12,2) NOT NULL, "discount_amount" numeric(12,2) NOT NULL DEFAULT '0', "shipping_amount" numeric(12,2) NOT NULL DEFAULT '0', "tax_amount" numeric(12,2) NOT NULL DEFAULT '0', "total_amount" numeric(12,2) NOT NULL, "coupon_code" character varying(32), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_75eba1c6b1a66b09f2a97e6927" ON "orders"  ("order_number") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_fcd3f0e1643399fb09d52efba5" ON "orders"  ("invoice_number") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a922b820eeef29ac1c6800e826" ON "orders"  ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "order_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "order_id" uuid NOT NULL, "product_variant_id" uuid NOT NULL, "product_name" character varying(255) NOT NULL, "sku" character varying(64) NOT NULL, "variant_attributes" jsonb NOT NULL DEFAULT '{}', "unit_price" numeric(12,2) NOT NULL, "quantity" integer NOT NULL, "line_total" numeric(12,2) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_005269d8574e6fac0493715c308" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_145532db85752b29c57d2b7b1f" ON "order_items"  ("order_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_11836543386b9135a47d54cab7" ON "order_items"  ("product_variant_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."product_reviews_status_enum" AS ENUM('pending', 'approved', 'rejected')`,
    );
    await queryRunner.query(
      `CREATE TABLE "product_reviews" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "product_id" uuid NOT NULL, "user_id" uuid NOT NULL, "order_id" uuid NOT NULL, "rating" integer NOT NULL, "comment" text, "status" "public"."product_reviews_status_enum" NOT NULL DEFAULT 'pending', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_67c1501aea1b0633ec441b00bd5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1d3fbb451c2b63d0a763f3ff5b" ON "product_reviews"  ("product_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8306941b81cb5be7d521bdc083" ON "product_reviews"  ("user_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_a603ea521ec26c2d107ea851e7" ON "product_reviews"  ("user_id", "product_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "wishlist_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "product_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0bd52924a97cda208ed2a07bd69" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_549f44d8b756e2690deb099f83" ON "wishlist_items"  ("user_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_e0584a3664156caa678765afad" ON "wishlist_items"  ("user_id", "product_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_items" ADD CONSTRAINT "FK_de29bab7b2bb3b49c07253275f1" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_status_history" ADD CONSTRAINT "FK_1ca7d5228cf9dc589b60243933c" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD CONSTRAINT "FK_145532db85752b29c57d2b7b1f1" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_reviews" ADD CONSTRAINT "FK_1d3fbb451c2b63d0a763f3ff5b1" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "wishlist_items" ADD CONSTRAINT "FK_177397e044732e7e9c0215cd5b7" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "wishlist_items" DROP CONSTRAINT "FK_177397e044732e7e9c0215cd5b7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_reviews" DROP CONSTRAINT "FK_1d3fbb451c2b63d0a763f3ff5b1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP CONSTRAINT "FK_145532db85752b29c57d2b7b1f1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_status_history" DROP CONSTRAINT "FK_1ca7d5228cf9dc589b60243933c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_items" DROP CONSTRAINT "FK_de29bab7b2bb3b49c07253275f1"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_e0584a3664156caa678765afad"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_549f44d8b756e2690deb099f83"`);
    await queryRunner.query(`DROP TABLE "wishlist_items"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a603ea521ec26c2d107ea851e7"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_8306941b81cb5be7d521bdc083"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_1d3fbb451c2b63d0a763f3ff5b"`);
    await queryRunner.query(`DROP TABLE "product_reviews"`);
    await queryRunner.query(`DROP TYPE "public"."product_reviews_status_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_11836543386b9135a47d54cab7"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_145532db85752b29c57d2b7b1f"`);
    await queryRunner.query(`DROP TABLE "order_items"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a922b820eeef29ac1c6800e826"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_fcd3f0e1643399fb09d52efba5"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_75eba1c6b1a66b09f2a97e6927"`);
    await queryRunner.query(`DROP TABLE "orders"`);
    await queryRunner.query(`DROP TYPE "public"."orders_payment_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."orders_payment_method_enum"`);
    await queryRunner.query(`DROP TYPE "public"."orders_status_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_1ca7d5228cf9dc589b60243933"`);
    await queryRunner.query(`DROP TABLE "order_status_history"`);
    await queryRunner.query(`DROP TYPE "public"."order_status_history_status_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_e025109230e82925843f2a14c4"`);
    await queryRunner.query(`DROP TABLE "coupons"`);
    await queryRunner.query(`DROP TYPE "public"."coupons_type_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_986f8dd830915cf2835f89709d"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_9df1b9bc48e3eea5da3762f8e5"`);
    await queryRunner.query(`DROP TABLE "coupon_redemptions"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_48b30402c64971334bd5aca388"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_b7213c20c1ecdc6597abc8f121"`);
    await queryRunner.query(`DROP TABLE "cart_items"`);
  }
}
