# http/decorators/

Controller の引数に付けるデコレータを置く。

## `current-user.decorator.ts`

`$request->user()` 相当。`JwtAuthGuard` がセットした `request.user`（`{ id }`）を取り出す。

```ts
@Get()
@UseGuards(JwtAuthGuard)
async show(@CurrentUser() user: AuthUser) { ... }
```

- `JwtAuthGuard` を通ったメソッドでだけ使う（通っていなければ `undefined`）
- 取り出すのは ID だけ。最新のユーザー情報が要るときは Repository で引き直す（権限などがトークン発行後に変わっているため）
