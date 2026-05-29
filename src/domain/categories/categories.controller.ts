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
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkspaceMemberGuard } from 'src/common/guards/workspace-member.guard';
import { WorkspaceId } from 'src/common/decorators/workspace-id.decorator';

type Category = { name: string; description?: string };

@Controller('categories')
@UseGuards(JwtAuthGuard, WorkspaceMemberGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  async create(@WorkspaceId() workspaceId: string, @Body() dto: Category) {
    return await this.categoriesService.create(dto, workspaceId);
  }

  @Patch(':id')
  async update(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: Category,
  ) {
    return await this.categoriesService.update({ id, ...dto }, workspaceId);
  }

  @Delete(':id')
  async delete(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return await this.categoriesService.delete(id, workspaceId);
  }

  @Get('all')
  async getAll(
    @WorkspaceId() workspaceId: string,
    @Query('search') search?: string,
  ) {
    return await this.categoriesService.getAll(workspaceId, search);
  }
}
