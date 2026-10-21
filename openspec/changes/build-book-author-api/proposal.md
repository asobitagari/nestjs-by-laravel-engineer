# Proposal

## Why

Laravel の設計（Controller・FormRequest・Action・Domain Service・Repository・Middleware・マイグレーション）は、Laravel の外でも依存の向きを保ったまま再現できるか。各レイヤーに README を置き、それを人と AI の開発の起点にする進め方は、フレームワークが変わっても回るか。本プロジェクトはこの二つを、DI コンテナ・Guard・ValidationPipe・ExceptionFilter を最初から持つ NestJS で確かめる。DI コンテナがあるので、問いは「再現できるか」から「Laravel の構成にどこまで寄せられるか」に進み、ServiceProvider（Module）・例外ハンドラ（ExceptionFilter）・API Resource まで対応させる。

題材は JWT 認証つきの「書籍・著者管理 API」とし、仕様の原典は README.md とする。現在のリポジトリには README.md しかないため、README に沿って API・テスト・ドキュメントを一式実装する。

## What Changes

- NestJS プロジェクトを新規作成する（依存追加、`nest new` の不要ファイル削除、Jest を `test/` 配下 1 本に統一）
- SQLite のマイグレーション 4 本（authors / books / users / refresh_tokens）と、冪等なシーダーを追加する
- `/api` 配下に認証・プロフィール・著者・書籍・ユーザーの REST エンドポイントを追加する
- JWT アクセストークン（15 分）+ リフレッシュトークン（30 日・ローテーションなし）による認証と、DB の `is_admin` をリクエストごとに見る管理者認可を追加する
- すべてのエラーを Laravel 形式の JSON（`{ message }`、422 は `{ message, errors }`）で返す
- Feature テスト（インメモリ SQLite、モックなし）と Unit テスト（Request・validation factory）を追加する
- 各レイヤーのディレクトリに、README の「各レイヤーの仕様」を分割した README.md を置く

範囲外（今回は作らない・変えない）:

- アクセストークンの失効（ログアウト・パスワード変更後も有効期限までは使える）
- リフレッシュトークンのローテーション
- 論理削除済みユーザーのメールでの再登録
- 一覧のページネーション・検索・並び替え
- Swagger / OpenAPI の生成、PostgreSQL など SQLite 以外の DB

## Capabilities

### New Capabilities

- `error-responses`: 全エンドポイント共通のエラー JSON の形と、未定義ルート・ID の形式・バリデーションの書式・想定外のエラーの扱い
- `user-auth`: 登録・ログイン・ログアウト・アクセストークン再発行と、トークンの形式
- `access-control`: Bearer アクセストークンによる認証と、DB 上の管理者フラグによる認可
- `user-profile`: 認証ユーザー自身のプロフィール取得・名前変更・パスワード変更
- `author-management`: 著者の一覧・取得（公開）と作成・更新・論理削除（管理者）
- `book-management`: 書籍の一覧・取得（公開）と作成・更新・論理削除（管理者）、著者の存在確認
- `user-management`: ユーザーの一覧・取得（公開）と更新・論理削除（管理者）
- `database-setup`: マイグレーション・ロールバック・冪等なシーダー・作り直しの CLI 操作と、起動時の必須設定の検証

### Modified Capabilities

（なし。既存の spec がない新規プロジェクトのため）

## Impact

- 新規ディレクトリ：`src/`（`http/`・`useCases/`・`services/`・`domain/`・`infrastructure/`・`shared/`・`modules/`・`config/`・`database/`）、`test/`（`feature/`・`unit/`）
- 新規ファイル：`package.json`、`tsconfig*.json`、`nest-cli.json`、`.env.example`
- 依存パッケージ：`@nestjs/*`、`@nestjs/config`、`@nestjs/jwt`、`@nestjs/typeorm`、`typeorm`、`better-sqlite3`、`class-validator`、`class-transformer`、`bcrypt`、開発用に `ts-node`、`supertest`、型定義。better-sqlite3・bcrypt はネイティブビルドのため WSL に `build-essential` / `python3` が必要
- DB スキーマ：新規に 4 テーブル（マイグレーション 4 本）。既存データはない
- API の互換性：既存の API・クライアントはないので、互換性を壊す変更はない。レスポンスの形（キーは camelCase、`data` で包まない、削除・ログアウト・パスワード変更は 204、エラーは `{ message }`、422 は `{ message, errors }`）は、このプロジェクトの決定として spec に定める
- README：Module の依存の解決方法（design D2）を `modules/` 節に、`test/feature/errors.e2e-spec.ts` をディレクトリ構成とテストケース一覧に反映済み。他の実装との比較を根拠にしていた記述は、このプロジェクトの決定と理由に書き換え済み
