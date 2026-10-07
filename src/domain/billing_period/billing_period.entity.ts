import { BaseEntity } from 'src/common';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { WorkspaceEntity } from '../workspace/workspaces.entity';
import { PlanSnapshotItem } from './types';

export enum BillingPeriodStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
}

@Entity('billing_period')
export class BillingPeriodEntity extends BaseEntity {
  @Column({ name: 'workspace_id', type: 'uuid', nullable: false })
  workspaceId!: string;

  @ManyToOne(() => WorkspaceEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace!: WorkspaceEntity;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate!: string | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate!: string | null;

  @Column({
    type: 'enum',
    enum: BillingPeriodStatus,
    default: BillingPeriodStatus.ACTIVE,
  })
  status!: BillingPeriodStatus;

  @Column({ name: 'start_day', type: 'smallint', nullable: true })
  startDay!: number | null;

  // Три колонки ниже заполняются при закрытии цикла. В обычные выборки
  // (select: false) они не попадают — форма ответов GET не меняется,
  // нужные места читают их явно.

  // План расходов цикла: сумма лимитов категорий на момент закрытия
  @Column({
    name: 'planned_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    select: false,
  })
  plannedAmount!: string | null;

  // Категории с лимитом > 0 на момент закрытия
  @Column({
    name: 'plan_snapshot',
    type: 'jsonb',
    nullable: true,
    select: false,
  })
  planSnapshot!: PlanSnapshotItem[] | null;

  @Column({
    name: 'closed_at',
    type: 'timestamptz',
    nullable: true,
    select: false,
  })
  closedAt!: Date | null;
}
