import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { UserRepository } from '../../domain/users/user.repository.js';
import type { AuthUser } from './jwt-auth.guard.js';

// can:admin 相当。必ず JwtAuthGuard の後に並べる。権限はトークンではなく DB の is_admin を毎回見る
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly users: UserRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user } = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const current = user ? await this.users.findById(user.id) : null;
    if (!current?.isAdmin) {
      throw new ForbiddenException({ message: 'This action is unauthorized.' });
    }
    return true;
  }
}
