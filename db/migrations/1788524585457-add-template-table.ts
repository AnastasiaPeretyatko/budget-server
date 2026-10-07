import { id, timestampts } from 'db/helpers';
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AddTemplateTable1788524585457 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'templates',
        columns: [
          id,
          {
            name: 'name',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'icon',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'from_account_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'to_account_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: false,
            default: '0',
          },
          {
            name: 'type',
            type: 'transaction_type_enum',
            default: `'expense'`,
            isNullable: false,
          },
          {
            name: 'categories_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'workspace_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'varchar',
            isNullable: true,
          },
          ...timestampts,
        ],
        foreignKeys: [
          {
            columnNames: ['from_account_id'],
            referencedTableName: 'savings_account',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
          {
            columnNames: ['to_account_id'],
            referencedTableName: 'savings_account',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
          {
            columnNames: ['categories_id'],
            referencedTableName: 'categories',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
          {
            columnNames: ['workspace_id'],
            referencedTableName: 'workspaces',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('templates');
  }
}
