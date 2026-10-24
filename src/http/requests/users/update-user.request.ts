import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateUserRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsEmail()
  email: string;

  // 省略時は false（権限を外す）
  @IsOptional()
  @IsBoolean()
  isAdmin: boolean = false;
}
