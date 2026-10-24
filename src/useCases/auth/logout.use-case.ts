import { Injectable } from '@nestjs/common';
import { RefreshTokenRepository } from '../../domain/refreshTokens/refresh-token.repository.js';

@Injectable()
export class LogoutUseCase {
  constructor(private readonly refreshTokens: RefreshTokenRepository) {}

  // 存在しないトークンでもエラーにしない。アクセストークンは有効期限まで使える
  async execute(token: string): Promise<void> {
    await this.refreshTokens.deleteByToken(token);
  }
}
