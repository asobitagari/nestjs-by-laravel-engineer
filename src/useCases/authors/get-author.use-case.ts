import { Injectable } from '@nestjs/common';
import type { Author } from '../../domain/authors/author.js';
import { AuthorRepository } from '../../domain/authors/author.repository.js';
import { NotFoundError } from '../../domain/errors.js';

@Injectable()
export class GetAuthorUseCase {
  constructor(private readonly authors: AuthorRepository) {}

  async execute(id: number): Promise<Author> {
    const author = await this.authors.findById(id);
    if (!author) throw new NotFoundError();
    return author;
  }
}
