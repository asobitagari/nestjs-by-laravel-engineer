import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateUsersTable1700000000003 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'name', type: 'text' },
          { name: 'email', type: 'text', isUnique: true },
          { name: 'password', type: 'text' },
          { name: 'is_admin', type: 'boolean', default: false },
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
    await queryRunner.dropTable('users');
  }
}
