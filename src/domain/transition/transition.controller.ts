import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TransitionService } from './transition.service';
import {
  CreateTransitionDto,
  FindTransitionsDto,
  UpdateTransitionDto,
} from './dto';
import { JwtAuthGuard, type AuthRequest } from '../auth/jwt-auth.guard';
import { WorkspaceId } from 'src/common/decorators/workspace-id.decorator';

@Controller('transition')
@UseGuards(JwtAuthGuard)
export class TransitionController {
  constructor(private readonly transitionService: TransitionService) {}

  @Post()
  async createTransition(
    @Req() req: AuthRequest,
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateTransitionDto,
  ) {
    return this.transitionService.create(dto, workspaceId, req.user.id);
  }

  @Post('/all')
  async getAllTransition(
    @WorkspaceId() workspaceId: string,
    @Body() dto: FindTransitionsDto,
  ) {
    return this.transitionService.findAllTransition(dto, workspaceId);
  }

  @Patch(':id')
  async updateTransition(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTransitionDto,
  ) {
    return this.transitionService.update(id, dto, workspaceId);
  }

  @Get(':id')
  async getOneTransition(@Param('id') id: string) {
    return this.transitionService.findOneBy({ id });
  }

  @Patch(':id')
  async updateTransition(
    @Param('id') id: string,
    @Body() dto: UpdateTransitionDto,
  ) {
    return this.transitionService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async deleteTransition(@Param('id') id: string) {
    return this.transitionService.remove(id);
  }
}
