# http/requests/（FormRequest）

**責務**

- リクエストボディのバリデーションルールを class-validator のデコレータで宣言する
- ルールの宣言だけを行い、ビジネスロジック・DB アクセスを含まない（`exists` / `unique` 相当は UseCase で判定する）

**命名**：`{動詞}{対象}Request`（例：`CreateBookRequest`）

**ルール一覧**

| クラス | フィールド | ルール（Laravel 表記） | class-validator |
|---|---|---|---|
| `LoginRequest` | `email` | `required\|email` | `@IsEmail()` |
| | `password` | `required\|string\|min:1` | `@IsString() @IsNotEmpty()` |
| `RegisterRequest` | `name` | `required\|string\|max:100` | `@IsString() @IsNotEmpty() @MaxLength(100)` |
| | `email` | `required\|email` | `@IsEmail()` |
| | `password` | `required\|string\|min:8` | `@IsString() @MinLength(8)` |
| `LogoutRequest` | `token` | `required\|string` | `@IsString() @IsNotEmpty()` |
| `RefreshTokenRequest` | `refreshToken` | `required\|string` | `@IsString() @IsNotEmpty()` |
| `CreateAuthorRequest` / `UpdateAuthorRequest` | `name` | `required\|string\|max:100` | `@IsString() @IsNotEmpty() @MaxLength(100)` |
| | `email` | `nullable\|email` | `@IsOptional() @IsEmail()` |
| `CreateBookRequest` / `UpdateBookRequest` | `title` | `required\|string` | `@IsString() @IsNotEmpty()` |
| | `authorId` | `required\|integer\|min:1` | `@IsInt() @Min(1)` |
| | `price` | `required\|integer\|min:1` | `@IsInt() @Min(1)` |
| `UpdateProfileRequest` | `name` | `required\|string\|max:100` | `@IsString() @IsNotEmpty() @MaxLength(100)` |
| `UpdatePasswordRequest` | `currentPassword` | `required\|string` | `@IsString() @IsNotEmpty()` |
| | `newPassword` | `required\|string\|min:8` | `@IsString() @MinLength(8)` |
| `UpdateUserRequest` | `name` | `required\|string\|max:100` | `@IsString() @IsNotEmpty() @MaxLength(100)` |
| | `email` | `required\|email` | `@IsEmail()` |
| | `isAdmin` | `boolean`（省略時 `false`） | `@IsOptional() @IsBoolean()`、プロパティ初期値 `= false` |

**チェックリスト**

- [ ] クラス名が `{動詞}{対象}Request`
- [ ] DB アクセスを含んでいない
- [ ] `test/unit/requests/` に Valid と Missing / Invalid のテストがある

## テスト

HTTP を通さず `plainToInstance` + `validate` で確かめる（`test/unit/requests/`）。Laravel で FormRequest の `rules()` を `Validator::make()` に渡して直接確かめるのと同じ位置づけ。
