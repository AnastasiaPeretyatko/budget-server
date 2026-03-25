import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddColumnCreateTransition1773666240395 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'transactions',
      new TableColumn({
        name: 'date',
        type: 'timestamptz',
        precision: 3,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('transactions', 'date');
  }
}
