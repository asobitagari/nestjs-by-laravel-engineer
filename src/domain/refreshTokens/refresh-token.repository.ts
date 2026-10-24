import type { RefreshToken } from './refresh-token.js';

export abstract class RefreshTokenRepository {
  abstract create(
    userId: number,
    token: string,
    expiresAt: Date,
  ): Promise<RefreshToken>;
  abstract findByToken(token: string): Promise<RefreshToken | null>;
  abstract deleteByToken(token: string): Promise<void>;
  abstract deleteByUserId(userId: number): Promise<void>;
}
