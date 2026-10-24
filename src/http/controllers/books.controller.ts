import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CreateBookUseCase } from '../../useCases/books/create-book.use-case.js';
import { DeleteBookUseCase } from '../../useCases/books/delete-book.use-case.js';
import { GetBookUseCase } from '../../useCases/books/get-book.use-case.js';
import { GetBooksUseCase } from '../../useCases/books/get-books.use-case.js';
import { UpdateBookUseCase } from '../../useCases/books/update-book.use-case.js';
import { AdminGuard } from '../guards/admin.guard.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { CreateBookRequest } from '../requests/books/create-book.request.js';
import { UpdateBookRequest } from '../requests/books/update-book.request.js';
import { BookResource } from '../resources/book.resource.js';

@Controller('books')
export class BooksController {
  constructor(
    private readonly getBooks: GetBooksUseCase,
    private readonly getBook: GetBookUseCase,
    private readonly createBook: CreateBookUseCase,
    private readonly updateBook: UpdateBookUseCase,
    private readonly deleteBook: DeleteBookUseCase,
  ) {}

  @Get()
  async index() {
    return BookResource.collection(await this.getBooks.execute());
  }

  @Get(':id')
  async show(@Param('id', ParseIntPipe) id: number) {
    return BookResource.make(await this.getBook.execute(id));
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(201)
  async store(@Body() request: CreateBookRequest) {
    return BookResource.make(await this.createBook.execute(request));
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() request: UpdateBookRequest,
  ) {
    return BookResource.make(await this.updateBook.execute(id, request));
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(204)
  async destroy(@Param('id', ParseIntPipe) id: number) {
    await this.deleteBook.execute(id);
  }
}
