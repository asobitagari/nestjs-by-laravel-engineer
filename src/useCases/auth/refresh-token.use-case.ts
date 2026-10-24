import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InvalidRefreshTokenError } from '../../domain/errors.js';
import { RefreshTokenRepository } from '../../domain/refreshTokens/refresh-token.repository.js';

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly jwt: JwtService,
  ) {}

  // リフレッシュトークンはローテーションせず、新しいアクセストークンだけを返す
  async execute(refreshToken: string): Promise<{ accessToken: string }> {
    const stored = await this.refreshTokens.findByToken(refreshToken);
    if (!stored) throw new InvalidRefreshTokenError();

    // 期限の判定は SQL ではなく Date で行う（design D10）
    if (stored.expiresAt <= new Date()) {
      await this.refreshTokens.deleteByToken(refreshToken);
      throw new InvalidRefreshTokenError();
    }

    return { accessToken: await this.jwt.signAsync({ sub: stored.userId }) };
  }
}
