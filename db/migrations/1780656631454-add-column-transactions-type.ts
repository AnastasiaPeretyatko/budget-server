import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddColumnTransactionsType1780656631454 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "transaction_type_enum" AS ENUM ('expense', 'income', 'transfer')`,
    );

    await queryRunner.addColumn(
      'transactions',
      new TableColumn({
        name: 'type',
        type: 'transaction_type_enum',
        default: `'expense'`,
        isNullable: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('transactions', 'type');
    await queryRunner.query(`DROP TYPE "transaction_type_enum"`);
  }
}
