# Design

## Context

リポジトリには README.md（仕様書）と OpenSpec・Claude Code の設定しかない。README の「技術スタック」「ディレクトリ構成」「依存性の注入」「各レイヤーの仕様」「テスト」がそのまま設計の原典であり、本ドキュメントでは README から読み取れない点・README どおりだと動かない点の判断だけを記録する。要件は `specs/` を参照。

README から外れる点は D2（Module の依存の解決）と D12（ESM・Vitest・oxlint。当初の README は Jest・CommonJS 前提だった）で、README の `modules/` 節・技術スタック・テスト・セットアップの節は修正済み。また、spec `error-responses` のシナリオを受けるテストファイル `test/feature/errors.e2e-spec.ts` を README のディレクトリ構成とテストケース一覧に追加した。それ以外の Decision は README を具体化したもの。

## Goals / Non-Goals

**Goals:**
- README のディレクトリ構成・命名・レイヤー責務どおりに実装する
- Feature テストはモックなし・テストごとにインメモリ SQLite を作り直す
- `main.ts` とテストが同じ `configureApp()` を通る

**Non-Goals:**
- 範囲外の機能は proposal の「範囲外」を参照
- 実行速度の最適化（テストごとのアプリ起動のコストは許容する）

## Decisions

### D1. Repository は抽象クラスを DI トークンにする
README どおり `abstract class BookRepository` を `domain/` に置き、Module で `{ provide: BookRepository, useClass: TypeOrmBookRepository }` とバインドする。

- 理由: コンストラクタの型だけで解決でき、Laravel のタイプヒントに最も近い。抽象クラスに NestJS のデコレータを付けないので `domain/` は外部ライブラリに依存しない
- 代替案: `Symbol` トークン + `@Inject(BOOK_REPOSITORY)`。依存の宣言が型と別になり Laravel から遠くなるので採らない

### D2. Guard の依存は「JwtModule をグローバル」+「UsersModule を import」で解決する
`JwtAuthGuard` / `AdminGuard` は `JwtService` と `UserRepository` に依存し、`@UseGuards()` を使う Module の中で解決される。

- `AuthModule` で `JwtModule.registerAsync({ global: true, ... })` として登録する
- `UserRepository` は `UsersModule` が export し、Guard を使う各 Module（Auth / Profile / Authors / Books）は `UsersModule` を import する
- `RefreshTokenRepository` も `UsersModule` でバインドして export する。`DeleteUserUseCase`（`UsersModule`）がユーザー削除でトークンを消し、`AuthModule` は `UsersModule` を import して受け取る
- 理由: Laravel の `auth` がどこからでも使えるのと同じ感覚で書け、循環 import が起きない
- 代替案 3: `RefreshTokenRepository` を当初の README どおり `AuthModule` でバインドして export する。`UsersModule` が `AuthModule` を import することになり、`AuthModule` → `UsersModule` と循環するので採らない
- 代替案 1: 当初 README の「AuthModule が JwtModule と UsersModule を re-export し、各 Module は AuthModule を import」。`UsersModule`（`UsersController` で Guard を使う）と `AuthModule`（`UserRepository` を使う）が循環 import になるので採らない
- 代替案 2: `forwardRef()` で循環を許す。動くが、依存の向きが読み取りにくくなるので採らない

### D3. 例外は 1 つの `@Catch()` フィルタで Laravel 形式に変換する
`HandlerFilter` が次の順に判定する。

1. `DomainError` のサブクラス → README の変換表どおりのステータスとボディ
2. `ValidationException`（`validationExceptionFactory` が投げる独自の `HttpException`、ボディ `{ message, errors }`）→ 422 でボディをそのまま返す
3. その他の `HttpException` → ステータスを維持し、ボディを `{ message }` に正規化する。404（未定義ルートを含む）は `Not Found.`、Guard の 401 / 403 は Guard で指定した文言、`ParseIntPipe` の 400 と不正な JSON の 400 は例外のメッセージを使う
4. それ以外 → 500 `{ "message": "Server Error" }`、`Logger` に詳細を出す

- 理由: `app/Exceptions/Handler.php` と同じく変換を 1 か所に集め、Controller から try/catch をなくせる
- 代替案: ドメイン例外ごとに `@Catch(NotFoundError)` のフィルタを分ける。変換表が散らばり、Nest 既定の `{ statusCode, message, error }` 形式が漏れやすいので採らない

### D4. 422 の `message` は Laravel の書式で作る
class-validator の `ValidationError[]` を、プロパティごとに `Object.values(constraints)` を並べて `errors` にする。全メッセージ数を数え、2 件以上なら `"<最初> (and N more error)"`、N ≥ 2 なら `errors` と複数形にする。

