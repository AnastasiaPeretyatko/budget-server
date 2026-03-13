import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TransitionEntity } from './transition.entity';
import { Repository } from 'typeorm';
import { CreateTransitionDto, FindTransitionsDto } from './dto';

@Injectable()
export class TransitionService {
  constructor(
    @InjectRepository(TransitionEntity)
    private readonly transitionRepository: Repository<TransitionEntity>,
  ) {}

  public async create(dto: CreateTransitionDto): Promise<TransitionEntity> {
    return this.transitionRepository.save(dto);
  }

  public async findAllTransition({
    paging,
    filter,
  }: FindTransitionsDto): Promise<{ rows: TransitionEntity[]; count: number }> {
    const limit = paging?.limit ?? 20;

    const db = this.transitionRepository
      .createQueryBuilder('transition')
      .leftJoinAndSelect('transition.fromAccount', 'fromAccount')
      .leftJoinAndSelect('transition.toAccount', 'toAccount')
      .leftJoinAndSelect('transition.category', 'category')
      .orderBy('transition.createdAt', 'DESC')
      .limit(limit + 1);

    if (filter?.fromAccountId) {
      db.where('transition.fromAccount = :fromAccountId', {
        fromAccountId: filter?.fromAccountId,
      });
    }

    if (filter?.toAccountId) {
      db.where('transition.toAccount = :toAccountId', {
        toAccountId: filter?.toAccountId,
      });
    }

    if (filter?.categoryId) {
      db.where('transition.category = :categoryId', {
        categoryId: filter?.categoryId,
      });
    }

    const [rows, count] = await db.getManyAndCount();
    return { rows, count };
  }

  public async findOneBy(dto): Promise<TransitionEntity | null> {
    return await this.transitionRepository.findOneBy(dto);
  }
}
