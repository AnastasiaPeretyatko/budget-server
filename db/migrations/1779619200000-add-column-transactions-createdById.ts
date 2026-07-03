import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class AddColumnTransactionsCreatedById1779619200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'transactions',
      new TableColumn({
        name: 'created_by_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    await queryRunner.createForeignKey(
      'transactions',
      new TableForeignKey({
        columnNames: ['created_by_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('transactions');

    const foreignKey = table?.foreignKeys.find((fk) =>
      fk.columnNames.includes('created_by_id'),
    );

    if (foreignKey) {
      await queryRunner.dropForeignKey('transactions', foreignKey);
    }

    await queryRunner.dropColumn('transactions', 'created_by_id');
  }
}
