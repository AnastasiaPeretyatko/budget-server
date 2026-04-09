import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class AddColumnWorkspaceIdForTransaction1775721461076 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'transactions',
      new TableColumn({
        name: 'workspace_id',
        type: 'uuid',
        isNullable: false,
      }),
    );

    await queryRunner.createForeignKey(
      'transactions',
      new TableForeignKey({
        columnNames: ['workspace_id'],
        referencedTableName: 'workspaces',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE', // или SET NULL / RESTRICT
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('transactions');

    const foreignKey = table?.foreignKeys.find((fk) =>
      fk.columnNames.includes('workspace_id'),
    );

    if (foreignKey) {
      await queryRunner.dropForeignKey('transactions', foreignKey);
    }

    await queryRunner.dropColumn('transactions', 'workspace_id');
  }
}
