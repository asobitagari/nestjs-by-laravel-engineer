import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig from './config/app.config.js';
import authConfig from './config/auth.config.js';
import databaseConfig from './config/database.config.js';
import { AuthModule } from './modules/auth.module.js';
import { AuthorsModule } from './modules/authors.module.js';
import { BooksModule } from './modules/books.module.js';
import { DatabaseModule } from './modules/database.module.js';
import { ProfileModule } from './modules/profile.module.js';
import { UsersModule } from './modules/users.module.js';

// config/app.php の providers 配列に当たる。各 Module をここで import する
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, authConfig, databaseConfig],
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    ProfileModule,
    AuthorsModule,
    BooksModule,
  ],
})
export class AppModule {}
