import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { User } from '../../src/domain/users/user.js';
import {
  createTestApp,
  login,
  loginAsAdmin,
  loginAsNormal,
  seedAdminUser,
  seedNormalUser,
  seedUser,
} from '../helpers.js';

describe('ユーザー /api/users', () => {
  let app: INestApplication;
  // 管理者のトークンを付けたクライアント
  let api: ReturnType<typeof request.agent>;
  let admin: User;
  let normal: User;

  beforeEach(async () => {
    app = await createTestApp();
    admin = await seedAdminUser(app);
    normal = await seedNormalUser(app);
    api = request
      .agent(app.getHttpServer())
      .set('Authorization', `Bearer ${await loginAsAdmin(app)}`);
  });
  afterEach(async () => {
    await app.close();
  });

  const guest = () => request(app.getHttpServer());
  const asNormal = async () =>
    request
      .agent(app.getHttpServer())
      .set('Authorization', `Bearer ${await loginAsNormal(app)}`);
  const normalBody = (overrides: object = {}) => ({
    name: '一般君',
    email: 'normal@example.com',
    ...overrides,
  });

  describe('ユーザーの表現', () => {
    it('一覧の要素は id・name・email・isAdmin だけ（パスワードなし）', async () => {
      const res = await guest().get('/api/users').expect(200);

      expect(res.body).toHaveLength(2);
      for (const user of res.body)
        expect(Object.keys(user).sort()).toEqual([
          'email',
          'id',
          'isAdmin',
          'name',
        ]);
    });

    it('更新のレスポンスにパスワードがない', async () => {
      const res = await api
        .put(`/api/users/${normal.id}`)
        .send(normalBody())
        .expect(200);

      expect(res.body).not.toHaveProperty('password');
    });
  });

  describe('一覧', () => {
    it('トークンなしで一覧 → 200・配列', async () => {
      const res = await guest().get('/api/users').expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('論理削除済みは含まない', async () => {
      await api.delete(`/api/users/${normal.id}`).expect(204);

      const res = await guest().get('/api/users').expect(200);

      expect(res.body).toEqual([
        {
          id: admin.id,
          name: '管理者君',
          email: 'admin@example.com',
          isAdmin: true,
        },
      ]);
    });
  });

  describe('取得', () => {
    it('存在する ID → 200', async () => {
      const res = await guest().get(`/api/users/${normal.id}`).expect(200);

      expect(res.body).toEqual({
        id: normal.id,
        name: '一般君',
        email: 'normal@example.com',
        isAdmin: false,
      });
    });

    it('存在しない ID → 404', async () => {
      await guest().get('/api/users/9999').expect(404);
    });

    it('数値でない ID → 400', async () => {
      await guest().get('/api/users/abc').expect(400);
    });
  });

  describe('更新', () => {
    it('管理者に昇格 → isAdmin true', async () => {
      const res = await api
        .put(`/api/users/${normal.id}`)
        .send(normalBody({ isAdmin: true }))
        .expect(200);

      expect(res.body.isAdmin).toBe(true);
    });

    it('isAdmin 省略 → false になる', async () => {
      await api
        .put(`/api/users/${normal.id}`)
        .send(normalBody({ isAdmin: true }))
        .expect(200);

      const res = await api
        .put(`/api/users/${normal.id}`)
        .send(normalBody())
        .expect(200);

      expect(res.body.isAdmin).toBe(false);
    });

    it('存在しないユーザー → 404', async () => {
      await api
        .put('/api/users/9999')
        .send(normalBody({ email: 'x@example.com' }))
        .expect(404);
    });
  });

  describe('削除', () => {
    it('削除 → 204・その後の GET は 404', async () => {
      await api.delete(`/api/users/${normal.id}`).expect(204);

      await guest().get(`/api/users/${normal.id}`).expect(404);
    });

    it('存在しないユーザー → 404', async () => {
      await api.delete('/api/users/9999').expect(404);
    });
  });

  describe('入力検証', () => {
    it('name 101 文字 → 422・errors.name', async () => {
      const res = await api
        .put(`/api/users/${normal.id}`)
        .send(normalBody({ name: 'あ'.repeat(101) }))
        .expect(422);

      expect(res.body.errors.name).toBeDefined();
    });

    it('email なし → 422・errors.email', async () => {
      const res = await api
        .put(`/api/users/${normal.id}`)
        .send({ name: '一般君' })
        .expect(422);

      expect(res.body.errors.email).toBeDefined();
    });

    it('isAdmin が文字列 → 422・errors.isAdmin', async () => {
      const res = await api
        .put(`/api/users/${normal.id}`)
        .send(normalBody({ isAdmin: 'yes' }))
        .expect(422);

      expect(res.body.errors.isAdmin).toBeDefined();
    });
  });

  describe('更新時のメール重複', () => {
    it('他ユーザーのメール → 409・メールは変わらない', async () => {
      const res = await api
        .put(`/api/users/${normal.id}`)
        .send(normalBody({ email: 'admin@example.com' }))
        .expect(409);

      expect(res.body).toEqual({
        message: 'The email has already been taken.',
      });
      expect((await guest().get(`/api/users/${normal.id}`)).body.email).toBe(
        'normal@example.com',
      );
    });

    it('同じメールのまま名前だけ更新 → 200', async () => {
      const res = await api
        .put(`/api/users/${normal.id}`)
        .send(normalBody({ name: '新しい名前' }))
        .expect(200);

      expect(res.body.name).toBe('新しい名前');
    });
  });

  describe('ユーザー作成エンドポイントはない', () => {
    it('管理者が POST /api/users → 404', async () => {
      await api
        .post('/api/users')
        .send(normalBody({ email: 'new@example.com' }))
        .expect(404);
    });

    it('トークンなしで POST /api/users → 404（401 ではない）', async () => {
      await guest().post('/api/users').send({}).expect(404);
    });
  });

  describe('ユーザーの変更は管理者だけ', () => {
    it('一般ユーザーが管理者を削除 → 403・管理者はまだ GET できる', async () => {
      await (await asNormal()).delete(`/api/users/${admin.id}`).expect(403);

      await guest().get(`/api/users/${admin.id}`).expect(200);
    });

    it('一般ユーザーが自分を昇格 → 403・isAdmin は false のまま', async () => {
      await (
        await asNormal()
      )
        .put(`/api/users/${normal.id}`)
        .send(normalBody({ isAdmin: true }))
        .expect(403);

      expect((await guest().get(`/api/users/${normal.id}`)).body.isAdmin).toBe(
        false,
      );
    });

    it('トークンなしで更新 → 401', async () => {
      await guest()
        .put(`/api/users/${admin.id}`)
        .send(normalBody())
        .expect(401);
    });
  });

  describe('ユーザー削除はトークンに波及する', () => {
    it('削除後のリフレッシュ → 401', async () => {
      const { refreshToken } = await login(app, 'normal@example.com');

      await api.delete(`/api/users/${normal.id}`).expect(204);

      await guest()
        .post('/api/auth/refresh-token')
        .send({ refreshToken })
        .expect(401);
    });

    it('削除後のアクセストークン → 401', async () => {
      const { accessToken } = await login(app, 'normal@example.com');

      await api.delete(`/api/users/${normal.id}`).expect(204);

      await guest()
        .get('/api/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });
  });

  describe('論理削除済みユーザーのメールは再利用できない', () => {
    beforeEach(async () => {
      const deleted = await seedUser(app, {
        name: '削除君',
        email: 'deleted@example.com',
      });
      await api.delete(`/api/users/${deleted.id}`).expect(204);
    });

    it('同じメールで登録 → 409', async () => {
      await guest()
        .post('/api/auth/register')
        .send({
          name: '新人',
          email: 'deleted@example.com',
          password: 'password',
        })
        .expect(409);
    });

    it('別のユーザーのメールに更新 → 409', async () => {
      await api
        .put(`/api/users/${normal.id}`)
        .send(normalBody({ email: 'deleted@example.com' }))
        .expect(409);
    });
  });
});
