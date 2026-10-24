import { CreateAuthorRequest } from '../../../src/http/requests/authors/create-author.request.js';
import { UpdateAuthorRequest } from '../../../src/http/requests/authors/update-author.request.js';
import { invalidProperties } from './validate.js';

describe('CreateAuthorRequest', () => {
  it('Valid（email なし）', async () => {
    expect(
      await invalidProperties(CreateAuthorRequest, { name: '太宰治' }),
    ).toEqual([]);
  });

  it('name なし → name', async () => {
    expect(await invalidProperties(CreateAuthorRequest, {})).toEqual(['name']);
  });

  it('email 付き Valid', async () => {
    expect(
      await invalidProperties(CreateAuthorRequest, {
        name: '太宰治',
        email: 'dazai@example.com',
      }),
    ).toEqual([]);
  });

  it('email 形式不正 → email', async () => {
    expect(
      await invalidProperties(CreateAuthorRequest, {
        name: '太宰治',
        email: 'x',
      }),
    ).toEqual(['email']);
  });

  it('name 101 文字 → name', async () => {
    expect(
      await invalidProperties(CreateAuthorRequest, { name: 'あ'.repeat(101) }),
    ).toEqual(['name']);
  });
});

describe('UpdateAuthorRequest', () => {
  it('Valid', async () => {
    expect(
      await invalidProperties(UpdateAuthorRequest, { name: '太宰治' }),
    ).toEqual([]);
  });

  it('name なし → name', async () => {
    expect(await invalidProperties(UpdateAuthorRequest, {})).toEqual(['name']);
  });
});
