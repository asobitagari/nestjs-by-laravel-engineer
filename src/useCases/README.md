# useCases/（Action クラス）

**共通の責務**

- HTTP を知らない（`Request` / `Response` / `HttpException` に依存しない）
- バリデーションをしない（Request DTO で済んでいる前提）
- DB には Repository 抽象クラス経由でアクセスする
- 失敗はドメイン例外を `throw` して表す（HTTP ステータスは Filter が決める）

**規約**：`@Injectable() class {動詞}{対象}UseCase { execute(...) }`、1 ファイル 1 ユースケース

| UseCase | シグネチャ | 仕様 |
|---|---|---|
| `LoginUseCase` | `execute({ email, password }): Promise<{ accessToken, refreshToken }>` | `findByEmail` → `verifyPassword` → アクセストークン生成（`JwtService`）→ リフレッシュトークン生成・保存。ユーザーがいない・パスワード不一致は `InvalidCredentialsError` |
| `RegisterUseCase` | `execute({ name, email, password }): Promise<User>` | メール重複は `EmailAlreadyExistsError`。パスワードをハッシュ化して作成（`isAdmin = false`） |
| `LogoutUseCase` | `execute(token): Promise<void>` | `deleteByToken`。存在しなくてもエラーにしない |
| `RefreshTokenUseCase` | `execute(refreshToken): Promise<{ accessToken }>` | `findByToken`。存在しない・`expiresAt` が過去なら `InvalidRefreshTokenError`（期限切れのトークンは削除する） |
| `GetAuthorsUseCase` / `GetAuthorUseCase` | `execute()` / `execute(id)` | 見つからなければ `NotFoundError` |
| `CreateAuthorUseCase` / `UpdateAuthorUseCase` / `DeleteAuthorUseCase` | | 更新・削除の対象がなければ `NotFoundError` |
| `GetBooksUseCase` / `GetBookUseCase` | | 見つからなければ `NotFoundError` |
| `CreateBookUseCase` / `UpdateBookUseCase` | | `authorId` の著者がいなければ `AuthorNotFoundError`。更新対象がなければ `NotFoundError` |
| `DeleteBookUseCase` | | 対象がなければ `NotFoundError` |
| `GetUsersUseCase` / `GetUserUseCase` / `UpdateUserUseCase` / `DeleteUserUseCase` | | 見つからなければ `NotFoundError`。更新時にメールが他ユーザーと重複したら `EmailAlreadyExistsError` |

## services/ との使い分け

複数の操作のフロー制御（ログイン＝認証 → トークン発行 → 保存）は UseCase、単一エンティティのビジネスルール（プロフィール名だけを変える）は `services/`。ルールのない単純な取得は UseCase を作らず Controller から Repository を呼んでよい。

## チェックリスト

- [ ] `@nestjs/common` からは `Injectable` だけを import している（`HttpException` などを使っていない）
- [ ] 依存は `domain/` の抽象クラスで受け取っている
- [ ] 失敗をドメイン例外で表している
- [ ] 対応する Module の `providers` に登録している
