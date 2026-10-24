import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { LoginUseCase } from '../../useCases/auth/login.use-case.js';
import { LogoutUseCase } from '../../useCases/auth/logout.use-case.js';
import { RefreshTokenUseCase } from '../../useCases/auth/refresh-token.use-case.js';
import { RegisterUseCase } from '../../useCases/auth/register.use-case.js';
import { LoginRequest } from '../requests/auth/login.request.js';
import { LogoutRequest } from '../requests/auth/logout.request.js';
import { RefreshTokenRequest } from '../requests/auth/refresh-token.request.js';
import { RegisterRequest } from '../requests/auth/register.request.js';
import { UserResource } from '../resources/user.resource.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly registerUseCase: RegisterUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
  ) {}

  @Post('login')
  @HttpCode(200)
  login(@Body() request: LoginRequest) {
    return this.loginUseCase.execute(request);
  }

  @Post('register')
  @HttpCode(201)
  async register(@Body() request: RegisterRequest) {
    return UserResource.make(await this.registerUseCase.execute(request));
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Body() request: LogoutRequest) {
    await this.logoutUseCase.execute(request.token);
  }

  @Post('refresh-token')
  @HttpCode(200)
  refreshToken(@Body() request: RefreshTokenRequest) {
    return this.refreshTokenUseCase.execute(request.refreshToken);
  }
}
