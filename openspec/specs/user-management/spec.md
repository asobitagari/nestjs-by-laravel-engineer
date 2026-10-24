# user-management Specification

## Purpose

ユーザーを誰でも閲覧でき、管理者だけが他ユーザーの情報・権限を更新したり論理削除したりできるようにする。ユーザーの作成（登録）とトークンは `user-auth`、本人による変更は `user-profile` が扱う。

## Requirements

### Requirement: ユーザーの表現
システムは、ユーザーを `{ id, name, email, isAdmin }` の JSON で返し、パスワード（ハッシュを含む）をどのレスポンスにも含めてはならない（MUST NOT）。

#### Scenario: 一覧にパスワードがない
- **WHEN** ユーザー 2 件の状態で `GET /api/users` する
- **THEN** ステータス 200 で、どの要素のキーも `id`・`name`・`email`・`isAdmin` の 4 つだけである

#### Scenario: 更新のレスポンスにパスワードがない
- **WHEN** 管理者がユーザーを更新する
- **THEN** レスポンスに `password` キーがない

### Requirement: ユーザーの一覧
システムは `GET /api/users` で、論理削除されていないユーザーを配列で 200 で返さなければならない（SHALL）。認証は不要。

#### Scenario: トークンなしで一覧
- **WHEN** トークンなしで `GET /api/users` する
- **THEN** ステータス 200 で配列が返る

#### Scenario: 論理削除済みは含まない
- **WHEN** ユーザー 2 件のうち 1 件を削除してから `GET /api/users` する
- **THEN** 1 件の配列が返る

### Requirement: ユーザーの取得
システムは `GET /api/users/:id` でユーザーを 200 で返し、存在しない・論理削除済みなら 404、ID が数値でなければ 400 を返さなければならない（SHALL）。認証は不要。

#### Scenario: 存在する ID
- **WHEN** 存在する ID で GET する
- **THEN** ステータス 200 でそのユーザーが返る

#### Scenario: 存在しない ID
- **WHEN** `GET /api/users/9999` する
- **THEN** ステータス 404 が返る

#### Scenario: 数値でない ID
- **WHEN** `GET /api/users/abc` する
- **THEN** ステータス 400 が返る

### Requirement: ユーザーの更新
システムは `PUT /api/users/:id` で `{ name, email, isAdmin? }` を受け取り、更新して 200 と更新後のユーザーを返さなければならない（SHALL）。`isAdmin` を省略したら `false` として扱う。対象が存在しない・論理削除済みなら 404 を返す。

#### Scenario: 管理者に昇格
- **WHEN** 管理者が一般ユーザーを `{ "name": "一般君", "email": "normal@example.com", "isAdmin": true }` で更新する
- **THEN** ステータス 200 で `isAdmin` が `true` になっている

#### Scenario: isAdmin 省略
- **WHEN** 管理者が `isAdmin: true` のユーザーを `isAdmin` なしで更新する
- **THEN** `isAdmin` は `false` になる

#### Scenario: 存在しないユーザーの更新
- **WHEN** 管理者が `PUT /api/users/9999` する
- **THEN** ステータス 404 が返る

### Requirement: ユーザーの削除
システムは `DELETE /api/users/:id` でユーザーを論理削除し、204（ボディなし）を返さなければならない（SHALL）。対象が存在しない・論理削除済みなら 404 を返す。

#### Scenario: 削除後は見えない
- **WHEN** 管理者がユーザーを削除し、その後同じ ID を GET する
- **THEN** 削除は 204、その後の GET は 404 が返る

#### Scenario: 存在しないユーザーの削除
- **WHEN** 管理者が `DELETE /api/users/9999` する
- **THEN** ステータス 404 が返る

### Requirement: ユーザー更新の入力検証
システムは、更新で `name` が未指定・空文字・100 文字超、`email` が未指定・メール形式でない、`isAdmin` が真偽値でないとき 422 を返さなければならない（SHALL）。

