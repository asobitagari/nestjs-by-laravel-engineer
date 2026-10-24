# http/filters/（Exceptions/Handler.php）

例外 → HTTP レスポンスの変換を 1 か所に集める。Controller・UseCase は try/catch で HTTP に変換しない。

- `handler.filter.ts`：`@Catch()` ですべての例外を受け、Laravel と同じ形の JSON（`{ message }`、422 は `{ message, errors }`）にする。`bootstrap.ts` の `configureApp()` でグローバルに登録する
- `validation-exception.factory.ts`：`ValidationPipe` の `exceptionFactory`。class-validator のエラーを Laravel の 422 形式に変換する

## 判定の順番

1. `DomainError` のサブクラス → 下の変換表
2. `ValidationException`（`validationExceptionFactory` が投げる）→ 422 でボディをそのまま返す
3. その他の `HttpException` → ステータスを維持し、ボディを `{ message }` にする。404（未定義ルートを含む）は `Not Found.`。Guard の 401 / 403 は Guard で指定した文言、`ParseIntPipe` の 400 と不正な JSON の 400 は例外のメッセージ
4. それ以外 → 500 `{ "message": "Server Error" }`。詳細は `Logger` にだけ出す

## ドメイン例外 → HTTP の変換表

| ドメイン例外（`domain/errors.ts`） | HTTP | ボディ |
|---|---|---|
| `NotFoundError` | 404 | `{ "message": "Not Found." }` |
| `InvalidCredentialsError`（ログイン） | 401 | `{ "message": "These credentials do not match our records." }` |
| `CurrentPasswordMismatchError`（パスワード変更） | 401 | `{ "message": "The current password is incorrect." }` |
| `EmailAlreadyExistsError` | 409 | `{ "message": "The email has already been taken." }` |
| `InvalidRefreshTokenError`（存在しない・期限切れ） | 401 | `{ "message": "Invalid or expired refresh token." }` |
| `AuthorNotFoundError`（書籍の `authorId`） | 422 | `{ "message": "The selected author id is invalid.", "errors": { "authorId": ["The selected author id is invalid."] } }` |

## 422 の message の書式

- `message` は最初のエラー。2 件以上あれば ` (and N more error)`、N が 2 以上なら ` (and N more errors)` を付ける（Laravel の `ValidationException::summarize` と同じ）
- `errors` のキーは違反したプロパティ名、値はメッセージの配列

## チェックリスト

- [ ] 新しいドメイン例外を足したら、変換表（`DOMAIN_ERRORS`）とこの README に足した
- [ ] エラーボディに `message`（と 422 の `errors`）以外のキーを出していない
