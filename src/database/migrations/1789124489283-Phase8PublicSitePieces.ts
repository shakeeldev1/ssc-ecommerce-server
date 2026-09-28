import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase8PublicSitePieces1789124489283 implements MigrationInterface {
  name = 'Phase8PublicSitePieces1789124489283';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "contact_messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "full_name" character varying(150) NOT NULL, "email" character varying(255) NOT NULL, "phone" character varying(32), "subject" character varying(200), "message" text NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b74f96eb2edd977ccfba6533293" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "contact_messages"`);
  }
}