#### Scenario: name 101 文字
- **WHEN** 管理者が 101 文字の `name` で更新する
- **THEN** ステータス 422 で `errors.name` がある

#### Scenario: email なし
- **WHEN** 管理者が `{ "name": "一般君" }` で更新する
- **THEN** ステータス 422 で `errors.email` がある

#### Scenario: isAdmin が文字列
- **WHEN** 管理者が `isAdmin: "yes"` で更新する
- **THEN** ステータス 422 で `errors.isAdmin` がある

### Requirement: 更新時のメール重複
システムは、更新後の `email` が他のユーザー（論理削除済みを含む）と重複するとき 409 と `{ "message": "The email has already been taken." }` を返さなければならない（SHALL）。自分自身の現在のメールのままなら重複としない。

#### Scenario: 他ユーザーのメール
- **WHEN** 管理者が一般ユーザーの `email` を `admin@example.com` に変更する
- **THEN** ステータス 409 が返り、一般ユーザーの `email` は変わっていない

#### Scenario: 同じメールのまま
- **WHEN** 管理者がユーザーの `email` を変えずに名前だけ更新する
- **THEN** ステータス 200 が返る

### Requirement: ユーザー作成エンドポイントはない
システムは `POST /api/users` を提供してはならない（MUST NOT）。ユーザーの作成は `POST /api/auth/register`（`user-auth`）で行う。

#### Scenario: POST /api/users
- **WHEN** 管理者が `POST /api/users` する
- **THEN** ステータス 404 が返る

#### Scenario: トークンなしで POST /api/users
- **WHEN** トークンなしで `POST /api/users` する
- **THEN** ステータス 404 が返る（401 ではない）

### Requirement: ユーザーの変更は管理者だけ
システムは、更新・削除で、未認証なら 401、管理者でなければ 403 を返し、ユーザーを変更してはならない（MUST NOT）。

#### Scenario: 一般ユーザーが削除
- **WHEN** 一般ユーザーが管理者を削除しようとする
- **THEN** ステータス 403 が返り、管理者はまだ GET できる

#### Scenario: 一般ユーザーが自分を昇格
- **WHEN** 一般ユーザーが自分を `isAdmin: true` で更新しようとする
- **THEN** ステータス 403 が返り、`isAdmin` は `false` のままである

#### Scenario: トークンなしで更新
- **WHEN** トークンなしで `PUT /api/users/1` する
- **THEN** ステータス 401 が返る

### Requirement: ユーザー削除はトークンに波及する
システムは、ユーザーを論理削除したとき、そのユーザーのリフレッシュトークンをすべて削除しなければならない（SHALL）。発行済みのアクセストークンでも、以後は認証を通してはならない（MUST NOT）。

#### Scenario: 削除後のリフレッシュ
- **GIVEN** 一般ユーザーがログインしてリフレッシュトークンを持っている
- **WHEN** 管理者がそのユーザーを削除した後、そのリフレッシュトークンで `POST /api/auth/refresh-token` する
- **THEN** ステータス 401 が返る

#### Scenario: 削除後のアクセストークン
- **WHEN** 削除されたユーザーのアクセストークンで `GET /api/profile` する
- **THEN** ステータス 401 が返る

### Requirement: 論理削除済みユーザーのメールは再利用できない
システムは、論理削除済みユーザーのメールアドレスを、登録・更新で再利用させてはならない（MUST NOT）。

#### Scenario: 削除済みユーザーのメールで登録
- **WHEN** `deleted@example.com` のユーザーを削除した後、同じメールで `POST /api/auth/register` する
- **THEN** ステータス 409 が返る

#### Scenario: 削除済みユーザーのメールに更新
- **WHEN** `deleted@example.com` のユーザーを削除した後、管理者が別のユーザーの `email` を `deleted@example.com` に更新する
- **THEN** ステータス 409 が返る
