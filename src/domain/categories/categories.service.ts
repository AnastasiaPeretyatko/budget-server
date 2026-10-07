import { Injectable } from '@nestjs/common';
import { DataSource, FindOptionsWhere, ILike } from 'typeorm';
import { CategoriesEntity } from './categories.entity';
import { ApiException } from 'src/common/exceptions/api.exceptions';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';
import { BillingPeriodService } from '../billing_period/billing_period.service';
import { formatLocalDate } from '../billing_period/utils/cycle-bounds';
import { TransitionEntity } from '../transition/transition.entity';
import {
  buildCategoryCycle,
  CategoryCycle,
  CategorySpent,
} from './utils/category-cycle';

export type CategoryWithCycle = CategoriesEntity & {
  cycle: CategoryCycle | null;
};

interface SpentRow {
  categoryId: string;
  total: string;
  count: string;
}

@Injectable()
export class CategoriesService {
  constructor(
    private readonly datasource: DataSource,
    private readonly billingPeriodService: BillingPeriodService,
  ) {}

  async findByOne(dto: FindOptionsWhere<CategoriesEntity>) {
    return await this.datasource.getRepository(CategoriesEntity).findOneBy(dto);
  }

  async create(
    {
      name,
      description,
      icon,
      color,
      macroFund,
      defaultLimit,
      rolloverToReserve,
      allowOverspendFromFund,
    }: CreateCategoryDto,
    workspaceId: string,
  ) {
    const category = await this.findByOne({ name, workspaceId });
    if (category) throw ApiException.badRequest('Error');

    const saved = await this.datasource.getRepository(CategoriesEntity).save({
      name,
      description,
      icon,
      color,
      macroFund,
      defaultLimit,
      rolloverToReserve,
      allowOverspendFromFund,
      workspaceId,
    });

    return await this.getOne(saved.id, workspaceId);
  }

  async update(
    {
      id,
      name,
      description,
      icon,
      color,
      macroFund,
      defaultLimit,
      rolloverToReserve,
      allowOverspendFromFund,
    }: UpdateCategoryDto & { id: string },
    workspaceId: string,
  ) {
    const category = await this.findByOne({ id, workspaceId });
    if (!category) throw ApiException.badRequest('Error');

    if (name) {
      const existName = await this.findByOne({ name, workspaceId });
      if (existName && existName.id !== id)
        throw ApiException.badRequest('Error');
    }

    // undefined — поле не передали, не трогаем. null — сбрасываем в базе.
    const changes = Object.fromEntries(
      Object.entries({
        name,
        description,
        icon,
        color,
        macroFund,
        defaultLimit,
        rolloverToReserve,
        allowOverspendFromFund,
      }).filter(([, value]) => value !== undefined),
    );

    // update с пустым набором полей TypeORM не принимает
    if (Object.keys(changes).length > 0) {
      await this.datasource.getRepository(CategoriesEntity).update(id, changes);
    }

    return await this.getOne(id, workspaceId);
  }

  async delete(id: string, workspaceId: string) {
    const category = await this.findByOne({ id, workspaceId });
    if (!category) throw ApiException.badRequest('Error');

    await this.datasource.getRepository(CategoriesEntity).softDelete(id);
    return {
      message: 'Category was deleted',
    };
  }

  async getOne(id: string, workspaceId: string) {
    const category = await this.findByOne({ id, workspaceId });
    if (!category) throw ApiException.badRequest('Error');

    const [result] = await this.withCycle([category], workspaceId);
    return result;
  }

  async getAll(workspaceId: string, search?: string) {
    const where: FindOptionsWhere<CategoriesEntity> = { workspaceId };
    if (search) {
      where.name = ILike(`%${search}%`);
    }

    const categories = await this.datasource
      .getRepository(CategoriesEntity)
      .find({ where });

    return await this.withCycle(categories, workspaceId);
  }

  // Добавляет к категориям данные текущего цикла. Расходы всех категорий
  // берём одним запросом, а не по запросу на каждую.
  private async withCycle(
    categories: CategoriesEntity[],
    workspaceId: string,
  ): Promise<CategoryWithCycle[]> {
    const today = new Date();
    const bounds = await this.billingPeriodService.getCurrentCycle(
      workspaceId,
      today,
    );

    if (!bounds)
      return categories.map((category) => ({ ...category, cycle: null }));

    const spentByCategory = await this.getSpentByCategory(
      workspaceId,
      bounds.startDate,
      formatLocalDate(today),
    );

    return categories.map((category) => ({
      ...category,
      cycle: buildCategoryCycle(
        bounds,
        category.defaultLimit,
        spentByCategory.get(category.id),
      ),
    }));
  }

  // Расходы по категориям за [from, to] включительно (to — сегодня).
  // Расход — как в StatisticsService.getByCategory:
  // fromAccountId IS NOT NULL AND toAccountId IS NULL.
  // Удалённые транзакции TypeORM отсекает сам (deletedAt IS NULL).
  private async getSpentByCategory(
    workspaceId: string,
    from: string,
    to: string,
  ): Promise<Map<string, CategorySpent>> {
    const rows = await this.datasource
      .getRepository(TransitionEntity)
      .createQueryBuilder('t')
      .select('t.categoryId', 'categoryId')
      .addSelect('COALESCE(SUM(t.amount), 0)', 'total')
      .addSelect('COUNT(t.id)', 'count')
      .where('t.workspaceId = :workspaceId', { workspaceId })
      .andWhere('t.categoryId IS NOT NULL')
      .andWhere('t.fromAccountId IS NOT NULL')
      .andWhere('t.toAccountId IS NULL')
      .andWhere('t.date >= CAST(:from AS date)', { from })
      // +1 день, чтобы транзакции сегодняшнего дня попали в выборку
      .andWhere('t.date < CAST(:to AS date) + 1', { to })
      .groupBy('t.categoryId')
      .getRawMany<SpentRow>();

    return new Map(
      rows.map((row) => [
        row.categoryId,
        { total: row.total, count: Number(row.count) },
      ]),
    );
  }
}
