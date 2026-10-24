# Spec Delta

## Purpose

すべての API エンドポイントが、Laravel の JSON エラーと同じ形のエラーレスポンスを返すことを保証する。どの条件でどのステータスになるかは各 capability が決め、本 capability はボディの形と、どの capability にも属さない共通のエラー（未定義ルート・ID の形式・バリデーションの書式・想定外のエラー）を扱う。

## ADDED Requirements

### Requirement: エラーボディの共通形式
システムは、すべてのエラーレスポンスを JSON とし、文字列の `message` を含めなければならない（SHALL）。`errors` はバリデーションエラー（422）のときだけ含め、それ以外のエラーに `statusCode`・`error` などのキーを含めてはならない（MUST NOT）。

#### Scenario: 404 のボディ
- **WHEN** `GET /api/authors/9999` する
- **THEN** ボディは `{ "message": "Not Found." }` で、ほかのキーはない

#### Scenario: 401 のボディ
- **WHEN** トークンなしで `GET /api/profile` する
- **THEN** ボディは `{ "message": "Unauthenticated." }` で、ほかのキーはない

### Requirement: 未定義のルートは 404
システムは、定義されていないパス・メソッドへのリクエストに 404 と `{ "message": "Not Found." }` を返さなければならない（SHALL）。

#### Scenario: 存在しないパス
- **WHEN** `GET /api/unknown` する
- **THEN** ステータス 404、ボディ `{ "message": "Not Found." }` が返る

#### Scenario: /api なしのパス
- **WHEN** `GET /authors` する
- **THEN** ステータス 404 が返る

### Requirement: ID パラメータが数値でない場合は 400
システムは、`:id` パスパラメータが数値でないとき、ステータス 400 と `{ "message": "Validation failed (numeric string is expected)" }` を返さなければならない（SHALL）。

#### Scenario: 文字列の ID
- **WHEN** `GET /api/authors/abc` する
- **THEN** ステータス 400、ボディ `{ "message": "Validation failed (numeric string is expected)" }` が返る

#### Scenario: 小数の ID
- **WHEN** `GET /api/books/1.5` する
- **THEN** ステータス 400 が返る

### Requirement: バリデーションエラーのボディ
システムは、リクエストボディがルールに違反したとき、ステータス 422 と `{ message, errors }` を返さなければならない（SHALL）。`errors` のキーは違反したプロパティ名、値はそのプロパティのメッセージ（英語）の配列とする。

#### Scenario: 必須項目なし
- **WHEN** 管理者が `{}` で `POST /api/books` する
- **THEN** ステータス 422 で、`errors` のキーは `title`・`authorId`・`price` で、値はどれも 1 件以上の文字列の配列である

#### Scenario: 違反していないプロパティは含まない
- **WHEN** 管理者が `{ "name": "太宰治", "email": "x" }` で `POST /api/authors` する
- **THEN** `errors` のキーは `email` だけである

### Requirement: バリデーションエラーの message
システムは、422 の `message` を最初のエラーメッセージとし、エラーが 2 件以上あれば ` (and N more error)`（N が 2 以上なら `errors`）を末尾に付けなければならない（SHALL）。N は全プロパティのメッセージの合計から 1 を引いた数とする。

#### Scenario: エラー 1 件
- **WHEN** バリデーションエラーが 1 件だけ発生する
- **THEN** `message` はそのエラー文そのものである

#### Scenario: エラー 2 件
- **WHEN** バリデーションエラーが 2 件発生し、最初のエラーが `name should not be empty` である
- **THEN** `message` は `name should not be empty (and 1 more error)` である

#### Scenario: エラー 3 件
- **WHEN** バリデーションエラーが 3 件発生する
- **THEN** `message` は最初のエラー文に ` (and 2 more errors)` を付けたものである

### Requirement: ルールにないキーの破棄
システムは、リクエストボディのうちバリデーションルールに定義されていないキーを、エラーにせず捨て、処理に使ってはならない（MUST NOT）。

#### Scenario: 未定義のキーを送る
- **WHEN** 管理者が `{ "name": "太宰治", "foo": "bar" }` で `POST /api/authors` する
- **THEN** ステータス 201 で、レスポンスに `foo` はない

#### Scenario: 変更できないキーを送る
- **WHEN** 一般ユーザーが `PUT /api/profile` に `{ "name": "新しい名前", "email": "other@example.com" }` を送る
- **THEN** ステータス 200 で、メールアドレスは変わらない（`user-profile` 参照）

### Requirement: 想定外のエラーは 500
システムは、想定外の例外が発生したとき、ステータス 500 と `{ "message": "Server Error" }` を返し、例外のメッセージやスタックトレースをレスポンスに含めてはならない（MUST NOT）。詳細はサーバーログにだけ出力する。

#### Scenario: 内部エラー
- **GIVEN** 処理中に `boom` というメッセージの想定外の例外が発生する
- **WHEN** そのエンドポイントにリクエストする
- **THEN** ステータス 500、ボディ `{ "message": "Server Error" }` が返り、ボディに `boom` は含まれない

#### Scenario: 不正な JSON
- **WHEN** `Content-Type: application/json` で `{invalid` を `POST /api/auth/login` に送る
- **THEN** ステータス 400 で、ボディは `message` だけを持つ JSON である（500 にならない）
