import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkspaceMemberGuard } from 'src/common/guards/workspace-member.guard';
import { TemplateServise } from './template.service';
import { WorkspaceId } from 'src/common/decorators/workspace-id.decorator';
import {
  CreateTemplateDto,
  ParamsTemplateTemplatesDto,
  UpdateTemplateDto,
} from './dto';

@Controller('templates')
@UseGuards(JwtAuthGuard, WorkspaceMemberGuard)
export class TemplateController {
  constructor(private readonly templateService: TemplateServise) {}

  @Get()
  async getAll(
    @WorkspaceId() workspaceId: string,
    @Query() params: ParamsTemplateTemplatesDto,
  ) {
    return await this.templateService.findAll(workspaceId, params);
  }

  @Get(':id')
  async getByPK(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return await this.templateService.getOne(id, workspaceId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTemplate(
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateTemplateDto,
  ) {
    return await this.templateService.create(dto, workspaceId);
  }

  @Patch(':id')
  async updateByPk(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() body: UpdateTemplateDto,
  ) {
    return await this.templateService.update(id, body, workspaceId);
  }

  @Delete(':id')
  async delete(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return await this.templateService.archive(id, workspaceId);
  }
}
