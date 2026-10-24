import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateRefreshTokensTable1700000000004 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'refresh_tokens',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'user_id', type: 'integer' },
          { name: 'token', type: 'text', isUnique: true },
          { name: 'expires_at', type: 'datetime' },
          {
            name: 'created_at',
            type: 'datetime',
            default: "(datetime('now'))",
          },
        ],
        foreignKeys: [
          {
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('refresh_tokens');
  }
}
