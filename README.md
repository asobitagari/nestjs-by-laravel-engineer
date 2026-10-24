# Laravel エンジニアの設計手法を TypeScript バックエンドの NestJS で試す

JWT 認証つきの「書籍・著者管理 API」を NestJS で作るための仕様書。

本プロジェクトは次の二つの問いを確かめる。

1. **Laravel の設計は、Laravel の外でも再現できるか。** Controller・FormRequest・Action・Domain Service・Repository・Middleware・マイグレーションを、依存の向き（ドメイン層は外部ライブラリに依存しない、UseCase は HTTP を知らない）を保ったまま置けるか
2. **README 駆動は、フレームワークが変わっても回るか。** 各レイヤーに README（責務・置くもの・置かないもの）を置き、それを人と AI の開発の起点にする。仕様が変わったら先に README を直し、実装との食い違いを調べてから直す

NestJS は Laravel と同じく **DI コンテナ・ミドルウェア（Guard）・FormRequest 相当（ValidationPipe）・例外ハンドラ（ExceptionFilter）** を最初から持っている。そのため問い 1 は「再現できるか」から一歩進めて、「**Laravel の構成にどこまで寄せられるか**」をテーマとする。ServiceProvider（Module）・例外ハンドラ・API Resource まで、Laravel の部品を一つずつ対応させる。

この README だけを見れば、API・テスト・ドキュメント一式を作れることを目標にしている。

---

## 目次

