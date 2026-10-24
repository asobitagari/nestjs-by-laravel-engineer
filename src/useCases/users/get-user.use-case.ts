import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../domain/errors.js';
import type { User } from '../../domain/users/user.js';
import { UserRepository } from '../../domain/users/user.repository.js';

@Injectable()
export class GetUserUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(id: number): Promise<User> {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundError();
    return user;
  }
}
