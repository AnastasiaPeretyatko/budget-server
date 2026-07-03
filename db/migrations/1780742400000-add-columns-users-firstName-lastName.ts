import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddColumnsUsersFirstNameLastName1780742400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('users', [
      new TableColumn({
        name: 'first_name',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'last_name',
        type: 'varchar',
        isNullable: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'last_name');
    await queryRunner.dropColumn('users', 'first_name');
  }
}
