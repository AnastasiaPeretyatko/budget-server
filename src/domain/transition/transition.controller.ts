import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { TransitionService } from './transition.service';
import { CreateTransitionDto, FindTransitionsDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkspaceMemberGuard } from 'src/common/guards/workspace-member.guard';
import { WorkspaceId } from 'src/common/decorators/workspace-id.decorator';

@Controller('transition')
@UseGuards(JwtAuthGuard, WorkspaceMemberGuard)
export class TransitionController {
  constructor(private readonly transitionService: TransitionService) {}

  @Post()
  async createTransition(
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateTransitionDto,
  ) {
    return this.transitionService.create(dto, workspaceId);
  }

  @Post('/all')
  async getAllTransition(
    @WorkspaceId() workspaceId: string,
    @Body() dto: FindTransitionsDto,
  ) {
    return this.transitionService.findAllTransition(dto, workspaceId);
  }

  @Get(':id')
  async getOneTransition(@Param('id') id: string) {
    return this.transitionService.findOneBy({ id });
  }
}
