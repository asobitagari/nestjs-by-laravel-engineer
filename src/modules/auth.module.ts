import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from '../http/controllers/auth.controller.js';
import { LoginUseCase } from '../useCases/auth/login.use-case.js';
import { LogoutUseCase } from '../useCases/auth/logout.use-case.js';
import { RefreshTokenUseCase } from '../useCases/auth/refresh-token.use-case.js';
import { RegisterUseCase } from '../useCases/auth/register.use-case.js';
import { UsersModule } from './users.module.js';

@Module({
  imports: [
    // JwtService をグローバルにする。Guard を使うどの Module からも見えるようにし、
    // AuthModule ⇄ UsersModule の循環 import を避ける（design D2。Laravel の auth がどこからでも使える感覚）
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('auth.jwtSecret'),
        signOptions: {
          algorithm: 'HS256',
          expiresIn: config.getOrThrow<number>('auth.accessTokenTtlSeconds'),
        },
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
    UsersModule, // UserRepository・RefreshTokenRepository
  ],
  controllers: [AuthController],
  providers: [
    LoginUseCase,
    RegisterUseCase,
    LogoutUseCase,
    RefreshTokenUseCase,
  ],
})
export class AuthModule {}
