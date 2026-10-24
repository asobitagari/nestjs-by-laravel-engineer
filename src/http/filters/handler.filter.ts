import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  AuthorNotFoundError,
  CurrentPasswordMismatchError,
  DomainError,
  EmailAlreadyExistsError,
  InvalidCredentialsError,
  InvalidRefreshTokenError,
  NotFoundError,
} from '../../domain/errors.js';
import { ValidationException } from './validation-exception.factory.js';

type ErrorBody = { message: string; errors?: Record<string, string[]> };

const AUTHOR_ID_INVALID = 'The selected author id is invalid.';

// ドメイン例外 → HTTP の変換表
const DOMAIN_ERRORS: [
  new (...args: never[]) => DomainError,
  number,
  ErrorBody,
][] = [
  [NotFoundError, HttpStatus.NOT_FOUND, { message: 'Not Found.' }],
  [
    InvalidCredentialsError,
    HttpStatus.UNAUTHORIZED,
    { message: 'These credentials do not match our records.' },
  ],
  [
    CurrentPasswordMismatchError,
    HttpStatus.UNAUTHORIZED,
    { message: 'The current password is incorrect.' },
  ],
  [
    EmailAlreadyExistsError,
    HttpStatus.CONFLICT,
    { message: 'The email has already been taken.' },
  ],
  [
    InvalidRefreshTokenError,
    HttpStatus.UNAUTHORIZED,
    { message: 'Invalid or expired refresh token.' },
  ],
  [
    AuthorNotFoundError,
    HttpStatus.UNPROCESSABLE_ENTITY,
    { message: AUTHOR_ID_INVALID, errors: { authorId: [AUTHOR_ID_INVALID] } },
  ],
];

// app/Exceptions/Handler.php 相当。すべての例外を Laravel と同じ形の JSON にする
@Catch()
export class HandlerFilter implements ExceptionFilter {
  private readonly logger = new Logger('Handler');

  catch(exception: unknown, host: ArgumentsHost): void {
    const [status, body] = this.render(exception);
    host.switchToHttp().getResponse<Response>().status(status).json(body);
  }

  private render(exception: unknown): [number, ErrorBody] {
    for (const [type, status, body] of DOMAIN_ERRORS) {
      if (exception instanceof type) return [status, body];
    }

    if (exception instanceof ValidationException) {
      return [exception.getStatus(), exception.getResponse() as ErrorBody];
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      if (status === HttpStatus.NOT_FOUND)
        return [status, { message: 'Not Found.' }];
      return [status, { message: messageOf(exception) }];
    }

    // 想定外の例外。詳細はログにだけ出し、レスポンスには出さない
    this.logger.error(
      exception instanceof Error
        ? (exception.stack ?? exception.message)
        : exception,
    );
    return [HttpStatus.INTERNAL_SERVER_ERROR, { message: 'Server Error' }];
  }
}

// Nest 既定の { statusCode, message, error } から message だけを取り出す
function messageOf(exception: HttpException): string {
  const response = exception.getResponse();
  if (typeof response === 'string') return response;
  const message = (response as { message?: unknown }).message;
  if (Array.isArray(message)) return String(message[0]);
  return typeof message === 'string' ? message : exception.message;
}
