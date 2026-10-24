import { Injectable } from '@nestjs/common';
import type { Author, UpdateAuthorInput } from '../../domain/authors/author.js';
import { AuthorRepository } from '../../domain/authors/author.repository.js';
import { NotFoundError } from '../../domain/errors.js';

@Injectable()
export class UpdateAuthorUseCase {
  constructor(private readonly authors: AuthorRepository) {}

  async execute(id: number, input: UpdateAuthorInput): Promise<Author> {
    const author = await this.authors.update(id, input);
    if (!author) throw new NotFoundError();
    return author;
  }
}
