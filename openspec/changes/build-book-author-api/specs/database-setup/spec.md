# Spec Delta

## Purpose

開発者がコマンド 1 つでデータベースのスキーマ作成・巻き戻し・初期データ投入・作り直しをできるようにし、アプリの起動に必要な設定を検証する。Laravel の `artisan migrate` / `db:seed` と同じ操作感を提供する。API の振る舞いは各 capability が扱う。

## ADDED Requirements

### Requirement: マイグレーション
システムは `npm run db:migrate` で `authors`・`books`・`users`・`refresh_tokens` の 4 テーブルを作成しなければならない（SHALL）。適用済みのマイグレーションを再実行してはならない（MUST NOT）。

#### Scenario: 空の DB にマイグレーション
- **WHEN** DB ファイルがない状態で `npm run db:migrate` を実行する
- **THEN** 終了コード 0 で、4 テーブルが作成される

#### Scenario: 2 回実行
- **WHEN** `npm run db:migrate` を続けて 2 回実行する
- **THEN** 2 回目も終了コード 0 で、テーブルとデータは変わらない

### Requirement: 日時と論理削除のカラム
システムは、`authors`・`books`・`users` に作成日時・更新日時・論理削除日時のカラムを、`refresh_tokens` に作成日時と有効期限のカラムを持たせなければならない（SHALL）。

#### Scenario: authors のカラム
- **WHEN** マイグレーション後に `authors` のカラムを調べる
- **THEN** `id`・`name`・`email`・`created_at`・`updated_at`・`deleted_at` がある

#### Scenario: refresh_tokens のカラム
- **WHEN** マイグレーション後に `refresh_tokens` のカラムを調べる
- **THEN** `id`・`user_id`・`token`・`expires_at`・`created_at` があり、`deleted_at` はない

### Requirement: データ整合性の制約
システムは、`users.email` と `refresh_tokens.token` を一意にし、`books.author_id` を `authors.id` への外部キー、`refresh_tokens.user_id` を `users.id` への外部キー（削除時カスケード）にしなければならない（SHALL）。

#### Scenario: メールの一意制約
- **WHEN** 同じ email のユーザーを 2 件挿入する
- **THEN** 2 件目は一意制約違反になる

#### Scenario: 存在しない著者の書籍
- **WHEN** `author_id` が存在しない書籍を挿入する
- **THEN** 外部キー制約違反になる

### Requirement: ロールバック
システムは `npm run db:rollback` で直近のマイグレーションを 1 つ取り消さなければならない（SHALL）。

#### Scenario: 1 回ロールバック
- **WHEN** 全マイグレーション適用後に `npm run db:rollback` を 1 回実行する
- **THEN** `refresh_tokens` テーブルが削除され、ほかの 3 テーブルは残る

#### Scenario: ロールバック後に再適用
- **WHEN** ロールバックの後に `npm run db:migrate` を実行する
- **THEN** `refresh_tokens` テーブルが再び作成される

### Requirement: 冪等なシーダー
システムは `npm run db:seed` で、管理者ユーザー（admin@example.com / password）、一般ユーザー（normal@example.com / password）、著者 3 件、書籍 5 件を投入しなければならない（SHALL）。何度実行しても重複してはならない（MUST NOT）。

#### Scenario: 1 回実行
- **WHEN** マイグレーション直後に `npm run db:seed` を実行する
- **THEN** users 2 件・authors 3 件・books 5 件になる

#### Scenario: 2 回実行
- **WHEN** `npm run db:seed` を続けて 2 回実行する
- **THEN** users 2 件・authors 3 件・books 5 件のままである

#### Scenario: シードユーザーでログイン
- **WHEN** シード後に `admin@example.com` / `password` でログインし、`GET /api/profile` する
- **THEN** `isAdmin` が `true` で返る

### Requirement: 作り直し
システムは `npm run db:fresh` で DB ファイルを削除し、マイグレーションとシーダーを続けて実行しなければならない（SHALL）。

#### Scenario: データを足した後の fresh
- **WHEN** 著者を 1 件追加した後に `npm run db:fresh` を実行する
- **THEN** authors は 3 件に戻る

#### Scenario: DB ファイルがない状態の fresh
- **WHEN** DB ファイルがない状態で `npm run db:fresh` を実行する
- **THEN** 終了コード 0 で、シード直後と同じ状態になる

### Requirement: 必須設定の検証
システムは、`JWT_SECRET` が未設定・空文字のとき起動を中止しなければならない（SHALL）。`DATABASE_URL`・`PORT`・`BCRYPT_ROUNDS` は未設定なら既定値（`sqlite.db`・`3000`・`12`）を使う。

#### Scenario: JWT_SECRET なし
- **WHEN** `JWT_SECRET` を設定せずにアプリを起動する
- **THEN** エラーメッセージに `JWT_SECRET` を含めて起動が止まる

#### Scenario: 任意の設定なし
- **WHEN** `JWT_SECRET` だけを設定してアプリを起動する
- **THEN** ポート 3000 で起動し、`sqlite.db` を使う
