import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddColumnCategoriesIcon1780000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'categories',
      new TableColumn({
        name: 'icon',
        type: 'varchar',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('categories', 'icon');
  }
}
