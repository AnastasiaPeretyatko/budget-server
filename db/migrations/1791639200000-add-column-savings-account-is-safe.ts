import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

// Флаг «резервный сейф»: переводы на такие накопительные считаются
// откладыванием в резерв (страница «План»)
export class AddColumnSavingsAccountIsSafe1791639200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'savings_account',
      new TableColumn({
        name: 'is_safe',
        type: 'boolean',
        default: false,
        isNullable: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('savings_account', 'is_safe');
  }
}
