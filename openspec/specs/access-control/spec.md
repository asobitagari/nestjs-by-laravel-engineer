# access-control Specification

## Purpose

保護されたエンドポイントで、Bearer アクセストークンによる認証と、DB 上の管理者フラグによる認可を行う。トークンの発行は `user-auth`、どのエンドポイントが保護されるかは各 capability が扱う。

## Requirements

### Requirement: Bearer トークン認証
システムは、認証が必要なエンドポイントで `Authorization: Bearer <token>` のアクセストークンを検証し、署名と有効期限が正しく、`sub` のユーザーが存在するときだけ処理を続けなければならない（SHALL）。

#### Scenario: 有効なトークン
- **WHEN** ログインで得たアクセストークンで `GET /api/profile` する
- **THEN** ステータス 200 が返る

#### Scenario: 再発行したトークン
- **WHEN** `POST /api/auth/refresh-token` で得たアクセストークンで `GET /api/profile` する
- **THEN** ステータス 200 が返る

### Requirement: 認証失敗は 401
システムは、ヘッダーなし・`Bearer` 形式でない・署名不正・有効期限切れ・`sub` のユーザーが存在しない（論理削除済みを含む）とき、401 と `{ "message": "Unauthenticated." }` を返さなければならない（SHALL）。

#### Scenario: ヘッダーなし
- **WHEN** Authorization ヘッダーなしで `GET /api/profile` する
- **THEN** ステータス 401、ボディ `{ "message": "Unauthenticated." }` が返る

#### Scenario: Bearer 形式でない
- **WHEN** `Authorization: Basic abc` で `GET /api/profile` する
- **THEN** ステータス 401 が返る

#### Scenario: 署名不正
- **WHEN** 別のシークレットで署名したトークンで `GET /api/profile` する
- **THEN** ステータス 401 が返る

#### Scenario: 有効期限切れ
- **WHEN** 有効期限を過ぎたトークンで `GET /api/profile` する
- **THEN** ステータス 401 が返る

#### Scenario: 削除済みユーザー
- **WHEN** トークンは有効だが `sub` のユーザーが論理削除されている状態で `GET /api/profile` する
- **THEN** ステータス 401 が返る

### Requirement: 管理者認可
システムは、管理者専用のエンドポイントで、認証済みユーザーの現在の DB 上の管理者フラグをリクエストごとに確認し、管理者でなければ 403 と `{ "message": "This action is unauthorized." }` を返さなければならない（SHALL）。

#### Scenario: 管理者
- **WHEN** 管理者のトークンで `POST /api/authors` に `{ "name": "太宰治" }` を送る
- **THEN** ステータス 201 が返る

#### Scenario: 一般ユーザー
- **WHEN** 一般ユーザーのトークンで `POST /api/authors` する
- **THEN** ステータス 403、ボディ `{ "message": "This action is unauthorized." }` が返る

### Requirement: 権限の変更は次のリクエストから効く
システムは、管理者フラグの変更を、トークンの再発行を待たずに次のリクエストから反映しなければならない（SHALL）。

#### Scenario: 昇格した直後
- **GIVEN** 一般ユーザーがアクセストークンを持っている
- **WHEN** 管理者がそのユーザーを `isAdmin: true` に更新した後、同じアクセストークンで `POST /api/authors` する
- **THEN** ステータス 201 が返る

#### Scenario: 降格した直後
- **GIVEN** 管理者 B がアクセストークンを持っている
- **WHEN** 管理者 A が B を `isAdmin: false` に更新した後、B の同じトークンで `POST /api/authors` する
- **THEN** ステータス 403 が返る

### Requirement: 認証は認可より先
システムは、管理者専用のエンドポイントで認証より先に認可を判定してはならない（MUST NOT）。未認証なら、管理者かどうかに関わらず 401 を返す。また、認証・認可に失敗したリクエストのボディを検証してはならない（MUST NOT）。

#### Scenario: 未認証で管理者専用エンドポイント
- **WHEN** トークンなしで `POST /api/authors` する
- **THEN** ステータス 401 が返る（403 ではない）

#### Scenario: 一般ユーザーが不正なボディを送る
- **WHEN** 一般ユーザーのトークンで `POST /api/authors` に `{}` を送る
- **THEN** ステータス 403 が返る（422 ではない）
