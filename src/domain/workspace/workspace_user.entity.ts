import { BaseEntity } from 'src/common';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { UserEntity } from '../user/user.entity';
import { WorkspaceEntity } from './workspaces.entity';

@Entity('workspace_user')
export class WorkspaceUserEntity extends BaseEntity {
  @Column({ name: 'user_id' })
  userId!: string;

  @Column({ name: 'workspace_id' })
  workspaceId!: string;

  @ManyToOne(() => UserEntity, (user) => user.userWorkspaces)
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @ManyToOne(() => WorkspaceEntity, (workspace) => workspace.userWorkspaces)
  @JoinColumn({ name: 'workspace_id' })
  workspace!: WorkspaceEntity;
}
