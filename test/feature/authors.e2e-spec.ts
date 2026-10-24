import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { BookRepository } from '../../src/domain/books/book.repository.js';
import {
  createTestApp,
  loginAsAdmin,
  loginAsNormal,
  seedAdminUser,
  seedNormalUser,
} from '../helpers.js';

describe('著者 /api/authors', () => {
  let app: INestApplication;
  // 管理者のトークンを付けたクライアント
  let api: ReturnType<typeof request.agent>;

  beforeEach(async () => {
    app = await createTestApp();
    await seedAdminUser(app);
    await seedNormalUser(app);
    api = request
      .agent(app.getHttpServer())
      .set('Authorization', `Bearer ${await loginAsAdmin(app)}`);
  });
  afterEach(async () => {
    await app.close();
  });

  const create = (body: object) => api.post('/api/authors').send(body);

  describe('著者の表現', () => {
    it('email あり → id・name・email だけを返す', async () => {
      const { body: created } = await create({
        name: '夏目漱石',
        email: 'soseki@example.com',
      }).expect(201);

      const res = await api.get(`/api/authors/${created.id}`).expect(200);

      expect(res.body).toEqual({
        id: created.id,
        name: '夏目漱石',
        email: 'soseki@example.com',
      });
    });

    it('email 未設定 → null', async () => {
      const { body: created } = await create({ name: '太宰治' }).expect(201);

      const res = await api.get(`/api/authors/${created.id}`).expect(200);

      expect(res.body.email).toBeNull();
    });
  });

  describe('一覧', () => {
    it('0 件 → []', async () => {
      const res = await api.get('/api/authors').expect(200);

      expect(res.body).toEqual([]);
    });

    it('複数件 → 配列', async () => {
      await create({ name: '夏目漱石' });
      await create({ name: '芥川龍之介' });

      const res = await api.get('/api/authors').expect(200);

      expect(res.body).toHaveLength(2);
    });

    it('論理削除済みは含まない', async () => {
      const ids: number[] = [];
      for (const name of ['夏目漱石', '芥川龍之介', '太宰治'])
        ids.push((await create({ name })).body.id);
      await api.delete(`/api/authors/${ids[1]}`).expect(204);

      const res = await api.get('/api/authors').expect(200);

      expect(res.body.map((a: { id: number }) => a.id)).toEqual([
        ids[0],
        ids[2],
      ]);
    });
  });

  describe('取得', () => {
    it('存在する ID → 200', async () => {
      const { body: created } = await create({ name: '夏目漱石' });

      const res = await api.get(`/api/authors/${created.id}`).expect(200);

      expect(res.body.name).toBe('夏目漱石');
    });

    it('存在しない ID → 404', async () => {
      const res = await api.get('/api/authors/9999').expect(404);

      expect(res.body).toEqual({ message: 'Not Found.' });
    });

    it('数値でない ID → 400', async () => {
      const res = await api.get('/api/authors/abc').expect(400);

      expect(res.body).toEqual({
        message: 'Validation failed (numeric string is expected)',
      });
    });
  });

  describe('作成', () => {
    it('作成 → 201・id 付き', async () => {
      const res = await create({
        name: '太宰治',
        email: 'dazai@example.com',
      }).expect(201);

      expect(res.body).toEqual({
        id: expect.any(Number),
        name: '太宰治',
        email: 'dazai@example.com',
      });
    });

    it('作成後に取得できる', async () => {
      const { body: created } = await create({ name: '太宰治' });

      const res = await api.get(`/api/authors/${created.id}`).expect(200);

      expect(res.body.name).toBe('太宰治');
    });
  });

  describe('更新', () => {
    it('更新 → 200・email を省略すると null', async () => {
      const { body: created } = await create({
        name: '夏目漱石',
        email: 'soseki@example.com',
      });

      const res = await api
        .put(`/api/authors/${created.id}`)
        .send({ name: '新しい名前' })
        .expect(200);

      expect(res.body).toEqual({
        id: created.id,
        name: '新しい名前',
        email: null,
      });
    });

    it('存在しない著者 → 404', async () => {
      await api
        .put('/api/authors/9999')
        .send({ name: '新しい名前' })
        .expect(404);
    });
  });

  describe('削除', () => {
    it('削除 → 204・その後の GET は 404', async () => {
      const { body: created } = await create({ name: '夏目漱石' });

      const res = await api.delete(`/api/authors/${created.id}`).expect(204);

      expect(res.text).toBe('');
      await api.get(`/api/authors/${created.id}`).expect(404);
    });

    it('2 回削除 → 1 回目 204・2 回目 404', async () => {
      const { body: created } = await create({ name: '夏目漱石' });

      await api.delete(`/api/authors/${created.id}`).expect(204);
      await api.delete(`/api/authors/${created.id}`).expect(404);
    });
  });

  describe('入力検証', () => {
    it('name 100 文字 → 201', async () => {
      await create({ name: 'あ'.repeat(100) }).expect(201);
    });

    it('name 101 文字 → 422・errors.name', async () => {
      const res = await create({ name: 'あ'.repeat(101) }).expect(422);

      expect(res.body.errors.name).toBeDefined();
    });

    it('name なし → 422・errors.name', async () => {
      const res = await create({}).expect(422);

      expect(res.body.errors.name).toBeDefined();
    });

    it('email 形式不正 → 422・errors.email', async () => {
      const res = await create({
        name: '太宰治',
        email: 'not-an-email',
      }).expect(422);

      expect(res.body.errors.email).toBeDefined();
    });

    it('更新でも name なし → 422', async () => {
      const { body: created } = await create({ name: '夏目漱石' });

      const res = await api
        .put(`/api/authors/${created.id}`)
        .send({})
        .expect(422);

      expect(res.body.errors.name).toBeDefined();
    });
  });

  describe('著者の変更は管理者だけ', () => {
    const guest = () => request(app.getHttpServer());

    it('トークンなしで作成 → 401・著者は増えない', async () => {
      const res = await guest()
        .post('/api/authors')
        .send({ name: '太宰治' })
        .expect(401);

      expect(res.body).toEqual({ message: 'Unauthenticated.' });
      expect((await api.get('/api/authors')).body).toEqual([]);
    });

    it('トークンなしで更新・削除 → 401', async () => {
      const { body: created } = await create({ name: '夏目漱石' });

      await guest()
        .put(`/api/authors/${created.id}`)
        .send({ name: 'x' })
        .expect(401);
      await guest().delete(`/api/authors/${created.id}`).expect(401);
    });

    it('一般ユーザーが作成 → 403', async () => {
      const token = await loginAsNormal(app);

      const res = await guest()
        .post('/api/authors')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '太宰治' })
        .expect(403);

      expect(res.body).toEqual({ message: 'This action is unauthorized.' });
    });

    it('一般ユーザーが削除 → 403・まだ GET できる', async () => {
      const { body: created } = await create({ name: '夏目漱石' });
      const token = await loginAsNormal(app);

      await guest()
        .delete(`/api/authors/${created.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      await guest().get(`/api/authors/${created.id}`).expect(200);
    });

    it('トークンなしで一覧・取得 → 200', async () => {
      const { body: created } = await create({ name: '夏目漱石' });

      await guest().get('/api/authors').expect(200);
      await guest().get(`/api/authors/${created.id}`).expect(200);
    });
  });

  describe('著者の削除は書籍に波及しない', () => {
    it('著者削除後も書籍は取得でき、authorId はそのまま', async () => {
      const { body: author } = await create({ name: '夏目漱石' });
      const book = await app
        .get(BookRepository)
        .create({ title: 'こころ', authorId: author.id, price: 600 });

      await api.delete(`/api/authors/${author.id}`).expect(204);

      const res = await api.get(`/api/books/${book.id}`).expect(200);
      expect(res.body.authorId).toBe(author.id);
    });

    it('著者削除後も書籍一覧の件数は変わらない', async () => {
      const { body: soseki } = await create({ name: '夏目漱石' });
      const { body: dazai } = await create({ name: '太宰治' });
      const books = app.get(BookRepository);
      await books.create({ title: 'こころ', authorId: soseki.id, price: 600 });
      await books.create({
        title: '坊っちゃん',
        authorId: soseki.id,
        price: 500,
      });
      for (const title of ['人間失格', '走れメロス', '斜陽'])
        await books.create({ title, authorId: dazai.id, price: 500 });

      await api.delete(`/api/authors/${soseki.id}`).expect(204);

      expect((await api.get('/api/books')).body).toHaveLength(5);
    });
  });
});
