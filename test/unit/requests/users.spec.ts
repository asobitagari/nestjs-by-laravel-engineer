import { UpdateUserRequest } from '../../../src/http/requests/users/update-user.request.js';
import { invalidProperties, toInstance } from './validate.js';

describe('UpdateUserRequest', () => {
  const valid = { name: '一般君', email: 'normal@example.com', isAdmin: true };

  it('Valid', async () => {
    expect(await invalidProperties(UpdateUserRequest, valid)).toEqual([]);
  });

  it('name なし → name', async () => {
    expect(
      await invalidProperties(UpdateUserRequest, { ...valid, name: undefined }),
    ).toEqual(['name']);
  });

  it('isAdmin 省略 → false', async () => {
    const request = toInstance(UpdateUserRequest, {
      name: '一般君',
      email: 'normal@example.com',
    });

    expect(
      await invalidProperties(UpdateUserRequest, {
        name: '一般君',
        email: 'normal@example.com',
      }),
    ).toEqual([]);
    expect(request.isAdmin).toBe(false);
  });
});
