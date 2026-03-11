import { Body, Controller, Post, UsePipes } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { ZodValidationPipe } from 'src/common/utils/zod-validation.pipe';

import { LoginSchema } from './dto/login.dto';
import type { LoginDto } from './dto/login.dto';

import { AuthService } from './auth.service';

@ApiTags('Авторизация')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('/login')
  @UsePipes(new ZodValidationPipe(LoginSchema))
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('/register')
  @UsePipes(new ZodValidationPipe(LoginSchema))
  async register(@Body() dto: LoginDto) {
    return this.authService.register(dto);
  }
}
