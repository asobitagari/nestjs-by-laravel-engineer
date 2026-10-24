# author-management Specification

## Purpose

著者を誰でも閲覧でき、管理者だけが作成・更新・論理削除できるようにする。トークンの検証と管理者の判定そのものは `access-control`、エラーボディの形は `error-responses` が扱う。

## Requirements

### Requirement: 著者の表現
システムは、著者を `{ id, name, email }` の JSON で返さなければならない（SHALL）。`email` が未設定なら `null` とする。レスポンスを `data` などで包んではならない（MUST NOT）。

#### Scenario: email あり
- **WHEN** `{ "name": "夏目漱石", "email": "soseki@example.com" }` で作成した著者を GET する
- **THEN** ボディは `{ "id": <id>, "name": "夏目漱石", "email": "soseki@example.com" }` で、ほかのキーはない

#### Scenario: email 未設定
- **WHEN** `{ "name": "太宰治" }` で作成した著者を GET する
- **THEN** `email` が `null` で返る

### Requirement: 著者の一覧
システムは `GET /api/authors` で、論理削除されていない著者を配列で 200 で返さなければならない（SHALL）。認証は不要。

#### Scenario: 0 件
- **WHEN** 著者が 1 件もない状態で `GET /api/authors` する
- **THEN** ステータス 200、ボディ `[]` が返る

#### Scenario: 複数件
- **WHEN** 著者が 2 件ある状態で `GET /api/authors` する
- **THEN** ステータス 200 で、2 件の配列が返る

#### Scenario: 論理削除済みは含まない
- **WHEN** 著者 3 件のうち 1 件を削除してから `GET /api/authors` する
- **THEN** 2 件の配列が返り、削除した著者の `id` は含まれない

### Requirement: 著者の取得
システムは `GET /api/authors/:id` で著者を 200 で返し、存在しない・論理削除済みなら 404 を返さなければならない（SHALL）。ID が数値でなければ 400 を返す。認証は不要。

#### Scenario: 存在する ID
- **WHEN** 存在する ID で GET する
- **THEN** ステータス 200 でその著者が返る

#### Scenario: 存在しない ID
- **WHEN** `GET /api/authors/9999` する
- **THEN** ステータス 404、ボディ `{ "message": "Not Found." }` が返る

#### Scenario: 数値でない ID
- **WHEN** `GET /api/authors/abc` する
- **THEN** ステータス 400 が返る

### Requirement: 著者の作成
システムは `POST /api/authors` で `{ name, email? }` を受け取り、著者を作成して 201 と作成した著者を返さなければならない（SHALL）。

#### Scenario: 作成
- **GIVEN** 管理者でログインしている
- **WHEN** `{ "name": "太宰治", "email": "dazai@example.com" }` で作成する
- **THEN** ステータス 201 で、`id` 付きの著者が返る

#### Scenario: 作成後に取得できる
- **WHEN** 作成のレスポンスの `id` で GET する
- **THEN** ステータス 200 で同じ `name` が返る

### Requirement: 著者の更新
システムは `PUT /api/authors/:id` で `{ name, email? }` を受け取り、更新して 200 と更新後の著者を返さなければならない（SHALL）。対象が存在しない・論理削除済みなら 404 を返す。

#### Scenario: 更新
- **WHEN** 管理者が既存の著者を `{ "name": "新しい名前" }` で更新する
- **THEN** ステータス 200 で `name` が `新しい名前`、`email` が `null` になっている

#### Scenario: 存在しない著者の更新
- **WHEN** 管理者が `PUT /api/authors/9999` する
- **THEN** ステータス 404 が返る

### Requirement: 著者の削除
システムは `DELETE /api/authors/:id` で著者を論理削除し、204（ボディなし）を返さなければならない（SHALL）。対象が存在しない・論理削除済みなら 404 を返す。

#### Scenario: 削除後は見えない
- **WHEN** 管理者が著者を削除し、その後同じ ID を GET する
- **THEN** 削除は 204、その後の GET は 404 が返る

#### Scenario: 2 回削除
- **WHEN** 管理者が同じ著者を 2 回削除する
- **THEN** 1 回目は 204、2 回目は 404 が返る

### Requirement: 著者の入力検証
システムは、作成・更新で `name` が未指定・空文字・100 文字超、または `email` がメール形式でないとき 422 を返さなければならない（SHALL）。`email` は省略してよい。

#### Scenario: name 100 文字
- **WHEN** 管理者が 100 文字の `name` で作成する
- **THEN** ステータス 201 が返る

#### Scenario: name 101 文字
- **WHEN** 管理者が 101 文字の `name` で作成する
- **THEN** ステータス 422 で `errors.name` がある

#### Scenario: name なし
- **WHEN** 管理者が `{}` で作成する
- **THEN** ステータス 422 で `errors.name` がある

#### Scenario: email 形式不正
- **WHEN** 管理者が `{ "name": "太宰治", "email": "not-an-email" }` で作成する
- **THEN** ステータス 422 で `errors.email` がある

### Requirement: 著者の変更は管理者だけ
システムは、作成・更新・削除で、未認証なら 401、管理者でなければ 403 を返し、著者を変更してはならない（MUST NOT）。一覧と取得には認証を求めてはならない（MUST NOT）。

#### Scenario: トークンなしで作成
- **WHEN** トークンなしで `POST /api/authors` する
- **THEN** ステータス 401 が返り、著者は増えていない

#### Scenario: 一般ユーザーが削除
- **WHEN** 一般ユーザーが `DELETE /api/authors/1` する
- **THEN** ステータス 403 が返り、その著者はまだ GET できる

#### Scenario: トークンなしで一覧
- **WHEN** トークンなしで `GET /api/authors` する
- **THEN** ステータス 200 が返る

### Requirement: 著者の削除は書籍に波及しない
システムは、著者を論理削除しても、その著者の書籍を削除してはならない（MUST NOT）。

#### Scenario: 著者削除後の書籍
- **GIVEN** 著者 1 に書籍「こころ」がある
- **WHEN** 管理者が著者 1 を削除してから、その書籍を GET する
- **THEN** ステータス 200 で、`authorId` は 1 のままである

#### Scenario: 著者削除後の書籍一覧
- **GIVEN** 書籍が 5 件あり、そのうち 2 件が著者 1 の書籍である
- **WHEN** 管理者が著者 1 を削除してから `GET /api/books` する
- **THEN** 5 件の配列が返る
