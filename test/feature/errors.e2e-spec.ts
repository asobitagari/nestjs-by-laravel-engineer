import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { GetAuthorsUseCase } from '../../src/useCases/authors/get-authors.use-case.js';
import { createTestApp, loginAsAdmin, seedAdminUser } from '../helpers.js';

describe('エラーレスポンス', () => {
  let app: INestApplication;

  let adminToken: string;

  beforeEach(async () => {
    app = await createTestApp();
    await seedAdminUser(app);
    adminToken = await loginAsAdmin(app);
  });
  afterEach(async () => {
    await app.close();
  });

  describe('未定義のルート', () => {
    it('存在しないパス → 404 Not Found.', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/unknown')
        .expect(404);

      expect(res.body).toEqual({ message: 'Not Found.' });
    });

    it('/api なしのパス → 404', async () => {
      await request(app.getHttpServer()).get('/authors').expect(404);
    });
  });

  describe('不正な JSON', () => {
    it('400 で message だけを持つ（500 にならない）', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{invalid')
        .expect(400);

      expect(Object.keys(res.body)).toEqual(['message']);
      expect(typeof res.body.message).toBe('string');
    });
  });

  describe('エラーボディの形', () => {
    it('404 は message だけ（statusCode・error を含まない）', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/authors/9999')
        .expect(404);

      expect(res.body).toEqual({ message: 'Not Found.' });
    });

    it('小数の ID → 400', async () => {
      await request(app.getHttpServer()).get('/api/books/1.5').expect(400);
    });

    it('400 は message だけ', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/authors/1.5')
        .expect(400);

      expect(Object.keys(res.body)).toEqual(['message']);
    });

    it('422 は message と errors だけ', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/authors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(422);

      expect(Object.keys(res.body).sort()).toEqual(['errors', 'message']);
    });

    it('違反していないプロパティは errors に含まない', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/authors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '太宰治', email: 'x' })
        .expect(422);

      expect(Object.keys(res.body.errors)).toEqual(['email']);
    });
  });

  describe('ルールにないキー', () => {
    it('捨てられ、レスポンスにも出ない', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/authors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: '太宰治', foo: 'bar' })
        .expect(201);

      expect(res.body).not.toHaveProperty('foo');
    });
  });

  describe('想定外のエラー', () => {
    it('500 Server Error・例外のメッセージを含まない', async () => {
      const broken = await createTestApp((builder) =>
        builder.overrideProvider(GetAuthorsUseCase).useValue({
          execute: () => Promise.reject(new Error('boom')),
        }),
      );

      try {
        const res = await request(broken.getHttpServer())
          .get('/api/authors')
          .expect(500);

        expect(res.body).toEqual({ message: 'Server Error' });
        expect(res.text).not.toContain('boom');
      } finally {
        await broken.close();
      }
    });
  });
});
