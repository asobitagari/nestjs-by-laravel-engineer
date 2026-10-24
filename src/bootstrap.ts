import { INestApplication, ValidationPipe } from '@nestjs/common';
import { HandlerFilter } from './http/filters/handler.filter.js';
import { validationExceptionFactory } from './http/filters/validation-exception.factory.js';

// main.ts とテストの両方から呼ぶ。本番とテストが同じ設定を通る
export function configureApp(app: INestApplication): INestApplication {
  // routes/api.php の /api プレフィックス
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // $request->validated() と同じく、ルールにないキーは捨てる
      transform: true, // プレーンオブジェクトを Request クラスのインスタンスに変換
      exceptionFactory: validationExceptionFactory, // 422 + Laravel 形式
    }),
  );
  app.useGlobalFilters(new HandlerFilter());
  app.enableCors();
  return app;
}
