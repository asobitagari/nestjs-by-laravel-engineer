import { Injectable } from '@nestjs/common';
import type { Book } from '../../domain/books/book.js';
import { BookRepository } from '../../domain/books/book.repository.js';

@Injectable()
export class GetBooksUseCase {
  constructor(private readonly books: BookRepository) {}

  execute(): Promise<Book[]> {
    return this.books.findAll();
  }
}
