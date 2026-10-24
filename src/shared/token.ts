import { randomBytes } from 'node:crypto';

const REFRESH_TOKEN_TTL_DAYS = 30;

// 32 バイトのランダム値を hex 文字列にする（64 文字）
export function generateRefreshToken(): string {
  return randomBytes(32).toString('hex');
}

export function refreshTokenExpiresAt(now: Date = new Date()): Date {
  return new Date(now.getTime() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}
