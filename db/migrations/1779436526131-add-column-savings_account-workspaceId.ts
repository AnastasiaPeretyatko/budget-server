import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class AddColumnSavingsAccountWorkspaceId1779436526131 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'savings_account',
      new TableColumn({
        name: 'workspace_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    await queryRunner.query(
      `DELETE FROM "savings_account" WHERE "workspace_id" IS NULL`,
    );

    await queryRunner.changeColumn(
      'savings_account',
      'workspace_id',
      new TableColumn({
        name: 'workspace_id',
        type: 'uuid',
        isNullable: false,
      }),
    );

    await queryRunner.createForeignKey(
      'savings_account',
      new TableForeignKey({
        columnNames: ['workspace_id'],
        referencedTableName: 'workspaces',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('savings_account');

    const foreignKey = table?.foreignKeys.find((fk) =>
      fk.columnNames.includes('workspace_id'),
    );

    if (foreignKey) {
      await queryRunner.dropForeignKey('savings_account', foreignKey);
    }

    await queryRunner.dropColumn('savings_account', 'workspace_id');
  }
}
