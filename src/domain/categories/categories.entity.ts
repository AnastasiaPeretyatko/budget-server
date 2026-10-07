import { BaseEntity } from 'src/common';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { WorkspaceEntity } from '../workspace/workspaces.entity';
import { TransitionEntity } from '../transition/transition.entity';
import { MacroFund } from './types';

@Entity('categories')
export class CategoriesEntity extends BaseEntity {
  @Column({ type: 'varchar', nullable: false })
  name!: string;

  @Column({ type: 'varchar', nullable: true })
  description!: string;

  @Column({ type: 'varchar', nullable: true })
  icon!: string;

  @Column({ type: 'varchar', nullable: true })
  color!: string | null;

  // nullable только ради старых категорий, новые создаются с макро-фондом
  @Column({
    name: 'macro_fund',
    type: 'enum',
    enum: MacroFund,
    enumName: 'categories_macro_fund_enum',
    nullable: true,
  })
  macroFund!: MacroFund | null;

  // Плановый лимит на цикл. null — лимита нет
  @Column({
    name: 'default_limit',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  defaultLimit!: string | null;

  @Column({ name: 'rollover_to_reserve', type: 'boolean', default: false })
  rolloverToReserve!: boolean;

  @Column({
    name: 'allow_overspend_from_fund',
    type: 'boolean',
    default: false,
  })
  allowOverspendFromFund!: boolean;

  @Column({ name: 'workspace_id', type: 'uuid', nullable: false })
  workspaceId!: string;

  @ManyToOne(() => WorkspaceEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace!: WorkspaceEntity;

  @OneToMany(() => TransitionEntity, (transaction) => transaction.category)
  transactions!: TransitionEntity[];
}
