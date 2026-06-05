import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { TransitionEntity } from '../transition/transition.entity';
import {
  CategoryStatisticsItem,
  StatisticsByCategoryDto,
  StatisticsByCategoryResponse,
  UncategorizedStatistics,
} from './dto';
import { BillingPeriodService } from '../billing_period/billing_period.service';

interface CategoryRow {
  categoryId: string | null;
  categoryName: string | null;
  total: string;
  count: string;
}

export interface ActivityDay {
  date: string;
  count: number;
}

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(TransitionEntity)
    private readonly transitionRepository: Repository<TransitionEntity>,
    private readonly billingPeriodService: BillingPeriodService,
  ) {}

  async getByCategory(
    dto: StatisticsByCategoryDto,
    workspaceId: string,
  ): Promise<StatisticsByCategoryResponse> {
    const qb = this.transitionRepository
      .createQueryBuilder('transition')
      .leftJoin('transition.category', 'category')
      .select('transition.categoryId', 'categoryId')
      .addSelect('category.name', 'categoryName')
      .addSelect('COALESCE(SUM(transition.amount), 0)', 'total')
      .addSelect('COUNT(transition.id)', 'count')
      .where('transition.workspaceId = :workspaceId', { workspaceId })
      .andWhere('transition.fromAccountId IS NOT NULL')
      .andWhere('transition.toAccountId IS NULL')
      .groupBy('transition.categoryId')
      .addGroupBy('category.name');

    this.applyAccountFilter(qb, dto.accountId);
    await this.applyDateFilter(qb, workspaceId, dto.date);

    const rows = await qb.getRawMany<CategoryRow>();

    const totalSpent = rows.reduce((acc, row) => acc + Number(row.total), 0);

    const items: CategoryStatisticsItem[] = [];
    let uncategorized: UncategorizedStatistics | null = null;

    for (const row of rows) {
      const total = Number(row.total);
      const percent =
        totalSpent > 0 ? Math.round((total / totalSpent) * 10000) / 100 : 0;

      if (row.categoryId) {
        items.push({
          categoryId: row.categoryId,
          categoryName: row.categoryName ?? '',
          total: total.toFixed(2),
          count: Number(row.count),
          percent,
        });
      } else {
        uncategorized = {
          total: total.toFixed(2),
          count: Number(row.count),
          percent,
        };
      }
    }

    items.sort((a, b) => Number(b.total) - Number(a.total));

    return {
      totalSpent: totalSpent.toFixed(2),
      items,
      uncategorized,
    };
  }

  async getActivity(workspaceId: string): Promise<ActivityDay[]> {
    const today = new Date();
    const yearAgo = new Date(today);
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);
    yearAgo.setDate(yearAgo.getDate() + 1);

    const from = yearAgo.toISOString().slice(0, 10);
    const to = today.toISOString().slice(0, 10);

    const rows = await this.transitionRepository
      .createQueryBuilder('t')
      .select("TO_CHAR(t.date, 'YYYY-MM-DD')", 'date')
      .addSelect('COUNT(t.id)::int', 'count')
      .where('t.workspaceId = :workspaceId', { workspaceId })
      .andWhere('t.date BETWEEN :from AND :to', { from, to })
      .groupBy("TO_CHAR(t.date, 'YYYY-MM-DD')")
      .orderBy('date', 'ASC')
      .getRawMany<{ date: string; count: number }>();

    const map = new Map(rows.map((r) => [r.date, r.count]));

    const result: ActivityDay[] = [];
    const cursor = new Date(yearAgo);
    while (cursor <= today) {
      const key = cursor.toISOString().slice(0, 10);
      result.push({ date: key, count: map.get(key) ?? 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    return result;
  }

  private applyAccountFilter(
    qb: SelectQueryBuilder<TransitionEntity>,
    accountId?: string,
  ): void {
    if (accountId) {
      qb.andWhere('transition.fromAccountId = :accountId', { accountId });
    }
  }

  private async applyDateFilter(
    qb: SelectQueryBuilder<TransitionEntity>,
    workspaceId: string,
    date?: StatisticsByCategoryDto['date'],
  ): Promise<void> {
    if (date?.between) {
      qb.andWhere('transition.date BETWEEN :from AND :to', {
        from: date.between[0],
        to: date.between[1],
      });
      return;
    }

    const period = await this.billingPeriodService.getLatestActive(workspaceId);
    if (!period) return;

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    if (period.startDay) {
      const year = today.getFullYear();
      const month = today.getMonth();
      const day = today.getDate();

      const from =
        day >= period.startDay
          ? new Date(year, month, period.startDay)
          : new Date(year, month - 1, period.startDay);

      qb.andWhere('transition.date BETWEEN :from AND :to', {
        from: from.toISOString().slice(0, 10),
        to: todayStr,
      });
      return;
    }

    if (period.startDate) {
      qb.andWhere('transition.date BETWEEN :from AND :to', {
        from: period.startDate,
        to: todayStr,
      });
    }
  }
}
