import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshTokenRepository } from '../domain/refreshTokens/refresh-token.repository.js';
import { UserRepository } from '../domain/users/user.repository.js';
import { UsersController } from '../http/controllers/users.controller.js';
import { RefreshTokenEntity } from '../infrastructure/entities/refresh-token.entity.js';
import { UserEntity } from '../infrastructure/entities/user.entity.js';
import { TypeOrmRefreshTokenRepository } from '../infrastructure/repositories/typeorm-refresh-token.repository.js';
import { TypeOrmUserRepository } from '../infrastructure/repositories/typeorm-user.repository.js';
import { DeleteUserUseCase } from '../useCases/users/delete-user.use-case.js';
import { GetUserUseCase } from '../useCases/users/get-user.use-case.js';
import { GetUsersUseCase } from '../useCases/users/get-users.use-case.js';
import { UpdateUserUseCase } from '../useCases/users/update-user.use-case.js';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, RefreshTokenEntity])],
  controllers: [UsersController],
  providers: [
    { provide: UserRepository, useClass: TypeOrmUserRepository },
    // ユーザー削除でトークンも消す（DeleteUserUseCase）ので、AuthModule ではなくここでバインドする。
    // AuthModule は UsersModule を import して受け取る（UsersModule ⇄ AuthModule の循環を作らない）
    {
      provide: RefreshTokenRepository,
      useClass: TypeOrmRefreshTokenRepository,
    },
    GetUsersUseCase,
    GetUserUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,
  ],
  // Guard（JwtAuthGuard / AdminGuard）が UserRepository を使うので、Guard を使う Module はこの Module を import する
  exports: [UserRepository, RefreshTokenRepository],
})
export class UsersModule {}
