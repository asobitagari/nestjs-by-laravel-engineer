import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateAuthorsTable1700000000001 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'authors',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'name', type: 'text' },
          { name: 'email', type: 'text', isNullable: true },
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
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('authors');
  }
}
