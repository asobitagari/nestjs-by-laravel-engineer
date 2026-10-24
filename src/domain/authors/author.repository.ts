import type { Author, CreateAuthorInput, UpdateAuthorInput } from './author.js';

export abstract class AuthorRepository {
  abstract findAll(): Promise<Author[]>;
  abstract findById(id: number): Promise<Author | null>;
  abstract create(input: CreateAuthorInput): Promise<Author>;
  abstract update(id: number, input: UpdateAuthorInput): Promise<Author | null>;
  abstract delete(id: number): Promise<boolean>;
}
