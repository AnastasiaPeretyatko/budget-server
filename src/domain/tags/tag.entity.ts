import { BaseEntity } from 'src/common';
import { Column, Entity, JoinColumn, ManyToMany, ManyToOne } from 'typeorm';
import { WorkspaceEntity } from '../workspace/workspaces.entity';
import { TransitionEntity } from '../transition/transition.entity';

@Entity('tags')
export class TagEntity extends BaseEntity {
  @Column({ type: 'varchar', nullable: false })
  name!: string;

  @Column({ type: 'varchar', nullable: false })
  color!: string;

  @Column({ name: 'workspace_id', type: 'uuid', nullable: false })
  workspaceId!: string;

  @ManyToOne(() => WorkspaceEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace!: WorkspaceEntity;

  @ManyToMany(() => TransitionEntity, (transition) => transition.tags)
  transitions!: TransitionEntity[];
}