1. [技術スタック](#技術スタック)
2. [Laravel との対応表](#laravel-との対応表)
3. [ディレクトリ構成](#ディレクトリ構成)
4. [依存性の注入（DI）](#依存性の注入di)
5. [各レイヤーの仕様](#各レイヤーの仕様)
6. [API 仕様](#api-仕様)
7. [エラーレスポンス仕様](#エラーレスポンス仕様)
8. [データベース](#データベース)
9. [認証](#認証)
10. [テスト](#テスト)
11. [セットアップ（WSL）](#セットアップwsl)
12. [実装の進め方](#実装の進め方)
13. [このプロジェクトで決めたこと](#このプロジェクトで決めたこと)

---

## 技術スタック

| | |
|---|---|
| Runtime | Node.js（LTS） |
| Framework | [NestJS](https://nestjs.com/)（Express アダプタ） |
| Validation | class-validator + class-transformer（`ValidationPipe`） |
| ORM | TypeORM（`@nestjs/typeorm`） |
| DB | SQLite（better-sqlite3） |
| Auth | JWT（`@nestjs/jwt`, HS256）+ リフレッシュトークン |
| Password | bcrypt |
| Config | `@nestjs/config`（`.env`） |
| Module | ESM（`"type": "module"`。相対 import は `./foo.js` と拡張子まで書く） |
| Test | Vitest + supertest |
| Lint / Format | oxlint / Prettier |

### ORM に TypeORM を選ぶ理由

- Entity クラス（デコレータでカラム定義）が Eloquent Model・GORM Model と同じ位置づけで置ける
- `timestamps`（`@CreateDateColumn` / `@UpdateDateColumn`）と `SoftDeletes`（`@DeleteDateColumn` + `softDelete()`）が標準である
- マイグレーションをクラスで書ける（`up()` / `down()`）。Laravel のマイグレーションとほぼ同じ形になる
- NestJS 公式ドキュメントで扱われている

### ESM・Vitest・oxlint を使う理由

NestJS 12 の `nest new` が作る雛形の既定（ESM・Vitest・oxlint）をそのまま使う。フレームワークの標準に乗っておけば、`nest g` の生成物やドキュメントと食い違わない。Vitest は `describe` / `it` / `expect` が Jest と同じで、デコレータのメタデータも出力するので、型による DI もテストでそのまま解決される。

> Prisma や Drizzle でも作れる。Repository パターンで infrastructure 層に閉じ込めるので、後から差し替えても domain / useCases には影響しない。

---

## Laravel との対応表

| Laravel | NestJS（本プロジェクト） | 置き場所 |
|---|---|---|
| `routes/api.php`（`/api` プレフィックス） | `app.setGlobalPrefix('api')` + Controller のデコレータ | `src/bootstrap.ts` / `src/http/controllers/` |
| Controller | Controller（`@Controller`） | `src/http/controllers/` |
| FormRequest | Request DTO（class-validator） | `src/http/requests/` |
| `$request->validated()` | `ValidationPipe({ whitelist: true })` | `src/bootstrap.ts` |
| API Resource（`JsonResource`） | Resource クラス（`toArray()`） | `src/http/resources/` |
| Middleware `auth:sanctum` | `JwtAuthGuard` | `src/http/guards/` |
| Middleware `can:admin` / Gate | `AdminGuard` | `src/http/guards/` |
| `$request->user()` / `Auth::id()` | `@CurrentUser()` デコレータ | `src/http/decorators/` |
| `app/Exceptions/Handler.php` | `ExceptionFilter`（`Handler`） | `src/http/filters/` |
| Action クラス | UseCase クラス（`execute()`） | `src/useCases/` |
| Domain Service | Service クラス（`execute()`） | `src/services/` |
| Repository Interface | 抽象クラス（`abstract class BookRepository`） | `src/domain/` |
| Eloquent Model | TypeORM Entity | `src/infrastructure/entities/` |
| Eloquent Repository 実装 | `TypeOrmBookRepository` | `src/infrastructure/repositories/` |
| ServiceProvider（`$this->app->bind()`） | Module（`providers: [{ provide, useClass }]`） | `src/modules/` |
| `config/*.php` + `env()` | `@nestjs/config` の `registerAs()` | `src/config/` |
| `database/migrations` | TypeORM Migration クラス | `src/database/migrations/` |
| `database/seeders` / `php artisan db:seed` | Seeder クラス + `npm run db:seed` | `src/database/seeders/` |
| `Hash::make()` / `Hash::check()` | `shared/password.ts`（bcrypt） | `src/shared/` |
| `tests/Feature`（`RefreshDatabase`） | `test/feature/*.e2e-spec.ts`（テストごとにインメモリ DB） | `test/feature/` |
| `tests/Unit` | `test/unit/**/*.spec.ts` | `test/unit/` |
| `phpunit.xml` の `BCRYPT_ROUNDS=4` | `test/setup-env.ts` で `BCRYPT_ROUNDS=4` | `test/` |

---

## ディレクトリ構成

```
src/
  main.ts                         ← public/index.php。configureApp() して listen するだけ
  bootstrap.ts                    ← configureApp(app)：prefix・Pipe・Filter・CORS を設定（テストでも使う）
  app.module.ts                   ← config/app.php の providers 配列。各 Module を import する
  config/
    app.config.ts                 ← PORT
    auth.config.ts                ← JWT_SECRET・トークン有効期限・BCRYPT_ROUNDS
    database.config.ts            ← DATABASE_URL
  modules/                        ← ServiceProvider 相当（DI の束ね）
    database.module.ts
    auth.module.ts
    profile.module.ts
    authors.module.ts
    books.module.ts
    users.module.ts
  http/
    controllers/                  ← Controller
      auth.controller.ts
      profile.controller.ts
      authors.controller.ts
      books.controller.ts
      users.controller.ts
    requests/                     ← FormRequest
      auth/        login.request.ts / register.request.ts / logout.request.ts / refresh-token.request.ts
      authors/     create-author.request.ts / update-author.request.ts
      books/       create-book.request.ts / update-book.request.ts
      profile/     update-profile.request.ts / update-password.request.ts
      users/       update-user.request.ts
    resources/                    ← API Resource
      user.resource.ts
      author.resource.ts
      book.resource.ts
    guards/                       ← Middleware（auth / can:admin）
      jwt-auth.guard.ts
      admin.guard.ts
    decorators/
      current-user.decorator.ts
    filters/                      ← Exceptions/Handler.php
      handler.filter.ts
      validation-exception.factory.ts
  useCases/                       ← Action クラス
    auth/      login.use-case.ts / register.use-case.ts / logout.use-case.ts / refresh-token.use-case.ts
    authors/   get-authors / get-author / create-author / update-author / delete-author .use-case.ts
    books/     get-books / get-book / create-book / update-book / delete-book .use-case.ts
    users/     get-users / get-user / update-user / delete-user .use-case.ts
  services/                       ← Domain Service
    profile/   update-profile-name.service.ts / update-password.service.ts
  domain/                         ← エンティティ型・入力型・Repository 抽象クラス・ドメイン例外
    authors/   author.ts / author.repository.ts
    books/     book.ts / book.repository.ts
    users/     user.ts / user.repository.ts
    refreshTokens/ refresh-token.ts / refresh-token.repository.ts
    errors.ts
  infrastructure/
    entities/                     ← Eloquent Model 相当
      author.entity.ts / book.entity.ts / user.entity.ts / refresh-token.entity.ts
    repositories/
      typeorm-author.repository.ts / typeorm-book.repository.ts
      typeorm-user.repository.ts / typeorm-refresh-token.repository.ts
  shared/
    password.ts                   ← bcrypt
    token.ts                      ← リフレッシュトークン生成・有効期限
  database/
    data-source.ts                ← TypeORM CLI 用 DataSource
    entities.ts                   ← Entity クラスの配列（DatabaseModule と data-source.ts が使う）
    migrations/
      index.ts                    ← マイグレーションクラスの配列をエクスポート
      1700000000001-create-authors-table.ts
      1700000000002-create-books-table.ts
      1700000000003-create-users-table.ts
      1700000000004-create-refresh-tokens-table.ts
    seeders/
      database.seeder.ts
      run.ts
test/
  setup-env.ts                    ← テスト用環境変数（vitest.config.ts の setupFiles）
  helpers.ts                      ← createTestApp / seedAdminUser / loginAsAdmin など
  feature/                        ← tests/Feature
    auth.e2e-spec.ts / profile.e2e-spec.ts / authors.e2e-spec.ts / books.e2e-spec.ts / users.e2e-spec.ts
    guards.e2e-spec.ts
    errors.e2e-spec.ts            ← エラーレスポンスの形（未定義ルート・不正な JSON・500 など）
    database.e2e-spec.ts          ← npm run db:* と起動時の設定（CLI と dist/main.js を実際に起動する）
  unit/                           ← tests/Unit
    requests/  auth.spec.ts / authors.spec.ts / books.spec.ts / profile.spec.ts / users.spec.ts
    filters/   validation-exception.factory.spec.ts
```

### 命名規則

- ファイル名は NestJS の慣習に合わせて kebab-case + 役割サフィックス（`create-book.use-case.ts`）。`nest g` コマンドとも揃う
- クラス名は Laravel と同じ感覚で PascalCase + 役割（`CreateBookUseCase`、`CreateBookRequest`、`BookResource`、`TypeOrmBookRepository`）
- 1 ファイル 1 クラス

### `database/` を `src/` の下に置く理由

Laravel では `database/` はプロジェクト直下にある。ただし NestJS のビルド（`nest build`）は `src/` を基点に `dist/` を作る。`src/` の外に置くと `dist/src/main.js` のように出力先がずれて、`npm run start:prod` が壊れる。そのため `src/database/` に置く。

---

## 依存性の注入（DI）

このプロジェクトで一番 Laravel に寄せたい部分。

### Laravel

```php
// AppServiceProvider
$this->app->bind(BookRepository::class, EloquentBookRepository::class);

// Controller / Action はタイプヒントだけで解決される
public function __construct(private BookRepository $books) {}
```

### NestJS（本プロジェクト）

TypeScript の `interface` は実行時に消えるため、DI のトークンにできない。そこで **Repository を抽象クラスで定義する**。抽象クラスは実行時にも残るので、Laravel と同じく「型をトークンにしてバインドする」書き方ができる。

```ts
// src/domain/books/book.repository.ts（ドメイン層。外部ライブラリに依存しない）
export abstract class BookRepository {
  abstract findAll(): Promise<Book[]>
  abstract findById(id: number): Promise<Book | null>
  abstract create(input: CreateBookInput): Promise<Book>
  abstract update(id: number, input: UpdateBookInput): Promise<Book | null>
  abstract delete(id: number): Promise<boolean>
}
```

```ts
// src/modules/books.module.ts（ServiceProvider 相当）
@Module({
  imports: [TypeOrmModule.forFeature([BookEntity, AuthorEntity]), AuthorsModule, UsersModule],
  controllers: [BooksController],
  providers: [
    { provide: BookRepository, useClass: TypeOrmBookRepository }, // ← $this->app->bind()
    GetBooksUseCase, GetBookUseCase, CreateBookUseCase, UpdateBookUseCase, DeleteBookUseCase,
  ],
  exports: [BookRepository],
})
export class BooksModule {}
```

```ts
// src/useCases/books/create-book.use-case.ts（タイプヒントだけで解決される）
@Injectable()
export class CreateBookUseCase {
  constructor(
    private readonly books: BookRepository,
    private readonly authors: AuthorRepository,
  ) {}

  async execute(input: CreateBookInput): Promise<Book> {
    if (!(await this.authors.findById(input.authorId))) throw new AuthorNotFoundError()
    return this.books.create(input)
  }
}
```

> 抽象クラスではなく `Symbol` トークン + `@Inject(BOOK_REPOSITORY)` で書く方法もある。ドメイン層に `@Injectable()` などの NestJS の import を一切入れたくない場合はそちらを選ぶ。本プロジェクトは「Laravel のタイプヒントに寄せる」ことを優先して抽象クラスを採用する。抽象クラスには NestJS のデコレータを付けないので、ドメイン層は NestJS に依存しない。

### Laravel と NestJS の対応

| | Laravel | NestJS（本プロジェクト） |
|---|---|---|
| バインドする場所 | `AppServiceProvider` の `$this->app->bind()` | 各 Module の `providers` に `{ provide, useClass }` で宣言 |
| 依存の受け取り方 | コンストラクタのタイプヒント | コンストラクタ引数の型（抽象クラス） |
| 差し替え（テスト） | `$this->app->instance()` / `$this->mock()` | `Test.createTestingModule().overrideProvider()` |

---

## 各レイヤーの仕様

各ディレクトリには、実装後にこの節の内容を分けて `README.md` として置く。各ディレクトリの README がそのディレクトリの規約の正本になり、人も AI もそこを起点に実装する。

### `http/controllers/`（Controller）

**責務**

- HTTP リクエストを受け取り、レスポンスを返す
- バリデーションは Request DTO（引数の型）で行う。Controller 内では行わない
- 認証・認可は `@UseGuards()` で宣言する
- UseCase / Service を呼び出し、結果を Resource で整形して返す

**規約**

- ビジネスロジックを書かない（→ `useCases/` へ）
- try/catch でドメイン例外を HTTP に変換しない（→ `http/filters/handler.filter.ts` が一括で行う）
- ID は `@Param('id', ParseIntPipe) id: number` で受け取る（数値以外は 400）
- 単純な取得（プロフィール取得など）はリポジトリを直接呼んでよい（ルールのない取得のために UseCase を作らない）

```ts
@Controller('books')
export class BooksController {
  constructor(
    private readonly getBooks: GetBooksUseCase,
    private readonly getBook: GetBookUseCase,
    private readonly createBook: CreateBookUseCase,
    private readonly updateBook: UpdateBookUseCase,
    private readonly deleteBook: DeleteBookUseCase,
  ) {}

  @Get()
  async index() {
    return BookResource.collection(await this.getBooks.execute())
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(201)
  async store(@Body() request: CreateBookRequest) {
    return BookResource.make(await this.createBook.execute(request))
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(204)
  async destroy(@Param('id', ParseIntPipe) id: number) {
    await this.deleteBook.execute(id)
  }
}
```

メソッド名は Laravel のリソースコントローラに揃える（`index` / `show` / `store` / `update` / `destroy`）。

**チェックリスト**

- [ ] 対応する Module の `controllers` に登録されている
- [ ] 引数の型に `http/requests/` の Request DTO を使っている
- [ ] 戻り値を Resource で整形している（Entity やパスワード付きの型をそのまま返していない）
- [ ] 認証・認可が必要なメソッドに `@UseGuards()` がある

### `http/requests/`（FormRequest）

**責務**

- リクエストボディのバリデーションルールを class-validator のデコレータで宣言する
- ルールの宣言だけを行い、ビジネスロジック・DB アクセスを含まない（`exists` / `unique` 相当は UseCase で判定する）

**命名**：`{動詞}{対象}Request`（例：`CreateBookRequest`）

**ルール一覧**

| クラス | フィールド | ルール（Laravel 表記） | class-validator |
|---|---|---|---|
| `LoginRequest` | `email` | `required\|email` | `@IsEmail()` |
| | `password` | `required\|string\|min:1` | `@IsString() @IsNotEmpty()` |
| `RegisterRequest` | `name` | `required\|string\|max:100` | `@IsString() @IsNotEmpty() @MaxLength(100)` |
| | `email` | `required\|email` | `@IsEmail()` |
| | `password` | `required\|string\|min:8` | `@IsString() @MinLength(8)` |
| `LogoutRequest` | `token` | `required\|string` | `@IsString() @IsNotEmpty()` |
| `RefreshTokenRequest` | `refreshToken` | `required\|string` | `@IsString() @IsNotEmpty()` |
| `CreateAuthorRequest` / `UpdateAuthorRequest` | `name` | `required\|string\|max:100` | `@IsString() @IsNotEmpty() @MaxLength(100)` |
| | `email` | `nullable\|email` | `@IsOptional() @IsEmail()` |
| `CreateBookRequest` / `UpdateBookRequest` | `title` | `required\|string` | `@IsString() @IsNotEmpty()` |
| | `authorId` | `required\|integer\|min:1` | `@IsInt() @Min(1)` |
| | `price` | `required\|integer\|min:1` | `@IsInt() @Min(1)` |
| `UpdateProfileRequest` | `name` | `required\|string\|max:100` | `@IsString() @IsNotEmpty() @MaxLength(100)` |
| `UpdatePasswordRequest` | `currentPassword` | `required\|string` | `@IsString() @IsNotEmpty()` |
| | `newPassword` | `required\|string\|min:8` | `@IsString() @MinLength(8)` |
| `UpdateUserRequest` | `name` | `required\|string\|max:100` | `@IsString() @IsNotEmpty() @MaxLength(100)` |
| | `email` | `required\|email` | `@IsEmail()` |
| | `isAdmin` | `boolean`（省略時 `false`） | `@IsOptional() @IsBoolean()`、プロパティ初期値 `= false` |

**チェックリスト**

- [ ] クラス名が `{動詞}{対象}Request`
- [ ] DB アクセスを含んでいない
- [ ] `test/unit/requests/` に Valid と Missing / Invalid のテストがある

### `http/resources/`（API Resource）

**責務**：ドメイン型をレスポンスの JSON に変換する。パスワードなど外に出してはいけない値はここで落とす。

```ts
export class BookResource {
  static make(book: Book) {
    return { id: book.id, title: book.title, authorId: book.authorId, price: book.price }
  }

  static collection(books: Book[]) {
    return books.map((b) => BookResource.make(b))
  }
}
```

| Resource | 出力するキー |
|---|---|
| `UserResource` | `id`, `name`, `email`, `isAdmin` |
| `AuthorResource` | `id`, `name`, `email`（未設定は `null`） |
| `BookResource` | `id`, `title`, `authorId`, `price` |

> Laravel の `JsonResource` はデフォルトで `{ "data": ... }` に包む。本プロジェクトはレスポンスを平らに保つため包まない（`JsonResource::withoutWrapping()` 相当）。包みたくなったら Resource 側を変えるだけで済む。

### `http/guards/`（Middleware）

| ファイル | Laravel | 内容 |
|---|---|---|
| `jwt-auth.guard.ts` | `auth:sanctum` | `Authorization: Bearer <token>` を検証する。署名と有効期限を確認し、さらに `UserRepository.findById(sub)` でユーザーが存在することを確認する。OK なら `request.user = { id }` をセット。NG は 401 |
| `admin.guard.ts` | `can:admin` | `request.user.id` で `UserRepository.findById` し、`isAdmin` が `false` なら 403。必ず `JwtAuthGuard` の後に並べる |

- 401 は `throw new UnauthorizedException({ message: 'Unauthenticated.' })`
- 403 は `throw new ForbiddenException({ message: 'This action is unauthorized.' })`
- どちらも Laravel の既定メッセージに合わせる

### `http/decorators/current-user.decorator.ts`

`$request->user()` 相当。`JwtAuthGuard` がセットした `request.user` を取り出す。

```ts
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user as { id: number },
)
```

### `http/filters/`（Exceptions/Handler.php）

- `handler.filter.ts`：`@Catch()` ですべての例外を受け、Laravel と同じ形の JSON に変換する（[エラーレスポンス仕様](#エラーレスポンス仕様)）
- `validation-exception.factory.ts`：`ValidationPipe` の `exceptionFactory`。class-validator のエラーを Laravel の 422 形式に変換する

ドメイン例外 → HTTP の変換表：

| ドメイン例外（`domain/errors.ts`） | HTTP | ボディ |
|---|---|---|
| `NotFoundError` | 404 | `{ "message": "Not Found." }` |
| `InvalidCredentialsError`（ログイン） | 401 | `{ "message": "These credentials do not match our records." }` |
| `CurrentPasswordMismatchError`（パスワード変更） | 401 | `{ "message": "The current password is incorrect." }` |
| `EmailAlreadyExistsError` | 409 | `{ "message": "The email has already been taken." }` |
| `InvalidRefreshTokenError`（存在しない・期限切れ） | 401 | `{ "message": "Invalid or expired refresh token." }` |
| `AuthorNotFoundError`（書籍の `authorId`） | 422 | `{ "message": "The selected author id is invalid.", "errors": { "authorId": ["The selected author id is invalid."] } }` |

### `useCases/`（Action クラス）

**共通の責務**

- HTTP を知らない（`Request` / `Response` / `HttpException` に依存しない）
- バリデーションをしない（Request DTO で済んでいる前提）
- DB には Repository 抽象クラス経由でアクセスする
- 失敗はドメイン例外を `throw` して表す（HTTP ステータスは Filter が決める）

**規約**：`@Injectable() class {動詞}{対象}UseCase { execute(...) }`、1 ファイル 1 ユースケース

| UseCase | シグネチャ | 仕様 |
|---|---|---|
| `LoginUseCase` | `execute({ email, password }): Promise<{ accessToken, refreshToken }>` | `findByEmail` → `verifyPassword` → アクセストークン生成（`JwtService`）→ リフレッシュトークン生成・保存。ユーザーがいない・パスワード不一致は `InvalidCredentialsError` |
| `RegisterUseCase` | `execute({ name, email, password }): Promise<User>` | メール重複は `EmailAlreadyExistsError`。パスワードをハッシュ化して作成（`isAdmin = false`） |
| `LogoutUseCase` | `execute(token): Promise<void>` | `deleteByToken`。存在しなくてもエラーにしない |
| `RefreshTokenUseCase` | `execute(refreshToken): Promise<{ accessToken }>` | `findByToken`。存在しない・`expiresAt` が過去なら `InvalidRefreshTokenError`（期限切れのトークンは削除する） |
| `GetAuthorsUseCase` / `GetAuthorUseCase` | `execute()` / `execute(id)` | 見つからなければ `NotFoundError` |
| `CreateAuthorUseCase` / `UpdateAuthorUseCase` / `DeleteAuthorUseCase` | | 更新・削除の対象がなければ `NotFoundError` |
| `GetBooksUseCase` / `GetBookUseCase` | | 見つからなければ `NotFoundError` |
| `CreateBookUseCase` / `UpdateBookUseCase` | | `authorId` の著者がいなければ `AuthorNotFoundError`。更新対象がなければ `NotFoundError` |
| `DeleteBookUseCase` | | 対象がなければ `NotFoundError` |
| `GetUsersUseCase` / `GetUserUseCase` / `UpdateUserUseCase` / `DeleteUserUseCase` | | 見つからなければ `NotFoundError`。更新時にメールが他ユーザーと重複したら `EmailAlreadyExistsError` |

### `services/`（Domain Service）

UseCase との使い分けは次のとおり。

| | useCases | services |
|---|---|---|
| 役割 | 複数操作のフロー制御 | 単一エンティティのビジネスルール |
| 例 | ログイン（認証 → トークン発行 → DB 保存） | プロフィール名変更（メールは変更不可） |

| Service | シグネチャ | ビジネスルール |
|---|---|---|
| `UpdateProfileNameService` | `execute(userId, name): Promise<User>` | 名前だけを変更する。メールアドレス・権限は変更できない |
| `UpdatePasswordService` | `execute(userId, currentPassword, newPassword): Promise<void>` | 現在のパスワードが一致しなければ `CurrentPasswordMismatchError` |

プロフィール取得は `findById` を呼ぶだけなので Service を作らない（Controller から Repository を直接呼ぶ）。

### `domain/`

**責務**：エンティティ型・入力型・Repository 抽象クラス・ドメイン例外を定義する。NestJS・TypeORM・Express など外部ライブラリを import しない。

```ts
// domain/users/user.ts
export type User = { id: number; name: string; email: string; isAdmin: boolean }
export type UserWithPassword = User & { password: string }
export type CreateUserInput = { name: string; email: string; password: string; isAdmin: boolean }
export type UpdateUserInput = { name: string; email: string; isAdmin: boolean }

// domain/users/user.repository.ts
export abstract class UserRepository {
  abstract findAll(): Promise<User[]>
  abstract findById(id: number): Promise<User | null>
  abstract findByEmail(email: string): Promise<UserWithPassword | null>
  abstract create(input: CreateUserInput): Promise<User>
  abstract update(id: number, input: UpdateUserInput): Promise<User | null>
  abstract updateName(id: number, name: string): Promise<User | null>
  abstract updatePassword(id: number, hashedPassword: string): Promise<void>
  abstract delete(id: number): Promise<boolean>
}
```

| ドメイン | エンティティ型 | Repository のメソッド |
|---|---|---|
| Author | `{ id, name, email: string \| null }` | `findAll` / `findById` / `create` / `update` / `delete` |
| Book | `{ id, title, authorId, price }` | `findAll` / `findById` / `create` / `update` / `delete` |
| User | 上記 | 上記 |
| RefreshToken | `{ userId, token, expiresAt: Date }` | `create(userId, token, expiresAt)` / `findByToken` / `deleteByToken` / `deleteByUserId` |

```ts
// domain/errors.ts
export class DomainError extends Error {}
export class NotFoundError extends DomainError {}
export class InvalidCredentialsError extends DomainError {}
export class CurrentPasswordMismatchError extends DomainError {}
export class EmailAlreadyExistsError extends DomainError {}
export class InvalidRefreshTokenError extends DomainError {}
export class AuthorNotFoundError extends DomainError {}
```

**チェックリスト**

- [ ] import に外部ライブラリ（`@nestjs/*`、`typeorm` など）がない
- [ ] 実装コードがない（型・抽象クラス・例外クラスのみ）

### `infrastructure/`

**entities/**（Eloquent Model 相当）

- TypeORM の `@Entity()` クラス。テーブル名は Laravel と同じ複数形スネークケース（`refresh_tokens`）
- カラムはプロパティを camelCase、DB はスネークケース（`@Column({ name: 'author_id' })`）
- `authors` / `books` / `users` は `@CreateDateColumn` / `@UpdateDateColumn` / `@DeleteDateColumn`（timestamps + SoftDeletes）
- ドメイン層は Entity を知らない

**repositories/**（Repository 実装）

- 命名：`TypeOrm{対象}Repository`、ファイル `typeorm-{対象}.repository.ts`
- `extends BookRepository` で抽象クラスを実装する（実装漏れはコンパイルエラーになる）
- `@InjectRepository(BookEntity)` で TypeORM の Repository を受け取る
- 戻り値は必ずドメイン型に変換する（Entity をそのまま返さない）
- 削除は `softDelete(id)`。`affected === 0` なら `false` を返す
- `findByEmail` だけ `password` を含む `UserWithPassword` を返す

**チェックリスト**

- [ ] `domain/` の抽象クラスを `extends` している
- [ ] ドメイン型に変換して返している
- [ ] ビジネスロジックを含んでいない

### `shared/`

| ファイル | 関数 | 仕様 |
|---|---|---|
| `password.ts` | `hashPassword(plain, rounds)` / `verifyPassword(plain, hashed)` | bcrypt。rounds は `BCRYPT_ROUNDS`（既定 12、テストは 4。Laravel と同じ） |
| `token.ts` | `generateRefreshToken()` / `refreshTokenExpiresAt(now = new Date())` | 32 バイトのランダム hex 文字列 / 現在から 30 日後 |

アクセストークンの生成・検証は `@nestjs/jwt` の `JwtService`（`signAsync` / `verifyAsync`）を使うので `shared/` には置かない。

### `modules/`（ServiceProvider）

| Module | 中身 |
|---|---|
| `DatabaseModule` | `TypeOrmModule.forRootAsync()`（`ConfigService` から DB 設定を読む） |
| `UsersModule` | `UserRepository`・`RefreshTokenRepository` のバインド、Users の UseCase、`UsersController`。`UserRepository`（Guard が使う）と `RefreshTokenRepository`（Auth の UseCase が使う）を export |
| `AuthModule` | `JwtModule.registerAsync({ global: true })`、Auth の UseCase、`AuthController`。`UsersModule` を import |
| `ProfileModule` | Profile の Service、`ProfileController` |
| `AuthorsModule` | `AuthorRepository` のバインド（export）、Authors の UseCase、`AuthorsController` |
| `BooksModule` | `BookRepository` のバインド、Books の UseCase、`BooksController` |

Guard を Controller で使うには、Guard が依存する `JwtService` と `UserRepository` がその Module から見える必要がある。`AuthModule` が `JwtModule` と `UsersModule` を re-export して各 Module が `AuthModule` を import する形にすると、`UsersModule`（`UsersController` で Guard を使う）と `AuthModule`（`UserRepository` を使う）が循環 import になる。そこで次のようにする（`forwardRef()` は読みにくくなるので使わない）。

- `AuthModule` で `JwtModule.registerAsync({ global: true, ... })` として `JwtService` をグローバルにする（Laravel の `auth` がどこからでも使えるのと同じ感覚）
- `UserRepository` は `UsersModule` が export し、Guard を使う Module（Auth / Profile / Authors / Books）は `UsersModule` を import する

### `config/`

```ts
// config/auth.config.ts（config/auth.php 相当）
export default registerAs('auth', () => ({
  jwtSecret: process.env.JWT_SECRET,
  accessTokenTtlSeconds: 60 * 15,
  refreshTokenTtlDays: 30,
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS ?? 12),
}))
```

`JWT_SECRET` が未設定なら起動時にエラーで止める（署名鍵のないまま動かさないため）。

---

## API 仕様

ベースパスは `/api`。ボディはすべて JSON。

### 認証 `/api/auth`

| メソッド | パス | リクエスト | 成功時 | 失敗時 |
|---|---|---|---|---|
| POST | `/login` | `{ email, password }` | 200 `{ accessToken, refreshToken }` | 401（認証失敗）/ 422 |
| POST | `/register` | `{ name, email, password }` | 201 `UserResource` | 409（メール重複）/ 422 |
| POST | `/logout` | `{ token }`（リフレッシュトークン） | 204 | 422 |
| POST | `/refresh-token` | `{ refreshToken }` | 200 `{ accessToken }` | 401（無効・期限切れ）/ 422 |

### プロフィール `/api/profile`（全ルート要認証）

| メソッド | パス | リクエスト | 成功時 | 失敗時 |
|---|---|---|---|---|
| GET | `/` | | 200 `UserResource` | 401 |
| PUT | `/` | `{ name }` | 200 `UserResource` | 401 / 422 |
| PUT | `/password` | `{ currentPassword, newPassword }` | 204 | 401（未認証・現在のパスワード不一致）/ 422 |

メールアドレスは変更できない（`email` を送っても `whitelist` で捨てられる）。

### 著者 `/api/authors`・書籍 `/api/books`

| メソッド | パス | 認証 | 成功時 | 失敗時 |
|---|---|---|---|---|
| GET | `/` | 不要 | 200 配列 | |
| GET | `/:id` | 不要 | 200 | 400（ID が数値でない）/ 404 |
| POST | `/` | 管理者 | 201 | 401 / 403 / 422 |
| PUT | `/:id` | 管理者 | 200 | 401 / 403 / 404 / 422 |
| DELETE | `/:id` | 管理者 | 204 | 401 / 403 / 404 |

書籍の `authorId` に存在しない著者を指定すると 422（`errors.authorId`）。

### ユーザー `/api/users`

| メソッド | パス | 認証 | 成功時 | 失敗時 |
|---|---|---|---|---|
| GET | `/` | 不要 | 200 配列 | |
| GET | `/:id` | 不要 | 200 | 400 / 404 |
| PUT | `/:id` | 管理者 | 200 | 401 / 403 / 404 / 409 / 422 |
| DELETE | `/:id` | 管理者 | 204 | 401 / 403 / 404 |

ユーザーの作成は `/api/auth/register` で行う（`POST /api/users` はない）。

### レスポンス例

```json
// GET /api/books/1
{ "id": 1, "title": "こころ", "authorId": 1, "price": 600 }

// GET /api/authors
[
  { "id": 1, "name": "夏目漱石", "email": "soseki@example.com" },
  { "id": 2, "name": "芥川龍之介", "email": "akutagawa@example.com" }
]

// POST /api/auth/register → 201
{ "id": 3, "name": "テスト", "email": "test@example.com", "isAdmin": false }
```

---

## エラーレスポンス仕様

Laravel の JSON エラーと同じ形にそろえる。すべてのエラーは `message` を持ち、バリデーションエラーだけ `errors` を持つ。

| ステータス | 発生条件 | ボディ |
|---|---|---|
| 400 | `:id` が数値でない | `{ "message": "Validation failed (numeric string is expected)" }` |
| 401 | トークンなし・不正・期限切れ・ユーザー削除済み | `{ "message": "Unauthenticated." }` |
| 401 | ログイン失敗 | `{ "message": "These credentials do not match our records." }` |
| 403 | 管理者でない | `{ "message": "This action is unauthorized." }` |
| 404 | 対象なし・存在しないルート | `{ "message": "Not Found." }` |
| 409 | メール重複 | `{ "message": "The email has already been taken." }` |
| 422 | バリデーションエラー | 下記 |
| 500 | 想定外 | `{ "message": "Server Error" }`（詳細はログにだけ出す） |

```json
// 422
{
  "message": "name should not be empty (and 1 more error)",
  "errors": {
    "name": ["name should not be empty"],
    "email": ["email must be an email"]
  }
}
```

- `message` は最初のエラー。2 件以上あれば ` (and N more error(s))` を付ける（Laravel と同じ）
- `errors` のキーはリクエストのプロパティ名、値はメッセージの配列
- メッセージは class-validator の既定（英語）でよい。日本語にしたい場合は各デコレータの `{ message: '...' }` で指定する

`ValidationPipe` の設定（`bootstrap.ts`）：

```ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,        // $request->validated() と同じく、ルールにないキーは捨てる
    transform: true,        // プレーンオブジェクトを Request クラスのインスタンスに変換
    exceptionFactory: validationExceptionFactory, // 422 + Laravel 形式
  }),
)
```

---

## データベース

### テーブル定義

#### `authors`

| カラム | 型 | 制約 |
|---|---|---|
| `id` | integer | PK, AUTO INCREMENT |
| `name` | text | NOT NULL |
| `email` | text | NULL 可 |
| `created_at` / `updated_at` | datetime | NOT NULL |
| `deleted_at` | datetime | NULL 可（SoftDeletes） |

#### `books`

| カラム | 型 | 制約 |
|---|---|---|
| `id` | integer | PK, AUTO INCREMENT |
| `title` | text | NOT NULL |
| `author_id` | integer | NOT NULL, FK → `authors.id` |
| `price` | integer | NOT NULL |
| `created_at` / `updated_at` | datetime | NOT NULL |
| `deleted_at` | datetime | NULL 可（SoftDeletes） |

#### `users`

| カラム | 型 | 制約 |
|---|---|---|
| `id` | integer | PK, AUTO INCREMENT |
| `name` | text | NOT NULL |
| `email` | text | NOT NULL, UNIQUE |
| `password` | text | NOT NULL（bcrypt ハッシュ） |
| `is_admin` | boolean | NOT NULL, DEFAULT false |
| `created_at` / `updated_at` | datetime | NOT NULL |
| `deleted_at` | datetime | NULL 可（SoftDeletes） |

#### `refresh_tokens`

| カラム | 型 | 制約 |
|---|---|---|
| `id` | integer | PK, AUTO INCREMENT |
| `user_id` | integer | NOT NULL, FK → `users.id` ON DELETE CASCADE |
| `token` | text | NOT NULL, UNIQUE |
| `expires_at` | datetime | NOT NULL |
| `created_at` | datetime | NOT NULL |

#### SoftDeletes の注意

- ユーザーを論理削除しても `email` の UNIQUE 制約は残る。同じメールで再登録すると 409 になる（Laravel でも `unique:users,email` に `whereNull('deleted_at')` を付けないと同じ挙動）。本プロジェクトはこのままでよい
- ユーザーを論理削除したら、そのユーザーのリフレッシュトークンは `deleteByUserId` で物理削除する（`DeleteUserUseCase`）
- 著者を論理削除しても書籍は残る（論理削除なので参照先の行は残り、外部キーは壊れない。書籍まで消すかは業務の判断なので、今回は連鎖させない）

### マイグレーション

Laravel と同じく、テーブルごとに 1 クラス。`up()` / `down()` を書く。

```ts
// src/database/migrations/1700000000002-create-books-table.ts
export class CreateBooksTable1700000000002 implements MigrationInterface {
  async up(queryRunner: QueryRunner) {
    await queryRunner.createTable(new Table({ name: 'books', columns: [ /* ... */ ] }))
    await queryRunner.createForeignKey('books', new TableForeignKey({
      columnNames: ['author_id'], referencedTableName: 'authors', referencedColumnNames: ['id'],
    }))
  }

  async down(queryRunner: QueryRunner) {
    await queryRunner.dropTable('books')
  }
}
```

- `migrations/index.ts` でクラスの配列をエクスポートし、`data-source.ts` とアプリ・テストの全部がこの配列を使う。glob（`'dist/**/*.js'` など）で読み込むと、テスト実行時（ts）と本番・CLI 実行時（dist の js）でパスが変わって壊れやすいため
- アプリ本体の TypeORM 設定は `synchronize: false`。スキーマ変更は必ずマイグレーションで行う

| Laravel | 本プロジェクト |
|---|---|
| `php artisan migrate` | `npm run db:migrate` |
| `php artisan migrate:rollback` | `npm run db:rollback` |
| `php artisan db:seed` | `npm run db:seed` |
| `php artisan migrate:fresh --seed` | `npm run db:fresh` |

### シーダー

`DatabaseSeeder` を作り、何度実行しても重複しないように `firstOrCreate` 相当（メール・名前・タイトルで検索してなければ作成）で投入する。

| テーブル | データ |
|---|---|
| users | 管理者君 `admin@example.com` / `password`（管理者）、一般君 `normal@example.com` / `password` |
| authors | 夏目漱石（soseki@example.com）、芥川龍之介（akutagawa@example.com）、太宰治（dazai@example.com） |
| books | こころ（夏目漱石, 600）、坊っちゃん（夏目漱石, 500）、羅生門（芥川龍之介, 400）、蜘蛛の糸（芥川龍之介, 350）、人間失格（太宰治, 550） |

---

## 認証

| 項目 | 仕様 |
|---|---|
| アクセストークン | JWT（HS256）。ペイロード `{ sub: userId }`、有効期限 15 分。`JwtService.signAsync` で発行 |
| リフレッシュトークン | 32 バイトのランダム hex 文字列。有効期限 30 日。`refresh_tokens` に保存 |
| ログイン | アクセストークンとリフレッシュトークンを両方返す |
| リフレッシュ | 新しいアクセストークンだけ返す（リフレッシュトークンはローテーションしない。ローテーションは範囲外で、入れるときは別の change で扱う） |
| ログアウト | 送られたリフレッシュトークンを削除する。アクセストークンは失効しない（有効期限で切れる） |
| 管理者判定 | `AdminGuard` が DB の `is_admin` を毎回見る（トークンに権限を入れない） |

---

## テスト

### 方針

- Feature テストはモックを使わない。実際の TypeORM Repository と SQLite（インメモリ）を通す
- テストごとに新しいアプリと新しいインメモリ DB を作る（`RefreshDatabase` 相当）
- テスト用 DB にもマイグレーションを流す（`migrationsRun: true`）。マイグレーション自体の確認も兼ねる

### 環境変数（`test/setup-env.ts`）

```ts
process.env.JWT_SECRET = 'test-secret'
process.env.DATABASE_URL = ':memory:'
process.env.BCRYPT_ROUNDS = '4'
```

### 共通ヘルパー（`test/helpers.ts`）

```ts
createTestApp(): Promise<INestApplication>   // AppModule を起動し configureApp() を適用
seedAdminUser(app): Promise<User>            // admin@example.com / password（管理者）
seedNormalUser(app): Promise<User>           // normal@example.com / password
loginAs(app, email, password): Promise<string> // accessToken を返す
loginAsAdmin(app): Promise<string>
```

> `main.ts` だけでグローバル Pipe・Filter・prefix を設定すると、テストのアプリにはそれが掛からない。`bootstrap.ts` の `configureApp(app)` を `main.ts` とテストの両方から呼ぶ（本番とテストが同じ設定を通ることを保証する。Laravel の Feature テストがアプリ全体を起動するのと同じ考え方）。

```ts
describe('POST /api/books', () => {
  let app: INestApplication

  beforeEach(async () => { app = await createTestApp() })
  afterEach(async () => { await app.close() })

  it('管理者は作成できる → 201', async () => {
    await seedAdminUser(app)
    const token = await loginAsAdmin(app)
    const author = await createAuthor(app, { name: '太宰治' })

    await request(app.getHttpServer())
      .post('/api/books')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '人間失格', authorId: author.id, price: 550 })
      .expect(201)
  })
})
```

### テストケース一覧

#### Feature（`test/feature/`）

| ファイル | ケース |
|---|---|
| `auth.e2e-spec.ts` | ログイン成功 → 200・2 つのトークン／パスワード違い → 401／存在しないメール → 401／登録成功 → 201・パスワードを返さない／既存メール → 409／登録の入力不正 → 422・`errors` あり／ログアウト → 204・そのトークンでリフレッシュできない／リフレッシュ成功 → 200／無効なリフレッシュトークン → 401／期限切れのリフレッシュトークン → 401 |
| `profile.e2e-spec.ts` | 取得 → 200／トークンなし → 401／名前更新 → 200・メールは変わらない／パスワード変更 → 204・新パスワードでログインできる／現在のパスワード違い → 401 |
| `authors.e2e-spec.ts` | 一覧 → 200／個別 → 200／存在しない ID → 404／ID が数値でない → 400／管理者が作成 → 201／トークンなし → 401／一般ユーザー → 403／入力不正 → 422／更新 → 200／削除 → 204・その後 GET で 404 |
| `books.e2e-spec.ts` | 一覧／個別／404／管理者が作成 → 201／トークンなし → 401／一般ユーザー → 403／入力不正 → 422／存在しない `authorId` → 422（`errors.authorId`）／更新 → 200／削除 → 204 |
| `users.e2e-spec.ts` | 一覧 → 200・パスワードを含まない／個別 → 200／404／管理者が更新 → 200／一般ユーザーが削除 → 403／管理者が削除 → 204／メール重複で更新 → 409 |
| `guards.e2e-spec.ts` | 有効なトークン → 通る／ヘッダーなし → 401／不正なトークン → 401／トークンは有効だがユーザー削除済み → 401／管理者 → 通る／一般ユーザー → 403 |
| `errors.e2e-spec.ts` | 未定義ルート → 404 `Not Found.`／不正な JSON → 400・`message` だけ／エラーボディに `message`（と 422 の `errors`）以外のキーがない／ルールにないキーは捨てられる／想定外の例外 → 500 `Server Error`・詳細を含まない |
| `database.e2e-spec.ts` | `db:migrate` で 4 テーブル・2 回目も変わらない／カラム（timestamps・SoftDeletes）／一意制約・外部キー／`db:rollback` で `refresh_tokens` だけ消え、再適用で戻る／`db:seed` 1 回・2 回で users 2・authors 3・books 5、シードの管理者でログインできる／`db:fresh` でシード直後に戻る（DB ファイルなしでも）／`JWT_SECRET` なしで起動が止まる・`JWT_SECRET` だけで 3000 番・`sqlite.db` で起動。一時ディレクトリの DB に対して npm script と `dist/main.js` を実際に起動する（1 回 2 秒ほどかかる） |

#### Unit（`test/unit/`）

| ファイル | ケース |
|---|---|
| `requests/auth.spec.ts` | `LoginRequest`：Valid／password なし／email 形式不正。`RegisterRequest`：Valid／name なし／password 7 文字。`LogoutRequest`：Valid／token なし。`RefreshTokenRequest`：Valid／なし |
| `requests/authors.spec.ts` | Create：Valid／name なし／email 付き Valid／email 形式不正／name 101 文字。Update：Valid／name なし |
| `requests/books.spec.ts` | Create：Valid／title なし／authorId なし／price 0。Update：Valid／title なし |
| `requests/profile.spec.ts` | UpdateProfile：Valid／name なし。UpdatePassword：Valid／currentPassword なし／newPassword 7 文字 |
| `requests/users.spec.ts` | UpdateUser：Valid／name なし／isAdmin 省略で `false` |
| `filters/validation-exception.factory.spec.ts` | 1 件のとき `message` がそのエラー文／2 件以上で `(and N more error(s))` が付く／`errors` がプロパティ名ごとの配列 |

Request の Unit テストは HTTP を通さず、`plainToInstance` + `validate` で行う（Laravel で FormRequest の `rules()` を `Validator::make()` に渡して直接確かめるのと同じ位置づけ）。

```ts
it('LoginRequest: password なし → エラー', async () => {
  const req = plainToInstance(LoginRequest, { email: 'test@example.com' })
  const errors = await validate(req)
  expect(errors.map((e) => e.property)).toContain('password')
})
```

### Vitest 設定（`vitest.config.ts`）

`nest new` が作る `src/**/*.spec.ts` 用（`vitest.config.ts`）と e2e 用（`vitest.config.e2e.ts`）の 2 本立てをやめ、`test/` の下に Feature・Unit をまとめる。

```ts
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.{spec,e2e-spec}.ts'],
    setupFiles: ['./test/setup-env.ts'],
  },
})
```

| コマンド | 内容 |
|---|---|
| `npm test` | 全テスト |
| `npm run test:feature` | `vitest run test/feature` |
| `npm run test:unit` | `vitest run test/unit` |
| `npm run test:watch` | `vitest`（ファイルの変更を監視） |

---

## セットアップ（WSL）

### 前提

```bash
# better-sqlite3・bcrypt はネイティブビルドが走るので、ビルドツールを入れておく
sudo apt update && sudo apt install -y build-essential python3

# Node.js（mise で管理する場合）
mise use node@lts
node -v
```

### プロジェクト作成

```bash
npx @nestjs/cli new nestjs-by-laravel-engineer --package-manager npm --strict
cd nestjs-by-laravel-engineer

npm i @nestjs/config @nestjs/jwt @nestjs/typeorm typeorm better-sqlite3 \
      class-validator class-transformer bcrypt
npm i -D @types/bcrypt @types/better-sqlite3

# npm 11 は install スクリプトを既定で止めるので、ネイティブビルドが要る 2 つだけ許可する
npm approve-scripts better-sqlite3 bcrypt
npm rebuild better-sqlite3 bcrypt
```

`supertest` / `@types/supertest` は `nest new` の雛形に入っている。`nest new` が作る `src/app.controller.ts` / `app.service.ts` / `app.controller.spec.ts` / `test/app.e2e-spec.ts` / `vitest.config.e2e.ts` は使わないので消す。

### npm scripts（追加分）

```json
"db:migrate":   "nest build && typeorm migration:run -d dist/database/data-source.js",
"db:rollback":  "nest build && typeorm migration:revert -d dist/database/data-source.js",
"db:seed":      "nest build && node dist/database/seeders/run.js",
"db:fresh":     "nest build && typeorm schema:drop -d dist/database/data-source.js && typeorm migration:run -d dist/database/data-source.js && node dist/database/seeders/run.js",
"test":         "vitest run",
"test:feature": "vitest run test/feature",
"test:unit":    "vitest run test/unit"
```

- CLI はビルド済みの `dist/` の js を動かす。Node は TypeScript のデコレータを直接実行できず、ESM で動く ts-node 系のローダーはデコレータのメタデータの扱いが不安定なため。本番と同じ js を動かすことにもなる
- `db:fresh` は `migrate:fresh` と同じく、すべてのテーブルを消してからマイグレーションとシーダーを流す。DB ファイルの場所（`.env` の `DATABASE_URL`）をシェルで解決しなくて済む
- `data-source.ts` は Nest の外（CLI）から読まれるので、先頭で `process.loadEnvFile('.env')`（Node 組み込み）して `.env` を読む

### 環境変数（`.env.example`）

| 変数名 | 説明 | 例・既定値 |
|---|---|---|
| `JWT_SECRET` | JWT の署名シークレット（必須） | `openssl rand -hex 32` で生成 |
| `DATABASE_URL` | SQLite ファイルパス | 既定 `sqlite.db` |
| `PORT` | 待ち受けポート | 既定 `3000` |
| `BCRYPT_ROUNDS` | bcrypt のコスト | 既定 `12` |

### 起動

```bash
cp .env.example .env    # JWT_SECRET を設定する
npm run db:migrate
npm run db:seed
npm run start:dev
```

### 動作確認

```bash
# ログイン
curl -s -X POST localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"password"}'

# 書籍を作成（TOKEN にログインで得た accessToken を入れる）
curl -s -X POST localhost:3000/api/books \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"走れメロス","authorId":3,"price":450}'

# 422 の形を確認
curl -s -X POST localhost:3000/api/books \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{}'
```

---

## 実装の進め方

README を起点に実装する（仕様が変わったら先に README を直し、実装との食い違いを調べてから直す）。各ステップの最後にテストを通してから次へ進む。

| # | ステップ | 完了の目安 |
|---|---|---|
| 0 | プロジェクト作成・依存追加・不要ファイル削除・Vitest 設定 | `npm test` が「テストなし」で通る |
| 1 | `config/`・`DatabaseModule`・Entity 4 つ・マイグレーション 4 つ・`data-source.ts` | `npm run db:migrate` でテーブルができる |
| 2 | シーダー | `npm run db:seed` を 2 回実行しても重複しない |
| 3 | `bootstrap.ts`（prefix・ValidationPipe・Handler フィルタ・CORS）、`validation-exception.factory.ts` | factory の Unit テストが通る |
| 4 | `domain/`（型・抽象クラス・例外）、`shared/` | import に外部ライブラリがない |
| 5 | Authors 一式（Repository 実装 → UseCase → Request → Resource → Controller → Module） | `authors.e2e-spec.ts`（ガードは仮で外して GET 系から） |
| 6 | `UsersModule`・`AuthModule`（Login / Register / Logout / Refresh）・`JwtAuthGuard`・`AdminGuard`・`@CurrentUser()` | `auth.e2e-spec.ts`・`guards.e2e-spec.ts`、Authors の 401/403 ケース |
| 7 | Books 一式（`AuthorNotFoundError` → 422 を含む） | `books.e2e-spec.ts` |
| 8 | Users 一式 | `users.e2e-spec.ts` |
| 9 | Profile（2 つの Service） | `profile.e2e-spec.ts` |
| 10 | Request の Unit テスト一式 | `test/unit/requests/` |
| 11 | 各ディレクトリに README を分割して配置 | この README の「各レイヤーの仕様」が各ディレクトリに移っている |

---

## このプロジェクトで決めたこと

Laravel の構成に寄せるために決めたことと、その理由。

| 観点 | 決めたこと | 理由 |
|---|---|---|
| ドメイン例外 → HTTP | `ExceptionFilter` 1 つで一括変換する | `app/Exceptions/Handler.php` と同じく変換を 1 か所に集め、Controller から try/catch をなくす |
| エラーの形 | `{ message }` | Laravel のエラーレスポンスと同じ形にし、Laravel 向けのクライアントをそのまま使えるようにする |
| バリデーションエラー | 422 `{ message, errors }` | Laravel の `ValidationException` と同じ形・同じ `message` の書式にする |
| レスポンス整形 | Resource クラスで返す。`data` では包まない | 外に出すキーを 1 か所で決め、パスワードなどを漏らさない。包むかどうかは Resource だけで変えられる |
| JSON のキー | camelCase（`isAdmin`・`authorId`） | DB の snake_case は Resource で変換し、API は JavaScript のクライアントで扱いやすい形にする |
| 削除・ログアウト・パスワード変更のレスポンス | 204（ボディなし） | 返すものがない。Laravel の `response()->noContent()` に当たる |
| timestamps / SoftDeletes | authors / books / users に付ける | Laravel の `timestamps()` / `SoftDeletes` に当たる。`refresh_tokens` は消えたら使えない方がよいので物理削除 |
| 管理者の判定 | リクエストごとに DB の `is_admin` を見る | トークンに権限を入れると、降格しても有効期限まで管理者のままになる |
| リフレッシュトークン | ローテーションしない | 範囲を小さく保つ。ローテーションは別の change で扱う |
| マイグレーション | クラス（`up` / `down`） | Laravel のマイグレーションとほぼ同じ形で書け、ロールバックできる |
| パスワード | bcrypt | Laravel の `Hash` の既定のドライバと同じ |

### 変えない原則

- 依存の向き：http → useCases / services → domain ← infrastructure。domain は外部ライブラリに依存しない
- useCases と services の使い分け、Repository パターン
- 各ディレクトリに README を置き、仕様が変わったら README から直す運用
