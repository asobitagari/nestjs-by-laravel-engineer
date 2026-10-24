import { UpdatePasswordRequest } from '../../../src/http/requests/profile/update-password.request.js';
import { UpdateProfileRequest } from '../../../src/http/requests/profile/update-profile.request.js';
import { invalidProperties } from './validate.js';

describe('UpdateProfileRequest', () => {
  it('Valid', async () => {
    expect(
      await invalidProperties(UpdateProfileRequest, { name: '新しい名前' }),
    ).toEqual([]);
  });

  it('name なし → name', async () => {
    expect(await invalidProperties(UpdateProfileRequest, {})).toEqual(['name']);
  });
});

describe('UpdatePasswordRequest', () => {
  const valid = { currentPassword: 'password', newPassword: 'new-password' };

  it('Valid', async () => {
    expect(await invalidProperties(UpdatePasswordRequest, valid)).toEqual([]);
  });

  it('currentPassword なし → currentPassword', async () => {
    expect(
      await invalidProperties(UpdatePasswordRequest, {
        newPassword: 'new-password',
      }),
    ).toEqual(['currentPassword']);
  });

  it('newPassword 7 文字 → newPassword', async () => {
    expect(
      await invalidProperties(UpdatePasswordRequest, {
        ...valid,
        newPassword: '1234567',
      }),
    ).toEqual(['newPassword']);
  });
});
