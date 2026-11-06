import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddNewRowsToTransaction1793095327750 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('savings_account', [
      new TableColumn({
        name: 'index',
        default: 0,
        type: 'smallint',
      }),
      new TableColumn({
        name: 'icon',
        isNullable: true,
        type: 'varchar',
      }),
      new TableColumn({
        name: 'color',
        isNullable: true,
        type: 'varchar',
      }),
    ]);

    await queryRunner.query(`
      UPDATE savings_account AS sa
      SET "index" = numbered.rn
      FROM (
        SELECT id,
              ROW_NUMBER() OVER (
                PARTITION BY workspace_id
                ORDER BY created_at, id
              ) - 1 AS rn
        FROM savings_account
      ) AS numbered
      WHERE sa.id = numbered.id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<any> {
    await queryRunner.dropColumn('savings_account', 'index');

    await queryRunner.dropColumns('savings_account', [
      'index',
      'icon',
      'color',
    ]);
  }
}
