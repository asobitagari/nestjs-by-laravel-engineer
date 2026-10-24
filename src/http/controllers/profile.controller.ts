import {
  Body,
  Controller,
  Get,
  HttpCode,
  Put,
  UseGuards,
} from '@nestjs/common';
import { NotFoundError } from '../../domain/errors.js';
import { UserRepository } from '../../domain/users/user.repository.js';
import { UpdatePasswordService } from '../../services/profile/update-password.service.js';
import { UpdateProfileNameService } from '../../services/profile/update-profile-name.service.js';
import { CurrentUser } from '../decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import type { AuthUser } from '../guards/jwt-auth.guard.js';
import { UpdatePasswordRequest } from '../requests/profile/update-password.request.js';
import { UpdateProfileRequest } from '../requests/profile/update-profile.request.js';
import { UserResource } from '../resources/user.resource.js';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(
    private readonly users: UserRepository,
    private readonly updateProfileName: UpdateProfileNameService,
    private readonly updatePassword: UpdatePasswordService,
  ) {}

  // ルールのない取得なので Service を作らず Repository を直接呼ぶ
  @Get()
  async show(@CurrentUser() user: AuthUser) {
    const found = await this.users.findById(user.id);
    if (!found) throw new NotFoundError();
    return UserResource.make(found);
  }

  @Put()
  async update(
    @CurrentUser() user: AuthUser,
    @Body() request: UpdateProfileRequest,
  ) {
    return UserResource.make(
      await this.updateProfileName.execute(user.id, request.name),
    );
  }

  @Put('password')
  @HttpCode(204)
  async password(
    @CurrentUser() user: AuthUser,
    @Body() request: UpdatePasswordRequest,
  ) {
    await this.updatePassword.execute(
      user.id,
      request.currentPassword,
      request.newPassword,
    );
  }
}
