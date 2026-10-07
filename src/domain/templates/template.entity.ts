import { BaseEntity } from 'src/common';
import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
} from 'typeorm';
import { CategoriesEntity } from '../categories/categories.entity';
import { SavingAccountEntity } from '../savings_account/savings_account.entity';
import { WorkspaceEntity } from '../workspace/workspaces.entity';
import { TransactionType } from '../transition/transition.entity';
import { TagEntity } from '../tags/tag.entity';

@Entity('templates')
export class TemplateEntity extends BaseEntity {
  @Column({ type: 'varchar', nullable: false })
  name!: string;

  @Column({ type: 'varchar', nullable: false })
  icon!: string;

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
  categoryId!: string | null;

  @ManyToOne(() => CategoriesEntity, (category) => category.transactions, {
    nullable: true,
    onDelete: 'SET NULL',
  })
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

  @Column({
    type: 'enum',
    enum: TransactionType,
    default: TransactionType.EXPENSE,
  })
  type!: TransactionType;

  @ManyToMany(() => TagEntity, { eager: false })
  @JoinTable({
    name: 'template_tags',
    joinColumn: { name: 'template_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' },
  })
  tags!: TagEntity[];
}
