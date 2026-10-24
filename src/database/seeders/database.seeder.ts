import {
  DataSource,
  DeepPartial,
  FindOptionsWhere,
  ObjectLiteral,
  Repository,
} from 'typeorm';
import { AuthorEntity } from '../../infrastructure/entities/author.entity.js';
import { BookEntity } from '../../infrastructure/entities/book.entity.js';
import { UserEntity } from '../../infrastructure/entities/user.entity.js';
import { hashPassword } from '../../shared/password.js';

const USERS = [
  {
    name: '管理者君',
    email: 'admin@example.com',
    password: 'password',
    isAdmin: true,
  },
  {
    name: '一般君',
    email: 'normal@example.com',
    password: 'password',
    isAdmin: false,
  },
];

const AUTHORS = [
  { name: '夏目漱石', email: 'soseki@example.com' },
  { name: '芥川龍之介', email: 'akutagawa@example.com' },
  { name: '太宰治', email: 'dazai@example.com' },
];

const BOOKS = [
  { title: 'こころ', author: '夏目漱石', price: 600 },
  { title: '坊っちゃん', author: '夏目漱石', price: 500 },
  { title: '羅生門', author: '芥川龍之介', price: 400 },
  { title: '蜘蛛の糸', author: '芥川龍之介', price: 350 },
  { title: '人間失格', author: '太宰治', price: 550 },
];

// DatabaseSeeder 相当。firstOrCreate で投入するので何度流しても重複しない
export class DatabaseSeeder {
  static async run(
    dataSource: DataSource,
    bcryptRounds: number,
  ): Promise<void> {
    const users = dataSource.getRepository(UserEntity);
    for (const { password, ...user } of USERS) {
      await firstOrCreate(users, { email: user.email }, async () => ({
        ...user,
        password: await hashPassword(password, bcryptRounds),
      }));
    }

    const authors = dataSource.getRepository(AuthorEntity);
    const authorIds = new Map<string, number>();
    for (const author of AUTHORS) {
      const saved = await firstOrCreate(
        authors,
        { name: author.name },
        () => author,
      );
      authorIds.set(author.name, saved.id);
    }

    const books = dataSource.getRepository(BookEntity);
    for (const { author, ...book } of BOOKS) {
      await firstOrCreate(books, { title: book.title }, () => ({
        ...book,
        authorId: authorIds.get(author)!,
      }));
    }
  }
}

async function firstOrCreate<T extends ObjectLiteral>(
  repository: Repository<T>,
  where: FindOptionsWhere<T>,
  attributes: () => DeepPartial<T> | Promise<DeepPartial<T>>,
): Promise<T> {
  const found = await repository.findOneBy(where);
  if (found) return found;
  return repository.save(repository.create(await attributes()));
}
