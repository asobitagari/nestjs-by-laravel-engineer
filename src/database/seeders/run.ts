import dataSource from '../data-source.js';
import { DatabaseSeeder } from './database.seeder.js';

// php artisan db:seed 相当。Nest のアプリは起動せず、DataSource だけを使う
await dataSource.initialize();
try {
  await DatabaseSeeder.run(dataSource, Number(process.env.BCRYPT_ROUNDS || 12));
  console.log('Database seeding completed successfully.');
} finally {
  await dataSource.destroy();
}
