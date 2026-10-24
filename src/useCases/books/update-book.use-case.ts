import { Injectable } from '@nestjs/common';
import { AuthorRepository } from '../../domain/authors/author.repository.js';
import type { Book, UpdateBookInput } from '../../domain/books/book.js';
import { BookRepository } from '../../domain/books/book.repository.js';
import { AuthorNotFoundError, NotFoundError } from '../../domain/errors.js';

@Injectable()
export class UpdateBookUseCase {
  constructor(
    private readonly books: BookRepository,
    private readonly authors: AuthorRepository,
  ) {}

  async execute(id: number, input: UpdateBookInput): Promise<Book> {
    if (!(await this.authors.findById(input.authorId)))
      throw new AuthorNotFoundError();
    const book = await this.books.update(id, input);
    if (!book) throw new NotFoundError();
    return book;
  }
}
