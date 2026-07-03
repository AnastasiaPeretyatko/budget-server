import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateTagsAndTransactionTags1780828800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'tags',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          { name: 'name', type: 'varchar', isNullable: false },
          { name: 'color', type: 'varchar', isNullable: false },
          { name: 'workspace_id', type: 'uuid', isNullable: false },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
          { name: 'deleted_at', type: 'timestamptz', isNullable: true },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'tags',
      new TableIndex({ columnNames: ['workspace_id'] }),
    );

    await queryRunner.createForeignKey(
      'tags',
      new TableForeignKey({
        columnNames: ['workspace_id'],
        referencedTableName: 'workspaces',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'transaction_tags',
        columns: [
          { name: 'transaction_id', type: 'uuid', isPrimary: true },
          { name: 'tag_id', type: 'uuid', isPrimary: true },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'transaction_tags',
      new TableForeignKey({
        columnNames: ['transaction_id'],
        referencedTableName: 'transactions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'transaction_tags',
      new TableForeignKey({
        columnNames: ['tag_id'],
        referencedTableName: 'tags',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('transaction_tags', true);
    await queryRunner.dropTable('tags', true);
  }
}
