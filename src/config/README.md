# config/

`config/*.php` + `env()` に当たる。`@nestjs/config` の `registerAs()` で名前空間ごとに 1 ファイル置き、`AppModule` の `ConfigModule.forRoot({ isGlobal: true, load })` で読み込む。値は `ConfigService.getOrThrow('auth.jwtSecret')` のように取り出す。

| ファイル | 名前空間 | 値（環境変数・既定値） |
|---|---|---|
| `app.config.ts` | `app` | `port`（`PORT`・既定 3000） |
| `auth.config.ts` | `auth` | `jwtSecret`（`JWT_SECRET`・必須）、`accessTokenTtlSeconds`（900）、`refreshTokenTtlDays`（30）、`bcryptRounds`（`BCRYPT_ROUNDS`・既定 12） |
| `database.config.ts` | `database` | `database`（`DATABASE_URL`・既定 `sqlite.db`） |

- `JWT_SECRET` が未設定・空文字なら、`auth.config.ts` の読み込みでエラーを投げて起動を止める（署名鍵のないまま動かさない）
- `process.env` を読むのはこのディレクトリだけにする（例外は Nest の外で動く `src/database/data-source.ts` とシーダー）
- テストの値は `test/setup-env.ts` で入れる（`phpunit.xml` の `<env>` に当たる）

## チェックリスト

- [ ] 新しい環境変数を足したら、ここと `.env.example` とルート README の環境変数の表に足した
- [ ] 必須の値は起動時に検証している
