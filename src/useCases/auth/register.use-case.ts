import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailAlreadyExistsError } from '../../domain/errors.js';
import type { User } from '../../domain/users/user.js';
import { UserRepository } from '../../domain/users/user.repository.js';
import { hashPassword } from '../../shared/password.js';

@Injectable()
export class RegisterUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly config: ConfigService,
  ) {}

  async execute(input: {
    name: string;
    email: string;
    password: string;
  }): Promise<User> {
    if (await this.users.findByEmail(input.email))
      throw new EmailAlreadyExistsError();

    const rounds = this.config.getOrThrow<number>('auth.bcryptRounds');
    return this.users.create({
      name: input.name,
      email: input.email,
      password: await hashPassword(input.password, rounds),
      isAdmin: false,
    });
  }
}
