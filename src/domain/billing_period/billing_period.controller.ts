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
import { BillingPeriodService } from './billing_period.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkspaceId } from 'src/common/decorators/workspace-id.decorator';
import type { CreateBillingPeriodDto, UpdateBillingPeriodDto } from './types';

@UseGuards(JwtAuthGuard)
@Controller('billing-period')
export class BillingPeriodController {
  constructor(private readonly billingPeriodService: BillingPeriodService) {}

  @Post()
  async create(
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateBillingPeriodDto,
  ) {
    return this.billingPeriodService.create(dto, workspaceId);
  }

  @Patch(':id')
  async update(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: Omit<UpdateBillingPeriodDto, 'id'>,
  ) {
    return this.billingPeriodService.update({ id, ...dto }, workspaceId);
  }

  @Delete(':id')
  async delete(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.billingPeriodService.delete(id, workspaceId);
  }

  @Get('days-from-start')
  async getDaysFromStart(@WorkspaceId() workspaceId: string) {
    const days = await this.billingPeriodService.getDaysFromStart(workspaceId);
    return { days };
  }

  @Get(':id')
  async getOne(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.billingPeriodService.getOne(id, workspaceId);
  }

  @Get()
  async getAll(@WorkspaceId() workspaceId: string) {
    return this.billingPeriodService.getAll(workspaceId);
  }
}
