import { BaseEntity } from 'src/common';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { WorkspaceEntity } from '../workspace/workspaces.entity';

@Entity('savings_account')
export class SavingAccountEntity extends BaseEntity {
  @Column()
  name!: string;

  @Column({ type: 'varchar', nullable: true })
  description?: string | null;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: false,
    default: '0',
  })
  amount!: string;

  // Резервный сейф: переводы на него видны на странице «План»
  @Column({ name: 'is_safe', type: 'boolean', default: false })
  isSafe!: boolean;

  @Column({ name: 'workspace_id', type: 'uuid', nullable: false })
  workspaceId!: string;

  @ManyToOne(() => WorkspaceEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace!: WorkspaceEntity;
}
