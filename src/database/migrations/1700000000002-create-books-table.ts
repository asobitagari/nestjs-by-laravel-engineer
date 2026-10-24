import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateBooksTable1700000000002 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'books',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'title', type: 'text' },
          { name: 'author_id', type: 'integer' },
          { name: 'price', type: 'integer' },
          {
            name: 'created_at',
            type: 'datetime',
            default: "(datetime('now'))",
          },
          {
            name: 'updated_at',
            type: 'datetime',
            default: "(datetime('now'))",
          },
          { name: 'deleted_at', type: 'datetime', isNullable: true },
        ],
        foreignKeys: [
          {
            columnNames: ['author_id'],
            referencedTableName: 'authors',
            referencedColumnNames: ['id'],
          },
        ],
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('books');
  }
}
