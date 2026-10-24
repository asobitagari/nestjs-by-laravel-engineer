import { registerAs } from '@nestjs/config';

// config/auth.php 相当
export default registerAs('auth', () => {
  const jwtSecret = process.env.JWT_SECRET;
  // 署名鍵のないまま動かさない。読み込みの時点で起動を止める
  if (!jwtSecret) {
    throw new Error(
      'JWT_SECRET is not set. Set it in .env (openssl rand -hex 32).',
    );
  }

  return {
    jwtSecret,
    accessTokenTtlSeconds: 60 * 15,
    refreshTokenTtlDays: 30,
    bcryptRounds: Number(process.env.BCRYPT_ROUNDS || 12),
  };
});
