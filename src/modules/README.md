# modules/（ServiceProvider）

DI の束ねを置く。Laravel の ServiceProvider で `$this->app->bind()` するのと同じく、`providers: [{ provide: 抽象クラス, useClass: 実装 }]` でバインドする。Controller・UseCase はコンストラクタの型（抽象クラス）だけで依存を受け取る。

| Module | 中身 |
|---|---|
| `DatabaseModule` | `TypeOrmModule.forRootAsync()`（`ConfigService` から DB 設定を読む）。`synchronize: false`、`migrationsRun: true` |
| `UsersModule` | `UserRepository`・`RefreshTokenRepository` のバインド、Users の UseCase、`UsersController`。`UserRepository`（Guard が使う）と `RefreshTokenRepository`（Auth の UseCase が使う）を export |
| `AuthModule` | `JwtModule.registerAsync({ global: true })`、Auth の UseCase、`AuthController`。`UsersModule` を import |
| `ProfileModule` | Profile の Service、`ProfileController`。`UsersModule` を import |
| `AuthorsModule` | `AuthorRepository` のバインド（export）、Authors の UseCase、`AuthorsController`。`UsersModule` を import |
| `BooksModule` | `BookRepository` のバインド、Books の UseCase、`BooksController`。`AuthorsModule`・`UsersModule` を import |

## Guard の依存の解決

Guard（`JwtAuthGuard` / `AdminGuard`）は `@UseGuards()` を使う Module の中で解決されるので、Guard が依存する `JwtService` と `UserRepository` がその Module から見える必要がある。

- `AuthModule` で `JwtModule.registerAsync({ global: true, ... })` として `JwtService` をグローバルにする（Laravel の `auth` がどこからでも使えるのと同じ感覚）
- `UserRepository` は `UsersModule` が export し、Guard を使う Module（Auth / Profile / Authors / Books）は `UsersModule` を import する
- `RefreshTokenRepository` も `UsersModule` に置く。ユーザー削除でトークンを消す `DeleteUserUseCase` が `UsersModule` にあり、`AuthModule` に置くと `UsersModule` ⇄ `AuthModule` が循環するため

依存の向きは「各 Module → `UsersModule`」の一方向だけになる。

## 規約

- 1 機能 1 Module。ファイルは `{機能}.module.ts`
- Repository は抽象クラスをトークンにしてバインドする（`Symbol` トークンは使わない）
- 他の Module が使う Repository だけを `exports` に入れる
- `forwardRef()` は使わない（依存の向きが読み取りにくくなる）
- 新しい Module は `app.module.ts` の `imports` に足す

## チェックリスト

- [ ] Repository を `{ provide, useClass }` でバインドしている
- [ ] Controller・UseCase をこの Module に登録している
- [ ] Guard を使うなら `UsersModule` を import している
- [ ] `app.module.ts` で import している
