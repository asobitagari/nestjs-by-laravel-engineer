import { Injectable } from '@nestjs/common';
import type { Author } from '../../domain/authors/author.js';
import { AuthorRepository } from '../../domain/authors/author.repository.js';

@Injectable()
export class GetAuthorsUseCase {
  constructor(private readonly authors: AuthorRepository) {}

  execute(): Promise<Author[]> {
    return this.authors.findAll();
  }
}
