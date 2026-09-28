import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserPasswordSetFlag1789046553606 implements MigrationInterface {
  name = 'UserPasswordSetFlag1789046553606';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "is_password_set" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "is_password_set"`);
  }
}
