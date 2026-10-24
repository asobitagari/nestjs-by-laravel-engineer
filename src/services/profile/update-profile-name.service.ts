import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../domain/errors.js';
import type { User } from '../../domain/users/user.js';
import { UserRepository } from '../../domain/users/user.repository.js';

// 名前だけを変える。メールアドレスと権限は本人からは変えられない
@Injectable()
export class UpdateProfileNameService {
  constructor(private readonly users: UserRepository) {}

  async execute(userId: number, name: string): Promise<User> {
    const user = await this.users.updateName(userId, name);
    if (!user) throw new NotFoundError();
    return user;
  }
}
