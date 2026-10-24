import type { Book } from '../../domain/books/book.js';

export class BookResource {
  static make(book: Book) {
    return {
      id: book.id,
      title: book.title,
      authorId: book.authorId,
      price: book.price,
    };
  }

  static collection(books: Book[]) {
    return books.map((book) => BookResource.make(book));
  }
}
