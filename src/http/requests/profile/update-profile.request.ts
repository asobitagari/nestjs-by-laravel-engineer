import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// email・isAdmin はルールにないので whitelist で捨てられる
export class UpdateProfileRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}
