import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Stores the full set of cardholder details synced from the issuer
 * (studentsmartcardpk.com), so the SSC smart card can render the physical card
 * face identically to the issuing system (father/guardian/nominee, CNIC/B-Form,
 * contact, address, issuing-institution contact). All nullable — school-only
 * fields are null for individuals and vice-versa, and older synced profiles
 * simply have no value until the next card refresh.
 */
export class ExternalCardDetails1789600000000 implements MigrationInterface {
  name = 'ExternalCardDetails1789600000000';

  private readonly columns: ReadonlyArray<[string, string]> = [
    ['external_contact_number', 'character varying(32)'],
    ['external_email', 'character varying(255)'],
    ['external_father_name', 'character varying(200)'],
    ['external_b_form_number', 'character varying(32)'],
    ['external_cnic_number', 'character varying(32)'],
    ['external_address', 'character varying(300)'],
    ['external_city', 'character varying(120)'],
    ['external_guardian_name', 'character varying(200)'],
    ['external_guardian_relationship', 'character varying(50)'],
    ['external_guardian_mobile', 'character varying(32)'],
    ['external_nominee_name', 'character varying(200)'],
    ['external_nominee_relationship', 'character varying(50)'],
    ['external_nominee_mobile', 'character varying(32)'],
    ['external_institution_address', 'character varying(300)'],
    ['external_institution_city', 'character varying(120)'],
    ['external_institution_contact', 'character varying(32)'],
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [name, type] of this.columns) {
      await queryRunner.query(
        `ALTER TABLE "student_profiles" ADD "${name}" ${type}`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [name] of [...this.columns].reverse()) {
      await queryRunner.query(
        `ALTER TABLE "student_profiles" DROP COLUMN "${name}"`,
      );
    }
  }
}
