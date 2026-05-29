import * as bcrypt from 'bcrypt';

import { BeforeInsert, BeforeUpdate, Column, Entity, OneToMany } from 'typeorm';
import { WorkspaceUserEntity } from '../workspace/workspace_user.entity';
import { BaseEntity } from 'src/common';

@Entity({ name: 'users' })
export class UserEntity extends BaseEntity {
  @Column()
  email!: string;

  @Column({ select: false })
  password!: string;

  @OneToMany(() => WorkspaceUserEntity, (uw) => uw.user)
  userWorkspaces!: WorkspaceUserEntity[];

  public set plainPassword(pw: string) {
    this.password = pw;
  }

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword(): Promise<void> {
    if (this.password) {
      const saltRounds = 10;
      this.password = await bcrypt.hash(this.password, saltRounds);
    }
  }

  async comparePassword(plainTextPassword: string): Promise<boolean> {
    return bcrypt.compare(plainTextPassword, this.password);
  }
}
