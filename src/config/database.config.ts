import { registerAs } from '@nestjs/config';

// config/database.php 相当
export default registerAs('database', () => ({
  database: process.env.DATABASE_URL || 'sqlite.db',
}));
