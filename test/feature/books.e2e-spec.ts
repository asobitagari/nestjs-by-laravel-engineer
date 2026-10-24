import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AuthorRepository } from '../../src/domain/authors/author.repository.js';
import {
  createTestApp,
  loginAsAdmin,
  loginAsNormal,
  seedAdminUser,
  seedNormalUser,
} from '../helpers.js';

const AUTHOR_ID_INVALID = 'The selected author id is invalid.';

describe('書籍 /api/books', () => {
  let app: INestApplication;
  // 管理者のトークンを付けたクライアント
  let api: ReturnType<typeof request.agent>;
  let authorId: number;

  beforeEach(async () => {
    app = await createTestApp();
    await seedAdminUser(app);
    await seedNormalUser(app);
    api = request
      .agent(app.getHttpServer())
      .set('Authorization', `Bearer ${await loginAsAdmin(app)}`);
    authorId = (await app.get(AuthorRepository).create({ name: '夏目漱石' }))
      .id;
  });
  afterEach(async () => {
    await app.close();
  });

  const guest = () => request(app.getHttpServer());
  const create = (body: object) => api.post('/api/books').send(body);
  const valid = () => ({ title: 'こころ', authorId, price: 600 });
  const count = async () => (await guest().get('/api/books')).body.length;

  describe('書籍の表現', () => {
    it('個別取得 → id・title・authorId・price だけ', async () => {
      const { body: created } = await create(valid()).expect(201);

      const res = await guest().get(`/api/books/${created.id}`).expect(200);

      expect(res.body).toEqual({
        id: created.id,
        title: 'こころ',
        authorId,
        price: 600,
      });
    });

    it('一覧の要素も 4 キーだけ', async () => {
      await create(valid());

      const res = await guest().get('/api/books').expect(200);

      expect(Object.keys(res.body[0]).sort()).toEqual([
        'authorId',
        'id',
        'price',
        'title',
      ]);
    });
  });

  describe('一覧', () => {
    it('0 件 → []', async () => {
      const res = await guest().get('/api/books').expect(200);

      expect(res.body).toEqual([]);
    });

    it('論理削除済みは含まない', async () => {
      const { body: first } = await create(valid());
      await create({ ...valid(), title: '坊っちゃん' });
      await api.delete(`/api/books/${first.id}`).expect(204);

      const res = await guest().get('/api/books').expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('坊っちゃん');
    });
  });

  describe('取得', () => {
    it('存在する ID → 200', async () => {
      const { body: created } = await create(valid());

      const res = await guest().get(`/api/books/${created.id}`).expect(200);

      expect(res.body.title).toBe('こころ');
    });

    it('存在しない ID → 404', async () => {
      await guest().get('/api/books/9999').expect(404);
    });

    it('数値でない ID → 400', async () => {
      await guest().get('/api/books/abc').expect(400);
    });
  });

  describe('作成', () => {
    it('作成 → 201・id 付き', async () => {
      const res = await create({
        title: '人間失格',
        authorId,
        price: 550,
      }).expect(201);

      expect(res.body).toEqual({
        id: expect.any(Number),
        title: '人間失格',
        authorId,
        price: 550,
      });
    });

    it('0 件から 1 件作成 → 一覧に 1 件', async () => {
      const { body: created } = await create(valid());

      const res = await guest().get('/api/books').expect(200);

      expect(res.body).toEqual([created]);
    });
  });

  describe('更新', () => {
    it('price 600 → 650', async () => {
      const { body: created } = await create(valid());

      const res = await api
        .put(`/api/books/${created.id}`)
        .send({ ...valid(), price: 650 })
        .expect(200);

      expect(res.body.price).toBe(650);
    });

    it('存在しない書籍 → 404', async () => {
      await api.put('/api/books/9999').send(valid()).expect(404);
    });
  });

  describe('削除', () => {
    it('削除 → 204・その後の GET は 404', async () => {
      const { body: created } = await create(valid());

      await api.delete(`/api/books/${created.id}`).expect(204);

      await guest().get(`/api/books/${created.id}`).expect(404);
    });

    it('存在しない書籍 → 404', async () => {
      await api.delete('/api/books/9999').expect(404);
    });
  });

  describe('入力検証', () => {
    it('price 1 → 201', async () => {
      await create({ ...valid(), price: 1 }).expect(201);
    });

    it('price 0 → 422・errors.price', async () => {
      const res = await create({ ...valid(), price: 0 }).expect(422);

      expect(res.body.errors.price).toBeDefined();
    });

    it('必須項目なし → 422・title・authorId・price', async () => {
      const res = await create({}).expect(422);

      expect(Object.keys(res.body.errors).sort()).toEqual([
        'authorId',
        'price',
        'title',
      ]);
      for (const messages of Object.values(res.body.errors)) {
        expect((messages as string[]).length).toBeGreaterThan(0);
      }
    });

    it('整数でない（authorId が文字列・price が小数）→ 422', async () => {
      const res = await create({
        title: 'x',
        authorId: '1',
        price: 1.5,
      }).expect(422);

      expect(res.body.errors.authorId).toBeDefined();
      expect(res.body.errors.price).toBeDefined();
    });

    it('更新でも title なし → 422', async () => {
      const { body: created } = await create(valid());

      const res = await api
        .put(`/api/books/${created.id}`)
        .send({ authorId, price: 600 })
        .expect(422);

      expect(res.body.errors.title).toBeDefined();
    });
  });

  describe('存在しない著者の指定', () => {
    it('存在しない authorId で作成 → 422・書籍は増えない', async () => {
      const res = await create({ ...valid(), authorId: 9999 }).expect(422);

      expect(res.body).toEqual({
        message: AUTHOR_ID_INVALID,
        errors: { authorId: [AUTHOR_ID_INVALID] },
      });
      expect(await count()).toBe(0);
    });

    it('論理削除済みの著者 → 422・errors.authorId', async () => {
      await app.get(AuthorRepository).delete(authorId);

      const res = await create(valid()).expect(422);

      expect(res.body.errors.authorId).toBeDefined();
    });

    it('存在しない authorId で更新 → 422・authorId は変わらない', async () => {
      const { body: created } = await create(valid());

      await api
        .put(`/api/books/${created.id}`)
        .send({ ...valid(), authorId: 9999 })
        .expect(422);

      expect(
        (await guest().get(`/api/books/${created.id}`)).body.authorId,
      ).toBe(authorId);
    });
  });

  describe('書籍の変更は管理者だけ', () => {
    it('トークンなしで作成 → 401', async () => {
      await guest().post('/api/books').send(valid()).expect(401);
    });

    it('一般ユーザーが作成 → 403・書籍は増えない', async () => {
      const token = await loginAsNormal(app);

      await guest()
        .post('/api/books')
        .set('Authorization', `Bearer ${token}`)
        .send(valid())
        .expect(403);

      expect(await count()).toBe(0);
    });

    it('トークンなしで更新・削除 → 401', async () => {
      const { body: created } = await create(valid());

      await guest().put(`/api/books/${created.id}`).send(valid()).expect(401);
      await guest().delete(`/api/books/${created.id}`).expect(401);
    });
  });
});