- 理由: Laravel の `ValidationException::summarize` と同じ書式にし、Laravel のクライアントをそのまま使えるようにする
- 代替案: Nest 既定の `message: string[]`。Laravel 形式から外れるので採らない

### D5. メール重複は UseCase で判定し、DB 制約違反も同じ例外にする
`RegisterUseCase` / `UpdateUserUseCase` は `findByEmail` で事前チェックし `EmailAlreadyExistsError` を投げる。`findByEmail` は論理削除済みを含めないので、論理削除済みユーザーのメールは事前チェックをすり抜けて UNIQUE 制約違反になる。`TypeOrmUserRepository` の `create` / `update` で SQLite の `SQLITE_CONSTRAINT_UNIQUE` を捕まえて `EmailAlreadyExistsError` に変換する。

- 理由: ログインで論理削除済みユーザーを拾わないために `findByEmail` は削除済みを除く必要がある。一方、仕様では削除済みユーザーのメールも 409 にする。ドメイン例外は `domain/` の型なので infrastructure から投げても依存の向きは崩れない
- 代替案 1: `findByEmail` に削除済みを含める。ログインで削除済みユーザーを認証してしまうので採らない
- 代替案 2: `existsByEmailWithTrashed()` を Repository に足して UseCase で判定する。素直だが、同時リクエストでは結局 UNIQUE 制約に当たるので、制約違反の変換は必要になる。メソッドを増やさない方を選ぶ

### D6. マイグレーションはクラス配列で読み込み、テストでも流す
`migrations/index.ts` が `[CreateAuthorsTable..., ...]` をエクスポートし、`DatabaseModule`・`data-source.ts` の両方で使う。アプリは `synchronize: false`、`migrationsRun: true`。Entity も `database/entities.ts` の配列で同じように共有する。CLI（`db:*`）は `nest build` してから `dist/` の js を動かし、`data-source.ts` は先頭で `process.loadEnvFile('.env')` する。`db:fresh` は `typeorm schema:drop` → `migration:run` → シーダーの順に流す。

- 理由: テスト（ts）と本番・CLI（dist の js）でパスが変わっても壊れない。テストの `:memory:` DB にも毎回同じマイグレーションが流れ、マイグレーション自体の確認になる
- 代替案 1: glob（`dist/**/migrations/*.js`）で読み込む。実行環境でパスが変わって壊れやすいので採らない
- 代替案 2: テストだけ `synchronize: true`。マイグレーションと Entity のずれを検出できないので採らない
- 代替案 3: CLI を ts のまま `typeorm-ts-node-esm` や tsx で動かす。ESM ではデコレータのメタデータの扱いがローダーごとに違って不安定なので採らない
- 代替案 4: `db:fresh` で DB ファイルを `rm` する。`.env` の `DATABASE_URL` をシェルで解決できないので採らない（全テーブル削除は Laravel の `migrate:fresh` と同じ動き）
- `dotenv` は `@nestjs/config` の間接依存で、直接 import すると依存の宣言が抜けるので使わない

### D7. テストのアプリは AppModule をそのまま起動する
`createTestApp()` は `Test.createTestingModule({ imports: [AppModule] })` → `createNestApplication()` → `configureApp(app)` → `init()`。`DATABASE_URL=':memory:'` なので、アプリごとに新しい DB になる。

- 時間に関わるテストのデータは、アプリのコンテナから取り出したものを使って直接作る。期限切れ・期限直前のリフレッシュトークンは `app.get(RefreshTokenRepository).create(userId, token, 日時)`、期限切れのアクセストークンは `app.get(JwtService).signAsync({ sub }, { expiresIn: -1 })`
- 想定外の例外（500）のテストは `overrideProvider()` で UseCase を例外を投げる実装に差し替える
- 理由: `RefreshDatabase` と同じく、テスト同士が DB を共有しない。本番と同じ Module 構成・同じ `configureApp()` を通る
- 代替案: `vi.useFakeTimers()` で時刻を進める。bcrypt や DB ドライバのタイマーにも影響して不安定になるので採らない

### D8. シーダーは TypeORM の DataSource を直接使う
`seeders/run.ts` が `data-source.ts` の DataSource を初期化し、`DatabaseSeeder.run(dataSource)` を呼ぶ。`firstOrCreate` 相当として `findOneBy({ email })` / `findOneBy({ name })` / `findOneBy({ title })` で存在確認してから作る。パスワードは `shared/password.ts` でハッシュ化する。

