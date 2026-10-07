import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddColumnsBillingPeriodPlanSnapshot1791466400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('billing_period', [
      new TableColumn({
        name: 'planned_amount',
        type: 'decimal',
        precision: 12,
        scale: 2,
        isNullable: true,
      }),
      new TableColumn({
        name: 'plan_snapshot',
        type: 'jsonb',
        isNullable: true,
      }),
      new TableColumn({
        name: 'closed_at',
        type: 'timestamptz',
        precision: 3,
        isNullable: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns('billing_period', [
      'planned_amount',
      'plan_snapshot',
      'closed_at',
    ]);
  }
}
