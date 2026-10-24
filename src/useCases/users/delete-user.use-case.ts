import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../domain/errors.js';
import { RefreshTokenRepository } from '../../domain/refreshTokens/refresh-token.repository.js';
import { UserRepository } from '../../domain/users/user.repository.js';

@Injectable()
export class DeleteUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly refreshTokens: RefreshTokenRepository,
  ) {}

  // 論理削除ではカスケードが効かないので、リフレッシュトークンはここで消す
  async execute(id: number): Promise<void> {
    if (!(await this.users.delete(id))) throw new NotFoundError();
    await this.refreshTokens.deleteByUserId(id);
  }
}
