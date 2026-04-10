import { BaseEntity } from 'src/common';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { CategoriesEntity } from '../categories/categories.entity';
import { SavingAccountEntity } from '../savings_account/savings_account.entity';
import { WorkspaceEntity } from '../workspace/workspaces.entity';

@Entity('transactions')
export class TransitionEntity extends BaseEntity {
  @Column({ name: 'from_account_id', type: 'uuid', nullable: true })
  fromAccountId!: string | null;

  @ManyToOne(() => SavingAccountEntity, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'from_account_id' })
  fromAccount!: SavingAccountEntity | null;

  @Column({ name: 'to_account_id', type: 'uuid', nullable: true })
  toAccountId!: string | null;

  @ManyToOne(() => SavingAccountEntity, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'to_account_id' })
  toAccount!: SavingAccountEntity;

  @Column({ name: 'categories_id', type: 'uuid', nullable: true })
  categoryId?: string | null;

  @ManyToOne(() => CategoriesEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'categories_id' })
  category?: CategoriesEntity | null;

  @Column({ name: 'workspace_id', type: 'uuid', nullable: false })
  workspaceId!: string;

  @ManyToOne(() => WorkspaceEntity, { nullable: false, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'workspace_id' })
  workspace!: WorkspaceEntity;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: false,
    default: '0',
  })
  amount!: string;

  @Column({ type: 'varchar', nullable: true })
  description!: string | null;

  @Column({ type: 'timestamptz', nullable: false })
  date!: Date;
}
