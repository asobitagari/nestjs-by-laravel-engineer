# services/（Domain Service）

単一エンティティのビジネスルールを置く。UseCase と同じく HTTP を知らず、バリデーションをせず、DB には Repository 抽象クラス経由でアクセスし、失敗はドメイン例外で表す。

## useCases/ との使い分け

| | useCases | services |
|---|---|---|
| 役割 | 複数操作のフロー制御 | 単一エンティティのビジネスルール |
| 例 | ログイン（認証 → トークン発行 → DB 保存） | プロフィール名変更（メールは変更不可） |

ルールのない単純な取得（プロフィール取得）は Service を作らず、Controller から Repository を直接呼ぶ。

| Service | シグネチャ | ビジネスルール |
|---|---|---|
| `UpdateProfileNameService` | `execute(userId, name): Promise<User>` | 名前だけを変更する。メールアドレス・権限は変更できない |
| `UpdatePasswordService` | `execute(userId, currentPassword, newPassword): Promise<void>` | 現在のパスワードが一致しなければ `CurrentPasswordMismatchError`。発行済みのトークンは失効させない |

**規約**：`@Injectable() class {動詞}{対象}Service { execute(...) }`、1 ファイル 1 サービス。ディレクトリは機能ごと（`profile/`）

## チェックリスト

- [ ] 守るビジネスルールが 1 つの文で言える（言えないなら UseCase か、Service が不要）
- [ ] HTTP に依存していない
- [ ] 対応する Module の `providers` に登録している
