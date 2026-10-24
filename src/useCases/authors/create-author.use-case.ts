import { Injectable } from '@nestjs/common';
import type { Author, CreateAuthorInput } from '../../domain/authors/author.js';
import { AuthorRepository } from '../../domain/authors/author.repository.js';

@Injectable()
export class CreateAuthorUseCase {
  constructor(private readonly authors: AuthorRepository) {}

  execute(input: CreateAuthorInput): Promise<Author> {
    return this.authors.create(input);
  }
}
