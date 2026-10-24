import { existsSync } from 'node:fs';
import { DataSource } from 'typeorm';
import { entities } from './entities.js';
import { migrations } from './migrations/index.js';

// Nest の外（typeorm CLI・シーダー）から読まれるので、ここで .env を読む
if (existsSync('.env')) process.loadEnvFile('.env');

export default new DataSource({
  type: 'better-sqlite3',
  database: process.env.DATABASE_URL || 'sqlite.db',
  entities,
  migrations,
  synchronize: false,
});
