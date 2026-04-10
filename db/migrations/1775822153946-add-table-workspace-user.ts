import { id, timestampts } from 'db/helpers';
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AddTableWorkspaceUser1775822153946 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'workspace_user',
        columns: [
          id,
          {
            name: 'workspace_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          ...timestampts,
        ],
        foreignKeys: [
          {
            columnNames: ['workspace_id'],
            referencedTableName: 'workspaces',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
        uniques: [
          {
            columnNames: ['workspace_id', 'user_id'],
          },
        ],
        indices: [
          {
            columnNames: ['workspace_id'],
          },
          {
            columnNames: ['user_id'],
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('workspace_user');
  }
}
