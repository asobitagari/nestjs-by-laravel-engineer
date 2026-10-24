import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { entities } from '../database/entities.js';
import { migrations } from '../database/migrations/index.js';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'better-sqlite3',
        database: config.getOrThrow<string>('database.database'),
        entities,
        migrations,
        // スキーマ変更は必ずマイグレーションで行う。起動時に未適用のものを流す
        synchronize: false,
        migrationsRun: true,
      }),
    }),
  ],
})
export class DatabaseModule {}
