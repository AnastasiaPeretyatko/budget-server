import { Injectable } from '@nestjs/common';
import { DataSource, FindOptionsWhere, ILike, In } from 'typeorm';
import { TagEntity } from './tag.entity';
import { ApiException } from 'src/common/exceptions/api.exceptions';
import { CreateTagDto, GetAllTagsDto, MergeTagsDto, UpdateTagDto } from './dto';
import { BillingPeriodService } from '../billing_period/billing_period.service';
import {
  CycleBounds,
  formatLocalDate,
} from '../billing_period/utils/cycle-bounds';
import { TransitionEntity } from '../transition/transition.entity';
import { TagSort, TagWithStats } from './types';
import { normalizeTagName } from './utils/tag-name';
import { formatMoney, getPeriodRange, sortTags } from './utils/tag-stats';

interface StatsRow {
  tagId: string;
  count: string;
  total?: string;
}

@Injectable()
export class TagsService {
  constructor(
    private readonly datasource: DataSource,
    private readonly billingPeriodService: BillingPeriodService,
  ) {}

  private get repo() {
    return this.datasource.getRepository(TagEntity);
  }

  async findOne(dto: Partial<TagEntity>): Promise<TagEntity | null> {
    return this.repo.findOneBy(dto as FindOptionsWhere<TagEntity>);
  }

  async findByIds(ids: string[], workspaceId: string): Promise<TagEntity[]> {
    if (!ids.length) return [];
    return this.repo
      .createQueryBuilder('tag')
      .where('tag.id IN (:...ids)', { ids })
      .andWhere('tag.workspaceId = :workspaceId', { workspaceId })
      .getMany();
  }

  async create(dto: CreateTagDto, workspaceId: string): Promise<TagEntity> {
    const name = normalizeTagName(dto.name);
    await this.assertNameIsFree(name, workspaceId);

    return this.repo.save({ name, color: dto.color, workspaceId });
  }

  async update(
    id: string,
    dto: UpdateTagDto,
    workspaceId: string,
  ): Promise<TagEntity> {
    const tag = await this.findOne({ id, workspaceId });
    if (!tag) throw ApiException.badRequest('Tag not found');

    const changes: Partial<Pick<TagEntity, 'name' | 'color'>> = {};

    if (dto.name !== undefined) {
      changes.name = normalizeTagName(dto.name);
      await this.assertNameIsFree(changes.name, workspaceId, id);
    }
    if (dto.color !== undefined) changes.color = dto.color;

    // update с пустым набором полей TypeORM не принимает
    if (Object.keys(changes).length > 0) {
      await this.repo.update(id, changes);
    }
    return (await this.findOne({ id }))!;
  }

  async delete(id: string, workspaceId: string): Promise<{ message: string }> {
    const tag = await this.findOne({ id, workspaceId });
    if (!tag) throw ApiException.badRequest('Tag not found');

    await this.repo.softDelete(id);
    return { message: 'Tag was deleted' };
  }

  async findAll(
    workspaceId: string,
    { search, periodId, sort = TagSort.USAGE }: GetAllTagsDto = {},
  ): Promise<TagWithStats[]> {
    const where: FindOptionsWhere<TagEntity> = { workspaceId };
    if (search) {
      where.name = ILike(`%${search}%`);
    }

    const tags = await this.repo.find({ where });
    const withStats = await this.withStats(tags, workspaceId, periodId);

    return sortTags(withStats, sort);
  }

  // Объединяет теги: транзакции исходных тегов переходят на целевой,
  // исходные теги удаляются (soft delete). Всё — в одной транзакции БД.
  async merge(
    { sourceIds, targetId }: MergeTagsDto,
    workspaceId: string,
  ): Promise<{
    tag: TagWithStats;
    movedTransactions: number;
    mergedTags: number;
  }> {
    if (!sourceIds?.length)
      throw ApiException.badRequest('sourceIds must not be empty');
    if (new Set(sourceIds).size !== sourceIds.length)
      throw ApiException.badRequest('sourceIds must not contain duplicates');
    if (sourceIds.includes(targetId))
      throw ApiException.badRequest('sourceIds must not contain targetId');

    const movedTransactions = await this.datasource.transaction(
      async (manager) => {
        const tagsRepo = manager.getRepository(TagEntity);

        const ids = [...sourceIds, targetId];
        const found = await tagsRepo.find({
          where: { id: In(ids), workspaceId },
          select: { id: true },
        });
        if (found.length !== ids.length)
          throw ApiException.badRequest('Tag not found');

        // Пары (транзакция, целевой тег), которые уже есть, пропускаем
        // (ON CONFLICT DO NOTHING) — дублей в transaction_tags не будет.
        // Считаем только реально добавленные связи неудалённых транзакций.
        const [{ count }] = await manager.query<Array<{ count: number }>>(
          `WITH inserted AS (
             INSERT INTO transaction_tags (transaction_id, tag_id)
             SELECT DISTINCT tt.transaction_id, $1::uuid
             FROM transaction_tags tt
             WHERE tt.tag_id = ANY($2::uuid[])
             ON CONFLICT DO NOTHING
             RETURNING transaction_id
           )
           SELECT COUNT(*)::int AS count
           FROM inserted i
           JOIN transactions t ON t.id = i.transaction_id
           WHERE t.deleted_at IS NULL`,
          [targetId, sourceIds],
        );

        await manager.query(
          `DELETE FROM transaction_tags WHERE tag_id = ANY($1::uuid[])`,
          [sourceIds],
        );

        // Теги шаблонов переносим так же, как теги транзакций
        await manager.query(
          `INSERT INTO template_tags (template_id, tag_id)
           SELECT DISTINCT template_id, $1::uuid
           FROM template_tags
           WHERE tag_id = ANY($2::uuid[])
           ON CONFLICT DO NOTHING`,
          [targetId, sourceIds],
        );
        await manager.query(
          `DELETE FROM template_tags WHERE tag_id = ANY($1::uuid[])`,
          [sourceIds],
        );

        await tagsRepo.softDelete({ id: In(sourceIds) });

        return count;
      },
    );

    const target = (await this.findOne({ id: targetId, workspaceId }))!;
    const [tag] = await this.withStats([target], workspaceId);

    return { tag, movedTransactions, mergedTags: sourceIds.length };
  }

