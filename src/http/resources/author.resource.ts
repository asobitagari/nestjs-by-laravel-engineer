import type { Author } from '../../domain/authors/author.js';

export class AuthorResource {
  static make(author: Author) {
    return { id: author.id, name: author.name, email: author.email };
  }

  static collection(authors: Author[]) {
    return authors.map((author) => AuthorResource.make(author));
  }
}
