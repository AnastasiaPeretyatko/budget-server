import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class AddColumnCategoriesWorkspaceId1779369026131 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'categories',
      new TableColumn({
        name: 'workspace_id',
        type: 'uuid',
        isNullable: false,
      }),
    );

    await queryRunner.createForeignKey(
      'categories',
      new TableForeignKey({
        columnNames: ['workspace_id'],
        referencedTableName: 'workspaces',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('categories');

    const foreignKey = table?.foreignKeys.find((fk) =>
      fk.columnNames.includes('workspace_id'),
    );

    if (foreignKey) {
      await queryRunner.dropForeignKey('categories', foreignKey);
    }

    await queryRunner.dropColumn('categories', 'workspace_id');
  }
}
