import { Injectable } from '@nestjs/common';
import { BookRepository } from '../../domain/books/book.repository.js';
import { NotFoundError } from '../../domain/errors.js';

@Injectable()
export class DeleteBookUseCase {
  constructor(private readonly books: BookRepository) {}

  async execute(id: number): Promise<void> {
    if (!(await this.books.delete(id))) throw new NotFoundError();
  }
}
