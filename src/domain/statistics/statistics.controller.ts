import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { PlanStatisticsService } from './plan-statistics.service';
import { PlanStatisticsQueryDto, StatisticsByCategoryDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkspaceId } from 'src/common/decorators/workspace-id.decorator';

@UseGuards(JwtAuthGuard)
@Controller('statistics')
export class StatisticsController {
  constructor(
    private readonly statisticsService: StatisticsService,
    private readonly planStatisticsService: PlanStatisticsService,
  ) {}

  @Post('/by-category')
  async getByCategory(
    @WorkspaceId() workspaceId: string,
    @Body() dto: StatisticsByCategoryDto,
  ) {
    return this.statisticsService.getByCategory(dto, workspaceId);
  }

  @Get('/plan')
  async getPlan(
    @WorkspaceId() workspaceId: string,
    @Query() query: PlanStatisticsQueryDto,
  ) {
    return this.planStatisticsService.getPlan(workspaceId, query.range);
  }

  @Get('/total-spent')
  async getTotalSpent(@WorkspaceId() workspaceId: string) {
    return this.statisticsService.getTotalSpent(workspaceId);
  }

  @Get('/activity')
  async getActivity(@WorkspaceId() workspaceId: string) {
    return this.statisticsService.getActivity(workspaceId);
  }

  @Get('/top-expenses')
  async getTopExpenses(@WorkspaceId() workspaceId: string) {
    return this.statisticsService.getTopExpenses(workspaceId);
  }

  @Get('/dashboard')
  async getDashboardSummary(@WorkspaceId() workspaceId: string) {
    return this.statisticsService.getDashboardSummary(workspaceId);
  }

  @Get('/balance-history')
  async getBalanceHistory(
    @WorkspaceId() workspaceId: string,
    @Query('accountId') accountId: string,
  ) {
    return this.statisticsService.getBalanceHistory(accountId, workspaceId);
  }
}
