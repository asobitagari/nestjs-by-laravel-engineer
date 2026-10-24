import { Module } from '@nestjs/common';
import { ProfileController } from '../http/controllers/profile.controller.js';
import { UpdatePasswordService } from '../services/profile/update-password.service.js';
import { UpdateProfileNameService } from '../services/profile/update-profile-name.service.js';
import { UsersModule } from './users.module.js';

@Module({
  imports: [UsersModule], // UserRepository（Controller・Service・Guard が使う）
  controllers: [ProfileController],
  providers: [UpdateProfileNameService, UpdatePasswordService],
})
export class ProfileModule {}
