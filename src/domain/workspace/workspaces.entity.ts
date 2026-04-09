import { BaseEntity } from 'src/common';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { UserEntity } from '../user/user.entity';
import { WorkspaceUserEntity } from './workspace_user.entity';

@Entity({ name: 'workspaces' })
export class WorkspaceEntity extends BaseEntity {
  @Column()
  title!: string;

  @Column({ name: 'owner_id', type: 'uuid', nullable: false })
  ownerId!: string;

  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'owner_id' })
  owner!: UserEntity;

  @OneToMany(() => WorkspaceUserEntity, (uw) => uw.workspace)
  userWorkspaces!: WorkspaceUserEntity[];
}
