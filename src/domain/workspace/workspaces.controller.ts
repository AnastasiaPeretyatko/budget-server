import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { WorkspaceService } from './workspaces.service';
import { CreateWorkspaceDto, InviteUsersDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkspaceMemberGuard } from 'src/common/guards/workspace-member.guard';
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
  async inviteUser(@Req() req: AuthRequest, @Body() dto: InviteUsersDto) {
    return await this.workspaceService.inviteUser(req.user.id, dto);
  }

  @Get(':id/members')
  @UseGuards(WorkspaceMemberGuard)
  async getMembers(@Param('id') workspaceId: string) {
    return await this.workspaceService.getMembers(workspaceId);
  }

  @Delete(':id/members/:userId')
  @UseGuards(WorkspaceMemberGuard)
  async removeMember(
    @Req() req: AuthRequest,
    @Param('id') workspaceId: string,
    @Param('userId') userId: string,
  ) {
    return await this.workspaceService.removeMember(
      req.user.id,
      workspaceId,
      userId,
    );
  }
}
