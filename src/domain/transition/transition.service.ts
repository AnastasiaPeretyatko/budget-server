import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InjectRepository } from '@nestjs/typeorm';
import { TransitionEntity, TransactionType } from './transition.entity';
import {
  Brackets,
  DataSource,
  EntityManager,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import {
  CreateTransitionDto,
  FindTransitionsDto,
  UpdateTransitionDto,
} from './dto';
import { ApiException } from 'src/common/exceptions/api.exceptions';
import { SavingAccountEntity } from '../savings_account/savings_account.entity';
import { WorkspaceService } from '../workspace/workspaces.service';
import { BillingPeriodService } from '../billing_period/billing_period.service';
import { TagsService } from '../tags/tags.service';

@Injectable()
export class TransitionService {
  constructor(
    @InjectRepository(TransitionEntity)
    private readonly transitionRepository: Repository<TransitionEntity>,
    private readonly workspaceService: WorkspaceService,
    private readonly billingPeriodService: BillingPeriodService,
    private readonly tagsService: TagsService,
    private readonly datasource: DataSource,
    @InjectPinoLogger(TransitionService.name)
    private readonly logger: PinoLogger,
  ) {}

  public async create(
    dto: CreateTransitionDto,
    workspaceId: string,
    userId: string,
  ): Promise<TransitionEntity | null> {
    const isExistWorkspace = await this.workspaceService.findById(workspaceId);

    if (!isExistWorkspace)
      throw ApiException.badRequest('This workspace does not exist');

    const { tagIds, ...rest } = dto;

    const tags = tagIds?.length
      ? await this.tagsService.findByIds(tagIds, workspaceId)
      : [];

    const tr = await this.datasource.transaction(async (manager) => {
      await this.applyBalanceEffect(
        manager,
        dto.type ?? TransactionType.EXPENSE,
        dto.fromAccountId,
        dto.toAccountId,
        dto.amount,
        'apply',
      );

      return await manager
        .getRepository(TransitionEntity)
        .save({ ...rest, workspaceId, createdById: userId, tags });
    });

    return await this.findOneBy({ id: tr.id });
  }

  public async findAllTransition(
    { paging, filter }: FindTransitionsDto,
    workspaceId: string,
  ): Promise<{ rows: TransitionEntity[]; count: number }> {
    const limit = paging?.limit ?? 20;
    const offset = paging?.offset ?? 0;

    this.logger.info({ filter }, 'Filter');

    const db = this.transitionRepository
      .createQueryBuilder('transition')
      .leftJoinAndSelect('transition.fromAccount', 'fromAccount')
      .leftJoinAndSelect('transition.toAccount', 'toAccount')
      .leftJoinAndSelect('transition.category', 'category')
      .leftJoinAndSelect('transition.createdBy', 'createdBy')
      .leftJoinAndSelect('transition.workspace', 'workspace')
      .leftJoinAndSelect('transition.tags', 'tags')
      .where('transition.workspaceId = :workspaceId', { workspaceId })
      .orderBy('transition.date', 'DESC')
      .take(limit)
      .skip(offset);

    await this.applyDateFilter(db, filter, workspaceId);
    this.applyAccountFilter(db, filter);
    this.applyTagFilter(db, filter);

    const [rows, count] = await db.getManyAndCount();
    return { rows, count };
  }

  private async applyDateFilter(
    db: SelectQueryBuilder<TransitionEntity>,
    filter: FindTransitionsDto['filter'],
    workspaceId: string,
  ): Promise<void> {
    if (filter?.date?.between) {
      db.andWhere('transition.date BETWEEN :from AND :to', {
        from: filter.date.between[0],
        to: filter.date.between[1],
      });
      return;
    }

    const lastPeriod = await this.billingPeriodService.getLatest(workspaceId);

    if (lastPeriod) {
      db.andWhere('transition.date BETWEEN :from AND :to', {
        from: lastPeriod.startDate,
        to: lastPeriod.endDate,
      });
    } else {
      db.andWhere(`transition.date >= NOW() - INTERVAL '1 month'`);
    }
  }

  private applyAccountFilter(
    db: SelectQueryBuilder<TransitionEntity>,
    filter: FindTransitionsDto['filter'],
  ): void {
    if (filter?.accountId) {
      db.andWhere(
        new Brackets((qb) => {
          qb.where('transition.fromAccountId = :accountId', {
            accountId: filter.accountId,
          }).orWhere('transition.toAccountId = :accountId', {
            accountId: filter.accountId,
          });
        }),
      );
    }

    if (filter?.fromAccountId) {
      db.andWhere('transition.fromAccountId = :fromAccountId', {
        fromAccountId: filter.fromAccountId,
      });
    }

    if (filter?.toAccountId) {
      db.andWhere('transition.toAccountId = :toAccountId', {
        toAccountId: filter.toAccountId,
      });
    }

    if (filter?.categoryId) {
      db.andWhere('transition.categoryId = :categoryId', {
        categoryId: filter.categoryId,
      });
    }

    if (filter?.type) {
      db.andWhere('transition.type = :type', {
        type: filter.type,
      });
    }
  }

  private applyTagFilter(
    db: SelectQueryBuilder<TransitionEntity>,
    filter: FindTransitionsDto['filter'],
  ): void {
    if (!filter?.tag) return;

    if (filter?.tag?.eq) {
      db.andWhere(
        `EXISTS (SELECT 1 FROM transaction_tags tt WHERE tt.transaction_id = transition.id AND tt.tag_id = :tagEq)`,
        { tagEq: filter.tag.eq },
      );
    }

    if (filter.tag?.in?.length) {
      db.andWhere(
        `EXISTS (SELECT 1 FROM transaction_tags tt WHERE tt.transaction_id = transition.id AND tt.tag_id IN (:...tagIn))`,
        { tagIn: filter?.tag?.in },
      );
    }

    if (filter?.tag?.nin?.length) {
      db.andWhere(
        `NOT EXISTS (SELECT 1 FROM transaction_tags tt WHERE tt.transaction_id = transition.id AND tt.tag_id IN (:...tagNin))`,
        { tagNin: filter?.tag?.nin },
      );
    }
  }

  public async findOneBy(
    dto: Record<string, string>,
  ): Promise<TransitionEntity | null> {
    const key = Object.keys(dto)[0];
    const value = dto[key];

    return await this.transitionRepository
      .createQueryBuilder('transition')
      .leftJoinAndSelect('transition.fromAccount', 'fromAccount')
      .leftJoinAndSelect('transition.toAccount', 'toAccount')
      .leftJoinAndSelect('transition.category', 'category')
      .leftJoinAndSelect('transition.createdBy', 'createdBy')
      .leftJoinAndSelect('transition.tags', 'tags')
      .where(`transition.${key} = :value`, { value })
      .getOne();
  }

  public async update(
    id: string,
    dto: UpdateTransitionDto,
  ): Promise<TransitionEntity | null> {
    const old = await this.findOneBy({ id });

    if (!old) throw ApiException.badRequest('There is no such transaction!');

    const { tagIds, ...rest } = dto;

    await this.datasource.transaction(async (manager) => {
      await this.applyBalanceEffect(
        manager,
        old.type,
        old.fromAccountId,
        old.toAccountId,
        old.amount,
        'reverse',
      );

      const newType = rest.type ?? old.type;
      const newFromAccountId =
        rest.fromAccountId !== undefined
          ? rest.fromAccountId
          : old.fromAccountId;
      const newToAccountId =
        rest.toAccountId !== undefined ? rest.toAccountId : old.toAccountId;
      const newAmount = rest.amount ?? old.amount;

      await this.applyBalanceEffect(
        manager,
        newType,
        newFromAccountId,
        newToAccountId,
        newAmount,
        'apply',
      );

      const fieldsToUpdate = Object.fromEntries(
        Object.entries(rest).filter(([, v]) => v !== undefined),
      );

      if (Object.keys(fieldsToUpdate).length) {
        await manager
          .getRepository(TransitionEntity)
          .update(id, fieldsToUpdate);
      }

      if (tagIds !== undefined) {
        const tags = tagIds.length
          ? await this.tagsService.findByIds(tagIds, old.workspaceId)
          : [];

        await manager
          .getRepository(TransitionEntity)
          .createQueryBuilder()
          .relation(TransitionEntity, 'tags')
          .of(id)
          .addAndRemove(tags, old.tags ?? []);
      }
    });

    return await this.findOneBy({ id });
  }

  public async remove(id: string): Promise<void> {
    const transition = await this.findOneBy({ id });

    if (!transition)
      throw ApiException.badRequest('There is no such transaction!');

    await this.datasource.transaction(async (manager) => {
      await this.applyBalanceEffect(
        manager,
        transition.type,
        transition.fromAccountId,
        transition.toAccountId,
        transition.amount,
        'reverse',
      );

      await manager.getRepository(TransitionEntity).softDelete(id);
    });
  }

  /**
   * Applies or reverses the balance effect of a transaction on the involved accounts.
   * direction='apply'   → deduct from source, credit to destination
   * direction='reverse' → credit back to source, deduct from destination
   */
  private async applyBalanceEffect(
    manager: EntityManager,
    type: TransactionType,
    fromAccountId: string | null | undefined,
    toAccountId: string | null | undefined,
    amount: string,
    direction: 'apply' | 'reverse',
  ): Promise<void> {
    const repo = manager.getRepository(SavingAccountEntity);
    const isApply = direction === 'apply';

    if (
      (type === TransactionType.EXPENSE || type === TransactionType.TRANSFER) &&
      fromAccountId
    ) {
      if (isApply) {
        const account = await repo.findOneByOrFail({ id: fromAccountId });
        if (Number(account.amount) < Number(amount)) {
          throw ApiException.badRequest('Не достаточно средств');
        }
        await repo.update(fromAccountId, {
          amount: () => `amount - ${amount}`,
        });
      } else {
        await repo.update(fromAccountId, {
          amount: () => `amount + ${amount}`,
        });
      }
    }

    if (
      (type === TransactionType.INCOME || type === TransactionType.TRANSFER) &&
      toAccountId
    ) {
      if (isApply) {
        await repo.update(toAccountId, {
          amount: () => `amount + ${amount}`,
        });
      } else {
        await repo.update(toAccountId, {
          amount: () => `amount - ${amount}`,
        });
      }
    }
  }
}
