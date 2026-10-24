# http/resources/（API Resource）

**責務**：ドメイン型をレスポンスの JSON に変換する。パスワードなど外に出してはいけない値はここで落とす。

```ts
export class BookResource {
  static make(book: Book) {
    return { id: book.id, title: book.title, authorId: book.authorId, price: book.price }
  }

  static collection(books: Book[]) {
    return books.map((b) => BookResource.make(b))
  }
}
```

| Resource | 出力するキー |
|---|---|
| `UserResource` | `id`, `name`, `email`, `isAdmin` |
| `AuthorResource` | `id`, `name`, `email`（未設定は `null`） |
| `BookResource` | `id`, `title`, `authorId`, `price` |

> Laravel の `JsonResource` はデフォルトで `{ "data": ... }` に包む。本プロジェクトはレスポンスを平らに保つため包まない（`JsonResource::withoutWrapping()` 相当）。包みたくなったら Resource 側を変えるだけで済む。

## チェックリスト

- [ ] `make()` と `collection()` がある
- [ ] 出力するキーを明示している（ドメイン型をスプレッドで丸ごと返していない）
- [ ] パスワードなど外に出してはいけない値を含めていない
