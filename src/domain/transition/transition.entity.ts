import { BaseEntity } from 'src/common';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { CategoryEntity } from '../category/category.entity';
import { SavingAccountEntity } from '../savings_account/savings_account.entity';

@Entity('transactions')
export class TransitionEntity extends BaseEntity {
  @Column({ name: 'from_account_id', type: 'uuid', nullable: true })
  fromAccountId: string | null;

  @ManyToOne(() => SavingAccountEntity, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'from_account_id' })
  fromAccount: SavingAccountEntity | null;

  @Column({ name: 'to_account_id', type: 'uuid', nullable: true })
  toAccountId: string | null;

  @ManyToOne(() => SavingAccountEntity, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'to_account_id' })
  toAccount: SavingAccountEntity;

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId: string | null;

  @ManyToOne(() => CategoryEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category: CategoryEntity | null;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: false,
    default: '0',
  })
  amount: string;

  @Column({ type: 'varchar', nullable: true })
  description: string | null;
}
