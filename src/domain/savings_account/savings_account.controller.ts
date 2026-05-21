import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SavingAccountService } from './savings_account.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkspaceId } from 'src/common/decorators/workspace-id.decorator';
import type { CreateSavingAccountDto } from './types';

@UseGuards(JwtAuthGuard)
@Controller('saving')
export class SavingAccountController {
  constructor(private readonly savingAccountService: SavingAccountService) {}

  @Post()
  async create(
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateSavingAccountDto,
  ) {
    return await this.savingAccountService.create(dto, workspaceId);
  }

  @Patch(':id')
  async update(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: CreateSavingAccountDto,
  ) {
    return await this.savingAccountService.update({ id, ...dto }, workspaceId);
  }

  @Delete(':id')
  async delete(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return await this.savingAccountService.delete(id, workspaceId);
  }

  @Get()
  async getAll(@WorkspaceId() workspaceId: string) {
    return await this.savingAccountService.getAll(workspaceId);
  }
}
