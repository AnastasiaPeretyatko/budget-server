import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { BillingPeriodService } from './billing_period.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkspaceMemberGuard } from 'src/common/guards/workspace-member.guard';
import { WorkspaceId } from 'src/common/decorators/workspace-id.decorator';
import { BillingPeriodSummaryService } from './billing_period_summary.service';
import { CreateBillingPeriodDto, UpdateBillingPeriodDto } from './dto';

@UseGuards(JwtAuthGuard, WorkspaceMemberGuard)
@Controller('billing-period')
export class BillingPeriodController {
  constructor(
    private readonly billingPeriodService: BillingPeriodService,
    private readonly summaryService: BillingPeriodSummaryService,
  ) {}

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
    @Body() dto: UpdateBillingPeriodDto,
  ) {
    return this.billingPeriodService.update({ id, ...dto }, workspaceId);
  }

  @Delete(':id')
  async delete(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.billingPeriodService.delete(id, workspaceId);
  }

  // @Get('days-from-start')
  // async getDaysFromStart(@WorkspaceId() workspaceId: string) {
  //   const days = await this.billingPeriodService.getDaysFromStart(workspaceId);
  //   return { days };
  // }

  @Get('latest')
  async getLastActivePeriod(@WorkspaceId() workspaceId: string) {
    const period = await this.billingPeriodService.getLatestActive(workspaceId);
    return { data: period };
  }

  // history и :id/summary объявлены раньше :id, чтобы не пересекаться с ним
  @Get('history')
  async getHistory(@WorkspaceId() workspaceId: string) {
    return this.summaryService.getHistory(workspaceId);
  }

  @Get(':id/summary')
  async getSummary(
    @WorkspaceId() workspaceId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.summaryService.getSummary(id, workspaceId);
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
