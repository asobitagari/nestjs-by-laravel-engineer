import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InvalidCredentialsError } from '../../domain/errors.js';
import { RefreshTokenRepository } from '../../domain/refreshTokens/refresh-token.repository.js';
import { UserRepository } from '../../domain/users/user.repository.js';
import { verifyPassword } from '../../shared/password.js';
import {
  generateRefreshToken,
  refreshTokenExpiresAt,
} from '../../shared/token.js';

@Injectable()
export class LoginUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly jwt: JwtService,
  ) {}

  async execute(input: { email: string; password: string }): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    // メールがない・論理削除済み・パスワード違いを区別しない
    const user = await this.users.findByEmail(input.email);
    if (!user || !(await verifyPassword(input.password, user.password))) {
      throw new InvalidCredentialsError();
    }

    // 権限はトークンに入れない。管理者かどうかは AdminGuard が毎回 DB を見る
    const accessToken = await this.jwt.signAsync({ sub: user.id });
    const refreshToken = generateRefreshToken();
    await this.refreshTokens.create(
      user.id,
      refreshToken,
      refreshTokenExpiresAt(),
    );

    return { accessToken, refreshToken };
  }
}
