import { MigrationInterface, QueryRunner } from 'typeorm';

// Имя счёта было уникальным на всю таблицу, а не внутри workspace.
// Теперь уникально только среди неудалённых счетов одного workspace.
export class ReplaceSavingsAccountNameUnique1791725600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "savings_account" DROP CONSTRAINT "UQ_64c37cdce2e00a470a3f3ab1514"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_savings_account_workspace_name"
       ON "savings_account" ("workspace_id", "name")
       WHERE "deleted_at" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "UQ_savings_account_workspace_name"`);
    await queryRunner.query(
      `ALTER TABLE "savings_account"
       ADD CONSTRAINT "UQ_64c37cdce2e00a470a3f3ab1514" UNIQUE ("name")`,
    );
  }
}
