import { LoginRequest } from '../../../src/http/requests/auth/login.request.js';
import { LogoutRequest } from '../../../src/http/requests/auth/logout.request.js';
import { RefreshTokenRequest } from '../../../src/http/requests/auth/refresh-token.request.js';
import { RegisterRequest } from '../../../src/http/requests/auth/register.request.js';
import { invalidProperties } from './validate.js';

describe('LoginRequest', () => {
  it('Valid', async () => {
    expect(
      await invalidProperties(LoginRequest, {
        email: 'test@example.com',
        password: 'p',
      }),
    ).toEqual([]);
  });

  it('password なし → password', async () => {
    expect(
      await invalidProperties(LoginRequest, { email: 'test@example.com' }),
    ).toEqual(['password']);
  });

  it('email 形式不正 → email', async () => {
    expect(
      await invalidProperties(LoginRequest, {
        email: 'x',
        password: 'password',
      }),
    ).toEqual(['email']);
  });
});

describe('RegisterRequest', () => {
  const valid = {
    name: 'テスト',
    email: 'test@example.com',
    password: 'password',
  };

  it('Valid', async () => {
    expect(await invalidProperties(RegisterRequest, valid)).toEqual([]);
  });

  it('name なし → name', async () => {
    expect(
      await invalidProperties(RegisterRequest, { ...valid, name: undefined }),
    ).toEqual(['name']);
  });

  it('password 7 文字 → password', async () => {
    expect(
      await invalidProperties(RegisterRequest, {
        ...valid,
        password: '1234567',
      }),
    ).toEqual(['password']);
  });
});

describe('LogoutRequest', () => {
  it('Valid', async () => {
    expect(await invalidProperties(LogoutRequest, { token: 'abc' })).toEqual(
      [],
    );
  });

  it('token なし → token', async () => {
    expect(await invalidProperties(LogoutRequest, {})).toEqual(['token']);
  });
});

describe('RefreshTokenRequest', () => {
  it('Valid', async () => {
    expect(
      await invalidProperties(RefreshTokenRequest, { refreshToken: 'abc' }),
    ).toEqual([]);
  });

  it('refreshToken なし → refreshToken', async () => {
    expect(await invalidProperties(RefreshTokenRequest, {})).toEqual([
      'refreshToken',
    ]);
  });
});
