import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { WorkspaceService } from './workspaces.service';
import { CreateWorkspaceDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthRequest } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('workspace')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Post()
  async create(@Req() req: AuthRequest, @Body() dto: CreateWorkspaceDto) {
    return await this.workspaceService.create(req.user.id, dto);
  }

  @Get()
  async getAll(@Req() req: AuthRequest) {
    return await this.workspaceService.getAll(req.user.id);
  }

  @Post('/invite')
  async inviteUser(@Body() dto: { workspaceId: string; emails: string[] }) {
    return await this.workspaceService.inviteUser(dto);
  }
}
