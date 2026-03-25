import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TransitionEntity } from './transition.entity';
import { DataSource, Repository } from 'typeorm';
import {
  CreateTransitionDto,
  FindTransitionsDto,
  UpdateTransitionDto,
} from './dto';
import { ApiException } from 'src/common/exceptions/api.exceptions';
import { SavingAccountEntity } from '../savings_account/savings_account.entity';

@Injectable()
export class TransitionService {
  constructor(
    @InjectRepository(TransitionEntity)
    private readonly transitionRepository: Repository<TransitionEntity>,
    private readonly datasource: DataSource,
  ) {}

  public async create(
    dto: CreateTransitionDto,
  ): Promise<TransitionEntity | null> {
    const { fromAccountId, toAccountId } = dto;

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

      return await manager.getRepository(TransitionEntity).save(dto);
    });

    return await this.findOneBy({ id: tr.id });
  }

  public async findAllTransition({
    paging,
    filter,
  }: FindTransitionsDto): Promise<{ rows: TransitionEntity[]; count: number }> {
    const limit = paging?.limit ?? 20;
    console.log({ filter });

    const db = this.transitionRepository
      .createQueryBuilder('transition')
      .leftJoinAndSelect('transition.fromAccount', 'fromAccount')
      .leftJoinAndSelect('transition.toAccount', 'toAccount')
      .leftJoinAndSelect('transition.category', 'category')
      .orderBy('transition.createdAt', 'ASC')
      .limit(limit + 1);

    if (filter?.fromAccountId) {
      db.andWhere('transition.fromAccountId = :fromAccountId', {
        fromAccountId: filter?.fromAccountId,
      });
    }

    if (filter?.toAccountId) {
      db.andWhere('transition.toAccountId = :toAccountId', {
        toAccountId: filter?.toAccountId,
      });
    }

    if (filter?.categoryId) {
      db.andWhere('transition.categoryId = :categoryId', {
        categoryId: filter?.categoryId,
      });
    }

    const [rows, count] = await db.getManyAndCount();
    return { rows, count };
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
