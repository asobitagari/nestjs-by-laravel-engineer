import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type {
  Book,
  CreateBookInput,
  UpdateBookInput,
} from '../../domain/books/book.js';
import { BookRepository } from '../../domain/books/book.repository.js';
import { BookEntity } from '../entities/book.entity.js';

@Injectable()
export class TypeOrmBookRepository extends BookRepository {
  constructor(
    @InjectRepository(BookEntity)
    private readonly books: Repository<BookEntity>,
  ) {
    super();
  }

  async findAll(): Promise<Book[]> {
    const entities = await this.books.find({ order: { id: 'ASC' } });
    return entities.map(toDomain);
  }

  async findById(id: number): Promise<Book | null> {
    const entity = await this.books.findOneBy({ id });
    return entity ? toDomain(entity) : null;
  }

  async create(input: CreateBookInput): Promise<Book> {
    const entity = await this.books.save(this.books.create(input));
    return toDomain(entity);
  }

  async update(id: number, input: UpdateBookInput): Promise<Book | null> {
    const entity = await this.books.findOneBy({ id });
    if (!entity) return null;
    Object.assign(entity, input);
    return toDomain(await this.books.save(entity));
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.books.softDelete(id);
    return (result.affected ?? 0) > 0;
  }
}

function toDomain(entity: BookEntity): Book {
  return {
    id: entity.id,
    title: entity.title,
    authorId: entity.authorId,
    price: entity.price,
  };
}
