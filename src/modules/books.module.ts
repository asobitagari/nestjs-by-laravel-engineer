import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookRepository } from '../domain/books/book.repository.js';
import { BooksController } from '../http/controllers/books.controller.js';
import { BookEntity } from '../infrastructure/entities/book.entity.js';
import { TypeOrmBookRepository } from '../infrastructure/repositories/typeorm-book.repository.js';
import { CreateBookUseCase } from '../useCases/books/create-book.use-case.js';
import { DeleteBookUseCase } from '../useCases/books/delete-book.use-case.js';
import { GetBookUseCase } from '../useCases/books/get-book.use-case.js';
import { GetBooksUseCase } from '../useCases/books/get-books.use-case.js';
import { UpdateBookUseCase } from '../useCases/books/update-book.use-case.js';
import { AuthorsModule } from './authors.module.js';
import { UsersModule } from './users.module.js';

@Module({
  // AuthorsModule: 著者の存在確認（AuthorRepository）、UsersModule: Guard
  imports: [TypeOrmModule.forFeature([BookEntity]), AuthorsModule, UsersModule],
  controllers: [BooksController],
  providers: [
    { provide: BookRepository, useClass: TypeOrmBookRepository }, // ← $this->app->bind()
    GetBooksUseCase,
    GetBookUseCase,
    CreateBookUseCase,
    UpdateBookUseCase,
    DeleteBookUseCase,
  ],
  exports: [BookRepository],
})
export class BooksModule {}
