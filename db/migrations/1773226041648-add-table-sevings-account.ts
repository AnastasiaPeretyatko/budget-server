import { id, timestampts } from 'db/helpers';
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AddTableSevingsAccount1773226041648 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'savings_account',
        columns: [
          id,
          {
            name: 'name',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'description',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 12,
            scale: 2,
            isNullable: false,
            default: 0,
          },
          ...timestampts,
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('savings_account');
  }
}
