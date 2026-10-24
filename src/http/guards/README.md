# http/guards/（Middleware）

認証・認可を宣言的に掛ける。Controller のメソッドに `@UseGuards(JwtAuthGuard, AdminGuard)` の順で並べる。NestJS は Guard を Pipe（入力検証）より先に動かすので、未認証・権限なしのリクエストに 422 は返らない（Laravel で `auth` ミドルウェアが FormRequest より先に動くのと同じ）。

| ファイル | Laravel | 内容 |
|---|---|---|
| `jwt-auth.guard.ts` | `auth:sanctum` | `Authorization: Bearer <token>` を検証する。署名（HS256）と有効期限を確認し、さらに `UserRepository.findById(sub)` でユーザーが存在する（論理削除されていない）ことを確認する。OK なら `request.user = { id }` をセット。NG は 401 |
| `admin.guard.ts` | `can:admin` | `request.user.id` で `UserRepository.findById` し、`isAdmin` が `false` なら 403。必ず `JwtAuthGuard` の後に並べる |

- 401 は `throw new UnauthorizedException({ message: 'Unauthenticated.' })`
- 403 は `throw new ForbiddenException({ message: 'This action is unauthorized.' })`
- どちらも Laravel の既定メッセージに合わせる
- 権限はトークンに入れず、`AdminGuard` が毎回 DB の `is_admin` を見る（降格がすぐ効く）

## 使う Module の条件

Guard は `JwtService` と `UserRepository` に依存する。`JwtService` は `AuthModule` がグローバルに登録しているので、Guard を使う Module は `UsersModule` を import するだけでよい（`src/modules/README.md`）。

## 認証ユーザーの取得

`http/decorators/current-user.decorator.ts` の `@CurrentUser()` で `request.user`（`{ id }`）を受け取る。`$request->user()` に当たる。

## チェックリスト

- [ ] `@UseGuards()` の順番が `JwtAuthGuard` → `AdminGuard`
- [ ] Guard を使う Module が `UsersModule` を import している
