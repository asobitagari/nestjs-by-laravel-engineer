import type { Book, CreateBookInput, UpdateBookInput } from './book.js';

export abstract class BookRepository {
  abstract findAll(): Promise<Book[]>;
  abstract findById(id: number): Promise<Book | null>;
  abstract create(input: CreateBookInput): Promise<Book>;
  abstract update(id: number, input: UpdateBookInput): Promise<Book | null>;
  abstract delete(id: number): Promise<boolean>;
}
