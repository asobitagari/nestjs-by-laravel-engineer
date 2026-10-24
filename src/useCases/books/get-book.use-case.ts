import { Injectable } from '@nestjs/common';
import type { Book } from '../../domain/books/book.js';
import { BookRepository } from '../../domain/books/book.repository.js';
import { NotFoundError } from '../../domain/errors.js';

@Injectable()
export class GetBookUseCase {
  constructor(private readonly books: BookRepository) {}

  async execute(id: number): Promise<Book> {
    const book = await this.books.findById(id);
    if (!book) throw new NotFoundError();
    return book;
  }
}
