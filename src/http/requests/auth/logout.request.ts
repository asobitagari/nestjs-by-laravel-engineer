import { IsNotEmpty, IsString } from 'class-validator';

export class LogoutRequest {
  @IsString()
  @IsNotEmpty()
  token: string;
}
