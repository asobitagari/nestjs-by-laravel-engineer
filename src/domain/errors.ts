// ドメイン例外。HTTP のステータスは http/filters/handler.filter.ts が決める
export class DomainError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends DomainError {}
export class InvalidCredentialsError extends DomainError {}
export class CurrentPasswordMismatchError extends DomainError {}
export class EmailAlreadyExistsError extends DomainError {}
export class InvalidRefreshTokenError extends DomainError {}
export class AuthorNotFoundError extends DomainError {}
