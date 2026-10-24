import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { UserRepository } from '../../domain/users/user.repository.js';

export type AuthUser = { id: number };

// auth:sanctum 相当。署名・有効期限を確かめ、sub のユーザーがまだいることも確かめる
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly users: UserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) throw unauthenticated();

    let sub: unknown;
    try {
      ({ sub } = await this.jwt.verifyAsync<{ sub: unknown }>(token));
    } catch {
      throw unauthenticated();
    }

    // 論理削除済みのユーザーは findById で見つからない
    const user =
      typeof sub === 'number' ? await this.users.findById(sub) : null;
    if (!user) throw unauthenticated();

    request.user = { id: user.id };
    return true;
  }
}

function unauthenticated() {
  return new UnauthorizedException({ message: 'Unauthenticated.' });
}
