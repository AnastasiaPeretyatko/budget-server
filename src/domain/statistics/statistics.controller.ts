import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { StatisticsByCategoryDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkspaceId } from 'src/common/decorators/workspace-id.decorator';

@UseGuards(JwtAuthGuard)
@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Post('/by-category')
  async getByCategory(
    @WorkspaceId() workspaceId: string,
    @Body() dto: StatisticsByCategoryDto,
  ) {
    return this.statisticsService.getByCategory(dto, workspaceId);
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
}
