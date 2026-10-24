import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '../guards/jwt-auth.guard.js';

// $request->user() 相当。JwtAuthGuard がセットした request.user を取り出す
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest<{ user: AuthUser }>().user,
);
