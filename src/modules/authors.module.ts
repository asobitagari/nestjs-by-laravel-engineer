import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorRepository } from '../domain/authors/author.repository.js';
import { AuthorsController } from '../http/controllers/authors.controller.js';
import { AuthorEntity } from '../infrastructure/entities/author.entity.js';
import { TypeOrmAuthorRepository } from '../infrastructure/repositories/typeorm-author.repository.js';
import { CreateAuthorUseCase } from '../useCases/authors/create-author.use-case.js';
import { DeleteAuthorUseCase } from '../useCases/authors/delete-author.use-case.js';
import { GetAuthorUseCase } from '../useCases/authors/get-author.use-case.js';
import { GetAuthorsUseCase } from '../useCases/authors/get-authors.use-case.js';
import { UpdateAuthorUseCase } from '../useCases/authors/update-author.use-case.js';
import { UsersModule } from './users.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([AuthorEntity]), UsersModule],
  controllers: [AuthorsController],
  providers: [
    { provide: AuthorRepository, useClass: TypeOrmAuthorRepository }, // ← $this->app->bind()
    GetAuthorsUseCase,
    GetAuthorUseCase,
    CreateAuthorUseCase,
    UpdateAuthorUseCase,
    DeleteAuthorUseCase,
  ],
  exports: [AuthorRepository], // BooksModule が著者の存在確認に使う
})
export class AuthorsModule {}
