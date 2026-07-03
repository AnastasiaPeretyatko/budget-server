import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TagsService } from './tags.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkspaceId } from 'src/common/decorators/workspace-id.decorator';
import { CreateTagDto, UpdateTagDto } from './dto';

@Controller('tags')
@UseGuards(JwtAuthGuard)
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post()
  async create(@WorkspaceId() workspaceId: string, @Body() dto: CreateTagDto) {
    return this.tagsService.create(dto, workspaceId);
  }

  @Patch(':id')
  async update(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTagDto,
  ) {
    return this.tagsService.update(id, dto, workspaceId);
  }

  @Delete(':id')
  async delete(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.tagsService.delete(id, workspaceId);
  }

  @Get('all')
  async getAll(
    @WorkspaceId() workspaceId: string,
    @Query('search') search?: string,
  ) {
    return this.tagsService.findAll(workspaceId, search);
  }
}
