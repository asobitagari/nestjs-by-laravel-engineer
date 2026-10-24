import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import type { User } from '../../src/domain/users/user.js';
import { UserRepository } from '../../src/domain/users/user.repository.js';
import {
  createTestApp,
  login,
  loginAsAdmin,
  loginAsNormal,
  seedAdminUser,
  seedNormalUser,
  seedUser,
} from '../helpers.js';

const UNAUTHENTICATED = { message: 'Unauthenticated.' };

describe('アクセス制御（JwtAuthGuard / AdminGuard）', () => {
  let app: INestApplication;
  let api: ReturnType<typeof request>;
  let normal: User;

  beforeEach(async () => {
    app = await createTestApp();
    await seedAdminUser(app);
    normal = await seedNormalUser(app);
    api = request(app.getHttpServer());
  });
  afterEach(async () => {
    await app.close();
  });

  const profile = (authorization?: string) => {
    const req = api.get('/api/profile');
    return authorization ? req.set('Authorization', authorization) : req;
  };
  const createAuthor = (token: string, body: object = { name: '太宰治' }) =>
    api.post('/api/authors').set('Authorization', `Bearer ${token}`).send(body);

  describe('Bearer トークン認証', () => {
    it('ログインで得たトークン → 通る', async () => {
      await profile(`Bearer ${await loginAsNormal(app)}`).expect(200);
    });

    it('再発行したトークン → 通る', async () => {
      const { refreshToken } = await login(app, 'normal@example.com');
      const { body } = await api
        .post('/api/auth/refresh-token')
        .send({ refreshToken })
        .expect(200);

      await profile(`Bearer ${body.accessToken}`).expect(200);
    });
  });

  describe('認証失敗は 401', () => {
    it('ヘッダーなし → 401', async () => {
      const res = await profile().expect(401);

      expect(res.body).toEqual(UNAUTHENTICATED);
    });

    it('Bearer 形式でない → 401', async () => {
      const res = await profile('Basic abc').expect(401);

      expect(res.body).toEqual(UNAUTHENTICATED);
    });

    it('不正なトークン → 401', async () => {
      await profile('Bearer not-a-jwt').expect(401);
    });

    it('別のシークレットで署名 → 401', async () => {
      const forged = await new JwtService({ secret: 'other-secret' }).signAsync(
        { sub: normal.id },
      );

      const res = await profile(`Bearer ${forged}`).expect(401);

      expect(res.body).toEqual(UNAUTHENTICATED);
    });

    it('有効期限切れ → 401', async () => {
      const expired = await app
        .get(JwtService)
        .signAsync({ sub: normal.id }, { expiresIn: -1 });

      const res = await profile(`Bearer ${expired}`).expect(401);

      expect(res.body).toEqual(UNAUTHENTICATED);
    });

    it('トークンは有効だがユーザーが論理削除済み → 401', async () => {
      const token = await loginAsNormal(app);
      await app.get(UserRepository).delete(normal.id);

      const res = await profile(`Bearer ${token}`).expect(401);

      expect(res.body).toEqual(UNAUTHENTICATED);
    });
  });

  describe('管理者認可', () => {
    it('管理者 → 通る（201）', async () => {
      await createAuthor(await loginAsAdmin(app)).expect(201);
    });

    it('一般ユーザー → 403', async () => {
      const res = await createAuthor(await loginAsNormal(app)).expect(403);

      expect(res.body).toEqual({ message: 'This action is unauthorized.' });
    });
  });

  describe('権限の変更は次のリクエストから効く', () => {
    it('昇格した直後 → 同じトークンで 201', async () => {
      const normalToken = await loginAsNormal(app);
      const adminToken = await loginAsAdmin(app);

      await api
        .put(`/api/users/${normal.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '一般君', email: 'normal@example.com', isAdmin: true })
        .expect(200);

      await createAuthor(normalToken).expect(201);
    });

    it('降格した直後 → 同じトークンで 403', async () => {
      const b = await seedUser(app, {
        name: '管理者 B',
        email: 'admin-b@example.com',
        isAdmin: true,
      });
      const bToken = (await login(app, 'admin-b@example.com')).accessToken;
      const aToken = await loginAsAdmin(app);

      await api
        .put(`/api/users/${b.id}`)
        .set('Authorization', `Bearer ${aToken}`)
        .send({
          name: '管理者 B',
          email: 'admin-b@example.com',
          isAdmin: false,
        })
        .expect(200);

      await createAuthor(bToken).expect(403);
    });
  });

  describe('認証は認可より先・ボディの検証より先', () => {
    it('未認証で管理者専用 → 401（403 ではない）', async () => {
      await api.post('/api/authors').send({ name: '太宰治' }).expect(401);
    });

    it('一般ユーザーが不正なボディ → 403（422 ではない）', async () => {
      await createAuthor(await loginAsNormal(app), {}).expect(403);
    });
  });
});
