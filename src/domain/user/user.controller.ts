import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { type AuthRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  async getMe(@Req() req: AuthRequest) {
    return this.userService.findOneBy({ id: req.user.id });
  }

  @Patch('me')
  async updateMe(@Req() req: AuthRequest, @Body() dto: UpdateUserDto) {
    return this.userService.update(req.user.id, dto);
  }
}
