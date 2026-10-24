import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './bootstrap.js';

// public/index.php 相当。configureApp() して listen するだけ
async function bootstrap() {
  const app = configureApp(await NestFactory.create(AppModule));
  await app.listen(app.get(ConfigService).getOrThrow<number>('app.port'));
}
await bootstrap();
