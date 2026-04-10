import {
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn()
  public createdAt!: Date;

  @CreateDateColumn()
  public updatedAt!: Date;

  @DeleteDateColumn()
  public deletedAt!: Date;
}
