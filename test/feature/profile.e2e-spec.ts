import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { User } from '../../src/domain/users/user.js';
import {
  createTestApp,
  loginAsNormal,
  seedAdminUser,
  seedNormalUser,
} from '../helpers.js';

describe('プロフィール /api/profile', () => {
  let app: INestApplication;
  // 一般ユーザー（normal@example.com）のトークンを付けたクライアント
  let api: ReturnType<typeof request.agent>;
  let accessToken: string;
  let admin: User;
  let normal: User;

  beforeEach(async () => {
    app = await createTestApp();
    admin = await seedAdminUser(app);
    normal = await seedNormalUser(app);
    accessToken = await loginAsNormal(app);
    api = request
      .agent(app.getHttpServer())
      .set('Authorization', `Bearer ${accessToken}`);
  });
  afterEach(async () => {
    await app.close();
  });

  const guest = () => request(app.getHttpServer());
  const loginWith = (email: string, password: string) =>
    guest().post('/api/auth/login').send({ email, password });
  const changePassword = (body: object) =>
    api.put('/api/profile/password').send(body);

  describe('取得', () => {
    it('一般ユーザー → 200・パスワードなし', async () => {
      const res = await api.get('/api/profile').expect(200);

      expect(res.body).toEqual({
        id: normal.id,
        name: '一般君',
        email: 'normal@example.com',
        isAdmin: false,
      });
    });

    it('管理者 → isAdmin true', async () => {
      const { accessToken: adminToken } = (
        await loginWith('admin@example.com', 'password')
      ).body;

      const res = await guest()
        .get('/api/profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.isAdmin).toBe(true);
    });
  });

  describe('名前の変更', () => {
    it('名前更新 → 200・続く GET でも同じ値', async () => {
      const res = await api
        .put('/api/profile')
        .send({ name: '新しい名前' })
        .expect(200);

      expect(res.body.name).toBe('新しい名前');
      expect((await api.get('/api/profile')).body.name).toBe('新しい名前');
    });

    it('他のユーザーは変わらない', async () => {
      await api.put('/api/profile').send({ name: '新しい名前' }).expect(200);

      expect((await guest().get(`/api/users/${admin.id}`)).body.name).toBe(
        '管理者君',
      );
    });
  });

  describe('メールと権限は本人から変更できない', () => {
    it('email を送っても変わらない', async () => {
      const res = await api
        .put('/api/profile')
        .send({ name: '新しい名前', email: 'other@example.com' })
        .expect(200);

      expect(res.body.email).toBe('normal@example.com');
    });

    it('isAdmin を送っても false のまま・管理者専用は 403 のまま', async () => {
      const res = await api
        .put('/api/profile')
        .send({ name: '新しい名前', isAdmin: true })
        .expect(200);

      expect(res.body.isAdmin).toBe(false);
      await api.post('/api/authors').send({ name: '太宰治' }).expect(403);
    });
  });

  describe('名前の入力検証', () => {
    it('name 100 文字 → 200', async () => {
      await api
        .put('/api/profile')
        .send({ name: 'あ'.repeat(100) })
        .expect(200);
    });

    it('name 101 文字 → 422・名前は変わらない', async () => {
      const res = await api
        .put('/api/profile')
        .send({ name: 'あ'.repeat(101) })
        .expect(422);

      expect(res.body.errors.name).toBeDefined();
      expect((await api.get('/api/profile')).body.name).toBe('一般君');
    });

    it('name なし → 422', async () => {
      const res = await api.put('/api/profile').send({}).expect(422);

      expect(res.body.errors.name).toBeDefined();
    });
  });

  describe('パスワードの変更', () => {
    it('204・新パスワードでログインでき、旧パスワードでは 401', async () => {
      const res = await changePassword({
        currentPassword: 'password',
        newPassword: 'new-password',
      }).expect(204);

      expect(res.text).toBe('');
      await loginWith('normal@example.com', 'new-password').expect(200);
      await loginWith('normal@example.com', 'password').expect(401);
    });

    it('変更前に発行したアクセストークンは使える', async () => {
      await changePassword({
        currentPassword: 'password',
        newPassword: 'new-password',
      }).expect(204);

      await guest()
        .get('/api/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('現在のパスワード不一致', () => {
    it('現在のパスワード違い → 401・まだ旧パスワードでログインできる', async () => {
      const res = await changePassword({
        currentPassword: 'wrong-password',
        newPassword: 'new-password',
      }).expect(401);

      expect(res.body).toEqual({
        message: 'The current password is incorrect.',
      });
      await loginWith('normal@example.com', 'password').expect(200);
    });

    it('大文字小文字の違い → 401', async () => {
      await changePassword({
        currentPassword: 'PASSWORD',
        newPassword: 'new-password',
      }).expect(401);
    });
  });

  describe('パスワード変更の入力検証', () => {
    it('newPassword 8 文字 → 204', async () => {
      await changePassword({
        currentPassword: 'password',
        newPassword: '12345678',
      }).expect(204);
    });

    it('newPassword 7 文字 → 422・errors.newPassword', async () => {
      const res = await changePassword({
        currentPassword: 'password',
        newPassword: '1234567',
      }).expect(422);

      expect(res.body.errors.newPassword).toBeDefined();
    });

    it('currentPassword なし → 422・errors.currentPassword', async () => {
      const res = await changePassword({ newPassword: 'new-password' }).expect(
        422,
      );

      expect(res.body.errors.currentPassword).toBeDefined();
    });
  });

  describe('プロフィールは要認証', () => {
    it('トークンなしで取得 → 401', async () => {
      const res = await guest().get('/api/profile').expect(401);

      expect(res.body).toEqual({ message: 'Unauthenticated.' });
    });

    it('トークンなしで名前変更 → 401', async () => {
      await guest()
        .put('/api/profile')
        .send({ name: '新しい名前' })
        .expect(401);
    });

    it('トークンなしでパスワード変更 → 401（422 ではない）', async () => {
      await guest().put('/api/profile/password').send({}).expect(401);
    });
  });
});