  // Удаляет (soft delete) теги, у которых нет ни одной неудалённой транзакции
  // и которые не используются в шаблонах.
  // Одним запросом, чтобы тег не успел стать «занятым» между проверкой и удалением.
  async cleanup(
    workspaceId: string,
  ): Promise<{ deletedCount: number; deletedIds: string[] }> {
    const rows = await this.datasource.query<Array<{ id: string }>>(
      `WITH deleted AS (
         UPDATE tags
         SET deleted_at = now()
         WHERE workspace_id = $1
           AND deleted_at IS NULL
           AND NOT EXISTS (
             SELECT 1
             FROM transaction_tags tt
             JOIN transactions t ON t.id = tt.transaction_id
             WHERE tt.tag_id = tags.id AND t.deleted_at IS NULL
           )
           AND NOT EXISTS (
             SELECT 1
             FROM template_tags tm
             JOIN templates tp ON tp.id = tm.template_id
             WHERE tm.tag_id = tags.id AND tp.deleted_at IS NULL
           )
         RETURNING id
       )
       SELECT id FROM deleted`,
      [workspaceId],
    );

    const deletedIds = rows.map((row) => row.id);
    return { deletedCount: deletedIds.length, deletedIds };
  }

  // Дубликат — без учёта регистра, среди неудалённых тегов workspace.
  // Сравниваем в коде, а не через LOWER() в SQL: у старых тегов имя может быть
  // в любом регистре, а LOWER() в базе зависит от её локали (кириллица).
  private async assertNameIsFree(
    name: string,
    workspaceId: string,
    exceptId?: string,
  ): Promise<void> {
    const tags = await this.repo.find({
      where: { workspaceId },
      select: { id: true, name: true },
    });

    const exists = tags.some(
      (tag) => tag.id !== exceptId && tag.name.toLowerCase() === name,
    );
    if (exists)
      throw ApiException.badRequest('Tag with this name already exists');
  }

  // Границы периода, за который считаем сумму: выбранный по id или активный
  private async resolveBounds(
    workspaceId: string,
    periodId: string | undefined,
    today: Date,
  ): Promise<CycleBounds | null> {
    return periodId
      ? this.billingPeriodService.getCycleById(periodId, workspaceId, today)
      : this.billingPeriodService.getCurrentCycle(workspaceId, today);
  }

  // Добавляет к тегам статистику. Для всех тегов — одним запросом:
  // transactionCount — все неудалённые транзакции с тегом за всё время,
  // periodAmount — расходы с тегом за период.
  // Расход — как в категориях: fromAccountId IS NOT NULL AND toAccountId IS NULL.
  // Удалённые транзакции TypeORM отсекает сам (deletedAt IS NULL).
  private async withStats(
    tags: TagEntity[],
    workspaceId: string,
    periodId?: string,
  ): Promise<TagWithStats[]> {
    if (!tags.length) return [];

    const today = new Date();
    const bounds = await this.resolveBounds(workspaceId, periodId, today);
    const range = bounds
      ? getPeriodRange(bounds, formatLocalDate(today))
      : null;

    const query = this.datasource
      .getRepository(TransitionEntity)
      .createQueryBuilder('t')
      .innerJoin('t.tags', 'tag')
      .select('tag.id', 'tagId')
      .addSelect('COUNT(t.id)', 'count')
      .where('t.workspaceId = :workspaceId', { workspaceId })
      .andWhere('tag.id IN (:...tagIds)', { tagIds: tags.map((tag) => tag.id) })
      .groupBy('tag.id');

    if (range) {
      query
        .addSelect(
          `COALESCE(SUM(CASE
            WHEN t.fromAccountId IS NOT NULL
              AND t.toAccountId IS NULL
              AND t.date >= CAST(:from AS date)
              -- +1 день, чтобы транзакции последнего дня попали в выборку
              AND t.date < CAST(:to AS date) + 1
            THEN t.amount ELSE 0 END), 0)`,
          'total',
        )
        .setParameters(range);
    }

    const rows = await query.getRawMany<StatsRow>();
    const statsByTag = new Map(rows.map((row) => [row.tagId, row]));

    return tags.map((tag) => {
      const stats = statsByTag.get(tag.id);

      return {
        ...tag,
        transactionCount: Number(stats?.count ?? 0),
        periodAmount: bounds ? formatMoney(stats?.total) : null,
        periodDays: bounds ? bounds.daysTotal : null,
      };
    });
  }
}
