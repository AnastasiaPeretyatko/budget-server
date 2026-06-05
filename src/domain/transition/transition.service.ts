import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { InjectRepository } from '@nestjs/typeorm';
import { TransitionEntity } from './transition.entity';
import { Brackets, DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import {
  CreateTransitionDto,
  FindTransitionsDto,
  UpdateTransitionDto,
} from './dto';
import { ApiException } from 'src/common/exceptions/api.exceptions';
import { SavingAccountEntity } from '../savings_account/savings_account.entity';
import { WorkspaceService } from '../workspace/workspaces.service';
import { BillingPeriodService } from '../billing_period/billing_period.service';

@Injectable()
export class TransitionService {
  constructor(
    @InjectRepository(TransitionEntity)
    private readonly transitionRepository: Repository<TransitionEntity>,
    private readonly workspaceService: WorkspaceService,
    private readonly billingPeriodService: BillingPeriodService,
    private readonly datasource: DataSource,
    @InjectPinoLogger(TransitionService.name)
    private readonly logger: PinoLogger,
  ) {}

  public async create(
    dto: CreateTransitionDto,
    workspaceId: string,
    userId: string,
  ): Promise<TransitionEntity | null> {
    const { fromAccountId, toAccountId } = dto;

    const isExistWorkspace = await this.workspaceService.findById(workspaceId);

    if (!isExistWorkspace)
      throw ApiException.badRequest('This workspace does not exist');

    const tr = await this.datasource.transaction(async (manager) => {
      const repo = manager.getRepository(SavingAccountEntity);

      if (fromAccountId) {
        const fromAccount = await repo.findOneByOrFail({ id: fromAccountId });

        if (Number(fromAccount.amount) < Number(dto.amount)) {
          throw ApiException.badRequest('Not enough funds');
        }

        await repo.update(fromAccountId, {
          amount: () => `amount - ${dto.amount}`,
        });
      }

      if (toAccountId) {
        await repo.update(toAccountId, {
          amount: () => `amount + ${dto.amount}`,
        });
      }

      return await manager
        .getRepository(TransitionEntity)
        .save({ ...dto, workspaceId, createdById: userId });
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
      .where('transition.workspaceId = :workspaceId', { workspaceId })
      .orderBy('transition.date', 'DESC')
      .take(limit)
      .skip(offset);

    await this.applyDateFilter(db, filter, workspaceId);
    this.applyAccountFilter(db, filter);

    const [rows, count] = await db.getManyAndCount();
    return { rows, count };
  }

  private async applyDateFilter(
    db: SelectQueryBuilder<TransitionEntity>,
    filter: FindTransitionsDto['filter'],
    workspaceId: string,
  ): Promise<void> {
    if (filter.date?.between) {
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
      .where(`transition.${key} = :value`, { value })
      .getOne();
  }

  public async update(id: string, dto: UpdateTransitionDto) {
    const transition = await this.findOneBy({ id });

    if (!transition)
      throw ApiException.badRequest('There is no such transaction!');

    return await this.transitionRepository
      .createQueryBuilder()
      .update()
      .where('id = :id', { id })
      .set(dto)
      .execute();
  }
}
