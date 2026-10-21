# Spec Delta

## Purpose

ユーザーの登録・ログイン・ログアウト・アクセストークン再発行を提供する。アクセストークンの有効期限は 15 分、リフレッシュトークンは 30 日とし、リフレッシュトークンはローテーションしない（ローテーションは範囲外）。発行したトークンの検証と管理者の判定は `access-control` が扱う。

## ADDED Requirements

### Requirement: アクセストークンの形式
システムは、アクセストークンを HS256 署名の JWT とし、ペイロードに `sub`（ユーザー ID の数値）を含め、有効期限を発行から 15 分にしなければならない（SHALL）。トークンに権限情報を含めてはならない（MUST NOT）。

#### Scenario: トークンの中身
- **WHEN** ログインで得た `accessToken` をデコードする
- **THEN** ヘッダーの `alg` が `HS256`、`sub` がユーザー ID、`exp - iat` が 900 である

#### Scenario: 権限を含まない
- **WHEN** 管理者のログインで得た `accessToken` をデコードする
- **THEN** ペイロードのキーは `sub`・`iat`・`exp` だけで、`isAdmin` などはない

### Requirement: ログイン
システムは `POST /api/auth/login` で `{ email, password }` を受け取り、認証に成功したら 200 と `{ accessToken, refreshToken }` を返さなければならない（SHALL）。ログインのたびに新しいリフレッシュトークン（有効期限 30 日）を発行する。

#### Scenario: ログイン成功
- **WHEN** `{ "email": "admin@example.com", "password": "password" }` でログインする
- **THEN** ステータス 200 で、ボディのキーは `accessToken` と `refreshToken` の 2 つで、どちらも空でない文字列である

#### Scenario: 2 回ログイン
- **WHEN** 同じユーザーで 2 回ログインする
- **THEN** 2 つの `refreshToken` は異なり、どちらでも再発行できる

### Requirement: ログイン失敗
システムは、メールが存在しない・論理削除済みのユーザーである・パスワードが違う場合に、どれも 401 と `{ "message": "These credentials do not match our records." }` を返さなければならない（SHALL）。どれに当たるかを区別できる応答をしてはならない（MUST NOT）。

#### Scenario: パスワード違い
- **WHEN** `admin@example.com` と `wrong-password` でログインする
- **THEN** ステータス 401 と上記メッセージが返る

#### Scenario: 存在しないメール
- **WHEN** `nobody@example.com` でログインする
- **THEN** ステータス 401 と上記メッセージが返る

#### Scenario: 論理削除済みユーザー
- **WHEN** 削除されたユーザーのメールと正しいパスワードでログインする
- **THEN** ステータス 401 と上記メッセージが返る

### Requirement: ユーザー登録
システムは `POST /api/auth/register` で `{ name, email, password }` を受け取り、一般ユーザーを作成して 201 と `{ id, name, email, isAdmin }` を返さなければならない（SHALL）。パスワードはハッシュ化して保存し、レスポンスに含めてはならない（MUST NOT）。

#### Scenario: 登録成功
- **WHEN** `{ "name": "テスト", "email": "test@example.com", "password": "password" }` で登録する
- **THEN** ステータス 201、ボディ `{ "id": <id>, "name": "テスト", "email": "test@example.com", "isAdmin": false }` が返り、`password` キーはない

#### Scenario: 登録したユーザーでログイン
- **WHEN** 登録後に同じメールとパスワードでログインする
- **THEN** ステータス 200 が返る

#### Scenario: isAdmin を送っても一般ユーザー
- **WHEN** `{ "name": "テスト", "email": "test@example.com", "password": "password", "isAdmin": true }` で登録する
- **THEN** `isAdmin` は `false` で返る

### Requirement: 登録時のメール重複
システムは、既に使われているメール（論理削除済みユーザーを含む。`user-management` 参照）で登録しようとしたとき、409 と `{ "message": "The email has already been taken." }` を返し、ユーザーを作成してはならない（MUST NOT）。

#### Scenario: 既存メール
- **WHEN** `admin@example.com` で登録する
- **THEN** ステータス 409 と上記メッセージが返り、`GET /api/users` の件数は変わらない

#### Scenario: 同じリクエストを 2 回
- **WHEN** 同じボディで 2 回登録する
- **THEN** 1 回目は 201、2 回目は 409 が返る

### Requirement: ログイン・登録の入力検証
システムは、ログインで `email` がメール形式でない・`password` が空、登録で `name` が空・100 文字超、`email` がメール形式でない、`password` が 8 文字未満のとき 422 を返さなければならない（SHALL）。

#### Scenario: ログインで password なし
- **WHEN** `{ "email": "admin@example.com" }` でログインする
- **THEN** ステータス 422 で `errors.password` がある

#### Scenario: 登録で password 8 文字
- **WHEN** 8 文字の `password` で登録する
- **THEN** ステータス 201 が返る

#### Scenario: 登録で password 7 文字
- **WHEN** 7 文字の `password` で登録する
- **THEN** ステータス 422 で `errors.password` がある

#### Scenario: 登録で name 101 文字
- **WHEN** 101 文字の `name` で登録する
- **THEN** ステータス 422 で `errors.name` がある

### Requirement: ログアウト
システムは `POST /api/auth/logout` で `{ token }`（リフレッシュトークン）を受け取り、そのトークンを削除して 204（ボディなし）を返さなければならない（SHALL）。トークンが存在しなくてもエラーにしない。`token` が未指定・空なら 422 を返す。

#### Scenario: ログアウト後はリフレッシュできない
- **WHEN** ログアウトしたリフレッシュトークンで `POST /api/auth/refresh-token` する
- **THEN** ステータス 401 が返る

#### Scenario: 存在しないトークン
- **WHEN** `{ "token": "unknown" }` でログアウトする
- **THEN** ステータス 204 が返る

#### Scenario: token なし
- **WHEN** `{}` でログアウトする
- **THEN** ステータス 422 で `errors.token` がある

### Requirement: アクセストークンの再発行
システムは `POST /api/auth/refresh-token` で `{ refreshToken }` を受け取り、有効期限内なら 200 と新しい `{ accessToken }` だけを返さなければならない（SHALL）。リフレッシュトークンはローテーションせず、同じものを有効期限まで繰り返し使える。

#### Scenario: リフレッシュ成功
- **WHEN** 有効なリフレッシュトークンを送る
- **THEN** ステータス 200 で、ボディのキーは `accessToken` だけである

#### Scenario: 同じトークンで 2 回
- **WHEN** 同じリフレッシュトークンで 2 回再発行する
- **THEN** どちらも 200 が返る

### Requirement: 無効なリフレッシュトークン
システムは、リフレッシュトークンが存在しない・有効期限を過ぎているとき、401 と `{ "message": "Invalid or expired refresh token." }` を返さなければならない（SHALL）。期限切れのトークンは削除する。`refreshToken` が未指定・空なら 422 を返す。

#### Scenario: 存在しないトークン
- **WHEN** `{ "refreshToken": "unknown" }` を送る
- **THEN** ステータス 401 と上記メッセージが返る

#### Scenario: 期限の 1 分前
- **WHEN** 有効期限が 1 分後のリフレッシュトークンを送る
- **THEN** ステータス 200 が返る

#### Scenario: 期限の 1 分後
- **WHEN** 有効期限が 1 分前のリフレッシュトークンを送る
- **THEN** ステータス 401 と上記メッセージが返り、同じトークンをもう一度送っても 401 のままである
