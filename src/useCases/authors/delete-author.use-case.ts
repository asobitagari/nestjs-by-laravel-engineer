import { Injectable } from '@nestjs/common';
import { AuthorRepository } from '../../domain/authors/author.repository.js';
import { NotFoundError } from '../../domain/errors.js';

@Injectable()
export class DeleteAuthorUseCase {
  constructor(private readonly authors: AuthorRepository) {}

  async execute(id: number): Promise<void> {
    if (!(await this.authors.delete(id))) throw new NotFoundError();
  }
}
