import { BaseEntity } from 'src/common';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { WorkspaceEntity } from '../workspace/workspaces.entity';

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
}
