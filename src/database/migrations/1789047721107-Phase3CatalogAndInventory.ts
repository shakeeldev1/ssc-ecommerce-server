import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase3CatalogAndInventory1789047721107 implements MigrationInterface {
  name = 'Phase3CatalogAndInventory1789047721107';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "brands" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(150) NOT NULL, "logo_url" character varying(500), "logo_public_id" character varying(255), "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b0c437120b624da1034a81fc561" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_96db6bbbaa6f23cad26871339b" ON "brands"  ("name") `,
    );
    await queryRunner.query(
      `CREATE TABLE "categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(150) NOT NULL, "slug" character varying(160) NOT NULL, "parent_id" uuid, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_420d9f679d41281f282f5bc7d0" ON "categories"  ("slug") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_88cea2dc9c31951d06437879b4" ON "categories"  ("parent_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "product_variants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "product_id" uuid NOT NULL, "sku" character varying(64) NOT NULL, "attributes" jsonb NOT NULL DEFAULT '{}', "price" numeric(12,2) NOT NULL, "compare_at_price" numeric(12,2), "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_281e3f2c55652d6a22c0aa59fd7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6343513e20e2deab45edfce131" ON "product_variants"  ("product_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_46f236f21640f9da218a063a86" ON "product_variants"  ("sku") `,
    );
    await queryRunner.query(
      `CREATE TABLE "products" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "slug" character varying(280) NOT NULL, "description" text, "specifications" jsonb, "category_id" uuid NOT NULL, "brand_id" uuid, "is_student_discount_eligible" boolean NOT NULL DEFAULT false, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_464f927ae360106b783ed0b410" ON "products"  ("slug") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9a5f6868c96e0069e699f33e12" ON "products"  ("category_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1530a6f15d3c79d1b70be98f2b" ON "products"  ("brand_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_444653b8f890261f57c7065249" ON "products"  ("is_student_discount_eligible") `,
    );
    await queryRunner.query(
      `CREATE TABLE "product_images" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "product_id" uuid NOT NULL, "url" character varying(500) NOT NULL, "public_id" character varying(255) NOT NULL, "sort_order" integer NOT NULL DEFAULT '0', "is_primary" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1974264ea7265989af8392f63a1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4f166bb8c2bfcef2498d97b406" ON "product_images"  ("product_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."inventory_adjustments_type_enum" AS ENUM('restock', 'reserve', 'release_reservation', 'damage', 'sale', 'return', 'manual_correction')`,
    );
    await queryRunner.query(
      `CREATE TABLE "inventory_adjustments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "inventory_id" uuid NOT NULL, "type" "public"."inventory_adjustments_type_enum" NOT NULL, "quantity_change" integer NOT NULL, "reason" text, "actor_user_id" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_67a6cd67ec23f212ac3d124325e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bb562d35ad53f608d106293bc6" ON "inventory_adjustments"  ("inventory_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c0880ab89bca60ecc856b7ef7f" ON "inventory_adjustments"  ("actor_user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "inventories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "product_variant_id" uuid NOT NULL, "available_quantity" integer NOT NULL DEFAULT '0', "reserved_quantity" integer NOT NULL DEFAULT '0', "damaged_quantity" integer NOT NULL DEFAULT '0', "total_sold_quantity" integer NOT NULL DEFAULT '0', "total_returned_quantity" integer NOT NULL DEFAULT '0', "low_stock_threshold" integer NOT NULL DEFAULT '5', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_4f0621d2ad06f42e4ceda1b4d0" UNIQUE ("product_variant_id"), CONSTRAINT "PK_7b1946392ffdcb50cfc6ac78c0e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_4f0621d2ad06f42e4ceda1b4d0" ON "inventories"  ("product_variant_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."stock_reservations_status_enum" AS ENUM('active', 'released', 'consumed', 'expired')`,
    );
    await queryRunner.query(
      `CREATE TABLE "stock_reservations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "product_variant_id" uuid NOT NULL, "quantity" integer NOT NULL, "status" "public"."stock_reservations_status_enum" NOT NULL DEFAULT 'active', "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "released_at" TIMESTAMP WITH TIME ZONE, "consumed_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_46ec0f5605d70f64654ad4e7bd9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_26c35b093a421abdc6a8abc188" ON "stock_reservations"  ("product_variant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5bb5d01e006628288129347c7d" ON "stock_reservations"  ("status") `,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" ADD CONSTRAINT "FK_88cea2dc9c31951d06437879b40" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variants" ADD CONSTRAINT "FK_6343513e20e2deab45edfce1316" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "FK_9a5f6868c96e0069e699f33e124" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "FK_1530a6f15d3c79d1b70be98f2be" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_images" ADD CONSTRAINT "FK_4f166bb8c2bfcef2498d97b4068" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventories" ADD CONSTRAINT "FK_4f0621d2ad06f42e4ceda1b4d01" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_reservations" ADD CONSTRAINT "FK_26c35b093a421abdc6a8abc1883" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "stock_reservations" DROP CONSTRAINT "FK_26c35b093a421abdc6a8abc1883"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventories" DROP CONSTRAINT "FK_4f0621d2ad06f42e4ceda1b4d01"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_images" DROP CONSTRAINT "FK_4f166bb8c2bfcef2498d97b4068"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "FK_1530a6f15d3c79d1b70be98f2be"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "FK_9a5f6868c96e0069e699f33e124"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variants" DROP CONSTRAINT "FK_6343513e20e2deab45edfce1316"`,
    );
    await queryRunner.query(
      `ALTER TABLE "categories" DROP CONSTRAINT "FK_88cea2dc9c31951d06437879b40"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_5bb5d01e006628288129347c7d"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_26c35b093a421abdc6a8abc188"`);
    await queryRunner.query(`DROP TABLE "stock_reservations"`);
    await queryRunner.query(`DROP TYPE "public"."stock_reservations_status_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_4f0621d2ad06f42e4ceda1b4d0"`);
    await queryRunner.query(`DROP TABLE "inventories"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c0880ab89bca60ecc856b7ef7f"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_bb562d35ad53f608d106293bc6"`);
    await queryRunner.query(`DROP TABLE "inventory_adjustments"`);
    await queryRunner.query(`DROP TYPE "public"."inventory_adjustments_type_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_4f166bb8c2bfcef2498d97b406"`);
    await queryRunner.query(`DROP TABLE "product_images"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_444653b8f890261f57c7065249"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_1530a6f15d3c79d1b70be98f2b"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_9a5f6868c96e0069e699f33e12"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_464f927ae360106b783ed0b410"`);
    await queryRunner.query(`DROP TABLE "products"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_46f236f21640f9da218a063a86"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_6343513e20e2deab45edfce131"`);
    await queryRunner.query(`DROP TABLE "product_variants"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_88cea2dc9c31951d06437879b4"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_420d9f679d41281f282f5bc7d0"`);
    await queryRunner.query(`DROP TABLE "categories"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_96db6bbbaa6f23cad26871339b"`);
    await queryRunner.query(`DROP TABLE "brands"`);
  }
}
