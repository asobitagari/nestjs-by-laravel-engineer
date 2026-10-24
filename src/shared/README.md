# shared/

どのレイヤーからも使う小さな関数を置く。Laravel の `Hash` ファサードやヘルパー関数に当たる。

| ファイル | 関数 | 仕様 |
|---|---|---|
| `password.ts` | `hashPassword(plain, rounds)` / `verifyPassword(plain, hashed)` | bcrypt。rounds は `BCRYPT_ROUNDS`（既定 12、テストは 4。Laravel と同じ） |
| `token.ts` | `generateRefreshToken()` / `refreshTokenExpiresAt(now = new Date())` | 32 バイトのランダム hex 文字列 / 現在から 30 日後 |

アクセストークンの生成・検証は `@nestjs/jwt` の `JwtService`（`signAsync` / `verifyAsync`）を使うので `shared/` には置かない。

## 置かないもの

- 状態を持つクラス・DB アクセス（→ `infrastructure/`）
- ビジネスルール（→ `services/` / `useCases/`）

## チェックリスト

- [ ] 純粋な関数だけを export している
- [ ] 1 ファイル 1 つの関心（パスワード・トークン）になっている
