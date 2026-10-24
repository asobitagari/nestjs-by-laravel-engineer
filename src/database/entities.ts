import { AuthorEntity } from '../infrastructure/entities/author.entity.js';
import { BookEntity } from '../infrastructure/entities/book.entity.js';
import { RefreshTokenEntity } from '../infrastructure/entities/refresh-token.entity.js';
import { UserEntity } from '../infrastructure/entities/user.entity.js';

// DatabaseModule と CLI 用の DataSource が同じ Entity 一覧を使う
export const entities = [
  AuthorEntity,
  BookEntity,
  UserEntity,
  RefreshTokenEntity,
];
