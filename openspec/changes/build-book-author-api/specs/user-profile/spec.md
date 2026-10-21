# Spec Delta

## Purpose

認証済みユーザーが自分自身のプロフィールを取得し、名前とパスワードを変更できるようにする。メールアドレスと権限は本人からは変更できない（管理者による変更は `user-management`、トークンの検証は `access-control` が扱う）。

## ADDED Requirements

### Requirement: プロフィール取得
システムは `GET /api/profile` で、アクセストークンのユーザー自身を 200 と `{ id, name, email, isAdmin }` で返さなければならない（SHALL）。パスワードを含めてはならない（MUST NOT）。

#### Scenario: 一般ユーザーの取得
- **GIVEN** `normal@example.com` でログインしている
- **WHEN** `GET /api/profile` する
- **THEN** ステータス 200 で `{ "id": <id>, "name": "一般君", "email": "normal@example.com", "isAdmin": false }` が返り、`password` キーはない

#### Scenario: 管理者の取得
- **GIVEN** `admin@example.com` でログインしている
- **WHEN** `GET /api/profile` する
- **THEN** `isAdmin` が `true` で返る

### Requirement: 名前の変更
システムは `PUT /api/profile` で `{ name }` を受け取り、名前だけを変更して 200 と更新後のユーザーを返さなければならない（SHALL）。

#### Scenario: 名前更新
- **WHEN** `{ "name": "新しい名前" }` を送る
- **THEN** ステータス 200 で `name` が `新しい名前` になり、続く `GET /api/profile` でも同じ値が返る

#### Scenario: 他のユーザーは変わらない
- **WHEN** 一般ユーザーが名前を変更した後、管理者を `GET /api/users/<管理者の id>` する
- **THEN** 管理者の `name` は `管理者君` のままである

### Requirement: メールと権限は本人から変更できない
システムは、`PUT /api/profile` で `email` や `isAdmin` を送られても、それらを変更してはならない（MUST NOT）。エラーにもせず、名前の変更だけを行う。

#### Scenario: email を送る
- **WHEN** 一般ユーザーが `{ "name": "新しい名前", "email": "other@example.com" }` を送る
- **THEN** ステータス 200 で `email` は `normal@example.com` のままである

#### Scenario: isAdmin を送る
- **WHEN** 一般ユーザーが `{ "name": "新しい名前", "isAdmin": true }` を送る
- **THEN** ステータス 200 で `isAdmin` は `false` のままで、管理者専用の `POST /api/authors` は 403 のままである

### Requirement: 名前の入力検証
システムは、`name` が未指定・空文字・100 文字超のとき 422 を返し、名前を変更してはならない（MUST NOT）。

#### Scenario: name 100 文字
- **WHEN** 100 文字の `name` を送る
- **THEN** ステータス 200 が返る

#### Scenario: name 101 文字
- **WHEN** 101 文字の `name` を送る
- **THEN** ステータス 422 で `errors.name` があり、名前は変わっていない

#### Scenario: name なし
- **WHEN** `{}` を送る
- **THEN** ステータス 422 で `errors.name` がある

### Requirement: パスワードの変更
システムは `PUT /api/profile/password` で `{ currentPassword, newPassword }` を受け取り、現在のパスワードが一致すれば新しいパスワードに変更して 204（ボディなし）を返さなければならない（SHALL）。

#### Scenario: 新パスワードでログイン
- **WHEN** `{ "currentPassword": "password", "newPassword": "new-password" }` で変更する
- **THEN** ステータス 204 が返り、`new-password` でログインでき、`password` ではログインできない（401）

#### Scenario: 発行済みのトークンは使える
- **WHEN** パスワード変更後に、変更前に発行したアクセストークンで `GET /api/profile` する
- **THEN** ステータス 200 が返る（パスワード変更でトークンは失効しない）

### Requirement: 現在のパスワード不一致
システムは、`currentPassword` が一致しないとき 401 と `{ "message": "The current password is incorrect." }` を返し、パスワードを変更してはならない（MUST NOT）。

#### Scenario: 現在のパスワード違い
- **WHEN** `{ "currentPassword": "wrong-password", "newPassword": "new-password" }` で変更する
- **THEN** ステータス 401 と上記メッセージが返り、`password` でまだログインできる

#### Scenario: 大文字小文字の違い
- **WHEN** 現在のパスワードが `password` のときに `currentPassword: "PASSWORD"` で変更する
- **THEN** ステータス 401 が返る

### Requirement: パスワード変更の入力検証
システムは、`currentPassword` が未指定・空文字、`newPassword` が未指定・8 文字未満のとき 422 を返さなければならない（SHALL）。

#### Scenario: newPassword 8 文字
- **WHEN** 8 文字の `newPassword` で変更する
- **THEN** ステータス 204 が返る

#### Scenario: newPassword 7 文字
- **WHEN** 7 文字の `newPassword` で変更する
- **THEN** ステータス 422 で `errors.newPassword` がある

#### Scenario: currentPassword なし
- **WHEN** `{ "newPassword": "new-password" }` で変更する
- **THEN** ステータス 422 で `errors.currentPassword` がある

### Requirement: プロフィールは要認証
システムは、`/api/profile` 配下のすべてのエンドポイントで、未認証なら 401 と `{ "message": "Unauthenticated." }` を返さなければならない（SHALL）。

#### Scenario: トークンなしで取得
- **WHEN** トークンなしで `GET /api/profile` する
- **THEN** ステータス 401 が返る

#### Scenario: トークンなしでパスワード変更
- **WHEN** トークンなしで `PUT /api/profile/password` する
- **THEN** ステータス 401 が返る（422 ではない）
