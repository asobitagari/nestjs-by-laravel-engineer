import { Injectable } from '@nestjs/common';
import { EmailAlreadyExistsError, NotFoundError } from '../../domain/errors.js';
import type { UpdateUserInput, User } from '../../domain/users/user.js';
import { UserRepository } from '../../domain/users/user.repository.js';

@Injectable()
export class UpdateUserUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(id: number, input: UpdateUserInput): Promise<User> {
    if (!(await this.users.findById(id))) throw new NotFoundError();

    // unique:users,email,{id} 相当。自分自身の現在のメールのままなら重複にしない。
    // 論理削除済みユーザーのメールは Repository が UNIQUE 制約違反から同じ例外にする（design D5）
    const owner = await this.users.findByEmail(input.email);
    if (owner && owner.id !== id) throw new EmailAlreadyExistsError();

    const user = await this.users.update(id, input);
    if (!user) throw new NotFoundError();
    return user;
  }
}
