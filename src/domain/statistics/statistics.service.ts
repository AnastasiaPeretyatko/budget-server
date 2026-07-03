import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import {
  TransactionType,
  TransitionEntity,
} from '../transition/transition.entity';
import { SavingAccountEntity } from '../savings_account/savings_account.entity';
import {
  CategoryStatisticsItem,
  StatisticsByCategoryDto,
  StatisticsByCategoryResponse,
  UncategorizedStatistics,
} from './dto';
import { BillingPeriodService } from '../billing_period/billing_period.service';
import { BillingPeriodEntity } from '../billing_period/billing_period.entity';

interface CategoryRow {
  categoryId: string | null;
  categoryName: string | null;
  total: string;
  count: string;
}

export interface PeriodChange {
  percent: number;
  sign: '+' | '-' | '';
}

export interface DashboardSummary {
  totalIncome: string;
  totalExpenses: string;
  balance: string;
  incomeChange: PeriodChange;
  expensesChange: PeriodChange;
  balanceChange: PeriodChange;
}

interface DateRange {
  from: string;
  to: string;
}

export interface ActivityDay {
  date: string;
  count: number;
}

export interface BalanceHistoryDay {
  date: string;
  balance: number;
}

@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(TransitionEntity)
    private readonly transitionRepository: Repository<TransitionEntity>,
    @InjectRepository(SavingAccountEntity)
    private readonly savingAccountRepository: Repository<SavingAccountEntity>,
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

  async getTotalSpent(
    workspaceId: string,
  ): Promise<{ totalSpent: string; totalIncome: string }> {
    const qb = this.transitionRepository
      .createQueryBuilder('transition')
      .select(
        'COALESCE(SUM(CASE WHEN transition.type = :expense THEN transition.amount ELSE 0 END), 0)',
        'totalSpent',
      )
      .addSelect(
        'COALESCE(SUM(CASE WHEN transition.type = :income THEN transition.amount ELSE 0 END), 0)',
        'totalIncome',
      )
      .where('transition.workspaceId = :workspaceId', { workspaceId })
      .setParameters({
        expense: TransactionType.EXPENSE,
        income: TransactionType.INCOME,
      });

    await this.applyDateFilter(qb, workspaceId);

    const result = await qb.getRawOne<{
      totalSpent: string;
      totalIncome: string;
    }>();

    return {
      totalSpent: Number(result?.totalSpent ?? 0).toFixed(2),
      totalIncome: Number(result?.totalIncome ?? 0).toFixed(2),
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

  async getBalanceHistory(
    accountId: string,
    workspaceId: string,
  ): Promise<BalanceHistoryDay[]> {
    const period = await this.billingPeriodService.getLatestActive(workspaceId);

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    let fromStr: string;

    if (period?.startDay) {
      const year = today.getFullYear();
      const month = today.getMonth();
      const day = today.getDate();
      const from =
        day >= period.startDay
          ? new Date(year, month, period.startDay)
          : new Date(year, month - 1, period.startDay);
      fromStr = from.toISOString().slice(0, 10);
    } else if (period?.startDate) {
      fromStr = period.startDate;
    } else {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      fromStr = monthAgo.toISOString().slice(0, 10);
    }

    // Get account current balance
    const accountEntity = await this.savingAccountRepository.findOne({
      where: { id: accountId },
    });
    if (!accountEntity) return [];

    // Get daily net changes within the period for this account
    const rows = await this.transitionRepository
      .createQueryBuilder('t')
      .select("TO_CHAR(t.date, 'YYYY-MM-DD')", 'date')
      .addSelect(
        `SUM(CASE WHEN t.to_account_id = :accountId THEN t.amount ELSE 0 END) - SUM(CASE WHEN t.from_account_id = :accountId THEN t.amount ELSE 0 END)`,
        'netChange',
      )
      .where('t.workspaceId = :workspaceId', { workspaceId })
      .andWhere(
        '(t.fromAccountId = :accountId OR t.toAccountId = :accountId)',
        { accountId },
      )
      .andWhere('t.date BETWEEN :from AND :to', { from: fromStr, to: todayStr })
      .groupBy("TO_CHAR(t.date, 'YYYY-MM-DD')")
      .orderBy('date', 'ASC')
      .getRawMany<{ date: string; netChange: string }>();

    const dailyMap = new Map(rows.map((r) => [r.date, Number(r.netChange)]));

    // Compute periodStartBalance = currentAmount - sum of all net changes in period
    const totalNetChange = rows.reduce(
      (acc, r) => acc + Number(r.netChange),
      0,
    );
    const currentAmount = Number(accountEntity.amount);
    const periodStartBalance = currentAmount - totalNetChange;

    // Build daily balance array
    const result: BalanceHistoryDay[] = [];
    let runningBalance = periodStartBalance;

    const cursor = new Date(fromStr);
    const end = new Date(todayStr);
    while (cursor <= end) {
      const key = cursor.toISOString().slice(0, 10);
      runningBalance += dailyMap.get(key) ?? 0;
      result.push({
        date: key,
        balance: Math.round(runningBalance * 100) / 100,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    return result;
  }

  async getTopExpenses(workspaceId: string): Promise<TransitionEntity[]> {
    const qb = this.transitionRepository
      .createQueryBuilder('transition')
      .leftJoinAndSelect('transition.fromAccount', 'fromAccount')
      .leftJoinAndSelect('transition.category', 'category')
      .leftJoinAndSelect('transition.createdBy', 'createdBy')
      .where('transition.workspaceId = :workspaceId', { workspaceId })
      .andWhere('transition.type = :type', { type: TransactionType.EXPENSE })
      .orderBy('transition.amount', 'DESC')
      .limit(10);

    await this.applyDateFilter(qb, workspaceId);

    return qb.getMany();
  }

  async getDashboardSummary(workspaceId: string): Promise<DashboardSummary> {
    const period = await this.billingPeriodService.getLatestActive(workspaceId);
    const ranges = this.getPeriodRanges(period);

    const [current, previous, totalBalance] = await Promise.all([
      this.queryTotals(workspaceId, ranges.current),
      this.queryTotals(workspaceId, ranges.previous),
      this.queryTotalAccountsBalance(workspaceId),
    ]);

    // Баланс на начало периода = текущий баланс - доходы периода + расходы периода
    const periodStartBalance = totalBalance - current.income + current.expenses;

    return {
      totalIncome: current.income.toFixed(2),
      totalExpenses: current.expenses.toFixed(2),
      balance: totalBalance.toFixed(2),
      incomeChange: this.calcChange(previous.income, current.income),
      expensesChange: this.calcChange(previous.expenses, current.expenses),
      balanceChange: this.calcChange(periodStartBalance, totalBalance),
    };
  }

  private async queryTotalAccountsBalance(
    workspaceId: string,
  ): Promise<number> {
    const result = await this.savingAccountRepository
      .createQueryBuilder('sa')
      .select('COALESCE(SUM(sa.amount), 0)', 'total')
      .where('sa.workspaceId = :workspaceId', { workspaceId })
      .getRawOne<{ total: string }>();

    return Number(result?.total ?? 0);
  }

  private getPeriodRanges(period: BillingPeriodEntity | null): {
    current: DateRange;
    previous: DateRange;
  } {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    if (period?.startDay) {
      const year = today.getFullYear();
      const month = today.getMonth();
      const day = today.getDate();

      const currentStart =
        day >= period.startDay
          ? new Date(year, month, period.startDay)
          : new Date(year, month - 1, period.startDay);

      const previousStart = new Date(currentStart);
      previousStart.setMonth(previousStart.getMonth() - 1);

      const previousEnd = new Date(currentStart);
      previousEnd.setDate(previousEnd.getDate() - 1);

      return {
        current: {
          from: currentStart.toISOString().slice(0, 10),
          to: todayStr,
        },
        previous: {
          from: previousStart.toISOString().slice(0, 10),
          to: previousEnd.toISOString().slice(0, 10),
        },
      };
    }

    if (period?.startDate) {
      const start = new Date(period.startDate);
      const durationMs = today.getTime() - start.getTime();

      const previousEnd = new Date(start);
      previousEnd.setDate(previousEnd.getDate() - 1);

      const previousStart = new Date(previousEnd.getTime() - durationMs);

      return {
        current: { from: period.startDate, to: todayStr },
        previous: {
          from: previousStart.toISOString().slice(0, 10),
          to: previousEnd.toISOString().slice(0, 10),
        },
      };
    }

    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const monthAgoStr = monthAgo.toISOString().slice(0, 10);

    const twoMonthsAgo = new Date(today);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const twoMonthsAgoStr = twoMonthsAgo.toISOString().slice(0, 10);

    return {
      current: { from: monthAgoStr, to: todayStr },
      previous: { from: twoMonthsAgoStr, to: monthAgoStr },
    };
  }

  private async queryTotals(
    workspaceId: string,
    range: DateRange,
  ): Promise<{ income: number; expenses: number }> {
    const result = await this.transitionRepository
      .createQueryBuilder('t')
      .select(
        'COALESCE(SUM(CASE WHEN t.type = :expense THEN t.amount ELSE 0 END), 0)',
        'expenses',
      )
      .addSelect(
        'COALESCE(SUM(CASE WHEN t.type = :income THEN t.amount ELSE 0 END), 0)',
        'income',
      )
      .where('t.workspaceId = :workspaceId', { workspaceId })
      .andWhere('t.date BETWEEN :from AND :to', {
        from: range.from,
        to: range.to,
      })
      .setParameters({
        expense: TransactionType.EXPENSE,
        income: TransactionType.INCOME,
      })
      .getRawOne<{ expenses: string; income: string }>();

    return {
      income: Number(result?.income ?? 0),
      expenses: Number(result?.expenses ?? 0),
    };
  }

  private calcChange(previous: number, current: number): PeriodChange {
    if (previous === 0) {
      if (current === 0) return { percent: 0, sign: '' };
      return { percent: 100, sign: current > 0 ? '+' : '-' };
    }

    const percent =
      Math.round(((current - previous) / Math.abs(previous)) * 10000) / 100;
    const sign = percent > 0 ? '+' : percent < 0 ? '-' : '';
    return { percent: Math.abs(percent), sign };
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
