import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddColumnsCategoriesLimitsAndMacroFund1791294718419 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "categories_macro_fund_enum" AS ENUM ('essentials', 'lifestyle', 'savings')`,
    );

    await queryRunner.addColumns('categories', [
      new TableColumn({
        name: 'color',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'macro_fund',
        type: 'categories_macro_fund_enum',
        isNullable: true,
      }),
      new TableColumn({
        name: 'default_limit',
        type: 'decimal',
        precision: 12,
        scale: 2,
        isNullable: true,
      }),
      new TableColumn({
        name: 'rollover_to_reserve',
        type: 'boolean',
        default: false,
        isNullable: false,
      }),
      new TableColumn({
        name: 'allow_overspend_from_fund',
        type: 'boolean',
        default: false,
        isNullable: false,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns('categories', [
      'color',
      'macro_fund',
      'default_limit',
      'rollover_to_reserve',
      'allow_overspend_from_fund',
    ]);
    await queryRunner.query(`DROP TYPE IF EXISTS "categories_macro_fund_enum"`);
  }
}
