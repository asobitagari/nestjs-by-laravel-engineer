import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class UpdatePasswordRequest {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}
