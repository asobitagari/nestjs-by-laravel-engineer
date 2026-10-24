import { CreateAuthorsTable1700000000001 } from './1700000000001-create-authors-table.js';
import { CreateBooksTable1700000000002 } from './1700000000002-create-books-table.js';
import { CreateUsersTable1700000000003 } from './1700000000003-create-users-table.js';
import { CreateRefreshTokensTable1700000000004 } from './1700000000004-create-refresh-tokens-table.js';

// glob ではなくクラスの配列で渡す。ts（テスト）でも dist の js（本番・CLI）でも同じように読める
export const migrations = [
  CreateAuthorsTable1700000000001,
  CreateBooksTable1700000000002,
  CreateUsersTable1700000000003,
  CreateRefreshTokensTable1700000000004,
];
