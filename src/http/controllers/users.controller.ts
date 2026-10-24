import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { DeleteUserUseCase } from '../../useCases/users/delete-user.use-case.js';
import { GetUserUseCase } from '../../useCases/users/get-user.use-case.js';
import { GetUsersUseCase } from '../../useCases/users/get-users.use-case.js';
import { UpdateUserUseCase } from '../../useCases/users/update-user.use-case.js';
import { AdminGuard } from '../guards/admin.guard.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { UpdateUserRequest } from '../requests/users/update-user.request.js';
import { UserResource } from '../resources/user.resource.js';

// ユーザーの作成は POST /api/auth/register で行う（store はない）
@Controller('users')
export class UsersController {
  constructor(
    private readonly getUsers: GetUsersUseCase,
    private readonly getUser: GetUserUseCase,
    private readonly updateUser: UpdateUserUseCase,
    private readonly deleteUser: DeleteUserUseCase,
  ) {}

  @Get()
  async index() {
    return UserResource.collection(await this.getUsers.execute());
  }

  @Get(':id')
  async show(@Param('id', ParseIntPipe) id: number) {
    return UserResource.make(await this.getUser.execute(id));
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() request: UpdateUserRequest,
  ) {
    return UserResource.make(await this.updateUser.execute(id, request));
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(204)
  async destroy(@Param('id', ParseIntPipe) id: number) {
    await this.deleteUser.execute(id);
  }
}
