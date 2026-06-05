import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AlterBillingPeriodNullableColumns1779705600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.changeColumn(
      'billing_period',
      'start_date',
      new TableColumn({
        name: 'start_date',
        type: 'date',
        isNullable: true,
      }),
    );

    await queryRunner.changeColumn(
      'billing_period',
      'end_date',
      new TableColumn({
        name: 'end_date',
        type: 'date',
        isNullable: true,
      }),
    );

    await queryRunner.changeColumn(
      'billing_period',
      'start_day',
      new TableColumn({
        name: 'start_day',
        type: 'smallint',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.changeColumn(
      'billing_period',
      'start_day',
      new TableColumn({
        name: 'start_day',
        type: 'smallint',
        isNullable: false,
      }),
    );

    await queryRunner.changeColumn(
      'billing_period',
      'end_date',
      new TableColumn({
        name: 'end_date',
        type: 'date',
        isNullable: false,
      }),
    );

    await queryRunner.changeColumn(
      'billing_period',
      'start_date',
      new TableColumn({
        name: 'start_date',
        type: 'date',
        isNullable: false,
      }),
    );
  }
}
