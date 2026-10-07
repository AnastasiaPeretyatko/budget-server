import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateTemplateTags1791552800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'template_tags',
        columns: [
          { name: 'template_id', type: 'uuid', isPrimary: true },
          { name: 'tag_id', type: 'uuid', isPrimary: true },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'template_tags',
      new TableForeignKey({
        columnNames: ['template_id'],
        referencedTableName: 'templates',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'template_tags',
      new TableForeignKey({
        columnNames: ['tag_id'],
        referencedTableName: 'tags',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Первичный ключ ищет по шаблону, а использование тега — по tag_id
    await queryRunner.createIndex(
      'template_tags',
      new TableIndex({
        name: 'IDX_template_tags_tag_id',
        columnNames: ['tag_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('template_tags', true);
  }
}
