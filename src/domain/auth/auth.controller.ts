import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { ZodValidationPipe } from 'src/common/utils/zod-validation.pipe';

import { LoginSchema } from './dto/login.dto';
import type { LoginDto } from './dto/login.dto';
import { RegisterSchema } from './dto/register.dto';
import type { RegisterDto } from './dto/register.dto';

import { AuthService } from './auth.service';
import { type AuthRequest, JwtAuthGuard } from './jwt-auth.guard';

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
  @UsePipes(new ZodValidationPipe(RegisterSchema))
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('/refresh')
  refreshToken(@Body() refreshToken: { token: string }) {
    return this.authService.refreshToken(refreshToken.token);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/me')
  me(@Req() req: AuthRequest) {
    return this.authService.me(req.user.id);
  }
}
