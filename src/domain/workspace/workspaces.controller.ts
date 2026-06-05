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
import { CreateWorkspaceDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthRequest } from '../auth/jwt-auth.guard';
import { WorkspaceId } from 'src/common/decorators/workspace-id.decorator';

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

  @Get('/current')
  async getOne(@WorkspaceId() workspaceId: string) {
    return await this.workspaceService.getOne(workspaceId);
  }

  @Post('/invite')
  async inviteUser(
    @WorkspaceId() workspaceId: string,
    @Body() dto: { emails: string[] },
  ) {
    return await this.workspaceService.inviteUser({ workspaceId, ...dto });
  }

  @Delete('/users/:userId')
  async detachUser(
    @WorkspaceId() workspaceId: string,
    @Param('userId') userId: string,
  ) {
    return await this.workspaceService.detachUser({ workspaceId, userId });
  }
}
