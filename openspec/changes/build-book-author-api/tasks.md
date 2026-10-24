# Tasks

## 1. プロジェクト作成（README ステップ 0）

- [x] 1.1 一時ディレクトリで `npx @nestjs/cli new --strict --skip-git --package-manager npm` を実行し、README.md 以外をリポジトリに取り込む（design D9）。`npm run build` が通ることを確認
- [x] 1.2 依存を追加する（`@nestjs/config @nestjs/jwt @nestjs/typeorm typeorm better-sqlite3 class-validator class-transformer bcrypt`、dev に `@types/bcrypt @types/better-sqlite3`。`supertest` は雛形に含まれる）。`npm approve-scripts better-sqlite3 bcrypt` でネイティブビルドを許可する。`npm ls` でエラーがないことと、両モジュールが読み込めることを確認
- [x] 1.3 `app.controller.ts` / `app.service.ts` / `app.controller.spec.ts` / `test/app.e2e-spec.ts` / `vitest.config.e2e.ts` を削除し、`app.module.ts` を空の Module にする。`npm run build` が通ることを確認
- [x] 1.4 `vitest.config.ts` を `test/` 配下 1 本にし（design D12）、`test/setup-env.ts`、npm scripts（`test:feature` / `test:unit` / `db:*`）、`.env.example`、`.gitignore`（`sqlite.db`・`.env`）を追加する。`npm test -- --passWithNoTests` が通ることを確認

## 2. 設定・DB・マイグレーション（README ステップ 1、spec: database-setup）

- [x] 2.1 `src/config/` に `app.config.ts` / `auth.config.ts` / `database.config.ts` を `registerAs()` で作り、`ConfigModule.forRoot({ isGlobal: true, load })` を `AppModule` に入れる。`JWT_SECRET` 未設定で `JWT_SECRET` を含むエラーで止まること、`JWT_SECRET` だけで既定値（3000・`sqlite.db`・12）が使われることを確認
- [x] 2.2 `src/infrastructure/entities/` に Entity 4 つを作る（snake_case カラム、authors / books / users は timestamps + SoftDeletes）。`npm run build` が通ることを確認
- [x] 2.3 `src/database/migrations/` にマイグレーション 4 つと `index.ts`、`src/database/entities.ts`、`src/database/data-source.ts` を作る（design D6）。`npm run db:migrate` で 4 テーブルとカラム・一意制約・外部キーができること、2 回目の migrate が何もしないこと、`npm run db:rollback` で `refresh_tokens` だけ消え、再 migrate で戻ることを node スクリプトで確認
- [x] 2.4 `src/modules/database.module.ts`（`TypeOrmModule.forRootAsync`、`synchronize: false`、`migrationsRun: true`）を作り `AppModule` に入れる。`npm run start` で起動できることを確認
- [x] 2.5 `src/infrastructure/README.md`（entities の規約）と `src/modules/README.md`（`DatabaseModule` の行）を README「各レイヤーの仕様」から作る

## 3. シーダー（README ステップ 2、spec: database-setup）

- [x] 3.1 `src/shared/password.ts` と `src/shared/token.ts` を作り、`src/shared/README.md` を置く。`npm run build` が通ることを確認
- [x] 3.2 `src/database/seeders/database.seeder.ts` と `run.ts` を作る（design D8）。`npm run db:seed` 1 回で users 2 / authors 3 / books 5、2 回目も同じ件数のままであること、DB ファイルがない状態とデータを足した状態の両方で `npm run db:fresh` がシード直後の状態に戻すことを確認
- [x] 3.3 `test/feature/database.e2e-spec.ts` で spec `database-setup` の全シナリオ（migrate 2 回・カラム・一意制約と外部キー・rollback と再適用・seed 2 回とシードユーザーでのログイン・fresh 2 通り・`JWT_SECRET` なしで停止・既定値での起動）を、一時ディレクトリの DB に npm script と `dist/main.js` を起動して確かめ、`npm run test:feature -- database` が通ることを確認

