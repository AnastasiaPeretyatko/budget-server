import * as bcrypt from 'bcrypt';

import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  PrimaryColumn,
} from 'typeorm';

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  public set plainPassword(pw: string) {
    this.password = pw;
  }

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword(): Promise<void> {
    // Only hash if the password field has been set or changed
    if (this.password) {
      const saltRounds = 10; // Recommended salt rounds
      this.password = await bcrypt.hash(this.password, saltRounds);
    }
  }

  // Method to compare a provided password with the stored hash
  async comparePassword(plainTextPassword: string): Promise<boolean> {
    return bcrypt.compare(plainTextPassword, this.password);
  }
}
