import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type {
  Author,
  CreateAuthorInput,
  UpdateAuthorInput,
} from '../../domain/authors/author.js';
import { AuthorRepository } from '../../domain/authors/author.repository.js';
import { AuthorEntity } from '../entities/author.entity.js';

@Injectable()
export class TypeOrmAuthorRepository extends AuthorRepository {
  constructor(
    @InjectRepository(AuthorEntity)
    private readonly authors: Repository<AuthorEntity>,
  ) {
    super();
  }

  async findAll(): Promise<Author[]> {
    const entities = await this.authors.find({ order: { id: 'ASC' } });
    return entities.map(toDomain);
  }

  async findById(id: number): Promise<Author | null> {
    const entity = await this.authors.findOneBy({ id });
    return entity ? toDomain(entity) : null;
  }

  async create(input: CreateAuthorInput): Promise<Author> {
    const entity = await this.authors.save(
      this.authors.create({ name: input.name, email: input.email ?? null }),
    );
    return toDomain(entity);
  }

  async update(id: number, input: UpdateAuthorInput): Promise<Author | null> {
    const entity = await this.authors.findOneBy({ id });
    if (!entity) return null;
    entity.name = input.name;
    entity.email = input.email ?? null;
    return toDomain(await this.authors.save(entity));
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.authors.softDelete(id);
    return (result.affected ?? 0) > 0;
  }
}

function toDomain(entity: AuthorEntity): Author {
  return { id: entity.id, name: entity.name, email: entity.email };
}
