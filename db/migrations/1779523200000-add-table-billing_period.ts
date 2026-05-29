import { id, timestampts } from 'db/helpers';
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AddTableBillingPeriod1779523200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "billing_period_status_enum" AS ENUM ('active', 'completed')`,
    );

    await queryRunner.createTable(
      new Table({
        name: 'billing_period',
        columns: [
          id,
          {
            name: 'workspace_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'start_date',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'end_date',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'billing_period_status_enum',
            default: `'active'`,
          },
          {
            name: 'start_day',
            type: 'smallint',
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
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('billing_period');
    await queryRunner.query(`DROP TYPE "billing_period_status_enum"`);
  }
}
