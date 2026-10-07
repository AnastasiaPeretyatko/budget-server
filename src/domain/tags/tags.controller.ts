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
import { WorkspaceMemberGuard } from 'src/common/guards/workspace-member.guard';
import { WorkspaceId } from 'src/common/decorators/workspace-id.decorator';
import { CreateTagDto, GetAllTagsDto, MergeTagsDto, UpdateTagDto } from './dto';

@Controller('tags')
@UseGuards(JwtAuthGuard, WorkspaceMemberGuard)
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post()
  async create(@WorkspaceId() workspaceId: string, @Body() dto: CreateTagDto) {
    return this.tagsService.create(dto, workspaceId);
  }

  @Post('merge')
  async merge(@WorkspaceId() workspaceId: string, @Body() dto: MergeTagsDto) {
    return this.tagsService.merge(dto, workspaceId);
  }

  @Post('cleanup')
  async cleanup(@WorkspaceId() workspaceId: string) {
    return this.tagsService.cleanup(workspaceId);
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
    @Query() query: GetAllTagsDto,
  ) {
    return this.tagsService.findAll(workspaceId, query);
  }
}
