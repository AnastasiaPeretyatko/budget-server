import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

// Первичный ключ transaction_tags — (transaction_id, tag_id): он ускоряет поиск
// по транзакции, но не по тегу. Для подсчёта использования тегов нужен
// отдельный индекс по tag_id.
export class AddIndexTransactionTagsTagId1791380000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createIndex(
      'transaction_tags',
      new TableIndex({
        name: 'IDX_transaction_tags_tag_id',
        columnNames: ['tag_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'transaction_tags',
      'IDX_transaction_tags_tag_id',
    );
  }
}
