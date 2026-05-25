import { BaseEntity } from 'src/common';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { WorkspaceEntity } from '../workspace/workspaces.entity';

@Entity('categories')
export class CategoriesEntity extends BaseEntity {
  @Column({ type: 'varchar', nullable: false })
  name!: string;

  @Column({ type: 'varchar', nullable: true })
  description!: string;

  @Column({ name: 'workspace_id', type: 'uuid', nullable: false })
  workspaceId!: string;

  @ManyToOne(() => WorkspaceEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace!: WorkspaceEntity;
}
