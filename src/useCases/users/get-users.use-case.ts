import { Injectable } from '@nestjs/common';
import type { User } from '../../domain/users/user.js';
import { UserRepository } from '../../domain/users/user.repository.js';

@Injectable()
export class GetUsersUseCase {
  constructor(private readonly users: UserRepository) {}

  execute(): Promise<User[]> {
    return this.users.findAll();
  }
}
