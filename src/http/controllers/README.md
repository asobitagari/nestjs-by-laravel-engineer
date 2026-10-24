# http/controllers/（Controller）

**責務**

- HTTP リクエストを受け取り、レスポンスを返す
- バリデーションは Request DTO（引数の型）で行う。Controller 内では行わない
- 認証・認可は `@UseGuards()` で宣言する
- UseCase / Service を呼び出し、結果を Resource で整形して返す

**規約**

- ビジネスロジックを書かない（→ `useCases/` へ）
- try/catch でドメイン例外を HTTP に変換しない（→ `http/filters/handler.filter.ts` が一括で行う）
- ID は `@Param('id', ParseIntPipe) id: number` で受け取る（数値以外は 400）
- 単純な取得（プロフィール取得など）はリポジトリを直接呼んでよい（ルールのない取得のために UseCase を作らない）

```ts
@Controller('books')
export class BooksController {
  constructor(
    private readonly getBooks: GetBooksUseCase,
    private readonly getBook: GetBookUseCase,
    private readonly createBook: CreateBookUseCase,
    private readonly updateBook: UpdateBookUseCase,
    private readonly deleteBook: DeleteBookUseCase,
  ) {}

  @Get()
  async index() {
    return BookResource.collection(await this.getBooks.execute())
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(201)
  async store(@Body() request: CreateBookRequest) {
    return BookResource.make(await this.createBook.execute(request))
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(204)
  async destroy(@Param('id', ParseIntPipe) id: number) {
    await this.deleteBook.execute(id)
  }
}
```

メソッド名は Laravel のリソースコントローラに揃える（`index` / `show` / `store` / `update` / `destroy`）。

**チェックリスト**

- [ ] 対応する Module の `controllers` に登録されている
- [ ] 引数の型に `http/requests/` の Request DTO を使っている
- [ ] 戻り値を Resource で整形している（Entity やパスワード付きの型をそのまま返していない）
- [ ] 認証・認可が必要なメソッドに `@UseGuards()` がある