- 理由: シーダーは CLI から動くので、Nest のアプリを起動せずに済む方が速く単純
- 代替案: `NestFactory.createApplicationContext(AppModule)` で起動して Repository を使う。`JWT_SECRET` など無関係な設定まで要求されるので採らない

### D9. プロジェクトの雛形は一時ディレクトリで `nest new` してから取り込む
作業ディレクトリには既に README.md・`openspec/`・`.claude/`・`.github/` があるため、一時ディレクトリで `nest new --strict --skip-git` を実行し、README.md 以外をコピーする。`app.controller.ts` などの不要ファイルと `vitest.config.e2e.ts` は README どおり削除する。

- 理由: `nest new` は空でないディレクトリに作ると既存ファイルとぶつかる
- 代替案: package.json などを手で書く。`nest new` の既定（tsconfig・oxlint・Prettier・Vitest の設定）と揃わなくなるので採らない

### D10. 日時カラムは SQLite の `datetime`、期限判定はアプリ側
TypeORM の `@CreateDateColumn` / `@UpdateDateColumn` / `@DeleteDateColumn` とマイグレーションの `datetime` 型で揃える。`refresh_tokens.expires_at` も `datetime` とし、期限判定は `expiresAt <= new Date()` を UseCase で行う。

- 理由: SQLite には日付型がなく、SQL の日時比較は文字列の書式に依存する。アプリ側の `Date` 比較なら書式に左右されない
- 代替案: `WHERE expires_at > CURRENT_TIMESTAMP` で SQL 側で絞る。TypeORM が保存する書式と `CURRENT_TIMESTAMP` の書式がずれる恐れがあるので採らない

### D11. 認証・認可は入力検証より先に判定する
Guard（`JwtAuthGuard` → `AdminGuard`）を `@UseGuards()` の順に並べ、ボディの検証（ValidationPipe）はその後に動かす。NestJS は Guard を Pipe より先に実行するので、追加の仕組みは要らない。

- 理由: 未認証に 422 を返すと、認証なしでも入力ルールを探れてしまう。Laravel でも `auth` ミドルウェアは FormRequest の検証より先に動く
- 代替案: 入力検証を Middleware で先に行う。Laravel の順番と逆になるので採らない

### D12. NestJS 12 の雛形の既定（ESM・Vitest・oxlint）をそのまま使う
NestJS 12 の `nest new` は ESM（`"type": "module"`）・Vitest・oxlint・TypeScript 6 の雛形を作る。これを Jest・CommonJS に戻さず使う。テストは `vitest.config.ts` 1 本で `test/**/*.{spec,e2e-spec}.ts` を対象にし、`setupFiles` で `test/setup-env.ts` を読む。相対 import は `.js` まで書く。

- 理由: README が Jest を選んだ理由は「NestJS 標準」だったので、標準が変わったなら標準に合わせる。Vitest の API は Jest とほぼ同じで、デコレータのメタデータも出力するため、型による DI はテストでもそのまま解決される（雛形のテストで確認済み）。Laravel の構成への寄せ方には影響しない
- 代替案 1: NestJS 11 に固定する。README のまま進められるが、1 つ前のメジャー版で始めることになるので採らない
- 代替案 2: NestJS 12 の上で Jest・CommonJS に書き換える。D9 の「`nest new` の既定と揃える」が崩れるので採らない

## Risks / Trade-offs

- [better-sqlite3・bcrypt のネイティブビルドが WSL で失敗する] → `build-essential` / `python3` を前提に記載。Node 24 対応のバージョンを入れる
- [npm 11 が install スクリプトを止め、ネイティブモジュールがビルドされない] → `npm approve-scripts better-sqlite3 bcrypt` で 2 つだけ許可し、`package.json` の `allowScripts` に残す
- [CLI（`db:*`）が毎回 `nest build` を挟むので数秒かかる] → 開発中に何度も流す操作ではないので許容する
- [グローバルな JwtModule は依存が見えにくい] → `AuthModule` に登録理由をコメントし、`src/modules/README.md` に記載する
- [infrastructure がドメイン例外を投げる（D5）] → 制約違反の変換に限定し、ビジネス判定は UseCase に置く
- [テストごとにアプリを起動するので遅い] → `BCRYPT_ROUNDS=4` とインメモリ DB で抑える。本番と同じ構成でテストするために速度を払う、意図したトレードオフ
- [不正な JSON の 400 のメッセージがパーサの英文になる] → `{ message }` の形だけを約束し、文言は約束しない（spec もそう書いてある）

## Migration Plan

新規プロジェクトのため移行はない。ローカルでは `cp .env.example .env` → `npm run db:migrate` → `npm run db:seed` → `npm run start:dev`。