## 4. アプリ共通設定とエラーハンドリング（README ステップ 3、spec: error-responses）

- [x] 4.1 `src/domain/errors.ts` を作る
- [x] 4.2 `src/http/filters/validation-exception.factory.ts` を作り（design D4）、`test/unit/filters/validation-exception.factory.spec.ts`（1 件／2 件 `(and 1 more error)`／3 件 `(and 2 more errors)`、違反したプロパティだけが `errors` のキーになる）が通ることを確認
- [x] 4.3 `src/http/filters/handler.filter.ts` を作る（design D3）
- [x] 4.4 `src/bootstrap.ts` の `configureApp()`（prefix `api`・ValidationPipe `whitelist` / `transform`・HandlerFilter・CORS）と `src/main.ts` を作る。`test/helpers.ts` の `createTestApp()` を作り（design D7）、`test/feature/errors.e2e-spec.ts` で未定義ルート 404・`/api` なしのパス 404・不正な JSON 400（`message` だけ）が通ることを確認
- [x] 4.5 `src/http/filters/README.md` を置く（ドメイン例外 → HTTP の変換表を含む）

## 5. ドメイン層（README ステップ 4）

- [x] 5.1 `src/domain/{authors,books,users,refreshTokens}/` に型と Repository 抽象クラスを作る（design D1）。`grep -rE "from '(@nestjs|typeorm|express)" src/domain` が 0 件であることを確認
- [x] 5.2 `src/domain/README.md` を置く

## 6. 著者（README ステップ 5、spec: author-management）

- [x] 6.1 `TypeOrmAuthorRepository`、Authors の UseCase 5 つ、`CreateAuthorRequest` / `UpdateAuthorRequest`、`AuthorResource`、`AuthorsController`、`AuthorsModule` を作る
- [x] 6.2 `test/feature/authors.e2e-spec.ts` で、表現（`email` あり・`null`）、一覧（0 件 `[]`・複数・削除済みを含まない）、取得（200・404・400）、作成と作成後の取得、更新と 404、削除と 2 回削除、入力検証（`name` 100 文字 201・101 文字 422・なし・`email` 形式不正）が通ることを確認（認可のケースはグループ 7、書籍への波及はグループ 8 で追加）
- [x] 6.3 `test/feature/errors.e2e-spec.ts` に、エラーボディが `message`（と 422 の `errors`）以外のキーを持たないこと、ルールにないキー（`foo`）が捨てられることを追加して通ることを確認
- [x] 6.4 `src/http/controllers/` / `requests/` / `resources/` と `src/useCases/` の README.md を置く

## 7. 認証・アクセス制御（README ステップ 6、spec: user-auth / access-control）

- [x] 7.1 `TypeOrmUserRepository`（UNIQUE 制約違反 → `EmailAlreadyExistsError`、design D5）と `UsersModule`（`UserRepository`・`RefreshTokenRepository` を export、design D2）を作る
- [x] 7.2 `TypeOrmRefreshTokenRepository`、Auth の UseCase 4 つ（期限判定は design D10）、Auth の Request 4 つ、`UserResource`、`AuthController`、`AuthModule`（`JwtModule` を global 登録、design D2）を作る
- [x] 7.3 `JwtAuthGuard` / `AdminGuard` / `@CurrentUser()` を作り、Authors の作成・更新・削除に `@UseGuards(JwtAuthGuard, AdminGuard)` を付ける（design D11）
- [x] 7.4 `test/helpers.ts` に `seedAdminUser` / `seedNormalUser` / `loginAs` / `loginAsAdmin` を追加する
- [x] 7.5 `test/feature/auth.e2e-spec.ts` で spec `user-auth` の全シナリオ（トークンの中身と権限を含まないこと、2 回ログイン、削除済みユーザーのログイン 401、登録で `isAdmin` を送っても `false`、password 8 文字 201・7 文字 422、ログアウト、同じリフレッシュトークンで 2 回、期限の 1 分前 200・1 分後 401 と削除）が通ることを確認
- [x] 7.6 `test/feature/guards.e2e-spec.ts` で spec `access-control` の全シナリオ（Basic 形式・別シークレット・期限切れ・削除済みユーザーで 401、昇格・降格が次のリクエストから効く、未認証は 403 でなく 401、一般ユーザーの不正ボディは 422 でなく 403）と、Authors の 401 / 403 ケースが通ることを確認
- [x] 7.7 `src/http/guards/README.md` と `src/modules/README.md`（D2 の構成）を更新する

