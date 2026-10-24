# infrastructure/

TypeORM を使う実装を置く。`domain/` の抽象クラスを実装し、外からはドメイン型だけが見えるようにする。依存の向きは infrastructure → domain で、domain は infrastructure を知らない。

## entities/（Eloquent Model 相当）

- TypeORM の `@Entity()` クラス。テーブル名は Laravel と同じ複数形スネークケース（`refresh_tokens`）
- カラムはプロパティを camelCase、DB はスネークケース（`@Column({ name: 'author_id' })`）
- カラムの型は `@Column({ type: 'text' })` のように明示する（メタデータからの推測に頼らない）
- `authors` / `books` / `users` は `@CreateDateColumn` / `@UpdateDateColumn` / `@DeleteDateColumn`（timestamps + SoftDeletes）
- `refresh_tokens` は SoftDeletes を付けない（失効したら物理削除する）
- テーブルとカラムを作るのはマイグレーション（`src/database/migrations/`）。Entity を変えたらマイグレーションも足す
- 新しい Entity は `src/database/entities.ts` の配列に足す（`DatabaseModule` と CLI の DataSource が使う）
- ドメイン層は Entity を知らない

## repositories/（Repository 実装）

- 命名：`TypeOrm{対象}Repository`、ファイル `typeorm-{対象}.repository.ts`
- `extends BookRepository` で抽象クラスを実装する（実装漏れはコンパイルエラーになる）
- `@InjectRepository(BookEntity)` で TypeORM の Repository を受け取る
- 戻り値は必ずドメイン型に変換する（Entity をそのまま返さない）
- 削除は `softDelete(id)`。`affected === 0` なら `false` を返す
- `findByEmail` だけ `password` を含む `UserWithPassword` を返す

## 置かないもの

- ビジネスロジック（→ `useCases/` / `services/`）
- HTTP の知識（`HttpException` など）

## チェックリスト

- [ ] `domain/` の抽象クラスを `extends` している
- [ ] ドメイン型に変換して返している
- [ ] ビジネスロジックを含んでいない
- [ ] Entity を足したら `src/database/entities.ts` とマイグレーションも足した
