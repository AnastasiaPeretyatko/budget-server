import { BaseEntity } from 'src/common';
import { Column, Entity } from 'typeorm';

@Entity('categories')
export class CategoriesEntity extends BaseEntity {
  @Column({ type: 'varchar', nullable: false })
  name!: string;

  @Column({ type: 'varchar', nullable: true })
  description!: string;
}
