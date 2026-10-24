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
import { CreateAuthorUseCase } from '../../useCases/authors/create-author.use-case.js';
import { DeleteAuthorUseCase } from '../../useCases/authors/delete-author.use-case.js';
import { GetAuthorUseCase } from '../../useCases/authors/get-author.use-case.js';
import { GetAuthorsUseCase } from '../../useCases/authors/get-authors.use-case.js';
import { UpdateAuthorUseCase } from '../../useCases/authors/update-author.use-case.js';
import { AdminGuard } from '../guards/admin.guard.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { CreateAuthorRequest } from '../requests/authors/create-author.request.js';
import { UpdateAuthorRequest } from '../requests/authors/update-author.request.js';
import { AuthorResource } from '../resources/author.resource.js';

@Controller('authors')
export class AuthorsController {
  constructor(
    private readonly getAuthors: GetAuthorsUseCase,
    private readonly getAuthor: GetAuthorUseCase,
    private readonly createAuthor: CreateAuthorUseCase,
    private readonly updateAuthor: UpdateAuthorUseCase,
    private readonly deleteAuthor: DeleteAuthorUseCase,
  ) {}

  @Get()
  async index() {
    return AuthorResource.collection(await this.getAuthors.execute());
  }

  @Get(':id')
  async show(@Param('id', ParseIntPipe) id: number) {
    return AuthorResource.make(await this.getAuthor.execute(id));
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(201)
  async store(@Body() request: CreateAuthorRequest) {
    return AuthorResource.make(await this.createAuthor.execute(request));
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() request: UpdateAuthorRequest,
  ) {
    return AuthorResource.make(await this.updateAuthor.execute(id, request));
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(204)
  async destroy(@Param('id', ParseIntPipe) id: number) {
    await this.deleteAuthor.execute(id);
  }
}
