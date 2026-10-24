# domain/

エンティティ型・入力型・Repository 抽象クラス・ドメイン例外を定義する。NestJS・TypeORM・Express など外部ライブラリを import しない。依存の向きは http → useCases / services → domain ← infrastructure で、domain はどこにも依存しない。

## Repository は抽象クラスで書く

TypeScript の `interface` は実行時に消えるため、DI のトークンにできない。抽象クラスは実行時にも残るので、Laravel と同じく「型をトークンにしてバインドする」書き方ができる（バインドは `modules/` の `{ provide: BookRepository, useClass: TypeOrmBookRepository }`）。抽象クラスには NestJS のデコレータを付けない。

```ts
// domain/users/user.ts
export type User = { id: number; name: string; email: string; isAdmin: boolean };
export type UserWithPassword = User & { password: string };
export type CreateUserInput = { name: string; email: string; password: string; isAdmin: boolean };
export type UpdateUserInput = { name: string; email: string; isAdmin: boolean };
```

| ドメイン | エンティティ型 | Repository のメソッド |
|---|---|---|
| Author | `{ id, name, email: string \| null }` | `findAll` / `findById` / `create` / `update` / `delete` |
| Book | `{ id, title, authorId, price }` | `findAll` / `findById` / `create` / `update` / `delete` |
| User | 上記 | `findAll` / `findById` / `findByEmail` / `create` / `update` / `updateName` / `updatePassword` / `delete` |
| RefreshToken | `{ userId, token, expiresAt: Date }` | `create(userId, token, expiresAt)` / `findByToken` / `deleteByToken` / `deleteByUserId` |

- `findById` / `findAll` / `findByEmail` は論理削除済みを含めない
- `update` / `delete` は対象がなければ `null` / `false` を返す（例外にするかは UseCase が決める）
- パスワードを持つ型を返すのは `findByEmail` だけ（`UserWithPassword`）

## ドメイン例外（`errors.ts`）

`DomainError` を継承する。HTTP のステータスは `http/filters/handler.filter.ts` が決める。

| 例外 | 意味 |
|---|---|
| `NotFoundError` | 対象がない（論理削除済みを含む） |
| `InvalidCredentialsError` | ログインのメール・パスワードが合わない |
| `CurrentPasswordMismatchError` | パスワード変更で現在のパスワードが合わない |
| `EmailAlreadyExistsError` | メールが他のユーザー（論理削除済みを含む）と重複 |
| `InvalidRefreshTokenError` | リフレッシュトークンがない・期限切れ |
| `AuthorNotFoundError` | 書籍の `authorId` の著者がいない |

## 置かないもの

- 実装コード（→ `infrastructure/`・`useCases/`・`services/`）
- 外部ライブラリの import

## チェックリスト

- [ ] import に外部ライブラリ（`@nestjs/*`、`typeorm` など）がない
- [ ] 実装コードがない（型・抽象クラス・例外クラスのみ）
