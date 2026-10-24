import { INestApplication } from '@nestjs/common';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/bootstrap.js';
import type { User } from '../src/domain/users/user.js';
import { UserRepository } from '../src/domain/users/user.repository.js';
import { hashPassword } from '../src/shared/password.js';

// RefreshDatabase 相当。DATABASE_URL=':memory:' なので、アプリごとに新しい DB になる。
// override で Provider を差し替えられる（$this->app->instance() 相当）
export async function createTestApp(
  override: (builder: TestingModuleBuilder) => TestingModuleBuilder = (
    builder,
  ) => builder,
): Promise<INestApplication> {
  const moduleRef = await override(
    Test.createTestingModule({ imports: [AppModule] }),
  ).compile();
  const app = configureApp(moduleRef.createNestApplication({ logger: false }));
  await app.init();
  return app;
}

// User::factory()->create() 相当。API を通さず Repository で直接作る
export async function seedUser(
  app: INestApplication,
  attributes: {
    name: string;
    email: string;
    password?: string;
    isAdmin?: boolean;
  },
): Promise<User> {
  return app.get(UserRepository).create({
    name: attributes.name,
    email: attributes.email,
    password: await hashPassword(attributes.password ?? 'password', 4),
    isAdmin: attributes.isAdmin ?? false,
  });
}

export function seedAdminUser(app: INestApplication): Promise<User> {
  return seedUser(app, {
    name: '管理者君',
    email: 'admin@example.com',
    isAdmin: true,
  });
}

export function seedNormalUser(app: INestApplication): Promise<User> {
  return seedUser(app, { name: '一般君', email: 'normal@example.com' });
}

export async function login(
  app: INestApplication,
  email: string,
  password = 'password',
): Promise<{ accessToken: string; refreshToken: string }> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200);
  return res.body;
}

// accessToken を返す
export async function loginAs(
  app: INestApplication,
  email: string,
  password = 'password',
): Promise<string> {
  return (await login(app, email, password)).accessToken;
}

export function loginAsAdmin(app: INestApplication): Promise<string> {
  return loginAs(app, 'admin@example.com');
}

export function loginAsNormal(app: INestApplication): Promise<string> {
  return loginAs(app, 'normal@example.com');
}
