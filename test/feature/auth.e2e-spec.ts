import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { RefreshTokenRepository } from '../../src/domain/refreshTokens/refresh-token.repository.js';
import { UserRepository } from '../../src/domain/users/user.repository.js';
import { createTestApp, login, seedAdminUser, seedUser } from '../helpers.js';

const INVALID_CREDENTIALS = {
  message: 'These credentials do not match our records.',
};
const INVALID_REFRESH_TOKEN = { message: 'Invalid or expired refresh token.' };

function decode(jwt: string) {
  const [header, payload] = jwt
    .split('.')
    .slice(0, 2)
    .map((part) => JSON.parse(Buffer.from(part, 'base64url').toString()));
  return { header, payload };
}

describe('認証 /api/auth', () => {
  let app: INestApplication;
  let api: ReturnType<typeof request>;

  beforeEach(async () => {
    app = await createTestApp();
    api = request(app.getHttpServer());
  });
  afterEach(async () => {
    await app.close();
  });

  const register = (body: object) => api.post('/api/auth/register').send(body);
  const refresh = (refreshToken: string) =>
    api.post('/api/auth/refresh-token').send({ refreshToken });

  describe('アクセストークンの形式', () => {
    it('HS256・sub がユーザー ID・有効期限 900 秒', async () => {
      const admin = await seedAdminUser(app);
      const { accessToken } = await login(app, 'admin@example.com');

      const { header, payload } = decode(accessToken);

      expect(header.alg).toBe('HS256');
      expect(payload.sub).toBe(admin.id);
      expect(payload.exp - payload.iat).toBe(900);
    });

    it('権限を含まない（sub・iat・exp だけ）', async () => {
      await seedAdminUser(app);
      const { accessToken } = await login(app, 'admin@example.com');

      expect(Object.keys(decode(accessToken).payload).sort()).toEqual([
        'exp',
        'iat',
        'sub',
      ]);
    });
  });

  describe('ログイン', () => {
    beforeEach(async () => {
      await seedAdminUser(app);
    });

    it('成功 → 200・accessToken と refreshToken', async () => {
      const res = await api
        .post('/api/auth/login')
        .send({ email: 'admin@example.com', password: 'password' })
        .expect(200);

      expect(Object.keys(res.body).sort()).toEqual([
        'accessToken',
        'refreshToken',
      ]);
      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.refreshToken).toMatch(/^[0-9a-f]{64}$/);
    });

    it('2 回ログイン → 別の refreshToken・どちらでも再発行できる', async () => {
      const first = await login(app, 'admin@example.com');
      const second = await login(app, 'admin@example.com');

      expect(first.refreshToken).not.toBe(second.refreshToken);
      await refresh(first.refreshToken).expect(200);
      await refresh(second.refreshToken).expect(200);
    });
  });

  describe('ログイン失敗', () => {
    beforeEach(async () => {
      await seedAdminUser(app);
    });

    it('パスワード違い → 401', async () => {
      const res = await api
        .post('/api/auth/login')
        .send({ email: 'admin@example.com', password: 'wrong-password' })
        .expect(401);

      expect(res.body).toEqual(INVALID_CREDENTIALS);
    });

    it('存在しないメール → 401', async () => {
      const res = await api
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'password' })
        .expect(401);

      expect(res.body).toEqual(INVALID_CREDENTIALS);
    });

    it('論理削除済みユーザー → 401', async () => {
      const deleted = await seedUser(app, {
        name: '削除君',
        email: 'deleted@example.com',
      });
      await app.get(UserRepository).delete(deleted.id);

      const res = await api
        .post('/api/auth/login')
        .send({ email: 'deleted@example.com', password: 'password' })
        .expect(401);

      expect(res.body).toEqual(INVALID_CREDENTIALS);
    });
  });

  describe('ユーザー登録', () => {
    const body = {
      name: 'テスト',
      email: 'test@example.com',
      password: 'password',
    };

    it('成功 → 201・パスワードを返さない', async () => {
      const res = await register(body).expect(201);

      expect(res.body).toEqual({
        id: expect.any(Number),
        name: 'テスト',
        email: 'test@example.com',
        isAdmin: false,
      });
      expect(res.body).not.toHaveProperty('password');
    });

    it('登録したユーザーでログインできる', async () => {
      await register(body).expect(201);

      await api
        .post('/api/auth/login')
        .send({ email: body.email, password: body.password })
        .expect(200);
    });

    it('isAdmin を送っても一般ユーザー', async () => {
      const res = await register({ ...body, isAdmin: true }).expect(201);

      expect(res.body.isAdmin).toBe(false);
    });
  });

  describe('登録時のメール重複', () => {
    it('既存メール → 409・ユーザーは増えない', async () => {
      await seedAdminUser(app);
      const before = (await api.get('/api/users').expect(200)).body.length;

      const res = await register({
        name: 'テスト',
        email: 'admin@example.com',
        password: 'password',
      }).expect(409);

      expect(res.body).toEqual({
        message: 'The email has already been taken.',
      });
      expect((await api.get('/api/users').expect(200)).body).toHaveLength(
        before,
      );
    });

    it('同じリクエストを 2 回 → 201・409', async () => {
      const body = {
        name: 'テスト',
        email: 'test@example.com',
        password: 'password',
      };

      await register(body).expect(201);
      await register(body).expect(409);
    });
  });

  describe('ログイン・登録の入力検証', () => {
    it('ログインで password なし → 422・errors.password', async () => {
      const res = await api
        .post('/api/auth/login')
        .send({ email: 'admin@example.com' })
        .expect(422);

      expect(res.body.errors.password).toBeDefined();
    });

    it('ログインで email 形式不正 → 422・errors.email', async () => {
      const res = await api
        .post('/api/auth/login')
        .send({ email: 'x', password: 'password' })
        .expect(422);

      expect(res.body.errors.email).toBeDefined();
    });

    it('登録で password 8 文字 → 201', async () => {
      await register({
        name: 'テスト',
        email: 'test@example.com',
        password: '12345678',
      }).expect(201);
    });

    it('登録で password 7 文字 → 422・errors.password', async () => {
      const res = await register({
        name: 'テスト',
        email: 'test@example.com',
        password: '1234567',
      }).expect(422);

      expect(res.body.errors.password).toBeDefined();
    });

    it('登録で name 101 文字 → 422・errors.name', async () => {
      const res = await register({
        name: 'あ'.repeat(101),
        email: 'test@example.com',
        password: 'password',
      }).expect(422);

      expect(res.body.errors.name).toBeDefined();
    });

    it('登録で必須項目なし → 422・message と errors', async () => {
      const res = await register({}).expect(422);

      expect(res.body.message).toEqual(expect.any(String));
      expect(Object.keys(res.body.errors).sort()).toEqual([
        'email',
        'name',
        'password',
      ]);
    });
  });

  describe('ログアウト', () => {
    it('204・ログアウト後はリフレッシュできない', async () => {
      await seedAdminUser(app);
      const { refreshToken } = await login(app, 'admin@example.com');

      const res = await api
        .post('/api/auth/logout')
        .send({ token: refreshToken })
        .expect(204);

      expect(res.text).toBe('');
      await refresh(refreshToken).expect(401);
    });

    it('存在しないトークン → 204', async () => {
      await api.post('/api/auth/logout').send({ token: 'unknown' }).expect(204);
    });

    it('token なし → 422・errors.token', async () => {
      const res = await api.post('/api/auth/logout').send({}).expect(422);

      expect(res.body.errors.token).toBeDefined();
    });
  });

  describe('アクセストークンの再発行', () => {
    beforeEach(async () => {
      await seedAdminUser(app);
    });

    it('成功 → 200・accessToken だけ', async () => {
      const { refreshToken } = await login(app, 'admin@example.com');

      const res = await refresh(refreshToken).expect(200);

      expect(Object.keys(res.body)).toEqual(['accessToken']);
    });

    it('同じトークンで 2 回 → どちらも 200', async () => {
      const { refreshToken } = await login(app, 'admin@example.com');

      await refresh(refreshToken).expect(200);
      await refresh(refreshToken).expect(200);
    });

    it('refreshToken なし → 422', async () => {
      const res = await api
        .post('/api/auth/refresh-token')
        .send({})
        .expect(422);

      expect(res.body.errors.refreshToken).toBeDefined();
    });
  });

  describe('無効なリフレッシュトークン', () => {
    const minutes = (n: number) => new Date(Date.now() + n * 60 * 1000);

    it('存在しないトークン → 401', async () => {
      const res = await refresh('unknown').expect(401);

      expect(res.body).toEqual(INVALID_REFRESH_TOKEN);
    });

    it('期限の 1 分前 → 200', async () => {
      const admin = await seedAdminUser(app);
      await app
        .get(RefreshTokenRepository)
        .create(admin.id, 'almost-expired', minutes(1));

      await refresh('almost-expired').expect(200);
    });

    it('期限の 1 分後 → 401・もう一度送っても 401（削除されている）', async () => {
      const admin = await seedAdminUser(app);
      const tokens = app.get(RefreshTokenRepository);
      await tokens.create(admin.id, 'expired', minutes(-1));

      const res = await refresh('expired').expect(401);

      expect(res.body).toEqual(INVALID_REFRESH_TOKEN);
      expect(await tokens.findByToken('expired')).toBeNull();
      await refresh('expired').expect(401);
    });
  });
});
