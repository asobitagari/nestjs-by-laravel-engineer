import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CurrentPasswordMismatchError,
  NotFoundError,
} from '../../domain/errors.js';
import { UserRepository } from '../../domain/users/user.repository.js';
import { hashPassword, verifyPassword } from '../../shared/password.js';

// 現在のパスワードが一致したときだけ変える。発行済みのトークンは失効させない
@Injectable()
export class UpdatePasswordService {
  constructor(
    private readonly users: UserRepository,
    private readonly config: ConfigService,
  ) {}

  async execute(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundError();

    // パスワードのハッシュを返すのは findByEmail だけ
    const withPassword = await this.users.findByEmail(user.email);
    if (
      !withPassword ||
      !(await verifyPassword(currentPassword, withPassword.password))
    ) {
      throw new CurrentPasswordMismatchError();
    }

    const rounds = this.config.getOrThrow<number>('auth.bcryptRounds');
    await this.users.updatePassword(
      userId,
      await hashPassword(newPassword, rounds),
    );
  }
}
