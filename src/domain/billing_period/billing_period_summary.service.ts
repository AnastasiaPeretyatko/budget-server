import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  BillingPeriodEntity,
  BillingPeriodStatus,
} from './billing_period.entity';
import { CategoriesEntity } from '../categories/categories.entity';
import { TransitionEntity } from '../transition/transition.entity';
import { ApiException } from 'src/common/exceptions/api.exceptions';
import { BillingPeriodHistoryItem, BillingPeriodSummary } from './types';
import {
  calculateCycleBounds,
  CycleBounds,
  formatLocalDate,
} from './utils/cycle-bounds';
import { buildPlan, buildSnapshotPlan } from './utils/period-plan';
import {
  buildHistoryItem,
  buildSummary,
  CategoryInfo,
  SpentRow,
} from './utils/period-summary';

@Injectable()
export class BillingPeriodSummaryService {
  constructor(
    @InjectRepository(BillingPeriodEntity)
    private readonly billingPeriodRepository: Repository<BillingPeriodEntity>,
    private readonly datasource: DataSource,
  ) {}

  // Итоги цикла для любого периода workspace
  async getSummary(
    id: string,
    workspaceId: string,
    today: Date = new Date(),
  ): Promise<BillingPeriodSummary> {
    const period = await this.billingPeriodRepository
      .createQueryBuilder('p')
      .addSelect(['p.plannedAmount', 'p.planSnapshot'])
      .where('p.id = :id', { id })
      .andWhere('p.workspaceId = :workspaceId', { workspaceId })
      .getOne();
    if (!period) throw ApiException.badRequest('Billing period not found');

    const bounds = calculateCycleBounds(period, today);
    if (!bounds)
      throw ApiException.badRequest('Billing period has no start date');

    const isActive = period.status === BillingPeriodStatus.ACTIVE;
    const [spentRows, categories] = await Promise.all([
      this.getSpentRows(
        workspaceId,
        bounds.startDate,
        this.getSpentEnd(bounds, isActive, formatLocalDate(today)),
      ),
      // Вместе с удалёнными: по ним могли быть расходы за цикл
      this.datasource
        .getRepository(CategoriesEntity)
        .find({ where: { workspaceId }, withDeleted: true }),
    ]);

    return buildSummary({
      period,
      bounds,
      plan: isActive
        ? buildPlan(
            categories
              .filter((category) => category.deletedAt === null)
              .map((category) => ({
                ...category,
                icon: category.icon ?? null,
              })),
          )
        : buildSnapshotPlan(period),
      spentRows,
      categoryInfo: new Map<string, CategoryInfo>(
        categories.map((category) => [
          category.id,
          {
            name: category.name,
            icon: category.icon ?? null,
            color: category.color ?? null,
          },
        ]),
      ),
    });
  }

  // История закрытых циклов, свежие сверху. Периоды без startDate или endDate
  // пропускаются: период по числу месяца закрывался до появления снимка
  // и дат у него может не быть.
  async getHistory(
    workspaceId: string,
    today: Date = new Date(),
  ): Promise<BillingPeriodHistoryItem[]> {
    const periods = await this.billingPeriodRepository
      .createQueryBuilder('p')
      .addSelect('p.plannedAmount')
      .where('p.workspaceId = :workspaceId', { workspaceId })
      .andWhere('p.status = :status', { status: BillingPeriodStatus.COMPLETED })
      .andWhere('p.startDate IS NOT NULL')
      .andWhere('p.endDate IS NOT NULL')
      .orderBy('p.startDate', 'DESC')
      .getMany();

    if (!periods.length) return [];

    const spentByPeriod = await this.getSpentByPeriod(
      workspaceId,
      periods.map((period) => period.id),
    );

    return periods.map((period) => {
      const bounds = calculateCycleBounds(period, today) as CycleBounds & {
        endDate: string;
      };
      return buildHistoryItem(
        period,
        bounds,
        spentByPeriod.get(period.id) ?? '0',
      );
    });
  }

  // Активный период — до сегодня (но не дальше конца цикла),
  // завершённый — весь период
  private getSpentEnd(
    bounds: CycleBounds,
    isActive: boolean,
    today: string,
  ): string {
    if (bounds.endDate === null) return today;
    return isActive && bounds.endDate > today ? today : bounds.endDate;
  }

  // Расходы за [from, to] включительно, по категориям (в том числе без категории).
  // Расход — как в CategoriesService.getSpentByCategory:
  // fromAccountId IS NOT NULL AND toAccountId IS NULL, удалённые отсекает TypeORM.
  private async getSpentRows(
    workspaceId: string,
    from: string,
    to: string,
  ): Promise<SpentRow[]> {
    return (
      this.datasource
        .getRepository(TransitionEntity)
        .createQueryBuilder('t')
        .select('t.categoryId', 'categoryId')
        .addSelect('COALESCE(SUM(t.amount), 0)', 'total')
        .where('t.workspaceId = :workspaceId', { workspaceId })
        .andWhere('t.fromAccountId IS NOT NULL')
        .andWhere('t.toAccountId IS NULL')
        .andWhere('t.date >= CAST(:from AS date)', { from })
        // +1 день, чтобы транзакции последнего дня попали в выборку
        .andWhere('t.date < CAST(:to AS date) + 1', { to })
        .groupBy('t.categoryId')
        .getRawMany<SpentRow>()
    );
  }

  // Расходы сразу по всем периодам — одним запросом
  private async getSpentByPeriod(
    workspaceId: string,
    periodIds: string[],
  ): Promise<Map<string, string>> {
    const rows = await this.datasource.query<
      Array<{ id: string; total: string }>
    >(
      `SELECT p.id, COALESCE(SUM(t.amount), 0) AS total
       FROM billing_period p
       LEFT JOIN transactions t
         ON t.workspace_id = p.workspace_id
        AND t.deleted_at IS NULL
        AND t.from_account_id IS NOT NULL
        AND t.to_account_id IS NULL
        AND t.date >= p.start_date
        AND t.date < p.end_date + 1
       WHERE p.workspace_id = $1 AND p.id = ANY($2::uuid[])
       GROUP BY p.id`,
      [workspaceId, periodIds],
    );

    return new Map(rows.map((row) => [row.id, row.total]));
  }
}
