import { Injectable } from '@nestjs/common';
import { AuthorRepository } from '../../domain/authors/author.repository.js';
import type { Book, CreateBookInput } from '../../domain/books/book.js';
import { BookRepository } from '../../domain/books/book.repository.js';
import { AuthorNotFoundError } from '../../domain/errors.js';

@Injectable()
export class CreateBookUseCase {
  constructor(
    private readonly books: BookRepository,
    private readonly authors: AuthorRepository,
  ) {}

  // exists:authors,id 相当。DB を見る判定なので Request ではなく UseCase で行う
  async execute(input: CreateBookInput): Promise<Book> {
    if (!(await this.authors.findById(input.authorId)))
      throw new AuthorNotFoundError();
    return this.books.create(input);
  }
}
