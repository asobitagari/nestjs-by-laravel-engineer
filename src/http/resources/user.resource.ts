import type { User } from '../../domain/users/user.js';

// パスワードはここで落とす（キーを明示して返す）
export class UserResource {
  static make(user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
    };
  }

  static collection(users: User[]) {
    return users.map((user) => UserResource.make(user));
  }
}