## 8. 書籍（README ステップ 7、spec: book-management）

- [x] 8.1 `TypeOrmBookRepository`、Books の UseCase 5 つ（`AuthorNotFoundError` を含む）、Books の Request 2 つ、`BookResource`、`BooksController`、`BooksModule` を作る
- [x] 8.2 `test/feature/books.e2e-spec.ts` で spec `book-management` の全シナリオ（一覧の要素が 4 キーだけ、`price` 1 で 201・0 で 422、`authorId: "1"` と `price: 1.5` で 422、存在しない／削除済みの `authorId` で 422 と書籍が増えない・変わらない）が通ることを確認
- [x] 8.3 `test/feature/authors.e2e-spec.ts` に、著者を削除しても書籍の取得・一覧が変わらないケースを追加して通ることを確認

## 9. ユーザー（README ステップ 8、spec: user-management）

- [x] 9.1 Users の UseCase 4 つ（削除時に `deleteByUserId`）、`UpdateUserRequest`、`UsersController` を作り `UsersModule` に登録する
- [x] 9.2 `test/feature/users.e2e-spec.ts` で spec `user-management` の全シナリオ（`isAdmin` 省略で `false`、`isAdmin: "yes"` で 422、メール重複 409 と同じメールのままは 200、削除済みユーザーのメールへの更新・登録が 409、一般ユーザーの自己昇格 403、削除後のリフレッシュ・アクセストークンが 401、`POST /api/users` がトークンなしでも 404）が通ることを確認

## 10. プロフィール（README ステップ 9、spec: user-profile）

- [x] 10.1 `UpdateProfileNameService` / `UpdatePasswordService`、Profile の Request 2 つ、`ProfileController`、`ProfileModule` を作る
- [x] 10.2 `test/feature/profile.e2e-spec.ts` で spec `user-profile` の全シナリオ（`email`・`isAdmin` を送っても変わらない、`name` 100 文字 200・101 文字 422、`newPassword` 8 文字 204・7 文字 422、大文字小文字違いで 401、変更前のアクセストークンが使える、トークンなしのパスワード変更が 422 でなく 401）が通ることを確認
- [x] 10.3 `src/services/README.md` を置く

## 11. Request の Unit テスト（README ステップ 10）

- [x] 11.1 `test/unit/requests/{auth,authors,books,profile,users}.spec.ts` を README のテストケース一覧どおりに作り、`npm run test:unit` が通ることを確認

## 12. 結合確認

- [x] 12.1 `test/feature/errors.e2e-spec.ts` に、`overrideProvider()` で UseCase が例外を投げるようにしたとき 500 `{ "message": "Server Error" }` で例外のメッセージを含まないケースを追加し、`npm run lint`・`npm run build`・`npm test` がすべて通ることを確認
- [x] 12.2 README「各レイヤーの仕様」の内容がすべて各ディレクトリの README.md にあることを、README の見出しと突き合わせて確認する
- [x] 12.3 `npm run db:fresh` → `npm run start` で起動し、README「動作確認」の curl 3 本が想定どおり（200 / 201 / 422 の Laravel 形式）返ることを確認

## Workflow follow-up

- レビュー後に `openspec archive build-book-author-api` で change をアーカイブし、`openspec/specs/` に 8 つの capability が作られていることを確認する
