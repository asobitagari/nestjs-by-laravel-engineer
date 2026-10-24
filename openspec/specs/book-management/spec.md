# book-management Specification

## Purpose

書籍を誰でも閲覧でき、管理者だけが作成・更新・論理削除できるようにする。書籍は作成・更新の時点で存在する著者に紐づく。著者そのものの管理は `author-management`、トークンの検証と管理者の判定は `access-control` が扱う。

## Requirements

### Requirement: 書籍の表現
システムは、書籍を `{ id, title, authorId, price }` の JSON で返さなければならない（SHALL）。レスポンスを `data` などで包んではならない（MUST NOT）。

#### Scenario: 個別取得の形
- **WHEN** `{ "title": "こころ", "authorId": 1, "price": 600 }` で作成した書籍を GET する
- **THEN** ボディは `{ "id": <id>, "title": "こころ", "authorId": 1, "price": 600 }` で、ほかのキーはない

#### Scenario: 一覧の要素の形
- **WHEN** `GET /api/books` する
- **THEN** 各要素のキーは `id`・`title`・`authorId`・`price` の 4 つだけである（`createdAt`・`deletedAt` などは含まない）

### Requirement: 書籍の一覧
システムは `GET /api/books` で、論理削除されていない書籍を配列で 200 で返さなければならない（SHALL）。認証は不要。

#### Scenario: 0 件
- **WHEN** 書籍が 1 件もない状態で `GET /api/books` する
- **THEN** ステータス 200、ボディ `[]` が返る

#### Scenario: 論理削除済みは含まない
- **WHEN** 書籍 2 件のうち 1 件を削除してから `GET /api/books` する
- **THEN** 1 件の配列が返る

### Requirement: 書籍の取得
システムは `GET /api/books/:id` で書籍を 200 で返し、存在しない・論理削除済みなら 404、ID が数値でなければ 400 を返さなければならない（SHALL）。認証は不要。

#### Scenario: 存在する ID
- **WHEN** 存在する ID で GET する
- **THEN** ステータス 200 でその書籍が返る

#### Scenario: 存在しない ID
- **WHEN** `GET /api/books/9999` する
- **THEN** ステータス 404 が返る

#### Scenario: 数値でない ID
- **WHEN** `GET /api/books/abc` する
- **THEN** ステータス 400 が返る

### Requirement: 書籍の作成
システムは `POST /api/books` で `{ title, authorId, price }` を受け取り、書籍を作成して 201 と作成した書籍を返さなければならない（SHALL）。

#### Scenario: 作成
- **GIVEN** 管理者でログインしていて、著者「太宰治」が存在する
- **WHEN** `{ "title": "人間失格", "authorId": <太宰治の id>, "price": 550 }` で作成する
- **THEN** ステータス 201 で、`id` 付きの書籍が返る

#### Scenario: 作成後に一覧に出る
- **WHEN** 書籍 0 件の状態で 1 件作成してから `GET /api/books` する
- **THEN** 作成した書籍 1 件の配列が返る

### Requirement: 書籍の更新
システムは `PUT /api/books/:id` で `{ title, authorId, price }` を受け取り、更新して 200 と更新後の書籍を返さなければならない（SHALL）。対象が存在しない・論理削除済みなら 404 を返す。

#### Scenario: 更新
- **WHEN** 管理者が価格 600 の書籍を `price: 650` で更新する
- **THEN** ステータス 200 で `price` が 650 になっている

#### Scenario: 存在しない書籍の更新
- **WHEN** 管理者が `PUT /api/books/9999` する
- **THEN** ステータス 404 が返る

### Requirement: 書籍の削除
システムは `DELETE /api/books/:id` で書籍を論理削除し、204（ボディなし）を返さなければならない（SHALL）。対象が存在しない・論理削除済みなら 404 を返す。

#### Scenario: 削除後は見えない
- **WHEN** 管理者が書籍を削除し、その後同じ ID を GET する
- **THEN** 削除は 204、その後の GET は 404 が返る

#### Scenario: 存在しない書籍の削除
- **WHEN** 管理者が `DELETE /api/books/9999` する
- **THEN** ステータス 404 が返る

### Requirement: 書籍の入力検証
システムは、作成・更新で `title` が未指定・空文字、`authorId`・`price` が未指定・整数でない・1 未満のとき 422 を返さなければならない（SHALL）。

#### Scenario: price 1
- **WHEN** 管理者が `price: 1` で作成する
- **THEN** ステータス 201 が返る

#### Scenario: price 0
- **WHEN** 管理者が `price: 0` で作成する
- **THEN** ステータス 422 で `errors.price` がある

#### Scenario: 必須項目なし
- **WHEN** 管理者が `{}` で作成する
- **THEN** ステータス 422 で `errors` に `title`・`authorId`・`price` がある

#### Scenario: 整数でない
- **WHEN** 管理者が `{ "title": "x", "authorId": "1", "price": 1.5 }` で作成する
- **THEN** ステータス 422 で `errors.authorId` と `errors.price` がある

### Requirement: 存在しない著者の指定
システムは、作成・更新で `authorId` に存在しない・論理削除済みの著者を指定したとき、422 と `{ "message": "The selected author id is invalid.", "errors": { "authorId": ["The selected author id is invalid."] } }` を返し、書籍を変更してはならない（MUST NOT）。

#### Scenario: 存在しない authorId で作成
- **WHEN** 管理者が `authorId: 9999` で書籍を作成する
- **THEN** ステータス 422 で上記のボディが返り、書籍は増えていない

#### Scenario: 論理削除済みの著者
- **WHEN** 管理者が削除済みの著者の ID で書籍を作成する
- **THEN** ステータス 422 で `errors.authorId` がある

#### Scenario: 存在しない authorId で更新
- **WHEN** 管理者が既存の書籍を `authorId: 9999` で更新する
- **THEN** ステータス 422 が返り、書籍の `authorId` は変わっていない

### Requirement: 書籍の変更は管理者だけ
システムは、作成・更新・削除で、未認証なら 401、管理者でなければ 403 を返し、書籍を変更してはならない（MUST NOT）。

#### Scenario: トークンなしで作成
- **WHEN** トークンなしで `POST /api/books` する
- **THEN** ステータス 401 が返る

#### Scenario: 一般ユーザーが作成
- **WHEN** 一般ユーザーが `POST /api/books` する
- **THEN** ステータス 403 が返り、書籍は増えていない
